# Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern — Pattern Map

**Erstellt:** 2026-06-04
**Dateien analysiert:** 13 neue/geänderte Dateien
**Analogs gefunden:** 13 / 13

---

## Datei-Klassifikation

| Neue / geänderte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|------------------------|-------|-----------|-----------------|----------------|
| `frontend/src/app/fansubs/[slug]/page.tsx` | page (Server Component) | request-response | `frontend/src/app/anime/[id]/page.tsx` | exact |
| `frontend/src/app/fansubs/[slug]/page.module.css` | config (CSS) | — | `frontend/src/app/fansubs/[slug]/page.module.css` (bestehend) | exact |
| `frontend/src/components/fansubs/FansubSectionNav.tsx` | component (Client) | event-driven | `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` | role-match (IntersectionObserver + useRef) |
| `frontend/src/components/fansubs/FansubSectionNav.module.css` | config (CSS) | — | `frontend/src/components/fansubs/FansubProfileTabs.module.css` | role-match |
| `frontend/src/components/fansubs/FansubHeroSection.tsx` | component (Server) | request-response | `frontend/src/app/fansubs/[slug]/page.tsx` (Hero-Markup) | exact |
| `frontend/src/components/fansubs/FansubStorySection.tsx` | component (mixed) | request-response | `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` (CollapsibleStory-Nutzung) | exact |
| `frontend/src/components/fansubs/FansubHighlightsSection.tsx` | component (Server) | transform | `frontend/src/lib/fansub-summary.ts` (Datentransformation) | role-match |
| `frontend/src/components/fansubs/FansubProjectsSection.tsx` | component (Server) | CRUD (read) | `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Tab „Projekte") | exact |
| `frontend/src/components/fansubs/FansubTeamSection.tsx` | component (Server) | CRUD (read) | `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Tab „Mitglieder") | role-match |
| `frontend/src/components/fansubs/FansubContributorsSection.tsx` | component (Server) | CRUD (read) | `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Tab „Mitglieder") | partial-match |
| `frontend/src/components/fansubs/FansubMediaSection.tsx` | component (Server) | CRUD (read) | `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Tab „Archiv") | partial-match |
| `frontend/src/components/fansubs/FansubDeepDiveSection.tsx` | component (Server) | request-response | `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Tab „Archiv") | exact |
| `frontend/src/lib/api.ts` | utility (API client) | request-response | `frontend/src/lib/api.ts` (Zeilen 1501–1556, 7680–7704) | exact |

---

## Pattern Assignments

### `frontend/src/app/fansubs/[slug]/page.tsx` (page, Server Component)

**Analog:** `frontend/src/app/anime/[id]/page.tsx`

**Imports-Muster** (Zeilen 1–35 des Analogs):
```typescript
import Link from 'next/link'
import { ApiError, getAnimeByID, getAnimeFansubs, /* ... */ } from '@/lib/api'
import styles from './page.module.css'
```

**Paralleler Datenfetch mit `Promise.allSettled`** (Zeilen 144–155 des Analogs):
```typescript
const [animeFansubsResult, groupedEpisodesResult, commentsResult, watchlistResult, backdropResult, relationsResult] =
  await Promise.allSettled([
    getAnimeFansubs(anime.id),
    getGroupedEpisodes(anime.id),
    getAnimeComments(animeID, { page: 1, per_page: 10 }),
    authToken ? getWatchlistEntry(animeID, authToken) : Promise.resolve(null),
    withTimeout(getAnimeBackdrops(anime.id), 4000),
    getAnimeRelations(anime.id),
  ])

const animeFansubsResponse = animeFansubsResult.status === 'fulfilled' ? animeFansubsResult.value : null
```

**Graceful Degradation — Fehler-Check** (Zeilen 110–132 des Analogs):
```typescript
let response: Awaited<ReturnType<typeof getAnimeByID>> | null = null
let message: string | null = null
try {
  response = await getAnimeByID(animeID)
} catch (error) {
  message =
    error instanceof ApiError && error.status === 404
      ? 'Anime nicht gefunden.'
      : 'Anime-Detailseite konnte nicht geladen werden.'
}

