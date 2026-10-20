// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BacklinksSection } from './BacklinksSection'

describe('BacklinksSection', () => {
  it('rendert nur die zwei bestehenden Links ohne discoverableGroups', () => {
    render(<BacklinksSection fansubSlug="c-subs" animeID={4} />)

    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Zur Gruppenseite/ }).getAttribute('href')).toBe('/fansubs/c-subs')
    expect(screen.getByRole('link', { name: /Zur Anime-Seite/ }).getAttribute('href')).toBe('/anime/4')
  })

  it('rendert nur die zwei bestehenden Links bei leerem discoverableGroups-Array', () => {
    render(<BacklinksSection fansubSlug="c-subs" animeID={4} discoverableGroups={[]} />)

    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('rendert zusaetzliche Links pro discoverableGroups-Eintrag zur jeweiligen Projektseite', () => {
    render(
      <BacklinksSection
        fansubSlug="c-subs"
        animeID={4}
        discoverableGroups={[
          { id: 9, slug: 'other-subs', name: 'Other Subs', logo_url: null },
          { id: 10, slug: 'third-subs', name: 'Third Subs', logo_url: null },
        ]}
      />,
    )

    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: /Other Subs/ }).getAttribute('href')).toBe('/anime/4/group/9')
    expect(screen.getByRole('link', { name: /Third Subs/ }).getAttribute('href')).toBe('/anime/4/group/10')
  })
})
