import { Primitive } from "./types.js";

export class LineRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private vao: WebGLVertexArrayObject | null = null;
    private uMVPLocation: WebGLUniformLocation | null = null;

    constructor(gl: WebGL2RenderingContext, vertShaderSrc: string, fragShaderSrc: string) {
        this.gl = gl;
        this.program = this.createProgram(vertShaderSrc, fragShaderSrc);

        // Cache uniform location for the MVP matrix
        this.uMVPLocation = this.gl.getUniformLocation(this.program, "uModelViewProjection");
    }

    // Sets up the line renderer to draw the given primitive using the current MVP matrix.
    // Prepares buffers and the VAO using the primitives vertices and edges
    
    setPrimitive(primitive: Primitive, mvpMatrix: Float32Array) {
        const { gl } = this;
        const vertices = primitive.getVertices();
        const edges = primitive.getEdges();

        // Convert edges into a flat array of line vertices
        // For each edge (vA, vB), push vertex coords of A then B

        const lineVerts = new Float32Array(edges.length * 3);
        for (let i = 0; i < edges.length; i += 2) {
            const vA = edges[i];
            const vB = edges[i + 1];

            lineVerts[(i*3)+0] = vertices[vA*3+0];
            lineVerts[(i*3)+1] = vertices[vA*3+1];
            lineVerts[(i*3)+2] = vertices[vA*3+2];

            lineVerts[(i*3)+3] = vertices[vB*3+0];
            lineVerts[(i*3)+4] = vertices[vB*3+1];
            lineVerts[(i*3)+5] = vertices[vB*3+2];
        }

        // create or update the VAO
        if (this.vao) {
            gl.deleteVertexArray(this.vao);
        }
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Create and bind VBO for line vertices
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.STATIC_DRAW);

        // Set up attribute pointer
        const aPositionLoc = gl.getAttribLocation(this.program, "aPosition");
        gl.enableVertexAttribArray(aPositionLoc);
        gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

        // Unbind VAO
        gl.bindVertexArray(null);

        //Update the MVP matrix uniform
        gl.useProgram(this.program);
        if (this.uMVPLocation) {
            gl.uniformMatrix4fv(this.uMVPLocation, false, mvpMatrix);
        }
        gl.useProgram(null);
    }

    // Draws the currently set primitive lines using the previously set MVP matrix.
    // mvpMatrix = model-view-projection matrix
    // edgeCount = number of edges in the primitive
    
    draw(mvpMatrix: Float32Array, edgeCount: number) {
        const { gl } = this;
        if (!this.vao) {
            return;
        }

        gl.useProgram(this.program);
        if (this.uMVPLocation) {
            gl.uniformMatrix4fv(this.uMVPLocation, false, mvpMatrix);
        }

        gl.bindVertexArray(this.vao);
        // Each line contributes 2 vertices
        gl.drawArrays(gl.LINES, 0, edgeCount*2);
        gl.bindVertexArray(null);

        gl.useProgram(null);
    }

    private createProgram(vertShaderSrc: string, fragShaderSrc: string): WebGLProgram {
        const vs = this.compileShader(vertShaderSrc, this.gl.VERTEX_SHADER);
        const fs = this.compileShader(fragShaderSrc, this.gl.FRAGMENT_SHADER);

        const prog = this.gl.createProgram()!;
        this.gl.attachShader(prog, vs);
        this.gl.attachShader(prog, fs);
        this.gl.linkProgram(prog);

        if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
            throw new Error(`Program link error: ${this.gl.getProgramInfoLog(prog)}`);
        }

        this.gl.deleteShader(vs);
        this.gl.deleteShader(fs);

        return prog;
    }

    private compileShader(src: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader Compile Error: ', this.gl.getShaderInfoLog(shader));
            throw new Error(`Shader Compile Error: ${this.gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }
}