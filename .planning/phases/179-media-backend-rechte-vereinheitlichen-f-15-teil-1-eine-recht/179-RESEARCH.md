# Phase 179: Media-Backend & Rechte vereinheitlichen (F-15 Teil 1) - Research

**Researched:** 2026-10-10
**Domain:** Go backend permission registry (action_definitions + role_capabilities), Gin handlers, pgx repository layer, one small frontend visibility wire-up
**Confidence:** HIGH (all findings grounded in current repo code and live `team4s_v2` DB via `docker compose exec`; no library/framework research needed - this is an internal-convention phase)

## Summary

This phase has no external library or framework dependency - it is entirely about following this
codebase's own established conventions for (1) adding a new data-driven permission action via SQL
migration, (2) removing one specific, already-dead permission fallback branch, (3) extracting a
duplicated persistence block into a handler method, (4) extracting a duplicated SQL skeleton into a
repository method, and (5) wiring one already-existing frontend boolean flag into a component that
currently has no visibility check at all. Every one of these five sub-problems already has a
directly analogous precedent elsewhere in this exact codebase - this research locates each precedent
file/line so the planner can replicate shape, not invent new patterns.

The single most important finding changes how D-13 (Anime-Asset display capability) should be
planned: **Weg 4's upload is not capability-registry-gated at all** - `POST /api/admin/upload` is
gated by `requirePlatformAdminIdentity` (a hardcoded global-role check, `platform_admin_authz.go`),
and the *page* that renders `AnimeJellyfinAssetUploadControls` is *already* wrapped in
`<PlatformAdminGate>` at both of its two call sites (`admin/anime/[id]/edit/page.tsx` and
`admin/anime/create/page.tsx`). The frontend already has a working `is_platform_admin: boolean` field
on `CurrentUserData` (returned by `getCurrentUser()`), which is exactly what `PlatformAdminGate.tsx`
already consumes. **No new `action_definitions`/`role_capabilities` row is needed for D-13** - this
is purely about threading the already-fetched `is_platform_admin` boolean (or a fresh
`getCurrentUser()` call) down into `AnimeJellyfinAssetUploadControls.tsx` so the component itself
degrades gracefully if ever rendered outside the current page-level gate, matching D-02's own text
("Plattform-Admin-Bypass... betrifft Weg 4 nicht, da dort... nicht Capability-basiert").

**Primary recommendation:** Treat D-12 (ActionReleaseThemeAssetUpload) as a standard
action_definitions+role_capabilities migration following migration `0173`'s exact shape; treat D-10
(remove upload-only custom-permission fallback) as a 16-line deletion in `fansub_media_upload.go`
confirmed isolated from the delete path; treat D-14 (shared soft-delete helper) as a new private
method on `*MediaRepository` (both soft-delete functions already live on the *same* Go struct, just
in two different files) parametrized by table name via a trusted Go constant (not user input) -
precedent for this exact fmt.Sprintf-table-name shape exists in
`repository/media_upload.go:366-382`; treat the theme-asset persistence extraction (1.6) as a new
private method on `*AdminContentHandler` mirroring `persistFansubMediaAsset` on `*FansubHandler`;
and treat D-13 as a pure frontend prop-threading change with no backend capability work at all.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gruppenmedien-Upload-Rechteprüfung (1.2) | API/Backend | - | `permissions.Service.CanForFansubGroup` + `role_capabilities` cache; pure backend authorization logic |
| Custom-Permission-Fallback-Entfernung (1.2) | API/Backend | - | Handler-level branch in `fansub_media_upload.go`, no frontend involvement |
| Anime-Asset-Upload-Anzeige-Flag (1.4) | Frontend (Client) | API/Backend (existing, unchanged) | Enforcement already lives in backend (`requirePlatformAdminIdentity`); this phase only adds a frontend visibility flag reusing an existing backend-provided field (`is_platform_admin` on `/me`-style payload) |
| ActionReleaseThemeAssetUpload (1.6) | API/Backend | Database/Storage (migration) | New action_definitions/role_capabilities row + handler permission check swap |
| Theme-Asset-Persistenz-Extraktion (1.6) | API/Backend | - | Pure Go refactor inside `AdminContentHandler`, no contract change |
| Soft-Delete-Helfer (Fachaufgabe 8 #5/#6) | Database/Storage | API/Backend | SQL skeleton lives in repository layer; callers (handlers) unchanged |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01:** Scope is Permission-Matrix rows 1.2 (Gruppenmedien-Upload, Weg 2), 1.4 (Anime-Assets-Upload,
  Weg 4, Rechte-Fix only), 1.6 (Release-Theme-Assets-Upload, Weg 6); plus Fachaufgabe 8 #5/#6
  (Soft-Delete duplicate) and the theme-asset persistence block. Wege 1, 3, 5, 7, 8 remain untouched.
  The upload frontend/workflow part of F-15 is Phase 180, not part of this phase.
- **D-02 (binding frame):** Rights are modeled data-driven via `action_definitions` + `role_capabilities`
  (capability registry) - no new hardcoded role checks in handler code. The platform-admin bypass
  remains by design (does not affect Weg 4, since enforcement there is already the platform-admin
  guard, not capability-based - the display flag from 1.4 only adds the missing UI side).
- **D-03 (binding frame):** Wege 3, 4, 5, 7, 8 remain legitimately separate implementations per the
  inventory - no merging of these ways in this phase, even though they belong to the same
  "upload media" business task. Only the rights fix from 1.4 is applied to Weg 4.
- **D-04 (user rule):** The global upload building block/workflow is explicitly NOT built in this
  phase - that is Phase 180. This phase only delivers the backend/rights foundation.
- **D-05 (project rule):** Tests are real behavior tests - `httptest` against a fake repository or a
  real Postgres instance, checking status code and response body. No source-grep tests (`os.ReadFile`
  + `strings.Contains`) that claim something exists/works without ever calling the code.
- **D-06 (project rule):** The 450-line limit per production code file also applies to the new
  soft-delete helper and the extracted theme-asset persistence function - split if needed.
- **D-07 (project rule):** One commit per logically completed change on `main` (no collective commit
  across multiple separate steps); no `git stash` with open changes.
- **D-08 (project rule):** Do not push - work stays local on `main` until the user explicitly asks to push.
- **D-09 (risk guardrail, from fact-check):** Any change that takes away or newly grants an existing
  user an upload or delete right is a user decision - even though the live database currently shows 0
  custom-permission records. Resolved by D-10 below (delete-fallback question).
