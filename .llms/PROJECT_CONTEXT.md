# Project Context: WebGL Editor

> **Last Updated:** 2026-01-23T23:40:00Z
> **Version:** 0.7.1
> **Status:** ICloneable Interface + Shared Menu Definitions

---

## Quick Summary

A modular, extensible WebGL2-based 3D editor designed for learning and implementing real-time and ray-tracing rendering techniques. The project emphasizes clean architecture, plugin-based extensibility, and professional-grade UI similar to Unity or Substance Painter.

---

## Project Goals

| # | Goal | Priority | Status |
|---|------|----------|--------|
| 1 | Educational rendering implementation (realtime + raytracing) | High | Not Started |
| 2 | Professional UI (Unity/Substance Painter style) | High | Not Started |
| 3 | WebGL2 cross-browser rendering | High | Not Started |
| 4 | Mobile-friendly design | Medium | Not Started |
| 5 | Modular UI components with logic hooks | High | Not Started |
| 6 | Main canvas WebGL renderer | High | Not Started |
| 7 | Swappable render pipelines (forward/deferred/raytracing) | High | Not Started |
| 8 | 3D model import (.obj, .gltf) | Medium | Not Started |
| 9 | Texture support (.png, .jpg, .tga) | Medium | Not Started |
| 10 | In-editor shader text editor | Medium | Not Started |
| 11 | Camera controls and scene navigation | High | Not Started |
| 12 | Comprehensive documentation | High | Ongoing |
| 13 | Full test coverage | High | Ongoing |
| 14 | Library tracking | High | Ongoing |
| 15 | Continuous refactoring | Ongoing | Ongoing |

---

## Current State

### ✅ Completed - Phase 1: Foundation Setup

- **Project Structure**: Complete directory structure created following `.llms/ARCHITECTURE.md`
  - `src/` with core, plugins, ui, utils subdirectories
  - `tests/` with unit, integration, helpers structure
  - `public/` for static assets
- **Build System**: Fully configured development and production pipeline
  - TypeScript 5.7.2 with strict mode and path aliases
  - Vite 6.3.5 for dev server and bundling
  - Vitest 2.1.8 with 85% coverage thresholds
- **Configuration Files**: All essential configs in place
- **CI/CD**: GitHub Actions workflow created
- **Entry Point**: Basic application shell with WebGL2 detection

### ✅ Completed - Phase 2: Core Engine

- **Core Interfaces** (`src/core/interfaces/`)
  - `IPlugin.ts`: Plugin and context interfaces
  - `ISceneObject.ts`: Scene object, transform, renderable types
  - `IRenderPipeline.ts`: Hot-swappable render pipeline interface
  - `IImporter.ts`: File importer plugin interface
  - Barrel exports via `index.ts`

- **EventBus** (`src/core/EventBus.ts`)
  - Pub/sub event system for loose coupling
  - Methods: `on()`, `once()`, `emit()`, `off()`, `clear()`
  - 17 unit tests passing

- **WebGLContext** (`src/core/WebGLContext.ts`)
  - WebGL2 context management and state tracking
  - Shader compilation with detailed error handling
  - Program linking, state caching
  - 20 unit tests passing

- **SceneGraph** (`src/core/SceneGraph.ts`)
  - Hierarchical scene structure with `SceneObject` class
  - Add, remove, find, reparent, traverse operations
  - Event emission for all modifications
  - 32 unit tests passing

- **PluginManager** (`src/core/PluginManager.ts`)
  - Plugin lifecycle management
  - Dependency injection via `IPluginContext`
  - Topological sorting, circular dependency detection
  - 29 unit tests passing

- **Test Infrastructure**
  - `tests/helpers/webgl-mock.ts`: Mock WebGL2 context
  - 98 total unit tests passing

### ✅ Completed - Phase 3: Migrate Renderer

- **Transform Utilities** (`src/utils/math/transforms.ts`)
  - Matrix math functions: `mat4Identity`, `mat4Perspective`, `mat4LookAt`, `mat4Multiply`
  - Transform matrices: `mat4Translation`, `mat4Scale`, `mat4RotationX/Y/Z`
  - Angle conversion: `degToRad`, `radToDeg`
  - Type definitions: `Mat4`, `Vec3`
  - 40+ unit tests passing

- **Cube Primitive** (`src/plugins/primitives/Cube.ts`)
  - Implements `IRenderable` interface
  - 8 vertices, 12 edges for wireframe rendering
  - GPU resource management (VAO, VBO)
  - Model matrix computation from transform
  - 30+ unit tests passing

