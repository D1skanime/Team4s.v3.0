import { describe, expect, it } from 'vitest'
import { buildFansubReleaseHref, buildPublicFansubProjectPath, buildPublicFansubReleasePath, buildTechnicalFansubReleasePath } from './fansubProjectRoutes'

describe('public Fansub project routes', () => {
  it('encodes canonical project and release slug segments', () => {
    expect(buildPublicFansubProjectPath(' C Subs ', 'Viper & Schnee')).toBe('/fansubs/C%20Subs/fansubprojekt/Viper%20%26%20Schnee')
    expect(buildPublicFansubReleasePath('C Subs', 'Viper & Schnee', 17)).toBe('/fansubs/C%20Subs/fansubprojekt/Viper%20%26%20Schnee/releases/17')
  })
  it('prefers canonical context and retains an explicit technical fallback', () => {
    expect(buildFansubReleaseHref({ animeID: 3, groupID: 4, releaseVersionID: 17, canonicalProjectPath: '/fansubs/c/fansubprojekt/a/' })).toBe('/fansubs/c/fansubprojekt/a/releases/17')
    expect(buildTechnicalFansubReleasePath(3, 4, 17)).toBe('/anime/3/group/4/releases/17')
  })
})
