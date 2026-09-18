// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { AdminEpisodePatchRequest } from '@/types/admin'
import type {
  EpisodeClassification,
  EpisodeClassificationOptionsResponse,
} from '@/types/episodeClassification'
import { EpisodeClassificationSection } from '@/app/admin/episode-versions/[versionId]/edit/EpisodeClassificationSection'
import { EpisodeAccordion } from '@/components/episodes/EpisodesOverview/EpisodeAccordion'

import { EpisodeClassificationFields } from './EpisodeClassificationFields'

// Gemeinsamer In-Memory-Episode-Datensatz: beide Oberflächen schreiben über
// denselben PATCH-Endpunkt in genau diese eine Zeile.
const store = new Map<number, EpisodeClassification>()

const updateAdminEpisode = vi.fn(async (episodeID: number, payload: AdminEpisodePatchRequest) => {
  const current = store.get(episodeID)
  if (!current) throw new Error('episode nicht gefunden')
  const next: EpisodeClassification = {
    ...current,
    ...(payload.filler_type ? { filler_type: payload.filler_type, filler_type_source: 'manual' } : {}),
    ...(payload.episode_type ? { episode_type: payload.episode_type, episode_type_source: 'manual' } : {}),
  }
  store.set(episodeID, next)
  return {
    data: {
      id: episodeID,
      anime_id: 2,
      episode_number: next.episode_number,
      status: 'public' as const,
      filler_type: next.filler_type ?? undefined,
      filler_type_source: next.filler_type_source ?? undefined,
      episode_type: next.episode_type ?? undefined,
      episode_type_source: next.episode_type_source ?? undefined,
    },
  }
})

// Die tatsächlichen DB-Labels (164-10-Migration 0169) — dienen als Fixture für
// den gemockten Optionen-Endpunkt.
function classificationOptionsResponse(): EpisodeClassificationOptionsResponse {
  return {
    data: {
      filler_types: [
        { code: 'unknown', label: 'Unbekannt' },
        { code: 'canon', label: 'Haupthandlung' },
        { code: 'filler', label: 'Zusatzfolge' },
        { code: 'mixed', label: 'Teilweise Zusatzfolge' },
        { code: 'recap', label: 'Rückblick' },
      ],
      episode_types: [
        { code: 'episode', label: 'Episode' },
        { code: 'special', label: 'Special' },
        { code: 'ova', label: 'OVA' },
        { code: 'ona', label: 'ONA' },
        { code: 'movie', label: 'Movie' },
        { code: 'recap', label: 'Recap' },
        { code: 'preview', label: 'Preview' },
        { code: 'prologue', label: 'Prologue' },
        { code: 'epilogue', label: 'Epilogue' },
        { code: 'bonus', label: 'Bonus' },
      ],
    },
  }
}

const getAdminEpisodeClassificationOptions = vi.fn(async () => classificationOptionsResponse())

vi.mock('@/lib/api', () => ({
  updateAdminEpisode: (episodeID: number, payload: AdminEpisodePatchRequest) => updateAdminEpisode(episodeID, payload),
  getAdminEpisodeClassificationOptions: () => getAdminEpisodeClassificationOptions(),
}))

function ep01(): EpisodeClassification {
  return {
    episode_id: 40,
    episode_number: '1',
    filler_type: 'unknown',
    filler_type_source: 'anisearch',
    episode_type: 'episode',
    episode_type_source: null,
  }
}

function selectByLabel(label: string, container: HTMLElement = document.body) {
  return within(container).getByLabelText(label) as HTMLSelectElement
}

// Die Optionen laden asynchron aus der DB (GAP-11). Direkt nach dem Mounten
// zeigt das Select nur einen Platzhalter für den aktuell gesetzten Wert --
// fireEvent.change auf einen noch nicht vorhandenen Options-Wert würde vom
// Browser/jsdom stillschweigend auf "" normalisiert. Tests, die eine echte
// Werteänderung simulieren, warten deshalb zuerst auf die vollständige Liste.
async function waitForOptionsToLoad(container: HTMLElement = document.body) {
  await waitFor(() => {
    expect(selectByLabel('Canon/Filler', container).options.length).toBeGreaterThan(1)
  })
}

beforeEach(() => {
  store.clear()
  store.set(40, ep01())
  updateAdminEpisode.mockClear()
  getAdminEpisodeClassificationOptions.mockClear()
})

afterEach(() => cleanup())

