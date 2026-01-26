/**
 * TransformGizmoController - Transform Gizmo Interaction Controller
 *
 * Manages the complete gizmo system including:
 * - Mode switching (translate, rotate, scale) via W/E/R keys
 * - Hit testing for axis hover detection
 * - Drag handling for transform manipulation
 * - Undo/redo integration via CommandHistory
 *
 * This is the main entry point for the transform gizmo system.
 *
 * @example
 * ```typescript
 * const controller = new TransformGizmoController({
 *   gl,
 *   eventBus,
 *   sceneGraph,
 *   selectionManager,
 *   commandHistory,
 *   cameraEntity,
 *   canvas,
 * });
 *
 * controller.initialize();
 *
 * // In render loop:
 * controller.render(camera);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { SelectionManager } from '@core/SelectionManager';
import type { CommandHistory } from '@core/commands/CommandHistory';
import { PropertyChangeCommand } from '@core/commands/PropertyChangeCommand';
import type { ICamera, ISceneObject } from '@core/interfaces';
import type { GizmoMode, GizmoAxis, GizmoDragState } from './interfaces';
import { TransformGizmoRenderer } from './TransformGizmoRenderer';
import { TranslateGizmo } from './TranslateGizmo';
import { RotateGizmo } from './RotateGizmo';
import { ScaleGizmo } from './ScaleGizmo';

/**
 * Configuration for TransformGizmoController.
 */
export interface TransformGizmoControllerConfig {
  gl: WebGL2RenderingContext;
  eventBus: EventBus;
  sceneGraph: SceneGraph;
  selectionManager: SelectionManager;
  commandHistory: CommandHistory;
  canvas: HTMLCanvasElement;
}

/**
 * Controller for the complete transform gizmo system.
 */
export class TransformGizmoController {
  private readonly gl: WebGL2RenderingContext;
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly selectionManager: SelectionManager;
  private readonly commandHistory: CommandHistory;
  private readonly canvas: HTMLCanvasElement;

  // Renderer
  private renderer: TransformGizmoRenderer;

  // Gizmo instances (for hit testing)
  private translateGizmo: TranslateGizmo;
  private rotateGizmo: RotateGizmo;
  private scaleGizmo: ScaleGizmo;

  // State
  private mode: GizmoMode = 'translate';
  private hoveredAxis: GizmoAxis = null;
  private dragState: GizmoDragState | null = null;
  private enabled = true;

  // Camera reference for hit testing (set during render)
  private currentCamera: ICamera | null = null;

  // Event handlers (bound for cleanup)
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  constructor(config: TransformGizmoControllerConfig) {
    this.gl = config.gl;
    this.eventBus = config.eventBus;
    this.sceneGraph = config.sceneGraph;
    this.selectionManager = config.selectionManager;
    this.commandHistory = config.commandHistory;
    this.canvas = config.canvas;

    // Create renderer
    this.renderer = new TransformGizmoRenderer({
      gl: this.gl,
      eventBus: this.eventBus,
    });

    // Create gizmo instances
    this.translateGizmo = new TranslateGizmo();
    this.rotateGizmo = new RotateGizmo();
    this.scaleGizmo = new ScaleGizmo();

    // Bind event handlers
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Initialize the gizmo controller.
   */
  initialize(): void {
    this.renderer.initialize();

    // Add event listeners
    this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
    this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
    window.addEventListener('mouseup', this.boundOnMouseUp);
    window.addEventListener('keydown', this.boundOnKeyDown);

    console.log('Transform gizmo controller initialized');
  }

  /**
   * Render the gizmo for the current selection.
   */
  render(camera: ICamera): void {
    if (!this.enabled) return;

    this.currentCamera = camera;

    // Get primary selected entity
    const selected = this.selectionManager.getPrimary();
    if (!selected) return;

    // Skip Camera and Light entities - they have their own gizmos
    if (this.shouldSkipEntity(selected)) return;

    // Get entity position
    const position = selected.transform.position;

    // Render gizmo
    this.renderer.render(
      camera,
      [...position] as [number, number, number],
      this.mode,
      this.hoveredAxis
    );
  }

  /**
   * Get the current gizmo mode.
   */
  getMode(): GizmoMode {
    return this.mode;
  }

  /**
   * Set the gizmo mode.
   */
  setMode(mode: GizmoMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.hoveredAxis = null;
      this.eventBus.emit('gizmo:modeChanged', { mode });
    }
  }

  /**
   * Check if the gizmo is currently dragging.
   */
  isDragging(): boolean {
    return this.dragState?.active ?? false;
  }

