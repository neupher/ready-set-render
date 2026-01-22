# Code Patterns: WebGL Editor

> **Last Updated:** 2026-01-22T23:06:00Z
> **Version:** 0.1.1

---

## Overview

This document defines the code conventions, design patterns, and best practices for the WebGL Editor project. Following these patterns ensures consistency, maintainability, and extensibility.

---

## TypeScript Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `ForwardRenderer.ts` |
| Interfaces | PascalCase with `I` prefix | `IPlugin.ts` |
| Types | PascalCase | `RenderPipelineType.ts` |
| Utilities | camelCase | `mathUtils.ts` |
| Constants | SCREAMING_SNAKE_CASE | `WEBGL_CONSTANTS.ts` |
| Tests | Same as source + `.test` | `ForwardRenderer.test.ts` |

### Code Style

```typescript
// ✅ GOOD: Explicit return types
function calculateNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  // ...
}

// ❌ BAD: Implicit return types
function calculateNormal(v1: Vec3, v2: Vec3, v3: Vec3) {
  // ...
}

// ✅ GOOD: Readonly for immutable properties
interface ISceneObject {
  readonly id: string;
  readonly name: string;
  transform: Transform;  // Mutable
}

// ✅ GOOD: Const assertions for literal types
const RENDER_MODES = ['forward', 'deferred', 'raytracing'] as const;
type RenderMode = typeof RENDER_MODES[number];
```

### Import Organization

```typescript
// 1. External libraries (if any)
import { someLib } from 'external-lib';

// 2. Core interfaces
import { IPlugin, IPluginContext } from '@core/interfaces';

// 3. Core modules
import { EventBus } from '@core/EventBus';

// 4. Utilities
import { vec3, mat4 } from '@utils/math';

// 5. Local/relative imports
import { ShaderProgram } from './ShaderProgram';
```

---

## Design Patterns

### Plugin Pattern

All features are implemented as plugins. This is the primary extensibility mechanism.

```typescript
// Every plugin MUST implement IPlugin
export class MyFeature implements IPlugin {
  readonly id = 'my-feature';
  readonly name = 'My Feature';
  readonly version = '1.0.0';
  readonly dependencies = ['core-renderer']; // Optional

  private context?: IPluginContext;

  async initialize(context: IPluginContext): Promise<void> {
    this.context = context;
    // Setup code here
  }

  async dispose(): Promise<void> {
    // Cleanup code here
    this.context = undefined;
  }
}
```

### Factory Pattern

Use factories for creating complex objects, especially when the creation logic may vary.

```typescript
// ✅ GOOD: Factory for render pipelines
interface IRenderPipelineFactory {
  create(type: RenderMode, context: WebGL2RenderingContext): IRenderPipeline;
}

class RenderPipelineFactory implements IRenderPipelineFactory {
  private readonly registry = new Map<RenderMode, () => IRenderPipeline>();

  register(type: RenderMode, factory: () => IRenderPipeline): void {
    this.registry.set(type, factory);
  }

  create(type: RenderMode, context: WebGL2RenderingContext): IRenderPipeline {
    const factory = this.registry.get(type);
    if (!factory) {
      throw new Error(`Unknown render pipeline type: ${type}`);
    }
    return factory();
  }
}
```

### Observer Pattern (Event Bus)

Modules communicate through events, not direct method calls.

```typescript
// ✅ GOOD: Loose coupling via events
class SelectionTool implements IPlugin {
  async initialize(context: IPluginContext): Promise<void> {
    // Publish events, don't call other modules directly
    this.onClick = (object: ISceneObject) => {
      context.eventBus.emit('selection:changed', { selected: [object] });
    };
  }
}

class InspectorPanel implements IPlugin {
  async initialize(context: IPluginContext): Promise<void> {
    // Subscribe to events
    context.eventBus.on('selection:changed', this.onSelectionChanged);
  }

  private onSelectionChanged = (data: { selected: ISceneObject[] }) => {
    this.displayProperties(data.selected);
  };
}
```

