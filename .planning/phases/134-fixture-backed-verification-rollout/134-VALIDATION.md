---
phase: 134
slug: fixture-backed-verification-rollout
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-16
---

# Phase 134 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` (Postgres-backed, mandatory-DSN pattern) for backend; Vitest 3.2.4 for frontend |
| **Config file** | `backend/internal/migrations/runner_test.go` (unit-level, no DSN); `frontend/vitest.config.ts` |
| **Quick run command** | `docker compose exec -T team4sv30-backend go test ./internal/repository/... ./internal/migrations/... -run Phase134 -v -count=1` (once Wave 2/3 tests exist); `docker exec team4sv30-frontend npx vitest run <touched files>` |
| **Full suite command** | `scripts/phase134-green-gate.sh` (Plan 134-04) — backend build/vet/scoped-test, frontend typecheck/lint/scoped-test/build, `git diff --check`, with the `KNOWN_DEFERRED` allow-list for Phase 133's 9 pre-existing failures |
| **Estimated runtime** | ~90-150s per full-suite run (the ephemeral-DB migration proof and Postgres-backed matrix suite add real DB round-trips beyond Phase 133's ~60s baseline) |

---

## Sampling Rate

- **After every task commit:** Run the specific new test file/command the task introduced (mirrors every prior phase's task-scoped verification pattern).
- **After every plan wave:** Re-run that wave's full command set (e.g. all `TestPhase134...` matrix tests together for Wave 2; the fresh/up/down proof end-to-end for Wave 1).
- **Before `/gsd:verify-work`:** `scripts/phase134-green-gate.sh` (Plan 134-04) must be green, scoped to member-profile-relevant surfaces per the user-confirmed scope decision below — NOT the fully unscoped suite.
- **Max feedback latency:** ~90s per task-commit-scoped run.
- **Accepted latency exception:** The following commands routinely exceed 90s and are scoped to phase-gate/wave-merge frequency only (not per-task-commit — does not violate sampling continuity):
  - `frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check` (Plan 134-06 Task 1) — Playwright-driven image-waterfall re-measurement.
  - `backend/internal/migrations/fresh_proof_test.go`'s `TestPhase134MigrationFreshUpDownProof` (Plan 134-02 Task 2) — drives a real DROP DATABASE + full 145-pair up/down chain.
  - `scripts/provision-phase134-matrix-db.sh` (Plan 134-03 Task 1) — DB creation, full migration replay, temporary backend startup/health-poll, and a full seed run.
  - `scripts/capture-phase134-uat-evidence.mjs` (Plan 134-06 Task 1) — Playwright across 2 profiles x 3 viewports, each with a `networkidle` wait, full-page screenshot, and up to 15 keyboard Tab-press/style-inspection cycles.

---

## User-Confirmed Scope Decisions (2026-08-16)

- **D-08/PMQA-07 green-gate scope:** CONFIRMED scoped to member-profile-relevant tests (matches every prior phase's precedent). The ~9 pre-existing, out-of-scope stale-assertion failures documented in `.planning/phases/133-.../deferred-items.md` are NOT required to go green as part of Phase 134; they are flagged as an explicit `KNOWN_DEFERRED` note in the gate's output (Plan 134-04 Task 1), not silently fixed or silently ignored.
- **ROADMAP.md/STATE.md tracking drift:** CONFIRMED in scope — Phase 134 includes a small documentation-fix task (Plan 134-04 Task 3) correcting `ROADMAP.md`'s stale "Progress" table rows for Phases 129/130/131 and reconciling `STATE.md`'s `completed_phases` counter, per RESEARCH.md's "Ground Truth" findings. This is a cheap doc-only task, not part of PMQA-01..07's automated verification surface.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 134-01 T1 | 134-01 | 1 | PMQA-01 | T-134-01, T-134-03 | Seed's new media step uploads only the checked-in fixture image; public profile exposes a real member-owned story image | integration (script) | `docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed134.mjs && docker cp scripts/fixtures/seed134-story.jpg team4sv30-frontend:/tmp/seed134-story.jpg && docker exec team4sv30-frontend node /tmp/seed134.mjs` | ❌ new | ⬜ pending |
| 134-01 T2 | 134-01 | 1 | PMQA-02 | T-134-02 | Manifest is the single source; malformed/missing manifest fields fail loudly, never silently default | integration (script, fail-closed JSON parse) | manifest structural check + two consecutive seed runs (see plan `<verify>`) | ❌ new | ⬜ pending |
| 134-02 T1 | 134-02 | 1 | PMQA-03 | T-134-04, T-134-05 | Maintenance pool only ever connects to the `postgres` DB; ephemeral DB name is exact-match regex + `pgx.Identifier.Sanitize()`-guarded | unit + build gate | `docker compose exec -T team4sv30-backend go build ./... && go vet ./internal/testsupport/...` | ❌ new | ⬜ pending |
| 134-02 T2 | 134-02 | 1 | PMQA-03 | T-134-04, T-134-06 | Fresh/up/down proof never touches `team4s_v2`; hard-fails (not skips) on missing DSN | integration (Postgres, ephemeral DB) [latency exception, see Sampling Rate] | `docker compose exec -T -e TEAM4S_PHASE134_MIGRATION_DSN=... team4sv30-backend go test ./internal/migrations/... -run TestPhase134MigrationFreshUpDownProof -v -count=1 -timeout=180s` | ❌ new | ⬜ pending |
| 134-03 T1 | 134-03 | 2 | PMQA-04 | T-134-07 | Temporary backend instance's DATABASE_URL is hardcoded to `team4s_phase134_test`, never interpolated | integration (script) [latency exception, see Sampling Rate] | `bash scripts/provision-phase134-matrix-db.sh && curl -sf http://192.168.235.196:18093/health && ...` | ❌ new | ⬜ pending |
| 134-03 T2 | 134-03 | 2 | PMQA-04 | T-134-08 | Hidden and missing profiles remain structurally indistinguishable; refresh-token acceptance proven | integration (Postgres-backed, HTTP) | `docker compose exec -T team4sv30-backend go test ./internal/repository/... -run 'TestPhase134MatrixAnonymous|TestPhase134MatrixMissing|TestPhase134MatrixHidden|TestPhase134MatrixOwner|TestPhase134MatrixRefreshOnly' -v -count=1 -timeout=120s` | ❌ new | ⬜ pending |
| 134-03 T3 | 134-03 | 2 | PMQA-04 | T-134-09 | Malformed/adversarial slug and pagination params fail closed (4xx, never 500) | integration (Postgres-backed, HTTP) | `docker compose exec -T team4sv30-backend go test ./internal/repository/... -run 'TestPhase134MatrixSparse|TestPhase134MatrixDense|TestPhase134MatrixError|TestPhase134MatrixPagination' -v -count=1 -timeout=120s` | ❌ new | ⬜ pending |
| 134-04 T1 | 134-04 | 3 | PMQA-07 | T-134-11 | `KNOWN_DEFERRED` allow-list is fixed/reviewable; gate fails on any non-allow-listed failure | script syntax gate | `test -x scripts/phase134-green-gate.sh && bash -n scripts/phase134-green-gate.sh` | ❌ new | ⬜ pending |
| 134-04 T2 | 134-04 | 3 | PMQA-07 | T-134-11 | Gate distinguishes genuinely-new failures from the 9 known-deferred ones; never silently patches out-of-scope files | script-driven (backend+frontend orchestration) [latency exception, see Sampling Rate] | full DSN-populated `scripts/phase134-green-gate.sh` run, piped to evidence file (see plan `<verify>`) | ❌ new | ⬜ pending |
| 134-04 T3 | 134-04 | 3 | PMQA-07 (doc-only, not PMQA-01..07 automated surface) | T-134-12 | Doc edit is bounded to 3 net-new Decision bullets + 2 known fields; no wholesale STATE.md rewrite | grep gate | `grep -c "0/TBD\|Not started" .planning/ROADMAP.md \| grep -q '^1$' && grep -n "completed_phases: 5" .planning/STATE.md` | ❌ new | ⬜ pending |
| 134-05 T1 | 134-05 | 4 | PMQA-06 | T-134-15 | Hash guard fails loudly and names the specific changed path on any drift | script (sha256 snapshot/verify round-trip) | `node scripts/verify-protected-assets.mjs --mode snapshot --out /tmp/... && node scripts/verify-protected-assets.mjs --mode verify --against /tmp/...` | ❌ new | ⬜ pending |
| 134-05 T2 | 134-05 | 4 | PMQA-06 | T-134-13, T-134-14 | Zero `TRUNCATE` statements; every DELETE is scoped by seed-prefix `WHERE`; both guards block execution when unsatisfied | script syntax + guard gate | `test -x scripts/reset-member-profile-fixture.sh && bash -n scripts/reset-member-profile-fixture.sh && ! grep -q "TRUNCATE" scripts/reset-member-profile-fixture.sh && (echo "" \| bash scripts/reset-member-profile-fixture.sh; test $? -ne 0)` | ❌ new | ⬜ pending |
| 134-05 T3 | 134-05 | 4 | PMQA-06 | T-134-15 | Tracked badge assets bit-identical before/after; `members` row count unchanged at 2; seed idempotent immediately after reset | script + Postgres query | `node scripts/verify-protected-assets.mjs --mode verify --against .../protected-assets-before.json && docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -tAc "SELECT count(*) FROM members"` | ❌ new | ⬜ pending |
| 134-06 T1 | 134-06 | 5 | PMQA-05 | T-134-16 | Budget-check/image-delivery both pass against the reset stack; script fails loudly on `networkidle` timeout or missing focus indicator | script-driven (Playwright) [latency exception, see Sampling Rate] | `docker exec team4sv30-frontend node scripts/collect-member-profile-evidence.mjs --mode budget-check && node scripts/capture-phase134-uat-evidence.mjs && ls .../evidence/screenshots/ \| wc -l` | Harness exists ✅, capture script ❌ new | ⬜ pending |
| 134-06 T2 | 134-06 | 5 | PMQA-05 | — | Checklist covers both profiles x all 3 viewports x the 5 human-judgment items, cross-referencing Task 1's screenshots | doc-completeness gate | `test -f .../uat-checklist.md && grep -c "^- \[ \]" .../uat-checklist.md` | ❌ new | ⬜ pending |
| 134-06 T3 | 134-06 | 5 | PMQA-05 | T-134-17 | Final milestone sign-off is the user's explicit approval, not an automated pass/fail | manual (checkpoint:human-verify, D-09) | n/a — human-check | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Synced to the final PLAN.md set (2026-08-16, revision iteration 1 — post-plan-checker fixes applied
to 134-RESEARCH.md's Open Questions traceability, 134-01/134-03's manifest sparse-count hedge, and
this file's latency-exception list). Task/Plan/Wave columns reflect the actual generated plans;
statuses remain pending until `/gsd:execute-phase 134` runs each task.*

---

## Wave 0 Requirements

Wave 0 gaps identified by RESEARCH.md are all covered by Wave 1 plans (134-01, 134-02), which have
no in-phase predecessor — mirrors Phase 133's precedent of folding Wave 0 into the first wave rather
than keeping it separate.

- [x] `scripts/member-profile-fixture.manifest.json` — delivered by Plan 134-01 Task 2.
- [x] `backend/internal/migrations/fresh_proof_test.go` — delivered by Plan 134-02 Task 2.
- [x] `TEAM4S_PHASE134_MIGRATION_DSN` / `TEAM4S_PHASE134_TEST_DSN` env vars + `testsupport/phase134_postgres.go` helpers — delivered by Plan 134-02 Task 1 (migration DSN) and extended by Plan 134-03 Task 1 (matrix DSN, same file).
- [x] `scripts/reset-member-profile-fixture.sh` (Linux/container-runnable, narrowly-scoped, `.sh` not `.mjs` per RESEARCH.md's explicit either-is-fine note) — delivered by Plan 134-05 Task 2.
- [x] Media-seeding step inside the seed script — delivered by Plan 134-01 Task 1, calling the resolved `POST /api/v1/me/profile/story-images` endpoint.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live browser UAT at mobile/intermediate/widescreen with keyboard, 400% zoom, images, loading behavior, real route | PMQA-05 (D-09) | This is the milestone's single bundled, authoritative live sign-off (V-02); prior phases 129-133 explicitly deferred their own live UAT to this phase | Walk `.planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md` (Plan 134-06 Task 2) via the `127.0.0.1:3300` SSH tunnel for both `sheppert` and `csubs-leader`, comparing against Task 1's captured screenshots/keyboard-focus traces; cross-check metrics against `collect-member-profile-evidence.mjs --mode budget-check` and `verify-profile-image-delivery.mjs`; FINAL human sign-off is the user's — executed as Plan 134-06 Task 3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Plan 134-06 Task 3 is the phase's single manual `checkpoint:human-verify` task, by design per D-09)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the one manual checkpoint is the phase's final task, preceded by 15 consecutive automated-verify tasks)
- [x] Wave 0 covers all MISSING references (folded into Plans 134-01/134-02, see Wave 0 Requirements above)
- [x] No watch-mode flags
- [x] Feedback latency < 90s for all per-task-commit automated verifies; the four commands that exceed 90s are explicitly scoped to phase-gate/wave-merge frequency only (see Sampling Rate's Accepted latency exception)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (synced to final PLAN.md set, revision iteration 1, 2026-08-16)
