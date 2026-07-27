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

async function loadMemberBadgeChain(): Promise<{
  MemberBadgeChain: ComponentType<{
    earnedBadges: PublicMemberBadge[]
    catalog: MemberBadgeCatalogItem[]
  }>
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

    const chain = screen.getByRole('list', { name: 'Auszeichnungen' })
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
