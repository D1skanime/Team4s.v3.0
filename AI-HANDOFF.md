# AI-HANDOFF.md

## Purpose

This file defines the permanent handoff workflow for AI coding agents working on Team4s.

It applies equally to:

- Claude / Claude Code
- Codex
- OpenCode
- other future coding agents used for repository work

The purpose is to minimize repeated discussion, planning, token usage and duplicated analysis while keeping implementation controlled and auditable.

This workflow is binding whenever an external phase artifact such as `XXX-CONTEXT.md`, `XXX-PLAN.md` or `XXX-UAT-GAPS.md` is provided.

---

# 1. Core Principle

External handoff artifacts are authoritative inputs.

An agent must not repeat work that has already been completed externally.

In particular:

- do not reopen an already completed product discussion,
- do not repeat research unless explicitly requested,
- do not create a new plan when a binding plan was supplied,
- do not reinterpret UAT gaps into a different scope,
- do not expand the phase with unrelated improvements.

The agent's primary role after handoff is technical execution, verification and repository integration.

---

# 2. Artifact Types

## `XXX-CONTEXT.md`

A `CONTEXT` file contains the completed product/architecture discussion and binding decisions for a phase.

When a `XXX-CONTEXT.md` is supplied:

1. Resolve the canonical GSD phase directory.
2. Store the file there using the expected phase filename.
3. Treat all documented decisions as binding.
4. Do not run the discussion phase again.
5. Perform only the next explicitly requested workflow step.

Typical next step:

```text
Research-only
```

If the installed GSD version does not provide a standalone research command, use the official research-only mode of that installed version.

Do not continue automatically into planning unless explicitly instructed.

---

## `XXX-PLAN.md` or supplied GSD phase plans

A supplied plan is authoritative for implementation scope.

When a plan is supplied:

1. Read the plan and current repository state.
2. Do not create a replacement plan.
3. Do not reopen product discussion.
4. Do not repeat broad research unless a plan task explicitly requires targeted technical investigation.
5. Execute the supplied plan.
6. Add or update tests required by the plan.
7. Run the required verification.
8. Commit and push the completed work when instructed.

If implementation reveals a genuine contradiction with the supplied plan or binding context:

```text
STOP
REPORT THE CONFLICT
DO NOT SILENTLY CHANGE THE DESIGN
```

---

## `XXX-UAT-GAPS.md`

A UAT-GAPS file contains issues found during live testing after implementation.

It is not a new feature discussion.

When a `XXX-UAT-GAPS.md` file is supplied:

1. Use the current committed/pushed implementation as the baseline.
2. Read the relevant phase context and implementation only as needed.
3. Work exclusively on the documented gaps.
4. Do not reopen phase discussion.
5. Do not run broad phase research again.
6. Do not re-plan the entire phase.
7. Diagnose each gap technically.
8. Implement the smallest correct fix.
9. Add regression tests where appropriate.
10. Run verification.
11. Commit and push the fixes when instructed.

Do not use a gap pass as an opportunity to:

- redesign unrelated components,
- refactor unrelated code,
- add new features,
- alter already approved product behavior,
- expand the phase scope.

If a reported UAT gap conflicts with the binding phase context or would require a new product decision:

```text
STOP THAT GAP
REPORT THE CONFLICT
CONTINUE ONLY WITH INDEPENDENT NON-CONFLICTING GAPS
```

unless the user explicitly instructs otherwise.

---

# 3. Standard Workflow

The preferred Team4s workflow is:

```text
Discussion / product decisions
        ↓
performed externally
        ↓
XXX-CONTEXT.md
        ↓
Agent: Research-only if requested
        ↓
Research reviewed externally
        ↓
Plan created/reviewed externally
        ↓
Agent: Execute
        ↓
Tests + Verification
        ↓
Commit + Push
        ↓
Live UAT
        ↓
XXX-UAT-GAPS.md
        ↓
Agent: Gap Execute only
        ↓
Regression Tests + Verification
        ↓
Commit + Push
        ↓
Repeat UAT if necessary
```

Claude, Codex, OpenCode and future coding agents must follow the same handoff semantics.

The agent may change between workflow steps.

The artifacts, Git state and documented decisions are the continuity mechanism.

Do not assume that the same agent will perform the next step.

---

# 4. Repository and Git Rules

Before implementation:

- inspect the current branch,
- inspect `git status`,
- ensure the expected phase baseline is present,
- preserve unrelated local work,
- do not overwrite unrelated changes.

During implementation:

- modify only files required by the assigned scope,
- do not introduce opportunistic unrelated refactors,
- preserve existing architecture unless the approved plan explicitly changes it.

After implementation:

- run required tests,
- run phase verification,
- inspect the resulting diff,
- commit only intended files,
- push when explicitly part of the assignment.

Never silently discard local changes.

Never use destructive Git operations merely to simplify the working tree.

---

# 5. Scope Discipline

The following hierarchy is binding:

