// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'
import { getFansubList } from '@/lib/api'

import { EpisodeImportMappingRowCard } from './EpisodeImportMappingRow'

vi.mock('@/lib/api', () => ({
  getFansubList: vi.fn(),
}))

const mockedGetFansubList = vi.mocked(getFansubList)

function makeRow(overrides: Partial<EpisodeImportMappingRow> = {}): EpisodeImportMappingRow {
  return {
    media_item_id: 'viper-ep01',
    file_name: 'Vipers Creed. S01E01-CSubs.mkv',
    display_path: 'Anime.TV.Sub/Vipers Creed',
    target_episode_numbers: [1],
    suggested_episode_numbers: [1],
    status: 'suggested',
    ...overrides,
  }
}

function renderRow(options: {
  row?: EpisodeImportMappingRow
  onSetSelectedFansubGroups?: (mediaItemID: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
} = {}) {
  return render(
    <EpisodeImportMappingRowCard
      episodeNumber={1}
      row={options.row ?? makeRow()}
      onSetTargets={vi.fn()}
      onSetRelease={vi.fn()}
      onSetSelectedFansubGroups={options.onSetSelectedFansubGroups ?? vi.fn()}
      onAddSelectedFansubGroup={vi.fn()}
      onRemoveSelectedFansubGroup={vi.fn()}
      onApplyFansubGroupToEpisode={vi.fn()}
      onApplyFansubGroupFromEpisode={vi.fn()}
      onSkip={vi.fn()}
    />,
  )
}

describe('EpisodeImportMappingRowCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetFansubList.mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
    })
  })

  it('splits comma separated free-text fansub groups into separate chips', async () => {
    const onSetSelectedFansubGroups = vi.fn()

    renderRow({ onSetSelectedFansubGroups })

    fireEvent.change(screen.getByLabelText('Fansub-Gruppen für Vipers Creed. S01E01-CSubs.mkv'), {
      target: { value: 'C-Subs, Honto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Als Chip' }))

    await waitFor(() => {
      expect(onSetSelectedFansubGroups).toHaveBeenCalledWith('viper-ep01', [
        { name: 'C-Subs' },
        { name: 'Honto' },
      ])
    })
  })
})
