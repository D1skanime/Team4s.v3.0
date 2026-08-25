// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/auth/PlatformAdminGate', () => ({
  PlatformAdminGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import AdminOverviewPage from './page'

describe('AdminOverviewPage', () => {
  it('keeps a single global entry point for the users and rights module', () => {
    render(<AdminOverviewPage />)

    for (const name of [
      'Studio (Anime + Episoden)',
      'Benutzer & Rechte',
      'Mein Profil',
      'Separater Episoden-Modus',
      'Fansubs',
    ]) {
      expect(screen.getByRole('link', { name })).not.toBeNull()
    }

    for (const redundantEntry of ['Gruppen', 'Rollen', 'Claims', '\u00c4nderungen', 'Capabilities']) {
      expect(screen.queryByRole('link', { name: redundantEntry })).toBeNull()
    }
  })
})