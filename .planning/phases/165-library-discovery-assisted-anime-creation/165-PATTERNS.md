# Phase 165: Library Discovery und Assisted Anime Creation (Serien) - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 24 (13 new, 11 modified)
**Analogs found:** 24 / 24 (all files have at least a role-match analog; several are explicit "reuse this exact function" cases per RESEARCH.md)

> Source of file list: `165-CONTEXT.md` (D-01..D-22), `165-RESEARCH.md` (§1-§16, Recommended Project
> Structure), `165-UI-SPEC.md` ("Betroffene/neue Dateien" table + D-14–D-22-Erweiterungstabelle).
> IMPORTANT (CLAUDE.md + UI-SPEC Design-Entscheidung 1/14): `JellyfinCandidateCard.tsx` is the most
> visually similar existing file for the Discovery row/card, but it uses native
> `<button>/<img>`-markup and its own CSS module — it predates the D-13 UI-primitives rule and is
> **NOT** an allowed analog for any new code in this phase. The correct analog for all new
> list/filter/table code is `AdminUsersClient.tsx` + `useUserListFilters.ts` (the only `@/components/ui`
> compliant list-with-filters code in the repo). This distinction is preserved below and repeated at
> every relevant row.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/jellyfin_discovery.go` (NEU) | handler (route) | request-response (cache-backed list) | `backend/internal/handlers/jellyfin_search.go` | exact (same handler struct, same batch-existence-check composition) |
| `backend/internal/handlers/jellyfin_discovery_cache.go` (NEU) | service/cache-builder | batch/cache-warmup | `backend/internal/handlers/jellyfin_client_series.go` (`searchJellyfinSeries`, multi-library fan-out) | exact (multi-library fan-out pattern reused, snapshot instead of per-query fetch) |
| `backend/internal/handlers/jellyfin_discovery_status.go` (NEU) | utility (pure function) | transform | `backend/internal/repository/admin_content_jellyfin_intake.go` (existence-match shape) + RESEARCH §11 (status-priority spec) | role-match (new pure resolver, no direct analog exists yet) |
| `backend/internal/handlers/jellyfin_discovery_ignore.go` (NEU) | handler (mutating admin action) | CRUD (insert/delete) + event-driven (audit write) | `backend/internal/handlers/admin_users_mutations_handler.go` | exact (simple admin mutation + audit-write pattern) |
| `backend/internal/repository/jellyfin_discovery_cursor.go` (NEU) | utility (cursor codec) | transform | `backend/internal/repository/release_cursor_pagination.go` | exact (encode/decode helpers reused verbatim; only the seek-key semantics differ) |
| `backend/internal/repository/library_discovery_ignored_items.go` (NEU) | repository | CRUD (insert/delete/batch-lookup) | `backend/internal/repository/admin_content_jellyfin_intake.go` (batch-lookup shape) + migration pattern from `0129_release_playback_entitlements` | role-match |
| `backend/internal/handlers/admin_episode_import.go` (GEÄNDERT, D-14) | handler (existing, extend) | request-response | itself (`PreviewEpisodeImport`, `loadEpisodeImportContext`) | exact (extend existing function, do not replace) |
| `backend/internal/handlers/admin_content_anime.go` (GEÄNDERT, D-20) | handler (existing, extend) | CRUD (create) | itself (`CreateAnime`) | exact (insert a guard before the existing `h.repo.CreateAnime` call) |
| `backend/internal/handlers/jellyfin_metadata_resync.go` (GEÄNDERT, D-18) | handler (existing, extend) | request-response | itself (`buildAnimeJellyfinContext`) | exact (extend to return all `anime_source_links` rows) |
| `backend/internal/repository/anime_source_links.go` (GEÄNDERT, D-18) | repository (existing, extend) | CRUD (add DELETE) | itself (`syncAnimeSourceLinks`/`loadAnimeSourceLinks`) | exact (same file, same query style, new `removeAnimeSourceLink`) |
| `database/migrations/0170_library_discovery_ignored_items.up/down.sql` (NEU) | migration | schema | `database/migrations/0129_release_playback_entitlements.up.sql` | exact (small state table w/ actor FK + timestamps) |
| `frontend/src/app/admin/anime/create/library/page.tsx` (NEU) | route (server component) | request-response | `frontend/src/app/admin/anime/page.tsx` | role-match (searchParams-driven server wrapper around `PlatformAdminGate` + client component) |
| `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx` (NEU) | component (client, list) | request-response + CRUD (row actions) | `frontend/src/app/admin/users/AdminUsersClient.tsx` — **NOT** `JellyfinCandidateCard.tsx` (see note above) | exact (only D-13-compliant list+filter+table+pagination analog in repo) |
| `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts` (NEU) | hook (URL-state) | transform | `frontend/src/app/admin/users/useUserListFilters.ts` | exact (URL-sync pattern for filter/search/cursor, debounce included) |
| `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts` (NEU) | utility | transform | `frontend/src/app/admin/anime/create/createPageHelpers.ts` | role-match (pure, testable helper-file pattern, same directory convention) |
| `frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx` (NEU) | component | request-response (static CTA) | existing Create-page provider cards (`page.tsx` `providerGrid`) | role-match |
| `frontend/src/app/admin/anime/create/DiscoveryReturnLink.tsx` (NEU) | component | request-response (static link) | `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` conflict-link block (`<Link>` + `variant="ghost"`) | role-match |
| `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx` (NEU, extracted) | component | event-driven (decision UI) | `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` (existing `conflict` block, lines 155-164) | exact (this IS the code being extracted/extended) |
| `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` (GEÄNDERT, minimal) | component (existing, extend) | event-driven | itself | exact (only the conflict branch changes; rest byte-identical) |
| `frontend/src/app/admin/anime/create/page.tsx` (GEÄNDERT, additiv) | route (client, existing) | request-response | itself (`useAdminAnimeCreateController.ts` consumer) | exact |
| `frontend/src/app/admin/anime/create/createPageHelpers.ts` (GEÄNDERT, additiv) | utility (existing, extend) | transform | itself (`buildManualCreateRedirectPath`) | exact |
| `frontend/src/app/admin/anime/[id]/episodes/page.tsx` (GEÄNDERT, additiv) | route (existing, extend) | request-response | itself + `DiscoveryReturnLink` | exact |
| `frontend/src/app/admin/anime/[id]/edit/page.tsx` (GEÄNDERT, additiv) | route (existing, extend) | request-response | itself + `DiscoveryReturnLink` | exact |
| `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx` (NEU, D-14) | component | request-response (form field) | `AdminUsersClient.tsx`'s `FormField`+`Select` toolbar fields — **NOT** the native `<label>/<input>` markup of the surrounding `import/page.tsx` (D-13, Design-Entscheidung 14) | role-match (must follow primitives despite native neighbors) |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx` (NEU, D-18) | component | CRUD (list + remove) | `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` (structure only, NOT its `window.confirm`) | role-match (structural vorbild, deviates on confirmation per Design-Entscheidung 15) |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx` (GEÄNDERT, D-18) | component (existing, extend) | request-response | itself | exact |

## Pattern Assignments

### `backend/internal/handlers/jellyfin_discovery.go` (handler, request-response)

**Analog:** `backend/internal/handlers/jellyfin_search.go` (`SearchJellyfinSeries`, full file read, 153 lines)

**Handler skeleton pattern** (`jellyfin_search.go:35-97`):
```go
func (h *AdminContentHandler) SearchJellyfinSeries(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if !h.ensureJellyfinConfigured(c) {
		return
	}
	// ... query-param validation with badRequest(c, "...") on failure ...

	items, err := h.searchJellyfinSeries(c.Request.Context(), query, limit)
	if err != nil {
		log.Printf("admin_content jellyfin_series_search: search failed (user_id=%d, q=%q): %v", identity.UserID, query, err)
		message, code, details := classifyJellyfinUpstreamError(err, "jellyfin serien konnten nicht gesucht werden")
		writeJellyfinErrorResponse(c, http.StatusBadGateway, message, code, details)
		return
	}

	seriesIDs := make([]string, 0, len(items))
	paths := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item.ID); trimmed != "" {
			seriesIDs = append(seriesIDs, trimmed)
		}
		if path := strings.TrimSpace(item.Path); path != "" {
			paths = append(paths, path)
		}
	}
	existingMatches, err := h.repo.FindExistingAnimeByJellyfinIntakeRefs(c.Request.Context(), seriesIDs, paths)
	if err != nil {
		log.Printf("admin_content jellyfin_series_search: existing-match lookup failed (user_id=%d, q=%q): %v", identity.UserID, query, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Jellyfin-Intake-Status konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": buildAdminJellyfinIntakeSearchItems(items, query, existingMatches)})
}
```

**Discovery handler must reuse, per line-item:**
- `h.requireAdmin(c)` + `h.ensureJellyfinConfigured(c)` guard (identical, `jellyfin_search.go:36-43`).
- `h.repo.FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)` called exactly once per page (D-07), not per item — same call shape as line 87.
- `classifyJellyfinUpstreamError` + `writeJellyfinErrorResponse` for upstream failures; `writeInternalErrorResponse` for DB failures — do not invent a new error envelope.
- New addition (D-17, not in this analog): a second batch call to the new ignore-lookup repo function, same "once per page" discipline.

**Error handling pattern:** identical `log.Printf("admin_content <handler>: <step> failed (...): %v", ...)` + typed error response helper — reused verbatim across this whole handler family.

---

### `backend/internal/handlers/jellyfin_discovery_cache.go` (service/cache-builder, batch)

**Analog:** `backend/internal/handlers/jellyfin_client_series.go` (`searchJellyfinSeries`, full file, 191 lines)

**Multi-library fan-out with dedup** (`jellyfin_client_series.go:48-104`):
```go
func (h *AdminContentHandler) searchJellyfinSeries(ctx context.Context, title string, limit int) ([]jellyfinSeriesItem, error) {
	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("SearchTerm", strings.TrimSpace(title))
	values.Set("Limit", strconv.Itoa(limit))
	values.Set("Fields", "Path,Overview")

	allowedIDs := h.jellyfinAllowedLibraryIDs
	if len(allowedIDs) == 0 {
		var payload jellyfinSeriesListResponse
		if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
			return nil, err
		}
		// ... filter empty IDs, return ...
	}

	seen := make(map[string]struct{})
	var allItems []jellyfinSeriesItem
	for _, libraryID := range allowedIDs {
		libValues := url.Values{}
		for k, v := range values {
			libValues[k] = v
		}
		libValues.Set("ParentId", libraryID)
		var payload jellyfinSeriesListResponse
		if _, err := h.fetchJellyfinJSON(ctx, "/Items", libValues, &payload); err != nil {
			return nil, err
		}
		for _, item := range payload.Items {
			itemID := strings.TrimSpace(item.ID)
			if itemID == "" || func() bool { _, exists := seen[itemID]; return exists }() {
				continue
			}
			seen[itemID] = struct{}{}
			allItems = append(allItems, item)
		}
	}
	return allItems, nil
}
```

**What the Discovery cache builder must change (per RESEARCH §2/§5):**
- Use `IncludeItemTypes=Series,Movie` (additive, costs nothing, `Movie` returns 0 hits live but future-proofs — do NOT rely on the `Type` field to distinguish film vs. series, see Pitfall 2).
- Use `Recursive=true` **without** `SearchTerm`/`Limit` (full-library snapshot, not a search) — pull the whole library into the TTL cache once, filter/search/paginate in memory afterwards.
- Reuse `Fields=Path` (slim fields) — do NOT add `ProviderIds,Genres,Tags,Overview` (that is the detail-fetch used only after selection, `getJellyfinSeriesIntakeDetail`, `jellyfin_client_series.go:144-190` — never call this for the list).
- Wrap the result in a TTL cache (Redis, `database.NewRedisClient`, pattern `client.Set(ctx, key, val, ttl)` per RESEARCH §13) — 5 min TTL recommendation [ASSUMED].

---

### `backend/internal/repository/jellyfin_discovery_cursor.go` (utility, cursor codec)

**Analog:** `backend/internal/repository/release_cursor_pagination.go` (full file, 185 lines) — reuse verbatim, do not reinvent:

```go
const (
	DefaultCursorPageLimit = 24
	MaxCursorPageLimit     = 100
)

