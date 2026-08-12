// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberBadge } from '@/types/profile'
const memberBadgeChainCss = readFileSync('src/components/profile/MemberBadgeChain.module.css', 'utf8')

function expectDisplayImageSource(image: Element | null, expectedSource: string) {
  const src = image?.getAttribute('src')
  expect(src).toBeTruthy()
  const url = new URL(src ?? '', 'http://localhost')
  expect(url.pathname === '/_next/image' ? url.searchParams.get('url') : src).toBe(expectedSource)
}

type MemberBadgeCatalogItem = {
  badge_code: string
  label: string
  badge_category: string
}

type FakePresentation = {
  label: string
  variant: string
  Icon: unknown
  palette: string
  group: string
  roleCode?: string
}

function fakePresentation(overrides: Partial<FakePresentation> & { group: string; roleCode?: string }): FakePresentation {
  return {
    label: 'Fake',
    variant: 'neutral',
    Icon: null,
    palette: 'mint',
    ...overrides,
  }
}

type MemberBadgeGroupRow = { key: string; items: MemberBadgeCatalogItem[] }
type MemberBadgeGroupResult = { key: string; label: string; rows: MemberBadgeGroupRow[] }

async function loadMemberBadgeChain(): Promise<{
  MemberBadgeChain: ComponentType<{
    earnedBadges: PublicMemberBadge[]
    catalog?: MemberBadgeCatalogItem[]
  }>
  buildMemberBadgeGroups: (
    visibleCatalog: MemberBadgeCatalogItem[],
    getPresentation?: (badgeCode: string) => FakePresentation,
  ) => MemberBadgeGroupResult[]
}> {
  try {
    const modulePath = './MemberBadgeChain'
    return await import(/* @vite-ignore */ modulePath)
  } catch (error) {
    throw new Error(`MemberBadgeChain must exist for the Phase 99 public badge chain: ${String(error)}`)
  }
}

afterEach(() => {
  cleanup()
})

const catalog: MemberBadgeCatalogItem[] = [
  { badge_code: 'founder', label: 'Gründungsmitglied', badge_category: 'historical_achievement' },
  { badge_code: 'translator', label: 'Übersetzung', badge_category: 'supporter' },
  { badge_code: 'quality_checker', label: 'Qualitätscheck', badge_category: 'supporter' },
]

const roleProgressCatalog: MemberBadgeCatalogItem[] = [
  { badge_code: 'founding_member', label: 'Gründungsmitglied', badge_category: 'historical_achievement' },
  { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
  { badge_code: 'role_volume_translator_bronze', label: 'Bronze · 12+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_translator_silver', label: 'Silber · 108+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_translator_gold', label: 'Gold · 320+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_translator_platinum', label: 'Platin · 510+', badge_category: 'role_volume' },
  { badge_code: 'role_entry_timer', label: 'Erstes Timing', badge_category: 'role_entry' },
  { badge_code: 'role_volume_timer_bronze', label: 'Bronze · 12+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_timer_silver', label: 'Silber · 108+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_timer_gold', label: 'Gold · 320+', badge_category: 'role_volume' },
  { badge_code: 'role_volume_timer_platinum', label: 'Platin · 510+', badge_category: 'role_volume' },
]

describe('MemberBadgeChain', () => {
  it('renders exact accessible contribution progress without client thresholds', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    render(<MemberBadgeChain earnedBadges={[{ id: 0, badge_code: 'contribution_projects_bronze', badge_category: 'contribution', current_count: 3, current_tier: 'bronze', next_threshold: 5, remaining_count: 2, next_tier: 'silver' }]} />)
    expect(screen.getByText('3 von 5')).not.toBeNull()
    expect(screen.getByText('Noch 2 bis Silber')).not.toBeNull()
    const bar = screen.getByRole('progressbar', { name: 'Fortschritt bis Silber' })
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('5')
  })

  it('renders Gold as the terminal contribution tier', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    render(<MemberBadgeChain earnedBadges={[{ id: 0, badge_code: 'contribution_chronicle_gold', badge_category: 'contribution', current_count: 150, current_tier: 'gold' }]} />)
    expect(screen.getByText('150')).not.toBeNull()
    expect(screen.getByText('Höchste Stufe erreicht')).not.toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
  it('bietet pro Gruppe eine fokussierte Karussell- und Rasteransicht', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    render(<MemberBadgeChain earnedBadges={[]} catalog={catalog} />)

    const carousel = screen.getByRole('region', { name: 'Besondere Auszeichnungen-Karussell' })
    expect(carousel).not.toBeNull()
    expect(screen.getByLabelText('Auszeichnung 1 von 3').getAttribute('aria-current')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Nächste Auszeichnung in Besondere Auszeichnungen' }))
    expect(screen.getByLabelText('Auszeichnung 2 von 3').getAttribute('aria-current')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Alle Auszeichnungen in Besondere Auszeichnungen anzeigen' }))
    expect(screen.getByRole('list', { name: 'Alle Auszeichnungen' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }))
    expect(screen.getByLabelText('Auszeichnung 2 von 3').getAttribute('aria-current')).toBe('true')
  })

  it('renders approved artwork inside the focal card for earned image badges', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'point_milestone_active', badge_category: 'progress' }]}
      />,
    )

    const artwork = container.querySelector<HTMLImageElement>(
      'img[data-achievement-art="point_milestone_active"]',
    )
    expect(artwork).not.toBeNull()
    expect(artwork?.getAttribute('src')).toContain('point_milestone_active-v2.png')
    expect(screen.getByText('50 Punkte')).not.toBeNull()
    expect(artwork?.closest('[aria-label^="Auszeichnung"]')).not.toBeNull()
    expect(screen.getByRole('list', { name: 'Punkte-Meilensteine' })).not.toBeNull()
    expect(screen.getByRole('list', { name: 'Fortschritt' }).textContent).not.toContain('Aktiv dabei')
  })

  it('verwendet für Erste Punkte die neue Oldschool-Medaillenserie', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'point_milestone_first', badge_category: 'progress' }]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="point_milestone_first"]'),
      '/member-achievement-badges/point_milestone_first-v2.png',
    )
  })

  it('composes Erste Mitwirkung from its motif and award frame', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'first_contribution', badge_category: 'contribution' }]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="first_contribution"]'),
      '/member-achievement-badges/progress-frame-first_contribution.png',
    )
    expect(container.querySelectorAll('img[src*="progress-first_contribution-motif.png"]')).toHaveLength(1)
  })

  it('composes the productive tier with its matching rank frame', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'productive_gold', badge_category: 'quantity' }]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="productive_gold"]'),
      '/member-achievement-badges/progress-frame-productive-gold.png',
    )
    expect(container.querySelectorAll('img[src*="progress-productive-motif.png"]')).toHaveLength(1)
  })

  it('renders the generated contribution artwork without a fallback icon', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 0, badge_code: 'contribution_projects_bronze', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_projects_silver', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_projects_gold', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_chronicle_bronze', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_chronicle_silver', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_chronicle_gold', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_archivist_bronze', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_archivist_silver', badge_category: 'contribution' },
          { id: 0, badge_code: 'contribution_archivist_gold', badge_category: 'contribution' },
        ]}
      />,
    )

    expect(
      container
        .querySelector('img[data-achievement-art="contribution_projects_bronze"]')
        ?.getAttribute('src'),
    ).toContain('contribution_projects_bronze-v3.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_projects_silver"]')
        ?.getAttribute('src'),
    ).toContain('contribution_projects_silver-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_projects_gold"]')
        ?.getAttribute('src'),
    ).toContain('contribution_projects_gold-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_chronicle_silver"]')
        ?.getAttribute('src'),
    ).toContain('contribution_chronicle_silver-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_chronicle_gold"]')
        ?.getAttribute('src'),
    ).toContain('contribution_chronicle_gold-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_archivist_silver"]')
        ?.getAttribute('src'),
    ).toContain('contribution_archivist_silver-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_archivist_gold"]')
        ?.getAttribute('src'),
    ).toContain('contribution_archivist_gold-v2.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_chronicle_bronze"]')
        ?.getAttribute('src'),
    ).toContain('contribution_chronicle_bronze-v4.png')
    expect(
      container
        .querySelector('img[data-achievement-art="contribution_archivist_bronze"]')
        ?.getAttribute('src'),
    ).toContain('contribution_archivist_bronze-v2.png')
  })

