---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 08
subsystem: deployment
tags: [docker-compose, live-uat, episode-versions, fansub-groups, i18n, go, react, checkpoint]

# Dependency graph
requires:
  - phase: 187-06
    provides: "FansubGroupsSection.tsx disabled-chip wiring (D-10 client half), groupDependents state"
  - phase: 187-07
    provides: "Conflict-aware import-apply success panel (D-12)"
provides:
  - "Deployed, live-verified Phase-187 build on team4s-linux (backend rebuilt, frontend restarted)"
  - "Live-UAT approval record for D-01, D-03, D-05, D-06, D-10 (client+server) -- the decisions CONTEXT.md's Teststil instruction explicitly excludes from render/click simulation tests"
  - "DependencySummary.GermanReasonFragment() (backend/internal/repository/release_version_group_guard.go) -- single shared, correctly pluralized German dependents-count formatter, replacing two duplicated fmt.Sprintf call sites"
  - "formatGermanCount() (frontend episodeVersionEditorUtils.ts) -- same pluralization fix for the chip tooltip"
  - "Two new findings appended to .planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md (release_variants-anchored 404, handleSave media_provider/media_item_id requirement)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared pluralization fragment shared between two backend call sites via a method on the existing DependencySummary struct, rather than a free function, to keep call sites down to summary.GermanReasonFragment()"

key-files:
  created:
    - backend/internal/repository/release_version_group_guard_format_test.go
    - .planning/phases/187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel/187-08-SUMMARY.md
  modified:
    - backend/internal/handlers/episode_version_update.go
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/release_version_group_guard.go
    - backend/internal/handlers/episode_version_update_test.go
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts
    - .planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md

key-decisions:
  - "Two 404/500 crashes hit while preparing the Live-UAT test data were root-caused in full before any data fix was applied, per explicit instruction not to silently patch around them. Both were confirmed, via direct production-data queries, to be pure test-data-construction artifacts -- not reachable through the real anime/release creation paths -- and are documented as findings only (no query/handler behavior changed). See 'Checkpoint arc' below."
  - "The release_variants-anchored GetByID 404 and the handleSave media_provider/media_item_id requirement were both appended as a new, dedicated section to the pre-existing 'Releases ohne Jellyfin-Datei' todo (.planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md) as concrete, now-reproduced blockers for that future feature -- committed separately from the product fix (a7b780392)."
  - "User explicitly requested a bounded, real product fix mid-checkpoint: German singular/plural correctness (1 Credit/Medium/Notiz vs. plural, 0 stays plural) in the dependents-count reason text, used in three call sites (frontend chip tooltip, backend 409 editor response, backend import-conflict response). Implemented as one shared helper per side (frontend formatGermanCount, backend DependencySummary.GermanReasonFragment) rather than three independent fixes, so the three surfaces cannot drift apart again."
  - "Explicitly NOT implemented per user decision: no pre-emptive disabling of the last remaining group chip before save is attempted (the existing 400-on-save rejection the human verified live stays as the sole enforcement point for D-06 in the UI), and no mobile-specific presentation change for the reason text."
  - "A pre-existing backend test (episode_version_update_test.go:180) asserted the OLD, buggy plural ('1 Credits' for exactly one credit) as its expected 409 message substring. This was the literal bug our fix corrected, so the assertion was updated to the correct singular form ('1 Credit,') in its own, separate commit rather than left broken or used as a reason to revert the fix."

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14]

# Metrics
duration: ~3h (including three checkpoint-blocked round trips with the human operator)
completed: 2026-10-19
---

# Phase 187 Plan 08: Deploy + blocking Live-UAT checkpoint Summary

**Backend rebuilt and frontend restarted on team4s-linux with all of Phase 187's D-01..D-14 decisions live; a Live-UAT checkpoint spanning three root-cause/fix round trips (a release_variants-anchored 404, an anime_titles/slug 500, and a genuine German-pluralization bug fix) ended in explicit user approval of all 6 verification steps.**

## Performance

