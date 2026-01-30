# Asset System Implementation Plan

> **Last Updated:** 2026-01-30T20:32:00Z
> **Version:** 0.1.3
> **Status:** Phase D Complete - Phase E Ready for Implementation
> **Pre-requisite for:** Phase 6.9 (Live Shader Editor)

---

## Overview

A comprehensive asset system enabling scene/material/shader persistence with File System Access API storage. This is a prerequisite for a meaningful Live Shader Editor.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Asset IDs** | UUIDs | Globally unique, no collision |
| **References vs Embed** | References | Smaller files, shared resources update everywhere |
| **Built-in Shaders** | Read-only + Duplicate | Protect defaults, allow customization via copy |
| **New Shader Template** | Unlit shader | Simplest starting point for custom shaders |
| **Version Strategy** | Version fields | Enable future migrations |
| **Storage** | File System Access API | Real files, user controls location, VCS compatible |
| **Materials** | Standalone assets | Reusable across entities, professional workflow |

---

## UI Architecture

### Asset Browser Tab (Properties Panel)

New tab in Properties panel alongside Inspector and Text Editor:

```
┌─ Properties ─────────────────────────────────────────┐
│ [Inspector] [Text Editor] [Asset Browser]            │
├──────────────────────────────────────────────────────┤
│ ▼ Materials                                          │
│   📄 Default PBR (built-in)                          │
│   📄 My Custom Material                              │
│   [+ New Material]                                   │
│                                                      │
│ ▼ Shaders                                            │
│   📄 PBR (built-in) 🔒                               │
│   📄 Unlit (built-in) 🔒                             │
│   📄 My Custom Shader                                │
│   [+ New Shader] [Duplicate Selected]               │
└──────────────────────────────────────────────────────┘
```

**Note:** Materials are NOT created from Create menu or Hierarchy context menu - only from Asset Browser.

### Text Editor Tab (Properties Panel)

- Monaco Editor for GLSL editing
- Triggered by "Edit Shader" button in material inspector
- Live compilation with error reporting
- Save/Revert controls

### Material Inspector (Inspector Tab)

When a material or entity with material is selected:

```
┌─ Properties ─────────────────────────────────────────┐
│ Material: "My Custom Material"                       │
│ ──────────────────────────────────────               │
│ Shader: [PBR ▼]              [Edit Shader 📝]        │
│                                                      │
│ ▼ Surface                                            │
│   Base Color    [████████] #CCCCCC                  │
│   Metallic      [═══════●══] 0.5                    │
│   Roughness     [════●═════] 0.3                    │
│                                                      │
│ ▼ Emission                                           │
│   Color         [████████] #000000                  │
│   Strength      [●════════] 0.0                     │
│                                                      │
│ [Save Material] [Revert]                            │
└──────────────────────────────────────────────────────┘
```

---

## Phase A: Asset Foundation

### A.1 Serialization Interfaces

```typescript
interface ISerializable<T> {
  toJSON(): T;
  fromJSON(data: T): void;
}

interface IAssetMetadata {
  uuid: string;
  name: string;
  version: number;
  created: string;   // ISO 8601
  modified: string;  // ISO 8601
}

interface IAssetReference<T extends IAssetMetadata> {
  uuid: string;
  type: T['type'];
}
```

### A.2 Asset Registry

- `AssetRegistry` singleton service
- Register/unregister assets by type and UUID
- Resolve references to loaded assets
- Events: `asset:registered`, `asset:unregistered`, `asset:modified`

### A.3 Asset Store (File System Access API)

```typescript
interface IAssetStore {
  openFolder(): Promise<void>;
  saveAsset(asset: IAsset): Promise<void>;
  loadAsset<T extends IAsset>(uuid: string, type: string): Promise<T>;
  deleteAsset(uuid: string): Promise<void>;
  listAssets(type?: string): Promise<IAssetMetadata[]>;
}
```

File formats:
- `.scene.json` - Scene files
- `.material.json` - Material files
- `.shader.json` - Custom shader files

### A.4 Version Migration Framework

