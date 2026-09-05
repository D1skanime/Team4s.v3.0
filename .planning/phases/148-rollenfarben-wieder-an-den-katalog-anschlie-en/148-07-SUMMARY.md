---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 07
subsystem: ui
tags: [css, react, typescript, contrast, wcag, live-uat, role-colors, regression-gate]

# Dependency graph
requires:
  - phase: 148-01
    provides: "presentationForRole() icon/color decoupling; categoryForRole() removed; six consumers migrated to real role code + colorKey"
  - phase: 148-02
    provides: "globals.css derives --role-accent from the data-color-key seam; three-module dead-fallback cleanup; contrast-proof test extension"
  - phase: 148-03
    provides: "RoleBadgeCard + MemberBadgeChain connected to the data-color-key seam"
  - phase: 148-04
    provides: "FansubEdit role-toggle cleanup + FansubAppMembersOverview.tsx migrated off getRoleClassName()/colorClassMap"
  - phase: 148-05
    provides: "role_color_key threaded through all three public-note query sites, the OpenAPI contract, both TS types, and PublicNoteCard"
  - phase: 148-06
    provides: "HC-09 audit-doc correction (no production reference vs. zero references repo-wide)"
provides:
  - "Full green regression sweep across backend (build/vet/test), frontend (typecheck/lint/test/build), and the OpenAPI contract, with the failing-test set confirmed line-for-line identical to the Phase-147 baseline (51 pre-existing failures, zero new)"
  - "Live UAT sign-off on :3000 via getComputedStyle (not visual inspection) confirming role-dependent color now actually renders on the release-detail public note card, the project-member page (both seam types), and the public member profile"
  - "A real, live-caught defect (raw-uppercase-hex role_color_key never matching globals.css's lowercase [data-color-key] selectors) found and fixed (commit 3c93769b) before this checkpoint could pass — documented as the phase's key testing lesson"
  - "A residual, unresolved gap versus ROADMAP Success Criteria 1/2: FansubEdit.module.css still carries ~10 live, consumed --role-accent-<code> tokens feeding two sibling admin components (GroupMembersHistTable.tsx, FansubAppMemberAddModal.tsx) that Plan 148-04 explicitly left untouched — the repo-wide 'zero dead --role-accent-<code> references outside LayeredBadgeArtwork' claim is not yet true"
  - "A named, deliberately-not-fixed WCAG contrast gap in PublicNoteCard's role-variant .role text (38% mix), measured live at 4.16:1 against the 4.5:1 AA threshold — fixing it would require changing a locked Restoration Rule formula"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Case normalization for any catalog-sourced value that lands in a CSS attribute selector must happen exactly once, at the same call site every other consumer already uses (boundedColorKey/presentationForRole) — a raw DTO passthrough is not equivalent even when the value 'looks like' a valid hex, because CSS attribute selectors are case-sensitive and the DB stores color_key uppercase."

key-files:
  created: []
  modified:
    - frontend/src/lib/roleCatalog.ts
    - frontend/src/components/public/PublicNoteCard.tsx
    - frontend/src/components/public/PublicNoteCard.test.tsx

key-decisions:
  - "Verification ran against the current tip of main (commit 3c93769b), which includes a pre-checkpoint fix landed after 148-05's own completion but before this plan's live UAT — the case-normalization defect described below. Documented here rather than retroactively rewritten into 148-05-SUMMARY.md's original task history, matching the Phase 147 Plan 06 precedent of documenting post-hoc corrections in the gate plan's own summary."
  - "The FansubEdit.module.css / GroupMembersHistTable.tsx / FansubAppMemberAddModal.tsx gap (see Out-of-Scope/Unresolved Findings) is NOT accepted as named debt the way the contrast gap is — it directly contradicts ROADMAP Success Criteria 1 and 2 as literally written, and no ROADMAP scope note excludes it (unlike badge thresholds/artwork/carousel, which are explicitly excluded). It is reported here as an open finding for the verifier and the user to weigh, not silently absorbed into 'phase done'."
  - "51 backend test failures in the full go test ./... run are pre-existing baseline noise, confirmed line-for-line identical to the Phase-147 baseline set (missing TEAM4S_PHASE117/128/134-DSN env vars causing hard failures instead of skips, plus already-red tests unrelated to any phase-148 file) — zero new backend failures from Phase 148."

