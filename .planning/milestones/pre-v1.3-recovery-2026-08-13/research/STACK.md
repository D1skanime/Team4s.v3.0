# Technology Stack

**Project:** Team4s admin anime intake enhancement
**Researched:** 2026-03-24

## Recommendation

Keep the current stack: Go + Gin + pgx on the backend, Next.js admin UI on the frontend, Postgres as the system of record, Redis only for short-lived preview state, and OpenAPI YAML as the contract source. This workflow does not need a new queue, CMS, or event-sourcing layer. It needs a stricter import boundary, explicit field provenance, and durable admin audit rows.

The standard pattern for this domain is:

1. Fetch upstream metadata into a preview payload.
2. Let the admin review and edit before persistence.
3. Persist effective anime data in the existing `anime` tables.
4. Persist source linkage, field provenance, asset provenance, and audit records separately.
5. Re-sync only fields/assets still marked as upstream-managed.

That pattern fits the current Team4s brownfield better than a draft-heavy workflow or a full external-source mirror.

## Recommended Stack

### Core Application
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Go | 1.25.x | Admin import and relation API | Already in production; strong fit for transactional import logic and explicit validation. |
| Gin | current repo version | HTTP routing/handlers | Existing handler pattern already covers admin and Jellyfin flows; keep the same request/response conventions. |
| pgx/v5 + Postgres 16 | current repo versions | Durable anime, provenance, relation, and audit storage | Postgres is the right place for authoritative admin state and transactional writes. |
| Next.js App Router + React | current repo versions | Admin workflow UI | Existing admin studio patterns already support preview, patch, and side-panel editing. |
| Redis 7 | current stack | Optional preview token cache and short-lived upstream diagnostics | Useful for ephemeral preview state; not appropriate as the source of truth for provenance. |
| OpenAPI YAML in `shared/contracts/` | existing | Contract-first admin API changes | Matches current repo structure and reduces drift between frontend and backend. |

### Domain Storage Pattern
| Pattern | Recommendation | Why |
|---------|----------------|-----|
| Effective anime record | Keep writing canonical values to `anime` and related normalized tables | Reads stay simple; public site should not need to understand provenance internals. |
| Source linkage | Add a dedicated `anime_import_sources` table | One row per linked upstream source keeps Jellyfin identity/path/history out of overloaded legacy columns like `source`. |
| Field provenance | Add one `anime_import_field_state` table or a narrow JSONB-backed equivalent | Field-level override logic is the core requirement; it should not be inferred from "non-empty" alone. |
| Asset provenance | Add an `anime_asset_sources` table per asset slot | Covers source visibility, replacement history, and later upload expansion without polluting the anime row. |
| Audit | Add an append-only `admin_audit_log` table | Admin intake, relation edits, and asset replacement need durable traceability by actor and request. |

## Recommended Data Shapes

### `anime_import_sources`

Use one durable row per anime-to-upstream link.

Recommended columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `bigserial` | Internal key |
| `anime_id` | `bigint` FK | Linked anime |
| `provider` | `text` | `jellyfin` for V1, keeps room for later sources |
| `external_id` | `text` | Jellyfin series/item ID |
| `external_path` | `text` | Visible operator path used for selection/debugging |
| `provider_ids` | `jsonb` | AniDB/TMDB/etc. IDs returned by Jellyfin |
| `last_payload` | `jsonb` | Last normalized source snapshot used for preview/sync |
| `payload_hash` | `text` | Cheap change detection |
| `last_previewed_at/by` | `timestamptz`, `bigint` | Operator visibility |
| `last_synced_at/by` | `timestamptz`, `bigint` | Operator visibility |
| `sync_status` | `text` | `ok`, `partial`, `failed` |

Recommendation: keep a single active Jellyfin link per anime in V1, but do not hardcode the schema so tightly that future multi-source support becomes impossible.

### `anime_import_field_state`

Use field-level rows, not one wide pile of nullable columns.