```text
PROJECT / REQUIREMENTS
        ↓
Phase CONTEXT
        ↓
Approved RESEARCH conclusions
        ↓
Approved PLAN
        ↓
UAT-GAPS
```

Lower-level artifacts may refine implementation detail but must not silently contradict higher-level product decisions.

A coding agent may independently decide:

- function names,
- local implementation mechanics,
- test structure,
- internal refactoring required to implement the approved design,
- exact SQL/query implementation consistent with the approved architecture.

A coding agent may not independently decide:

- new product behavior,
- new permission semantics,
- changed UX behavior,
- widened phase scope,
- deletion of an approved requirement,
- replacement of a binding architectural decision.

Such conflicts must be reported.

---

# 6. Research Rules

Research exists to answer technical implementation questions, not to repeat product discussion.

Research should be focused on:

- current code paths,
- repository structure,
- existing abstractions,
- relevant persistence schema,
- APIs,
- test coverage,
- security implications,
- performance implications,
- migration constraints.

Research output should identify:

- what already exists,
- what must change,
- risks,
- recommended implementation seams,
- conflicts with binding context, if any.

Do not spend tokens restating the complete phase context.

Reference the relevant decision ID or section instead.

Example:

```text
D03 is implementable through the existing permission service by...
```

instead of repeating the complete D03 discussion.

---

# 7. Execute Rules

When the assignment is Execute:

Do:

- read the approved artifacts,
- implement them,
- test them,
- verify them,
- commit,
- push if instructed.

Do not:

- restart Discussion,
- redo Research without necessity,
- replace the supplied plan,
- broaden scope,
- produce speculative future designs.

Targeted code investigation during Execute is allowed when necessary to implement a plan task.

That does not constitute a new Research phase.

---

# 8. UAT Gap Rules

Every UAT gap should be treated as a concrete regression or acceptance failure.

A gap specification may include:

```text
Gap ID
Observed behavior
Expected behavior
Affected viewport / resource / workflow
Evidence
Likely code area
Acceptance criteria
Regression constraints
Required tests
```

The executor must preserve these acceptance criteria.

If root-cause analysis shows the stated likely code area is wrong, the agent may fix the actual root cause.

The acceptance behavior remains binding.

---

# 9. Token-Efficiency Rules

For handoff work, minimize conversational overhead.

Do not produce long progress explanations unless they contain a real finding or blocker.

Avoid:

- restating the supplied artifact,
- narrating every command,
- re-explaining known architecture,
- repeating previous summaries,
- generating a new discussion summary before implementation.

Prefer short status updates such as:

```text
Status: executing
Finding: existing resolver can support D03 without a parallel service.
```

or:

```text
Blocked: D07 references a management capability that does not exist in the canonical catalog.
Need decision before implementation.
```

---

# 10. Completion Report

After Research, Execute or Gap Execute, the final report should be concise.

Preferred format:

```text
Status: completed | partial | blocked

Phase:
<phase number / name>

Work:
- concise list of completed work

Tests:
- commands / suites
- pass/fail status

Verification:
- result

Commits:
- commit hashes

Push:
- branch / remote status

Conflicts or deviations:
- none
```

Only include longer explanation when there is a blocker, architectural conflict, failed verification or material deviation.

---

# 11. Agent Interchangeability

No workflow step may depend on hidden context from a particular agent session.

Anything required by a later agent must be preserved in one of:

- Git commits,
- `.planning`,
- `XXX-CONTEXT.md`,
- `XXX-RESEARCH.md`,
- approved plans,
- `XXX-UAT-GAPS.md`,
- other explicitly documented project artifacts.

Do not rely on:

- private chat memory,
- unstored scratch notes,
- assumptions that a previous agent will resume the work.

A different agent must be able to continue from the repository and handoff artifacts alone.

---

# 12. Conflict Rule

If an agent discovers a technical conflict with a binding decision:

1. verify the conflict against current code,
2. isolate the exact decision or acceptance criterion affected,
3. do not silently substitute another behavior,
4. report the conflict concisely,
5. stop only the affected work,
6. continue independent work when safe and explicitly allowed.

Required conflict report format:

```text
Conflict:
<decision / plan item / gap>

Current code reality:
<concise technical fact>

Why they conflict:
<concise explanation>

Options:
<implementation options without choosing a new product decision>
```

---

# 13. Default Handoff Commands

After this file is installed in the repository, the user may use short instructions.

Examples:

```text
Phase 138 CONTEXT attached.
Use standard handoff.
Research-only.
```

```text
Phase 138 plan attached.
Use standard handoff.
Execute, verify, commit and push.
```

```text
138-UAT-GAPS.md attached.
Use standard handoff.
Gap Execute only, verify, commit and push.
```

The agent must expand these short instructions according to this `AI-HANDOFF.md` workflow.

---

# 14. Final Principle

Team4s uses AI agents as interchangeable technical executors around persistent project artifacts.

The workflow should optimize for:

- correct implementation,
- reproducibility,
- minimal duplicated reasoning,
- low token overhead,
- explicit scope,
- auditable decisions,
- safe handoff between agents.
