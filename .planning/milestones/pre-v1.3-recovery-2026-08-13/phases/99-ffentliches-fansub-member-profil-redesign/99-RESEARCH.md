# Phase 99: Öffentliches Fansub-Member-Profil (Redesign) - Research

**Researched:** 2026-07-07 [VERIFIED: system date]  
**Domain:** Public Next.js member profile redesign with Go/Gin public profile and contribution projections [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: backend/cmd/server/main.go]  
**Confidence:** HIGH for current route/API/schema inventory; MEDIUM for active/completed project semantics because no existing release-version status field was found [VERIFIED: rg release_versions status]

<user_constraints>
## User Constraints (from CONTEXT.md)

The following decisions, discretion areas, and deferred items are copied from `99-CONTEXT.md`; they are locked planning inputs for Phase 99. [CITED: .planning/phases/99-ffentliches-fansub-member-profil-redesign/99-CONTEXT.md]

### Locked Decisions

### D-01 Page structure is locked
- Replace the public profile tab navigation (`Identität`, `Badges`, `Geschichte`, `Mitwirkende`) with a single scrollable page.
- Section order is locked: Hero -> Gruppenzugehörigkeit -> Aktuelle Projekte -> Auszeichnungen -> Letzte Beiträge -> Fansub-Geschichte -> Frühere Mitwirkungen.

### D-02 Hero content is retained and rearranged
- Avatar, name, verified status, and Schwerpunkt fields remain semantically unchanged.
- The verified status pill is rendered inline next to the name.
- The visual direction follows the approved prototype: navy gradient header, no separate status block.

### D-03 Group membership cards are public navigation
- Each current group membership renders as a clickable card with group logo/short code, group name, member role in the group, and member-since date if present.
- Cards link to the public group page.
- Multiple group memberships render as multiple cards if the data model supports them.

### D-04 Current projects replace the old role timeline
- The old skill/card-based Rollen-Timeline is removed from the public profile.
- Current projects render one card per Anime/project where the member is actively involved.
- Each card includes cover, project title, release version, and all roles the member has in that project.
- Cards link to the public Anime/project detail page.
- Data source must be the existing member -> role -> release-version mapping already used by the former Mitwirkende view; no new persistence structure is introduced.

### D-05 Current/previous project status must be evidence-based
- Planning and implementation must determine from the existing schema how "active" differs from "completed": release-version status, contribution date range, both, or another existing field.
- Do not hard-code active/completed status from UI assumptions.

### D-06 Badges are horizontally scrollable
- Badges render as a horizontal chain instead of a grid.
- Earned badges render normally; unearned badges render locked/disabled with a lock icon.
- The section shows progress as `x von y`.

### D-07 Badge tiers are conditional
- Render a small tier marker only if the existing badge system has a real tier/level field.
- If no tier/level field exists, omit the marker instead of inventing a placeholder.

### D-08 Last contributions are a new public section
- The public profile shows exactly the three most recent contribution items across notes/text contributions and media/assets uploads.
- The section is a pure sliding window derived at request time from sort order and `LIMIT 3`; no persisted "latest three" status is added.

### D-09 Last contributions are public and published only
- Last contributions include only items with Sichtbarkeit = "öffentlich" and Status = "veröffentlicht".
- Values and field names must be mapped from the existing tables/contracts; do not assume both sources use identical enum names without checking.

### D-10 Empty contributions are excluded
- Public contribution items with visibility/status set but no usable text and no image/media content are excluded.

### D-11 Contribution card layouts are type-specific
- Text contributions use a compact card with a left icon field and right text, clamped to two lines.
- Image contributions use a wide card with a 16:9 preview across full card width using `object-fit: cover`, then description below.
- Do not use square thumbnails for screenshots.

### D-12 Image crop intelligence is deferred
- Do not add configurable `object-position` or smart cropping for non-16:9 images in this phase.
- Revisit only after checking real example uploads if the centered crop produces unusable previews.

### D-13 Fansub story uses real truncation detection
- Fansub-Geschichte renders only when non-empty.
- Long text is clamped to about three lines with a lower fade-out and a `Mehr lesen` / `Weniger anzeigen` toggle.
- The toggle appears only when scroll height exceeds visible height.
- Short text has no toggle; empty text renders no section.

### D-14 Previous contributions are collapsed by default
- Frühere Mitwirkungen render behind a button `Frühere Mitwirkungen anzeigen (n)`.
- Entries are loaded or revealed only after user action.
- The section requires a real period/date field so entries do not repeat the prior `ohne Jahr` problem.

### D-15 No placeholder production data
- Productive code must not ship example, hard-coded, or placeholder content for projects, contributions, badges, group memberships, or profile text.
- Every displayed item comes from the existing database/API projections.

### D-16 Existing design system only
- Use existing Team4s CSS classes, variables, and components.
- Do not introduce new design tokens, colors, UI frameworks, or large unrelated redesigns.
- German user-facing text must use correct umlauts.

### D-17 Existing media/domain ownership remains canonical
- Do not invent parallel media logic.
- Release-version-scoped process media remains `release_version_media` + `media_assets` + `media_files`.
- Public/release-level `release_media` must not be used as a substitute for version-scoped admin/fansub media.
- Group media remains under existing group media structures.

### D-18 Public profile is display-only
- This phase does not add or change contribution writing, approval, notes, media editing, or admin/member management views.
- Existing notes/contributions and media edit flows remain the authoring surfaces.

### D-19 No full contribution archive
- The public profile has no `Alle Beiträge anzeigen` link and no complete archive in this phase.
- Only the latest three public/published items are displayed.

### D-20 Responsive verification is mandatory
- The redesigned page must be tested on at least one mobile viewport <= 390px and one desktop viewport.
- Verification must check for clipped, overlapping, or horizontally broken UI.

### A-01 Data source for current projects
- Before implementation, identify the exact DB/API source for member -> role -> release-version and how active/completed status is represented.

### A-02 Unified contribution query fields
- Before implementation, identify the notes/text and media/assets tables/projections, their visibility fields, status fields, timestamp fields, and enum value mapping for public/published filtering.

### A-03 Badge tier support
- Before implementation, confirm whether badges are binary or tiered.

### A-04 Period field for previous contributions
- Before implementation, identify the real date/period field for historical/previous contributions and decide whether the collapsed section can ship with real entries in this phase.

### A-05 Multiple group memberships
- Before implementation, confirm whether current data permits zero, one, or multiple group memberships per public member.

### the agent's Discretion
- Exact component split, endpoint naming, query implementation details, loading skeleton style, and whether current/previous projects share one query internally are implementation discretion after A-01/A-02/A-04 are researched.
- If an existing endpoint already provides all required fields safely, prefer adapting frontend projections over adding backend endpoints.

