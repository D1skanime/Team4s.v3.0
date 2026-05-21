# DECISIONS

## 2026-05-19 - Fansub Anime Release Headers Prefer A Resolved Landscape Image Instead Of Poster-Only Rendering

### Decision
The fansub release overview endpoint now provides a resolved `header_image` for each anime entry. The release header UI should prefer this wide visual in the order `banner -> first background -> cover fallback`, instead of treating the block as poster-only.

### Why This Won
The release list header is visually closer to a horizontal media band than to a poster grid. The old `cover_image`-only contract forced portrait artwork even when broader anime assets already existed in Team4s. Reusing existing anime `banner` and `backgrounds` data keeps the change inside documented asset ownership instead of inventing a parallel release-media image source.

### Consequences
- the `GET /api/v1/admin/fansubs/:id/anime` response may now include `header_image`
- frontend consumers may prefer `header_image` and fall back to `cover_image`
- the backend continues to keep `cover_image` for compatibility and poster-style fallbacks

### Follow-ups Required
- if more screens need the same horizontal anime preview, they should reuse the same resolved `header_image` semantics
- future UI cleanup can decide whether the release list should become fully landscape-first on mobile as well

## 2026-05-17 - Phase 44 Centralizes Authorization On Team4s Permission Actions And Resolved Group Scope

### Decision
Phase 44 introduces one Team4s-owned permission engine that evaluates explicit action names against `CurrentUser`, global app roles, and resolved fansub-group context. Handlers and capability endpoints must consume this engine instead of making ad-hoc admin or role decisions.

### Why This Won
The codebase had already moved identity and membership ownership into Team4s with Phase 43, but authorization was still fragmented across `requireAdmin(...)`, route-local checks, and implicit assumptions about who may mutate release/media data. A central action matrix prevents drift between backend handlers and frontend affordances and keeps group-scope authorization on canonical fansub-release seams instead of legacy `users` or Keycloak claims.

### Consequences
- `CurrentUser` is the canonical authenticated principal for permission checks
- `platform_admin` stays global in `app_user_global_roles`
- group-scoped roles stay in `fansub_group_members` plus `fansub_group_member_roles`
- release and release-version checks must resolve canonical `fansub_group_id` membership through existing release tables
- frontend permission-aware UI should consume backend capability endpoints rather than duplicating the policy matrix

### Follow-ups Required
- future handlers should add new action constants and reuse the permission service instead of adding route-local role checks
- future UI slices should prefer capability endpoints over client-side role inference
- later phases can extend beyond `group` scope, but they should keep the same action-and-context seam

## 2026-05-16 - Phase 43 Uses Keycloak For Identity But Keeps Team4s As The Authority For App And Fansub Roles

### Decision
Phase 43 adopts Keycloak as the external identity and login provider, but Team4s remains the canonical authority for authenticated app users, global app roles, fansub memberships, and `fansub_lead`.

### Why This Won
The project needs real browser-authenticated users without leaking business authorization into JWT claims or realm configuration. Keeping Keycloak identity-only preserves clean boundaries for the later permission engine and avoids coupling group-scope authorization to external role claims.

### Consequences
- `app_users` is the new Team4s principal seam for authenticated users
- `app_user_global_roles` owns `platform_admin`
- `fansub_group_members` and `fansub_group_member_roles` own group membership and `fansub_lead`
- `/api/v1/me` is the first stable frontend session seam
- Keycloak logout invalidates local Team4s auth state, but it does not become the business authorization source

### Follow-ups Required
- Phase 44 must consume the Phase-43 seams instead of falling back to legacy `users` or Keycloak role claims
- local docs must stay explicit about the SQL bootstrap path for the first Team4s `platform_admin`

## 2026-05-16 - Phase 42 Collaboration Stays Parked Until Phases 43 Through 48 Exist

### Decision
Do not actively continue Phase 42 (`tiptap collaboration mvp fuer fansub group notes`) before Phases 43 through 48 establish the real user, role, and membership foundation.

### Why This Won
The collaboration slice only makes sense when it can be verified with real user identities, roles, and multiple participants. Building it earlier would create a technically interesting but weakly testable branch of work.

### Consequences
- the next major workflow should move toward Phase 43 instead of reopening collaboration first
- collaboration-specific testing should wait for real auth/permission context
- Phase 42 remains documented, but is intentionally skipped in the short term

