// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { PublicMemberCurrentProject } from '@/types/profile'

import { MemberCurrentProjectsSection } from './MemberCurrentProjectsSection'

const projectStyles = readFileSync('src/components/profile/MemberCurrentProjectsSection.module.css', 'utf8')
const { getMemberProjectsMock } = vi.hoisted(() => ({ getMemberProjectsMock: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>{children}</a>
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
    getMemberProjects: getMemberProjectsMock,
    resolveApiUrl: (value: string) => (value ? `resolved:${value}` : ''),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeProject(index = 1, overrides: Partial<PublicMemberCurrentProject> = {}): PublicMemberCurrentProject {
  return {
    anime_id: index,
    anime_title: `Projekt ${index}`,
    cover_url: '/api/v1/media/image?kind=primary',
    fansub_group_id: 100 + index,
    fansub_group_name: `Gruppe ${index}`,
    roles: ['Typesetting / FX'],
    release_versions: [],
    is_project_level: true,
    contribution_status: 'confirmed',
    ...overrides,
  }
}

describe('MemberCurrentProjectsSection', () => {
  it('uses the responsive two-column project grid without overflow', () => {
    expect(projectStyles).toMatch(/\.projectList\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
    expect(projectStyles).toMatch(/@media \(max-width: 1100px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)
    expect(projectStyles).toMatch(/@media \(max-width: 720px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/)
    expect(projectStyles).toMatch(/\.projectList > li\s*\{[\s\S]*?min-width: 0;/)
  })

  it('renders every known role with its global accent token, unknown roles as other, and Projektweit neutrally', () => {
    const roles = FANSUB_GROUP_ROLE_OPTIONS.map((option) => option.label)
    const { container } = render(
      <MemberCurrentProjectsSection
        memberSlug="subaru"
        projects={[makeProject(1, { roles: [...roles, 'Unbekannte Rolle'] })]}
        totalCount={1}
      />,
    )

    const expectedCodes = FANSUB_GROUP_ROLE_OPTIONS.map(({ code }) => (
      code === 'techadmin' ? 'admin' : code === 'gfxler' ? 'designer' : code
    ))
    for (const [index, label] of roles.entries()) {
      expect(screen.getByText(label).getAttribute('data-role-code')).toBe(expectedCodes[index])
    }
    expect(screen.getByText('Unbekannte Rolle').getAttribute('data-role-code')).toBe('other')
    expect(screen.getByText('Projektweit').className).toContain('badgeNeutral')
    expect(projectStyles).toContain('var(--role-accent-admin)')
    expect(projectStyles).toContain('var(--role-accent-designer)')
    expect(projectStyles).toContain('var(--role-accent-other)')
    expect(container.querySelector('[class*="projectArrow"]')).toBeNull()
  })

  it('makes the whole existing Card the exact project link without an isolated arrow', () => {
    const { container } = render(
      <MemberCurrentProjectsSection memberSlug="subaru" projects={[makeProject(7)]} totalCount={1} />,
    )

    const link = screen.getByRole('link', { name: 'Projekt 7 öffnen' })
    expect(link.getAttribute('href')).toBe('/anime/7/group/107')
    expect(within(link).getByText('Projekt 7')).not.toBeNull()
    expect(container.querySelector('section[class*="cardInteractive"]')).not.toBeNull()
    expect(container.querySelector('[class*="projectArrow"]')).toBeNull()
  })

  it('loads exactly the next six once while preserving the initial six and guarding in-flight clicks', async () => {
    const initial = Array.from({ length: 6 }, (_, index) => makeProject(index + 1))
    const next = Array.from({ length: 6 }, (_, index) => makeProject(index + 7))
    let resolveRequest!: (value: { data: { items: PublicMemberCurrentProject[]; total: number } }) => void
    getMemberProjectsMock.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    render(<MemberCurrentProjectsSection memberSlug="subaru" projects={initial} totalCount={50} />)

    expect(screen.getByText('6 von 50 Projekten sichtbar')).not.toBeNull()
    expect(getMemberProjectsMock).not.toHaveBeenCalled()
    const button = screen.getByRole('button', { name: 'Weitere Projekte laden' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(getMemberProjectsMock).toHaveBeenCalledTimes(1)
    expect(getMemberProjectsMock).toHaveBeenCalledWith('subaru', 6, 6)

    resolveRequest({ data: { items: next, total: 50 } })

    await waitFor(() => expect(screen.getByText('12 von 50 Projekten sichtbar')).not.toBeNull())
    const links = screen.getAllByRole('link').map((link) => link.textContent)
    expect(links).toHaveLength(12)
    expect(links.map((text) => text?.match(/Projekt \d+/)?.[0])).toEqual(
      Array.from({ length: 12 }, (_, index) => `Projekt ${index + 1}`),
    )
    expect(getMemberProjectsMock).toHaveBeenCalledTimes(1)
  })
})