### Deferred Ideas (OUT OF SCOPE)
- Smart crop or user-configurable `object-position` for image contributions.
- Full contribution archive or `Alle Beiträge anzeigen` navigation.
- New contribution writing/release approval/media editing flows.
- Badge points, levels, rarity percentages, or broader gamification beyond conditional tier marker and progress indicator.
- Any new persistence model for contribution/profile/media data unless a researched gap makes a documented follow-up necessary.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01-D-02 | Replace tabbed public profile with the locked single-scroll section order and retained hero semantics. | Existing route and old nav are in `frontend/src/app/members/[slug]/page.tsx`; hero component is `MemberProfileHero`. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: frontend/src/components/profile/MemberProfileHero.tsx] |
| D-03, A-05 | Render current group memberships as public cards and support multiple memberships when present. | DTO field is `memberships: MemberProfileMembership[]`, loaded by `loadMemberships` without `LIMIT 1`, from historical and app membership sources. [VERIFIED: frontend/src/types/profile.ts] [VERIFIED: backend/internal/repository/member_profile_repository.go] |
| D-04-D-05, A-01 | Replace role timeline with current project cards based on existing member-role-release-version data. | Existing project source is `anime_contributions` + `anime_contribution_roles` + optional `release_version_id`, with release-version expansion through `release_versions` and `release_version_groups`; no `release_versions.status` was found. [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go] [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql] [VERIFIED: rg release_versions status] |
| D-06-D-07, A-03 | Render badge chain/progress and only show tier marker if real field exists. | Public badges expose `id`, `badge_code`, `badge_category`; schema has no generic `tier` or `level` column, but productive thresholds are separate badge codes. [VERIFIED: backend/internal/models/member_profile.go] [VERIFIED: database/migrations/0087_anime_contribution_roles_and_badges.up.sql] [VERIFIED: backend/internal/services/badge_service.go] |
| D-08-D-11, A-02 | Show exactly three latest public/published text/media contribution items with type-specific cards. | Text source is `release_version_notes`; media source is `release_version_media` joined to `media_assets` and `media_files`; public/published filters differ by source and need normalized query output. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] [VERIFIED: backend/internal/repository/media_repository.go] |
| D-12 | Defer image crop intelligence. | Must use centered 16:9 `object-fit: cover`; no object-position persistence should be planned. [CITED: 99-CONTEXT.md] |
| D-13 | Render story only when non-empty, with real overflow detection. | Current `MemberGroupsHistorySection` renders an empty placeholder card when story is empty; this must be removed for public page. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx] |
| D-14, A-04 | Collapse previous contributions and avoid `ohne Jahr`. | Real period fields exist on historical memberships/roles and anime contributions; current role timeline still renders `ohne Jahr` when both years are null. [VERIFIED: database/migrations/0114_hist_roles_date_migration.up.sql] [VERIFIED: database/migrations/0086_anime_contributions.up.sql] [VERIFIED: frontend/src/components/profile/MemberRoleTimeline.tsx] |
| D-15-D-19 | Display-only, no placeholder data, no new archive or authoring flows. | Current authoring flows live outside the public route; plans should only extend projections/UI and avoid mutation endpoints. [VERIFIED: backend/internal/handlers/admin_content_release_version_notes.go] [VERIFIED: backend/internal/handlers/admin_content_release_version_media.go] |
| D-20 | Responsive verification on mobile and desktop. | Existing frontend test stack is Vitest/jsdom; visual/responsive checks need browser/Playwright or live browser UAT in addition to unit tests. [VERIFIED: frontend/vitest.config.ts] [CITED: AGENTS.md] |
</phase_requirements>

## Summary

Phase 99 should plan a narrow public-profile projection and UI refactor, not a new profile system. The existing public route is `frontend/src/app/members/[slug]/page.tsx`, backed by `GET /api/v1/members/:slug` and `GET /api/v1/members/:slug/contributions`; the former already returns hero, memberships, public badges, recent media, and recent project aggregates, while the latter returns the old role timeline. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: backend/cmd/server/main.go] [VERIFIED: backend/internal/repository/member_profile_repository.go] [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go]

The highest-risk planning area is data semantics, not layout. Current projects can use `anime_contributions`/`anime_contribution_roles` with optional `release_version_id`, but release versions do not expose a status field, so active/completed must be derived from contribution period fields such as `ended_year IS NULL` versus non-null historical ranges, or from product-approved semantics layered over those fields. [VERIFIED: database/migrations/0086_anime_contributions.up.sql] [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql] [VERIFIED: rg release_versions status]

Last contributions need additive backend/API work unless Phase 99 accepts separate existing `recent_media` and `recent_contributions` arrays. A safe unified feed should normalize `release_version_notes` and `release_version_media` into one public `LIMIT 3` projection and must map text `visibility='public' AND status='published'` separately from media `visibilities.name='public' AND review_statuses.code='approved'` plus technical `media_assets.status='ready'` and ready file variants. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] [VERIFIED: backend/internal/repository/media_repository.go]

**Primary recommendation:** Extend the existing public member profile DTO with additive `current_projects`, `latest_contributions`, and `previous_contributions_count/items` fields, then replace the page composition in `frontend/src/app/members/[slug]/page.tsx` using existing profile components as analogs and deleting the old `MemberSectionNav`/role-timeline dependency from the public page. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: shared/contracts/openapi.yaml]

## Project Constraints (from AGENTS.md)