- **LineRenderer Plugin** (`src/plugins/renderers/line/LineRenderer.ts`)
  - Implements `IRenderPipeline` interface as forward renderer
  - Embedded GLSL shaders (WebGL2/ES 300)
  - Polymorphic rendering - calls `render()` on each `IRenderable`
  - Line color customization
  - 25+ unit tests passing

- **Plugin Barrel Exports**
  - `src/plugins/index.ts`
  - `src/plugins/renderers/index.ts`
  - `src/plugins/primitives/index.ts`
  - `src/utils/math/index.ts`

### ✅ Completed - Phase 4: Build UI Layer

- **Theme System** (`src/ui/theme/theme.css`)
  - CSS custom properties matching Figma reference dark theme
  - Design tokens for colors, spacing, typography
  - Styles for all UI components, panels, inputs, tree views

- **UI Components** (`src/ui/components/`)
  - `CollapsibleSection.ts`: Expandable sections with chevron animations (17 tests)
  - `DraggableNumberInput.ts`: Drag-to-adjust number inputs with left-click zone, middle-mouse, and Alt+left-click support (20 tests)
  - `TreeView.ts`: Hierarchical tree view with expand/collapse and typed icons (24 tests)
  - `ResizablePanel.ts`: Drag-to-resize panels with min/max constraints
  - `TopMenuBar.ts`: Dropdown menu bar component

- **UI Panels** (`src/ui/panels/`)
  - `HierarchyPanel.ts`: Scene tree panel using TreeView component
  - `ViewportPanel.ts`: WebGL canvas container with ResizeObserver
  - `PropertiesPanel.ts`: Tabbed properties panel (Details + Shader Editor tabs)
  - `EditorLayout.ts`: Main layout assembler with dependency injection

- **Core Enhancements**
  - `Camera.ts`: Proper ICamera implementation with lazy matrix computation
  - `SceneGraph.ts`: Added IScene implementation with `getRenderables()` method

- **Barrel Exports**
  - `src/ui/index.ts`
  - `src/ui/components/index.ts`
  - `src/ui/panels/index.ts`

- **Tests**: 267 total tests passing (61 new UI tests)

### ✅ Completed - Phase 5: Scene Instantiation System

**Goal:** Enable users to instantiate primitives from the Create menu and see them in the hierarchy with proper component display.

**Key Features Implemented:**
1. **Nested Submenu Support** - Create → Primitives → Cube menu structure
2. **PrimitiveRegistry Plugin** - Registry pattern for instantiating primitives
3. **Entity Component System Foundation** - Display Name, Transform, Mesh, Material
4. **Clean Scene Initialization** - Empty scene by default, no hardcoded cube
5. **Menu-to-Scene Connection** - Clicking Cube creates and renders a new cube

**Sub-phases (all complete):**
- [x] Phase 5.1: Extend TopMenuBar for nested submenus
- [x] Phase 5.2: Create PrimitiveRegistry plugin
- [x] Phase 5.3: Add Entity/Component interfaces
- [x] Phase 5.4: Update Cube to implement IEntity with components
- [x] Phase 5.5: Update PropertiesPanel for component-based display
- [x] Phase 5.6: Connect menu to scene operations, clean scene init
- [x] Phase 5.7: Add EntityIdGenerator utility

### ✅ Completed - Phase 6.1: Fix Rendering Pipeline

**Commit:** `d9d03dc865c9f37a7d6b9b1f970f65e72bda5dab`

**Changes:**
- Added `scene:objectAdded` event listener in `src/index.ts` that calls `initializeGPUResources()` on new renderables
- Created `IInitializable` interface with `initializeGPUResources()` and `isInitialized()` methods
- Added type guard `isInitializable(obj)` for runtime checking
- Updated Cube to implement `isInitialized()`

**Result:** Create Cube via menu → renders as white wireframe immediately ✅

### ✅ Completed - Phase 6.2: Camera as Scene Entity

**Commit:** `21f038ab` (Phase 6.2)

**Key Files Created:**
- `src/core/interfaces/ICameraComponent.ts` - Camera component interface with Unity terminology (fieldOfView, nearClipPlane, farClipPlane, clearFlags, backgroundColor)
- `src/core/CameraEntity.ts` - Entity with camera component using composition pattern (not inheritance)
- `src/core/RenderCameraAdapter.ts` - Bridges CameraEntity to ICamera interface for render pipelines

