# Phase 06: Provisioning And Lifecycle Foundations - Research

**Researched:** 2026-04-02
**Domain:** Go backend provisioning, media lifecycle validation, and admin audit contracts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- Exact naming of the canonical folder segments under the entity root
- Exact response payload shape for provisioning success beyond the required created/already-existed/error semantics
- Exact audit event schema and logging field names
- Exact MIME and filename normalization rules, as long as they respect the strict request-data boundary

### Deferred Ideas (OUT OF SCOPE)
- Full generic upload UX belongs to Phase 7.
- Full replace/delete operator UX belongs to Phase 8.
- Additional entity types beyond `anime`, especially `group`, are intentionally deferred until the base contract is stable.
- Any broader revisit of the intake entry behavior is outside Phase 6.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROV-01 | Admin can provision the canonical asset folder structure for an anime with one explicit action. | Use server-derived `anime/{id}/...` provisioning with preflight validation and idempotent folder creation; expose first-upload auto-provision result in response. |
| PROV-02 | Manual anime create without Jellyfin data auto-provisions the canonical anime asset folders on first upload. | Use the same V2-first provisioning service as the upload preflight so the manual anime create path gets canonical folders without a separate button. |
| PROV-03 | Running provisioning repeatedly is idempotent and reports whether folders were created or already present. | Return per-folder status (`created` or `already_exists`) after validating current structure before mutation. |
| PROV-04 | Provisioning blocks invalid entity IDs, invalid entity types, and unsafe paths before any filesystem change is attempted. | Validate entity existence, allowlisted entity/asset types, canonical roots, path containment, and structure consistency before `MkdirAll`. |
| LIFE-02 | Upload, replace, delete, and provisioning failures return operator-usable validation and storage error details. | Reuse the repo's structured `error.message` pattern and return exact field/folder context instead of generic upload failures. |
| LIFE-03 | Asset lifecycle actions are durably attributable to the acting admin user ID. | Carry authenticated admin `UserID` into durable audit rows, matching existing anime mutation audit semantics and `uploaded_by` persistence. |
| LIFE-04 | Asset lifecycle rules are reusable across anime asset slots in the V2 schema instead of being hardcoded around anime covers only. | Centralize provisioning and slot rules in a V2-aware anime service rather than per-handler special cases for cover only. |
</phase_requirements>

## Summary

