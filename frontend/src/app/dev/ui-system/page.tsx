'use client'

import { useState } from 'react'
import { ArrowRight, Filter, MoreHorizontal, PanelRight, Pencil } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
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
import { AccordionShowcase } from './showcase/AccordionShowcase'
import { CompositionShowcase } from './showcase/CompositionShowcase'
import { DrawerShowcase } from './showcase/DrawerShowcase'
import { SwitchShowcase } from './showcase/SwitchShowcase'
import { AppShellDrawerDemoSection } from './AppShellDrawerDemoSection'
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

export default function UISystemPlaygroundPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(2)
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
          <SectionHeader
            eyebrow="08"
            title="Switch &amp; Accordion"
            description="Neue globale Primitives für Toggle-Steuerung und aufklappbare Kategorien — mobil und barrierefrei."
          />
          <div className={styles.showcaseGrid}>
            <SwitchShowcase />
            <AccordionShowcase />
          </div>
        </Card>

        <CompositionShowcase page={page} onPageChange={setPage} onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      <AppShellDrawerDemoSection />

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

      <DrawerShowcase open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
