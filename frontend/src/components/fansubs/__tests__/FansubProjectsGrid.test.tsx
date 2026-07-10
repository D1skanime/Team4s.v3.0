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
    return { project, statusLabel: 'Abgeschlossen', statusVariant: 'success' as const }
  })
}

describe('FansubProjectsGrid', () => {
  it('zeigt bei 20 oder weniger Projekten alle ohne Zaehler-Card', () => {
    render(<FansubProjectsGrid items={makeItems(3)} groupId={5} />)

    expect(screen.getByText('Projekt 1')).toBeTruthy()
    expect(screen.getByText('Projekt 3')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Projekte anzeigen/ })).toBeNull()
  })

  it('zeigt bei mehr als 20 Projekten die ersten 20 + Zaehler-Card und klappt beim Klick alle aus', () => {
    render(<FansubProjectsGrid items={makeItems(25)} groupId={5} />)

    // Vorschau: erste 20, Rest verborgen
    expect(screen.getByText('Projekt 20')).toBeTruthy()
    expect(screen.queryByText('Projekt 21')).toBeNull()
    expect(screen.queryByText('Projekt 25')).toBeNull()

    // Zaehler-Card mit Rest-Anzahl (+5) und aria-label
    const countCard = screen.getByRole('button', { name: 'Alle 25 Projekte anzeigen' })
    expect(countCard.textContent).toContain('+5')

    fireEvent.click(countCard)

    // Ausgeklappt: alle sichtbar, Zaehler-Card weg, "Weniger anzeigen"
    expect(screen.getByText('Projekt 25')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Alle 25 Projekte anzeigen' })).toBeNull()
    expect(screen.getByText('Weniger anzeigen')).toBeTruthy()
  })
})