The repo already has the right raw ingredients for Phase 6, but they are split across two incompatible seams. The current generic upload handler at [`backend/internal/handlers/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/media_upload.go) accepts a minimal multipart contract and persists `uploaded_by`, but it hardcodes a global entity/asset allowlist, creates directories directly in the handler, returns generic storage failures, and protects paths with `strings.HasPrefix`, which is an unsafe boundary check for filesystem containment. In parallel, the anime asset repository and admin handlers already implement explicit slot assignment and durable audit insertion for anime mutations. The important clarification from the user is that the current upload context is manual anime create/edit without Jellyfin data, so Phase 6 should follow the anime V2 direction rather than pulling group/fansub media into the first implementation slice.

Phase 6 should not add another special-case upload path. It should introduce one backend-only provisioning and lifecycle foundation centered on a V2-first anime lifecycle service: validate the authenticated admin, validate anime existence, resolve canonical storage roots from server-owned policy, inspect the existing folder structure, provision missing canonical subfolders idempotently, and return an audit-rich result object that later upload/replace/delete phases can reuse. The request contract stays restrictive: `entity_type`, `entity_id`, `asset_type`, and file payload only, but the server should treat `anime` as the only supported Phase 6 subject and route persistence toward the V2 anime asset seam rather than deepening legacy upload metadata.

The key planning implication is that Phase 6 is mostly about extracting and hardening contracts, not building the final upload UX. The planner should focus on a reusable provisioning service, typed validation errors, a durable audit repository for lifecycle events, and narrow tests around path safety, idempotency, and actor attribution. That foundation lets Phase 7 and Phase 8 plug in without rewriting storage or slot semantics.

**Primary recommendation:** Build an anime-focused V2 server-side provisioning/lifecycle service with slot policy tables, preflight structure validation, durable actor-attributed audit rows, and path containment based on canonical roots plus `filepath.Rel`/symlink-safe checks instead of string-prefix checks.

## Project Constraints (from CLAUDE.md)

- Improve the existing brownfield backend/frontend/admin stack rather than replacing it.
- Preserve existing Team4s routes, repository patterns, and database evolution model.
- Keep manual/admin-authored data authoritative over imported/provider data.
- Keep admin actions attributable by user ID and operational errors visible immediately in the UI.
- Keep production files below roughly 450 lines; split larger implementations.
- Prefer documented APIs and avoid undocumented behavior.
- Do not bypass the existing GSD workflow discipline for repo edits.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go stdlib (`os`, `path/filepath`, `errors`) | Go 1.25 module target; `go1.26.1` installed | Filesystem mutation, path derivation, error wrapping | No new dependency is needed for provisioning; current code already uses stdlib heavily. |
| `github.com/gin-gonic/gin` | `v1.10.0` (repo-pinned) | Multipart binding and admin HTTP handlers | Existing admin handlers already use `ShouldBind`, `ShouldBindJSON`, and `gin.H` error envelopes. |
| `github.com/jackc/pgx/v5` | `v5.7.1` (repo-pinned) | Transactions, row locking, audit inserts | Existing asset and audit mutations are transaction-owned in repositories. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github.com/gabriel-vasile/mimetype` | `v1.4.3` (repo-pinned) | Magic-byte MIME detection | Keep for upload validation once Phase 7 plugs into the provisioning contract. |
| `github.com/google/uuid` | `v1.6.0` (repo-pinned) | Upload-scoped IDs | Keep for per-upload leaf folders if Phase 7 continues current file naming. |
| `github.com/stretchr/testify` | `v1.9.0` (repo-pinned) | Focused handler/repository assertions | Existing backend tests already use it. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handler-owned provisioning logic | Dedicated `AssetLifecycleService` plus repository helpers | Service extraction adds a file or two now, but prevents Phase 7/8 from duplicating safety logic. |
| `strings.HasPrefix` path containment | `filepath.Rel` plus canonical root checks and symlink-aware resolution | Slightly more code, but correct across path boundaries and safer than lexical prefix matching. |
| Global asset-type allowlist | Per-entity policy allowlists | Slightly more config, but satisfies D-16 and future extensibility cleanly. |

**Installation:**
```bash
# No new packages recommended for Phase 6.
# Use the existing backend module dependencies.
cd backend && go test ./internal/handlers ./internal/repository
```

**Version verification:** Phase 6 does not require adding third-party packages. Recommended libraries are the repo-pinned versions from [`backend/go.mod`](C:/Users/admin/Documents/Team4s/backend/go.mod), verified against the checked-in module file on 2026-04-02.

## Architecture Patterns

### Recommended Project Structure
```text
backend/internal/
|-- handlers/
|   `-- media_upload.go                 # Thin HTTP binding + response mapping only
|-- services/
|   |-- asset_lifecycle_service.go      # Anime V2 provisioning, validation, canonical path resolution
|   `-- asset_lifecycle_errors.go       # Typed operator-safe validation/storage errors
|-- repository/
|   |-- asset_lifecycle_audit.go        # Durable audit writes
|   `-- asset_lifecycle_subjects.go     # Entity existence / lock / slot lookup helpers
`-- models/
    `-- asset_lifecycle.go              # Policy/result DTOs shared by handler + service
```

### Pattern 1: Policy-Driven Canonical Root Resolution
**What:** Resolve anime storage roots and allowed asset types from server-owned policy, never from client path input.
**When to use:** Every provisioning, upload, replace, or delete entrypoint.
**Example:**
```go
type AssetEntityPolicy struct {
	EntityType        string
	RootSegment       string
	AllowedAssetTypes map[string]struct{}
	RequiredFolders   []string
}

var lifecyclePolicies = map[string]AssetEntityPolicy{
	"anime": {
		EntityType:  "anime",
		RootSegment: "anime",
		AllowedAssetTypes: map[string]struct{}{
			"cover": {}, "banner": {}, "logo": {}, "background": {}, "background_video": {},
		},
		RequiredFolders: []string{"cover", "banner", "logo", "background", "background_video"},
	},
}
```
Source: repo fit inferred from [`backend/internal/handlers/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/media_upload.go), [`frontend/src/lib/api.ts`](C:/Users/admin/Documents/Team4s/frontend/src/lib/api.ts), and Phase 6 context decisions D-01 through D-16.

