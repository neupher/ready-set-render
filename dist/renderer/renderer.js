import { LineRenderer } from './line_renderer';
import { WebGLRenderer } from './webgl_renderer';
import { Cube } from './primitives/cube';
import { projectToScreen } from './utils/transforms';
export class Renderer {
    constructor(canvas) {
        this.currentPrimitive = null;
        this.currentRenderMode = 'line';
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error("2D context not available");
        this.ctx = ctx;
        this.lineRenderer = new LineRenderer(this.ctx);
        this.webglRenderer = new WebGLRenderer(); // not used yet
    }
    setPrimitive(primitiveType) {
        switch (primitiveType) {
            case 'cube':
                this.currentPrimitive = new Cube();
                break;
            case 'sphere':
                //not implemented yet
                //this.currentPrimitive = new Sphere();
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
        }
        else if (this.currentRenderMode === 'webgl') {
            console.log("WebGl mode not implemented yet");
        }
    }
    renderWireframe(primitive) {
        const vertices = primitive.getVertices();
        const edges = primitive.getEdges();
        for (let i = 0; i < edges.length; i += 2) {
            const vA = edges[i];
            const vB = edges[i + 1];
            const ax = vertices[vA * 3];
            const ay = vertices[vA * 3 + 1];
            const az = vertices[vA * 3 + 2];
            const bx = vertices[vB * 3];
            const by = vertices[vB * 3 + 1];
            const bz = vertices[vB * 3 + 2];
            const [sxA, syA] = projectToScreen(ax, ay, az, this.canvas.width, this.canvas.height);
            const [sxB, syB] = projectToScreen(bx, by, bz, this.canvas.width, this.canvas.height);
            this.lineRenderer.drawLine(sxA, syA, sxB, syB, "white");
        }
    }
    clearScreen() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