- **Duration:** ~3h across the full checkpoint arc (deploy, three test-data/debugging round trips, one bounded product fix, final approval)
- **Completed:** 2026-10-19
- **Tasks:** 2/2 completed (Task 1 automated deploy; Task 2 blocking human-verify checkpoint, now approved)
- **Files modified:** 7 (1 created test file, 6 modified; plus this SUMMARY.md and the todo-file docs update)

## Accomplishments

- Backend rebuilt (`docker compose up -d --build team4sv30-backend`) and frontend restarted (`docker restart team4sv30-frontend`) on `team4s-linux`; both containers healthy throughout.
- Full backend suite green at every checkpoint: final state `scripts/test-backend.sh` → **GATE GREEN**, 2304 PASS / 0 FAIL / 28 SKIP (2303 before the pluralization fix's one new test).
- Frontend `npx tsc --noEmit` clean and full `npx vitest run` suite green: 391 passed / 1 skipped files, 3601 passed / 3 todo tests, 0 failures.
- Live-UAT checkpoint **approved** by the human operator after all 6 `<how-to-verify>` steps passed (see Approval Record below).
- Along the way, found and fixed a real, user-requested German pluralization bug in the dependents-count reason text (shared by the chip tooltip, the 409 editor response, and the import-conflict response) — see "Product fix" below.
- Appended two newly-reproduced, concrete blockers for the future "Releases ohne Jellyfin-Datei" feature to its existing todo file, as instructed, without implementing that feature.

## Checkpoint arc (three round trips before approval)

This plan's Task 2 checkpoint was reached and reported back to the orchestrator three times before approval, each time because test-data preparation for the Live-UAT walkthrough surfaced a real root cause that had to be understood (not silently patched) before the human could proceed:

**Round 1 — `GetByID` 404 (release_variants-anchored query).** The two dedicated test releases (212/213) initially had no `release_variants` row. `EpisodeVersionRepository.GetByID`'s driving query is `FROM release_variants rv JOIN release_versions rev ...` (INNER JOIN anchored on `release_variants`), so a release_version with zero variants returns zero rows and the handler maps this to `404 "episodenversion nicht gefunden"`. Confirmed via direct production-data query that **zero** of the 175 pre-existing real `release_versions` rows are in this state — the real creation/import paths always attach a variant immediately, so this combination is an artifact of the hand-rolled test data, not a reachable production bug. Fixed by adding one `release_variants` row to each of 212/213, mirroring a real release's shape (176) exactly, plus setting `fansub_releases.source_id`/`.source` (not actually read by this query, but part of mirroring the real shape as instructed). Appended as finding #1 to the "Releases ohne Jellyfin-Datei" todo (this is directly the blocker that future feature would need to solve).

**Round 2 — anime sync-source 500 (`anime_titles`/`slug` NULL).** With the 404 fixed, the editor-context endpoint then 500'd: `getAnimeSyncSourceV2`'s `display_title = COALESCE((SELECT title FROM anime_titles ...), anime.slug)` was NULL on both sides for our hand-rolled test anime (id 14), and the Go destination field is a non-pointer `string`. Read the real `CreateAnime`/`createAnimeV2` path first: it unconditionally writes both a `slug` (`buildUniqueAnimeSlug`) and a `(language='ja', title_type='main')` `anime_titles` row at creation time. Confirmed via a production-wide query (`anime LEFT JOIN anime_titles`, slug NULL/empty check) that **zero** of the system's 13 anime rows (after the fix; our test row was the *only* one ever in that state, before the fix) have both zero title rows and no slug — again a pure test-data artifact, not a reachable production bug, and not touched/worked around in the query itself. Fixed by inserting the matching `anime_titles` row and setting `anime.slug` for anime 14 only. No real anime touched (13 "Freezing", 176's owning anime, confirmed byte-for-byte unchanged both times).

