---
phase: 137-central-effective-rights-resolver-overrides
reviewed: 2026-08-21T23:55:34Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - database/migrations/0151_fansub_group_media_view_role_defaults.up.sql
  - database/migrations/0151_fansub_group_media_view_role_defaults.down.sql
  - backend/internal/migrations/phase137_fansub_group_media_view_test.go
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 137: Code Review Report (Plan 137-13, GAP-07 / UAT-137-01 closure)

**Reviewed:** 2026-08-21T23:55:34Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Plan 137-13 closes GAP-07 (UAT-137-01): migration 0146 (Phase 136) granted `co_leader`,
`founder`, `gfxler`, and `techadmin` `fansub_group_media.upload/.update/.reorder` but not
`.view`, so those four roles could edit group media but the frontend media tab and backend
list endpoint stayed hidden/denied for them (`canUseMainTab`'s `"media"` case reads only
`capabilities.can_view_group_media`; `app_auth.go`'s `canViewGroupMediaAllowed` is fed only
by the role-scoped `fansub_group_media.view` permission-service lookup and a *separate*
per-member custom-permission table — role-level upload/update/reorder grants do **not**
flow into it). Migration 0151 is a minimal, additive `INSERT ... ON CONFLICT DO NOTHING`
that grants exactly the missing `.view` capability to the four roles.

Verification performed beyond static reading:
- Confirmed 0151 is the correct next migration number (0150 is the prior HEAD) and that the
  migration runner (`backend/internal/migrations/runner.go`) auto-discovers migration files
  by directory scan, so no manifest/registration wiring is needed.
- Cross-checked 0109 and 0146's actual SQL to confirm the up-migration's descriptive comment
  is accurate: 0109 seeded `fansub_group_media.view`/`.upload`/`.update`/`.delete` only for
  `fansub_lead`/`project_lead`; 0146 added `.upload`/`.update`/`.reorder` for the four target
  roles without `.view`, and added the `user_overridable` column with `DEFAULT false` without
  touching the pre-existing `.view` action row (so it correctly stays `user_overridable = false`
  as the comment claims — the action row itself does not need to be, and is not, re-inserted).
  0151 does not touch `action_definitions`, `role_definitions`, or the two roles' pre-existing
  0109 rows.
- Down migration's `role_code IN (...)` filter correctly scopes the `DELETE` to exactly the
  four newly-granted roles; it cannot regress the two pre-existing 0109 grants.
- Ran the frontend regression test live in the `team4sv30-frontend` container
  (`npx vitest run ".../fansubEditAccess.test.ts"`): 10/10 pass, including the new
  co_leader-shaped-capabilities case. `tsc --noEmit` reports no type errors touching this file.
- Ran the backend regression suite live against a disposable, guard-pattern-compliant
  Postgres database (`team4s_phase106_test_13713review`, matching
  `^team4s_phase106_test_[a-z0-9]+$`) inside the `team4sv30-backend` container with
  `TEAM4S_PHASE106_TEST_DSN` set: all 3 new tests pass —
  `TestPhase137FansubGroupMediaViewMigrationSourceContract`,
  `TestPhase137FansubGroupMediaViewMigrationLiveUpDownUp` (up→down→up round trip, counts
  6→2→6, exact role membership asserted at each step), and
  `TestPhase137FansubGroupMediaViewGrantedOnlyToTargetRoles` (a fifth unrelated role with no
  prior media capabilities does not spuriously gain `.view`). The disposable database was
  dropped after the run.
- Confirmed against the real dev database (`team4s_v2`'s `schema_migrations` table) that 0151
  has not yet been applied there (HEAD is still 0150) — expected for a plan artifact pending
  deployment, not a defect in the reviewed files.

No bugs, security issues, or scope violations found in the four reviewed files. The migration
is genuinely additive and idempotent, the down migration is exactly and only the inverse of
the up migration's four grants, and both new test suites pass live (not just compile-checked).

## Info

### IN-01: Up/down round-trip test does not cover re-running `up` twice consecutively without an intervening `down`

**File:** `backend/internal/migrations/phase137_fansub_group_media_view_test.go:60-75`
**Issue:** `TestPhase137FansubGroupMediaViewMigrationLiveUpDownUp` proves `up → down → up`
restores state correctly, but never applies `up.sql` twice back-to-back (i.e. `up → up`)
to directly exercise the `ON CONFLICT (role_code, action_code) DO NOTHING` idempotency
guard against a live unique-constraint conflict. In practice this is low-risk because the
migration runner's `schema_migrations` ledger prevents `up.sql` from ever being executed
twice in normal operation, and the `ON CONFLICT` clause is SQL-level and provably correct
by inspection — but a direct `up → up` assertion would make the idempotency claim in the
migration's own header comment ("purely additive") empirically verified rather than only
structurally argued.
**Fix:** Optional follow-up; not required for this gap closure. If desired, add a fourth
step to the existing live test:
```go
testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile))
assertPhase137FansubGroupMediaViewGrantedRoles(t, pool) // already re-applying at line 73-74
testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile)) // NEW: re-apply without an intervening down
assertPhase137FansubGroupMediaViewGrantedRoles(t, pool)
```

---

_Reviewed: 2026-08-21T23:55:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
