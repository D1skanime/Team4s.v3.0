---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
verified: 2026-09-02T08:56:14Z
status: gaps_found
score: 13/13 gap-closure must-haves verified (UAT-01..UAT-04); 1 additional gap found
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 7/7 ROADMAP success criteria
  gaps_closed:
    - "UAT-01: stale 'In Prüfung' header Badge after a review decision"
    - "UAT-02: rejected-only release indistinguishable from never-touched release (Offen vs. Überarbeitung nötig)"
    - "UAT-03: single-entry rejected-notes dashboard card unnecessarily tall"
    - "UAT-04: hardcoded/wrong hex color fallbacks introduced in AttentionSection.module.css"
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "has_own_media (and by extension the frontend's isDone()/'Erledigt' badge and button-prominence logic) excludes rejected media the same way has_own_notes/has_own_rejected_notes now excludes rejected notes"
    status: failed
    reason: >
      This phase's own post-execution code review (143-REVIEW.md, 2026-09-02T00:00:00Z, status:
      issues_found, CR-01, Critical) found — and this verification independently re-confirmed by
      direct source read — that the has_own_media EXISTS subquery in
      anime_contributions_member_project_repository.go (lines 150-156, untouched by plans
      143-15..18) has no join to release_version_media_review_lifecycle and does not check
      review_state at all. A member whose only contribution to a release is a rejected image
      submission gets has_own_media=true (rejected media rows are not deleted until a 90-day async
      cleanup job runs, per backend/internal/services/release_review_cleanup.go:13), which makes
      isDone() return true and the release show green "Erledigt" with a downgraded button — the
      exact false-positive-done bug UAT-02 was raised to fix, reproduced for the sibling artifact
      type (media) instead of notes. No fix or explicit user-authorized deferral/override exists on
      record for this finding as of this verification pass.
    artifacts:
      - path: "backend/internal/repository/anime_contributions_member_project_repository.go"
        issue: "has_own_media EXISTS subquery (lines 150-156) has no LEFT JOIN to release_version_media_review_lifecycle and no review_state filter, unlike the now-corrected has_own_notes/has_own_rejected_notes subqueries immediately above and below it in the same query"
    missing:
      - "A has_own_media fix mirroring has_own_notes' LEFT JOIN + review_state <> 'rejected' exclusion, and/or a new has_own_rejected_media flag mirroring has_own_rejected_notes, threaded through MemberProjectReleaseVersionRow, shared/contracts/openapi.yaml, frontend/src/types/contributions.ts, and page.tsx's needsRework/hasOwnArtifacts computation"
      - "An explicit human decision (fix now via a new gap-closure plan, or an accepted override/deferral entry) before this phase's dashboard/project-status remediation is considered fully closed for both artifact types (notes and media)"
---

# Phase 143: Gap-Closure Re-Verification (143-15..18, UAT-01..UAT-04)

**Phase Goal:** Die in der externen Codeprüfung vom 2026-09-01 belegten Defekte der Phase-142-Nacharbeit
sind geschlossen, und abgelehnte eigene Release-Notizen sind gruppiert im persönlichen Dashboard
sichtbar.

