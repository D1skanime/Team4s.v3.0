---
phase: quick-260922-cew
plan: 01
subsystem: admin-anime-jellyfin-discovery
tags: [jellyfin, discovery, admin-anime-create, pagination, ui]
dependency-graph:
  requires: [165-06, 165-09]
  provides:
    - "Jellyfin-Vorschau-Übernahme aus der Bibliothek ohne vorherige Direktsuche"
    - "Filter-treue has_more/next_cursor-Semantik in der Discovery-Pagination"
    - "parent_context auf AdminJellyfinDiscoveryItem (Backend + Frontend-Typ)"
    - "Kompakte, rechtsbündige Aktionsreihe auf DiscoveryLibraryCard"
  affects:
    - "frontend/src/app/admin/anime/create/library/*"
    - "backend/internal/handlers/jellyfin_discovery.go"
    - "backend/internal/repository/jellyfin_discovery_cursor.go"
tech-stack:
  added: []
  patterns:
    - "Cursor-Seek-Fenster erweitert sich über den Filter hinweg, bleibt aber bei exakt 1 Query pro Feld pro Seite (D-07)"
key-files:
  created: []
  modified:
    - frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - backend/internal/repository/jellyfin_discovery_cursor.go
    - backend/internal/handlers/jellyfin_discovery.go
    - backend/internal/handlers/jellyfin_discovery_test.go
    - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts
    - backend/internal/models/jellyfin_discovery.go
    - frontend/src/types/admin.ts
    - frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts
    - frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx
decisions: []
metrics:
  duration: "~35 minutes"
  completed: "2026-09-22"
---

# Phase quick-260922-cew Plan 01: 165 Live-UAT-Fixes GAP-01..GAP-04 Summary

Fixed the Phase 165 blocker (Jellyfin discovery-handoff never previewed) plus three UX bugs
(pagination false-positive, missing parent path segment on the discovery card, full-width
stacked action buttons) — all four backed by new automated tests exercising the real code paths.

## What Was Built

**GAP-01 (BLOCKER) — `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts`:**
`loadPreview()` previously looked up the given `candidateID` only in the local `candidates` array
(populated exclusively by a prior direct search) and returned `null` immediately when that array
was empty — so the discovery-handoff adopt path (clicking "Anime anlegen" straight from
`/admin/anime/create/library`) never even issued the preview request. No cover, folder path, type,
or AniSearch title seed was ever adopted; the pre-existing "Jellyfin-Vorschau konnte nicht geladen
werden" error path existed but was unreachable. `loadPreview()` now calls
`previewAdminAnimeFromJellyfinIntake` directly with the trimmed `candidateID` regardless of whether
a matching entry exists in `candidates`, and falls back to a `hydrated` review state with
`selectedCandidate: null` when there is no match (safe: `page.tsx` only reads `selectedCandidate`
for the search-results list, which is not rendered when `candidates` is empty). The existing
direct-search regression path (`completeJellyfinCandidateTakeover`) is unchanged when a match does
exist.

**GAP-02 — `backend/internal/handlers/jellyfin_discovery.go`,
`backend/internal/repository/jellyfin_discovery_cursor.go`:** `ListJellyfinDiscovery` previously
derived `has_more`/`next_cursor` from the raw (search-text-only-filtered) snapshot page **before**
the D-17 status filter was applied. A narrow search term combined with a status filter (e.g. "offen")
could leave "Weiter" active even though no further *visible* match remained. `SeekDiscoveryStartIndex`
was extracted out of `SeekDiscoverySnapshot` (identical seek logic, now shared) so the handler can
seek without the old limit+1-overfetch page slicing. The renamed
`buildJellyfinDiscoveryFilteredPage` now scans the **entire remaining** search-filtered window in one
pass, resolves existence/ignore status for that whole window in exactly one query per field
(D-07 budget unchanged, still scoped to the window rather than the full snapshot), and collects the
first `limit` items that genuinely match the requested status filter. `has_more`/`next_cursor` now
reflect a real further match instead of the raw remainder.

