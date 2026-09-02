<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center p-4 sm:p-6 lg:p-8 py-12 gap-6">
    <div class="w-full max-w-4xl mx-auto">
      <!-- 主卡片 -->
      <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:bg-slate-800/80 dark:border-slate-700/50 overflow-hidden">
        <!-- 头部区域 -->
        <div class="bg-gradient-to-r from-[#07C160] to-[#06AD56] p-8 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold tracking-tight mb-2">微信扫码登录系统</h1>
              <p class="text-white/90 text-lg">关注公众号获取验证码，输入 6 位验证码完成登录</p>
            </div>
            <div class="hidden sm:block">
              <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg class="w-10 h-10" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="p-6 sm:p-8 space-y-6">
          <!-- 登录状态（横向状态条） -->
          <div class="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 dark:bg-slate-700/50 dark:border-slate-600/80">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                :class="hasAuthCookie ? 'bg-[#07C160] text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'"
              >
                <svg v-if="hasAuthCookie" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-sm" :class="hasAuthCookie ? 'text-[#07C160]' : 'text-slate-600 dark:text-slate-200'">
                  {{ hasAuthCookie ? '已登录' : '未登录' }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                  {{ hasAuthCookie ? '保持关注，即可一直自动登录' : '点击右侧按钮，扫码登录' }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                v-if="hasAuthCookie"
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="logout"
              >
                退出登录
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium bg-[#07C160] text-white hover:bg-[#06AD56] transition-colors"
                @click="showLogin"
              >
                {{ hasAuthCookie ? '演示弹窗' : '扫码登录' }}
              </button>
            </div>
          </div>

          <!-- 登录流程 -->
          <div>
            <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 dark:text-slate-100">
              <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                <path d="M10 8a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"/>
              </svg>
              登录流程
            </h2>
            <div class="grid sm:grid-cols-3 gap-3">
              <div class="bg-slate-50 rounded-xl p-4 text-center dark:bg-slate-700/50">
                <div class="w-9 h-9 mb-2.5 mx-auto bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <div class="font-semibold text-slate-800 text-sm dark:text-slate-100">扫码关注公众号</div>
                <div class="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">弹窗展示公众号二维码，微信扫码关注</div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 text-center dark:bg-slate-700/50">
                <div class="w-9 h-9 mb-2.5 mx-auto bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <div class="font-semibold text-slate-800 text-sm dark:text-slate-100">获取并输入验证码</div>
                <div class="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">公众号回复「验证码」获取 6 位数字，输入弹窗</div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 text-center dark:bg-slate-700/50">
                <div class="w-9 h-9 mb-2.5 mx-auto bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <div class="font-semibold text-slate-800 text-sm dark:text-slate-100">登录完成</div>
                <div class="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">登录态保存到 Cookie，保持关注即可一直自动登录</div>
              </div>
            </div>
          </div>
        </div>

      <!-- 底部 -->
      <div class="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center text-sm text-slate-500 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-400">
        <p>微信登录 SDK（公众号验证码） | 基于 Nuxt 4 + Vue 3 + TypeScript</p>
      </div>
    </div>

    <!-- SDK 接入演示 -->
    <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:bg-slate-800/80 dark:border-slate-700/50 overflow-hidden mt-6">
      <div class="bg-gradient-to-r from-[#07C160] to-[#06AD56] p-6 text-white">
        <h2 class="text-2xl font-bold tracking-tight">SDK 接入演示</h2>
        <p class="text-white/90 text-sm mt-1">在你的网站中快速接入微信扫码登录（公众号验证码）</p>
      </div>

      <div class="p-6 space-y-6">
        <!-- NPM 接入 -->
        <section>
          <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-100">
            <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd"/>
            </svg>
            方式一：NPM 安装
          </h3>
          <div class="space-y-3">
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto">
              <pre class="text-sm text-green-400 font-mono"><code># 安装 SDK
npm install wx-auth-sdk</code></pre>
            </div>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto">
              <pre class="text-sm text-slate-300 font-mono leading-relaxed"><code><span class="text-purple-400">import</span> { WxAuth } <span class="text-purple-400">from</span> <span class="text-yellow-300">'wx-auth-sdk'</span>;
<span class="text-purple-400">import</span> <span class="text-yellow-300">'wx-auth-sdk/dist/wx-auth.css'</span>;

<span class="text-green-400">// ✅ 零配置接入（推荐）</span>
WxAuth.<span class="text-blue-400">init</span>({
  <span class="text-slate-500">// 什么都不用配置，SDK 会自动获取站点标识、apiBase 和公众号信息</span>
  onVerified: <span class="text-blue-400">(</span>user<span class="text-blue-400">)</span> <span class="text-purple-400">=></span> {
    console.log(<span class="text-yellow-300">'登录成功'</span>, user);
  },
  <span class="text-slate-500">// onClose: () => { ... }  // 可选登录时使用</span>
});</code></pre>
            </div>
          </div>
        </section>

        <!-- CDN 接入 -->
        <section>
          <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-100">
            <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm4 11h2v-2H9v2zm0-4h2V6H9v4z"/>
            </svg>
            方式二：CDN 引入
          </h3>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto">
            <pre class="text-sm text-slate-300 font-mono leading-relaxed"><code><span class="text-slate-500">&lt;!-- 引入样式和脚本 --&gt;</span>
<span class="text-red-400">&lt;link</span> rel=<span class="text-yellow-300">"stylesheet"</span> href=<span class="text-yellow-300">"https://unpkg.com/wx-auth-sdk/dist/wx-auth.css"</span><span class="text-red-400">&gt;</span>
<span class="text-red-400">&lt;script</span> src=<span class="text-yellow-300">"https://unpkg.com/wx-auth-sdk/dist/wx-auth.umd.js"</span><span class="text-red-400">&gt;&lt;/script&gt;</span>

<span class="text-red-400">&lt;script&gt;</span>
  WxAuth.<span class="text-blue-400">init</span>({
    <span class="text-green-400">// ✅ 零配置，所有参数自动获取</span>
    onVerified: <span class="text-blue-400">(</span>user<span class="text-blue-400">)</span> <span class="text-purple-400">=></span> {
      console.log(<span class="text-yellow-300">'登录成功'</span>, user);
    },
    <span class="text-slate-500">// onClose: () => { ... }  // 可选登录时使用</span>
  });
<span class="text-red-400">&lt;/script&gt;</span></code></pre>
          </div>
        </section>

        <!-- 配置说明 -->
        <section class="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-200/60 dark:from-slate-700/50 dark:to-slate-800 dark:border-slate-600/60">
          <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-100">
            <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.533 1.533 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
            </svg>
            配置说明
          </h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-mono text-xs flex-shrink-0 dark:bg-slate-600 dark:text-slate-300">apiBase</span>
              <span class="text-slate-600 dark:text-slate-300">后端 API 地址（<strong>可选，已有默认值</strong>）</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-mono text-xs flex-shrink-0 dark:bg-slate-600 dark:text-slate-300">required</span>
              <span class="text-slate-600 dark:text-slate-300">是否必须登录（<strong>可选</strong>，默认 <code class="bg-slate-200 px-1 rounded text-xs dark:bg-slate-600 dark:text-slate-200">true</code>）</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-mono text-xs flex-shrink-0 dark:bg-slate-600 dark:text-slate-300">onVerified</span>
              <span class="text-slate-600 dark:text-slate-300">登录成功回调（<strong>推荐配置</strong>）</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center justify-center px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-mono text-xs flex-shrink-0 dark:bg-slate-600 dark:text-slate-300">onClose</span>
              <span class="text-slate-600 dark:text-slate-300">用户关闭弹窗回调（<strong>可选</strong>，仅在 <code class="bg-slate-200 px-1 rounded text-xs dark:bg-slate-600 dark:text-slate-200">required=false</code> 时触发）</span>
            </div>
            <div class="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/30 dark:border-green-800">
              <p class="text-sm text-green-800 dark:text-green-300">
                <strong>✅ 推荐：</strong>所有参数都<strong>无需手动配置</strong>，只需调用 <code class="bg-green-100 px-1 rounded text-xs dark:bg-green-800/50 dark:text-green-200">WxAuth.init()</code> 即可实现零配置接入！
              </p>
            </div>
          </div>
        </section>

        <!-- API 方法 -->
        <section>
          <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-100">
            <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            API 方法
          </h3>
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="bg-slate-50 rounded-xl p-4 dark:bg-slate-700/50">
              <div class="font-mono text-sm font-semibold text-[#07C160] mb-2">WxAuth.init(options)</div>
              <p class="text-sm text-slate-600 dark:text-slate-300">初始化 SDK，自动检测 Cookie 并静默登录</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-4 dark:bg-slate-700/50">
              <div class="font-mono text-sm font-semibold text-[#07C160] mb-2">WxAuth.requireAuth()</div>
              <p class="text-sm text-slate-600 dark:text-slate-300">手动触发登录流程，返回 <code class="bg-slate-200 px-1 rounded text-xs dark:bg-slate-600 dark:text-slate-200">Promise&lt;boolean&gt;</code></p>
            </div>
            <div class="bg-slate-50 rounded-xl p-4 dark:bg-slate-700/50">
              <div class="font-mono text-sm font-semibold text-[#07C160] mb-2">WxAuth.close()</div>
              <p class="text-sm text-slate-600 dark:text-slate-300">关闭登录弹窗</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-4 dark:bg-slate-700/50">
              <div class="font-mono text-sm font-semibold text-[#07C160] mb-2">WxAuth.revoke()</div>
              <p class="text-sm text-slate-600 dark:text-slate-300">服务端注销：吊销 Token（全设备失效）+ 清本地凭证</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-4 dark:bg-slate-700/50">
              <div class="font-mono text-sm font-semibold text-[#07C160] mb-2">自动配置获取</div>
              <p class="text-sm text-slate-600 dark:text-slate-300">wechatName、qrcodeUrl 自动从 <code class="bg-slate-200 px-1 rounded text-xs dark:bg-slate-600 dark:text-slate-200">/api/sdk/config</code> 获取</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 SDK
import { WxAuth } from "../wx-auth-sdk/src/index";
import "../wx-auth-sdk/src/wx-auth.css";

// ==================== SDK 配置（修改这里） ====================
// 后端 API 地址（同部署域名时留空，自动使用当前域名）
const API_BASE = "";

// 公众号名称（可选，自动从后端获取）
const WECHAT_NAME = "微信公众号";

// 公众号二维码 URL（可选，自动从后端获取）
const WECHAT_QRCODE_URL = "";
// ============================================================

// 是否已登录（用于登录状态条展示）
const hasAuthCookie = ref(false);

// 检查本地 Cookie（SDK 主存 wxauth-token，向后兼容 wxauth-openid）
function checkLocalCookie(): boolean {
  const cookies = document.cookie.split("; ");
  return cookies.some(
    (row) => row.startsWith("wxauth-token=") || row.startsWith("wxauth-openid=")
  );
}

// 更新登录状态条
function updateButtonState(): void {
  hasAuthCookie.value = checkLocalCookie();
}

// 手动弹出登录弹窗（silent 模式下由页面按钮触发）
async function showLogin(): Promise<void> {
  await WxAuth.requireAuth();
  updateButtonState();
}

// 退出登录：服务端吊销 token + 清本地凭证
async function logout(): Promise<void> {
  await WxAuth.revoke();
  updateButtonState();
}

// 页面加载时自动初始化 SDK
onMounted(() => {
  // silent: true = 加载时只静默校验登录态、绝不自动弹登录窗
  // required: false = 可选认证：弹窗带 × 关闭按钮，支持 onClose 回调
  WxAuth.init({
    apiBase: API_BASE,
    silent: true,
    required: false,
    wechatName: WECHAT_NAME,
    qrcodeUrl: WECHAT_QRCODE_URL,
    onVerified: (user) => {
      console.log("[Index] 登录成功", user);
      updateButtonState();
    },
    onError: (error) => {
      console.error("[Index] 错误", error);
    },
    onClose: () => {
      console.log("[Index] 用户关闭了登录弹窗");
    },
  });

  // 更新登录状态条
  updateButtonState();
});
</script>

<style scoped>
/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 按钮点击反馈 */
button:active:not(:disabled) {
  transform: scale(0.98);
}

/* 响应式优化 */
@media (max-width: 640px) {
  .max-w-4xl {
    max-width: 100%;
  }
}
</style>
