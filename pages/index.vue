<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- 加载状态 -->
      <div v-if="loading" class="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-gray-700">正在检查认证状态...</h2>
      </div>

      <!-- 已登录 -->
      <div v-else-if="session?.authenticated" class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-6">
          <div class="text-5xl mb-2">✅</div>
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

      <!-- 未登录 - 认证流程 -->
      <div v-else class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-6">
          <div class="text-5xl mb-2">📱</div>
          <h2 class="text-2xl font-bold text-gray-800">完成认证</h2>
          <p class="text-gray-600 mt-2">关注公众号，获取验证码并输入</p>
        </div>

        <!-- 操作步骤 -->
        <div class="bg-blue-50 rounded-lg p-4 mb-6 space-y-3">
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span class="text-sm text-gray-700">扫码关注公众号</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span class="text-sm text-gray-700">公众号会自动发送6位验证码</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span class="text-sm text-gray-700">在下方输入验证码完成认证</span>
          </div>
        </div>

        <!-- 验证码输入区域 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            输入验证码
          </label>
          <div class="flex gap-2">
            <input
              v-model="verificationCode"
              placeholder="输入6位验证码"
              maxlength="6"
              @keyup.enter="verifyCode"
              class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-blue-500"
            />
            <button
              @click="verifyCode"
              :disabled="isVerifying || !verificationCode"
              class="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition whitespace-nowrap"
            >
              <span v-if="isVerifying">验证中...</span>
              <span v-else>验证</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2 text-center">验证码5分钟内有效</p>
        </div>

        <!-- 状态提示 -->
        <div
          v-if="message"
          :class="[
            'p-3 rounded-lg text-sm text-center mb-4 animate-fade-in',
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
      </div>

      <!-- 说明 -->
      <div class="mt-4 bg-white/90 backdrop-blur rounded-xl p-4 text-sm text-gray-700">
        <h3 class="font-semibold mb-2">💡 使用说明</h3>
        <ul class="list-disc list-inside space-y-1 opacity-80">
          <li>本系统通过微信订阅号进行用户认证</li>
          <li>关注公众号后会自动发送验证码</li>
          <li>在网站输入验证码即可完成认证</li>
        </ul>
      </div>

      <!-- 开发测试工具 -->
      <div class="mt-4 bg-white/90 backdrop-blur rounded-xl p-4 text-sm text-gray-700 border-2 border-yellow-400">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">🛠️ 开发测试工具</h3>
          <button
            @click="showTestTools = !showTestTools"
            class="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded transition"
          >
            {{ showTestTools ? '隐藏' : '显示' }}
          </button>
        </div>

        <div v-if="showTestTools" class="space-y-3 mt-3">
          <p class="text-xs text-gray-500 mb-2">未接入微信公众号时，可用此工具模拟测试</p>

          <div class="bg-gray-100 p-3 rounded-lg space-y-2">
            <div class="flex gap-2 items-center">
              <span class="text-xs font-semibold w-20">测试OpenID:</span>
              <input
                v-model="testOpenid"
                placeholder="oxxx_testuser"
                class="flex-1 px-2 py-1 text-xs border rounded"
              />
            </div>

            <button
              @click="simulateSubscribe"
              :disabled="isSimulating"
              class="w-full py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded font-semibold transition"
            >
              <span v-if="isSimulating">模拟中...</span>
              <span v-else>🎯 模拟关注公众号（生成验证码）</span>
            </button>

            <div v-if="generatedCode" class="bg-white p-3 rounded border border-yellow-300 text-center">
              <p class="text-xs text-gray-500 mb-1">生成的验证码：</p>
              <p class="text-2xl font-mono font-bold text-yellow-600">{{ generatedCode }}</p>
              <p class="text-xs text-gray-500 mt-1">已自动填入输入框，可直接点击验证</p>
            </div>
          </div>

          <div class="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            <p class="font-semibold mb-1">测试流程：</p>
            <ol class="list-decimal list-inside space-y-1 ml-2">
              <li>点击"模拟关注公众号"按钮</li>
              <li>验证码会自动显示并填入</li>
              <li>点击"验证"按钮完成登录</li>
            </ol>
          </div>
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
      message.value = { type: 'success', text: '✅ 认证成功！正在跳转...' };

      // 保存openid到cookie（30天有效期）
      if (result.user.openid) {
        document.cookie = `wxauth-openid=${result.user.openid}; max-age=${30 * 24 * 60 * 60}; path=/; sameSite=lax`;
      }

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
        text: `✅ 模拟成功！验证码已生成并填入，可直接点击验证`
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
.animate-fade-in {
  animation: fadeIn 0.3s ease;
}
</style>
