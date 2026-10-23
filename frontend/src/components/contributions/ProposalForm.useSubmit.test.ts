// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  WIZARD_STEPS,
  buildHintSubmitPayload,
  errorMessageForHintStatus,
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

describe('WIZARD_STEPS', () => {
  it('besteht aus genau drei Schritten: Gruppe & Projekt, Rolle, Hinweis & Zeitraum (D-09)', () => {
    expect(WIZARD_STEPS.map((step) => step.title)).toEqual(['Gruppe & Projekt', 'Rolle', 'Hinweis & Zeitraum'])
    expect(WIZARD_STEPS.map((step) => step.id)).toEqual([1, 2, 3])
  })
})

describe('buildHintSubmitPayload', () => {
  it('baut related_anime_id und bettet die Rolle als Klartext in die Notiz ein', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: 'Timing',
      note: 'Folge 3 fehlt',
    })

    expect(payload).toEqual({
      target_fansub_group_id: 7,
      related_anime_id: 99,
      note: 'Rolle: Timing — Folge 3 fehlt',
    })
  })

  it('laesst die Notiz ohne Rolle/Text leer (null statt leerer String)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
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

describe('useProposalFormSubmit — Regression: unveraenderter Eigene-Gruppe-Pfad', () => {
  it('ruft createContributionProposal mit dem identischen Payload-Shape wie vor Plan 191-07 auf', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const { result } = renderHook(() => useProposalFormSubmit())

    let summary
    await act(async () => {
      summary = await result.current.submit({
        groupScope: 'own',
        ownGroup: { fansub_group_id: 10, fansub_group_member_id: 1, group_name: 'Testgruppe' },
        foreignGroup: null,
        anime: { id: 3, title: 'Naruto' } as never,
        roleCode: 'translator',
        roleLabel: 'Übersetzung',
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
      groupName: 'Testgruppe',
      animeTitle: 'Naruto',
      roleLabel: 'Übersetzung',
    })
  })
})

// D-12 (Plan 191-18 Vorbereitung): der neue Vorauswahl-Einstiegspunkt kennt die Zielgruppe
// nur als schmales {id, name} aus dem Seiten-Context (PrefillTargetGroup), nicht als volles
// FansubGroup mit Slug -- useProposalFormSubmit darf dafuer keinen Slug voraussetzen.
describe('useProposalFormSubmit — PrefillTargetGroup ohne slug (D-12-Vorbereitung)', () => {
  it('akzeptiert ein foreignGroup-Objekt ohne slug (nur id/name) und sendet trotzdem korrekt', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    let summary
    await act(async () => {
      summary = await result.current.submit({
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 77, name: 'StrawhatSubs' },
        anime: { id: 42, title: 'One Piece' },
        roleCode: 'timer',
        roleLabel: 'Timing',
        note: 'Folge 3 fehlt',
        startedYear: '',
        endedYear: '',
      })
    })

    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      target_fansub_group_id: 77,
      related_anime_id: 42,
      note: 'Rolle: Timing — Folge 3 fehlt',
    })
    expect(summary).toEqual({
      groupName: 'StrawhatSubs',
      animeTitle: 'One Piece',
      roleLabel: 'Timing',
    })
  })
})

describe('useProposalFormSubmit — Korrektur an eine fremde Gruppe (fansub_group_hints)', () => {
  it('ruft createFansubGroupHint statt createContributionProposal auf', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    let summary
    await act(async () => {
      summary = await result.current.submit({
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 99, name: 'RedHeartFansub', slug: 'redheart' } as never,
        anime: { id: 5, title: 'One Piece' } as never,
        roleCode: 'timer',
        roleLabel: 'Timing',
        note: 'Episode 12 fehlt',
        startedYear: '',
        endedYear: '',
      })
    })

    expect(apiMocks.createContributionProposal).not.toHaveBeenCalled()
    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      target_fansub_group_id: 99,
      related_anime_id: 5,
      note: 'Rolle: Timing — Episode 12 fehlt',
    })
    expect(summary).toEqual({
      groupName: 'RedHeartFansub',
      animeTitle: 'One Piece',
      roleLabel: 'Timing',
    })
  })

  it('mappt 409 vom fansub_group_hints-Endpunkt auf den D-04(1)-Text', async () => {
    const { ApiError } = await import('@/lib/api')
    apiMocks.createFansubGroupHint.mockRejectedValue(new ApiError(409, 'conflict'))
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await expect(
        result.current.submit({
          groupScope: 'foreign',
          ownGroup: null,
          foreignGroup: { id: 7, name: 'NewSubs', slug: 'newsubs' } as never,
          anime: { id: 1, title: 'Bleach' } as never,
          roleCode: 'timer',
          roleLabel: 'Timing',
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
          groupScope: 'foreign',
          ownGroup: null,
          foreignGroup: { id: 7, name: 'NewSubs', slug: 'newsubs' } as never,
          anime: { id: 1, title: 'Bleach' } as never,
          roleCode: 'timer',
          roleLabel: 'Timing',
          note: '',
          startedYear: '',
          endedYear: '',
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.')
  })

  it('priorisiert die 409-Konfliktmeldung des Eigene-Gruppe-Pfads VOR der generischen D-04(1)-Zuordnung', async () => {
    const { ApiError } = await import('@/lib/api')
    apiMocks.createContributionProposal.mockRejectedValue(
      new ApiError(409, 'Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.'),
    )
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await expect(
        result.current.submit({
          groupScope: 'own',
          ownGroup: { fansub_group_id: 10, fansub_group_member_id: 1, group_name: 'Testgruppe' },
          foreignGroup: null,
          anime: { id: 3, title: 'Naruto' } as never,
          roleCode: 'translator',
          roleLabel: 'Übersetzung',
          note: '',
          startedYear: '',
          endedYear: '',
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.')
  })
})
