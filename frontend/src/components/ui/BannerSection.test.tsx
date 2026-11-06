// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BannerSection } from './BannerSection'

describe('BannerSection', () => {
  it('rendert die Standardvariante ohne die anime-spezifische Backdrop-Klasse', () => {
    const { container } = render(<BannerSection imageUrl="/covers/demo.jpg" imageAlt="Hintergrundbild" />)
    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop?.className).toMatch(/backdropWrapper/)
    expect(backdrop?.className).not.toMatch(/backdropWrapperAnime/)
  })

  it('stellt mit variant="anime" die bisherige Backdrop-Rezeptur der Anime-Detailseite bereit', () => {
    const { container } = render(<BannerSection variant="anime" imageUrl="/covers/demo.jpg" imageAlt="Hintergrundbild" />)
    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop?.className).toMatch(/backdropWrapperAnime/)
  })

  it('wendet die anime-Klasse ohne imageUrl nicht an (kein Backdrop-Element vorhanden)', () => {
    const { container } = render(<BannerSection variant="anime" imageUrl={null} imageAlt="Hintergrundbild" />)
    expect(container.querySelector('[aria-hidden="true"].backdropWrapper, [aria-hidden="true"][class*="backdropWrapper"]')).toBeNull()
  })

  it('setzt ohne fillHeight-Angabe (Standard false) keine bannerSectionFillHeight-Klasse', () => {
    const { container } = render(<BannerSection imageUrl="/covers/demo.jpg" imageAlt="Hintergrundbild" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).not.toMatch(/bannerSectionFillHeight/)
  })

  it('fillHeight=true setzt die bannerSectionFillHeight-Klasse zusätzlich zur Grundklasse', () => {
    const { container } = render(<BannerSection imageUrl="/covers/demo.jpg" imageAlt="Hintergrundbild" fillHeight />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/bannerSection/)
    expect(root.className).toMatch(/bannerSectionFillHeight/)
  })
})

describe('BannerSection.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/BannerSection.module.css'), 'utf8')

  it('deklariert .backdropWrapperAnime NACH .backdropWrapper, damit die eigene Formel zuverlässig gewinnt', () => {
    const backdropWrapperIndex = css.indexOf('.backdropWrapper {')
    const backdropWrapperAnimeIndex = css.indexOf('.backdropWrapperAnime {')
    expect(backdropWrapperIndex).toBeGreaterThan(-1)
    expect(backdropWrapperAnimeIndex, '.backdropWrapperAnime must exist in the stylesheet').toBeGreaterThan(-1)
    expect(backdropWrapperAnimeIndex, '.backdropWrapperAnime must be declared after .backdropWrapper').toBeGreaterThan(backdropWrapperIndex)
  })

  it('reproduziert die bisherige Anime-Rezeptur ohne brightness/saturate-Abweichung, dafür mit vertikaler Ausblendmaske', () => {
    const rule = css.match(/\.backdropWrapperAnime\s*\{([^}]+)\}/)?.[1]
    expect(rule).toMatch(/blur\(var\(--banner-anime-blur\)\)/)
    expect(rule).not.toMatch(/brightness/)
    expect(rule).not.toMatch(/saturate/)
    expect(rule).toMatch(/scale\(var\(--banner-anime-scale\)\)/)
    expect(rule).toMatch(/mask-image:\s*var\(--banner-anime-mask\)/)
  })

  it('bannerSectionFillHeight ersetzt die feste Hoehe durch inset:0 und steht NACH der mobilen Haltepunkt-Regel, damit sie deren height-Wert zuverlaessig ueberschreibt', () => {
    const fillHeightMatch = css.match(/\.bannerSectionFillHeight\s*\{([^}]+)\}/)
    expect(fillHeightMatch, '.bannerSectionFillHeight muss existieren').toBeTruthy()
    const fillHeightRule = fillHeightMatch![1]
    expect(fillHeightRule).toMatch(/inset:\s*0;/)
    expect(fillHeightRule).toMatch(/height:\s*auto;/)

    const mobileBlockStart = css.indexOf('@media (max-width: 767px)')
    const mobileBlockEnd = css.indexOf('}', css.indexOf('height: var(--banner-height-mobile)', mobileBlockStart)) + 1
    const fillHeightIndex = css.indexOf('.bannerSectionFillHeight')
    expect(mobileBlockStart).toBeGreaterThan(-1)
    expect(fillHeightIndex).toBeGreaterThan(mobileBlockEnd)
  })
})
