---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
reviewed: 2026-09-16T21:34:50Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_genres.go
  - backend/internal/handlers/admin_content_tag_genre_names_test.go
  - backend/internal/handlers/admin_content_tags.go
  - backend/internal/handlers/search_bypass_integration_test.go
  - backend/internal/handlers/search.go
  - backend/internal/handlers/search_test.go
  - backend/internal/models/admin_content.go
  - backend/internal/repository/admin_content_tag_genre_names.go
  - backend/internal/repository/anime_metadata.go
  - backend/internal/repository/anime_public_read_integration_test.go
  - backend/internal/repository/search_anime.go
  - backend/internal/repository/search_repository.go
  - backend/internal/repository/search_repository_test.go
  - database/migrations/0168_tag_genre_language_names.down.sql
  - database/migrations/0168_tag_genre_language_names.up.sql
  - frontend/src/app/admin/page.tsx
  - frontend/src/app/admin/tags-genres/page.tsx
  - frontend/src/app/admin/tags-genres/TagsGenresAdminClient.test.tsx
  - frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx
  - frontend/src/app/anime/[id]/page.module.css
  - frontend/src/app/anime/[id]/page.performance.test.ts
  - frontend/src/app/anime/[id]/page.test.tsx
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/app/suche/SearchResults.test.tsx
  - frontend/src/app/suche/SearchResults.tsx
  - frontend/src/app/suche/useDebouncedSearch.test.tsx
  - frontend/src/app/suche/useDebouncedSearch.ts
  - frontend/src/lib/api.ts
  - frontend/src/types/admin.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 160: Code Review Report

**Reviewed:** 2026-09-16T21:34:50Z
**Depth:** standard
**Files Reviewed:** 27 (of the 31 listed; `search_fansub.go`, `search_suggestions.go` and other non-listed dependents were read only for cross-reference, not scored)
**Status:** issues_found

## Summary

This phase adds German display-name maintenance for tags/genres (migration 0168, new admin repo/handlers/frontend page), wires that German name into the public anime detail page's tag/genre resolution (`anime_metadata.go`), and adds a D-08 "no `q` required when `tag`/`genre` is set" bypass to `/api/v1/search` (backend + frontend hook mirror). The SQL is consistently parameterized (no injection risk found), the new admin endpoints are behind `requireAdmin`, and the D-08 bypass is narrowly and correctly scoped per its own test suite (present-but-short `q` still rejects; non-tag/genre filters never bypass). No blocking defects were found.

Three real (but non-blocking) defects turned up in the new tag/genre-name admin endpoints: a validation length check that runs on the untrimmed input (can reject an effectively-valid, whitespace-padded name), and a missing existence check on PATCH that lets a non-existent id "successfully" clear a name (silent no-op) while a genuinely new name against a non-existent id surfaces as an opaque 500 instead of 404. A UI race in the new admin table is also worth hardening. Two lower-priority Info items round out the findings (one pre-existing dead-code observation surfaced while tracing the file, one pre-existing validation asymmetry touched only incidentally by this phase).

## Warnings

### WR-01: PATCH `.../names/de` length validation runs on the untrimmed value, rejecting some valid trimmed input

**File:** `backend/internal/handlers/admin_content_tags.go:93` (and the mirrored genre handler `backend/internal/handlers/admin_content_genres.go:95`)

**Issue:** `UpsertTagName`/`UpsertGenreName` validate `len([]rune(req.Name)) > 100` on the raw, untrimmed request body, but the repository layer (`UpsertTagGermanName`/`UpsertGenreGermanName`) trims the value before persisting (`strings.TrimSpace(name)`). A name with leading/trailing whitespace that is exactly 100 runes *after* trimming (e.g. a user who pastes `" " + 100 chars + " "`, 102 runes total) is rejected with 400 even though the value that would actually be stored is well within the limit. This is inconsistent with the sibling `ListTagTokens`/`ListGenreTokens` handlers in the same files, which trim the query parameter *before* the length check (`admin_content_tags.go:19-26`, `admin_content_genres.go:27-34`).

**Fix:**
```go
trimmed := strings.TrimSpace(req.Name)
if len([]rune(trimmed)) > 100 {
    badRequest(c, "ungültiger name parameter")
    return
}
```
Apply the same fix in both `UpsertTagName` and `UpsertGenreName`.

### WR-02: PATCH `.../names/de` does not verify the tag/genre id exists — clearing a non-existent id silently "succeeds", setting one surfaces as an opaque 500

**File:** `backend/internal/repository/admin_content_tag_genre_names.go:55-82` (tags) and `:120-147` (genres); called from `backend/internal/handlers/admin_content_tags.go:77-105` and `backend/internal/handlers/admin_content_genres.go:79-107`

**Issue:** Neither `UpsertTagGermanName` nor `UpsertGenreGermanName` checks that `tagID`/`genreID` actually exists before acting:
- Clearing (`name` empty/whitespace) issues a `DELETE ... WHERE tag_id = $1 AND language_id = ...` and never inspects the affected row count, so `PATCH /admin/tags/999999/names/de` with an empty name returns `200 {"data":{"id":999999,"name_de":""}}` even though tag `999999` doesn't exist — a false-positive success for the caller (and a stale/incorrect admin list ends up looking "resolved").
- Setting a real name against a non-existent id trips the `tag_id` foreign key (`tag_names.tag_id REFERENCES tags(id)`), which bubbles up through the handler's generic `if err != nil { ... 500 "interner serverfehler" }` path — a client-input problem (bad/stale id) is reported as a server fault instead of `404`.

