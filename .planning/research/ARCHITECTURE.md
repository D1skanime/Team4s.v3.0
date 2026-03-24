# Architecture Patterns

**Domain:** Admin anime intake, Jellyfin preview/resync, provenance-aware anime assets, and anime relation CRUD
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM-HIGH

## Recommended Architecture

Keep the current Team4s shape: Gin handlers -> orchestration services -> repositories -> Postgres, with the Next.js admin app consuming explicit admin-only endpoints. Do not bolt preview-before-create onto the existing `CreateAnime` handler directly. The current brownfield code already has good seams for admin anime edit, Jellyfin series search, Jellyfin preview, and Jellyfin sync for an existing anime; the missing piece is an intake orchestration layer that can produce a draft view before persistence, then commit that draft safely.

The core recommendation is to split the domain into four write-side components:

1. `AnimeIntakeService`
   Owns create-time orchestration for both manual and Jellyfin-assisted flows.
2. `AnimeAssetService`
   Owns canonical anime asset slots, provenance, replacement, and removal.
3. `AnimeResyncService`
   Owns post-create Jellyfin refresh rules and safe fill-only updates.
4. `AnimeRelationService`
   Owns relation CRUD with canonical direction rules and validation.

These should sit behind thin admin handlers under `backend/internal/handlers/` and use focused repositories instead of growing `AdminContentRepository` into a monolith. Existing Jellyfin client/helper code can be reused, but preview/create/resync should become separate service-level use cases rather than being mixed into edit handlers.

### Target Component Layout

#### Backend

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AdminAnimeIntakeHandler` | HTTP contracts for preview create, final create, and cancel/reset | `AnimeIntakeService`, auth middleware |
| `AdminAnimeResyncHandler` | HTTP contracts for Jellyfin resync and resync preview | `AnimeResyncService`, auth middleware |
| `AdminAnimeAssetsHandler` | Asset replace/remove endpoints and provenance responses | `AnimeAssetService`, auth middleware |
| `AdminAnimeRelationsHandler` | List/create/update/delete relation endpoints | `AnimeRelationService`, auth middleware |
| `AnimeIntakeService` | Build preview drafts from manual input or Jellyfin selection, normalize fields, validate required fields, coordinate final save | Jellyfin client, intake repo, anime repo, asset service, audit service |
| `AnimeResyncService` | Compare stored anime against Jellyfin snapshot, generate diff, apply fill-only updates, guard destructive actions | Jellyfin client, anime repo, asset service, episode/version repos, audit service |
| `AnimeAssetService` | Store slot-based asset selections and provenance, materialize manual uploads or Jellyfin-linked assets, maintain compatibility cover projection | media repo/service, anime asset repo |
| `AnimeRelationService` | Canonicalize direction, validate allowed V1 types, prevent self/duplicate/conflicting relations | relation repo, anime repo, audit service |
| `AdminAuditService` | Durable admin action logging with actor, entity, action, before/after summary | audit repo |
| `JellyfinMetadataClient` | Search series, fetch series metadata, enumerate images/media candidates, enumerate episodes for preview/resync | Jellyfin HTTP API |

#### Frontend

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AdminAnimeIntakeShell` | Route-level mode switch: manual or Jellyfin | intake hooks |
| `ManualIntakeForm` | Local editable draft for manual create | intake hook |
| `JellyfinSearchStep` | Search/select Jellyfin series with ID and path visible | Jellyfin search endpoint |
| `JellyfinIntakePreviewStep` | Shows draft metadata, asset candidates, validation, and differences before save | intake preview endpoint |
| `AnimeDraftEditor` | Single edit form reused by manual and Jellyfin preview flows | local draft state |
| `AnimeAssetPanel` | Slot-based asset cards with provenance badges and replace/remove actions | asset endpoints |
| `JellyfinResyncPanel` | Preview diff and confirm safe resync after create | resync preview/apply endpoints |
| `AnimeRelationsPanel` | Relation list + create/edit/delete flow with limited V1 types | relation endpoints |
| `AdminAuditInlineFeedback` | Shows request outcome and concise operator-safe errors | all admin mutations |

### Data Model Additions

Use explicit persistence for provenance and audit. Do not keep asset provenance only in JSON blobs or inferred from `anime.source`.

Recommended new tables:

| Table | Purpose |
|-------|---------|
| `admin_audit_log` | Durable audit log for intake, resync, asset changes, and relation CRUD |
| `anime_external_refs` | Provider linkage per anime, starting with Jellyfin series identity and path snapshot |
| `anime_asset_slots` | Canonical asset selection per anime and slot (`cover`, `poster`, `logo`, `banner`, `background`, `background_video`) |
| `anime_asset_provenance` | Provenance record per slot assignment or candidate materialization |

