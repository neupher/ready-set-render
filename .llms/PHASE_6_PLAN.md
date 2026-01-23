# Phase 6: Functional WebGL Editor (Revised)

> **Last Updated:** 2026-01-23T16:14:00Z
> **Version:** 0.6.4

## Goal

Transform the WebGL Editor from a scaffolded prototype into a fully functional 3D editor with visible rendering, scene navigation, transform gizmos, lighting, PBR shading, live shader editing, and essential infrastructure (undo/redo, settings, grid) - similar to Blender's startup state.

---

## Key Decisions

- [x] **Camera uses Composition Pattern** - CameraEntity (IEntity) + CameraComponent (data) + RenderCameraAdapter (ICamera bridge) — NOT inheritance
- [x] **Single source of truth for position**: Entity's Transform component (not dual state)
- [x] Gizmos render as separate pass with depth disabled (always on top)
- [x] PBR uses Cook-Torrance BRDF (industry standard, same as Blender)
- [x] Shader errors shown inline in editor (ShaderToy-style)
- [x] Forward rendering with light uniforms (deferred for Phase 7+)
- [x] Maya-style navigation controls (Alt+LMB/MMB/RMB)
- [x] Unity terminology throughout (GameObject, Transform, Component, Inspector, Hierarchy)
- [x] **Undo/Redo from day one** - Command pattern for all scene modifications
- [x] **Settings system foundation** - Modular settings window with expandable categories

---

## Architecture Clarification: Camera Pattern

**Question Raised**: Is Camera a GameObject with Camera Component, or its own type?

**Answer**: In Unity, Camera IS a Component on a GameObject:
```
└── GameObject "Main Camera"
    ├── Transform Component (position, rotation, scale)
    └── Camera Component (FOV, near, far, clearFlags, etc.)
```

**Current Problem**: Existing `Camera.ts` has its own `_position`/`_target` fields separate from Transform, creating dual state.

**Solution**: Use **Composition with Adapter Pattern**:

```typescript
// 1. CameraEntity implements IEntity (NOT extends Camera)
class CameraEntity implements IEntity {
  readonly transform: Transform;  // SINGLE source of truth
  private components: Map<string, IComponent>;

  // Bridge to render pipeline
  asRenderCamera(aspect: number): ICamera {
    return new RenderCameraAdapter(this, aspect);
  }
}

// 2. CameraComponent is pure data
interface ICameraComponent extends IComponent {
  type: 'camera';
  fieldOfView: number;
  nearClipPlane: number;
  farClipPlane: number;
}

// 3. RenderCameraAdapter implements ICamera for pipeline compatibility
class RenderCameraAdapter implements ICamera {
  constructor(private entity: CameraEntity, private aspect: number) {}

  get position() { return this.entity.transform.position; }
  getViewMatrix() { /* compute from entity.transform */ }
  getProjectionMatrix() { /* compute from camera component */ }
}
```

**Benefits**:
- Single source of truth (Transform only)
- Clean separation of concerns
- Backward compatible with `IRenderPipeline.beginFrame(camera: ICamera)`
- Follows Unity's exact pattern

---

## Implementation Phases

### Phase 6.1: Fix Rendering Pipeline ✅ COMPLETE

**Status**: Completed in commit `d9d03dc865c9f37a7d6b9b1f970f65e72bda5dab`

**Goal**: Make instantiated cubes actually render in the viewport.

**Root Cause**: `Cube.render()` silently returns when `!this.vao || !this.program` - GPU resources are never initialized after Create menu instantiation.

**Implemented**:
1. ✅ Added `scene:objectAdded` event listener in `src/index.ts` that calls `initializeGPUResources()` on new renderables
2. ✅ Created `IInitializable` interface:
   ```typescript
   interface IInitializable {
     initializeGPUResources(gl: WebGL2RenderingContext, program: WebGLProgram): void;
     isInitialized(): boolean;
   }
   ```
3. ✅ Added type guard `isInitializable(obj)` for runtime checking
4. ✅ Ensured render loop calls `getRenderables()` and iterates properly
5. ✅ Verified camera matrices are passed correctly to `LineRenderer`

