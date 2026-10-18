// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeImportMappingRow } from '@/types/episodeImport'
import { getFansubList } from '@/lib/api'

import { EpisodeGroup, type EpisodeGroupProps } from './EpisodeImportEpisodeGroup'

vi.mock('@/lib/api', () => ({
  getFansubList: vi.fn(),
}))

const mockedGetFansubList = vi.mocked(getFansubList)

function makeRow(overrides: Partial<EpisodeImportMappingRow> = {}): EpisodeImportMappingRow {
  return {
    media_item_id: 'ghost-ep01',
    media_source_id: 'source-ghost',
    file_name: 'GhostFile.S01E01-ShiroiFansub.mkv',
    display_path: 'Anime.TV.Sub/GhostFile',
    target_episode_numbers: [1],
    suggested_episode_numbers: [1],
    status: 'suggested',
    ...overrides,
  }
}

function makeGroup(overrides: Partial<EpisodeGroupProps['group']> = {}): EpisodeGroupProps['group'] {
  return {
    episodeNumber: 1,
    title: null,
    existingEpisodeId: null,
    fillerType: null,
    fillerNote: null,
    titlesByLanguage: null,
    availableLanguages: [],
    coveredEpisodes: [],
    lastCoveredEpisodeNumber: 1,
    rows: [makeRow()],
    ...overrides,
  }
}

function renderGroup(
  group: EpisodeGroupProps['group'],
  onSetEpisodeTitle: EpisodeGroupProps['onSetEpisodeTitle'] = vi.fn(),
) {
  return render(
    <EpisodeGroup
      group={group}
      hasVisualGap={false}
      onSetTargets={vi.fn()}
      onSetRelease={vi.fn()}
      onSetSelectedFansubGroups={vi.fn()}
      onAddSelectedFansubGroup={vi.fn()}
      onRemoveSelectedFansubGroup={vi.fn()}
      onApplyFansubGroupToEpisode={vi.fn()}
      onApplyFansubGroupFromEpisode={vi.fn()}
      onSetEpisodeTitle={onSetEpisodeTitle}
      onSkip={vi.fn()}
      onApplyRow={vi.fn()}
      applyingRowId={null}
      onConfirmEpisode={vi.fn()}
      onSkipEpisode={vi.fn()}
    />,
  )
}

describe('EpisodeGroup (GAP-13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetFansubList.mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
    })
  })

  it('single file: header shows filename/path, row does not repeat them', () => {
    const group = makeGroup({
      rows: [
        makeRow({
          file_name: 'GhostFile.S01E01-ShiroiFansub.mkv',
          display_path: 'Anime.TV.Sub/GhostFile',
        }),
      ],
    })

    renderGroup(group)

    const fileNameMatches = screen.getAllByText('GhostFile.S01E01-ShiroiFansub.mkv')
    expect(fileNameMatches).toHaveLength(1)

    const pathMatches = screen.getAllByText('Anime.TV.Sub/GhostFile')
    expect(pathMatches).toHaveLength(1)
  })

  it('two files: header stays clean, each row keeps its own filename/path', () => {
    const group = makeGroup({
      rows: [
        makeRow({
          media_item_id: 'ghost-ep01-a',
          media_source_id: 'source-ghost-a',
          file_name: 'GhostFile.S01E01-ShiroiFansub.mkv',
          display_path: 'Anime.TV.Sub/GhostFile',
        }),
        makeRow({
          media_item_id: 'ghost-ep01-b',
          media_source_id: 'source-ghost-b',
          file_name: 'GhostFile.S01E01-OtherGroup.mkv',
          display_path: 'Anime.TV.Sub2/GhostFile',
        }),
      ],
    })

    const { container } = renderGroup(group)

    expect(container.querySelector('[class*="episodeSingleFileInfo"]')).toBeNull()

    expect(screen.getAllByText('GhostFile.S01E01-ShiroiFansub.mkv')).toHaveLength(1)
    expect(screen.getAllByText('Anime.TV.Sub/GhostFile')).toHaveLength(1)
    expect(screen.getAllByText('GhostFile.S01E01-OtherGroup.mkv')).toHaveLength(1)
    expect(screen.getAllByText('Anime.TV.Sub2/GhostFile')).toHaveLength(1)
  })

  it('language dropdown only offers the languages actually present for the episode, defaulting to German', () => {
    const group = makeGroup({
      titlesByLanguage: { de: 'Unantastbare Königin', en: 'Untouchable Queen', ja: 'Untouchable Queen' },
      availableLanguages: ['de', 'en', 'ja'],
    })

    renderGroup(group)

    const select = screen.getByRole('combobox', {
      name: 'Sprache für Episodentitel 1',
    }) as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((option) => option.text)
    expect(optionLabels).toEqual(['Deutsch', 'Englisch', 'Japanisch'])
    expect(select.value).toBe('de')

    const titleInput = screen.getByRole('textbox', {
      name: 'Episodentitel für Episode 1',
    }) as HTMLInputElement
    expect(titleInput.value).toBe('Unantastbare Königin')
  })

  it('switching the language dropdown updates the displayed title to that language', () => {
    const group = makeGroup({
      titlesByLanguage: { de: 'Unantastbare Königin', en: 'Untouchable Queen' },
      availableLanguages: ['de', 'en'],
    })

    renderGroup(group)

    const select = screen.getByRole('combobox', {
      name: 'Sprache für Episodentitel 1',
    }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'en' } })

    const titleInput = screen.getByRole('textbox', {
      name: 'Episodentitel für Episode 1',
    }) as HTMLInputElement
    expect(titleInput.value).toBe('Untouchable Queen')
  })

  it('a language with no title for this episode shows an empty input, not a silent German fallback', () => {
    const group = makeGroup({
      titlesByLanguage: { de: 'Unantastbare Königin' },
      availableLanguages: ['de', 'en'],
    })

    renderGroup(group)

    const select = screen.getByRole('combobox', {
      name: 'Sprache für Episodentitel 1',
    }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'en' } })

    const titleInput = screen.getByRole('textbox', {
      name: 'Episodentitel für Episode 1',
    }) as HTMLInputElement
    expect(titleInput.value).toBe('')
  })

  it('editing the title while a non-German language is selected writes back to that language, not German', () => {
    const onSetEpisodeTitle = vi.fn()
    const group = makeGroup({
      titlesByLanguage: { de: 'Unantastbare Königin', en: 'Untouchable Queen' },
      availableLanguages: ['de', 'en'],
    })

    renderGroup(group, onSetEpisodeTitle)

    const select = screen.getByRole('combobox', {
      name: 'Sprache für Episodentitel 1',
    }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'en' } })

    const titleInput = screen.getByRole('textbox', {
      name: 'Episodentitel für Episode 1',
    }) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Edited English Title' } })

    expect(onSetEpisodeTitle).toHaveBeenCalledWith(1, 'Edited English Title', 'en')
  })

  it('falls back to Deutsch-only dropdown when no languages are available at all', () => {
    const group = makeGroup({ titlesByLanguage: null, availableLanguages: [] })

    renderGroup(group)

    const select = screen.getByRole('combobox', {
      name: 'Sprache für Episodentitel 1',
    }) as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((option) => option.text)
    expect(optionLabels).toEqual(['Deutsch'])
    expect(select.value).toBe('de')
  })
})
