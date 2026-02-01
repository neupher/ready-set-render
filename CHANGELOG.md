# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.12.2] - 2026-02-01

### Added

- **Remote dev server support** - Dev server now works with code-server proxy
  - Added `npm run dev:remote` script for running on remote servers
  - Configured HMR (Hot Module Replacement) for WSS protocol on port 443
  - Added `host: true` to bind server to all network interfaces
  - Added preview server configuration for consistency

### Fixed

- **Removed invalid `compress` option** from vite-plugin-glsl configuration

---

## [0.12.1] - 2026-02-01

### Fixed

- **GitHub Pages deployment 404 errors** - Production builds now correctly use `/ready-set-render/` base path
  - Changed `vite.config.ts` to use Vite's `command` parameter instead of `process.env.NODE_ENV`
  - `command === 'build'` is reliably set by Vite during `vite build`, unlike environment variables

---

## [0.12.0] - 2026-01-30

### Changed

- **Scene Launcher HTML Export redesigned for reliability**
  - Replaced auto-popup approach with user-click-triggered flow
  - New "Open in Editor" button eliminates popup blocker issues (100% reliable)
  - Simplified launcher UI: prominent button, scene name, status text
  - Removed retry loop logic (~55 lines of code removed)
  - Captures `event.source` from postMessage for reliable window reference
  - Auto-close delay increased to 1.5s for better user feedback

### Removed

- Auto-open popup behavior in scene launcher (caused popup blocker issues)
- Retry loop logic (`retrySceneSend`, `MAX_RETRIES`, `RETRY_INTERVAL`)
- Fallback link section and error div UI elements
- Spinner animation (replaced with status text)

---

## [0.11.6] - 2026-01-30

### Added

- **Export as HTML** - Shareable scene launcher files
  - `SceneLauncherExporter` utility class generates self-contained HTML files
  - Embedded scene JSON data in HTML for maximum portability
  - `postMessage` API for secure cross-window communication with deployed editor
  - Styled loading page with spinner, error handling, and fallback options
  - File menu option: File → Export as HTML
  - Double-click exported `.html` file → Opens browser → Loads scene in deployed editor

- **Scene Launcher Listener** in Application.ts
  - Listens for `postMessage` from launcher HTML files
  - Automatically loads scene when receiving launcher data
  - Signals `editorReady` when opened with `?launcher=1` URL parameter

### Fixed

- **Scene name now updates in hierarchy panel when opening a scene**
  - Fixed race condition where `currentScene` was set after entity loading
  - Entity additions triggered state change events with old scene name
  - Moved `currentScene` assignment before `loadIntoSceneGraph()` call

- **Initial scene state now emits on SceneController construction**
  - UI components receive initial `scene:stateChanged` event at startup
  - Scene name displays correctly from the start

---

## [0.11.5] - 2026-01-30

### Added

- **Phase D.8: File Menu Integration**
  - `SceneController` class for scene file operations (New/Open/Save/Save As)
  - File System Access API integration for `.scene` file persistence
  - Automatic dirty state tracking via EventBus events
  - `ConfirmDialog` component for unsaved changes warnings
  - `showConfirmDialog()` helper function returning a Promise

- **Keyboard Shortcuts**
  - `Ctrl+N` - New Scene
  - `Ctrl+O` - Open Scene
  - `Ctrl+S` - Save Scene
  - `Ctrl+Shift+S` - Save Scene As

- **Hierarchy Panel Improvements**
  - Scene name displayed as "Scene (name.scene)" format
  - Dirty indicator (● ball) shown before "Scene" when unsaved changes exist
  - Scene root node is now unselectable (no gizmo shown when clicking)

### Changed

- Default scene name changed from "Untitled Scene" to "untitled" (displays as `untitled.scene`)
- File menu items (New, Open, Save, Save As) now enabled
- `TreeNode` interface extended with optional `selectable` property

---

## [0.11.4] - 2026-01-30

### Added

- **Asset System Phase D: Scene Serialization**
  - `ISceneAsset` interface for scene assets with entities and settings
  - `ISerializedEntity` interface for entity serialization
  - `ISerializedTransform` interface for transform data
  - `ISerializedComponent` interfaces for mesh, material, light, camera components
  - `ISceneSettings` interface for scene-level settings
  - Type guards: `isSceneAsset()`, `isSerializedEntity()`
  - Helper: `createDefaultSceneSettings()`

- **Entity Serialization**
  - `ISerializable<ISerializedEntity>` implementation for all entity types:
    - `Cube` - toJSON/fromJSON with transform, material, render mode
    - `Sphere` - toJSON/fromJSON with transform, material, geometry params (segments, rings, radius)
    - `DirectionalLight` - toJSON/fromJSON with transform, light color, intensity, enabled
    - `CameraEntity` - toJSON/fromJSON with transform, FOV, clip planes, target

- **EntitySerializer**
  - Factory-based entity deserialization with type registry
  - `serializeEntity()` / `deserializeEntity()` - single entity operations
  - `serializeEntities()` / `deserializeEntities()` - batch operations with hierarchy reconstruction
  - `registerEntityFactory()` - extensibility for new entity types
  - `isTypeSupported()` / `getSupportedTypes()` - type introspection

- **SceneAssetFactory**
  - `create()` - Create new empty scene assets
  - `createFromSceneGraph()` - Serialize current SceneGraph state
  - `loadIntoSceneGraph()` - Deserialize scene into SceneGraph
  - `duplicate()` - Copy scene with new UUIDs
  - `fromJSON()` / `toJSON()` - JSON serialization
  - `updateMetadata()` / `updateEntities()` - Scene sync operations

### Notes

