/**
 * BuiltInMaterials - Pre-defined material assets
 *
 * Contains the built-in Default PBR material definition as an IMaterialAsset.
 * This is registered as a read-only asset that can be duplicated to create
 * editable custom materials.
 *
 * @example
 * ```typescript
 * import { BUILT_IN_DEFAULT_PBR_MATERIAL } from './BuiltInMaterials';
 *
 * // Register built-in materials
 * registry.register(BUILT_IN_DEFAULT_PBR_MATERIAL);
 * ```
 */

import type { IMaterialAsset } from './interfaces/IMaterialAsset';
import { BUILT_IN_SHADER_IDS } from './BuiltInShaders';

/**
 * Built-in material UUIDs.
 * These are constant and never change.
 */
export const BUILT_IN_MATERIAL_IDS = {
  DEFAULT_PBR: 'built-in-material-default-pbr',
} as const;

/**
 * Built-in Default PBR material asset.
 *
 * A neutral gray material using the PBR shader with default values.
 * Provides a sensible starting point for new materials.
 */
export const BUILT_IN_DEFAULT_PBR_MATERIAL: IMaterialAsset = {
  uuid: BUILT_IN_MATERIAL_IDS.DEFAULT_PBR,
  name: 'Default PBR',
  type: 'material',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  shaderRef: {
    uuid: BUILT_IN_SHADER_IDS.PBR,
    type: 'shader',
  },
  parameters: {
    uBaseColor: [0.8, 0.8, 0.8],
    uMetallic: 0.0,
    uRoughness: 0.5,
    uEmission: [0.0, 0.0, 0.0],
    uEmissionStrength: 0.0,
  },
  description:
    'Default PBR material with neutral gray color. ' +
    'Duplicate this to create custom materials.',
};

/**
 * All built-in materials for easy registration.
 */
export const BUILT_IN_MATERIALS: IMaterialAsset[] = [BUILT_IN_DEFAULT_PBR_MATERIAL];

/**
 * Check if a material UUID is a built-in material.
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is a built-in material
 */
export function isBuiltInMaterialUUID(uuid: string): boolean {
  return Object.values(BUILT_IN_MATERIAL_IDS).includes(
    uuid as (typeof BUILT_IN_MATERIAL_IDS)[keyof typeof BUILT_IN_MATERIAL_IDS]
  );
}
