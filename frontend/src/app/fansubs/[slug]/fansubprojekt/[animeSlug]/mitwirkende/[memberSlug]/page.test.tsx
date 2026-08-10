import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProjectMemberPage } from '@/components/fansubs/projectMember/ProjectMemberPage'
import type { ProjectMemberSummary } from '@/types/projectMember'

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
