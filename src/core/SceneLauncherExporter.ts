/**
 * SceneLauncherExporter - Generates shareable HTML launcher files
 *
 * Creates self-contained HTML files that embed scene data and redirect
 * to the deployed WebGL editor. When a user double-clicks the HTML file,
 * it opens their browser, navigates to the editor, and loads the scene.
 *
 * Communication flow:
 * 1. User double-clicks MyScene.html
 * 2. HTML file opens in browser
 * 3. Script opens the deployed editor in a new tab/window
 * 4. Editor signals it's ready via postMessage
 * 5. Launcher sends scene data via postMessage
 * 6. Editor loads the scene automatically
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
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #fff;
    }
    .scene-name {
      font-size: 18px;
      color: #a1a1aa;
      margin-bottom: 24px;
    }
    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #3f3f46;
      border-top-color: #4fc3f7;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status-text {
      font-size: 14px;
      color: #a1a1aa;
    }
    .fallback {
      font-size: 13px;
      color: #71717a;
    }
    .fallback a {
      color: #4fc3f7;
      text-decoration: none;
    }
    .fallback a:hover {
      text-decoration: underline;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
      display: none;
    }
    .error.visible {
      display: block;
    }
    .error-title {
      color: #ef4444;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .error-message {
      font-size: 13px;
      color: #fca5a5;
    }
    .manual-btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 20px;
      background: #4fc3f7;
      color: #1a1a2e;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .manual-btn:hover {
      background: #81d4fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🚀</div>
    <h1>Opening Scene in Ready Set Render</h1>
    <p class="scene-name">${this.escapeHTML(scene.name)}.scene</p>

    <div class="status" id="status">
      <div class="spinner"></div>
      <span class="status-text" id="statusText">Launching editor...</span>
    </div>

    <p class="fallback">
      If nothing happens, <a href="${this.escapeHTML(editorUrl)}" target="_blank" id="fallbackLink">click here to open the editor</a>
    </p>

    <div class="error" id="error">
      <p class="error-title">Could not launch automatically</p>
      <p class="error-message" id="errorMessage">Pop-up blocked or editor not accessible.</p>
      <a href="${this.escapeHTML(editorUrl)}" target="_blank" class="manual-btn">Open Editor Manually</a>
    </div>
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
      let retryCount = 0;
      const MAX_RETRIES = 10;
      const RETRY_INTERVAL = 500;

      // DOM elements
      const statusText = document.getElementById('statusText');
      const errorDiv = document.getElementById('error');
      const errorMessage = document.getElementById('errorMessage');

      /**
       * Update status display
       */
      function setStatus(text) {
        statusText.textContent = text;
      }

      /**
       * Show error state
       */
      function showError(message) {
        errorMessage.textContent = message;
        errorDiv.classList.add('visible');
        document.getElementById('status').style.display = 'none';
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
        }
      }

      /**
       * Retry sending scene data periodically
       */
      function retrySceneSend() {
        if (sceneSent || retryCount >= MAX_RETRIES) {
          if (!sceneSent && retryCount >= MAX_RETRIES) {
            showError('Editor did not respond. The scene data has been sent but may not have loaded.');
          }
          return;
        }

        retryCount++;
        sendSceneToEditor();
        setTimeout(retrySceneSend, RETRY_INTERVAL);
      }

      /**
       * Listen for messages from the editor
       */
      window.addEventListener('message', function(event) {
        // Validate message format
        if (!event.data || event.data.protocol !== PROTOCOL) return;

        if (event.data.type === 'editorReady') {
          setStatus('Editor ready, sending scene...');
          sendSceneToEditor();
        }

        if (event.data.type === 'sceneLoaded') {
          sceneSent = true;
          setStatus('Scene loaded successfully!');

          // Auto-close this tab after a brief delay
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      });

      /**
       * Open the editor
       */
      function openEditor() {
        try {
          // Append a flag to indicate we're loading from a launcher
          const urlWithFlag = EDITOR_URL + (EDITOR_URL.includes('?') ? '&' : '?') + 'launcher=1';
          editorWindow = window.open(urlWithFlag, '_blank');

          if (!editorWindow) {
            showError('Pop-up was blocked. Please allow pop-ups or click the button below.');
            return;
          }

          setStatus('Editor opened, waiting for it to load...');

          // Start retry loop
          setTimeout(retrySceneSend, 1000);

        } catch (e) {
          showError('Failed to open editor: ' + e.message);
        }
      }

      // Start the process
      openEditor();
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
