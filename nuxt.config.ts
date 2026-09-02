// Nuxt 4 配置 - 微信订阅号认证系统
export default defineNuxtConfig({
  // 兼容性设置
  compatibilityDate: '2024-12-27',

  // 开发工具
  devtools: { enabled: false },

  // 全局 head：自动深浅色主题脚本（跟随系统，切换 <html> 的 dark class）
  app: {
    head: {
      script: [
        {
          // W3C 标准：跟随系统深浅色，自动给 <html> 添加/移除 dark class
          innerHTML: `(function () {
            var m = window.matchMedia('(prefers-color-scheme: dark)');
            function apply() {
              document.documentElement.classList.toggle('dark', m.matches);
            }
            apply();
            m.addEventListener('change', apply);
          })();`
        }
      ]
    }
  },

  // CSS
  css: ['~/assets/css/main.css'],

  // 模块
  modules: ['@nuxtjs/tailwindcss'],

  // 文件监视配置：忽略嵌套 node_modules，避免 EMFILE: too many open files
  watch: {
    ignore: [
      '**/wx-auth-sdk/node_modules/**',
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.git/**'
    ]
  },

  // 路由规则
  routeRules: {
    '/': { ssr: true },
    '/api/wechat/**': {
      ssr: false,
      headers: {
        'content-type': 'application/xml'
      }
    },
    '/api/auth/**': { ssr: false },
    '/api/sdk/**': { ssr: false }
  },

  // 运行时配置
  // Docker 运行时环境变量使用 NUXT_ 前缀自动映射，如 NUXT_WECHAT_TOKEN
  // 构建时环境变量直接使用原始名称，如 WECHAT_TOKEN
  runtimeConfig: {
    // 公开配置（客户端可用）
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'
    },
    // 私有配置（仅服务端可用）
    wechat: {
      // 微信后台配置
      token: process.env.NUXT_WECHAT_TOKEN || process.env.WECHAT_TOKEN || '',
      aesKey: process.env.NUXT_WECHAT_AES_KEY || process.env.WECHAT_AES_KEY || '',
      name: process.env.NUXT_WECHAT_NAME || process.env.WECHAT_NAME || '公众号',
      qrcodeUrl: process.env.NUXT_WECHAT_QRCODE_URL || process.env.WECHAT_QRCODE_URL || '',
      // "验证码"菜单的事件 key（需与微信公众平台后台配置的一致）
      menuKey: process.env.NUXT_WECHAT_MENU_KEY || process.env.WECHAT_MENU_KEY || 'GET_CODE'
    },
    session: {
      secret: process.env.NUXT_SESSION_SECRET || process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      cookieName: 'wxauth-session'
    },
    // 验证码配置
    code: {
      expiry: parseInt(process.env.NUXT_CODE_EXPIRY || process.env.CODE_EXPIRY || '300'), // 5分钟
      length: 6
    },
    // 轮询配置
    poll: {
      interval: parseInt(process.env.NUXT_POLL_INTERVAL || process.env.POLL_INTERVAL || '3000'), // 3秒
      timeout: parseInt(process.env.NUXT_POLL_TIMEOUT || process.env.POLL_TIMEOUT || '300000') // 5分钟
    },
    // 关键词配置（JSON格式，精确匹配默认["验证码"]；拼音/错别字/单字等模糊触发在代码内置，无需在此配置）
    keywords: JSON.parse(process.env.NUXT_KEYWORDS || process.env.KEYWORDS || JSON.stringify(['验证码']))
  },

  // Nitro 配置
  nitro: {
    // 开发服务器配置
    devServer: {
      https: false,
      port: 3000
    },
    // 预设（自动检测）
    preset: undefined
  },

  // TypeScript 配置
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['@types/node']
      }
    }
  },

  // Vite 配置
  vite: {
    server: {
      watch: {
        // 忽略嵌套 node_modules，避免 EMFILE: too many open files
        ignored: ['**/wx-auth-sdk/node_modules/**', '**/node_modules/**']
      }
    }
  }
});
