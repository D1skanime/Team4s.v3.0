// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BacklinksSection } from './BacklinksSection'

describe('BacklinksSection', () => {
  it('rendert nur die zwei bestehenden Links ohne discoverableGroups', () => {
    render(<BacklinksSection fansubSlug="c-subs" animeID={4} animeTitle="11eyes" />)

    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Zur Gruppenseite/ }).getAttribute('href')).toBe('/fansubs/c-subs')
    expect(screen.getByRole('link', { name: /Zur Anime-Seite/ }).getAttribute('href')).toBe('/anime/4')
  })

  it('rendert nur die zwei bestehenden Links bei leerem discoverableGroups-Array', () => {
    render(<BacklinksSection fansubSlug="c-subs" animeID={4} animeTitle="11eyes" discoverableGroups={[]} />)

    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByText('11eyes wurde auch gesubbt von')).toBeNull()
  })

  it('zeigt die Beschriftung "<Animetitel> wurde auch gesubbt von" nur wenn discoverableGroups nicht leer ist', () => {
    render(
      <BacklinksSection
        fansubSlug="c-subs"
        animeID={4}
        animeTitle="11eyes"
        discoverableGroups={[{ id: 9, slug: 'other-subs', name: 'Other Subs', logo_url: null }]}
      />,
    )

    expect(screen.getByText('11eyes wurde auch gesubbt von')).toBeTruthy()
  })

  it('verwendet den echten Animetitel in der Beschriftung', () => {
    render(
      <BacklinksSection
        fansubSlug="c-subs"
        animeID={4}
        animeTitle="Buddy Complex"
        discoverableGroups={[{ id: 9, slug: 'other-subs', name: 'Other Subs', logo_url: null }]}
      />,
    )

    expect(screen.getByText('Buddy Complex wurde auch gesubbt von')).toBeTruthy()
  })

  // Live-UAT-Nachbesserung Phase 189: die Links zeigten auf die technische Route
  // (/anime/<id>/group/<id>), obwohl die kanonische oeffentliche Projekt-URL
  // verfuegbar war -- jetzt ueber buildFansubProjectPath mit echten Slugs.
  it('rendert zusaetzliche Links pro discoverableGroups-Eintrag zur kanonischen oeffentlichen Projektseite', () => {
    render(
      <BacklinksSection
        fansubSlug="c-subs"
        animeID={4}
        animeTitle="11eyes"
        animeSlug="11eyes"
        discoverableGroups={[
          { id: 9, slug: 'other-subs', name: 'Other Subs', logo_url: null },
          { id: 10, slug: 'third-subs', name: 'Third Subs', logo_url: null },
        ]}
      />,
    )

    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: /Other Subs/ }).getAttribute('href')).toBe(
      '/fansubs/other-subs/fansubprojekt/11eyes',
    )
    expect(screen.getByRole('link', { name: /Third Subs/ }).getAttribute('href')).toBe(
      '/fansubs/third-subs/fansubprojekt/11eyes',
    )
  })

  it('faellt pro discoverableGroups-Eintrag auf die technische Route zurueck, wenn der Anime-Slug fehlt', () => {
    render(
      <BacklinksSection
        fansubSlug="c-subs"
        animeID={4}
        animeTitle="11eyes"
        animeSlug={null}
        discoverableGroups={[{ id: 9, slug: 'other-subs', name: 'Other Subs', logo_url: null }]}
      />,
    )

    expect(screen.getByRole('link', { name: /Other Subs/ }).getAttribute('href')).toBe('/anime/4/group/9')
  })
})
