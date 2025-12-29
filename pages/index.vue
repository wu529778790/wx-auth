<template>
  <div class="min-h-screen bg-[#eee] flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl p-8 text-center animate-fade-in shadow-xl">
      <div class="text-5xl mb-3">🔐</div>
      <h2 class="text-xl font-bold text-gray-800 mb-1">微信订阅号认证</h2>
      <p class="text-gray-500 mb-6 text-sm">SDK 演示页面</p>

      <!-- 配置信息展示 -->
      <div class="space-y-3 text-left text-sm bg-[#F8F8F8] p-4 rounded-xl mb-6">
        <div class="flex items-start gap-2">
          <span class="font-bold text-[#07C160] whitespace-nowrap">API:</span>
          <span class="text-gray-600 break-all">{{ API_BASE }}</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="font-bold text-[#07C160] whitespace-nowrap">公众号:</span>
          <span class="text-gray-600">{{ WECHAT_NAME }}</span>
        </div>
        <div v-if="WECHAT_QRCODE_URL" class="flex items-start gap-2">
          <span class="font-bold text-[#07C160] whitespace-nowrap">二维码:</span>
          <span class="text-gray-600 text-xs break-all">{{ WECHAT_QRCODE_URL }}</span>
        </div>
      </div>

      <!-- 手动触发认证按钮（用于重新认证） -->
      <button
        v-if="hasAuthCookie"
        @click="startAuth"
        class="w-full py-4 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl font-bold text-base transition-all shadow-lg active:scale-[0.98] mb-3">
        重新认证
      </button>

      <!-- 清空认证状态按钮 -->
      <button
        v-if="hasAuthCookie"
        @click="clearAuth"
        class="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all active:scale-[0.98] mb-3">
        清空认证状态
      </button>

      <!-- 消息提示 -->
      <div
        v-if="message"
        :class="[
          'mt-4 px-4 py-3 rounded-xl text-sm text-center font-medium',
          message.type === 'success'
            ? 'bg-[#F0FDF4] text-[#07C160] border border-[#07C160]/20'
            : message.type === 'error'
            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20'
            : 'bg-[#E8F4FF] text-[#0066CC] border border-[#B3D9FF]',
        ]">
        {{ message.text }}
      </div>

      <!-- 说明步骤 -->
      <div class="mt-6 text-left">
        <div class="bg-[#F8F8F8] rounded-xl p-4 space-y-3 border border-[#E5E5E5]">
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
            <span class="text-gray-700 text-sm leading-relaxed">首次访问自动弹出认证窗口</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
            <span class="text-gray-700 text-sm leading-relaxed">微信扫码，输入6位验证码</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
            <span class="text-gray-700 text-sm leading-relaxed">认证成功自动保存 Cookie</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
            <span class="text-gray-700 text-sm leading-relaxed">下次访问自动认证，无需操作</span>
          </div>
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

const message = ref<{ type: string; text: string } | null>(null);
const hasAuthCookie = ref(false);

// 检查本地 Cookie
function checkLocalCookie(): boolean {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("wxauth-openid="));
  return !!cookie;
}

// 显示消息
function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
  message.value = { type, text };
  setTimeout(() => {
    if (message.value?.text === text) {
      message.value = null;
    }
  }, 3000);
}

// 更新按钮状态
function updateButtonState(): void {
  hasAuthCookie.value = checkLocalCookie();
}

// 手动触发认证（用于重新认证）
async function startAuth(): Promise<void> {
  showMessage('📱 SDK 弹窗已打开，请操作', 'info');

  try {
    const result = await WxAuth.requireAuth();
    if (result) {
      showMessage('✅ 认证成功！', 'success');
      updateButtonState();
    }
  } catch (error) {
    console.error('[Index] 认证失败', error);
    showMessage('❌ 认证失败，请重试', 'error');
  }
}

// 清空认证状态
function clearAuth(): void {
  // 清除 Cookie
  document.cookie = "wxauth-openid=; Max-Age=0; path=/";

  // 关闭 SDK 弹窗（如果打开）
  WxAuth.close();

  // 更新按钮状态
  updateButtonState();

  showMessage('✅ 已清空认证状态', 'success');
}

// 页面加载时自动初始化 SDK
onMounted(async () => {
  // 初始化 SDK（使用页面顶部的配置）
  WxAuth.init({
    apiBase: API_BASE,
    wechatName: WECHAT_NAME,
    qrcodeUrl: WECHAT_QRCODE_URL,
    onVerified: (user) => {
      console.log('[Index] 验证成功', user);
      showMessage('✅ 认证成功！', 'success');
      updateButtonState();
    },
    onError: (error) => {
      console.error('[Index] 错误', error);
      showMessage(`❌ 错误: ${error.message || error}`, 'error');
    }
  });

  // 更新按钮状态
  updateButtonState();

  // 调用认证 - SDK 会自动处理 Cookie 检查和弹窗显示
  // 如果有 Cookie 且有效，自动认证；否则弹出窗口
  setTimeout(() => {
    WxAuth.requireAuth().then((result) => {
      if (result) {
        // Cookie 自动认证成功，不显示提示（静默通过）
        updateButtonState();
      } else {
        // 弹窗已打开
        showMessage('📱 SDK 弹窗已打开，请操作', 'info');
      }
    }).catch((error) => {
      console.error('[Index] 认证失败', error);
      showMessage('❌ 认证失败，请重试', 'error');
    });
  }, 500);
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
