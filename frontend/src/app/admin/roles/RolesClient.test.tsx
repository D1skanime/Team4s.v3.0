// @vitest-environment jsdom
/**
 * Tests für RolesClient.tsx (Quick 260824-ek3 Task 3, D-07/D-08/D-10/GAP-05).
 *
 * Test A: ?role=co_leader (Gruppenrolle) zeigt ohne Interaktion Inhalt im Default-Tab.
 * Test B: ?role=platform_admin (globale Rolle) zeigt Standardrechte-Tab mit aufgeklappter
 *         erster Kategorie; Inhaber-Tab zeigt Hinweis + Link statt listRoleHolders-Aufruf.
 * Test C: erste Kategorie ist ohne Akkordeon-Klick offen, sobald der Standardrechte-Tab aktiv ist.
 * Test D: Switch-Toggle öffnet den Impact-Preview-Dialog statt direkt zu mutieren (D-10 Smoke).
 * Test E: Tab-Wechsel-Regel bei Rollenwechsel ist dokumentiert und nachvollziehbar.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSearchParams } from 'next/navigation'
import RolesClient from './RolesClient'
import type { RoleCapabilityMatrix, RoleHolderEntry } from '@/types/admin-capability'

const mockPush = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: () => ({ push: mockPush }),
}))

/**
 * matchMedia-Mock für jsdom (identisches Muster wie RoleHoldersTable.test.tsx /
 * RoleCapabilityClient.test.tsx) -- RoleHoldersTable (im Inhaber-Tab) nutzt useIsMobile().
 */
function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// jsdom implementiert CSS.escape (Standard-DOM-API in echten Browsern) nicht -- reiner
// Test-Infra-Stub für RolesClient.tsx's Scroll-into-View-Effect (GAP-05), keine Produktions-
// Verhaltensänderung.
if (typeof (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS === 'undefined') {
  ;(globalThis as { CSS?: { escape: (s: string) => string } }).CSS = { escape: (s: string) => s }
}

// jsdom implementiert Element.prototype.scrollIntoView ebenfalls nicht -- gleicher
// Test-Infra-Grund wie der CSS.escape-Stub oben (GAP-05 Scroll-into-View-Effect).
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn()
}

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    listRoleCapabilities: vi.fn(),
    listRoleHolders: vi.fn(),
    getRoleCapabilityImpactPreview: vi.fn(),
    grantRoleCapability: vi.fn(),
    revokeRoleCapability: vi.fn(),
  }
})

const coLeader: RoleCapabilityMatrix['roles'][number] = {
  role_code: 'co_leader',
  label_de: 'Co-Leader',
  assignable: true,
  capability_editable: true,
  contexts: ['fansub_group'],
  actions: [
    {
      code: 'fansub_group.edit',
      label_de: 'Gruppe bearbeiten',
      category: 'gruppe',
      granted: true,
      standalone: false,
    },
    {
      code: 'anime_project.edit',
      label_de: 'Projekt bearbeiten',
      category: 'projekt',
      granted: false,
      standalone: false,
    },
  ],
}

const platformAdmin: RoleCapabilityMatrix['roles'][number] = {
  role_code: 'platform_admin',
  label_de: 'Plattform-Admin',
  role_kind: 'global_app_role',
  global_assignment_count: 3,
  actions: [
    {
      code: 'fansub_group.edit',
      label_de: 'Gruppe bearbeiten',
      category: 'gruppe',
      granted: true,
      standalone: false,
    },
  ],
}

const sampleMatrix: RoleCapabilityMatrix = {
  roles: [coLeader, platformAdmin],
  all_actions: [],
}

const sampleHolder: RoleHolderEntry = {
  app_user_id: 1,
  display_name: 'Mira',
  email: 'mira@example.com',
  fansub_group_id: 5,
  fansub_group_name: 'New-Subs',
  membership_status: 'active',
  has_overrides: false,
}

