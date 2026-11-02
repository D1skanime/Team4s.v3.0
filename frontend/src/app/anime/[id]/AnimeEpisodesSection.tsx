import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { Card, ErrorState } from '@/components/ui'
import { getAnimeFansubs } from '@/lib/api'
import { buildFansubStoryGroups } from '@/lib/fansub-summary'
import type { PublicGroupedEpisodesResponse } from '@/types/episodeVersion'

import styles from './page.episodes.module.css'

export interface AnimeEpisodesSectionProps {
  animeID: number
  animeSlug: string
  animeFansubsResponse: Awaited<ReturnType<typeof getAnimeFansubs>> | null
  groupedEpisodesResponse: PublicGroupedEpisodesResponse | null
  fansubStoryGroups: ReturnType<typeof buildFansubStoryGroups>
  episodeCount: number
  rawFansubParam?: string
}

/**
 * Öffentlicher Episoden-Bereich: hält Auswahl, Gruppen-Kontext und Release-Karten in einer
 * tokenbasierten Glas-Karte zusammen; der Browser besitzt weiterhin die fachliche Lade-Logik.
 */
export function AnimeEpisodesSection({
  animeID, animeSlug, animeFansubsResponse, groupedEpisodesResponse, fansubStoryGroups, episodeCount, rawFansubParam,
}: AnimeEpisodesSectionProps) {
  return (
    <Card variant="publicSection" className={styles.episodesSection}>
      {groupedEpisodesResponse ? (
        <FansubVersionBrowser
          key={animeID}
          animeID={animeID}
          animeSlug={animeSlug}
          fansubs={animeFansubsResponse?.data ?? []}
          storyGroups={fansubStoryGroups}
          episodes={groupedEpisodesResponse.data.episodes}
          pagination={groupedEpisodesResponse.data.pagination}
          episodeCount={episodeCount}
          initialActiveSlug={rawFansubParam}
        />
      ) : (
        <ErrorState compact title="Episoden konnten nicht geladen werden" description="Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite neu." />
      )}
    </Card>
  )
}