describe('EpisodeClassificationFields', () => {
  it('shows both episode dimensions with all German labels and current values', async () => {
    render(<EpisodeClassificationFields classification={ep01()} />)

    const filler = selectByLabel('Canon/Filler')
    const type = selectByLabel('Episodentyp')

    // Die Optionen laden asynchron aus der DB (GAP-11) -- direkt nach dem
    // Rendern zeigt das Select nur den aktuell gesetzten Wert als Platzhalter.
    await waitFor(() => {
      expect([...filler.options].map((option) => option.textContent)).toEqual([
        'Unbekannt', 'Haupthandlung', 'Zusatzfolge', 'Teilweise Zusatzfolge', 'Rückblick',
      ])
    })
    expect(filler.value).toBe('unknown')
    expect(type.value).toBe('episode')
    expect([...type.options].map((option) => option.textContent)).toEqual([
      'Episode', 'Special', 'OVA', 'ONA', 'Movie', 'Recap', 'Preview', 'Prologue', 'Epilogue', 'Bonus',
    ])
  })

  it('saves Canon/Filler alone without touching the episode type', async () => {
    const onSaved = vi.fn()
    render(<EpisodeClassificationFields classification={ep01()} onSaved={onSaved} />)
    await waitForOptionsToLoad()

    fireEvent.change(selectByLabel('Canon/Filler'), { target: { value: 'canon' } })

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(updateAdminEpisode).toHaveBeenCalledWith(40, { filler_type: 'canon' })
    expect(onSaved.mock.calls[0][0]).toMatchObject({ filler_type: 'canon', episode_type: 'episode' })
    expect(screen.getByText('Gespeichert – gilt für alle Versionen dieser Episode.')).not.toBeNull()
  })

  it('saves the episode type alone and keeps recap independent in both dimensions', async () => {
    const onSaved = vi.fn()
    render(<EpisodeClassificationFields classification={ep01()} onSaved={onSaved} />)
    await waitForOptionsToLoad()

    fireEvent.change(selectByLabel('Episodentyp'), { target: { value: 'recap' } })
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(updateAdminEpisode).toHaveBeenLastCalledWith(40, { episode_type: 'recap' })
    expect(selectByLabel('Canon/Filler').value).toBe('unknown')

    fireEvent.change(selectByLabel('Canon/Filler'), { target: { value: 'canon' } })
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2))
    expect(store.get(40)).toMatchObject({ filler_type: 'canon', episode_type: 'recap' })
  })

  it('reverts the selection and shows an error when saving fails', async () => {
    updateAdminEpisode.mockRejectedValueOnce(new Error('ungültiger filler_type parameter'))
    render(<EpisodeClassificationFields classification={ep01()} />)

    fireEvent.change(selectByLabel('Canon/Filler'), { target: { value: 'filler' } })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('ungültiger filler_type parameter')
    expect(selectByLabel('Canon/Filler').value).toBe('unknown')
  })
})

// Jede dieser Tests lädt die Komponente über ein frisches Modul (vi.resetModules
// + vi.doMock + dynamischer import), damit der modul-weite Optionen-Cache aus
// EpisodeClassificationFields.tsx nicht durch vorherige Tests in dieser Datei
// bereits befüllt ist -- so ist jede Assertion unabhängig vom Testreihenfolge.
describe('DB-sourced Canon/Filler und Episodentyp Optionen (GAP-11)', () => {
  async function loadFreshFields(
    optionsResponse: EpisodeClassificationOptionsResponse,
  ) {
    vi.resetModules()
    const fetchOptions = vi.fn(async () => optionsResponse)
    vi.doMock('@/lib/api', () => ({
      updateAdminEpisode: (episodeID: number, payload: AdminEpisodePatchRequest) =>
        updateAdminEpisode(episodeID, payload),
      getAdminEpisodeClassificationOptions: () => fetchOptions(),
    }))
    const freshModule = await import('./EpisodeClassificationFields')
    return { Fields: freshModule.EpisodeClassificationFields, fetchOptions }
  }

  it('Test 1: mounting two episode rows issues exactly one network request (Modul-Cache)', async () => {
    const { Fields, fetchOptions } = await loadFreshFields(classificationOptionsResponse())

    const rowOne = render(<Fields classification={ep01()} />)
    const rowTwo = render(<Fields classification={{ ...ep01(), episode_id: 41 }} />)

    const fillerOne = selectByLabel('Canon/Filler', rowOne.container)
    const fillerTwo = selectByLabel('Canon/Filler', rowTwo.container)
    await waitFor(() => {
      expect(fillerOne.options.length).toBe(5)
      expect(fillerTwo.options.length).toBe(5)
    })
    expect(fetchOptions).toHaveBeenCalledTimes(1)
  })

  it('Test 2: Canon/Filler renders one option per DB-returned filler type with its DB label', async () => {
    const { Fields } = await loadFreshFields({
      data: {
        filler_types: [
          { code: 'unknown', label: 'DB-Unbekannt' },
          { code: 'canon', label: 'DB-Haupthandlung' },
        ],
        episode_types: [{ code: 'episode', label: 'DB-Episode' }],
      },
    })

    render(<Fields classification={ep01()} />)
    const filler = selectByLabel('Canon/Filler')

    await waitFor(() => {
      expect([...filler.options].map((option) => option.textContent)).toEqual([
        'DB-Unbekannt', 'DB-Haupthandlung',
      ])
    })
  })

  it('Test 3: Episodentyp renders one option per DB-returned episode type with its DB label', async () => {
    const { Fields } = await loadFreshFields({
      data: {
        filler_types: [{ code: 'unknown', label: 'DB-Unbekannt' }],
        episode_types: [
          { code: 'episode', label: 'DB-Episode' },
          { code: 'movie', label: 'DB-Film' },
        ],
      },
    })

    render(<Fields classification={ep01()} />)
    const type = selectByLabel('Episodentyp')

    await waitFor(() => {
      expect([...type.options].map((option) => option.textContent)).toEqual([
        'DB-Episode', 'DB-Film',
      ])
    })
  })

  it('Test 4 (Regression): saving a selection still calls updateAdminEpisode exactly as before', async () => {
    const { Fields } = await loadFreshFields(classificationOptionsResponse())
    const onSaved = vi.fn()

    render(<Fields classification={ep01()} onSaved={onSaved} />)
    await waitForOptionsToLoad()
    fireEvent.change(selectByLabel('Canon/Filler'), { target: { value: 'canon' } })

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(updateAdminEpisode).toHaveBeenCalledWith(40, { filler_type: 'canon' })
  })
})

