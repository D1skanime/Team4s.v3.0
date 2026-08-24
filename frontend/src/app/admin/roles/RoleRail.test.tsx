// @vitest-environment jsdom
/**
 * Tests für RoleRail.tsx (Quick 260824-ek3 Task 2, GAP-04/D-08 TDD).
 *
 * Test 1: Registry-getriebene Gruppierung (Globale Rollen / Gruppenrollen)
 * Test 2: Genau ein role="button"-Element pro Zeile, gesamte Zeile klickbar
 * Test 3: aria-current an der ausgewählten Zeile
 * Test 4: Inhaberzahl-Text (N× / –)
 * Test 5: data-role-code je Zeile
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoleRail } from './RoleRail'
import type { RoleEntry } from '@/types/admin-capability'

const platformAdmin: RoleEntry = {
  role_code: 'platform_admin',
  label_de: 'Plattform-Admin',
  role_kind: 'global_app_role',
  global_assignment_count: 5,
  actions: [],
}

const contentAdmin: RoleEntry = {
  role_code: 'content_admin',
  label_de: 'Content-Admin',
  role_kind: 'global_app_role',
  global_assignment_count: 0,
  actions: [],
}

const coLeader: RoleEntry = {
  role_code: 'co_leader',
  label_de: 'Co-Leader',
  assignable: true,
  capability_editable: true,
  contexts: ['fansub_group'],
  actions: [],
}

describe('RoleRail', () => {
  it('rendert genau zwei Gruppenüberschriften (Globale Rollen / Gruppenrollen) in dieser Reihenfolge', () => {
    render(
      <RoleRail
        roles={[platformAdmin, contentAdmin, coLeader]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />,
    )
    const headings = screen.getAllByText(/Globale Rollen|Gruppenrollen/)
    expect(headings.map((h) => h.textContent)).toEqual(['Globale Rollen', 'Gruppenrollen'])

    const list = screen.getByRole('list', { name: 'Rollenliste' })
    expect(within(list).getByText('Plattform-Admin')).toBeTruthy()
    expect(within(list).getByText('Content-Admin')).toBeTruthy()
    expect(within(list).getByText('Co-Leader')).toBeTruthy()
  })

  it('rendert pro Rollenzeile genau ein role="button"-Element, gesamte Zeile klickbar', () => {
    const onSelectRole = vi.fn()
    render(<RoleRail roles={[coLeader]} selectedRoleCode={null} onSelectRole={onSelectRole} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    const nameSpan = screen.getByText('Co-Leader')
    fireEvent.click(nameSpan)
    expect(onSelectRole).toHaveBeenCalledWith('co_leader')
  })

  it('markiert die selectedRoleCode-Rolle mit aria-current="true", alle anderen mit "false"', () => {
    render(
      <RoleRail
        roles={[platformAdmin, coLeader]}
        selectedRoleCode="co_leader"
        onSelectRole={vi.fn()}
      />,
    )
    const coLeaderButton = screen.getByRole('button', { name: /Co-Leader/i })
    const platformAdminButton = screen.getByRole('button', { name: /Plattform-Admin/i })
    expect(coLeaderButton.getAttribute('aria-current')).toBe('true')
    expect(platformAdminButton.getAttribute('aria-current')).toBe('false')
  })

  it('zeigt "N×" für global_assignment_count und "–" ohne global_assignment_count', () => {
    render(
      <RoleRail
        roles={[platformAdmin, coLeader]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />,
    )
    expect(screen.getByText('5×')).toBeTruthy()
    expect(screen.getByText('–')).toBeTruthy()
  })

  it('trägt data-role-code={role.role_code} an jeder Zeile', () => {
    render(
      <RoleRail
        roles={[platformAdmin, coLeader]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />,
    )
    const platformAdminButton = screen.getByRole('button', { name: /Plattform-Admin/i })
    const coLeaderButton = screen.getByRole('button', { name: /Co-Leader/i })
    expect(platformAdminButton.getAttribute('data-role-code')).toBe('platform_admin')
    expect(coLeaderButton.getAttribute('data-role-code')).toBe('co_leader')
  })

  it('zeigt EmptyState bei leerer Rollenliste', () => {
    render(<RoleRail roles={[]} selectedRoleCode={null} onSelectRole={vi.fn()} />)
    expect(screen.getByText('Keine Rollen gefunden.')).toBeTruthy()
  })
})
