// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, within, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesResponse, PublicGroupedEpisodesOptions, PublicEpisodeVersion } from '@/types/episodeVersion'
import type { AnimeFansubRelation } from '@/types/fansub'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'
import { FansubVersionBrowser } from './FansubVersionBrowser'
import { resolveGroupSlugForFetch, toggleEpisodeExpansion, useFansubGroupSwitch } from './useFansubGroupSwitch'
import type { ResetForFilterResult } from './useWindowedEpisodePages'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

const fansubs: AnimeFansubRelation[] = [
  { anime_id: 22, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'saved-primary', name: 'Anderer Gruppenname' } },
  { anime_id: 22, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'saved-secondary', name: 'Zweite Gruppe' } },
]
const singleFansub: AnimeFansubRelation[] = [fansubs[0]]
const noFansubs: AnimeFansubRelation[] = []
// GAP-11: filler_type_label/episode_type_label kommen von der DB (164-10-Backfill) statt einer
// hardcodierten Frontend-Map; diese Konstante spiegelt nur Fixture-Defaultwerte, keine
// Wiedereinfuehrung der entfernten Frontend-Label-Map.
const DEFAULT_CLASSIFICATION = {
  filler_type: 'unknown', episode_type: 'episode',
  filler_type_label: 'Unbekannt', episode_type_label: 'Episode',
} as const

