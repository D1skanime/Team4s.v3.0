// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'

const routerPushMock = vi.hoisted(() => vi.fn())
const logoutAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; className?: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

vi.mock('@/lib/useAuthSession', () => ({
  useLogoutAuthSession: () => logoutAuthSessionMock,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AppShell', () => {
  it('gives signed-in non-admin members a visible path to their own profile', () => {
    render(
      <AppShell currentPath="/me/profile" user={{ displayName: 'Mika', email: 'mika@example.com' }} hasMemberProfile>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const profileLink = screen.getByRole('link', { name: /Mein Profil/i })
    expect(profileLink.getAttribute('href')).toBe('/me/profile')
    expect(profileLink.getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Mika')).not.toBeNull()
  })

  it('labels account-only users as account users instead of members', () => {
    render(
      <AppShell currentPath="/me/profile" user={{ displayName: 'Phase Admin', email: 'platform-admin@example.com' }}>
        <main>Accountinhalt</main>
      </AppShell>,
    )

    expect(screen.getByRole('link', { name: /Mein Account/i }).getAttribute('href')).toBe('/me/profile')
    expect(screen.queryByRole('link', { name: /Mein Profil/i })).toBeNull()
    expect(screen.getAllByText('Plattform').length).toBeGreaterThan(0)
    expect(screen.queryByText('Member Hub')).toBeNull()
  })

  it('hides capability-gated admin navigation for normal members', () => {
    render(
      <AppShell currentPath="/me/profile" canAccessAdmin={false}>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    expect(screen.queryByRole('link', { name: /Verwaltung/i })).toBeNull()
    expect(screen.queryByText('Verwaltung')).toBeNull()
    expect(screen.queryByText('geschützt')).toBeNull()
  })

  it('hides the groups section when the member has no memberships', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    expect(screen.queryByRole('link', { name: /Meine Gruppen/i })).toBeNull()
    expect(screen.queryByText('Meine Gruppen')).toBeNull()
  })

  it('links signed-in members to their project workspace', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const contributionsLink = screen.getByRole('link', { name: /Meine Projekte/i })
    expect(contributionsLink.getAttribute('href')).toBe('/me/contributions')
  })

  it('renders member group memberships as fansub edit links', () => {
    render(
      <AppShell
        currentPath="/admin/fansubs/42/edit"
        hasMemberProfile
        memberships={[
          { fansub_group_id: 42, fansub_group_name: 'Moon Subs', fansub_group_slug: 'moon-subs' },
          { fansub_group_id: 77, fansub_group_name: 'Kumo Fansubs', fansub_group_slug: 'kumo-fansubs' },
        ]}
      >
        <main>Profilinhalt</main>
      </AppShell>,
    )

    expect(screen.getByText('Meine Gruppen')).not.toBeNull()

    const moonLink = screen.getByRole('link', { name: /Moon Subs/i })
    expect(moonLink.getAttribute('href')).toBe('/admin/fansubs/42/edit')
    expect(moonLink.getAttribute('aria-current')).toBe('page')

    const kumoLink = screen.getByRole('link', { name: /Kumo Fansubs/i })
    expect(kumoLink.getAttribute('href')).toBe('/admin/fansubs/77/edit')
  })

  it('keeps admin navigation available when the caller has the capability', () => {
    render(
      <AppShell currentPath="/admin" canAccessAdmin>
        <main>Admininhalt</main>
      </AppShell>,
    )

    const adminLink = screen.getByRole('link', { name: /Verwaltung/i })
    expect(adminLink.getAttribute('href')).toBe('/admin')
  })

  it('keeps mobile navigation collapsed until requested', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const navButton = screen.getByRole('button', { name: /Navigation/i })
    expect(navButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText('Hauptnavigation mobil')).toBeNull()
  })

  it('opens the mobile navigation from the header button', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const navButton = screen.getByRole('button', { name: /Navigation/i })
    fireEvent.click(navButton)

    expect(navButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('Hauptnavigation mobil')).not.toBeNull()
    expect(screen.getAllByText('Mein Bereich').length).toBeGreaterThanOrEqual(1)
  })
})

describe('AppShell drawer behavior', () => {
  it('opens the drawer from the header button', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const navButton = screen.getByRole('button', { name: /Navigation/i })
    fireEvent.click(navButton)

    expect(navButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('Team4s Navigation')).not.toBeNull()
  })

  it('closes the open drawer with Escape', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const navButton = screen.getByRole('button', { name: /Navigation/i })
    fireEvent.click(navButton)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(navButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the open drawer from the backdrop button', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const navButton = screen.getByRole('button', { name: /Navigation/i })
    fireEvent.click(navButton)
    fireEvent.click(screen.getByRole('button', { name: /Drawer schließen/i }))

    expect(navButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the login action in anonymous mode', () => {
    render(
      <AppShell mode="anonymous" currentPath="/anime">
        <main>Anime</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    expect(screen.getByRole('link', { name: /Anmelden/i })).not.toBeNull()
    expect(screen.queryByRole('link', { name: /Registrieren/i })).toBeNull()
  })

  it('shows the provided avatar image for signed-in members', () => {
    render(
      <AppShell
        currentPath="/me/profile"
        user={{ displayName: 'Mika', email: 'mika@example.com', avatarUrl: 'https://cdn.test.com/av.gif' }}
      >
        <main>Profilinhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    const avatar = screen.getByRole('img', { name: /Avatar von Mika/i })
    expect(avatar.getAttribute('src')).toBe('https://cdn.test.com/av.gif')
    expect(avatar.getAttribute('data-unoptimized')).toBe('true')
  })

  it('falls back to initials when no avatar image exists', () => {
    render(
      <AppShell currentPath="/me/profile" user={{ displayName: 'Mika', email: 'mika@example.com' }}>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    expect(screen.queryByRole('img', { name: /Avatar von Mika/i })).toBeNull()
    expect(screen.getByText('M')).not.toBeNull()
  })

  it('shows the admin link when the caller has the capability', () => {
    render(
      <AppShell currentPath="/admin" canAccessAdmin>
        <main>Admininhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    const adminLink = screen.getByRole('link', { name: /Verwaltung/i })
    expect(adminLink.getAttribute('href')).toBe('/admin')
  })

  it('logs out signed-in members from the drawer footer', async () => {
    logoutAuthSessionMock.mockResolvedValue(undefined)

    render(
      <AppShell currentPath="/me/profile" user={{ displayName: 'Mika', email: 'mika@example.com' }} hasMemberProfile>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))
    fireEvent.click(screen.getByRole('button', { name: /Abmelden/i }))

    await waitFor(() => {
      expect(logoutAuthSessionMock).toHaveBeenCalledTimes(1)
      expect(routerPushMock).toHaveBeenCalledWith('/login')
    })
  })

  it('hides the admin link when the caller lacks the capability', () => {
    render(
      <AppShell currentPath="/me/profile" canAccessAdmin={false}>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    expect(screen.queryByRole('link', { name: /Verwaltung/i })).toBeNull()
  })
})
