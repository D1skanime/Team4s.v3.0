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
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { RoleCapabilityDetail } from './RoleCapabilityDetail'
import type { RoleEntry } from '@/types/admin-capability'

/**
 * Test-Wrapper: hält den controlled Accordion-Open-Zustand, damit
 * fireEvent.click(header) das Accordion tatsächlich auf-/zuklappt.
 */
function DetailHarness({
  role,
  onGrant = vi.fn(),
  onRevoke = vi.fn(),
  inlineError = null,
  initialOpen = [],
}: {
  role: RoleEntry
  onGrant?: (roleCode: string, actionCode: string) => void
  onRevoke?: (roleCode: string, actionCode: string) => void
  inlineError?: string | null
  initialOpen?: string[]
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(initialOpen)
  )
  return (
    <RoleCapabilityDetail
      role={role}
      onGrant={onGrant}
      onRevoke={onRevoke}
      inlineError={inlineError}
      openCategories={openCategories}
      onOpenCategoriesChange={setOpenCategories}
    />
  )
}

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
    render(<DetailHarness role={assignableRole} />)
    // Kategorie-Header "Gruppe" soll als Accordion-Header sichtbar sein (ohne Öffnen)
    expect(screen.getByText('Gruppe')).toBeTruthy()
  })

  it('rendert pro Capability einen Switch mit korrektem granted-Zustand (nach Accordion öffnen)', () => {
    render(<DetailHarness role={assignableRole} />)
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
    render(<DetailHarness role={historicalRole} />)
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
    render(<DetailHarness role={assignableRole} onGrant={onGrant} />)
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

  it('hält das Accordion offen, wenn ein Switch getoggelt wird (open-state übersteht Toggle)', () => {
    // initialOpen: Kategorie "gruppe" ist bereits offen
    render(
      <DetailHarness role={assignableRole} initialOpen={['gruppe']} onGrant={vi.fn()} />
    )

    // Vor dem Toggle: Switches sichtbar (Accordion offen)
    let switches = screen.getAllByRole('switch')
    const uncheckedSwitch = switches.find(
      (s) => s.getAttribute('aria-checked') === 'false'
    )
    expect(uncheckedSwitch).toBeTruthy()

    // Switch togglen
    fireEvent.click(uncheckedSwitch!)

    // Nach dem Toggle: Accordion muss weiterhin offen sein → Switches weiter sichtbar
    switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)
    // Header "Gruppe" weiterhin aufgeklappt (aria-expanded="true")
    const header = screen.getByText('Gruppe').closest('button')
    expect(header?.getAttribute('aria-expanded')).toBe('true')
  })
})
