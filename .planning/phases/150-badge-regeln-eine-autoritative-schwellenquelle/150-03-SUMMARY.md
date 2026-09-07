---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 03
subsystem: api
tags: [go, badges, gamification, thresholds, member-profile, contracts, typescript]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 01)
    provides: "backend/internal/badges package (RoleVolume, Points, Progress, ContributionProjects, ContributionChronicle, ContributionArchivist, Membership families) with CurrentTier/NextTier/Remaining helpers"
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 02)
    provides: "shared/contracts/openapi.yaml's OwnDashboard* schema updates (different section from this plan's PublicMemberBadgeProgress edits) and the established registry-repointing pattern this plan follows"
provides:
  - "member_profile_role_volume_repository.go's two independent threshold switches (highestRoleVolumeTier, roleVolumeProgressBadge) delegate to badges.RoleVolume -- no local 12/108/320/510 copies remain"
  - "member_profile_progress_repository.go's loadBadgeProgress reads all six pre-existing families' thresholds from the registry via a new thresholdsFromFamily adapter -- no inline threshold-tuple literals remain"
  - "PublicMemberBadgeProgress gains CurrentTier (all seven families), RoleCode (role_volume only), and Stages ([]BadgeProgressStage, all seven families) -- new models.BadgeProgressStage{Code, Threshold} type"
  - "loadBadgeProgress emits one role_volume badge_progress entry per role a member has any awarded credit in, each carrying an identical Stages list with a Go-synthesized 'entry' stage (threshold 1) prefixed onto badges.RoleVolume.Tiers"
  - "shared/contracts/openapi.yaml and frontend/src/types/profile.ts updated field-for-field: current_tier (required), role_code (optional), stages (required, new PublicMemberBadgeProgressStage schema/interface), family enum widened to include role_volume"