Recommended columns:

| Column | Type | Purpose |
|--------|------|---------|
| `anime_id` | `bigint` FK | Anime |
| `field_name` | `text` | `title`, `description`, `year`, `anidb_id`, `genres`, etc. |
| `effective_source` | `text` | `manual` or `jellyfin` |
| `source_record_id` | `bigint` FK | Points to `anime_import_sources.id` |
| `last_imported_value` | `jsonb` | What Jellyfin most recently proposed |
| `effective_value_snapshot` | `jsonb` | Value after override rules |
| `is_overridden` | `boolean` | Explicit manual authority bit |
| `updated_at/by` | `timestamptz`, `bigint` | Who last changed the rule/value |

This is the cleanest way to implement the required semantics:

- Preview shows imported values and whether they will become authoritative.
- Create/save can mark individual fields as `manual` immediately.
- Re-sync updates only rows where `effective_source = 'jellyfin'` and `is_overridden = false`.
- UI can show "Imported from Jellyfin", "Manual override", and "Upstream changed since last sync" without guessing.

For a narrower V1, `field_name` can be limited to the fields in scope: titles, description, year, AniDB ID, genres/tags, and media slots.

### `anime_asset_sources`

Treat each asset slot independently: `cover`, `logo`, `banner`, `background`, `background_video`.

Recommended columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `bigserial` | Internal key |
| `anime_id` | `bigint` FK | Anime |
| `slot` | `text` | Asset slot |
| `current_asset_path` | `text` | Effective Team4s-served asset |
| `source_type` | `text` | `jellyfin`, `upload`, `manual_url`, `none` |
| `source_record_id` | `bigint` FK | Upstream source row when applicable |
| `source_ref` | `jsonb` | Jellyfin item/image type/tag or upload metadata |
| `imported_at/by` | `timestamptz`, `bigint` | Provenance |
| `replaced_at/by` | `timestamptz`, `bigint` | Replacement visibility |
| `is_active` | `boolean` | Current vs superseded record |

Pattern: never overwrite provenance in place. When an admin replaces a Jellyfin asset with an upload, mark the old provenance row inactive and create a new active row. The effective anime/media field points only to the active asset.

## API Shape

The existing repo already uses explicit admin endpoints. Extend that style instead of inventing a job-based import API.

### Preview / Create / Resync
| Operation | Recommendation | Why |
|----------|----------------|-----|
| Jellyfin search | `GET /api/v1/admin/jellyfin/series?q=&limit=` | Matches current handler split and uses Jellyfin path/ID for operator confirmation. |
| Intake preview | `POST /api/v1/admin/anime/intake/preview/jellyfin` | New-anime preview should not require a pre-existing anime ID. |
| Existing-anime preview | `POST /api/v1/admin/anime/:id/jellyfin/preview` | Keep for edit/resync UX on existing anime. |
| Create from reviewed preview | `POST /api/v1/admin/anime` with `source_link`, `field_decisions`, and selected assets | Keeps create atomic: anime row, provenance rows, assets, and audit record in one transaction. |
| Re-sync | `POST /api/v1/admin/anime/:id/jellyfin/resync` | Prefer `resync` naming over a generic `sync` once preview/create flow is added; behavior is clearer. |
| Relation list/create | `GET/POST /api/v1/admin/anime/:id/relations` | Standard nested admin CRUD shape. |
| Relation update/delete | `PATCH/DELETE /api/v1/admin/anime/:id/relations/:relationId` | Supports label correction without re-creating the entire graph. |

### Request/response contract pattern

For preview:

