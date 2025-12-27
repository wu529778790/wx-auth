// Nuxt 4 配置 - 微信订阅号认证系统
export default defineNuxtConfig({
  // 兼容性设置
  compatibilityDate: '2024-12-27',

  // 开发工具
  devtools: { enabled: false },

  // 模块
  modules: [
    '@nuxtjs/tailwindcss'
  ],

  // 路由规则
  routeRules: {
    '/': { ssr: true },
    '/admin/**': { ssr: false },
    '/api/wechat/**': {
      ssr: false,
      cors: true,
      headers: {
        'content-type': 'application/xml'
      }
    },
    '/api/auth/**': { ssr: false, cors: true }
  },

  // 运行时配置
  runtimeConfig: {
    // 公开配置（客户端可用）
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      // 多公众号配置（支持多个订阅号）
      wechatAccounts: JSON.parse(process.env.WECHAT_ACCOUNTS || '[]')
    },
    // 私有配置（仅服务端可用）
    wechat: {
      // 默认公众号配置（向后兼容）
      appId: process.env.WECHAT_APPID,
      appSecret: process.env.WECHAT_APPSECRET,
      token: process.env.WECHAT_TOKEN,
      aesKey: process.env.WECHAT_AES_KEY || ''
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      cookieName: 'wxauth-session'
    },
    // 验证码配置
    code: {
      expiry: parseInt(process.env.CODE_EXPIRY || '300'), // 5分钟
      length: 6
    },
    // 轮询配置
    poll: {
      interval: parseInt(process.env.POLL_INTERVAL || '3000'), // 3秒
      timeout: parseInt(process.env.POLL_TIMEOUT || '300000') // 5分钟
    }
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

  // Tailwind CSS 配置
  tailwindcss: {
    config: {
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0fdf4',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d'
            }
          }
        }
      }
    }
  },

  // TypeScript 配置
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['@types/node']
      }
    }
  }
});
