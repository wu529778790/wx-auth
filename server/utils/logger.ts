/**
 * 统一日志工具
 *
 * 目标：让服务端每一条日志都自带
 *   [本地时间+时区] [客户端IP] [User-Agent] [级别] 消息
 * 方便在没有逐行时间戳的原始日志里溯源攻击来源。
 *
 * 设计：
 *  - 全局 console.* 增强（server/plugins/logger.ts 调用 installConsoleEnhancer）
 *    让所有既有的 console.log('[Storage] ...') / console.error('[WeChat] ...')
 *    以及 Vue Router 的警告，自动带上时间戳（无请求上下文时 IP/UA 为 -）。
 *  - makeLogger(event) 绑定某个请求，业务日志额外带上该请求的 IP + UA。
 *  - 所有输出都走 orig（原生 console），避免递归。
 *
 * 生产环境噪声过滤（稳定运行后无需逐请求/逐健康检查）：
 *  - shouldSkipQuietLog() 判断 REQ 行是否需要静默（健康检查 / 已知扫描）
 *  - isQuietWarn() 判断 console.warn 是否属于扫描器触发的已知噪声
 */

/** 已知扫描器常用探测路径前缀（非本 Nuxt 应用的路由，无需记为 REQ 噪声） */
const SCAN_PATH_PREFIXES = [
  '/.env', '/.git', '/wp-', '/wp.', '/wp/', 'wp-admin',
  'wp-content', 'wp-includes', '.php', '.asp', '.jsp',
  '.action', '/api.php', '/admin/', '/backend/',
  '/backup/', '/config', '/console', '/debug',
  '/server-status', '/solr/', '/vendor/',
  // 2026-08-17 观测到的应用扫描器路径（外卖/直播/商城等第三方应用探测）
  '/join_room', '/biz/', '/instatll', '/_data/', '/relayApi/',
  '/site/api/', '/api/init', '/api/heartbeat', '/api/app/',
  '/api/link-submit', '/api/v1/', '/api/Uploads/', '/api/user/',
  '/api/common/', '/api/chat/', '/api/system/'
];

/** 已知扫描器 UA 关键字（小写匹配） */
const SCAN_UA_KEYWORDS = [
  'zgrab', 'nmap', 'masscan', 'censys', 'shodan',
  'semrush', 'ahrefs', 'mj12bot', 'dotbot', 'rogerbot'
];

/**
 * 判断一条 REQ 是否属于应静默的"运行噪声"。
 * 仅用于 REQ 汇总行过滤，不影响错误日志或业务日志。
 */
export function shouldSkipQuietLog(
  method: string,
  path: string,
  status: number,
  ua: string,
  ip: string
): boolean {
  // 1) OPTIONS 预检：纯浏览器 CORS 行为，无业务/攻击价值
  if (method === 'OPTIONS') return true;

  // 2) GET 仅保留 5xx：200/204 心跳/配置拉取、404 扫描器探测均无诊断价值
  if (method === 'GET' && status !== 500 && status !== 502 && status !== 503) return true;

  // 3) 健康检查：本机 Wget 每 30s 请求 /
  if (method === 'GET' && path === '/' && (ip === '::1' || ip === '127.0.0.1' || ip === '[::1]')) {
    return true;
  }

  // 4) 用户输入 / 登录 / 主应用外的静态资源类健康探测（UA 含 Wget/curl 等）
  const uaLower = ua.toLowerCase();
  if (path === '/' && /wget|curl|libwww|python-requests|go-http-client|okhttp\//.test(uaLower)) {
    return true;
  }

  return false;
}

/**
 * 判断一条 console.warn 是否属于扫描器客户端的双斜杠探测噪声。
 * Vue Router 的 "resolved to ... multiple slashes" 警告由客户端扫描器触发，
 * 服务端无法替客户端过滤，直接静默避免污染日志。
 */
export function isQuietWarn(args: unknown[]): boolean {
  const first = args[0];
  if (typeof first !== 'string') return false;
  // Vue Router 404（扫描器探测 / 客户端双斜杠）→ 静默
  return /Vue Router warn/i.test(first);
}

/** 敏感数据脱敏：openid 截断（保留首尾各 4 字符） */
export function maskOpenid(openid: string): string {
  if (!openid || openid.length <= 10) return '***';
  return `${openid.slice(0, 4)}…${openid.slice(-4)}`;
}

/** 敏感数据脱敏：验证码不可逆掩码 */
export function maskCode(code: string): string {
  return '******';
}

