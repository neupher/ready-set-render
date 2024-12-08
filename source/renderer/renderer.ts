import { PrimitiveType, RenderMode, Primitive } from './types';
import { LineRenderer } from './line_renderer';
import { Cube } from './primitives/cube';
import { mat4Identity, mat4Perspective } from './utils/transforms';

export class Renderer {
    private gl: WebGL2RenderingContext;
    private linerenderer: LineRenderer;
    private currentPrimitive: Primitive | null = null;
    private currentRenderMode: RenderMode = 'line';

    // MVP matrix set to identity (temp)
    private mvpMatrix = mat4Identity();

    constructor(gl: WebGL2RenderingContext, vertShaderSrc: string, fragShaderSrc: string) {
        this.gl = gl;

        this.linerenderer = new LineRenderer(gl, vertShaderSrc, fragShaderSrc);
    }

    setPrimitive(primitiveType: PrimitiveType): void {
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

    setRenderMode(mode: RenderMode): void {
        this.currentRenderMode = mode;
        this.redraw();
    }

    private redraw(): void {
        this.clearScreen();
        if (!this.currentPrimitive) return;

        if (this.currentRenderMode === 'line') {
            this.renderWireframe(this.currentPrimitive);
        } else if (this.currentRenderMode === 'fill') {
            console.log('rasterizer not implemented yet');
        }
    }

    // pass primitive and mvp to line renderer
    private renderWireframe(primitive: Primitive): void {
        this.linerenderer.setPrimitive(primitive, this.mvpMatrix);
        this.linerenderer.draw(this.mvpMatrix, primitive.getEdgeCount());
    }

    private clearScreen(): void {
        const {gl} = this;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
}