if (!response) {
  return (
    <main className={styles.page}>
      <div className={styles.errorPage}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message ?? 'Anime-Detailseite konnte nicht geladen werden.'}</div>
      </div>
    </main>
  )
}
```

**Für Phase 73 anzuwendender Fetch-Shape** (aus RESEARCH.md Architektur-Diagramm):
```typescript
// page.tsx bleibt ≤ 150 Zeilen (CLAUDE.md); nur Fetch + Section-Orchestrierung
const [groupResponse, domainProjectionResult, projectsResult, contributionsResult, mediaOwnershipResult] =
  await Promise.allSettled([
    getFansubGroupDomainProjection(group.id),  // Phase-72-Funktion (nach Phase-72)
    loadFansubProjects(group.id),
    getFansubContributions(group.id),
    getMediaOwnershipProjection('group', group.id),  // Phase-72-Funktion (nach Phase-72)
  ])
// allSettled → fehlende Phase-72-Daten → leere Arrays → Empty State (D-15)
```

**Slug-Validierung** (bestehendes Muster `page.tsx` Zeilen 42–55):
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

---

### `frontend/src/app/fansubs/[slug]/page.module.css` (CSS, Seiten-Layout)

**Analog:** bestehendes `frontend/src/app/fansubs/[slug]/page.module.css`

**Bestehende Tokens** (vollständig, 63 Zeilen):
```css
.page {
  width: min(1280px, 100% - 48px);
  margin: 0 auto;
  padding: 24px 0 48px;
}

.hero {
  margin-top: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-white);
  padding: 24px;
}

.title {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 1.25;
}

.subtitle {
  margin: 16px 0 0;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 16px;
}

.errorBox {
  margin-top: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-white);
  padding: 16px;
}
```

**Neue Tokens für Phase 73 (ergänzen, nicht ersetzen):**
```css
/* Lesebreite für Fließtext-Abschnitte (D-03, UI-SPEC) */
.readingColumn {
  width: min(780px, 100%);
  margin: 0 auto;
}

/* Abstand zwischen Haupt-Abschnitten (UI-SPEC: xl = 32px) */
.section + .section {
  margin-top: 32px;
}

/* Projektraster und Medien nutzen die volle 1280px-Breite (UI-SPEC) */
.gridSection {
  width: 100%;
}
```

---

### `frontend/src/components/fansubs/FansubSectionNav.tsx` (Client Component, Sticky-Nav)

**Analog:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx`

**`'use client'` + IntersectionObserver-Muster** (Zeilen 1–26 des Analogs):
```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ... IntersectionObserver mit ref
const observerRef = useRef<IntersectionObserver | null>(null)
const loadTriggerRef = useRef<HTMLDivElement | null>(null)
```

**Button-Primitive aus `@/components/ui`** (Button.tsx, CLAUDE.md Pflicht):
```typescript
import { Button } from '@/components/ui'
// variant="ghost" für inaktive Chips, variant="subtle" für aktiven Chip (UI-SPEC)
<Button
  variant={activeSection === id ? 'subtle' : 'ghost'}
  size="sm"
  aria-current={activeSection === id ? 'true' : undefined}
  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
>
  {label}
</Button>
```

**IntersectionObserver-Implementierung für Phase 73:**
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import styles from './FansubSectionNav.module.css'

const SECTION_IDS = ['geschichte', 'hoehepunkte', 'projekte', 'team', 'mitwirkende', 'medien', 'timeline', 'deep-dive'] as const
const SECTION_LABELS: Record<typeof SECTION_IDS[number], string> = {
  'geschichte': 'Geschichte',
  'hoehepunkte': 'Höhepunkte',
  'projekte': 'Projekte',
  'team': 'Team',
  'mitwirkende': 'Mitwirkende',
  'medien': 'Medien',
  'timeline': 'Timeline',
  'deep-dive': 'Mehr',
}

