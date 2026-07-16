# Phase 103: Öffentliche Release-Detailseite als Fansub-Story mit Rechte-gesteuertem Episoden- und Karaoke-Playback - Research

**Researched:** 2026-07-16  
**Status:** Complete  
**Scope:** Planning research only; no application code changed

## Executive Summary

Phase 103 is not a greenfield page. The public route, aggregate DTO, cursor endpoints, release-version media ownership, notes, exact release-version contributions, project timeline, short-lived release/segment grants, server relays, and global UI primitives already exist. The safe implementation is to extend those seams.

The principal gaps are contractual rather than visual:

1. the public aggregate does not expose the selected preview flag, complete release/version/group/technical metadata, release-bound segments, navigation targets, avatars, or playback capability;
2. the current public timeline reads project-level themes and is not scoped to the current `release_version_id`;
3. segment grant issuance currently requires the admin/leader `release_version.segments.manage` capability, which contradicts D-19 (every authenticated user may play a ready public Kara segment);
4. release streaming currently accepts any authenticated user and therefore has no implementation of D-27–D-31;
5. the requested global → group → project → release entitlement hierarchy has no persistent model or management seam in the inspected code.

The last point is the main planning risk. A central resolver can be added in Phase 103, but meaningful non-admin grants need persisted rules. Because the context defers only the management UI—not the evaluator/storage contract—the plan should either include a small, reversible entitlement migration and repository/service contract, or explicitly limit initial persisted population to migration/seed/admin tooling and schedule the management UI separately. It must not model rights on neutral episodes.

## Existing Implementation to Reuse

### Public release read and route

- `backend/internal/repository/release_detail_public_repository.go`
  - `GetPublicReleaseDetail(animeID, groupID, releaseVersionID)` already verifies ownership through `release_version_groups.fansub_group_id`, `fansub_releases`, and `episodes.anime_id`.
  - The aggregate already returns counts plus initial arrays for contributors, images, and notes.
  - Cursor endpoints already exist for images and notes.
- `backend/internal/repository/release_detail_public_repository_helpers.go`
  - Public gates are established: release media must be ready/public/approved; notes public/published/not deleted; contributors release-version-bound and public.
  - Image uploader display-name resolution already exists.
