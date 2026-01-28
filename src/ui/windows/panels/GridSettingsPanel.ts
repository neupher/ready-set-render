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
        <label class="settings-label">Grid Size</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-size-slider" min="1" max="100" step="1" value="${settings.size}">
          <input type="number" id="grid-size-input" class="settings-number-input" min="1" max="1000" step="1" value="${settings.size}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Grid Divisions</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-subdivisions-slider" min="2" max="100" step="1" value="${settings.subdivisions}">
          <input type="number" id="grid-subdivisions-input" class="settings-number-input" min="2" max="200" step="1" value="${settings.subdivisions}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label" for="grid-line-color">Line Color</label>
        <input type="color" id="grid-line-color" class="settings-color-input" value="${settings.lineColor}">
      </div>

      <div class="settings-group">
        <label class="settings-label" for="grid-axis-color">Axis Line Color</label>
        <input type="color" id="grid-axis-color" class="settings-color-input" value="${settings.axisLineColor}">
      </div>

      <div class="settings-group">
        <label class="settings-label">Line Width</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-line-width-slider" min="1" max="5" step="1" value="${settings.lineWidth}">
          <input type="number" id="grid-line-width-input" class="settings-number-input" min="1" max="10" step="1" value="${settings.lineWidth}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Axis Line Width</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-axis-width-slider" min="1" max="5" step="1" value="${settings.axisLineWidth}">
          <input type="number" id="grid-axis-width-input" class="settings-number-input" min="1" max="10" step="1" value="${settings.axisLineWidth}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Fade Start Distance</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-fade-start-slider" min="10" max="200" step="5" value="${settings.fadeStartDistance}">
          <input type="number" id="grid-fade-start-input" class="settings-number-input" min="1" max="500" step="1" value="${settings.fadeStartDistance}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Fade End Distance</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-fade-end-slider" min="20" max="300" step="5" value="${settings.fadeEndDistance}">
          <input type="number" id="grid-fade-end-input" class="settings-number-input" min="1" max="500" step="1" value="${settings.fadeEndDistance}">
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-checkbox">
          <input type="checkbox" id="grid-show-axis" ${settings.showAxisLines ? 'checked' : ''}>
          <span>Show Axis Lines</span>
        </label>
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
      if (!isNaN(value) && value >= 1) {
        sizeSlider.value = String(Math.min(value, 100));
      }
    });
    sizeInput?.addEventListener('change', () => {
      let value = parseFloat(sizeInput.value);
      if (isNaN(value) || value < 1) value = 1;
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
        subdivSlider.value = String(Math.min(value, 100));
      }
    });
    subdivInput?.addEventListener('change', () => {
      let value = parseInt(subdivInput.value, 10);
      if (isNaN(value) || value < 2) value = 2;
      if (value > 200) value = 200;
      subdivInput.value = String(value);
      subdivSlider.value = String(Math.min(value, 100));
      this.settingsService.set('grid', 'subdivisions', value);
    });

    // Line Color
    const lineColorInput = this.container.querySelector('#grid-line-color') as HTMLInputElement;
    lineColorInput?.addEventListener('input', () => {
      this.settingsService.set('grid', 'lineColor', lineColorInput.value);
    });

    // Axis Line Color
    const axisColorInput = this.container.querySelector('#grid-axis-color') as HTMLInputElement;
    axisColorInput?.addEventListener('input', () => {
      this.settingsService.set('grid', 'axisLineColor', axisColorInput.value);
    });

    // Line Width - slider and input
    const lineWidthSlider = this.container.querySelector('#grid-line-width-slider') as HTMLInputElement;
    const lineWidthInput = this.container.querySelector('#grid-line-width-input') as HTMLInputElement;

    lineWidthSlider?.addEventListener('input', () => {
      lineWidthInput.value = lineWidthSlider.value;
    });
    lineWidthSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'lineWidth', parseInt(lineWidthSlider.value, 10));
    });

    lineWidthInput?.addEventListener('change', () => {
      let value = parseInt(lineWidthInput.value, 10);
      if (isNaN(value) || value < 1) value = 1;
      if (value > 10) value = 10;
      lineWidthInput.value = String(value);
      lineWidthSlider.value = String(Math.min(value, 5));
      this.settingsService.set('grid', 'lineWidth', value);
    });

    // Axis Line Width - slider and input
    const axisWidthSlider = this.container.querySelector('#grid-axis-width-slider') as HTMLInputElement;
    const axisWidthInput = this.container.querySelector('#grid-axis-width-input') as HTMLInputElement;

    axisWidthSlider?.addEventListener('input', () => {
      axisWidthInput.value = axisWidthSlider.value;
    });
    axisWidthSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'axisLineWidth', parseInt(axisWidthSlider.value, 10));
    });

    axisWidthInput?.addEventListener('change', () => {
      let value = parseInt(axisWidthInput.value, 10);
      if (isNaN(value) || value < 1) value = 1;
      if (value > 10) value = 10;
      axisWidthInput.value = String(value);
      axisWidthSlider.value = String(Math.min(value, 5));
      this.settingsService.set('grid', 'axisLineWidth', value);
    });

    // Fade Start Distance - slider and input
    const fadeStartSlider = this.container.querySelector('#grid-fade-start-slider') as HTMLInputElement;
    const fadeStartInput = this.container.querySelector('#grid-fade-start-input') as HTMLInputElement;

    fadeStartSlider?.addEventListener('input', () => {
      fadeStartInput.value = fadeStartSlider.value;
    });
    fadeStartSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'fadeStartDistance', parseInt(fadeStartSlider.value, 10));
    });

    fadeStartInput?.addEventListener('change', () => {
      let value = parseInt(fadeStartInput.value, 10);
      if (isNaN(value) || value < 1) value = 1;
      if (value > 500) value = 500;
      fadeStartInput.value = String(value);
      fadeStartSlider.value = String(Math.min(value, 200));
      this.settingsService.set('grid', 'fadeStartDistance', value);
    });

    // Fade End Distance - slider and input
    const fadeEndSlider = this.container.querySelector('#grid-fade-end-slider') as HTMLInputElement;
    const fadeEndInput = this.container.querySelector('#grid-fade-end-input') as HTMLInputElement;

    fadeEndSlider?.addEventListener('input', () => {
      fadeEndInput.value = fadeEndSlider.value;
    });
    fadeEndSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'fadeEndDistance', parseInt(fadeEndSlider.value, 10));
    });

    fadeEndInput?.addEventListener('change', () => {
      let value = parseInt(fadeEndInput.value, 10);
      if (isNaN(value) || value < 1) value = 1;
      if (value > 500) value = 500;
      fadeEndInput.value = String(value);
      fadeEndSlider.value = String(Math.min(value, 300));
      this.settingsService.set('grid', 'fadeEndDistance', value);
    });

    // Show Axis Lines checkbox
    const axisCheckbox = this.container.querySelector('#grid-show-axis') as HTMLInputElement;
    axisCheckbox?.addEventListener('change', () => {
      this.settingsService.set('grid', 'showAxisLines', axisCheckbox.checked);
    });

    // Reset button
    const resetButton = this.container.querySelector('#grid-reset') as HTMLButtonElement;
    resetButton?.addEventListener('click', () => {
      this.settingsService.resetSection('grid');
      this.render();
    });
  }
}
