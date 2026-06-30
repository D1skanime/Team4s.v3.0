// @vitest-environment jsdom
/**
 * Tests für RoleMasterList.tsx (Plan 94-06, TDD RED).
 *
 * Test 1: assignable=true → Badge "Aktive App-Rolle"
 * Test 2: assignable=false → Badge "Historische Rolle"
 * Test 3: nicht-assignable Rolle ist aria-disabled markiert
 * Test 4: Auswahl-Callback wird bei Klick aufgerufen
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoleMasterList } from './RoleMasterList'
import type { RoleEntry } from '@/types/admin-capability'

const assignableRole: RoleEntry = {
  role_code: 'fansub_lead',
  label_de: 'Fansub-Lead',
  assignable: true,
  contexts: ['app_group'],
  actions: [],
}

const historicalRole: RoleEntry = {
  role_code: 'founder',
  label_de: 'Gründer/in',
  assignable: false,
  contexts: ['group_history'],
  actions: [],
}

describe('RoleMasterList', () => {
  it('zeigt Badge "Aktive App-Rolle" für assignable=true Rolle', () => {
    render(
      <RoleMasterList
        roles={[assignableRole]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    expect(screen.getByText('Aktive App-Rolle')).toBeTruthy()
  })

  it('zeigt Badge "Historische Rolle" für assignable=false Rolle', () => {
    render(
      <RoleMasterList
        roles={[historicalRole]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    expect(screen.getByText('Historische Rolle')).toBeTruthy()
  })

  it('markiert nicht-assignable Rolle als aria-disabled', () => {
    render(
      <RoleMasterList
        roles={[historicalRole]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    const roleItem = screen.getByRole('button', { name: /Gründer\/in/i })
    expect(roleItem.getAttribute('aria-disabled')).toBe('true')
  })

  it('ruft onSelectRole mit role_code auf, wenn eine Rolle angeklickt wird', () => {
    const onSelectRole = vi.fn()
    render(
      <RoleMasterList
        roles={[assignableRole]}
        selectedRoleCode={null}
        onSelectRole={onSelectRole}
      />
    )
    const roleButton = screen.getByRole('button', { name: /Fansub-Lead/i })
    fireEvent.click(roleButton)
    expect(onSelectRole).toHaveBeenCalledWith('fansub_lead')
  })
})