func clampCursorLimit(limit int) int { /* ... */ }

func trimCursorPage[T any](items []T, limit int, cursorFn func(item T) string) (page []T, nextCursor *string, hasMore bool) {
	page = items
	if len(page) > limit {
		hasMore = true
		page = page[:limit]
	}
	if hasMore && len(page) > 0 {
		c := cursorFn(page[len(page)-1])
		nextCursor = &c
	}
	return page, nextCursor, hasMore
}

func encodeCursorPair(part1, part2 string) string {
	return base64.URLEncoding.EncodeToString([]byte(part1 + "|" + part2))
}

func decodeCursorPair(cursor string) (part1, part2 string, ok bool) {
	if cursor == "" {
		return "", "", false
	}
	raw, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return "", "", false
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}
```

**Critical deviation (Pitfall 4):** all existing specializations (`encodeInt32Int64Cursor`, `encodeMixedReleaseCursor`) seek against a SQL `ORDER BY` sequence. Discovery's cursor seeks against an **in-memory/cache sorted snapshot** (e.g. key `(Name, JellyfinItemID)`), not SQL. Reuse `encodeCursorPair`/`decodeCursorPair` + `trimCursorPage` as-is; write a new seek comparator against the cached snapshot slice, not a new SQL query.

**"Silent restart" convention** (comment block, `release_cursor_pagination.go:1-9`): an invalid/empty cursor silently restarts at page 1 — no 400 error. Preserve this behavior for Discovery.

---

### `backend/internal/handlers/jellyfin_discovery_ignore.go` (handler, CRUD + audit)

**Analog:** `backend/internal/repository/audit_logs.go` (full file, 81 lines) + audit-write call-site pattern from RESEARCH §15 (`admin_content_release_version_media_replace.go:445-453`):

```go
// Repository (backend/internal/repository/audit_logs.go:39-81, reuse as-is):
type AuditLogEntry struct {
	ActorAppUserID    *int64
	ActorLegacyUserID *int64
	EventType         string
	ScopeType         string
	ScopeID           *int64
	TargetType        string
	TargetID          *int64
	Action            string
	Outcome           string
	ReasonCode        *string
	Payload           map[string]any
}

