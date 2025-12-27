# 微信订阅号认证系统 - Nuxt 4 极简版

> 🎯 **极简设计，无需数据库，开箱即用**

这是一个基于 **Nuxt 4** 的微信订阅号认证系统，通过用户发送6位认证码完成网站认证。**完全使用内存存储，无需配置数据库**。

## ✨ 核心特性

- ✅ **零数据库** - 纯内存存储，部署更简单
- ✅ **无需轮询** - 用户主动点击验证，更省资源
- ✅ **Nuxt 4** - 最新框架，性能更优
- ✅ **TypeScript** - 类型安全，开发体验好
- ✅ **Tailwind CSS** - 现代化 UI
- ✅ **单页面** - 无需额外页面，体验更流畅
- ✅ **自动清理** - 过期数据自动删除

## 📋 工作流程（新版 - 更简单）

```
用户访问网站
    ↓
自动生成6位认证码 + 二维码
    ↓
用户扫码关注公众号
    ↓
发送认证码到公众号
    ↓
公众号验证并回复成功
    ↓
用户点击"我已关注"按钮
    ↓
完成认证，自动登录
```

**优势：**
- 无需等待，用户主动触发验证
- 无需复杂轮询，减少服务器压力
- 体验更直观，步骤更清晰

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 网站地址
SITE_URL=https://your-website.com

# 微信公众号配置
WECHAT_APPID=你的公众号AppID
WECHAT_APPSECRET=你的公众号AppSecret
WECHAT_TOKEN=你的服务器Token

# Session密钥（生产环境使用随机字符串）
SESSION_SECRET=随机生成的密钥

# 认证码有效期（秒，默认300秒）
CODE_EXPIRY=300
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 4. 配置微信公众号后台

登录微信公众号平台 → 开发 → 基本配置：

| 配置项 | 值 |
|--------|-----|
| **服务器URL** | `https://your-domain.com/api/wechat/message` |
| **Token** | 与 `.env` 中的 `WECHAT_TOKEN` 一致 |
| **消息加解密方式** | 推荐安全模式 |

### 5. 测试完整流程

1. 访问网站 → 显示6位认证码
2. 扫码关注公众号
3. 发送认证码到公众号
4. 公众号回复"认证成功"
5. 点击"我已关注，立即认证"按钮
6. 自动登录并跳转

## 🏗️ 项目架构

### 目录结构

```
wechat-subscription-auth/
├── server/                      # 服务端代码
│   ├── api/                     # API 路由
│   │   ├── wechat/
│   │   │   └── message.ts      # 微信消息处理（接收认证码）
│   │   └── auth/
│   │       ├── setup.ts        # 生成认证码
│   │       ├── check.ts        # 验证认证状态
│   │       └── session.ts      # Session 管理
│   └── utils/                   # 工具函数
│       ├── storage.ts          # 内存存储核心
│       ├── wechat.ts           # 微信工具
│       └── session.ts          # Session 工具
├── pages/                       # 前端页面
│   └── index.vue               # 单页认证界面
├── app.vue                     # 根组件
├── nuxt.config.ts              # Nuxt 配置
├── tailwind.config.ts          # Tailwind 配置
└── package.json                # 依赖
```

### 核心组件

#### 1. 内存存储 (`server/utils/storage.ts`)
```typescript
// 待验证代码：token -> {code, expiredAt}
const pendingCodes = new Map();

// 认证码：code -> {openid, expiredAt}
const authCodes = new Map();

// 已认证用户：openid -> {authenticatedAt, userInfo}
const authenticatedUsers = new Map();
```

#### 2. 前端认证页 (`pages/index.vue`)
```typescript
// 页面加载时
onMounted(() => {
  // 1. 检查是否已登录
  // 2. 检查是否有待验证的token
  // 3. 生成新的认证码和token
  // 4. 显示给用户
});

// 用户点击验证
const verifyAuth = async () => {
  // 1. 通过token检查认证状态
  // 2. 如果公众号已处理，完成登录
  // 3. 如果未处理，提示用户
};
```

