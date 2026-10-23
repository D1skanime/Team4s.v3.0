// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildHintSubmitPayload,
  errorMessageForHintStatus,
  stepsForHintType,
  useProposalFormSubmit,
} from './ProposalForm.useSubmit'

const apiMocks = vi.hoisted(() => ({
  createContributionProposal: vi.fn(),
  createFansubGroupHint: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  createContributionProposal: apiMocks.createContributionProposal,
  createFansubGroupHint: apiMocks.createFansubGroupHint,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('stepsForHintType', () => {
  it('liefert bei Korrektur die Titel "Gruppe & Projekt"/"Hinweis & Zeitraum"', () => {
    const steps = stepsForHintType('correction')
    expect(steps.map((step) => step.title)).toEqual(['Hinweisart', 'Gruppe & Projekt', 'Rolle', 'Hinweis & Zeitraum'])
  })

  it('liefert bei Mitgliedschaftsanfrage die schlankeren Titel "Gruppe"/"Hinweis"', () => {
    const steps = stepsForHintType('membership_request')
    expect(steps.map((step) => step.title)).toEqual(['Hinweisart', 'Gruppe', 'Rolle', 'Hinweis'])
  })

  it('liefert vor der Hinweisart-Wahl (leerer String) ebenfalls 4 Schritte, ohne zu werfen', () => {
    expect(stepsForHintType('')).toHaveLength(4)
  })
})

describe('buildHintSubmitPayload', () => {
  it('baut bei Mitgliedschaftsanfrage requested_role_code und note, ohne related_anime_id', () => {
    const payload = buildHintSubmitPayload({
      hintType: 'membership_request',
      targetFansubGroupId: 42,
      requestedRoleCode: 'fansub_lead',
      note: '  Bitte prüfen  ',
    })

    expect(payload).toEqual({
      hint_type: 'membership_request',
      target_fansub_group_id: 42,
      requested_role_code: 'fansub_lead',
      note: 'Bitte prüfen',
    })
  })

  it('setzt requested_role_code auf null, wenn keine Rolle gewünscht wurde', () => {
    const payload = buildHintSubmitPayload({
      hintType: 'membership_request',
      targetFansubGroupId: 42,
      requestedRoleCode: '',
      note: '',
    })

    expect(payload.requested_role_code).toBeNull()
    expect(payload.note).toBeNull()
  })

  it('baut bei Korrektur related_anime_id statt eines Rollenfelds und bettet die Rolle als Klartext in die Notiz ein', () => {
    const payload = buildHintSubmitPayload({
      hintType: 'correction',
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: 'Timing',
      note: 'Folge 3 fehlt',
    })

    expect(payload).toEqual({
      hint_type: 'correction',
      target_fansub_group_id: 7,
      related_anime_id: 99,
      note: 'Rolle: Timing — Folge 3 fehlt',
    })
    expect(payload).not.toHaveProperty('requested_role_code')
  })

  it('laesst die Notiz bei Korrektur ohne Rolle/Text leer (null statt leerer String)', () => {
    const payload = buildHintSubmitPayload({
      hintType: 'correction',
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      note: '',
    })

    expect(payload.note).toBeNull()
  })
})

describe('errorMessageForHintStatus', () => {
  it('mappt 409 auf den verbindlichen Doppel-Hinweis-Text (D-04(1))', () => {
    expect(errorMessageForHintStatus(409)).toBe('Du hast dazu bereits einen offenen Hinweis.')
  })

  it('mappt 429 auf den verbindlichen Tageslimit-Text (D-04(2))', () => {
    expect(errorMessageForHintStatus(429)).toBe(
      'Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.',
    )
  })

  it('gibt fuer jeden anderen Status null zurueck', () => {
    expect(errorMessageForHintStatus(500)).toBeNull()
    expect(errorMessageForHintStatus(403)).toBeNull()
  })
})

describe('useProposalFormSubmit — Regression: unveraenderter Korrektur/Eigene-Gruppe-Pfad', () => {
  it('ruft createContributionProposal mit dem identischen Payload-Shape wie vor Plan 191-07 auf', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const { result } = renderHook(() => useProposalFormSubmit())

    let summary
    await act(async () => {
      summary = await result.current.submit({
        hintType: 'correction',
        groupScope: 'own',
        ownGroup: { fansub_group_id: 10, fansub_group_member_id: 1, group_name: 'Testgruppe' },
        foreignGroup: null,
        anime: { id: 3, title: 'Naruto' } as never,
        roleCode: 'translator',
        roleLabel: 'Übersetzung',
        requestedRoleCode: '',
        requestedRoleLabel: null,
        note: '',
        startedYear: '',
        endedYear: '',
      })
    })

    expect(apiMocks.createContributionProposal).toHaveBeenCalledWith({
      fansub_group_id: 10,
      anime_id: 3,
      fansub_group_member_id: 1,
      role_codes: ['translator'],
      note: null,
      started_year: null,
      ended_year: null,
    })
    expect(apiMocks.createFansubGroupHint).not.toHaveBeenCalled()
    expect(summary).toEqual({
      hintType: 'correction',
      groupName: 'Testgruppe',
      animeTitle: 'Naruto',
      roleLabel: 'Übersetzung',
    })
  })
})

describe('useProposalFormSubmit — neue Pfade ueber fansub_group_hints', () => {
  it('Korrektur an eine fremde Gruppe ruft createFansubGroupHint statt createContributionProposal', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await result.current.submit({
        hintType: 'correction',
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 99, name: 'RedHeartFansub', slug: 'redheart' } as never,
        anime: { id: 5, title: 'One Piece' } as never,
        roleCode: 'timer',
        roleLabel: 'Timing',
        requestedRoleCode: '',
        requestedRoleLabel: null,
        note: 'Episode 12 fehlt',
        startedYear: '',
        endedYear: '',
      })
    })

    expect(apiMocks.createContributionProposal).not.toHaveBeenCalled()
    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      hint_type: 'correction',
      target_fansub_group_id: 99,
      related_anime_id: 5,
      note: 'Rolle: Timing — Episode 12 fehlt',
    })
  })

  it('Mitgliedschaftsanfrage ruft createFansubGroupHint mit requested_role_code auf', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    let summary
    await act(async () => {
      summary = await result.current.submit({
        hintType: 'membership_request',
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 7, name: 'NewSubs', slug: 'newsubs' } as never,
        anime: null,
        roleCode: '',
        roleLabel: null,
        requestedRoleCode: 'fansub_lead',
        requestedRoleLabel: 'Fansub-Leitung',
        note: '',
        startedYear: '',
        endedYear: '',
      })
    })

    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      hint_type: 'membership_request',
      target_fansub_group_id: 7,
      requested_role_code: 'fansub_lead',
      note: null,
    })
    expect(summary).toEqual({
      hintType: 'membership_request',
      groupName: 'NewSubs',
      animeTitle: null,
      roleLabel: 'Fansub-Leitung',
    })
  })

  it('mappt 409 vom fansub_group_hints-Endpunkt auf den D-04(1)-Text', async () => {
    const { ApiError } = await import('@/lib/api')
    apiMocks.createFansubGroupHint.mockRejectedValue(new ApiError(409, 'conflict'))
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await expect(
        result.current.submit({
          hintType: 'membership_request',
          groupScope: 'foreign',
          ownGroup: null,
          foreignGroup: { id: 7, name: 'NewSubs', slug: 'newsubs' } as never,
          anime: null,
          roleCode: '',
          roleLabel: null,
          requestedRoleCode: '',
          requestedRoleLabel: null,
          note: '',
          startedYear: '',
          endedYear: '',
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Du hast dazu bereits einen offenen Hinweis.')
  })

  it('mappt 429 vom fansub_group_hints-Endpunkt auf den D-04(2)-Text', async () => {
    const { ApiError } = await import('@/lib/api')
    apiMocks.createFansubGroupHint.mockRejectedValue(new ApiError(429, 'too many'))
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await expect(
        result.current.submit({
          hintType: 'membership_request',
          groupScope: 'own',
          ownGroup: { fansub_group_id: 10, fansub_group_member_id: 1, group_name: 'Testgruppe' },
          foreignGroup: null,
          anime: null,
          roleCode: '',
          roleLabel: null,
          requestedRoleCode: '',
          requestedRoleLabel: null,
          note: '',
          startedYear: '',
          endedYear: '',
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.')
  })
})
