---
phase: 152
slug: public-fansub-gruppenseite-konsolidierung-und-modernisierung
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-08
---

# Phase 152 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Frontend: Vitest ^3.2.4, `@testing-library/react` ^16.3.0, `jest-axe` ^11.0.0. Backend: Go 1.25 stdlib `testing` + testify v1.9.0 |
| **Config file** | `frontend/vitest.config.ts` (setupFiles includes `src/test/axeSetup.ts`); backend — none, standard `go test ./...` |
| **Quick run command** | Frontend: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"`. Backend: Go container run against `team4s_phase152_test` DSN (documented Phase-131 pattern) |
| **Full suite command** | Frontend: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test && npm run typecheck && npm run lint"`. Backend: `go test ./...` inside `golang:1.25-alpine`, network `team4s_default` |
| **Estimated runtime** | ~90s frontend full suite, ~60s backend full suite |

---

## Sampling Rate

- **After every task commit:** Run the targeted `vitest run <file>` / `go test ./internal/<package>/...` for files touched by the task.
- **After every plan wave:** Run the full frontend suite (test + typecheck + lint) and the full backend suite (`go test ./...`).
- **Before `/gsd:verify-work`:** Full suite must be green, plus the Playwright visual matrix (P152-14) and the query-budget test (P152-09) both green.
- **Max feedback latency:** ~90 seconds.

---

## Per-Task Verification Map

See `152-RESEARCH.md` → "Validation Architecture → Phase Requirements → Test Map" for the full requirement-to-test mapping (all 14 REQ-IDs). The planner fills in the per-task ID/plan/wave columns below as PLAN.md files are created.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | P152-01 | — | N/A | smoke | `curl -sI '.../_next/image?url=...history-event-badges-transparent...'` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | P152-02 | — | N/A | unit | `vitest run FansubHistorySection.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-04 | — | N/A | unit | `vitest run FansubHistorySection.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-05 | — | N/A | unit | `vitest run FansubHistorySection.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-07 | — | N/A | integration | new `fansub_public_profile_query_budget_test.go` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | P152-08 | — | N/A | integration | same query-budget test as P152-07/09 | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | P152-09 | — | N/A | integration | `TEAM4S_PHASE152_TEST_DSN=... go test ./internal/repository/... -run QueryBudget` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | P152-10 | — | N/A | unit | `vitest run` + `npm run typecheck` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-11 | T-Tiptap-D1/D2 | Backend `ValidateJSON` rejects `link` mark; sanitizer `class`/`h1` hardened | unit | `go test ./internal/services/... -run TipTap` + `vitest run RichTextEditor.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-12 | — | N/A | unit (jest-axe) | `vitest run FansubHistorySection.test.tsx FansubGroupMediaBlock.test.tsx` | ❌ W0 (MediaBlock test) | ⬜ pending |
| TBD | TBD | TBD | P152-13 | — | N/A | unit | `vitest run page.test.tsx FansubHistorySection.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | P152-14 | — | N/A | manual + full suite | Full suite + Playwright visual matrix | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/internal/repository/fansub_public_profile_query_budget_test.go` — new file, follows `member_profile_query_budget_test.go`/`admin_users_query_budget_test.go` template, `TEAM4S_PHASE152_TEST_DSN` env var, `team4s_phase152_test` DB-name guard — covers P152-07/08/09. **Resolved:** folded into `152-08-PLAN.md`'s own task (creates the file directly) instead of a separate upfront Wave-0 plan.
- [x] `frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx` — does not exist yet; needed for P152-12's axe coverage and the media-thumbnail double-labeling fix (D3). **Resolved:** folded into `152-04-PLAN.md` Task 2, which creates this file as part of the media-block work it consumes.
- [x] `team4s_phase152_test` throwaway DB — schema-only `pg_dump` from `team4s_v2`, one-time setup. Created by `152-03-PLAN.md` Task 3 as part of its guarded-Postgres test setup.
- [x] No new test framework/config needed — Vitest, jest-axe, testify, and the query-counter harness are all already wired

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Viewport visual QA across 320/390/520/768/1024/1440/1920/2560 for Hero, Story, Projekte, Team, History, Media | P152-14 | Rendered appearance/layout judgment cannot be asserted meaningfully by unit tests | Playwright visual matrix per viewport list; temporary multi-entry History fixture (incl. `releases_10000`) seeded and removed per D10 |
| Image performance before/after measurement (History; Hero if changed) | P152-06 | Byte-size delta is a measurement, not a pass/fail unit assertion | `curl` byte-size capture using the same methodology as the audit's reference measurement (`member-achievement-badges` WebP comparison) |
| No `--history-badge-size`/`releases_10000` special sizing or unexplained pixel shifts | P152-03 | CSS-absence checks are brittle/low-value as automated tests | Visual QA viewport matrix confirms no regression in badge alignment/size |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — every task across all 10 plans carries a genuine `<automated>` command (or is
an exempt `checkpoint:*` task); the two originally-listed Wave 0 gaps were resolved by folding their
creation into the tasks that consume them (see `152-08-PLAN.md` and `152-04-PLAN.md` Task 2) rather
than as separate upfront Wave-0 plans.
