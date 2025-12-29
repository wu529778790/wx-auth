# 微信订阅号认证系统 🎫

[![Nuxt](https://img.shields.io/badge/Nuxt-4.2.2-00DC82?logo=nuxt.js)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🎯 **极简设计，开箱即用** - 基于 Nuxt 4 的微信订阅号认证系统

用户关注公众号后获取验证码，输入即可完成认证。支持明文模式和安全模式（加密消息）。

**项目特性**：
- ✅ **极简配置** - 3步即可启动
- ✅ **安全可靠** - AES-256-GCM 加密 Session
- ✅ **用户体验** - 自动聚焦、粘贴支持、键盘导航
- ✅ **灵活存储** - JSON 文件 / SQLite 双支持
- ✅ **轻量 SDK** - 提供 < 12KB 的嵌入式 SDK

---

## 🆕 新增：极简 SDK

现在提供**极简版 SDK**，可在任何网站中嵌入微信订阅号验证：

```javascript
// 仅需 3 行代码
WxAuth.init({ apiBase: 'https://your-api.com' });
await WxAuth.requireAuth();
```

**特点**：
- 📦 总计 < 12KB（JS 7.4KB + CSS 3.5KB）
- ⚡ 仅需配置 `apiBase` 参数
- 🔧 无需后端任何改动
- 🎨 微信原生风格弹窗
- 📦 支持 NPM / CDN / 浏览器直接引入

**使用方式**：

1. **NPM 安装（推荐）**：
```bash
npm install @wu529778790/wechat-auth-sdk
```

```javascript
import WxAuth from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/index.css';

WxAuth.init({ apiBase: 'https://your-api.com' });
await WxAuth.requireAuth();
```

2. **CDN 引入**：
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.css">
<script src="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.js"></script>
```

**在线演示**：访问 `http://localhost:3000/sdk/demo`

**独立 SDK 仓库**：[wu529778790/wechat-auth-sdk](https://github.com/wu529778790/wechat-auth-sdk)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# 必须配置
SITE_URL=https://your-site.com
WECHAT_TOKEN=your-wechat-token
WECHAT_NAME=我的公众号
SESSION_SECRET=your-random-secret

# 可选配置
WECHAT_QRCODE_URL=https://your-site.com/qrcode.jpg
CODE_EXPIRY=300
KEYWORDS=["验证码"]
```

**生成安全的 Session 密钥**：
```bash
openssl rand -hex 32
```

### 3. 启动开发服务

```bash
pnpm dev
```

访问：http://localhost:3000

---

## 📋 工作流程

```
用户访问网站
    ↓
检查 Cookie/Session
    ↓
已认证？→ 直接访问内容
    ↓
未认证？→ 显示认证界面
    ├─ 显示公众号二维码
    ├─ 6位验证码输入框
    └─ 自动聚焦、支持粘贴
    ↓
用户微信扫码关注公众号
    ↓
公众号自动回复验证码
    ↓
用户输入验证码
    ↓
验证成功 → 保存认证状态
    ↓
✅ 认证完成，访问内容
```

---

## ⚙️ 微信后台配置

登录公众号平台 → 开发 → 基本配置：

| 配置项 | 值 |
|--------|-----|
| **服务器URL** | `https://your-site.com/api/wechat/message` |
| **Token** | 与 `.env` 中的 `WECHAT_TOKEN` 一致 |
| **消息模式** | **明文模式** 或 **安全模式** |

**安全模式支持**：
- 需要配置 `WECHAT_AES_KEY`
- 系统自动识别并处理加密消息

---

## 📁 项目结构

```
wechat-subscription-auth/
├── server/                     # 后端服务
│   ├── api/
│   │   ├── wechat/
│   │   │   └── message.ts      # 微信消息处理
│   │   └── auth/
│   │       ├── check.ts        # 验证码验证
│   │       └── session.ts      # Session 管理
│   └── utils/
│       ├── wechat.ts           # 微信工具
│       ├── storage.ts          # 存储层
│       └── session.ts          # Session 工具
├── pages/
│   ├── index.vue               # 认证页面
│   └── sdk/
│       └── demo.vue            # SDK 演示页面（访问 /sdk/demo）
├── sdk/                        # SDK 说明文档
│   ├── README.md               # SDK 使用说明
│   └── QUICKSTART-SIMPLE.md    # 快速开始指南
├── data/
│   └── auth-data.json          # 数据存储
├── nuxt.config.ts
├── package.json
└── .env                        # 环境变量
```

**SDK 独立仓库**：`@wu529778790/wechat-auth-sdk` - [GitHub](https://github.com/wu529778790/wechat-auth-sdk) | [NPM](https://www.npmjs.com/package/@wu529778790/wechat-auth-sdk)

---

## 🔧 核心功能

### 1. 微信消息处理
```typescript
// server/api/wechat/message.ts
支持明文模式和安全模式（加密消息）
用户关注 → 生成6位验证码 → 保存 → 自动回复
支持关键词触发重新发送验证码
```

### 2. 验证码验证
```typescript
// server/api/auth/check.ts
GET /api/auth/check?authToken=123456
GET /api/auth/check?openid=oxxx

验证成功后自动标记用户为已认证
删除已使用的验证码
```

### 3. Session 管理
```typescript
// server/api/auth/session.ts
POST /api/auth/session    # 创建 Session
GET /api/auth/session     # 获取 Session
DELETE /api/auth/session  # 清除 Session

使用 AES-256-GCM 加密，存储在 HttpOnly Cookie 中
```

### 4. 持久化存储
- **验证码**：5分钟过期，自动清理
- **已认证用户**：永久保存（Cookie + 存储）
- **存储方式**：
  - 默认：JSON 文件（无需配置）
  - 可选：SQLite（设置 `STORAGE_TYPE=sqlite`）

---

## 🎨 界面预览

```
┌─────────────────────────────────┐
│        微信认证                  │
├─────────────────────────────────┤
│                                 │
│        📷 二维码                 │
│   微信扫码关注 "我的公众号"       │
│                                 │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐      │
│  │1│ │2│ │3│ │4│ │5│ │6│      │
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘      │
│                                 │
│  [ 验证 ]                       │
│                                 │
│  在公众号发送"验证码"获取         │
└─────────────────────────────────┘
```

**交互特性**：
- ✅ 自动聚焦第一个输入框
- ✅ 输入后自动跳转下一个
- ✅ 支持粘贴6位数字
- ✅ 键盘导航（退格、方向键）
- ✅ 输入完成自动验证
- ✅ 微信绿色主题设计

---

## 🚀 部署指南

### Vercel（推荐）

```bash
# 1. 构建项目
pnpm build

# 2. 部署到 Vercel
vercel --prod

# 或使用 Vercel CLI
vercel
```

**Vercel 环境变量配置**：
在 Vercel 项目设置中添加 `.env` 中的变量。

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "preview"]
```

构建和运行：
```bash
docker build -t wechat-auth .
docker run -d -p 3000:3000 \
  -e SITE_URL=https://your-site.com \
  -e WECHAT_TOKEN=your-token \
  -e WECHAT_NAME=我的公众号 \
  -e SESSION_SECRET=your-secret \
  wechat-auth
```

### 传统服务器

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 启动服务
pnpm preview

# 或使用 PM2
npm install -g pm2
pm2 start .output/server/index.mjs --name wechat-auth
```

---

## 📝 环境变量说明

### 必须配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SITE_URL` | 网站地址，用于微信回调 | `https://auth.example.com` |
| `WECHAT_TOKEN` | 微信后台配置的 Token | `your-wechat-token-123` |
| `WECHAT_NAME` | 公众号名称（前端显示） | `我的公众号` |
| `SESSION_SECRET` | Session 加密密钥 | `openssl rand -hex 32` 生成 |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WECHAT_QRCODE_URL` | 二维码图片 URL | 空（显示占位图） |
| `WECHAT_AES_KEY` | 微信安全模式 EncodingAESKey | 空（明文模式） |
| `CODE_EXPIRY` | 验证码有效期（秒） | `300` (5分钟) |
| `POLL_INTERVAL` | 前端轮询间隔（毫秒） | `3000` (3秒) |
| `POLL_TIMEOUT` | 前端轮询超时（毫秒） | `300000` (5分钟) |
| `KEYWORDS` | 触发关键词（JSON 数组） | `["验证码"]` |
| `STORAGE_TYPE` | 存储类型：`file` 或 `sqlite` | `file` |

---

## 💡 使用提示

### 未认证订阅号（手动模式）
用户关注后，在微信发送任意消息（如 `1` 或 `验证码`），公众号会回复6位验证码。

### 认证服务号（自动模式）
用户关注后，公众号自动发送验证码（需要配置服务器）。

### 支持的触发关键词
`验证码`、`验证`、`1`、`已关注`、`认证`、`login`、`已订阅`、`关注了`

### 存储方式切换

**JSON 文件（默认）**：
```bash
pnpm dev
```

**SQLite（生产推荐）**：
```bash
STORAGE_TYPE=sqlite pnpm dev
```

---

## 🔒 安全建议

1. **强制 HTTPS**
   - 微信公众号要求回调地址必须是 HTTPS
   - 生产环境必须配置 SSL 证书

2. **强随机 Session 密钥**
   ```bash
   openssl rand -hex 32
   ```

3. **保护环境变量**
   - `.env` 文件不要提交到 Git
   - 使用 `.env.example` 作为模板

4. **验证码安全**
   - 5分钟过期
   - 一次性使用（验证后删除）
   - 6位数字（100万种组合）

5. **Cookie 安全**
   - HttpOnly：防止 XSS
   - SameSite=Lax：防止 CSRF
   - 生产环境强制 Secure 标志

---

## 🐛 常见问题

### Q: 消息没有回复？
**A**: 检查以下几点：
1. 服务器 URL 是否可访问
2. HTTPS 配置是否正确
3. Token 是否一致
4. 微信后台是否配置正确

### Q: 验证失败？
**A**: 可能原因：
1. 验证码已过期（5分钟）
2. 输入错误
3. Cookie 被浏览器阻止
4. 网络问题导致请求失败

### Q: 如何切换存储方式？
**A**:
- 默认：JSON 文件（无需配置）
- SQLite：`STORAGE_TYPE=sqlite pnpm dev`

### Q: 支持多个公众号吗？
**A**: 支持！在环境变量中配置：
```env
WECHAT_ACCOUNTS=[{"name":"公众号A","token":"token1"},{"name":"公众号B","token":"token2"}]
```

### Q: 如何自定义界面？
**A**: 修改 `pages/index.vue` 和 `assets/css/main.css`

### Q: 如何在其他网站中使用？
**A**: 使用极简 SDK（推荐 NPM 方式）：

**方式 1: NPM 安装（推荐）**
```bash
npm install @wu529778790/wechat-auth-sdk
```

```javascript
import WxAuth from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/index.css';

WxAuth.init({ apiBase: 'https://your-api.com' });
await WxAuth.requireAuth();
```

**方式 2: CDN 引入**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.css">
<script src="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.js"></script>

<script>
  WxAuth.init({ apiBase: 'https://your-api.com' });
  await WxAuth.requireAuth();
</script>
```

**在线演示**：访问 `http://localhost:3000/sdk/demo`
**详细文档**：[wu529778790/wechat-auth-sdk](https://github.com/wu529778790/wechat-auth-sdk)

---

## 📊 项目统计

**后端服务**：
- **核心文件**: 18个
- **代码行数**: ~1500行
- **依赖包**: 3个生产依赖
- **技术栈**: Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS
- **存储**: JSON 文件 / SQLite
- **加密**: AES-256-GCM / AES-256-CBC / SHA1

**极简 SDK**（独立包 `@wu529778790/wechat-auth-sdk`）：
- **文件大小**: < 12KB (JS 7.4KB + CSS 3.5KB)
- **依赖**: 零依赖（原生 JS）
- **兼容性**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **发布**: NPM / CDN / 浏览器直接引入
- **仓库**: [wu529778790/wechat-auth-sdk](https://github.com/wu529778790/wechat-auth-sdk)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 自由使用和修改

---

## 📞 技术支持

如有问题，请检查：
1. ✅ 认证服务是否正常运行
2. ✅ 微信后台配置是否正确
3. ✅ HTTPS 证书是否有效
4. ✅ 浏览器控制台是否有错误

---

## 🎉 立即开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境
cp .env.example .env
# 编辑 .env 文件

# 3. 启动开发服务
pnpm dev
```

访问：http://localhost:3000

---

**最后更新**: 2025-12-29
**版本**: v4.2.2
**状态**: ✅ 生产就绪
