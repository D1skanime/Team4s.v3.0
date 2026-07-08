// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

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
})
