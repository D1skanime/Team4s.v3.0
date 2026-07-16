// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicReleaseBlock } from '../PublicReleaseBlock'
import type { PublicReleasePreview } from '../PublicReleaseBlock'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<
    HTMLImageElement,
    ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; fill?: boolean; sizes?: string }
  >(({ alt, unoptimized, fill, sizes, ...props }, ref) => {
    void unoptimized
    void fill
    void sizes
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(() => {
  cleanup()
})

const release: PublicReleasePreview = {
  id: 1,
  href: '/anime/1/group/2/releases/3',
  episodeLabel: 'Folge 12',
  title: 'Entscheidung am Himmel',
  versionLabel: 'C-Subs v2',
  releasedAtLabel: '14.07.2026',
  durationLabel: '00:23:41',
  imageCount: 4,
  noteCount: 2,
  contributorCount: 3,
  heroImage: {
    id: 1,
    src: '/covers/placeholder.jpg',
    label: 'Screenshot',
    alt: 'Release-Screenshot',
  },
  imagePreviews: [
    {
      id: 2,
      src: '/covers/placeholder.jpg',
      label: 'Karaoke',
      alt: 'Karaoke-Vorschau',
    },
  ],
  notePreviews: [
    {
      id: 1,
      author: 'Cookie',
      excerpt: 'Kurzer öffentlicher Release-Einblick.',
    },
  ],
  contributors: [
    { id: 1, name: 'Cookie', roleLabel: 'Übersetzung' },
  ],
  timelineSegments: [
    { id: 1, type: 'OP', label: 'Regenzeichen', timeLabel: '00:01:42', leftPercent: 8, widthPercent: 16, href: '#op' },
  ],
}

describe('PublicReleaseBlock', () => {
  it('rendert neuestes Release, Timeline, Medien, Texte und Fansubber', () => {
    render(<PublicReleaseBlock latestRelease={release} releases={[release]} />)

    expect(screen.getByRole('heading', { name: 'Releases zum Fansub' })).toBeTruthy()
    expect(screen.getByText('Neuestes Fansub-Release')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Folge 12' })).toBeTruthy()
    expect(screen.getAllByText(/Entscheidung am Himmel/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('4 Bilder').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2 Texte').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3 Fansubber').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Karas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Regenzeichen').length).toBeGreaterThan(0)
    expect(screen.queryByText('00:23:41')).toBeNull()
    expect(screen.queryByText('00:01:42')).toBeNull()
    expect(screen.queryByText('Hauptinhalt')).toBeNull()
    expect(screen.getByText('Kurzer öffentlicher Release-Einblick.')).toBeTruthy()
  })

  it('rendert den öffentlichen Leerzustand ohne Releases', () => {
    render(<PublicReleaseBlock releases={[]} />)

    expect(screen.getByText('Noch keine Releases sichtbar')).toBeTruthy()
    expect(screen.getByText('Für dieses Fansub-Projekt sind noch keine öffentlichen Release-Daten freigegeben.')).toBeTruthy()
  })
})
