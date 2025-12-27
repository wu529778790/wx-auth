# 部署说明

## 🎉 配置完成

你的微信公众号认证系统已经配置完成，支持**安全模式（加密消息）**。

---

## ✅ 当前状态

### 已配置
- ✅ 网站域名：`https://your-domain.com`
- ✅ 微信后台配置：安全模式
- ✅ 消息加解密：支持
- ✅ 环境变量：已配置

### 微信后台配置
```
URL:      https://your-domain.com/api/wechat/message
Token:    [YOUR_WECHAT_TOKEN]
EncodingAESKey: [YOUR_AES_KEY]
消息加解密方式: 安全模式
```

---

## 📋 功能说明

### 1. 用户认证流程
1. 用户访问网站 → 强制弹出认证窗口
2. 关注公众号 → 自动发送6位验证码
3. 输入验证码 → 完成认证，访问网站

### 2. 公众号消息处理
- **关注事件**：自动发送验证码
- **关键词回复**：
  - `已关注` / `认证` / `验证码` → 重新发送验证码
  - `状态` → 查询认证状态
  - `帮助` → 查看帮助信息

### 3. 安全模式支持
- 自动检测消息是否加密
- 支持加密/解密消息
- 支持明文模式（向后兼容）

---

## 🚀 生产环境部署

### Vercel 部署（已配置）

你的应用已部署在 Vercel，环境变量已配置：
- `SITE_URL`
- `SESSION_SECRET`
- `WECHAT_TOKEN`
- `WECHAT_APPID`
- `WECHAT_APPSECRET`
- `WECHAT_AES_KEY`

### 代码更新流程

```bash
# 1. 本地开发
git add .
git commit -m "feat: your changes"
git push

# 2. Vercel 自动部署
# 访问 https://vercel.com 查看部署状态
```

---

## 📁 文件结构

```
wechat-subscription-auth/
├── server/
│   ├── api/
│   │   ├── admin/          # 管理后台API
│   │   ├── auth/           # 认证相关API
│   │   └── wechat/         # 微信消息处理
│   └── utils/
│       ├── wechat.ts       # 微信加解密工具
│       ├── storage.ts      # 数据存储（JSON/SQLite）
│       └── session.ts      # Session管理
├── pages/
│   └── index.vue           # 认证页面
├── data/
│   └── auth-data.json      # 认证数据（Vercel使用/tmp）
├── .env                    # 本地环境变量
├── .env.example            # 环境变量模板
└── README.md               # 项目说明
```

---

## 🔧 环境变量配置

### 本地开发 (.env)
```env
SITE_URL=https://your-domain.com
SESSION_SECRET=your-random-secret
WECHAT_TOKEN=[YOUR_WECHAT_TOKEN]
WECHAT_APPID=[YOUR_APP_ID]
WECHAT_APPSECRET=[YOUR_APP_SECRET]
WECHAT_AES_KEY=[YOUR_AES_KEY]
```

### Vercel 环境变量
在 Vercel 控制台 Settings → Environment Variables 中配置以上变量。

---

## 📊 数据存储

- **本地开发**：使用 `data/auth-data.json`
- **Vercel**：使用 `/tmp/auth-data.json`（临时目录）

数据格式：
```json
{
  "authCodes": {
    "123456": {
      "openid": "oxxx...",
      "expiredAt": 1766820000000
    }
  },
  "authenticatedUsers": {
    "oxxx...": {
      "authenticatedAt": "2025-12-27T07:00:00.000Z"
    }
  }
}
```

---

## 🎯 使用指南

### 1. 用户端
1. 访问 `https://your-domain.com`
2. 看到认证弹窗
3. 关注公众号获取验证码
4. 输入验证码完成认证

### 2. 管理端
访问 `https://your-domain.com/admin` 查看统计数据（需配置管理员权限）

---

## 🐛 故障排查

### 问题：微信后台提示 "URL无法访问"
**解决**：
1. 检查 Vercel 部署状态
2. 检查域名解析
3. 检查 SSL 证书

### 问题：消息解密失败
**解决**：
1. 检查 `WECHAT_AES_KEY` 是否正确
2. 检查 `WECHAT_APPID` 是否正确
3. 检查消息加解密方式是否为"安全模式"

### 问题：验证码未发送
**解决**：
1. 检查微信公众号是否正常
2. 查看 Vercel 日志
3. 测试关注公众号是否触发事件

---

## 📚 参考文档

- [微信官方文档](https://developers.weixin.qq.com/doc/subscription/guide/dev/push/)
- [快速配置指南](./QUICK_SETUP.md)
- [AES加密说明](./SETUP_AESKEY.md)

---

## 🤝 技术支持

如有问题，请检查：
1. Vercel 部署日志
2. 微信后台配置
3. 环境变量是否正确

**配置已完成，可以直接使用！** 🎉
