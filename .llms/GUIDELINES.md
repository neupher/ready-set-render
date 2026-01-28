# Development Guidelines: WebGL Editor

> **Last Updated:** 2026-01-28T12:15:00Z
> **Version:** 0.1.3

---

## Purpose

These guidelines are **mandatory rules** that Claude (AI assistant) and developers must follow. They ensure the project remains maintainable, extensible, and aligned with its core goals.

---

## Core Constraints

### 1. Plugin-Based Architecture (MANDATORY)

**Rendering features, importers, exporters, and scene operations MUST be implemented as plugins.**

UI components use standard Web Components architecture and are NOT required to be plugins.

#### What MUST Be Plugins

| Category | Examples | Rationale |
|----------|----------|-----------|
| **Render Pipelines** | Forward, Deferred, Raytracing | Hot-swappable at runtime |
| **Importers** | OBJ, GLTF, FBX | Extensible format support |
| **Exporters** | OBJ, GLTF, PNG | Extensible output formats |
| **Primitives** | Cube, Sphere, Plane | Extensible geometry |
| **Post-Processing** | Bloom, SSAO, Tonemapping | Composable effects |
| **Scene Operations** | Transform tools, snapping | Extensible tooling |

#### What Should NOT Be Plugins

| Category | Examples | Rationale |
|----------|----------|-----------|
| **UI Panels** | Hierarchy, Properties, Viewport | Fixed editor shell |
| **UI Components** | Buttons, inputs, trees | Standard building blocks |
| **Layout System** | Docking, resizing | Core infrastructure |
| **Core Systems** | EventBus, SceneGraph | Foundation, not features |

```
✅ ALLOWED:
- Adding new render pipelines as plugins
- Creating new importers/exporters as plugins
- Implementing new scene tools as plugins

❌ FORBIDDEN:
- Adding rendering features directly to core modules
- Creating global singletons outside the plugin system
- Hard-coding renderer logic into the application shell
- Forcing UI components into the plugin interface
```

**Why UI is excluded:** The learning goals focus on WebGL2 rendering, not UI architecture. UI is infrastructure to support these goals. Real editors (Unity, Blender, Substance) have fixed UI shells with plugin systems for features.

### 2. No Bloated Libraries (MANDATORY)

**Avoid heavy abstraction libraries. Prefer minimal, focused libraries or custom implementations.**

Rationale: This project exists for learning. Heavy abstractions hide the underlying concepts.

```
✅ ALLOWED:
- Lightweight utility libraries (e.g., gl-matrix for math)
- Focused, single-purpose libraries
- Custom implementations for learning purposes

❌ FORBIDDEN:
- Three.js (too much abstraction)
- Babylon.js (too much abstraction)
- Full game engines
```

### 3. WebGL2 Only (MANDATORY)

**All rendering code MUST use WebGL2.**

- No WebGL1 fallbacks
- No WebGPU (future consideration, separate branch)
- Target modern browsers (Chrome, Firefox, Safari, Edge)

### 4. Open/Closed Principle (MANDATORY)

**New behavior MUST be addable without modifying existing code.**

```
✅ GOOD: Adding a new render pipeline
   - Create new plugin file
   - Register with PluginManager
   - No changes to existing files

❌ BAD: Adding a new render pipeline
   - Modify switch statement in Renderer.ts
   - Add new conditional branches
   - Change existing pipeline code
```

### 5. No Type-Based Conditionals (MANDATORY)

**Do NOT use if/else or switch statements based on object types.**

```typescript
// ❌ FORBIDDEN
if (object.type === 'mesh') { renderMesh(object); }
else if (object.type === 'light') { renderLight(object); }

// ✅ REQUIRED
object.render(context); // Polymorphism
```

### 6. Undo/Redo Integration (MANDATORY)

**ALL features that modify data MUST integrate with the Command History system.**

The project uses the Command Pattern for undo/redo. Direct data mutation is forbidden for any user-facing operation.

#### The Rule

```typescript
// ❌ FORBIDDEN - Direct mutation
entity.transform.position[0] = newX;
eventBus.emit('entity:propertyUpdated', { ... });

// ✅ REQUIRED - Via Command History
const command = new PropertyChangeCommand(
  entity.id,
  'position.x',
  entity.transform.position[0],  // old value
  newX,                          // new value
  sceneGraph,
  eventBus
);
commandHistory.execute(command);  // This applies the change AND enables undo
```

#### What MUST Use Commands

| Operation Type | Example | Command Type |
|---------------|---------|--------------|
| Property changes | Position, rotation, FOV, color | `PropertyChangeCommand` |
| Text editing | Shader editor content | `TextEditCommand` |
| Entity creation | Create Cube | `CreateEntityCommand` |
| Entity deletion | Delete from hierarchy | `DeleteEntityCommand` |
| Component changes | Add/remove components | `ComponentCommand` |
| Batch operations | Multi-select transform | `CompositeCommand` |

