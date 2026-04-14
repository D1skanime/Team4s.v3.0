'use client'

import { GroupAssetsExperience } from '@/components/groups/GroupAssetsExperience'
import { EpisodeReleaseSummary } from '@/types/group'
import { GroupEpisodeAssets } from '@/types/groupAsset'

/** Props fuer die GroupAssetShowcase-Komponente. */
interface GroupAssetShowcaseProps {
  animeID: number
  groupID: number
  episodes: GroupEpisodeAssets[]
  releaseEpisodes: EpisodeReleaseSummary[]
}

/**
 * Client-seitige Wrapper-Komponente fuer die Gruppen-Asset-Ansicht.
 * Delegiert die Darstellung an GroupAssetsExperience mit den uebergebenen Episoden-Assets und Release-Daten.
 */
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
