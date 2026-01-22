/**
 * TopMenuBar Component
 *
 * A horizontal menu bar with dropdown menus.
 * Used at the top of the editor for File, Rendering, Help menus.
 *
 * @example
 * ```ts
 * const menuBar = new TopMenuBar({
 *   menus: [
 *     { name: 'File', items: [{ label: 'New' }, { label: 'Open' }] }
 *   ],
 *   onItemClick: (menuName, itemLabel) => console.log(menuName, itemLabel)
 * });
 * container.appendChild(menuBar.element);
 * ```
 */

export interface MenuItem {
  /** Display label */
  label: string;
  /** Optional keyboard shortcut display */
  shortcut?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Separator after this item */
  separator?: boolean;
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

      for (const item of menu.items) {
        const menuItem = document.createElement('button');
        menuItem.className = `dropdown-item ${item.disabled ? 'disabled' : ''}`;

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

        if (!item.disabled) {
          menuItem.addEventListener('click', () => {
            this.closeAll();
            if (this.onItemClick) {
              this.onItemClick(menu.name, item.label);
            }
          });
        }

        dropdown.appendChild(menuItem);

        if (item.separator) {
          const separator = document.createElement('div');
          separator.className = 'menu-separator';
          separator.style.height = '1px';
          separator.style.background = 'var(--border-primary)';
          separator.style.margin = 'var(--spacing-xs) 0';
          dropdown.appendChild(separator);
        }
      }

      this.dropdowns.set(menu.name, dropdown);

      menuContainer.appendChild(trigger);
      menuContainer.appendChild(dropdown);
      this.container.appendChild(menuContainer);
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
 */
export const DEFAULT_MENUS: Menu[] = [
  {
    name: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N' },
      { label: 'Open', shortcut: 'Ctrl+O' },
      { label: 'Import', separator: true },
      { label: 'Export' },
      { label: 'Save', shortcut: 'Ctrl+S' },
      { label: 'Save As', shortcut: 'Ctrl+Shift+S', separator: true },
      { label: 'Exit' }
    ]
  },
  {
    name: 'Rendering',
    items: [
      { label: 'Render' },
      { label: 'Settings' },
      { label: 'Output' }
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