/**
 * 164-05: "Weitere Episoden laden" ist ein Button-Klick-Mechanismus D-27 hat ihn durch einen
 * Bottom-Sentinel (IntersectionObserver) ersetzt. Manueller Stub (analog
 * useNearViewportActivation.test.ts), jede Instanz wird erfasst, damit ein Test "den Observer,
 * der dieses Sentinel-Element beobachtet" gezielt manuell ausloesen kann.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed = new Set<Element>()
  root = null
  rootMargin = ''
  thresholds: number[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe = (el: Element) => { this.observed.add(el) }
  unobserve = (el: Element) => { this.observed.delete(el) }
  disconnect = () => { this.observed.clear() }
  takeRecords = () => []

  static fire(el: Element) {
    const observer = MockIntersectionObserver.instances.find((instance) => instance.observed.has(el))
    observer?.callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
  }
}

async function fireBottomSentinel() {
  const sentinel = screen.getByTestId('bottom-sentinel')
  await act(async () => { MockIntersectionObserver.fire(sentinel) })
}

beforeEach(() => {
  groupedMock.mockReset()
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  // D-01: der Gruppenzustand lebt ausschliesslich in der URL -- Rueckstellung verhindert
  // Testverschmutzung ueber window.history hinweg (kein localStorage mehr zu leeren).
  window.history.pushState(null, '', '/')
})
afterEach(async () => { await act(async () => {}); cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('authoritative anime project navigation', () => {
  it('verlinkt Zur-Fansub-Gruppe und Zum-Projekt ueber die jeweils aktive Gruppen-Slug (direkter Hook-Aufruf statt fireEvent.click, Befund C)', async () => {
    // Die Gruppenwechsel-Fachlogik (welche Gruppe nach einem Klick aktiv ist) lebt in
    // useFansubGroupSwitch (Plan 192-09); die href-Bauweise selbst (FansubGroupContext liest
    // activeGroup.slug direkt in ein Button-href-Template) ist trivial. Statt eines echten
    // DOM-Klicks auf die Gruppenumschalter-Buttons wird updateFansubSelection hier direkt per
    // renderHook aufgerufen und die daraus resultierende aktive Gruppen-Slug gegen dieselben
    // Pfad-Bauer geprueft, die FansubGroupContext tatsaechlich verwendet.
    const { result } = renderHook(() => useFansubGroupSwitch({
      fansubOptions: fansubs,
      resetForFilter: async (): Promise<ResetForFilterResult> => ({ ok: true, episodeCount: 0 }),
    }))
    function activeSlug(): string | null {
      return fansubs.find((relation) => relation.fansub_group?.id === result.current.activeFansubGroupID)?.fansub_group?.slug ?? null
    }
    // D-02: 2+ Gruppen ohne Parameter -> "Alle" aktiv, kein Gruppenlink ableitbar.
    expect(result.current.activeFansubGroupID).toBeNull()

    await act(async () => { result.current.updateFansubSelection(7) })
    expect(result.current.activeFansubGroupID).toBe(7)
    expect(`/fansubs/${activeSlug()}`).toBe('/fansubs/saved-primary')
    expect(buildPublicFansubProjectPath(activeSlug()!, 'stored-anime')).toBe('/fansubs/saved-primary/fansubprojekt/stored-anime')

    await act(async () => { result.current.updateFansubSelection(9) })
    expect(result.current.activeFansubGroupID).toBe(9)
    expect(`/fansubs/${activeSlug()}`).toBe('/fansubs/saved-secondary')
    expect(buildPublicFansubProjectPath(activeSlug()!, 'stored-anime')).toBe('/fansubs/saved-secondary/fansubprojekt/stored-anime')
  })

  it('nutzt fuer Zum-Projekt weiterhin den bestehenden Encoder samt Trimmen', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug=" stored/anime " fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' saved-group ', name: 'Kein Slug' } }]} episodes={[]} />)
    // Genau eine Gruppe -> automatisch aktiv, kein Klick noetig.
    expect(screen.getByRole('link', { name: 'Zum Projekt' }).getAttribute('href')).toBe('/fansubs/saved-group/fansubprojekt/stored%2Fanime')
  })

  it.each([undefined, '', '   '])('rendert keinen Zum-Projekt-Link ohne animeSlug (kein Fallback auf die technische Route), animeSlug=%j', (animeSlug) => {
    render(<FansubVersionBrowser animeID={22} animeSlug={animeSlug} fansubs={fansubs} episodes={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Zur Fansub-Gruppe' }).getAttribute('href')).toBe('/fansubs/saved-primary')
  })

  it('rendert keinen Zum-Projekt-Link, wenn die aktive Gruppe keinen Slug hat', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' ', name: 'Kein Slug' } }]} episodes={[]} />)
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
  })

  it('rendert keine erfundenen Navigationsziele ohne Gruppe', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[]} episodes={[]} />)
    expect(screen.queryByRole('link', { name: 'Zur Fansub-Gruppe' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
  })

  it('behält echte Episodentitel; das Ausklapp-Verhalten selbst wird direkt über toggleEpisodeExpansion bewiesen (Befund 25 -- kein Klick-Simulations-zu-Rerender-Nachweis mehr, das bleibt Live-UAT)', async () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[{
      ...DEFAULT_CLASSIFICATION,
      episode_id: 50, episode_number: 1, episode_title: 'Gespeicherter Episodentitel', version_count: 0, versions: [],
    }]} />)
    await act(async () => {})
    // Der Episodentitel steht im Accessible Name des Ausklapp-Buttons unabhängig vom
    // Ausklapp-Zustand -- kein Klick nötig, um den echten (nicht erfundenen) Titel zu belegen.
    const toggle = screen.getByRole('button', { name: /Gespeicherter Episodentitel/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // D-15: der Hinweisblock "Keine Version dieser Gruppe verfuegbar." entfaellt ersatzlos --
    // der Server liefert nie mehr eine Episode ohne mindestens eine passende Version.
    expect(screen.queryByText('Keine Version dieser Gruppe verfügbar.')).toBeNull()
    // Die Ausklapp-ÜBERGANGSLOGIK selbst ist eine reine Funktion (toggleEpisodeExpansion) --
    // derselbe Aufruf, den `onToggle` im echten Code treibt, direkt mit dieser Episoden-ID belegt.
    expect(toggleEpisodeExpansion({}, 50)).toEqual({ 50: true })
  })

  it('gives the glass episode card a neutral surface (unknown) and no bespoke opaque-card color token', () => {
    // 164-04: die weisse, opake Episode-Card wird durch eine glasige, klassifikationsgetoente
    // ersetzt (D-05). Die alten .episodeCard/.episodeHeader-Klassen sind entfernt.
    const browserCss = readFileSync(join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.module.css'), 'utf8')
    expect(browserCss).not.toContain('.episodeCard')
    expect(browserCss).not.toContain('.episodeHeader')
    // 261102-hlg Task 8: die vormals feature-lokalen --glass-*-Literale wanderten als globale
    // Tokens nach styles/tokens/components.css (Card variant="glass" + Tönungs-Hook) --
    // EpisodeGlassCard.module.css selbst enthält jetzt nur noch Layout-Regeln, keine Flächen-/
    // Tönungs-Literale mehr.
    const cardCss = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    expect(cardCss).not.toContain('--glass-surface')
    expect(cardCss).not.toContain('--glass-tint-canon')
    expect(cardCss).not.toMatch(/rgba\(|hsl\(/)
    const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens/components.css'), 'utf8')
    expect(tokensCss).toContain('--card-glass-surface')
    expect(tokensCss).toContain('--card-tint-saturation')
  })

  it('übergibt pro Episodenklassifikation den erwarteten Farbton an Cards generischen Tönungs-Hook', () => {
    // Prüft das tatsächliche Render-Ergebnis (Cards inline gesetzte --card-tint-hue-Variable je
    // data-classification), nicht den Quelltext von EpisodeGlassCard.tsx als Rohtext -- eine
    // Umbenennung/Umstrukturierung der internen Zuordnungstabelle darf diesen Test nicht brechen,
    // solange das sichtbare Ergebnis (welcher Farbton landet auf der Karte) gleich bleibt.
    const classifications = ['canon', 'filler', 'mixed', 'recap', 'unknown'] as const
    const episodes: PublicGroupedEpisode[] = classifications.map((filler_type, index) => ({
      ...DEFAULT_CLASSIFICATION,
      filler_type,
      episode_id: 300 + index,
      episode_number: index + 1,
      episode_title: `Klassifikationsfolge ${filler_type}`,
      version_count: 0,
      versions: [],
    }))
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={episodes} />)

    const expectedHueByType: Record<string, string> = { canon: '222', filler: '2', mixed: '272', recap: '42' }
    for (const type of ['canon', 'filler', 'mixed', 'recap'] as const) {
      const card = document.querySelector<HTMLElement>(`li[data-classification="${type}"] section`)
      expect(card?.style.getPropertyValue('--card-tint-hue')).toBe(expectedHueByType[type])
    }
    // `unknown` bekommt bewusst keine Tönung.
    const unknownCard = document.querySelector<HTMLElement>('li[data-classification="unknown"] section')
    expect(unknownCard?.style.getPropertyValue('--card-tint-hue')).toBe('')
  })
})

/*
 * Runde 5, Befund-Review2-R2 (192-33): Gruppen-Auswahl, Gruppen-Kontext und Episoden-Inhalt
 * teilen sich jetzt EINEN Rhythmus-Stack statt drei verstreuter lokaler margin-Werte; totes CSS
 * (.emptyBox) ist entfernt; die IntersectionObserver-Sentinels tragen ihre technische 1px-Höhe
 * als Inline-Stil statt einer CSS-Modul-Klasse.
 */
