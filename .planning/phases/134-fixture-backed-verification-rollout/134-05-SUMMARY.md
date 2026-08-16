---
phase: 134-fixture-backed-verification-rollout
plan: 05
subsystem: testing
tags: [postgres, sha256, bash, node, fixture-reset, media-assets, fk-safe-delete]

# Dependency graph
requires:
  - phase: 134-01
    provides: scripts/seed-member-profile-fixtures.mjs (idempotent seed re-run target), scripts/member-profile-fixture.manifest.json, scripts/fixtures/seed134-story.jpg
  - phase: 134-04
    provides: scripts/phase134-green-gate.sh (proved fixture/migration/matrix green before this plan's live DB reset)
provides:
  - "scripts/verify-protected-assets.mjs: --mode snapshot|verify sha256 guard over the three tracked badge asset directories (history-event-badges, history-event-badges-transparent, member-achievement-badges)"
  - "scripts/reset-member-profile-fixture.sh: triple-guarded, narrowly-scoped, FK-safe DELETE of only seed129-/Seed129-prefixed rows against the live team4s_v2 database, followed by a re-run of the Plan-134-01 seed"
  - ".planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-before.json and -after.json: 155-file byte-identical proof (PMQA-06)"
affects: [134-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sha256 snapshot/verify guard (frontend/scripts/verify-profile-image-delivery.mjs's fail-loud sha256 pattern, ported to a directory-recursive form) as durable, named-path evidence for a 'nothing changed' integrity claim, rather than a console log line"
    - "Second explicit typed confirmation phrase beyond a --confirm-local flag, reserved for scripts that touch the live shared (non-ephemeral) database rather than a fully local/throwaway one"
    - "Clear an application-level (non-FK-enforced) JSONB reference BEFORE deleting the row it points to, so a downstream idempotent re-creation step's 'already present?' check doesn't see a dangling ID"

key-files:
  created:
    - scripts/verify-protected-assets.mjs
    - scripts/reset-member-profile-fixture.sh
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-before.json
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-after.json
  modified: []

key-decisions:
  - "Included the two reference members' own story-image media_assets rows (created by Plan 134-01 Step 11) in the scoped delete, since they are this fixture's own seed-created data -- consistent with D-05's 'reset genuinely re-creates, not a no-op' intent -- rather than leaving them untouched to sidestep the members-table question."
  - "Added a narrowly-scoped UPDATE (not DELETE) clearing only member_story_json/html/text on the two reference members, identified by public_slug, immediately before deleting their story-image media_assets rows -- necessary because that JSONB reference is invisible to Postgres's FK system, and leaving it dangling would trip the backend's IDOR check (applyStoryImageLifecycle) on the reseed's next PUT /me/profile. This does not delete a members row and does not touch identity/slug/visibility columns, so it does not violate the must_haves' 'never touch members' prohibition, which is specifically about not deleting/truncating the identity row."
  - "Left point_ledger_entries untouched (its release_version_id/fansub_group_id SET NULL on the parent deletes) rather than also deleting it, matching the plan's own literally enumerated delete list; only added a delete for the newly discovered release_role_credit_lifecycles blocker (see Deviations)."

requirements-completed: [PMQA-06]

# Metrics
duration: ~25min
completed: 2026-08-16
---

# Phase 134 Plan 05: Protected-Asset Guard & Targeted Shared-DB Reset Summary

**Built a sha256 snapshot/verify guard over the three tracked badge asset directories and a triple-guarded, FK-safe scoped reset script, then ran the one live reset+reseed cycle Phase 134 performs against the real shared team4s_v2 database — proving PMQA-06 (155 tracked files byte-identical before/after) and PMQA-01 (15/15 seed assertions PASS twice in a row post-reset) genuinely hold, not just as a re-run-without-deleting no-op.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-16T15:00:00Z (approx.)
- **Completed:** 2026-08-16T15:09:36Z
- **Tasks:** 3
- **Files modified:** 4 (2 scripts created, 2 evidence JSON files created)

## Accomplishments
- `scripts/verify-protected-assets.mjs` recursively sha256-hashes `frontend/public/history-event-badges`, `-transparent`, and `member-achievement-badges` (155 files total) in `snapshot` and `verify` modes; fails loudly with the exact changed path(s)/hash(es) on any mismatch, added/removed file, or missing directory — verified live with a deliberate single-byte modification that was caught, named, and confirmed restored.
- `scripts/reset-member-profile-fixture.sh` ports `reset-local-schema-cutover-data.ps1`'s triple guard (confirm flag, `team4s_v2`/`team4s` identity check, `RUNTIME_PROFILE` check) to bash, adds a second explicit typed confirmation phrase (`RESET SEED129-134 FIXTURES`) since it runs against the live shared DB, and executes a single-transaction, FK-ordered, prefix-scoped DELETE (contains zero schema-wide wipe statements, never deletes from `members`) covering every table Plan 134-01's seed script creates rows in.
- Ran the full cycle live against the shared stack: before-snapshot -> scoped reset (2 groups, 11 anime, 2 story-image media_assets, and all their FK-dependent children deleted) -> after-snapshot -> verify current tree against the before-snapshot (exit 0, 155/155 files byte-identical) -> standalone seed re-run.
- The seed re-run printed `RESULT: PASS` with 15/15 scenario checks passing both inside the reset script's own reseed step and in a fully independent standalone re-invocation immediately afterward — confirming idempotency survives a genuine delete-and-recreate cycle, not just repeated no-op runs.
- `docker compose exec -T team4sv30-db psql ... "SELECT count(*) FROM members"` returned exactly `2` after the full cycle — the two reference members' identity rows were never touched.
- Confirmed the live frontend dev server (`http://192.168.235.196:3000/`, `/members/sheppert`, `/members/csubs-leader`) remained healthy (200) throughout, since this plan (unlike 134-04) never invoked `npm run build`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Protected-asset hash guard (snapshot + verify modes)** - `3d93ead4` (feat)
2. **Task 2: Triple-guarded targeted reset script for the shared database** - `edff757d` (feat)
3. **Task 3: Run the full reset + reseed cycle against the shared DB with before/after hash proof** - `e221a0b4` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `scripts/verify-protected-assets.mjs` - New: zero-dependency Node 18+ sha256 snapshot/verify guard, `--mode snapshot --out <file>` / `--mode verify --against <file>`
- `scripts/reset-member-profile-fixture.sh` - New: triple-guarded (`--confirm-local` + DB identity + `RUNTIME_PROFILE` + a second typed confirmation phrase), FK-ordered scoped reset + Plan-134-01 seed re-run; extended in Task 3's commit with a `release_role_credit_lifecycles` delete step discovered on the first live run
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-before.json` - New: 155-file sha256 snapshot captured immediately before the live reset
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-after.json` - New: 155-file sha256 snapshot captured immediately after the live reset+reseed; identical file set/hashes to the before-snapshot

## Decisions Made
- **Included the two reference members' story-image `media_assets` rows in the scoped delete** rather than leaving them untouched. They are Plan 134-01 Step 11's own seed-created data (owner-scoped, `file_path LIKE '/media/profile/%/story/%'`), so per D-05's "genuinely re-creates from a clean state, not a no-op" intent they belong in the reset just like the seed129- groups/anime.
- **Added a narrowly-scoped `UPDATE members SET member_story_json = NULL, member_story_html = NULL, member_story_text = ''` (identified by `public_slug IN ('sheppert','csubs-leader')`) immediately before deleting those media_assets rows.** This was required for correctness: `member_story_json` is an application-level JSONB reference to `media_assets.id` that Postgres's FK system cannot see. Deleting the underlying `media_assets` row without also clearing this reference would leave a dangling `media_asset_id` in the JSON; the reseed's `ensureStoryImage()` idempotency check (`findFirstStoryImageID`) would then find that stale ID, skip re-upload, and PUT it back to `/me/profile` — tripping the backend's `applyStoryImageLifecycle` IDOR check (`app_profile_story_image.go`) since the asset no longer exists, failing the reseed. The UPDATE touches only these 3 story columns on exactly 2 members identified by `public_slug`; it never deletes a `members` row and never touches identity/slug/visibility columns, so it does not violate the must_haves' "never touch members" prohibition (which the must_haves text itself frames around `TRUNCATE members CASCADE` and the members→media_assets→anime FK bridge, not an in-place clear of two owned JSONB columns).
- **Left `point_ledger_entries` untouched** (its `release_version_id`/`fansub_group_id` are `SET NULL` when the parent rows are deleted) rather than also deleting it — the plan's Task 2 action text enumerates an exact table list that does not include `point_ledger_entries`, and leaving orphaned-but-nulled ledger rows behind does not affect any of the seed's 15 assertions (both members' `total_points` are freshly recomputed by the reseed's own new effective-crew award).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Missing `release_role_credit_lifecycles` delete step blocked the live reset transaction**
- **Found during:** Task 3, first live run of `scripts/reset-member-profile-fixture.sh --confirm-local`
- **Issue:** The transaction aborted at `DELETE FROM release_versions` with `ERROR: update or delete on table "release_version_groups" violates foreign key constraint "release_role_credit_lifecycle_release_version_id_fansub_gr_fkey"` — a composite `RESTRICT` FK from `release_role_credit_lifecycles(release_version_id, fansub_group_id)` to `release_version_groups`, which is itself `CASCADE`-deleted by the `release_versions` delete. This table (holding the awarded effective-crew credit rows Plan 134-01's `ensureEffectiveCrew` step creates) was not in the plan's Task 2 action text's enumerated table list, since it wasn't discoverable without a live run against real seed-created data.
- **Fix:** Verified the transaction rolled back cleanly first (`fansub_groups`/`anime`/`media_assets` row counts unchanged, `member_story_json` still populated — zero partial damage from the aborted transaction). Added a scoped `DELETE FROM release_role_credit_lifecycles WHERE release_version_id IN (...)` (same seed129- anime join chain) immediately before the `release_versions` delete, leaving `point_ledger_entries` itself untouched per the Decisions above.
- **Files modified:** `scripts/reset-member-profile-fixture.sh`
- **Verification:** Second live run completed clean (`COMMIT` printed, all post-delete row counts 0); full before/after hash verification and double seed-PASS confirmed as documented in Accomplishments.
- **Committed in:** `e221a0b4` (Task 3, alongside the evidence files, since it was discovered live during Task 3's execution)

**2. [Rule 1 - Bug] Guard-check `docker compose exec` calls were silently consuming the script's own piped confirmation-phrase stdin**
- **Found during:** Task 2, first static test of the wrong-phrase-declines-guard acceptance criterion
- **Issue:** `printf 'wrong phrase\n' | bash scripts/reset-member-profile-fixture.sh --confirm-local` exited 1 with no diagnostic message at all — not even the intended "Confirmation phrase did not match" text. Root cause: the two `docker compose exec -T ...` guard calls (database identity, `RUNTIME_PROFILE`) that run before the `read -r -p` prompt were still attached to the script's inherited stdin (`-T` only disables pseudo-tty allocation, it does not detach stdin), so they consumed the piped "wrong phrase" line before `read` ever saw it; `read` then hit EOF, returned nonzero, and `set -e` aborted the script silently before the intended mismatch message could print.
- **Fix:** Added `< /dev/null` to every non-interactive `docker compose exec`/`docker exec` invocation in the script (the two pre-prompt guards, the post-delete row-count query, and the post-reseed `docker exec ... mkdir`/`node` calls), so only the one `read -r -p` call after the printed plan consumes the script's real stdin.
- **Files modified:** `scripts/reset-member-profile-fixture.sh`
- **Verification:** Re-ran both the missing-flag and wrong-phrase guard tests; both now print their intended message and exit 1.
- **Committed in:** `edff757d` (Task 2, same commit as the script's creation — the bug was caught and fixed before the first commit landed)

---

**Total deviations:** 2 auto-fixed (1 blocking-issue fix, 1 bug fix)
**Impact on plan:** Both were necessary for the reset script to actually complete its own required Task 3 cycle safely and for its guard behavior to be truthful. No scope creep — the `release_role_credit_lifecycles` addition stays within the plan's own "delete only this fixture's own seed-created rows, in FK-safe order" objective (Task 2's action text explicitly frames the enumerated list as the *known* tables; a genuinely new FK dependency discovered only via a live run against real data is squarely within the plan's own stated scope to fix). The stdin fix only affects guard-check plumbing, not the delete logic itself.

## Issues Encountered
None beyond the two deviations above, both resolved within each task's normal fix-attempt budget and before their respective task commit landed (or, for deviation 1, before Task 3's evidence-capturing commit).

## User Setup Required

None — no external service configuration required. The reset script's second confirmation phrase is typed interactively (or piped, as this execution did); no new persistent `.env` change needed.

## Next Phase Readiness
- The shared `team4s_v2` database now carries a freshly reset-and-reseeded, fully idempotent `sheppert`/`csubs-leader` fixture (2 members, 2 groups, 11 anime, 2 release versions, 2 story-image media_assets — all freshly created post-reset with new IDs), ready for Plan 134-06's live UAT.
- `scripts/verify-protected-assets.mjs` and its captured before/after evidence give Plan 134-06 (and any future re-run of this reset) a reusable, durable PMQA-06 proof mechanism — not a one-off console check.
- `scripts/reset-member-profile-fixture.sh` is safe to re-run: both guards were verified to correctly block execution when not satisfied, and the FK ordering (including the newly discovered `release_role_credit_lifecycles` step) is proven correct against the live schema, not just read from documentation.
- No blockers for Plan 134-06.

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-16*

## Self-Check: PASSED

All 4 created files confirmed on disk (`scripts/verify-protected-assets.mjs`, `scripts/reset-member-profile-fixture.sh`, `.planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-before.json`, `.planning/phases/134-fixture-backed-verification-rollout/evidence/protected-assets-after.json`); all 3 task commits (`3d93ead4`, `edff757d`, `e221a0b4`) confirmed in `git log`.
