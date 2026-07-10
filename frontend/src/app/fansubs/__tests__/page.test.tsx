import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(new URL('../[slug]/page.tsx', import.meta.url), 'utf8')

describe('fansub public page', () => {
  it('rendert die öffentliche Gruppenseite als Scroll-Seite ohne Tabs und Highlight-Kacheln', () => {
    expect(pageSource).not.toContain('FansubSectionNav')
    expect(pageSource).not.toContain('FansubHighlightsSection')
    expect(pageSource).toContain('FansubHeroSection group={group} stats={heroStats}')
  })

  it('verwendet die sichtbare Team-Liste als Quelle für die Mitglieder-Kennzahl', () => {
    expect(pageSource).toContain('countVisibleTeamMembers(domainProjection.members, domainProjection.historical)')
    expect(pageSource).not.toContain('group.members_count || contributions?.member_count')
  })

  it('zeigt keinen Leer-Bereichs-Sammelhinweis mehr', () => {
    expect(pageSource).not.toContain('buildEmptyAreaLabels')
    expect(pageSource).not.toContain('Weitere Bereiche sind noch nicht öffentlich befüllt')
    expect(pageSource).not.toContain('styles.emptySummary')
    expect(pageSource).not.toContain('FansubContributorsSection')
    expect(pageSource).not.toContain('GroupLeaderTimeline')
    expect(pageSource).not.toContain('FansubDeepDiveSection')
  })

  it('rendert die Sektionen in der Reihenfolge Hero -> Geschichte -> Projekte -> Team -> Erfolge -> Medien (AO5-03)', () => {
    const heroIndex = pageSource.indexOf('<FansubHeroSection')
    const storyIndex = pageSource.indexOf('<FansubStorySection')
    const projectsIndex = pageSource.indexOf('<FansubProjectsSection')
    const teamIndex = pageSource.indexOf('<FansubTeamSection')
    const historyIndex = pageSource.indexOf('<FansubHistorySection')
    const mediaIndex = pageSource.indexOf('<FansubMediaSection')

    expect(heroIndex).toBeGreaterThan(-1)
    expect(storyIndex).toBeGreaterThan(heroIndex)
    expect(projectsIndex).toBeGreaterThan(storyIndex)
    expect(teamIndex).toBeGreaterThan(projectsIndex)
    expect(historyIndex).toBeGreaterThan(teamIndex)
    expect(mediaIndex).toBeGreaterThan(historyIndex)
  })

  it('reicht Community-Links an den Hero und bindet die Medien-Sektion ein', () => {
    expect(pageSource).toMatch(/communityLinks=\{profile\.community_links\}/)
    expect(pageSource).not.toContain('FansubCommunityLinksSection')
    expect(pageSource).toMatch(/<FansubMediaSection\s+media=\{profile\.media\}/)
  })

  it('uebergibt das Stories-Array an FansubStorySection statt der einzelnen Story (AO6-03)', () => {
    expect(pageSource).toMatch(/stories=\{profile\.stories\}/)
  })
})
