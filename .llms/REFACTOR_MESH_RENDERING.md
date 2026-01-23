# Rendering Architecture Refactor Plan

> **Last Updated:** 2026-01-23T22:50:00Z
> **Priority:** HIGH - Must complete before adding new primitives or importers
> **Estimated Effort:** 4-6 hours

---

## Problem Statement

The current `Cube.ts` (~500 lines) violates separation of concerns by mixing:

1. **Mesh data** (vertices, normals, indices) - ✅ Correct for Cube
2. **GPU resource management** (VAO, VBO, EBO creation) - ❌ Should be centralized
3. **Render methods** (`render()`, `renderSolid()`) - ❌ Should be in the renderer

This architecture would require duplicating ~150 lines of identical GPU/render code for:
- Every new primitive (Sphere, Plane, Cylinder)
- Every importer (OBJ, GLTF, FBX)

---

## Target Architecture

### Current (Problematic)

```
Cube.ts (~500 lines)
├── Geometry Data ✓
│   ├── vertices, normals, indices
│   └── buildSolidGeometry()
├── GPU Resource Management ✗ (duplicated per primitive)
│   ├── wireframeVao, wireframeVbo
│   ├── solidVao, solidVbo, solidEbo
│   └── initializeGPUResources(), initializeSolidGPUResources()
├── Rendering ✗ (duplicated per primitive)
│   ├── render() for wireframe
│   └── renderSolid() for solid
└── Transform Computation
    ├── getModelMatrix()
    └── getNormalMatrix()
```

### Proposed (Clean)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRIMITIVES / IMPORTERS                       │
│                       (Pure Data - No GPU Code)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Cube.ts (~100 lines)     │  OBJImporter         │  GLTFImporter    │
│  ├── getMeshData()        │  ├── parse()          │  ├── parse()     │
│  │   ├── positions        │  └── → IMeshData      │  └── → IMeshData │
│  │   ├── normals          │                       │                  │
│  │   ├── indices          │                       │                  │
│  │   └── bounds           │                       │                  │
│  └── getModelMatrix()     │                       │                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            IMeshData                                 │
│            (Common Interface for ALL geometry sources)               │
├─────────────────────────────────────────────────────────────────────┤
│  positions: Float32Array                                             │
│  normals: Float32Array                                               │
│  indices: Uint16Array                                                │
│  uvs?: Float32Array                                                  │
│  bounds: { min: Vec3, max: Vec3 }                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MeshGPUCache (Centralized)                        │
│                  (Manages ALL GPU resources)                         │
├─────────────────────────────────────────────────────────────────────┤
│  Map<meshId, MeshGPUResources>                                       │
│                                                                      │
│  getOrCreate(meshId, meshData):                                      │
│    if (!cache.has(meshId)):                                          │
│      create VAO, VBOs, EBO                                           │
│      cache.set(meshId, resources)                                    │
│    return cache.get(meshId)                                          │
│                                                                      │
│  dispose(meshId): delete GPU resources                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ForwardRenderer / LineRenderer                   │
│                      (Owns the render loop)                          │
├─────────────────────────────────────────────────────────────────────┤
│  render(scene):                                                      │
│    for entity in scene.getRenderables():                             │
│      meshData = entity.getMeshData()                                 │
│      if (!meshData) continue  // Skip cameras, lights                │
│                                                                      │
│      gpuResources = meshGPUCache.getOrCreate(entity.id, meshData)    │
│      material = entity.getComponent('material')                      │
│                                                                      │
│      setUniforms(entity.getModelMatrix(), entity.getNormalMatrix())  │
│      bindVAO(gpuResources.vao)                                       │
│      drawElements(TRIANGLES, meshData.indices.length)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Create New Interfaces and Infrastructure

**New Files:**

1. `src/core/interfaces/IMeshData.ts`
   ```typescript
   export interface IMeshData {
     /** Vertex positions (x, y, z) */
     positions: Float32Array;
     /** Vertex normals (x, y, z) */
     normals: Float32Array;
     /** Triangle indices */
     indices: Uint16Array;
     /** UV coordinates (optional) */
     uvs?: Float32Array;
     /** Axis-aligned bounding box */
     bounds: {
       min: [number, number, number];
       max: [number, number, number];
     };
   }
   ```

