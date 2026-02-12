/**
 * PropertiesPanel
 *
 * Displays properties of the selected object with tabbed interface.
 * Includes Details tab, Text Editor tab, and Asset Browser tab.
 * Supports Entity Component System for dynamic property display.
 * NOT a plugin - standard UI panel.
 *
 * @example
 * ```ts
 * const panel = new PropertiesPanel({
 *   eventBus,
 *   sceneGraph,
 *   assetRegistry,
 *   materialFactory,
 *   shaderFactory
 * });
 * container.appendChild(panel.element);
 * ```
 */

import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import type { ISceneObject, IMeshComponent, IMaterialComponent, ICameraComponent, CameraClearFlags, ILightComponent } from '@core/interfaces';
import { isEntity } from '@core/interfaces';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { DraggableNumberInput } from '../components/DraggableNumberInput';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import type { ShaderAssetFactory } from '@core/assets/ShaderAssetFactory';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import { AssetBrowserTab } from '../tabs/AssetBrowserTab';
import { MonacoShaderEditor } from '../editors/MonacoShaderEditor';
import type { ShaderEditorService, ShaderCompilationEvent } from '@core/ShaderEditorService';

export interface PropertiesPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph to read from */
  sceneGraph: SceneGraph;
  /** Asset registry for Asset Browser tab (optional) */
  assetRegistry?: AssetRegistry;
  /** Material factory for Asset Browser tab (optional) */
  materialFactory?: MaterialAssetFactory;
  /** Shader factory for Asset Browser tab (optional) */
  shaderFactory?: ShaderAssetFactory;
  /** Shader editor service for live shader editing (optional) */
  shaderEditorService?: ShaderEditorService;
}

/**
 * Properties panel with tabbed interface.
 * NOT a plugin - receives dependencies via constructor.
 */
export class PropertiesPanel {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly header: HTMLDivElement;
  private readonly tabsContainer: HTMLDivElement;
  private readonly tabsList: HTMLDivElement;
  private readonly detailsTab: HTMLButtonElement;
  private readonly shaderTab: HTMLButtonElement;
  private readonly detailsContent: HTMLDivElement;
  private readonly shaderContent: HTMLDivElement;
  private assetsContent: HTMLDivElement | null = null;
  private assetsTab: HTMLButtonElement | null = null;
  private assetBrowserTab: AssetBrowserTab | null = null;

  private selectedObject: ISceneObject | null = null;

  /** Track collapsed state of sections by title (persists across re-renders) */
  private sectionStates: Map<string, boolean> = new Map();

  /** Monaco-based shader editor component */
  private monacoEditor: MonacoShaderEditor | null = null;

  /** Shader editor service for live compilation */
  private shaderEditorService: ShaderEditorService | null = null;

  /** Asset registry reference for shader/material lookups */
  private assetRegistry: AssetRegistry | null = null;

  /** Cleanup function for compilation event listener */
  private compilationUnsubscribe: (() => void) | null = null;

