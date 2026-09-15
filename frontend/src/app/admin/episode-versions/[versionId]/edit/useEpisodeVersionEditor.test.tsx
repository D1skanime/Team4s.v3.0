// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormEvent } from 'react'
import type { EpisodeVersionMediaFile } from '@/types/episodeVersion'
import { ApiError } from '@/lib/api'
const mocks = vi.hoisted(() => ({ context: vi.fn(), update: vi.fn(), scan: vi.fn(), versionId: '42' }))
vi.mock('next/navigation', () => ({ useParams: () => ({ versionId: mocks.versionId }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => ({ hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }) }))
vi.mock('@/lib/api', () => ({
  getEpisodeVersionEditorContext: mocks.context, updateEpisodeVersion: mocks.update,
  deleteEpisodeVersion: vi.fn(), getFansubList: vi.fn(), scanEpisodeVersionFolder: mocks.scan,
  ApiError: class ApiError extends Error { constructor(public status: number, message: string) { super(message) } },
}))
import { useEpisodeVersionEditor } from './useEpisodeVersionEditor'
const response = (id = 42) => ({ data: {
  anime_title: 'Fixture', selected_groups: [], date_neighbors: [],
  version: { id, variant_id: id, release_version_id: id + 900, anime_id: 1, episode_number: id,
    title: 'Eigener Titel', media_provider: 'jellyfin', media_item_id: 'fixture', media_source_id: 'source-a', production_started_on: '2013-07-18T00:00:00Z',
    release_date: '2013-07-19T00:00:00Z', created_at: '', updated_at: '' },
} })
const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>
beforeEach(() => { mocks.scan.mockReset(); mocks.versionId = '42'; mocks.context.mockReset().mockResolvedValue(response()); mocks.update.mockReset().mockResolvedValue({ data: response().data.version }) })
afterEach(cleanup)
describe('editor date save and route ownership', () => {
  it('uses the central save seam with only a refresh session and equal calendar dates', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.setFormState(form => ({ ...form, releaseDate: '2013-07-18' })))
    await act(() => result.current.handleSave(event, true))
    expect(mocks.update).toHaveBeenCalledWith(42, expect.objectContaining({ production_started_on: '2013-07-18T00:00:00.000Z', release_date: '2013-07-18T00:00:00.000Z' }))
  })
  it('does not send an invalid own date pair', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.setFormState(form => ({ ...form, releaseDate: '2013-07-17' })))
    await act(() => result.current.handleSave(event, true))
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('ignores an old context response after navigating to another release', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void
    mocks.context.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const { result, rerender } = renderHook(useEpisodeVersionEditor)
    mocks.versionId = '43'; mocks.context.mockResolvedValue(response(43)); rerender()
    await waitFor(() => expect(result.current.contextData?.version.id).toBe(43))
    await act(async () => resolveOld(response(42)))
    expect(result.current.contextData?.version.id).toBe(43)
  })
  it('ignores a late save after release navigation', async () => {
    let resolveSave!: (value: { data: ReturnType<typeof response>['data']['version'] }) => void
    mocks.update.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve }))
    const { result, rerender } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    let pending!: Promise<void>
    act(() => { pending = result.current.handleSave(event, true) })
    mocks.versionId = '43'; mocks.context.mockResolvedValue(response(43)); rerender()
    await waitFor(() => expect(result.current.contextData?.version.id).toBe(43))
    await act(async () => { resolveSave({ data: response(42).data.version }); await pending })
    expect(result.current.contextData?.version.id).toBe(43)
    expect(result.current.successMessage).toBeNull()
    expect(result.current.isSaving).toBe(false)
  })
})


