# Project Context: WebGL Editor

> **Last Updated:** 2026-01-24T19:47:00Z
> **Version:** 0.8.2
> **Status:** Phase 6 In Progress (6.7-6.13 remaining)

---

## Quick Summary

A modular, extensible WebGL2-based 3D editor designed for learning and implementing real-time and ray-tracing rendering techniques. The project emphasizes clean architecture, plugin-based extensibility, and professional-grade UI similar to Unity or Substance Painter.

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
| 8 | 3D model import (.obj, .gltf) | Medium | Not Started |
| 9 | Texture support (.png, .jpg, .tga) | Medium | Not Started |
| 10 | In-editor shader text editor | Medium | Placeholder |
| 11 | Camera controls and scene navigation | High | ✅ Complete |
| 12 | Comprehensive documentation | High | Ongoing |
| 13 | Full test coverage | High | Ongoing |

---

## Current State (v0.8.0)

### What's Working

- **Core Engine**: EventBus, SceneGraph, PluginManager, WebGLContext, CommandHistory
- **Rendering**: ForwardRenderer with multi-light support (up to 8 directional lights)
- **Primitives**: Cube, Sphere (via IMeshProvider/MeshGPUCache architecture)
- **Lights**: DirectionalLight with transform-based direction, LightGizmoRenderer
- **Camera**: CameraEntity with composition pattern, OrbitController (Maya-style navigation)
- **Selection**: Ray picking, Ctrl+Click multi-select, F key framing
- **Undo/Redo**: Command pattern with coalescing (Ctrl+Z/Y)
- **UI**: EditorLayout, HierarchyPanel, PropertiesPanel, ViewportPanel, TopMenuBar
- **Entity System**: IEntity, ICloneable, IMeshProvider interfaces

### Test Coverage

- **393 tests passing**
- **85% coverage thresholds** enforced

### Architecture Highlights

- **Application.ts** orchestrates all modules (clean 98-line index.ts)
- **PropertyChangeHandler** centralizes all entity property changes
- **MeshGPUCache** centralized GPU resource management
- **ICloneable** enables polymorphic entity duplication

---

## In Progress

### Phase 6: Functional WebGL Editor

Remaining sub-phases (see [PHASE_6_PLAN.md](./PHASE_6_PLAN.md)):

| Phase | Description | Status |
|-------|-------------|--------|
| 6.7 | PBR Uber Shader (Cook-Torrance BRDF) | Not Started |
| 6.8 | Transform Gizmos (W/E/R) | Not Started |
| 6.9 | Live Shader Editor | Not Started |
| 6.10 | Render Mode Dropdown | Not Started |
| 6.11 | ~~Undo/Redo~~ | ✅ Moved earlier, complete |
| 6.12 | Viewport Grid | Not Started |
| 6.13 | Settings Window | Not Started |
| 6.14 | ~~Hierarchy Context Menu~~ | ✅ Complete |

---

## Next Steps (Recommended Order)

1. **Phase 6.7: PBR Uber Shader** - Cook-Torrance BRDF for realistic materials
2. **Phase 6.8: Transform Gizmos** - Visual handles for manipulation (W/E/R keys)
3. **Phase 6.12: Viewport Grid** - Ground grid on XY plane at Z=0 (now Z-up compliant)
4. **Phase 6.9: Live Shader Editor** - In-editor GLSL editing

---

## Tech Stack

| Category | Technology | Notes |
|----------|------------|-------|
| Renderer | WebGL2 (native) | No heavy abstractions |
| Language | TypeScript 5.7.2 | Strict mode enabled |
| Build Tool | Vite 6.3.5 | Dev server and bundling |
| Testing | Vitest 2.1.8 | 85% coverage thresholds |
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
│   ├── ui/                   # UI components and panels
│   ├── utils/                # Shared utilities (math, etc.)
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

---

## Related Documents

- [PHASE_6_PLAN.md](./PHASE_6_PLAN.md) - Remaining Phase 6 work (6.7-6.14)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design details
- [COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md) - Z-up convention (NEW)
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [WORKFLOWS.md](./WORKFLOWS.md) - Workflow automation
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
- [TESTING.md](./TESTING.md) - Testing guidelines
- [../CHANGELOG.md](../CHANGELOG.md) - Version history
