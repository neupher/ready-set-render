# GLB/GLTF Importer Implementation Plan

> **Last Updated:** 2026-03-02T12:00:00Z
> **Estimated Effort:** Medium (~10 sessions)
> **Dependencies:** Asset System (complete), Project Folder (Phase 1-4 complete)

---

## Overview

Implement a complete GLB/GLTF import pipeline using **@gltf-transform/core** library that:
1. Imports models via File → Import menu
2. Preserves hierarchy from source file
3. Creates corresponding materials automatically
4. Stores as compound asset in project folder
5. Supports drag-and-drop instantiation
6. Auto-discovers existing model files in project

---

## Library Selection: @gltf-transform/core

### Justification

| Criteria | @gltf-transform/core |
|----------|---------------------|
| **Size** | ~50KB minified (within 75KB utility budget) |
| **Maintainer** | Don McCurdy (Khronos GLTF spec contributor) |
| **TypeScript** | First-class support |
| **GLB + GLTF** | ✅ Both formats |
| **Raw Geometry** | ✅ Direct Float32Array access |
| **Dependencies** | None (pure data model) |

### Why Not Alternatives

| Alternative | Why Not Chosen |
|-------------|---------------|
| Custom parser | GLTF spec too complex; reinventing the wheel |
| @loaders.gl/gltf | Larger (~80KB), more dependencies |
| Three.js GLTFLoader | Forbidden (tied to Three.js, heavy abstractions) |
| gltf-parser | Less maintained, weaker TypeScript support |

### Installation

```bash
npm install @gltf-transform/core
```

---

## Phase 1: Foundation — New Asset Types & Interfaces

**Estimated Effort:** ~2 sessions

### 1.1 Create Model Asset Interface

**File:** `src/core/assets/interfaces/IModelAsset.ts`

```typescript
interface IModelAsset extends IAsset {
  type: 'model';
  isBuiltIn: false;

  /** Original source file info */
  source: {
    filename: string;
    format: 'gltf' | 'glb';
    importedAt: string;
  };

  /** Contained sub-assets (meshes, materials) */
  contents: {
    meshes: IMeshAssetReference[];
    materials: IMaterialAssetReference[];
    textures: ITextureAssetReference[];  // Future
  };

  /** Scene hierarchy from source file */
  hierarchy: IModelNode[];
}

interface IModelNode {
  name: string;
  meshIndex?: number;  // Index into contents.meshes
  materialIndices?: number[];  // Indices into contents.materials
  transform: ISerializedTransform;
  children: IModelNode[];
}

interface IMeshAssetReference {
  uuid: string;
  name: string;
  vertexCount: number;
  triangleCount: number;
}
```

### 1.2 Create Mesh Asset Interface

**File:** `src/core/assets/interfaces/IMeshAsset.ts`

```typescript
interface IMeshAsset extends IAsset {
  type: 'mesh';
  isBuiltIn: boolean;

  /** Geometry data */
  positions: number[];  // Flat array [x,y,z,...]
  normals: number[];
  uvs?: number[];
  indices: number[];

  /** Bounds for ray picking */
  bounds: MeshBounds;

  /** Parent model asset reference (for imported meshes) */
  parentModelRef?: IAssetReference;
}
```

### 1.3 Create MeshEntity (Generic Imported Mesh)

**File:** `src/plugins/primitives/MeshEntity.ts`

A new entity type that references mesh data from `IMeshAsset` rather than generating geometry like `Cube`/`Sphere`:

```typescript
class MeshEntity implements IEntity, IMeshProvider, ICloneable, ISerializable {
  readonly id: string;
  name: string;
  transform: Transform;

  /** Reference to the mesh asset providing geometry */
  meshAssetRef: IAssetReference;

  getMeshData(): IMeshData | null {
    // Retrieve from AssetRegistry via meshAssetRef
  }
}
```

### 1.4 Update SerializedEntityType

**File:** `src/core/assets/interfaces/ISceneAsset.ts`

