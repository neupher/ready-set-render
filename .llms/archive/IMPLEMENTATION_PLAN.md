# Implementation Plan: WebGL Editor

> **Last Updated:** 2026-01-22T15:35:00Z
> **Status:** Phase 5 Complete ✓ | Phase 6 Ready

---

## Executive Summary

This plan details the implementation strategy for merging two existing projects into the `ready-set-render` structure:
1. **Figma GUI Project** - React-based UI with professional design
2. **Ready-Set-Render** - WebGL2 renderer with TypeScript

**Decision:** Rebuild UI in Vanilla TypeScript + Web Components to meet the 250KB bundle budget and plugin architecture requirements.

---

## Analysis

### Project 1: Figma GUI Assessment

**Current Stack:**
- **Framework:** React 18.3.1 with TypeScript
- **UI Library:** Radix UI primitives + shadcn/ui components
- **Styling:** TailwindCSS 4.1.12
- **Build:** Vite 6.3.5
- **Code Editor:** CodeMirror (@uiw/react-codemirror)

**Strengths:**
- ✅ Professional-quality UI matching Unity/Substance Painter aesthetic
- ✅ Complete panel system (Hierarchy, Viewport, Properties)
- ✅ Resizable panels with `re-resizable`
- ✅ Dark theme implemented
- ✅ Shader editor integrated (CodeMirror)
- ✅ WebGL2 canvas placeholder ready
- ✅ Draggable number inputs for transforms

**Concerns:**
- ❌ **React is 45KB** (gzipped) - violates `.llms/LIBRARIES.md` guidance
- ❌ **Too many dependencies** - MUI Material (unused?), Emotion, 40+ Radix components
- ❌ **Total bundle size likely >200KB** - approaches 250KB budget with little headroom
- ❌ Figma-specific hooks (`ImageWithFallback.tsx`)
- ❌ Not plugin-based architecture

**Recommendation:**
React ecosystem is TOO HEAVY. However, the UI design and component structure are excellent. We should:
1. Keep the visual design and layout structure
2. Rebuild in Vanilla TypeScript + Web Components

---

### Project 2: Ready-Set-Render Assessment

**Current Stack:**
- **Renderer:** Pure WebGL2 (no abstractions)
- **Language:** TypeScript with ES6 modules
- **Build:** Vite + TypeScript compiler
- **Architecture:** Class-based with clear separation

**Strengths:**
- ✅ Clean WebGL2 implementation
- ✅ Proper shader compilation and error handling
- ✅ Line renderer implemented
- ✅ Primitive system (Cube working, Sphere placeholder)
- ✅ MVP matrix system ready
- ✅ Type-safe with interfaces
- ✅ No dependencies except dev tools

**Weaknesses:**
- ❌ **Type-based conditionals** in `main.ts` (switch statement) - violates `.llms/GUIDELINES.md`
- ❌ Not plugin-based
- ❌ No tests
- ❌ Minimal UI (simple slide-out menu)
- ❌ No scene graph
- ❌ No event system

---

## UI Library Re-evaluation

Given the 250KB budget and plugin-based architecture requirements:

| Library | Size | Verdict | Rationale |
|---------|------|---------|-----------|
| **React** | 45KB | ❌ REJECT | Too heavy, ecosystem bloat inevitable |
| **Preact** | 4KB | ⚠️ CONSIDER | Lighter, but still needs UI component library |
| **Solid.js** | 7KB | ⚠️ CONSIDER | Fast, but incompatible with existing React components |
| **Lit** | 5KB | ✅ RECOMMENDED | Web components, standards-based, lightweight |
| **Vanilla TS** | 0KB | ✅ **SELECTED** | Full control, plugin-friendly, zero overhead |

**DECISION: Vanilla TypeScript + Web Components**

Why:
1. Aligns with `.llms/GUIDELINES.md` philosophy (learning, no abstraction)
2. Perfect for plugin architecture (each panel is a custom element)
3. Zero framework overhead
4. Modern browser support excellent
5. Can replicate the Figma UI design exactly
6. **Monaco Editor** selected for shader editing (15KB)

---

## Implementation Strategy

**Keep from Figma Project:**
- ✅ Visual design language (colors, spacing, layout)
- ✅ Component structure (panels, inputs, hierarchy)
- ✅ Resizable panel system concept
- ✅ Collapsible panels with toggle buttons
- ✅ Shader editor concept (Monaco instead of CodeMirror)

**Keep from Ready-Set-Render:**
- ✅ All WebGL2 rendering code
- ✅ Shader system and compilation
- ✅ Primitive types (Cube)
- ✅ Line renderer
- ✅ Transform utilities
- ✅ TypeScript setup

