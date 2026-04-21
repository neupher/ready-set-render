# Project Context: WebGL Editor

> **Last Updated:** 2026-04-21T14:13:00Z
> **Version:** 0.15.10
> **Status:** Architecture Remediation Plan Created

---

## Quick Summary

A modular, extensible WebGL2-based 3D editor designed for learning and implementing real-time and ray-tracing rendering techniques. The project emphasizes clean architecture, plugin-based extensibility, and professional-grade UI similar to Unity or Substance Painter.

**Session startup note:** New sessions should also review `/c:/Git/ready-set-render/.llms/Architecture Review.md` before making architecture-sensitive changes. That file tracks current architectural risks, implementation drift, and recommended improvement order.

---

## Project Goals

| # | Goal | Priority | Status |
|---|------|----------|--------|
| 1 | Educational rendering implementation (realtime + raytracing) | High | In Progress |
| 2 | Professional UI (Unity/Substance Painter style) | High | In Progress |
| 3 | WebGL2 cross-browser rendering | High | ✅ Complete |
| 4 | Mobile-friendly design | Medium | Not Started |
| 5 | Modular UI components with logic hooks | High | In Progress |
| 6 | Main canvas WebGL renderer | High | ✅ Complete |
| 7 | Swappable render pipelines (forward/deferred/raytracing) | High | In Progress |
| 8 | 3D model import (.obj, .gltf) | Medium | In Progress |
| 9 | Texture support (.png, .jpg, .tga) | Medium | Not Started |
| 10 | In-editor shader text editor | Medium | ✅ Complete |
| 11 | Camera controls and scene navigation | High | ✅ Complete |
| 12 | Comprehensive documentation | High | Ongoing |
| 13 | Full test coverage | High | Ongoing |

---

## Current State (v0.15.10)

### What's Working

- **Core Engine**: EventBus, SceneGraph, PluginManager, WebGLContext, CommandHistory, SettingsService, ImportController
- **GLTF Scene Serialization** (Phase 8 - Complete)
  - `GroupEntity` implements `ISerializable` with `toJSON()`/`fromJSON()` methods
  - `EntitySerializer` registers factories for `MeshEntity` and `GroupEntity`
  - Imported model hierarchies can be saved/loaded with scenes
  - Full round-trip serialization preserves mesh asset references and parent-child relationships
- **GLTF Hierarchy Preservation** (Phase 5 - Complete)
  - `GroupEntity`: New entity type for non-mesh nodes in GLTF hierarchies
    - `isMeshGroup: true` marker for UI detection
    - `getModelMatrix()` computes world transform via parent chain traversal
  - `GLTFImporter.createNodeWithHierarchy()`: Preserves parent-child relationships
  - `MeshEntity.getModelMatrix()`: Updated to compute world transforms
  - `SceneGraph.registerRecursively()`: Registers all children in objectMap
  - `ForwardRenderer`: Uses entity's `getModelMatrix()` for world transform (hierarchy inheritance)
  - TreeView `meshGroup` type with solid cube + wireframe icon
  - SelectionController gizmo drag tracking to prevent selection on release
- **GLTF Project Folder Integration** (Phase 7 - Complete)
  - **Source File Scanning**: `scanSourceFiles()` detects .glb/.gltf in `sources/` folder
  - **Refresh Mechanism**: Toolbar with 🔄 button to rescan project
  - **Source Files in Tree View**: Shows import status (✓) with context menu actions
  - **Import from Project Sources**: `importFromProject()` method for source files
  - **Folder Structure Mirroring**: AssetBrowserTab shows actual disk structure
    - `assets/` with subfolders: materials, meshes, models, scenes, shaders, textures
    - `sources/` with subfolders: models, other, textures
  - Source files copied to project on import via `copySourceFile()`
- **Built-in Shaders**: Lambert (default), PBR (Cook-Torrance BRDF), Unlit
  - Shader sources loaded from external `.glsl` files for maintainability
  - `src/plugins/renderers/shaders/lambert/` — Lambert shader module (default for primitives)
  - `src/plugins/renderers/shaders/unlit/` — Unlit shader module
  - `src/plugins/renderers/shaders/pbr/` — PBR shader module
