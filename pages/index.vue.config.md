# 主页配置说明

## 🎨 新版弹窗样式

### 界面布局
```
┌─────────────────────────────┐
│                             │
│         🔐 身份认证          │
│    关注公众号获取验证码       │
│                             │
│    ┌───────────────────┐    │
│    │  [公众号二维码]    │    │
│    │  微信扫码关注      │    │
│    │  或搜索公众号: xxx │    │
│    └───────────────────┘    │
│                             │
│    输入6位验证码             │
│    ┌───────────┐ ┌──────┐  │
│    │ 123456    │ │ 验证 │  │
│    └───────────┘ └──────┘  │
│                             │
│    没收到验证码？重新获取     │
│                             │
│    🔒 本系统需要认证后才能访问 │
└─────────────────────────────┘
```

## ⚙️ 配置步骤

### 1. 设置公众号名称

在 `pages/index.vue` 第 143 行：

```javascript
const wechatName = ref('你的公众号名称'); // 例如：'测试公众号'
```

### 2. 添加公众号二维码

你有三种方式添加二维码：

#### 方式A：使用外部图片URL（推荐）
```javascript
const qrcodeUrl = ref('https://your-domain.com/qrcode.jpg');
```

#### 方式B：使用 GitHub/图床图片
```javascript
const qrcodeUrl = ref('https://raw.githubusercontent.com/your/repo/main/qrcode.png');
```

#### 方式C：使用 Base64 图片
```javascript
const qrcodeUrl = ref('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...');
```

#### 方式D：上传到项目（需要修改）
1. 将二维码图片放在 `public/qrcode.jpg`
2. 修改代码：
```javascript
const qrcodeUrl = ref('/qrcode.jpg');
```

### 3. 完整配置示例

```javascript
// pages/index.vue

// 配置信息
const wechatName = ref('我的公众号');
const qrcodeUrl = ref('https://example.com/qrcode.jpg');
```

---

## 📱 如何获取公众号二维码

### 方法1：微信后台生成
1. 登录微信公众号后台
2. 公众号设置 → 公众号二维码
3. 下载二维码图片

### 方法2：使用草料二维码
1. 访问 https://cli.im/
2. 输入你的公众号名称或ID
3. 生成并下载二维码

### 方法3：使用微信官方API
```bash
# 需要 access_token
curl "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=TOKEN" \
  -d '{"action_name": "QR_LIMIT_STR_SCENE", "action_info": {"scene": {"scene_str": "auth"}}}'
```

---

## 🎨 样式特点

### 视觉设计
- ✅ **圆角卡片**：3xl 大圆角，现代感
- ✅ **渐变背景**：蓝色到紫色渐变
- ✅ **毛玻璃效果**：backdrop-blur 半透明
- ✅ **装饰线条**：顶部渐变色条
- ✅ **动画效果**：淡入和缩放动画
- ✅ **悬停反馈**：按钮和输入框交互反馈

### 布局结构
```
弹窗容器
├── 装饰性顶部条（渐变色）
├── 头部（图标 + 标题）
├── 二维码区域（圆角卡片 + 边框）
│   ├── 二维码图片（160x160）
│   └── 说明文字
├── 验证码输入区
│   ├── 标签
│   ├── 输入框 + 验证按钮
│   └── 有效期提示
├── 消息提示区（动态显示）
├── 操作按钮（重新获取）
└── 底部说明
```

---

## 📝 修改建议

### 如果你没有二维码图片

可以暂时使用占位符，用户会看到：
```
📷
公众号二维码
请配置二维码图片
```

然后通过文字说明引导用户：
```
微信搜索公众号：你的公众号名称
```

### 如果你想添加二维码

1. 准备一张正方形二维码图片（建议 400x400px）
2. 上传到图床或服务器
3. 修改 `qrcodeUrl` 变量

---

## 🔧 代码位置

**文件**：`pages/index.vue`

**关键配置**：
- 第 143 行：公众号名称
- 第 144 行：二维码图片URL

**样式文件**：
- 第 261-295 行：CSS 动画和交互效果