func (r *AuditLogRepository) Write(ctx context.Context, entry AuditLogEntry) error { /* INSERT INTO audit_logs ... */ }

// Call-site pattern (Source: admin_content_release_version_media_replace.go:445-453):
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
	ActorAppUserID:    &identity.AppUserID,
	ActorLegacyUserID: &identity.UserID,
	EventType:         "jellyfin_discovery.ignored",
	TargetType:        "jellyfin_item",
	Action:            "ignore",
	Outcome:           "allowed",
	Payload:           map[string]any{"jellyfin_item_id": itemID, "server_key": "default"},
})
```

**Rule (Pitfall 9):** use `h.auditLogRepo` (`AdminContentHandler.auditLogRepo`, already wired via `WithPermissionDeps`) for all four D-21 actions (connect/folder-remove/ignore/unignore). Do **NOT** use `admin_anime_mutation_audit`/`insertAdminAnimeAuditEntry` — that table's `mutation_kind` enum is hard-locked to `anime.create/update/delete` and does not fit these actions.

**Error handling convention:** audit-write errors are intentionally swallowed (`_ = h.auditLogRepo.Write(...)`) — an audit failure must never block a successful mutation. This is the repo-wide convention, keep it.

**Recommended EventType/Action values** (Claude's Discretion per D-21, RESEARCH §15 table):

| Action | EventType | TargetType |
|---|---|---|
| Verbinden (D-05) | `jellyfin_discovery.connected` | `anime` |
| Ordner lösen (D-18) | `jellyfin_discovery.folder_removed` | `anime` |
| Ignorieren (D-17) | `jellyfin_discovery.ignored` | `jellyfin_item` |
| Entignorieren (D-17) | `jellyfin_discovery.unignored` | `jellyfin_item` |

---

### `backend/internal/repository/library_discovery_ignored_items.go` (repository, CRUD)

**Analog (batch-lookup shape):** `backend/internal/repository/admin_content_jellyfin_intake.go` (full file, 171 lines) — the `FindExistingAnimeByJellyfinIntakeRefs` function is the direct template for a new `FindIgnoredLibraryDiscoveryItems(ctx, itemIDs []string) (map[string]bool, error)`-style batch lookup:

```go
// Pattern to copy (admin_content_jellyfin_intake.go:16-35, adapt table/columns):
func (r *AdminContentRepository) FindExistingAnimeByJellyfinIntakeRefs(
	ctx context.Context, seriesIDs []string, paths []string,
) ([]ExistingJellyfinAnimeMatch, error) {
	normalizedSeriesIDs := normalizeDistinctStrings(seriesIDs)
	normalizedPaths := normalizeDistinctStrings(paths)
	if len(normalizedSeriesIDs) == 0 && len(normalizedPaths) == 0 {
		return []ExistingJellyfinAnimeMatch{}, nil
	}
	// single WHERE ... = ANY($1::text[]) query, no N+1
}
```

Also reuse `normalizeDistinctStrings` (`admin_content_jellyfin_intake.go:154-170`) for de-duplicating/trimming the incoming Jellyfin item ID list before the batch query — do not write a new normalization helper.

**Migration analog:** `database/migrations/0129_release_playback_entitlements.up.sql` (full file, 68 lines) — small state table with actor FK + timestamps:

```sql
CREATE TABLE release_playback_entitlement_rules (
    id BIGSERIAL PRIMARY KEY,
    -- ... domain columns ...
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_release_playback_entitlement_rule ON release_playback_entitlement_rules (...);
```

**Proposed schema for `0170_library_discovery_ignored_items`** (RESEARCH §11, NOT a final decision — planner confirms columns):
```sql
CREATE TABLE library_discovery_ignored_items (
    id BIGSERIAL PRIMARY KEY,
    server_key TEXT NOT NULL DEFAULT 'default',       -- D-22-Vorsorge
    jellyfin_item_id TEXT NOT NULL,
    ignored_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    ignored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_library_discovery_ignored_item
    ON library_discovery_ignored_items (server_key, jellyfin_item_id);
```
Next free migration number at research time: **0170** (highest existing: `0169_episode_classification_labels`) — planner must re-verify at execution time (Assumption A8).

---

### `backend/internal/handlers/admin_episode_import.go` (GEÄNDERT, D-14 — extend, do not replace)

**Analog: itself.** `PreviewEpisodeImport` (lines 42-105) and `loadEpisodeImportContext` (lines 159-193) already exist and must be extended, not rewritten.

**Existing acceptance point** (`admin_episode_import.go:73`):
```go
jellyfinSeriesID := firstNonEmptyString(req.JellyfinSeriesID, derefString(contextResult.JellyfinSeriesID))
mediaCandidates, err := h.loadEpisodeImportMediaCandidates(c, jellyfinSeriesID, contextResult.FolderPath)
```

**Fail-closed check to insert BEFORE this call** (new code, pattern combines existing building blocks — RESEARCH §8 Code Example):
```go
allowedSeriesIDs := map[string]struct{}{}
if id := extractJellyfinSourceID(source.Source); id != "" {
	allowedSeriesIDs[id] = struct{}{}
}
for _, link := range source.SourceLinks {
	if id := extractJellyfinSourceID(&link); id != "" {
		allowedSeriesIDs[id] = struct{}{}
	}
}
if _, ok := allowedSeriesIDs[jellyfinSeriesID]; !ok {
	badRequest(c, "jellyfin_series_id ist nicht mit diesem Anime verbunden")
	return
}
```
`source.SourceLinks` is already loaded by `loadEpisodeImportContext` via `h.repo.GetAnimeSyncSource` (`admin_episode_import.go:160`) — no extra DB/Jellyfin call needed. Reuse `extractJellyfinSeriesIDFromSourceLinks` (`admin_episode_import.go:204-211`), which already does the same prefix extraction for the single-folder auto-resolve path.

**Security note:** this closes a pre-existing IDOR-shaped gap (Pitfall 5) — the check must reject BEFORE any Jellyfin HTTP call is made (zero-call assertion in tests).

---

### `backend/internal/handlers/admin_content_anime.go` (GEÄNDERT, D-20 — extend, do not replace)

**Analog: itself.** `CreateAnime` (full file, 205 lines, handler at lines 19-50).

**Insertion point** (`admin_content_anime.go:41`):
```go
item, err := h.repo.CreateAnime(c.Request.Context(), input, identity.UserID)
```

**Required guard immediately before this line** (D-20, RESEARCH §7/§14): call `h.repo.FindAnimeBySource(ctx, "anisearch:"+id)` (same repository method already used by `Enrich()`) and, on a hit, return the same redirect/conflict payload as the existing `Enrich()` dedup check instead of silently calling `CreateAnime`. This is a pure additive guard — `CreateAnime` itself is not modified beyond the new check.

**`FindAnimeBySource` implementation to reuse** (`backend/internal/repository/admin_content_anisearch.go:14-56`, full function):
```go
func (r *AdminContentRepository) FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error) {
	normalized := strings.TrimSpace(source)
	if normalized == "" {
		return nil, nil
	}
	// ...
	if err := r.db.QueryRow(ctx, `
		SELECT DISTINCT anime.id, `+displayTitleExpr+`
		FROM anime
		LEFT JOIN anime_source_links asl ON asl.anime_id = anime.id
		WHERE anime.source = $1 OR asl.source = $1
		LIMIT 1
	`, normalized).Scan(&item.AnimeID, &item.Title); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find anime by source %q: %w", normalized, err)
	}
	return &item, nil
}
```

**Error handling pattern** already present in `CreateAnime` — reuse verbatim for the new guard's failure path:
```go
log.Printf("admin_content create_anime: repo error (user_id=%d): %v", identity.UserID, err)
writeInternalErrorResponse(c, "interner serverfehler", err, "Anime konnte nicht angelegt werden. ...")
```

---

### `backend/internal/handlers/jellyfin_metadata_resync.go` (GEÄNDERT, D-18 — extend `buildAnimeJellyfinContext`)

**Analog: itself** (`buildAnimeJellyfinContext`, lines 298-349+, and `ApplyAnimeMetadataFromJellyfin`, lines 134-296 — both read in full).

**Current single-folder resolution** (`jellyfin_metadata_resync.go:303-306`):
```go
seriesID := strings.TrimSpace(explicitSeriesID)
if seriesID == "" {
	seriesID = jellyfinSeriesIDFromAnimeSource(animeSource.Source, animeSource.SourceLinks)
}
```
This picks only the **first** `jellyfin:` reference (from `Source` or `SourceLinks`). D-18 requires returning **all** of them, with the one matching `animeSource.Source` exactly flagged as "Haupt-Ordner" and the rest as "Zusatz-Ordner". Extend this function to also call `loadAnimeSourceLinks` (see below) and return the full list on `models.AdminAnimeJellyfinProvenanceContext` (new field needed — extend `frontend/src/types/admin.ts` `AdminAnimeJellyfinContext` accordingly, currently single-value per RESEARCH §12).

**"Verbinden" write path to reuse for D-05** (`ApplyAnimeMetadataFromJellyfin`, `jellyfin_metadata_resync.go:195-208`):
```go
if err := h.repo.ApplyJellyfinSyncMetadata(
	c.Request.Context(),
	animeID,
	"jellyfin:"+preview.JellyfinSeriesID,
	preview.JellyfinSeriesPath,
	int16FromStringPtr(fieldIncomingValue(preview.Diff, "year")),
	fieldIncomingValue(preview.Diff, "description"),
	nil,
	explicitSeriesID != "",   // forceSourceUpdate
); err != nil { /* ... */ }
```

**Pitfall 3 (must be handled before reuse):** `forceSourceUpdate=true` here can overwrite an existing `anisearch:<id>` value in `anime.source` (the CASE-logic in `ApplyJellyfinSyncMetadata` only checks "empty vs. force", not provider prefix). Before calling this for Discovery's "Verbinden" action, check whether `animeSource.Source` already starts with `anisearch:` — if so, write the Jellyfin reference into `anime_source_links` instead (additive `ON CONFLICT DO NOTHING` insert, see below) rather than force-overwriting `anime.source`.

---

### `backend/internal/repository/anime_source_links.go` (GEÄNDERT, D-18 — add `removeAnimeSourceLink`)

**Analog: itself** (full file, 84 lines) — `syncAnimeSourceLinks` (insert) and `loadAnimeSourceLinks` (select) are the existing functions; the new `removeAnimeSourceLink` follows the identical query style:

```go
// Existing INSERT pattern (anime_source_links.go:30-43), reuse ON CONFLICT DO NOTHING discipline:
if _, err := tx.Exec(ctx, `
	INSERT INTO anime_source_links (anime_id, source)
	VALUES ($1, $2)
	ON CONFLICT (anime_id, source) DO NOTHING
	`, animeID, source); err != nil {
	return fmt.Errorf("link anime source anime=%d source=%q: %w", animeID, source, err)
}