**Architecture:**
- CameraEntity implements IEntity (NOT extends Camera)
- Transform is single source of truth for position
- RenderCameraAdapter provides ICamera compatibility for existing render pipeline
- Camera appears in Hierarchy panel with movie camera icon

### ✅ Completed - Phase 6.3: Input System & Scene Navigation

**Commit:** `40caac34` (Phase 6.3)

**Key Files Created:**
- `src/core/InputManager.ts` - Centralized mouse/keyboard event tracking
- `src/plugins/navigation/OrbitController.ts` - Maya-style camera navigation
- `src/plugins/navigation/index.ts` - Barrel export

**Features:**
- **Alt + LMB drag**: Orbit/tumble around pivot
- **Alt + MMB drag**: Pan (Maya-style inverted)
- **Alt + RMB drag**: Dolly/zoom (mouse right = zoom in)
- **Scroll wheel**: Zoom
- **F key**: Frame selection
- **Cursor icons**: Custom SVG cursors for orbit, pan, zoom modes

### ✅ Completed - Phase 6.4: Selection System

**Commit:** `fc54a5fe` (Phase 6.4)

**Key Files Created:**
- `src/core/SelectionManager.ts` - Selection state management
- `src/utils/math/ray.ts` - Ray casting and AABB intersection utilities

**Features:**
- **Click to select**: Left-click selects objects in viewport
- **Ctrl+Click**: Toggle selection
- **Ray picking**: Screen-to-world ray casting with AABB intersection
- **F key focus**: Frames camera on current selection
- **Auto-pivot**: Camera automatically pivots around active selection
- **Selection sync**: Hierarchy panel syncs with viewport selection

### ✅ Completed - Phase 6.4+: Centralized Property System Architecture

**Key Files Created/Modified:**
- `src/core/PropertyChangeHandler.ts` - **Centralized** handler for ALL entity property changes
- `src/core/interfaces/IPropertyEditable.ts` - Now **optional** interface for custom properties only
- `src/plugins/primitives/Cube.ts` - Removed IPropertyEditable (~50 lines), works automatically
- `src/core/CameraEntity.ts` - Removed IPropertyEditable (~100 lines), camera props via component handler
- `src/ui/panels/PropertiesPanel.ts` - Listens for `entity:propertyUpdated` for bidirectional sync

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    PropertyChangeHandler (CENTRALIZED)               │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Transform Props │  │  Camera Props   │  │ Material Props  │     │
│  │ (ALL entities)  │  │ (has camera?)   │  │ (has material?) │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            entity.transform.position[0] = value
            (Direct manipulation - no IPropertyEditable needed!)
```

**Data Flow:**
```
PropertiesPanel (edit value)
       ↓
EventBus: 'object:propertyChanged'
       ↓
PropertyChangeHandler.handlePropertyChange()
       ↓
PropertyChangeHandler manipulates entity data directly
  - Transforms: entity.transform.position/rotation/scale
  - Camera: entity.getComponent('camera').fieldOfView
  - Material: entity.getComponent('material').color
       ↓
EventBus: 'entity:propertyUpdated'
       ↓
PropertiesPanel refreshes (for external updates like gizmos)
       ↓
Render loop reads entity.transform → Changes visible!
```

**Benefits:**
- **Zero code in entities**: Cube, Sphere, imported meshes all work automatically
- **Component-based handlers**: Uses `hasComponent('camera')` to route to camera handler
- **~150 lines removed**: From Cube (~50) and CameraEntity (~100)
- **IPropertyEditable optional**: Only for entities with truly custom properties
- **Future-proof**: New primitives and importers automatically editable

**Also Fixed (Properties Panel UX):**
- Focus management: Clicking text fields immediately focuses them
- Cursor behavior: ew-resize cursor only during drag
- Smooth dragging: Values increment smoothly
- Scrolling: Properties panel is now scrollable
- Collapsed sections: State preserved across re-renders

### ✅ Completed - Phase 6.5+: Undo/Redo System & Keyboard Shortcuts

**Key Files Created:**
- `src/core/commands/ICommand.ts` - Command interface for undoable operations
- `src/core/commands/CommandHistory.ts` - Central undo/redo stack manager
- `src/core/commands/PropertyChangeCommand.ts` - Entity property change commands
- `src/core/commands/TextEditCommand.ts` - Shader editor text commands
- `src/core/commands/DeleteEntityCommand.ts` - Undoable entity deletion
- `src/core/commands/DuplicateEntityCommand.ts` - Undoable entity duplication
- `src/core/KeyboardShortcutManager.ts` - Global keyboard shortcut handler
- `src/ui/components/ContextMenu.ts` - Right-click context menu component
- `tests/unit/core/CommandHistory.test.ts` - 38 tests for CommandHistory

**Architecture - Command Pattern:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                        CommandHistory                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Undo Stack  │  │  Redo Stack  │  │   Command Coalescing     │  │
│  │   (100 max)  │  │              │  │   (300ms window)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
           ┌─────────────────────────────────────────┐
           │             ICommand                     │
           │  PropertyChangeCommand (transforms)      │
           │  DeleteEntityCommand (scene removal)     │
           │  DuplicateEntityCommand (clone + offset) │
           │  TextEditCommand (shader editor)         │
           └─────────────────────────────────────────┘
```

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo (alternative) |
| Delete | Delete selected mesh entities |
| Shift+D | Duplicate selected mesh entities |