describe('failed editor navigation', () => {
  it('clears previous context and prevents saving A values into failed B', async () => {
    const { result, rerender } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.contextData?.version.id).toBe(42))
    mocks.versionId = '43'; mocks.context.mockRejectedValueOnce(new Error('Kontext nicht verfügbar')); rerender()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.contextData).toBeNull()
    expect(result.current.errorMessage).toBe('Anfrage fehlgeschlagen.')
    expect(result.current.hasUnsavedChanges).toBe(false)
    await act(() => result.current.handleSave(event, true))
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

const mediaFile = (item = 'item-b', source: string | null = 'source-b'): EpisodeVersionMediaFile => ({
  media_item_id: item, media_source_id: source, file_name: 'selected.mp4', path: '/fixture/selected.mp4',
  release_name: 'Dateititel', video_quality: '1080p', stream_url: '/fixture/video-b',
})

describe('reviewed Jellyfin file selection', () => {
  it('omits binding and group fields on an ordinary full-form save', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.selectedFile?.media_source_id).toBe('source-a')
    act(() => result.current.setFormState(form => ({ ...form, title: 'Geänderter Titel' })))
    await act(() => result.current.handleSave(event))
    const patch = mocks.update.mock.calls[0][1]
    expect(patch.title).toBe('Geänderter Titel')
    for (const field of ['media_provider', 'media_item_id', 'media_source_id', 'stream_url', 'fansub_groups']) {
      expect(patch).not.toHaveProperty(field)
    }
  })
  it('submits the explicit item/source pair, keeps the title and does not repeat the relink after saving', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    mocks.update.mockResolvedValue({ data: { ...response().data.version,
      media_item_id: 'item-b', media_source_id: 'source-b', stream_url: '/fixture/video-b', video_quality: '1080p' } })
    act(() => result.current.applyFile(mediaFile()))
    expect(result.current.formState.title).toBe('Eigener Titel')
    expect(result.current.hasUnsavedChanges).toBe(true)
    await act(() => result.current.handleSave(event))
    expect(mocks.update.mock.calls[0][1]).toMatchObject({ media_provider: 'jellyfin', media_item_id: 'item-b', media_source_id: 'source-b' })
    expect(result.current.hasUnsavedChanges).toBe(false)
    await act(() => result.current.handleSave(event))
    expect(mocks.update.mock.calls[1][1]).not.toHaveProperty('media_source_id')
    expect(mocks.update.mock.calls[1][1]).not.toHaveProperty('media_item_id')
  })
  it('keeps source-only selection dirty and visible when the server reports a conflict', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.applyFile({ ...mediaFile('fixture'), video_quality: null, stream_url: null }))
    expect(result.current.hasUnsavedChanges).toBe(true)
    mocks.update.mockRejectedValue(new ApiError(409, 'Die Quellenzuordnung hat sich geändert.'))
    await act(() => result.current.handleSave(event))
    expect(mocks.update.mock.calls[0][1].media_source_id).toBe('source-b')
    expect(result.current.errorMessage).toBe('(409) Die Quellenzuordnung hat sich geändert.')
    expect(result.current.hasUnsavedChanges).toBe(true)
  })
  it('never sends file selectors through a metadata-only save', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.applyFile(mediaFile()))
    await act(() => result.current.handleSave(event, true))
    for (const field of ['media_provider', 'media_item_id', 'media_source_id', 'stream_url']) {
      expect(mocks.update.mock.calls[0][1]).not.toHaveProperty(field)
    }
    expect(result.current.hasUnsavedChanges).toBe(true)
  })
  it('does not silently replace a bound source or schedule a relink while scanning', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    mocks.scan.mockResolvedValue({ data: { files: [mediaFile('fixture', 'own-other-source')] } })
    await act(() => result.current.handleScanFolder())
    expect(result.current.selectedFile?.media_source_id).toBe('source-a')
    expect(result.current.availableFiles).toHaveLength(1)
    expect(result.current.hasUnsavedChanges).toBe(false)
    await act(() => result.current.handleSave(event))
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('media_source_id')
  })
  it('rejects an unreviewable scan file instead of inventing a source ID', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.applyFile(mediaFile('item-b', null)))
    expect(result.current.formState.mediaItemID).toBe('fixture')
    expect(result.current.errorMessage).toMatch(/Quelle/)
    expect(result.current.hasUnsavedChanges).toBe(false)
  })
  it('does not carry a selected source into another item typed in the existing advanced fields', async () => {
    const { result } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.applyFile(mediaFile()))
    act(() => result.current.setFormState(form => ({ ...form, mediaItemID: 'manual-item' })))
    await act(() => result.current.handleSave(event))
    expect(mocks.update.mock.calls[0][1].media_item_id).toBe('manual-item')
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('media_source_id')
  })
  it('ignores a late folder response after navigating to another release', async () => {
    let resolveScan!: (value: unknown) => void
    mocks.scan.mockImplementation(() => new Promise(resolve => { resolveScan = resolve }))
    const { result, rerender } = renderHook(useEpisodeVersionEditor)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    let pending!: Promise<void>
    act(() => { pending = result.current.handleScanFolder() })
    mocks.versionId = '43'; mocks.context.mockResolvedValue(response(43)); rerender()
    await waitFor(() => expect(result.current.contextData?.version.id).toBe(43))
    await act(async () => { resolveScan({ data: { files: [mediaFile()] } }); await pending })
    expect(result.current.availableFiles).toEqual([])
    expect(result.current.showFilePanel).toBe(false)
    expect(result.current.isScanning).toBe(false)
  })
})
