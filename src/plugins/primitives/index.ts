/**
 * Primitives module barrel exports.
 */

export { Cube, CubeFactory } from './Cube';
export { Sphere, SphereFactory } from './Sphere';
export type { SphereOptions } from './Sphere';
export {
  MeshEntity,
  isMeshEntity,
  setMeshAssetResolver,
  getMeshAssetResolver,
} from './MeshEntity';
export type {
  MeshAssetResolver,
  ISerializedMeshEntityComponent,
} from './MeshEntity';
export { PrimitiveRegistry } from './PrimitiveRegistry';
export type { PrimitiveRegistryOptions } from './PrimitiveRegistry';
export type { IPrimitiveFactory, PrimitiveCategory } from './interfaces/IPrimitiveFactory';