  constructor(options: PropertiesPanelOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'panel properties-panel';

    // Create header
    this.header = document.createElement('div');
    this.header.className = 'panel-header';
    this.header.innerHTML = `
      <span class="panel-header-title">Properties</span>
    `;

    // Create tabs container
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'tabs-container';

    // Create tabs list
    this.tabsList = document.createElement('div');
    this.tabsList.className = 'tabs-list';

    // Details tab trigger
    this.detailsTab = document.createElement('button');
    this.detailsTab.className = 'tab-trigger active';
    this.detailsTab.textContent = 'Details';
    this.detailsTab.addEventListener('click', () => this.switchTab('details'));

    // Shader tab trigger
    this.shaderTab = document.createElement('button');
    this.shaderTab.className = 'tab-trigger';
    this.shaderTab.textContent = 'Text Editor';
    this.shaderTab.addEventListener('click', () => this.switchTab('shader'));

    this.tabsList.appendChild(this.detailsTab);
    this.tabsList.appendChild(this.shaderTab);

    // Create tab contents
    this.detailsContent = document.createElement('div');
    this.detailsContent.className = 'tab-content active';

    this.shaderContent = document.createElement('div');
    this.shaderContent.className = 'tab-content';
    this.shaderContent.style.cssText = 'height: 100%;';

    // Store service references
    this.shaderEditorService = options.shaderEditorService ?? null;
    this.assetRegistry = options.assetRegistry ?? null;

    // Create Monaco shader editor (replaces textarea)
    this.monacoEditor = new MonacoShaderEditor();
    this.shaderContent.appendChild(this.monacoEditor.element);

    // Wire Monaco editor to ShaderEditorService
    if (this.shaderEditorService) {
      const service = this.shaderEditorService;

      this.monacoEditor.onSourceChange = (stage, source) => {
        service.updateSource(stage, source);
      };

      this.monacoEditor.onSave = () => {
        service.saveShader();
      };

      this.monacoEditor.onRevert = () => {
        if (service.revertShader()) {
          this.monacoEditor?.setSource('vertex', service.vertexSource);
          this.monacoEditor?.setSource('fragment', service.fragmentSource);
          this.monacoEditor?.clearErrors();
          this.monacoEditor?.setCompilationStatus('success');
        }
      };

      // Listen for compilation results
      this.compilationUnsubscribe = this.eventBus.on<ShaderCompilationEvent>(
        'shader:compilationResult',
        (data) => {
          if (!this.monacoEditor) return;
          if (data.result.success) {
            this.monacoEditor.clearErrors();
            this.monacoEditor.setCompilationStatus('success');
          } else {
            this.monacoEditor.setErrors(data.result.errors ?? []);
            this.monacoEditor.setCompilationStatus('error', data.result.errors?.length ?? 0);
          }
        },
      );
    }

    // Add Asset Browser tab if dependencies are provided
    if (options.assetRegistry && options.materialFactory && options.shaderFactory) {
      // Assets tab trigger
      const assetsTabBtn = document.createElement('button');
      assetsTabBtn.className = 'tab-trigger';
      assetsTabBtn.textContent = 'Assets';
      assetsTabBtn.addEventListener('click', () => this.switchTab('assets'));
      this.tabsList.appendChild(assetsTabBtn);
      this.assetsTab = assetsTabBtn;

      // Assets content
      const assetsDiv = document.createElement('div');
      assetsDiv.className = 'tab-content';
      this.assetsContent = assetsDiv;

      // Create Asset Browser Tab component
      this.assetBrowserTab = new AssetBrowserTab({
        eventBus: this.eventBus,
        assetRegistry: options.assetRegistry,
        materialFactory: options.materialFactory,
        shaderFactory: options.shaderFactory,
      });
      assetsDiv.appendChild(this.assetBrowserTab.element);
    }

    // Assemble tabs
    this.tabsContainer.appendChild(this.tabsList);
    this.tabsContainer.appendChild(this.detailsContent);
    this.tabsContainer.appendChild(this.shaderContent);
    if (this.assetsContent) {
      this.tabsContainer.appendChild(this.assetsContent);
    }

    // Assemble panel
    this.container.appendChild(this.header);
    this.container.appendChild(this.tabsContainer);

    // Setup event listeners
    this.setupEvents();

    // Initial render
    this.renderDetails();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Set shader code in the editor.
   */
  setShaderCode(code: string): void {
    const textarea = this.shaderContent.querySelector('textarea');
    if (textarea) {
      textarea.value = code;
    }
  }

  /**
   * Get shader code from the editor.
   */
  getShaderCode(): string {
    const textarea = this.shaderContent.querySelector('textarea');
    return textarea?.value ?? '';
  }

  /**
   * Clean up.
   */
  dispose(): void {
    this.eventBus.off('selection:changed', this.handleSelectionChange);
    this.eventBus.off('entity:propertyUpdated', this.handleExternalPropertyUpdate);
    this.eventBus.off('scene:objectRenamed', this.handleObjectRenamed);

    if (this.compilationUnsubscribe) {
      this.compilationUnsubscribe();
      this.compilationUnsubscribe = null;
    }
  }

  private setupEvents(): void {
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handleExternalPropertyUpdate = this.handleExternalPropertyUpdate.bind(this);
    this.handleObjectRenamed = this.handleObjectRenamed.bind(this);

    this.eventBus.on('selection:changed', this.handleSelectionChange);
    // Listen for external property updates (from gizmos, scripts, etc.)
    // This enables bidirectional sync: when a gizmo changes entity data,
    // the Properties Panel updates to show the new values
    this.eventBus.on('entity:propertyUpdated', this.handleExternalPropertyUpdate);
    this.eventBus.off('object:propertyChanged', this.handlePropertyChange);
    this.eventBus.on('scene:objectRenamed', this.handleObjectRenamed);
  }

  private handleSelectionChange(data: { id: string }): void {
    this.selectedObject = this.sceneGraph.find(data.id) ?? null;
    this.renderDetails();
  }

  /**
   * Handle external property updates (from gizmos, scripts, etc.).
   * Only re-renders if the updated entity is currently selected.
   * This enables bidirectional sync for future transform gizmos.
   */
  private handleExternalPropertyUpdate(data: { id: string; property: string }): void {
    // Only update if this is the currently selected object
    if (!this.selectedObject || this.selectedObject.id !== data.id) {
      return;
    }

    // Re-render to show updated values
    // Note: A future optimization would be to update only the specific input
    // rather than full re-render, but this works for now
    this.renderDetails();
  }

  private handlePropertyChange(): void {
    // This was previously used to re-render on own property changes,
    // but that causes issues with input focus. Now we only listen for
    // external updates via entity:propertyUpdated
  }

  private handleObjectRenamed(data: { object: { id: string }; newName: string }): void {
    // Re-render if the renamed object is currently selected
    if (this.selectedObject && this.selectedObject.id === data.object.id) {
      this.renderDetails();
    }
  }

  private switchTab(tab: 'details' | 'shader' | 'assets'): void {
    // Update tab button states
    this.detailsTab.classList.toggle('active', tab === 'details');
    this.shaderTab.classList.toggle('active', tab === 'shader');
    if (this.assetsTab) {
      this.assetsTab.classList.toggle('active', tab === 'assets');
    }

    // Update content visibility
    this.detailsContent.classList.toggle('active', tab === 'details');
    this.shaderContent.classList.toggle('active', tab === 'shader');
    if (this.assetsContent) {
      this.assetsContent.classList.toggle('active', tab === 'assets');
    }

    // Lazy-initialize Monaco when shader tab is first activated
    if (tab === 'shader' && this.monacoEditor && !this.monacoEditor.isReady) {
      this.monacoEditor.initialize();
    }

    // Re-layout Monaco when tab becomes visible
    if (tab === 'shader' && this.monacoEditor?.isReady) {
      setTimeout(() => this.monacoEditor?.layout(), 0);
    }
  }

  private renderDetails(): void {
    this.detailsContent.innerHTML = '';

    if (!this.selectedObject) {
      this.detailsContent.innerHTML = `
        <div style="padding: var(--spacing-lg); text-align: center; color: var(--text-muted);">
          No object selected
        </div>
      `;
      return;
    }

    const obj = this.selectedObject;
    const isRootScene = obj.id === 'root';
    const contentWrapper = document.createElement('div');
    contentWrapper.style.padding = '0';

    // Object Name Section
    const nameSection = this.createTrackedSection('Object', true);
    const nameContent = document.createElement('div');
    nameContent.style.display = 'flex';
    nameContent.style.flexDirection = 'column';
    nameContent.style.gap = 'var(--spacing-sm)';

    // Name input
    const nameLabel = document.createElement('label');
    nameLabel.className = 'label';
    nameLabel.textContent = 'Name';
    nameContent.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input';
    nameInput.value = obj.name;
    nameInput.addEventListener('change', () => {
      this.emitPropertyChange('name', nameInput.value);
    });
    nameContent.appendChild(nameInput);

    // Entity ID (if it's an entity)
    if (isEntity(obj)) {
      const idLabel = document.createElement('label');
      idLabel.className = 'label';
      idLabel.textContent = 'Entity ID';
      nameContent.appendChild(idLabel);

      const idDisplay = document.createElement('div');
      idDisplay.className = 'input';
      idDisplay.style.backgroundColor = 'var(--bg-tertiary)';
      idDisplay.style.cursor = 'default';
      idDisplay.textContent = `#${obj.entityId}`;
      nameContent.appendChild(idDisplay);
    }

    nameSection.setContent(nameContent);
    contentWrapper.appendChild(nameSection.element);

    // Skip Transform and other components for root scene object
    if (isRootScene) {
      this.detailsContent.appendChild(contentWrapper);
      return;
    }

    // Transform Section
    const transformSection = this.createTrackedSection('Transform', true);
    const transformContent = document.createElement('div');
    transformContent.style.display = 'flex';
    transformContent.style.flexDirection = 'column';
    transformContent.style.gap = 'var(--spacing-md)';

    // Position
    transformContent.appendChild(this.createVector3Group(
      'Position',
      obj.transform.position,
      (axis, value) => this.emitPropertyChange(`position.${axis}`, value)
    ));

    // Rotation
    transformContent.appendChild(this.createVector3Group(
      'Rotation',
      obj.transform.rotation,
      (axis, value) => this.emitPropertyChange(`rotation.${axis}`, value),
      1 // integer step for rotation
    ));

    // Scale
    transformContent.appendChild(this.createVector3Group(
      'Scale',
      obj.transform.scale,
      (axis, value) => this.emitPropertyChange(`scale.${axis}`, value)
    ));

    transformSection.setContent(transformContent);
    contentWrapper.appendChild(transformSection.element);

    // Mesh Component Section (if entity has mesh component)
    if (isEntity(obj) && obj.hasComponent('mesh')) {
      const meshComponent = obj.getComponent<IMeshComponent>('mesh');
      if (meshComponent) {
        const meshSection = this.createTrackedSection('Mesh', true);
        const meshContent = document.createElement('div');
        meshContent.style.display = 'flex';
        meshContent.style.flexDirection = 'column';
        meshContent.style.gap = 'var(--spacing-sm)';

        // Vertex Count
        meshContent.appendChild(this.createReadonlyField('Vertices', meshComponent.vertexCount.toString()));

        // Edge Count
        meshContent.appendChild(this.createReadonlyField('Edges', meshComponent.edgeCount.toString()));

        // Triangle Count
        meshContent.appendChild(this.createReadonlyField('Triangles', meshComponent.triangleCount.toString()));

        // Double Sided
        if (meshComponent.doubleSided !== undefined) {
          meshContent.appendChild(this.createReadonlyField('Double Sided', meshComponent.doubleSided ? 'Yes' : 'No'));
        }

        meshSection.setContent(meshContent);
        contentWrapper.appendChild(meshSection.element);
      }
    }

// Material Component Section (if entity has material component)
    if (isEntity(obj) && obj.hasComponent('material')) {
      const materialComponent = obj.getComponent<IMaterialComponent>('material');
      if (materialComponent) {
        const materialSection = this.createTrackedSection('Material', true);
        const materialContent = document.createElement('div');
        materialContent.style.display = 'flex';
        materialContent.style.flexDirection = 'column';
        materialContent.style.gap = 'var(--spacing-sm)';

        // Shader Name + Edit Shader button row
        const shaderRow = document.createElement('div');
        shaderRow.style.display = 'flex';
        shaderRow.style.alignItems = 'center';
        shaderRow.style.gap = 'var(--spacing-sm)';

        const shaderField = this.createReadonlyField('Shader', materialComponent.shaderName);
        shaderField.style.flex = '1';
        shaderRow.appendChild(shaderField);

        // "Edit Shader" button - opens shader in Monaco editor tab
        const editShaderBtn = document.createElement('button');
        editShaderBtn.textContent = '📝 Edit';
        editShaderBtn.title = 'Edit shader source code';
        editShaderBtn.style.cssText = `
          padding: 2px 8px;
          font-size: var(--font-size-xs);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          align-self: flex-end;
        `;
        editShaderBtn.addEventListener('click', () => {
          this.openShaderForEditing(materialComponent);
        });
        shaderRow.appendChild(editShaderBtn);

        materialContent.appendChild(shaderRow);

        // Color
        if (materialComponent.color) {
          const colorGroup = document.createElement('div');

          const colorLabel = document.createElement('label');
          colorLabel.className = 'label';
          colorLabel.textContent = 'Color';
          colorGroup.appendChild(colorLabel);

          const colorRow = document.createElement('div');
          colorRow.style.display = 'flex';
          colorRow.style.gap = 'var(--spacing-sm)';

          const colorPicker = document.createElement('input');
          colorPicker.type = 'color';
          colorPicker.className = 'input';
          colorPicker.style.width = '64px';

          // Convert [0-1] RGB to hex
          const r = Math.round(materialComponent.color[0] * 255);
          const g = Math.round(materialComponent.color[1] * 255);
          const b = Math.round(materialComponent.color[2] * 255);
          const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          colorPicker.value = hexColor;

          const colorText = document.createElement('input');
          colorText.type = 'text';
          colorText.className = 'input';
          colorText.style.flex = '1';
          colorText.value = hexColor;

          colorPicker.addEventListener('change', () => {
            colorText.value = colorPicker.value;
            this.emitPropertyChange('material.color', colorPicker.value);
          });

          colorText.addEventListener('change', () => {
            colorPicker.value = colorText.value;
            this.emitPropertyChange('material.color', colorText.value);
          });

          colorRow.appendChild(colorPicker);
          colorRow.appendChild(colorText);
          colorGroup.appendChild(colorRow);
          materialContent.appendChild(colorGroup);
        }

        // Opacity
        if (materialComponent.opacity !== undefined) {
          materialContent.appendChild(this.createReadonlyField('Opacity', materialComponent.opacity.toFixed(2)));
        }

        materialSection.setContent(materialContent);
        contentWrapper.appendChild(materialSection.element);
      }
    }

// Camera Component Section (if entity has camera component)
    if (isEntity(obj) && obj.hasComponent('camera')) {
      const cameraComponent = obj.getComponent<ICameraComponent>('camera');
      if (cameraComponent) {
        const cameraSection = this.createTrackedSection('Camera', true);
        const cameraContent = document.createElement('div');
        cameraContent.style.display = 'flex';
        cameraContent.style.flexDirection = 'column';
        cameraContent.style.gap = 'var(--spacing-sm)';

        // Field of View
        const fovGroup = document.createElement('div');
        const fovLabel = document.createElement('label');
        fovLabel.className = 'label';
        fovLabel.textContent = 'Field of View';
        fovGroup.appendChild(fovLabel);

        const fovInput = new DraggableNumberInput({
          value: cameraComponent.fieldOfView,
          step: 1,
          min: 1,
          max: 179,
          precision: 0,
          onChange: (value) => this.emitPropertyChange('camera.fieldOfView', value)
        });
        fovGroup.appendChild(fovInput.element);
        cameraContent.appendChild(fovGroup);

        // Near Clip Plane
        const nearGroup = document.createElement('div');
        const nearLabel = document.createElement('label');
        nearLabel.className = 'label';
        nearLabel.textContent = 'Near Clip Plane';
        nearGroup.appendChild(nearLabel);

        const nearInput = new DraggableNumberInput({
          value: cameraComponent.nearClipPlane,
          step: 0.01,
          min: 0.001,
          precision: 3,
          onChange: (value) => this.emitPropertyChange('camera.nearClipPlane', value)
        });
        nearGroup.appendChild(nearInput.element);
        cameraContent.appendChild(nearGroup);

        // Far Clip Plane
        const farGroup = document.createElement('div');
        const farLabel = document.createElement('label');
        farLabel.className = 'label';
        farLabel.textContent = 'Far Clip Plane';
        farGroup.appendChild(farLabel);

        const farInput = new DraggableNumberInput({
          value: cameraComponent.farClipPlane,
          step: 10,
          min: 1,
          precision: 0,
          onChange: (value) => this.emitPropertyChange('camera.farClipPlane', value)
        });
        farGroup.appendChild(farInput.element);
        cameraContent.appendChild(farGroup);

        // Clear Flags dropdown
        const clearFlagsGroup = document.createElement('div');
        const clearFlagsLabel = document.createElement('label');
        clearFlagsLabel.className = 'label';
        clearFlagsLabel.textContent = 'Clear Flags';
        clearFlagsGroup.appendChild(clearFlagsLabel);

        const clearFlagsSelect = document.createElement('select');
        clearFlagsSelect.className = 'input';
        const clearFlagsOptions: CameraClearFlags[] = ['skybox', 'solidColor', 'depthOnly', 'none'];
        clearFlagsOptions.forEach(flag => {
          const option = document.createElement('option');
          option.value = flag;
          option.textContent = flag.charAt(0).toUpperCase() + flag.slice(1).replace(/([A-Z])/g, ' $1');
          if (flag === cameraComponent.clearFlags) {
            option.selected = true;
          }
          clearFlagsSelect.appendChild(option);
        });
        clearFlagsSelect.addEventListener('change', () => {
          this.emitPropertyChange('camera.clearFlags', clearFlagsSelect.value);
        });
        clearFlagsGroup.appendChild(clearFlagsSelect);
        cameraContent.appendChild(clearFlagsGroup);

        // Background Color
        const bgColorGroup = document.createElement('div');
        const bgColorLabel = document.createElement('label');
        bgColorLabel.className = 'label';
        bgColorLabel.textContent = 'Background Color';
        bgColorGroup.appendChild(bgColorLabel);

        const bgColorRow = document.createElement('div');
        bgColorRow.style.display = 'flex';
        bgColorRow.style.gap = 'var(--spacing-sm)';

        const bgColorPicker = document.createElement('input');
        bgColorPicker.type = 'color';
        bgColorPicker.className = 'input';
        bgColorPicker.style.width = '64px';

        // Convert [0-1] RGB to hex
        const bgR = Math.round(cameraComponent.backgroundColor[0] * 255);
        const bgG = Math.round(cameraComponent.backgroundColor[1] * 255);
        const bgB = Math.round(cameraComponent.backgroundColor[2] * 255);
        const bgHexColor = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;
        bgColorPicker.value = bgHexColor;

        const bgColorText = document.createElement('input');
        bgColorText.type = 'text';
        bgColorText.className = 'input';
        bgColorText.style.flex = '1';
        bgColorText.value = bgHexColor;

        bgColorPicker.addEventListener('change', () => {
          bgColorText.value = bgColorPicker.value;
          this.emitPropertyChange('camera.backgroundColor', bgColorPicker.value);
        });

        bgColorText.addEventListener('change', () => {
          bgColorPicker.value = bgColorText.value;
          this.emitPropertyChange('camera.backgroundColor', bgColorText.value);
        });

        bgColorRow.appendChild(bgColorPicker);
        bgColorRow.appendChild(bgColorText);
        bgColorGroup.appendChild(bgColorRow);
        cameraContent.appendChild(bgColorGroup);

        cameraSection.setContent(cameraContent);
        contentWrapper.appendChild(cameraSection.element);
      }
    }

    // Light Component Section (if entity has light component)
    if (isEntity(obj) && obj.hasComponent('light')) {
      const lightComponent = obj.getComponent<ILightComponent>('light');
      if (lightComponent) {
        const lightSection = this.createTrackedSection('Light', true);
        const lightContent = document.createElement('div');
        lightContent.style.display = 'flex';
        lightContent.style.flexDirection = 'column';
        lightContent.style.gap = 'var(--spacing-sm)';

        // Light Type (read-only display)
        const typeGroup = document.createElement('div');
        const typeLabel = document.createElement('label');
        typeLabel.className = 'label';
        typeLabel.textContent = 'Type';
        typeGroup.appendChild(typeLabel);

        const typeDisplay = document.createElement('div');
        typeDisplay.className = 'input';
        typeDisplay.style.backgroundColor = 'var(--bg-tertiary)';
        typeDisplay.style.cursor = 'default';
        typeDisplay.textContent = lightComponent.lightType.charAt(0).toUpperCase() + lightComponent.lightType.slice(1);
        typeGroup.appendChild(typeDisplay);
        lightContent.appendChild(typeGroup);

        // Enabled checkbox
        const enabledGroup = document.createElement('div');
        enabledGroup.style.display = 'flex';
        enabledGroup.style.alignItems = 'center';
        enabledGroup.style.gap = 'var(--spacing-sm)';

        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = lightComponent.enabled;
        enabledCheckbox.id = `light-enabled-${obj.id}`;
        enabledCheckbox.addEventListener('change', () => {
          this.emitPropertyChange('light.enabled', enabledCheckbox.checked);
        });

        const enabledLabel = document.createElement('label');
        enabledLabel.htmlFor = `light-enabled-${obj.id}`;
        enabledLabel.className = 'label';
        enabledLabel.style.marginBottom = '0';
        enabledLabel.textContent = 'Enabled';

        enabledGroup.appendChild(enabledCheckbox);
        enabledGroup.appendChild(enabledLabel);
        lightContent.appendChild(enabledGroup);

        // Light Color
        const colorGroup = document.createElement('div');
        const colorLabel = document.createElement('label');
        colorLabel.className = 'label';
        colorLabel.textContent = 'Color';
        colorGroup.appendChild(colorLabel);

        const colorRow = document.createElement('div');
        colorRow.style.display = 'flex';
        colorRow.style.gap = 'var(--spacing-sm)';

        const lightColorPicker = document.createElement('input');
        lightColorPicker.type = 'color';
        lightColorPicker.className = 'input';
        lightColorPicker.style.width = '64px';

        // Convert [0-1] RGB to hex
        const lightR = Math.round(lightComponent.color[0] * 255);
        const lightG = Math.round(lightComponent.color[1] * 255);
        const lightB = Math.round(lightComponent.color[2] * 255);
        const lightHexColor = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
        lightColorPicker.value = lightHexColor;

        const lightColorText = document.createElement('input');
        lightColorText.type = 'text';
        lightColorText.className = 'input';
        lightColorText.style.flex = '1';
        lightColorText.value = lightHexColor;

        lightColorPicker.addEventListener('change', () => {
          lightColorText.value = lightColorPicker.value;
          this.emitPropertyChange('light.color', lightColorPicker.value);
        });

        lightColorText.addEventListener('change', () => {
          lightColorPicker.value = lightColorText.value;
          this.emitPropertyChange('light.color', lightColorText.value);
        });

        colorRow.appendChild(lightColorPicker);
        colorRow.appendChild(lightColorText);
        colorGroup.appendChild(colorRow);
        lightContent.appendChild(colorGroup);

        // Intensity
        const intensityGroup = document.createElement('div');
        const intensityLabel = document.createElement('label');
        intensityLabel.className = 'label';
        intensityLabel.textContent = 'Intensity';
        intensityGroup.appendChild(intensityLabel);

        const intensityInput = new DraggableNumberInput({
          value: lightComponent.intensity,
          step: 0.1,
          min: 0,
          max: 10,
          precision: 2,
          onChange: (value) => this.emitPropertyChange('light.intensity', value)
        });
        intensityGroup.appendChild(intensityInput.element);
        lightContent.appendChild(intensityGroup);

        // Range (for point/spot lights only)
        if (lightComponent.lightType === 'point' || lightComponent.lightType === 'spot') {
          const rangeGroup = document.createElement('div');
          const rangeLabel = document.createElement('label');
          rangeLabel.className = 'label';
          rangeLabel.textContent = 'Range';
          rangeGroup.appendChild(rangeLabel);

          const rangeInput = new DraggableNumberInput({
            value: lightComponent.range ?? 10,
            step: 0.5,
            min: 0.1,
            precision: 1,
            onChange: (value) => this.emitPropertyChange('light.range', value)
          });
          rangeGroup.appendChild(rangeInput.element);
          lightContent.appendChild(rangeGroup);
        }

        // Spot Angle (for spot lights only)
        if (lightComponent.lightType === 'spot') {
          const spotAngleGroup = document.createElement('div');
          const spotAngleLabel = document.createElement('label');
          spotAngleLabel.className = 'label';
          spotAngleLabel.textContent = 'Spot Angle';
          spotAngleGroup.appendChild(spotAngleLabel);

          const spotAngleInput = new DraggableNumberInput({
            value: lightComponent.spotAngle ?? 30,
            step: 1,
            min: 1,
            max: 179,
            precision: 0,
            onChange: (value) => this.emitPropertyChange('light.spotAngle', value)
          });
          spotAngleGroup.appendChild(spotAngleInput.element);
          lightContent.appendChild(spotAngleGroup);
        }

        lightSection.setContent(lightContent);
        contentWrapper.appendChild(lightSection.element);
      }
    }

    // Sphere Parameters Section (if object is a Sphere)
    // Check for Sphere-specific methods - duck typing to avoid coupling
    const sphereEntity = obj as {
      getSegments?: () => number;
      getRings?: () => number;
      getRadius?: () => number;
    };
    if (
      typeof sphereEntity.getSegments === 'function' &&
      typeof sphereEntity.getRings === 'function' &&
      typeof sphereEntity.getRadius === 'function'
    ) {
      const sphereSection = this.createTrackedSection('Sphere Parameters', true);
      const sphereContent = document.createElement('div');
      sphereContent.style.display = 'flex';
      sphereContent.style.flexDirection = 'column';
      sphereContent.style.gap = 'var(--spacing-sm)';

      // Read-only fields for now (changing these would require mesh regeneration)
      sphereContent.appendChild(this.createReadonlyField('Segments', sphereEntity.getSegments().toString()));
      sphereContent.appendChild(this.createReadonlyField('Rings', sphereEntity.getRings().toString()));
      sphereContent.appendChild(this.createReadonlyField('Radius', sphereEntity.getRadius().toFixed(2)));

      // Add note about why these are read-only
      const noteDiv = document.createElement('div');
      noteDiv.style.fontSize = 'var(--font-size-xs)';
      noteDiv.style.color = 'var(--text-muted)';
      noteDiv.style.fontStyle = 'italic';
      noteDiv.style.marginTop = 'var(--spacing-xs)';
      noteDiv.textContent = 'Sphere geometry is generated at creation time.';
      sphereContent.appendChild(noteDiv);

      sphereSection.setContent(sphereContent);
      contentWrapper.appendChild(sphereSection.element);
    }

    // Fallback Material Section (for non-entity objects without material component)
    if (!isEntity(obj) || !obj.hasComponent('material')) {
      const materialSection = this.createTrackedSection('Material', true);
      const materialInput = document.createElement('input');
      materialInput.type = 'text';
      materialInput.className = 'input';
      materialInput.value = 'DefaultMaterial';
      materialInput.addEventListener('change', () => {
        this.emitPropertyChange('material', materialInput.value);
      });
      materialSection.setContent(materialInput);
      contentWrapper.appendChild(materialSection.element);
    }

    this.detailsContent.appendChild(contentWrapper);
  }

  /**
   * Create a readonly field display.
   */
  private createReadonlyField(label: string, value: string): HTMLElement {
    const group = document.createElement('div');

    const labelEl = document.createElement('label');
    labelEl.className = 'label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const display = document.createElement('div');
    display.className = 'input';
    display.style.backgroundColor = 'var(--bg-tertiary)';
    display.style.cursor = 'default';
    display.textContent = value;
    group.appendChild(display);

    return group;
  }

  private createVector3Group(
    label: string,
    values: [number, number, number],
    onChange: (axis: 'x' | 'y' | 'z', value: number) => void,
    step: number = 0.1
  ): HTMLElement {
    const group = document.createElement('div');

    const labelEl = document.createElement('label');
    labelEl.className = 'label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const inputs = document.createElement('div');
    inputs.className = 'vector3-group';

    const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    axes.forEach((axis, index) => {
      const item = document.createElement('div');
      item.className = 'vector3-item';

      const axisLabel = document.createElement('label');
      axisLabel.className = 'label-axis';
      axisLabel.textContent = axis.toUpperCase();
      item.appendChild(axisLabel);

      const input = new DraggableNumberInput({
        value: values[index],
        step: step,
        precision: step < 1 ? 1 : 0,
        onChange: (value) => onChange(axis, value)
      });
      item.appendChild(input.element);

      inputs.appendChild(item);
    });

    group.appendChild(inputs);
    return group;
  }

  private emitPropertyChange(property: string, value: unknown): void {
    if (!this.selectedObject) return;

    this.eventBus.emit('object:propertyChanged', {
      id: this.selectedObject.id,
      property,
      value
    });
  }

  /**
   * Open a shader for editing in the Monaco-based shader editor tab.
   *
   * Resolves the shader from the entity's material component:
   * 1. If material has materialAssetRef → look up IMaterialAsset → get shaderRef → look up IShaderAsset
   * 2. Otherwise, resolve from built-in shader name ('pbr' or 'default')
   *
   * Opens the shader in ShaderEditorService and switches to the shader editor tab.
   */
  private openShaderForEditing(material: IMaterialComponent): void {
    if (!this.shaderEditorService || !this.assetRegistry) {
      console.warn('PropertiesPanel: ShaderEditorService or AssetRegistry not available');
      return;
    }

    let shaderAsset: IShaderAsset | undefined;

    // Try to resolve via materialAssetRef → IMaterialAsset → shaderRef
    if (material.materialAssetRef) {
      const materialAsset = this.assetRegistry.get<IMaterialAsset>(material.materialAssetRef.uuid);
      if (materialAsset) {
        shaderAsset = this.assetRegistry.get<IShaderAsset>(materialAsset.shaderRef.uuid) ?? undefined;
      }
    }

    // Fallback: resolve from shaderName to built-in shader
    if (!shaderAsset) {
      const shaders = this.assetRegistry.getByType<IShaderAsset>('shader');
      if (material.shaderName === 'pbr') {
        shaderAsset = shaders.find(s => s.name === 'PBR');
      } else {
        shaderAsset = shaders.find(s => s.name === 'Unlit') ?? shaders[0];
      }
    }

    if (!shaderAsset) {
      console.warn('PropertiesPanel: Could not resolve shader for material');
      return;
    }

    // Open shader in service
    const opened = this.shaderEditorService.openShader(shaderAsset.uuid);
    if (!opened) return;

    // Load source into Monaco editor
    if (this.monacoEditor) {
      this.monacoEditor.readOnly = shaderAsset.isBuiltIn;
      this.monacoEditor.setSource('vertex', this.shaderEditorService.vertexSource);
      this.monacoEditor.setSource('fragment', this.shaderEditorService.fragmentSource);
      this.monacoEditor.clearErrors();
      this.monacoEditor.setCompilationStatus(
        this.shaderEditorService.status,
        this.shaderEditorService.errors.length,
      );
    }

    // Switch to shader editor tab
    this.switchTab('shader');
  }

  /**
   * Create a collapsible section that tracks and restores its collapsed state.
   * State is persisted across re-renders using the section title as key.
   */
  private createTrackedSection(title: string, defaultOpen: boolean): CollapsibleSection {
    // Get saved state or use default
    const isOpen = this.sectionStates.has(title)
      ? this.sectionStates.get(title)!
      : defaultOpen;

    const section = new CollapsibleSection({ title, defaultOpen: isOpen });

    // Listen for toggle events to save state
    // CollapsibleSection uses click on header to toggle
    const header = section.element.querySelector('.collapsible-header');
    if (header) {
      header.addEventListener('click', () => {
        // After the section toggles, save its new state
        // Small delay to let the toggle complete
        setTimeout(() => {
          this.sectionStates.set(title, section.expanded);
        }, 0);
      });
    }

    return section;
  }
}

/**
 * Default shader editor placeholder text.
 */
export const DEFAULT_SHADER_CODE = `// Select Mesh Object to Display Shader Code`;
