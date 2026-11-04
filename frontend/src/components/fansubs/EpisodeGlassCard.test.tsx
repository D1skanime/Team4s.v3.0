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
 * Versionslisten-Anordnung kommen jetzt ueber Cluster/Stack. Nur die asymmetrische Polsterung
 * von .versionList bleibt als dokumentierte Einzelfall-Ausnahme bestehen (siehe deren eigener
 * Kommentar in EpisodeGlassCard.module.css).
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

  it('behaelt .versionLists asymmetrische Polsterung als einzige dokumentierte Ausnahme', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    const versionListRule = source.match(/\.versionList\s*\{([^}]+)\}/)?.[1]
    expect(versionListRule, '.versionList must exist').toBeTruthy()
    expect(versionListRule).toMatch(/padding:\s*var\(--space-3\)\s+var\(--space-4\)\s+var\(--space-4\)/)
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
    // Stack rendert als eigenes Element zwischen dem Panel-div und der durchgereichten Zeile.
    expect(releaseRow.parentElement?.parentElement).toBe(panel)
  })
})