- File menu integration (New/Open/Save/Save As) pending for next version
- Unit tests for serialization pending for next version

---

## [0.11.3] - 2026-01-30

### Added

- **Asset System Phase C: Material Assets**
  - `IMaterialAsset` interface for material assets with shader reference and parameters
  - Materials reference shaders by UUID (not embedded copies)
  - Parameters stored as `Record<string, unknown>` keyed by uniform name
  - Support for `isBuiltIn` flag for read-only materials
  - Type guard: `isMaterialAsset()`

- **MaterialAssetFactory**
  - `create()` - Create new materials with optional shader default values
  - `duplicate()` - Copy any material (duplicates are always editable)
  - `fromJSON()` / `toJSON()` - Serialization support for persistence
  - `getDefaultParameters()` - Extract defaults from shader uniform declarations
  - `syncParametersWithShader()` - Sync material parameters when shader changes
  - Deep copying of parameter values to prevent mutation

- **Built-in Materials**
  - **Default PBR Material** - Neutral gray material using PBR shader
    - UUID: `built-in-material-default-pbr`
    - References built-in PBR shader
    - Default values: Base Color (gray), Metallic (0), Roughness (0.5), no emission
    - Marked as `isBuiltIn: true` (read-only, duplicatable)

- **IMaterialComponent Enhancement**
  - Added optional `materialAssetRef?: IAssetReference` field
  - Enables asset-based material binding to entities
  - Inline properties remain as fallback for backward compatibility

### Tests

- 89 new tests (824 total)
  - `IMaterialAsset.test.ts` - 21 tests (type guards)
  - `MaterialAssetFactory.test.ts` - 47 tests (create, duplicate, serialization, sync)
  - `BuiltInMaterials.test.ts` - 21 tests (Default PBR, utilities)

---

## [0.11.2] - 2026-01-28

### Changed

- **Grid Settings Overhaul**
  - Expanded `GridSettings` interface with new properties:
    - `lineColor` - Single line color (replaces `majorLineColor`/`minorLineColor`)
    - `axisLineColor` - Separate color for axis indicator lines
    - `lineWidth` - Grid line width in pixels
    - `axisLineWidth` - Axis line width in pixels
    - `fadeStartDistance` - Distance at which grid starts to fade
    - `fadeEndDistance` - Distance at which grid fully fades out
  - Updated default values:
    - Grid size: 1 → 10 units
    - Opacity: 0.8 → 1.0
  - Added full UI controls in Settings window for all new properties

### Fixed

- Grid Settings Panel now includes controls for Line Width, Axis Line Width, Fade Start/End Distance

---

## [0.11.1] - 2026-01-28

### Added

- **Asset System Phase B: Shader Assets**
  - `IShaderAsset` interface for shader program assets
  - `IUniformDeclaration` interface with UI metadata for auto-generated material editors
  - Support for uniform types: `float`, `vec2`, `vec3`, `vec4`, `int`, `bool`, `sampler2D`, `mat3`, `mat4`
  - UI control types: `slider`, `color`, `number`, `checkbox`, `texture`
  - Uniform grouping support for organized material inspector panels

- **ShaderAssetFactory**
  - `create()` - Create new shaders from unlit template
  - `duplicate()` - Copy any shader (including built-ins) to create editable version
  - `fromJSON()` / `toJSON()` - Serialization support for persistence
  - Deep copying of uniform declarations to prevent mutation

- **Built-in Shaders**
  - **PBR Shader** - Cook-Torrance BRDF with metallic/roughness workflow
    - GGX normal distribution, Smith geometry, Fresnel-Schlick
    - Multi-light support (up to 8 directional lights)
    - ACES tone mapping, hemisphere ambient
    - Uniforms: Base Color, Metallic, Roughness, Emission, Emission Strength
  - **Unlit Shader** - Simple solid color output
    - Uniforms: Color, Opacity
  - Both shaders marked as `isBuiltIn: true` (read-only, duplicatable)

- **ShaderCompilationService**
  - `compile()` - Full shader compilation returning WebGL program
  - `validate()` - Validation-only mode (cleans up after)
  - `compileFromSources()` - Compile from raw GLSL strings
  - `getUniformLocations()` - Get all uniform locations for a shader
  - Error parsing with line numbers and source snippets
  - Supports vertex, fragment, and link error types

- **UUID Utilities**
  - `generateUUID()` - UUID v4 generation (uses native crypto.randomUUID when available)
  - `isValidUUID()` - UUID format validation

### Tests

- 143 new tests (735 total)
  - `IShaderAsset.test.ts` - 28 tests (type guards)
  - `ShaderAssetFactory.test.ts` - 39 tests (create, duplicate, serialization)
  - `BuiltInShaders.test.ts` - 33 tests (PBR, Unlit, utilities)
  - `ShaderCompilationService.test.ts` - 28 tests (compilation, validation, error parsing)
  - `uuid.test.ts` - 15 tests (generation, validation)

---

## [0.11.0] - 2026-01-28

### Added

- **Asset System Foundation (Phase A)**
  - `ISerializable<T>` interface for JSON serialization/deserialization
  - `IAssetMetadata` with UUID, name, type, version, and timestamps
  - `IAssetReference` for lightweight asset linking by UUID
  - `IAsset` base interface extending metadata
  - `IAssetStore` interface for storage backends
  - `IMigration` interface for schema version migrations
  - Type guards: `isAssetMetadata()`, `isAssetReference()`
  - Utility functions: `getAssetFileExtension()`, `createAssetReference()`

