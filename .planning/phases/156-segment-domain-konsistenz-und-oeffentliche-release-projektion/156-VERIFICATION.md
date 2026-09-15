---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
verified: 2026-09-14T15:11:11Z
status: passed
score: 19/19 must-haves verified (P156-18 live-UAT signed off by operator 2026-09-15)
overrides_applied: 0
human_verification:
  - test: "GAP-02 bundled live-UAT checklist, items 10-13 (public-page rendering of segment-contributor selections after the GAP-04/GAP-05 origin fix)"
    expected: "Selected segment-contributors appear on the public release page; non-selected QCs never appear; an explicitly selected editor appears; encoder never appears as a segment credit -- tested on a segment/release combination that actually has an origin AND a saved contributor selection (the 2026-09-14 attempt tested Release 29, which resolves to Segment 4 with no origin/no selection, so items 10-13 could not be judged)"
    why_human: "Requires an authenticated platform-admin browser session against http://127.0.0.1:3300 (SSH tunnel per CLAUDE.md); this execution environment has no such credentials/session, and this is explicitly the human-UAT sink the phase's own 156-UAT.md/deferred-items.md route this to -- must not be simulated via API calls"
  - test: "Re-run the full GAP-02 checklist item 14 (Origin-Wechsel erzeugt keinen inkonsistenten Zustand) once more against a segment where the underlying GAP-04/GAP-05 fix is exercised live, since it previously passed but before this run's CR-01 fix to the manual assign/unassign endpoints"
    expected: "Changing a segment's Origin (via manual assign/unassign or range edit) never leaves a dangling/missing origin or a stale contributor selection, observable live in the admin UI and the public release page"
    why_human: "Same authenticated admin-browser constraint as above; automated Postgres-level proof exists (TestEnsureThemeSegmentOrigin Case 5/H, TestUnassignThemeSegmentFromReleaseVersion* new tests, live team4s_v2 invariant checks both return 0), but the phase's own acceptance bar for P156-18 is the live-UI pass, not the backend proof alone"
  - test: "Enrich Release 29's effective contributors with an actual quality_checker and editor role (156-UAT.md notes none exist there today: only translator/timer/typesetter/encoding/raw/design roles), then redo GAP-02 items 11-12 specifically"
    expected: "A QC selected on the segment appears; a QC not selected does not; an editor selected appears"
    why_human: "Requires live data setup (adding contributions with QC/editor roles) plus the same authenticated browser session as above"
---

# Phase 156: Segment-Domain-Konsistenz und oeffentliche Release-Projektion Verification Report

**Phase Goal:** `theme_segment_assignments` ist die kanonische Wahrheit dafuer, welche Release-Version
welches Kara-Segment verwendet; Bereichsaenderungen und spaeter angelegte Releases halten die
Assignments konsistent, Segment-Credits werden ueber stabile Rollen-Codes dynamisch aus einer
stabilen, korrigierbaren Segment-Origin projiziert, und Projektseite wie Release-Seite lesen
dieselbe Wahrheit mit unterschiedlicher Darstellung.

**Verified:** 2026-09-14T15:11:11Z
**Status:** human_needed
**Re-verification:** No — initial full-phase verification (this run closed the phase's own
GAP-04/GAP-05 gap-closure plan 156-16 plus its CR-01 code-review follow-up; no prior
`156-VERIFICATION.md` existed for this phase)

## Context for this run

This verification covers the entire phase (16 plans, P156-01..P156-19) with a live re-run of the
critical automated evidence, not just the just-executed Plan 156-16 + CR-01 fix. Per the explicit
task instructions, the phase's own bundled live-UAT human checkpoint (GAP-02, 14 items — 5 Origin +
9 Segment-Contributors) is **not** re-claimed as passed here even though 9 of its 14 items already
passed in the Auftraggeber's 2026-09-14 live session (see `deferred-items.md`), because items 10-13
were tested against the wrong segment (no origin, no selection) and remain unverified, and item 14
was tested *before* this run's CR-01 fix to the manual assign/unassign endpoints. This is treated as
`human_needed`, not `passed`, exactly as directed.

