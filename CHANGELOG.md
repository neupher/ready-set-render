# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.6] - 2026-01-23

### Changed

- **PropertyChangeHandler** - Refactored to centralized architecture
  - Now handles ALL transform properties (position, rotation, scale) centrally for ANY entity
  - Uses component-based handlers: checks `hasComponent('camera')` or `hasComponent('material')`
  - Entities no longer need to implement `IPropertyEditable` for standard properties
  - New primitives and imported meshes automatically editable without code changes

- **Cube** - Removed `IPropertyEditable` implementation (~50 lines)
  - Transform editing now handled automatically by PropertyChangeHandler
  - Zero boilerplate needed for standard property editing

- **CameraEntity** - Removed `IPropertyEditable` implementation (~100 lines)
  - Camera component properties handled via PropertyChangeHandler's component handlers
  - Simplified from 300+ lines to ~200 lines

- **IPropertyEditable** - Now optional for custom properties only
  - Updated documentation clarifying when to use (rarely!)
  - Standard entities (Cube, Sphere, imported meshes) don't need it

### Technical Details

- **Architecture**: PropertyChangeHandler is now single source of truth
- **Data flow**: `PropertiesPanel → EventBus → PropertyChangeHandler → entity.transform/components → EventBus → PropertiesPanel refresh`
- **Benefits**: ~150 lines removed from entities, new primitives work automatically

---

## [0.6.5] - 2026-01-23

### Added

- **Property Change Handler** (`src/core/PropertyChangeHandler.ts`)
  - Centralized handler that routes property change events to entities
  - Bridges UI (PropertiesPanel) to entity data
  - Emits `entity:propertyUpdated` events for bidirectional sync
  - Supports future gizmos and scripting systems

- **IPropertyEditable Interface** (`src/core/interfaces/IPropertyEditable.ts`)
  - Interface for entities supporting property editing
  - `setProperty(path, value)` and `getProperty(path)` methods
  - `isPropertyEditable()` type guard for runtime checking

- **Bidirectional Data Binding**
  - PropertiesPanel listens for `entity:propertyUpdated` events
  - Future transform gizmos can emit `object:propertyChanged` and UI will refresh automatically

### Changed

- **Cube** now implements `IPropertyEditable` for live transform editing
- **CameraEntity** now implements `IPropertyEditable` for camera property editing (FOV, near/far clip)
- **PropertiesPanel** refactored for bidirectional sync architecture
- **DraggableNumberInput** completely rewritten:
  - Removed drag zone overlay that was blocking input focus
  - Drag now triggered by middle-mouse or Alt+left-click
  - Regular left-click immediately focuses for text editing
  - Cursor only changes to `ew-resize` during actual drag operation

### Fixed

- **Properties Panel Focus** - Clicking text fields now immediately focuses them (no more multiple clicks required)
- **Cursor Behavior** - Horizontal resize cursor only appears when dragging starts
- **Smooth Dragging** - Values increment smoothly based on delta from start position
- **Properties Panel Scrolling** - Panel content is now scrollable when items overflow
- **Collapsed Sections** - Section open/closed state persists across re-renders

---

## [0.6.4] - 2026-01-23

### Added

- **Phase 6.2: Camera as Scene Entity** (Commit: `21f038ab`)
  - `ICameraComponent` interface with Unity terminology (fieldOfView, nearClipPlane, farClipPlane, clearFlags, backgroundColor)
  - `CameraEntity` class implementing IEntity using composition pattern (not inheritance)
  - `RenderCameraAdapter` bridging CameraEntity to ICamera interface for render pipelines
  - Camera appears in Hierarchy panel with movie camera icon
  - Camera properties editable in Inspector (FOV, clip planes, clear flags, background color)

- **Phase 6.3: Input System & Scene Navigation** (Commit: `40caac34`)
  - `InputManager` for centralized mouse/keyboard event tracking
  - `OrbitController` for Maya-style camera navigation
  - Navigation controls: Alt+LMB=orbit, Alt+MMB=pan, Alt+RMB=dolly, Scroll=zoom
  - F key to frame selection
  - Custom SVG cursor icons for orbit, pan, and zoom modes

- **Phase 6.4: Selection System** (Commit: `fc54a5fe`)
  - `SelectionManager` for selection state management
  - Ray casting utilities (`src/utils/math/ray.ts`) with AABB intersection
  - Click to select objects in viewport
  - Ctrl+Click to toggle selection
  - F key frames camera on current selection
  - Auto-pivot: Camera automatically pivots around active selection
  - Selection syncs with Hierarchy panel

