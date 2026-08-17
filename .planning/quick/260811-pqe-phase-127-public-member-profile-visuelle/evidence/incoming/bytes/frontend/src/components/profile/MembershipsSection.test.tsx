// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ImgHTMLAttributes, ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberProfileMembership } from '@/types/profile'

import { MembershipsSection } from './MembershipsSection'

const profileStyles = readFileSync('src/components/profile/profile.module.css', 'utf8')

const { nextImageRenderMock } = vi.hoisted(() => ({
  nextImageRenderMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    nextImageRenderMock({ alt, unoptimized, ...props })
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
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
  vi.clearAllMocks()
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
  it('keeps membership cards bounded in a responsive overflow-safe grid', () => {
    const listRule = profileStyles.match(/\.membershipsList\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const cardRule = profileStyles.match(/\.membershipCard\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(listRule).toContain('grid-template-columns: repeat(3, minmax(0, 360px));')
    expect(listRule).not.toContain('auto-fit')
    expect(profileStyles).toMatch(
      /@media \(max-width: 1100px\)[\s\S]*?\.membershipsList\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 360px\)\);/,
    )
    expect(listRule).toContain('justify-content: start;')
    expect(cardRule).toContain('min-width: 0;')
    expect(profileStyles).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.membershipsList\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    )
    const linkRule = profileStyles.match(/\.membershipLink\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(cardRule).toContain('padding: 0;')
    expect(linkRule).toContain('height: 100%;')
    expect(linkRule).toContain('padding: 14px;')
    expect(linkRule).toContain('border-radius: inherit;')
    expect(profileStyles).toMatch(/\.membershipLink:focus-visible\s*\{[\s\S]*?outline:/)
  })

  it('keeps h2 as the standalone default and exposes h3 for the profile pair', () => {
    const membership = makeMembership()
    const { rerender } = render(<MembershipsSection memberships={[membership]} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Fansub-Gruppen' })).toBeTruthy()
    rerender(
      <MembershipsSection memberships={[membership]} title="Gruppenzugehörigkeit" headingLevel={3} />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Gruppenzugehörigkeit' })).toBeTruthy()
  })

  it('renders each group as a real card link with logo, role, and group action', () => {
    const { container } = render(<MembershipsSection memberships={[makeMembership({ joined_year: 2014 })]} />)

    expect(screen.getByRole('link', { name: /AnimeOwnage/i }).getAttribute('href')).toBe('/fansubs/animeownage')
    expect(container.querySelector('section[class*="cardInteractive"]')).not.toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('resolved:/api/v1/media/files/logo.png')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('AnimeOwnage Logo')
    expect(nextImageRenderMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 52,
      height: 52,
      sizes: '52px',
      loading: 'lazy',
      unoptimized: false,
    }))
    expect(screen.getAllByText('Gruppenleitung')).toHaveLength(1)
    expect(screen.getAllByText('Mitglied seit 2014')).toHaveLength(1)
    expect(screen.getByText('Zur Gruppe')).not.toBeNull()
    expect(screen.queryByText('fansub_lead')).toBeNull()
    expect(container.querySelector('[class*= badge]')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
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