export function FansubSectionNav() {
  const [activeSection, setActiveSection] = useState<string>(SECTION_IDS[0])
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <nav className={styles.sectionNav} aria-label="Seitennavigation">
      {SECTION_IDS.map((id) => (
        <Button
          key={id}
          variant={activeSection === id ? 'subtle' : 'ghost'}
          size="sm"
          aria-current={activeSection === id ? 'true' : undefined}
          onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
        >
          {SECTION_LABELS[id]}
        </Button>
      ))}
    </nav>
  )
}
```

**CSS-Muster Sticky-Nav** (aus `FansubProfileTabs.module.css` + UI-SPEC):
```css
/* FansubSectionNav.module.css */
.sectionNav {
  position: sticky;
  top: var(--header-height, 60px);
  z-index: 10;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 8px 0;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  /* Desktop: flex-row; Mobil: overflow-x: auto (horizontal Chip-Leiste, D-04) */
  overflow-x: auto;
  white-space: nowrap;
}
```

---

### `frontend/src/components/fansubs/FansubHeroSection.tsx` (Server Component)

**Analog:** `frontend/src/app/fansubs/[slug]/page.tsx` Zeilen 96–114 (bestehender Hero-Block)

**Hero-Markup-Muster** (zu extrahieren aus page.tsx):
```typescript
import Link from 'next/link'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'
import styles from '../../../app/fansubs/[slug]/page.module.css'

interface FansubHeroSectionProps {
  group: FansubGroup
}

export function FansubHeroSection({ group }: FansubHeroSectionProps) {
  return (
    <section id="hero" className={styles.hero}>
      <p className={styles.slug}>/{group.slug}</p>
      <h1 className={styles.title}>{group.name}</h1>
      <p className={styles.subtitle}>{buildFansubFactSummary(group) || 'Keine Kurzbeschreibung vorhanden.'}</p>
    </section>
  )
}
```

**`buildFansubFactSummary`** (`frontend/src/lib/fansub-summary.ts`, Zeilen 23–30):
```typescript
export function buildFansubFactSummary(group: FansubGroup): string | null {
  const parts = [foundedLabel(group), group.country?.trim() || null, statusLabel(group.status)].filter(
    (value): value is string => Boolean(value && value.trim()),
  )
  if (parts.length === 0) return null
  return parts.join(' • ')
}
```

---

### `frontend/src/components/fansubs/FansubStorySection.tsx` (mixed Server/Client)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` (CollapsibleStory-Nutzung)

**CollapsibleStory-Import-Muster** (Zeilen 7–8 des Analogs):
```typescript
import { CollapsibleStory } from '@/components/groups/CollapsibleStory'
```

**CollapsibleStory-Interface** (`frontend/src/components/groups/CollapsibleStory.tsx`, Zeilen 1–8):
```typescript
'use client'
import { useState } from 'react'
import styles from './CollapsibleStory.module.css'

interface CollapsibleStoryProps {
  content: string  // Plaintext; kein HTML; kein dangerouslySetInnerHTML
}
const THRESHOLD = 400  // Zeichen ab denen Collapsing aktiv wird
```

**Story-Abschnitt für Phase 73** (kein story-Feld im DTO → Fakten + Empty State, A3):
```typescript
import { SectionHeader, EmptyState } from '@/components/ui'
import { CollapsibleStory } from '@/components/groups/CollapsibleStory'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'

interface FansubStorySectionProps {
  group: FansubGroup
}

export function FansubStorySection({ group }: FansubStorySectionProps) {
  const storyContent = buildFansubFactSummary(group)

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      {storyContent
        ? <CollapsibleStory content={storyContent} />
        : <EmptyState
            variant="compact"
            title="Noch keine Geschichte hinterlegt"
            description="Die Gruppe hat bisher noch keine Beschreibung veröffentlicht."
          />
      }
    </section>
  )
}
```

