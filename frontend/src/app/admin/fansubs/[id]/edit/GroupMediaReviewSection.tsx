'use client'

import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  SectionHeader,
  Select,
  Toolbar,
} from '@/components/ui'
import {
  ApiError,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  listFansubGroupMedia,
  patchFansubMediaReview,
} from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'

import styles from './GroupMediaReviewSection.module.css'

interface GroupMediaReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities
}

// Lokaler Draft-Zustand pro Medium
interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

// D-08: Capability-Gate — null ohne can_edit_group
export function GroupMediaReviewSection({ fansubId, capabilities }: GroupMediaReviewSectionProps) {
  if (!capabilities.can_edit_group) return null

  return <GroupMediaReviewSectionInner fansubId={fansubId} />
}

function GroupMediaReviewSectionInner({ fansubId }: { fansubId: number }) {
  const [mediaItems, setMediaItems] = useState<FansubGroupMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Draft-Zustand: Änderungen pro Medium, bis Speichern aufgerufen wird
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>({})
  // Speicher-Fehler pro Medium
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  // Speicher-Erfolgs-Toast
  const [toast, setToast] = useState<string | null>(null)
  // Lade-Zustand für Speichern pro Medium
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      // listFansubGroupMedia = Lese-Quelle (78-03)
      const items = await listFansubGroupMedia(fansubId, undefined)
      setMediaItems(items)
      // Drafts aus geladenen Werten initialisieren
      const initialDrafts: Record<number, MediaDraft> = {}
      for (const item of items) {
        initialDrafts[item.id] = {
          visibility: (item.visibility as FansubMediaVisibility) ?? 'intern',
          review_status: (item.review_status as FansubMediaReviewStatus) ?? 'in_pruefung',
        }
      }
      setDrafts(initialDrafts)
    } catch (err) {
      setLoadError(readErrorMessage(err, 'Medien werden geladen…'))
    } finally {
      setIsLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  function setDraftField(
    mediaId: number,
    field: keyof MediaDraft,
    value: FansubMediaVisibility | FansubMediaReviewStatus,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }))
  }

  async function handleSave(item: FansubGroupMediaItem) {
    const draft = drafts[item.id]
    if (!draft) return

    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      // patchFansubMediaReview = Mutation (78-03); schreibt NUR visibility + review_status (D-05)
      await patchFansubMediaReview(
        fansubId,
        item.id,
        { visibility: draft.visibility, review_status: draft.review_status },
        undefined,
      )
      setToast('Prüfstatus aktualisiert.')
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Änderungen konnten nicht gespeichert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  if (isLoading) {
    return <LoadingState title="Medien werden geladen…" description="Gruppenmedien werden abgerufen." />
  }

  if (loadError) {
    return <ErrorState title="Fehler beim Laden" description={loadError} />
  }

  return (
    <Card variant="section" className={styles.reviewSection}>
      <Toolbar
        leading={
          <SectionHeader
            title="Medien prüfen"
            description="Sichtbarkeit und Prüfstatus der Gruppenmedien verwalten."
          />
        }
      />

      {toast ? (
        <p className={styles.toastSuccess} role="status">{toast}</p>
      ) : null}

      {mediaItems.length === 0 ? (
        <EmptyState
          title="Keine Medien vorhanden"
          description="Für diese Gruppe sind noch keine Medien angelegt."
        />
      ) : (
        <div className={styles.mediaReviewGrid}>
          {mediaItems.map((item) => {
            const draft = drafts[item.id]
            if (!draft) return null

            return (
              <Card key={item.id} variant="nested" className={styles.mediaCard}>
                {/* D-05: Owner-Korrektheit nur als Flag — kein Owner-Edit-Feld (Phase 79) */}
                {!item.owner_consistent ? (
                  <div className={styles.ownerFlagRow}>
                    <Badge variant="warning">Owner-Zuordnung prüfen</Badge>
                  </div>
                ) : null}

                <div className={styles.mediaCardBody}>
                  <FormField label="Sichtbarkeit">
                    <Select
                      value={draft.visibility}
                      onChange={(e) =>
                        setDraftField(item.id, 'visibility', e.target.value as FansubMediaVisibility)
                      }
                    >
                      <option value="intern">Intern</option>
                      <option value="oeffentlich">Öffentlich</option>
                    </Select>
                  </FormField>

                  <FormField label="Prüfstatus">
                    <Select
                      value={draft.review_status}
                      onChange={(e) =>
                        setDraftField(item.id, 'review_status', e.target.value as FansubMediaReviewStatus)
                      }
                    >
                      <option value="in_pruefung">In Prüfung</option>
                      <option value="freigegeben">Freigegeben</option>
                      <option value="abgelehnt">Abgelehnt</option>
                      <option value="archiviert">Archiviert</option>
                      <option value="entfernt">Entfernt</option>
                    </Select>
                  </FormField>

                  {saveErrors[item.id] ? (
                    <p className={styles.inlineError} role="alert">
                      {saveErrors[item.id]}
                    </p>
                  ) : null}
                </div>

                <div className={styles.cardFooterActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save size={16} />}
                    disabled={saving[item.id] ?? false}
                    onClick={() => void handleSave(item)}
                  >
                    Änderungen speichern
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Card>
  )
}
