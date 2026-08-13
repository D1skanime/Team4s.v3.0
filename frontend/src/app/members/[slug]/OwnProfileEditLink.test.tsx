// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberViewer } from '@/types/profile'

const getMemberProfileMock = vi.hoisted(() => vi.fn())
const getOwnProfileMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/lib/api', () => ({
  getMemberProfile: (...args: unknown[]) => getMemberProfileMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => <button type="button">Korrektur melden</button>,
}))

import { OwnProfileEditLink } from './OwnProfileEditLink'

const ownerViewer: PublicMemberViewer = {
  is_owner: true,
  is_private_preview: false,
}
const nonOwnerViewer: PublicMemberViewer = {
  is_owner: false,
  is_private_preview: false,
}

function renderToolbar(overrides: Record<string, unknown> = {}) {
  return render(
    <OwnProfileEditLink
      storedSlug="canonical-owner"
      publicMemberId={3}
      memberName="Canonical Owner"
      initialViewer={nonOwnerViewer}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  getMemberProfileMock.mockReset()
  getOwnProfileMock.mockReset()
  getOwnProfileMock.mockResolvedValue({ data: { member_id: 3 } })
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

describe('OwnProfileEditLink authoritative viewer actions', () => {
  it('shows neither action while browser auth is initializing', () => {
    useAuthSessionMock.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: false,
      isClientInitialized: false,
    })

    renderToolbar()

    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
    expect(screen.queryByText('Korrektur melden')).toBeNull()
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })

  it('uses the stored slug and central refresh seam for a refresh-only owner', async () => {
    getMemberProfileMock.mockResolvedValue({ viewer: ownerViewer })

    renderToolbar()

    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
    expect(screen.queryByText('Korrektur melden')).toBeNull()

    const editLink = await screen.findByRole('link', { name: 'Profil bearbeiten' })
    expect(editLink.getAttribute('href')).toBe('/me/profile')
    expect(screen.queryByText('Korrektur melden')).toBeNull()
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('canonical-owner')
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('renders correction only after an authenticated non-owner resolves', async () => {
    getMemberProfileMock.mockResolvedValue({ viewer: nonOwnerViewer })

    renderToolbar()

    expect(screen.queryByText('Korrektur melden')).toBeNull()
    await waitFor(() => expect(screen.getByText('Korrektur melden')).toBeTruthy())
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
  })

  it('uses the public server viewer for an initialized anonymous visitor', () => {
    useAuthSessionMock.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: false,
      isClientInitialized: true,
    })

    renderToolbar()

    expect(screen.getByText('Korrektur melden')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })

  it('renders neither action when the authoritative endpoint is unavailable', async () => {
    getMemberProfileMock.mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }))

    renderToolbar()

    await waitFor(() => expect(getMemberProfileMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
    expect(screen.queryByText('Korrektur melden')).toBeNull()
  })

  it('reuses an already-resolved preview viewer without a duplicate request', () => {
    renderToolbar({
      initialViewer: ownerViewer,
      viewerResolved: true,
    })

    expect(screen.getByRole('link', { name: 'Profil bearbeiten' })).toBeTruthy()
    expect(screen.queryByText('Korrektur melden')).toBeNull()
    expect(getMemberProfileMock).not.toHaveBeenCalled()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })
})