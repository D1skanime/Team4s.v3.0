---
phase: 154
slug: aggregator-duplikate-bildbudget-und-viewer-aufloesung
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-10
---

# Phase 154 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 3 (`vitest run` via `npm test`) |
| **Framework (backend)** | Go `testing` + `testify` |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Config file (backend query-budget)** | none — env-var-gated (`TEAM4S_PHASE131_TEST_DSN`), test skips itself if unset |
| **Quick run command (frontend, touched files)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| **Quick run command (backend, touched package)** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... -run 'Phase131\|Phase154' -count=1` |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"` |
| **Full suite command (backend)** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine sh -c "go build ./... && go vet ./..."` (DSN-gated PostgreSQL tests need the fixture env var per package) |
| **Production build gate** | `docker compose build` exit 0 — never `exec … npm run build` (dirty `.next` volume produces false prerender errors, per CONTEXT.md/E2) |
| **Estimated runtime** | frontend full suite ~2-4 min in-container; backend build/vet ~1-2 min; `docker compose build` ~3-6 min |

---

## Sampling Rate

- **After every task commit:** the quick run command for the specific touched package/file (frontend Vitest file, or backend Go package with `-run 'Phase131|Phase154'`)
- **After every plan wave:** full frontend suite (`npm test`) + backend `go build && go vet` + the `TEAM4S_PHASE131_TEST_DSN`-gated query-budget test if the wave touched Workstream A
- **Before `/gsd:verify-work`:** full suite green + `docker compose build` exit 0
- **Max feedback latency:** ~360 seconds (bounded by `docker compose build`, only run at wave/phase gates, not per-task)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 154-A-* | TBD | TBD | P154-01 | — | 4 duplicate query pairs removed | unit (Go) | `go test ./internal/repository/... -run TestPhase131PublicProfileQueryBudgetIsConstant -count=1` (constant updated to new value) | ✅ `member_profile_query_budget_test.go` (update) | ⬜ pending |
| 154-A-* | TBD | TBD | P154-02 | — | Badges/Progress separation preserved, no forbidden patterns | code review + existing unit tests | `go test ./internal/repository/...` (badge/progress test siblings — confirm exact filenames at plan time) | ✅ (verify at plan time) | ⬜ pending |
| 154-A-* | TBD | TBD | P154-03 | — | Query-budget test on existing counter infra, new value documented as regression guard | unit (Go) | same as P154-01 | ✅ | ⬜ pending |
| 154-A-* | TBD | TBD | P154-04 | T-154-A-01 (info disclosure via DTO drift) | DTOs/visibility unchanged | contract/regression | existing public/owner DTO contract tests (e.g. `member_profile_public_repository_postgres_test.go`, `phase134_verification_matrix_access_test.go`) | ✅ (confirm coverage at plan time) | ⬜ pending |
| 154-B-* | TBD | TBD | P154-05 | — | No hero artwork at 0 projects | unit (Vitest) | `npx vitest run src/components/profile/AnimeProjectAchievementStage.test.tsx` (create if absent, mirror sibling gating tests) | ❌ Wave 0 — verify/create | ⬜ pending |
| 154-B-* | TBD | TBD | P154-06 | T-154-B-01 (unbounded-byte fallback = DoS-adjacent) | Bounded fallback, no retry loop, no layout shift | unit (Vitest) + manual/Playwright | `npx vitest run src/components/ui/ResponsiveImage.test.tsx` (extend); `AUDIT_FAIL_BADGES=1 node scripts/audit-public-member-performance.mjs` for byte-budget proof | ✅ verify exact test filename at plan time | ⬜ pending |
| 154-B-* | TBD | TBD | P154-07 | — | Animated avatar budget, mechanism choice justified | unit (Vitest) + documented rationale | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` (extend) | ✅ | ⬜ pending |
| 154-C-* | TBD | TBD | P154-08 | T-154-C-01 (info disclosure if slim endpoint over-shares) | No unnecessary full-profile fetch for edit link | unit (Vitest), assert fetch count/endpoint | `npx vitest run src/lib/useMemberViewer.test.ts src/app/members/[slug]/OwnProfileEditLink.test.tsx` | ✅ both exist — extend | ⬜ pending |
| 154-C-* | TBD | TBD | P154-09 | — | `getMemberProfile`/`useMemberViewer` thread `AbortSignal` | unit (Vitest) | new assertion in `useMemberViewer.test.ts` + extended `api.ts` signal-forwarding test | ✅ (extend) | ⬜ pending |
| 154-C-* | TBD | TBD | P154-10 | T-154-C-02 (stale/aborted request races `resolved`) | PMFE-10 invariant + auth-refresh unchanged | unit (Vitest), regression | full `useMemberViewer.test.ts` (8 cases) + `api.auth-refresh.test.ts` (25 cases) stay green | ✅ | ⬜ pending |
| 154-D-* | TBD | TBD | P154-11 | — | RCA-07 re-measured, documented (negative outcome allowed) | manual/scripted (Playwright), no automated assertion | `node scripts/audit-public-member-performance.mjs` | ✅ script exists | ⬜ pending |
| 154-D-* | TBD | TBD | P154-12 | — | Listener remainder investigated, documented (negative outcome allowed) | manual/scripted (Playwright), no automated assertion | `node scripts/audit-public-member-navigation-retention.mjs` | ✅ script exists | ⬜ pending |
| 154-E-* | TBD | TBD | P154-13 | — | Before/after audit doc; full suites + build green | full-suite gate | `npm test`, `npm run typecheck`, `npm run lint`, backend `go build`/`go vet`, `docker compose build` | ✅ all commands exist | ⬜ pending |
| 154-E-* | TBD | TBD | P154-14 | — | RCA-04 open; pre-existing defects named and abgegrenzt | documentation only | n/a — narrative verification against named files | n/a | ⬜ pending |
| 154-E-* | TBD | TBD | P154-15 | — | Owner-Ansicht eines versteckten Profils live bestätigt | human checkpoint | n/a — `checkpoint:human-verify`, not automatable, tunnel `http://127.0.0.1:3300` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs and wave assignment are TBD — the planner fills these in once PLAN.md files exist; this table's Req ID → Test Type/Command mapping is locked from research.*