```typescript
interface IMigration {
  fromVersion: number;
  toVersion: number;
  migrate(data: unknown): unknown;
}
```

---

## Phase B: Shader Assets

### B.1 Shader Asset Interface

```typescript
interface IShaderAsset extends IAssetMetadata {
  type: 'shader';
  isBuiltIn: boolean;
  vertexSource: string;
  fragmentSource: string;
  uniforms: IUniformDeclaration[];
}

interface IUniformDeclaration {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'bool' | 'sampler2D';
  displayName: string;
  defaultValue: unknown;
  min?: number;
  max?: number;
  uiType?: 'slider' | 'color' | 'number' | 'checkbox';
}
```

### B.2 Built-in Shader Registration

- Register PBR and Unlit as built-in (read-only)
- `isBuiltIn: true` flag prevents modification
- "Duplicate" action creates editable copy with new UUID

### B.3 Custom Shader Creation

- "New Shader" creates minimal unlit shader template
- "Duplicate" copies any shader with new UUID
- Validation before save (must compile)

### B.4 Shader Compilation Service

```typescript
interface IShaderCompilationResult {
  success: boolean;
  program?: WebGLProgram;
  errors?: IShaderError[];
}

interface IShaderError {
  type: 'vertex' | 'fragment' | 'link';
  line?: number;
  message: string;
}
```

---

## Phase C: Material Assets

### C.1 Material Asset Interface

```typescript
interface IMaterialAsset extends IAssetMetadata {
  type: 'material';
  shaderRef: IAssetReference<IShaderAsset>;
  parameters: Record<string, unknown>;  // Keyed by uniform name
}
```

### C.2 Material Creation Workflow

1. User clicks [+ New Material] in Asset Browser
2. Dialog prompts for name and base shader
3. Material created with shader's default uniform values
4. Material appears in Asset Browser

### C.3 Material-Entity Binding

```typescript
interface IMaterialComponent extends IComponent {
  type: 'material';
  materialRef?: IAssetReference<IMaterialAsset>;  // NEW: reference to asset
  // ... existing inline properties as fallback
}
```

Assignment methods:
- Drag material from Asset Browser to entity in Hierarchy
- Dropdown in entity's Inspector panel

---

## Phase D: Scene Serialization

### D.1 Scene Asset Interface

```typescript
interface ISceneAsset extends IAssetMetadata {
  type: 'scene';
  entities: ISerializedEntity[];
  settings: ISceneSettings;
}

interface ISerializedEntity {
  uuid: string;
  name: string;
  type: string;  // 'Cube', 'Sphere', 'DirectionalLight', etc.
  parentUuid?: string;
  transform: ISerializedTransform;
  components: ISerializedComponent[];
}
```

### D.2 Entity Serialization

Add `ISerializable` to all entity types:
- `Cube.toJSON()` / `Cube.fromJSON()`
- `Sphere.toJSON()` / `Sphere.fromJSON()`
- `DirectionalLight.toJSON()` / `DirectionalLight.fromJSON()`
- `CameraEntity.toJSON()` / `CameraEntity.fromJSON()`

### D.3 File Menu Integration

| Command | Shortcut | Action |
|---------|----------|--------|
| New Scene | Ctrl+N | Clear scene, prompt to save unsaved |
| Open Scene | Ctrl+O | File picker, load .scene.json |
| Save Scene | Ctrl+S | Save to current file or prompt |
| Save Scene As | Ctrl+Shift+S | Always prompt for location |

### D.4 Default Scene Handling

- Auto-save working scene to IndexedDB (draft)
- Prompt to save unsaved changes on close
- Optional: "Recent Scenes" in File menu

---

## Phase E: Asset Browser UI

### E.1 Asset Browser Tab Component

```typescript
class AssetBrowserTab extends HTMLElement {
  // Tree view grouped by asset type
  // Actions: New, Duplicate, Rename, Delete
  // Double-click opens in appropriate editor
}
```

### E.2 Asset Actions