### Follow-ups Required
- revisit Phase 42 after the auth/roles/member phases are in place
- keep handoff files explicit so future sessions do not restart Phase 42 too early

## 2026-05-13 - Rich-Text Editor Images Must Reuse The Existing Media Upload Flow

### Decision
When editor image support is added, it must reuse the existing Team4s media/upload flow and storage seams instead of inventing a TipTap-specific parallel uploader or persistence path.

### Why This Won
The editor already appears in many contexts, and media ownership in this repo is domain-sensitive. A special-case upload path inside TipTap would duplicate asset logic, blur storage ownership, and raise the risk of attaching files to the wrong entity.

### Consequences
- image support needs an explicit owning storage seam before implementation starts
- the future editor image command should call into existing product upload/media code rather than bypassing it
- the rollout should be designed so one editor can behave consistently across pages without forking media semantics per screen

### Follow-ups Required
- inspect the current reusable media upload path before any TipTap image implementation
- document which entity/storage seam owns editor images in the first implementation slice

## 2026-05-13 - Phase 40 Does Not Need A Full Separate UAT If Phase 41 Covers The Main Live Paths

### Decision
Treat Phase 40 as practically covered by the completed Phase-41 UAT unless we explicitly want documentary proof for the smaller residual paths (group-note delete, explicit sanitizing evidence, member-story live path).

### Why This Won
Phase 40 already has a strong technical verification baseline, and Phase 41's passed browser UAT re-exercised the main operator-critical save flows on the TipTap path: group notes, anime project notes, and release-version notes with real roles. Re-running a full separate Phase-40 UAT would mostly duplicate already-proven behavior.

### Consequences
- The main uncertainty around Phase 40 is documentary, not a known product failure.
- Follow-up planning should not treat Phase 40 as broadly unverified.
- If we want total closure, a mini-UAT addendum is enough; a full second UAT pass is usually unnecessary.

### Follow-ups Required
- update stale documents that still imply Phase 41 is not fully green
- decide whether to record a short Phase-40 mini-UAT addendum for delete/sanitizing/member-story coverage

## 2026-05-06 - Fansub Timeline Uses Release Duration And Release-Asset Semantics

### Decision
The fansub release timeline should use `release_variants.duration_seconds` as its first duration source. In the fansub UI, a segment with `source_type = release_asset` is treated as release-specific/upload-required until a concrete release-scoped `release_theme_assets` row exists.

### Why This Won
Operators enter or hydrate the total duration on the episode-version editor, so the fansub release overview must consume the same persisted value instead of deriving a longer timeline from stale or test segment data. Also, `release_asset` describes who still owns the upload work; showing a missing release-specific file as `Global/Admin` hides the action the fansub group still needs to take.

### Consequences
- `/admin/fansubs/:id/edit` should show the same release duration that `/admin/episode-versions/:id/edit` persists.
- `Global/Admin` means no release upload is needed.
- `Release-Asset` means a release-scoped asset exists.
- `Fehlt` means a release-specific asset is expected but missing.
- The fansub timeline rail should stay visually aligned with the grey episode-version editor rail unless the design system changes intentionally.

### Follow-ups Required
- smoke-test delete/re-upload on Release 41 once more after the latest upload-state fix
- decide whether release theme asset `size_bytes` metadata should be persisted or recovered from related media-file data

## 2026-05-05 - Global Theme Segment Coverage Locks Conflicting Release Uploads

### Decision
If a global/admin theme segment already covers a release's episode anchor for a given theme, release-specific theme-video uploads for that same theme must be rejected instead of silently overriding the global assignment.

### Why This Won
The product rule is that one OP/ED definition spanning an episode range such as episodes 1 through 8 must remain authoritative for every covered episode. Allowing a later release-specific upload on episode 2 would fracture that meaning and create hidden conflicts between neutral anime-level segment truth and release-level overrides.

### Consequences
- backend upload handlers now check whether a global segment with source already covers the release before accepting a release-theme upload
- blocked uploads return a conflict with code `theme_segment_locked`
- the release drawer may still show global state, but UI alone is no longer the trust boundary for this rule

### Follow-ups Required
- complete one more focused drawer-state pass so locked/global themes also feel obviously non-overridable in the UI

## 2026-05-05 - Fansub Domain Agent Work Uses The Repo Schema Reference First

### Decision
When agents work on fansub, anime, release, or release-media features, they should use `docs/architecture/db-schema-fansub-domain.md` as the first source-of-truth document, then verify the current code and migrations against it before making persistence changes.