Both findings were additionally verified at the SQL level by replicating every single query in the `loadEpisodeVersionEditorContext` code path (not just the one that crashed) directly against the database for both 212 and 213, since a real Keycloak-authenticated `curl` round-trip wasn't obtainable in this environment (no test-user credentials are provisioned anywhere in the repo/`.env`/Keycloak realm export — confirmed by an actual search, not skipped; the project's own `README.md` documents that onboarding requires manually registering a user and assigning `platform_admin` by hand).

**Round 3 (after live steps 1-5 passed) — pluralization bug.** The human's own live walkthrough of the 6 verification steps passed, but during that same session also surfaced that a `release_streams`/`stream_sources` row was additionally required on 212/213 before `handleSave` would allow a save at all (now also appended to the todo file as a second, independent finding) and that the dependents-count reason text used ungrammatical German plurals (e.g. "1 Credits", "1 Medien", "1 Notizen" for a count of exactly one). The user explicitly requested this be fixed as a real, bounded product change — see below.

## Product fix: German pluralization in the dependents-count reason text

Three call sites previously duplicated an un-pluralized `fmt.Sprintf`/template-literal pattern. Fixed with one shared helper per language side:

- **Frontend** (`episodeVersionEditorUtils.ts`): extracted `formatGermanCount(count, singular, plural)` (1 → singular; everything else, including 0, → plural), used by the existing `formatDependentsReason()` (the chip tooltip's only formatter — no new duplicate function).
- **Backend** (`release_version_group_guard.go`): added `DependencySummary.GermanReasonFragment()` (same rule), replacing the two independent `fmt.Sprintf` duplicates in `episode_version_update.go` (409 editor response) and `episode_import_repository_apply.go` (import-conflict response).

New correct forms: `0 Credits` / `1 Credit` / `2 Credits`, `0 Medien` / `1 Medium` / `2 Medien`, `0 Notizen` / `1 Notiz` / `2 Notizen`. Explicitly **not** changed per user decision: no pre-emptive last-chip disabling before save, no mobile-specific presentation.

## Task Commits

Task 1 (deploy) modified no files (`files_modified: []` in the plan), so it has no commit of its own. All commits below belong to Task 2's checkpoint-arc work:

1. **Todo-file finding append (round 1+3 findings, docs-only)** — `a7b780392` (docs)
2. **Pluralization product fix (frontend + backend + new tests)** — `34d915393` (fix)
3. **Pre-existing test assertion corrected to the now-correct singular form** — `1a7b4e075` (test)

**Plan metadata:** (this commit) `docs(187-08): complete plan`

_Test-data SQL (anime/episode/releases/groups/credit/streams, see "Test data created" below) was applied directly via `psql` against the live dev database on team4s-linux, not via a Git-tracked migration or fixture file — there is nothing to commit for it. It is tracked here in this SUMMARY instead, for a clean manual teardown._

## Files Created/Modified

- `backend/internal/repository/release_version_group_guard.go` — new `germanPluralCount()` + `DependencySummary.GermanReasonFragment()`
- `backend/internal/repository/release_version_group_guard_format_test.go` — new, pure table-driven test (8 cases, no Postgres fixture)
- `backend/internal/handlers/episode_version_update.go` — 409 message now calls `depErr.Summary.GermanReasonFragment()`
- `backend/internal/repository/episode_import_repository_apply.go` — import-conflict message now calls the same method
- `backend/internal/handlers/episode_version_update_test.go` — corrected pre-existing assertion (`"1 Credits"` → `"1 Credit,"`)
- `frontend/.../episodeVersionEditorUtils.ts` — new `formatGermanCount()` helper used by `formatDependentsReason()`
- `frontend/.../episodeVersionEditorUtils.test.ts` — 8 new/corrected table-driven cases (1/2/0 per kind)
- `.planning/todos/pending/2026-10-19-releases-ohne-jellyfin-datei.md` — new section documenting both reproduced blockers

## Decisions Made

See `key-decisions` in frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing test asserted the literal buggy plural text**
- **Found during:** Task 2, final suite run after the pluralization fix
- **Issue:** `TestUpdateEpisodeVersion_GroupGuard/409_with_German_dependents_breakdown` asserted `require.Contains(t, rec.Body.String(), "1 Credits")` — the exact ungrammatical text the user asked to fix.
- **Fix:** Updated the assertion to `"1 Credit,"` (comma included to disambiguate from `"1 Credits,"`).
- **Files modified:** `backend/internal/handlers/episode_version_update_test.go`
- **Verification:** Full `scripts/test-backend.sh` run after the fix: GATE GREEN, 2304/0/28.
- **Committed in:** `1a7b4e075`

**2. [Rule 2 - Missing critical / data completeness] Test data needed `release_variants`, `anime_titles`/`slug`, and `release_streams`/`stream_sources` rows to be reachable at all**
- **Found during:** Task 2, three separate retry rounds (see "Checkpoint arc" above)
- **Issue:** The hand-rolled SQL test data for the throwaway test anime (id 14) and its two releases (212/213) initially lacked rows that the real application-level creation/save paths always write, causing a 404, then a 500, then a client-side save block.
- **Fix:** Added the missing rows (see "Test data created" below), each time root-causing first via the real code path before touching data, confirming via production-wide queries that the missing-row combination was unreachable through real creation — not a product bug.
- **Files modified:** none (data-only, direct SQL against the dev database — no migration, no fixture file)
- **Verification:** Every query in `loadEpisodeVersionEditorContext`'s code path re-run directly against the DB for both 212/213 after each fix; full live-browser walkthrough by the human operator ultimately passed all 6 steps.
- **Committed in:** n/a (pure data, not code)

---

**Total deviations:** 2 (1 stale test-assertion fix required by the intentional behavior change; 1 multi-round test-data completeness fix required to make the checkpoint reachable at all). No scope creep: both were necessary to reach and pass the plan's own blocking checkpoint.

## Approval Record (per Phase 186-05-HUMAN-UAT.md precedent)

```yaml
status: passed
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 08
source: [187-08-PLAN.md Task 2]
approved_by: user
approved_at: 2026-10-19
```

### Current Test

All 6 steps from `187-08-PLAN.md`'s `<how-to-verify>`, live in the browser via the Windows SSH tunnel (`http://127.0.0.1:3300`), against dedicated test data (anime 14, releases 212/213 — see "Test data created" below):

1. **Heading + primitives** — "Partnergruppe hinzufügen" heading, `@/components/ui` `Button`/`Input` primitives (no native unstyled elements). **bestanden.**
2. **Disabled chip with dependents reason** — on release 213, group "FlameHaze-subs" (id 25) chip correctly locked/disabled, tooltip read (after the pluralization fix) *"Kann nicht entfernt werden: 1 Credit, 0 Medien, 0 Notizen hängen noch daran."* No removal occurred. **bestanden.**
3. **Add brand-new partner group** — on release 212, a third group added as a chip, save succeeded. **bestanden.**
4. **Remove a group with no dependents** — the just-added group removed again, save succeeded. **bestanden.**
5. **Attempt to remove the last remaining group** — on release 212 (back to its single original group), rejected with `400 "Ein Release muss mindestens eine Fansub-Gruppe behalten."`, no crash. **bestanden.**
6. **Episoden-Import "Übernehmen" D-12 live demo** — **nicht live geprüft** (deferred/optional per the plan's own explicit allowance: the synthetic test anime has no real Jellyfin library folder, and D-12 already has full automated coverage via `TestApplyEpisodeImportConflict`, Plan 05). Not treated as a gap — explicitly accepted by the user as out of scope for this live check, same pattern as `186-05-HUMAN-UAT.md`'s D-03 precedent (test-covered, not live-covered, by explicit, accepted choice).

**Result: approved.** User's exact message: *"approved — Live-Checkpoint 187-08 bestanden (Tooltip auf 213 live geprüft: 'Kann nicht entfernt werden: 1 Credit, 0 Medien, 0 Notizen hängen noch daran.'; Schritte 1–5 zuvor live bestanden)."*

### Gaps

None. All 14 of Phase 187's decisions (D-01..D-14) are now either automated-test-verified (Plans 01-05) or live-UAT-verified (this plan, steps 1-5) or test-covered-with-explicit-live-deferral (step 6/D-12, accepted). The pluralization bug found and fixed mid-checkpoint was a genuine, bounded, user-requested correction — not a reopened decision.

## Test data created (for manual teardown — not deleted by this plan)

All of the following is throwaway test data created solely for this checkpoint, isolated under one dedicated, clearly-labeled test anime. **Nothing else in the system was touched** (anime 13 "Freezing" and release 176, used as real-data templates, were read-only reference points and are confirmed byte-for-byte unchanged).

| Table | Row(s) | Notes |
|---|---|---|
| `anime` | id **14**, title `ZZZ-Phase187-Testanime`, slug `zzz-phase187-testanime` | status stayed default `disabled` |
| `anime_titles` | 1 row: `(anime_id=14, language='ja', title_type='main', title='ZZZ-Phase187-Testanime')` | added in Round 2 |
| `episodes` | id **388**, `anime_id=14`, `episode_number='01'` | |
| `fansub_releases` | id **212** (`episode_id=388`), id **213** (`episode_id=388`) | both: `source_id=1`, `source=1` (real "Jellyfin" `release_sources` row, reused not invented) |
| `release_versions` | id **212** (`release_id=212`, title "ZZZ-Testrelease A (keine Abhaengigkeiten)"), id **213** (`release_id=213`, title "ZZZ-Testrelease B (Gruppe 25 hat Abhaengigkeiten)") | |
| `release_variants` | id **212** (`release_version_id=212`, filename `ZZZ-Testrelease-A-01.mkv`), id **213** (`release_version_id=213`, filename `ZZZ-Testrelease-B-01.mkv`) | added in Round 1 |
| `release_streams` | id **212** (`variant_id=212`), id **213** (`variant_id=213`) | added live by the human operator (Round 3) |
| `stream_sources` | id **213** (`external_id='zzz-phase187-test-212'`, `provider_type='jellyfin'`, referenced by `release_streams.id=212`), id **214** (`external_id='zzz-phase187-test-213'`, `provider_type='jellyfin'`, referenced by `release_streams.id=213`) | added live by the human operator (Round 3) |
| `release_version_groups` | `(212, 24)` — Bloody-Shadow only; `(213, 24)` — Bloody-Shadow; `(213, 25)` — FlameHaze-subs | groups 24/25 are **real, pre-existing** fansub groups, reused not invented. (Release 212 was also briefly given a third group, id 26 "Strawhat Subs", during live step 3/4 of the walkthrough, then removed again during step 4 — not present in final state.) |
| `release_role_credit_lifecycles` | id **154**: `(release_version_id=213, fansub_group_id=25, member_id=1, role_code='translation', generation=1, lifecycle_status='pending')` | the one dependent that locks group 25's chip on release 213 |

`member_id=1` ("D1sk") and `fansub_group_id=1` ("Jellyfin" `release_sources` row) are real, pre-existing rows referenced only as FK targets — not modified.

## Issues Encountered

See "Checkpoint arc" above for the three root-cause investigations; no unresolved issues remain.

## User Setup Required

None — the deploy and all fixes are already live on `team4s-linux`.

## Next Phase Readiness

Phase 187 is complete: all 8 plans executed, all 14 decisions (D-01..D-14) verified, Live-UAT approved. Test data listed above is the only known throwaway state left in the dev database and should be deleted (in FK-safe order: `release_role_credit_lifecycles` → `release_streams` → `stream_sources` → `release_version_groups` → `release_variants` → `release_versions` → `fansub_releases` → `episodes` → `anime_titles` → `anime`) once the orchestrator/user confirms no further live re-checks are needed.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

Verified: all 7 claimed modified/created files exist on disk; all 3 claimed commit hashes (`a7b780392`, `34d915393`, `1a7b4e075`) found in `git log`; test-data table above matches the live `psql` readback performed immediately before writing this summary.
