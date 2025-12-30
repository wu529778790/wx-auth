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
- ✅ **Docker 支持** - 一键部署，自动发布

![20251230220047](https://gcore.jsdelivr.net/gh/wu529778790/image/blog/20251230220047.png)

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
用户微信关注公众号
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
wx-auth/
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
│   └── index.vue               # 认证页面
├── data/
│   └── auth-data.json          # 数据存储
├── wx-auth-sdk/                # SDK 模块
│   ├── src/
│   │   ├── index.ts            # SDK 入口
│   │   ├── wx-auth.ts          # 主 SDK
│   │   ├── protection.ts       # 弹窗保护模块
│   │   └── wx-auth.css         # 样式
│   └── vite.config.ts          # 构建配置
├── Dockerfile                  # Docker 镜像
├── docker-compose.yml          # 部署配置
├── deploy.sh                   # 快速部署脚本
├── nuxt.config.ts
└── package.json
```

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

### 5. SDK 弹窗保护
```typescript
// 防止用户删除认证弹窗
wx-auth-sdk/src/protection.ts

保护机制：
- MutationObserver - 实时检测 DOM 删除
- 定时器兜底 - 每秒检查一次
- 智能恢复 - 防止循环
```

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

---

## 🔧 SDK 开发和构建

### SDK 目录结构
```
wx-auth-sdk/
├── src/
│   ├── index.ts           # SDK 入口
│   ├── wx-auth.ts         # 核心逻辑
│   ├── protection.ts      # 弹窗保护模块
│   └── wx-auth.css        # 样式
├── dist/                  # 构建产物
│   ├── wx-auth.js         # ES Module (7.1 kB)
│   ├── wx-auth.umd.js     # UMD (11 kB)
│   ├── wx-auth.css        # 样式 (3.4 kB)
│   └── index.d.ts         # TypeScript 类型
├── vite.config.ts         # 构建配置
└── package.json
```

### 构建 SDK
```bash
cd wx-auth-sdk
pnpm install
pnpm build
pnpm type-check  # TypeScript 类型检查
```

### SDK 使用示例

**ES Module 方式：**
```typescript
import { WxAuth } from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/style.css';

WxAuth.init({
  apiBase: 'https://your-api.com',
  wechatName: '我的公众号',
  qrcodeUrl: 'https://your-site.com/qrcode.jpg',
  onVerified: (user) => {
    console.log('认证成功', user);
  },
  onError: (error) => {
    console.error('认证失败', error);
  }
});
```

**UMD 方式（浏览器脚本）：**
```html
<link rel="stylesheet" href="./dist/wx-auth.css">
<script src="./dist/wx-auth.umd.js"></script>
<script>
  WxAuth.init({
    apiBase: 'https://your-api.com',
    onVerified: (user) => { /* ... */ }
  });
</script>
```

### SDK 核心特性

1. **自动认证检测**
   - 初始化时自动检查 `wxauth-openid` Cookie
   - 已认证 → 静默通过，触发 `onVerified` 回调
   - 未认证 → 显示认证弹窗

2. **弹窗防删除保护**
   - **MutationObserver** - 实时检测 DOM 删除（< 100ms）
   - **定时器兜底** - 每秒检查一次（≤ 1000ms）
   - **智能恢复** - 防止循环恢复

3. **用户体验优化**
   - 自动聚焦第一个输入框
   - 支持粘贴 6 位数字
   - 键盘导航（退格、方向键）
   - 输入完成自动验证

### API 参考

**`WxAuth.init(options)`**
- `apiBase` (必填): 后端 API 地址
- `wechatName` (可选): 公众号名称
- `qrcodeUrl` (可选): 二维码 URL
- `onVerified` (可选): 验证成功回调
- `onError` (可选): 错误回调

**`WxAuth.requireAuth()`**
- 手动触发认证流程
- 返回 `Promise<boolean>`

**`WxAuth.close()`**
- 关闭认证弹窗

---

## 🐳 Docker 部署

### 快速启动

```bash
# 1. 配置环境变量
cp .env.example .env
nano .env

# 2. 启动服务
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f
```

### GitHub Actions 自动发布

```bash
# 创建标签并推送
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 自动构建并发布到：
- GitHub Container Registry: `ghcr.io/your-username/wx-auth`
- Docker Hub: `yourusername/wx-auth-system`

### 部署脚本

项目提供了快速部署脚本 `deploy.sh`：

```bash
./deploy.sh [命令]

Commands:
  dev      启动开发环境
  prod     启动生产环境
  stop     停止服务
  restart  重启服务
  logs     查看日志
  status   查看服务状态
  update   更新到最新版本
  clean    清理所有数据
  help     显示帮助信息
```

**示例：**
```bash
./deploy.sh dev    # 开发环境
./deploy.sh logs   # 查看日志
./deploy.sh status # 查看状态
```

---

## 🚀 其他部署方式

### Vercel

```bash
pnpm build
vercel --prod
```

### 传统服务器

```bash
pnpm install
pnpm build
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

---

## ✅ 测试总结

### 核心模块测试通过

| 模块 | 测试内容 | 状态 |
|------|----------|------|
| **SDK 构建** | ES Module / UMD / CSS / 类型声明 | ✅ 通过 |
| **存储层** | JSON 文件 / SQLite 读写 | ✅ 通过 |
| **Session 加密** | AES-256-GCM 加解密 | ✅ 通过 |
| **微信签名** | 明文模式 / 安全模式 | ✅ 通过 |
| **验证码** | 生成 / 过期 / 一次性使用 | ✅ 通过 |
| **弹窗保护** | MutationObserver / 定时器 | ✅ 通过 |

### SDK 体积统计
- **ES Module**: 7.1 kB (gzip: 2.8 kB)
- **UMD**: 11 kB (gzip: 4.1 kB)
- **CSS**: 3.4 kB (gzip: 1.2 kB)
- **总计**: < 12 KB ✅

### 安全特性验证
- ✅ **AES-256-GCM** - Session 数据加密
- ✅ **SHA-1 签名** - 微信消息验证
- ✅ **验证码过期** - 5分钟有效期
- ✅ **一次性使用** - 验证后立即删除
- ✅ **防弹窗删除** - MutationObserver 保护

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

### Q: 如何在其他网站中使用？
**A**: 使用 SDK（推荐 NPM 方式）：

```bash
npm install @wu529778790/wechat-auth-sdk
```

```javascript
import WxAuth from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/index.css';

WxAuth.init({
  apiBase: 'https://your-api.com',
  wechatName: '我的公众号',
  qrcodeUrl: 'https://your-site.com/qrcode.jpg',
  onVerified: (user) => {
    console.log('认证成功', user);
  }
});
```

**SDK 特性**：
- ✅ 仅需配置 `apiBase`
- ✅ 复用现有后端 API
- ✅ 无额外依赖
- ✅ 支持 ES Module 和 UMD 格式
- ✅ 总大小 < 12KB
- ✅ 弹窗防删除保护（MutationObserver + 定时器）

---

---

## 📚 文档说明

为保持项目简洁，已清理重复文档：

| 原文档 | 状态 | 说明 |
|--------|------|------|
| `CHANGELOG.md` | ✅ 已整合 | 更新日志合并到本 README |
| `DEPLOYMENT.md` | ✅ 已整合 | Docker 部署指南合并 |
| `DOCKER_DEPLOYMENT.md` | ✅ 已整合 | 完整部署文档合并 |
| `PROTECTION_TEST.md` | ✅ 已整合 | SDK 保护机制说明合并 |
| `TEST_SUMMARY.md` | ✅ 已整合 | 测试报告合并 |

**保留的文档**：
- `README.md` - 本文件（完整项目文档）
- `wx-auth-sdk/README.md` - SDK 独立文档（用于 NPM 发布）
- `CLAUDE.md` - 开发指南（仅开发人员使用）

**说明**：
- 主 README 包含完整的项目说明和快速开始
- SDK README 用于独立使用或 NPM 包发布
- CLAUDE.md 包含开发相关的技术细节

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 自由使用和修改

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

**版本**: v4.2.2
**状态**: ✅ 生产就绪
