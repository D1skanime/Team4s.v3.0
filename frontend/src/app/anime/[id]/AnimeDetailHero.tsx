import { ExternalLink } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { AnimeInfoBanner, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Badge, Button, Card, Cluster, Divider, Heading, LinkChip, MediaFrame, ResponsiveImage, SplitLayout, Stack, Text } from '@/components/ui'
import type { StackGapPurpose } from '@/components/ui'
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
 * einer wiederverwendbar prüfbaren Seitensektion. Besitzt die äußere Glas-Karte
 * (`Card variant="publicHero"`) und das Zwei-Spalten-Raster (`SplitLayout`) vollständig selbst --
 * lägen beide Ebenen stattdessen in der Seite (`AnimeDetailView.tsx`/`page.module.css`), würde die
 * Storybook-Story dieses Bausteins nie dieselbe Struktur wie die Live-Seite zeigen. Die äußere
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

  const hasTags = Boolean(anime.tags && anime.tags.length > 0)
  const hasStats = Boolean(embySeriesUrl)
  const hasRelated = Boolean(relationsResponse && relationsResponse.data.length > 0)

  // Die Info-Karte hat drei optionale Kinder (Tags-Abschnitt/Statistik-Zeile/Verwandte-Anime-
  // Abschnitt) -- Kinderzahl UND Lücken-Zuordnung wechseln deshalb von Render zu Render. Kinder-
  // und Lücken-Array werden Hand in Hand aufgebaut (Stacks Rhythmus-Array-Modus verlangt exakt
  // einen Zweck-Wert pro Lücke zwischen zwei tatsächlich gerenderten Kindern, siehe Stack.tsx) --
  // ein fest verdrahtetes Array wäre bei fehlendem/zusätzlichem Kind sofort falsch ausgerichtet.
  // Jeder Lückenwert ist live gegen die vormalige CSS-Rhythmusfolge vermessen (siehe SUMMARY).
  const infoCardGap: StackGapPurpose[] = ['headingToBadges', 'primaryContentBlocks']
  const infoCardChildren: ReactNode[] = [
    // Cluster statt eines eigenen display:flex;align-items;justify-content;gap: plus
    // haltepunktabhängiger flex-direction:column-Umkehr -- collapseBelow="md" kippt Titel+Logo
    // unterhalb 768px von einer Zeile auf eine gestapelte Spalte, mit je einem eigenen
    // Lücken-Zweck pro Zustand (Zeile: contentPair=16px, gestapelt: independentBlocks=12px,
    // beide Werte unverändert aus der vormaligen lokalen CSS übernommen).
    <Cluster key="titleRow" collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks" justify="between">
      <Heading level={1} className={styles.title}>{anime.title}</Heading>
      <AnimeTitleLogo title={anime.title} className={styles.titleLogo} />
    </Cluster>,
    <Cluster key="badges" gap="badgeRow" className={styles.badges}>
      <StatusBadge status={anime.status} />
      <Badge variant="neutral">{anime.type.toUpperCase()}</Badge>
      <Badge variant="neutral">{anime.content_type}</Badge>
      <Badge variant="neutral">{anime.year ?? 'n/a'}</Badge>
    </Cluster>,
    <Text key="description" className={styles.description}>{anime.description ?? 'Keine Beschreibung vorhanden.'}</Text>,
  ]

  if (hasTags) {
    infoCardGap.push('primaryContentBlocks')
    infoCardChildren.push(
      // Stack statt eines eigenen display:flex;flex-direction:column;gap: -- exakt dasselbe
      // Eyebrow-Label+Chip-Reihe-Muster wie .genresSection in der Poster-Spalte (ebenfalls Stack
      // gap="relatedContent").
      <Stack key="tags" gap="relatedContent" className={styles.tagsSection}>
        {/* Gleiches Eyebrow-Label-Muster wie "Genres" in der Poster-Spalte (Text statt Heading),
            aber mit dem zum jeweiligen Kartengrund passenden Ton statt eines gemeinsamen fest
            verdrahteten Tons: die Info-Karte ist oben hell (siehe Card.module.css
            .cardPublicHeroInfo), "Tags" bleibt deshalb bei der dunklen Standard-Tonalität (kein
            tone="onScrim", UAT-Entscheidung -- helle Schrift war auf der hellen Fläche praktisch
            unsichtbar). Unterhalb 767px kippt die Karte auf eine einheitlich dunkle Fläche;
            Card.module.css definiert dort zusätzlich zu --heading-color/--text-body-color auch
            Texts eigenen --text-eyebrow-color-Hook um, wodurch "Tags" automatisch mit auf Hell
            kippt. */}
        <Text as="span" variant="eyebrow" id="tags-heading">Tags</Text>
        <Cluster as="ul" gap="badgeRow" className={styles.tagsList} aria-labelledby="tags-heading">
          {anime.tags!.map((tag) => <li key={tag}><LinkChip tone="scrim" href={buildFilterHref('tag', tag)}>{tag}</LinkChip></li>)}
        </Cluster>
      </Stack>,
    )
  }

  if (hasStats) {
    infoCardGap.push('primaryContentBlocks', 'dividerToContent')
    infoCardChildren.push(
      // Divider ersetzt die vormalige border-top-Trennlinie von .statsRow -- spacing="none", weil
      // der komplette Vorlauf-/Nachlauf-Abstand bereits je als eigener Eintrag im Stack-Rhythmus-
      // Array lebt (siehe oben); ein zusätzlicher Eigen-Abstand der Trennlinie selbst würde diesen
      // exakt vermessenen Rhythmus sonst verfälschen.
      <Divider key="statsDivider" tone="onMedia" spacing="none" />,
      <Cluster key="stats" gap="actionRow" className={styles.statsRow}>
        <Button href={embySeriesUrl!} target="_blank" rel="noopener noreferrer" variant="text" size="sm" leftIcon={<ExternalLink size={14} aria-hidden="true" />}>Emby</Button>
      </Cluster>,
    )
  }

  // "none": AnimeInfoBanner bringt über die eigene divider-Prop (siehe unten) bereits ihren
  // vollständigen eigenen Vorlauf-Abstand mit -- nur wenn davor KEIN margin-bottom-tragendes
  // Kind (Tags/Beschreibung, über "primaryContentBlocks") steht, braucht es zusätzlich 0.
  infoCardGap.push(hasStats ? 'none' : 'primaryContentBlocks')
  infoCardChildren.push(
    <AnimeInfoBanner
      key="banner"
      divider={
        <>
          {/* Kräftigere Desktop-Stufe (tone="onMediaStrong") vs. dezentere Mobil-Stufe
              (tone="onMedia", dieselbe Linienfarbe wie statsRow/relatedSection) -- Divider setzt
              seine Farbe/Abstand selbst und erlaubt keinen Fremd-Override von außen, deshalb zwei
              Instanzen statt einer einzigen mit überschriebener Farbe. Die className hier steuert
              ausschließlich die Sichtbarkeit je Haltepunkt (siehe Divider.tsx's eigene Doku). */}
          <Divider tone="onMediaStrong" className={styles.dividerDesktop} />
          <Divider tone="onMedia" className={styles.dividerMobile} />
        </>
      }
    />,
  )

  if (hasRelated) {
    infoCardGap.push('dividedSectionLeadIn', 'dividerToContent')
    infoCardChildren.push(
      // Divider ersetzt die vormalige border-top-Trennlinie von .relatedSection -- derselbe
      // spacing="none"-Mechanismus wie beim Statistik-Divider oben.
      <Divider key="relatedDivider" tone="onMedia" spacing="none" />,
      <div key="related" className={styles.relatedSection}><AnimeRelations relations={relationsResponse!.data} variant="compact" /></div>,
    )
  }

  return (
    <Card variant="publicHero">
      {/* Stack statt zweier direkter Grid-Kinder von Card: der Vorlauf-Abstand zwischen dem
          Zwei-Spalten-Hauptinhalt und der darunterliegenden Randnavigation ist NUR unterhalb von
          deren eigenem Haltepunkt (768px) sichtbar (Stack-Zweck "contentToControlBand", 16px) --
          oberhalb davon nimmt Cluster float="controlBand" sein eigenes Wurzelelement komplett aus
          dem Textfluss (position:absolute), wodurch es an diesem Stack-Abstand gar nicht erst
          teilnimmt (siehe Cluster.tsx's float-Doku für die Begründung, warum genau das
          Wurzelelement selbst dafür zuständig sein muss, nicht nur ein inneres Flex-Kind). */}
      <Stack gap="contentToControlBand">
        {/* align="stretch" reproduziert exakt das bisherige Verhalten: beide Spalten waren vorher
            direkte Kinder EINES CSS-Grids (Standard-align-items:stretch), wodurch die kürzere Karte
            optisch auf die Höhe der höheren gestreckt wurde. SplitLayouts eigener Standard ("start")
            würde diese Streckung verlieren und ein Zero-Pixel-Diff-Regressionsfund wäre die Folge. */}
        <SplitLayout
          gap="none"
          align="stretch"
          firstColumnWidth="poster"
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

              <Stack gap="independentBlocks" className={styles.posterMeta}>
                {/* variant="nested" ist die einzige bestehende, nachweislich transparente
                    Card-Variante (siehe Card.module.css .cardNested) -- trägt hier NUR den
                    Innenabstand (Card-padding-Prop), ohne eine zweite sichtbare Fläche über der
                    Poster-Karte einzuführen. bleedBelowMd ersetzt die vormalige lokale
                    margin-left/-right/justify-items-Mobil-Korrektur von .posterMetaCard
                    vollständig (Card kollabiert ihre eigene horizontale Polsterung unterhalb
                    767px selbst auf 0 und zentriert ihre Grid-Kinder). */}
                <Card variant="nested" padding="nestedBlock" bleedBelowMd className={styles.posterMetaCard}>
                  <WatchlistAddButton animeID={anime.id} />
                  <Divider tone="onMedia" spacing="withinMetaBlock" className={styles.posterDivider} />
                  <Stack gap="relatedContent" className={styles.genresSection}>
                    <Text as="span" variant="eyebrow" tone="onScrim">Genres</Text>
                    <Cluster gap="badgeRow" className={styles.genres}>
                      {anime.genres && anime.genres.length > 0 ? anime.genres.map((genre) => (
                        <LinkChip key={genre} tone="scrim" href={buildFilterHref('genre', genre)}>{genre}</LinkChip>
                      )) : <Text as="span" tone="onScrim">Anime</Text>}
                    </Cluster>
                  </Stack>
                </Card>
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
              <Stack gap={infoCardGap} className={styles.infoCardBody}>
                {infoCardChildren}
              </Stack>
            </Card>
          }
        />
        {edgeNavigation ? (
          // Cluster statt des vormaligen lokalen .edgeNavigationOverlay-<div> -- float="controlBand"
          // übernimmt sowohl das schwebende Band oberhalb 768px als auch die zentrierte, im
          // Textfluss liegende Zeile darunter vollständig selbst (siehe Cluster.tsx).
          <Cluster float="controlBand" justify="center" gap="contentPair">
            {edgeNavigation}
          </Cluster>
        ) : null}
      </Stack>
    </Card>
  )
}