Because the admin frontend only ever PATCHes ids it just fetched from `GET .../names`, this is unlikely to trigger in the happy path, but it's a real correctness/robustness gap for any other caller (or a race where one admin deletes a tag while another admin's page is still open) and it's inconsistent with the project's convention of returning meaningful 4xx errors for bad input.

**Fix:** Look the row up first (or use `RETURNING id` / check `pgconn.CommandTag.RowsAffected()`) and translate "id not found" into a `404`, e.g.:
```go
tag, err := r.db.Exec(ctx, `DELETE FROM tag_names WHERE tag_id = $1 AND language_id = (SELECT id FROM languages WHERE code = 'de')`, tagID)
// plus a lightweight `SELECT 1 FROM tags WHERE id = $1` existence check (or catch the FK
// violation on insert and map pgerrcode.ForeignKeyViolation to a 404 in the handler).
```

### WR-03: Admin tag/genre name table has no protection against out-of-order PATCH responses for the same row

**File:** `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx:71-85`

**Issue:** `handleBlur` fires `onSave` on every blur with no `AbortController`/sequence guard and no per-row in-flight tracking. If the same input is blurred twice in quick succession (e.g. blur → refocus → edit again → blur, or a slow first request racing a fast retry), the two `PATCH` responses can resolve out of order. Whichever response resolves last wins the `setDrafts` call, so a stale (earlier) response can silently overwrite a newer save's result in the UI — the displayed value would then not match what's actually persisted until the next full reload. Other async flows in this codebase (`useDebouncedSearch.ts`, reviewed above) consistently guard against exactly this class of race with `AbortController`; this new component doesn't.

**Fix:** Track an incrementing request token (or `AbortController`) per row and ignore a resolved response if a newer request for the same `row.id` has since been issued, e.g.:
```ts
const requestSeq = useRef<Record<number, number>>({});
const handleBlur = useCallback(async (row: Row, nextValue: string) => {
  const seq = (requestSeq.current[row.id] = (requestSeq.current[row.id] ?? 0) + 1);
  setSaveErrors((current) => ({ ...current, [row.id]: null }));
  try {
    const response = await onSave(row.id, nextValue);
    if (requestSeq.current[row.id] !== seq) return; // superseded by a newer save
    setDrafts((current) => ({ ...current, [row.id]: response.data.name_de }));
  } catch (error) {
    if (requestSeq.current[row.id] !== seq) return;
    setSaveErrors((current) => ({ ...current, [row.id]: readErrorMessage(error, "Speichern fehlgeschlagen.") }));
  }
}, [onSave]);
```

## Info

### IN-01: `SearchRepository.Suggest` is unreachable dead code (pre-existing, not introduced by this phase)

**File:** `backend/internal/repository/search_repository.go:86-136`

**Issue:** `Suggest` exists only to satisfy the `models.SearchProvider` compile-time assertion (`search_repository.go:25`), but `SearchProvider` itself is never used as an abstraction anywhere in the codebase — `SearchHandler` holds a concrete `*repository.SearchRepository` (see `backend/internal/handlers/search.go:50-57`) and calls `SearchSuggestions` (defined in `search_suggestions.go`, not `Suggest`). `grep` across the backend confirms `.Suggest(` is never called. This predates phase 160 (introduced in `6d0fcd30`, phase 115-03) but was re-read in full as part of this phase's file list; flagging for cleanup visibility since it sits directly next to the code this phase modified (`Search`, in the same file).

**Fix:** Either wire `SearchHandler` to depend on `models.SearchProvider` (so the interface is genuinely load-bearing) or delete `Suggest` and the `SearchProvider` interface/assertion if `SearchSuggestions` is the sole intended read path.

### IN-02: `search.go`'s `q` max-length check is byte-length, not rune-length (pre-existing, inconsistent with the adjacent min-length check)

**File:** `backend/internal/handlers/search.go:96-99` and `:193-196`

**Issue:** `parseSearchQueryTerm` deliberately enforces the *minimum* length via `utf8.RuneCountInString` specifically so a single multi-byte umlaut isn't treated as satisfying the 2-character minimum (per its own doc comment). But the *maximum*-length check a few lines later, `len(q) > searchMaxQueryLen`, uses `len()` (byte length), so a 100-rune string full of umlauts (200 bytes) is rejected even though it's exactly at the documented 100-character limit, while the min-length reasoning explicitly calls out this exact rune-vs-byte pitfall. This predates 160-04 (present since `e69b0964`) but sits directly beside the lines this phase's bypass logic modified.

**Fix:**
```go
if utf8.RuneCountInString(q) > searchMaxQueryLen {
    badRequest(c, "ungültiger q parameter")
    return
}
```
Apply the same fix to `parseOptionalFilterString` (`search.go:277-286`, byte-length check on `genre`/`tag`/`format`/`status`) for consistency, since those values can also legitimately contain multi-byte characters (confirmed by this phase's own `Dämon`/`Aktion` test fixtures).

---

_Reviewed: 2026-09-16T21:34:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
