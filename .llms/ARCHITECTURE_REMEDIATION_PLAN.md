# Architecture Remediation Plan

> **Last Updated:** 2026-04-22T14:30:00Z
> **Version:** 0.1.2
> **Status:** Phase 1 + Phase 2 Complete
> **Priority:** Highest — Execute before new feature work
> **Source:** [Architecture Review.md](./Architecture%20Review.md)

---

## Overview

This plan addresses the architectural drift identified in the Architecture Review. The project's documented plugin-based architecture is sound, but the runtime composition has grown around it rather than through it. This remediation brings the implementation into alignment with the documented design, reduces fragility, and unblocks future extensibility.

**Guiding principle:** Each phase must leave all existing tests passing and all editor behavior unchanged. This is refactoring, not rewriting.

---

## Current State (Problems)

| Finding | File(s) | Lines | Severity |
|---------|---------|------:|----------|
| Application.ts is a God Object — bypasses PluginManager entirely | `Application.ts` | 787 | 🔴 High |
| PluginManager is dead infrastructure — never instantiated | `PluginManager.ts` | 337 | 🔴 High |
| IImporter contract drifted from GLTFImporter behavior | `IImporter.ts`, `GLTFImporter.ts` | 63 / 553 | 🟡 Medium |
| ImportController hardcoded to single importer | `ImportController.ts` | 352 | 🟡 Medium |
| GLTFImportService likely mishandles multi-primitive meshes and fallback normals | `GLTFImportService.ts` | 614 | 🟡 Medium |
| ForwardRenderer carries too many responsibilities | `ForwardRenderer.ts` | 603 | 🟡 Medium |
| MeshGPUCache keys VAOs too coarsely for shader-dependent binding | `MeshGPUCache.ts` | 336 | 🟡 Medium |
| AssetRegistry exposes mutable assets, no validation | `AssetRegistry.ts` | 282 | 🟡 Medium |
| FileSystemAssetStore has no type-specific validation | `FileSystemAssetStore.ts` | 363 | 🟡 Medium |
| AssetBrowserTab is a 1,668-line mega-module | `AssetBrowserTab.ts` | 1,668 | 🔴 High |
| No visual editor verification in test strategy | — | — | 🟡 Medium |
| Documentation drifted from implementation | `GUIDELINES.md`, `ARCHITECTURE.md`, `README.md` | — | 🟡 Medium |

---

## Implementation Phases

---

### Phase 1: Reconcile Runtime Composition with Plugin Architecture ✅ COMPLETE

**Completed:** 2026-04-21 (v0.16.0)
**Risk Level:** High (touches Application.ts, the composition root)
**Goal:** Application.ts delegates to PluginManager instead of hardcoding every subsystem.

#### 1.1 Enrich IPluginContext

**File:** `src/core/interfaces/IPlugin.ts`

Extend `IPluginContext` to expose the services that plugins currently receive via setter injection:

```typescript
interface IPluginContext {
  readonly eventBus: EventBus;
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  // Add:
  readonly sceneGraph: SceneGraph;
  readonly selectionManager: SelectionManager;
  readonly commandHistory: CommandHistory;
  readonly assetRegistry: AssetRegistry;
  readonly settingsService: SettingsService;
}
```

**Why:** ForwardRenderer, GLTFImporter, and other plugins currently use ad-hoc setters (`setLightManager`, `setAssetRegistry`, `setShaderEditorService`) because the context didn't carry enough. Enriching the context eliminates the setters.

#### 1.2 Wire PluginManager into Application.ts

**File:** `src/core/Application.ts`

Replace the manual plugin construction with PluginManager registration:

1. Instantiate `PluginManager` in Application constructor.
2. Register each plugin (ForwardRenderer, LineRenderer, GridRenderer, GLTFImporter, etc.) with `pluginManager.register()`.
3. Call `pluginManager.initializeAll(context)` once, replacing the manual `initialize()` sequencing.
4. Replace the manual disposal with `pluginManager.disposeAll()`.
5. Move render loop dispatch to query the active render pipeline via `pluginManager.getPlugin<IRenderPipeline>()`.

