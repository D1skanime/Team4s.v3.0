---
phase: 260826-l5l-behebe-den-restore-defekt-in-f-unaccent-
plan: 01
subsystem: database
tags: [postgres, migrations, pg_dump, pg_restore, unaccent, search]

# Dependency graph
requires:
  - phase: 115 Plan 02 (0140_search_foundation)
    provides: f_unaccent(text) IMMUTABLE wrapper and the five *_unaccent_trgm functional GIN indexes
provides:
  - Restore-safe f_unaccent(text) that resolves correctly under pg_dump's empty search_path preamble
  - A live-proven pg_dump/pg_restore round-trip of team4s_v2 with 0 errors
affects: [phase-142-release-gate, backup-and-restore-tooling]

tech-stack:
  added: []
  patterns:
    - "Schema-qualify function calls and dictionary names inside SQL functions instead of adding SET search_path, to keep planner inlining on functions used inside functional indexes/generated columns"

key-files:
  created:
    - database/migrations/0152_f_unaccent_search_path_fix.up.sql
    - database/migrations/0152_f_unaccent_search_path_fix.down.sql
  modified:
    - .planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md

key-decisions:
  - "Schema-qualify both the function call (public.unaccent) and the dictionary name (public.unaccent::regdictionary) inside f_unaccent's body, rather than adding SET search_path = public to the function, to avoid disabling planner inlining on a function used by 5 GIN indexes + 2 generated tsvector columns"
  - "CREATE OR REPLACE FUNCTION with an unchanged signature keeps the five existing *_unaccent_trgm GIN indexes valid without any rebuild"
  - "Pre-0152 backup files (e.g. the existing team4s_v2.dump under /home/d1sk/backups/2026-08-26-kc-upgrade-reset/) still require the documented sed search_path workaround, since the defect is baked into that dump's own DDL; only post-0152 dumps restore natively"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-08-26
---

# Quick Task 260826-l5l: Fix f_unaccent pg_restore Defect Summary

**Schema-qualified f_unaccent's unaccent() call and dictionary name so pg_dump/pg_restore round-trips of team4s_v2 succeed natively (89 errors -> 0), without adding a planner-inlining-breaking SET search_path.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-26T15:05:00Z (approx.)
- **Completed:** 2026-08-26T15:20:26Z
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 new migration files, 1 notes file update)

## Accomplishments
- Closed the confirmed pg_restore-breaking defect documented as Befund 1 in `.planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md`: `f_unaccent`'s unqualified `unaccent('unaccent', $1)` call was unresolvable under pg_dump's empty `search_path` preamble, previously causing 89 cascading restore errors.
- New migration 0152 schema-qualifies the function body (`public.unaccent('public.unaccent'::regdictionary, $1)`), keeping the exact same signature/IMMUTABLE/PARALLEL SAFE/STRICT modifiers so all five `*_unaccent_trgm` GIN indexes stayed valid with zero rebuild.
- Applied migration 152 against the live `team4sv30-db` container and proved the fix with a real `pg_dump --format=custom` / `pg_restore` round-trip into a throwaway database: 0 errors (down from 89), 114 tables and all five indexes restored valid.
- Updated the keycloak-upgrade note's Befund 1 section to mark the fix done and explicitly clarify that only post-0152 backups skip the sed workaround; pre-0152 backup files still need it.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0152 (up + down)** - `7990f19d` (fix)
2. **Task 2: Apply the migration and verify the function/index state in-container** - no commit (verification only, `files: none` per plan)
3. **Task 3: Prove the restore fix with a real pg_dump/pg_restore round-trip, then update the keycloak-upgrade note** - `b832709d` (docs)

_Note: Task 2 had no files to commit -- it applied the migration to the running database and ran verification queries only._

## Files Created/Modified
- `database/migrations/0152_f_unaccent_search_path_fix.up.sql` - New `f_unaccent(text)` body using schema-qualified `public.unaccent('public.unaccent'::regdictionary, $1)`, with the same signature/modifiers as 0140 so dependent indexes stay valid
- `database/migrations/0152_f_unaccent_search_path_fix.down.sql` - Rollback restoring the original 0140 body (`unaccent('unaccent', $1)`) for migration reversibility only
- `.planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md` - Befund 1 section updated: fix marked done, pre-0152-vs-post-0152 backup distinction stated explicitly

## Decisions Made
- Schema-qualified the function body instead of adding `SET search_path = public` to the function, to preserve query-planner inlining (a SQL function with a SET clause cannot be inlined, which would make all 5 GIN-indexed and 2 generated-tsvector search paths more expensive).
- Followed 0140's exact migration style (no explicit BEGIN/COMMIT, German header comments) rather than 0151's BEGIN/COMMIT convention, per the plan's explicit precedent guidance (0152 directly replaces 0140's own function).

## Deviations from Plan

None - plan executed exactly as written. All must_haves, verification steps, and success criteria were met:
- `database/migrations/0152_f_unaccent_search_path_fix.up.sql`/`.down.sql` exist and match the required contents (`public.unaccent` in up, `unaccent('unaccent'` in down)
- `schema_migrations` reports version 152 applied
- All five `*_unaccent_trgm` GIN indexes report `indisvalid = t`
- `f_unaccent('Pokemon-Muell')` -> `Pokemon-Muell`, `f_unaccent('Fansübergruppe Ärger')` -> `Fansubergruppe Arger` (both accent-free)
- A real `pg_dump --format=custom` / `pg_restore` round-trip of `team4s_v2` (post-0152) completed with 0 errors (exit code 0, 114 tables, all 5 indexes valid in the restored throwaway database)
- The throwaway `team4s_v2_restore_proof` database and `/tmp/team4s_v2_0152_proof.dump` were cleaned up afterward (both confirmed absent)
- `git diff` confirms only the two new migration files and the notes file changed -- no changes to 0140, to any index, or to any generated column

## Known Stubs

None.

## Threat Flags

None - the two threats in the plan's own threat_model (T-260826l5l-01 tampering, T-260826l5l-02 DoS via throwaway DB) were both accepted-disposition and matched exactly what was implemented; no new surface was introduced beyond what the plan already registered.

## Next Steps
- None required by this quick task. The plan's context notes this belongs conceptually to Phase 142 (Release-Gate); no further action is needed here since the fix is applied, proven, and documented.

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commit hashes (`7990f19d`, `b832709d`) confirmed present in `git log`.
