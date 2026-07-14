# Phase 102: fansubprojekte-ui-schrittweise-verbessern - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 24
**Analogs found:** 24 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` | route | request-response | `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` current composition | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` | utility/service | request-response + transform | `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` data-loading block | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` | component | request-response + composition | `frontend/src/app/fansubs/[slug]/page.tsx` section-flow page | role-match |
| `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx` | route | request-response | `frontend/src/app/fansubs/[slug]/page.tsx` slug route | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` | component | request-response UI | `frontend/src/components/fansubs/FansubHeroSection.tsx` + current `HeroSection.tsx` | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` | config/style | responsive UI | current project page CSS + `FansubTeamSection.module.css` | exact |
| `frontend/src/lib/fansubProjectNavigation.ts` | utility | transform | `frontend/src/lib/groupNavigation.ts` | role-match |
| `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` | component | request-response link UI | same file current card/link seam | exact |
| `frontend/src/types/fansub.ts` | model/DTO | transform | `PublicFansubProject` interface | exact |
| `backend/internal/models/fansub.go` | model/DTO | transform | `PublicFansubProject` struct | exact |
| `backend/internal/repository/fansub_repository.go` | repository | CRUD/read | `listPublicFansubProjects` | exact |
| `shared/contracts/openapi.yaml` | config/contract | request-response | `PublicFansubProject` schema | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx` | component | request-response UI | `frontend/src/components/fansubs/FansubStoryBlock.tsx` | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` | component | request-response UI | `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx` | exact |
| `frontend/src/components/fansubs/ProjectMemberRows.tsx` | component | request-response UI | `FansubTeamActiveGroup.tsx` row pattern | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` | component | request-response UI | current `ReleasesSection.tsx` + `OlderReleasesList.tsx` | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` | component | streaming/incremental list | same file current cursor list | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx` | component | request-response UI | current import in `ReleasesSection.tsx` | exact-delete/unreference |
| `frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx` | component | request-response UI | current import in `page.tsx` | exact-delete/unreference |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx` | component | request-response UI | current import in `page.tsx` | exact-unreference |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/MediaSection.tsx` | component | request-response UI | current import in `page.tsx` | exact-unreference |
| `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` | test | transform | existing page helper tests | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx` | test | request-response UI | existing composition test with mocks | exact |
| `backend/internal/repository/fansub_repository_test.go` | test | source invariant | existing public profile source invariant test | exact |

## Pattern Assignments

### `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (utility/service, request-response + transform)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/page.tsx`

**Imports/API pattern** (lines 4-11):
```typescript
import {
  ApiError, getAnimeByID, getAnimeFansubs, getGroupAssets,
  getGroupContributors, getGroupDetail, getGroupProjectNote, getGroupReleaseMedia,
  getGroupReleases, getGroupThemes,
} from "@/lib/api";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";
```

**Core loader pattern** (lines 48-63, 82-105):
```typescript
const animeID = Number.parseInt(resolvedParams.id, 10);
const groupID = Number.parseInt(resolvedParams.groupId, 10);
if (Number.isNaN(animeID) || animeID <= 0 || Number.isNaN(groupID) || groupID <= 0) return notFound();

try {
  [groupResponse, animeResponse] = await Promise.all([getGroupDetail(animeID, groupID), getAnimeByID(animeID)]);
} catch (error) {
  if (error instanceof ApiError && error.status === 404) return notFound();
  errorMessage = "Gruppendetails konnten nicht geladen werden.";
}
```

```typescript
try {
  const [releasesData, fansubsData] = await Promise.all([getGroupReleases(animeID, groupID, { per_page: 100 }), getAnimeFansubs(animeID)]);
  releaseEpisodes = releasesData.data.episodes;
  otherGroups = releasesData.data.other_groups;
  animeFansubRelations = fansubsData.data;
} catch {
  try {
    const releasesData = await getGroupReleases(animeID, groupID, { per_page: 100 });
    releaseEpisodes = releasesData.data.episodes;
    otherGroups = releasesData.data.other_groups;
  } catch { /* Continue without navigation data. */ }
}
try { contributorsData = await getGroupContributors(animeID, groupID) } catch { /* EmptyState */ }
try { themesData = await getGroupThemes(animeID, groupID) } catch { /* EmptyState */ }
try { releaseMediaData = await getGroupReleaseMedia(animeID, groupID) } catch { /* EmptyState */ }
```

**Planner instruction:** Extract the existing data assembly into a shared loader instead of copying the full old page into the pretty route. Keep 404 handling strict for primary group/anime lookup and graceful degradation for optional public sections.

---

### `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` and `page.tsx` (route/component, request-response composition)

**Analog:** `frontend/src/app/fansubs/[slug]/page.tsx`

**Slug route/error pattern** (lines 35-60):
```typescript
export default async function FansubProfilePage({ params }: FansubProfilePageProps) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

  if (!slug) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>Ungültiger Fansub-Slug.</div>
      </main>
    )
  }
