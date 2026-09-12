// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberCounts } from '@/types/projectMember'

import { ProjectMemberStickyNav } from './ProjectMemberStickyNav'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const counts: ProjectMemberCounts = { roles: 1, notes: 12, media: 2, releases: 0, episodes: 13 }

describe('ProjectMemberStickyNav', () => {
  it('highlights the section the IntersectionObserver reports as in view', () => {
    let callback: IntersectionObserverCallback | null = null

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(nextCallback: IntersectionObserverCallback) {
          callback = nextCallback
        }
        observe = vi.fn()
        disconnect = vi.fn()
        unobserve = vi.fn()
        takeRecords = vi.fn()
        root = null
        rootMargin = ''
        thresholds: number[] = []
      },
    )

    render(<ProjectMemberStickyNav counts={counts} />)

    act(() => {
      callback?.(
        [
          {
            target: { id: 'bilder' },
            isIntersecting: true,
            intersectionRatio: 0.6,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      )
    })

    const bilderButton = screen.getByRole('button', { name: /Bilder & Medien/ })
    const texteButton = screen.getByRole('button', { name: /Texte & Notizen/ })
    expect(bilderButton.className).toContain('stickyNavItemActive')
    expect(texteButton.className).not.toContain('stickyNavItemActive')
  })

  it('marks the clicked pill active immediately as a last-clicked fallback', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    render(<ProjectMemberStickyNav counts={counts} />)

    const releasesButton = screen.getByRole('button', { name: /Releases/ })
    fireEvent.click(releasesButton)
    expect(releasesButton.className).toContain('stickyNavItemActive')
  })
})
