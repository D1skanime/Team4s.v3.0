# Phase 18: Episode Import And Mapping Builder - Research

**Researched:** 2026-04-18
**Domain:** Go/Next.js admin import workflow, Jellyfin media scan, AniSearch HTML-backed canonical episode import, episode/version persistence
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Locked Product Decisions

### Canonical Episode Source
- AniSearch defines the canonical episode list for anime: episode number, title, and future metadata where available.
- Jellyfin/TVDB season grouping must not redefine canonical Team4s episode numbers.
- Example: Jellyfin may expose `Bleach S03E11`, while Team4s/AniSearch should map that file to the continuous canonical Bleach episode number.

### Jellyfin Media Source
- Jellyfin provides files and media identity, not canonical anime episode structure.
- Jellyfin scan candidates should expose season number, episode number, file name/path, media item ID, stream URL, and detected quality where available.
- Existing Jellyfin folder linkage from Anime Create (`folder_name` / Jellyfin series path) should seed the scan context.

### Manual Mapping Is Required
- The mapping builder must let admins override automatic guesses before save.
- It must support one Jellyfin file mapped to multiple canonical episodes, e.g. Naruto episodes 9 and 10 in a single file.
- It must support unmapped files and unmapped canonical episodes without forcing a bad match.
- It should clearly mark suggested, confirmed, conflict, and skipped rows.

### Persistence Semantics
- Applying the mapping creates missing `episodes` from AniSearch data without overwriting existing manual titles/status unless explicitly intended.
- Applying media mappings creates or updates `episode_versions` for Jellyfin media.
- The current model has `episode_versions.anime_id + episode_number + media_provider + media_item_id`. If multi-episode files cannot be represented cleanly, plans must either:
  - introduce a join table such as `episode_version_episodes`, or
  - explicitly document a safe compatibility approach that creates multiple version rows with the same media item ID.
- The preferred long-term model is a join table where one media/version can cover multiple canonical episodes.

### UX Shape
- The UI should feel like the new Anime Create flow: guided, source-aware, and preview-before-apply.
- The page should show:
  - Anime context and folder path.
  - AniSearch episode import preview.
  - Jellyfin file scan preview.
  - Mapping rows where admins can edit the canonical episode target(s).
  - Apply action with clear counts: episodes created, versions linked, skipped, conflicts.
- The first pass should optimize for correctness and operator control over automation.

### Claude's Discretion

## the agent's Discretion

- Exact database migration shape, as long as it supports the locked multi-episode mapping requirement or documents a safe staged compatibility path.
- Whether the first UI lives under `/admin/anime/[id]/episodes` or a dedicated subroute/modal, provided the operator can reach it naturally after Anime Create.
- Exact AniSearch episode crawler implementation details, provided it reuses existing AniSearch request discipline and does not introduce aggressive fan-out.

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

- Full Anime Edit redesign is out of scope.
- Public playback UX redesign is out of scope.
- Non-anime entity episode mapping is out of scope.
- Full automatic season offset learning can be deferred if the first pass exposes manual correction safely.
</user_constraints>

## Summary

Phase 18 should be planned as a guided preview/apply workflow, not as an extension of the existing single-episode Jellyfin sync. AniSearch must produce the canonical episode rows; Jellyfin should only provide local media candidates and file/source metadata. The existing code already has useful pieces: AniSearch request throttling and HTML parsing discipline, Jellyfin episode listing through `/Shows/{seriesId}/Episodes`, folder-path filtering, grouped episode/version reads, and admin episode upsert semantics.

The main design risk is the current persistence split. `episodes.episode_number` is text, while `episode_versions.episode_number` is an integer and represents exactly one canonical episode. The locked Naruto-style requirement, where one Jellyfin media item covers multiple canonical episodes, does not fit cleanly in that model. Plan the first wave around a migration that introduces `episode_version_episodes` and then update grouped reads/apply semantics to derive episode coverage through that join table. A duplicate-version compatibility path is possible, but it preserves the very ambiguity this phase is meant to remove.

