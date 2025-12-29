<template>
  <div class="min-h-screen bg-[#eee] flex items-center justify-center p-4">
    <!-- 已认证状态 -->
    <div
      v-if="authenticated"
      class="w-full max-w-md bg-white rounded-2xl p-8 text-center animate-fade-in shadow-xl">
      <div class="text-5xl mb-3">✅</div>
      <h2 class="text-xl font-bold text-gray-800 mb-1">认证成功</h2>
      <p class="text-gray-500 mb-6 text-sm">欢迎 {{ userInfo?.nickname || '用户' }}</p>
      <button
        @click="logout"
        class="w-full py-3 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl font-medium transition shadow-lg">
        退出登录
      </button>
    </div>

    <!-- 未认证状态 - 使用 SDK -->
    <div
      v-else
      class="w-full max-w-md bg-white rounded-2xl p-8 text-center animate-fade-in shadow-xl">
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

      <!-- 开始认证按钮 -->
      <button
        @click="startAuth"
        :disabled="authenticating"
        class="w-full py-4 bg-[#07C160] hover:bg-[#06AD56] disabled:bg-[#C8C8C8] text-white rounded-xl font-bold text-base transition-all shadow-lg active:scale-[0.98] mb-3">
        {{ authenticating ? '初始化中...' : '初始化 SDK' }}
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
            <span class="text-gray-700 text-sm leading-relaxed">点击"开始微信认证"</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
            <span class="text-gray-700 text-sm leading-relaxed">SDK 弹窗显示二维码和输入框</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
            <span class="text-gray-700 text-sm leading-relaxed">微信扫码，输入6位验证码</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 bg-[#07C160] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
            <span class="text-gray-700 text-sm leading-relaxed">点击"验证"按钮完成认证</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 SDK
import { WxAuth } from '../vite-sdk/src/index';
import '../vite-sdk/src/wx-auth.css';

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
const authenticating = ref(false);
const authenticated = ref(false);
const userInfo = ref<any>(null);

// 显示消息
function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
  message.value = { type, text };
  setTimeout(() => {
    if (message.value?.text === text) {
      message.value = null;
    }
  }, 3000);
}

// 检查本地 Cookie
function checkLocalCookie(): boolean {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("wxauth-openid="));
  return !!cookie;
}

// 开始认证
async function startAuth(): Promise<void> {
  authenticating.value = true;
  message.value = null;

  try {
    // 初始化 SDK（使用页面顶部的配置）
    WxAuth.init({
      apiBase: API_BASE,
      wechatName: WECHAT_NAME,
      qrcodeUrl: WECHAT_QRCODE_URL,
      onVerified: (user) => {
        console.log('[Index] 验证成功', user);
        authenticated.value = true;
        userInfo.value = user;
        showMessage('✅ 认证成功！', 'success');
      },
      onError: (error) => {
        console.error('[Index] 错误', error);
        showMessage(`❌ 错误: ${error.message || error}`, 'error');
      }
    });

    // 调用认证 - SDK 会自动显示弹窗
    const result = await WxAuth.requireAuth();

    if (result) {
      // 已通过 Cookie 自动认证
      showMessage('✅ 已通过 Cookie 自动认证', 'success');
    } else {
      // 弹窗已打开，等待用户操作
      showMessage('📱 SDK 弹窗已打开，请操作', 'info');
    }

  } catch (error) {
    console.error('[Index] 认证失败', error);
    showMessage('❌ 认证失败，请重试', 'error');
  } finally {
    authenticating.value = false;
  }
}

// 退出登录
async function logout(): Promise<void> {
  if (confirm('确定退出吗？')) {
    // 清除 Cookie
    document.cookie = "wxauth-openid=; Max-Age=0; path=/";

    // 关闭 SDK 弹窗（如果打开）
    WxAuth.close();

    // 重置状态
    authenticated.value = false;
    userInfo.value = null;
    showMessage('已退出登录', 'info');

    // 延迟刷新
    setTimeout(() => {
      location.reload();
    }, 500);
  }
}

// 页面加载时检查认证状态
onMounted(async () => {
  // 检查本地 Cookie
  if (checkLocalCookie()) {
    showMessage('ℹ️ 检测到本地认证信息，可以继续使用', 'info');
  }
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