### Strategy Pattern

Use for swappable algorithms, especially render pipelines.

```typescript
// The active render strategy can be swapped at runtime
interface IRenderStrategy {
  render(scene: IScene, camera: ICamera): void;
}

class Renderer {
  private strategy: IRenderStrategy;

  setStrategy(strategy: IRenderStrategy): void {
    this.strategy = strategy;
  }

  render(scene: IScene, camera: ICamera): void {
    this.strategy.render(scene, camera);
  }
}
```

---

## Anti-Patterns to Avoid

### ❌ No Type-Based Conditionals

```typescript
// ❌ BAD: Type checking with conditionals
function render(object: ISceneObject) {
  if (object.type === 'mesh') {
    renderMesh(object);
  } else if (object.type === 'light') {
    renderLight(object);
  } else if (object.type === 'camera') {
    // ...
  }
}

// ✅ GOOD: Polymorphism
interface IRenderable {
  render(context: RenderContext): void;
}

class Mesh implements IRenderable {
  render(context: RenderContext): void {
    // Mesh-specific rendering
  }
}

class Light implements IRenderable {
  render(context: RenderContext): void {
    // Light-specific rendering
  }
}
```

### ❌ No Monolithic Files

```typescript
// ❌ BAD: Everything in one file
// renderer.ts - 2000+ lines with all rendering logic

// ✅ GOOD: Split by responsibility
// src/plugins/renderers/forward/
//   ├── ForwardRenderer.ts      (main class, ~200 lines)
//   ├── ForwardPass.ts          (render pass logic)
//   ├── ShadowPass.ts           (shadow mapping)
//   └── shaders/
//       ├── forward.vert
//       └── forward.frag
```

### ❌ No God Objects

```typescript
// ❌ BAD: One class that does everything
class Editor {
  render() { }
  handleInput() { }
  loadModel() { }
  saveProject() { }
  updateUI() { }
  // ... 50 more methods
}

// ✅ GOOD: Single responsibility
class Renderer { render() { } }
class InputHandler { handleInput() { } }
class ModelLoader { loadModel() { } }
class ProjectManager { saveProject() { } }
class UIManager { updateUI() { } }
```

---

## WebGL Patterns

### Shader Management

```typescript
// Always use a shader cache
class ShaderCache {
  private cache = new Map<string, WebGLProgram>();

  get(gl: WebGL2RenderingContext, key: string, vertSrc: string, fragSrc: string): WebGLProgram {
    if (!this.cache.has(key)) {
      const program = this.compile(gl, vertSrc, fragSrc);
      this.cache.set(key, program);
    }
    return this.cache.get(key)!;
  }

  dispose(gl: WebGL2RenderingContext): void {
    for (const program of this.cache.values()) {
      gl.deleteProgram(program);
    }
    this.cache.clear();
  }
}
```

### Resource Disposal

```typescript
// Always implement dispose methods
interface IDisposable {
  dispose(): void;
}

class Texture implements IDisposable {
  private handle: WebGLTexture;

  constructor(private gl: WebGL2RenderingContext) {
    this.handle = gl.createTexture()!;
  }

  dispose(): void {
    this.gl.deleteTexture(this.handle);
  }
}

// Use try/finally for critical resources
async function loadAndProcess(file: File): Promise<void> {
  const texture = new Texture(gl);
  try {
    await texture.load(file);
    // Process texture...
  } finally {
    texture.dispose();
  }
}
```

### State Management

```typescript
// Track WebGL state to avoid redundant calls
class GLStateManager {
  private currentProgram: WebGLProgram | null = null;
  private currentVAO: WebGLVertexArrayObject | null = null;

  useProgram(gl: WebGL2RenderingContext, program: WebGLProgram): void {
    if (this.currentProgram !== program) {
      gl.useProgram(program);
      this.currentProgram = program;
    }
  }

  bindVAO(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    if (this.currentVAO !== vao) {
      gl.bindVertexArray(vao);
      this.currentVAO = vao;
    }
  }
}
```

