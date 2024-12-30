import { LineRenderer } from './line_renderer';
import { Cube } from './primitives/cube';
import { mat4Identity } from './utils/transforms';
export class Renderer {
    constructor(gl, vertShaderSrc, fragShaderSrc) {
        this.currentPrimitive = null;
        this.currentRenderMode = 'line';
        // MVP matrix set to identity (temp)
        this.mvpMatrix = mat4Identity();
        this.gl = gl;
        this.linerenderer = new LineRenderer(gl, vertShaderSrc, fragShaderSrc);
    }
    setPrimitive(primitiveType) {
        switch (primitiveType) {
            case 'cube':
                this.currentPrimitive = new Cube();
                break;
            case 'sphere':
                console.warn("Sphere not implemented yet");
                this.currentPrimitive = null;
                break;
        }
        this.redraw();
    }
    setRenderMode(mode) {
        this.currentRenderMode = mode;
        this.redraw();
    }
    redraw() {
        this.clearScreen();
        if (!this.currentPrimitive)
            return;
        if (this.currentRenderMode === 'line') {
            this.renderWireframe(this.currentPrimitive);
        } /*else if (this.currentRenderMode === 'fill') {
            console.log('rasterizer not implemented yet');
        }
            */
    }
    // pass primitive and mvp to line renderer
    renderWireframe(primitive) {
        this.linerenderer.setPrimitive(primitive, this.mvpMatrix);
        this.linerenderer.draw(this.mvpMatrix, primitive.getEdgeCount());
    }
    clearScreen() {
        const { gl } = this;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        console.log('Screen Cleared');
    }
}
