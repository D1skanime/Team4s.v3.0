// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; className?: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
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
})