Add new entity types:
```typescript
export type SerializedEntityType =
  | 'Cube'
  | 'Sphere'
  | 'DirectionalLight'
  | 'Camera'
  | 'MeshEntity'      // New: generic imported mesh
  | 'ModelInstance';  // New: instantiated model root
```

---

## Phase 2: GLTF Import Service (Using @gltf-transform/core)

**Estimated Effort:** ~1 session

### 2.1 GLTFImportService

**File:** `src/plugins/importers/gltf/GLTFImportService.ts`

```typescript
import { Document, WebIO } from '@gltf-transform/core';

class GLTFImportService {
  private io = new WebIO();

  async import(file: File): Promise<GLTFImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await this.io.readBinary(new Uint8Array(arrayBuffer));

    return {
      meshes: this.extractMeshes(doc),
      materials: this.extractMaterials(doc),
      hierarchy: this.extractHierarchy(doc),
    };
  }

  private extractMeshes(doc: Document): IMeshData[] {
    const meshes: IMeshData[] = [];

    for (const mesh of doc.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        const positions = primitive.getAttribute('POSITION')?.getArray() as Float32Array;
        const normals = primitive.getAttribute('NORMAL')?.getArray() as Float32Array;
        const uvs = primitive.getAttribute('TEXCOORD_0')?.getArray() as Float32Array;
        const indices = primitive.getIndices()?.getArray() as Uint16Array;

        // Apply Y-up to Z-up coordinate conversion
        const convertedPositions = this.convertCoordinates(positions);
        const convertedNormals = this.convertCoordinates(normals);

        meshes.push({
          positions: convertedPositions,
          normals: convertedNormals,
          uvs,
          indices,
          bounds: this.calculateBounds(convertedPositions),
        });
      }
    }

    return meshes;
  }

  private convertCoordinates(data: Float32Array): Float32Array {
    // GLTF Y-up → Project Z-up: swap Y and Z
    const result = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 3) {
      result[i] = data[i];       // X stays
      result[i + 1] = -data[i + 2]; // Y = -Z
      result[i + 2] = data[i + 1];  // Z = Y
    }
    return result;
  }
}
```

### 2.2 Material Extraction

```typescript
private extractMaterials(doc: Document): IMaterialAsset[] {
  return doc.getRoot().listMaterials().map(mat => {
    const baseColor = mat.getBaseColorFactor();
    const metallic = mat.getMetallicFactor();
    const roughness = mat.getRoughnessFactor();

    return this.materialFactory.create({
      name: mat.getName() || 'Imported Material',
      shaderRef: { uuid: BUILT_IN_SHADER_IDS.PBR, type: 'shader' },
      parameters: {
        albedo: [baseColor[0], baseColor[1], baseColor[2]],
        metallic,
        roughness,
        opacity: baseColor[3],
      },
    });
  });
}
```

### 2.3 Hierarchy Extraction

```typescript
private extractHierarchy(doc: Document): IModelNode[] {
  const scene = doc.getRoot().listScenes()[0];
  if (!scene) return [];

  return scene.listChildren().map(node => this.nodeToModelNode(node));
}

private nodeToModelNode(node: Node): IModelNode {
  const translation = node.getTranslation();
  const rotation = node.getRotation(); // Quaternion
  const scale = node.getScale();

  return {
    name: node.getName() || 'Node',
    meshIndex: this.getMeshIndex(node.getMesh()),
    materialIndices: this.getMaterialIndices(node.getMesh()),
    transform: {
      position: this.convertPosition(translation),
      rotation: this.quaternionToEuler(rotation),
      scale: [scale[0], scale[2], scale[1]], // Swap Y/Z for scale too
    },
    children: node.listChildren().map(child => this.nodeToModelNode(child)),
  };
}
```

---

## Phase 3: Importer Plugin

**Estimated Effort:** ~1 session

### 3.1 GLTFImporter Class

**File:** `src/plugins/importers/gltf/GLTFImporter.ts`

