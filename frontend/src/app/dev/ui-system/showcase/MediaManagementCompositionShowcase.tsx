'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'

import { Badge, Button, Card, Input, UploadDropzone, UploadFileRow } from '@/components/ui'
import type { UploadFileRowProps } from '@/components/ui'

import styles from '../page.module.css'

interface DemoQueueItem {
  key: string
  file: File
  title: string
  caption: string
  status: UploadFileRowProps['status']
  progress: number | null
}

function demoKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

const INITIAL_DEMO_FILES: Array<Pick<DemoQueueItem, 'title' | 'caption' | 'status' | 'progress'> & { name: string }> = [
  { name: 'ankuendigung.png', title: 'Ankündigung', caption: '', status: 'uploading', progress: 62 },
  { name: 'teaser.jpg', title: '', caption: '', status: 'processing', progress: null },
  { name: 'cover-final.webp', title: 'Cover final', caption: 'Letzte Fassung', status: 'ready', progress: null },
  { name: 'beschaedigt.gif', title: '', caption: '', status: 'failed', progress: null },
]

function buildInitialQueue(): DemoQueueItem[] {
  return INITIAL_DEMO_FILES.map((entry) => {
    const file = new File(['mock'], entry.name, { type: 'image/png' })
    return { key: demoKey(file), file, title: entry.title, caption: entry.caption, status: entry.status, progress: entry.progress }
  })
}

interface MockMediaCard {
  id: string
  category: string
  status: 'In Prüfung' | 'Freigegeben' | 'Abgelehnt'
  visibility: 'Intern' | 'Öffentlich'
}

const MOCK_MEDIA_CARDS: MockMediaCard[] = [
  { id: 'a', category: 'Galerie', status: 'Freigegeben', visibility: 'Öffentlich' },
  { id: 'b', category: 'Artwork / Fanart', status: 'In Prüfung', visibility: 'Intern' },
  { id: 'c', category: 'Event / Treffen', status: 'Abgelehnt', visibility: 'Intern' },
]

function statusBadgeVariant(status: MockMediaCard['status']): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'Freigegeben':
      return 'success'
    case 'Abgelehnt':
      return 'danger'
    default:
      return 'warning'
  }
}

/**
 * Komposition 5 -- reine Präsentation mit Mock-Daten, keine Team4s-Fachlogik. Spiegelt die
 * heutige reale Medienverwaltung (Phase 180): eine Upload-Warteschlange aus den globalen
 * Primitives UploadDropzone/UploadFileRow, und ein Medien-Grid im aktuellen Karten-Stil
 * (Auswahl-Checkbox, Ziehgriff-Hinweis, Kategorie-/Status-/Sichtbarkeits-Badges) wie bei den
 * Gruppenmedien. Live-UAT-Nachtrag 2026-10-12: löst den veralteten Mock-Hinweis "Keine echte
 * Upload-Logik" ab, der nicht mehr zur heutigen Komponentenlage passte.
 */
export function MediaManagementCompositionShowcase() {
  const [queue, setQueue] = useState<DemoQueueItem[]>(() => buildInitialQueue())
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(() => new Set(['a']))

  function handleFilesSelected(files: File[]) {
    setQueue((current) => {
      const seen = new Set(current.map((item) => item.key))
      const next = [...current]
      for (const file of files) {
        const key = demoKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ key, file, title: '', caption: '', status: 'idle', progress: null })
      }
      return next
    })
  }

  function handleChange(key: string, field: 'title' | 'caption', value: string) {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)))
  }

  function handleRetry(key: string) {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, status: 'uploading', progress: 0 } : item)))
  }

  function handleRemove(key: string) {
    setQueue((current) => current.filter((item) => item.key !== key))
  }

  function toggleSelected(id: string) {
    setSelectedIDs((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingCount = queue.filter((item) => item.status === 'idle').length

  return (
    <Card
      variant="section"
      title="Komposition 5 – Media Management Layout"
      description="Upload-Warteschlange und Medien-Grid im aktuellen Karten-Stil (Phase 180) -- reine Präsentation mit Mock-Daten, keine Fachlogik."
    >
      <div className={styles.stack}>
        <UploadDropzone onFilesSelected={handleFilesSelected} density="compact" multiple />
        {queue.map((item) => (
          <UploadFileRow
            key={item.key}
            file={item.file}
            title={item.title}
            caption={item.caption}
            onChange={(field, value) => handleChange(item.key, field, value)}
            status={item.status}
            progress={item.progress}
            onRetry={() => handleRetry(item.key)}
            onRemove={() => handleRemove(item.key)}
            density="compact"
          />
        ))}
        <div className={styles.rowActions}>
          <Badge variant="muted">{pendingCount} wartend</Badge>
          <Button disabled={pendingCount === 0}>Upload starten</Button>
        </div>
      </div>

      <div className={styles.mediaManagementGrid}>
        {MOCK_MEDIA_CARDS.map((card) => {
          const isSelected = selectedIDs.has(card.id)
          return (
            <Card key={card.id} variant="nested" className={styles.mediaManagementCard}>
              <div className={styles.mediaManagementCardHeader}>
                <label className={styles.mediaManagementSelection}>
                  <Input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(card.id)}
                    aria-label={`${card.category} auswählen`}
                  />
                  <span>{isSelected ? 'Ausgewählt' : 'Auswählen'}</span>
                </label>
                <span className={styles.mediaManagementGrip} aria-hidden="true" title="Ziehgriff (Reihenfolge)">
                  <GripVertical size={16} />
                </span>
              </div>
              <div className={styles.mediaManagementPreview}>Vorschau</div>
              <div className={styles.mediaManagementBadgeRow}>
                <Badge variant="neutral">{card.category}</Badge>
                <Badge variant={statusBadgeVariant(card.status)}>{card.status}</Badge>
                <Badge variant="info">{card.visibility}</Badge>
              </div>
            </Card>
          )
        })}
      </div>
    </Card>
  )
}
