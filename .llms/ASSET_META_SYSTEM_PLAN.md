# Asset Metadata System Revamp

> **Last Updated:** 2026-03-06T11:57:00Z
> **Version:** 0.1.0
> **Status:** Phase 4 Complete

---

## Overview

Revamp the asset system to follow Unity's asset import paradigm:

1. **Source files stay in place** - No duplication into `sources/` folder
2. **`.assetmeta` companion files** - Store editor-specific import settings alongside source files
3. **Reimport workflow** - Modify settings → Reimport → Changes take effect
4. **Expandable assets** - .glb shown as single collapsible item with meshes/materials inside

---

## Current vs Proposed Architecture

### Current System (Problems)

```
MyProject/
├── .ready-set-render/
├── sources/
│   └── models/
│       └── car.glb              ← Duplicated source file
├── assets/
│   ├── models/
│   │   └── {uuid}.model.json    ← Separate metadata
│   ├── meshes/
│   │   └── {uuid}.mesh.json     ← Extracted mesh data (redundant with .glb)
│   └── materials/
│       └── {uuid}.material.json ← Extracted material
```

**Problems:**
- Source files are duplicated unnecessarily
- Mesh/material data duplicates what's in the .glb
- No way to "reimport" with different settings
- Asset Browser shows fragmented view

### Proposed System (Unity-style)

```
MyProject/
├── .ready-set-render/
│   └── project.json
├── Assets/                       ← User's asset folder (can be anywhere)
│   ├── Models/
│   │   ├── car.glb              ← Original source file (NOT copied)
│   │   └── car.glb.assetmeta    ← Import settings + cached references
│   ├── Textures/
│   │   ├── wood.png
│   │   └── wood.png.assetmeta
│   ├── Materials/
│   │   └── {uuid}.material.json ← User-created materials
│   └── Shaders/
│       └── {uuid}.shader.json   ← User-created shaders
└── Scenes/
    └── MainScene.scene.json
```

---

## Core Concepts

### 1. Source Asset

The original file created externally (Blender export, downloaded model, texture file).

| Property | Description |
|----------|-------------|
| **Location** | Anywhere in project folder |
| **Ownership** | External (Blender, Photoshop, etc.) |
| **Editable** | Yes, in external tools |
| **In Asset Browser** | Yes, as collapsible item |

Supported source types (Phase 1):
- `.glb`, `.gltf` - 3D models

Future source types:
- `.png`, `.jpg`, `.tga`, `.exr` - Textures
- `.hdr` - HDRI environment maps

### 2. Asset Metadata (`.assetmeta`)

A JSON file that stores editor-specific settings for the source asset.

| Property | Description |
|----------|-------------|
| **Naming** | `{filename}.assetmeta` (e.g., `car.glb.assetmeta`) |
| **Location** | Same directory as source file |
| **Created** | Automatically on first import |
| **Purpose** | Import settings + cached UUID references |

### 3. Derived Assets

Assets extracted/generated from source during import.

| Type | Created From | Stored In |
|------|-------------|-----------|
| Mesh data | Parsed from .glb | **In memory only** (loaded from .glb on demand) |
| Materials | Parsed from .glb | `.assetmeta` references OR separate `.material.json` if modified |
| Textures | Extracted from .glb | `.assetmeta` references OR separate files if modified |

---

## Asset Metadata Schema

### Base Schema (All Asset Types)

```typescript
interface IAssetMeta {
  /** Schema version for migrations */
  version: number;

  /** Stable UUID for this asset (survives renames/moves) */
  uuid: string;

  /** Asset type identifier */
  type: AssetMetaType;

  /** Import timestamp (last successful import) */
  importedAt: string;

  /** Source file hash for change detection */
  sourceHash: string;

  /** Whether the asset needs reimport (source changed) */
  isDirty: boolean;
}

type AssetMetaType = 'model' | 'texture' | 'audio' | 'other';
```

### Model Asset Metadata (`.glb.assetmeta`)

