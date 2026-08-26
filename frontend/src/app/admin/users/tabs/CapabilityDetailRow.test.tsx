// @vitest-environment jsdom
//
// 260826-6vu -- regression test protecting CapabilityDetailRow's Option (d)
// asymmetric grant/deny split for the 3 review-delegation actions
// (140-VERIFICATION.md Gap 3). "Gewähren" for review.image.decide,
// review.text.decide, and review.contribution.decide is only ever done via
// the review-delegation section, never via the generic grant button.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EffectiveRightState } from '@/types/admin-capability'
import { CapabilityDetailRow } from './CapabilityDetailRow'

const mockListOverrideHistory = vi.fn()

vi.mock('@/lib/api', () => ({
  listOverrideHistory: (...args: unknown[]) => mockListOverrideHistory(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

// jsdom does not implement Element.prototype.scrollIntoView -- same test-infra shim as
// RolesClient.test.tsx, no production behavior change.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn()
}

beforeEach(() => {
  mockListOverrideHistory.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group.edit',
    allowed: true,
    provenance: 'group_role',
    decisive: true,
    non_deniable: false,
    granting_roles: ['co_leader'],
    user_allow: false,
    user_deny: false,
    specialized_grants: [],
    decisive_source: 'group_role',
    reason_code: 'group_role_grant',
    ...overrides,
  }
}

async function renderRow(overrides: Partial<EffectiveRightState>) {
  const onOpenRevoke = vi.fn()
  const onOpenGrant = vi.fn()
  render(
    <table>
      <tbody>
        <CapabilityDetailRow
          groupId={1}
          appUserId={42}
          label="Testrecht"
          state={makeState(overrides)}
          matrix={null}
          onOpenRevoke={onOpenRevoke}
          onOpenGrant={onOpenGrant}
        />
      </tbody>
    </table>,
  )
  await waitFor(() => expect(mockListOverrideHistory).toHaveBeenCalled())
  return { onOpenRevoke, onOpenGrant }
}

const REVIEW_ACTION_CODES = ['review.image.decide', 'review.text.decide', 'review.contribution.decide'] as const

describe('CapabilityDetailRow Option (d) review-delegation grant split', () => {
  it.each(REVIEW_ACTION_CODES)('hides the generic grant button and shows the delegation hint for %s', async (actionCode) => {
    await renderRow({ action_code: actionCode, allowed: false })

    expect(screen.queryByText('Recht zusätzlich erlauben')).toBeNull()
    expect(screen.getByText('Gewähren nur über „Prüf-/Freigabe-Rechte" oben.')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Zu Prüf-/Freigabe-Rechte springen' })).not.toBeNull()
  })

  it('shows the generic grant button and no delegation hint for a non-review action', async () => {
    await renderRow({ action_code: 'fansub_group.members.manage', allowed: false })

    expect(screen.getByText('Recht zusätzlich erlauben')).not.toBeNull()
    expect(screen.queryByText('Gewähren nur über „Prüf-/Freigabe-Rechte" oben.')).toBeNull()
  })

  it('leaves the deny/revoke path untouched for an allowed review action', async () => {
    await renderRow({ action_code: 'review.image.decide', allowed: true, non_deniable: false })

    expect(screen.getByText('Recht entziehen')).not.toBeNull()
  })

  it('scrolls to the review-delegation section when the jump link is clicked', async () => {
    // The onClick handler looks up #review-delegation-section by id (it lives elsewhere on the
    // real admin page, outside this row) -- provide it here so the optional-chained
    // scrollIntoView call is actually reached.
    const target = document.createElement('div')
    target.id = 'review-delegation-section'
    document.body.appendChild(target)

    await renderRow({ action_code: 'review.image.decide', allowed: false })

    const scrollIntoViewMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
    fireEvent.click(screen.getByRole('button', { name: 'Zu Prüf-/Freigabe-Rechte springen' }))

    expect(scrollIntoViewMock).toHaveBeenCalled()

    document.body.removeChild(target)
  })
})
