// @vitest-environment jsdom
//
// Plan 138-08 (CAP-08, D-16, D-17): GuidedRevokeFlow honestly explains every granting source
// before recommending a scoped deny override, never offers a fake "entziehen" action for a
// non-deniable capability, and tracks the real override-path activation status.

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

import { ApiError } from '@/lib/api'
import { GuidedRevokeFlow } from './GuidedRevokeFlow'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group.members.manage',
    allowed: true,
    provenance: 'group_role',
    decisive: true,
    non_deniable: false,
    granting_roles: ['co_leader'],
    user_allow: false,
    user_deny: false,
    specialized_grants: [],
    decisive_source: 'group_role',
    reason_code: 'group_role_grant',
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
    effective_right: makeState({ allowed: false }),
    activation_status: 'active',
    ...overrides,
  }
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  fansubGroupId: 1,
  fansubGroupName: 'Sakura-Fansub',
  appUserId: 42,
  appUserDisplayName: 'Maxine Muster',
  actionCode: 'fansub_group.members.manage',
  actionLabel: 'Mitglieder verwalten',
  onMutated: vi.fn(),
  matrix: null,
}

describe('GuidedRevokeFlow', () => {
  it('rendert bei non_deniable=true nur die Erklärung und keinen Bestätigungs-Button', () => {
    render(
      <GuidedRevokeFlow
        {...defaultProps}
        state={makeState({ non_deniable: true, decisive_source: 'platform_admin', granting_roles: [] })}
      />,
    )

    expect(screen.getByText(/nicht persönlich entzogen werden/)).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Recht entziehen' })).toBeNull()
  })

  it('listet in Schritt 1 beide granting_roles und zeigt in Schritt 2 immer "nicht mehr erlaubt"', () => {
    render(
      <GuidedRevokeFlow
        {...defaultProps}
        state={makeState({ granting_roles: ['co_leader', 'fansub_lead'] })}
      />,
    )

    expect(screen.getByText(/co_leader, fansub_lead/)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByText(/Mitglieder verwalten.*nicht mehr erlaubt/)).not.toBeNull()
  })

  it('deaktiviert den Bestätigungs-Button bei Grund "Sonstiger Grund" ohne Text und aktiviert ihn mit Text', () => {
    render(<GuidedRevokeFlow {...defaultProps} state={makeState()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    const confirmButton = screen.getByRole('button', { name: 'Recht entziehen' }) as HTMLButtonElement
    expect(confirmButton.disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('Grund'), { target: { value: 'other' } })
    expect(confirmButton.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Begründung'), { target: { value: 'Testbegründung' } })
    expect(confirmButton.disabled).toBe(false)
  })

  it('ruft mutateCapabilityOverride mit effect=deny und dem gewählten Grund auf und zeigt danach den echten activation_status', async () => {
    const result = makeMutationResult({ activation_status: 'pending' })
    mockMutateCapabilityOverride.mockResolvedValueOnce(result)
    const onMutated = vi.fn()

    render(
      <GuidedRevokeFlow {...defaultProps} onMutated={onMutated} state={makeState()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recht entziehen' }))

    await screen.findByText('Status wird geprüft — bitte Seite neu laden, um den aktuellen Stand zu sehen.')

    expect(mockMutateCapabilityOverride).toHaveBeenCalledWith(1, 42, {
      group_id: 1,
      target_user_id: 42,
      action_code: 'fansub_group.members.manage',
      effect: 'deny',
      reason: { category: 'task_delegation', text: null },
    })
    expect(onMutated).toHaveBeenCalledWith(result)
  })

  it('rendert einen Mutationsfehler inline via role=alert und bleibt in Schritt 2', async () => {
    mockMutateCapabilityOverride.mockRejectedValueOnce(new ApiError(409, 'Konflikt beim Speichern.'))

    render(<GuidedRevokeFlow {...defaultProps} state={makeState()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recht entziehen' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Konflikt beim Speichern.')
    expect(screen.queryByText(/Gespeichert/)).toBeNull()
  })

  it('bietet bei bestehendem user_deny nur "Abweichung entfernen" als Aktion und ruft effect=null auf', async () => {
    const result = makeMutationResult({ activation_status: 'active' })
    mockMutateCapabilityOverride.mockResolvedValueOnce(result)

    render(
      <GuidedRevokeFlow
        {...defaultProps}
        state={makeState({ allowed: false, user_deny: true, decisive_source: 'user_deny' })}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull()
    expect(screen.queryByText(/wird aktuell gewährt durch/)).toBeNull()

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
