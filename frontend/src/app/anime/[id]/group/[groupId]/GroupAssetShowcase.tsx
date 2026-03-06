'use client'

import { GroupAssetsExperience } from '@/components/groups/GroupAssetsExperience'
import { EpisodeReleaseSummary } from '@/types/group'
import { GroupEpisodeAssets } from '@/types/groupAsset'

interface GroupAssetShowcaseProps {
  animeID: number
  groupID: number
  episodes: GroupEpisodeAssets[]
  releaseEpisodes: EpisodeReleaseSummary[]
}

export function GroupAssetShowcase({ animeID, groupID, episodes, releaseEpisodes }: GroupAssetShowcaseProps) {
  return (
    <GroupAssetsExperience
      animeID={animeID}
      groupID={groupID}
      episodes={episodes}
      folderFound={episodes.length > 0}
      releaseEpisodes={releaseEpisodes}
    />
  )
}
