// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, render, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AchievementBadgeShowcase } from './AchievementBadgeShowcase'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<
    HTMLImageElement,
    ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean
      priority?: boolean
      unoptimized?: boolean
    }
  >(({ alt, fill, priority, unoptimized, ...props }, ref) => {
    void fill
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(cleanup)

const SOURCE_FILES = [
  'contribution_archivist_bronze.png',
  'contribution_archivist_bronze-v2.png',
  'role_entry_translator.png',
  'special-historical_leader-v1.png',
]

const EXPECTED_ROLES = [
  'admin',
  'designer',
  'editor',
  'encoder',
  'karaoke_fx',
  'other',
  'project_lead',
  'quality_checker',
  'raw_provider',
  'timer',
  'translator',
  'typesetter',
]

const EXPECTED_ROLE_TIERS = ['entry', 'bronze', 'silver', 'gold', 'platinum']

const EXPECTED_NON_ROLE_CODES = [
  'contribution_archivist_bronze',
  'contribution_archivist_gold',
  'contribution_archivist_silver',
  'contribution_chronicle_bronze',
  'contribution_chronicle_gold',
  'contribution_chronicle_silver',
  'contribution_projects_bronze',
  'contribution_projects_gold',
  'contribution_projects_silver',
  'first_contribution',
  'founding_member',
  'historical_leader',
  'long_term_member',
  'membership_10_years',
  'membership_7_years',
  'point_milestone_active',
  'point_milestone_engaged',
  'point_milestone_experienced',
  'point_milestone_first',
  'point_milestone_legend',
  'point_milestone_veteran',
  'productive_bronze',
  'productive_gold',
  'productive_silver',
]

const INDEPENDENT_NON_ROLE_CODES = new Set([
  'founding_member',
  'historical_leader',
])

function renderGallery() {
  return render(<AchievementBadgeShowcase sourceFiles={SOURCE_FILES} />)
}

describe('AchievementBadgeShowcase', () => {
  it('renders all 12 role families at all five stages as unique production cards', () => {
    const { container } = renderGallery()
    const roleCases = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-composition-case][data-case-kind="role"]',
      ),
    )

    expect(roleCases).toHaveLength(60)
    expect(new Set(roleCases.map((item) => item.dataset.compositionCase)).size).toBe(60)

    const rolesAndTiers = new Map<string, string[]>()
    for (const wrapper of roleCases) {
      const code = wrapper.dataset.compositionCase ?? ''
      const match = /^role_(?:entry|volume)_(.+?)(?:_(bronze|silver|gold|platinum))?$/.exec(code)
      expect(match).not.toBeNull()
      const roleCode = match?.[1] ?? ''
      const tier = code.startsWith('role_entry_') ? 'entry' : (match?.[2] ?? '')
      rolesAndTiers.set(roleCode, [...(rolesAndTiers.get(roleCode) ?? []), tier])

      expect(wrapper.querySelector('[data-role-card-container]')).not.toBeNull()
      expect(wrapper.querySelector(`[data-role-code="${roleCode}"]`)).not.toBeNull()
      expect(wrapper.querySelector(`[data-achievement-size="hero"][data-badge-code="${code}"]`)).not.toBeNull()
      expect(wrapper.querySelector('[data-achievement-size="stage"]')).not.toBeNull()
      expect(wrapper.querySelector('h3')?.textContent).toBeTruthy()
    }

    expect([...rolesAndTiers.keys()].sort()).toEqual(EXPECTED_ROLES)
    for (const tiers of rolesAndTiers.values()) {
      expect(tiers.sort()).toEqual([...EXPECTED_ROLE_TIERS].sort())
    }
  })

  it('renders every ordinary non-role badge as its current real production family stage', () => {
    const { container } = renderGallery()
    const nonRoleCases = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-composition-case][data-case-kind="non-role"]',
      ),
    )

    expect(nonRoleCases).toHaveLength(24)
    expect(nonRoleCases.map((item) => item.dataset.compositionCase).sort()).toEqual(
      EXPECTED_NON_ROLE_CODES,
    )
    for (const wrapper of nonRoleCases) {
      const code = wrapper.dataset.compositionCase ?? ''
      expect(wrapper.querySelector('h3')?.textContent).toBeTruthy()
      expect(wrapper.querySelector(`[data-achievement-size="hero"][data-badge-code="${code}"]`)).not.toBeNull()
      expect(wrapper.querySelector(`[data-achievement-size="stage"][data-badge-code="${code}"]`)).not.toBeNull()

      if (!INDEPENDENT_NON_ROLE_CODES.has(code)) {
        expect(
          wrapper.querySelector(
            '[data-family][data-anime-project-stage], [data-family][data-points-achievement-stage], [data-family][data-contribution-achievement-stage], [data-family][data-membership-stage]',
          ),
        ).not.toBeNull()
        expect(
          wrapper.querySelector(
            `[data-family] [data-achievement-size="hero"][data-badge-code="${code}"]`,
          ),
        ).not.toBeNull()
      }
    }

    const founding = container.querySelector<HTMLElement>(
      '[data-composition-case="founding_member"]',
    )!
    expect(founding.querySelector('[data-family="membership"][data-membership-stage]')).not.toBeNull()
    expect(founding.querySelector('[data-founding-member]')).not.toBeNull()
    expect(founding.querySelector('[data-artwork-reference="founding_member"]')).not.toBeNull()
    expect(founding.textContent).toContain('Eigenständige Artwork-Geometriereferenz')

    const historical = container.querySelector<HTMLElement>(
      '[data-composition-case="historical_leader"]',
    )!
    expect(historical.querySelector('[data-historical-product-panel] [data-badge-group="special"]')).not.toBeNull()
    expect(historical.querySelector('[data-artwork-reference="historical_leader"]')).not.toBeNull()
    expect(historical.textContent).toContain('Echtes Produktpanel')
    expect(historical.textContent).toContain('Eigenständige Portrait-Geometriereferenz')
  })

  it('publishes gallery readiness only after a client layout effect', () => {
    const serverLayoutWarning = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let serverMarkup = ''
    try {
      serverMarkup = renderToString(<AchievementBadgeShowcase sourceFiles={SOURCE_FILES} />)
    } finally {
      serverLayoutWarning.mockRestore()
    }
    expect(serverMarkup).toContain('data-gallery-ready="false"')
    expect(serverMarkup).not.toContain('data-gallery-ready="true"')

    const { container } = renderGallery()
    expect(
      container.querySelector('[data-achievement-gallery]')?.getAttribute('data-gallery-ready'),
    ).toBe('true')
  })

  it('keeps the supplied raw source inventory deterministic and source-only', () => {
    const { container } = renderGallery()
    const root = container.querySelector<HTMLElement>('[data-achievement-gallery]')
    const sourceCases = Array.from(
      container.querySelectorAll<HTMLElement>('[data-source-case]'),
    )

    expect(root?.dataset.galleryReady).toBe('true')
    expect(root?.dataset.sourceCount).toBe('4')
    expect(sourceCases).toHaveLength(4)
    expect(sourceCases.map((item) => item.dataset.sourceCase)).toEqual(
      [...SOURCE_FILES].sort(),
    )
    for (const sourceCase of sourceCases) {
      expect(sourceCase.querySelector('img')).not.toBeNull()
      expect(sourceCase.textContent).toContain(sourceCase.dataset.sourceCase)
    }
    expect(
      container.querySelector(
        '[data-composition-case="contribution_archivist_bronze.png"]',
      ),
    ).toBeNull()
  })

  it('exposes production family, chain, state, and container probes without duplicate logical cases', () => {
    const { container } = renderGallery()
    const allCompositionCodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-composition-case]'),
      (item) => item.dataset.compositionCase,
    )

    expect(allCompositionCodes).toHaveLength(84)
    expect(new Set(allCompositionCodes).size).toBe(84)
    expect(container.querySelectorAll('[data-family-stage-case]')).toHaveLength(6)
    expect(container.querySelector('[data-chain-case="locked"]')).not.toBeNull()
    expect(container.querySelector('[data-chain-case="preview"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-state-case="active"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-state-case="inactive"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-state-case="expanded"]')).toHaveLength(1)

    const probe = container.querySelector<HTMLElement>('[data-container-probe]')
    expect(probe).not.toBeNull()
    expect(probe?.querySelector('[data-role-card-container]')).not.toBeNull()
    expect(probe?.querySelector('[data-achievement-size="hero"]')).not.toBeNull()
    expect(probe?.querySelector('[data-achievement-size="stage"]')).not.toBeNull()
  })

  it.each([100, 200])(
    'mounts the full %i-item production FocalCarousel stress fixture',
    (count) => {
      const { container } = renderGallery()
      const stressRoot = container.querySelector<HTMLElement>(
        `[data-stress-count="${count}"]`,
      )
      const items = within(stressRoot as HTMLElement).getAllByTestId(
        `stress-item-${count}`,
      )

      expect(items).toHaveLength(count)
      expect(items.map((item) => item.getAttribute('data-stress-item'))).toEqual(
        Array.from({ length: count }, (_, index) => String(index)),
      )
      expect(Number(stressRoot?.dataset.renderCount)).toBeGreaterThanOrEqual(count)
      expect(stressRoot?.querySelector('[data-focal-carousel-items]')).not.toBeNull()
      expect(stressRoot?.querySelector('button[aria-expanded="false"]')).not.toBeNull()
    },
  )
})