**Context Menu (Right-click on mesh entities in Hierarchy):**
- Delete - Deletes entity with undo support
- Rename - Triggers inline rename in tree
- Duplicate - Creates offset clone with undo support

**Test Coverage:**
- 38 new CommandHistory tests
- 307 total tests passing

**MANDATORY RULE:** All future data-modifying features MUST integrate with CommandHistory for undo/redo support. See `.llms/GUIDELINES.md` Section 6 for details.

### ✅ Completed - v0.7.0: Major Refactoring (index.ts → Application Architecture)

**Goal:** Eliminate God Object anti-pattern in `index.ts` (was 455 lines, violated 300-line limit).

**Key Files Created:**
- `src/core/Application.ts` (~260 lines) - Core orchestration, module wiring, render loop
- `src/core/ShortcutRegistry.ts` (~160 lines) - Keyboard shortcuts (Delete, Shift+D), context menu handlers
- `src/plugins/tools/SelectionController.ts` (~230 lines) - Ray picking, viewport selection, F key framing
- `src/plugins/tools/index.ts` - Barrel export for tools

**New Architecture:**
```
src/index.ts (98 lines - Clean Entry Point)
       │
       └─► Application (orchestration)
               │
               ├─► SelectionController (ray picking, viewport selection)
               ├─► ShortcutRegistry (Delete, Shift+D, context menu handlers)
               └─► All other modules (EventBus, SceneGraph, etc.)
```

**Application Context Pattern:**
```typescript
// Application exposes context for subsystems
const ctx = app.getContext();
// ctx.eventBus, ctx.sceneGraph, ctx.selectionManager,
// ctx.commandHistory, ctx.primitiveRegistry, ctx.cameraEntity,
// ctx.orbitController, ctx.gl, ctx.canvas
```

**Benefits:**
- `index.ts` reduced from **455 → 98 lines** (78% reduction)
- Now compliant with 300-line file limit
- Clear separation of concerns
- Testable subsystems
- Ready for Phase 6.9 (Transform Gizmos) complexity

**Camera Behavior Fix (also in v0.7.0):**
- Camera no longer auto-moves when selecting objects
- Orbit pivot stays fixed until F key explicitly frames selection
- Matches standard 3D editor behavior (Maya, Blender)

### ✅ Completed - Phase 6.6+6.7: Directional Light + Forward Renderer

**Key Files Created:**
- `src/core/interfaces/ILightComponent.ts` - Light component interface (LightType, color, intensity, direction)
- `src/plugins/lights/DirectionalLight.ts` - Directional light entity implementing IEntity
- `src/plugins/lights/index.ts` - Barrel export for lights
- `src/core/LightManager.ts` - Collects active lights for shader uniforms
- `src/plugins/renderers/forward/ForwardRenderer.ts` - Forward renderer with embedded GLSL shaders
- `src/plugins/renderers/forward/index.ts` - Barrel export

**Key Files Modified:**
- `src/plugins/primitives/Cube.ts` - Added solid geometry (24 verts, 36 indices, per-face normals)
- `src/utils/math/transforms.ts` - Added vec3Normalize, mat4Inverse, mat3FromMat4, normalMatrix
- `src/core/Application.ts` - Integrated ForwardRenderer, LightManager, DirectionalLight
- `src/plugins/tools/SelectionController.ts` - Changed mat4Inverse to mat4InverseNullable

