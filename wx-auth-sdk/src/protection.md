# 弹窗保护模块 (Protection)

## 📦 模块概述

独立的弹窗保护模块，用于防止用户从浏览器控制台删除或隐藏认证弹窗。

## 📁 文件结构

```
wx-auth-sdk/src/
├── protection.ts      # 保护模块（独立文件）
├── wx-auth.ts         # SDK 主文件（导入 Protection）
└── wx-auth.css        # 样式文件
```

## 🔧 API 接口

### Protection.enable(config)

启用弹窗保护。

**参数：**
```typescript
interface ProtectionConfig {
  modalId: string;              // 弹窗元素 ID
  getState: () => {             // 获取状态的函数
    isOpen: boolean;
  };
  onRestore: () => void;        // 恢复弹窗的回调
}
```

**示例：**
```typescript
Protection.enable({
  modalId: "wx-auth-modal",
  getState: () => state,
  onRestore: () => {
    // 重新创建弹窗并恢复配置
    UI.createModal();
    UI.setQrCode(config.qrcodeUrl);
    UI.bindInputEvents();
  }
});
```

### Protection.disable()

禁用弹窗保护。

**示例：**
```typescript
Protection.disable();
```

## 🎯 工作原理

### 1. MutationObserver（实时检测）
```typescript
// 监听 DOM 变化
observer.observe(document.body, {
  childList: true,      // 子节点增删
  subtree: true,        // 所有后代节点
  attributes: true,     // 属性变化
  attributeFilter: ['style']  // 只监听 style
});
```

**检测场景：**
- `modal.remove()` - 节点删除
- `modal.style.display = 'none'` - 属性修改
- `body.innerHTML = ''` - 批量删除

### 2. 定时器兜底（每秒检查）
```typescript
setInterval(() => healthCheck(), 1000);
```

**作用：**
- 防止 MutationObserver 被绕过
- 提供双重保险
- 最多 1 秒延迟恢复

## 📊 保护流程

```
启用保护
    ↓
MutationObserver 监听
    ↓
检测到攻击？
    ├─ 是 → 立即恢复（< 100ms）
    └─ 否 → 继续监听
            ↓
    定时器检查（每秒）
            ↓
    检测到异常？
        ├─ 是 → 恢复（≤ 1000ms）
        └─ 否 → 继续检查
```

## 🔒 安全特性

1. **防循环恢复**
   ```typescript
   if (!getState().isOpen) return; // 防止无限循环
   ```

2. **按需启用**
   - 仅在弹窗打开时启用
   - 弹窗关闭后立即禁用
   - 不影响其他页面操作

3. **智能恢复**
   - 检查是否已存在
   - 仅恢复显示状态
   - 保留用户配置

## 🎨 使用示例

### 在 SDK 中使用

```typescript
// wx-auth.ts
import { Protection } from './protection';

const UI = {
  show(): void {
    // ... 创建弹窗
    state.isOpen = true;

    // 启用保护
    Protection.enable({
      modalId: "wx-auth-modal",
      getState: () => state,
      onRestore: () => {
        // 恢复逻辑
        this.createModal();
        this.setQrCode(config.qrcodeUrl);
        this.bindInputEvents();
      }
    });
  },

  hide(): void {
    // ... 隐藏弹窗
    state.isOpen = false;

    // 禁用保护
    Protection.disable();
  }
};
```

### 独立使用

```typescript
import { Protection } from './protection';

// 启用保护
Protection.enable({
  modalId: "my-modal",
  getState: () => ({ isOpen: true }),
  onRestore: () => {
    console.log('恢复弹窗');
    // 自定义恢复逻辑
  }
});

// 禁用保护
Protection.disable();
```

## 📝 配置说明

| 配置项 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| `modalId` | `string` | 弹窗元素的 ID | ✅ |
| `getState` | `() => { isOpen: boolean }` | 获取弹窗状态的函数 | ✅ |
| `onRestore` | `() => void` | 恢复弹窗的回调函数 | ✅ |

## ⚡ 性能影响

- **CPU**: 极低（仅在保护启用时）
- **内存**: < 1KB（Observer + Timer）
- **响应时间**: < 100ms（MutationObserver）
- **兜底延迟**: ≤ 1000ms（定时器）

## 🔍 调试

控制台会输出以下日志：

```
[WxAuth] 弹窗保护已启用          // 保护开启
[WxAuth] 检测到弹窗被删除...     // MutationObserver 检测到删除
[WxAuth] 健康检查：弹窗不存在... // 定时器检测到异常
[WxAuth] 弹窗保护已禁用          // 保护关闭
```

## 🎯 设计优势

1. **独立模块** - 可单独使用，不依赖 SDK
2. **零依赖** - 原生 JavaScript，无第三方库
3. **可配置** - 通过参数适配不同场景
4. **易测试** - 纯函数，无副作用
5. **高性能** - 按需启用，及时清理

## 📚 与其他模块的关系

```
wx-auth.ts (主 SDK)
    ↓ 导入
protection.ts (保护模块)
    ↓ 使用
UI.show() / UI.hide()
```

**职责分离：**
- `protection.ts` - 仅负责保护逻辑
- `wx-auth.ts` - 负责业务逻辑
- `UI` - 负责 DOM 操作

---

**版本**: 1.0.0
**更新时间**: 2025-12-29
