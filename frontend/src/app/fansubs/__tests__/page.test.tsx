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
    expect(pageSource).not.toContain('FansubMediaSection')
    expect(pageSource).not.toContain('GroupLeaderTimeline')
    expect(pageSource).not.toContain('FansubDeepDiveSection')
  })

  it('rendert die Sektionen in der Reihenfolge Hero -> Projekte -> Team -> Geschichte -> Erfolge -> Sammelhinweis (AO4-06/07)', () => {
    const heroIndex = pageSource.indexOf('<FansubHeroSection')
    const projectsIndex = pageSource.indexOf('<FansubProjectsSection')
    const teamIndex = pageSource.indexOf('<FansubTeamSection')
    const storyIndex = pageSource.indexOf('<FansubStorySection')
    const historyIndex = pageSource.indexOf('<FansubHistorySection')
    const summaryIndex = pageSource.indexOf('styles.emptySummary')

    expect(heroIndex).toBeGreaterThan(-1)
    expect(projectsIndex).toBeGreaterThan(heroIndex)
    expect(teamIndex).toBeGreaterThan(projectsIndex)
    expect(storyIndex).toBeGreaterThan(teamIndex)
    expect(historyIndex).toBeGreaterThan(storyIndex)
    expect(summaryIndex).toBeGreaterThan(historyIndex)
  })

  it('rendert genau einen Sammelhinweis-Block und keine eigenständigen Leer-Sektionen', () => {
    const summaryOccurrences = pageSource.split('styles.emptySummary').length - 1
    expect(summaryOccurrences).toBe(1)

    expect(pageSource).not.toMatch(/<FansubContributorsSection/)
    expect(pageSource).not.toMatch(/<FansubMediaSection/)
    expect(pageSource).not.toMatch(/<GroupLeaderTimeline/)
  })
})
