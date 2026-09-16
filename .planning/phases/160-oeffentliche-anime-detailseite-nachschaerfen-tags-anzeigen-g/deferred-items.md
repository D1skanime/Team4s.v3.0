# Deferred Items — Phase 160

Out-of-scope discoveries logged during plan execution (not fixed, per the executor's
scope boundary: only auto-fix issues directly caused by the current task's changes).

## 160-04, Task 2 — `fansub_groups.group_type` column does not exist

**Found during:** live end-to-end verification of the Pitfall 1 fix (Auftraggeber-Mandat
Punkt 3) against the running backend container.

**Symptom:** `GET /api/v1/search?q=aa&type=fansub` (a REAL, non-empty q against the
fansub branch) returns HTTP 500 `db_schema_mismatch` in production (`team4s_v2`).

**Root cause:** `backend/internal/repository/search_fansub.go`'s `searchFansub` SELECT
list includes `fansub_groups.group_type`, but `\d fansub_groups` on `team4s_v2` shows no
`group_type` column exists (columns present: id, slug, name, logo_url, banner_url,
founded_year, dissolved_year, status, website_url, discord_url, irc_url, country,
created_at, updated_at, logo_id, banner_id, closed_year, search_tsv). This is a
pre-existing bug from whichever earlier phase (115-0x, search foundation) introduced the
fansub search branch — `search_fansub.go` was not touched by this plan (confirmed via
`git diff` showing zero changes to that file, one of Task 2's own acceptance criteria).

**Why not fixed here:** Out of 160-04's scope — the plan's `<files>` list for Task 2 is
`search_anime.go`, `search_repository.go`, `search_repository_test.go`,
`search_bypass_integration_test.go`; `search_fansub.go` is explicitly required to stay
byte-identical. This bug only affects the q-present fansub search path, which this plan's
D-08/Pitfall-1 fix deliberately never reaches for q-absent tag/genre-only searches (the
new dispatch guard in `search_repository.go` routes q-absent fansub-scoped requests to an
explicit empty result before `searchFansub`/`buildSearchFansubQuery` ever runs). The
q-present fansub search path was already broken in production before this plan and
remains equally broken after it — 0 regression, 0 fix, purely out-of-scope discovery.

**Warning sign:** `curl "http://127.0.0.1:18092/api/v1/search?q=aa&type=fansub"` → 500,
`{"error":{"code":"db_schema_mismatch", ...,"details":"...Fehlende Spalte: group_type...`

**Suggested follow-up:** A future plan should either add a `group_type` column to
`fansub_groups` (migration) or drop `fansub_groups.group_type` from the `searchFansub`
SELECT list and `models.SearchResultItem.Format` mapping for the fansub branch.
