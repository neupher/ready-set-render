# Library Tracking: WebGL Editor

> **Last Updated:** 2026-02-12T11:02:00Z
> **Version:** 0.1.4

---

## Purpose

This document tracks ALL third-party dependencies used in the project. **Every library addition MUST be documented here with justification.**

This is a **MANDATORY** requirement. See [GUIDELINES.md](./GUIDELINES.md) for rules.

---

## Quick Reference

| Library | Category | Size | Status |
|---------|----------|------|--------|
| monaco-editor | UI / Editor | ~700KB gzip | ✅ Approved |
| vite-plugin-glsl | Build / GLSL | ~15KB | ✅ Approved |

---

## Evaluation Criteria

Before adding any library, answer these questions:

### 1. Necessity
- [ ] Can this be implemented manually in reasonable time?
- [ ] Does implementing it manually serve the learning goals?
- [ ] Is this a core functionality that would be error-prone to implement?

### 2. Size & Bloat
- [ ] What is the minified + gzipped size?
- [ ] Does it have unnecessary dependencies?
- [ ] Can we use a subset/tree-shake effectively?

### 3. Maintenance
- [ ] Is the library actively maintained?
- [ ] What is the GitHub star count / npm weekly downloads?
- [ ] Are there open critical issues?

### 4. Alternatives
- [ ] What alternatives exist?
- [ ] Why was this one chosen over alternatives?

---

## Approved Libraries

### Math / Linear Algebra

*None added yet*

**Candidates under consideration:**

| Library | Size | Pros | Cons | Recommendation |
|---------|------|------|------|----------------|
| gl-matrix | 15KB | Industry standard, fast, complete | Functional API (not OOP) | ✅ Recommended |
| wgpu-matrix | 12KB | Modern, TypeScript-first | Newer, less battle-tested | Consider |
| Custom | 0KB | Full control, learning | Time investment, bugs | For specific needs |

---

### UI Framework

*None added yet*

**Candidates under consideration:**

| Library | Size | Pros | Cons | Recommendation |
|---------|------|------|------|----------------|
| Preact | 4KB | Small, React-compatible | Smaller ecosystem | ✅ Recommended |
| Solid.js | 7KB | Very fast, fine-grained reactivity | Different paradigm | Consider |
| Lit | 5KB | Web components, standard-based | Less flexible | Consider |
| Custom | 0KB | Full control | Significant effort | Not recommended for UI |

---

### Build Tools

*None added yet*

**Candidates under consideration:**

| Library | Category | Pros | Cons | Recommendation |
|---------|----------|------|------|----------------|
| Vite | Bundler | Fast, modern, good defaults | None significant | ✅ Recommended |
| esbuild | Bundler | Extremely fast | Less plugins | Alternative |
| TypeScript | Language | Type safety, tooling | Compilation step | ✅ Required |

---

### Testing

*None added yet*

**Candidates under consideration:**

| Library | Category | Pros | Cons | Recommendation |
|---------|----------|------|------|----------------|
| Vitest | Test runner | Fast, Vite-native, Jest-compatible | Newer | ✅ Recommended |
| Playwright | E2E | Cross-browser, reliable | Heavier | For E2E tests |

---

## Forbidden Libraries

These libraries are **NOT ALLOWED** in this project:

| Library | Reason |
|---------|--------|
| Three.js | Too much abstraction, defeats learning purpose |
| Babylon.js | Too much abstraction, defeats learning purpose |
| A-Frame | Too high-level |
| PlayCanvas | Full engine, too abstract |
| React | Too heavy for this use case (use Preact) |
| Angular | Too heavy |
| Vue | Heavier than needed |
| jQuery | Not needed, outdated patterns |
| Lodash | Native JS is sufficient |
| Moment.js | Use native Date or day.js if needed |

---

## Library Addition Process

### Step 1: Evaluate

Complete the evaluation checklist above.

### Step 2: Document

