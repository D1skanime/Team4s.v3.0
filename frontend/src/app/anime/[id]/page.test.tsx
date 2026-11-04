import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Children, isValidElement, Suspense, type ReactElement, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AnimeInfoBanner } from '@/components/anime/AnimeMediaProvider'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Button, Card, ErrorState, LinkChip, MediaFrame, SplitLayout, Text } from '@/components/ui'
import AnimeListPage from '../page'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(), cache: <T,>(fn: T): T => fn,
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') } }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => ({ value: 'server-session-test' }) })) }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeList: vi.fn(), getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  getAnimeRelations: vi.fn(), getWatchlistEntry: vi.fn(),
}))

import { ApiError, getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeRelations, getWatchlistEntry } from '@/lib/api'
import type { PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import type { AnimeDetail } from '@/types/anime'
import AnimeDetailPage, { generateMetadata } from './page'
import { AnimeDetailHero } from './AnimeDetailHero'
import { AnimeEpisodesSection } from './AnimeEpisodesSection'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

const anime: AnimeDetail = {
  id: 22, slug: 'stored-slug', title: 'Tatsächlicher Anime', type: 'tv',
  content_type: 'anime', status: 'done', view_count: 0, episodes: [],
}
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAnimeByID).mockReset().mockResolvedValue({ data: anime })
  vi.mocked(getAnimeFansubs).mockReset().mockResolvedValue({ data: [] })
  groupedMock.mockReset().mockResolvedValue({ data: { anime_id: anime.id, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
  vi.mocked(getAnimeRelations).mockReset().mockResolvedValue({ data: [] })
})

describe('anime detail page and metadata', () => {
  it('uses the resource title and numeric canonical without the grid query', async () => {
    const metadata = await generateMetadata({
      ...paramsFor('00022'), searchParams: Promise.resolve({ from: 'grid', grid_query: 'page=2&q=other' }),
    })
    expect(metadata.title).toBe('Tatsächlicher Anime | Team4s')
    expect(metadata.alternates?.canonical).toBe('/anime/22')
  })

  it.each(['1abc', '1.5', '0', '-1', '9007199254740992'])('rejects %s in both resource consumers', async (id) => {
    await expect(AnimeDetailPage(paramsFor(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(paramsFor(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(getAnimeByID).not.toHaveBeenCalled()
    expect(getAnimeFansubs).not.toHaveBeenCalled()
    expect(getGroupedEpisodes).not.toHaveBeenCalled()
    expect(getAnimeRelations).not.toHaveBeenCalled()
  })

  it('uses Next notFound for missing anime and metadata, which supplies robots noindex', async () => {
    vi.mocked(getAnimeByID).mockRejectedValue(new ApiError(404, 'Fehlt'))
    await expect(AnimeDetailPage(paramsFor('987'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(paramsFor('987'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(getAnimeFansubs).not.toHaveBeenCalled()
  })

  it.each([new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler')])(
    'does not relabel technical failures as missing content (%s)', async (error) => {
      vi.mocked(getAnimeByID).mockRejectedValue(error)
      await expect(AnimeDetailPage(paramsFor('22'))).rejects.toBe(error)
      await expect(generateMetadata(paramsFor('22'))).rejects.toBe(error)
    },
  )
})

describe('loading boundaries follow resource validation', () => {
  it('does not inherit an automatic loading boundary on the anime detail route', () => {
    expect(existsSync(join(process.cwd(), 'src/app/anime/loading.tsx'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'src/app/anime/[id]/loading.tsx'))).toBe(false)
  })

  it('keeps the list loading UI in an explicit list-only Suspense', async () => {
    const page = await AnimeListPage({ searchParams: undefined })
    expect(page.type).toBe(Suspense)
    expect(page.props.fallback.type.name).toBe('AnimeListLoading')
  })

  it('validates the anime before returning its content boundary or starting secondary reads', async () => {
    const page = await AnimeDetailPage(paramsFor('22'))
    expect(getAnimeByID).toHaveBeenCalledWith(22)
    expect(page.type).toBe(Suspense)
    expect(page.props.fallback.type.name).toBe('AnimeDetailLoading')
    expect(getAnimeFansubs).not.toHaveBeenCalled()
    expect(getGroupedEpisodes).not.toHaveBeenCalled()
    expect(getAnimeRelations).not.toHaveBeenCalled()
  })
})

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    // SplitLayout reicht firstColumn/secondColumn als benannte PROPS durch, nicht als
    // `children` -- ohne diesen Zweig würde der Standard-Zweig (`child.props.children`) nichts
    // innerhalb eines noch nicht materialisierten SplitLayout-Elements finden (Befund 21: der
    // Anime-Kopf nistet Poster-/Info-Karte seit diesem Baustein-Umbau in SplitLayout statt
    // direkt im Hero-Grid).
    if (child.type === AnimeDetailHero || child.type === AnimeEpisodesSection || child.type === SplitLayout) {
      const component = child.type as (props: Record<string, unknown>) => ReactNode
      return [child, ...elements(component(child.props))]
    }
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) =>
    isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child),
  ).join('')
}
/** Der Episoden-Badge hängt als `bottomBadge`-PROP an `MediaFrame`, nicht als eigenes
 *  `.props.children` -- `elements()`/`textContent()` laufen nur über materialisierte Children,
 *  nicht über beliebig benannte Props. Diese Hilfsfunktion findet `MediaFrame` zuerst und liest
 *  dessen `bottomBadge`-Prop gezielt aus (selbst wieder ein noch nicht gerendertes React-Element,
 *  `textContent` kann direkt darauf angewendet werden). */
function posterBadgeText(content: ReactNode): string | null {
  const frame = elements(content).find((item) => item.type === MediaFrame)
  const badge = frame?.props.bottomBadge as ReactNode | null | undefined
  return badge ? textContent(badge) : null
}

async function loadContent(id = '22') {
  const boundary = await AnimeDetailPage(paramsFor(id))
  const contentElement = (await boundary.props.children.type(boundary.props.children.props)) as ReactElement<
    Record<string, unknown>
  >
  // `AnimeDetailContent` liefert seit dem Server/Ansicht-Split (261102-cb2) nur noch ein einzelnes
  // <AnimeDetailView ... />-Element statt des vollen verschachtelten JSX-Baums direkt. `elements()`
  // läuft nur über bereits materialisierte `.props.children`, nicht über Komponentenfunktionen --
  // deshalb wird `AnimeDetailView` hier einmal synchron aufgerufen, um denselben verschachtelten
  // Baum wie vor dem Split für die bestehenden Struktur-Assertions bereitzustellen.
  return (contentElement.type as (props: Record<string, unknown>) => ReactNode)(contentElement.props) as ReactNode
}

describe('anime detail integration without invented data', () => {
  it('keeps public SSR free from viewer cookies and watchlist status reads', async () => {
    const content = await loadContent()
    expect(cookies).not.toHaveBeenCalled()
    expect(getWatchlistEntry).not.toHaveBeenCalled()
    const button = elements(content).find((item) => item.type === WatchlistAddButton)
    expect(button?.props.animeID).toBe(22)
    expect(button?.props).not.toHaveProperty('initiallyInWatchlist')
  })

  it('passes the stored anime slug without an additional anime read', async () => {
    const content = await loadContent()
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.animeSlug).toBe('stored-slug')
    expect(getAnimeByID).toHaveBeenCalledTimes(1)
    expect(getAnimeFansubs).toHaveBeenCalledTimes(1)
  })

  it('removes the fabricated rating and anime view metrics while preserving the Anime 22 Emby target', async () => {
    const content = await loadContent()
    expect(textContent(content)).not.toMatch(/7\.8|Views/)
    const embyLink = elements(content).find((item) => item.type === Button && textContent(item.props.children as ReactNode).includes('Emby'))
    expect(embyLink?.props.href).toBe('https://anime.team4s.de/web/index.html#!/item?id=2112&serverId=8bc8ae6fe2d946fcbd21cb341832072d&context=tvshows')
  })

  it('does not leave an empty stats row for an anime without an Emby mapping', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, id: 23 } })
    const content = await loadContent('23')
    expect(elements(content).some((item) => String(item.props.className).includes('statsRow'))).toBe(false)
    expect(textContent(content)).not.toContain('Emby')
  })

  it('rendert bei fehlgeschlagenem Public-Fetch einen neutralen Fehlerhinweis statt der ungefilterten anime.episodes-Notfallliste (D-16)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, max_episodes: 12, episodes: [{
      id: 73, episode_number: '1', title: 'Neutrale Folge', status: 'public', view_count: 3, download_count: 8,
    }] } })
    groupedMock.mockRejectedValue(new ApiError(500, 'Versionen nicht verfügbar'))
    const content = await loadContent()
    // Der Episoden-Badge auf dem Poster (Badge variant="onMedia", 261102-hlg) ist unabhaengig
    // vom D-16-Bug und bleibt unveraendert -- deutsche Pluralisierung "Folgen" statt "Episodes".
    expect(posterBadgeText(content)).toBe('12 Folgen')
    // D-16: die alte Notfall-Liste (anime.episodes, ungefiltert nach Release) darf nicht mehr rendern.
    expect(elements(content).some((item) => item.type === FansubVersionBrowser)).toBe(false)
    // Seit 261102-hlg Task 7 rendert dieser Zweig ueber die offizielle ErrorState-Primitive --
    // title/description sind PROPS, keine materialisierten Children, deshalb Props-Prüfung
    // statt textContent() (das nur ueber `.props.children` laeuft).
    const errorState = elements(content).find((item) => item.type === ErrorState)
    expect(errorState?.props.title).toBe('Episoden konnten nicht geladen werden')
    expect(errorState?.props.description).toBe('Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite neu.')
    expect(errorState?.props.compact).toBe(true)
  })

  it('zeigt die Einzahl "1 Folge" statt "1 Folgen" (261102-hlg D-03)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, max_episodes: 1 } })
    const content = await loadContent()
    expect(posterBadgeText(content)).toBe('1 Folge')
  })

  it.each([0, undefined])('blendet das Episoden-Badge bei max_episodes=%s komplett aus (261102-hlg D-03)', async (maxEpisodes) => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, max_episodes: maxEpisodes } })
    const content = await loadContent()
    expect(posterBadgeText(content)).toBeNull()
  })

  it('clips only the decorative banner backdrop, leaving the hero controls outside its clipping boundary', () => {
    const bannerCss = readFileSync(join(process.cwd(), 'src/components/ui/BannerSection.module.css'), 'utf8')
    const pageCss = readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.module.css'), 'utf8')
    const cardCss = readFileSync(join(process.cwd(), 'src/components/ui/Card.module.css'), 'utf8')
    expect(bannerCss.match(/\.bannerSection\s*\{([^}]+)\}/)?.[1]).toMatch(/overflow:\s*(hidden|clip)/)
    expect(cardCss.match(/\.cardPublicHero\s*\{([^}]+)\}/)?.[1]).toMatch(/overflow:\s*visible/)
    expect(pageCss.match(/\.page\s*\{([^}]+)\}/)?.[1]).not.toMatch(/overflow/)
  })

  it('nutzt den eigenständigen Detail-Breitenvertrag (1200px/120px), nicht den allgemeinen --public-page-max-width der übrigen öffentlichen Flächen', () => {
    const pageCss = readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.module.css'), 'utf8')
    const wrapperRule = pageCss.match(/\.errorPage,\s*\n\.breadcrumbsWrapper,\s*\n\.heroWrapper,\s*\n\.contentArea\s*\{([^}]+)\}/)?.[1]
    expect(wrapperRule).toMatch(/--public-page-detail-max-width/)
    expect(wrapperRule).toMatch(/--public-page-detail-gutter/)
    expect(wrapperRule).not.toMatch(/--public-page-max-width\b/)

    const desktopHeroRule = pageCss.slice(0, pageCss.indexOf('@media')).match(/\.heroWrapper\s*\{([^}]+)\}/)?.[1]
    expect(desktopHeroRule).toMatch(/--public-page-detail-hero-offset-top/)

    const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens/layout.css'), 'utf8')
    expect(tokensCss).toMatch(/--public-page-detail-max-width:\s*1200px;/)
    expect(tokensCss).toMatch(/--public-page-detail-hero-offset-top:\s*120px;/)
  })

  it('gibt den Trennlinien (<hr>) eine vollständige tokenbasierte Optik statt des UA-Standardrahmens', () => {
    // Beide Dividers leben seit Befund 21/22 im alleinigen CSS-Modul des Anime-Kopf-Bausteins
    // (AnimeDetailHero.module.css), nicht mehr in zwei getrennten Seiten-CSS-Dateien.
    const heroCss = readFileSync(join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.module.css'), 'utf8')

    const posterDividerRule = heroCss.match(/\.posterDivider\s*\{([^}]+)\}/)?.[1]
    expect(posterDividerRule, '.posterDivider must exist').toBeTruthy()
    expect(posterDividerRule).toMatch(/border:\s*none;/)
    expect(posterDividerRule).toMatch(/background:\s*var\(--border-on-media\);/)

    const dividerRule = heroCss.match(/\.divider\s*\{([^}]+)\}/)?.[1]
    expect(dividerRule, '.divider must exist').toBeTruthy()
    expect(dividerRule).toMatch(/border:\s*none;/)
    expect(dividerRule).toMatch(/background:\s*var\(--border-on-media-strong\);/)

    // Unterhalb 767px wird .divider (nicht .posterDivider, der dort komplett ausgeblendet
    // bleibt) auf dieselbe schwächere Linienfarbe wie main zurückgenommen.
    const mobileBlock = heroCss.slice(heroCss.indexOf('@media (max-width: 767px)'))
    expect(mobileBlock.match(/\.divider\s*\{([^}]+)\}/)?.[1]).toMatch(/background:\s*var\(--border-on-media\);/)
  })

  it('hält den Randnavigations-Overlay-Container nahe am oberen Hero-Rand statt vertikal über die ganze (ggf. sehr hohe) Hero-Karte zu zentrieren', () => {
    // .edgeNavigationOverlay lebt seit Befund 21/22 ebenfalls im alleinigen CSS-Modul des
    // Anime-Kopf-Bausteins, nicht mehr in der Seiten-eigenen page.infoCard.module.css.
    const heroCss = readFileSync(join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.module.css'), 'utf8')

    const desktopRule = heroCss.slice(0, heroCss.indexOf('@media (max-width: 767px)')).match(/\.edgeNavigationOverlay\s*\{([^}]+)\}/)?.[1]
    expect(desktopRule, '.edgeNavigationOverlay must exist').toBeTruthy()
    expect(desktopRule).toMatch(/top:\s*var\(--space-3\);/)
    // Eine explizite Button-Höhe statt unbegrenzter Höhe verhindert, dass AdjacentNavigations
    // eigenes top:0 (bzw. eine künftige 50%-Formel) irgendwo mitten im Beschreibungstext landet,
    // sobald die Info-Spalte durch lange Beschreibungen deutlich höher als die Poster-Spalte wird
    // (UAT-Regressionsfund: Buttons lagen über dem Fließtext).
    expect(desktopRule).toMatch(/height:\s*var\(--control-height-md\);/)

    const mobileRule = heroCss.slice(heroCss.indexOf('@media (max-width: 767px)')).match(/\.edgeNavigationOverlay\s*\{([^}]+)\}/)?.[1]
    expect(mobileRule).toMatch(/inset:\s*auto;/)
    expect(mobileRule).toMatch(/height:\s*auto;/)
  })

  it('reicht searchParams.fansub unveraendert als initialActiveSlug an FansubVersionBrowser durch (D-04)', async () => {
    const boundary = await AnimeDetailPage({
      ...paramsFor('22'), searchParams: Promise.resolve({ fansub: 'bloody-shadow' }),
    })
    const contentElement = (await boundary.props.children.type(boundary.props.children.props)) as ReactElement<
      Record<string, unknown>
    >
    const content = (contentElement.type as (props: Record<string, unknown>) => ReactNode)(contentElement.props) as ReactNode
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.initialActiveSlug).toBe('bloody-shadow')
  })

  it('laesst initialActiveSlug undefined, wenn kein fansub-Query-Parameter vorhanden ist', async () => {
    const content = await loadContent()
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.initialActiveSlug).toBeUndefined()
  })

  it('D-11: reicht den ueber die Fansub-Relationen aufgeloesten Slug in die SSR-Episodenabfrage durch', async () => {
    vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [
      { anime_id: 22, fansub_group_id: 1, is_primary: true, created_at: '', fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } },
      { anime_id: 22, fansub_group_id: 2, is_primary: false, created_at: '', fansub_group: { id: 2, slug: 'beta-subs', name: 'Beta-Subs' } },
    ] })
    const boundary = await AnimeDetailPage({
      ...paramsFor('22'), searchParams: Promise.resolve({ fansub: 'beta-subs' }),
    })
    await (boundary.props.children.type(boundary.props.children.props) as Promise<ReactNode>)
    expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, { projection: 'public', limit: 24, fansub: 'beta-subs' })
  })

  it('D-05/D-11: eine fremde/unbekannte Fansub-Slug wird NICHT an die SSR-Episodenabfrage weitergereicht', async () => {
    vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [
      { anime_id: 22, fansub_group_id: 1, is_primary: true, created_at: '', fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } },
      { anime_id: 22, fansub_group_id: 2, is_primary: false, created_at: '', fansub_group: { id: 2, slug: 'beta-subs', name: 'Beta-Subs' } },
    ] })
    const boundary = await AnimeDetailPage({
      ...paramsFor('22'), searchParams: Promise.resolve({ fansub: 'does-not-exist' }),
    })
    await (boundary.props.children.type(boundary.props.children.props) as Promise<ReactNode>)
    expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, { projection: 'public', limit: 24 })
  })

  it('162 D-02/163 D-11: bei genau einer Fansub-Gruppe wird der Parameter niemals weitergereicht', async () => {
    vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [
      { anime_id: 22, fansub_group_id: 1, is_primary: true, created_at: '', fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } },
    ] })
    const boundary = await AnimeDetailPage({
      ...paramsFor('22'), searchParams: Promise.resolve({ fansub: 'alpha-subs' }),
    })
    await (boundary.props.children.type(boundary.props.children.props) as Promise<ReactNode>)
    expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, { projection: 'public', limit: 24 })
  })

  it('enthaelt kein .fansubRow/.fansubChip-CSS mehr (D-13, ersatzlos entfernt)', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.module.css'), 'utf8')
    expect(css).not.toMatch(/\.fansubRow|\.fansubChip/)
  })

  // 261102-hlg Task 5: page.module.css wurde ueber das 450-Zeilen-Limit hinweg aufgeteilt --
  // totes CSS (0 Treffer in AnimeDetailView.tsx) wurde beim Verschieben ersatzlos entfernt, nicht
  // nur umgezogen. Seit Befund 21/22 (192-02) gehoeren Poster-/Info-Karten-CSS zum alleinigen
  // Stylesheet des Anime-Kopf-Bausteins (AnimeDetailHero.module.css) statt zu zwei Seiten-eigenen
  // Teildateien -- dieser Test liest weiterhin ALLE an dieser Seite beteiligten Stylesheets,
  // damit ein versehentliches Wiederaufleben in irgendeiner davon auffaellt.
  it('enthaelt in keinem der beteiligten Stylesheets totes CSS (.relatedRailSection/.episodeList u. a.)', () => {
    const cssFiles = [
      'page.module.css',
      'AnimeDetailHero.module.css',
      'page.episodes.module.css',
    ].map((file) => readFileSync(join(process.cwd(), 'src/app/anime/[id]', file), 'utf8'))
    const combinedCss = cssFiles.join('\n')
    expect(combinedCss).not.toMatch(
      /\.relatedRailWrapper|\.relatedRailSection|\.episodeList|\.episodeItem|\.episodeNumber|\.episodeTitle|\.episodeMeta|\.episodeActions|\.actionButton/,
    )
  })

  it('die Info-Karte nutzt die globale öffentliche Hero-Kartenvariante statt seiteneigenem CSS', async () => {
    const content = await loadContent()
    const infoCard = elements(content).find((item) => item.type === Card && String(item.props.className ?? '').includes('infoCard'))
    expect(infoCard?.props.variant).toBe('publicHeroInfo')
  })
})

