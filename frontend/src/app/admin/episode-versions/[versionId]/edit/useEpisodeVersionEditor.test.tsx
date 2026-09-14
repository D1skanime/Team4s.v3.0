// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormEvent } from 'react'
const mocks = vi.hoisted(() => ({ context: vi.fn(), update: vi.fn(), versionId: '42' }))
vi.mock('next/navigation', () => ({ useParams: () => ({ versionId: mocks.versionId }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => ({ hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }) }))
vi.mock('@/lib/api', () => ({
  getEpisodeVersionEditorContext: mocks.context, updateEpisodeVersion: mocks.update,
  deleteEpisodeVersion: vi.fn(), getFansubList: vi.fn(), scanEpisodeVersionFolder: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
import { useEpisodeVersionEditor } from './useEpisodeVersionEditor'
const response = (id = 42) => ({ data: {
  anime_title: 'Fixture', selected_groups: [], date_neighbors: [],
  version: { id, variant_id: id, release_version_id: id + 900, anime_id: 1, episode_number: id,
    media_provider: 'jellyfin', media_item_id: 'fixture', production_started_on: '2013-07-18T00:00:00Z',
    release_date: '2013-07-19T00:00:00Z', created_at: '', updated_at: '' },
} })
const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>
beforeEach(() => { mocks.versionId = '42'; mocks.context.mockReset().mockResolvedValue(response()); mocks.update.mockReset().mockResolvedValue({ data: response().data.version }) })
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
