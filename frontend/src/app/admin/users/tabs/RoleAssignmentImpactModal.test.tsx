// @vitest-environment jsdom
//
// Plan 138-09 (D-22, CAP-09's role-assignment sibling): RoleAssignmentImpactModal never mutates
// a role assign/revoke without a successfully computed before/after preview first.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ActionEntry, EffectiveRightState, RoleAssignmentImpactPreview } from '@/types/admin-capability'

const mockGetRoleAssignmentImpactPreview = vi.fn()
const mockUpdateFansubAppMemberRole = vi.fn()

vi.mock('@/lib/api', () => ({
  getRoleAssignmentImpactPreview: (...args: unknown[]) => mockGetRoleAssignmentImpactPreview(...args),
  updateFansubAppMemberRole: (...args: unknown[]) => mockUpdateFansubAppMemberRole(...args),
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
import { RoleAssignmentImpactModal } from './RoleAssignmentImpactModal'

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

function makePreview(overrides: Partial<RoleAssignmentImpactPreview> = {}): RoleAssignmentImpactPreview {
  return {
    target_user_id: 42,
    role_code: 'co_leader',
    change: 'assign',
    before: [makeState({ action_code: 'fansub_group.members.manage', allowed: false })],
    after: [makeState({ action_code: 'fansub_group.members.manage', allowed: true })],
    ...overrides,
  }
}

function makeActionMeta(): Map<string, ActionEntry> {
  return new Map([
    [
      'fansub_group.members.manage',
      { code: 'fansub_group.members.manage', label_de: 'Mitglieder verwalten', category: 'gruppe', sort_order: 10 },
    ],
  ])
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  fansubGroupId: 1,
  fansubGroupName: 'Sakura-Fansub',
  appUserId: 42,
  appUserDisplayName: 'Nutzer #42',
  roleCode: 'co_leader',
  roleLabel: 'Co-Leitung',
  change: 'assign' as const,
  actionMeta: makeActionMeta(),
  onMutated: vi.fn(),
}

describe('RoleAssignmentImpactModal', () => {
  it('zeigt LoadingState und deaktiviert Bestätigen, während die Vorschau lädt', async () => {
    let resolvePreview: (value: RoleAssignmentImpactPreview) => void = () => {}
    mockGetRoleAssignmentImpactPreview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePreview = resolve
      }),
    )

    render(<RoleAssignmentImpactModal {...defaultProps} />)

    expect(screen.getByText('Auswirkungs-Vorschau wird geladen …')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Rolle zuweisen' })).toHaveProperty('disabled', true)

    resolvePreview(makePreview())
    await waitFor(() => {
      expect(screen.queryByText('Auswirkungs-Vorschau wird geladen …')).toBeNull()
    })
  })

  it('zählt gewonnene/verlorene/unveränderte Rechte korrekt aus echten before/after-Arrays', async () => {
    mockGetRoleAssignmentImpactPreview.mockResolvedValueOnce(
      makePreview({
        before: [
          makeState({ action_code: 'a', allowed: false }),
          makeState({ action_code: 'b', allowed: true }),
          makeState({ action_code: 'c', allowed: true }),
        ],
        after: [
          makeState({ action_code: 'a', allowed: true }),
          makeState({ action_code: 'b', allowed: false }),
          makeState({ action_code: 'c', allowed: true }),
        ],
      }),
    )

    render(<RoleAssignmentImpactModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('In Sakura-Fansub: 1 Rechte gewonnen, 1 Rechte verloren, 1 unverändert.'),
      ).not.toBeNull()
    })
  })

  it('rendert in der Detail-Tabelle nur geänderte Aktionen, niemals den vollständigen unveränderten Katalog', async () => {
    mockGetRoleAssignmentImpactPreview.mockResolvedValueOnce(
      makePreview({
        before: [
          makeState({ action_code: 'fansub_group.members.manage', allowed: false }),
          makeState({ action_code: 'release.edit', allowed: true }),
        ],
        after: [
          makeState({ action_code: 'fansub_group.members.manage', allowed: true }),
          makeState({ action_code: 'release.edit', allowed: true }),
        ],
      }),
    )

    render(<RoleAssignmentImpactModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Mitglieder verwalten')).not.toBeNull()
    })
    expect(screen.queryByText('release.edit')).toBeNull()
  })

  it('aktiviert Bestätigen erst nach geladener Vorschau, mutiert dann korrekt und ruft onMutated/onClose auf', async () => {
    const onMutated = vi.fn()
    const onClose = vi.fn()
    mockGetRoleAssignmentImpactPreview.mockResolvedValueOnce(makePreview())
    mockUpdateFansubAppMemberRole.mockResolvedValueOnce({ data: {} })

    render(
      <RoleAssignmentImpactModal {...defaultProps} onMutated={onMutated} onClose={onClose} />,
    )

    const confirmButton = await screen.findByRole('button', { name: 'Rolle zuweisen' })
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false))

    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockUpdateFansubAppMemberRole).toHaveBeenCalledWith(1, 42, {
        role: 'co_leader',
        enabled: true,
      })
    })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('zeigt bei Vorschau-Fehler die gesperrte Fehlermeldung und deaktiviert Bestätigen dauerhaft', async () => {
    mockGetRoleAssignmentImpactPreview.mockRejectedValueOnce(
      new ApiError(500, 'interner serverfehler'),
    )

    render(<RoleAssignmentImpactModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Auswirkungs-Vorschau nicht verfügbar/)).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Rolle zuweisen' })).toHaveProperty('disabled', true)
    expect(mockUpdateFansubAppMemberRole).not.toHaveBeenCalled()
  })
})