```json
{
  "source": {
    "provider": "jellyfin",
    "external_id": "2dd78be87c3740a781eb479cca260361",
    "external_path": "/anime/Frieren"
  },
  "prefill": {
    "title": "Sousou no Frieren",
    "description": "...",
    "year": 2023,
    "provider_ids": { "AniDB": "18597" }
  },
  "field_state": {
    "title": { "effective_source": "jellyfin", "is_overridden": false },
    "description": { "effective_source": "jellyfin", "is_overridden": false }
  },
  "assets": {
    "cover": { "source_type": "jellyfin", "label": "Primary image" },
    "logo": { "source_type": "jellyfin", "label": "Logo image" }
  },
  "warnings": [
    { "code": "missing_cover", "message": "No primary image returned by Jellyfin." }
  ]
}
```

For create/resync, send the admin's decisions explicitly:

```json
{
  "anime": {
    "title": "Sousou no Frieren",
    "description": "Edited text",
    "year": 2023
  },
  "source_link": {
    "provider": "jellyfin",
    "external_id": "2dd78be87c3740a781eb479cca260361",
    "external_path": "/anime/Frieren"
  },
  "field_decisions": {
    "title": { "effective_source": "manual", "is_overridden": true },
    "description": { "effective_source": "manual", "is_overridden": true },
    "year": { "effective_source": "jellyfin", "is_overridden": false }
  },
  "asset_decisions": {
    "cover": { "action": "accept_import" },
    "logo": { "action": "reject_import" }
  }
}
```

Recommendation: do not rely on the server inferring manual authority from non-empty values alone. Persist the decision explicitly.

## Relation Management Pattern

Use the existing normalized relation model in Postgres and add admin CRUD over it. Do not fold relation state into a JSON column on `anime`.

Recommended V1 pattern:

- Keep `relation_types` as the canonical lookup.
- Store one directional row in `anime_relations`.
- Normalize direction at write time so duplicates cannot be inserted accidentally.
- Expose only the four approved labels in the admin UI: `full-story`, `side-story`, `sequel`, `summary`.
- If UI needs reciprocal wording later, derive it in presentation, not storage.

Tradeoff: a richer graph model could support reciprocal semantics like `prequel`, but V1 should stay aligned with the approved narrow label set and existing schema.

## Provenance and Override Rules

Recommended decision rules:

| Case | Effective behavior |
|------|--------------------|
| New Jellyfin preview | All imported fields start as `effective_source = jellyfin` unless the admin edits them before save. |
| Admin edits an imported field before save | Persist as `manual` + `is_overridden = true`. |
| Admin edits a Jellyfin-backed field later | Flip that field to manual; do not silently keep it auto-managed. |
| Re-sync sees upstream change on non-overridden field | Update field and provenance snapshot. |
| Re-sync sees upstream change on overridden field | Keep current value, update only `last_imported_value`, and surface drift in UI. |
| Admin clears a manual field and chooses "use Jellyfin again" | Flip the field back to `jellyfin` and apply the latest imported value. |

This is the common and maintainable pattern for admin-controlled imports: effective value and source-tracking are separate concerns.

## Asset Source Visibility and Replacement Flow

Recommended UI/backend pattern:

1. Preview/import shows each slot with source badge and raw source reference.
2. Save creates an active asset provenance row per accepted asset.
3. Edit page shows current asset, source badge, imported timestamp, and replacement action.
4. Replace action uploads or selects a new asset, then writes a new active asset source row.
5. Previous Jellyfin asset provenance remains visible in history but no longer drives the live asset.

Do not delete the old source row on replacement. Operators need to know what was imported and later replaced.

## Operational Logging and Audit Boundaries

Separate three concerns:

| Concern | Store | Why |
|--------|-------|-----|
| Durable admin audit | `admin_audit_log` in Postgres | Required for traceability of create/update/resync/relation changes and asset replacement. |
| Request diagnostics | Structured app logs with request ID | Better for upstream HTTP failures, validation debugging, and Jellyfin outage details. |
| Short-lived operator feedback | API response + optional Redis TTL cache | Useful for previews and transient sync diagnostics; not a compliance record. |

