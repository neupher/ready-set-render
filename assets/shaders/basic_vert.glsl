#version 300 es
precision mediump float;

// Vertex Attributes
in vec3 aPosition;

// Uniforms
uniform mat4 uModelViewProjection;

void main() {
    // Vertex to clip pos
    gl_Position = uModelViewProjection * vec4(aPosition,1.0);
}