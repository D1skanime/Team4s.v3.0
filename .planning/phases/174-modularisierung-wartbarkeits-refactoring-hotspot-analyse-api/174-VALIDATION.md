---
phase: 174
slug: modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-04
revised: 2026-10-04
---

# Phase 174 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Revision note (2026-10-04):** this file originally shipped with `TBD` placeholders for every
`Plan`/`Wave`/`Task ID` column because it was authored before the plan set existed. The table below
now carries the real, final plan IDs and wave numbers for the complete 26-plan set (174-01 through
174-26), matching the revision pattern established in `173-VALIDATION.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3.2.4 — `frontend/vitest.config.ts` (no experimental/native-runner flags) |
| **Framework (Backend)** | Go stdlib `testing` + `testify` (`backend/go.mod`), go1.25.13 |
| **Config file** | `frontend/vitest.config.ts`; backend has no separate test config (standard `go test`), but execution MUST follow CONTEXT.md's documented container-network protocol (`golang:1.25-alpine` in `team4s_default`, DSN from backend container) |
| **Quick run command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| **Quick run command (backend)** | `go test ./internal/<package>/... -run <TestName>` inside the documented protocol container |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` (358 `*.test.ts(x)` files at phase start) |
| **Full suite command (backend)** | `go test ./...` inside the documented protocol container |
| **Estimated runtime** | ~60-90s frontend full suite; backend full suite duration includes the known pre-existing baseline failures enumerated in 174-01/`174-HOTSPOTS.md` |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest/Go test for the touched file(s), plus
  `npx tsc --noEmit` + `npx eslint .` (frontend) or `go build ./...` (backend).
