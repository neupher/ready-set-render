# Architecture Review

> **Last Updated:** 2026-04-22T14:30:00Z
> **Status:** Active review document — Phase 1 + Phase 2 remediation complete

---

## Purpose

This document tracks the current architectural review of the project and highlights the highest-value areas for improvement. New sessions should read this file alongside `/c:/Git/ready-set-render/.llms/PROJECT_CONTEXT.md` to understand the current technical risks, implementation drift, and recommended improvement order.

---

## Execution Plan

A detailed phased execution plan has been created to address all findings in this review:

**[ARCHITECTURE_REMEDIATION_PLAN.md](./ARCHITECTURE_REMEDIATION_PLAN.md)** — 7 phases, ~10–14 sessions

| Phase | Addresses Finding | Status |
|-------|-------------------|--------|
| Phase 1 | #1 Runtime composition too centralized | ✅ Complete (v0.16.0) |
| Phase 2 | #2 Importer contract drift | ✅ Complete (v0.16.1) |
| Phase 3 | #3 GLTF correctness gaps, #4 Renderer responsibilities | Not Started |
| Phase 4 | #5 Asset integrity boundaries | Not Started |
| Phase 5 | #7 Visual editor verification | Not Started |
| Phase 6 | #6 Asset browser oversized | Not Started |
| Phase 7 | Documentation drift corrections | Not Started |

This plan is the **highest priority** work item in the project. See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).

---

## Current Architectural Reality

The project is documented as a plugin-based, extensible WebGL2 editor, but the runtime composition is still heavily centralized in `/c:/Git/ready-set-render/src/core/Application.ts`. The architecture is plugin-capable, but not yet fully plugin-driven.

The strongest existing systems are:
- Asset system foundation and project-folder workflow
- GLTF import pipeline with hierarchy preservation
- Shader asset and live shader editing workflow
- Event-driven communication through `EventBus`

The highest-risk architectural tension is the gap between the documented open/closed plugin model and the actual runtime wiring.

---

## Priority Findings

### 1. Runtime composition is too centralized

Primary issue:
- `/c:/Git/ready-set-render/src/core/Application.ts` manually wires most subsystems and hardcodes `ForwardRenderer` into the render loop.

Why it matters:
- This weakens the plugin architecture described in `/c:/Git/ready-set-render/.llms/GUIDELINES.md`.
- New renderers, importers, and scene operations still tend to require edits in the application shell.

Relevant files:
- `/c:/Git/ready-set-render/src/core/Application.ts`
- `/c:/Git/ready-set-render/src/core/PluginManager.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IPlugin.ts`
- `/c:/Git/ready-set-render/src/core/interfaces/IRenderPipeline.ts`

### 2. Importer contract has drifted from real behavior

Primary issue:
- `/c:/Git/ready-set-render/src/core/interfaces/IImporter.ts` is narrower than the actual GLTF flow implemented in `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`.

Why it matters:
- The interface does not clearly model import options, metadata outputs, or reimport behavior.
- This will make additional importers inconsistent.

Relevant files:
- `/c:/Git/ready-set-render/src/core/interfaces/IImporter.ts`
- `/c:/Git/ready-set-render/src/core/ImportController.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`

### 3. GLTF import path likely has correctness gaps

Primary issue:
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts` appears likely to mishandle multi-primitive or multi-material meshes and fallback normal generation for indexed geometry.

Why it matters:
- These issues can silently produce incorrect imported scenes.

Relevant files:
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImportService.ts`
- `/c:/Git/ready-set-render/src/plugins/importers/gltf/GLTFImporter.ts`

### 4. Renderer/cache responsibilities are too broad

Primary issue:
- `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts` handles rendering, asset lookup, shader resolution, and uniform marshaling.
- `/c:/Git/ready-set-render/src/plugins/renderers/shared/MeshGPUCache.ts` likely keys GPU state too coarsely for shader-dependent VAO binding.

Why it matters:
- This increases fragility as custom shaders and additional render pipelines expand.

Relevant files:
- `/c:/Git/ready-set-render/src/plugins/renderers/forward/ForwardRenderer.ts`
- `/c:/Git/ready-set-render/src/plugins/renderers/shared/MeshGPUCache.ts`
- `/c:/Git/ready-set-render/src/core/ShaderEditorService.ts`