2. `src/plugins/renderers/shared/MeshGPUCache.ts`
   ```typescript
   export interface MeshGPUResources {
     vao: WebGLVertexArrayObject;
     positionVbo: WebGLBuffer;
     normalVbo: WebGLBuffer;
     ebo: WebGLBuffer;
     indexCount: number;
   }

   export class MeshGPUCache {
     private cache = new Map<string, MeshGPUResources>();

     getOrCreate(meshId: string, meshData: IMeshData, gl: WebGL2RenderingContext, program: WebGLProgram): MeshGPUResources;
     dispose(meshId: string): void;
     disposeAll(): void;
   }
   ```

3. `src/plugins/renderers/shared/index.ts` - Barrel export

**Modified Files:**

- `src/core/interfaces/index.ts` - Add IMeshData export

---

### Phase 2: Refactor Renderers to Own GPU Resources

**Modified Files:**

1. `src/plugins/renderers/forward/ForwardRenderer.ts`
   - Add `MeshGPUCache` instance
   - Change `render()` to:
     - Get `IMeshData` from entity via `getMeshData()`
     - Use cache to get/create GPU resources
     - Set uniforms (model matrix, normal matrix, material)
     - Bind VAO and call `drawElements()`
   - Remove type-casting to `Cube`
   - Remove direct calls to `cube.renderSolid()`

2. `src/plugins/renderers/line/LineRenderer.ts`
   - Similar changes for wireframe rendering
   - Use edge data from `IMeshData` (or derive from indices)

---

### Phase 3: Simplify Primitives

**Modified Files:**

1. `src/plugins/primitives/Cube.ts` (from ~500 lines to ~150 lines)

   **Keep:**
   - Geometry data arrays (vertices, normals, indices)
   - `buildSolidGeometry()` (called once in constructor)
   - `getMeshData(): IMeshData` (new method)
   - `getModelMatrix()`, `getNormalMatrix()`
   - Entity/Component implementation

   **Remove:**
   - `wireframeVao`, `wireframeVbo`, `wireframeProgram`, `wireframeMvpLocation`
   - `solidVao`, `solidVbo`, `solidNormalVbo`, `solidEbo`, `solidProgram`
   - `initializeGPUResources()`
   - `initializeSolidGPUResources()`
   - `render()` method
   - `renderSolid()` method
   - `isInitialized()`, `isWireframeInitialized()`, `isSolidInitialized()`
   - `dispose()` GPU cleanup (entity cleanup remains)
   - `buildLineVertices()` (move to LineRenderer if needed)

---

### Phase 4: Update Interfaces and Cleanup

**Modified Files:**

1. `src/core/interfaces/ISceneObject.ts`
   - Update `IRenderable` - remove `render()` method requirement
   - Remove or update `IInitializable` interface
   - Add `IMeshProvider` interface with `getMeshData(): IMeshData | null`

2. `src/core/interfaces/IMeshComponent.ts`
   - Merge into `IMeshData` or keep as component metadata only

3. `src/core/Application.ts`
   - Remove `scene:objectAdded` listener that calls `initializeGPUResources()`
   - Renderers now handle GPU init lazily via cache

4. `tests/unit/plugins/Cube.test.ts`
   - Remove GPU-related tests (move to renderer tests)
   - Add tests for `getMeshData()` returning correct data

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Cube.ts size** | ~500 lines | ~150 lines |
| **New primitive** | Copy ~150 lines of GPU code | Just provide geometry data |
| **OBJ importer** | Would need render methods | Just output IMeshData |
| **GLTF importer** | Would need render methods | Just output IMeshData |
| **GPU resource ownership** | Scattered across primitives | Centralized in MeshGPUCache |
| **Memory management** | Each primitive manages own cleanup | Single cache handles all cleanup |

---

## Testing Strategy

1. **Unit Tests:**
   - `MeshGPUCache`: resource creation, caching, disposal
   - `Cube.getMeshData()`: correct positions, normals, indices, bounds

2. **Integration Tests:**
   - ForwardRenderer renders Cube correctly
   - LineRenderer renders Cube wireframe correctly
   - Multiple Cubes share cache correctly

3. **Manual Tests:**
   - Create Cube → appears as solid shaded mesh
   - Delete Cube → GPU resources cleaned up
   - Switch render modes → both work

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Update after refactor
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Update current state
- [PHASE_6_PLAN.md](./PHASE_6_PLAN.md) - Insert before Phase 6.8
