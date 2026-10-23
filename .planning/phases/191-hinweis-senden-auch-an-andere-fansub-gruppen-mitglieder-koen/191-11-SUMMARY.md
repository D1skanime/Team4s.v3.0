---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 11
subsystem: database
tags: [postgres, migration, go, pgx, fansub-group-hints, d-09, d-11]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "fansub_group_hints table + FansubGroupHintsRepository (Plan 191-01)"
provides:
  - "Migration 0188: fansub_group_hints without hint_type/requested_role_code, related_anime_id NOT NULL"
  - "FansubGroupHintsRepository.HasActiveLead + ListWithoutActiveLead (D-11 server-side 'no active lead' predicate)"
  - "Phase-191 test fixture extended with a real fansub_group_member_roles stand-in"
affects: ["191-12", "191-13 ff"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-11 'has active lead' predicate: EXISTS/NOT EXISTS against fansub_group_members JOIN fansub_group_member_roles, role bound via permissions.RoleFansubLead as a parameterized arg, never a string literal"

key-files:
  created:
    - database/migrations/0188_fansub_group_hints_drop_membership_request.up.sql
    - database/migrations/0188_fansub_group_hints_drop_membership_request.down.sql
  modified:
    - backend/internal/repository/fansub_group_hints_repository.go
    - backend/internal/repository/fansub_group_hints_repository_test.go
    - backend/internal/testsupport/phase191_postgres.go

key-decisions:
  - "D-09: hint_type/requested_role_code dropped from fansub_group_hints; every remaining row is implicitly a correction hint with a mandatory related_anime_id"
  - "D-11: 'does this group have an active fansub_lead' is computed entirely server-side from fansub_group_member_roles, never from a client field"

requirements-completed: [D-09, D-11, D-15]

# Metrics
duration: ~25min
completed: 2026-10-23
---

# Phase 191 Plan 11: Gap-Closure Live-UAT-Nachbesserung (Schema + Repository) Summary

**Migration 0188 streicht hint_type/requested_role_code aus fansub_group_hints (D-09); FansubGroupHintsRepository bekommt HasActiveLead/ListWithoutActiveLead, die serverseitig aus fansub_group_member_roles berechnen, ob eine Fansub-Gruppe aktuell eine aktive Leitung hat (D-11).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-23T19:20:00Z (approx.)
- **Completed:** 2026-10-23T19:40:00Z (approx.)
- **Tasks:** 2 completed
- **Files modified:** 5 (2 new migration files, 1 testsupport file, repository.go, repository_test.go)

## Accomplishments

- Append-only Migration 0188 (D-09): `hint_type`/`requested_role_code` columns dropped, `related_anime_id` now `NOT NULL`, `uq_fansub_group_hints_open_topic` rebuilt narrower, `idx_fansub_group_hints_role_status` dropped. Verified live on the dev DB with a full up → down → up round-trip.
- `FansubGroupHintsRepository` rewritten: `HintInput`/`FansubGroupHintRow` no longer carry the removed fields; `CreateHint` only inserts the remaining four columns.
- New `HasActiveLead(ctx, fansubGroupID)` and renamed `ListWithoutActiveLead` (from `ListForFansubLeadRole`) implement D-11's security-critical predicate entirely in SQL against `fansub_group_members`/`fansub_group_member_roles`, bound via `permissions.RoleFansubLead` — proven against real Postgres (see Verification below) to return `true`/`false`/exclude-rows correctly for active-lead, no-lead, and disabled-only-lead fixtures.
- Phase-191 test fixture (`phase191_postgres.go`) extended with a real, production-shaped `fansub_group_member_roles` stand-in and now applies migration 0188 after 0187, so every future test in this fixture runs against the final, post-cut schema.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0188 + test fixture update** - `9103d23c2` (feat)
2. **Task 2: Repository rewrite (RED)** - `52ed6cd4a` (test)
3. **Task 2: Repository rewrite (GREEN)** - `85652e323` (feat)

_TDD task: test (RED) → feat (GREEN); no refactor commit needed, implementation was correct on first pass._

## Files Created/Modified

- `database/migrations/0188_fansub_group_hints_drop_membership_request.up.sql` - D-09 schema cut (new)
- `database/migrations/0188_fansub_group_hints_drop_membership_request.down.sql` - lossless reverse migration (new)
- `backend/internal/repository/fansub_group_hints_repository.go` - `HintInput`/`FansubGroupHintRow` without the removed fields; `HasActiveLead`/`ListWithoutActiveLead` added
- `backend/internal/repository/fansub_group_hints_repository_test.go` - tests rewritten for the single-hint-type model; `ListForFansubLeadRole`-test replaced by `ListWithoutActiveLead`-tests; obsolete COALESCE-NULL-collision test removed (scenario no longer exists)
- `backend/internal/testsupport/phase191_postgres.go` - added `fansub_group_member_roles` stand-in, applies migration 0188's up.sql

## Decisions Made

- D-09/D-11 exactly as specified in `191-CONTEXT.md` — no deviation from the decided scope.
- Kept `HasActiveLead` and `ListWithoutActiveLead`'s predicates as two separately-written (not code-shared) SQL formulas, each with a comment cross-referencing the other, rather than a shared string constant with positional `%d` placeholders — the shared-constant approach added `fmt.Sprintf` indirection risk without a real benefit for two short, independently-readable queries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration 0188's explicit `DROP INDEX uq_fansub_group_hints_open_topic` failed with "does not exist"**
- **Found during:** Task 1, first live-DB `migrate up` attempt
- **Issue:** The plan's exact DDL dropped `hint_type`/`requested_role_code` via `ALTER TABLE ... DROP COLUMN`, then tried to explicitly `DROP INDEX uq_fansub_group_hints_open_topic`. Postgres automatically cascades and drops any index that references a dropped column (the index's expression list included both `hint_type` and `requested_role_code` directly) as a side effect of the `DROP COLUMN` statements — so by the time the explicit `DROP INDEX` ran, the index was already gone, and the statement failed with `ERROR: index "uq_fansub_group_hints_open_topic" does not exist`.
- **Fix:** Removed the now-redundant explicit `DROP INDEX` statement from `0188...up.sql` (only this NEW, not-yet-successfully-applied file was touched — migration 0187 was never edited, per CLAUDE.md). The subsequent `CREATE UNIQUE INDEX` recreates it fresh under the same name.
- **Files modified:** `database/migrations/0188_fansub_group_hints_drop_membership_request.up.sql`
- **Verification:** `migrate up` / `migrate down -steps 1` / `migrate up` round-trip against the live dev DB all succeeded after the fix; `\d fansub_group_hints` confirmed the expected final schema (no `hint_type`/`requested_role_code`, `related_anime_id NOT NULL`, narrowed unique index).
- **Committed in:** `9103d23c2` (Task 1 commit)

