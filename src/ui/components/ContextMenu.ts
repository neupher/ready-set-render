/**
 * ContextMenu Component
 *
 * A context menu (right-click menu) component with nested submenu support.
 * Displays at specified coordinates and auto-dismisses on click elsewhere.
 *
 * @example
 * ```ts
 * const menu = new ContextMenu();
 * menu.show({
 *   x: event.clientX,
 *   y: event.clientY,
 *   items: [
 *     { label: 'Delete', action: () => deleteItem() },
 *     { label: 'Rename', action: () => renameItem() },
 *     { type: 'separator' },
 *     {
 *       label: 'Create',
 *       children: [
 *         { label: 'Cube', action: () => createCube() },
 *         { label: 'Sphere', action: () => createSphere(), disabled: true }
 *       ]
 *     }
 *   ]
 * });
 * ```
 */

export interface ContextMenuItem {
  /** Display label */
  label?: string;
  /** Action to perform when clicked (leaf items only) */
  action?: () => void;
  /** Optional icon (emoji or text) */
  icon?: string;
  /** Item type: 'item' (default) or 'separator' */
  type?: 'item' | 'separator';
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Nested submenu items (creates a flyout menu on hover) */
  children?: ContextMenuItem[];
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
 * Context menu component with nested submenu support.
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
    this.applyMenuStyles(this.container);

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
    this.renderMenuItems(this.container, items);

    // Position the menu
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.display = 'block';
    this.isVisible = true;

    // Adjust position if menu goes off screen
    requestAnimationFrame(() => {
      this.adjustMenuPosition(this.container, x, y);
    });

    // Add event listeners with a small delay to prevent immediate dismissal
    // This is needed because the contextmenu event that triggered the show
    // might also trigger a click event on some browsers
    requestAnimationFrame(() => {
      document.addEventListener('click', this.handleClickOutside);
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('contextmenu', this.handleClickOutside);
    });
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

  /**
   * Apply standard menu container styles.
   */
  private applyMenuStyles(element: HTMLDivElement): void {
    element.style.cssText = `
      position: fixed;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 140px;
      z-index: 10000;
      display: none;
      padding: 4px 0;
      font-size: 12px;
    `;
  }

  /**
   * Render menu items recursively, supporting nested submenus.
   */
  private renderMenuItems(container: HTMLElement, items: ContextMenuItem[]): void {
    for (const item of items) {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        separator.style.cssText = `
          height: 1px;
          background: var(--border-color);
          margin: 4px 8px;
        `;
        container.appendChild(separator);
      } else {
        const hasChildren = item.children && item.children.length > 0;
        const menuItem = document.createElement('div');
        menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''} ${hasChildren ? 'has-submenu' : ''}`;
        menuItem.style.cssText = `
          padding: 6px 12px;
          cursor: ${item.disabled ? 'default' : 'pointer'};
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)'};
          opacity: ${item.disabled ? '0.5' : '1'};
          position: relative;
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
        label.style.flex = '1';
        menuItem.appendChild(label);

        // Add submenu arrow indicator for items with children
        if (hasChildren) {
          const arrow = document.createElement('span');
          arrow.className = 'submenu-arrow';
          arrow.textContent = '▶';
          arrow.style.cssText = `
            font-size: 8px;
            opacity: 0.7;
            margin-left: auto;
          `;
          menuItem.appendChild(arrow);

          // Create submenu container
          const submenu = document.createElement('div');
          submenu.className = 'context-submenu';
          submenu.style.cssText = `
            position: absolute;
            left: 100%;
            top: -4px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 140px;
            padding: 4px 0;
            font-size: 12px;
            display: none;
            z-index: 10001;
          `;

          // Recursively render child items
          this.renderMenuItems(submenu, item.children!);
          menuItem.appendChild(submenu);

          // Show/hide submenu on hover
          menuItem.addEventListener('mouseenter', () => {
            if (!item.disabled) {
              menuItem.style.background = 'var(--bg-tertiary)';
              // Hide any other open submenus at this level
              const siblings = container.querySelectorAll('.has-submenu > .context-submenu');
              siblings.forEach(s => (s as HTMLElement).style.display = 'none');
              submenu.style.display = 'block';

              // Adjust submenu position if it goes off screen
              requestAnimationFrame(() => {
                const rect = submenu.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // If submenu goes off right edge, show on left side
                if (rect.right > viewportWidth) {
                  submenu.style.left = 'auto';
                  submenu.style.right = '100%';
                }

                // If submenu goes off bottom edge, adjust upward
                if (rect.bottom > viewportHeight) {
                  const overflow = rect.bottom - viewportHeight + 5;
                  submenu.style.top = `${-4 - overflow}px`;
                }
              });
            }
          });

          menuItem.addEventListener('mouseleave', (e) => {
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!menuItem.contains(relatedTarget)) {
              menuItem.style.background = 'transparent';
              submenu.style.display = 'none';
            }
          });
        } else if (!item.disabled) {
          // Leaf item - handle click and hover
          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = 'var(--bg-tertiary)';
            // Hide any sibling submenus when hovering over a leaf item
            const siblings = container.querySelectorAll('.has-submenu > .context-submenu');
            siblings.forEach(s => (s as HTMLElement).style.display = 'none');
          });
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
          });

          // Click handler
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.action) {
              item.action();
            }
            this.hide();
          });
        }

        container.appendChild(menuItem);
      }
    }
  }

  /**
   * Adjust menu position if it goes off screen.
   */
  private adjustMenuPosition(menu: HTMLElement, x: number, y: number): void {
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${y - rect.height}px`;
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
