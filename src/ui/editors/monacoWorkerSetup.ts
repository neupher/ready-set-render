/**
 * Monaco Editor Worker Configuration
 *
 * Configures Monaco Editor web workers for Vite bundling.
 * Monaco requires web workers for syntax highlighting, validation,
 * and other editor features. This module sets up the MonacoEnvironment
 * to use Vite's `?worker` import syntax.
 *
 * MUST be imported before any Monaco Editor usage:
 * ```typescript
 * import './monacoWorkerSetup';
 * import * as monaco from 'monaco-editor';
 * ```
 */

// @ts-expect-error -- Vite ?worker import syntax has no type declarations
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

/**
 * Configure Monaco's worker factory.
 *
 * Monaco uses web workers for heavy operations (tokenization, etc.).
 * Since we only need the base editor (no TypeScript/CSS/HTML/JSON language
 * services), we only provide the generic editor worker.
 *
 * GLSL has no built-in Monaco language service, so we register it
 * as a custom language via the Monarch tokenizer in glslLanguage.ts.
 */
self.MonacoEnvironment = {
  getWorker(_workerId: string, _label: string): Worker {
    return new editorWorker();
  },
};
