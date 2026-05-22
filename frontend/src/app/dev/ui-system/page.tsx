'use client'

import { Fragment, useEffect, useState, type UIEvent } from 'react'
import { ArrowRight, ChevronDown, ChevronRight, Filter, MoreHorizontal, PanelRight, Pencil, Search, Upload, X } from 'lucide-react'

import {
  ActionBar,
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Textarea,
  Toolbar,
} from '@/components/ui'
import { RichTextEditor } from '@/components/editor'

import styles from './page.module.css'

const tokenSwatches = [
  { name: 'Canvas', variable: '--surface-canvas', color: '#f6f4ef' },
  { name: 'Card', variable: '--surface-card', color: '#ffffff' },
  { name: 'Accent', variable: '--accent-primary', color: '#2d5fe8' },
  { name: 'Success', variable: '--color-success', color: '#28a745' },
]

const tableRows = [
  { name: 'Anime no Hikari', status: 'Aktiv', owners: '3 Rollen', progress: '12 Versionen' },
  { name: 'Pixel Fansubs', status: 'Pausiert', owners: '1 Rolle', progress: '4 Versionen' },
  { name: 'T4 Archive Lab', status: 'Read-only', owners: '2 Rollen', progress: '27 Assets' },
]

function getTableStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'Aktiv':
      return 'success'
    case 'Pausiert':
      return 'danger'
    case 'Read-only':
      return 'warning'
    default:
      return 'info'
  }
}

