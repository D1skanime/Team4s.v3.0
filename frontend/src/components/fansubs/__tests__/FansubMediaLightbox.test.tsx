// @vitest-environment jsdom

import { forwardRef, useState, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { FansubMediaLightbox } from '../FansubMediaLightbox'
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

function threeItems(): PublicFansubMediaItem[] {
  return [
    mediaRow({ id: 1, title: 'Erstes Bild', description: 'Beschreibung eins.' }),
    mediaRow({ id: 2, title: 'Zweites Bild', description: 'Beschreibung zwei.' }),
    mediaRow({ id: 3, title: 'Drittes Bild', description: 'Beschreibung drei.' }),
  ]
}

describe('FansubMediaLightbox', () => {
  it('rendert nichts bei index=null', () => {
    const { container } = render(
      <FansubMediaLightbox media={threeItems()} index={null} onClose={vi.fn()} onNavigate={vi.fn()} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('zeigt Originalbild, vollen Titel, volle Beschreibung und Zaehler 1 / 3 bei index=0', () => {
    render(
      <FansubMediaLightbox media={threeItems()} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />,
    )

    const image = screen.getByAltText('Erstes Bild') as HTMLImageElement
    expect(image.getAttribute('src')).toContain('/media/group-gallery.jpg')
    expect(screen.getAllByText('Erstes Bild').length).toBeGreaterThan(0)
    expect(screen.getByText('Beschreibung eins.')).toBeTruthy()
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('rendert role=dialog und aria-modal (via Modal)', () => {
    render(
      <FansubMediaLightbox media={threeItems()} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('ruft onNavigate mit 1 auf, wenn "Naechstes Bild" geklickt wird', () => {
    const onNavigate = vi.fn()
    render(
      <FansubMediaLightbox media={threeItems()} index={0} onClose={vi.fn()} onNavigate={onNavigate} />,
    )

    fireEvent.click(screen.getByLabelText('Nächstes Bild'))

    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it('ruft onNavigate mit dem letzten Index auf (Wrap-around), wenn "Vorheriges Bild" bei index=0 geklickt wird', () => {
    const onNavigate = vi.fn()
    render(
      <FansubMediaLightbox media={threeItems()} index={0} onClose={vi.fn()} onNavigate={onNavigate} />,
    )

    fireEvent.click(screen.getByLabelText('Vorheriges Bild'))

    expect(onNavigate).toHaveBeenCalledWith(2)
  })

  it('ruft onNavigate mit 0 auf (Wrap-around), wenn "Naechstes Bild" beim letzten Index geklickt wird', () => {
    const onNavigate = vi.fn()
    render(
      <FansubMediaLightbox media={threeItems()} index={2} onClose={vi.fn()} onNavigate={onNavigate} />,
    )

    expect(screen.getByText('3 / 3')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Nächstes Bild'))

    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  it('navigiert per ArrowRight/ArrowLeft-Tastendruck', () => {
    const onNavigate = vi.fn()
    render(
      <FansubMediaLightbox media={threeItems()} index={1} onClose={vi.fn()} onNavigate={onNavigate} />,
    )

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith(2)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  it('schliesst per Escape ueber Modal onClose', () => {
    const onClose = vi.fn()
    render(
      <FansubMediaLightbox media={threeItems()} index={0} onClose={onClose} onNavigate={vi.fn()} />,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })
})

describe('FansubGroupMediaBlock + FansubMediaLightbox Integration', () => {
  function LightboxHost({ media }: { media: PublicFansubMediaItem[] }) {
    const items = media
    // Minimal Host, der activeIndex haelt (spiegelt die spaetere Verdrahtung in FansubGroupMediaBlock).
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    return (
      <>
        <FansubGroupMediaBlock media={items} onSelect={setActiveIndex} />
        <FansubMediaLightbox
          media={items}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      </>
    )
  }

  it('oeffnet die Lightbox am korrekten globalen Index nach "Alle anzeigen" und Klick auf ein spaet sichtbares Thumbnail', () => {
    const items = Array.from({ length: 7 }, (_, index) =>
      mediaRow({ id: index + 1, title: `Medium ${index + 1}`, description: `Beschreibung ${index + 1}` }),
    )

    render(<LightboxHost media={items} />)

    fireEvent.click(screen.getByText('Alle 7 anzeigen'))
    fireEvent.click(screen.getByAltText('Medium 6'))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('6 / 7')).toBeTruthy()
  })
})