describe('Phase 125 contribution achievement stages', () => {
  type Progress = { family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }
  const orderedFamilies = ['contribution_projects', 'contribution_chronicle', 'contribution_archivist']

  async function renderContributions(progress: Progress[]) {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const Chain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: Progress[] }>
    return render(<Chain earnedBadges={[]} badgeProgress={progress} />)
  }

  it('renders one ordered three-family outer carousel and three native artwork tiers at zero', async () => {
    const { container } = await renderContributions([
      { family: 'contribution_archivist', current_count: 0, next_threshold: 10, remaining_count: 10, next_tier: 'bronze', complete: false },
      { family: 'contribution_projects', current_count: 0, next_threshold: 1, remaining_count: 1, next_tier: 'bronze', complete: false },
      { family: 'contribution_chronicle', current_count: 0, next_threshold: 10, remaining_count: 10, next_tier: 'bronze', complete: false },
    ])
    const carousel = screen.getByRole('region', { name: 'Beiträge-Karussell' })
    expect(carousel).not.toBeNull()
    const stages = Array.from(container.querySelectorAll<HTMLElement>('[data-contribution-achievement-stage]'))
    expect(stages.map((stage) => stage.dataset.family)).toEqual(orderedFamilies)
    for (const stage of stages) {
      expect(within(stage).getAllByRole('listitem')).toHaveLength(3)
      expect(within(stage).queryByRole('button')).toBeNull()
      expect(stage.querySelector('[aria-current="step"]')).toBeNull()
      expect(stage.querySelectorAll('[tabindex]')).toHaveLength(0)
      expect(stage.textContent).toContain('Gesperrt')
    }
    expect(screen.getByRole('button', { name: 'Alle Auszeichnungen in Beiträge anzeigen' })).not.toBeNull()
  })

  it('keeps tier preview independent from true terminal progress and outer family state', async () => {
    const { container } = await renderContributions([
      { family: 'contribution_projects', current_count: 20, next_threshold: null, remaining_count: null, next_tier: null, complete: true },
      { family: 'contribution_chronicle', current_count: 50, next_threshold: 150, remaining_count: 100, next_tier: 'gold', complete: false },
      { family: 'contribution_archivist', current_count: 10, next_threshold: 50, remaining_count: 40, next_tier: 'silver', complete: false },
    ])
    const stage = container.querySelector<HTMLElement>('[data-family="contribution_projects"][data-contribution-achievement-stage]')!
    const familyCurrent = screen.getByLabelText('Sammlung 1 von 3')
    const progress = within(stage).getByRole('progressbar', { name: /Mitgetragene Projekte/ })
    expect(progress.getAttribute('aria-valuenow')).toBe('15')
    expect(progress.getAttribute('aria-valuemax')).toBe('15')
    expect(within(stage).getByText('20 mitgetragene Projekte')).not.toBeNull()
    expect(within(stage).getByText('Höchste Stufe erreicht')).not.toBeNull()
    fireEvent.click(within(stage).getByRole('button', { name: /Bronze.*auswählen/ }))
    expect(within(stage).getByText('Vorschau')).not.toBeNull()
    expect(within(stage).getByText('20 mitgetragene Projekte')).not.toBeNull()
    expect(progress.getAttribute('aria-valuenow')).toBe('15')
    expect(familyCurrent.getAttribute('aria-current')).toBe('true')
    expect(within(stage).getByRole('button', { name: /Silber.*auswählen/ })).not.toBeNull()
  })

  it('locks artwork, same-DOM, expanded, responsive and no-inner-engine contracts', async () => {
    const { container } = await renderContributions(orderedFamilies.map((family) => ({
      family, current_count: family === 'contribution_projects' ? 5 : 50,
      next_threshold: family === 'contribution_projects' ? 15 : 150,
      remaining_count: family === 'contribution_projects' ? 10 : 100, next_tier: 'gold', complete: false,
    })))
    const stages = Array.from(container.querySelectorAll('[data-contribution-achievement-stage]'))
    const shape = (stage: Element) => Array.from(stage.children).map((node) => node.tagName)
    const before = stages.map(shape)
    fireEvent.click(screen.getByRole('button', { name: 'Alle Auszeichnungen in Beiträge anzeigen' }))
    expect(Array.from(container.querySelectorAll('[data-contribution-achievement-stage]')).map(shape)).toEqual(before)
    expect(container.querySelectorAll('[data-badge-skeleton]')).toHaveLength(0)
    expect(memberBadgeChainCss).toMatch(/\.contributionHeroArtwork\s*\{[^}]*aspect-ratio:\s*1/s)
    expect(memberBadgeChainCss).toMatch(/\.contributionHeroArtwork\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s)
    expect(memberBadgeChainCss).toMatch(/\.contributionTierTrack\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s)
    expect(memberBadgeChainCss).not.toMatch(/\.contributionTierTrack\s*\{[^}]*(scroll-snap|overflow-x)/s)
  })
})

  it('renders the approved membership artwork without a fallback icon', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'founding_member', badge_category: 'historical_achievement' },
          { id: 2, badge_code: 'long_term_member', badge_category: 'membership' },
          { id: 3, badge_code: 'membership_7_years', badge_category: 'membership' },
          { id: 4, badge_code: 'membership_10_years', badge_category: 'membership' },
        ]}
      />,
    )

    expect(
      container.querySelector('img[data-achievement-art="founding_member"]')?.getAttribute('src'),
    ).toContain('membership-founding_member-v4.png')
    expect(
      container.querySelector('img[data-achievement-art="long_term_member"]')?.getAttribute('src'),
    ).toContain('membership-long_term_member-v4.png')
    expect(
      container.querySelector('img[data-achievement-art="membership_7_years"]')?.getAttribute('src'),
    ).toContain('membership-7_years-v4.png')
    expect(
      container.querySelector('img[data-achievement-art="membership_10_years"]')?.getAttribute('src'),
    ).toContain('membership-10_years-v4.png')
  })

  it('renders the compact historical leadership seal', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'historical_leader', badge_category: 'historical_achievement' }]}
      />,
    )

    expect(
      container.querySelector('img[data-achievement-art="historical_leader"]')?.getAttribute('src'),
    ).toContain('special-historical_leader-v1.png')
  })

  it('composes the translator artwork with the matching rank frame', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_translator_gold', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_translator_gold"]'),
      '/member-achievement-badges/rank-frame-translator-gold.png',
    )
    expect(container.querySelectorAll('img[src*="role-translator-motif.png"]')).toHaveLength(1)
    expect(
      container.querySelector('img[data-achievement-art="role_volume_translator_gold"]')?.getAttribute('width'),
    ).toBe('1254')
    expect(container.querySelector('[data-role-volume="true"][data-palette="gold"]')).not.toBeNull()
  })

  it('uses the dedicated silver timing artwork for the silver timing tier', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_timer', badge_category: 'role_entry' },
          { id: 0, badge_code: 'role_volume_timer_silver', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_timer_silver"]'),
      '/member-achievement-badges/role_volume_timer_silver.png',
    )
    expect(container.querySelectorAll('img[src*="role-timer-motif.png"]')).toHaveLength(0)
  })

  it('composes encoding with the matching layered rank artwork', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_encoder', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_encoder_bronze', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_encoder_bronze"]'),
      '/member-achievement-badges/rank-frame-encoder-bronze.png',
    )
    expect(container.querySelectorAll('img[src*="role-encoder-motif.png"]')).toHaveLength(1)
  })

  it('composes typesetting with the matching layered rank artwork', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_typesetter', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_typesetter_bronze', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_typesetter_bronze"]'),
      '/member-achievement-badges/rank-frame-typesetter-bronze.png',
    )
    expect(container.querySelectorAll('img[src*="role-typesetter-motif.png"]')).toHaveLength(1)
  })

  it('composes quality checking with the matching layered rank artwork', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_quality_checker', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_quality_checker_bronze', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_quality_checker_bronze"]'),
      '/member-achievement-badges/rank-frame-quality_checker-bronze.png',
    )
    expect(container.querySelectorAll('img[src*="role-quality_checker-motif.png"]')).toHaveLength(1)
  })

  it('composes project leadership with the matching layered rank artwork', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_project_lead', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_project_lead_bronze', badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector('img[data-achievement-art="role_volume_project_lead_bronze"]'),
      '/member-achievement-badges/rank-frame-project_lead-bronze.png',
    )
    expect(container.querySelectorAll('img[src*="role-project_lead-motif.png"]')).toHaveLength(1)
  })

  it.each([
    ['editor', 'role_entry_editor'],
    ['raw_provider', 'role_entry_raw_provider'],
    ['designer', 'role_entry_designer'],
    ['admin', 'role_entry_admin'],
    ['other', 'role_entry_other'],
  ])('composes %s with the matching layered rank artwork', async (roleCode, entryCode) => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const volumeCode = `role_volume_${roleCode}_bronze`
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: entryCode, badge_category: 'role_entry' },
          { id: 2, badge_code: volumeCode, badge_category: 'role_volume' },
        ]}
      />,
    )

    expectDisplayImageSource(
      container.querySelector(`img[data-achievement-art="${volumeCode}"]`),
      `/member-achievement-badges/rank-frame-${roleCode}-bronze.png`,
    )
    expect(container.querySelectorAll(`img[src*="role-${roleCode}-motif.png"]`)).toHaveLength(1)
  })

  it('labels the catch-all role as Andere instead of exposing the raw role code', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'role_entry_other', badge_category: 'role_entry' }]}
      />,
    )

    expect(screen.getByText('Andere:')).not.toBeNull()
    expect(screen.queryByText('other:')).toBeNull()
  })

  it('renders a horizontal earned-and-locked badge chain with progress copy', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'founder', badge_category: 'historical_achievement' }]}
        catalog={catalog}
      />,
    )

    expect(screen.getByText('1 von 3')).not.toBeNull()
    expect(screen.getByText('Gründungsmitglied')).not.toBeNull()
    expect(screen.getByText('Übersetzung')).not.toBeNull()
    expect(screen.getByLabelText('Übersetzung gesperrt')).not.toBeNull()
    expect(container.querySelector('[data-orientation="horizontal"]')).not.toBeNull()
  })

  it('does not invent badge tier labels when the catalog has no tier or level field', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'founder', badge_category: 'historical_achievement' }]}
        catalog={catalog}
      />,
    )

    // All three local fixture badge_codes ('founder', 'translator', 'quality_checker') miss the
    // real MEMBER_BADGE_PRESENTATIONS keys and therefore all land in the fallback 'special' group
    // (Besondere Auszeichnungen) after the D-04 grouping refactor.
    const chain = screen.getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(chain).queryByText(/Bronze|Silber|Gold/i)).toBeNull()
  })

  it('excludes role badges from the general progress numerator and denominator (D-01)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'founding_member', badge_category: 'historical_achievement' },
          { id: 2, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 3, badge_code: 'role_volume_translator_bronze', badge_category: 'role_volume' },
        ]}
        catalog={roleProgressCatalog}
      />,
    )

    expect(screen.getByLabelText('1 von 1 Auszeichnungen freigeschaltet')).not.toBeNull()
    expect(screen.getByText('1 von 1 Auszeichnungen freigeschaltet')).not.toBeNull()
  })

  it('hides a foreign catalog role completely while retaining all five stages of an earned role (D-02/D-03)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_volume_translator_bronze', badge_category: 'role_volume' },
        ]}
        catalog={roleProgressCatalog}
      />,
    )

    const rolesList = screen.getByRole('list', { name: 'Fansubrollen' })
    expect(within(rolesList).getByText('Übersetzung:')).not.toBeNull()
    expect(within(rolesList).getByText('Erste Übersetzung')).not.toBeNull()
    expect(within(rolesList).getAllByText('Bronze', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(within(rolesList).getByLabelText('Silber · 108+ gesperrt')).not.toBeNull()
    expect(within(rolesList).getByLabelText('Gold · 320+ gesperrt')).not.toBeNull()
    expect(within(rolesList).getByLabelText('Platin · 510+ gesperrt')).not.toBeNull()
    expect(within(rolesList).queryByText('Timing:')).toBeNull()
    expect(within(rolesList).queryByText('Erstes Timing')).toBeNull()
    expect(within(rolesList).queryByLabelText('Erstes Timing gesperrt')).toBeNull()
    expect(document.querySelector('[data-role-code="timer"]')).toBeNull()
  })

  it('renders a role-entry badge in earned state the moment it is in earnedBadges (D-03)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const roleEntryCatalog: MemberBadgeCatalogItem[] = [
      ...catalog,
      { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
    ]

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 0, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]}
        catalog={roleEntryCatalog}
      />,
    )

    expect(screen.queryByLabelText('Erste Übersetzung gesperrt')).toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
  })

  it('uses the exact singular and plural copy for earned Fansubrollen (D-04)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    const { rerender } = render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]}
        catalog={roleProgressCatalog}
      />,
    )
    expect(screen.getByText('1 ausgeübte Fansubrolle')).not.toBeNull()

    rerender(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_entry_timer', badge_category: 'role_entry' },
        ]}
        catalog={roleProgressCatalog}
      />,
    )
    expect(screen.getByText('2 ausgeübte Fansubrollen')).not.toBeNull()
  })
})