## Goal Achievement

### Observable Truths (mapped to ROADMAP.md P156-01..P156-19)

| # | Truth (Requirement) | Status | Evidence |
|---|------|--------|----------|
| 1 | P156-01/02/03: `theme_segment_assignments` is the canonical release<->segment truth; range changes reconcile (insert-missing/delete-excess), incomplete ranges never delete, overrides protect assignments, deletions never cross anime/group/version domain | VERIFIED | `backend/internal/repository/theme_segment_assignments.go` (`AssignThemeSegmentToEpisodeRange`/`assignThemeSegmentToEpisodeRangeTx`); live-rerun of `TestAssignThemeSegmentToEpisodeRange*` (6 subtests incl. shrink/grow/override-protection/cross-domain) and the incomplete-range guard tests (10 subtests total) — all PASS against real Postgres in this session |
| 2 | P156-04: a newly created release version inside an existing segment's range gets auto-assigned, both orderings (segment-first / release-first), multi-group bundled | VERIFIED | `backend/internal/repository/episode_import_repository_release_autoassign.go`; live-rerun `TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst/ReleaseFirstThenSegment/MultiGroup/OutOfRangeGetsNoAssignment` — all PASS |
| 3 | P156-05: stable `origin_release_version_id` column with deterministic backfill, no blind MIN(episode) | VERIFIED | Migration 0161 (origin column) + Migration 0164 (repair) both applied live (`schema_migrations` rows 161/164 present); live `team4s_v2` invariant checks (dangling-origin, missing-origin) both return 0 rows in this session |
| 4 | P156-06: Origin is admin-correctable and validated (never an immutable snapshot) | VERIFIED | `SetThemeSegmentOrigin` (`theme_segment_origin.go`) + PUT `/admin/anime/:id/segments/:segmentId/origin`; live-rerun `TestSetThemeSegmentOrigin` (6 subtests incl. Case H atomic contributor cleanup) — PASS |
| 5 | P156-07/08/09: segment credits are projected dynamically from the segment's ORIGIN release version's current contributors, filtered by `permissions.SegmentCreditRoleCodes` (stable role codes), never a label-substring heuristic; segmentrelevant roles defined in exactly one place | VERIFIED | `release_detail_public_repository_segment_credits.go`, `permissions.SegmentCreditRoleCodes`; live-rerun `TestReleaseDetailPublicSegmentOriginCredits` (7 subtests incl. encoder-never/QC-only-if-selected/live role-change) and `TestSegmentCreditRoleFilter` — all PASS |
| 6 | P156-10/11/12: project-page timeline derives segments from `theme_segment_assignments`, shows a shared segment only at first global occurrence, and only `theme_segment_id` identity decides a new timeline entry | VERIFIED (code + prior automated evidence) | `group_repository_cursor.go`/`group_repository_cursor_timeline.go` (`attachReleaseTimelineSegments`, `CanonicalSegmentType`) confirmed present; `TestAttachReleaseTimelineSegments` documented green in 156-15-SUMMARY.md's full-regression re-run — not independently re-run this session (untouched by 156-16/CR-01, no regression risk from this run's changes) |
| 7 | P156-13: release page shows every segment actually assigned to that release version; suppression logic deleted, not disabled | VERIFIED | `suppressSegmentsAlreadyVisibleOnPreviousEpisode` absent from `release_detail_public_repository_helpers.go` (confirmed via code read); `DECISIONS.md` carries the 2026-09-11 D-02 supersession entry |
| 8 | P156-14: segment-related member clicks land on the project-member route, not `/members/[slug]` | VERIFIED | `ThemeTimelineSegmentDetails.tsx` builds `{projectPath}/mitwirkende/{memberSlug}` links (confirmed present on disk); frontend suite green per 156-08/156-15-SUMMARY.md (untouched by this run) |
| 9 | P156-15: `ThemeTimeline` and siblings hold no own segment-type classification world; canonical types come from the backend | VERIFIED | `ThemeTimeline.tsx` (323 lines) confirmed to only keep presentational `SEGMENT_TYPE_STYLE_CLASS`/`SEGMENT_TYPE_DISPLAY_LABEL` exact-key maps (per 156-08-SUMMARY.md, file structure spot-checked) |
| 10 | P156-16/17: no N+1 — segment data and origin-credits load bundled, query budget pinned and measured; new indices justified by query-plan evidence | VERIFIED | Live-rerun `TestLoadReleaseSegmentsQueryBudgetIsConstant` ("1 segment/1 origin/1 contributor -> 4 queries; 3 segments/3 distinct origins/2 contributors each -> 4 queries") and `TestSegmentSlotRangeHasBoundedAssignmentStatements` ("one=15 hundred=15") — both PASS, byte-identical to SUMMARY claims |
| 11 | P156-18: admin can cleanly set/correct the segment Origin and the segment-contributor subset without unnecessary forced interaction; no UI redesign; public visibility rules unchanged | **PARTIAL — automated evidence VERIFIED, live-UI acceptance still OPEN** | Backend+frontend implementation and every automated regression test pass (see rows above and Anti-Patterns/Requirements sections); however the phase's own acceptance bar (156-UAT.md GAP-02, 14-item bundled live-admin-browser checklist) has NOT been fully and correctly completed — see Human Verification section. `STATE.md` itself states: "Phase 156 gilt NICHT als vollstaendig abgenommen." |
| 12 | P156-19: full test matrix green (lifecycle/project-page/release-page/credits incl. encoder/QC negative cases); migration/backfill verified; Vorher/Nachher report; clean working tree | VERIFIED | `git status --short` clean; `docs/audits/2026-09-11-segment-domain-consistency/` (4-file REPORT/REPRODUCE/TABLES/VALIDATION) present; full live-rerun of `go build ./...`, `go vet ./...`, and `go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/...` in this session: `internal/handlers` and `internal/permissions` 100% green, `internal/repository` shows exactly 50 `--- FAIL` entries name-identical to the SUMMARY's documented pre-existing/environmental set (35 `TEAM4S_PHASE128_TEST_DSN`-missing, 9 `TestPhase134Matrix*` live-Keycloak-dependent, 6 unrelated pre-existing bugs in untouched files) — zero new failures |
| 13 | GAP-04 (156-UAT.md): Origin invariant ("Origin is either NULL or a currently assigned release version") holds after EVERY write operation, including manual single assign/unassign, not just range sync/create/auto-assign | VERIFIED | `ensureThemeSegmentOriginTx` now wired into all 5 direct writers of `theme_segment_assignments` (`grep` confirms): range-sync insert+delete (1 call site, same function), `CreateAnimeSegment`'s implicit branch, `episode_import_repository_release_autoassign.go`, `AssignThemeSegmentToReleaseVersion`, `UnassignThemeSegmentFromReleaseVersion` (CR-01 fix). Live-rerun of the 3 new CR-01 regression tests (`TestAssignThemeSegmentToReleaseVersionSetsOriginOnFreshSegment`, `TestUnassignThemeSegmentFromReleaseVersionClearsOriginAndContributorsOnLastAssignment`, `TestUnassignThemeSegmentFromReleaseVersionNeverOverwritesValidOriginOnDifferentRelease`) — all PASS. Live `team4s_v2`: 0 invariant violations (both classes) confirmed in this session |
| 14 | GAP-05 (156-UAT.md): new segments with assignments get an origin automatically; a NULL origin gets set once an auto-assigned release arrives; a valid origin is never overwritten; migration repairs the 3 proven live rows | VERIFIED | Live `team4s_v2` query in this session: segments 1/2 unchanged (27/27), segment 3 repaired 29→40, segments 4/5 repaired NULL→28/NULL→42 — byte-identical to 156-16-SUMMARY.md's claimed before/after table. `TestThemeSegmentOriginMigrationRepair`/`TestThemeSegmentOriginRuleEquivalence` PASS live in this session |

