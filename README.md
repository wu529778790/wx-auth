# 微信订阅号认证系统 - Nuxt 4 极简版

> 🎯 **极简设计，无需数据库，开箱即用**

这是一个基于 **Nuxt 4** 的微信订阅号认证系统，**关注公众号自动发送验证码**，用户输入验证码完成认证。**完全使用内存存储，无需配置数据库**。

## ✨ 核心特性

- ✅ **零数据库** - 纯内存存储，部署更简单
- ✅ **自动发送** - 关注公众号立即收到验证码
- ✅ **单页面** - 无需额外页面，体验更流畅
- ✅ **自动清理** - 过期数据自动删除

## 📋 工作流程（正确流程）

```
用户访问网站
    ↓
显示引导页（二维码 + 输入框）
    ↓
用户扫码关注公众号
    ↓
公众号自动发送6位验证码
    ↓
用户在网站输入验证码
    ↓
验证成功 → 完成登录
```

**流程说明：**
1. 用户访问网站，看到引导页面
2. 扫码关注公众号
3. **公众号自动发送验证码**（如：`您的认证码：123456`）
4. 用户在网站输入 `123456`
5. 点击"验证"按钮，完成登录

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
# 网站地址（必须）
SITE_URL=https://your-website.com

# 服务器 Token（必须，与微信后台一致）
WECHAT_TOKEN=your-wechat-token

# Session密钥（必须，生产环境使用随机字符串）
SESSION_SECRET=openssl rand -hex 32

# 以下可选（未认证订阅号无需填写）
WECHAT_APPID=
WECHAT_APPSECRET=
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
| **EncodingAESKey** | 随机生成或留空 |
| **消息加解密方式** | 推荐 **明文模式** |

### 5. 测试完整流程

1. **访问网站** → 看到引导页面
2. **扫码关注** 你的公众号
3. **收到消息**：公众号自动发送验证码（如：`您的认证码：123456`）
4. **输入验证码**：在网站输入 `123456`
5. **点击验证**：完成登录

## 🏗️ 项目架构

### 目录结构

```
wechat-subscription-auth/
├── server/                      # 服务端代码
│   ├── api/                     # API 路由
│   │   ├── wechat/
│   │   │   └── message.ts      # 微信消息处理（关注时发验证码）
│   │   └── auth/
│   │       ├── check.ts        # 验证码检查
│   │       └── session.ts      # Session 管理
│   └── utils/                   # 工具函数
│       ├── storage.ts          # 内存存储
│       ├── wechat.ts           # 微信工具
│       └── session.ts          # Session 工具
├── pages/                       # 前端页面
│   └── index.vue               # 单页认证（输入验证码）
├── app.vue                     # 根组件
├── nuxt.config.ts              # Nuxt 配置
└── package.json                # 依赖
```

### 核心逻辑

#### 1. 微信消息处理 (`server/api/wechat/message.ts`)
```typescript
// 用户关注公众号时
if (MsgType === 'event' && Event === 'subscribe') {
  // 生成6位验证码
  const code = generateVerificationCode();

  // 保存验证码
  saveAuthCode(code, FromUserName);

  // 自动回复验证码
  return reply(`您的认证码：${code}`);
}
```

#### 2. 前端验证 (`pages/index.vue`)
```typescript
// 用户输入验证码
const verifyCode = async () => {
  const result = await $fetch('/api/auth/check', {
    query: { authToken: verificationCode.value }
  });

  if (result.authenticated) {
    // 登录成功
    session.value = result;
    // 保存cookie
    document.cookie = `wxauth-openid=${result.user.openid}; ...`;
  }
};
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
- ✅ 清晰的3步操作指引
- ✅ 大号验证码输入框
- ✅ 实时状态提示（成功/错误/等待）
- ✅ 验证按钮（带禁用状态）
- ✅ 重新获取验证码提示
- ✅ 响应式设计

## 🚀 部署指南

### Vercel（推荐 - 免费）

```bash
pnpm build
vercel --prod
```

部署时需要配置的环境变量：
- `SITE_URL`
- `WECHAT_TOKEN`
- `SESSION_SECRET`

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
   - `WECHAT_TOKEN` 保密

4. **验证码有效期**
   - 默认5分钟，可调整
   - 自动清理过期数据

## ⚠️ 注意事项

### 内存存储的限制

- **重启后数据丢失** - 适合开发和小型项目
- **单实例限制** - 多服务器部署需要共享存储
- **生产环境建议** - 如需持久化，可添加 Redis 或数据库

### 如何改为持久化存储？

只需修改 `server/utils/storage.ts`：

```typescript
// 使用 Redis
import redis from 'redis';

export async function saveAuthCode(code, openid) {
  await redis.setex(`auth:${code}`, 300, JSON.stringify({ openid }));
}
```

## 🐛 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 消息未回复 | 服务器URL不可访问 | 检查HTTPS、域名解析、防火墙 |
| 验证码无效 | Token过期 | 延长有效期或重新获取 |
| 验证失败 | Cookie问题 | 检查浏览器Cookie设置 |
| 部署失败 | 依赖问题 | 删除node_modules重新安装 |

## 📊 性能优化

- ✅ **轻量级**：无数据库依赖
- ✅ **快速响应**：内存存储，毫秒级查询
- ✅ **低资源消耗**：适合小型项目
- ✅ **自动清理**：避免内存泄漏

## 🎯 与旧版对比

| 特性 | 旧版 (自动轮询) | 新版 (正确流程) |
|------|----------------|----------------|
| **流程** | 访问→轮询→自动登录 | 访问→关注→收验证码→输入→登录 |
| **用户体验** | 需要等待 | 主动输入，更直观 |
| **服务器压力** | 每3秒轮询 | 只在验证时请求 |
| **代码复杂度** | 需要auth.vue | 单页完成 |
| **适合订阅号** | ❌ 需要AppSecret | ✅ 只需Token |

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
