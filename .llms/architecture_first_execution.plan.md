# Architecture-First Execution Plan

## Project Instruction

For this project, all future plan files must be created under `/c:/Git/ready-set-render/.llms/`.

Do not write project plans to `C:\Users\tapaniheikkinen\.llms\plans\` when working in this repository. Any future agent session working on `/c:/Git/ready-set-render` should treat the repository-local `.llms` directory as the canonical location for planning documents.

## Context

The current project direction is feature-capable, but the runtime architecture has drifted from the plugin-driven model documented in `/c:/Git/ready-set-render/.llms/GUIDELINES.md` and `/c:/Git/ready-set-render/.llms/ARCHITECTURE.md`. The clearest evidence is `/c:/Git/ready-set-render/.llms/Architecture Review.md`, which identifies `/c:/Git/ready-set-render/src/core/Application.ts` as the current composition bottleneck and recommends a specific improvement order focused on architecture, correctness, validation, and verification before more feature expansion.

This should become the highest-priority initiative because the currently pending work depends on these foundations:
- `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md` still treats Phase 6.10 render mode switching as the next feature, but that work will be cleaner once renderer composition is plugin-driven rather than hardcoded in `/c:/Git/ready-set-render/src/core/Application.ts`.
- `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md` currently prioritizes GLTF integration testing and texture support, but the architecture review shows importer contracts, renderer/cache behavior, and asset validation need tightening first so those downstream phases do not harden the wrong seams.

The intended outcome is a codebase where runtime wiring, importer behavior, renderer responsibilities, asset boundaries, and visual verification all align with the architecture the project claims to implement.

## Recommended Approach

Execute the architecture review as a staged, behavior-preserving refactor program. Start by making the plugin system the real runtime composition mechanism, then repair importer abstractions, then fix correctness risks in importer and renderer behavior, then harden asset validation boundaries, then add visual verification infrastructure, then decompose oversized UI modules, and finally update documentation and planning files to match reality.

This preserves momentum while ensuring the next feature phases are built on the correct architecture instead of layering more logic into already overloaded modules.

## Priority Shift

This initiative should supersede the currently listed next steps in `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md`.

The updated priority order should become:
1. Architecture-first initiative from `/c:/Git/ready-set-render/.llms/Architecture Review.md`
2. Deferred follow-on work that depends on architecture cleanup:
   - GLTF importer integration/polish
   - Asset metadata texture support
   - Render mode dropdown and additional pipeline UX

Specific planning implications:
- `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md` should replace its current “Next Steps” list with this initiative as the top item.
- `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md` should mark Phase 6.10 as deferred until runtime composition and render pipeline seams are cleaned up.
- `/c:/Git/ready-set-render/.llms/GLTF_IMPORTER_PLAN.md` should cross-reference this initiative for importer contract cleanup and integration verification.

## Implementation Phases

### Phase 1: Reconcile Runtime Composition with the Plugin Architecture

Make `/c:/Git/ready-set-render/src/core/PluginManager.ts` the actual composition root instead of leaving most runtime wiring inside `/c:/Git/ready-set-render/src/core/Application.ts`.

Work to perform:
- Expand the plugin context in `/c:/Git/ready-set-render/src/core/interfaces/IPlugin.ts` so plugins can receive the services they already depend on indirectly.
- Introduce a lightweight typed service registry for runtime-resolved services instead of continuing to hardwire concrete implementations inside `/c:/Git/ready-set-render/src/core/Application.ts`.
- Extract render loop orchestration out of `/c:/Git/ready-set-render/src/core/Application.ts` into a plugin-oriented render loop that resolves the active render pipeline and overlay renderers.
- Move renderer and viewport-adjacent setup toward plugin registration and dependency ordering rather than direct construction.
- Reduce `/c:/Git/ready-set-render/src/core/Application.ts` to bootstrapping core services, constructing the plugin manager, registering plugins, and starting the application lifecycle.

Critical files:
- `/c:/Git/ready-set-render/src/core/Application.ts`
- `/c:/Git/ready-set-render/src/core/PluginManager.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IPlugin.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IRenderPipeline.ts`
- New runtime composition files for service lookup and render loop orchestration

Reuse:
- `/c:/Git/ready-set-render/src/core/PluginManager.ts` already has registration, dependency ordering, and lifecycle handling.
- `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts` already implements a plugin-compatible renderer lifecycle.
- Existing `EventBus` contracts should remain the integration backbone rather than being replaced.

### Phase 2: Repair Importer Abstractions and Narrow GLTF Importer Responsibilities

Align `/c:/Git/ready-set-render/src/core/interfaces/IImporter.ts` with the real GLTF workflow so future importers are shaped by the correct abstraction rather than the current underspecified one.

Work to perform:
- Redesign the importer contract to explicitly model import options, warnings, asset outputs, entity outputs, and reimport behavior.
- Shift orchestration responsibility into `/c:/Git/ready-set-render/src/core/ImportController.ts`, so importers focus on parsing and structured import results rather than owning too much registration and scene mutation logic.
- Narrow `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts` so it conforms to the revised importer contract and becomes easier to reuse for reimport workflows.
- Register the GLTF importer through the plugin composition path rather than manual application wiring.

Critical files:
- `/c:/Git/ready-set-render/src/core/interfaces/IImporter.ts`
- `/c:/Git/ready-set-render/src/core/ImportController.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/index.ts`

Reuse:
- `/c:/Git/ready-set-render/src/core/ImportController.ts` already owns the user-facing import workflow and should stay the orchestration boundary.
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts` should remain the lower-level parsing service instead of being merged upward.

