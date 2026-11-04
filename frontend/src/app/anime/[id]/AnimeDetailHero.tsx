import { ExternalLink } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { AnimeInfoBanner, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Badge, Button, Card, Cluster, Heading, LinkChip, MediaFrame, ResponsiveImage, SplitLayout, Stack, Text } from '@/components/ui'
import type { AnimeDetail, AnimeRelationsResponse } from '@/types/anime'

import styles from './AnimeDetailHero.module.css'

function buildFilterHref(kind: 'tag' | 'genre', name: string): string {
  return `/suche?${new URLSearchParams({ type: 'anime', [kind]: name }).toString()}`
}

export interface AnimeDetailHeroProps {
  anime: AnimeDetail
  coverUrl: string
  embySeriesUrl: string | null
  relationsResponse: AnimeRelationsResponse | null
  /** Randnavigations-Overlay-Inhalt (üblicherweise `<AnimeEdgeNavigation .../>`) -- optional, da
   *  nicht jeder Aufrufer (z. B. eine Storybook-Story ohne Grid-Kontext) eine Randnavigation
   *  anzeigen kann/soll. Wird als eigenständiger Slot gerendert, nicht als `children`, damit
   *  dieser Baustein weiterhin ausschließlich über benannte, typisierte Props komponiert wird. */
  edgeNavigation?: ReactNode
}

/**
 * Öffentlicher Anime-Kopf: verbindet Poster, Merklisten-Aktion und die inhaltliche Info-Karte zu
 * einer wiederverwendbar prüfbaren Seitensektion. Besitzt seit Befund 21/22 die äußere Glas-Karte
 * (`Card variant="publicHero"`) und das Zwei-Spalten-Raster (`SplitLayout`) vollständig selbst --
 * vorher lagen beide Ebenen in der Seite (`AnimeDetailView.tsx`/`page.module.css`), wodurch die
 * Storybook-Story dieses Bausteins nie dieselbe Struktur wie die Live-Seite zeigte. Die äußere
 * Card bleibt dabei bewusst das EINZIGE Grid-Kind des übergeordneten Hero-Rahmens -- die beiden
 * inneren Cards (Poster/Info) sitzen nicht direkt als Geschwister im Hero-Grid, sondern innerhalb
 * von `SplitLayout`s eigenem Zwei-Spalten-Raster (siehe 192-RESEARCH.md Pitfall 3: zwei direkte
 * Card-Geschwister im Hero-Grid würden die responsive Zwei-Spalten-Logik komplett verlieren,
 * sobald die Seite ihren alten `--card-public-hero-columns`-Hook nicht mehr setzt).
 * Datenbeschaffung bleibt bei der Seite.
 */
