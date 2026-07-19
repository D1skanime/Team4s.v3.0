// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui', () => ({
  AdjacentNavigation: ({ previous, next, variant, className, ariaLabel }: {
    previous: { href: string; label: ReactNode; ariaLabel: string } | null
    next: { href: string; label: ReactNode; ariaLabel: string } | null
    variant?: string
    className?: string
    ariaLabel: string
  }) => previous || next ? (
    <nav
      aria-label={ariaLabel}
      data-variant={variant ?? ''}
      data-has-local-class={className ? 'true' : 'false'}
      className={className}
    >
      {previous ? <a href={previous.href} aria-label={previous.ariaLabel}>{previous.label}</a> : null}
      {next ? <a href={next.href} aria-label={next.ariaLabel}>{next.label}</a> : null}
    </nav>
  ) : null,
}))

import { ReleaseNavigation } from './ReleaseNavigation'

const previous = { release_version_id: 77, episode_number: '6', episode_title: null, version: '2', group_id: 4 }
const next = { release_version_id: 88, episode_number: '8', episode_title: null, version: '2', group_id: 99 }

afterEach(cleanup)

describe('ReleaseNavigation', () => {
  it('keeps both adjacent edges inside the canonical fansub project', () => {
    render(<ReleaseNavigation
      animeID={9}
      groupID={4}
      canonicalProjectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
      previous={previous}
      next={next}
    />)

    expect(screen.getByRole('link', { name: /Vorheriger Release/ }).getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed/releases/77')
    expect(screen.getByRole('link', { name: /Nächster Release/ }).getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed/releases/88')
  })

  it('omits only the missing edge', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} canonicalProjectPath="/fansubs/c-subs/fansubprojekt/vipers-creed" previous={null} next={next} />)
    expect(screen.getByRole('link', { name: /Nächster Release/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Vorheriger Release/ })).toBeNull()
  })

  it('omits navigation completely when both group-faithful edges are absent', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} previous={null} next={null} />)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('retains the technical compatibility href without canonical context', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} previous={null} next={{ ...next, group_id: 4 }} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/anime/9/group/4/releases/88')
  })

  it('composes the global navigation explicitly as inline with a local responsive seam', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} previous={previous} next={next} />)
    const navigation = screen.getByRole('navigation', { name: 'Vorheriger und nächster Release' })
    expect(navigation.getAttribute('data-variant')).toBe('inline')
    expect(navigation.getAttribute('data-has-local-class')).toBe('true')
  })
})
