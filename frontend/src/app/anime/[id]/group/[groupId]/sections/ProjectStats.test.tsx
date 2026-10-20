// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectStats } from './ProjectStats'

const groups = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  slug: `gruppe-${index + 1}`,
  name: `Gruppe ${index + 1}`,
  logo_url: null,
}))

describe('ProjectStats', () => {
  it('blendet die Coop-Partner-Kennzahl ohne Partner aus', () => {
    render(<ProjectStats contributorCount={3} releaseCount={12} coopGroups={[]} animeID={4} />)

    expect(screen.getByText('Mitwirkende')).toBeTruthy()
    expect(screen.getByText('Releases')).toBeTruthy()
    expect(screen.queryByText('Coop-Partner')).toBeNull()
  })

  it('schreibt einen einzelnen Coop-Partner aus und verlinkt zu dessen Projektseite', () => {
    render(
      <ProjectStats
        contributorCount={3}
        releaseCount={12}
        coopGroups={[{ id: 2, slug: 'honto', name: 'Honto', logo_url: '/logo.png' }]}
        animeID={4}
      />,
    )

    const partnerLink = screen.getByRole('link', { name: 'Honto' })
    expect(partnerLink.getAttribute('href')).toBe('/anime/4/group/2')
  })

  it('zeigt bei genau zwei Partnern "A · B" mit zwei eigenstaendigen Links', () => {
    render(
      <ProjectStats
        contributorCount={3}
        releaseCount={12}
        coopGroups={[
          { id: 2, slug: 'honto', name: 'Honto', logo_url: null },
          { id: 3, slug: 'csubs', name: 'C-Subs', logo_url: null },
        ]}
        animeID={4}
      />,
    )

    expect(screen.getByText('·')).toBeTruthy()
    const hontoLink = screen.getByRole('link', { name: 'Honto' })
    const csubsLink = screen.getByRole('link', { name: 'C-Subs' })
    expect(hontoLink.getAttribute('href')).toBe('/anime/4/group/2')
    expect(csubsLink.getAttribute('href')).toBe('/anime/4/group/3')
  })

  it('zeigt ab drei Partnern "A · B +N" und oeffnet die aufklappbare Liste mit Projektseiten-Links', () => {
    render(<ProjectStats contributorCount={3} releaseCount={12} coopGroups={groups} animeID={4} />)

    expect(screen.getByRole('link', { name: 'Gruppe 1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Gruppe 2' })).toBeTruthy()

    const overflowButton = screen.getByRole('button', { name: '+18' })
    fireEvent.click(overflowButton)

    expect(screen.getByText('20 Coop-Partner')).toBeTruthy()
    const detailLink = screen.getByRole('link', { name: 'Gruppe 7' })
    expect(detailLink.getAttribute('href')).toBe('/anime/4/group/7')
    expect(screen.queryByRole('link', { name: 'Gruppe 8' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '+ 13 weitere anzeigen' }))
    expect(screen.getByRole('link', { name: 'Gruppe 20' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).toBeTruthy()
  })
})
