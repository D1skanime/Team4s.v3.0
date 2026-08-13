# Phase 128: Canonical Public Identity & Visibility Foundation - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 128 establishes the identity and access foundation for every public member surface. It adds one persisted immutable canonical slug to the existing `members` ownership seam, covers every legitimate member-creation path, removes nickname-derived and numeric identity fallbacks, and makes one shared visibility-first access decision before profile, project, contribution, media, or other retained member details are loaded. It also makes the verified owner's private-profile preview work through the central refresh-capable auth/API boundary without public caching or privacy disclosure.

This phase does not redesign profile content, correct all downstream public projections, optimize the complete query/payload shape, consolidate the final frontend composition, or perform the responsive/CSS redesign; those are assigned to Phases 129-133. Existing test rows are disposable: use a new reversible migration and reset/reseed rather than data-preservation, alias, backfill, or compatibility logic.

</domain>

<decisions>
## Implementation Decisions

### Canonical slug lifecycle
- **D-01:** The canonical public slug is generated once from the member nickname when the member is created, stored in PostgreSQL, and never changes when the nickname changes.
- **D-02:** Slug collisions use readable, transaktionssicher allocated numeric suffixes: the first member receives `name`, followed by `name-2`, `name-3`, and so on.
- **D-03:** German characters are transliterated into readable ASCII (`ä/ö/ü` to `ae/oe/ue`, `ß` to `ss`); the agreed example is `Müller & Söhne` to `mueller-und-soehne`. Other accents and separators follow one deterministic shared normalizer.
- **D-04:** An empty, unusable, or reserved slug result blocks member creation with a clear validation error. The system must not silently assign a technical, random, numeric, or member-ID fallback.
- **D-05:** Every internal public-profile link reads the stored slug. No component, DTO mapper, repository, or route may regenerate a public identity from the current nickname.

### Visibility and privacy
- **D-06:** The only profile visibility values are `public` and `private`. The misleading `members_only` value is not retained as an internal alias or third access level.
- **D-07:** A private profile is visible only to its verified owner. Login alone, having another verified member profile, or holding an admin role does not grant access through the public route.
- **D-08:** Visibility and verified ownership are resolved before any protected profile detail loader runs. Hidden requests must not load badges, memberships, projects, contributions, media, points, story, or other detail collections.
- **D-09:** Anonymous visitors and authenticated non-owners receive the same neutral HTTP 404 page and response for a private profile as for a missing profile. The public route must not confirm that a private profile exists.
- **D-10:** Profile, projects, contributions, media, metadata, and every retained member subresource use the same central access decision. A subresource must not independently resolve nickname slugs or return an empty HTTP 200 for a missing/private member.
- **D-11:** Administrative inspection does not bypass privacy on the public member route. Any future admin-only inspection belongs to a separate protected admin surface.
- **D-12:** Owner- or viewer-specific results are private and must never enter a shared public cache.

### Verified owner preview
- **D-13:** The verified owner opens a private profile at the same canonical `/members/{slug}` URL and sees the complete real public-profile presentation, not a reduced reconstruction or redirect to the editor.
- **D-14:** A persistent notice immediately above the profile header states that the profile is private and visible only to the owner. It provides clear links to edit the profile and its visibility.
- **D-15:** The route resolves the existing auth/refresh session before deciding the result. With a valid refresh token and no access token, the central auth/API seam refreshes and renders the preview without briefly flashing the neutral 404 state; at most a neutral profile-loading state may appear.
- **D-16:** The preview is read-only. Editing continues in the existing profile editor, and the owner must not be offered a correction report against their own profile.
- **D-17:** The owner preview consumes the authoritative public-profile DTO and access result. The current client-side `OwnHiddenProfilePreview` conversion, nickname slugification, numeric fallback, and duplicate own-profile lookup are not authoritative behavior to preserve.

### Canonical URL behavior
- **D-18:** A request that is technically equivalent to the canonical slug but differs in case, surrounding/encoded whitespace, or equivalent URL encoding is permanently redirected server-side to the single canonical URL.
- **D-19:** A nickname change does not create a new alias. A URL guessed from the new nickname returns the same neutral 404 as any missing profile, while internal links continue to use the original stored slug.
- **D-20:** Numeric member URLs such as `/members/123` always return the neutral 404 and never redirect to or resolve a member.
- **D-21:** Existing disposable test rows receive their canonical starting state through reset/reseed. Do not create slug-history, alias, legacy redirect, compatibility, or old-row preservation mechanisms.

### Agent's Discretion
- Exact schema column/constraint names, allocator placement, transaction/locking strategy, and the complete reserved-word set, provided the user-visible rules above and the existing repository boundaries are preserved.
- Exact permanent redirect status (`301` or `308`) and neutral error envelope wording, provided canonicalization is safe and private/missing outcomes remain indistinguishable.
- Internal shape of the shared access-result type and handler middleware/helper seam, provided it resolves only minimal identity/visibility/ownership facts before detail loading.
- Focused test organization and temporary reuse boundaries needed to deliver Phase 128 without prematurely performing the Phase 129-133 refactors.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/PROJECT.md` — v1.3 goal, brownfield/privacy/test-data constraints, and explicit out-of-scope boundaries.
- `.planning/ROADMAP.md` — Phase 128 goal, deliverables, success criteria, dependencies, and downstream phase separation.
- `.planning/REQUIREMENTS.md` — locked Phase 128 requirements PMID-01 through PMID-03 and PMPR-01 through PMPR-05.

### Engineering, auth, domain, and API rules
- `docs/engineering/implementation-contract.md` — mandatory reuse-first implementation workflow and duplicate-seam constraints.
- `docs/frontend/auth-api-client.md` — central refresh-capable browser auth/API boundary; refresh-only sessions must remain valid.
- `docs/architecture/db-schema-fansub-domain.md` — canonical member/fansub/release ownership rules that must not be crossed.
- `docs/api/api-contracts.md` — cross-layer contract workflow for backend, OpenAPI, API helper, and frontend types.
- `shared/contracts/openapi.yaml` — current public member visible/hidden/missing contract that must change with runtime behavior.

### Schema and creation seams
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` — original `members` table definition.
- `database/migrations/0077_member_profiles_mvp.up.sql` — current `profile_visibility` column and `members_only` constraint.
- `database/migrations/0126_member_profile_public_defaults.up.sql` — current public visibility default.
- `database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.up.sql` — current migration-chain head; add a new migration rather than editing history.
- `backend/internal/repository/member_requests_repository.go` — admin-approved member-request creation path.
- `backend/internal/repository/fansub_group_app_members_repository.go` — automatic app-user member-anchor creation path.
- `backend/internal/repository/hist_group_members_repository.go` — historical group-member auto-creation path.