**Files Modified**:
- `src/index.ts` - Added objectAdded listener
- `src/core/interfaces/ISceneObject.ts` - Added IInitializable
- `src/plugins/primitives/Cube.ts` - Implemented isInitialized()

**Result**: Create Cube via menu → renders as white wireframe immediately ✅

---

### Phase 6.2: Default Camera as Scene Entity ✅ COMPLETE

**Commit:** `21f038ab`

**Goal**: Camera appears in Hierarchy as "Main Camera", is selectable, editable.

**Architecture**: Composition + Adapter Pattern (NOT inheritance)

**Files Created**:
- `src/core/interfaces/ICameraComponent.ts` - Camera component interface
- `src/core/CameraEntity.ts` - Entity with camera component
- `src/core/RenderCameraAdapter.ts` - Bridge to render pipeline

**Features**:
- CameraEntity implements IEntity (NOT extends Camera)
- Transform is single source of truth
- Movie camera icon in hierarchy
- Camera properties editable in Inspector

---

### Phase 6.3: Input System & Scene Navigation ✅ COMPLETE

**Commit:** `40caac34`

**Goal**: Navigate viewport with industry-standard Maya-style controls.

**Controls**:
| Input | Action |
|-------|--------|
| Alt + LMB drag | Orbit/tumble |
| Alt + MMB drag | Pan (Maya-style inverted) |
| Alt + RMB drag | Dolly/zoom (right = zoom in) |
| Scroll wheel | Zoom |
| F key | Frame selection |

**Files Created**:
- `src/core/InputManager.ts` - Centralized mouse/keyboard tracking
- `src/plugins/navigation/OrbitController.ts` - Maya-style navigation
- `src/plugins/navigation/index.ts` - Barrel export

**Features**:
- Spherical coordinates for smooth orbital movement
- Custom SVG cursors for orbit, pan, zoom modes
- Configurable sensitivity values (pan: 0.002)
- Proper Maya-style direction matching

---

### Phase 6.4: Selection System ✅ COMPLETE

**Commit:** `fc54a5fe`

**Goal**: Click to select objects; highlight and show in Inspector.

**Files Created**:
- `src/core/SelectionManager.ts` - Selection state management
- `src/utils/math/ray.ts` - Ray casting and AABB intersection

**Features**:
- Click to select with ray picking
- Ctrl+Click to toggle selection
- F key frames camera on selection
- Auto-pivot: Camera pivots around active selection
- Selection syncs with Hierarchy panel
- Movie camera icon for camera entity

---

### Phase 6.5: Default Directional Light

**Goal**: Editable directional light with data for shaders.

**Tasks**:
1. Create `ILightComponent` interface:
   ```typescript
   interface ILightComponent extends IComponent {
     type: 'light';
     lightType: 'directional' | 'point' | 'spot';
     color: Vec3;
     intensity: number;
     enabled: boolean;  // Toggle on/off
   }
   ```
2. Create `DirectionalLight` entity - default direction `[-0.5, -1, -0.5]`
3. Add light icon to TreeView
4. PropertiesPanel: color picker, intensity slider, **enabled checkbox**
5. Create `LightManager` - collect active lights for shaders

**Files**:
- `src/core/interfaces/ILightComponent.ts` (new)
- `src/core/LightManager.ts` (new)
- `src/plugins/lights/DirectionalLight.ts` (new)
- `src/ui/components/TreeView.ts` - light icon
- `src/ui/panels/PropertiesPanel.ts` - light editor

---

### Phase 6.6: Forward Renderer with Mesh Shading

**Goal**: Render solid shaded meshes with lighting.

**Tasks**:
1. Create `ForwardRenderer` implementing `IRenderPipeline`:
   - Depth testing, back-face culling
   - Light uniforms: u_LightDirection, u_LightColor, u_LightIntensity
   - Object uniforms: u_ModelMatrix, u_ViewProjectionMatrix, u_NormalMatrix
2. Create forward shaders (forward.vert, forward.frag)
3. Update `Cube.ts`: triangle indices, normals, renderMode
4. Add matrix math: mat4Inverse, mat3FromMat4, normalMatrix

