---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 06
subsystem: ui
tags: [css, custom-properties, contrast, wcag, live-uat, regression-gate, vitest]

# Dependency graph
requires:
  - phase: 149-01
    provides: "Block A file group 1 fixed (--color-text-muted/--color-text/--color-surface/--color-text-tertiary in admin user tabs, releases page, GroupEdgeNavigation)"
  - phase: 149-02
    provides: "Block A file group 2 fixed (--surface-muted, --accent/--success in FansubEdit, Breadcrumbs two-level dead reference)"
  - phase: 149-03
    provides: "Block A file group 3 fixed (--color-info, --accent-primary-strong, --border-default, --border-soft, --radius)"
  - phase: 149-04
    provides: "PublicNoteCard .head band 45%, roleCatalog.accessibility.test.ts known-gap→real-threshold conversion"
  - phase: 149-05
    provides: "cssCustomProperties guard test with fixture + real-tree proofs"
provides:
  - "Full frontend regression sweep (typecheck/test/lint/build) confirmed green with zero new failures versus the pre-Phase-149 baseline; backend confirmed untouched (frontend-only phase)"
  - "Live UAT sign-off on :3000 via getComputedStyle confirming all renamed tokens resolve to real, non-empty colors at real DOM nodes, and the PublicNoteCard band is measurably lighter with contrast improved at every checked role"
  - "Independent, externally-performed reconciliation of the ROADMAP's original 78-reference count against 149-UI-SPEC.md's corrected 39 — both numbers confirmed correct, counting different things; nothing was missed"
  - "One named, not-hidden observation: 2 of 9 full vitest runs showed 1 failing test with no reproducible identity, isolated re-runs of the only suspect file green 3/3 — classified as pre-existing timing flakiness under parallel Docker load, not a Phase 149 regression, but explicitly not glossed over"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-token dead-reference scans must distinguish 'total occurrences of a token name' from 'occurrences lacking a fallback' — grouping all references of a token into one bucket as soon as one is fallback-free (as the original ROADMAP Ausgangsbefund scan did) inflates the apparent defect count without being wrong; the two counts describe different things and both can be independently correct."

key-files:
  created: []
  modified: []

key-decisions:
  - "This plan's own two tasks made zero code changes (files_modified: [] per its frontmatter, matching the 148-07 precedent) — Task 1 is a read-only regression sweep and Task 2 is a human-verify checkpoint, executed externally by the user rather than a spawned executor agent."
  - "The 78-vs-39 occurrence-count question is resolved with two independently converging explanations (the orchestrator's own exact-token-boundary git-grep diff, documented in 149-05-SUMMARY.md, and the user's own per-token-grouping scan, documented here) that agree on every number: 78 = 76 total var() occurrences across the 12 real dead tokens (fallback'd and fallback-free counted together) + 2 --tag- template-string false matches; 39 = the actually-fallback-free subset that needed fixing. Post-remediation, the previously-mixed tokens cleanly reclassify as 100% fallback-protected (--color-text-muted 18, --color-text 12, --color-surface 6) in the user's own re-scan — direct confirmation nothing was missed."
  - "The one flaky vitest run (2/9 full-suite runs, 1 failing test each, not reproducible, no stable identity, sole suspect file green 3/3 in isolation) is recorded as a named, open observation rather than silently treated as a clean pass — per explicit instruction not to describe it as a fully green state."

patterns-established: []

requirements-completed: []

# Metrics
duration: external (live UAT + regression sweep run outside orchestrator turns via 127.0.0.1:3300 tunnel, not tracked as a single session)
completed: 2026-09-06
---

# Phase 149 Plan 06: Full Regression Gate + Live UAT Sign-Off Summary

**Full frontend regression sweep green (with one named, non-reproducible flakiness observation) and a live UAT on `:3000`, measured via `getComputedStyle`, confirms all 12 renamed dead tokens resolve to real colors and the PublicNoteCard band is measurably lighter with contrast improved at every previously-borderline case — including the exact case Phase 148 left as open debt, now measured at 5.01:1 (was 4.16:1).**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 0 directly by this plan (`files_modified: []` per its own frontmatter) — this is a verification-only gate over Plans 149-01 through 149-05's already-landed changes
- **Completed:** 2026-09-06

## Task 1: Full automated regression sweep — Result: PASS, with one named observation