**GAP-03 — `backend/internal/models/jellyfin_discovery.go`, `backend/internal/handlers/jellyfin_discovery.go`,
`frontend/src/types/admin.ts`, `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts`,
`DiscoveryLibraryCard.tsx`:** the discovery card showed "Serie | media" because
`buildAdminJellyfinDiscoveryItem` discarded the first return value of `deriveJellyfinPathContexts`
(the meaningful second-to-last path segment, e.g. "Anime.TV.Sub") and only kept `library_context`
(the first path segment — on Linux absolute paths almost always the mount point "media", not a real
library name). `AdminJellyfinDiscoveryItem` now also carries `parent_context` end-to-end (Go model →
JSON → frontend type). `buildDiscoveryCardMetaLine` now builds
`"{Typ} | {Unterordner} | {Bibliothek}"` analogous to the existing `JellyfinCandidateCard`'s meta
line, appending each optional segment only when present.

**GAP-04 — `DiscoveryLibraryCard.tsx`:** `actionsStyle` was `flexDirection: column` with no
`alignItems`, so the flex `stretch` default pulled both action buttons to the full width of the
content column. `actionsStyle` is now `flexDirection: row` / `justifyContent: flex-end` (with
`flexWrap` for narrow cards), pinned to the bottom of the content column via a new `topBlockStyle`
wrapper around the title/meta/status block plus `justifyContent: space-between` on `contentStyle`.
In the open/partial state, "Ignorieren" (secondary variant) now renders before "Anime anlegen"
(primary, unchanged), side by side instead of stacked full-width. The "existing" status block also
gained a bold "Bereits importiert" heading above the matched-title line.

## Deviations from Plan

**None** — all 5 tasks were executed as specified in `260922-cew-PLAN.md`, using the exact
functions/line ranges the plan diagnosed against the real code (verified independently against the
current HEAD before editing each file).

### Environment note (not a code deviation, documented per instructions)

The backend container's `/app` source tree is **not** live-synced from the host — the
`docker-compose.override.yml` `develop.watch` sync action requires an active `docker compose
watch` process, which was not running in this session. `docker exec team4sv30-backend go build`
initially built the container's **stale, pre-edit** source for all 3 backend tasks before this was
discovered. Each backend file was explicitly `docker cp`'d into the running container
(`/app/internal/...`) immediately after editing, and every backend `go build`/`go vet`/`go test`
result quoted below was re-verified **after** that sync step, against the actual edited code. No
plan step or file needed to change because of this — it only affected how verification commands
had to be sequenced in this session.

## Test Evidence

- Backend, files touched by this plan: `go build ./...` and `go vet ./...` clean.
  `go test ./internal/handlers/... -run TestJellyfinDiscovery -v` — 12/12 pass, including the 4 new
  tests (`TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches`,
  `TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow`, and the extended
  `TestJellyfinDiscovery_LibraryContext_D24` now also asserting `ParentContext`).
  `go test ./internal/repository/... -run TestDiscoveryCursor -v` — 4/4 pass unchanged (seek logic
  extraction is behavior-preserving).
- Frontend, all 6 files named in the plan's Task 5 verification list:
  `npx vitest run useAdminAnimeCreateController.test.ts useDiscoveryLibraryFilters.test.ts
  discoveryPageHelpers.test.ts DiscoveryLibraryCard.test.tsx DiscoveryLibraryPanel.test.tsx
  page.test.tsx` — **107/107 pass**, including `DiscoveryLibraryPanel.test.tsx` and
  `page.test.tsx` (side-effect regression check for files this plan does not directly touch).
- `npm run typecheck` — 0 errors (after removing a stale generated `.next/dev/types/app/admin/anime/create/page.ts`
  artifact left over from a prior session's route-helper export change — same recurring issue
  documented in STATE.md's Phase 164 closure entry; not caused by this plan's edits, safe to
  regenerate).
