# 快速启动指南

## 📦 项目已创建完成

这是一个基于 **Nuxt 4** 的**极简**微信订阅号认证系统，**无需数据库**，**无需自动轮询**。

### 项目结构（新版 - 单页面）

```
wechat-subscription-auth/
├── server/
│   ├── api/wechat/message.ts    # 微信消息处理（接收认证码）
│   ├── api/auth/
│   │   ├── setup.ts             # 生成认证码（新）
│   │   ├── check.ts             # 认证状态检查（更新）
│   │   └── session.ts           # Session 管理
│   └── utils/
│       ├── storage.ts           # 内存存储（新增pending）
│       ├── wechat.ts            # 微信工具
│       └── session.ts           # Session 工具
├── pages/
│   └── index.vue                # 单页认证（显示码 + 验证）
├── app.vue                      # 根组件
├── nuxt.config.ts               # Nuxt 配置
├── tailwind.config.ts           # Tailwind 配置
└── package.json                 # 依赖
```

## 🚀 启动步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

**必须配置的项：**
- `SITE_URL` - 网站地址（如：https://your-website.com）
- `WECHAT_APPID` - 公众号 AppID
- `WECHAT_APPSECRET` - 公众号 AppSecret
- `WECHAT_TOKEN` - 服务器 Token（与微信后台一致）
- `SESSION_SECRET` - 随机密钥（运行 `openssl rand -hex 32` 生成）

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 4. 配置微信公众号后台

登录微信公众号平台 → 开发 → 基本配置：

| 配置项 | 值 |
|--------|-----|
| 服务器URL | `https://your-domain.com/api/wechat/message` |
| Token | 与 `.env` 中的 `WECHAT_TOKEN` 一致 |
| 消息加解密方式 | 推荐安全模式 |

### 5. 测试流程（新版 - 更简单）

1. **访问网站** → 显示6位认证码
2. **扫码关注公众号**
3. **发送认证码**到公众号（如：`123456`）
4. **公众号回复**"✅ 认证成功！"
5. **点击按钮**"我已关注，立即认证"
6. **完成登录**，自动跳转首页

## 🎯 核心功能

### 认证流程（新版）

```
用户访问网站
    ↓
自动生成6位认证码 + Token
    ↓
显示认证码（大号字体）+ 操作指引
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

### 支持的认证方式

#### 方式1：新版（推荐）
- 访问网站获得6位认证码
- 发送到公众号完成验证
- 点击按钮完成登录

#### 方式2：兼容旧版
- 发送关键词：`已关注`、`认证`、`验证`等
- 获得认证码
- 手动输入或自动检测

### 其他命令

- `状态` - 查询认证状态
- `帮助` - 查看使用帮助

## 🎨 自定义页面

### 修改二维码图片

编辑 `pages/index.vue`，在步骤1中添加：

```vue
<!-- 在步骤1下方添加二维码 -->
<div class="mt-3">
  <img src="/qrcode.jpg" alt="订阅号二维码" class="w-32 h-32 mx-auto border-2 border-green-500 rounded-lg" />
</div>
```

### 修改UI样式

所有页面使用 Tailwind CSS，可以直接修改颜色、布局等。

## 🚀 部署

### Vercel（推荐）

```bash
pnpm build
vercel --prod
```

### Netlify

```bash
pnpm build
netlify deploy --prod
```

### 自建服务器

```bash
pnpm build
pnpm preview
```

## ⚠️ 生产环境注意事项

### 1. 内存存储限制

⚠️ **重要**：本系统使用**内存存储**，这意味着：

- ✅ 无需配置数据库
- ✅ 部署更简单
- ❌ 重启后数据丢失
- ❌ 多实例需要共享存储

**适合场景：**
- 个人项目
- 小型应用
- 开发/测试环境

**不适合场景：**
- 大规模生产环境
- 需要数据持久化的场景

### 2. 如何扩展为持久化存储？

如果需要持久化，只需修改 `server/utils/storage.ts`，将 Map 替换为：

```typescript
// 使用 Redis
import redis from 'redis';
await redis.setex(`pending:${token}`, 300, JSON.stringify({ code }));
await redis.setex(`auth:${code}`, 300, JSON.stringify(data));

// 或使用数据库
await prisma.pendingCode.create({ data: {...} });
```

### 3. 安全加固

```bash
# 1. 使用强随机密钥
openssl rand -hex 32

# 2. 启用 HTTPS
# 微信强制要求 HTTPS

# 3. 保护环境变量
# 不要提交 .env 到 Git
```

## 📋 检查清单

- [ ] 配置 `.env` 文件
- [ ] 微信公众号后台配置服务器URL
- [ ] 上传订阅号二维码图片（可选）
- [ ] 测试完整认证流程
- [ ] 配置生产环境部署

## 🔧 环境变量说明

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `SITE_URL` | ✅ | 网站地址 | `https://your.com` |
| `WECHAT_APPID` | ✅ | 公众号ID | `wx1234567890` |
| `WECHAT_APPSECRET` | ✅ | 公众号密钥 | `abc123def456` |
| `WECHAT_TOKEN` | ✅ | 服务器Token | `mytoken123` |
| `SESSION_SECRET` | ✅ | Session密钥 | `随机32位hex` |
| `CODE_EXPIRY` | ❌ | 验证码有效期(秒) | `300` (默认) |

## 🐛 调试技巧

### 查看日志

```bash
# 启动开发服务器
pnpm dev

# 查看以下日志：
# [WeChat] 收到消息: ...
# [WeChat] 用户 xxx 发送认证码 123456，认证成功
# [Auth Setup] 生成待验证代码 123456 对应 token xxx
# [Storage] 清理了 X 个过期待验证代码
```

### 常见问题

1. **微信消息未回复**
   - 检查服务器URL是否可访问
   - 确认 HTTPS 配置
   - 验证 Token 是否一致

2. **认证码无效**
   - 检查是否已过期（5分钟）
   - 确认内存存储正常运行
   - 查看控制台日志

3. **验证按钮不工作**
   - 检查浏览器控制台错误
   - 确认 Cookie 设置正确
   - 查看网络请求是否成功

## 📞 技术支持

如有问题，请查看：
- `README.md` - 完整技术文档
- `PROJECT_OVERVIEW.md` - 架构说明
- 微信公众号官方文档
- Nuxt 官方文档

---

**祝你使用愉快！** 🎉
