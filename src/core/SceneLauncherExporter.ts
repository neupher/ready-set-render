/**
 * SceneLauncherExporter - Generates shareable HTML launcher files
 *
 * Creates self-contained HTML files that embed scene data and open
 * the deployed WebGL editor when the user clicks a button.
 *
 * Communication flow:
 * 1. User double-clicks MyScene.html
 * 2. HTML file opens in browser showing scene info and "Open in Editor" button
 * 3. User clicks button → opens the deployed editor (user gesture = no popup blocking)
 * 4. Editor signals it's ready via postMessage
 * 5. Launcher sends scene data via postMessage
 * 6. Editor loads the scene, launcher auto-closes
 *
 * @example
 * ```typescript
 * const html = SceneLauncherExporter.generateHTML({
 *   scene: mySceneAsset,
 *   editorUrl: 'https://myapp.github.io/ready-set-render'
 * });
 *
 * // Download as file
 * SceneLauncherExporter.downloadAsFile(html, 'MyScene.html');
 * ```
 */

import type { ISceneAsset } from './assets/interfaces/ISceneAsset';

/**
 * Options for generating a launcher HTML file.
 */
export interface LauncherOptions {
  /** The scene asset to embed */
  scene: ISceneAsset;
  /** URL of the deployed WebGL editor */
  editorUrl: string;
  /** Custom title for the HTML page (defaults to scene name) */
  title?: string;
}

/**
 * Protocol identifier for scene launcher messages.
 */
export const SCENE_LAUNCHER_PROTOCOL = 'ready-set-render-scene';

/**
 * Message types for launcher-editor communication.
 */
export interface LauncherMessage {
  /** Protocol identifier */
  protocol: typeof SCENE_LAUNCHER_PROTOCOL;
  /** Message type */
  type: 'loadScene' | 'editorReady';
  /** Scene data (only for loadScene) */
  scene?: ISceneAsset;
}

/**
 * Utility class for generating shareable HTML scene launcher files.
 */
export class SceneLauncherExporter {
  /**
   * Generate an HTML launcher file containing the embedded scene.
   *
   * @param options - Launcher generation options
   * @returns Complete HTML string ready to save as a file
   */
  static generateHTML(options: LauncherOptions): string {
    const { scene, editorUrl, title } = options;
    const pageTitle = title ?? `${scene.name} - Ready Set Render`;

    // Serialize scene data as JSON
    const sceneJSON = JSON.stringify(scene);

    // Escape for embedding in JavaScript string
    const escapedSceneJSON = sceneJSON
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(pageTitle)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #e4e4e7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 500px;
    }
    .logo {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #fff;
    }
    .scene-name {
      font-size: 18px;
      color: #a1a1aa;
      margin-bottom: 32px;
    }
    .open-btn {
      display: inline-block;
      padding: 16px 48px;
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
    }
    .open-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 195, 247, 0.4);
    }
    .open-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    .open-btn:disabled {
      background: #3f3f46;
      color: #71717a;
      cursor: not-allowed;
      box-shadow: none;
    }
    .status {
      margin-top: 24px;
      min-height: 24px;
      font-size: 14px;
      color: #a1a1aa;
    }
    .status.success {
      color: #4ade80;
    }
    .status.error {
      color: #f87171;
    }
    .footer {
      margin-top: 48px;
      font-size: 12px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🚀</div>
    <h1>Ready Set Render</h1>
    <p class="scene-name">${this.escapeHTML(scene.name)}</p>

    <button class="open-btn" id="openBtn">Open in Editor</button>

    <p class="status" id="status"></p>

    <p class="footer">Scene launcher file • Double-click to open</p>
  </div>

  <script>
    (function() {
      // ===== EMBEDDED SCENE DATA =====
      const SCENE_DATA = JSON.parse('${escapedSceneJSON}');

      // ===== EDITOR CONFIGURATION =====
      const EDITOR_URL = '${this.escapeHTML(editorUrl)}';
      const PROTOCOL = '${SCENE_LAUNCHER_PROTOCOL}';

      // State
      let editorWindow = null;
      let sceneSent = false;

      // DOM elements
      const openBtn = document.getElementById('openBtn');
      const statusEl = document.getElementById('status');

      /**
       * Update status display
       */
      function setStatus(text, type) {
        statusEl.textContent = text;
        statusEl.className = 'status' + (type ? ' ' + type : '');
      }

      /**
       * Send scene data to the editor
       */
      function sendSceneToEditor() {
        if (sceneSent || !editorWindow) return;

        try {
          editorWindow.postMessage({
            protocol: PROTOCOL,
            type: 'loadScene',
            scene: SCENE_DATA
          }, '*');
          setStatus('Sending scene data...');
        } catch (e) {
          console.error('Failed to send scene:', e);
          setStatus('Failed to send scene data', 'error');
        }
      }

      /**
       * Listen for messages from the editor
       */
      window.addEventListener('message', function(event) {
        if (!event.data || event.data.protocol !== PROTOCOL) return;

        if (event.data.type === 'editorReady') {
          // Capture editor window from message source (works for all scenarios)
          editorWindow = event.source;
          setStatus('Editor ready, sending scene...');
          sendSceneToEditor();
        }

        if (event.data.type === 'sceneLoaded') {
          sceneSent = true;
          setStatus('Scene loaded successfully!', 'success');

          // Auto-close this tab after a brief delay
          setTimeout(function() {
            window.close();
          }, 1500);
        }

        if (event.data.type === 'sceneLoadError') {
          setStatus('Failed to load scene: ' + (event.data.error || 'Unknown error'), 'error');
          openBtn.disabled = false;
        }
      });

      /**
       * Open the editor (triggered by button click)
       */
      function openEditor() {
        openBtn.disabled = true;
        setStatus('Opening editor...');

        try {
          // Append a flag to indicate we're loading from a launcher
          const urlWithFlag = EDITOR_URL + (EDITOR_URL.includes('?') ? '&' : '?') + 'launcher=1';
          editorWindow = window.open(urlWithFlag, '_blank', 'noopener=no');

          if (!editorWindow) {
            setStatus('Could not open editor. Please allow popups and try again.', 'error');
            openBtn.disabled = false;
            return;
          }

          setStatus('Editor opened, waiting for it to load...');

        } catch (e) {
          setStatus('Failed to open editor: ' + e.message, 'error');
          openBtn.disabled = false;
        }
      }

      // Attach click handler to button
      openBtn.addEventListener('click', openEditor);
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Trigger a browser download of the HTML launcher file.
   *
   * @param html - The HTML content to download
   * @param filename - Filename for the download (should end in .html)
   */
  static downloadAsFile(html: string, filename: string): void {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  private static escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
