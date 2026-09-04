// @vitest-environment jsdom
/**
 * Tests für RoleCapabilityDetail.tsx (Plan 94-06 TDD RED→GREEN, erweitert Plan 138-13).
 *
 * Test 1: Detail rendert Accordion-Header nach Kategorie
 * Test 2: Pro Capability erscheint ein Switch mit korrektem granted-Zustand (nach Öffnen)
 * Test 3: Bei nicht-assignable Rolle sind Switches disabled (nach Öffnen)
 * Test 4 (138-13): onRequestChange-Callback bei Switch-Toggle false→true (nach Öffnen) --
 *   ersetzt das vormalige direkte onGrant (D-18: kein sofortiges Speichern eines Switches).
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
  onRequestChange = vi.fn(),
  inlineError = null,
  initialOpen = [],
}: {
  role: RoleEntry
  onRequestChange?: (actionCode: string, add: boolean) => void
  inlineError?: string | null
  initialOpen?: string[]
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(initialOpen)
  )
  return (
    <RoleCapabilityDetail
      role={role}
      onRequestChange={onRequestChange}
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
  capability_editable: true,
  contexts: ['app_group'],
  actions: [
    {
      code: 'fansub_group.edit',
      label_de: 'Gruppe bearbeiten',
      category: 'gruppe',
      granted: true,
      standalone: false,
    },
    {
      code: 'fansub_group.links.manage',
      label_de: 'Links verwalten',
      category: 'gruppe',
      granted: false,
      standalone: false,
    },
  ],
}

const historicalRole: RoleEntry = {
  role_code: 'founder',
  label_de: 'Gründung',
  assignable: false,
  capability_editable: false,
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

const reservedBaselineRole: RoleEntry = {
  role_code: 'group_member',
  label_de: 'Mitgliedschafts-Grundausstattung',
  role_kind: 'reserved_baseline',
  assignable: false,
  capability_editable: true,
  contexts: ['fansub_group'],
  actions: [
    {
      code: 'fansub_group.members.view',
      label_de: 'Mitglieder anzeigen',
      category: 'gruppe',
      granted: true,
      standalone: false,
    },
    {
      code: 'fansub_group_media.view',
      label_de: 'Gruppenmedien ansehen',
      category: 'gruppenmedien',
      granted: true,
      standalone: false,
    },
    {
      code: 'fansub_group_media.upload',
      label_de: 'Gruppenmedien hochladen',
      category: 'gruppenmedien',
      granted: true,
      standalone: false,
    },
  ],
}

const NON_BASELINE_CATEGORIES = [
  'gruppenseite',
  'projekt',
  'rechteverwaltung',
  'release',
  'review',
  'veroeffentlichungen',
]

/**
 * Nicht-Baseline-Aktionen der realen D-18-Katalogform: 34 Aktionen, gleichmäßig über die
 * restlichen 6 Kategorien verteilt (Phase-146-RESEARCH.md, Zeile 148f.).
 */
const nonBaselineFullCatalogActions = Array.from({ length: 34 }, (_, i) => ({
  code: `full_catalog.action_${i}`,
  label_de: `Vollkatalog-Aktion ${i}`,
  category: NON_BASELINE_CATEGORIES[i % NON_BASELINE_CATEGORIES.length],
  granted: false,
  standalone: false,
}))

/**
 * Reale D-19-Katalogform der reservierten Pseudo-Rolle: 38 Gesamtaktionen (3 Baseline + 34
 * Nicht-Baseline + 1 Systemaktion) statt der alten 3-Aktionen-Fixture, die den
 * `configurableActions`-Filterfehler nicht aufdecken konnte.
 */
const reservedBaselineRoleFullCatalog: RoleEntry = {
  role_code: 'group_member',
  label_de: 'Mitgliedschafts-Grundausstattung',
  role_kind: 'reserved_baseline',
  assignable: false,
  capability_editable: true,
  contexts: ['fansub_group'],
  actions: [
    ...reservedBaselineRole.actions,
    ...nonBaselineFullCatalogActions,
    {
      code: 'fansub_group.invitations.accept',
      label_de: 'Einladung annehmen',
      category: 'projekt',
      granted: false,
      standalone: true,
    },
  ],
}