---

### `frontend/src/components/fansubs/FansubHighlightsSection.tsx` (Server Component, transform)

**Analog:** `frontend/src/lib/fansub-summary.ts` (Datentransformations-Muster)

**`FansubGroup`-Felder für Highlights** (`frontend/src/types/fansub.ts`, Zeilen 21–46):
```typescript
export interface FansubGroup {
  // ... (Zeilen 37-42 verifiziert)
  anime_relations_count: number;   // → Anime-Projekte
  release_versions_count: number;  // → Release-Versionen
  members_count: number;           // → Mitglieder
  founded_year?: number | null;
  dissolved_year?: number | null;
}
```

**Highlights-Berechnung (D-05, kein Write, kein API-Call)**:
```typescript
import { SectionHeader, Card } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'
import type { PublicGroupContributionsResponse } from '@/types/contributions'

function computeActiveYears(foundedYear?: number | null, dissolvedYear?: number | null): number | null {
  if (!foundedYear) return null
  const end = dissolvedYear ?? new Date().getFullYear()
  return end - foundedYear
}

interface Highlight { label: string; value: number | string | null }

function computeHighlights(group: FansubGroup, contributions: PublicGroupContributionsResponse | null): Highlight[] {
  return [
    { label: 'Anime-Projekte', value: group.anime_relations_count },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: group.members_count },
    { label: 'Aktive Jahre', value: computeActiveYears(group.founded_year, group.dissolved_year) },
  ].filter((h) => h.value !== null && h.value !== 0)
}

// Wenn alle Highlights null → Abschnitt ausblenden (UI-SPEC Copywriting-Kontrakt)
```

---

### `frontend/src/components/fansubs/FansubProjectsSection.tsx` (Server Component, CRUD read)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` Tab „Projekte" (Zeilen 46–106, 180–203)

**Bucket-Logik extrahieren** (Zeilen 46–60):
```typescript
// In FansubProjectsSection.tsx wiederverwenden (oder in shared util extrahieren):
type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'

const projectBucketOrder: ProjectBucketKey[] = ['ongoing', 'completed', 'archived']

const projectBucketLabel: Record<ProjectBucketKey, string> = {
  ongoing: 'Laufend',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

function resolveProjectBucket(status: AnimeListItem['status']): ProjectBucketKey {
  if (status === 'ongoing') return 'ongoing'
  if (status === 'done') return 'completed'
  return 'archived'
}
```

**Projekt-Link anpassen** (D-13 — aktuell Zeile 194, `href={/anime/${item.id}}`):
```typescript
// ALT (FansubProfileTabs.tsx Zeile 194):
<Link href={`/anime/${item.id}`}>{item.title}</Link>

// NEU (D-13, Deep-Dive-Surface Phase 75):
<Link href={`/anime/${item.id}/group/${groupId}`}>{item.title}</Link>
// groupId muss als Prop von page.tsx nach unten weitergegeben werden
```

**Card-Primitive für Projektkarten** (UI-SPEC, CLAUDE.md Pflicht):
```typescript
import { Card, SectionHeader, EmptyState } from '@/components/ui'

// Projektkarte (Card variant="interactive" für hover-Effekt):
<Card variant="interactive">
  <Link href={`/anime/${item.id}/group/${groupId}`}>{item.title}</Link>
</Card>
```

**Empty State** (D-15, UI-SPEC Copywriting):
```typescript
<EmptyState
  variant="compact"
  title="Noch keine Projekte"
  description="Diese Gruppe hat bisher keine öffentlich zugänglichen Anime-Projekte."
/>
```

---

### `frontend/src/components/fansubs/FansubTeamSection.tsx` (Server Component, CRUD read)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` Tab „Mitglieder" (Zeilen 69–178)

