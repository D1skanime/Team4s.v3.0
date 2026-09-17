# Phase 162: Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte und Navigation - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 12 (4 umgebaut, 3 neu/optional-neu, 5 additive Contract-Dateien)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `frontend/src/app/anime/[id]/page.tsx` (Zeilen 253-268, 269-278) | route (Server Component) | request-response | sich selbst (bestehende Datei, gleiche Struktur bleibt, nur `fansubRow`-Block entfernt + `searchParams.fansub` gelesen) | exact |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx` | component (Client, Zustandsbesitzer) | event-driven (User-Interaktion) + CRUD (Load-more-Request) | sich selbst (Umbau: `localStorage`-Block Zeilen 28-53, 146-183 raus; `history.pushState`/`popstate` rein) | exact |
| `frontend/src/components/fansubs/FansubGroupPicker.tsx` (NEU, empfohlen) | component (Client, reine Anzeige/Toggle) | event-driven | `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx` | exact (Chip-Toggle-Muster) |
| `frontend/src/components/fansubs/FansubGroupContext.tsx` (NEU, ersetzt `ActiveFansubStory.tsx`) | component (Client, reine Anzeige) | transform (Text/Link-Ableitung aus Props) | `frontend/src/components/fansubs/ActiveFansubStory.tsx` | exact (gleiche Rolle, wird inhaltlich umgebaut) |
| `frontend/src/lib/fansub-summary.ts` | utility | transform | sich selbst (nur `buildFansubStoryGroups` bleibt; `buildFansubFactSummary`/`buildFansubStoryPreview` ggf. löschen, siehe Open Question) | exact |
| `frontend/src/lib/fansubProjectRoutes.ts` | utility | transform (URL-Bau) | sich selbst (keine Änderung nötig, nur Konsum in `FansubGroupContext.tsx`) | exact |
| `frontend/src/types/fansub.ts` | type/model | — | sich selbst, additives Feld in `FansubGroupSummary` (Zeilen 49-58) | exact |
| `backend/internal/repository/fansub_repository.go` (`ListAnimeFansubs`, Zeile 1274) | repository | CRUD (SELECT) | `listPublicFansubStories` (Zeile 397, gleiche Datei) als Story-Filter-Vorlage | exact |
| `backend/internal/models/fansub.go` (`FansubGroupSummary`, Zeile 121) | model | — | sich selbst, additives Feld | exact |
| `shared/contracts/openapi.yaml` (`FansubGroupSummary`, Zeile 14132) | config (Contract) | — | sich selbst, additive Property | exact |
| `backend/internal/repository/fansub_repository_test.go` (neuer Testteil für `story_preview`) | test | — | **NICHT** `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` (Zeile 220, String-Match-Antimuster) — stattdessen `backend/internal/repository/anime_relations_admin_postgres_test.go` | role-match (anderes Testmuster als Nachbar-Datei) |
| `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` + `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx` (Rewrite) | test | — | sich selbst (bestehende Suite als Strukturvorlage für RTL-Assertions, Inhalt an neue URL-/Chip-Semantik anpassen) | exact |

## Pattern Assignments

### `frontend/src/app/anime/[id]/page.tsx` (route, request-response)

**Analog:** sich selbst — nur der zu entfernende Block und die neue Props-Übergabe ändern sich.

**Zu entfernender Block (D-13 Punkt 1), Zeilen 253-268:**
```tsx
{animeFansubsResponse && animeFansubsResponse.data.length > 0 && (
  <div className={styles.fansubRow}>
    {animeFansubsResponse.data.map((relation) =>
      relation.fansub_group ? (
        <Link
          key={relation.fansub_group.id}
          href={`/fansubs/${relation.fansub_group.slug}`}
          prefetch={false}
          className={styles.fansubChip}
        >
          {relation.fansub_group.name}
        </Link>
      ) : null,
    )}
  </div>
)}
```
→ vollständig entfernen. `page.module.css` verliert `.fansubRow`/`.fansubChip` (Zeilen 569-588).