**Primary recommendation:** Add an admin-only episode import module with three backend contracts: `GET preview context`, `POST scan/preview`, and `POST apply`; reuse the existing AniSearch/Jellyfin clients, and introduce `episode_version_episodes` as the authoritative multi-episode mapping table.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Brownfield constraint: improve existing Go backend, Next.js frontend, routes, and database evolution model; do not replace the architecture.
- Manual/admin ownership remains authoritative over automatic imports.
- Jellyfin-derived data must pass through an editable preview before persistence.
- V1 is admin-only and can optimize for informed internal operators.
- Admin errors must be visible immediately; admin actions should remain attributable where mutation paths support it.
- Production code files should stay at or below 450 lines; split larger implementations before they become monolithic.
- Prefer documented APIs and avoid undocumented behavior.
- Filesystem/media-host changes must use project-owned controlled automation.
- Build/test commands in `STATUS.md` must remain valid.
- Current workflow priority is anime-first and V2-first; do not reintroduce legacy slot-specific behavior.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | repo `1.25.0`, local `1.26.1` | Backend handlers, services, repositories | Existing backend runtime; keep new import code in current Gin/pgx style. |
| Gin | repo `v1.10.0`, latest checked `v1.12.0` | HTTP routing/handlers | Existing admin routes use Gin directly with explicit dependency wiring. |
| pgx/v5 | repo `v5.7.1`, latest checked `v5.9.1` | PostgreSQL access and transactions | Existing repositories use pgx pool and explicit SQL. |
| Next.js | repo `^16.1.6`, npm latest `16.2.4` published 2026-04-17 | Admin route UI | Existing admin pages are Next App Router client components. |
| React | repo `18.3.1`, npm latest `19.2.5` published 2026-04-17 | Admin UI state | Keep repo's pinned React 18 to avoid an unrelated upgrade. |
| Vitest | repo `^3.2.4`, npm latest `4.1.4` published 2026-04-09 | Frontend unit/component tests | Existing frontend tests use Vitest with `@` path alias. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `golang.org/x/net/html` | repo `v0.25.0`, latest checked `v0.53.0` | AniSearch HTML parsing | Reuse current parser discipline; do not add a scraper framework. |
| `github.com/stretchr/testify` | repo `v1.9.0`, latest checked `v1.11.1` | Go assertions | Use where existing tests already do. |
| `lucide-react` | repo `^0.469.0`, latest checked `1.8.0` | Admin icons | Only for small UI affordances; not central to this phase. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Join table | Duplicate `episode_versions` rows with same `media_item_id` | Faster compatibility path, but one file becomes several version identities and conflicts/default-version ordering stay ambiguous. |
| Existing single sync endpoint | Batch loop over `SyncEpisodeFromJellyfin` | Cannot represent manual multi-target mappings and imports Jellyfin numbering as canonical. |
| New scraping dependency | Colly/goquery | Not needed; current AniSearch code already uses throttled `net/http` and `x/net/html`. |
| External anime API | AniList/MAL/AniDB | Contradicts locked decision that AniSearch defines canonical anime episodes for this phase. |

**Installation:**

No new runtime packages should be planned for the first pass. Add SQL migrations, Go files, TypeScript types, and tests inside the existing stack.

**Version verification:** Package versions were checked on 2026-04-18 with `npm view` and `go list -m -u`. Use repo-pinned versions unless a separate upgrade phase is created.

## Architecture Patterns

### Recommended Project Structure

