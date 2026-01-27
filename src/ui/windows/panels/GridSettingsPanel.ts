/**
 * GridSettingsPanel
 *
 * Settings panel for grid configuration within the SettingsWindow.
 * Provides controls for all grid-related settings with both sliders and
 * editable number inputs.
 *
 * @example
 * ```typescript
 * const panel = new GridSettingsPanel({
 *   settingsService,
 * });
 * container.appendChild(panel.element);
 * ```
 */

import type { SettingsService } from '@core/SettingsService';

/**
 * Options for GridSettingsPanel constructor.
 */
export interface GridSettingsPanelOptions {
  /** Settings service for reading/writing values */
  settingsService: SettingsService;
}

/**
 * Grid settings panel component.
 */
export class GridSettingsPanel {
  private readonly container: HTMLDivElement;
  private readonly settingsService: SettingsService;

  constructor(options: GridSettingsPanelOptions) {
    this.settingsService = options.settingsService;

    this.container = document.createElement('div');
    this.container.className = 'settings-panel grid-settings-panel';

    this.render();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Refresh the panel with current settings.
   */
  refresh(): void {
    this.render();
  }

  /**
   * Render the panel contents.
   */
  private render(): void {
    const settings = this.settingsService.get('grid');

    this.container.innerHTML = `
      <h3 class="settings-panel-title">Grid Settings</h3>

      <div class="settings-group">
        <label class="settings-checkbox">
          <input type="checkbox" id="grid-visible" ${settings.visible ? 'checked' : ''}>
          <span>Show Grid</span>
        </label>
      </div>

      <div class="settings-group">
        <label class="settings-label">Grid Size (meters)</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-size-slider" min="0.5" max="100" step="0.5" value="${settings.size}">
          <input type="number" id="grid-size-input" class="settings-number-input" min="0.5" max="1000" step="0.5" value="${settings.size}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Subdivisions</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-subdivisions-slider" min="2" max="50" step="1" value="${settings.subdivisions}">
          <input type="number" id="grid-subdivisions-input" class="settings-number-input" min="2" max="100" step="1" value="${settings.subdivisions}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label" for="grid-major-color">Major Line Color</label>
        <input type="color" id="grid-major-color" class="settings-color-input" value="${settings.majorLineColor}">
      </div>

      <div class="settings-group">
        <label class="settings-label" for="grid-minor-color">Minor Line Color</label>
        <input type="color" id="grid-minor-color" class="settings-color-input" value="${settings.minorLineColor}">
      </div>

      <div class="settings-group">
        <label class="settings-checkbox">
          <input type="checkbox" id="grid-show-axis" ${settings.showAxisLines ? 'checked' : ''}>
          <span>Show Axis Lines</span>
        </label>
      </div>

      <div class="settings-group">
        <label class="settings-label">Opacity</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-opacity-slider" min="0" max="100" step="5" value="${Math.round(settings.opacity * 100)}">
          <input type="number" id="grid-opacity-input" class="settings-number-input" min="0" max="100" step="1" value="${Math.round(settings.opacity * 100)}">
        </div>
      </div>

      <div class="settings-group settings-reset">
        <button class="settings-button" id="grid-reset">Reset to Defaults</button>
      </div>
    `;

    this.attachEventHandlers();
  }

  /**
   * Attach event handlers to form elements.
   */
  private attachEventHandlers(): void {
    // Show Grid checkbox
    const visibleCheckbox = this.container.querySelector('#grid-visible') as HTMLInputElement;
    visibleCheckbox?.addEventListener('change', () => {
      this.settingsService.set('grid', 'visible', visibleCheckbox.checked);
    });

    // Grid Size - slider and input
    const sizeSlider = this.container.querySelector('#grid-size-slider') as HTMLInputElement;
    const sizeInput = this.container.querySelector('#grid-size-input') as HTMLInputElement;

    sizeSlider?.addEventListener('input', () => {
      sizeInput.value = sizeSlider.value;
    });
    sizeSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'size', parseFloat(sizeSlider.value));
    });

    sizeInput?.addEventListener('input', () => {
      const value = parseFloat(sizeInput.value);
      if (!isNaN(value) && value >= 0.5) {
        // Clamp slider to its max, but allow input to exceed
        sizeSlider.value = String(Math.min(value, 100));
      }
    });
    sizeInput?.addEventListener('change', () => {
      let value = parseFloat(sizeInput.value);
      if (isNaN(value) || value < 0.5) value = 0.5;
      sizeInput.value = String(value);
      sizeSlider.value = String(Math.min(value, 100));
      this.settingsService.set('grid', 'size', value);
    });

    // Subdivisions - slider and input
    const subdivSlider = this.container.querySelector('#grid-subdivisions-slider') as HTMLInputElement;
    const subdivInput = this.container.querySelector('#grid-subdivisions-input') as HTMLInputElement;

    subdivSlider?.addEventListener('input', () => {
      subdivInput.value = subdivSlider.value;
    });
    subdivSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'subdivisions', parseInt(subdivSlider.value, 10));
    });

    subdivInput?.addEventListener('input', () => {
      const value = parseInt(subdivInput.value, 10);
      if (!isNaN(value) && value >= 2) {
        subdivSlider.value = String(Math.min(value, 50));
      }
    });
    subdivInput?.addEventListener('change', () => {
      let value = parseInt(subdivInput.value, 10);
      if (isNaN(value) || value < 2) value = 2;
      if (value > 100) value = 100;
      subdivInput.value = String(value);
      subdivSlider.value = String(Math.min(value, 50));
      this.settingsService.set('grid', 'subdivisions', value);
    });

    // Major Line Color
    const majorColorInput = this.container.querySelector('#grid-major-color') as HTMLInputElement;
    majorColorInput?.addEventListener('input', () => {
      this.settingsService.set('grid', 'majorLineColor', majorColorInput.value);
    });

    // Minor Line Color
    const minorColorInput = this.container.querySelector('#grid-minor-color') as HTMLInputElement;
    minorColorInput?.addEventListener('input', () => {
      this.settingsService.set('grid', 'minorLineColor', minorColorInput.value);
    });

    // Show Axis Lines checkbox
    const axisCheckbox = this.container.querySelector('#grid-show-axis') as HTMLInputElement;
    axisCheckbox?.addEventListener('change', () => {
      this.settingsService.set('grid', 'showAxisLines', axisCheckbox.checked);
    });

    // Opacity - slider and input
    const opacitySlider = this.container.querySelector('#grid-opacity-slider') as HTMLInputElement;
    const opacityInput = this.container.querySelector('#grid-opacity-input') as HTMLInputElement;

    opacitySlider?.addEventListener('input', () => {
      opacityInput.value = opacitySlider.value;
    });
    opacitySlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'opacity', parseInt(opacitySlider.value, 10) / 100);
    });

    opacityInput?.addEventListener('input', () => {
      const value = parseInt(opacityInput.value, 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        opacitySlider.value = String(value);
      }
    });
    opacityInput?.addEventListener('change', () => {
      let value = parseInt(opacityInput.value, 10);
      if (isNaN(value) || value < 0) value = 0;
      if (value > 100) value = 100;
      opacityInput.value = String(value);
      opacitySlider.value = String(value);
      this.settingsService.set('grid', 'opacity', value / 100);
    });

    // Reset button
    const resetButton = this.container.querySelector('#grid-reset') as HTMLButtonElement;
    resetButton?.addEventListener('click', () => {
      this.settingsService.resetSection('grid');
      this.render();
    });
  }
}
