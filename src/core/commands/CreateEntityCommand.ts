/**
 * CreateEntityCommand
 *
 * Command for undoing/redoing entity creation.
 * Used when instantiating entities from assets (e.g., importing models,
 * drag-dropping meshes onto the viewport).
 *
 * @example
 * ```typescript
 * const meshEntity = new MeshEntity(undefined, 'CarBody');
 * meshEntity.meshAssetRef = { uuid: 'mesh-uuid', type: 'mesh' };
 *
 * const command = new CreateEntityCommand(
 *   meshEntity,
 *   sceneGraph,
 *   eventBus
 * );
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { SceneGraph } from '../SceneGraph';
import type { ICommand } from './ICommand';
import type { ISceneObject } from '../interfaces';

export interface CreateEntityCommandOptions {
  /** The entity to create */
  entity: ISceneObject;

  /** Scene graph for entity operations */
  sceneGraph: SceneGraph;

  /** Event bus for emitting events */
  eventBus: EventBus;
}

/**
 * Command for creating an entity.
 * Supports undo (remove entity) and redo (re-add entity).
 */
export class CreateEntityCommand implements ICommand {
  readonly type = 'CreateEntity';
  readonly description: string;
  readonly timestamp: number;

  private readonly entity: ISceneObject;
  private readonly sceneGraph: SceneGraph;
  private readonly eventBus: EventBus;

  constructor(
    entity: ISceneObject,
    sceneGraph: SceneGraph,
    eventBus: EventBus
  );
  constructor(options: CreateEntityCommandOptions);
  constructor(
    entityOrOptions: ISceneObject | CreateEntityCommandOptions,
    sceneGraph?: SceneGraph,
    eventBus?: EventBus
  ) {
    // Handle both constructor signatures
    if ('entity' in entityOrOptions) {
      // Options object
      this.entity = entityOrOptions.entity;
      this.sceneGraph = entityOrOptions.sceneGraph;
      this.eventBus = entityOrOptions.eventBus;
    } else {
      // Individual arguments
      this.entity = entityOrOptions;
      this.sceneGraph = sceneGraph!;
      this.eventBus = eventBus!;
    }

    this.timestamp = Date.now();
    this.description = `Create ${this.entity.name}`;
  }

  /**
   * Execute the command (add the entity to the scene).
   */
  execute(): void {
    this.sceneGraph.add(this.entity);

    // Select the new entity
    this.eventBus.emit('selection:changed', { id: this.entity.id });

    // Emit creation event
    this.eventBus.emit('entity:created', {
      id: this.entity.id,
      name: this.entity.name,
    });
  }

  /**
   * Undo the command (remove the entity from the scene).
   */
  undo(): void {
    this.sceneGraph.remove(this.entity);
    this.eventBus.emit('selection:clear', {});
  }
}
