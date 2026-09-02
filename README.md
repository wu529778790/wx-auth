# wx-auth — 微信扫码登录系统（公众号验证码）

> 一套微信认证后端，服务多个网站。用户扫码关注公众号 → 回复关键词获取 6 位验证码 → 输入验证码完成登录。登录成功后保持关注即可一直自动登录，支持多站点接入（一个公众号服务 N 个网站）。

技术栈：**Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS**，存储用 **Turso**（libSQL 托管，本地开发可用 file: 模式），前端 SDK 零依赖、< 12KB。

## 登录流程

```
用户访问接入网站
        │
        ▼
SDK 检查 Cookie
        │
        ├── 有效 ──── 静默通过，直接登录
        │
        └── 无效
             │
             ▼
        显示登录弹窗（公众号二维码 + 6 位验证码输入框）
             │
             ▼
   用户微信扫码关注公众号 → 回复「验证码」→ 收到 6 位数字
             │
             ▼
        输入验证码 → 校验通过
             │
             ▼
   签发签名 Token 写入 Cookie → onVerified 回调
```

- 验证码 5 分钟有效、一次性使用
- 每个用户有唯一 openid，多站点共用同一套账号
- 取消关注后登录态自动失效（软删除，重新关注自动恢复）

## 快速开始

### 1. 前置准备

