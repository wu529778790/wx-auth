// 持久化存储方案（Turso 单一后端）
//
// Turso 是 libSQL（SQLite 兼容分支）托管库，托管多副本 + 自动备份。
// 通过官方 @libsql/client 访问：
//   - 生产：TURSO_URL=libsql://xxx.turso.io + TURSO_TOKEN
//   - 本地开发/测试：TURSO_URL=file:./data/turso.db（本地文件库，无需联网）
//
// STORAGE_TYPE 仅支持 turso（默认）；设置其他值（如残留的 d1/sqlite/file）
// 会直接报错退出（fail fast），避免静默降级导致数据分叉。

// 配置：存储方式（仅支持 turso，未设置默认 turso）
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'turso';

if (STORAGE_TYPE !== 'turso') {
  console.error(
    `[Storage] ❌ 不支持的 STORAGE_TYPE: "${STORAGE_TYPE}"（仅支持 turso）。` +
    `请修正配置后重启；如需本地开发请用 TURSO_URL=file:./data/turso.db`
  );
  process.exit(1);
}

// ==================== 数据模型 ====================

interface AuthCodeData {
  openid: string;
  expiredAt: number;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  siteId?: string;
}

interface AuthenticatedUserData {
  authenticatedAt: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  siteId?: string;
  // 用户状态：active=有效 / unsubscribed=已取关（软删除保留历史）
  status?: 'active' | 'unsubscribed';
  // 取关时间（软删除留痕）
  unsubscribedAt?: string;
}

// ==================== Turso 后端 ====================

import { prepare as tursoPrepare, batch as tursoBatch, ensureSchema as ensureTursoSchema, detectBackend as detectTursoBackend } from './turso';

let tursoReady = false;

/** Turso 首次使用前确保表结构存在（幂等） */
async function ensureTursoReady() {
  if (tursoReady) return;
  await ensureTursoSchema();
  tursoReady = true;
  console.log(`[Storage] Turso 表结构就绪 (backend: ${detectTursoBackend()})`);
}

// Turso 行 → AuthenticatedUserData
function rowToUser(row: Record<string, unknown>): AuthenticatedUserData {
  return {
    authenticatedAt: row.authenticated_at as string,
    nickname: (row.nickname as string) ?? undefined,
    headimgurl: (row.headimgurl as string) ?? undefined,
    unionid: (row.unionid as string) ?? undefined,
    siteId: (row.site_id as string) ?? undefined,
    status: (row.status as 'active' | 'unsubscribed') ?? undefined,
    unsubscribedAt: (row.unsubscribed_at as string) ?? undefined
  };
}

// 行 → 用户对象（含 openid；老数据无 status 视为 active）
function rowToUserFull(row: Record<string, unknown>): AuthenticatedUserData & { openid: string } {
  return {
    openid: row.openid as string,
    ...rowToUser(row),
    status: ((row.status as string) || 'active') as 'active' | 'unsubscribed'
  };
}