const ALL_FULL_CATALOG_CATEGORIES = ['gruppe', 'gruppenmedien', ...NON_BASELINE_CATEGORIES]

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

  it("zeigt für Beitragsrollen keine Schalter und erklärt die individuelle Rechtevergabe", () => {
    render(<DetailHarness role={historicalRole} />)
    expect(screen.getByText(/Keine Standardrechte: Beitrags- und historische Rollen/)).toBeTruthy()
    expect(screen.queryAllByRole("switch")).toHaveLength(0)
  })

  it('ruft onRequestChange auf (statt sofort zu mutieren) wenn Switch von false→true gewechselt wird (nach Accordion öffnen)', () => {
    const onRequestChange = vi.fn()
    render(<DetailHarness role={assignableRole} onRequestChange={onRequestChange} />)
    // Accordion öffnen
    const header = screen.getByText('Gruppe')
    fireEvent.click(header)

    // Switch für "Gruppe bearbeiten" (granted=false) anklicken → soll NUR onRequestChange(code, true)
    // aufrufen (D-18: kein sofortiges Speichern eines Switches) -- niemals onGrant direkt.
    const switches = screen.getAllByRole('switch')
    const uncheckedSwitch = switches.find(
      (s) => s.getAttribute('aria-checked') === 'false'
    )
    expect(uncheckedSwitch).toBeTruthy()
    fireEvent.click(uncheckedSwitch!)
    expect(onRequestChange).toHaveBeenCalledWith('fansub_group.links.manage', true)
    // Kein optimistisches Umschalten -- der Switch selbst bleibt bis zu einem echten
    // Matrix-Refresh unverändert (T-138-24).
    expect(uncheckedSwitch!.getAttribute('aria-checked')).toBe('false')
  })

  it('hält das Accordion offen, wenn ein Switch getoggelt wird (open-state übersteht Toggle)', () => {
    // initialOpen: Kategorie "gruppe" ist bereits offen
    render(
      <DetailHarness role={assignableRole} initialOpen={['gruppe']} onRequestChange={vi.fn()} />
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

  it('TestKategorieReihenfolge: Accordion-Items erscheinen in Reihenfolge gruppe→projekt→release (D-17)', () => {
    // Rolle mit Actions in gemischter Reihenfolge [release, projekt, gruppe]
    const roleWithMixedCategories: RoleEntry = {
      role_code: 'test_role',
      label_de: 'Test-Rolle',
      assignable: true,
      capability_editable: true,
      contexts: ['app_group'],
      actions: [
        {
          code: 'release.publish',
          label_de: 'Release veröffentlichen',
          category: 'release',
          granted: false,
          standalone: false,
        },
        {
          code: 'projekt.manage',
          label_de: 'Projekt verwalten',
          category: 'projekt',
          granted: false,
          standalone: false,
        },
        {
          code: 'gruppe.view',
          label_de: 'Gruppe anzeigen',
          category: 'gruppe',
          granted: false,
          standalone: false,
        },
      ],
    }

    render(<DetailHarness role={roleWithMixedCategories} />)

    // Alle Accordion-Header-Buttons ermitteln
    const buttons = screen.getAllByRole('button')
    // Filtere auf Accordion-Trigger-Buttons (haben aria-expanded-Attribut)
    const accordionTriggers = buttons.filter(
      (btn) => btn.hasAttribute('aria-expanded')
    )

    // Prüfe dass genau 3 Kategorien vorhanden sind
    expect(accordionTriggers.length).toBe(3)

    // Prüfe Reihenfolge: gruppe → projekt → release
    const triggerTexts = accordionTriggers.map((btn) => btn.textContent?.toLowerCase() ?? '')
    expect(triggerTexts[0]).toContain('gruppe')
    expect(triggerTexts[1]).toContain('projekt')
    expect(triggerTexts[2]).toContain('release')
  })

  it('146-02: rendert für die reservierte Pseudo-Rolle alle 3 Grundausstattungs-Aktionen als Switch-Zeilen MIT sichtbarem "Geschützt"-Badge (Criterion 2) und Hinweistext statt Deep-Link', () => {
    render(<DetailHarness role={reservedBaselineRole} initialOpen={['gruppe', 'gruppenmedien']} />)

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
    const checkedSwitches = switches.filter((s) => s.getAttribute('aria-checked') === 'true')
    expect(checkedSwitches).toHaveLength(3)
    expect(screen.getAllByText('Geschützt')).toHaveLength(3)

    expect(
      screen.getByText(
        'Diese drei Rechte erhält jedes aktive Gruppenmitglied automatisch, unabhängig von seiner Rolle. Änderungen hier wirken sich sofort auf alle aktiven Mitglieder aller Fansub-Gruppen aus.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Grundausstattung öffnen' })).toBeNull()
  })

  it('146-02 (D-19): rendert für die reservierte Pseudo-Rolle exakt 3 Switches gegen die reale 38-Aktionen-Katalogform über alle 8 Kategorien hinweg, nicht 37', () => {
    render(
      <DetailHarness
        role={reservedBaselineRoleFullCatalog}
        initialOpen={ALL_FULL_CATALOG_CATEGORIES}
      />,
    )

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
  })

  it('145-03: zeigt für eine normale kapazitätsbearbeitbare Rolle die aktualisierte Erklärung + einen Deep-Link "Grundausstattung öffnen" statt der alten statischen Zeile', () => {
    render(<DetailHarness role={assignableRole} />)

    expect(
      screen.getByText(
        'Die Grundrechte aller aktiven Mitglieder (Mitglieder anzeigen, Gruppenmedien ansehen und hochladen) werden zentral über die Rolle „Mitgliedschafts-Grundausstattung“ verwaltet.',
      ),
    ).toBeTruthy()
    const deepLink = screen.getByRole('link', { name: 'Grundausstattung öffnen' })
    expect(deepLink.getAttribute('href')).toBe('/admin/roles?role=group_member&tab=caps')
  })
})