**Score:** 18/19 fully VERIFIED; 1/19 (P156-18) technically VERIFIED but administratively blocked on an
outstanding human-UAT acceptance step the phase itself has never claimed as closed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `database/migrations/0161_theme_segments_origin_release_version.up/down.sql` | origin column + backfill | VERIFIED | present, applied (`schema_migrations` row 161) |
| `database/migrations/0162_theme_segment_contributors.up/down.sql` | contributor subset table, no role_code | VERIFIED | present, applied (`schema_migrations` row 162) |
| `database/migrations/0164_theme_segment_origin_repair.up/down.sql` | idempotent bulk repair | VERIFIED | present, applied (`schema_migrations` row 164, `applied_at 2026-09-14 14:38:40`); live-rerun of repair+equivalence tests PASS |
| `backend/internal/repository/theme_segment_origin_sync.go` | `ensureThemeSegmentOriginTx` central rule | VERIFIED | 150 lines, single central rule, wired into all 5 writers (see truth #13) |
| `backend/internal/repository/theme_segment_assignments.go` | reconciliation + CR-01-fixed assign/unassign | VERIFIED | 443/450 lines; `AssignThemeSegmentToReleaseVersion`/`UnassignThemeSegmentFromReleaseVersion` both transaction+lock+origin-sync wired |
| `backend/internal/repository/release_detail_public_repository_segment_credits.go` | origin-based dynamic credit projection | VERIFIED | present, exercised by live-rerun `TestReleaseDetailPublicSegmentOriginCredits` |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentContributorsField.tsx` | "Mitwirkende am Segment" multi-select, UI primitives only | VERIFIED | uses `Switch`/`SectionHeader`/`EmptyState` from `@/components/ui`, correct umlauts ("Mitwirkende", "gewählte") |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` / `SegmenteTab.tsx` | at/under 450 lines | VERIFIED | 375 / 438 lines respectively (both under cap; the 733/827-line figures in `156-REVIEW.md` predate the 156-14 extraction) |
| `docs/audits/2026-09-11-segment-domain-consistency/` | Vorher/Nachher 4-file report | VERIFIED | present on disk |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `AssignThemeSegmentToReleaseVersion` | `ensureThemeSegmentOriginTx` | in-transaction call after successful assign | WIRED | confirmed in code + live test |
| `UnassignThemeSegmentFromReleaseVersion` | `ensureThemeSegmentOriginTx` | in-transaction call after successful delete, now with `lockSegmentAssignmentDomainTx` (WR-02 closed) | WIRED | confirmed in code + live test |
| `assignThemeSegmentToEpisodeRangeTx` | `ensureThemeSegmentOriginTx` | in-transaction call after reconciliation | WIRED | confirmed in code + live test |
| `CreateAnimeSegment` implicit-assignment branch | `ensureThemeSegmentOriginTx` | direct call after `assignThemeSegmentToReleaseVersionTx` | WIRED | confirmed in code |
| `autoAssignThemeSegmentsForNewReleaseVersion` | `ensureThemeSegmentOriginTx` | in-transaction call | WIRED | confirmed in code |
| `ensureThemeSegmentOriginTx` | `loadPublicEffectiveContributors` | contributor-cleanup lookup on origin change | WIRED | confirmed in code, exercised by Case-H/5 subtests |
| Migration 0164 | `ensureThemeSegmentOriginTx`'s recompute rule | literal SQL/Go rule-equivalence, proven by dedicated test | WIRED | `TestThemeSegmentOriginRuleEquivalence` PASS |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `SegmentContributorsField.tsx` | `candidates` prop | `getThemeSegmentContributorCandidates` -> GET `/admin/.../segments/:id/contributors` -> `ListThemeSegmentContributorCandidates` -> `loadPublicEffectiveContributors` against live Origin | FLOWING | confirmed via code trace; backend function is DB-query-backed, not a static stub |
| Public release page participants | `PublicReleaseContributor[]` | `loadReleaseSegments` -> `applySegmentOriginCredits` -> `loadPublicEffectiveContributors` intersected with `theme_segment_contributors` selection | FLOWING | confirmed live in `team4s_v2`: Release 29 correctly returns `participants: []` for Segment 4 (no origin, no selection) and a non-empty set is proven by the automated integration tests for segments that do have both |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live invariant: no dangling origin | `psql` count query against `team4s_v2` | 0 rows | PASS |
| Live invariant: no missing origin with assignments | `psql` count query against `team4s_v2` | 0 rows | PASS |
| Migration 0164 applied | `SELECT * FROM schema_migrations WHERE version=164` | row present, `applied_at 2026-09-14 14:38:40` | PASS |
| `go build ./...` / `go vet ./...` | inside `team4sv30-backend` container | clean, exit 0 | PASS |
| Working tree clean | `git status --short` | empty | PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` convention or explicit probe declaration exists for
this phase; verification instead relied on direct `go test` execution against real Postgres inside the
canonical Docker Compose environment (documented above), which is the project's established test
pattern for this subsystem.

### Requirements Coverage

| Requirement | Source Plan(s) | Description (ROADMAP.md) | Status | Evidence |
|---|---|---|---|---|
| P156-01 | 156-02 | Assignments are the canonical release<->segment truth | SATISFIED | Truth #1 |
| P156-02 | 156-02 | Range change determines a target set; shrink/grow reconcile | SATISFIED | Truth #1 |
| P156-03 | 156-02 | Overrides protected; incomplete range deletes nothing | SATISFIED | Truth #1 |
| P156-04 | 156-03 | New release version auto-assigns into an existing range | SATISFIED | Truth #2 |
| P156-05 | 156-01, 156-16 | Stable Origin with deterministic backfill | SATISFIED | Truth #3, #14 |
| P156-06 | 156-04, 156-16 | Origin admin-correctable and validated | SATISFIED | Truth #4, #13 |
| P156-07 | 156-07, 156-12/13/14 | Dynamic credit projection from Origin | SATISFIED | Truth #5 |
| P156-08 | 156-01, 156-05, 156-07 | Stable role codes, no label heuristic | SATISFIED | Truth #5 |
| P156-09 | 156-05, 156-07 | Single central role definition, frontend gets projected credits | SATISFIED | Truth #5 |
| P156-10 | 156-06 | Project page derives from assignments, first-occurrence | SATISFIED | Truth #6 |
| P156-11 | 156-06 | Segment identity alone decides new timeline entry | SATISFIED | Truth #6 |
| P156-12 | 156-06 | Real follow-up segment creates new timeline entry | SATISFIED | Truth #6 |
| P156-13 | 156-07 | Release page shows all assigned segments, no suppression | SATISFIED | Truth #7 |
| P156-14 | 156-08 | Segment member clicks land on project-member route | SATISFIED | Truth #8 |
| P156-15 | 156-08 | Frontend has no own type classification world | SATISFIED | Truth #9 |
| P156-16 | 156-09 | No N+1, bundled query budget | SATISFIED | Truth #10 |
| P156-17 | 156-09 | Indices justified by query-plan evidence | SATISFIED | 156-09-SUMMARY.md documents captured EXPLAIN plans (not independently re-run this session; no code touched this by 156-16) |
| P156-18 | 156-04, 156-11 | Admin can cleanly set/correct Origin + contributor subset | **NEEDS HUMAN** | Truth #11 — automated evidence complete, live-UAT acceptance (GAP-02) still open |
| P156-19 | 156-10, 156-15, 156-16 | Full test matrix, migration verified, clean tree, audit report | SATISFIED | Truth #12 |

**Requirements-tracking gap (pre-existing, not introduced by this run):** `REQUIREMENTS.md` has no
"Phase 156" section at all (unlike Phases 151/152/155/158/159, which each got one). Every one of the
16 plans' own SUMMARY.md files independently notes that `requirements.mark-complete` found no
matching line in `REQUIREMENTS.md` for any P156-xx ID ("dieselbe uebergreifende Tracking-Luecke",
documented starting with 156-04-SUMMARY.md and repeated through 156-16). `ROADMAP.md` (lines
1537-1570) is the only place the full P156-01..P156-19 definitions and phase-goal mapping live. This
is a real traceability gap against `REQUIREMENTS.md`'s own convention for other phases, but it is a
pre-existing, already-acknowledged documentation gap, not a new defect from this run, and does not by
itself indicate any missing implementation — every requirement text was independently traced against
code in this report's Observable Truths section above. **Recommendation:** before declaring Phase 156
fully closed, add a "Phase 156 — Additive scope" section to `REQUIREMENTS.md` mirroring the Phase
151/152/155 convention, so `requirements.mark-complete` has something to mark.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/repository/admin_content_anime_themes.go` | whole file, 2459 lines | Exceeds CLAUDE.md's 450-line production-file cap by ~5.5x | WARNING (pre-existing, documented) | `156-REVIEW.md` WR-03: pre-existing debt, this plan's own new logic correctly kept out of it (only ~10 lines of origin-wiring added), explicitly deferred with a recommended follow-up split — not a regression introduced by this phase, but still an open modularity violation |
| `assignThemeSegmentToReleaseVersionTx` (`theme_segment_assignment_slots.go`) | 114-150 | Origin-sync invariant is bolted onto named call sites rather than owned by the shared low-level mutator itself | WARNING (accepted residual risk) | `156-REVIEW.md` WR-01: deliberately not generalized to avoid a redundant double-call in `CreateAnimeSegment`; a hypothetical future third caller of this helper would need to remember the invariant itself — documented, not a currently-exploitable gap (only 2 callers exist today, both correctly wired) |
| REQUIREMENTS.md | n/a | No "Phase 156" section exists | WARNING (pre-existing, documented repeatedly) | See Requirements Coverage section above |

No `TBD`/`FIXME`/`XXX` unresolved debt markers found in the files touched by Plan 156-16 or its CR-01
follow-up (`theme_segment_assignments.go`, `theme_segment_origin_sync.go`, migration 0164, associated
tests) — confirmed via direct grep during this review.

### Human Verification Required

### 1. GAP-02 items 10-13 (public-page rendering after selection)

**Test:** Open `http://127.0.0.1:3300` as a platform admin. Pick a segment that HAS an origin AND at
least one saved `theme_segment_contributors` selection (e.g. segment 3, which the 2026-09-14 session
already used for items 1-9). View that segment's origin release version's public release-detail page.
Confirm: the selected contributor(s) appear; any non-selected quality-checker on the same Origin does
NOT appear; a segment-contributor with role `editor` appears correctly if selected; a contributor with
role `encoder` never appears even if (hypothetically) selected.

**Expected:** Exactly the explicitly selected, segment-relevant-role contributors appear; encoder is
always excluded; non-selected same-role peers never leak through.

**Why human:** Requires an authenticated Team4s platform-admin browser session through the SSH tunnel;
this cannot be simulated by direct API calls per the phase's own explicit non-simulation rule
(`deferred-items.md`), and it is the specific item the 2026-09-14 live session could not judge because
it was run against the wrong segment/release combination (Segment 4 / Release 29, which has no origin
and no selection).

### 2. GAP-02 item 14, re-confirmation after the CR-01 fix

**Test:** Change a segment's assigned release versions via the manual "assign"/"unassign" admin
actions (not just a range save) and confirm the Origin and any Segment-Contributor selection remain
consistent (no dangling origin, no orphaned contributor row) in both the admin UI and the public page.

**Expected:** No inconsistent state ever becomes visible, exactly mirroring the already-passed range-
based case, but exercised through the two endpoints this session's CR-01 fix specifically touched.

**Why human:** Item 14 already passed once in the 2026-09-14 live session, but that pass predates
this run's CR-01 fix to the manual assign/unassign endpoints (the fix specifically targeted a defect
class only reachable through those two endpoints). The automated Postgres-level proof for this exists
and is green (see Truth #13), but the phase's stated acceptance gate for P156-18 is the live-admin-UI
pass, not the backend test alone.

### 3. GAP-02 items 11-12, live data gap

**Test:** Add a `quality_checker` and an `editor` contribution to Release 29 (or any Origin release
that currently lacks these roles per the 2026-09-14 diagnosis), then select/deselect them as
segment-contributors and confirm correct public rendering.

**Expected:** Selected QC/editor appear with correct role; non-selected QC does not appear.

**Why human:** `156-UAT.md`'s 2026-09-14 diagnosis found the tested release (29) has no QC/editor
contributions at all today, so items 11-12 could not be exercised even on the correct segment; this
requires live data setup plus the same authenticated browser session.

### Gaps Summary

No gaps were found that indicate a missing or broken implementation. Every P156-01..P156-17 and
P156-19 truth is independently VERIFIED against a live re-run of the automated evidence (real
Postgres, real `team4s_v2` data, real `go build`/`go vet`/`go test`), and this run's own claimed fix
(the GAP-04/GAP-05 origin-sync gap-closure, Plan 156-16, plus its CR-01 follow-up wiring the two
previously-missed manual assign/unassign endpoints) is confirmed correct and complete: all 5 direct
writers of `theme_segment_assignments` now invoke the single central `ensureThemeSegmentOriginTx`
rule, the live `team4s_v2` database shows zero invariant violations, and the full regression matrix
shows exactly the same 50 pre-existing/environmental failures as before this run's changes (zero new
failures).

