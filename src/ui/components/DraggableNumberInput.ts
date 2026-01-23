/**
 * DraggableNumberInput Component
 *
 * A number input that supports drag-to-adjust values.
 * Mimics professional 3D software behavior (Unity, Blender, Substance).
 *
 * Drag modes:
 * - Middle-mouse drag anywhere on input
 * - Alt + left-click drag anywhere on input
 *
 * Click behavior:
 * - Single click focuses the input for text editing
 * - Cursor changes to ew-resize only when dragging starts
 *
 * @example
 * ```ts
 * const input = new DraggableNumberInput({
 *   value: 0,
 *   step: 0.1,
 *   precision: 1,
 *   onChange: (value) => console.log('Value:', value)
 * });
 * container.appendChild(input.element);
 * ```
 */

export interface DraggableNumberInputOptions {
  /** Initial value */
  value?: number;
  /** Step size for drag increments (default: 0.1) */
  step?: number;
  /** Decimal precision for display (default: 1) */
  precision?: number;
  /** Minimum value (optional) */
  min?: number;
  /** Maximum value (optional) */
  max?: number;
  /** Callback when value changes */
  onChange?: (value: number) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Number input with drag-to-adjust functionality.
 * Supports multiple drag modes for better cross-browser compatibility.
 */
export class DraggableNumberInput {
  private readonly container: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private value: number;
  private readonly step: number;
  private readonly precision: number;
  private readonly min: number;
  private readonly max: number;
  private readonly onChange?: (value: number) => void;

  private isDragging = false;
  private startX = 0;
  private startValue = 0;
  private overlay: HTMLDivElement | null = null;

  // Bound handlers for proper cleanup
  private boundHandleInputMouseDown: (e: MouseEvent) => void;
  private boundHandleInputChange: () => void;
  private boundHandleBlur: () => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundPreventMiddleClick: (e: MouseEvent) => void;

  constructor(options: DraggableNumberInputOptions = {}) {
    this.value = options.value ?? 0;
    this.step = options.step ?? 0.1;
    this.precision = options.precision ?? 1;
    this.min = options.min ?? -Infinity;
    this.max = options.max ?? Infinity;
    this.onChange = options.onChange;

    // Bind all handlers
    this.boundHandleInputMouseDown = this.handleInputMouseDown.bind(this);
    this.boundHandleInputChange = this.handleInputChange.bind(this);
    this.boundHandleBlur = this.handleBlur.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundPreventMiddleClick = this.preventMiddleClick.bind(this);

    // Create container wrapper
    this.container = document.createElement('div');
    this.container.className = 'draggable-input-container';
    this.container.style.cssText = 'position: relative; display: flex; width: 100%;';

    // Create actual input - no separate drag zone, we handle it via events
    this.input = document.createElement('input');
    this.input.type = 'number';
    this.input.className = `input draggable-input ${options.className ?? ''}`.trim();
    this.input.value = this.formatValue(this.value);
    this.input.style.cssText = 'width: 100%; position: relative;';

    // Assemble
    this.container.appendChild(this.input);

    this.setupEvents();
  }

  /**
   * Get the root DOM element (container).
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Get the input element directly.
   */
  get inputElement(): HTMLInputElement {
    return this.input;
  }

  /**
   * Get the current numeric value.
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Set the value programmatically.
   */
  setValue(value: number, notify = true): void {
    this.value = this.clampValue(value);
    this.input.value = this.formatValue(this.value);
    if (notify && this.onChange) {
      this.onChange(this.value);
    }
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.input.removeEventListener('mousedown', this.boundHandleInputMouseDown);
    this.input.removeEventListener('change', this.boundHandleInputChange);
    this.input.removeEventListener('blur', this.boundHandleBlur);
    this.input.removeEventListener('auxclick', this.boundPreventMiddleClick);
    this.removeOverlay();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private setupEvents(): void {
    // Input handles middle-click and alt+left-click for dragging
    // Regular left-click allows normal text input focus
    this.input.addEventListener('mousedown', this.boundHandleInputMouseDown);
    this.input.addEventListener('change', this.boundHandleInputChange);
    this.input.addEventListener('blur', this.boundHandleBlur);

    // Prevent middle-click paste in some browsers
    this.input.addEventListener('auxclick', this.boundPreventMiddleClick);
  }

  private preventMiddleClick(e: MouseEvent): void {
    if (e.button === 1) {
      e.preventDefault();
    }
  }

  private handleInputMouseDown(e: MouseEvent): void {
    // Middle mouse button (button === 1) or Alt + left-click starts dragging
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      e.stopPropagation();
      this.startDrag(e.clientX);
    }
    // Regular left-click (button === 0 without alt) allows default behavior (focus input)
  }

  private startDrag(clientX: number): void {
    this.isDragging = true;
    this.startX = clientX;
    this.startValue = this.value;

    this.input.classList.add('dragging');
    this.container.classList.add('dragging');
    this.createOverlay();

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    e.preventDefault();

    const currentX = e.clientX;
    const deltaX = currentX - this.startX;

    // Calculate new value based on total delta from start
    // Use accumulated delta for smooth increments
    const newValue = this.startValue + deltaX * this.step;
    const clampedValue = this.clampValue(newValue);

    // Only update if value actually changed (avoids flickering)
    if (clampedValue !== this.value) {
      this.value = clampedValue;
      this.input.value = this.formatValue(this.value);
      if (this.onChange) {
        this.onChange(this.value);
      }
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;

    this.isDragging = false;

    this.input.classList.remove('dragging');
    this.container.classList.remove('dragging');
    this.removeOverlay();

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private handleInputChange(): void {
    const parsed = parseFloat(this.input.value);
    if (!isNaN(parsed)) {
      this.setValue(parsed);
    }
  }

  private handleBlur(): void {
    // Ensure proper formatting on blur
    const parsed = parseFloat(this.input.value);
    if (isNaN(parsed)) {
      this.input.value = this.formatValue(this.value);
    } else {
      this.setValue(parsed);
    }
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'drag-overlay';
    document.body.appendChild(this.overlay);
  }

  private removeOverlay(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  private formatValue(value: number): string {
    return value.toFixed(this.precision);
  }

  private clampValue(value: number): number {
    return Math.max(this.min, Math.min(this.max, value));
  }
}
