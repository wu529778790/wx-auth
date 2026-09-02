# 微信订阅号认证 SDK

轻量级前端认证 SDK — 用户扫码关注公众号 → 输入 6 位验证码 → 认证成功。

基于 Vite 构建，**零依赖，< 15 KB**。

---

## 安装

```bash
npm install wx-auth-sdk
```

---

## 快速开始（零配置）

```typescript
import { WxAuth } from 'wx-auth-sdk';
import 'wx-auth-sdk/dist/wx-auth.css';

WxAuth.init({
  onVerified: (user) => {
    console.log('认证成功', user);
  }
});
```

SDK 会自动：

- 从 `document.referrer` 或当前域名自动获取站点标识（`siteId`，无需配置）
- 从后端拉取公众号名称和二维码
- 使用内置 API 地址

---

## 登录态与 Cookie 域

认证成功后，SDK 将签名 Token 写入 Cookie（**按根域存储，有效期 365 天**），并自动在 localStorage 存一份备份。Cookie 的 `domain` 由**当前页面域名**推导，而不是后端地址（apiBase）：

| 页面域名 | Cookie 落点 | 登录态共享范围 |
|---------|------------|---------------|
| `www.example.com`（主站） | `.example.com` | 该域下所有子站共享 |
| `sub.mysite.com`（第三方接入） | `.mysite.com` | 该域下所有子站共享 |
| `localhost` / `127.0.0.1` / IP | 不设 domain | 仅当前页面 |

规则说明：

- **同一注册域内一个认证，全域自动登录**：`sub1.mysite.com` 认证后，`sub2.mysite.com`、根域 `mysite.com` 都能静默通过（凭根域 Cookie）。
- **跨注册域不共享**：`mysite.com` 与 `other.com` 是相互独立的登录态，需各自认证一次（浏览器安全机制，无法绕过）。
- **主站已登录 → 子站有登录态**：`app.example.com` 认证后，访问 `b.example.com` 等其他子站同样静默通过。
- **localStorage 备份按站点隔离**：仅作为清 Cookie 后的兜底恢复，真正的跨子域凭证是根域 Cookie。
- **⚠️ 多级公共后缀**：若页面域名属于 `.com.cn` / `.co.uk` 等多级后缀（如 `site.mysite.com.cn`），"取最后两段"会推导出 `.com.cn`，浏览器会拒绝写入。此类接入需确认域名后再接入。

> **为什么 cookie 不跟 apiBase 走？** 早期版本 SDK 曾按 apiBase 域名写 Cookie，导致部署在第三方域名（`apiBase` 指向微信认证后端、页面域名不同）时 Cookie 落错域、后端起总不到凭证、前端反复弹窗（死循环）。SDK 已改为始终按「页面所在域」写 Cookie，与后端地址无关。

## API

### `WxAuth.init(options)`

初始化 SDK。自动检测 Cookie，已登录静默通过，未登录弹出认证窗。

```ts
WxAuth.init({
  apiBase?: string,         // 后端地址（可选，默认官方服务）
  required?: boolean,       // 是否强制认证（默认 true）
  silent?: boolean,         // 静默初始化（默认 false），true 时不弹窗
  onVerified?: (user) => void,
  onError?: (err) => void,
  onClose?: () => void,     // required=false 时关闭弹窗的回调
});
```

> `siteId` 无需配置：SDK 自动从 `document.referrer` 或当前域名获取并上报。

### `WxAuth.requireAuth()`

手动触发认证（用于"登录"按钮、切换账号）。返回 `Promise<boolean>`。

### `WxAuth.close()`

关闭弹窗。`required=false` 时触发 `onClose` 回调。

---

## 认证流程

```
用户访问
   │
   ▼
初始化 WxAuth.init()
   │
   ▼
读取 Cookie
   │
   ├── 有效 ──────────── onVerified()  ✅ 静默通过
   │
   └── 无效 ──→ 显示弹窗
                    │
                    ▼
              扫码关注公众号
                    │
                    ▼
              公众号回复 6 位验证码
                    │
                    ▼
              用户输入验证码
                    │
                    ▼
              后端校验
                    │
           ┌───────┴────────┐
           │                │
         成功             失败
           │                │
           ▼                ▼
      保存 Cookie      提示错误
      onVerified()    重新输入
```

---

## 两种模式

### 强制认证 `required: true`（默认）

必须完成认证才能继续，关闭按钮隐藏，点击遮罩无效。

```
  弹窗
 ┌──────────────────────────┐
 │  微信认证                │
 │                          │
 │  1. 扫码关注公众号       │
 │     ┌──────┐             │
 │     │ 二维码 │             │
 │     └──────┘             │
 │                          │
 │  2. 发送"验证码"获取     │
 │     取消关注公众号后将被 │ ← 新增提示
 │     取消认证，请保持关注 │
 │     [_][_][_][_][_][_]   │
 │                          │
 │       [ 验证 ]           │
 └──────────────────────────┘
```

### 可选认证 `required: false`

用户可主动关闭弹窗，关闭时执行 `onClose` 回调。

```
  弹窗
 ┌──────────────────────────┐
 │  微信认证             [×] │
 │  ...                     │
 └──────────────────────────┘
    ↓
  用户点击 × 或遮罩
    ↓
  onClose() → 继续浏览受限内容
```

---

## 功能清单

| 功能 | 支持 |
|------|------|
| 自动聚焦第一个输入框 | ✅ |
| 输入一位自动跳到下一格 | ✅ |
| 粘贴 6 位数字自动识别 | ✅ |
| 键盘左右/退格导航 | ✅ |
| 输入完成自动提交 | ✅ |
| 有 Cookie 静默认证 | ✅ |
| Cookie 按页面根域写入（跨子域共享） | ✅ |
| 清 Cookie 自动恢复（签名 Token 双存储：Cookie + localStorage） | ✅ |
| F12 删弹窗自动恢复 | ✅ |

> **清 Cookie 恢复说明**：Token 同时存 Cookie 与 localStorage。清除 Cookie 后，只要服务端认证状态仍有效，SDK 会凭 localStorage 备份静默恢复并重写 Cookie。
> 注意：备份按站点隔离（不跨子域）；清全部站点数据则无法恢复（符合隐私预期）。

---

## 开发

```bash
npm install
npm run build
```

---

## `silent` 模式：延迟弹窗

默认行为下，`init` 遇到未认证会自动弹窗。如果想**自己控制弹窗时机**（比如免费 3 次搜索后再弹），开启 `silent`：

```ts
// 1. 静默初始化：只校验现有 cookie，不调弹窗
WxAuth.init({
  silent: true,
  required: false,
  onVerified: (user) => { /* 标注已认证 */ },
});

// 2. 业务代码里自由控制弹窗
//    例：免费搜索 3 次后再要求认证
let freeSearches = 3;
async function onSearch() {
  if (freeSearches > 0) {
    freeSearches--;
    doSearch();
  } else {
    const ok = await WxAuth.requireAuth();  // 手动触发弹窗
    if (ok) doSearch();
  }
}
```

| `silent` | `init()` 行为 | 适用场景 |
|----------|--------------|---------|
| `false`（默认） | 需要时自动弹窗 | 付费墙、内测白名单 |
| `true` | 仅校验 cookie，弹窗由 `requireAuth()` 手动触发 | 免费额度、按需解锁 |