**Files**:
- `src/plugins/renderers/forward/ForwardRenderer.ts` (new)
- `src/plugins/renderers/forward/shaders/forward.vert` (new)
- `src/plugins/renderers/forward/shaders/forward.frag` (new)
- `src/plugins/primitives/Cube.ts` - triangles, normals
- `src/utils/math/transforms.ts` - Mat3 operations

---

### Phase 6.7: PBR Uber Shader (BRDF)

**Goal**: Default PBR material matching Blender's Principled BSDF.

**PBR Model**: Cook-Torrance microfacet BRDF
- D: GGX/Trowbridge-Reitz
- F: Schlick's Fresnel
- G: Smith's geometry (GGX)

**Tasks**:
1. Create PBR shaders (pbr.vert, pbr.frag)
2. Create `IMaterialComponent`:
   ```typescript
   interface IMaterialComponent extends IComponent {
     type: 'material';
     albedo: Vec3;
     metallic: number;
     roughness: number;
     normalMap?: string;
     emissive: Vec3;
     emissiveIntensity: number;
   }
   ```
3. Create `PBRMaterial` class
4. Default values: Albedo [0.8,0.8,0.8], Metallic 0.0, Roughness 0.5
5. Hemisphere ambient approximation

**Files**:
- `src/plugins/renderers/forward/shaders/pbr.vert` (new)
- `src/plugins/renderers/forward/shaders/pbr.frag` (new)
- `src/core/interfaces/IMaterialComponent.ts` (new/modify)
- `src/plugins/materials/PBRMaterial.ts` (new)

---

### Phase 6.8: Transform Gizmos

**Goal**: Visual handles for position/rotation/scale manipulation.

**Gizmo Types**:
| Mode | Shortcut | Geometry |
|------|----------|----------|
| Translate | W | 3 arrows + center |
| Rotate | E | 3 rings |
| Scale | R | 3 boxes |

**Colors**: X=Red, Y=Green, Z=Blue, Free=Yellow

**Tasks**:
1. Create `GizmoRenderer` - render after scene, depth disabled, fixed screen size
2. Create geometry: TranslateGizmo, RotateGizmo, ScaleGizmo
3. Create `GizmoInteraction` - axis hover, drag handling
4. Keyboard shortcuts (W/E/R)
5. **Integrate with Undo/Redo** (Phase 6.11)

**Files**:
- `src/plugins/gizmos/GizmoRenderer.ts` (new)
- `src/plugins/gizmos/TranslateGizmo.ts` (new)
- `src/plugins/gizmos/RotateGizmo.ts` (new)
- `src/plugins/gizmos/ScaleGizmo.ts` (new)
- `src/plugins/gizmos/GizmoInteraction.ts` (new)

---

### Phase 6.9: Live Shader Editor (ShaderToy-style)

**Goal**: Real-time shader editing with graceful error handling.

**Features**:
- Click object → shader appears in Properties > Shader Editor
- **Debounced compilation (500ms)** - prevents compile spam
- Syntax highlighting, line numbers
- Inline error display
- **Error recovery** - keep last working shader

**Safeguards**:
- validateSyntax() quick check before compile
- minCompileInterval rate limiting
- Broken shader doesn't crash app

**Tasks**:
1. Create `ShaderManager` service
2. Create `ShaderEditor` component with debouncing
3. Update PropertiesPanel Shader tab
4. Add customVertexShader/customFragmentShader to material

**Files**:
- `src/core/ShaderManager.ts` (new)
- `src/ui/components/ShaderEditor.ts` (new)
- `src/ui/panels/PropertiesPanel.ts` - shader tab
- `src/core/interfaces/IMaterialComponent.ts` - custom shader fields

---

### Phase 6.10: Render Mode Dropdown

**Goal**: Switch render modes via viewport dropdown.

**Modes**:
| Mode | Renderer |
|------|----------|
| Shaded | ForwardRenderer |
| Wireframe | LineRenderer |
| Shaded + Wireframe | Both |
| Raytraced | (grayed out - "Coming Soon") |

**Tasks**:
1. Create `RenderModeDropdown` component
2. Create `RenderModeManager` - multi-pipeline support
3. Update ViewportPanel header - replace "Shaded" text

