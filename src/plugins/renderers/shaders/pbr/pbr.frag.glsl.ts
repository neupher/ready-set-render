/**
 * PBR Fragment Shader
 *
 * Implements physically-based rendering using Cook-Torrance BRDF
 * following Blender's Principled BSDF conventions.
 *
 * Features:
 * - Cook-Torrance specular (GGX/Smith/Fresnel-Schlick)
 * - Energy-conserving diffuse
 * - Metallic workflow
 * - Multi-light support (up to 8 directional lights)
 * - Emission support
 * - ACES tone mapping
 *
 * @module shaders/pbr
 */

import { GLSL_MATH, GLSL_BRDF, GLSL_LIGHTING, composeShader } from '../common';

/**
 * Main PBR fragment shader code (uniforms and main function)
 */
const PBR_FRAGMENT_MAIN = `
//=============================================================================
// PBR FRAGMENT SHADER - Blender Principled BSDF Style
//=============================================================================

// Maximum lights (keep in sync with renderer)
#define MAX_LIGHTS 8

// Inputs from vertex shader
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vTexCoord;

//-----------------------------------------------------------------------------
// Material Uniforms (Blender Principled BSDF parameters)
//-----------------------------------------------------------------------------
uniform vec3 uBaseColor;      // Albedo/base color
uniform float uMetallic;      // 0 = dielectric, 1 = metal
uniform float uRoughness;     // 0 = smooth, 1 = rough
uniform vec3 uEmission;       // Emission color
uniform float uEmissionStrength;  // Emission intensity multiplier

//-----------------------------------------------------------------------------
// Lighting Uniforms
//-----------------------------------------------------------------------------
uniform vec3 uLightDirections[MAX_LIGHTS];
uniform vec3 uLightColors[MAX_LIGHTS];
uniform int uLightCount;
uniform vec3 uAmbientColor;
uniform vec3 uCameraPosition;

//-----------------------------------------------------------------------------
// Output
//-----------------------------------------------------------------------------
out vec4 outColor;

/**
 * Calculate PBR lighting for a single directional light
 */
vec3 calculateDirectionalLight(
  vec3 lightDir,
  vec3 lightColor,
  vec3 N,
  vec3 V,
  vec3 albedo,
  float metallic,
  float roughness,
  vec3 F0
) {
  // Light direction points towards light (negate for calculations)
  vec3 L = normalize(-lightDir);
  vec3 H = normalize(V + L);

  // Dot products
  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float HdotV = max(dot(H, V), 0.0);

  // Skip if light is behind surface
  if (NdotL <= 0.0) {
    return vec3(0.0);
  }

  // Cook-Torrance BRDF components
  float D = distributionGGX(NdotH, roughness);
  float G = geometrySmith(NdotV, NdotL, roughness);
  vec3 F = fresnelSchlick(HdotV, F0);

  // Specular contribution
  vec3 specular = cookTorranceSpecular(D, G, F, NdotV, NdotL);

  // Energy conservation: diffuse is reduced by specular reflection
  // Metals have no diffuse (all energy goes to specular)
  vec3 kS = F;
  vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

  // Diffuse contribution (Lambertian)
  vec3 diffuse = kD * lambertianDiffuse(albedo);

  // Combined contribution
  return (diffuse + specular) * lightColor * NdotL;
}

void main() {
  // Normalize interpolated normal
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPosition - vWorldPosition);

  // Material parameters (could sample textures here in future)
  vec3 albedo = uBaseColor;
  float metallic = uMetallic;
  float roughness = max(uRoughness, 0.04); // Prevent divide-by-zero artifacts

  // Calculate F0 (reflectance at normal incidence)
  vec3 F0 = calculateF0(albedo, metallic);

  // Accumulate direct lighting from all lights
  vec3 Lo = vec3(0.0);
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;

    Lo += calculateDirectionalLight(
      uLightDirections[i],
      uLightColors[i],
      N,
      V,
      albedo,
      metallic,
      roughness,
      F0
    );
  }

  // Ambient lighting (simple hemisphere for now)
  // Uses Fresnel for ambient to simulate environment reflection
  vec3 F_ambient = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
  vec3 kD_ambient = (vec3(1.0) - F_ambient) * (1.0 - metallic);

  // Hemisphere ambient (Z-up)
  vec3 skyColor = uAmbientColor;
  vec3 groundColor = uAmbientColor * 0.5;
  vec3 ambient = hemisphereAmbient(N, skyColor, groundColor) * albedo * kD_ambient;

  // Add metallic ambient reflection approximation
  vec3 metallicAmbient = F_ambient * uAmbientColor * 0.3;
  ambient += metallicAmbient * metallic;

  // Emission
  vec3 emission = uEmission * uEmissionStrength;

  // Combine all contributions
  vec3 color = ambient + Lo + emission;

  // Tone mapping (ACES filmic)
  color = tonemapACES(color);

  // Gamma correction (linear to sRGB)
  color = linearToSRGB(color);

  outColor = vec4(color, 1.0);
}
`;

/**
 * Complete PBR Fragment Shader source
 *
 * Composed from common modules (math, brdf, lighting) and PBR-specific code.
 */
export const PBR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

${composeShader(GLSL_MATH, GLSL_BRDF, GLSL_LIGHTING, PBR_FRAGMENT_MAIN)}
`;
