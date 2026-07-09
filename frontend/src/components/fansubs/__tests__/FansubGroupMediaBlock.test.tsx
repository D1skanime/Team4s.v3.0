// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { FansubGroupMediaBlock } from '../FansubGroupMediaBlock'
import type { PublicFansubMediaItem } from '@/types/fansub'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<
    HTMLImageElement,
    ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean; fill?: boolean }
  >(({ alt, unoptimized, priority, fill, ...props }, ref) => {
    void unoptimized
    void priority
    void fill
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(() => {
  cleanup()
})

function mediaRow(overrides: Partial<PublicFansubMediaItem> = {}): PublicFansubMediaItem {
  return {
    id: 1,
    media_type: 'group_gallery',
    caption: 'visible_group_media',
    mime_type: 'image/jpeg',
    thumbnail_url: '/media/group-gallery-thumb.jpg',
    original_url: '/media/group-gallery.jpg',
    category: 'other',
    ...overrides,
  }
}

describe('FansubGroupMediaBlock', () => {
  it('zeigt Titel, Beschreibung und deutschen Typ-Tag pro Medium', () => {
    render(
      <FansubGroupMediaBlock
        media={[
          mediaRow({
            title: 'Galerie-Highlight',
            description: 'Ein besonderer Moment aus der Gruppenarbeit.',
            category: 'gallery',
          }),
        ]}
      />,
    )

    expect(screen.getByText('Galerie-Highlight')).toBeTruthy()
    expect(screen.getByText('Ein besonderer Moment aus der Gruppenarbeit.')).toBeTruthy()
    expect(screen.getByText('Galerie')).toBeTruthy()
  })

  it('setzt loading="lazy" und sizes auf Bild-Elementen', () => {
    render(<FansubGroupMediaBlock media={[mediaRow({ title: 'Bild-Item' })]} />)

    const image = screen.getByAltText('Bild-Item')
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('sizes')).toBeTruthy()
  })

  it('zeigt EmptyState bei leerer Medien-Liste', () => {
    render(<FansubGroupMediaBlock media={[]} />)

    expect(screen.getByText('Noch keine Medien hinterlegt')).toBeTruthy()
  })

  it('begrenzt die Vorschau auf 5 Kacheln mit Ueberlaufkachel und Alle-anzeigen-Button', () => {
    const items = Array.from({ length: 6 }, (_, index) =>
      mediaRow({ id: index + 1, title: `Medium ${index + 1}` }),
    )
    render(<FansubGroupMediaBlock media={items} />)

    expect(screen.getByText('+2 weitere')).toBeTruthy()
    expect(screen.getByText('Alle 6 anzeigen')).toBeTruthy()
    expect(screen.queryByText('Medium 5')).toBeNull()
    expect(screen.queryByText('Medium 6')).toBeNull()
  })

  it('zeigt nach Klick auf Alle anzeigen alle Kacheln', () => {
    const items = Array.from({ length: 6 }, (_, index) =>
      mediaRow({ id: index + 1, title: `Medium ${index + 1}` }),
    )
    render(<FansubGroupMediaBlock media={items} />)

    fireEvent.click(screen.getByText('Alle 6 anzeigen'))

    expect(screen.getByText('Medium 5')).toBeTruthy()
    expect(screen.getByText('Medium 6')).toBeTruthy()
    expect(screen.queryByText('+2 weitere')).toBeNull()
  })

  it('ruft onSelect mit dem korrekten Index beim Klick auf ein Thumbnail auf', () => {
    const onSelect = vi.fn()
    const items = Array.from({ length: 3 }, (_, index) =>
      mediaRow({ id: index + 1, title: `Medium ${index + 1}` }),
    )
    render(<FansubGroupMediaBlock media={items} onSelect={onSelect} />)

    fireEvent.click(screen.getByAltText('Medium 2'))

    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
