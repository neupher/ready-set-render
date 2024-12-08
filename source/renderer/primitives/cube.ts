import { Primitive } from "../types";

export class Cube implements Primitive {
    private vertices: Float32Array;
    private edges: Uint16Array;

    constructor() {
        this.vertices = new Float32Array([
            //Front
            -0.5, -0.5, 0.5, // v0
             0.5, -0.5, 0.5, // v1
             0.5,  0.5, 0.5, // v2
            -0.5,  0.5, 0.5, // v3

            //Back
            -0.5, -0.5, -0.5, // v4
             0.5, -0.5, -0.5, // v5
             0.5,  0.5, -0.5, // v6
            -0.5,  0.5, -0.5, // v7
        ]);

        this.edges = new Uint16Array([
            // Front face
            0,1, 1,2, 2,3, 3,0,
            // Back face
            4,5, 5,6, 6,7, 7,4,
            // Sides
            0,4, 1,5, 2,6, 3,7
        ]);
    }

    getVertices(): Float32Array { return this.vertices; }
    getEdges(): Uint16Array { return this.edges; }
    getVertexCount(): number { return this.vertices.length / 3; } // 3 coordinates for single vertice in space
    getEdgeCount(): number { return this.edges.length / 2; } // 1 edge drawn between 2 points
}