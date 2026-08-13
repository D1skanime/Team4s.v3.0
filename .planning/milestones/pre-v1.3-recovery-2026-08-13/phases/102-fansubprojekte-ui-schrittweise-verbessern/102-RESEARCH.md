# Phase 102: fansubprojekte-ui-schrittweise-verbessern - Research

**Researched:** 2026-07-14 [VERIFIED: system date]
**Domain:** Next.js App Router public Fansub project UI, Team4s public API DTO alignment, release/fansub media ownership [VERIFIED: codebase grep]
**Confidence:** HIGH for existing code paths, MEDIUM for pretty-route implementation details until user accepts slice order [VERIFIED: codebase grep]

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this full section: `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md` [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Locked Decisions

### D-01 Work step by step
- Discuss one UI area.
- Implement only that area.
- Test it on `http://127.0.0.1:3000`.
- Continue only after user acceptance.

### D-02 The Fansub project detail page is the primary surface
- The phase starts on `/anime/[id]/group/[groupId]`.
- `/fansubs/[slug]` is only the navigation entry point unless a later defect blocks that jump.
- The first implementation slice is the project detail hero, not the project cards on the Fansub profile.

### D-03 Fansub project detail hero should visually relate to the Fansub profile hero
- `/anime/[id]/group/[groupId]` should feel like part of the same public site language as `/fansubs/[slug]`.
- It may still expose Anime-specific information and project-specific stats.

### D-04 Desktop, tablet, and mobile are separate design checks
- Desktop can use wider/larger media.
- Tablet portrait must not inherit a desktop layout that becomes cramped.
- Mobile must prioritize readable cards and touch-friendly controls.

### D-05 Sections are improved individually
- Do not redesign `Geschichte`, `Beteiligte`, `Releases`, `OP/ED/Middle`, and `Medien` all at once.
- Each section gets its own discussion, implementation, and UAT pass.

### D-06 Public wording can be corrected in UI copy
- Public labels may clarify the Fansub context, such as `Fansub-Projekte` or `Fansub-Releases`.
- This does not imply backend field renames.

### D-07 Reuse first
- Existing files and components are the implementation anchors.
- Avoid parallel components unless the existing seam is truly too narrow.

### the agent's Discretion

None explicitly named in CONTEXT.md. Implementation planners may choose exact extraction boundaries and helper names only where they preserve D-01 through D-07 and the later locked decisions in the same CONTEXT.md. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)

- New project data fields are out of scope until the UI proves an actual data gap.
- Admin project editing is out of scope unless it blocks public display verification.
- Release permission/eligibility logic is out of scope.
- Existing test data does not need cleanup unless it blocks UAT for the current step.
- Slug history/old-slug redirect support is out of scope.
- A dedicated project-member contribution page showing one member's posts/media for a Fansub project is out of scope.
- Release card/version/cooperation display redesign is out of scope and should be its own later phase.
- OP/ED/Middle and Medien should later be integrated into release detail/presentation work instead of being standalone project-page sections.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Work step by step. | Preserve `102-00-PLAN.md` as the control plan and add concrete plans one UI slice at a time. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-00-PLAN.md] |
| D-02 | Project detail page is primary; Fansub profile is entry check only. | Main work belongs under `frontend/src/app/anime/[id]/group/[groupId]` plus additive pretty route wrapper. [VERIFIED: codebase grep] |
| D-03 | Project hero should relate visually to public Fansub hero. | Reuse visual baseline from `FansubHeroSection`, `FansubTeamSection`, and local `HeroSection`. [VERIFIED: codebase grep] |
| D-04 | Desktop, tablet, and mobile are separate checks. | Plan UAT must include 127.0.0.1:3000 checks at desktop, tablet portrait, and mobile widths. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] |
| D-05 | Improve sections individually. | Do not combine hero, URL/navigation, story, members, releases, and removals in one implementation plan. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] |
| D-06 | Public copy may change without backend renames. | UI labels such as `Geschichte des Fansub-Projekts` and `Releases zum Fansub` can change in TSX/tests without DB field renames. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] |
| D-07 | Reuse first. | Existing route, public profile DTOs, section components, UI primitives, and public API helpers are implementation anchors. [VERIFIED: docs/engineering/implementation-contract.md] |
</phase_requirements>

## Summary

Phase 102 should be planned as a sequence of small frontend-first implementation plans, not as a replacement of the public project data model. The current technical route `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` already composes the public project detail from existing public endpoints, section components, and typed DTOs; plans should extract reusable project-page composition before adding `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`. [VERIFIED: codebase grep]

