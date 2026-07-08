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

  it('bündelt leere optionale Bereiche in einem Sammelhinweis', () => {
    expect(pageSource).toContain('buildEmptyAreaLabels')
    expect(pageSource).toContain('Weitere Bereiche sind noch nicht öffentlich befüllt')
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
    const summaryIndex = pageSource.indexOf('styles.emptySummary')

    expect(heroIndex).toBeGreaterThan(-1)
    expect(storyIndex).toBeGreaterThan(heroIndex)
    expect(projectsIndex).toBeGreaterThan(storyIndex)
    expect(teamIndex).toBeGreaterThan(projectsIndex)
    expect(historyIndex).toBeGreaterThan(teamIndex)
    expect(mediaIndex).toBeGreaterThan(historyIndex)
    expect(summaryIndex).toBeGreaterThan(mediaIndex)
  })

  it('bindet die Community-Links- und Medien-Sektion aus 99-16 ein (AO5-03)', () => {
    expect(pageSource).toMatch(/<FansubCommunityLinksSection\s+links=\{profile\.community_links\}/)
    expect(pageSource).toMatch(/<FansubMediaSection\s+media=\{profile\.media\}/)
  })

  it('rendert genau einen Sammelhinweis-Block und keine eigenständigen Leer-Sektionen', () => {
    const summaryOccurrences = pageSource.split('styles.emptySummary').length - 1
    expect(summaryOccurrences).toBe(1)

    expect(pageSource).not.toMatch(/<FansubContributorsSection/)
    expect(pageSource).not.toMatch(/<GroupLeaderTimeline/)
  })
})
