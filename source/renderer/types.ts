export type PrimitiveType = 'cube' | 'sphere';
export type RenderMode = 'line' | 'webgl';

export interface Primitive {
    getVertices(): Float32Array;
    getEdges(): Uint16Array;
    getVertexCount(): number;
    getEdgeCount(): number;
}