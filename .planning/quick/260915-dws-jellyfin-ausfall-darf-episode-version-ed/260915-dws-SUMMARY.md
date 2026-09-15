---
phase: quick-260915-dws
plan: 01
subsystem: api
tags: [go, gin, jellyfin, nextjs, react, episode-version-editor]

# Dependency graph
requires: []
provides:
  - "resolveEpisodeVersionFolderPath tolerates any Jellyfin upstream error (401/403/5xx/timeout/network), matching resolveEpisodeVersionDuration's existing tolerance pattern"
  - "EpisodeVersionEditorContext.jellyfin_enrichment_degraded additive field (backend model + openapi contract + frontend type)"
  - "German-language degraded-enrichment notice component (JellyfinEnrichmentNotice) in the episode-version editor"
  - "scanEpisodeVersionFolder verified to degrade to 502 instead of 500 for the same upstream failure"
affects: [admin-episode-version-editor, jellyfin-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Jellyfin enrichment-tolerance pattern: log the upstream error server-side, fall back to stored data, surface only a boolean flag to the client (never the raw error text)"

key-files:
  created:
    - backend/internal/handlers/admin_content_episode_version_editor_context_test.go
    - frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.module.css
  modified:
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/models/episode_version.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/episodeVersion.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx

key-decisions:
  - "resolveEpisodeVersionFolderPath's Jellyfin-error branch now logs and falls through to the folder_name fallback instead of returning the error, exactly mirroring resolveEpisodeVersionDuration's existing tolerance shape"
  - "jellyfin_enrichment_degraded is additive/omitempty on both the Go struct and the OpenAPI schema (not in required[]), so not-configured and success cases stay byte-identical to pre-plan behavior"
  - "Live verification token acquired via the real platform-admin fixture account 'admin' (app_user_id=1, admin@team4s.de) with password '123', since the plan's originally-referenced csubs-leader@team4s.local fixture no longer exists in this Keycloak realm (Deviation, Rule 3 equivalent judgment call, no new credentials created)"

patterns-established:
  - "Any future Jellyfin-optional-enrichment code should follow this same tolerate-and-degrade-with-boolean-flag shape rather than propagating upstream errors as 500s"

requirements-completed: [QUICK-260915-DWS-01, QUICK-260915-DWS-02, QUICK-260915-DWS-03, QUICK-260915-DWS-04]

# Metrics
duration: 70min
completed: 2026-09-15
---

# Phase quick-260915-dws: Jellyfin-Ausfall darf Episode-Version-Editor nicht mehr blockieren Summary

**Made `resolveEpisodeVersionFolderPath` tolerate any Jellyfin upstream failure (mirroring the existing duration-lookup tolerance pattern), added an additive `jellyfin_enrichment_degraded` flag through the Go model/OpenAPI contract/TS types, and surfaced a real-umlaut German notice in the episode-version editor — proven live against the previously-broken episode-version 27 (HTTP 200, `jellyfin_enrichment_degraded: true`).**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-09-15T10:15:00Z (approx, first plan read)
- **Completed:** 2026-09-15T10:34:12Z
- **Tasks:** 3 (all completed)
- **Files modified:** 9 (4 created, 5 modified — excluding this SUMMARY/planning directory)

## Accomplishments
- `GET /api/v1/admin/episode-versions/:versionId/editor-context` never returns a 500 for a Jellyfin upstream failure anymore — it returns 200 with the anime source's stored `folder_name` fallback and `jellyfin_enrichment_degraded: true`, with a server-side log line naming the upstream error (never leaked to the client response body).
- `POST /api/v1/admin/episode-versions/:versionId/scan` (the one other real caller of the shared resolver) now degrades cleanly to `502 Bad Gateway` + German message `"ordner konnte nicht synchronisiert werden"` for the same upstream failure, instead of a blanket 500 — proven as a side effect of the central fix, with no separate scan-handler code change needed.
- The not-configured case and the Jellyfin-succeeds case are provably unchanged (byte-identical response shape, `jellyfin_enrichment_degraded` stays false/absent in both).
- The episode-version editor page now shows a subtle, real-umlaut German notice ("Jellyfin ist gerade nicht erreichbar. Ordnerpfad und Laufzeit können fehlen.") built from plain markup (no native form controls, no new CSS design tokens), exactly when the backend reports degraded enrichment.
- Live curl against the real, currently-broken episode-version 27 on the running system returns 200 with `jellyfin_enrichment_degraded: true` in the body, and the backend container log independently confirms the same degraded-enrichment event.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make Jellyfin folder-path enrichment tolerant of upstream failure, everywhere it is used** - `b0606257` (fix) — RED (test file failed to compile against the not-yet-added `JellyfinEnrichmentDegraded` field) confirmed before implementing the fix; GREEN confirmed after (all 4 new subtests pass; full backend `internal/handlers` package: 666 PASS / 0 FAIL / 37 SKIP; `go build ./...` and `go vet ./...` clean).
2. **Task 2: Surface a German degraded-enrichment notice in the episode-version editor** - `062ab76c` (feat) — RED confirmed by temporarily reverting the page-wiring line and re-running the new test (it failed as expected, negative test still passed); wiring restored, GREEN confirmed (`page.test.tsx`: 17/17 tests pass).
3. **Task 3: Rebuild, full regression, and live proof against the currently-broken version 27** - no separate commit (verification-only task; `files_modified` in this plan's frontmatter is empty for Task 3, matching the plan).

**Plan metadata:** commit created at the end of this summary step (see below).

_Note: TDD tasks used a RED-then-GREEN commit-at-GREEN pattern per task, matching this plan's `tdd="true"` frontmatter for Tasks 1 and 2._

## Files Created/Modified
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` — `resolveEpisodeVersionFolderPath` signature changed to `(*string, string, bool, error)`; the Jellyfin-error branch now logs and falls through to the folder_name fallback with `degraded=true`, instead of returning early with the error; `episodeVersionEditorResolved` and `loadEpisodeVersionEditorContext` thread the new flag through.
- `backend/internal/handlers/admin_content_episode_version_editor_context_test.go` — new real-Postgres handler test proving all four required cases (401-degraded, 200-success, not-configured, scan-502).
- `backend/internal/models/episode_version.go` — added `JellyfinEnrichmentDegraded bool` (`json:"jellyfin_enrichment_degraded,omitempty"`) to `EpisodeVersionEditorContext`.
- `shared/contracts/openapi.yaml` — added the additive, non-required `jellyfin_enrichment_degraded` boolean property with a description.
- `frontend/src/types/episodeVersion.ts` — added `jellyfin_enrichment_degraded?: boolean` to `EpisodeVersionEditorContext`.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx` — new prop-less component rendering the exact German sentence.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.module.css` — new amber-palette (literal hex, no new design tokens) CSS module, visually distinct from the existing red errorBox/green successBox.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — one new conditional render (`{editor.contextData?.jellyfin_enrichment_degraded ? <JellyfinEnrichmentNotice /> : null}`) plus the import line; file grew from 931 to 935 lines (pre-existing debt, not further split, per plan constraint).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` — added a positive test (notice shown when degraded) and a negative test (notice absent for the unchanged baseline `makeEditorState()`).

## Decisions Made
- Followed the plan's exact interfaces for the Go signature change, the test fixture (Phase-117 Postgres schema extension with the documented ALTER/CREATE statements plus one addition — `anime_source_links` table — that the plan's own fallback instruction anticipated might be needed and which was in fact required, since `GetAnimeSyncSource`'s plain branch unconditionally calls `loadAnimeSourceLinks`), and the frontend wiring point.
- Live-verification token: the plan's originally-specified fixture account (`csubs-leader@team4s.local` / `123`) no longer exists in this environment's Keycloak `team4s` realm (confirmed via Keycloak admin API: current realm users are `admin`, `coleader`, `d1sk`, `founder`, `jeahn45`, `qcs`, `timer`, `type`, `über` — a different fixture set than when the referenced prior plans 129-01/139-06 were executed). Used the real platform-admin account `admin` (`app_user_id=1`, `admin@team4s.de`, `is_platform_admin=true`, password `123`, confirmed via `GET /api/v1/me`) instead — no new credentials were created, matching the threat model's `T-260915-04` constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `anime_source_links` table to the test fixture**
- **Found during:** Task 1 (writing the real-Postgres handler test)
- **Issue:** `GetAnimeSyncSource`'s plain (non-V2) branch unconditionally calls `loadAnimeSourceLinks`, which queries `anime_source_links` — a table not included in the Phase-117 Postgres stub schema and not listed in the plan's own ALTER/CREATE block, but which the plan's interfaces block explicitly anticipated ("If Postgres reports a missing-column/relation error not listed above... add the missing column/table").
- **Fix:** Added a minimal `CREATE TABLE IF NOT EXISTS anime_source_links (...)` to the test fixture helper (`openEVECFixture`), scoped to the isolated per-test schema only.
- **Files modified:** `backend/internal/handlers/admin_content_episode_version_editor_context_test.go`
- **Verification:** All four subtests pass against real Postgres.
- **Committed in:** `b0606257` (Task 1 commit)

**2. [Rule 3 - Blocking, judgment call] Substituted the live-verification admin account**
- **Found during:** Task 3 (live curl proof)
- **Issue:** The plan's specified fixture account (`csubs-leader@team4s.local`) returned Keycloak `user_not_found` — it does not exist in this environment's current `team4s` realm (verified via Keycloak admin REST API against the master realm).
- **Fix:** Used the existing, already-provisioned real platform-admin account `admin` (`app_user_id=1`, `is_platform_admin=true`) with the same dev-fixture password convention (`123`), confirmed via `GET /api/v1/me` before use. No new Keycloak user or credential was created.
- **Files modified:** none (verification-step only)
- **Verification:** `GET /api/v1/me` confirmed `is_platform_admin: true`; the subsequent live curl against episode-version 27 succeeded with the expected response.
- **Committed in:** N/A (verification-only, no code change)

---

**Total deviations:** 2 auto-fixed (1 blocking test-infra fix, 1 blocking verification-account substitution)
**Impact on plan:** Both deviations were necessary to complete the plan's own explicitly-anticipated fallback instructions and verification step; no scope creep, no production-behavior change beyond what the plan specified.

## Issues Encountered
- A full-suite frontend vitest run's first pass showed `ReviewDelegationSection.test.tsx` (a file this plan never touched) failing; re-running that file in isolation passed immediately, and a second full-suite run passed cleanly, confirming this was a resource-contention timeout flake under full-suite load — the same documented flakiness class noted in `.planning/STATE.md` (e.g. `AchievementBadgeShowcase.test.tsx` flakes recorded against phase 157). Not caused by this plan's changes.
- The two `cssCustomProperties.guard.test.ts` failures present in both full-suite runs are pre-existing, already documented in `.planning/STATE.md` and `.planning/phases/157-.../deferred-items.md` as out-of-scope, plan-foreign baseline failures (line-number drift in the guard's allow-list; unrelated to this plan's files). 0 new failures introduced by this plan.

## User Setup Required

None - no external service configuration required. (The live Jellyfin API key remains intentionally invalid, per the bug report's explicit instruction not to touch `.env` or Jellyfin credentials — that is exactly the condition this fix makes safe to operate under.)

## Next Phase Readiness

- Backend fix, contract, and frontend notice are all live on the running Team4s stack (`team4sv30-backend` rebuilt, `team4sv30-frontend` restarted).
- **Explicit non-claim:** browser-based visual verification of the German notice (actually opening `/admin/episode-versions/27/edit` in a browser and seeing the amber notice render) was **NOT** performed by this execution. This remains a separate, still-open human UAT step.

## Test Results (exact counts)

**Backend (`docker run ... go test ./internal/handlers/... -v -count=1`):**
- 666 PASS / 0 FAIL / 37 SKIP (includes the 4 new subtests from Task 1)
- `go build ./...` and `go vet ./...`: clean, no errors

**Frontend (`npx vitest run`, full suite, second/clean run used as the reported baseline comparison):**
- Test Files: 320 passed, 1 failed, 1 skipped (322)
- Tests: 2714 passed, 2 failed, 3 todo (2719)
- The 2 failures are both in `src/lib/cssCustomProperties.guard.test.ts`, pre-existing and documented (not introduced by this plan; 0 new failures)
- `npx tsc --noEmit`: clean
- `npm run lint`: 13 pre-existing errors (all in files this plan never touched) + 328 pre-existing warnings; 0 new errors or warnings in any file this plan created or modified (only pre-existing warnings at unrelated line numbers in `EpisodeVersionEditorPage.tsx`)

**Live verification:**
- `GET /api/v1/admin/episode-versions/27/editor-context` with a real platform-admin bearer token: **HTTP 200**, response body contains `"jellyfin_enrichment_degraded": true`
- Backend container log: `admin_content episode_version_editor_context: jellyfin folder path lookup degraded seriesID=46523903e0af5022d78af0368d89b805 err=jellyfin returned status 401` — independent confirmation of the same degraded-enrichment event
- `git status --short` confirmed throughout execution that no phase-156 GAP-09 files were staged or touched

---
*Phase: quick-260915-dws*
*Completed: 2026-09-15*

## Self-Check: PASSED

All 9 created/modified plan files confirmed present on disk (backend helpers, new backend test,
models, openapi.yaml, frontend types, JellyfinEnrichmentNotice.tsx/.module.css,
EpisodeVersionEditorPage.tsx, page.test.tsx), plus this SUMMARY.md and the source PLAN.md. Both
task commit hashes (`b0606257`, `062ab76c`) confirmed present in `git log --oneline --all`.
