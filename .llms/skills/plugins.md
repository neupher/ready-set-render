# Plugins Skill

> Last Updated: 2026-07-10T12:00:00Z

## Purpose

Use this skill when adding a new plugin-based feature such as a renderer, importer, primitive, tool, or scene operation.

## When to Use It

Use this skill for tasks such as:

- adding a new renderer or render pipeline
- adding an importer/exporter
- introducing a new scene tool or editor capability
- registering a new plugin in the existing plugin system

## Relevant Files

- src/plugins/
- src/core/PluginManager.ts
- ARCHITECTURE.md

## Key Constraints

- Prefer plugin registration over direct core modifications.
- Keep plugin responsibilities narrow and composable.
- Follow existing plugin naming and folder conventions.
- Make the feature testable in isolation where practical.

## Checklist

- [ ] Confirm the feature is appropriate as a plugin
- [ ] Add the implementation in the correct plugin folder
- [ ] Register it through the plugin system
- [ ] Add or update tests
- [ ] Document any new integration points
