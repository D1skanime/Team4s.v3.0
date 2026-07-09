// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FansubProjectsGrid } from '../FansubProjectsGrid'
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

describe('FansubProjectsGrid', () => {
  it('rendert die initial sichtbaren Projekte ohne horizontales Karussell', () => {
    render(<FansubProjectsGrid items={makeItems(3)} groupId={5} />)

    expect(screen.getByText('Projekt 1')).toBeTruthy()
    expect(screen.getByText('Projekt 3')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Projekt-Karussell' })).toBeNull()
  })

  it('zeigt bei mehr als 8 Items eine "weitere anzeigen"-Aktion und blendet den Rest inline ein', () => {
    render(<FansubProjectsGrid items={makeItems(10)} groupId={5} />)

    expect(screen.getByText('2 weitere anzeigen')).toBeTruthy()
    expect(screen.queryByText('Projekt 10')).toBeNull()

    fireEvent.click(screen.getByText('2 weitere anzeigen'))

    expect(screen.getByText('Projekt 10')).toBeTruthy()
    expect(screen.queryByText('2 weitere anzeigen')).toBeNull()
  })
})
