# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