#### Creating New Commands

When implementing a new feature that modifies data:

1. **Create a command class** implementing `ICommand`
2. **Implement `execute()`** with the forward operation
3. **Implement `undo()`** with the reverse operation
4. **Implement `canMergeWith()` / `mergeWith()`** if rapid changes should coalesce
5. **Execute via `commandHistory.execute(command)`**

```typescript
// Example: Custom command for a new feature
export class MyFeatureCommand implements ICommand {
  readonly type = 'MyFeature';
  readonly description: string;
  readonly timestamp = Date.now();

  constructor(
    private readonly oldState: MyState,
    private readonly newState: MyState,
    private readonly target: MyTarget
  ) {
    this.description = `Change ${target.name}`;
  }

  execute(): void {
    this.target.applyState(this.newState);
  }

  undo(): void {
    this.target.applyState(this.oldState);
  }
}
```

#### Exceptions

The ONLY exception to this rule is **internal system state** that is NOT user-facing:
- Camera orbit state during navigation (not undoable by design)
- Selection state (not typically undoable)
- UI panel sizes/positions (not undoable)

When in doubt: **If the user can see the effect, it should be undoable.**

### 7. Industry-Standard Terminology (MANDATORY)

**All naming for editor features, engine concepts, and shading languages MUST use industry-standard terminology.**

When multiple naming conventions exist across different engines/tools, **follow Unity's terminology** as the canonical reference.

### 8. Coordinate System Convention (MANDATORY)

**All rendering code MUST use the Right-Handed, Z-Up coordinate system (Blender convention).**

See **[COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md)** for the complete specification.

#### Quick Reference

| Axis | Direction |
|------|-----------|
| **+X** | Right |
| **+Y** | Forward |
| **+Z** | Up (vertical axis) |

#### The Rule

```typescript
// ✅ REQUIRED - Z-up world
const WORLD_UP: Vec3 = [0, 0, 1];

// ❌ FORBIDDEN - Y-up world (OpenGL/WebGL default)
const WORLD_UP: Vec3 = [0, 1, 0];
```

#### What MUST Follow Z-Up Convention

| Component | Requirement |
|-----------|-------------|
| **Camera** | `getUp()` returns `[0, 0, 1]` |
| **LookAt matrix** | Default up parameter is `[0, 0, 1]` |
| **Orbit controller** | Spherical coordinates use Z as vertical |
| **Primitives** | Top/bottom faces along Z axis |
| **Hemisphere lighting** | `normal.z` determines sky/ground blend |
| **Importers** | Convert Y-up assets (GLTF, OBJ) to Z-up |

#### Checklist for New Rendering Features

Before implementing any new rendering feature:

- [ ] World up vector is `[0, 0, 1]`
- [ ] Geometry uses Z as vertical axis
- [ ] Shaders use `normal.z` for vertical-dependent effects
- [ ] Imported assets are converted to Z-up

⚠️ **Migration Note:** The codebase currently uses Y-up. See `COORDINATE_SYSTEM.md` Migration Status section for files requiring changes.

### 9. No Meta Internal Data (MANDATORY)

**This is a personal open-source project. NO Meta-internal data, conventions, tools, or references may be included.**

#### The Rule

This project must remain completely independent from Meta and suitable for public open-source distribution.

#### What is FORBIDDEN

| Category | Examples | Reason |
|----------|----------|--------|
| **Internal URLs** | internalfb.com, fburl.com, workplace.com | Internal systems |
| **Email addresses** | @fb.com, @meta.com | PII/Internal |
| **Employee names/IDs** | FBIDs, employee names in code comments | PII |
| **Meta tools** | Sapling (sl), Buck, Hack, Mercurial (hg), jf | Internal tooling |
| **Meta terminology** | SEV, oncall, diff D12345, task T12345 | Internal systems |
| **Meta products** | References to Horizon, Oculus, Quest in code | Product names |
| **Internal conventions** | Meta-specific coding patterns or standards | Internal knowledge |
| **Phabricator references** | D12345678 diff IDs, arc commands | Internal VCS |

#### What is ALLOWED

| Category | Examples | Reason |
|----------|----------|--------|
| **Standard Git** | git commands, GitHub references | Public VCS |
| **Public URLs** | github.com, npm, MDN, Khronos | Public resources |
| **Industry standards** | Unity, Blender, WebGL conventions | Public knowledge |
| **Author attribution** | Name in LICENSE, README (no email) | Standard OSS practice |

#### Verification Checklist

Before committing any code, verify:

