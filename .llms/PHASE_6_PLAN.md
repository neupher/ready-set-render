# Phase 6: Functional WebGL Editor - Remaining Work

> **Last Updated:** 2026-01-27T15:40:00Z
> **Version:** 0.10.0
> **Status:** 6.9-6.10 remaining (6.1-6.8, 6.11-6.14 complete)

---

## Overview

This document covers the **remaining work** for Phase 6. For completed phases (6.1-6.7), see [archive/PHASE_6_HISTORICAL.md](./archive/PHASE_6_HISTORICAL.md).

**Goal**: Transform the WebGL Editor into a fully functional 3D editor with PBR shading, transform gizmos, live shader editing, and essential infrastructure.

---

## Key Decisions (Already Made)

- [x] **Camera uses Composition Pattern** - CameraEntity + RenderCameraAdapter
- [x] **Single source of truth**: Entity's Transform component
- [x] **Gizmos render separate pass** with depth disabled (always on top)
- [x] **PBR uses Cook-Torrance BRDF** (industry standard, same as Blender) - ✅ Implemented
- [x] **Shader errors shown inline** in editor (ShaderToy-style)
- [x] **Forward rendering** with light uniforms (deferred for Phase 7+)
- [x] **Maya-style navigation** controls (Alt+LMB/MMB/RMB)
- [x] **Unity terminology** throughout
- [x] **Undo/Redo from day one** - Command pattern (✅ already implemented)
- [x] **Z-up right-handed** coordinate system (Blender convention) - see [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md)
- [x] **Modular GLSL shaders** - Reusable snippets via `composeShader()` utility

---

## Completed: Phase 6.7 (PBR Uber Shader)

✅ **Implemented in v0.8.3**

**Features Delivered**:
- Cook-Torrance microfacet BRDF with:
  - GGX/Trowbridge-Reitz normal distribution (D)
  - Smith-GGX geometry function (G)
  - Fresnel-Schlick approximation (F)
- Metallic/roughness workflow following Blender's Principled BSDF
- Energy-conserving diffuse/specular split
- ACES filmic tone mapping + sRGB gamma correction
- Multi-light support (up to 8 directional lights)
- Emission support with strength multiplier
- Modular shader architecture with reusable GLSL snippets

**Files Created**:
- `src/plugins/renderers/shaders/common/math.glsl.ts`
- `src/plugins/renderers/shaders/common/brdf.glsl.ts`
- `src/plugins/renderers/shaders/common/lighting.glsl.ts`
- `src/plugins/renderers/shaders/pbr/pbr.vert.glsl.ts`
- `src/plugins/renderers/shaders/pbr/pbr.frag.glsl.ts`
- `src/plugins/renderers/shaders/pbr/PBRShaderProgram.ts`
- `tests/unit/plugins/renderers/PBRShader.test.ts` (60 tests)

**Usage**: Set `material.shaderName = 'pbr'` to enable PBR rendering on any entity.

---

## Remaining Phases

### Phase 6.8: Transform Gizmos ✅ Complete

**Implemented in v0.9.0**

**Features Delivered**:
- Visual handles for position/rotation/scale manipulation
- `TranslateGizmo` - Arrow handles for X/Y/Z translation + plane handles (XY/XZ/YZ) + center handle
- `RotateGizmo` - Ring handles for X/Y/Z rotation with drag angle calculation
- `ScaleGizmo` - Box handles for X/Y/Z axis scaling + center cube for uniform scaling
- `TransformGizmoRenderer` - WebGL rendering with per-vertex colors, depth disabled (always on top)
- `TransformGizmoController` - Main controller with W/E/R keyboard shortcuts, mouse interaction
- Screen-space constant size calculation for consistent visual appearance
- Ray casting hit detection (ray-line, ray-plane intersection)
- Full undo/redo integration via PropertyChangeCommand

**Files Created**:
- `src/plugins/gizmos/interfaces/IGizmo.ts`
- `src/plugins/gizmos/interfaces/index.ts`
- `src/plugins/gizmos/TranslateGizmo.ts`
- `src/plugins/gizmos/RotateGizmo.ts`
- `src/plugins/gizmos/ScaleGizmo.ts`
- `src/plugins/gizmos/TransformGizmoRenderer.ts`
- `src/plugins/gizmos/TransformGizmoController.ts`
- `src/plugins/gizmos/index.ts`

