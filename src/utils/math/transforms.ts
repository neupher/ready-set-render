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
 * @param up - Up vector (world up is [0, 0, 1] for Z-up coordinate system)
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

/**
 * Normalize a 3D vector.
 *
 * @param v - The vector to normalize [x, y, z]
 * @returns A new normalized vector
 */
export function vec3Normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) {
    return [0, 0, 0];
  }
  const invLen = 1 / len;
  return [v[0] * invLen, v[1] * invLen, v[2] * invLen];
}

/**
 * Compute the dot product of two 3D vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product
 */
export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Subtract two 3D vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns a - b
 */
export function vec3Subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Type alias for a 3x3 matrix represented as a Float32Array.
 * Matrices are stored in column-major order for WebGL compatibility.
 */
export type Mat3 = Float32Array;

/**
 * Invert a 4x4 matrix.
 *
 * @param m - The matrix to invert
 * @returns A new inverted matrix, or identity if not invertible
 */
export function mat4Inverse(m: Mat4): Mat4 {
  const out = new Float32Array(16);

  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (Math.abs(det) < 1e-10) {
    return mat4Identity();
  }

  det = 1.0 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return out;
}

/**
 * Extract the upper-left 3x3 matrix from a 4x4 matrix.
 *
 * @param m - The 4x4 matrix
 * @returns A new 3x3 matrix
 */
export function mat3FromMat4(m: Mat4): Mat3 {
  return new Float32Array([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ]);
}

/**
 * Transpose a 3x3 matrix.
 *
 * @param m - The matrix to transpose
 * @returns A new transposed matrix
 */
export function mat3Transpose(m: Mat3): Mat3 {
  return new Float32Array([
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ]);
}

/**
 * Invert a 3x3 matrix.
 *
 * @param m - The matrix to invert
 * @returns A new inverted matrix
 */
export function mat3Inverse(m: Mat3): Mat3 {
  const out = new Float32Array(9);

  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[3], a11 = m[4], a12 = m[5];
  const a20 = m[6], a21 = m[7], a22 = m[8];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  let det = a00 * b01 + a01 * b11 + a02 * b21;

  if (Math.abs(det) < 1e-10) {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  det = 1.0 / det;

  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;

  return out;
}

/**
 * Compute the normal matrix from a model matrix.
 * The normal matrix is the transpose of the inverse of the upper-left 3x3.
 *
 * @param model - The model matrix
 * @returns The normal matrix (3x3)
 */
export function normalMatrix(model: Mat4): Mat3 {
  const mat3 = mat3FromMat4(model);
  const inverse = mat3Inverse(mat3);
  return mat3Transpose(inverse);
}
