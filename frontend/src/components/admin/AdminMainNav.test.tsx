// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { AdminMainNav } from './AdminMainNav'

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users'))
vi.mock('next/navigation', () => ({ usePathname: mockUsePathname }))

afterEach(() => { cleanup(); vi.clearAllMocks(); mockUsePathname.mockReturnValue('/admin/users') })

describe('AdminMainNav', () => {
  it('renders the complete rights module navigation on rights routes', () => {
    render(<AdminMainNav />)
    for (const [name, href] of [['Benutzer', '/admin/users'], ['Gruppen', '/admin/groups'], ['Rollen', '/admin/roles'], ['Capabilities', '/admin/role-capabilities'], ['Claims', '/admin/claims'], ['Änderungen', '/admin/changes']]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href)
    }
  })

  it('keeps the navigation visible on nested rights routes', () => {
    mockUsePathname.mockReturnValue('/admin/users/42')
    render(<AdminMainNav />)
    expect(screen.getByRole('navigation', { name: 'Benutzer- und Rechte-Navigation' })).not.toBeNull()
  })

  it.each(['/admin/anime', '/admin/anime/1/edit', '/admin/fansubs', '/admin/fansubs/1/edit'])('hides the navigation outside the rights module: %s', (pathname) => {
    mockUsePathname.mockReturnValue(pathname)
    render(<AdminMainNav />)
    expect(screen.queryByRole('navigation', { name: 'Benutzer- und Rechte-Navigation' })).toBeNull()
  })
})