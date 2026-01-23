/**
 * HierarchyPanel
 *
 * Displays the scene graph as a tree view.
 * NOT a plugin - standard UI panel.
 *
 * @example
 * ```ts
 * const panel = new HierarchyPanel({
 *   eventBus,
 *   sceneGraph
 * });
 * container.appendChild(panel.element);
 * ```
 */

import { EventBus } from '@core/EventBus';
import { SceneGraph, SceneObject } from '@core/SceneGraph';
import { isEntity } from '@core/interfaces';
import { TreeView, TreeNode, ContextMenuData } from '../components/TreeView';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';

export interface HierarchyPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph to display */
  sceneGraph: SceneGraph;
}

/**
 * Available primitives for the Create context menu.
 * Matches the Create menu structure in TopMenuBar.
 */
const CREATE_MENU_ITEMS: ContextMenuItem[] = [
  {
    label: 'Primitives',
    children: [
      { label: 'Cube', action: undefined }, // Action set dynamically
      { label: 'Sphere', disabled: true },
      { label: 'Plane', disabled: true },
      { label: 'Cylinder', disabled: true },
      { label: 'Cone', disabled: true },
      { label: 'Torus', disabled: true }
    ]
  },
  {
    label: 'Lights',
    children: [
      { label: 'Point Light', disabled: true },
      { label: 'Directional Light', disabled: true },
      { label: 'Spot Light', disabled: true }
    ]
  },
  { label: 'Camera', disabled: true },
  { label: 'Empty', disabled: true }
];

/**
 * Scene hierarchy panel displaying the scene tree.
 * NOT a plugin - receives dependencies via constructor.
 */
export class HierarchyPanel {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly treeView: TreeView;
  private readonly header: HTMLDivElement;
  private readonly content: HTMLDivElement;

  constructor(options: HierarchyPanelOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'panel hierarchy-panel';

    // Create header
    this.header = document.createElement('div');
    this.header.className = 'panel-header';
    this.header.innerHTML = `
      <span class="panel-header-title">Hierarchy</span>
    `;

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'panel-content';

    // Create tree view
    this.treeView = new TreeView({
      onSelect: this.handleSelect.bind(this),
      onToggle: this.handleToggle.bind(this),
      onRename: this.handleRename.bind(this),
      onContextMenu: this.handleContextMenu.bind(this),
      expandedIds: new Set(['root'])
    });

    // Assemble
    this.content.appendChild(this.treeView.element);
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);

    // Add right-click handler for empty space (Create menu)
    this.content.addEventListener('contextmenu', this.handleEmptySpaceContextMenu.bind(this));

    // Setup event listeners
    this.setupEvents();

    // Initial render
    this.refresh();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Refresh the tree view from the scene graph.
   */
  refresh(): void {
    const treeData = this.convertSceneToTree();
    this.treeView.setData(treeData);
  }

  /**
   * Select an object by ID.
   */
  select(id: string): void {
    this.treeView.select(id);
  }

  /**
   * Clean up.
   */
  dispose(): void {
    this.eventBus.off('scene:objectAdded', this.handleSceneChange);
    this.eventBus.off('scene:objectRemoved', this.handleSceneChange);
    this.eventBus.off('scene:objectRenamed', this.handleSceneChange);
    this.treeView.dispose();
  }

  private setupEvents(): void {
    this.handleSceneChange = this.handleSceneChange.bind(this);

    this.eventBus.on('scene:objectAdded', this.handleSceneChange);
    this.eventBus.on('scene:objectRemoved', this.handleSceneChange);
    this.eventBus.on('scene:objectRenamed', this.handleSceneChange);
  }

  private handleSceneChange(): void {
    this.refresh();
  }

  private handleSelect(id: string): void {
    this.eventBus.emit('selection:changed', { id });
  }

  private handleToggle(id: string, expanded: boolean): void {
    this.eventBus.emit('hierarchy:toggle', { id, expanded });
  }

