# Coordinate System Convention: WebGL Editor

> **Last Updated:** 2026-01-24T19:25:00Z
> **Version:** 1.0.0
> **Status:** CANONICAL - All rendering features MUST follow this convention

---

## Canonical Convention

This project uses a **Right-Handed, Z-Up** coordinate system, matching **Blender's** convention.

```
        +Z (Up)
         │
         │
         │
         │
         └──────────── +X (Right)
        /
       /
      /
    +Y (Forward)
```

---

## Axis Definitions

| Axis | Direction | Description |
|------|-----------|-------------|
| **+X** | Right | Positive X points to the right |
| **+Y** | Forward | Positive Y points forward (into the screen in default view) |
| **+Z** | Up | Positive Z points upward (vertical axis) |

### World Up Vector

```typescript
const WORLD_UP: Vec3 = [0, 0, 1];  // ALWAYS use this for world up
```

---

## Why Z-Up?

| Reason | Explanation |
|--------|-------------|
| **Blender Compatibility** | Direct import/export without axis swapping |
| **Architectural Intuition** | Floor plans naturally use XY plane with Z for height |
| **CAD Standard** | Most CAD software uses Z-up |
| **Ground Plane** | XY plane at Z=0 represents the ground |

---

## Comparison with Other Conventions

| Software | Handedness | Up Axis | Forward Axis | Right Axis |
|----------|------------|---------|--------------|------------|
| **This Project** | Right | +Z | +Y | +X |
| **Blender** | Right | +Z | +Y | +X |
| **Unity** | Left | +Y | +Z | +X |
| **Unreal** | Left | +Z | +X | +Y |
| **OpenGL/WebGL Default** | Right | +Y | -Z | +X |
| **Maya** | Right | +Y | -Z | +X |

---

## Implementation Requirements

### 1. Camera

```typescript
// ✅ CORRECT - Z-up camera
class Camera {
  private _up: Vec3 = [0, 0, 1];  // World up is +Z

  getUp(): Vec3 {
    return [0, 0, 1];
  }
}

// ❌ WRONG - Y-up camera (OpenGL default)
class Camera {
  private _up: Vec3 = [0, 1, 0];  // This is Y-up!
}
```

### 2. LookAt Matrix Construction

The `mat4LookAt` function must use Z-up:

```typescript
// ✅ CORRECT
function mat4LookAt(
  eye: Vec3,
  target: Vec3,
  up: Vec3 = [0, 0, 1]  // Default to Z-up
): Mat4 {
  // ... implementation
}

// ❌ WRONG
function mat4LookAt(
  eye: Vec3,
  target: Vec3,
  up: Vec3 = [0, 1, 0]  // Y-up default
): Mat4
```

### 3. Orbit Controller / Camera Navigation

Spherical coordinates must use Z as the vertical axis:

```typescript
// ✅ CORRECT - Z-up spherical coordinates
function sphericalToCartesian(radius: number, theta: number, phi: number): Vec3 {
  // theta = azimuth angle (around Z axis)
  // phi = polar angle (from +Z axis)
  const sinPhi = Math.sin(phi);
  return [
    radius * sinPhi * Math.cos(theta),  // X
    radius * sinPhi * Math.sin(theta),  // Y
    radius * Math.cos(phi)               // Z (up)
  ];
}

// ❌ WRONG - Y-up spherical coordinates
function sphericalToCartesian(radius: number, theta: number, phi: number): Vec3 {
  return [
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),              // Y as up - WRONG!
    radius * Math.sin(phi) * Math.cos(theta)
  ];
}
```

### 4. Primitive Geometry

All primitives must define geometry with Z-up:

```typescript
// ✅ CORRECT - Cube with Z-up
const cubeVertices = {
  // Top face (Z+)
  topNormal: [0, 0, 1],
  // Bottom face (Z-)
  bottomNormal: [0, 0, -1],
  // Front face (Y+)
  frontNormal: [0, 1, 0],
  // Back face (Y-)
  backNormal: [0, -1, 0],
  // Right face (X+)
  rightNormal: [1, 0, 0],
  // Left face (X-)
  leftNormal: [-1, 0, 0],
};

// ❌ WRONG - Cube with Y-up
const cubeVertices = {
  topNormal: [0, 1, 0],    // Y as up - WRONG!
  bottomNormal: [0, -1, 0],
};
```

### 5. Sphere Generation

UV sphere poles must be along Z axis:

```typescript
// ✅ CORRECT - Poles at Z±
function generateSphereVertex(u: number, v: number, radius: number): Vec3 {
  const theta = u * 2 * Math.PI;      // Around Z
  const phi = v * Math.PI;             // From +Z to -Z
  return [
    radius * Math.sin(phi) * Math.cos(theta),  // X
    radius * Math.sin(phi) * Math.sin(theta),  // Y
    radius * Math.cos(phi)                      // Z (poles)
  ];
}

// ❌ WRONG - Poles at Y±
function generateSphereVertex(u: number, v: number, radius: number): Vec3 {
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),              // Y as pole - WRONG!
    radius * Math.sin(phi) * Math.sin(theta)
  ];
}
```

### 6. Lighting / Shaders

Hemisphere ambient lighting must use Z for sky/ground:

```glsl
// ✅ CORRECT - Z-up hemisphere
float hemisphereBlend = normal.z * 0.5 + 0.5;  // +Z = sky, -Z = ground
vec3 ambient = mix(groundColor, skyColor, hemisphereBlend);

// ❌ WRONG - Y-up hemisphere
float hemisphereBlend = normal.y * 0.5 + 0.5;  // Y as up - WRONG!
```

