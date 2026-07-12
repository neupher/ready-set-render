# Development Guidelines

> Last Updated: 2026-07-12T15:51:00Z
> Status: Active

## Purpose

This document is a compact reference for the core rules that agents should follow in this repository. It is intentionally shorter than the older policy-heavy version; detailed procedures now live in the skill files under .llms/skills/.

## Core Principles

- Follow the plugin-first architecture unless the task is clearly core infrastructure.
- Keep rendering work aligned with WebGL2 and the project’s Z-up convention.
- Use the existing command-history and undo/redo model for user-visible state changes.
- Prefer small, focused modules and explicit interfaces over broad abstractions.
- Keep the implementation readable and maintainable rather than over-engineered.
- Add or update tests when behavior changes.

## Agent Operating Rules

1. Read root AGENTS.md first, then .llms/PROJECT_CONTEXT.md and .llms/ARCHITECTURE.md.
2. Use the relevant skill file for recurring tasks such as plugins, materials, testing, or workflows.
3. For new systems that become important topics, create or update a project-specific skill file.
4. Keep the workflow triggers in WORKFLOWS.md intact and under human control.
5. Update the active context and relevant documentation when architecture or workflow behavior changes.

## Key References

- AGENTS.md
- .llms/ARCHITECTURE.md
- .llms/COORDINATE_SYSTEM.md
- .llms/TESTING.md
- .llms/WORKFLOWS.md
- .llms/skills/

## Notes for Future Growth

As the project expands into physics, advanced rendering, and more complex material systems, create dedicated skill files when those topics become recurring implementation areas.

