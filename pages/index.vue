<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <!-- 已认证状态 - 显示成功页面 -->
    <div v-if="session?.authenticated" class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fade-in text-center">
      <div class="text-6xl mb-4">🎉</div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">认证成功！</h2>
      <p class="text-gray-600 mb-6">欢迎访问，您已完成公众号认证</p>

      <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 space-y-2 text-sm text-left">
        <div class="flex justify-between">
          <span class="text-gray-500">用户ID</span>
          <span class="font-mono font-semibold text-gray-700">{{ session.user.openid.substring(0, 8) }}...</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">认证时间</span>
          <span class="text-gray-700">{{ formatTime(session.user.authenticatedAt) }}</span>
        </div>
        <div v-if="session.user.nickname" class="flex justify-between">
          <span class="text-gray-500">昵称</span>
          <span class="text-gray-700">{{ session.user.nickname }}</span>
        </div>
      </div>

      <button
        @click="logout"
        class="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition shadow-sm"
      >
        退出登录
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <h2 class="text-xl font-bold text-gray-700">正在检查认证状态...</h2>
    </div>

    <!-- 未认证状态 - 认证弹窗 -->
    <div v-else class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600/95 backdrop-blur-sm">
      <!-- 美观的认证弹窗 -->
      <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-scale-in relative overflow-hidden">

        <!-- 装饰性背景 -->
        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

        <!-- 头部 -->
        <div class="text-center mb-6 mt-2">
          <div class="text-5xl mb-2">🔐</div>
          <h2 class="text-xl font-bold text-gray-800">身份认证</h2>
          <p class="text-gray-500 text-sm mt-1">关注公众号获取验证码</p>
        </div>

        <!-- 公众号二维码区域 -->
        <div class="mb-6">
          <div class="bg-gray-50 rounded-2xl p-4 text-center border-2 border-dashed border-gray-300 hover:border-blue-400 transition">
            <!-- 这里放你的公众号二维码图片 -->
            <div class="w-40 h-40 mx-auto bg-white rounded-xl flex items-center justify-center mb-2">
              <img
                v-if="qrcodeUrl"
                :src="qrcodeUrl"
                alt="公众号二维码"
                class="w-full h-full object-contain rounded-lg"
              />
              <div v-else class="text-gray-400 text-sm">
                <div class="text-4xl mb-2">📷</div>
                <div>公众号二维码</div>
                <div class="text-xs mt-1">请配置二维码图片</div>
              </div>
            </div>
            <div class="text-xs text-gray-600">
              <div class="font-semibold text-gray-700 mb-1">微信扫码关注</div>
              <div>或搜索公众号: <span class="font-mono text-blue-600">{{ wechatName }}</span></div>
            </div>
          </div>
        </div>

        <!-- 验证码输入区域 -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-700 text-center">
            输入6位验证码
          </label>

          <div class="flex gap-2">
            <input
              v-model="verificationCode"
              placeholder="验证码"
              maxlength="6"
              @keyup.enter="verifyCode"
              class="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              @click="verifyCode"
              :disabled="isVerifying || !verificationCode"
              class="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition shadow-md"
            >
              <span v-if="isVerifying" class="animate-pulse">验证中</span>
              <span v-else>验证</span>
            </button>
          </div>

          <p class="text-xs text-gray-400 text-center">验证码5分钟内有效</p>
        </div>

        <!-- 消息提示 -->
        <div
          v-if="message"
          :class="[
            'mt-3 p-3 rounded-xl text-sm text-center animate-fade-in',
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          ]"
        >
          {{ message.text }}
        </div>

        <!-- 操作按钮 -->
        <button
          @click="requestNewCode"
          class="w-full py-3 mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
        >
          没收到验证码？重新获取
        </button>

        <!-- 底部说明 -->
        <div class="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          <p>🔒 本系统需要认证后才能访问</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const session = ref<any>(null);
const loading = ref(true);
const verificationCode = ref('');
const isVerifying = ref(false);
const message = ref<{ type: string; text: string } | null>(null);

// 配置信息
const wechatName = ref('你的公众号名称'); // 修改为你的公众号名称
const qrcodeUrl = ref(''); // 如果有二维码图片URL，填在这里

// 检查是否有保存的openid（已认证过的用户）
function getSavedOpenid(): string | null {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('wxauth-openid='));
  if (cookie) {
    return cookie.split('=')[1];
  }
  return null;
}

onMounted(async () => {
  try {
    // 1. 检查 session
    const sessionResult = await $fetch('/api/auth/session');
    if (sessionResult.authenticated) {
      session.value = sessionResult;
      loading.value = false;
      return;
    }

    // 2. 检查 cookie 中的 openid（已认证过的用户）
    const savedOpenid = getSavedOpenid();
    if (savedOpenid) {
      const result = await $fetch('/api/auth/check', { query: { openid: savedOpenid } });
      if (result.authenticated) {
        session.value = result;
        loading.value = false;
        return;
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
  } finally {
    loading.value = false;
  }
});

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const logout = async () => {
  if (confirm('确定要退出登录吗？')) {
    await $fetch('/api/auth/session', { method: 'DELETE' });
    document.cookie = 'wxauth-openid=; Max-Age=0; path=/';
    location.reload();
  }
};

// 验证验证码
const verifyCode = async () => {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    message.value = { type: 'error', text: '请输入6位验证码' };
    return;
  }

  isVerifying.value = true;
  message.value = null;

  try {
    const result = await $fetch('/api/auth/check', {
      query: { authToken: verificationCode.value }
    });

    if (result.authenticated) {
      // 认证成功
      session.value = result;
      message.value = { type: 'success', text: '✅ 认证成功！' };

      // 保存openid到cookie（30天有效期）
      if (result.user.openid) {
        document.cookie = `wxauth-openid=${result.user.openid}; max-age=${30 * 24 * 60 * 60}; path=/; sameSite=lax`;
      }

      // 设置 session（用于下次访问保持登录状态）
      await $fetch('/api/auth/session', {
        method: 'POST',
        body: { user: result.user }
      });

      // 1秒后自动刷新页面，显示认证成功页面
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      const errorMsg = result.error === 'invalid_or_expired'
        ? '❌ 验证码已过期或无效，请重新获取'
        : '❌ 验证码错误，请检查后重试';
      message.value = { type: 'error', text: errorMsg };
      verificationCode.value = '';
    }
  } catch (error) {
    console.error('Verify error:', error);
    message.value = { type: 'error', text: '验证失败，请重试' };
  } finally {
    isVerifying.value = false;
  }
};

// 请求重新发送验证码
const requestNewCode = async () => {
  message.value = { type: 'info', text: '请在微信中发送"已关注"或"认证"重新获取验证码' };

  // 如果有公众号二维码，可以显示
  setTimeout(() => {
    message.value = { type: 'info', text: '如未关注公众号，请先扫码关注上方二维码' };
  }, 3000);
};
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease;
}

/* 输入框聚焦动画 */
input:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* 按钮悬停效果 */
button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

button:not(:disabled):active {
  transform: translateY(0);
}
</style>
