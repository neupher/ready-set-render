# Library Tracking: WebGL Editor

> **Last Updated:** 2026-01-21T17:10:00Z  
> **Version:** 0.1.0

---

## Purpose

This document tracks ALL third-party dependencies used in the project. **Every library addition MUST be documented here with justification.**

This is a **MANDATORY** requirement. See [GUIDELINES.md](./GUIDELINES.md) for rules.

---

## Quick Reference

| Library | Category | Size | Status |
|---------|----------|------|--------|
| *No libraries added yet* | - | - | - |

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

*No libraries have been added yet. This section will be populated as the project develops.*

---

## Dependency Audit Log

| Date | Action | Library | By | Reason |
|------|--------|---------|----|----|
| 2026-01-21 | Initial setup | - | System | Project initialization |

---

## Size Budget

To keep the project lean, we maintain a size budget:

| Category | Budget | Current | Remaining |
|----------|--------|---------|-----------|
| Core dependencies | 50KB | 0KB | 50KB |
| UI libraries | 20KB | 0KB | 20KB |
| Utility libraries | 30KB | 0KB | 30KB |
| **Total** | **100KB** | **0KB** | **100KB** |

*Sizes are minified + gzipped*

---

## Related Documents

- [GUIDELINES.md](./GUIDELINES.md) - Rules for adding libraries
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Where libraries fit in the system