**Verified:** 2026-09-02T08:56:14Z
**Status:** gaps_found (see note below — the 4 live-UAT gap-closure items this run was scoped to
verify are all fully closed; the single `gaps_found` reason is a new, independently-confirmed Critical
defect surfaced by this phase's own post-execution code review, not yet fixed or deferred)
**Re-verification:** Yes — incremental, scoped to plans 143-15 through 143-18 (`gap_closure: true`,
requirements `UAT-01`..`UAT-04`, wave 1+2). Plans 143-01 through 143-14 and ROADMAP's 7 success
criteria were verified in the prior pass (`143-VERIFICATION.md`, 2026-09-01T23:58:00Z, `passed`,
7/7) and are not re-litigated here except for spot regression checks.

## Summary

All four live-UAT findings recorded in `143-UAT.md` (UAT-01 stale review-decision badge, UAT-02
rejected-note-collapsed-into-"Offen", UAT-03 oversized single-entry dashboard card, UAT-04 hardcoded
CSS color fallbacks) are genuinely closed in the current codebase — verified directly against source,
not trusted from SUMMARY.md claims: live `grep`/source reads of every changed file, live `npx vitest
run` inside the running frontend container for all three touched test files plus a full-suite run (288
files / 2157 tests passed, 0 unexpected failures, consistent growth from the prior baseline's 2154),
live `go build`/`go vet`/`go test` inside the running backend container for the three new
`has_own_rejected_notes` repository tests against a real Postgres fixture (not skipped — DSN
explicitly supplied), a live `npx tsc --noEmit`, and host/container source-identity diffs to rule out
a stale-container false-pass.

However, this same gap-closure wave triggered its own follow-up code review
(`143-REVIEW.md`, 2026-09-02T00:00:00Z), which found 1 Critical + 3 Warnings in the touched files. This
verification independently re-read the flagged code and confirms the Critical finding (CR-01) is real:
`has_own_media` was never taught the same rejected-state exclusion this phase just gave
`has_own_notes`, so a rejected **image/media** contribution still reports as "done" for up to 90 days
— the identical bug class UAT-02 exists to fix, just for the sibling artifact type. No fix or
user-authorized override for CR-01 is on record. Because this is a confirmed (not speculative) defect
in the exact file and functional area this phase remediates, discovered by the phase's own review
step and left unresolved, this verification reports it as a structured gap rather than silently
passing the phase. It does **not** invalidate any of the 13 UAT-01..04 must-haves below, all of which
independently pass.

## UAT-01..UAT-04 Must-Haves (this run's primary scope)

| # | Truth (plan) | Status | Evidence |
|---|---|---|---|
| 1 | UAT-03: single-entry rejected-notes group renders a visibly shorter `noteRevisionList` than the multi-item default, header/badge intact | ✓ VERIFIED | `AttentionSection.tsx:156-162` conditionally appends `styles.noteRevisionListSingle` when `group.items.length === 1`; `AttentionSection.module.css:79-86` defines `.noteRevisionListSingle { margin-top: var(--space-1); }` + compound `.noteRevisionListSingle .noteRevisionRow { padding-top: 0; padding-bottom: 0; }`, append-only, `.noteRevisionList`/`.noteRevisionRow` unchanged. Live `npx vitest run AttentionSection.test.tsx` — 14/14 pass. |
| 2 | UAT-03: 2+-item groups keep today's spacing/grouping unchanged | ✓ VERIFIED | Same evidence — `.noteRevisionList`/`.noteRevisionRow` base rules untouched (append-only diff); test asserts the multi-item case does NOT carry `noteRevisionListSingle`. |
| 3 | UAT-04: zero raw hex color fallback values anywhere in `AttentionSection.module.css` (2 new + 4 pre-existing) | ✓ VERIFIED | `grep -nE "#[0-9a-fA-F]{3,6}" AttentionSection.module.css` → 0 matches (live re-run, whole file, not just the 2 plan-cited lines). All 6 `var(--color-primary, #...)`/`var(--text-soft, #...)` occurrences now bare tokens (`var(--color-primary)`, `var(--text-soft)`). |
| 4 | UAT-01: header status Badge reflects the new status immediately after a confirm/reject decision, no reload | ✓ VERIFIED | `page.tsx:163`: `submitDecision`'s success branch calls `setDetail((previous) => (previous ? { ...previous, status: decision === 'confirm' ? 'confirmed' : 'rejected' } : previous))` immediately after `setDecisionState({ kind: 'success', response })`; the header `Badge` at line 229 derives from `detail.status`, unchanged. Live `npx vitest run` on this file — 5/5 pass, including the 2 new `describe('header status Badge reflects the decision (UAT-01)', ...)` cases (confirm path asserts `"Bestätigt / Öffentlich"` appears and `"In Prüfung"` disappears; reject path asserts `"Abgelehnt"` appears and `"In Prüfung"` disappears). File stays at 447/450 lines (cap respected). |
| 5 | UAT-01: decision-panel message and header Badge no longer contradict each other | ✓ VERIFIED | Same evidence — both now derive from a `detail.status` that is patched at decision-success time; no separate/stale source of truth remains. |
| 6 | UAT-02 (backend): a release whose only note is rejected (not tombstoned) reports `has_own_rejected_notes=true` end to end | ✓ VERIFIED | `anime_contributions_member_project_repository.go:157-166`: new `EXISTS` subquery, `INNER JOIN release_version_note_review_lifecycle ... WHERE ... review_state = 'rejected'`. Live `go test ./internal/repository/... -run TestGetMemberProjectDetail -v` against real Postgres (`TEAM4S_PHASE107_TEST_DSN` supplied explicitly — tests ran, did not SKIP): `TestGetMemberProjectDetailHasOwnRejectedNotesTrueForRejectedOnlyNote` **PASS**. |
| 7 | UAT-02 (backend): confirmed/pending/no-note releases report `has_own_rejected_notes=false` | ✓ VERIFIED | `TestGetMemberProjectDetailHasOwnRejectedNotesFalseForConfirmedNote` **PASS** (live Postgres); the `INNER JOIN` shape structurally guarantees `false` whenever no lifecycle row exists (no-note case), consistent with `has_own_notes`' proven `...IncludesNoLifecycleNote` sibling test. |
| 8 | UAT-02 (backend): a tombstoned note never causes `has_own_rejected_notes=true` | ✓ VERIFIED | `TestGetMemberProjectDetailHasOwnRejectedNotesFalseForTombstonedNote` **PASS** (live Postgres) — same `rvn.deleted_at IS NULL` predicate `has_own_notes` already relies on. |
| 9 | UAT-02 (contract): `openapi.yaml`/`contributions.ts` agree on the new required field; `tsc --noEmit` clean | ✓ VERIFIED | `openapi.yaml:12072,12104` (`required` array + `has_own_rejected_notes: { type: boolean }`); `contributions.ts:201` (`has_own_rejected_notes: boolean;`). Live `npx tsc --noEmit` inside the frontend container — clean, exit 0. |
| 10 | UAT-02 (frontend): a rejected-only release (`has_own_notes=false, has_own_rejected_notes=true`) shows a third, distinct "Überarbeitung nötig" badge, not "Offen"/"Erledigt" | ✓ VERIFIED | `page.tsx:339-346`: `const needsRework = !releaseDone && release.has_own_rejected_notes`; `Badge variant={releaseDone ? 'success' : needsRework ? 'danger' : 'warning'}`, text `releaseDone ? 'Erledigt' : needsRework ? 'Überarbeitung nötig' : 'Offen'` — correct umlauts (`Überarbeitung nötig`, per CLAUDE.md). Live `npx vitest run` on this page's test file — 22/22 pass, including the new "shows a distinct 'Überarbeitung nötig' badge for a rejected-only release" test. |
| 11 | UAT-02 (frontend): that release's "Notizen & Medien" button renders `primary` (not downgraded) | ✓ VERIFIED | `page.tsx:338`: `hasOwnArtifacts = release.has_own_notes \|\| release.has_own_media \|\| release.has_own_rejected_notes` now includes the new flag; test asserts `workspaceLink.className` does not contain `"buttonSecondary"` for this case. |
| 12 | UAT-02 (frontend): `X offen · Y erledigt` counter and the "Offen" filter still classify a needs-rework release as open — `isDone()` untouched | ✓ VERIFIED | `page.tsx:53-55`: `isDone()` is byte-identical (`release.has_own_notes \|\| release.has_own_media`); `openCount`/`doneCount`/`filterReleases()` (lines 61-77, 172-173) are unmodified. Test explicitly re-confirms a rejected-only release still counts as "offen" and appears under the "Offen" filter. |
| 13 | UAT-02 (frontend): a plain never-touched release (all 3 `has_own_*` false) still shows "Offen" unchanged | ✓ VERIFIED | Regression-guard test present and passing; confirms no accidental third-state leakage. |

**Score:** 13/13 UAT-01..UAT-04 must-haves verified. 0 of these 13 failed.

## Regression Check (part b of this run's mandate — did 143-15..18 break anything the prior VERIFICATION.md confirmed?)

| Area previously confirmed | Regression check performed | Result |
|---|---|---|
| Full frontend test suite (prior: 288/289 files, 2150/2154 tests) | Live `npx vitest run` (whole suite) inside `team4sv30-frontend` | **288 files passed, 1 skipped (289); 2157 passed, 1 skipped, 3 todo (2161).** 0 unexpected failures. Test-count increase (+7) matches the new UAT-01/03/04/18 regression tests added this wave. |
| Backend build/vet | Live `go build ./...` / `go vet ./...` inside `team4sv30-backend` | Both clean, exit 0. |
| `has_own_notes`'s Kriterium-5 semantics (Criterion 5 of the original 7) | Re-ran the 3 pre-existing `has_own_notes` tests (`...ExcludesRejectedNote`, `...IncludesNoLifecycleNote`, `...ExcludesTombstonedNote`) alongside the 3 new ones, same live Postgres fixture | All 6/6 **PASS** — no regression, `has_own_notes`'s SQL and struct field are untouched by 143-17 (only a new sibling `EXISTS` clause and struct field were added). |
| Dashboard lane wiring (Criterion 7) | Re-read `frontend/src/app/me/dashboard/page.tsx:154-155` — `pendingOwnNoteRevisions={state.dashboardData.pending_own_note_revisions}` | Unchanged, still wired. |
| `no-restricted-syntax` ratchet | Live `npx eslint` on the 4 touched `.tsx`/`.css` files | 0 `no-restricted-syntax` errors (4 pre-existing, unrelated `no-unused-vars` warnings only, not touched by this wave). Native `<button>` elements found at `page.tsx:289,299,309` are pre-existing (git blame: commit `637edd9e7`, 2026-06-29), not introduced by 143-18, and outside this wave's edited lines. |
| Debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder) | `grep` across all 11 files touched by 143-15..18 | None found. |
| Container/host source parity (to rule out a stale-bind-mount false pass, per 143-17-SUMMARY's documented workaround need) | `diff` on `page.tsx`, `AttentionSection.module.css`, `anime_contributions_member_project_repository.go`, its test file | All 4 spot-checked files byte-identical between host and running container. |

**No regressions found** in anything the prior `143-VERIFICATION.md` (2026-09-01T23:58:00Z, `passed`,
7/7) had confirmed.

## Data-Flow Trace (Level 4) — UAT-02's new signal

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `page.tsx`'s per-row Badge/button | `release.has_own_rejected_notes` | `GET /api/v1/me/projects/{animeId}/group/{fansubGroupId}` → `listMemberProjectReleaseVersions`'s new `EXISTS` subquery (real SQL against `release_version_notes`/`release_version_note_review_lifecycle`, not a static/empty return) | ✓ — confirmed via live-run repository tests proving the flag is `true`/`false` for the exact seeded DB states the tests construct | ✓ FLOWING |

## Requirements Coverage

`requirements: ["UAT-01"]` / `["UAT-02"]` / `["UAT-03"]` / `["UAT-04"]` across plans 143-16 / 143-17+143-18
/ 143-15 / 143-15 respectively. These are live-UAT finding IDs recorded in `143-UAT.md`, not
`REQUIREMENTS.md` entries — confirmed by direct grep: `grep -n "UAT-0" .planning/REQUIREMENTS.md`
returns zero matches, consistent with this being a remediation/gap-closure phase with no v1.4
requirement-ID mapping (matches the task's stated framing and the original phase's
`143-VALIDATION.md` scoping). No orphaned requirement IDs — `143-UAT.md` records exactly 4 findings
(UAT-01..04) and all 4 are claimed by exactly one plan each (143-16, 143-17/143-18, 143-15, 143-15).

## Anti-Patterns Found

None introduced by plans 143-15..18: no `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder markers, no
ASCII-substituted umlauts in new user-facing strings (`Überarbeitung nötig` verified correct), no new
native `<input>`/`<select>`/`<textarea>`/`<button>` elements, no hardcoded empty stub returns.

**However, this wave's own follow-up code review (`143-REVIEW.md`) found 1 Critical + 3 Warnings,
independently re-confirmed here:**

| Finding | Severity | Independently re-confirmed? | Blocking this run's UAT-01..04 score? |
|---|---|---|---|
| CR-01: `has_own_media` doesn't exclude rejected media the way `has_own_notes`/`has_own_rejected_notes` now do; rejected media falsely reports "Erledigt" for up to 90 days | Critical | ✓ Yes — read `anime_contributions_member_project_repository.go:150-156` directly: no lifecycle join, no `review_state` filter, confirmed structurally different from the (correct) `has_own_notes` subquery immediately above it | No — untouched file region, not part of UAT-01..04's scope. **But listed as a structured gap below** (see rationale in Summary). |
| WR-01: dead duplicate 409-conflict duck-typing branch in `submitDecision`'s catch block | Warning | ✓ Yes — `page.tsx:174-185`, confirmed pre-existing (not introduced by 143-16's 1-line `setDetail` addition) | No — code-quality only, unreachable branch, no behavior change. |
| WR-02: admin-override validation can focus a field hidden behind the open reject Modal | Warning | ✓ Yes — `page.tsx:129` (`overrideReasonRef.current?.focus()`) called inside `submitDecision`, reachable while `rejectOpen === true`; confirmed pre-existing, not introduced by 143-16 | No — pre-existing UX edge case, not this wave's scope. |
| WR-03: `needsRework` badge is masked whenever the release is independently "done" via accepted media (`releaseDone` short-circuits `needsRework` to `false`) | Warning | ✓ Yes — `page.tsx:339-340`: `const needsRework = !releaseDone && release.has_own_rejected_notes` — confirmed reachable when a member has both accepted media and a separately-rejected note on the same release | No — the plan's literal must-have (#10 above) is explicitly scoped to `has_own_notes=false`, which this compound case falls outside of; the literal truth still holds. Flagged as a known scope boundary, not a failure of the stated must-have. |

## Gaps Summary

The 4 live-UAT findings (UAT-01..UAT-04) this run was chartered to verify are all genuinely fixed,
tested with real assertions (not vacuous), and evidenced live against the running codebase — 13/13
must-haves pass, zero regressions against the prior `passed` verification. On that narrow mandate,
this wave is complete.

The single reason this report is not `status: passed` is CR-01 — a Critical, code-confirmed defect
this phase's own review pipeline surfaced in the same file/functional area (own-work "done" status
derivation) this phase exists to fix, for the sibling artifact type (media vs. notes), with no fix or
user-authorized override on record. The project's own established pattern (see the prior
`143-VERIFICATION.md`'s "Post-Review Fix Verification" section) is that Critical code-review findings
get fixed before a verification pass is accepted as `passed`; only Warnings have historically been
knowingly deferred with explicit user sign-off. Absent that sign-off here, this verification declines
to silently pass the phase and instead surfaces CR-01 as a structured gap so it can be scheduled (a
likely `has_own_rejected_media` companion to this wave's `has_own_rejected_notes` fix) or explicitly
overridden/deferred by the developer.

WR-01 and WR-02 are pre-existing code (not introduced by this wave) and are reported for completeness
only — they do not block this phase. WR-03 is a real, narrow scope boundary of UAT-02's fix (compound
accepted-media + rejected-note case) that does not contradict the plan's literal must-have wording but
is worth the developer's awareness alongside CR-01, since a `has_own_rejected_media` fix would likely
touch the same `needsRework` masking logic.

## Human Verification Required

None. Every item in this report — the 13 UAT-01..04 must-haves and the CR-01/WR-01..03 findings — was
verified or re-confirmed via direct source reads, live test runs against a real Postgres fixture, live
`tsc`/`eslint`/`go build`/`go vet`, and host/container diffs. The open item (CR-01) requires a
developer *decision* (fix now vs. defer with an override), not human *testing* — it is unambiguous from
the code, not a UX/visual judgment call.

---

_Verified: 2026-09-02T08:56:14Z_
_Verifier: Claude (gsd-verifier)_
