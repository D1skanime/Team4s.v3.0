// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PublicGroupedEpisode } from '@/types/episodeVersion'

import { EpisodeGlassCard } from './EpisodeGlassCard'

function buildEpisode(overrides: Partial<PublicGroupedEpisode> = {}): PublicGroupedEpisode {
  return {
    episode_id: 1,
    episode_number: 1,
    episode_title: 'Der erste Kirschblütentag',
    default_version_id: 1,
    version_count: 2,
    versions: [],
    filler_type: 'canon',
    episode_type: 'episode',
    filler_type_label: 'Canon',
    episode_type_label: 'Episode',
    ...overrides,
  }
}

/*
 * Befund B (Runde 3): EpisodeGlassCard.module.css darf ab sofort kein eigenes
 * display:flex/flex-direction/display:grid mehr deklarieren -- die Kopfzeilen- und die
 * Versionslisten-Anordnung kommen jetzt ueber Cluster/Stack. .versionLists vormals asymmetrische
 * Polsterung lebt seit Plan 192-26 in Cards "dividedSection"-Rezept, der vormalige border-top in
 * einem eigenstaendigen Divider-Element -- in der CSS-Datei bleiben nur noch drei eng begruendete
 * Groessenkorrekturen (keine der verbotenen Kategorien, siehe deren eigener Kommentar dort).
 */
describe('EpisodeGlassCard.module.css -- Befund B Baustein-Reinheit', () => {
  it('deklariert kein eigenes display:flex/flex-direction/display:grid mehr', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    // Kommentare duerfen diese Begriffe als Begruendung erwaehnen (z. B. "Cluster uebernimmt
    // display:flex selbst") -- geprueft wird deshalb nur der tatsaechliche CSS-Regelwerk-Text,
    // nicht der volle Dateitext inklusive /* ... */-Kommentare.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(codeOnly).not.toMatch(/display:\s*flex/)
    expect(codeOnly).not.toMatch(/flex-direction/)
    expect(codeOnly).not.toMatch(/display:\s*grid/)
  })

  it('.versionList traegt nur noch die Card variant="flat"-Groessenkorrektur (kein eigenes padding/border-top mehr)', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    const versionListRule = source.match(/\.versionList\s*\{([^}]+)\}/)?.[1]
    expect(versionListRule, '.versionList must exist').toBeTruthy()
    // Der Innenabstand kommt jetzt aus Card padding="dividedSection", die Trennlinie aus einem
    // eigenstaendigen Divider-Element -- hier bleiben nur die drei Korrekturen, die Cards
    // variant="flat"-Rahmen/-Rundung/-Flaeche auf das vorherige, randlose Erscheinungsbild
    // zuruecksetzen.
    expect(versionListRule).toMatch(/border-width:\s*0/)
    expect(versionListRule).toMatch(/border-radius:\s*0/)
    expect(versionListRule).toMatch(/background:\s*transparent/)
    expect(versionListRule).not.toMatch(/padding:/)
    expect(versionListRule).not.toMatch(/border-top:/)
  })
})

describe('EpisodeGlassCard -- Kopfzeile/Versionsliste ueber Cluster/Stack statt lokalem Layout-CSS', () => {
  it('rendert Titel-Block und Versionszaehler weiterhin nebeneinander in der Kopfzeile', () => {
    render(
      <EpisodeGlassCard
        episode={buildEpisode()}
        episodeTitle="Der erste Kirschblütentag"
        expanded={false}
        onToggle={() => {}}
        panelId="panel-1"
      >
        <span>Platzhalter</span>
      </EpisodeGlassCard>,
    )

    expect(screen.getByText('Der erste Kirschblütentag')).toBeTruthy()
    expect(screen.getByText('2 Versionen')).toBeTruthy()
  })

  it('rendert die durchgereichten Release-Zeilen innerhalb eines Stack-Elternknotens, wenn aufgeklappt', () => {
    const { container } = render(
      <EpisodeGlassCard
        episode={buildEpisode()}
        episodeTitle="Der erste Kirschblütentag"
        expanded
        onToggle={() => {}}
        panelId="panel-2"
      >
        <span data-testid="release-row">Zeile</span>
      </EpisodeGlassCard>,
    )

    const panel = container.querySelector('#panel-2')
    expect(panel).not.toBeNull()
    const releaseRow = screen.getByTestId('release-row')
    // Stack rendert als eigenes Element zwischen der Card (traegt jetzt panelId) und der
    // durchgereichten Zeile.
    expect(releaseRow.parentElement?.parentElement).toBe(panel)

    // Die vormalige border-top-Trennlinie ist jetzt ein echtes, eigenstaendiges Divider-Element
    // direkt VOR der Card, die panelId traegt.
    const divider = container.querySelector('hr[aria-hidden="true"]')
    expect(divider).not.toBeNull()
    expect(divider?.nextElementSibling).toBe(panel)
  })

  it('rendert weder Versionsliste noch Trennlinie, wenn zugeklappt', () => {
    const { container } = render(
      <EpisodeGlassCard
        episode={buildEpisode()}
        episodeTitle="Der erste Kirschblütentag"
        expanded={false}
        onToggle={() => {}}
        panelId="panel-3"
      >
        <span data-testid="release-row">Zeile</span>
      </EpisodeGlassCard>,
    )

    expect(container.querySelector('#panel-3')).toBeNull()
    expect(container.querySelector('hr[aria-hidden="true"]')).toBeNull()
  })
})