export function AnimeDetailHero({ anime, coverUrl, embySeriesUrl, relationsResponse, edgeNavigation }: AnimeDetailHeroProps) {
  const posterEpisodeCount = anime.max_episodes ?? 0
  const posterEpisodeBadge = posterEpisodeCount > 0
    ? <Badge variant="onMedia">{posterEpisodeCount === 1 ? '1 Folge' : `${posterEpisodeCount} Folgen`}</Badge>
    : null

  return (
    <Card variant="publicHero">
      {/* align="stretch" reproduziert exakt das bisherige Verhalten: beide Spalten waren vorher
          direkte Kinder EINES CSS-Grids (Standard-align-items:stretch), wodurch die kürzere Karte
          optisch auf die Höhe der höheren gestreckt wurde. SplitLayouts eigener Standard ("start")
          würde diese Streckung verlieren und ein Zero-Pixel-Diff-Regressionsfund wäre die Folge. */}
      <SplitLayout
        className={styles.heroSplit}
        breakpoint="md"
        align="stretch"
        firstColumn={
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

            <Stack gap="3" className={styles.posterMeta}>
              <WatchlistAddButton animeID={anime.id} />
              <hr className={styles.posterDivider} />
              <Stack gap="2" className={styles.genresSection}>
                <Text as="span" variant="eyebrow" tone="onScrim">Genres</Text>
                <Cluster gap="2" className={styles.genres}>
                  {anime.genres && anime.genres.length > 0 ? anime.genres.map((genre) => (
                    <LinkChip key={genre} tone="scrim" href={buildFilterHref('genre', genre)}>{genre}</LinkChip>
                  )) : <Text as="span" tone="onScrim">Anime</Text>}
                </Cluster>
              </Stack>
            </Stack>
          </Card>
        }
        secondColumn={
          /* publicHeroInfo ist oben nahezu opak HELL (siehe Card.module.css), anders als die
             übrigen dunklen Glasflächen dieser Seite -- Titel/Beschreibung bleiben deshalb bei der
             dunklen Standard-Textfarbe (kein tone="onScrim"). Unterhalb 767px kippt die Karte auf
             eine einheitlich dunkle Fläche; Card.module.css setzt dort Heading/Texts eigene
             Override-Hooks (--heading-color/--text-body-color) innerhalb von .cardPublicHeroInfo,
             wodurch Titel/Beschreibung automatisch mit auf Hell kippen -- keine eigene Farbregel in
             dieser Seite nötig. */
          <Card variant="publicHeroInfo" className={styles.infoCard}>
            <div className={styles.infoCardBody}>
              <div className={styles.titleRow}>
                <Heading level={1} className={styles.title}>{anime.title}</Heading>
                <AnimeTitleLogo title={anime.title} className={styles.titleLogo} />
              </div>
              <Cluster gap="2" className={styles.badges}>
                <StatusBadge status={anime.status} />
                <Badge variant="neutral">{anime.type.toUpperCase()}</Badge>
                <Badge variant="neutral">{anime.content_type}</Badge>
                <Badge variant="neutral">{anime.year ?? 'n/a'}</Badge>
              </Cluster>
              <Text className={styles.description}>{anime.description ?? 'Keine Beschreibung vorhanden.'}</Text>
              {anime.tags && anime.tags.length > 0 ? (
                <div className={styles.tagsSection}>
                  {/* Gleiches Eyebrow-Label-Muster wie "Genres" in der Poster-Spalte (Text statt
                      Heading), aber mit dem zum jeweiligen Kartengrund passenden Ton statt eines
                      gemeinsamen fest verdrahteten Tons: die Info-Karte ist oben hell (siehe
                      Card.module.css .cardPublicHeroInfo), "Tags" bleibt deshalb bei der dunklen
                      Standard-Tonalität (kein tone="onScrim", UAT-Entscheidung -- helle Schrift war
                      auf der hellen Fläche praktisch unsichtbar). Unterhalb 767px kippt die Karte auf
                      eine einheitlich dunkle Fläche; Card.module.css definiert dort zusätzlich zu
                      --heading-color/--text-body-color auch Texts eigenen --text-eyebrow-color-Hook
                      um, wodurch "Tags" automatisch mit auf Hell kippt. */}
                  <Text as="span" variant="eyebrow" id="tags-heading">Tags</Text>
                  <Cluster as="ul" gap="2" className={styles.tagsList} aria-labelledby="tags-heading">
                    {anime.tags.map((tag) => <li key={tag}><LinkChip tone="scrim" href={buildFilterHref('tag', tag)}>{tag}</LinkChip></li>)}
                  </Cluster>
                </div>
              ) : null}
              {embySeriesUrl ? (
                <Cluster gap="5" className={styles.statsRow}>
                  <Button href={embySeriesUrl} target="_blank" rel="noopener noreferrer" variant="text" size="sm" leftIcon={<ExternalLink size={14} aria-hidden="true" />}>Emby</Button>
                </Cluster>
              ) : null}
              <AnimeInfoBanner className={styles.infoBanner} dividerClassName={styles.divider} />
              {relationsResponse && relationsResponse.data.length > 0 ? <div className={styles.relatedSection}><AnimeRelations relations={relationsResponse.data} variant="compact" /></div> : null}
            </div>
          </Card>
        }
      />
      {edgeNavigation ? <div className={styles.edgeNavigationOverlay}>{edgeNavigation}</div> : null}
    </Card>
  )
}