describe('FansubVersionBrowser -- Runde 5: gemeinsamer Rhythmus-Stack statt drei verstreuter margin-Werte', () => {
  it('FansubVersionBrowser.module.css deklariert weder .section/.emptyBox/.sentinel noch ein eigenes margin-top mehr', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.module.css'), 'utf8')
    expect(css).not.toMatch(/\.section\s*\{/)
    expect(css).not.toMatch(/\.emptyBox\s*\{/)
    expect(css).not.toMatch(/\.sentinel\s*\{/)
    expect(css).not.toMatch(/margin-top\s*:/)
  })

  it('rendert die Ueberschrift und beide Sentinels mit Inline-Stil statt CSS-Modul-Klasse fuer die 1px-Ankerhoehe', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={stateEpisodes} />)
    const topSentinel = screen.getByTestId('top-sentinel')
    const bottomSentinel = screen.getByTestId('bottom-sentinel')
    expect(topSentinel.getAttribute('style')).toContain('height: 1px')
    expect(bottomSentinel.getAttribute('style')).toContain('height: 1px')
    expect(topSentinel.className).toBe('')
    expect(bottomSentinel.className).toBe('')
  })

  it('traegt bei mehreren Gruppen UND aktivem Gruppen-Kontext die Gruppen-Kontext->Inhalt-Luecke "supportingBlockToContent" vor dem Inhalts-Block', () => {
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    // Der Episoden-Inhalts-Block (letztes Rhythmus-Kind) trägt die vom Rhythmus-Array gesetzte
    // Lücke zu seinem VORANGEHENDEN Geschwister (hier: Gruppen-Kontext) als eigenen
    // marginTop-Wrapper (Stacks eigener, bereits etablierter Rhythmus-Array-Mechanismus legt die
    // Lücke IMMER auf den Wrapper des NACHFOLGENDEN Kindes, nicht des vorangehenden).
    const topSentinel = screen.getByTestId('top-sentinel')
    const contentNode = topSentinel.parentElement
    const rhythmWrapper = contentNode?.parentElement
    expect(rhythmWrapper?.style.marginTop).toBe('var(--space-supporting-block-to-content)')
  })

  it('traegt bei einer einzigen Gruppe ohne Gruppen-Kontext dieselbe Gruppen-Auswahl->Inhalt-Luecke "primaryContentBlocks" vor dem Inhalts-Block', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={stateEpisodes} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    expect(screen.queryByTestId('fansub-group-context')).toBeNull()
    const topSentinel = screen.getByTestId('top-sentinel')
    const contentNode = topSentinel.parentElement
    const rhythmWrapper = contentNode?.parentElement
    expect(rhythmWrapper?.style.marginTop).toBe('var(--space-primary-content-blocks)')
  })
})

