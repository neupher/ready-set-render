/**
 * GLSL Language Definition for Monaco Editor
 *
 * Registers GLSL (OpenGL Shading Language) as a custom language in Monaco
 * using the Monarch tokenizer. Provides syntax highlighting for:
 * - GLSL ES 3.00 keywords and types
 * - Built-in functions (math, texture, geometry, etc.)
 * - Preprocessor directives (#version, #define, #include, etc.)
 * - Comments (single-line and multi-line)
 * - Numeric literals (int, float, hex)
 * - Semantic qualifiers (in, out, uniform, etc.)
 *
 * @example
 * ```typescript
 * import * as monaco from 'monaco-editor';
 * import { registerGLSLLanguage } from './glslLanguage';
 *
 * registerGLSLLanguage(monaco);
 *
 * const editor = monaco.editor.create(container, {
 *   language: 'glsl',
 *   value: shaderSource,
 * });
 * ```
 */

import type * as Monaco from 'monaco-editor';

/**
 * The Monaco language identifier for GLSL.
 */
export const GLSL_LANGUAGE_ID = 'glsl';

/**
 * Register the GLSL language with a Monaco instance.
 *
 * @param monaco - The Monaco editor module
 */
export function registerGLSLLanguage(monaco: typeof Monaco): void {
  // Register the language
  monaco.languages.register({
    id: GLSL_LANGUAGE_ID,
    extensions: ['.glsl', '.vert', '.frag', '.vs', '.fs'],
    aliases: ['GLSL', 'glsl', 'OpenGL Shading Language'],
    mimetypes: ['text/x-glsl'],
  });

  // Register the tokenizer (Monarch syntax definition)
  monaco.languages.setMonarchTokensProvider(GLSL_LANGUAGE_ID, glslTokensProvider);

  // Register language configuration (brackets, comments, auto-closing)
  monaco.languages.setLanguageConfiguration(GLSL_LANGUAGE_ID, glslLanguageConfiguration);
}

/**
 * Language configuration for brackets, comments, and auto-closing.
 */
const glslLanguageConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*#?region\b/,
      end: /^\s*\/\/\s*#?endregion\b/,
    },
  },
};

/**
 * Monarch tokenizer definition for GLSL ES 3.00.
 */
const glslTokensProvider: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.glsl',

  // GLSL keywords
  keywords: [
    'break', 'case', 'continue', 'default', 'discard', 'do', 'else',
    'for', 'if', 'return', 'switch', 'while',
    'const', 'struct', 'void',
    'true', 'false',
  ],

  // Storage qualifiers
  storageQualifiers: [
    'in', 'out', 'inout', 'uniform', 'varying', 'attribute',
    'centroid', 'flat', 'smooth', 'layout',
    'highp', 'mediump', 'lowp', 'precision',
    'invariant',
  ],

  // GLSL types
  typeKeywords: [
    'float', 'int', 'uint', 'bool',
    'vec2', 'vec3', 'vec4',
    'ivec2', 'ivec3', 'ivec4',
    'uvec2', 'uvec3', 'uvec4',
    'bvec2', 'bvec3', 'bvec4',
    'mat2', 'mat3', 'mat4',
    'mat2x2', 'mat2x3', 'mat2x4',
    'mat3x2', 'mat3x3', 'mat3x4',
    'mat4x2', 'mat4x3', 'mat4x4',
    'sampler2D', 'sampler3D', 'samplerCube',
    'sampler2DShadow', 'samplerCubeShadow',
    'sampler2DArray', 'sampler2DArrayShadow',
    'isampler2D', 'isampler3D', 'isamplerCube',
    'isampler2DArray',
    'usampler2D', 'usampler3D', 'usamplerCube',
    'usampler2DArray',
  ],

  // Built-in functions
  builtinFunctions: [
    // Trigonometric
    'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
    // Exponential
    'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
    // Common
    'abs', 'sign', 'floor', 'trunc', 'round', 'roundEven', 'ceil', 'fract',
    'mod', 'modf', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
    'isnan', 'isinf',
    // Geometric
    'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward',
    'reflect', 'refract',
    // Matrix
    'matrixCompMult', 'outerProduct', 'transpose', 'determinant', 'inverse',
    // Vector relational
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
    'equal', 'notEqual', 'any', 'all', 'not',
    // Texture
    'texture', 'textureSize', 'textureProj', 'textureLod', 'textureOffset',
    'texelFetch', 'texelFetchOffset', 'textureProjOffset', 'textureLodOffset',
    'textureProjLod', 'textureProjLodOffset', 'textureGrad', 'textureGradOffset',
    'textureProjGrad', 'textureProjGradOffset',
    // Fragment processing
    'dFdx', 'dFdy', 'fwidth',
    // Packing
    'packSnorm2x16', 'unpackSnorm2x16', 'packUnorm2x16', 'unpackUnorm2x16',
    'packHalf2x16', 'unpackHalf2x16',
    // Integer
    'floatBitsToInt', 'floatBitsToUint', 'intBitsToFloat', 'uintBitsToFloat',
  ],

  // Built-in variables
  builtinVariables: [
    'gl_Position', 'gl_PointSize', 'gl_FragCoord', 'gl_FrontFacing',
    'gl_FragDepth', 'gl_PointCoord',
    'gl_VertexID', 'gl_InstanceID',
    'gl_MaxVertexAttribs', 'gl_MaxVertexUniformVectors',
    'gl_MaxVaryingVectors', 'gl_MaxVertexTextureImageUnits',
    'gl_MaxCombinedTextureImageUnits', 'gl_MaxTextureImageUnits',
    'gl_MaxFragmentUniformVectors', 'gl_MaxDrawBuffers',
  ],

  // Operators
  operators: [
    '=', '>', '<', '!', '~', '?', ':',
    '==', '<=', '>=', '!=', '&&', '||',
    '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '>>>', '+=', '-=', '*=', '/=',
    '&=', '|=', '^=', '%=', '<<=', '>>=',
  ],

  // Symbols for operator matching
  symbols: /[=><!~?:&|+\-*/^%]+/,

  // Digit patterns
  digits: /\d+(_+\d+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  // Main tokenizer
  tokenizer: {
    root: [
      // Preprocessor directives
      [/#\s*(version|define|undef|if|ifdef|ifndef|else|elif|endif|error|pragma|extension|line|include)\b/, 'keyword.directive'],

      // Identifiers and keywords
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@storageQualifiers': 'keyword.qualifier',
          '@typeKeywords': 'type',
          '@builtinFunctions': 'support.function',
          '@builtinVariables': 'variable.predefined',
          '@default': 'identifier',
        },
      }],

      // Whitespace
      { include: '@whitespace' },

      // Brackets
      [/[{}()[\]]/, '@brackets'],

      // Operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // Numbers - float with exponent
      [/\d+\.\d*([eE][-+]?\d+)?/, 'number.float'],
      [/\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/\d+[eE][-+]?\d+/, 'number.float'],

      // Numbers - hex
      [/0[xX]@hexdigits/, 'number.hex'],

      // Numbers - integer (with optional u suffix for uint)
      [/@digits[uU]?/, 'number'],

      // Delimiter
      [/[;,.]/, 'delimiter'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
  },
};
