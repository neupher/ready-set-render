/**
 * ModelImportInspector
 *
 * Inspector panel for model asset metadata (.assetmeta files).
 * Shows import settings with controls for adjusting how a model is imported.
 * Includes Apply/Revert buttons and reimport functionality.
 *
 * @example
 * ```ts
 * const inspector = new ModelImportInspector({
 *   eventBus,
 *   assetMetaService,
 *   projectService,
 * });
 *
 * // Show inspector for a model meta
 * inspector.setModelMeta(meta, filename, directoryHandle);
 * container.appendChild(inspector.element);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { AssetMetaService } from '@core/assets/AssetMetaService';
import type { ProjectService } from '@core/ProjectService';
import type { IModelAssetMeta, IModelImportSettings, CoordinateUpAxis } from '@core/assets/interfaces/IModelAssetMeta';
// Note: createDefaultModelImportSettings available from '@core/assets/DefaultImportSettings' if needed
import { CollapsibleSection } from '../components/CollapsibleSection';
import { DraggableNumberInput } from '../components/DraggableNumberInput';

/**
 * Options for creating a ModelImportInspector.
 */
export interface ModelImportInspectorOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Asset meta service for reading/writing .assetmeta files */
  assetMetaService: AssetMetaService;
  /** Project service for project-based workflow */
  projectService: ProjectService;
}

/**
 * Event emitted when reimport is requested.
 */
export interface ReimportRequestedEvent {
  meta: IModelAssetMeta;
  filename: string;
}

/**
 * Inspector for model import settings.
 * Displays and edits .assetmeta import configuration.
 */
export class ModelImportInspector {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly assetMetaService: AssetMetaService;
  // Project service reserved for future use (e.g., project-relative paths)
  private readonly _projectService: ProjectService;

  /** Currently displayed model meta */
  private currentMeta: IModelAssetMeta | null = null;

  /** Filename of the source file */
  private currentFilename: string = '';

  /** Directory containing the source file */
  private currentDirectoryHandle: FileSystemDirectoryHandle | null = null;

  /** Working copy of import settings (for pending edits) */
  private pendingSettings: IModelImportSettings | null = null;

  /** Track collapsed state of sections by title */
  private sectionStates: Map<string, boolean> = new Map();

