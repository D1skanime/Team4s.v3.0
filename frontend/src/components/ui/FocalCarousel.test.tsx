// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FocalCarousel } from './FocalCarousel'
const focalCarouselCss = readFileSync('src/components/ui/FocalCarousel.module.css', 'utf8')

const items = ['Alpha', 'Beta', 'Gamma']

function renderCarousel(showCounter = false) {
  return render(
    <FocalCarousel
      items={items}
      getItemKey={(item) => item}
      renderItem={(item) => <button type="button">{item}</button>}
      regionLabel="Beispiel-Karussell"
      itemSingularLabel="Karte"
      itemPluralLabel="Karten"
      previousLabel="Vorherige Karte"
      nextLabel="Nächste Karte"
      showAllLabel="Alle Karten anzeigen"
      showLessLabel="Weniger anzeigen"
      showCounter={showCounter}
    />,
  )
}

describe('FocalCarousel', () => {
  it('gives the mobile track the full controls width and moves arrows below it', () => {
    expect(focalCarouselCss).toContain('@media (max-width: 520px)')
    expect(focalCarouselCss).toMatch(/\.track\s*\{[^}]*grid-column:\s*1 \/ -1;/s)
    expect(focalCarouselCss).toMatch(/\.track\s*\{[^}]*grid-row:\s*1;/s)
    expect(focalCarouselCss).toMatch(/\.arrow:first-child\s*\{[^}]*grid-column:\s*1;/s)
    expect(focalCarouselCss).toMatch(/\.arrow:last-child\s*\{[^}]*grid-column:\s*3;/s)
  })

  it('navigiert per Buttons und Tastatur, markiert das aktive Element und begrenzt die Enden', () => {
    renderCarousel()

    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' })
    const previous = screen.getByRole('button', { name: 'Vorherige Karte' })
    const next = screen.getByRole('button', { name: 'Nächste Karte' })

    expect(previous.getAttribute('disabled')).not.toBeNull()
    expect(screen.getByText('Alpha').closest('[aria-current="true"]')).not.toBeNull()

    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(screen.getByText('Beta').closest('[aria-current="true"]')).not.toBeNull()
    fireEvent.click(next)
    expect(screen.getByText('Gamma').closest('[aria-current="true"]')).not.toBeNull()
    expect(next.getAttribute('disabled')).not.toBeNull()

    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(screen.getByText('Beta').closest('[aria-current="true"]')).not.toBeNull()
  })

  it('zeigt alle Elemente im Raster und stellt beim Einklappen die aktive Karte wieder her', () => {
    renderCarousel()
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alle Karten anzeigen' }))

    expect(screen.getByRole('list', { name: 'Alle Karten' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }))

    expect(screen.getByText('Beta').closest('[aria-current="true"]')).not.toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Beispiel-Karussell' }))
  })

  it('unterdrückt den nach einem echten Pointer-Drag entstehenden Klick', () => {
    renderCarousel()
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' })
    const onClick = vi.fn()
    region.addEventListener('click', onClick)

    fireEvent.pointerDown(region, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100 })
    fireEvent.pointerMove(region, { pointerId: 1, pointerType: 'mouse', clientX: 70 })
    fireEvent.pointerUp(region, { pointerId: 1, pointerType: 'mouse', clientX: 70 })
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('erzwingt während freiem Maus- oder Touch-Scrollen kein erneutes Zentrieren', () => {
    vi.useFakeTimers()
    const scrollIntoView = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView

    try {
      renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' })

      fireEvent.scroll(region)
      expect(scrollIntoView).not.toHaveBeenCalled()

      vi.advanceTimersByTime(120)
      expect(scrollIntoView).not.toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
      vi.useRealTimers()
    }
  })

  it('supports Home, End and the optional position counter', () => {
    renderCarousel(true)
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' })
    fireEvent.keyDown(region, { key: 'End' })
    expect(screen.getByText('Gamma').closest('[aria-current="true"]')).not.toBeNull()
    expect(screen.getByText('3 von 3 Karten')).toBeTruthy()
    fireEvent.keyDown(region, { key: 'Home' })
    expect(screen.getByText('Alpha').closest('[aria-current="true"]')).not.toBeNull()
  })

  it('keeps an 11-card End target on the final centered card after scroll settling', () => {
    vi.useFakeTimers()
    const elevenItems = Array.from({ length: 11 }, (_, index) => `Karte ${index + 1}`)

    try {
      render(
        <FocalCarousel
          items={elevenItems}
          getItemKey={(item) => item}
          renderItem={(item) => <span>{item}</span>}
          regionLabel="Elf-Karten-Karussell"
          itemSingularLabel="Rolle"
          itemPluralLabel="Rollen"
          previousLabel="Vorherige Rolle"
          nextLabel={'N\u00e4chste Rolle'}
          showCounter
        />,
      )

      const region = screen.getByRole('region', { name: 'Elf-Karten-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 600 },
        scrollWidth: { configurable: true, value: 2600 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => {
        Object.defineProperties(card, {
          offsetLeft: { configurable: true, value: 200 + index * 200 },
          offsetWidth: { configurable: true, value: 400 },
        })
      })
      const scrollTo = vi.fn(({ left, behavior }: ScrollToOptions) => {
        // Real smooth scrolling can pause long enough at the penultimate
        // center for the debounce to fire before reaching the requested target.
        region.scrollLeft = behavior === 'smooth'
          ? Number(left) - 200
          : Number(left)
      })
      region.scrollTo = scrollTo as typeof region.scrollTo

      fireEvent.keyDown(region, { key: 'End' })
      expect(scrollTo).toHaveBeenCalledWith({ left: 2000, behavior: 'smooth' })
      fireEvent.scroll(region)
      act(() => vi.advanceTimersByTime(120))
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 2000, behavior: 'auto' })

      fireEvent.keyDown(region, { key: 'ArrowLeft' })
      region.scrollLeft = 2000
      fireEvent.scroll(region)
      act(() => vi.advanceTimersByTime(120))

      expect(screen.getByText('11 von 11 Rollen')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'N\u00e4chste Rolle' }).getAttribute('disabled')).not.toBeNull()
      expect(screen.getByText('Karte 11').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
