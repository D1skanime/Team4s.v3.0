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
 * EpisodeGlassCard.module.css darf kein eigenes display:flex/flex-direction/display:grid
 * deklarieren -- die Kopfzeilen- und die Versionslisten-Anordnung kommen über Cluster/Stack.
 * .versionLists asymmetrische Polsterung lebt in Cards "dividedSection"-Rezept, der border-top
 * in einem eigenständigen Divider-Element -- in der CSS-Datei bleiben nur noch drei eng
 * begründete Größenkorrekturen (keine der verbotenen Kategorien, siehe deren eigener
 * Kommentar dort).
 */
describe('EpisodeGlassCard.module.css -- Baustein-Reinheit', () => {
  it('deklariert kein eigenes display:flex/flex-direction/display:grid mehr', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    // Kommentare dürfen diese Begriffe als Begründung erwähnen (z. B. "Cluster übernimmt
    // display:flex selbst") -- geprüft wird deshalb nur der tatsächliche CSS-Regelwerk-Text,
    // nicht der volle Dateitext inklusive /* ... */-Kommentare.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(codeOnly).not.toMatch(/display:\s*flex/)
    expect(codeOnly).not.toMatch(/flex-direction/)
    expect(codeOnly).not.toMatch(/display:\s*grid/)
  })

  /*
   * Eine lokale .versionList-Klasse (border-width:0; border-radius:0; background:transparent)
   * existiert bewusst nicht -- der randlose Modus kommt aus Cards eigenem seamless-Prop statt
   * einer dritten, parallelen lokalen CSS-Override-Klasse.
   */
  it('EpisodeGlassCard.module.css deklariert keine eigene .versionList-Regel mehr', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css'), 'utf8')
    expect(source).not.toMatch(/\.versionList\s*\{/)
  })

  it('die verschachtelte Versionslisten-Card bekommt Cards seamless-Prop statt einer lokalen Rahmen-/Rundungs-Korrektur', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.tsx'), 'utf8')
    const cardCallSite = source.match(/<Card id=\{panelId\}[^>]*>/)?.[0]
    expect(cardCallSite, 'nested versionList Card call site must exist').toBeTruthy()
    expect(cardCallSite).toMatch(/\bseamless\b/)
  })
})

describe('EpisodeGlassCard -- Kopfzeile/Versionsliste über Cluster/Stack statt lokalem Layout-CSS', () => {
  it('rendert Titel-Block und Versionszähler weiterhin nebeneinander in der Kopfzeile', () => {
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

  it('rendert die verschachtelte Versionslisten-Card mit der cardSeamless-Modifikatorklasse, wenn aufgeklappt', () => {
    const { container } = render(
      <EpisodeGlassCard
        episode={buildEpisode()}
        episodeTitle="Der erste Kirschblütentag"
        expanded
        onToggle={() => {}}
        panelId="panel-seamless"
      >
        <span>Platzhalter</span>
      </EpisodeGlassCard>,
    )
    const panel = container.querySelector('#panel-seamless')
    expect(panel).not.toBeNull()
    expect(panel?.className).toMatch(/cardSeamless/)
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
    // Stack rendert als eigenes Element zwischen der Card (trägt jetzt panelId) und der
    // durchgereichten Zeile.
    expect(releaseRow.parentElement?.parentElement).toBe(panel)

    // Die vormalige border-top-Trennlinie ist jetzt ein echtes, eigenständiges Divider-Element
    // direkt VOR der Card, die panelId trägt.
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