  /**
   * Enable or disable the gizmo.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelDrag();
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.boundOnMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundOnMouseDown);
    window.removeEventListener('mouseup', this.boundOnMouseUp);
    window.removeEventListener('keydown', this.boundOnKeyDown);

    this.renderer.dispose();
  }

  /**
   * Handle mouse move for hover detection and dragging.
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || !this.currentCamera) return;

    const mousePos = this.getCanvasMousePosition(event);

    if (this.dragState?.active) {
      // Update drag
      this.updateDrag(mousePos);
    } else {
      // Update hover
      this.updateHover(mousePos);
    }
  }

  /**
   * Handle mouse down to start dragging.
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled || !this.currentCamera) return;

    // Only handle left mouse button
    if (event.button !== 0) return;

    // Check if we have a hovered axis
    if (this.hoveredAxis === null) return;

    // Get selected entity
    const selected = this.selectionManager.getPrimary();
    if (!selected || this.shouldSkipEntity(selected)) return;

    // Start drag
    const mousePos = this.getCanvasMousePosition(event);
    this.startDrag(selected, mousePos);

    // Prevent default to avoid text selection
    event.preventDefault();
  }

  /**
   * Handle mouse up to end dragging.
   */
  private onMouseUp(_event: MouseEvent): void {
    if (this.dragState?.active) {
      this.endDrag();
    }
  }

  /**
   * Handle key down for mode switching (W/E/R).
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't handle if typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'w':
        this.setMode('translate');
        event.preventDefault();
        break;
      case 'e':
        this.setMode('rotate');
        event.preventDefault();
        break;
      case 'r':
        this.setMode('scale');
        event.preventDefault();
        break;
    }
  }

  /**
   * Update hover state based on mouse position.
   */
  private updateHover(mousePos: [number, number]): void {
    const selected = this.selectionManager.getPrimary();
    if (!selected || !this.currentCamera || this.shouldSkipEntity(selected)) {
      this.hoveredAxis = null;
      return;
    }

    // Get ray from mouse position
    const ray = this.screenToRay(mousePos);
    if (!ray) {
      this.hoveredAxis = null;
      return;
    }

    // Get gizmo position and scale
    const position = [...selected.transform.position] as [number, number, number];
    const scale = this.calculateGizmoScale(position);

    // Get current gizmo for hit testing
    const gizmo = this.getGizmoForMode(this.mode);
    if (!gizmo) {
      this.hoveredAxis = null;
      return;
    }

    // Perform hit test
    const hit = gizmo.hitTest(ray.origin, ray.direction, position, scale);
    this.hoveredAxis = hit?.axis ?? null;
  }

  /**
   * Start a drag operation.
   */
  private startDrag(entity: ISceneObject, mousePos: [number, number]): void {
    if (!this.currentCamera || this.hoveredAxis === null) return;

    const position = [...entity.transform.position] as [number, number, number];
    const ray = this.screenToRay(mousePos);
    if (!ray) return;

    // Get hit point for drag start
    const scale = this.calculateGizmoScale(position);
    const gizmo = this.getGizmoForMode(this.mode);
    if (!gizmo) return;

    const hit = gizmo.hitTest(ray.origin, ray.direction, position, scale);
    if (!hit) return;

    this.dragState = {
      active: true,
      startMouse: mousePos,
      currentMouse: mousePos,
      startPosition: [...entity.transform.position] as [number, number, number],
      startRotation: [...entity.transform.rotation] as [number, number, number],
      startScale: [...entity.transform.scale] as [number, number, number],
      axis: this.hoveredAxis,
      startIntersection: hit.hitPoint,
    };

    this.eventBus.emit('gizmo:dragStart', {
      entity,
      mode: this.mode,
      axis: this.hoveredAxis,
    });
  }

  /**
   * Update during drag operation.
   */
  private updateDrag(mousePos: [number, number]): void {
    if (!this.dragState?.active || !this.currentCamera) return;

    const selected = this.selectionManager.getPrimary();
    if (!selected) {
      this.cancelDrag();
      return;
    }

    // Get ray from current mouse position
    const ray = this.screenToRay(mousePos);
    if (!ray) return;

    this.dragState.currentMouse = mousePos;

    // Get gizmo position (start position, not current)
    const gizmoPosition = this.dragState.startPosition;
    const gizmo = this.getGizmoForMode(this.mode);
    if (!gizmo) return;

    // Calculate delta
    const delta = gizmo.calculateDragDelta(
      this.dragState,
      ray.origin,
      ray.direction,
      gizmoPosition
    );

    // Apply transform based on mode
    this.applyTransform(selected, delta);
  }

