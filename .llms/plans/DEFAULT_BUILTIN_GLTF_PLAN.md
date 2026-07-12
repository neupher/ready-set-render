# Default Built-In GLTF Plan

> Last Updated: 2026-07-12T16:05:00Z
> Status: Planned

## Purpose

Make `test_assets/studio_setup/scene.gltf` appear loaded by default in the Asset Browser's Built-in project view so agents and humans have a realistic model available immediately for importer, renderer, and viewport verification work.

## Source Asset

- `test_assets/studio_setup/scene.gltf`
- Companion files in `test_assets/studio_setup/`:
  - `scene.bin`
  - `textures/`

This asset should remain a repository test/development fixture. Do not copy it into `src/`, `public/`, or production-facing runtime assets unless that policy is explicitly changed.

## Current State

- `Application` registers built-in shaders and materials in `src/core/Application.ts`.
- `AssetBrowserTab.buildTreeData()` renders the Built-in section from registry-backed built-in materials and shaders.
- `IModelAsset` currently states that models are always imported/user-created and `isBuiltIn: false`.
- GLTF import currently flows through importer/project services and creates model, mesh, and material assets from source files.

## Design Decision Needed

Choose one of these approaches before implementation:

1. **Built-in sample model asset:** Extend the asset model to allow read-only built-in model assets and register Studio Setup alongside built-in materials/shaders.
2. **Built-in sample source item:** Keep `IModelAsset` unchanged and add a Built-in/Samples category that points to the fixture source, importing or instantiating it on demand.

Recommended path: **Built-in sample source item**. It preserves the current invariant that model assets are imported project assets while still making the GLTF visible and usable from the Built-in view.

## Implementation Plan

1. Add an explicit built-in sample descriptor type for source-backed sample models.
   - Include stable id, display name, format, fixture path, and companion-directory expectations.
   - Keep descriptors separate from persisted asset metadata.

2. Register `studio_setup/scene.gltf` during application startup.
   - Registration should not mutate project state.
   - Registration should not load heavy mesh data until the user imports, drags, or opens the sample.

3. Extend `AssetBrowserTab` Built-in tree data.
   - Add a `Samples` or `Models` category under Built-in.
   - Render Studio Setup as a read-only, source-backed model item.
   - Keep existing Materials and Shaders behavior unchanged.

4. Wire activation behavior.
   - Selecting the sample may preview metadata only.
   - Dragging or invoking import should route through existing GLTF import logic so mesh/material creation stays centralized.
   - Any scene mutation must use existing command/history behavior where applicable.

5. Add tests.
   - `AssetBrowserTab` shows the Built-in sample when no project is open.
   - Existing built-in materials/shaders still render and sort correctly.
   - Activation routes through the existing import path without writing project assets until the user performs an import/instantiate action.

6. Add manual visual verification.
   - Launch the editor.
   - Confirm Built-in shows Studio Setup by default.
   - Instantiate/import it and verify geometry appears in the viewport with hierarchy and materials intact.

## Constraints

- Preserve plugin-first architecture; do not duplicate GLTF parsing in UI code.
- Keep the fixture out of production bundles unless explicitly approved.
- Avoid changing `IModelAsset.isBuiltIn` unless the project deliberately adopts built-in model assets.
- Keep the Built-in tree read-only.
- Keep future large sample assets lazy-loaded.

## Verification Checklist

- [ ] Built-in view shows Studio Setup without opening a project folder.
- [ ] No project files are created merely by displaying the Built-in sample.
- [ ] Import/instantiate uses the existing GLTF importer path.
- [ ] Existing Asset Browser tests pass.
- [ ] Relevant import/render tests pass.
- [ ] Manual viewport check confirms the GLTF renders.