The largest confirmed DTO gap is the pretty route key: `PublicFansubProject` currently carries `id`, `title`, status, cover, max episodes, and `banner_url`, but it does not carry `anime_slug`; the backend repository query for public Fansub projects selects `a.id` and `a.title` but not `a.slug`. [VERIFIED: backend/internal/models/fansub.go] [VERIFIED: backend/internal/repository/fansub_repository.go] Adding `anime_slug` is an additive contract change touching backend model/query, OpenAPI, frontend DTO, and `FansubProjectBannerCard` links. [VERIFIED: docs/api/api-contracts.md]

The existing `GroupEdgeNavigation` must not be reused unchanged for `Weitere Projekte`: its helper builds groups for the same Anime and `getOtherGroups` excludes the current group while selecting other `anime_fansub_groups`, which directly contradicts same-Fansub-only navigation. [VERIFIED: frontend/src/lib/groupNavigation.ts] [VERIFIED: backend/internal/repository/group_repository.go] Build a new same-Fansub project navigator from the current Fansub public-profile project list, and keep cooperation context as hero text sourced from same-Anime other groups. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

**Primary recommendation:** Add implementation plans in this order: shared project-page composition, additive pretty route plus `anime_slug` DTO, same-Fansub hero navigation/cooperation hint, story block, member rows, release/removal cleanup, then entry-link UAT. [VERIFIED: codebase grep]

## Project Constraints (from AGENTS.md)

- Do not attach release media directly to episodes; release-version process media uses `release_version_media` with `media_assets` and `media_files`. [VERIFIED: AGENTS.md]
- Do not use `release_media` as a substitute for version-scoped admin/fansub media. [VERIFIED: AGENTS.md]
- Do not invent parallel media logic or new upload flows for this UI-focused phase. [VERIFIED: AGENTS.md]
- Before changing endpoints, DTOs, frontend API helpers, or response payloads, inspect and update `shared/contracts/openapi.yaml`, frontend types, and API helpers together. [VERIFIED: AGENTS.md]
- User-facing German text must use correct umlauts; ASCII replacements such as `fuer`, `waehlen`, or `Aenderungen` are forbidden in UI text. [VERIFIED: AGENTS.md]
- Reuse existing components/helpers before adding a new component, hook, helper, service, repository method, endpoint, DTO, or workflow utility. [VERIFIED: AGENTS.md]
- UI implementation must use existing project styling and global `frontend/src/components/ui` primitives where they fit. [VERIFIED: AGENTS.md]
- Live browser UAT should use the shared Codex browser context for user-facing navigation and exact route reachability. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Pretty public route `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]` | Frontend Server (SSR) | API / Backend | Next App Router owns the public URL file structure and metadata; backend must expose enough slug/ID mapping data without a new project model. [CITED: Context7 /vercel/next.js/v16.1.6] [VERIFIED: codebase grep] |
| Public profile project links | Browser / Client | Frontend Server (SSR) | `FansubProjectBannerCard` renders `Link` targets from public-profile DTOs. [VERIFIED: frontend/src/components/fansubs/FansubProjectBannerCard.tsx] |
| Same-Fansub further-project navigation | Browser / Client | Frontend Server (SSR) | Previous/next controls are interactive UI near the hero; the project list should come from the same Fansub profile payload. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx] |
| Cooperation hint `Coop mit ...` | Frontend Server (SSR) | API / Backend | Current route already fetches same-Anime group relations through `getAnimeFansubs`; hero can render other groups as profile links. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] |
| Project members | Browser / Client | API / Backend | `getGroupContributors` already returns project-scoped role labels and member slugs; UI should reuse public Fansub member row visual language. [VERIFIED: backend/internal/repository/group_contributors_repository.go] |
| Remove nav/newest/OP-ED/media/global summary | Frontend Server (SSR) | Browser / Client | Current unwanted sections are imported and ordered in the project detail page and its section components. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] |
| Public release label safety | API / Backend | Browser / Client | Current release queries use `COALESCE(rev.title, e.title)`; D-18 fallback rules require backend or shared helper support if raw imported names can reach `rev.title`. [VERIFIED: backend/internal/repository/group_repository.go] [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] |

## Standard Stack

### Core