Recommended table behavior:

- `anime_external_refs`
  - one row per `(anime_id, provider, external_id)`
  - store provider path, display name, last previewed at, last synced at
  - replaces overloading `anime.source` as the only linkage field; keep `anime.source` as a compatibility projection in V1
- `anime_asset_slots`
  - identifies the current chosen asset for each slot
  - points either to local `media_assets` or an external provider reference
  - lets UI replace/remove slot-by-slot safely
- `anime_asset_provenance`
  - records `origin_type` such as `manual_upload`, `manual_url`, `jellyfin_linked`, `jellyfin_materialized`
  - records provider item/image tag/path snapshot
  - records `selected_by_user_id`, `replaced_by_user_id`, timestamps
- `admin_audit_log`
  - action key, actor user ID, entity type, entity ID, request correlation ID, summary JSON, created at

Keep `anime.cover_image` as a read-model compatibility field for public pages and existing admin code. In V1, the selected `cover` slot should project back into `anime.cover_image` so existing reads keep working while the new slot/provenance model is adopted behind it.

## Recommended Data Flow

### 1. Manual Create

```text
Admin -> Next.js intake route
Next.js -> local draft state
Admin edits title + cover (+ optional fields)
Next.js -> POST /api/v1/admin/anime/intake/preview/manual
Backend handler -> AnimeIntakeService
AnimeIntakeService -> validate + normalize + return draft preview
Admin confirms
Next.js -> POST /api/v1/admin/anime/intake/commit
Backend -> transaction:
  create anime
  create asset slot/provenance rows
  create external refs only if present
  project cover slot into anime.cover_image
  write audit log
Backend -> created anime + draft summary
Frontend -> redirect into existing studio edit route
```

Direction is client draft -> preview DTO -> final commit. No anime row exists before commit.

### 2. Jellyfin Preview Before Create

```text
Admin -> Jellyfin search step
Next.js -> GET /api/v1/admin/jellyfin/series?q=...
Admin selects series ID/path
Next.js -> POST /api/v1/admin/anime/intake/preview/jellyfin
Backend handler -> AnimeIntakeService
AnimeIntakeService -> JellyfinMetadataClient:
  fetch series metadata
  fetch image/media candidates
  build draft fields
  attach provider identities/path snapshots
  mark each field/asset as source=jellyfin
Backend -> draft preview response
Admin edits draft in shared editor
Next.js -> POST /api/v1/admin/anime/intake/commit
Backend -> transaction:
  create anime
  persist anime_external_refs
  persist chosen asset slots/provenance
  project chosen cover slot into anime.cover_image
  write audit log
Frontend -> redirect into studio
```

Critical rule: Jellyfin preview is a pure read-side operation. It must not create anime rows, version rows, or media rows implicitly.

### 3. Final Save

```text
Draft editor -> commit endpoint
Commit endpoint -> validate required V1 invariants
Service -> persist anime core record first
Service -> persist source link + selected assets + provenance
Service -> optionally seed empty relation state metadata only
Service -> audit log
Response -> canonical anime record + saved provenance summary
```

Persist core anime creation and slot assignment in one transaction. If asset materialization is needed for a manual upload that already exists in `media_assets`, link it in the same transaction. Do not mix long-running Jellyfin downloads into the same transaction; for V1 prefer linked external references or already-fetched URLs, then add materialization later if needed.

### 4. Safe Resync

Resync must be separate from create. Treat it as a diff-and-apply workflow.

```text
Admin opens existing anime -> resync panel
Next.js -> POST /api/v1/admin/anime/:id/jellyfin/resync/preview
Backend -> AnimeResyncService
AnimeResyncService:
  load anime
  load anime_external_refs or compatibility source field
  fetch current Jellyfin snapshot
  compare DB fields vs provider fields
  mark each field as:
    fillable_empty
    blocked_manual
    unchanged
    missing_upstream
  compare asset slots similarly
Backend -> diff preview
Admin confirms
Next.js -> POST /api/v1/admin/anime/:id/jellyfin/resync/apply
Backend -> transaction:
  update only fillable_empty fields
  update external ref snapshot timestamps/path
  optionally add new provenance entries for newly adopted assets
  never overwrite non-empty manual values
  audit log
Backend -> applied diff summary
```

Direction is DB state + provider snapshot -> preview diff -> explicit apply. Do not reuse the current episode/version bulk sync endpoint for anime metadata and asset resync; that flow is episode-centric and already assumes an existing anime.

