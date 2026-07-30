// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FocalCarousel } from './FocalCarousel'

const items = ['Alpha', 'Beta', 'Gamma']

function renderCarousel() {
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
    />,
  )
}

describe('FocalCarousel', () => {
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
})