```

**Flowing section pattern** (lines 93-144):
```typescript
return (
  <main className={styles.page}>
    <FansubHeroSection group={group} stats={heroStats} communityLinks={profile.community_links} />

    {storyAvailable ? (
      <div className={styles.gridSection}>
        <FansubStorySection group={group} stories={profile.stories} />
      </div>
    ) : null}

    {profile.projects.length > 0 ? (
      <div className={styles.sectionBand}>
        <div className={styles.gridSection}>
          <FansubProjectsSection projects={profile.projects} groupId={group.id} />
        </div>
      </div>
    ) : null}
  </main>
)
```

**Old project page removal targets** (lines 144-155):
```typescript
<GroupSectionsNav />
{hasTeamContent ? (
  <TeamSection teamMembers={contributorsData.team_members} externalContributors={contributorsData.external_contributors} />
) : null}
{storyAvailable ? <StorySection story={group.story} projectNotesHtml={projectNotesHtml} /> : null}
{hasReleases ? <ReleasesSection episodes={releaseEpisodes} animeID={animeID} groupID={groupID} /> : null}
{hasThemes ? <ThemesSection themes={themesData.themes} /> : null}
{hasMedia ? <MediaSection items={releaseMediaData.items} /> : null}
{emptyAreaLabels.length > 0 ? (
  <aside className={styles.emptySummary} aria-label="Noch offene Projektbereiche">
```

**Planner instruction:** The new shared `ProjectPage` should render the flowing sections directly and omit `GroupSectionsNav`, the global empty summary, `ThemesSection`, and `MediaSection` on this page. Do not delete public APIs or media structures for those omissions.

---

### `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx` (route, request-response)

**Analog:** `frontend/src/app/fansubs/[slug]/page.tsx` and `frontend/src/lib/api.ts`

**Public profile helper pattern** (`frontend/src/lib/api.ts` lines 1618-1645):
```typescript
export async function getPublicFansubProfileBySlug(
  slug: string,
): Promise<PublicFansubProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}/public-profile`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<PublicFansubProfileResponse>;
}
```

**Route resolution rule:** Resolve `fansubSlug` by `getPublicFansubProfileBySlug`, find `profile.projects[]` by additive `project.anime_slug === animeSlug`, then delegate to shared project loader/composition with `project.id` and `profile.group.id`. Do not client-side slugify titles as the source of truth.

---

### `backend/internal/models/fansub.go`, `frontend/src/types/fansub.ts`, `shared/contracts/openapi.yaml` (DTO/contract, transform)

**Analogs:** existing `PublicFansubProject` DTO/schema.

**Go DTO pattern** (`backend/internal/models/fansub.go` lines 83-93):
```go
// PublicFansubProject is an anime_fansub_groups-backed public project card.
type PublicFansubProject struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year,omitempty"`
	CoverImage  *string `json:"cover_image,omitempty"`
	MaxEpisodes *int16  `json:"max_episodes,omitempty"`
	BannerURL   *string `json:"banner_url,omitempty"`
}
```

**Frontend DTO pattern** (`frontend/src/types/fansub.ts` lines 152-161):
```typescript
export interface PublicFansubProject {
  id: number;
  title: string;
  type: string;
  status: string;
  year?: number | null;
  cover_image?: string | null;
  max_episodes?: number | null;
  banner_url?: string | null;
}
```

**OpenAPI schema pattern** (`shared/contracts/openapi.yaml` lines 10304-10328):
```yaml
PublicFansubProject:
  type: object
  required: [id, title, type, status]
  properties:
    id:
      type: integer
      format: int64
    title:
      type: string
    type:
      type: string
    status:
      type: string
    banner_url:
      type: string
      nullable: true