Executed externally against the current tip of `main` (all five prior plans landed, baseline commit `4fec0000` immediately preceding Plan 149-01's first commit):

| Check | Result |
|---|---|
| `git diff --stat 4fec0000..HEAD -- backend/` | empty — confirmed frontend-only phase, no backend regression sweep required |
| `npx tsc --noEmit` | clean |
| `npx vitest run` (full frontend suite) | 2238 passed, 1 skipped, 3 todo (2242 total) — **see flakiness observation below** |
| `roleCatalog.accessibility.test.ts` | green — the `.head`/`.role` block now asserts a real `>= 4.5` threshold, not a known-gap snapshot |
| `npx eslint src` | clean |
| `docker compose build team4sv30-frontend` | succeeded (production build parity) |
| Repo-wide grep, all 12 fixed dead tokens | zero remaining fallback-free references outside `var(--token, fallback)` construction |
| `PublicNoteCard.module.css:25` | exactly `color-mix(in srgb, var(--role-accent) 45%, var(--color-border))` |

**Flakiness observation (named debt, not glossed over):** across 9 full `npx vitest run` executions of the entire frontend suite, 2 runs each showed exactly 1 failing test; the failure was not reproducible and its identity could not be pinned down between the two occurrences. The only file considered a plausible suspect, `ReleaseVersionMediaSection.test.tsx`, was run in isolation 3 times and passed 25/25 every time — and that file was not touched by any Phase 149 plan. The remaining 6 of 9 full runs were green. **Classification: pre-existing timing flakiness under parallel Docker load on `team4s-linux`, not a regression introduced by this phase.** This is recorded here as an open observation rather than described as a clean, fully-green state — it should be watched for recurrence in future phases, and no attempt was made in this plan to root-cause or fix it (out of scope: this plan makes no code changes).

## Task 2: Live UAT — Result: APPROVED (external)

Measured via `getComputedStyle` through the `127.0.0.1:3300` tunnel, not by eye:

**Renamed-token resolution** — all target tokens resolve to a real, non-empty computed value:

| Token | Resolved value |
|---|---|
| `--text-muted` | `#6b6b70` |
| `--text-primary` | `#1c1c1e` |
| `--surface-card` | `#ffffff` |
| `--surface-card-muted` | `#fbfaf8` |
| `--text-faint` | `#8c857e` |
| `--accent-primary` | `#5f84dd` |
| `--accent-deep` | `#185fa5` |
| `--color-border` | `#e1e1e6` |
| `--border-subtle` | `rgba(45,41,38,0.12)` |
| `--color-success` | `#28a745` |

**Fallback-protected references confirmed untouched:** in the loaded CSS of the releases overview (513 rules inspected), 8 remaining references to the old dead-token names were found — all carrying a fallback (e.g. `var(--color-text-muted, #647...)`). This is exactly the deliberately-unchanged fallback-protected group per the phase's Scope-Grenze, not leftover work.

**PublicNoteCard band, release-detail note card** (`/anime/1/group/1/releases/27`):
- `headBg` now `rgb(211, 171, 147)` (was `rgb(208, 160, 129)` before the 55%→45% change) — visibly lighter.
- Contrast improved at every checked author: `timer` 8.15:1 (was 7.29), `encoder` 7.41 (was 6.42), `translator` 6.79 (was 5.76).
- Role color itself unchanged, confirming the band-mix change did not alter role identity: `--role-accent` still `#c26a2e` / `#506b91` / `#27664f` across the three checked note cards.

**PublicNoteCard role variant, project-member page — the previously-critical case Phase 148 left as named debt:**
- Role text `"Typesetting"`: **5.01:1** (was 4.16:1 at the old 55% band) — now clears the 4.5:1 AA floor.
- `.date` text: 6.36:1 (was 5.29).
- This is live, measured confirmation of ROADMAP Success Criterion 5 on the exact surface that motivated this phase.

**Resume-signal:** approved — the checkpoint plan was run to completion externally (human-driven live UAT via the tunnel) and its results supplied for this summary.

## Reconciliation: ROADMAP's "78 references" vs. 149-UI-SPEC.md's corrected "39" — confirmed by independent, externally-run scan

This closes the loop opened during Wave 2 (see `149-05-SUMMARY.md`'s own reconciliation, based on the orchestrator's exact-token-boundary `git grep` at the pre-phase baseline). The user independently re-scanned the live, now-fixed tree and confirms the same conclusion from the other direction:

**Both 78 and 39 were correct — they count different things.** The original ROADMAP Ausgangsbefund scan groups per token and, as soon as a token has at least one fallback-free reference, counts **all** references to that token — including the ones that already carried a fallback. `149-UI-SPEC.md`'s 39 counts only the references that were actually fallback-free and needed changing.

**Post-remediation confirmation:** re-scanning the fixed tree, the previously-mixed tokens now cleanly fall entirely into the "WITH fallback" bucket, with counts matching exactly what removing the fixed occurrences predicts:
- `--color-text-muted`: 18 remaining (all with fallback) — matches 22 original total minus 4 fixed.
- `--color-text`: 12 remaining (all with fallback) — matches 15 original total minus 3 fixed.
- `--color-surface`: 6 remaining (all with fallback) — matches 12 original total minus 6 fixed.

**No fallback-free defects were missed.** All remaining hits in the "without fallback" category from the user's own re-scan are confirmed false positives, none of them real code defects:
- `--a`, `--d`, `--already-defined`, `--name` — synthetic fixture/placeholder names inside `cssCustomProperties.guard.test.ts` and its helper, not real tokens.
- `--surface-muted` — remaining hits are exclusively fixture/description text inside two test files, not live CSS.
- `--tag-` — confirmed, as previously established, a template-string construction (`` `var(--tag-${item.key}-bg)` ``) in `app/dev/ui-system/page.tsx`; the real, concrete tokens it constructs (`--tag-gallery-bg`, `--tag-history-bg`, `--tag-oldweb-bg`, `--tag-forum-bg`, `--tag-irc-bg`, etc.) all exist in `globals.css`.

**Guard test — negative proof, run and observed, not just asserted (re-confirmed independently of the 149-05 proof):**
- Regular run: 8/8 green.
- A synthetic fallback-free reference to a genuinely undefined token (`.guardNegativeProof { color: var(--dieses-token-gibt-es-nicht); }`) was appended to `frontend/src/components/ui/ui.module.css`. The guard failed, naming the exact token, file, and line (`--dieses-token-gibt-es-nicht`, `hasFallback: false`, line 1988).
- The change was reverted from a backup, the guard re-ran green (8/8), and `git status` confirmed a clean working tree before this checkpoint's sign-off.

**Conclusion: ROADMAP Success Criterion 1 is fully met.** No additional Stellen beyond the 39 were required — both the independent orchestrator-side scan (`149-05-SUMMARY.md`) and this externally-run, live re-scan converge on the same accounting with zero gap.

## Files Created/Modified

None from this plan's own tasks (`files_modified: []`, verification-only gate).

## Decisions Made

See `key-decisions` in frontmatter above.

## Deviations from Plan

None from this plan's own two tasks. The flakiness observation above is a named finding surfaced by Task 1's regression sweep, not a deviation from what the plan asked for.

## Issues Encountered

- The intermittent, non-reproducible vitest failure described above (2/9 full runs). No root cause identified; classified as pre-existing Docker-parallelism timing flakiness, not a Phase 149 regression. Recommended: watch for recurrence in future phases; not actioned further here as it is out of this verification-only plan's scope to fix.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

All 6 plans of Phase 149 are complete. ROADMAP Phase 149 Success Criteria 1-7 are all independently confirmed true against the live running system (not just unit tests):
- SC1 (no fallback-free dead references remain): confirmed by the guard test's real-tree scan and this plan's repo-wide grep.
- SC2 (only existing tokens used, `--tag-` correctly resolved as a non-defect): confirmed.
- SC3/SC4 (guard test exists, fails on new dead references, treats fallback'd references as legitimate): confirmed live, with a real (non-fixture) negative-proof run.
- SC5/SC6 (PublicNoteCard contrast, real threshold in `roleCatalog.accessibility.test.ts`): confirmed live at the exact previously-failing case (5.01:1, was 4.16:1).
- SC7 (tests green, live UAT via `getComputedStyle`): confirmed, with the flakiness observation named rather than hidden.

Whether Phase 149 as a whole is ready to be marked fully complete in ROADMAP.md/STATE.md is left to the goal-backward verification (`149-VERIFICATION.md`) that follows this summary.

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*