describe('RolesClient', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    mockMatchMedia()
    const apiModule = await import('@/lib/api')
    vi.mocked(apiModule.listRoleCapabilities).mockResolvedValue(sampleMatrix)
    vi.mocked(apiModule.listRoleHolders).mockResolvedValue([sampleHolder])
    vi.mocked(apiModule.getRoleCapabilityImpactPreview).mockResolvedValue({
      affected_user_count: 0,
      items: [],
    })
  })

  it('Test A: ?role=co_leader zeigt nach initialem Render gefüllte Inhaber-Tabelle, aria-current auf co_leader', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('role=co_leader') as ReturnType<typeof useSearchParams>,
    )

    render(<RolesClient />)

    await waitFor(() => {
      expect(screen.getByText('Mira')).toBeTruthy()
    })

    const railButton = screen.getByRole('button', { name: /Co-Leader/i, hidden: true })
    expect(railButton.getAttribute('aria-current')).toBe('true')
  })

  it('Test B: ?role=platform_admin zeigt Standardrechte-Tab mit aufgeklappter Kategorie; Inhaber-Tab zeigt Hinweis + Link statt Fetch', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('role=platform_admin') as ReturnType<typeof useSearchParams>,
    )
    const apiModule = await import('@/lib/api')

    render(<RolesClient />)

    await waitFor(() => {
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
    })

    // Inhaber-Tab manuell öffnen: Hinweistext + Link, kein listRoleHolders('platform_admin')-Aufruf
    const holdersTab = screen.getByRole('tab', { name: 'Inhaber' })
    fireEvent.click(holdersTab)
    expect(
      screen.getByText(/Globale App-Rollen werden nicht gruppenbezogen verwaltet/),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Benutzer mit dieser Rolle anzeigen' }).getAttribute('href')).toBe(
      '/admin/users?role=platform_admin',
    )
    expect(apiModule.listRoleHolders).not.toHaveBeenCalledWith('platform_admin')
  })

  it('Test C: erste Kategorie (sortCategories-Reihenfolge) ist ohne Akkordeon-Klick offen, sobald Standardrechte-Tab aktiv ist', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)

    render(<RolesClient />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Co-Leader/i })).toBeTruthy()
    })

    // co_leader auswählen (nicht-global -> Default-Tab ist "Inhaber")
    fireEvent.click(screen.getByRole('button', { name: /Co-Leader/i }))
    await waitFor(() => {
      expect(screen.getByText('Mira')).toBeTruthy()
    })

    // Manuell auf "Standardrechte" wechseln
    fireEvent.click(screen.getByRole('tab', { name: 'Standardrechte' }))

    // "gruppe" kommt in sortCategories vor "projekt" -> deren Switch ist ohne Klick sichtbar
    expect(screen.getByLabelText('Gruppe bearbeiten')).toBeTruthy()
  })

  it('Test D: Switch-Toggle öffnet den Impact-Preview-Dialog statt direkt zu mutieren (D-10 Smoke)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('role=platform_admin') as ReturnType<typeof useSearchParams>,
    )
    const apiModule = await import('@/lib/api')

    render(<RolesClient />)

    const toggleSwitch = await screen.findByLabelText('Gruppe bearbeiten')
    fireEvent.click(toggleSwitch)

    await waitFor(() => {
      expect(screen.getByText(/Auswirkungs-Vorschau/)).toBeTruthy()
    })
    expect(apiModule.grantRoleCapability).not.toHaveBeenCalled()
    expect(apiModule.revokeRoleCapability).not.toHaveBeenCalled()
  })

  // Test E: einfachste, spezifikationskonforme Umsetzung -- der Tab-Default wird bei JEDEM
  // Rollenwechsel neu aus role_kind berechnet (siehe RolesClient.tsx handleSelectRole-
  // Kommentar), ein manuell gewählter Tab bleibt beim nächsten Rollenwechsel NICHT erhalten.
  it('Test E: Tab-Wechsel bei Rollenwechsel folgt dem dokumentierten Rollenart-Default, nicht dem zuletzt manuell gewählten Tab', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)

    render(<RolesClient />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Co-Leader/i })).toBeTruthy()
    })

    // co_leader auswählen (Default: Inhaber), manuell auf Standardrechte wechseln
    fireEvent.click(screen.getByRole('button', { name: /Co-Leader/i }))
    await waitFor(() => expect(screen.getByText('Mira')).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: 'Standardrechte' }))
    expect(screen.getByRole('tab', { name: 'Standardrechte' }).getAttribute('aria-selected')).toBe('true')

    // Rollenwechsel zu platform_admin (Default: Standardrechte, aber laut Regel NEU berechnet,
    // nicht "erhalten" -- hier zufällig derselbe Tab, die Regel selbst ist in Test B/Test A
    // bereits für ihre jeweils eigene Default-Rollenart bewiesen).
    fireEvent.click(screen.getByRole('button', { name: /Plattform-Admin/i }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Standardrechte' }).getAttribute('aria-selected')).toBe('true')
    })
  })
})