async function tursoSaveAuthCode(code: string, openid: string, userInfo?: { nickname?: string; headimgurl?: string; unionid?: string; siteId?: string }) {
  await ensureTursoReady();
  const expiryTime = parseInt(process.env.CODE_EXPIRY || '300', 10) * 1000;
  const expiredAt = Date.now() + expiryTime;

  await tursoBatch([
    { sql: 'DELETE FROM auth_codes WHERE openid = ?', params: [openid] },
    // 惰性清理：写新码时顺带清掉全表过期行（同批事务，成本≈0，防过期码无限堆积）
    { sql: 'DELETE FROM auth_codes WHERE expired_at < ?', params: [Date.now()] },
    {
      sql: `INSERT INTO auth_codes (code, openid, expired_at, nickname, headimgurl, unionid, site_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        code,
        openid,
        expiredAt,
        userInfo?.nickname ?? null,
        userInfo?.headimgurl ?? null,
        userInfo?.unionid ?? null,
        userInfo?.siteId ?? null
      ]
    }
  ]);
}

async function tursoGetUserByAuthCode(code: string) {
  await ensureTursoReady();
  const row = await tursoPrepare('SELECT * FROM auth_codes WHERE code = ?').bind(code).first();
  if (!row) return null;

  // 过期即删除（惰性清理）
  if (Number(row.expired_at) < Date.now()) {
    await tursoPrepare('DELETE FROM auth_codes WHERE code = ?').bind(code).run();
    return null;
  }

  return {
    openid: row.openid as string,
    expiredAt: Number(row.expired_at),
    nickname: (row.nickname as string) ?? undefined,
    headimgurl: (row.headimgurl as string) ?? undefined,
    unionid: (row.unionid as string) ?? undefined,
    siteId: (row.site_id as string) ?? undefined
  };
}

async function tursoDeleteAuthCode(code: string): Promise<boolean> {
  await ensureTursoReady();
  const r = await tursoPrepare('DELETE FROM auth_codes WHERE code = ?').bind(code).run();
  return Number(r.meta.changes ?? 0) > 0;
}

async function tursoMarkUserAuthenticated(
  openid: string,
  userInfo: { nickname?: string; headimgurl?: string; unionid?: string; siteId?: string },
) {
  await ensureTursoReady();

  const existing = await tursoPrepare('SELECT * FROM authenticated_users WHERE openid = ?').bind(openid).first();

  // 取关（unsubscribed）重新认证正常复活为 active
  const nextStatus = 'active';

  await tursoPrepare(`
    INSERT INTO authenticated_users (
      openid, authenticated_at, nickname, headimgurl, unionid, site_id, status, unsubscribed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(openid) DO UPDATE SET
      nickname = COALESCE(excluded.nickname, authenticated_users.nickname),
      headimgurl = COALESCE(excluded.headimgurl, authenticated_users.headimgurl),
      unionid = COALESCE(excluded.unionid, authenticated_users.unionid),
      site_id = COALESCE(excluded.site_id, authenticated_users.site_id),
      status = ?,
      unsubscribed_at = ?
  `).bind(
    openid,
    (existing?.authenticated_at as string | undefined) ?? new Date().toISOString(),
    userInfo?.nickname ?? null,
    userInfo?.headimgurl ?? null,
    userInfo?.unionid ?? null,
    userInfo?.siteId ?? null,
    nextStatus,
    null,
    nextStatus,
    null
  ).run();
}

async function tursoIsUserAuthenticated(openid: string): Promise<boolean> {
  await ensureTursoReady();
  const row = await tursoPrepare('SELECT status FROM authenticated_users WHERE openid = ?').bind(openid).first();
  if (!row) return false;
  return (row.status as string | null) === null || row.status === 'active';
}

async function tursoGetAuthenticatedUser(openid: string): Promise<AuthenticatedUserData | null> {
  await ensureTursoReady();
  const row = await tursoPrepare('SELECT * FROM authenticated_users WHERE openid = ?').bind(openid).first();
  if (!row) return null;

  // 老数据无 status（NULL）视为 active；unsubscribed 视为未认证
  const status = row.status as string | null;
  if (status !== null && status !== 'active') return null;

  return rowToUser(row);
}

async function tursoClearUserAuthentication(openid: string): Promise<boolean> {
  await ensureTursoReady();
  await tursoBatch([
    {
      sql: 'UPDATE authenticated_users SET status = ?, unsubscribed_at = ? WHERE openid = ?',
      params: ['unsubscribed', new Date().toISOString(), openid]
    },
    { sql: 'DELETE FROM auth_codes WHERE openid = ?', params: [openid] }
  ]);
  return true; // batch 失败会抛错，成功即 true
}

async function tursoGetStorageStats() {
  await ensureTursoReady();
  const codes = await tursoPrepare('SELECT COUNT(*) as count FROM auth_codes').first();
  const users = await tursoPrepare('SELECT COUNT(*) as count FROM authenticated_users').first();
  return {
    authCodes: Number(codes?.count ?? 0),
    authenticatedUsers: Number(users?.count ?? 0)
  };
}

async function tursoFindAuthCodeByOpenid(openid: string): Promise<string | null> {
  await ensureTursoReady();
  const row = await tursoPrepare('SELECT code FROM auth_codes WHERE openid = ? ORDER BY expired_at DESC LIMIT 1').bind(openid).first();
  return (row?.code as string) ?? null;
}

// ==================== 对外接口（全部 async） ====================

/**
 * 保存认证码（用户关注公众号时调用）
 */
export async function saveAuthCode(
  code: string,
  openid: string,
  userInfo?: { nickname?: string; headimgurl?: string; unionid?: string; siteId?: string },
  _event?: unknown
) {
  await tursoSaveAuthCode(code, openid, userInfo);
}

/**
 * 通过认证码获取用户信息
 */
export async function getUserByAuthCode(code: string) {
  return tursoGetUserByAuthCode(code);
}

/**
 * 删除认证码
 */
export async function deleteAuthCode(code: string) {
  return tursoDeleteAuthCode(code);
}

/**
 * 标记用户为已认证
 * 重新认证时自动复活：取关（unsubscribed）后重新扫码关注，恢复为 active
 */
export async function markUserAuthenticated(
  openid: string,
  userInfo: { nickname?: string; headimgurl?: string; unionid?: string; siteId?: string },
  _event?: unknown
) {
  await tursoMarkUserAuthenticated(openid, userInfo);
}

/**
 * 判断用户当前是否处于有效认证状态
 * 老数据无 status 字段时视为 active（向后兼容）
 */
export async function isUserAuthenticated(openid: string) {
  return tursoIsUserAuthenticated(openid);
}

/**
 * 获取有效认证用户信息（仅 active 状态）
 */
export async function getAuthenticatedUser(openid: string) {
  return tursoGetAuthenticatedUser(openid);
}

/**
 * 清除用户认证状态（取关）
 * 软删除：仅打标记保留历史，不物理删除。
 */
export async function clearUserAuthentication(openid: string, _event?: unknown) {
  await tursoClearUserAuthentication(openid);
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats() {
  return tursoGetStorageStats();
}

/**
 * 通过openid查找认证码（用于公众号发送消息后，用户输入时）
 */
export async function findAuthCodeByOpenid(openid: string): Promise<string | null> {
  return tursoFindAuthCodeByOpenid(openid);
}

console.log(`[Storage] 持久化存储已初始化 (类型: turso)`);
