/**
 * SettingsWindow
 *
 * Modal window for application settings with two-panel layout.
 * Left panel shows categories, right panel shows settings content.
 *
 * @example
 * ```typescript
 * const settingsWindow = new SettingsWindow({
 *   settingsService,
 *   eventBus,
 * });
 * settingsWindow.show();
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SettingsService } from '@core/SettingsService';
import { GridSettingsPanel } from './panels/GridSettingsPanel';

/**
 * Settings category definition.
 */
interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
}

/**
 * Available settings categories.
 */
const CATEGORIES: SettingsCategory[] = [
  { id: 'grid', label: 'Grid', icon: '⊞' },
  // Future categories:
  // { id: 'themes', label: 'Themes', icon: '🎨' },
  // { id: 'hotkeys', label: 'Hotkeys', icon: '⌨' },
];

/**
 * Options for SettingsWindow constructor.
 */
export interface SettingsWindowOptions {
  /** Settings service for reading/writing values */
  settingsService: SettingsService;
  /** Event bus for communication */
  eventBus: EventBus;
}

/**
 * Settings window component.
 * Provides a modal dialog with categorized settings panels.
 */
export class SettingsWindow {
  private readonly settingsService: SettingsService;
  private readonly eventBus: EventBus;

  private overlay: HTMLDivElement | null = null;
  private container: HTMLDivElement | null = null;
  private contentArea: HTMLDivElement | null = null;
  private activeCategory: string = 'grid';

  // Cached panels
  private gridSettingsPanel: GridSettingsPanel | null = null;

  constructor(options: SettingsWindowOptions) {
    this.settingsService = options.settingsService;
    this.eventBus = options.eventBus;
  }

  /**
   * Show the settings window.
   */
  show(): void {
    if (this.overlay) {
      // Already visible
      return;
    }

    this.createWindow();
    this.selectCategory(this.activeCategory);

    // Emit event
    this.eventBus.emit('settings:window:opened');
  }

  /**
   * Hide the settings window.
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.container = null;
      this.contentArea = null;

      // Emit event
      this.eventBus.emit('settings:window:closed');
    }
  }

  /**
   * Toggle the settings window visibility.
   */
  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if the window is currently visible.
   */
  isVisible(): boolean {
    return this.overlay !== null;
  }

  /**
   * Create the window DOM structure.
   */
  private createWindow(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'settings-window';

    // Create header
    const header = document.createElement('div');
    header.className = 'settings-window-header';
    header.innerHTML = `
      <span class="settings-window-title">Settings</span>
      <button class="settings-window-close" title="Close">×</button>
    `;

    const closeButton = header.querySelector('.settings-window-close');
    closeButton?.addEventListener('click', () => this.hide());

    // Create body with two-panel layout
    const body = document.createElement('div');
    body.className = 'settings-window-body';

    // Left panel - categories
    const leftPanel = document.createElement('div');
    leftPanel.className = 'settings-categories';

    for (const category of CATEGORIES) {
      const item = document.createElement('button');
      item.className = 'settings-category-item';
      item.dataset.category = category.id;
      item.innerHTML = `
        <span class="settings-category-icon">${category.icon}</span>
        <span class="settings-category-label">${category.label}</span>
      `;
      item.addEventListener('click', () => this.selectCategory(category.id));
      leftPanel.appendChild(item);
    }

    // Right panel - content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'settings-content';

    // Assemble
    body.appendChild(leftPanel);
    body.appendChild(this.contentArea);
    this.container.appendChild(header);
    this.container.appendChild(body);
    this.overlay.appendChild(this.container);

    // Add to document
    document.body.appendChild(this.overlay);

    // Handle Escape key
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle keyboard events.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible()) {
      this.hide();
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Select a settings category.
   */
  private selectCategory(categoryId: string): void {
    this.activeCategory = categoryId;

    if (!this.contentArea || !this.container) {
      return;
    }

    // Update active state on category buttons
    const items = this.container.querySelectorAll('.settings-category-item');
    items.forEach((item) => {
      const btn = item as HTMLButtonElement;
      btn.classList.toggle('active', btn.dataset.category === categoryId);
    });

    // Clear and render content
    this.contentArea.innerHTML = '';

    switch (categoryId) {
      case 'grid':
        if (!this.gridSettingsPanel) {
          this.gridSettingsPanel = new GridSettingsPanel({
            settingsService: this.settingsService,
          });
        } else {
          this.gridSettingsPanel.refresh();
        }
        this.contentArea.appendChild(this.gridSettingsPanel.element);
        break;

      default:
        this.contentArea.innerHTML = `
          <div class="settings-placeholder">
            <p>Settings for "${categoryId}" coming soon.</p>
          </div>
        `;
    }
  }
}
