#version 300 es
/**
 * Lambert Fragment Shader
 *
 * Lambertian diffuse lighting with hemisphere ambient and rim light.
 * Supports up to 8 directional lights.
 */
precision highp float;

#define MAX_LIGHTS 8

// Inputs from vertex shader
in vec3 vNormal;
in vec3 vWorldPosition;
in vec2 vTexCoord;

// Material uniforms
uniform vec3 uBaseColor;

// Lighting uniforms - arrays for multi-light support
uniform vec3 uLightDirections[MAX_LIGHTS];
uniform vec3 uLightColors[MAX_LIGHTS];
uniform int uLightCount;

// Ambient
uniform vec3 uAmbientColor;

// Camera
uniform vec3 uCameraPosition;

// Output
out vec4 outColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

  // Accumulate light contribution
  vec3 diffuse = vec3(0.0);

  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;

    // Lambertian diffuse for this light
    float NdotL = max(dot(normal, -uLightDirections[i]), 0.0);
    diffuse += uBaseColor * uLightColors[i] * NdotL;
  }

  // Hemisphere ambient (sky color top, ground color bottom) - Z-up convention
  float hemiFactor = normal.z * 0.5 + 0.5;
  vec3 ambient = uBaseColor * mix(uAmbientColor * 0.6, uAmbientColor, hemiFactor);

  // Simple rim light for better definition (using primary light if available)
  vec3 rimColor = vec3(0.0);
  if (uLightCount > 0) {
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.0) * 0.15;
    rimColor = uLightColors[0] * rim;
  }

  vec3 finalColor = diffuse + ambient + rimColor;

  // Gamma correction (approximate)
  finalColor = pow(finalColor, vec3(1.0 / 2.2));

  outColor = vec4(finalColor, 1.0);
}