- **D-10:** Delete-fallback stays as-is (user 2026-10-10, resolves Open Question 1, Option A) - only
  the **upload** custom-permission fallback is removed (0 records, redundant with the baseline
  capability `fansub_group_media.upload`). The delete-fallback (`can_delete_own`/`can_delete_all`)
  stays unchanged; dedicated delete capabilities (`.delete_own`/`.delete_all`) are explicitly NOT part
  of this phase.
- **D-11:** Group-media-upload role circle unchanged (user 2026-10-10, resolves Open Question 2,
  Option A) - every active group member keeps the upload right via the baseline capability
  `fansub_group_media.upload`; uploads continue to land in review (`review_status=in_pruefung`). No
  narrowing or widening of the role circle during this rights-unification.
- **D-12:** Theme-asset role list taken over identically (user 2026-10-10, resolves Open Question 3,
  Option A) - the new `ActionReleaseThemeAssetUpload` gets the exact same role list as
  `ActionReleaseVersionMediaUpload` (`designer, editor, encoder, fansub_lead, karaoke_fx,
  project_lead, quality_checker, raw_provider, timer, translator, typesetter`), entered data-driven
  into `action_definitions` + `role_capabilities` via migration. Replaces the foreign reused action;
  factually no rights change for existing users.
- **D-13:** Display capability for Anime-Assets bound exactly to platform-admin (user 2026-10-10,
  resolves Open Question 4, Option A) - the new display capability for the Anime-Asset-Upload
  (Cover/Banner/Logo/Hintergrund on the anime edit page) mirrors the existing enforcement 1:1:
  platform-admin; the `segment_preview` special case keeps its own segment right. Pure UI visibility
  correction - the upload controls disappear for non-admins, no rights expansion. Behavior-test
  requirement (D-05-compliant): non-admin -> flag `false`, admin -> flag `true`.
- **D-14:** Delete behavior stays separate, only SQL is unified (user 2026-10-10, resolves Open
  Question 5, Option A) - group media keeps its review behavior, release media stays without; only
  the duplicated soft-delete SQL skeleton (`SoftDeleteFansubGroupMedia` vs.
  `SoftDeleteReleaseVersionMedia`) is merged into a shared helper. Behavior stays unchanged for both
  domains - proven by behavior tests of both paths (D-05-compliant).

### Claude's Discretion

Not explicitly enumerated as a separate section in 179-CONTEXT.md - all five originally open
questions were resolved by the user as D-10 through D-14 (all Option A). Discretion remains only on
pure implementation shape (file layout, exact method names, migration number, exact test file
names) as researched below - no remaining fachliche/business discretion.

### Deferred Ideas (OUT OF SCOPE)

- Option B of every one of the five former open questions (merging the delete-fallback into the
  capability registry; narrowing the group-media-upload role circle; narrowing the theme-asset role
  list; making the Anime-Asset display capability more granular than platform-admin; aligning the two
  domains' delete rights models) - explicitly not chosen, not part of this phase.
- Wege 3 (Fansub-Logo/Banner), 5 (Segment-Assets/Kara-Video), 7 (Profil-Avatar/-Hintergrund/-Story), 8
  (Medien-Vorschläge) - legitimately separate per the Phase 175 inventory, untouched here.
- The global upload building block/workflow (frontend) - Phase 180.
- Dedicated `fansub_group_media.delete_own`/`.delete_all` capabilities - not part of this phase (D-10).

</user_constraints>

## Phase Requirements

<phase_requirements>

No phase requirement IDs were provided for Phase 179 (`phase_req_ids` is null/TBD in the orchestrator
scope, confirmed by `grep -n "179" .planning/REQUIREMENTS.md` returning zero matches). The phase's
only durable traceability artifact is `.planning/phases/179-.../179-CONTEXT.md`'s D-01 through D-14
decisions; the planner should trace plan tasks to these D-NN IDs instead of REQ-IDs, consistent with
how Phase 178's plans referenced its own D-NN decisions (`.planning/STATE.md` line 406 confirms Phase
178 used the same D-NN-as-requirement-ID convention when no REQUIREMENTS.md IDs existed).

</phase_requirements>

## Standard Stack

No new libraries, frameworks, or packages are introduced by this phase. All work uses the existing
stack: Go 1.25 + Gin + pgx/v5 (backend), SQL migrations (`database/migrations/`), Next.js/React/
TypeScript (one small frontend file). No `npm install` / `go get` / `pip install` commands are
required. The Package Legitimacy Audit protocol is therefore **not applicable** - skip it; there is
nothing to run `slopcheck` against.

## Package Legitimacy Audit

Not applicable - this phase installs no external packages (confirmed: zero new dependencies in any
of the five sub-changes; all are internal SQL migrations, Go refactors, and one frontend prop).

## Architecture Patterns

### Permission-Check Flow (current, for Weg 1/2/6)

```
Request -> Handler -> permissionSvc.CanForFansubGroup/CanForRelease(actor, action, scopeID)
             |                         |
             |                         v
             |                permissions.Service.canForContext
             |                         |
             |            resolver.ResolveFansubGroup/ResolveRelease (DB)
             |                         |
             |              ResolveGroupRights -> role_capabilities cache (in-memory,
             |              loaded at startup via LoadCache/ReloadCache)
             |                         |
             v                 Result{Allowed, ReasonCode, MatchedRole}
   if !Allowed: writePermissionDenied(c, result)  [403]
   if Allowed:  continue to upload/persist logic
```

**Weg 2's current deviation (to be removed for upload only):** after `!result.Allowed`,
`fansub_media_upload.go:63-78` additionally queries
`mediaRepo.GetFansubGroupMediaPermissionsForAppUser` (a separate table,
`fansub_group_member_media_permissions`) and allows upload if `CanUpload` is true there. This is the
second rights layer D-10 removes.

**Weg 4's enforcement (unaffected by this phase except for the new display flag):**
```
POST /api/admin/upload -> MediaUploadHandler.Upload -> h.authorizeUpload(c)
  -> if asset_type == "segment_preview": h.segmentPreviewAuthorizer (segment-right check)
  -> else: h.requireAdmin(c) -> requirePlatformAdminIdentity(c, authzRepo, adminRoleName)
       -> checker.AppUserHasGlobalRole(ctx, appUserID, "platform_admin")  [hardcoded role name string]
```
This is **not** wired through `action_definitions`/`role_capabilities` at all - it is a direct global
role check. D-02 explicitly accepts this as out of scope for capability-registry conversion; only the
missing frontend display flag is being added.

