/**
 * ContextMenu Component
 *
 * A simple context menu (right-click menu) component.
 * Displays at specified coordinates and auto-dismisses on click elsewhere.
 *
 * @example
 * ```ts
 * const menu = new ContextMenu();
 * menu.show({
 *   x: event.clientX,
 *   y: event.clientY,
 *   items: [
 *     { label: 'Delete', action: () => deleteItem(), icon: '🗑️' },
 *     { label: 'Rename', action: () => renameItem() },
 *     { type: 'separator' },
 *     { label: 'Duplicate', action: () => duplicateItem() }
 *   ]
 * });
 * ```
 */

export interface ContextMenuItem {
  /** Display label */
  label?: string;
  /** Action to perform when clicked */
  action?: () => void;
  /** Optional icon (emoji or text) */
  icon?: string;
  /** Item type: 'item' (default) or 'separator' */
  type?: 'item' | 'separator';
  /** Whether the item is disabled */
  disabled?: boolean;
}

export interface ContextMenuOptions {
  /** X position (clientX) */
  x: number;
  /** Y position (clientY) */
  y: number;
  /** Menu items */
  items: ContextMenuItem[];
}

/**
 * Context menu component.
 * Only one context menu can be visible at a time (singleton pattern).
 */
export class ContextMenu {
  private static instance: ContextMenu | null = null;
  private readonly container: HTMLDivElement;
  private isVisible = false;

  constructor() {
    // Singleton - close any existing menu
    if (ContextMenu.instance) {
      ContextMenu.instance.hide();
    }
    ContextMenu.instance = this;

    this.container = document.createElement('div');
    this.container.className = 'context-menu';
    this.container.style.cssText = `
      position: fixed;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 120px;
      z-index: 10000;
      display: none;
      padding: 4px 0;
      font-size: 12px;
    `;

    document.body.appendChild(this.container);

    // Close on click outside
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Show the context menu at specified position.
   */
  show(options: ContextMenuOptions): void {
    const { x, y, items } = options;

    // Build menu items
    this.container.innerHTML = '';
    for (const item of items) {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        separator.style.cssText = `
          height: 1px;
          background: var(--border-color);
          margin: 4px 8px;
        `;
        this.container.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''}`;
        menuItem.style.cssText = `
          padding: 6px 12px;
          cursor: ${item.disabled ? 'default' : 'pointer'};
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)'};
          opacity: ${item.disabled ? '0.5' : '1'};
        `;

        // Add icon if present
        if (item.icon) {
          const icon = document.createElement('span');
          icon.textContent = item.icon;
          icon.style.width = '16px';
          menuItem.appendChild(icon);
        }

        // Add label
        const label = document.createElement('span');
        label.textContent = item.label ?? '';
        menuItem.appendChild(label);

        // Hover effect
        if (!item.disabled) {
          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = 'var(--bg-tertiary)';
          });
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
          });

          // Click handler
          menuItem.addEventListener('click', () => {
            if (item.action) {
              item.action();
            }
            this.hide();
          });
        }

        this.container.appendChild(menuItem);
      }
    }

    // Position the menu
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.display = 'block';
    this.isVisible = true;

    // Adjust position if menu goes off screen
    requestAnimationFrame(() => {
      const rect = this.container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        this.container.style.left = `${viewportWidth - rect.width - 5}px`;
      }
      if (rect.bottom > viewportHeight) {
        this.container.style.top = `${viewportHeight - rect.height - 5}px`;
      }
    });

    // Add event listeners
    document.addEventListener('click', this.handleClickOutside);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('contextmenu', this.handleClickOutside);
  }

  /**
   * Hide the context menu.
   */
  hide(): void {
    if (!this.isVisible) return;

    this.container.style.display = 'none';
    this.isVisible = false;

    // Remove event listeners
    document.removeEventListener('click', this.handleClickOutside);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('contextmenu', this.handleClickOutside);
  }

  /**
   * Clean up the context menu.
   */
  dispose(): void {
    this.hide();
    this.container.remove();
    if (ContextMenu.instance === this) {
      ContextMenu.instance = null;
    }
  }

  private handleClickOutside(e: MouseEvent): void {
    if (!this.container.contains(e.target as Node)) {
      this.hide();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide();
    }
  }
}