- [ ] No internal URLs (internalfb.com, fb.workplace.com, etc.)
- [ ] No @fb.com or @meta.com email addresses
- [ ] No references to Meta-specific tools (sl, jf, buck, hack)
- [ ] No internal terminology (SEV, oncall, Phabricator diffs)
- [ ] No employee FBIDs or internal team references
- [ ] Code uses standard Git (not Sapling/Mercurial)
- [ ] Documentation references public resources only

#### Why This Matters

- **Legal compliance:** Separates personal work from employer IP
- **Open-source readiness:** Project can be publicly shared
- **Portability:** Anyone can clone and build without Meta access
- **Privacy:** No internal PII or organizational data exposed

---

### Reference Hierarchy (Rule 7 continued)

- **Transferable knowledge:** Users familiar with Unity, Unreal, Blender, or other tools should recognize concepts immediately
- **Documentation alignment:** Industry tutorials, papers, and resources use standard terms

#### Reference Hierarchy

When naming concepts, follow this priority:

1. **Unity terminology** (primary reference when variances exist)
2. **Industry-wide standard** (e.g., GLSL/HLSL conventions for shaders)
3. **Academic/research standard** (for advanced rendering concepts)

#### Examples

| Category | ✅ CORRECT (Industry Standard) | ❌ WRONG (Non-standard) |
|----------|-------------------------------|------------------------|
| **Scene Graph** | GameObject, Transform, Component | Entity, Node, Module |
| **Components** | MeshRenderer, MeshFilter, Material | RenderComponent, GeometryHolder |
| **Hierarchy** | Parent, Child, Root | Owner, Member, Top |
| **Transform** | Position, Rotation, Scale | Location, Orientation, Size |
| **Lighting** | Directional Light, Point Light, Spot Light | Sun Light, Omni Light, Cone Light |
| **Camera** | Field of View (FOV), Near Clip, Far Clip | View Angle, Near Plane, Far Plane |
| **Materials** | Albedo, Normal Map, Roughness, Metallic | Diffuse Color, Bump Map, Smoothness, Metalness |
| **Shaders** | Vertex Shader, Fragment Shader | Vertex Program, Pixel Shader (WebGL context) |
| **Rendering** | Forward Rendering, Deferred Rendering | Forward Shading, Deferred Shading |
| **Buffers** | G-Buffer, Frame Buffer, Depth Buffer | Geometry Buffer, Render Target, Z-Buffer |
| **Texture** | Texture2D, Cubemap, RenderTexture | Image, SkyboxTexture, TargetTexture |
| **Animation** | Animator, Animation Clip, Keyframe | AnimationController, Animation, Frame |
| **Physics** | Rigidbody, Collider, Raycast | PhysicsBody, HitBox, RayTrace |
| **UI Panels** | Hierarchy, Inspector, Project, Scene, Game | Tree View, Properties, Assets, Viewport, Preview |

#### Shader/GLSL Terminology

For shader code and GPU concepts, use standard GLSL/graphics terminology:

| ✅ CORRECT | ❌ WRONG |
|-----------|---------|
| `uniform` | `constant`, `parameter` |
| `attribute` / `in` (vertex) | `input`, `vertexData` |
| `varying` / `out` (vertex) | `interpolated`, `output` |
| `sampler2D` | `texture`, `image` |
| `vec3`, `vec4`, `mat4` | `Vector3`, `Vector4`, `Matrix4` (in shader code) |
| `gl_Position` | `outputPosition` |
| `gl_FragColor` / `out vec4` | `pixelColor` |

#### Applying This Rule

```typescript
// ❌ FORBIDDEN: Non-standard naming
interface IEntity {
  node: INode;
  modules: IModule[];
}

class RenderModule implements IModule {
  diffuseColor: Vec3;
  bumpMap: Texture;
}

// ✅ REQUIRED: Industry-standard naming
interface IGameObject {
  transform: ITransform;
  components: IComponent[];
}

class MeshRenderer implements IComponent {
  material: IMaterial;
}

interface IMaterial {
  albedo: Vec3;
  normalMap: Texture;
  roughness: number;
  metallic: number;
}
```

#### When In Doubt

1. **Search Unity documentation** for the official term
2. **Check GLSL specification** for shader terms
3. **Reference Khronos/OpenGL wiki** for WebGL-specific concepts
4. **Ask owner** if multiple valid standards exist

---

## Development Workflow

### Before Starting Any Feature

1. **Read PROJECT_CONTEXT.md** to understand current state
2. **Check ARCHITECTURE.md** for module boundaries
3. **Review PATTERNS.md** for implementation guidance
4. **Verify LIBRARIES.md** before adding dependencies

### When Implementing Features

1. **Create plugin structure first**
2. **Define interfaces before implementations**
3. **Write tests alongside code**
4. **Document public APIs with JSDoc**
5. **Keep files under size limits** (see PATTERNS.md)

### When Adding Dependencies

