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
})
