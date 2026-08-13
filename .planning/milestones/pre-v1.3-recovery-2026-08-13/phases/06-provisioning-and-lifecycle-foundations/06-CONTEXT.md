# Phase 6: Provisioning And Lifecycle Foundations - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 establishes the safe backend and contract foundation for anime asset lifecycle behavior before broader generic upload rollout begins. The phase covers canonical anime folder provisioning, strict validation rules, auditability, and the baseline V2 lifecycle contract that later upload/replace/delete work must obey.

This phase does not deliver the full generic upload UX or the final replace/delete UI surface. It defines the rules and server-side seams that make those later phases safe and consistent.

</domain>

<decisions>
## Implementation Decisions

### Folder model
- **D-01:** Phase 6 provisions folders only for `anime`.
- **D-02:** The provisioning contract must remain extensible for later entity types such as `group`, but those types are out of scope for this phase.
- **D-03:** The canonical folder structure is entity-first with fixed asset-type subfolders, not asset-type-first and not freeform path composition.

### Provisioning trigger
- **D-04:** Folder provisioning should happen automatically on first upload when required, not through a separate operator button in Phase 6.
- **D-05:** If the target folder already exists, provisioning must not recreate it or mutate it unnecessarily.
- **D-06:** Upload and provisioning errors must be surfaced clearly in the UI with the exact problem context rather than generic failure copy.
- **D-07:** Provisioning actions and related failures must be logged and remain auditable.
- **D-08:** Automatic provisioning should validate the expected structure first and fail clearly if the existing structure is invalid or inconsistent, rather than silently continuing on a broken layout.

### Safety rules
- **D-09:** Phase 6 uses a very strict safety model: only known entity types, only canonical roots, and no client-provided freeform storage paths.
- **D-10:** There is no dry-run mode in Phase 6. Validation happens as part of the real action path, and blocking failures stop the operation before filesystem mutation.

### Lifecycle contract
- **D-11:** Phase 6 must lock the foundational lifecycle rules now, even though the full replace/delete implementation comes in later phases.
- **D-12:** The later lifecycle implementation must treat slot ownership and active persisted asset selection as explicit server-side rules, not ad-hoc per-slot behavior.
- **D-13:** Replace/delete behavior should ultimately remove superseded files directly rather than keeping silent archive or cleanup markers by default.

### Allowed request data
- **D-14:** Client requests must stay very restrictive. The server should accept only the minimum identifying fields plus the uploaded file where applicable.
- **D-15:** For lifecycle operations, the client may send `entity_type`, `entity_id`, `asset_type`, and the file payload; the server derives canonical paths, filenames, storage targets, and folder layout.
- **D-16:** `asset_type` must be validated through a fixed allowlist per entity type rather than a global loose string contract.

### the agent's Discretion
- Exact naming of the canonical folder segments under the entity root
- Exact response payload shape for provisioning success beyond the required created/already-existed/error semantics
- Exact audit event schema and logging field names
- Exact MIME and filename normalization rules, as long as they respect the strict request-data boundary

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and milestone intent
- `.planning/ROADMAP.md` - Defines Phase 6 goal, mapped requirements, and success criteria for provisioning/lifecycle foundations
- `.planning/REQUIREMENTS.md` - Defines `PROV-01` through `PROV-04` and `LIFE-02` through `LIFE-04`
- `.planning/PROJECT.md` - Defines current milestone intent and the rule that generic asset lifecycle hardening is the next product thread
- `.planning/STATE.md` - Records current focus and blockers for the post-v1.0 milestone state
- `AGENTS.md` - Requires durable decisions, reproducible workflows, and identifies one-click asset folder provisioning as the current open thread

### Existing upload and media seams
- `backend/internal/handlers/media_upload_image.go` - Shows current upload path behavior for image assets and where storage path and DB linking happen today
- `backend/internal/repository/media_upload.go` - Shows current media asset/file persistence model and join-table behavior
- `backend/cmd/server/admin_routes.go` - Shows current admin upload route and existing entity-specific asset endpoints
- `backend/internal/models/admin_content.go` - Provides current admin content and persisted asset model context that new lifecycle contracts must respect
- `backend/internal/repository/anime_assets.go` - Shows the current anime asset V2 seam and why new work should target the V2 direction instead of legacy upload metadata

### Historical milestone context
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` - Records the milestone-closeout debt and the shift toward generic asset lifecycle work

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/handlers/media_upload_image.go`: current image upload processing, file writes, and DB transaction flow can inform the future generic upload seam
- `backend/internal/repository/media_upload.go`: current media asset/media file persistence and join-table writes provide the existing persistence base
- `backend/cmd/server/admin_routes.go`: current `/admin/upload` route and per-entity asset routes define the current API seam that Phase 6 must rationalize
- `backend/internal/repository/anime_assets.go`: current anime V2 asset reads and writes define the schema direction Phase 6 must align to

### Established Patterns
- Admin mutations are explicit and authenticated; fail-closed auth and actor attribution are already established patterns
- Existing media handling is entity-aware but implemented through entity-specific join methods rather than one unified lifecycle contract
- The backend already expects server-side path construction and DB transaction ownership rather than trusting client-computed storage destinations

### Integration Points
- Generic provisioning and lifecycle rules will need to align with the current upload handler/repository seam rather than bypassing it
- Anime media behavior must remain compatible with existing admin routes, persisted asset reads, and the V2 anime asset repository seam
- Future upload phases will likely build directly on the validation and provisioning contract defined here

</code_context>

<specifics>
## Specific Ideas

- The user wants automatic folder provisioning on first upload rather than a separate "create folders" button.
- The current upload context is manual anime create or edit without Jellyfin-derived metadata.
- The user wants this work to target the V2 schema direction, not to deepen the legacy `entity_type/entity_id/asset_type` model.
- Error messages should tell the operator exactly what failed, for example which folder could not be created or which validation blocked the action.
- Existing folders must not be recreated, and inconsistent existing structures should fail clearly instead of being silently reused.
- The user prefers direct deletion of superseded files over archive/marker-based cleanup.

</specifics>

<deferred>
## Deferred Ideas

- Full generic upload UX belongs to Phase 7.
- Full replace/delete operator UX belongs to Phase 8.
- Additional entity types beyond `anime`, especially `group`, are intentionally deferred until the anime-first V2 contract is stable.
- Any broader revisit of the intake entry behavior is outside Phase 6.

</deferred>

---

*Phase: 06-provisioning-and-lifecycle-foundations*
*Context gathered: 2026-04-02*
