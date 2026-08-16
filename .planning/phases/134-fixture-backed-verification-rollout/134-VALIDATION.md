---
phase: 134
slug: fixture-backed-verification-rollout
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `docker exec team4sv30-backend go test ./internal/repository/... -run Phase134` (once Wave 3 tests exist); `docker exec team4sv30-frontend npx vitest run <touched files>` |
| **Full suite command** | `docker exec team4sv30-backend go build ./... && go vet ./... && go test ./internal/repository/... ./internal/migrations/... -run 'Phase12|Phase13|Phase134'`; `docker exec team4sv30-frontend npm run typecheck && npm run lint && npm test -- <member-profile-scoped paths> && npm run build && git diff --check` |
| **Estimated runtime** | ~90-150s per full-suite run (new ephemeral-DB migration proof and Postgres-backed matrix suite add real DB round-trips beyond Phase 133's ~60s baseline) |

---

## Sampling Rate

- **After every task commit:** Run the specific new test file/command the task introduced (mirrors every prior phase's task-scoped verification pattern).
- **After every plan wave:** Re-run that wave's full command set (e.g. all `TestPhase134...` matrix tests together for Wave 3; the fresh/up/down proof end-to-end for Wave 2).
- **Before `/gsd:verify-work`:** The full D-08 green gate (typecheck, lint, focused backend/frontend tests, build, `git diff --check`) must be green, scoped to member-profile-relevant surfaces per the user-confirmed scope decision below — NOT the fully unscoped suite.
- **Max feedback latency:** ~90s per task-commit-scoped run.
- **Accepted latency exception:** `collect-member-profile-evidence.mjs --mode budget-check` and the migration fresh/up/down proof (Wave 2, drives a real DROP DATABASE + 145-pair up/down chain) both routinely exceed 90s. Scoped to phase-gate/wave-merge frequency only (Wave 2 end, Wave 6), not per-task-commit — does not violate sampling continuity.

---

## User-Confirmed Scope Decisions (2026-08-16)

- **D-08/PMQA-07 green-gate scope:** CONFIRMED scoped to member-profile-relevant tests (matches every prior phase's precedent). The ~9 pre-existing, out-of-scope stale-assertion failures documented in `.planning/phases/133-.../deferred-items.md` are NOT required to go green as part of Phase 134; they are flagged as a separate note for the user, not silently fixed or silently ignored.
- **ROADMAP.md/STATE.md tracking drift:** CONFIRMED in scope — Phase 134 includes a small documentation-fix task correcting `ROADMAP.md`'s stale "Progress" table rows for Phases 129/130/131 and reconciling `STATE.md`'s `completed_phases` counter, per RESEARCH.md's "Ground Truth" findings. This is a cheap doc-only task, not part of PMQA-01..07's automated verification surface.

---

## Per-Task Verification Map

*Plans do not exist yet — this section is populated by the planner from the Requirement -> Test map below and synced after PLAN.md files are generated (see Phase 133's `134-VALIDATION.md` for the expected final shape: one row per task with Task ID/Plan/Wave/Requirement/Test Type/Automated Command/File Exists/Status).*

### Requirement -> Test Map (from RESEARCH.md, to be expanded into per-task rows by the planner)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PMQA-01 | Fixture/seed contract is versioned + idempotent | integration (seed script self-check, run twice) | `docker exec team4sv30-frontend node scripts/seed-member-profile-fixtures.mjs` (expect `RESULT: PASS` both runs) | Extend existing ✅ |
| PMQA-02 | Manifest documents identity/visibility/roles/memberships/projects/badges/media/content-lengths | new manifest + matching test | New `scripts/member-profile-fixture.manifest.json` + a manifest-vs-seed-output assertion | ❌ Wave 1 |
| PMQA-03 | Migration fresh/up/down proof, no synthetic-row preservation | integration (new Go tooling, ephemeral DB) | `docker exec team4sv30-backend go test ./internal/migrations/... -run Phase134Fresh` (new) | ❌ Wave 2 |
| PMQA-04 | anonymous/hidden/owner/refresh-only/missing/sparse/dense/error/pagination matrix | integration (Postgres-backed) | `docker exec team4sv30-backend go test ./internal/repository/... -run Phase134` (new) | ❌ Wave 3 |
| PMQA-05 | Live UAT: mobile/intermediate/widescreen, keyboard, 400% zoom, images, loading, real route | manual (browser) + semi-automated evidence capture | `collect-member-profile-evidence.mjs --mode budget-check` + `verify-profile-image-delivery.mjs` + human checklist via `127.0.0.1:3300` | Harnesses exist ✅; checklist doc ❌ Wave 6 |
| PMQA-06 | Reset/seed/media leave canonical ownership + tracked badges unchanged | integration (sha256 hash comparison, before/after) | New script hashing `frontend/public/history-event-badges*`/`member-achievement-badges` | ❌ Wave 5 |
| PMQA-07 | typecheck/lint/focused tests/build/git diff --check all green (member-profile-scoped, see confirmed scope above) | CI-style gate script | `npm run typecheck && npm run lint && npm test -- <scoped paths> && npm run build && git diff --check`; `go build ./... && go vet ./... && go test ./internal/repository/... -run 'Phase12|Phase13'` | Commands exist individually ✅; orchestration script ❌ Wave 4 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/member-profile-fixture.manifest.json` — does not exist yet; blocks PMQA-02 and is a read-dependency for Wave 3's matrix tests.
- [ ] `backend/internal/migrations/fresh_proof_test.go` (or equivalent) — no fresh/DROP-DATABASE tooling exists anywhere in the codebase today; blocks PMQA-03.
- [ ] `TEAM4S_PHASE134_TEST_DSN`-style env var + a `testsupport` helper mirroring `phase128_postgres.go`'s mandatory-DSN pattern — needed by both Wave 2 and Wave 3 for their ephemeral/matrix databases.
- [ ] `scripts/reset-member-profile-fixture.mjs` (or `.sh`) — the closest existing analog (`reset-local-schema-cutover-data.ps1`) is PowerShell-only and broader-scoped than D-05 requires; needs a Linux/container-runnable, narrowly-scoped rewrite.
- [ ] Media-seeding step inside the seed script — `media_assets` is currently 0 rows for both fixture profiles; must exist before PMQA-02's manifest can honestly document "media" or PMQA-05's live UAT can inspect real images.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live browser UAT at mobile/intermediate/widescreen with keyboard, 400% zoom, images, loading behavior, real route | PMQA-05 (D-09) | This is the milestone's single bundled, authoritative live sign-off (V-02); prior phases 129-133 explicitly deferred their own live UAT to this phase | Walk the documented checklist protocol (profile x layout x a11y) via the `127.0.0.1:3300` SSH tunnel for both `sheppert` and `csubs-leader`, capturing per-profile/per-layout screenshots under the phase evidence dir; cross-check metrics against `collect-member-profile-evidence.mjs --mode budget-check` and `verify-profile-image-delivery.mjs`; FINAL human sign-off is the user's |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s (see Accepted latency exception above for the two known-longer-running phase-gate commands)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — to be synced to the final PLAN.md set after planning, mirroring Phase 133's `133-VALIDATION.md` pattern.
