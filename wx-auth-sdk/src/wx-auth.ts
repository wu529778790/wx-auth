/**
 * 微信订阅号认证 SDK - 极简版
 *
 * 特点：
 * - 仅需配置 apiBase
 * - 复用现有后端 API
 * - 无额外依赖
 * - 总大小 < 10KB
 * - 弹窗防删除保护
 *
 * 使用方法：
 *
 * 1. 引入SDK
 *    import { WxAuth } from './wx-auth';
 *    import './wx-auth.css';
 *
 * 2. 初始化
 *    WxAuth.init({
 *      apiBase: 'https://wx-auth.shenzjd.com',
 *      onVerified: (user) => { console.log('验证通过', user); }
 *    });
 *
 * 3. 使用
 *    await WxAuth.requireAuth();
 */

import { Protection } from "./protection";

// 配置类型
interface WxAuthConfig {
  apiBase: string;
  onVerified?: ((user: any) => void) | null;
  onError?: ((error: any) => void) | null;
  onClose?: (() => void) | null; // 关闭弹窗回调（仅在 required=false 时触发）
  required?: boolean; // 是否必须认证（true=强制认证，false=可选认证）
  wechatName?: string;
  qrcodeUrl?: string;
  silent?: boolean; // 静默初始化：true 时 init 不做弹窗，仅校验 cookie 并回调 onVerified
}

// 状态类型
interface WxAuthState {
  isOpen: boolean;
  resolveAuth: ((value: boolean) => void) | null;
  currentStep: string;
}

// 默认配置
const DEFAULT_CONFIG: WxAuthConfig = {
  apiBase: "https://wx-auth.shenzjd.com", // 后端API地址（默认值）
  onVerified: null, // 验证成功回调
  onError: null, // 错误回调
  onClose: null, // 关闭弹窗回调（仅在 required=false 时触发）
  required: true, // 是否必须认证（默认强制认证）
  wechatName: "神族九帝", // 公众号名称（可选，会自动获取）
  qrcodeUrl: "", // 二维码URL（可选，会自动获取）
  silent: false, // 默认不静默
};

let config: WxAuthConfig = { ...DEFAULT_CONFIG };
let siteId = ""; // 站点标识（内部自动获取，用于区分来源网站）
let state: WxAuthState = {
  isOpen: false,
  resolveAuth: null,
  currentStep: "qr",
};

// ==================== 工具函数 ====================

// 从【当前页面域名】推导根域名（用于跨子域名共享 Cookie）
// 注意：必须基于当前页面 hostname 而不是 config.apiBase——
// cookie 的消费者是「当前站点」的后端（接入方读 wxauth-token 去调 check），
// 不是 wx-auth 后端本身；cookie 必须落在「页面所在的域」。
//   app.example.com → .example.com
//   fork 站 mysite.com → .mysite.com
//   localhost / 127.0.0.1 / IP → 返回空串（不设 domain，落页面域本身，兼容本地调试）
export function getRootDomainFromHostname(hostname: string): string {
  try {
    // localhost / IP 地址不设置 domain
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return '';
    }
    const parts = hostname.split('.');
    // 至少两段才有意义（example.com），取最后两段
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
    return '';
  } catch {
    return '';
  }
}