### Changed

- **Camera icon** updated to movie camera style in TreeView
- **OrbitController** now accepts canvas parameter for cursor management
- **Pan sensitivity** tuned to 0.002 for Maya-like feel
- **Dolly direction** inverted so mouse right = zoom in (Maya standard)
- **Pan direction** matches Maya (inverted horizontal, corrected vertical)

### Fixed

- Pan movement now constrained to camera's local XY plane (perpendicular to look direction)
- Forward direction remains constant when panning

---

## [0.6.0] - 2026-01-22

### Added

- **Phase 6 Implementation Plan** (`.llms/PHASE_6_PLAN.md` - NEW)
  - Comprehensive 14 sub-phase plan for Functional Editor
  - Camera architecture clarification: Composition pattern with RenderCameraAdapter (not inheritance)
  - Moved Undo/Redo and Settings from backlog into Phase 6
  - Added Grid, Settings Window, Context Menu phases
  - ~60-80 hours estimated effort

- **IInitializable Interface** (`src/core/interfaces/ISceneObject.ts`)
  - Interface for objects requiring GPU resource initialization
  - `initializeGPUResources()`, `isInitialized()`, `dispose()` methods
  - `isInitializable()` type guard function

- **Industry-Standard Terminology Guidelines** (`.llms/GUIDELINES.md`)
  - New mandatory section requiring Unity terminology for editor/engine concepts
  - Comprehensive terminology reference tables (Scene Graph, Components, Transform, Lighting, etc.)
  - GLSL shader terminology guide (uniform, sampler2D, vec3/mat4, etc.)
  - "When In Doubt" guidance pointing to Unity docs, GLSL spec, Khronos wiki

- **Terminology Quick Reference** (`.llms/PATTERNS.md`)
  - Quick lookup tables for industry-standard naming
  - Core Concepts, Rendering, Shaders (GLSL), UI Panel Names sections

### Fixed

- **Critical Render Bug** (Phase 6.1)
  - Objects created via Create menu now render immediately
  - Added `scene:objectAdded` event listener to initialize GPU resources
  - `Cube.isInitialized()` method to check GPU resource state
  - Root cause: `Cube.initializeGPUResources()` was never called after instantiation

### Changed

- **PROJECT_CONTEXT.md**
  - Updated Next Steps to reference PHASE_6_PLAN.md
  - Moved Undo/Redo System from backlog to Phase 6.11
  - Moved Settings System from backlog to Phase 6.13
  - Simplified backlog to Color Themes and Hotkeys Configuration

---

## [0.5.1] - 2026-01-22

### Added

- **About Dialog** (`src/ui/components/AboutDialog.ts`)
  - Modal dialog showing project info, version, author (Tapani Heikkinen), and MIT license link
  - Accessible via Help → About menu
  - Closes on Escape key, overlay click, or Close button

- **Double-Click Rename in Hierarchy**
  - Double-click on entity names to rename inline
  - Two-way binding with Properties panel Name field
  - Enter to save, Escape to cancel

- **Future Enhancements Backlog** (`.llms/PROJECT_CONTEXT.md`)
  - Settings System: Color themes, hotkeys, localStorage persistence
  - Undo/Redo System: Command pattern, history stack, keyboard shortcuts

### Changed

- **Menu Items** (`src/ui/components/TopMenuBar.ts`)
  - Grayed out unimplemented items in File menu (New, Open, Import, Export, Save, Save As)
  - Grayed out all Rendering menu items (Render, Settings, Output)
  - Removed Exit button from File menu

- **Selection Highlight** (`src/ui/theme/theme.css`)
  - Selected items now have blueish tint (`rgba(59, 130, 246, 0.25)`)
  - Distinct from gray hover highlight

- **Scene Entity Properties** (`src/ui/panels/PropertiesPanel.ts`)
  - Root "Scene" entity now only shows Object section (no Transform, Mesh, Material)

- **Shader Editor Placeholder** (`src/ui/panels/PropertiesPanel.ts`)
  - Changed from GLSL template to "Select Mesh Object to Display Shader Code"

- **Documentation Link**
  - Help → Documentation now opens GitHub README

### Fixed

- **Hierarchy Click Response** (`src/ui/components/TreeView.ts`)
  - Removed 200ms delay that caused sluggish clicks
  - Selection now updates CSS classes directly instead of full re-render
  - Double-click rename works reliably

---