```

**Planner instruction:** Add `anime_slug` additively to all three owners. Keep required status aligned; because pretty links need it as a public identity key, prefer making it required in the contract if repository data guarantees `anime.slug`.

---

### `backend/internal/repository/fansub_repository.go` (repository, CRUD/read)

**Analog:** `listPublicFansubProjects`

**Query + scan pattern** (lines 327-399):
```go
func (r *FansubRepository) listPublicFansubProjects(ctx context.Context, groupID int64) ([]models.PublicFansubProject, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			a.id,
			a.title,
			a.type::text,
			a.status::text,
			a.year,
			a.cover_image,
			a.max_episodes,
			COALESCE(... ) AS banner_url
		FROM anime_fansub_groups afg
		JOIN anime a ON a.id = afg.anime_id
		WHERE afg.fansub_group_id = $1
		  AND a.status <> 'disabled'
		ORDER BY a.title ASC, a.id ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("list public fansub projects for group %d: %w", groupID, err)
	}
	defer rows.Close()

	projects := make([]models.PublicFansubProject, 0)
	for rows.Next() {
		var project models.PublicFansubProject
		var bannerPath *string
		if err := rows.Scan(
			&project.ID,
			&project.Title,
			&project.Type,
			&project.Status,
			&project.Year,
			&project.CoverImage,
			&project.MaxEpisodes,
			&bannerPath,
		); err != nil {
			return nil, fmt.Errorf("scan public fansub project row: %w", err)
		}
		if bannerPath != nil {
			project.BannerURL = publicMediaURLForPath(*bannerPath, r.mediaStorageDir)
		}
		projects = append(projects, project)
	}
