import { ExternalLink } from 'lucide-react'
import type { CSSProperties } from 'react'

import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { AnimeInfoBanner, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Badge, Button, Card, Heading, LinkChip, MediaFrame, ResponsiveImage, Text } from '@/components/ui'
import type { AnimeDetail, AnimeRelationsResponse } from '@/types/anime'

import styles from './AnimeDetailView.styles'

function buildFilterHref(kind: 'tag' | 'genre', name: string): string {
  return `/suche?${new URLSearchParams({ type: 'anime', [kind]: name }).toString()}`
}

export interface AnimeDetailHeroProps {
  anime: AnimeDetail
  coverUrl: string
  embySeriesUrl: string | null
  relationsResponse: AnimeRelationsResponse | null
}

/**
 * Öffentlicher Anime-Kopf: verbindet Poster, Merklisten-Aktion und die inhaltliche Info-Karte
 * zu einer wiederverwendbar prüfbaren Seitensektion. Datenbeschaffung bleibt bei der Seite.
 */
export function AnimeDetailHero({ anime, coverUrl, embySeriesUrl, relationsResponse }: AnimeDetailHeroProps) {
  const posterEpisodeCount = anime.max_episodes ?? 0
  const posterEpisodeBadge = posterEpisodeCount > 0
    ? <Badge variant="onMedia">{posterEpisodeCount === 1 ? '1 Folge' : `${posterEpisodeCount} Folgen`}</Badge>
    : null

  return (
    <>
      <Card variant="publicPoster" className={styles.posterColumn}>
        <div className={styles.posterWrapper} style={{ '--poster-image': `url("${coverUrl}")` } as CSSProperties}>
          <MediaFrame variant="posterFade" backdropImage={coverUrl} aspectRatio={2 / 3} bottomBadge={posterEpisodeBadge} className={styles.poster}>
            <ResponsiveImage
              src={coverUrl}
              alt={anime.title}
              fill
              sizes="(max-width: 767px) 160px, (max-width: 1023px) 220px, 260px"
              priority
              unoptimized
            />
          </MediaFrame>
        </div>

        <div className={styles.posterMeta}>
          <WatchlistAddButton animeID={anime.id} />
          <hr className={styles.posterDivider} />
          <div className={styles.genresSection}>
            <Text as="span" variant="eyebrow" tone="onScrim">Genres</Text>
            <div className={styles.genres}>
              {anime.genres && anime.genres.length > 0 ? anime.genres.map((genre) => (
                <LinkChip key={genre} tone="scrim" href={buildFilterHref('genre', genre)}>{genre}</LinkChip>
              )) : <Text as="span" tone="onScrim">Anime</Text>}
            </div>
          </div>
        </div>
      </Card>

      {/* publicHeroInfo ist oben nahezu opak HELL (siehe Card.module.css), anders als die
          übrigen dunklen Glasflächen dieser Seite -- Titel/Beschreibung bleiben deshalb bei der
          dunklen Standard-Textfarbe (kein tone="onScrim"). Unterhalb 767px kippt die Karte auf
          eine einheitlich dunkle Fläche; .title/.description kippen dort über eine eigene
          Media-Query in page.infoCard.module.css mit, auf hell. */}
      <Card variant="publicHeroInfo" className={styles.infoCard}>
        <div className={styles.infoCardBody}>
          <div className={styles.titleRow}>
            <Heading level={1} className={styles.title}>{anime.title}</Heading>
            <AnimeTitleLogo title={anime.title} className={styles.titleLogo} />
          </div>
          <div className={styles.badges}>
            <StatusBadge status={anime.status} />
            <Badge variant="neutral">{anime.type.toUpperCase()}</Badge>
            <Badge variant="neutral">{anime.content_type}</Badge>
            <Badge variant="neutral">{anime.year ?? 'n/a'}</Badge>
          </div>
          <Text className={styles.description}>{anime.description ?? 'Keine Beschreibung vorhanden.'}</Text>
          {anime.tags && anime.tags.length > 0 ? (
            <div className={styles.tagsSection}>
              <Heading level={2} size={4} tone="onScrim" id="tags-heading">Tags</Heading>
              <ul className={styles.tagsList} aria-labelledby="tags-heading">
                {anime.tags.map((tag) => <li key={tag}><LinkChip tone="scrim" href={buildFilterHref('tag', tag)}>{tag}</LinkChip></li>)}
              </ul>
            </div>
          ) : null}
          {embySeriesUrl ? (
            <div className={styles.statsRow}>
              <Button href={embySeriesUrl} target="_blank" rel="noopener noreferrer" variant="text" size="sm" leftIcon={<ExternalLink size={14} aria-hidden="true" />}>Emby</Button>
            </div>
          ) : null}
          <AnimeInfoBanner className={styles.infoBanner} dividerClassName={styles.divider} />
          {relationsResponse && relationsResponse.data.length > 0 ? <div className={styles.relatedSection}><AnimeRelations relations={relationsResponse.data} variant="compact" /></div> : null}
        </div>
      </Card>
    </>
  )
}