- Inspect existing code first, make a short plan, execute within scope, run checks, fix failures, self-review diff, and stop only on real blockers. [CITED: AGENTS.md]
- Stop before unclear persisted data ownership, schema decisions affecting production data, security-sensitive changes, destructive migrations, missing credentials/services, or any change that could attach release/fansub data to the wrong domain entity. [CITED: AGENTS.md]
- Anime and episodes are neutral; fansub context belongs to fansub groups, releases, and release versions. [CITED: AGENTS.md] [CITED: docs/architecture/db-schema-fansub-domain.md]
- Use `release_version_groups.fansub_group_id`; do not reintroduce `release_version_groups.fansubgroup_id`. [CITED: AGENTS.md] [VERIFIED: database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql]
- Release-version-scoped media must use `release_version_media` with `media_assets` and `media_files`, addressed by a real `release_version_id`; do not substitute `release_media`. [CITED: AGENTS.md] [CITED: docs/architecture/db-schema-fansub-domain.md]
- Before new components, hooks, helpers, services, repositories, endpoints, DTOs, or utilities, search for existing equivalents and prefer extending existing seams. [CITED: AGENTS.md] [CITED: docs/engineering/implementation-contract.md]
- `shared/contracts/openapi.yaml` is the canonical cross-surface contract, and frontend DTOs/API helpers must match runtime backend behavior. [CITED: AGENTS.md] [CITED: docs/api/api-contracts.md]
- User-facing German strings must use correct umlauts. [CITED: AGENTS.md]
- Use existing Team4s CSS/classes/components and do not introduce new design tokens or large unrelated visual redesigns. [CITED: AGENTS.md] [CITED: docs/frontend/ui-system.md]
- Public/member group pages must not mix internal review/admin actions into public presentation. [CITED: AGENTS.md]
- Run relevant checks: typecheck, lint, tests, build if feasible, and `git diff --check`; document checks that cannot run. [CITED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Public member route rendering | Frontend Server (SSR) | Browser / Client | `frontend/src/app/members/[slug]/page.tsx` is a Next route that fetches public data server-side, while story truncation and collapsed history interactions require client-side measurement/state. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] |
| Public member profile projection | API / Backend | Database / Storage | `GET /api/v1/members/:slug` resolves the member and builds public profile DTO fields from repository queries. [VERIFIED: backend/cmd/server/main.go] [VERIFIED: backend/internal/handlers/app_public_profile.go] |
| Current projects | API / Backend | Frontend Server (SSR) | Project cards need canonical role/release-version aggregation and public filters before UI rendering. [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go] |
| Latest public contributions | API / Backend | Database / Storage | A safe feed must filter public/published text/media at SQL level before exposing it to anonymous visitors. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: backend/internal/repository/media_repository.go] |
| Badge display/progress | Frontend Server (SSR) | API / Backend | Public badge rows already come embedded in public profile DTO; UI should render earned/locked state from known badge definitions without recomputing awards. [VERIFIED: backend/internal/repository/member_profile_repository.go] [VERIFIED: frontend/src/components/profile/memberBadgeLabels.ts] |
| Story truncation | Browser / Client | Frontend Server (SSR) | Actual overflow detection needs DOM measurements; server can only decide whether non-empty story HTML exists. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx] |
| Responsive verification | Browser / Client | Frontend Server (SSR) | Mobile/desktop layout correctness depends on rendered CSS and viewport behavior. [CITED: AGENTS.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | Local `^16.1.6`; npm latest `16.2.10` modified 2026-07-07 | App Router public profile page and SSR data fetch | Existing frontend stack; do not upgrade during Phase 99 unless separately planned. [VERIFIED: frontend/package.json] [VERIFIED: npm registry] |
| React | Local `18.3.1`; npm latest `19.2.7` modified 2026-07-06 | Profile components and client interactions | Existing app is pinned to React 18; Phase 99 should not mix a React major upgrade into a profile redesign. [VERIFIED: frontend/package.json] [VERIFIED: npm registry] |
| TypeScript | Local `^5.7.2`; npm latest `6.0.3` modified 2026-06-18 | Frontend DTO and component type safety | Existing typecheck uses `tsc --noEmit`. [VERIFIED: frontend/package.json] |
| Go | Local `go1.26.1 windows/amd64` | Backend handlers/repositories | Existing backend is Go/Gin with repository tests. [VERIFIED: go version] [VERIFIED: backend/internal/handlers/app_public_profile.go] |
| PostgreSQL schema/migrations | Repo migrations through `0122` present | Profile, contribution, badge, media persistence | Runtime source of truth for member/contribution/media fields. [VERIFIED: database/migrations] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | Local `^3.2.4`; npm latest `4.1.10` modified 2026-07-06 | Frontend unit/component tests | Add focused jsdom tests for section order, empty-story suppression, badge chain, and latest contribution cards. [VERIFIED: frontend/package.json] [VERIFIED: npm registry] [VERIFIED: frontend/vitest.config.ts] |
| lucide-react | Local `^0.469.0`; npm latest `1.23.0` modified 2026-07-01 | Existing icon library | Use for lock/status/type icons instead of custom SVGs. [VERIFIED: frontend/package.json] [VERIFIED: npm registry] |
| `@/components/ui` | Repo-local | Button, Card, Badge, SectionHeader, EmptyState, LoadingState | Required by local UI-system guidance before local generic styling. [CITED: docs/frontend/ui-system.md] [VERIFIED: frontend/src/components/ui] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Add a new public profile endpoint family | Extend `GET /api/v1/members/:slug` | Additive DTO fields keep one public profile contract and avoid page-level multi-fetch drift. [CITED: docs/api/api-contracts.md] [VERIFIED: shared/contracts/openapi.yaml] |
| Reuse old role timeline UI for previous contributions | Build a collapsed history component | Required because D-01/D-04 remove the public timeline as the main profile section. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberRoleTimeline.tsx] |
| Store “latest three” rows | Query with normalized `ORDER BY timestamp DESC LIMIT 3` | D-08 forbids persisted latest-three state. [CITED: 99-CONTEXT.md] |

**Installation:** No new package installation is recommended for Phase 99. [VERIFIED: frontend/package.json]  

```bash
# No install step recommended.
```