  constructor(options: ModelImportInspectorOptions) {
    this.eventBus = options.eventBus;
    this.assetMetaService = options.assetMetaService;
    this._projectService = options.projectService;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'model-import-inspector';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      overflow-y: auto;
    `;

    // Initial empty state
    this.renderEmptyState();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Check if there are pending (unsaved) changes.
   */
  get hasPendingChanges(): boolean {
    if (!this.currentMeta || !this.pendingSettings) {
      return false;
    }
    return JSON.stringify(this.pendingSettings) !== JSON.stringify(this.currentMeta.importSettings);
  }

  /**
   * Set the model meta to display.
   *
   * @param meta - The model asset meta to display
   * @param filename - Name of the source file
   * @param directoryHandle - Directory containing the source file
   */
  setModelMeta(
    meta: IModelAssetMeta,
    filename: string,
    directoryHandle: FileSystemDirectoryHandle
  ): void {
    this.currentMeta = meta;
    this.currentFilename = filename;
    this.currentDirectoryHandle = directoryHandle;
    this.pendingSettings = this.cloneSettings(meta.importSettings);
    this.render();
  }

  /**
   * Clear the inspector display.
   */
  clear(): void {
    this.currentMeta = null;
    this.currentFilename = '';
    this.currentDirectoryHandle = null;
    this.pendingSettings = null;
    this.renderEmptyState();
  }

  /**
   * Deep clone import settings.
   */
  private cloneSettings(settings: IModelImportSettings): IModelImportSettings {
    return JSON.parse(JSON.stringify(settings));
  }

  /**
   * Render empty state.
   */
  private renderEmptyState(): void {
    this.container.innerHTML = `
      <div style="padding: var(--spacing-lg); text-align: center; color: var(--text-muted);">
        Select a model asset to view import settings
      </div>
    `;
  }

  /**
   * Render the inspector for current model meta.
   */
  private render(): void {
    if (!this.currentMeta || !this.pendingSettings) {
      this.renderEmptyState();
      return;
    }

    this.container.innerHTML = '';

    // Header with filename
    const header = document.createElement('div');
    header.className = 'inspector-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: var(--spacing-sm);
    `;

    const icon = document.createElement('span');
    icon.textContent = '📦';
    icon.style.fontSize = '1.2em';
    header.appendChild(icon);

    const filename = document.createElement('span');
    filename.textContent = this.currentFilename;
    filename.style.cssText = `
      font-weight: 600;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    header.appendChild(filename);

    this.container.appendChild(header);

    // Dirty indicator
    if (this.currentMeta.isDirty) {
      const dirtyWarning = document.createElement('div');
      dirtyWarning.style.cssText = `
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm);
        background: var(--warning-bg, rgba(255, 193, 7, 0.1));
        border: 1px solid var(--warning-border, rgba(255, 193, 7, 0.3));
        border-radius: var(--radius-sm);
        color: var(--warning-text, #ffc107);
        font-size: var(--font-size-sm);
        margin-bottom: var(--spacing-sm);
      `;
      dirtyWarning.innerHTML = `
        <span>⚠️</span>
        <span>Source file changed - reimport recommended</span>
      `;
      this.container.appendChild(dirtyWarning);
    }

    // Model Import Settings Section
    const settingsSection = this.createTrackedSection('Model Import Settings', true);
    const settingsContent = document.createElement('div');
    settingsContent.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    `;

    // Scale Factor
    settingsContent.appendChild(this.createScaleFactorField());

    // Coordinate Conversion
    settingsContent.appendChild(this.createCoordinateSection());

    settingsSection.setContent(settingsContent);
    this.container.appendChild(settingsSection.element);

    // Meshes Section
    const meshesSection = this.createTrackedSection('Meshes', true);
    meshesSection.setContent(this.createMeshesSection());
    this.container.appendChild(meshesSection.element);

    // Materials Section
    const materialsSection = this.createTrackedSection('Materials', true);
    materialsSection.setContent(this.createMaterialsSection());
    this.container.appendChild(materialsSection.element);

    // Action Buttons
    this.container.appendChild(this.createActionButtons());

    // Footer with metadata
    this.container.appendChild(this.createFooter());
  }

  /**
   * Create scale factor field.
   */
  private createScaleFactorField(): HTMLElement {
    const group = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Scale Factor';
    group.appendChild(label);

    const input = new DraggableNumberInput({
      value: this.pendingSettings!.scaleFactor,
      step: 0.01,
      min: 0.001,
      max: 1000,
      precision: 3,
      onChange: (value) => {
        if (this.pendingSettings) {
          this.pendingSettings.scaleFactor = value;
          this.updateActionButtons();
        }
      },
    });
    group.appendChild(input.element);

    const help = document.createElement('div');
    help.className = 'help-text';
    help.style.cssText = `
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-top: 2px;
    `;
    help.textContent = 'Use 0.01 to convert centimeters to meters';
    group.appendChild(help);

    return group;
  }

  /**
   * Create coordinate conversion section.
   */
  private createCoordinateSection(): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    `;

    // Convert to Z-Up checkbox
    const convertGroup = document.createElement('div');
    convertGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    `;

    const convertCheckbox = document.createElement('input');
    convertCheckbox.type = 'checkbox';
    convertCheckbox.id = 'convert-z-up';
    convertCheckbox.checked = this.pendingSettings!.convertCoordinates.convertToZUp;
    convertCheckbox.addEventListener('change', () => {
      if (this.pendingSettings) {
        this.pendingSettings.convertCoordinates.convertToZUp = convertCheckbox.checked;
        this.updateActionButtons();
      }
    });
    convertGroup.appendChild(convertCheckbox);

    const convertLabel = document.createElement('label');
    convertLabel.htmlFor = 'convert-z-up';
    convertLabel.textContent = 'Convert to Z-Up';
    convertGroup.appendChild(convertLabel);

    group.appendChild(convertGroup);

    // Source Up Axis dropdown
    const sourceUpGroup = document.createElement('div');