```

**Error handling:** Preserve contextual `fmt.Errorf` wrappers and `rows.Err()` handling from lines 375-404.

**Planner instruction:** Insert `a.slug` immediately after `a.id` or `a.title`, scan into `project.AnimeSlug`, and add/update source-invariant test coverage.

---

### `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` (component, request-response link UI)

**Analog:** same file.

**Current link seam** (lines 24-51):
```tsx
export function FansubProjectBannerCard({ project, groupId, statusLabel, statusVariant = 'neutral' }: FansubProjectBannerCardProps) {
  const source = project.banner_url || project.cover_image || ''
  const resolvedImageUrl = source ? resolveApiUrl(source) : ''

  return (
    <Link href={`/anime/${project.id}/group/${groupId}`} className={styles.bannerCard}>
      <div className={styles.bannerFrame}>
        {resolvedImageUrl ? (
          <Image
            src={resolvedImageUrl}
            alt={project.title}
            fill
            sizes={BANNER_IMAGE_SIZES}
            loading="lazy"
            className={styles.bannerImage}
            unoptimized
          />
        ) : (
          <div className={styles.bannerSkeleton} aria-hidden="true" />
        )}
```

**Planner instruction:** Keep image fallback and card structure. Change only href construction: prefer `/fansubs/${groupSlug}/fansubprojekt/${project.anime_slug}` once `groupSlug` is passed from `FansubProjectsSection`; keep technical URL fallback only for missing slug during rollout.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` (component, request-response UI)

**Analogs:** current `HeroSection.tsx` and `FansubHeroSection.tsx`

**Current project hero card pattern** (`HeroSection.tsx` lines 67-137):
```tsx
<section className={styles.heroShell}>
  {backdropUrl ? (
    <div
      className={styles.heroBackdrop}
      style={{ backgroundImage: `url("${backdropUrl}")` }}
      aria-hidden="true"
    />
  ) : null}
  <div className={styles.heroFg}>
    <div className={styles.heroCard}>
      {heroImageUrl && heroImageIsBanner ? (
        <div className={styles.heroBannerWrap}>
          <Image src={heroImageUrl} alt={`${anime.title} Banner`} width={1200} height={200} />
        </div>
      ) : null}
      <div className={styles.heroBody}>
        <div className={styles.heroInfo}>
          <p className={styles.eyebrow}>{group.fansub.name}</p>
          <h1 className={styles.title}>{anime.title}</h1>
          <dl className={styles.stats}>
```

**Public Fansub hero stats/link pattern** (`FansubHeroSection.tsx` lines 142-181):
```tsx
{heroStats.length > 0 ? (
  <dl className={styles.heroStats} aria-label="Gruppenkennzahlen">
    {heroStats.map((stat) => (
      <div key={stat.label} className={styles.heroStatItem}>
        <dt>{stat.label}</dt>
        <dd>{stat.value}</dd>
      </div>
    ))}
  </dl>
) : null}

{isCollaboration ? (
  <div className={styles.collaborationPanel}>
    <p className={styles.collaborationIntro}>Dies ist eine Kollaboration zwischen:</p>
    <ul className={styles.collaborationList}>
      {collaborationMembers.map((member) => (
        <li key={member.id}>
          <Link href={'/fansubs/' + member.slug} className={styles.collaborationLink}>
            <Badge variant="info">{member.name}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  </div>
) : null}
```

**Anti-analog:** `GroupEdgeNavigation` must not be reused unchanged for `Weitere Projekte`.

**Current wrong behavior** (`GroupEdgeNavigation.tsx` lines 41-64):
```tsx
const currentIndex = otherGroups.findIndex((g) => g.id === currentGroupId)
const previousGroup = currentIndex > 0 ? otherGroups[currentIndex - 1] : null
const nextGroup = currentIndex >= 0 && currentIndex < otherGroups.length - 1 ? otherGroups[currentIndex + 1] : null

{currentGroupName ? (
  <span className={styles.groupLabel}>Weitere Projekte von {currentGroupName}</span>
) : null}
```

**Planner instruction:** Keep the glass hero shell, move same-Fansub prev/next controls into the hero card, and render `Coop mit ...` from other same-Anime groups as link text to `/fansubs/[slug]`. Do not label cross-group same-Anime relations as further projects.

---

### `frontend/src/lib/fansubProjectNavigation.ts` (utility, transform)

**Analog:** `frontend/src/lib/groupNavigation.ts`

**Sorting/dedupe pattern to copy cautiously** (lines 29-88):
```typescript
function compareGroupNames(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

export function buildGroupNavigationGroups({
  currentGroup,
  fallbackOtherGroups = [],
  animeFansubRelations = null,
}: BuildGroupNavigationGroupsInput): FansubGroupSummary[] {
  const byID = new Map<number, NavigationGroupItem>()
  // source selection + dedupe
  const groups = Array.from(byID.values())
  groups.sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1
    }
    return compareGroupNames(left.group.name, right.group.name)
  })
  return groups.map((item) => item.group)
}
```

**Planner instruction:** New helper should accept same-Fansub `PublicFansubProject[]`, current `animeSlug`/`animeID`, and group slug/id. It should sort projects deterministically and return previous/next projects only within the current Fansub's project list.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx` (component, request-response UI)

**Analog:** `frontend/src/components/fansubs/FansubStoryBlock.tsx`

**Current story section to replace** (`StorySection.tsx` lines 11-27):
```tsx
export function StorySection({ story, projectNotesHtml }: StorySectionProps) {
  const displayContent = projectNotesHtml || story || null;

  return (
    <div id="story" className={styles.storySection}>
      <SectionHeader title="Projektgeschichte" />
      {displayContent ? (
        <CollapsibleStory content={displayContent} />
      ) : (
        <EmptyState variant="compact" title="Noch keine Projektgeschichte" />
      )}
    </div>
  );
}
```

**Collapsible public story pattern** (`FansubStoryBlock.tsx` lines 16-70):
```tsx
export function FansubStoryBlock({ story }: FansubStoryBlockProps) {
  const bodyHtml = story.body_html?.trim() ?? ''
  const bodyText = story.body_text?.trim() ?? ''
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  if (!bodyHtml && !bodyText && !title) {
    return null
  }

  return (
    <article className={sharedStyles.storyArticle}>
      <div ref={contentRef} className={contentClassName}>
        {bodyHtml ? <RichTextRenderer bodyHtml={bodyHtml} /> : <p className={sharedStyles.bodyText}>{bodyText}</p>}
      </div>
      {isOverflowing ? (
        <Button type="button" variant="subtle" size="sm" onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        </Button>
      ) : null}
    </article>
  )
}
```

**Planner instruction:** Title must be `Geschichte des Fansub-Projekts`. Keep one story block only. Omit the section when empty instead of rendering a local empty state unless the accepted slice asks otherwise.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` and optional `frontend/src/components/fansubs/ProjectMemberRows.tsx` (component, request-response UI)

**Analog:** `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx`

**Current local cards to replace** (`TeamSection.tsx` lines 13-44):
```tsx
export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  return (
    <div id="team" className={styles.teamSection}>
      <SectionHeader title="Beteiligte am Projekt" />
      <div className={styles.teamBlock}>
        <h3 className={styles.blockTitle}>Team-Beteiligte</h3>
        {teamMembers.length === 0 ? (
          <EmptyState variant="compact" title="Noch keine Team-Mitglieder" />
        ) : (
          <div className={styles.personGrid}>
            {teamMembers.map((m) => (
              <Card key={m.member_id} variant="elevated" className={styles.personCard}>
```

**Public member row pattern** (`FansubTeamActiveGroup.tsx` lines 13-29, 37-56):
```tsx
function MemberRowInner({ member }: { member: DomainProjectionMemberRow }) {
  const roles = member.role_labels.join(' · ') || 'Rolle nicht hinterlegt'
  const isLinked = member.member_slug !== null

  return (
    <>
      <FansubMemberAvatar name={member.member_display_name} avatarUrl={member.member_avatar_url} />
      <span className={styles.memberMeta}>
        <span className={isLinked ? styles.memberNameLink : styles.memberName}>
          {member.member_display_name}
        </span>
        <span className={styles.memberRoles}>{roles}</span>
      </span>
      {isLinked ? <ChevronRight size={16} className={styles.chevron} aria-hidden="true" /> : null}
    </>
  )
}
```

```tsx
<div className={styles.memberGrid}>
  {members.map((member) =>
    member.member_slug !== null ? (
      <Link key={member.member_display_name} href={'/members/' + member.member_slug} className={styles.memberRowLink}>
        <MemberRowInner member={member} />
      </Link>
    ) : (
      <div key={member.member_display_name} className={styles.memberRow}>
        <MemberRowInner member={member} />
      </div>
    ),
  )}
</div>
```

**CSS row pattern** (`FansubTeamSection.module.css` lines 13-48, 120-157):
```css
.memberGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  column-gap: 24px;
}

.memberRow,
.memberRowLink {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid color-mix(in srgb, var(--ui-line) 50%, transparent);
  color: inherit;
  text-decoration: none;
}

.memberNameLink {
  color: var(--accent-primary);
  font-size: 14px;
  font-weight: 600;
}

.memberRoles {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 11.5px;
  line-height: 1.4;
}
```

**Project-scoped contributor source** (`backend/internal/repository/group_contributors_repository.go` lines 44-60, 106-123):
```go
// GetProjectContributors gibt Mitwirkende zurück, die an diesem Anime für diese Gruppe
// beigetragen haben.
//   - TeamMembers: App-Member aus release_member_roles (Release-Credits)
//   - ExternalContributors: externe Mitwirkende aus anime_contributions (anime-weit, group-scoped)
//
// Beide Slices sind niemals nil (leere Slices bei keinen Daten).
```

```go
// Query B: Team-Beteiligte aus release_member_roles gescoped auf Anime+Gruppe.
// Aggregiert Rollen je Person über das gesamte Projekt (D-08).
teamQuery := `
  SELECT DISTINCT ON (m.id)
    m.id AS member_id,
    ... AS member_display_name,
    ... AS member_slug,
    COALESCE(ARRAY_AGG(DISTINCT cr.label) FILTER (WHERE cr.label IS NOT NULL), ARRAY[]::text[]) AS role_labels
  ...
  WHERE e.anime_id = $1 AND rvg.fansub_group_id = $2
`
```

**Planner instruction:** Section title is `Mitwirkende am Fansub-Projekt`. Feed only project-scoped `role_labels`. Use `/members/[slug]` as the only safe link target; do not create a project-member contribution route.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` and `OlderReleasesList.tsx` (component, incremental list)

**Analogs:** current `ReleasesSection.tsx`, `OlderReleasesList.tsx`

**Current composition to simplify** (`ReleasesSection.tsx` lines 22-39):
```tsx
export function ReleasesSection({ episodes, animeID, groupID }: ReleasesSectionProps) {
  if (episodes.length === 0) return null

  const latest = episodes[episodes.length - 1]
  const hasOlderReleases = episodes.length > 1

  return (
    <>
      <LatestReleaseSection animeID={animeID} groupID={groupID} releaseVersionID={latest.id} />
      {hasOlderReleases ? (
        <OlderReleasesList animeID={animeID} groupID={groupID} excludeReleaseVersionId={latest.id} />
      ) : null}
      <div className={styles.releasesCta}>
```

**Cursor list pattern to keep** (`OlderReleasesList.tsx` lines 126-145, 171-229):
```tsx
const loadPage = useCallback(
  async (nextCursor: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const page = await getGroupReleaseListCursor(animeID, groupID, {
        cursor: nextCursor ?? undefined,
        limit: PAGE_LIMIT,
      })
      setItems((prev) => (nextCursor ? [...prev, ...page.items] : page.items))
      setCursor(page.next_cursor)
      setHasMore(page.has_more)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Weitere Releases konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  },
  [animeID, groupID],
)
```

```tsx
return (
  <div id="weitere-releases" className={styles.section}>
    <SectionHeader title="Weitere Releases" />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.list}>
      {visibleItems.map((episode) => (
        <Card key={episode.id} variant="flat" className={styles.row}>
          ...
          <Button href={detailHref} variant="subtle" size="sm" leftIcon={<Eye size={15} aria-hidden="true" />}>
            Ansicht
          </Button>
        </Card>
      ))}
    </div>
    {hasMore ? (
      <Button variant="secondary" size="sm" onClick={() => loadPage(cursor)} loading={loading && items.length > 0}>
        Mehr laden
      </Button>
    ) : null}
  </div>
)
```

**Release label risk source** (`backend/internal/repository/group_repository.go` lines 189-190):
```go
COALESCE(rev.title, e.title) AS title,
NULLIF(BTRIM(rev.version), '') AS version_label,
```

**Planner instruction:** Remove `LatestReleaseSection` from project page composition, retitle the list to `Releases zum Fansub`, and keep cursor loading/list rows conservative. Include a D-18 data check so public UI does not show `.mkv`/raw import names.

---

### Tests (test, request-response/source invariant)

**Analogs:** existing Vitest and Go source-invariant tests.

**Page helper test currently enforcing old empty summary** (`page.test.tsx` lines 21-41):
```typescript
describe('buildEmptyAreaLabels (AO4-07)', () => {
  it('collects a label per empty area, in the declared order', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: false, hasStory: false, hasReleases: false, hasThemes: false, hasMedia: false,
    })
    expect(labels).toEqual(['Beteiligte am Projekt', 'Geschichte', 'Releases', 'OP/ED/Middle', 'Release-Einblicke'])
  })
})
```

**Release composition test pattern** (`ReleasesSection.test.tsx` lines 13-24, 37-73):
```typescript
vi.mock('./LatestReleaseSection', () => ({
  LatestReleaseSection: ({ releaseVersionID }: { releaseVersionID: number }) => (
    <div data-testid="latest-release-mock">{releaseVersionID}</div>
  ),
}))
vi.mock('./OlderReleasesList', () => ({
  OlderReleasesList: ({ excludeReleaseVersionId }: { excludeReleaseVersionId: number }) => (
    <div id="weitere-releases" data-testid="older-releases-mock">{excludeReleaseVersionId}</div>
  ),
}))

import { ReleasesSection } from './ReleasesSection'
```

**Public project card test pattern** (`FansubProjectsSection.test.tsx` lines 30-57):
```typescript
function project(overrides: Partial<PublicFansubProject> = {}): PublicFansubProject {
  return {
    id: 123,
    title: 'Projekt Anime',
    type: 'TV',
    status: 'ongoing',
    year: 2012,
    ...overrides,
  }
}

expect(screen.getByRole('link').getAttribute('href')).toBe('/anime/123/group/77')
```

**Backend source invariant pattern** (`fansub_repository_test.go` lines 45-84):
```go
func TestFansubRepository_PublicProfileSourceInvariants(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	if err != nil {
		t.Fatalf("read fansub repository: %v", err)
	}
	content := string(src)

	for _, fragment := range []string{
		"func (r *FansubRepository) GetPublicProfileBySlug",
		"FROM anime_fansub_groups afg",
		"FROM anime_media am",
		"mt.name = 'banner'",
	} {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected public profile repository to contain %q", fragment)
		}
	}
}
```

**Planner instruction:** Update tests in the same slice as behavior changes. Remove tests that enforce global empty summary/newest release. Add link tests for pretty route and source invariant fragments for `a.slug`/`AnimeSlug`.

## Shared Patterns

### Public API Error Handling

**Source:** `frontend/src/lib/api.ts`
**Apply to:** Pretty route resolver, shared loader, DTO-aware helpers.

```typescript
if (!response.ok) {
  const parsed = await parseApiErrorPayload(
    response,
    `API request failed: ${response.status}`,
  );
  throw new ApiError(
    response.status,
    parsed.message,
    null,
    parsed.code,
    parsed.details,
  );
}
```

### Public Backend Handler Shape

**Source:** `backend/internal/handlers/fansub_groups.go` lines 211-240
**Apply to:** Any public slug handler if one is added later; Phase 102 should avoid new endpoint unless needed.

```go
slug := strings.TrimSpace(c.Param("slug"))
if slug == "" || len([]rune(slug)) > 120 {
	badRequest(c, "ungültiger fansub slug")
	return
}

item, err := h.fansubRepo.GetPublicProfileBySlug(c.Request.Context(), slug)
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
	return
}
c.JSON(http.StatusOK, gin.H{"data": item})
```

### UI Tokens And Section Flow

**Source:** `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` lines 36-87, 105-180
**Apply to:** Hero card/navigation placement and responsive CSS.

```css
.heroShell {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 16px;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  border-top: 3px solid var(--accent-deep);
}

.heroCard {
  display: grid;
  margin-top: 18px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px) saturate(1.5);
}

.heroBody {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 16px 24px 24px;
}
```

### Project Contributor DTO Boundary

**Source:** `frontend/src/types/groupContributors.ts` lines 3-19
**Apply to:** `TeamSection`/`ProjectMemberRows`.

```typescript
export interface GroupTeamMember {
  member_id: number
  member_display_name: string
  member_slug: string | null
  role_labels: string[]
}

export interface GroupExternalContributor {
  member_display_name: string
  member_slug: string | null
  role_labels: string[]
  is_verified: boolean
}
```

### Domain Ownership

**Source:** `docs/architecture/db-schema-fansub-domain.md`
**Apply to:** All Phase 102 plans.

Phase 102 must not add media/upload ownership. Project text belongs to `anime_fansub_project_notes`; project contributors come from group/anime scoped contributor/release role queries; public project cards are backed by `anime_fansub_groups`.

## No Analog Found

No file is fully without an analog. The closest weak spots are:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/lib/fansubProjectNavigation.ts` | utility | transform | Existing `groupNavigation.ts` is same-role but intentionally wrong data domain for `Weitere Projekte`; copy only deterministic sorting/test style, not the cross-group source. |
| `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx` | route | request-response | No existing exact pretty project route; copy App Router slug handling from `/fansubs/[slug]` and delegate to shared project composition. |

## Metadata

**Analog search scope:** `frontend/src/app/anime/[id]/group/[groupId]`, `frontend/src/app/fansubs`, `frontend/src/components/fansubs`, `frontend/src/components/groups`, `frontend/src/lib`, `frontend/src/types`, `backend/internal/models`, `backend/internal/repository`, `backend/internal/handlers`, `shared/contracts/openapi.yaml`

**Files scanned:** 64 candidate files by `rg --files` plus targeted repository/contract ranges.
**Pattern extraction date:** 2026-07-14