**Version verification:** Ran `npm view next/react/vitest/typescript/lucide-react version time.modified --json` on 2026-07-07 and compared with `frontend/package.json`. [VERIFIED: npm registry] [VERIFIED: frontend/package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Visitor or logged-in owner
        |
        v
Next route /members/[slug]
        |
        +--> GET /api/v1/members/:slug -- optional bearer for owner preview
        |        |
        |        +--> members + member_claims + app_users -> hero/profile visibility
        |        +--> loadMemberships -> group membership cards
        |        +--> loadPublicBadges -> badge chain/progress
        |        +--> NEW/extended public project projection -> current projects
        |        +--> NEW latest feed projection -> text/media latest three
        |        +--> NEW/counted historical projection -> collapsed previous contributions
        |
        +--> render public single-scroll page
                 |
                 +--> client-only story overflow toggle
                 +--> client-only collapsed previous history reveal
```

All current route/API ownership in the diagram is verified from source; the three `NEW/extended` projection nodes are recommended additive work for Phase 99. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: backend/internal/repository/member_profile_repository.go] [VERIFIED: shared/contracts/openapi.yaml]

### Recommended Project Structure

```text
frontend/src/app/members/[slug]/
├── page.tsx                    # public route composition [VERIFIED: current file]
├── page.module.css             # route layout styles [VERIFIED: current file]
├── OwnHiddenProfilePreview.tsx # keep hidden-profile owner preview [VERIFIED: current file]
└── OwnProfileEditLink.tsx      # keep owner edit link [VERIFIED: current file]

frontend/src/components/profile/
├── MemberProfileHero.tsx       # reuse/adjust hero [VERIFIED: current file]
├── MembershipsSection.tsx      # reuse for group cards [VERIFIED: current file]
├── MemberBadgeHighlights.tsx   # refactor into horizontal chain or add sibling [VERIFIED: current file]
├── RecentContributionsSection.tsx # analog for project cards [VERIFIED: current file]
├── RecentMediaSection.tsx      # analog for media card formatting [VERIFIED: current file]
└── profile.module.css          # existing profile styles [VERIFIED: current file]

backend/internal/repository/
├── member_profile_repository.go              # extend public profile projection [VERIFIED: current file]
├── anime_contributions_public_repository.go  # analog for public contribution filters [VERIFIED: current file]
└── anime_contributions_member_project_repository.go # analog for project/release-version detail [VERIFIED: current file]
```

### Pattern 1: Extend Existing Public Profile DTO Additively

**What:** Add public fields to `models.PublicMemberProfile`, `frontend/src/types/profile.ts`, `shared/contracts/openapi.yaml`, and the existing `getMemberProfile` helper rather than creating page-local fetch logic. [VERIFIED: backend/internal/models/member_profile.go] [VERIFIED: frontend/src/types/profile.ts] [VERIFIED: frontend/src/lib/api.ts] [VERIFIED: shared/contracts/openapi.yaml]

**When to use:** Use this for `current_projects`, `latest_contributions`, and collapsed history count because they are public profile display data. [CITED: docs/api/api-contracts.md]

**Example:**

```go
// Source: backend/internal/repository/member_profile_repository.go
profile.RecentContributions, loadErr = r.loadRecentContributions(ctx, row.memberID, true)
```

The existing pattern loads child DTO sections after resolving the member base row. [VERIFIED: backend/internal/repository/member_profile_repository.go]

### Pattern 2: Keep Public Filters in SQL

**What:** Apply visibility/status filters in repository queries before response serialization. [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go] [VERIFIED: backend/internal/repository/member_profile_repository.go]

**When to use:** Use for latest contributions and previous contributions because the route is anonymous-accessible. [VERIFIED: backend/cmd/server/main.go]

**Example:**

```sql
-- Source: database/migrations/0064_release_version_notes.up.sql
visibility IN ('public', 'internal')
status IN ('draft', 'published', 'archived', 'deleted')
```

### Pattern 3: Browser-Only Overflow Detection for Story

**What:** Render story only when non-empty server-side, then use a small client component to detect overflow and show `Mehr lesen` only when needed. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx]

**When to use:** Use this for D-13; do not show static placeholder text or unconditional toggle. [CITED: 99-CONTEXT.md]

### Anti-Patterns to Avoid

- **Page-local undocumented response parsing:** The public page must not infer fields from ad hoc `fetch` responses; update contracts and DTOs together. [CITED: docs/api/api-contracts.md]
- **Using `release_media` for latest media:** Version-scoped process media belongs to `release_version_media`, not `release_media`. [CITED: AGENTS.md] [CITED: docs/architecture/db-schema-fansub-domain.md]
- **Showing `ohne Jahr` in previous history:** D-14 explicitly exists to remove that old behavior. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberRoleTimeline.tsx]
- **Inventing badge tier fields:** No generic badge `tier`/`level` schema field exists; productive tiers are separate badge codes. [VERIFIED: database/migrations/0087_anime_contribution_roles_and_badges.up.sql] [VERIFIED: backend/internal/services/badge_service.go]
- **Mixing owner/admin actions into public pages:** Public page is display-only. [CITED: 99-CONTEXT.md] [CITED: AGENTS.md]

## Research Answers A-01 Through A-05

### A-01 Data Source for Current Projects

| Question | Answer |
|----------|--------|
| Exact member -> role source | `anime_contributions.member_id` is the current canonical member anchor after migration `0105`; older code sometimes falls back through `hist_fansub_group_members.member_id`, and roles live in `anime_contribution_roles.role_code`. [VERIFIED: database/migrations/0105_anime_contributions_member_id.up.sql] [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go] |
| Release-version source | `anime_contributions.release_version_id` is nullable and references `release_versions(id) ON DELETE SET NULL`; `NULL` means anime-wide/project-wide contribution. [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql] |
| Project grouping | Existing project grouping is by `anime_id` + `fansub_group_id`, with role arrays and release-version counts in `loadRecentContributions`. [VERIFIED: backend/internal/repository/member_profile_repository.go] |
| Detailed release-version expansion | Existing private “Mein Projekt” detail expands all group release versions via `release_versions` + `release_version_groups` + `fansub_releases` + `episodes` and marks `has_own_contribution`, `has_own_notes`, `has_own_media`. [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go] |
| Active vs completed | No `release_versions.status` field was found; contribution status is workflow status (`draft/proposed/confirmed/disputed/hidden`), not project completion. Use contribution period evidence: `ended_year IS NULL` as currently active/open-ended and `ended_year IS NOT NULL` as previous/completed history, unless product decides a stricter definition. [VERIFIED: database/migrations/0086_anime_contributions.up.sql] [VERIFIED: rg release_versions status] |
| Planning implication | Additive public projection should filter confirmed/public member-profile contributions and split current/previous by `ended_year`, while preserving version-specific rows when `release_version_id` is set and documenting anime-wide `NULL` rows as project-level roles. [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go] [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql] |

**Confidence:** MEDIUM. The source fields are verified, but the current/previous business rule is not already implemented for public project cards. [VERIFIED: backend/internal/repository/member_profile_repository.go]

### A-02 Unified Contribution Query Fields

| Source Type | Tables | Owner Field | Visibility Field | Status Field | Timestamp | Usable Content Filter |
|-------------|--------|-------------|------------------|--------------|-----------|-----------------------|
| Text note | `release_version_notes` joined to release/anime/group/role context | `release_version_notes.member_id` | `release_version_notes.visibility = 'public'` | `release_version_notes.status = 'published'` | Prefer `COALESCE(updated_at, created_at)` | Exclude rows where `body_text`, `body_html`, and `title` are all blank after trimming. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0070_release_version_notes_tiptap.up.sql] |
| Release-version media | `release_version_media` -> `media_assets` -> `media_files` plus release/anime context | `release_version_media.uploaded_by_user_id` references `users(id)` | `media_assets.visibility_id -> visibilities.name = 'public'`; API label maps to `oeffentlich`/`öffentlich` via repository map | `media_assets.review_status_id -> review_statuses.code = 'approved'`; technical asset/file status must be `ready` | Prefer `COALESCE(rvm.updated_at, rvm.created_at)` | Require non-deleted relation, ready asset, at least one ready original/thumb file, and usable preview path. [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql] [VERIFIED: backend/internal/repository/media_repository.go] |

**Safe UNION recommendation:** Build one repository method that returns normalized fields: `type` (`text`/`image`), `id`, `release_version_id`, `anime_id`, `anime_title`, `group_id`, `group_name`, `timestamp`, `title`, `text_preview`, `image_url`, `caption`, `category`, and source-specific ids, then sort by timestamp DESC and `LIMIT 3`. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql]

**Important owner-risk:** Existing `loadRecentMedia(ctx, appUserID)` passes a resolved app-user id into a query where `release_version_media.uploaded_by_user_id` is a `users(id)` FK, so the plan must verify whether `app_users.id` and legacy `users.id` align in live data before relying on current `recent_media`. [VERIFIED: backend/internal/repository/member_profile_repository.go] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql]

**Enum mapping:** For notes, German “veröffentlicht” maps to DB `published`; for media review lifecycle, German “freigegeben/veröffentlicht” maps to DB `approved`, while media technical status `ready` is a separate processing state. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql] [VERIFIED: backend/internal/repository/media_repository.go]

**Confidence:** HIGH for field inventory; MEDIUM for owner mapping until verified against runtime IDs. [VERIFIED: source grep]

### A-03 Badge Tier Support

Public badges are binary rows in `member_badges`: `id`, `member_id`, `badge_code`, `badge_category`, status, visibility, and awarded timestamp; no generic `tier`, `level`, `points`, or rarity field exists in the table or public DTO. [VERIFIED: database/migrations/0087_anime_contribution_roles_and_badges.up.sql] [VERIFIED: backend/internal/models/member_profile.go] [VERIFIED: frontend/src/types/profile.ts]

The system has tier-like productive badges as distinct badge codes: `productive_bronze`, `productive_silver`, and `productive_gold`, awarded at 10/25/50 distinct confirmed anime contributions. [VERIFIED: backend/internal/services/badge_service.go] [VERIFIED: frontend/src/components/profile/memberBadgeLabels.ts]

Plan badges as a known badge catalog with earned/locked state and progress `x von y`; do not add or render a generic tier marker unless a future schema field is added in a separate decision. [VERIFIED: frontend/src/components/profile/memberBadgeLabels.ts] [CITED: 99-CONTEXT.md]

**Confidence:** HIGH. [VERIFIED: database/migrations/0087_anime_contribution_roles_and_badges.up.sql]

### A-04 Period Field for Previous Contributions

Historical membership periods use `hist_fansub_group_members.joined_date` and `left_date`, migrated from year columns in `0114`. [VERIFIED: database/migrations/0114_hist_roles_date_migration.up.sql]  
Historical group role periods use `hist_group_member_roles.started_date` and `ended_date`, also migrated in `0114`. [VERIFIED: database/migrations/0114_hist_roles_date_migration.up.sql]  
Anime contribution periods still use `anime_contributions.started_year` and `ended_year`. [VERIFIED: database/migrations/0086_anime_contributions.up.sql]  

A real collapsed history section is feasible now if it includes only entries with at least one real period field and excludes no-period rows from the initial visible/counted history, or reports them in a separate internal follow-up rather than showing `ohne Jahr`. [VERIFIED: frontend/src/components/profile/MemberRoleTimeline.tsx] [CITED: 99-CONTEXT.md]

**Confidence:** HIGH for available fields; MEDIUM for exact inclusion policy because the phase decision requires avoiding no-year repeats but does not state whether no-period rows should be hidden or omitted from count. [CITED: 99-CONTEXT.md]

### A-05 Multiple Group Memberships

The existing public profile DTO models memberships as an array, `MemberProfileMembership[]`. [VERIFIED: frontend/src/types/profile.ts]  
Backend `loadMemberships` returns every fansub group with either a matching historical membership for the member or a matching app membership for the resolved app user, ordered by group name, and does not apply `LIMIT 1`. [VERIFIED: backend/internal/repository/member_profile_repository.go]  
The historical membership schema is unique per `(fansub_group_id, member_id)`, not globally per member, so multiple groups per member are supported. [VERIFIED: database/migrations/0082_historical_fansub_group_members.up.sql]  

**Confidence:** HIGH. [VERIFIED: backend/internal/repository/member_profile_repository.go]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Public profile data fetching | Ad hoc page `fetch` with local JSON parsing | `getMemberProfile` / `GET /api/v1/members/:slug` additive DTO | Keeps OpenAPI, backend, frontend helper, and types aligned. [CITED: docs/api/api-contracts.md] [VERIFIED: frontend/src/lib/api.ts] |
| Member project role mapping | New role tables or UI-only grouping | `anime_contributions`, `anime_contribution_roles`, `release_version_id`, existing project detail query patterns | Existing schema already owns member -> role -> project/release-version facts. [VERIFIED: database/migrations/0086_anime_contributions.up.sql] [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go] |
| Latest media lookup | `release_media`, episode media, or separate upload/media table | `release_version_media` + `media_assets` + `media_files` | Required domain ownership for release-version process media. [CITED: AGENTS.md] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] |
| Rich text rendering | `dangerouslySetInnerHTML` in route code | Existing `RichTextRenderer` | Current story section already uses sanitized renderer. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx] |
| Badge computation in UI | Recalculate badges from contribution counts in React | Public `public_badges` DTO plus existing badge label catalog | Badge service/repository own badge state and visibility. [VERIFIED: backend/internal/services/badge_service.go] [VERIFIED: frontend/src/components/profile/memberBadgeLabels.ts] |
| Overflow detection | Always show `Mehr lesen` | DOM measurement in a small client component | Toggle must appear only when actual scroll height exceeds visible height. [CITED: 99-CONTEXT.md] |

**Key insight:** The hard part is preserving domain ownership and public visibility filters; custom UI-only derivations would easily leak hidden contribution/media data or attach release-version media to the wrong entity. [CITED: AGENTS.md] [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go]

## Common Pitfalls

### Pitfall 1: Treating `release_versions` as status-bearing
**What goes wrong:** Planner asks executor to filter current projects by `release_versions.status`. [VERIFIED: rg release_versions status]  
**Why it happens:** Project cards mention active/completed, but the release-version schema exposes version/title/date, not status. [VERIFIED: database/migrations/0035_add_release_tables.up.sql] [VERIFIED: database/migrations/0037_add_release_decomposition_tables.up.sql]  
**How to avoid:** Use contribution period fields and explicitly document the rule. [VERIFIED: database/migrations/0086_anime_contributions.up.sql]  
**Warning signs:** Code contains hard-coded `active` for every project. [CITED: 99-CONTEXT.md]

### Pitfall 2: Showing anime-wide contributions as a fake release version
**What goes wrong:** UI invents a version label for rows where `anime_contributions.release_version_id IS NULL`. [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql]  
**Why it happens:** D-04 requires release-version content, but schema allows project-wide contribution rows. [CITED: 99-CONTEXT.md] [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql]  
**How to avoid:** Public project DTO should distinguish `project_level` versus specific release-version rows and render aggregate counts or real version lists only. [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go]  
**Warning signs:** Card text like `v1` appears without a joined `release_version_id`. [VERIFIED: source grep]

### Pitfall 3: Mapping “published” identically across notes and media
**What goes wrong:** Latest feed filters media by nonexistent `published` status or notes by media `approved`. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql]  
**Why it happens:** D-09 uses German product language, while schema has source-specific status axes. [CITED: 99-CONTEXT.md]  
**How to avoid:** Normalize in SQL: notes use `status='published'`; media uses `review_statuses.code='approved'` plus technical ready statuses. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql]

### Pitfall 4: Current `recent_media` owner mismatch
**What goes wrong:** Public media is missing for verified profiles or attributed to wrong users. [VERIFIED: backend/internal/repository/member_profile_repository.go]  
**Why it happens:** `release_version_media.uploaded_by_user_id` references `users(id)`, while `GetPublicMemberProfile` calls `loadRecentMedia` with app-user id. [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] [VERIFIED: backend/internal/repository/member_profile_repository.go]  
**How to avoid:** Plan a focused owner mapping check using `member_claims -> app_users -> legacy_user_id -> users.id`, or use the same identity field upload handlers persist. [VERIFIED: backend/internal/repository/member_profile_repository.go] [VERIFIED: backend/internal/repository/media_repository.go]

### Pitfall 5: Shipping empty story/history containers
**What goes wrong:** Public page shows `Noch keine Geschichte hinterlegt` or equivalent empty placeholders. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx]  
**Why it happens:** Existing component was built for older profile polish and currently renders an empty story card. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx]  
**How to avoid:** Split public story display so empty story renders no section. [CITED: 99-CONTEXT.md]

## Code Examples

### Existing Public Profile Handler

```go
// Source: backend/internal/handlers/app_public_profile.go
func (h *AppPublicProfileHandler) GetPublicMemberProfile(c *gin.Context) {
    slug := strings.TrimSpace(c.Param("slug"))
    profile, err := h.profileRepo.GetPublicMemberProfile(c.Request.Context(), slug)
    // members_only profiles return { visible: false, reason: "members_only" } unless owner preview
}
```

This route allows anonymous access with optional auth for owner preview. [VERIFIED: backend/internal/handlers/app_public_profile.go] [VERIFIED: backend/cmd/server/main.go]

### Existing Public Member Contributions Query Shape

```go
// Source: backend/internal/repository/anime_contributions_public_repository.go
type PublicMemberRoleEntry struct {
    FansubGroupName string  `json:"fansub_group_name"`
    RoleCode        string  `json:"role_code"`
    Context         string  `json:"context"`
    AnimeTitle      *string `json:"anime_title"`
    StartedYear     *int    `json:"started_year"`
    EndedYear       *int    `json:"ended_year"`
    Status          string  `json:"status"`
}
```

Use this as an analog for previous contributions, not as the main public project UI. [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go] [CITED: 99-CONTEXT.md]

### Existing Membership Cards

```tsx
// Source: frontend/src/components/profile/MembershipsSection.test.tsx
expect(screen.getByRole('link', { name: /AnimeOwnage/i }).getAttribute('href')).toBe('/fansubs/animeownage')
```

The current membership component already links cards to public group pages. [VERIFIED: frontend/src/components/profile/MembershipsSection.test.tsx]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public member page uses `MemberSectionNav` plus old role timeline | Phase 99 should use one scrollable page and remove tab/nav reliance | Locked in 99-CONTEXT on 2026-07-07 | Planner should schedule route composition replacement. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/app/members/[slug]/page.tsx] |
| Historical role periods used year columns | Historical membership/role periods now use date columns with year extraction in public queries | Migration `0114` | Collapsed previous history can avoid `ohne Jahr` by using real dates/years. [VERIFIED: database/migrations/0114_hist_roles_date_migration.up.sql] |
| Anime contributions were historical-membership anchored only | `anime_contributions.member_id` exists as canonical member anchor while legacy `fansub_group_member_id` may remain transitional | Migration `0105` | Public project queries should prefer `ac.member_id` with fallback only where existing code already does. [VERIFIED: database/migrations/0105_anime_contributions_member_id.up.sql] |
| Badge display as top grid/highlights | Phase 99 requires horizontal chain with earned/locked state and progress | Locked in 99-CONTEXT on 2026-07-07 | Existing `MemberBadgeHighlights` needs refactor or replacement. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberBadgeHighlights.tsx] |

**Deprecated/outdated:**
- Public `MemberRoleTimeline` as the main “Mitwirkende” section is outdated for Phase 99. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberRoleTimeline.tsx]
- Empty public story placeholders are outdated for Phase 99. [CITED: 99-CONTEXT.md] [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx]

## Read-First Inventory for Plans

| Area | Files |
|------|-------|
| Public route/composition | `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/app/members/[slug]/page.module.css`, `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx`, `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` [VERIFIED: rg --files] |
| Existing profile components | `frontend/src/components/profile/MemberProfileHero.tsx`, `MembershipsSection.tsx`, `MemberBadgeHighlights.tsx`, `RecentContributionsSection.tsx`, `RecentMediaSection.tsx`, `MemberGroupsHistorySection.tsx`, `MemberRoleTimeline.tsx`, `memberBadgeLabels.ts`, `profile.module.css` [VERIFIED: rg --files] |
| Existing frontend tests | `MemberProfileHero.test.tsx`, `MembershipsSection.test.tsx`, `RecentContributionsSection.test.tsx`, `RecentMediaSection.test.tsx`, `MemberRoleTimeline.test.tsx`, `MemberContributionFilters.test.tsx` [VERIFIED: rg --files] |
| API/helper/types | `frontend/src/lib/api.ts`, `frontend/src/types/profile.ts`, `frontend/src/types/contributions.ts` [VERIFIED: rg --files] |
| Backend public handlers | `backend/internal/handlers/app_public_profile.go`, `backend/internal/handlers/app_public_profile_test.go`, `backend/internal/handlers/contributions_public_handler.go`, `backend/cmd/server/main.go` [VERIFIED: rg --files] |
| Backend repositories/models | `backend/internal/models/member_profile.go`, `backend/internal/repository/member_profile_repository.go`, `backend/internal/repository/anime_contributions_public_repository.go`, `backend/internal/repository/anime_contributions_member_project_repository.go`, `backend/internal/repository/release_version_notes_repository.go`, `backend/internal/repository/release_version_media_repository.go`, `backend/internal/repository/media_repository.go`, `backend/internal/repository/badge_repository.go` [VERIFIED: rg --files] |
| Contracts | `shared/contracts/openapi.yaml`, `shared/contracts/contributions.yaml`, `shared/contracts/admin-content.yaml` [VERIFIED: rg --files] |
| Migrations/schema | `0064_release_version_notes.up.sql`, `0059_release_version_media_schema.up.sql`, `0086_anime_contributions.up.sql`, `0087_anime_contribution_roles_and_badges.up.sql`, `0091_anime_contributions_release_version.up.sql`, `0097_v12_status_foundation.up.sql`, `0105_anime_contributions_member_id.up.sql`, `0114_hist_roles_date_migration.up.sql` [VERIFIED: rg database/migrations] |

## Contract Files to Update

- Update `shared/contracts/openapi.yaml` if `PublicMemberProfileData` gains `current_projects`, `latest_contributions`, previous-history fields, badge catalog/progress fields, or changed existing arrays. [CITED: docs/api/api-contracts.md] [VERIFIED: shared/contracts/openapi.yaml]
- Update `frontend/src/types/profile.ts` with the same public DTO additions. [CITED: docs/api/api-contracts.md] [VERIFIED: frontend/src/types/profile.ts]
- Update `frontend/src/lib/api.ts` only if endpoint path, response parsing, auth handling, or helper signatures change; existing `getMemberProfile` already accepts optional auth token for owner preview. [VERIFIED: frontend/src/lib/api.ts]
- Update `shared/contracts/contributions.yaml` only if the separate `/api/v1/members/:slug/contributions` endpoint changes; prefer not changing it if the old timeline is simply no longer used by the public page. [VERIFIED: shared/contracts/contributions.yaml] [VERIFIED: frontend/src/app/members/[slug]/page.tsx]
- `shared/contracts/admin-content.yaml` is relevant only if admin/release-version note or media review contracts change, which Phase 99 should avoid. [CITED: 99-CONTEXT.md] [VERIFIED: shared/contracts/admin-content.yaml]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | “Current” projects should use `ended_year IS NULL` and previous/completed projects should use non-null `ended_year`, because no release-version status field was found. [ASSUMED] | A-01 | Product may define active/completed differently, requiring a small discussion/decision before implementation. |
| A2 | Media “veröffentlicht” should map to review status `approved`/API `freigegeben`, not to a new media `published` status. [ASSUMED] | A-02 | Latest media feed could filter too broadly or narrowly if product wants a stricter publication lifecycle. |
| A3 | Public project card can render aggregate or list-style release-version information when `anime_contributions.release_version_id` is null. [ASSUMED] | A-01 | D-04 wording may require an exact visible release-version label for every card, which schema cannot guarantee for project-level roles. |

## Open Questions (RESOLVED)

1. **What exact label should project-level contributions show for release version?** RESOLVED  
   What we know: `release_version_id` can be null for anime-wide roles. [VERIFIED: database/migrations/0091_anime_contributions_release_version.up.sql]  
   Resolution: Phase 99 must never invent a release-version label for anime-wide/project-level rows. The DTO returns `release_versions[]` and `is_project_level`; the UI renders real version chips where `release_version_id` exists and a project-level indicator/count where the contribution is anime-wide. This is reflected in Plans 99-01 and 99-02. [VERIFIED: backend/internal/repository/anime_contributions_member_project_repository.go]

2. **Should no-period historical rows be omitted or counted behind the collapsed button?** RESOLVED  
   What we know: Real date/year fields exist, and current `ohne Jahr` behavior must not repeat. [VERIFIED: database/migrations/0114_hist_roles_date_migration.up.sql] [CITED: 99-CONTEXT.md]  
   Resolution: Phase 99 omits no-period rows from both the public previous-history list and count. Executors must not display `ohne Jahr`; if rows without period data are relevant, they become a data-completion follow-up outside this public redesign. This is reflected in Plans 99-00, 99-01, and 99-03. [CITED: 99-CONTEXT.md]

3. **Is `release_version_media.uploaded_by_user_id` always a legacy `users.id`, and how does it map to member identity?** RESOLVED AS EXECUTION GATE  
   What we know: The DB FK references `users(id)`, and existing public profile code passes app-user id into `loadRecentMedia`. [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] [VERIFIED: backend/internal/repository/member_profile_repository.go]  
   Resolution: Phase 99 may expose latest media only after Wave-0 backend tests prove the existing member/account -> uploader mapping is safe. If that test cannot be made truthful with existing data, Plan 99-01 must stop and document the missing ownership decision instead of broadening the query or exposing media by guesswork. This gate is encoded in Plans 99-00 and 99-01. [VERIFIED: backend/internal/repository/member_profile_repository_test.go]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Frontend tests/typecheck/build | ✓ | `v24.14.0` | None needed. [VERIFIED: node --version] |
| npm | Frontend package scripts and npm registry checks | ✓ | `11.9.0` | None needed. [VERIFIED: npm --version] |
| Go | Backend tests | ✓ | `go1.26.1 windows/amd64` | None needed. [VERIFIED: go version] |
| Git | Dirty-worktree awareness and diff checks | ✓ | `git status --short` succeeded | Do not touch unrelated dirty files. [VERIFIED: git status --short] |
| Knowledge graph | Semantic graph context | ✗ | `.planning/graphs/graph.json` absent | Use grep/code inspection. [VERIFIED: graph check] |

**Missing dependencies with no fallback:** None found for research and normal planning. [VERIFIED: environment audit]  
**Missing dependencies with fallback:** Knowledge graph absent; grep/code inspection was used. [VERIFIED: graph check]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Frontend framework | Vitest with jsdom file directives; `frontend/vitest.config.ts` includes `src/**/*.test.ts(x)`. [VERIFIED: frontend/vitest.config.ts] |
| Backend framework | Go test files under `backend/internal/...`; focused repository/handler source tests already exist. [VERIFIED: rg --files backend/internal '*_test.go'] |
| Frontend quick run | `cd frontend; npm run test -- src/components/profile/MemberProfileHero.test.tsx src/components/profile/MembershipsSection.test.tsx src/components/profile/RecentContributionsSection.test.tsx src/components/profile/RecentMediaSection.test.tsx` [VERIFIED: frontend/package.json] |
| Frontend full suite | `cd frontend; npm run test` then `npm run typecheck` and `npm run lint`. [VERIFIED: frontend/package.json] |
| Backend quick run | `cd backend; go test ./internal/handlers ./internal/repository` [VERIFIED: backend test files] |
| Diff hygiene | `git diff --check` [CITED: AGENTS.md] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| D-01-D-02 | Public page renders locked section order and no old nav/tabs. | frontend unit/server render | `cd frontend; npm run test -- src/app/members/[slug]/page.test.tsx` | ❌ Wave 0 [VERIFIED: rg --files] |
| D-03/A-05 | Multiple memberships render as linked cards. | frontend unit | `cd frontend; npm run test -- src/components/profile/MembershipsSection.test.tsx` | ✅ [VERIFIED: frontend/src/components/profile/MembershipsSection.test.tsx] |
| D-04/A-01 | Current projects derive from real contribution/release-version fields. | backend repository source/unit | `cd backend; go test ./internal/repository -run MemberProfile` | ✅ partial, ❌ new public project tests [VERIFIED: backend/internal/repository/member_profile_repository_test.go] |
| D-06-D-07/A-03 | Badge chain shows earned/locked/progress and no fake tier marker. | frontend unit | `cd frontend; npm run test -- src/components/profile/MemberBadgeHighlights.test.tsx` | ❌ Wave 0 [VERIFIED: rg --files] |
| D-08-D-11/A-02 | Latest three feed unions public/published notes and media with type-specific output. | backend repository + frontend unit | `cd backend; go test ./internal/repository -run PublicMemberLatest`; `cd frontend; npm run test -- src/components/profile/LatestContributionsSection.test.tsx` | ❌ Wave 0 [VERIFIED: rg --files] |
| D-13 | Story section hides empty content and only shows toggle on overflow. | frontend unit + browser | `cd frontend; npm run test -- src/components/profile/MemberStorySection.test.tsx` | ❌ Wave 0 [VERIFIED: rg --files] |
| D-14/A-04 | Previous history collapsed by default and avoids no-period rows. | backend repository + frontend unit | `cd backend; go test ./internal/repository -run PublicMemberPrevious`; `cd frontend; npm run test -- src/components/profile/PreviousContributionsSection.test.tsx` | ❌ Wave 0 [VERIFIED: rg --files] |
| D-20 | Mobile <=390px and desktop have no clipping/overlap/horizontal breakage. | browser/UAT | Playwright/live browser after implementation | ❌ Wave 0 [CITED: AGENTS.md] |

### Sampling Rate

- **Per task commit:** Run focused frontend/backend tests for touched files plus `git diff --check`. [CITED: AGENTS.md]
- **Per wave merge:** Run `cd frontend; npm run typecheck`, `npm run lint`, relevant `npm run test`, and backend package tests for changed handlers/repositories. [CITED: AGENTS.md] [VERIFIED: frontend/package.json]
- **Phase gate:** Full relevant frontend checks, backend repository/handler tests, and mobile/desktop live/browser verification. [CITED: AGENTS.md] [CITED: 99-CONTEXT.md]

### Wave 0 Gaps

- [ ] `frontend/src/app/members/[slug]/page.test.tsx` - section order, no old nav/tabs, hidden profile preview still works. [VERIFIED: current route]
- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` or updated `MemberBadgeHighlights.test.tsx` - earned/locked/progress and no generic tier. [VERIFIED: current component]
- [ ] `frontend/src/components/profile/LatestContributionsSection.test.tsx` - text vs image layouts, 16:9 image preview, exactly three items. [CITED: 99-CONTEXT.md]
- [ ] `frontend/src/components/profile/MemberStorySection.test.tsx` - empty hidden, overflow toggle only when measured overflow exists. [CITED: 99-CONTEXT.md]
- [ ] `backend/internal/repository/member_profile_repository_test.go` additions - latest feed filters, owner-id mapping, current/previous split, no hidden/private leakage. [VERIFIED: current test file]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Partial | Public route is anonymous with optional bearer for owner preview; use existing optional auth middleware and do not add protected browser token handling. [VERIFIED: backend/cmd/server/main.go] [VERIFIED: backend/internal/handlers/app_public_profile.go] |
| V3 Session Management | Partial | Existing `getMemberProfile(slug, token)` server call reads cookies for owner preview; avoid new client-side token reads. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [CITED: docs/frontend/auth-api-client.md] |
| V4 Access Control | Yes | SQL filters must enforce public/profile visibility before serialization; members-only profiles must keep visibility notice behavior. [VERIFIED: backend/internal/handlers/app_public_profile.go] [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go] |
| V5 Input Validation | Yes | Slug path input is trimmed/validated in handler; new query methods must keep parameterized SQL. [VERIFIED: backend/internal/handlers/app_public_profile.go] [VERIFIED: backend/internal/repository/anime_contributions_public_versions_repository.go] |
| V6 Cryptography | No | Phase 99 has no cryptographic primitive changes. [CITED: 99-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hidden/private contribution disclosure | Information Disclosure | Repository-level filters: public member profile only, `visibility='public'`, status published/approved, non-deleted rows. [VERIFIED: database/migrations/0064_release_version_notes.up.sql] [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql] |
| Cross-member media attribution | Spoofing / Information Disclosure | Verify `release_version_media.uploaded_by_user_id` owner mapping before public feed exposure. [VERIFIED: database/migrations/0059_release_version_media_schema.up.sql] |
| XSS through rich text story/notes | Tampering / XSS | Use existing sanitized `RichTextRenderer` and backend-rendered/sanitized TipTap HTML; avoid new raw HTML rendering. [VERIFIED: frontend/src/components/profile/MemberGroupsHistorySection.tsx] [VERIFIED: backend/internal/services/tiptap_service.go] |
| SQL injection through slug or filters | Tampering | Use existing parameterized repository queries. [VERIFIED: backend/internal/repository/anime_contributions_public_repository.go] |
| Contract drift | Integrity | Update OpenAPI, frontend DTO, API helper, backend models/repository together. [CITED: docs/api/api-contracts.md] |

## Sources

### Primary (HIGH confidence)

- `99-CONTEXT.md` - locked D/A requirements and deferred scope. [CITED: .planning/phases/99-ffentliches-fansub-member-profil-redesign/99-CONTEXT.md]
- `AGENTS.md` - project/domain/API/UI/validation rules. [CITED: AGENTS.md]
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release/media ownership. [CITED: docs/architecture/db-schema-fansub-domain.md]
- `docs/engineering/implementation-contract.md` - reuse/search-first rules. [CITED: docs/engineering/implementation-contract.md]
- `docs/api/api-contracts.md` - contract update rules. [CITED: docs/api/api-contracts.md]
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` - UI component/tokens and semantic-control guidance. [CITED: docs/frontend/ui-system.md] [CITED: docs/agent-guidelines-ui.md]
- `frontend/src/app/members/[slug]/page.tsx` - current public route. [VERIFIED: codebase grep/read]
- `backend/internal/repository/member_profile_repository.go` - public profile projection, memberships, badges, recent media/contributions. [VERIFIED: codebase grep/read]
- `backend/internal/repository/anime_contributions_public_repository.go` - public role timeline and public filters. [VERIFIED: codebase grep/read]
- `backend/internal/repository/anime_contributions_member_project_repository.go` - member project/release-version detail pattern. [VERIFIED: codebase grep/read]
- `database/migrations/*.sql` cited above - schema fields and constraints. [VERIFIED: codebase grep/read]
- `shared/contracts/openapi.yaml` and `shared/contracts/contributions.yaml` - current public contract shapes. [VERIFIED: codebase grep/read]

### Secondary (MEDIUM confidence)

- npm registry version checks for Next, React, Vitest, TypeScript, and lucide-react. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- None used. [VERIFIED: source inventory]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions and local scripts were verified from `frontend/package.json`, npm registry, and local runtime commands. [VERIFIED: frontend/package.json] [VERIFIED: npm registry]
- Architecture: HIGH - current route, backend handlers, repository methods, and server route registration were verified from source. [VERIFIED: frontend/src/app/members/[slug]/page.tsx] [VERIFIED: backend/cmd/server/main.go]
- Data semantics: MEDIUM - exact fields are verified, but active/completed and media owner mapping need implementation-time validation/decision. [VERIFIED: database/migrations/0086_anime_contributions.up.sql] [ASSUMED]
- Pitfalls: HIGH - each listed pitfall maps to verified existing source or locked context. [VERIFIED: source inventory] [CITED: 99-CONTEXT.md]

**Research date:** 2026-07-07 [VERIFIED: system date]  
**Valid until:** 2026-07-14 because the profile/contribution code is actively changing in this milestone. [VERIFIED: .planning/STATE.md]