### Why This Won
The current worktree spans Phase 29 through Phase 32 plus cleanup-boundary migrations and repo-local tooling changes. Without one explicit domain reference, it is too easy to reintroduce wrong-domain persistence, hidden release discovery, or legacy-column assumptions.

### Consequences
- anime and episodes stay neutral in agent reasoning
- release/process media must stay on `release_media`
- group media must stay on `fansub_group_media`
- `release_version_groups.fansub_group_id` stays canonical and `fansubgroup_id` is treated as legacy cleanup only
- agents should stop instead of guessing when schema or ownership truth conflicts

### Follow-ups Required
- keep `AGENTS.md`, `STATUS.md`, and closeout files aligned with this rule set whenever the active fansub/release slice changes

## 2026-05-02 - release_version_groups Runtime Uses fansub_group_id Only

### Decision
Treat `release_version_groups.fansub_group_id` as the only runtime source of truth. Backend runtime code must not read from or write to the legacy duplicate `fansubgroup_id` column while the DB column remains present for a later cleanup migration.

### Final Drop Safety Check
Run this before the final drop migration:

```sql
SELECT *
FROM release_version_groups
WHERE fansubgroup_id IS NOT NULL
  AND fansubgroup_id <> fansub_group_id;
```

## 2026-04-29 - Fansub Group Model Uses One Canonical Group Record Plus Generic Link Entries

### Decision
Treat `fansub_groups` as the canonical fansub-group record, use `fansub_group_links` as the canonical model for outward community links, and treat duplicate transition columns such as `closed_year`, `history_description`, alias-side `group_id`, and URL-vs-media-ID overlap as cleanup targets rather than product-facing long-term fields.

### Context
The live database currently exposes a workable fansub-group model, but it also contains several transition-era duplicates: `history` alongside `history_description`, `dissolved_year` alongside `closed_year`, direct URL link columns on `fansub_groups` alongside generic rows in `fansub_group_links`, and a duplicate `group_id` reference in `fansub_group_aliases`. That makes it too easy for frontend/API work to drift into supporting both the intended model and old reconciliation leftovers at the same time.

### Options Considered
- keep using the current mixed model and let each UI/API surface choose whichever fields are most convenient
- keep `fansub_groups` canonical for core identity but continue using fixed link columns (`website_url`, `discord_url`, `irc_url`) as the main link model
- keep `fansub_groups` canonical for identity/metadata and move link management toward generic `fansub_group_links` entries defined by DB link type

### Why This Won
The DB already defines a more extensible link model with `fansub_group_links` and constrained `link_type` values. Using that as the long-term direction prevents the UI from hardcoding a permanently incomplete link set and lets future support for `twitter`/`github` follow the schema instead of requiring new columns. At the same time, the core fansub record should stay centered on one canonical group row plus aliases, members, and collaboration membership instead of spreading meaning across overlapping transitional fields.

### Consequences
- core fansub CRUD should be designed around the canonical `fansub_groups` fields that represent identity and profile data
- outward links should be programmed against `fansub_group_links`, not only against fixed `website_url` / `discord_url` / `irc_url` columns
- collaboration administration should remain explicit and use `fansub_collaboration_members` rather than hiding that behavior inside normal group fields
- alias handling should standardize on `fansub_group_aliases.fansub_group_id`; alias-side `group_id` is legacy reconciliation baggage
- future cleanup should remove or deprecate duplicate fields once the API/UI no longer depend on them

### Phase-29 Update
- backend and frontend now expose generic community-link CRUD on `/api/v1/admin/fansubs/:id/links`
- fansub create/edit now manage `website`, `discord`, `twitter`, `github`, and `irc` as generic rows instead of three fixed URL inputs
- collaboration-member admin is live on the fansub edit page and remains separate from the ordinary profile form
- `fansub_groups.website_url` / `discord_url` / `irc_url` remain compatibility projections sourced from `fansub_group_links`
- `closed_year` and `history_description` remain readable transitional fields only; alias-side duplicate `group_id` is now an explicit cleanup boundary and no longer part of the intended live contract

### Follow-ups Required
- define the exact canonical fansub-group API payload shape before the next fansub-admin implementation slice
- add generic link CRUD in backend/frontend using `fansub_group_links`
- add/edit collaboration-member management in the admin UI for `group_type='collaboration'`
- plan a cleanup migration for `closed_year`, `history_description`, and alias-side `group_id` once no active code depends on them