**Lighting Model (ForwardRenderer GLSL):**
- Lambertian diffuse (N·L clamped)
- Hemisphere ambient approximation (sky/ground interpolation)
- Rim lighting for edge definition
- Gamma correction (2.2)

**Test Coverage:** 307 tests passing

### ✅ Completed - v0.7.0: Mesh Rendering Architecture Refactor + Sphere Primitive

**Goal:** Eliminate duplication between primitives/importers by separating mesh data from GPU resources.

**Key Files Created:**
- `src/core/interfaces/IMeshData.ts` - Common mesh data interfaces (IMeshData, IEdgeData, IMeshProvider)
- `src/plugins/renderers/shared/MeshGPUCache.ts` - Centralized GPU resource management
- `src/plugins/primitives/Sphere.ts` - UV sphere primitive using IMeshProvider pattern

**Key Files Modified:**
- `src/plugins/primitives/Cube.ts` - Reduced from ~500 to ~300 lines, now implements IMeshProvider
- `src/plugins/renderers/forward/ForwardRenderer.ts` - Uses MeshGPUCache, polymorphic mesh rendering
- `src/core/Application.ts` - Registered SphereFactory, removed setupSceneObjectListener()
- `src/ui/components/TopMenuBar.ts` - Enabled Sphere in Create menu

**New Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                         IMeshProvider                                │
│     getMeshData(): IMeshData | null                                  │
│     getEdgeData?(): IEdgeData | null                                 │
└─────────────────────────────────────────────────────────────────────┘
           ▲                          ▲                    ▲
           │                          │                    │
     ┌─────┴─────┐           ┌────────┴────────┐   ┌──────┴──────┐
     │   Cube    │           │     Sphere      │   │ OBJImporter │
     │ (300 loc) │           │   (220 loc)     │   │  (future)   │
     └───────────┘           └─────────────────┘   └─────────────┘
           │                          │                    │
           └──────────────────────────┼────────────────────┘
                                      ▼
                        ┌─────────────────────────────┐
                        │       MeshGPUCache          │
                        │  - Lazy GPU resource init   │
                        │  - Caches VAO/VBO/EBO       │
                        │  - Handles disposal         │
                        └─────────────────────────────┘
```

**Sphere Features:**
- UV sphere with configurable segments (default 32) and rings (default 16)
- Proper normals for smooth shading
- UV coordinates for texture mapping
- Wireframe edge data for line rendering
- 52 comprehensive unit tests

**Test Coverage:** 393 tests passing (341 → 393, +52 new)

### ✅ Completed - v0.7.1: ICloneable Interface + Shared Menu Definitions

**Goal:** Fix entity duplication (only worked for Cubes) and sync Create menus between TopMenuBar and context menu.

**Key Files Created:**
- `src/core/interfaces/ICloneable.ts` - ICloneable interface with `clone()`, `isCloneable()`, `cloneEntityBase()` helper
- `src/ui/shared/CreateMenuDefinitions.ts` - Single source of truth for Create menu items
- `src/ui/shared/index.ts` - Barrel export for shared UI utilities

**Key Files Modified:**
- `src/plugins/primitives/Cube.ts` - Implements `ICloneable` with `clone()` method
- `src/plugins/primitives/Sphere.ts` - Implements `ICloneable` with `clone()` method (preserves segments, rings, radius)
- `src/plugins/lights/DirectionalLight.ts` - Implements `ICloneable` with `clone()` method
- `src/core/commands/DuplicateEntityCommand.ts` - Uses `isCloneable()` and polymorphic `clone()`, removed `primitiveRegistry` dependency
- `src/core/ShortcutRegistry.ts` - Uses `isCloneable()` check, removed `primitiveRegistry` from options
- `src/ui/components/TopMenuBar.ts` - Uses shared `buildTopMenuBarCreateItems()`
- `src/ui/panels/HierarchyPanel.ts` - Uses shared `buildContextMenuCreateItems()`
- `src/index.ts` - Removed `primitiveRegistry` from shortcut options

**New Architecture - Polymorphic Cloning:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                        ICloneable Interface                          │
│                         clone(): IEntity                             │
└─────────────────────────────────────────────────────────────────────┘
           ▲                    ▲                       ▲
           │                    │                       │
     ┌─────┴─────┐       ┌──────┴──────┐       ┌───────┴────────┐
     │   Cube    │       │   Sphere    │       │ DirectionalLight│
     │  clone()  │       │   clone()   │       │     clone()     │
     └───────────┘       └─────────────┘       └────────────────┘
           │                    │                       │
           └────────────────────┼───────────────────────┘
                                ▼
                  DuplicateEntityCommand.execute()
                    └─► entity.clone() (polymorphic)
```