describe('PUBLIC_MEMBER_BADGE_CATALOG role-entry entries (D-03)', () => {
  it('contains all 11 locked role_entry_* codes with correct German labels (CR-01 112-REVIEW: full anime_contribution role_definitions coverage)', async () => {
    const { PUBLIC_MEMBER_BADGE_CATALOG, MEMBER_BADGE_PRESENTATIONS } = await import('./memberBadgeLabels')

    const expected: Record<string, string> = {
      role_entry_translator: 'Erste Übersetzung',
      role_entry_timer: 'Erstes Timing',
      role_entry_encoder: 'Erster Encode',
      role_entry_typesetter: 'Erstes Typesetting',
      role_entry_quality_checker: 'Erste Qualitätsprüfung',
      role_entry_project_lead: 'Erste Dokumentation als Projektleitung',
      role_entry_editor: 'Erstes Editing',
      role_entry_raw_provider: 'Erste Raw-Bereitstellung',
      role_entry_designer: 'Erstes Design',
      role_entry_admin: 'Erste Administration',
      role_entry_other: 'Erste sonstige Mitwirkung',
    }

    for (const [badgeCode, label] of Object.entries(expected)) {
      const catalogEntry = PUBLIC_MEMBER_BADGE_CATALOG.find((item) => item.badge_code === badgeCode)
      expect(catalogEntry).not.toBeUndefined()
      expect(catalogEntry?.label).toBe(label)
      expect(catalogEntry?.badge_category).toBe('role_entry')

      const presentation = MEMBER_BADGE_PRESENTATIONS[badgeCode]
      expect(presentation).not.toBeUndefined()
      expect(presentation.label).toBe(label)
      expect(presentation.variant).toBe('info')
      expect(presentation.palette).toBe('indigo')
    }
  })
})

describe('MemberBadgeChain roleLabel prefix (Phase 112 Plan 03, D-04)', () => {
  it('renders the German role-name prefix before a merged Typ-1 + Typ-3 roles row', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 0, badge_code: 'role_volume_translator_gold', badge_category: 'role_volume' },
        ]}
      />,
    )

    expect(screen.getByText('Übersetzung:')).not.toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
    expect(screen.getAllByText('Gold', { exact: true }).length).toBeGreaterThanOrEqual(1)
  })

  it('renders the role-name prefix for a roles row with only the Typ-1 chip (under threshold, no volume merge)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[{ id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]}
      />,
    )

    expect(screen.getByText('Übersetzung:')).not.toBeNull()
    expect(screen.getByText('Erste Übersetzung')).not.toBeNull()
    expect(screen.queryByText(/Gold ·/)).toBeNull()
  })

  it('renders the role-name prefix uniformly on every earned roles-group row', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(
      <MemberBadgeChain
        earnedBadges={[
          { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' },
          { id: 2, badge_code: 'role_entry_timer', badge_category: 'role_entry' },
        ]}
        catalog={roleProgressCatalog}
      />,
    )

    const rolesList = screen.getByRole('list', { name: 'Fansubrollen' })
    const rows = rolesList.querySelectorAll(':scope > [data-focal-item]')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.textContent).toMatch(/^[^:]+:/)
    }
  })

  it('does not render a role-name prefix for non-roles groups (Fortschritt)', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    render(<MemberBadgeChain earnedBadges={[]} />)

    const progressList = screen.getByRole('list', { name: 'Fortschritt' })
    expect(progressList.textContent).not.toMatch(/:/)
  })
})

describe('buildMemberBadgeGroups (D-04)', () => {
  it('returns groups in the fixed roles/progress/points/membership/special order when all groups are populated', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'a', label: 'A', badge_category: 'x' },
      { badge_code: 'b', label: 'B', badge_category: 'x' },
      { badge_code: 'c', label: 'C', badge_category: 'x' },
      { badge_code: 'd', label: 'D', badge_category: 'x' },
      { badge_code: 'e', label: 'E', badge_category: 'x' },
    ]
    const groupByCode: Record<string, string> = { a: 'roles', b: 'progress', c: 'points', d: 'membership', e: 'special' }
    const getPresentation = (badgeCode: string) => fakePresentation({ group: groupByCode[badgeCode] })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    expect(groups.map((group) => group.key)).toEqual(['roles', 'progress', 'points', 'membership', 'special'])
  })

  it('trennt Punkte-Meilensteine vom Projektfortschritt', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const { getMemberBadgePresentation } = await import('./memberBadgeLabels')
    const catalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'productive_gold', label: 'Projekt-Veteranenstatus · Gold', badge_category: 'quantity' },
      { badge_code: 'point_milestone_engaged', label: 'Stark engagiert', badge_category: 'progress' },
    ]

    const groups = buildMemberBadgeGroups(
      catalog,
      getMemberBadgePresentation as unknown as (badgeCode: string) => FakePresentation,
    )

    expect(groups.find((group) => group.key === 'progress')?.rows[0]?.key).toBe('productive_gold')
    expect(groups.find((group) => group.key === 'points')?.rows[0]?.key).toBe('point_milestone_engaged')
    expect(groups.find((group) => group.key === 'points')?.label).toBe('Punkte-Meilensteine')
  })

  it('hides groups with zero visible badges entirely instead of returning them empty', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'a', label: 'A', badge_category: 'x' },
      { badge_code: 'b', label: 'B', badge_category: 'x' },
    ]
    const groupByCode: Record<string, string> = { a: 'membership', b: 'roles' }
    const getPresentation = (badgeCode: string) => fakePresentation({ group: groupByCode[badgeCode] })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    expect(groups.map((group) => group.key)).toEqual(['roles', 'membership'])
    expect(groups.find((group) => group.key === 'progress')).toBeUndefined()
    expect(groups.find((group) => group.key === 'special')).toBeUndefined()
  })

  it('bildet aus earned-only Contribution-Badges genau eine Zeile pro Familie', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const { getMemberBadgePresentation } = await import('./memberBadgeLabels')
    const earnedContributionCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'contribution_projects_gold', label: 'Mitgetragene Projekte · Gold', badge_category: 'contribution' },
      { badge_code: 'contribution_chronicle_silver', label: 'Chronikpflege · Silber', badge_category: 'contribution' },
      { badge_code: 'contribution_archivist_bronze', label: 'Bildarchivpflege · Bronze', badge_category: 'contribution' },
    ]

    const groups = buildMemberBadgeGroups(
      earnedContributionCatalog,
      getMemberBadgePresentation as unknown as (badgeCode: string) => FakePresentation,
    )
    const contributions = groups.find((group) => group.key === 'contributions')

    expect(contributions?.label).toBe('Beiträge')
    expect(contributions?.rows).toHaveLength(3)
    expect(contributions?.rows.map((row) => row.items.map((item) => item.badge_code))).toEqual([
      ['contribution_projects_gold'],
      ['contribution_chronicle_silver'],
      ['contribution_archivist_bronze'],
    ])
  })

  it('blendet Beiträge ohne earned Contribution-Badges vollständig aus', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()

    const groups = buildMemberBadgeGroups([], () => fakePresentation({ group: 'contributions' }))

    expect(groups.find((group) => group.key === 'contributions')).toBeUndefined()
  })

  it('merges two synthetic same-roleCode badges into a single Rollen row (Phase 112 compatibility)', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const groupCatalog: MemberBadgeCatalogItem[] = [
      { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
      { badge_code: 'role_volume_translator', label: 'Übersetzungs-Volumen', badge_category: 'role_volume' },
    ]
    const getPresentation = () => fakePresentation({ group: 'roles', roleCode: 'translator' })

    const groups = buildMemberBadgeGroups(groupCatalog, getPresentation)

    const rolesGroup = groups.find((group) => group.key === 'roles')
    expect(rolesGroup).not.toBeUndefined()
    expect(rolesGroup?.rows).toHaveLength(1)
    expect(rolesGroup?.rows[0]?.items.map((item) => item.badge_code)).toEqual([
      'role_entry_translator',
      'role_volume_translator',
    ])
  })

  it('sorts every real catalog badge into the correct group using the real presentation map', async () => {
    const { buildMemberBadgeGroups } = await loadMemberBadgeChain()
    const { PUBLIC_MEMBER_BADGE_CATALOG, getMemberBadgePresentation } = await import('./memberBadgeLabels')

    const groups = buildMemberBadgeGroups(
      PUBLIC_MEMBER_BADGE_CATALOG,
      getMemberBadgePresentation as unknown as (badgeCode: string) => FakePresentation,
    )
    const byKey = Object.fromEntries(groups.map((group) => [group.key, group]))

    const codesInGroup = (key: string) =>
      (byKey[key]?.rows ?? []).flatMap((row) => row.items.map((item) => item.badge_code))

    expect(codesInGroup('membership')).toEqual(
      expect.arrayContaining(['founding_member', 'long_term_member']),
    )
    expect(codesInGroup('special')).toEqual(
      expect.arrayContaining(['historical_leader', 'all_rounder', 'verified']),
    )
    expect(codesInGroup('progress')).toEqual(
      expect.arrayContaining([
        'first_contribution',
        'productive_bronze',
        'productive_silver',
        'productive_gold',
      ]),
    )
    expect(codesInGroup('points')).toEqual([])

    const roleCodes = [
      'role_entry_translator',
      'role_entry_timer',
      'role_entry_encoder',
      'role_entry_typesetter',
      'role_entry_quality_checker',
      'role_entry_project_lead',
      'role_entry_editor',
      'role_entry_raw_provider',
      'role_entry_designer',
      'role_entry_admin',
      'role_entry_other',
    ]
    expect(codesInGroup('roles')).toEqual(expect.arrayContaining(roleCodes))
    const rolesGroup = byKey.roles
    expect(rolesGroup?.rows).toHaveLength(roleCodes.length)
    for (const row of rolesGroup?.rows ?? []) {
      expect(row.items).toHaveLength(1)
    }
  })
})
describe('MemberBadgeChain Phase 118 role cards', () => {
  it('keeps approved role-art geometry for desktop, tablet, mobile and special roles', () => {
    expect(memberBadgeChainCss).toContain('width: 320px;')
    expect(memberBadgeChainCss).toContain('width: 280px;')
    expect(memberBadgeChainCss).toContain('width: 248px;')
    expect(memberBadgeChainCss).toContain('.roleArtworkBackdrop {\n  inset: 12%;')
    expect(memberBadgeChainCss).toContain('clip-path: circle(34% at 50% 50%);')
  })

  it('keeps all five mobile medals and progress copy inside the role card', () => {
    expect(memberBadgeChainCss).toMatch(/@media \(max-width: 520px\)[\s\S]*\.roleBadgeRow\s*\{[^}]*padding:\s*20px 10px;/)
    expect(memberBadgeChainCss).toMatch(/@media \(max-width: 520px\)[\s\S]*\.roleProgression\s*\{[^}]*gap:\s*4px;/)
    expect(memberBadgeChainCss).toMatch(/\.roleBadgeRow\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*box-sizing:\s*border-box;[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s)
    expect(memberBadgeChainCss).toMatch(/\.roleBadgeRow > \*\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.roleProgressCopy\s*\{[^}]*white-space:\s*normal;/s)
  })

  it('matches the narrow carousel skeleton to one full card and a separate controls row', () => {
    expect(memberBadgeChainCss).toMatch(/\.carouselShell\s*\{[^}]*container:\s*member-badge-carousel \/ inline-size;/s)
    expect(memberBadgeChainCss).toContain('@container member-badge-carousel (max-width: 480px)')
    expect(memberBadgeChainCss).toMatch(/\.carouselSkeleton\s*\{[^}]*grid-template-rows:\s*minmax\(280px, auto\) 36px;/s)
    expect(memberBadgeChainCss).toMatch(/\.skeletonCard\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*1;[^}]*width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.skeletonControl:first-child\s*\{[^}]*grid-column:\s*1;/s)
    expect(memberBadgeChainCss).toMatch(/\.skeletonControl:last-child\s*\{[^}]*grid-column:\s*3;/s)
  })

  const roleBadge = (role: 'translator' | 'timer', count: number): PublicMemberBadge => ({
    id: count + 1,
    badge_code: count >= 510 ? `role_volume_${role}_platinum`
      : count >= 320 ? `role_volume_${role}_gold`
        : count >= 108 ? `role_volume_${role}_silver`
          : count >= 12 ? `role_volume_${role}_bronze` : `role_entry_${role}`,
    badge_category: count >= 12 ? 'role_volume' : 'role_entry',
    current_count: count,
  })

  it('renders exact earned-role cards through one carousel station', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain earnedBadges={[roleBadge('translator', 108), roleBadge('timer', 12)]} catalog={roleProgressCatalog} />,
    )
    expect(screen.getByText('Rollenfortschritt')).not.toBeNull()
    expect(screen.getByText('108 / 320')).not.toBeNull()
    expect(screen.getByText('Noch 212 Mitwirkungen bis Gold')).not.toBeNull()
    expect(screen.getAllByText('Silber', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1 von 2 Rollen')).not.toBeNull()
    expect(screen.getAllByRole('region', { name: 'Rollenfortschritt-Karussell' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Vorherige Rolle' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Nächste Rolle' })).not.toBeNull()
    expect(container.querySelectorAll('[data-role-stage]')).toHaveLength(10)
    expect(container.querySelectorAll('[data-role-stage] img')).toHaveLength(0)
    expect(container.querySelectorAll('[data-role-stage][tabindex]')).toHaveLength(0)
    expect(screen.getAllByText('Aktuell')).toHaveLength(2)
    expect(memberBadgeChainCss).toMatch(/\.roleProgression \.currentChip\s*\{[^}]*position:\s*static;[^}]*white-space:\s*nowrap;[^}]*font-size:\s*0\.58rem;/s)
    expect(screen.getAllByText('Gesperrt').length).toBeGreaterThan(0)
  })

  it('hides zero and foreign roles and reverses rank state on rerender', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { rerender } = render(
      <MemberBadgeChain earnedBadges={[roleBadge('translator', 510), { ...roleBadge('timer', 0), badge_code: 'role_volume_foreign_gold' }]} catalog={roleProgressCatalog} />,
    )
    expect(screen.getByText('510 Mitwirkungen')).not.toBeNull()
    expect(screen.getByText('Höchste Stufe erreicht')).not.toBeNull()
    expect(screen.queryByText('Timing')).toBeNull()
    rerender(<MemberBadgeChain earnedBadges={[roleBadge('translator', 11)]} catalog={roleProgressCatalog} />)
    expect(screen.getAllByText('Einstieg', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('11 / 12')).not.toBeNull()
    expect(screen.getByText('Noch 1 Mitwirkungen bis Bronze')).not.toBeNull()
    rerender(<MemberBadgeChain earnedBadges={[]} catalog={roleProgressCatalog} />)
    expect(screen.queryByText('Rollenfortschritt')).toBeNull()
  })

  it('keeps a full Platinum progressbar while preserving the true visible count', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    render(<MemberBadgeChain earnedBadges={[roleBadge('translator', 777)]} catalog={roleProgressCatalog} />)
    const progress = screen.getByRole('progressbar', { name: 'Fortschritt für Übersetzung' })
    expect(progress.getAttribute('aria-valuenow')).toBe('510')
    expect(progress.getAttribute('aria-valuemax')).toBe('510')
    expect(screen.getByText('777 Mitwirkungen')).not.toBeNull()
    expect(screen.getByText('Höchste Stufe erreicht')).not.toBeNull()
  })
})

