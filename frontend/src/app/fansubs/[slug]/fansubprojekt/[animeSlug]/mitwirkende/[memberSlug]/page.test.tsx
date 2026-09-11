import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: [], error: null }),
}))

const mocks = vi.hoisted(() => ({
  resolveProject: vi.fn(),
  getProjectMemberSummary: vi.fn(),
  getGroupDetail: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  resolveFansubProject: mocks.resolveProject,
  getProjectMemberSummary: mocks.getProjectMemberSummary,
  getGroupDetail: mocks.getGroupDetail,
}))

import { ApiError } from '@/lib/api'
import { ProjectMemberPage } from '@/components/fansubs/projectMember/ProjectMemberPage'
import type { ProjectMemberSummary } from '@/types/projectMember'

import ProjectMemberRoute from './page'

const summary = (overrides: Partial<ProjectMemberSummary> = {}): ProjectMemberSummary => ({
  member_id: 1,
  member_slug: 'csubs-leader',
  member_display_name: 'CSubs Leader',
  member_avatar_url: null,
  is_verified: true,
  role_labels: ['Übersetzung', 'Timing'],
  counts: { roles: 2, notes: 5, media: 8, releases: 3 },
  ...overrides,
})

const render = (over: Partial<ProjectMemberSummary> = {}) =>
  renderToStaticMarkup(
    <ProjectMemberPage
      summary={summary(over)}
      memberSlug="csubs-leader"
      groupName="C-Subs"
      groupSlug="c-subs"
      animeTitle="Viper's Creed"
      animeID={10}
      groupID={20}
      projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
    />,
  )

describe('ProjectMemberPage', () => {
  it('renders breadcrumb, hero, summary and sticky nav for a valid combination', () => {
    const html = render()
    // Breadcrumb-Links
    expect(html).toContain('href="/fansubs/c-subs"')
    expect(html).toContain('href="/fansubs/c-subs/fansubprojekt/vipers-creed"')
    // Hero
    expect(html).toContain('CSubs Leader')
    expect(html).toContain('Mitwirkung an Viper&#x27;s Creed · C-Subs')
    expect(html).toContain('Übersetzung')
    // Hero-Absprünge (D-16 + allgemeines Profil)
    expect(html).toContain('href="/members/csubs-leader"')
    expect(html).toContain('Vollständiges Memberprofil')
    expect(html).toContain('Zurück zum Projekt')
    // Summary-Werte + Sticky-Nav + Sektionsanker
    expect(html).toContain('Textbeiträge')
    expect(html).toContain('Schnellnavigation')
    expect(html).toContain('id="texte"')
    expect(html).toContain('id="bilder"')
    expect(html).toContain('id="releases"')
  })

  it('shows an empty state (no sections, no sticky nav) when there are no public details', () => {
    const html = render({ counts: { roles: 2, notes: 0, media: 0, releases: 0 } })
    expect(html).toContain('keine öffentlichen Detailbeiträge')
    expect(html).not.toContain('Schnellnavigation')
    expect(html).not.toContain('id="texte"')
    // Hero + Rollen bleiben sichtbar
    expect(html).toContain('CSubs Leader')
    expect(html).toContain('Übersetzung')
  })
})

describe('ProjectMemberRoute resolver wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const routeParams = (overrides: Partial<{ slug: string; animeSlug: string; memberSlug: string }> = {}) =>
    Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed', memberSlug: 'csubs-leader', ...overrides })

  it('returns notFound on a 404 from resolveFansubProject and never calls getProjectMemberSummary/getGroupDetail', async () => {
    mocks.resolveProject.mockRejectedValueOnce(new ApiError(404, 'not found'))

    await expect(ProjectMemberRoute({ params: routeParams() })).rejects.toThrow('NOT_FOUND')

    expect(mocks.getProjectMemberSummary).not.toHaveBeenCalled()
    expect(mocks.getGroupDetail).not.toHaveBeenCalled()
  })

  it('resolves via resolveFansubProject, sources groupName from getGroupDetail and animeTitle from the resolver projects list', async () => {
    mocks.resolveProject.mockResolvedValueOnce({
      data: {
        group_id: 4,
        anime_id: 9,
        anime_slug: 'vipers-creed',
        projects: [{ id: 9, title: "Viper's Creed", anime_slug: 'vipers-creed' }],
      },
    })
    mocks.getGroupDetail.mockResolvedValueOnce({ data: { fansub: { name: 'C-Subs' } } })
    const summaryFixture = summary()
    mocks.getProjectMemberSummary.mockResolvedValueOnce(summaryFixture)

    const result = (await ProjectMemberRoute({ params: routeParams() })) as {
      props: { groupName: string; animeTitle: string; animeID: number; groupID: number; summary: ProjectMemberSummary }
    }

    expect(mocks.getProjectMemberSummary).toHaveBeenCalledWith(9, 4, 'csubs-leader')
    expect(mocks.getGroupDetail).toHaveBeenCalledWith(9, 4)
    expect(result.props.groupName).toBe('C-Subs')
    expect(result.props.animeTitle).toBe("Viper's Creed")
    expect(result.props.animeID).toBe(9)
    expect(result.props.groupID).toBe(4)
    expect(result.props.summary).toBe(summaryFixture)
  })

  it('returns notFound when the resolver projects list has no entry matching the current anime_slug, without calling getGroupDetail', async () => {
    mocks.resolveProject.mockResolvedValueOnce({
      data: { group_id: 4, anime_id: 9, anime_slug: 'vipers-creed', projects: [] },
    })

    await expect(ProjectMemberRoute({ params: routeParams() })).rejects.toThrow('NOT_FOUND')

    expect(mocks.getGroupDetail).not.toHaveBeenCalled()
  })

  it('never references getPublicFansubProfileBySlug (absence check)', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx'), 'utf8')
    expect(source).not.toContain('getPublicFansubProfileBySlug')
  })
})
