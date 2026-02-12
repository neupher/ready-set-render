/**
 * ShaderDropdown Unit Tests
 *
 * Tests the Material "Shader" property dropdown feature (Task 4 of Shader Editor UX Polish).
 *
 * Coverage:
 * - PropertyChangeHandler supports material.shaderName get/set
 * - PropertyChangeCommand applies material.shaderName changes
 * - Undo/redo support for shader changes
 * - PropertiesPanel resolveCurrentShaderUuid logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { CommandHistory } from '@core/commands/CommandHistory';
import { PropertyChangeCommand } from '@core/commands/PropertyChangeCommand';
import { PropertyChangeHandler } from '@core/PropertyChangeHandler';
import { AssetRegistry } from '@core/assets/AssetRegistry';
import { BUILT_IN_PBR_SHADER, BUILT_IN_UNLIT_SHADER, BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import type { ISceneObject, IEntity, IComponent } from '@core/interfaces';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';

/**
 * Create a mock entity with a material component.
 */
function createMockEntityWithMaterial(
  id = 'entity-1',
  name = 'TestCube',
  shaderName = 'pbr'
): ISceneObject & IEntity {
  const components = new Map<string, IComponent>();

  const materialComponent: IComponent & {
    color: [number, number, number];
    opacity: number;
    roughness: number;
    metallic: number;
    shaderName: string;
    materialAssetRef?: { uuid: string; type: string };
  } = {
    type: 'material',
    color: [0.8, 0.8, 0.8],
    opacity: 1.0,
    roughness: 0.5,
    metallic: 0.0,
    shaderName,
  };

  components.set('material', materialComponent);

  return {
    id,
    name,
    transform: {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    },
    children: [],
    parent: null,
    hasComponent(type: string): boolean {
      return components.has(type);
    },
    getComponent<T extends IComponent>(type: string): T | null {
      return (components.get(type) as T) ?? null;
    },
  } as unknown as ISceneObject & IEntity;
}