describe('MemberBadgeChain Phase 119 collection cards', () => {
  const badgeProgress = [
    { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false },
    { family: 'points', current_count: 50, next_threshold: 200, remaining_count: 150, next_tier: '200 Punkte', complete: false },
    { family: 'contribution_projects', current_count: 1, next_threshold: 5, remaining_count: 4, next_tier: 'Silber', complete: false },
    { family: 'contribution_chronicle', current_count: 5, next_threshold: 25, remaining_count: 20, next_tier: 'Silber', complete: false },
    { family: 'contribution_archivist', current_count: 25, next_threshold: null, remaining_count: null, next_tier: null, complete: true },
    { family: 'membership', current_count: 7, next_threshold: 10, remaining_count: 3, next_tier: '10 Jahre', complete: false },
  ]

  async function renderCollections(earnedBadges: PublicMemberBadge[] = []) {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const CollectionChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof badgeProgress }>
    return render(<CollectionChain earnedBadges={earnedBadges} badgeProgress={badgeProgress} />)
  }

  it('renders independent family cards with authoritative progressbar values and exact copy', async () => {
    const { container } = await renderCollections([
      { id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' },
      { id: 2, badge_code: 'point_milestone_active', badge_category: 'progress' },
    ])
    const projects = screen.getByRole('progressbar', { name: 'Fortschritt für Anime-Projekte' })
    expect(projects.getAttribute('aria-valuemin')).toBe('0')
    expect(projects.getAttribute('aria-valuenow')).toBe('10')
    expect(projects.getAttribute('aria-valuemax')).toBe('25')
    expect(screen.getByText('10 von 25 Anime-Projekten · Noch 15 bis 25 Projekte')).not.toBeNull()
    expect(screen.getByText('1 mitgetragenes Projekt · Noch 4 bis Silber')).not.toBeNull()
    expect(screen.getByText('25 Bildarchivbeiträge · Höchste Stufe erreicht')).not.toBeNull()
    const heroFrame = container.querySelector<HTMLImageElement>('img[data-achievement-art="productive_bronze"]')
    expect(heroFrame?.parentElement?.className).toContain('badgeArtworkLayered')
    const projectCard = container.querySelector('[data-family="progress"]')
    expect(projectCard?.querySelectorAll('img[src*="progress-productive-motif.png"]')).toHaveLength(2)
  })

  it('keeps current, selected and locked stages semantically distinct', async () => {
    await renderCollections([{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }])
    const older = screen.getByRole('button', { name: 'Erste Mitwirkung auswählen' })
    fireEvent.keyDown(older, { key: 'Enter' })
    expect(screen.getByText('Vorschau')).not.toBeNull()
    expect(screen.getAllByText('Aktuell').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('25 Anime-Projekte · Gesperrt').getAttribute('tabindex')).toBeNull()
  })

  it('resets temporary selection when family metrics change', async () => {
    const rendered = await renderCollections([{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }])
    fireEvent.keyDown(screen.getByRole('button', { name: 'Erste Mitwirkung auswählen' }), { key: ' ' })
    expect(screen.getByText('Vorschau')).not.toBeNull()
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const CollectionChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof badgeProgress }>
    rendered.rerender(<CollectionChain earnedBadges={[{ id: 1, badge_code: 'productive_silver', badge_category: 'quantity' }]} badgeProgress={badgeProgress.map((item) => item.family === 'progress' ? { ...item, current_count: 25, next_threshold: 50, remaining_count: 25, next_tier: '50 Projekte' } : item)} />)
    expect(screen.queryByText('Vorschau')).toBeNull()
    expect(screen.getAllByText('Aktuell').length).toBeGreaterThan(0)
  })

  it('keeps category order, a non-founder founding stage locked and the next year target reachable', async () => {
    await renderCollections()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Fortschritt', 'Punkte-Meilensteine', 'Beiträge', 'Mitgliedschaft'])
    expect(screen.getByLabelText('Gründungsmitglied · Gesperrt')).not.toBeNull()
    expect(screen.getByRole('button', { name: /7\+ Jahre Mitglied auswählen, Aktuell/ })).not.toBeNull()
    expect(screen.getByLabelText('10+ Jahre Mitglied · Gesperrt')).not.toBeNull()
  })

  it('Phase 127 RED chain suppresses legacy Special while preserving five retained groups', async () => {
    const { container } = await renderCollections([
      { id: 9, badge_code: 'historical_leader', badge_category: 'historical_achievement' },
      { id: 10, badge_code: 'all_rounder', badge_category: 'historical_achievement' },
      { id: 11, badge_code: 'productive_bronze', badge_category: 'quantity' },
      { id: 12, badge_code: 'point_milestone_active', badge_category: 'progress' },
      { id: 13, badge_code: 'contribution_projects_bronze', badge_category: 'contribution' },
      { id: 14, badge_code: 'contribution_chronicle_bronze', badge_category: 'contribution' },
      { id: 15, badge_code: 'contribution_archivist_bronze', badge_category: 'contribution' },
      { id: 16, badge_code: 'founding_member', badge_category: 'historical_achievement' },
    ])
    expect(container.querySelector('[data-badge-group="special"]')).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: 'Besondere Auszeichnungen' })).toBeNull()
    expect(container.querySelector('[data-special-award]')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Besondere Auszeichnungen-Karussell' })).toBeNull()
    expect(container.querySelector('[data-anime-project-stage]')).not.toBeNull()
    expect(container.querySelector('[data-points-achievement-stage]')).not.toBeNull()
    expect(container.querySelector('[data-contribution-family-stage="contribution_projects"]')).not.toBeNull()
    expect(container.querySelector('[data-contribution-family-stage="contribution_chronicle"]')).not.toBeNull()
    expect(container.querySelector('[data-contribution-family-stage="contribution_archivist"]')).not.toBeNull()
    expect(container.querySelector('[data-membership-stage]')).not.toBeNull()
  })
})

