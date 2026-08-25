// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const apiMocks = vi.hoisted(() => ({ getReviewDelegations: vi.fn(), mutateReviewDelegation: vi.fn() }))
vi.mock('@/lib/api', () => apiMocks)
const { getReviewDelegations, mutateReviewDelegation } = apiMocks

import { ReviewDelegationSection } from './ReviewDelegationSection'

afterEach(() => { cleanup(); vi.clearAllMocks() })

const rows = [
  { action_code: 'review.contribution.decide', granted: false, membership_active: true, app_user_active: true, has_verified_claim: true, eligible_for_grant: true },
  { action_code: 'review.image.decide', granted: true, membership_active: true, app_user_active: true, has_verified_claim: true, eligible_for_grant: true },
  { action_code: 'review.text.decide', granted: false, membership_active: false, app_user_active: true, has_verified_claim: true, eligible_for_grant: false },
]

describe('ReviewDelegationSection', () => {
  it('uses the fixed row order and explains ineligible members', async () => {
    getReviewDelegations.mockResolvedValue(rows)
    render(<ReviewDelegationSection fansubGroupId={3} appUserId={7} />)
    await screen.findByText('Medien/Bilder prüfen')
    const labels = screen.getAllByRole('switch').map((entry) => entry.getAttribute('aria-label'))
    expect(labels).toEqual(['Medien/Bilder prüfen', 'Notizen/Texte prüfen', 'Mitwirkungen prüfen'])
    expect(screen.getByText('Nicht aktiv in dieser Gruppe.')).not.toBeNull()
  })

  it('reverts a failed optimistic toggle and shows a retryable error', async () => {
    getReviewDelegations.mockResolvedValue(rows)
    mutateReviewDelegation.mockRejectedValueOnce(new Error('failed'))
    render(<ReviewDelegationSection fansubGroupId={3} appUserId={7} />)
    const toggle = await screen.findByRole('switch', { name: 'Mitwirkungen prüfen' })
    fireEvent.click(toggle)
    await screen.findByRole('alert')
    expect(mutateReviewDelegation).toHaveBeenCalledWith(3, 7, { action_code: 'review.contribution.decide', grant: true })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })
})