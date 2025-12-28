# 微信订阅号认证系统

> 🎯 **极简设计，开箱即用**

一个基于 Nuxt 4 的微信订阅号认证系统。用户关注公众号后获取验证码，输入即可完成认证。

---

## 🚀 3步启动

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境
```bash
cp .env.example .env
```

编辑 `.env`：
```bash
SITE_URL=https://your-site.com          # 你的网站地址
WECHAT_TOKEN=your-token                 # 微信后台Token
WECHAT_NAME=我的公众号                  # 公众号名称
WECHAT_QRCODE_URL=                      # 二维码图片URL（可选）
SESSION_SECRET=random-string            # 随机密钥
```

### 3. 启动服务
```bash
pnpm dev
```

访问：http://localhost:3000

---

## 📋 工作流程

```
用户访问网站
    ↓
看到二维码 + 输入框
    ↓
微信扫码关注公众号
    ↓
公众号发送"验证码"获取
    ↓
输入6位数字 → 点击验证
    ↓
✅ 认证成功
```

---

## ⚙️ 微信后台配置

登录公众号平台 → 开发 → 基本配置：

| 配置项 | 值 |
|--------|-----|
| **服务器URL** | `https://your-site.com/api/wechat/message` |
| **Token** | 与 `.env` 中的 `WECHAT_TOKEN` 一致 |
| **消息模式** | **明文模式** |

---

## 📁 项目结构

```
├── server/api/wechat/message.ts    # 微信消息处理（关注发验证码）
├── server/api/auth/check.ts        # 验证码验证
├── pages/index.vue                 # 前端界面（极简）
├── data/auth-data.json             # 数据存储（自动生成）
└── .env                            # 环境变量（需自己创建）
```

---

## 🔧 核心功能

### 1. 关注自动回复
```typescript
// server/api/wechat/message.ts
用户关注 → 生成6位验证码 → 保存 → 自动回复
```

### 2. 验证码验证
```typescript
// pages/index.vue
输入验证码 → 调用 /api/auth/check → 认证成功
```

### 3. 持久化存储
- **验证码**：5分钟过期
- **已认证用户**：永久保存（Cookie + 存储）

---

## 🎨 界面预览

```
┌─────────────────────────────┐
│        📷 二维码             │
│    微信扫码关注 "我的公众号"  │
│                             │
│  ┌─────────┐ ┌──────────┐  │
│  │验证码   │ │   验证   │  │
│  └─────────┘ └──────────┘  │
│                             │
│  在公众号发送"验证码"获取    │
└─────────────────────────────┘
```

---

## 🚀 部署

### Vercel（推荐）
```bash
pnpm build
vercel --prod
```

### 服务器
```bash
pnpm build
pnpm preview
```

### Docker
```bash
docker build -t wechat-auth .
docker run -d -p 3000:3000 \
  -e SITE_URL=https://your-site.com \
  -e WECHAT_TOKEN=your-token \
  wechat-auth
```

---

## 📝 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `SITE_URL` | ✅ | 网站地址，用于微信回调 |
| `WECHAT_TOKEN` | ✅ | 微信后台配置的Token |
| `WECHAT_NAME` | ✅ | 公众号名称（前端显示） |
| `WECHAT_QRCODE_URL` | ❌ | 二维码图片URL |
| `SESSION_SECRET` | ✅ | 随机字符串，用于加密 |
| `WECHAT_APPID` | ❌ | 认证服务号才需要 |
| `WECHAT_APPSECRET` | ❌ | 认证服务号才需要 |

---

## 💡 使用提示

### 未认证订阅号（手动模式）
用户关注后，在微信发送任意消息（如"1"或"验证码"），公众号会回复6位验证码。

### 认证服务号（自动模式）
用户关注后，公众号自动发送验证码（需要配置服务器）。

### 支持的触发关键词
`1`、`验证码`、`已关注`、`认证`、`验证`、`login`、`已订阅`、`关注了`

---

## 🔒 安全建议

1. **使用 HTTPS**（微信强制要求）
2. **设置强随机 Session 密钥**：`openssl rand -hex 32`
3. **保护 `.env` 文件**，不要提交到 Git
4. **验证码 5 分钟过期**，自动清理

---

## 🐛 常见问题

**Q: 消息没有回复？**
- 检查服务器URL是否可访问
- 确认 HTTPS 配置正确
- 检查 Token 是否一致

**Q: 验证失败？**
- 检查浏览器 Cookie 是否启用
- 确认验证码未过期（5分钟）

**Q: 如何切换存储方式？**
- 默认：JSON 文件（无需配置）
- SQLite：`STORAGE_TYPE=sqlite pnpm dev`

---

## 📄 许可证

MIT License - 自由使用

---

**立即开始：**
```bash
pnpm install
cp .env.example .env
pnpm dev
```