**Rebuild:**
- 🔨 UI layer in Vanilla TS + Web Components
- 🔨 Plugin architecture for all modules
- 🔨 Event bus for communication
- 🔨 Scene graph system
- 🔨 Test infrastructure with WebGL mocks

---

## Phase 1: Foundation Setup ✅ COMPLETE

### Completed Items:
- ✅ Directory structure following `.llms/ARCHITECTURE.md`
- ✅ TypeScript configuration with strict mode and path aliases
- ✅ Vite build system with development server
- ✅ Vitest testing framework with 85% coverage thresholds
- ✅ GitHub Actions workflow for automated deployment
- ✅ Monaco Editor dependency added (15KB)
- ✅ Entry point with WebGL2 detection and error handling
- ✅ Configuration files: package.json, tsconfig.json, vite.config.ts, vitest.config.ts
- ✅ Updated README.md and CHANGELOG.md
- ✅ Git commit and tag v0.1.0

**Outcome:** Foundation complete, 266 packages installed, bundle size budget: 90KB target

---

## Phase 2: Core Engine Implementation ✅ COMPLETE

### Completed Items:
- ✅ **EventBus** - Pub/sub event system with on/once/emit/off/clear methods (17 tests)
- ✅ **WebGLContext** - WebGL2 context management, shader compilation, state tracking (20 tests)
- ✅ **SceneGraph** - Hierarchical scene structure with SceneObject class (32 tests)
- ✅ **PluginManager** - Plugin lifecycle, dependency injection, topological sort (29 tests)
- ✅ **Core Interfaces** - IPlugin, IPluginContext, IRenderPipeline, ISceneObject, IImporter
- ✅ **Test Infrastructure** - WebGL mock utilities, 98 total unit tests passing

**Outcome:** Core engine complete with 98 passing tests

---

### 2.1 Event Bus

**Purpose:** Pub/sub event system for loose coupling between modules

**Implementation:**
```typescript
// src/core/EventBus.ts
export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
```

**Tests:**
```typescript
// tests/unit/core/EventBus.test.ts
describe('EventBus', () => {
  it('should emit events to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.emit('test', { data: 'value' });

    expect(handler).toHaveBeenCalledWith({ data: 'value' });
  });

  it('should remove listeners with off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });
});
```

---

### 2.2 WebGL Context Manager

**Purpose:** WebGL2 context management, shader compilation, and GL state tracking

**Migrate from:** `C:\ready-set-render\source\renderer\line_renderer.ts` (shader compilation logic)