## [0.5.0] - 2026-01-22

### Added

- **Phase 5: Scene Instantiation System**
  - Complete system for creating primitives via Create menu and displaying entity components

- **Nested Submenu Support** (`src/ui/components/TopMenuBar.ts`)
  - Extended `MenuItem` interface with `children` property for nested menus
  - Added "Create" menu with "Primitives" submenu containing "Cube"
  - Hover-triggered flyout menus with proper positioning
  - CSS styles for submenu rendering

- **PrimitiveRegistry Plugin** (`src/plugins/primitives/`)
  - `IPrimitiveFactory` interface for factory pattern
  - `PrimitiveRegistry` class with register/unregister/create methods
  - Auto-generated unique names (e.g., "Cube.001", "Cube.002")
  - Open/Closed principle - new primitives registered without modifying existing code

- **Entity Component System** (`src/core/interfaces/`)
  - `IComponent`: Base interface for all components
  - `IEntity`: Extends ISceneObject with component support and entityId
  - `IMeshComponent`: Vertex count, edge count, triangle count
  - `IMaterialComponent`: Shader name, color, opacity
  - `isEntity()` type guard function

- **EntityIdGenerator Utility** (`src/utils/EntityIdGenerator.ts`)
  - Static class for auto-incrementing entity IDs
  - `next()`, `current()`, `reset()` methods

- **Barrel Exports**
  - `src/utils/index.ts` - Utils entry point
  - Updated `src/plugins/primitives/index.ts` with new exports
  - Updated `src/core/interfaces/index.ts` with ECS interfaces

### Changed

- **Cube Primitive** (`src/plugins/primitives/Cube.ts`)
  - Now implements both `IRenderable` and `IEntity` interfaces
  - Added `entityId` using EntityIdGenerator
  - Added mesh component (8 vertices, 12 edges, 12 triangles)
  - Added material component (LineShader, white color)
  - Added `CubeFactory` implementing `IPrimitiveFactory`

- **PropertiesPanel** (`src/ui/panels/PropertiesPanel.ts`)
  - Enhanced to display Entity ID for entities
  - Shows Mesh component section (Vertices, Edges, Triangles)
  - Shows Material component section (Shader, Color picker, Opacity)
  - Uses `isEntity()` type guard for dynamic component display

- **EditorLayout** (`src/ui/panels/EditorLayout.ts`)
  - Now receives `PrimitiveRegistry` via dependency injection
  - Handles "Create → Primitives/Cube" menu clicks
  - Creates primitives at world origin (0,0,0)
  - Auto-selects newly created objects

- **Application Entry** (`src/index.ts`)
  - Scene starts empty by default (removed hardcoded cube)
  - Initializes PrimitiveRegistry with CubeFactory
  - Passes primitiveRegistry to EditorLayout

- **Theme** (`src/ui/theme/theme.css`)
  - Added submenu styles for nested dropdown menus

---

## [0.4.0] - 2026-01-22

### Added

- **Phase 4: Build UI Layer**
  - Complete UI system with vanilla TypeScript (no React)
  - Figma-inspired dark theme matching professional 3D editor aesthetic

- **Theme System** (`src/ui/theme/theme.css`)
  - CSS custom properties (design tokens) for colors, spacing, typography
  - Complete styling for all UI components, panels, inputs, tree views
  - Dark theme matching Figma reference designs

- **UI Components** (`src/ui/components/`)
  - `CollapsibleSection.ts`: Expandable sections with chevron animations
  - `DraggableNumberInput.ts`: Drag-to-adjust number inputs with:
    - Left-click drag on drag zone (left 50%)
    - Middle-mouse drag anywhere on input
    - Alt+left-click drag anywhere
  - `TreeView.ts`: Hierarchical tree view with expand/collapse and typed icons
  - `ResizablePanel.ts`: Drag-to-resize panels with min/max constraints
  - `TopMenuBar.ts`: Dropdown menu bar component

- **UI Panels** (`src/ui/panels/`)
  - `HierarchyPanel.ts`: Scene tree panel using TreeView component
  - `ViewportPanel.ts`: WebGL canvas container with ResizeObserver
  - `PropertiesPanel.ts`: Tabbed properties panel (Details + Shader Editor)
  - `EditorLayout.ts`: Main layout assembler with dependency injection

- **Core Enhancements**
  - `Camera.ts`: ICamera implementation with lazy matrix computation
  - `SceneGraph.ts`: Added `getRenderables()` method implementing IScene interface

