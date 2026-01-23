/**
 * TopMenuBar Component
 *
 * A horizontal menu bar with dropdown menus and nested submenus.
 * Used at the top of the editor for File, Create, Rendering, Help menus.
 *
 * @example
 * ```ts
 * const menuBar = new TopMenuBar({
 *   menus: [
 *     { name: 'File', items: [{ label: 'New' }, { label: 'Open' }] },
 *     { name: 'Create', items: [
 *       { label: 'Primitives', children: [{ label: 'Cube' }, { label: 'Sphere' }] }
 *     ]}
 *   ],
 *   onItemClick: (menuName, itemLabel, parentLabel) => console.log(menuName, itemLabel)
 * });
 * container.appendChild(menuBar.element);
 * ```
 */

import { buildTopMenuBarCreateItems } from '../shared/CreateMenuDefinitions';

export interface MenuItem {
  /** Display label */
  label: string;
  /** Optional keyboard shortcut display */
  shortcut?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Separator after this item */
  separator?: boolean;
  /** Nested submenu items (creates a flyout menu on hover) */
  children?: MenuItem[];
}

export interface Menu {
  /** Menu name displayed in menu bar */
  name: string;
  /** Menu items */
  items: MenuItem[];
}

export interface TopMenuBarOptions {
  /** Menu definitions */
  menus: Menu[];
  /** Callback when a menu item is clicked */
  onItemClick?: (menuName: string, itemLabel: string) => void;
}

/**
 * Horizontal menu bar with dropdown menus.
 * NOT a plugin - standard UI component.
 */
export class TopMenuBar {
  private readonly container: HTMLDivElement;
  private readonly menus: Menu[];
  private readonly onItemClick?: (menuName: string, itemLabel: string) => void;

  private activeMenu: string | null = null;
  private dropdowns = new Map<string, HTMLDivElement>();

  constructor(options: TopMenuBarOptions) {
    this.menus = options.menus;
    this.onItemClick = options.onItemClick;

    this.container = document.createElement('div');
    this.container.className = 'menu-bar';

    this.render();
    this.setupGlobalClickHandler();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Update menu items programmatically.
   */
  updateMenu(menuName: string, items: MenuItem[]): void {
    const menu = this.menus.find(m => m.name === menuName);
    if (menu) {
      menu.items = items;
      this.render();
    }
  }

  /**
   * Close all open dropdowns.
   */
  closeAll(): void {
    this.activeMenu = null;
    this.dropdowns.forEach(dropdown => {
      dropdown.classList.add('hidden');
    });
    this.container.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  /**
   * Clean up.
   */
  dispose(): void {
    document.removeEventListener('click', this.handleGlobalClick);
    this.container.innerHTML = '';
  }

  private render(): void {
    this.container.innerHTML = '';
    this.dropdowns.clear();

    for (const menu of this.menus) {
      const menuContainer = document.createElement('div');
      menuContainer.className = 'menu-container';
      menuContainer.style.position = 'relative';

      // Menu trigger button
      const trigger = document.createElement('button');
      trigger.className = 'menu-item';
      trigger.textContent = menu.name;
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu(menu.name);
      });
      trigger.addEventListener('mouseenter', () => {
        if (this.activeMenu && this.activeMenu !== menu.name) {
          this.openMenu(menu.name);
        }
      });

      // Dropdown menu
      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown-menu hidden';

      this.renderMenuItems(dropdown, menu.items, menu.name);

      this.dropdowns.set(menu.name, dropdown);

      menuContainer.appendChild(trigger);
      menuContainer.appendChild(dropdown);
      this.container.appendChild(menuContainer);
    }
  }

