/**
 * DuplicateEntityCommand
 *
 * Command for undoing/redoing entity duplication.
 * Uses the ICloneable interface for polymorphic cloning -
 * works with any entity type (Cube, Sphere, lights, imported meshes, etc.)
 *
 * @example
 * ```typescript
 * const command = new DuplicateEntityCommand({
 *   entity: selectedCube,
 *   sceneGraph,
 *   eventBus
 * });
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { SceneGraph } from '../SceneGraph';
import type { ICommand } from './ICommand';
import type { ISceneObject } from '../interfaces';
import { isCloneable } from '../interfaces';

export interface DuplicateEntityCommandOptions {
  /** The entity to duplicate */
  entity: ISceneObject;

  /** Scene graph for entity operations */
  sceneGraph: SceneGraph;

  /** Event bus for emitting events */
  eventBus: EventBus;
}

/**
 * Command for duplicating an entity.
 * Uses the entity's clone() method for polymorphic duplication.
 */
export class DuplicateEntityCommand implements ICommand {
  readonly type = 'DuplicateEntity';
  readonly description: string;
  readonly timestamp: number;

  private readonly sourceEntity: ISceneObject;
  private readonly sceneGraph: SceneGraph;
  private readonly eventBus: EventBus;

  /** The duplicated entity (created on first execute) */
  private duplicatedEntity: ISceneObject | null = null;

  constructor(options: DuplicateEntityCommandOptions) {
    this.sourceEntity = options.entity;
    this.sceneGraph = options.sceneGraph;
    this.eventBus = options.eventBus;
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

    // Check if entity supports cloning
    if (!isCloneable(this.sourceEntity)) {
      console.warn('Cannot duplicate: entity does not implement ICloneable');
      return;
    }

    // Clone the entity using its polymorphic clone() method
    const duplicate = this.sourceEntity.clone();

    // Apply position offset
    const offset = 1.0;
    duplicate.transform.position = [
      this.sourceEntity.transform.position[0] + offset,
      this.sourceEntity.transform.position[1],
      this.sourceEntity.transform.position[2]
    ];

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
