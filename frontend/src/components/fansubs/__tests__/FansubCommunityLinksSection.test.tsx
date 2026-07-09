// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { FansubCommunityLinksSection } from '../FansubCommunityLinksSection'
import type { FansubGroupLink } from '@/types/fansub'

afterEach(() => {
  cleanup()
})

function link(overrides: Partial<FansubGroupLink> = {}): FansubGroupLink {
  return {
    id: 1,
    group_id: 1,
    link_type: 'website',
    name: null,
    url: 'https://example.org',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('FansubCommunityLinksSection', () => {
  it('rendert nichts bei leerer Links-Liste', () => {
    const { container } = render(<FansubCommunityLinksSection links={[]} />)

    expect(container.innerHTML).toBe('')
  })

  it('rendert je Link einen einheitlichen Chip (Name bevorzugt, sonst deutsches Label) und sichere externe Links', () => {
    const links: FansubGroupLink[] = [
      link({ id: 1, link_type: 'website', name: 'Offizielle Seite', url: 'https://c-subs.example/' }),
      link({ id: 2, link_type: 'discord', name: null, url: 'https://discord.gg/c-subs' }),
    ]

    render(<FansubCommunityLinksSection links={links} />)

    expect(screen.getByText('Community & Links')).toBeTruthy()
    // Name hat Vorrang vor dem Label, wenn beide vorhanden sind.
    expect(screen.getByText('Offizielle Seite')).toBeTruthy()
    expect(screen.queryByText('Webseite')).toBeNull()
    // Ohne Name greift das deutsche Label als Fallback.
    expect(screen.getByText('Discord')).toBeTruthy()

    const anchors = screen.getAllByRole('link')
    expect(anchors).toHaveLength(2)
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel') || '').toContain('noreferrer')
      // Genau ein klickbares Element pro Link-Eintrag (Chip selbst).
      expect(anchor.querySelectorAll('a, button')).toHaveLength(0)
    }
  })
})