describe('MemberBadgeChain Phase 119 inner stage strip', () => {
  it('keeps a visible, touch-friendly horizontal scroll affordance without page overflow', () => {
    expect(memberBadgeChainCss).toContain('@media (max-width: 820px)')
    expect(memberBadgeChainCss).toContain('padding-inline: calc(50% - 52px)')
    expect(memberBadgeChainCss).toContain('scroll-snap-type: x proximity')
    expect(memberBadgeChainCss).toContain('scrollbar-width: thin')
    expect(memberBadgeChainCss).not.toContain('scrollbar-width: none')
    expect(memberBadgeChainCss).toContain('.familyStages::-webkit-scrollbar')
    expect(memberBadgeChainCss).toMatch(/\.familyStages::\-webkit-scrollbar\s*\{[^}]*height:\s*8px;/s)
    expect(memberBadgeChainCss).toContain('touch-action: pan-x pan-y')
    expect(memberBadgeChainCss).toContain('flex: 0 0 104px')
    expect(memberBadgeChainCss).toMatch(/\.section,\s*\.chainCard,\s*\.groupList,\s*\.group\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.familyCard\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*box-sizing:\s*border-box;[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s)
    expect(memberBadgeChainCss).toMatch(/\.familyCard > \*\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
  })

  it('maps a mouse wheel to the inner horizontal strip without scrolling an ancestor', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const CollectionChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }> }>
    render(<CollectionChain earnedBadges={[{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }]} badgeProgress={[{ family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false }]} />)
    const strip = screen.getByRole('list', { name: 'Stufen für Anime-Projekte' }) as HTMLElement
    Object.defineProperties(strip, { clientWidth: { configurable: true, value: 200 }, scrollWidth: { configurable: true, value: 600 }, scrollLeft: { configurable: true, writable: true, value: 20 } })
    const wheelEvent = new WheelEvent('wheel', { deltaX: 0, deltaY: 80, bubbles: true, cancelable: true })
    strip.dispatchEvent(wheelEvent)
    expect(wheelEvent.defaultPrevented).toBe(true)
    expect(strip.scrollLeft).toBe(100)
  })
    const scrollIntoView = vi.fn()

  it('centers the current stage through its own strip and never scrolls an ancestor', async () => {
    const scrollTo = vi.fn()
    const disconnect = vi.fn()
    let resizeCallback: ResizeObserverCallback | null = null
    let breakpointCallback: (() => void) | null = null
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo })

    try {
      vi.stubGlobal('ResizeObserver', class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback
        }
        observe() {}
        disconnect() { disconnect() }
      })
      vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
        matches: false,
        addEventListener: (_event: string, callback: () => void) => {
          if (query === '(max-width: 820px)') breakpointCallback = callback
        },
        removeEventListener: vi.fn(),
      })))
      const { MemberBadgeChain } = await loadMemberBadgeChain()
      const CollectionChain = MemberBadgeChain as ComponentType<{
        earnedBadges: PublicMemberBadge[]
        badgeProgress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }>
      }>
      const rendered = render(<CollectionChain earnedBadges={[{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }]} badgeProgress={[{ family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false }]} />)
      const current = screen.getByRole('button', { name: /10 Anime-Projekte auswählen, Aktuell/ })
      const strip = current.closest('[data-badge-stage-strip]') as HTMLElement
      Object.defineProperties(strip, {
        clientWidth: { configurable: true, value: 200 },
        scrollWidth: { configurable: true, value: 600 },
        scrollLeft: { configurable: true, writable: true, value: 20 },
      })
      vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 200 } as DOMRect)
      vi.spyOn(current, 'getBoundingClientRect').mockReturnValue({ left: 260, width: 100 } as DOMRect)
      scrollTo.mockClear()

      act(() => resizeCallback?.([], {} as ResizeObserver))

      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(scrollTo).toHaveBeenCalledWith({ left: 210, behavior: 'smooth' })
      expect(scrollTo.mock.instances.every((element) => element instanceof HTMLElement && element.hasAttribute('data-badge-stage-strip'))).toBe(true)

      scrollTo.mockClear()
      act(() => breakpointCallback?.())
      expect(scrollTo).toHaveBeenCalledWith({ left: 210, behavior: 'smooth' })

      rendered.unmount()
      expect(disconnect).toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = original
      delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo
      vi.unstubAllGlobals()
    }
  })

  it('exposes every earned and locked stage as a semantic list item', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const CollectionChain = MemberBadgeChain as ComponentType<{
      earnedBadges: PublicMemberBadge[]
      badgeProgress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }>
    }>
    render(<CollectionChain earnedBadges={[{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }]} badgeProgress={[{ family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false }]} />)
    const progressHeading = screen.getByRole('heading', { level: 2, name: 'Fortschritt' })
    const progressGroup = progressHeading.closest('[data-badge-group="progress"]') as HTMLElement
    const stageList = within(progressGroup).getByRole('list', { name: /Stufen für Anime-Projekte/ })

    expect(within(stageList).getAllByRole('listitem')).toHaveLength(4)
    expect(within(stageList).getByRole('button', { name: /10 Anime-Projekte auswählen, Aktuell/ })).not.toBeNull()
    expect(within(stageList).getByLabelText('25 Anime-Projekte · Gesperrt')).not.toBeNull()
  })

  it('reserves fixed collection hero geometry at tablet and smartphone widths', () => {
    expect(memberBadgeChainCss).toMatch(/@media \(max-width: 520px\)[\s\S]*?\.familyHero\s*\{[\s\S]*?width: 248px/)
    expect(memberBadgeChainCss).toMatch(/@media \(max-width: 1099px\)[\s\S]*?\.familyHero\s*\{[\s\S]*?width: 280px/)
  })
})

it('routes compact and active badge art through responsive optimized sizes', async () => {
  const { MemberBadgeChain } = await loadMemberBadgeChain()
  const CollectionChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }> }>
  const { container } = render(
    <CollectionChain
      earnedBadges={[
        { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry', current_count: 12 },
        { id: 2, badge_code: 'productive_bronze', badge_category: 'quantity' },
      ]}
      badgeProgress={[{ family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false }]}
    />,
  )

  const compactImages = Array.from(container.querySelectorAll<HTMLImageElement>('[data-badge-stage-strip] img, [data-role-stage] img'))
  expect(compactImages.length).toBeGreaterThan(0)
  expect(compactImages.every((image) => image.getAttribute('sizes') === '(max-width: 520px) 72px, 96px')).toBe(true)
  const activeImages = Array.from(container.querySelectorAll<HTMLImageElement>('[data-achievement-art]'))
  expect(activeImages.length).toBeGreaterThan(0)
  expect(activeImages.every((image) => image.getAttribute('sizes') === '(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px')).toBe(true)
  expect(container.querySelectorAll('[data-badge-skeleton][aria-hidden="true"]')).toHaveLength(2)
})

it('Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant', async () => {
    const resizeObserve = vi.fn()
    const mediaAdd = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn()
      root = null
      rootMargin = ''
      thresholds = []
    })
    vi.stubGlobal('ResizeObserver', class {
      observe = resizeObserve
      disconnect = vi.fn()
      unobserve = vi.fn()
    })
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: mediaAdd,
      removeEventListener: vi.fn(),
    }))

    try {
      const { MemberBadgeChain } = await loadMemberBadgeChain()
      const CollectionChain = MemberBadgeChain as ComponentType<{
        earnedBadges: PublicMemberBadge[]
        badgeProgress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }>
      }>
      render(
        <CollectionChain
          earnedBadges={[
            { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry', current_count: 12 },
            { id: 2, badge_code: 'role_entry_timer', badge_category: 'role_entry', current_count: 1 },
            { id: 3, badge_code: 'productive_bronze', badge_category: 'quantity' },
            { id: 4, badge_code: 'historical_leader', badge_category: 'historical_achievement' },
          ]}
          badgeProgress={[
            { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false },
            { family: 'points', current_count: 50, next_threshold: 200, remaining_count: 150, next_tier: '200 Punkte', complete: false },
            { family: 'contribution_projects', current_count: 1, next_threshold: 5, remaining_count: 4, next_tier: 'Silber', complete: false },
            { family: 'contribution_chronicle', current_count: 5, next_threshold: 25, remaining_count: 20, next_tier: 'Silber', complete: false },
            { family: 'contribution_archivist', current_count: 25, next_threshold: null, remaining_count: null, next_tier: null, complete: true },
            { family: 'membership', current_count: 7, next_threshold: 10, remaining_count: 3, next_tier: '10 Jahre', complete: false },
          ]}
        />,
      )

      expect(screen.queryByRole('heading', { level: 2, name: 'Auszeichnungen' })).toBeNull()
      expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
        'Rollenfortschritt',
        'Fortschritt',
        'Punkte-Meilensteine',
        'Beiträge',
        'Mitgliedschaft',
        'Besondere Auszeichnungen',
      ])
      expect(screen.getAllByRole('heading', { level: 2 }).every((heading) => (
        heading.parentElement?.parentElement?.className.includes('sectionHeaderUnderline')
      ))).toBe(true)
      expect(screen.getByRole('heading', { level: 3, name: 'Übersetzung:' })).not.toBeNull()
      expect(screen.getByRole('heading', { level: 3, name: 'Anime-Projekte' })).not.toBeNull()
      expect(screen.getByRole('heading', { level: 3, name: 'Mitgetragene Projekte' })).not.toBeNull()
      expect(screen.getByRole('heading', { level: 3, name: 'Historische Leitung' })).not.toBeNull()
      expect(screen.getByText('1 von 2 Rollen')).not.toBeNull()
      expect(screen.getByText('10 von 25 Anime-Projekten · Noch 15 bis 25 Projekte')).not.toBeNull()
      expect(screen.getByText('25 Bildarchivbeiträge · Höchste Stufe erreicht')).not.toBeNull()
      expect(screen.queryByRole('tab')).toBeNull()
      expect(screen.queryByRole('tablist')).toBeNull()
      expect(resizeObserve.mock.calls.every(([element]) => (
        element instanceof HTMLElement && element.hasAttribute('data-badge-stage-strip')
      ))).toBe(true)
      expect(mediaAdd).toHaveBeenCalledTimes(resizeObserve.mock.calls.length)
      expect(memberBadgeChainCss).toMatch(/\.roleHeroArtwork\s*\{[^}]*width:\s*320px;[^}]*height:\s*320px;/s)
      expect(memberBadgeChainCss).not.toMatch(/transition:[^;]*(?:width|height)/)
    } finally {
      vi.unstubAllGlobals()
    }
})