### Recommended Project Structure (files touched, no new directories)

```
database/migrations/
├── 0182_release_version_theme_asset_upload.up.sql    # D-12 (next free number, confirmed by `ls`)
└── 0182_release_version_theme_asset_upload.down.sql

backend/internal/permissions/
└── permissions.go                                     # new Action const + allKnownActions entry (D-12)

backend/internal/handlers/
├── fansub_media_upload.go                              # D-10: delete fallback branch (lines ~63-78)
├── admin_content_release_theme_assets.go                # D-12 (swap action), D-NN (extract persist helper)
└── admin_content_release_theme_assets_persist.go        # NEW FILE recommended - see "Don't Hand-Roll"
    below for why NOT to append to the existing 559-line file

backend/internal/repository/
├── media_repository.go                                  # SoftDeleteFansubGroupMedia -> delegates to new helper
├── release_version_media_repository.go                  # SoftDeleteReleaseVersionMedia -> delegates to new helper
└── media_soft_delete.go                                 # NEW FILE recommended for the shared helper (D-14)

frontend/src/app/admin/anime/components/AnimeEditPage/
└── AnimeJellyfinAssetUploadControls.tsx                  # D-13: thread isPlatformAdmin prop
```

### Pattern 1: Adding a new data-driven action (D-12)

**What:** Insert one row into `action_definitions` and N rows into `role_capabilities` via a forward
migration, following the exact shape of migration `0173` (the most recent precedent of this kind).

**When to use:** Whenever a new `permissions.Action` constant is introduced that handlers will check
via `permissionSvc.CanForFansubGroup`/`CanForRelease`.