### 5. Relation CRUD

The current public relation read is effectively undirected for display. Admin CRUD needs canonical write direction or the system will become inconsistent.

Recommended canonical storage rules:

- `sequel`: `source_anime_id = earlier/mainline entry`, `target_anime_id = sequel`
- `side-story`: `source_anime_id = main story`, `target_anime_id = side story`
- `summary`: `source_anime_id = main story`, `target_anime_id = summary/recap`
- `full-story`: `source_anime_id = franchise/root story`, `target_anime_id = entry that belongs to full story`

Flow:

```text
Admin opens relations panel
Next.js -> GET /api/v1/admin/anime/:id/relations
Backend -> relation service returns:
  outbound relations
  inbound relations
  allowed V1 relation types
Admin creates/edits/deletes relation
Next.js -> POST/PATCH/DELETE relation endpoint
Backend -> validate:
  anime exists
  related anime exists
  no self relation
  type in V1 allowlist
  canonical direction enforced
  duplicate/conflicting row prevented
Backend -> save + audit
Frontend -> refresh relation list
```

Expose inbound/outbound direction in the admin response even if public responses stay simplified.

## Patterns to Follow

### Pattern 1: Shared Draft Contract
**What:** Both manual and Jellyfin-assisted intake should return the same `AnimeDraft` response shape.
**When:** For any create-time preview flow.
**Example:**

```typescript
type AnimeDraft = {
  sourceMode: 'manual' | 'jellyfin'
  core: {
    title: string
    description?: string
    year?: number
    anisearchId?: number
  }
  externalRef?: {
    provider: 'jellyfin'
    externalId: string
    path?: string
    displayName: string
  }
  assets: Array<{
    slot: 'cover' | 'poster' | 'logo' | 'banner' | 'background' | 'background_video'
    origin: 'manual_upload' | 'jellyfin_linked'
    value: string
    removable: boolean
  }>
  validation: {
    canCommit: boolean
    errors: string[]
  }
}
```

This keeps the frontend editor unified and avoids a manual form and Jellyfin form drifting apart.

### Pattern 2: Slot-Based Asset Ownership
**What:** Treat anime media as named slots, not a loose bag of media rows.
**When:** For cover/poster/logo/banner/background/background-video.
**Instead of:** Hiding ownership in `cover_image`, `anime_media`, and ad hoc source strings.

### Pattern 3: Diff Preview Before Mutation
**What:** Both create-from-Jellyfin and resync-from-Jellyfin should produce a preview object before any mutation.
**When:** Any provider-backed write flow.
**Why:** This matches the requirement for operator control, path visibility, and safe mismatch handling.

### Pattern 4: Durable Audit per Admin Mutation
**What:** Every commit, resync apply, asset replace/remove, and relation CRUD writes one audit event.
**When:** Every successful write and every explicitly blocked destructive attempt.
**Why:** Logging to stdout is not enough for this workflow.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Reusing `CreateAnime` as Both Preview and Commit
**What:** Trying to overload `POST /admin/anime` with preview semantics.
**Why bad:** Blurs persistence boundaries, makes audit harder, and encourages hidden side effects.
**Instead:** Separate preview endpoints and a single explicit commit endpoint.

### Anti-Pattern 2: Encoding Provenance Only in `anime.source`
**What:** Storing all linkage/provenance in one string field like `jellyfin:abc123`.
**Why bad:** Cannot represent per-asset provenance, replacement history, or path snapshots.
**Instead:** Use `anime_external_refs` plus asset slot provenance rows, while projecting back to compatibility fields.

### Anti-Pattern 3: Treating Relation Rows as Undirected on Write
**What:** Writing whichever anime the user clicked into `source_anime_id`.
**Why bad:** Makes later edits, deduping, and UI semantics ambiguous.
**Instead:** Enforce canonical direction in the service layer.

### Anti-Pattern 4: Letting Resync Overwrite Curated Data
**What:** Updating non-empty DB fields from Jellyfin because the provider is considered authoritative.
**Why bad:** Violates the explicit manual-authority requirement.
**Instead:** Only fill empty fields unless the user performs an explicit replace action for a specific asset slot.

## Suggested Endpoint Surface

Recommended new admin endpoints:

