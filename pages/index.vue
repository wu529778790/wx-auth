<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- 头部 -->
      <div class="border-b border-gray-200 pb-4">
        <h1 class="text-2xl font-bold text-gray-800">微信订阅号认证 SDK</h1>
        <p class="text-gray-500 mt-1">演示页面</p>
      </div>

      <!-- 配置信息 -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h3 class="font-bold text-gray-800 mb-3">配置信息</h3>
        <div class="space-y-2 text-sm">
          <div class="flex gap-2">
            <span class="font-bold text-[#07C160] w-16">API:</span>
            <span class="text-gray-600 break-all">{{ API_BASE }}</span>
          </div>
          <div class="flex gap-2">
            <span class="font-bold text-[#07C160] w-16">公众号:</span>
            <span class="text-gray-600">{{ WECHAT_NAME }}</span>
          </div>
          <div v-if="WECHAT_QRCODE_URL" class="flex gap-2">
            <span class="font-bold text-[#07C160] w-16">二维码:</span>
            <span class="text-gray-600 text-xs break-all">{{ WECHAT_QRCODE_URL }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h3 class="font-bold text-gray-800 mb-3">操作</h3>
        <button
          v-if="hasAuthCookie"
          @click="clearAuth"
          class="w-full py-3 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-lg font-bold transition-all active:scale-[0.98]">
          清空认证状态
        </button>
        <div v-else class="text-gray-500 text-sm">当前未认证，认证窗口将在页面加载时自动显示</div>
      </div>

      <!-- 说明 -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h3 class="font-bold text-gray-800 mb-3">认证流程</h3>
        <div class="space-y-2 text-sm text-gray-600">
          <div>1. 首次访问自动弹出认证窗口</div>
          <div>2. 微信扫码，输入6位验证码</div>
          <div>3. 认证成功自动保存 Cookie</div>
          <div>4. 下次访问自动认证，无需操作</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 SDK
import { WxAuth } from '../wx-auth-sdk/src/index';
import '../wx-auth-sdk/src/wx-auth.css';

// ==================== SDK 配置（修改这里） ====================
// 你的后端 API 地址（必填）
const API_BASE = 'https://auth.shenzjd.com';

// 公众号名称（可选，用于显示）
const WECHAT_NAME = '神族九帝';

// 公众号二维码 URL（可选，留空显示默认占位图）
// 示例: 'https://your-site.com/qrcode.jpg'
const WECHAT_QRCODE_URL = 'https://gcore.jsdelivr.net/gh/wu529778790/image/blog/qrcode_for_gh_61da24be23ff_258.jpg';
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

// 页面加载时自动初始化 SDK
onMounted(async () => {
  // 初始化 SDK（使用页面顶部的配置）
  // SDK 会自动检测 Cookie 并静默认证，未认证时显示弹窗
  WxAuth.init({
    apiBase: API_BASE,
    wechatName: WECHAT_NAME,
    qrcodeUrl: WECHAT_QRCODE_URL,
    onVerified: (user) => {
      console.log('[Index] 验证成功', user);
      updateButtonState();
    },
    onError: (error) => {
      console.error('[Index] 错误', error);
      // SDK 内部会处理错误显示
    }
  });

  // 更新按钮状态
  updateButtonState();
});
</script>

<style scoped>
/* 按钮点击反馈 */
button:active:not(:disabled) {
  transform: scale(0.98);
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
</style>