**Example (verified against actual migration file):**
```sql
-- Source: database/migrations/0173_release_version_notes_view_all.up.sql (verbatim precedent)
BEGIN;

INSERT INTO action_definitions (
    code, label_de, category, sort_order, description_de, help_text_de, user_overridable
) VALUES (
    'release_version_theme_asset.upload',
    'Theme-Video hochladen',
    'release',
    90,
    'Theme-Video (Opening/Ending) fuer eine Release-Version hochladen.',
    NULL,
    false
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('designer', 'release_version_theme_asset.upload'),
    ('editor', 'release_version_theme_asset.upload'),
    ('encoder', 'release_version_theme_asset.upload'),
    ('fansub_lead', 'release_version_theme_asset.upload'),
    ('karaoke_fx', 'release_version_theme_asset.upload'),
    ('project_lead', 'release_version_theme_asset.upload'),
    ('quality_checker', 'release_version_theme_asset.upload'),
    ('raw_provider', 'release_version_theme_asset.upload'),
    ('timer', 'release_version_theme_asset.upload'),
    ('translator', 'release_version_theme_asset.upload'),
    ('typesetter', 'release_version_theme_asset.upload')
ON CONFLICT DO NOTHING;

COMMIT;
```
Role list above is **live-DB-verified** (`SELECT role_code FROM role_capabilities WHERE
action_code='release_version_media.upload'` against `team4s_v2` returned exactly these 11 roles,
matching D-12/179-CONTEXT.md's fact-check claim exactly). `category='release'` and
`user_overridable=false` match `release_version_media.upload`'s own row
(`[VERIFIED: team4s_v2 live query]`). `sort_order=90` is free (max observed in category `release` was
85 for `release_version.segments.manage`; live query `SELECT max(sort_order) FROM action_definitions`
returned 260 overall, so no collision risk either way) `[VERIFIED: team4s_v2 live query]`.

**Go-side companion change required (`permissions.go`):**
```go
// Add to the const block (after ActionReleaseVersionMediaReorder or similar, permissions.go:48)
ActionReleaseThemeAssetUpload Action = "release_version_theme_asset.upload"

// Add to allKnownActions (permissions.go:224-266) - REQUIRED or LoadCache fails closed at startup
// (validateCapabilityCatalog returns an error if any allKnownActions entry has no role_capabilities
// row and is not in standaloneActions - permissions.go:402-418)
```
Do NOT add the new action to `standaloneActions` (permissions.go:271) - it must have real
`role_capabilities` rows per D-12, unlike `ActionFansubGroupInvitationsAccept`.

### Pattern 2: Removing the upload-only custom-permission fallback (D-10)

**What:** `fansub_media_upload.go` lines 63-78 (verified against current file, confirmed in
179-CONTEXT.md's own line citation) wrap the `!result.Allowed` branch with a second lookup against
`GetFansubGroupMediaPermissionsForAppUser`. This entire `if kind == models.MediaKindImage &&
h.mediaRepo != nil { ... allowedByCustomMediaPermission = customPerms.CanUpload }` block, plus its
`if !allowedByCustomMediaPermission` wrapper, collapses to a direct denial once removed:

```go
// BEFORE (current, lines 63-78):
if !result.Allowed {
    allowedByCustomMediaPermission := false
    if kind == models.MediaKindImage && h.mediaRepo != nil {
        customPerms, permErr := h.mediaRepo.GetFansubGroupMediaPermissionsForAppUser(c.Request.Context(), fansubID, identity.AppUserID)
        if permErr != nil {
            writePermissionInternalError(c, permErr, "...")
            return
        }
        allowedByCustomMediaPermission = customPerms.CanUpload
    }
    if !allowedByCustomMediaPermission {
        auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, action, result)
        writePermissionDenied(c, result)
        return
    }
}

// AFTER (D-10):
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, action, result)
    writePermissionDenied(c, result)
    return
}
```
**Confirmed isolated:** `GetFansubGroupMediaPermissionsForAppUser` and the
`fansub_group_member_media_permissions` table it reads remain fully intact -
`fansub_media_delete.go:70-98` (`deleteFansubGroupMedia`) calls the *same* repository method
independently for `can_delete_own`/`can_delete_all`, and that call site is untouched by this change
(D-10 explicitly keeps the delete fallback). `FansubGroupMediaUploadedByAppUser` (also used only by
the delete path) is likewise untouched. No other call sites of
`GetFansubGroupMediaPermissionsForAppUser` exist in the handlers package
(`[VERIFIED: grep -rn "GetFansubGroupMediaPermissionsForAppUser" backend/internal/handlers/*.go`
returns exactly these two call sites]`).

### Pattern 3: Extracting the duplicated theme-asset persistence block (1.6, D-06 file-size discipline)

**What:** `UploadReleaseThemeAsset` (lines 266-329 per 179-CONTEXT.md's own citation, confirmed by
this research against the current 559-line file) and `UploadReleaseThemeAssetForRelease` (lines
449-494, the structurally identical continuation) both run: `CreateMediaAsset` ->
`InsertMediaFile("original", ...)` -> `CreateReleaseThemeAsset` -> cleanup-on-error. The only
difference between the two call sites is which `*int64`/`int64` release ID variable is in scope
(`*releaseID` vs. `releaseID`) and the log message prefix.

**Established convention to follow:** `FansubHandler` already has exactly this shape -
`persistFansubMediaAsset` (`fansub_media_upload.go:240-306`) is a private method on `*FansubHandler`
that both the single-file and multi-file upload paths call. `AdminContentHandler` already has the
required fields (`mediaRepo *repository.MediaRepository`, `themeRepo adminThemeRepository`) to host
an equivalent method - `[VERIFIED: grep "type AdminContentHandler struct" in admin_content_handler.go
shows both fields present]`.

**Recommended signature (new file, see Project Structure above re: 450-line limit):**
```go
// admin_content_release_theme_assets_persist.go (new file)
func (h *AdminContentHandler) persistReleaseThemeAsset(
    c *gin.Context,
    releaseID int64,
    themeID int64,
    fileHeader *multipart.FileHeader,
    data []byte,
    visibilityCode string,
    reviewStatusCode string,
) (*models.AdminReleaseThemeAsset, bool) {
    // SaveReleaseThemeVideoUpload -> CreateMediaAsset -> InsertMediaFile -> CreateReleaseThemeAsset
    // with the same cleanup-on-error chain both current call sites already have.
}
```
Both `UploadReleaseThemeAsset` and `UploadReleaseThemeAssetForRelease` call this after their own
theme-segment-lock checks (those checks differ structurally - `GetCanonicalFansubAnimeRelease` vs.
direct `releaseID` param - and should NOT be folded into the shared helper, only the persistence tail
should be).

**Why a new file, not appended to the existing file:** `admin_content_release_theme_assets.go` is
already 559 lines - **already over the stated 450-line limit before any change in this phase**
(`[VERIFIED: wc -l]`). Extracting ~65 duplicated lines into a separate file will shrink the original
file by roughly that much (the two call sites each shrink to a short call), which is a net
improvement, but appending the new helper to the same file instead of a new one would partially
undo that gain. See "Don't Hand-Roll" below for the broader file-size finding.

### Pattern 4: Shared soft-delete helper (D-14)

**What:** `SoftDeleteFansubGroupMedia` (`media_repository.go:1041-1062`) and
`SoftDeleteReleaseVersionMedia` (`release_version_media_repository.go:374-392`) are **both already
methods on the same Go struct**, `*MediaRepository` - `[VERIFIED: grep "func (r \*MediaRepository)"
in both files confirms identical receiver type]`. They differ only in: table name
(`fansub_group_media` vs. `release_version_media`), key predicate (`group_id=$1 AND media_id=$2` vs.
`id=$1`), and whether `updated_at = NOW()` is also set (group variant sets it, release variant does
not - `[VERIFIED: direct file comparison]`, a difference the shared helper must preserve to avoid a
silent behavior change).

**No existing generic "shared SQL skeleton, parametrized table" helper exists *within*
`MediaRepository` today** - this would be the first of this specific shape in that struct. However, a
directly analogous precedent for the underlying technique (trusted-constant table name via
`fmt.Sprintf`, looped/parametrized across tables) already exists elsewhere in this package:
```go
// Source: backend/internal/repository/media_upload.go:366-382 (MediaUploadRepository, a sibling
// repository struct - precedent for the fmt.Sprintf(table) pattern, not the same struct)
for _, table := range joinTables {
    query := fmt.Sprintf("DELETE FROM %s WHERE media_id = $1", table)
    _, err := r.getConn().Exec(ctx, query, id)
    ...
}
```
**Recommended shape for the new shared helper** (new file `media_soft_delete.go`, since both existing
files are already large - 1153 and 801 lines respectively):
```go
// softDeleteMediaRelation is the shared SQL skeleton behind SoftDeleteFansubGroupMedia and
// SoftDeleteReleaseVersionMedia (Fachaufgabe 8 #5/#6, D-14). table and keyPredicate are always
// trusted Go string literals supplied by the two call sites below, never user input.
func (r *MediaRepository) softDeleteMediaRelation(
    ctx context.Context,
    table string,
    keyPredicate string,
    keyArgs []interface{},
    touchUpdatedAt bool,
    deletedByUserID *int64,
) error {
    var deletedBy interface{}
    if deletedByUserID != nil {
        deletedBy = *deletedByUserID
    }
    setClause := "deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id = $%d)"
    if touchUpdatedAt {
        setClause += ", updated_at = NOW()"
    }
    args := append(keyArgs, deletedBy)
    query := fmt.Sprintf("UPDATE %s SET "+setClause+" WHERE %s AND deleted_at IS NULL", table, len(args), keyPredicate)
    tag, err := r.db.Exec(ctx, query, args...)
    if err != nil {
        return fmt.Errorf("soft delete %s: %w", table, err)
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
```
(Exact parameter-placeholder numbering is illustrative - the planner/executor should write this with
concrete `$1`/`$2`/`$3` per call site rather than dynamic placeholder-number string formatting, to
keep the SQL fully static per call site and avoid any ambiguity; a simpler two-call-site-only
`fmt.Sprintf` with fixed `$1`/`$2`/`$3` slots, one wrapper per table, is equally valid and arguably
safer/more readable than full parametrization - this is implementation-detail discretion, not a
locked decision.)

### Anti-Patterns to Avoid

- **Hardcoded role checks in new handler code (D-02):** Do not add `if role == "platform_admin"` or
  similar inline checks for the Weg 1/2/6 changes - only Weg 4 is allowed to keep its existing
  hardcoded platform-admin guard (pre-existing, not newly introduced).
- **Touching the delete-path fallback (D-10):** `fansub_media_delete.go:70-98`'s
  `GetFansubGroupMediaPermissionsForAppUser` call and `FansubGroupMediaUploadedByAppUser` must remain
  byte-for-byte unchanged.
- **Merging the theme-segment-lock checks into the persistence helper:** `GetCanonicalFansubAnimeRelease`,
  `HasGlobalThemeSegmentCoverageForRelease`, `HasReleaseAssetSegmentUploadBlockedForRelease` differ
  structurally between the two handlers (one resolves `releaseID` from fansub+anime, the other
  receives it directly) - only the persistence tail (CreateMediaAsset onward) should be shared.
  Folding the lock checks in would silently change control flow for one of the two entry points.
- **Dropping `updated_at = NOW()` from the group-media branch or adding it to the release-media
  branch** when unifying the soft-delete SQL - this is an existing, deliberate behavioral difference
  (D-14 requires "Verhalten bleibt für beide Domänen unverändert").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| New permission action wiring | A new in-code role-check branch | `action_definitions` + `role_capabilities` migration (Pattern 1) | D-02 mandates data-driven rights; `validateCapabilityCatalog` fails the server startup if an action isn't registered this way |
| Platform-admin check for Weg 4's display flag | A new granular capability action in the registry | The existing `is_platform_admin` boolean already returned by `getCurrentUser()` | D-13 explicitly binds the display flag 1:1 to platform-admin, which is already a fully-built, already-fetched field - inventing a capability action here would contradict D-13's own "keine Rechteerweiterung" framing |
| Soft-delete SQL for a new table in future phases | A third copy-pasted `UPDATE ... deleted_at = NOW()` block | The shared helper this phase introduces (Pattern 4) | That is explicitly the point of Fachaufgabe 8 #5/#6 - this phase's helper becomes the reusable seam for any future soft-deletable media table |

**Key insight:** This phase is entirely internal-convention replication, not new-technology adoption.
Every one of the five changes already has a near-identical precedent somewhere in this exact repo
(migration 0173, `persistFansubMediaAsset`, `media_upload.go`'s table-name loop,
`PlatformAdminGate.tsx`'s own `is_platform_admin` consumption). The research risk in this phase is NOT
"which library to pick" - it is "did I find the real precedent or did I invent a plausible-sounding
one." All precedents cited above were read directly from the current file contents, not from memory.

## Common Pitfalls

### Pitfall 1: Forgetting the Go-side `allKnownActions` registration for the new action (D-12)

**What goes wrong:** A migration adds the `action_definitions`/`role_capabilities` rows, but the
server fails to start (or the in-memory cache silently never grants the new action) because
`permissions.go`'s `allKnownActions` slice (lines 224-266) wasn't updated.
**Why it happens:** `validateCapabilityCatalog` (permissions.go:402-418) is a safety net for the
*opposite* direction (catches an action declared in Go but missing from the DB) - it does NOT catch
"action exists in the DB but was never referenced as a Go constant," because nothing in Go code would
ever check for that unreferenced DB-only action. The real failure mode is subtler: the handler code
checking `permissions.ActionReleaseThemeAssetUpload` simply won't compile until the constant exists,
so this specific pitfall mostly self-corrects via compile errors - the actual risk is the reverse
(declaring the constant and adding it to `allKnownActions` but forgetting the migration), which DOES
fail closed at startup via `validateCapabilityCatalog`.
**How to avoid:** Run the backend's existing startup path (or a targeted test that calls
`permissions.NewService(...).LoadCache` against a real/fixture DB with the new migration applied)
before considering D-12 done.
**Warning signs:** Server fails to start with `"permission cache: Action ... fehlt in
role_capabilities und ist keine standalone-Action"`.

### Pitfall 2: Line-count regression from the extraction work (D-06)

**What goes wrong:** `admin_content_release_theme_assets.go` (559 lines) and `fansub_media_upload.go`
(559 lines) are both already well over this project's stated 450-line production-file limit *before*
this phase starts (`[VERIFIED: wc -l]`). D-06 only commits to keeping the *new* soft-delete helper and
theme-asset persistence extraction under 450 lines - it does not commit to bringing the two
pre-existing oversized files back under the limit. A planner reading D-06 literally could either (a)
correctly scope the new-file-only interpretation, or (b) over-scope into a full refactor of
`fansub_media_upload.go` that is not requested anywhere in CONTEXT.md.
**Why it happens:** The 450-line rule is a CLAUDE.md-wide convention, and D-06 restates it narrowly
for this phase's two new artifacts - the gap between the global rule and the phase-local commitment is
easy to blur.
**How to avoid:** Scope strictly to D-06's literal wording: keep the new soft-delete helper file and
the new theme-asset persistence helper file under 450 lines each. Do not add a task to shrink the two
pre-existing 559-line files below 450 unless the user explicitly asks for it in a future phase -
extraction will shrink `admin_content_release_theme_assets.go` somewhat as a side effect, but "get it
under 450" is not a locked deliverable here.
**Warning signs:** A plan task titled something like "refactor fansub_media_upload.go to meet the
450-line limit" that goes beyond the D-10 fallback-removal diff.

### Pitfall 3: Assuming D-13 requires a backend change

**What goes wrong:** Reading "neue Anzeige-Capability" literally suggests a new `action_definitions`
row is needed, leading to an unnecessary migration and an unnecessary new `permissions.Action`
constant for something that is, per D-02's own clarifying parenthetical, explicitly NOT
capability-based.
**Why it happens:** The word "Capability" in German CONTEXT.md prose is being used colloquially
("the thing that controls whether this is shown"), not in the technical `action_definitions` sense
used everywhere else in this phase.
**How to avoid:** Re-read D-02's own text: "das Anzeige-Flag aus 1.4 ergänzt nur die fehlende
UI-Seite" - this is frontend-only. Confirmed by code: `POST /api/admin/upload`'s enforcement path
never touches `role_capabilities` (Architecture Patterns, Weg 4 flow above).
**Warning signs:** A plan task that adds a migration for something like
`anime_asset.upload_display` or similar to `action_definitions`.

### Pitfall 4: Threading `is_platform_admin` down without checking for duplicate network calls

**What goes wrong:** `AnimeJellyfinAssetUploadControls.tsx` has no existing access to `currentUser`
data at all - neither its direct parent (`AnimeJellyfinMetadataSection.tsx`) nor the page-level
component (`AdminAnimeEditContent` in `admin/anime/[id]/edit/page.tsx`) currently fetch or hold
`CurrentUserData`. `PlatformAdminGate.tsx` calls `getCurrentUser()` internally but does not expose the
result to its children via context or props - it only conditionally renders. A naive implementation
could add a second, independent `getCurrentUser()` call inside
`AnimeJellyfinAssetUploadControls.tsx`, which works but duplicates a network call that already
happened once at the page-gate level on every page load.
**Why it happens:** No `CurrentUserContext`/`useCurrentUser()` hook exists anywhere in the frontend
today - `[VERIFIED: grep -rln "CurrentUserContext\|useCurrentUser\b" src returns nothing]`. This is
the first place in the codebase that would need `currentUser` data threaded past the gate component
itself.
**How to avoid:** This is a genuine design decision for the planner, not a locked choice - two viable
options exist: (a) have `AnimeJellyfinAssetUploadControls.tsx` call `getCurrentUser()` itself (simple,
isolated, one extra network call per page load, consistent with how other components in this
codebase independently fetch their own data), or (b) extend `PlatformAdminGate` to expose
`isPlatformAdmin` to children (e.g., via a render-prop or a lightweight context), avoiding the
duplicate call but touching a shared, widely-used gate component. Given this phase's narrow backend
focus and D-04's explicit "no new frontend building blocks" framing, option (a) is the lower-risk,
more isolated choice and is this research's recommendation - but document this explicitly as an open
implementation choice for the plan, not something this research locks in.
**Warning signs:** A plan task that modifies `PlatformAdminGate.tsx`'s public exported shape without
a clear need from elsewhere in the codebase.

## Code Examples

### Existing precedent: handler-level persistence extraction (to mirror for 1.6)

```go
// Source: backend/internal/handlers/fansub_media_upload.go:240-306 (persistFansubMediaAsset)
// This EXACT shape (CreateMediaAsset -> InsertMediaFile -> downstream link -> cleanup-on-error)
// is what UploadReleaseThemeAsset/UploadReleaseThemeAssetForRelease's shared tail should mirror.
func (h *FansubHandler) persistFansubMediaAsset(
    c *gin.Context,
    userID int64,
    fansubID int64,
    kind models.MediaKind,
    saveResult *services.MediaSaveResult,
    sourceResult *services.MediaVariantSaveResult,
) (*models.MediaAsset, bool) {
    asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
    // ... error handling, InsertMediaFile, AssignFansubMedia, cleanup-on-error chain
}
```

### Existing precedent: real-Postgres soft-delete behavior test (template for D-14's tests)

```go
// Source: backend/internal/repository/release_version_media_repository_test.go:205-231
// (TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows) - directly reusable shape for
// testing the new shared soft-delete helper against BOTH tables.
func TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows(t *testing.T) {
    pool := openReleaseVersionMediaReplaceFixture(t)
    ctx := context.Background()
    repo := NewMediaRepository(pool, "")

    _, err := pool.Exec(ctx, `UPDATE release_version_media SET deleted_at = NOW() WHERE id = 602`)
    require.NoError(t, err)

    items, err := repo.ListReleaseVersionMedia(ctx, 41)
    require.NoError(t, err)
    // ... asserts soft-deleted row excluded, live row still present
}
```

### Existing precedent: handler permission-gate behavior test (template for D-10/D-12 tests)

```go
// Source: backend/internal/handlers/fansub_media_permission_test.go:45-141 (full file read).
// loadAppAuthCapabilityTestCache(t) (app_auth_test.go:255) loads the real role_capabilities cache
// fixture - required before any test that exercises permissionSvc.CanForFansubGroup.
func TestFansubGroupMediaUploadRejectsMissingGroupRole(t *testing.T) {
    gin.SetMode(gin.TestMode)
    var body bytes.Buffer
    writer := multipart.NewWriter(&body)
    writer.WriteField("kind", "image")
    writer.Close()

    handler := &FansubHandler{
        permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}), // no roles
    }
    recorder := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(recorder)
    c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/88/media", &body)
    c.Request.Header.Set("Content-Type", writer.FormDataContentType())
    c.Params = gin.Params{{Key: "id", Value: "88"}}
    c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active"})

    handler.UploadFansubMedia(c)

    if recorder.Code != http.StatusForbidden {
        t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
    }
}
```
**Important note for D-10's regression test:** this existing test (`h.mediaRepo` is `nil` in the
fixture) does NOT currently exercise the custom-permission-fallback branch at all, because the branch
is guarded by `h.mediaRepo != nil`. This test will continue to pass unchanged after D-10's removal -
it is not sufficient proof that the fallback was removed. The planner must add a *new* test with a
non-nil `mediaRepo` fake that previously would have returned `CanUpload: true` and now must assert a
403 regardless (proving the fallback path no longer exists), per D-05's real-behavior-test rule.

### Existing precedent: theme-asset handler test fixture (template for D-12's new action test)

```go
// Source: backend/internal/handlers/admin_content_release_theme_assets_test.go:23-60 (excerpt)
// releaseThemeAssetDeniedResolverStub + releaseThemeAssetRepoStub already exist in this exact test
// file and are the natural fixtures to extend/reuse when swapping the permission action in D-12's
// tests (resolver returns a real group/release context so a genuine role-based 403 is exercised,
// not a short-circuited 404).
type releaseThemeAssetDeniedResolverStub struct{}
func (releaseThemeAssetDeniedResolverStub) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
    return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}
```

## State of the Art

Not applicable in the usual sense (no external library version drift to track). The one relevant
"state of the art" shift is internal: this codebase's permission model has moved, over several prior
phases (108 -> 146 -> 150 -> 173), from a hardcoded Go `roleMatrix` (now retained only as a commented
historical reference, `permissions.go:104-206`) to a fully DB-driven `action_definitions`/
`role_capabilities` registry with an in-memory cache loaded at startup. D-12's new action must join
that already-completed migration, not the old pattern.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Hardcoded Go `roleMatrix` map | `action_definitions` + `role_capabilities` tables, loaded into an in-memory cache at startup | Migration 0108 (historical) | Any new action MUST be added via migration + `allKnownActions`, never as a new Go-only role check |

**Deprecated/outdated:** The commented-out `roleMatrix` block in `permissions.go:104-206` is
explicitly marked "Historical bootstrap grants retained as documentation only. Runtime authority is
PostgreSQL." - do not use it as a reference for role lists; always query the live DB or
`role_capabilities` seed migrations instead (as this research did).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recommended `sort_order=90` and `category='release'` for the new `release_version_theme_asset.upload` action_definitions row are safe/non-colliding choices | Pattern 1 | Low - `sort_order` has no uniqueness constraint found in the schema (`\d action_definitions` showed no unique index on sort_order), so even a collision would not fail the migration; purely cosmetic ordering in any future capability-matrix UI |
| A2 | Exact action code string `release_version_theme_asset.upload` (vs. e.g. `release_theme_asset.upload`) matches this codebase's naming convention | Pattern 1 | Low-medium - naming is a cosmetic/discretionary choice within D-12's intent ("eigene Aktion"); no functional impact as long as it's consistent across the migration, the Go constant, and `allKnownActions` |
| A3 | Frontend should use option (a) (component calls `getCurrentUser()` itself) rather than extending `PlatformAdminGate` for D-13's prop-threading | Pitfall 4 | Low - this is explicitly flagged as an open implementation choice, not asserted as fact; either option satisfies D-13's behavior-test requirement |

**Note:** No claims in this research are tagged `[ASSUMED]` in the strict "unverified package/library
claim" sense the provenance rules describe, because this phase introduces no external packages.
Table A1-A3 above lists genuine open implementation-detail choices (not verified-vs-unverified facts)
surfaced for the planner's awareness, distinct from the package-provenance concern the `[ASSUMED]` tag
is designed for.

## Open Questions (RESOLVED)

Both questions were resolved by the planner during `/gsd:plan-phase 179` — recorded here for
traceability, no further input needed.

1. **Exact new action code string (`release_version_theme_asset.upload` vs. an alternative)** — RESOLVED.
   - What we know: D-12 only specifies the *role list* must match `release_version_media.upload`
     exactly; it does not specify the exact string for the new action code.
   - What's unclear: Whether `release_version_theme_asset.upload` or some other name (e.g.
     `release_theme_asset.upload`, dropping "version") better matches this codebase's naming
     convention, which generally prefixes with the owning entity (`release_version_media.*`,
     `fansub_group_media.*`).
   - Recommendation: Use `release_version_theme_asset.upload` (mirrors `release_version_media.upload`
     most closely, since theme assets are a sibling concept to release-version media) unless the
     planner/user prefers otherwise - this is a pure naming choice with zero behavioral impact.
   - **Chosen answer:** `release_version_theme_asset.upload` — the recommendation, adopted verbatim
     in `179-01-PLAN.md` Task 1 (migration 0182).

2. **D-13's exact frontend wiring mechanism (component self-fetch vs. gate-exposed context)** — RESOLVED.
   - What we know: Both are functionally correct and satisfy D-13's stated behavior-test requirement.
   - What's unclear: Which the user/planner prefers from a code-structure standpoint (see Pitfall 4).
   - Recommendation: Default to the component-self-fetch approach (lower blast radius, no change to
     the widely-used `PlatformAdminGate` component) unless the plan-checker or user flags a preference
     for the shared-context approach.
   - **Chosen answer:** Component self-fetch — the recommendation, adopted verbatim in
     `179-05-PLAN.md` Task 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|------------|---------|----------|
| Postgres (team4sv30-db) | Migration 0182, soft-delete helper tests | Yes | 16 (`postgres:16` image) | - |
| Go 1.25 | All backend changes | Yes (per `backend/go.mod`, `backend/Dockerfile` running inside `team4sv30-backend` container) | 1.25 | - |
| Docker Compose services | `docker compose exec`-based live DB verification during this research | Yes | `team4sv30-db` healthy, 9 days uptime | - |
| Node/npm/vitest | D-13's frontend test | Not independently re-verified this session, but `frontend/package.json` already defines `"test": "vitest run"` and `team4sv30-frontend` container is `Up` per `docker compose ps` | - | - |

No missing dependencies with or without fallback - this phase requires nothing beyond what is already
running in the project's standard Docker Compose stack.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go's built-in `testing` package + `testify` (`require`/`assert`) + `httptest` |
| Backend config file | none (standard `go test`, no special config) |
| Backend quick run command | `cd backend && go test ./internal/handlers/... ./internal/repository/... ./internal/permissions/...` |
| Backend full suite command | `cd backend && go test ./...` |
| Frontend framework | Vitest 3 (`frontend/vitest.config.ts`) |
| Frontend quick run command | `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` |
| Frontend full suite command | `cd frontend && npm test` |

### Phase Requirements -> Test Map

| D-ID | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|--------------------|--------------|
| D-10 | Upload fallback removed; non-nil `mediaRepo` fake that previously allowed via `CanUpload=true` must now 403 | unit (httptest, fake repo) | `go test ./internal/handlers/... -run TestFansubGroupMediaUpload -v` | ❌ Wave 0 (new test needed; existing `fansub_media_permission_test.go` tests don't exercise the non-nil-mediaRepo fallback branch) |
| D-10 | Delete fallback (`can_delete_own`/`can_delete_all`) still works unchanged | regression | `go test ./internal/handlers/... -run TestFansubGroupMediaDelete -v` | ✅ existing tests in `fansub_media_permission_test.go` cover the no-role-403 case; confirm no new test needed if scope stays at "unchanged" |
| D-11 | Every active group role still grants upload via baseline capability (no narrowing/widening) | regression | `go test ./internal/handlers/... -v` (existing fansub media upload tests) | ✅ existing |
| D-12 | New `ActionReleaseThemeAssetUpload` action grants the same 11 roles; old `ActionReleaseVersionMediaUpload` no longer gates these two handlers | unit (httptest, fake resolver/repo via `releaseThemeAssetRepoStub`) | `go test ./internal/handlers/... -run TestAdminContentReleaseThemeAsset -v` | ❌ Wave 0 (needs new/updated cases in `admin_content_release_theme_assets_test.go` asserting the new action is checked, not the old one) |
| D-12 | Migration 0182 applies/rolls back cleanly, seeds exactly the 11 verified roles | integration (real Postgres via migration runner) | `cd backend && go run ./cmd/migrate up` then a DB assertion query, or a repository-level test against a migrated fixture pool | ❌ Wave 0 |
| D-13 | Non-admin -> upload controls hidden/disabled flag false; admin -> flag true | unit (React component test, Vitest) | `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` | ❌ Wave 0 (no test file currently exists for this component - `[VERIFIED: no AnimeJellyfinAssetUploadControls.test.tsx found]`) |
| D-14 | Shared soft-delete helper: both tables exclude soft-deleted rows after delete; `updated_at` behavior difference preserved per table | integration (real Postgres, mirrors existing `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`) | `go test ./internal/repository/... -run SoftDelete -v` | ✅ partial (`release_version_media_repository_test.go:205` exists for the release side; the fansub-group-media side and the shared-helper-specific assertions are Wave 0) |

### Sampling Rate

- **Per task commit:** targeted `go test ./internal/handlers/... -run <TestName>` or
  `./internal/repository/... -run <TestName>` for the touched package; `npm test -- <file>` for the
  one touched frontend component.
- **Per wave merge:** `cd backend && go test ./...` and `cd frontend && npm test` (full suites).
- **Phase gate:** Full backend + frontend suites green, plus `go build ./...` and `git diff --check`,
  before `/gsd:verify-work` (matching Phase 178's documented closing-gate pattern, `178-07-PLAN.md`).

### Wave 0 Gaps

- [ ] New httptest case in `fansub_media_permission_test.go` or a new file asserting the upload
      fallback no longer grants access with a non-nil fake `mediaRepo` returning `CanUpload: true`
      (D-10's actual regression proof - the existing nil-repo test does not cover this).
- [ ] New/updated cases in `admin_content_release_theme_assets_test.go` reusing
      `releaseThemeAssetDeniedResolverStub`/`releaseThemeAssetRepoStub` to assert both theme-asset
      handlers check `ActionReleaseThemeAssetUpload`, not `ActionReleaseVersionMediaUpload`.
- [ ] New repository test (likely in a new `media_soft_delete_test.go` or appended to
      `release_version_media_repository_test.go`) exercising the shared helper against BOTH
      `fansub_group_media` and `release_version_media`, including the `updated_at`-set-vs-not
      difference.
- [ ] New `AnimeJellyfinAssetUploadControls.test.tsx` - no test file for this component exists today.
- [ ] Migration 0182 up/down fresh-apply verification (per CLAUDE.md's QUAL-04-style convention seen
      elsewhere in this project: reversible migrations with fresh up/down proof).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V4 Access Control | Yes | `permissions.Service` capability-registry checks (`CanForFansubGroup`/`CanForRelease`); this phase's core subject matter |
| V5 Input Validation | Partial | Existing `validVisibilityCodes`/`validReviewStatusCodes` whitelist checks (unchanged by this phase); new migration SQL uses only static, non-user-controlled table/column identifiers |
| V2 Authentication | No (unchanged) | Existing `middleware.AuthIdentity` / Keycloak-backed session handling, not touched by this phase |
| V6 Cryptography | No | Not applicable to this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Privilege escalation via stale/duplicate rights-check path | Elevation of Privilege | This is literally what D-10 fixes (two parallel rights layers for the same action) - the mitigation is collapsing to one authoritative check, already the plan |
| SQL injection via table-name interpolation in the new shared soft-delete helper | Tampering | Table name and key-predicate strings passed to the shared helper MUST remain Go string literals supplied by the two call sites, never derived from request/user input - both current call sites already satisfy this (fixed table names), so the refactor must preserve that invariant explicitly, not introduce a caller that passes a request-derived table name |
| Server fails to start with a half-applied migration/registry mismatch, masking an access-control gap | Denial of Service / fail-open risk | `validateCapabilityCatalog`'s fail-closed startup check (already in place) catches a Go-constant-without-DB-row mismatch; the inverse (DB row without a Go constant ever checking it) is harmless by construction since no code path can grant via an action nothing checks for |

## Sources

### Primary (HIGH confidence - direct file reads and live DB queries this session)

- `backend/internal/handlers/fansub_media_upload.go` (full file, 559 lines) - Weg 2 fallback location, `persistFansubMediaAsset` precedent
- `backend/internal/handlers/fansub_media_delete.go` (full file, 128 lines) - confirms delete-path fallback untouched by D-10
- `backend/internal/handlers/admin_content_release_theme_assets.go` (full file, 559 lines) - both theme-asset upload handlers, duplicate persistence block
- `backend/internal/handlers/admin_content_release_theme_assets_test.go` (excerpt) - existing test fixtures to extend
- `backend/internal/handlers/fansub_media_permission_test.go` (full file) - behavior-test template
- `backend/internal/handlers/media_upload.go`, `media_upload_segment_preview.go` - Weg 4 enforcement flow (platform-admin guard, not capability-based)
- `backend/internal/handlers/platform_admin_authz.go` (full file) - `requirePlatformAdminIdentity` implementation
- `backend/internal/permissions/permissions.go` (full file, 968 lines) - Action constants, `allKnownActions`, `validateCapabilityCatalog`, `MembershipBaselineActionCodes`
- `backend/internal/repository/media_repository.go` (relevant sections, 1153 lines total) - `SoftDeleteFansubGroupMedia`, `GetFansubGroupMediaPermissionsForAppUser`, `FansubGroupMediaUploadedByAppUser`
- `backend/internal/repository/release_version_media_repository.go` (relevant sections, 801 lines total) - `SoftDeleteReleaseVersionMedia`
- `backend/internal/repository/release_version_media_repository_test.go` (excerpt) - real-Postgres soft-delete test template
- `backend/internal/repository/media_upload.go` (excerpt) - `fmt.Sprintf(table)` precedent in `DeleteMediaAsset`
- `database/migrations/0108_capability_registry.up.sql`, `0157_project_timeline_capability.up.sql`, `0173_release_version_notes_view_all.up.sql`/`.down.sql` - migration shape precedents
- `frontend/src/components/auth/PlatformAdminGate.tsx` (full file) - existing `is_platform_admin` consumption pattern
- `frontend/src/types/auth.ts` (excerpt) - `CurrentUserData.is_platform_admin` field
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` (full file, 662 lines) - component with no visibility check
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` (full file) - confirms page-level `<PlatformAdminGate>` wrapping
- `frontend/src/app/admin/anime/create/page.tsx` (excerpt) - confirms second call site also page-gated
- Live query against `team4s_v2` via `docker compose exec team4sv30-db psql -U team4s`: role list for `release_version_media.upload` (11 roles, matches D-12 exactly), `action_definitions` schema/columns, category/sort_order ranges
- `.planning/phases/179-.../179-CONTEXT.md` (full file) - D-01 through D-14, all fact-checks
- `.planning/STATE.md` (relevant lines via grep) - Phase 179/178 history, confirms no REQUIREMENTS.md mapping exists for Phase 179

### Secondary (MEDIUM confidence)

None - all claims in this research trace directly to a file read or live query performed this
session (Primary sources above).

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no external stack choices exist in this phase; everything is this
  repository's own established internal convention, directly observed.
- Architecture: HIGH - every pattern cited was read from the current file, not recalled from training
  data; the one genuinely novel element (shared soft-delete helper) was checked for existing
  precedent and honestly reported as "no exact precedent, but a directly analogous technique exists
  elsewhere" rather than invented.
- Pitfalls: HIGH - each pitfall is grounded in a specific, verified code fact (line counts via `wc
  -l`, grep results for call sites, the fail-closed startup check's actual behavior).

**Research date:** 2026-10-10
**Valid until:** 30 days (stable internal codebase; no external dependency drift risk) - but any
material changes to `permissions.go`, the media repository files, or `AnimeJellyfinAssetUploadControls.tsx`
landing between now and plan execution should trigger a quick re-check of the exact line numbers cited
above.