- **AssetRegistry Service**
  - Central registry for all loaded assets
  - CRUD operations: `register()`, `unregister()`, `get()`, `has()`
  - Type-indexed lookup via `getByType()`
  - Asset reference resolution via `resolve()`
  - Search functionality with type filtering
  - EventBus integration: `asset:registered`, `asset:unregistered`, `asset:modified`

- **FileSystemAssetStore**
  - File System Access API based persistence
  - Standard folder structure: `assets/{shaders,materials,scenes,textures}/`
  - File format: `{uuid}.{type}.json`
  - Async operations: `openFolder()`, `saveAsset()`, `loadAsset()`, `deleteAsset()`, `listAssets()`
  - Browser support detection via `isSupported()`

- **MigrationRunner Service**
  - Sequential schema migration execution
  - Migration chain validation with gap detection
  - Graceful error handling with partial migration support
  - Version tracking per asset type

- **Type Declarations**
  - `file-system-access.d.ts` for File System Access API types

### Tests

- 72 new tests (592 total)
  - `AssetRegistry.test.ts` - 30 tests
  - `MigrationRunner.test.ts` - 18 tests
  - `AssetInterfaces.test.ts` - 24 tests

---

## [0.10.1] - 2026-01-27

### Fixed

- **Grid Lines Extending Beyond Boundaries**
  - Fixed grid generation bug where lines extended past grid edges
  - Grid now correctly renders within -size to +size bounds

- **Axis Lines Always at World Origin**
  - Red (X) and Green (Y) axis lines now always render at world coordinates (0,0)
  - Axis lines no longer shift position when changing subdivisions
  - Removed Z axis indicator (not needed for XY plane grid)

- **Grid Visibility on Zoom Out**
  - Fixed grid disappearing when camera zooms out
  - Added adaptive fade distance based on camera position
  - Grid remains visible regardless of camera distance from origin

- **Settings Window Scroll Position**
  - Fixed scroll position resetting when clicking on sliders/inputs
  - Window now uses z-index instead of DOM manipulation for focus

### Changed

- **Grid Size Default**
  - Default grid size changed from 10 to 1 unit (1 meter)
  - Documented unit system: 1 unit = 1 meter (Blender-compatible for 1:1 import/export)

- **Settings Window Non-Modal**
  - Settings window no longer darkens the rest of the editor
  - Window is freely positionable and resizable
  - Supports live editing while viewing viewport

- **Grid Settings UI Improvements**
  - Slider snaps to 0.5 increments for grid size
  - Added editable number input fields alongside all sliders
  - Size slider shows "m" (meters) suffix
  - Slider ranges adjusted (0.5-100m for size, 2-50 for subdivisions)

### Documentation

- **Unit System Documentation**
  - Added Unit System section to COORDINATE_SYSTEM.md
  - Documented 1 unit = 1 meter convention
  - Added implementation requirements and Blender compatibility notes

---

## [0.10.0] - 2026-01-27

### Added

- **Phase 6.12: Viewport Grid**
  - Procedural grid renderer on XY plane at Z=0 (Z-up convention)
  - Major/minor line subdivisions with configurable colors
  - Axis indicator lines (X=Red, Y=Green, Z=Blue) with small Z-up indicator at origin
  - Distance-based fade effect for cleaner appearance at edges
  - Alpha blending for transparency
  - Grid toggle button with icon in viewport header toolbar
  - Grid visibility persisted across sessions via localStorage

- **Phase 6.13: Settings Window**
  - Modal settings window accessible from File → Settings (Ctrl+,)
  - Two-panel layout: category list (left) + content panel (right)
  - Escape key and click-outside to close
  - Grid settings panel with:
    - Show/hide grid checkbox
    - Grid size slider (5-50 world units)
    - Subdivisions slider (5-50)
    - Major/minor line color pickers
    - Show axis lines checkbox
    - Opacity slider (0-100%)
    - Reset to defaults button

- **SettingsService**
  - Centralized settings management with localStorage persistence
  - Type-safe get/set methods with overloaded signatures
  - Event-based change notifications (`settings:changed`)
  - Default values with merge-on-load for forward compatibility
  - Reset section/all functionality

- **New Tests**
  - 17 tests for SettingsService (persistence, events, error handling)
  - 24 tests for GridRenderer (initialization, rendering, settings integration)
  - Total: 520 tests passing

### Changed

- **ViewportPanel** now accepts optional `settingsService` for grid toggle integration
- **EditorLayout** passes `settingsService` to ViewportPanel
- **Application** orchestrates GridRenderer and SettingsWindow initialization
- **TopMenuBar** File menu now includes Settings item with Ctrl+, shortcut
- **WebGL mock** (tests) extended with `blendFunc`, `depthMask`, `BLEND` constants

---

## [0.9.6] - 2026-01-27

### Fixed

- **Rotation Gizmo Hit Detection**
  - Fixed scale factor mismatch between renderer (0.08) and controller (0.15) that made rings nearly impossible to select
  - Hit testing now uses matching scale factor for accurate ring selection

- **Alt+Click Camera Orbit Conflict**
  - Gizmo controller now ignores mouse events when Alt key is pressed
  - Prevents accidental object transforms while orbiting camera with Alt+LMB

- **DirectionalLight Default Rotation**
  - Fixed Z rotation defaulting to 0° instead of 180° in Application.ts
  - DirectionalLight now correctly starts with rotation [50, -30, 180]

### Changed

- **Rotation Gizmo Simplified**
  - Reverted from solid filled rings to clean line rendering
  - Removed camera-based fading effects for cleaner appearance
  - Simplified hit detection code (removed unnecessary fallback sampling)

- **Gizmo Hover Color**
  - Changed hover highlight from white to yellow for consistency with other gizmo colors

