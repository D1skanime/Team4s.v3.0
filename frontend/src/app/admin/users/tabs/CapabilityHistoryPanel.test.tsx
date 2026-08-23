// @vitest-environment jsdom
//
// Plan 138-08 (D-13b): CapabilityHistoryPanel is a compact inline per-capability override
// history in the row-expansion area -- it filters a shared group history page down to exactly
// one capability, and never replaces the later central "Änderungen" workspace.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { CapabilityOverrideAuditItem } from '@/types/admin-capability'

const mockListOverrideHistory = vi.fn()

vi.mock('@/lib/api', () => ({
  listOverrideHistory: (...args: unknown[]) => mockListOverrideHistory(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { CapabilityHistoryPanel } from './CapabilityHistoryPanel'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeAuditItem(overrides: Partial<CapabilityOverrideAuditItem> = {}): CapabilityOverrideAuditItem {
  return {
    id: 1,
    group_id: 1,
    target_user_id: 42,
    action_code: 'fansub_group.members.manage',
    actor_user_id: 7,
    occurred_at: '2026-08-20T10:00:00Z',
    before: null,
    after: {
      group_id: 1,
      target_user_id: 42,
      action_code: 'fansub_group.members.manage',
      effect: 'deny',
      reason: { category: 'task_delegation', text: null },
      created_by_user_id: 7,
      created_at: '2026-08-20T10:00:00Z',
    },
    reason: { category: 'task_delegation', text: null },
    ...overrides,
  }
}

describe('CapabilityHistoryPanel', () => {
  it('rendert bei leerer Historie einen kompakten EmptyState statt einer kaputten Tabelle', async () => {
    mockListOverrideHistory.mockResolvedValueOnce([])

    render(<CapabilityHistoryPanel fansubGroupId={1} appUserId={42} actionCode="fansub_group.members.manage" />)

    await waitFor(() => {
      expect(screen.getByText('Keine Änderungen für dieses Recht.')).not.toBeNull()
    })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('rendert Vorher/Nachher, Grund (deutsch) und Akteur/Zeitpunkt je Eintrag', async () => {
    mockListOverrideHistory.mockResolvedValueOnce([makeAuditItem()])

    render(<CapabilityHistoryPanel fansubGroupId={1} appUserId={42} actionCode="fansub_group.members.manage" />)

    await waitFor(() => {
      expect(screen.getByText('Entzogen')).not.toBeNull()
    })
    expect(screen.getByText('Aufgabenübertragung')).not.toBeNull()
    expect(screen.getByText('7')).not.toBeNull()
  })

  it('filtert die Ergebnisse von listOverrideHistory auf den aktuellen action_code, bevor gerendert wird', async () => {
    mockListOverrideHistory.mockResolvedValueOnce([
      makeAuditItem({ id: 1, action_code: 'fansub_group.members.manage' }),
      makeAuditItem({ id: 2, action_code: 'release.edit' }),
    ])

    render(<CapabilityHistoryPanel fansubGroupId={1} appUserId={42} actionCode="fansub_group.members.manage" />)

    await waitFor(() => {
      expect(screen.getAllByText('Entzogen').length).toBe(1)
    })
    expect(mockListOverrideHistory).toHaveBeenCalledWith(1, 42, 10, 0)
  })
})
