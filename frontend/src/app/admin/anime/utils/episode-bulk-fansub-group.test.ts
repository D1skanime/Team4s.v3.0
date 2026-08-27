import { describe, expect, it } from 'vitest'

import { buildBulkFansubGroupAssignments } from './episode-bulk-fansub-group'

describe('buildBulkFansubGroupAssignments', () => {
  it('adds the selected group to every release version of the selected episodes without removing existing groups', () => {
    const result = buildBulkFansubGroupAssignments({
      selectedEpisodeIDs: { 10: true, 11: true },
      episodes: [
        { id: 10, episode_number: '1' },
        { id: 11, episode_number: '2' },
      ],
      groupedEpisodes: [
        {
          episode_number: 1,
          versions: [
            { id: 101, fansub_groups: [{ id: 7, name: 'Bestehende Gruppe' }] },
            { id: 102, fansub_groups: [] },
          ],
        },
        {
          episode_number: 2,
          versions: [{ id: 103, fansub_groups: [{ id: 8, name: 'Andere Gruppe' }] }],
        },
      ],
      fansubGroupID: 9,
    })

    expect(result.assignments).toEqual([
      { versionID: 101, fansubGroups: [{ id: 7 }, { id: 9 }] },
      { versionID: 102, fansubGroups: [{ id: 9 }] },
      { versionID: 103, fansubGroups: [{ id: 8 }, { id: 9 }] },
    ])
    expect(result.skippedEpisodeIDs).toEqual([])
  })

  it('does not duplicate a group and reports selected episodes without a release version', () => {
    const result = buildBulkFansubGroupAssignments({
      selectedEpisodeIDs: { 10: true, 11: true },
      episodes: [
        { id: 10, episode_number: '1' },
        { id: 11, episode_number: '2' },
      ],
      groupedEpisodes: [
        {
          episode_number: 1,
          versions: [{ id: 101, fansub_groups: [{ id: 9, name: 'Bereits gesetzt' }] }],
        },
      ],
      fansubGroupID: 9,
    })

    expect(result.assignments).toEqual([{ versionID: 101, fansubGroups: [{ id: 9 }] }])
    expect(result.skippedEpisodeIDs).toEqual([11])
  })
})