const listItems = [
  { title: 'Rollenpflege anstoßen', meta: 'Sekundäre Aktion', badge: 'offen' },
  { title: 'Notizen prüfen', meta: 'Kontext sichtbar halten', badge: 'neu' },
  { title: 'Medienfreigabe vorbereiten', meta: 'Spätere Drawer-Aktion', badge: 'bereit' },
]

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
    title: 'Sturm Ã¼ber dem TrainingsgelÃ¤nde',
    versions: '1',
    date: '29.4.2026',
    status: 'Aktiv',
    assets: 'Vorhanden',
  },
  {
    episode: '8',
    title: 'RÃ¼ckkehr des stillen VerbÃ¼ndeten',
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

export default function UISystemPlaygroundPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(2)
  const [animeEntryOpen, setAnimeEntryOpen] = useState(true)
  const [releaseRowOpen, setReleaseRowOpen] = useState(true)
  const [visibleReleaseCount, setVisibleReleaseCount] = useState(INITIAL_RELEASE_BATCH_SIZE)
  const [projectNoteTitle, setProjectNoteTitle] = useState('ffff')
  const [projectNoteVisibility, setProjectNoteVisibility] = useState<'internal' | 'public'>('internal')
  const [projectNoteStatus, setProjectNoteStatus] = useState<'draft' | 'published' | 'archived' | 'deleted'>('draft')
  const [projectNoteBody, setProjectNoteBody] = useState<unknown>({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hunter X Hunter 99 - Ep.62' }],
      },
    ],
  })
  const visibleReleaseRows = releaseRows.slice(0, visibleReleaseCount)

  useEffect(() => {
    if (!animeEntryOpen) {
      setVisibleReleaseCount(INITIAL_RELEASE_BATCH_SIZE)
      setReleaseRowOpen(true)
    }
  }, [animeEntryOpen])

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

  function renderAnimeReleasePreview(mode: 'desktop' | 'mobile') {
    return (
      <Card variant="section" className={`${styles.releaseAreaCard} ${mode === 'mobile' ? styles.releaseAreaCardMobile : ''}`}>
        <SectionHeader
          eyebrow="Fansub-Detail"
          title="Anime und Veröffentlichungen"
          description="Ein Hauptbereich enthält aufklappbare Anime-Einträge. Jeder Eintrag öffnet eine Tabelle, und einzelne Zeilen können darunter ein Detailpanel einblenden."
        />

        {animeReleaseCards.map((anime) => {
          const isOpen = anime.expanded ? animeEntryOpen : false
          return (
            <Card
              key={`${mode}-${anime.title}`}
              variant="nested"
              className={`${styles.animeAccordionCard} ${mode === 'mobile' ? styles.animeAccordionCardMobile : ''}`}
            >
              <button
                type="button"
                className={`${styles.animeAccordionHeader} ${mode === 'mobile' ? styles.animeAccordionHeaderMobile : ''}`}
                onClick={() => {
                  if (anime.expanded) setAnimeEntryOpen((current) => !current)
                }}
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
                <div className={`${styles.animeAccordionAside} ${mode === 'mobile' ? styles.animeAccordionAsideMobile : ''}`}>
                  <span className={styles.disclosureIcon} aria-hidden="true">
                    {isOpen ? <ChevronDown size={30} /> : <ChevronRight size={30} />}
                  </span>
                </div>
              </button>

              {isOpen ? (
                <div className={`${styles.releaseTableShell} ${styles.tableSurfaceBPrevious}`}>
                  {mode === 'mobile' ? (
                    <div className={styles.mobileEpisodeScroller} onScroll={handleReleaseRowsScroll}>
                      <div className={styles.mobileEpisodeList}>
                      {visibleReleaseRows.map((row, index) => (
                        <Card key={`${mode}-episode-${row.episode}`} variant="nestedFlat" className={styles.mobileEpisodeCard}>
                          <button
                            type="button"
                            className={styles.mobileEpisodeHeader}
                            onClick={() => {
                              if (index === 0) setReleaseRowOpen((current) => !current)
                            }}
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
                            </div>
                          ) : null}
                        </Card>
                      ))}
                      </div>
                    </div>
                  ) : (
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
                        <Fragment key={`${mode}-release-body-${row.episode}`}>
                          <TableRow>
                            <TableCell>{row.episode}</TableCell>
                            <TableCell>
                              <button
                                type="button"
                                className={styles.releaseTitleButton}
                                onClick={() => {
                                  if (index === 0) setReleaseRowOpen((current) => !current)
                                }}
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
                                  onClick={() => {
                                    if (index === 0) setReleaseRowOpen((current) => !current)
                                  }}
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
                                </Card>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  )}
                </div>
              ) : null}
            </Card>
          )
        })}
      </Card>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PageHeader
          eyebrow="Interne Dev-Route"
          title="Team4s UI-System-Labor"
          description="Design-Tokens, generische UI-Komponenten und typische Oberflächenkompositionen an einem Ort prüfen, bevor echte Seiten migriert werden."
          breadcrumbs={(
            <ol className={styles.metaList}>
              <li><Badge variant="muted">/dev</Badge></li>
              <li><Badge variant="info">ui-system</Badge></li>
            </ol>
          )}
          actions={(
            <div className={styles.buttonRow}>
              <Button variant="secondary" onClick={() => setDrawerOpen(true)} leftIcon={<PanelRight size={16} />}>
                Drawer öffnen
              </Button>
              <Button onClick={() => setModalOpen(true)} rightIcon={<ArrowRight size={16} />}>
                Modal prüfen
              </Button>
            </div>
          )}
        />

        <div className={styles.introGrid}>
          <Card variant="section" title="Zweck dieser Seite" description="Das Labor zeigt die neue globale UI-Basis isoliert, mit Mockdaten und ohne Produktlogik.">
            <div className={styles.stack}>
              <div className={styles.metaList}>
                <Badge variant="neutral">Design Tokens</Badge>
                <Badge variant="neutral">UI-Primitives</Badge>
                <Badge variant="neutral">Kompositionen</Badge>
              </div>
              <p>Die Oberfläche soll ruhiger, konsistenter und wartbarer wirken als die bisherigen ad-hoc Admin-Muster, ohne die produktiven Seiten in dieser Phase breit umzubauen.</p>
            </div>
          </Card>

          <Card variant="elevated" title="Playground-Regeln" description="Ausschließlich Mockdaten und keine Auth-, API- oder Permission-Seams.">
            <ul className={styles.list}>
              <li className={styles.listItem}><span>Keine API-Aufrufe</span><Badge variant="success">aktiv</Badge></li>
              <li className={styles.listItem}><span>Keine Team4s-Fachlogik in `src/components/ui`</span><Badge variant="success">aktiv</Badge></li>
              <li className={styles.listItem}><span>Keine breite Seitenmigration in 48A</span><Badge variant="warning">bewusst später</Badge></li>
            </ul>
          </Card>
        </div>

        <Card variant="section">
          <SectionHeader
            eyebrow="01"
            title="Design Tokens Preview"
            description="Die visuelle Basis bleibt ruhig und neutral, mit einem kühleren blau-tealigen Akzent für Primäraktionen und klare Hierarchie."
          />
          <div className={styles.tokenGrid}>
            {tokenSwatches.map((swatch) => (
              <div key={swatch.variable} className={styles.swatch} style={{ background: swatch.color }}>
                <strong>{swatch.name}</strong>
                <code>{swatch.variable}</code>
              </div>
            ))}
          </div>
          <div className={styles.showcaseGrid}>
            <Card variant="flat" title="Radius" description="Harmonische Rundungen statt vieler Zufallswerte.">
              <div className={styles.radiusRow}>
                <div className={styles.radiusSample} style={{ borderRadius: '12px' }}><code>sm</code></div>
                <div className={styles.radiusSample} style={{ borderRadius: '14px' }}><code>md</code></div>
                <div className={styles.radiusSample} style={{ borderRadius: '20px' }}><code>lg</code></div>
              </div>
            </Card>
            <Card variant="flat" title="Schatten" description="Zurückhaltend und nur zur Hierarchie, nicht als 2015-Panel-Effekt.">
              <div className={styles.shadowRow}>
                <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-xs)' }}><code>xs</code></div>
                <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-sm)' }}><code>sm</code></div>
                <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-md)' }}><code>md</code></div>
              </div>
            </Card>
            <Card variant="flat" title="Spacing" description="Abstände werden über Tokens statt über page-lokale Magic Numbers geführt.">
              <div className={styles.spacingRow}>
                <div className={styles.spacingSample}><code>space-3</code></div>
                <div className={styles.spacingSample}><code>space-5</code></div>
                <div className={styles.spacingSample}><code>space-7</code></div>
              </div>
            </Card>
            <Card variant="flat" title="Typografie" description="Klare Hierarchie mit ruhigen Fließtextfarben und kräftigeren Titeln.">
              <div className={styles.stack}>
                <div className={styles.tokenLine}><strong>Titel</strong><code>--text-strong</code></div>
                <div className={styles.tokenLine}><span>Body Copy</span><code>--text-body</code></div>
                <div className={styles.tokenLine}><span>Metatext</span><code>--text-soft / --text-faint</code></div>
              </div>
            </Card>
          </div>
        </Card>

        <div className={styles.showcaseGrid}>
          <Card variant="section">
            <SectionHeader eyebrow="02" title="Button Showcase" description="Bewusst begrenzte Varianten statt neuer page-lokaler Spezialklassen." />
            <div className={styles.buttonRow}>
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Save</Button>
              <Button iconOnly aria-label="Mehr Optionen"><MoreHorizontal size={16} /></Button>
              <Button loading>Lädt</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </Card>

          <Card variant="section">
            <SectionHeader eyebrow="03" title="Card Showcase" description="Cards tragen die Hierarchie, nicht schwere Panelrahmen." />
            <div className={styles.stack}>
              <Card title="Default Card" description="Ruhige Standardfläche für die meisten Blöcke." />
              <Card variant="elevated" title="Elevated Card" description="Für priorisierte Inhalte oder erste Einstiege." />
              <Card variant="interactive" title="Interactive Card" description="Hover-verstärkte Auswahlfläche." />
              <Card variant="compact" title="Compact Card" description="Verdichtete Sektion für Listen oder kleine Hinweise." />
            </div>
          </Card>

          <Card variant="section">
            <SectionHeader eyebrow="04" title="Badge Showcase" description="Status sichtbar, aber nicht laut." />
            <div className={styles.badgeRow}>
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="muted">Muted</Badge>
            </div>
          </Card>

          <Card variant="section">
            <SectionHeader eyebrow="05" title="Form Showcase" description="Einheitliche FormFields statt pro Seite anderer Input-Schalen." />
            <div className={styles.fieldGrid}>
              <FormField label="Titel" htmlFor="demo-title" hint="Knappe, klare Primärinformation.">
                <Input id="demo-title" placeholder="Tokyo Night Stories" />
              </FormField>
              <FormField label="Status" htmlFor="demo-status" required>
                <Select id="demo-status" defaultValue="ongoing">
                  <option value="ongoing">Aktiv</option>
                  <option value="paused">Pausiert</option>
                  <option value="archived">Archiviert</option>
                </Select>
              </FormField>
              <FormField label="Beschreibung" htmlFor="demo-description" error="Beispiel für einen validierten Zustand.">
                <Textarea id="demo-description" invalid defaultValue="Die Oberfläche bleibt mockbasiert und generisch." />
              </FormField>
            </div>
          </Card>
        </div>

        <Card variant="section">
          <SectionHeader eyebrow="06" title="Header, Tabellen und Feedback" description="Die typischen Admin-Bausteine müssen auch im Zusammenspiel ruhig und konsistent bleiben." />
          <div className={styles.showcaseGrid}>
            <Card variant="flat">
              <div className={styles.headerStack}>
                <PageHeader
                  eyebrow="Preview"
                  title="Meine Gruppen"
                  description="Header mit Beschreibung, Actions und Breadcrumb-Kontext."
                  actions={<Button size="sm">Neue Aktion</Button>}
                />
                <SectionHeader
                  title="Mitgliederübersicht"
                  description="Sekundärer Header innerhalb einer Seite."
                  actions={<Badge variant="muted">12 Einträge</Badge>}
                />
              </div>
            </Card>
            <Card variant="flat">
              <div className={styles.tableSurfaceBPrevious}>
                <Table caption="Beispiel für einen Standard-Tabellenzustand" variant="withActions" containerClassName={styles.tableWrapHeaderLineWine}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Gruppe</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Rollen</TableHeaderCell>
                    <TableHeaderCell>Fortschritt</TableHeaderCell>
                    <TableHeaderCell>Aktion</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell><Badge variant={getTableStatusVariant(row.status)}>{row.status}</Badge></TableCell>
                      <TableCell>{row.owners}</TableCell>
                      <TableCell>{row.progress}</TableCell>
                      <TableCell>
                        <div className={styles.rowActions}>
                          <Button variant="ghost" size="sm">Öffnen</Button>
                          <Button size="sm" leftIcon={<Pencil size={14} />}>Editieren</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
          </div>
          <div className={styles.feedbackGrid}>
            <EmptyState title="Noch keine Gruppen" description="Leere Listen sollen den nächsten sinnvollen Schritt zeigen statt nur leer zu wirken." action={<Button variant="secondary" size="sm">Neue Gruppe</Button>} />
            <LoadingState title="Release-Daten werden geladen" description="Die Übersicht baut sich auf, bevor weitere Aktionen möglich sind." />
            <ErrorState title="Release-Liste konnte nicht geladen werden" description="Der Fehler bleibt lokal am betroffenen Bereich und kann direkt erneut versucht werden." action={<Button variant="danger" size="sm">Erneut versuchen</Button>} />
          </div>
        </Card>

        <Card variant="section">
          <SectionHeader eyebrow="07" title="Overlay- und Navigationsbausteine" description="Tabs, Pagination, Modal und Drawer werden hier isoliert sichtbar und interaktiv geprüft." />
          <div className={styles.overlayGrid}>
            <Card variant="flat">
              <Tabs
                items={[
                  { id: 'summary', label: 'Übersicht', badge: 3, content: <p>Mock-Zusammenfassung ohne API-Seam.</p> },
                  { id: 'assets', label: 'Assets', badge: 12, content: <p>Spätere Domain-Komponenten dürfen diese Tab-Hülle konsumieren.</p> },
                  { id: 'history', label: 'Historie', content: <p>Read-only Kontext kann generische Tabs wiederverwenden.</p> },
                ]}
              />
            </Card>
            <Card variant="flat">
              <Pagination currentPage={page} totalPages={8} onPageChange={setPage} />
            </Card>
            <Card variant="flat">
              <Toolbar
                leading={(
                  <>
                    <Input className={styles.searchInput} placeholder="Suche oder Filter" />
                    <Button variant="secondary" leftIcon={<Filter size={16} />}>Filter</Button>
                  </>
                )}
                trailing={<Badge variant="muted">42 Ergebnisse</Badge>}
              />
            </Card>
          </div>
        </Card>

        <Card variant="section">
          <SectionHeader eyebrow="08" title="Kompositionsbeispiele" description="Nicht nur Einzelteile, sondern typische Admin-Layer mit Mockdaten und ohne Fachlogik." />
          <div className={styles.compositionGrid}>
            <Card variant="section" title="Komposition 1 – Admin List Layout" description="PageHeader, Toolbar, Tabelle, Pagination und Row Actions.">
              <Toolbar
                leading={(
                  <>
                    <Input className={styles.searchInput} placeholder="Fansub-Gruppen durchsuchen" />
                    <Button variant="secondary" leftIcon={<Search size={16} />}>Suchen</Button>
                  </>
                )}
                trailing={<Badge variant="info">3 sichtbar</Badge>}
              />
              <Table variant="withActions">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Rollen</TableHeaderCell>
                    <TableHeaderCell>Aktionen</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell><Badge variant={getTableStatusVariant(row.status)}>{row.status}</Badge></TableCell>
                      <TableCell>{row.owners}</TableCell>
                      <TableCell>
                        <div className={styles.rowActions}>
                          <Button variant="ghost" size="sm">Öffnen</Button>
                          <Button size="sm" leftIcon={<Pencil size={14} />}>Editieren</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={8} onPageChange={setPage} />
            </Card>

            <Card variant="section" title="Komposition 2 – Detail / Edit Layout" description="FormFields, Card-Struktur und ActionBar für sichere Edit-Flows.">
              <FormField label="Titel" htmlFor="comp-title">
                <Input id="comp-title" defaultValue="Meine Gruppen – Referenzformular" />
              </FormField>
              <FormField label="Status" htmlFor="comp-select">
                <Select id="comp-select" defaultValue="ready">
                  <option value="ready">Bereit</option>
                  <option value="review">In Review</option>
                  <option value="hold">Zurückgestellt</option>
                </Select>
              </FormField>
              <FormField label="Beschreibung" htmlFor="comp-text">
                <Textarea id="comp-text" defaultValue="Mock-Bearbeitungsformular ohne Backend-Vertrag." />
              </FormField>
              <ActionBar
                leading={<Badge variant="muted">Ungespeicherte Änderungen</Badge>}
                trailing={(
                  <>
                    <Button variant="ghost">Abbrechen</Button>
                    <Button variant="danger">Löschen</Button>
                    <Button>Speichern</Button>
                  </>
                )}
              />
            </Card>

            <Card variant="section" title="Komposition 3 – Card + interaktive Liste" description="Rollen, Aktivitäten oder Mitglieder lassen sich ohne neue Spezial-CSS lesbar staffeln.">
              <ul className={styles.list}>
                {listItems.map((item) => (
                  <li key={item.title} className={styles.listItem}>
                    <div>
                      <strong>{item.title}</strong>
                      <div>{item.meta}</div>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge variant="muted">{item.badge}</Badge>
                      <Button variant="secondary" size="sm">Öffnen</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="section" title="Komposition 4 – Drawer Detail View" description="Tabs, Detail-Liste, FormFields und Footer Actions innerhalb eines generischen Overlays.">
              <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Drawer-Demo starten</Button>
              <div className={styles.drawerDetailList}>
                <div className={styles.detailRow}><strong>Release-Version</strong><span>v3.2 Clean Encode</span></div>
                <div className={styles.detailRow}><strong>Kontext</strong><span>Nur Mockdaten, keine Runtime-IDs.</span></div>
                <div className={styles.detailRow}><strong>Weiterer Schritt</strong><span>In 48B gezielt in echte Seiten integrieren.</span></div>
              </div>
            </Card>

            <Card variant="section" title="Komposition 5 – Media Management Layout" description="Toolbar, Upload-Hinweis, Media Grid und Status-Badges ohne echte Upload-Logik.">
              <Toolbar
                leading={<Badge variant="muted">12 Mock-Assets</Badge>}
                trailing={<Button leftIcon={<Upload size={16} />}>Upload vorbereiten</Button>}
              />
              <div className={styles.mediaGrid}>
                <div className={styles.mediaThumb}><Badge variant="info">Poster</Badge></div>
                <div className={styles.mediaThumb}><Badge variant="success">Freigegeben</Badge></div>
                <div className={styles.mediaThumb}><Badge variant="warning">Review</Badge></div>
              </div>
              <EmptyState title="Keine echte Upload-Logik in 48A" description="Die Medienverwaltung bleibt hier absichtlich ein rein visuelles Referenzlayout." />
            </Card>

            <Card variant="section" title="Komposition 6 - Anime-Einblicke / Editor-Accordion" description="Referenz für Projekttexte: aufklappbare Anime-Karte, ruhige Editor-Hülle, Status-Badges und ein kompakter unterer Optionsblock.">
              <SectionHeader
                eyebrow="Fansub-Detail"
                title="Anime-Projekttexte"
                description="Projekttexte dieser Fansubgruppe zu ihren Anime. Pro Anime kann ein beschreibender Text gespeichert werden."
              />

              <div className={styles.projectNotesList}>
                <Card variant="nested" className={styles.projectNotesCard}>
                  <button type="button" className={styles.projectNotesHeader} aria-expanded="true">
                    <div className={styles.projectNotesHeaderBody}>
                      <p className={styles.projectNotesEyebrow}>Anime-Projekttext</p>
                      <h3 className={styles.projectNotesTitle}>Projekttext für Naruto</h3>
                      <p className={styles.projectNotesHint}>
                        Eintrag öffnen, um den Projekttext, Status und die Sichtbarkeit für diesen Anime zu pflegen.
                      </p>
                    </div>
                    <div className={styles.projectNotesHeaderMeta}>
                      <span>1 Editor</span>
                      <span className={styles.disclosureIconInline} aria-hidden="true">
                        <ChevronDown size={24} />
                      </span>
                    </div>
                  </button>

                  <div className={styles.projectNotesCardBody}>
                    <div className={styles.projectNotesEditorCard}>
                      <div className={styles.projectNotesEditorHeader}>
                        <div className={styles.projectNotesEditorHeading}>
                          <p className={styles.projectNotesEyebrow}>Anime-Projekttext</p>
                          <h3 className={styles.projectNotesEditorTitle}>Projekttext für Naruto</h3>
                        </div>
                        <div className={styles.projectNotesBadgeRow}>
                          <Badge variant="muted">Intern</Badge>
                          <Badge variant="muted">Entwurf</Badge>
                        </div>
                      </div>

                      <div className={styles.projectNotesEditorMain}>
                        <FormField label="Titel">
                          <Input value={projectNoteTitle} onChange={(event) => setProjectNoteTitle(event.target.value)} />
                        </FormField>

                        <FormField label="Projekttext">
                          <div className={styles.projectNotesEditorSurface}>
                            <RichTextEditor
                              value={projectNoteBody}
                              onChange={setProjectNoteBody}
                              mode="longform"
                              minHeight={240}
                              placeholder="Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime."
                            />
                          </div>
                        </FormField>
                      </div>

                      <div className={styles.projectNotesOptionsCard}>
                        <div className={styles.projectNotesOptionsIntro}>
                          <p className={styles.projectNotesEyebrow}>Optionen</p>
                          <h4>Steuerung für Sichtbarkeit und Status</h4>
                        </div>
                        <div className={styles.projectNotesOptionsGrid}>
                          <FormField label="Sichtbarkeit">
                            <Select
                              value={projectNoteVisibility}
                              onChange={(event) => setProjectNoteVisibility(event.target.value as 'internal' | 'public')}
                            >
                              <option value="internal">Intern</option>
                              <option value="public">Öffentlich</option>
                            </Select>
                          </FormField>
                          <FormField label="Status">
                            <Select
                              value={projectNoteStatus}
                              onChange={(event) => setProjectNoteStatus(event.target.value as 'draft' | 'published' | 'archived' | 'deleted')}
                            >
                              <option value="draft">Entwurf</option>
                              <option value="published">Veröffentlicht</option>
                              <option value="archived">Archiviert</option>
                              <option value="deleted">Gelöscht</option>
                            </Select>
                          </FormField>
                        </div>
                      </div>

                      <div className={styles.projectNotesActionBar}>
                        <p className={styles.projectNotesActionHint}>Gespeicherter Eintrag (ID: 2)</p>
                        <Button>Speichern</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

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

                {animeReleaseCards.map((anime, animeIndex) => {
                  const isOpen = anime.expanded ? animeEntryOpen : false
                  return (
                    <Card key={anime.title} variant="nested" className={styles.animeAccordionCard}>
                      <button
                        type="button"
                        className={styles.animeAccordionHeader}
                        onClick={() => {
                          if (anime.expanded) setAnimeEntryOpen((current) => !current)
                        }}
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
                                  onClick={() => {
                                    if (index === 0) setReleaseRowOpen((current) => !current)
                                  }}
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
                                    onClick={() => {
                                      if (index === 0) setReleaseRowOpen((current) => !current)
                                    }}
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
                    {renderAnimeReleasePreview('mobile')}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Release-Version archivieren?"
        description="Die Version bleibt nachvollziehbar, verschwindet aber aus der aktiven Arbeitsliste."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>Archivieren</Button>
          </>
        )}
      >
        <div className={styles.modalDecisionBody}>
          <p>Das Modal bleibt bewusst kurz. Es zeigt nur den nötigen Kontext, bevor eine klare Entscheidung getroffen wird.</p>
          <div className={styles.modalDecisionGrid}>
            <div className={styles.modalDecisionItem}><span>Anime</span><strong>Naruto</strong></div>
            <div className={styles.modalDecisionItem}><span>Episode</span><strong>1</strong></div>
            <div className={styles.modalDecisionItem}><span>Titel</span><strong>Entscheidungsschlacht auf dem Delmo-Stützpunkt</strong></div>
            <div className={styles.modalDecisionItem}><span>Version</span><strong>1</strong></div>
          </div>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Release-Details"
        description="Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche statt wie ein nacktes Standardsheet anfühlen."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Schließen</Button>
          </>
        )}
      >
        <Tabs
          items={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className={styles.stack}>
                  <div className={styles.drawerDetailGrid}>
                    <div className={styles.drawerDetailItem}><span>Release-ID</span><strong>4821</strong></div>
                    <div className={styles.drawerDetailItem}><span>Anime-ID</span><strong>13</strong></div>
                    <div className={styles.drawerDetailItem}><span>Fansub-Gruppe</span><strong>88</strong></div>
                    <div className={styles.drawerDetailItem}><span>Kontext-Key</span><strong>88:13</strong></div>
                    <div className={styles.drawerDetailItem}><span>Anime</span><strong>Naruto</strong></div>
                    <div className={styles.drawerDetailItem}><span>Episode</span><strong>1</strong></div>
                    <div className={styles.drawerDetailItem}><span>Titel</span><strong>Entscheidungsschlacht auf dem Delmo-Stützpunkt</strong></div>
                    <div className={styles.drawerDetailItem}><span>Versionen</span><strong>1</strong></div>
                    <div className={styles.drawerDetailItem}><span>Datum</span><strong>23.04.2026</strong></div>
                    <div className={styles.drawerDetailItem}><span>Status</span><strong>Verknüpft</strong></div>
                    <div className={styles.drawerDetailItem}><span>Theme-Übersicht</span><strong>2 Uploads · 1 Global · 1 offen</strong></div>
                    <div className={styles.drawerDetailItem}><span>Theme-Definitionen</span><strong>4 geladen</strong></div>
                  </div>
                </div>
              ),
            },
            {
              id: 'media',
              label: 'Medien',
              content: (
                <div className={styles.stack}>
                  <div className={styles.drawerMediaIntro}>
                    <h3>Release-Medien im Überblick</h3>
                    <p>Screenshots, Typesetting-Beispiele und weitere Assets auf einen Blick, bevor du in die volle Medienverwaltung springst.</p>
                  </div>
                  <Table variant="compact" containerClassName={styles.drawerMediaTable}>
                    <TableBody>
                      <TableRow>
                        <TableCell className={styles.drawerMediaLabelCell}>Screenshots</TableCell>
                        <TableCell className={styles.drawerMediaValueCell}>12</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className={styles.drawerMediaLabelCell}>Typesetting</TableCell>
                        <TableCell className={styles.drawerMediaValueCell}>3</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className={styles.drawerMediaLabelCell}>Fun / Outtakes</TableCell>
                        <TableCell className={styles.drawerMediaValueCell}>–</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className={styles.drawerMediaLabelCell}>Sonstige</TableCell>
                        <TableCell className={styles.drawerMediaValueCell}>2</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className={styles.drawerMediaTotalLabelCell}>Gesamt</TableCell>
                        <TableCell className={styles.drawerMediaTotalValueCell}>17</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div className={styles.drawerMediaPreviewGrid}>
                    <div className={styles.drawerMediaPreview}>Preview</div>
                    <div className={styles.drawerMediaPreview}>Preview</div>
                    <div className={styles.drawerMediaPreview}>Preview</div>
                    <div className={styles.drawerMediaPreview}>Preview</div>
                  </div>
                  <Button>Medienverwaltung öffnen</Button>
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </main>
  )
}
