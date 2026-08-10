import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const globalStyles = readSource('src/styles/globals.css')
const fansubStyles = readSource('src/app/fansubs/[slug]/page.module.css')
const projectStyles = readSource('src/app/anime/[id]/group/[groupId]/page.module.css')
const focalCarouselStyles = readSource('src/components/ui/FocalCarousel.module.css')
const releaseStyles = readSource(
  'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css',
)

const basePageRule = (styles: string) => styles.match(/^\.page\s*\{[\s\S]*?^\}/m)?.[0] ?? ''

describe('public page desktop width contract', () => {
  it('defines the shared default and wide-desktop dimensions globally', () => {
    expect(globalStyles).toContain('--content-width-narrow: 820px')
    expect(globalStyles).toContain('--content-width-normal: 1360px')
    expect(globalStyles).toContain('--content-width-wide: 1520px')
    expect(globalStyles).toContain('--content-width-visual: 1660px')
    expect(globalStyles).toContain('--content-width-visual-cap: 1760px')
    expect(globalStyles).toContain('--public-page-max-width: 1360px')
    expect(globalStyles).toContain('--public-page-gutter: 48px')
    expect(globalStyles).toMatch(
      /@media \(min-width: 1600px\)[\s\S]*--public-page-max-width: 1480px;[\s\S]*--public-page-gutter: 64px;/,
    )
  })

  it('keeps the fansub page as the canonical consumer without local desktop literals', () => {
    expect(fansubStyles.match(/var\(--public-page-max-width\)/g)).toHaveLength(4)
    expect(fansubStyles.match(/var\(--public-page-gutter\)/g)).toHaveLength(3)
    expect(fansubStyles).not.toContain('@media (min-width: 1600px)')
  })

  it('contains full-bleed decoration without clipping internal carousel scrolling', () => {
    expect(basePageRule(fansubStyles)).toContain('min-width: 0;')
    expect(basePageRule(fansubStyles)).toContain('max-width: 100%;')
    expect(basePageRule(fansubStyles)).toContain('overflow-x: clip;')
    expect(fansubStyles).toMatch(/\.sectionBand\s*\{[^}]*overflow-x:\s*clip;/s)
    expect(focalCarouselStyles).toMatch(/\.track\s*\{[^}]*overflow-x:\s*auto;/s)
  })

  it('applies the shared width contract to project and release pages', () => {
    expect(projectStyles).toContain('@media (min-width: 769px)')
    expect(projectStyles).toContain(
      'width: min(var(--public-page-max-width), calc(100% - var(--public-page-gutter)))',
    )
    expect(projectStyles).toContain('padding-inline: calc(var(--public-page-gutter) / 2)')
    expect(basePageRule(releaseStyles)).toContain(
      'width: min(100%, var(--public-page-max-width))',
    )
    expect(basePageRule(releaseStyles)).toContain(
      'padding: 24px calc(var(--public-page-gutter) / 2) 64px',
    )

    expect(basePageRule(projectStyles)).not.toContain('max-width: 1200px')
    expect(basePageRule(releaseStyles)).not.toContain('max-width: 1180px')
    expect(projectStyles).toMatch(/@media \(min-width: 769px\)[\s\S]*?\.heroFg\s*\{\s*width: 100%;/)
  })
})
