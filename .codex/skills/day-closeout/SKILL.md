---
name: "day-closeout"
description: "Project-local end-of-day closeout for Team4s; capture context, update handoff files, and leave a restartable workspace"
metadata:
  short-description: "Close the workday with durable notes, updated handoff files, and a clean restart point"
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning `$day-closeout`.
- Treat all user text after `$day-closeout` as optional context for today's focus, blockers, or special notes.
- If no extra context is provided, infer the closeout from the current repo state and recent worktree changes.

## B. Execution Mode
- Execute directly in the current repository.
- Do not spawn subagents unless the user explicitly asks for delegation.
- Prefer updating existing repo-local handoff files over creating duplicate artifacts.
</codex_skill_adapter>

<objective>
Close the day for `Team4s` with a clean, restartable workspace.

After this skill runs, tomorrow-you or another collaborator should be able to:
- understand what changed today and why,
- see what is done, in progress, and blocked,
- know the first concrete task to pick up next,
- trust that the repo-local handoff files are current.
</objective>

<scope>
Canonical repo root:
- `C:\Users\admin\Documents\Team4s`

Repo-local files to update when present:
- `C:\Users\admin\Documents\Team4s\DAYLOG.md`
- `C:\Users\admin\Documents\Team4s\CONTEXT.md`
- `C:\Users\admin\Documents\Team4s\STATUS.md`
- `C:\Users\admin\Documents\Team4s\TOMORROW.md`
- `C:\Users\admin\Documents\Team4s\RISKS.md`
- `C:\Users\admin\Documents\Team4s\WORKING_NOTES.md`
- `C:\Users\admin\Documents\Team4s\DECISIONS.md`
- `C:\Users\admin\Documents\Team4s\TODO.md`
- `C:\Users\admin\Documents\Team4s\AGENTS.md` only if operating instructions genuinely changed
- `C:\Users\admin\Documents\Team4s\YYYY-MM-DD - day-summary.md`

Update only repo-local files for this workflow.
</scope>

<hard_rules>
1. Never write outside `C:\Users\admin\Documents\Team4s` for this skill.
2. Never run `git init`.
3. Never delete or overwrite unrelated user work just to make the closeout tidy.
4. If a handoff file is missing, create it only if it is clearly part of the current repo convention.
5. Keep entries concrete, current, and short enough to scan quickly.
6. The first task in `TOMORROW.md` must be a single concrete action that should take 15 minutes or less.
7. If you make code changes while closing out, mention them explicitly in the closeout notes.
</hard_rules>

<process>
## 1. Capture today's scope
- Inspect current repo state, touched files, open work threads, and active phase/milestone context.
- Identify:
  - today's focus,
  - the main workstreams touched,
  - intended goals vs. achieved outcomes,
  - key problems solved,
  - key problems still open.

## 2. Update the day log
- Create or append `DAYLOG.md`.
- Add a dated entry for today with:
  - focus,
  - accomplishments,
  - decisions,
  - blockers,
  - next step.

## 3. Write the daily summary
- Create or update `YYYY-MM-DD - day-summary.md`.
- Include:
  - what changed today,
  - why it changed,
  - what was verified,
  - what still needs human testing or follow-up,
  - what should happen next.

## 4. Refresh core handoff files
- Update `CONTEXT.md` with the current state of the project and active thread.
- Update `STATUS.md` with the current phase, what works, what is in progress, and valid run/test commands.
- Update `WORKING_NOTES.md` with useful scratch context, partial findings, or mental unload notes worth keeping.
- Update `RISKS.md` with the top current risks, blockers, and mitigations.
- Update `TOMORROW.md` with:
  - top 3 priorities,
  - the first 15-minute task,
  - dependencies to unblock early.
- Update `DECISIONS.md` if any decision made today would otherwise be re-litigated.
- Update `TODO.md` if next steps or backlog direction materially changed.

## 5. Keep the repo restartable
- Check that any commands referenced in `STATUS.md` still match the repo.
- Note whether Docker/services are expected to be running or need restart.
- If the current workspace has important dirty changes, record that clearly in the handoff.

## 6. Optional git closeout
- If the user explicitly asked for commit/push, do that separately.
- Otherwise, do not create surprise commits just because closeout ran.

## 7. Return a closeout report
- End with a short checklist-style handoff summary:
  - updated files,
  - notable risks,
  - first task tomorrow,
  - any blockers that prevented a full closeout.
</process>

<quality_bar>
Good closeout means tomorrow-you does not need to rediscover:
- what the current phase is,
- what just changed,
- why a choice was made,
- where to resume,
- what is risky right now.

If a note would answer “why is it like this?” tomorrow, write it today.
</quality_bar>

<example_invocations>
- `$day-closeout`
- `$day-closeout focus on anime create flow, jellyfin preview fixes, and admin overview follow-up`
</example_invocations>
