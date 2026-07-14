import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProjectMemberRows } from './ProjectMemberRows'
import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

const teamMember = (overrides: Partial<GroupTeamMember> = {}): GroupTeamMember => ({
  member_id: 1,
  member_display_name: 'Geclaimt',
  member_slug: 'example-slug',
  role_labels: ['Übersetzung', 'Timing'],
  ...overrides,
})

const externalContributor = (
  overrides: Partial<GroupExternalContributor> = {},
): GroupExternalContributor => ({
  member_display_name: 'Externe Person',
  member_slug: null,
  role_labels: ['Typesetting'],
  is_verified: true,
  ...overrides,
})

describe('ProjectMemberRows', () => {
  it('uses project-scoped role_labels for team and external contributors', () => {
    const html = renderToStaticMarkup(
      <ProjectMemberRows
        teamMembers={[teamMember()]}
        externalContributors={[externalContributor()]}
      />,
    )

    expect(html).toContain('Übersetzung')
    expect(html).toContain('Timing')
    expect(html).toContain('Typesetting')
    expect(html).not.toContain('Aktive Mitglieder')
    expect(html).not.toContain('Team-Beteiligte')
  })

  it('links only existing member slugs to the normal member profile route', () => {
    const html = renderToStaticMarkup(
      <ProjectMemberRows
        teamMembers={[
          teamMember({ member_display_name: 'Verlinkt', member_slug: 'example-slug' }),
          teamMember({ member_id: 2, member_display_name: 'Nicht verlinkt', member_slug: null }),
        ]}
        externalContributors={[externalContributor({ member_slug: 'external-slug' })]}
      />,
    )

    expect(html).toContain('href="/members/example-slug"')
    expect(html).toContain('href="/members/external-slug"')
    expect(html).not.toContain('href="/members/null"')
    expect(html).not.toContain('fansubprojekt')
  })
})
