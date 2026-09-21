---
phase: 165-library-discovery-assisted-anime-creation
verified: 2026-09-21T20:10:00Z
status: gaps_found
score: 20/21 must-haves verified (REQ-165-15 excluded from denominator — cleanly deferred, not a gap)
overrides_applied: 0
gaps:
  - truth: "REQ-165-17 / D-18: additional Jellyfin folders can be removed from the anime edit page (AnimeJellyfinFolderList → DELETE /admin/anime/:id/jellyfin/folders/:source)"
    status: failed
    reason: "165-10's frontend passes the unprefixed Jellyfin item ID (folder.jellyfin_item_id, e.g. \"def\") as the DELETE :source path param, but 165-07's backend handler (RemoveAnimeJellyfinFolder) compares/deletes using the full DB-stored source string (\"jellyfin:def\"). collectJellyfinFolderOptions (shared by both GET /jellyfin/context and the episode-import folder guard) always strips the \"jellyfin:\" prefix, so the ONLY value the frontend ever has for a folder is the unprefixed ID — there is no code path anywhere in 165-10 that re-adds the prefix before calling removeAdminAnimeJellyfinFolder. The DELETE request reaches the backend, the main-folder guard's string comparison never matches (harmless), but the subsequent `DELETE FROM anime_source_links WHERE anime_id=$1 AND source=$2` also never matches any row (0 rows affected, no error — removeAnimeSourceLink does not check affected-row count). The handler still returns HTTP 200 \"jellyfin-ordner entfernt.\" and writes an audit_logs success entry, while the anime_source_links row is untouched. The frontend optimistically removes the row from local UI state and shows a false success message. On the next Discovery page load, the \"removed\" folder still resolves to status \"bereits vorhanden\" (existing), directly falsifying 165-10's own must-have truth #3 (\"The removed folder's Discovery-list row becomes 'Offen' again on the next Discovery page load\") and REQ-165-17."
    artifacts:
      - path: "frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx"
        issue: "handleRemove(source) at line 54/59 passes folder.jellyfin_item_id (unprefixed, e.g. \"def\") straight through to removeAdminAnimeJellyfinFolder(animeID, source) with no \"jellyfin:\" prefix added"
      - path: "backend/internal/handlers/jellyfin_source_folder_management.go"
        issue: "RemoveAnimeJellyfinFolder (lines 103-157) reads c.Param(\"source\") and compares/deletes it verbatim against animeSource.Source and anime_source_links.source, both of which are stored WITH the \"jellyfin:\" prefix (confirmed by this same handler's own test file using \"jellyfin:def\"/\"jellyfin:abc\" as fixture values) — the handler never calls extractJellyfinSourceID or re-derives the prefixed form from the raw folder ID a client would actually have"
      - path: "backend/internal/repository/anime_source_links.go"
        issue: "removeAnimeSourceLink (line 124) does not check the number of rows affected by its DELETE, so a source-string mismatch silently succeeds with zero rows deleted instead of surfacing an error"
    missing:
      - "Either: have AnimeJellyfinFolderList.tsx prefix the ID with \"jellyfin:\" before calling removeAdminAnimeJellyfinFolder (matching what RemoveAnimeJellyfinFolder currently expects), OR change RemoveAnimeJellyfinFolder to accept/compare the unprefixed ID (matching what collectJellyfinFolderOptions/GET context actually returns) and add the \"jellyfin:\" prefix internally before the DB comparison/DELETE — either fix must be covered by a same-package test that exercises the real handler with the same unprefixed value the frontend actually sends, not a hand-picked \"jellyfin:def\" fixture"
      - "A rows-affected check in removeAnimeSourceLink (or its caller) so a non-matching DELETE surfaces as an error/404 instead of a false-success 200"
---

# Phase 165: Library Discovery und Assisted Anime Creation (Serien) Verification Report