### Pattern 2: Preflight Structure Validation Before Mutation
**What:** Inspect the canonical entity root before creating anything. Missing required folders are creatable; unexpected folders/files at reserved locations are blocking validation failures.
**When to use:** First-upload auto-provision and any explicit provisioning endpoint kept for internal testing/admin tooling.
**Example:**
```go
type ProvisioningFolderStatus struct {
	Folder string `json:"folder"`
	State  string `json:"state"` // created | already_exists
}

type ProvisioningResult struct {
	EntityType string                     `json:"entity_type"`
	EntityID   int64                      `json:"entity_id"`
	Statuses   []ProvisioningFolderStatus `json:"statuses"`
}

func (s *AssetLifecycleService) EnsureCanonicalLayout(...) (*ProvisioningResult, error) {
	// 1. Validate entity type, ID, and asset type against policy.
	// 2. Resolve absolute root from config + policy.
	// 3. Inspect existing structure; reject unexpected reserved-state collisions.
	// 4. Create only missing required folders.
	// 5. Return created/already_exists per folder for audit + UI messaging.
}
```
Source: local requirement fit from [`backend/internal/handlers/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/media_upload.go) and Go `os.MkdirAll` docs (`https://pkg.go.dev/os#MkdirAll`).

### Pattern 3: Handler Thin, Repository Owns Durability
**What:** Keep handlers responsible for auth/binding/HTTP mapping and move durable audit + subject existence into repositories/services.
**When to use:** All lifecycle entrypoints.
**Example:**
```go
identity, ok := h.requireAdmin(c)
if !ok {
	return
}

result, err := h.assetLifecycleService.ProvisionForUpload(
	c.Request.Context(),
	identity.UserID,
	req.EntityType,
	req.EntityID,
	req.AssetType,
)
if err != nil {
	h.writeLifecycleError(c, err)
	return
}

c.JSON(http.StatusOK, gin.H{"data": result})
```
Source: handler shape from [`backend/internal/handlers/admin_content_anime_assets.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_anime_assets.go) and [`backend/internal/handlers/admin_content_authz.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_authz.go).

### Pattern 4: Explicit Slot Ownership Rules
**What:** Singular slots (`cover`, `banner`, `logo`, `background_video`) must replace the active asset; plural slots (`background`) can append but still need deterministic active-state semantics. Ownership (`manual` vs `provider`) stays explicit and server-side.
**When to use:** Phase 6 contract design now, Phase 7/8 implementation later.
**Example:**
```go
type SlotCardinality string

const (
	SlotSingle SlotCardinality = "single"
	SlotMulti  SlotCardinality = "multi"
)

type AssetSlotPolicy struct {
	AssetType   string
	Cardinality SlotCardinality
}
```
Source: anime slot behavior from [`backend/internal/repository/anime_assets.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/anime_assets.go).

### Anti-Patterns to Avoid
- **String-prefix path validation:** The repo currently uses `strings.HasPrefix` in backend and `startsWith` in frontend media routes. Official Go docs explicitly warn that `filepath.HasPrefix` exists only for historical compatibility and should not be used.
- **Global loose asset types:** The current upload handler accepts one global map for all entities; that violates D-16 and will make future V2 expansion brittle.
- **Silent partial success:** Current `/admin/upload` collapses processing failures into `"verarbeitung fehlgeschlagen"`; Phase 6 must preserve exact validation/storage context.
- **Handler-created business rules:** Do not keep entity existence checks, canonical path derivation, provisioning, and audit writes embedded in `media_upload.go`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path containment | Ad hoc `strings.HasPrefix` / `startsWith` guards | Canonical root resolution + `filepath.Rel`/absolute-root validation + symlink-aware checks | Prefix checks do not respect path boundaries and are explicitly discouraged by Go docs. |
| Lifecycle actor attribution | Best-effort logs only | Durable DB audit rows keyed by actor user ID | Logs alone are not queryable enough for admin lifecycle investigations. |
| Slot semantics | Per-handler cover/banner/background branches | Central slot policy table and reusable lifecycle service | Prevents the anime manual-upload path from staying trapped in cover-only special cases. |
| Folder schema | Freeform path fragments from clients | Server-owned entity policy with fixed subfolders | Satisfies D-09, D-14, D-15, and avoids path traversal/design drift. |
| Upload validation | Relying only on file extension or browser MIME | Magic-byte MIME validation + per-slot allowlists + explicit normalization rules | Existing repo already uses stronger validation patterns. |

**Key insight:** The repo's biggest risk is not missing code, it is fragmented authority. Phase 6 should create one authoritative place that answers: which anime slot is valid, where the files belong, whether provisioning is safe, and what must be audited.

## Common Pitfalls

### Pitfall 1: Treating Existing Folder Presence as Automatically Valid
**What goes wrong:** The upload succeeds into a partially corrupted or ad hoc folder layout because the service only checks "directory exists."
**Why it happens:** `os.MkdirAll` is idempotent, but it does not validate that sibling folders or reserved paths are correct.
**How to avoid:** Preflight the canonical entity root, verify required folders, and reject unexpected file-vs-directory collisions in reserved slots before mutation.
**Warning signs:** Operators see repeated upload failures for one entity only, or files exist under unexpected slot names.

### Pitfall 2: Using Lexical Prefix Checks for Path Safety
**What goes wrong:** A cleaned path passes a naive prefix check even though it escapes the intended boundary or abuses path-boundary edge cases.
**Why it happens:** The current code uses string-prefix logic in both backend and frontend media paths.
**How to avoid:** Resolve canonical absolute paths, compute a relative path from the canonical root, and reject any result that escapes the root; verify symlink behavior explicitly on disk-backed paths.
**Warning signs:** Safety code compares paths as plain strings or uses `startsWith`/`HasPrefix`.

### Pitfall 3: Hardcoding Anime-Cover Assumptions Into The Anime Lifecycle Foundation
**What goes wrong:** Phase 6 claims to be reusable but only really solves cover assignment, so banner/background/video work in Phase 7/8 still needs a rewrite.
**Why it happens:** The current upload seam and slot assignment routes are anime-specific and cover-heavy.
**How to avoid:** Model anime slot policy explicitly for `cover`, `banner`, `logo`, `background`, and `background_video`; do not let the new foundation stop at cover only.
**Warning signs:** Service or repo methods are named only around cover assignment while supposed to establish the broader anime V2 lifecycle contract.

### Pitfall 4: Auditability Only at the Upload Row
**What goes wrong:** `uploaded_by` exists on `media_assets`, but provisioning attempts, validation failures, replace decisions, and delete cleanups are not reconstructable.
**Why it happens:** The current upload seam stores `uploaded_by`, while anime admin audit is a separate table.
**How to avoid:** Add a dedicated lifecycle audit write path or expand durable audit coverage so each provisioning/upload/delete action records actor, entity, asset type, outcome, and payload context.
**Warning signs:** A support question requires grepping logs instead of querying a table.

### Pitfall 5: Returning Generic Failure Messages to Operators
**What goes wrong:** The UI can only say "upload failed," which forces log-diving for routine operator mistakes.
**Why it happens:** Current `/admin/upload` maps many processing errors to one generic 500 response.
**How to avoid:** Define typed lifecycle errors with stable codes and operator-facing `message` + `details`.
**Warning signs:** Handlers replace wrapped errors with generic copy at the HTTP boundary.

## Code Examples

Verified patterns from official sources and existing repo seams:

### Multipart Binding With Strict Minimal Fields
```go
type UploadRequest struct {
	EntityType string `form:"entity_type" binding:"required"`
	EntityID   int64  `form:"entity_id" binding:"required"`
	AssetType  string `form:"asset_type" binding:"required"`
}

var req UploadRequest
if err := c.ShouldBind(&req); err != nil {
	badRequest(c, "ungueltige anfrage")
	return
}
```
Source: [`backend/internal/models/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/models/media_upload.go), [`backend/internal/handlers/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/media_upload.go), Gin multipart binding docs: `https://gin-gonic.com/en/docs/binding/multipart-urlencoded-binding/`

### Durable Audit Insert Pattern
```go
if entry.ActorUserID <= 0 {
	return fmt.Errorf("actor user id is required")
}

_, err := tx.Exec(ctx, `
	INSERT INTO admin_anime_mutation_audit (
		anime_id, actor_user_id, mutation_kind, request_payload
	) VALUES ($1, $2, $3, $4)
`, entry.AnimeID, entry.ActorUserID, entry.MutationKind, entry.RequestPayload)
```
Source: [`backend/internal/repository/admin_content_anime_audit.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anime_audit.go), [`database/migrations/0038_add_admin_anime_mutation_audit.up.sql`](C:/Users/admin/Documents/Team4s/database/migrations/0038_add_admin_anime_mutation_audit.up.sql)

### Validation-Specific Error Surface
```go
type MediaValidationError struct {
	Message string
}

if err := validateMimeForKind(kind, detectedMime); err != nil {
	return nil, err
}
```
Source: [`backend/internal/services/media_service.go`](C:/Users/admin/Documents/Team4s/backend/internal/services/media_service.go)

### Safer Path-Containment Direction
```go
base := filepath.Clean(configuredRoot)
target := filepath.Join(base, policy.RootSegment, strconv.FormatInt(entityID, 10), assetType)

rel, err := filepath.Rel(base, target)
if err != nil || rel == "." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) || rel == ".." {
	return nil, ErrUnsafePath
}
```
Source: recommended replacement for the current prefix checks in [`backend/internal/handlers/media_upload.go`](C:/Users/admin/Documents/Team4s/backend/internal/handlers/media_upload.go); Go filepath docs: `https://pkg.go.dev/path/filepath`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-purpose media/file tables and join tables without explicit slot ownership | Mixed legacy generic upload plus newer anime slot ownership (`cover_asset_id`, `banner_asset_id`, `anime_background_assets`) | Migrations `0039` and `0040` | The repo already moved toward explicit anime slot semantics; Phase 6 should formalize that V2-first direction instead of extending the legacy upload model. |
| Cover URL as a loose field (`cover_image`) | Explicit ownership-aware anime asset resolution in repository code | Asset-slot milestone work before 2026-04-02 | Lifecycle rules should remain server-side and ownership-aware. |
| Upload-only attribution via `uploaded_by` | Durable JSONB admin mutation audit table for anime create/update/delete | Migration `0038` and `0041` | Provisioning/lifecycle audit should follow the durable-table pattern, not log-only tracking. |

**Deprecated/outdated:**
- `strings.HasPrefix` path containment in upload paths: outdated and unsafe for filesystem boundary enforcement.
- Global `allowedAssetTypes` in generic upload handler: insufficient for D-16 and future extensibility.
- Generic `"verarbeitung fehlgeschlagen"` responses: insufficient for LIFE-02.

## Open Questions

1. **Should lifecycle audit extend `admin_anime_mutation_audit` or use a new anime-specific lifecycle table?**
   - What we know: anime mutations already have a durable JSONB audit pattern with actor ID and mutation kind.
   - What's unclear: whether anime lifecycle events should live beside editorial audit or in a new dedicated lifecycle table.
   - Recommendation: use a new anime-focused `admin_asset_lifecycle_audit` table in Phase 6; keep anime editorial audit focused on anime metadata mutations.

2. **What exact canonical folder segment names should be used under the entity root?**
   - What we know: D-03 locks entity-first roots with fixed asset-type subfolders; the current upload path uses `poster`, while requirements/user language prefers `cover`.
   - What's unclear: whether the filesystem should preserve existing `poster` naming or align storage slots with public/admin slot names.
   - Recommendation: decide once in planning and keep a translation layer if needed; prefer slot names that match admin contract (`cover`, `banner`, `logo`, `background`, `background_video`) unless backward compatibility with existing `/media/anime/{id}/poster/...` must be preserved.

3. **How much of the legacy `/admin/upload` contract should survive Phase 6?**
   - What we know: the current request shape is `entity_type`, `entity_id`, `asset_type`, plus file upload, but the persistence direction should be V2-first.
   - What's unclear: whether Phase 6 should preserve that request shape as-is or start narrowing it toward anime-first semantics immediately.
   - Recommendation: keep the request shape for compatibility, but make the implementation support only `anime` in Phase 6 and route all provisioning/linking decisions through the V2 anime asset seam.
