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

    expect(screen.getByText('★ Gründungsmitglied')).not.toBeNull()
    expect(screen.getByText('Ausgeblendet')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Sichtbarkeit'), { target: { value: 'public' } })

    expect(onVisibilityChange).toHaveBeenCalledWith(7, 'public')
  })
})
