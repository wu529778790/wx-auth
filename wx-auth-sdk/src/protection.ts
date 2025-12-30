/**
 * 弹窗保护模块
 *
 * 功能：防止用户从控制台删除或隐藏认证弹窗
 *
 * 特性：
 * - MutationObserver 实时检测 DOM 变化
 * - 定时器兜底检查（每秒一次）
 * - 智能恢复机制（防止循环）
 * - 零依赖，原生 JavaScript
 */

interface ProtectionState {
  observer: MutationObserver | null;
  healthCheckTimer: number | null;
  isProtected: boolean;
}

interface ProtectionConfig {
  modalId: string;
  getState: () => { isOpen: boolean };
  onRestore: () => void;
}

const protection: ProtectionState = {
  observer: null,
  healthCheckTimer: null,
  isProtected: false,
};

/**
 * 弹窗保护器
 */
export const Protection = {
  /**
   * 启用弹窗保护
   * @param config 配置选项
   */
  enable(config: ProtectionConfig): void {
    if (protection.isProtected || typeof window === "undefined") return;

    const { modalId, getState } = config;

    // MutationObserver - 实时检测 DOM 变化
    protection.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          // 检查被删除的节点
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              // 检查是否删除了弹窗本身或包含弹窗的元素
              if (
                el.id === modalId ||
                el.querySelector?.(`#${modalId}`)
              ) {
                console.warn(
                  `[WxAuth] 检测到弹窗被删除，正在自动恢复...`
                );
                this.restore(config);
              }
            }
          });
        } else if (mutation.type === "attributes") {
          // 检查属性变化（如 style.display = 'none'）
          const target = mutation.target as HTMLElement;
          if (
            target.id === modalId &&
            mutation.attributeName === "style"
          ) {
            if (target.style.display === "none" && getState().isOpen) {
              console.warn(
                `[WxAuth] 检测到弹窗被隐藏，正在自动恢复...`
              );
              target.style.display = "flex";
            }
          }
        }
      });
    });

    // 监听 body 的子元素和属性变化
    protection.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    // 定时器兜底 - 每秒检查一次
    protection.healthCheckTimer = window.setInterval(() => {
      this.healthCheck(config);
    }, 1000);

    protection.isProtected = true;
    console.log("[WxAuth] 弹窗保护已启用");
  },

  /**
   * 禁用弹窗保护
   */
  disable(): void {
    if (protection.observer) {
      protection.observer.disconnect();
      protection.observer = null;
    }
    if (protection.healthCheckTimer) {
      clearInterval(protection.healthCheckTimer);
      protection.healthCheckTimer = null;
    }
    protection.isProtected = false;
    console.log("[WxAuth] 弹窗保护已禁用");
  },

  /**
   * 健康检查（定时器调用）
   * @param config 配置选项
   */
  healthCheck(config: ProtectionConfig): void {
    const { modalId, getState } = config;

    if (!getState().isOpen) return; // 未开启时不检查

    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn("[WxAuth] 健康检查：弹窗不存在，正在恢复...");
      this.restore(config);
      return;
    }

    // 检查是否被隐藏
    if (modal.style.display === "none") {
      console.warn("[WxAuth] 健康检查：弹窗被隐藏，正在恢复...");
      modal.style.display = "flex";
    }
  },

  /**
   * 恢复弹窗
   * @param config 配置选项
   */
  restore(config: ProtectionConfig): void {
    const { modalId, getState, onRestore } = config;

    // 防止循环恢复
    if (!getState().isOpen) return;

    // 检查是否已存在
    const existing = document.getElementById(modalId);
    if (existing) {
      // 仅恢复显示状态
      existing.style.display = "flex";
      return;
    }

    // 调用外部恢复逻辑
    onRestore();
  },
};
