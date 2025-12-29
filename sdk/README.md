# SDK 目录说明

## 📦 SDK 已独立发布

本项目的 SDK 已独立为 **`@wu529778790/wechat-auth-sdk`** 包，发布到 NPM。

### 使用方式

#### 1. NPM 安装（推荐）

```bash
npm install @wu529778790/wechat-auth-sdk
```

```javascript
// 引入
import WxAuth from '@wu529778790/wechat-auth-sdk';
import '@wu529778790/wechat-auth-sdk/dist/index.css';

// 初始化
WxAuth.init({
  apiBase: 'https://your-api.com',
  onVerified: (user) => {
    console.log('验证通过', user);
  }
});

// 使用
await WxAuth.requireAuth();
```

#### 2. CDN 引入

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.css">
<script src="https://cdn.jsdelivr.net/npm/@wu529778790/wechat-auth-sdk@1.0.0/dist/index.js"></script>

<script>
  WxAuth.init({ apiBase: 'https://your-api.com' });
  await WxAuth.requireAuth();
</script>
```

### 演示页面

访问 `/sdk/demo` 查看在线演示：
- **URL**: `http://localhost:3000/sdk/demo`
- **功能**: 交互式演示，可配置 API 地址并测试完整流程

### 独立 SDK 仓库

SDK 代码已独立到单独的仓库：
- **仓库**: https://github.com/wu529778790/wechat-auth-sdk
- **NPM**: https://www.npmjs.com/package/@wu529778790/wechat-auth-sdk
- **文件大小**: ~12KB (JS 7.4KB + CSS 3.5KB)

### 本目录内容

```
sdk/
├── README.md           # 本说明文件
└── QUICKSTART-SIMPLE.md  # 快速开始指南（已废弃，推荐使用 NPM）
```

### 快速迁移指南

如果你之前使用的是本地 SDK 文件，现在可以：

```bash
# 1. 安装 NPM 包
npm install @wu529778790/wechat-auth-sdk

# 2. 删除本地 SDK 文件
rm -f sdk/wx-auth-simple.js sdk/wx-auth-simple.css

# 3. 更新代码
# 旧代码:
# <script src="sdk/wx-auth-simple.js"></script>
# <link rel="stylesheet" href="sdk/wx-auth-simple.css">

# 新代码:
# import WxAuth from '@wu529778790/wechat-auth-sdk';
# import '@wu529778790/wechat-auth-sdk/dist/index.css';
```

### 特性对比

| 特性 | 本地文件 | NPM 包 |
|------|---------|--------|
| 引入方式 | `<script>` 标签 | `import` 语句 |
| 版本管理 | 手动更新 | 自动更新 |
| 依赖管理 | 无 | 支持 |
| 构建优化 | 需手动处理 | 自动 tree-shaking |
| 推荐度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

**最后更新**: 2025-12-29
**推荐**: 使用 NPM 包方式引入 SDK