  /**
   * End drag operation and commit changes via CommandHistory.
   */
  private endDrag(): void {
    if (!this.dragState?.active) return;

    const selected = this.selectionManager.getPrimary();
    if (selected) {
      // Create commands for changed properties
      this.commitTransformChanges(selected);
    }

    this.eventBus.emit('gizmo:dragEnd', {
      mode: this.mode,
      axis: this.dragState.axis,
    });

    this.dragState = null;
  }

  /**
   * Cancel drag operation without committing.
   */
  private cancelDrag(): void {
    if (!this.dragState?.active) return;

    // Restore original values
    const selected = this.selectionManager.getPrimary();
    if (selected) {
      selected.transform.position[0] = this.dragState.startPosition[0];
      selected.transform.position[1] = this.dragState.startPosition[1];
      selected.transform.position[2] = this.dragState.startPosition[2];
      selected.transform.rotation[0] = this.dragState.startRotation[0];
      selected.transform.rotation[1] = this.dragState.startRotation[1];
      selected.transform.rotation[2] = this.dragState.startRotation[2];
      selected.transform.scale[0] = this.dragState.startScale[0];
      selected.transform.scale[1] = this.dragState.startScale[1];
      selected.transform.scale[2] = this.dragState.startScale[2];

      this.eventBus.emit('entity:propertyUpdated', {
        id: selected.id,
        property: 'transform',
        entity: selected,
      });
    }

    this.dragState = null;
  }

  /**
   * Apply transform delta to entity (live update during drag).
   */
  private applyTransform(entity: ISceneObject, delta: [number, number, number]): void {
    if (!this.dragState) return;

    switch (this.mode) {
      case 'translate':
        entity.transform.position[0] = this.dragState.startPosition[0] + delta[0];
        entity.transform.position[1] = this.dragState.startPosition[1] + delta[1];
        entity.transform.position[2] = this.dragState.startPosition[2] + delta[2];
        break;

      case 'rotate':
        entity.transform.rotation[0] = this.dragState.startRotation[0] + delta[0];
        entity.transform.rotation[1] = this.dragState.startRotation[1] + delta[1];
        entity.transform.rotation[2] = this.dragState.startRotation[2] + delta[2];
        break;

      case 'scale':
        entity.transform.scale[0] = Math.max(0.01, this.dragState.startScale[0] + delta[0]);
        entity.transform.scale[1] = Math.max(0.01, this.dragState.startScale[1] + delta[1]);
        entity.transform.scale[2] = Math.max(0.01, this.dragState.startScale[2] + delta[2]);
        break;
    }

    // Emit live update event
    this.eventBus.emit('entity:propertyUpdated', {
      id: entity.id,
      property: 'transform',
      entity,
    });
  }

  /**
   * Commit transform changes via CommandHistory.
   */
  private commitTransformChanges(entity: ISceneObject): void {
    if (!this.dragState) return;

    const axes = ['x', 'y', 'z'] as const;
    let propertyPrefix: string;
    let startValues: [number, number, number];
    let endValues: [number, number, number];

    switch (this.mode) {
      case 'translate':
        propertyPrefix = 'position';
        startValues = this.dragState.startPosition;
        endValues = [...entity.transform.position] as [number, number, number];
        break;

      case 'rotate':
        propertyPrefix = 'rotation';
        startValues = this.dragState.startRotation;
        endValues = [...entity.transform.rotation] as [number, number, number];
        break;

      case 'scale':
        propertyPrefix = 'scale';
        startValues = this.dragState.startScale;
        endValues = [...entity.transform.scale] as [number, number, number];
        break;
    }

    // Create commands for each changed axis
    for (let i = 0; i < 3; i++) {
      if (Math.abs(startValues[i] - endValues[i]) > 0.0001) {
        // Temporarily restore old value so command execution works correctly
        switch (this.mode) {
          case 'translate':
            entity.transform.position[i] = startValues[i];
            break;
          case 'rotate':
            entity.transform.rotation[i] = startValues[i];
            break;
          case 'scale':
            entity.transform.scale[i] = startValues[i];
            break;
        }

        const command = new PropertyChangeCommand({
          entityId: entity.id,
          property: `${propertyPrefix}.${axes[i]}`,
          oldValue: startValues[i],
          newValue: endValues[i],
          sceneGraph: this.sceneGraph,
          eventBus: this.eventBus,
        });

        this.commandHistory.execute(command);
      }
    }
  }