- **Transform Gizmos on Lights**
  - Lights (DirectionalLight) can now be transformed using the standard gizmos
  - Only Camera entities are skipped for gizmo rendering

---

## [0.9.5] - 2026-01-27

### Security

- **Fixed esbuild CORS vulnerability**
  - Upgraded vitest 2.1.9 → 4.0.18 to resolve CVE in transitive esbuild dependency
  - esbuild@0.21.5 allowed any website to read dev server responses due to `Access-Control-Allow-Origin: *`
  - All esbuild instances now at 0.25.12 (patched)

### Changed

- **Vitest major version upgrade**
  - vitest upgraded from 2.1.9 to 4.0.18
  - @vitest/coverage-v8 upgraded to match
  - Fixed mock type annotations for vitest 4.x compatibility in test files

---

## [0.9.4] - 2026-01-27

### Added

- **Rotation Gizmo All-Axis Rotation**
  - Click near center of rotation gizmo to enable trackball-style rotation on all axes
  - Center hit detection with `CENTER_HIT_RADIUS = 0.15` scale factor
  - `calculateTrackballRotation()` converts mouse movement to multi-axis rotation

- **Rotation Gizmo Camera-Based Fading**
  - Ring segments fade based on orientation to camera view direction
  - Rings that are "edge-on" (facing away) fade out for reduced visual clutter
  - Per-segment fading for smooth transitions
  - Minimum fade of 15% so rings never fully disappear

- **GizmoGeometryBatch Interface**
  - New interface to support multiple draw calls with different draw modes
  - Enables mixed GL.LINES and GL.TRIANGLES rendering in single gizmo

### Changed

- **Rotation Gizmo Now Renders Solid Circles**
  - Changed from wireframe lines to solid filled triangles (torus bands)
  - 8% ring width ratio for clean appearance
  - Uses `GL.TRIANGLES` draw mode

- **Scale Gizmo Solid Axis Cubes**
  - Single-axis handles (X, Y, Z) now render as solid filled cubes
  - Center cube: wireframe when not hovered, solid when hovered
  - Uses `additionalBatches` for triangle geometry

- **Position Gizmo Maya-Style Plane Handles**
  - 2-axis plane handles now start from origin (offset = 0)
  - Aligns with axis lines like in Maya
  - Increased handle size to 0.25

- **DirectionalLight Default Values**
  - Default rotation changed to `[50, -30, 180]` (Z rotation now 180°)
  - Default position changed to `[0, -6, 0]` (positioned in front of origin)

- **Light Debug Visuals Always Visible**
  - Light gizmos (sun icon + direction arrow) now render for ALL lights
  - Previously only rendered for selected lights
  - Renamed `renderSelectedLightGizmos()` → `renderAllLightGizmos()`

### Fixed

- **Rotation Gizmo Not Rendering**
  - Added `gl.disable(gl.CULL_FACE)` in gizmo renderer
  - Backface culling was hiding solid ring triangles
  - Properly restore culling state after rendering

---

## [0.9.3] - 2026-01-26

### Added

- **Transform Gizmo Undo/Redo Test Coverage**
  - New test file `tests/unit/plugins/gizmos/TransformGizmoCommands.test.ts` (25 tests)
  - Coverage for translate, rotate, and scale operations on all axes
  - Tests for batch operations, redo functionality, event emission, and edge cases
  - Tests for command coalescing behavior

### Fixed

- **Rotation Gizmo Now Accepts Input**
  - Root cause: `startIntersection` was set to gizmo center instead of actual click point on ring
  - Rotation angle calculation failed because start vector was zero-length
  - Added `calculateRotateStartIntersection()` to compute actual click point on rotation plane

- **Eliminated Initial Jump When Dragging Gizmos**
  - All gizmo modes (translate, rotate, scale) now calculate proper start intersection
  - Translate: Uses `projectRayOntoAxis()` for single-axis, `intersectRayWithPlane()` for plane moves
  - Scale: Same approach as translate for axis constraints
  - Free/uniform movements use camera-aligned plane through gizmo position

### Changed

- **Rotation Gizmo Visual Improvements**
  - Rings now render as thick bands (10% width) instead of single lines
  - Outer ring at full radius, inner ring at 90% radius
  - Radial connections every 4 segments for cleaner look
  - Improved visual clarity for understanding rotation axis orientation

---

## [0.9.2] - 2026-01-26

### Fixed

- **Transform Gizmo Undo/Redo Now Works Correctly**
  - Gizmo drags now create a single batched undo entry (previously created separate entries per axis)
  - Fixed race condition where drag commands were lost when selection changed during mouseup
  - Stored entity reference in dragState to avoid dependency on current selection state
  - Removed duplicate undo/redo shortcut registration that could cause issues

### Changed

- Added `entity` field to `GizmoDragState` interface to track dragged entity independently of selection
- `TransformGizmoController.commitTransformChanges()` now uses `beginBatch()`/`endBatch()` for atomic undo
- Debug logging added to CommandHistory and PropertyChangeCommand (can be disabled via DEBUG flags)

---

## [0.9.1] - 2026-01-26

### Changed

- **Transform Gizmo Visual Improvements**
  - Arrow heads now use filled cones (12 segments) instead of wireframe lines
  - Arrow shafts now use cylindrical geometry (6-sided prisms) instead of single lines
  - Plane handles (XY, XZ, YZ) reduced by ~30% for cleaner appearance
  - Center cube handle slightly smaller for better proportions

### Fixed

- **Plane handles now render from both sides** - Double-sided triangles ensure visibility from any camera angle
- **Hover highlighting for plane handles and center cube** - Now fill with yellow when hovered instead of just outline

---

## [0.9.0] - 2026-01-26