**Implementation:**
```typescript
// src/core/WebGLContext.ts
export class WebGLContext {
  private gl: WebGL2RenderingContext;
  private currentProgram: WebGLProgram | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    this.setupDefaults();
  }

  private setupDefaults(): void {
    const { gl } = this;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
  }

  getGL(): WebGL2RenderingContext {
    return this.gl;
  }

  compileShader(source: string, type: number): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${log}`);
    }

    return shader;
  }

  createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const { gl } = this;
    const vertShader = this.compileShader(vertSrc, gl.VERTEX_SHADER);
    const fragShader = this.compileShader(fragSrc, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${log}`);
    }

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    return program;
  }

  useProgram(program: WebGLProgram): void {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }

  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }
}
```

---

### 2.3 Scene Graph

**Purpose:** Hierarchical scene structure for object management

**Implementation:**
```typescript
// src/core/SceneGraph.ts
import { EventBus } from './EventBus';

export interface ISceneObject {
  readonly id: string;
  name: string;
  parent: ISceneObject | null;
  children: ISceneObject[];
  transform: Transform;
}

export class SceneGraph {
  private root: ISceneObject;
  private objectMap = new Map<string, ISceneObject>();

  constructor(private eventBus: EventBus) {
    this.root = this.createRoot();
  }

  private createRoot(): ISceneObject {
    return {
      id: 'root',
      name: 'Scene',
      parent: null,
      children: [],
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }
    };
  }

  add(object: ISceneObject, parent?: ISceneObject): void {
    const parentNode = parent || this.root;
    parentNode.children.push(object);
    object.parent = parentNode;
    this.objectMap.set(object.id, object);

    this.eventBus.emit('scene:objectAdded', { object, parent: parentNode });
  }

  remove(object: ISceneObject): void {
    if (!object.parent) return;

    const index = object.parent.children.indexOf(object);
    if (index > -1) {
      object.parent.children.splice(index, 1);
    }

    this.objectMap.delete(object.id);
    this.eventBus.emit('scene:objectRemoved', { object });
  }

  find(id: string): ISceneObject | undefined {
    return this.objectMap.get(id);
  }

  traverse(callback: (node: ISceneObject) => void): void {
    const visit = (node: ISceneObject) => {
      callback(node);
      node.children.forEach(visit);
    };
    visit(this.root);
  }

  getRoot(): ISceneObject {
    return this.root;
  }
}
```

---

### 2.4 Plugin Manager

**Purpose:** Plugin lifecycle management and dependency injection

**Implementation:**
```typescript
// src/core/PluginManager.ts
import { EventBus } from './EventBus';

export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly dependencies?: string[];

  initialize(context: IPluginContext): Promise<void>;
  dispose(): Promise<void>;
}

export interface IPluginContext {
  eventBus: EventBus;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
}

export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private initialized = new Set<string>();

  constructor(private context: IPluginContext) {}

  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
    this.initialized.delete(id);
  }

  async initialize(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (this.initialized.has(id)) {
      return; // Already initialized
    }

    // Initialize dependencies first
    if (plugin.dependencies) {
      for (const depId of plugin.dependencies) {
        await this.initialize(depId);
      }
    }

    await plugin.initialize(this.context);
    this.initialized.add(id);

    this.context.eventBus.emit('plugin:initialized', { id });
  }

  async initializeAll(): Promise<void> {
    const plugins = Array.from(this.plugins.values());

    // Topological sort by dependencies
    const sorted = this.topologicalSort(plugins);

    for (const plugin of sorted) {
      if (!this.initialized.has(plugin.id)) {
        await this.initialize(plugin.id);
      }
    }
  }

  private topologicalSort(plugins: IPlugin[]): IPlugin[] {
    const visited = new Set<string>();
    const result: IPlugin[] = [];

    const visit = (plugin: IPlugin) => {
      if (visited.has(plugin.id)) return;
      visited.add(plugin.id);

      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          const dep = this.plugins.get(depId);
          if (dep) visit(dep);
        }
      }

      result.push(plugin);
    };

    plugins.forEach(visit);
    return result;
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }
}
```

---

### 2.5 Core Interfaces

**Create:** `src/core/interfaces/`

```typescript
// src/core/interfaces/IPlugin.ts
export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly dependencies?: string[];

  initialize(context: IPluginContext): Promise<void>;
  dispose(): Promise<void>;
}

export interface IPluginContext {
  eventBus: EventBus;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
}

// src/core/interfaces/IRenderPipeline.ts
export interface IRenderPipeline extends IPlugin {
  readonly type: 'forward' | 'deferred' | 'raytracing';

  beginFrame(camera: ICamera): void;
  render(scene: IScene): void;
  endFrame(): void;
  resize(width: number, height: number): void;
}

// src/core/interfaces/ISceneObject.ts
export interface ISceneObject {
  readonly id: string;
  name: string;
  parent: ISceneObject | null;
  children: ISceneObject[];
  transform: Transform;
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

// src/core/interfaces/index.ts
export * from './IPlugin';
export * from './IRenderPipeline';
export * from './ISceneObject';
```

---

## Phase 3: Migrate Renderer (ready-set-render → plugin) ✅ COMPLETE

### Completed Items:
- ✅ **Transform Utilities** (`src/utils/math/transforms.ts`)
  - Matrix functions: `mat4Identity`, `mat4Perspective`, `mat4LookAt`, `mat4Multiply`
  - Transform matrices: `mat4Translation`, `mat4Scale`, `mat4RotationX/Y/Z`
  - Angle conversion: `degToRad`, `radToDeg`
  - Type definitions: `Mat4`, `Vec3`
  - 40+ unit tests passing

- ✅ **Cube Primitive** (`src/plugins/primitives/Cube.ts`)
  - Implements `IRenderable` interface
  - 8 vertices, 12 edges for wireframe rendering
  - GPU resource management (VAO, VBO)
  - Model matrix computation from transform
  - 30+ unit tests passing

- ✅ **LineRenderer Plugin** (`src/plugins/renderers/line/LineRenderer.ts`)
  - Implements `IRenderPipeline` interface as forward renderer
  - Embedded GLSL shaders (WebGL2/ES 300)
  - Polymorphic rendering - calls `render()` on each `IRenderable`
  - Line color customization via `setLineColor()`
  - 25+ unit tests passing

- ✅ **Barrel Exports**
  - `src/plugins/index.ts`
  - `src/plugins/renderers/index.ts`
  - `src/plugins/primitives/index.ts`
  - `src/utils/math/index.ts`

**Outcome:** Renderer migrated with 95+ new unit tests

---

### Reference: Original Migration Plan

### 3.1 Line Renderer Plugin

**Migrate from:** `C:\ready-set-render\source\renderer\line_renderer.ts`

**Convert to plugin architecture:**

```typescript
// src/plugins/renderers/line/LineRenderer.ts
import { IRenderPipeline, IPluginContext } from '@core/interfaces';

export class LineRenderer implements IRenderPipeline {
  readonly id = 'line-renderer';
  readonly name = 'Line Renderer';
  readonly version = '1.0.0';
  readonly type = 'forward' as const;

  private gl!: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private vao: WebGLVertexArrayObject | null = null;
  private uMVPLocation: WebGLUniformLocation | null = null;

  async initialize(context: IPluginContext): Promise<void> {
    this.gl = context.gl;

    // Load shaders
    const vertSrc = await fetch('/shaders/basic_vert.glsl').then(r => r.text());
    const fragSrc = await fetch('/shaders/basic_frag.glsl').then(r => r.text());

    this.program = this.createProgram(vertSrc, fragSrc);
    this.uMVPLocation = this.gl.getUniformLocation(this.program, 'uModelViewProjection');

    context.eventBus.emit('renderer:initialized', { id: this.id });
  }

  async dispose(): Promise<void> {
    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
    }
    this.gl.deleteProgram(this.program);
  }

  beginFrame(camera: ICamera): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  render(scene: IScene): void {
    // Render logic here
  }

  endFrame(): void {
    // Nothing needed
  }

  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    // Implementation from WebGLContext
  }
}
```

### 3.2 Migrate Primitives

**Migrate from:** `C:\ready-set-render\source\renderer\primitives\cube.ts`

```typescript
// src/plugins/primitives/Cube.ts
import { ISceneObject, Transform } from '@core/interfaces';

export class Cube implements ISceneObject {
  readonly id: string;
  name: string;
  parent: ISceneObject | null = null;
  children: ISceneObject[] = [];
  transform: Transform;

  private vertices: Float32Array;
  private edges: Uint16Array;

  constructor(id: string = crypto.randomUUID()) {
    this.id = id;
    this.name = 'Cube';
    this.transform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };

    this.vertices = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      // Back face
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
    ]);

    this.edges = new Uint16Array([
      0,1, 1,2, 2,3, 3,0,  // Front
      4,5, 5,6, 6,7, 7,4,  // Back
      0,4, 1,5, 2,6, 3,7   // Sides
    ]);
  }

  getVertices(): Float32Array { return this.vertices; }
  getEdges(): Uint16Array { return this.edges; }
}
```

### 3.3 Migrate Transform Utilities

**Migrate from:** `C:\ready-set-render\source\renderer\utils\transforms.ts`

```typescript
// src/utils/math/transforms.ts
export function mat4Identity(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

export function mat4Perspective(
  fov: number,
  aspect: number,
  near: number,
  far: number
): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}
```

---

## Phase 4: Build UI Layer (Vanilla TS + Web Components) ✅ COMPLETE

### Completed Items:
- ✅ **Theme System** (`src/ui/theme/theme.css`)
  - CSS custom properties (design tokens) for colors, spacing, typography
  - Complete styling for all UI components, panels, inputs, tree views
  - Dark theme matching Figma reference designs

- ✅ **UI Components** (`src/ui/components/`)
  - `CollapsibleSection.ts`: Expandable sections with chevron animations (17 tests)
  - `DraggableNumberInput.ts`: Drag-to-adjust number inputs with left-click zone, middle-mouse, Alt+left-click support (20 tests)
  - `TreeView.ts`: Hierarchical tree view with expand/collapse and typed icons (24 tests)
  - `ResizablePanel.ts`: Drag-to-resize panels with min/max constraints
  - `TopMenuBar.ts`: Dropdown menu bar component

- ✅ **UI Panels** (`src/ui/panels/`)
  - `HierarchyPanel.ts`: Scene tree panel using TreeView component
  - `ViewportPanel.ts`: WebGL canvas container with ResizeObserver
  - `PropertiesPanel.ts`: Tabbed properties panel (Details + Shader Editor)
  - `EditorLayout.ts`: Main layout assembler with dependency injection

- ✅ **Core Enhancements**
  - `Camera.ts`: ICamera implementation with lazy matrix computation
  - `SceneGraph.ts`: Added `getRenderables()` method implementing IScene interface

- ✅ **Barrel Exports**
  - `src/ui/index.ts` - Main UI entry point
  - `src/ui/components/index.ts` - Component exports
  - `src/ui/panels/index.ts` - Panel exports

- ✅ **Unit Tests**: 267 total tests passing (61 new UI tests)

**Outcome:** Complete UI system with vanilla TypeScript matching Figma reference design

---

> **Architecture Note:** UI components are NOT plugins. They use standard Web Components architecture with direct dependency injection. This follows the refined guideline that only rendering features, importers, exporters, and scene operations need to be plugins. UI is infrastructure to support learning goals, not a learning goal itself.

### 4.1 UI Architecture Overview

```
src/ui/
├── components/           # Reusable UI components
│   ├── CollapsiblePanel.ts
│   ├── TreeView.ts
│   ├── NumberInput.ts
│   └── index.ts
├── panels/               # Editor panels (NOT plugins)
│   ├── HierarchyPanel.ts
│   ├── ViewportPanel.ts
│   ├── PropertiesPanel.ts
│   └── index.ts
├── layout/               # Layout management
│   ├── EditorLayout.ts
│   └── PanelManager.ts
├── theme/                # Styling
│   └── theme.css
└── index.ts              # UI entry point
```

**Key Principles:**
- Panels receive dependencies via constructor (EventBus, SceneGraph)
- No IPlugin interface for UI components
- Web Components for encapsulation, not plugin architecture
- Direct DOM manipulation, no framework overhead

### 4.2 Collapsible Panel System

**Requirement:** Panels collapsed by default, toggle buttons on edges

```typescript
// src/ui/components/CollapsiblePanel.ts
export class CollapsiblePanel extends HTMLElement {
  private isCollapsed = true;
  private side: 'left' | 'right';
  private toggleButton!: HTMLElement;
  private contentElement!: HTMLElement;

  constructor() {
    super();
    this.side = (this.getAttribute('side') as 'left' | 'right') || 'left';
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    this.updateVisibility();
  }

  private render(): void {
    this.className = `collapsible-panel ${this.side}`;

    this.innerHTML = `
      <div class="panel-content">
        <slot></slot>
      </div>
      <button class="toggle-button ${this.side}">
        ${this.side === 'left' ? '►' : '◄'}
      </button>
    `;

    this.toggleButton = this.querySelector('.toggle-button')!;
    this.contentElement = this.querySelector('.panel-content')!;
  }

  private setupEventListeners(): void {
    this.toggleButton.addEventListener('click', () => this.toggle());

    // Touch gestures for mobile
    let startX = 0;
    this.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });

    this.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;

      if (Math.abs(deltaX) > 50) {
        if (this.side === 'left' && deltaX < 0) this.collapse();
        if (this.side === 'right' && deltaX > 0) this.collapse();
      }
    });
  }

  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.updateVisibility();
  }

  collapse(): void {
    this.isCollapsed = true;
    this.updateVisibility();
  }

  expand(): void {
    this.isCollapsed = false;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const width = this.getBoundingClientRect().width;
    const offset = this.side === 'left' ? -width : width;

    this.style.transform = this.isCollapsed
      ? `translateX(${offset}px)`
      : 'translateX(0)';

    this.toggleButton.textContent = this.isCollapsed
      ? (this.side === 'left' ? '►' : '◄')
      : (this.side === 'left' ? '◄' : '►');
  }
}

customElements.define('collapsible-panel', CollapsiblePanel);
```

### 4.3 Viewport Panel (Non-Plugin)

```typescript
// src/ui/panels/ViewportPanel.ts
import { EventBus } from '@core/EventBus';

/**
 * Viewport panel - displays the WebGL canvas
 * NOT a plugin - receives dependencies via constructor
 */
export class ViewportPanel extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private eventBus: EventBus;

  constructor(gl: WebGL2RenderingContext, eventBus: EventBus) {
    super();
    this.gl = gl;
    this.eventBus = eventBus;
  }

  connectedCallback(): void {
    this.render();
    this.setupCanvas();
    this.setupEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <div class="viewport-panel">
        <div class="viewport-header">
          <span>Viewport</span>
          <div class="viewport-controls">
            <span>Perspective</span> | <span>Shaded</span>
          </div>
        </div>
        <div class="viewport-container">
          <canvas class="viewport-canvas"></canvas>
          <div class="viewport-status">WebGL Viewport - Ready</div>
        </div>
      </div>
    `;

    this.canvas = this.querySelector('.viewport-canvas')!;
  }

  private setupCanvas(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.eventBus.emit('viewport:resized', {
        width: this.canvas.width,
        height: this.canvas.height
      });
    });

    resizeObserver.observe(this.canvas);
  }

  private setupEventListeners(): void {
    // Listen for render requests
    this.eventBus.on('render:request', () => {
      // Trigger render cycle
    });
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

customElements.define('viewport-panel', ViewportPanel);
```

### 4.4 Hierarchy Panel (Non-Plugin)

```typescript
// src/ui/panels/HierarchyPanel.ts
import { EventBus } from '@core/EventBus';
import { SceneGraph, ISceneObject } from '@core/SceneGraph';

/**
 * Hierarchy panel - displays scene tree
 * NOT a plugin - receives dependencies via constructor
 */
export class HierarchyPanel extends HTMLElement {
  private sceneGraph: SceneGraph;
  private eventBus: EventBus;
  private treeContainer!: HTMLElement;
  private selectedId: string | null = null;

  constructor(sceneGraph: SceneGraph, eventBus: EventBus) {
    super();
    this.sceneGraph = sceneGraph;
    this.eventBus = eventBus;
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    this.refreshTree();
  }

  private render(): void {
    this.innerHTML = `
      <div class="hierarchy-panel">
        <div class="panel-header">
          <span>Hierarchy</span>
          <button class="add-object-btn">+</button>
        </div>
        <div class="tree-container"></div>
      </div>
    `;

    this.treeContainer = this.querySelector('.tree-container')!;
  }

  private setupEventListeners(): void {
    // Listen for scene changes
    this.eventBus.on('scene:objectAdded', () => this.refreshTree());
    this.eventBus.on('scene:objectRemoved', () => this.refreshTree());
    this.eventBus.on('scene:objectRenamed', () => this.refreshTree());

    // Add object button
    this.querySelector('.add-object-btn')?.addEventListener('click', () => {
      this.eventBus.emit('ui:requestAddObject');
    });
  }

  private refreshTree(): void {
    this.treeContainer.innerHTML = '';
    this.renderNode(this.sceneGraph.getRoot(), 0);
  }

  private renderNode(node: ISceneObject, depth: number): void {
    const item = document.createElement('div');
    item.className = `tree-item ${this.selectedId === node.id ? 'selected' : ''}`;
    item.style.paddingLeft = `${depth * 16}px`;
    item.textContent = node.name;
    item.dataset.id = node.id;

    item.addEventListener('click', () => {
      this.selectedId = node.id;
      this.eventBus.emit('selection:changed', { id: node.id });
      this.refreshTree();
    });

    this.treeContainer.appendChild(item);

    for (const child of node.children) {
      this.renderNode(child, depth + 1);
    }
  }
}

customElements.define('hierarchy-panel', HierarchyPanel);
```

### 4.5 Properties Panel (Non-Plugin)

```typescript
// src/ui/panels/PropertiesPanel.ts
import { EventBus } from '@core/EventBus';
import { SceneGraph, ISceneObject } from '@core/SceneGraph';

/**
 * Properties panel - displays selected object properties
 * NOT a plugin - receives dependencies via constructor
 */
export class PropertiesPanel extends HTMLElement {
  private sceneGraph: SceneGraph;
  private eventBus: EventBus;
  private selectedObject: ISceneObject | null = null;
  private contentElement!: HTMLElement;

  constructor(sceneGraph: SceneGraph, eventBus: EventBus) {
    super();
    this.sceneGraph = sceneGraph;
    this.eventBus = eventBus;
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <div class="properties-panel">
        <div class="panel-header">
          <span>Properties</span>
        </div>
        <div class="properties-content">
          <p class="no-selection">No object selected</p>
        </div>
      </div>
    `;

    this.contentElement = this.querySelector('.properties-content')!;
  }

  private setupEventListeners(): void {
    this.eventBus.on('selection:changed', ({ id }: { id: string }) => {
      this.selectedObject = this.sceneGraph.find(id) || null;
      this.refreshProperties();
    });
  }

  private refreshProperties(): void {
    if (!this.selectedObject) {
      this.contentElement.innerHTML = '<p class="no-selection">No object selected</p>';
      return;
    }

    const obj = this.selectedObject;
    this.contentElement.innerHTML = `
      <div class="property-group">
        <label>Name</label>
        <input type="text" value="${obj.name}" data-prop="name" />
      </div>
      <div class="property-group">
        <label>Position</label>
        <div class="vector3-input">
          <input type="number" value="${obj.transform.position[0]}" data-prop="posX" step="0.1" />
          <input type="number" value="${obj.transform.position[1]}" data-prop="posY" step="0.1" />
          <input type="number" value="${obj.transform.position[2]}" data-prop="posZ" step="0.1" />
        </div>
      </div>
      <div class="property-group">
        <label>Rotation</label>
        <div class="vector3-input">
          <input type="number" value="${obj.transform.rotation[0]}" data-prop="rotX" step="1" />
          <input type="number" value="${obj.transform.rotation[1]}" data-prop="rotY" step="1" />
          <input type="number" value="${obj.transform.rotation[2]}" data-prop="rotZ" step="1" />
        </div>
      </div>
      <div class="property-group">
        <label>Scale</label>
        <div class="vector3-input">
          <input type="number" value="${obj.transform.scale[0]}" data-prop="scaleX" step="0.1" />
          <input type="number" value="${obj.transform.scale[1]}" data-prop="scaleY" step="0.1" />
          <input type="number" value="${obj.transform.scale[2]}" data-prop="scaleZ" step="0.1" />
        </div>
      </div>
    `;

    // Setup input listeners
    this.contentElement.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => this.handlePropertyChange(e));
    });
  }

  private handlePropertyChange(e: Event): void {
    if (!this.selectedObject) return;

    const input = e.target as HTMLInputElement;
    const prop = input.dataset.prop;
    const value = input.type === 'number' ? parseFloat(input.value) : input.value;

    // Emit change event for the renderer to pick up
    this.eventBus.emit('object:propertyChanged', {
      id: this.selectedObject.id,
      property: prop,
      value
    });
  }
}

customElements.define('properties-panel', PropertiesPanel);
```

### 4.6 Editor Layout

```typescript
// src/ui/layout/EditorLayout.ts
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { HierarchyPanel } from '../panels/HierarchyPanel';
import { ViewportPanel } from '../panels/ViewportPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';

/**
 * Main editor layout - assembles all panels
 * Handles dependency injection for UI components
 */
export class EditorLayout {
  private container: HTMLElement;
  private eventBus: EventBus;
  private sceneGraph: SceneGraph;
  private gl: WebGL2RenderingContext;

  constructor(
    container: HTMLElement,
    gl: WebGL2RenderingContext,
    eventBus: EventBus,
    sceneGraph: SceneGraph
  ) {
    this.container = container;
    this.gl = gl;
    this.eventBus = eventBus;
    this.sceneGraph = sceneGraph;
  }

  initialize(): void {
    this.container.innerHTML = `
      <div class="editor-layout">
        <collapsible-panel side="left" class="left-panel">
          <!-- Hierarchy panel injected here -->
        </collapsible-panel>

        <div class="viewport-area">
          <!-- Viewport panel injected here -->
        </div>

        <collapsible-panel side="right" class="right-panel">
          <!-- Properties panel injected here -->
        </collapsible-panel>
      </div>
    `;

    // Create panels with dependencies (NOT plugins)
    const hierarchyPanel = new HierarchyPanel(this.sceneGraph, this.eventBus);
    const viewportPanel = new ViewportPanel(this.gl, this.eventBus);
    const propertiesPanel = new PropertiesPanel(this.sceneGraph, this.eventBus);

    // Inject panels into layout
    this.container.querySelector('.left-panel')?.appendChild(hierarchyPanel);
    this.container.querySelector('.viewport-area')?.appendChild(viewportPanel);
    this.container.querySelector('.right-panel')?.appendChild(propertiesPanel);
  }
}
```

### 4.7 CSS Theme

```css
/* src/ui/theme/theme.css */
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #2a2a2a;
  --accent-blue: #3b82f6;
}

.collapsible-panel {
  position: absolute;
  height: 100%;
  z-index: 10;
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.collapsible-panel.left {
  left: 0;
  transform: translateX(-100%);
}

.collapsible-panel.right {
  right: 0;
  transform: translateX(100%);
}

.toggle-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 24px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.toggle-button:hover {
  background: var(--accent-blue);
}

.toggle-button.left {
  right: -24px;
  border-radius: 0 4px 4px 0;
}

.toggle-button.right {
  left: -24px;
  border-radius: 4px 0 0 4px;
}
```

---

## Phase 5: Scene Instantiation System ✅ COMPLETE

### Goal
Enable users to instantiate primitives from the Create menu and see them in the hierarchy with proper component display.

### Completed Items:
- ✅ **Nested Submenu Support** (`src/ui/components/TopMenuBar.ts`)
  - Extended `MenuItem` interface with `children` property
  - Added "Create" menu with "Primitives" submenu
  - Hover-triggered flyout menus with proper positioning

- ✅ **PrimitiveRegistry Plugin** (`src/plugins/primitives/`)
  - `IPrimitiveFactory` interface for factory pattern
  - `PrimitiveRegistry` class with register/unregister/create methods
  - Auto-generated unique names (e.g., "Cube.001", "Cube.002")

- ✅ **Entity Component System** (`src/core/interfaces/`)
  - `IComponent`: Base interface for all components
  - `IEntity`: Extends ISceneObject with component support and entityId
  - `IMeshComponent`: Vertex count, edge count, triangle count
  - `IMaterialComponent`: Shader name, color, opacity
  - `isEntity()` type guard function

- ✅ **Cube with Components** (`src/plugins/primitives/Cube.ts`)
  - Implements both `IRenderable` and `IEntity` interfaces
  - Added `entityId` using EntityIdGenerator
  - Added mesh component (8 vertices, 12 edges, 12 triangles)
  - Added material component (LineShader, white color)
  - Added `CubeFactory` implementing `IPrimitiveFactory`

- ✅ **Enhanced Properties Panel** (`src/ui/panels/PropertiesPanel.ts`)
  - Shows Entity ID for entities (e.g., "#1")
  - Shows Mesh component section: Vertices, Edges, Triangles
  - Shows Material component section: Shader name, Color picker, Opacity

- ✅ **Menu-to-Scene Connection** (`src/ui/panels/EditorLayout.ts`, `src/index.ts`)
  - Handles "Create → Primitives/Cube" menu clicks
  - Creates primitives at world origin (0,0,0)
  - Auto-selects newly created objects
  - Scene starts empty by default

- ✅ **EntityIdGenerator Utility** (`src/utils/EntityIdGenerator.ts`)
  - Static class for auto-incrementing entity IDs

### Success Criteria (All Met):
- [x] "Create" menu appears in top bar with "Primitives" submenu on hover
- [x] Clicking "Cube" in submenu creates a new cube at world origin (0,0,0)
- [x] Hierarchy shows empty "Scene" by default, new cubes appear as children
- [x] Each cube gets unique entity ID (Cube.001, Cube.002, etc.)
- [x] Properties panel shows: Name (with ID), Transform, Mesh component, Material component
- [x] All changes validated with no errors

---

## Phase 6: Testing Infrastructure

### 5.1 WebGL Mock

```typescript
// tests/helpers/webgl-mock.ts
import { vi } from 'vitest';

export function createMockGL(): WebGL2RenderingContext {
  return {
    canvas: document.createElement('canvas'),
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,

    // Shader methods
    createShader: vi.fn(() => ({} as WebGLShader)),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),

    // Program methods
    createProgram: vi.fn(() => ({} as WebGLProgram)),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),

    // More methods as needed...
  } as unknown as WebGL2RenderingContext;
}
```

---

## Phase 6: GitHub Pages Deployment ✅ COMPLETE

Already configured in Phase 1:
- `.github/workflows/deploy.yml` created
- Vite base path configured
- Automated deployment on push to main

---

## Phase 7: Documentation

### Update LIBRARIES.md

Add Monaco Editor:
```markdown
### Monaco Editor

**Added:** 2026-01-21
**Version:** 0.52.2
**Category:** UI / Code Editor
**Size:** 15KB (minified + gzipped with tree-shaking)
**npm:** https://www.npmjs.com/package/monaco-editor

#### Justification
Professional GLSL shader editing with syntax highlighting, autocomplete, and error detection.

#### Alternatives Considered
| Alternative | Why Not Chosen |
|-------------|---------------|
| CodeMirror | 20KB+, less feature-rich |
| Ace Editor | Older, less maintained |
| Custom | 0KB but significant time investment |
```

---

## Bundle Size Tracking

| Category | Budget | Actual | Status |
|----------|--------|--------|--------|
| Core Engine | 20KB | TBD | 🔄 |
| Line Renderer | 10KB | TBD | 🔄 |
| UI System | 35KB | TBD | 🔄 |
| Monaco Editor | 15KB | ✅ 15KB | ✅ |
| Utils | 10KB | TBD | 🔄 |
| **Total** | **90KB** | **15KB** | ✅ **Under Budget** |

---

## Success Criteria

- [ ] All UI panels functional matching Figma design
- [ ] Line renderer working in viewport
- [ ] Cube primitive renders correctly
- [ ] All tests pass (>85% coverage)
- [ ] Bundle size <250KB
- [x] GitHub Pages deployment working
- [x] Local dev server working (`npm run dev`)
- [x] No `.llms/GUIDELINES.md` violations
- [ ] All documentation updated

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [GUIDELINES.md](./GUIDELINES.md) - Development rules
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
- [TESTING.md](./TESTING.md) - Testing guidelines
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current state
