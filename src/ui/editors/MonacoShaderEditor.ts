/**
 * MonacoShaderEditor - Monaco-based GLSL shader editor component
 *
 * A self-contained UI component that wraps Monaco Editor for editing GLSL
 * shaders. Provides:
 * - Lazy-loaded Monaco Editor (only downloaded when first opened)
 * - GLSL syntax highlighting via custom Monarch tokenizer
 * - Compilation error markers with inline decorations
 * - Status bar showing compilation state
 * - Dark theme matching the editor UI
 *
 * The component communicates with ShaderEditorService via callbacks
 * and does not depend on EventBus directly.
 *
 * Internally maintains separate text models for vertex and fragment sources
 * (required by WebGL compilation), but the user sees a single editor view
 * showing the fragment shader — the primary editing surface.
 *
 * @example
 * ```typescript
 * const editor = new MonacoShaderEditor();
 * container.appendChild(editor.element);
 *
 * // Set source content
 * editor.setSource('vertex', vertexCode);
 * editor.setSource('fragment', fragmentCode);
 *
 * // Listen for changes
 * editor.onSourceChange = (stage, source) => {
 *   shaderEditorService.updateSource(stage, source);
 * };
 * ```
 */

import type { ShaderStage, CompilationStatus } from '@core/ShaderEditorService';
import type { IShaderError } from '@core/assets/ShaderCompilationService';

/**
 * Monaco module type (loaded asynchronously).
 */
type MonacoModule = typeof import('monaco-editor');

/**
 * Monaco editor instance type.
 */
type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor;

/**
 * Monaco editor model type.
 */
type MonacoModel = import('monaco-editor').editor.ITextModel;

/**
 * Callback fired when the user edits shader source.
 */
export type SourceChangeCallback = (stage: ShaderStage, source: string) => void;

/**
 * Monaco-based GLSL shader editor component.
 */
export class MonacoShaderEditor {
  private readonly container: HTMLDivElement;
  private readonly editorContainer: HTMLDivElement;
  private readonly tabsBar: HTMLDivElement;
  private readonly statusBar: HTMLDivElement;
  private readonly statusIcon: HTMLSpanElement;
  private readonly statusText: HTMLSpanElement;
  private readonly actionBar: HTMLDivElement;
  private readonly newShaderBtn: HTMLButtonElement;
  private readonly saveBtn: HTMLButtonElement;
  private readonly revertBtn: HTMLButtonElement;

  /** Monaco editor instance (null until lazy-loaded) */
  private editor: MonacoEditor | null = null;

  /** Monaco module reference (null until lazy-loaded) */
  private monacoModule: MonacoModule | null = null;

  /** Separate text models for vertex and fragment sources */
  private vertexModel: MonacoModel | null = null;
  private fragmentModel: MonacoModel | null = null;

  /** Whether Monaco has been initialized */
  private initialized = false;

  /** Loading state */
  private isLoading = false;

  /** Callback for source changes */
  onSourceChange: SourceChangeCallback | null = null;

  /** Callback for save action */
  onSave: (() => void) | null = null;

  /** Callback for revert action */
  onRevert: (() => void) | null = null;

  /** Callback for creating a new shader */
  onNewShader: (() => void) | null = null;

  /** Whether the shader is read-only (built-in) */
  private _readOnly = false;

