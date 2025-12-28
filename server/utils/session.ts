// Session 管理工具函数（使用加密 Cookie）
import { getCookie, setCookie, deleteCookie } from 'h3';
import type { H3Event } from 'h3';
import crypto from 'crypto';

// 兼容性处理：Nuxt 4 可能使用不同版本的 h3
function safeGetCookie(event: H3Event, name: string): string | undefined {
  try {
    // 尝试 h3 2.x 的方式
    return getCookie(event, name);
  } catch (error) {
    // 如果失败，尝试从 event.headers 获取
    const headers = event.node?.req?.headers || event.headers;
    if (headers && typeof headers.get === 'function') {
      const cookieHeader = headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        for (const cookie of cookies) {
          const [key, value] = cookie.split('=');
          if (key === name) return value;
        }
      }
    }
    return undefined;
  }
}

function safeSetCookie(event: H3Event, name: string, value: string, options: any): void {
  try {
    setCookie(event, name, value, options);
  } catch (error) {
    // 兼容性处理
    const headers = event.node?.res?.getHeader?.('set-cookie') || [];
    const cookie = `${name}=${value}; Path=${options.path || '/'}; Max-Age=${options.maxAge}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite}`;
    if (event.node?.res?.setHeader) {
      event.node.res.setHeader('set-cookie', [...(Array.isArray(headers) ? headers : [headers]), cookie]);
    }
  }
}

function safeDeleteCookie(event: H3Event, name: string, options: any): void {
  try {
    deleteCookie(event, name, options);
  } catch (error) {
    // 兼容性处理
    if (event.node?.res?.setHeader) {
      event.node.res.setHeader('set-cookie', `${name}=; Path=${options.path || '/'}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    }
  }
}

export interface SessionData {
  authenticated?: boolean;
  user?: {
    openid: string;
    unionid?: string;
    nickname?: string;
    headimgurl?: string;
    authenticatedAt: string;
  };
}

interface SessionConfig {
  secret: string;
  name: string;
  cookie: {
    maxAge: number;
    sameSite: 'lax' | 'strict' | 'none';
    secure: boolean;
    httpOnly: boolean;
  };
}

const defaultConfig: SessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  name: 'wxauth-session',
  cookie: {
    maxAge: 24 * 60 * 60, // 24小时
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
};

/**
 * 加密 Session 数据
 */
function encryptSession(data: string, secret: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // 返回格式: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密 Session 数据
 */
function decryptSession(encrypted: string, secret: string): string {
  try {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
    const algorithm = 'aes-256-gcm';
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt session');
  }
}

/**
 * 获取或创建 Session
 */
export async function createSession(event: H3Event, config?: Partial<SessionConfig>) {
  const cfg = { ...defaultConfig, ...config };
  const cookieName = cfg.name;

  // 获取现有 session ID
  let sessionId = safeGetCookie(event, cookieName);
  let sessionData: SessionData = {};

  // 如果有 session ID，尝试解密并解析数据
  if (sessionId) {
    try {
      const decrypted = decryptSession(sessionId, cfg.secret);
      sessionData = JSON.parse(decrypted);
    } catch (error) {
      console.warn('[Session] Failed to parse session, creating new one');
    }
  }

  return {
    // 获取当前 session 数据
    value: sessionData,

    // 更新 session 数据
    async update(data: Partial<SessionData>) {
      sessionData = { ...sessionData, ...data };
      const encrypted = encryptSession(JSON.stringify(sessionData), cfg.secret);

      safeSetCookie(event, cookieName, encrypted, {
        maxAge: cfg.cookie.maxAge,
        sameSite: cfg.cookie.sameSite,
        secure: cfg.cookie.secure,
        httpOnly: cfg.cookie.httpOnly,
        path: '/'
      });
    },

    // 清除 session
    async clear() {
      safeDeleteCookie(event, cookieName, { path: '/' });
      sessionData = {};
    },

    // 获取 session 数据
    get() {
      return sessionData;
    }
  };
}

/**
 * 检查用户是否已登录（服务端调用）
 */
export async function isAuthenticated(event: H3Event): Promise<boolean> {
  const session = await createSession(event);
  return session.value.authenticated === true;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(event: H3Event) {
  const session = await createSession(event);
  return session.value.user || null;
}
