// @vitest-environment jsdom
/**
 * Test für GroupRolesSection.tsx (260824-ike Task 3, Defekt 3).
 *
 * Der "Was darf diese Rolle?"-Link muss immer auf den Standardrechte-Tab zielen
 * (tab=caps), nicht auf den rollenart-abhängigen Default (der für co_leader "holders"
 * wäre) -- diese Sektion beantwortet ausschließlich "was darf diese Rolle".
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupRolesSection } from './GroupRolesSection'
import type { AdminGroupMembershipSummary } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'

const matrix: RoleCapabilityMatrix = {
  roles: [
    {
      role_code: 'co_leader',
      label_de: 'Co-Leader',
      assignable: true,
      capability_editable: true,
      contexts: ['fansub_group'],
      actions: [],
    },
  ],
  all_actions: [],
}

const membership: AdminGroupMembershipSummary = {
  fansub_group_id: 5,
  fansub_group_name: 'New-Subs',
  member_status: 'active',
  roles: ['co_leader'],
  joined_at: '2026-01-01T00:00:00Z',
}

describe('GroupRolesSection', () => {
  it('"Was darf diese Rolle?"-Link zeigt auf &tab=caps, nicht den rollenart-abhängigen Default', () => {
    render(
      <GroupRolesSection
        membership={membership}
        matrix={matrix}
        onOpenRoleAssignment={vi.fn()}
      />,
    )
    const link = screen.getByRole('link', { name: 'Rechte der Rolle co_leader ansehen' })
    expect(link.getAttribute('href')).toBe('/admin/roles?role=co_leader&tab=caps')
  })
})
