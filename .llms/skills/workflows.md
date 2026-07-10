# Workflows Skill

> Last Updated: 2026-07-10T12:00:00Z

## Purpose

Use this skill when a workflow trigger is invoked or when session-level documentation needs to be updated.

## When to Use It

Use this skill for tasks such as:

- start session
- save session
- update context
- finalise session
- add feature

## Relevant Files

- WORKFLOWS.md
- PROJECT_CONTEXT.md
- ARCHITECTURE.md
- CHANGELOG.md

## Key Constraints

- Preserve the human-controlled workflow model.
- Keep workflow triggers recognizable and stable.
- Prefer lightweight handoff updates over verbose auto-generated summaries.
- When the task changes scope, update the relevant context files and the workflow reference.

## Checklist

- [ ] Confirm which workflow was requested
- [ ] Review the current state before making changes
- [ ] Update the relevant context or planning files
- [ ] Keep the workflow behavior predictable and explicit