---

## Wave 0 Requirements

- [ ] Confirm whether `frontend/src/components/profile/AnimeProjectAchievementStage.test.tsx` exists; if not, create it mirroring the hero-gating test cases of `ContributionAchievementStage`/`PointsAchievementStage`/`MembershipStage` (exact sibling filenames to be confirmed at plan time — research did not exhaustively enumerate every `.test.tsx` in that directory)
- [ ] Confirm `TEAM4S_PHASE131_TEST_DSN` fixture database exists on `team4s-linux`; if missing, create via schema-only restore per the query-budget test file's own header-comment instructions
- [ ] Confirm the exact backend badge/progress unit test filenames that must stay green for P154-02 (research located the production files but not every `_test.go` sibling)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Owner-Ansicht eines versteckten Profils | P154-15 | Requires `crypto.subtle` in a Secure Context via the human-operated tunnel `http://127.0.0.1:3300`; cannot be automated or self-approved by an agent | Log in as the profile owner through the tunnel, navigate to the own hidden profile, confirm owner-only UI renders correctly; human operator confirms explicitly — not an agent checkpoint |
| RCA-07 / listener-remainder outcome interpretation | P154-11, P154-12 | Numeric measurement is scriptable, but judging whether the resulting numbers "justify further investigation" (per CONTEXT.md) vs. documenting a negative outcome is a judgment call, not a pass/fail assertion | Run the audit scripts, compare to REPORT.md/153-AFTER.md baselines, document the delta and the investigate-further-or-not decision with its rationale |
| Visual regression for locked-artwork gating (B1) and bounded image fallback (B2) | P154-05, P154-06 | Visual correctness of "no oversized hero artwork" / "no layout shift" needs pixel evidence, not just a passing unit assertion | Playwright screenshots via `frontend/scripts/shot.mjs` in the `team4sv30-frontend` container only — the embedded browser panel's white-screenshot-after-scroll artifact is not valid evidence (E7) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 360s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
