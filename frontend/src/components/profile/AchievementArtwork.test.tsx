// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { ImgHTMLAttributes } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({
    alt,
    priority,
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; unoptimized?: boolean }) => {
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

import { AchievementArtwork } from './AchievementArtwork'

describe('AchievementArtwork', () => {
  it('renders direct artwork through the bounded hero contract', () => {
    render(
      <AchievementArtwork
        descriptor={{ kind: 'direct', src: '/member-achievement-badges/direct.png' }}
        badgeCode="direct_badge"
        alt="Direkte Auszeichnung"
        size="hero"
      />,
    )

    const image = screen.getByRole('img', { name: 'Direkte Auszeichnung' })
    expect(image.getAttribute('data-achievement-art')).toBe('direct_badge')
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('sizes')).toBe(
      '(min-width: 658px) 240px, (min-width: 562px) 216px, 192px',
    )
    expect(image.closest('[data-achievement-slot]')?.getAttribute('data-achievement-size')).toBe(
      'hero',
    )
  })

  it('uses identical outer geometry for layered artwork and keeps decorative layers silent', () => {
    const { container } = render(
      <AchievementArtwork
        descriptor={{
          kind: 'layered',
          motifSrc: '/member-achievement-badges/motif.png',
          frameSrc: '/member-achievement-badges/frame.png',
        }}
        badgeCode="layered_badge"
        alt="Mehrteilige Auszeichnung"
        size="hero"
      />,
    )

    const slot = container.querySelector('[data-achievement-slot]')
    expect(slot?.getAttribute('data-achievement-size')).toBe('hero')
    expect(slot?.querySelectorAll('img')).toHaveLength(2)
    expect(
      screen
        .getByRole('img', { name: 'Mehrteilige Auszeichnung' })
        .getAttribute('data-achievement-art'),
    ).toBe('layered_badge')
    expect(slot?.querySelector('img[alt=""]')).not.toBeNull()
    expect(slot?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })

  it('makes the meaningful image decorative without changing marker dimensions', () => {
    const { container } = render(
      <AchievementArtwork
        descriptor={{ kind: 'direct', src: '/member-achievement-badges/marker.png' }}
        badgeCode="marker_badge"
        alt="Wird dekorativ"
        size="stage"
        decorative
      />,
    )

    expect(screen.queryByRole('img')).toBeNull()
    const image = container.querySelector('img[data-achievement-art="marker_badge"]')
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('aria-hidden')).toBe('true')
    expect(image?.getAttribute('sizes')).toBe('(min-width: 562px) 80px, 64px')
  })

  it('keeps eager priority artwork on a conservative image hint without invalid auto sizing', () => {
    render(
      <AchievementArtwork
        descriptor={{ kind: 'direct', src: '/member-achievement-badges/priority.png' }}
        badgeCode="priority_badge"
        alt="Priorisierte Auszeichnung"
        size="hero"
        priority
      />,
    )
    const image = screen.getByRole('img', { name: 'Priorisierte Auszeichnung' })
    expect(image.getAttribute('sizes')).not.toContain('auto')
    expect(image.getAttribute('loading')).toBeNull()
  })

  it('renders historical artwork with the shared intrinsic image dimensions', () => {
    const { container } = render(
      <AchievementArtwork
        descriptor={{
          kind: 'direct',
          src: '/member-achievement-badges/special-historical_leader-v1.png',
        }}
        badgeCode="historical_leader"
        alt="Historische Auszeichnung"
        size="hero"
      />,
    )

    const slot = container.querySelector('[data-achievement-slot]')
    const portrait = screen.getByRole('img', { name: 'Historische Auszeichnung' })
    expect(slot?.getAttribute('data-achievement-size')).toBe('hero')
    expect(portrait.getAttribute('src')).toContain('special-historical_leader-v1.png')
    expect(portrait.getAttribute('width')).toBe('1254')
    expect(portrait.getAttribute('height')).toBe('1254')
  })
})

describe('shared achievement card geometry', () => {
  const readCss = (file: string) => readFileSync(path.join(__dirname, file), 'utf8')

  it('declares the hero and stage sizes only in the shared artwork module', () => {
    const shared = readCss('AchievementArtwork.module.css')

    expect(shared).toContain('inline-size: 192px')
    expect(shared).toContain('inline-size: 216px')
    expect(shared).toContain('inline-size: 240px')
    expect(shared).toContain('@container achievement-card (min-width: 562px)')
    expect(shared).toContain('@container achievement-card (min-width: 658px)')
  })

  it('lets the generic badge row yield inline padding instead of squeezing the square hero slot', () => {
    // Regression (Phase 151): a fixed `padding: 24px 12px` left only 190.72px inside the
    // narrowest carousel card (88% of a 320px track), so `max-inline-size: 100%` clamped the
    // 192px hero to a 190.72x192 non-square box for the historical/special badge family.
    const badgeChip = readCss('BadgeChip.module.css')

    expect(badgeChip).toContain('padding-inline: clamp(0px, calc((100% - 192px) / 2), 12px)')
    expect(badgeChip).not.toContain('padding: 24px 12px')
  })
})
