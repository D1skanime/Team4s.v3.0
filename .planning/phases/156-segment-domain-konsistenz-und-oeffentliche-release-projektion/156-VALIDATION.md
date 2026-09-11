---
phase: 156
slug: segment-domain-konsistenz-und-oeffentliche-release-projektion
status: planned
nyquist_compliant: true
wave_0_complete: false
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
| 156-02-T1 | 156-02 | 1 | P156-01/P156-02/P156-03 | T-156-03/T-156-04/T-156-05 | Reconciling sync inserts missing, deletes excess, never wipes on incomplete range, skips override-protected | integration | `go test ./internal/repository/... -run TestAssignThemeSegmentToEpisodeRange -count=1` | ✅ extends existing `theme_segment_assignments_integration_test.go` | ⬜ pending |
| 156-03-T1 | 156-03 | 1 | P156-04 | T-156-07/T-156-08 | New release version inside existing segment range auto-assigns, both orderings, multi-group bundling | integration | new `go test ./internal/repository/... -run TestAutoAssign -count=1` | ❌ Wave 0 — new file `episode_import_repository_autoassign_test.go` | ⬜ pending |
| 156-04-T1 | 156-04 | 2 | P156-05/P156-06 | T-156-02 | Origin backfill deterministic (Plan 156-01), correction validated against actual assignment (Plan 156-04) | integration | new `go test ./internal/repository/... -run TestThemeSegmentOrigin -count=1` | ❌ Wave 0 — new file `theme_segment_origin_integration_test.go` | ⬜ pending |
| 156-05-T1 + 156-07-T1 | 156-05, 156-07 | 2, 3 | P156-07/P156-08/P156-09 | T-156-01/T-156-13 | Translator/Timer/KaraokeFX/Typesetting projected; Encoding/QC excluded; no label heuristic | unit + integration | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -count=1` (extend) + `segment_credit_role_filter_test.go` (Plan 156-09) | ✅ extend existing files | ⬜ pending |
| 156-06-T2 | 156-06 | 1 | P156-10/P156-11 | T-156-09/T-156-10 | Project page: first occurrence only (pagination-safe, global); credit/member/role/timing changes do not create new timeline entry | integration | new `go test ./internal/repository/...` against `group_repository_cursor_timeline_test.go` -count=1 | ❌ Wave 0 — new file `group_repository_cursor_timeline_test.go` | ⬜ pending |
| 156-06-T2 + 156-07-T1 | 156-06, 156-07 | 1, 3 | P156-12 | — | True follow-on segment (own ID/range/origin) creates new timeline entry, replaces predecessor on its release pages | integration | `group_repository_cursor_timeline_test.go` (project side) + `release_detail_public_segments_integration_test.go` (release side, no-suppression) | ❌ Wave 0 (project side) / ✅ extend (release side) | ⬜ pending |
| 156-07-T2 | 156-07 | 3 | P156-13 | — | Release page shows segment used since Folge 1 on Folge 5 (no suppression), with range/origin labeling | integration | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -count=1` (extend, suppression subtest replaced, range/origin-label assertions added) | ✅ extend existing `release_detail_public_segments_integration_test.go` | ⬜ pending |
| 156-08-T2 | 156-08 | 4 | P156-14 | T-156-16 | Segment member links resolve to project member route | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test `ThemeTimeline.test.tsx` | ⬜ pending |
| 156-08-T2 | 156-08 | 4 | P156-15 | — | `ThemeTimeline` renders canonical backend type, no own type-derivation logic remains | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test `ThemeTimeline.test.tsx` | ⬜ pending |
| 156-09-T1 | 156-09 | 4 | P156-16/P156-17 | T-156-17 | No N+1 on bundled segment/origin/credit load; new index only with query-plan evidence | integration | new query-budget test, `queryCounter` pattern, sibling to `fansub_project_resolver_query_budget_test.go` | ❌ Wave 0 — new file `segment_origin_query_budget_test.go` | ⬜ pending |
| 156-04-T2 + 156-11-T1 | 156-04, 156-11 | 2, 3 | P156-18 | T-156-02/T-156-11/T-156-15 | Admin origin-correction validated (target must already be assigned), existing permission gate unchanged, minimal frontend control | integration + handler + manual | new handler test `admin_content_anime_theme_segment_origin_test.go` + Plan 156-11 checkpoint:human-verify | ❌ Wave 0 — new files | ⬜ pending |
| 156-10-T1/T2 | 156-10 | 5 | P156-19 | T-156-18 | Encoding/QC never appear as segment credits (negative case); full matrix; migration/backfill verified; audit report produced | unit + integration + manual | full suite green (Task 1) + audit report (Task 2), citing `segment_credit_role_filter_test.go` (Plan 156-09) | ❌ Wave 0 — new audit doc set | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Real plan/task IDs and wave numbers filled in by the planner (2026-09-11) -- see 156-01 through 156-11-PLAN.md.*

---

## Wave 0 Requirements

- [ ] Plan 156-06 creates `group_repository_cursor_timeline_test.go` -- first dedicated test file for `attachReleaseTimelineSegments` (confirmed: research found none pre-existing).
- [ ] Plan 156-09 creates `segment_origin_query_budget_test.go` -- new query-budget test file for the bundled segment+origin+credit load, sibling to `fansub_project_resolver_query_budget_test.go`.
- [ ] Plan 156-03 creates `episode_import_repository_autoassign_test.go` -- new test file for Workstream B's auto-assignment-on-creation behavior, both orderings and multi-group case.
- [ ] Plan 156-04 creates `theme_segment_origin_integration_test.go` + `admin_content_anime_theme_segment_origin_test.go` -- new test coverage for Workstream C (origin membership validation + admin endpoint).
- [ ] Plan 156-09 creates `segment_credit_role_filter_test.go` -- new table-driven test for the central segment-relevant role-code filter (Encoding/QC negative case).
- [ ] Plan 156-10 Task 1 confirms `TEAM4S_PHASE117_TEST_DSN`'s backing database (`team4s_phase117_test`) actually exists on `team4s-linux` as part of the final full-suite run.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin segment-management origin-setting UX has no unnecessary mandatory interaction | P156-18 | No UI-Redesign scope + subjective "not annoying" quality bar not automatable | Open admin segment editor in browser via SSH tunnel (`http://127.0.0.1:3300`), create/edit a segment, confirm origin can be set/corrected without a forced extra step blocking save |
| Vorher/Nachher audit report matches Phase 154/155 house style | P156-19 | Documentation format review, not code behavior | Diff structure against most recent Phase 154/155 audit report during phase close-out |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** planning complete -- all rows mapped to real plan/task IDs (2026-09-11); wave_0_complete flips to true once Plans 156-03/04/06/09 land their new test files during execution.
