// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAnimeEditAssetSearch } from './useAnimeEditAssetSearch'

const searchMock = vi.fn()
const stageMock = vi.fn()

vi.mock('@/lib/api/admin-anime-intake', () => ({
  searchAdminAnimeCreateAssetCandidates: (...args: unknown[]) => searchMock(...args),
}))

vi.mock('../create/createAssetUploadPlan', () => ({
  stageRemoteCreateAssetCandidate: (...args: unknown[]) => stageMock(...args),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function candidate(id: string) {
  return { id, preview_url: `https://example.test/${id}.jpg`, label: id }
}

function setup() {
  const onError = vi.fn()
  const refreshAssetContext = vi.fn().mockResolvedValue(undefined)
  const uploadAndLinkAsset = vi.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() =>
    useAnimeEditAssetSearch({
      patch: { uploadAndLinkAsset },
      animeID: 13,
      onError,
      refreshAssetContext,
    }),
  )
  return { result, onError, refreshAssetContext, uploadAndLinkAsset }
}

describe('useAnimeEditAssetSearch', () => {
  it('requires an active search kind before searching', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.handleAssetCandidateSearch()
    })

    expect(result.current.assetSearchErrorMessage).toBe('Bitte zuerst einen Asset-Slot wählen.')
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('requires a non-empty query before searching', async () => {
    const { result } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('cover')
    })

    await act(async () => {
      await result.current.handleAssetCandidateSearch()
    })

    expect(result.current.assetSearchErrorMessage).toBe('Bitte zuerst einen Suchbegriff eingeben.')
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('searches and populates candidates on success', async () => {
    searchMock.mockResolvedValue({ data: [candidate('a'), candidate('b')] })
    const { result } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('cover')
      result.current.setAssetSearchQuery('freezing')
    })

    await act(async () => {
      await result.current.handleAssetCandidateSearch()
    })

    expect(searchMock).toHaveBeenCalledWith({
      asset_kind: 'cover',
      query: 'freezing',
      limit: 8,
      page: 1,
    })
    expect(result.current.assetSearchCandidates).toHaveLength(2)
    expect(result.current.assetSearchHasMore).toBe(false)
  })

  it('single-select for non-background kinds replaces the previous selection', () => {
    const { result } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('cover')
    })
    act(() => {
      result.current.toggleAssetCandidateSelection('a')
    })
    expect(result.current.assetSearchSelectedIDs).toEqual(['a'])
    act(() => {
      result.current.toggleAssetCandidateSelection('b')
    })
    expect(result.current.assetSearchSelectedIDs).toEqual(['b'])
    act(() => {
      result.current.toggleAssetCandidateSelection('b')
    })
    expect(result.current.assetSearchSelectedIDs).toEqual([])
  })

  it('multi-select for background accumulates and removes individually', () => {
    const { result } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('background')
    })
    act(() => {
      result.current.toggleAssetCandidateSelection('a')
    })
    act(() => {
      result.current.toggleAssetCandidateSelection('b')
    })
    expect(result.current.assetSearchSelectedIDs).toEqual(['a', 'b'])
    act(() => {
      result.current.toggleAssetCandidateSelection('a')
    })
    expect(result.current.assetSearchSelectedIDs).toEqual(['b'])
  })

  it('adopts selected candidates via stage+upload, refreshes context, and closes the dialog', async () => {
    searchMock.mockResolvedValue({ data: [candidate('a')] })
    stageMock.mockResolvedValue({ file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }) })
    const { result, refreshAssetContext, uploadAndLinkAsset } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('cover')
      result.current.setAssetSearchQuery('freezing')
    })
    await act(async () => {
      await result.current.handleAssetCandidateSearch()
    })
    act(() => {
      result.current.toggleAssetCandidateSelection('a')
    })

    await act(async () => {
      await result.current.handleAssetCandidateAdoption()
    })

    expect(stageMock).toHaveBeenCalledWith(candidate('a'))
    expect(uploadAndLinkAsset).toHaveBeenCalledWith(expect.any(File), 'cover', 13)
    await waitFor(() => expect(refreshAssetContext).toHaveBeenCalledTimes(1))
    expect(result.current.activeAssetSearchKind).toBeNull()
  })

  it('reports an error via onError and does not adopt when nothing is selected', async () => {
    const { result, onError, uploadAndLinkAsset } = setup()

    act(() => {
      result.current.setActiveAssetSearchKind('cover')
    })

    await act(async () => {
      await result.current.handleAssetCandidateAdoption()
    })

    expect(result.current.assetSearchErrorMessage).toBe('Bitte zuerst mindestens ein Asset auswählen.')
    expect(uploadAndLinkAsset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
