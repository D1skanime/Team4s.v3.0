---
phase: quick-260922-ikh
plan: 01
subsystem: backend/frontend — admin anime asset search
tags: [tmdb, fanart.tv, anilist, asset-search, gap-17, phase-165]
dependency-graph:
  requires: []
  provides:
    - "movie-format TMDB/Fanart.tv asset search (dual TV/movie lookup)"
    - "AniList cover-image support for the cover slot"
  affects:
    - backend/internal/services (asset search providers)
    - frontend/src/app/admin/anime/create (asset search error message)
tech-stack:
  added: []
  patterns:
    - "shared lookupTMDBTVOrMovie helper reused by TMDB and Fanart.tv providers"
key-files:
  created:
    - backend/internal/services/asset_search_service.go
    - backend/internal/services/asset_search_tmdb_lookup.go
    - backend/internal/services/asset_search_tmdb.go
    - backend/internal/services/asset_search_tmdb_test.go
    - backend/internal/services/asset_search_fanarttv.go
    - backend/internal/services/asset_search_fanarttv_test.go
    - backend/internal/services/asset_search_anilist.go
    - backend/internal/services/asset_search_anilist_test.go
  modified:
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/services/anime_create_enrichment_test.go
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md
decisions:
  - "Cover slot now queries TMDB, AniList, Zerochan, Konachan, Safebooru in that order — official posters (TMDB/AniList) rank ahead of Zerochan/booru fan-art."
  - "TMDB and Fanart.tv both fall back from /search/tv to /search/movie via a shared lookupTMDBTVOrMovie helper, so movie-format anime are found without a second unconditional API call for TV-format anime."
  - "Fanart.tv movie hits use the /movies/{tmdbMovieID} endpoint directly — no TVDB resolution step for movies."
metrics:
  duration: "~55 minutes"
  completed: "2026-09-22"
---

# Phase quick-260922-ikh Plan 01: GAP-17 — Online-Bildersuche findet keine Poster fuer Film-Format-Anime Summary

