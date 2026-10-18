// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EpisodeImportPreviewResult } from '@/types/episodeImport'
import { jellyfinSourceKey } from '@/lib/jellyfinSourceIdentity'
const mocks = vi.hoisted(() => ({ context: vi.fn(), preview: vi.fn(), apply: vi.fn() }))
vi.mock('@/lib/api', () => ({ getEpisodeImportContext: mocks.context, previewEpisodeImport: mocks.preview, applyEpisodeImport: mocks.apply }))
import { useEpisodeImportBuilder } from './useEpisodeImportBuilder'
const preview: EpisodeImportPreviewResult = {
  anime_id: 1, anime_title: 'Fixture', canonical_episodes: [{ episode_number: 2 }],
  media_candidates: ['source-a', 'source-b'].map(source => ({ media_item_id: 'shared', media_source_id: source, streams_complete: true, file_name: `${source}.mkv`, path: '/fixture' })),
  mappings: ['source-a', 'source-b'].map(source => ({ media_item_id: 'shared', media_source_id: source, target_episode_numbers: [2], suggested_episode_numbers: [2], status: 'confirmed' })),
}
beforeEach(() => {
  mocks.context.mockReset().mockResolvedValue({ data: { anime_id: 1, anime_title: 'Fixture' } })
  mocks.preview.mockReset().mockResolvedValue({ data: preview })
  mocks.apply.mockReset().mockResolvedValue({ data: {} })
})
afterEach(cleanup)
describe('source-scoped builder actions', () => {
it('loads the initial preview from the import context automatically', async () => {
  mocks.context.mockResolvedValueOnce({
    data: {
      anime_id: 1,
      anime_title: 'Fixture',
      anisearch_id: '5170',
      jellyfin_series_id: 'series-main',
    },
  })

  const { result } = renderHook(() => useEpisodeImportBuilder(1))

  await waitFor(() => expect(result.current.preview).not.toBeNull())
  expect(mocks.preview).toHaveBeenCalledWith(1, {
    anisearch_id: '5170',
    jellyfin_series_id: 'series-main',
    season_offset: 0,
  })
})
  it('applies and removes only the selected pair with pair-scoped pending state', async () => {
    let resolveApply!: (value: unknown) => void
    mocks.apply.mockImplementationOnce(() => new Promise(resolve => { resolveApply = resolve }))
    const { result } = renderHook(() => useEpisodeImportBuilder(1))
    await waitFor(() => expect(result.current.isLoadingContext).toBe(false))
    await act(() => result.current.loadPreview())
    const key = JSON.stringify(['shared', 'source-b'])
    let pending!: Promise<void>
    act(() => { pending = result.current.applyRow(key) })
    expect(result.current.applyingRowId).toBe(key)
    expect(mocks.apply.mock.calls[0][1].mappings).toEqual([expect.objectContaining(preview.mappings[1])])
    await act(async () => { resolveApply({ data: {} }); await pending })
    expect(result.current.mappings.map(row => row.media_source_id)).toEqual(['source-a'])
    expect(result.current.applyingRowId).toBeNull()
  })
  it('submits both same-Item sources in a bulk apply', async () => {
    const { result } = renderHook(() => useEpisodeImportBuilder(1))
    await waitFor(() => expect(result.current.isLoadingContext).toBe(false))
    await act(() => result.current.loadPreview())
    expect(result.current.canApply).toBe(true)
    await act(() => result.current.applyMappings())
    expect(mocks.apply.mock.calls[0][1].mappings.map((row: { media_source_id: string }) => row.media_source_id)).toEqual(['source-a', 'source-b'])
  })
})
describe('GAP-12 apply error visibility (167-UAT.md)', () => {
  it('sets applyErrorMessage (not errorMessage) when applyMappings fails', async () => {
    mocks.apply.mockRejectedValueOnce(new Error('Boom'))
    const { result } = renderHook(() => useEpisodeImportBuilder(1))
    await waitFor(() => expect(result.current.isLoadingContext).toBe(false))
    await act(() => result.current.loadPreview())
    await act(() => result.current.applyMappings())
    expect(result.current.applyErrorMessage).toBe('Boom')
    expect(result.current.errorMessage).toBeNull()
  })
  it('clears a stale applyErrorMessage when a new preview loads successfully', async () => {
    mocks.apply.mockRejectedValueOnce(new Error('Boom'))
    const { result } = renderHook(() => useEpisodeImportBuilder(1))
    await waitFor(() => expect(result.current.isLoadingContext).toBe(false))
    await act(() => result.current.loadPreview())
    await act(() => result.current.applyMappings())
    expect(result.current.applyErrorMessage).toBe('Boom')
    await act(() => result.current.loadPreview())
    expect(result.current.applyErrorMessage).toBeNull()
  })
})