**`formatYearRange`-Utility extrahieren** (Zeilen 39–44 — in shared util oder direkt kopieren):
```typescript
// Aus FansubProfileTabs.tsx Zeilen 39-44:
function formatYearRange(sinceYear?: number | null, untilYear?: number | null): string {
  if (sinceYear && untilYear) return `${sinceYear} - ${untilYear}`
  if (sinceYear) return `seit ${sinceYear}`
  if (untilYear) return `bis ${untilYear}`
  return 'Zeitraum unbekannt'
}
```

**Phase-72-domain-projection-Datenquellen** (D-07/D-08, RESEARCH.md):
```typescript
// Props: nur members[] und historical[] — NIE contributors[] (D-07, Entscheidung 3)
interface FansubTeamSectionProps {
  members: DomainMemberRow[]     // aktive App-Mitglieder (profile_status='active')
  historical: DomainHistoricalRow[]  // hist_fansub_group_members
  // contributors[] gehört NICHT hierher → FansubContributorsSection
}
```

**Untergruppen-Rendering (D-08/D-09)**:
```typescript
// Aktiv: members[] → Card variant="elevated" (farbige Avatar-Karten)
// Ehemalig: historical[] wo claimed=true oder profile_status='historical' → Card variant="flat"
// Historische Nennungen: historical[] wo claimed=false → gedämpfter Text + Badge "unbestätigt"
// Gedenken: profile_status='memorial' → Card variant="flat", kein Avatar, kein Badges

import { Badge, Card, SectionHeader, EmptyState } from '@/components/ui'
import Link from 'next/link'

// Badge für unbestätigte historische Nennungen (D-09, Badge.tsx Zeile 6: variant 'muted'):
{!member.claimed && (
  <Badge variant="muted">unbestätigt</Badge>
)}

// Verlinkung historischer Mitglieder (D-10):
{member.member_slug
  ? <Link href={`/members/${member.member_slug}`}>{member.member_display_name}</Link>
  : <span>{member.member_display_name}</span>
}
```

**Untergruppen als Sub-Komponenten aufteilen** (CLAUDE.md ≤ 450 Zeilen, UI-SPEC):
- `FansubTeamActiveGroup.tsx` — aktive Mitglieder (Avatar-Kachel-Raster)
- `FansubTeamHistoricalGroup.tsx` — Ehemalige + Historische Nennungen
- `FansubTeamMemorialBlock.tsx` — Gedenken-Block

**Empty State** (D-15, UI-SPEC Copywriting):
```typescript
<EmptyState
  variant="compact"
  title="Keine Mitglieder eingetragen"
  description="Für diese Gruppe sind noch keine Mitglieder erfasst."
/>
```

---

### `frontend/src/components/fansubs/FansubContributorsSection.tsx` (Server Component, CRUD read)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` (Mitglieder-Logik als struktureller Rahmen)

**Kritisch: Separation von Team-Block (D-07, Entscheidung 3):**
```typescript
// Props: NUR contributors[] aus domain-projection — nie members[] oder historical[]
interface FansubContributorsSectionProps {
  contributors: DomainContributorRow[]  // anime_contributions — QUELLE EXPLIZIT TRENNEN
}
```

**Contributor-Rendering** (Card variant="flat" oder einfache Liste, UI-SPEC):
```typescript
import { Card, SectionHeader, EmptyState } from '@/components/ui'
import Link from 'next/link'

// Sichtbarkeits-Filter (D-12): nur visibility='public' AND review_status='approved'
const visibleContributors = contributors.filter(
  (c) => c.visibility === 'public' && c.review_status === 'approved'
)

// Verlinkung nur wenn member_slug gesetzt:
{contributor.member_slug
  ? <Link href={`/members/${contributor.member_slug}`}>{contributor.member_display_name}</Link>
  : <span>{contributor.member_display_name}</span>
}
```

**Empty State** (D-15):
```typescript
<EmptyState
  variant="compact"
  title="Keine externen Mitwirkenden"
  description="Für diese Gruppe sind noch keine Mitwirkenden eingetragen."
/>
```

