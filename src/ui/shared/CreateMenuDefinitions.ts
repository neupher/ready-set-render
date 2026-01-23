/**
 * CreateMenuDefinitions - Shared Menu Data Source
 *
 * Single source of truth for Create menu items.
 * Used by both TopMenuBar and HierarchyPanel context menu.
 *
 * When adding new primitives:
 * 1. Add to PRIMITIVE_ITEMS with enabled: true
 * 2. Register factory in PrimitiveRegistry
 * 3. Both menus will automatically include the new item
 */

import type { MenuItem } from '../components/TopMenuBar';
import type { ContextMenuItem } from '../components/ContextMenu';

/**
 * Primitive item definition.
 */
interface PrimitiveItem {
  label: string;
  enabled: boolean;
}

/**
 * Light item definition.
 */
interface LightItem {
  label: string;
  enabled: boolean;
}

/**
 * Primitive items available in the Create menu.
 * Set enabled: true when the primitive is implemented.
 */
export const PRIMITIVE_ITEMS: PrimitiveItem[] = [
  { label: 'Cube', enabled: true },
  { label: 'Sphere', enabled: true },
  { label: 'Plane', enabled: false },
  { label: 'Cylinder', enabled: false },
  { label: 'Cone', enabled: false },
  { label: 'Torus', enabled: false },
];

/**
 * Light items available in the Create menu.
 * Set enabled: true when the light type is implemented.
 */
export const LIGHT_ITEMS: LightItem[] = [
  { label: 'Point Light', enabled: false },
  { label: 'Directional Light', enabled: false },
  { label: 'Spot Light', enabled: false },
];

/**
 * Other create menu items.
 */
export const OTHER_ITEMS = {
  camera: { label: 'Camera', enabled: false },
  empty: { label: 'Empty', enabled: false },
};

/**
 * Build Create menu items for TopMenuBar format.
 */
export function buildTopMenuBarCreateItems(): MenuItem[] {
  return [
    {
      label: 'Primitives',
      children: PRIMITIVE_ITEMS.map(item => ({
        label: item.label,
        disabled: !item.enabled,
      })),
    },
    {
      label: 'Lights',
      disabled: LIGHT_ITEMS.every(item => !item.enabled),
      children: LIGHT_ITEMS.map(item => ({
        label: item.label,
        disabled: !item.enabled,
      })),
    },
    { label: OTHER_ITEMS.camera.label, disabled: !OTHER_ITEMS.camera.enabled },
    { label: OTHER_ITEMS.empty.label, disabled: !OTHER_ITEMS.empty.enabled },
  ];
}

/**
 * Build Create menu items for ContextMenu format.
 */
export function buildContextMenuCreateItems(): ContextMenuItem[] {
  return [
    {
      label: 'Primitives',
      children: PRIMITIVE_ITEMS.map(item => ({
        label: item.label,
        disabled: !item.enabled,
        action: undefined, // Action set dynamically by consumer
      })),
    },
    {
      label: 'Lights',
      children: LIGHT_ITEMS.map(item => ({
        label: item.label,
        disabled: !item.enabled,
        action: undefined,
      })),
    },
    { label: OTHER_ITEMS.camera.label, disabled: !OTHER_ITEMS.camera.enabled },
    { label: OTHER_ITEMS.empty.label, disabled: !OTHER_ITEMS.empty.enabled },
  ];
}
