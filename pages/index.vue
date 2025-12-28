<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <!-- 已认证状态 -->
    <div v-if="session?.authenticated" class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in border border-gray-200">
      <div class="text-5xl mb-3">✅</div>
      <h2 class="text-xl font-bold text-gray-800 mb-1">认证成功</h2>
      <p class="text-gray-500 mb-6 text-sm">欢迎访问</p>
      <button @click="logout" class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
        退出
      </button>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
      <div class="w-10 h-10 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-600">加载中...</p>
    </div>

    <!-- 认证弹窗 -->
    <div v-else class="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 animate-fade-in">

      <!-- 标题栏 -->
      <div class="bg-gray-50 px-6 py-3 border-b border-gray-200 rounded-t-xl text-center">
        <h2 class="text-lg font-bold text-gray-800">微信认证</h2>
      </div>

      <!-- 内容区域 -->
      <div class="p-6 space-y-4">

        <!-- 二维码 -->
        <div class="text-center">
          <div class="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center mb-2 border border-gray-200">
            <img v-if="qrcodeUrl" :src="qrcodeUrl" alt="扫码关注" class="w-full h-full object-contain p-2" />
            <div v-else class="text-gray-400 text-sm">📷<br/>二维码</div>
          </div>
          <p class="text-sm text-gray-600">
            微信扫码关注 <span class="font-mono text-green-600 font-semibold">"{{ wechatName }}"</span>
          </p>
        </div>

        <!-- 步骤说明 - 简化版 -->
        <div class="bg-gray-50 rounded-lg p-3 space-y-2">
          <div class="flex items-start gap-2 text-sm">
            <span class="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">1</span>
            <span class="text-gray-700">扫码关注公众号</span>
          </div>
          <div class="flex items-start gap-2 text-sm">
            <span class="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">2</span>
            <span class="text-gray-700">发送"验证码"获取数字</span>
          </div>
          <div class="flex items-start gap-2 text-sm">
            <span class="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">3</span>
            <span class="text-gray-700">输入完成认证</span>
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="space-y-3">
          <!-- 6位验证码输入格子 -->
          <div class="flex gap-2 justify-center">
            <input
              v-for="i in 6"
              :key="i"
              :ref="el => { if (el) inputRefs[i-1] = el }"
              v-model="codeInputs[i-1]"
              maxlength="1"
              @input="(e) => handleInput(e, i-1)"
              @keydown="(e) => handleKeydown(e, i-1)"
              @keyup.enter="verifyCode"
              @paste="handlePaste"
              class="w-11 h-14 sm:w-12 sm:h-16 bg-white border-2 border-gray-300 rounded-lg text-center text-2xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
              :class="{'border-green-500': codeInputs[i-1]}"
            />
          </div>

          <!-- 验证按钮 -->
          <button
            @click="verifyCode"
            :disabled="isVerifying || !isCodeComplete"
            class="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-sm text-base"
          >
            {{ isVerifying ? '验证中...' : '验证' }}
          </button>

          <!-- 消息提示 -->
          <div v-if="message" :class="[
            'p-2 rounded-lg text-sm text-center border',
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-green-50 text-green-700 border-green-200'
          ]">
            {{ message.text }}
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
const codeInputs = ref<string[]>(['', '', '', '', '', '']);
const inputRefs = ref<any[]>([]);
const isVerifying = ref(false);
const message = ref<{ type: string; text: string } | null>(null);

const config = useRuntimeConfig();
const wechatName = ref(config.public.wechatName || '我的公众号');
const qrcodeUrl = ref(config.public.wechatQrcodeUrl || '');

// 计算属性：验证码是否完整
const isCodeComplete = computed(() => {
  return codeInputs.value.every(code => code !== '') && codeInputs.value.join('').length === 6;
});

// 处理输入
const handleInput = (e: Event, index: number) => {
  const value = (e.target as HTMLInputElement).value;

  // 只允许数字
  if (!/^\d*$/.test(value)) {
    codeInputs.value[index] = '';
    return;
  }

  // 如果输入了内容，自动聚焦到下一个输入框
  if (value && index < 5) {
    setTimeout(() => {
      inputRefs.value[index + 1]?.focus();
    }, 10);
  }

  // 更新完整验证码
  verificationCode.value = codeInputs.value.join('');

  // 如果输入了最后一个数字且验证码完整，自动验证
  if (index === 5 && value && isCodeComplete.value) {
    setTimeout(() => {
      verifyCode();
    }, 300); // 延迟300ms，给用户一个短暂的确认时间
  }
};

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (!codeInputs.value[index] && index > 0) {
      // 当前为空，删除前一个
      codeInputs.value[index - 1] = '';
      setTimeout(() => {
        inputRefs.value[index - 1]?.focus();
      }, 10);
    } else if (codeInputs.value[index]) {
      // 清空当前
      codeInputs.value[index] = '';
    }
  } else if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault();
    inputRefs.value[index - 1]?.focus();
  } else if (e.key === 'ArrowRight' && index < 5) {
    e.preventDefault();
    inputRefs.value[index + 1]?.focus();
  }
};

