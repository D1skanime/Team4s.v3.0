// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'
import type { FansubGroupCapabilitiesResponse } from '@/types/fansub'

const getAnimeFansubProjectTimelineMock = vi.fn()
const updateAnimeFansubProjectTimelineMock = vi.fn()
const getFansubGroupCapabilitiesMock = vi.fn()

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
  getAnimeFansubProjectTimeline: (...args: unknown[]) =>
    getAnimeFansubProjectTimelineMock(...args),
  updateAnimeFansubProjectTimeline: (...args: unknown[]) =>
    updateAnimeFansubProjectTimelineMock(...args),
  getFansubGroupCapabilities: (...args: unknown[]) =>
    getFansubGroupCapabilitiesMock(...args),
}))

import { AnimeProjectTimelineSection } from './AnimeProjectTimelineSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeTimeline(
  overrides: Partial<AnimeFansubProjectTimeline> = {},
): AnimeFansubProjectTimeline {
  return {
    animeId: 9,
    fansubGroupId: 88,
    productionStartedOn: null,
    productionCompletedOn: null,
    ...overrides,
  }
}

function makeCapabilitiesResponse(
  canEditProjectTimeline: boolean,
): FansubGroupCapabilitiesResponse {
  return {
    data: {
      can_edit_group: false,
      can_edit_group_general: false,
      can_edit_technical_links: false,
      can_edit_founding_history: false,
      can_update_group_links: false,
      can_manage_links: false,
      can_view_members: false,
      can_manage_members: false,
      can_manage_historical_members: false,
      can_manage_historical_roles: false,
      can_link_historical_members: false,
      can_edit_notes: false,
      can_edit_project_timeline: canEditProjectTimeline,
      can_edit_project_notes: false,
      can_view_invitations: false,
      can_create_invitation: false,
      can_cancel_invitation: false,
      can_view_releases: false,
      can_view_release_media: false,
      can_upload_release_media: false,
      can_edit_release_notes: false,
      can_view_group_media: false,
      can_upload_group_media: false,
      can_update_group_media: false,
      can_review_group_media: false,
      can_review_text: false,
      can_update_own_group_media: false,
      can_delete_own_group_media: false,
      can_delete_group_media: false,
      can_reorder_group_media: false,
    },
  }
}

describe('AnimeProjectTimelineSection', () => {
  it('schaltet die Datumsfelder frei, wenn die projektbezogene Capability dies erlaubt, auch bei canEdit=false', async () => {
    getAnimeFansubProjectTimelineMock.mockResolvedValue(makeTimeline())
    getFansubGroupCapabilitiesMock.mockResolvedValue(makeCapabilitiesResponse(true))

    render(
      <AnimeProjectTimelineSection fansubId={88} animeId={9} expanded canEdit={false} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalledWith(88, undefined, {
        animeId: 9,
      })
    })

    await waitFor(() => {
      const startInput = screen.getByLabelText(/projekt begonnen am/i) as HTMLButtonElement
      expect(startInput.disabled).toBe(false)
    })
    expect(screen.getByRole('button', { name: /projektzeitraum speichern/i })).not.toBeNull()
  })

  it('bleibt bei canEdit=true und einer verweigernden projektbezogenen Capability gesperrt', async () => {
    getAnimeFansubProjectTimelineMock.mockResolvedValue(makeTimeline())
    getFansubGroupCapabilitiesMock.mockResolvedValue(makeCapabilitiesResponse(false))

    render(
      <AnimeProjectTimelineSection fansubId={88} animeId={9} expanded canEdit={true} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      const startInput = screen.getByLabelText(/projekt begonnen am/i) as HTMLButtonElement
      expect(startInput.disabled).toBe(true)
    })
  })

  it('fällt bei fehlgeschlagenem Capability-Abruf auf die canEdit-Prop zurück', async () => {
    getAnimeFansubProjectTimelineMock.mockResolvedValue(makeTimeline())
    getFansubGroupCapabilitiesMock.mockRejectedValue(new Error('network down'))

    render(
      <AnimeProjectTimelineSection fansubId={88} animeId={9} expanded canEdit={true} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      const startInput = screen.getByLabelText(/projekt begonnen am/i) as HTMLButtonElement
      expect(startInput.disabled).toBe(false)
    })
  })
})
