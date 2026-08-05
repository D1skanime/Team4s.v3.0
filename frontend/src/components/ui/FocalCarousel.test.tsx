// @vitest-environment jsdom

import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

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
      deferInteractionUntilNearViewport
    />,
  )
}

function stubAnimationFrames() {
  let nextFrameId = 1
  const frames = new Map<number, FrameRequestCallback>()
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const frameId = nextFrameId
    nextFrameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  const cancelAnimationFrame = vi.fn((frameId: number) => {
    frames.delete(frameId)
  })
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  return {
    advanceTo(time: number) {
      const callbacks = Array.from(frames.values())
      frames.clear()
      callbacks.forEach((callback) => callback(time))
    },
    cancelAnimationFrame,
    pendingCount: () => frames.size,
  }
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
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alle Karten anzeigen' }))
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
      const scrollTo = vi.fn(({ left }: ScrollToOptions) => {
        region.scrollLeft = Number(left)
      })
      region.scrollTo = scrollTo as typeof region.scrollTo

      fireEvent.keyDown(region, { key: 'End' })
      expect(scrollTo).toHaveBeenCalledWith({ left: 2000, behavior: 'smooth' })
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      expect(region.querySelector('[aria-current="true"]')).toBeNull()
      act(() => vi.advanceTimersByTime(160))
      expect(screen.getByText('Karte 11').closest('[aria-current="true"]')).not.toBeNull()

      fireEvent.keyDown(region, { key: 'ArrowLeft' })
      act(() => vi.advanceTimersByTime(160))

      expect(screen.getByText('10 von 11 Rollen')).toBeTruthy()
      expect(screen.getByText('Karte 10').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('FocalCarousel Phase 119 shared interaction contract', () => {
  it('renders one item quietly without arrows, counter or disclosure controls', () => {
    render(
      <FocalCarousel
        items={['Einzeln']}
        getItemKey={(item) => item}
        renderItem={(item) => <span>{item}</span>}
        regionLabel="Einzel-Karussell"
        itemSingularLabel="Karte"
        itemPluralLabel="Karten"
        previousLabel="Vorherige Karte"
        nextLabel="Nächste Karte"
        showAllLabel="Alle Karten anzeigen"
        showCounter
      />,
    )
    expect(screen.getByText('Einzeln')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Vorherige Karte' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nächste Karte' })).toBeNull()
    expect(screen.queryByText('1 von 1 Karte')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Alle Karten anzeigen' })).toBeNull()
  })

  it('keeps two expanded instances independent and restores focus to each own toggle', () => {
    const instance = (label: string) => (
      <FocalCarousel items={items} getItemKey={(item) => item}
        renderItem={(item) => <span>{label} {item}</span>} regionLabel={`${label}-Karussell`}
        itemSingularLabel="Karte" itemPluralLabel="Karten" previousLabel={`${label} zurück`}
        nextLabel={`${label} weiter`} showAllLabel={`${label} alle anzeigen`} showLessLabel={`${label} weniger anzeigen`} />
    )
    render(<>{instance('Erste')}{instance('Zweite')}</>)
    fireEvent.click(screen.getByRole('button', { name: 'Erste alle anzeigen' }))
    expect(screen.getByRole('list', { name: 'Alle Karten' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Zweite-Karussell' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Erste weniger anzeigen' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Erste alle anzeigen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite alle anzeigen' }))
    expect(screen.getByRole('region', { name: 'Erste-Karussell' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zweite weniger anzeigen' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Zweite alle anzeigen' }))
  })

  it('does not steal Arrow, Home or End keys from a nested interactive child', () => {
    renderCarousel()
    const alpha = screen.getByRole('button', { name: 'Alpha' })
    fireEvent.keyDown(alpha, { key: 'ArrowRight' })
    fireEvent.keyDown(alpha, { key: 'End' })
    expect(screen.getByText('Alpha').closest('[aria-current="true"]')).not.toBeNull()
  })

  it('passes outward wheel deltas through at both endpoints', () => {
    renderCarousel()
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
    Object.defineProperties(region, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    })
    const atStart = new WheelEvent('wheel', { deltaY: -40, cancelable: true })
    region.dispatchEvent(atStart)
    expect(atStart.defaultPrevented).toBe(false)
    region.scrollLeft = 600
    const atEnd = new WheelEvent('wheel', { deltaY: 40, cancelable: true })
    region.dispatchEvent(atEnd)
    expect(atEnd.defaultPrevented).toBe(false)
  })

  it('leaves vertical page scrolling untouched while handling horizontal wheel gestures', () => {
    renderCarousel()
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
    Object.defineProperties(region, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, writable: true, value: 200 },
    })
    const vertical = new WheelEvent('wheel', { deltaY: 60, cancelable: true })
    region.dispatchEvent(vertical)
    expect(vertical.defaultPrevented).toBe(false)
    expect(region.scrollLeft).toBe(200)

    const horizontal = new WheelEvent('wheel', { deltaX: 60, cancelable: true })
    region.dispatchEvent(horizontal)
    expect(horizontal.defaultPrevented).toBe(true)
    expect(region.scrollLeft).toBe(260)
  })

  it('keeps tablet card geometry stable and emphasizes only the settled item', () => {
    expect(focalCarouselCss).not.toMatch(/\.itemWindow\s*\{[^}]*transform:\s*scale/s)
    expect(focalCarouselCss).not.toContain('--focal-proximity')
    expect(focalCarouselCss).not.toMatch(/\.trackInteractive\s*\{[^}]*scroll-behavior:\s*smooth/s)

    vi.useFakeTimers()
    try {
      renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 300 },
        offsetWidth: { configurable: true, value: 300 },
      }))

      const horizontal = new WheelEvent('wheel', { deltaX: 300, cancelable: true })
      act(() => { region.dispatchEvent(horizontal) })

      expect(horizontal.defaultPrevented).toBe(true)
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      act(() => vi.advanceTimersByTime(160))

      expect(region.getAttribute('data-navigation-state')).toBe('settled')
      expect(screen.getByText('Beta').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('moves arrow targets smoothly and keeps rapid clicks on the pending target', () => {
    vi.useFakeTimers()
    try {
      renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 300 },
        offsetWidth: { configurable: true, value: 300 },
      }))
      const scrollTo = vi.fn(({ left }: ScrollToOptions) => { region.scrollLeft = Number(left) })
      region.scrollTo = scrollTo as typeof region.scrollTo

      fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))

      expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' })
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: 'smooth' })
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      act(() => vi.advanceTimersByTime(160))

      expect(region.getAttribute('data-navigation-state')).toBe('settled')
      expect(screen.getByText('Gamma').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps deliberate arrow navigation smooth and settled-only for reduced motion', () => {
    vi.useFakeTimers()
    const animation = stubAnimationFrames()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    try {
      renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 300 },
        offsetWidth: { configurable: true, value: 300 },
      }))
      const scrollTo = vi.fn(({ left }: ScrollToOptions) => { region.scrollLeft = Number(left) })
      region.scrollTo = scrollTo as typeof region.scrollTo

      fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      act(() => animation.advanceTo(0))
      act(() => animation.advanceTo(140))
      const firstIntermediateLeft = region.scrollLeft
      expect(firstIntermediateLeft).toBeGreaterThan(0)
      expect(firstIntermediateLeft).toBeLessThan(300)
      expect(scrollTo).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
      act(() => animation.advanceTo(150))
      act(() => animation.advanceTo(290))
      expect(region.scrollLeft).toBeGreaterThan(firstIntermediateLeft)
      expect(region.scrollLeft).toBeLessThan(600)
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      act(() => animation.advanceTo(430))
      expect(region.scrollLeft).toBe(600)
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      act(() => vi.advanceTimersByTime(160))

      expect(region.getAttribute('data-navigation-state')).toBe('settled')
      expect(screen.getByText('Gamma').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })

  it('keeps reduced-motion Arrow, Home and End commands on the smooth pending-target path', () => {
    vi.useFakeTimers()
    const animation = stubAnimationFrames()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    try {
      renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 300 },
        offsetWidth: { configurable: true, value: 300 },
      }))
      const scrollTo = vi.fn(({ left }: ScrollToOptions) => { region.scrollLeft = Number(left) })
      region.scrollTo = scrollTo as typeof region.scrollTo

      fireEvent.keyDown(region, { key: 'ArrowRight' })
      fireEvent.keyDown(region, { key: 'End' })
      act(() => animation.advanceTo(0))
      act(() => animation.advanceTo(140))
      expect(region.scrollLeft).toBeGreaterThan(0)
      expect(region.scrollLeft).toBeLessThan(600)

      fireEvent.keyDown(region, { key: 'Home' })
      const homeStart = region.scrollLeft
      act(() => animation.advanceTo(150))
      act(() => animation.advanceTo(290))
      expect(region.scrollLeft).toBeGreaterThan(0)
      expect(region.scrollLeft).toBeLessThan(homeStart)
      expect(region.getAttribute('data-navigation-state')).toBe('moving')
      expect(region.querySelector('[aria-current="true"]')).toBeNull()

      act(() => animation.advanceTo(430))
      expect(region.scrollLeft).toBe(0)
      expect(scrollTo).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(160))

      expect(region.getAttribute('data-navigation-state')).toBe('settled')
      expect(screen.getByText('Alpha').closest('[aria-current="true"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })

  it('cancels a reduced-motion deliberate animation when unmounted', () => {
    const animation = stubAnimationFrames()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    try {
      const rendered = renderCarousel()
      const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      const cards = Array.from(region.querySelectorAll<HTMLElement>('[data-focal-item]'))
      Object.defineProperties(region, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      })
      cards.forEach((card, index) => Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 300 },
        offsetWidth: { configurable: true, value: 300 },
      }))

      fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
      act(() => animation.advanceTo(0))
      expect(animation.pendingCount()).toBe(1)

      rendered.unmount()

      expect(animation.cancelAnimationFrame).toHaveBeenCalled()
      expect(animation.pendingCount()).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('does not capture a tablet pointer gesture with vertical intent', () => {
    renderCarousel()
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
    Object.defineProperties(region, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, writable: true, value: 200 },
    })

    const pointerDown = createEvent.pointerDown(region, { pointerId: 9, pointerType: 'touch' })
    Object.defineProperties(pointerDown, {
      clientX: { value: 100 },
      clientY: { value: 100 },
    })
    fireEvent(region, pointerDown)
    const pointerMove = createEvent.pointerMove(region, { pointerId: 9, pointerType: 'touch' })
    Object.defineProperties(pointerMove, {
      clientX: { value: 90 },
      clientY: { value: 180 },
    })
    const allowed = fireEvent(region, pointerMove)

    expect(allowed).toBe(true)
    expect(region.scrollLeft).toBe(200)
    expect(region.className).not.toContain('dragging')
  })

  it('cancels pointer state and removes Reduced Motion listeners on unmount', () => {
    const removeEventListener = vi.fn()
    const matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener })
    vi.stubGlobal('matchMedia', matchMedia)
    const rendered = renderCarousel()
    const region = screen.getByRole('region', { name: 'Beispiel-Karussell' })
    fireEvent.pointerDown(region, { pointerId: 7, pointerType: 'mouse', button: 0, clientX: 100 })
    fireEvent.pointerMove(region, { pointerId: 7, pointerType: 'mouse', clientX: 80 })
    fireEvent.pointerCancel(region, { pointerId: 7, pointerType: 'mouse' })
    expect(region.className).not.toContain('dragging')
    rendered.unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    vi.unstubAllGlobals()
  })
})