affects: [150-05, 150-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "thresholdsFromFamily(family badges.Family) []badgeProgressThreshold: a small type-shape adapter at the loadBadgeProgress call site that keeps the registry as the single source while preserving the pre-existing badgeProgressThreshold local struct buildBadgeProgress already consumed"
    - "buildBadgeProgress now visits every threshold (never breaking early) to build the full ascending Stages list while still computing NextThreshold/RemainingCount/NextTier/Complete via a nextFound guard on the first not-yet-reached threshold -- the later 150-05 frontend rewiring's load-bearing precedent for 'Stages is the static ladder, independent of current_count'"

key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_role_volume_repository.go
    - backend/internal/repository/member_profile_role_volume_repository_test.go
    - backend/internal/repository/member_profile_progress_repository.go
    - backend/internal/repository/member_profile_progress_repository_test.go
    - backend/internal/models/member_profile.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/components/profile/memberBadgeLabels.test.ts

key-decisions:
  - "Fixed two pre-existing bugs in member_profile_role_volume_repository_test.go's own Postgres boundary tests (Task 1's file scope): both TestLoadRoleVolumeBadgesPostgresProgressBoundaries and TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive inserted release_role_credit_lifecycles rows with lifecycle_status='awarded'/'reversed' and a nil award_entry_id/reversal_entry_id -- chk_release_role_credit_lifecycle_shape has always rejected that shape (award_entry_id/reversal_entry_id must be non-null for those statuses). Verified by actually running these tests against a real Postgres DSN for the first time (they had apparently never been run against a real DSN before -- every prior invocation must have been skip-if-unset). Fixed by backing every awarded/reversed row with a real point_ledger_entries row via the existing ledger.InsertAward/InsertReversal pattern already used elsewhere in the same file."
  - "Task 2's Postgres integration tests use a new local fixture (openBadgeProgressPostgres) built on top of the already-established openContributionBadgesPostgres chain (Plan 150-02) rather than openPhase129Postgres or testsupport.OpenPhase150Postgres: openPhase129Postgres is explicitly documented by Plan 150-04's SUMMARY as unsafe to insert point_ledger_entries into (its shared, non-schema-isolated database has no way to clean up the append-only ledger table between test runs); testsupport.OpenPhase150Postgres's minimal anime_contributions table lacks the is_public_on_member_profile column loadBadgeProgress's own inline query requires. openContributionBadgesPostgres's chain is schema-isolated per test (fresh schema, dropped in t.Cleanup), so inserting real ledger rows there is safe -- only two additional stand-in tables (anime_contributions, hist_fansub_group_members) were needed on top of it."
  - "The comprehensive role_volume integration test's zero-activity assertion for the six base families had to special-case contribution_projects as 'bronze' rather than '' -- seeding awarded release_role_credit_lifecycles rows on release_version 30/fansub_group 20 (needed for role_volume) is, by design, the SAME data source loadContribProjectsCount reads, so it incidentally makes that release version 'covered' by member 1. This mirrors the identical genuine cross-family fixture-reuse side effect Plan 150-02's SUMMARY already documented for its own shared fixture."

requirements-completed: [SC-1, SC-4, SC-6, SC-7, SC-8]

# Metrics
duration: ~45min
completed: 2026-09-06
---

# Phase 150 Plan 03: Repoint role_volume + loadBadgeProgress thresholds, add current_tier/stages/role_volume Summary

**`member_profile_role_volume_repository.go`'s two threshold switches and `member_profile_progress_repository.go`'s `loadBadgeProgress` are now fully registry-sourced; `PublicMemberBadgeProgress` gains `current_tier`, `role_code`, and a per-family ascending `stages` ladder (including a Go-synthesized `role_volume` "entry" stage) across all seven badge families.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-06T23:30:00Z (following 150-04's completion)
- **Completed:** 2026-09-06T23:53:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- `highestRoleVolumeTier` and `roleVolumeProgressBadge` (the single worst duplication in the phase -- the same 12/108/320/510 thresholds copied twice in one file) both now delegate to `badges.RoleVolume`; the "entry" presentation-local relabeling (D-03) is preserved exactly (the registry's `""` below the first tier never leaks into the returned badge's `CurrentTier`).
- `loadBadgeProgress`'s six pre-existing families (progress/points/contribution_projects/contribution_chronicle/contribution_archivist/membership) no longer hold inline threshold-tuple literals -- `thresholdsFromFamily` projects each `badges.Family`'s `Tiers` into the shape `buildBadgeProgress` already consumed.
- `buildBadgeProgress` now computes `CurrentTier` (highest tier reached) and a complete, ascending `Stages` list in a single non-early-breaking pass over the thresholds, while preserving every pre-existing `NextThreshold`/`RemainingCount`/`NextTier`/`Complete` boundary exactly (proven by dedicated unit tests, including that `Stages` is provably independent of `current_count`).
- `loadBadgeProgress` now also emits one `role_volume` `badge_progress` entry per role a member has any awarded `release_role_credit_lifecycles` credit in (via the same `r.loadRoleVolumeCounts` Task 1 already exercises), each carrying an identical `Stages` list with a Go-synthesized `{code: "entry", threshold: 1}` stage prefixed onto `badges.RoleVolume.Tiers` -- the only place in the whole phase this literal is written down, so Plan 150-05's frontend rewiring never needs it.
- `PublicMemberBadgeProgress` gained `CurrentTier`, `RoleCode` (role_volume only), and `Stages` (`[]BadgeProgressStage`, all seven families); `shared/contracts/openapi.yaml` and `frontend/src/types/profile.ts` mirror the Go model field-for-field, including a new `PublicMemberBadgeProgressStage` schema/interface and the widened `family` enum.
- Fixed two pre-existing, never-actually-run-against-real-Postgres bugs in `member_profile_role_volume_repository_test.go`'s own boundary tests (both violated `chk_release_role_credit_lifecycle_shape` by passing `nil` award/reversal entry IDs for `awarded`/`reversed` rows) so Task 1's own `<verify>` command could pass for real, not just compile.

## Task Commits

Each task was committed atomically:

1. **Task 1: Repoint role_volume_repository.go's two switches to the registry** - `989b845b` (feat)
2. **Task 2: Repoint loadBadgeProgress to the registry; add current_tier, role_volume family, and per-family stage lists (D-05, D-06, D-24)** - `0497e928` (feat)

## Files Created/Modified
- `backend/internal/repository/member_profile_role_volume_repository.go` - `highestRoleVolumeTier`/`roleVolumeProgressBadge` delegate to `badges.RoleVolume`
- `backend/internal/repository/member_profile_role_volume_repository_test.go` - fixed two pre-existing broken Postgres boundary tests (real award/reversal ledger entries instead of nil)
- `backend/internal/repository/member_profile_progress_repository.go` - `thresholdsFromFamily` adapter, `buildBadgeProgress` computes `CurrentTier`/`Stages`, `loadBadgeProgress` adds the `role_volume` family with the synthesized "entry" stage
- `backend/internal/repository/member_profile_progress_repository_test.go` - DB-free unit tests for `buildBadgeProgress`'s `CurrentTier`/`Stages` behavior plus two new real-Postgres tests (`TestLoadBadgeProgressPostgres...`) proving the `role_volume` addition end-to-end, using a new local `openBadgeProgressPostgres` fixture extending Plan 150-02's `openContributionBadgesPostgres`
- `backend/internal/models/member_profile.go` - `PublicMemberBadgeProgress.CurrentTier`/`.RoleCode`/`.Stages`; new `BadgeProgressStage` type
- `shared/contracts/openapi.yaml` - `PublicMemberBadgeProgress` schema updated field-for-field; new `PublicMemberBadgeProgressStage` schema
- `frontend/src/types/profile.ts` - `PublicMemberBadgeProgress` interface updated field-for-field; new `PublicMemberBadgeProgressStage` interface
- `frontend/src/app/members/[slug]/page.test.tsx`, `frontend/src/components/profile/memberBadgeLabels.test.ts` - added the newly-required `current_tier`/`stages` fields to downstream fixture object literals so `tsc --noEmit` stays clean (Rule 3, same pattern as Plan 150-02's Task 2)

## Decisions Made
See `key-decisions` in frontmatter: the two pre-existing role_volume test fixture bugs found and fixed, the `openBadgeProgressPostgres` fixture choice (extends 150-02's schema-isolated `openContributionBadgesPostgres` rather than `openPhase129Postgres` or `testsupport.OpenPhase150Postgres`), and the `contribution_projects` cross-family fixture side effect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing broken Postgres boundary tests in member_profile_role_volume_repository_test.go**
- **Found during:** Task 1
- **Issue:** `TestLoadRoleVolumeBadgesPostgresProgressBoundaries` and `TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive` inserted/updated `release_role_credit_lifecycles` rows with `lifecycle_status='awarded'`/`'reversed'` and a `nil` `award_entry_id`/`reversal_entry_id`. Migration 0137's `chk_release_role_credit_lifecycle_shape` CHECK constraint has always required those columns to be non-null for those statuses -- confirmed by actually running the tests against a real Postgres DSN (`ERROR: new row for relation "release_role_credit_lifecycles" violates check constraint`), which is required by this plan's own hard constraint ("real-call tests only... never source-substring"). These tests appear to have never been executed against a real DSN before this plan.
- **Fix:** Both tests now back every awarded/reversed lifecycle row with a real `point_ledger_entries` row via `NewPointLedgerRepository(pool).InsertAward`/`InsertReversal` (the same pattern already used correctly elsewhere in the same file and in `member_profile_contribution_badges_repository_test.go`).
- **Files modified:** `backend/internal/repository/member_profile_role_volume_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestLoadRoleVolume|TestRoleVolumeProgressBadge' -v` -- all 6 tests (including all 10 subtests of the boundary table) green against real Postgres.
- **Committed in:** `989b845b`

**2. [Rule 3 - Blocking issue] Newly-required current_tier/stages fields broke tsc --noEmit on downstream fixture literals**
- **Found during:** Task 2
- **Issue:** Adding required `current_tier`/`stages` fields to `PublicMemberBadgeProgress` (D-05/D-24) broke `tsc --noEmit` on ten object literals in `page.test.tsx` and six in `memberBadgeLabels.test.ts` that construct `badge_progress` entries without the new fields.
- **Fix:** Added `current_tier: ''` (or a fitting known-good value where cheaply derivable, e.g. `expectedCode ?? ''`) and `stages: []` to each literal. None of these tests assert on `current_tier`/`stages` directly, so no test behavior changed.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`, `frontend/src/components/profile/memberBadgeLabels.test.ts`
- **Verification:** `cd frontend && npx tsc --noEmit` clean except the two pre-existing, unrelated `.next/dev/types` generated-file errors (confirmed pre-existing and out of scope by Plan 150-02's own SUMMARY); `npx vitest run` on both touched files: 123/123 passing.
- **Committed in:** `0497e928`

### Out-of-Scope Discoveries (logged, NOT fixed)

Running the full `go test ./internal/repository/...` suite (broader than either task's own `<verify>` command) surfaced the same pre-existing, unrelated failures Plan 150-02's SUMMARY already documented in `deferred-items.md`: a memorial-profile claim guard not yet implemented, an unrelated member-mutation-conflict test, and several Phase-134 tests requiring a reachable live backend server plus Keycloak fixture accounts (`sheppert`/`csubs-leader`) confirmed absent from this environment. None of these are in either of this plan's tasks' `<files>` lists; none block this plan's own `<verify>` commands, which all pass.

## Known Issues (pre-existing, unrelated, not fixed)
- `cd frontend && npx tsc --noEmit` reports two errors in generated `.next/dev/types/app/anime/[id]/group/[groupId]/releases/...` page type files (Next.js `PageProps` `params` Promise-typing) -- confirmed pre-existing and unconnected to this plan's changes (same two errors documented in Plan 150-02's SUMMARY).

## Next Phase Readiness
- All four documented contract gaps from ROADMAP.md's original defect map are now closed: `PublicMemberBadgeProgress.current_tier` (D-05), the `role_volume` family inside `badge_progress` (D-06), and both role_volume threshold switches now read from the registry (D-02 items #3/#4/#5).
- `PublicMemberBadgeProgress.stages` is populated for all seven families (including the Go-synthesized role_volume "entry" stage) -- ready for Plan 150-05's frontend rewiring to render the multi-stage ladder strips without holding a single threshold literal client-side.
- `grep -n '1, "bronze"\|10, "bronze"\|5, "silver"' backend/internal/repository/member_profile_progress_repository.go` returns nothing (confirmed).
- `openBadgeProgressPostgres` (in `member_profile_progress_repository_test.go`) is available for any later plan in this phase needing a schema-isolated Postgres fixture covering `loadBadgeProgress`'s full data surface (anime_contributions, hist_fansub_group_members, plus the contribution-badges chain).

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-06*

## Self-Check: PASSED

All modified files found on disk; both task commits (`989b845b`, `0497e928`) found in git history.

## Addendum: v12-projection-contract test updated for Phase 150 additions (post-execution review)

**Why this was stale:** `frontend/src/types/__tests__/v12-projection-contract.test.ts`'s `describe("Phase 119 additive badge_progress contract")` block predates this phase (its own name says so) and asserted the OLD, pre-Phase-150 `PublicMemberBadgeProgress` shape: six required fields, no `current_tier`, no `stages`, no `role_volume` in the `family` enum. This plan's Task 2 deliberately and correctly extended the real contract (Go struct, `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts`) per D-05/D-06/D-24, but did not update this pre-existing, differently-scoped drift test — it was out of this plan's `<files>` list and its own `<verify>` commands did not touch it. The test went red as an expected, documented side effect (noted in the phase's overall gate-status tracking) and has now been fixed in a follow-up review pass, per the phase owner's explicit instruction, to raise its expectations to match the deliberately-extended contract rather than weaken the test.

**Before/after of the key assertions:**

Before:
```ts
const exactKeys = ["family", "current_count", "next_threshold", "remaining_count", "next_tier", "complete"];
...
expect(block).toContain("required: [family, current_count, next_threshold, remaining_count, next_tier, complete]");
for (const key of exactKeys) expect(block).toContain(`${key}:`);
expect(block).toMatch(/next_threshold:\n\s+type: integer\n\s+nullable: true/);
expect(block).toMatch(/remaining_count:\n\s+type: integer\n\s+nullable: true/);
expect(block).toMatch(/next_tier:\n\s+type: string\n\s+nullable: true/);
```

After:
```ts
const exactKeys = ["family", "current_count", "current_tier", "next_threshold", "remaining_count", "next_tier", "complete", "stages"];
...
expect(block).toContain(
  "required: [family, current_count, current_tier, next_threshold, remaining_count, next_tier, complete, stages]",
);
for (const key of exactKeys) expect(block).toContain(`${key}:`);
// role_code is intentionally NOT required (only set on family=role_volume entries),
// but it must still exist as a documented, nullable property.
expect(block).toContain("role_code:");
expect(block).toMatch(/current_tier:\n\s+type: string\n/);
expect(block).not.toMatch(/current_tier:\n\s+type: string\n\s+nullable: true/);
expect(block).toMatch(/next_threshold:\n\s+type: integer\n\s+nullable: true/);
expect(block).toMatch(/remaining_count:\n\s+type: integer\n\s+nullable: true/);
expect(block).toMatch(/next_tier:\n\s+type: string\n\s+nullable: true/);
expect(block).toMatch(/role_code:\n\s+type: string\n\s+nullable: true/);
expect(block).toMatch(/stages:\n\s+type: array\n/);
expect(block).not.toMatch(/stages:\n\s+type: array\n\s+nullable: true/);
```

`role_code` was deliberately left OUT of `exactKeys`/the `required: [...]` string (it is documented as an optional, `role_volume`-only field, matching the real schema), but a standalone existence + nullability assertion was added for it so the test still covers every property in the block, not just the required ones.

**Required-vs-nullable safety analysis for `current_tier` and `stages` (the user's explicit question):**

Investigated directly, not assumed:

1. **Does the Go backend unconditionally populate both fields on every entry?** Yes, confirmed by reading `buildBadgeProgress` and the `role_volume` entry-construction loop in `backend/internal/repository/member_profile_progress_repository.go`:
   - `CurrentTier` is a plain (non-pointer) `string` field on `models.PublicMemberBadgeProgress` (`backend/internal/models/member_profile.go:207`, `json:"current_tier"` with no `omitempty`). `buildBadgeProgress` initializes `progress := models.PublicMemberBadgeProgress{...}` (zero value `""`) and only ever assigns a non-empty tier if a threshold is reached — it never leaves the field unset in a way that would omit it from JSON. The `role_volume` branch always sets `CurrentTier: badges.RoleVolume.CurrentTier(entry.Count)` (a helper call, never skipped) for every emitted entry.
   - `Stages` is `[]BadgeProgressStage` with `json:"stages"` (no `omitempty`, `backend/internal/models/member_profile.go:213`). In `buildBadgeProgress`, `stages := make([]models.BadgeProgressStage, 0, len(thresholds))` is always initialized (even to a non-nil empty slice if `thresholds` were empty, which never happens in practice since all six families have non-empty tier registries) and unconditionally assigned via `progress.Stages = stages` before return. The `role_volume` branch builds `roleVolumeStages` once (always non-empty: the synthesized `"entry"` stage plus at least the registry's bronze/silver/gold/platinum tiers) and sets it on every `roleEntryProgress`. A Go non-nil slice, even if it were empty, marshals to JSON `[]`, never `null` — so `stages` can never be absent or null in a real response.
   - Conclusion: both fields are populated on literally every `PublicMemberBadgeProgress` entry the backend ever emits, across all seven families (the original six plus `role_volume`). There is no code path that constructs an entry without them.

2. **Is there any strict/closed schema validation anywhere that would reject a response for this reason?** No. Searched for `additionalProperties`, `ajv`, and any OpenAPI-driven runtime validation middleware or codegen step:
   - `additionalProperties` appears 5 times in `shared/contracts/openapi.yaml`, none inside `PublicMemberBadgeProgress` or `PublicMemberBadgeProgressStage` — those two schemas have no `additionalProperties: false`, so even the OpenAPI document itself doesn't declare this object closed.
   - `ajv` exists only inside `frontend/package-lock.json` as a transitive dependency of ESLint's own internal config-schema validation (`eslint` → `@eslint/eslintrc`/`@humanwhocodes/*` dependency chains) — it is never imported or invoked against `openapi.yaml` or any API response body anywhere in `frontend/` or `backend/`.
   - No `express-openapi-validator`, no Go OpenAPI-request-validation middleware, no codegen step (`openapi-generator`, `swagger-codegen`, or similar) was found anywhere in the repo. The Go handlers construct and marshal `models.PublicMemberBadgeProgress` directly via `encoding/json`; the frontend consumes it via a hand-written TypeScript interface (`frontend/src/types/profile.ts`) with no runtime shape validation at the network boundary.
   - `shared/contracts/openapi.yaml` functions here purely as a documentation/drift-detection contract (exactly what this test file itself exists to enforce byte-for-byte), not as an executable schema gate.

3. **Does "required" on a JSON response schema actually constrain existing consumers at runtime, or is it just server-side documentation?** For a response body (as opposed to a request body validated by a server before accepting it), "required" in an OpenAPI schema is descriptive, not enforced by any runtime gate in this codebase (per point 2). A permissive JSON consumer that destructures only the fields it knows about (which is exactly what pre-Phase-150 frontend code did, and what `PublicMemberBadge`'s own already-established pattern of optional `current_count?`/`current_tier?` fields shows is the norm for badge-shaped types elsewhere in `profile.ts`) is entirely unaffected by two new keys appearing in the object — extra JSON object keys are inert to any code that doesn't reference them, and TypeScript's structural typing only requires updating type declarations for anyone recompiling against the new interface, not for already-running/already-built consumers of the wire format itself.

**Conclusion:** My own investigation (reading the actual Go struct, the actual `buildBadgeProgress`/`role_volume`-entry code, and searching for any strict validator) **confirms** the prompt's expected conclusion: marking `current_tier` and `stages` as `required` in the OpenAPI response schema is accurate and safe. Both fields are unconditionally populated server-side on every entry with no code path that omits them, and no strict/closed schema validator exists anywhere in this codebase (frontend or backend) that would reject a response for having gained new required keys. "Required" here correctly documents an invariant the server actually and always upholds — it is not a runtime constraint that could break any consumer, old or new. No nullability change is warranted; the schema, the Go model, and the TypeScript interface are all already correct as committed in Task 2, and the test fix above simply catches the drift-test up to that already-correct reality.