- **Custom Shader Workflow** (v0.14.3)
  - Project folder prompt when creating shaders without open project
  - Custom shaders correctly appear as selected in dropdown after application
  - Custom shaders render correctly (UUID resolution in ForwardRenderer)
  - Alpha transparency support via WebGL blending
- **Scene Controller**: New/Open/Save/Save As operations with File System Access API
  - `SceneController`: Central scene file operations manager
  - `ConfirmDialog`: Unsaved changes warning dialog
  - Keyboard shortcuts: Ctrl+N (New), Ctrl+O (Open), Ctrl+S (Save), Ctrl+Shift+S (Save As)
  - Dirty state tracking with visual indicator in Hierarchy panel
  - **Export as HTML**: Shareable scene launcher files (File → Export as HTML)
    - `SceneLauncherExporter`: Generates self-contained HTML files with embedded scene data
    - Double-click exported HTML → Opens browser → Loads scene in deployed editor
    - Uses `postMessage` API for secure cross-window communication
- **Project Folder Feature (Phases 1-4)**: Project-based workflow for asset management
  - `ProjectService`: Core service for managing project folders
    - Open/close project folders via File System Access API
    - Automatic asset discovery and registration on open
    - Project metadata stored in `.ready-set-render/project.json`
    - localStorage persistence for "last opened project"
  - `IProjectService`: Full interface with `IProjectMetadata`, result types, events
  - Project events: `project:opened`, `project:closed`
  - File menu commands: "Open Project", "Close Project"
- **Asset System (Phase A)**: Foundation layer for asset persistence
  - `AssetRegistry`: Central registry for all assets (CRUD, events, search, type indexing)
  - `FileSystemAssetStore`: File System Access API based persistence
  - `MigrationRunner`: Sequential schema migration with gap detection
  - Interfaces: `ISerializable`, `IAssetMetadata`, `IAssetReference`, `IAsset`, `IAssetStore`, `IMigration`
  - Type guards: `isAssetMetadata()`, `isAssetReference()`
- **Asset System (Phase B)**: Shader Assets
  - `IShaderAsset`: Shader program asset interface with uniform declarations
  - `IUniformDeclaration`: Uniform metadata for auto-generated material editor UI
  - `ShaderAssetFactory`: Create/duplicate shaders, JSON serialization
  - `ShaderCompilationService`: Compile shaders with error parsing (line numbers, snippets)
  - Built-in shaders: PBR (Cook-Torrance BRDF), Unlit (solid color)
  - Type guards: `isShaderAsset()`, `isUniformDeclaration()`
  - UUID utilities: `generateUUID()`, `isValidUUID()`
- **Asset System (Phase C)**: Material Assets
  - `IMaterialAsset`: Material asset interface with shader reference and parameters
  - `MaterialAssetFactory`: Create/duplicate materials, JSON serialization, parameter sync
  - `BuiltInMaterials`: Built-in "Default PBR" material (neutral gray, references PBR shader)
  - `IMaterialComponent.materialAssetRef`: Optional asset reference for entity-material binding
  - Type guard: `isMaterialAsset()`
- **Asset System (Phase D)**: Scene Serialization
  - `ISceneAsset`: Scene asset interface with entities and settings
  - `ISerializedEntity`: Entity serialization format with transform, components, metadata
  - `EntitySerializer`: Factory-based entity serialization/deserialization with type registry
  - `SceneAssetFactory`: Scene CRUD operations, SceneGraph integration
  - All entity types support `ISerializable`: Cube, Sphere, DirectionalLight, CameraEntity
  - Type guards: `isSceneAsset()`, `isSerializedEntity()`
- **Asset System (Phase E)**: Asset Browser UI
  - `AssetBrowserTab`: Folder-based tree view mirroring actual disk structure
    - **Built-in section**: Immutable framework assets (shaders 🔒, materials)
    - **Project section**: `assets/` and `sources/` folders with real subfolders
  - Right-click context menus for create/duplicate/rename/delete/import operations
  - "No project open" message with "Open Project Folder" button
  - **Assets Panel**: Standalone collapsible panel to the right of Properties
    - Collapses to 28px sidebar with vertical title
    - Smooth CSS transitions for collapse/expand
    - Asset system initialized in Application with built-in assets
