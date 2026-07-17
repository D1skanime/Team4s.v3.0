import { describe, expect, it } from 'vitest'
import { parseReleaseDetailIDs, parseReleaseDetailSearchParams } from './releaseDetailPageData'

describe('parseReleaseDetailIDs', () => {
  it('accepts positive numeric ownership identifiers', () => {
    expect(parseReleaseDetailIDs({ id: '1', groupId: '2', releaseVersionId: '3' })).toEqual({ animeID: 1, groupID: 2, releaseVersionID: 3 })
  })
  it('rejects invalid identifiers', () => {
    expect(parseReleaseDetailIDs({ id: '0', groupId: '2', releaseVersionId: '3' })).toBeNull()
    expect(parseReleaseDetailIDs({ id: 'x', groupId: '2', releaseVersionId: '3' })).toBeNull()
  })
  it('validiert Kara-Deep-Link und Autoplay additiv', () => {
    expect(parseReleaseDetailSearchParams({ kara: '7', autoplay: '1' })).toEqual({
      initialKaraSegmentID: 7,
      autoplayInitialKara: true,
    })
    expect(parseReleaseDetailSearchParams({ kara: '-1', autoplay: 'yes' })).toEqual({
      initialKaraSegmentID: null,
      autoplayInitialKara: false,
    })
  })
})
