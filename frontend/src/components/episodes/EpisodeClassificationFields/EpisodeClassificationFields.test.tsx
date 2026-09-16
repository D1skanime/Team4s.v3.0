// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { AdminEpisodePatchRequest } from '@/types/admin'
import type { EpisodeClassification } from '@/types/episodeClassification'
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

vi.mock('@/lib/api', () => ({
  updateAdminEpisode: (episodeID: number, payload: AdminEpisodePatchRequest) => updateAdminEpisode(episodeID, payload),
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

beforeEach(() => {
  store.clear()
  store.set(40, ep01())
  updateAdminEpisode.mockClear()
})

afterEach(() => cleanup())

describe('EpisodeClassificationFields', () => {
  it('shows both episode dimensions with all German labels and current values', () => {
    render(<EpisodeClassificationFields classification={ep01()} />)

    const filler = selectByLabel('Canon/Filler')
    const type = selectByLabel('Episodentyp')
    expect(filler.value).toBe('unknown')
    expect(type.value).toBe('episode')
    expect([...filler.options].map((option) => option.textContent)).toEqual([
      'Unbekannt', 'Haupthandlung', 'Zusatzfolge', 'Teilweise Zusatzfolge', 'Rückblick',
    ])
    expect([...type.options].map((option) => option.textContent)).toEqual([
      'Episode', 'Special', 'OVA', 'ONA', 'Movie', 'Recap', 'Preview', 'Prologue', 'Epilogue', 'Bonus',
    ])
  })

  it('saves Canon/Filler alone without touching the episode type', async () => {
    const onSaved = vi.fn()
    render(<EpisodeClassificationFields classification={ep01()} onSaved={onSaved} />)

    fireEvent.change(selectByLabel('Canon/Filler'), { target: { value: 'canon' } })

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(updateAdminEpisode).toHaveBeenCalledWith(40, { filler_type: 'canon' })
    expect(onSaved.mock.calls[0][0]).toMatchObject({ filler_type: 'canon', episode_type: 'episode' })
    expect(screen.getByText('Gespeichert – gilt für alle Versionen dieser Episode.')).not.toBeNull()
  })

  it('saves the episode type alone and keeps recap independent in both dimensions', async () => {
    const onSaved = vi.fn()
    render(<EpisodeClassificationFields classification={ep01()} onSaved={onSaved} />)

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

describe('Episoden-Übersicht und Versionseditor teilen einen Episode-Datensatz', () => {
  const groupedEpisode = {
    episode_number: 1,
    episode_title: 'Rote Nacht',
    version_count: 3,
    versions: [],
  }

  it('renders the fields in the episode row, not inside the toggle button or per version', () => {
    render(
      <EpisodeAccordion
        episode={groupedEpisode}
        isExpanded={false}
        onToggle={() => {}}
        classification={ep01()}
      />,
    )

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
      editor.unmount()
    }

    // 3) Versionseditor: Mixed + Episode.
    const editor = render(<EpisodeClassificationSection classification={store.get(40)!} />)
    expect(editor.getByText(/gelten für alle ihre Versionen/)).not.toBeNull()
    fireEvent.change(selectByLabel('Canon/Filler', editor.container), { target: { value: 'mixed' } })
    await waitFor(() => expect(store.get(40)?.filler_type).toBe('mixed'))
    fireEvent.change(selectByLabel('Episodentyp', editor.container), { target: { value: 'episode' } })
    await waitFor(() => expect(store.get(40)?.episode_type).toBe('episode'))
    editor.unmount()

    // 4) Reload der Übersicht zeigt genau diese Werte.
    const reloaded = render(
      <EpisodeAccordion episode={groupedEpisode} isExpanded={false} onToggle={() => {}} classification={store.get(40)} />,
    )
    expect(selectByLabel('Canon/Filler', reloaded.container).value).toBe('mixed')
    expect(selectByLabel('Episodentyp', reloaded.container).value).toBe('episode')

    expect(store.size).toBe(1)
    for (const [, payload] of updateAdminEpisode.mock.calls) {
      expect(Object.keys(payload)).toHaveLength(1)
    }
    expect(new Set(updateAdminEpisode.mock.calls.map(([episodeID]) => episodeID))).toEqual(new Set([40]))
  })
})
