/**
 * DraggableNumberInput Component Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DraggableNumberInput } from '@ui/components/DraggableNumberInput';

describe('DraggableNumberInput', () => {
  let input: DraggableNumberInput;
  let onChange: ReturnType<typeof vi.fn<(value: number) => void>>;

  beforeEach(() => {
    onChange = vi.fn<(value: number) => void>();
    input = new DraggableNumberInput({
      value: 5.0,
      step: 0.1,
      precision: 1,
      onChange
    });
  });

  afterEach(() => {
    input.dispose();
  });

  describe('constructor', () => {
    it('should create container element', () => {
      expect(input.element).toBeInstanceOf(HTMLDivElement);
      expect(input.element.classList.contains('draggable-input-container')).toBe(true);
    });

    it('should create input element inside container', () => {
      expect(input.inputElement).toBeInstanceOf(HTMLInputElement);
      expect(input.inputElement.type).toBe('number');
    });

    it('should set initial value', () => {
      expect(input.inputElement.value).toBe('5.0');
    });

    it('should have correct class names on input', () => {
      expect(input.inputElement.classList.contains('input')).toBe(true);
      expect(input.inputElement.classList.contains('draggable-input')).toBe(true);
    });

    it('should use default values when not specified', () => {
      const defaultInput = new DraggableNumberInput();
      expect(defaultInput.getValue()).toBe(0);
    });

    it('should have input element directly in container (no drag zone)', () => {
      // New implementation uses the input directly without a separate drag zone
      expect(input.element.childElementCount).toBe(1);
      expect(input.element.firstChild).toBe(input.inputElement);
    });
  });

  describe('getValue', () => {
    it('should return current value', () => {
      expect(input.getValue()).toBe(5.0);
    });
  });

  describe('setValue', () => {
    it('should update value', () => {
      input.setValue(10.5);
      expect(input.getValue()).toBe(10.5);
      expect(input.inputElement.value).toBe('10.5');
    });

    it('should call onChange by default', () => {
      input.setValue(10.5);
      expect(onChange).toHaveBeenCalledWith(10.5);
    });

    it('should not call onChange when notify is false', () => {
      input.setValue(10.5, false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should respect min constraint', () => {
      const constrainedInput = new DraggableNumberInput({
        value: 5,
        min: 0,
        max: 10
      });
      constrainedInput.setValue(-5);
      expect(constrainedInput.getValue()).toBe(0);
    });

    it('should respect max constraint', () => {
      const constrainedInput = new DraggableNumberInput({
        value: 5,
        min: 0,
        max: 10
      });
      constrainedInput.setValue(15);
      expect(constrainedInput.getValue()).toBe(10);
    });
  });

  describe('input change handling', () => {
    it('should update value on input change', () => {
      input.inputElement.value = '7.5';
      input.inputElement.dispatchEvent(new Event('change'));

      expect(input.getValue()).toBe(7.5);
      expect(onChange).toHaveBeenCalledWith(7.5);
    });

    it('should handle invalid input on blur', () => {
      input.inputElement.value = 'invalid';
      input.inputElement.dispatchEvent(new Event('blur'));

      // Should revert to previous valid value
      expect(input.inputElement.value).toBe('5.0');
    });
  });

  describe('precision', () => {
    it('should format value with specified precision', () => {
      const highPrecision = new DraggableNumberInput({
        value: 3.14159,
        precision: 2
      });
      expect(highPrecision.inputElement.value).toBe('3.14');
    });

    it('should use zero precision for integers', () => {
      const intInput = new DraggableNumberInput({
        value: 42,
        precision: 0
      });
      expect(intInput.inputElement.value).toBe('42');
    });
  });

  describe('custom className', () => {
    it('should include custom class on input', () => {
      const customInput = new DraggableNumberInput({
        className: 'custom-class'
      });
      expect(customInput.inputElement.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('drag functionality', () => {
    it('should default to text cursor (not ew-resize)', () => {
      // New implementation: cursor is 'text' by default, only changes to ew-resize during drag
      // We verify the element doesn't have the 'dragging' class initially
      expect(input.inputElement.classList.contains('dragging')).toBe(false);
    });

    it('should start drag on middle-mouse down', () => {
      input.inputElement.dispatchEvent(new MouseEvent('mousedown', {
        button: 1, // Middle mouse button
        clientX: 100,
        bubbles: true
      }));

      expect(input.element.classList.contains('dragging')).toBe(true);

      // Cleanup - trigger mouseup
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    it('should start drag on Alt + left-click', () => {
      input.inputElement.dispatchEvent(new MouseEvent('mousedown', {
        button: 0, // Left mouse button
        altKey: true,
        clientX: 100,
        bubbles: true
      }));

      expect(input.element.classList.contains('dragging')).toBe(true);

      // Cleanup - trigger mouseup
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    it('should NOT start drag on regular left-click (allows text editing)', () => {
      input.inputElement.dispatchEvent(new MouseEvent('mousedown', {
        button: 0, // Left mouse button without Alt
        altKey: false,
        clientX: 100,
        bubbles: true
      }));

      // Should NOT start dragging - allows normal focus behavior
      expect(input.element.classList.contains('dragging')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up without errors', () => {
      expect(() => input.dispose()).not.toThrow();
    });
  });
});