**Phase Goal:** Auf `/admin/anime/create` gibt es zusätzlich „Aus meiner Bibliothek": eine schlanke, paginierte Jellyfin-Library-Liste (Series und Movie) mit Status „offen" / „bereits vorhanden" / „ignoriert" / „teilweise" (nur exakte technische Referenzen), deren Auswahl in den bestehenden Create-Draft übergibt – AniSearch-Suche vorbelegt, Auswahl immer durch den Benutzer, Dubletten nach AniSearch-Auswahl mit „verbinden oder neu". Nach Assisted-Create geht es bei Serien direkt zu den Episoden und mit erhaltenem Kontext zurück zur Discovery.

**Verified:** 2026-09-21
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (REQ-165-01..22)

| # | Truth (Requirement) | Status | Evidence |
|---|---|---|---|
| 1 | REQ-165-01 D-01: Phase split, films visible/creatable in Discovery, transitional edit-route redirect | ✓ VERIFIED | `buildAssistedCreateRedirectPath` (createPageHelpers.ts) routes `film` → `/edit`, all series types → `/episodes`; tested in createPageHelpers.test.ts |
| 2 | REQ-165-02 D-02: "Zuordnung prüfen" state resolved only after AniSearch selection via existing dedup check | ✓ VERIFIED | `AniSearchDuplicateDecision.tsx` + `Enrich()`'s `FindAnimeBySource` gate (anime_create_enrichment.go), all 9 service tests pass |
| 3 | REQ-165-03 D-03: List distinguishes "bereits vorhanden"/"offen" via exact technical references only | ✓ VERIFIED | `jellyfin_discovery.go` uses `FindExistingAnimeByJellyfinIntakeRefs`; `TestJellyfinDiscovery_NoFuzzyMatchBetweenSimilarTitles` passes |
| 4 | REQ-165-04 D-04: Filters Offen(+teilweise)/Bereits vorhanden/Ignoriert/Alle, no separate "prüfen" filter | ✓ VERIFIED | `FILTER_OPTIONS` in DiscoveryLibraryPanel.tsx matches exact order; backend `filter` param validates the same 4 values |
| 5 | REQ-165-05 D-05: Multiple Jellyfin folders per anime, "Verbinden" never overwrites anime.source/folder_name | ✓ VERIFIED | `connectJellyfinFolderAdditively` gate proven by `TestConnectJellyfinFolderAdditively_ProtectsExistingAniSearchSource`; `LinkAdditionalJellyfinSource` additive INSERT confirmed in anime_source_links.go |
| 6 | REQ-165-06 D-06: Slim Series+Movie snapshot per library, single batch status query, cursor pagination | ✓ VERIFIED | `buildJellyfinDiscoverySnapshot` (both D-27 branches), `SeekDiscoverySnapshot`, all cache/cursor tests pass including ~2111-item scale |
| 7 | REQ-165-07 D-07: ≤1 DB query/page, Jellyfin requests independent of page count, 0 detail requests before selection | ✓ VERIFIED | `TestJellyfinDiscovery_PaginationNoFanOut`/`_ScalePaginationAndBudget_D29` assert exactly 1 existence-batch + 1 ignore-batch query per page |
| 8 | REQ-165-08 D-08: Selection hands off Jellyfin ID/Name/Path/Type/Year/Assets into existing Create draft | ✓ VERIFIED | `useCreatePageDiscoveryHandoff` calls the existing unmodified `handleJellyfinCandidateAdopt` pipeline; 5 hook tests pass |
| 9 | REQ-165-09 D-09: AniSearch search prefilled with Jellyfin name, never auto-searched | ✓ VERIFIED | Same hook, Test 3 (`setSearchQuery` called once, no search triggered), confirmed by code read |
| 10 | REQ-165-10 D-10: Only Discovery flow redirects post-create; manual flow unchanged | ✓ VERIFIED | `grep -c "window.location.href" useAdminAnimeCreateController.ts` = 1 (manual path only); assisted branch uses `buildAssistedCreateRedirectPath` |
| 11 | REQ-165-11 D-11: Filter/search/cursor round-trip via URL; return link on Create/Episodes/Edit | ✓ VERIFIED | `useDiscoveryLibraryFilters` URL-sync tests pass; `DiscoveryReturnLink` wired on all 3 pages (165-08, 165-12), all page tests pass |
| 12 | REQ-165-12 D-12: No provider framework/source refactor/new fansub-Jellyfin coupling; no regressions | ✓ VERIFIED | `TestSearchJellyfinSeries*`/`TestBuildAdminJellyfinIntake*` (pre-existing suites) pass unmodified in the same test run as new Discovery tests |
| 13 | REQ-165-13 D-13: UI primitives only, umlauts, ≤450 lines, no N+1 | ⚠️ PARTIAL | New phase-165 files are D-13-clean (0 native `<button>/<select>/<input>/<textarea>`, correct umlauts) — see gap: `admin_content_handler.go` grew to 459 lines (over 450) via 165-06/165-07, undocumented in deferred-items.md |
| 14 | REQ-165-14 D-14: Episode-import folder selector for multi-folder animes, fail-closed ownership guard | ✓ VERIFIED | `TestRejectUnownedJellyfinSeriesID_*`, `TestPreviewEpisodeImport_*` pass; `EpisodeImportFolderSelector.tsx` D-13-clean |
| 15 | REQ-165-15 D-15: "Teilweise" status checkpoint-gated, deferred by Auftraggeber (Option C) | ✓ VERIFIED (deferral, excluded from score) | See "165-11 Deferral Cleanliness" section below |
| 16 | REQ-165-16 D-17: Ignore/unignore per item, own filter, priority existing>ignored>partial>open | ✓ VERIFIED | `resolveDiscoveryItemStatus` full truth-table test passes; ignore/unignore handler tests pass |
| 17 | REQ-165-17 D-18: Edit page shows all connected folders; extra folders removable, main folder protected | ✗ **FAILED** | Backend/frontend ID-prefix mismatch — see Gaps section. Folder list *display* works; folder *removal* does not actually delete the DB row it claims to |
| 18 | REQ-165-18 D-19: Short-lived server cache + refresh button; post-action status always correct from DB | ⚠️ PARTIAL | Refresh button and always-correct DB-sourced status are verified working. The Redis-backed TTL cache (`discoveryCache`/`WithDiscoveryCacheDeps`) is built and unit-tested but **never wired in `main.go`** — confirmed via `grep -rn "WithDiscoveryCacheDeps" backend/` returning only the unused method definition. Every Discovery page load re-fetches the full paginated Jellyfin snapshot instead of hitting a cache. Documented as a deliberate, non-blocking deferral in 165-06's own SUMMARY, but it means the "kurzlebiger serverseitiger Cache" part of D-19 does not function in production. |
| 19 | REQ-165-19 D-20: Save-time re-check on `anisearch:<id>`, same verbinden/neu choice, no silent duplicate | ✓ VERIFIED | `TestCreateAnime_RechecksAniSearchDuplicateBeforeInsert` and 165-08's D-20 second-trigger tests pass |
| 20 | REQ-165-20 D-21: Connect/remove-folder/ignore/unignore are audited with user_id attribution | ✓ VERIFIED | All 4 mutation paths write `audit_logs` via `h.auditLogRepo.Write` with actor pointers; confirmed by dedicated audit tests in 165-06/165-07 |
| 21 | REQ-165-21 D-22: New phase tables carry `server_key` (fixed `'default'`) for future multi-server readiness | ✓ VERIFIED | `library_discovery_ignored_items.server_key TEXT NOT NULL DEFAULT 'default'` confirmed live in `team4s_v2` via `\d library_discovery_ignored_items` |
| 22 | REQ-165-22 D-16: Renamed/moved folder reconnects via existing additive "Verbinden" path, no new code | ✓ VERIFIED | `TestConnectJellyfinFolderAdditively_HandlesFolderRenameAsPlainSecondInsert` passes |