describe('D-48 visueller Testfall-Katalog (Zeilen 1-19/24-25 aus 164-UI-SPEC.md)', () => {
  function classifiedEpisode(overrides: Partial<PublicGroupedEpisode> = {}): PublicGroupedEpisode {
    return {
      ...DEFAULT_CLASSIFICATION,
      episode_id: 90, episode_number: 5, episode_title: 'Testfolge', version_count: 1,
      versions: [variant(500, 7)],
      ...overrides,
    }
  }

  // GAP-11: Labels sind jetzt die echten DB-Backfill-Werte aus 164-10 (nicht mehr die alte
  // hardcodierte Frontend-Map) -- "Zusatzfolge"/"Teilweise Zusatzfolge" statt "Filler"/"Gemischt".
  it.each([
    ['canon', 'Haupthandlung'],
    ['filler', 'Zusatzfolge'],
    ['mixed', 'Teilweise Zusatzfolge'],
    ['recap', 'Rückblick'],
  ] as const)('Testfall %s: rendert die Kartentoenung und das Klassifikations-Label', (fillerType, label) => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ filler_type: fillerType, filler_type_label: label })]} />)
    expect(screen.getByText(new RegExp(label))).toBeTruthy()
  })

  it('Testfall 5: unknown zeigt kein Klassifikations-Label, nur den Episodentyp', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ filler_type: 'unknown', episode_type: 'episode' })]} />)
    expect(screen.getByText('Episode')).toBeTruthy()
    expect(screen.queryByText(/Haupthandlung|Zusatzfolge|Teilweise Zusatzfolge|Rückblick/)).toBeNull()
  })

  // GAP-11: episode_type_label 'movie' ist laut 164-10-Backfill "Movie" (Auftraggeber-Vorgabe),
  // nicht mehr das alte hardcodierte deutsche "Film".
  it.each([
    ['episode', 'Episode'],
    ['special', 'Special'],
    ['ova', 'OVA'],
    ['movie', 'Movie'],
  ] as const)('Testfall %s: episode_type=%s rendert das Label "%s" ohne Eigenfarbe', (episodeType, label) => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ filler_type: 'unknown', episode_type: episodeType, episode_type_label: label })]} />)
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('Testfall 10: Release mit Gruppenlogo rendert ein Image statt des Initialen-Fallbacks', async () => {
    const withLogo: PublicEpisodeVersion = { ...variant(500, 7), fansub_groups: [{ id: 7, slug: 'ao', name: 'AnimeOwnage', logo_url: 'https://cdn.example.com/logo.png' }] }
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ versions: [withLogo] })]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    // alt="" ist dekorativ und entfernt das <img> bewusst aus der role="img"-Accessibility-
    // Baumsicht (ARIA-Praesentationsrolle) -- getByAltText findet es trotzdem ueber das Attribut.
    expect(screen.getByAltText('').getAttribute('src')).toBeTruthy()
  })

  it('Testfall 11: Release ohne Gruppenlogo zeigt jetzt ein Avatar-Kürzel statt des Bildes (261102-hlg Task 9, D-08 -- von der Decision verlangte Verhaltenserweiterung, kein Bug)', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode()]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    expect(screen.queryByAltText('')).toBeNull()
    // Avatar zeigt bei fehlendem Logo automatisch ein Initialen-Kürzel aus dem Gruppennamen
    // ("Anderer Gruppenname" -> "AG", dekorativ/aria-hidden) statt -- wie bisher -- gar nichts zu
    // rendern; der vollständige Gruppenname bleibt zusätzlich für Screenreader (VisuallyHidden
    // in Avatar) UND als sichtbarer Text in der Zeile selbst vorhanden (zwei Treffer).
    expect(screen.getByText('AG')).toBeTruthy()
    expect(screen.getAllByText('Anderer Gruppenname').length).toBeGreaterThanOrEqual(2)
  })

  it('Testfall 12/13: Release-Datum wird nur gerendert, wenn gepflegt', async () => {
    const withDate: PublicEpisodeVersion = { ...variant(500, 7), release_date: '2012-04-12T00:00:00Z' }
    const withoutDate: PublicEpisodeVersion = { ...variant(600, 7), release_date: null }
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ versions: [withDate, withoutDate] })]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    expect(screen.getByText('Fansub-Release vom 12.04.2012')).toBeTruthy()
    expect(screen.queryAllByText(/Fansub-Release vom/)).toHaveLength(1)
  })

  it('Testfall 14-16: Extras-Zeile zeigt genau die gesetzten Flags, in fester Reihenfolge', async () => {
    const withExtras: PublicEpisodeVersion = { ...variant(500, 7), has_images: true, has_notes: false, has_karaoke: true }
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ versions: [withExtras] })]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    // testing-library normalisiert Whitespace beim Textvergleich -- die drei Leerzeichen
    // zwischen den Extras-Icons kollabieren auf eines, der DOM-Wert selbst bleibt unveraendert.
    expect(screen.getByText('📷 Bilder ♪ Karaoke')).toBeTruthy()
    expect(screen.queryByText(/📝 Notizen/)).toBeNull()
  })

  it('Testfall 17: ohne Extras entfaellt die Zeile vollstaendig', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode()]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    expect(screen.queryByText(/📷 Bilder|📝 Notizen|♪ Karaoke/)).toBeNull()
  })

  it('Testfall 18: Coop-Release zeigt beide Gruppennamen mit "×" und ein reines COOP-Textlabel', async () => {
    const coop: PublicEpisodeVersion = {
      ...variant(500, 7),
      fansub_groups: [{ id: 7, slug: 'ao', name: 'AnimeOwnage' }, { id: 9, slug: 'pm', name: 'ProjectMessiah' }],
    }
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({ versions: [coop] })]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    expect(screen.getByText('AnimeOwnage × ProjectMessiah')).toBeTruthy()
    expect(screen.getByText('COOP')).toBeTruthy()
  })

  it('Testfall 19: mehrere Releases pro Episode rendern mehrere "Zum Release"-Buttons, die Episode bleibt visuell einzeln', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[classifiedEpisode({
      version_count: 2, versions: [variant(500, 7), { ...variant(600, 7), release_version_id: 601 }],
    })]} />)
    fireEvent.click(screen.getByRole('button', { name: /Testfolge/ }))
    expect(screen.getAllByRole('link', { name: 'Zum Release →' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Testfolge/ })).toHaveLength(1)
  })
})

const variant = (id: number, group: number): PublicEpisodeVersion => ({
  id, variant_id: id, release_version_id: id + 100, anime_id: 22, episode_number: 1,
  title: `Variante ${group}`, release_name: `Variante ${group}`,
  fansub_groups: [fansubs[group === 7 ? 0 : 1].fansub_group!],
  has_images: false, has_notes: false, has_karaoke: false,
})
const stateEpisodes = [{ ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 2, versions: [variant(10, 7), variant(20, 9)] }]
function stateBrowser(relations: AnimeFansubRelation[] = fansubs, animeID = 22, initialActiveSlug: string | null = null) {
  return (
    <FansubVersionBrowser
      animeID={animeID}
      fansubs={relations}
      episodes={stateEpisodes}
      initialActiveSlug={initialActiveSlug}
    />
  )
}
function assertGroup(id: 7 | 9) {
  const selected = fansubs[id === 7 ? 0 : 1].fansub_group!
  expect(screen.getByRole('button', { name: selected.name }).getAttribute('aria-pressed')).toBe('true')
  // D-13: der Gruppenbereich rendert den Gruppennamen als reine Ueberschrift OHNE Link.
  const context = screen.getByTestId('fansub-group-context')
  const heading = within(context).getByRole('heading', { name: selected.name })
  expect(heading).toBeTruthy()
  expect(within(context).queryByRole('link', { name: selected.name })).toBeNull()
  expect(screen.getByText(`Variante ${id}`)).toBeTruthy()
  expect(screen.queryByText(`Variante ${id === 7 ? 9 : 7}`)).toBeNull()
}
function assertAllSelected() {
  expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.queryByTestId('fansub-group-context')).toBeNull()
}