| Library | Installed Version | Registry Current | Purpose | Why Standard |
|---------|-------------------|------------------|---------|--------------|
| Next.js | 16.1.6 | 16.2.10, modified 2026-07-13 | App Router server pages, dynamic routes, metadata. | Existing frontend framework; App Router supports dynamic `[slug]` routes and `generateMetadata`. [VERIFIED: npm ls] [VERIFIED: npm view] [CITED: Context7 /vercel/next.js/v16.1.6] |
| React | 18.3.1 | 19.2.7, modified 2026-07-10 | Component rendering. | Existing app is React 18; do not upgrade in this UI phase. [VERIFIED: frontend/package.json] [VERIFIED: npm view] |
| TypeScript | 5.9.3 installed | 7.0.2, modified 2026-07-14 | Static typing for DTO/helper alignment. | Existing typecheck command is `tsc --noEmit`. [VERIFIED: npm ls] [VERIFIED: npm view] |
| Vitest | 3.2.4 | 4.1.10, modified 2026-07-06 | Frontend unit/component/source-structure tests. | Existing frontend tests use Vitest with `globals: true`. [VERIFIED: frontend/vitest.config.ts] [CITED: Context7 /vitest-dev/vitest/v3_2_4] |
| Go | 1.26.1 local runtime | local only checked | Backend handler/repository tests for API DTO changes. | Backend source is Go and public API routes are wired in `backend/cmd/server/main.go`. [VERIFIED: go version] [VERIFIED: backend/cmd/server/main.go] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `@testing-library/react` | 16.3.2 installed; 16.3.2 registry current as checked | Client component rendering and interaction tests. | Use for `GroupEdgeNavigation` replacement, member rows, story collapse, project cards. [VERIFIED: npm ls] [VERIFIED: npm view] |
| Playwright CLI | 1.59.1 available through `npx --prefix frontend playwright --version` | Supporting viewport screenshots and route smoke checks. | Use for desktop/tablet/mobile supporting checks; live shared browser UAT remains required. [VERIFIED: shell probe] [VERIFIED: AGENTS.md] |
| Docker Compose | v5.2.0 | Local backend/frontend/Postgres runtime. | Required for API-backed live UAT if services are not already running. [VERIFIED: shell probe] [VERIFIED: README.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New backend project detail endpoint | Reuse existing `getGroupDetail`, `getGroupReleases`, `getGroupContributors`, `getGroupProjectNote`, and public Fansub profile DTO | Existing endpoints already cover current display; a new endpoint would add contract surface without proven data need. [VERIFIED: frontend/src/lib/api.ts] |
| Reusing `GroupEdgeNavigation` unchanged | Build a same-Fansub project navigator | Existing component navigates same-Anime groups, not same-Fansub projects. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx] |
| New public member card component from scratch | Extract/adapt `FansubTeamActiveGroup` row pattern | Existing public Fansub page member rows already implement the target density, avatar, link, and role style. [VERIFIED: frontend/src/components/fansubs/FansubTeamActiveGroup.tsx] |

**Installation:** no new packages recommended. [VERIFIED: frontend/package.json]

## Architecture Patterns

### System Architecture Diagram

```text
/fansubs/[slug] profile page
  -> getPublicFansubProfileBySlug(slug)
  -> projects[] with anime IDs and, after additive DTO work, anime_slug
  -> FansubProjectBannerCard builds /fansubs/{fansubSlug}/fansubprojekt/{animeSlug}
  -> pretty route resolves fansubSlug + animeSlug
       -> shared project-page loader/composition
       -> existing public endpoints by animeID + groupID
       -> HeroSection / StorySection / TeamSection / ReleasesSection

/anime/[id]/group/[groupId] compatibility route
  -> same shared project-page loader/composition
  -> generateMetadata alternates.canonical points to pretty URL when slugs are known
```

This flow keeps the public URL in the frontend routing tier and leaves existing backend ownership of Anime/Fansub/Release data unchanged. [VERIFIED: codebase grep] [CITED: Context7 /vercel/next.js/v16.1.6]

### Recommended Project Structure

```text
frontend/src/app/anime/[id]/group/[groupId]/
├── page.tsx                       # compatibility/internal route wrapper
├── projectPageData.ts             # shared loader/shape for both routes
├── ProjectPage.tsx                # shared SSR composition for the project detail
├── sections/                      # existing section components, edited slice by slice
└── page.module.css                # existing page styles, scoped changes only

frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/
└── page.tsx                       # pretty public route wrapper

frontend/src/components/fansubs/
├── FansubProjectBannerCard.tsx    # profile entry link prefers pretty route
└── ProjectMemberRows.tsx          # only if extraction from FansubTeam row pattern is justified
```

This structure avoids duplicating the page implementation across the technical and pretty routes. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx]

### Pattern 1: Additive Pretty Route Wrapper

**What:** Add `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx` and delegate to a shared project-page loader/component. [CITED: Context7 /vercel/next.js/v16.1.6]