- `npx eslint` on all 4 plan-listed production files — 0 errors, 1 pre-existing warning
  (`@next/next/no-img-element` on the poster `<img>`, present before this plan's changes).
- `git diff --stat` against the pre-plan HEAD shows exactly the 12 paths listed in the plan's
  `files_modified` — no unintended side files.

### Pre-existing, unrelated failures observed during the full-suite run (Task 5 step 1)

Running the full `./internal/handlers/...`/`./internal/repository/...`/`./internal/models/...`
suite (not scoped to this plan's files) surfaced pre-existing, environment-caused failures
unrelated to GAP-01..GAP-04:
- `TestPhase128Matrix*`, `TestArchive*Postgres*`, `TestMemberPointTotalsPostgres*`,
  `TestLoadContributionBadgesPostgres*`, `TestGetOwnDashboardPostgres*`,
  `TestLoadBadgeProgressPostgres*`, `TestLoadPublicBadgesPostgres*`,
  `TestLoadRoleVolume*Postgres*` — all fail with `TEAM4S_PHASE128_TEST_DSN is required for
  Phase-128 PostgreSQL tests` (no isolated Postgres DSN configured in this session).
- `TestPhase134Matrix*` — fail with `dial tcp 192.168.235.196:18093: connect: connection refused`
  (live Keycloak-network dependency unavailable in this session).
- `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
  `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery`,
  `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource` — fail with
  `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/...json: no such file or directory`
  (the backend container has no bind mount for `docs/`, only the frontend container does).
- `TestEvaluateMemberMutationConflictBlocksLastActiveManager` and
  `TestFansubRepository_PublicProfileSourceInvariants` — genuine assertion failures, but in files
  this plan never touches (`fansub_group_app_members_repository_test.go`,
  `fansub_repository_test.go`); out of scope per the executor's scope-boundary rule (only
  auto-fix issues directly caused by the current task's changes). Logged here, not fixed.

None of these overlap with `jellyfin_discovery*`/`useJellyfinIntakeImpl`/`discoveryPageHelpers`/
`DiscoveryLibraryCard` files or tests.

## Live Browser Verification — Explicitly NOT Possible in This Environment

Per the plan's Task 5 step 6, verbatim: **no admin login / interactive Playwright session was
available in this session**, so the following could **not** be verified live in a browser over the
SSH tunnel (`http://127.0.0.1:3300`):

1. That the "Anime anlegen"-from-discovery handoff for a **real** film candidate from the actual
   Jellyfin library genuinely loads cover/banner/logo assets end-to-end (only the mocked-API unit
   test path was exercised).
2. The actual visual appearance of the compact action row (pixel alignment, spacing, color
   contrast against `@/components/ui` tokens) in a real browser viewport.
3. The real pagination behavior against the live ~2111-item Jellyfin snapshot with a genuinely
   narrow search term like "Accel World" plus a status filter.

All evidence for GAP-01..GAP-04 in this plan rests exclusively on the automated tests, `go
build`/`go vet`, `npm run typecheck`, and `eslint` runs listed above, plus a post-restart `curl`
confirming both `/admin/anime/create` and `/admin/anime/create/library` return `200` (no `500`)
after `docker restart team4sv30-frontend`.

## Self-Check: PASSED

All 12 modified files exist on disk with the expected content; all 4 per-task commit hashes exist
in `git log`:

- `60a31669` — fix(165-uat): GAP-01 load Jellyfin preview without prior candidates list
- `bf6cc886` — fix(165-uat): GAP-02 couple discovery has_more/next_cursor to real filter matches
- `c8de6060` — fix(165-uat): GAP-03 surface parent_context on discovery cards
- `0e59cece` — fix(165-uat): GAP-04 compact right-aligned card actions, "Bereits importiert" heading