**Shared Menu Architecture:**
```
CreateMenuDefinitions.ts (Single Source of Truth)
     ├── PRIMITIVE_ITEMS: [{label, enabled}, ...]
     ├── LIGHT_ITEMS: [{label, enabled}, ...]
     ├── buildTopMenuBarCreateItems() → TopMenuBar
     └── buildContextMenuCreateItems() → HierarchyPanel context menu
```

**Adding New Cloneable Entity (Future OBJ/GLTF):**
```typescript
export class ImportedMesh implements IEntity, ICloneable {
  clone(): ImportedMesh {
    const cloned = new ImportedMesh(this.meshData, this.name);
    cloneEntityBase(this, cloned);  // Helper copies transform + material
    return cloned;
  }
}
```

**Test Coverage:** 393 tests passing (no new tests, existing tests pass)

### 📋 Remaining Steps (Phase 6.8-6.14: Functional Editor Continued)

**See detailed plan:** [PHASE_6_PLAN.md](./PHASE_6_PLAN.md)

**Summary (14 sub-phases, ~60-80 hours):**
1. **Fix Rendering Pipeline** - Make instantiated objects render
2. **Camera as Scene Entity** - Composition pattern with RenderCameraAdapter
3. **Input System & Navigation** - Maya-style Alt+drag controls
4. **Selection System** - Click to select, ray picking
5. **Directional Light** - Editable light with enable/disable toggle
6. **Forward Renderer** - Solid mesh rendering with lighting
7. **PBR Uber Shader** - Cook-Torrance BRDF (Blender-style)
8. **Transform Gizmos** - Translate/Rotate/Scale handles (W/E/R)
9. **Live Shader Editor** - ShaderToy-style with debounced compilation
10. **Render Mode Dropdown** - Shaded/Wireframe/Both/Raytraced(grayed)
11. **Undo/Redo System** - Command pattern (moved from backlog)
12. **Viewport Grid** - XZ plane grid with toggle button
13. **Settings Window** - Two-panel modal, Grid settings (from backlog)
14. **Hierarchy Context Menu** - Delete, Duplicate, Rename

### 📝 Future Enhancements (Backlog)

1. **Color Themes**
   - Allow users to switch between different UI color themes
   - Theme switching in `theme.css`
   - Part of Settings System (Phase 6.13 provides foundation)

2. **Hotkeys Configuration**
   - Customizable keyboard shortcuts
   - Part of Settings System (Phase 6.13 provides foundation)

---

## Tech Stack (Planned)

| Category | Technology | Notes |
|----------|------------|-------|
| Renderer | WebGL2 (native) | No heavy abstractions |
| UI Library | TBD | See LIBRARIES.md for evaluation |
| Build Tool | TBD | Vite or similar |
| Language | TypeScript | Type safety for large codebase |
| Testing | TBD | See TESTING.md |
| Package Manager | npm/pnpm | TBD |

---

## Directory Structure (Planned)

```
ready-set-render/
├── .llms/                    # AI context and guidelines
│   ├── PROJECT_CONTEXT.md    # This file
│   ├── ARCHITECTURE.md       # System design
│   ├── PATTERNS.md           # Code conventions
│   ├── GUIDELINES.md         # Development rules
│   ├── LIBRARIES.md          # Dependency tracking
│   ├── WORKFLOWS.md          # Automation triggers
│   └── TESTING.md            # Test requirements
├── src/
│   ├── core/                 # Core engine (renderer, scene graph)
│   ├── plugins/              # Plugin modules
│   ├── ui/                   # UI components
│   ├── utils/                # Shared utilities
│   └── index.ts              # Entry point
├── tests/                    # Test suites
├── docs/                     # Documentation
├── assets/                   # Static assets
├── CHANGELOG.md              # Version history
└── README.md                 # Project readme
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design details
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
- [WORKFLOWS.md](./WORKFLOWS.md) - Workflow automation
- [TESTING.md](./TESTING.md) - Testing guidelines
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed 7-phase implementation plan
- [../CHANGELOG.md](../CHANGELOG.md) - Version history
