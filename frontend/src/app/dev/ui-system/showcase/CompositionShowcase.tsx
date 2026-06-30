'use client'

import { Pencil, Search, Upload } from 'lucide-react'

import {
  ActionBar,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Pagination,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  Toolbar,
} from '@/components/ui'

import { ProjectNoteShowcase } from './ProjectNoteShowcase'
import { ReleaseCompositionShowcase } from './ReleaseCompositionShowcase'
import styles from '../page.module.css'

const tableRows = [
  { name: 'Anime no Hikari', status: 'Aktiv', owners: '3 Rollen', progress: '12 Versionen' },
  { name: 'Pixel Fansubs', status: 'Pausiert', owners: '1 Rolle', progress: '4 Versionen' },
  { name: 'T4 Archive Lab', status: 'Read-only', owners: '2 Rollen', progress: '27 Assets' },
]

const listItems = [
  { title: 'Rollenpflege anstoßen', meta: 'Sekundäre Aktion', badge: 'offen' },
  { title: 'Notizen prüfen', meta: 'Kontext sichtbar halten', badge: 'neu' },
  { title: 'Medienfreigabe vorbereiten', meta: 'Spätere Drawer-Aktion', badge: 'bereit' },
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

interface CompositionShowcaseProps {
  page: number
  onPageChange: (page: number) => void
  onOpenDrawer: () => void
}

export function CompositionShowcase({ page, onPageChange, onOpenDrawer }: CompositionShowcaseProps) {
  return (
    <Card variant="section">
      <SectionHeader eyebrow="09" title="Kompositionsbeispiele" description="Nicht nur Einzelteile, sondern typische Admin-Layer mit Mockdaten und ohne Fachlogik." />
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
          <Pagination currentPage={page} totalPages={8} onPageChange={onPageChange} />
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
                <Button variant="success">Speichern</Button>
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
          <Button variant="secondary" onClick={onOpenDrawer}>Drawer-Demo starten</Button>
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

        <ProjectNoteShowcase />

        <ReleaseCompositionShowcase />
      </div>
    </Card>
  )
}
