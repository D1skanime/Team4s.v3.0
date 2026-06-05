import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { GroupTeamMember, GroupExternalContributor } from '@/types/groupContributors'
import { TeamSection } from './TeamSection'

const makeTeamMember = (overrides: Partial<GroupTeamMember> = {}): GroupTeamMember => ({
  member_id: 1,
  member_display_name: 'Testnutzer',
  member_slug: null,
  role_labels: [],
  ...overrides,
})

const makeExternal = (overrides: Partial<GroupExternalContributor> = {}): GroupExternalContributor => ({
  member_display_name: 'Externer',
  member_slug: null,
  role_labels: [],
  is_verified: false,
  ...overrides,
})

describe('TeamSection', () => {
  it('Test 1: renders two distinct blocks — Team-Beteiligte and Externe Mitwirkende headings', () => {
    const markup = renderToStaticMarkup(
      <TeamSection teamMembers={[makeTeamMember()]} externalContributors={[makeExternal()]} />,
    )
    expect(markup).toContain('Team-Beteiligte')
    expect(markup).toContain('Externe Mitwirkende')
    // Both headings must appear as separate elements
    const teamIdx = markup.indexOf('Team-Beteiligte')
    const externalIdx = markup.indexOf('Externe Mitwirkende')
    expect(teamIdx).toBeGreaterThanOrEqual(0)
    expect(externalIdx).toBeGreaterThanOrEqual(0)
    expect(teamIdx).not.toBe(externalIdx)
  })

  it('Test 2: member with slug renders as <a href="/members/test-slug">; member without slug renders as <span>', () => {
    const markup = renderToStaticMarkup(
      <TeamSection
        teamMembers={[
          makeTeamMember({ member_slug: 'test-slug', member_display_name: 'Geclaimt' }),
          makeTeamMember({ member_slug: null, member_display_name: 'Ungeclaimt', member_id: 2 }),
        ]}
        externalContributors={[]}
      />,
    )
    expect(markup).toContain('href="/members/test-slug"')
    expect(markup).toContain('Geclaimt')
    // Ungeclaimt member should not have a link
    expect(markup).not.toContain('href="/members/null"')
    expect(markup).toContain('Ungeclaimt')
  })

  it('Test 3: empty teamMembers shows empty-state text (case-insensitive "noch keine team-mitglieder"); section still rendered', () => {
    const markup = renderToStaticMarkup(
      <TeamSection teamMembers={[]} externalContributors={[]} />,
    )
    expect(markup.toLowerCase()).toContain('noch keine team-mitglieder')
    // Section heading still present
    expect(markup).toContain('Beteiligte am Projekt')
  })

  it('Test 4: external contributor with role_labels shows role in external block', () => {
    const markup = renderToStaticMarkup(
      <TeamSection
        teamMembers={[]}
        externalContributors={[
          makeExternal({ member_display_name: 'Timer-Person', role_labels: ['Timer'] }),
        ]}
      />,
    )
    expect(markup).toContain('Timer')
    expect(markup).toContain('Externe Mitwirkende')
  })
})
