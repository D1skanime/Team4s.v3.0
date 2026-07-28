// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicMemberBadge } from '@/types/profile'

type MemberBadgeCatalogItem = {
  badge_code: string
  label: string
  badge_category: string
}

type FakePresentation = {
  label: string
  variant: string
  Icon: unknown
  palette: string
  group: string
  roleCode?: string
}

function fakePresentation(overrides: Partial<FakePresentation> & { group: string; roleCode?: string }): FakePresentation {
  return {
    label: 'Fake',
    variant: 'neutral',
    Icon: null,
    palette: 'mint',
    ...overrides,
  }
}

type MemberBadgeGroupRow = { key: string; items: MemberBadgeCatalogItem[] }
type MemberBadgeGroupResult = { key: string; label: string; rows: MemberBadgeGroupRow[] }

async function loadMemberBadgeChain(): Promise<{
  MemberBadgeChain: ComponentType<{
    earnedBadges: PublicMemberBadge[]
    catalog?: MemberBadgeCatalogItem[]
  }>
  buildMemberBadgeGroups: (
    visibleCatalog: MemberBadgeCatalogItem[],
    getPresentation?: (badgeCode: string) => FakePresentation,
  ) => MemberBadgeGroupResult[]
}> {
  try {
    const modulePath = './MemberBadgeChain'
    return await import(/* @vite-ignore */ modulePath)
  } catch (error) {
    throw new Error(`MemberBadgeChain must exist for the Phase 99 public badge chain: ${String(error)}`)
  }
}

afterEach(() => {
  cleanup()
})

const catalog: MemberBadgeCatalogItem[] = [
  { badge_code: 'founder', label: 'Gründungsmitglied', badge_category: 'historical_achievement' },
  { badge_code: 'translator', label: 'Übersetzung', badge_category: 'supporter' },
  { badge_code: 'quality_checker', label: 'Qualitätscheck', badge_category: 'supporter' },
]

describe('MemberBadgeChain', () => {
  it('renders a horizontal earned-and-locked badge chain with progress copy', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'founder', badge_category: 'historical_achievement' }]}
        catalog={catalog}
      />,
    )

    expect(screen.getByText('1 von 3')).not.toBeNull()
    expect(screen.getByText('Gründungsmitglied')).not.toBeNull()
    expect(screen.getByText('Übersetzung')).not.toBeNull()
    expect(screen.getByLabelText('Übersetzung gesperrt')).not.toBeNull()
    expect(container.querySelector('[data-orientation="horizontal"]')).not.toBeNull()
  })

  it('does not invent badge tier labels when the catalog has no tier or level field', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'founder', badge_category: 'historical_achievement' }]}
        catalog={catalog}
      />,
    )

    // All three local fixture badge_codes ('founder', 'translator', 'quality_checker') miss the
    // real MEMBER_BADGE_PRESENTATIONS keys and therefore all land in the fallback 'special' group
    // (Besondere Auszeichnungen) after the D-04 grouping refactor.
    const chain = screen.getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(chain).queryByText(/Bronze|Silber|Gold/i)).toBeNull()
  })

  it('renders a role-entry badge in locked state by default (D-03)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const roleEntryCatalog: MemberBadgeCatalogItem[] = [
      ...catalog,
      { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
    ]

    render(
      <MemberBadgeChain earnedBadges={[]} catalog={roleEntryCatalog} />,
    )

    expect(screen.getByLabelText('Erste Übersetzung gesperrt')).not.toBeNull()
  })

  it('renders a role-entry badge in earned state the moment it is in earnedBadges (D-03)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const roleEntryCatalog: MemberBadgeCatalogItem[] = [
      ...catalog,
      { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
    ]

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 0, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]}
        catalog={roleEntryCatalog}
      />,
    )

    expect(screen.queryByLabelText('Erste Übersetzung gesperrt')).toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
  })

  it('renders four labeled group headings (Rollen, Fortschritt, Mitgliedschaft, Besondere Auszeichnungen) with the default catalog (D-04)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(<MemberBadgeChain earnedBadges={[]} />)

    for (const label of ['Rollen', 'Fortschritt', 'Mitgliedschaft', 'Besondere Auszeichnungen']) {
      expect(screen.getByText(label)).not.toBeNull()
      expect(screen.getByRole('list', { name: label })).not.toBeNull()
    }
  })
})

describe('PUBLIC_MEMBER_BADGE_CATALOG role-entry entries (D-03)', () => {
  it('contains all 8 locked role_entry_* codes with correct German labels', async () => {
    const { PUBLIC_MEMBER_BADGE_CATALOG, MEMBER_BADGE_PRESENTATIONS } = await import('./memberBadgeLabels')

    const expected: Record<string, string> = {
      role_entry_translator: 'Erste Übersetzung',
      role_entry_timer: 'Erstes Timing',
      role_entry_encoder: 'Erster Encode',
      role_entry_typesetter: 'Erstes Typesetting',
      role_entry_quality_checker: 'Erste Qualitätsprüfung',
      role_entry_project_lead: 'Erste Dokumentation als Projektleitung',
      role_entry_editor: 'Erstes Editing',
      role_entry_raw_provider: 'Erste Raw-Bereitstellung',
    }

    for (const [badgeCode, label] of Object.entries(expected)) {
      const catalogEntry = PUBLIC_MEMBER_BADGE_CATALOG.find((item) => item.badge_code === badgeCode)
      expect(catalogEntry).not.toBeUndefined()
      expect(catalogEntry?.label).toBe(label)
      expect(catalogEntry?.badge_category).toBe('role_entry')

      const presentation = MEMBER_BADGE_PRESENTATIONS[badgeCode]
      expect(presentation).not.toBeUndefined()
      expect(presentation.label).toBe(label)
      expect(presentation.variant).toBe('info')
      expect(presentation.palette).toBe('indigo')
    }
  })
})

