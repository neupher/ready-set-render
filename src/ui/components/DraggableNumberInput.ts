/**
 * DraggableNumberInput Component
 *
 * A number input that supports drag-to-adjust values.
 * Mimics professional 3D software behavior (Unity, Blender, Substance).
 *
 * Drag modes:
 * - Left-click drag on the label area (left side of input)
 * - Middle-mouse drag anywhere on input
 * - Alt + left-click drag anywhere on input
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
  private readonly dragZone: HTMLDivElement;
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

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundPreventMiddleClick = this.preventMiddleClick.bind(this);

    // Create container wrapper
    this.container = document.createElement('div');
    this.container.className = 'draggable-input-container';
    this.container.style.cssText = 'position: relative; display: flex; width: 100%;';

    // Create drag zone (left side for drag interaction)
    this.dragZone = document.createElement('div');
    this.dragZone.className = 'drag-zone';
    this.dragZone.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 50%;
      height: 100%;
      cursor: ew-resize;
      z-index: 1;
    `;

    // Create actual input
    this.input = document.createElement('input');
    this.input.type = 'number';
    this.input.className = `input draggable-input ${options.className ?? ''}`.trim();
    this.input.value = this.formatValue(this.value);
    this.input.style.cssText = 'width: 100%; position: relative;';

    // Assemble
    this.container.appendChild(this.input);
    this.container.appendChild(this.dragZone);

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
    this.dragZone.removeEventListener('mousedown', this.handleDragZoneMouseDown);
    this.input.removeEventListener('mousedown', this.handleInputMouseDown);
    this.input.removeEventListener('change', this.handleInputChange);
    this.input.removeEventListener('blur', this.handleBlur);
    this.input.removeEventListener('auxclick', this.boundPreventMiddleClick);
    this.removeOverlay();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private setupEvents(): void {
    this.handleDragZoneMouseDown = this.handleDragZoneMouseDown.bind(this);
    this.handleInputMouseDown = this.handleInputMouseDown.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    // Drag zone handles left-click drag
    this.dragZone.addEventListener('mousedown', this.handleDragZoneMouseDown);

    // Input handles middle-click and alt+left-click
    this.input.addEventListener('mousedown', this.handleInputMouseDown);
    this.input.addEventListener('change', this.handleInputChange);
    this.input.addEventListener('blur', this.handleBlur);

    // Prevent middle-click paste in some browsers
    this.input.addEventListener('auxclick', this.boundPreventMiddleClick);
  }

  private preventMiddleClick(e: MouseEvent): void {
    if (e.button === 1) {
      e.preventDefault();
    }
  }

  private handleDragZoneMouseDown(e: MouseEvent): void {
    // Left-click on drag zone starts dragging
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      this.startDrag(e.clientX);
    }
  }

  private handleInputMouseDown(e: MouseEvent): void {
    // Middle mouse button (button === 1) or Alt + left-click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      e.stopPropagation();
      this.startDrag(e.clientX);
    }
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
    const newValue = this.startValue + (deltaX * this.step);
    this.setValue(this.clampValue(newValue));
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
