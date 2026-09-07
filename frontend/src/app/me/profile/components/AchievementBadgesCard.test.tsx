// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberBadge } from '@/types/contributions'

import { AchievementBadgesCard } from './AchievementBadgesCard'

afterEach(() => {
  cleanup()
})

function makeBadge(overrides: Partial<MemberBadge> = {}): MemberBadge {
  return {
    id: 7,
    badge_code: 'founding_member',
    badge_category: 'historical_achievement',
    visibility: 'hidden',
    awarded_at: '2026-06-01T10:00:00Z',
    current_threshold: null,
    ...overrides,
  }
}

describe('AchievementBadgesCard', () => {
  it('shows hidden badges so they can be restored from edit profile', () => {
    const onVisibilityChange = vi.fn()

    render(
      <AchievementBadgesCard
        badges={[makeBadge()]}
        disabled={false}
        pendingBadgeId={null}
        onVisibilityChange={onVisibilityChange}
      />,
    )

    expect(screen.getByText('Gründungsmitglied')).not.toBeNull()
    expect(screen.getByText('Nur für dich')).not.toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Gründungsmitglied öffentlich anzeigen' }))

    expect(onVisibilityChange).toHaveBeenCalledWith(7, 'public')
  })

  it('reconstructs the suffixed role-volume label from current_threshold (D-30, seventh site)', () => {
    const onVisibilityChange = vi.fn()

    render(
      <AchievementBadgesCard
        badges={[makeBadge({
          id: 9,
          badge_code: 'role_volume_translator_gold',
          badge_category: 'role_volume',
          current_threshold: 320,
        })]}
        disabled={false}
        pendingBadgeId={null}
        onVisibilityChange={onVisibilityChange}
      />,
    )

    expect(screen.getByText('Gold · 320+')).not.toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Gold · 320+ öffentlich anzeigen' })).not.toBeNull()
  })

  it('renders the bare label without a threshold suffix when current_threshold is null', () => {
    render(
      <AchievementBadgesCard
        badges={[makeBadge()]}
        disabled={false}
        pendingBadgeId={null}
        onVisibilityChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Gründungsmitglied')).not.toBeNull()
    expect(screen.queryByText(/Gründungsmitglied ·/)).toBeNull()
  })
})
