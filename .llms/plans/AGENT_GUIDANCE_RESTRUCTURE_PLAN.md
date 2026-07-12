# Agent Guidance Restructure Plan

> Last Updated: 2026-07-10T12:00:00Z
> Status: Proposed

## Goal

Transform the existing guidance set in the .llms folder into a more modern, agent-friendly structure that is easier to scan, easier to maintain, and better aligned with the conventions used by AGENTS.md, SKILLS, and similar agent-oriented instruction systems.

The new structure should preserve the project’s current intent, including the human-controlled workflow model from WORKFLOWS.md, while reducing duplication, removing stale procedural detail, and making the guidance more actionable for future agents.

---

## Problems with the Current Structure

The current .llms guidance is valuable, but it mixes several concerns in ways that make it harder for agents to use efficiently:

- The guidance is too broad and too long for a single entrypoint.
- The same ideas appear in multiple files with different levels of detail.
- Historical plans, implementation notes, and active guidance are not clearly separated.
- The guidance is oriented around verbose policy language instead of concise operational instructions.
- The workflow layer is powerful, but it is embedded in a long document and does not clearly point to a cleaner source of truth.

The result is that agents must read too much before they can act confidently.

---

## Target Model

Adopt a layered structure with a small, high-signal entrypoint and a few focused supporting documents.

### 1. AGENTS.md as the Primary Entry Point

Create a concise top-level AGENTS.md file that serves as the main instruction surface for agents.

It should contain:

- The project mission and scope
- The most important architectural constraints
- The core rules that must never be violated
- The most important files to read first
- Short pointers to specialized guidance files

This file should be short enough to be read quickly and should not duplicate long implementation histories.

### 2. Skill-Based Documents for Repeated Work

Split operational guidance into focused skill documents that map to common agent tasks.

Suggested skill areas:

- Architecture skill
- Testing skill
- Plugin implementation skill
- Asset system skill
- Workflow / session management skill

Each skill document should follow a consistent structure:

- When to use this skill
- Inputs and context needed
- Required steps
- Common pitfalls
- Verification checklist

This format is much easier for agents to follow than a single long policy document.

### 3. Context Documents as Reference Material

Keep a small set of reference documents for background context, such as:

- PROJECT_CONTEXT.md for current status and active priorities
- ARCHITECTURE.md for structural conventions
- COORDINATE_SYSTEM.md for domain-specific rules
- TESTING.md for verification expectations

These documents should be reference-oriented rather than procedural.

### 4. Archive for Historical Plans

Move older or superseded implementation plans into an archive section.

This keeps the active guidance clean while preserving historical context for later review.

---

## Proposed File Structure

A modern structure could look like this:

```text
.llms/
  AGENTS.md                  # primary agent entrypoint
  PROJECT_CONTEXT.md         # current project status and priorities
  ARCHITECTURE.md            # architectural reference
  COORDINATE_SYSTEM.md       # domain-specific rules
  TESTING.md                 # verification expectations
  WORKFLOWS.md               # lightweight workflow catalog and triggers
  skills/
    architecture.md
    testing.md
    plugins.md
    asset-system.md
    workflows.md
  archive/
    historical-plans.md
```

This structure preserves the useful information already present while making it much easier for an agent to know where to look first.

---

## Content Migration Strategy

### Phase 1: Define the New Source of Truth

- Keep AGENTS.md as the top-level authoritative document for general instructions.
- Keep PROJECT_CONTEXT.md and ARCHITECTURE.md as the main reference documents for project state and structure.
- Move long historical planning documents to archive.

### Phase 2: Convert the Current Guidelines into a Modern Format

The existing GUIDELINES.md should be rewritten into a shorter, more structured form.

Instead of long mandatory prose, it should be organized into:

- Core principles
- Hard constraints
- Preferred patterns
- Common exceptions
- Verification expectations

This keeps the same intent but makes the guidance easier to scan and follow.

### Phase 3: Convert Repeated Procedures into Skills

Procedural guidance should be moved out of general documentation and into skill files.

Examples:

- Adding a new plugin -> plugin skill
- Writing or updating tests -> testing skill
- Handling architecture changes -> architecture skill
- Managing session and handoff workflows -> workflow skill

This reduces duplication and keeps each document focused.

### Phase 4: Reduce Verbosity and Duplication

Remove repeated admonitions that appear in multiple files.

Each rule should appear once in the most appropriate document, with other files linking to it instead of repeating it.

---

## Workflow Migration Plan

This is the most important compatibility requirement.

The current workflows concept should stay intact, including the idea that the human controls session-length operations by invoking workflow commands such as:

- start session
- save session
- finalise session
- update context
- add feature

### Preserve the Human-Controlled Workflow Model

Do not replace the workflow concept with an automatic or implicit process. The human should remain the one who decides when to trigger the session-level workflow.

That means:

- The agent should still respond to explicit workflow triggers.
- The trigger phrases should remain recognizable and stable.
- The workflow behavior should be predictable and easy to invoke.

### Reorganize the Workflow Layer

Instead of keeping the full workflow procedures in one large file, move them into a dedicated workflow skill and make WORKFLOWS.md a lightweight index.

The new workflow layer should:

- Keep the same trigger phrases and entrypoints
- Provide a short summary of what each workflow does
- Link to the relevant skill or document for the detailed steps
- Preserve the session checkpoint model where the user controls when work is saved, finalised, or resumed

### Recommended Workflow Structure

- WORKFLOWS.md: short trigger catalog with purpose, trigger phrases, and links
- skills/workflows.md: detailed steps for each workflow
- AGENTS.md: one-line reminder that workflow triggers should be honored when explicitly requested

This keeps the behavior intact while making the implementation much cleaner.

---

## Migration Sequence

1. Create AGENTS.md as the new top-level entrypoint.
2. Rewrite GUIDELINES.md into a shorter, principle-based format.
3. Extract repeated procedures into skill documents.
4. Keep PROJECT_CONTEXT.md, ARCHITECTURE.md, and TESTING.md as reference documents.
5. Move old planning material into archive.
6. Rewrite WORKFLOWS.md to be a thin workflow index.
7. Update all references so they point to the new structure.
8. Validate the new layout by asking an agent to follow the flow from AGENTS.md to the appropriate skill and context document.

---

## Definition of Done

The restructure is complete when:

- An agent can understand the project by reading AGENTS.md first.
- The most important rules are discoverable without reading long historical documents.
- Workflow triggers still work and remain under human control.
- The documentation is easier to maintain and less redundant.
- Old implementation plans are clearly separated from active guidance.

---

## Recommended First Step

Start by drafting AGENTS.md and rewriting GUIDELINES.md first. Those two documents will define the shape of the rest of the new structure.
