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
import { TreeView, TreeNode } from '../components/TreeView';

export interface HierarchyPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph to display */
  sceneGraph: SceneGraph;
}

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
      expandedIds: new Set(['root'])
    });

    // Assemble
    this.content.appendChild(this.treeView.element);
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);

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

    // Check for children (group)
    if (obj.children.length > 0) {
      return 'group';
    }

    // Default to mesh for objects without children
    return 'mesh';
  }
}
