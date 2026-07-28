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
  capability_editable: true,
  contexts: ['app_group'],
  actions: [],
}

const historicalRole: RoleEntry = {
  role_code: 'founder',
  label_de: 'Gründung',
  assignable: false,
  capability_editable: false,
  contexts: ['group_history'],
  actions: [],
}

// Contribution-/Projekt-Rolle: nicht im Gruppen-Picker (assignable=false), aber aktiv und
// capability-editierbar (Kontext anime_contribution) — Gap G4.
const contributionRole: RoleEntry = {
  role_code: 'encoder',
  label_de: 'Encoding',
  assignable: false,
  capability_editable: true,
  contexts: ['anime_contribution', 'group_history'],
  actions: [],
}

// Synthetische globale App-Rolle (Plan 111-01) mit Zuweisungen — Impact-Count-Link (D-05).
const globalAppRoleWithCount: RoleEntry = {
  role_code: 'platform_admin',
  label_de: 'Plattform-Admin',
  assignable: false,
  capability_editable: false,
  role_kind: 'global_app_role',
  global_assignment_count: 3,
  contexts: [],
  actions: [],
}

// Synthetische globale App-Rolle ohne Zuweisungen — "0× vergeben"-Badge, kein Link.
const globalAppRoleZeroCount: RoleEntry = {
  role_code: 'content_admin',
  label_de: 'Content-Admin',
  assignable: false,
  capability_editable: false,
  role_kind: 'global_app_role',
  global_assignment_count: 0,
  contexts: [],
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

  it('markiert nicht-capability-editierbare (historische) Rolle als aria-disabled', () => {
    render(
      <RoleMasterList
        roles={[historicalRole]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    const roleItem = screen.getByRole('button', { name: /Gründung/i })
    expect(roleItem.getAttribute('aria-disabled')).toBe('true')
  })

  it('zeigt Badge "Projekt-/Release-Rolle" und ist editierbar für Contribution-Rolle (G4)', () => {
    const onSelectRole = vi.fn()
    render(
      <RoleMasterList
        roles={[contributionRole]}
        selectedRoleCode={null}
        onSelectRole={onSelectRole}
      />
    )
    expect(screen.getByText('Projekt-/Release-Rolle')).toBeTruthy()
    const roleItem = screen.getByRole('button', { name: /Encoding/i })
    expect(roleItem.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(roleItem)
    expect(onSelectRole).toHaveBeenCalledWith('encoder')
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

  // D-05: Impact-Count-Querverlinkung (111-05) — global_assignment_count entscheidet,
  // NICHT assignable (111-RESEARCH.md Pitfall 1).
  it('zeigt anklickbaren Impact-Count-Link "N× vergeben" für globale App-Rolle mit Zuweisungen', () => {
    render(
      <RoleMasterList
        roles={[globalAppRoleWithCount]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    expect(screen.getByText('3× vergeben')).toBeTruthy()
    const link = screen.getByRole('link', {
      name: /3 Benutzer mit Rolle Plattform-Admin anzeigen/i,
    })
    expect(link.getAttribute('href')).toBe('/admin/users?role=platform_admin')
  })

  it('zeigt "0× vergeben" als nicht-klickbaren Badge für globale App-Rolle ohne Zuweisungen', () => {
    render(
      <RoleMasterList
        roles={[globalAppRoleZeroCount]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    const zeroBadge = screen.getByText('0× vergeben')
    expect(zeroBadge.closest('a')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('zeigt "–" für nicht zählbare Rollen ohne global_assignment_count', () => {
    render(
      <RoleMasterList
        roles={[assignableRole]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    expect(screen.getByText('–')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('zeigt Badge-Label "Globale App-Rolle" statt "Historische Rolle" für role_kind=global_app_role', () => {
    render(
      <RoleMasterList
        roles={[globalAppRoleWithCount]}
        selectedRoleCode={null}
        onSelectRole={vi.fn()}
      />
    )
    expect(screen.getByText('Globale App-Rolle')).toBeTruthy()
    expect(screen.queryByText('Historische Rolle')).toBeNull()
  })
})