#### 3. 微信消息处理 (`server/api/wechat/message.ts`)
```typescript
// 用户发送6位数字
if (/^\d{6}$/.test(content)) {
  // 1. 查找对应的token
  // 2. 转换为认证码
  // 3. 回复成功消息
}
```

## 🔧 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Nuxt** | 4.0+ | 服务端渲染框架 |
| **H3** | 1.13+ | HTTP 服务器 |
| **fast-xml-parser** | 4.4+ | XML 消息解析 |
| **Tailwind CSS** | 3.4+ | 样式框架 |
| **TypeScript** | 5.2+ | 类型安全 |

## 🎨 UI 特性

### 主页 (`pages/index.vue`)
- ✅ 渐变背景
- ✅ **大号认证码显示** - 清晰醒目
- ✅ 详细操作步骤
- ✅ 状态提示（成功/错误/等待）
- ✅ 一键验证按钮
- ✅ 刷新认证码功能
- ✅ 响应式设计

## 🚀 部署指南

### Vercel（推荐 - 免费）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 构建项目
pnpm build

# 3. 部署
vercel --prod
```

部署时需要配置的环境变量：
- `SITE_URL`
- `WECHAT_APPID`
- `WECHAT_APPSECRET`
- `WECHAT_TOKEN`
- `SESSION_SECRET`

### Netlify（免费）

```bash
pnpm build
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "preview"]
```

## 🔒 安全建议

1. **使用强随机 Session 密钥**
   ```bash
   openssl rand -hex 32
   ```

2. **启用 HTTPS**（微信强制要求）

3. **保护敏感信息**
   - 不要提交 `.env` 文件
   - `WECHAT_APPSECRET` 严格保密

4. **验证码有效期**
   - 默认5分钟，可调整
   - 自动清理过期数据

## ⚠️ 注意事项

### 内存存储的限制

- **重启后数据丢失** - 适合开发和小型项目
- **单实例限制** - 多服务器部署需要共享存储
- **生产环境建议** - 如需持久化，可添加 Redis 或数据库

### 如何改为持久化存储？

如果需要持久化，只需修改 `server/utils/storage.ts`：

```typescript
// 改为使用 Redis 或数据库
import redis from './redis';

export async function savePendingCode(token, code) {
  await redis.setex(`pending:${token}`, 300, JSON.stringify({ code }));
}

export async function saveAuthCode(code, openid) {
  await redis.setex(`auth:${code}`, 300, JSON.stringify({ openid }));
}
```

## 🐛 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 消息未回复 | 服务器URL不可访问 | 检查HTTPS、域名解析、防火墙 |
| 认证码无效 | Token过期 | 延长有效期或刷新页面 |
| 验证失败 | Cookie问题 | 检查浏览器Cookie设置 |
| 部署失败 | 依赖问题 | 删除node_modules重新安装 |

## 📊 性能优化

- ✅ **轻量级**：无数据库依赖
- ✅ **快速响应**：内存存储，毫秒级查询
- ✅ **低资源消耗**：适合小型项目
- ✅ **自动清理**：避免内存泄漏

## 🎯 与旧版对比

| 特性 | 旧版 (自动轮询) | 新版 (主动验证) |
|------|----------------|----------------|
| **流程** | 访问→轮询→自动登录 | 访问→显示码→发送→点击验证 |
| **用户体验** | 需要等待 | 主动控制，更直观 |
| **服务器压力** | 每3秒轮询 | 只在点击时检查 |
| **代码复杂度** | 需要auth.vue | 单页完成 |
| **页面数量** | 2页 (index + auth) | 1页 |
| **自动检测** | ✅ 自动 | ❌ 需点击按钮 |

## 📄 许可证

MIT License - 你可以自由使用、修改和分发此代码。

## 💬 问题反馈

如有问题或建议：
1. 检查环境变量配置
2. 查看控制台日志
3. 确认微信公众号后台配置
4. 查看 Nuxt 官方文档

---

**立即开始：**

```bash
pnpm install
cp .env.example .env
pnpm dev
```

祝你使用愉快！🎉
