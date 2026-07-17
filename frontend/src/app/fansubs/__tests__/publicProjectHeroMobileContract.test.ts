import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const projectStyles = readSource('src/app/anime/[id]/group/[groupId]/page.module.css')
const fansubStyles = readSource('src/app/fansubs/[slug]/page.module.css')

const mobileBlock = (styles: string, breakpoint: string) =>
  styles.slice(styles.indexOf(`@media (max-width: ${breakpoint})`))

const normalizedRule = (styles: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return styles
    .match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`))?.[1]
    .replace(/\s+/g, ' ')
    .trim()
}

describe('public project mobile hero contract', () => {
  it('uses the exact fansub mobile banner scaling rules', () => {
    const projectMobile = mobileBlock(projectStyles, '768px')
    const fansubMobile = mobileBlock(fansubStyles, '767px')

    expect(normalizedRule(projectMobile, '.heroBannerWrap')).toBe(
      normalizedRule(fansubMobile, '.heroBannerWrap'),
    )
    expect(normalizedRule(projectMobile, '.heroBannerImg')).toBe(
      normalizedRule(fansubMobile, '.heroBannerImg'),
    )
  })

  it('keeps the banner identity in normal flow without the former dark overlay', () => {
    const projectMobile = mobileBlock(projectStyles, '768px')
    const bannerIdentity = normalizedRule(
      projectMobile,
      '.heroBannerWrap + .heroBody > .heroInfo',
    )

    expect(bannerIdentity).toContain('position: static')
    expect(bannerIdentity).toContain('background: transparent')
    expect(bannerIdentity).not.toContain('var(--scrim-strong)')
  })
})