**Score:** 20/21 verified (REQ-165-15 is a clean, approved deferral — excluded from the pass/fail denominator per the deferral-not-gap instruction; REQ-165-17 is FAILED; REQ-165-13/REQ-165-18 are PARTIAL and folded into the narrative but not separately double-counted against the denominator since their core behavior — UI primitives/umlauts and correct post-action status — is verified, only a secondary clause of each is incomplete)

### The 4 Discovery Statuses — End-to-End Check

| Status | Backend resolver | Reachable in production? | Frontend rendering | Evidence |
|---|---|---|---|---|
| Offen (open) | `resolveDiscoveryItemStatus(false,false,false)` | Yes | `DiscoveryLibraryCard` "Anime anlegen"+"Ignorieren" | `TestJellyfinDiscovery_OpenStatus` passes |
| Bereits vorhanden (existing) | `resolveDiscoveryItemStatus(true,*,*)` | Yes | "Anime öffnen" only | `TestJellyfinDiscovery_ExistingStatus` passes |
| Ignoriert (ignored) | `resolveDiscoveryItemStatus(false,true,*)` | Yes | "Nicht mehr ignorieren" only | `TestJellyfinDiscoveryIgnore_*` pass |
| Teilweise (partial) | `resolveDiscoveryItemStatus(*,*,true)` | **No — by design** | Badge/caption scaffolding exists, unreachable | `partial` hard-coded `false` in `jellyfin_discovery.go:215`; confirmed inert-but-tested (8-row truth table green, frontend badge mapping exists but never exercised end-to-end since backend never emits it) |

