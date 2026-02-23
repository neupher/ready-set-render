#version 300 es
/**
 * Lambert Vertex Shader
 *
 * Transforms vertices and passes data to fragment shader for Lambertian lighting.
 * Supports multi-light setup with up to 8 directional lights.
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
out vec3 vNormal;
out vec3 vWorldPosition;
out vec2 vTexCoord;

void main() {
  vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vTexCoord = aTexCoord;
  gl_Position = uViewProjectionMatrix * worldPosition;
}
