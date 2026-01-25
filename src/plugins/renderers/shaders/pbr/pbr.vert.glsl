#version 300 es
/**
 * PBR Vertex Shader
 *
 * Transforms vertices and passes data to fragment shader for PBR lighting.
 * Outputs world position, normal, and texture coordinates.
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
  // Transform to world space
  vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Transform normal to world space (using normal matrix for non-uniform scale)
  vNormal = normalize(uNormalMatrix * aNormal);

  // Pass through texture coordinates
  vTexCoord = aTexCoord;

  // Final clip space position
  gl_Position = uViewProjectionMatrix * worldPosition;
}