**When to use:** Use once `PublicFansubProject` exposes `anime_slug`, or another existing public lookup reliably maps `fansubSlug + animeSlug` to IDs. [VERIFIED: frontend/src/types/fansub.ts]

**Example:**

```tsx
// Source: Context7 Next.js dynamic route docs + local page params pattern
export default async function FansubProjectPrettyPage({ params }: Props) {
  const { fansubSlug, animeSlug } = await params
  return renderPublicFansubProjectPage({ fansubSlug, animeSlug })
}
```

### Pattern 2: Canonical Metadata on Compatibility Route

**What:** Use `generateMetadata` with `alternates.canonical` for the old technical URL once the pretty URL is known. [CITED: Context7 /vercel/next.js/v16.1.6]

**When to use:** Use on `/anime/[id]/group/[groupId]` to expose the pretty URL as public identity while keeping the compatibility route available. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

**Example:**

```tsx
// Source: Context7 Next.js generateMetadata alternates.canonical example
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const canonicalPath = await resolvePrettyProjectPath(await params)
  return canonicalPath ? { alternates: { canonical: canonicalPath } } : {}
}
```

### Pattern 3: Reuse Public Fansub Member Rows

**What:** Adapt the `FansubTeamActiveGroup` / `FansubTeamHistoricalGroup` row pattern for project-scoped contributors, but feed it `GroupTeamMember` / `GroupExternalContributor` role labels only. [VERIFIED: frontend/src/components/fansubs/FansubTeamActiveGroup.tsx] [VERIFIED: frontend/src/types/groupContributors.ts]

**When to use:** Use for `Mitwirkende am Fansub-Projekt`; do not import profile-specific headings/helper text. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Anti-Patterns to Avoid

- **Route copy-paste:** Duplicating the full `page.tsx` under the pretty route creates two section orders and two bug surfaces. Use a shared loader/composition. [VERIFIED: docs/engineering/implementation-contract.md]
- **Cross-group navigator under same-Fansub label:** `GroupEdgeNavigation` currently computes previous/next from groups related to the same Anime, so it must not remain under `Weitere Projekte von [group]`. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx]
- **New media/API seams for removals:** Removing OP/ED/Middle and Medien standalone sections does not require deleting public endpoints or media structures. [VERIFIED: AGENTS.md]
- **Raw release title leakage:** D-18 forbids showing raw imported/Jellyfin/file names publicly; current release queries use release title fallback paths that need explicit verification before release cleanup is accepted. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] [VERIFIED: backend/internal/repository/release_detail_public_repository.go]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic public route | Custom router/state switch inside old route | Next App Router folder route | Existing stack and docs support `[slug]` route segments. [CITED: Context7 /vercel/next.js/v16.1.6] |
| Canonical URL metadata | Manual `<head>` tags inside component | `generateMetadata` `alternates.canonical` | Next metadata API owns page metadata in App Router. [CITED: Context7 /vercel/next.js/v16.1.6] |
| Project member visual style | New local person cards | Public Fansub team row pattern + `FansubMemberAvatar` | User decision requires the public Fansub member visual language. [VERIFIED: frontend/src/components/fansubs/FansubTeamSection.module.css] |
| Public media or upload behavior | New media endpoint/upload hook | Existing public reads and existing media ownership | Phase is UI-focused and media ownership is tightly constrained. [VERIFIED: AGENTS.md] |
| API fetch/auth behavior | Ad hoc `fetch` variants for protected calls | Existing `frontend/src/lib/api.ts` helpers | Team4s API contract rules centralize helpers and DTOs. [VERIFIED: docs/api/api-contracts.md] |

**Key insight:** This phase is mostly route, composition, wording, and section visibility work; backend changes should be additive DTO fields only unless a specific UI slice proves missing data. [VERIFIED: codebase grep]

## Current Implementation Findings

