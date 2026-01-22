/**
 * Transform Utilities
 *
 * Matrix math utilities for 3D transformations.
 * Implements common matrix operations without external dependencies.
 *
 * All matrices are in column-major order (WebGL convention).
 */

/**
 * Type alias for a 4x4 matrix represented as a Float32Array.
 * Matrices are stored in column-major order for WebGL compatibility.
 */
export type Mat4 = Float32Array;

/**
 * Type alias for a 3D vector.
 */
export type Vec3 = [number, number, number];

/**
 * Create a 4x4 identity matrix.
 *
 * @returns A new identity matrix
 */
export function mat4Identity(): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Create a perspective projection matrix.
 *
 * @param fovy - Field of view in radians (vertical)
 * @param aspect - Aspect ratio (width / height)
 * @param near - Near clipping plane distance
 * @param far - Far clipping plane distance
 * @returns A new perspective projection matrix
 */
export function mat4Perspective(
  fovy: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
  const out = new Float32Array(16);
  const f = 1.0 / Math.tan(fovy / 2.0);
  const range = 1 / (near - far);

  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;

  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;

  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * range;
  out[11] = -1;

  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) * range;
  out[15] = 0;

  return out;
}

/**
 * Create a look-at view matrix.
 *
 * @param eye - Camera position
 * @param target - Target point to look at
 * @param up - Up vector (usually [0, 1, 0])
 * @returns A new view matrix
 */
export function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const out = new Float32Array(16);

  // Calculate forward, right, and up vectors
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];

  // Normalize z
  let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
  if (len > 0) {
    len = 1 / len;
    zx *= len;
    zy *= len;
    zz *= len;
  }

  // Cross product: up x z = x
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;

  // Normalize x
  len = Math.sqrt(xx * xx + xy * xy + xz * xz);
  if (len > 0) {
    len = 1 / len;
    xx *= len;
    xy *= len;
    xz *= len;
  }

  // Cross product: z x x = y
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;

  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;

  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;

  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;

  return out;
}

/**
 * Multiply two 4x4 matrices.
 *
 * @param a - First matrix
 * @param b - Second matrix
 * @returns A new matrix: a * b
 */
export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);

  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  return out;
}

/**
 * Create a translation matrix.
 *
 * @param x - X translation
 * @param y - Y translation
 * @param z - Z translation
 * @returns A new translation matrix
 */
export function mat4Translation(x: number, y: number, z: number): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);
}

/**
 * Create a scale matrix.
 *
 * @param x - X scale factor
 * @param y - Y scale factor
 * @param z - Z scale factor
 * @returns A new scale matrix
 */
export function mat4Scale(x: number, y: number, z: number): Mat4 {
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Create a rotation matrix around the X axis.
 *
 * @param radians - Rotation angle in radians
 * @returns A new rotation matrix
 */
export function mat4RotationX(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Create a rotation matrix around the Y axis.
 *
 * @param radians - Rotation angle in radians
 * @returns A new rotation matrix
 */
export function mat4RotationY(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Create a rotation matrix around the Z axis.
 *
 * @param radians - Rotation angle in radians
 * @returns A new rotation matrix
 */
export function mat4RotationZ(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Convert degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}