- **Barrel Exports**
  - `src/ui/index.ts` - Main UI entry point
  - `src/ui/components/index.ts` - Component exports
  - `src/ui/panels/index.ts` - Panel exports

- **Unit Tests**
  - `CollapsibleSection.test.ts`: 17 tests
  - `DraggableNumberInput.test.ts`: 20 tests
  - `TreeView.test.ts`: 24 tests
  - Total: 267 tests passing (61 new UI tests)

### Changed

- Updated `src/index.ts` to use Camera class instead of raw matrices
- `SceneGraph` now implements `IScene` interface

---

## [0.3.0] - 2026-01-22

### Added

- **Phase 3: Migrate Renderer**
  - Complete renderer migration with LineRenderer plugin, Cube primitive, and transform utilities

- **Transform Utilities** (`src/utils/math/transforms.ts`)
  - Matrix math functions: `mat4Identity`, `mat4Perspective`, `mat4LookAt`, `mat4Multiply`
  - Transform matrices: `mat4Translation`, `mat4Scale`, `mat4RotationX/Y/Z`
  - Angle conversion: `degToRad`, `radToDeg`
  - Type definitions: `Mat4`, `Vec3`
  - 40+ unit tests

- **Cube Primitive** (`src/plugins/primitives/Cube.ts`)
  - Implements `IRenderable` interface
  - 8 vertices, 12 edges for wireframe rendering
  - GPU resource management (VAO, VBO)
  - Model matrix computation from transform (T × Rz × Ry × Rx × S)
  - 30+ unit tests

- **LineRenderer Plugin** (`src/plugins/renderers/line/LineRenderer.ts`)
  - Implements `IRenderPipeline` interface as forward renderer
  - Embedded GLSL shaders (WebGL2/ES 300)
  - Polymorphic rendering - calls `render()` on each `IRenderable`
  - Line color customization via `setLineColor()`
  - 25+ unit tests

- **Plugin Barrel Exports**
  - `src/plugins/index.ts` - Main plugins export
  - `src/plugins/renderers/index.ts` - Renderer plugins
  - `src/plugins/primitives/index.ts` - Primitive types
  - `src/utils/math/index.ts` - Math utilities

### Changed

- Updated `tests/helpers/webgl-mock.ts` with `uniform3fv` method

---

## [0.2.0] - 2026-01-22

### Added

- **Phase 2: Core Engine Implementation**
  - Complete core engine with 5 modules and 98 unit tests

- **Core Interfaces** (`src/core/interfaces/`)
  - `IPlugin.ts`: Plugin and context interfaces for extensibility
  - `ISceneObject.ts`: Scene object, transform, and renderable interfaces
  - `IRenderPipeline.ts`: Hot-swappable render pipeline interface
  - `IImporter.ts`: File importer plugin interface
  - Barrel exports via `index.ts`

- **EventBus** (`src/core/EventBus.ts`)
  - Pub/sub event system for loose coupling between modules
  - Methods: `on()`, `once()`, `emit()`, `off()`, `clear()`
  - Returns unsubscribe functions for easy cleanup
  - 17 unit tests

- **WebGLContext** (`src/core/WebGLContext.ts`)
  - WebGL2 context management and state tracking
  - Shader compilation with detailed error handling
  - Program linking with `ShaderCompilationError` and `ProgramLinkError`
  - State caching to avoid redundant GL calls
  - 20 unit tests

- **SceneGraph** (`src/core/SceneGraph.ts`)
  - Hierarchical scene structure with `SceneObject` class
  - Add, remove, find, reparent operations
  - Depth-first traversal with early termination support
  - Event emission for all scene modifications
  - Circular reference prevention
  - 32 unit tests

- **PluginManager** (`src/core/PluginManager.ts`)
  - Plugin lifecycle management (register, initialize, dispose)
  - Dependency injection via `IPluginContext`
  - Topological sorting for initialization order
  - Circular dependency detection with `CircularDependencyError`
  - `PluginDependencyError` for missing dependencies
  - 29 unit tests

- **Test Infrastructure**
  - `tests/helpers/webgl-mock.ts`: Mock WebGL2 context utilities
  - `tests/unit/core/`: Unit tests for all core modules
  - Updated `tsconfig.json` to include tests directory

### Changed

- Updated `tsconfig.json` to include `tests` in compilation

---

## [0.1.1] - 2026-01-22

### Changed

