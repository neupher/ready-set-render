#version 300 es
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
