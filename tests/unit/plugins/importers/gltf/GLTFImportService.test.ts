/**
 * GLTFImportService Tests
 *
 * Focused parser regression coverage for GLTF primitive extraction and
 * generated fallback normals.
 */

import { existsSync, readFileSync } from 'node:fs';
import { Document, WebIO } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { GLTFImportService } from '@plugins/importers/gltf/GLTFImportService';

const STUDIO_SETUP_GLB_PATH = 'test_assets\\studio_setup.glb';

function createFileLike(bytes: Uint8Array, filename: string): File {
  return {
    name: filename,
    arrayBuffer: async () => bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ),
  } as File;
}

async function createFileFromDocument(doc: Document, filename = 'fixture.glb'): Promise<File> {
  const bytes = await new WebIO().writeBinary(doc);
  return createFileLike(bytes, filename);
}

function createVec3Accessor(doc: Document, values: number[]) {
  return doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(values))
    .setBuffer(doc.getRoot().listBuffers()[0]);
}

function createScalarAccessor(doc: Document, values: number[]) {
  return doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array(values))
    .setBuffer(doc.getRoot().listBuffers()[0]);
}

function createDocumentWithBuffer(): Document {
  const doc = new Document();
  doc.createBuffer();
  return doc;
}

describe('GLTFImportService', () => {
  it('extracts each primitive in a multi-primitive mesh as a separate mesh with material assignments', async () => {
    const doc = createDocumentWithBuffer();
    const positions = createVec3Accessor(doc, [
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ]);
    const normals = createVec3Accessor(doc, [
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]);
    const indices = createScalarAccessor(doc, [0, 1, 2]);
    const red = doc.createMaterial('Red');
    const blue = doc.createMaterial('Blue');
    const primitiveA = doc
      .createPrimitive()
      .setAttribute('POSITION', positions)
      .setAttribute('NORMAL', normals)
      .setIndices(indices)
      .setMaterial(red);
    const primitiveB = doc
      .createPrimitive()
      .setAttribute('POSITION', positions)
      .setAttribute('NORMAL', normals)
      .setIndices(indices)
      .setMaterial(blue);
    const mesh = doc.createMesh('Body').addPrimitive(primitiveA).addPrimitive(primitiveB);
    const node = doc.createNode('BodyNode').setMesh(mesh);
    doc.createScene('Scene').addChild(node);

    const file = await createFileFromDocument(doc);
    const result = await new GLTFImportService().import(file);

    expect(result.meshes).toHaveLength(2);
    expect(result.meshes.map(meshData => meshData.name)).toEqual(['Body_0', 'Body_1']);
    expect(result.meshes.map(meshData => meshData.materialIndex)).toEqual([0, 1]);
    expect(result.materials.map(material => material.name)).toEqual(['Red', 'Blue']);
    expect(result.hierarchy[0]).toMatchObject({
      name: 'BodyNode',
      meshIndex: 0,
      meshIndices: [0, 1],
      materialIndices: [0, 1],
    });
  });

  it('expands indexed geometry before generating fallback flat normals', async () => {
    const doc = createDocumentWithBuffer();
    const positions = createVec3Accessor(doc, [
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]);
    const indices = createScalarAccessor(doc, [
      0, 1, 2,
      0, 1, 3,
    ]);
    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', positions)
      .setIndices(indices);
    const mesh = doc.createMesh('BentQuad').addPrimitive(primitive);
    const node = doc.createNode('BentQuadNode').setMesh(mesh);
    doc.createScene('Scene').addChild(node);

    const file = await createFileFromDocument(doc);
    const result = await new GLTFImportService().import(file);
    const meshData = result.meshes[0];

    expect(result.warnings).toContain('Primitive has no NORMAL attribute, generating flat normals');
    expect(meshData.vertexCount).toBe(6);
    expect(Array.from(meshData.indices)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(meshData.normals).toHaveLength(meshData.positions.length);

    const firstTriangleNormal = Array.from(meshData.normals.slice(0, 3));
    expect(Array.from(meshData.normals.slice(3, 6))).toEqual(firstTriangleNormal);
    expect(Array.from(meshData.normals.slice(6, 9))).toEqual(firstTriangleNormal);

    const secondTriangleNormal = Array.from(meshData.normals.slice(9, 12));
    expect(Array.from(meshData.normals.slice(12, 15))).toEqual(secondTriangleNormal);
    expect(Array.from(meshData.normals.slice(15, 18))).toEqual(secondTriangleNormal);
    expect(secondTriangleNormal).not.toEqual(firstTriangleNormal);
  });

  it.skipIf(!existsSync(STUDIO_SETUP_GLB_PATH))(
    'imports the studio_setup.glb integration fixture when it is available',
    async () => {
      const bytes = readFileSync(STUDIO_SETUP_GLB_PATH);
      const file = createFileLike(new Uint8Array(bytes), 'studio_setup.glb');
      const result = await new GLTFImportService().import(file);

      expect(result.meshes.length).toBeGreaterThan(0);
      expect(result.hierarchy.length).toBeGreaterThan(0);
    }
  );
});