- **GLTF Import (Phase 4)**: File Menu & Import UI
  - `ImportController`: Import command workflow manager
    - File picker dialog for `.glb`/`.gltf` files (File System Access API + fallback)
    - Project folder prompt when no project is open
    - `command:import` event handler wired in Application
    - `importFromProject()` for importing from project sources
  - `GLTFImporter`: Plugin bridging `GLTFImportService` to asset system
    - Creates and registers mesh/material assets
    - Converts GLTF hierarchy to `MeshEntity` scene objects
    - Copies source .glb to project and saves model metadata
  - File → Import menu item (was disabled, now enabled)
  - Keyboard shortcut: `Ctrl+I` for import
- **Asset System (Phase F)**: Live Shader Editor
    - `ShaderEditorService`: Live editing lifecycle manager with debounced compilation (300ms)
      - Program cache (UUID → WebGLProgram + uniform locations)
      - Error recovery (keeps last working program on compilation failure)
      - Events: `shader:editing`, `shader:compilationResult`, `shader:programUpdated`, `shader:closed`
  - `MonacoShaderEditor`: Lazy-loaded Monaco-based code editor for GLSL
        - Single-view editor (fragment model primary editing surface)
        - Toolbar: `+ New` / `Save` / `Revert` action buttons
        - Status bar (idle/compiling/success/error)
        - Error markers from compilation results
        - Dark theme matching editor UI ('shader-dark')
        - Read-only mode for built-in shaders
      - `showUnsavedChangesDialog()`: 3-choice modal (Save/Discard/Cancel) for dirty shader prompts
      - Auto-open shader on Asset Browser click with unsaved changes guard
      - `+ New` button creates default unlit shader and opens it for editing
  - **Shader Dropdown**: Material section shader property dropdown
    - `<select>` populated from all shaders in AssetRegistry (built-in 🔒 + custom)
    - `resolveCurrentShaderUuid()`: resolves materialAssetRef → IMaterialAsset → shaderRef
    - `handleShaderDropdownChange()`: UUID→shaderName mapping, asset sync, undo/redo
    - Full undo/redo via `material.shaderName` property path
    - GLSL Language Support: Monarch tokenizer for GLSL ES 3.00
      - Keywords, storage qualifiers, types, built-in functions/variables
      - Syntax highlighting, bracket matching, comments, folding
    - Monaco Worker Setup: Vite-compatible web worker configuration
    - ForwardRenderer custom shader support:
      - Resolves materialAssetRef → IMaterialAsset → shaderRef → cached WebGLProgram
      - Dynamic uniform setting for all GLSL types (float/int/bool/vec2/vec3/vec4/mat3/mat4)
    - "Edit Shader 📝" button in Material section opens shader in Monaco editor
      - Clicking a shader in the Asset Browser auto-opens it in the text editor
  - **Rendering**: ForwardRenderer with multi-light support (up to 8 directional lights)
- **PBR Shader**: Cook-Torrance BRDF following Blender's Principled BSDF conventions
  - GGX/Trowbridge-Reitz normal distribution
  - Smith-GGX geometry function
  - Fresnel-Schlick approximation
  - Metallic/roughness workflow
  - ACES tone mapping, sRGB gamma correction
- **Raw GLSL Support**: Shader modules now use raw `.glsl` files instead of `.glsl.ts` wrappers
  - `vite-plugin-glsl` for development/production (with `#include` directive support)
  - Custom `glslRawPlugin` for Vitest compatibility
  - TypeScript declarations for `.glsl`, `.vert`, `.frag` imports
- **Modular Shaders**: Reusable GLSL modules (math, brdf, lighting) via `composeShader()`
- **Primitives**: Cube, Sphere (via IMeshProvider/MeshGPUCache architecture)
- **Lights**: DirectionalLight with transform-based direction, LightGizmoRenderer (always visible)
  - Lights can now be transformed using standard gizmos