const utils = {
  getRootDomain(): string {
    return getRootDomainFromHostname(window.location.hostname);
  },

  // 获取Cookie
  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  },

  // 设置Cookie（30天过期，自动设置根域名实现跨子域共享）
  setCookie(name: string, value: string): void {
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    const domain = this.getRootDomain();
    const domainStr = domain ? `;domain=${domain}` : '';
    const isSecure = window.location.protocol === 'https:';
    const secureStr = isSecure ? ';Secure' : '';
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/${domainStr}${secureStr};SameSite=Strict`;
  },

  // 删除Cookie（匹配相同的 domain + Secure，避免 https 下删不掉）
  deleteCookie(name: string): void {
    const domain = this.getRootDomain();
    const domainStr = domain ? `;domain=${domain}` : '';
    const isSecure = window.location.protocol === 'https:';
    const secureStr = isSecure ? ';Secure' : '';
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domainStr}${secureStr};SameSite=Strict`;
  },

  // ===== 签名 Token 双存储（Cookie 主 + localStorage 备份） =====
  // 目标：用户清除 Cookie 后，若服务端认证状态仍有效，可凭备份静默恢复。
  // 存储的是签名 Token（HMAC，不可伪造），而非明文 openid（永久凭证），
  // 与 Cookie 同策略（均非 HttpOnly），安全模型零降级。
  // 注意：localStorage 按站点隔离（不跨子域），Cookie 是根域共享。

  // localStorage 备份的 key（避免与接入方业务 key 冲突，加前缀）
  get storageKey(): string {
    return "wxauth-token";
  },

  // 读取：Cookie 优先（权威），localStorage 兜底（备份，用于恢复）
  getToken(): string | null {
    const cookieToken = this.getCookie("wxauth-token");
    if (cookieToken) return cookieToken;
    try {
      return window.localStorage.getItem(this.storageKey);
    } catch {
      return null; // 隐私模式 / 禁用存储
    }
  },

  // 写入：Cookie + localStorage 双写（验证成功后调用，同步刷新备份）
  setToken(token: string): void {
    this.setCookie("wxauth-token", token);
    try {
      window.localStorage.setItem(this.storageKey, token);
    } catch {
      // 存储不可用时静默降级为仅 Cookie
    }
  },

  // 删除：双删（同时清掉明文 openid Cookie —— 防御性清理，服务端已下线 openid 通道 2026-08-26）
  clearToken(): void {
    this.deleteCookie("wxauth-token");
    this.deleteCookie("wxauth-openid");
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      // 忽略存储不可用
    }
  },

  // 发送请求
  // 抛错带 status（HTTP 错误码）或 isNetworkError（断网/DNS/响应解析失败），
  // 供调用方区分「明确未认证」与「瞬时失败」——后者不应触发重新验证（2026-08-29）
  async request(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
        body: options.body ? JSON.stringify(options.body) : null,
        credentials: "include",
      });

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      return await response.json();
    } catch (error) {
      const err = error as Error & { status?: number; isNetworkError?: boolean };
      // fetch 网络失败抛 TypeError（无 status）；JSON 解析失败同样无 status → 都归为瞬时错误
      if (err.status === undefined) {
        err.isNetworkError = true;
      }
      console.error("[WxAuth] Request error:", error);
      throw err;
    }
  },

  // 生成6位验证码输入框HTML
  generateCodeInputs(): string {
    let html = '<div class="wx-auth-inputs">';
    for (let i = 0; i < 6; i++) {
      html += `<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="wx-auth-input" data-index="${i}" autocomplete="off" />`;
    }
    html += "</div>";
    return html;
  },
};

// ==================== 失败分型（2026-08-29）====================
// 「明确未认证」才弹验证码弹窗；「瞬时失败」重试即可——用户凭证仍然有效，
// 把服务不可用/限流当成未登录弹码框，是「明明保持关注却要求重新验证」的
// 主要误伤来源。瞬时口径：网络错误 / HTTP 5xx / 429 / 响应 error 为
// rate_limited 或 server_error（后端以 200+错误码 或 503 两种形态返回）。

const TRANSIENT_RETRY_DELAYS = [1000, 3000];

function isTransientError(error: unknown): boolean {
  const err = error as { status?: number; isNetworkError?: boolean } | null;
  if (!err) return false;
  if (err.isNetworkError) return true;
  if (typeof err.status === "number") return err.status >= 500 || err.status === 429;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// check 结果三分型：
//   ok        → 已认证
//   invalid   → 明确未认证（token 无效/吊销/用户非 active）→ 调用方弹码框
//   transient → 瞬时失败（重试后仍不可用）→ 调用方不得弹码框、不清凭证
type TokenCheckOutcome =
  | { kind: "ok"; result: any }
  | { kind: "invalid"; result: any }
  | { kind: "transient" };

async function checkTokenWithRetry(signedToken: string): Promise<TokenCheckOutcome> {
  const siteParam = siteId ? `&siteId=${encodeURIComponent(siteId)}` : "";
  const url = `${config.apiBase}/api/auth/check?token=${encodeURIComponent(signedToken)}${siteParam}`;

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await utils.request(url);
      if (result.authenticated) return { kind: "ok", result };
      // 限流/服务端降级是「稍后再试」，不是「凭证无效」
      if (result.error === "rate_limited" || result.error === "server_error") {
        return { kind: "transient" };
      }
      return { kind: "invalid", result };
    } catch (error) {
      if (!isTransientError(error) || attempt >= TRANSIENT_RETRY_DELAYS.length) {
        return { kind: "transient" };
      }
      await sleep(TRANSIENT_RETRY_DELAYS[attempt]);
    }
  }
}