```text
backend/internal/models/
  episode_import.go                 # preview/apply DTOs
backend/internal/handlers/
  admin_episode_import.go           # route handlers
  admin_episode_import_validation.go # request normalization
backend/internal/services/
  anisearch_episode_import.go       # throttled AniSearch episode-list fetch/parse
backend/internal/repository/
  episode_import_repository.go      # transactional apply + join-table writes
database/migrations/
  0043_episode_version_episodes.*.sql
frontend/src/types/
  episodeImport.ts
frontend/src/lib/api.ts
  episode import helpers
frontend/src/app/admin/anime/[id]/episodes/import/
  page.tsx
  page.module.css
  useEpisodeImportBuilder.ts
```

### Pattern 1: Preview Then Apply

**What:** Build one read/preview endpoint that returns anime context, AniSearch canonical candidates, Jellyfin file candidates, suggested mappings, and conflicts; apply only accepts the operator-edited mapping payload.

**When to use:** This is mandatory for Phase 18 because manual correction is part of the product requirement.

**Example:**

```go
type EpisodeImportPreview struct {
    AnimeID           int64
    AniSearchID       string
    JellyfinSeriesID  string
    CanonicalEpisodes []CanonicalEpisodeCandidate
    MediaFiles        []EpisodeMediaCandidate
    Mappings          []EpisodeMappingRow
}

type EpisodeMappingRow struct {
    MediaItemID             string
    TargetEpisodeNumbers    []int32
    SuggestedEpisodeNumbers []int32
    Status                  string // suggested, confirmed, conflict, skipped
}
```

### Pattern 2: Transactional Apply

**What:** Apply should run in one DB transaction: lock/load anime, upsert missing canonical `episodes`, upsert or create Jellyfin `episode_versions`, then write `episode_version_episodes` coverage rows.

**When to use:** Any operator-clicked apply action that creates episodes and media links together.

**Example:**

```go
tx, err := r.db.Begin(ctx)
if err != nil { return result, err }
defer tx.Rollback(ctx)

// 1. upsert episodes by anime_id + canonical number text, fill title only when empty
// 2. upsert one episode_version per media source identity
// 3. replace that version's join rows with the confirmed canonical targets

return result, tx.Commit(ctx)
```

### Pattern 3: Source-Aware Candidate Rows

**What:** Keep canonical episode candidates and media file candidates as separate DTOs; mappings reference both by stable keys.

**When to use:** This prevents Jellyfin `S03E11` from being mistaken for Team4s episode 11.

**Example:**

```typescript
export interface EpisodeMappingRow {
  media_item_id: string
  file_name: string
  jellyfin_season_number?: number | null
  jellyfin_episode_number?: number | null
  target_episode_numbers: number[]
  suggested_episode_numbers: number[]
  status: 'suggested' | 'confirmed' | 'conflict' | 'skipped'
}
```

### Anti-Patterns to Avoid

- **Treating Jellyfin `IndexNumber` as canonical:** It is a media/source signal only.
- **Auto-saving after scan:** The current product direction requires operator preview and correction before persistence.
- **Hiding unmatched rows:** Unmapped Jellyfin files and unmapped canonical episodes must stay visible.
- **One giant page/controller:** Existing project constraints cap production files near 450 lines; split hook, row helpers, and UI sections.
- **Importing public playback redesign:** Keep grouped-read compatibility narrow; public UX redesign is explicitly deferred.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Jellyfin media discovery | Directory walking on the media host | Existing Jellyfin API client and `listJellyfinEpisodes` | Jellyfin already knows IDs, paths, seasons, episodes, streams, and media metadata. |
| AniSearch request scheduling | Ad hoc sleeps per handler | Existing `AniSearchRateLimiter` | Requirement ENR-02 already established one request at a time and two seconds between requests. |
| HTML parsing | Regex-only page scraping | Existing `x/net/html` parser style | Current client already handles LD+JSON, visible text, relations graph parsing, and tests. |
| Multi-episode media identity | Multiple indistinguishable version rows | `episode_version_episodes` join table | A single media item can cover N canonical episodes; a join table models that directly. |
| UI data fetching | Raw `fetch` in route components | `frontend/src/lib/api.ts` helpers | Existing convention centralizes API errors and auth headers. |