- **Camera**: CameraEntity with composition pattern, OrbitController (Maya-style navigation)
  - Alt+LMB orbit no longer conflicts with gizmo interactions
- **Selection**: Ray picking, Ctrl+Click multi-select, F key framing
- **Undo/Redo**: Command pattern with coalescing and batch mode (Ctrl+Z/Y)
  - Batched operations for atomic undo (e.g., multi-axis gizmo drags)
  - Entity reference stored in dragState for reliable command creation
- **Transform Gizmos**: Visual handles for translate/rotate/scale with W/E/R shortcuts
  - Screen-space constant size rendering
  - Ray casting hit detection for interaction (fixed scale factor matching)
  - Full undo/redo integration via PropertyChangeCommand (batched)
  - **Rotation gizmo**: Clean line rendering with accurate hit detection
  - **Scale gizmo**: Solid axis cubes, wireframe→solid center cube on hover
  - **Translate gizmo**: Maya-style plane handles starting from origin
  - Yellow hover highlight color for consistency
- **Viewport Grid**: Procedural grid on XY plane at Z=0
  - Axis indicator lines always at world origin (X=Red, Y=Green)
  - Adaptive distance-based fade (visible when zoomed out)
  - Toggle button with icon in viewport header
  - **Unit system**: 1 unit = 1 meter (Blender-compatible)
- **Settings System**: Centralized settings with localStorage persistence
  - SettingsService with type-safe get/set methods
  - **Non-modal settings window** (File → Settings, Ctrl+,)
  - Draggable and resizable window for live editing
  - Grid settings panel with sliders and editable number inputs
- **UI**: EditorLayout, HierarchyPanel, PropertiesPanel, ViewportPanel, TopMenuBar, SettingsWindow
- **Entity System**: IEntity, ICloneable, IMeshProvider interfaces
- **Default Scene**: Cube primitive auto-created on startup for faster testing

### Test Coverage

- **1423 tests passing** (includes 128 Asset Meta interface tests + Phase 4 inspector tests + SceneGraph command contract tests)
- **85% coverage thresholds** enforced
- `SceneGraphCommandContract.test.ts`: API contract validation for command classes
- Large test-only fixture available at `/c:/Git/ready-set-render/test_assets/studio_setup.glb` for importer, editor launch, and visual verification work
- `/c:/Git/ready-set-render/test_assets/studio_setup.glb` must remain a test asset only and must not be bundled into the deployed application or copied into production-facing runtime assets

### Architecture Highlights

- **Application.ts** orchestrates all modules (clean 98-line index.ts)
- **PropertyChangeHandler** centralizes all entity property changes
- **MeshGPUCache** centralized GPU resource management
- **ICloneable** enables polymorphic entity duplication
- **PBRShaderProgram** encapsulates PBR shader with automatic material switching
- **GizmoDragState** stores entity reference to avoid selection race conditions
- **SettingsService** centralized settings with localStorage persistence and events
- **GridRenderer** procedural grid with settings integration
- **AssetRegistry** central registry for all assets with EventBus integration
- **FileSystemAssetStore** File System Access API based persistence

---

## In Progress

### Architecture Remediation (HIGHEST PRIORITY)

Addresses architectural drift identified in [Architecture Review.md](./Architecture%20Review.md). See [ARCHITECTURE_REMEDIATION_PLAN.md](./ARCHITECTURE_REMEDIATION_PLAN.md):

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Reconcile Runtime Composition with Plugin Architecture | Not Started |
| Phase 2 | Repair Importer Abstractions | Not Started |
| Phase 3 | Fix Importer and Renderer Correctness Risks | Not Started |
| Phase 4 | Harden Asset Validation and Persistence Boundaries | Not Started |
| Phase 5 | Visual Editor Verification Testing | Not Started |
| Phase 6 | Split Oversized UI Modules (AssetBrowserTab) | Not Started |
| Phase 7 | Update Documentation to Match Implementation | Not Started |

**Key Decisions:**
- Phase 1 must come first (changes composition root)
- All phases must leave existing tests passing
- This is refactoring, not rewriting — no user-visible behavior changes

### Asset Metadata System Revamp