patterns-established: []

requirements-completed: []

# Metrics
duration: external (VM test run + live UAT run outside orchestrator turns, not tracked as a single session)
completed: 2026-09-05
---

# Phase 148 Plan 07: Full Regression Gate + Live UAT Sign-Off Summary

**Full backend/frontend/contract regression sweep is green (identical failing-test set to the Phase-147 baseline) and a live UAT on `:3000`, measured via `getComputedStyle`, confirms role colors now actually render on the public note card and project-member page — but a real defect (raw-uppercase-hex `data-color-key`, never matching `globals.css`'s lowercase selectors) was only caught by that live test, not by any of the phase's unit tests, and a residual gap against ROADMAP Success Criteria 1/2 remains open in `FansubEdit.module.css`.**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 0 directly by this plan (`files_modified: []` per its own frontmatter) — see "Pre-Checkpoint Fix" below for the one substantive code change that landed between 148-05's completion and this plan's sign-off
- **Completed:** 2026-09-05

## Task 1: Full automated regression sweep — Result: PASS, with one residual finding

Executed on the VM against the current tip of `main` (commit `3c93769b`, which includes the
pre-checkpoint normalization fix — see below):

| Command | Result |
|---|---|
| `go build ./...` | green |
| `go vet ./...` | green |
| `go test ./...` (full suite) | 51 failing tests — **identical set**, line-for-line after runtime-normalization, to the Phase-147 baseline. Zero new backend test failures from Phase 148. |
| `go test ./internal/repository/... -run TestPublicNoteRoleCode` (real Postgres, disposable `team4s_phase117_test_p148b`, dropped after the run) | PASS — 3 sub-cases: `role_code` sourcing, `label_de`-independence, and the new `role_color_key` sub-case |
| `npx vitest run` (frontend, in container) | 290 files / 2226 tests passed, 1 skipped, 3 todo, 0 failures |
| `npx tsc --noEmit` (frontend, in container) | 1 pre-existing error, in a **generated** file (`.next/dev/types/.../releases/[releaseVersionId]/page.ts`), traced to `page.tsx` declaring `params` as a union instead of a `Promise`. Introduced in commit `e7022f40`, touched by neither Phase 147 nor Phase 148. Production build is green. Recorded as named debt, not fixed in this phase. |
| `roleCatalog.accessibility.test.ts` | 17/17 green |
| `docker compose build team4sv30-frontend` | succeeded (production build parity) |
| `grep -rn "categoryForRole" frontend/src` | empty — PASS |
| `grep -n "getRoleClassName" frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx` | empty — PASS |
| `grep -rln -- "--role-accent-" frontend/src` | **returns two files, not zero/LayeredBadgeArtwork-only — see finding below** |

**Residual finding (not a Phase-148 regression, but an unmet phase-scope acceptance criterion):**
The `--role-accent-` grep gate this plan's own Task 1 specifies returned:
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` — benign false positive: the string appears inside a test's own negative-assertion regex literal (`expect(projectStyles).not.toMatch(/--role-accent-/)`), not as a live CSS reference.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` — **real, live match.** Lines 550-630 define `.fansubEditRoleBadge`, `.fansubEditRoleOption`, `.fansubEditRoleLead`, `.fansubEditRoleProjectLead`, `.fansubEditRoleEditor`, `.fansubEditRoleTranslator`, `.fansubEditRoleTimer`, `.fansubEditRoleTypesetter`, `.fansubEditRoleQuality`, `.fansubEditRoleEncoder`, and `.fansubEditRoleDefault`, each assigning `--role-accent: var(--role-accent-<code>)` from a token that (like the ten modules this phase's Ausgangsbefund named) is defined nowhere in the repo. These classes are not dead: `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx:60-71` and `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx:76-88` each carry their own local, role-code-keyed `getRoleClassName()`/`roleClassMap` selecting these exact classes, and both components are actively imported and rendered on the same admin fansub-edit page (`GroupMembersTab.tsx`, `FansubAppMembersSection.tsx`, `ClaimManagementPanel.tsx`).

This means Plan 148-04 closed the one `getRoleClassName()` instance ROADMAP Success Criterion 4 names by
file (`FansubAppMembersOverview.tsx`), and one specific dead self-assignment in the same CSS file (the
`.fansubEditMemberRoleToggle` rule, per 148-04-SUMMARY.md), but two **sibling** components on the same
page — using the identical broken pattern against the identical dead tokens — were left untouched.
148-04-SUMMARY.md itself calls them "out-of-scope role-code-keyed color mappings," but no ROADMAP scope
note excludes them the way badge thresholds/artwork/carousel are explicitly excluded, and ROADMAP Success
Criteria 1 ("kein CSS-Modul weist sich mehr eine Farbe aus einem `--role-accent-<code>`-Token zu") and 2
("keine Referenz auf die nicht existierenden Tokens ... bleibt im Repo übrig") are written as blanket,
repo-wide claims with only `LayeredBadgeArtwork.module.css` carved out. **This finding is reported here,
not fixed** — it is exactly the kind of gap this plan's regression gate exists to surface, and resolving
it (or formally amending ROADMAP scope to exclude it) is left to the verifier/user decision that follows
this summary.

## Task 2: Live UAT — Result: APPROVED (external)

Backend rebuilt, frontend restarted on the VM. Measured via `getComputedStyle` through the
`127.0.0.1:3300` tunnel, not by eye:

**Release-detail note card** (`/anime/1/group/1/releases/27`), all three note cards:

| `data-color-key` | `--role-accent` | `borderBottomColor` |
|---|---|---|
| `#c26a2e` | `#c26a2e` | `rgb(194, 106, 46)` |
| `#506b91` | `#506b91` | `rgb(80, 107, 145)` |
| `#27664f` | `#27664f` | `rgb(39, 102, 79)` |

Before the pre-checkpoint fix (commit `3c93769b`), all three fell back to the neutral `#596176`.

**Project-member page** (`/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`) — both seam
types now agree: the `presentationForRole()`-driven role chip (`<span>`) and the DTO-driven note card
(`<article>`) both carry `data-color-key="#7b3c4e"` with `--role-accent: #7b3c4e`.

**Public member profile** (`/members/type`): role chip `data-color-key="#7b3c4e"`,
`--role-accent: #7b3c4e`.

Across all checked surfaces, `data-role-code` carries the real role code — never a hex value — confirming
Plan 148-01's `categoryForRole()` removal took effect app-wide, not just in the six directly-migrated
consumers.

`LayeredBadgeArtwork.module.css`'s own hardcoded `--role-accent: #17a7a5` is independently confirmed
untouched throughout the phase (`git log d86c2a3f..HEAD -- frontend/src/components/profile/
LayeredBadgeArtwork.module.css` returns no commits), satisfying the plan's fifth live-UAT check without
requiring a fresh screenshot.

**Resume-signal:** approved — the checkpoint plan was run to completion externally and its results
supplied for this summary.

## Pre-Checkpoint Fix: role_color_key case-normalization defect (found during 148-07 pre-review)

Before this checkpoint could pass, a real defect surfaced during diff pre-review and the live test itself:

**Defect:** `role_definitions.color_key` is stored **uppercase** in the database (e.g. `'#C26A2E'`). All
three public-note queries select it via `COALESCE(rd.color_key, '')` and return it unchanged — confirmed
live: `GET /api/v1/anime/1/group/1/releases/27/notes` returned `"role_color_key":"#C26A2E"`.
`PublicNoteCard.tsx` wrote that raw DTO value straight into `data-color-key={roleColorKey || 'neutral'}`.
`globals.css`'s seam selectors are lowercase (`[data-color-key='#c26a2e']`), and CSS attribute selectors
are case-sensitive, so the selector silently never matched for real catalog data — every public note card
rendered the neutral `--role-accent` (`#596176`) instead of its real role color. The catalog's `'other'`
value (`group_member`/`admin`/`other`) had the identical problem: written into `data-color-key` verbatim
instead of resolving to `'neutral'`. Live-verified side-by-side on the project-member page: the
`presentationForRole()`-driven `<span>` correctly showed `data-color-key="#7b3c4e"` while the DTO-driven
`<article>` showed `data-color-key="#7B3C4E"` and rendered neutral gray. Success Criteria 6 and 8 were not
actually met for the public note card until this was fixed.

**Root cause:** every other `data-color-key` consumer in the codebase derives its value through
`presentationForRole(...).colorKey`, whose (previously private) `boundedColorKey()` helper lowercases the
value and falls back unknown/unbounded values to `'neutral'`. Plan 148-05's DTO passthrough was the one
call site that bypassed that function — a second, unnormalized code path for the same seam.

**Fix (commit `3c93769b`, one normalization point, no second variant):**
- `boundedColorKey()` exported from `frontend/src/lib/roleCatalog.ts` (was already used internally by
  `presentationForRole`).
- `PublicNoteCard.tsx` now renders `data-color-key={boundedColorKey(roleColorKey)}` instead of the raw
  `roleColorKey || 'neutral'`. Confirmed via a repo-wide grep that this was the only call site needing
  the change — every other `data-color-key` consumer already went through `presentationForRole()`.
- Backend and the `role_color_key` DTO field were left unchanged: the raw, unnormalized catalog value is
  correct for the API to return; normalization for the CSS seam belongs client-side, exactly where every
  other consumer already does it.

**Tests added** (`PublicNoteCard.test.tsx`, 21/21 green):
- An uppercase-hex `roleColorKey` now asserts the rendered `data-color-key` is lowercase and matches the
  `globals.css` selector.
- `roleColorKey="other"` now asserts the rendered `data-color-key` is `'neutral'`.

**Backend test:** `public_note_role_code_integration_test.go` already seeded its fixture with an
uppercase hex (`'#0F766E'`, present since 148-05's own commit) and asserted the backend returns it
unchanged — this already documented that normalization is deliberately not the backend's job. Re-verified
green against a real, isolated `team4s_phase117_test_*` Postgres database; no backend change was needed.

**The actual lesson from this phase:** none of the phase's existing tests found this defect. Every
`PublicNoteCard` fixture, in every plan (148-05 and the plan-checker's own SC7 addition for 148-04),
happened to use only lowercase hex literals, so the case-sensitivity bug was invisible to the full green
test suite reported at the end of Wave 2. It was only caught because a human live-tested with real
database values (which are uppercase) and diffed the two seam types side by side on the same page. A
fixture that never varies casing cannot catch a casing bug — this is now reflected in
`PublicNoteCard.test.tsx`'s two new cases, but the general lesson (catalog-sourced test fixtures should
include at least one instance of the DB's actual on-disk casing/format, not just the "clean" values a
developer would type by hand) is broader than this one file.

## Contrast Gap — Named Debt (Documented, Deliberately NOT Fixed)

Live-measured contrast (real rendered values via `getComputedStyle`, not values copied from the test
file):

- `PublicNoteCard` **author variant** (release-detail), name/meta text against the header band:
  `timer` 7.29:1, `encoder` 6.42:1, `translator` 5.76:1 — all comfortably above the AA threshold (4.5:1).
- `PublicNoteCard` **role variant** (project-member page), `typesetter`: `.role` text against the band
  **4.16:1 — below 4.5:1**. The adjacent `.date` text is 5.29:1 (passes).

`roleCatalog.accessibility.test.ts` (extended in Plan 148-02) already asserts this exact gap as an
explicit, currently-measured failing-hex snapshot rather than hiding it — that test is green because it
documents the failure, not because the failure doesn't exist. This live measurement confirms the gap is
real but **narrower** than the test's own framing suggested: it is specifically the role-variant `.role`
text's 38% color-mix formula, not the author variant (which passes everywhere measured).

**Why this is not fixed here:** the 38% mix ratio is one of the exact, byte-for-byte-preserved formulas
the UI-SPEC's Restoration Rule locks — Plan 148-02 (and this phase generally) is scoped to reconnecting
the dead color *source*, never to changing a mix ratio, fallback value, or color-mix formula. Changing the
38% mix to close this gap would be a Restoration Rule violation and requires a dedicated, explicitly-scoped
follow-up decision (accept as parity-with-pre-regression state, or commission a remediation plan) — not a
change bundled into this verification gate.

## Files Created/Modified

None from this plan's own tasks (`files_modified: []`). The pre-checkpoint fix commit `3c93769b`
(authored after 148-05's own completion, before this plan's regression sweep/live UAT — part of "the
current tip of main" this sweep validated) touched:
- `frontend/src/lib/roleCatalog.ts` — exported `boundedColorKey()`
- `frontend/src/components/public/PublicNoteCard.tsx` — `data-color-key={boundedColorKey(roleColorKey)}`
- `frontend/src/components/public/PublicNoteCard.test.tsx` — 2 new tests (uppercase-hex normalization,
  `'other'` → `'neutral'`)

## Decisions Made

See `key-decisions` in frontmatter above.

## Deviations from Plan

**Not a deviation from this plan's own two tasks, but a material precondition:** the pre-checkpoint fix
described above (commit `3c93769b`) was applied and verified before this plan's Task 1/Task 2 sweep ran,
exactly mirroring how Phase 147 Plan 06 documented its own pre-gate review-fix commit. This sweep and the
live UAT ran against `main` **including** that fix.

## Issues Encountered

- The `--role-accent-` grep gate (Task 1's own acceptance criterion) found a real, unaddressed gap in
  `FansubEdit.module.css` feeding `GroupMembersHistTable.tsx` and `FansubAppMemberAddModal.tsx` — see
  "Residual finding" above. Not introduced by this plan; pre-existing since before Plan 148-04, left
  unaddressed by 148-04's declared scope.
- No other new issues. The 51 backend test failures observed are pre-existing baseline noise, confirmed
  identical to the Phase-147 baseline.

## Out-of-Scope / Unresolved Findings

1. **FansubEdit.module.css's `.fansubEditRole*` classes (10 dead `--role-accent-<code>` tokens),
   consumed by `GroupMembersHistTable.tsx` and `FansubAppMemberAddModal.tsx`.** Both components are live
   and rendered on the admin fansub-edit page. This directly contradicts ROADMAP Phase 148 Success
   Criteria 1 and 2 as literally written (blanket "no CSS module assigns color from a
   `--role-accent-<code>` token" / "no reference to the nonexistent tokens remains," with only
   `LayeredBadgeArtwork.module.css` excluded). Not fixed in this plan — reported for the verifier/user to
   weigh: either a gap-closure plan applies the same `presentationForRole()`/`ROLE_CATALOG_CHIP_CLASS`
   migration 148-04 already applied to `FansubAppMembersOverview.tsx`, or ROADMAP scope is formally
   amended to exclude these two files the way badge artwork/thresholds/carousel already are.
2. **Contrast gap** — see dedicated section above. Deliberately not fixed; Restoration Rule constraint.
3. **Pre-existing `tsc --noEmit` route-type error** — generated file, traced to `page.tsx` from commit
   `e7022f40`, untouched by Phase 147 or 148. Production build is green. Named debt, not fixed here.

## User Setup Required

None.

## Next Phase Readiness

Phases 148-01 through 148-06 are functionally complete and verified. This plan's own two tasks (automated
regression sweep, live UAT) both completed with the results above. Whether Phase 148 as a whole is ready
to be marked fully complete in ROADMAP.md depends on how the residual `FansubEdit`/`GroupMembersHistTable`
/`FansubAppMemberAddModal` finding above is resolved — that decision is deferred to the goal-backward
verification (`148-VERIFICATION.md`) that follows this summary, and to the user.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*