## 2026-04-29 - Episode-Version Duration Input Accepts Shorthand But Must Fail Safe

### Decision
Accept operator-friendly duration forms such as raw seconds, `m:ss`, `hh:mm:ss`, `2m`, `1m30`, and `1m30s` in the episode-version editor, but treat invalid non-empty input as a validation error instead of serializing `duration_seconds: null`.

### Context
The UI and product intent had drifted toward faster manual runtime entry, but the first implementation only parsed raw seconds and colon syntax. Worse, malformed text could be serialized as `null` and silently erase previously stored runtime metadata.

### Options Considered
- keep only raw seconds / colon syntax and leave shorthand unsupported
- support shorthand forms but allow parse failures to fall through as `null`
- support shorthand forms and block save when a non-empty value cannot be parsed

### Why This Won
Operators think in short runtime forms during admin work, so shorthand support genuinely reduces friction. At the same time, runtime metadata is too easy to lose if parse failures are silently coerced to `null`. Fast input and fail-safe persistence are both required.

### Consequences
- the frontend parser must support both colon syntax and shorthand forms consistently
- save flows must guard against unparseable duration text before issuing the patch request
- future UI copy/help text should not advertise duration forms that the parser does not actually implement

### Follow-ups Required
- capture one real browser/UAT pass that covers both valid shorthand values and an invalid value

## 2026-04-28 - Segment Types Stay Generic And Naming Carries The Human Distinction

### Decision
Use generic segment types (`OP`, `ED`, `Insert`, `Outro`) and let the free name field carry distinctions such as `Naruto OP 1`, `Naruto Final OP`, or `Creditless Ending`.

### Context
The earlier segment/type work exposed rigid values like `OP1`, `OP2`, `ED1`, and `ED2`. That matched an internal seeded theme-type model more than the real operator workflow and made later cases feel artificial.

### Options Considered
- keep fixed enumerations like `OP1`, `OP2`, `ED1`, `ED2`
- switch to generic types plus free naming in the UI and normalized generic types in the DB

### Why This Won
Generic types fit both the reference UI and real usage better. They avoid artificial limits and let the operator decide how to distinguish variants while the system still keeps a simple type axis for timeline and filtering.

### Consequences
- UI type selectors should stay generic
- DB/runtime mappings should not drift back into operator-facing `OP1/ED1` semantics
- segment identity becomes `type + optional free name + release context + episode range`

### Follow-ups Required
- keep later segment-file and playback work aligned with the generic type model

## 2026-04-28 - Segment Structure Lives On Episode-Version Edit, Not On A Separate Anime Themes Screen

### Decision
Treat the anime-level `/admin/anime/:id/themes` screen as legacy/redirected and keep active segment structure work on `/admin/episode-versions/:id/edit`.

### Context
The earlier OP/ED/theme work had drifted into a mixed anime-theme/fansub-theme flow that was not the real operator context. The actual behavior needed to be tied to a concrete release combination: anime, episode, group, and version.

### Options Considered
- keep a parallel anime-level themes management surface
- retire it from the active workflow and anchor segment work on episode-version edit

### Why This Won
Segment timing and applicability only really make sense in release context. Keeping two competing admin surfaces would confuse operators and split the truth.

### Consequences
- the anime themes page should not remain an active maintenance screen
- segment range logic must be validated on episode-version routes
- later file-upload and playback work should build from the episode-version context

### Follow-ups Required
- if future fansub-self-service upload surfaces are added, they should still reuse this release-context model

## 2026-04-28 - Segment Files Are Team4s-Owned Release Assets, Not Primarily Jellyfin Upload Targets

### Decision
Store OP/ED/Insert files as Team4s-owned assets referenced by `release_asset`, with the segment holding only the source metadata/reference.

### Context
There was open uncertainty whether segment files should be selected from Jellyfin, stored in Jellyfin conventions, or managed directly by Team4s. The release-context segment workflow and later fansub rights model pointed toward Team4s-managed assets instead.

### Options Considered
- make Jellyfin the primary upload/storage model for segment sources
- treat Jellyfin only as optional context and store segment files as Team4s assets

### Why This Won
Team4s-owned assets fit the permission model better, are easier to name/control, and do not depend on Jellyfin-specific folder or API assumptions for the core workflow.