Unity-style `.assetmeta` companion files. See [ASSET_META_SYSTEM_PLAN.md](./ASSET_META_SYSTEM_PLAN.md):

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core Infrastructure (IAssetMeta interfaces) | ✅ Complete |
| Phase 2 | Model Import Refactor (GLTFImporter uses .assetmeta) | ✅ Complete |
| Phase 3 | Asset Browser Refactor (Hierarchical view) | ✅ Complete |
| Phase 4 | Import Inspector (Import settings UI) | ✅ Complete |
| Phase 5 | Texture Support (Future) | Not Started |

**Key Decisions:**
- Source files stay in place (no duplication to `sources/`)
- `.assetmeta` files visible in Asset Browser
- Imported materials read-only; "Make Editable" creates copy
- Drag-drop moves files to `Assets/` folder

### Asset System Implementation

Pre-requisite for Phase 6.9 (Live Shader Editor). See [ASSET_SYSTEM_PLAN.md](./ASSET_SYSTEM_PLAN.md):

| Phase | Description | Status |
|-------|-------------|--------|
| Phase A | Asset Foundation (Registry, Store, Migrations) | ✅ Complete |
| Phase B | Shader Assets | ✅ Complete |
| Phase C | Material Assets | ✅ Complete |
| Phase D | Scene Serialization | ✅ Complete |
| Phase E | Asset Browser UI | ✅ Complete |
| Phase F | Live Shader Editor | ✅ Complete |

### Phase 6: Functional WebGL Editor

Remaining sub-phases (see [PHASE_6_PLAN.md](./PHASE_6_PLAN.md)):

| Phase | Description | Status |
|-------|-------------|--------|
| 6.7 | PBR Uber Shader (Cook-Torrance BRDF) | ✅ Complete |
| 6.8 | Transform Gizmos (W/E/R) | ✅ Complete |
| 6.9 | Live Shader Editor | ✅ Complete |
| 6.10 | Render Mode Dropdown | Not Started |
| 6.11 | ~~Undo/Redo~~ | ✅ Moved earlier, complete |
| 6.12 | Viewport Grid | ✅ Complete |
| 6.13 | Settings Window | ✅ Complete |
| 6.14 | ~~Hierarchy Context Menu~~ | ✅ Complete |

### GLSL Migration ✅ Complete