---

## Error Handling

```typescript
// Custom error types for better debugging
class ShaderCompilationError extends Error {
  constructor(
    public readonly shaderType: 'vertex' | 'fragment',
    public readonly source: string,
    public readonly log: string
  ) {
    super(`Shader compilation failed: ${log}`);
    this.name = 'ShaderCompilationError';
  }
}

// Use Result types for operations that can fail
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function loadShader(source: string): Result<WebGLShader, ShaderCompilationError> {
  // ...
}
```

---

## Documentation Standards

### JSDoc for Public APIs

```typescript
/**
 * Renders the scene using the forward rendering pipeline.
 *
 * @param scene - The scene to render
 * @param camera - The camera to render from
 * @param options - Optional render settings
 * @returns The rendered frame as a texture, or null if rendering failed
 *
 * @example
 * ```typescript
 * const frame = renderer.render(scene, camera, { antialiasing: true });
 * ```
 */
render(scene: IScene, camera: ICamera, options?: RenderOptions): WebGLTexture | null {
  // ...
}
```

### Inline Comments for Complex Logic

```typescript
// Calculate the frustum planes for culling
// We use the Gribb/Hartmann method which extracts planes directly from the VP matrix
// Reference: https://www.gamedevs.org/uploads/fast-extraction-viewing-frustum-planes-from-world-view-projection-matrix.pdf
function extractFrustumPlanes(viewProjection: Mat4): Plane[] {
  // Left plane: row 4 + row 1
  const left = vec4.add(viewProjection.row(3), viewProjection.row(0));
  // ...
}
```

---

## File Size Guidelines

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Component/Class | 300 | Extract sub-components |
| Utility file | 200 | Split by functionality |
| Interface file | 100 | Split into multiple interfaces |
| Test file | 500 | Split into multiple test files |

---

## Terminology Quick Reference

This section provides quick lookup for industry-standard naming. For full details, see [GUIDELINES.md § Industry-Standard Terminology](./GUIDELINES.md#6-industry-standard-terminology-mandatory).

**Primary Reference:** Unity terminology when variances exist between engines.

### Core Concepts

| Concept | Standard Term | Notes |
|---------|---------------|-------|
| Scene node | **GameObject** | Not "Entity", "Node", or "Actor" |
| Spatial data | **Transform** | Contains Position, Rotation, Scale |
| Feature attachment | **Component** | Not "Module", "Behaviour", or "Script" |
| Object tree | **Hierarchy** | Not "Scene Tree" or "Outliner" |
| Property viewer | **Inspector** | Not "Properties Panel" or "Details" |

### Rendering

| Concept | Standard Term | Notes |
|---------|---------------|-------|
| Base color | **Albedo** | Not "Diffuse" (PBR context) |
| Surface detail map | **Normal Map** | Not "Bump Map" (different technique) |
| Surface smoothness | **Roughness** | Unity uses Smoothness (inverse); we use Roughness |
| Metal surface | **Metallic** | Not "Metalness" |
| Render output target | **RenderTexture** | Not "FrameBuffer" (that's the GL object) |

### Shaders (GLSL)

| Context | Standard Term | Notes |
|---------|---------------|-------|
| Global parameter | `uniform` | Not "constant" or "parameter" |
| Per-vertex input | `in` (or `attribute`) | WebGL2 uses `in` |
| Vertex output | `out` (or `varying`) | WebGL2 uses `out` |
| Texture sampler | `sampler2D` | Not "texture" |
| Math types | `vec3`, `mat4` | Lowercase in GLSL, PascalCase in TS (`Vec3`) |

### UI Panel Names

| Purpose | Standard Term |
|---------|---------------|
| Object tree view | **Hierarchy** |
| Selected object properties | **Inspector** |
| 3D render view | **Scene View** |
| Asset library | **Project** |
| Runtime preview | **Game View** |
| Console output | **Console** |

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [TESTING.md](./TESTING.md) - Testing patterns