  /**
   * Get the gizmo instance for the current mode.
   */
  private getGizmoForMode(mode: GizmoMode): TranslateGizmo | RotateGizmo | ScaleGizmo | null {
    switch (mode) {
      case 'translate':
        return this.translateGizmo;
      case 'rotate':
        return this.rotateGizmo;
      case 'scale':
        return this.scaleGizmo;
      default:
        return null;
    }
  }

  /**
   * Get canvas-relative mouse position.
   */
  private getCanvasMousePosition(event: MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [
      event.clientX - rect.left,
      event.clientY - rect.top,
    ];
  }

  /**
   * Convert screen coordinates to a ray in world space.
   */
  private screenToRay(
    screenPos: [number, number]
  ): { origin: [number, number, number]; direction: [number, number, number] } | null {
    if (!this.currentCamera) return null;

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Convert to normalized device coordinates (-1 to 1)
    const ndcX = (screenPos[0] / width) * 2 - 1;
    const ndcY = 1 - (screenPos[1] / height) * 2;

    // Get inverse view-projection matrix
    const viewProj = this.currentCamera.getViewProjectionMatrix();
    const invViewProj = this.invertMatrix4(viewProj);
    if (!invViewProj) return null;

    // Transform near and far points
    const nearPoint = this.transformPoint([ndcX, ndcY, -1], invViewProj);
    const farPoint = this.transformPoint([ndcX, ndcY, 1], invViewProj);

    // Calculate direction
    const direction: [number, number, number] = [
      farPoint[0] - nearPoint[0],
      farPoint[1] - nearPoint[1],
      farPoint[2] - nearPoint[2],
    ];

    const len = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
    direction[0] /= len;
    direction[1] /= len;
    direction[2] /= len;

    return {
      origin: nearPoint,
      direction,
    };
  }

  /**
   * Calculate gizmo scale for consistent screen size.
   */
  private calculateGizmoScale(position: [number, number, number]): number {
    if (!this.currentCamera) return 1;

    const viewMatrix = this.currentCamera.getViewMatrix();

    // Extract camera position
    const cameraPos: [number, number, number] = [
      -(viewMatrix[0] * viewMatrix[12] + viewMatrix[1] * viewMatrix[13] + viewMatrix[2] * viewMatrix[14]),
      -(viewMatrix[4] * viewMatrix[12] + viewMatrix[5] * viewMatrix[13] + viewMatrix[6] * viewMatrix[14]),
      -(viewMatrix[8] * viewMatrix[12] + viewMatrix[9] * viewMatrix[13] + viewMatrix[10] * viewMatrix[14]),
    ];

    const dx = position[0] - cameraPos[0];
    const dy = position[1] - cameraPos[1];
    const dz = position[2] - cameraPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return distance * 0.15;
  }

  /**
   * Check if entity should be skipped for gizmo rendering.
   */
  private shouldSkipEntity(entity: ISceneObject): boolean {
    // Skip entities that have their own specialized gizmos
    const entityWithComponent = entity as { hasComponent?: (type: string) => boolean };
    if (typeof entityWithComponent.hasComponent === 'function') {
      if (entityWithComponent.hasComponent('camera')) return true;
      if (entityWithComponent.hasComponent('light')) return true;
    }
    return false;
  }

  /**
   * Transform a point by a 4x4 matrix.
   */
  private transformPoint(
    point: [number, number, number],
    matrix: Float32Array
  ): [number, number, number] {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];

    return [
      (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
      (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
      (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
    ];
  }

  /**
   * Invert a 4x4 matrix.
   */
  private invertMatrix4(m: Float32Array): Float32Array | null {
    const out = new Float32Array(16);

    const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
    const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
    const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
    const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];

    const b00 = m00 * m11 - m01 * m10;
    const b01 = m00 * m12 - m02 * m10;
    const b02 = m00 * m13 - m03 * m10;
    const b03 = m01 * m12 - m02 * m11;
    const b04 = m01 * m13 - m03 * m11;
    const b05 = m02 * m13 - m03 * m12;
    const b06 = m20 * m31 - m21 * m30;
    const b07 = m20 * m32 - m22 * m30;
    const b08 = m20 * m33 - m23 * m30;
    const b09 = m21 * m32 - m22 * m31;
    const b10 = m21 * m33 - m23 * m31;
    const b11 = m22 * m33 - m23 * m32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(det) < 1e-10) return null;
    det = 1.0 / det;

    out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * det;
    out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * det;
    out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * det;
    out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * det;
    out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * det;
    out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * det;
    out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * det;
    out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * det;
    out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * det;
    out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * det;
    out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * det;
    out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * det;
    out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * det;
    out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * det;
    out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * det;
    out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * det;

    return out;
  }
}
