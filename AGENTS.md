# AGENTS

## Purpose
Shared operating notes for human + AI agents working in `Team4sV3`.

## Current Workflow
- Phase: Public Group/Release stabilization and operational hardening
- Priority: reduce manual ops overhead; keep implementation auditable and restartable

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
- Implement one-click anime/group asset folder provisioning with idempotency, clear validation, and operator-safe errors.
