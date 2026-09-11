---
phase: 156
slug: segment-domain-konsistenz-und-oeffentliche-release-projektion
status: executed-automatable-scope-only
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-11
---

# Phase 156 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Go `testing` + `github.com/stretchr/testify` (require) |
| **Config file** | none — plain `go test`, gated by env-var DSN presence for Postgres-backed tests |
| **Quick run command** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go build ./... && go vet ./...` |
| **Full suite command** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -e TEAM4S_PHASE117_TEST_DSN="$DSN" -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... ./internal/handlers/... -count=1` |
| **Framework (frontend)** | Vitest 3, `frontend/vitest.config.ts` |
| **Quick run command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test -- ThemeTimeline"` |
| **Estimated runtime** | ~60-120s backend integration suite, ~20s frontend Vitest suite |

---

## Sampling Rate

- **After every task commit:** `go build ./... && go vet ./...` plus the specific `-run` targeted test for the function just changed.
- **After every plan wave:** Full `go test ./internal/repository/... ./internal/handlers/... -count=1` with `TEAM4S_PHASE117_TEST_DSN` set (Postgres-gated tests execute, not skip).
- **Before `/gsd:verify-work`:** Full backend suite green + frontend `ThemeTimeline` Vitest suite green.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 156-02-T1 | 156-02 | 1 | P156-01/P156-02/P156-03 | T-156-03/T-156-04/T-156-05 | Reconciling sync inserts missing, deletes excess, never wipes on incomplete range, skips override-protected | integration | `go test ./internal/repository/... -run TestAssignThemeSegmentToEpisodeRange -count=1` | ✅ extends existing `theme_segment_assignments_integration_test.go` | ✅ green (156-10, re-run 2026-09-11: all subtests PASS against real Postgres) |
| 156-03-T1 | 156-03 | 1 | P156-04 | T-156-07/T-156-08 | New release version inside existing segment range auto-assigns, both orderings, multi-group bundling | integration | new `go test ./internal/repository/... -run TestAutoAssign -count=1` | ✅ `episode_import_repository_autoassign_test.go` (156-03) | ✅ green (156-10, re-run 2026-09-11: 4/4 subtests PASS against real Postgres) |
| 156-04-T1 | 156-04 | 2 | P156-05/P156-06 | T-156-02 | Origin backfill deterministic (Plan 156-01), correction validated against actual assignment (Plan 156-04) | integration | new `go test ./internal/repository/... -run TestThemeSegmentOrigin -count=1` | ✅ `theme_segment_origin_integration_test.go` (156-04) | ✅ green (156-10, re-run 2026-09-11: `TestSetThemeSegmentOrigin` all subtests PASS; migration 0161 down/up round-trip re-verified against live `team4s_v2`, backfill byte-identical) |
| 156-05-T1 + 156-07-T1 | 156-05, 156-07 | 2, 3 | P156-07/P156-08/P156-09 | T-156-01/T-156-13 | Translator/Timer/KaraokeFX/Typesetting projected; Encoding/QC excluded; no label heuristic | unit + integration | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -count=1` (extend) + `segment_credit_role_filter_test.go` (Plan 156-09) | ✅ extend existing files | ✅ green (156-10, re-run 2026-09-11: `TestResolvePublicEffectiveContributors_*`, `TestReleaseDetailPublicSegmentOriginCredits` incl. encoder/QC negative-case subtest, `TestSegmentCreditRoleFilter` all PASS) |
| 156-06-T2 | 156-06 | 1 | P156-10/P156-11 | T-156-09/T-156-10 | Project page: first occurrence only (pagination-safe, global); credit/member/role/timing changes do not create new timeline entry | integration | new `go test ./internal/repository/...` against `group_repository_cursor_timeline_test.go` -count=1 | ✅ `group_repository_cursor_timeline_test.go` (156-06) | ✅ green (156-10, re-run 2026-09-11: `TestAttachReleaseTimelineSegments`, 4/4 subtests PASS) |
| 156-06-T2 + 156-07-T1 | 156-06, 156-07 | 1, 3 | P156-12 | — | True follow-on segment (own ID/range/origin) creates new timeline entry, replaces predecessor on its release pages | integration | `group_repository_cursor_timeline_test.go` (project side) + `release_detail_public_segments_integration_test.go` (release side, no-suppression) | ✅ both files exist (156-06 / 156-07) | ✅ green (156-10, re-run 2026-09-11: project-side and release-side subtests both PASS) |
| 156-07-T2 | 156-07 | 3 | P156-13 | — | Release page shows segment used since Folge 1 on Folge 5 (no suppression), with range/origin labeling | integration | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -count=1` (extend, suppression subtest replaced, range/origin-label assertions added) | ✅ extend existing `release_detail_public_segments_integration_test.go` | ✅ green (156-10, re-run 2026-09-11: `TestReleaseDetailPublicSegments` all 3 subtests PASS, incl. "D-02 aufgehoben" no-suppression case) |
| 156-08-T2 | 156-08 | 4 | P156-14 | T-156-16 | Segment member links resolve to project member route | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test `ThemeTimeline.test.tsx` | ✅ green (156-10, re-run 2026-09-11: 23/23 `ThemeTimeline.test.tsx` PASS) |
| 156-08-T2 | 156-08 | 4 | P156-15 | — | `ThemeTimeline` renders canonical backend type, no own type-derivation logic remains | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test `ThemeTimeline.test.tsx` | ✅ green (156-10, re-run 2026-09-11: same 23/23 run, incl. `KARAAGE` no-heuristic regression case) |
| 156-09-T1 | 156-09 | 4 | P156-16/P156-17 | T-156-17 | No N+1 on bundled segment/origin/credit load; new index only with query-plan evidence | integration | new query-budget test, `queryCounter` pattern, sibling to `fansub_project_resolver_query_budget_test.go` | ✅ `segment_origin_query_budget_test.go` (156-09) | ✅ green (156-10, re-run 2026-09-11: `TestLoadReleaseSegmentsQueryBudgetIsConstant` PASS, pinned constant 3 re-confirmed; EXPLAIN evidence for `idx_theme_segments_origin_release_version` unchanged from 156-09-SUMMARY.md, not re-captured) |
| 156-04-T2 + 156-11-T1 | 156-04, 156-11 | 2, 3 | P156-18 | T-156-02/T-156-11/T-156-15 | Admin origin-correction validated (target must already be assigned), existing permission gate unchanged, minimal frontend control | integration + handler + manual | new handler test `admin_content_anime_theme_segment_origin_test.go` + Plan 156-11 checkpoint:human-verify | ✅ `admin_content_anime_theme_segment_origin_test.go` (156-04); frontend control shipped (156-11 Task 1, commit `d6edc718`) | ⚠️ PARTIAL — automatable half (156-04-T2 handler test) ✅ green (re-run 2026-09-11: `TestSetAnimeSegmentOrigin_*` all PASS); 156-11-T1's `checkpoint:human-verify` remains ⬜ OPEN — no platform-admin browser session available in any execution environment to date; see `deferred-items.md`. This row is NOT closed until the operator performs the live-UAT pass. |
| 156-10-T1/T2 | 156-10 | 5 | P156-19 | T-156-18 | Encoding/QC never appear as segment credits (negative case); full matrix; migration/backfill verified; audit report produced | unit + integration + manual | full suite green (Task 1) + audit report (Task 2), citing `segment_credit_role_filter_test.go` (Plan 156-09) | ✅ `docs/audits/2026-09-11-segment-domain-consistency/{REPORT,REPRODUCE,TABLES,VALIDATION}.md` | ✅ green for the automatable scope (full backend/frontend matrix green, migration round-trip re-verified, audit report produced) — see `156-10-SUMMARY.md`. Phase 156 as a whole is **not** fully accepted: row 156-04-T2+156-11-T1 (P156-18) has one explicit open item (live-UAT), see `deferred-items.md`. |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⚠️ PARTIAL = automated portion green, one item explicitly open (see note)*

