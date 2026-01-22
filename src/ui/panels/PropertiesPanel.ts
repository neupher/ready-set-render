/**
 * PropertiesPanel
 *
 * Displays properties of the selected object with tabbed interface.
 * Includes Details tab and Shader Editor tab.
 * NOT a plugin - standard UI panel.
 *
 * @example
 * ```ts
 * const panel = new PropertiesPanel({
 *   eventBus,
 *   sceneGraph
 * });
 * container.appendChild(panel.element);
 * ```
 */

import { EventBus } from '@core/EventBus';
import { SceneGraph, SceneObject } from '@core/SceneGraph';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { DraggableNumberInput } from '../components/DraggableNumberInput';

export interface PropertiesPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph to read from */
  sceneGraph: SceneGraph;
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

  private selectedObject: SceneObject | null = null;

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
    this.shaderContent.innerHTML = `
      <div style="padding: var(--spacing-sm); height: 100%;">
        <textarea
          class="shader-editor"
          style="
            width: 100%;
            height: calc(100% - 16px);
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-primary);
            padding: var(--spacing-sm);
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: var(--font-size-sm);
            resize: none;
            outline: none;
          "
          placeholder="// GLSL Shader Code"
        ></textarea>
      </div>
    `;

    // Assemble tabs
    this.tabsContainer.appendChild(this.tabsList);
    this.tabsContainer.appendChild(this.detailsContent);
    this.tabsContainer.appendChild(this.shaderContent);

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
    this.eventBus.off('object:propertyChanged', this.handlePropertyChange);
  }

  private setupEvents(): void {
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handlePropertyChange = this.handlePropertyChange.bind(this);

    this.eventBus.on('selection:changed', this.handleSelectionChange);
    this.eventBus.on('object:propertyChanged', this.handlePropertyChange);
  }

  private handleSelectionChange(data: { id: string }): void {
    this.selectedObject = this.sceneGraph.find(data.id) ?? null;
    this.renderDetails();
  }

  private handlePropertyChange(): void {
    this.renderDetails();
  }

  private switchTab(tab: 'details' | 'shader'): void {

    if (tab === 'details') {
      this.detailsTab.classList.add('active');
      this.shaderTab.classList.remove('active');
      this.detailsContent.classList.add('active');
      this.shaderContent.classList.remove('active');
    } else {
      this.detailsTab.classList.remove('active');
      this.shaderTab.classList.add('active');
      this.detailsContent.classList.remove('active');
      this.shaderContent.classList.add('active');
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
    const contentWrapper = document.createElement('div');
    contentWrapper.style.padding = '0';

    // Object Name Section
    const nameSection = new CollapsibleSection({ title: 'Object Name', defaultOpen: true });
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input';
    nameInput.value = obj.name;
    nameInput.addEventListener('change', () => {
      this.emitPropertyChange('name', nameInput.value);
    });
    nameSection.setContent(nameInput);
    contentWrapper.appendChild(nameSection.element);

    // Transform Section
    const transformSection = new CollapsibleSection({ title: 'Transform', defaultOpen: true });
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

    // Material Section (placeholder)
    const materialSection = new CollapsibleSection({ title: 'Material', defaultOpen: true });
    const materialInput = document.createElement('input');
    materialInput.type = 'text';
    materialInput.className = 'input';
    materialInput.value = 'DefaultMaterial';
    materialInput.addEventListener('change', () => {
      this.emitPropertyChange('material', materialInput.value);
    });
    materialSection.setContent(materialInput);
    contentWrapper.appendChild(materialSection.element);

    // Color Section (placeholder)
    const colorSection = new CollapsibleSection({ title: 'Color', defaultOpen: true });
    const colorContent = document.createElement('div');
    colorContent.style.display = 'flex';
    colorContent.style.gap = 'var(--spacing-sm)';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'input';
    colorPicker.style.width = '64px';
    colorPicker.value = '#ff6b6b';

    const colorText = document.createElement('input');
    colorText.type = 'text';
    colorText.className = 'input';
    colorText.style.flex = '1';
    colorText.value = '#ff6b6b';

    colorPicker.addEventListener('change', () => {
      colorText.value = colorPicker.value;
      this.emitPropertyChange('color', colorPicker.value);
    });

    colorText.addEventListener('change', () => {
      colorPicker.value = colorText.value;
      this.emitPropertyChange('color', colorText.value);
    });

    colorContent.appendChild(colorPicker);
    colorContent.appendChild(colorText);
    colorSection.setContent(colorContent);
    contentWrapper.appendChild(colorSection.element);

    this.detailsContent.appendChild(contentWrapper);
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
}

/**
 * Default GLSL shader template.
 */
export const DEFAULT_SHADER_CODE = `// GLSL Shader Code
#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vNormal;
in vec3 vPosition;

out vec4 fragColor;

uniform float uTime;
uniform vec3 uColor;

void main() {
    vec3 color = uColor;
    float light = dot(normalize(vNormal), normalize(vec3(1.0, 1.0, 1.0)));
    color *= max(light, 0.2);

    fragColor = vec4(color, 1.0);
}`;
