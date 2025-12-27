<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <!-- 已认证状态 - 显示成功页面 -->
    <div v-if="session?.authenticated" class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
      <div class="text-center mb-6">
        <div class="text-6xl mb-2">🎉</div>
        <h2 class="text-2xl font-bold text-gray-800">认证成功！</h2>
        <p class="text-gray-600 mt-2">欢迎访问，您已完成公众号认证</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">用户ID</span>
          <span class="font-mono font-semibold">{{ session.user.openid.substring(0, 8) }}...</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">认证时间</span>
          <span>{{ formatTime(session.user.authenticatedAt) }}</span>
        </div>
        <div v-if="session.user.nickname" class="flex justify-between">
          <span class="text-gray-500">昵称</span>
          <span>{{ session.user.nickname }}</span>
        </div>
      </div>

      <button
        @click="logout"
        class="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
      >
        退出登录
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <h2 class="text-xl font-bold text-gray-700">正在检查认证状态...</h2>
    </div>

    <!-- 未认证状态 - 强制弹窗认证 -->
    <div v-else class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600">
      <!-- 强制认证弹窗 -->
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-scale-in relative">
        <!-- 无关闭按钮 - 强制认证 -->

        <!-- 弹窗头部 -->
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🔐</div>
          <h2 class="text-2xl font-bold text-gray-800">完成身份认证</h2>
          <p class="text-gray-600 text-sm mt-1">关注公众号获取验证码，继续访问</p>
        </div>

        <!-- 操作步骤 -->
        <div class="bg-blue-50 rounded-lg p-3 mb-4 space-y-2">
          <div class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span class="text-xs text-gray-700">扫码关注公众号</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span class="text-xs text-gray-700">公众号自动发送6位验证码</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span class="text-xs text-gray-700">输入验证码完成认证</span>
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
          <label class="block text-xs font-semibold text-gray-700 mb-1">输入验证码</label>
          <div class="flex gap-2">
            <input
              v-model="verificationCode"
              placeholder="6位验证码"
              maxlength="6"
              @keyup.enter="verifyCode"
              class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-base font-mono tracking-widest focus:outline-none focus:border-blue-500"
            />
            <button
              @click="verifyCode"
              :disabled="isVerifying || !verificationCode"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition text-sm whitespace-nowrap"
            >
              <span v-if="isVerifying">验证中...</span>
              <span v-else>验证</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1 text-center">验证码5分钟内有效</p>
        </div>

        <!-- 状态提示 -->
        <div
          v-if="message"
          :class="[
            'p-2 rounded-lg text-xs text-center mb-3 animate-fade-in',
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
          class="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-sm"
        >
          没收到验证码？点击重新获取
        </button>

        <!-- 开发测试工具 -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="flex items-center justify-between mb-2 cursor-pointer" @click="showTestTools = !showTestTools">
            <span class="text-xs font-semibold text-yellow-700">🛠️ 开发测试工具</span>
            <span class="text-xs px-2 py-1 bg-yellow-100 rounded">{{ showTestTools ? '隐藏' : '显示' }}</span>
          </div>

          <div v-if="showTestTools" class="space-y-2">
            <input
              v-model="testOpenid"
              placeholder="测试OpenID"
              class="w-full px-2 py-1 text-xs border rounded"
            />
            <button
              @click="simulateSubscribe"
              :disabled="isSimulating"
              class="w-full py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded font-semibold transition text-xs"
            >
              {{ isSimulating ? '模拟中...' : '🎯 模拟关注公众号' }}
            </button>
            <div v-if="generatedCode" class="bg-white p-2 rounded border border-yellow-300 text-center">
              <p class="text-xs text-gray-500">验证码: <span class="text-lg font-bold text-yellow-600">{{ generatedCode }}</span></p>
              <p class="text-xs text-gray-500 mt-1">已自动填入，可直接验证</p>
            </div>
          </div>
        </div>

        <!-- 底部说明 -->
        <div class="mt-3 text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
          <p>🔒 本系统需要认证后才能访问</p>
          <p>请先关注公众号完成认证</p>
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

// 测试工具状态
const showTestTools = ref(false);
const testOpenid = ref('oxxx_testuser_' + Math.floor(Math.random() * 10000));
const isSimulating = ref(false);
const generatedCode = ref('');

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
    message.value = { type: 'info', text: '如未关注公众号，请先扫码关注' };
  }, 3000);
};

// 模拟关注公众号（开发测试用）
const simulateSubscribe = async () => {
  if (!testOpenid.value) {
    message.value = { type: 'error', text: '请输入测试OpenID' };
    return;
  }

  isSimulating.value = true;
  message.value = null;
  generatedCode.value = '';

  try {
    // 调用测试接口（绕过签名验证）
    const response = await fetch('/api/test/simulate-subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        openid: testOpenid.value
      })
    });

    const result = await response.json();

    if (result.success) {
      generatedCode.value = result.code;
      verificationCode.value = result.code; // 自动填入输入框

      message.value = {
        type: 'success',
        text: `✅ 模拟成功！验证码已生成，可直接验证`
      };
    } else {
      message.value = { type: 'error', text: `❌ ${result.error}` };
    }
  } catch (error) {
    console.error('模拟失败:', error);
    message.value = { type: 'error', text: '❌ 模拟失败，请确保服务器正在运行' };
  } finally {
    isSimulating.value = false;
  }
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
</style>