**Key insight:** The hard part is not scanning files; it is preserving two truths without collapsing them. Canonical episodes and local media files need separate identities joined by explicit operator-approved mappings.

## Common Pitfalls

### Pitfall 1: Current Unique Constraint Blocks Compatibility Rows

**What goes wrong:** `episode_versions` has a uniqueness constraint on `(anime_id, episode_number, fansub_group_id, video_quality, subtitle_type)`, not on Jellyfin media identity. Creating duplicate rows for one media file can collide or produce multiple default version identities.

**Why it happens:** The model assumes one version belongs to one episode number.

**How to avoid:** Add `episode_version_episodes` and treat `episode_versions.episode_number` as a transitional primary/display episode until reads are updated.

**Warning signs:** Same `media_item_id` appears in several rows, default-version links differ between covered episodes, or deleting one "version" leaves stale siblings.

### Pitfall 2: Existing Reads Only Join by Numeric Episode Number

**What goes wrong:** `ListGroupedByAnimeID` currently groups versions by `episode_versions.episode_number` and loads titles by parsing `episodes.episode_number` as numeric.

**Why it happens:** Grouped episodes predate a multi-episode coverage model.

**How to avoid:** Plan a read update that expands versions through `episode_version_episodes`; keep fallback to legacy `episode_versions.episode_number` for old rows.

**Warning signs:** Naruto 9+10 imports show media only under one episode, or unmapped canonical episodes disappear from grouped reads.

### Pitfall 3: AniSearch Episode List May Not Be Covered by Existing Parser

**What goes wrong:** Existing `AniSearchClient.FetchAnime` extracts episode count but not per-episode titles.

**Why it happens:** Prior phases only needed anime metadata and relations.

**How to avoid:** Add a small `FetchAnimeEpisodes(ctx, id)` method with fixture-driven parser tests. Keep LOW confidence until exact AniSearch episode HTML is verified against real pages.

**Warning signs:** Parser returns only count, loses titles, or follows many per-episode detail pages.

### Pitfall 4: Jellyfin Multi-Episode Files Are Not Enough

**What goes wrong:** Jellyfin official docs allow multi-episode file naming like `S01E01-E02`, but Jellyfin still displays a single entry with combined metadata and recommends splitting files for best results.

**Why it happens:** Jellyfin is file/media centric and metadata-provider centric; Team4s needs canonical anime episode coverage.

**How to avoid:** Scan Jellyfin as candidates only and let the Team4s mapping builder own many-target coverage.

**Warning signs:** Planner assumes Jellyfin will produce one API item per covered canonical episode.

### Pitfall 5: Folder Path Mismatch

**What goes wrong:** `folder_name` and Jellyfin series path are useful seeds, but exact OS paths can differ between Jellyfin host and backend container.

**Why it happens:** Current folder scan calls `os.Stat(itemPath)` opportunistically; it only works if backend can see the same path.

**How to avoid:** Treat file size/mtime as optional and keep scan usable from Jellyfin API data alone.

**Warning signs:** Preview fails only because `os.Stat` cannot read the media path.

## Code Examples

Verified local patterns from the current codebase:

### Jellyfin Episode Scan Candidate

```go
values := url.Values{}
values.Set("Fields", "MediaStreams,Path")
values.Set("EnableUserData", "false")

var payload jellyfinEpisodeListResponse
_, err := h.fetchJellyfinJSON(ctx, fmt.Sprintf("/Shows/%s/Episodes", url.PathEscape(seriesID)), values, &payload)
```

### Safe Episode Fill Semantics

```sql
UPDATE episodes
SET
    title = COALESCE(title, $1),
    updated_at = NOW()
WHERE id = $2
RETURNING id, anime_id, episode_number, title, status, stream_links[1]
```

### Proposed Join Table Shape

