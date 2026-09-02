// check 接口按 openid 用量统计（内存计数 + 定期批量落库）
//
// 目标：识别滥用——某 openid 每天调 check 的次数异常高，即拉黑候选。
// 背景：接入方会把 check 当业务网关调用（每次业务操作前验证一次），
//       因此按 openid 的 check 次数可近似反映其业务使用量。
//
// 方案（2026-08-25 用户选定 B）：
//   - 内存 Map 计数：recordCheckUsage 同步 O(1)，不阻塞 check 热点路径
//   - 每 60s 批量 upsert 到 Turso（事务性分批），进程崩溃最多丢 60s 增量（可接受）
//   - 数据保留 90 天，跨 UTC 日自动清理（每天最多一次 DELETE）
//
// 注意：getTopCheckUsage 只反映已落库数据，近 60s 内存增量未计入（观察用可接受）。

import { prepare, batch, ensureSchema } from './turso';

const BATCH_INTERVAL_MS = 60 * 1000;
const RETENTION_DAYS = 90;
const BATCH_SIZE = 200;

// openid -> (date(YYYY-MM-DD) -> count)
let counts = new Map<string, Map<string, number>>();
let timer: NodeJS.Timeout | null = null;
let lastCleanupDate = '';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC，与统计表口径一致
}

/** 惰性启动批量落库定时器（首次记录时启动） */
function ensureTimer(): void {
  if (timer) return;
  timer = setInterval(() => {
    flush().catch((e) => console.warn('[Usage] 批量落库失败:', e?.message || e));
  }, BATCH_INTERVAL_MS);
  timer.unref?.(); // 不阻止进程退出（脚本/测试场景友好）
}

/**
 * 记录一次 check 调用（同步、O(1)、不抛错、不阻塞）
 */
export function recordCheckUsage(openid: string): void {
  if (!openid) return;
  const date = todayKey();
  let dayMap = counts.get(openid);
  if (!dayMap) {
    dayMap = new Map();
    counts.set(openid, dayMap);
  }
  dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
  ensureTimer();
}

/**
 * 把内存增量批量写入 Turso（事务性分批），并顺带做跨日清理
 */
export async function flush(): Promise<void> {
  if (counts.size === 0) return;

  // 先换新桶：flush 期间的新请求进新桶，不丢数据
  const snapshot = counts;
  counts = new Map();

  await ensureSchema();

  const statements: Array<{ sql: string; params: unknown[] }> = [];
  for (const [openid, dayMap] of snapshot) {
    for (const [date, count] of dayMap) {
      statements.push({
        sql: `INSERT INTO auth_check_usage (openid, date, count) VALUES (?, ?, ?)
              ON CONFLICT(openid, date) DO UPDATE SET count = count + ?`,
        params: [openid, date, count, count]
      });
    }
  }

  // 分批写入，避免单批过大
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await batch(statements.slice(i, i + BATCH_SIZE));
  }

  // 跨 UTC 日时清理过期数据（每天最多一次）
  const today = todayKey();
  if (lastCleanupDate !== today) {
    lastCleanupDate = today;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000)
      .toISOString().slice(0, 10);
    await prepare('DELETE FROM auth_check_usage WHERE date < ?').bind(cutoff).run();
  }
}

/**
 * 查询近 N 天每 openid 的 check 总量（降序，TOP 列表）
 * 注意：仅统计已落库数据，近 60s 内存增量未计入（观察用可接受）
 */
export async function getTopCheckUsage(
  days = 7,
  limit = 20
): Promise<Array<{ openid: string; total: number }>> {
  await ensureSchema();
  const cutoff = new Date(Date.now() - (days - 1) * 86400 * 1000)
    .toISOString().slice(0, 10);
  const { results } = await prepare(
    `SELECT openid, SUM(count) AS total FROM auth_check_usage
     WHERE date >= ? GROUP BY openid ORDER BY total DESC LIMIT ?`
  ).bind(cutoff, limit).all();
  return (results as Array<Record<string, unknown>>).map((r) => ({
    openid: r.openid as string,
    total: Number(r.total ?? 0)
  }));
}