| Area | Finding | Planning Impact |
|------|---------|-----------------|
| Project detail page | `page.tsx` fetches group detail, anime detail, group assets, releases, fansub relations, contributors, themes, release media, and project note. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] | Extract a shared loader before adding pretty route. |
| Empty summary | `buildEmptyAreaLabels` and `emptySummary` still exist on project detail. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] | A cleanup plan must remove helper, render, CSS, and stale tests. |
| Section nav | `GroupSectionsNav` renders `Geschichte`, `Beteiligte`, `Releases`, `OP/ED/Middle`, `Medien`. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx] | Remove import/render and delete/update tests. |
| Newest release block | `ReleasesSection` always renders `LatestReleaseSection` for the latest item. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx] | Replace with one conservative `Releases zum Fansub` section. |
| OP/ED/Middle and Medien | `ThemesSection` and `MediaSection` are conditionally rendered by page. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] | Remove standalone render paths, not backend APIs. |
| Public profile project links | `FansubProjectBannerCard` links to `/anime/${project.id}/group/${groupId}`. [VERIFIED: frontend/src/components/fansubs/FansubProjectBannerCard.tsx] | Switch to pretty URL after `anime_slug` is available. |
| Project DTO | `PublicFansubProject` has no anime slug in Go model, frontend type, or OpenAPI schema. [VERIFIED: backend/internal/models/fansub.go] [VERIFIED: frontend/src/types/fansub.ts] [VERIFIED: shared/contracts/openapi.yaml] | Plan additive contract update for `anime_slug`. |
| Cooperation context | Current page has `animeFansubRelations` and `otherGroups`, both same-Anime group sources. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] | Use these only for `Coop mit ...`, not further-project navigation. |
| Project contributors | Backend combines `release_member_roles` and `anime_contributions`; external contributions are group/anime scoped and public-filtered. [VERIFIED: backend/internal/repository/group_contributors_repository.go] | UI can show project-scoped roles without new contributor API. |

## Common Pitfalls

### Pitfall 1: Pretty URL Without Anime Slug Source
**What goes wrong:** The profile card cannot build `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]` from the current DTO. [VERIFIED: frontend/src/types/fansub.ts]
**Why it happens:** `listPublicFansubProjects` selects `a.id` and `a.title`, not `a.slug`. [VERIFIED: backend/internal/repository/fansub_repository.go]
**How to avoid:** Plan one additive contract task for `anime_slug` across backend model/query, OpenAPI, frontend type, and tests. [VERIFIED: docs/api/api-contracts.md]
**Warning signs:** Links still interpolate numeric anime IDs or local slugify helpers in the browser. [VERIFIED: docs/engineering/implementation-contract.md]

### Pitfall 2: Same-Anime Groups Reused as Same-Fansub Projects
**What goes wrong:** `Weitere Projekte von C-Subs` navigates to another group for the same Anime. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx]
**Why it happens:** `getOtherGroups` explicitly queries `anime_fansub_groups` for the same anime and excludes the current group. [VERIFIED: backend/internal/repository/group_repository.go]
**How to avoid:** Build same-Fansub previous/next from the Fansub public profile `projects[]` list, and hide controls when the filtered list has no neighbor. [VERIFIED: frontend/src/app/fansubs/[slug]/page.tsx]
**Warning signs:** Navigation target path changes only `groupId` while keeping the same `animeId`. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx]

### Pitfall 3: Removing UI Sections But Leaving Stale Tests As Truth
**What goes wrong:** Tests such as `buildEmptyAreaLabels` and `ReleasesSection` expectations still enforce old behavior. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx] [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx]
**Why it happens:** Phase 99/earlier tests encode the old section nav/newest-release/global-empty structure. [VERIFIED: codebase grep]
**How to avoid:** Each implementation plan must include test updates that assert the new absence/title behavior. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]
**Warning signs:** Tests still reference `Weitere Bereiche`, `Neuestes Release`, `Weitere Releases`, or `GroupSectionsNav`. [VERIFIED: codebase grep]

### Pitfall 4: Release Label Fallback Conflicts With D-18
**What goes wrong:** Public release lists may display raw imported names if `rev.title` contains technical filenames. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]
**Why it happens:** Current list/detail queries use `COALESCE(rev.title, e.title)` and `COALESCE(NULLIF(rv.title, ''), e.title)` as public title sources. [VERIFIED: backend/internal/repository/group_repository.go] [VERIFIED: backend/internal/repository/release_detail_public_repository.go]
**How to avoid:** Before retitling releases, plan a narrow release-label audit/helper if needed; do not redesign release cards in Phase 102. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]
**Warning signs:** UAT sees strings ending in `.mkv` or Jellyfin/import naming patterns. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Pitfall 5: Member Links Overcommitted
**What goes wrong:** The phase invents a new project-member contribution route. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]
**Why it happens:** Public Fansub member rows are clickable today when `member_slug` exists. [VERIFIED: frontend/src/components/fansubs/FansubTeamActiveGroup.tsx]
**How to avoid:** Use existing `/members/[slug]` links only as the safe current fallback, or render clickable styling only where an existing slug exists; do not add a new route. [VERIFIED: frontend/src/app/members/[slug]/page.tsx]
**Warning signs:** New files under a project-member route appear in the plan. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

