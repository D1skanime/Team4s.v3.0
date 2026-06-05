# Phase 75: Anime-Gruppen-Deep-Dive — Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 17 (new/modified)
**Analogs found:** 16 / 17

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` | component (Server Component, orchestrator) | request-response | `frontend/src/app/members/[slug]/page.tsx` | role-match (same SSR orchestrator pattern) |
| `frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx` | component (Client) | event-driven | `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (client pattern) | partial-match (use-client + IntersectionObserver approach from ScreenshotGallery) |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` | component | request-response | existing hero block in `page.tsx` lines 192–263 | exact (extracted from existing page) |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx` | component | request-response | existing story block in `page.tsx` lines 232–237 + `CollapsibleStory` | exact (extracted + wrapped) |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` | component | request-response | `frontend/src/components/profile/MembershipsSection` (pattern) + RESEARCH Code Example | partial-match |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` | component | request-response | existing release loop in `releases/page.tsx` | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx` | component | request-response | no existing public theme component | no-analog |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/MediaSection.tsx` | component | request-response | `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx` | role-match (gallery container) |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx` | component | request-response | backlink block in `frontend/src/app/fansubs/[slug]/page.tsx` lines 96–116 | role-match |
| `frontend/src/types/groupContributors.ts` | types | — | `frontend/src/types/group.ts` + `frontend/src/types/contributions.ts` | role-match |
| `frontend/src/lib/api.ts` (extend) | utility | request-response | existing `getGroupDetail` / `getGroupReleases` pattern in `api.ts` lines 5509–5567 | exact |
| `backend/internal/handlers/group_contributors_handler.go` | handler | request-response | `backend/internal/handlers/contributions_public_handler.go` | exact |
| `backend/internal/repository/group_contributors_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_public_repository.go` | exact |
| `backend/internal/repository/group_themes_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_public_repository.go` (projection pattern) | role-match |
| `backend/internal/repository/group_release_media_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_public_repository.go` (projection pattern) | role-match |
| `shared/contracts/openapi.yaml` (extend) | config | — | existing `/anime/{id}/group/{groupId}` paths in openapi.yaml | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` (extend) | config | — | existing `page.module.css` | exact |

---

## Pattern Assignments

### `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` (Server Component orchestrator)

**Analog:** `frontend/src/app/members/[slug]/page.tsx`

**Imports pattern** (analog lines 1–29):
```typescript
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, getGroupDetail, getAnimeByID, getGroupAssets, getGroupReleases, getAnimeFansubs } from '@/lib/api'
// NEU: drei neue Helper
import { getGroupContributors, getGroupThemes, getGroupReleaseMedia } from '@/lib/api'
import { buildGroupNavigationGroups } from '@/lib/groupNavigation'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { GroupSectionsNav } from './GroupSectionsNav'
import { HeroSection } from './sections/HeroSection'
// ... alle Section-Imports
import styles from './page.module.css'
```

**Params resolution pattern** (existing `page.tsx` lines 36–48 — keep verbatim):
```typescript
export default async function GroupStoryPage({ params }: GroupStoryPageProps) {
  const resolvedParams = await params
  const animeID = Number.parseInt(resolvedParams.id, 10)
  const groupID = Number.parseInt(resolvedParams.groupId, 10)

  if (Number.isNaN(animeID) || animeID <= 0 || Number.isNaN(groupID) || groupID <= 0) {
    return notFound()
  }
  // ...
}
```

**Parallel fetch + graceful degradation pattern** (existing `page.tsx` lines 57–122):
```typescript
try {
  [groupResponse, animeResponse] = await Promise.all([
    getGroupDetail(animeID, groupID),
    getAnimeByID(animeID),
  ])
} catch (error) {
  if (error instanceof ApiError && error.status === 404) {
    return notFound()
  }
  errorMessage = 'Gruppendetails konnten nicht geladen werden.'
}
// Secondary fetches: try individually, continue without on error
try {
  groupAssetsResponse = await getGroupAssets(animeID, groupID)
} catch (error) {
  if (error instanceof ApiError) { groupAssetsError = error.message }
  else { groupAssetsError = 'Gruppen-Assets konnten nicht geladen werden.' }
}
```

