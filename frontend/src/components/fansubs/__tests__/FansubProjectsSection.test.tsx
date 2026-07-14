// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FansubProjectBannerCard } from '../FansubProjectBannerCard'
import { FansubProjectsSection } from '../FansubProjectsSection'
import type { PublicFansubProject } from '@/types/fansub'

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

function project(overrides: Partial<PublicFansubProject> = {}): PublicFansubProject {
  return {
    id: 123,
    anime_slug: 'projekt-anime',
    title: 'Projekt Anime',
    type: 'TV',
    status: 'ongoing',
    year: 2012,
    ...overrides,
  }
}

describe('FansubProjectBannerCard', () => {
  it('rendert das lazy Banner-Bild und die Status-Pill wenn banner_url gesetzt ist', () => {
    const { container } = render(
      <FansubProjectBannerCard
        project={project({ anime_slug: 'vipers-creed', banner_url: '/api/media/banner.jpg' })}
        groupId={77}
        fansubSlug="c-subs"
        statusLabel="Laufend"
      />,
    )

    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('loading')).toBe('lazy')
    expect(img?.getAttribute('sizes')).toBeTruthy()
    expect(screen.getByText('Laufend')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed')
  })

  it('faellt auf cover_image zurueck wenn kein banner_url gesetzt ist', () => {
    const { container } = render(
      <FansubProjectBannerCard
        project={project({ banner_url: null, cover_image: '/api/media/cover.jpg' })}
        groupId={77}
        fansubSlug="c-subs"
        statusLabel="Abgeschlossen"
      />,
    )

    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('cover.jpg')
  })

  it('zeigt einen Skeleton-Platzhalter wenn weder banner_url noch cover_image gesetzt sind', () => {
    const { container } = render(
      <FansubProjectBannerCard
        project={project({ banner_url: null, cover_image: null })}
        groupId={77}
        fansubSlug="c-subs"
        statusLabel="Archiviert"
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })
})

describe('FansubProjectsSection', () => {
  it('rendert keinen Abschnitt wenn keine Projekte geliefert werden', () => {
    const { container } = render(<FansubProjectsSection projects={[]} groupId={77} groupSlug="c-subs" />)

    expect(container.innerHTML).toBe('')
  })

  it('rendert laufende Projekte als Banner-Karten und abgeschlossene/archivierte im Grid mit genau einem Header', async () => {
    render(
      <FansubProjectsSection
        projects={[
          project({ id: 1, title: 'Laufendes Projekt', status: 'ongoing' }),
          project({ id: 2, title: 'Abgeschlossenes Projekt', status: 'done' }),
          project({ id: 3, title: 'Archiviertes Projekt', status: 'cancelled' }),
        ]}
        groupId={77}
        groupSlug="c-subs"
      />,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.getByText('Projekte')).toBeTruthy()
    expect(screen.queryByText('Laufende Projekte')).toBeNull()

    expect(screen.getByText('Laufendes Projekt')).toBeTruthy()
    // Abgeschlossene/archivierte Projekte rendern in einem responsiven Grid
    // (kein horizontales Karussell mehr -> keine "Projekt-Karussell"-Region).
    expect(screen.queryByRole('region', { name: 'Projekt-Karussell' })).toBeNull()
    expect(screen.getByText('Abgeschlossenes Projekt')).toBeTruthy()
    expect(screen.getByText('Archiviertes Projekt')).toBeTruthy()
  })
})
