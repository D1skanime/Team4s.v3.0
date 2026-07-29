// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberProfileMembership } from '@/types/profile'

import { MyGroupsSection } from './MyGroupsSection'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img alt={props.alt as string} src={props.src as string} />,
}))

afterEach(() => {
  cleanup()
})

function makeMembership(overrides: Partial<MemberProfileMembership> = {}): MemberProfileMembership {
  return {
    fansub_group_id: 1,
    fansub_group_name: 'c-subs',
    fansub_group_slug: 'c-subs',
    logo_url: null,
    group_status: 'active',
    joined_year: 2024,
    left_year: null,
    app_member_roles: [],
    has_historical_link: false,
    ...overrides,
  }
}

describe('MyGroupsSection (Phase 116, D-05/D-09)', () => {
  it('rendert die D-09-EmptyState mit funktionierendem /fansubs-Link, wenn memberships leer ist, und rendert MembershipsSection nicht', () => {
    render(<MyGroupsSection memberships={[]} />)

    expect(screen.getByText('Noch in keiner Gruppe')).not.toBeNull()
    expect(
      screen.getByText(
        'Tritt einer Fansub-Gruppe bei oder entdecke, wer an deinen Lieblingsanimes arbeitet.',
      ),
    ).not.toBeNull()

    const link = screen.getByRole('link', { name: /Fansub-Gruppen entdecken/i })
    expect(link.getAttribute('href')).toBe('/fansubs')

    expect(screen.queryByText('Keine Gruppen eingetragen.')).toBeNull()
  })

  it('rendert MembershipsSection mit title="Meine Gruppen" statt der EmptyState, wenn memberships nicht leer ist', () => {
    render(<MyGroupsSection memberships={[makeMembership()]} />)

    expect(screen.queryByText('Noch in keiner Gruppe')).toBeNull()
    expect(screen.getAllByText('Meine Gruppen').length).toBeGreaterThan(0)
    expect(screen.getByText('c-subs')).not.toBeNull()

    const groupLink = screen.getByRole('link', { name: /Zur Gruppe/i })
    expect(groupLink.getAttribute('href')).toBe('/fansubs/c-subs')
  })
})