// Existing SELECT pattern (anime_source_links.go:48-68):
func loadAnimeSourceLinks(ctx context.Context, q animeSourceLinkQueryer, animeID int64) ([]string, error) {
	rows, err := q.Query(ctx, `SELECT source FROM anime_source_links WHERE anime_id = $1 ORDER BY source ASC`, animeID)
	// ...
}

// NEW function to add, same style:
func removeAnimeSourceLink(ctx context.Context, tx pgx.Tx, animeID int64, source string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, source); err != nil {
		return fmt.Errorf("remove anime source link anime=%d source=%q: %w", animeID, source, err)
	}
	return nil
}
```

**Guard required (must be enforced by the handler calling this, not by the DB):** reject `source == animeSource.Source` (protects the main folder — "Haupt-Ordner wird hier nicht gelöst", D-18).

**Pitfall 6 (constraint to respect on ANY new insert path, e.g. D-05/D-16 "Verbinden"):** `anime_source_links.source` has a **global** `UNIQUE(source)` constraint, not just `UNIQUE(anime_id, source)` (`database/migrations/0047_add_anime_source_links.up.sql:6`, full file read). Always insert with `ON CONFLICT DO NOTHING` (as `syncAnimeSourceLinks` already does) or a pre-check — never a naked `INSERT`.

---

### `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx` (component, list + row actions)

**Analog: `frontend/src/app/admin/users/AdminUsersClient.tsx` (full file read through line 260).**
**Explicitly NOT `JellyfinCandidateCard.tsx`** — see CLAUDE.md closest-analog exception, confirmed in UI-SPEC Design-Entscheidung 1.

**Imports pattern** (`AdminUsersClient.tsx:1-27`):
```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState,
  Pagination, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from '@/components/ui'