| Asset Type | Actions |
|------------|---------|
| Material | New, Rename, Delete, Assign to Selected |
| Shader (custom) | Rename, Delete, Edit |
| Shader (built-in) | Duplicate |

### E.3 Drag-Drop Support

- Drag material → entity in Hierarchy = assign material
- Drag material → viewport = assign to selected entity

---

## Phase F: Live Shader Editor (Original 6.9)

### F.1 Monaco Editor Integration

Dependencies:
- `monaco-editor` (~1.8MB, async loaded)
- `uuid` (~3KB)

Monaco configuration:
- GLSL syntax highlighting
- Error markers from compilation
- Auto-complete for built-in functions (optional)

### F.2 Live Compilation

```typescript
class ShaderEditor {
  private debounceTimer: number;

  onContentChange(source: string): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.compile();
    }, 300);
  }

  compile(): void {
    const result = this.compilationService.compile(
      this.vertexSource,
      this.fragmentSource
    );

    if (result.success) {
      this.updateViewport(result.program);
    } else {
      this.showErrors(result.errors);
    }
  }
}
```

### F.3 Shader Parameter UI

Auto-generate from uniform declarations:

| Uniform Type | UI Control |
|--------------|------------|
| `float` | Slider or number input |
| `vec3` (color) | Color picker |
| `vec3` (other) | 3x number inputs |
| `bool` | Checkbox |
| `sampler2D` | Texture picker (future) |

### F.4 Edit Workflow

1. Select entity with material in Hierarchy
2. Click [Edit Shader 📝] in Inspector
3. Text Editor tab activates with shader source
4. Edit with live compilation feedback
5. Changes preview in viewport immediately
6. [Save] persists to file, [Revert] discards

---

## File Structure After Implementation

```
src/
├── core/
│   ├── assets/
│   │   ├── AssetRegistry.ts
│   │   ├── FileSystemAssetStore.ts
│   │   ├── interfaces/
│   │   │   ├── IAsset.ts
│   │   │   ├── IAssetMetadata.ts
│   │   │   ├── IAssetReference.ts
│   │   │   ├── IAssetStore.ts
│   │   │   ├── IMaterialAsset.ts
│   │   │   ├── ISceneAsset.ts
│   │   │   ├── IShaderAsset.ts
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── serialization/
│   │   ├── EntitySerializer.ts
│   │   ├── ISerializable.ts
│   │   └── index.ts
│   └── ...
├── ui/
│   ├── panels/
│   │   └── PropertiesPanel.ts  (update with tabs)
│   ├── tabs/
│   │   ├── AssetBrowserTab.ts
│   │   ├── InspectorTab.ts
│   │   └── TextEditorTab.ts
│   ├── editors/
│   │   └── ShaderEditor.ts  (Monaco wrapper)
│   └── ...
└── ...
```

---

## Implementation Order

| Order | Phase | Description | Dependencies | Status |
|-------|-------|-------------|--------------|--------|
| 1 | Phase A | Asset Foundation | None (blocking) | ✅ Complete |
| 2 | Phase B | Shader Assets | Phase A | ✅ Complete |
| 3 | Phase C | Material Assets | Phase A, B | ✅ Complete |
| 4 | Phase D | Scene Serialization | Phase A, B, C | ✅ Complete |
| 5 | Phase E | Asset Browser UI | Phase A, B, C | Not Started |
| 6 | Phase F | Live Shader Editor | All above | Not Started |

---

## Dependencies to Add

| Package | Purpose | Size | Requires LIBRARIES.md Update |
|---------|---------|------|------------------------------|
| `monaco-editor` | GLSL code editor | ~1.8MB (async) | ✅ Yes |
| `uuid` | Asset ID generation | ~3KB | ✅ Yes |

---

## Testing Strategy

- Unit tests for serialization round-trips (`toJSON` → `fromJSON`)
- Unit tests for AssetRegistry CRUD operations
- Integration tests for save/load cycle (mock File System API)
- UI component tests for Asset Browser

---

## Related Documents

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current project state
- [PHASE_6_PLAN.md](./PHASE_6_PLAN.md) - Phase 6 roadmap
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