### Added

- **Transform Gizmos (Phase 6.8)**: Visual handles for position/rotation/scale manipulation
  - `TranslateGizmo.ts` - Arrow handles for X/Y/Z translation + plane handles (XY/XZ/YZ) + center handle
  - `RotateGizmo.ts` - Ring handles for X/Y/Z rotation with drag angle calculation
  - `ScaleGizmo.ts` - Box handles for X/Y/Z axis scaling + center cube for uniform scaling
  - `TransformGizmoRenderer.ts` - WebGL rendering with per-vertex colors, depth disabled (always on top)
  - `TransformGizmoController.ts` - Main controller with W/E/R keyboard shortcuts, mouse interaction
  - `IGizmo.ts` - Interfaces for GizmoMode, GizmoAxis, GIZMO_COLORS constant
  - Axis colors: X=Red (#E53935), Y=Green (#43A047), Z=Blue (#1E88E5), Free=Yellow (#FDD835)
  - Screen-space constant size calculation for consistent visual appearance
  - Ray casting hit detection (ray-line, ray-plane intersection)
  - Full undo/redo integration via PropertyChangeCommand

- **Default Cube on Startup**: Scene now initializes with a Cube primitive for faster testing

### Changed

- `Application.ts`: Integrated TransformGizmoController and default cube creation
- `src/plugins/index.ts`: Added gizmos module export

---

## [0.8.5] - 2026-01-25

### Changed

- **PBR Shaders migrated to `#include` directives** (Phase 3 complete):
  - `pbr/pbr.vert.glsl` - Raw vertex shader (was `pbr.vert.glsl.ts`)
  - `pbr/pbr.frag.glsl` - Raw fragment shader with `#include` for common modules
  - `PBRShaderProgram.ts` - Now imports raw `.glsl` files directly
  - `pbr/index.ts` - Updated barrel exports for raw GLSL imports

### Removed

- `pbr/pbr.vert.glsl.ts` - Replaced by raw `pbr.vert.glsl`
- `pbr/pbr.frag.glsl.ts` - Replaced by raw `pbr.frag.glsl` with `#include` directives

---

## [0.8.4] - 2026-01-25

### Added

- **Raw GLSL File Support**: Migrated shader modules from `.glsl.ts` wrappers to raw `.glsl` files
  - Added `vite-plugin-glsl` for development/production builds with `#include` directive support
  - Created custom `glslRawPlugin` for Vitest compatibility (vite-plugin-glsl breaks test pipeline)
  - Added `src/shaders.d.ts` TypeScript declarations for `.glsl`, `.vert`, `.frag` imports

- **Migrated Common Shader Modules**:
  - `common/math.glsl` - Math utilities (PI, saturate, sqr, remap)
  - `common/brdf.glsl` - Cook-Torrance BRDF functions (GGX, Smith, Fresnel)
  - `common/lighting.glsl` - Tone mapping, gamma correction, hemisphere ambient

### Changed

- `vite.config.ts`: Added GLSL plugin configuration with ESM-compatible path resolution
- `vitest.config.ts`: Conditional plugin loading - uses raw loader in tests, full plugin in dev
- `common/index.ts`: Updated to use default imports from raw `.glsl` files
- `pbr/pbr.frag.glsl.ts`: Updated imports to use barrel export from `../common`
- `tsconfig.json`: Added `src/shaders.d.ts` to includes

### Removed

- `common/math.glsl.ts` - Replaced by `math.glsl`
- `common/brdf.glsl.ts` - Replaced by `brdf.glsl`
- `common/lighting.glsl.ts` - Replaced by `lighting.glsl`

### Fixed

- Removed unused `_setLightUniforms` method from `ForwardRenderer.ts`
- Fixed unused parameter warning in `PBRShader.test.ts`

---

## [0.8.3] - 2026-01-24

### Added

- **PBR Uber Shader (Phase 6.7)**: Physically-based rendering following Blender's Principled BSDF conventions
  - Cook-Torrance microfacet BRDF with GGX/Trowbridge-Reitz normal distribution
  - Smith-GGX geometry function for accurate self-shadowing
  - Fresnel-Schlick approximation with roughness-aware ambient term
  - Metallic workflow (0 = dielectric, 1 = metal)
  - Energy-conserving diffuse/specular split
  - ACES filmic tone mapping and sRGB gamma correction
  - Multi-light support (up to 8 directional lights)
  - Emission support with strength multiplier

- **Modular Shader Architecture**: Reusable GLSL code modules
  - `shaders/common/math.glsl.ts` - Math utilities (PI, saturate, sqr, remap)
  - `shaders/common/brdf.glsl.ts` - BRDF functions (GGX, Smith, Fresnel)
  - `shaders/common/lighting.glsl.ts` - Tone mapping, gamma correction, hemisphere ambient
  - `composeShader()` utility for combining GLSL snippets

- **PBR Material Properties**: Extended `IMaterialComponent` interface
  - `metallic: number` - Metallic factor (0-1)
  - `roughness: number` - Roughness factor (0-1)
  - `emission: [number, number, number]` - Emission color
  - `emissionStrength: number` - Emission intensity multiplier

- **ForwardRenderer PBR Integration**: Automatic shader switching
  - Materials with `shaderName: 'pbr'` use Cook-Torrance BRDF
  - Materials with default shader continue using Lambertian diffuse
  - Efficient per-frame light caching for shader switching
  - Backward compatible with existing materials

### Changed

- `ForwardRenderer.ts`: Added PBR shader support with automatic switching based on material
- `IMaterialComponent.ts`: Extended with PBR properties following Blender conventions

---

## [0.8.2] - 2026-01-24

### Fixed

- **Viewport Gizmo Scaling**: Gizmo now maintains uniform size regardless of viewport aspect ratio
  - Added `uAspectRatio` uniform to shader for proper NDC coordinate correction
  - Gizmo no longer stretches on non-square viewports
- **Hierarchy Selection Sync**: Hierarchy panel now highlights entities selected via viewport picking
  - Added `selection:changed` event listener to HierarchyPanel
  - Added `selectWithoutCallback()` method to TreeView to prevent circular event updates

### Changed

- `LightGizmoRenderer.ts`: Adjusted directional light arrow scale from 1.5 to 1.0 for better visual balance

---

## [0.8.1] - 2026-01-24

### Added
- **Z-Up Coordinate System**: Complete migration from Y-up (OpenGL default) to Z-up (Blender convention)
  - Camera system now uses `[0, 0, 1]` as world up vector
  - OrbitController rewritten with Z-up spherical coordinates
  - Cube primitive: top/bottom faces now along Z axis
  - Sphere primitive: poles now along Z axis
  - ForwardRenderer hemisphere lighting uses `normal.z`
  - LightGizmoRenderer fallback up vector updated
- **ViewportGizmoRenderer**: New orientation indicator in bottom-left corner of viewport
  - Shows XYZ axes with color coding (X=Red, Y=Green, Z=Blue)
  - Rotates to match current camera orientation
  - Clean line rendering (no arrowheads)

### Changed
- `Camera.ts`: Default `_up` changed from `[0, 1, 0]` to `[0, 0, 1]`
- `RenderCameraAdapter.ts`: `up` property returns `[0, 0, 1]`
- `CameraEntity.ts`: Default camera position adjusted for Z-up viewing angle `[5, -7, 4]`
- `OrbitController.ts`: Spherical ↔ Cartesian conversions rewritten for Z-up
- `Cube.ts`: Face geometry rotated for Z-up (Top/Bottom along Z, Front/Back along Y)
- `Sphere.ts`: UV sphere poles along Z axis instead of Y
- `ForwardRenderer.ts`: Hemisphere ambient uses `normal.z` instead of `normal.y`
- `LightGizmoRenderer.ts`: Arrow shader uses Z-up fallback up vector
- `transforms.ts`: Documentation updated to reference Z-up convention

### Fixed
- Sphere lighting appearing reversed (triangle winding order corrected for Z-up geometry)

### Removed
- "WebGL Viewport - Ready" status text from viewport panel (replaced by orientation gizmo)

---

## [0.8.0] - 2026-01-24

### Added
- **Coordinate System Documentation**: Comprehensive Z-up right-handed convention (Blender standard)
  - New `COORDINATE_SYSTEM.md` with axis definitions, implementation requirements, migration checklist
  - Section 8 in GUIDELINES.md: Coordinate System Convention (MANDATORY)
  - Render Pipeline Modularity section in ARCHITECTURE.md
- **Documentation Archive System**: Historical plan documents preserved in `.llms/archive/`
  - `archive/README.md` - Index of archived docs
  - `archive/PHASE_6_HISTORICAL.md` - Completed phases 6.1-6.6 implementation details
  - Archived: `IMPLEMENTATION_PLAN.md`, `LIGHT_SYSTEM_PLAN.md`, `REFACTOR_MESH_RENDERING.md`

### Changed
- **PROJECT_CONTEXT.md**: Simplified from ~645 to ~150 lines, focused on current state
- **PHASE_6_PLAN.md**: Reduced from ~715 to ~280 lines, keeping only remaining phases (6.7-6.14)
- **ARCHITECTURE.md**: Added swappable renderer documentation and checklist for new renderers

### Removed
- Moved obsolete plan files to archive (preserved, not deleted):
  - `IMPLEMENTATION_PLAN.md` → `archive/` (Phases 1-5 complete)
  - `LIGHT_SYSTEM_PLAN.md` → `archive/` (v0.8.0 complete)
  - `REFACTOR_MESH_RENDERING.md` → `archive/` (v0.7.0 complete)

---

## [0.8.0] - 2026-01-24

### Added
- **Light Gizmo Renderer**: Debug visualization for directional lights when selected
  - Billboard sun icon that always faces camera
  - Direction arrow showing light direction from transform rotation
  - Colored based on light color
- **Multi-Light Support**: ForwardRenderer now supports up to 8 directional lights
  - Shader arrays for light directions and colors
  - `uLightCount` uniform for dynamic light count
- **Light Properties Panel**: Full light controls in Properties panel
  - Light type dropdown (directional, point, spot, area)
  - Enabled checkbox
  - Color picker
  - Intensity slider
  - Range and Spot Angle controls
- **Sphere Properties Panel**: Read-only display of sphere parameters
  - Segments, Rings, Radius values
- **ILightDirectionProvider Interface**: Type-safe light direction computation
  - `getWorldDirection()` method for transform-based direction
  - Type guard `isLightDirectionProvider()` for runtime checks

### Changed
- **DirectionalLight**: Direction now computed from transform rotation
  - Removed stored direction property
  - Uses Euler rotation to compute forward vector
  - Light direction updates when rotation changes
- **LightManager**: Enhanced for multi-light support
  - Added `MAX_LIGHTS` constant (8)
  - Added `getActiveLightCount()`, `getDirectionalLights()`, `getPointLights()`
  - Uses `isLightDirectionProvider()` type guard
- **PropertyChangeHandler**: Extended for light component properties
  - Supports `light.*` property paths
  - Full undo/redo support for light properties

### Fixed
- **Sphere Winding Order**: Changed from CW to CCW winding
  - Now matches Cube winding convention
  - Both primitives lit consistently from same direction
- **Light Direction Stability**: Light no longer changes with camera movement
  - Direction determined by entity transform rotation only

---

## [0.7.1] - 2026-01-23

### Added
- **ICloneable Interface** (`src/core/interfaces/ICloneable.ts`)
  - `clone(): IEntity` method for polymorphic entity duplication
  - `isCloneable()` type guard
  - `cloneEntityBase()` helper function for copying common properties (transform, material)
- **Shared Create Menu Definitions** (`src/ui/shared/CreateMenuDefinitions.ts`)
  - Single source of truth for Create menu items
  - `buildTopMenuBarCreateItems()` for TopMenuBar format
  - `buildContextMenuCreateItems()` for ContextMenu format
  - Both TopMenuBar and HierarchyPanel context menu now stay in sync automatically

### Changed
- **Entity Duplication** - Now works for all cloneable entities (Cube, Sphere, DirectionalLight), not just Cubes
  - `DuplicateEntityCommand` uses `isCloneable()` and calls `entity.clone()` polymorphically
  - Removed `primitiveRegistry` dependency from duplication logic
  - Future entity types (OBJ/GLTF imports) just need to implement `ICloneable`
- **Cube** - Implements `ICloneable` interface with `clone()` method
- **Sphere** - Implements `ICloneable` interface with `clone()` method (preserves segments, rings, radius)
- **DirectionalLight** - Implements `ICloneable` interface with `clone()` method (preserves color, intensity, direction)
- **ShortcutRegistry** - Uses `isCloneable()` check for duplication instead of `isMeshEntity()`
- **TopMenuBar** - Uses shared menu definitions from `CreateMenuDefinitions.ts`
- **HierarchyPanel** - Uses shared menu definitions, removed local `CREATE_MENU_ITEMS` constant

### Fixed
- **Sphere duplication** - Duplicating a Sphere now creates a Sphere (was creating Cube)
- **DirectionalLight duplication** - Lights can now be duplicated with Shift+D or context menu
- **Menu sync** - Create menu in TopMenuBar and right-click context menu are now always in sync

---

## [0.7.0] - 2026-01-23

### Added

- **Phase 6.6+6.7: Directional Light + Forward Renderer** - Combined implementation

  - **Light System** (`src/core/interfaces/ILightComponent.ts`, `src/plugins/lights/DirectionalLight.ts`)
    - `ILightComponent` interface with LightType, color, intensity, direction
    - `DirectionalLight` entity implementing IEntity with light component
    - Factory function `createDirectionalLightComponent()`
    - Methods: getDirection, setDirection, getColor, setColor, getIntensity, setIntensity, isEnabled, setEnabled, getEffectiveColor

  - **Light Manager** (`src/core/LightManager.ts`)
    - Collects active lights from scene for shader uniforms
    - Event-driven cache invalidation (`scene:objectAdded`, `scene:objectRemoved`)
    - Methods: `getActiveLights()`, `getPrimaryDirectionalLight()`, `getAmbientColor()`

  - **Forward Renderer** (`src/plugins/renderers/forward/ForwardRenderer.ts`)
    - Implements `IRenderPipeline` with embedded GLSL shaders
    - **Lighting Model:**
      - Lambertian diffuse (N·L clamped)
      - Hemisphere ambient approximation (sky/ground interpolation)
      - Rim lighting for edge definition
      - Gamma correction (2.2)
    - Uniform locations: model, viewProjection, normalMatrix, lightDirection, lightColor, ambientColor, objectColor, cameraPosition
    - `setLightManager(lightManager)` for light data injection

  - **Cube Solid Geometry** (`src/plugins/primitives/Cube.ts`)
    - Added 24 vertices (4 per face for correct per-face normals)
    - Added 36 indices for solid rendering
    - Added `renderSolid()`, `initializeSolidGPUResources()`, `getNormalMatrix()` methods
    - Wireframe rendering preserved as `renderWireframe()`

  - **Math Utilities** (`src/utils/math/transforms.ts`)
    - `vec3Normalize(v)` - Vector normalization
    - `mat4Inverse(m)` - Full 4x4 matrix inversion (Gauss-Jordan)
    - `mat3FromMat4(m)` - Extract upper-left 3x3 from Mat4
    - `normalMatrix(model)` - Compute transpose of inverse of upper-left 3x3

### Changed

- **Application** (`src/core/Application.ts`)
  - Added ForwardRenderer, LightManager, DirectionalLight initialization
  - Render loop now uses ForwardRenderer instead of LineRenderer
  - Default light direction: [-0.5, -1.0, -0.3] (normalized)

- **SelectionController** (`src/plugins/tools/SelectionController.ts`)
  - Changed `mat4Inverse` import to `mat4InverseNullable` to resolve export conflict

- **Math Index** (`src/utils/math/index.ts`)
  - Added exports for new transforms: vec3Normalize, mat4Inverse, mat3FromMat4, normalMatrix, Mat3
  - Renamed ray's mat4Inverse to mat4InverseNullable for disambiguation

### Fixed

- **Cube Test** (`tests/unit/plugins/Cube.test.ts`)
  - Updated error message expectation from "Failed to create VAO for Cube" to "Failed to create wireframe VAO for Cube"

### Technical Details

- **Files created**: 6 new files (ILightComponent.ts, DirectionalLight.ts, lights/index.ts, LightManager.ts, ForwardRenderer.ts, forward/index.ts)
- **Files modified**: 9 files
- **Test coverage**: 307 tests passing
- **Lines changed**: +605/-121

### Documentation

- **Architectural Refactoring Plan** (`.llms/REFACTOR_MESH_RENDERING.md`) - NEW
  - Documents plan to separate mesh data from GPU resources and rendering
  - IMeshData interface for common geometry data
  - MeshGPUCache pattern for centralized GPU resource management
  - Scheduled for next session

---

## [0.6.10] - 2026-01-23

### Changed

- **Major Refactoring: Application Architecture** - Eliminated God Object anti-pattern
  - Created `Application.ts` (~260 lines) - Core orchestration, module wiring, render loop
  - Created `ShortcutRegistry.ts` (~160 lines) - Keyboard shortcuts (Delete, Shift+D), context menu handlers
  - Created `SelectionController.ts` (~230 lines) - Ray picking, viewport selection, F key framing
  - Created `src/plugins/tools/index.ts` - Barrel export for tools
  - Simplified `index.ts` from **455 → 98 lines** (78% reduction)
  - Now compliant with 300-line file limit per PATTERNS.md

- **Application Context Pattern** - Subsystems access shared context
  - `app.getContext()` provides EventBus, SceneGraph, SelectionManager, CommandHistory, etc.
  - Clean separation between orchestration (Application) and feature logic (controllers)

### Fixed

- **Camera auto-pivot on selection** - Camera no longer moves when selecting objects
  - Orbit pivot stays fixed until `F` key explicitly frames selection
  - Clicking empty space (deselect) no longer resets pivot to origin
  - Matches standard 3D editor behavior (Maya, Blender)

### Technical Details

- **Files created**: 4 new files (Application.ts, ShortcutRegistry.ts, SelectionController.ts, tools/index.ts)
- **Files modified**: 3 files (index.ts, PROJECT_CONTEXT.md, ARCHITECTURE.md)
- **Test coverage**: 307 tests passing (no new tests required - behavior unchanged)
- **Architecture**: Follows PATTERNS.md file size guidelines and separation of concerns

---

## [0.6.9] - 2026-01-23

### Added

- **Nested Submenu Support for ContextMenu** - Full flyout menu system
  - `ContextMenu` component now supports `children` array for nested submenus
  - Submenu arrow indicator (▶) for parent items
  - Viewport boundary detection (flips left/up if menu goes off-screen)
  - Recursive rendering for unlimited nesting depth

- **Create Context Menu** - Right-click on empty space in Hierarchy panel
  - Shows nested Create menu matching TopMenuBar structure
  - Primitives submenu: Cube (enabled), Sphere, Plane, Cylinder, Cone, Torus (disabled)
  - Lights submenu: Point Light, Directional Light, Spot Light (all disabled for future)
  - Camera and Empty items (disabled for future)
  - Emits `hierarchy:createPrimitive` event handled by EditorLayout

- **TreeView.startEditingById()** - Programmatic inline rename trigger
  - New public method to initiate rename mode for any node by ID
  - Used by context menu Rename action

### Changed

- **Entity Context Menu** - Improved mesh entity context menu
  - Removed emoji icons from Delete, Rename, Duplicate items
  - Rename now triggers inline editing (same as double-click)
  - Delete and Duplicate properly emit events for command execution

### Fixed

- **hasComponent() context loss** - Fixed `this` binding issue in event handlers
  - When calling `hasComponent()` on entities, the method was losing its `this` context
  - Fixed by using `.call(entity, ...)` to preserve proper binding
  - Affected: Delete and Duplicate operations from context menu

### Technical Details

- **Files modified**: 5 files, +302/-81 lines
- **Test coverage**: 307 tests passing
- **Architecture**: ContextMenu now supports recursive nested menus

---

## [0.6.8] - 2026-01-23

### Added

- **Undo/Redo System** - Complete Command Pattern implementation
  - `ICommand` interface for undoable/redoable operations
  - `CommandHistory` manager with configurable stack size (default 100)
  - Command coalescing for rapid changes (300ms window)
  - Batch operations support for grouping multiple commands
  - Events: `command:executed`, `command:undone`, `command:redone`, `command:stackChanged`

- **Property Change Commands** - All property edits now undoable
  - `PropertyChangeCommand` for entity transform/component changes
  - `TextEditCommand` for shader editor changes
  - PropertyChangeHandler integrated with CommandHistory

- **Delete Entity Command** - Undoable entity deletion
  - `DeleteEntityCommand` stores entity for restoration
  - Restores to original parent on undo

- **Duplicate Entity Command** - Undoable entity duplication
  - `DuplicateEntityCommand` creates offset clone
  - Auto-generates incremented names (e.g., Cube.001, Cube.002)

- **Keyboard Shortcuts**
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` - Redo
  - `Ctrl+Shift+Z` - Redo (alternative)
  - `Delete` - Delete selected mesh entities
  - `Shift+D` - Duplicate selected mesh entities
  - `KeyboardShortcutManager` for centralized shortcut handling

- **Context Menu** - Right-click menu for Hierarchy panel
  - `ContextMenu` component with singleton pattern
  - Auto-positions and dismisses on click outside or Escape
  - Only appears for mesh entities (not cameras)
  - Actions: Delete, Rename, Duplicate

- **TreeView Context Menu Support**
  - `onContextMenu` callback with node, x, y position data
  - Context menu events trigger entity operations

### Changed

- **HierarchyPanel** - Added context menu handler for mesh entities
- **index.ts** - Integrated CommandHistory, shortcuts, and event handlers

### Technical Details

- **Architecture**: Command Pattern with centralized CommandHistory
- **Test coverage**: 38 new CommandHistory tests, 307 total passing
- **Mandatory rule**: All data-modifying features must integrate with undo/redo

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

[Unreleased]: https://github.com/user/repo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/repo/releases/tag/v0.1.0