## Phase Close-Out Note (156-10, 2026-09-11)

Every row above whose Automated Command was re-executed during Plan 156-10 passed, and the four
Wave-0-flagged test files (`episode_import_repository_autoassign_test.go`,
`theme_segment_origin_integration_test.go`, `group_repository_cursor_timeline_test.go`,
`segment_origin_query_budget_test.go`) now exist and are green, closing the Wave 0 Requirements
section below. **One row remains explicitly open, not green:** P156-18's live-browser checkpoint
(Plan 156-11, Task 2) could not be performed in any execution environment used across this phase's
plans — no platform-admin Keycloak session was available. Phase 156 is therefore closed as
**functionally and automatedly complete, with one explicit outstanding manual verification item**,
not as fully verified/accepted. See `docs/audits/2026-09-11-segment-domain-consistency/REPORT.md`
and `deferred-items.md` for the full accounting.
*Real plan/task IDs and wave numbers filled in by the planner (2026-09-11) -- see 156-01 through 156-11-PLAN.md.*

---

## Wave 0 Requirements

- [x] Plan 156-06 creates `group_repository_cursor_timeline_test.go` -- first dedicated test file for `attachReleaseTimelineSegments` (confirmed: research found none pre-existing). Re-run 2026-09-11 (156-10): green.
- [x] Plan 156-09 creates `segment_origin_query_budget_test.go` -- new query-budget test file for the bundled segment+origin+credit load, sibling to `fansub_project_resolver_query_budget_test.go`. Re-run 2026-09-11 (156-10): green.
- [x] Plan 156-03 creates `episode_import_repository_autoassign_test.go` -- new test file for Workstream B's auto-assignment-on-creation behavior, both orderings and multi-group case. Re-run 2026-09-11 (156-10): green.
- [x] Plan 156-04 creates `theme_segment_origin_integration_test.go` + `admin_content_anime_theme_segment_origin_test.go` -- new test coverage for Workstream C (origin membership validation + admin endpoint). Re-run 2026-09-11 (156-10): green.
- [x] Plan 156-09 creates `segment_credit_role_filter_test.go` -- new table-driven test for the central segment-relevant role-code filter (Encoding/QC negative case). Re-run 2026-09-11 (156-10): green.
- [x] Plan 156-10 Task 1 confirms `TEAM4S_PHASE117_TEST_DSN`'s backing database actually exists on `team4s-linux` as part of the final full-suite run -- confirmed as `team4s_phase117_test_156` (the actual database name used by this table family since 156-02, per every prior 156-*-SUMMARY.md), not the generic `team4s_phase117_test` this row originally named; all Phase-156 Postgres-gated tests ran against it and passed, none skipped.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin segment-management origin-setting UX has no unnecessary mandatory interaction | P156-18 | No UI-Redesign scope + subjective "not annoying" quality bar not automatable | Open admin segment editor in browser via SSH tunnel (`http://127.0.0.1:3300`), create/edit a segment, confirm origin can be set/corrected without a forced extra step blocking save. **STILL OPEN as of 156-10 (2026-09-11):** no platform-admin Keycloak session was available in this or any prior execution environment; the concrete test recipe (dataset `theme_segment_id 3`, 5 checks) is recorded in `deferred-items.md` for the repo owner to run directly. |
| Vorher/Nachher audit report matches Phase 154/155 house style | P156-19 | Documentation format review, not code behavior | Diff structure against most recent Phase 154/155 audit report during phase close-out -- done in 156-10, see `docs/audits/2026-09-11-segment-domain-consistency/` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s (targeted re-runs during 156-10 completed in well under 120s each)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planning complete -- all rows mapped to real plan/task IDs (2026-09-11); wave_0_complete flipped to true in 156-10 (2026-09-11) once every Wave-0-flagged test file was confirmed present and green in the final full-matrix re-run. **Phase-level status is NOT "fully verified"** -- see the "Phase Close-Out Note" above and row P156-18: one `checkpoint:human-verify` item (Plan 156-11, Task 2) remains explicitly open pending the repo owner's live-UAT pass, per `deferred-items.md`.