it('Phase 120 RED: activates once at 600px and immediately without IntersectionObserver', () => {
    let observerCallback: IntersectionObserverCallback | null = null
    const observe = vi.fn()
    const disconnect = vi.fn()
    const mediaAdd = vi.fn()
    const mediaRemove = vi.fn()
    const matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: mediaAdd,
      removeEventListener: mediaRemove,
    })
    let observerOptions: IntersectionObserverInit | undefined

    vi.stubGlobal('matchMedia', matchMedia)
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observerCallback = callback
        observerOptions = options
      }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn()
      root = null
      rootMargin = ''
      thresholds = []
    })

    const first = renderCarousel(true)
    const firstRegion = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
    const firstWheelListener = vi.spyOn(firstRegion, 'addEventListener')

    try {
      expect(observerOptions?.rootMargin).toBe('600px 0px')
      expect(observe).toHaveBeenCalledTimes(1)
      expect(firstRegion.getAttribute('data-interaction-enabled')).toBe('false')
      expect(screen.getByText('Alpha')).toBeTruthy()
      expect(screen.getByText('Beta')).toBeTruthy()
      expect(screen.getByText('Gamma')).toBeTruthy()
      expect(screen.getByText('1 von 3 Karten')).toBeTruthy()
      expect(mediaAdd).not.toHaveBeenCalled()
      expect(firstWheelListener).not.toHaveBeenCalledWith('wheel', expect.any(Function), expect.anything())

      act(() => observerCallback?.([
        { isIntersecting: true, target: firstRegion } as unknown as IntersectionObserverEntry,
      ], {} as IntersectionObserver))

      expect(disconnect).toHaveBeenCalledTimes(1)
      expect(firstRegion.getAttribute('data-interaction-enabled')).toBe('true')
      expect(mediaAdd).toHaveBeenCalledTimes(1)
      expect(firstWheelListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })

      act(() => observerCallback?.([
        { isIntersecting: true, target: firstRegion } as unknown as IntersectionObserverEntry,
      ], {} as IntersectionObserver))
      expect(mediaAdd).toHaveBeenCalledTimes(1)

      first.unmount()
      vi.unstubAllGlobals()
      vi.stubGlobal('matchMedia', matchMedia)
      mediaAdd.mockClear()

      const fallbackWheelListener = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const fallback = renderCarousel()
      const fallbackRegion = screen.getByRole('region', { name: 'Beispiel-Karussell' }) as HTMLDivElement
      expect(fallbackRegion.getAttribute('data-interaction-enabled')).toBe('true')
      expect(mediaAdd).toHaveBeenCalledTimes(1)
      expect(fallbackWheelListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })
      fallback.unmount()
      fallbackWheelListener.mockRestore()
    } finally {
      firstWheelListener.mockRestore()
      vi.unstubAllGlobals()
    }
})