### Consequences
- Phase 26 upload/persistence work should target Team4s assets first
- source labels should expose concrete uploaded file information in the admin UI
- future playback can build on the same media/asset references without changing the storage truth

### Follow-ups Required
- later fansub-self-service upload should reuse the same underlying asset/reference seam

## 2026-04-24 - Collaboration Records Stay Persisted But Do Not Belong In The Default Fansub Group List

### Decision
Keep persisted collaboration records such as `AnimeOwnage & Project Messiah` for release/version wiring, but hide them from the standard `/admin/fansubs` management list so that default list stays focused on real fansub groups.

### Context
Phase 21 introduced deterministic collaboration persistence when multiple fansub groups are attached to one release version. That behavior is correct for release modeling, but in the regular fansub admin list those collaboration rows looked like ordinary groups and confused the operator.

### Options Considered
- show collaborations in the same default group list as normal fansub groups
- keep collaborations persisted but remove them from the default everyday group-management view

### Why This Won
The normal fansub list is primarily an operator surface for real groups. Collaboration rows are a release-level modeling detail and become misleading when presented as if they were first-class standalone groups in the same everyday list.

### Consequences
- collaboration rows can continue to exist in `fansub_groups` with `group_type='collaboration'`
- default fansub admin listing now hides them
- release/version wiring can still use the collaboration record internally

### Follow-ups Required
- if collaboration administration is needed later, give it a separate explicit view instead of reusing the normal group list

## 2026-04-24 - Anime Edit Must Copy The Create Interaction Model Instead Of Preserving Legacy Edit-Specific UI

### Decision
Anime edit should reuse the create-flow interaction model directly and remove stale edit-specific helper surfaces instead of wrapping the old edit experience in a new shell.

### Context
The first Phase-22 implementation still left too much of the old edit route behavior intact. Live operator feedback showed that the page still felt like the old editor, just rearranged.

### Options Considered
- keep adapting the old edit page incrementally
- take create as the real foundation and subtract legacy-only edit clutter aggressively

### Why This Won
Create already reflects the intended operator workflow. Reusing that model is simpler, easier to learn, and less likely to keep dragging old assumptions forward.

### Consequences
- top provenance banners and duplicate save affordances are not worth keeping by default
- Jellyfin reselection in edit should behave like create rather than like a special sync tool
- future edit refinements should start from shared create-style sections, not from old edit-only widgets

### Follow-ups Required
- finish Phase 22 by deciding whether the remaining source/context card is now lean enough to verify and close
## 2026-05-17 - Fansub Member Management Uses App Users, Central Permissions, And Backend Self-Lockout Guards

### Decision
Fansub-Mitgliederverwaltung läuft ausschließlich über `app_users`, `fansub_group_members` und `fansub_group_member_roles`; alle Mutationen werden durch die zentrale Permission-Engine geschützt und der Self-Lockout wird nur im Backend entschieden.

### Context
Nach Phase 43 und 44 war die Identity- und Permission-Basis vorhanden, aber die sichtbare Mitgliederverwaltung hing noch an einem schmalen MVP und einem veralteten Placeholder im Fansub-Edit-Tab. Gleichzeitig durfte Phase 45 keine neue Parallelstruktur neben `fansub_members` aufbauen.

### Options Considered
- die Legacy-`fansub_members`-Struktur weiter in Richtung App-Rechte ausbauen
- eine zweite Membership-/Audit-Struktur nur für die neue UI einführen
- die vorhandene app-user-basierte Membership-Struktur vollständig zum kanonischen Admin-Seam machen

### Why This Won
Die vorhandenen Phase-43/44-Seams decken Identität, Rollen und Scope bereits sauber ab. Darauf aufzubauen vermeidet Daten- und Autorisierungsdrift. Der Self-Lockout ist sicherheitsrelevant und muss deshalb serverseitig invariant bleiben statt von der UI vorhergesagt zu werden.

### Consequences
- `fansub_members` bleibt Legacy-/Contributor-Datenmodell und ist keine Quelle für App-Berechtigungen
- die Members-UI liest nur Capability-Flags
- `409 Conflict` mit verständlichen Meldungen ist der offizielle Lockout-Pfad
- spätere Invitation-/Join-Request-Flows müssen dieselbe Membership-Struktur wiederverwenden

### Follow-ups Required
- Phase 46 soll auf Einladungen und Join-Requests aufbauen, ohne die Membership-Quelle zu ändern