```typescript
class GLTFImporter implements IImporter {
  readonly id = 'gltf-importer';
  readonly name = 'GLTF/GLB Importer';
  readonly version = '1.0.0';
  readonly supportedExtensions = ['.gltf', '.glb'];

  constructor(
    private importService: GLTFImportService,
    private assetRegistry: AssetRegistry,
    private modelFactory: ModelAssetFactory
  ) {}

  canImport(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  async import(file: File): Promise<ImportResult> {
    const result = await this.importService.import(file);

    // Create model asset with all sub-assets
    const modelAsset = this.modelFactory.createFromImport(file.name, result);

    // Register all assets
    this.assetRegistry.register(modelAsset);
    result.meshes.forEach(m => this.assetRegistry.register(m));
    result.materials.forEach(m => this.assetRegistry.register(m));

    // Create scene objects from hierarchy
    const sceneObjects = this.createSceneObjects(result.hierarchy, result);

    return {
      objects: sceneObjects,
      warnings: [],
      assets: {
        model: modelAsset,
        meshes: result.meshes,
        materials: result.materials,
      },
    };
  }
}
```

---

## Phase 4: File Menu & Import UI

**Estimated Effort:** ~1 session

### 4.1 Enable Import Menu Item

**File:** `src/ui/components/TopMenuBar.ts`

Change Import from disabled:
```typescript
{ label: 'Import', separator: true, disabled: true }
// To:
{ label: 'Import', shortcut: 'Ctrl+I', separator: true }
```

### 4.2 Import Command Handler

**File:** `src/core/ImportController.ts` (new)

```typescript
class ImportController {
  constructor(
    eventBus: EventBus,
    sceneGraph: SceneGraph,
    assetRegistry: AssetRegistry,
    projectService: ProjectService,
    gltfImporter: GLTFImporter
  );

  async handleImport(): Promise<void> {
    // 1. Show file picker (.glb, .gltf)
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: '3D Models',
        accept: {
          'model/gltf-binary': ['.glb'],
          'model/gltf+json': ['.gltf']
        }
      }]
    });

    // 2. Validate project is open (or prompt)
    if (!this.projectService.isProjectOpen) {
      await this.promptOpenProject();
    }

    // 3. Run importer
    const file = await fileHandle.getFile();
    const result = await this.gltfImporter.import(file);

    // 4. Add to scene (optional, ask user)
    if (await this.confirmAddToScene()) {
      result.objects.forEach(obj => this.sceneGraph.add(obj));
    }
  }
}
```

### 4.3 Keyboard Shortcut

Register `Ctrl+I` for import in `ShortcutRegistry.ts`.

---

## Phase 5: Asset Browser Enhancements

**Estimated Effort:** ~2 sessions

### 5.1 Add "Imported" Category

**File:** `src/ui/tabs/AssetBrowserTab.ts`

Add new category under Project section:
```typescript
const CATEGORY_IDS = {
  // ... existing
  PROJECT_IMPORTED: '__category_project_imported__',
};
```

Tree structure:
```
Project
├── Materials
├── Shaders
└── Imported          // NEW
    └── MyModel.glb   // Expandable compound asset
        ├── Meshes
        │   ├── Body
        │   └── Wheels
        └── Materials
            ├── CarPaint
            └── Glass
```

### 5.2 Expandable Compound Assets

**File:** `src/ui/components/TreeView.ts`

Add new node type for compound assets:
```typescript
type: 'group' | 'mesh' | 'material' | 'texture' | 'light' | 'camera' | 'model';
```

When `type === 'model'`:
- Show expand arrow
- Load sub-assets lazily on expand
- Different icon (package/box icon)

### 5.3 Drag and Drop Support

**File:** `src/ui/tabs/AssetBrowserTab.ts`

Make asset items draggable:
```typescript
item.draggable = true;
item.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('application/x-asset-uuid', asset.uuid);
  e.dataTransfer.setData('application/x-asset-type', asset.type);
});
```