describe('D-01 "Ab hier" baseline uses current-vs-snapshot, not the stale page-load preview (186 review fix_1)', () => {
  // Three rows, each its own distinct source: R (the row the operator edits/clicks on),
  // R1 (shares R's original group "A" and should get swept along), R2 (a deliberately
  // different group "X" that must never be touched -- regression guard for D-01).
  const rRow = {
    media_item_id: 'item-r', media_source_id: 'src-r',
    target_episode_numbers: [1], suggested_episode_numbers: [1], status: 'confirmed' as const,
    fansub_groups: [{ name: 'A' }],
  }
  const r1Row = {
    media_item_id: 'item-r1', media_source_id: 'src-r1',
    target_episode_numbers: [2], suggested_episode_numbers: [2], status: 'confirmed' as const,
    fansub_groups: [{ name: 'A' }],
  }
  const r2Row = {
    media_item_id: 'item-r2', media_source_id: 'src-r2',
    target_episode_numbers: [3], suggested_episode_numbers: [3], status: 'confirmed' as const,
    fansub_groups: [{ name: 'X' }],
  }
  const fansubFlowPreview: EpisodeImportPreviewResult = {
    anime_id: 1, anime_title: 'Fixture', canonical_episodes: [{ episode_number: 1 }, { episode_number: 2 }, { episode_number: 3 }],
    media_candidates: [rRow, r1Row, r2Row].map((row) => ({
      media_item_id: row.media_item_id, media_source_id: row.media_source_id,
      streams_complete: true, file_name: `${row.media_source_id}.mkv`, path: '/fixture',
    })),
    mappings: [rRow, r1Row, r2Row],
  }
  const rKey = jellyfinSourceKey(rRow)
  const r1Key = jellyfinSourceKey(r1Row)
  const r2Key = jellyfinSourceKey(r2Row)

  async function renderWithFansubFlowPreview() {
    mocks.preview.mockReset().mockResolvedValue({ data: fansubFlowPreview })
    const { result } = renderHook(() => useEpisodeImportBuilder(1))
    await waitFor(() => expect(result.current.isLoadingContext).toBe(false))
    await act(() => result.current.loadPreview())
    return result
  }

  function groupsOf(result: { current: { mappings: EpisodeImportPreviewResult['mappings'] } }, key: string) {
    return result.current.mappings.find((row) => jellyfinSourceKey(row) === key)?.fansub_groups
  }

  it('"Ab hier entfernen" on a just-edited row clears the row itself (previously stuck on stale baseline)', async () => {
    const result = await renderWithFansubFlowPreview()

    // Edit R's own group from A -> B first (chip edit).
    await act(() => result.current.setSelectedFansubGroups(rKey, [{ name: 'B' }]))
    expect(groupsOf(result, rKey)).toEqual([{ name: 'B', slug: null }])

    // Then click "Ab hier entfernen" on the SAME row.
    await act(() => result.current.applyFansubGroupFromEpisode(rKey, []))

    expect(groupsOf(result, rKey)).toEqual([])
    // Regression guard: the deliberately different row is left untouched.
    expect(groupsOf(result, r2Key)).toEqual([{ name: 'X' }])
  })

  it('successive "Ab hier" clicks with manual intermediate edits each use the correct one-step-back baseline', async () => {
    const result = await renderWithFansubFlowPreview()

    // First edit: R's own group A -> B, then "Ab hier" (should sweep R1, which still holds A).
    await act(() => result.current.setSelectedFansubGroups(rKey, [{ name: 'B' }]))
    await act(() => result.current.applyFansubGroupFromEpisode(rKey, [{ name: 'B' }]))
    expect(groupsOf(result, rKey)).toEqual([{ name: 'B', slug: null }])
    expect(groupsOf(result, r1Key)).toEqual([{ name: 'B', slug: null }])

    // Second edit: R's own group B -> C, then "Ab hier" again.
    await act(() => result.current.setSelectedFansubGroups(rKey, [{ name: 'C' }]))
    await act(() => result.current.applyFansubGroupFromEpisode(rKey, [{ name: 'C' }]))

    expect(groupsOf(result, rKey)).toEqual([{ name: 'C', slug: null }])
    // R1 was set to B by the FIRST click -- the second click must correctly treat B as the
    // baseline (one-step-back memory) and sweep it to C, not get stuck comparing against the
    // original page-load value "A".
    expect(groupsOf(result, r1Key)).toEqual([{ name: 'C', slug: null }])
    // Regression guard: the deliberately different row is left untouched throughout.
    expect(groupsOf(result, r2Key)).toEqual([{ name: 'X' }])
  })

  it('"Ab hier entfernen" on a never-edited row falls back to its live/original value and still propagates', async () => {
    const result = await renderWithFansubFlowPreview()

    // No prior edits on R at all -- the ref has no entry for rKey yet.
    await act(() => result.current.applyFansubGroupFromEpisode(rKey, []))

    expect(groupsOf(result, rKey)).toEqual([])
    // R1 shared R's original value "A" and must be swept along too.
    expect(groupsOf(result, r1Key)).toEqual([])
    // Regression guard: the deliberately different row is left untouched.
    expect(groupsOf(result, r2Key)).toEqual([{ name: 'X' }])
  })
})
