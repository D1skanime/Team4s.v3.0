// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reassignFansubAlias } from '@/lib/api'
import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'

import { FansubGroupOriginHint } from './FansubGroupOriginHint'

vi.mock('@/lib/api', () => ({
  reassignFansubAlias: vi.fn(),
}))

const mockedReassignFansubAlias = vi.mocked(reassignFansubAlias)

function makeRow(overrides: Partial<EpisodeImportMappingRow> = {}): EpisodeImportMappingRow {
  return {
    media_item_id: 'ep01',
    media_source_id: 'source-01',
    file_name: 'Serie S01E01 [BDnP].mkv',
    target_episode_numbers: [1],
    suggested_episode_numbers: [1],
    status: 'suggested',
    ...overrides,
  }
}

function renderHint(options: {
  row?: EpisodeImportMappingRow
  selectedFansubGroups?: EpisodeImportSelectedFansubGroup[]
  onAddSelectedFansubGroup?: (fansubGroup: EpisodeImportSelectedFansubGroup) => void
}) {
  return render(
    <FansubGroupOriginHint
      row={options.row ?? makeRow()}
      selectedFansubGroups={options.selectedFansubGroups ?? []}
      onAddSelectedFansubGroup={options.onAddSelectedFansubGroup ?? vi.fn()}
      sourceKey="ep01|source-01"
      label="Serie S01E01 [BDnP].mkv"
    />,
  )
}

describe('FansubGroupOriginHint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Zustand A: renders the origin hint text for an exact match with no conflict, no button, no badge', () => {
    const row = makeRow({
      fansub_group_match_origin: {
        raw: 'BDnP',
        matched_via: 'alias',
        group_id: 5,
        group_name: 'Bloody-Shadow',
        alias_id: 12,
      },
    })

    renderHint({ row, selectedFansubGroups: [{ id: 5, name: 'Bloody-Shadow' }] })

    expect(screen.getByText('Erkannt aus Dateiname: BDnP → Bloody-Shadow (Alias)')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('Zustand A: maps matched_via to the correct German label (Name/Slug)', () => {
    const row = makeRow({
      fansub_group_match_origin: {
        raw: 'FHZ',
        matched_via: 'slug',
        group_id: 7,
        group_name: 'FlameHaze-subs',
      },
    })

    renderHint({ row, selectedFansubGroups: [{ id: 7, name: 'FlameHaze-subs' }] })

    expect(screen.getByText('Erkannt aus Dateiname: FHZ → FlameHaze-subs (Slug)')).not.toBeNull()
  })

  it('Zustand B: renders up to 3 suggestion buttons that add the group as a chip on click', () => {
    const onAddSelectedFansubGroup = vi.fn()
    const row = makeRow({
      fansub_group_match_origin: null,
      fansub_group_suggestions: [
        { id: 1, name: 'GroupOne', slug: 'group-one' },
        { id: 2, name: 'GroupTwo', slug: 'group-two' },
      ],
    })

    renderHint({ row, onAddSelectedFansubGroup })

    const firstButton = screen.getByRole('button', { name: 'Meinten Sie: GroupOne?' })
    const secondButton = screen.getByRole('button', { name: 'Meinten Sie: GroupTwo?' })
    expect(firstButton).not.toBeNull()
    expect(secondButton).not.toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(2)

    fireEvent.click(firstButton)
    expect(onAddSelectedFansubGroup).toHaveBeenCalledWith({ id: 1, name: 'GroupOne', slug: 'group-one' })
  })

  it('Zustand B: caps suggestions at 3 even when more are provided', () => {
    const row = makeRow({
      fansub_group_match_origin: null,
      fansub_group_suggestions: [
        { id: 1, name: 'GroupOne', slug: 'group-one' },
        { id: 2, name: 'GroupTwo', slug: 'group-two' },
        { id: 3, name: 'GroupThree', slug: 'group-three' },
        { id: 4, name: 'GroupFour', slug: 'group-four' },
      ],
    })

    renderHint({ row })

    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('Zustand C (alias-tier): shows conflict warning and reassigns on confirmed action', async () => {
    mockedReassignFansubAlias.mockResolvedValue({
      data: { id: 12, fansub_group_id: 9, alias: 'BDnP', created_at: '2026-01-01', updated_at: '2026-01-01' },
    })
    const onAddSelectedFansubGroup = vi.fn()
    const row = makeRow({
      fansub_group_match_origin: {
        raw: 'BDnP',
        matched_via: 'alias',
        group_id: 5,
        group_name: 'New-Subs',
        alias_id: 12,
      },
    })

    renderHint({
      row,
      selectedFansubGroups: [{ id: 9, name: 'Bloody-Shadow' }],
      onAddSelectedFansubGroup,
    })

    expect(screen.getByText('Kürzel „BDnP" gehört bereits zu New-Subs.')).not.toBeNull()

    const reassignButton = screen.getByRole('button', { name: 'Trotzdem zu Bloody-Shadow umhängen' })
    fireEvent.click(reassignButton)

    const confirmButton = await screen.findByRole('button', { name: 'Trotzdem umhängen' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockedReassignFansubAlias).toHaveBeenCalledWith(5, 12, { target_fansub_group_id: 9 })
    })
    await waitFor(() => {
      expect(onAddSelectedFansubGroup).toHaveBeenCalledWith({ id: 9, name: 'Bloody-Shadow' })
    })
  })

  it('Zustand C (name-tier): shows the conflict warning but not the reassign button', () => {
    const row = makeRow({
      fansub_group_match_origin: {
        raw: 'BDnP',
        matched_via: 'name',
        group_id: 5,
        group_name: 'New-Subs',
      },
    })

    renderHint({ row, selectedFansubGroups: [{ id: 9, name: 'Bloody-Shadow' }] })

    expect(screen.getByText('Kürzel „BDnP" gehört bereits zu New-Subs.')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('Zustand D: renders nothing when there is no origin and no suggestions', () => {
    const row = makeRow({ fansub_group_match_origin: null, fansub_group_suggestions: [] })

    const { container } = renderHint({ row })

    expect(container.firstChild).toBeNull()
  })
})
