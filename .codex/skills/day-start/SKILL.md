---
name: "day-start"
description: "Project-local morning briefing for Team4s.v3.0; read repo-local handoff files and produce a concise start plan"
metadata:
  short-description: "Start the day with the latest repo-local context, risks, and first task"
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning `$day-start`.
- Treat all user text after `$day-start` as optional context for today's focus or what to emphasize in the briefing.
- If no extra context is provided, infer the morning briefing from the repo-local handoff files and current git state.

## B. Execution Mode
- Execute directly in the current repository.
- Do not spawn subagents unless the user explicitly asks for delegation.
- Prefer reading repo-local handoff files instead of root-level duplicates outside the repo.
</codex_skill_adapter>

<objective>
Start the day for `Team4s.v3.0` with a concise, actionable briefing.

After this skill runs, the user should know:
- the active phase,
- what was last verified,
- the top risks,
- the exact first task to start with.
</objective>

<scope>
Canonical repo root:
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0`

Canonical files to read when present:
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\TOMORROW.md`
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\RISKS.md`
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\CONTEXT.md`
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\STATUS.md`
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\WORKING_NOTES.md`
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\TODO.md`
- latest `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\YYYY-MM-DD - day-summary.md`

Git checks run only in the repo root above.
</scope>

<hard_rules>
1. Read and report only from the repo-local files above.
2. Ignore duplicate root-level files in `C:\Users\D1sk\Documents\Entwicklung\Opencloud\`.
3. Treat `Team4s.v3.0` as the only valid project root unless the user explicitly says otherwise.
4. Do not edit files as part of the morning briefing unless the user explicitly asks for that.
5. If context files are missing or stale, say so plainly.
</hard_rules>

<process>
## 1. Sync awareness
- Check repo git status in `Team4s.v3.0`.
- Report whether the worktree is clean/dirty and whether there are local commits ahead of remote.

## 2. Read yesterday context
- Load the latest day summary.
- Extract what changed, what was verified, and what remained open.

## 3. Read today context
- Load `TOMORROW.md`, `RISKS.md`, `CONTEXT.md`, `STATUS.md`, `WORKING_NOTES.md`, and `TODO.md`.
- Extract:
  - top priorities,
  - first 15-minute task,
  - active risks,
  - active phase,
  - anything in progress or blocked.

## 4. Return a concise briefing
- Include:
  - sync/worktree status,
  - yesterday recap,
  - today's focus,
  - start-now task,
  - blockers/risks,
  - current branch and dirtiness.
</process>

<quality_bar>
Good briefing means the user can begin working within 5 minutes without reopening half the repo to remember the state.
</quality_bar>

<example_invocations>
- `$day-start`
- `$day-start focus on phase 4 ui follow-up`
</example_invocations>
