import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'
import { TeamSection } from './TeamSection'

const makeTeamMember = (overrides: Partial<GroupTeamMember> = {}): GroupTeamMember => ({
  member_id: 1,
  member_display_name: 'Testnutzer',
  member_slug: 'example-slug',
  role_labels: ['Übersetzung'],
  ...overrides,
})

const makeExternal = (overrides: Partial<GroupExternalContributor> = {}): GroupExternalContributor => ({
  member_display_name: 'Externer',
  member_slug: null,
  role_labels: ['Timing'],
  is_verified: false,
  ...overrides,
})

describe('TeamSection', () => {
  it('renders the locked Fansub project member title', () => {
    const html = renderToStaticMarkup(
      <TeamSection teamMembers={[makeTeamMember()]} externalContributors={[makeExternal()]} />,
    )

    expect(html).toContain('Mitwirkende am Fansub-Projekt')
    expect(html).not.toContain('Beteiligte am Projekt')
  })

  it('delegates to project member rows and keeps safe member links', () => {
    const html = renderToStaticMarkup(
      <TeamSection
        teamMembers={[makeTeamMember({ member_display_name: 'Geclaimt' })]}
        externalContributors={[makeExternal({ member_slug: 'external-slug' })]}
      />,
    )

    expect(html).toContain('Geclaimt')
    expect(html).toContain('Übersetzung')
    expect(html).toContain('Timing')
    expect(html).toContain('href="/members/example-slug"')
    expect(html).toContain('href="/members/external-slug"')
    expect(html).not.toContain('Team-Beteiligte')
    expect(html).not.toContain('Externe Mitwirkende')
  })

  it('keeps the section title with a scoped empty state when no project contributors exist', () => {
    const html = renderToStaticMarkup(<TeamSection teamMembers={[]} externalContributors={[]} />)

    expect(html).toContain('Mitwirkende am Fansub-Projekt')
    expect(html).toContain('Noch keine öffentlichen Projektrollen hinterlegt.')
    expect(html).not.toContain('Weitere Bereiche sind noch nicht')
  })
})
