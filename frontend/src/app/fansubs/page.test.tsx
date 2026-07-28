// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FansubsPage from './page'

const { getFansubListMock } = vi.hoisted(() => ({
  getFansubListMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    getFansubList: getFansubListMock,
    resolveApiUrl: (v: string) => v,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

async function renderFansubsPage() {
  const result = await FansubsPage()
  return render(result)
}

function makeGroup(overrides: Partial<{
  id: number
  slug: string
  name: string
  logo_url: string | null
  projects_count: number
  release_versions_count: number
  members_count: number
}> = {}) {
  return {
    id: 1,
    slug: 'group-slug',
    name: 'Group Name',
    logo_url: null,
    projects_count: 0,
    release_versions_count: 0,
    members_count: 0,
    ...overrides,
  }
}

describe('FansubsPage (D-02/D-05)', () => {
  it('renders exactly the 4 column headers with exact German text', async () => {
    getFansubListMock.mockResolvedValue({ data: [makeGroup()], meta: { total: 1 } })

    await renderFansubsPage()

    expect(screen.getByRole('columnheader', { name: 'Fansub-Gruppe' })).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Anime-Projekte' })).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Release-Versionen' })).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Mitglieder' })).not.toBeNull()
  })

  it('renders rows sorted by release_versions_count desc, name asc tie-break', async () => {
    getFansubListMock.mockResolvedValue({
      data: [
        makeGroup({ id: 1, slug: 'bravo', name: 'Bravo', release_versions_count: 5 }),
        makeGroup({ id: 2, slug: 'alpha', name: 'Alpha', release_versions_count: 10 }),
        makeGroup({ id: 3, slug: 'charlie', name: 'Charlie', release_versions_count: 5 }),
      ],
      meta: { total: 3 },
    })

    await renderFansubsPage()

    const rows = screen.getAllByRole('row')
    // rows[0] is the header row
    const dataRowNames = rows.slice(1).map((row) => row.textContent)
    expect(dataRowNames[0]).toContain('Alpha')
    expect(dataRowNames[1]).toContain('Bravo')
    expect(dataRowNames[2]).toContain('Charlie')
  })

  it("renders each group's name as a Link with href pointing to its detail page", async () => {
    getFansubListMock.mockResolvedValue({
      data: [makeGroup({ slug: 'my-group', name: 'My Group' })],
      meta: { total: 1 },
    })

    await renderFansubsPage()

    const link = screen.getByRole('link', { name: 'My Group' })
    expect(link.getAttribute('href')).toBe('/fansubs/my-group')
  })

  it('renders an img for a group with logo_url and an initials fallback without one', async () => {
    getFansubListMock.mockResolvedValue({
      data: [
        makeGroup({ id: 1, slug: 'with-logo', name: 'With Logo', logo_url: '/media/logo.png' }),
        makeGroup({ id: 2, slug: 'no-logo', name: 'No Logo', logo_url: null }),
      ],
      meta: { total: 2 },
    })

    await renderFansubsPage()

    const rows = screen.getAllByRole('row')
    const logoRow = rows.find((row) => row.textContent?.includes('With Logo'))
    const initialsRow = rows.find((row) => row.textContent?.includes('No Logo'))

    expect(logoRow?.querySelector('img')).not.toBeNull()
    expect(initialsRow?.querySelector('img')).toBeNull()
    expect(initialsRow?.textContent).toContain('NL')
  })

  it('renders the empty state when getFansubList resolves with no groups', async () => {
    getFansubListMock.mockResolvedValue({ data: [], meta: { total: 0 } })

    await renderFansubsPage()

    expect(screen.getByText('Noch keine Fansub-Gruppen')).not.toBeNull()
  })

  it('renders the error state when getFansubList rejects', async () => {
    getFansubListMock.mockRejectedValue(new Error('boom'))

    await renderFansubsPage()

    expect(screen.getByText('Fehler beim Laden')).not.toBeNull()
  })

  it('calls getFansubList exactly once per render with { per_page: 500 } (no per-row fan-out)', async () => {
    getFansubListMock.mockResolvedValue({ data: [makeGroup()], meta: { total: 1 } })

    await renderFansubsPage()

    expect(getFansubListMock).toHaveBeenCalledTimes(1)
    expect(getFansubListMock).toHaveBeenCalledWith({ per_page: 500 })
  })
})