**Props handoff to sections (no client-fetch in sections):**
```typescript
return (
  <main className={styles.page}>
    <GroupSectionsNav />
    <section id="story"><StorySection story={group.story} projectNotes={projectNotes} /></section>
    <section id="team"><TeamSection teamMembers={contributors.team_members} externalContributors={contributors.external_contributors} /></section>
    <section id="releases"><ReleasesSection episodes={releaseEpisodes.slice(0, 5)} animeID={animeID} groupID={groupID} /></section>
    <section id="themes"><ThemesSection themes={themes.items} /></section>
    <section id="medien"><MediaSection items={releaseMedia.items} /></section>
    <BacklinksSection fansubSlug={group.fansub.slug} animeID={animeID} />
  </main>
)
```

---

### `frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx` (Client Component, sticky nav)

**Analog:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` (IntersectionObserver usage, lines 1–25)

**'use client' + IntersectionObserver pattern:**
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import styles from './GroupSectionsNav.module.css'

const NAV_SECTIONS = [
  { id: 'story', label: 'Geschichte' },
  { id: 'team', label: 'Beteiligte' },
  { id: 'releases', label: 'Releases' },
  { id: 'themes', label: 'OP/ED/Middle' },
  { id: 'medien', label: 'Medien' },
] as const

export function GroupSectionsNav() {
  const [activeSection, setActiveSection] = useState<string>('story')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <nav className={styles.nav} aria-label="Abschnitte">
      {NAV_SECTIONS.map(({ id, label }) => (
        <Button
          key={id}
          href={`#${id}`}
          variant={activeSection === id ? 'subtle' : 'ghost'}
          size="sm"
          aria-current={activeSection === id ? 'true' : undefined}
        >
          {label}
        </Button>
      ))}
    </nav>
  )
}
```

**Button variant mapping** (from `frontend/src/components/ui/Button.tsx` lines 6–7, 47–60):
- Inactive chip: `variant="ghost"` — transparent background, muted text
- Active chip: `variant="subtle"` — 10% accent background
- Both are `size="sm"`

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` (extracted from existing page)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` lines 192–263

**Core pattern** (extract exactly — hero + info-panel + stats + breadcrumbs + edge-nav):
```typescript
import Image from 'next/image'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { GroupEdgeNavigation } from '@/components/groups/GroupEdgeNavigation'
import { GroupAssetShowcase } from '../GroupAssetShowcase'
import styles from '../page.module.css'

interface HeroSectionProps {
  group: GroupDetail
  anime: AnimeDetail
  groupID: number
  animeID: number
  heroBackdropUrl: string | null
  infoPanelBackgroundUrl: string | null
  posterImage: string | null
  heroStyle: CSSProperties | undefined
  infoPanelStyle: CSSProperties | undefined
  pageStyle: CSSProperties | undefined
  breadcrumbItems: { label: string; href?: string }[]
  navigationGroups: FansubGroupSummary[]
  groupAssetsResponse: GroupAssetsResponse | null
  releaseEpisodes: EpisodeReleaseSummary[]
}
```

**Existing hero JSX** (existing `page.tsx` lines 192–289 — kept verbatim, moved to HeroSection):
The entire `<section className={styles.heroShell}>` block including backdrop, poster, info panel, stats, and GroupAssetShowcase moves intact into HeroSection.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx` (thin wrapper)

**Analog:** existing `page.tsx` lines 232–237 + `frontend/src/components/groups/CollapsibleStory.tsx`

**Imports pattern:**
```typescript
import { CollapsibleStory } from '@/components/groups/CollapsibleStory'
import { SectionHeader, EmptyState } from '@/components/ui'
import styles from '../page.module.css'
```

**Core pattern** (wraps CollapsibleStory, adds SectionHeader + EmptyState):
```typescript
interface StorySectionProps {
  story: string | null | undefined
  projectNotesHtml: string | null | undefined  // from anime_fansub_project_notes.body_html
}

export function StorySection({ story, projectNotesHtml }: StorySectionProps) {
  // Prefer structured project notes, fallback to legacy notes
  const displayContent = projectNotesHtml || story || null
  return (
    <div className={styles.storySection}>
      <SectionHeader title="Projektgeschichte" />
      {displayContent ? (
        <CollapsibleStory content={displayContent} />
      ) : (
        <EmptyState
          variant="compact"
          title="Noch keine Projektgeschichte"
          description="Für dieses Projekt wurde bisher keine Geschichte hinterlegt."
        />
      )}
    </div>
  )
}
```

