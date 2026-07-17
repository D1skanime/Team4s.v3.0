// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectStats, coopPartnerLimitForMatches } from './ProjectStats'

const groups = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  slug: `gruppe-${index + 1}`,
  name: `Gruppe ${index + 1}`,
  logo_url: null,
}))

describe('ProjectStats', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(max-width: 600px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  it('staffelt sichtbare Coop-Avatare nach verfügbarem Platz', () => {
    expect(coopPartnerLimitForMatches(true, true)).toBe(3)
    expect(coopPartnerLimitForMatches(false, true)).toBe(4)
    expect(coopPartnerLimitForMatches(false, false)).toBe(6)
  })

  it('öffnet auf Mobile die Partnerliste und zeigt weitere Partner progressiv', () => {
    render(<ProjectStats contributorCount={3} releaseCount={12} coopGroups={groups} />)

    expect(screen.getByText('Mitwirkende')).toBeTruthy()
    expect(screen.getByText('Releases')).toBeTruthy()
    expect(screen.queryByText('Coop mit')).toBeNull()

    const overflowButton = screen.getByRole('button', { name: '17 weitere Coop-Partner anzeigen' })
    expect(overflowButton.textContent).toBe('+17')
    fireEvent.click(overflowButton)

    expect(screen.getByText('20 Coop-Partner')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Gruppe 7' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Gruppe 8' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '+ 13 weitere anzeigen' }))
    expect(screen.getByRole('link', { name: 'Gruppe 20' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).toBeTruthy()
  })
})