describe('Fansub-Gruppenauswahl: URL-Zustand (D-01..D-04, D-09, D-13, D-14)', () => {
  it('Testfall A: zeigt ohne Fansub-Gruppe weder Chip-Zeile noch Gruppenbereich noch einen leeren Platzhalter', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={noFansubs} episodes={[]} />)
    expect(screen.queryByRole('group', { name: 'Fansub-Gruppe' })).toBeNull()
    expect(screen.queryByText('Alle')).toBeNull()
    expect(screen.queryByTestId('fansub-group-context')).toBeNull()
  })

  it('Testfall B/C: aktiviert die einzige Gruppe automatisch, ohne Alle-Chip und ohne Klick', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={singleFansub} episodes={stateEpisodes} />)
    expect(screen.queryByText('Alle')).toBeNull()
    const chip = screen.getByRole('button', { name: fansubs[0].fansub_group!.name })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: fansubs[0].fansub_group!.name })).toBeTruthy()
  })

  it('Testfall D: waehlt bei 2+ Gruppen ohne URL-Parameter automatisch Alle, Gruppenbereich vollstaendig ausgeblendet', () => {
    render(stateBrowser())
    assertAllSelected()
  })

  it('Testfall E/F: ein Chip-Wechsel zeigt vollstaendig den Inhalt der neu gewaehlten Gruppe (Server-Refetch statt Client-Filter, D-07)', async () => {
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    groupedMock.mockResolvedValueOnce(publicPage([
      { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 1, versions: [variant(10, 7)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    assertGroup(7)
    groupedMock.mockResolvedValueOnce(publicPage([
      { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 1, versions: [variant(20, 9)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    assertGroup(9)
    groupedMock.mockResolvedValueOnce(publicPage([
      { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 2, versions: [variant(10, 7), variant(20, 9)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(3), { timeout: 500 })
    assertAllSelected()
  })

  it('Testfall G: initialActiveSlug aktiviert die passende Gruppe bereits beim ersten Render', () => {
    render(stateBrowser(fansubs, 22, 'saved-secondary'))
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    assertGroup(9)
  })

  it('Testfall H: ein ungueltiger/entfernter initialActiveSlug faellt sauber auf Alle zurueck, ohne Fehler', () => {
    render(stateBrowser(fansubs, 22, 'does-not-exist'))
    assertAllSelected()
  })

  it('D-07: ein Chip-Wechsel löst einen Refetch mit dem Ziel-Slug aus (direkter Aufruf statt Klick-Simulation, Befund 25)', async () => {
    const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: true, episodeCount: 0 })
    const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
    await act(async () => { result.current.updateFansubSelection(7) })
    expect(resetForFilter).toHaveBeenCalledExactlyOnceWith('saved-primary')
  })

  it('D-02: andere Query-Parameter bleiben beim Gruppenwechsel erhalten (direkter Aufruf statt Klick-Simulation, Befund 25)', async () => {
    window.history.pushState(null, '', '/anime/22?from=search')
    const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: true, episodeCount: 0 })
    const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
    await act(async () => { result.current.updateFansubSelection(7) })
    const params = new URLSearchParams(window.location.search)
    expect(params.get('from')).toBe('search')
    expect(params.get('fansub')).toBe('saved-primary')
  })

  it('Browser Zurueck/Vor stellt ueber popstate die vorherige Gruppenauswahl wieder her, MIT Refetch (D-09)', async () => {
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    expect(screen.getByRole('button', { name: 'Anderer Gruppenname' }).getAttribute('aria-pressed')).toBe('true')
    groupedMock.mockClear()
    groupedMock.mockResolvedValueOnce({ data: { anime_id: 22, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
    // Simuliert einen Browser-Zurueck-Schritt: die URL verliert den Parameter wieder,
    // ein popstate-Event feuert (kein erneuter pushState durch die Komponente selbst).
    // D-09: "immer neu laden" -- kein Cache pro Gruppe, auch bei Zurueck/Vor.
    act(() => {
      window.history.pushState(null, '', window.location.pathname)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    assertAllSelected()
    // Kein "fansub"-Schluessel: die URL nach dem Zurueck-Schritt hat keinen Parameter mehr ("Alle").
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, {
      projection: 'public', limit: 24, signal: expect.any(AbortSignal),
    }), { timeout: 500 })
  })

  it('Testfall I: eine Coop-Version erzeugt keinen dritten Chip, jede beteiligte Gruppe bleibt einzeln auswaehlbar (Server-Refetch, D-07)', async () => {
    const coopVersion: PublicEpisodeVersion = {
      ...variant(30, 7),
      fansub_groups: [fansubs[0].fansub_group!, fansubs[1].fansub_group!],
    }
    const coopEpisodes = [{ ...DEFAULT_CLASSIFICATION, episode_id: 60, episode_number: 2, episode_title: 'Gemeinsame Folge', version_count: 1, versions: [coopVersion] }]
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={coopEpisodes} />)
    expect(screen.queryByText(/coop/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Gemeinsame Folge/ }))
    // Eine Coop-Version gehoert per Definition zu beiden Gruppen -- der server-gefilterte
    // Refetch fuer jede der beiden Gruppen liefert dieselbe coopEpisodes-Antwort zurueck.
    groupedMock.mockResolvedValueOnce(publicPage(coopEpisodes))
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    expect(screen.getByText('Variante 7')).toBeTruthy()
    groupedMock.mockResolvedValueOnce(publicPage(coopEpisodes))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    expect(screen.getByText('Variante 7')).toBeTruthy()
  })

  it('a11y: Chip-Zeile hat role=group und aria-label Fansub-Gruppe ab 2 Gruppen', () => {
    render(stateBrowser())
    expect(screen.getByRole('group', { name: 'Fansub-Gruppe' })).toBeTruthy()
  })
})

// Befund 25: switchTo/updateFansubSelection/resolveGroupSlugForFetch/toggleEpisodeExpansion
// enthalten die eigentliche Fachlogik des Gruppenwechsels bzw. der Ausklapp-Umschaltung -- diese
// Tests rufen sie DIREKT auf (per `renderHook`/`act` bzw. als reine Funktion), statt einen Klick
// zu simulieren und auf ein Re-Render zu warten. Der echte DOM-Klick-zu-Rerender-Ablauf bleibt
// Live-UAT-Sache (siehe `192-CONTEXT.md`s Befund-25-Entscheidung).
describe('useFansubGroupSwitch/toggleEpisodeExpansion: direkte Logiktests ohne Rendering/fireEvent (Befund 25)', () => {
  describe('resolveGroupSlugForFetch', () => {
    it('liefert bei weniger als 2 Optionen immer null, auch bei einem an sich gültigen Slug', () => {
      expect(resolveGroupSlugForFetch([], 'saved-primary')).toBeNull()
      expect(resolveGroupSlugForFetch(singleFansub, 'saved-primary')).toBeNull()
    })

    it('liefert bei 2+ Optionen den unveränderten Slug bei einem Treffer', () => {
      expect(resolveGroupSlugForFetch(fansubs, 'saved-primary')).toBe('saved-primary')
      expect(resolveGroupSlugForFetch(fansubs, 'saved-secondary')).toBe('saved-secondary')
    })

    it('liefert null bei einem Slug, der zu keiner verknüpften Gruppe passt', () => {
      expect(resolveGroupSlugForFetch(fansubs, 'does-not-exist')).toBeNull()
      expect(resolveGroupSlugForFetch(fansubs, null)).toBeNull()
    })
  })

  describe('useFansubGroupSwitch: updateFansubSelection', () => {
    it('ist bei weniger als 2 Gruppen ein No-Op (kein pushState, kein resetForFilter-Aufruf)', () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState')
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>()
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: singleFansub, resetForFilter }))
      act(() => { result.current.updateFansubSelection(7) })
      expect(pushStateSpy).not.toHaveBeenCalled()
      expect(resetForFilter).not.toHaveBeenCalled()
    })

    it('schreibt bei einer gültigen groupID den passenden Slug in die URL und ruft resetForFilter mit demselben Slug auf', async () => {
      window.history.pushState(null, '', '/anime/22')
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: true, episodeCount: 0 })
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      await act(async () => { result.current.updateFansubSelection(9) })
      expect(new URLSearchParams(window.location.search).get('fansub')).toBe('saved-secondary')
      expect(resetForFilter).toHaveBeenCalledExactlyOnceWith('saved-secondary')
    })

    it('entfernt bei groupID=null den fansub-Parameter und ruft resetForFilter(null) auf', async () => {
      window.history.pushState(null, '', '/anime/22?fansub=saved-primary')
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: true, episodeCount: 0 })
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      await act(async () => { result.current.updateFansubSelection(null) })
      expect(new URLSearchParams(window.location.search).has('fansub')).toBe(false)
      expect(resetForFilter).toHaveBeenCalledExactlyOnceWith(null)
    })

    it('behält bereits vorhandene, fremde Query-Parameter beim Gruppenwechsel unverändert', async () => {
      window.history.pushState(null, '', '/anime/22?from=search')
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: true, episodeCount: 0 })
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      await act(async () => { result.current.updateFansubSelection(7) })
      const params = new URLSearchParams(window.location.search)
      expect(params.get('from')).toBe('search')
      expect(params.get('fansub')).toBe('saved-primary')
    })
  })

  describe('useFansubGroupSwitch: switchTo', () => {
    it('setzt switchState synchron auf loading, danach bei Erfolg auf {loading:false,error:null}', async () => {
      const pending = deferred<ResetForFilterResult>()
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockReturnValue(pending.promise)
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      act(() => { void result.current.switchTo('saved-primary') })
      expect(result.current.switchState).toEqual({ loading: true, error: null })
      await act(async () => { pending.resolve({ ok: true, episodeCount: 3 }) })
      expect(result.current.switchState).toEqual({ loading: false, error: null })
    })

    it('landet bei einem nicht abgebrochenen Fehlschlag bei einer festen Fehlermeldung', async () => {
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: false, aborted: false })
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      await act(async () => { await result.current.switchTo('saved-primary') })
      expect(result.current.switchState).toEqual({ loading: false, error: 'Episoden konnten nicht geladen werden.' })
    })

    it('lässt switchState bei outcome.aborted=true unangetastet (eine neuere Anfrage hält die Verantwortung)', async () => {
      const resetForFilter = vi.fn<(slug: string | null) => Promise<ResetForFilterResult>>().mockResolvedValue({ ok: false, aborted: true })
      const { result } = renderHook(() => useFansubGroupSwitch({ fansubOptions: fansubs, resetForFilter }))
      await act(async () => { await result.current.switchTo('saved-primary') })
      // loading wurde synchron auf true gesetzt und bleibt bei aborted=true unverändert stehen --
      // kein Rückfall auf {loading:false,...}, da die veraltete Antwort switchState nicht mehr anfassen darf.
      expect(result.current.switchState).toEqual({ loading: true, error: null })
    })
  })

  describe('toggleEpisodeExpansion', () => {
    it('fügt den Episodenschlüssel hinzu, wenn er fehlt', () => {
      expect(toggleEpisodeExpansion({}, 5)).toEqual({ 5: true })
    })

    it('entfernt den Episodenschlüssel, wenn er bereits vorhanden ist', () => {
      expect(toggleEpisodeExpansion({ 5: true }, 5)).toEqual({})
    })

    it('mutiert das übergebene Eingabeobjekt nicht', () => {
      const input: Record<number, true> = { 5: true }
      const output = toggleEpisodeExpansion(input, 5)
      expect(input).toEqual({ 5: true })
      expect(output).not.toBe(input)
    })
  })
})

