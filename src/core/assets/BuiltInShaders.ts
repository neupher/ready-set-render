/**
 * BuiltInShaders - Pre-defined shader assets
 *
 * Contains the built-in PBR and Unlit shader definitions as IShaderAsset objects.
 * These are registered as read-only assets that can be duplicated to create
 * editable custom shaders.
 *
 * @example
 * ```typescript
 * import { BUILT_IN_PBR_SHADER, BUILT_IN_UNLIT_SHADER } from './BuiltInShaders';
 *
 * // Register built-in shaders
 * registry.register(BUILT_IN_PBR_SHADER);
 * registry.register(BUILT_IN_UNLIT_SHADER);
 * ```
 */

import type { IShaderAsset, IUniformDeclaration } from './interfaces/IShaderAsset';

/**
 * Built-in shader UUIDs.
 * These are constant and never change.
 */
export const BUILT_IN_SHADER_IDS = {
  PBR: 'built-in-shader-pbr',
  UNLIT: 'built-in-shader-unlit',
} as const;

//=============================================================================
// GLSL COMMON MODULES (inlined for built-in shaders)
//=============================================================================

const GLSL_MATH = `//=============================================================================
// MATH UTILITIES
//=============================================================================

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float HALF_PI = 1.57079632679;
const float INV_PI = 0.31830988618;

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

float sqr(float x) {
  return x * x;
}
`;

const GLSL_BRDF = `//=============================================================================
// BRDF FUNCTIONS - Cook-Torrance Microfacet Model
//=============================================================================

float distributionGGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;
  return a2 / max(denom, 0.0001);
}

float geometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(float NdotV, float NdotL, float roughness) {
  float ggx1 = geometrySchlickGGX(NdotV, roughness);
  float ggx2 = geometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

vec3 calculateF0(vec3 albedo, float metallic) {
  vec3 dielectricF0 = vec3(0.04);
  return mix(dielectricF0, albedo, metallic);
}

vec3 cookTorranceSpecular(float D, float G, vec3 F, float NdotV, float NdotL) {
  vec3 numerator = D * G * F;
  float denominator = 4.0 * max(NdotV, 0.001) * max(NdotL, 0.001);
  return numerator / denominator;
}

vec3 lambertianDiffuse(vec3 albedo) {
  return albedo * INV_PI;
}
`;

const GLSL_LIGHTING = `//=============================================================================
// LIGHTING UTILITIES
//=============================================================================

vec3 tonemapACES(vec3 color) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return saturate((color * (a * color + b)) / (color * (c * color + d) + e));
}

vec3 linearToSRGB(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}

vec3 hemisphereAmbient(vec3 normal, vec3 skyColor, vec3 groundColor) {
  float blend = normal.z * 0.5 + 0.5;
  return mix(groundColor, skyColor, blend);
}
`;

//=============================================================================
// PBR SHADER
//=============================================================================

const PBR_VERTEX_SOURCE = `#version 300 es
/**
 * PBR Vertex Shader
 *
 * Transforms vertices and passes data to fragment shader for PBR lighting.
 */
precision highp float;

// Vertex attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Transform uniforms
uniform mat4 uModelMatrix;
uniform mat4 uViewProjectionMatrix;
uniform mat3 uNormalMatrix;

// Output to fragment shader
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
  vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vTexCoord = aTexCoord;
  gl_Position = uViewProjectionMatrix * worldPosition;
}
`;

const PBR_FRAGMENT_SOURCE = `#version 300 es
/**
 * PBR Fragment Shader
 *
 * Cook-Torrance BRDF with metallic/roughness workflow.
 * Supports up to 8 directional lights.
 */
precision highp float;

${GLSL_MATH}

${GLSL_BRDF}

${GLSL_LIGHTING}

#define MAX_LIGHTS 8

// Inputs from vertex shader
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vTexCoord;

// Material uniforms
uniform vec3 uBaseColor;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uEmission;
uniform float uEmissionStrength;

// Lighting uniforms
uniform vec3 uLightDirections[MAX_LIGHTS];
uniform vec3 uLightColors[MAX_LIGHTS];
uniform int uLightCount;
uniform vec3 uAmbientColor;
uniform vec3 uCameraPosition;

// Output
out vec4 outColor;

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
  vec3 L = normalize(-lightDir);
  vec3 H = normalize(V + L);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float HdotV = max(dot(H, V), 0.0);

  if (NdotL <= 0.0) {
    return vec3(0.0);
  }

  float D = distributionGGX(NdotH, roughness);
  float G = geometrySmith(NdotV, NdotL, roughness);
  vec3 F = fresnelSchlick(HdotV, F0);

  vec3 specular = cookTorranceSpecular(D, G, F, NdotV, NdotL);

  vec3 kS = F;
  vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

  vec3 diffuse = kD * lambertianDiffuse(albedo);

  return (diffuse + specular) * lightColor * NdotL;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPosition - vWorldPosition);

  vec3 albedo = uBaseColor;
  float metallic = uMetallic;
  float roughness = max(uRoughness, 0.04);

  vec3 F0 = calculateF0(albedo, metallic);

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

  vec3 F_ambient = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
  vec3 kD_ambient = (vec3(1.0) - F_ambient) * (1.0 - metallic);

  vec3 skyColor = uAmbientColor;
  vec3 groundColor = uAmbientColor * 0.5;
  vec3 ambient = hemisphereAmbient(N, skyColor, groundColor) * albedo * kD_ambient;
  vec3 metallicAmbient = F_ambient * uAmbientColor * 0.3;
  ambient += metallicAmbient * metallic;

  vec3 emission = uEmission * uEmissionStrength;

  vec3 color = ambient + Lo + emission;
  color = tonemapACES(color);
  color = linearToSRGB(color);

  outColor = vec4(color, 1.0);
}
`;

