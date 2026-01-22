# Workflows: WebGL Editor

> **Last Updated:** 2026-01-21T17:11:00Z
> **Version:** 0.1.0

---

## Purpose

This document defines automated workflows triggered by specific phrases. When Claude (AI assistant) sees these trigger phrases, it MUST execute the corresponding workflow steps.

---

## Workflow Definitions

---

### finalise Session

**Triggers:**
- `finalise session`
- `finalise version X.X.X`
- `finalise as X.X.X`

**Steps:**

1. **Review changes**
   - Run `git status` to identify modified files
   - Run `git diff` to review actual changes
   - Summarize what was accomplished

2. **Update CHANGELOG.md**
   - Version: Use version from trigger phrase, or prompt user if not specified
   - Date: Current date (YYYY-MM-DD)
   - Categories: Added | Changed | Fixed | Removed
   - List all significant changes

3. **Update .llms/ files with timestamps**
   - Update `PROJECT_CONTEXT.md` (ALWAYS)
     - Sync "Current State" section
     - Update "Last Updated" timestamp
     - Update version number
   - Update `IMPLEMENTATION_PLAN.md` (IF APPLICABLE)
     - Mark phases as complete when finished
     - Update bundle size tracking when measured
     - Update success criteria when met
     - Add timestamp only when content changes
   - Update any other affected `.llms/*.md` files
     - Add timestamp to "Last Updated" field
     - Format: `YYYY-MM-DDTHH:MM:SSZ` (ISO 8601)

4. **Commit**
   ```bash
   git add -A
   git commit -m "<title>" -m "<changelog entry summary>"
   ```

5. **Tag** (conditional)
   - IF version specified AND tag does not exist:
     ```bash
     git tag X.X.X
     ```
   - IF tag exists: Skip, notify user

6. **Confirm**
   - Report completion status to user
   - List all files updated
   - Show changelog entry

---

### Start Session

**Triggers:**
- `start session`
- `new session`
- `begin work`

**Steps:**

1. **Read context files**
   ```
   Read .llms/PROJECT_CONTEXT.md
   Read .llms/GUIDELINES.md
   ```

2. **Summarize current state**
   - What was last worked on
   - What is in progress
   - What are the next steps

3. **Confirm ready**
   - Report to user that context is loaded
   - Ask what to work on

---

### Update Context

**Triggers:**
- `update context`
- `sync context`

**Steps:**

1. **Analyze current codebase**
   - Review file structure
   - Check for new modules/plugins
   - Identify any architectural changes

2. **Update PROJECT_CONTEXT.md**
   - Sync directory structure
   - Update current state
   - Update next steps
   - Add timestamp: `YYYY-MM-DDTHH:MM:SSZ`

3. **Update ARCHITECTURE.md** (if needed)
   - Add new modules/plugins
   - Update diagrams
   - Add timestamp

4. **Update LIBRARIES.md** (if new dependencies)
   - Add any new libraries
   - Document justification
   - Add timestamp

5. **Confirm**
   - Report what was updated
   - Show summary of changes

---

### Add Feature

**Triggers:**
- `add feature: <name>`
- `implement feature: <name>`
- `new feature: <name>`

**Steps:**

1. **Check ARCHITECTURE.md**
   - Determine where feature belongs
   - Identify required interfaces

2. **Create plugin structure**
   ```
   src/plugins/<category>/<FeatureName>/
   ├── <FeatureName>.ts
   ├── interfaces/
   └── README.md
   ```

3. **Create test file**
   ```
   tests/plugins/<category>/<FeatureName>.test.ts
   ```

4. **Update ARCHITECTURE.md**
   - Add to module breakdown
   - Update diagrams if needed
   - Add timestamp

5. **Implement feature**
   - Follow PATTERNS.md conventions
   - Follow GUIDELINES.md rules
   - Write tests alongside code

6. **Run tests**
   - Ensure all tests pass
   - If tests fail, iterate until passing

7. **Document**
   - Add JSDoc to public APIs
   - Create plugin README

---

### Add Library

**Triggers:**
- `add library: <name>`
- `install library: <name>`
- `add dependency: <name>`

**Steps:**

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

1. **Run full test suite**
   ```bash
   npm test
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