```typescript
interface IModelAssetMeta extends IAssetMeta {
  type: 'model';

  /** Model-specific import settings */
  importSettings: IModelImportSettings;

  /** Cached references to derived assets */
  contents: {
    meshes: IMeshReference[];
    materials: IMaterialReference[];
    textures?: ITextureReference[];
  };

  /** Preserved hierarchy from source */
  hierarchy: IModelNode[];
}

interface IModelImportSettings {
  /** Scale factor applied during import (default: 1.0) */
  scaleFactor: number;

  /** Coordinate system conversion */
  convertCoordinates: {
    /** Source file coordinate system (auto-detected or manual) */
    sourceUp: 'Y' | 'Z';
    /** Convert to editor's Z-up system */
    convertToZUp: boolean;
  };

  /** Mesh import options */
  meshes: {
    /** Generate normals if missing */
    generateNormals: boolean;
    /** Normal generation angle threshold (degrees) */
    normalAngleThreshold: number;
    /** Generate tangents for normal mapping */
    generateTangents: boolean;
    /** Weld vertices within threshold */
    weldVertices: boolean;
    /** Weld distance threshold */
    weldThreshold: number;
    /** Optimize mesh for GPU */
    optimizeMesh: boolean;
  };

  /** Material import options */
  materials: {
    /** Import materials from source file */
    importMaterials: boolean;
    /** Material name prefix */
    namePrefix: string;
    /** Extract embedded textures */
    extractTextures: boolean;
  };

  /** Animation import options (future) */
  animations: {
    importAnimations: boolean;
    animationNamePrefix: string;
  };
}
```

### Texture Asset Metadata (`.png.assetmeta`)

```typescript
interface ITextureAssetMeta extends IAssetMeta {
  type: 'texture';

  importSettings: ITextureImportSettings;

  /** Cached texture properties */
  properties: {
    width: number;
    height: number;
    format: string;
    hasAlpha: boolean;
  };
}

interface ITextureImportSettings {
  /** Texture type affects default settings */
  textureType: 'default' | 'normalMap' | 'sprite' | 'cursor' | 'lightmap';

  /** sRGB color space (true for albedo, false for data textures) */
  sRGB: boolean;

  /** Alpha source */
  alphaSource: 'none' | 'inputTextureAlpha' | 'fromGrayScale';

  /** Alpha is transparency */
  alphaIsTransparency: boolean;

  /** Generate mipmaps */
  generateMipMaps: boolean;

  /** Mipmap filtering */
  mipMapFilter: 'box' | 'kaiser';

  /** Wrap mode */
  wrapMode: 'repeat' | 'clamp' | 'mirror';

  /** Filter mode */
  filterMode: 'point' | 'bilinear' | 'trilinear';

  /** Anisotropic filtering level */
  anisoLevel: number;

  /** Max texture size (power of 2) */
  maxSize: 256 | 512 | 1024 | 2048 | 4096 | 8192;

  /** Compression format */
  compression: 'none' | 'lowQuality' | 'normalQuality' | 'highQuality';
}
```

---

## Default Import Settings

### Model Defaults

```typescript
const DEFAULT_MODEL_IMPORT_SETTINGS: IModelImportSettings = {
  scaleFactor: 1.0,
  convertCoordinates: {
    sourceUp: 'Y',  // GLTF standard is Y-up
    convertToZUp: true,  // Our editor uses Z-up
  },
  meshes: {
    generateNormals: true,
    normalAngleThreshold: 60,
    generateTangents: true,
    weldVertices: false,
    weldThreshold: 0.0001,
    optimizeMesh: true,
  },
  materials: {
    importMaterials: true,
    namePrefix: '',
    extractTextures: true,
  },
  animations: {
    importAnimations: true,
    animationNamePrefix: '',
  },
};
```

### Texture Defaults (by type)

```typescript
const DEFAULT_TEXTURE_SETTINGS: Record<string, Partial<ITextureImportSettings>> = {
  default: {
    textureType: 'default',
    sRGB: true,
    generateMipMaps: true,
    wrapMode: 'repeat',
    filterMode: 'bilinear',
    anisoLevel: 1,
    maxSize: 2048,
    compression: 'normalQuality',
  },
  normalMap: {
    textureType: 'normalMap',
    sRGB: false,  // Normal maps are linear
    generateMipMaps: true,
    wrapMode: 'repeat',
    filterMode: 'trilinear',
    compression: 'highQuality',  // Normal maps need quality
  },
};
```

---

## Asset Browser UI Changes

### Current View (Flat)

```
▼ Assets
  ├── Materials/
  │   └── 📄 CarPaint
  ├── Meshes/           ← Redundant, data is in .glb
  │   ├── 📄 Body
  │   └── 📄 Wheels
  └── Models/
      └── 📄 Car        ← Just metadata

▼ Sources
  └── models/
      └── 📦 car.glb    ← Duplicated file
```

### Proposed View (Hierarchical)

