---
phase: 174
slug: modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 174 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Draft note:** this file is authored before the plan set exists (per `174-RESEARCH.md`'s
"Validation Architecture" section). The Per-Task Verification Map below uses Welle/D-xx rows as
placeholders since no REQ-IDs or task IDs exist yet for this phase — the planner/plan-checker must
revise this file with real plan IDs, wave numbers, and task IDs once plans are finalized, matching
the pattern established in `173-VALIDATION.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3.2.4 — `frontend/vitest.config.ts` (no experimental/native-runner flags) |
| **Framework (Backend)** | Go stdlib `testing` + `testify` (`backend/go.mod`), go1.25.13 |
| **Config file** | `frontend/vitest.config.ts`; backend has no separate test config (standard `go test`), but execution MUST follow CONTEXT.md's documented container-network protocol (`golang:1.25-alpine` in `team4s_default`, DSN from backend container) |
| **Quick run command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| **Quick run command (backend)** | `go test ./internal/<package>/... -run <TestName>` inside the documented protocol container |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` (358 `*.test.ts(x)` files) |
| **Full suite command (backend)** | `go test ./...` inside the documented protocol container |
| **Estimated runtime** | ~60-90s frontend full suite; backend full suite duration TBD until a clean baseline (excluding known pre-existing failures) is established in Welle 1 |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest/Go test for the touched file(s), plus
  `npx tsc --noEmit` + `npx eslint .` (frontend) or `go build ./...` (backend).
- **After every plan wave:** Full Vitest suite + full affected-package Go suite.
- **Before `/gsd:verify-work`:** Both full suites green, modulo the documented pre-existing
  baseline failures (see Wave 0 Requirements) which must not be mistaken for new regressions (D-19).
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | D-05/D-06/D-07 | — | Hotspot analysis artifact (`174-HOTSPOTS.md`) produced; no code change, no test gate | n/a (analysis only) | n/a | n/a | ⬜ pending |
| TBD | TBD | 2 | D-08/D-09/D-10/D-11/D-12 | T-174-02-01 | `@/lib/api` barrel re-export preserves all 371 exports and existing `vi.mock('@/lib/api', ...)` interception (133 test files) | unit/integration | `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` | ❌ W0 — canary barrel-import test does not exist yet | ⬜ pending |
| TBD | TBD | 3 | D-13/D-14 | — | `useAdminAnimeCreateController.test.ts` and `GroupMediaReviewSection.test.tsx` stay green after extraction; `fansubs/create/page.tsx` behavior preserved | unit (Vitest) | `npx vitest run <path>` | ❌ W0 — `fansubs/create/page.tsx` has no test file | ⬜ pending |
| TBD | TBD | 4 | D-15/D-16/D-17 | T-174-04-01 | Repository/handler split preserves exact query count and SQL semantics (no N+1 introduced); `admin_content_anime_themes.go` behavior preserved | unit/integration | documented container-network `go test` protocol | ❌ W0 — `admin_content_anime_themes.go` has no direct repository test | ⬜ pending |
| TBD | TBD | 5 | D-18 | — | CSS module split preserves visual equality (same classes, same cascade order) | manual (visual UAT) | browser before/after comparison on `:3300`/`:3000` | n/a — no automated visual-regression tooling in this repo | ⬜ pending |
| TBD | TBD | 6 | D-23/D-24 | — | Closing audit re-measures file sizes/exports/cycles/query counts against this research's baseline; `174-REPORT.md` produced | integration | same commands as Welle 1-5 + `npx madge --circular` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/admin/fansubs/create/page.test.tsx` — does not exist; needed before/alongside
  Welle 3 work on this 872-line, zero-test component (D-20).
- [ ] A repository-level test file for `admin_content_anime_themes.go` (e.g.
  `admin_content_anime_themes_test.go`) — does not exist; needed before Welle 4 work per D-20.
- [ ] One canary Vitest test exercising a real (non-mocked) import through the future `@/lib/api`
  barrel — needed as the first task of Welle 2, before the bulk split, to empirically confirm the
  barrel preserves `vi.mock('@/lib/api', ...)` interception semantics (D-10).
- [ ] An enumerated list of pre-existing baseline test failures (confirmed so far:
  `TestFansubRepository_PublicProfileSourceInvariants`; likely more in
  `phase134_verification_matrix*_test.go` due to Keycloak/network dependencies) — must be compiled
  once, under the documented container-network protocol, before Welle 1 concludes, so D-19's
  "baseline not new regression" rule has a concrete reference list.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSS module split preserves visual equality (D-18) | D-18 | No automated visual-regression tooling exists in this repo; specificity/cascade-order changes from module splitting are a rendering property, not a unit-testable one | Before/after screenshot comparison in browser via the `:3300`/`:3000` tunnel for each touched component, per CONTEXT.md's "Verifikation" protocol |
| Effective-rights/permissions behavior stays byte-for-byte identical through any Welle 4 repository/handler split touching `permissions.go`-adjacent code (D-01, D-04) | D-01/D-04 | Byte-for-byte SQL/logic equivalence across a file move is a structural diff property better caught by manual before/after SQL-text comparison than by unit tests alone | Diff the actual SQL text (not just "it compiles") for any permissions-adjacent file move during Welle 4 code review |
| Barrel re-export does not silently resolve a caller to a different implementation when two similarly-named functions land in different domain buckets (D-10) | D-10 | Import-resolution correctness across a full-repo split is a structural property | Full-repo grep diff of `import { X } from '@/lib/api'` call sites before/after the Welle 2 split, confirming the same `X` resolves to the same implementation |

*Note: all three rows above require human judgment because no automated tooling for visual
regression or cross-commit SQL/behavior diffing exists in this repo (confirmed by research) — not
because they're low-value.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — this is a draft written before the plan set exists; must be revised with
real plan IDs/wave numbers/task IDs once `/gsd:plan-phase 174` produces PLAN.md files (same
revision pattern as `173-VALIDATION.md`).
