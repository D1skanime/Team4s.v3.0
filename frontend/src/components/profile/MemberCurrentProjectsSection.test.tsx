// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberCurrentProject } from '@/types/profile'

import { MemberCurrentProjectsSection } from './MemberCurrentProjectsSection'

const projectStyles = readFileSync('src/components/profile/MemberCurrentProjectsSection.module.css', 'utf8')
const { getMemberProjectsMock } = vi.hoisted(() => ({ getMemberProjectsMock: vi.fn() }))
const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typesetter', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 20, color_key: 'technical', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 30, color_key: 'creative', icon_key: 'image' },
    { code: 'translator', label_de: 'Übersetzung', contexts: ['anime_contribution'], sort_order: 40, color_key: 'language', icon_key: 'languages' },
  ],
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, sizes, loading }: { src: string; alt: string; sizes?: string; loading?: 'eager' | 'lazy' }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} sizes={sizes} loading={loading} />
  ),
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
  vi.unstubAllGlobals()
})

function makeProject(index = 1, overrides: Partial<PublicMemberCurrentProject> = {}): PublicMemberCurrentProject {
  return {
    anime_id: index,
    anime_title: `Projekt ${index}`,
    cover_url: '/api/v1/media/image?kind=primary',
    fansub_group_id: 100 + index,
    fansub_group_name: `Gruppe ${index}`,
    roles: [{ code: 'typesetter', label_de: 'Typesetting / FX' }],
    release_versions: [],
    is_project_level: true,
    contribution_status: 'confirmed',
    ...overrides,
  }
}

