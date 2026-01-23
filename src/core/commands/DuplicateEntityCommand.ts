/**
 * DuplicateEntityCommand
 *
 * Command for undoing/redoing entity duplication.
 * Creates a clone of the entity with offset position.
 *
 * @example
 * ```typescript
 * const command = new DuplicateEntityCommand({
 *   entity: selectedCube,
 *   sceneGraph,
 *   eventBus,
 *   primitiveRegistry
 * });
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { SceneGraph } from '../SceneGraph';
import type { ICommand } from './ICommand';
import type { ISceneObject, IEntity } from '../interfaces';
import type { PrimitiveRegistry } from '@plugins/primitives';

export interface DuplicateEntityCommandOptions {
  /** The entity to duplicate */
  entity: ISceneObject;

  /** Scene graph for entity operations */
  sceneGraph: SceneGraph;

  /** Event bus for emitting events */
  eventBus: EventBus;

  /** Primitive registry for creating duplicates */
  primitiveRegistry: PrimitiveRegistry;
}

/**
 * Type guard to check if object is an IEntity with mesh component.
 */
function isMeshEntity(obj: unknown): obj is IEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hasComponent' in obj &&
    typeof (obj as IEntity).hasComponent === 'function' &&
    (obj as IEntity).hasComponent('mesh')
  );
}

/**
 * Command for duplicating an entity.
 * Creates a new entity with the same type and offset position.
 */
export class DuplicateEntityCommand implements ICommand {
  readonly type = 'DuplicateEntity';
  readonly description: string;
  readonly timestamp: number;

  private readonly sourceEntity: ISceneObject;
  private readonly sceneGraph: SceneGraph;
  private readonly eventBus: EventBus;
  private readonly primitiveRegistry: PrimitiveRegistry;

  /** The duplicated entity (created on first execute) */
  private duplicatedEntity: ISceneObject | null = null;

  constructor(options: DuplicateEntityCommandOptions) {
    this.sourceEntity = options.entity;
    this.sceneGraph = options.sceneGraph;
    this.eventBus = options.eventBus;
    this.primitiveRegistry = options.primitiveRegistry;
    this.timestamp = Date.now();

    this.description = `Duplicate ${this.sourceEntity.name}`;
  }

  /**
   * Execute the command (create the duplicate).
   */
  execute(): void {
    // If we already have a duplicate (from redo), just re-add it
    if (this.duplicatedEntity) {
      this.sceneGraph.add(this.duplicatedEntity);
      this.eventBus.emit('selection:changed', { id: this.duplicatedEntity.id });
      return;
    }

    // Determine the primitive type from the entity
    // For now, we only support Cube duplication
    const primitiveType = this.getPrimitiveType();
    if (!primitiveType) {
      console.warn('Cannot duplicate: unknown entity type');
      return;
    }

    // Create a new entity of the same type
    const duplicate = this.primitiveRegistry.create(primitiveType);
    if (!duplicate) {
      console.warn(`Cannot duplicate: failed to create ${primitiveType}`);
      return;
    }

    // Copy transform with offset
    const offset = 1.0; // Offset in X direction
    duplicate.transform.position = [
      this.sourceEntity.transform.position[0] + offset,
      this.sourceEntity.transform.position[1],
      this.sourceEntity.transform.position[2]
    ];
    duplicate.transform.rotation = [...this.sourceEntity.transform.rotation];
    duplicate.transform.scale = [...this.sourceEntity.transform.scale];

    // Generate a duplicate name
    duplicate.name = this.generateDuplicateName(this.sourceEntity.name);

    // Store reference for undo/redo
    this.duplicatedEntity = duplicate;

    // Add to scene graph
    this.sceneGraph.add(duplicate);

    // Select the new entity
    this.eventBus.emit('selection:changed', { id: duplicate.id });

    // Emit duplication event
    this.eventBus.emit('entity:duplicated', {
      sourceId: this.sourceEntity.id,
      duplicateId: duplicate.id,
      name: duplicate.name
    });
  }

  /**
   * Undo the command (remove the duplicate).
   */
  undo(): void {
    if (this.duplicatedEntity) {
      this.sceneGraph.remove(this.duplicatedEntity);
      this.eventBus.emit('selection:clear', {});

      // Select the original entity
      this.eventBus.emit('selection:changed', { id: this.sourceEntity.id });
    }
  }

  /**
   * Determine the primitive type from the entity.
   */
  private getPrimitiveType(): string | null {
    // Check if it's a mesh entity
    if (!isMeshEntity(this.sourceEntity)) {
      return null;
    }

    // For now, we assume all mesh entities are Cubes
    // In the future, we could add a 'primitiveType' component
    // or use the entity's constructor name
    const name = this.sourceEntity.name.toLowerCase();
    if (name.includes('cube')) {
      return 'Cube';
    }

    // Default to Cube for any mesh entity
    return 'Cube';
  }

  /**
   * Generate a name for the duplicate.
   * Appends or increments a number suffix.
   */
  private generateDuplicateName(originalName: string): string {
    // Check if name already has a number suffix
    const match = originalName.match(/^(.+?)\.(\d+)$/);
    if (match) {
      const baseName = match[1];
      const number = parseInt(match[2], 10);
      return `${baseName}.${String(number + 1).padStart(3, '0')}`;
    }

    // Check for other existing entities with similar names to find highest number
    let highestNumber = 0;
    this.sceneGraph.traverse((obj) => {
      const objMatch = obj.name.match(new RegExp(`^${originalName}\\.(\\d+)$`));
      if (objMatch) {
        const num = parseInt(objMatch[1], 10);
        if (num > highestNumber) {
          highestNumber = num;
        }
      }
    });

    return `${originalName}.${String(highestNumber + 1).padStart(3, '0')}`;
  }
}
