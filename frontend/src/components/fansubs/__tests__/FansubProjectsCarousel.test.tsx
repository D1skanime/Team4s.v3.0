// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FansubProjectsCarousel } from '../FansubProjectsCarousel'
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

function makeItems(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const project: PublicFansubProject = {
      id: index + 1,
      title: `Projekt ${index + 1}`,
      type: 'TV',
      status: 'done',
      year: 2010 + index,
    }
    return { project, statusLabel: 'Abgeschlossen' }
  })
}

describe('FansubProjectsCarousel', () => {
  it('zeigt Pfeil-Buttons mit aria-label', async () => {
    render(<FansubProjectsCarousel items={makeItems(3)} groupId={5} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByRole('button', { name: 'Vorherige Projekte' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weitere Projekte' })).toBeTruthy()
  })

  it('zeigt bei mehr Items als initial sichtbar eine "weitere anzeigen"-Endkachel und blendet beim Klick den Rest ein', async () => {
    render(<FansubProjectsCarousel items={makeItems(10)} groupId={5} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText('2 weitere anzeigen')).toBeTruthy()
    expect(screen.queryByText('Projekt 10')).toBeNull()

    fireEvent.click(screen.getByText('2 weitere anzeigen'))

    expect(screen.getByText('Projekt 10')).toBeTruthy()
    expect(screen.queryByText('2 weitere anzeigen')).toBeNull()
  })

  it('rendert die Bahn mit role=region und aria-label fuer Tastaturbedienung', async () => {
    render(<FansubProjectsCarousel items={makeItems(3)} groupId={5} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const track = screen.getByRole('region', { name: 'Projekt-Karussell' })
    expect(track.getAttribute('tabindex')).toBe('0')
  })
})
