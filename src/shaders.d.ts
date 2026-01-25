/**
 * Type declarations for GLSL shader file imports.
 *
 * Allows importing .glsl, .vert, and .frag files as string modules.
 * The vite-plugin-glsl plugin processes these files and resolves
 * #include directives at build time.
 *
 * @example
 * ```typescript
 * import vertexShader from './shader.vert.glsl';
 * import fragmentShader from './shader.frag.glsl';
 * ```
 */

declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module '*.vert' {
  const value: string;
  export default value;
}

declare module '*.frag' {
  const value: string;
  export default value;
}
