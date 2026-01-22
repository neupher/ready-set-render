# Testing Guidelines: WebGL Editor

> **Last Updated:** 2026-01-21T17:11:00Z  
> **Version:** 0.1.0

---

## Purpose

This document defines the testing strategy, requirements, and best practices for the WebGL Editor project. **Testing is MANDATORY** - no code should be merged without appropriate tests.

---

## Testing Philosophy

### Core Principles

1. **Tests are first-class citizens** - Tests are as important as production code
2. **Test behavior, not implementation** - Focus on what the code does, not how
3. **Fast feedback loop** - Tests should run quickly
4. **Isolated tests** - Each test should be independent

### Test Pyramid

```
         /\
        /  \        E2E Tests (few)
       /----\       - Full browser testing
      /      \      - Critical user flows only
     /--------\     Integration Tests (some)
    /          \    - Module interactions
   /------------\   - API contracts
  /              \  Unit Tests (many)
 /________________\ - Plugin logic
                    - Utilities
                    - Pure functions
```

---

## Test Requirements by Module Type

### Core Modules

| Module | Unit Tests | Integration Tests | Required Coverage |
|--------|------------|-------------------|-------------------|
| EventBus | ✅ Yes | ✅ Yes | 90% |
| SceneGraph | ✅ Yes | ✅ Yes | 85% |
| ResourceManager | ✅ Yes | ✅ Yes | 85% |
| WebGLContext | ✅ Yes | ✅ Yes | 80% |
| PluginManager | ✅ Yes | ✅ Yes | 90% |

### Plugins

| Plugin Type | Unit Tests | Integration Tests | Required Coverage |
|-------------|------------|-------------------|-------------------|
| Render Pipelines | ✅ Yes | ✅ Yes | 80% |
| Importers | ✅ Yes | ✅ Yes | 85% |
| UI Panels | ✅ Yes | Optional | 70% |
| Tools | ✅ Yes | Optional | 75% |

### Utilities

| Utility Type | Unit Tests | Required Coverage |
|--------------|------------|-------------------|
| Math functions | ✅ Yes | 95% |
| GL helpers | ✅ Yes | 85% |
| Common utilities | ✅ Yes | 90% |

---

## Test Structure

### Directory Layout

```
tests/
├── unit/
│   ├── core/
│   │   ├── EventBus.test.ts
│   │   ├── SceneGraph.test.ts
│   │   └── ...
│   ├── plugins/
│   │   ├── renderers/
│   │   │   ├── ForwardRenderer.test.ts
│   │   │   └── ...
│   │   ├── importers/
│   │   └── tools/
│   └── utils/
│       ├── math/
│       │   ├── vec3.test.ts
│       │   └── mat4.test.ts
│       └── gl/
│
├── integration/
│   ├── plugin-lifecycle.test.ts
│   ├── render-pipeline-swap.test.ts
│   └── import-workflow.test.ts
│
├── e2e/
│   ├── editor-launch.test.ts
│   └── model-import.test.ts
│
├── fixtures/
│   ├── models/
│   │   ├── cube.obj
│   │   └── simple.gltf
│   └── textures/
│       └── test-pattern.png
│
└── helpers/
    ├── webgl-mock.ts
    ├── test-utils.ts
    └── fixtures.ts
```

### File Naming

```
<ModuleName>.test.ts       # Unit tests
<Feature>.integration.ts   # Integration tests
<UserFlow>.e2e.ts          # End-to-end tests
```

---

## Writing Tests

### Test File Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MyModule } from '@src/path/to/MyModule';

describe('MyModule', () => {
  let instance: MyModule;

  beforeEach(() => {
    instance = new MyModule();
  });

  afterEach(() => {
    instance.dispose();
  });

  describe('methodName', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should throw when given invalid input', () => {
      expect(() => instance.methodName(null)).toThrow('Invalid input');
    });
  });
});
```

### Test Naming Convention

Use descriptive names that explain the behavior:

```typescript
// ✅ GOOD
it('should emit "scene:objectAdded" event when adding an object to the scene')
it('should return null when shader compilation fails')
it('should dispose all resources when dispose() is called')

// ❌ BAD
it('works')
it('test addObject')
it('should work correctly')
```

### Arrange-Act-Assert Pattern

```typescript
it('should calculate view matrix correctly', () => {
  // Arrange - Set up test data
  const camera = new Camera();
  camera.position = vec3.fromValues(0, 0, 5);
  camera.target = vec3.fromValues(0, 0, 0);

  // Act - Execute the code under test
  const viewMatrix = camera.getViewMatrix();

  // Assert - Verify the result
  expect(viewMatrix[14]).toBeCloseTo(-5); // Translation Z
});
```

---

## Mocking WebGL

Since WebGL requires a canvas and browser context, we need mocking strategies:

### WebGL Context Mock

```typescript
// tests/helpers/webgl-mock.ts
export function createMockGL(): WebGL2RenderingContext {
  return {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    // ... add more as needed
  } as unknown as WebGL2RenderingContext;
}
```

### Using the Mock

```typescript
import { createMockGL } from '@tests/helpers/webgl-mock';

