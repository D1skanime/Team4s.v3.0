---
phase: 156
slug: segment-domain-konsistenz-und-oeffentliche-release-projektion
status: draft
nyquist_compliant: false
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
| TBD-A | TBD | TBD | P156-01/P156-02/P156-03 | T-156-01 | Reconciling sync inserts missing, deletes excess, never wipes on incomplete range, skips override-protected | integration | `go test ./internal/repository/... -run TestAssignThemeSegmentToEpisodeRange -count=1` | ✅ extend existing `theme_segment_assignments_integration_test.go` | ⬜ pending |
| TBD-B | TBD | TBD | P156-04 | — | New release version inside existing segment range auto-assigns, both orderings | integration | `go test ./internal/repository/... -run TestUpsertImportReleaseGraph.*AutoAssign -count=1` | ❌ Wave 0 — new test | ⬜ pending |
| TBD-C | TBD | TBD | P156-05/P156-06 | T-156-02 | Origin backfill deterministic, correction validated against actual assignment | integration | new `go test ./internal/repository/... -run TestThemeSegmentOrigin -count=1` | ❌ Wave 0 — new test | ⬜ pending |
| TBD-D | TBD | TBD | P156-07/P156-08/P156-09 | T-156-03 | Translator/Timer/KaraokeFX/Typesetting projected; Encoding/QC excluded; no label heuristic | unit + integration | `go test ./internal/repository/... -run TestLoadPublicEffectiveContributors -count=1` + `-run TestReleaseDetailPublicSegments -count=1` (extend) | ✅ extend existing files | ⬜ pending |
| TBD-E | TBD | TBD | P156-10/P156-11 | — | Project page: first occurrence only; credit/member/role/timing changes do not create new timeline entry | integration | new `go test ./internal/repository/... -run TestAttachReleaseTimelineSegments -count=1` | ❌ Wave 0 — confirm no existing test file via `find` at plan time | ⬜ pending |
| TBD-F | TBD | TBD | P156-12 | — | True follow-on segment (own ID/range/origin) creates new timeline entry, replaces predecessor on its release pages | integration | extend `TestAttachReleaseTimelineSegments` | ❌ Wave 0 | ⬜ pending |
| TBD-G | TBD | TBD | P156-13 | — | Release page shows segment used since Folge 1 on Folge 5 (no suppression), with range/origin labeling | integration | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -count=1` (extend, remove suppression-asserting subtest, add range/origin-label assertions) | ✅ extend existing `release_detail_public_segments_integration_test.go` | ⬜ pending |
| TBD-H | TBD | TBD | P156-14 | — | Segment member links resolve to project member route | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test (confirm at plan time) | ⬜ pending |
| TBD-I | TBD | TBD | P156-15 | — | `ThemeTimeline` renders canonical backend type, no own type-derivation logic remains | unit | frontend Vitest on `ThemeTimeline` | ✅ extend existing frontend test | ⬜ pending |
| TBD-J | TBD | TBD | P156-16/P156-17 | — | No N+1 on bundled segment/origin/credit load; new index only with query-plan evidence | integration | new query-budget test, `queryCounter` pattern, sibling to `fansub_project_resolver_query_budget_test.go` | ❌ Wave 0 — new file | ⬜ pending |
| TBD-K | TBD | TBD | P156-18 | — | Admin origin-correction validated (target must already be assigned), existing permission gate unchanged | integration | new/extended handler test on admin segment endpoints | ❌ Wave 0 — confirm existing handler test coverage at plan time | ⬜ pending |
| TBD-L | TBD | TBD | P156-19 | — | Encoding/QC never appear as segment credits (negative case); full matrix; migration/backfill verified; audit report produced | unit + integration + manual | table-driven test on new `SegmentCreditRoleCodes` filter + full suite green | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders (`TBD-*`) — the planner fills in real plan/task IDs and wave numbers when PLAN.md files are created; this table's row set (one per requirement cluster) must be preserved.*

---

## Wave 0 Requirements

- [ ] Confirm (or create) a dedicated test file for `attachReleaseTimelineSegments` (`group_repository_cursor.go`) — research found none; first-occurrence logic (new this phase) needs a home.
- [ ] New query-budget test file for the bundled segment+origin+credit load (Workstream G), sibling to `fansub_project_resolver_query_budget_test.go`.
- [ ] New or extended test file for Workstream B's auto-assignment-on-creation behavior, both orderings — confirm existence via `find backend/internal/repository -iname "*episode_import*apply*test*"` at plan time.
- [ ] New test coverage for Workstream C (origin backfill determinism + origin-correction validation).
- [ ] New table-driven test for the central segment-relevant role-code filter (Encoding/QC negative case).
- [ ] Confirm `TEAM4S_PHASE117_TEST_DSN`'s backing database (`team4s_phase117_test`) actually exists on `team4s-linux` before relying on it.

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

**Approval:** pending