  /**
   * Render menu items, supporting nested submenus.
   */
  private renderMenuItems(
    container: HTMLElement,
    items: MenuItem[],
    menuName: string,
    parentLabel?: string
  ): void {
    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0;

      const menuItem = document.createElement('div');
      menuItem.className = `dropdown-item ${item.disabled ? 'disabled' : ''} ${hasChildren ? 'has-submenu' : ''}`;
      menuItem.style.position = 'relative';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      menuItem.appendChild(labelSpan);

      if (item.shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.className = 'shortcut';
        shortcutSpan.textContent = item.shortcut;
        shortcutSpan.style.marginLeft = 'auto';
        shortcutSpan.style.color = 'var(--text-muted)';
        shortcutSpan.style.fontSize = 'var(--font-size-xs)';
        menuItem.appendChild(shortcutSpan);
        menuItem.style.display = 'flex';
        menuItem.style.justifyContent = 'space-between';
      }

      // Add submenu arrow indicator
      if (hasChildren) {
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'submenu-arrow';
        arrowSpan.textContent = '▶';
        arrowSpan.style.marginLeft = 'auto';
        arrowSpan.style.fontSize = '8px';
        arrowSpan.style.opacity = '0.7';
        menuItem.appendChild(arrowSpan);
        menuItem.style.display = 'flex';
        menuItem.style.justifyContent = 'space-between';
        menuItem.style.alignItems = 'center';
        menuItem.style.gap = 'var(--spacing-md)';

        // Create submenu container
        const submenu = document.createElement('div');
        submenu.className = 'submenu hidden';
        submenu.style.position = 'absolute';
        submenu.style.left = '100%';
        submenu.style.top = '0';
        submenu.style.marginLeft = '0';

        // Recursively render child items
        this.renderMenuItems(submenu, item.children!, menuName, item.label);

        menuItem.appendChild(submenu);

        // Show/hide submenu on hover
        menuItem.addEventListener('mouseenter', () => {
          // Hide any other open submenus at this level
          const siblings = container.querySelectorAll('.has-submenu > .submenu');
          siblings.forEach(s => s.classList.add('hidden'));
          submenu.classList.remove('hidden');
        });

        menuItem.addEventListener('mouseleave', (e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!menuItem.contains(relatedTarget)) {
            submenu.classList.add('hidden');
          }
        });
      } else if (!item.disabled) {
        // Leaf item - handle click
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeAll();
          if (this.onItemClick) {
            // Pass the full path for nested items
            if (parentLabel) {
              this.onItemClick(menuName, `${parentLabel}/${item.label}`);
            } else {
              this.onItemClick(menuName, item.label);
            }
          }
        });
      }

      container.appendChild(menuItem);

      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        separator.style.height = '1px';
        separator.style.background = 'var(--border-primary)';
        separator.style.margin = 'var(--spacing-xs) 0';
        container.appendChild(separator);
      }
    }
  }

  private toggleMenu(menuName: string): void {
    if (this.activeMenu === menuName) {
      this.closeAll();
    } else {
      this.openMenu(menuName);
    }
  }

  private openMenu(menuName: string): void {
    this.closeAll();
    this.activeMenu = menuName;

    const dropdown = this.dropdowns.get(menuName);
    if (dropdown) {
      dropdown.classList.remove('hidden');
    }

    // Mark trigger as active
    const triggers = this.container.querySelectorAll('.menu-item');
    triggers.forEach((trigger, index) => {
      if (this.menus[index]?.name === menuName) {
        trigger.classList.add('active');
      }
    });
  }

  private setupGlobalClickHandler(): void {
    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    document.addEventListener('click', this.handleGlobalClick);
  }

  private handleGlobalClick(e: MouseEvent): void {
    // Close menus if clicking outside
    if (!this.container.contains(e.target as Node)) {
      this.closeAll();
    }
  }
}

/**
 * Default menus for the WebGL Editor.
 * Create menu items are sourced from shared CreateMenuDefinitions.
 */
export const DEFAULT_MENUS: Menu[] = [
  {
    name: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N', disabled: true },
      { label: 'Open', shortcut: 'Ctrl+O', disabled: true },
      { label: 'Import', separator: true, disabled: true },
      { label: 'Export', disabled: true },
      { label: 'Save', shortcut: 'Ctrl+S', disabled: true },
      { label: 'Save As', shortcut: 'Ctrl+Shift+S', disabled: true }
    ]
  },
  {
    name: 'Create',
    items: buildTopMenuBarCreateItems()
  },
  {
    name: 'Rendering',
    items: [
      { label: 'Render', disabled: true },
      { label: 'Settings', disabled: true },
      { label: 'Output', disabled: true }
    ]
  },
  {
    name: 'Help',
    items: [
      { label: 'Documentation' },
      { label: 'About' }
    ]
  }
];
