/**
 * ConfirmDialog Component
 *
 * A modal dialog for confirming user actions with customizable message and buttons.
 * Used for unsaved changes warnings and other confirmation prompts.
 *
 * @example
 * ```ts
 * const dialog = new ConfirmDialog({
 *   title: 'Unsaved Changes',
 *   message: 'You have unsaved changes. Do you want to discard them?',
 *   confirmText: 'Discard',
 *   cancelText: 'Cancel',
 *   onConfirm: () => console.log('Confirmed'),
 *   onCancel: () => console.log('Cancelled'),
 * });
 * dialog.show();
 * ```
 */

export interface ConfirmDialogOptions {
  /** Dialog title */
  title?: string;
  /** Message to display */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether confirm is a destructive action (red button) */
  destructive?: boolean;
  /** Callback when user confirms */
  onConfirm?: () => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

/**
 * Modal confirmation dialog.
 * NOT a plugin - standard UI component.
 */
export class ConfirmDialog {
  private readonly overlay: HTMLDivElement;
  private readonly dialog: HTMLDivElement;
  private readonly options: Required<ConfirmDialogOptions>;

  private resolved = false;

  constructor(options: ConfirmDialogOptions) {
    this.options = {
      title: options.title ?? 'Confirm',
      message: options.message,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      destructive: options.destructive ?? false,
      onConfirm: options.onConfirm ?? (() => {}),
      onCancel: options.onCancel ?? (() => {}),
    };

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'confirm-overlay';
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
      z-index: 1001;
    `;

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'confirm-dialog';
    this.dialog.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      padding: var(--spacing-lg);
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    this.render();

    // Close on overlay click (treat as cancel)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.cancel();
      }
    });

    // Handle keyboard
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
  }

  /**
   * Show the dialog.
   */
  show(): void {
    this.resolved = false;
    this.overlay.style.display = 'flex';
    document.addEventListener('keydown', this.handleKeyDown);

    // Focus the cancel button by default (safer option)
    const cancelBtn = this.dialog.querySelector('.confirm-cancel-btn') as HTMLButtonElement;
    cancelBtn?.focus();
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
   * Confirm and close the dialog.
   */
  confirm(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.hide();
    this.options.onConfirm();
  }

  /**
   * Cancel and close the dialog.
   */
  cancel(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.hide();
    this.options.onCancel();
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
      this.cancel();
    } else if (e.key === 'Enter') {
      // Enter confirms only if focused on confirm button
      const activeElement = document.activeElement;
      if (activeElement?.classList.contains('confirm-confirm-btn')) {
        this.confirm();
      }
    }
  }

  private render(): void {
    const confirmBtnColor = this.options.destructive
      ? '#e74c3c' // Red for destructive
      : 'var(--accent-primary)';

    const confirmBtnHover = this.options.destructive
      ? '#c0392b'
      : 'var(--accent-hover)';

    this.dialog.innerHTML = `
      <h3 style="
        color: var(--text-primary);
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 var(--spacing-md) 0;
      ">${this.options.title}</h3>

      <p style="
        color: var(--text-secondary);
        font-size: var(--font-size-base);
        line-height: 1.5;
        margin: 0 0 var(--spacing-lg) 0;
      ">${this.options.message}</p>

      <div style="
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
      ">
        <button
          class="confirm-cancel-btn"
          style="
            padding: var(--spacing-sm) var(--spacing-lg);
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            font-size: var(--font-size-sm);
            cursor: pointer;
            transition: all 0.2s ease;
          "
        >
          ${this.options.cancelText}
        </button>
        <button
          class="confirm-confirm-btn"
          style="
            padding: var(--spacing-sm) var(--spacing-lg);
            background: ${confirmBtnColor};
            color: white;
            border: none;
            border-radius: 4px;
            font-size: var(--font-size-sm);
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
          "
        >
          ${this.options.confirmText}
        </button>
      </div>
    `;

    // Wire up buttons
    const cancelBtn = this.dialog.querySelector('.confirm-cancel-btn') as HTMLButtonElement;
    const confirmBtn = this.dialog.querySelector('.confirm-confirm-btn') as HTMLButtonElement;

    cancelBtn?.addEventListener('click', () => this.cancel());
    confirmBtn?.addEventListener('click', () => this.confirm());

    // Hover effects
    cancelBtn?.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'var(--bg-quaternary)';
      cancelBtn.style.color = 'var(--text-primary)';
    });
    cancelBtn?.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'var(--bg-tertiary)';
      cancelBtn.style.color = 'var(--text-secondary)';
    });

    confirmBtn?.addEventListener('mouseenter', () => {
      confirmBtn.style.background = confirmBtnHover;
    });
    confirmBtn?.addEventListener('mouseleave', () => {
      confirmBtn.style.background = confirmBtnColor;
    });
  }
}

/**
 * Show a confirmation dialog and return a promise.
 *
 * @param options - Dialog options
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirmDialog(options: Omit<ConfirmDialogOptions, 'onConfirm' | 'onCancel'>): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = new ConfirmDialog({
      ...options,
      onConfirm: () => {
        dialog.dispose();
        resolve(true);
      },
      onCancel: () => {
        dialog.dispose();
        resolve(false);
      },
    });
    dialog.show();
  });
}

/**
 * Result of an unsaved changes dialog prompt.
 */
export type UnsavedChangesResult = 'save' | 'discard' | 'cancel';

/**
 * Show a 3-choice unsaved changes dialog: Save, Discard, or Cancel.
 *
 * @param message - Description of what has unsaved changes
 * @returns Promise resolving to the user's choice
 */
export function showUnsavedChangesDialog(message: string): Promise<UnsavedChangesResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1001;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      padding: var(--spacing-lg);
      max-width: 420px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };

    const finish = (result: UnsavedChangesResult) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    dialog.innerHTML = `
      <h3 style="
        color: var(--text-primary);
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 var(--spacing-md) 0;
      ">Unsaved Changes</h3>
      <p style="
        color: var(--text-secondary);
        font-size: var(--font-size-base);
        line-height: 1.5;
        margin: 0 0 var(--spacing-lg) 0;
      ">${message}</p>
      <div style="
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
      ">
        <button class="ucd-cancel" style="
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          font-size: var(--font-size-sm);
          cursor: pointer;
        ">Cancel</button>
        <button class="ucd-discard" style="
          padding: var(--spacing-sm) var(--spacing-lg);
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
        ">Discard</button>
        <button class="ucd-save" style="
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
        ">Save</button>
      </div>
    `;

    dialog.querySelector('.ucd-cancel')!.addEventListener('click', () => finish('cancel'));
    dialog.querySelector('.ucd-discard')!.addEventListener('click', () => finish('discard'));
    dialog.querySelector('.ucd-save')!.addEventListener('click', () => finish('save'));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish('cancel');
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('cancel');
    };
    document.addEventListener('keydown', onKey);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus cancel (safest default)
    (dialog.querySelector('.ucd-cancel') as HTMLButtonElement)?.focus();
  });
}