/**
 * PBR shader uniform declarations.
 */
const PBR_UNIFORMS: IUniformDeclaration[] = [
  {
    name: 'uBaseColor',
    type: 'vec3',
    displayName: 'Base Color',
    defaultValue: [0.8, 0.8, 0.8],
    uiType: 'color',
    group: 'Surface',
  },
  {
    name: 'uMetallic',
    type: 'float',
    displayName: 'Metallic',
    defaultValue: 0.0,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
  {
    name: 'uRoughness',
    type: 'float',
    displayName: 'Roughness',
    defaultValue: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
  {
    name: 'uEmission',
    type: 'vec3',
    displayName: 'Emission',
    defaultValue: [0.0, 0.0, 0.0],
    uiType: 'color',
    group: 'Emission',
  },
  {
    name: 'uEmissionStrength',
    type: 'float',
    displayName: 'Emission Strength',
    defaultValue: 0.0,
    min: 0.0,
    max: 10.0,
    step: 0.1,
    uiType: 'slider',
    group: 'Emission',
  },
];

/**
 * Built-in PBR shader asset.
 *
 * Cook-Torrance BRDF with metallic/roughness workflow.
 * Follows Blender's Principled BSDF conventions.
 */
export const BUILT_IN_PBR_SHADER: IShaderAsset = {
  uuid: BUILT_IN_SHADER_IDS.PBR,
  name: 'PBR',
  type: 'shader',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  vertexSource: PBR_VERTEX_SOURCE,
  fragmentSource: PBR_FRAGMENT_SOURCE,
  uniforms: PBR_UNIFORMS,
  description:
    'Physically-based rendering shader using Cook-Torrance BRDF. ' +
    'Supports metallic/roughness workflow with multi-light support.',
};

//=============================================================================
// UNLIT SHADER
//=============================================================================

const UNLIT_VERTEX_SOURCE = `#version 300 es
/**
 * Unlit Vertex Shader
 *
 * Simple transform without lighting calculations.
 */
precision highp float;

// Vertex attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Transform uniforms
uniform mat4 uModelMatrix;
uniform mat4 uViewProjectionMatrix;

// Output to fragment shader
out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
`;

const UNLIT_FRAGMENT_SOURCE = `#version 300 es
/**
 * Unlit Fragment Shader
 *
 * Simple solid color output without lighting.
 */
precision highp float;

// Material uniforms
uniform vec3 uColor;
uniform float uOpacity;

// Input from vertex shader
in vec2 vTexCoord;

// Output
out vec4 outColor;

void main() {
  outColor = vec4(uColor, uOpacity);
}
`;

/**
 * Unlit shader uniform declarations.
 */
const UNLIT_UNIFORMS: IUniformDeclaration[] = [
  {
    name: 'uColor',
    type: 'vec3',
    displayName: 'Color',
    defaultValue: [0.8, 0.8, 0.8],
    uiType: 'color',
    group: 'Surface',
  },
  {
    name: 'uOpacity',
    type: 'float',
    displayName: 'Opacity',
    defaultValue: 1.0,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
];

/**
 * Built-in Unlit shader asset.
 *
 * Simple solid color shader without lighting calculations.
 * Useful for debug visualization or UI elements.
 */
export const BUILT_IN_UNLIT_SHADER: IShaderAsset = {
  uuid: BUILT_IN_SHADER_IDS.UNLIT,
  name: 'Unlit',
  type: 'shader',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  vertexSource: UNLIT_VERTEX_SOURCE,
  fragmentSource: UNLIT_FRAGMENT_SOURCE,
  uniforms: UNLIT_UNIFORMS,
  description: 'Simple unlit shader that outputs a solid color without lighting calculations.',
};

/**
 * All built-in shaders for easy registration.
 */
export const BUILT_IN_SHADERS: IShaderAsset[] = [BUILT_IN_PBR_SHADER, BUILT_IN_UNLIT_SHADER];

/**
 * Check if a shader UUID is a built-in shader.
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is a built-in shader
 */
export function isBuiltInShaderUUID(uuid: string): boolean {
  return Object.values(BUILT_IN_SHADER_IDS).includes(uuid as (typeof BUILT_IN_SHADER_IDS)[keyof typeof BUILT_IN_SHADER_IDS]);
}