### 5. Asset integrity boundaries are too loose

Primary issue:
- `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts` exposes mutable asset objects.
- `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts` reads raw JSON without strong type-specific validation.

Why it matters:
- Invalid or dangling asset state can leak into runtime behavior.

Relevant files:
- `/c:/Git/ready-set-render/src/core/assets/AssetRegistry.ts`
- `/c:/Git/ready-set-render/src/core/assets/FileSystemAssetStore.ts`
- `/c:/Git/ready-set-render/src/core/assets/MaterialAssetFactory.ts`
- `/c:/Git/ready-set-render/src/core/assets/ShaderAssetFactory.ts`

### 6. Asset browser is carrying too much responsibility

Primary issue:
- `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts` mixes filesystem scanning, tree construction, command behavior, and UI state.

Why it matters:
- This is a likely maintenance and regression hotspot.

Relevant files:
- `/c:/Git/ready-set-render/src/ui/tabs/AssetBrowserTab.ts`
- `/c:/Git/ready-set-render/src/ui/editors/MonacoShaderEditor.ts`

### 7. Visual editor verification is missing from the test strategy

Primary issue:
- The project currently has strong unit coverage, but it does not yet have a reliable way for tests to launch the editor, capture screenshots, and persist those outputs for human or agent review.

Why it matters:
- Many editor regressions are visual or interaction-driven and are hard to catch with unit tests alone.
- A screenshot baseline workflow would give developers and LLM agents a concrete artifact to inspect when validating rendering, UI state, import results, and scene behavior.
- Cached screenshots would make it easier to compare expected and actual behavior across sessions and across future architectural refactors.
- The new large fixture `/c:/Git/ready-set-render/test_assets/studio_setup.glb` makes this especially valuable because it provides a realistic scene for importer, rendering, and editor validation.

Relevant files:
- `/c:/Git/ready-set-render/package.json`
- `/c:/Git/ready-set-render/README.md`
- `/c:/Git/ready-set-render/tests/`
- `/c:/Git/ready-set-render/src/core/Application.ts`
- `/c:/Git/ready-set-render/src/ui/panels/EditorLayout.ts`

---

## Recommended Improvement Order

1. Reconcile runtime composition with the plugin architecture.
2. Repair importer abstractions and narrow the GLTF importer responsibilities.
3. Fix importer and renderer correctness risks.
4. Harden asset validation and persistence boundaries.
5. Add editor launch, screenshot capture, and cached visual review testing.
6. Split oversized UI modules without changing editor behavior.
7. Update documentation to match the implemented architecture.

---

## Verification Priorities

The highest-value missing verification is realistic integration coverage around the import and asset workflows.

Focus areas:
- End-to-end GLTF import tests using representative fixtures, including `/c:/Git/ready-set-render/test_assets/studio_setup.glb`
- Reimport stability and hierarchy preservation
- Renderer cache invalidation with custom shaders
- Asset validation for malformed on-disk data
- Editor launch tests that capture screenshots and save/cache them for human and LLM review
- UI tests for asset browser behavior after decomposition
- Keep large validation fixtures out of deployed application assets and production bundles

---

## Documentation Drift To Correct

Known mismatches between docs and implementation:
- `/c:/Git/ready-set-render/.llms/GUIDELINES.md` still marks forward rendering as not started
- `/c:/Git/ready-set-render/.llms/GUIDELINES.md` still contains an outdated Y-up migration note
- `/c:/Git/ready-set-render/README.md` presents plugin-based architecture more strongly than the current runtime composition justifies

---

## Session Note

Any new session reviewing or extending architecture-sensitive areas should read this file and the [ARCHITECTURE_REMEDIATION_PLAN.md](./ARCHITECTURE_REMEDIATION_PLAN.md) before making changes in the following areas:
- renderer and pipeline work
- importer work
- asset system changes
- project-folder workflow changes
- major UI/editor refactors
- visual test automation and screenshot review workflows

---

## Related Documents

- [ARCHITECTURE_REMEDIATION_PLAN.md](./ARCHITECTURE_REMEDIATION_PLAN.md) — Execution plan for this review
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — Current project state
- [GUIDELINES.md](./GUIDELINES.md) — Development rules
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design documentation
- [TESTING.md](./TESTING.md) — Test requirements
