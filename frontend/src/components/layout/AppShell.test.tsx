// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; className?: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

afterEach(() => {
  cleanup()
})

describe('AppShell', () => {
  it('gives signed-in non-admin members a visible path to their own profile', () => {
    render(
      <AppShell currentPath="/me/profile" user={{ displayName: 'Mika', email: 'mika@example.com' }}>
        <main>Profilinhalt</main>
      </AppShell>,
    )

    const profileLink = screen.getByRole('link', { name: /Mein Profil/i })
    expect(profileLink.getAttribute('href')).toBe('/me/profile')
    expect(profileLink.getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Mika')).not.toBeNull()
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

  it('marks unavailable future member targets without fake routes', () => {
    render(
      <AppShell currentPath="/me/profile">
        <main>Profilinhalt</main>
      </AppShell>,
    )

    expect(screen.queryByRole('link', { name: /Meine Gruppen/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Meine Beiträge/i })).toBeNull()
    expect(screen.getAllByText('bald').length).toBeGreaterThanOrEqual(2)
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

  it('shows login and register actions in anonymous mode', () => {
    render(
      <AppShell mode="anonymous" currentPath="/anime">
        <main>Anime</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    expect(screen.getByRole('link', { name: /Anmelden/i })).not.toBeNull()
    expect(screen.getByRole('link', { name: /Registrieren/i })).not.toBeNull()
  })

  it('shows the provided avatar image for signed-in members', () => {
    render(
      <AppShell
        currentPath="/me/profile"
        user={{ displayName: 'Mika', email: 'mika@example.com', avatarUrl: 'https://cdn.test.com/av.jpg' }}
      >
        <main>Profilinhalt</main>
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))

    const avatar = screen.getByRole('img', { name: /Avatar von Mika/i })
    expect(avatar.getAttribute('src')).toBe('https://cdn.test.com/av.jpg')
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