- `POST /api/v1/admin/anime/intake/preview/manual`
- `POST /api/v1/admin/anime/intake/preview/jellyfin`
- `POST /api/v1/admin/anime/intake/commit`
- `GET /api/v1/admin/anime/:id/intake-context`
- `POST /api/v1/admin/anime/:id/jellyfin/resync/preview`
- `POST /api/v1/admin/anime/:id/jellyfin/resync/apply`
- `GET /api/v1/admin/anime/:id/assets`
- `PUT /api/v1/admin/anime/:id/assets/:slot`
- `DELETE /api/v1/admin/anime/:id/assets/:slot`
- `GET /api/v1/admin/anime/:id/relations`
- `POST /api/v1/admin/anime/:id/relations`
- `PATCH /api/v1/admin/anime/:id/relations/:relationId`
- `DELETE /api/v1/admin/anime/:id/relations/:relationId`

Keep existing endpoints for:

- public anime relation reads
- existing episode/version Jellyfin bulk sync
- existing anime patch/edit route

## Suggested Build Order

Build order matters because relation CRUD, provenance-aware assets, and safe resync all depend on stable data ownership rules.

1. **Schema and compatibility layer**
   - Add `admin_audit_log`, `anime_external_refs`, `anime_asset_slots`, `anime_asset_provenance`
   - Add a write-side relation identifier strategy if needed for admin edits
   - Keep `anime.cover_image` and `anime.source` as compatibility projections

2. **Backend read/write contracts**
   - Define shared draft DTOs, asset DTOs, relation admin DTOs, resync diff DTOs
   - Add focused repositories before UI work

3. **Manual intake flow**
   - Lowest-risk path
   - Proves commit transaction, slot projection, validation, and audit logging

4. **Jellyfin create preview**
   - Reuse existing series search/client code
   - Produce draft preview only, no persistence

5. **Jellyfin commit for create**
   - Persist external ref + selected assets + audit log
   - Reuse shared draft commit path rather than a separate create implementation

6. **Asset provenance UI**
   - Show source badges, remove/replace actions, and slot-level details inside the existing edit workspace

7. **Safe resync preview/apply**
   - Depends on external refs and asset provenance being in place
   - Add fill-only diff behavior after create path is stable

8. **Relation CRUD**
   - Add canonical direction enforcement and admin panel
   - Update public read model only if direction visibility becomes necessary there

9. **Operational verification**
   - Add tests for draft preview purity, commit transactionality, fill-only resync, provenance replacement, and relation dedupe/canonicalization

### Dependency Notes

| Capability | Depends On |
|------------|------------|
| Jellyfin create preview | Jellyfin client reuse, shared draft DTO |
| Final save | intake service, asset slots, audit log |
| Safe resync | external refs, asset provenance, audit log |
| Relation CRUD | relation service, canonical direction rules, admin DTOs |
| Operator-safe errors | standardized error payloads across all new handlers |

## Scalability Considerations

| Concern | At current internal admin scale | At moderate editorial scale | At larger scale |
|---------|-------------------------------|-----------------------------|-----------------|
| Intake preview latency | synchronous request/response is fine | cache Jellyfin series metadata briefly | move heavy provider fetches behind async jobs if provider latency dominates |
| Asset provenance size | simple row-per-change works | index by anime/slot/origin | archive old provenance rows if audit volume grows |
| Audit log volume | direct Postgres writes are fine | add retention/reporting views | partition by month if needed |
| Relation reads | direct joins are fine | cache admin relation summaries if UI chatty | add materialized view only if proven necessary |

## Roadmap Implications

- Start with manual intake plus schema because it establishes the canonical write model without provider complexity.
- Add Jellyfin preview next, but keep it read-only until commit plumbing is proven.
- Do not start with resync. Resync is a second-order workflow that depends on external refs, slot-based provenance, and explicit overwrite rules.
- Relation CRUD can run in parallel with late intake work only after canonical direction rules are written down and enforced centrally.

## Sources

- `.planning/PROJECT.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `backend/cmd/server/main.go`
- `backend/internal/handlers/admin_content_anime.go`
- `backend/internal/handlers/jellyfin_preview.go`
- `backend/internal/handlers/jellyfin_sync.go`
- `backend/internal/handlers/jellyfin_sync_flow_helpers.go`
- `backend/internal/repository/admin_content.go`
- `backend/internal/repository/anime.go`
- `backend/internal/repository/anime_relations.go`
- `backend/internal/models/admin_content.go`
- `frontend/src/app/admin/anime/create/page.tsx`
- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/admin.ts`
- `frontend/src/types/anime.ts`
- `shared/contracts/admin-content.yaml`
- `database/migrations/0008_expand_anime_episode_columns.up.sql`
- `database/migrations/0020_add_metadata_reference_tables.up.sql`
- `database/migrations/0021_add_normalized_metadata_tables.up.sql`
- `database/migrations/0026_add_media_tables.up.sql`
- `database/migrations/0028_seed_media_types.up.sql`