describe('Phase 121 Rollenfamilien und Hero-Artwork', () => {
  const roles = [
    ['project_lead', 'Projektleitung'],
    ['translator', 'Übersetzung'],
    ['timer', 'Timing'],
    ['typesetter', 'Typesetting'],
    ['editor', 'Editing'],
    ['encoder', 'Encoding'],
    ['raw_provider', 'Raw-Bereitstellung'],
    ['quality_checker', 'Qualitätsprüfung'],
    ['designer', 'Design'],
    ['admin', 'Administration'],
    ['other', 'Andere'],
  ] as const

  const rankCases = [
    [1, 'entry'],
    [12, 'bronze'],
    [108, 'silver'],
    [320, 'gold'],
    [510, 'platinum'],
  ] as const

  it('zeigt exakt 11 verdiente Rollenfamilien und keine Alias- oder Fremdrollen', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const earnedBadges: PublicMemberBadge[] = [
      ...roles.map(([roleCode], index) => ({
        id: index + 1,
        badge_code: `role_entry_${roleCode}`,
        badge_category: 'role_entry',
        current_count: 1,
      })),
      { id: 90, badge_code: 'role_entry_fansub_lead', badge_category: 'role_entry', current_count: 1 },
      { id: 91, badge_code: 'role_entry_techadmin', badge_category: 'role_entry', current_count: 1 },
      { id: 92, badge_code: 'role_entry_gfxler', badge_category: 'role_entry', current_count: 1 },
      { id: 93, badge_code: 'role_entry_foreign', badge_category: 'role_entry', current_count: 1 },
    ]

    const { container } = render(<MemberBadgeChain earnedBadges={earnedBadges} />)
    const roleCards = Array.from(container.querySelectorAll<HTMLElement>('[data-role-code]'))

    expect(roleCards.map((card) => card.dataset.roleCode)).toEqual(roles.map(([roleCode]) => roleCode))
    expect(roleCards.map((card) => card.querySelector('h3')?.textContent)).toEqual(
      roles.map(([, label]) => `${label}:`),
    )
    expect(container.querySelector('[data-role-code="fansub_lead"]')).toBeNull()
    expect(container.querySelector('[data-role-code="techadmin"]')).toBeNull()
    expect(container.querySelector('[data-role-code="gfxler"]')).toBeNull()
    expect(container.querySelector('[data-role-code="foreign"]')).toBeNull()
    expect(roleCards.every((card) => card.hasAttribute('data-role-card-state'))).toBe(true)
  })

  it('löst alle fünf Hero-Ränge aller 11 Familien auf und bewahrt direkte Timing-Quellen', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()

    for (const [roleCode] of roles) {
      for (const [count, rank] of rankCases) {
        const badgeCode = `role_entry_${roleCode}`
        const rendered = render(
          <MemberBadgeChain
            earnedBadges={[{
              id: count,
              badge_code: badgeCode,
              badge_category: 'role_entry',
              current_count: count,
            }]}
          />,
        )
        const expectedCode = rank === 'entry' ? badgeCode : `role_volume_${roleCode}_${rank}`
        const hero = rendered.container.querySelector(`img[data-achievement-art="${expectedCode}"]`)
        const expectedSource = rank === 'entry' || roleCode === 'timer'
          ? `/member-achievement-badges/${expectedCode}.png`
          : `/member-achievement-badges/rank-frame-${roleCode}-${rank}.png`

        expectDisplayImageSource(hero, expectedSource)
        rendered.unmount()
      }
    }
  })

  it('bindet komponierte Hero-Layer an einen quadratischen lokalen Geometriekontext', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const timer = render(<MemberBadgeChain earnedBadges={[{
      id: 108,
      badge_code: 'role_volume_timer_silver',
      badge_category: 'role_volume',
      current_count: 108,
    }]} />)
    const timerCard = timer.container.querySelector('[data-role-code="timer"]') as HTMLElement
    expect(timerCard.querySelectorAll('img')).toHaveLength(1)
    expectDisplayImageSource(
      timerCard.querySelector('img'),
      '/member-achievement-badges/role_volume_timer_silver.png',
    )
    timer.unmount()

    for (const roleCode of ['project_lead', 'quality_checker', 'encoder'] as const) {
      const rendered = render(<MemberBadgeChain earnedBadges={[{
        id: 108,
        badge_code: `role_volume_${roleCode}_silver`,
        badge_category: 'role_volume',
        current_count: 108,
      }]} />)
      const card = rendered.container.querySelector(`[data-role-code="${roleCode}"]`) as HTMLElement
      const hero = card.querySelector('[class*="roleHeroArtworkLayered"]') as HTMLElement
      expect(hero).not.toBeNull()
      expect(hero.querySelectorAll('img')).toHaveLength(2)
      rendered.unmount()
    }

    expect(memberBadgeChainCss).toMatch(/\.roleHeroArtworkLayered,\s*\.badgeArtworkLayered\s*\{[^}]*position:\s*relative;/s)
    expect(memberBadgeChainCss).toMatch(/\.group\[data-badge-group="roles"\] \.roleHeroArtwork\s*\{[^}]*aspect-ratio:\s*1;[^}]*height:\s*auto;/s)
    expect(memberBadgeChainCss).toMatch(/\.roleArtworkMotif\s*\{[^}]*object-fit:\s*contain;[^}]*clip-path:\s*circle/s)
    expect(memberBadgeChainCss).toMatch(/\.roleArtworkFrame\s*\{[^}]*object-fit:\s*contain;/s)
  })
})

describe('Phase 121 semantischer Rollen-Rank-Track', () => {
  it('toggles a clean independent expanded roles grid and restores the carousel', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain earnedBadges={[roleBadge('translator', 108), roleBadge('timer', 12)]} catalog={roleProgressCatalog} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alle Auszeichnungen in Fansubrollen anzeigen' }))
    expect(screen.queryByRole('region', { name: 'Rollenfortschritt-Karussell' })).toBeNull()
    expect(container.querySelectorAll('[data-role-card-state="expanded"]')).toHaveLength(2)
    expect(container.querySelector('[data-badge-skeleton="true"]')).not.toBeNull()
    expect(memberBadgeChainCss).toMatch(/\.carouselShell:has\(\.badgeGrid\) > \.carouselSkeleton\s*\{[^}]*visibility:\s*hidden;/s)
    expect(memberBadgeChainCss).toMatch(/\.roleBadgeRow\[data-role-card-state="expanded"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*transform:\s*none;/s)

    fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }))
    expect(screen.getByRole('region', { name: 'Rollenfortschritt-Karussell' })).not.toBeNull()
    expect(container.querySelectorAll('[data-role-card-state="expanded"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-role-card-state="active"]')).toHaveLength(1)
  })

  it('locks the final desktop hierarchy and near-full-width narrow role card', () => {
    expect(memberBadgeChainCss).toMatch(/@media \(min-width: 1440px\)[\s\S]*font-size:\s*clamp\(2rem, 2\.4vw, 3rem\);/)
    expect(memberBadgeChainCss).toMatch(/@media \(min-width: 1440px\)[\s\S]*\.roleProgressTrack\s*\{[^}]*height:\s*10px;/)
    expect(memberBadgeChainCss).toMatch(/@container member-badge-carousel \(max-width: 480px\)[\s\S]*--focal-item-size:\s*min\(98%, 340px\);/)
    expect(memberBadgeChainCss).toMatch(/@media \(max-width: 520px\)[\s\S]*\.chainCard:has\(\.group\[data-badge-group="roles"\]\)[\s\S]*padding-inline:\s*4px;/)
    expect(memberBadgeChainCss).toMatch(/\.badgeWindowActive \.roleBadgeRow\s*\{[^}]*width:\s*calc\(100% \+ 16px\);/)
  })

  const roleBadge = (roleCode: string, count: number, id = 1): PublicMemberBadge => ({
    id,
    badge_code: `role_entry_${roleCode}`,
    badge_category: 'role_entry',
    current_count: count,
  })

  it('beschreibt Gold und Platin als geordnete informative Fünf-Schritt-Listen', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const rendered = render(
      <MemberBadgeChain earnedBadges={[roleBadge('translator', 356)]} />,
    )

    const goldTrack = screen.getByRole('list', { name: 'Medaillen für Übersetzung' })
    const goldSteps = within(goldTrack).getAllByRole('listitem')
    expect(goldSteps).toHaveLength(5)
    expect(goldSteps.map((step) => step.getAttribute('data-role-stage'))).toEqual([
      'einstieg',
      'bronze',
      'silber',
      'gold',
      'platin',
    ])
    expect(goldSteps.map((step) => step.getAttribute('data-role-stage-state'))).toEqual([
      'reached',
      'reached',
      'reached',
      'current',
      'locked',
    ])
    expect(within(goldTrack).getAllByText('Aktuell')).toHaveLength(1)
    expect(goldTrack.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    expect(goldSteps[3]?.getAttribute('aria-current')).toBe('step')
    expect(goldSteps[4]?.textContent).toContain('Gesperrt')
    expect(within(goldTrack).queryByRole('button')).toBeNull()
    expect(within(goldTrack).queryByRole('link')).toBeNull()
    expect(goldTrack.querySelectorAll('[tabindex]')).toHaveLength(0)
    const goldCard = rendered.container.querySelector('[data-role-code="translator"]') as HTMLElement
    expect(within(goldCard).getAllByText('Gold', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(within(goldCard).queryByText('Gold · 320+', { exact: true })).toBeNull()
    expect(within(goldCard).getByText('356 Mitwirkungen')).not.toBeNull()
    expect(within(goldCard).getByText('356 / 510')).not.toBeNull()
    expect(within(goldCard).getByText('Noch 154 Mitwirkungen bis Platin')).not.toBeNull()
    const goldProgress = within(goldCard).getByRole('progressbar', { name: 'Fortschritt für Übersetzung' })
    expect(goldProgress.getAttribute('aria-valuenow')).toBe('356')
    expect(goldProgress.getAttribute('aria-valuemax')).toBe('510')

    rendered.rerender(<MemberBadgeChain earnedBadges={[roleBadge('translator', 687)]} />)
    const platinumTrack = screen.getByRole('list', { name: 'Medaillen für Übersetzung' })
    const platinumSteps = within(platinumTrack).getAllByRole('listitem')
    expect(platinumSteps.map((step) => step.getAttribute('data-role-stage-state'))).toEqual([
      'reached',
      'reached',
      'reached',
      'reached',
      'current',
    ])
    expect(platinumTrack.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    expect(platinumSteps[4]?.getAttribute('aria-current')).toBe('step')
    const platinumCard = rendered.container.querySelector('[data-role-code="translator"]') as HTMLElement
    expect(within(platinumCard).getAllByText('Platin', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(within(platinumCard).getByText('687 Mitwirkungen')).not.toBeNull()
    expect(within(platinumCard).getByText('Höchste Stufe erreicht')).not.toBeNull()
    const platinumProgress = within(platinumCard).getByRole('progressbar', { name: 'Fortschritt für Übersetzung' })
    expect(platinumProgress.getAttribute('aria-valuenow')).toBe('510')
    expect(platinumProgress.getAttribute('aria-valuemax')).toBe('510')
  })

  it('behält für active, inactive und expanded denselben Rollenbaum', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { container } = render(
      <MemberBadgeChain
        earnedBadges={[
          roleBadge('translator', 356, 1),
          roleBadge('timer', 687, 2),
        ]}
      />,
    )
    const treeShape = (card: Element) => Array.from(card.children)
      .map((node) => `${node.tagName.toLowerCase()}:${node.getAttribute('role') ?? ''}`)

    const translator = container.querySelector('[data-role-code="translator"]') as HTMLElement
    const timer = container.querySelector('[data-role-code="timer"]') as HTMLElement
    const translatorShape = treeShape(translator)
    const timerShape = treeShape(timer)
    expect(translator.getAttribute('data-role-card-state')).toBe('active')
    expect(timer.getAttribute('data-role-card-state')).toBe('inactive')
    expect(timerShape).toEqual(translatorShape)

    fireEvent.click(screen.getByRole('button', { name: 'Nächste Rolle' }))
    expect(translator.getAttribute('data-role-card-state')).toBe('inactive')
    expect(timer.getAttribute('data-role-card-state')).toBe('active')
    expect(treeShape(translator)).toEqual(translatorShape)
    expect(treeShape(timer)).toEqual(timerShape)

    fireEvent.click(screen.getByRole('button', { name: 'Alle Auszeichnungen in Fansubrollen anzeigen' }))
    const expandedCards = Array.from(container.querySelectorAll('[data-role-card-state="expanded"]'))
    expect(expandedCards).toHaveLength(2)
    expect(expandedCards.map(treeShape)).toEqual([translatorShape, timerShape])
  })
})


describe('Phase 124 Punkte-Meilensteine single-family stage', () => {
  type Progress = { family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }

  async function renderPoints(points: number, currentCode: string | null, nextThreshold: number | null, remainingCount: number | null, complete = false) {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const PointsChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: Progress[] }>
    return render(
      <PointsChain
        earnedBadges={currentCode ? [{ id: 0, badge_code: currentCode, badge_category: 'progress' }] : []}
        badgeProgress={[{ family: 'points', current_count: points, next_threshold: nextThreshold, remaining_count: remainingCount, next_tier: nextThreshold == null ? null : `${nextThreshold} Punkte`, complete }]}
      />,
    )
  }

  it('renders exactly six ordered stations without outer carousel chrome or skeletons', async () => {
    const { container } = await renderPoints(500, 'point_milestone_engaged', 1000, 500)
    const stage = container.querySelector('[data-points-achievement-stage]') as HTMLElement
    expect(stage).not.toBeNull()
    expect(stage.closest('[aria-roledescription="Karussell"]')).toBeNull()
    expect(within(stage).queryByRole('button', { name: /N?chste Auszeichnung/ })).toBeNull()
    expect(stage.querySelectorAll('[data-badge-skeleton]')).toHaveLength(0)
    const stations = within(stage).getAllByRole('listitem')
    expect(stations).toHaveLength(6)
    expect(stations.map((station) => station.getAttribute('data-threshold'))).toEqual(['1', '50', '200', '500', '1000', '2500'])
    const sources = Array.from(stage.querySelectorAll<HTMLImageElement>('ol img')).map((image) => new URL(image.src, 'http://localhost').searchParams.get('url') ?? image.getAttribute('src'))
    expect(sources).toEqual([
      '/member-achievement-badges/point_milestone_first-v2.png',
      '/member-achievement-badges/point_milestone_active-v2.png',
      '/member-achievement-badges/point_milestone_experienced-v2.png',
      '/member-achievement-badges/point_milestone_engaged-v2.png',
    ])
  })

  it('keeps zero visible with no current station and every milestone locked', async () => {
    const { container } = await renderPoints(0, null, 1, 1)
    const stage = container.querySelector('[data-points-achievement-stage]') as HTMLElement
    expect(stage).not.toBeNull()
    expect(within(stage).queryByRole('button')).toBeNull()
    expect(stage.querySelector('[aria-current="step"]')).toBeNull()
    expect(within(stage).getByLabelText(/Erste Punkte.*Gesperrt/).getAttribute('tabindex')).toBeNull()
  })

  it('allows earned preview while authoritative progress and target remain unchanged', async () => {
    const { container } = await renderPoints(734, 'point_milestone_engaged', 1000, 266)
    const stage = container.querySelector('[data-points-achievement-stage]') as HTMLElement
    const progress = within(stage).getByRole('progressbar', { name: /Punkte/ })
    expect(progress.getAttribute('aria-valuenow')).toBe('734')
    expect(progress.getAttribute('aria-valuemax')).toBe('1000')
    expect(stage.querySelector('[aria-current="step"]')?.textContent).toContain('Stark engagiert')
    expect(within(stage).queryByRole('button', { name: /Veteranenstatus.*ausw?hlen/ })).toBeNull()

    fireEvent.click(within(stage).getByRole('button', { name: /Erfahrungsstufe.*ausw?hlen/ }))
    expect(within(stage).getByText('Vorschau')).not.toBeNull()
    expect(within(stage).getByText('Erfahrungsstufe')).not.toBeNull()
    expect(within(stage).getByText(/734 Punkte aktuell/)).not.toBeNull()
    expect(within(stage).getByText(/Noch 266 Punkte bis Veteranenstatus/)).not.toBeNull()
    expect(progress.getAttribute('aria-valuenow')).toBe('734')
  })

  it.each([2500, 2733, 5000])('keeps the true terminal value %i with bounded progressbar semantics', async (points) => {
    const { container } = await renderPoints(points, 'point_milestone_legend', null, null, true)
    const stage = container.querySelector('[data-points-achievement-stage]') as HTMLElement
    const progress = within(stage).getByRole('progressbar', { name: /Punkte/ })
    expect(within(stage).getByText(`${points.toLocaleString('de-CH')} Punkte`)).not.toBeNull()
    expect(progress.getAttribute('aria-valuenow')).toBe('2500')
    expect(progress.getAttribute('aria-valuemax')).toBe('2500')
    expect(within(stage).getByText('H?chste Stufe erreicht')).not.toBeNull()
    expect(stage.textContent).not.toContain('Noch ')
  })

  it('locks square contained artwork, local overflow and reduced-motion CSS contracts', () => {
    expect(memberBadgeChainCss).toMatch(/\.pointsAchievementStage\s*\{[^}]*min-width:\s*0;/s)
    expect(memberBadgeChainCss).toMatch(/\.pointsHeroArtwork\s*\{[^}]*aspect-ratio:\s*1/s)
    expect(memberBadgeChainCss).toMatch(/\.pointsHeroArtwork\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s)
    expect(memberBadgeChainCss).toMatch(/\.pointsStageTrack\s*\{[^}]*overflow-x:\s*auto/s)
    expect(memberBadgeChainCss).toMatch(/\.pointsStageArtwork\s*\{[^}]*aspect-ratio:\s*1/s)
    expect(memberBadgeChainCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.points/s)
    const groupRule = memberBadgeChainCss.match(/\.group\s*\{[^}]*\}/)?.[0] ?? ''
    expect(groupRule).not.toContain('overflow-x: auto')
  })
})

