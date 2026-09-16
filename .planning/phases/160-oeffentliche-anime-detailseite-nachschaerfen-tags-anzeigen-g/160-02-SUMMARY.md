---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 02
subsystem: backend-admin-api
tags: [go, gin, pgx, postgres, admin, i18n, tags, genres, openapi]

# Dependency graph
requires: ["160-01"]
provides:
  - "GET /admin/tags/names, PATCH /admin/tags/:id/names/de, GET /admin/genres/names, PATCH /admin/genres/:id/names/de — admin-gated, global (not anime-scoped) CRUD for German tag/genre display names (D-04/D-07)"
  - "AdminContentRepository.ListTagNamesAdmin/ListGenreNamesAdmin/UpsertTagGermanName/UpsertGenreGermanName"
  - "OpenAPI contract for the four new endpoints plus the now-optional /api/v1/search q parameter (documentation only, Layer 2 behavior implemented separately in 160-04)"
affects: [160-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling repository file (admin_content_tag_genre_names.go) instead of extending admin_content.go, to stay under CLAUDE.md's 450-line production-file cap"
    - "Upsert-or-DELETE PATCH semantics for a per-language display name: trim, ON CONFLICT DO UPDATE when non-empty, DELETE when empty/whitespace-only"

key-files:
  created:
    - backend/internal/repository/admin_content_tag_genre_names.go
    - backend/internal/handlers/admin_content_tag_genre_names_test.go
  modified:
    - backend/internal/models/admin_content.go
    - backend/internal/handlers/admin_content_tags.go
    - backend/internal/handlers/admin_content_genres.go
    - backend/cmd/server/admin_routes.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "PATCH /admin/{tags,genres}/:id/names/de (single-language, upsert-or-clear) instead of a bulk replace-all-languages endpoint — simplest option consistent with 'nur Deutsch jetzt' (D-04) and non-breaking to extend later (160-RESEARCH.md Open Question 2, RESOLVED by this plan)"
  - "Response contract on PATCH always returns 200 with name_de as the trimmed string (empty string \"\" when cleared, never null) — a simple, symmetric client contract for the frontend admin page (160-03)"

patterns-established:
  - "Any future 'global maintenance name' PATCH endpoint in this codebase should follow the same shape: id path param, {\"name\": string} body, trim+empty-clears semantics, 100-rune server-side cap"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-09-16
---

# Phase 160 Plan 02: Admin-Backend für deutsche Tag-/Genre-Namen (Layer 1, Pflegeseite) Summary

**Four new admin-gated endpoints (`GET`/`PATCH` for both tags and genres) let an admin list every tag/genre with its usage count and current German name, and set or clear that name — proven end-to-end against a real Postgres fixture, with the aniSearch import write path (`replaceAuthoritativeAnimeTags`/`Genres`) left byte-identical.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-16
- **Tasks:** 3/3 completed
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- New repository file `admin_content_tag_genre_names.go` (147 lines, well under the 450-line cap) adds `ListTagNamesAdmin`/`ListGenreNamesAdmin` (LEFT JOIN + COUNT, mirroring `buildAuthoritativeTagTokensQuery`'s alias convention but with an `id` column) and `UpsertTagGermanName`/`UpsertGenreGermanName` (trim, `ON CONFLICT (tag_id, language_id) DO UPDATE` when non-empty, `DELETE` when empty/whitespace-only)
- Four new admin-gated routes registered in `admin_routes.go`: `GET /admin/tags/names`, `PATCH /admin/tags/:id/names/de`, `GET /admin/genres/names`, `PATCH /admin/genres/:id/names/de` — all behind the existing `h.requireAdmin(c)` gate, no new auth mechanism
- New real-Postgres `httptest` suite (`admin_content_tag_genre_names_test.go`, 6 tests) proves the `requireAdmin` gate, list correctness (usage count via junction table, nullable `name_de`), the 100-rune server-side cap, and — as direct Auftraggeber-mandate evidence — the three-case German-name fallback for **both** tags and genres
- OpenAPI contract documents all four new paths/schemas and flips `/api/v1/search`'s `q` parameter from `required: true` to `required: false` (documentation only; Layer 2's actual bypass behavior ships in plan 160-04)
- Backend container rebuilt (`docker compose up -d --build team4sv30-backend`); `/health` returns `{"status":"ok"}` after restart

## Task Commits

Each task was committed atomically:

1. **Task 1: Repository layer — list + upsert/clear German tag/genre names** - `53f8d86d` (feat)
2. **Task 2: Admin handlers + routes for tag/genre German names** - `c054c9b4` (feat)
3. **Task 3: Document the new endpoints and the search q-optional contract change in OpenAPI** - `aa884e01` (docs)

## Files Created/Modified
- `backend/internal/repository/admin_content_tag_genre_names.go` - new sibling file: `ListTagNamesAdmin`, `UpsertTagGermanName`, `ListGenreNamesAdmin`, `UpsertGenreGermanName`, `buildAdminTagNamesQuery`/`buildAdminGenreNamesQuery`
- `backend/internal/models/admin_content.go` - added `AdminTagNameRow`/`AdminGenreNameRow` structs
- `backend/internal/handlers/admin_content_tags.go` - added `ListTagNames`, `UpsertTagName`, and the shared `upsertNameRequest` type
- `backend/internal/handlers/admin_content_genres.go` - added `ListGenreNames`, `UpsertGenreName`
- `backend/cmd/server/admin_routes.go` - registered the four new routes next to the existing `/admin/genres`/`/admin/tags` GET routes
- `backend/internal/handlers/admin_content_tag_genre_names_test.go` - new real-Postgres `httptest` suite (6 tests)
- `shared/contracts/openapi.yaml` - four new paths, four new schemas, `/api/v1/search` `q` now `required: false` with an explanatory description

## Decisions Made
- Single-language `PATCH .../names/de` (not a bulk replace-all-languages endpoint) — resolves 160-RESEARCH.md's Open Question 2 in favor of the simpler option, consistent with only German being maintained right now (D-06) and non-breaking to extend to other languages later.
- PATCH always responds 200 with `name_de` as the trimmed string (empty string, never `null`, when cleared) — a deliberately simple, symmetric contract for the 160-03 admin frontend to consume without a null-check branch.

## Deviations from Plan
None - plan executed exactly as written. The plan's own acceptance criteria (function signatures, `ON CONFLICT` upsert shape, unchanged `admin_content.go`, route registrations, real-Postgres httptest execution) were met without needing any Rule 1-4 auto-fixes. The expanded three-case-per-entity test coverage and the explicit Auftraggeber-mandate evidence sections below are mandate deliverables (Punkt 2) layered on top of the plan's baseline `<behavior>` (which already specified upsert/clear semantics), not deviations from it.

## Auftraggeber-Mandat Punkt 2: Drei-Fall-Fallback-Nachweis (Tags UND Genres)

Both `UpsertTagGermanName`/`UpsertGenreGermanName` were already specified by the plan's `<behavior>` to trim+empty→DELETE. This plan adds explicit, direct-evidence test coverage of all three required cases for **both** entities, each proven via real handler execution against a real Postgres fixture (not a mock), followed by a real `GET .../names` call reading back the persisted state:

| Case | Tag test | Genre test | Result asserted |
|---|---|---|---|
| (a) Setting a real name | `TestAdminTagGenreNames_UpsertTagName_ThreeCaseFallback` — PATCH `{"name":"Amnesie"}` on tag id 1 | `TestAdminTagGenreNames_UpsertGenreName_ThreeCaseFallback` — PATCH `{"name":"Aktion"}` on genre id 1 | 200; follow-up GET shows `name_de: "Amnesie"` / `"Aktion"` |
| (b) Clearing with an empty string | Same test, PATCH `{"name":""}` | Same test, PATCH `{"name":""}` | 200; follow-up GET shows `name_de: null` |
| (c) Clearing with a whitespace-only string | Same test, PATCH `{"name":"   "}` (after re-setting the name so the clear is proven from a non-nil starting state) | Same test, PATCH `{"name":"   "}` (same re-set-first structure) | 200; follow-up GET shows `name_de: null` |

Live test run (against a real, schema-isolated Postgres fixture `team4s_phase106_test_16002`, `docker compose exec team4sv30-backend go test ./internal/handlers/... -run TestAdminTagGenreNames -v`):
```
--- PASS: TestAdminTagGenreNames_ListTagNames_RequiresAdmin (0.04s)
--- PASS: TestAdminTagGenreNames_ListTagNames_ReturnsSeededRows (0.03s)
--- PASS: TestAdminTagGenreNames_UpsertTagName_ThreeCaseFallback (0.03s)
--- PASS: TestAdminTagGenreNames_UpsertTagName_TooLongNameRejected (0.03s)
--- PASS: TestAdminTagGenreNames_UpsertGenreName_ThreeCaseFallback (0.03s)
--- PASS: TestAdminTagGenreNames_ListGenreNames_ReturnsSeededRows (0.03s)
PASS
```
Both the (b) empty-string and (c) whitespace-only-string clears exercise the exact same production code path (`UpsertTagGermanName`/`UpsertGenreGermanName`'s `strings.TrimSpace` + empty check → `DELETE`), so this proves the trim behavior itself, not just two accidentally-equivalent inputs. The re-set-before-(c) structure specifically guards against a false green where the row was already absent going into the whitespace-only case — case (c) starts from a confirmed non-nil `name_de` and ends at confirmed `nil`, exactly like case (b).

**Fallback for display is the base name in all three post-clear states**, confirmed transitively: this plan's `ListTagNamesAdmin`/`ListGenreNamesAdmin` (the admin-side read) return `name_de: null` after any clear, and 160-01's `loadNormalizedAnimeMetadata` (the public-side read, `COALESCE(gn.name, g.name)`/`COALESCE(tn.name, t.name)`) already proved in its own SQL-budget test that a `null` German name resolves to the base name for public display — the two reads share the exact same `tag_names`/`genre_names` table and `language_id = (SELECT id FROM languages WHERE code = 'de')` predicate, so a row absence observed here is the same row absence 160-01 already proved falls back correctly.

## Auftraggeber-Mandat Punkt 1: aniSearch-/Import-Schreibpfad unverändert (D-05)

`git diff` across all three of this plan's commits against `backend/internal/repository/admin_content.go` (the file containing `replaceAuthoritativeAnimeTags`/`replaceAuthoritativeAnimeGenres`) shows **zero changes**:
```
$ git diff HEAD~4 -- backend/internal/repository/admin_content.go
(no output)
```
`wc -l backend/internal/repository/admin_content.go` reports 358 lines, identical to its state before this plan (and identical to its state after 160-01, which also left it untouched). All new functionality lives exclusively in the new sibling file `admin_content_tag_genre_names.go`. The import pipeline continues to write only `tags.name`/`genres.name` (the base name) via `INSERT INTO tags (name) ... ON CONFLICT (name) DO NOTHING` / the genre equivalent — it has no code path that touches `tag_names`/`genre_names` at all, so it cannot write a language-scoped name even incidentally.

## Operational Verification
- `docker compose up -d --build team4sv30-backend` rebuilt the backend image with this plan's changes; the container restarted cleanly and `GET /health` returned `{"status":"ok"}`.
- `go build ./...` and `go vet ./...` (inside the rebuilt container) are both clean.
- `go test ./internal/repository/... -run TestAnimePublicReadDetailStoredSlugAndSQLBudget -v` (160-01's SQL-budget regression guard) still passes with the unchanged 7-statement count — confirms this plan's admin-only additions did not touch the public detail read path.
- `go test ./internal/handlers/...` (full package) shows exactly 3 pre-existing, unrelated failures — `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`, `Test11eyesSourceSelection_AllActualItemsAndPermutations`, `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` — all failing because a fixture file (`docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json`) is missing from this checkout; these belong to Phase 161's Jellyfin-source test suite and have no relation to tags/genres or this plan's changed files.
- A throwaway scoped test database (`team4s_phase106_test_16002`) was created for this plan's test runs and dropped again after use — no persistent state left behind (Test data constraint: "Existing rows are disposable").

## Issues Encountered
- No local Go toolchain in this session's environment (`go: command not found` outside the container) — all `go build`/`go vet`/`go test` invocations were run via `docker compose exec team4sv30-backend`, per CLAUDE.md's canonical Docker-Compose-only workflow.
- `testsupport.OpenPhase106Postgres` only provisions unrelated FK prerequisites (`members`/`app_users`/`fansub_groups`/`release_versions`); the test file builds its own minimal `languages`/`tags`/`tag_names`/`anime_tags`/`genres`/`genre_names`/`anime_genres` schema via `fixture.Exec`, mirroring the exact pattern already used in `anime_public_read_integration_test.go` (160-01).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The four new admin endpoints are ready for plan 160-03 (the admin frontend maintenance page) to consume directly: `GET .../names` for the table, `PATCH .../:id/names/de` for the per-row save action.
- No German names have been written to production data yet by this plan (it only adds the write path) — the admin page in 160-03 is the first place an admin can actually populate them.
- No blockers.

## Self-Check: PASSED

Verified on disk: `backend/internal/repository/admin_content_tag_genre_names.go`, `backend/internal/handlers/admin_content_tag_genre_names_test.go`, and the modified `backend/internal/models/admin_content.go`, `backend/internal/handlers/admin_content_tags.go`, `backend/internal/handlers/admin_content_genres.go`, `backend/cmd/server/admin_routes.go`, `shared/contracts/openapi.yaml` all exist with the described content. All three task commit hashes (`53f8d86d`, `c054c9b4`, `aa884e01`) found in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*
