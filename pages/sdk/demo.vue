<template>
  <div class="sdk-demo-page">
    <div class="container">
      <h1 class="title">🔐 微信订阅号认证 SDK 演示</h1>
      <p class="subtitle">极简设计，仅需配置 API 地址即可使用</p>

      <div class="config-card">
        <div class="form-group">
          <label>API 地址（必填）</label>
          <input
            v-model="apiBase"
            type="text"
            placeholder="例如: http://localhost:3000 或 https://your-api.com"
          />
        </div>

        <div class="form-group">
          <label>公众号名称（可选）</label>
          <input
            v-model="wechatName"
            type="text"
            placeholder="例如: 我的公众号"
          />
        </div>

        <div class="form-group">
          <label>二维码 URL（可选）</label>
          <input
            v-model="qrcodeUrl"
            type="text"
            placeholder="例如: https://your-site.com/qrcode.jpg"
          />
        </div>

        <div class="actions">
          <button class="btn btn-primary" @click="initAndAuth" :disabled="loading">
            {{ loading ? '验证中...' : '初始化并开始验证' }}
          </button>
          <button class="btn btn-secondary" @click="checkCookie">
            检查 Cookie
          </button>
        </div>
      </div>

      <div v-if="status.message" :class="['status', status.type]">
        {{ status.message }}
      </div>

      <div class="features-card">
        <h3>SDK 特性</h3>
        <ul>
          <li>✅ 仅需配置 <code>apiBase</code> 参数</li>
          <li>✅ 总大小 < 12KB (JS 7.4KB + CSS 3.5KB)</li>
          <li>✅ 复用现有后端 API，无需改动</li>
          <li>✅ 微信原生风格弹窗</li>
          <li>✅ 支持自动聚焦、粘贴、键盘导航</li>
          <li>✅ Cookie 自动持久化认证状态</li>
        </ul>
      </div>

      <div class="features-card">
        <h3>使用说明</h3>
        <ul>
          <li>1. 配置 API 地址（本地开发: <code>http://localhost:3000</code>）</li>
          <li>2. 点击"初始化并开始验证"</li>
          <li>3. 扫码关注公众号，获取验证码</li>
          <li>4. 在弹窗中输入验证码完成验证</li>
        </ul>
      </div>

      <div class="features-card">
        <h3>代码示例</h3>
        <pre><code>// 1. 安装
npm install @wu529778790/wechat-auth-sdk

// 2. 引入
import WxAuth from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/index.css';

// 3. 初始化
WxAuth.init({
  apiBase: 'https://your-api.com',
  onVerified: (user) => {
    console.log('验证通过', user);
  }
});

// 4. 使用
await WxAuth.requireAuth();</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 注意：这里使用的是浏览器全局变量方式
// 实际项目中应该使用 import 方式
// import WxAuth from '@wu529778790/wechat-auth-sdk';

const apiBase = ref('http://localhost:3000');
const wechatName = ref('我的公众号');
const qrcodeUrl = ref('');
const loading = ref(false);
const status = ref({ message: '', type: 'info' });

const showStatus = (message, type = 'info') => {
  status.value = { message, type };
  setTimeout(() => {
    if (status.value.message === message) {
      status.value.message = '';
    }
  }, 5000);
};

const initAndAuth = async () => {
  if (!apiBase.value.trim()) {
    showStatus('请输入 API 地址', 'error');
    return;
  }

  loading.value = true;
  status.value.message = '';

  try {
    // 检查 WxAuth 是否可用
    if (typeof window === 'undefined' || !window.WxAuth) {
      // 动态加载 SDK
      await loadSDK();
    }

    const config = {
      apiBase: apiBase.value.trim(),
      onVerified: (user) => {
        showStatus(`✅ 验证成功！欢迎 ${user.nickname || '会员'}`, 'success');
        loading.value = false;
        console.log('用户信息:', user);
      },
      onError: (error) => {
        showStatus(`❌ 验证失败: ${error}`, 'error');
        loading.value = false;
      }
    };

    if (wechatName.value.trim()) config.wechatName = wechatName.value.trim();
    if (qrcodeUrl.value.trim()) config.qrcodeUrl = qrcodeUrl.value.trim();

    window.WxAuth.init(config);
    showStatus('SDK 初始化成功，正在启动验证...', 'info');

    const authenticated = await window.WxAuth.requireAuth();
    if (!authenticated) {
      showStatus('验证被取消', 'info');
      loading.value = false;
    }
  } catch (error) {
    showStatus(`出错: ${error.message}`, 'error');
    loading.value = false;
  }
};

const checkCookie = () => {
  const cookie = document.cookie;
  const wxCookie = cookie.split('; ').find(row => row.startsWith('wxauth-openid='));

  if (wxCookie) {
    const openid = wxCookie.split('=')[1];
    showStatus(`✅ 找到认证 Cookie: ${wxCookie}`, 'success');
  } else {
    showStatus('❌ 未找到认证 Cookie (wxauth-openid)', 'error');
  }
};

const loadSDK = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.WxAuth) {
      resolve();
      return;
    }

    // 从 CDN 加载 SDK（用于演示）
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.css';
      document.head.appendChild(link);
      resolve();
    };
    script.onerror = () => {
      // 如果 CDN 失败，提示用户本地安装
      reject(new Error('无法加载 SDK。请先安装: npm install @wu529778790/wechat-auth-sdk'));
    };
    document.body.appendChild(script);
  });
};

onMounted(() => {
  console.log('SDK 演示页面已加载');
});
</script>

<style scoped>
.sdk-demo-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  padding: 40px 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.title {
  color: #07C160;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
}

.subtitle {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
  text-align: center;
}

.config-card,
.features-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #DCDCDC;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #07C160;
  box-shadow: 0 0 0 3px rgba(7, 193, 96, 0.1);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #07C160;
  color: white;
}

.btn-primary:not(:disabled):hover {
  background: #06AD56;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #F2F2F2;
  color: #333;
}

.btn-secondary:hover {
  background: #E5E5E5;
  transform: translateY(-1px);
}

.status {
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.status.success {
  background: #F0FDF4;
  color: #07C160;
  border: 1px solid #07C160;
}

.status.error {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #DC2626;
}

.status.info {
  background: #E8F4FF;
  color: #0066CC;
  border: 1px solid #B3D9FF;
}

.features-card h3 {
  margin-bottom: 16px;
  color: #333;
  font-size: 18px;
}

.features-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-card li {
  padding: 10px 0;
  color: #666;
  line-height: 1.6;
}

.features-card code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #07C160;
  font-weight: 600;
}

.features-card pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.5;
}

.features-card pre code {
  background: none;
  padding: 0;
  color: #333;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .sdk-demo-page {
    padding: 20px 12px;
  }

  .title {
    font-size: 24px;
  }

  .config-card,
  .features-card {
    padding: 16px;
  }

  .actions {
    flex-direction: column;
  }
}
</style>