**Behavioral contract:** The render loop, event wiring, and UI construction must produce identical behavior. No user-visible change.

#### 1.3 Remove Setter Injection from Plugins

**Files to modify:**
- `src/plugins/renderers/forward/ForwardRenderer.ts` — Remove `setLightManager()`, `setShaderEditorService()`, `setAssetRegistry()`. Read from `IPluginContext` in `initialize()`.
- `src/plugins/importers/gltf/GLTFImporter.ts` — Remove `setProjectService()`. Read from context.
- Any other plugin using setter injection.

#### 1.4 Tests

| Test | Description |
|------|-------------|
| PluginManager registers and initializes all plugins in order | Existing tests + new integration test |
| Application render loop works identically after refactor | Run `npm run validate` — all 1,423 tests pass |
| ForwardRenderer receives dependencies from context | Unit test |
| Plugin disposal runs in reverse order | Existing PluginManager test |

#### Success Criteria

- [ ] `PluginManager` is instantiated and used in Application.ts
- [ ] No setter injection (`set*()`) remains on any plugin
- [ ] All plugins receive dependencies through `IPluginContext`
- [ ] Application.ts line count reduced by ~100–150 lines
- [ ] All existing tests pass with zero changes

---

### Phase 2: Repair Importer Abstractions ✅ COMPLETE

**Completed:** 2026-04-22 (v0.16.1)
**Risk Level:** Medium (interface changes, but single consumer)
**Goal:** IImporter and ImportController support multiple importers without code changes.

#### 2.1 Widen IImporter Interface

**File:** `src/core/interfaces/IImporter.ts`

Update to match real behavior:

```typescript
interface IImporter extends IPlugin {
  readonly supportedExtensions: string[];

  canImport(file: File): boolean;

  import(file: File, options?: ImportOptions): Promise<ImportResult>;
}

interface ImportOptions {
  /** Project-relative path for the source file */
  sourcePath?: string;
  /** Import settings override */
  settings?: Record<string, unknown>;
}

interface ImportResult {
  /** Entities created from the import (ready to add to scene) */
  entities: IEntity[];
  /** Assets registered during import */
  assets: IAsset[];
  /** Non-fatal issues encountered */
  warnings: string[];
}
```

