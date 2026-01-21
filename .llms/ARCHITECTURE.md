# Architecture: WebGL Editor

> **Last Updated:** 2026-01-21T17:07:00Z  
> **Version:** 0.1.0

---

## Overview

The WebGL Editor follows a **plugin-based architecture** where the core provides minimal functionality and all features are implemented as swappable modules. This design optimizes for:

- **Extensibility:** Add new features without modifying existing code
- **Maintainability:** Small, focused modules with clear responsibilities
- **Testability:** Each module can be tested in isolation
- **Learning:** Clear separation makes understanding each system easier

---

## Core Principles

### 1. Plugin-First Design
Every feature beyond the absolute core is a plugin. This includes render pipelines, importers, UI panels, and tools.

### 2. Dependency Injection
Modules receive their dependencies through constructors or factory functions, never through direct imports of concrete implementations.

### 3. Event-Driven Communication
Modules communicate through a central event bus, reducing coupling between systems.

### 4. Interface Segregation
Define small, focused interfaces. A module should only depend on the interfaces it actually uses.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION SHELL                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           UI LAYER (Panels, Menus, Toolbars)            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                              PLUGIN MANAGER                              ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ││
│  │  │ Renderer │ │ Importer │ │  Shader  │ │  Camera  │ │  Scene   │      ││
│  │  │ Plugins  │ │ Plugins  │ │  Editor  │ │ Controls │ │  Tools   │      ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                              CORE ENGINE                                 ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │  Event Bus  │ │ Scene Graph │ │  Resource   │ │   WebGL2    │       ││
│  │  │             │ │             │ │   Manager   │ │   Context   │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### Core Engine (`src/core/`)

The core engine provides fundamental services that all plugins depend on.

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `EventBus` | Pub/sub communication between modules | None |
| `SceneGraph` | Hierarchical scene structure, transforms | EventBus |
| `ResourceManager` | Asset loading, caching, disposal | EventBus |
| `WebGLContext` | WebGL2 context management, capabilities | None |
| `PluginManager` | Plugin lifecycle, dependency resolution | EventBus |

#### Core Interfaces

```typescript
// src/core/interfaces/IPlugin.ts
interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly dependencies?: string[];
  
  initialize(context: IPluginContext): Promise<void>;
  dispose(): Promise<void>;
}

// src/core/interfaces/IRenderPipeline.ts
interface IRenderPipeline extends IPlugin {
  readonly type: 'forward' | 'deferred' | 'raytracing';
  
  beginFrame(camera: ICamera): void;
  render(scene: IScene): void;
  endFrame(): void;
  resize(width: number, height: number): void;
}

// src/core/interfaces/IImporter.ts
interface IImporter extends IPlugin {
  readonly supportedExtensions: string[];
  
  canImport(file: File): boolean;
  import(file: File): Promise<ISceneObject>;
}
```

---

### Plugin Categories

#### Render Pipelines (`src/plugins/renderers/`)

| Plugin | Type | Description |
|--------|------|-------------|
| `ForwardRenderer` | forward | Traditional forward rendering, good for transparency |
| `DeferredRenderer` | deferred | G-buffer based, efficient for many lights |
| `RaytracingRenderer` | raytracing | Software raytracing for learning/comparison |

**Swapping pipelines is done via settings:**
```typescript
editor.settings.set('renderer.pipeline', 'deferred');
```

#### Importers (`src/plugins/importers/`)

| Plugin | Extensions | Description |
|--------|------------|-------------|
| `OBJImporter` | .obj, .mtl | Wavefront OBJ format |
| `GLTFImporter` | .gltf, .glb | GL Transmission Format |
| `TextureImporter` | .png, .jpg, .tga | Image texture loading |

#### UI Plugins (`src/plugins/ui/`)

| Plugin | Description |
|--------|-------------|
| `ViewportPanel` | Main 3D viewport with canvas |
| `HierarchyPanel` | Scene object tree view |
| `InspectorPanel` | Selected object properties |
| `ShaderEditorPanel` | Code editor for shaders |
| `AssetBrowserPanel` | Project assets view |

#### Tools (`src/plugins/tools/`)

| Plugin | Description |
|--------|-------------|
| `SelectionTool` | Object picking and selection |
| `CameraController` | Orbit, pan, zoom controls |
| `TransformGizmo` | Move, rotate, scale handles |

---

## Data Flow

### Rendering Frame