### Public member access and consumers
- `backend/internal/handlers/app_public_profile.go` — current profile/projects handlers and duplicated post-load visibility checks.
- `backend/internal/handlers/contributions_public_handler.go` — current unguarded member-contributions handler.
- `backend/internal/repository/member_profile_repository.go` — current derived/numeric/fallback resolution and detail-loader fan-out.
- `backend/internal/repository/anime_contributions_public_repository.go` — separate nickname/numeric contribution resolver that must join the shared access rule.
- `backend/cmd/server/main.go` — route registration and optional-auth integration points for all member endpoints.
- `frontend/src/lib/api.ts` — central API/auth transport and current public profile helpers.
- `frontend/src/types/profile.ts` — own/public profile identity and visibility types.
- `frontend/src/app/members/[slug]/page.tsx` — public SSR route, metadata lookup, visibility branch, and current token read.
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` — current duplicate client-side preview reconstruction to replace as authoritative behavior.
- `frontend/src/app/me/profile/page.tsx` — current public-link numeric fallback and visibility editor entry point.
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — second current public-link fallback.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MemberProfileRepository`: retain the existing member/profile ownership repository, but split minimal identity/access resolution from protected detail projection rather than adding a parallel profile store.
- Optional auth middleware and central API client: reuse the established session identity and refresh seam; normal UI must not parse tokens or call Keycloak refresh helpers directly.
- Existing public profile page and components: use the real profile composition for owner preview; do not maintain the reduced `toPublicProfile` reconstruction.
- Existing handler/repository tests: extend the profile/project tests and contribution resolver tests with a shared visibility-first matrix rather than creating unrelated test harnesses.

### Established Patterns
- Backend dependencies are constructed explicitly in `backend/cmd/server/main.go`; a shared resolver should be injected through this existing composition root.
- Cross-surface API behavior must remain synchronized across Go handlers/models, `shared/contracts/openapi.yaml`, `frontend/src/types/*`, and `frontend/src/lib/api.ts`.
- Database changes use new reversible up/down migrations. Historical migrations are immutable, and disposable data is reset/reseeded instead of backfilled or preserved.
- Public media and contribution ownership remain in their existing canonical tables; Phase 128 changes access gating, not domain ownership.

### Integration Points
- `GetPublicMemberProfile` currently derives the slug in SQL, accepts numeric IDs, performs an O(n) fallback scan, and loads all detail before the handler checks visibility. The new access resolver must replace this ordering.
- `GetPublicMemberProjects` calls the full profile loader before a second visibility check, so it must consume the minimal shared decision instead.
- `GetPublicMemberContributions` independently derives nickname slugs, accepts numeric IDs, and returns an empty HTTP 200 for a missing member. It must use the same resolver/outcome as profile and projects.
- `OwnHiddenProfilePreview` currently performs a duplicate `getOwnProfile` request and regenerates slug identity in the browser. It must not survive as a second identity or access authority.
- Public links in both `/me/profile` implementations currently use `profile.slug || profile.member_id`; Phase 128 must make persisted slug presence explicit and remove the numeric fallback.
- Metadata access must apply the same visibility decision and cache classification as page access so it cannot disclose or cache private facts.

</code_context>

<specifics>
## Specific Ideas

- Canonical transliteration example: `Müller & Söhne` becomes `/members/mueller-und-soehne`.
- Collision example: `sheppert`, `sheppert-2`, `sheppert-3`.
- Owner notice concept: “Privates Profil – nur für dich sichtbar”, placed immediately above the profile header with links to profile and visibility editing.
- Neutral unavailable experience: HTTP 404 and the same “Profil nicht verfügbar” presentation for missing, private-anonymous, and private-non-owner requests.

</specifics>

<deferred>
## Deferred Ideas

- The pending todo `2026-06-03-member-profil-ui-und-params-bug.md` was reviewed but not folded wholesale into Phase 128. Canonical route behavior touches the route boundary now; its full Next route/API type alignment belongs to Phase 130, while badge/timeline/media visual polish belongs to Phase 133.
- Complete public projection correctness, data deduplication, totals, and joins remain Phase 129.
- Final DTO minimization and full cross-layer response union cleanup remain Phase 130.
- Query-count, payload, pagination, and measurement work remain Phase 131.
- Shared SSR composition and broader race-safe frontend consolidation remain Phase 132 after Phase 128 establishes correct owner access semantics.
- Responsive CSS, accessibility, and image delivery remain Phase 133.

</deferred>

---

*Phase: 128-canonical-public-identity-visibility-foundation*
*Context gathered: 2026-08-13*