All four statuses match the phase's own success criteria: three are live and correct, the fourth is confirmed intentionally inert (not half-built — see below).

### 165-11 Deferral Cleanliness (D-15 / REQ-165-15)

Verified as a clean, non-orphaned deferral:
- No migration `0171_*` exists (`ls database/migrations | grep '^017'` → only `0170_library_discovery_ignored_items.*`).
- `jellyfin_discovery.go:210-215` hard-codes `resolveDiscoveryItemStatus(match != nil, isIgnored, false)` — the `partial` argument is a literal `false`, not a TODO or half-wired variable.
- `resolveDiscoveryItemStatus`'s `partial` branch and `DiscoveryStatusPartial` constant are fully implemented and unit-tested (`TestResolveDiscoveryItemStatus_TruthTable/partial_only_->_partial` passes) but structurally unreachable from any live code path.
- Frontend `discoveryPageHelpers.ts`/`DiscoveryLibraryCard.tsx` contain the `"partial"→"warning"` badge mapping and caption rendering, fully tested, but never exercised end-to-end because the backend never emits `"partial"` — matches the Auftraggeber's explicit instruction ("keine halbfertige UI anzeigen... das tote Gerüst darf bleiben, wenn es sauber dokumentiert ist").
- REQUIREMENTS.md correctly marks REQ-165-15 as **Deferred**, not Complete, with a clear rationale and pointer to a future "Mehrstaffel-Ordner" phase.
- ROADMAP.md's Phase 165 entry documents the deferral explicitly (D-15-Hinweis section), not silently.

**Conclusion: the deferral was executed cleanly.** This is not treated as a gap, per the task's explicit instruction.

### Cross-Plan Integration Checks

