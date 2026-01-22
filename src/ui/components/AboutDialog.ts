/**
 * AboutDialog Component
 *
 * A modal dialog that displays information about the project.
 * Shows author name, description, and link to MIT license.
 *
 * @example
 * ```ts
 * const dialog = new AboutDialog();
 * dialog.show();
 * ```
 */

export interface AboutDialogOptions {
  /** Project name */
  projectName?: string;
  /** Project version */
  version?: string;
  /** Author name */
  author?: string;
  /** GitHub repository URL */
  repoUrl?: string;
}

/**
 * Modal dialog for displaying About information.
 * NOT a plugin - standard UI component.
 */
export class AboutDialog {
  private readonly overlay: HTMLDivElement;
  private readonly dialog: HTMLDivElement;
  private readonly projectName: string;
  private readonly version: string;
  private readonly author: string;
  private readonly repoUrl: string;

  constructor(options: AboutDialogOptions = {}) {
    this.projectName = options.projectName ?? 'Ready Set Render';
    this.version = options.version ?? '0.5.0';
    this.author = options.author ?? 'Tapani Heikkinen';
    this.repoUrl = options.repoUrl ?? 'https://github.com/neupher/ready-set-render';

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'about-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'about-dialog';
    this.dialog.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      padding: var(--spacing-xl);
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    this.render();

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape key
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
  }

  /**
   * Show the dialog.
   */
  show(): void {
    this.overlay.style.display = 'flex';
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Hide the dialog.
   */
  hide(): void {
    this.overlay.style.display = 'none';
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Check if dialog is visible.
   */
  isVisible(): boolean {
    return this.overlay.style.display === 'flex';
  }

  /**
   * Clean up.
   */
  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.remove();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide();
    }
  }

  private render(): void {
    this.dialog.innerHTML = `
      <div style="margin-bottom: var(--spacing-lg);">
        <h2 style="
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 var(--spacing-xs) 0;
        ">${this.projectName}</h2>
        <p style="
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          margin: 0;
        ">Version ${this.version}</p>
      </div>

      <p style="
        color: var(--text-secondary);
        font-size: var(--font-size-base);
        line-height: 1.6;
        margin: 0 0 var(--spacing-lg) 0;
      ">
        A modular, extensible WebGL2-based 3D editor designed for learning
        and implementing real-time and ray-tracing rendering techniques.
      </p>

      <div style="
        border-top: 1px solid var(--border-primary);
        padding-top: var(--spacing-lg);
        margin-top: var(--spacing-lg);
      ">
        <p style="
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin: 0 0 var(--spacing-sm) 0;
        ">
          Created by <strong style="color: var(--text-primary);">${this.author}</strong>
        </p>
        <a
          href="${this.repoUrl}/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          style="
            color: var(--accent-primary);
            font-size: var(--font-size-sm);
            text-decoration: none;
          "
        >
          MIT License
        </a>
      </div>

      <button
        class="about-close-btn"
        style="
          margin-top: var(--spacing-xl);
          padding: var(--spacing-sm) var(--spacing-xl);
          background: var(--accent-primary);
          color: var(--text-primary);
          border: none;
          border-radius: 4px;
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        "
      >
        Close
      </button>
    `;

    // Wire up close button
    const closeBtn = this.dialog.querySelector('.about-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Hover effect for close button
    closeBtn?.addEventListener('mouseenter', () => {
      (closeBtn as HTMLElement).style.background = 'var(--accent-hover)';
    });
    closeBtn?.addEventListener('mouseleave', () => {
      (closeBtn as HTMLElement).style.background = 'var(--accent-primary)';
    });
  }
}
