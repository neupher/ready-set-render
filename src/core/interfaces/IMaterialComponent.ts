/**
 * IMaterialComponent - Material data component
 *
 * Provides material-related information for entities that can be rendered.
 * Used by the Properties panel to display shader and material properties.
 */

import type { IComponent } from './IComponent';

/**
 * Material component containing rendering properties.
 */
export interface IMaterialComponent extends IComponent {
  /** Component type identifier */
  readonly type: 'material';

  /** Name of the shader used for rendering */
  shaderName: string;

  /** Base color in RGB (0-1 range) */
  color?: [number, number, number];

  /** Opacity (0-1, where 1 is fully opaque) */
  opacity?: number;

  /** Whether this material uses transparency */
  transparent?: boolean;
}