    const sourceUpLabel = document.createElement('label');
    sourceUpLabel.className = 'label';
    sourceUpLabel.textContent = 'Source Up Axis';
    sourceUpGroup.appendChild(sourceUpLabel);

    const sourceUpSelect = document.createElement('select');
    sourceUpSelect.className = 'input';
    sourceUpSelect.innerHTML = `
      <option value="Y">Y (GLTF Standard)</option>
      <option value="Z">Z</option>
    `;
    sourceUpSelect.value = this.pendingSettings!.convertCoordinates.sourceUp;
    sourceUpSelect.addEventListener('change', () => {
      if (this.pendingSettings) {
        this.pendingSettings.convertCoordinates.sourceUp = sourceUpSelect.value as CoordinateUpAxis;
        this.updateActionButtons();
      }
    });
    sourceUpGroup.appendChild(sourceUpSelect);

    group.appendChild(sourceUpGroup);

    return group;
  }

  /**
   * Create meshes import settings section.
   */
  private createMeshesSection(): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    `;

    // Generate Normals
    group.appendChild(this.createCheckboxField(
      'generate-normals',
      'Generate Normals',
      this.pendingSettings!.meshes.generateNormals,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.meshes.generateNormals = checked;
          this.updateActionButtons();
        }
      }
    ));

    // Normal Angle Threshold
    const angleGroup = document.createElement('div');
    const angleLabel = document.createElement('label');
    angleLabel.className = 'label';
    angleLabel.textContent = 'Angle Threshold';
    angleGroup.appendChild(angleLabel);

    const angleInput = new DraggableNumberInput({
      value: this.pendingSettings!.meshes.normalAngleThreshold,
      step: 1,
      min: 0,
      max: 180,
      precision: 0,
      onChange: (value) => {
        if (this.pendingSettings) {
          this.pendingSettings.meshes.normalAngleThreshold = value;
          this.updateActionButtons();
        }
      },
    });
    angleGroup.appendChild(angleInput.element);
    group.appendChild(angleGroup);

    // Generate Tangents
    group.appendChild(this.createCheckboxField(
      'generate-tangents',
      'Generate Tangents',
      this.pendingSettings!.meshes.generateTangents,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.meshes.generateTangents = checked;
          this.updateActionButtons();
        }
      }
    ));

    // Weld Vertices
    group.appendChild(this.createCheckboxField(
      'weld-vertices',
      'Weld Vertices',
      this.pendingSettings!.meshes.weldVertices,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.meshes.weldVertices = checked;
          this.updateActionButtons();
        }
      }
    ));

    // Optimize Mesh
    group.appendChild(this.createCheckboxField(
      'optimize-mesh',
      'Optimize Mesh',
      this.pendingSettings!.meshes.optimizeMesh,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.meshes.optimizeMesh = checked;
          this.updateActionButtons();
        }
      }
    ));

    return group;
  }

  /**
   * Create materials import settings section.
   */
  private createMaterialsSection(): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    `;

    // Import Materials
    group.appendChild(this.createCheckboxField(
      'import-materials',
      'Import Materials',
      this.pendingSettings!.materials.importMaterials,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.materials.importMaterials = checked;
          this.updateActionButtons();
        }
      }
    ));

    // Name Prefix
    const prefixGroup = document.createElement('div');
    const prefixLabel = document.createElement('label');
    prefixLabel.className = 'label';
    prefixLabel.textContent = 'Name Prefix';
    prefixGroup.appendChild(prefixLabel);

    const prefixInput = document.createElement('input');
    prefixInput.type = 'text';
    prefixInput.className = 'input';
    prefixInput.value = this.pendingSettings!.materials.namePrefix;
    prefixInput.placeholder = 'e.g., Car_';
    prefixInput.addEventListener('input', () => {
      if (this.pendingSettings) {
        this.pendingSettings.materials.namePrefix = prefixInput.value;
        this.updateActionButtons();
      }
    });
    prefixGroup.appendChild(prefixInput);
    group.appendChild(prefixGroup);

    // Extract Textures
    group.appendChild(this.createCheckboxField(
      'extract-textures',
      'Extract Textures',
      this.pendingSettings!.materials.extractTextures,
      (checked) => {
        if (this.pendingSettings) {
          this.pendingSettings.materials.extractTextures = checked;
          this.updateActionButtons();
        }
      }
    ));

    return group;
  }

  /**
   * Create a checkbox field.
   */
  private createCheckboxField(
    id: string,
    labelText: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    group.appendChild(checkbox);

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    group.appendChild(label);

    return group;
  }

  /**
   * Create action buttons (Revert / Apply).
   */
  private createActionButtons(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'action-buttons';
    container.style.cssText = `
      display: flex;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) 0;
      border-top: 1px solid var(--border-color);
      margin-top: var(--spacing-sm);
    `;

    // Revert button
    const revertBtn = document.createElement('button');
    revertBtn.textContent = 'Revert';
    revertBtn.className = 'btn btn-secondary revert-btn';
    revertBtn.style.cssText = `
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;
      flex: 1;
    `;
    revertBtn.disabled = !this.hasPendingChanges;
    revertBtn.addEventListener('click', () => this.handleRevert());
    container.appendChild(revertBtn);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.className = 'btn btn-primary apply-btn';
    applyBtn.style.cssText = `
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--accent-primary);
      color: var(--text-on-accent, #fff);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      flex: 1;
    `;
    applyBtn.disabled = !this.hasPendingChanges;
    applyBtn.addEventListener('click', () => this.handleApply());
    container.appendChild(applyBtn);

    return container;
  }

  /**
   * Create footer with metadata info.
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'inspector-footer';
    footer.style.cssText = `
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      padding: var(--spacing-sm) 0;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    if (this.currentMeta) {
      const importedAt = new Date(this.currentMeta.importedAt);
      const formattedDate = importedAt.toLocaleString();

      footer.innerHTML = `
        <div>Last imported: ${formattedDate}</div>
        <div title="${this.currentMeta.sourceHash}">Source hash: ${this.currentMeta.sourceHash.substring(0, 20)}...</div>
      `;
    }

    return footer;
  }

  /**
   * Update action button states based on pending changes.
   */
  private updateActionButtons(): void {
    const revertBtn = this.container.querySelector('.revert-btn') as HTMLButtonElement | null;
    const applyBtn = this.container.querySelector('.apply-btn') as HTMLButtonElement | null;

    if (revertBtn) {
      revertBtn.disabled = !this.hasPendingChanges;
    }
    if (applyBtn) {
      applyBtn.disabled = !this.hasPendingChanges;
    }
  }

  /**
   * Handle Revert button click.
   */
  private handleRevert(): void {
    if (this.currentMeta) {
      this.pendingSettings = this.cloneSettings(this.currentMeta.importSettings);
      this.render();
    }
  }

  /**
   * Handle Apply button click.
   */
  private async handleApply(): Promise<void> {
    if (!this.currentMeta || !this.pendingSettings || !this.currentDirectoryHandle) {
      return;
    }

    try {
      // Update the meta file with new import settings
      const result = await this.assetMetaService.updateMeta<IModelAssetMeta>(
        this.currentDirectoryHandle,
        this.currentFilename,
        {
          importSettings: this.pendingSettings,
        }
      );

      if (result.success && result.meta) {
        this.currentMeta = result.meta;
        this.pendingSettings = this.cloneSettings(result.meta.importSettings);
        this.render();

        // Emit event for reimport
        this.eventBus.emit<ReimportRequestedEvent>('modelMeta:settingsApplied', {
          meta: result.meta,
          filename: this.currentFilename,
        });
      } else {
        console.error('Failed to save import settings:', result.error);
      }
    } catch (error) {
      console.error('Failed to apply import settings:', error);
    }
  }

  /**
   * Create a collapsible section that tracks its own state.
   */
  private createTrackedSection(title: string, defaultExpanded: boolean): CollapsibleSection {
    const isExpanded = this.sectionStates.get(title) ?? defaultExpanded;
    const section = new CollapsibleSection({ title, defaultOpen: isExpanded });

    // Track toggle state
    const header = section.element.querySelector('.section-header');
    if (header) {
      header.addEventListener('click', () => {
        setTimeout(() => {
          this.sectionStates.set(title, section.expanded);
        }, 0);
      });
    }

    return section;
  }
}
