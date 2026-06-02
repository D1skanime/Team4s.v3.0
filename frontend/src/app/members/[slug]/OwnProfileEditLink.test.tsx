// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnProfileEditLink } from './OwnProfileEditLink'

const getOwnProfileMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/api', () => ({
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

beforeEach(() => {
  getOwnProfileMock.mockReset()
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: false,
    hasRefreshToken: true,
    displayName: 'Ballelboy',
    isClientInitialized: true,
  })
})

afterEach(() => {
  cleanup()
})

describe('OwnProfileEditLink', () => {
  it('links back to the profile editor when the public profile belongs to the active session', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 3 } })

    render(<OwnProfileEditLink publicMemberId={3} />)

    const link = await screen.findByRole('link', { name: 'Profil bearbeiten' })
    expect(link.getAttribute('href')).toBe('/me/profile')
    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
  })

  it('stays hidden for another member profile', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 4 } })

    render(<OwnProfileEditLink publicMemberId={3} />)

    await waitFor(() => expect(getOwnProfileMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
  })

  it('does not call the protected profile API without an active auth session', () => {
    useAuthSessionMock.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: false,
      displayName: '',
      isClientInitialized: true,
    })

    render(<OwnProfileEditLink publicMemberId={3} />)

    expect(getOwnProfileMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
  })
})
