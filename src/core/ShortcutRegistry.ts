/**
 * ShortcutRegistry - Editor Keyboard Shortcuts
 *
 * Centralizes all keyboard shortcut definitions for the editor.
 * This module registers shortcuts with the KeyboardShortcutManager.
 *
 * Shortcuts registered:
 * - Delete: Delete selected mesh entities
 * - Shift+D: Duplicate selected mesh entities
 * - Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z: Undo/Redo (via KeyboardShortcutManager)
 *
 * @example
 * ```typescript
 * registerEditorShortcuts({
 *   shortcutManager,
 *   commandHistory,
 *   selectionManager,
 *   sceneGraph,
 *   primitiveRegistry,
 *   eventBus,
 * });
 * ```
 */

import type { KeyboardShortcutManager } from '@core/KeyboardShortcutManager';
import type { CommandHistory } from '@core/commands/CommandHistory';
import type { SelectionManager } from '@core/SelectionManager';
import type { SceneGraph } from '@core/SceneGraph';
import type { PrimitiveRegistry } from '@plugins/primitives';
import type { EventBus } from '@core/EventBus';
import type { ISceneObject } from '@core/interfaces';

import { DeleteEntityCommand } from '@core/commands/DeleteEntityCommand';
import { DuplicateEntityCommand } from '@core/commands/DuplicateEntityCommand';

/**
 * Configuration for editor shortcuts.
 */
export interface EditorShortcutOptions {
  /** Keyboard shortcut manager */
  shortcutManager: KeyboardShortcutManager;
  /** Command history for undo/redo */
  commandHistory: CommandHistory;
  /** Selection manager for getting selected objects */
  selectionManager: SelectionManager;
  /** Scene graph for entity operations */
  sceneGraph: SceneGraph;
  /** Primitive registry for duplication */
  primitiveRegistry: PrimitiveRegistry;
  /** Event bus for notifications */
  eventBus: EventBus;
}

/**
 * Check if an object has a specific component.
 * Helper function until IEntity interface is properly defined.
 */
function hasComponent(obj: unknown, componentType: string): boolean {
  const entity = obj as { hasComponent?: (type: string) => boolean };
  return typeof entity.hasComponent === 'function' && entity.hasComponent(componentType);
}

/**
 * Filter objects to only include deletable/duplicable mesh entities (not cameras).
 */
function filterMeshEntities(objects: ISceneObject[]): ISceneObject[] {
  return objects.filter(obj => hasComponent(obj, 'mesh') && !hasComponent(obj, 'camera'));
}

/**
 * Register all editor keyboard shortcuts.
 */
export function registerEditorShortcuts(options: EditorShortcutOptions): void {
  const {
    shortcutManager,
    commandHistory,
    selectionManager,
    sceneGraph,
    primitiveRegistry,
    eventBus,
  } = options;

  // Delete shortcut (Delete key)
  shortcutManager.register({
    key: 'Delete',
    action: () => {
      const selected = selectionManager.getSelected();
      const deletableEntities = filterMeshEntities(selected);

      if (deletableEntities.length > 0) {
        commandHistory.beginBatch();
        for (const entity of deletableEntities) {
          const deleteCmd = new DeleteEntityCommand({
            entity,
            sceneGraph,
            eventBus,
          });
          commandHistory.execute(deleteCmd);
        }
        commandHistory.endBatch('Delete selected objects');
      }
    },
    description: 'Delete selected objects',
  });

  // Duplicate shortcut (Shift+D)
  shortcutManager.register({
    key: 'd',
    shift: true,
    action: () => {
      const selected = selectionManager.getSelected();
      const duplicableEntities = filterMeshEntities(selected);

      if (duplicableEntities.length > 0) {
        commandHistory.beginBatch();
        for (const entity of duplicableEntities) {
          const duplicateCmd = new DuplicateEntityCommand({
            entity,
            sceneGraph,
            eventBus,
            primitiveRegistry,
          });
          commandHistory.execute(duplicateCmd);
        }
        commandHistory.endBatch('Duplicate selected objects');
      }
    },
    description: 'Duplicate selected objects',
  });

  console.log('Editor shortcuts registered (Delete=delete, Shift+D=duplicate)');
}

/**
 * Register context menu event handlers for delete/duplicate.
 * These handle requests from the HierarchyPanel context menu.
 */
export function registerContextMenuHandlers(options: EditorShortcutOptions): void {
  const {
    commandHistory,
    sceneGraph,
    primitiveRegistry,
    eventBus,
  } = options;

  // Handle delete request from context menu
  eventBus.on('entity:requestDelete', (data: { id: string }) => {
    const entity = sceneGraph.find(data.id);
    if (entity && hasComponent(entity, 'mesh') && !hasComponent(entity, 'camera')) {
      const deleteCmd = new DeleteEntityCommand({
        entity,
        sceneGraph,
        eventBus,
      });
      commandHistory.execute(deleteCmd);
    }
  });

  // Handle duplicate request from context menu
  eventBus.on('entity:requestDuplicate', (data: { id: string }) => {
    const entity = sceneGraph.find(data.id);
    if (entity && hasComponent(entity, 'mesh') && !hasComponent(entity, 'camera')) {
      const duplicateCmd = new DuplicateEntityCommand({
        entity,
        sceneGraph,
        eventBus,
        primitiveRegistry,
      });
      commandHistory.execute(duplicateCmd);
    }
  });

  console.log('Context menu handlers registered');
}
