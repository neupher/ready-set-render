# Light System Refactoring Plan

> **Created:** 2026-01-23T23:55:00Z

## Overview

This document outlines the changes needed to fix the directional light system and add proper property panel support.

## Issues to Fix

1. **Light direction tied to camera** - Direction should come from entity transform rotation
2. **No light properties in UI** - Need Light section in PropertiesPanel
3. **Single light support** - Renderer needs multi-light support
4. **No debug visualization** - Need light gizmos like Blender
5. **Sphere properties not exposed** - segments, rings, radius need UI controls

## Architecture Changes

### 1. Light Direction from Transform

Current flow:
```
DirectionalLight.direction (stored in component)
         ↓
LightManager.getActiveLights()
         ↓
ForwardRenderer.getLightData()
```

New flow:
```
DirectionalLight.transform.rotation (Euler angles)
         ↓
getWorldDirection() (computed from rotation)
         ↓
LightManager.getActiveLights()
         ↓
ForwardRenderer.getLightData()
```

**Key Change**: Remove `direction` from ILightComponent. Instead, compute direction from entity transform rotation using standard forward vector.

### 2. PropertiesPanel - Light Section

Add handling for `light` component type:
- Color (color picker)
- Intensity (draggable number input, 0-10)
- Enabled (checkbox/toggle)
- Light Type (read-only display)

### 3. PropertyChangeHandler - Light Support

Add `light` to component routing:
- `light.color`
- `light.intensity`
- `light.enabled`

### 4. Multi-Light Support

Update ForwardRenderer GLSL:
- Array of light directions: `uniform vec3 uLightDirections[MAX_LIGHTS]`
- Array of light colors: `uniform vec3 uLightColors[MAX_LIGHTS]`
- Light count: `uniform int uLightCount`
- Loop over lights in fragment shader

### 5. Debug Visualization

Create `LightGizmoRenderer`:
- Rendered when light entity is selected
- Shows direction arrow with light color
- Sun icon in scene

### 6. Sphere Properties in PropertiesPanel

Add `sphereParams` component or detect Sphere entities and show:
- Segments (integer, 8-64)
- Rings (integer, 4-32)
- Radius (float, 0.1-10)

**Note**: Changing these would require mesh regeneration - may want read-only initially.

## Files to Modify

1. `src/core/interfaces/ILightComponent.ts` - Remove direction, add getWorldDirection concept
2. `src/plugins/lights/DirectionalLight.ts` - Compute direction from rotation
3. `src/ui/panels/PropertiesPanel.ts` - Add Light section
4. `src/core/PropertyChangeHandler.ts` - Add light property handling
5. `src/plugins/renderers/forward/ForwardRenderer.ts` - Multi-light support
6. `src/core/LightManager.ts` - Update to support new direction model

## Files to Create

1. `src/plugins/renderers/debug/LightGizmoRenderer.ts` - Light visualization
2. `src/core/interfaces/ISphereComponent.ts` - Sphere params component (optional)

## Implementation Order

1. Fix direction computation (DirectionalLight)
2. Add light properties to PropertiesPanel
3. Add light property handling to PropertyChangeHandler
4. Add multi-light support to ForwardRenderer
5. Add debug visualization
6. Expose Sphere properties