describe('Phase 126 membership stage', () => {
  type Progress = { family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }

  async function renderMembership(years: number, founding = false) {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const MembershipChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: Progress[] }>
    const earnedBadges: PublicMemberBadge[] = [
      ...(founding ? [{ id: 1, badge_code: 'founding_member', badge_category: 'historical_achievement' }] : []),
      ...(years >= 5 ? [{ id: 2, badge_code: 'long_term_member', badge_category: 'membership' }] : []),
      ...(years >= 7 ? [{ id: 3, badge_code: 'membership_7_years', badge_category: 'membership' }] : []),
      ...(years >= 10 ? [{ id: 4, badge_code: 'membership_10_years', badge_category: 'membership' }] : []),
    ]
    const nextThreshold = years < 5 ? 5 : years < 7 ? 7 : years < 10 ? 10 : null
    return render(<MembershipChain earnedBadges={earnedBadges} badgeProgress={[{
      family: 'membership', current_count: years, next_threshold: nextThreshold,
      remaining_count: nextThreshold == null ? null : nextThreshold - years,
      next_tier: nextThreshold == null ? null : `${nextThreshold} Jahre`, complete: nextThreshold == null,
    }]} />)
  }

  it('renders membership without an outer carousel', async () => {
    const { container } = await renderMembership(6)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    expect(stage).not.toBeNull()
    expect(stage.closest('[aria-roledescription="Karussell"]')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Mitgliedschaft-Karussell' })).toBeNull()
    expect(within(stage).getAllByRole('listitem')).toHaveLength(3)
    expect(within(stage).getAllByRole('listitem').map((node) => node.getAttribute('data-threshold'))).toEqual(['5', '7', '10'])
    expect(stage.querySelector('[data-threshold="5"]')?.getAttribute('aria-current')).toBe('step')
    expect(within(stage).getByLabelText('7 Jahre Mitgliedschaft · Gesperrt').getAttribute('tabindex')).toBeNull()
    expect(within(stage).getByLabelText('10 Jahre Mitgliedschaft · Gesperrt').getAttribute('tabindex')).toBeNull()
  })

  it('keeps founding separate from the duration track', async () => {
    const { container } = await renderMembership(3, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    const founding = stage.querySelector('[data-founding-member]') as HTMLElement
    expect(founding).not.toBeNull()
    expect(founding.querySelector('[role="progressbar"]')).toBeNull()
    expect(founding.querySelector('[aria-current]')).toBeNull()
    expect(within(stage).getAllByRole('listitem')).toHaveLength(3)
    expect(stage.querySelectorAll('[data-achievement-art="founding_member"]')).toHaveLength(1)
    expect(container.querySelector('[data-badge-group="special"] [data-achievement-art="founding_member"]')).toBeNull()
  })

  it('renders an earned founding membership as an accessible preview button', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    const preview = within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' })
    expect(preview.closest('[data-founding-member]')).not.toBeNull()
    expect(preview.getAttribute('aria-pressed')).toBe('false')
    expect(preview.closest('[aria-current]')).toBeNull()
  })

  it('shows founding artwork and copy in the large hero after preview activation', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    fireEvent.click(within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' }))
    expect(stage.querySelector('[data-membership-art="founding_member"]')).not.toBeNull()
    expect(within(stage).getByRole('heading', { level: 4, name: 'Besondere Mitgliedschaft' })).not.toBeNull()
    expect(within(stage).getAllByText('Gründungsmitglied')).not.toHaveLength(0)
    expect(within(stage).getAllByText('Seit der Gründung dabei')).not.toHaveLength(0)
    expect(within(stage).getByText('Vorschau')).not.toBeNull()
  })

  it('keeps authoritative duration facts unchanged during founding preview', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    const progress = within(stage).getByRole('progressbar', { name: 'Fortschritt für Mitgliedschaft' })
    fireEvent.click(within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' }))
    expect(within(stage).getByText('24 Jahre Mitgliedschaft')).not.toBeNull()
    expect(within(stage).getByText('Höchste Stufe erreicht')).not.toBeNull()
    expect(progress.getAttribute('aria-valuenow')).toBe('10')
    expect(progress.getAttribute('aria-valuemax')).toBe('10')
    expect(stage.querySelector('[data-threshold="10"]')?.getAttribute('aria-current')).toBe('step')
  })

  it('clears an earlier preview when the actual current duration is selected', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    fireEvent.click(within(stage).getByRole('button', { name: '5 Jahre Mitgliedschaft auswählen' }))
    expect(stage.querySelector('[data-membership-art="long_term_member"]')).not.toBeNull()
    fireEvent.click(within(stage).getByRole('button', { name: '10 Jahre Mitgliedschaft auswählen, Aktuell' }))
    expect(stage.querySelector('[data-membership-art="membership_10_years"]')).not.toBeNull()
    expect(within(stage).queryByText('Vorschau')).toBeNull()
  })

  it('switches from founding preview to every earned duration milestone', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    fireEvent.click(within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' }))
    for (const [label, code] of [['5 Jahre Mitgliedschaft auswählen', 'long_term_member'], ['7 Jahre Mitgliedschaft auswählen', 'membership_7_years'], ['10 Jahre Mitgliedschaft auswählen, Aktuell', 'membership_10_years']]) {
      fireEvent.click(within(stage).getByRole('button', { name: label }))
      expect(stage.querySelector(`[data-membership-art="${code}"]`)).not.toBeNull()
    }
  })

  it('does not render an interactive or empty founding card for non-founders', async () => {
    const { container } = await renderMembership(24, false)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    expect(stage.querySelector('[data-founding-member]')).toBeNull()
    expect(within(stage).queryByRole('button', { name: 'Gründungsmitglied Vorschau' })).toBeNull()
    expect(stage.querySelectorAll('[data-achievement-art="founding_member"]')).toHaveLength(0)
  })

  it('renders founding artwork exactly once before and during its hero preview', async () => {
    const { container } = await renderMembership(24, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    expect(stage.querySelectorAll('[data-achievement-art="founding_member"]')).toHaveLength(1)
    fireEvent.click(within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' }))
    expect(stage.querySelectorAll('[data-achievement-art="founding_member"]')).toHaveLength(1)
  })

  it('keeps locked duration nodes noninteractive while founder preview is active', async () => {
    const { container } = await renderMembership(3, true)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    fireEvent.click(within(stage).getByRole('button', { name: 'Gründungsmitglied Vorschau' }))
    expect(within(stage).getAllByRole('listitem')).toHaveLength(3)
    expect(within(stage).queryByRole('button', { name: /Jahre Mitgliedschaft auswählen/ })).toBeNull()
    expect(stage.querySelectorAll('[data-membership-duration-track] [aria-current]')).toHaveLength(0)
  })

  it('previews earned duration artwork without changing facts', async () => {
    const { container } = await renderMembership(24)
    const stage = container.querySelector('[data-membership-stage]') as HTMLElement
    const progress = within(stage).getByRole('progressbar', { name: 'Fortschritt für Mitgliedschaft' })
    expect(progress.getAttribute('aria-valuenow')).toBe('10')
    expect(progress.getAttribute('aria-valuemax')).toBe('10')
    expect(within(stage).getByText('24 Jahre Mitgliedschaft')).not.toBeNull()
    expect(within(stage).getByText('Höchste Stufe erreicht')).not.toBeNull()
    expect(stage.querySelector('[data-threshold="10"]')?.getAttribute('aria-current')).toBe('step')
    fireEvent.click(within(stage).getByRole('button', { name: '5 Jahre Mitgliedschaft auswählen' }))
    expect(stage.querySelector('[data-membership-art="long_term_member"]')).not.toBeNull()
    fireEvent.click(within(stage).getByRole('button', { name: '7 Jahre Mitgliedschaft auswählen' }))
    expect(stage.querySelector('[data-membership-art="membership_7_years"]')).not.toBeNull()
    expect(within(stage).getByText('24 Jahre Mitgliedschaft')).not.toBeNull()
    expect(progress.getAttribute('aria-valuenow')).toBe('10')
    expect(stage.querySelector('[data-threshold="10"]')?.getAttribute('aria-current')).toBe('step')
  })

  it('uses stable three-column contain geometry', () => {
    expect(memberBadgeChainCss).toMatch(/\.membershipStage\s*\{[^}]*min-width:\s*0;/s)
    expect(memberBadgeChainCss).toMatch(/\.membershipHeroArtwork\s*\{[^}]*aspect-ratio:\s*1/s)
    expect(memberBadgeChainCss).toMatch(/\.membershipHeroArtwork\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s)
    expect(memberBadgeChainCss).toMatch(/\.membershipDurationTrack\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*min-width:\s*0;/s)
    expect(memberBadgeChainCss).toMatch(/\.membershipStageArtwork\s*\{[^}]*aspect-ratio:\s*1/s)
    expect(memberBadgeChainCss).toMatch(/\.membershipStageArtwork\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s)
    expect(memberBadgeChainCss).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.membershipStageHero/s)
    expect(memberBadgeChainCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.membership/s)
    const trackRule = memberBadgeChainCss.match(/\.membershipDurationTrack\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(trackRule).not.toMatch(/overflow-x|scroll-snap|touch-action/)
  })

})

describe('Quick 260811-lck locked achievement artwork secrecy', () => {
  const progress = [
    { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: 'Silber', complete: false },
    { family: 'points', current_count: 500, next_threshold: 1000, remaining_count: 500, next_tier: 'Veteranenstatus', complete: false },
    { family: 'contribution_projects', current_count: 1, next_threshold: 5, remaining_count: 4, next_tier: 'Silber', complete: false },
    { family: 'contribution_chronicle', current_count: 5, next_threshold: 25, remaining_count: 20, next_tier: 'Silber', complete: false },
    { family: 'contribution_archivist', current_count: 5, next_threshold: 25, remaining_count: 20, next_tier: 'Silber', complete: false },
    { family: 'membership', current_count: 6, next_threshold: 7, remaining_count: 1, next_tier: '7 Jahre', complete: false },
  ]
  const earned: PublicMemberBadge[] = [
    { id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry', current_count: 12 },
    { id: 2, badge_code: 'first_contribution', badge_category: 'progress' },
    { id: 3, badge_code: 'point_milestone_engaged', badge_category: 'progress' },
    { id: 4, badge_code: 'contribution_projects_bronze', badge_category: 'contribution' },
    { id: 5, badge_code: 'contribution_chronicle_bronze', badge_category: 'contribution' },
    { id: 6, badge_code: 'contribution_archivist_bronze', badge_category: 'contribution' },
    { id: 7, badge_code: 'long_term_member', badge_category: 'membership' },
  ]

  it('uses one neutral noninteractive placeholder for every locked family while earned art remains', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const Chain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof progress }>
    const { container } = render(<Chain earnedBadges={earned} badgeProgress={progress} />)
    const selectors = [
      '[data-role-stage-state="locked"]',
      '[data-anime-project-stage] [data-stage-state="locked"]',
      '[data-points-achievement-stage] [data-stage-state="locked"]',
      '[data-family="contribution_projects"] [data-stage-state="locked"]',
      '[data-family="contribution_chronicle"] [data-stage-state="locked"]',
      '[data-family="contribution_archivist"] [data-stage-state="locked"]',
      '[data-membership-stage] [data-stage-state="locked"]',
    ]
    for (const selector of selectors) {
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector))
      expect(nodes.length, selector).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(node.querySelector('[data-locked-stage-art]')).not.toBeNull()
        expect(node.querySelector('img, [data-achievement-art], [class*="Motif"], [class*="Frame"]')).toBeNull()
        expect(node.textContent).toContain('Gesperrt')
        const labelledWrapper = node.hasAttribute('aria-label') ? node : node.querySelector<HTMLElement>('[aria-label]')
        expect(labelledWrapper?.getAttribute('aria-label')).toMatch(/gesperrt/i)
        expect(node.querySelector('button, a, [tabindex]')).toBeNull()
      }
    }
    expect(container.querySelectorAll('[data-stage-state="earned"] img, [data-stage-state="current"] img').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-achievement-art="point_milestone_engaged"]')).not.toBeNull()
    expect(container.querySelector('[data-founding-member]')).toBeNull()
  })

  it('omits locked asset names from SSR but keeps locked copy and current hero art', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const Chain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof progress }>
    const html = renderToStaticMarkup(<Chain earnedBadges={earned} badgeProgress={progress} />)
    expect(html).toContain('Gesperrt')
    expect(html).toContain('point_milestone_engaged')
    for (const basename of [
      'role_volume_translator_silver',
      'productive_silver',
      'point_milestone_veteran',
      'contribution_projects_silver',
      'contribution_chronicle_silver',
      'contribution_archivist_silver',
      'membership_7_years',
    ]) expect(html).not.toContain('/member-achievement-badges/' + basename)
    expect(html).not.toContain('founding_member')
  })
})