describe('ShaderProgram', () => {
  let gl: WebGL2RenderingContext;
  let shader: ShaderProgram;

  beforeEach(() => {
    gl = createMockGL();
    shader = new ShaderProgram(gl);
  });

  it('should compile shader successfully', () => {
    shader.compile(vertexSource, fragmentSource);
    expect(gl.compileShader).toHaveBeenCalledTimes(2);
    expect(gl.linkProgram).toHaveBeenCalled();
  });
});
```

---

## Integration Testing

### Plugin Lifecycle Tests

```typescript
describe('Plugin Lifecycle', () => {
  it('should initialize plugins in dependency order', async () => {
    const manager = new PluginManager();
    const initOrder: string[] = [];

    const pluginA: IPlugin = {
      id: 'plugin-a',
      dependencies: ['plugin-b'],
      initialize: async () => { initOrder.push('a'); },
    };

    const pluginB: IPlugin = {
      id: 'plugin-b',
      initialize: async () => { initOrder.push('b'); },
    };

    manager.register(pluginA);
    manager.register(pluginB);
    await manager.initializeAll();

    expect(initOrder).toEqual(['b', 'a']);
  });
});
```

### Render Pipeline Swap Tests

```typescript
describe('Render Pipeline Swap', () => {
  it('should hot-swap render pipelines without errors', async () => {
    const editor = await createTestEditor();
    
    // Start with forward renderer
    editor.settings.set('renderer.pipeline', 'forward');
    await editor.render();
    
    // Swap to deferred
    editor.settings.set('renderer.pipeline', 'deferred');
    await editor.render();
    
    // Verify no errors and correct pipeline active
    expect(editor.getActivePipeline().type).toBe('deferred');
    expect(editor.getErrorLog()).toHaveLength(0);
  });
});
```

---

## Testing WebGL Rendering

### Snapshot Testing for Shaders

```typescript
describe('Forward Shader', () => {
  it('should match expected vertex shader output', () => {
    const shader = new ForwardShader();
    expect(shader.getVertexSource()).toMatchSnapshot();
  });
});
```

### Visual Regression Testing (E2E)

```typescript
describe('Viewport Rendering', () => {
  it('should render a cube correctly', async ({ page }) => {
    await page.goto('/editor');
    await page.click('[data-testid="add-cube"]');
    
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('cube-render.png', {
      maxDiffPixels: 100,
    });
  });
});
```

---

## Test Modification Policy

### ⚠️ IMPORTANT: Test Modification Requires Approval

When tests fail, follow this process:

1. **Analyze the failure**
   - Is the test correct and code is wrong?
   - Is the test outdated due to intentional changes?

2. **If code is wrong:**
   - Fix the code
   - Do NOT modify the test
   - Run tests until they pass

3. **If test needs modification:**
    ```
    ⛔ STOP - DO NOT MODIFY THE TEST
    
    1. Notify the project owner with:
       - Which test needs modification
       - Why it needs to change
       - What the new expected behavior should be
    
    2. Wait for approval
    
    3. Only then modify the test
    ```

### Notification Template

```markdown
## Test Modification Request

**Test file:** `tests/unit/core/SceneGraph.test.ts`
**Test name:** `should emit event when object removed`

**Current behavior:** Test expects `scene:objectRemoved` event
**Required change:** Need to change to `scene:nodeRemoved` event

**Reason:** The event name was changed as part of the scene graph refactoring to be more consistent with other events.

**Approval needed from:** Project Owner
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- EventBus.test.ts

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm test -- --dir tests/unit

# Run only integration tests
npm test -- --dir tests/integration
```

### CI Pipeline Requirements

Tests run automatically on:
- Every commit
- Every PR
- Before merge to main

**Merge is blocked if:**
- Any test fails
- Coverage drops below threshold
- New code has no tests

---

## Coverage Requirements

### Minimum Thresholds

```json
{
  "coverage": {
    "branches": 80,
    "functions": 85,
    "lines": 85,
    "statements": 85
  }
}
```

### Coverage Exceptions

Some code may be excluded from coverage:

```typescript
/* istanbul ignore next */
function debugOnly() {
  // This is only for development debugging
}
```

Use sparingly and document why.

---

## Test Fixtures

### Model Fixtures

Place test models in `tests/fixtures/models/`:

- `cube.obj` - Simple cube for basic import tests
- `cube-with-normals.obj` - Cube with explicit normals
- `simple.gltf` - Minimal glTF scene
- `complex.gltf` - Scene with multiple meshes

### Texture Fixtures

Place test textures in `tests/fixtures/textures/`:

- `test-pattern.png` - 64x64 checkerboard
- `gradient.png` - Color gradient for format testing

---

## Performance Testing

### Benchmarks

```typescript
import { bench, describe } from 'vitest';

describe('Matrix Operations', () => {
  bench('mat4.multiply', () => {
    mat4.multiply(out, a, b);
  });

  bench('mat4.invert', () => {
    mat4.invert(out, a);
  });
});
```

### Performance Thresholds

```typescript
it('should render 1000 objects in under 16ms', async () => {
  const scene = createSceneWith1000Objects();
  
  const start = performance.now();
  await renderer.render(scene);
  const elapsed = performance.now() - start;
  
  expect(elapsed).toBeLessThan(16);
});
```

---

## Related Documents

- [GUIDELINES.md](./GUIDELINES.md) - Testing requirements
- [PATTERNS.md](./PATTERNS.md) - Test patterns
- [WORKFLOWS.md](./WORKFLOWS.md) - Test workflow triggers