import { ApiError, listAdminUsersPage } from '@/lib/api'
import type { AdminUserListItem } from '@/types/admin-users'
import styles from './AdminUsers.module.css'
import { useUserListFilters } from './useUserListFilters'
```

**Data-loading + state pattern** (`AdminUsersClient.tsx:60-96`):
```tsx
export function AdminUsersClient() {
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const { params, searchValue, handleSearchChange, handleStatusChange, handleRoleChange, handlePageChange } =
    useUserListFilters()

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listAdminUsersPage({ ...params })
      setItems(resp.data)
      setTotal(resp.meta.total)
    } catch (err) {
      setError(readErrorMessage(err, 'Benutzerliste konnte nicht geladen werden. Bitte Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => { void loadUsers() }, [loadUsers])
  // ...
```
Discovery deviates here per UI-SPEC Design-Entscheidung 4: `Pagination` (numbered, OFFSET-style) is **not** reusable because Discovery's total page count is unknown ahead of time (seek-cursor over a cached snapshot). Replace `Pagination` with two `Button`s ("Zurück"/"Weiter") + a client-side page counter + a cursor history stack — see UI-SPEC Screen 2 for exact copy/layout.

**Filter toolbar pattern** (`AdminUsersClient.tsx:115-160`):
```tsx
<Input type="search" placeholder="..." value={searchValue} onChange={(e) => handleSearchChange(e.currentTarget.value)} aria-label="..." />
<Select id="status-filter" aria-label="Accountstatus" value={params.status ?? ''} onChange={(e) => handleStatusChange(e.currentTarget.value)}>
  <option value="">Alle Status</option>
  {/* ... */}
</Select>
<FormField label="Globale Rolle" htmlFor="role-filter">
  <Select id="role-filter" value={params.global_role ?? ''} onChange={(e) => handleRoleChange(e.currentTarget.value)}>...</Select>
</FormField>
```

**Table + empty/loading/error state pattern** (`AdminUsersClient.tsx:163-209`):
```tsx
{isLoading ? (
  <LoadingState />
) : error ? (
  <ErrorState title="Fehler beim Laden" description={error} />
) : items.length === 0 ? (
  <EmptyState title="Keine Benutzer gefunden" description="..." />
) : (
  <>
    <Table variant="selectable">
      <TableHead><TableRow>
        <TableHeaderCell>...</TableHeaderCell>
        {/* ... */}
      </TableRow></TableHead>
      <TableBody>
        {items.map((item) => <AdminUserTableRow key={item.id} item={item} onClick={...} />)}
      </TableBody>
    </Table>
    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
  </>
)}
```

**Row rendering pattern** (`AdminUsersClient.tsx:216-260`): `TableRow` with `Badge` for status (`getStatusVariant`/`getStatusLabel` mapping functions — mirror this exact mapping-function shape for Discovery's status→`Badge variant` mapping, D-17 status priority "bereits vorhanden > ignoriert > teilweise > offen").

**Anti-pattern warning — `JellyfinCandidateCard.tsx` (do NOT copy):**
This file (138 lines, `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx`) renders poster/title/type/path almost identically to what Discovery needs, but uses native `<button>`/`<img>` with its own CSS module (`JellyfinCandidateCard.module.css`) instead of `@/components/ui`. It predates the D-13 primitives rule. CLAUDE.md's closest-analog clause explicitly forbids copying this pattern for new code, even though it is visually the nearest match. Only its **poster-URL/typ-hint plumbing** (not its markup) may be reused indirectly via existing backend fields (`buildJellyfinIntakeTypeHint`, `buildGroupMediaImageURL`).

---

### `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts` (hook, URL-state)

**Analog: `frontend/src/app/admin/users/useUserListFilters.ts` (full file, 138 lines).**

**URL-sync + debounce pattern** (full function shape, reuse verbatim, adapt param names):
```ts
'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const DEBOUNCE_MS = 300

export function useUserListFilters(limit = DEFAULT_LIMIT) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  // ...
  const [searchValue, setSearchValue] = useState(q)

  useEffect(() => {
    setSearchValue((current) => (current === q ? current : q))
  }, [q])

  const writeParams = useCallback((patch, resetOffset = true) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    // set/delete each param, then:
    const query = nextSearchParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [/* deps */])

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { writeParams({ q: value }) }, DEBOUNCE_MS)
  }, [writeParams])
  // handleStatusChange / handlePageChange follow the same writeParams({...}) shape
}
```

**Key contract for Discovery (D-11):** URL keys become `filter` (status), `q` (search), `cursor` (instead of `offset`) — same mechanism, different key set. `useMemo` on the returned `params` object is load-bearing (comment at `useUserListFilters.ts:112-116`): prevents an infinite `useEffect → load → new object → useEffect` loop in the consuming component.

---

### `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx` (component, event-driven decision UI)

**Analog: `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` (full file, 183 lines) — the existing `conflict` block (lines 155-164) is the code being extracted and extended:**

```tsx
{conflict ? (
  <div className={styles.details}>
    <p className={styles.hint}>
      AniSearch ID {conflict.anisearchID} ist bereits mit{" "}
      <strong>{conflict.existingTitle}</strong> verknüpft.
    </p>
    <Link href={conflict.redirectPath} className={createStyles.secondaryAction}>
      Zum vorhandenen Anime wechseln
    </Link>
  </div>
) : errorMessage ? ( /* ... */ ) : null}
```

**Required extension (D-02/D-20, UI-SPEC Screen 3):** add two more actions before the existing "wechseln" link — "Mit bestehendem Anime verbinden" (only if a Jellyfin candidate is active in the draft, UI-SPEC Design-Entscheidung 8) and "Als neuen Anime anlegen" (always available on conflict, UI-SPEC Design-Entscheidung 9, carries a `Label 12/600` consequence line underneath, `variant="secondary"` not `danger`). Unlike the surrounding, still-native `CreateAniSearchIntakeCard.tsx` markup (native `<input>`/`<button>` elsewhere in the same file, explicitly out of scope per D-12/UI-SPEC Design-Entscheidung 1), the **new** `AniSearchDuplicateDecision.tsx` component itself must use `@/components/ui` `Button`/`Link`-wrapped primitives exclusively — this is a new file, not an edit of existing native markup, so the D-13 exception granted to the rest of `CreateAniSearchIntakeCard.tsx` does not apply to it.

**Second trigger point (D-20):** the identical component renders a second time after a save-time recheck (`CreateAnime`'s new D-20 guard, see backend section above) — no new UI pattern, just one additional context line above the conflict sentence ("Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID gefunden.").

---

### `frontend/src/app/admin/anime/create/page.tsx` / `createPageHelpers.ts` (GEÄNDERT, additiv — D-08/D-09/D-10/D-11)

**Analog: itself.** `useAdminAnimeCreateController.ts` already implements the entire Jellyfin-adopt pipeline (D-08) — Discovery must trigger it via a query param, not reimplement it.

**Existing adopt function to trigger on mount when `?jellyfin_id=` is present** (`useAdminAnimeCreateController.ts:904-941`, full function):
```tsx
async function handleJellyfinCandidateAdopt(candidateID: string) {
  clearMessages();
  clearAniSearchMessage();
  setAniSearchConflict(null);
  jellyfinIntake.reviewCandidate(candidateID);

  try {
    const preview = await jellyfinIntake.loadPreview(candidateID);
    if (!preview) {
      setErrorMessage("Jellyfin-Vorschau konnte nicht geladen werden.");
      return;
    }
    const nextSnapshot = resolveJellyfinPreviewBaseDraft(manualDraftValues, jellyfinDraftSnapshot);
    setJellyfinDraftSnapshot(nextSnapshot);
    setJellyfinPreview(preview);

    const hydrated = hydrateManualDraftFromJellyfinPreview(
      manualDraftValues, preview, aniSearchDraftResult ? { mode: "fill" } : undefined,
    );
    applyManualDraftValues(hydrated.draft);
    setJellyfinAssetSlots(hydrated.assetSlots);
    setHasAdoptedJellyfinPreview(true);
    setShowValidationSummary(false);
    setSuccessMessage(`${preview.jellyfin_series_name} wurde als Jellyfin-Quelle übernommen.`);
  } catch (error) {
    setErrorMessage(formatCreatePageError(error, "Jellyfin-Quelle konnte nicht übernommen werden."));
  }
}
```

**D-09 addition (currently missing — verified NOT auto-populated today):** after a successful adopt, if `createAniSearchSearchQuery` is still empty, call `setCreateAniSearchSearchQuery(preview.jellyfin_series_name)` — plain prefill, never an automatic search/selection.

**Existing redirect helper to extend, NOT replace** (`createPageHelpers.ts:27-29`, full function):
```ts
export function buildManualCreateRedirectPath(id: number): string {
  return `/admin/anime?created=${id}#anime-${id}`;
}
```
New sibling function `buildAssistedCreateRedirectPath(animeID, animeType, returnURL)` returns `/admin/anime/{id}/episodes?return={returnURL}` (series) or `/admin/anime/{id}/edit?return={returnURL}` (film, transitional until Phase 166) — the manual/direct flow keeps calling the unmodified `buildManualCreateRedirectPath` (D-10 non-regression requirement, Test J/K).

**searchParams-on-server-component pattern to mirror for the new Discovery-context-aware Create page** (`frontend/src/app/admin/anime/page.tsx:16-32`, full excerpt):
```tsx
interface AdminAnimePageProps {
  searchParams?: Promise<{ created?: string }>;
}
export default async function AdminAnimePage({ searchParams }: AdminAnimePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const createdID = Number.parseInt(resolvedSearchParams?.created || "", 10);
  // ...
}
```
Discovery's `create/library/page.tsx` and the extended `create/page.tsx` (reading `from`/`jellyfin_id`/`return`) both follow this async-`searchParams`-Promise unwrap convention (Next.js 16 App Router).

---

### `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx` (component, D-18 — list + remove)

**Analog: `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` (full file, 239 lines) — structural vorbild only, explicitly NOT its confirmation dialog.**

**Per-row loading state + remove pattern to copy** (`AnimeContextFansubManager.tsx:56-58, 126-151, 209-235`):
```tsx
const [isMutating, setIsMutating] = useState(false)
const [mutatingGroupID, setMutatingGroupID] = useState<number | null>(null)