- `backend/internal/handlers/group_contributors_handler.go` and `backend/cmd/server/main.go`
  - Canonical public detail/images/notes routes already exist. Extend them; do not add another release-detail route.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`
  - Existing server composition and not-found/error behavior.
- `frontend/src/types/releaseDetail.ts` and `frontend/src/lib/api.ts`
  - Existing public contract mirror and API helpers.

### Story content

- `ReleaseDetailHero.tsx`, `ContributorsRow.tsx`, `ReleaseGallery.tsx`, and `ReleaseNotesList.tsx` are the correct domain components to evolve.
- `ReleaseGallery` and `ReleaseNotesList` already deduplicate cursor results and keep loading/error state local.
- `RichTextRenderer` already safely renders published note HTML.
- The four canonical categories and labels live in `frontend/src/types/releaseVersionMedia.ts`.
- `release_version_media.is_preview_candidate` is already managed by `ReleaseVersionMediaSection.tsx`, `useReleaseVersionMedia.ts`, and `backend/internal/handlers/admin_content_release_version_media.go`; the existing singleton/category rules must remain authoritative.

### Public visual language

- `frontend/src/components/fansubs/PublicReleaseBlock.tsx` and its CSS are the strongest timeline/release composition anchor.
- `frontend/src/app/fansubs/[slug]/page.tsx` and `FansubTeamSection.tsx` are the public team/pacing anchors.
- Reuse global `Card`, `Badge`, `Button`, `SectionHeader`, `Modal`, and `AdjacentNavigation` from `frontend/src/components/ui`.
- Desktop timeline behavior and the required no-horizontal-scroll mobile fallback are already documented in `docs/frontend/ui-system.md`.

### Playback infrastructure

- Full release playback:
  - backend: `episode_version_grants.go`, `episode_version_stream.go`, `GetReleaseStreamSource`;
  - frontend relay: `frontend/src/app/api/releases/[id]/stream/route.ts`;
  - auth handoff: `frontend/src/lib/server/streamRelayAuth.ts`.
- Segment playback:
  - backend: `segment_stream.go`, `auth/segment_grant.go`, render cache/source repositories;
  - frontend relay: `frontend/src/app/api/segments/[id]/stream/route.ts`.
- Both relays already preserve refresh-cookie behavior and range headers. UI code must not read cookies, construct bearer headers, or bypass these relays.

## Genuine Gaps and Required Contract Expansion

### Release header and preview

`PublicReleaseDetail` currently exposes only version id, episode number, computed title, release date, counts, and content arrays. Add documented fields for:

- episode title separately from curated release title;
- current group and all collaborating groups;
- version label/number;
- duration, resolution, container/video codec, audio language/audio codec;
- an array of human-readable subtitle tracks;
- explicit selected public preview image (or `is_preview_candidate` on images plus a server-selected `preview_image`);
- release-bound Kara segments;
- previous/next targets;
- a server-authoritative full-episode playback availability boolean.

Preview selection should happen server-side using the existing flag and the same public visibility gates. Do not merely return a private/unapproved candidate. Recommended fallback order: selected public preview → no release preview (frontend may use the existing neutral anime poster/text hero). Avoid silently promoting an arbitrary first gallery image because D-07 explicitly rejects that behavior.

### Technical media metadata and subtitle tracks

`release_variants` already holds duration/resolution/container-style metadata and participates in `GetReleaseStreamSource`; render caches also store probed codec information. However, the ordinary release-version model exposes only one `subtitle_type`, and the inspected public DTO has no multi-track representation.

Planning must determine the authoritative source of video/audio/subtitle stream metadata:

- prefer persisted release-variant/stream metadata if already hydrated by import;
- if Jellyfin media-stream inspection is the only complete source, normalize it in the backend and expose a stable public DTO—never expose Jellyfin item names, filenames, internal indexes as the primary UI, or let the page make ad hoc Jellyfin calls;
- multiple subtitle tracks require an array such as `{language, label/type, format, forced, default}`. If no persistent track table exists, treat persistence as a schema decision, not as a UI inference from the single legacy `subtitle_type` field.

This is a plan-time decision point and should be resolved before a UI task is executable.

### Exact contributors, text authors, image uploaders

Exact release-version contributor ownership already exists via `anime_contributions.release_version_id`; do not fall back to project-wide contributors. Existing note authors are `release_version_notes.member_id`; existing image uploaders are `release_version_media.uploaded_by_user_id` resolved through app-user/member claims.

Gaps:

- contributor DTO lacks avatar URL;
- note DTO lacks member id/avatar URL;
- segments need their own release-version-scoped Kara/Typesetting participants. Reuse effective contribution roles for the current version/group; do not infer all project members.

Preserve public visibility gates. Counts should mean visible items, and the page must label these people as `Fansubber`.

### Categorized gallery and role-grouped notes

The existing cursor order is global (`sort_order,id` for images and `created_at,id` for notes). A single global cursor cannot reliably support four independently expandable category chapters or independently expandable role groups without either over-fetching or losing group-specific continuation.

Recommended contract adjustment:

- images endpoint accepts the canonical category and returns a category-scoped cursor/count;
- notes endpoint accepts a stable role code/id (not translated label) and returns a role-scoped cursor/count;
- aggregate response includes per-category and per-role summaries/initial items.

The responsive 6/4/2 rule is a reveal count, not necessarily a server page size. Fetch enough initial items for desktop, then CSS/JS reveals 6, 4, or 2; `Weitere X Bilder anzeigen` expands in place. Avoid the current automatic infinite-scroll trigger for each chapter because four observers can load content unexpectedly. Explicit in-section expansion/load is more consistent with D-11.

### Release-bound segment projection and player

The current `ThemeTimeline.tsx` calls `getGroupThemes(animeID, groupID)` and therefore shows project themes, not necessarily segments belonging to this release version. Phase 103 needs a release-detail projection keyed by the real `release_version_id`, containing:

- `theme_segment_id`, stable type (`OP`, `ED`, `MIDDLE`/`IN`, `KARA`/other), title;
- start/end/duration seconds and formatted times;
- episode duration for percentage placement;
- public preview asset if available;
- exact Kara/Typesetting contributors;
- a coarse public playback state (`ready` vs `unavailable`), never render diagnostics.

The existing `PublicReleaseBlock` percentage/timeline design should be extracted or adapted, with a vertical mobile segment list. The detail player should be a client component owning one active `<video>` ref/source. On selection it must pause/reset the old source before assigning/autoplaying the new `/api/segments/{id}/stream` source.

Critical authorization mismatch: `CreateSegmentStreamGrant` currently calls `authorizeSegmentManage`, so ordinary authenticated users cannot obtain the grant required by D-19. Split public playback authorization from render/manage authorization. Grant issuance should require an authenticated app session plus a public, ready, release-bound segment; render remains protected by `ActionReleaseVersionSegmentsManage`. The stream still accepts only a short-lived segment/cache-bound grant and rejects free start/end parameters.

### Full-release playback entitlement hierarchy

Current behavior is too broad: `CreateReleaseStreamGrant` issues a grant to any authenticated user with a resolvable source, and `authorizeReleaseStream` also accepts any authenticated request. Hiding the button would not secure the stream.

Required central design:

- a single backend resolver invoked by both public-detail capability projection and grant/stream authorization;
- resource context is always the concrete `release_version_id`, from which group/project context is resolved;
- scopes: global, fansub group, project (`anime_id + fansub_group_id`), release version;
- subjects: role defaults and direct `app_user_id` rules;
- decision: most specific scope wins; define deterministic tie handling at the same specificity (recommended explicit deny wins within the same specificity, while a more-specific allow still overrides a broader deny);
- platform-admin bypass may resolve as a global allow, but must still flow through the central resolver so behavior is testable/auditable;
- source readiness and authorization are separate: button visible only when both are positive.

No inspected table stores this hierarchy. Phase 103 therefore needs a new reversible migration if the feature is to work beyond hard-coded admin capability. Before creating it, executors must inspect `git status` and the current migration chain per AGENTS.md. Do not reuse `fansub_group_member_media_permissions`: those booleans govern group-media administration, not release playback, and they cannot express global/project/release specificity.

Suggested minimal persistence is one normalized rule table with nullable scope keys constrained by scope type, subject type/id or role code, effect allow/deny, audit columns, and uniqueness per subject/scope. The exact schema requires a plan/architecture decision because it affects production authorization data. The management UI remains deferred, but tests/seeds or controlled admin tooling must provide a way to establish initial rules.

Use the release stream relay and release-version grant; do not use neutral `/episodes/{id}/play` for this feature. Remove the direct-authenticated bypass from release stream authorization so grant and stream cannot disagree.

### Same-group previous/next navigation

Resolve navigation server-side in the public repository:

1. establish current episode ordering within the same anime;
2. restrict candidate releases through `release_version_groups.fansub_group_id = current route groupId`;
3. for adjacent episode prefer the same version number;
4. otherwise choose the documented public/default version deterministically;
5. return no target when none exists;
6. cooperation changes displayed groups, never the route group context.

Do not navigate by publication date and never silently select another group. Render with global `AdjacentNavigation`.

## Suggested Plan Boundaries and Waves

### Plan 103-01 — Contracts and public aggregate

- Read-first: repository/detail helpers, models, contracts, `releaseVersionMedia` types, import/stream metadata repository.
- Extend OpenAPI first, then backend DTO/query/tests, then frontend types/API helpers.
- Deliver preview selection, complete header metadata, cooperation groups, exact author/avatar fields, grouped summary shapes, release-bound segments, and navigation targets.
- Resolve the subtitle-track source in this plan; do not leave UI to guess.

### Plan 103-02 — Release-story UI

- Evolve the existing route/components.
- Implement text-safe hero, fully visible technical metadata, exact contributor row, four in-page category chapters with 6/4/2 reveal, role-grouped notes, correct authorship, omitted empty sections, and `AdjacentNavigation`.
- Reuse public fansub composition and global primitives; keep styles local only for the domain-specific story/grid.

### Plan 103-03 — Public Kara playback

- Add the release-bound public segment DTO/read.
- Split segment-play authorization from segment management.
- Build expanded horizontal desktop/vertical mobile timeline and one active autoplay player.
- Reuse `/api/segments/[id]/stream`, short-lived grants, persisted bounds, cache binding, and central refresh handoff.

### Plan 103-04 — Full-release entitlement and dialog playback

- Add the central entitlement resolver and, if approved by the plan, minimal reversible persistence/migration.
- Gate aggregate `can_play_full_episode`, grant issuance, and stream access with the same resolver and source-ready check.
- Add a secondary hero action and large global `Modal` player using `/api/releases/[id]/stream`.
- Keep management UI out of scope.

Dependencies: 103-01 precedes UI work. 103-02 and the backend portion of 103-03 can proceed after the contract stabilizes. 103-04 is security-sensitive and should be isolated so its schema/authorization review does not contaminate the story UI diff.

## Risks and Planning Guardrails

- **Production schema/authorization risk:** the entitlement hierarchy is a real new persisted authorization concept. It deserves explicit migration review and security tests.
- **Public data leakage:** never expose filenames, Jellyfin IDs, stream URLs, internal track indexes, render errors, unpublished notes, unapproved media, or private contributors.
- **Ownership drift:** all media, segments, contributors, rights, and playback must resolve from a real `release_version_id`; episodes remain neutral.
- **Contract drift:** update `shared/contracts/openapi.yaml` and focused contracts where applicable in the same change as backend/frontend DTOs.
- **Auth refresh regression:** logged-in means access token or refresh session; protected playback must survive an absent/expired access token with a valid refresh token through existing relay seams.
- **SSR personalization/cache:** if playback capability is added to an otherwise public aggregate, prevent shared caching of user-specific capability. A safer split is public aggregate plus a small authenticated capability endpoint, while both call the same backend resolver.
- **Cursor grouping:** category/role filters must be included in cursor/query semantics; client-only regrouping of partial global pages produces wrong counts and missing chapters.
- **Autoplay:** browser policies may reject autoplay with audio. UI must handle `play()` rejection gracefully while preserving the selected segment and visible play control.
- **Multiple streams:** always stop the previous segment/full episode on switch/dialog close and release object/source state.
- **Fallback semantics:** do not use the first arbitrary image as hero. Text-only plus neutral anime poster is safer than pretending an unselected gallery item is primary.

## Verification Strategy

### Backend and contract tests

- ownership: wrong anime/group/release combination returns 404;
- preview: selected public approved candidate wins; private/unapproved/deleted candidate never leaks; no candidate returns null;
- metadata: duration/resolution/codecs/audio language and multiple subtitle tracks serialize as documented;
- contributors/authors: only current release version and public visibility; image uploader and note author resolve correctly;
- pagination: category and role cursors do not cross groups, counts remain correct, invalid cursors are safe;
- segments: only segments attached to this release/group context; public response exposes no diagnostics/source URLs;
- segment grant: guest 401, authenticated ordinary user gets grant only for public ready segment, manage permission still required for render, free time parameters rejected;
- entitlement matrix: global/group/project/release, role/direct-user, allow/deny, specificity ordering, same-level conflict, admin, unrelated group/release denial;
- release grant and stream both deny without effective entitlement and agree on decisions;
- navigation: same group, preferred same version, default fallback, cooperation route context, missing neighbor.

### Frontend tests

- hero works with selected image, poster fallback, and no image;
- all technical fields and multiple subtitle chips/rows are visible without disclosure;
- empty sections omitted;
- gallery chapters and 6/4/2 reveal behavior; expansion remains in page;
- notes grouped by role with author/avatar/date;
- exact release contributors rather than project team;
- guest timeline has no play affordance/login prompt;
- authenticated ready segment autoplays, switching pauses old player, unavailable segment shows `Noch nicht abspielbar`;
- full episode button appears only for `can_play && source_ready`, opens/closes modal without losing page state;
- previous/next links use returned same-group targets;
- refresh-token-only session succeeds through segment/release relay without logged-out UI.

### Project checks and UAT

- targeted Go repository/handler/permission tests;
- frontend component/API/relay tests;
- `npm` typecheck, lint, relevant tests, build where feasible;
- `git diff --check`;
- live in-app browser UAT from the actual public Fansub project route into a release detail on desktop and mobile widths, including text-only, many-images/many-notes, guest Kara, authenticated Kara, entitled full episode, and cooperation navigation.

## Planning Recommendation

Proceed with four narrowly owned plans. Treat the entitlement persistence and subtitle-track authority as explicit architecture decisions at the beginning of planning. Do not allow executors to fill either gap with frontend inference, episode-scoped permissions, or reuse of unrelated group-media permission booleans.

---

*Phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g*  
*Research complete: 2026-07-16*
