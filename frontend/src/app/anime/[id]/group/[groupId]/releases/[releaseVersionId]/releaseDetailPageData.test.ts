import { describe, expect, it } from 'vitest'
import { parseReleaseDetailIDs } from './releaseDetailPageData'

describe('parseReleaseDetailIDs', () => {
  it('accepts positive numeric ownership identifiers', () => {
    expect(parseReleaseDetailIDs({ id: '1', groupId: '2', releaseVersionId: '3' })).toEqual({ animeID: 1, groupID: 2, releaseVersionID: 3 })
  })
  it('rejects invalid identifiers', () => {
    expect(parseReleaseDetailIDs({ id: '0', groupId: '2', releaseVersionId: '3' })).toBeNull()
    expect(parseReleaseDetailIDs({ id: 'x', groupId: '2', releaseVersionId: '3' })).toBeNull()
  })
})
