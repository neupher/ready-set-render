# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-01-21

### Added
- **Foundation Setup**: Complete project structure and build infrastructure
  - Directory structure following `.llms/ARCHITECTURE.md` specification
  - TypeScript configuration with strict mode and path aliases
  - Vite build system with development server
  - Vitest testing framework with coverage configuration
  - GitHub Actions workflow for automated deployment to GitHub Pages
  - Monaco Editor dependency for shader editing (15KB)
- **Configuration Files**:
  - `package.json` with all dependencies and scripts
  - `tsconfig.json` with path aliases (`@core/*`, `@plugins/*`, `@utils/*`, `@ui/*`)
  - `vite.config.ts` with production build optimization
  - `vitest.config.ts` with 85% coverage thresholds
  - `.gitignore` for Node.js, build outputs, and IDE files
- **Entry Point**:
  - `index.html` with loading screen and app container
  - `src/index.ts` with WebGL2 detection and error handling
  - Basic placeholder UI showing initialization status
- **Development Infrastructure**:
  - Test setup file with jsdom environment
  - GitHub Actions workflow for CI/CD
  - Path alias resolution for clean imports
  - Source maps for debugging
- **Documentation**:
  - Updated `README.md` with quick start guide
  - Bundle size budget tracking (90KB target)
  - Tech stack documentation
  - Development commands reference

### Changed
- Updated `README.md` from planning document to active project documentation
- Removed Meta-specific references from `.llms/` files for public repository

### Technical Details
- **Bundle Size Budget**: 90KB total (10KB under 100KB limit)
  - Core Engine: 20KB
  - Renderer: 10KB
  - UI System: 35KB
  - Monaco Editor: 15KB
  - Utils: 10KB
- **Dependencies**: 266 packages installed (primarily dev dependencies)
- **Test Coverage**: Configured for >85% coverage on lines, functions, statements
- **Browser Targets**: ES2020, WebGL2-capable browsers

### Development Notes
- Foundation is complete and ready for Phase 2 (Core Engine implementation)
- All configuration files validated with no errors
- Dev server configured on port 3000 with auto-open
- Production build targets GitHub Pages with base path `/web-editor-example/`

---

## [Unreleased]

### Planned
- **Phase 2**: Core engine implementation (EventBus, PluginManager, WebGLContext, SceneGraph)
- **Phase 3**: Renderer migration from ready-set-render
- **Phase 4**: UI layer with collapsible panels
- **Phase 5**: Test infrastructure with WebGL mocks
- **Phase 6**: GitHub Pages deployment testing
- **Phase 7**: Documentation updates

---

[Unreleased]: https://github.com/user/repo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/repo/releases/tag/v0.1.0
