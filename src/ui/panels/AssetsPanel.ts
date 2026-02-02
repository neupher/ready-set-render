/**
 * AssetsPanel
 *
 * Standalone panel for browsing and managing assets (materials, shaders).
 * Can be collapsed to the side to maximize workspace area.
 * NOT a plugin - standard UI panel.
 *
 * @example
 * ```ts
 * const assetsPanel = new AssetsPanel({
 *   eventBus,
 *   assetRegistry,
 *   materialFactory,
 *   shaderFactory
 * });
 * container.appendChild(assetsPanel.element);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import type { ShaderAssetFactory } from '@core/assets/ShaderAssetFactory';
import { AssetBrowserTab } from '../tabs/AssetBrowserTab';

/**
 * Options for creating an AssetsPanel.
 */
export interface AssetsPanelOptions {
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
 * Assets panel component.
 * NOT a plugin - standard UI panel.
 */
export class AssetsPanel {
  private readonly container: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly assetBrowserTab: AssetBrowserTab;

  constructor(options: AssetsPanelOptions) {

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'assets-panel panel';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;

    // Create header
    this.header = this.createHeader();
    this.container.appendChild(this.header);

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'panel-content assets-panel-content';
    this.content.style.cssText = `
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Create and add asset browser tab
    this.assetBrowserTab = new AssetBrowserTab({
      eventBus: options.eventBus,
      assetRegistry: options.assetRegistry,
      materialFactory: options.materialFactory,
      shaderFactory: options.shaderFactory,
    });
    this.content.appendChild(this.assetBrowserTab.element);

    this.container.appendChild(this.content);
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Refresh the asset list.
   */
  refresh(): void {
    this.assetBrowserTab.refresh();
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.assetBrowserTab.dispose();
    this.container.remove();
  }

  /**
   * Create the panel header.
   */
  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('span');
    title.className = 'panel-header-title';
    title.textContent = 'Assets';
    header.appendChild(title);

    return header;
  }
}