const ended: PublicGroupedEpisodesResponse['data']['pagination'] = { has_more: false, next_cursor: null, row_limit: 24 }
const continued = (cursor: string) => ({ ...ended, has_more: true, next_cursor: cursor })
function publicPage(episodes: PublicGroupedEpisode[], pagination = ended): PublicGroupedEpisodesResponse {
  return { data: { anime_id: 22, episodes, episode_count: episodes.length, pagination } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
describe('bounded public inventory continuation', () => {
  // 164-05: dieser Testfall pruefte urspruenglich, dass Versionen EINER einzelnen 125-Versionen-
  // Episode ueber mehrere Cursor-Pages hinweg client-seitig zu einer Karte zusammengefuehrt
  // werden (die alte mergeEpisodes-Funktion). Diese pre-existing-fehlschlagende Erwartung
  // (deferred-items.md, seit 164-02) ist mit dem neuen begrenzten Fenster (D-30) strukturell
  // unvereinbar: jede Page ist unabhaengig auslagerbar/spacer-faehig (D-34) -- ein Zusammenfuehren
  // ueber Page-Grenzen hinweg wuerde beim Auslagern einer Page die Haelfte der zusammengefuehrten
  // Episode mitentfernen. Ersetzt durch einen Test, der dieselben Aspekte (Gruppenwechsel-Refetch,
  // Cursor-Fortsetzung ueber mehrere eigenstaendige Episoden, Ausklapp-Stabilitaet, Ende-Marker)
  // mit dem tatsaechlich vertraglich gueltigen Modell abdeckt: mehrere DISTINKTE Episoden pro Page.
  it('laedt mehrere eigenstaendige Episoden ueber Cursor-Pages hinweg und bleibt bei Gruppenwechseln konsistent', async () => {
    const initialEpisode: PublicGroupedEpisode = { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Große Folge', version_count: 1, versions: [variant(100, 7)] }
    groupedMock.mockResolvedValueOnce(publicPage([
      { ...DEFAULT_CLASSIFICATION, episode_id: 60, episode_number: 2, episode_title: 'Zweite-Gruppe-Folge', version_count: 1, versions: [variant(200, 9)] },
    ])) // "Zweite Gruppe"-Wechsel
    groupedMock.mockResolvedValueOnce(publicPage(
      [{ ...DEFAULT_CLASSIFICATION, episode_id: 70, episode_number: 3, episode_title: 'Erste Fortsetzungsfolge', version_count: 1, versions: [variant(300, 7)] }],
      continued('cursor-2'),
    )) // "Anderer Gruppenname"-Wechsel (Page 1, hat noch eine Folgepage)
    groupedMock.mockResolvedValueOnce(publicPage(
      [{ ...DEFAULT_CLASSIFICATION, episode_id: 80, episode_number: 4, episode_title: 'Zweite Fortsetzungsfolge', version_count: 1, versions: [variant(400, 7)] }],
      ended,
    )) // Bottom-Sentinel-Nachladung (Page 2, letzte Page)
    groupedMock.mockResolvedValueOnce(publicPage([
      { ...DEFAULT_CLASSIFICATION, episode_id: 60, episode_number: 2, episode_title: 'Zweite-Gruppe-Folge', version_count: 1, versions: [variant(200, 9)] },
    ])) // erneuter "Zweite Gruppe"-Wechsel nach dem Nachladen
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={[initialEpisode]} pagination={ended} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Große Folge/ }))
    expect(screen.getByRole('button', { name: /Große Folge/ }).getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    expect(screen.getByText('Zweite-Gruppe-Folge')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    await waitFor(() => expect(screen.getByText('Erste Fortsetzungsfolge')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Erste Fortsetzungsfolge/ }))
    expect(screen.getByRole('button', { name: /Erste Fortsetzungsfolge/ }).getAttribute('aria-expanded')).toBe('true')

    await fireBottomSentinel()
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(3), { timeout: 500 })
    expect(screen.getByText('Erste Fortsetzungsfolge')).toBeTruthy()
    expect(screen.getByText('Zweite Fortsetzungsfolge')).toBeTruthy()
    // Der Ausklapp-Zustand der ersten Fortsetzungsfolge ist ueber das Nachladen hinweg stabil.
    expect(screen.getByRole('button', { name: /Erste Fortsetzungsfolge/ }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Zweite Fortsetzungsfolge/ }))
    expect(screen.getAllByRole('link', { name: 'Zum Release →' })).toHaveLength(2)
    // has_more=false nach mehr als 1 geladener Page -> Ende-Marker (D-38).
    expect(screen.getByText('Das waren alle Episoden.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(4), { timeout: 500 })
    expect(screen.getByText('Zweite-Gruppe-Folge')).toBeTruthy()
    expect(screen.queryByText('Erste Fortsetzungsfolge')).toBeNull()
    expect(getGroupedEpisodes).toHaveBeenNthCalledWith(3, 22, expect.objectContaining({ projection: 'public', limit: 24, cursor: 'cursor-2', signal: expect.any(AbortSignal) }))
  })
  it('uses canonical version plus exact variant even when the legacy number collides', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[{
      ...DEFAULT_CLASSIFICATION,
      episode_id: 70, episode_number: 4, version_count: 2, versions: [
        { ...variant(100, 7), release_version_id: 10 }, { ...variant(10, 7), release_version_id: 20 },
      ],
    }]} pagination={ended} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Folge 4/ }))
    expect(screen.getAllByRole('link', { name: 'Zum Release →' }).map((link) => link.getAttribute('href'))).toEqual([
      '/anime/22/group/7/releases/10', '/anime/22/group/7/releases/20',
    ])
  })
  it('keeps a failed cursor retryable and deduplicates repeated pending clicks (Bottom-Sentinel, Single-Flight)', async () => {
    const pending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(publicPage([]))
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[]} pagination={continued('retry')} />)
    await act(async () => {})
    const sentinel = screen.getByTestId('bottom-sentinel')
    act(() => { MockIntersectionObserver.fire(sentinel) })
    act(() => { MockIntersectionObserver.fire(sentinel) }) // zweite Intersection waehrend die erste noch pendent ist -- Single-Flight.
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(1)
    await act(async () => pending.reject(new Error('test failure')))
    expect(screen.getByRole('alert').textContent).toContain('Weitere Episoden konnten nicht geladen werden.')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(getGroupedEpisodes).toHaveBeenNthCalledWith(2, 22, expect.objectContaining({ cursor: 'retry' }))
  })
  it.each(['resolve', 'reject'] as const)('aborts an old anime and ignores its late %s while the new cursor is pending', async (outcome) => {
    const old = deferred<PublicGroupedEpisodesResponse>()
    const current = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { rerender, unmount } = render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[]} pagination={continued('old')} />)
    await act(async () => {})
    act(() => { MockIntersectionObserver.fire(screen.getByTestId('bottom-sentinel')) })
    const oldSignal = groupedMock.mock.calls[0][1]?.signal
    rerender(<FansubVersionBrowser animeID={23} fansubs={[]} episodes={[]} pagination={continued('new')} />)
    await act(async () => {})
    expect(oldSignal?.aborted).toBe(true)
    // Nach dem Route-Identity-Wechsel (animeID 22 -> 23) ist die Komponente vollstaendig neu
    // gemountet (key={animeID}) -- ein neues Sentinel-Element beobachten.
    act(() => { MockIntersectionObserver.fire(screen.getByTestId('bottom-sentinel')) })
    await act(async () => {
      if (outcome === 'resolve') old.resolve(publicPage([{ ...DEFAULT_CLASSIFICATION, episode_id: 99, episode_number: 9, episode_title: 'Alte Antwort', version_count: 0, versions: [] }]))
      else old.reject(new Error('old failure'))
    })
    expect(screen.queryByText('Alte Antwort')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    unmount()
    expect(groupedMock.mock.calls[1][1]?.signal?.aborted).toBe(true)
    await act(async () => current.resolve(publicPage([])))
  })
})

it('deduplicates variants only inside the same canonical episode', async () => {
  const common = variant(100, 7)
  groupedMock.mockResolvedValueOnce(publicPage([
    { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Erste Identität', version_count: 1, versions: [common] },
    { ...DEFAULT_CLASSIFICATION, episode_id: 60, episode_number: 1, episode_title: 'Zweite Identität', version_count: 1, versions: [common] },
  ]))
  render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[
    { ...DEFAULT_CLASSIFICATION, episode_id: 50, episode_number: 1, episode_title: 'Erste Identität', version_count: 1, versions: [common] },
  ]} pagination={continued('same-number')} />)
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: /Erste Identität/ }))
  await fireBottomSentinel()
  await waitFor(() => expect(screen.getByRole('button', { name: /Zweite Identität/ })).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: /Zweite Identität/ }))
  expect(screen.getAllByRole('link', { name: 'Zum Release →' })).toHaveLength(2)
})
