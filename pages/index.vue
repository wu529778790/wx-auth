<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="w-full max-w-4xl mx-auto">
      <!-- 主卡片 -->
      <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
        <!-- 头部区域 -->
        <div class="bg-gradient-to-r from-[#07C160] to-[#06AD56] p-8 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold tracking-tight mb-2">微信订阅号认证系统</h1>
              <p class="text-white/90 text-lg">安全、便捷、智能的认证方案</p>
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
        <div class="p-8 grid lg:grid-cols-2 gap-8">
          <!-- 左侧：配置信息 -->
          <div class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                系统配置
              </h2>
              <div class="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
                <div class="flex items-start gap-3">
                  <span class="font-semibold text-[#07C160] min-w-[60px]">API:</span>
                  <span class="text-slate-600 break-all font-mono text-xs">{{ API_BASE }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-[#07C160] min-w-[60px]">公众号:</span>
                  <span class="text-slate-700 font-medium">{{ WECHAT_NAME }}</span>
                </div>
                <div v-if="WECHAT_QRCODE_URL" class="flex items-start gap-3">
                  <span class="font-semibold text-[#07C160] min-w-[60px]">二维码:</span>
                  <span class="text-slate-500 text-xs break-all">{{ WECHAT_QRCODE_URL }}</span>
                </div>
              </div>
            </div>

            <!-- 状态指示器 -->
            <div>
              <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                认证状态
              </h2>
              <div class="bg-slate-50 rounded-xl p-4">
                <div v-if="hasAuthCookie" class="text-center space-y-2">
                  <div class="flex items-center justify-center gap-2 text-[#07C160] font-bold text-lg">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    已认证
                  </div>
                  <p class="text-slate-500 text-sm">下次访问将自动认证</p>
                </div>
                <div v-else class="text-center space-y-2">
                  <div class="flex items-center justify-center gap-2 text-slate-400 font-medium">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    未认证
                  </div>
                  <p class="text-slate-500 text-sm">认证窗口将在页面加载时自动显示</p>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="space-y-3">
              <button
                v-if="hasAuthCookie"
                @click="clearAuth"
                class="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                清空认证状态
              </button>
              <button
                v-else
                @click="triggerAuth"
                class="w-full py-3 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                立即认证
              </button>
            </div>
          </div>

          <!-- 右侧：认证流程说明 -->
          <div class="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200/60">
            <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                <path d="M10 8a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"/>
              </svg>
              认证流程
            </h2>

            <div class="space-y-4">
              <div class="flex gap-4 items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-800">访问自动检测</div>
                  <div class="text-sm text-slate-600 mt-1">系统自动检查 Cookie，已认证用户静默通过</div>
                </div>
              </div>

              <div class="flex gap-4 items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-800">扫码关注公众号</div>
                  <div class="text-sm text-slate-600 mt-1">微信扫描二维码，关注公众号获取验证码</div>
                </div>
              </div>

              <div class="flex gap-4 items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-800">输入6位验证码</div>
                  <div class="text-sm text-slate-600 mt-1">向公众号发送"验证码"，输入收到的6位数字</div>
                </div>
              </div>

              <div class="flex gap-4 items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-800">自动保存状态</div>
                  <div class="text-sm text-slate-600 mt-1">认证成功后保存 Cookie，下次访问自动认证</div>
                </div>
              </div>
            </div>

            <!-- 特性亮点 -->
            <div class="mt-6 pt-6 border-t border-slate-200">
              <h3 class="font-semibold text-slate-800 mb-3">系统特性</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center gap-2 text-slate-600">
                  <svg class="w-4 h-4 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9l4 4L15 5"/></svg>
                  安全加密
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <svg class="w-4 h-4 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9l4 4L15 5"/></svg>
                  5分钟过期
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <svg class="w-4 h-4 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9l4 4L15 5"/></svg>
                  一键使用
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <svg class="w-4 h-4 text-[#07C160]" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9l4 4L15 5"/></svg>
                  微信风格
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>微信订阅号认证 SDK v1.0.2 | 基于 Nuxt 4 + Vue 3 + TypeScript</p>
        </div>
      </div>

      <!-- 页脚说明 -->
      <div class="mt-6 text-center text-slate-500 text-sm">
        <p>💡 提示：认证成功后，页面不会显示任何提示，直接静默通过</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 SDK
import { WxAuth } from "../wx-auth-sdk/src/index";
import "../wx-auth-sdk/src/wx-auth.css";

// ==================== SDK 配置（修改这里） ====================
// 你的后端 API 地址（必填）
const API_BASE = "https://wx-auth.shenzjd.com";

// 公众号名称（可选，用于显示）
const WECHAT_NAME = "神族九帝";

// 公众号二维码 URL（可选，留空显示默认占位图）
// 示例: 'https://your-site.com/qrcode.jpg'
const WECHAT_QRCODE_URL =
  "https://gcore.jsdelivr.net/gh/wu529778790/image/blog/qrcode_for_gh_61da24be23ff_258.jpg";
// ============================================================

const hasAuthCookie = ref(false);

// 检查本地 Cookie
function checkLocalCookie(): boolean {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("wxauth-openid="));
  return !!cookie;
}

// 更新按钮状态
function updateButtonState(): void {
  hasAuthCookie.value = checkLocalCookie();
}

// 清空认证状态
function clearAuth(): void {
  // 清除 Cookie
  document.cookie = "wxauth-openid=; Max-Age=0; path=/";

  // 刷新页面，自动触发认证弹窗
  window.location.reload();
}

// 手动触发认证（用于未认证时的按钮）
function triggerAuth(): void {
  // SDK 会自动显示弹窗，这里只是确保状态更新
  updateButtonState();
}

// 页面加载时自动初始化 SDK
onMounted(async () => {
  // 初始化 SDK（使用页面顶部的配置）
  // SDK 会自动检测 Cookie 并静默认证，未认证时显示弹窗
  WxAuth.init({
    apiBase: API_BASE,
    wechatName: WECHAT_NAME,
    qrcodeUrl: WECHAT_QRCODE_URL,
    onVerified: (user) => {
      console.log("[Index] 验证成功", user);
      updateButtonState();
    },
    onError: (error) => {
      console.error("[Index] 错误", error);
      // SDK 内部会处理错误显示
    },
  });

  // 更新按钮状态
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