```
▼ Assets
  ├── Models/
  │   └── 📦 car.glb                    ← Source file (expandable)
  │       ├── 🔷 Body (Mesh)            ← Derived asset
  │       ├── 🔷 Wheels (Mesh)          ← Derived asset
  │       ├── 🎨 CarPaint (Material)    ← Derived asset
  │       └── 🎨 Glass (Material)       ← Derived asset
  ├── Materials/
  │   └── 🎨 CustomMetal               ← User-created material
  ├── Shaders/
  │   └── 🔒 PBR (built-in)
  └── Textures/
      └── 🖼️ wood.png                   ← Source file (expandable)
          └── (texture preview)
```

### Collapsed vs Expanded

By default, source assets are **collapsed** showing just the file name:

```
📦 car.glb              ← Collapsed (default)
```

Click to expand:

```
📦 car.glb ▼            ← Expanded
   ├── 🔷 Body
   ├── 🔷 Wheels
   └── 🎨 CarPaint
```

### Context Menu (Model Asset)

Right-click on `car.glb`:

```
┌─────────────────────────────────┐
│ Reimport                        │  ← Apply current .assetmeta settings
│ Reimport with Settings...       │  ← Open import settings dialog first
│ ─────────────────────────────── │
│ Show in Explorer                │  ← Open containing folder
│ Copy Path                       │
│ ─────────────────────────────── │
│ Delete                          │  ← Delete source + .assetmeta
└─────────────────────────────────┘
```

### "Show in Asset Browser" Navigation

When user right-clicks a material in the Inspector and selects "Show in Asset Browser":

1. Asset Browser panel scrolls to reveal the material
2. If material is inside a collapsed model, expand the model node first
3. Highlight/select the material node
4. Brief visual pulse animation to draw attention

```typescript
// API for navigation
eventBus.emit('assetBrowser:navigateTo', {
  uuid: materialAsset.uuid,
  expandParent: true,  // Expand containing model if collapsed
  highlight: true      // Visual highlight animation
});
```

---

## Import Inspector Panel

When a source asset is selected, the Inspector shows its import settings:

```
┌─ Inspector ──────────────────────────────────────────┐
│ car.glb                                              │
│ ──────────────────────────────────────               │
│                                                      │
│ ▼ Model Import Settings                              │
│   Scale Factor    [═════●══] 1.0                     │
│                                                      │
│   ☑ Convert to Z-Up                                  │
│   Source Up Axis  [Y ▼]                              │
│                                                      │
│ ▼ Meshes                                             │
│   ☑ Generate Normals                                 │
│   Angle Threshold [═══●════] 60°                     │
│   ☑ Generate Tangents                                │
│   ☐ Weld Vertices                                    │
│   ☑ Optimize Mesh                                    │
│                                                      │
│ ▼ Materials                                          │
│   ☑ Import Materials                                 │
│   Name Prefix     [____________]                     │
│   ☑ Extract Textures                                 │
│                                                      │
│ [Revert] [Apply]                                     │
│ ──────────────────────────────────────               │
│ Last imported: 2026-03-04 12:00:00                   │
│ Source hash: a1b2c3d4...                             │
│ ⚠️ Source file changed - reimport recommended        │
└──────────────────────────────────────────────────────┘
```

---

## Material Inspector States

### State 1: Imported Material (Read-Only)

When entity uses an imported material from a .glb:

```
┌─ Inspector ──────────────────────────────────────────┐
│ Cube                                                 │
│ ──────────────────────────────────────               │
│ ▼ Transform                                          │
│   ...                                                │
│                                                      │
│ ▼ Material                                           │
│   ┌─────────────────────────────────────────────┐    │
│   │ CarPaint (Imported) 🔒           [⋮]        │    │
│   │ ─────────────────────────────────────────   │    │
│   │ Shader: PBR                    [grayed]     │    │
│   │                                             │    │
│   │ ▶ Surface                      [grayed]     │    │
│   │   Base Color    [██████] #CC0000            │    │
│   │   Metallic      [═══════●] 0.8              │    │
│   │   Roughness     [════●═══] 0.3              │    │
│   │                                             │    │
│   │ [Make Editable]                             │    │
│   │                                             │    │
│   │ ℹ️ Imported materials are read-only.        │    │
│   └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

The `[⋮]` menu button shows:
```
┌─────────────────────────────────────┐
│ Show in Asset Browser               │
│ ─────────────────────────────────── │
│ Make Editable (Create Copy)         │
└─────────────────────────────────────┘
```

### State 2: User Material (Editable)

After clicking "Make Editable" or when using a user-created material:

```
┌─ Inspector ──────────────────────────────────────────┐
│ Cube                                                 │
│ ──────────────────────────────────────               │
│ ▼ Material                                           │
│   ┌─────────────────────────────────────────────┐    │
│   │ CarPaint_Copy                    [⋮]        │    │
│   │ ─────────────────────────────────────────   │    │
│   │ Shader: [PBR           ▼]  [Edit Shader 📝] │    │
│   │                                             │    │
│   │ ▼ Surface                                   │    │
│   │   Base Color    [██████] #CC0000 [picker]   │    │
│   │   Metallic      [═══════●] 0.8              │    │
│   │   Roughness     [════●═══] 0.3              │    │
│   │                                             │    │
│   │ ✎ Unsaved changes                           │    │
│   │ [Save] [Revert]                             │    │
│   └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