Add an entry below in the "Added Libraries" section with:

```markdown
### [Library Name]

**Added:** YYYY-MM-DD
**Version:** X.X.X
**Category:** Math / UI / Build / Utility / etc.
**Size:** XXkb (minified + gzipped)
**npm:** https://www.npmjs.com/package/[name]
**GitHub:** https://github.com/[org]/[repo]

#### Justification

Why this library is needed and why alternatives were not chosen.

#### Usage

Where in the codebase this library is used.

#### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|---------------|
| X | Reason |
| Y | Reason |
```

### Step 3: Get Approval

For major dependencies (>20kb or core functionality), get owner approval before adding.

### Step 4: Install

```bash
npm install [library-name]
```

### Step 5: Update package.json Comments

Add a comment in package.json explaining why the library exists.

---

## Added Libraries

### monaco-editor

**Added:** 2026-01-22
**Version:** ^0.52.2
**Category:** UI / Code Editor
**Size:** ~700KB (gzipped), ~2.5MB (unpacked)
**npm:** https://www.npmjs.com/package/monaco-editor
**GitHub:** https://github.com/microsoft/monaco-editor

#### Justification

Monaco Editor is required for **Goal #10: In-editor shader text editor**. A professional-grade code editor with syntax highlighting is essential for shader development workflow. Monaco provides:

- GLSL/shader syntax highlighting (via custom language definitions)
- Intelligent code completion
- Error highlighting and diagnostics
- Multi-cursor editing
- Find and replace with regex support
- Minimap navigation
- Bracket matching and auto-closing

This is a **specialized feature** that would be impractical to implement manually. The complexity of building a production-quality code editor exceeds the learning goals of this project (which focus on WebGL2 rendering, not text editing).

#### Size Budget Exemption

Monaco is exempt from the standard 250KB size budget because:

1. It's a specialized, isolated feature (shader editor panel only)
2. It will be **lazy-loaded** — not included in the initial bundle
3. No reasonable alternatives exist at smaller sizes for this level of functionality
4. The learning focus is WebGL2, not reinventing code editors

#### Usage

- `src/ui/panels/PropertiesPanel.ts` — Shader Editor tab (planned)
- Future: Standalone shader editor window

#### Lazy Loading Strategy

```typescript
// Monaco should be dynamically imported when shader tab is first opened
const monaco = await import('monaco-editor');
```

This ensures the ~700KB payload is only downloaded when users actually need the shader editor.

#### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|---------------|
| CodeMirror 6 | Similar size (~400KB), less TypeScript integration, fewer features |
| Ace Editor | Older architecture, less active development |
| Simple textarea | Insufficient for shader development (no highlighting, no errors) |
| Custom implementation | Impractical — would take months and distract from core goals |

---

## Dependency Audit Log

| Date | Action | Library | By | Reason |
|------|--------|---------|----|--------|
| 2026-01-21 | Initial setup | - | System | Project initialization |
| 2026-01-22 | Documented | monaco-editor | Claude | Shader editor requirement (Goal #10) |

---

## Size Budget

To keep the project lean while allowing flexibility for good architectural decisions, we maintain a size budget:

| Category | Budget | Current | Remaining |
|----------|--------|---------|-----------|
| Core dependencies | 100KB | 0KB | 100KB |
| UI libraries | 75KB | 0KB | 75KB |
| Utility libraries | 75KB | 0KB | 75KB |
| **Total** | **250KB** | **0KB** | **250KB** |

### Exemptions

| Library | Size | Reason for Exemption |
|---------|------|----------------------|
| monaco-editor | ~700KB | Specialized feature, lazy-loaded, no practical alternative |

*Sizes are minified + gzipped*

**Note:** Budget increased from 100KB to 250KB (2026-01-22) to allow flexibility for better architectural decisions without being overly constrained.

---

## Related Documents

- [GUIDELINES.md](./GUIDELINES.md) - Rules for adding libraries
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Where libraries fit in the system