```sql
CREATE TABLE IF NOT EXISTS episode_version_episodes (
    episode_version_id BIGINT NOT NULL REFERENCES episode_versions(id) ON DELETE CASCADE,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    coverage_order SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (episode_version_id, episode_id),
    CONSTRAINT chk_episode_version_episodes_order CHECK (coverage_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_episode_version_episodes_episode
    ON episode_version_episodes (episode_id, coverage_order, episode_version_id);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jellyfin/TVDB episode order defines import | AniSearch canonical list + Jellyfin file candidates | Phase 18 locked decision, 2026-04-18 | Planner must separate canonical and media models. |
| Single-episode Jellyfin sync | Batch mapping preview/apply | Phase 18 | Existing sync can be reused for helper logic, not product flow. |
| One version maps to one episode number | One media/version may cover many canonical episodes via join table | Phase 18 recommended | Requires migration and grouped read updates. |
| AniSearch anime metadata only | AniSearch episode list import | Phase 18 | New parser method and fixtures needed. |

**Deprecated/outdated:**

- Treating `/admin/anime/[id]/episodes` as mainly a "new episode" form is outdated for this phase.
- Using Jellyfin season offsets as hidden automation is insufficient; first pass needs visible/manual correction.

## Open Questions

1. **Exact AniSearch episode-list URL/HTML shape**
   - What we know: Existing AniSearch client fetches anime pages and relations; HTTP access to `https://www.anisearch.de/anime` returned 200 on 2026-04-18.
   - What's unclear: Exact per-episode list markup was not verified in local code, and public search did not surface official AniSearch API docs.
   - Recommendation: First plan should include parser fixture capture and tests before UI work.

2. **How far to update public/grouped reads in Phase 18**
   - What we know: Grouped admin reads currently use `episode_versions.episode_number`.
   - What's unclear: Whether public playback must understand multi-episode versions immediately.
   - Recommendation: Update admin grouped reads enough for the mapping builder and existing episode overview; keep public playback redesign out of scope.

3. **Primary episode number on `episode_versions` after join table**
   - What we know: Existing code requires `episode_versions.episode_number INTEGER NOT NULL`.
   - What's unclear: Whether to make it nullable in this phase.
   - Recommendation: Keep it as the lowest covered canonical episode for compatibility, and document `episode_version_episodes` as authoritative coverage.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Go | Backend handlers/repositories/tests | Yes | 1.26.1 local, repo go.mod 1.25.0 | Docker backend image |
| Node.js | Frontend tests/build | Yes | 24.14.0 | Docker frontend image |
| npm | Frontend package scripts/version checks | Yes | 11.9.0 | Docker frontend image |
| Docker | Integrated local runtime | Yes | 29.2.1 | Local Go/npm targeted tests |
| Jellyfin env config | Scan media candidates | Yes, keys present in `.env` | Values redacted | Preview should return configured/unavailable errors |
| AniSearch internet access | Canonical import | Yes | HEAD `/anime` returned 200 | Parser fixtures; operator retry |

**Missing dependencies with no fallback:**
- None found during research.

