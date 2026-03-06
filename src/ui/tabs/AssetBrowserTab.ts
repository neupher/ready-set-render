/**
 * AssetBrowserTab
 *
 * A tab component for browsing and managing assets (materials, shaders, models).
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
import type { IModelAsset } from '@core/assets/interfaces/IModelAsset';
import type { IAsset } from '@core/assets/interfaces/IAsset';
import type { IModelAssetMeta } from '@core/assets/interfaces/IModelAssetMeta';
import type { IDerivedMeshRef, IDerivedMaterialRef } from '@core/assets/interfaces/IAssetMeta';
import type { ProjectService } from '@core/ProjectService';
import type {
  ProjectOpenedEvent,
  ProjectClosedEvent,
  ProjectRefreshedEvent,
  ISourceFile,
} from '@core/interfaces/IProjectService';
import type { AssetMetaService } from '@core/assets/AssetMetaService';
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
  /** Asset meta service for reading .assetmeta files (optional) */
  assetMetaService?: AssetMetaService;
}

/**
 * Cached model asset meta with associated file info.
 */
export interface CachedModelMeta {
  meta: IModelAssetMeta;
  filename: string;
  directory: string;
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
 * Event emitted when an asset drag starts.
 */
export interface AssetDragStartEvent {
  asset: IAsset;
  event: DragEvent;
}

/**
 * Event emitted when a source file import is requested.
 */
export interface SourceFileImportRequestedEvent {
  path: string;
  name: string;
  format: string;
}

/**
 * Event emitted when a source file is selected.
 */
export interface SourceFileSelectedEvent {
  sourceFile: ISourceFile;
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
  // Project folder structure - mirrors actual disk layout
  PROJECT_ASSETS: '__folder_assets__',
  PROJECT_ASSETS_MATERIALS: '__folder_assets_materials__',
  PROJECT_ASSETS_MESHES: '__folder_assets_meshes__',
  PROJECT_ASSETS_MODELS: '__folder_assets_models__',
  PROJECT_ASSETS_SCENES: '__folder_assets_scenes__',
  PROJECT_ASSETS_SHADERS: '__folder_assets_shaders__',
  PROJECT_ASSETS_TEXTURES: '__folder_assets_textures__',
  PROJECT_SOURCES: '__folder_sources__',
  PROJECT_SOURCES_MODELS: '__folder_sources_models__',
  PROJECT_SOURCES_TEXTURES: '__folder_sources_textures__',
  PROJECT_SOURCES_OTHER: '__folder_sources_other__',
} as const;

/**
 * Prefix for source file node IDs.
 */
const SOURCE_FILE_PREFIX = 'source:';

/**
 * Prefix for model meta node IDs (used for .assetmeta model files).
 */
const MODEL_META_PREFIX = 'modelmeta:';

/**
 * Prefix for derived mesh node IDs.
 */
const DERIVED_MESH_PREFIX = 'derivedmesh:';

/**
 * Prefix for derived material node IDs.
 */
const DERIVED_MATERIAL_PREFIX = 'derivedmaterial:';

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
  private readonly assetMetaService?: AssetMetaService;
  private readonly treeView: TreeView;
  private readonly noProjectMessage: HTMLDivElement;
  private readonly toolbar: HTMLDivElement;
  private readonly refreshButton: HTMLButtonElement;
  private contextMenu: ContextMenu | null = null;
  private isRefreshing = false;
  /** Cached model metas from last scan */
  private cachedModelMetas: CachedModelMeta[] = [];
  private expandedCategories = new Set<string>([
    SECTION_IDS.BUILT_IN,
    SECTION_IDS.PROJECT,
    CATEGORY_IDS.BUILTIN_MATERIALS,
    CATEGORY_IDS.BUILTIN_SHADERS,
    CATEGORY_IDS.PROJECT_ASSETS,
    CATEGORY_IDS.PROJECT_ASSETS_MATERIALS,
    CATEGORY_IDS.PROJECT_ASSETS_MODELS,
    CATEGORY_IDS.PROJECT_ASSETS_SHADERS,
    CATEGORY_IDS.PROJECT_SOURCES,
    CATEGORY_IDS.PROJECT_SOURCES_MODELS,
  ]);

