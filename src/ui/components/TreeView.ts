/**
 * TreeView Component
 *
 * A hierarchical tree view for displaying scene objects.
 * Supports expand/collapse, selection, and icons.
 *
 * @example
 * ```ts
 * const tree = new TreeView({
 *   onSelect: (id) => console.log('Selected:', id)
 * });
 * tree.setData(sceneNodes);
 * container.appendChild(tree.element);
 * ```
 */

export interface TreeNode {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Node type for icon selection */
  type: 'group' | 'mesh' | 'material' | 'texture' | 'light';
  /** Child nodes */
  children?: TreeNode[];
}

export interface TreeViewOptions {
  /** Callback when a node is selected */
  onSelect?: (id: string, node: TreeNode) => void;
  /** Callback when a node is expanded/collapsed */
  onToggle?: (id: string, expanded: boolean) => void;
  /** Initially selected node ID */
  selectedId?: string;
  /** Initially expanded node IDs */
  expandedIds?: Set<string>;
}

/**
 * Hierarchical tree view component.
 * NOT a plugin - standard UI component.
 */
export class TreeView {
  private readonly container: HTMLDivElement;
  private data: TreeNode[] = [];
  private selectedId: string | null = null;
  private expandedIds: Set<string>;
  private readonly onSelect?: (id: string, node: TreeNode) => void;
  private readonly onToggle?: (id: string, expanded: boolean) => void;
  private nodeMap = new Map<string, TreeNode>();

  constructor(options: TreeViewOptions = {}) {
    this.onSelect = options.onSelect;
    this.onToggle = options.onToggle;
    this.selectedId = options.selectedId ?? null;
    this.expandedIds = options.expandedIds ?? new Set();

    this.container = document.createElement('div');
    this.container.className = 'tree-view';
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Set the tree data and re-render.
   */
  setData(data: TreeNode[]): void {
    this.data = data;
    this.buildNodeMap(data);
    this.render();
  }

  /**
   * Get the currently selected node ID.
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Select a node by ID.
   */
  select(id: string): void {
    if (this.nodeMap.has(id)) {
      this.selectedId = id;
      this.render();
      const node = this.nodeMap.get(id);
      if (node && this.onSelect) {
        this.onSelect(id, node);
      }
    }
  }

  /**
   * Expand a node by ID.
   */
  expand(id: string): void {
    this.expandedIds.add(id);
    this.render();
    if (this.onToggle) {
      this.onToggle(id, true);
    }
  }

  /**
   * Collapse a node by ID.
   */
  collapse(id: string): void {
    this.expandedIds.delete(id);
    this.render();
    if (this.onToggle) {
      this.onToggle(id, false);
    }
  }

  /**
   * Toggle expand/collapse state.
   */
  toggle(id: string): void {
    if (this.expandedIds.has(id)) {
      this.collapse(id);
    } else {
      this.expand(id);
    }
  }

  /**
   * Expand all nodes.
   */
  expandAll(): void {
    this.nodeMap.forEach((_, id) => {
      const node = this.nodeMap.get(id);
      if (node?.children && node.children.length > 0) {
        this.expandedIds.add(id);
      }
    });
    this.render();
  }

  /**
   * Collapse all nodes.
   */
  collapseAll(): void {
    this.expandedIds.clear();
    this.render();
  }

  /**
   * Clean up.
   */
  dispose(): void {
    this.container.innerHTML = '';
    this.nodeMap.clear();
  }

  private buildNodeMap(nodes: TreeNode[]): void {
    this.nodeMap.clear();
    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        this.nodeMap.set(node.id, node);
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
  }

  private render(): void {
    this.container.innerHTML = '';
    for (const node of this.data) {
      this.renderNode(node, 0);
    }
  }

  private renderNode(node: TreeNode, depth: number): void {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = this.expandedIds.has(node.id);
    const isSelected = this.selectedId === node.id;

    const item = document.createElement('div');
    item.className = `tree-item ${isSelected ? 'selected' : ''}`;
    item.style.paddingLeft = `${depth * 16 + 8}px`;
    item.dataset.id = node.id;

    // Expand button
    if (hasChildren) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'tree-expand-btn';
      expandBtn.innerHTML = isExpanded ? this.getChevronDown() : this.getChevronRight();
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(node.id);
      });
      item.appendChild(expandBtn);
    } else {
      const spacer = document.createElement('div');
      spacer.style.width = '16px';
      spacer.style.flexShrink = '0';
      item.appendChild(spacer);
    }

    // Icon
    const icon = document.createElement('span');
    icon.className = `tree-icon ${node.type}`;
    icon.innerHTML = this.getIcon(node.type);
    item.appendChild(icon);

    // Name
    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name;
    item.appendChild(name);

    // Click handler for selection
    item.addEventListener('click', () => {
      this.selectedId = node.id;
      this.render();
      if (this.onSelect) {
        this.onSelect(node.id, node);
      }
    });

    this.container.appendChild(item);

    // Render children if expanded
    if (hasChildren && isExpanded && node.children) {
      for (const child of node.children) {
        this.renderNode(child, depth + 1);
      }
    }
  }

  private getChevronRight(): string {
    return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  private getChevronDown(): string {
    return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  private getIcon(type: TreeNode['type']): string {
    switch (type) {
      case 'mesh':
        // Box icon
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5L8 2L14 5V11L8 14L2 11V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 8V14M8 8L2 5M8 8L14 5" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
      case 'group':
        // Folder/package icon
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4C2 3.44772 2.44772 3 3 3H6L8 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
      case 'material':
        // Circle icon
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
      case 'texture':
        // Grid icon
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>
          <rect x="9" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>
          <rect x="2" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>
          <rect x="9" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
      case 'light':
        // Sun icon
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 2V3M8 13V14M2 8H3M13 8H14M4 4L4.7 4.7M11.3 11.3L12 12M4 12L4.7 11.3M11.3 4.7L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
      default:
        return '';
    }
  }
}