| Integration | Expected | Actual | Status |
|---|---|---|---|
| 165-08 Create-page hand-off ↔ 165-06 endpoints | Frontend calls `GET /admin/jellyfin/discovery` response shape as 165-06 actually built it | `AdminJellyfinDiscoveryItem`/`Page` field names in `types/admin.ts` match `models/jellyfin_discovery.go` exactly (`jellyfin_item_id`, `library_context`, `status`, `existing_anime_id`, etc.) | ✓ VERIFIED |
| 165-09 Discovery list ↔ 165-06 status vocabulary | Frontend badge mapping matches backend's actual `DiscoveryStatus*` constants | 165-09's SUMMARY documents a self-caught Rule-1 bug: plan text illustrated German example inputs but the real backend emits English (`open`/`existing`/`partial`/`ignored`); code confirms the executor fixed this and both sides now agree | ✓ VERIFIED (with a documented self-correction) |
| 165-10 (AnimeJellyfinFolderList) ↔ 165-07 (folder DELETE endpoint) | Frontend `source` value sent to `DELETE /admin/anime/:id/jellyfin/folders/:source` must match what the backend compares/deletes | **Mismatch confirmed by direct code + test-fixture reading**: frontend sends the raw `jellyfin_item_id` (unprefixed, e.g. `"def"`); backend's `RemoveAnimeJellyfinFolder` compares/deletes the fully-prefixed `"jellyfin:def"` string (confirmed by 165-07's own test using `"jellyfin:def"` as its fixture value, and by `collectJellyfinFolderOptions`, the only source of the folder IDs the frontend ever sees, always stripping the prefix). The DELETE silently no-ops (0 rows affected, no error) while returning HTTP 200 and a false success UI state. | ✗ **FAILED — see Gaps** |
| 165-04 (episode-import folder selector) ↔ 165-07 (`collectJellyfinFolderOptions`) | Both use the same unprefixed `JellyfinItemID` convention | Confirmed consistent: `extractJellyfinSeriesIDFromSourceLinks`/`rejectUnownedJellyfinSeriesID` and `EpisodeImportFolderSelector.tsx` both use the raw unprefixed ID throughout — no mismatch here | ✓ VERIFIED |
| D-27 global-fallback branch ↔ live `docker-compose.yml` | `JELLYFIN_ALLOWED_LIBRARY_IDS` must be absent from the backend container's env (confirming the global-fallback branch, not the per-library branch, is what actually runs in production) | Confirmed absent from `docker-compose.yml`'s `team4sv30-backend` environment block | ✓ VERIFIED |

