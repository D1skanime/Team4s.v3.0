// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FansubGroupContext, type FansubGroupContextActiveGroup } from './FansubGroupContext'

afterEach(() => {
  cleanup()
})

describe('FansubGroupContext', () => {
  it('rendert nichts, wenn activeGroup null ist', () => {
    const { container } = render(<FansubGroupContext activeGroup={null} animeSlug="11eyes" />)
    expect(container.firstChild).toBeNull()
  })

  it('rendert Ueberschrift ohne Link, Story-Text und Mehr-lesen-Link bei vorhandener story_preview', () => {
    const activeGroup: FansubGroupContextActiveGroup = {
      id: 26,
      slug: 'strawhat-subs',
      name: 'Strawhat Subs',
      story_preview: 'Eine kurze Geschichte über Übersetzungsarbeit.',
    }
    render(<FansubGroupContext activeGroup={activeGroup} animeSlug="11eyes-pink-phantasmagoria" />)

    const heading = screen.getByRole('heading', { name: 'Strawhat Subs' })
    expect(within(heading).queryByRole('link')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Strawhat Subs' })).toBeNull()

    expect(screen.getByText('Eine kurze Geschichte über Übersetzungsarbeit.')).not.toBeNull()

    const moreLink = screen.getByRole('link', { name: 'Mehr lesen →' })
    expect(moreLink.getAttribute('href')).toBe('/fansubs/strawhat-subs#geschichte')
  })

  it('rendert keinen Story-Absatz und keinen Mehr-lesen-Link, wenn story_preview fehlt/leer/nur Whitespace ist', () => {
    const casesWithoutStory: Array<string | null | undefined> = [undefined, null, '', '   ']
    for (const storyPreview of casesWithoutStory) {
      cleanup()
      const activeGroup: FansubGroupContextActiveGroup = {
        id: 1,
        slug: 'new-subs',
        name: 'New-Subs',
        story_preview: storyPreview,
      }
      render(<FansubGroupContext activeGroup={activeGroup} animeSlug="buddy-complex" />)
      expect(screen.getByRole('heading', { name: 'New-Subs' })).not.toBeNull()
      expect(screen.queryByRole('link', { name: 'Mehr lesen →' })).toBeNull()
    }
  })

  it('rendert immer den Zur-Fansub-Gruppe-Link mit href=/fansubs/<slug>', () => {
    const activeGroup: FansubGroupContextActiveGroup = { id: 1, slug: 'new-subs', name: 'New-Subs' }
    render(<FansubGroupContext activeGroup={activeGroup} animeSlug="buddy-complex" />)
    const link = screen.getByRole('link', { name: 'Zur Fansub-Gruppe' })
    expect(link.getAttribute('href')).toBe('/fansubs/new-subs')
  })

  it('rendert keinen Zum-Projekt-Link, wenn animeSlug fehlt/leer ist (kein Fallback auf technische Route)', () => {
    const activeGroup: FansubGroupContextActiveGroup = { id: 1, slug: 'new-subs', name: 'New-Subs' }
    render(<FansubGroupContext activeGroup={activeGroup} animeSlug="" />)
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()

    cleanup()
    render(<FansubGroupContext activeGroup={activeGroup} />)
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
  })

  it('rendert den Zum-Projekt-Link ueber buildPublicFansubProjectPath, wenn beide Slugs gesetzt sind', () => {
    const activeGroup: FansubGroupContextActiveGroup = { id: 1, slug: 'new-subs', name: 'New-Subs' }
    render(<FansubGroupContext activeGroup={activeGroup} animeSlug="buddy-complex" />)
    const link = screen.getByRole('link', { name: 'Zum Projekt' })
    expect(link.getAttribute('href')).toBe('/fansubs/new-subs/fansubprojekt/buddy-complex')
  })
})

/*
 * Runde 5, Befund-Review2-R2 (192-33): Kartenpolsterung/interner Rhythmus/Aktionsreihe kommen
 * jetzt aus Card padding="contextCard" (Plan 192-28), Stack gap="relatedContent" und
 * Cluster gap="secondaryActionRow" statt lokaler padding-/margin-/display:flex-Deklarationen.
 */
describe('FansubGroupContext -- Runde 5: Card-Zweckstufe, Stack-Rhythmus, Cluster-navRow', () => {
  it('traegt die Card-Zweckstufe padding="contextCard" statt eines lokalen Polsterungswerts', () => {
    const activeGroup: FansubGroupContextActiveGroup = { id: 1, slug: 'new-subs', name: 'New-Subs' }
    render(<FansubGroupContext activeGroup={activeGroup} animeSlug="buddy-complex" />)
    const card = screen.getByTestId('fansub-group-context')
    expect(card.style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-context-card)')
  })

  it('FansubGroupContext.module.css deklariert kein eigenes padding/margin/display:flex/gap mehr', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/fansubs/FansubGroupContext.module.css'), 'utf8')
    expect(css).not.toMatch(/\bpadding\s*:/)
    expect(css).not.toMatch(/\bmargin\s*:/)
    expect(css).not.toMatch(/display\s*:\s*flex/)
    expect(css).not.toMatch(/\bgap\s*:/)
    expect(css).not.toMatch(/\.navRow\s*\{/)
    expect(css).not.toMatch(/\.name\s*\{/)
    // .card existierte frueher nur wegen seiner padding-/margin-Deklarationen -- beide sind jetzt
    // durch Card-Props bzw. den gemeinsamen Rhythmus-Stack in FansubVersionBrowser.tsx ersetzt,
    // die leer gewordene Klasse ist deshalb ersatzlos entfernt (samt ihrer JSX-Referenz).
    expect(css).not.toMatch(/\.card\s*\{/)
  })
})
