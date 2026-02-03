/**
 * AssetBrowserTab
 *
 * A tab component for browsing and managing assets (materials, shaders).
 * Displays assets in two sections:
 * - Built-in: Immutable framework assets (shaders, materials)
 * - Project: User's project assets (when a project is open)
 *
 * @example
 * ```ts
 * const tab = new AssetBrowserTab({
 *   eventBus,
 *   assetRegistry,
 *   materialFactory,
 *   shaderFactory,
 *   projectService  // optional
 * });
 * container.appendChild(tab.element);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { AssetRegistry, AssetRegisteredEvent, AssetUnregisteredEvent, AssetModifiedEvent } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import type { ShaderAssetFactory } from '@core/assets/ShaderAssetFactory';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';
import type { IAsset } from '@core/assets/interfaces/IAsset';
import type { ProjectService } from '@core/ProjectService';
import type { ProjectOpenedEvent, ProjectClosedEvent } from '@core/interfaces/IProjectService';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import { TreeView, TreeNode, ContextMenuData } from '../components/TreeView';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';

/**
 * Options for creating an AssetBrowserTab.
 */
export interface AssetBrowserTabOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Asset registry to read from */
  assetRegistry: AssetRegistry;
  /** Factory for creating materials */
  materialFactory: MaterialAssetFactory;
  /** Factory for creating shaders */
  shaderFactory: ShaderAssetFactory;
  /** Project service for project-based workflow (optional) */
  projectService?: ProjectService;
}

/**
 * Event emitted when an asset is selected in the browser.
 */
export interface AssetSelectedEvent {
  asset: IAsset;
}

/**
 * Event emitted when shader editing is requested.
 */
export interface ShaderEditRequestedEvent {
  shader: IShaderAsset;
}

/**
 * Special node IDs for section and category groups.
 */
const SECTION_IDS = {
  BUILT_IN: '__section_builtin__',
  PROJECT: '__section_project__',
} as const;

const CATEGORY_IDS = {
  BUILTIN_MATERIALS: '__category_builtin_materials__',
  BUILTIN_SHADERS: '__category_builtin_shaders__',
  PROJECT_MATERIALS: '__category_project_materials__',
  PROJECT_SHADERS: '__category_project_shaders__',
} as const;

/**
 * Asset Browser tab component.
 * NOT a plugin - standard UI component.
 */
export class AssetBrowserTab {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly assetRegistry: AssetRegistry;
  private readonly materialFactory: MaterialAssetFactory;
  private readonly shaderFactory: ShaderAssetFactory;
  private readonly projectService?: ProjectService;
  private readonly treeView: TreeView;
  private readonly noProjectMessage: HTMLDivElement;
  private contextMenu: ContextMenu | null = null;
  private expandedCategories = new Set<string>([
    SECTION_IDS.BUILT_IN,
    SECTION_IDS.PROJECT,
    CATEGORY_IDS.BUILTIN_MATERIALS,
    CATEGORY_IDS.BUILTIN_SHADERS,
    CATEGORY_IDS.PROJECT_MATERIALS,
    CATEGORY_IDS.PROJECT_SHADERS,
  ]);

  constructor(options: AssetBrowserTabOptions) {
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.materialFactory = options.materialFactory;
    this.shaderFactory = options.shaderFactory;
    this.projectService = options.projectService;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'asset-browser-tab';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;

    // Create "no project open" message
    this.noProjectMessage = this.createNoProjectMessage();
    this.container.appendChild(this.noProjectMessage);

    // Create tree view
    this.treeView = new TreeView({
      onSelect: this.handleAssetSelect.bind(this),
      onContextMenu: this.handleContextMenu.bind(this),
      onRename: this.handleRename.bind(this),
      expandedIds: this.expandedCategories,
    });
    this.treeView.element.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-sm);
    `;
    this.container.appendChild(this.treeView.element);

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
   * Refresh the asset list from the registry.
   */
  refresh(): void {
    const treeData = this.buildTreeData();
    this.treeView.setData(treeData);
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.treeView.dispose();
    this.closeContextMenu();
  }

  /**
   * Create the "No Project Open" message.
   */
  private createNoProjectMessage(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'no-project-message';
    container.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-lg);
      text-align: center;
      color: var(--text-secondary);
      gap: var(--spacing-md);
    `;