Raw `.glsl` file support has been fully implemented. All phases complete:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Build Configuration (vite-plugin-glsl, Vitest fix) | ✅ Complete |
| Phase 2 | Migrate Common Shader Modules (math, brdf, lighting) | ✅ Complete |
| Phase 3 | Migrate PBR Shaders (vertex, fragment with #include) | ✅ Complete |

### GLTF Importer Implementation

Foundation for 3D model import. See [GLTF_IMPORTER_PLAN.md](./GLTF_IMPORTER_PLAN.md):

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation — Asset Types & Interfaces (`IMeshAsset`, `IModelAsset`) | ✅ Complete |
| Phase 2 | GLTF Import Service (`GLTFImportService` with @gltf-transform/core) | ✅ Complete |
| Phase 3 | MeshEntity (generic mesh entity referencing `IMeshAsset`) | ✅ Complete |
| Phase 4 | File Menu & Import UI (Ctrl+I shortcut) | ✅ Complete |
| Phase 5 | Hierarchy Preservation & GroupEntity | ✅ Complete |
| Phase 6 | Hierarchy Panel Enhancements | ⏭️ Skipped |
| Phase 7 | Project Folder Integration | ✅ Complete |
| Phase 8 | Scene Serialization Updates | ✅ Complete |
| Phase 9 | Testing (Integration) | Not Started |
| Phase 10 | Polish & UX | Not Started |

---

## Next Steps (Recommended Order)

1. **Architecture Remediation Phase 1: Plugin Architecture** — Reconcile Application.ts with PluginManager. See [ARCHITECTURE_REMEDIATION_PLAN.md](./ARCHITECTURE_REMEDIATION_PLAN.md)
2. **Architecture Remediation Phase 2: Importer Abstractions** — Widen IImporter, make ImportController importer-agnostic
3. **Architecture Remediation Phase 3: Correctness Fixes** — Multi-primitive meshes, fallback normals, renderer extraction
4. **Architecture Remediation Phases 4–7** — Asset validation, visual testing, UI decomposition, documentation
5. **GLTF Importer Phase 9: Testing (Integration)** — Integration tests (overlaps with Remediation Phase 3/5)
6. **Asset Metadata System Phase 5: Texture Support** — .assetmeta for texture imports
7. **Phase 6.10: Render Mode Dropdown** — Switch between render pipelines (unblocked by Remediation Phase 1)

---

## Tech Stack

| Category | Technology | Notes |
|----------|------------|-------|
| Renderer | WebGL2 (native) | No heavy abstractions |
| Language | TypeScript 5.7.2 | Strict mode enabled |
| Build Tool | Vite 6.3.5 | Dev server and bundling |
| GLSL Plugin | vite-plugin-glsl 1.5.5 | Raw `.glsl` file support with `#include` |
| Testing | Vitest 4.0.18 | 85% coverage thresholds |
| Package Manager | npm | Standard tooling |

---

## Directory Structure

```
ready-set-render/
├── .llms/                    # AI context and guidelines
│   ├── PROJECT_CONTEXT.md    # This file (current state)
│   ├── PHASE_6_PLAN.md       # Remaining Phase 6 work
│   ├── ARCHITECTURE.md       # System design
│   ├── COORDINATE_SYSTEM.md  # Z-up right-handed convention
│   ├── GUIDELINES.md         # Development rules
│   ├── PATTERNS.md           # Code conventions
│   ├── WORKFLOWS.md          # Automation triggers
│   ├── LIBRARIES.md          # Dependency tracking
│   ├── TESTING.md            # Test requirements
│   └── archive/              # Historical plan documents
├── src/
│   ├── core/                 # Core engine modules
│   ├── plugins/              # Plugin modules (renderers, primitives, lights, tools)
│   │   └── renderers/
│   │       └── shaders/      # Modular GLSL shader system
│   │           ├── common/   # Raw .glsl modules (math.glsl, brdf.glsl, lighting.glsl)
│   │           └── pbr/      # PBR shader (Cook-Torrance BRDF)
│   ├── ui/                   # UI components and panels
│   ├── utils/                # Shared utilities (math, etc.)
│   ├── shaders.d.ts          # TypeScript declarations for .glsl imports
│   └── index.ts              # Entry point
├── tests/                    # Test suites
├── CHANGELOG.md              # Version history
└── README.md                 # Project readme
```

---

## Completed Work

For detailed history of completed phases, see:
- [archive/PHASE_6_HISTORICAL.md](./archive/PHASE_6_HISTORICAL.md) - Phases 6.1-6.6 implementation details
- [archive/IMPLEMENTATION_PLAN.md](./archive/IMPLEMENTATION_PLAN.md) - Original 7-phase plan (Phases 1-5)
- [CHANGELOG.md](../CHANGELOG.md) - Version history

---

## Key Conventions

| Convention | Reference |
|------------|-----------|
| **Coordinate System** | Z-up, right-handed (Blender) - see [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md) |
| **Terminology** | Unity-style (GameObject, Transform, Component) - see [GUIDELINES.md](./GUIDELINES.md) §7 |
| **Undo/Redo** | Command pattern required for all data changes - see [GUIDELINES.md](./GUIDELINES.md) §6 |
| **Render Pipelines** | Must implement IRenderPipeline interface - see [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **PBR Materials** | Set `shaderName: 'pbr'` on material to enable Cook-Torrance BRDF |
| **GLSL Imports** | Use raw `.glsl` files with default imports - see `src/shaders.d.ts` |

---

## Related Documents

- [PHASE_6_PLAN.md](./PHASE_6_PLAN.md) - Remaining Phase 6 work (6.8-6.13)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design details
- [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md) - Z-up convention
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [WORKFLOWS.md](./WORKFLOWS.md) - Workflow automation
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
- [TESTING.md](./TESTING.md) - Testing guidelines
- [../CHANGELOG.md](../CHANGELOG.md) - Version history