**Gizmo Types**:
| Mode | Shortcut | Geometry |
|------|----------|----------|
| Translate | W | 3 arrows + center |
| Rotate | E | 3 rings |
| Scale | R | 3 boxes |

**Colors**: X=Red (#E53935), Y=Green (#43A047), Z=Blue (#1E88E5), Free=Yellow (#FDD835)

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

### Phase 6.12: Viewport Grid

**Goal**: Ground grid for spatial reference.

**Features**:
- XZ plane grid lines (NOTE: Will need adjustment for Z-up convention)
- Major/minor subdivisions
- Axis indicators (X=Red, Y=Green, Z=Blue - thicker)
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
1. Create `SettingsWindow` component
2. Create `SettingsService` for persistence
3. Create `GridSettingsPanel`
4. Add "Settings" item to File menu
5. Wire grid preferences to GridRenderer

**Files**:
- `src/ui/windows/SettingsWindow.ts` (new)
- `src/ui/windows/panels/GridSettingsPanel.ts` (new)
- `src/core/SettingsService.ts` (new)
- `src/ui/components/TopMenuBar.ts` - Settings menu item

---

## Completed Phases (Summary)

| Phase | Description | Status |
|-------|-------------|--------|
| 6.1 | Fix Rendering Pipeline | ✅ Complete |
| 6.2 | Camera as Scene Entity | ✅ Complete |
| 6.3 | Input System & Navigation | ✅ Complete |
| 6.4 | Selection System | ✅ Complete |
| 6.5 | Directional Light | ✅ Complete |
| 6.6 | Forward Renderer | ✅ Complete |
| 6.11 | Undo/Redo System | ✅ Complete (moved earlier) |
| 6.14 | Hierarchy Context Menu | ✅ Complete |

For detailed implementation history, see [archive/PHASE_6_HISTORICAL.md](./archive/PHASE_6_HISTORICAL.md).

---

## Dependency Graph (Remaining Work)

```
Phase 6.7 (PBR Shader) ─────────────────────→ Phase 6.9 (Shader Editor)
                                                        │
                                                        ▼
                                              Phase 6.10 (Render Modes)

Phase 6.8 (Gizmos) ─────────────────────────→ (Uses existing CommandHistory)

Phase 6.12 (Grid) ←─────────────────────────→ Phase 6.13 (Settings Window)
```

**Recommended Order**: 6.7 → 6.8 → 6.12 → 6.13 → 6.9 → 6.10

---

## Testing Strategy

| Phase | Unit Tests | Integration Tests | Manual Tests |
|-------|-----------|-------------------|--------------|
| 6.7 | (visual) | PBR reacts to light | Metallic affects look |
| 6.8 | Axis hover | Gizmo drag | Move cube with gizmo |
| 6.9 | Error parsing | Shader hot reload | Edit shader → updates |
| 6.10 | Mode manager | Mode switch | Dropdown works |
| 6.12 | Grid config | Grid renders | Toggle shows/hides |
| 6.13 | Settings persist | Settings load | Reopen → settings kept |

---

## Success Criteria

Phase 6 is complete when:

1. ✅ Creating a Cube from menu immediately shows it in viewport (solid shaded)
2. ✅ Camera is visible in Hierarchy, selectable, FOV/clip planes editable
3. ✅ Alt+drag navigation works (orbit, pan, dolly)
4. ✅ F key frames selection
5. ✅ Clicking objects selects them; selection syncs with Hierarchy
6. ✅ Directional light is in scene, editable, affects shading
7. ⬜ Default material is PBR (responds to light realistically)
8. ✅ Transform gizmos appear on selection (W/E/R to switch modes)
9. ⬜ Editing shader in Properties tab updates object in real-time
10. ⬜ Render mode dropdown switches between Shaded/Wireframe/Both
11. ✅ Ctrl+Z/Ctrl+Y undo/redo works for all scene operations
12. ✅ Viewport grid displays with toggle button
13. ✅ Settings window opens from File menu with Grid settings panel
14. ✅ Right-click context menu in Hierarchy (Delete, Duplicate, Rename)

---

## Related Documents

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current project state
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design reference
- [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md) - Z-up convention
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [archive/PHASE_6_HISTORICAL.md](./archive/PHASE_6_HISTORICAL.md) - Completed phases
- [archive/IMPLEMENTATION_PLAN.md](./archive/IMPLEMENTATION_PLAN.md) - Original phases 1-7
