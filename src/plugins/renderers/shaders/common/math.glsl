//=============================================================================
// MATH UTILITIES
//=============================================================================

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float HALF_PI = 1.57079632679;
const float INV_PI = 0.31830988618;

/**
 * Clamp value to [0, 1] range (saturate)
 */
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

/**
 * Square a value
 */
float sqr(float x) {
  return x * x;
}

/**
 * Linear interpolation with clamped t
 */
vec3 lerpSaturate(vec3 a, vec3 b, float t) {
  return mix(a, b, saturate(t));
}

/**
 * Remap a value from one range to another
 */
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}