/**
 * 请求路径中含凭证的查询参数（明文进日志可被重放登录，必须脱敏）。
 * 仅匹配这些 key，其余参数（siteId 等）原样保留以便溯源。
 */
const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'authtoken', 'signature', 'sign', 'secret',
  'password', 'pwd', 'access_token', 'refresh_token', 'authtoken'
]);

/**
 * 对请求路径（含 query string）做脱敏：把敏感参数的值替换为 ***。
 * 例：/api/auth/check?token=abc.123.def&siteId=x
 *  →  /api/auth/check?token=***&siteId=x
 */
export function redactPath(path: string): string {
  if (!path || !path.includes('?')) return path;
  const q = path.indexOf('?');
  const base = path.slice(0, q);
  const qs = path.slice(q + 1);
  const redacted = qs
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return pair;
      const key = pair.slice(0, eq).toLowerCase();
      return SENSITIVE_QUERY_KEYS.has(key) && pair.slice(eq + 1)
        ? `${pair.slice(0, eq)}=***`
        : pair;
    })
    .join('&');
  return `${base}?${redacted}`;
}


import { getRequestHeader, getRequestIP, type H3Event } from 'h3';

// 在模块加载时捕获原生 console（只捕获一次），供增强与业务 logger 共用，避免递归。
const orig = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

export type LogLevel = 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'REQ';

/**
 * 本地时区时间，显式标注时区偏移（避免 UTC 歧义）。
 * 例：2026-07-07 22:36:02.123 +08:00
 */
export function formatTimestamp(d: Date = new Date()): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return `${y}-${mo}-${da} ${h}:${mi}:${s}.${ms} ${sign}${oh}:${om}`;
}

/**
 * 从请求中提取客户端 IP 与 UA。
 * 走反向代理（OpenResty / Cloudflare / EdgeOne）时优先读 X-Forwarded-For。
 */
export function getReqCtx(event?: H3Event): { ip: string; ua: string } {
  if (!event) return { ip: '-', ua: '-' };
  let ip = '-';
  try {
    ip = getRequestIP(event, { xForwardedFor: true }) || '-';
  } catch {
    /* 非请求上下文，留 - */
  }
  let ua = '-';
  try {
    ua = getRequestHeader(event, 'user-agent') || '-';
  } catch {
    /* ignore */
  }
  if (ua.length > 200) ua = ua.slice(0, 200) + '…';
  return { ip, ua };
}

function stringify(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function formatLog(
  time: string,
  ip: string,
  ua: string,
  level: LogLevel,
  args: unknown[]
): string {
  const safe = Array.isArray(args) ? args : [args];
  const msg = safe.map(stringify).join(' ');
  return `${time} [${ip}] [${ua}] [${level}] ${msg}`;
}

/** 绕过全局增强，直接输出已格式化的整行（避免重复时间戳）。 */
export function rawOut(line: string): void {
  orig.info(line);
}

/**
 * 业务 logger：绑定某个请求 event，日志自动带 IP + UA。
 * 不传 event（如定时任务、模块初始化）则 IP/UA 为 -。
 */
export function makeLogger(event?: H3Event) {
  const { ip, ua } = getReqCtx(event);
  const fire =
    (method: 'log' | 'info' | 'warn' | 'error', level: LogLevel) =>
    (...args: unknown[]) =>
      orig[method](formatLog(formatTimestamp(), ip, ua, level, args));
  return {
    log: fire('log', 'LOG'),
    info: fire('info', 'INFO'),
    warn: fire('warn', 'WARN'),
    error: fire('error', 'ERROR')
  };
}

let installed = false;

/**
 * 全局 console 增强：所有服务端 console.* 自动带 [时间戳]（IP/UA 默认为 -）。
 * 必须在 Nitro 插件里尽早调用一次。幂等。
 */
export function installConsoleEnhancer(): void {
  if (installed) return;
  installed = true;
  console.log = (...args: unknown[]) =>
    orig.log(formatLog(formatTimestamp(), '-', '-', 'LOG', args));
  console.info = (...args: unknown[]) =>
    orig.info(formatLog(formatTimestamp(), '-', '-', 'INFO', args));
  console.warn = (...args: unknown[]) => {
    // 过滤客户端扫描器触发的 Vue Router 双斜杠警告（无诊断价值）
    if (isQuietWarn(args)) return;
    orig.warn(formatLog(formatTimestamp(), '-', '-', 'WARN', args));
  };
  console.error = (...args: unknown[]) =>
    orig.error(formatLog(formatTimestamp(), '-', '-', 'ERROR', args));
}