**Files**:
- `src/ui/components/RenderModeDropdown.ts` (new)
- `src/core/RenderModeManager.ts` (new)
- `src/ui/panels/ViewportPanel.ts` - add dropdown

---

### Phase 6.11: Undo/Redo System (FROM BACKLOG)

**Goal**: Command pattern for reversible operations.

**Design**:
```typescript
interface ICommand {
  readonly description: string;
  execute(): void;
  undo(): void;
}

class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistoryDepth: number = 100;

  execute(command: ICommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

**Commands**:
- CreateObjectCommand ("Create Cube")
- DeleteObjectCommand ("Delete Cube")
- TransformCommand ("Move Cube")
- PropertyChangeCommand ("Change Albedo")
- RenameObjectCommand ("Rename to X")

**UI**:
- Add **Edit menu** to TopMenuBar
- Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y)
- Show descriptions: "Undo Create Cube"

**Files**:
- `src/core/interfaces/ICommand.ts` (new)
- `src/core/CommandManager.ts` (new)
- `src/core/commands/CreateObjectCommand.ts` (new)
- `src/core/commands/DeleteObjectCommand.ts` (new)
- `src/core/commands/TransformCommand.ts` (new)
- `src/core/commands/PropertyChangeCommand.ts` (new)
- `src/ui/components/TopMenuBar.ts` - Edit menu

---

### Phase 6.12: Viewport Grid

**Goal**: Ground grid for spatial reference.

**Features**:
- XZ plane grid lines
- Major/minor subdivisions
- Axis indicators (X=Red, Z=Blue, thicker)
- **Toggle button in viewport header** (grid icon)
- Configurable via Settings

**Tasks**:
1. Create `GridRenderer` plugin - procedural grid, configurable
2. Create grid shaders (anti-aliased lines, distance fade)
3. Add grid toggle button to ViewportPanel header
4. Store preference in Settings service

**Files**:
- `src/plugins/viewport/GridRenderer.ts` (new)
- `src/plugins/viewport/shaders/grid.vert` (new)
- `src/plugins/viewport/shaders/grid.frag` (new)
- `src/ui/panels/ViewportPanel.ts` - toggle button

---

### Phase 6.13: Settings Window System

**Goal**: Modular settings window accessible from File menu.

**Window Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Settings                                            [X] │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ ▶ Grid     │  Grid Settings                            │
│            │                                            │
│ (future)   │  ☑ Show Grid                              │
│ ▶ Themes   │  Grid Size: [──●────] 10                  │
│ ▶ Hotkeys  │  Subdivisions: [──●──] 10                 │
│            │  Major Line Color: [■] #444444            │
│            │  Minor Line Color: [■] #333333            │
│            │                                            │
│            │  ☑ Show Axis Lines                        │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

**Features**:
- Two-panel layout: narrow left (categories), wider right (content)
- **Resizable window**
- First category: Grid settings
- Prepared for future: Themes, Hotkeys
- **Persistence**: Save to localStorage

**Tasks**:
1. Create `SettingsWindow` component:
   - Modal dialog with two-panel layout
   - Category list on left (TreeView or simple list)
   - Content area on right
   - Close button, window chrome
   - **Resizable** via drag handles
2. Create `SettingsService`:
   ```typescript
   class SettingsService {
     get<T>(key: string): T;
     set<T>(key: string, value: T): void;
     subscribe(key: string, callback: (value: any) => void): void;
     persist(): void;  // Save to localStorage
     load(): void;     // Load from localStorage
   }
   ```
3. Create `GridSettingsPanel`:
   - Show Grid checkbox
   - Grid Size slider
   - Subdivisions slider
   - Major/Minor line color pickers
   - Show Axis Lines checkbox
4. Add "Settings" item to File menu (or as separate menu item)
5. Wire grid preferences to GridRenderer

**Files**:
- `src/ui/windows/SettingsWindow.ts` (new)
- `src/ui/windows/panels/GridSettingsPanel.ts` (new)
- `src/ui/windows/index.ts` (new)
- `src/core/SettingsService.ts` (new)
- `src/ui/components/TopMenuBar.ts` - Settings menu item
- `src/plugins/viewport/GridRenderer.ts` - read from SettingsService

---

### Phase 6.14: Hierarchy Context Menu

**Goal**: Right-click operations on scene objects.

**Menu Options**:
- Rename (F2)
- Duplicate (Ctrl+D)
- Delete (Delete)
- ---
- Create Empty Child

**Tasks**:
1. Create `ContextMenu` component - generic reusable menu
2. Add context menu to TreeView/HierarchyPanel
3. Implement operations (integrate with Undo/Redo)
4. Keyboard shortcuts

**Files**:
- `src/ui/components/ContextMenu.ts` (new)
- `src/ui/panels/HierarchyPanel.ts` - context menu
- `src/core/commands/DuplicateObjectCommand.ts` (new)

---

## Dependency Graph

```
Phase 6.1 (Rendering Fix) ──┬──────────────────────────────────────────────┐
                            │                                               │
                            ▼                                               ▼