---

### `frontend/src/components/fansubs/FansubMediaSection.tsx` (Server Component, CRUD read)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` Tab „Archiv" (Zeilen 205–223) + `frontend/src/types/fansub.ts` (logo_url, banner_url)

**Drei Ownership-Bereiche** (D-11 — Sub-Komponenten für ≤ 450 Zeilen):
- `FansubGroupMediaBlock.tsx` — `ownerType='group'`, ownerID=group.id → `fansub_group_media`
- `FansubReleaseMediaBlock.tsx` — Release-Version-Medien-Kontext
- `FansubMemberMediaBlock.tsx` — `media_assets.owner_member_id`

**Sichtbarkeits-Filter (D-12 — Pflicht vor Render)**:
```typescript
// Aus Phase-72-Projektion: nur sichtbare/freigegebene Inhalte öffentlich zeigen
const publicMedia = mediaRows.filter(
  (row) => row.visibility === 'public' && row.review_status === 'approved'
)
```

**Bestehende Banner-URL-Fallback** (FansubProfileTabs.tsx Zeilen 217–222):
```typescript
// Fallback auf group.logo_url / group.banner_url wenn Phase-72-Media-Projektion fehlt (A1):
import Image from 'next/image'

{group.banner_url ? (
  <Image src={group.banner_url} alt="" width={760} height={240} unoptimized />
) : null}
```

**Card-Primitive pro Ownership-Bereich** (UI-SPEC):
```typescript
import { Card, SectionHeader, EmptyState } from '@/components/ui'

// Drei Bereiche nebeneinander (Desktop), gestapelt (Mobil, D-11):
// CSS Grid: repeat(auto-fit, minmax(220px, 1fr)) (UI-SPEC Responsive)
<Card variant="section" title="Gruppenmedien">...</Card>
<Card variant="section" title="Release-Einblicke">...</Card>
<Card variant="section" title="Team & Erinnerungen">...</Card>
```

**Empty State pro Bereich** (D-15):
```typescript
<EmptyState
  variant="compact"
  title="Noch keine Medien hinterlegt"
  description="Diese Gruppe hat bisher keine öffentlichen Medien bereitgestellt."
/>
```

---

### `frontend/src/components/fansubs/FansubDeepDiveSection.tsx` (Server Component)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` Tab „Archiv" (Zeilen 205–222)

**Externer Link-Muster** (Zeilen 207–212):
```typescript
// FansubProfileTabs.tsx Zeilen 207-212:
{group.website_url ? (
  <p className={styles.bodyText}>
    Externe Seite:{' '}
    <a href={group.website_url} target="_blank" rel="noreferrer" className={styles.externalLink}>
      {group.website_url}
    </a>
  </p>
) : null}
```

**Für Phase 73 mit Card-Primitive und lucide-react-Icon** (CLAUDE.md Pflicht):
```typescript
import { ExternalLink } from 'lucide-react'
import { Card, SectionHeader } from '@/components/ui'
import Link from 'next/link'

// Deep-Dive-Verlinkung (D-13): /anime/[id]/group/[groupId] (Phase-75-Surface)
// Website-Link: target="_blank" rel="noreferrer" (Security)
<Card variant="flat">
  {group.website_url && (
    <a href={group.website_url} target="_blank" rel="noreferrer">
      <ExternalLink size={16} aria-hidden="true" />
      Webseite besuchen
    </a>
  )}
</Card>
```

---

### `frontend/src/lib/api.ts` (utility, neue Phase-72-Funktionen)

**Analog:** `frontend/src/lib/api.ts` Zeilen 1501–1556 (`getFansubBySlug`, `getFansubMembers`)

**Bestehendes Fetch-Muster — `getFansubBySlug`** (Zeilen 1501–1528):
```typescript
export async function getFansubBySlug(
  slug: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const encodedSlug = encodeURIComponent(slug)
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    )
  }

  return response.json() as Promise<FansubGroupResponse>
}
```

