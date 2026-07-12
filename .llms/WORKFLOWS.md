# Workflows

> Last Updated: 2026-07-12T16:05:00Z
> Status: Active

## Purpose

This file is a lightweight index of the session-level workflows used by this project. The human remains in control of when these workflows are invoked.

## Supported Workflows

### Start Session

Triggers:
- start session
- new session
- begin work

Use this workflow when a new agent session begins. The agent should:

1. Read root AGENTS.md and .llms/PROJECT_CONTEXT.md
2. Review the current architecture and active priorities
3. Summarize the state and ask what should be worked on next

### Save Session

Triggers:
- save session
- save progress

Use this workflow to preserve progress without committing. The agent should:

1. Review the changed files
2. Update the relevant context documents
3. Note the current state for the next session

### Update Context

Triggers:
- update context
- sync context

Use this workflow when architecture, project status, or implementation details have changed. The agent should:

1. Review the current codebase and documentation
2. Update PROJECT_CONTEXT.md and related reference files
3. Keep the guidance aligned with the current implementation

### Finalise Session

Triggers:
- finalise session
- finalise version X.X.X
- finalise as X.X.X

Use this workflow when the work is ready to be wrapped up. The agent should:

1. Review the changes and summarize them
2. Update CHANGELOG.md and the relevant .llms files
3. Commit and optionally tag if requested

### Add Feature

Triggers:
- add feature: <name>
- implement feature: <name>
- new feature: <name>

Use this workflow when implementing a new capability. The agent should:

1. Check the architecture and decide whether the feature fits a plugin
2. Follow the relevant skill documents
3. Add tests and update the context if the structure changes

## Detailed Steps

The detailed workflow procedures now live in .llms/skills/workflows.md.

## Planning Documents

Active planning documents live in `.llms/plans/`. Completed plans should be moved to `.llms/archive/` or summarized in `PROJECT_CONTEXT.md`/`CHANGELOG.md`, then removed from active session-start references.

Agents should keep session-start context lean:

1. Link only plans that are still actionable for the current priority.
2. Replace completed-plan links with a one-line completed-work summary.
3. Avoid requiring new sessions to read historical plans unless the user asks or the work directly depends on that history.


1. **Check if forbidden**
   - Review LIBRARIES.md forbidden list
   - If forbidden, STOP and explain why

2. **Evaluate necessity**
   - Can this be implemented manually?
   - Does it serve learning goals?
   - Is it truly needed?

3. **Document in LIBRARIES.md**
   - Complete the library template
   - Add justification
   - List alternatives considered
   - Add timestamp

4. **Request approval** (if >20KB or core)
   - Ask user for approval before proceeding

5. **Install**
   ```bash
   npm install <library-name>
   ```

6. **Update size budget**
   - Recalculate totals in LIBRARIES.md

7. **Confirm**
   - Report installation complete
   - Show updated LIBRARIES.md entry

---

### Run Tests

**Triggers:**
- `run tests`
- `test all`
- `verify tests`

**Steps:**

1. **Run full validation (typecheck + tests)**
   ```bash
   npm run validate
   ```

2. **Report results**
   - Show pass/fail count
   - List any failures with details

3. **If failures exist**
   - Analyze failure reasons
   - Propose fixes
   - Ask user how to proceed:
     - Fix code?
     - Need to modify tests? (requires approval)

---

### Code Review

**Triggers:**
- `review code`
- `code review`
- `check code quality`

**Steps:**

1. **Check for guideline violations**
   - Type-based conditionals
   - Monolithic files (>300 lines)
   - Missing documentation
   - Missing tests

2. **Check PATTERNS.md compliance**
   - File naming
   - Import organization
   - Error handling patterns

3. **Report findings**
   - List all issues found
   - Categorize by severity
   - Suggest fixes

---

### Document Update

**Triggers:**
- `update docs`
- `sync documentation`

**Steps:**

1. **Scan for undocumented code**
   - Find public APIs without JSDoc
   - Find plugins without README

2. **Update missing documentation**
   - Add JSDoc where missing
   - Create plugin READMEs

3. **Update .llms/ files**
   - Sync with current codebase
   - Add timestamps to all updated files

4. **Report**
   - List all documentation added
   - List all files updated

---

## Timestamp Format

All `.llms/*.md` files MUST include a timestamp in this format:

```markdown
> **Last Updated:** YYYY-MM-DDTHH:MM:SSZ
```

Example:
```markdown
> **Last Updated:** 2026-01-21T17:11:00Z
```

The timestamp MUST be updated whenever:
- The file content changes
- A workflow updates the file
- Manual edits are made

---

## Workflow Execution Rules

1. **Always announce workflow start**
   - "Starting [Workflow Name] workflow..."

2. **Report each step**
   - Show what is being done
   - Show results of each step

3. **Handle errors gracefully**
   - If a step fails, report the error
   - Ask user how to proceed
   - Do not silently skip steps

4. **Always confirm completion**
   - Summarize what was done
   - List any pending actions

---

## Related Documents

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Updated by finalise workflow
- [GUIDELINES.md](./GUIDELINES.md) - Rules that workflows enforce
- [LIBRARIES.md](./LIBRARIES.md) - Updated by add library workflow
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Updated by add feature workflow
- [TESTING.md](./TESTING.md) - Test workflow details
