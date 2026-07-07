// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberCurrentProject } from '@/types/profile'

import { MemberCurrentProjectsSection } from './MemberCurrentProjectsSection'

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

function makeProject(): PublicMemberCurrentProject {
  return {
    anime_id: 1,
    anime_title: "Viper's Creed",
    cover_url: '/api/v1/media/image?kind=primary',
    fansub_group_id: 7,
    fansub_group_name: 'C-Subs',
    roles: ['Typesetting / FX'],
    release_versions: Array.from({ length: 12 }, (_, index) => ({
      release_version_id: index + 1,
      release_version_label: `Episode ${index + 1}`,
      version: 'v1',
      episode_number: String(index + 1),
      roles: ['Typesetting / FX'],
    })),
    is_project_level: true,
    contribution_status: 'confirmed',
  }
}

describe('MemberCurrentProjectsSection', () => {
  it('renders project summary with poster and does not expand release-version episodes', () => {
    const { container } = render(<MemberCurrentProjectsSection projects={[makeProject()]} />)

    expect(screen.getByRole('heading', { name: 'Aktuelle Projekte' })).not.toBeNull()
    expect(screen.getByRole('link', { name: /Viper's Creed/i }).getAttribute('href')).toBe('/anime/1/group/7')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('resolved:/api/v1/media/image?kind=primary')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe("Viper's Creed Cover")
    expect(screen.getByText('Typesetting / FX')).not.toBeNull()
    expect(screen.getByText('Projekt öffnen')).not.toBeNull()
    expect(screen.queryByText('Episode 1')).toBeNull()
    expect(screen.queryByText('Episode 12')).toBeNull()
  })
})