// ==================== UI 管理器 ====================

const UI = {
  // 创建弹窗
  createModal(): HTMLElement {
    const modal = document.createElement("div");
    modal.id = "wx-auth-modal";
    modal.className = "wx-auth-modal";

    // 根据 required 配置添加类名
    if (config.required) {
      modal.classList.add("wx-auth-required");
    } else {
      modal.classList.add("wx-auth-optional");
    }

    // 根据 required 配置决定是否显示关闭按钮
    const closeButton = config.required
      ? ""
      : `<button class="wx-auth-close" onclick="WxAuth.close()">×</button>`;

    modal.innerHTML = `
      <div class="wx-auth-overlay" ${config.required ? 'onclick="event.preventDefault()"' : ''}></div>
      <div class="wx-auth-content">
        <div class="wx-auth-header">
          <div class="wx-auth-title">微信登录</div>
          ${closeButton}
        </div>
        <div class="wx-auth-body">
          <!-- 二维码区域 -->
          <div>
            <div class="wx-auth-desc">1. 微信关注公众号 <span class="wx-auth-wechat-name"></span></div>
            <div class="wx-auth-qrcode-container">
              <img class="wx-auth-qrcode" src="" alt="扫码关注" />
            </div>
          </div>

          <!-- 验证码输入区域 -->
          <div>
            <div class="wx-auth-hint">2. 向公众号发送"验证码"获取</div>
            <div class="wx-auth-note">保持关注，即可一直自动登录</div>
            ${utils.generateCodeInputs()}
          </div>

          <!-- 消息提示 -->
          <div class="wx-auth-message" style="display:none"></div>

          <!-- 按钮 -->
          <div class="wx-auth-actions">
            <button class="wx-auth-btn wx-auth-btn-primary" onclick="WxAuth.verifyCode()">登录</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.bindInputEvents();
    return modal;
  },

  // 绑定输入事件
  bindInputEvents(): void {
    setTimeout(() => {
      const inputs =
        document.querySelectorAll<HTMLInputElement>(".wx-auth-input");
      if (!inputs.length) return;

      inputs.forEach((input, index) => {
        // 输入事件
        input.addEventListener("input", (e) => {
          const value = (e.target as HTMLInputElement).value.replace(/\D/g, "");
          (e.target as HTMLInputElement).value = value;

          if (value && index < 5) {
            inputs[index + 1].focus();
          }

          // 自动验证
          if (index === 5 && value) {
            setTimeout(() => WxAuth.verifyCode(), 300);
          }
        });

        // 键盘事件
        input.addEventListener("keydown", (e) => {
          const target = e.target as HTMLInputElement;
          if (e.key === "Backspace" && !target.value && index > 0) {
            inputs[index - 1].focus();
          } else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputs[index - 1].focus();
          } else if (e.key === "ArrowRight" && index < 5) {
            e.preventDefault();
            inputs[index + 1].focus();
          }
        });

        // 粘贴事件
        input.addEventListener("paste", (e) => {
          e.preventDefault();
          const paste = e.clipboardData
            ?.getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);
          if (paste) {
            paste.split("").forEach((char, i) => {
              if (inputs[i]) inputs[i].value = char;
            });
            if (paste.length === 6) {
              setTimeout(() => WxAuth.verifyCode(), 300);
            }
          }
        });
      });
    }, 100);
  },

  // 显示弹窗
  show(): void {
    let modal = document.getElementById("wx-auth-modal");
    if (!modal) {
      modal = this.createModal();
    } else {
      // 确保弹窗有正确的 required 类
      modal.classList.remove("wx-auth-required", "wx-auth-optional");
      if (config.required) {
        modal.classList.add("wx-auth-required");
      } else {
        modal.classList.add("wx-auth-optional");
      }
    }
    // 每次打开时重置状态：清空验证码输入、隐藏消息、恢复登录按钮。
    // 弹窗 DOM 常驻（hide 仅 display:none），不重置会导致「退出登录后再登录」
    // 弹窗里还残留上一次输入的验证码 / “登录中...” / “✅ 已登录” 状态。
    const inputs = modal.querySelectorAll<HTMLInputElement>(".wx-auth-input");
    inputs.forEach((i) => (i.value = ""));
    const msg = modal.querySelector<HTMLElement>(".wx-auth-message");
    if (msg) {
      msg.textContent = "";
      msg.className = "wx-auth-message";
      msg.style.display = "none";
    }
    const btn = modal.querySelector<HTMLButtonElement>(".wx-auth-btn-primary");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "登录";
      btn.style.background = "";
    }

    modal.style.display = "flex";
    state.isOpen = true;

    // 启用弹窗保护
    Protection.enable({
      modalId: "wx-auth-modal",
      getState: () => state,
      onRestore: () => {
        // 重新创建弹窗并恢复配置
        this.createModal();
        if (config.qrcodeUrl) {
          this.setQrCode(config.qrcodeUrl);
        }
        const wechatNameEl = document.querySelector<HTMLElement>(".wx-auth-wechat-name");
        if (wechatNameEl && config.wechatName) {
          wechatNameEl.textContent = `"${config.wechatName}"`;
        }
        this.bindInputEvents();
        setTimeout(() => {
          const firstInput =
            document.querySelector<HTMLInputElement>(".wx-auth-input");
          if (firstInput) firstInput.focus();
        }, 100);
      },
    });
  },

  // 隐藏弹窗
  hide(): void {
    const modal = document.getElementById("wx-auth-modal");
    if (modal) {
      modal.style.display = "none";
      state.isOpen = false;

      // 禁用弹窗保护
      Protection.disable();
    }
  },

  // 设置二维码
  setQrCode(url: string): void {
    if (!url) return;
    const img = document.querySelector<HTMLImageElement>(".wx-auth-qrcode");
    if (!img) return;

    // 直接设置图片源并显示
    img.src = url;
    img.style.display = "block";
  },

  // 显示消息
  showMessage(text: string, type: "info" | "success" | "error" = "info"): void {
    const msg = document.querySelector<HTMLElement>(".wx-auth-message");
    if (msg) {
      msg.textContent = text;
      msg.className = `wx-auth-message wx-auth-message-${type}`;
      msg.style.display = "block";

      setTimeout(() => {
        if (msg.textContent === text) {
          msg.style.display = "none";
        }
      }, 3000);
    }
  },

  // 获取验证码
  getVerifyCode(): string {
    const inputs =
      document.querySelectorAll<HTMLInputElement>(".wx-auth-input");
    if (!inputs.length) return "";
    return Array.from(inputs)
      .map((i) => i.value)
      .join("");
  },

  // 清空验证码输入
  clearCodeInputs(): void {
    const inputs =
      document.querySelectorAll<HTMLInputElement>(".wx-auth-input");
    inputs.forEach((i) => (i.value = ""));
    if (inputs[0]) inputs[0].focus();
  },
};

// ==================== 核心 API ====================

export type { WxAuthConfig };

export const WxAuth = {
  // 初始化
  init(options: Partial<WxAuthConfig> = {}): void {
    config = { ...DEFAULT_CONFIG, ...options };

    // 未设置 apiBase 时自动使用当前域名
    if (!config.apiBase && typeof window !== "undefined") {
      config.apiBase = window.location.origin;
    }

    if (!config.apiBase) {
      console.error("[WxAuth] apiBase is required");
      return;
    }

    // 自动从 referrer 或当前域名获取站点标识（SDK 内部使用，无需配置）
    if (typeof window !== "undefined") {
      // 优先使用 document.referrer（如果有）
      const referrer = document.referrer;
      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);
          siteId = referrerUrl.hostname;
        } catch {
          // 无效的 referrer URL
        }
      }

      // 如果 referrer 为空，使用当前域名
      if (!siteId && window.location.hostname) {
        siteId = window.location.hostname;
      }

      // 如果还是获取不到（如 localhost），使用默认值
      if (!siteId) {
        siteId = "default";
      }

      console.log("[WxAuth] 自动获取 siteId:", siteId);
    }

    console.log("[WxAuth] SDK initialized", config);

    // silent → 只校验 cookie，弹窗由消费者自己控制
    // 非 silent → 保持现有行为（需要弹窗时自动弹）
    if (typeof window !== "undefined") {
      if (config.silent) {
        this.silentCheck();
      } else {
        this.autoCheck();
      }
    }
  },

  /**
   * 静默验证（silent 模式专用）
   * - cookie 有效 → setCookie(token) + onVerified，不调 showAuthModal
   * - cookie 无效 / 不存在 → 不清 cookie、不弹窗，仅返回 false
   *   （2026-08-28：不再 deleteCookie。失效 cookie 保留，供后端识别"有凭证但
   *   失效"（取关）→ 返回 401 → 前端弹认证弹窗；后端通过有无 cookie 区分
   *   "页面用户取关"（401）与"无凭证爬虫"（蜜罐假数据））
   * - 网络错误 → 静默忽略（留给消费者后续 requireAuth 重试）
   */
  async silentCheck(): Promise<boolean> {
    const signedToken = utils.getToken();

    if (!signedToken) return false;

    // invalid / transient 都不清凭证、不弹窗（silent 语义：弹窗由消费者控制）
    const outcome = await checkTokenWithRetry(signedToken);
    if (outcome.kind === "ok") {
      if (outcome.result.token) {
        utils.setToken(outcome.result.token);
      }
      this.onVerified(outcome.result.user);
      return true;
    }
    if (outcome.kind === "transient") {
      console.warn("[WxAuth] silentCheck 服务暂时不可用，跳过（凭证保留）");
    }
    return false;
  },

  // 自动检测凭证并验证（内部使用）
  async autoCheck(): Promise<boolean> {
    const signedToken = utils.getToken();

    if (!signedToken) {
      // 没有凭证，显示弹窗
      this.showAuthModal();
      return false;
    }

    const outcome = await checkTokenWithRetry(signedToken);

    if (outcome.kind === "ok") {
      console.log("[WxAuth] 自动认证成功（凭证）");
      // 服务端返回了签名 Token：双写 Cookie + localStorage（同时刷新备份）
      if (outcome.result.token) {
        utils.setToken(outcome.result.token);
      }
      this.onVerified(outcome.result.user);
      return true;
    }

    if (outcome.kind === "transient") {
      // 服务暂时不可用/限流：凭证仍有效，弹验证码弹窗等于误伤
      //（要求「保持关注即可自动登录」的用户重新关注验证）。
      // 交给 onError 由接入方提示；用户下次导航/刷新时自然重试。
      console.warn("[WxAuth] 服务暂时不可用，跳过自动认证（凭证保留）");
      this.onError({
        code: "server_error",
        retryable: true,
        message: "登录服务暂时不可用，请稍后重试",
      });
      return false;
    }

    // 凭证明确无效：保留失效 cookie（供后端区分取关用户→401 与无凭证爬虫→蜜罐），
    // 仅显示弹窗引导重新关注（2026-08-28 不再 clearToken）
    this.showAuthModal();
    return false;
  },

  // 显示认证弹窗（内部使用）
  async showAuthModal(): Promise<void> {
    UI.show();

    // 尝试从后端获取配置（wechatName、qrcodeUrl）
    try {
      const siteParam = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
      const sdkConfig = await utils.request(
        `${config.apiBase}/api/sdk/config${siteParam}`
      );
      if (sdkConfig.wechatName && !config.wechatName) {
        config.wechatName = sdkConfig.wechatName;
      }
      if (sdkConfig.qrcodeUrl && !config.qrcodeUrl) {
        config.qrcodeUrl = sdkConfig.qrcodeUrl;
      }
    } catch (e) {
      console.warn("[WxAuth] 获取后端配置失败，使用默认配置", e);
    }

    // 显示配置的二维码和描述
    if (config.qrcodeUrl) {
      UI.setQrCode(config.qrcodeUrl);
    }

    // 更新描述文字
    const wechatNameEl = document.querySelector<HTMLElement>(".wx-auth-wechat-name");
    if (wechatNameEl && config.wechatName) {
      wechatNameEl.textContent = `"${config.wechatName}"`;
    }

    // 自动聚焦到第一个输入框
    setTimeout(() => {
      const firstInput =
        document.querySelector<HTMLInputElement>(".wx-auth-input");
      if (firstInput) firstInput.focus();
    }, 100);
  },

  // 主入口：需要验证时调用
  // 凭证仅签名 Token（Cookie 优先 + localStorage 兜底），不再兼容明文 openid（2026-08-26 服务端已下线 openid 通道）
  async requireAuth(): Promise<boolean> {
    // 1. 检查本地凭证（签名 Token 双存储：Cookie 优先，localStorage 兜底）
    const signedToken = utils.getToken();

    if (signedToken) {
      const outcome = await checkTokenWithRetry(signedToken);
      if (outcome.kind === "ok") {
        console.log("[WxAuth] 已认证（凭证）");
        // 刷新签名 Token 并双写（Cookie + localStorage）
        if (outcome.result.token) {
          utils.setToken(outcome.result.token);
        }
        this.onVerified(outcome.result.user);
        return true;
      }
      if (outcome.kind === "transient") {
        // 服务不可用/限流：无法判定登录态，弹验证码弹窗会误导用户重新验证。
        // 通知接入方后返回 false（本次未完成认证，可稍后重新调用 requireAuth）。
        console.warn("[WxAuth] 认证状态检查暂时不可用（凭证保留）");
        this.onError({
          code: "server_error",
          retryable: true,
          message: "登录服务暂时不可用，请稍后重试",
        });
        return false;
      }
      // 凭证明确无效（如用户已取关/token 被吊销）：保留失效 cookie，供后端区分
      // 取关用户（401）与无凭证爬虫（蜜罐），下方走 showAuthModal 引导
    }

    // 2. 显示弹窗（自动从后端获取配置）
    await this.showAuthModal();

    // 3. 返回Promise，等待验证完成
    return new Promise((resolve) => {
      state.resolveAuth = resolve;
    });
  },

  // 验证验证码
  async verifyCode(): Promise<void> {
    const code = UI.getVerifyCode();

    if (!code || code.length !== 6) {
      UI.showMessage("请输入6位验证码", "error");
      return;
    }

    // 禁用验证按钮，防止重复点击
    const btn = document.querySelector<HTMLButtonElement>(
      ".wx-auth-btn-primary"
    );
    if (btn) {
      btn.disabled = true;
      btn.textContent = "登录中...";
    }

    try {
      const siteParam = siteId ? `&siteId=${encodeURIComponent(siteId)}` : '';
      const result = await utils.request(
        `${config.apiBase}/api/auth/check?authToken=${code}${siteParam}`
      );

      if (result.authenticated) {
        // 验证成功 - 签名 Token 双写（Cookie + localStorage 备份）
        if (result.token) {
          utils.setToken(result.token);
        }

        // 按钮显示成功状态
        if (btn) {
          btn.textContent = "✅ 已登录";
          btn.style.background = "#07C160";
        }

        // 延迟关闭弹窗，让用户看到成功状态
        // 顺序很重要：必须先 onVerified() 触发 resolveAuth(true)，
        // 再 close()（否则 close() 会先把 Promise resolve 成 false 并清空 resolveAuth）
        // close(true)：验证成功关闭不触发 onClose（onClose 仅语义 = 用户主动关闭）
        setTimeout(() => {
          this.onVerified(result.user);
          this.close(true);
        }, 500);
      } else {
        // 限流是「稍后再试」，不是「验证码错误」——措辞区分，避免用户反复重输好码
        UI.showMessage(
          result.error === "rate_limited" ? "尝试过于频繁，请稍后再试" : "验证码错误或已过期",
          "error"
        );
        UI.clearCodeInputs();
        // 恢复按钮
        if (btn) {
          btn.disabled = false;
          btn.textContent = "登录";
        }
      }
    } catch (error) {
      // 5xx/网络异常时验证码可能本来就有效，不提示「验证码错误」
      UI.showMessage(
        isTransientError(error) ? "服务暂时不可用，请稍后重试" : "登录失败，请重试",
        "error"
      );
      // 恢复按钮
      if (btn) {
        btn.disabled = false;
        btn.textContent = "登录";
      }
    }
  },

  // 关闭弹窗
  // skipOnClose=true：验证成功路径调用，只隐藏 UI + resolve(false) 兜底，不触发 onClose
  // （onClose 语义 = 用户主动关闭，验证成功关闭不属于用户关闭）
  close(skipOnClose = false): void {
    UI.hide();
    if (state.resolveAuth) {
      state.resolveAuth(false);
      state.resolveAuth = null;
    }
    // 触发关闭回调（仅用户主动关闭）
    if (!skipOnClose && typeof config.onClose === "function") {
      config.onClose();
    }
  },

  // 清空本地认证凭证（双重删除：Cookie + localStorage）
  // 用于"退出登录 / 清空认证状态"按钮。
  // 注意：signedToken 双存储备份（localStorage）若不清，清 Cookie 后
  // SDK 会凭备份静默恢复（getToken 优先 Cookie、localStorage 兜底），
  // 造成"清不掉"的假象——所以必须走这里而非只删 Cookie。
  clearToken(): void {
    utils.clearToken();
  },

  // 服务端注销（2026-08-26 方案 C）：吊销当前 token + 清本地
  // 调用 POST {apiBase}/api/auth/logout（body.token），后端把 token 加入
  // 吊销黑名单。此后任意子域/设备的 localStorage 备份都无法再恢复登录态
  // （根治「A 域退出、B 域还能用」的双写恢复问题）。
  // 幂等安全：网络失败 /* 后端不可达 */ 时静默降级为仅本地清理（clearToken），
  // 不阻塞退出流程；token 无效也会返回 success（本地照常清理）。
  // 已知取舍：非自有子域（不在部署域父域白名单内）的 Origin 会被后端 403，
  // 本地清理照常生效，但服务端 token 仍有效（换取吊销入口不被第三方页面滥用）。
  async revoke(): Promise<boolean> {
    const token = utils.getToken();
    if (token) {
      try {
        const base = config.apiBase && !/\/$/.test(config.apiBase) ? config.apiBase : "https://wx-auth.shenzjd.com";
        const res = await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "include",
        });
        if (!res.ok) {
          console.warn("[WxAuth] revoke 请求失败，降级本地清理", res.status);
        }
      } catch (err) {
        console.warn("[WxAuth] revoke 网络异常，降级本地清理", err);
      }
    }
    this.clearToken();
    return true;
  },

  // 验证成功回调
  onVerified(user: any): void {
    console.log("[WxAuth] 验证成功", user);
    if (typeof config.onVerified === "function") {
      config.onVerified(user);
    }
    if (state.resolveAuth) {
      state.resolveAuth(true);
      state.resolveAuth = null;
    }
  },

  // 错误回调
  onError(error: any): void {
    console.error("[WxAuth] 错误", error);
    if (typeof config.onError === "function") {
      config.onError(error);
    }
  },
};

// 浏览器全局暴露（用于 script 标签引入）
// freeze 防止 F12 上做 WxAuth.requireAuth = () => Promise.resolve(true) 之类的篡改
if (typeof window !== "undefined") {
  (window as any).WxAuth = Object.freeze(WxAuth);
}
