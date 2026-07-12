# AGENTS

> Last Updated: 2026-07-12T15:51:00Z
> Status: Active

## Purpose

This file is the primary entry point for agents working in this repository. Read it first before making architectural, rendering, or workflow-related changes.

## First Reads

When starting a session, review these documents in order:

1. AGENTS.md
2. .llms/PROJECT_CONTEXT.md
3. .llms/ARCHITECTURE.md
4. .llms/TESTING.md
5. .llms/WORKFLOWS.md

## Core Rules

- Follow the plugin-first architecture unless the task is clearly core infrastructure.
- Prefer small, focused modules and explicit interfaces over broad abstractions.
- Use the existing command-history and undo/redo model for user-visible data changes.
- Keep rendering work aligned with WebGL2 and the project’s Z-up coordinate convention.
- Add or update tests whenever behavior changes.
- Preserve the human-controlled workflow model from .llms/WORKFLOWS.md.

## Project-Specific Guidance

- New features should generally be implemented as plugins where appropriate.
- New systems that become recurring topics should be documented as skill files under .llms/skills/.
- Keep guidance concise and actionable; avoid duplicating long historical plans in the active entrypoint.

## Skill Files

Use these skill files for the most important recurring tasks. Read the relevant skill file before implementing or changing behavior in that area.

- .llms/skills/architecture.md — architecture decisions, subsystem boundaries, and core structure changes.
- .llms/skills/plugins.md — new plugins, renderer/importer/tool/plugin integration, and plugin registration.
- .llms/skills/materials.md — materials, shaders, uniforms, and material/rendering integration.
- .llms/skills/testing.md — test coverage, regression checks, and validation of new behavior.
- .llms/skills/workflows.md — session-level workflow triggers, session handoff, and context updates.

## How to Use Skill Files

1. Start at root `AGENTS.md`.
2. Choose the skill file that matches the task.
3. Read the skill file’s purpose, constraints, and checklist.
4. Apply the relevant guidance while working in the repository.
5. If the task becomes a recurring area, update or add a new skill file.

## Creating New Skills

When a topic becomes important enough to recur, create or update a skill file using the same pattern:

- Purpose
- When to use it
- Relevant files
- Key constraints
- Verification checklist

Examples of topics that may warrant future skills include physics systems, advanced rendering passes, and performance profiling.
