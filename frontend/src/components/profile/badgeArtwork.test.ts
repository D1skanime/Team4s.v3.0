import { readdirSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { listRoleDefinitions } from '@/lib/api'
import type { PublicRoleDefinitionOption } from '@/types/admin-capability'
import * as artwork from './badgeArtwork'

describe('Approved achievement artwork mappings', () => {
  it('preserves shipped mappings and rejects speculative artwork', async () => {
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
    expect(resolveBadgeArtwork('contribution_future')).toBeUndefined()
    expect(resolveBadgeArtwork('role_entry_timer', 'user')).toBe('/member-achievement-badges/role_entry_timer.png')
    expect(resolveBadgeArtwork('role_volume_timer_gold', 'user')).toBe('/member-achievement-badges/role_volume_timer_gold.png')
    expect(resolveBadgeArtwork('role_volume_translator_gold', 'user')).toBe('/member-achievement-badges/role_entry_translator.png')
    expect(resolveBadgeArtwork('role_entry_typesetter', 'user')).toBe('/member-achievement-badges/role_entry_typesetter.png')
    expect(resolveBadgeArtwork('role_entry_karaoke_fx', 'image')).toBe('/member-achievement-badges/role_entry_karaoke_fx.png')
    expect(resolveBadgeArtwork('role_entry_future_role', 'film')).toBeUndefined()
    expect(resolveBadgeArtwork('role_entry_translator')).toBe('/member-achievement-badges/role_entry_translator.png')
    expect(resolveBadgeArtwork('unknown')).toBeUndefined()
  })
})


describe('role artwork resolution', () => {
  it('renders Karaoke entry and all four layered tiers regardless of catalog icon', () => {
    for (const icon of [undefined, 'image', 'user', 'crown']) {
      expect(artwork.resolveBadgeArtwork('role_entry_karaoke_fx', icon))
        .toBe('/member-achievement-badges/role_entry_karaoke_fx.png')
      for (const tier of ['bronze', 'silver', 'gold', 'platinum']) {
        expect(artwork.resolveLayeredRoleArtwork(`role_volume_karaoke_fx_${tier}`, icon)).toEqual({
          motifSrc: '/member-achievement-badges/role-karaoke_fx-motif.png',
          frameSrc: `/member-achievement-badges/rank-frame-karaoke_fx-${tier}.png`,
        })
      }
    }
  })

  it('retains Timer complete-volume art instead of layering another frame on it', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'platinum']) {
      expect(artwork.resolveBadgeArtwork(`role_volume_timer_${tier}`))
        .toBe(`/member-achievement-badges/role_volume_timer_${tier}.png`)
      expect(artwork.resolveLayeredRoleArtwork(`role_volume_timer_${tier}`)).toBeUndefined()
    }
  })

  it('does not turn unknown, prototype or path-like input into an image request', () => {
    for (const code of ['constructor', '__proto__', 'toString', 'contribution_future',
      'role_entry_constructor', 'role_entry___proto__', 'role_entry_../admin',
      'role_volume_future_gold', 'role_volume_karaoke_fx_diamond']) {
      expect(artwork.resolveBadgeArtwork(code, 'user')).toBeUndefined()
      expect(artwork.resolveLayeredRoleArtwork(code, 'user')).toBeUndefined()
    }
  })
})

describe('canonical live catalog and shipped files', () => {
  let roles: PublicRoleDefinitionOption[]
  const files = new Set(readdirSync(path.resolve('public/member-achievement-badges'))
    .filter((file) => file.endsWith('.png')).map((file) => `/member-achievement-badges/${file}`))

  beforeAll(async () => {
    if (!process.env.API_INTERNAL_URL) {
      throw new Error('Run the artwork catalog gate in the Linux frontend Compose service (API_INTERNAL_URL required).')
    }
    // Use the existing API helper and its runtime contract parser, with one public catalog request.
    roles = await listRoleDefinitions('anime_contribution')
    expect(roles.length).toBeGreaterThan(0)
    expect(new Set(roles.map((role) => role.code)).size).toBe(roles.length)
  })

  it('requires real files for every achievement role from the canonical catalog', () => {
    expect(artwork.validateRoleArtworkCoverage(roles, files)).toEqual({
      missingRoles: [], missingFiles: [], exceptions: [],
    })
  })

  it('detects a new catalog role even when every presentation-manifest row is complete', () => {
    const extended = [...roles, { ...roles[0], code: 'future_artwork_test_role' }]
    expect(artwork.validateRoleArtworkCoverage(extended, files).missingRoles)
      .toEqual(['future_artwork_test_role'])
  })

  it('reports the exact removed frame instead of silently accepting a broken layer', () => {
    const missing = '/member-achievement-badges/rank-frame-typesetter-gold.png'
    expect(files.has(missing)).toBe(true)
    const incomplete = new Set(files)
    incomplete.delete(missing)
    expect(artwork.validateRoleArtworkCoverage(roles, incomplete).missingFiles).toContain(missing)
  })
})
