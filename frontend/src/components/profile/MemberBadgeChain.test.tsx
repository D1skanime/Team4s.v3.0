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
})
