/**
 * 弹窗保护模块
 *
 * 目标：F12 删弹窗、隐藏弹窗、改 display/visibility/opacity 后，弹窗立刻恢复
 *
 * 防御分层（按触发速度排序）：
 *   1. MutationObserver — 最快，DOM 变化瞬间触发（被删、被改 style）
 *   2. requestAnimationFrame 主动轮询 — ~60Hz，补上 observer 的缝隙
 *      - observer 对"暂停 JS 后删 DOM 再恢复"无能为力，rAF 会立刻发现
 *      - 弹窗关闭时不启动，零开销
 *   两个机制并行，任一触发都会走到同一个 restore()
 */

interface ProtectionState {
  observer: MutationObserver | null;
  rafId: number | null;
  isProtected: boolean;
  restorePending: boolean;
}

interface ProtectionConfig {
  modalId: string;
  getState: () => { isOpen: boolean };
  onRestore: () => void;
}

const protection: ProtectionState = {
  observer: null,
  rafId: null,
  isProtected: false,
  restorePending: false,
};

/**
 * 弹窗保护器
 */
export const Protection = {
  /**
   * 启用弹窗保护
   */
  enable(config: ProtectionConfig): void {
    if (protection.isProtected || typeof window === 'undefined') return;
    // 清理旧状态（防御性，enable 不应被连续调用）
    if (protection.observer) { protection.observer.disconnect(); protection.observer = null; }
    if (protection.rafId !== null) { cancelAnimationFrame(protection.rafId); protection.rafId = null; }
    protection.isProtected = true;
    protection.restorePending = false;

    // ---- 1. MutationObserver：实时检测 DOM 删除 ----
    //    style 隐藏类操作（display/visibility/opacity）由 rAF 轮询兜底，
    //    这里只做删除检测，避免 observer 内重复逻辑
    protection.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as HTMLElement;
          if (el.id === config.modalId || el.querySelector?.(`#${config.modalId}`)) {
            console.warn('[WxAuth] 检测到弹窗被删除，正在恢复...');
            Protection.safeRestore(config);
            return;
          }
        }
      }
    });
    protection.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ---- 2. requestAnimationFrame：每帧检查弹窗存在性和可见性 ----
    const tick = () => {
      if (!protection.isProtected) return;
      const { getState } = config;
      if (!getState().isOpen) {
        // 弹窗已关闭 → 停掉本轮，下次 enable 重新调度
        protection.rafId = null;
        return;
      }

      const modal = document.getElementById(config.modalId);
      const needRestore = !modal || !modal.isConnected || Protection.isHidden(modal);

      if (needRestore) {
        console.warn(
          '[WxAuth] 轮询检测到弹窗丢失/隐藏，正在恢复...',
          { has: !!modal, connected: modal?.isConnected, hidden: modal ? Protection.isHidden(modal) : null }
        );
        Protection.safeRestore(config);
      }

      // 下一帧继续（如果仍处于 protect 状态）
      if (protection.isProtected) {
        protection.rafId = requestAnimationFrame(tick);
      }
    };
    protection.rafId = requestAnimationFrame(tick);

    console.log('[WxAuth] 弹窗保护已启用 (MutationObserver + rAF)');
  },

  /**
   * 禁用弹窗保护
   */
  disable(): void {
    if (protection.observer) {
      protection.observer.disconnect();
      protection.observer = null;
    }
    if (protection.rafId !== null) {
      cancelAnimationFrame(protection.rafId);
      protection.rafId = null;
    }
    protection.isProtected = false;
    protection.restorePending = false;
    console.log('[WxAuth] 弹窗保护已禁用');
  },

  /**
   * 同一帧内避免重复恢复
   */
  safeRestore(config: ProtectionConfig): void {
    if (protection.restorePending) return;
    protection.restorePending = true;
    try {
      Protection.restoreFn(config);
    } finally {
      // 下一帧才允许下一次恢复，防止死循环
      requestAnimationFrame(() => {
        protection.restorePending = false;
      });
    }
  },

  /**
   * 检查 modal 是否被隐藏（display:none / visibility:hidden / opacity:0 任一即认为不可见）
   */
  isHidden(el: HTMLElement): boolean {
    if (el.style.display === 'none') return true;
    if (el.style.visibility === 'hidden') return true;
    if (el.style.opacity === '0') return true;

    // 兜底：读取 computedStyle，防止从父继承隐藏
    try {
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return true;
      }
    } catch {
      // getComputedStyle 失败时忽略
    }
    return false;
  },

  /**
   * 恢复弹窗
   */
  restoreFn(config: ProtectionConfig): void {
    const { modalId, getState, onRestore } = config;
    if (!getState().isOpen) return;

    const existing = document.getElementById(modalId);
    if (existing) {
      // 还在 DOM → 只是改坏了 style，直接修复
      existing.style.display = 'flex';
      existing.style.visibility = 'visible';
      existing.style.opacity = '1';
      return;
    }
    // 完全被删 → 调用外部重绘
    onRestore();
  },
};