- **After every plan wave:** Full Vitest suite + full affected-package Go suite.
- **Before `/gsd:verify-work`:** Both full suites green, modulo 174-01's documented pre-existing
  baseline failures (D-19), plus 174-26's final combined-gate + live 7-flow UAT.
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 174-01-T1/T2/T3 | 174-01 | 1 | D-05/D-06/D-07/D-19 | T-174-01-01 | `174-HOTSPOTS.md` produced with baseline measurements, pre-existing test-failure enumeration, P1/P2/P3 verdicts, D-07 verdicts | analysis (no code change) | n/a (artifact-existence + grep-section checks) | ✅ written in 174-01 | ⬜ pending |
| 174-02-T1/T2/T3 | 174-02 | 2 | D-08/D-09/D-10/D-11/D-12 | T-174-02-01/02 | `client.ts` carve-out + barrel-collision decision + canary test proving both `vi.mock` patterns survive | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-02 | ⬜ pending |
| 174-03-T1/T2/T3 | 174-03 | 3 | D-08/D-09/D-11/D-12 | T-174-02-01 | Admin anime/segments/episodes/users/fansub-members buckets relocated, barrel-wired | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-03 | ⬜ pending |
| 174-04-T1/T2/T3 | 174-04 | 4 | D-08/D-09/D-11/D-12 | T-174-02-01 | Fansubs/episodes/members/projects/contributions buckets relocated | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-04 | ⬜ pending |
| 174-05-T1/T2/T3 | 174-05 | 5 | D-08/D-09/D-11/D-12 | T-174-02-01/02 | Auth/permissions/reviews/history/search buckets relocated with verified zero-logic-change on auth/session cluster | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-05 | ⬜ pending |
| 174-06-T1/T2/T3 | 174-06 | 6 | D-08/D-09/D-11/D-12 | T-174-02-01 | Media/assets bucket triaged by consuming domain (not a new god-module) | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-06 | ⬜ pending |
| 174-07-T1/T2 | 174-07 | 7 | D-08/D-09/D-11/D-12 | T-174-02-01 | Remaining "other/unclear" 24 functions distributed via import-site grep evidence; api.ts left with only barrel re-exports | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-07 | ⬜ pending |
| 174-08-T1/T2 | 174-08 | 8 | D-08/D-09/D-10/D-11/D-12/D-24 | T-174-02-01/02 | Full-repo export-diff parity proof + 0 new madge cycles + full gate + prod build | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run && docker compose build team4sv30-frontend` | ✅ written in 174-08 | ⬜ pending |
| 174-09-T1/T2 | 174-09 | 9 | D-20/D-06 | — | Characterization suite for `fansubs/create/page.tsx` (previously 0 tests) | unit (Vitest) | `npx vitest run src/app/admin/fansubs/create/page.test.tsx` | ✅ written in 174-09 | ⬜ pending |
| 174-10-T1/T2/T3 | 174-10 | 9 | D-13/D-02/D-14/D-21 | T-174-03-02 | `useAdminAnimeCreateController` facade + Jellyfin/AniSearch sub-hooks, 1,032-line test suite unchanged | unit (Vitest) | `npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` | ✅ written in 174-10 | ⬜ pending |
| 174-11-T1/T2/T3 | 174-11 | 10 | D-13/D-02/D-14/D-21 | T-174-03-02 | Asset-staging + submit sub-hooks, full directory test suite unchanged | unit (Vitest) | `npx vitest run src/app/admin/anime/create/` | ✅ written in 174-11 | ⬜ pending |
| 174-12-T1/T2/T3 | 174-12 | 9 | D-14/D-02/D-21 | T-174-03-02 | `useGroupMediaReviewActions` hook extraction, 605-line test suite unchanged | unit (Vitest) | `npx vitest run src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` | ✅ written in 174-12 | ⬜ pending |
| 174-13-T1/T2/T3 | 174-13 | 10 | D-14/D-02/D-21 | T-174-03-02 | 5 presentational section components extracted, 605-line test suite unchanged, 0 new client boundaries | unit (Vitest) | `npx vitest run src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` | ✅ written in 174-13 | ⬜ pending |
| 174-14-T1/T2/T3 | 174-14 | 10 | D-14/D-02/D-20/D-21 | T-174-03-02 | Action hook + 3 section components extracted from `fansubs/create/page.tsx`, proven by 174-09's new suite | unit (Vitest) | `npx vitest run src/app/admin/fansubs/create/page.test.tsx` | ✅ written in 174-14 | ⬜ pending |
| 174-15-T1/T2 | 174-15 | 11 | D-20/D-06 | — | Repository-layer characterization tests for `admin_content_anime_themes.go` (previously 0 direct tests) | integration (real Postgres) | `go test ./internal/repository/... -run TestAdminContentAnimeThemes -v` | ✅ written in 174-15 | ⬜ pending |
| 174-16-T1/T2/T3 | 174-16 | 11 | D-15/D-17/D-02 | T-174-04-02 | `fansub_repository.go` Groups/Links/Aliases clusters split, `ANY($1)` batch pattern verified intact | integration (real Postgres) | `go build ./... && go test ./internal/repository/... -run TestFansubRepository -v` | ✅ written in 174-16 | ⬜ pending |
| 174-17-T1/T2/T3 | 174-17 | 12 | D-15/D-17/D-02/D-03 | T-174-04-01/02 | Public-profile/members/anime-links/merge clusters split; `TestFansubRepository_PublicProfileSourceInvariants` explicitly resolved | integration (real Postgres) | `go build ./... && go test ./internal/repository/... -v` | ✅ written in 174-17 | ⬜ pending |
| 174-18-T1/T2/T3 | 174-18 | 12 | D-15/D-17/D-02 | T-174-04-04/02 | `admin_content_anime_themes.go` split into 5 sibling files, 174-15's suite unchanged | integration (real Postgres) | `go test ./internal/repository/... ./internal/handlers/... -run "AdminContentAnimeTheme\|AdminContentAnimeSegment" -v` | ✅ written in 174-18 | ⬜ pending |
| 174-19-T1/T2 | 174-19 | 11 | D-15/D-07/D-17/D-02 | T-174-04-05 | `anime_assets.go` split by asset type, legacy/V2 pairs co-located (not merged) | integration (real Postgres) | `go build ./... && go test ./internal/repository/... -run TestAnimeAsset -v` | ✅ written in 174-19 | ⬜ pending |
| 174-20-T1/T2/T3 | 174-20 | 11 | D-16/D-17/D-02 | T-174-04-01/02 | `admin_content_release_version_media.go` remaining clusters split into 6 siblings, permission-annotation cluster diff-verified | integration | `go test ./internal/handlers/... -run "ReleaseVersionMedia" -v` | ✅ written in 174-20 | ⬜ pending |
| 174-21-T1/T2 | 174-21 | 13 | D-17/D-21 | T-174-04-02 | Welle-4 before/after query-count measurement across all D-17 risk areas touched | integration (live measurement) | `go test ./... -v` | ✅ written in 174-21 | ⬜ pending |
| 174-22-T1/T2/T3 | 174-22 | 14 | D-18/D-02 | — | `FansubEdit.module.css` split via grep-verified single-owner classification | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-22 | ⬜ pending |
| 174-23-T1/T2 | 174-23 | 14 | D-18/D-02 | — | `ui.module.css` split via grep-verified single-owner classification | unit/integration | `npx tsc --noEmit && npx eslint . && npx vitest run` | ✅ written in 174-23 | ⬜ pending |
| 174-24-T1 | 174-24 | 15 | D-18 | — | Manual visual-equality UAT for both Welle-5 CSS splits | manual (human-check) | browser tunnel verification, no automated command | ✅ written in 174-24 | ⬜ pending |
| 174-25-T1/T2 | 174-25 | 16 | D-23/D-24/D-21 | — | `174-REPORT.md` closing audit: before/after re-measurement, hotspot outcomes, D-24 exceptions, follow-up recommendations | integration (re-measurement) | re-run 174-01's measurement commands + grep-section checks on `174-REPORT.md` | ✅ written in 174-25 | ⬜ pending |
| 174-26-T1/T2 | 174-26 | 17 | D-01/D-19/D-21/D-23 | T-174-06-02 | Final combined automated gate + live 7-flow human UAT across the complete Phase 174 change set | integration + manual (human-check) | `npx tsc --noEmit && npx eslint . && npx vitest run && docker compose build team4sv30-frontend` (+ backend `go build ./... && go test ./...`) | ✅ written in 174-26 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All four Wave-0 gaps `174-RESEARCH.md` identified are now explicitly covered by in-plan ordering
rather than deferred:

- [x] `frontend/src/app/admin/fansubs/create/page.test.tsx` — covered by **174-09** (Wave 9), which
  runs strictly before **174-14**'s structural split of the same file (Wave 10, `depends_on: ["174-09"]`).
- [x] A repository-level test file for `admin_content_anime_themes.go` — covered by **174-15**
  (Wave 11), which runs strictly before **174-18**'s structural split (Wave 12, `depends_on: ["174-15"]`).
- [x] One canary Vitest test exercising a real (non-mocked) import through the future `@/lib/api`
  barrel — covered by **174-02** Task 3 (Wave 2), the first Welle-2 plan, before any domain-group
  migration begins.
- [x] An enumerated list of pre-existing baseline test failures — covered by **174-01** Task 1
  (Wave 1), which runs before every other plan in the phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSS module split preserves visual equality (D-18) | D-18 | No automated visual-regression tooling exists in this repo; specificity/cascade-order changes from module splitting are a rendering property, not a unit-testable one | **174-24**: before/after screenshot comparison in browser via the `:3300`/`:3000` tunnel, per CONTEXT.md's "Verifikation" protocol |
| Effective-rights/permissions behavior stays byte-for-byte identical through Welle-4 repository/handler splits touching rights-adjacent code (D-01, D-04) | D-01/D-04 | Byte-for-byte SQL/logic equivalence across a file move is a structural diff property better caught by manual before/after comparison than by unit tests alone | **174-17** Task 1 (public-profile cluster) and **174-20** Task 2 (permission-annotation cluster): explicit manual diff of moved function bodies against pre-move versions, documented in each plan's SUMMARY |
| Barrel re-export does not silently resolve a caller to a different implementation when two similarly-named functions land in different domain buckets (D-10) | D-10 | Import-resolution correctness across a full-repo split is a structural property | **174-08** Task 1: full-repo export-diff against git history, confirming the same name resolves to the same implementation after all of Welle 2 |
| Combined end-to-end system behavior across every Phase 174 change | D-01/D-19 | No single plan's automated suite exercises every touched flow together | **174-26** Task 2: live 7-flow human UAT after the final combined automated gate |

*Note: all four rows above require human judgment because no automated tooling for visual
regression or cross-commit SQL/behavior diffing exists in this repo (confirmed by research) — not
because they're low-value.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or an explicit `<human-check>` (174-24, 174-26 Task 2)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (see Wave 0 Requirements above — all 4 resolved via in-plan ordering)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** final — revised with the real 26-plan set's IDs, wave numbers, and task structure,
replacing the pre-planning draft (same revision pattern as `173-VALIDATION.md`).
