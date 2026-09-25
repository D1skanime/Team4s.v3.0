// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EpisodeImportPreviewResult } from '@/types/episodeImport'
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
