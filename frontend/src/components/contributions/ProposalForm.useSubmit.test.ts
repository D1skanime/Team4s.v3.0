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
      related_release_version_id: null,
      note: 'Rolle: Timing — Folge 3 fehlt',
    })
  })

  // D-29/D-34 (Plan 191-34): die Release-Auswahl aus Schritt 1 fliesst 1:1 in
  // related_release_version_id -- "Ganzes Projekt" (kein Release gewaehlt) bleibt null.
  it('setzt related_release_version_id auf die uebergebene Release-ID', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
      relatedReleaseVersionId: 42,
    })

    expect(payload.related_release_version_id).toBe(42)
  })

  it('laesst related_release_version_id null, wenn keine Release-ID uebergeben wird (Ganzes Projekt)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
    })

    expect(payload.related_release_version_id).toBeNull()
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

  it('bettet Von UND Bis als "Zeitraum: {von}–{bis}" ein (D-20)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
      startedYear: '2019',
      endedYear: '2021',
    })

    expect(payload.note).toBe('Zeitraum: 2019–2021')
  })

  it('bettet nur Von als "Zeitraum: ab {von}" ein, wenn Bis leer ist (D-20)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
      startedYear: '2019',
      endedYear: '',
    })

    expect(payload.note).toBe('Zeitraum: ab 2019')
  })

  it('bettet nur Bis als "Zeitraum: bis {bis}" ein, wenn Von leer ist (D-20)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
      startedYear: '',
      endedYear: '2021',
    })

    expect(payload.note).toBe('Zeitraum: bis 2021')
  })

  it('fuegt keinen "Zeitraum:"-Text ein, wenn Von UND Bis leer sind (D-20)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: null,
      note: '',
      startedYear: '',
      endedYear: '',
    })

    expect(payload.note).toBeNull()
  })

  it('ordnet Rolle, Zeitraum und Notiz in der Reihenfolge Rolle — Zeitraum — Notiz an (D-20)', () => {
    const payload = buildHintSubmitPayload({
      targetFansubGroupId: 7,
      relatedAnimeId: 99,
      roleLabelForNote: 'X',
      note: 'note text',
      startedYear: 'Y',
      endedYear: 'Z',
    })

    expect(payload.note).toBe('Rolle: X — Zeitraum: Y–Z — note text')
  })
})