TMDB, Fanart.tv, and AniList asset-search providers now find movie-format anime (e.g. ".hack//G.U.
Trilogy") by searching both TV and movie endpoints and by adding AniList cover-image support to the
cover slot, instead of returning an empty result for anything TMDB/AniList only list as a film.

## What Was Built

GAP-17 (Phase 165 Live-UAT, 2026-09-22) reported that the cover "Online suchen" search on
`/admin/anime/create` returned "Keine passenden Assets gefunden" for a movie-format anime like
".hack//G.U. Trilogy" (HTTP 200, empty array, ~300ms). Four verified root causes were fixed:

1. **Cover slot never queried AniList.** `defaultAssetSearchSourceOrder("cover")` only listed TMDB
   and the Booru sources (Zerochan/Konachan/Safebooru). Fixed by adding AniList to the cover slot,
   positioned right after TMDB and ahead of Zerochan — official posters now outrank fan-art.
2. **TMDB and Fanart.tv only searched `/search/tv`.** ".hack//G.U. Trilogy" is listed on TMDB
   exclusively as a movie (`/search/tv` → 0 results, `/search/movie` → 1 result, id 26595). Both
   providers now fall back from `/search/tv` to `/search/movie` via a new shared helper
   (`lookupTMDBTVOrMovie` in `asset_search_tmdb_lookup.go`), then fetch images from
   `/tv/{id}/images` or `/movie/{id}/images` depending on which endpoint matched.
3. **AniList `SupportsAssetKind` only returned true for "banner".** ".hack//G.U. Trilogy" (AniList
   media id 3269) has `bannerImage: null` but a populated `coverImage.extraLarge`. AniList now also
   supports the "cover" slot, using `coverImage.extraLarge` with a `coverImage.large` fallback.
4. **Frontend error message used "pruefe" instead of "prüfe"** (CLAUDE.md Sprachqualität violation),
   fixed to use the real Umlaut.

### File split (450-line rule)

`anime_create_enrichment.go` was carrying the TMDB, Fanart.tv, and AniList provider implementations
plus the orchestrator, well over the 450-line project limit (1765 lines before this plan). All four
were extracted into dedicated files, and `anime_create_enrichment.go` shrank to 1059 lines net (still
over 450 as documented pre-existing debt, but strictly smaller — no new provider file exceeds 450
lines):

| File | Lines | Contents |
|---|---|---|
| `asset_search_service.go` | 161 | `AdminAnimeAssetSearchProvider` interface, `AnimeAssetSearchService` orchestrator, `defaultAssetSearchSourceOrder` (now logs provider errors instead of silently swallowing them) |
| `asset_search_tmdb_lookup.go` | 92 | Shared `lookupTMDBTVOrMovie`/`tmdbSearchFirstID` helper used by both TMDB and Fanart.tv |
| `asset_search_tmdb.go` | 183 | `TMDBAssetSearchProvider`, rebuilt for TV+movie dual search |
| `asset_search_fanarttv.go` | 291 | `FanartTVAssetSearchProvider`, TV/TVDB path unchanged, new movie/TMDB-movie-ID path |
| `asset_search_anilist.go` | 167 | `AniListAssetSearchProvider`, extended with cover-image support |

## Live-Probe Evidence (Task 4)

A temporary program (`backend/cmd/gap17probe/main.go`, never committed, deleted immediately after
use) queried the real TMDB, AniList, Zerochan, and Fanart.tv APIs for ".hack//G.U. Trilogy" through
the exact production provider constructors. Verbatim output (`docker exec team4sv30-backend sh -c
"cd /app && go run ./cmd/gap17probe"`, run 2026-09-22):

```
TMDB       cover      hits=4 err=<nil>
AniList    cover      hits=2 err=<nil>
Zerochan   cover      hits=0 err=zerochan returned status 404
FanartTV   logo       hits=2 err=<nil>
```

Interpretation:
- **TMDB (cover): 4 hits, no error.** Confirms the `/search/tv` → 0 → `/search/movie` → movie id
  26595 → `/movie/26595/images` path returns real posters end-to-end.
- **AniList (cover): 2 hits, no error.** Confirms `coverImage.extraLarge`/`large` now populate real
  candidates for a title whose `bannerImage` is null.
- **Zerochan (cover): 0 hits, `zerochan returned status 404`.** Zerochan's booru search is
  unchanged by this plan (pre-existing behavior, not part of GAP-17 scope) and the plan explicitly
  allows 0 hits here ("Zerochan(cover) kann 0 oder mehr sein"). The 404 reflects Zerochan's own API
  behavior for this query, not a regression — no code in this plan touches the Zerochan provider.
- **FanartTV (logo): 2 hits, no error.** Confirms the new `/movies/26595` endpoint path (TMDB movie
  ID, no TVDB resolution) returns real logo candidates.

The program was deleted with `rm -rf backend/cmd/gap17probe` immediately after capturing this output
and confirmed absent from `git status --short` before any commit.

## Verification

- `go build ./...` and `go vet ./...`: clean, both before and after the container rebuild.
- `go test ./internal/services/...`: all tests pass, including 9 new provider-level tests with faked
  HTTP responses (2 TMDB, 2 Fanart.tv, 3 AniList, 1 orchestrator cover-ordering test) plus every
  pre-existing test in the package.
- `go test ./internal/handlers/...`: 3 pre-existing failures unrelated to this plan
  (`TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`,
  `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
  `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery`) — confirmed to be the same
  documented, pre-existing missing-fixture issue already recorded in `.planning/STATE.md`
  ("fehlende `docs/audits/2026-09-15-jellyfin12/fixtures/*.json` im Docker-Image-Build-Kontext, kein
  Code-Fehler"), reproduced via `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json:
  no such file or directory`. Not a regression from this plan; no file touched by this plan is
  referenced by these tests.
- `npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` (frontend
  container): 21/21 tests pass, including the new Umlaut regression test.
- Line counts: all new/rebuilt `asset_search_*.go` files under 450 lines (max 291);
  `anime_create_enrichment.go` shrank from 1765 to 1059 lines.
- `docker compose up -d --build team4sv30-backend`: real image rebuild (not `docker cp`), container
  came up healthy; `curl http://192.168.235.196:18092/health` → `200` (the compose-mapped host port
  is `18092`, per `docker compose ps`, not the in-container `8092` referenced in the plan draft).
- Post-rebuild re-run of the 9 new provider tests inside the freshly built container: all pass,
  confirming the image was built from the committed git source (not stale `docker cp` state used
  during interim iteration).
- `git status --short` at completion: clean except the untracked
  `.planning/quick/260922-ikh-gap-17-online-bildersuche-findet-keine-f/` directory (docs handled by
  the orchestrator).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] Backend container has no bind mount for Go source**

- **Found during:** Task 1, first attempt to run the plan's verify command
  (`docker exec team4sv30-backend sh -c "cd /app && go test ..."`).
- **Issue:** `docker-compose.yml`'s `team4sv30-backend` service only bind-mounts
  `database/migrations`, `shared/contracts`, `frontend/src/types`, and `media` — the Go source under
  `backend/` is baked into the image at build time (`COPY . .` in `backend/Dockerfile`), unlike the
  frontend container which does bind-mount live source. Running the plan's verify commands
  immediately after editing files on disk executed against stale, pre-edit source inside the
  container (silently — `go test -run <pattern>` reported "no tests to run" rather than an error).
- **Fix:** Used `docker cp` to sync each new/changed file into the running container immediately
  after writing it, for interim iteration only (build/vet/test feedback during Tasks 1-3). This is
  not a substitute for the real deployment step — Task 5's `docker compose up -d --build` performs
  the actual image rebuild from the committed git source, and the post-rebuild test re-run confirmed
  the rebuilt image matches the `docker cp`-verified state exactly.
- **Files modified:** none (workflow adjustment only, no code change).
- **Commit:** N/A (no code change).

**2. [Rule 1 - bug] Plan's health-check port was container-internal, not host-mapped**

- **Found during:** Task 5, health check step.
- **Issue:** The plan's verify step suggested `curl http://192.168.235.196:8092/health`. `docker
  compose ps` shows the actual host-side port mapping is `0.0.0.0:18092->8092/tcp` (an
  environment-specific `BACKEND_PORT` override), not `8092`.
- **Fix:** Used `curl http://192.168.235.196:18092/health` (and confirmed `127.0.0.1:18092` too),
  both returned `200`.
- **Files modified:** none.
- **Commit:** N/A.

No other deviations. All four verified root causes and the file-split requirement were implemented
exactly as specified in the plan's interfaces section.

## Known Stubs

None.

## Threat Flags

None — all four STRIDE items from the plan's threat model (`T-quick-260922-ikh-01..04`) were
addressed as specified: query escaping unchanged (accept), no `api_key`/full-URL logging added to
`asset_search_fanarttv.go` (mitigate, verified by grep — `imagesURL.String()` only appears in
`http.NewRequestWithContext` calls, never in a log statement), call-count bounded to a fixed small
number per provider (accept), and provider-error logging bounded to the provider count (accept).

## Self-Check: PASSED

Verified all created files exist and all commit hashes resolve:

```
FOUND: backend/internal/services/asset_search_service.go
FOUND: backend/internal/services/asset_search_tmdb_lookup.go
FOUND: backend/internal/services/asset_search_tmdb.go
FOUND: backend/internal/services/asset_search_tmdb_test.go
FOUND: backend/internal/services/asset_search_fanarttv.go
FOUND: backend/internal/services/asset_search_fanarttv_test.go
FOUND: backend/internal/services/asset_search_anilist.go
FOUND: backend/internal/services/asset_search_anilist_test.go
FOUND: c90b148a (feat(quick-260922-ikh): orchestrator split + TMDB TV/movie dual search)
FOUND: 183bd816 (feat(quick-260922-ikh): Fanart.tv movie endpoint via TMDB movie ID)
FOUND: c305cb01 (feat(quick-260922-ikh): AniList cover support + error message Umlaut fix)
FOUND: 45aaa13d (docs(quick-260922-ikh): record GAP-17 resolution with live-probe evidence)
CONFIRMED: backend/cmd/gap17probe/ does not exist, not present in git status
CONFIRMED: 165-UAT.md contains exactly 1 "GAP-17" occurrence, LF-only line endings
```
