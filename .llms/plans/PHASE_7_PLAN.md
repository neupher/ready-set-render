# Phase 7: Project Folder Sync & Asset View Improvements

## Problem Statement

The current asset browser doesn't reflect the actual file system structure:
1. **Logical vs Physical structure**: UI shows "Materials", "Shaders", "Imported" categories, not the actual folder hierarchy
2. **No source file support**: Only JSON metadata files are scanned, not original source files (.glb, .gltf)
3. **No sync mechanism**: External file changes (adding files via Finder/Explorer) aren't detected
4. **No manual refresh**: Users can't trigger a rescan without reopening the project

## Goal

Make the Asset Browser a true reflection of the project folder, where:
- What you see in the browser = what exists on disk
- Adding files externally → they appear in the browser (after refresh)
- The folder hierarchy is preserved and visible

## Current Architecture

```
Project Folder Structure (on disk):
MyProject/
├── .ready-set-render/
│   └── project.json
├── assets/
│   ├── materials/     → {uuid}.material.json
│   ├── shaders/       → {uuid}.shader.json
│   ├── models/        → {uuid}.model.json (metadata only)
│   └── meshes/        → {uuid}.mesh.json
└── sources/
    └── models/        → original .glb, .gltf files

Current Asset Browser UI (logical grouping):
├── Built-in
│   ├── Materials
│   └── Shaders
└── Project (when open)
    ├── Materials
    ├── Shaders
    └── Imported
        └── ModelName
            ├── Meshes
            └── Materials
```

## Proposed Architecture

### Option A: Folder-Mirror View (Recommended)

Show the actual folder structure with source files as importable items:

```
Asset Browser UI (folder-based):
├── Built-in (unchanged)
│   ├── Materials
│   └── Shaders
└── MyProject/
    ├── 🔄 [Refresh button]
    ├── assets/
    │   ├── materials/
    │   │   └── Red Metal.material
    │   ├── shaders/
    │   │   └── Custom Shader.shader
    │   └── models/
    │       └── Car.model (expandable to show meshes/materials)
    └── sources/
        └── models/
            └── car.glb  ← Right-click: "Import" / Double-click: imports
```

**Pros:**
- Exact 1:1 mapping with file system
- Users can add files via Finder and see them immediately (after refresh)
- Intuitive for users familiar with Unity/Unreal/Blender project structures

**Cons:**
- More complex tree structure
- Need to handle both source files and asset metadata files differently

### Option B: Smart Hybrid View

Keep logical groupings but add "Source Files" section:

```
Asset Browser UI:
├── Built-in
│   ├── Materials
│   └── Shaders
└── Project
    ├── 🔄 [Refresh]
    ├── Materials (from assets/materials/*.material.json)
    ├── Shaders (from assets/shaders/*.shader.json)
    ├── Models (from assets/models/*.model.json - with hierarchy)
    └── Source Files  ← NEW
        └── models/
            └── car.glb (importable)
```

**Pros:**
- Simpler UI, less nesting
- Easier to find assets by type

**Cons:**
- Doesn't perfectly mirror disk structure
- Two places to look for models (imported vs source)

## Implementation Plan

### Phase 7.1: Source File Scanning (Foundation)

**Goal**: Scan and track source files (.glb, .gltf) in the project folder

1. **Add source file scanning to ProjectService**
   ```typescript
   interface ISourceFile {
     name: string;
     path: string;           // Relative path within project
     type: 'model' | 'texture' | 'other';
     format: string;         // 'glb', 'gltf', 'png', etc.
     size: number;
     lastModified: Date;
     isImported: boolean;    // Has a corresponding .model.json
   }

   // New methods on ProjectService:
   async scanSourceFiles(): Promise<ISourceFile[]>
   getSourceFiles(): ISourceFile[]
   ```

2. **Track which source files have been imported**
   - Check if `assets/models/` has a `.model.json` that references the source file
   - Show visual indicator (checkmark) for already-imported files

