# 微信订阅号认证 SDK

基于 Vite 构建的轻量级微信订阅号认证 SDK，支持 TypeScript 和多种模块格式。

## 📦 安装

### NPM 方式（推荐）
```bash
npm install @wu529778790/wechat-auth-sdk
```

### CDN 方式
```html
<link rel="stylesheet" href="https://cdn.example.com/wx-auth.css">
<script src="https://cdn.example.com/wx-auth.umd.js"></script>
```

## 🚀 快速开始

### ES Module
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

### UMD（浏览器脚本）
```html
<link rel="stylesheet" href="./dist/wx-auth.css">
<script src="./dist/wx-auth.umd.js"></script>
<script>
  WxAuth.init({
    apiBase: 'https://your-api.com',
    onVerified: (user) => {
      console.log('认证成功', user);
    }
  });
</script>
```

## ⚙️ 配置选项

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `apiBase` | `string` | ✅ | 后端 API 地址 |
| `wechatName` | `string` | ❌ | 公众号名称（默认: "公众号"） |
| `qrcodeUrl` | `string` | ❌ | 二维码图片 URL |
| `onVerified` | `(user) => void` | ❌ | 验证成功回调 |
| `onError` | `(error) => void` | ❌ | 错误回调 |

## 🔧 API 方法

### `WxAuth.init(options)`
初始化 SDK，自动检测 Cookie 并静默认证。

**行为：**
- 检查 `wxauth-openid` Cookie
- 已认证 → 触发 `onVerified` 回调（静默通过）
- 未认证 → 显示认证弹窗

### `WxAuth.requireAuth()`
手动触发认证流程（用于重新认证、切换账号）。

**返回：** `Promise<boolean>` - 验证成功返回 `true`

### `WxAuth.close()`
关闭认证弹窗。

## 🛡️ 弹窗保护机制

SDK 内置防删除保护，防止用户从控制台删除认证弹窗：

### 双重检测机制

1. **MutationObserver（实时检测）**
   - 监听 DOM 变化
   - 响应时间：< 100ms
   - 检测场景：`remove()`、`style.display='none'`、`innerHTML=''`

2. **定时器兜底（每秒检查）**
   - 每秒检查一次弹窗状态
   - 最大延迟：1 秒
   - 防止 MutationObserver 被绕过

### 保护流程
```
启用保护 → MutationObserver 监听 → 检测到攻击？→ 立即恢复（< 100ms）
    ↓
定时器检查（每秒） → 检测到异常？→ 恢复（≤ 1000ms）
```

## 📋 后端 API 要求

SDK 需要以下后端 API 端点：

### 1. 认证检查
```
GET /api/auth/check?authToken={code}  // 通过验证码验证
GET /api/auth/check?openid={openid}   // 通过 OpenID 验证
```

**响应：**
```json
{
  "authenticated": true,
  "user": {
    "openid": "oxxx...",
    "nickname": "用户昵称",
    "headimgurl": "头像URL"
  }
}
```

### 2. Session 管理
```
POST /api/auth/session   // 创建 Session
GET /api/auth/session    // 获取 Session
DELETE /api/auth/session // 删除 Session
```

### 3. 微信消息处理
```
POST /api/wechat/message // 微信消息接收/回复
```

## 🎨 用户体验特性

- ✅ **自动聚焦** - 首个输入框自动获得焦点
- ✅ **粘贴支持** - 自动识别 6 位数字粘贴
- ✅ **键盘导航** - 支持退格、方向键
- ✅ **自动验证** - 输入完成自动提交
- ✅ **静默认证** - 有 Cookie 时不显示弹窗
- ✅ **防删除保护** - MutationObserver + 定时器

## 📦 构建产物

```
dist/
├── wx-auth.js         # ES Module (7.1 kB)
├── wx-auth.umd.js     # UMD (11 kB)
├── wx-auth.css        # 样式 (3.4 kB)
└── index.d.ts         # TypeScript 类型声明
```

**总计：** < 12 KB（零依赖）

## 🔨 开发构建

```bash
# 安装依赖
pnpm install

# 构建 SDK
pnpm build

# 类型检查
pnpm type-check
```

## 📝 认证流程

```
用户访问网站
    ↓
SDK 初始化
    ↓
检查 Cookie wxauth-openid
    ↓
已认证？ → 静默通过 → onVerified 回调
    ↓
未认证？ → 显示弹窗（二维码 + 6位输入框）
    ↓
用户扫码关注公众号
    ↓
公众号自动回复验证码
    ↓
用户输入验证码
    ↓
验证成功 → 保存 Cookie → onVerified 回调
```

## 🔒 安全特性

- **验证码**：5分钟过期，一次性使用
- **Session**：AES-256-GCM 加密
- **Cookie**：HttpOnly + SameSite=Lax
- **防删除**：双重保护机制

## 🎯 使用场景

### 1. 独立网站集成
```typescript
import { WxAuth } from '@wu529778790/wechat-auth-sdk';

WxAuth.init({
  apiBase: 'https://api.your-site.com',
  onVerified: (user) => {
    // 认证成功，允许访问内容
    showContent();
  }
});
```

### 2. 现有系统集成
```typescript
// 在用户点击"登录"时触发
loginButton.onclick = async () => {
  const success = await WxAuth.requireAuth();
  if (success) {
    // 继续原有登录流程
  }
};
```

### 3. 重新认证/切换账号
```typescript
// 用户点击"切换账号"
switchAccountButton.onclick = async () => {
  await WxAuth.requireAuth();
};
```

## 📚 完整文档

完整的项目文档请参考项目根目录的 `README.md`，包含：
- 后端 API 详细配置
- 微信后台配置指南
- Docker 部署方案
- 环境变量说明
- 常见问题解答

## 🤝 依赖

**零依赖** - 纯原生 JavaScript + TypeScript

## 📄 许可证

MIT License

---

**版本**: 1.0.0
**构建时间**: 2025-12-30
**状态**: ✅ 生产就绪