    const text = document.createElement('p');
    text.textContent = 'No project open';
    text.style.cssText = `
      margin: 0;
      font-size: var(--font-size-sm);
    `;
    container.appendChild(text);

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open Project Folder';
    openBtn.title = 'Select a folder to use as your project';
    openBtn.style.cssText = `
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--accent-primary);
      color: var(--text-primary);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      transition: background-color 0.15s ease;
    `;
    openBtn.addEventListener('mouseenter', () => {
      openBtn.style.background = 'var(--accent-hover)';
    });
    openBtn.addEventListener('mouseleave', () => {
      openBtn.style.background = 'var(--accent-primary)';
    });
    openBtn.addEventListener('click', () => {
      this.eventBus.emit('command:openProject');
    });
    container.appendChild(openBtn);

    return container;
  }

  /**
   * Build tree data from the asset registry.
   * Separates assets into Built-in and Project sections.
   */
  private buildTreeData(): TreeNode[] {
    const materials = this.assetRegistry.getByType<IMaterialAsset>('material');
    const shaders = this.assetRegistry.getByType<IShaderAsset>('shader');

    // Separate built-in from user assets
    const builtInMaterials = materials.filter((m) => m.isBuiltIn);
    const builtInShaders = shaders.filter((s) => s.isBuiltIn);
    const userMaterials = materials.filter((m) => !m.isBuiltIn);
    const userShaders = shaders.filter((s) => !s.isBuiltIn);

    // Sort alphabetically
    const sortByName = <T extends IAsset>(assets: T[]): T[] => {
      return [...assets].sort((a, b) => a.name.localeCompare(b.name));
    };

    // Build Built-in section nodes
    const builtInMaterialNodes: TreeNode[] = sortByName(builtInMaterials).map((m) => ({
      id: m.uuid,
      name: m.name,
      type: 'material' as const,
    }));

    const builtInShaderNodes: TreeNode[] = sortByName(builtInShaders).map((s) => ({
      id: s.uuid,
      name: `${s.name} 🔒`,
      type: 'texture' as const,
    }));

    // Build Project section nodes
    const projectMaterialNodes: TreeNode[] = sortByName(userMaterials).map((m) => ({
      id: m.uuid,
      name: m.name,
      type: 'material' as const,
    }));

    const projectShaderNodes: TreeNode[] = sortByName(userShaders).map((s) => ({
      id: s.uuid,
      name: s.name,
      type: 'texture' as const,
    }));

    const isProjectOpen = this.projectService?.isProjectOpen ?? false;
    const projectName = this.projectService?.projectName ?? 'Project';

    // Update no-project message visibility
    this.updateNoProjectMessageVisibility(!isProjectOpen);

    // Build the tree structure
    const tree: TreeNode[] = [
      // Built-in Section (always visible)
      {
        id: SECTION_IDS.BUILT_IN,
        name: 'Built-in',
        type: 'group' as const,
        selectable: false,
        children: [
          {
            id: CATEGORY_IDS.BUILTIN_MATERIALS,
            name: 'Materials',
            type: 'group' as const,
            selectable: false,
            children: builtInMaterialNodes,
          },
          {
            id: CATEGORY_IDS.BUILTIN_SHADERS,
            name: 'Shaders',
            type: 'group' as const,
            selectable: false,
            children: builtInShaderNodes,
          },
        ],
      },
      // Project Section (shows content when project open, placeholder otherwise)
      {
        id: SECTION_IDS.PROJECT,
        name: isProjectOpen ? projectName : 'Project',
        type: 'group' as const,
        selectable: false,
        children: isProjectOpen
          ? [
              {
                id: CATEGORY_IDS.PROJECT_MATERIALS,
                name: 'Materials',
                type: 'group' as const,
                selectable: false,
                children: projectMaterialNodes,
              },
              {
                id: CATEGORY_IDS.PROJECT_SHADERS,
                name: 'Shaders',
                type: 'group' as const,
                selectable: false,
                children: projectShaderNodes,
              },
            ]
          : [],
      },
    ];

    return tree;
  }

  /**
   * Update the visibility of the no-project message.
   */
  private updateNoProjectMessageVisibility(show: boolean): void {
    this.noProjectMessage.style.display = show ? 'flex' : 'none';
  }

  /**
   * Setup event listeners.
   */
  private setupEvents(): void {
    // Listen for asset changes
    this.eventBus.on<AssetRegisteredEvent>('asset:registered', () => {
      this.refresh();
    });

    this.eventBus.on<AssetUnregisteredEvent>('asset:unregistered', () => {
      this.refresh();
    });

    this.eventBus.on<AssetModifiedEvent>('asset:modified', () => {
      this.refresh();
    });

    // Listen for project changes
    this.eventBus.on<ProjectOpenedEvent>('project:opened', () => {
      this.refresh();
    });

    this.eventBus.on<ProjectClosedEvent>('project:closed', () => {
      this.refresh();
    });

    // Close context menu on click outside
    document.addEventListener('click', () => {
      this.closeContextMenu();
    });
  }

  /**
   * Handle asset selection.
   */
  private handleAssetSelect(id: string, _node: TreeNode): void {
    // Ignore section and category nodes
    if (this.isSectionOrCategoryId(id)) {
      return;
    }

    const asset = this.assetRegistry.get(id);
    if (asset) {
      this.eventBus.emit<AssetSelectedEvent>('asset:selected', { asset });
    }
  }

  /**
   * Check if an ID is a section or category ID (not an actual asset).
   */
  private isSectionOrCategoryId(id: string): boolean {
    return (
      id === SECTION_IDS.BUILT_IN ||
      id === SECTION_IDS.PROJECT ||
      id === CATEGORY_IDS.BUILTIN_MATERIALS ||
      id === CATEGORY_IDS.BUILTIN_SHADERS ||
      id === CATEGORY_IDS.PROJECT_MATERIALS ||
      id === CATEGORY_IDS.PROJECT_SHADERS
    );
  }

  /**
   * Handle context menu request.
   */
  private handleContextMenu(data: ContextMenuData): void {
    this.closeContextMenu();

    const { node, x, y } = data;
    const isProjectOpen = this.projectService?.isProjectOpen ?? false;

    // Handle context menu on Project section category nodes (for creating assets)
    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_MATERIALS) {
      this.contextMenu = new ContextMenu();
      this.contextMenu.show({
        items: [
          {
            label: 'Create Material',
            action: () => this.createNewMaterial(),
          },
        ],
        x,
        y,
      });
      return;
    }

    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_SHADERS) {
      this.contextMenu = new ContextMenu();
      this.contextMenu.show({
        items: [
          {
            label: 'Create Shader',
            action: () => this.createNewShader(),
          },
        ],
        x,
        y,
      });
      return;
    }

    // Ignore other section and category nodes
    if (this.isSectionOrCategoryId(node.id)) {
      return;
    }

    const asset = this.assetRegistry.get(node.id);
    if (!asset) {
      return;
    }

    const menuItems = this.getContextMenuItems(asset);
    if (menuItems.length === 0) {
      return;
    }

    // Create and show context menu
    this.contextMenu = new ContextMenu();
    this.contextMenu.show({
      items: menuItems,
      x,
      y,
    });
  }

  /**
   * Get context menu items based on asset type and state.
   */
  private getContextMenuItems(asset: IAsset): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    if (asset.type === 'material') {
      const material = asset as IMaterialAsset;

      if (material.isBuiltIn) {
        items.push({
          label: 'Duplicate',
          action: () => this.duplicateMaterial(material),
        });
      } else {
        items.push(
          {
            label: 'Rename',
            action: () => this.startRename(material.uuid),
          },
          {
            label: 'Duplicate',
            action: () => this.duplicateMaterial(material),
          },
          {
            label: 'Delete',
            action: () => this.deleteMaterial(material),
          }
        );
      }
    } else if (asset.type === 'shader') {
      const shader = asset as IShaderAsset;

      if (shader.isBuiltIn) {
        items.push({
          label: 'Duplicate',
          action: () => this.duplicateShader(shader),
        });
      } else {
        items.push(
          {
            label: 'Edit',
            action: () => this.editShader(shader),
          },
          {
            label: 'Rename',
            action: () => this.startRename(shader.uuid),
          },
          {
            label: 'Duplicate',
            action: () => this.duplicateShader(shader),
          },
          {
            label: 'Delete',
            action: () => this.deleteShader(shader),
          }
        );
      }
    }

    return items;
  }

  /**
   * Handle rename from tree view.
   */
  private handleRename(id: string, newName: string): void {
    const asset = this.assetRegistry.get(id);
    if (!asset) {
      return;
    }

    // Don't rename built-in assets
    if ('isBuiltIn' in asset && (asset as IMaterialAsset | IShaderAsset).isBuiltIn) {
      return;
    }

    // Update the asset name
    asset.name = newName;
    this.assetRegistry.notifyModified(id, 'name');
  }

  /**
   * Start rename mode for an asset.
   */
  private startRename(uuid: string): void {
    this.treeView.startEditingById(uuid);
  }

  /**
   * Close the context menu if open.
   */
  private closeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.dispose();
      this.contextMenu = null;
    }
  }

  /**
   * Create a new material.
   */
  private createNewMaterial(): void {
    // Get the PBR shader for defaults
    const pbrShader = this.assetRegistry.get<IShaderAsset>(BUILT_IN_SHADER_IDS.PBR);

    // Generate unique name
    const baseName = 'New Material';
    const existingMaterials = this.assetRegistry.getByType<IMaterialAsset>('material');
    const name = this.generateUniqueName(baseName, existingMaterials);

    // Create the material
    const material = this.materialFactory.create(
      {
        name,
        shaderRef: { uuid: BUILT_IN_SHADER_IDS.PBR, type: 'shader' },
      },
      pbrShader
    );

    // Register it
    this.assetRegistry.register(material);

    // Select the new material
    this.refresh();
    this.treeView.select(material.uuid);

    // Start rename mode
    setTimeout(() => {
      this.startRename(material.uuid);
    }, 50);
  }

  /**
   * Create a new shader.
   */
  private createNewShader(): void {
    // Generate unique name
    const baseName = 'New Shader';
    const existingShaders = this.assetRegistry.getByType<IShaderAsset>('shader');
    const name = this.generateUniqueName(baseName, existingShaders);

    // Create the shader with default unlit template
    const shader = this.shaderFactory.create({ name });

    // Register it
    this.assetRegistry.register(shader);

    // Select the new shader
    this.refresh();
    this.treeView.select(shader.uuid);

    // Start rename mode
    setTimeout(() => {
      this.startRename(shader.uuid);
    }, 50);
  }

  /**
   * Duplicate a material.
   */
  private duplicateMaterial(source: IMaterialAsset): void {
    const baseName = `${source.name} Copy`;
    const existingMaterials = this.assetRegistry.getByType<IMaterialAsset>('material');
    const name = this.generateUniqueName(baseName, existingMaterials);

    const duplicate = this.materialFactory.duplicate(source, name);
    this.assetRegistry.register(duplicate);

    this.refresh();
    this.treeView.select(duplicate.uuid);
  }

  /**
   * Duplicate a shader.
   */
  private duplicateShader(source: IShaderAsset): void {
    const baseName = source.isBuiltIn ? source.name : `${source.name} Copy`;
    const existingShaders = this.assetRegistry.getByType<IShaderAsset>('shader');
    const name = this.generateUniqueName(baseName, existingShaders);

    const duplicate = this.shaderFactory.duplicate(source, name);
    this.assetRegistry.register(duplicate);

    this.refresh();
    this.treeView.select(duplicate.uuid);
  }

  /**
   * Delete a material.
   */
  private deleteMaterial(material: IMaterialAsset): void {
    if (material.isBuiltIn) {
      return;
    }

    // TODO: Check for references from entities before deleting
    this.assetRegistry.unregister(material.uuid);
    this.refresh();
  }

  /**
   * Delete a shader.
   */
  private deleteShader(shader: IShaderAsset): void {
    if (shader.isBuiltIn) {
      return;
    }

    // TODO: Check for references from materials before deleting
    this.assetRegistry.unregister(shader.uuid);
    this.refresh();
  }

  /**
   * Request to edit a shader.
   */
  private editShader(shader: IShaderAsset): void {
    this.eventBus.emit<ShaderEditRequestedEvent>('shader:editRequested', { shader });
  }

  /**
   * Generate a unique name by appending a number if needed.
   */
  private generateUniqueName(baseName: string, existingAssets: IAsset[]): string {
    const existingNames = new Set(existingAssets.map((a) => a.name));

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 1;
    let name = `${baseName} ${counter}`;
    while (existingNames.has(name)) {
      counter++;
      name = `${baseName} ${counter}`;
    }

    return name;
  }
}
