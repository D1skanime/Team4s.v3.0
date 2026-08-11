import { describe, expect, it } from 'vitest'

describe('Phase 127 RED badge artwork extraction', () => {
  it('Phase 127 RED artwork preserves every current mapping and fallback branch', async () => {
    const { resolveBadgeArtwork } = await import('./badgeArtwork')
    expect(resolveBadgeArtwork('first_contribution')).toBe('/member-achievement-badges/progress-frame-first_contribution.png')
    expect(resolveBadgeArtwork('point_milestone_veteran')).toBe('/member-achievement-badges/point_milestone_veteran-v3.png')
    for (const tier of ['bronze', 'silver', 'gold']) {
      expect(resolveBadgeArtwork(`productive_${tier}`)).toBe(`/member-achievement-badges/progress-frame-productive-${tier}.png`)
    }
    for (const code of ['point_milestone_first', 'point_milestone_active', 'point_milestone_engaged', 'point_milestone_experienced', 'point_milestone_legend']) {
      expect(resolveBadgeArtwork(code)).toBe(`/member-achievement-badges/${code}-v2.png`)
    }
    const versions = {
      contribution_projects_bronze: 'v3', contribution_projects_silver: 'v2', contribution_projects_gold: 'v2',
      contribution_chronicle_bronze: 'v4', contribution_chronicle_silver: 'v2', contribution_chronicle_gold: 'v2',
      contribution_archivist_bronze: 'v2', contribution_archivist_silver: 'v2', contribution_archivist_gold: 'v2',
    }
    for (const [code, version] of Object.entries(versions)) {
      expect(resolveBadgeArtwork(code)).toBe(`/member-achievement-badges/${code}-${version}.png`)
    }
    expect(resolveBadgeArtwork('founding_member')).toBe('/member-achievement-badges/membership-founding_member-v4.png')
    expect(resolveBadgeArtwork('long_term_member')).toBe('/member-achievement-badges/membership-long_term_member-v4.png')
    expect(resolveBadgeArtwork('membership_7_years')).toBe('/member-achievement-badges/membership-7_years-v4.png')
    expect(resolveBadgeArtwork('membership_10_years')).toBe('/member-achievement-badges/membership-10_years-v4.png')
    expect(resolveBadgeArtwork('historical_leader')).toBe('/member-achievement-badges/special-historical_leader-v1.png')
    expect(resolveBadgeArtwork('contribution_future')).toBe('/member-achievement-badges/contribution_future.png')
    expect(resolveBadgeArtwork('role_entry_timer')).toBe('/member-achievement-badges/role_entry_timer.png')
    expect(resolveBadgeArtwork('role_volume_timer_gold')).toBe('/member-achievement-badges/role_volume_timer_gold.png')
    expect(resolveBadgeArtwork('role_volume_translator_gold')).toBe('/member-achievement-badges/role_entry_translator.png')
    expect(resolveBadgeArtwork('unknown')).toBeUndefined()
  })
})