Recommended `admin_audit_log` shape:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `bigserial` | Internal key |
| `actor_user_id` | `bigint` | Acting admin |
| `action` | `text` | `anime.create`, `anime.resync`, `anime.relation.create`, `anime.asset.replace` |
| `subject_type` | `text` | `anime`, `anime_relation`, `anime_asset` |
| `subject_id` | `text` | Flexible identifier |
| `request_id` | `text` | Correlates DB audit to app logs |
| `before_state` | `jsonb` | Sparse before snapshot |
| `after_state` | `jsonb` | Sparse after snapshot |
| `source_context` | `jsonb` | Jellyfin ID/path/provider IDs if relevant |
| `outcome` | `text` | `success` or `rejected` |
| `created_at` | `timestamptz` | Timestamp |

Recommendation: audit successful state changes durably; keep raw upstream failures in application logs unless product requirements later demand a durable error ledger.

## Alternatives Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Preview state | Stateless/Redis-backed preview + final transactional create | Persist full draft records in Postgres immediately | Adds cleanup complexity and draft lifecycle work before the core import semantics are stable. |
| Provenance tracking | Dedicated source/provenance tables | Overload legacy `anime.source` and media filename fields | Too little structure for field-level overrides, asset replacement history, and resync drift handling. |
| Override model | Explicit per-field decisions | "Non-empty fields are manual" heuristic | Works for V1 demos but breaks as soon as admins want to revert a field back to Jellyfin control. |
| Audit | Append-only Postgres audit table + structured logs | Logs only | Logs alone are weak for operator-facing history and hard to query reliably later. |
| Relation storage | Normalized `anime_relations` CRUD | JSON array on `anime` | Loses integrity, dedupe protection, and lookup-table compatibility. |

## Brownfield Sequencing

Recommended implementation order:

1. Add source/provenance/audit tables and OpenAPI contract changes.
2. Add new Jellyfin intake preview endpoint for create flow.
3. Extend anime create/update to accept explicit `field_decisions` and `asset_decisions`.
4. Add resync endpoint behavior that respects provenance state.
5. Add relation CRUD over the existing normalized relation schema.
6. Add edit-page source badges, drift indicators, and replacement/history UI.

This order minimizes rewrite risk: provenance has to exist before resync and replacement semantics become safe.

## Confidence

| Area | Level | Notes |
|------|-------|-------|
| Jellyfin source capabilities | HIGH | Current Jellyfin SDK/docs expose `Path`, `ProviderIds`, image metadata, and metadata provider behavior. |
| Brownfield fit for Go/Next/Postgres | HIGH | Derived from the local codebase and existing handler/repository/admin patterns. |
| Provenance/audit table pattern | MEDIUM | Strong industry fit and practical for this repo, but the exact schema is a design recommendation rather than an external product standard. |
| Relation CRUD recommendation | HIGH | Matches existing Team4s normalized relation schema and the phase's narrow approved relation set. |

## Sources

- Team4s planning context: `.planning/PROJECT.md`
- Team4s current stack: `.planning/codebase/STACK.md`
- Team4s current architecture: `.planning/codebase/ARCHITECTURE.md`
- Current admin contract: `shared/contracts/admin-content.yaml`
- Current Jellyfin-backed admin handlers: `backend/internal/handlers/jellyfin_search.go`, `backend/internal/handlers/jellyfin_preview.go`
- Current relation schema: `database/migrations/0020_add_metadata_reference_tables.up.sql`
- Current normalized relation table: `database/migrations/0021_add_normalized_metadata_tables.up.sql`
- Jellyfin metadata overview: https://jellyfin.org/docs/general/server/metadata/
- Jellyfin SDK `BaseItemDto` (`Path`, `ProviderIds`, image tags, year, overview): https://typescript-sdk.jellyfin.org/interfaces/generated-client.BaseItemDto.html
- Jellyfin SDK item query request surface: https://typescript-sdk.jellyfin.org/interfaces/generated-client.ItemsApiGetItemsRequest.html
