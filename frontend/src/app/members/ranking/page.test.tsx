// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MemberRankingPage from './page'

const { getMemberPointRankingMock } = vi.hoisted(() => ({
  getMemberPointRankingMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    getMemberPointRanking: getMemberPointRankingMock,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

async function renderRankingPage(searchParams: { page?: string } = {}) {
  const result = await MemberRankingPage({ searchParams: Promise.resolve(searchParams) })
  return render(result)
}

describe('MemberRankingPage (D-01)', () => {
  it('renders account members (slug !== null) as a link to their profile', async () => {
    getMemberPointRankingMock.mockResolvedValue({
      data: [{ member_id: 1, display_name: 'Ballelboy', slug: 'ballelboy', total_points: 220 }],
      total: 1,
      page: 1,
    })

    await renderRankingPage()

    const link = screen.getByRole('link', { name: 'Ballelboy' })
    expect(link.getAttribute('href')).toBe('/members/ballelboy')
  })

  it('renders historical entries without a profile (slug === null) as plain text, never a link', async () => {
    getMemberPointRankingMock.mockResolvedValue({
      data: [{ member_id: 2, display_name: 'Historisches Mitglied', slug: null, total_points: 40 }],
      total: 1,
      page: 1,
    })

    await renderRankingPage()

    expect(screen.getByText('Historisches Mitglied')).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'Historisches Mitglied' })).toBeNull()
  })

  it('renders the empty state when there are no ranking rows', async () => {
    getMemberPointRankingMock.mockResolvedValue({ data: [], total: 0, page: 1 })

    await renderRankingPage()

    expect(screen.getByText('Noch keine Punkte vergeben')).not.toBeNull()
  })

  it('renders the error state when the ranking fetch rejects', async () => {
    getMemberPointRankingMock.mockRejectedValue(new Error('boom'))

    await renderRankingPage()

    expect(screen.getByText('Rangliste konnte nicht geladen werden')).not.toBeNull()
  })

  it('derives rank numbers from the backend-clamped result.page, not the unclamped URL param (CR-01)', async () => {
    // URL asks for an out-of-range page; backend clamps to 1000 and returns that in result.page.
    getMemberPointRankingMock.mockResolvedValue({
      data: [{ member_id: 7, display_name: 'Geklammert', slug: 'geklammert', total_points: 5 }],
      total: 50_050,
      page: 1000,
    })

    await renderRankingPage({ page: '99999' })

    // Rank must be (1000 - 1) * 50 + 1 = 49951, NOT (99999 - 1) * 50 + 1.
    expect(screen.getByText('49951')).not.toBeNull()
    expect(screen.queryByText('4999901')).toBeNull()
  })

  it('calls getMemberPointRanking exactly once per render (no per-row API fan-out, SC-4)', async () => {
    getMemberPointRankingMock.mockResolvedValue({
      data: [
        { member_id: 1, display_name: 'Ballelboy', slug: 'ballelboy', total_points: 220 },
        { member_id: 2, display_name: 'Historisches Mitglied', slug: null, total_points: 40 },
      ],
      total: 2,
      page: 1,
    })

    await renderRankingPage()

    expect(getMemberPointRankingMock).toHaveBeenCalledTimes(1)
  })
})