**File:** `src/ui/panels/ViewportPanel.ts`

Accept drops on viewport:
```typescript
canvas.addEventListener('drop', async (e) => {
  const uuid = e.dataTransfer.getData('application/x-asset-uuid');
  const type = e.dataTransfer.getData('application/x-asset-type');

  if (type === 'model') {
    await this.instantiateModelAtPosition(uuid, dropPosition);
  } else if (type === 'mesh') {
    await this.createMeshEntityAtPosition(uuid, dropPosition);
  }
});
```

---

## Phase 6: Hierarchy Panel Enhancements

**Estimated Effort:** ~0.5 session

### 6.1 Collapsible Hierarchy Nodes

The current hierarchy already supports expand/collapse via TreeView.
Ensure imported model hierarchies render correctly:

```typescript
private getNodeType(obj: SceneObject): TreeNode['type'] {
  // ... existing checks

  // Model instance (has children from import)
  if (isEntity(obj) && obj.hasComponent('modelInstance')) {
    return 'group';  // Makes it expandable
  }
}
```

### 6.2 Model Instance Component

**File:** `src/core/interfaces/IModelInstanceComponent.ts`

```typescript
interface IModelInstanceComponent extends IComponent {
  type: 'modelInstance';
  modelAssetRef: IAssetReference;
  rootNodeIndex: number;
}
```

---

## Phase 7: Project Folder Integration

**Estimated Effort:** ~1 session

### 7.1 Auto-Discovery of Model Files

**File:** `src/core/ProjectService.ts`

Extend `discoverProjectAssets()` to find model files:
```typescript
private async discoverProjectAssets(): Promise<void> {
  // ... existing code for shaders, materials

  // Discover model files
  const modelExtensions = ['.glb', '.gltf'];
  for await (const entry of this.walkDirectory(this.rootHandle)) {
    if (modelExtensions.some(ext => entry.name.endsWith(ext))) {
      await this.registerDiscoveredModel(entry);
    }
  }
}
```

### 7.2 Model Storage Location

Imported models stored in project folder:
```
project/
├── .ready-set-render/
│   └── project.json
├── assets/
│   └── imported/
│       └── MyModel/
│           ├── model.json    // IModelAsset metadata
│           ├── mesh_0.bin    // Geometry data
│           └── mesh_1.bin
└── models/                   // User can organize source files here
    └── MyModel.glb
```

---

## Phase 8: Scene Serialization Updates

**Estimated Effort:** ~0.5 session

### 8.1 Serialize MeshEntity

**File:** `src/core/serialization/EntitySerializer.ts`

Add factory registration:
```typescript
EntitySerializer.registerFactory('MeshEntity', {
  create: (data) => {
    const entity = new MeshEntity(data.uuid, data.name);
    entity.fromJSON(data);
    return entity;
  }
});
```

### 8.2 Serialize Model Instances

When saving scene with imported models:
- Store only `modelAssetRef` (not full geometry)
- Store instance transform overrides
- Store material overrides (if any)

---

## Phase 9: Testing

**Estimated Effort:** ~1 session

### 9.1 Unit Tests

| Test File | Coverage |
|-----------|----------|
| `GLTFImportService.test.ts` | Import workflow, coordinate conversion |
| `GLTFImporter.test.ts` | Full import plugin |
| `MeshEntity.test.ts` | Entity behavior |
| `IModelAsset.test.ts` | Type guards, factory |
| `AssetBrowserTab.model.test.ts` | Imported assets display |

### 9.2 Integration Tests

| Test | Description |
|------|-------------|
| Import simple cube GLB | Single mesh, no materials |
| Import with materials | PBR material conversion |
| Import with hierarchy | Parent-child preservation |
| Drag-drop to viewport | Asset instantiation |
| Scene save/load with imports | Serialization round-trip |

### 9.3 Test Assets

Create minimal test GLB files:
- `test-cube.glb` — Single mesh
- `test-hierarchy.glb` — Parent + 2 children
- `test-materials.glb` — Multiple materials