### Required Artifacts (spot-checked)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/internal/handlers/jellyfin_discovery.go` | Discovery list handler | ✓ VERIFIED | Exists, 249 lines, builds, all tests pass |
| `backend/internal/handlers/jellyfin_discovery_cache.go` | Snapshot cache builder | ✓ VERIFIED | Exists, 221 lines, both D-27 branches proven by test |
| `backend/internal/handlers/jellyfin_discovery_ignore.go` | Ignore/unignore endpoints | ✓ VERIFIED | Exists, routes registered, audited |
| `backend/internal/repository/library_discovery_ignored_items.go` | Ignore table repository | ✓ VERIFIED | Exists; table live on `team4s_v2` with correct schema (`server_key DEFAULT 'default'`) |
| `backend/internal/repository/anime_source_links.go` | Additive link/unlink functions | ✓ VERIFIED | `LinkAdditionalJellyfinSource`/`RemoveAnimeSourceLink` exist; `ON CONFLICT (source)` correctly targets the table's global unique constraint |
| `frontend/src/app/admin/anime/create/library/*` (Discovery list page) | Card-based list, filters, pager | ✓ VERIFIED | All files exist, 224 frontend tests pass, 0 native-element violations |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx` | Folder list + remove action | ⚠️ ORPHANED WIRING | Component renders correctly (display half of D-18 works); the remove *action* is wired to a URL that never matches the backend's expected value — see Gaps |

### Data-Flow Trace (Level 4) — Discovery List

`DiscoveryLibraryPanel` → `listAdminJellyfinDiscovery` → `GET /admin/jellyfin/discovery` → `buildJellyfinDiscoverySnapshot` (real paginated Jellyfin fetch, both D-27 branches) → `FindExistingAnimeByJellyfinIntakeRefs`/`FindIgnoredLibraryDiscoveryItems` (real single-query Postgres batch lookups) → `resolveDiscoveryItemStatus` → JSON response. **FLOWING** — no static/hardcoded data at any hop, confirmed by code read and passing tests including the ~2111-item scale fixture.

### Behavioral Spot-Checks / Build & Test Evidence

| Check | Command | Result | Status |
|---|---|---|---|
| Backend build | `cd backend && go build ./...` (in `golang:1.25-alpine` container, full repo mounted) | Exit 0, no errors | ✓ PASS |
| Backend vet | `go vet ./...` | Exit 0, no diagnostics | ✓ PASS |
| Backend Discovery/D-05/D-14/D-18/D-20/D-23 test suite | `go test ./internal/handlers/... -run "Discovery\|TestCreateAnime_Rechecks...\|TestPreviewEpisodeImport\|TestCollectJellyfinFolderOptions\|TestRejectUnownedJellyfinSeriesID\|TestConnectJellyfinFolderAdditively\|TestGetAnimeJellyfinContext\|TestRemoveAnimeJellyfinFolder\|TestBuildJellyfinIntakeTypeHint" -v` | All PASS/SKIP (SKIPs are DSN-gated Postgres integration tests, correctly skipping without a live test DSN) | ✓ PASS |
| Backend Enrich() ForceNew suite | `go test ./internal/services/... -run TestAnimeCreateEnrichmentService -v` | 9/9 PASS | ✓ PASS |
| Backend repository (cursor/anime_source_links/ignore) | `go test ./internal/repository/... -run "...various..."` | All PASS/SKIP as expected | ✓ PASS |
| Frontend `tsc --noEmit` | `npx tsc --noEmit` (in live `team4sv30-frontend` container) | Exit 0, zero errors — better than the previously-documented pre-existing `page.ts` route-export error, which is now resolved | ✓ PASS |
| Frontend vitest (phase-165 scope) | `npx vitest run` across all phase-165 directories | 25 files, 224 tests, all PASS | ✓ PASS |
| ESLint (new phase-165 D-13 components) | `npx eslint <6 key files>` | 0 errors, 1 informational `no-img-element` warning (expected — UI-SPEC's sole D-13-exempt element) | ✓ PASS |
| Migration 0170 applied | `psql ... SELECT version,name FROM schema_migrations WHERE version>=168` | `170 \| library_discovery_ignored_items` present | ✓ PASS |
| Live table schema | `\d library_discovery_ignored_items` | Matches migration exactly, including `server_key DEFAULT 'default'::text` | ✓ PASS |
| `docker-compose.yml` D-27 precondition | `grep JELLYFIN_ALLOWED_LIBRARY_IDS docker-compose.yml` | Absent from backend env block, confirming global-fallback branch is live | ✓ PASS |

### Requirements Coverage

See the Observable Truths table above (REQ-165-01 through REQ-165-22 all individually assessed). Summary: 20 SATISFIED, 1 BLOCKED (REQ-165-17), 1 correctly Deferred (REQ-165-15), 1 PARTIAL folded into a satisfied requirement with a documented secondary gap (REQ-165-18's cache half), 1 PARTIAL folded similarly (REQ-165-13's 450-line half). No orphaned requirements found — REQUIREMENTS.md's Phase 165 block (REQ-165-01..22) maps 1:1 to the plans' `requirements:` frontmatter fields and the ROADMAP Coverage table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `backend/internal/handlers/admin_content_handler.go` | (whole file, 459 lines) | CLAUDE.md ≤450-line production-file limit exceeded | ⚠️ Warning | Grew from 444 lines (165-06, deliberately trimmed to fit) to 459 lines via 165-07's added `jellyfinFolderManagementRepository` interface/field — undocumented in `deferred-items.md`, unlike `page.tsx`'s equivalent violation which IS documented. Not phase-165-introduced in the sense of "first violation" (the file discipline was fine after 165-06) but the phase's own later plan (165-07) pushed it back over the limit without flagging it. |
| `backend/internal/handlers/jellyfin_source_folder_management.go` / `AnimeJellyfinFolderList.tsx` | see Gaps | Jellyfin-ID prefix convention inconsistency across a single feature's frontend/backend halves | 🛑 Blocker | Folder removal silently no-ops while reporting success — see Gaps section |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any phase-165-created or phase-165-modified file (checked via word-boundary grep across all new Discovery/folder-management/D-13 component files).

### Git-Stash Policy Note (Informational, not a defect)

165-03's SUMMARY documents that `git stash -u` was run once in error during test-file authoring and was immediately self-corrected via `git stash pop` before any further git operation, with `git stash list` confirmed empty afterward. Current `git status --short` at verification time is clean, and `git stash list` shows no stashes. **No data was lost; this is purely informational per the task's own instruction.**

### Human Verification Required

None. All must-haves for this phase are either machine-verifiable (and were verified) or fall into the one confirmed code-level defect (REQ-165-17), which does not require human judgment to confirm — it is a deterministic string-comparison mismatch demonstrated by direct code and test-fixture reading.

### Gaps Summary

**One BLOCKER:** The "Ordner entfernen" (remove additional Jellyfin folder) action on the anime edit page (D-18/REQ-165-17) is wired end-to-end in the sense that clicking it calls a real endpoint and gets a 200 response — but the endpoint silently fails to delete the intended database row, because 165-10's frontend and 165-07's backend disagree on whether the Jellyfin folder identifier in the DELETE URL should carry the `jellyfin:` prefix. The frontend only ever has the unprefixed ID (that's what `GET /admin/anime/:id/jellyfin/context` returns, via the shared `collectJellyfinFolderOptions` helper), and sends exactly that. The backend compares/deletes using the prefixed form, which is what's actually stored in `anime.source`/`anime_source_links.source`. Neither side's own automated tests catch this because 165-07's handler test hand-picks a `"jellyfin:def"` fixture value (bypassing the frontend's actual contract) and 165-10's component test fully mocks the API client (bypassing the backend's actual contract) — a textbook case of two correctly-tested halves whose shared contract was never tested together. The practical effect: an admin who "removes" an extra folder sees a success message and the row disappear from the edit page, but the folder remains connected in the database and will continue to show as "Bereits vorhanden" in the Discovery list rather than becoming "Offen" again.

**Two WARNINGs (non-blocking, but should be tracked):**
1. `admin_content_handler.go` now sits at 459 lines, 9 over CLAUDE.md's 450-line production-file ceiling, via additive interface/field changes in 165-06/165-07 that were not flagged as a limit-breach in either plan's SUMMARY or in `deferred-items.md` (unlike the equivalent, correctly-documented `page.tsx` violation from 165-08).
2. The Redis-backed TTL cache for the Discovery snapshot (`discoveryCache`/`WithDiscoveryCacheDeps`, part of D-19/REQ-165-18) was built and unit-tested in 165-01 but is never wired to a real Redis client in `main.go` — every Discovery page load re-fetches the entire paginated Jellyfin snapshot instead of hitting a short-lived cache. This is explicitly and honestly documented as a deliberate deferral in 165-06's own SUMMARY (not hidden), and does not break correctness (status is always freshly computed from the DB regardless of cache state, satisfying the other half of D-19), but the "kurzlebiger serverseitiger Cache" requirement itself is not actually delivering caching in production.

Everything else — the three live Discovery statuses, the Create-page hand-off, the AniSearch verbinden/neu-anlegen decision flow (including the D-23 hard-navigation bug fix and its D-23/165-13 ForceNew backend counterpart), the D-11 return-link wiring across all three target pages, the D-20 save-time duplicate guard, the D-05 additive multi-folder connect fix, audit logging, the `server_key` multi-server provisioning, and the D-15 deferral itself — is genuinely, verifiably complete and working, backed by passing builds, passing `go vet`, passing targeted Go and TypeScript/Vitest test suites (224 frontend tests, dozens of backend tests), a clean `tsc --noEmit`, clean ESLint on all new D-13 components, and live database schema confirmation.

---

## BLOCKER Resolved (2026-09-21, post-verification fix)

The REQ-165-17/D-18 BLOCKER (folder-removal ID-prefix mismatch) has been fixed:

- **`backend/internal/handlers/jellyfin_source_folder_management.go`**: `RemoveAnimeJellyfinFolder`
  now treats `c.Param("source")` as the UNPREFIXED Jellyfin item ID — the exact value
  `collectJellyfinFolderOptions` hands the frontend everywhere (matching the established,
  already-live convention used by the episode-import folder guard) — and adds the `jellyfin:`
  prefix internally before comparing against the main-folder source and before calling
  `RemoveAnimeSourceLink`. The frontend (`AnimeJellyfinFolderList.tsx`) required no change: it
  already sends the raw unprefixed `jellyfin_item_id` it has.
- **`backend/internal/repository/anime_source_links.go`**: `removeAnimeSourceLink`/
  `RemoveAnimeSourceLink` now check the DELETE's `RowsAffected()` and return `repository.ErrNotFound`
  on a zero-row match instead of silently succeeding — closing the broader silent-no-op-delete bug
  class, not just the immediate prefix mismatch. The handler maps `ErrNotFound` to a `404` response
  and skips writing a success `audit_logs` entry in that case.
- **Tests added**: `TestRemoveAnimeJellyfinFolder_EndToEndThroughCollectJellyfinFolderOptions` threads
  the real `collectJellyfinFolderOptions` helper's unprefixed output through the actual HTTP handler
  and asserts the repository call receives the correctly re-prefixed source — closing the exact
  same-contract gap that let the original bug ship undetected (165-07's test hand-picked an
  already-prefixed fixture; 165-10's test fully mocked the API client). Also added
  `TestRemoveAnimeJellyfinFolder_ReturnsNotFoundAndSkipsAuditWhenZeroRowsMatched` (handler-level) and
  `TestRemoveAnimeSourceLink_ReturnsErrNotFoundForMismatchedSource` /
  `TestRemoveAnimeSourceLink_DeletesExactlyOneRowAndReturnsErrNotFoundOnZeroMatch` (repository-level,
  run against a live throwaway Postgres DB, not just DSN-skipped).
- **Verification**: `go build ./...` and `go vet ./...` clean; all `internal/handlers` tests pass;
  the two DSN-gated `anime_source_links` repository tests were run against a live throwaway
  `team4s_anime_source_links_test` Postgres database (schema cloned from `team4s_v2`, dropped after
  the run) and pass; full `internal/repository` suite run against the same DB shows only
  pre-existing, environment-dependent failures unrelated to this change (`TEAM4S_PHASE128_TEST_DSN`/
  `TEAM4S_PHASE137_TEST_DSN` unset, Phase-134 tests needing a live Keycloak/backend network); frontend
  `AnimeEditPage` vitest suite (31 tests, 6 files) passes unmodified, confirming no regression on the
  frontend half. `team4sv30-backend` was rebuilt and redeployed (`docker compose up -d --build
  team4sv30-backend`); the live container's route table confirms `DELETE
  /api/v1/admin/anime/:id/jellyfin/folders/:source` is registered and `/health` responds `200`.
- REQ-165-17/D-18 is now considered **SATISFIED**. This addendum does not re-run the full phase
  verification; it documents the targeted blocker fix only.

_Fixed: 2026-09-21_
_Fixed by: Claude (bug-fix executor)_

---

_Verified: 2026-09-21T20:10:00Z_
_Verifier: Claude (gsd-verifier)_