Phase 6.2 (Camera Entity) ──┼→ Phase 6.3 (Input/Navigation) ──→ Phase 6.4 (Selection)
                            │                                               │
                            │              Phase 6.11 (Undo/Redo) ←─────────┤
                            │                        │                      │
Phase 6.5 (Directional Light) ───────────────────────┼───→ Phase 6.6 (Forward Renderer)
                                                     │                      │
                                                     │                      ▼
                                                     │      Phase 6.7 (PBR Shader)
                                                     │                      │
Phase 6.4 (Selection) + 6.11 ──────────────────────→ Phase 6.8 (Gizmos)
                                                                            │
Phase 6.7 (PBR Shader) ────────────────────────────→ Phase 6.9 (Shader Editor)
                                                                            │
Phase 6.6 + LineRenderer ──────────────────────────→ Phase 6.10 (Render Modes)

Phase 6.12 (Grid) ←────────────────────────────────→ Phase 6.13 (Settings Window)

Phase 6.4 + 6.11 ──────────────────────────────────→ Phase 6.14 (Context Menu)
```

**Critical Path**: 6.1 → 6.2 → 6.6 → 6.7 (must render before shader editing)

**Parallel Tracks**:
- Track A: 6.1 → 6.2 → 6.3 → 6.4 → 6.8 (interaction)
- Track B: 6.5 → 6.6 → 6.7 → 6.9 (rendering/shading)
- Track C: 6.11 (undo/redo - integrate everywhere)
- Track D: 6.12 → 6.13 (grid/settings - semi-independent)

---

## File Summary

### New Files (~45 files)

```
src/core/
├── InputManager.ts
├── SelectionManager.ts
├── ShaderManager.ts
├── LightManager.ts
├── RenderModeManager.ts
├── SettingsService.ts
├── CameraEntity.ts
├── RenderCameraAdapter.ts
├── CommandManager.ts
├── interfaces/
│   ├── ICameraComponent.ts
│   ├── ILightComponent.ts
│   ├── IMaterialComponent.ts
│   ├── ISelectable.ts
│   └── ICommand.ts
└── commands/
    ├── index.ts
    ├── CreateObjectCommand.ts
    ├── DeleteObjectCommand.ts
    ├── TransformCommand.ts
    ├── PropertyChangeCommand.ts
    └── DuplicateObjectCommand.ts

src/plugins/
├── gizmos/
│   ├── index.ts
│   ├── GizmoRenderer.ts
│   ├── TranslateGizmo.ts
│   ├── RotateGizmo.ts
│   ├── ScaleGizmo.ts
│   └── GizmoInteraction.ts
├── lights/
│   ├── index.ts
│   └── DirectionalLight.ts
├── navigation/
│   ├── index.ts
│   └── OrbitController.ts
├── materials/
│   ├── index.ts
│   └── PBRMaterial.ts
├── viewport/
│   ├── index.ts
│   ├── GridRenderer.ts
│   └── shaders/
│       ├── grid.vert
│       └── grid.frag
└── renderers/forward/
    ├── index.ts
    ├── ForwardRenderer.ts
    └── shaders/
        ├── forward.vert
        ├── forward.frag
        ├── pbr.vert
        └── pbr.frag

