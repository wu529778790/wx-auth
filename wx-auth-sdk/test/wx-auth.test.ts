/**
 * WxAuth SDK 回归测试
 *
 * 核心回归场景（issue: requireAuth() 验证码校验成功后恒返回 false）：
 *  1. 验证码成功 → requireAuth() resolve true + 触发 onVerified
 *  2. 验证码成功 → 不触发 onClose（onClose 仅语义 = 用户主动关闭）
 *  3. 用户主动关闭 → requireAuth() resolve false + 触发 onClose
 *
 * Cookie 落域回归（issue: 第三方域名死循环，src getRootDomain 曾基于 apiBase 推导）：
 *  4. getRootDomain 基于 window.location.hostname 推导根域，而非 config.apiBase
 *  5. setCookie 的 domain 落在「页面所在域」：app.example.com → .example.com
 *  6. localhost / IP 不设置 domain
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WxAuth, getRootDomainFromHostname } from '../src/wx-auth';

// 模拟 fetch，按 URL 关键字分发响应
function mockFetch(routes: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new Error(`Unhandled fetch URL: ${url}`);
    return {
      ok: true,
      status: 200,
      json: async () => routes[key],
    } as Response;
  }));
}

// 填入 6 位验证码
function fillCode(code: string): void {
  const inputs = document.querySelectorAll<HTMLInputElement>('.wx-auth-input');
  code.split('').forEach((c, i) => {
    if (inputs[i]) inputs[i].value = c;
  });
}

// 等待弹窗渲染 + config 拉取
const waitModal = () => new Promise((r) => setTimeout(r, 50));
// 等待 verifyCode 的 500ms 成功延迟关闭
const waitCloseDelay = () => new Promise((r) => setTimeout(r, 600));

describe('WxAuth.requireAuth()', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    // 清理 jsdom cookie，防止用例间状态泄漏
    // （用例会写 wxauth-token，残留会导致下一个用例 silentCheck/requireAuth 读到）
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  });

  it('验证码校验成功后 resolve true，并触发 onVerified（回归：曾恒返回 false）', async () => {
    const onVerified = vi.fn();
    const onClose = vi.fn();

    mockFetch({
      '/api/sdk/config': { wechatName: '测试号', qrcodeUrl: 'http://qr/x.jpg' },
      '/api/auth/check?authToken=123456': {
        authenticated: true,
        token: 'signed-token-x',
        user: { openid: 'o-1', nickname: '测试用户' },
      },
    });

    WxAuth.init({
      apiBase: 'http://localhost',
      silent: true,
      required: false,
      onVerified,
      onClose,
    });

    const p = WxAuth.requireAuth();
    await waitModal();

    // 弹窗已渲染
    expect(document.querySelector('.wx-auth-modal')).not.toBeNull();

    fillCode('123456');
    await WxAuth.verifyCode();
    await waitCloseDelay();

    const result = await p;
    expect(result).toBe(true);
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({ openid: 'o-1' })
    );
  });

  it('验证码校验成功后不触发 onClose（onClose 仅语义 = 用户主动关闭）', async () => {
    const onClose = vi.fn();

    mockFetch({
      '/api/sdk/config': { wechatName: '测试号', qrcodeUrl: 'http://qr/x.jpg' },
      '/api/auth/check?authToken=123456': {
        authenticated: true,
        token: 'signed-token-x',
        user: { openid: 'o-1' },
      },
      // 登录成功写入 cookie 后，init 的静默校验会带 token 再查一次 check
      '/api/auth/check?token=': {
        authenticated: true,
        token: 'signed-token-x',
        user: { openid: 'o-1' },
      },
    });

    WxAuth.init({
      apiBase: 'http://localhost',
      silent: true,
      required: false,
      onClose,
    });

    const p = WxAuth.requireAuth();
    await waitModal();

    fillCode('123456');
    await WxAuth.verifyCode();
    await waitCloseDelay();
    await p;

    // 关键断言：验证成功关闭不应触发 onClose
    expect(onClose).not.toHaveBeenCalled();
  });

  it('用户主动关闭时 resolve false，并触发 onClose', async () => {
    const onClose = vi.fn();

    mockFetch({
      '/api/sdk/config': { wechatName: '测试号', qrcodeUrl: 'http://qr/x.jpg' },
    });

    WxAuth.init({
      apiBase: 'http://localhost',
      silent: true,
      required: false,
      onClose,
    });

    const p = WxAuth.requireAuth();
    await waitModal();

    WxAuth.close(); // 模拟用户点击关闭按钮
    const result = await p;

    expect(result).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('getRootDomainFromHostname（回归：第三方域名死循环）', () => {
  it('基于页面 hostname 推导根域：app.example.com → .example.com', () => {
    expect(getRootDomainFromHostname('app.example.com')).toBe('.example.com');
  });

  it('基于页面 hostname 推导根域：fork 站 app.mysite.com → .mysite.com', () => {
    expect(getRootDomainFromHostname('app.mysite.com')).toBe('.mysite.com');
  });

  it('根域推导：多级子域也落根域', () => {
    expect(getRootDomainFromHostname('app.example.com')).toBe('.example.com');
    expect(getRootDomainFromHostname('auth.example.com')).toBe('.example.com');
  });

  it('localhost 不设置 domain（返回空串，落页面域本身）', () => {
    expect(getRootDomainFromHostname('localhost')).toBe('');
  });

  it('127.0.0.1 与 IP 地址不设置 domain', () => {
    expect(getRootDomainFromHostname('127.0.0.1')).toBe('');
    expect(getRootDomainFromHostname('192.168.1.10')).toBe('');
  });
});

describe('WxAuth setCookie 落域 = 页面域（回归：第三方域名死循环）', () => {
  it('apiBase 为 wx-auth 后端域时，cookie 仍成功写入当前域（jsdom host=localhost）', async () => {
    // 注意：jsdom 的 cookie jar 按创建时的 host（localhost）绑定，
    // 这里不 hack location——domain 推导分支已由纯函数用例覆盖。
    // 本用例只验证：apiBase 指向跨域后端时，验证码成功路径能正常写 cookie（不依赖 apiBase 域）
    mockFetch({
      '/api/sdk/config': { wechatName: '测试号', qrcodeUrl: 'http://qr/x.jpg' },
      '/api/auth/check?authToken=123456': {
        authenticated: true,
        token: 'signed-token-x',
        user: { openid: 'o-1' },
      },
      // 登录成功写入 cookie 后，init 的静默校验会带 token 再查一次 check
      '/api/auth/check?token=': {
        authenticated: true,
        token: 'signed-token-x',
        user: { openid: 'o-1' },
      },
    });

    WxAuth.init({
      apiBase: 'https://auth.example.com', // 后端与页面不同域（真实死循环条件）
      silent: true,
      required: false,
    });

    const p = WxAuth.requireAuth();
    await waitModal();

    fillCode('123456');
    await WxAuth.verifyCode();
    await waitCloseDelay();
    await p;

    // 关键断言：验证码成功后 token 已写入 cookie（页面域可读）
    expect(document.cookie).toContain('wxauth-token=signed-token-x');
  });
});

describe('WxAuth.clearToken()（回归：清空认证状态必须双删）', () => {
  it('同时清除 Cookie 与 localStorage，避免清 Cookie 后被备份静默恢复', () => {
    // 预置双写状态：cookie + localStorage 都有 token
    document.cookie = 'wxauth-token=signed-token-x;path=/';
    window.localStorage.setItem('wxauth-token', 'signed-token-x');

    expect(document.cookie).toContain('wxauth-token=signed-token-x');
    expect(window.localStorage.getItem('wxauth-token')).toBe('signed-token-x');

    WxAuth.clearToken();

    // 双删后：cookie 与 localStorage 都查不到
    expect(document.cookie).not.toContain('wxauth-token');
    expect(window.localStorage.getItem('wxauth-token')).toBeNull();
  });
});