## Code Examples

### Pretty Link Helper

```ts
// Source: existing FansubProjectBannerCard link seam + required D-21/D-22 route shape
export function buildFansubProjectHref(fansubSlug: string, animeSlug?: string | null, animeId?: number, groupId?: number) {
  if (animeSlug) return `/fansubs/${fansubSlug}/fansubprojekt/${animeSlug}`
  return animeId && groupId ? `/anime/${animeId}/group/${groupId}` : `/fansubs/${fansubSlug}`
}
```

Use this only if the plan keeps a temporary fallback during rollout; final public profile links should prefer the pretty route. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Project Story Block

```tsx
// Source: FansubStoryBlock collapsed/expanded pattern
<section id="geschichte" className={styles.storySection}>
  <SectionHeader title="Geschichte des Fansub-Projekts" />
  <FansubProjectStoryBlock bodyHtml={projectNotesHtml} bodyText={fallbackText} />
</section>
```

This should reuse the single-block collapse logic from `FansubStoryBlock`, not the multi-story archive/modal pattern from `FansubStorySection`. [VERIFIED: frontend/src/components/fansubs/FansubStoryBlock.tsx] [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]

### Project Member Row Shape

```tsx
// Source: FansubTeamActiveGroup row pattern
const roles = contributor.role_labels.join(' · ') || 'Rolle nicht hinterlegt'
return contributor.member_slug
  ? <Link href={`/members/${contributor.member_slug}`} className={styles.memberRowLink}>...</Link>
  : <div className={styles.memberRow}>...</div>
```

The rendered roles must be the project-specific roles from `getGroupContributors`, not generic group membership roles. [VERIFIED: backend/internal/repository/group_contributors_repository.go]

## State of the Art

| Old Approach | Current Approach | When Changed / Source | Impact |
|--------------|------------------|------------------------|--------|
| Technical public project URL `/anime/[id]/group/[groupId]` | Add pretty App Router route and leave technical route available with canonical metadata | Phase 102 D-21/D-22 and Next App Router docs [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] [CITED: Context7 /vercel/next.js/v16.1.6] | Public links should move to Fansub-owned slug URL without breaking old route. |
| Section jump list on project detail | Flowing section structure like public Fansub profile | Phase 102 D-14 [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] | Remove `GroupSectionsNav`. |
| Newest release plus older releases | Single conservative release section titled `Releases zum Fansub` | Phase 102 D-15/D-16/D-27 [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] | Remove special latest highlight and retitle list. |
| Standalone OP/ED/Middle and Medien sections | Defer integration into release experience | Phase 102 D-28 [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md] | Remove standalone sections from this page only. |

**Deprecated/outdated:**
- `GroupEdgeNavigation` as `Weitere Projekte von [group]`: outdated for Phase 102 because it is same-Anime/cross-group navigation. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx]
- `buildEmptyAreaLabels`: outdated for Phase 102 because global empty summary is rejected. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

All claims in this research were verified or cited; no `[ASSUMED]` claims are intentionally used. [VERIFIED: research audit]

## Open Questions (RESOLVED)

1. **What is the canonical base URL for metadata?**
   - What we know: Next metadata can expose `alternates.canonical`. [CITED: Context7 /vercel/next.js/v16.1.6]
   - Resolution: Not a Phase 102 blocker. Plans use the relative pretty route path as the canonical value unless an existing public base URL config is discovered during execution. Executors must not invent a new base URL env var in this UI cleanup phase. [VERIFIED: 102-02-PLAN.md]
   - Planning disposition: Closed by Plan 102-02 route/canonical task.

2. **Does `rev.title` ever contain raw imported filenames in current data?**
   - What we know: Current public release queries use release title before episode title. [VERIFIED: backend/internal/repository/group_repository.go]
   - Resolution: Runtime data quality remains an execution/UAT check, not an unresolved planning question. Plan 102-05 now requires backend tests for raw-title fallback behavior plus live inspection of visible release labels before the release slice is accepted. [VERIFIED: 102-05-PLAN.md]
   - Planning disposition: Closed by Plan 102-05 release-title fallback tests and blocking live acceptance checkpoint.

3. **Should missing same-Fansub next/previous show nothing or a back-to-overview link?**
   - What we know: D-23 says hide navigation when no further project exists; D-09 allows hide or back-overview wording. [VERIFIED: .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md]
   - Resolution: D-23 is the controlling decision for Phase 102: hide previous/next controls when there are no same-Fansub neighbor projects. A back-to-overview replacement is not planned in this phase. [VERIFIED: 102-CONTEXT.md]
   - Planning disposition: Closed by Plan 102-03 navigation helper and hero checkpoint.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next/Vitest/typecheck | yes | v24.14.0 | Use Docker frontend if local Node fails. [VERIFIED: shell probe] |