**Bestehendes `getFansubContributions`-Muster** (Zeilen 7680–7704) — verwendet `fetch` (kein `authorizedFetch`) mit `revalidate`:
```typescript
export async function getFansubContributions(
  fansubID: number,
): Promise<PublicGroupContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/contributions`,
    { next: { revalidate: 60 } },
  )
  // ... Fehlerbehandlung identisch zu getFansubBySlug
}
```

**Neue Phase-72-Funktionen nach diesem Muster kopieren** (RESEARCH.md §Phase-72-Contract):
```typescript
// getFansubGroupDomainProjection — öffentlich; kein Auth → fetch mit revalidate
export async function getFansubGroupDomainProjection(
  groupID: number,
): Promise<DomainProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(
    `${API_BASE_URL}/api/v1/fansubs/${groupID}/domain-projection`,
    { next: { revalidate: 60 } },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<DomainProjectionResponse>
}

// getMediaOwnershipProjection — öffentlich; filter auf visibility/review_status im Frontend
export async function getMediaOwnershipProjection(
  ownerType: string,
  ownerID: number,
): Promise<MediaOwnershipRow[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(
    `${API_BASE_URL}/api/v1/media-ownership/${encodeURIComponent(ownerType)}/${ownerID}`,
    { next: { revalidate: 60 } },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<MediaOwnershipRow[]>
}
```

---

## Shared Patterns (übergreifend)

### SectionHeader-Primitive — alle Section-Komponenten
**Quelle:** `frontend/src/components/ui/SectionHeader.tsx`
**Gilt für:** FansubHeroSection, FansubStorySection, FansubHighlightsSection, FansubProjectsSection, FansubTeamSection, FansubContributorsSection, FansubMediaSection, FansubDeepDiveSection

```typescript
// Interface (SectionHeader.tsx Zeilen 5-10):
export interface SectionHeaderProps {
  eyebrow?: string   // Obertitel (optional)
  title: string      // Pflichtfeld
  description?: string
  actions?: ReactNode
}

// Nutzung:
<SectionHeader title="Geschichte" />
<SectionHeader eyebrow="Fansub" title="Team & Mitglieder" />
// KEIN ad-hoc <h2>/<h3> mit Inline-Styles (UI-SPEC, CLAUDE.md)
```

### EmptyState-Primitive — alle Section-Komponenten (D-15)
**Quelle:** `frontend/src/components/ui/EmptyState.tsx`
**Gilt für:** Alle Section-Komponenten (Anker bleiben stabil, Abschnitt bleibt im DOM)

```typescript
// Interface (EmptyState.tsx Zeilen 7-13):
type EmptyStateVariant = 'default' | 'withAction' | 'compact'

// Phase 73 verwendet immer variant="compact" (keine Actions in read-only Seite):
<EmptyState
  variant="compact"
  title="[Pflicht-Text aus UI-SPEC Copywriting-Kontrakt]"
  description="[Pflicht-Text aus UI-SPEC Copywriting-Kontrakt]"
/>
```

### Badge-Primitive — FansubTeamSection, FansubContributorsSection
**Quelle:** `frontend/src/components/ui/Badge.tsx`

```typescript
// Verfügbare Varianten (Badge.tsx Zeile 6):
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

// D-09: Badge für unbestätigte historische Nennungen:
<Badge variant="muted">unbestätigt</Badge>

// D-08: Gedenken-Block — Badge variant="neutral" falls Label nötig
<Badge variant="neutral">In Erinnerung</Badge>
```

### Fehlerbehandlung — page.tsx
**Quelle:** `frontend/src/app/fansubs/[slug]/page.tsx` Zeilen 69–83
**Gilt für:** Alle try/catch-Blöcke in der Seiten-Root

```typescript
try {
  const groupResponse = await getFansubBySlug(slug)
  group = groupResponse.data
  // ...
} catch (error) {
  message =
    error instanceof ApiError && error.status === 404
      ? 'Fansubgruppe nicht gefunden.'
      : 'Fansub-Profil konnte nicht geladen werden.'
}

// Separate, non-blocking try/catch für optionale Daten:
if (group) {
  try {
    const contributionsResponse = await getFansubContributions(group.id)
    leaderTimeline = contributionsResponse.leader_timeline ?? []
  } catch {
    // Überspringen bei Fehler — keine Fehlerseite
  }
}
```

### CSS-Token-Konventionen — alle neuen .module.css-Dateien
**Quelle:** `frontend/src/app/fansubs/[slug]/page.module.css` + `frontend/src/components/fansubs/FansubProfileTabs.module.css`

```css
/* Farben (ui.module.css-Tokens, niemals Hex-Werte hardkodieren): */
var(--color-border)        /* Rahmenfarbe */
var(--color-white)         /* Hintergrund */
var(--color-primary)       /* Akzentfarbe, aktive Elemente */
var(--text-secondary)      /* Sekundärer Text */
var(--text-muted)          /* Gedämpfter Text (historisch, Empty State) */
var(--radius-md)           /* Mittlerer Rahmenradius */
var(--radius-lg)           /* Großer Rahmenradius (Hero) */

/* Typografie-Größen direkt (keine CSS-Custom-Properties für Schriftgrößen): */
font-size: 14px;  /* Label/sekundär */
font-size: 16px;  /* Body */
font-size: 18px;  /* Untergruppen-Überschrift (h3) */
font-size: 24px;  /* Gruppen-Titel im Hero */
```

### Deutsche Umlaute — alle user-facing Strings
**Quelle:** CLAUDE.md §Sprachqualität
**Gilt für:** Alle JSX-Textknoten, aria-labels, Titel, Platzhalter

Pflicht-Korrekturen beim Umbau von `FansubProfileTabs.tsx` (Zeile 146–150):
```typescript
// ALT (zu korrigieren):
<dt>Gruendung</dt>    // Zeile 148
<dt>Aufloesung</dt>   // Zeile 150

// NEU:
<dt>Gründung</dt>
<dt>Auflösung</dt>
```

---

## Kein direkter Analog gefunden

Folgende Muster haben keinen exakten Codebase-Analog — Planner soll RESEARCH.md-Patterns verwenden:

| Datei / Muster | Rolle | Data Flow | Begründung |
|----------------|-------|-----------|------------|
| `FansubSectionNav.module.css` (Sticky-Nav Desktop + Mobil-Chip-Leiste) | config (CSS) | event-driven | Kein bestehender IntersectionObserver-basierter Sticky-Nav im Projekt; Grundstruktur aus FansubProfileTabs.module.css `.tabRow` ableiten |
| Phase-72-Typen `DomainProjectionResponse`, `DomainMemberRow`, `DomainHistoricalRow`, `DomainContributorRow`, `MediaOwnershipRow` (neue `frontend/src/types/`) | model (TypeScript) | — | Neue Typen aus Phase 72; existieren erst nach Phase-72-Ausführung; Shape aus RESEARCH.md §Phase-72-Contract verwenden |
| Highlights-Kachel-Grid (CSS) | config (CSS) | — | Kein bestehender Highlights-Kachel-Abschnitt im Projekt; `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` per UI-SPEC |
| Medien-Grid mit 3 Ownership-Bereichen (CSS) | config (CSS) | — | Kein bestehender 3-Bereich-Medien-Grid; `repeat(auto-fit, minmax(220px, 1fr))` per UI-SPEC |

---

## Metadaten

**Durchsuchte Verzeichnisse:** `frontend/src/app/fansubs/`, `frontend/src/components/fansubs/`, `frontend/src/components/groups/`, `frontend/src/components/ui/`, `frontend/src/lib/`, `frontend/src/types/`, `frontend/src/app/anime/`
**Gelesene Quelldateien:** 18
**Pattern-Extraktion:** 2026-06-04
