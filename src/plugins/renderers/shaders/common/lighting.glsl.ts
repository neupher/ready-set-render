/**
 * Common Lighting Functions for GLSL Shaders
 *
 * Reusable lighting utilities including tone mapping and
 * color space conversions.
 *
 * @module shaders/common
 */

export const GLSL_LIGHTING = `
//=============================================================================
// LIGHTING UTILITIES
//=============================================================================

/**
 * Reinhard Tone Mapping
 *
 * Simple but effective tone mapping operator.
 *
 * @param color - HDR color
 * @return Tone mapped LDR color
 */
vec3 tonemapReinhard(vec3 color) {
  return color / (color + vec3(1.0));
}

/**
 * ACES Filmic Tone Mapping
 *
 * Industry-standard filmic curve used in film and games.
 * Attempt for more contrast and saturation than Reinhard.
 *
 * @param color - HDR color
 * @return Tone mapped LDR color
 */
vec3 tonemapACES(vec3 color) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return saturate((color * (a * color + b)) / (color * (c * color + d) + e));
}

/**
 * Gamma Correction (Linear to sRGB)
 *
 * Converts linear color to sRGB for display.
 *
 * @param color - Linear color
 * @return sRGB color
 */
vec3 linearToSRGB(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}

/**
 * Inverse Gamma (sRGB to Linear)
 *
 * Converts sRGB texture samples to linear space for calculations.
 *
 * @param color - sRGB color
 * @return Linear color
 */
vec3 sRGBToLinear(vec3 color) {
  return pow(color, vec3(2.2));
}

/**
 * Hemisphere Ambient Light (Z-up convention)
 *
 * Simple sky/ground ambient using normal's Z component.
 *
 * @param normal - World-space normal
 * @param skyColor - Color from above
 * @param groundColor - Color from below
 * @return Blended ambient color
 */
vec3 hemisphereAmbient(vec3 normal, vec3 skyColor, vec3 groundColor) {
  float blend = normal.z * 0.5 + 0.5;
  return mix(groundColor, skyColor, blend);
}

/**
 * Calculate light attenuation for point lights
 *
 * Uses physically-based inverse square falloff with range.
 *
 * @param distance - Distance from light
 * @param range - Light range (0 = infinite)
 * @return Attenuation factor
 */
float lightAttenuation(float distance, float range) {
  if (range <= 0.0) {
    // Infinite range - pure inverse square
    return 1.0 / (distance * distance + 1.0);
  }
  // Smooth falloff within range
  float attenuation = saturate(1.0 - pow(distance / range, 4.0));
  return attenuation * attenuation / (distance * distance + 1.0);
}
`;