| npm | Frontend scripts | yes | 11.9.0 | Use package-lock workflow; no new deps planned. [VERIFIED: shell probe] |
| Go | Backend DTO/repository tests if API changes | yes | go1.26.1 windows/amd64 | Use Docker backend build if local Go differs. [VERIFIED: shell probe] |
| Docker Compose | Live backend/frontend/API UAT | yes | v5.2.0 | None for full live API UAT. [VERIFIED: shell probe] |
| Playwright CLI | Supporting viewport screenshots | yes | 1.59.1 | Manual live browser UAT remains primary. [VERIFIED: shell probe] [VERIFIED: AGENTS.md] |
| Git | Diff and whitespace checks | yes | 2.41.0.windows.1 | None. [VERIFIED: shell probe] |

**Missing dependencies with no fallback:** none found during probe. [VERIFIED: shell probe]

**Missing dependencies with fallback:** none found during probe. [VERIFIED: shell probe]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 for frontend; Go test for backend packages. [VERIFIED: npm ls] [VERIFIED: go version] |
| Config file | `frontend/vitest.config.ts`, with alias `@` and `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`. [VERIFIED: frontend/vitest.config.ts] |
| Quick run command | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId] src/components/fansubs src/components/groups` [VERIFIED: frontend/package.json] |
| Full suite command | `npm --prefix frontend run typecheck && npm --prefix frontend run test && npm --prefix frontend run lint` plus backend targeted tests if DTO/API changes. [VERIFIED: frontend/package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| D-01 | Each slice remains independently testable. | plan/UAT | Manual control-plan checklist plus focused tests per slice. [VERIFIED: 102-00-PLAN.md] | yes |
| D-02 | Profile is entry only; project detail owns implementation. | source/unit | `npm --prefix frontend run test -- src/app/fansubs src/app/anime/[id]/group/[groupId]` [VERIFIED: frontend/package.json] | yes |
| D-03 | Hero aligns with public Fansub profile visual language. | component + visual UAT | Add/update hero tests; live desktop/tablet/mobile check. [VERIFIED: AGENTS.md] | partial |
| D-04 | Desktop/tablet/mobile layouts validated separately. | visual UAT | Playwright screenshots or shared browser checks at desktop, tablet portrait, mobile. [VERIFIED: AGENTS.md] | manual gap |
| D-05 | Sections improved individually. | source tests | Update section tests one slice at a time. [VERIFIED: existing frontend tests] | yes |
| D-06 | German wording corrected without backend renames. | source/unit | Grep/test labels `Geschichte des Fansub-Projekts`, `Mitwirkende am Fansub-Projekt`, `Releases zum Fansub`. [VERIFIED: 102-CONTEXT.md] | needs update |
| D-07 | Existing seams reused. | review gate | Plan `read_first` includes exact existing files and acceptance proves no duplicate API/media seam. [VERIFIED: docs/engineering/implementation-contract.md] | planning requirement |

### Sampling Rate

- **Per task commit:** `npm --prefix frontend run test -- <touched test files>` and `git diff --check`. [VERIFIED: frontend/package.json]
- **Per wave merge:** `npm --prefix frontend run typecheck && npm --prefix frontend run test`; add `cd backend && go test ./internal/repository ./internal/handlers -run "<focused tests>"` if API/DTO changes. [VERIFIED: STATUS.md]
- **Phase gate:** Full relevant frontend suite, targeted backend/API contract tests for any DTO change, and live UAT at `http://127.0.0.1:3000` for accepted slice. [VERIFIED: AGENTS.md]

### Wave 0 Gaps

