# Requirements: Team4s Asset Lifecycle Hardening

**Defined:** 2026-04-02
**Core Value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.

## v1 Requirements

### Provisioning

- [x] **PROV-01**: Admin can provision the canonical asset folder structure for an anime with one explicit action.
- [x] **PROV-02**: Manual anime create without Jellyfin data auto-provisions the canonical anime asset folders on first upload.
- [x] **PROV-03**: Running provisioning repeatedly is idempotent and reports whether folders were created or already present.
- [x] **PROV-04**: Provisioning blocks invalid entity IDs, invalid entity types, and unsafe paths before any filesystem change is attempted.

### Upload Lifecycle

- [x] **UPLD-01**: Admin can upload manual assets through one generic admin upload contract instead of slot-specific special cases.
- [x] **UPLD-02**: The generic upload contract supports at least `cover`, `banner`, `logo`, `background`, and `background_video`.
- [x] **UPLD-03**: Uploaded anime assets are linked to the correct anime and asset slot through one reusable V2 persistence path.
- [x] **UPLD-04**: Admin can replace an existing asset in a slot and immediately see that the new asset is the active persisted asset.
- [x] **UPLD-05**: Admin can remove an existing asset from an anime slot without deleting the owning anime record.

### Lifecycle Safety

- [x] **LIFE-01**: Replacing or deleting an asset follows a defined cleanup rule so old files do not remain as silent orphans.
- [x] **LIFE-02**: Upload, replace, delete, and provisioning failures return operator-usable validation and storage error details.
- [x] **LIFE-03**: Asset lifecycle actions are durably attributable to the acting admin user ID.
- [x] **LIFE-04**: Asset lifecycle rules are reusable across anime asset slots in the V2 schema instead of being hardcoded around anime covers only.

### Create-Time Enrichment

- [x] **ENR-01**: Admin can load AniSearch create-time enrichment only by entering an explicit AniSearch ID before local anime creation.
- [x] **ENR-02**: AniSearch access is centrally limited to one request at a time with at least two seconds between requests, with no free search or crawl endpoints.
- [x] **ENR-03**: If an AniSearch ID already maps to an existing local anime, the flow redirects to that anime instead of creating a duplicate record.
- [x] **ENR-04**: Create-time merge priority is strict `manual > AniSearch > Jellysync`, including fill-only handling for metadata and media.
- [x] **ENR-05**: AniSearch relation import writes only locally resolvable approved relations, skips unresolved relations, and leaves the draft usable when enrichment fails.

### Edit-Time AniSearch Enrichment

- [x] **ENR-06**: Admin can load AniSearch enrichment from `/admin/anime/[id]/edit` by entering an explicit AniSearch ID, receive the next draft state first, and still save through the existing edit PATCH flow.
- [x] **ENR-07**: Edit-route AniSearch enrichment runs in override mode with explicit protected fields; protected fields stay untouched, and provisional lookup text used only for candidate search is replaceable until the operator explicitly locks it.
- [x] **ENR-08**: If an AniSearch ID already belongs to a different local anime during edit enrichment, the endpoint returns a conflict with redirect metadata instead of silently reassigning provenance.
- [x] **ENR-09**: AniSearch enrichment on edit auto-applies only approved, locally resolvable relations to `anime_relations`, using `anisearch:{id}` lookup first and title fallback second, without duplicating existing rows.
- [x] **ENR-10**: Create and edit flows persist AniSearch provenance as `source='anisearch:{id}'`, and create persists resolved AniSearch relations best-effort after anime creation with operator-visible warning metadata when relation follow-through fails.

#### Phase 11 Wave 0 Contract Rules

- Duplicate AniSearch ownership on edit is a `409` conflict that returns `existing_anime_id`, `existing_title`, and `redirect_path`; the edit endpoint must not silently move `source='anisearch:{id}'` from one anime to another.
- Edit-route AniSearch enrichment returns the next draft first. Persisted AniSearch provenance remains part of the regular edit PATCH contract through `source='anisearch:{id}'` instead of being hidden as an enrichment side effect.
- Explicit AniSearch field protection is session-scoped. Provisional lookup text used only to find a source candidate stays replaceable until the operator explicitly protects that field, matching D-05.
- Create-time AniSearch relation persistence is best-effort follow-through after anime creation. Warning metadata belongs in the create response envelope so operators can see partial relation persistence outcomes without losing a successful create.