describe('Episoden-Übersicht und Versionseditor teilen einen Episode-Datensatz', () => {
  const groupedEpisode = {
    episode_number: 1,
    episode_title: 'Rote Nacht',
    version_count: 3,
    versions: [],
  }

  it('renders the fields in the episode row, not inside the toggle button or per version', async () => {
    render(
      <EpisodeAccordion
        episode={groupedEpisode}
        isExpanded={false}
        onToggle={() => {}}
        classification={ep01()}
      />,
    )
    await waitForOptionsToLoad()

    const toggle = screen.getByRole('button', { name: /EP 01/ })
    expect(within(toggle).queryByLabelText('Canon/Filler')).toBeNull()
    expect(screen.getAllByLabelText('Canon/Filler')).toHaveLength(1)
    expect(screen.getAllByLabelText('Episodentyp')).toHaveLength(1)
    expect(screen.getByText('3 Versionen')).not.toBeNull()
  })

  it('overview change is visible in every version editor and editor change is visible in the overview', async () => {
    // 1) Übersicht: Canon + Special.
    const overview = render(
      <EpisodeAccordion episode={groupedEpisode} isExpanded={false} onToggle={() => {}} classification={store.get(40)} />,
    )
    await waitForOptionsToLoad(overview.container)
    fireEvent.change(selectByLabel('Canon/Filler', overview.container), { target: { value: 'canon' } })
    await waitFor(() => expect(store.get(40)?.filler_type).toBe('canon'))
    fireEvent.change(selectByLabel('Episodentyp', overview.container), { target: { value: 'special' } })
    await waitFor(() => expect(store.get(40)?.episode_type).toBe('special'))
    overview.unmount()

    // 2) Alle drei Versionseditoren laden dieselbe Episode (Reload = neuer Mount).
    for (let version = 0; version < 3; version += 1) {
      const editor = render(<EpisodeClassificationSection classification={store.get(40)!} />)
      expect(selectByLabel('Canon/Filler', editor.container).value).toBe('canon')
      expect(selectByLabel('Episodentyp', editor.container).value).toBe('special')
      // Lässt das bereits gecachte Options-Promise vor dem Unmount auflösen
      // (act-sauber), statt es hängend im nächsten Test aufzulösen.
      await act(async () => {
        await Promise.resolve()
      })
      editor.unmount()
    }

    // 3) Versionseditor: Mixed + Episode.
    const editor = render(<EpisodeClassificationSection classification={store.get(40)!} />)
    expect(editor.getByText(/gelten für alle ihre Versionen/)).not.toBeNull()
    await waitForOptionsToLoad(editor.container)
    fireEvent.change(selectByLabel('Canon/Filler', editor.container), { target: { value: 'mixed' } })
    await waitFor(() => expect(store.get(40)?.filler_type).toBe('mixed'))
    fireEvent.change(selectByLabel('Episodentyp', editor.container), { target: { value: 'episode' } })
    await waitFor(() => expect(store.get(40)?.episode_type).toBe('episode'))
    editor.unmount()

    // 4) Reload der Übersicht zeigt genau diese Werte.
    const reloaded = render(
      <EpisodeAccordion episode={groupedEpisode} isExpanded={false} onToggle={() => {}} classification={store.get(40)} />,
    )
    await waitForOptionsToLoad(reloaded.container)
    expect(selectByLabel('Canon/Filler', reloaded.container).value).toBe('mixed')
    expect(selectByLabel('Episodentyp', reloaded.container).value).toBe('episode')

    expect(store.size).toBe(1)
    for (const [, payload] of updateAdminEpisode.mock.calls) {
      expect(Object.keys(payload)).toHaveLength(1)
    }
    expect(new Set(updateAdminEpisode.mock.calls.map(([episodeID]) => episodeID))).toEqual(new Set([40]))
  })
})
