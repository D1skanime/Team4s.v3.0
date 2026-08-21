---
phase: 137-central-effective-rights-resolver-overrides
plan: 01
subsystem: database
tags: [postgres, migrations, authorization, capability-catalog, tdd]

# Dependency graph
requires:
  - phase: 136-capability-policy-catalog-schema-contract
    provides: user_overridable fail-closed catalog flag, user_group_capability_overrides / user_group_capability_override_history tables, append-only audit trigger (migration 0146)
provides:
  - Migration 0150 flipping exactly ten approved actions to user_overridable=true
  - New user_group_capability_override.manage capability, permanently non-overridable, seeded only to fansub_lead
  - Fresh up/down/up migration contract test proving the delta and its reversal
affects: [137-02, 137-03, 137-04, 137-05, 137-06, 137-07, 137-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only catalog migration reusing an existing composite FK (action_definitions(code, user_overridable)) as the fail-closed backstop for a new pilot override set"
    - "Migration contract test pattern: source-fragment assertions + a real-Postgres fresh up/down/up cycle, mirroring the Phase-136 test style and reusing its generic readPhase136Migration/phase136MigrationPath/requirePhase136SQLContains helpers across phase boundaries"

key-files:
  created:
    - database/migrations/0150_effective_rights_overrides.up.sql
    - database/migrations/0150_effective_rights_overrides.down.sql
    - backend/internal/migrations/phase137_effective_rights_overrides_test.go
  modified: []

key-decisions:
  - "New management capability code is user_group_capability_override.manage; its 'capability' token is structurally caught by migration 0146's existing CHECK constraint, so it can never be flipped to user_overridable=true even by mistake."
  - "Seeded management capability only onto fansub_lead, matching the one existing role (per migration 0108) that already owns fansub_group.members.manage; founder/co_leader are not promoted by role name."
  - "Pilot user_overridable=true set is exactly the seven Phase-136 group media/page/link actions plus all three review.*.decide actions, giving later Phase-137 plans a real Review-Delegation-vs-User-Deny action to test against."

patterns-established:
  - "Reuse of prior-phase generic migration-test helpers (phase136_capability_policy_catalog_test.go's readPhase136Migration/phase136MigrationPath/requirePhase136SQLContains) by later-phase test files in the same package, instead of duplicating near-identical helpers per phase."

requirements-completed: [CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~25min
completed: 2026-08-21
---

# Phase 137 Plan 01: Migration 0150 - Effective-Rights Override Catalog Delta Summary

**Migration 0150 makes Phase-136's override schema usable: it adds a fail-closed `user_group_capability_override.manage` management capability seeded only to `fansub_lead`, and flips exactly ten approved group/review actions to `user_overridable=true`, unblocking every later Phase-137 plan's override read/write/test surface.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-21T17:26:44Z
- **Completed:** 2026-08-21T17:33:14Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 new SQL migration files, 1 new Go test file)

## Accomplishments

- Migration `0150_effective_rights_overrides.{up,down}.sql` added as the next additive migration after `0149`, leaving migration `0146` byte-for-byte untouched.
- Exactly ten actions now carry `user_overridable=true`: the seven Phase-136 group media/page/link actions (`fansub_group_media.upload/update/reorder`, `fansub_group_page.general_edit/technical_links_edit/founding_history_edit`, `fansub_group_links.update`) plus all three `review.*.decide` actions (`review.text.decide`, `review.image.decide`, `review.contribution.decide`).
- New dedicated capability `user_group_capability_override.manage` added, permanently non-overridable (both by explicit `false` value and structurally via migration 0146's existing CHECK constraint), and seeded exclusively to `fansub_lead`.
- A fresh migration contract test (`backend/internal/migrations/phase137_effective_rights_overrides_test.go`) specifies and proves: the management capability's non-overridability, the exact ten-action pilot set (no more, no fewer), representative protected/role/security/delegation/audit/platform/admin capability classes remaining `false`, fansub_lead-only seeding (founder/co_leader excluded), and a real-Postgres fresh up/down/up reversibility cycle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify the Phase-137 catalog delta in migration tests** - `d5773460` (test) - RED confirmed: all 5 test functions failed (2 due to missing migration file, 3 skipped without `TEAM4S_PHASE106_TEST_DSN`; re-run with the DSN set confirmed all 5 genuinely failed against the pre-0150 schema).
2. **Task 2: Implement reversible migration 0150** - `6438ef24` (feat) - GREEN confirmed: all 5 tests pass; full `internal/migrations` package regression run (Phase106/107/108/109/117/136/137) shows zero new failures; `git diff --check` clean.

**Plan metadata:** (this commit, once created)

_Note: This is a `tdd="true"` plan executed with a strict RED → GREEN cycle per task, not a plan-level TDD gate; each task's own test file was written first and confirmed failing before the corresponding implementation was added._

## Files Created/Modified

- `database/migrations/0150_effective_rights_overrides.up.sql` - Adds the management capability, flips the ten-action pilot set, seeds fansub_lead.
- `database/migrations/0150_effective_rights_overrides.down.sql` - Reverses the role mapping, the ten flags, and the new action row, in dependency order.
- `backend/internal/migrations/phase137_effective_rights_overrides_test.go` - Source-contract and real-Postgres fresh up/down/up contract tests for the Phase-137 catalog delta; also proves the CHECK constraint still rejects flipping role/security/delegation/audit-class actions to overridable after 0150 is applied.

## Decisions Made

- **Management capability naming:** `user_group_capability_override.manage`, matching Open Question 3 in `137-RESEARCH.md`'s recommendation. Its `capability` token is caught by migration 0146's `chk_action_definitions_user_override_policy` regex, so any attempt to set `user_overridable=true` on it fails at the DB layer independent of application discipline (verified directly by `TestPhase137ManagementCapabilityNonOverridable`).
- **Seeded role:** `fansub_lead` only — not `founder` (contrary to `137-RESEARCH.md`'s Open Question 3 recommendation of seeding both `fansub_lead` and `founder`). The plan's own `must_haves.truths` explicitly required fansub_lead-only seeding based on it being the sole role that already owns `fansub_group.members.manage` per migration 0108; the plan's binding requirement took precedence over the research document's softer recommendation. `founder`/`co_leader` explicitly do **not** receive the capability by role name, matching D07's "no hard-coded role names" rule.
- **Pilot override set:** all ten actions the plan named (seven Phase-136 group actions + all three `review.*.decide` actions), matching `137-RESEARCH.md` Open Question 2's stronger option (rather than deferring review-action overridability), so the Review-Delegation-vs-User-Deny negative-security-matrix case from `137-CONTEXT.md` Section 7 has a real overridable action to exercise in later plans.

## Deviations from Plan

None - plan executed exactly as written. The plan's `must_haves` fully match the delivered migration and test content; no Rule 1-4 auto-fixes were required.

## Known Stubs

None - this plan is pure schema/catalog data plus a migration contract test; no application code or UI was touched.

## Threat Flags

None - all surface introduced is exactly what the plan's own `<threat_model>` anticipated (the management capability's non-overridability, the exact ten-action allow-list, and role-name-independent seeding), with no new network endpoint, auth path, or additional schema beyond what was scoped.

## Issues Encountered

None. `TEAM4S_PHASE106_TEST_DSN` is not set by default in this environment; a disposable guarded database (`team4s_phase106_test_13701`, matching `OpenPhase106Postgres`'s required naming pattern) was created for the live up/down/up proof and dropped again after tests passed, following the same disposable-test-database convention documented in Phase 136's summaries (e.g. `team4s_phase106_test_13616`).

## Next Phase Readiness

- Migration 0150 is the schema foundation the rest of Phase 137 (central resolver, specialized grant provider, override mutation service, Effective-Rights Inspection API, override mutation API, BOLA/IDOR-hardened handlers) needs before any override row can be inserted or any precedence test can run against a real overridable action.
- The next plan can now build `permissions.GroupRightsResolution` / `ResolveGroupRights` and the `SpecializedGrantProvider` interface per `137-RESEARCH.md` Pattern 1/2, with `review.contribution.decide` (and the other two review actions) available as real overridable targets for the "Review Delegation + User Deny -> DENY" negative test.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 01*
*Completed: 2026-08-21*

## Self-Check: PASSED

All created files verified present on disk; all three task/summary commit hashes (`d5773460`, `6438ef24`, `a069b445`) verified present in `git log`.