describe('MemberCurrentProjectsSection', () => {
  it('aligns equal-height cards and the count/load footer with the project grid', () => {
    expect(projectStyles).toMatch(/\.projectList\s*>\s*li\s*\{[^}]*height:\s*100%;/s)
    expect(projectStyles).toMatch(/\.projectFooter\s*\{[^}]*padding-top:\s*var\(--space-2\)/s)
  })

  it('uses the responsive two-column project grid without overflow', () => {
    expect(projectStyles).toMatch(/\.projectList\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
    expect(projectStyles).toMatch(/@media \(max-width: 1100px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)
    expect(projectStyles).toMatch(/@media \(max-width: 720px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/)
    expect(projectStyles).toMatch(/\.projectList > li\s*\{[\s\S]*?min-width: 0;/)
  })

  it('orders and labels catalog roles while keeping karaoke, typesetting and unknown roles distinct', () => {
    const roles = [
      { code: 'karaoke_fx', label_de: 'stale karaoke label' },
      { code: 'future_role', label_de: 'stale unknown label' },
      { code: 'typesetter', label_de: 'stale typesetting label' },
    ]
    const { container } = render(
      <MemberCurrentProjectsSection
        memberSlug="subaru"
        projects={[makeProject(1, { roles })]}
        totalCount={1}
      />,
    )

    const chips = container.querySelectorAll('[class*="roleChip"]')
    expect(Array.from(chips).map((chip) => chip.textContent)).toEqual(['Typesetting', 'Karaoke-FX', 'Future Role'])
    expect(screen.getByText('Typesetting').getAttribute('data-role-code')).toBe('technical')
    expect(screen.getByText('Karaoke-FX').getAttribute('data-role-code')).toBe('creative')
    expect(screen.getByText('Future Role').getAttribute('data-role-code')).toBe('other')
    expect(screen.getByText('Projektweit').className).toContain('badgeNeutral')
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
    expect(getMemberProjectsMock).toHaveBeenCalledWith('subaru', 6, 6, expect.any(AbortSignal))

    resolveRequest({ data: { items: next, total: 50 } })

    await waitFor(() => expect(screen.getByText('12 von 50 Projekten sichtbar')).not.toBeNull())
    const links = screen.getAllByRole('link').map((link) => link.textContent)
    expect(links).toHaveLength(12)
    expect(links.map((text) => text?.match(/Projekt \d+/)?.[0])).toEqual(
      Array.from({ length: 12 }, (_, index) => `Projekt ${index + 1}`),
    )
    expect(getMemberProjectsMock).toHaveBeenCalledTimes(1)
  })

  it('shows a local ErrorState with a working retry on a failed continuation load, keeping the initial six visible', async () => {
    const initial = Array.from({ length: 6 }, (_, index) => makeProject(index + 1))
    const next = Array.from({ length: 6 }, (_, index) => makeProject(index + 7))
    getMemberProjectsMock.mockRejectedValueOnce(new Error('network down'))
    getMemberProjectsMock.mockResolvedValueOnce({ data: { items: next, total: 50 } })

    render(<MemberCurrentProjectsSection memberSlug="subaru" projects={initial} totalCount={50} />)

    const button = screen.getByRole('button', { name: 'Weitere Projekte laden' })
    fireEvent.click(button)

    await waitFor(() =>
      expect(screen.getByText('Weitere Projekte konnten nicht geladen werden')).not.toBeNull(),
    )
    expect(screen.getByText('Bitte versuche es erneut.')).not.toBeNull()
    // The already-rendered initial six stay in the document while the error is shown.
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(getMemberProjectsMock).toHaveBeenCalledTimes(1)

    const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' })
    fireEvent.click(retryButton)

    await waitFor(() => expect(screen.getByText('12 von 50 Projekten sichtbar')).not.toBeNull())
    expect(getMemberProjectsMock).toHaveBeenCalledTimes(2)
    // Retry re-issues the request for the SAME offset that failed (not a duplicate, not skipping ahead).
    expect(getMemberProjectsMock).toHaveBeenNthCalledWith(1, 'subaru', 6, 6, expect.any(AbortSignal))
    expect(getMemberProjectsMock).toHaveBeenNthCalledWith(2, 'subaru', 6, 6, expect.any(AbortSignal))
    expect(screen.queryByText('Weitere Projekte konnten nicht geladen werden')).toBeNull()
  })

  it('keeps load-more dormant and the geometry shell visible until the section is near the viewport', () => {
    let observerCallback: IntersectionObserverCallback | undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback
      }

      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = '600px 0px'
      thresholds = [0]
    })

    const rendered = render(
      <MemberCurrentProjectsSection
        memberSlug="subaru"
        projects={[makeProject(1)]}
        totalCount={2}
      />,
    )

    const button = screen.getByRole('button', { name: 'Weitere Projekte laden' })
    const shell = rendered.container.querySelector(':scope > section > [aria-hidden="true"]')
    expect(observe).toHaveBeenCalledTimes(1)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(shell?.getAttribute('data-visible')).toBe('true')
    expect(getMemberProjectsMock).not.toHaveBeenCalled()

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(button.hasAttribute('disabled')).toBe(false)
    expect(shell?.getAttribute('data-visible')).toBe('false')
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})

it('Phase 120 RED: reserves project geometry while SSR cards remain readable', () => {
    const rendered = render(
      <MemberCurrentProjectsSection
        memberSlug="subaru"
        projects={[makeProject(1), makeProject(2)]}
        totalCount={2}
      />,
    )

    const list = screen.getByRole('list', { name: 'Fansub-Projekte' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Projekt 1 öffnen' })).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Projekt 2 öffnen' })).not.toBeNull()
    for (const image of screen.getAllByRole('img')) {
      expect(image.getAttribute('sizes')).toBe('(max-width: 720px) 68px, 90px')
      expect(image.getAttribute('loading')).toBe('lazy')
    }

    const shell = rendered.container.querySelector(':scope > section > [aria-hidden="true"]')
    expect(shell).not.toBeNull()
    expect(shell?.textContent).not.toContain('Projekt 1')
    expect(projectStyles).toMatch(/\.cover\s*\{[^}]*width:\s*90px;[^}]*aspect-ratio:\s*2 \/ 3;/s)
    expect(projectStyles).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.cover\s*\{[^}]*width:\s*68px;/)
    expect(projectStyles).toMatch(/opacity:\s*[01](?:\.\d+)?;/)
    expect(projectStyles).toMatch(/visibility:\s*(?:visible|hidden);/)
    expect(projectStyles).not.toMatch(/transition:[^;]*(?:width|height|min-height|padding|margin|transform)/)

    rendered.rerender(
      <MemberCurrentProjectsSection memberSlug="subaru" projects={[]} totalCount={0} />,
    )
    expect(screen.getByText('Keine aktuellen Projekte sichtbar.')).not.toBeNull()
    expect(rendered.container.querySelector(':scope > section > [aria-hidden="true"]')).toBeNull()
})

describe('Quick 260812-rps widescreen project alignment', () => {
  it('lets a single project consume the shared section width', () => {
    const wideRule = projectStyles.match(/\.projectList\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(wideRule).toContain('grid-template-columns: repeat(auto-fit, minmax(min(100%, 32rem), 1fr));')
    expect(wideRule).not.toContain('repeat(2, minmax(0, 1fr))')
  })
})