**CollapsibleStory interface** (`frontend/src/components/groups/CollapsibleStory.tsx` lines 6–8):
```typescript
interface CollapsibleStoryProps {
  content: string  // accepts plain text; collapse threshold = 400 chars
}
```

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` (new)

**Analog:** RESEARCH.md Code Example (D-07 TeamSection pattern) + `frontend/src/types/contributions.ts`

**Imports pattern:**
```typescript
import Link from 'next/link'
import { Card, Badge, SectionHeader, EmptyState } from '@/components/ui'
import type { GroupTeamMember, GroupExternalContributor } from '@/types/groupContributors'
import styles from '../page.module.css'
```

**Core pattern — two strictly separated blocks (D-07)**:
```typescript
interface TeamSectionProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
}

export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  return (
    <div className={styles.teamSection}>
      <SectionHeader title="Beteiligte am Projekt" />

      {/* Block 1: App-Member (release_member_roles) */}
      <div className={styles.teamBlock}>
        <h3 className={styles.blockTitle}>Team-Beteiligte</h3>
        {teamMembers.length === 0 ? (
          <EmptyState variant="compact" title="Noch keine Team-Beteiligten"
            description="Für dieses Projekt sind noch keine Team-Mitglieder erfasst." />
        ) : (
          <div className={styles.personGrid}>
            {teamMembers.map((m) => (
              <Card key={m.member_id} variant="elevated" className={styles.personCard}>
                {m.member_slug
                  ? <Link href={`/members/${m.member_slug}`} className={styles.personName}>{m.member_display_name}</Link>
                  : <span className={styles.personName}>{m.member_display_name}</span>}
                <div className={styles.roleTags}>
                  {m.role_labels.map((role) => (
                    <Badge key={role} variant="muted">{role}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Block 2: Externe Mitwirkende (anime_contributions) — abgesetzt, Card flat */}
      <div className={styles.externalBlock}>
        <h3 className={styles.blockTitle}>Externe Mitwirkende</h3>
        {externalContributors.length === 0 ? (
          <EmptyState variant="compact" title="Keine externen Mitwirkenden"
            description="Für dieses Projekt sind noch keine externen Mitwirkenden hinterlegt." />
        ) : (
          <Card variant="flat" className={styles.externalList}>
            {externalContributors.map((c) => (
              <div key={c.member_display_name} className={styles.externalRow}>
                {c.member_slug
                  ? <Link href={`/members/${c.member_slug}`}>{c.member_display_name}</Link>
                  : <span>{c.member_display_name}</span>}
                <div className={styles.roleTags}>
                  {c.role_labels.map((r) => <Badge key={r} variant="muted">{r}</Badge>)}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
```

**Slug-link rule** (RESEARCH Befund 8): `member_slug !== null` → render `<Link>` with accent; `null` → plain `<span>`, no cursor-pointer.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` (new)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (card+badge pattern) + existing `page.tsx` line 239–251 (CTA button)

**Imports pattern:**
```typescript
import Link from 'next/link'
import { Card, Badge, SectionHeader, EmptyState, Button } from '@/components/ui'
import type { EpisodeReleaseSummary } from '@/types/group'
import styles from '../page.module.css'
```

**Core pattern** (highlight slice, NOT full list — D-10):
```typescript
interface ReleasesSectionProps {
  episodes: EpisodeReleaseSummary[]  // already sliced to first 3–5 in page.tsx
  animeID: number
  groupID: number
}

export function ReleasesSection({ episodes, animeID, groupID }: ReleasesSectionProps) {
  return (
    <div className={styles.releasesSection}>
      <SectionHeader title="Releases & Versionen" />
      {episodes.length === 0 ? (
        <EmptyState variant="compact" title="Noch keine Releases"
          description="Für dieses Projekt sind noch keine öffentlichen Releases vorhanden." />
      ) : (
        <div className={styles.releaseGrid}>
          {episodes.map((ep) => (
            <Card key={ep.id} variant="interactive" className={styles.releaseCard}>
              <p className={styles.releaseTitle}>{ep.title ?? `Episode ${ep.episode_number}`}</p>
              {/* Version labels: D-11 — show if version data available */}
              {ep.released_at && <span className={styles.releaseMeta}>{ep.released_at}</span>}
              {/* NOTE: has_op/has_ed/karaoke_count are dummy values per RESEARCH Befund 1 — do NOT render */}
            </Card>
          ))}
        </div>
      )}
      <div className={styles.releasesCta}>
        <Button href={`/anime/${animeID}/group/${groupID}/releases`} variant="primary">
          Alle Releases ansehen
        </Button>
      </div>
    </div>
  )
}
```

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx` (new — no exact analog)

**Analog:** None (no existing public theme component). Use Badge/Card/SectionHeader/EmptyState pattern from TeamSection + RESEARCH Befund 3 data shape.

**Imports pattern:**
```typescript
import { Card, Badge, SectionHeader, EmptyState } from '@/components/ui'
import type { PublicGroupTheme } from '@/types/groupContributors'
import styles from '../page.module.css'
```

**Core pattern** (grouped by type, asset tiles, read-only):
```typescript
interface ThemesSectionProps {
  themes: PublicGroupTheme[]
}

const THEME_TYPE_LABELS: Record<string, string> = {
  OP: 'Opening',
  ED: 'Ending',
  MIDDLE: 'Middle',
}

export function ThemesSection({ themes }: ThemesSectionProps) {
  const grouped = groupByType(themes)  // local helper: { OP: [], ED: [], MIDDLE: [] }
  const hasAny = themes.length > 0

  return (
    <div className={styles.themesSection}>
      <SectionHeader title="OP / ED / Middle" />
      {!hasAny ? (
        <EmptyState variant="compact" title="Noch keine OP/ED/Middle"
          description="Für dieses Projekt sind noch keine Theme-Einblicke freigegeben." />
      ) : (
        Object.entries(grouped).map(([type, items]) =>
          items.length > 0 ? (
            <div key={type} className={styles.themeGroup}>
              <h3 className={styles.blockTitle}>{THEME_TYPE_LABELS[type] ?? type}</h3>
              {items.map((theme) => (
                <Card key={theme.id} variant="section" className={styles.themeCard}>
                  <div className={styles.themeHeader}>
                    <span className={styles.themeTitle}>{theme.title}</span>
                    <Badge variant="muted">{THEME_TYPE_LABELS[theme.type] ?? theme.type}</Badge>
                  </div>
                  {/* Asset tiles — only visibility='public' AND review_status='approved' */}
                  {theme.assets.length > 0 && (
                    <div className={styles.assetGrid}>
                      {theme.assets.map((asset) => (
                        <div key={asset.id} className={styles.assetTile}>
                          {/* Thumbnail with descriptive alt */}
                          {asset.thumbnail_url && (
                            <img src={asset.thumbnail_url} alt={`OP-Asset: ${theme.title}`}
                              className={styles.assetThumb} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : null
        )
      )}
    </div>
  )
}
```

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/MediaSection.tsx` (new)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx` (gallery wrapper pattern) + RESEARCH Befund 4

**Imports pattern:**
```typescript
import { Card, SectionHeader, EmptyState } from '@/components/ui'
import type { PublicReleaseMediaItem } from '@/types/groupContributors'
import styles from '../page.module.css'
```

**Core pattern** (gallery of public release_version_media, D-14/D-15):
```typescript
interface MediaSectionProps {
  items: PublicReleaseMediaItem[]
}

export function MediaSection({ items }: MediaSectionProps) {
  return (
    <div className={styles.mediaSection}>
      <SectionHeader title="Release-Einblicke" />
      {/* Section ALWAYS visible (D-15) — EmptyState when no items */}
      {items.length === 0 ? (
        <EmptyState variant="compact" title="Noch keine Release-Einblicke"
          description="Für dieses Projekt sind bisher keine öffentlichen Medien freigegeben." />
      ) : (
        <Card variant="section">
          <div className={styles.galleryGrid}>
            {items.map((item) => (
              <div key={item.id} className={styles.galleryTile}>
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url}
                    alt={`Release-Einblick: ${item.caption ?? ''}`}
                    className={styles.galleryThumb} />
                )}
                {item.caption && <p className={styles.galleryCaption}>{item.caption}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
```

**GroupAssetShowcase wrapper reference** (`GroupAssetShowcase.tsx` lines 1–29):
```typescript
// Pattern: 'use client' wrapper that delegates all data to inner experience component
// MediaSection is a pure RSC with props (no 'use client' needed — no interactivity)
export function GroupAssetShowcase({ animeID, groupID, episodes, releaseEpisodes }: GroupAssetShowcaseProps) {
  return <GroupAssetsExperience animeID={animeID} groupID={groupID} episodes={episodes} folderFound={episodes.length > 0} releaseEpisodes={releaseEpisodes} />
}
```

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx` (new)

**Analog:** `frontend/src/app/fansubs/[slug]/page.tsx` nav/link block (lines 96–116) + existing `page.tsx` lines 188–190, 239–251

**Core pattern:**
```typescript
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Card, SectionHeader } from '@/components/ui'
import styles from '../page.module.css'

interface BacklinksSectionProps {
  fansubSlug: string
  animeID: number
}

export function BacklinksSection({ fansubSlug, animeID }: BacklinksSectionProps) {
  return (
    <div className={styles.backlinksSection}>
      <SectionHeader title="Mehr entdecken" />
      <Card variant="flat" className={styles.backlinksCard}>
        <Link href={`/fansubs/${fansubSlug}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Gruppenseite
        </Link>
        <Link href={`/anime/${animeID}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Anime-Seite
        </Link>
      </Card>
    </div>
  )
}
```

---

### `frontend/src/types/groupContributors.ts` (new)

**Analog:** `frontend/src/types/group.ts` (shape) + `frontend/src/types/contributions.ts` (`PublicContributorRow`)

**Core pattern** (snake_case JSON keys, matching Go DTOs):
```typescript
// Matches backend group_contributors_repository.go DTOs

export interface GroupTeamMember {
  member_id: number
  member_display_name: string
  member_slug: string | null  // null = no link (D-09)
  role_labels: string[]
}

export interface GroupExternalContributor {
  member_display_name: string
  member_slug: string | null
  role_labels: string[]
  is_verified: boolean
}

export interface GroupContributorsResponse {
  team_members: GroupTeamMember[]
  external_contributors: GroupExternalContributor[]
}

export interface PublicThemeAsset {
  id: number
  thumbnail_url: string | null
  // visibility='public' AND review_status='approved' enforced backend-side
}

export interface PublicGroupTheme {
  id: number
  type: 'OP' | 'ED' | 'MIDDLE'
  title: string
  assets: PublicThemeAsset[]
}

export interface GroupThemesResponse {
  themes: PublicGroupTheme[]
}

export interface PublicReleaseMediaItem {
  id: number
  thumbnail_url: string | null
  caption: string | null
  media_type: string
}

export interface GroupReleaseMediaResponse {
  items: PublicReleaseMediaItem[]
}
```

---

### `frontend/src/lib/api.ts` — three new helper functions (extend)

**Analog:** existing `getGroupDetail` / `getGroupReleases` in `api.ts` (lines 5509–5567)

**Import additions** (at top of file, extend existing group-type imports):
```typescript
import {
  GroupContributorsResponse,
  GroupThemesResponse,
  GroupReleaseMediaResponse,
} from '@/types/groupContributors'
```

**Pattern to copy verbatim — adapt URL only** (`api.ts` lines 5509–5529):
```typescript
export async function getGroupContributors(
  animeID: number,
  groupID: number,
): Promise<GroupContributorsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/contributors`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<GroupContributorsResponse>
}

export async function getGroupThemes(
  animeID: number,
  groupID: number,
): Promise<GroupThemesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/themes`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<GroupThemesResponse>
}

export async function getGroupReleaseMedia(
  animeID: number,
  groupID: number,
): Promise<GroupReleaseMediaResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/release-media`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<GroupReleaseMediaResponse>
}
```

---

### `backend/internal/handlers/group_contributors_handler.go` (new)

**Analog:** `backend/internal/handlers/contributions_public_handler.go` (lines 1–75 — exact copy structure)

**Imports pattern** (lines 1–10 of `contributions_public_handler.go`):
```go
package handlers

import (
    "net/http"

    "team4s.v3/backend/internal/repository"
    "github.com/gin-gonic/gin"
)
```

**Handler struct + constructor** (copy shape of `ContributionsPublicHandler`):
```go
// GroupPublicHandler verwaltet öffentliche HTTP-Endpunkte für Gruppen-Projektions-Daten.
type GroupPublicHandler struct {
    contributorsRepo *repository.GroupContributorsRepository
    themesRepo       *repository.GroupThemesRepository
    mediaRepo        *repository.GroupReleaseMediaRepository
}

func NewGroupPublicHandler(
    contributorsRepo *repository.GroupContributorsRepository,
    themesRepo *repository.GroupThemesRepository,
    mediaRepo *repository.GroupReleaseMediaRepository,
) *GroupPublicHandler {
    return &GroupPublicHandler{contributorsRepo, themesRepo, mediaRepo}
}
```

**Handler method pattern** (copy from `contributions_public_handler.go` lines 24–37 — adapt params):
```go
// GetGroupContributors handles GET /api/v1/anime/:id/group/:groupId/contributors
func (h *GroupPublicHandler) GetGroupContributors(c *gin.Context) {
    animeID, err := parseAnimeID(c.Param("id"))
    if err != nil {
        badRequest(c, "ungültige anime-id")
        return
    }
    groupID, err := parseGroupID(c.Param("groupId"))
    if err != nil {
        badRequest(c, "ungültige group-id")
        return
    }
    response, err := h.contributorsRepo.GetProjectContributors(c.Request.Context(), animeID, groupID)
    if err != nil {
        internalError(c, "interner serverfehler")
        return
    }
    c.JSON(http.StatusOK, response)
}
```

**Helper functions available** (from `group_handler.go` lines 88–95 and `anime.go` lines 262–264):
```go
// parseGroupID — already exists in group_handler.go line 89 (same package, reuse directly)
// parseAnimeID — already exists in anime.go line 262 (same package, reuse directly)
// badRequest  — already exists in anime.go line 299
// internalError — already exists in group_handler.go line 174
// notFound  — already exists in group_handler.go line 165
```

---

### `backend/internal/repository/group_contributors_repository.go` (new)

**Analog:** `backend/internal/repository/anime_contributions_public_repository.go` (exact structure, scoped query)

**Imports pattern** (lines 1–9 of `anime_contributions_public_repository.go`):
```go
package repository

import (
    "context"
    "fmt"
    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Repository struct + constructor** (copy shape):
```go
type GroupContributorsRepository struct {
    db *pgxpool.Pool
}

func NewGroupContributorsRepository(db *pgxpool.Pool) *GroupContributorsRepository {
    return &GroupContributorsRepository{db: db}
}
```

**Reuse slug/display helpers** (lines 13–18 of `anime_contributions_public_repository.go`):
```go
// memberSlugExpr and memberDisplayExpr are already defined in
// anime_contributions_public_repository.go (same package).
// DO NOT redefine — reference directly:
//   slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
//   displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")
```

**DTOs for this repository:**
```go
type GroupTeamMember struct {
    MemberID          int64    `json:"member_id"`
    MemberDisplayName string   `json:"member_display_name"`
    MemberSlug        *string  `json:"member_slug"`
    RoleLabels        []string `json:"role_labels"`
}

type GroupExternalContributor struct {
    MemberDisplayName string   `json:"member_display_name"`
    MemberSlug        *string  `json:"member_slug"`
    RoleLabels        []string `json:"role_labels"`
    IsVerified        bool     `json:"is_verified"`
}

type GroupContributorsResponse struct {
    TeamMembers          []GroupTeamMember          `json:"team_members"`
    ExternalContributors []GroupExternalContributor `json:"external_contributors"`
}
```

**Core query pattern** — external contributors block (from RESEARCH Befund 2 + existing query at `anime_contributions_public_repository.go` lines 100–124, add `AND ac.fansub_group_id = $2`):
```go
func (r *GroupContributorsRepository) GetProjectContributors(ctx context.Context, animeID, groupID int64) (*GroupContributorsResponse, error) {
    slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
    displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")

    // Query A: External contributors (anime_contributions) scoped to group
    externalQuery := `
        SELECT
            ` + displayCol + ` AS member_display_name,
            ` + slugCol + ` AS member_slug,
            (ac.status = 'confirmed') AS is_verified,
            COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels
        FROM anime_contributions ac
        JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
        JOIN members m ON m.id = hfgm.member_id
        LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
        LEFT JOIN role_definitions rd ON rd.code = acr.role_code
        WHERE ac.anime_id = $1
          AND ac.fansub_group_id = $2
          AND ac.is_public_on_anime_page = true
          AND hfgm.visibility = 'public'
          AND ac.release_version_id IS NULL
        GROUP BY m.display_name, m.nickname, ac.status
        ORDER BY member_display_name
    `
    // Query B: Team members (release_member_roles) scoped to anime+group
    // (see RESEARCH Befund 2 team query — copy verbatim from RESEARCH.md Code Examples)
}
```

**Error wrapping pattern** (lines 126–129 of `anime_contributions_public_repository.go`):
```go
rows, err := r.db.Query(ctx, query, animeID, groupID)
if err != nil {
    return nil, fmt.Errorf("group contributors: %w", err)
}
defer rows.Close()
```

---

### `backend/internal/repository/group_themes_repository.go` (new)

**Analog:** `backend/internal/repository/anime_contributions_public_repository.go` (projection pattern)

**Pattern** — thin projection with visibility gate, same repo struct shape:
```go
type GroupThemesRepository struct { db *pgxpool.Pool }
func NewGroupThemesRepository(db *pgxpool.Pool) *GroupThemesRepository {
    return &GroupThemesRepository{db: db}
}

// Only return themes where release_theme_assets belong to a release of this group+anime
// AND visibility='public' AND review_status='approved' (Phase-72-Projektion)
// If Phase-72-Felder not yet deployed: fallback filter on media_assets.status='ready'
```

---

### `backend/internal/repository/group_release_media_repository.go` (new)

**Analog:** `backend/internal/repository/anime_contributions_public_repository.go` (projection pattern)

**Pattern** — thin projection, visibility gate required:
```go
type GroupReleaseMediaRepository struct { db *pgxpool.Pool }
func NewGroupReleaseMediaRepository(db *pgxpool.Pool) *GroupReleaseMediaRepository {
    return &GroupReleaseMediaRepository{db: db}
}

// GetPublicReleaseMedia aggregates release_version_media for all release_versions
// belonging to this group+anime, filtered by visibility='public' AND review_status='approved'.
// Returns empty slice (NOT 404) when no visible media (D-15).
```

---

### Route registration in `backend/cmd/server/main.go` (extend)

**Analog:** existing route registrations (lines 297–301):
```go
v1.GET("/anime/:id/group/:groupId", groupHandler.GetGroupDetail)
v1.GET("/anime/:id/group/:groupId/assets", groupAssetsHandler.GetGroupAssets)
v1.GET("/anime/:id/group/:groupId/releases", groupHandler.GetGroupReleases)
```

**New routes — NO authMiddleware (public endpoints):**
```go
// Register after existing group routes, same v1 group, no auth:
groupPublicHandler := handlers.NewGroupPublicHandler(groupContributorsRepo, groupThemesRepo, groupReleaseMediaRepo)
v1.GET("/anime/:id/group/:groupId/contributors", groupPublicHandler.GetGroupContributors)
v1.GET("/anime/:id/group/:groupId/themes", groupPublicHandler.GetGroupThemes)
v1.GET("/anime/:id/group/:groupId/release-media", groupPublicHandler.GetGroupReleaseMedia)
```

---

## Shared Patterns

### 1. Public API Helper Function (api.ts)
**Source:** `frontend/src/lib/api.ts` lines 5509–5529 (`getGroupDetail`)
**Apply to:** `getGroupContributors`, `getGroupThemes`, `getGroupReleaseMedia`
```typescript
export async function getGroupDetail(animeID: number, groupID: number): Promise<GroupDetailResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<GroupDetailResponse>
}
```

### 2. Go Handler Error Helpers
**Source:** `backend/internal/handlers/group_handler.go` lines 164–180 + `anime.go` lines 298–310
**Apply to:** all three new Go handler methods
```go
func notFound(c *gin.Context, message string) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": message}})
}
func internalError(c *gin.Context, message string) {
    c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": message}})
}
func badRequest(c *gin.Context, message string) {
    c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": message}})
}
```

### 3. Go Repository Slug Expression
**Source:** `backend/internal/repository/anime_contributions_public_repository.go` lines 13–18
**Apply to:** `group_contributors_repository.go` (do NOT redefine — same package, reference directly)
```go
const memberSlugExpr = `NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(%s), '[^a-z0-9]+', '-', 'gi'))), '')`
const memberDisplayExpr = `COALESCE(NULLIF(TRIM(%s.display_name), ''), %s.nickname)`
```

### 4. EmptyState + SectionHeader (always together per section)
**Source:** `frontend/src/components/ui/EmptyState.tsx` + `frontend/src/components/ui/SectionHeader.tsx`
**Apply to:** all seven section components
```typescript
// Every section starts with SectionHeader, ends with EmptyState when data is absent.
// Never omit the section from DOM (D-05) — anchor IDs must always be present.
<SectionHeader title="..." />
{data.length === 0 && <EmptyState variant="compact" title="..." description="..." />}
```

### 5. Card Variant Assignment (from UI-SPEC)
**Source:** `frontend/src/components/ui/Card.tsx` lines 6–53
**Apply to:** TeamSection, ReleasesSection, ThemesSection, MediaSection, BacklinksSection
```typescript
// Team-Beteiligte block:  variant="elevated"   (subtle accent gradient)
// Externe Mitwirkende:     variant="flat"       (neutral, no gradient)
// Release-Highlight cards: variant="interactive" (hover: translateY(-2px))
// Theme cards:             variant="section"    (10% accent mix background)
// Media gallery container: variant="section"
// Backlinks card:          variant="flat"
```

### 6. Go Repository Construction Pattern
**Source:** `backend/internal/repository/group_repository.go` lines 17–23
**Apply to:** all three new Go repositories
```go
type GroupRepository struct {
    db *pgxpool.Pool
}
func NewGroupRepository(db *pgxpool.Pool) *GroupRepository {
    return &GroupRepository{db: db}
}
```

### 7. Graceful Fetch Degradation (page.tsx)
**Source:** `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` lines 85–93
**Apply to:** three new fetches in rebuilt `page.tsx` (contributors, themes, release-media)
```typescript
// Secondary fetch — continue rendering page without data on error:
try {
  groupAssetsResponse = await getGroupAssets(animeID, groupID)
} catch (error) {
  if (error instanceof ApiError) {
    groupAssetsError = error.message
  } else {
    groupAssetsError = 'Gruppen-Assets konnten nicht geladen werden.'
  }
}
// If fetch fails → pass empty array to section → section renders EmptyState (D-05)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ThemesSection.tsx` | component | request-response | No existing public theme display component anywhere in codebase — all theme endpoints are admin-only. Pattern: use Card/Badge/SectionHeader/EmptyState from shared patterns above. RESEARCH Befund 3 provides the expected data shape from the new backend endpoint. |

---

## Critical Anti-Patterns (from RESEARCH.md)

| Anti-Pattern | Where Verified | How to Avoid |
|--------------|----------------|--------------|
| `getReleaseVersionMedia` on public page | `frontend/src/lib/api.ts` — calls `/admin/release-versions/:versionId/media` | Use new `getGroupReleaseMedia` helper only |
| Admin theme routes on public page | `backend/cmd/server/admin_routes.go` — all `/admin/anime/:id/themes*` are auth-gated | New public route `GET /api/v1/anime/:id/group/:groupId/themes` only |
| `anime_fansub_groups.notes` as structured story | `backend/internal/repository/group_repository.go` line 51 — `afg.notes` is legacy short text | Prefer `anime_fansub_project_notes.body_html` with fallback to `notes` |
| `group.period` as reliable date | `group_repository.go` line 79 — explicitly set `nil` | Guard with `if group.period != null && (group.period.start || group.period.end)` |
| Redefining `memberSlugExpr` | Same Go package — already defined | Use directly without redefinition |

---

## Metadata

**Analog search scope:** `frontend/src/app/anime/[id]/group/[groupId]/`, `frontend/src/app/fansubs/[slug]/`, `frontend/src/app/members/[slug]/`, `frontend/src/components/ui/`, `frontend/src/components/groups/`, `backend/internal/handlers/`, `backend/internal/repository/`, `frontend/src/lib/api.ts`, `frontend/src/types/`
**Files scanned:** 21
**Pattern extraction date:** 2026-06-05