// 处理粘贴
const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault();
  const pasteData = e.clipboardData?.getData('text').replace(/\D/g, '');
  if (pasteData) {
    const chars = pasteData.split('').slice(0, 6);
    chars.forEach((char, index) => {
      if (index < 6) {
        codeInputs.value[index] = char;
      }
    });
    verificationCode.value = codeInputs.value.join('');

    // 聚焦到最后一个有内容的输入框或第一个空的输入框
    const lastIndex = Math.min(chars.length - 1, 5);
    setTimeout(() => {
      inputRefs.value[lastIndex]?.focus();
    }, 10);

    // 如果粘贴的内容正好是6位数字，自动验证
    if (chars.length === 6) {
      setTimeout(() => {
        verifyCode();
      }, 500); // 延迟500ms，给用户一个确认时间
    }
  }
};

// 监听verificationCode变化，同步到codeInputs（用于外部设置）
watch(verificationCode, (newVal) => {
  if (newVal.length === 6) {
    const chars = newVal.split('');
    codeInputs.value = [...chars, ...Array(6 - chars.length).fill('')];
  }
});

// 监听session变化，当退出登录时自动聚焦
watch(session, (newSession) => {
  if (!newSession?.authenticated) {
    setTimeout(() => {
      if (inputRefs.value[0]) {
        inputRefs.value[0].focus();
      }
    }, 100);
  }
});

// 检查cookie中的openid
function getSavedOpenid(): string | null {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('wxauth-openid='));
  return cookie ? cookie.split('=')[1] : null;
}

onMounted(async () => {
  try {
    const sessionResult = await $fetch('/api/auth/session');
    if (sessionResult.authenticated) {
      session.value = sessionResult;
    } else {
      const savedOpenid = getSavedOpenid();
      if (savedOpenid) {
        const result = await $fetch('/api/auth/check', { query: { openid: savedOpenid } });
        if (result.authenticated) session.value = result;
      }
    }
  } catch (error) {
    console.error('Init error:', error);
  } finally {
    loading.value = false;
    // 页面加载完成后，自动聚焦到第一个输入框
    setTimeout(() => {
      if (!session.value?.authenticated && inputRefs.value[0]) {
        inputRefs.value[0].focus();
      }
    }, 100);
  }
});

const logout = async () => {
  if (confirm('确定退出吗？')) {
    await $fetch('/api/auth/session', { method: 'DELETE' });
    document.cookie = 'wxauth-openid=; Max-Age=0; path=/';
    location.reload();
  }
};

const verifyCode = async () => {
  const code = codeInputs.value.join('');

  if (!code || code.length !== 6) {
    message.value = { type: 'error', text: '请输入6位验证码' };
    return;
  }

  isVerifying.value = true;
  message.value = null;

  try {
    const result = await $fetch('/api/auth/check', { query: { authToken: code } });

    if (result.authenticated) {
      session.value = result;
      message.value = { type: 'success', text: '✅ 认证成功！' };

      if (result.user.openid) {
        document.cookie = `wxauth-openid=${result.user.openid}; max-age=${30 * 24 * 60 * 60}; path=/`;
      }

      await $fetch('/api/auth/session', { method: 'POST', body: { user: result.user } });
      setTimeout(() => location.reload(), 1000);
    } else {
      message.value = { type: 'error', text: result.error === 'invalid_or_expired' ? '验证码已过期' : '验证码错误' };
      // 清空所有输入框
      codeInputs.value = ['', '', '', '', '', ''];
      verificationCode.value = '';
      // 聚焦到第一个输入框
      setTimeout(() => {
        if (inputRefs.value[0]) {
          inputRefs.value[0].focus();
        }
      }, 100);
    }
  } catch (error) {
    message.value = { type: 'error', text: '验证失败，请重试' };
  } finally {
    isVerifying.value = false;
  }
};

</script>

<style scoped>
input:focus {
  border-color: #3b82f6;
}
</style>