src/ui/
├── components/
│   ├── ShaderEditor.ts
│   ├── RenderModeDropdown.ts
│   └── ContextMenu.ts
└── windows/
    ├── index.ts
    ├── SettingsWindow.ts
    └── panels/
        └── GridSettingsPanel.ts

src/utils/math/
├── bounds.ts
└── ray.ts
```

### Modified Files (~12 files)

```
src/index.ts
src/core/interfaces/ISceneObject.ts
src/plugins/primitives/Cube.ts
src/ui/components/TreeView.ts
src/ui/components/TopMenuBar.ts
src/ui/panels/ViewportPanel.ts
src/ui/panels/PropertiesPanel.ts
src/ui/panels/HierarchyPanel.ts
src/utils/math/transforms.ts
src/utils/math/index.ts
src/ui/components/index.ts
src/ui/panels/index.ts
```

---

## Testing Strategy

| Phase | Unit Tests | Integration Tests | Manual Tests |
|-------|-----------|-------------------|--------------|
| 6.1 | isInitialized() | objectAdded triggers init | Create Cube → renders |
| 6.2 | CameraEntity adapter | FOV updates projection | Edit camera in Inspector |
| 6.3 | Spherical math | Input events fire | Alt+drag orbits |
| 6.4 | Ray-AABB intersection | Click selects | Click cube → selected |
| 6.5 | Light component | Light uniforms | Edit light color |
| 6.6 | Normal matrix | Solid cube renders | Cube has shading |
| 6.7 | (visual) | PBR reacts to light | Metallic affects look |
| 6.8 | Axis hover | Gizmo drag | Move cube with gizmo |
| 6.9 | Error parsing | Shader hot reload | Edit shader → updates |
| 6.10 | Mode manager | Mode switch | Dropdown works |
| 6.11 | Command stack | Undo reverts | Ctrl+Z undoes |
| 6.12 | Grid config | Grid renders | Toggle shows/hides |
| 6.13 | Settings persist | Settings load | Reopen → settings kept |
| 6.14 | (integration) | Delete removes | Right-click → Delete |

---

## Estimated Effort

| Phase | Complexity | Est. Time |
|-------|------------|-----------|
| 6.1 | Low | 1-2 hours |
| 6.2 | Medium | 4-5 hours |
| 6.3 | Medium | 4-6 hours |
| 6.4 | Medium | 4-6 hours |
| 6.5 | Medium | 3-4 hours |
| 6.6 | High | 6-8 hours |
| 6.7 | High | 6-8 hours |
| 6.8 | High | 8-10 hours |
| 6.9 | High | 6-8 hours |
| 6.10 | Low | 2-3 hours |
| 6.11 | Medium | 5-7 hours |
| 6.12 | Medium | 3-4 hours |
| 6.13 | Medium | 4-5 hours |
| 6.14 | Low | 2-3 hours |
| **Total** | | **~60-80 hours** |

---

## Success Criteria

Phase 6 is complete when:

1. ✅ Creating a Cube from menu immediately shows it in viewport (solid shaded)
2. ✅ Camera is visible in Hierarchy, selectable, FOV/clip planes editable in Inspector
3. ✅ Alt+drag navigation works (orbit, pan, dolly)
4. ✅ F key frames selection
5. ✅ Clicking objects selects them; selection syncs with Hierarchy
6. ✅ Directional light is in scene, editable, has enabled toggle, affects shading
7. ✅ Default material is PBR (responds to light realistically)
8. ✅ Transform gizmos appear on selection (W/E/R to switch modes)
9. ✅ Editing shader in Properties tab updates object in real-time (with error handling)
10. ✅ Render mode dropdown switches between Shaded/Wireframe/Both
11. ✅ Ctrl+Z/Ctrl+Y undo/redo works for all scene operations
12. ✅ Viewport grid displays with toggle button
13. ✅ Settings window opens from File menu with Grid settings panel
14. ✅ Right-click context menu in Hierarchy (Delete, Duplicate, Rename)

---

## Related Documents

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Project state (update after Phase 6)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design reference
- [GUIDELINES.md](./GUIDELINES.md) - Development rules (industry terminology)
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Original phases 1-7