1. **STOP** - Do you really need this library?
2. **Check LIBRARIES.md** for similar existing dependencies
3. **Evaluate alternatives** - Can it be implemented manually?
4. **Document in LIBRARIES.md** with justification
5. **Get owner approval** for major dependencies

---

## Code Quality Requirements

### Documentation

| Requirement | Mandatory |
|-------------|-----------|
| JSDoc for all public APIs | ✅ Yes |
| Inline comments for complex logic | ✅ Yes |
| README for each plugin | ✅ Yes |
| Update ARCHITECTURE.md when adding modules | ✅ Yes |

### Testing

| Requirement | Mandatory |
|-------------|-----------|
| Unit tests for all plugins | ✅ Yes |
| Integration tests for core interactions | ✅ Yes |
| Tests must pass before PR merge | ✅ Yes |
| Test modifications require owner notification | ✅ Yes |

### File Organization

| Requirement | Mandatory |
|-------------|-----------|
| One class per file | ✅ Yes |
| Interfaces in separate files | ✅ Yes |
| Group by feature, not by type | ✅ Yes |
| Follow naming conventions | ✅ Yes |

---

## AI Assistant (Claude) Specific Rules

### MUST DO

1. **Read `.llms/PROJECT_CONTEXT.md` at session start**
2. **Update PROJECT_CONTEXT.md after major changes**
3. **Timestamp all guideline file updates**
4. **Run tests after code changes**
5. **Iterate until tests pass**
6. **Notify owner if test modifications are needed**
7. **Track all library additions in LIBRARIES.md**
8. **Follow WORKFLOWS.md triggers**

### MUST NOT DO

1. **Do NOT add libraries without documenting in LIBRARIES.md**
2. **Do NOT skip tests**
3. **Do NOT modify existing tests without owner approval**
4. **Do NOT create monolithic files**
5. **Do NOT use type-based conditionals**
6. **Do NOT bypass the plugin system**

### When Tests Fail

```
1. Analyze failure reason
2. Fix the code (not the test) if implementation is wrong
3. If test needs modification:
   a. STOP
   b. Notify owner with explanation
   c. Wait for approval
   d. Then modify test
4. Iterate until all tests pass
```

---

## Mobile Support Guidelines

### Touch Input

- Implement touch equivalents for all mouse interactions
- Support pinch-to-zoom for camera
- Provide touch-friendly UI targets (minimum 44x44px)

### Performance

- Detect mobile devices and reduce default quality
- Implement level-of-detail (LOD) system
- Limit texture resolution on mobile

### Layout

- Support portrait and landscape orientations
- Use responsive panel system
- Allow panel hiding on small screens

---

## Browser Compatibility

### Target Browsers

| Browser | Minimum Version | WebGL2 Support |
|---------|----------------|----------------|
| Chrome | 56+ | ✅ |
| Firefox | 51+ | ✅ |
| Safari | 15+ | ✅ |
| Edge | 79+ | ✅ |

### Feature Detection

```typescript
// Always check WebGL2 availability
function initializeWebGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    showError('WebGL2 is not supported by your browser');
    return null;
  }
  return gl;
}
```

---

## Render Pipeline Guidelines

### Swappability

All render pipelines MUST be hot-swappable:

```typescript
// This MUST work at runtime without page reload
editor.settings.set('renderer.pipeline', 'deferred');
```

### Required Pipelines

| Pipeline | Priority | Status |
|----------|----------|--------|
| Forward | High | Not Started |
| Deferred | High | Not Started |
| Raytracing | Medium | Not Started |

### Pipeline Interface

Every pipeline MUST implement:
- `beginFrame(camera)` - Setup for frame
- `render(scene)` - Main render pass
- `endFrame()` - Cleanup and present
- `resize(width, height)` - Handle viewport changes

---

## UI Guidelines

### Consistency

- Follow Unity/Substance Painter visual patterns
- Use consistent spacing (8px grid system)
- Maintain dark theme throughout

### Panel System

- All UI MUST be in panels
- Panels MUST be dockable/undockable
- Support panel persistence across sessions

### Accessibility

- Keyboard navigation support
- Screen reader compatibility where possible
- Sufficient color contrast (WCAG AA)

---

## Version Control

### Commit Messages

Follow conventional commits:

```
feat(renderer): add shadow mapping to forward pipeline
fix(importer): handle missing normals in OBJ files
docs(architecture): update render pipeline diagram
test(camera): add orbit control unit tests
```

### Branching

- `main` - Stable releases
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

---

## Related Documents

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current project state
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [PATTERNS.md](./PATTERNS.md) - Code conventions
- [LIBRARIES.md](./LIBRARIES.md) - Dependency tracking
- [WORKFLOWS.md](./WORKFLOWS.md) - Automation triggers
- [TESTING.md](./TESTING.md) - Testing requirements
