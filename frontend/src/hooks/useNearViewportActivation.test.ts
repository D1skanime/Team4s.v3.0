// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useNearViewportActivation } from './useNearViewportActivation'

function Harness({ defer = true }: { defer?: boolean }) {
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLDivElement>(defer)

  return createElement('div', {
    ref: targetRef,
    role: 'region',
    'aria-label': 'Aktivierungsziel',
    'data-interaction-enabled': String(interactionEnabled),
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useNearViewportActivation', () => {
  it('observes at 600px, activates once and never reverts', () => {
    let callback: IntersectionObserverCallback | null = null
    let options: IntersectionObserverInit | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()

    vi.stubGlobal('IntersectionObserver', class {
      constructor(nextCallback: IntersectionObserverCallback, nextOptions?: IntersectionObserverInit) {
        callback = nextCallback
        options = nextOptions
      }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn()
      root = null
      rootMargin = ''
      thresholds = []
    })

    render(createElement(Harness))
    const target = screen.getByRole('region', { name: 'Aktivierungsziel' })

    expect(target.getAttribute('data-interaction-enabled')).toBe('false')
    expect(options?.rootMargin).toBe('600px 0px')
    expect(observe).toHaveBeenCalledWith(target)

    act(() => callback?.([
      { isIntersecting: false, target } as unknown as IntersectionObserverEntry,
    ], {} as IntersectionObserver))
    expect(target.getAttribute('data-interaction-enabled')).toBe('false')
    expect(disconnect).not.toHaveBeenCalled()

    act(() => callback?.([
      { isIntersecting: true, target } as unknown as IntersectionObserverEntry,
    ], {} as IntersectionObserver))
    expect(target.getAttribute('data-interaction-enabled')).toBe('true')
    expect(disconnect).toHaveBeenCalledTimes(1)

    act(() => callback?.([
      { isIntersecting: false, target } as unknown as IntersectionObserverEntry,
    ], {} as IntersectionObserver))
    expect(target.getAttribute('data-interaction-enabled')).toBe('true')
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('activates immediately when IntersectionObserver is unavailable or deferral is disabled', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const fallback = render(createElement(Harness))
    expect(screen.getByRole('region', { name: 'Aktivierungsziel' }).getAttribute('data-interaction-enabled')).toBe('true')

    fallback.unmount()
    const observe = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      observe = observe
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn()
      root = null
      rootMargin = ''
      thresholds = []
    })
    render(createElement(Harness, { defer: false }))
    expect(screen.getByRole('region', { name: 'Aktivierungsziel' }).getAttribute('data-interaction-enabled')).toBe('true')
    expect(observe).not.toHaveBeenCalled()
  })

  it('disconnects an inactive observer during cleanup', () => {
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      observe = vi.fn()
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn()
      root = null
      rootMargin = ''
      thresholds = []
    })

    const rendered = render(createElement(Harness))
    expect(disconnect).not.toHaveBeenCalled()
    rendered.unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
