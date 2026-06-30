'use client'

import { Fragment, useState, type UIEvent } from 'react'
import { ChevronDown, ChevronRight, Pencil, X } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'

import styles from '../page.module.css'

const releaseRows = [
  {
    episode: '1',
    title: 'Entscheidungsschlacht auf dem Delmo-Stützpunkt',
    versions: '1',
    date: '23.4.2026',
    status: 'Aktiv',
    assets: 'Vorhanden',
  },
  {
    episode: '2',
    title: 'Der ehrenwerte Enkel',
    versions: '1',
    date: '24.4.2026',
    status: 'Aktiv',
    assets: '-',
  },
  {
    episode: '3',
    title: 'Die versiegelte Botschaft der Nebelwache',
    versions: '1',
    date: '25.4.2026',
    status: 'Aktiv',
    assets: 'Vorhanden',
  },
  {
    episode: '4',
    title: 'Das letzte Signal aus dem Nordtor',
    versions: '2',
    date: '26.4.2026',
    status: 'Aktiv',
    assets: '-',
  },
  {
    episode: '5',
    title: 'Unter dem roten Mond von Konoha',
    versions: '1',
    date: '27.4.2026',
    status: 'Aktiv',
    assets: 'Vorhanden',
  },
  {
    episode: '6',
    title: 'Der Pfad durch den verwunschenen Wald',
    versions: '1',
    date: '28.4.2026',
    status: 'Aktiv',
    assets: '-',
  },
  {
    episode: '7',
    title: 'Sturm über dem Trainingsgelände',
    versions: '1',
    date: '29.4.2026',
    status: 'Aktiv',
    assets: 'Vorhanden',
  },
  {
    episode: '8',
    title: 'Rückkehr des stillen Verbündeten',
    versions: '3',
    date: '30.4.2026',
    status: 'Aktiv',
    assets: '-',
  },
]

const INITIAL_RELEASE_BATCH_SIZE = 5

const animeReleaseCards = [
  {
    title: 'Naruto',
    type: 'TV-Serie',
    helper: '',
    releases: 2,
    bannerLabel: 'NARUTO',
    expanded: true,
  },
  {
    title: 'Bleach',
    type: 'TV-Serie',
    helper: '',
    releases: 3,
    bannerLabel: 'BLEACH',
    expanded: false,
  },
  {
    title: 'Agukaru: Agriculture Angel Baraki - Play with Ibaraki Hen',
    type: 'OVA',
    helper: '',
    releases: 4,
    bannerLabel: 'AGUKARU',
    expanded: false,
  },
]