describe('Quick 260812-bqs locked mystery heroes', () => {
  const lockedProgress = [
    { family: 'points', current_count: 0, next_threshold: 1, remaining_count: 1, next_tier: 'Erste Punkte', complete: false },
    { family: 'contribution_projects', current_count: 0, next_threshold: 1, remaining_count: 1, next_tier: 'Bronze', complete: false },
    { family: 'contribution_chronicle', current_count: 0, next_threshold: 5, remaining_count: 5, next_tier: 'Bronze', complete: false },
    { family: 'contribution_archivist', current_count: 0, next_threshold: 5, remaining_count: 5, next_tier: 'Bronze', complete: false },
    { family: 'membership', current_count: 0, next_threshold: 5, remaining_count: 5, next_tier: '5 Jahre', complete: false },
  ]

  it('renders the same secret neutral hero contract for every completely unearned family', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const Chain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof lockedProgress }>
    const { container } = render(<Chain earnedBadges={[]} badgeProgress={lockedProgress} />)
    const heroes = Array.from(container.querySelectorAll<HTMLElement>('[data-locked-stage-hero]'))
    expect(heroes).toHaveLength(5)
    expect(screen.getAllByText('Noch nicht freigeschaltet')).toHaveLength(5)
    for (const hero of heroes) {
      expect(hero.matches('[data-locked-stage-art]')).toBe(true)
      expect(hero.textContent).toContain('?')
      expect(hero.querySelector('svg')).not.toBeNull()
      expect(hero.querySelector('img, [data-achievement-art], [class*="Motif"], [class*="Frame"]')).toBeNull()
      expect(hero.getAttribute('class')).not.toMatch(/bronze|silver|gold|platinum/i)
    }
    expect(container.querySelector('[data-points-achievement-stage] [data-locked-stage-hero]')).not.toBeNull()
    for (const key of ['contribution_projects', 'contribution_chronicle', 'contribution_archivist']) {
      expect(container.querySelector(`[data-family="${key}"] [data-locked-stage-hero]`)).not.toBeNull()
    }
    expect(container.querySelector('[data-membership-stage] [data-locked-stage-hero]')).not.toBeNull()
  })

  it('keeps locked hero SSR free of future artwork identifiers and colors', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const Chain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof lockedProgress }>
    const html = renderToStaticMarkup(<Chain earnedBadges={[]} badgeProgress={lockedProgress} />)
    expect(html.match(/data-locked-stage-hero/g)).toHaveLength(5)
    expect(html.match(/Noch nicht freigeschaltet/g)).toHaveLength(5)
    expect(html).not.toContain('data-achievement-art')
    expect(html).not.toContain('/member-achievement-badges/')
  })

  it('defines a responsive hero composition without changing the compact lock default', () => {
    expect(memberBadgeChainCss).toMatch(/\.lockedStageArtworkHero\s*\{[^}]*width:\s*min\(100%,\s*320px\);[^}]*max-width:\s*100%;[^}]*aspect-ratio:\s*1;/s)
    expect(memberBadgeChainCss).toMatch(/\.lockedStageHeroCopy\s*\{[^}]*text-align:\s*center;/s)
    expect(memberBadgeChainCss).toMatch(/\.lockedStageArtwork:not\(\.lockedStageArtworkHero\)\s*\{[^}]*width:\s*clamp\(44px,\s*100%,\s*96px\);/s)
  })

describe('Quick 260812-rps responsive BadgeChain contract', () => {
  it('bounds hero, progress and carousel consumers without arbitrary copy breaking', () => {
    expect(memberBadgeChainCss).toMatch(/\.carouselShell\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*container:\s*member-badge-carousel \/ inline-size;/s)
    expect(memberBadgeChainCss).toMatch(/\.familyCard\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.familyProgressBlock\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.familyProgressCopy\s*\{[^}]*overflow-wrap:\s*normal;/s)
    expect(memberBadgeChainCss).not.toMatch(/\.(?:familyCard|familyProgressCopy)\s*\{[^}]*(?:overflow-wrap:\s*anywhere|word-break:\s*break-all)/s)
  })
})
})