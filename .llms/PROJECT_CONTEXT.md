# Project Context: WebGL Editor

> **Last Updated:** 2026-01-21T17:07:00Z  
> **Version:** 0.1.0 (Initial Setup)  
> **Status:** Project Initialization

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

### Completed
- Initial project structure created
- Guideline documentation established
- Workflow automation defined

### In Progress
- None (project initialization phase)

### Next Steps
1. Set up base project with package.json and build tooling
2. Select and integrate UI library
3. Create basic application shell with panel layout
4. Implement WebGL2 context initialization
5. Create first render pipeline (forward rendering)

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
webEditorClaude/
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
- [../CHANGELOG.md](../CHANGELOG.md) - Version history