const handleDetach = async (group: FansubGroup) => {
  // ...
  setIsMutating(true)
  setMutatingGroupID(group.id)
  try {
    await detachAnimeFansub(animeID, group.id)
    await onChanged()
    onSuccess(`Fansub "${group.name}" wurde vom Anime entfernt.`)
  } catch (error) {
    onError(formatError(error, 'Fansub konnte nicht entfernt werden.'))
  } finally {
    setIsMutating(false)
    setMutatingGroupID(null)
  }
}
// render:
<button className={styles.buttonSecondary} type="button" disabled={disabled || isMutating} onClick={() => { void handleDetach(group) }}>
  {mutatingGroupID === group.id ? 'Entferne...' : 'Vom Anime entfernen'}
</button>
```

**Deliberate deviation (UI-SPEC Design-Entscheidung 15, RESEARCH Pitfall n/a):** `handleDetach` above uses `window.confirm(...)` (`AnimeContextFansubManager.tsx:132-137`) before mutating. The new `AnimeJellyfinFolderList.tsx` must **NOT** carry this over — folder-removal is reversible (re-connectable via the existing D-05 "Verbinden" path), so no confirmation dialog; go straight to the mutating/loading state on click, per UI-SPEC copy ("Wird entfernt…" → success line "Ordner entfernt. Der Eintrag erscheint wieder als „offen" in der Bibliothek."). Also: this new component must use `@/components/ui` `Button` (not the native `<button className={styles.buttonSecondary}>` shown above) — `AnimeContextFansubManager.tsx` itself predates D-13 and is not itself compliant; only its state-machine/interaction shape is the vorbild, not its markup.

---

### `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx` (component, D-14)

**Analog: `AdminUsersClient.tsx`'s `FormField`+`Select` toolbar fields — NOT the native markup of the surrounding `import/page.tsx` file (D-13, Design-Entscheidung 14).**

```tsx
<FormField label="Globale Rolle" htmlFor="role-filter">
  <Select id="role-filter" value={params.global_role ?? ''} onChange={(e) => handleRoleChange(e.currentTarget.value)}>
    <option value="">Alle Rollen</option>
    {/* ... */}
  </Select>
