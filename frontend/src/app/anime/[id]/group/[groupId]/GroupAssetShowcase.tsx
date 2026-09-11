'use client'

import { GroupAssetsExperience } from '@/components/groups/GroupAssetsExperience'
import { GroupEpisodeAssets } from '@/types/groupAsset'

/** Props für die GroupAssetShowcase-Komponente. */
interface GroupAssetShowcaseProps {
  animeID: number
  groupID: number
  episodes: GroupEpisodeAssets[]
}

/**
 * Client-seitige Wrapper-Komponente für die Gruppen-Asset-Ansicht.
 * Delegiert die Darstellung an GroupAssetsExperience mit den uebergebenen Episoden-Assets.
 * Release-Daten (release_id/episode_id/title) liegen bereits auf jedem episodes-Eintrag selbst.
 */
export function GroupAssetShowcase({ animeID, groupID, episodes }: GroupAssetShowcaseProps) {
  return (
    <GroupAssetsExperience
      animeID={animeID}
      groupID={groupID}
      episodes={episodes}
    />
  )
}
