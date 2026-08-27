import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateEpisodeVersion } from '@/lib/api'

import { useEpisodeManagerBulkMutations } from './useEpisodeManagerBulkMutations'

vi.mock('@/lib/api', () => ({
  deleteAdminEpisode: vi.fn(),
  updateAdminEpisode: vi.fn(),
  updateEpisodeVersion: vi.fn(),
}))

describe('useEpisodeManagerBulkMutations', () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const onSuccess = vi.fn()
  const onError = vi.fn()
  const onRequest = vi.fn()
  const onResponse = vi.fn()
  const setIsApplyingBulk = vi.fn()
  const setBulkProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateEpisodeVersion).mockResolvedValue({ data: { id: 101 } } as never)
  })

  function captureMutations(): ReturnType<typeof useEpisodeManagerBulkMutations> {
    let captured: ReturnType<typeof useEpisodeManagerBulkMutations> | null = null

    function Harness() {
      // eslint-disable-next-line react-hooks/globals
      captured = useEpisodeManagerBulkMutations({
        hasAuthSession: true,
        selectedID: null,
        selectedIDs: { 10: true },
        editFormValues: { id: '', number: '', title: '', status: '', streamLink: '' },
        isApplyingBulk: false,
        isUpdating: false,
        onRefresh,
        onSuccess,
        onError,
        options: { onRequest, onResponse },
        setIsApplyingBulk,
        setBulkProgress,
        setRemovingIDs: vi.fn(),
        setSelectedIDs: vi.fn(),
        setSelectedID: vi.fn(),
        setEditFormValues: vi.fn(),
        setEditFormClearFlags: vi.fn(),
      })
      return null
    }

    renderToStaticMarkup(createElement(Harness))
    if (!captured) throw new Error('Hook capture failed')
    return captured
  }

  it('adds a selected group through existing release-version patches and reports skipped episodes', async () => {
    const mutations = captureMutations()

    await mutations.applyBulkFansubGroup(
      [
        { versionID: 101, fansubGroups: [{ id: 7 }, { id: 9 }] },
        { versionID: 102, fansubGroups: [{ id: 9 }] },
      ],
      1,
    )

    expect(updateEpisodeVersion).toHaveBeenNthCalledWith(1, 101, { fansub_groups: [{ id: 7 }, { id: 9 }] })
    expect(updateEpisodeVersion).toHaveBeenNthCalledWith(2, 102, { fansub_groups: [{ id: 9 }] })
    expect(onSuccess).toHaveBeenCalledWith('Fansub-Gruppe für 2 Release-Versionen ergänzt. 1 Folge ohne Release-Version übersprungen.')
    expect(onRefresh).toHaveBeenCalledOnce()
  })
})