  private handleRename(id: string, newName: string): void {
    const obj = this.sceneGraph.find(id);
    if (obj) {
      this.sceneGraph.rename(obj, newName);
    }
  }

  /**
   * Handle right-click context menu on a tree node.
   * Only shows context menu for mesh entities (not cameras).
   */
  private handleContextMenu(data: ContextMenuData): void {
    const { node, x, y } = data;

    // Don't show context menu for root or camera nodes
    if (node.id === 'root' || node.type === 'camera') {
      return;
    }

    // Only show for mesh entities
    if (node.type !== 'mesh') {
      return;
    }

    const sceneObj = this.sceneGraph.find(node.id);
    if (!sceneObj) return;

    // Capture eventBus reference for closures
    const eventBus = this.eventBus;
    const treeView = this.treeView;

    // Build context menu items
    const items: ContextMenuItem[] = [
      {
        label: 'Delete',
        action: () => {
          eventBus.emit('entity:requestDelete', { id: node.id });
        }
      },
      {
        label: 'Rename',
        action: () => {
          // Trigger inline rename via the tree view
          treeView.startEditingById(node.id);
        }
      },
      { type: 'separator' },
      {
        label: 'Duplicate',
        action: () => {
          eventBus.emit('entity:requestDuplicate', { id: node.id });
        }
      }
    ];

    // Show the context menu
    const menu = new ContextMenu();
    menu.show({ x, y, items });
  }

  private convertSceneToTree(): TreeNode[] {
    const root = this.sceneGraph.getRoot();
    return [this.convertObjectToNode(root)];
  }

  private convertObjectToNode(obj: SceneObject): TreeNode {
    const node: TreeNode = {
      id: obj.id,
      name: obj.name,
      type: this.getNodeType(obj),
      children: obj.children.map(child => this.convertObjectToNode(child))
    };
    return node;
  }

  private getNodeType(obj: SceneObject): TreeNode['type'] {
    // Determine type based on object properties
    if (obj.id === 'root') {
      return 'group';
    }

    // Check if it's an entity with specific component types
    if (isEntity(obj)) {
      // Camera entity
      if (obj.hasComponent('camera')) {
        return 'camera';
      }
      // Light entity (for future use)
      if (obj.hasComponent('light')) {
        return 'light';
      }
      // Mesh entity
      if (obj.hasComponent('mesh')) {
        return 'mesh';
      }
    }

    // Check for children (group)
    if (obj.children.length > 0) {
      return 'group';
    }

    // Default to mesh for objects without children
    return 'mesh';
  }

  /**
   * Handle right-click on empty space in the hierarchy panel.
   * Shows the Create context menu for adding new objects.
   */
  private handleEmptySpaceContextMenu(e: MouseEvent): void {
    // Only handle if clicking directly on the content area (empty space)
    // not on a tree item (which has its own context menu)
    const target = e.target as HTMLElement;
    const isTreeItem = target.closest('.tree-item');

    if (isTreeItem) {
      // Let the tree item handle its own context menu
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Build Create context menu items with actions bound
    const items = this.buildCreateMenuItems();

    // Show the context menu
    const menu = new ContextMenu();
    menu.show({ x: e.clientX, y: e.clientY, items });
  }

  /**
   * Build the Create context menu items with proper actions.
   * Creates a deep copy of CREATE_MENU_ITEMS with actions bound to emit events.
   */
  private buildCreateMenuItems(): ContextMenuItem[] {
    const bindActions = (items: ContextMenuItem[]): ContextMenuItem[] => {
      return items.map(item => {
        const newItem: ContextMenuItem = { ...item };

        if (item.children) {
          newItem.children = bindActions(item.children);
        } else if (!item.disabled && item.label) {
          // Leaf item - bind action to emit create event
          newItem.action = () => {
            this.eventBus.emit('hierarchy:createPrimitive', { type: item.label });
          };
        }

        return newItem;
      });
    };

    return bindActions(CREATE_MENU_ITEMS);
  }
}