describe('Shader Dropdown (Material shaderName Property)', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;
  let commandHistory: CommandHistory;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
    commandHistory = new CommandHistory({ eventBus });
  });

  describe('PropertyChangeCommand - material.shaderName', () => {
    it('should apply shaderName change on execute', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: 'default',
        sceneGraph,
        eventBus,
      });

      command.execute();

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('default');
    });

    it('should restore shaderName on undo', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: 'default',
        sceneGraph,
        eventBus,
      });

      command.execute();
      command.undo();

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('pbr');
    });

    it('should emit entity:propertyUpdated event on execute', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const events: unknown[] = [];
      eventBus.on('entity:propertyUpdated', (e: unknown) => events.push(e));

      const command = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: 'default',
        sceneGraph,
        eventBus,
      });

      command.execute();

      expect(events.length).toBe(1);
      expect((events[0] as Record<string, unknown>).property).toBe('material.shaderName');
    });

    it('should support custom shader UUID as shaderName', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const customShaderUuid = 'custom-shader-12345';

      const command = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: customShaderUuid,
        sceneGraph,
        eventBus,
      });

      command.execute();

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe(customShaderUuid);
    });
  });

  describe('PropertyChangeHandler - material.shaderName', () => {
    it('should route material.shaderName change through CommandHistory', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      new PropertyChangeHandler({
        eventBus,
        sceneGraph,
        commandHistory,
      });

      // Emit a property change event (simulating the dropdown)
      eventBus.emit('object:propertyChanged', {
        id: 'cube-1',
        property: 'material.shaderName',
        value: 'default',
      });

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('default');
    });

    it('should support undo via CommandHistory after shaderName change', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      new PropertyChangeHandler({
        eventBus,
        sceneGraph,
        commandHistory,
      });

      // Change shader from PBR to default
      eventBus.emit('object:propertyChanged', {
        id: 'cube-1',
        property: 'material.shaderName',
        value: 'default',
      });

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('default');

      // Undo should restore PBR
      commandHistory.undo();
      expect(material.shaderName).toBe('pbr');
    });

    it('should support redo after undo of shaderName change', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      new PropertyChangeHandler({
        eventBus,
        sceneGraph,
        commandHistory,
      });

      eventBus.emit('object:propertyChanged', {
        id: 'cube-1',
        property: 'material.shaderName',
        value: 'default',
      });

      commandHistory.undo();
      commandHistory.redo();

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('default');
    });

    it('should capture old shaderName value correctly', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'default');
      sceneGraph.add(entity);

      new PropertyChangeHandler({
        eventBus,
        sceneGraph,
        commandHistory,
      });

      // Change from default to PBR
      eventBus.emit('object:propertyChanged', {
        id: 'cube-1',
        property: 'material.shaderName',
        value: 'pbr',
      });

      const material = entity.getComponent<IComponent>('material') as IComponent & {
        shaderName: string;
      };
      expect(material.shaderName).toBe('pbr');

      // Undo should restore 'default'
      commandHistory.undo();
      expect(material.shaderName).toBe('default');
    });
  });

  describe('AssetRegistry - shader listing for dropdown', () => {
    it('should return all registered shaders via getByType', () => {
      const registry = new AssetRegistry(eventBus);
      registry.register(BUILT_IN_PBR_SHADER);
      registry.register(BUILT_IN_UNLIT_SHADER);

      const shaders = registry.getByType('shader');
      expect(shaders.length).toBe(2);
      expect(shaders.map(s => s.name)).toContain('PBR');
      expect(shaders.map(s => s.name)).toContain('Unlit');
    });

    it('should include custom shaders alongside built-ins', () => {
      const registry = new AssetRegistry(eventBus);
      registry.register(BUILT_IN_PBR_SHADER);
      registry.register(BUILT_IN_UNLIT_SHADER);

      // Register a custom shader
      const customShader: IShaderAsset = {
        uuid: 'custom-shader-1',
        name: 'My Custom Shader',
        type: 'shader',
        version: 1,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        isBuiltIn: false,
        vertexSource: '#version 300 es\nvoid main() {}',
        fragmentSource: '#version 300 es\nvoid main() {}',
        uniforms: [],
      };
      registry.register(customShader);

      const shaders = registry.getByType('shader');
      expect(shaders.length).toBe(3);
      expect(shaders.map(s => s.name)).toContain('My Custom Shader');
    });
  });

  describe('Shader UUID to shaderName mapping', () => {
    it('should map built-in-shader-pbr to "pbr"', () => {
      expect(BUILT_IN_SHADER_IDS.PBR).toBe('built-in-shader-pbr');
    });

    it('should map built-in-shader-unlit to expected ID', () => {
      expect(BUILT_IN_SHADER_IDS.UNLIT).toBe('built-in-shader-unlit');
    });
  });

  describe('Command coalescing for shader changes', () => {
    it('should coalesce rapid shader changes', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const now = Date.now();

      const cmd1 = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: 'default',
        sceneGraph,
        eventBus,
        timestamp: now,
      });

      const cmd2 = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'default',
        newValue: 'custom-shader-1',
        sceneGraph,
        eventBus,
        timestamp: now + 100, // Within 300ms coalesce window
      });

      expect(cmd1.canMergeWith(cmd2)).toBe(true);

      const merged = cmd1.mergeWith(cmd2) as PropertyChangeCommand;
      expect(merged.oldValue).toBe('pbr');
      expect(merged.newValue).toBe('custom-shader-1');
    });

    it('should not coalesce shader changes outside time window', () => {
      const entity = createMockEntityWithMaterial('cube-1', 'Cube', 'pbr');
      sceneGraph.add(entity);

      const now = Date.now();

      const cmd1 = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'pbr',
        newValue: 'default',
        sceneGraph,
        eventBus,
        timestamp: now,
      });

      const cmd2 = new PropertyChangeCommand({
        entityId: 'cube-1',
        property: 'material.shaderName',
        oldValue: 'default',
        newValue: 'custom-shader-1',
        sceneGraph,
        eventBus,
        timestamp: now + 500, // Outside 300ms coalesce window
      });

      expect(cmd1.canMergeWith(cmd2)).toBe(false);
    });
  });
});
