---
phase: 155
slug: fansub-projektseite-read-model-und-query-budget
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 155 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` (backend); Vitest 3 (frontend) |
| **Config file** | `frontend/vitest.config.ts` (existing, unchanged) |
| **Quick run command (backend)** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... -run 'Resolver\|Contributors' -count=1` |
| **Quick run command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx src/components/fansubs/ProjectMemberRows.test.tsx"` |
| **Full suite command (backend)** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go build ./... && go test ./...` |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run && npx eslint ."` |
| **Estimated runtime** | ~90s backend, ~120s frontend |

---

## Sampling Rate

- **After every task commit:** Run the targeted `go test ./internal/repository/... -run '<NewTestName>'` and/or `npx vitest run <changed file>`
- **After every plan wave:** Run full backend `go build ./... && go test ./...` and full frontend `npx tsc --noEmit && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite green (backend + frontend) plus the mandated before/after audit document under `docs/audits/`
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 155-01-xx | TBD | 0 | P155-01 | V4/V5 | Resolver returns IDs/path from groupSlug+animeSlug; single neutral not-found response, no info leak | unit (Go httptest+fake repo) | `go test ./internal/handlers/... -run 'ProjectResolver' -count=1` | ❌ Wave 0 | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-02 | — | Single profile load per project page request; constant regardless of scale | integration (constant-query-budget) | `go test ./internal/repository/... -run 'ProjectResolverQueryBudget' -count=1` | ❌ Wave 0 | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-03/04 | — | Contributor summary query count constant across 30–50 seeded contributors | integration (constant-query-budget, extend existing scaffold) | `go test ./internal/repository/... -run 'GroupContributors.*Budget' -count=1` | ❌ Wave 0 (existing scoping tests, no budget test yet) | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-05 | — | Member click leads to project-member route, not `/members/[slug]`; href assertion, not just presence | unit (frontend, existing pattern) | `npx vitest run src/components/fansubs/ProjectMemberRows.test.tsx` | ✅ existing, extend | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-07/08 | — | Latest preview + history bounded, no duplicate fetch; Releases count exact-match old vs new for multi-version episode | unit (frontend loader test) + Go count-parity test | `npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx` | ✅ existing, extend | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-10 | — | No themes/media fetch; dead flags removed from loader contract (data-layer, not just render-layer) | unit (frontend, extend existing describe block) | `npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx -t "removed section surfaces"` | ✅ existing render-layer test, data-layer assertion is new | ⬜ pending |
| 155-01-xx | TBD | 0 | P155-13 | V4/V5 | Not-found / visibility edge cases (unknown groupSlug, unknown animeSlug, group exists project doesn't) | unit (Go httptest) | `go test ./internal/handlers/... -run 'ProjectResolver.*NotFound' -count=1` | ❌ Wave 0 | ⬜ pending |

*Task IDs are placeholders (TBD) — the planner assigns real plan/task IDs; this table's Req ID / Test Type / Command columns are authoritative and must be preserved when the planner fills in concrete IDs.*

---

## Wave 0 Requirements

- [ ] New resolver handler + repository + their tests (P155-01/02/13) — nothing exists yet, new file required (`fansub_repository.go` is already 2462 lines, do not extend it)
- [ ] Query-budget test for the resolver (Pattern 3 scaffold from `fansub_public_profile_query_budget_test.go` — needs its own DSN env var or confirmed reuse of `TEAM4S_PHASE152_TEST_DSN`/`team4s_phase152_test`)
- [ ] Query-budget/regression test locking in the already-lean contributor SQL (currently only scoping/behavior tests exist, no explicit "constant regardless of N" test)
- [ ] Synthetic data seeding for the 30–50 contributor load test (P155-04) and for realistic multi-project Previous/Next testing — dev DB has essentially none of this today
- [ ] Seeded case with an episode carrying two release versions, to test "old Releases count == new Releases count" (locked decision #2)

*`ProjectMemberRows.test.tsx` already covers the canonical-path/fallback href rule and does not need Wave 0 work. `PublicReleaseBlock`'s contributor row and `OlderReleasesList.rows.tsx`'s release rows currently render contributor names as non-interactive avatar initials, not links — P155-05 does not apply there today; no Wave 0 gap unless the planner adds member links to those surfaces (not requested).*

---

## Manual-Only Verifications

*None — all phase behaviors have automated verification. TTFB measurement (P155-14) uses the existing Playwright/CDP audit script (`frontend/scripts/audit-public-member-performance.mjs`, route-parameterized) rather than a manual step.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