```
1. Application Loop
   │
   ├─► Camera Controller updates camera transform
   │
   ├─► Scene Graph traversal
   │   └─► Collect visible objects
   │
   ├─► Active Render Pipeline
   │   ├─► beginFrame(camera)
   │   ├─► render(scene)
   │   └─► endFrame()
   │
   └─► UI Render (immediate mode overlay)
```

### Asset Import

```
1. User drops file
   │
   ├─► ResourceManager receives file
   │
   ├─► PluginManager.findImporter(file.extension)
   │
   ├─► Importer.import(file)
   │   └─► Returns ISceneObject
   │
   ├─► SceneGraph.add(sceneObject)
   │
   └─► EventBus.emit('scene:objectAdded', sceneObject)
```

---

## Directory Structure

```
src/
├── core/
│   ├── interfaces/           # All TypeScript interfaces
│   │   ├── IPlugin.ts
│   │   ├── IRenderPipeline.ts
│   │   ├── IImporter.ts
│   │   ├── ISceneObject.ts
│   │   └── index.ts
│   ├── EventBus.ts
│   ├── SceneGraph.ts
│   ├── ResourceManager.ts
│   ├── WebGLContext.ts
│   ├── PluginManager.ts
│   └── index.ts
│
├── plugins/
│   ├── renderers/
│   │   ├── forward/
│   │   │   ├── ForwardRenderer.ts
│   │   │   └── shaders/
│   │   ├── deferred/
│   │   │   ├── DeferredRenderer.ts
│   │   │   ├── GBuffer.ts
│   │   │   └── shaders/
│   │   └── raytracing/
│   │       ├── RaytracingRenderer.ts
│   │       └── shaders/
│   │
│   ├── importers/
│   │   ├── OBJImporter.ts
│   │   ├── GLTFImporter.ts
│   │   └── TextureImporter.ts
│   │
│   ├── ui/
│   │   ├── panels/
│   │   │   ├── ViewportPanel.ts
│   │   │   ├── HierarchyPanel.ts
│   │   │   ├── InspectorPanel.ts
│   │   │   ├── ShaderEditorPanel.ts
│   │   │   └── AssetBrowserPanel.ts
│   │   └── components/
│   │
│   └── tools/
│       ├── SelectionTool.ts
│       ├── CameraController.ts
│       └── TransformGizmo.ts
│
├── ui/
│   ├── UIManager.ts          # Panel layout management
│   └── theme/                # UI theming
│
├── utils/
│   ├── math/                 # Vector, Matrix, Quaternion
│   ├── gl/                   # WebGL helpers
│   └── common/               # General utilities
│
└── index.ts                  # Application entry point
```

---

## Adding New Features

### Example: Adding a New Render Pipeline

1. **Create the plugin file:**
   ```
   src/plugins/renderers/custom/CustomRenderer.ts
   ```

2. **Implement IRenderPipeline:**
   ```typescript
   export class CustomRenderer implements IRenderPipeline {
     readonly id = 'custom-renderer';
     readonly name = 'Custom Renderer';
     readonly version = '1.0.0';
     readonly type = 'forward';
     
     // Implement all interface methods...
   }
   ```

3. **Register with PluginManager:**
   ```typescript
   pluginManager.register(new CustomRenderer());
   ```

4. **Add tests:**
   ```
   tests/plugins/renderers/CustomRenderer.test.ts
   ```

5. **Update documentation:**
   - Add to this architecture document
   - Create plugin-specific docs in `docs/plugins/`

**No existing code needs modification** — this is the Open/Closed principle in action.

---

## Change Boundaries

| Change Type | Affected Modules | Isolation Strategy |
|-------------|-----------------|-------------------|
| New render feature | Single renderer plugin | Interface-based plugin |
| New file format | New importer plugin | Extension-based discovery |
| New UI panel | New panel plugin | Panel registration system |
| New tool | New tool plugin | Tool registry |
| Core rendering change | All renderers | Versioned interfaces |

---

## Performance Considerations

1. **Object pooling** for frequently allocated objects (vectors, matrices)
2. **Lazy loading** of plugins until needed
3. **GPU resource caching** in ResourceManager
4. **Culling** in scene graph traversal
5. **Web Workers** for heavy operations (texture processing, model parsing)

---

## Mobile Considerations

1. **Touch input handling** in camera controls
2. **Responsive panel layout** that adapts to screen size
3. **Reduced default quality settings** for mobile GPUs
4. **WebGL2 capability detection** with graceful fallbacks
5. **Viewport meta tags** for proper mobile scaling

---

## Related Documents

- [PATTERNS.md](./PATTERNS.md) - Code conventions for implementation
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [TESTING.md](./TESTING.md) - How to test new modules
