// @vitest-environment jsdom
//
// Plan 138-14 (D-24): ClaimDecisionImpactPanel never fabricates a rights diff for
// VerifyClaim/RejectClaim (neither changes effective rights), and only previews the real
// ActivateClaimedMember activation.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ClaimActivationImpactPreview, EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'

const mockGetClaimActivationImpactPreview = vi.fn()
const mockListRoleCapabilities = vi.fn()
const mockActivateClaimedMember = vi.fn()
const mockVerifyMemberClaim = vi.fn()
const mockRejectMemberClaim = vi.fn()

vi.mock('@/lib/api', () => ({
  getClaimActivationImpactPreview: (...args: unknown[]) => mockGetClaimActivationImpactPreview(...args),
  listRoleCapabilities: (...args: unknown[]) => mockListRoleCapabilities(...args),
  activateClaimedMember: (...args: unknown[]) => mockActivateClaimedMember(...args),
  verifyMemberClaim: (...args: unknown[]) => mockVerifyMemberClaim(...args),
  rejectMemberClaim: (...args: unknown[]) => mockRejectMemberClaim(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { ApiError } from '@/lib/api'
import { ClaimDecisionImpactPanel } from './ClaimDecisionImpactPanel'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group.media.upload',
    allowed: false,
    provenance: 'no_grant',
    decisive: true,
    non_deniable: false,
    granting_roles: [],
    user_allow: false,
    user_deny: false,
    specialized_grants: [],
    decisive_source: 'no_grant',
    reason_code: 'no_grant',
    ...overrides,
  }
}

function makePreview(overrides: Partial<ClaimActivationImpactPreview> = {}): ClaimActivationImpactPreview {
  return {
    target_app_user_id: 55,
    role_codes: ['fansub_lead'],
    before: [makeState({ action_code: 'fansub_group.media.upload', allowed: false })],
    after: [makeState({ action_code: 'fansub_group.media.upload', allowed: true })],
    ...overrides,
  }
}

function makeMatrix(): RoleCapabilityMatrix {
  return {
    roles: [],
    all_actions: [
      { code: 'fansub_group.media.upload', label_de: 'Medien hochladen', category: 'gruppe', sort_order: 10 },
    ],
  }
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  fansubGroupId: 1,
  memberId: 9,
  claimId: 77,
  appUserDisplayName: 'Nutzer #55',
  onDecided: vi.fn(),
}

describe('ClaimDecisionImpactPanel', () => {
  it('rendert für "verify" die gesperrte Ehrlichkeits-Copy ohne Vorschau-Fetch und ruft verifyMemberClaim auf', async () => {
    render(<ClaimDecisionImpactPanel {...defaultProps} decision="verify" />)

    expect(screen.getByText('Diese Entscheidung ändert keine effektiven Rechte.')).not.toBeNull()
    expect(mockGetClaimActivationImpactPreview).not.toHaveBeenCalled()

    const confirmButton = screen.getByRole('button', { name: 'Bestätigen' })
    expect(confirmButton).toHaveProperty('disabled', false)

    mockVerifyMemberClaim.mockResolvedValueOnce(undefined)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockVerifyMemberClaim).toHaveBeenCalledWith(1, 77)
    })
    expect(defaultProps.onDecided).toHaveBeenCalledTimes(1)
  })

  it('rendert für "reject" die gesperrte Copy ohne Vorschau-Fetch und ruft rejectMemberClaim auf', async () => {
    const onDecided = vi.fn()
    render(<ClaimDecisionImpactPanel {...defaultProps} decision="reject" onDecided={onDecided} />)

    expect(
      screen.getByText('Ablehnen: Es entsteht keine neue Zuordnung. Nutzer #55 bleibt im aktuellen Zustand.'),
    ).not.toBeNull()
    expect(mockGetClaimActivationImpactPreview).not.toHaveBeenCalled()

    mockRejectMemberClaim.mockResolvedValueOnce(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Ablehnen' }))

    await waitFor(() => {
      expect(mockRejectMemberClaim).toHaveBeenCalledWith(1, 77)
    })
    expect(onDecided).toHaveBeenCalledTimes(1)
  })

  it('lädt für "activate" eine echte Vorschau und rendert eine Tabelle gewonnener Rechte vor Freigabe des Bestätigen-Buttons', async () => {
    mockGetClaimActivationImpactPreview.mockResolvedValueOnce(makePreview())
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())

    render(<ClaimDecisionImpactPanel {...defaultProps} decision="activate" />)

    expect(screen.getByText('Auswirkungs-Vorschau wird geladen …')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Übernehmen' })).toHaveProperty('disabled', true)

    await waitFor(() => {
      expect(screen.getByText('Medien hochladen')).not.toBeNull()
    })
    expect(mockGetClaimActivationImpactPreview).toHaveBeenCalledWith(1, 9)

    const confirmButton = screen.getByRole('button', { name: 'Übernehmen' })
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false))

    mockActivateClaimedMember.mockResolvedValueOnce(undefined)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockActivateClaimedMember).toHaveBeenCalledWith(1, 9)
    })
  })

  it('sperrt "Übernehmen" dauerhaft, wenn die Vorschau-Berechnung fehlschlägt', async () => {
    mockGetClaimActivationImpactPreview.mockRejectedValueOnce(new ApiError(500, 'interner serverfehler'))
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())

    render(<ClaimDecisionImpactPanel {...defaultProps} decision="activate" />)

    await waitFor(() => {
      expect(screen.getByText(/Auswirkungs-Vorschau nicht verfügbar/)).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Übernehmen' })).toHaveProperty('disabled', true)
    expect(mockActivateClaimedMember).not.toHaveBeenCalled()
  })
})