**Bestehende Props-Übergabe an den Browser (bleibt strukturell erhalten, Zeilen 269-278), nur um `initialActiveSlug` aus `searchParams.fansub` (D-04) erweitern:**
```tsx
{groupedEpisodesResponse ? (
  <FansubVersionBrowser
    key={anime.id}
    animeID={anime.id}
    animeSlug={anime.slug}
    fansubs={animeFansubsResponse?.data ?? []}
    storyGroups={fansubStoryGroups}
    episodes={groupedEpisodesResponse.data.episodes}
    pagination={groupedEpisodesResponse.data.pagination}
  />
) : ...
```

**Bestehendes `searchParams`-Lesemuster (Zeilen 40-43, 72-83) — Vorbild für die additive `fansub`-Property:**
```tsx
interface AnimeDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string | string[]; grid_query?: string | string[] }>
}
...
const resolvedSearchParams = ((await searchParams) ?? {}) as {
  from?: string | string[]
  grid_query?: string | string[]
}
const rawGridQuery =
  typeof resolvedSearchParams.grid_query === 'string' ? resolvedSearchParams.grid_query : ''
const gridQuery = normalizeGridQuery(rawGridQuery)
```
→ Analoges Muster für `fansub`: `typeof resolvedSearchParams.fansub === 'string' ? resolvedSearchParams.fansub : undefined`, dann gegen `fansubOptions`-Slugs validieren (D-02: ungültig → `undefined`/„Alle"). Die Validierung selbst kann serverseitig in `page.tsx` (gegen `animeFansubsResponse?.data`) ODER client-seitig in `FansubVersionBrowser` erfolgen — Research empfiehlt client-seitig, da dort ohnehin `fansubOptions` bereits berechnet wird (siehe `FansubVersionBrowserContent`).

---

### `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (component, event-driven)

**Analog:** sich selbst — Umbau, kein neuer Analog nötig.

**Zu entfernen — kompletter localStorage-Mechanismus (D-01), Zeilen 28-53 (Persisted-State-Typen/-Parser) und 146-183 (Mount-Effekt + `selectFansubGroup`):**
```tsx
interface PersistedFilterState {
  activeFansubGroupId?: number | null
}
function getStorageKey(animeID: number): string {
  return `anime:${animeID}:fansub-filter`
}
function parseStoredSelection(raw: string | null, validIDs: number[], fallback: number | null): number | null {
  try {
    const candidate: unknown = raw ? (JSON.parse(raw) as PersistedFilterState | null)?.activeFansubGroupId : null
    return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0 && validIDs.includes(candidate)
      ? candidate : fallback
  } catch {
    return fallback
  }
}
```
```tsx
useEffect(() => {
  const ids = JSON.parse(selectionScope) as number[]
  const context = { scope: selectionScope, active: true, revision: 0 }
  selectionContext.current = context
  const key = getStorageKey(animeID)
  void Promise.resolve().then(() => {
    if (!context.active || context.revision !== 0) return
    let stored: string | null = null
    try { stored = window.localStorage.getItem(key) } catch { /* Storage can be unavailable. */ }
    setSelectedGroupID(parseStoredSelection(stored, ids, fallback))
  })
  const handleStorage = (event: StorageEvent) => { /* Multitab-Sync */ }
  window.addEventListener('storage', handleStorage)
  return () => { context.active = false; window.removeEventListener('storage', handleStorage) }
}, [animeID, selectionScope, fallback])

function selectFansubGroup(groupID: number) {
  const context = selectionContext.current
  if (!context?.active || context.scope !== selectionScope || !validIDs.includes(groupID)) return
  context.revision += 1
  setSelectedGroupID(groupID)
  try {
    window.localStorage.setItem(getStorageKey(animeID), JSON.stringify({ activeFansubGroupId: groupID }))
  } catch { /* Keep the current tab usable when persistence is blocked. */ }
  onActiveFansubChange?.(groupID)
}
```
→ ersetzt durch `window.history.pushState`/`popstate`-Mechanik (siehe unten, Quelle: RESEARCH.md „Pattern 1"/„Pattern 2", offiziell aus Next.js-16-Doku). `onActiveFansubChange`-Prop ist eine **tote Prop** (keine Aufrufstelle im Repo, siehe RESEARCH.md „Dead Prop") — beim Umbau ersatzlos entfernbar.

**Neuer URL-Sync-Mechanismus (Skizze aus RESEARCH.md Pattern 1+2, hier als konkrete Kopiervorlage):**
```tsx
'use client'
import { useSearchParams, usePathname } from 'next/navigation'

function pushFansubParam(pathname: string, currentParams: URLSearchParams, slug: string | null) {
  const params = new URLSearchParams(currentParams.toString()) // erhält from/grid_query (D-02)
  if (slug) params.set('fansub', slug)
  else params.delete('fansub')
  const query = params.toString()
  window.history.pushState(null, '', `${pathname}${query ? `?${query}` : ''}`)
}

useEffect(() => {
  function handlePopState() {
    const params = new URLSearchParams(window.location.search)
    setSelectedSlug(params.get('fansub'))
  }
  window.addEventListener('popstate', handlePopState)
  return () => window.removeEventListener('popstate', handlePopState)
}, [])
```
**Wichtig:** NICHT `router.push`/`router.replace` aus `next/navigation` verwenden (löst RSC-Refetch aus, verletzt D-03) — siehe RESEARCH.md „Pitfall 1". `useDebouncedSearch.ts` (`router.replace(..., {scroll:false})`, Zeile 204) ist bewusst **kein** Vorbild für diesen Mechanismus, weil `/suche` keine `searchParams`-Server-Props liest — die Anime-Detailseite dagegen schon (D-04).

**Bestehendes Chip-Rendering, das zu `FansubGroupPicker.tsx` extrahiert werden kann (Zeilen 243-261, native `<button>` MUSS durch `Button`-Primitive ersetzt werden — CLAUDE.md „Verboten: Handgebaute native `<button>`"):**
```tsx
<div className={styles.filterRow}>
  {fansubOptions.map((relation) => {
    if (!relation.fansub_group) return null
    const logoURL = resolveLogoUrl(relation.fansub_group.logo_url)
    const isActive = activeFansubGroupID === relation.fansub_group.id
    return (
      <button
        key={relation.fansub_group.id}
        type="button"
        className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
        onClick={() => selectFansubGroup(relation.fansub_group!.id)}
        aria-pressed={isActive}
      >
        {logoURL ? <Image src={logoURL} alt="" className={styles.logo} width={16} height={16} unoptimized /> : null}
        {relation.fansub_group.name}
      </button>
    )
  })}
</div>
```
→ Logo-Größe laut UI-SPEC auf `width={20} height={20}` erhöhen; `<button>` durch `<Button variant="ghost" size="sm" aria-pressed={isActive} onClick={...}>` ersetzen (siehe Chip-Analog unten).

**Zu ersetzen — CTA „Gruppenbereich" (D-13 Punkt 2, Zeilen 262-272):**
```tsx
{activeFansubGroupID !== null ? (
  <div className={styles.groupCtaRow}>
    <Link
      href={groupProjectHref}
      className={styles.groupButton}
      aria-label="Zum Gruppenbereich"
    >
      Gruppenbereich
    </Link>
  </div>
) : null}
```
→ ersetzt durch zwei getrennte `Button href=…`-Links „Zur Fansub-Gruppe" (`/fansubs/<slug>`) und „Zum Projekt" (`buildPublicFansubProjectPath`, kein Fallback laut D-12).

**Unverändert bleibende Filterlogik (D-09), Zeilen 99-114 und 280-284 — NICHT anfassen:**
```tsx
function getSummaryVersion(
  episode: PublicGroupedEpisode,
  activeFansubGroupID: number | null,
): PublicEpisodeVersion | null {
  if (episode.versions.length === 0) return null
  if (activeFansubGroupID === null) {
    if (episode.default_version_id) {
      const defaultVersion = episode.versions.find((item) => item.variant_id === episode.default_version_id)
      if (defaultVersion) return defaultVersion
    }
    return episode.versions[0]
  }
  const preferred = episode.versions.find((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
  return preferred || episode.versions[0]
}
```

**Bestehender Slug-Fallback, der laut D-12 für „Zum Projekt" NICHT mehr verwendet werden darf (Zeilen 142-144):**
```tsx
const groupProjectHref = animeSlug?.trim() && activeGroup?.slug?.trim()
  ? buildPublicFansubProjectPath(activeGroup.slug, animeSlug)
  : `/anime/${animeID}/group/${activeFansubGroupID}` // ← D-12: dieser Fallback entfällt für "Zum Projekt";
                                                       //   bei leerem Slug wird der Link gar nicht gerendert
```

---

### `frontend/src/components/fansubs/FansubGroupPicker.tsx` (NEU, component, event-driven)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx` (vollständig, 48 Zeilen) — vom UI-SPEC selbst als „closest analog" benannt (Punkt 1).

**Vollständiges Chip-Toggle-Muster (kopierfähig):**
```tsx
'use client'

import { Button } from '@/components/ui'

import styles from './FansubEdit.module.css'

export type CockpitFilter = 'all' | 'no-contributions' | 'no-note'

export type AnimeReleasesFilterBarProps = {
  activeFilter: CockpitFilter
  onFilterChange: (filter: CockpitFilter) => void
}

export function AnimeReleasesFilterBar({ activeFilter, onFilterChange }: AnimeReleasesFilterBarProps) {
  return (
    <div className={styles.chipRow}>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={activeFilter === 'all'}
        onClick={() => onFilterChange('all')}
        className={activeFilter === 'all' ? styles.filterChipActive : undefined}
      >
        Alle
      </Button>
      {/* weitere Chips analog */}
    </div>
  )
}
```
**Zugehöriges CSS-Muster (`FansubEdit.module.css` Zeilen 51-61):**
```css
.chipRow {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: center;
}
.filterChipActive {
  font-weight: 600;
  text-decoration: underline;
}
```
→ Für Phase 162 NICHT 1:1 übernehmen (UI-SPEC Punkt 3 verbietet die alte `!important`-Altlast NICHT hier, aber verlangt eigenes Token-Set + `border-radius: 999px` + Attributselektor `[aria-pressed="true"]` statt reiner Klasse — siehe UI-SPEC „Eigenständig getroffene Design-Entscheidungen" Punkt 2-5). Das Muster liefert nur die **Struktur** (Button+aria-pressed+className-Ternary), nicht die konkreten Farbwerte.

**`Button`-Primitive-Kontrakt (`frontend/src/components/ui/Button.tsx`, Zeilen 8-34), relevant für `href`-Variante der Navigationsziele:**
```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text'
type ButtonSize = 'sm' | 'md' | 'lg'
...
type LinkButtonProps = CommonButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
export type ButtonProps = NativeButtonProps | LinkButtonProps
```
→ `Button` rendert bei gesetztem `href` ein echtes `<a>` (Zeilen 90-102 in `Button.tsx`) — erfüllt UI-SPEC-Vorgabe „echte `<a href>` (via `Button href=…`)" ohne zusätzlichen `next/link`-Import.

**Chip-Gruppen-Wrapper (`role="group"`, D-Entscheidung UI-SPEC Punkt 10 — kein direkter Analog im Repo, neu zu schreiben):**
```tsx
<div role="group" aria-label="Fansub-Gruppe">
  {/* Chips */}
</div>
```

---

### `frontend/src/components/fansubs/FansubGroupContext.tsx` (NEU, ersetzt `ActiveFansubStory.tsx`, component, transform)

**Analog:** `frontend/src/components/fansubs/ActiveFansubStory.tsx` (vollständig, 29 Zeilen).

**Heutige vollständige Komponente (Struktur bleibt, Inhalt ändert sich radikal):**
```tsx
'use client'

import Link from 'next/link'

import { FansubGroupSummary } from '@/types/fansub'
import { buildFansubStoryPreview } from '@/lib/fansub-summary'

import styles from './ActiveFansubStory.module.css'

interface ActiveFansubStoryProps {
  activeFansubGroupID: number | null
  groups: FansubGroupSummary[]
}

export function ActiveFansubStory({ activeFansubGroupID, groups }: ActiveFansubStoryProps) {
  const activeGroup = groups.find((group) => group.id === activeFansubGroupID)
  if (!activeGroup) return null

  const preview = buildFansubStoryPreview(activeGroup)

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>
        <Link href={`/fansubs/${activeGroup.slug}`} prefetch={false}>{activeGroup.name}</Link>
      </h3>
      <p className={styles.text}>{preview}</p>
    </article>
  )
}
```
**Was übernommen wird:** die `if (!activeGroup) return null`-Frühausstiegs-Struktur, den `<article>`-Karten-Wrapper.
**Was sich ändert (D-13 Punkt 4, D-05, D-07, D-08, D-11, D-12):**
- `<h3><Link>{name}</Link></h3>` → `<h3>{name}</h3>` (Überschrift OHNE Link).
- `buildFansubStoryPreview` (Faktenzeile) entfällt vollständig — stattdessen `activeGroup.story_preview` (neues additives Feld) mit `line-clamp: 3` rendern, nur wenn vorhanden; „Mehr lesen →" zu `/fansubs/<slug>#geschichte` nur wenn `story_preview` vorhanden.
- Zwei neue `Button href=…`-Elemente „Zur Fansub-Gruppe" (`/fansubs/<slug>`) und „Zum Projekt" (`buildPublicFansubProjectPath`, kein Fallback bei leerem Slug).

**Zugehöriges CSS (`ActiveFansubStory.module.css`, vollständig, 30 Zeilen) — Startpunkt, Tokens laut UI-SPEC auf `--surface-card`/`--border-subtle`/`--text-primary`/`--text-muted` umstellen statt `--color-border`/`--color-white`/`--text-secondary`:**
```css
.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 14px 16px;
  margin-bottom: 14px;
}
.title { margin: 0 0 8px; font-size: 16px; }
.title a { color: var(--color-text-primary); text-decoration: none; }
.title a:hover { color: var(--color-primary); }
.text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-line;
}
```

**Anker-Ziel für „Mehr lesen →" (`FansubStorySection.tsx` Zeile 100, bereits vorhanden, nur verlinkt, nicht verändert):**
```tsx
<section id="geschichte">
```

---

### `frontend/src/lib/fansub-summary.ts` (utility, transform)

**Analog:** sich selbst — nur `buildFansubStoryGroups` (Zeilen 53-66) bleibt unverändert und wird weiterhin in `page.tsx` (Zeile 24, 97) verwendet:
```ts
export function buildFansubStoryGroups(relations: AnimeFansubRelation[]): FansubGroupSummary[] {
  const seen = new Set<number>()
  const groups: FansubGroupSummary[] = []
  for (const relation of relations) {
    const group = relation.fansub_group
    if (!group) continue
    if (seen.has(group.id)) continue
    seen.add(group.id)
    groups.push(group)
  }
  return groups
}
```
`buildFansubFactSummary`/`buildFansubStoryPreview` (Zeilen 15-46) entfallen laut D-07 **für diese Seite** — vor dem Löschen `grep -rn "buildFansubFactSummary\|buildFansubStoryPreview" frontend/src` ausführen (Open Question 1 aus RESEARCH.md); nur löschen, wenn kein anderer Konsument existiert.

---

### `backend/internal/repository/fansub_repository.go` — `ListAnimeFansubs` (repository, CRUD)

**Analog (Story-Filter-Semantik zu übernehmen):** `listPublicFansubStories` (Zeilen 397-429, gleiche Datei):
```go
func (r *FansubRepository) listPublicFansubStories(ctx context.Context, groupID int64) ([]models.PublicFansubStory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, body_html, body_text, COALESCE(updated_at, created_at)::text
		FROM fansub_group_notes
		WHERE fansub_group_id = $1
		  AND visibility = 'public'
		  AND status = 'published'
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, id ASC
	`, groupID)
	...
}
```

**Analog (zu erweiternde Query):** `ListAnimeFansubs` (Zeilen 1274-1329):
```go
func (r *FansubRepository) ListAnimeFansubs(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubRelation, error) {
	...
	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1
		ORDER BY afg.is_primary DESC, fg.name ASC
	`, animeID)
	...
	for rows.Next() {
		var item models.AnimeFansubRelation
		var group models.FansubGroupSummary
		if err := rows.Scan(
			&item.AnimeID, &item.FansubGroupID, &item.IsPrimary, &item.Notes, &item.CreatedAt,
			&group.ID, &group.Slug, &group.Name, &group.LogoURL,
			&group.FoundedYear, &group.DissolvedYear, &group.Country, &group.Status,
		); err != nil { ... }
		item.FansubGroup = &group
		items = append(items, item)
	}
	...
}
```
**Additive Erweiterung (aus RESEARCH.md „Pattern 3", direkt kopierbar als SQL-Grundlage):**
```sql
SELECT
    afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
    fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status,
    story.body_text
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
LEFT JOIN LATERAL (
    SELECT n.body_text
    FROM fansub_group_notes n
    WHERE n.fansub_group_id = fg.id
      AND n.visibility = 'public'
      AND n.status = 'published'
      AND n.deleted_at IS NULL
    ORDER BY n.sort_order ASC, n.id ASC
    LIMIT 1
) story ON true
WHERE afg.anime_id = $1
ORDER BY afg.is_primary DESC, fg.name ASC
```
`story.body_text` als `*string` scannen (NULL-fähig), dann rune-sicher kürzen (`[]rune(bodyText)`, siehe RESEARCH.md „Pitfall 2" — Byte-Slicing würde Umlaute zerschneiden) und in `models.FansubGroupSummary.StoryPreview` schreiben.

---

### `backend/internal/models/fansub.go` — `FansubGroupSummary` (model)

**Analog:** sich selbst, additives Feld nach bestehendem Muster (Zeilen 121-130):
```go
// FansubGroupSummary ist eine kompakte Kurzform einer Fansub-Gruppe.
type FansubGroupSummary struct {
	ID            int64   `json:"id"`
	Slug          string  `json:"slug"`
	Name          string  `json:"name"`
	LogoURL       *string `json:"logo_url,omitempty"`
	FoundedYear   *int32  `json:"founded_year,omitempty"`
	DissolvedYear *int32  `json:"dissolved_year,omitempty"`
	Country       *string `json:"country,omitempty"`
	Status        string  `json:"status,omitempty"`
}
```
→ neues Feld additiv anhängen, z. B. `StoryPreview *string `json:"story_preview,omitempty"``.

---

### `shared/contracts/openapi.yaml` — `FansubGroupSummary`-Schema (config)

**Analog:** sich selbst (Zeilen 14132-14148):
```yaml
    FansubGroupSummary:
      type: object
      required:
        - id
        - slug
        - name
      properties:
        id:
          type: integer
          format: int64
        slug:
          type: string
        name:
          type: string
        logo_url:
          type: string
          nullable: true
```
→ additive Property `story_preview: { type: string, nullable: true }` anhängen, NICHT `required`.
**Wichtiger Fund (RESEARCH.md „Open Questions" Punkt 3):** Dieses OpenAPI-Schema hat bereits eine bestehende Drift zum Go-Model/TS-Typ (fehlende `founded_year`/`dissolved_year`/`country`/`status`-Properties, obwohl beide Consumer-Seiten sie längst haben) — laut Research-Empfehlung **NICHT** im selben Zug mitkorrigieren (außerhalb des Phasen-Scopes), nur `story_preview` additiv ergänzen.

---

### `frontend/src/types/fansub.ts` — `FansubGroupSummary` (type)

**Analog:** sich selbst (Zeilen 49-58):
```ts
export interface FansubGroupSummary {
  id: number;
  slug: string;
  name: string;
  logo_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  country?: string | null;
  status?: FansubStatus;
}
```
→ additiv `story_preview?: string | null;` anhängen. **Pitfall (RESEARCH.md „Pitfall 3"):** Dieses Interface wird auch von `PublicEpisodeVersion.fansub_groups[]` und `FansubProjectResolution` konsumiert — dort bleibt das Feld schlicht ungesetzt, NICHT als „garantiert vorhanden" interpretieren.

---

### Backend-Test (Postgres-Integrationstest für `story_preview`)

**NICHT-Analog (explizit verbotenes Altmuster, CLAUDE.md-Teststil-Regel):** `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` in `backend/internal/repository/fansub_repository_test.go` (Zeile 220):
```go
func TestListAnimeFansubs_SummaryIncludesFansubStoryFacts(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	...
	for _, fragment := range []string{
		"fg.founded_year, fg.dissolved_year, fg.country, fg.status",
		"&group.FoundedYear",
		...
	} {
		if !strings.Contains(body, fragment) { ... }
	}
}
```
→ Dieser bestehende Test darf **unverändert** bleiben (pinnt weiterhin unveränderte Spalten), darf aber **nicht** als Vorlage für den neuen `story_preview`-Teil dienen.

**Zu verwendender Analog (echter Postgres-Integrationstest):** `backend/internal/repository/anime_relations_admin_postgres_test.go` (vollständige Struktur, Zeilen 1-53 Setup + Zeilen 87-145 Testkörper):
```go
const animeRelationsDSNEnv = "TEAM4S_RELATIONS_TEST_DSN"

var animeRelationsDatabasePattern = regexp.MustCompile(`^team4s_relations_test(?:_[a-z0-9]+)?$`)

func openAnimeRelationsPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(animeRelationsDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping anime relations Postgres test", animeRelationsDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", animeRelationsDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, animeRelationsDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", animeRelationsDSNEnv, dbName, animeRelationsDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", animeRelationsDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}

func seedAnimeRelationsFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = ANY($1)`, []int64{...})
	}
	cleanup()
	t.Cleanup(cleanup)
	_, err := pool.Exec(ctx, `INSERT INTO ... ON CONFLICT (...) DO NOTHING;`)
	require.NoError(t, err, "seed ...")
	...
}

func TestAdminAnimeRelations_AniSearchSideStoryPersistsWithoutDuplicatesOrSideEffects(t *testing.T) {
	pool := openAnimeRelationsPostgres(t)
	seedAnimeRelationsFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)
	// ... echte Repository-Methode aufrufen, echte Response-Assertions gegen require.Equal
}
```
→ Für Phase 162: neuer env-DSN (z. B. `TEAM4S_FANSUB_TEST_DSN`), eigener Datenbanknamens-Regex-Guard, Fixture (Anime + `anime_fansub_groups` + `fansub_group_notes` inkl. Umlaut-Text für den Rune-Kürzungstest), echter Aufruf von `ListAnimeFansubs`, Assertion gegen `StoryPreview` (inkl. `nil` bei fehlender Story, inkl. korrekt gekürztem Umlaut-Text).

---

### Frontend-Tests (Rewrite von `FansubVersionBrowser.test.tsx` + `__tests__/ActiveFansubStory.test.tsx`)

**Analog:** die bestehenden Dateien selbst — Struktur (Setup mit `vi.mock('@/lib/api', ...)`, `beforeEach`/`afterEach` mit `cleanup()`, `render()`+`fireEvent.click()`+`screen.getByRole()`) bleibt, aber:
- Alle `localStorage`/`StorageEvent`-Tests (Zeilen 91-177 in `FansubVersionBrowser.test.tsx`) entfallen (D-01) — ersetzt durch `window.history.pushState`-Spy + simuliertes `PopStateEvent` (RESEARCH.md „Wave-0-Lücken").
- `screen.getByRole('link', { name: 'Zum Gruppenbereich' })` (Zeilen 31, 33, 38, 43, 48, 53) wird zu zwei getrennten Assertions für „Zur Fansub-Gruppe" und „Zum Projekt".
- `ActiveFansubStory.test.tsx` (komplett, 31 Zeilen) — Assertion `expect(screen.getByText('gegründet 2008 • Schweiz • aktiv')).not.toBeNull()` (Zeile 28) entfällt vollständig (D-07); neue Assertions für `story_preview`-Text/„Mehr lesen →"/fehlende Story.

**Bestehendes Assertion-Muster für aktiven Chip (Zeile 86 in `FansubVersionBrowser.test.tsx`, weiter gültig):**
```tsx
expect(screen.getByRole('button', { name: selected.name }).getAttribute('aria-pressed')).toBe('true')
```

## Shared Patterns

### Chip-Toggle (Button-Primitive statt natives `<button>`)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx` (Zeilen 17-25), `frontend/src/components/ui/Button.tsx` (Zeilen 8-34, 90-116)
**Apply to:** `FansubGroupPicker.tsx` (neu), Umbau des `filterRow`-Blocks in `FansubVersionBrowser.tsx`
```tsx
<Button
  variant="ghost"
  size="sm"
  aria-pressed={isActive}
  onClick={() => selectFansubGroup(id)}
  className={isActive ? styles.chipActive : undefined}
>
  {name}
</Button>
```

### URL-State ohne Server-Refetch (native History API)
**Source:** RESEARCH.md „Pattern 1"/„Pattern 2" (offizielle Next.js-16-Doku), NICHT `frontend/src/app/suche/useDebouncedSearch.ts`
**Apply to:** `FansubVersionBrowser.tsx` (Chip-Klick, Zurück/Vor)
```tsx
window.history.pushState(null, '', `${pathname}${query ? `?${query}` : ''}`)
// popstate-Listener liest window.location.search direkt, nicht useSearchParams()
```

### Navigationsziele als echte Links
**Source:** `frontend/src/components/ui/Button.tsx` (Zeilen 90-102, `href`-Variante rendert `<a>`)
**Apply to:** „Zur Fansub-Gruppe"/„Zum Projekt" in `FansubGroupContext.tsx`
```tsx
<Button href={`/fansubs/${slug}`} variant="secondary" size="sm">Zur Fansub-Gruppe</Button>
{groupProjectPath ? <Button href={groupProjectPath} variant="secondary" size="sm">Zum Projekt</Button> : null}
```

### LATERAL-Join für gebündelte 1:1-Nebendaten (kein N+1)
**Source:** `backend/internal/repository/fansub_repository.go` `listPublicFansubStories` (Zeilen 397-429) als Filter-Vorlage, RESEARCH.md „Pattern 3" als fertige SQL-Erweiterung
**Apply to:** `ListAnimeFansubs`

### Rune-sichere String-Kürzung (kein Byte-Cut)
**Source:** kein bestehender Analog im Repo (RESEARCH.md: „Grep ergab: keine existiert, muss neu geschrieben werden") — als neue kleine Utility-Funktion in `fansub_repository.go` oder `backend/internal/models/fansub.go` implementieren: `[]rune(bodyText)[:limit]`, nicht `bodyText[:limit]`.
**Apply to:** `story.body_text` → `FansubGroupSummary.StoryPreview`

### Postgres-Integrationstest (env-DSN-gated, Datenbanknamens-Guard)
**Source:** `backend/internal/repository/anime_relations_admin_postgres_test.go` (vollständig)
**Apply to:** neuer Testteil für die `ListAnimeFansubs`-LATERAL-Join-Erweiterung — NICHT das `os.ReadFile`+`strings.Contains`-Muster aus `fansub_repository_test.go` Zeile 220 fortführen.

## No Analog Found

Keine Datei ohne Analog — alle 12 klassifizierten Dateien haben einen konkreten Vorbild-Fund (entweder sich selbst als Umbau-Basis oder eine fremde Repo-Datei).

## Metadata

**Analog search scope:** `frontend/src/components/fansubs/`, `frontend/src/app/anime/[id]/`, `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/components/ui/`, `frontend/src/lib/`, `frontend/src/types/`, `backend/internal/repository/`, `backend/internal/models/`, `shared/contracts/openapi.yaml`
**Files scanned:** 18 (direkt gelesen) + Research-Fundstellen aus `162-RESEARCH.md`
**Pattern extraction date:** 2026-09-17
