// @vitest-environment jsdom
/**
 * Tests für RoleDetailPanel.tsx (Quick 260824-ek3 Task 3).
 *
 * Test 1: Subjekt-Header zeigt Rollenname, Kontext-Chip und Inhaberzahl (nicht-global).
 * Test 2: Subjekt-Header zeigt Inhaberzahl-Text für globale Rolle (vergeben/nicht vergeben).
 * Test 3: Tab "Inhaber" zeigt RoleHoldersTable-Inhalt (nicht-global).
 * Test 4: Tab "Standardrechte" zeigt RoleCapabilityDetail-Inhalt.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoleDetailPanel, holderCountText } from './RoleDetailPanel'
import type { RoleEntry, RoleHolderEntry } from '@/types/admin-capability'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

/**
 * matchMedia-Mock für jsdom (identisches Muster wie RoleHoldersTable.test.tsx) --
 * RoleHoldersTable im Inhaber-Tab nutzt useIsMobile().
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

beforeEach(() => {
  mockMatchMedia()
})

const coLeader: RoleEntry = {
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
  ],
}

const platformAdmin: RoleEntry = {
  role_code: 'platform_admin',
  label_de: 'Plattform-Admin',
  role_kind: 'global_app_role',
  global_assignment_count: 4,
  actions: [],
}

const reservedBaseline: RoleEntry = {
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
  ],
}

const holder: RoleHolderEntry = {
  app_user_id: 1,
  display_name: 'Mira',
  email: 'mira@example.com',
  fansub_group_id: 5,
  fansub_group_name: 'New-Subs',
  membership_status: 'active',
  has_overrides: false,
}

describe('RoleDetailPanel', () => {
  it('zeigt Rollenname, Kontext-Chip (roleKindLabel) und Inhaberzahl für nicht-globale Rolle', () => {
    render(
      <RoleDetailPanel
        role={coLeader}
        activeTabId="holders"
        onActiveTabIdChange={vi.fn()}
        holders={[holder]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set()}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Co-Leader')).toBeTruthy()
    expect(screen.getByText('Aktive App-Rolle')).toBeTruthy()
    expect(screen.getByText('1 Inhaber')).toBeTruthy()
  })

  it('zeigt "N× vergeben" für globale Rolle mit Zuweisungen', () => {
    render(
      <RoleDetailPanel
        role={platformAdmin}
        activeTabId="caps"
        onActiveTabIdChange={vi.fn()}
        holders={[]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set()}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    expect(screen.getByText('4× vergeben')).toBeTruthy()
  })

  it('zeigt RoleHoldersTable-Inhalt im Inhaber-Tab für nicht-globale Rolle', () => {
    render(
      <RoleDetailPanel
        role={coLeader}
        activeTabId="holders"
        onActiveTabIdChange={vi.fn()}
        holders={[holder]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set()}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Mira')).toBeTruthy()
  })

  it('zeigt RoleCapabilityDetail-Inhalt im Standardrechte-Tab', () => {
    render(
      <RoleDetailPanel
        role={coLeader}
        activeTabId="caps"
        onActiveTabIdChange={vi.fn()}
        holders={[]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set(['gruppe'])}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Gruppe bearbeiten')).toBeTruthy()
  })

  it('Tab-Klick auf "Standardrechte" ruft onActiveTabIdChange auf', () => {
    const onActiveTabIdChange = vi.fn()
    render(
      <RoleDetailPanel
        role={coLeader}
        activeTabId="holders"
        onActiveTabIdChange={onActiveTabIdChange}
        holders={[holder]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set()}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Standardrechte' }))
    expect(onActiveTabIdChange).toHaveBeenCalledWith('caps')
  })

  it('145-03: holderCountText liefert für role_kind "reserved_baseline" immer "–", unabhängig von holders/isHoldersLoading', () => {
    expect(holderCountText(reservedBaseline, [holder], false)).toBe('–')
    expect(holderCountText(reservedBaseline, [], true)).toBe('–')
    expect(holderCountText(reservedBaseline, [holder, holder], true)).toBe('–')
  })

  it('145-03: Inhaber-Tab zeigt für die reservierte Pseudo-Rolle die statische Erklärung, kein RoleHoldersTable und keinen Button', () => {
    render(
      <RoleDetailPanel
        role={reservedBaseline}
        activeTabId="holders"
        onActiveTabIdChange={vi.fn()}
        holders={[holder]}
        isHoldersLoading={false}
        holdersError={null}
        onRequestChange={vi.fn()}
        openCategories={new Set()}
        onOpenCategoriesChange={vi.fn()}
      />,
    )
    expect(
      screen.getByText(
        'Diese Grundausstattung wird nicht einzeln zugewiesen — jedes aktive Mitglied jeder Fansub-Gruppe besitzt sie automatisch. Es gibt daher keine gesonderte Inhaberliste.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Mira')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button', { name: /anzeigen/i })).toBeNull()
  })
})