### 7. Default Light Direction

```typescript
// ✅ CORRECT - Sun from above-right-front
const defaultLightDir: Vec3 = normalize([0.5, 0.3, -0.8]);  // Coming from +X, +Y, +Z

// ❌ WRONG - Y-up assumption
const defaultLightDir: Vec3 = normalize([0.5, -0.8, 0.3]);
```

---

## Cross Product Convention

This project uses the **standard right-handed cross product**:

```typescript
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],  // x
    a[2] * b[0] - a[0] * b[2],  // y
    a[0] * b[1] - a[1] * b[0],  // z
  ];
}

// Right-hand rule: fingers curl from a to b, thumb points to result
// X × Y = Z
// Y × Z = X
// Z × X = Y
```

---

## Triangle Winding Order

**Counter-Clockwise (CCW)** winding when viewed from the front (outside) of a surface.

```typescript
// Front-facing triangle (CCW when viewed from +Z looking at XY plane)
const triangle = [
  [0, 0, 0],  // v0
  [1, 0, 0],  // v1 (right of v0)
  [0, 1, 0],  // v2 (forward of v0)
];

// WebGL setup
gl.frontFace(gl.CCW);
gl.cullFace(gl.BACK);
gl.enable(gl.CULL_FACE);
```

---

## Import/Export Guidelines

### Importing from Y-Up Software (Unity, Maya, OpenGL default)

```typescript
function convertYUpToZUp(position: Vec3): Vec3 {
  return [position[0], -position[2], position[1]];  // Swap Y↔Z, negate new Y
}

function convertYUpRotationToZUp(rotation: Vec3): Vec3 {
  // Euler angles need careful conversion - consider quaternions
  return [rotation[0], -rotation[2], rotation[1]];
}
```

### Exporting to Y-Up Software

```typescript
function convertZUpToYUp(position: Vec3): Vec3 {
  return [position[0], position[2], -position[1]];  // Swap Y↔Z, negate new Z
}
```

### GLTF Import Notes

GLTF uses **Y-up, right-handed**. When importing:
1. Apply axis conversion to all vertex positions
2. Apply axis conversion to all normals
3. Convert animation curves
4. Update bounding boxes

---

## Migration Status

### ✅ COMPLETE: Z-Up Implementation

The codebase has been migrated to **Z-up** (Blender convention). The following files have been updated:

#### Core Math

| File | Change |
|------|--------|
| `src/utils/math/transforms.ts` | Updated `mat4LookAt` documentation to reference Z-up |

#### Camera System

| File | Change |
|------|--------|
| `src/core/Camera.ts` | `_up = [0, 0, 1]` (Z-up) |
| `src/core/RenderCameraAdapter.ts` | `up` property returns `[0, 0, 1]` |
| `src/core/CameraEntity.ts` | Default position `[5, -7, 4]` for Z-up viewing angle |

#### Navigation

| File | Change |
|------|--------|
| `src/plugins/navigation/OrbitController.ts` | Z-up spherical coordinates, `worldUp = [0, 0, 1]` |

#### Primitives

| File | Change |
|------|--------|
| `src/plugins/primitives/Cube.ts` | Top/bottom faces along Z axis |
| `src/plugins/primitives/Sphere.ts` | Poles along Z axis |

#### Shaders/Lighting

| File | Change |
|------|--------|
| `src/plugins/renderers/forward/ForwardRenderer.ts` | Hemisphere uses `normal.z` |
| `src/plugins/renderers/gizmos/LightGizmoRenderer.ts` | Fallback up `[0, 0, 1]` |

#### New Features

| File | Description |
|------|-------------|
| `src/plugins/renderers/gizmos/ViewportGizmoRenderer.ts` | Orientation indicator showing XYZ axes |

---

## Checklist for New Rendering Features

Before implementing any new rendering feature, verify:

- [ ] World up vector is `[0, 0, 1]` (not `[0, 1, 0]`)
- [ ] Geometry uses Z as vertical axis
- [ ] Normals point outward with CCW winding
- [ ] Shaders use `normal.z` for vertical-dependent effects
- [ ] Camera/orbit math uses Z-up spherical coordinates
- [ ] Imported assets are converted from their native coordinate system
- [ ] Unit tests verify Z-up behavior

---

## Testing Coordinate System Compliance

```typescript
// Example test for Z-up compliance
describe('Coordinate System', () => {
  it('should use Z as world up', () => {
    const camera = new Camera();
    expect(camera.getUp()).toEqual([0, 0, 1]);
  });

  it('should have cube top face pointing +Z', () => {
    const cube = new Cube();
    const meshData = cube.getMeshData();
    // Find top face normal (should be [0, 0, 1])
    const topFaceNormal = findFaceNormal(meshData, 'top');
    expect(topFaceNormal).toEqual([0, 0, 1]);
  });

  it('should compute correct hemisphere lighting', () => {
    // Normal pointing up (+Z) should get sky color
    const upNormal = [0, 0, 1];
    const hemisphereBlend = upNormal[2] * 0.5 + 0.5;  // Should be 1.0
    expect(hemisphereBlend).toBe(1.0);
  });
});
```

---

## Related Documents

- [GUIDELINES.md](./GUIDELINES.md) - Section 8: Coordinate System Rule (MANDATORY)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Render Pipeline Modularity
- [PATTERNS.md](./PATTERNS.md) - Code conventions