**Missing dependencies with fallback:**
- Live Jellyfin API reachability was not probed to avoid exposing local credentials; handlers already classify upstream/config errors.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go test with `testing`, Gin test routers, pgx repository tests |
| Frontend framework | Vitest 3.x in repo, latest checked 4.1.4 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd backend; go test ./internal/handlers ./internal/services ./internal/repository` |
| Full suite command | `cd backend; go test ./...` and `cd frontend; npm test -- --run` |

### Phase Requirements To Test Map

No formal requirement IDs are mapped yet. Use roadmap success criteria as temporary planning requirements.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| P18-SC1 | AniSearch canonical episodes are imported without Jellyfin redefining numbers | service/unit | `go test ./internal/services -run AniSearchEpisode` | No, Wave 0 |
| P18-SC2 | Jellyfin scan returns file candidates with season/episode/path/media fields | handler/unit | `go test ./internal/handlers -run EpisodeImportScan` | No, Wave 0 |
| P18-SC3 | Suggestions can use offsets but stay editable | frontend unit | `cd frontend; npm test -- episodeImport` | No, Wave 0 |
| P18-SC4 | One media file can map to multiple canonical episodes | repository/integration-style unit | `go test ./internal/repository -run EpisodeImportApply` | No, Wave 0 |
| P18-SC5 | Apply creates missing episodes and links versions without overwriting manual data | repository/handler | `go test ./internal/repository ./internal/handlers -run EpisodeImport` | No, Wave 0 |

### Sampling Rate

- **Per task commit:** targeted Go or Vitest command for touched layer.
- **Per wave merge:** `cd backend; go test ./internal/handlers ./internal/services ./internal/repository` and `cd frontend; npm test -- --run`.
- **Phase gate:** backend full suite plus frontend tests/build before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `backend/internal/services/anisearch_episode_import_test.go` - parser fixtures for canonical episode list.
- [ ] `backend/internal/repository/episode_import_repository_test.go` - transactional apply and multi-episode join semantics.
- [ ] `backend/internal/handlers/admin_episode_import_test.go` - preview/apply request validation and errors.
- [ ] `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - suggestion/status reducers.
- [ ] `frontend/src/lib/api.episode-import.test.ts` - typed API helper error parsing if helpers become nontrivial.

## Sources

### Primary (HIGH confidence)

- Local code: `backend/internal/models/episode.go`, `backend/internal/models/episode_version.go`, `backend/internal/repository/admin_content_episode.go`, `backend/internal/repository/episode_version_repository.go`.
- Local code: `backend/internal/handlers/jellyfin_client.go`, `jellyfin_episode_sync.go`, `admin_content_episode_version_editor_scan.go`.
- Local migrations: `database/migrations/0002_init_episodes.up.sql`, `0012_episode_versions.up.sql`, `0032_add_episode_titles_table.up.sql`, `0033_extend_episodes_table.up.sql`.
- Local frontend: `frontend/src/app/admin/anime/[id]/episodes/page.tsx`, `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx`, `frontend/src/lib/api.ts`.
- Jellyfin official docs - TV show naming, multi-episode files, and specials: https://jellyfin.org/docs/general/server/media/shows/
- Jellyfin official docs - metadata provider identifiers and supported providers: https://jellyfin.org/docs/general/server/metadata/identifiers/

### Secondary (MEDIUM confidence)

- Jellyfin generated TypeScript SDK docs - Items API fields and `includeItemTypes`/`fields` concepts: https://typescript-sdk.jellyfin.org/functions/generated-client.ItemsApiFp.html
- Jellyfin generated TypeScript SDK docs - `ItemFields` includes `Path` and `MediaStreams`: https://typescript-sdk.jellyfin.org/enums/generated-client.ItemFields.html
- npm registry checks on 2026-04-18 for `next`, `react`, `vitest`, `lucide-react`, `typescript`, `eslint`.
- `go list -m -u` checks on 2026-04-18 for Gin, pgx, testify, `x/net`.

### Tertiary (LOW confidence)

- Web search did not find official AniSearch API documentation for per-episode lists. Treat AniSearch episode import as HTML fixture-driven until verified against real pages.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from repo files and registry/module checks.
- Architecture: MEDIUM-HIGH - grounded in current handlers/repositories; join table read migration needs careful implementation.
- AniSearch episode parser: LOW-MEDIUM - existing AniSearch parser is strong, but per-episode page shape is unverified.
- Jellyfin scan: HIGH - current code already lists episodes and official docs confirm file/season conventions and multi-episode naming caveats.
- Pitfalls: HIGH - based on schema, repository code, and official Jellyfin behavior.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 for local architecture; re-check AniSearch HTML and Jellyfin docs immediately before implementation.