function TimelinePreview() {
  return (
    <div className={styles.releaseTimelinePreview}>
      <div className={styles.releaseTimelineHeader}>
        <div>
          <strong>Theme-Segmente</strong>
        </div>
      </div>
      <div className={styles.releaseTimelineLegend} aria-label="Timeline-Legende">
        <span className={styles.releaseTimelineLegendItem}>
          <Badge variant="danger" className={styles.releaseTimelineLegendBadge}>Global</Badge>
        </span>
        <span className={styles.releaseTimelineLegendItem}>
          <Badge variant="success" className={styles.releaseTimelineLegendBadge}>Uploadet</Badge>
        </span>
        <span className={styles.releaseTimelineLegendItem}>
          <Badge variant="warning" className={styles.releaseTimelineLegendBadge}>Fehlt</Badge>
        </span>
      </div>
      <div className={styles.releaseTimelineScale}>
        <span>Dauer 00:23:03</span>
      </div>
      <div className={styles.releaseTimelineLane}>
        <div className={styles.releaseTimelineTrack}>
          <button type="button" className={`${styles.releaseTimelineSegment} ${styles.releaseTimelineSegmentGlobal} ${styles.releaseTimelineSegmentOp}`} style={{ left: '8%', width: '12%' }}>
            OP
          </button>
          <div className={styles.releaseTimelineMainContent} style={{ left: '0%', width: '100%' }}>
            Hauptinhalt
          </div>
          <button type="button" className={`${styles.releaseTimelineSegment} ${styles.releaseTimelineSegmentSelected} ${styles.releaseTimelineSegmentIn}`} style={{ left: '56%', width: '12%' }}>
            IN
          </button>
          <button type="button" className={`${styles.releaseTimelineSegment} ${styles.releaseTimelineSegmentRelease} ${styles.releaseTimelineSegmentEd}`} style={{ left: '88%', width: '12%' }}>
            ED
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReleaseCompositionShowcase() {
  const [animeEntryOpen, setAnimeEntryOpen] = useState(true)
  const [releaseRowOpen, setReleaseRowOpen] = useState(true)
  const [visibleReleaseCount, setVisibleReleaseCount] = useState(INITIAL_RELEASE_BATCH_SIZE)

  const visibleReleaseRows = releaseRows.slice(0, visibleReleaseCount)

  function loadMoreVisibleReleaseRows() {
    setVisibleReleaseCount((current) => {
      if (current >= releaseRows.length) return current
      return Math.min(current + INITIAL_RELEASE_BATCH_SIZE, releaseRows.length)
    })
  }

  function handleReleaseRowsScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 36) return
    loadMoreVisibleReleaseRows()
  }

  function toggleAnimeEntryOpen() {
    if (animeEntryOpen) {
      setVisibleReleaseCount(INITIAL_RELEASE_BATCH_SIZE)
      setReleaseRowOpen(true)
    }
    setAnimeEntryOpen((current) => !current)
  }

  function renderMobilePreview() {
    return (
      <Card variant="section" className={`${styles.releaseAreaCard} ${styles.releaseAreaCardMobile}`}>
        <SectionHeader
          eyebrow="Fansub-Detail"
          title="Anime und Veröffentlichungen"
          description="Ein Hauptbereich enthält aufklappbare Anime-Einträge. Jeder Eintrag öffnet eine Tabelle, und einzelne Zeilen können darunter ein Detailpanel einblenden."
        />
        {animeReleaseCards.map((anime) => {
          const isOpen = anime.expanded ? animeEntryOpen : false
          return (
            <Card
              key={`mobile-${anime.title}`}
              variant="nested"
              className={`${styles.animeAccordionCard} ${styles.animeAccordionCardMobile}`}
            >
              <button
                type="button"
                className={`${styles.animeAccordionHeader} ${styles.animeAccordionHeaderMobile}`}
                onClick={() => { if (anime.expanded) toggleAnimeEntryOpen() }}
                aria-expanded={isOpen}
                aria-label={isOpen ? `${anime.title} einklappen` : `${anime.title} ausklappen`}
              >
                <div className={styles.animeBannerMock}>{anime.bannerLabel}</div>
                <div className={styles.animeAccordionMeta}>
                  <strong>{anime.title}</strong>
                  <span className={styles.animeAccordionType}>{anime.type}</span>
                  <span className={styles.animeAccordionReleaseCount}>Releases: {anime.releases}</span>
                  {anime.helper ? <p>{anime.helper}</p> : null}
                </div>
                <div className={`${styles.animeAccordionAside} ${styles.animeAccordionAsideMobile}`}>
                  <span className={styles.disclosureIcon} aria-hidden="true">
                    {isOpen ? <ChevronDown size={30} /> : <ChevronRight size={30} />}
                  </span>
                </div>
              </button>
              {isOpen ? (
                <div className={`${styles.releaseTableShell} ${styles.tableSurfaceBPrevious}`}>
                  <div className={styles.mobileEpisodeScroller} onScroll={handleReleaseRowsScroll}>
                    <div className={styles.mobileEpisodeList}>
                      {visibleReleaseRows.map((row, index) => (
                        <Card key={`mobile-episode-${row.episode}`} variant="nestedFlat" className={styles.mobileEpisodeCard}>
                          <button
                            type="button"
                            className={styles.mobileEpisodeHeader}
                            onClick={() => { if (index === 0) setReleaseRowOpen((current) => !current) }}
                            aria-expanded={index === 0 ? releaseRowOpen : false}
                            aria-label={index === 0 ? (releaseRowOpen ? `${row.title} einklappen` : `${row.title} ausklappen`) : `${row.title} anzeigen`}
                          >
                            <div className={styles.mobileEpisodeTitle}>
                              <strong>Episode {row.episode}: {row.title}</strong>
                              <span>Version {row.versions}</span>
                            </div>
                            <span className={styles.disclosureIconInline} aria-hidden="true">
                              {index === 0 ? (releaseRowOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <ChevronRight size={18} />}
                            </span>
                          </button>
                          <div className={styles.mobileEpisodeMeta}>
                            {row.assets === '-' ? (
                              <span className={styles.themeMissingMark}><X size={22} strokeWidth={3.6} /></span>
                            ) : (
                              <Badge variant="muted">Vorhanden</Badge>
                            )}
                          </div>
                          <div className={styles.mobileEpisodeActions}>
                            <Button size="sm" leftIcon={<Pencil size={14} />}>Editieren</Button>
                          </div>
                          {index === 0 && releaseRowOpen ? (
                            <div className={styles.mobileEpisodeDetail}>
                              <TimelinePreview />
                            </div>
                          ) : null}
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          )
        })}
      </Card>
    )
  }

  return (
    <section className={styles.releaseCompositionShell} aria-labelledby="composition-7-title">
      <div className={styles.releaseCompositionIntro}>
        <h3 id="composition-7-title">Komposition 7 – Card → Accordion → Tabelle → Detailpanel</h3>
        <p>Mock für `Anime und Veröffentlichungen`: Hauptbereich, Anime-Eintrag, Tabelle und geöffnete Episoden-Detailzeile.</p>
      </div>
      <div className={styles.releaseViewportGrid}>
        <div className={styles.releaseViewportPane}>
          <span className={styles.releaseViewportLabel}>Desktop</span>
          <Card variant="section" className={styles.releaseAreaCard}>
            <SectionHeader
              eyebrow="Fansub-Detail"
              title="Anime und Veröffentlichungen"
              description="Ein Hauptbereich enthält aufklappbare Anime-Einträge. Jeder Eintrag öffnet eine Tabelle, und einzelne Zeilen können darunter ein Detailpanel einblenden."
            />
            {animeReleaseCards.map((anime) => {
              const isOpen = anime.expanded ? animeEntryOpen : false
              return (
                <Card key={anime.title} variant="nested" className={styles.animeAccordionCard}>
                  <button
                    type="button"
                    className={styles.animeAccordionHeader}
                    onClick={() => { if (anime.expanded) toggleAnimeEntryOpen() }}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `${anime.title} einklappen` : `${anime.title} ausklappen`}
                  >
                    <div className={styles.animeBannerMock}>{anime.bannerLabel}</div>
                    <div className={styles.animeAccordionMeta}>
                      <strong>{anime.title}</strong>
                      <span className={styles.animeAccordionType}>{anime.type}</span>
                      <span className={styles.animeAccordionReleaseCount}>Releases: {anime.releases}</span>
                      {anime.helper ? <p>{anime.helper}</p> : null}
                    </div>
                    <div className={styles.animeAccordionAside}>
                      <span className={styles.disclosureIcon} aria-hidden="true">
                        {isOpen ? <ChevronDown size={30} /> : <ChevronRight size={30} />}
                      </span>
                    </div>
                  </button>
                  {isOpen ? (
                    <div className={`${styles.releaseTableShell} ${styles.tableSurfaceBPrevious}`}>
                      <div className={styles.releaseTableScroller} onScroll={handleReleaseRowsScroll}>
                        <Table variant="withActions" containerClassName={`${styles.tableWrapHeaderLineWine} ${styles.releaseTableSticky}`}>
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell>Episode</TableHeaderCell>
                              <TableHeaderCell>Titel</TableHeaderCell>
                              <TableHeaderCell>Version</TableHeaderCell>
                              <TableHeaderCell>Themes</TableHeaderCell>
                              <TableHeaderCell>Aktionen</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {visibleReleaseRows.map((row, index) => (
                              <Fragment key={`release-body-${row.episode}`}>
                                <TableRow>
                                  <TableCell>{row.episode}</TableCell>
                                  <TableCell>
                                    <button
                                      type="button"
                                      className={styles.releaseTitleButton}
                                      onClick={() => { if (index === 0) setReleaseRowOpen((current) => !current) }}
                                      aria-expanded={index === 0 ? releaseRowOpen : false}
                                      aria-label={index === 0 ? (releaseRowOpen ? `${row.title} einklappen` : `${row.title} ausklappen`) : `${row.title} anzeigen`}
                                    >
                                      <div className={styles.releaseTitleCell}>
                                        <strong>{row.title}</strong>
                                      </div>
                                      <span className={styles.disclosureIconInline} aria-hidden="true">
                                        {index === 0 ? (releaseRowOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
                                      </span>
                                    </button>
                                  </TableCell>
                                  <TableCell>{row.versions}</TableCell>
                                  <TableCell>
                                    {row.assets === '-' ? (
                                      <span className={styles.themeMissingMark}><X size={22} strokeWidth={3.6} /></span>
                                    ) : (
                                      'Vorhanden'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className={styles.releaseRowActions}>
                                      <Button size="sm" leftIcon={<Pencil size={14} />}>Editieren</Button>
                                      <button
                                        type="button"
                                        className={styles.releaseRowDisclosure}
                                        onClick={() => { if (index === 0) setReleaseRowOpen((current) => !current) }}
                                        aria-expanded={index === 0 ? releaseRowOpen : false}
                                        aria-label={index === 0 ? (releaseRowOpen ? `${row.title} einklappen` : `${row.title} ausklappen`) : `${row.title} anzeigen`}
                                      >
                                        {index === 0 ? (releaseRowOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />) : <ChevronRight size={24} />}
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {index === 0 && releaseRowOpen ? (
                                  <tr className={styles.releaseExpandedRow}>
                                    <td colSpan={5}>
                                      <Card variant="nested" className={styles.releaseExpandedPanel}>
                                        <TimelinePreview />
                                      </Card>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </Card>
              )
            })}
          </Card>
        </div>
        <div className={styles.releaseViewportPane}>
          <span className={styles.releaseViewportLabel}>Mobile</span>
          <div className={styles.releaseViewportMobileFrame}>
            {renderMobilePreview()}
          </div>
        </div>
      </div>
    </section>
  )
}