---

## Phase 10: Polish & UX

**Estimated Effort:** ~0.5 session

### 10.1 Error Handling

- Invalid file format → Clear error message
- Unsupported GLTF extensions → Warning + partial import
- Missing textures → Use placeholder, warn
- Large file → Progress indicator

### 10.2 Undo/Redo Integration

All import operations should be undoable:
- `ImportModelCommand` — Undo removes from registry + scene
- `InstantiateModelCommand` — Undo removes from scene

---

## LIBRARIES.md Entry (To Be Added)

```markdown
### @gltf-transform/core

**Added:** 2026-03-02
**Version:** ^4.x.x
**Category:** Import / 3D Models
**Size:** ~50KB (minified + gzipped)
**npm:** https://www.npmjs.com/package/@gltf-transform/core
**GitHub:** https://github.com/donmccurdy/glTF-Transform

#### Justification

Required for **3D Model Import (Goal #8)**. @gltf-transform/core is the industry-standard
GLTF/GLB parsing library, maintained by Don McCurdy (Khronos GLTF spec contributor). It provides:

- Full GLTF 2.0 spec compliance
- Direct Float32Array access to geometry data
- PBR material property extraction
- Scene hierarchy traversal
- No rendering dependencies (pure data model)

Implementing a custom GLTF parser would be impractical given the spec complexity
(100+ page specification) and would not serve the learning goals of this project
(which focus on WebGL2 rendering, not file format parsing).

#### Usage

- `src/plugins/importers/gltf/GLTFImportService.ts` — Core import logic
- `src/plugins/importers/gltf/GLTFImporter.ts` — Plugin interface

#### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|---------------|
| Custom parser | GLTF spec too complex; would take months |
| @loaders.gl/gltf | Larger (~80KB), more dependencies |
| Three.js GLTFLoader | Forbidden (tied to Three.js, heavy abstractions) |
| gltf-parser | Less maintained, weaker TypeScript support |
```

---

## Implementation Order (Recommended)

```
Phase 1 (Foundation)     ████░░░░░░  ~2 sessions
Phase 2 (Import Service) ██░░░░░░░░  ~1 session
Phase 3 (Importer)       ██░░░░░░░░  ~1 session
Phase 4 (File Menu)      ██░░░░░░░░  ~1 session
Phase 5 (Asset Browser)  ████░░░░░░  ~2 sessions
Phase 6 (Hierarchy)      █░░░░░░░░░  ~0.5 session
Phase 7 (Project)        ██░░░░░░░░  ~1 session
Phase 8 (Serialization)  █░░░░░░░░░  ~0.5 session
Phase 9 (Testing)        ██░░░░░░░░  ~1 session
Phase 10 (Polish)        █░░░░░░░░░  ~0.5 session
```

**Total Estimated:** ~10 sessions

---

## Dependencies Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──┬──► Phase 4
                                  │
                                  ├──► Phase 5 ──► Phase 6
                                  │
                                  └──► Phase 7 ──► Phase 8

Phase 9 depends on Phases 3, 5, 7, 8
Phase 10 depends on all previous phases
```

---

## Out of Scope (Future Work)

| Feature | Notes |
|---------|-------|
| **Texture import** | Images stored as separate assets |
| **Animation import** | Requires animation system |
| **Skinned meshes** | Requires skeleton/bone system |
| **GLTF extensions** | KHR_lights, KHR_materials_*, etc. |
| **Draco compression** | Requires draco3d WASM (~300KB) |
| **Multi-file GLTF** | .gltf + .bin + textures |

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Plugin architecture for importers
- [GUIDELINES.md](./GUIDELINES.md) — Coordinate system, terminology
- [LIBRARIES.md](./LIBRARIES.md) — Dependency tracking (to be updated)
- [ASSET_SYSTEM_PLAN.md](./ASSET_SYSTEM_PLAN.md) — Existing asset infrastructure
- [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md) — Z-up conversion requirements
