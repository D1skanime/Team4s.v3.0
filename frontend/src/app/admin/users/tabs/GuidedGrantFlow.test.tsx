// @vitest-environment jsdom
//
// Plan 138-08 (CAP-08, D-16 symmetric case): GuidedGrantFlow mirrors GuidedRevokeFlow.tsx's
// structure but has no source-explanation step and no non-deniable case -- granting an allow
// override always fully grants per precedence.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CapabilityOverrideMutationResult, EffectiveRightState } from '@/types/admin-capability'

const mockMutateCapabilityOverride = vi.fn()

vi.mock('@/lib/api', () => ({
  mutateCapabilityOverride: (...args: unknown[]) => mockMutateCapabilityOverride(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { GuidedGrantFlow } from './GuidedGrantFlow'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group.members.manage',
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

function makeMutationResult(
  overrides: Partial<CapabilityOverrideMutationResult> = {},
): CapabilityOverrideMutationResult {
  return {
    status: 'changed',
    changed: true,
    before: null,
    after: null,
    effective_right: makeState({ allowed: true }),
    activation_status: 'active',
    ...overrides,
  }
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  fansubGroupId: 1,
  appUserId: 42,
  actionCode: 'fansub_group.members.manage',
  actionLabel: 'Mitglieder verwalten',
  onMutated: vi.fn(),
}

describe('GuidedGrantFlow', () => {
  it('rendert bei state.allowed=false direkt einen Bestätigungs-Schritt ohne Quellen-Erklärung', () => {
    render(<GuidedGrantFlow {...defaultProps} state={makeState()} />)

    expect(screen.queryByText(/wird aktuell gewährt durch/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Recht zusätzlich erlauben' })).not.toBeNull()
    expect(screen.getByLabelText('Grund')).not.toBeNull()
  })

  it('ruft mutateCapabilityOverride mit effect=allow auf und zeigt danach den echten activation_status', async () => {
    const result = makeMutationResult()
    mockMutateCapabilityOverride.mockResolvedValueOnce(result)

    render(<GuidedGrantFlow {...defaultProps} state={makeState()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Recht zusätzlich erlauben' }))

    await screen.findByText('Gespeichert und sofort aktiv.')

    expect(mockMutateCapabilityOverride).toHaveBeenCalledWith(1, 42, {
      group_id: 1,
      target_user_id: 42,
      action_code: 'fansub_group.members.manage',
      effect: 'allow',
      reason: { category: 'task_delegation', text: null },
    })
  })

  it('bietet bei bestehendem user_allow "Abweichung entfernen" statt eines redundanten Grants an', async () => {
    const result = makeMutationResult()
    mockMutateCapabilityOverride.mockResolvedValueOnce(result)

    render(
      <GuidedGrantFlow
        {...defaultProps}
        state={makeState({ allowed: true, user_allow: true, decisive_source: 'user_allow' })}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Recht zusätzlich erlauben' })).toBeNull()
    const confirmButton = screen.getByRole('button', { name: 'Abweichung entfernen' })
    fireEvent.click(confirmButton)

    await screen.findByText('Gespeichert und sofort aktiv.')

    expect(mockMutateCapabilityOverride).toHaveBeenCalledWith(1, 42, {
      group_id: 1,
      target_user_id: 42,
      action_code: 'fansub_group.members.manage',
      effect: null,
      reason: { category: 'task_delegation', text: null },
    })
  })
})
