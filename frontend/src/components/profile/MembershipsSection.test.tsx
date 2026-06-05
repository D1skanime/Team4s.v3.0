// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberProfileMembership } from '@/types/profile'

import { MembershipsSection } from './MembershipsSection'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    resolveApiUrl: (value: string) => (value ? `resolved:${value}` : ''),
  }
})

afterEach(() => {
  cleanup()
})

function makeMembership(overrides: Partial<MemberProfileMembership> = {}): MemberProfileMembership {
  return {
    fansub_group_id: 88,
    fansub_group_name: 'AnimeOwnage',
    fansub_group_slug: 'animeownage',
    logo_url: '/api/v1/media/files/logo.png',
    group_status: 'active',
    app_member_status: 'active',
    app_member_roles: ['fansub_lead'],
    has_historical_link: false,
    historical_member_status: null,
    ...overrides,
  }
}

describe('MembershipsSection', () => {
  it('renders each group as a real card link with logo, role, and group action', () => {
    const { container } = render(<MembershipsSection memberships={[makeMembership()]} />)

    expect(screen.getByRole('link', { name: /AnimeOwnage/i }).getAttribute('href')).toBe('/fansubs/animeownage')
    expect(container.querySelector('section[class*="cardInteractive"]')).not.toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('resolved:/api/v1/media/files/logo.png')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('AnimeOwnage Logo')
    expect(screen.getAllByText('Fansub-Lead')).toHaveLength(1)
    expect(screen.getByText('Zur Gruppe')).not.toBeNull()
    expect(screen.queryByText('fansub_lead')).toBeNull()
    expect(container.querySelector('[class*="badge"]')).toBeNull()
  })

  it('shows confirmed historical memberships as group-confirmed context without a badge or raw status code', () => {
    const { container } = render(
      <MembershipsSection
        memberships={[
          makeMembership({
            app_member_roles: [],
            has_historical_link: true,
            historical_member_status: 'confirmed',
            logo_url: null,
          }),
        ]}
      />,
    )

    expect(screen.getAllByText('Bestätigtes Gruppenmitglied')).toHaveLength(1)
    expect(screen.queryByText('inactive')).toBeNull()
    expect(container.querySelector('[class*="badge"]')).toBeNull()
  })

  it('keeps unconfirmed historical memberships distinct from verified accounts', () => {
    render(
      <MembershipsSection
        memberships={[
          makeMembership({
            app_member_roles: [],
            has_historical_link: true,
            historical_member_status: 'historical',
          }),
        ]}
      />,
    )

    expect(screen.getAllByText('Historischer Eintrag')).toHaveLength(1)
    expect(screen.queryByText('Verifiziert')).toBeNull()
  })
})