The `[⋮]` menu button shows:
```
┌─────────────────────────────────────┐
│ Show in Asset Browser               │
│ ─────────────────────────────────── │
│ Rename Material...                  │
│ Duplicate Material                  │
│ ─────────────────────────────────── │
│ Reset to Defaults                   │
└─────────────────────────────────────┘
```

### State 3: Built-in Material (Read-Only, No Make Editable)

Built-in materials (like "Default PBR") are read-only and show "Duplicate" instead:

```
┌─ Inspector ──────────────────────────────────────────┐
│ ▼ Material                                           │
│   ┌─────────────────────────────────────────────┐    │
│   │ Default PBR (Built-in) 🔒        [⋮]        │    │
│   │ ─────────────────────────────────────────   │    │
│   │ ...                              [grayed]   │    │
│   │                                             │    │
│   │ [Duplicate]                                 │    │
│   │                                             │    │
│   │ ℹ️ Built-in materials cannot be modified.   │    │
│   │   Click "Duplicate" to create a copy.       │    │
│   └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

**Files to create:**
- `src/core/assets/interfaces/IAssetMeta.ts` - Base metadata interface
- `src/core/assets/interfaces/IModelAssetMeta.ts` - Model metadata interface
- `src/core/assets/AssetMetaService.ts` - Read/write .assetmeta files
- `src/core/assets/SourceHashService.ts` - Compute file hashes for change detection

**Changes:**
- `ProjectService.ts` - Remove `copySourceFile()`, add `scanAssetsWithMeta()`
- `AssetRegistry.ts` - Support source assets + derived assets relationship

**Tests:**
- AssetMetaService CRUD operations
- Hash computation and change detection
- Round-trip serialization

### Phase 2: Model Import Refactor

**Files to modify:**
- `GLTFImporter.ts` - Use .assetmeta instead of IModelAsset
- `GLTFImportService.ts` - Accept import settings parameter

**New files:**
- `src/core/assets/ModelImportSettingsDefaults.ts` - Default settings

**Behavior changes:**
- Import creates `.assetmeta` next to source file (no file copy)
- Mesh/material data loaded from .glb on demand (not stored separately)
- Reimport reads existing .assetmeta settings

### Phase 3: Asset Browser Refactor

**Files to modify:**
- `ui/tabs/AssetBrowserTab.ts` - Hierarchical expandable view

**New UI features:**
- Source assets as collapsible tree nodes
- Derived assets shown as children
- Import status indicator (✓ imported, ⚠️ needs reimport)

### Phase 4: Import Inspector

**Files to create:**
- `ui/inspectors/ModelImportInspector.ts` - Import settings UI

**Features:**
- Show/edit import settings for selected source asset
- Apply/Revert buttons
- Reimport button
- Change detection indicator

### Phase 5: Texture Support (Future)

**Files to create:**
- `src/core/assets/interfaces/ITextureAssetMeta.ts`
- `src/plugins/importers/texture/TextureImporter.ts`
- `ui/inspectors/TextureImportInspector.ts`

---

## Migration Strategy

### Handling Existing Projects

Projects created with the old system need migration:

1. **Detect old format** - Check for `sources/` folder and `.model.json` files
2. **Offer migration** - "This project uses the old asset format. Migrate?"
3. **Migration steps:**
   - For each `.model.json`:
     - Find original source in `sources/models/`
     - Move source to `Assets/Models/`
     - Create `.assetmeta` from `.model.json` data
     - Delete old files
4. **Backup** - Create `.ready-set-render/backup/` before migration

### Version Tracking

```typescript
// project.json
{
  "version": "2.0.0",  // Bump version for new format
  "assetSystemVersion": 2,
  "name": "MyProject",
  ...
}
```

---

## API Changes

### Before (Current)

```typescript
// Import creates multiple separate assets
const result = await gltfImporter.import(file);
// result.modelAsset - IModelAsset with UUID
// result.meshAssets - IMeshAsset[] with UUIDs
// result.materialAssets - IMaterialAsset[] with UUIDs