describe('bounded public SSR inventory', () => {
  it('requests one 24-row public page and forwards cursor/story without claiming the slice is the total', async () => {
    groupedMock.mockResolvedValue({ data: { anime_id: 22, episodes: [], episode_count: 0, pagination: { has_more: true, next_cursor: 'next', row_limit: 24 } } })
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, episodes: Array.from({ length: 30 }, (_, index) => ({
      id: index + 1, episode_number: String(index + 1), status: 'public' as const, view_count: 0, download_count: 0,
    })) } })
    const content = await loadContent()
    expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, { projection: 'public', limit: 24 })
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.pagination).toEqual({ has_more: true, next_cursor: 'next', row_limit: 24 })
    expect(browser?.props.storyGroups).toEqual([])
    // D-12: die Ueberschriften-Trefferzahl kommt jetzt aus der gefilterten Fetch-Antwort
    // (episode_count), nicht mehr aus anime.episodes.length -- als episodeCount-Prop
    // an FansubVersionBrowser durchgereicht (Component-Boundary-Move, siehe 163-PATTERNS.md).
    expect(browser?.props.episodeCount).toBe(0)
  })
})

/** Zerlegt einen `/suche?...`-Chip-Link wieder in seine URLSearchParams zum Rundreise-Vergleich (D-09). */
function paramsFromHref(href: string): URLSearchParams {
  return new URLSearchParams(href.split('?')[1] ?? '')
}