### Create Tags And Metadata Refactor

- [x] **TAG-01**: Normalized `tags` and `anime_tags` tables exist and anime tag links are created, updated, and deleted through the same authoritative persistence path as genres.
- [x] **TAG-02**: Admin can edit tags on `/admin/anime/create` through a dedicated visible metadata card that supports manual free-text entry and suggestion-based filling from a live token list.
- [x] **TAG-03**: Provider-supplied tags (Jellyfin or AniSearch) hydrate into the same shared token state used for manual tags on the create page so imported and manual additions converge in one UI.
- [x] **TAG-04**: The create-page metadata implementation is refactored so no single page-level file exceeds 700 lines after the tags work is added.
- [x] **TAG-05**: New or substantially touched create metadata sections and helper functions include short purpose comments explaining what a block does and when a helper should be used.

## v2 Requirements

### Asset Operations

- **ASTX-01**: Admin can run batch provisioning for multiple anime or groups safely.
- **ASTX-02**: Admin can inspect historical asset changes and cleanup outcomes.
- **ASTX-03**: Admin can configure storage policies such as retention, archive, or soft-delete behavior per asset type.

### Auth/API Lifecycle

- **TIPTAP-EDITOR-01**: Team4s text surfaces use a shared TipTap-based rich-text foundation with JSON storage, server-side rendering/sanitizing, plaintext extraction, and reusable editor/renderer components.
- **TIPTAP-COLLAB-01**: Official fansub group notes support a future narrow real-time collaboration mode without introducing a competing note store or changing release/anime ownership rules.
- **AUTH-FOUNDATION-01**: Keycloak owns login/session/token lifecycle while Team4s owns app users, global app roles, fansub memberships, and fansub-specific roles in the application database.
- **AUTHZ-ENGINE-01**: Team4s uses a central permission engine and capability responses for fansub, release, release-version, media, notes, member-management, and invitation contexts.
- **FANSUB-MEMBER-MGMT-01**: Authorized users can manage app-user based fansub group memberships and roles through Team4s permissions without storing fansub roles in Keycloak.
- **FANSUB-INVITES-01**: Authorized users can create, view, cancel, and accept token-hash fansub group invitations that create or activate scoped Team4s memberships.
- **AUTH-API-CLIENT-01**: Normal frontend API calls use one central Auth/API client that owns token reads, persistence, refresh, 401 retry, request auth headers, upload/XHR auth, and auth-state resync. Pages and components consume token-free session state and must not store or directly read Keycloak or app tokens.
- **PLATFORM-ADMIN-BOUNDARY-01**: Global admin management surfaces require platform-admin authority, while contributor workspaces expose only scoped group/release capabilities and sanitized context without sensitive admin/provider data.
- **AUTH-RESOURCE-SERVER-01**: Keycloak-issued Team4s API calls use real OIDC access tokens with a Team4s API audience. The frontend must not use ID tokens as API bearer tokens, and the backend must validate issuer, JWKS signature, expiry, audience, and authorized-party semantics while Team4s keeps domain authorization in the app database.
- **AUTH-PROFILE-ACCOUNT-RETURN-01**: The Team4s profile page must make the external Keycloak account-management handoff understandable, open Keycloak account changes in a new tab, refresh Team4s account cards through the central auth/profile seams when the user returns, and avoid overwriting unsaved Team4s profile form edits.
- **MEMBER-PROFILE-01**: Signed-in users can maintain their Team4s/Fansub historical profile independently from Keycloak account data, including fansub name, display name, avatar, bio/story, activity period, memberships, and read-only historical credits.
- **CONTRIBUTOR-DASHBOARD-01**: Signed-in contributors can view their own fansub groups, roles, capabilities, and scoped working contexts without leaking global-admin-only actions or unrelated group data.
- **MEMBER-PROFILE-HUB-01**: The Team4s own-profile surface must become a role-neutral `/me/profile` Member Identity Hub for all signed-in users, using real profile, account, membership, role, avatar, visibility, and contribution sources without mixing Keycloak identity, Team4s profile data, group roles, app permissions, or historical credits.
- **MEMBER-PROFILE-STORY-RICH-TEXT-01**: The own-profile member story must persist safe TipTap rich text through one contract-aligned profile seam, including schema migration from existing plain text, backend validation/sanitizing, plaintext extraction, shared OpenAPI/frontend DTO alignment, and token-free protected UI behavior through the central API client.
- **MEDIA-CROPPER-01**: Team4s image cropping must use one reliable shared cropper foundation for own-profile avatars and fansub group logo/media cropping, preserving each domain's existing upload endpoint, auth/API seam, and media ownership while eliminating preview/export parity bugs across desktop, mobile/touch, and keyboard use.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk migration or backfill of legacy media hosts | This milestone is about establishing the safe lifecycle contract first |
| Public-site redesign of media presentation | The focus is admin lifecycle behavior, not public UI changes |
| Automatic transcoding or media derivative generation | Separate concern from generic upload/provisioning semantics |
| Reopening the full Jellyfin intake product flow | Intake is shipped; only narrow linkage/lifecycle follow-through belongs here |
| Broader auth redesign | Existing admin-only model remains sufficient for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| PROV-02 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| PROV-03 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| PROV-04 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| UPLD-01 | Phase 7 | Complete |
| UPLD-02 | Phase 7 | Complete |
| UPLD-03 | Phase 7 | Complete |
| UPLD-04 | Phase 8 | Complete - historical reconcile 2026-05-27 |
| UPLD-05 | Phase 8 | Complete - historical reconcile 2026-05-27 |
| LIFE-01 | Phase 8 | Complete - historical reconcile 2026-05-27 |
| LIFE-02 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| LIFE-03 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| LIFE-04 | Phase 6 | Complete - historical reconcile 2026-05-27 |
| ENR-01 | Phase 9 | Complete |
| ENR-02 | Phase 9 | Complete |
| ENR-03 | Phase 9 | Complete |
| ENR-04 | Phase 9 | Complete |
| ENR-05 | Phase 13 | Complete - superseded/repaired by relation follow-through |
| ENR-06 | Phase 11 | Complete |
| ENR-07 | Phase 11 | Complete |
| ENR-08 | Phase 11 | Complete |
| ENR-09 | Phase 11 | Complete |
| ENR-10 | Phase 11 | Complete |
| TAG-01 | Phase 10 | Complete - historical reconcile 2026-05-27 |
| TAG-02 | Phase 10 | Complete - historical reconcile 2026-05-27 |
| TAG-03 | Phase 10 | Complete - historical reconcile 2026-05-27 |
| TAG-04 | Phase 10 | Complete - historical reconcile 2026-05-27 |
| TAG-05 | Phase 10 | Complete - historical reconcile 2026-05-27 |
| TIPTAP-EDITOR-01 | Phase 41 | Complete - runtime and artifacts retro-verified |
| TIPTAP-COLLAB-01 | Phase 42 | Planned - deferred; no runtime collaboration evidence found |
| AUTH-FOUNDATION-01 | Phase 43 | Complete - superseded by Phase 51 token-boundary correction |
| AUTHZ-ENGINE-01 | Phase 44 | Complete - runtime retro-verified |
| FANSUB-MEMBER-MGMT-01 | Phase 45 | Complete - runtime retro-verified |
| FANSUB-INVITES-01 | Phase 46 | Complete - runtime retro-verified |
| AUTH-API-CLIENT-01 | Phase 49 | Complete - verified 2026-05-20 |
| PLATFORM-ADMIN-BOUNDARY-01 | Phase 50 | Complete - technical verification passed; live Keycloak UAT pending |
| MEMBER-PROFILE-01 | Phase 47 | Complete - retro-verified foundation, UX carry-forward to Phase 53 |
| CONTRIBUTOR-DASHBOARD-01 | Phase 48 | Complete - retro-verified foundation, route/shell carry-forward |
| AUTH-RESOURCE-SERVER-01 | Phase 51 | Complete |
| AUTH-PROFILE-ACCOUNT-RETURN-01 | Phase 52 | Complete - live Keycloak UAT pending |
| MEMBER-PROFILE-HUB-01 | Phase 53 | Complete |
| MEMBER-PROFILE-STORY-RICH-TEXT-01 | Phase 55 | Complete |
| MEDIA-CROPPER-01 | Phase 56 | Complete - functional UAT and security review passed 2026-05-29 |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-10 after Phase 12 verification and Phase 13 addition*