// Source file copied to project
await projectService.copySourceFile(file, 'models');
```

### After (Proposed)

```typescript
// Import creates .assetmeta next to source
const result = await gltfImporter.import(sourceFile, {
  sourcePath: 'Assets/Models/car.glb',  // Where it already is
  settings: customSettings,  // Optional override
});
// result.assetMeta - IModelAssetMeta with UUID
// result.derivedAssets - References only (data stays in .glb)

// No file copying needed - file stays in place
// .assetmeta created at 'Assets/Models/car.glb.assetmeta'
```

### Reimport API

```typescript
// Reimport with existing settings
await assetMetaService.reimport(assetMeta.uuid);

// Reimport with modified settings
assetMeta.importSettings.scaleFactor = 0.01;  // cm to m
await assetMetaService.reimport(assetMeta.uuid, assetMeta);
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **No duplication** | Source files stay in place, no `sources/` copy |
| **Unity familiarity** | Same paradigm as Unity's .meta files |
| **Reimport workflow** | Change settings, reimport, see changes |
| **VCS friendly** | .assetmeta files are small JSON, easy to track |
| **Lazy loading** | Mesh data loaded from .glb on demand |
| **Future extensible** | Same pattern works for textures, audio, etc. |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Source file deleted externally | Detect missing source, show warning in Asset Browser |
| Source file renamed externally | UUID in .assetmeta allows re-linking |
| .assetmeta deleted | Recreate with defaults on next scan |
| Large .glb loading time | Cache parsed mesh data in memory |
| Breaking change | Version 2.0 with migration path |

---

## Design Decisions (Resolved)

### 1. Asset Meta Visibility

**Decision:** `.assetmeta` files are **visible by default** in the Asset Browser.

Rationale: Transparency over hiding. Users should see and understand the metadata files.

### 2. Imported Material Editing

**Decision:** Imported materials are **read-only** (grayed out) by default. Editing creates a copy.

**Workflow:**

```
┌─ Inspector (Material Component) ─────────────────────┐
│ Material: "CarPaint" (Imported) 🔒                   │
│ ──────────────────────────────────────               │
│ Shader: PBR                          [grayed out]    │
│                                                      │
│ ▼ Surface                            [grayed out]    │
│   Base Color    [████████] #CC0000                  │
│   Metallic      [═══════●══] 0.8                    │
│   Roughness     [════●═════] 0.3                    │
│                                                      │
│ [Make Editable]                                      │
│ ──────────────────────────────────────               │
│ ℹ️ Imported materials are read-only.                 │
│   Click "Make Editable" to create an editable copy. │
└──────────────────────────────────────────────────────┘
```

**"Make Editable" behavior:**
1. Duplicates the imported material with a new UUID
2. Saves the new material as `Assets/Materials/{name}.material.json`
3. Assigns the new material to the current entity's mesh
4. Material section becomes fully editable
5. Original imported material remains unchanged in .assetmeta

**Context Menu (Material Component):**
Right-click on material name/section:

```
┌─────────────────────────────────────┐
│ Show in Asset Browser               │  ← Navigates to & highlights material
│ ─────────────────────────────────── │
│ Make Editable (Create Copy)         │  ← Same as button
│ ─────────────────────────────────── │
│ Reset to Default                    │  ← Only for editable materials
└─────────────────────────────────────┘
```

**Material Types:**

| Type | Source | Editable | Stored In |
|------|--------|----------|-----------|
| **Imported** | Parsed from .glb | ❌ No (read-only) | `.assetmeta` |
| **User-created** | Created in editor | ✅ Yes | `.material.json` |
| **Copied from import** | "Make Editable" | ✅ Yes | `.material.json` |
| **Built-in** | Bundled with editor | ❌ No | Code |

### 3. Drag-Drop Import

**Decision:** Drag-drop import **moves files to Assets/** folder.

**Workflow:**
1. User drags `car.glb` from Finder/Explorer onto Asset Browser
2. File is **moved** to `Assets/Models/car.glb`
3. `.assetmeta` is created at `Assets/Models/car.glb.assetmeta`
4. Import process runs with default settings

**Edge cases:**
- File already in Assets/ → Import in-place (no move)
- File name collision → Prompt for rename or overwrite
- File from outside project → Copy (not move) to Assets/

---

## Related Documents

- [ASSET_SYSTEM_PLAN.md](./ASSET_SYSTEM_PLAN.md) - Original asset system (deprecated by this plan)
- [GLTF_IMPORTER_PLAN.md](./GLTF_IMPORTER_PLAN.md) - GLTF importer details
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current project state
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