The sole remaining item is P156-18's live-UAT acceptance step (`156-UAT.md` GAP-02), which the phase's
own tracking documents (`STATE.md`, `deferred-items.md`) have consistently and correctly refused to
claim as fully passed since Plan 156-11 first surfaced it — 9 of 14 items passed in the 2026-09-14
live session, but items 10-13 were tested against a segment/release combination that could not
exercise them, and item 14 predates this run's CR-01 fix. This is not a code defect; it is the
explicit, structurally-required human acceptance gate this phase has always routed to the
Auftraggeber, and this verification does not fabricate a pass for it.

---

*Verified: 2026-09-14T15:11:11Z*
*Verifier: Claude (gsd-verifier)*

## Live-Abnahme 2026-09-15

Die unter „Human Verification Required" gefuehrten drei Punkte wurden am 2026-09-15 vom Auftraggeber
live abgenommen („uat passt"), siehe `156-HUMAN-UAT.md` (status: passed). Damit ist P156-18 VERIFIED
und die Phase 19/19.

Nachtraegliche Gap-Schliessungen vor der Abnahme: GAP-08 (Plan 156-19) und GAP-09 (Plaene 156-20 bis
156-22). GAP-09 ersetzt ausdruecklich die in diesem Bericht zitierte Erwartung „encoder never appears as
a segment credit": Encoder und Designer sind jetzt Segment-Credits, sichtbar nur bei manueller Auswahl,
nie vorausgewaehlt. Eigene Nachpruefung am 2026-09-15: `internal/permissions` SegmentCredit-Tests 7/7
gruen, 10 GAP-09-Repository-Integrationstests gegen Postgres gruen, Migration 0165 unveraendert,
oeffentliche API von Release 27 zeigt die neuen Beschriftungen.