**Why:** The current `IImporter.import()` returns `ISceneObject` (a type that doesn't exist in the codebase). The real GLTFImporter returns `GLTFImportResult` with different fields. The interface must reflect reality.

#### 2.2 Conform GLTFImporter to IImporter

**File:** `src/plugins/importers/gltf/GLTFImporter.ts`

- Change `import()` return type to match the widened `ImportResult`.
- Move GLTF-specific return data into the standard `ImportResult` fields.
- Remove the custom `GLTFImportResult` type or make it internal.

#### 2.3 Make ImportController Importer-Agnostic

**File:** `src/core/ImportController.ts`

Replace the hardcoded GLTFImporter dependency with a registry of importers:

```typescript
class ImportController {
  private importers: IImporter[] = [];

  registerImporter(importer: IImporter): void {
    this.importers.push(importer);
  }

  private findImporter(file: File): IImporter | null {
    return this.importers.find(i => i.canImport(file)) ?? null;
  }

  async handleImport(): Promise<void> {
    // Build accept list from ALL registered importers
    const allExtensions = this.importers.flatMap(i => i.supportedExtensions);
    const file = await this.showFilePicker(allExtensions);
    const importer = this.findImporter(file);
    if (!importer) { /* error */ return; }
    const result = await importer.import(file);
    // ...
  }
}
```

**Why:** Currently adding an OBJ importer would require editing ImportController. After this change, registering a new importer is the only step.

#### 2.4 Tests

| Test | Description |
|------|-------------|
| ImportController finds correct importer by extension | New unit test |
| ImportController builds file picker from all registered extensions | New unit test |
| GLTFImporter.import() returns conforming ImportResult | Update existing tests |
| Unknown extension produces clear error | New unit test |

#### Success Criteria

- [ ] `IImporter.import()` signature matches all implementations
- [ ] `ImportController` has no direct dependency on `GLTFImporter`
- [ ] Adding a new importer requires zero changes to existing files
- [ ] All existing import tests pass

---

### Phase 3: Fix Importer and Renderer Correctness Risks

**Estimated Effort:** ~2 sessions
**Risk Level:** Medium (behavior changes for edge cases)
**Goal:** Fix known correctness gaps in GLTF import and renderer cache.

#### 3.1 Multi-Primitive Mesh Handling

**File:** `src/plugins/importers/gltf/GLTFImportService.ts`

**Current issue:** When a GLTF mesh has multiple primitives (common for multi-material objects), each primitive should produce a separate `IMeshData` that is correctly associated with its material. Verify and fix:

1. Each primitive maps to a distinct `IMeshData` with its own material index.
2. The parent mesh name is preserved with a suffix (e.g., `"Body_0"`, `"Body_1"`).
3. Index offsets are correct when primitives share vertex buffers.

#### 3.2 Fallback Normal Generation for Indexed Geometry

**File:** `src/plugins/importers/gltf/GLTFImportService.ts`

**Current issue:** The flat normal fallback may not correctly handle indexed geometry. Fix:

1. When normals are missing and indices are present, generate flat normals by expanding indexed vertices.
2. Ensure the generated normals array length matches the expanded positions array.
3. Add test coverage for this specific path.

#### 3.3 MeshGPUCache Shader-Aware Keying

**File:** `src/plugins/renderers/shared/MeshGPUCache.ts`

**Current issue:** VAOs are keyed by mesh ID only. When a custom shader uses different attribute locations, the cached VAO may bind attributes to wrong locations.

Fix options (choose during implementation):
- **Option A:** Key VAOs by `meshId + programId` (simple, may increase memory).
- **Option B:** Use standardized attribute locations across all shaders via `gl.bindAttribLocation()` before linking (requires shader compilation change but is the correct long-term solution).

#### 3.4 ForwardRenderer Responsibility Extraction

**File:** `src/plugins/renderers/forward/ForwardRenderer.ts`

Extract the shader resolution and uniform marshaling logic into focused helpers:

- `ShaderResolver` — resolves material → shader asset → WebGLProgram (currently inline in `getProgram()`).
- `UniformSetter` — sets uniforms by type (currently a large switch in `setUniforms()`).

This reduces ForwardRenderer from ~603 lines to ~350–400, and makes the shader pipeline reusable for future renderers (Deferred, Raytracing).

#### 3.5 Tests

| Test | Description |
|------|-------------|
| Multi-primitive GLTF mesh produces correct separate IMeshData entries | New unit test using crafted fixture |
| Missing normals on indexed geometry produces valid flat normals | New unit test |
| MeshGPUCache returns correct VAO for different shader programs | New unit test |
| ShaderResolver resolves built-in + custom shaders correctly | New unit test |
| UniformSetter handles all GLSL types | New unit test |
| Full import of `test_assets/studio_setup.glb` completes without errors | New integration test |

#### Success Criteria

- [ ] Multi-primitive meshes import with correct material assignments
- [ ] Flat normal fallback produces correct normals for indexed geometry
- [ ] VAO cache handles shader attribute layout differences
- [ ] ForwardRenderer line count reduced to ~350–400
- [ ] `studio_setup.glb` imports successfully in integration test
- [ ] All existing tests pass

---

### Phase 4: Harden Asset Validation and Persistence Boundaries

**Estimated Effort:** ~1–2 sessions
**Risk Level:** Low (additive, no behavior change for valid data)
**Goal:** Invalid or dangling asset state cannot leak into runtime behavior.

#### 4.1 Immutable Asset Access in AssetRegistry

**File:** `src/core/assets/AssetRegistry.ts`

Currently `get()` returns the mutable asset object, meaning any caller can mutate registry state. Fix:

1. Return `Readonly<T>` from `get()` and `getByType()`.
2. Add an explicit `update(uuid, changes)` method that validates changes and emits `asset:modified`.
3. Keep the internal mutable reference for factory use only.

#### 4.2 Type-Specific Validation on Load

**File:** `src/core/assets/FileSystemAssetStore.ts`

Currently raw JSON is loaded with no validation beyond `JSON.parse()`. Add:

1. A validation registry: `registerValidator(type: string, validator: (data: unknown) => ValidationResult)`.
2. Use existing type guards (`isShaderAsset()`, `isMaterialAsset()`, etc.) as validators.
3. On load, reject or quarantine assets that fail validation with a logged warning.

#### 4.3 Dangling Reference Detection

**File:** `src/core/assets/AssetRegistry.ts`

Add a `validateReferences()` method that:
1. Walks all asset references (`shaderRef`, `materialAssetRef`, `parentModelRef`, etc.).
2. Reports any UUID that doesn't resolve to a registered asset.
3. Emits `asset:danglingReference` events for UI to surface warnings.

#### 4.4 Dynamic Asset Type Registration

**Files:** `src/core/assets/AssetRegistry.ts`, `src/core/assets/FileSystemAssetStore.ts`

Replace the hardcoded asset type lists in constructors with dynamic registration:

```typescript
assetRegistry.registerType('shader');
assetRegistry.registerType('material');
// etc.
```

This allows new asset types to be added without modifying registry code.

#### 4.5 Tests

| Test | Description |
|------|-------------|
| `get()` returns immutable object (mutation doesn't affect registry) | New unit test |
| `update()` validates and emits events | New unit test |
| Invalid JSON on load is rejected with warning | New unit test |
| Dangling reference detected and reported | New unit test |
| Dynamic type registration works for new types | New unit test |

#### Success Criteria

- [ ] `AssetRegistry.get()` returns `Readonly<T>`
- [ ] `FileSystemAssetStore.load()` validates against type-specific schemas
- [ ] Dangling references are detectable and reportable
- [ ] Asset type list is not hardcoded
- [ ] All existing tests pass

---

### Phase 5: Visual Editor Verification Testing

**Estimated Effort:** ~2 sessions
**Risk Level:** Low (additive infrastructure, no production code changes)
**Goal:** Tests can launch the editor, capture screenshots, and cache them for review.

#### 5.1 Headless Editor Launch Harness

**File:** `tests/visual/editorLauncher.ts` (new)

Create a test harness that:
1. Uses a headless browser (Playwright or Puppeteer) to launch the Vite dev server.
2. Navigates to the editor URL.
3. Waits for the `Application` to finish initialization.
4. Exposes a `captureScreenshot(name: string)` helper.

#### 5.2 Screenshot Capture and Caching

**File:** `tests/visual/screenshotCache.ts` (new)

1. Screenshots saved to `tests/visual/screenshots/` with timestamped filenames.
2. A manifest file (`screenshots.json`) tracks each capture with metadata: test name, date, viewport size, commit hash.
3. Screenshots are `.gitignore`-d by default (generated artifacts).
4. Optional baseline comparison mode: compare new screenshot against cached baseline, flag pixel differences above threshold.

#### 5.3 Core Visual Test Scenarios

**File:** `tests/visual/editor.visual.test.ts` (new)

| Scenario | What It Verifies |
|----------|-----------------|
| Default scene launch | Cube visible, grid rendered, UI panels present |
| Import `studio_setup.glb` | Model appears in viewport after import |
| Shader switch | Changing from Lambert to PBR updates rendering |
| Transform gizmo | Gizmo visible on selected object |
| Asset Browser state | Tree view shows correct structure after import |

#### 5.4 npm Script Integration

**File:** `package.json`

```json
{
  "scripts": {
    "test:visual": "vitest run tests/visual/",
    "test:visual:update": "vitest run tests/visual/ --update-baselines"
  }
}
```

#### 5.5 Tests

| Test | Description |
|------|-------------|
| Editor launches and renders first frame | Smoke test |
| Screenshot capture produces valid PNG | Infrastructure test |
| Baseline comparison detects pixel difference | Infrastructure test |

#### Success Criteria

- [ ] `npm run test:visual` launches the editor headlessly
- [ ] Screenshots are captured and cached in `tests/visual/screenshots/`
- [ ] At least 3 visual scenarios are automated
- [ ] `studio_setup.glb` is used as a realistic test fixture (not bundled into production)
- [ ] All existing unit tests still pass

---

### Phase 6: Split Oversized UI Modules

**Estimated Effort:** ~1–2 sessions
**Risk Level:** Low (pure refactoring, no behavior change)
**Goal:** AssetBrowserTab.ts decomposed from 1,668 lines into focused modules under 300 lines each.

#### 6.1 Extract AssetBrowserContextMenu

**File:** `src/ui/tabs/AssetBrowserContextMenu.ts` (new)

Move all context menu construction and handlers (~300 lines) into a dedicated module:
- Material context menu (create, rename, duplicate, delete)
- Shader context menu
- Model/source file context menu (reimport, show in explorer)
- Derived asset context menu

#### 6.2 Extract AssetBrowserTreeBuilder

**File:** `src/ui/tabs/AssetBrowserTreeBuilder.ts` (new)

Move the tree construction logic (~400 lines) into a builder:
- Built-in section construction
- Project section construction
- `.assetmeta` scanning and hierarchy building
- Source file discovery and status marking

#### 6.3 Extract AssetBrowserStyles

**File:** `src/ui/tabs/AssetBrowserStyles.ts` (new)

Move the ~700 lines of inline CSS-in-JS into a dedicated style module:
- Tree node styles
- Context menu styles
- Toolbar styles
- Import status indicator styles

#### 6.4 Slim Down AssetBrowserTab

After extraction, `AssetBrowserTab.ts` should be ~300 lines containing:
- Component lifecycle (constructor, connectedCallback, disconnectedCallback)
- Event subscriptions and delegation
- Public API surface
- Composition of extracted modules

#### 6.5 Tests

| Test | Description |
|------|-------------|
| AssetBrowserContextMenu shows correct items per asset type | New unit tests |
| AssetBrowserTreeBuilder produces correct tree from project state | New unit tests |
| All existing AssetBrowserTab tests still pass | No changes to test files |

#### Success Criteria

- [ ] `AssetBrowserTab.ts` reduced to ~300 lines
- [ ] No file exceeds 400 lines
- [ ] All existing `AssetBrowserTab.test.ts` tests pass unchanged
- [ ] Editor behavior identical (manual verification)

---

### Phase 7: Update Documentation to Match Implementation

**Estimated Effort:** ~1 session
**Risk Level:** None (documentation only)
**Goal:** All `.llms/` files accurately describe the implemented architecture.

#### 7.1 ARCHITECTURE.md

- Update Application Architecture section to show PluginManager-based composition (after Phase 1).
- Update Module Breakdown table to reflect actual line counts and responsibilities.
- Remove references to `ResourceManager` (doesn't exist — it's `AssetRegistry`).
- Update directory structure to match reality (e.g., `src/ui/tabs/` not `src/plugins/ui/`).
- Mark ForwardRenderer and LineRenderer as ✅ Complete in renderer table.
- Add `ShaderResolver` and `UniformSetter` to shared rendering infrastructure (after Phase 3).

#### 7.2 GUIDELINES.md

- Fix Render Pipeline Guidelines table: Forward is ✅ Complete, not "Not Started".
- Remove or update the Y-up migration note (coordinate system is established).
- Add a note about the `IPluginContext` enrichment from Phase 1.

#### 7.3 README.md

- Align the plugin architecture description with the actual PluginManager usage (after Phase 1).
- Update feature list to reflect current capabilities accurately.

#### 7.4 PROJECT_CONTEXT.md

- Update Architecture Highlights section to reflect Phase 1–6 changes.
- Update "In Progress" tracking tables.
- Update test count.

#### 7.5 Architecture Review.md

- Mark each finding as resolved with the phase that addressed it.
- Update status from "Active review document" to "Resolved" or "Monitoring".

#### Success Criteria

- [ ] No factual inaccuracies in any `.llms/` file
- [ ] All `.llms/` file timestamps updated
- [ ] `README.md` accurately describes the project

---

## Implementation Order

```
Phase 1 (Plugin Architecture)    ░░░░░░░░░░  ~2-3 sessions  ← START HERE
Phase 2 (Importer Abstractions)  ░░░░░░░░░░  ~1-2 sessions
Phase 3 (Correctness Fixes)      ░░░░░░░░░░  ~2 sessions
Phase 4 (Asset Validation)       ░░░░░░░░░░  ~1-2 sessions
Phase 5 (Visual Testing)         ░░░░░░░░░░  ~2 sessions
Phase 6 (UI Decomposition)       ░░░░░░░░░░  ~1-2 sessions
Phase 7 (Documentation)          ░░░░░░░░░░  ~1 session
```

**Total Estimated:** ~10–14 sessions

---

## Dependencies Graph

```
Phase 1 ──► Phase 2 ──► Phase 3
                            │
                            ├──► Phase 4
                            │
                            └──► Phase 5 (can also start in parallel)

Phase 6 ──► (independent, can start any time after Phase 1)

Phase 7 depends on all previous phases
```

- **Phase 1 must come first** — it changes the composition root that all other phases build on.
- **Phase 2 depends on Phase 1** — importer abstraction repair uses the new plugin context.
- **Phase 3 depends on Phase 2** — correctness fixes build on the repaired importer interface.
- **Phase 4 and Phase 5** can run in parallel after Phase 3.
- **Phase 6 is independent** — UI decomposition can start any time after Phase 1.
- **Phase 7 comes last** — documentation must reflect all implemented changes.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Phase 1 breaks render loop | Run `npm run validate` after every sub-step. Keep manual browser test between steps. |
| Plugin initialization order changes behavior | PluginManager already has topological sort — use `dependencies` field to preserve order. |
| Interface widening breaks existing tests | Widen with optional fields first, migrate implementations, then make required. |
| AssetBrowserTab decomposition introduces regressions | Extract one module at a time, run all tests between each extraction. |
| Visual testing adds large dependencies (Playwright) | Keep as dev dependency. Screenshots are .gitignore-d. |

---

## Out of Scope

| Item | Reason |
|------|--------|
| New render pipelines (Deferred, Raytracing) | Feature work, not remediation |
| New importers (OBJ, FBX) | Feature work — but Phase 2 unblocks adding them |
| Texture import support | Asset Meta Phase 5 — separate plan |
| Mobile optimization | Low priority per project goals |
| Performance profiling | Not an architectural concern |

---

## Related Documents

- [Architecture Review.md](./Architecture%20Review.md) — Source findings for this plan
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — Current project state
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design (to be updated in Phase 7)
- [GUIDELINES.md](./GUIDELINES.md) — Development rules (to be updated in Phase 7)
- [PATTERNS.md](./PATTERNS.md) — Code conventions
- [TESTING.md](./TESTING.md) — Test requirements
- [GLTF_IMPORTER_PLAN.md](./GLTF_IMPORTER_PLAN.md) — GLTF importer (Phases 2–3 overlap)
- [ASSET_META_SYSTEM_PLAN.md](./ASSET_META_SYSTEM_PLAN.md) — Asset metadata system
