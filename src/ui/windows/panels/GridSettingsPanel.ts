/**
 * GridSettingsPanel
 *
 * Settings panel for grid configuration within the SettingsWindow.
 * Provides controls for all grid-related settings.
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
        <label class="settings-label" for="grid-size">Grid Size</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-size" min="5" max="50" step="5" value="${settings.size}">
          <span class="settings-value">${settings.size}</span>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label" for="grid-subdivisions">Subdivisions</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-subdivisions" min="5" max="50" step="5" value="${settings.subdivisions}">
          <span class="settings-value">${settings.subdivisions}</span>
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
        <label class="settings-label" for="grid-opacity">Opacity</label>
        <div class="settings-slider-row">
          <input type="range" id="grid-opacity" min="0" max="100" step="5" value="${Math.round(settings.opacity * 100)}">
          <span class="settings-value">${Math.round(settings.opacity * 100)}%</span>
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

    // Grid Size slider
    const sizeSlider = this.container.querySelector('#grid-size') as HTMLInputElement;
    const sizeValue = sizeSlider?.nextElementSibling as HTMLSpanElement;
    sizeSlider?.addEventListener('input', () => {
      sizeValue.textContent = sizeSlider.value;
    });
    sizeSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'size', parseInt(sizeSlider.value, 10));
    });

    // Subdivisions slider
    const subdivSlider = this.container.querySelector('#grid-subdivisions') as HTMLInputElement;
    const subdivValue = subdivSlider?.nextElementSibling as HTMLSpanElement;
    subdivSlider?.addEventListener('input', () => {
      subdivValue.textContent = subdivSlider.value;
    });
    subdivSlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'subdivisions', parseInt(subdivSlider.value, 10));
    });

    // Major Line Color
    const majorColorInput = this.container.querySelector('#grid-major-color') as HTMLInputElement;
    majorColorInput?.addEventListener('change', () => {
      this.settingsService.set('grid', 'majorLineColor', majorColorInput.value);
    });

    // Minor Line Color
    const minorColorInput = this.container.querySelector('#grid-minor-color') as HTMLInputElement;
    minorColorInput?.addEventListener('change', () => {
      this.settingsService.set('grid', 'minorLineColor', minorColorInput.value);
    });

    // Show Axis Lines checkbox
    const axisCheckbox = this.container.querySelector('#grid-show-axis') as HTMLInputElement;
    axisCheckbox?.addEventListener('change', () => {
      this.settingsService.set('grid', 'showAxisLines', axisCheckbox.checked);
    });

    // Opacity slider
    const opacitySlider = this.container.querySelector('#grid-opacity') as HTMLInputElement;
    const opacityValue = opacitySlider?.nextElementSibling as HTMLSpanElement;
    opacitySlider?.addEventListener('input', () => {
      opacityValue.textContent = `${opacitySlider.value}%`;
    });
    opacitySlider?.addEventListener('change', () => {
      this.settingsService.set('grid', 'opacity', parseInt(opacitySlider.value, 10) / 100);
    });

    // Reset button
    const resetButton = this.container.querySelector('#grid-reset') as HTMLButtonElement;
    resetButton?.addEventListener('click', () => {
      this.settingsService.resetSection('grid');
      this.render(); // Re-render with defaults
    });
  }
}