  constructor(options: AssetBrowserTabOptions) {
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.materialFactory = options.materialFactory;
    this.shaderFactory = options.shaderFactory;
    this.projectService = options.projectService;
    this.assetMetaService = options.assetMetaService;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'asset-browser-tab';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;

    // Create toolbar with refresh button
    this.toolbar = this.createToolbar();
    this.refreshButton = this.toolbar.querySelector('.refresh-button') as HTMLButtonElement;
    this.container.appendChild(this.toolbar);

    // Create "no project open" message
    this.noProjectMessage = this.createNoProjectMessage();
    this.container.appendChild(this.noProjectMessage);

    // Create tree view
    this.treeView = new TreeView({
      onSelect: this.handleAssetSelect.bind(this),
      onContextMenu: this.handleContextMenu.bind(this),
      onRename: this.handleRename.bind(this),
      onDragStart: this.handleDragStart.bind(this),
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
  async refresh(): Promise<void> {
    // Scan for .assetmeta files if we have the service and project is open
    if (this.assetMetaService && this.projectService?.isProjectOpen) {
      await this.scanForAssetMetas();
    } else {
      this.cachedModelMetas = [];
    }

    const treeData = this.buildTreeData();
    this.treeView.setData(treeData);
  }

  /**
   * Scan the project for .assetmeta files and cache them.
   */
  private async scanForAssetMetas(): Promise<void> {
    if (!this.projectService || !this.assetMetaService) {
      this.cachedModelMetas = [];
      return;
    }

    const rootHandle = this.projectService.getProjectHandle();
    if (!rootHandle) {
      this.cachedModelMetas = [];
      return;
    }

    const metas: CachedModelMeta[] = [];

    // Scan the project directory recursively for .assetmeta files
    await this.scanDirectoryForMetas(rootHandle, '', metas);

    this.cachedModelMetas = metas;
  }

  /**
   * Recursively scan a directory for .assetmeta files.
   */
  private async scanDirectoryForMetas(
    dirHandle: FileSystemDirectoryHandle,
    relativePath: string,
    results: CachedModelMeta[]
  ): Promise<void> {
    if (!this.assetMetaService) {
      return;
    }

    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'directory') {
          // Skip hidden directories and common non-asset directories
          if (name.startsWith('.') || name === 'node_modules') {
            continue;
          }

          // Recurse into subdirectory
          const subPath = relativePath ? `${relativePath}/${name}` : name;
          await this.scanDirectoryForMetas(handle as FileSystemDirectoryHandle, subPath, results);
        } else if (handle.kind === 'file' && name.endsWith('.assetmeta')) {
          // Found an .assetmeta file - try to read it
          const sourceFilename = name.replace('.assetmeta', '');

          // Check if it's a model file
          const ext = this.getFileExtension(sourceFilename);
          if (['.glb', '.gltf'].includes(ext)) {
            const result = await this.assetMetaService.readModelMeta(dirHandle, sourceFilename);
            if (result.success && result.meta) {
              results.push({
                meta: result.meta,
                filename: sourceFilename,
                directory: relativePath,
              });
            }
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue scanning
      console.warn(`Failed to scan directory ${relativePath}:`, error);
    }
  }

  /**
   * Get the file extension from a filename.
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
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
   * Create the toolbar with refresh and other action buttons.
   */
  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'asset-browser-toolbar';
    toolbar.style.cssText = `
      display: none;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-bottom: 1px solid var(--border-color);
      gap: var(--spacing-xs);
      background: var(--bg-secondary);
    `;

    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-button';
    refreshBtn.title = 'Refresh project files (rescan disk for changes)';
    refreshBtn.innerHTML = '🔄';
    refreshBtn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s ease;
    `;
    refreshBtn.addEventListener('mouseenter', () => {
      if (!this.isRefreshing) {
        refreshBtn.style.background = 'var(--bg-hover)';
        refreshBtn.style.borderColor = 'var(--border-color)';
      }
    });
    refreshBtn.addEventListener('mouseleave', () => {
      refreshBtn.style.background = 'transparent';
      refreshBtn.style.borderColor = 'transparent';
    });
    refreshBtn.addEventListener('click', () => {
      this.handleRefreshClick();
    });
    toolbar.appendChild(refreshBtn);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    toolbar.appendChild(spacer);

    // Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'import-button';
    importBtn.title = 'Import a 3D model file';
    importBtn.innerHTML = '+ Import';
    importBtn.style.cssText = `
      display: flex;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--font-size-xs);
      transition: all 0.15s ease;
    `;
    importBtn.addEventListener('mouseenter', () => {
      importBtn.style.background = 'var(--bg-hover)';
      importBtn.style.color = 'var(--text-primary)';
    });
    importBtn.addEventListener('mouseleave', () => {
      importBtn.style.background = 'transparent';
      importBtn.style.color = 'var(--text-secondary)';
    });
    importBtn.addEventListener('click', () => {
      this.eventBus.emit('command:import');
    });
    toolbar.appendChild(importBtn);

    return toolbar;
  }

  /**
   * Handle refresh button click.
   */
  private async handleRefreshClick(): Promise<void> {
    if (this.isRefreshing || !this.projectService?.isProjectOpen) {
      return;
    }

    this.isRefreshing = true;
    this.updateRefreshButtonState();

    try {
      await this.projectService.rescanProject();
    } catch (error) {
      console.error('Failed to refresh project:', error);
    } finally {
      this.isRefreshing = false;
      this.updateRefreshButtonState();
    }
  }

  /**
   * Update the refresh button visual state.
   */
  private updateRefreshButtonState(): void {
    if (this.isRefreshing) {
      this.refreshButton.style.opacity = '0.5';
      this.refreshButton.style.cursor = 'wait';
      this.refreshButton.style.animation = 'spin 1s linear infinite';
    } else {
      this.refreshButton.style.opacity = '1';
      this.refreshButton.style.cursor = 'pointer';
      this.refreshButton.style.animation = 'none';
    }
  }

  /**
   * Update toolbar visibility based on project state.
   */
  private updateToolbarVisibility(): void {
    const isProjectOpen = this.projectService?.isProjectOpen ?? false;
    this.toolbar.style.display = isProjectOpen ? 'flex' : 'none';
  }

  /**
   * Build tree data from the asset registry.
   * Shows Built-in section and Project folder structure mirroring actual disk layout.
   */
  private buildTreeData(): TreeNode[] {
    const materials = this.assetRegistry.getByType<IMaterialAsset>('material');
    const shaders = this.assetRegistry.getByType<IShaderAsset>('shader');
    const models = this.assetRegistry.getByType<IModelAsset>('model');

    // Separate built-in from user assets
    const builtInMaterials = materials.filter((m) => m.isBuiltIn);
    const builtInShaders = shaders.filter((s) => s.isBuiltIn);
    const userMaterials = materials.filter((m) => !m.isBuiltIn);
    const userShaders = shaders.filter((s) => !s.isBuiltIn);
    const userModels = models;

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

    const isProjectOpen = this.projectService?.isProjectOpen ?? false;
    const projectName = this.projectService?.projectName ?? 'Project';

    // Update no-project message visibility
    this.updateNoProjectMessageVisibility(!isProjectOpen);

    // Update toolbar visibility
    this.updateToolbarVisibility();

    // Build project folder structure (mirrors actual disk layout)
    const projectChildren: TreeNode[] = [];
    if (isProjectOpen) {
      // assets/ folder
      const assetsFolder = this.buildAssetsFolderNode(userMaterials, userShaders, userModels);
      projectChildren.push(assetsFolder);

      // Note: sources/ folder is NOT shown in the UI
      // Source files (.glb, .gltf) are displayed under assets/models after import
    }

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
      // Project Section - mirrors actual folder structure
      {
        id: SECTION_IDS.PROJECT,
        name: isProjectOpen ? projectName : 'Project',
        type: 'group' as const,
        selectable: false,
        children: projectChildren,
      },
    ];

    return tree;
  }

  /**
   * Build the assets/ folder node mirroring actual disk structure.
   * Shows models as expandable nodes with derived meshes/materials as children.
   */
  private buildAssetsFolderNode(
    userMaterials: IMaterialAsset[],
    userShaders: IShaderAsset[],
    userModels: IModelAsset[]
  ): TreeNode {
    const sortByName = <T extends IAsset>(assets: T[]): T[] => {
      return [...assets].sort((a, b) => a.name.localeCompare(b.name));
    };

    // Standalone materials (user-created, not from model imports)
    // Filter out materials that are part of model imports
    const importedMaterialUuids = new Set<string>();
    for (const cached of this.cachedModelMetas) {
      for (const matRef of cached.meta.contents.materials) {
        importedMaterialUuids.add(matRef.uuid);
      }
    }
    const standaloneMaterials = userMaterials.filter(m => !importedMaterialUuids.has(m.uuid));

    const materialNodes: TreeNode[] = sortByName(standaloneMaterials).map((m) => ({
      id: m.uuid,
      name: m.name,
      type: 'material' as const,
      draggable: true,
      assetType: 'material',
    }));

    // Build model nodes: prefer cachedModelMetas, fallback to legacy IModelAsset
    let modelNodes: TreeNode[];
    if (this.cachedModelMetas.length > 0) {
      // New Phase 3: hierarchical model nodes from .assetmeta files
      modelNodes = this.buildModelMetaNodes();
    } else {
      // Legacy fallback: flat model nodes from IModelAsset in registry
      modelNodes = this.buildLegacyModelNodes(userModels);
    }

    // shaders/ subfolder
    const shaderNodes: TreeNode[] = sortByName(userShaders).map((s) => ({
      id: s.uuid,
      name: s.name,
      type: 'texture' as const,
    }));

    return {
      id: CATEGORY_IDS.PROJECT_ASSETS,
      name: 'assets',
      type: 'group' as const,
      selectable: false,
      children: [
        {
          id: CATEGORY_IDS.PROJECT_ASSETS_MATERIALS,
          name: 'materials',
          type: 'group' as const,
          selectable: false,
          children: materialNodes,
        },
        {
          id: CATEGORY_IDS.PROJECT_ASSETS_MODELS,
          name: 'models',
          type: 'group' as const,
          selectable: false,
          children: modelNodes,
        },
        {
          id: CATEGORY_IDS.PROJECT_ASSETS_SCENES,
          name: 'scenes',
          type: 'group' as const,
          selectable: false,
          children: [], // Future: scene files
        },
        {
          id: CATEGORY_IDS.PROJECT_ASSETS_SHADERS,
          name: 'shaders',
          type: 'group' as const,
          selectable: false,
          children: shaderNodes,
        },
        {
          id: CATEGORY_IDS.PROJECT_ASSETS_TEXTURES,
          name: 'textures',
          type: 'group' as const,
          selectable: false,
          children: [], // Future: texture files
        },
      ],
    };
  }

  /**
   * Build legacy model nodes from IModelAsset (backward compatibility).
   * Shows models with truncated UUID filenames.
   */
  private buildLegacyModelNodes(userModels: IModelAsset[]): TreeNode[] {
    const sortByName = <T extends IAsset>(assets: T[]): T[] => {
      return [...assets].sort((a, b) => a.name.localeCompare(b.name));
    };

    return sortByName(userModels).map((model) => ({
      id: model.uuid,
      name: `${model.uuid.substring(0, 8)}...model.json`,
      displayName: model.name,
      type: 'model' as const,
      draggable: true,
      assetType: 'model',
    }));
  }

  /**
   * Build tree nodes for model asset metas.
   * Each model is an expandable node with "Materials" and "Meshes" groups as children.
   */
  private buildModelMetaNodes(): TreeNode[] {
    const nodes: TreeNode[] = [];

    // Sort by source filename
    const sortedMetas = [...this.cachedModelMetas].sort((a, b) =>
      a.filename.localeCompare(b.filename)
    );

    for (const cached of sortedMetas) {
      const { meta, filename } = cached;

      // Build children: Materials group and Meshes group
      const children: TreeNode[] = [];

      // Add Materials group if there are materials
      if (meta.contents.materials.length > 0) {
        const materialChildren: TreeNode[] = meta.contents.materials.map(matRef =>
          this.buildDerivedMaterialNode(matRef, meta.uuid)
        );
        children.push({
          id: `${MODEL_META_PREFIX}${meta.uuid}:materials`,
          name: `Materials (${meta.contents.materials.length})`,
          type: 'group' as const,
          selectable: false,
          children: materialChildren,
        });
      }

      // Add Meshes group if there are meshes
      if (meta.contents.meshes.length > 0) {
        const meshChildren: TreeNode[] = meta.contents.meshes.map(meshRef =>
          this.buildDerivedMeshNode(meshRef, meta.uuid)
        );
        children.push({
          id: `${MODEL_META_PREFIX}${meta.uuid}:meshes`,
          name: `Meshes (${meta.contents.meshes.length})`,
          type: 'group' as const,
          selectable: false,
          children: meshChildren,
        });
      }

      // Determine status indicator
      const statusIndicator = meta.isDirty ? ' ⚠️' : ' ✓';

      // Model node - expandable with Materials and Meshes groups
      const nodeId = `${MODEL_META_PREFIX}${meta.uuid}`;

      nodes.push({
        id: nodeId,
        name: `${filename}${statusIndicator}`,
        type: 'model' as const,
        draggable: true,
        assetType: 'model',
        children: children.length > 0 ? children : undefined,
      });
    }

    return nodes;
  }

  /**
   * Build a tree node for a derived mesh reference.
   */
  private buildDerivedMeshNode(meshRef: IDerivedMeshRef, parentMetaUuid: string): TreeNode {
    const triangleInfo = `${meshRef.triangleCount.toLocaleString()} tris`;

    return {
      id: `${DERIVED_MESH_PREFIX}${parentMetaUuid}:${meshRef.uuid}`,
      name: `🔷 ${meshRef.name} (${triangleInfo})`,
      type: 'mesh' as const,
      draggable: true,
      assetType: 'mesh',
    };
  }

  /**
   * Build a tree node for a derived material reference.
   */
  private buildDerivedMaterialNode(matRef: IDerivedMaterialRef, parentMetaUuid: string): TreeNode {
    const overrideIndicator = matRef.isOverridden ? ' ✎' : ' 🔒';

    return {
      id: `${DERIVED_MATERIAL_PREFIX}${parentMetaUuid}:${matRef.uuid}`,
      name: `🎨 ${matRef.name}${overrideIndicator}`,
      type: 'material' as const,
      selectable: true,
    };
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

    // Listen for project refresh
    this.eventBus.on<ProjectRefreshedEvent>('project:refreshed', () => {
      this.refresh();
    });

    // Listen for import completion to refresh and show newly imported models
    this.eventBus.on('import:complete', () => {
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

    // Handle source file selection
    if (this.isSourceFileId(id)) {
      const sourcePath = this.getSourceFilePathFromId(id);
      if (sourcePath) {
        const sourceFile = this.projectService?.getSourceFiles().find(
          (f) => f.path === sourcePath
        );
        if (sourceFile) {
          this.eventBus.emit('sourceFile:selected', { sourceFile });
        }
      }
      return;
    }

    // Handle model meta selection
    if (this.isModelMetaId(id)) {
      const metaUuid = this.getModelMetaUuidFromId(id);
      if (metaUuid) {
        const cached = this.getCachedModelMeta(metaUuid);
        if (cached) {
          this.eventBus.emit('modelMeta:selected', { meta: cached.meta, filename: cached.filename });
        }
      }
      return;
    }

    // Handle derived mesh selection
    if (this.isDerivedMeshId(id)) {
      // Extract parent meta UUID and mesh UUID from the ID
      // Format: derivedmesh:{parentMetaUuid}:{meshUuid}
      const parts = id.substring(DERIVED_MESH_PREFIX.length).split(':');
      if (parts.length >= 2) {
        const [parentMetaUuid, meshUuid] = parts;
        const cached = this.getCachedModelMeta(parentMetaUuid);
        if (cached) {
          const meshRef = cached.meta.contents.meshes.find(m => m.uuid === meshUuid);
          if (meshRef) {
            this.eventBus.emit('derivedMesh:selected', {
              meshRef,
              meta: cached.meta,
              filename: cached.filename
            });
          }
        }
      }
      return;
    }

    // Handle derived material selection
    if (this.isDerivedMaterialId(id)) {
      // Extract parent meta UUID and material UUID from the ID
      // Format: derivedmaterial:{parentMetaUuid}:{materialUuid}
      const parts = id.substring(DERIVED_MATERIAL_PREFIX.length).split(':');
      if (parts.length >= 2) {
        const [parentMetaUuid, materialUuid] = parts;
        const cached = this.getCachedModelMeta(parentMetaUuid);
        if (cached) {
          const matRef = cached.meta.contents.materials.find(m => m.uuid === materialUuid);
          if (matRef) {
            this.eventBus.emit('derivedMaterial:selected', {
              materialRef: matRef,
              meta: cached.meta,
              filename: cached.filename
            });
          }
        }
      }
      return;
    }

    const asset = this.assetRegistry.get(id);
    if (asset) {
      this.eventBus.emit<AssetSelectedEvent>('asset:selected', { asset });
    }
  }

  /**
   * Handle drag start for draggable assets.
   */
  private handleDragStart(id: string, _node: TreeNode, event: DragEvent): void {
    const asset = this.assetRegistry.get(id);
    if (asset) {
      this.eventBus.emit<AssetDragStartEvent>('asset:dragStart', { asset, event });
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
      id === CATEGORY_IDS.PROJECT_ASSETS ||
      id === CATEGORY_IDS.PROJECT_ASSETS_MATERIALS ||
      id === CATEGORY_IDS.PROJECT_ASSETS_MODELS ||
      id === CATEGORY_IDS.PROJECT_ASSETS_SCENES ||
      id === CATEGORY_IDS.PROJECT_ASSETS_SHADERS ||
      id === CATEGORY_IDS.PROJECT_ASSETS_TEXTURES ||
      id === CATEGORY_IDS.PROJECT_SOURCES ||
      id === CATEGORY_IDS.PROJECT_SOURCES_MODELS ||
      id === CATEGORY_IDS.PROJECT_SOURCES_TEXTURES ||
      id === CATEGORY_IDS.PROJECT_SOURCES_OTHER
    );
  }

  /**
   * Check if an ID is a source file node.
   */
  private isSourceFileId(id: string): boolean {
    return id.startsWith(SOURCE_FILE_PREFIX);
  }

  /**
   * Check if an ID is a model meta node.
   */
  private isModelMetaId(id: string): boolean {
    return id.startsWith(MODEL_META_PREFIX);
  }

  /**
   * Check if an ID is a derived mesh node.
   */
  private isDerivedMeshId(id: string): boolean {
    return id.startsWith(DERIVED_MESH_PREFIX);
  }

  /**
   * Check if an ID is a derived material node.
   */
  private isDerivedMaterialId(id: string): boolean {
    return id.startsWith(DERIVED_MATERIAL_PREFIX);
  }

  /**
   * Get the model meta UUID from a model meta node ID.
   */
  private getModelMetaUuidFromId(id: string): string | null {
    if (!this.isModelMetaId(id)) {
      return null;
    }
    return id.substring(MODEL_META_PREFIX.length);
  }

  /**
   * Get the cached model meta by UUID.
   */
  private getCachedModelMeta(uuid: string): CachedModelMeta | null {
    return this.cachedModelMetas.find(m => m.meta.uuid === uuid) ?? null;
  }

  /**
   * Get the source file path from a source file node ID.
   */
  private getSourceFilePathFromId(id: string): string | null {
    if (!this.isSourceFileId(id)) {
      return null;
    }
    return id.substring(SOURCE_FILE_PREFIX.length);
  }

  /**
   * Handle context menu request.
   */
  private handleContextMenu(data: ContextMenuData): void {
    this.closeContextMenu();

    const { node, x, y } = data;
    const isProjectOpen = this.projectService?.isProjectOpen ?? false;

    // Handle context menu on assets/materials/ folder
    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_ASSETS_MATERIALS) {
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

    // Handle context menu on assets/shaders/ folder
    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_ASSETS_SHADERS) {
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

    // Handle context menu on assets/models/ folder
    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_ASSETS_MODELS) {
      this.contextMenu = new ContextMenu();
      this.contextMenu.show({
        items: [
          {
            label: 'Import Model...',
            action: () => this.eventBus.emit('command:import'),
          },
        ],
        x,
        y,
      });
      return;
    }

    // Handle context menu on sources/models/ folder
    if (isProjectOpen && node.id === CATEGORY_IDS.PROJECT_SOURCES_MODELS) {
      this.contextMenu = new ContextMenu();
      this.contextMenu.show({
        items: [
          {
            label: 'Refresh',
            action: () => this.handleRefreshClick(),
          },
          {
            label: 'Import Model...',
            action: () => this.eventBus.emit('command:import'),
          },
        ],
        x,
        y,
      });
      return;
    }

    // Handle context menu on source files
    if (isProjectOpen && this.isSourceFileId(node.id)) {
      const sourcePath = this.getSourceFilePathFromId(node.id);
      if (sourcePath) {
        const sourceFile = this.projectService?.getSourceFiles().find(
          (f) => f.path === sourcePath
        );
        if (sourceFile) {
          this.contextMenu = new ContextMenu();
          this.contextMenu.show({
            items: this.getSourceFileContextMenuItems(sourceFile),
            x,
            y,
          });
          return;
        }
      }
    }

    // Handle context menu on model meta nodes
    if (isProjectOpen && this.isModelMetaId(node.id)) {
      const metaUuid = this.getModelMetaUuidFromId(node.id);
      if (metaUuid) {
        const cached = this.getCachedModelMeta(metaUuid);
        if (cached) {
          this.contextMenu = new ContextMenu();
          this.contextMenu.show({
            items: this.getModelMetaContextMenuItems(cached),
            x,
            y,
          });
          return;
        }
      }
    }

    // Handle context menu on derived material nodes
    if (isProjectOpen && this.isDerivedMaterialId(node.id)) {
      const parts = node.id.substring(DERIVED_MATERIAL_PREFIX.length).split(':');
      if (parts.length >= 2) {
        const [parentMetaUuid, materialUuid] = parts;
        const cached = this.getCachedModelMeta(parentMetaUuid);
        if (cached) {
          const matRef = cached.meta.contents.materials.find(m => m.uuid === materialUuid);
          if (matRef) {
            this.contextMenu = new ContextMenu();
            this.contextMenu.show({
              items: this.getDerivedMaterialContextMenuItems(matRef, cached),
              x,
              y,
            });
            return;
          }
        }
      }
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
    } else if (asset.type === 'model') {
      const model = asset as IModelAsset;

      items.push(
        {
          label: 'Add to Scene',
          action: () => this.addModelToScene(model),
        },
        {
          label: 'Rename',
          action: () => this.startRename(model.uuid),
        },
        {
          label: 'Delete',
          action: () => this.deleteModel(model),
        }
      );
    }

    return items;
  }

/**
 * Get context menu items for source files.
 */
private getSourceFileContextMenuItems(sourceFile: ISourceFile): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (sourceFile.isImported) {
    // Already imported - offer to re-import or view imported asset
    items.push(
      {
        label: 'Re-import',
        action: () => this.importSourceFile(sourceFile),
      },
      {
        label: 'Show Imported Asset',
        action: () => {
          if (sourceFile.importedAssetId) {
            this.treeView.select(sourceFile.importedAssetId);
          }
        },
      }
    );
  } else {
    // Not imported - offer to import
    items.push({
      label: 'Import',
      action: () => this.importSourceFile(sourceFile),
    });
  }

  return items;
}

/**
 * Import a source file from the project folder.
 */
private async importSourceFile(sourceFile: ISourceFile): Promise<void> {
  if (!this.projectService) {
    return;
  }

  // Emit event to trigger import from project source
  this.eventBus.emit('sourceFile:importRequested', {
    path: sourceFile.path,
    name: sourceFile.name,
    format: sourceFile.format,
  });
}

  /**
   * Get context menu items for model meta nodes.
   */
  private getModelMetaContextMenuItems(cached: CachedModelMeta): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    // Add to scene
    items.push({
      label: 'Add to Scene',
      action: () => this.addModelMetaToScene(cached),
    });

    // Reimport option
    items.push({
      label: cached.meta.isDirty ? 'Reimport (Source Changed)' : 'Reimport',
      action: () => this.reimportModel(cached),
    });

    // Separator-like spacing
    items.push({
      label: 'Show in Explorer',
      action: () => this.showModelInExplorer(cached),
    });

    // Delete
    items.push({
      label: 'Delete',
      action: () => this.deleteModelMeta(cached),
    });

    return items;
  }

  /**
   * Get context menu items for derived material nodes.
   */
  private getDerivedMaterialContextMenuItems(
    matRef: IDerivedMaterialRef,
    cached: CachedModelMeta
  ): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    if (matRef.isOverridden) {
      // Already overridden - show the override
      items.push({
        label: 'Show Override',
        action: () => {
          if (matRef.overrideUuid) {
            this.treeView.select(matRef.overrideUuid);
          }
        },
      });
    } else {
      // Read-only - offer to make editable
      items.push({
        label: 'Make Editable (Create Copy)',
        action: () => this.makeImportedMaterialEditable(matRef, cached),
      });
    }

    return items;
  }

  /**
   * Add a model from meta to the scene.
   */
  private addModelMetaToScene(cached: CachedModelMeta): void {
    this.eventBus.emit('modelMeta:addToScene', {
      meta: cached.meta,
      filename: cached.filename,
      directory: cached.directory,
    });
  }

  /**
   * Reimport a model using its current settings.
   */
  private reimportModel(cached: CachedModelMeta): void {
    this.eventBus.emit('modelMeta:reimport', {
      meta: cached.meta,
      filename: cached.filename,
      directory: cached.directory,
    });
  }

  /**
   * Show the model's source file in the system file explorer.
   */
  private showModelInExplorer(cached: CachedModelMeta): void {
    // This would require native file system integration
    // For now, just log the path
    console.log(`Model source: ${cached.directory}/${cached.filename}`);
    this.eventBus.emit('modelMeta:showInExplorer', {
      meta: cached.meta,
      filename: cached.filename,
      directory: cached.directory,
    });
  }

  /**
   * Delete a model meta and optionally its source file.
   */
  private deleteModelMeta(cached: CachedModelMeta): void {
    // Confirm deletion
    const confirmed = confirm(
      `Delete "${cached.filename}" and its .assetmeta file?\n\n` +
      `This will remove the asset from the project but keep the source file.`
    );

    if (confirmed) {
      this.eventBus.emit('modelMeta:delete', {
        meta: cached.meta,
        filename: cached.filename,
        directory: cached.directory,
      });
    }
  }

  /**
   * Make an imported material editable by creating a copy.
   */
  private makeImportedMaterialEditable(
    matRef: IDerivedMaterialRef,
    cached: CachedModelMeta
  ): void {
    this.eventBus.emit('derivedMaterial:makeEditable', {
      materialRef: matRef,
      meta: cached.meta,
      filename: cached.filename,
    });
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
   * Delete a model and its associated meshes.
   */
  private deleteModel(model: IModelAsset): void {
    // Unregister all associated mesh assets
    for (const meshRef of model.contents.meshes) {
      this.assetRegistry.unregister(meshRef.uuid);
    }

    // Unregister the model asset
    this.assetRegistry.unregister(model.uuid);
    this.refresh();
  }

  /**
   * Add a model to the scene.
   */
  private addModelToScene(model: IModelAsset): void {
    this.eventBus.emit('model:instantiate', { modelUuid: model.uuid });
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
