/**
 * 简单的内存速率限制器
 * 用于防止验证码暴力枚举等攻击
 *
 * 策略：基于 IP + 参数的滑动窗口计数
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

// 存储：key -> entry
const limitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxAttempts: number; // 窗口内最大尝试次数
  windowMs: number; // 窗口大小（毫秒）
  blockMs: number; // 超限后封锁时长（毫秒）
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 10, // 每个窗口最多 10 次尝试
  windowMs: 60 * 1000, // 1 分钟窗口
  blockMs: 5 * 60 * 1000 // 超限后封锁 5 分钟
};

// 最大条目数（防止内存泄漏）
const MAX_ENTRIES = 10000;

/**
 * 获取客户端真实 IP
 */
export function getClientIp(event: any): string {
  // 优先从代理头获取（适配 Cloudflare / Nginx 等反向代理）
  const headers = event?.node?.req?.headers || event?.headers || {};
  if (typeof headers.get === 'function') {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    const cfIp = headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
  } else {
    // 原始 Node.js headers
    if (headers['x-forwarded-for']) return headers['x-forwarded-for'].split(',')[0].trim();
    if (headers['x-real-ip']) return headers['x-real-ip'].trim();
    if (headers['cf-connecting-ip']) return headers['cf-connecting-ip'].trim();
  }
  // 降级到 socket 地址
  return event?.node?.req?.socket?.remoteAddress || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // 秒，如果被封禁
}

/**
 * 检查速率限制
 * @param key 限流键（如 IP + API 名）
 * @param config 限流配置
 * @returns 是否允许通过
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  // 惰性清理：防止内存泄漏（每次检查时清理 10% 随机条目）
  if (limitStore.size > MAX_ENTRIES * 0.9) {
    const entries = Array.from(limitStore.entries());
    // 随机打乱并删除 50% 过期条目
    const toDelete = entries
      .filter(([_, entry]) => entry.firstAttempt + cfg.windowMs < now)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(entries.length * 0.5));
    toDelete.forEach(([k]) => limitStore.delete(k));
  }

  const entry = limitStore.get(key);

  // 如果已被封锁且封锁未过期
  if (entry && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
    };
  }

  // 窗口已重置（或首次请求）
  if (!entry || entry.firstAttempt + cfg.windowMs < now) {
    limitStore.set(key, {
      count: 1,
      firstAttempt: now,
      blockedUntil: 0
    });
    return { allowed: true, remaining: cfg.maxAttempts - 1, retryAfter: 0 };
  }

  // 窗口内累计计数
  entry.count++;

  if (entry.count > cfg.maxAttempts) {
    // 超过限制，封锁
    entry.blockedUntil = now + cfg.blockMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(cfg.blockMs / 1000)
    };
  }

  return {
    allowed: true,
    remaining: cfg.maxAttempts - entry.count,
    retryAfter: 0
  };
}

/**
 * 清理过期的限流记录（防止内存泄漏）
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    // 窗口过期 或 封锁过期
    const windowExpired = entry.firstAttempt + DEFAULT_CONFIG.windowMs < now;
    const blockExpired = entry.blockedUntil > 0 && entry.blockedUntil < now;

    if (windowExpired || blockExpired) {
      limitStore.delete(key);
    }
  }
}

// 定时清理（每 5 分钟）
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