### Phase 7.2: Refresh Mechanism

**Goal**: Allow manual refresh to detect external changes

1. **Add refresh button to Asset Browser header**
   ```typescript
   // In AssetBrowserTab
   private createRefreshButton(): HTMLButtonElement
   private async handleRefresh(): Promise<void> {
     await this.projectService.rescanProject();
     this.refresh();
   }
   ```

2. **Add rescan method to ProjectService**
   ```typescript
   async rescanProject(): Promise<void> {
     // Clear non-built-in assets from registry
     this.clearUserAssets();
     // Rescan all assets and source files
     await this.scanForAssets();
     await this.scanSourceFiles();
     // Emit event for UI refresh
     this.eventBus.emit('project:refreshed');
   }
   ```

### Phase 7.3: Asset Browser UI Update

**Goal**: Show folder structure and source files

1. **Update buildTreeData() to show folder structure**
   ```typescript
   private buildTreeData(): TreeNode[] {
     // Built-in section (unchanged)
     // ...

     // Project section - show actual folder structure
     if (isProjectOpen) {
       return [
         builtInSection,
         {
           id: SECTION_IDS.PROJECT,
           name: projectName,
           children: [
             this.buildAssetsFolder(),   // assets/
             this.buildSourcesFolder(),  // sources/
           ]
         }
       ];
     }
   }
   ```

2. **Add source file nodes with import action**
   ```typescript
   private buildSourcesFolder(): TreeNode {
     const sourceFiles = this.projectService.getSourceFiles();
     const modelFiles = sourceFiles.filter(f => f.type === 'model');

     return {
       id: '__folder_sources__',
       name: 'sources',
       type: 'folder',
       children: [
         {
           id: '__folder_sources_models__',
           name: 'models',
           type: 'folder',
           children: modelFiles.map(f => ({
             id: `source:${f.path}`,
             name: f.name,
             type: 'source-model',
             icon: f.isImported ? '✓' : undefined,
           }))
         }
       ]
     };
   }
   ```

3. **Add context menu for source files**
   - "Import" action for unimported .glb files
   - "Re-import" action for already imported files
   - "Show in Finder/Explorer" action

### Phase 7.4: Auto-Import from Source Files

**Goal**: Enable importing directly from source files in the project

1. **Add import-from-project method to ImportController**
   ```typescript
   async importFromProject(sourcePath: string): Promise<ImportOperationResult> {
     // Read file from project folder
     const file = await this.projectService.readSourceFile(sourcePath);
     // Use existing import pipeline
     return this.importWithGLTF(file);
   }
   ```

2. **Wire up UI actions**
   - Double-click on source file → import
   - Context menu "Import" → import
   - Drag source file to viewport → import and place

## File Changes Summary

| File | Changes |
|------|---------|
| `ProjectService.ts` | Add `scanSourceFiles()`, `getSourceFiles()`, `rescanProject()`, `readSourceFile()` |
| `AssetBrowserTab.ts` | Add refresh button, folder-based tree structure, source file nodes |
| `ImportController.ts` | Add `importFromProject()` method |
| `IProjectService.ts` | Add `ISourceFile` interface, new method signatures |
| `TreeView.ts` | Add 'folder' and 'source-model' node types with appropriate icons |

## Testing Checklist

- [ ] Open project → sources folder shows .glb files
- [ ] Add .glb file via Finder → click refresh → file appears
- [ ] Right-click source .glb → Import → model appears in scene
- [ ] Imported files show checkmark indicator
- [ ] Delete .model.json manually → refresh → source file loses checkmark
- [ ] Folder structure in UI matches actual disk structure

## Future Enhancements (Out of Scope)

- **File watching**: Automatically detect changes without manual refresh
- **Drag files into browser**: Import by dropping files onto the sources folder
- **Asset dependencies**: Show which models use which materials
- **Search/filter**: Filter assets by name or type