describe('errorMessageForHintStatus', () => {
  // D-33 (Plan 191-34): der 409-Text unterscheidet sich danach, ob der abgewiesene Hinweis
  // ein einzelnes Release meinte (isReleaseScoped=true) oder das ganze Projekt -- beide
  // Texte sind die wörtlichen Backend-Strings aus Plan 191-32 Task 3.
  it('mappt 409 + isReleaseScoped=true auf den release-bezogenen Doppel-Hinweis-Text (D-33)', () => {
    expect(errorMessageForHintStatus(409, true)).toBe(
      'Du hast zu diesem Release bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an.',
    )
  })

  it('mappt 409 + isReleaseScoped=false auf den projekt-bezogenen Doppel-Hinweis-Text (D-33)', () => {
    expect(errorMessageForHintStatus(409, false)).toBe(
      'Du hast zu diesem Projekt bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an.',
    )
  })

  it('mappt 429 unabhaengig von isReleaseScoped auf den unveraenderten Tageslimit-Text (D-04(2))', () => {
    expect(errorMessageForHintStatus(429, true)).toBe(
      'Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.',
    )
    expect(errorMessageForHintStatus(429, false)).toBe(
      'Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.',
    )
  })

  it('gibt fuer jeden anderen Status null zurueck', () => {
    expect(errorMessageForHintStatus(500, false)).toBeNull()
    expect(errorMessageForHintStatus(403, false)).toBeNull()
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
        releaseVersionId: null,
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
      release_version_id: null,
    })
    expect(apiMocks.createFansubGroupHint).not.toHaveBeenCalled()
    expect(summary).toEqual({
      groupName: 'Testgruppe',
      animeTitle: 'Naruto',
      roleLabel: 'Übersetzung',
    })
  })

  // D-29/D-34: eine in Schritt 1 gewaehlte Release-Einschraenkung muss auf dem
  // Eigengruppen-Pfad im bereits backend-validierten release_version_id-Feld landen.
  it('leitet eine ausgewaehlte Release-ID an release_version_id weiter', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await result.current.submit({
        groupScope: 'own',
        ownGroup: { fansub_group_id: 10, fansub_group_member_id: 1, group_name: 'Testgruppe' },
        foreignGroup: null,
        anime: { id: 3, title: 'Naruto' } as never,
        roleCode: 'translator',
        roleLabel: 'Übersetzung',
        note: '',
        startedYear: '',
        endedYear: '',
        releaseVersionId: 42,
      })
    })

    expect(apiMocks.createContributionProposal).toHaveBeenCalledWith(
      expect.objectContaining({ release_version_id: 42 }),
    )
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
        releaseVersionId: null,
      })
    })

    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      target_fansub_group_id: 77,
      related_anime_id: 42,
      related_release_version_id: null,
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
        releaseVersionId: null,
      })
    })

    expect(apiMocks.createContributionProposal).not.toHaveBeenCalled()
    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith({
      target_fansub_group_id: 99,
      related_anime_id: 5,
      related_release_version_id: null,
      note: 'Rolle: Timing — Episode 12 fehlt',
    })
    expect(summary).toEqual({
      groupName: 'RedHeartFansub',
      animeTitle: 'One Piece',
      roleLabel: 'Timing',
    })
  })

  // D-29/D-34: dieselbe Release-Auswahl muss auf dem Fremdgruppen-Pfad im
  // related_release_version_id-Feld landen, das Plan 191-32 serverseitig validiert.
  it('leitet eine ausgewaehlte Release-ID an related_release_version_id weiter', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await result.current.submit({
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 99, name: 'RedHeartFansub', slug: 'redheart' } as never,
        anime: { id: 5, title: 'One Piece' } as never,
        roleCode: 'timer',
        roleLabel: 'Timing',
        note: 'Episode 12 fehlt',
        startedYear: '',
        endedYear: '',
        releaseVersionId: 152,
      })
    })

    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith(
      expect.objectContaining({ related_release_version_id: 152 }),
    )
  })

  it('mappt 409 vom fansub_group_hints-Endpunkt projekt-bezogen, wenn keine Release gewaehlt war (D-33)', async () => {
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
          releaseVersionId: null,
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe(
      'Du hast zu diesem Projekt bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an.',
    )
  })

  // D-33: dieselbe 409-Antwort wird release-bezogen gemeldet, wenn der abgewiesene Hinweis
  // eine Release-ID trug -- der Live-Call-Site leitet isReleaseScoped direkt aus
  // target.releaseVersionId ab, nicht aus einem Hardcode.
  it('mappt 409 vom fansub_group_hints-Endpunkt release-bezogen, wenn eine Release gewaehlt war (D-33)', async () => {
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
          releaseVersionId: 152,
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe(
      'Du hast zu diesem Release bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an.',
    )
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
          releaseVersionId: null,
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.')
  })

  it('forwardet startedYear/endedYear als "Zeitraum: ..."-Fragment in die Notiz (D-20)', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useProposalFormSubmit())

    await act(async () => {
      await result.current.submit({
        groupScope: 'foreign',
        ownGroup: null,
        foreignGroup: { id: 99, name: 'RedHeartFansub', slug: 'redheart' } as never,
        anime: { id: 5, title: 'One Piece' } as never,
        roleCode: 'timer',
        roleLabel: null,
        note: '',
        startedYear: '2019',
        endedYear: '2021',
        releaseVersionId: null,
      })
    })

    expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith(
      expect.objectContaining({ note: expect.stringContaining('Zeitraum: 2019–2021') }),
    )
  })

  it('priorisiert die 409-Konfliktmeldung des Eigene-Gruppe-Pfads VOR der generischen D-33-Zuordnung', async () => {
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
          releaseVersionId: null,
        }),
      ).rejects.toBeInstanceOf(ApiError)
    })

    expect(result.current.error).toBe('Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.')
  })
})