- 一个微信订阅号/服务号（[微信公众平台](https://mp.weixin.qq.com/)）
- 一个 [Turso](https://turso.tech/) 数据库（免费额度够用）

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填写 WECHAT_TOKEN / SESSION_SECRET / TURSO_URL / TURSO_TOKEN 等
```

### 3. 配置公众号服务器

在公众号后台「设置与开发 → 基本配置」中：

- URL 填 `https://你的域名/api/wechat/message`
- Token 与 `.env` 中 `NUXT_WECHAT_TOKEN` 一致
- 消息加解密方式明文即可（也支持安全模式，配 `NUXT_WECHAT_AES_KEY`）

> 首次接入需要通过微信的服务器验证（本服务已实现 GET 校验，直接提交即可）。

### 4. 启动

```bash
npm install
npm run dev        # 开发模式 http://localhost:3000
npm run build      # 生产构建
```

或使用 Docker：

```bash
docker build -t wx-auth .
docker run -d --name wx-auth --env-file .env -p 3000:3000 -v ./data:/app/data wx-auth
```

## 环境变量

| 变量 | 必须 | 说明 |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | ✅ | 网站地址（微信回调用） |
| `NUXT_WECHAT_TOKEN` | ✅ | 与公众号后台配置的 Token 一致 |
| `NUXT_SESSION_SECRET` | ✅ | Token 签名密钥，生产用 `openssl rand -hex 32` 生成 |
| `TURSO_URL` | ✅ | `libsql://xxx.turso.io`；本地开发可用 `file:./data/turso.db` |
| `TURSO_TOKEN` | 远程库必须 | Turso 控制台 Generate Token 获取 |
| `NUXT_WECHAT_NAME` | 推荐 | 公众号名称（SDK 弹窗展示，`/api/sdk/config` 自动下发） |
| `NUXT_WECHAT_QRCODE_URL` | 推荐 | 公众号二维码图片 URL |
| `NUXT_WECHAT_AES_KEY` | 可选 | 微信消息加解密密钥（安全模式） |
| `NUXT_CODE_EXPIRY` | 可选 | 验证码有效期秒数，默认 300 |
| `NUXT_KEYWORDS` | 可选 | 触发发码的关键词 JSON，默认 `["验证码"]` |
| `NUXT_WECHAT_MENU_KEY` | 可选 | 「验证码」菜单点击事件 key，默认 `GET_CODE` |

> Docker 部署时私有配置必须加 `NUXT_` 前缀。

## SDK 接入（wx-auth-sdk）

```bash
npm install wx-auth-sdk
```

```js
import { WxAuth } from 'wx-auth-sdk';
import 'wx-auth-sdk/dist/wx-auth.css';

WxAuth.init({
  // 零配置：siteId 自动取域名，公众号名称/二维码自动从后端获取
  onVerified: (user) => {
    console.log('登录成功', user);
  },
  // onClose: () => {}   // required=false 时可用
});
```

常用选项：

- `apiBase`：认证后端地址（可选，默认同域名；跨站点部署时填后端地址）
- `required`：是否强制登录（默认 `true`，不登录无法关闭弹窗）
- `silent: true`：初始化不弹窗，业务代码里 `await WxAuth.requireAuth()` 手动触发（适合「免费用几次再要求登录」的场景）
- `WxAuth.revoke()`：退出登录，服务端吊销 Token + 清本地凭证

SDK 详见 [wx-auth-sdk/README.md](./wx-auth-sdk/README.md)。

## 后端 API

| 端点 | 说明 |
| --- | --- |
| `GET/POST /api/wechat/message` | 微信服务器推送（服务器验证 / 消息收发，支持安全模式加解密） |
| `GET /api/auth/check` | 登录判定。参数 `token`（签名 Token）或 `authToken`（验证码）+ `siteId`；也支持 `Authorization: Bearer <token>` |
| `POST /api/auth/logout` | 服务端注销（吊销当前 Token，双提交 CSRF 防护） |
| `GET /api/sdk/config` | SDK 配置下发（公众号名称 / 二维码 URL） |

check 响应示例：

```json
{
  "authenticated": true,
  "token": "oXXXX....epoch..hmac",
  "user": {
    "openid": "oXXXX",
    "nickname": "张三",
    "headimgurl": "https://thirdwx.qlogo.cn/...",
    "unionid": "...",
    "authenticatedAt": "2026-09-03T08:00:00.000Z"
  }
}
```

接入方（服务端）只需在自家后端读 Cookie `wxauth-token`，调 `/api/auth/check?token=...` 验签即可，无需接触微信细节。

## 安全设计

- **签名 Token**：HMAC-SHA256 对 `openid.时间戳` 签名，凭证不可伪造、不可枚举；SDK 只存 Token，不存明文 openid
- **验证码**：5 分钟过期、一次性使用；验证尝试按 IP 限流 10 次/分防暴力枚举
- **check 限流分型**：有效签名按 openid 120/分、无效签名按 IP 30/分（防探测）、无凭证按 IP 300/分
- **Token 吊销**：`logout` 把 Token SHA-256 哈希写入吊销表，退出后全设备失效；吊销记录带 origin/ip/ua 便于审计
- **消息验签**：微信服务器推送全量验签，支持 AES 安全模式
- **存储异常不误伤**：数据库抖动返回 503 + `retryable`，SDK 指数退避重试而不是弹「未登录」

## 多站点（siteId）

SDK 自动从 `document.referrer` / 当前域名生成 `siteId`，每个用户的认证记录带站点归属，一套公众号即可服务多个网站，无需每个站点单独开号。

## 项目结构

```
├── server/
│   ├── api/
│   │   ├── wechat/message.ts    # 微信消息收发（关注/取关/关键词发码/菜单发码）
│   │   ├── auth/check.ts        # 登录判定（token 验签 / 验证码校验）
│   │   ├── auth/logout.post.ts  # 服务端注销（token 吊销）
│   │   └── sdk/config.ts        # SDK 配置下发
│   ├── middleware/              # CORS / 扫描器静默拦截
│   ├── plugins/logger.ts        # 请求日志
│   └── utils/
│       ├── wechat.ts            # 微信签名/加解密/消息生成
│       ├── storage.ts           # 存储层（Turso）
│       ├── turso.ts             # libSQL 访问层（惰性单例 + 事务 batch）
│       ├── token.ts             # 签名 Token / 吊销
│       ├── session.ts           # AES-256-GCM Session
│       └── rate-limit.ts        # 速率限制
├── pages/index.vue              # 演示页（SDK 接入示例）
├── wx-auth-sdk/                 # 前端 SDK（零依赖，Vite 构建）
├── Dockerfile
└── docker-compose.yml
```

## 公众号菜单配置（可选）

认证订阅号可在公众号后台配置「点击推事件」菜单，事件 key 填 `GET_CODE`（与 `NUXT_WECHAT_MENU_KEY` 一致），用户点菜单直接收到验证码，无需打字。

未认证订阅号不支持点击推事件，用户回复「验证码」即可（支持繁体「驗證碼」、拼音 `yzm`、单字「码」等模糊匹配）。

## License

[MIT](./LICENSE)