### Phase 3: Fix Importer and Renderer Correctness Risks

Address the correctness issues called out by the architecture review before adding more features on top of those paths.

Work to perform:
- Audit `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts` for multi-primitive and multi-material mesh handling, and correct fallback normal generation for indexed geometry.
- Reduce correctness fragility in `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts` by separating shader resolution, material parameter resolution, and uniform marshaling into focused collaborators.
- Revisit `/c:/Git/ready-set-render/src/plugins/renderers/shared/MeshGPUCache.ts` so VAO and shader-program interactions are keyed or invalidated correctly for shader changes.
- Verify shader update and cache invalidation behavior against `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts`.

Critical files:
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`
- `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts`
- `/c:/Git/ready-set-render/src/plugins/renderers/shared/MeshGPUCache.ts`
- `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts`

Reuse:
- Keep `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts` as the compiled shader and uniform-location source of truth.
- Reuse the existing built-in shader identity path from `/c:/Git/ready-set-render/src/core/assets/BuiltInShaders.ts` instead of inventing a parallel shader registry.

### Phase 4: Harden Asset Validation and Persistence Boundaries

Prevent malformed or dangling asset state from leaking into runtime behavior.

Work to perform:
- Tighten read boundaries in `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts` with type-specific validation before assets enter the live registry.
- Reduce mutable shared-state exposure from `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts` and make mutation paths more intentional.
- Add stronger validation at asset factory boundaries so invalid material/shader state is rejected earlier.
- Introduce reference validation for high-risk relationships such as material-to-shader and scene-to-asset links.

Critical files:
- `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts`
- `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts`
- `/c:/Git/ready-set-render/src/core/assets/MaterialAssetFactory.ts`
- `/c:/Git/ready-set-render/src/core/assets/ShaderAssetFactory.ts`
- `/c:/Git/ready-set-render/src/core/assets/interfaces/`

Reuse:
- Existing asset interfaces and type guards in `/c:/Git/ready-set-render/src/core/assets/interfaces/` should be reused as validation anchors instead of adding a parallel schema model first.
- Existing registry events should remain the notification surface for asset lifecycle changes.

### Phase 5: Add Editor Launch, Screenshot Capture, and Cached Visual Review Testing

Introduce a verification workflow that catches visual and interaction regressions that unit tests do not cover well.

Work to perform:
- Add a browser-driven editor-launch test path that can open the editor, load scenes, and capture screenshots.
- Create a repeatable screenshot capture and caching flow so outputs can be compared across sessions and across refactors.
- Use `/c:/Git/ready-set-render/test_assets/studio_setup.glb` as the primary realistic validation fixture for rendering, import, and editor-state checks.
- Keep fixture-driven visual artifacts strictly in test-only infrastructure, not production assets.

Critical files:
- `/c:/Git/ready-set-render/package.json`
- `/c:/Git/ready-set-render/tests/`
- `/c:/Git/ready-set-render/src/core/Application.ts`
- `/c:/Git/ready-set-render/src/ui/panels/EditorLayout.ts`
- `/c:/Git/ready-set-render/test_assets/studio_setup.glb`

Reuse:
- Existing editor bootstrap in `/c:/Git/ready-set-render/src/core/Application.ts`
- Existing fixture guidance already recorded in `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md`

### Phase 6: Split Oversized UI Modules Without Changing Behavior

Decompose `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts` after the underlying architectural and validation seams are stronger.

Work to perform:
- Extract folder tree construction into a dedicated pure builder.
- Extract context-menu construction and action dispatch into a dedicated controller.
- Extract asset browser actions such as create, duplicate, rename, delete, and project refresh into dedicated modules/services.
- Leave `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts` as a thin UI shell that coordinates those collaborators.
- Preserve user-visible behavior while reducing maintenance risk and improving testability.

Critical files:
- `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts`
- `/c:/Git/ready-set-render/src/ui/components/TreeView.ts`
- `/c:/Git/ready-set-render/src/ui/editors/MonacoShaderEditor.ts`
- New helper modules under `/c:/Git/ready-set-render/src/ui/tabs/`

Reuse:
- `/c:/Git/ready-set-render/src/ui/components/TreeView.ts`
- Existing event contracts already emitted by `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts`
- Existing factory and registry APIs for asset actions

### Phase 7: Update Documentation and Planning Files to Match Implemented Architecture

Correct the known drift between the codebase and the current docs once the architecture-first phases above are underway or completed.

Work to perform:
- Update `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md` so status, in-progress work, and next steps reflect architecture-first execution as the top priority.
- Update `/c:/Git/ready-set-render/.llms/GUIDELINES.md` to remove stale statements such as forward rendering not being started and the outdated Y-up migration note.
- Update `/c:/Git/ready-set-render/.llms/ARCHITECTURE.md` to describe the actual runtime composition model and any new plugin/runtime service patterns introduced.
- Update `/c:/Git/ready-set-render/README.md` so its architecture claims match the implemented runtime.
- Update `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md` to explicitly defer Phase 6.10 behind the architecture-first initiative.
- Update `/c:/Git/ready-set-render/.llms/GLTF_IMPORTER_PLAN.md` to point Phase 9 testing and remaining importer work at the new importer/correctness phases.

Critical files:
- `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md`
- `/c:/Git/ready-set-render/.llms/GUIDELINES.md`
- `/c:/Git/ready-set-render/.llms/ARCHITECTURE.md`
- `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md`
- `/c:/Git/ready-set-render/.llms/GLTF_IMPORTER_PLAN.md`
- `/c:/Git/ready-set-render/README.md`

## Existing Functions, Utilities, and Patterns To Reuse

Reuse these existing pieces rather than replacing them:
- Plugin lifecycle and dependency ordering in `/c:/Git/ready-set-render/src/core/PluginManager.ts`
- Base plugin contract in `/c:/Git/ready-set-render/src/core/interfaces/IPlugin.ts`
- Import workflow orchestration in `/c:/Git/ready-set-render/src/core/ImportController.ts`
- GLTF parsing service in `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts`
- Shader compilation and program cache in `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts`
- Asset registration/event flow in `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts`
- Asset creation paths in `/c:/Git/ready-set-render/src/core/assets/MaterialAssetFactory.ts` and `/c:/Git/ready-set-render/src/core/assets/ShaderAssetFactory.ts`
- Existing event-driven integration via `/c:/Git/ready-set-render/src/core/EventBus.ts`
- Existing UI primitives such as `/c:/Git/ready-set-render/src/ui/components/TreeView.ts`

## Dependencies and Execution Order

Execution order should remain strict because later phases depend on earlier seams being stable:
1. Runtime/plugin composition cleanup
2. Importer abstraction repair
3. Importer and renderer correctness fixes
4. Asset validation and persistence hardening
5. Visual verification workflow
6. Asset browser decomposition
7. Documentation and plan synchronization

Key dependency notes:
- Render mode switching should not proceed before Phase 1 because render pipeline selection belongs on the cleaned-up runtime composition path.
- GLTF integration testing should be folded into Phase 3 and Phase 5 because importer correctness and visual verification need to be validated together.
- Texture support should follow Phase 4 so asset validation and persistence boundaries are solid before introducing more asset types.

## Verification

### Verification for Phase 1
- Application still boots cleanly from `/c:/Git/ready-set-render/src/core/Application.ts`
- Default scene still renders correctly
- Gizmos, grid, viewport overlays, and scene interaction still work
- Existing test suite remains green

### Verification for Phase 2
- GLTF import still works through `/c:/Git/ready-set-render/src/core/ImportController.ts`
- Import result contracts cover asset outputs, scene outputs, warnings, and reimport inputs explicitly
- Existing importer tests remain green and new contract tests are added

### Verification for Phase 3
- Add integration tests around representative GLTF fixtures, including `/c:/Git/ready-set-render/test_assets/studio_setup.glb`
- Validate hierarchy preservation, mesh/material counts, and missing-normal fallback behavior
- Validate shader program updates and renderer cache invalidation behavior

### Verification for Phase 4
- Add malformed on-disk asset tests for `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts`
- Validate dangling reference handling and invalid asset rejection paths
- Confirm no runtime crashes when bad asset data is encountered

### Verification for Phase 5
- Add browser-driven launch tests that capture screenshots from the live editor
- Persist outputs for human and agent review
- Validate imported large-scene rendering using `/c:/Git/ready-set-render/test_assets/studio_setup.glb`

### Verification for Phase 6
- Preserve current asset browser behavior with no user-visible regressions
- Add focused tests for extracted tree-building and action/menu modules
- Confirm `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts` becomes materially smaller and easier to reason about

### Verification for Phase 7
- Confirm docs, plans, and implementation all describe the same current architecture and priority order
- Confirm new session startup guidance points to the architecture review as the first document for architecture-sensitive work

## Critical Files To Modify

Expected primary modification set:
- `/c:/Git/ready-set-render/src/core/Application.ts`
- `/c:/Git/ready-set-render/src/core/PluginManager.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IPlugin.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IImporter.ts`
- `/c:/Git/ready-set-render/src/core/ImportController.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts`
- `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts`
- `/c:/Git/ready-set-render/src/plugins/renderers/shared/MeshGPUCache.ts`
- `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts`
- `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts`
- `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts`
- `/c:/Git/ready-set-render/src/core/assets/MaterialAssetFactory.ts`
- `/c:/Git/ready-set-render/src/core/assets/ShaderAssetFactory.ts`
- `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts`
- `/c:/Git/ready-set-render/package.json`
- `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md`
- `/c:/Git/ready-set-render/.llms/GUIDELINES.md`
- `/c:/Git/ready-set-render/.llms/ARCHITECTURE.md`
- `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md`
- `/c:/Git/ready-set-render/.llms/GLTF_IMPORTER_PLAN.md`
- `/c:/Git/ready-set-render/README.md`

## Deferred Work After This Initiative

These should remain planned, but explicitly deferred behind the architecture-first track:
- Render mode dropdown from `/c:/Git/ready-set-render/.llms/PHASE_6_PLAN.md`
- Asset metadata texture support from `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md`
- Remaining GLTF importer polish beyond the contract/correctness/testing work absorbed into this initiative

## Exit Criteria

This architecture-first initiative is complete when:
- Runtime composition is plugin-driven rather than centered in `/c:/Git/ready-set-render/src/core/Application.ts`
- Importer contracts match real importer behavior and support reimport-oriented workflows
- Known GLTF and renderer/cache correctness risks are covered by tests and resolved
- Asset loading rejects malformed state before it reaches runtime consumers
- The project has a repeatable editor-launch screenshot workflow with cached visual artifacts
- `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts` is decomposed without behavior changes
- Planning and documentation files reflect the new priority order and implemented architecture
