# Materials Skill

> Last Updated: 2026-07-10T12:00:00Z

## Purpose

Use this skill when working with materials, shader selection, shader assets, uniforms, or material-driven rendering behavior.

## When to Use It

Use this skill for tasks such as:

- adding or updating material asset support
- changing shader selection logic
- wiring uniforms into rendering
- improving material editor behavior

## Relevant Files

- src/core/assets/
- src/plugins/renderers/
- src/ui/

## Key Constraints

- Keep material behavior aligned with the asset system.
- Preserve shader/material compatibility and editor integration.
- Prefer explicit parameter handling over hidden coupling.
- If the change affects user-visible data, ensure it flows through the existing command system.

## Checklist

- [ ] Confirm the change affects materials, shaders, or rendering parameters
- [ ] Trace the relevant asset and renderer integration points
- [ ] Keep the implementation consistent with the existing editor workflow
- [ ] Add or update tests where practical
