# Testing Skill

> Last Updated: 2026-07-12T15:50:00Z

## Purpose

Use this skill when adding, changing, or validating tests for engine behavior, editor workflows, or rendering-related features.

## When to Use It

Use this skill for tasks such as:

- adding unit tests for a new feature
- covering a regression fix
- validating plugin integration
- checking WebGL-related behavior with the existing test harness

## Relevant Files

- tests/
- vitest.config.ts
- tests/helpers/

## Key Constraints

- Prefer tests that exercise real behavior rather than mock-only behavior.
- Add regression coverage for bugs that are fixed.
- Keep tests focused on observable outcomes.
- For WebGL cache/shader regressions, include cases for multiple shader programs, custom attribute locations, missing attributes, and disposal paths.
- If Vitest/esbuild cannot load config because of sandbox filesystem restrictions, rerun the same command with approval; do not report that as a product test failure.

## Checklist

- [ ] Identify the behavior to verify
- [ ] Add or update tests in the appropriate test folder
- [ ] Run the relevant test suite
- [ ] Fix regressions before declaring the task complete
