# Phase 134: Fixture-Backed Verification & Rollout - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 134 proves the complete v1.3 public-member-profile behavior, performance, ownership,
migration, and visual experience in a clean, repeatable environment before milestone closure.
It delivers the versioned idempotent fixture contract + manifest for sheppert/csubs-leader, a
safe reset/seed workflow, migration fresh/up/down proof, an automated viewer/data/error/
pagination matrix, the bundled authoritative live-UAT, and the final quality + protected-asset
gates.

This is the milestone-closing verification/rollout phase. It adds NO new product behavior -
it reproduces and proves what Phases 128-133 built. It reuses the Phase-129 seed as its
fixture (milestone V-03) and is the single authoritative live sign-off for the whole milestone
(V-02).

</domain>

<decisions>
## Implementation Decisions

### Fixture contract & manifest (PMQA-01, PMQA-02)
- **D-01 (Versioned idempotent seed):** The Phase-129 API-driven seed (extends
  scripts/seed-member-profile-fixtures.mjs) IS the fixture engine - it carries a fixture version
  and is idempotent (safe to re-run). Phase 134 inherits whatever Phase-129 Wave 1 produces; it
  does not fork a parallel seed.
- **D-02 (Machine-readable manifest as single source):** A versioned, machine-readable JSON
  manifest (checked in beside the seed) documents the expected end-state for sheppert +
  csubs-leader: identity, visibility, roles, memberships, projects, badges, media, and
  content-lengths. The seed verifies its result against it AND the verification matrix + reset
  check read the SAME file - it cannot drift (mismatch => red test). A short README explains it
  for humans.

### Safe clean-reset, migration proof & sequencing (PMQA-03, PMQA-06)
- **D-03 (Reset is a Phase-134 rollout step ONLY):** The shared-DB clean reset + reseed happens
  ONLY as the final Phase-134 rollout step, AFTER 130-133 land. Phases 129-133 (including the
  currently-running 129 execution) deliberately run against the CURRENT DB state; NOTHING is
  reset before 134 (milestone V-02/V-03). Phase 129 needs the current state to test against.
- **D-04 (Migration proof on an ephemeral throwaway DB):** fresh/up/down migration proof runs on
  a dedicated EPHEMERAL database (Phase-128 test-DSN pattern). "Fresh" = DROP DATABASE + recreate
  + migrate, which bypasses TRUNCATE and the append-only reject_truncate triggers entirely. The
  live/shared DB is never touched by the migration proof. The DB is ~18 MB - negligible cost;
  whether the migration DB and the seeded matrix DB are one DB reused in sequence or two parallel
  ephemeral DBs is an implementation detail.
- **D-05 (Targeted, trigger-respecting reseed on the shared DB):** The reference-profile reset on
  the shared DB resets ONLY its own synthetic member/profile rows - NEVER TRUNCATE members
  CASCADE. That cascade structurally reaches the whole fansub-relational content (members ->
  media_assets.owner_member_id -> anime.cover_asset_id/banner_asset_id -> ~50 tables) and is
  blocked by append-only reject_truncate triggers (point_ledger_entries, review_*, etc.) anyway.
  A deliberate full wipe (SET LOCAL session_replication_role=replica + pg_dump backup) stays a
  documented EXCEPTION, not the default. Note: DB anime rows are metadata only (11 rows); the
  real media lives in Jellyfin and is NEVER touched by any DB reset (no physical deletion).
- **D-06 (Protected asset hash guard):** Before any reset/media cleanup, record hashes/status of
  the tracked badge asset dirs (frontend/public/history-event-badges,
  frontend/public/history-event-badges-transparent, frontend/public/member-achievement-badges)
  and verify them bit-identical afterward - canonical ownership + tracked badge assets stay
  unchanged (PMQA-06).

### Verification matrix & green gate (PMQA-04, PMQA-07)
- **D-07 (Dedicated matrix suite against the fixture):** The behavioral cases - anonymous public,
  hidden, owner, refresh-only, missing, sparse, dense, error, pagination - live in a dedicated
  verification suite that seeds the versioned fixture once and asserts every case against the
  same manifest (single-source; ties to D-02). sparse vs dense come from the SEED producing those
  scenarios (e.g. sheppert sparse, csubs-leader dense), not a separate snapshot. Existing unit
  tests stay where they are; the matrix is the added integration layer.
- **D-08 (Green gate as an automated closing step):** typecheck, lint, focused backend + frontend
  tests, build, and git diff --check run as ONE automated closing gate; drifting or too-weak
  tests are corrected rather than skipped (PMQA-07).

### Live UAT protocol & evidence (PMQA-05)
- **D-09 (Checklist protocol, semi-automated, human sign-off):** The bundled authoritative live
  UAT uses a documented checklist (profile x layout x a11y). Interactive checks (narrow /
  intermediate / widescreen layouts, keyboard, 400% zoom, images, loading behavior, the real
  user-visible route) are driven via the in-app browser against the 127.0.0.1:3300 SSH tunnel
  with per-profile/per-layout screenshots; metrics come from
  collect-member-profile-evidence.mjs + verify-profile-image-delivery.mjs checked against the
  Phase-131/133 budgets. Evidence artifacts live under the phase dir. Because this is the
  authoritative milestone sign-off (V-02), the FINAL human sign-off is the user's.

