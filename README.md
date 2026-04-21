# WebGL Editor

A modular, extensible WebGL2-based 3D editor for learning real-time and ray-tracing rendering techniques.

**See in Action! Live URL:** [https://neupher.github.io/ready-set-render/](https://neupher.github.io/ready-set-render/)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
ready-set-render/
├── src/
│   ├── core/              # Core engine modules
│   ├── plugins/           # Plugin modules
│   ├── ui/                # UI system
│   └── utils/             # Shared utilities
├── tests/                 # Test suites
├── test_assets/           # Large test-only fixtures, excluded from deployed app assets
├── public/                # Static assets
└── .llms/                 # AI context and guidelines
```

## 🎯 Features

- ✅ Plugin-based architecture
- ✅ WebGL2 rendering
- ✅ Collapsible panel system
- ✅ Monaco editor for shaders
- ✅ Touch-friendly mobile support
- ✅ GitHub Pages deployment

## 📖 Documentation

See the `.llms/` directory for comprehensive documentation:

- **PROJECT_CONTEXT.md** - Project overview and status
- **ARCHITECTURE.md** - System design and module structure
- **GUIDELINES.md** - Development rules and constraints
- **PATTERNS.md** - Code conventions and best practices
- **LIBRARIES.md** - Dependency tracking
- **TESTING.md** - Testing requirements
- **WORKFLOWS.md** - Automated workflows

## 🧪 Testing

This project maintains >85% test coverage. Tests are located in the `tests/` directory.

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

Large test fixture:

- `/c:/Git/ready-set-render/test_assets/studio_setup.glb` is available for importer, integration, and visual verification work
- This asset is test-only and must not be bundled into the deployed application or copied into production-facing runtime assets

## 🚀 Deployment

The project automatically deploys to GitHub Pages when pushed to the `main` branch.

**Live URL:** [https://neupher.github.io/ready-set-render/](https://neupher.github.io/ready-set-render/)

## 📦 Bundle Size Budget

| Category | Budget | Status |
|----------|--------|--------|
| Core Engine | 50KB | ✅ |
| Renderer | 30KB | ✅ |
| UI System | 75KB | ✅ |
| Monaco Editor | 15KB | ✅ |
| Utils | 30KB | ✅ |
| **Total** | **200KB** | **✅ Under 250KB** |

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Vitest** - Unit testing
- **Monaco Editor** - Code editor
- **WebGL2** - 3D rendering (no abstractions)

## 📝 License

MIT
