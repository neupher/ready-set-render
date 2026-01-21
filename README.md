# WebGL Editor

A modular, extensible WebGL2-based 3D editor designed for learning and implementing real-time and ray-tracing rendering techniques.

## 🎯 Project Vision

This project aims to:

1. **Educate** - Implement rendering techniques from scratch without heavy abstractions
2. **Provide Professional UI** - Build an editor experience similar to Unity or Substance Painter
3. **Stay Modular** - Every feature is a plugin that can be swapped, extended, or replaced
4. **Be Accessible** - Work across browsers and on mobile devices

## 📁 Project Structure

```
webEditorClaude/
├── .llms/                    # AI context and guidelines
│   ├── PROJECT_CONTEXT.md    # Project overview and current state
│   ├── ARCHITECTURE.md       # System design and modules
│   ├── PATTERNS.md           # Code conventions
│   ├── GUIDELINES.md         # Development rules
│   ├── LIBRARIES.md          # Dependency tracking
│   ├── WORKFLOWS.md          # Automation triggers
│   └── TESTING.md            # Testing guidelines
├── src/                      # Source code (coming soon)
│   ├── core/                 # Core engine
│   ├── plugins/              # Plugin modules
│   ├── ui/                   # UI components
│   └── utils/                # Utilities
├── tests/                    # Test suites (coming soon)
├── docs/                     # Documentation (coming soon)
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Modern browser with WebGL2 support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd webEditorClaude

# Install dependencies (coming soon)
npm install

# Start development server (coming soon)
npm run dev
```

## 🎨 Features (Planned)

### Rendering

- [ ] **Forward Rendering Pipeline** - Traditional multi-pass rendering
- [ ] **Deferred Rendering Pipeline** - G-buffer based rendering for many lights
- [ ] **Raytracing Pipeline** - Software raytracing for learning/comparison

### Asset Support

- [ ] **Model Import** - OBJ and glTF formats
- [ ] **Texture Import** - PNG, JPG, TGA formats
- [ ] **Shader Editor** - In-browser GLSL editing with live preview

### UI & Tools

- [ ] **Dockable Panels** - Flexible workspace layout
- [ ] **Scene Hierarchy** - Tree view of scene objects
- [ ] **Inspector** - Property editing
- [ ] **Asset Browser** - Project asset management
- [ ] **Camera Controls** - Orbit, pan, zoom navigation
- [ ] **Selection Tools** - Object picking and manipulation

## 🏗️ Architecture

The editor follows a **plugin-based architecture**:

```
┌─────────────────────────────────────────┐
│            APPLICATION SHELL            │
├─────────────────────────────────────────┤
│              PLUGIN MANAGER             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Renderer │ │Importer │ │  Tools  │  │
│  │ Plugins │ │ Plugins │ │ Plugins │  │
│  └─────────┘ └─────────┘ └─────────┘  │
├─────────────────────────────────────────┤
│              CORE ENGINE                │
│  EventBus │ SceneGraph │ ResourceMgr   │
└─────────────────────────────────────────┘
```

See [ARCHITECTURE.md](.llms/ARCHITECTURE.md) for details.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_CONTEXT.md](.llms/PROJECT_CONTEXT.md) | Current project state and goals |
| [ARCHITECTURE.md](.llms/ARCHITECTURE.md) | System design and modules |
| [PATTERNS.md](.llms/PATTERNS.md) | Code conventions and patterns |
| [GUIDELINES.md](.llms/GUIDELINES.md) | Development rules |
| [LIBRARIES.md](.llms/LIBRARIES.md) | Dependency tracking |
| [WORKFLOWS.md](.llms/WORKFLOWS.md) | Workflow automation |
| [TESTING.md](.llms/TESTING.md) | Testing guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## 🤖 AI Assistant Guidelines

This project uses AI assistants (Claude) for development. Key rules:

1. **Read `.llms/PROJECT_CONTEXT.md` at session start**
2. **Every feature must be a plugin**
3. **No heavy abstraction libraries** (Three.js, Babylon.js forbidden)
4. **All changes require tests**
5. **Document everything**

See [GUIDELINES.md](.llms/GUIDELINES.md) for complete rules.

## 🧪 Testing

```bash
# Run all tests (coming soon)
npm test

# Run with coverage (coming soon)
npm run test:coverage

# Run in watch mode (coming soon)
npm run test:watch
```

## 📋 Contributing

1. Read the [GUIDELINES.md](.llms/GUIDELINES.md)
2. Check [ARCHITECTURE.md](.llms/ARCHITECTURE.md) for where changes belong
3. Follow [PATTERNS.md](.llms/PATTERNS.md) conventions
4. Write tests for all changes
5. Update [LIBRARIES.md](.llms/LIBRARIES.md) if adding dependencies

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run test suite |
| `npm run lint` | Run linter |

## 📝 License

[To be determined]

## 👤 Owner

**Tapani Heikkinen**  
Lead Technical Artist, Horizon Experiences Art Team

---

## Workflow Triggers (for Claude)

Use these phrases to trigger automated workflows:

| Phrase | Action |
|--------|--------|
| `start session` | Load context and summarize state |
| `finalize session` | Update docs, changelog, and commit |
| `finalize version X.X.X` | Same as above + create git tag |
| `update context` | Sync all .llms files with codebase |
| `add feature: <name>` | Create plugin structure for feature |
| `add library: <name>` | Evaluate and add dependency |
| `run tests` | Execute test suite |
| `review code` | Check for guideline violations |

See [WORKFLOWS.md](.llms/WORKFLOWS.md) for details.