describe('MemberBadgeChain roleLabel prefix (Phase 112 Plan 03, D-04)', () => {
  it('renders the German role-name prefix before a merged Typ-1 + Typ-3 roles row', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 0, badge_code: 'role_volume_translator_gold', badge_category: 'role_volume' },
        ]}
      />,
    )

    expect(screen.getByText('Übersetzung:')).not.toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
    expect(screen.getByText('Gold · 320+')).not.toBeNull()
  })

  it('renders the role-name prefix for a roles row with only the Typ-1 chip (under threshold, no volume merge)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]}
      />,
    )

    expect(screen.getByText('Übersetzung:')).not.toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
    expect(screen.queryByText(/Gold ·/)).toBeNull()
  })

  it('renders the role-name prefix uniformly on every roles-group row, including untouched locked rows', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(<MemberBadgeChain earnedBadges={[]} />)

    const rolesList = screen.getByRole('list', { name: 'Rollen' })
    const rows = within(rolesList).getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.textContent).toMatch(/^[^:]+:/)
    }
  })

  it('does not render a role-name prefix for non-roles groups (Fortschritt)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(<MemberBadgeChain earnedBadges={[]} />)

    const progressList = screen.getByRole('list', { name: 'Fortschritt' })
    expect(progressList.textContent).not.toMatch(/:/)
  })
})

describe('buildMemberBadgeGroups (D-04)', () => {
  it('returns exactly 4 groups in the fixed roles/progress/membership/special order when all groups are populated', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'a', label: 'A', badge_category: 'x' },
      { badge_code: 'b', label: 'B', badge_category: 'x' },
      { badge_code: 'c', label: 'C', badge_category: 'x' },
      { badge_code: 'd', label: 'D', badge_category: 'x' },
    ]
    const groupByCode: Record<string, string> = { a: 'roles', b: 'progress', c: 'membership', d: 'special' }
    const getPresentation = (badgeCode: string) => fakePresentation({ group: groupByCode[badgeCode] })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    expect(groups.map((group) => group.key)).toEqual(['roles', 'progress', 'membership', 'special'])
  })

  it('hides groups with zero visible badges entirely instead of returning them empty', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'a', label: 'A', badge_category: 'x' },
      { badge_code: 'b', label: 'B', badge_category: 'x' },
    ]
    const groupByCode: Record<string, string> = { a: 'membership', b: 'roles' }
    const getPresentation = (badgeCode: string) => fakePresentation({ group: groupByCode[badgeCode] })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    expect(groups.map((group) => group.key)).toEqual(['roles', 'membership'])
    expect(groups.find((group) => group.key === 'progress')).toBeUndefined()
    expect(groups.find((group) => group.key === 'special')).toBeUndefined()
  })

  it('merges two synthetic same-roleCode badges into a single Rollen row (Phase 112 compatibility)', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
      { badge_code: 'role_volume_translator', label: 'Übersetzungs-Volumen', badge_category: 'role_volume' },
    ]
    const getPresentation = () => fakePresentation({ group: 'roles', roleCode: 'translator' })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    const rolesGroup = groups.find((group) => group.key === 'roles')
    expect(rolesGroup).not.toBeUndefined()
    expect(rolesGroup?.rows).toHaveLength(1)
    expect(rolesGroup?.rows[0]?.items.map((item) => item.badge_code)).toEqual([
      'role_entry_translator',
      'role_volume_translator',
    ])
  })

  it('sorts every real catalog badge into the correct group using the real presentation map', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const { PUBLIC_MEMBER_BADGE_CATALOG, getMemberBadgePresentation } = await import('./memberBadgeLabels')

    const groups = buildMemberBadgeGroups(
      PUBLIC_MEMBER_BADGE_CATALOG,
      getMemberBadgePresentation as unknown as (badgeCode: string) => FakePresentation,
    )
    const byKey = Object.fromEntries(groups.map((group) => [group.key, group]))

    const codesInGroup = (key: string) =>
      (byKey[key]?.rows ?? []).flatMap((row) => row.items.map((item) => item.badge_code))

    expect(codesInGroup('membership')).toEqual(
      expect.arrayContaining(['founding_member', 'long_term_member']),
    )
    expect(codesInGroup('special')).toEqual(
      expect.arrayContaining(['historical_leader', 'all_rounder', 'verified']),
    )
    expect(codesInGroup('progress')).toEqual(
      expect.arrayContaining([
        'first_contribution',
        'productive_bronze',
        'productive_silver',
        'productive_gold',
      ]),
    )

    const roleCodes = [
      'role_entry_translator',
      'role_entry_timer',
      'role_entry_encoder',
      'role_entry_typesetter',
      'role_entry_quality_checker',
      'role_entry_project_lead',
      'role_entry_editor',
      'role_entry_raw_provider',
    ]
    expect(codesInGroup('roles')).toEqual(expect.arrayContaining(roleCodes))
    const rolesGroup = byKey.roles
    expect(rolesGroup?.rows).toHaveLength(roleCodes.length)
    for (const row of rolesGroup?.rows ?? []) {
      expect(row.items).toHaveLength(1)
    }
  })
})
