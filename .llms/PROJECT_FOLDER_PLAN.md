# Project Folder Feature Plan

> **Last Updated:** 2026-02-03T17:34:00Z
> **Version:** 0.13.0
> **Status:** Phases 1-4 Complete

---

## Overview

Allow users to specify a local folder as their "project folder" - the root directory for all project assets (materials, shaders, textures, scenes, etc.). This is a fundamental feature for any 3D editor.

---

## Goals

1. **Project-based workflow**: Users can organize assets in a persistent location
2. **Asset discovery**: Automatically scan project folder for existing assets
3. **Asset persistence**: Save/load assets to/from the project folder
4. **Cross-session continuity**: Remember last opened project

---

## User Flow

1. **First Launch (No Project)**
   - Assets panel shows "No Project Open"
   - Prompt to "Open Project Folder" or "Create New Project"

2. **Open/Create Project**
   - File → Open Project Folder (or button in Assets panel)
   - Uses File System Access API `showDirectoryPicker()`
   - Scans folder for existing `.material.json`, `.shader.json`, `.scene.json` files
   - Registers found assets in AssetRegistry

3. **Working with Project**
   - New assets are saved to project folder automatically
   - Asset changes are persisted on save
   - Project path shown in title bar or status

---

## Implementation Phases

### Phase 1: Project Service (Core)

Create `ProjectService` to manage project state:

```typescript
// src/core/ProjectService.ts
interface ProjectService {
  // State
  isProjectOpen: boolean;
  projectPath: string | null;
  projectHandle: FileSystemDirectoryHandle | null;

  // Operations
  openProject(): Promise<ProjectOpenResult>;
  closeProject(): Promise<void>;
  createProject(name: string): Promise<ProjectOpenResult>;

  // Asset operations
  scanForAssets(): Promise<IAsset[]>;
  saveAsset(asset: IAsset): Promise<void>;
  deleteAssetFile(uuid: string): Promise<void>;
}
```

**Files to create:**
- `src/core/ProjectService.ts`
- `src/core/interfaces/IProjectService.ts`

### Phase 2: Project Storage Structure

Define project folder structure:

```
MyProject/
├── .ready-set-render/          # Project metadata
│   └── project.json            # Project settings, version
├── Assets/
│   ├── Materials/
│   │   └── *.material.json
│   ├── Shaders/
│   │   └── *.shader.json
│   └── Textures/               # Future
│       └── *.png, *.jpg
└── Scenes/
    └── *.scene.json
```

**Files to create:**
- `src/core/assets/ProjectStructure.ts` - Folder structure constants
- Update `FileSystemAssetStore.ts` - Use project-relative paths

### Phase 3: Assets Panel Integration

Update Assets panel for project workflow:

1. **No Project State**
   - Show "Open Project" button
   - Disable asset creation buttons

2. **Project Open State**
   - Show project name in header
   - Enable asset operations
   - Show folder tree organized by type

**Files to modify:**
- `src/ui/panels/AssetsPanel.ts`
- `src/ui/tabs/AssetBrowserTab.ts`

### Phase 4: Application Integration

Wire ProjectService into Application:

1. Initialize ProjectService in `Application.ts`
2. Pass to EditorLayout/AssetsPanel
3. Add menu items: File → Open Project, File → Close Project
4. Remember last project in localStorage

**Files to modify:**
- `src/core/Application.ts`
- `src/ui/panels/EditorLayout.ts`
- `src/ui/components/TopMenuBar.ts`

### Phase 5: Asset Auto-Save

Implement automatic asset persistence:

1. Listen for `asset:modified` events
2. Debounce saves (500ms after last change)
3. Write to project folder
4. Show save indicator in UI

**Files to create:**
- `src/core/AssetPersistenceService.ts`

---

## Technical Considerations

### File System Access API

- **Browser Support**: Chrome 86+, Edge 86+, Opera 72+ (no Firefox/Safari)
- **Permissions**: Must be user-initiated, permissions persist per origin
- **Fallback**: For unsupported browsers, show message suggesting Chrome

### Asset File Formats

Already defined in Asset System:
- `.material.json` - Material assets
- `.shader.json` - Shader assets
- `.scene.json` - Scene assets

### Built-in vs User Assets

- Built-in shaders/materials: Never saved to project (read-only)
- User assets: Saved to project folder
- `isBuiltIn` flag distinguishes them

---

## Testing Strategy

1. **Unit Tests**
   - ProjectService operations (mock FileSystemDirectoryHandle)
   - Asset scanning logic
   - File path generation

2. **Integration Tests**
   - Open/close project flow
   - Asset create → save → reload cycle

3. **Manual Testing**
   - Cross-session persistence
   - Error handling (permission denied, folder deleted)

---

## Success Criteria

- [x] User can open a folder as a project
- [x] Assets panel shows project contents (two-section: Built-in / Project)
- [ ] New assets are saved to project folder (Phase 5: Auto-Save)
- [ ] Project persists across browser sessions (localStorage for path only, full restore pending)
- [x] Clear error messages for unsupported browsers

---

## Dependencies

- Asset System (Phase A-E) ✅ Complete
- File System Access API support

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Project Service | 2-3 hours |
| Phase 2: Storage Structure | 1-2 hours |
| Phase 3: Assets Panel | 2-3 hours |
| Phase 4: App Integration | 1-2 hours |
| Phase 5: Auto-Save | 1-2 hours |
| **Total** | **7-12 hours** |

---

## Related Documents

- [ASSET_SYSTEM_PLAN.md](./ASSET_SYSTEM_PLAN.md) - Asset system implementation
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Current project state
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
