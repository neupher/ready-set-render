/**
 * AssetBrowserTab
 *
 * A tab component for browsing and managing assets (materials, shaders).
 * Displays assets grouped by type in a tree view with actions like
 * create, duplicate, rename, and delete.
 *
 * @example
 * ```ts
 * const tab = new AssetBrowserTab({
 *   eventBus,
 *   assetRegistry,
 *   materialFactory,
 *   shaderFactory
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
 * Special node IDs for category groups.
 */
const CATEGORY_IDS = {
  MATERIALS: '__category_materials__',
  SHADERS: '__category_shaders__',
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
  private readonly treeView: TreeView;
  private readonly toolbar: HTMLDivElement;
  private contextMenu: ContextMenu | null = null;
  private expandedCategories = new Set<string>([CATEGORY_IDS.MATERIALS, CATEGORY_IDS.SHADERS]);

  constructor(options: AssetBrowserTabOptions) {
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.materialFactory = options.materialFactory;
    this.shaderFactory = options.shaderFactory;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'asset-browser-tab';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;

    // Create toolbar
    this.toolbar = this.createToolbar();
    this.container.appendChild(this.toolbar);

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
   * Create the toolbar with action buttons.
   */
  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'asset-browser-toolbar';
    toolbar.style.cssText = `
      display: flex;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
      border-bottom: 1px solid var(--border-primary);
      flex-shrink: 0;
    `;

    // New Material button
    const newMaterialBtn = this.createToolbarButton('+ Material', 'Create new material', () => {
      this.createNewMaterial();
    });
    toolbar.appendChild(newMaterialBtn);

    // New Shader button
    const newShaderBtn = this.createToolbarButton('+ Shader', 'Create new shader', () => {
      this.createNewShader();
    });
    toolbar.appendChild(newShaderBtn);

    return toolbar;
  }

  /**
   * Create a toolbar button.
   */
  private createToolbarButton(
    text: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'asset-browser-btn';
    button.textContent = text;
    button.title = title;
    button.style.cssText = `
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      transition: background-color 0.15s ease;
    `;
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--bg-hover)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--bg-secondary)';
    });
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Build tree data from the asset registry.
   */
  private buildTreeData(): TreeNode[] {
    const materials = this.assetRegistry.getByType<IMaterialAsset>('material');
    const shaders = this.assetRegistry.getByType<IShaderAsset>('shader');

    // Sort by name, with built-ins first
    const sortAssets = <T extends IAsset & { isBuiltIn: boolean }>(assets: T[]): T[] => {
      return [...assets].sort((a, b) => {
        if (a.isBuiltIn !== b.isBuiltIn) {
          return a.isBuiltIn ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    };

    const materialNodes: TreeNode[] = sortAssets(materials).map((m) => ({
      id: m.uuid,
      name: m.isBuiltIn ? `${m.name} (built-in)` : m.name,
      type: 'material' as const,
    }));

    const shaderNodes: TreeNode[] = sortAssets(shaders).map((s) => ({
      id: s.uuid,
      name: s.isBuiltIn ? `${s.name} (built-in) 🔒` : s.name,
      type: 'texture' as const, // Using 'texture' icon for shaders (grid icon)
    }));

    return [
      {
        id: CATEGORY_IDS.MATERIALS,
        name: 'Materials',
        type: 'group' as const,
        children: materialNodes,
        selectable: false,
      },
      {
        id: CATEGORY_IDS.SHADERS,
        name: 'Shaders',
        type: 'group' as const,
        children: shaderNodes,
        selectable: false,
      },
    ];
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

    // Close context menu on click outside
    document.addEventListener('click', () => {
      this.closeContextMenu();
    });
  }

  /**
   * Handle asset selection.
   */
  private handleAssetSelect(id: string, _node: TreeNode): void {
    // Ignore category nodes
    if (id === CATEGORY_IDS.MATERIALS || id === CATEGORY_IDS.SHADERS) {
      return;
    }

    const asset = this.assetRegistry.get(id);
    if (asset) {
      this.eventBus.emit<AssetSelectedEvent>('asset:selected', { asset });
    }
  }

  /**
   * Handle context menu request.
   */
  private handleContextMenu(data: ContextMenuData): void {
    this.closeContextMenu();

    const { node, x, y } = data;

    // Ignore category nodes
    if (node.id === CATEGORY_IDS.MATERIALS || node.id === CATEGORY_IDS.SHADERS) {
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
