# Architecture Skill

> Last Updated: 2026-07-10T12:00:00Z

## Purpose

Use this skill when making design-level changes to the editor structure, subsystem boundaries, or integration points.

## When to Use It

Use this skill for tasks such as:

- introducing a new subsystem
- refactoring core services
- deciding whether a feature belongs in core or in a plugin
- updating architecture documentation

## Relevant Files

- ARCHITECTURE.md
- PROJECT_CONTEXT.md
- src/core/
- src/plugins/

## Key Constraints

- Favor small modules with clear responsibilities.
- Keep dependencies explicit and interface-based where possible.
- Preserve plugin-based extensibility.
- Avoid introducing global state unless it is already part of the established architecture.

## Checklist

- [ ] Confirm the change fits the existing architecture
- [ ] Identify affected modules and interfaces
- [ ] Update documentation if the structure changed
- [ ] Verify the change does not break plugin boundaries
