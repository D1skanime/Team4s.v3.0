// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicReleaseSurfacesShowcase } from './PublicReleaseSurfacesShowcase'

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

describe('PublicReleaseSurfacesShowcase', () => {
  it('dokumentiert die produktive Release-Listenkarte mit Kara- und Leer-Timeline', () => {
    render(<PublicReleaseSurfacesShowcase />)

    expect(screen.getByRole('heading', { name: 'Public Release Surfaces' })).toBeTruthy()
    expect(screen.getByText('Globale Release-Listenkarte')).toBeTruthy()
    expect(screen.getAllByText('Entscheidung am Himmel über Fort Daiva').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Signal im Regen').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mitten im Regen').length).toBeGreaterThan(0)
    // DesktopReleaseRow (seit c01b41af) rendert pro Zeile zwei aria-label-gleiche Links
    // (Vorschaubild + Pfeil), benannt nach episodeLabel(episode) + ' öffnen'.
    expect(screen.getAllByRole('link', { name: 'Folge 12 öffnen' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Folge 11 öffnen' })).toHaveLength(2)
  })

  it('öffnet den gemeinsamen Bild-Viewer (FansubMediaLightbox) mit Release-Mock-Bildern über den Demo-Button', () => {
    render(<PublicReleaseSurfacesShowcase />)

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Bild-Viewer mit Release-Bildern öffnen' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
