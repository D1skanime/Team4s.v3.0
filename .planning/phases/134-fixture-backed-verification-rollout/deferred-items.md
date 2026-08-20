# Phase 134 — Deferred Items

Out-of-scope issues discovered during execution but not fixed (per the executor's
SCOPE BOUNDARY rule: pre-existing drift unrelated to the current task's own files).

## From Plan 134-05

1. **`.planning/ROADMAP.md`'s `## Progress` table Phase 128 row still reads
   `19/22 In Progress`** even though all 22 `128-*-PLAN.md` checklist entries under
   `### Phase 128` are individually checked `[x]` and the top-level `## Phases`
   checklist marks Phase 128 complete. Plan 134-04's summary claimed "Phases
   128-132 as executed" in the Progress table, but only 129/130/131/132 were
   actually corrected there — Phase 128's row was left stale. Not fixed here:
   verifying the true 128-* plan/summary file counts on disk is unrelated to this
   plan's `files_modified` scope (protected-asset guard + shared-DB reset script).

2. **`gsd-sdk query state.advance-plan` / `state.record-metric` recompute
   `STATE.md`'s frontmatter `progress.completed_phases` from
   `roadmap.ts`'s disk/checklist-derived phase status**, which (due to item 1
   above) currently derives a lower count than the correct value. Both calls
   silently overwrote `completed_phases: 5` back down to `3` during this plan's
   execution; manually corrected back to `5` after each call (not committed as a
   deviation fix to the SDK itself, since the SDK package lives outside this repo).
   `shouldPreserveExistingProgress()` in `state-document.ts` appears intended to
   guard against exactly this kind of regression but did not prevent it in this
   run — worth a future SDK-side investigation, out of scope for an application
   repo plan.

3. **`.planning/REQUIREMENTS.md`'s summary line
   `**Coverage:** 65 Anforderungen definiert, 65 eindeutig zugeordnet, 0 verwaist, 0 doppelt, 65 offen.`**
   still reads `65 offen` (65 open) even though `PMQA-01/02/03/04/06/07` are
   already marked `[x]` Complete. Pre-existing drift (already stale before this
   plan touched `requirements.mark-complete` for PMQA-06); the `mark-complete`
   verb updates the per-requirement checkbox and traceability table row but not
   this summary line. Not fixed here — the counting/regeneration logic for that
   line lives in the SDK, not this plan's files.

## From Plan 134-06

4. **`--focus-ring` (a box-shadow shorthand token, `globals.css`) is misused as an
   outline color in `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css`
   (lines 130 `border-color: var(--focus-ring)`, 135 and 297
   `outline: 2px solid var(--focus-ring)`)** — the exact same root-cause bug fixed
   in this plan for `profile.module.css`/`FocalCarousel.module.css`/
   `AnimeProjectStage.module.css` (all three now use the dedicated `--focus-outline`
   color token instead). `GroupMediaReviewSection` renders only inside
   `/admin/fansubs/[id]/edit`, not `/members/{slug}` — outside this plan's
   member-profile-page blast radius and outside `capture-phase134-uat-evidence.mjs`'s
   captured Tab sequence, so not fixed here. Worth a dedicated follow-up sweep for
   every remaining `var(--focus-ring)` outline/border-color misuse across the admin
   surface.
