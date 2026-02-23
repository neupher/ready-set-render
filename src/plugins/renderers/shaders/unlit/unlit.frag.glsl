#version 300 es
/**
 * Unlit Fragment Shader
 *
 * Simple solid color output without lighting calculations.
 * Useful for debug visualization, UI elements, or stylized rendering.
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
