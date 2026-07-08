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

  it('rendert deutsche Labels, optionalen Namen und sichere externe Links', () => {
    const links: FansubGroupLink[] = [
      link({ id: 1, link_type: 'website', name: 'Offizielle Seite', url: 'https://c-subs.example/' }),
      link({ id: 2, link_type: 'discord', name: null, url: 'https://discord.gg/c-subs' }),
    ]

    render(<FansubCommunityLinksSection links={links} />)

    expect(screen.getByText('Community & Links')).toBeTruthy()
    expect(screen.getByText('Webseite')).toBeTruthy()
    expect(screen.getByText('Offizielle Seite')).toBeTruthy()
    expect(screen.getByText('Discord')).toBeTruthy()

    const anchors = screen.getAllByRole('link')
    expect(anchors).toHaveLength(2)
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel') || '').toContain('noreferrer')
    }
  })
})
