// Turso 数据库访问层（libSQL 托管）
//
// Turso 是 SQLite 的兼容分支（libSQL），表结构与 SQL 与 SQLite 完全兼容，
// 托管多副本 + 自动备份，且本地开发可用 file: 协议。
//
// 两种后端（自动探测，TURSO_URL 前缀决定）：
//   1. http   : TURSO_URL 以 libsql:// 或 https:// 开头（生产远程库）
//   2. local  : TURSO_URL 以 file: 开头（本地开发/测试，无需联网）
//
// 基于官方 @libsql/client，统一对外接口：
//   - prepare(sql) → { bind(), all(), first(), run() }（惰性执行）
//   - batch([{sql, params}, ...]) → 事务性批量执行
//   - ensureSchema() → 幂等建表（batch 逐条，兼容 libSQL）
//   - detectBackend() → 返回当前后端类型
//
// 关键点：
//   - createClient 是惰性单例：只有真正读写时才建立连接（HTTP 无状态）
//   - @libsql/client 的 batch 默认以事务（deferred）模式执行
//   - execute 的 args 类型为 (string|number|bigint|null|Uint8Array)[]，参数统一断言

import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client';

// ==================== 客户端单例 ====================

let client: Client | null = null;
let backendKind: 'http' | 'local' | null = null;

/** 探测当前后端类型（TURSO_URL 前缀决定） */
export function detectBackend(): 'http' | 'local' {
  if (backendKind) return backendKind;
  const url = process.env.TURSO_URL || '';
  backendKind = url.startsWith('file:') ? 'local' : 'http';
  return backendKind;
}

/** 获取客户端（惰性单例） */
export function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_URL;
  if (!url) {
    throw new Error('[Turso] 缺少 TURSO_URL 环境变量（libsql://xxx.turso.io 或 file:./data/turso.db）');
  }
  const authToken = process.env.TURSO_TOKEN;
  client = createClient({ url, authToken });
  return client;
}

// ==================== 结果规范化 ====================

function rowsToObjects(rs: ResultSet): unknown[] {
  return rs.rows as unknown as unknown[];
}

// ==================== 惰性 Statement ====================

export interface TursoStatement {
  bind(...params: unknown[]): TursoStatement;
  all(): Promise<{ results: unknown[] }>;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
}

function makeStatement(sql: string): TursoStatement {
  let params: unknown[] = [];
  return {
    bind(...p: unknown[]) {
      params = p;
      return this;
    },
    async all() {
      const r = await getClient().execute({ sql, args: params as InArgs });
      return { results: rowsToObjects(r) };
    },
    async first() {
      const r = await getClient().execute({ sql, args: params as InArgs });
      return (r.rows[0] as unknown as Record<string, unknown> | undefined) ?? null;
    },
    async run() {
      const r = await getClient().execute({ sql, args: params as InArgs });
      return {
        meta: {
          changes: r.rowsAffected,
          last_row_id: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined
        }
      };
    }
  };
}

export function prepare(sql: string): TursoStatement {
  return makeStatement(sql);
}

/** 事务性批量执行（建表/多语句场景必须用 batch） */
export async function batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void> {
  await getClient().batch(
    statements.map(s => ({ sql: s.sql, args: (s.params ?? []) as InArgs }))
  );
}

/** 确保表结构存在（幂等） */
export async function ensureSchema(): Promise<void> {
  await batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS auth_codes (
        code TEXT PRIMARY KEY,
        openid TEXT NOT NULL,
        expired_at INTEGER NOT NULL,
        nickname TEXT,
        headimgurl TEXT,
        unionid TEXT,
        site_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS authenticated_users (
        openid TEXT PRIMARY KEY,
        unionid TEXT,
        nickname TEXT,
        headimgurl TEXT,
        authenticated_at TEXT NOT NULL,
        site_id TEXT,
        status TEXT,
        unsubscribed_at TEXT
      )`
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_auth_codes_openid ON auth_codes(openid)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_auth_codes_expired ON auth_codes(expired_at)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_users_site ON authenticated_users(site_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON authenticated_users(status)' },
    {
      // 按 openid 的 check 调用量统计
      // 目的：识别滥用（某 openid 每天 check 次数异常高）。
      // 写入走 usage-tracker 内存计数 + 60s 批量落库（不阻塞 check 热点路径）。
      // 数据保留 90 天，跨日自动清理。
      sql: `CREATE TABLE IF NOT EXISTS auth_check_usage (
        openid TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (openid, date)
      )`
    },
    {
      // check 失败原因统计：按日按原因计数（rate_limited / token_revoked /
      // token_invalid / user_inactive / invalid_or_expired / no_credential）。
      // 目的：回答「是不是掉登录了」类用户反馈——直接查表看失败构成，不再靠猜。
      // 写入走 check-failure-tracker 内存计数 + 60s 批量落库，保留 30 天。
      sql: `CREATE TABLE IF NOT EXISTS auth_check_failures (
        date TEXT NOT NULL,
        reason TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (date, reason)
      )`
    },
    {
      // 已吊销 Token（服务端注销）
      // 存 token 的 SHA-256 十六进制哈希（不存明文 token，防泄漏）。
      // 客户端退出登录后 token 在任意子域/设备都无法再通过鉴权。
      sql: `CREATE TABLE IF NOT EXISTS revoked_tokens (
        hash TEXT PRIMARY KEY,
        openid TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_revoked_openid ON revoked_tokens(openid)' }
  ]);

  // 存量表迁移：revoked_tokens 补来源审计列（吊销事故归因用）；列已存在时忽略（幂等）
  for (const ddl of [
    'ALTER TABLE revoked_tokens ADD COLUMN source_origin TEXT',
    'ALTER TABLE revoked_tokens ADD COLUMN source_ip TEXT',
    'ALTER TABLE revoked_tokens ADD COLUMN source_user_agent TEXT'
  ]) {
    try {
      await prepare(ddl).run();
    } catch {
      // 列已存在（新库或已迁移过），忽略
    }
  }
}

/** 统计（数据核对用） */
export async function countUsers(): Promise<number> {
  const r = await getClient().execute('SELECT COUNT(*) AS c FROM authenticated_users');
  return Number((r.rows[0] as unknown as Record<string, unknown>)?.c ?? 0);
}

export async function countAuthCodes(): Promise<number> {
  const r = await getClient().execute('SELECT COUNT(*) AS c FROM auth_codes');
  return Number((r.rows[0] as unknown as Record<string, unknown>)?.c ?? 0);
}