- **Project Renaming**: Updated all references to use consistent `ready-set-render` naming
  - `package.json`: Changed name from `webgl-editor` to `ready-set-render`
  - `vite.config.ts`: Updated production base path from `/web-editor-example/` to `/ready-set-render/`
  - `README.md`: Updated directory structure and GitHub Pages URL references
  - `CHANGELOG.md`: Updated base path reference
  - `.llms/PROJECT_CONTEXT.md`: Updated directory structure reference
  - `.llms/IMPLEMENTATION_PLAN.md`: Updated project name reference

- **Bundle Size Budget Increase**: Increased from 100KB to 250KB
  - Rationale: Avoid making poor architectural decisions due to overly tight constraints
  - Updated `.llms/LIBRARIES.md` with new budget breakdown (Core: 100KB, UI: 75KB, Utils: 75KB)
  - Updated `.llms/IMPLEMENTATION_PLAN.md` references
  - Updated `README.md` budget table
  - Decision to use Vanilla TypeScript + Web Components remains unchanged

- **Refined Plugin Architecture Requirements**
  - Updated `.llms/GUIDELINES.md`: UI components are now explicitly excluded from plugin requirements
  - Plugins required for: render pipelines, importers, exporters, primitives, post-processing, scene operations
  - NOT plugins: UI panels, UI components, layout system, core systems
  - Rationale: Learning goals focus on WebGL2 rendering; UI is infrastructure, not a learning goal

- **Phase 4 UI Architecture Rewrite**
  - Updated `.llms/IMPLEMENTATION_PLAN.md` with non-plugin UI approach
  - Added: HierarchyPanel, PropertiesPanel, ViewportPanel implementations with constructor injection
  - Added: EditorLayout class for dependency injection
  - Added: Clear `src/ui/` directory structure (components, panels, layout, theme)
  - Key principle: Panels receive dependencies via constructor, not plugin context

---

## [0.1.0] - 2026-01-21

### Added
- **Foundation Setup**: Complete project structure and build infrastructure
  - Directory structure following `.llms/ARCHITECTURE.md` specification
  - TypeScript configuration with strict mode and path aliases
  - Vite build system with development server
  - Vitest testing framework with coverage configuration
  - GitHub Actions workflow for automated deployment to GitHub Pages
  - Monaco Editor dependency for shader editing (15KB)
- **Configuration Files**:
  - `package.json` with all dependencies and scripts
  - `tsconfig.json` with path aliases (`@core/*`, `@plugins/*`, `@utils/*`, `@ui/*`)
  - `vite.config.ts` with production build optimization
  - `vitest.config.ts` with 85% coverage thresholds
  - `.gitignore` for Node.js, build outputs, and IDE files
- **Entry Point**:
  - `index.html` with loading screen and app container
  - `src/index.ts` with WebGL2 detection and error handling
  - Basic placeholder UI showing initialization status
- **Development Infrastructure**:
  - Test setup file with jsdom environment
  - GitHub Actions workflow for CI/CD
  - Path alias resolution for clean imports
  - Source maps for debugging
- **Documentation**:
  - Updated `README.md` with quick start guide
  - Bundle size budget tracking (90KB target)
  - Tech stack documentation
  - Development commands reference

### Changed
- Updated `README.md` from planning document to active project documentation
- Removed Meta-specific references from `.llms/` files for public repository

### Technical Details
- **Bundle Size Budget**: 200KB target (50KB under 250KB limit)
  - Core Engine: 20KB
  - Renderer: 10KB
  - UI System: 35KB
  - Monaco Editor: 15KB
  - Utils: 10KB
- **Dependencies**: 266 packages installed (primarily dev dependencies)
- **Test Coverage**: Configured for >85% coverage on lines, functions, statements
- **Browser Targets**: ES2020, WebGL2-capable browsers

### Development Notes
- Foundation is complete and ready for Phase 2 (Core Engine implementation)
- All configuration files validated with no errors
- Dev server configured on port 3000 with auto-open
- Production build targets GitHub Pages with base path `/ready-set-render/`

---

## [Unreleased]

### Planned
- **Phase 2**: Core engine implementation (EventBus, PluginManager, WebGLContext, SceneGraph)
- **Phase 3**: Renderer migration from ready-set-render
- **Phase 4**: UI layer with collapsible panels
- **Phase 5**: Test infrastructure with WebGL mocks
- **Phase 6**: GitHub Pages deployment testing
- **Phase 7**: Documentation updates

---

[Unreleased]: https://github.com/user/repo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/repo/releases/tag/v0.1.0
