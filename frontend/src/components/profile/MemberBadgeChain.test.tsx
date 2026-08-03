// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicMemberBadge } from '@/types/profile'
const memberBadgeChainCss = readFileSync('src/components/profile/MemberBadgeChain.module.css', 'utf8')

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

    expect(container.querySelector('img[data-achievement-art="point_milestone_first"]')?.getAttribute('src')).toBe(
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

    expect(container.querySelector('img[data-achievement-art="first_contribution"]')?.getAttribute('src')).toBe(
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

    expect(container.querySelector('img[data-achievement-art="productive_gold"]')?.getAttribute('src')).toBe(
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_translator_gold"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-translator-gold.png')
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_timer_silver"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-timer-silver.png')
    expect(container.querySelectorAll('img[src*="role-timer-motif.png"]')).toHaveLength(1)
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_encoder_bronze"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-encoder-bronze.png')
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_typesetter_bronze"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-typesetter-bronze.png')
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_quality_checker_bronze"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-quality_checker-bronze.png')
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

    expect(
      container.querySelector('img[data-achievement-art="role_volume_project_lead_bronze"]')?.getAttribute('src'),
    ).toBe('/member-achievement-badges/rank-frame-project_lead-bronze.png')
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

    expect(container.querySelector(`img[data-achievement-art="${volumeCode}"]`)?.getAttribute('src')).toBe(
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

    expect(screen.getByLabelText('1 von 1 allgemeine Auszeichnungen')).not.toBeNull()
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
    expect(within(rolesList).getByText('Bronze · 12+')).not.toBeNull()
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
    expect(screen.getByText('Gold · 320+')).not.toBeNull()
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
    expect(memberBadgeChainCss).toMatch(/\.roleBadgeRow > \*\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s)
    expect(memberBadgeChainCss).toMatch(/\.roleProgressCopy\s*\{[^}]*white-space:\s*normal;/s)
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
    expect(screen.getByText('108 von 320 Mitwirkungen · Noch 212 bis Gold')).not.toBeNull()
    expect(screen.getByText('Silber · 108+')).not.toBeNull()
    expect(screen.getByText('1 von 2 Rollen')).not.toBeNull()
    expect(screen.getAllByRole('region', { name: 'Rollenfortschritt-Karussell' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Vorherige Rolle' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Nächste Rolle' })).not.toBeNull()
    expect(container.querySelectorAll('[data-role-stage]')).toHaveLength(10)
    expect(container.querySelectorAll('[data-role-stage] img')).toHaveLength(10)
    expect(container.querySelectorAll('[data-role-stage][tabindex]')).toHaveLength(0)
    expect(screen.getAllByText('Aktuell')).toHaveLength(2)
    expect(screen.getAllByText('Gesperrt').length).toBeGreaterThan(0)
  })

  it('hides zero and foreign roles and reverses rank state on rerender', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const { rerender } = render(
      <MemberBadgeChain earnedBadges={[roleBadge('translator', 510), { ...roleBadge('timer', 0), badge_code: 'role_volume_foreign_gold' }]} catalog={roleProgressCatalog} />,
    )
    expect(screen.getByText('510 Mitwirkungen · Höchste Stufe erreicht')).not.toBeNull()
    expect(screen.queryByText('Timing')).toBeNull()
    rerender(<MemberBadgeChain earnedBadges={[roleBadge('translator', 11)]} catalog={roleProgressCatalog} />)
    expect(screen.getByText('Einstieg · 1+')).not.toBeNull()
    expect(screen.getByText('11 von 12 Mitwirkungen · Noch 1 bis Bronze')).not.toBeNull()
    rerender(<MemberBadgeChain earnedBadges={[]} catalog={roleProgressCatalog} />)
    expect(screen.queryByText('Rollenfortschritt')).toBeNull()
  })

  it('clamps platinum progress aria while preserving the true visible count', async () => {
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    render(<MemberBadgeChain earnedBadges={[roleBadge('translator', 777)]} catalog={roleProgressCatalog} />)
    const progress = screen.getByRole('progressbar', { name: 'Fortschritt für Übersetzung' })
    expect(progress.getAttribute('aria-valuenow')).toBe('510')
    expect(progress.getAttribute('aria-valuemax')).toBe('510')
    expect(screen.getByText('777 Mitwirkungen · Höchste Stufe erreicht')).not.toBeNull()
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
    await renderCollections([
      { id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' },
      { id: 2, badge_code: 'point_milestone_active', badge_category: 'progress' },
    ])
    const projects = screen.getByRole('progressbar', { name: 'Fortschritt für Anime-Projekte' })
    expect(projects).toHaveAttribute('aria-valuemin', '0')
    expect(projects).toHaveAttribute('aria-valuenow', '10')
    expect(projects).toHaveAttribute('aria-valuemax', '25')
    expect(screen.getByText('10 von 25 Anime-Projekten · Noch 15 bis 25 Projekte')).not.toBeNull()
    expect(screen.getByText('1 mitgetragenes Projekt · Noch 4 bis Silber')).not.toBeNull()
    expect(screen.getByText('25 Bildarchivbeiträge · Höchste Stufe erreicht')).not.toBeNull()
  })

  it('keeps current, selected and locked stages semantically distinct', async () => {
    await renderCollections([{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }])
    const older = screen.getByRole('button', { name: 'Erste Mitwirkung auswählen' })
    fireEvent.keyDown(older, { key: 'Enter' })
    expect(screen.getByText('Ausgewählt')).not.toBeNull()
    expect(screen.getByText('Aktuell')).not.toBeNull()
    expect(screen.getByLabelText('25 Anime-Projekte · Gesperrt').getAttribute('tabindex')).toBeNull()
  })

  it('resets temporary selection when family metrics change', async () => {
    const rendered = await renderCollections([{ id: 1, badge_code: 'productive_bronze', badge_category: 'quantity' }])
    fireEvent.keyDown(screen.getByRole('button', { name: 'Erste Mitwirkung auswählen' }), { key: ' ' })
    expect(screen.getByText('Ausgewählt')).not.toBeNull()
    const { MemberBadgeChain } = await loadMemberBadgeChain()
    const CollectionChain = MemberBadgeChain as ComponentType<{ earnedBadges: PublicMemberBadge[]; badgeProgress: typeof badgeProgress }>
    rendered.rerender(<CollectionChain earnedBadges={[{ id: 1, badge_code: 'productive_silver', badge_category: 'quantity' }]} badgeProgress={badgeProgress.map((item) => item.family === 'progress' ? { ...item, current_count: 25, next_threshold: 50, remaining_count: 25, next_tier: '50 Projekte' } : item)} />)
    expect(screen.queryByText('Ausgewählt')).toBeNull()
    expect(screen.getByText('Aktuell')).not.toBeNull()
  })
})