</FormField>
```
Adapt to `<FormField label="Jellyfin-Ordner" hint="Wählen Sie den Ordner, aus dem Episoden importiert werden sollen.">` wrapping a `Select size="sm"` with one `<option>` per connected `jellyfin:` source (main folder from `anime.source`/`folder_name` preselected, fallback to raw Jellyfin ID string if no name/path is resolvable without an extra request, per UI-SPEC Screen 5). Rendered only when the anime has more than one connected Jellyfin folder — otherwise omitted entirely, `import/page.tsx`'s existing native `sourceGrid` fields remain untouched (D-14 explicit: no visible change in the single-folder regular case).

---

## Shared Patterns

### Batch existence/status check ("≤1 DB query per Discovery page", D-07)
**Source:** `backend/internal/handlers/jellyfin_search.go:77-92` (exact call shape) + `backend/internal/repository/admin_content_jellyfin_intake.go` (`FindExistingAnimeByJellyfinIntakeRefs`, full file).
**Apply to:** `jellyfin_discovery.go` handler, plus the new D-17 ignore-batch-lookup — both must be called exactly once per served page, with the IDs/paths of that page only, never per item.
```go
seriesIDs := make([]string, 0, len(items))
paths := make([]string, 0, len(items))
for _, item := range items { /* collect trimmed IDs/paths */ }
existingMatches, err := h.repo.FindExistingAnimeByJellyfinIntakeRefs(c.Request.Context(), seriesIDs, paths)
```

### Cursor pagination codec
**Source:** `backend/internal/repository/release_cursor_pagination.go` (full file).
**Apply to:** `jellyfin_discovery_cursor.go` (new). Reuse `encodeCursorPair`/`decodeCursorPair`/`trimCursorPage`/`clampCursorLimit` verbatim; write a new seek-key comparator against the in-memory/cache snapshot (Pitfall 4) instead of a SQL `WHERE` clause.

### Admin-action audit write
**Source:** `backend/internal/repository/audit_logs.go` (`AuditLogRepository.Write`, full file) + call-site `admin_content_release_version_media_replace.go:445-453`.
**Apply to:** all four D-21 mutating Discovery actions (connect/folder-remove/ignore/unignore). Errors from the audit write are ignored (`_ = h.auditLogRepo.Write(...)`) — never block the primary mutation on an audit failure.

### Poster/image URL construction (zero extra Jellyfin requests)
**Source:** `backend/internal/handlers/group_assets_jellyfin.go:586-595` (`buildGroupMediaImageURL`, per RESEARCH §5e — read via RESEARCH excerpt, pure string construction, no HTTP call):
```go
func buildGroupMediaImageURL(itemID string, kind string, index *int) string {
	values := url.Values{}
	values.Set("provider", "jellyfin")
	values.Set("item_id", itemID)
	values.Set("kind", kind)
	if index != nil {
		values.Set("index", strconv.Itoa(*index))
	}
	return "/api/v1/media/image?" + values.Encode()
}
```
**Apply to:** the Discovery list's Poster column — never a per-row Jellyfin image detail request.

### Provider-source prefix extraction
**Source:** `backend/internal/repository/anime_source_links.go` (`extractAnimeSourceIDByPrefix`) and `backend/internal/handlers/admin_episode_import.go:204-211` (`extractJellyfinSeriesIDFromSourceLinks`/`extractAniSearchIDFromSourceLinks`).
**Apply to:** D-14 fail-closed check, D-18 main-vs-extra-folder distinction, D-05 provider-prefix guard (Pitfall 3) — always reuse this prefix-matching helper family rather than writing new string-prefix logic.

### Global `@/components/ui` primitives rule (CLAUDE.md, D-13) — overrides local-file-consistency
**Source:** `frontend/src/app/admin/users/AdminUsersClient.tsx` + `useUserListFilters.ts` (fully D-13-compliant).
**Apply to:** every NEW file in this phase (`DiscoveryLibraryPanel.tsx`, `DiscoveryEntryCard.tsx`, `DiscoveryReturnLink.tsx`, `AniSearchDuplicateDecision.tsx`, `EpisodeImportFolderSelector.tsx`, `AnimeJellyfinFolderList.tsx`). Do **not** copy the native-markup patterns of `JellyfinCandidateCard.tsx` or `AnimeContextFansubManager.tsx`/`import/page.tsx`, even though those are the visually/structurally closest files — CLAUDE.md is explicit that local-file consistency never overrides this rule. Only `<img>` for the fixed-size poster thumbnail is exempt (not in the button/input/select/textarea ban list, UI-SPEC Design-Entscheidung 13).

## No Analog Found

None — every file in scope has at least a role-match analog (see table above). The one file class with **no existing precedent at all** rather than merely a role-match is:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `backend/internal/handlers/jellyfin_discovery_status.go` (`resolveDiscoveryItemStatus`) | utility (pure function) | transform | No existing pure status-priority resolver exists in the repo; RESEARCH §11 fully specifies its required behavior (priority: bereits vorhanden > ignoriert > teilweise > offen) but there is no code to copy structurally beyond ordinary Go `if`/`switch` style already used throughout the handlers package. Build fresh, keep pure/no I/O so it stays trivially unit-testable. |

D-15 (Mehrstaffel-Zuordnung schema/storage) is explicitly **out of scope for this phase's implementation** per CONTEXT.md — it requires a separate checkpoint-gated plan (RESEARCH §9, Assumption A4) and therefore has no pattern assignment here beyond the "teilweise" badge display already covered above.

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`, `database/migrations/`, `frontend/src/app/admin/anime/`, `frontend/src/app/admin/users/`.
**Files scanned (full or targeted read):** `jellyfin_search.go`, `jellyfin_client_series.go`, `admin_content_jellyfin_intake.go`, `release_cursor_pagination.go`, `anime_source_links.go`, `jellyfin_metadata_resync.go` (excerpted), `admin_content_anime.go`, `admin_episode_import.go` (excerpted), `audit_logs.go`, `admin_content_anisearch.go`, `0129_release_playback_entitlements.up.sql`, `0047_add_anime_source_links.up.sql`, `useUserListFilters.ts`, `AdminUsersClient.tsx` (excerpted), `CreateAniSearchIntakeCard.tsx`, `createPageHelpers.ts`, `AnimeContextFansubManager.tsx`, `AnimeJellyfinMetadataSection.tsx` (excerpted), `admin/anime/page.tsx` (excerpted), `useAdminAnimeCreateController.ts` (excerpted, `handleJellyfinCandidateAdopt`), `JellyfinCandidateCard.tsx` (identified as anti-pattern, not copied).
**Pattern extraction date:** 2026-09-21