describe('Tags-Block und Genre-Links (D-06/D-09/D-12-D-20)', () => {
  it('rendert die Ueberschrift "Tags" und einen Link-Chip je Tag in der vom Backend gelieferten Reihenfolge (kein Re-Sort)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Real Robot', 'Amnesia', 'Zeitreise'] } })
    const content = await loadContent()
    const all = elements(content)
    const tagsLabel = all.find((item) => item.type === Text && textContent(item.props.children as ReactNode) === 'Tags')
    expect(tagsLabel).toBeTruthy()
    // UAT-Entscheidung: "Tags" sitzt auf der hellen Info-Karten-Fläche (Desktop) und muss deshalb
    // bei der dunklen Standardtonalität bleiben (kein tone="onScrim") -- helle Schrift war dort
    // praktisch unsichtbar. Card.module.css kippt den zugrundeliegenden --text-eyebrow-color-Hook
    // unterhalb 767px auf die helle Tonalität um (siehe Card.test.tsx), nicht diese Seite.
    expect(tagsLabel?.props.tone).toBeUndefined()
    const tagLinks = all.filter((item) => item.type === LinkChip && String((item.props.href as string)).includes('tag='))
    expect(tagLinks).toHaveLength(3)
    expect(tagLinks.map((item) => textContent(item.props.children as ReactNode))).toEqual(['Real Robot', 'Amnesia', 'Zeitreise'])
  })

  it('rendert exakt einen Chip bei genau einem Tag (kein Leer-Container)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const tagLinks = elements(content).filter((item) => item.type === LinkChip && String(item.props.href as string).includes('tag='))
    expect(tagLinks).toHaveLength(1)
    expect(textContent(tagLinks[0]?.props.children as ReactNode)).toBe('Amnesia')
  })

  it('rendert weder Ueberschrift noch Container bei fehlenden/leeren Tags (D-13)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: [] } })
    const contentEmpty = await loadContent()
    expect(elements(contentEmpty).some((item) => String(item.props.className ?? '').includes('tagsSection'))).toBe(false)
    expect(textContent(contentEmpty)).not.toMatch(/>?Tags</)

    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: undefined } })
    const contentUndefined = await loadContent()
    expect(elements(contentUndefined).some((item) => String(item.props.className ?? '').includes('tagsSection'))).toBe(false)
  })

  it('kodiert Leerzeichen und Umlaute im Tag-Link ueber URLSearchParams korrekt und rundreist zum Originalnamen (D-09)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Real Robot', 'PSI-Kräfte'] } })
    const content = await loadContent()
    const tagLinks = elements(content).filter((item) => item.type === LinkChip && String(item.props.href as string).includes('tag='))
    const realRobot = tagLinks.find((item) => textContent(item.props.children as ReactNode) === 'Real Robot')
    const psiKraefte = tagLinks.find((item) => textContent(item.props.children as ReactNode) === 'PSI-Kräfte')
    expect(paramsFromHref(realRobot?.props.href as string).get('tag')).toBe('Real Robot')
    expect(paramsFromHref(realRobot?.props.href as string).get('type')).toBe('anime')
    expect(paramsFromHref(psiKraefte?.props.href as string).get('tag')).toBe('PSI-Kräfte')
  })

  it('jeder Tag-Chip ist ein echter Link mit dem Namen als einzigem sichtbarem/zugaenglichem Text (Tastatur-erreichbar per Anker-Semantik)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const tagLink = elements(content).find((item) => item.type === LinkChip && String(item.props.href as string).includes('tag='))
    expect(tagLink?.type).toBe(LinkChip)
    expect(tagLink?.props).not.toHaveProperty('tabIndex')
    expect(tagLink?.props).not.toHaveProperty('onClick')
    expect(textContent(tagLink?.props.children as ReactNode)).toBe('Amnesia')
  })

  it('der Tags-Block steht nach der Beschreibung und vor dem Emby-Bereich/AnimeInfoBanner in Dokumentreihenfolge (D-12)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const all = elements(content)
    const descriptionIndex = all.findIndex((item) => String(item.props.className ?? '').includes('description'))
    const tagsSectionIndex = all.findIndex((item) => String(item.props.className ?? '').includes('tagsSection'))
    const statsRowIndex = all.findIndex((item) => String(item.props.className ?? '').includes('statsRow'))
    const infoBannerIndex = all.findIndex((item) => item.type === AnimeInfoBanner)
    expect(descriptionIndex).toBeGreaterThanOrEqual(0)
    expect(tagsSectionIndex).toBeGreaterThan(descriptionIndex)
    expect(statsRowIndex).toBeGreaterThan(tagsSectionIndex)
    expect(infoBannerIndex).toBeGreaterThan(tagsSectionIndex)
    // Keine eigene Linie zwischen Beschreibung und Tags; die Linie gehört zum Banner.
    const dividerBetween = all
      .slice(descriptionIndex + 1, tagsSectionIndex)
      .some((item) => item.type === 'hr')
    expect(dividerBetween).toBe(false)
  })

  it('Genre-Chips sind Links auf /suche?type=anime&genre=<Name>, der Platzhalter "Anime" bleibt unverlinkt (D-20)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, genres: ['Action', 'Mecha'] } })
    const content = await loadContent()
    const all = elements(content)
    const genreLinks = all.filter((item) => item.type === LinkChip && String(item.props.href as string).includes('genre='))
    expect(genreLinks).toHaveLength(2)
    expect(genreLinks.map((item) => textContent(item.props.children as ReactNode)).sort()).toEqual(['Action', 'Mecha'])
    for (const link of genreLinks) {
      expect(paramsFromHref(link.props.href as string).get('type')).toBe('anime')
    }

    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, genres: [] } })
    const contentNoGenres = await loadContent()
    const placeholder = elements(contentNoGenres).find((item) => item.type === Text && textContent(item.props.children as ReactNode) === 'Anime')
    expect(placeholder).toBeDefined()
    expect(placeholder?.props).not.toHaveProperty('href')
  })
})
