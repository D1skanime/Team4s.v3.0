# AGENTS

## Purpose
Shared operating notes for human + AI agents working in `Team4sV3`.

## Current Workflow
- Phase: v1.1 asset lifecycle hardening
- Priority: extend the verified anime-first V2 upload seam without reintroducing legacy slot-specific behavior

## Working Rules
- Keep decisions durable in `DECISIONS.md` when they may be debated again.
- Keep handoff files current at end of day:
  - `DAYLOG.md`
  - `YYYY-MM-DD - day-summary.md`
  - `CONTEXT.md`
  - `WORKING_NOTES.md`
  - `RISKS.md`
  - `TOMORROW.md`
  - `STATUS.md`
- Prefer documented APIs; avoid relying on undocumented behavior.
- For filesystem changes on media hosts, use project-owned controlled automation.

## Quality Bar
- Changes should be reproducible from repo docs.
- Build/test commands in `STATUS.md` must remain valid.
- First task in `TOMORROW.md` must be concrete and <=15 minutes.

## Current Open Thread
- Plan and implement Phase 07 generic upload and linking on top of the verified Phase-06 anime asset lifecycle seam.
