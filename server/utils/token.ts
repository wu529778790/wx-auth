/**
 * 签名 Token 工具
 *
 * 对 openid 进行 HMAC 签名，生成不可伪造的 Token。
 * SDK 将 Token 存入 Cookie 而非明文 openid。
 * 服务端验证 Token 签名后才提取 openid 查询用户。
 */

import crypto from 'crypto';
import { prepare as tursoPrepare, ensureSchema as ensureTursoSchema } from './turso';

// revoked_tokens 直连 turso 层（不经 storage.ts 的 ensureTursoReady），
// 需自行确保表结构存在，否则全新库首个 check/logout 请求会 no such table
let revokedTableReady = false;
async function ensureRevokedTable(): Promise<void> {
  if (revokedTableReady) return;
  await ensureTursoSchema();
  revokedTableReady = true;
}

/**
 * 计算 token 的 SHA-256 哈希（吊销表主键，不存明文 token）
 * 直接用 token 全文哈希（而非 openid.timestamp 部分），语义正确：
 * 吊销的是「这个具体 token」，而不是该 openid 的所有 token。
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** 吊销来源审计（发起吊销请求的上下文：页面 Origin / 客户端 IP / UA） */
export interface RevocationMeta {
  origin?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** 吊销一个 token（写入 revoked_tokens 表，幂等；带来源审计便于事故归因） */
export async function revokeToken(token: string, openid: string, meta?: RevocationMeta): Promise<void> {
  await ensureRevokedTable();
  await tursoPrepare(
    `INSERT INTO revoked_tokens (hash, openid, source_origin, source_ip, source_user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(hash) DO NOTHING`
  ).bind(
    hashToken(token),
    openid,
    meta?.origin ?? null,
    meta?.ip ?? null,
    meta?.userAgent ?? null
  ).run();
}

/** 判断 token 是否已吊销 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  await ensureRevokedTable();
  const row = await tursoPrepare('SELECT 1 AS hit FROM revoked_tokens WHERE hash = ?')
    .bind(hashToken(token))
    .first();
  return !!row;
}

/**
 * 生成签名 Token
 * 格式：openid.timestamp.signature
 * signature = HMAC-SHA256(secret, openid.timestamp)
 */
export function signOpenid(openid: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${openid}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

/**
 * 验证签名 Token 并提取 openid
 * @returns openid 验证成功；null 验证失败或过期
 *
 * 有效期策略：token 长效（10 年），配合 SDK 写入的持久 Cookie，
 * 「保持关注即可一直自动登录」；取关/退出由状态表与吊销表兜底。
 */
export const TOKEN_MAX_AGE_SECONDS = 10 * 365 * 24 * 60 * 60;

export function verifySignedToken(
  token: string,
  secret: string,
  maxAgeSeconds?: number
): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [openid, timestampStr, signature] = parts;

  // 严格校验 openid 格式
  if (!openid || typeof openid !== 'string' || openid.length === 0 || openid.length > 128) {
    return null;
  }

  const timestamp = parseInt(timestampStr, 10);

  // 校验时间戳有效性
  if (isNaN(timestamp) || timestamp < 0 || timestamp > Math.floor(Date.now() / 1000) + 3600) {
    return null; // 时间戳不能是未来时间（允许 1 小时误差）
  }

  // 校验签名长度（SHA256 hex = 64 字符）
  if (signature.length !== 64) return null;

  // 检查是否过期
  const maxAge = maxAgeSeconds ?? TOKEN_MAX_AGE_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > maxAge) return null;

  // 验证签名（恒定时间比较，防止时序攻击）
  const expectedPayload = `${openid}.${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(expectedPayload)
    .digest('hex');

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  return openid;
}