### Claude's Discretion
- Manifest JSON schema/field layout and the seed's self-verification mechanism.
- One-DB-in-sequence vs two-parallel ephemeral DBs for migration + matrix (both cheap).
- The matrix suite location/framework and the green-gate script wiring.
- The UAT checklist format and screenshot/evidence naming under the phase dir.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope, requirements, and prior decisions
- .planning/PROJECT.md - v1.3 goal, brownfield/privacy/test-data constraints.
- .planning/ROADMAP.md - Phase 134 goal, deliverables, success criteria; milestone closure.
- .planning/REQUIREMENTS.md - locked Phase 134 requirements PMQA-01..07.
- .planning/DECISIONS.md - v1.3 fixture-driven verification + bundled Phase-134 live UAT (2026-08-14) - the authority behind D-01/D-03/D-09.
- .planning/phases/129-canonical-public-projections-data-correctness/129-CONTEXT.md - V-03/V-04 (the seed this phase reuses), the scenario matrix the fixture must cover.
- .planning/phases/131-.../131-CONTEXT.md and .planning/phases/133-.../133-CONTEXT.md - the query/payload/latency/image/Web-Vitals budgets the live evidence (D-09) is checked against.
- .planning/phases/130-.../130-CONTEXT.md, 132-... /132-CONTEXT.md - the contract + composition/state whose behavior the matrix (D-07) exercises.

### Reset / migration / evidence surfaces (Plan-time read first, from ROADMAP)
- backend/internal/migrations/runner.go + migration tests (backend/internal/migrations/phase*_test.go) - migration fresh/up/down proof (D-04).
- scripts/seed-member-profile-fixtures.mjs + scripts/README-seed.md - the fixture engine (D-01) and its human doc.
- scripts/reset-local-schema-cutover-data.ps1 + existing Compose/reset tooling - reset workflow analogs (D-05); respect the append-only triggers.
- frontend/scripts/collect-member-profile-evidence.mjs, frontend/scripts/verify-profile-image-delivery.mjs - evidence harnesses (D-09).
- Profile API/handler + component tests - matrix analogs (D-07).
- Protected tracked assets: frontend/public/history-event-badges-transparent/, history-event-badges/, member-achievement-badges/ - hash-guard targets (D-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- scripts/seed-member-profile-fixtures.mjs + README-seed.md already exist - the Phase-129 seed
  extends them and Phase 134 reuses that, not a fork.
- collect-member-profile-evidence.mjs + verify-profile-image-delivery.mjs already exist as the
  metric harnesses (D-09) - also used by Phases 131/133.
- Migration tests are phase-numbered (phase128_public_identity_test.go, ...) - the established
  pattern for the fresh/up/down proof.

### Established Patterns
- Dedicated test-DSN, self-seeding PostgreSQL tests (Phase-128 pattern) - the basis for the
  ephemeral migration/matrix DBs (D-04/D-07).
- Live UAT via the Windows SSH tunnel 127.0.0.1:3300 (CLAUDE.md); :3000 is dev (no HMR - restart
  frontend container after edits); the docker compose build is the authoritative frontend build.

### Integration Points / Known Gaps to Fix
- TRUNCATE members CASCADE is unsafe AND trigger-blocked (D-05) - the reset must be targeted.
- Current DB: members=2, anime=11, media_assets=0 - the fixture must GROW sheppert/csubs-leader
  into the full scenario matrix; both were empty shells at milestone start (DECISIONS 2026-08-14).
- Disk is tight on the VM (~1.6 GB free / 96% used) - ephemeral 18 MB DBs are fine, but avoid
  leaving throwaway DBs/dumps around; docker prune after the 129 run reclaims space.

</code_context>

<specifics>
## Specific Ideas

- Reset danger closure: members -> media_assets -> anime FK bridge + append-only reject_truncate
  triggers make TRUNCATE members CASCADE both destructive and self-blocking; the ephemeral proof
  uses DROP DATABASE + recreate instead.
- Jellyfin is the source of truth for anime media; no DB reset deletes anything physical.
- sparse/dense come from the seed: e.g. sheppert = sparse profile, csubs-leader = dense (over one
  page of projects/contributions) - satisfies the PMQA-04 sparse/dense cases from one fixture.

</specifics>

<deferred>
## Deferred Ideas

- No new product behavior here - Phases 128-133 own features; 134 only proves them.
- Any post-v1.3 work (further role-model rework, capability registry, additional profiles) is a
  future milestone, not this phase.
- After 134's gates pass and the human sign-off lands, the milestone is closed
  (/gsd:complete-milestone), not part of this phase's implementation.

</deferred>

---

*Phase: 134-fixture-backed-verification-rollout*
*Context gathered: 2026-08-14*
