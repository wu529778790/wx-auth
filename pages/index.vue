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

      <!-- 认证流程 -->
      <div v-else class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-6">
          <div class="text-5xl mb-2">🔐</div>
          <h2 class="text-2xl font-bold text-gray-800">完成认证</h2>
          <p class="text-gray-600 mt-2">请关注公众号并发送下方认证码</p>
        </div>

        <!-- 验证码显示 -->
        <div v-if="verificationCode" class="bg-blue-50 rounded-xl p-6 mb-6 text-center border-2 border-blue-200">
          <p class="text-sm text-gray-600 mb-2">您的认证码是</p>
          <div class="text-4xl font-mono font-bold text-blue-600 tracking-widest mb-2">
            {{ verificationCode }}
          </div>
          <p class="text-xs text-gray-500">5分钟内有效</p>
        </div>

        <!-- 操作步骤 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span class="text-sm text-gray-700">扫码关注公众号</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span class="text-sm text-gray-700">发送认证码 <span class="font-semibold">{{ verificationCode }}</span></span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span class="text-sm text-gray-700">点击下方按钮完成认证</span>
          </div>
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
          @click="verifyAuth"
          :disabled="isVerifying"
          class="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition shadow-lg mb-3"
        >
          <span v-if="isVerifying">🔍 检查中...</span>
          <span v-else>✅ 我已关注，立即认证</span>
        </button>

        <button
          @click="() => { clearToken(); location.reload(); }"
          class="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-sm"
        >
          刷新认证码
        </button>
      </div>

      <!-- 说明 -->
      <div class="mt-4 bg-white/90 backdrop-blur rounded-xl p-4 text-sm text-gray-700">
        <h3 class="font-semibold mb-2">💡 使用说明</h3>
        <ul class="list-disc list-inside space-y-1 opacity-80">
          <li>本系统通过微信订阅号进行用户认证</li>
          <li>访问时会自动生成6位认证码</li>
          <li>关注公众号后发送认证码即可完成认证</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const session = ref<any>(null);
const loading = ref(true);
const verificationCode = ref<string | null>(null);
const pendingToken = ref<string | null>(null);
const isVerifying = ref(false);
const message = ref<{ type: string; text: string } | null>(null);

// 生成6位随机验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 检查是否有保存的token（保持页面刷新后的状态）
function getSavedToken(): string | null {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('wxauth-token='));
  if (cookie) {
    return cookie.split('=')[1];
  }
  return null;
}

// 保存token到cookie
function saveToken(token: string) {
  document.cookie = `wxauth-token=${token}; max-age=${300}; path=/; sameSite=lax`;
}

// 清除token
function clearToken() {
  document.cookie = 'wxauth-token=; Max-Age=0; path=/';
}

onMounted(async () => {
  try {
    // 优先检查 session
    const sessionResult = await $fetch('/api/auth/session');
    if (sessionResult.authenticated) {
      session.value = sessionResult;
      loading.value = false;
      return;
    }

    // 检查 cookie 中的 openid
    const cookie = document.cookie.split('; ').find(row => row.startsWith('wxauth-openid='));
    if (cookie) {
      const openid = cookie.split('=')[1];
      const result = await $fetch('/api/auth/check', { query: { openid } });
      if (result.authenticated) {
        session.value = result;
        loading.value = false;
        return;
      }
    }

    // 检查是否有已保存的token
    const savedToken = getSavedToken();
    if (savedToken) {
      // 验证token是否仍然有效
      const result = await $fetch('/api/auth/check', { query: { token: savedToken } });
      if (result.pendingCode) {
        pendingToken.value = savedToken;
        verificationCode.value = result.pendingCode;
        loading.value = false;
        return;
      }
    }

    // 生成新的验证代码
    const newCode = generateCode();
    const newToken = crypto.randomUUID();

    // 保存到后端
    await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { token: newToken, code: newCode }
    });

    // 保存token到cookie
    saveToken(newToken);

    pendingToken.value = newToken;
    verificationCode.value = newCode;
  } catch (error) {
    console.error('Initialization error:', error);
    message.value = { type: 'error', text: '初始化失败，请刷新页面重试' };
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
    clearToken();
    location.reload();
  }
};

// 验证认证状态
const verifyAuth = async () => {
  if (!pendingToken.value) {
    message.value = { type: 'error', text: '请先生成认证码' };
    return;
  }

  isVerifying.value = true;
  message.value = null;

  try {
    const result = await $fetch('/api/auth/check', {
      query: { token: pendingToken.value }
    });

    if (result.authenticated) {
      // 认证成功
      session.value = result;
      clearToken();
      message.value = { type: 'success', text: '✅ 认证成功！' };

      // 保存openid到cookie
      if (result.user.openid) {
        document.cookie = `wxauth-openid=${result.user.openid}; max-age=${30 * 24 * 60 * 60}; path=/; sameSite=lax`;
      }

      setTimeout(() => {
        location.reload();
      }, 1000);
    } else if (result.pendingCode) {
      // 仍在等待
      message.value = { type: 'info', text: '⏳ 还未检测到认证，请关注公众号并发送认证码' };
    } else {
      // 验证码已过期或无效
      message.value = { type: 'error', text: '❌ 认证码已过期，请刷新页面重新生成' };
      clearToken();
      setTimeout(() => location.reload(), 1500);
    }
  } catch (error) {
    console.error('Verify error:', error);
    message.value = { type: 'error', text: '验证失败，请重试' };
  } finally {
    isVerifying.value = false;
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
