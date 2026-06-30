// @vitest-environment jsdom
/**
 * Tests für RoleCapabilityDetail.tsx (Plan 94-06, TDD RED→GREEN).
 *
 * Test 1: Detail rendert Accordion-Header nach Kategorie
 * Test 2: Pro Capability erscheint ein Switch mit korrektem granted-Zustand (nach Öffnen)
 * Test 3: Bei nicht-assignable Rolle sind Switches disabled (nach Öffnen)
 * Test 4: onGrant-Callback bei Switch-Toggle false→true (nach Öffnen)
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'
import type { RoleEntry } from '@/types/admin-capability'

const assignableRole: RoleEntry = {
  role_code: 'fansub_lead',
  label_de: 'Fansub-Lead',
  assignable: true,
  contexts: ['app_group'],
  actions: [
    {
      code: 'fansub_group.members.view',
      label_de: 'Mitglieder anzeigen',
      category: 'gruppe',
      granted: true,
      standalone: false,
    },
    {
      code: 'fansub_group.edit',
      label_de: 'Gruppe bearbeiten',
      category: 'gruppe',
      granted: false,
      standalone: false,
    },
  ],
}

const historicalRole: RoleEntry = {
  role_code: 'founder',
  label_de: 'Gründer/in',
  assignable: false,
  contexts: ['group_history'],
  actions: [
    {
      code: 'fansub_group.members.view',
      label_de: 'Mitglieder anzeigen',
      category: 'gruppe',
      granted: false,
      standalone: false,
    },
  ],
}

describe('RoleCapabilityDetail', () => {
  it('rendert Accordion-Header pro Kategorie (Gruppe)', () => {
    render(
      <RoleCapabilityDetail
        role={assignableRole}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
        inlineError={null}
      />
    )
    // Kategorie-Header "Gruppe" soll als Accordion-Header sichtbar sein (ohne Öffnen)
    expect(screen.getByText('Gruppe')).toBeTruthy()
  })

  it('rendert pro Capability einen Switch mit korrektem granted-Zustand (nach Accordion öffnen)', () => {
    render(
      <RoleCapabilityDetail
        role={assignableRole}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
        inlineError={null}
      />
    )
    // Accordion "Gruppe" öffnen
    const header = screen.getByText('Gruppe')
    fireEvent.click(header)

    // Switch für granted=true: aria-checked="true"
    const switches = screen.getAllByRole('switch')
    const checkedSwitches = switches.filter(
      (s) => s.getAttribute('aria-checked') === 'true'
    )
    expect(checkedSwitches.length).toBeGreaterThan(0)
  })

  it('deaktiviert alle Switches für nicht-assignable Rollen (nach Accordion öffnen)', () => {
    render(
      <RoleCapabilityDetail
        role={historicalRole}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
        inlineError={null}
      />
    )
    // Accordion öffnen
    const header = screen.getByText('Gruppe')
    fireEvent.click(header)

    const switches = screen.getAllByRole('switch')
    switches.forEach((s) => {
      expect(s.getAttribute('aria-disabled')).toBe('true')
    })
  })

  it('ruft onGrant auf wenn Switch von false→true gewechselt wird (nach Accordion öffnen)', () => {
    const onGrant = vi.fn()
    render(
      <RoleCapabilityDetail
        role={assignableRole}
        onGrant={onGrant}
        onRevoke={vi.fn()}
        inlineError={null}
      />
    )
    // Accordion öffnen
    const header = screen.getByText('Gruppe')
    fireEvent.click(header)

    // Switch für "Gruppe bearbeiten" (granted=false) anklicken → soll onGrant aufrufen
    const switches = screen.getAllByRole('switch')
    const uncheckedSwitch = switches.find(
      (s) => s.getAttribute('aria-checked') === 'false'
    )
    expect(uncheckedSwitch).toBeTruthy()
    fireEvent.click(uncheckedSwitch!)
    expect(onGrant).toHaveBeenCalledWith('fansub_lead', 'fansub_group.edit')
  })
})