  constructor() {
    // Root container
    this.container = document.createElement('div');
    this.container.className = 'monaco-shader-editor';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-primary);
    `;

    // Toolbar bar (action buttons only — no stage tabs)
    this.tabsBar = document.createElement('div');
    this.tabsBar.className = 'shader-editor-tabs';
    this.tabsBar.style.cssText = `
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border-primary);
      background: var(--bg-secondary);
      flex-shrink: 0;
    `;

    // Action bar (New | Save | Revert)
    this.actionBar = document.createElement('div');
    this.actionBar.style.cssText = `
      display: flex;
      gap: var(--spacing-xs);
      margin-left: auto;
      align-items: center;
      padding-right: var(--spacing-xs);
    `;

    this.newShaderBtn = document.createElement('button');
    this.newShaderBtn.textContent = '+ New';
    this.newShaderBtn.title = 'Create a new unlit shader';
    this.newShaderBtn.className = 'shader-action-btn';
    this.newShaderBtn.style.cssText = `
      padding: 2px 8px;
      font-size: var(--font-size-xs);
      background: var(--accent-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
    `;
    this.newShaderBtn.addEventListener('click', () => this.onNewShader?.());

    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = 'Save';
    this.saveBtn.title = 'Save shader changes to asset';
    this.saveBtn.className = 'shader-action-btn';
    this.saveBtn.style.cssText = `
      padding: 2px 8px;
      font-size: var(--font-size-xs);
      background: var(--accent-blue);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      opacity: 0.7;
    `;
    this.saveBtn.addEventListener('click', () => this.onSave?.());

    this.revertBtn = document.createElement('button');
    this.revertBtn.textContent = 'Revert';
    this.revertBtn.title = 'Revert to last saved state';
    this.revertBtn.className = 'shader-action-btn';
    this.revertBtn.style.cssText = `
      padding: 2px 8px;
      font-size: var(--font-size-xs);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
    `;
    this.revertBtn.addEventListener('click', () => this.onRevert?.());

    this.actionBar.appendChild(this.newShaderBtn);
    this.actionBar.appendChild(this.saveBtn);
    this.actionBar.appendChild(this.revertBtn);
    this.tabsBar.appendChild(this.actionBar);

    // Editor container (where Monaco will be mounted)
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'shader-editor-monaco';
    this.editorContainer.style.cssText = `
      flex: 1;
      overflow: hidden;
      position: relative;
    `;

    // Loading placeholder
    const loading = document.createElement('div');
    loading.className = 'shader-editor-loading';
    loading.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    `;
    loading.textContent = 'Loading shader editor...';
    this.editorContainer.appendChild(loading);

    // Status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'shader-editor-status';
    this.statusBar.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 2px var(--spacing-sm);
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-primary);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      flex-shrink: 0;
      min-height: 20px;
    `;

    this.statusIcon = document.createElement('span');
    this.statusIcon.style.cssText = 'font-size: 10px;';
    this.statusText = document.createElement('span');
    this.statusText.textContent = 'Ready';

    this.statusBar.appendChild(this.statusIcon);
    this.statusBar.appendChild(this.statusText);

    // Assemble
    this.container.appendChild(this.tabsBar);
    this.container.appendChild(this.editorContainer);
    this.container.appendChild(this.statusBar);
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Whether Monaco has been loaded and initialized.
   */
  get isReady(): boolean {
    return this.initialized;
  }

  /**
   * Set read-only mode (for built-in shaders).
   */
  set readOnly(value: boolean) {
    this._readOnly = value;
    if (this.editor) {
      this.editor.updateOptions({ readOnly: value });
    }
    this.saveBtn.style.display = value ? 'none' : '';
    this.revertBtn.style.display = value ? 'none' : '';
  }

  /**
   * Initialize the Monaco editor (lazy-loads the Monaco module).
   * Call this when the shader tab becomes visible for the first time.
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.isLoading) return;
    this.isLoading = true;

    try {
      // Import worker setup first (must run before Monaco)
      await import('./monacoWorkerSetup');

      // Lazy-load Monaco
      const monaco = await import('monaco-editor');
      this.monacoModule = monaco;

      // Register GLSL language
      const { registerGLSLLanguage } = await import('./glslLanguage');
      registerGLSLLanguage(monaco);

      // Define editor theme matching our dark UI
      monaco.editor.defineTheme('shader-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'C586C0' },
          { token: 'keyword.qualifier', foreground: '569CD6' },
          { token: 'keyword.directive', foreground: '9B9B9B', fontStyle: 'italic' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'support.function', foreground: 'DCDCAA' },
          { token: 'variable.predefined', foreground: '9CDCFE' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'number.float', foreground: 'B5CEA8' },
          { token: 'number.hex', foreground: 'B5CEA8' },
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'operator', foreground: 'D4D4D4' },
          { token: 'delimiter', foreground: 'D4D4D4' },
          { token: 'identifier', foreground: '9CDCFE' },
        ],
        colors: {
          'editor.background': '#1a1a1a',
          'editor.foreground': '#e0e0e0',
          'editor.lineHighlightBackground': '#2a2a2a',
          'editor.selectionBackground': '#264f78',
          'editorCursor.foreground': '#e0e0e0',
          'editorLineNumber.foreground': '#5a5a5a',
          'editorLineNumber.activeForeground': '#a0a0a0',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorGutter.background': '#1a1a1a',
        },
      });

      // Create text models for vertex and fragment
      this.vertexModel = monaco.editor.createModel('', 'glsl');
      this.fragmentModel = monaco.editor.createModel('', 'glsl');

      // Clear loading placeholder
      this.editorContainer.innerHTML = '';

      // Create the editor — always showing the fragment model (primary editing surface)
      this.editor = monaco.editor.create(this.editorContainer, {
        model: this.fragmentModel,
        theme: 'shader-dark',
        language: 'glsl',
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'off',
        glyphMargin: true,
        folding: true,
        renderLineHighlight: 'line',
        lineDecorationsWidth: 5,
        readOnly: this._readOnly,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      });

      // Listen for content changes
      this.vertexModel.onDidChangeContent(() => {
        if (!this._readOnly) {
          this.onSourceChange?.('vertex', this.vertexModel!.getValue());
        }
      });

      this.fragmentModel.onDidChangeContent(() => {
        if (!this._readOnly) {
          this.onSourceChange?.('fragment', this.fragmentModel!.getValue());
        }
      });

      this.initialized = true;
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      console.error('Failed to initialize Monaco shader editor:', error);

      this.editorContainer.innerHTML = '';
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        padding: var(--spacing-md);
        color: var(--accent-red);
        font-size: var(--font-size-sm);
      `;
      errorDiv.textContent = `Failed to load shader editor: ${error}`;
      this.editorContainer.appendChild(errorDiv);
    }
  }

  /**
   * Set the source code for a specific shader stage.
   * Does not trigger the onSourceChange callback.
   *
   * @param stage - The shader stage ('vertex' or 'fragment')
   * @param source - The GLSL source code
   */
  setSource(stage: ShaderStage, source: string): void {
    if (stage === 'vertex' && this.vertexModel) {
      this.vertexModel.setValue(source);
    } else if (stage === 'fragment' && this.fragmentModel) {
      this.fragmentModel.setValue(source);
    }
  }

  /**
   * Get the source code for a specific shader stage.
   *
   * @param stage - The shader stage
   * @returns The GLSL source code
   */
  getSource(stage: ShaderStage): string {
    if (stage === 'vertex') {
      return this.vertexModel?.getValue() ?? '';
    }
    return this.fragmentModel?.getValue() ?? '';
  }

  /**
   * Update the status bar to reflect compilation state.
   *
   * @param status - The compilation status
   * @param errorCount - Number of compilation errors (for 'error' status)
   */
  setCompilationStatus(status: CompilationStatus, errorCount: number = 0): void {
    switch (status) {
      case 'idle':
        this.statusIcon.textContent = '●';
        this.statusIcon.style.color = 'var(--text-muted)';
        this.statusText.textContent = 'Ready';
        break;
      case 'compiling':
        this.statusIcon.textContent = '⟳';
        this.statusIcon.style.color = 'var(--accent-yellow)';
        this.statusText.textContent = 'Compiling...';
        break;
      case 'success':
        this.statusIcon.textContent = '✓';
        this.statusIcon.style.color = 'var(--accent-green)';
        this.statusText.textContent = 'Compiled successfully';
        break;
      case 'error':
        this.statusIcon.textContent = '✗';
        this.statusIcon.style.color = 'var(--accent-red)';
        this.statusText.textContent = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
        break;
    }
  }

  /**
   * Set error markers in the editor based on compilation errors.
   *
   * @param errors - Array of shader compilation errors
   */
  setErrors(errors: readonly IShaderError[]): void {
    if (!this.monacoModule || !this.vertexModel || !this.fragmentModel) return;

    const monaco = this.monacoModule;

    // Separate errors by stage
    const vertexErrors = errors.filter(e => e.type === 'vertex');
    const fragmentErrors = errors.filter(e => e.type === 'fragment');
    const linkErrors = errors.filter(e => e.type === 'link');

    // Set markers on vertex model
    const vertexMarkers = vertexErrors.map(e => this.errorToMarker(e, monaco));
    monaco.editor.setModelMarkers(this.vertexModel, 'glsl', vertexMarkers);

    // Set markers on fragment model (include link errors here)
    const fragmentMarkers = [
      ...fragmentErrors,
      ...linkErrors,
    ].map(e => this.errorToMarker(e, monaco));
    monaco.editor.setModelMarkers(this.fragmentModel, 'glsl', fragmentMarkers);
  }

  /**
   * Clear all error markers.
   */
  clearErrors(): void {
    if (!this.monacoModule || !this.vertexModel || !this.fragmentModel) return;

    this.monacoModule.editor.setModelMarkers(this.vertexModel, 'glsl', []);
    this.monacoModule.editor.setModelMarkers(this.fragmentModel, 'glsl', []);
  }

  /**
   * Force the editor to recalculate its layout.
   * Call this when the container size changes.
   */
  layout(): void {
    this.editor?.layout();
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this.editor?.focus();
  }

  /**
   * Dispose the editor and free resources.
   */
  dispose(): void {
    this.editor?.dispose();
    this.vertexModel?.dispose();
    this.fragmentModel?.dispose();
    this.editor = null;
    this.vertexModel = null;
    this.fragmentModel = null;
    this.monacoModule = null;
    this.initialized = false;
  }

  /**
   * Convert a shader error to a Monaco marker.
   */
  private errorToMarker(
    error: IShaderError,
    monaco: MonacoModule,
  ): import('monaco-editor').editor.IMarkerData {
    const line = error.line ?? 1;
    return {
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: 1000,
    };
  }
}