- [ ] Update or remove `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` cases for `buildEmptyAreaLabels`; new expected behavior is no global empty summary. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx]
- [ ] Add pretty-route tests for `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]` route source/composition after route exists. [VERIFIED: Context7 /vercel/next.js/v16.1.6]
- [ ] Add contract test or source assertion for `PublicFansubProject.anime_slug` after DTO change. [VERIFIED: shared/contracts/openapi.yaml]
- [ ] Add same-Fansub navigation tests proving it never changes to a different group under `Weitere Projekte`. [VERIFIED: frontend/src/components/groups/GroupEdgeNavigation.tsx]
- [ ] Update `ReleasesSection.test.tsx` to reject `Neuestes Release` and assert `Releases zum Fansub`. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx]
- [ ] Add visual UAT evidence for desktop, tablet portrait, and mobile per accepted slice. [VERIFIED: AGENTS.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no for public route reads | Public endpoints are no-login surfaces; do not add protected client auth logic. [VERIFIED: backend/cmd/server/main.go] |
| V3 Session Management | no for public route reads | Do not introduce token/cookie reads in normal public UI. [VERIFIED: docs/frontend/auth-api-client.md] |
| V4 Access Control | yes for public data visibility | Backend public endpoints already filter visibility/status for project notes and contributors; keep visibility in backend queries. [VERIFIED: backend/internal/repository/anime_project_notes_repository.go] [VERIFIED: backend/internal/repository/group_contributors_repository.go] |
| V5 Input Validation | yes | Slug/ID params must be validated or resolved server-side; current ID route rejects invalid IDs and backend handlers parse params. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/page.tsx] [VERIFIED: backend/internal/handlers/group_handler.go] |
| V6 Cryptography | no | No crypto introduced by this UI phase. [VERIFIED: research audit] |
| V9 Communications | yes for external links only | Existing public Fansub community links use safe external link patterns; keep `rel="noreferrer noopener"` where external links are rendered. [VERIFIED: frontend/src/components/fansubs/FansubCommunityLinksSection.tsx] |

### Known Threat Patterns for Next public UI + Team4s APIs

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ID/slug mismatch exposes wrong Fansub project | Tampering / Information Disclosure | Resolve pretty route to the exact `(anime_id, fansub_group_id)` relation and call existing scoped endpoints. [VERIFIED: docs/architecture/db-schema-fansub-domain.md] |
| Public hidden content leakage | Information Disclosure | Keep `visibility='public'`, `status='published'`, and approved media filters in backend repositories. [VERIFIED: backend/internal/repository/anime_project_notes_repository.go] |
| Raw technical release filenames in public UI | Information Disclosure | Apply D-18 curated-name/fallback rule before release section acceptance. [VERIFIED: 102-CONTEXT.md] |
| Cross-domain media misuse | Tampering | Do not create media/upload endpoints; leave release-version media, group media, and anime media ownership unchanged. [VERIFIED: AGENTS.md] |
| XSS through rich text story | Tampering / XSS | Reuse existing rich text renderer/sanitized `body_html` seam; do not render unsanitized ad hoc HTML. [VERIFIED: frontend/src/components/fansubs/FansubStoryBlock.tsx] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md` - locked decisions D-01 through D-28 and deferred ideas. [VERIFIED: file read]
- `AGENTS.md` - project domain, API, UI, German text, validation, and UAT rules. [VERIFIED: file read]
- `docs/engineering/implementation-contract.md` - reuse-first planning and duplication gate. [VERIFIED: file read]
- `docs/api/api-contracts.md` - API/DTO/OpenAPI alignment workflow. [VERIFIED: file read]
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` - global UI primitive and UI planning rules. [VERIFIED: file read]
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release/media ownership rules and project note anchor. [VERIFIED: file read]
- Codebase files under `frontend/src/app/anime/[id]/group/[groupId]`, `frontend/src/components/fansubs`, `frontend/src/lib/api.ts`, `backend/internal/repository`, `backend/internal/models`, `shared/contracts/openapi.yaml`. [VERIFIED: codebase grep]
- Context7 `/vercel/next.js/v16.1.6` - App Router dynamic routes and `generateMetadata` canonical metadata examples. [CITED: Context7 /vercel/next.js/v16.1.6]
- Context7 `/vitest-dev/vitest/v3_2_4` - jsdom and config behavior. [CITED: Context7 /vitest-dev/vitest/v3_2_4]

### Secondary (MEDIUM confidence)
- `STATUS.md` and `.planning/codebase/*.md` - local runtime/check command history and known backend handler test issue. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)
- None used. [VERIFIED: research audit]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions, local runtimes, and registry versions were checked. [VERIFIED: npm ls] [VERIFIED: npm view] [VERIFIED: shell probe]
- Architecture: HIGH - route/data/component ownership was traced in existing code. [VERIFIED: codebase grep]
- Pitfalls: HIGH - each pitfall maps to current source or locked decisions. [VERIFIED: codebase grep]
- Release label safety: MEDIUM - source queries were verified, but runtime data content was not sampled. [VERIFIED: backend/internal/repository/group_repository.go]

**Research date:** 2026-07-14 [VERIFIED: system date]
**Valid until:** 2026-08-13 for local architecture; 2026-07-21 for package currency because Next/React/TypeScript registry versions are fast-moving. [VERIFIED: npm view]
