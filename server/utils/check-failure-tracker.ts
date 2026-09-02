// check 接口失败原因统计（内存计数 + 定期批量落库）
//
// 目标：回答「是不是掉登录了」类用户反馈——按失败原因分口径计数，
// 排查时直接查 auth_check_failures 表看失败构成（限流高 = 限流误伤；
// token_invalid 飙升 = 密钥变更/凭证异常；user_inactive 高 = 取关潮）。
// 机制与 usage-tracker 一致：record 同步 O(1) 不阻塞热点路径，60s 批量
// upsert 到 Turso，进程崩溃最多丢 60s 增量（可接受），数据保留 30 天。

import { prepare, batch, ensureSchema } from './turso';

const BATCH_INTERVAL_MS = 60 * 1000;
const RETENTION_DAYS = 30;
const BATCH_SIZE = 200;

// date(YYYY-MM-DD) -> reason -> count
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
    flushCheckFailures().catch((e) => console.warn('[CheckFailure] 批量落库失败:', e?.message || e));
  }, BATCH_INTERVAL_MS);
  timer.unref?.(); // 不阻止进程退出（脚本/测试场景友好）
}

/**
 * 记录一次 check 失败（同步、O(1)、不抛错、不阻塞）
 * reason 与 check 响应的 error 字段同名：rate_limited / token_revoked /
 * invalid_or_expired / server_error（存储层异常，响应 503，2026-08-29 新增——
 * 此前这类异常冒泡成 500，统计失明）；内部口径：token_invalid（验签失败）/
 * user_inactive（签名有效但用户非 active）/ no_credential（完全无凭证）。
 */
export function recordCheckFailure(reason: string): void {
  if (!reason) return;
  const date = todayKey();
  let reasonMap = counts.get(date);
  if (!reasonMap) {
    reasonMap = new Map();
    counts.set(date, reasonMap);
  }
  reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
  ensureTimer();
}

/**
 * 把内存增量批量写入 Turso（事务性分批），并顺带做跨日清理
 * 命名带前缀：与 usage-tracker 的 flush 区分，避免 auto-import 同名冲突
 */
export async function flushCheckFailures(): Promise<void> {
  if (counts.size === 0) return;

  // 先换新桶：flush 期间的新请求进新桶，不丢数据
  const snapshot = counts;
  counts = new Map();

  await ensureSchema();

  const statements: Array<{ sql: string; params: unknown[] }> = [];
  for (const [date, reasonMap] of snapshot) {
    for (const [reason, count] of reasonMap) {
      statements.push({
        sql: `INSERT INTO auth_check_failures (date, reason, count) VALUES (?, ?, ?)
              ON CONFLICT(date, reason) DO UPDATE SET count = count + ?`,
        params: [date, reason, count, count]
      });
    }
  }

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await batch(statements.slice(i, i + BATCH_SIZE));
  }

  // 跨 UTC 日时清理过期数据（每天最多一次）
  const today = todayKey();
  if (lastCleanupDate !== today) {
    lastCleanupDate = today;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000)
      .toISOString().slice(0, 10);
    await prepare('DELETE FROM auth_check_failures WHERE date < ?').bind(cutoff).run();
  }
}
