# SDK 弹窗防删除保护机制 - 测试文档

## 📋 功能概述

SDK 现已添加**弹窗保护机制**，防止用户从浏览器控制台删除或隐藏认证弹窗。

## 🔒 保护机制实现

### 1. 混合保护方案

```typescript
// Protection 模块结构
Protection = {
  enable()    // 启用保护
  disable()   // 禁用保护
  healthCheck()  // 定时健康检查
  restore()      // 恢复弹窗
}
```

### 2. 双重检测机制

#### **机制 1: MutationObserver（实时检测）**
- 监听 `document.body` 的 DOM 变化
- 检测 `childList` 变化（节点删除）
- 检测 `attributes` 变化（style 属性修改）
- **响应时间**: < 100ms

#### **机制 2: 定时器兜底（每秒检查）**
- 每秒检查一次弹窗状态
- 防止 MutationObserver 被绕过的情况
- **响应时间**: 最多 1 秒

### 3. 触发时机

```typescript
// 启用保护（UI.show() 时）
UI.show() → state.isOpen = true → Protection.enable()

// 禁用保护（UI.hide() 时）
UI.hide() → state.isOpen = false → Protection.disable()
```

## 🧪 测试方法

### 方式 1: 使用测试页面

1. 打开 `test-protection.html`
2. 点击 **"初始化 SDK"**
3. 点击 **"手动触发认证"** 显示弹窗
4. 尝试以下攻击：
   - **删除弹窗**: 点击 "删除弹窗" 按钮
   - **隐藏弹窗**: 点击 "隐藏弹窗" 按钮
   - **清空 body**: 点击 "清空 body" 按钮
5. 观察日志输出和自动恢复情况

### 方式 2: 浏览器控制台测试

```javascript
// 1. 初始化 SDK
WxAuth.init({
  apiBase: 'https://example.com',
  wechatName: '测试公众号',
  qrcodeUrl: 'https://via.placeholder.com/200x200/07C160/ffffff?text=QR'
});

// 2. 显示弹窗
await WxAuth.requireAuth();

// 3. 尝试删除（会被自动恢复）
document.getElementById('wx-auth-modal').remove();

// 4. 尝试隐藏（会被自动恢复）
document.getElementById('wx-auth-modal').style.display = 'none';

// 5. 清空 body（会被自动恢复）
document.body.innerHTML = '';
```

## ✅ 预期行为

| 攻击方式 | 预期结果 | 恢复时间 |
|---------|---------|---------|
| `modal.remove()` | 弹窗自动重新创建 | < 100ms |
| `modal.style.display='none'` | 自动恢复为 `flex` | < 100ms |
| `body.innerHTML = ''` | 弹窗自动重新创建 | < 100ms |
| 删除后等待 1 秒 | 定时器自动恢复 | 最多 1 秒 |

## 📊 日志输出示例

```
[WxAuth] SDK initialized {apiBase: 'https://example.com', ...}
[WxAuth] 弹窗保护已启用
[WxAuth] 检测到弹窗被删除，正在自动恢复...
[WxAuth] 健康检查：弹窗不存在，正在恢复...
```

## 🔍 技术细节

### MutationObserver 配置
```typescript
observer.observe(document.body, {
  childList: true,      // 监听子节点增删
  subtree: true,        // 监听所有后代节点
  attributes: true,     // 监听属性变化
  attributeFilter: ['style']  // 只监听 style 属性
});
```

### 性能优化
- **按需启用**: 仅在弹窗打开时启动保护
- **及时禁用**: 弹窗关闭后立即停止监听
- **防抖恢复**: 检查是否已存在，避免重复创建
- **状态检查**: 通过 `state.isOpen` 防止循环恢复

## ⚠️ 注意事项

1. **保护范围**: 仅保护 `#wx-auth-modal` 元素
2. **性能影响**: 仅在认证过程中启用，不影响其他操作
3. **浏览器兼容**: 支持所有现代浏览器（MutationObserver）
4. **控制台警告**: 每次恢复都会在控制台输出警告信息

## 🎯 测试结果

✅ **通过测试**:
- `modal.remove()` - ✅ 自动恢复
- `modal.style.display='none'` - ✅ 自动恢复
- `body.innerHTML = ''` - ✅ 自动恢复
- 多次攻击 - ✅ 持续保护

## 📝 代码位置

- **保护模块**: `wx-auth-sdk/src/wx-auth.ts` 第 58-199 行
- **UI 集成**: `wx-auth-sdk/src/wx-auth.ts` 第 364-387 行

## 🔧 配置选项

当前保护机制为**强制启用**，无需配置。未来可扩展为可选项：

```typescript
interface WxAuthConfig {
  // ... 现有配置
  protectModal?: boolean;  // 是否启用弹窗保护（默认: true）
}
```

---

**测试完成**: 2025-12-29
**SDK 版本**: 1.0.0+
**保护机制**: ✅ 已启用
