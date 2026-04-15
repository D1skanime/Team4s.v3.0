# RISKS

## Top 3 Risks

### 1. Today's create-side provider-asset follow-through could be pushed without fresh verification
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** the worktree now extends the Phase-15 create seam so remote-selected non-cover assets persist through save, but local automated verification was blocked by sandbox/network limits.
- **Mitigation:** record the lack of fresh verification clearly, run one browser smoke first tomorrow, and re-run targeted tests in an environment that can fetch Go modules and spawn frontend helpers.

### 2. Provider provenance for imported backgrounds can drift if `provider_key` handling is incomplete
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** the current follow-through now preserves provider identity for uploaded backgrounds, but that only helps if the provider key survives the whole create path consistently.
- **Mitigation:** verify the persisted create result with a remote background picked from the chooser and keep `provider_key` propagation limited to the documented create/upload seam.

### 3. Root instructions can send tomorrow into the wrong thread if stale notes are trusted over the real baseline
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** older root notes still pointed at edit-route relation UX even though `main` already moved through Phase 14 and Phase 15, which makes the resume point easy to misread.
- **Mitigation:** trust the refreshed handoff files plus `.planning/STATE.md`, and keep all work in `C:\Users\admin\Documents\Team4s` with the documented runtime commands from `STATUS.md`.

## Current Blockers
- No product blocker on the current `main` baseline.
- Verification blocker: sandboxed local runs could not complete Go module downloads or Vitest helper spawn, so today's work remains unverified here.
- Process blocker: no independent reviewer CLI for true `$gsd-review`.
