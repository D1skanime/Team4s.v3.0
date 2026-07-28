// @vitest-environment jsdom
//
// Plan 111-02, Task 1 (RED): page.tsx existiert noch nicht.
// Importfehler auf './page' ist das erwartete RED-Signal.
//
// Prüft ausschließlich das serverseitige PlatformAdminGate der neuen Detailroute
// (T-111-03). Die eigentliche Accordion-/Detail-Logik wird in
// UserDetailPageClient.test.tsx separat geprüft — hier wird UserDetailPageClient
// gemockt, damit dieser Test rein das Gate-Verhalten isoliert.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// --- Mocks ---

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({ hasAccessToken: true, hasRefreshToken: true, isClientInitialized: true }),
}))

const mockGetCurrentUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({
  getCurrentUser: mockGetCurrentUser,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

vi.mock('./UserDetailPageClient', () => ({
  UserDetailPageClient: () => <div data-testid="user-detail-page-client">Detailinhalt</div>,
}))

import UserDetailPage from './page'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserDetailPage (/admin/users/[id])', () => {
  // --- gate blocks non admin ---
  it('gate blocks non admin', async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: { id: 2, display_name: 'Normalo', is_platform_admin: false },
    })

    render(<UserDetailPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Diese Ansicht ist dem Team4s-Admin vorbehalten.'),
      ).not.toBeNull()
    })

    expect(screen.queryByTestId('user-detail-page-client')).toBeNull()
  })

  // --- gate renders for admin ---
  it('gate renders for admin', async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: { id: 1, display_name: 'Admin', is_platform_admin: true },
    })

    render(<UserDetailPage />)

    expect(await screen.findByTestId('user-detail-page-client')).not.toBeNull()
  })
})
