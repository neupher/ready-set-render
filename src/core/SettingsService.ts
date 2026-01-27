/**
 * SettingsService
 *
 * Centralized settings management with localStorage persistence.
 * Provides type-safe access to application settings with automatic
 * save/load functionality.
 *
 * @example
 * ```typescript
 * const settings = new SettingsService({ eventBus });
 *
 * // Get a setting value
 * const showGrid = settings.get('grid.visible');
 *
 * // Set a setting value (auto-persists)
 * settings.set('grid.visible', true);
 *
 * // Listen for setting changes
 * eventBus.on('settings:changed', ({ key, value }) => {
 *   console.log(`Setting ${key} changed to ${value}`);
 * });
 * ```
 */

import { EventBus } from '@core/EventBus';

/**
 * Grid settings configuration.
 */
export interface GridSettings {
  /** Whether the grid is visible */
  visible: boolean;
  /** Grid size (extent in world units) */
  size: number;
  /** Number of subdivisions per major grid cell */
  subdivisions: number;
  /** Major line color (hex string) */
  majorLineColor: string;
  /** Minor line color (hex string) */
  minorLineColor: string;
  /** Whether to show axis indicator lines */
  showAxisLines: boolean;
  /** Grid line opacity (0-1) */
  opacity: number;
}

/**
 * All application settings.
 */
export interface AppSettings {
  grid: GridSettings;
}

/**
 * Default settings values.
 */
const DEFAULT_SETTINGS: AppSettings = {
  grid: {
    visible: true,
    size: 10,
    subdivisions: 10,
    majorLineColor: '#444444',
    minorLineColor: '#2a2a2a',
    showAxisLines: true,
    opacity: 0.8,
  },
};

/**
 * Options for SettingsService constructor.
 */
export interface SettingsServiceOptions {
  /** Event bus for emitting change events */
  eventBus: EventBus;
  /** localStorage key for persistence (default: 'webgl-editor-settings') */
  storageKey?: string;
}

/**
 * Centralized settings management service.
 * Handles loading, saving, and change notification for all application settings.
 */
export class SettingsService {
  private readonly eventBus: EventBus;
  private readonly storageKey: string;
  private settings: AppSettings;

  constructor(options: SettingsServiceOptions) {
    this.eventBus = options.eventBus;
    this.storageKey = options.storageKey ?? 'webgl-editor-settings';
    this.settings = this.loadFromStorage();
  }

  /**
   * Get a setting value by path.
   *
   * @param path - Dot-separated path to the setting (e.g., 'grid.visible')
   * @returns The setting value
   *
   * @example
   * ```typescript
   * const showGrid = settings.get('grid.visible'); // boolean
   * const gridSize = settings.get('grid.size'); // number
   * ```
   */
  get<K extends keyof AppSettings>(section: K): AppSettings[K];
  get<K extends keyof AppSettings, P extends keyof AppSettings[K]>(
    section: K,
    property: P
  ): AppSettings[K][P];
  get(section: string, property?: string): unknown {
    const sectionData = this.settings[section as keyof AppSettings];
    if (property === undefined) {
      return sectionData;
    }
    return (sectionData as unknown as Record<string, unknown>)?.[property];
  }

  /**
   * Set a setting value by path.
   * Automatically persists to localStorage and emits change event.
   *
   * @param section - The settings section (e.g., 'grid')
   * @param property - The property within the section (e.g., 'visible')
   * @param value - The new value
   *
   * @example
   * ```typescript
   * settings.set('grid', 'visible', true);
   * settings.set('grid', 'size', 20);
   * ```
   */
  set<K extends keyof AppSettings, P extends keyof AppSettings[K]>(
    section: K,
    property: P,
    value: AppSettings[K][P]
  ): void {
    const oldValue = this.settings[section][property];

    if (oldValue === value) {
      return; // No change
    }

    // Update value
    (this.settings[section] as unknown as Record<string, unknown>)[property as string] = value;

    // Persist to storage
    this.saveToStorage();

    // Emit change event
    this.eventBus.emit('settings:changed', {
      section,
      property,
      value,
      oldValue,
      fullPath: `${String(section)}.${String(property)}`,
    });
  }

  /**
   * Update multiple settings in a section at once.
   *
   * @param section - The settings section
   * @param values - Partial object of values to update
   */
  updateSection<K extends keyof AppSettings>(
    section: K,
    values: Partial<AppSettings[K]>
  ): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(section, key as keyof AppSettings[K], value as AppSettings[K][keyof AppSettings[K]]);
    }
  }

  /**
   * Reset a section to default values.
   *
   * @param section - The settings section to reset
   */
  resetSection<K extends keyof AppSettings>(section: K): void {
    const defaults = DEFAULT_SETTINGS[section];
    for (const [key, value] of Object.entries(defaults)) {
      this.set(section, key as keyof AppSettings[K], value as AppSettings[K][keyof AppSettings[K]]);
    }
  }

  /**
   * Reset all settings to defaults.
   */
  resetAll(): void {
    for (const section of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      this.resetSection(section);
    }
  }

  /**
   * Get all settings as a plain object.
   */
  getAll(): AppSettings {
    return structuredClone(this.settings);
  }

  /**
   * Load settings from localStorage, merging with defaults.
   */
  private loadFromStorage(): AppSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return structuredClone(DEFAULT_SETTINGS);
  }

  /**
   * Save current settings to localStorage.
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }

  /**
   * Merge stored settings with defaults (handles missing keys from updates).
   */
  private mergeWithDefaults(stored: Partial<AppSettings>): AppSettings {
    const result = structuredClone(DEFAULT_SETTINGS);

    for (const section of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      if (stored[section]) {
        result[section] = {
          ...result[section],
          ...stored[section],
        };
      }
    }

    return result;
  }
}
