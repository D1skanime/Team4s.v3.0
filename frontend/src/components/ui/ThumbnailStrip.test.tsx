// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ThumbnailStrip } from './ThumbnailStrip'

const items = [
  { key: 1, thumbnailUrl: '/covers/placeholder.jpg' },
  { key: 2, thumbnailUrl: '/covers/placeholder.jpg' },
  { key: 3, thumbnailUrl: '/covers/placeholder.jpg' },
]

describe('ThumbnailStrip', () => {
  it('rendert jede Vorschau als echten, über IconButtons media-Variante klickbaren Button statt eines eigenen Elements', () => {
    render(<ThumbnailStrip items={items} activeIndex={0} onSelect={() => undefined} regionLabel="Bildvorschau" />)

    const buttons = items.map((_, index) => screen.getByRole('button', { name: `Bild ${index + 1} von ${items.length} anzeigen` }))
    expect(buttons).toHaveLength(3)
    buttons.forEach((button) => expect(button.tagName).toBe('BUTTON'))
  })

  it('markiert nur die aktive Vorschau über aria-current, nicht über eine externe CSS-Klasse', () => {
    render(<ThumbnailStrip items={items} activeIndex={1} onSelect={() => undefined} regionLabel="Bildvorschau" />)

    expect(screen.getByRole('button', { name: 'Bild 1 von 3 anzeigen' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('button', { name: 'Bild 2 von 3 anzeigen' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bild 3 von 3 anzeigen' }).getAttribute('aria-current')).toBeNull()
  })

  it('ruft onSelect mit dem angeklickten Index auf', () => {
    const onSelect = vi.fn()
    render(<ThumbnailStrip items={items} activeIndex={0} onSelect={onSelect} regionLabel="Bildvorschau" />)

    fireEvent.click(screen.getByRole('button', { name: 'Bild 3 von 3 anzeigen' }))

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('rendert nichts bei weniger als zwei Einträgen', () => {
    const { container } = render(<ThumbnailStrip items={items.slice(0, 1)} activeIndex={0} onSelect={() => undefined} regionLabel="Bildvorschau" />)
    expect(container.firstChild).toBeNull()
  })
})