**2. [Rule 1 - Bug] Acceptance-criterion grep `'fansub_lead'` matched a doc comment, not forbidden code**
- **Found during:** Task 2, acceptance-criteria self-check after the GREEN commit
- **Issue:** `HasActiveLead`'s doc comment explained "kein String-Literal 'fansub_lead' im Code" — the quoted literal inside the explanatory comment itself tripped the plan's own `grep -c "'fansub_lead'"` acceptance check (intended to catch the role string appearing as a raw code literal, not as a quoted example inside a comment explaining its absence).
- **Fix:** Reworded the comment to describe the same fact ("kein rohes Rollencode-String-Literal im Code") without quoting the literal string.
- **Files modified:** `backend/internal/repository/fansub_group_hints_repository.go`
- **Verification:** `grep -c "'fansub_lead'" backend/internal/repository/fansub_group_hints_repository.go` now returns `0`.
- **Committed in:** `85652e323` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs discovered while verifying this plan's own acceptance criteria)
**Impact on plan:** Both fixes were necessary for the plan's own stated acceptance criteria/verification to actually pass; no scope creep beyond this plan's files.

## Issues Encountered

- **Task 2's own `<verify>` command (`go test ./internal/repository/... -run FansubGroupHint -v`) currently fails to even compile**, and so does the plan-level `<verification>`'s `go build ./...`. Root cause: three pre-existing files in `backend/internal/handlers` (`fansub_group_hints_me_handler.go`, `fansub_group_hints_review_handler.go`) still construct `repository.HintInput{HintType: ..., RequestedRoleCode: ...}` and read `row.RequestedRoleCode` — fields this plan intentionally removed per D-09. Fixing those handlers (plus `admin_fansub_group_hints_handler.go`'s `ListForFansubLeadRole` → `ListWithoutActiveLead` rename, `main.go` wiring, the OpenAPI contract, and a D-15 doc-comment/audit-log sweep) is **Plan 191-12's full, separately-planned scope** (`depends_on: ["191-11"]`, wave 2, already fully specified with its own tasks/tests/acceptance criteria in `191-12-PLAN.md`). Per operational guardrail #1 ("Produktverhalten nur gemäß D-09..D-16 ändern — NIE um Tests künstlich grün machen") and to avoid duplicating/pre-empting 191-12's detailed, already-planned rewrite with a half-done patch, this plan did **not** touch those handler files.
  - **Resolution used instead:** `go build ./internal/repository/...` (non-test files only) was run and passes cleanly, proving the repository package itself is correct in isolation. To exercise `HasActiveLead`/`ListWithoutActiveLead` against real Postgres despite the handlers-package compile block (several *other*, pre-existing `_test.go` files in `internal/repository`, e.g. `anime_public_read_integration_test.go`, cross-import `internal/handlers` for unrelated integration tests, so the whole `internal/repository` test binary cannot currently compile), a temporary, isolated verification package (`backend/internal/verify191tmp`, never committed) that imports only `repository`+`testsupport`+`permissions` was created, run against a dedicated throwaway Postgres database, confirmed GREEN (`HasActiveLead` true/false/false for active/no-role/disabled-only-lead fixtures; `ListWithoutActiveLead` returned exactly the one hint whose target group has no active lead), then deleted along with its throwaway database — leaving no trace in the committed diff.
  - **Full backend suite** (`scripts/test-backend.sh`) was still run end-to-end: **zero individual test assertion failures** (0 `--- FAIL:`, 543 `--- PASS:`, 14 `ok` packages) across every other package; the only `[build failed]` packages are `internal/handlers` and everything that imports it (`cmd/server`, `cmd/migrate-display-backfill`, `cmd/migrate-preview-backfill`, `internal/repository`'s own test binary) — exactly and only the pre-identified, Plan-191-12-scoped set.
  - **Operational note for the next session:** the live dev backend container (`team4sv30-backend`, via `air` hot-reload) detected the repository.go change, attempted a rebuild, and failed with the same 3 compile errors — `air` therefore kept the **previous** (pre-191-11) binary running rather than crashing. That old binary's SQL still references `hint_type`/`requested_role_code`, which migration 0188 already dropped from the live dev database — **the "Hinweis senden" feature is non-functional on the live dev stack until Plan 191-12 is executed** (expected, by design, given the wave-1/wave-2 split; not a regression to chase down separately). Run `/gsd:execute-phase` for `191-12` next to close this gap.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema and repository layer are ready for Plan 191-12's handlers to consume `ListWithoutActiveLead`/`HasActiveLead`.
- **Blocker for Plan 191-12 (expected, not a surprise):** `internal/handlers` does not compile until 191-12's Task 1+2 remove the `HintType`/`RequestedRoleCode` references and rename `ListForFansubLeadRole` → `ListWithoutActiveLead`. 191-12 must run before any further manual/live testing of the "Hinweis senden" flow.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

All 5 created/modified files and all 3 task commit hashes (9103d23c2, 52ed6cd4a, 85652e323) verified present.
