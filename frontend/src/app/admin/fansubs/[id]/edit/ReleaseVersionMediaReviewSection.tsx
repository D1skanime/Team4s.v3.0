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
import { ApiError, getReleaseVersionMedia, patchReleaseVersionMediaItem } from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'
import type {
  ReleaseVersionMediaItem,
  ReleaseVersionMediaVisibility,
  ReleaseVersionMediaReviewStatus,
} from '@/types/releaseVersionMedia'

import styles from './ReleaseVersionMediaReviewSection.module.css'

interface ReleaseVersionMediaReviewSectionProps {
  /** Release-Version-ID — wird an patchReleaseVersionMediaItem(versionId, mediaId, …) übergeben. */
  versionId: number
  /** Capability-Shape aus dem Drawer-Host (D-08-Gating). */
  capabilities: FansubGroupCapabilities
  /**
   * Medien aus der bestehenden Summary-Pipeline (optional).
   * Wenn übergeben, entfällt eigenes Fetch (kein doppelter API-Call).
   * Wenn nicht übergeben, lädt die Sektion selbst via getReleaseVersionMedia.
   */
  media?: ReleaseVersionMediaItem[]
  /** IDs von Medien mit Owner-Inkonsistenz (D-05: nur anzeigen, nie umhängen). */
  ownerInconsistentIds?: number[]
}

// Lokaler Draft-Zustand pro Medium
interface MediaDraft {
  visibility: ReleaseVersionMediaVisibility
  review_status: ReleaseVersionMediaReviewStatus
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * ReleaseVersionMediaReviewSection — Owner-Fläche im Release-Drawer (D-06).
 *
 * Konsumiert den erweiterten PATCH patchReleaseVersionMediaItem mit den neuen
 * optionalen Feldern visibility/review_status (Phase 78, 78-05, Lock K).
 * Ändert NIEMALS owner_type/owner_id (D-05): Owner-Inkonsistenz wird nur als Badge gezeigt.
 *
 * Capability-Gate (D-08): null-Render ohne can_upload_release_media UND can_view_release_media.
 */
export function ReleaseVersionMediaReviewSection({
  versionId,
  capabilities,
  media,
  ownerInconsistentIds = [],
}: ReleaseVersionMediaReviewSectionProps) {
  // D-08: Capability-Gate — null ohne Release-Media-Capability
  if (!capabilities.can_upload_release_media && !capabilities.can_view_release_media) {
    return null
  }

  return (
    <ReleaseVersionMediaReviewSectionInner
      versionId={versionId}
      externalMedia={media}
      ownerInconsistentIds={ownerInconsistentIds}
    />
  )
}

interface InnerProps {
  versionId: number
  externalMedia?: ReleaseVersionMediaItem[]
  ownerInconsistentIds: number[]
}

function ReleaseVersionMediaReviewSectionInner({ versionId, externalMedia, ownerInconsistentIds }: InnerProps) {
  // Wenn externe Media-Daten übergeben werden, kein eigenes Fetch — sonst selbst laden.
  const [internalMedia, setInternalMedia] = useState<ReleaseVersionMediaItem[]>(externalMedia ?? [])
  const [isLoading, setIsLoading] = useState(externalMedia === undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  const media = externalMedia ?? internalMedia

  const loadMedia = useCallback(async () => {
    if (externalMedia !== undefined) return
    try {
      setIsLoading(true)
      setLoadError(null)
      const response = await getReleaseVersionMedia(versionId)
      setInternalMedia(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setLoadError(readErrorMessage(err, 'Release-Medien konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [versionId, externalMedia])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  // Draft-Zustand: Änderungen pro Medium bis Speichern aufgerufen wird.
  // Initialisierung mit kanonischen Default-Werten (D-05: kein owner-Feld).
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>(() => {
    const initial: Record<number, MediaDraft> = {}
    for (const item of media) {
      initial[item.id] = {
        visibility: 'intern',
        review_status: 'in_pruefung',
      }
    }
    return initial
  })

  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)

  function setDraftField(
    mediaId: number,
    field: keyof MediaDraft,
    value: ReleaseVersionMediaVisibility | ReleaseVersionMediaReviewStatus,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }))
  }

  async function handleSave(item: ReleaseVersionMediaItem) {
    const draft = drafts[item.id]
    if (!draft) return

    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      // patchReleaseVersionMediaItem: erweitert mit visibility/review_status (78-05, Lock K).
      // Schreibt NUR Sichtbarkeit/Prüfstatus in media_assets — KEIN owner-Feld (D-05, Lock G).
      await patchReleaseVersionMediaItem(
        versionId,
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

  const ownerInconsistentSet = new Set(ownerInconsistentIds)

  if (isLoading) {
    return <LoadingState title="Release-Medien werden geladen…" description="Bitte warten." />
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
            description="Sichtbarkeit und Prüfstatus der Release-Medien verwalten."
          />
        }
      />

      {toast ? (
        <p className={styles.toastSuccess} role="status">{toast}</p>
      ) : null}

      {media.length === 0 ? (
        <EmptyState
          title="Keine Medien vorhanden"
          description="Für diese Release-Version sind noch keine Medien angelegt."
        />
      ) : (
        <div className={styles.mediaReviewGrid}>
          {media.map((item) => {
            const draft = drafts[item.id]
            if (!draft) return null

            const hasOwnerIssue = ownerInconsistentSet.has(item.id)

            return (
              <Card key={item.id} variant="nested" className={styles.mediaCard}>
                {/* D-05: Owner-Korrektheit nur als Badge — KEIN Owner-Edit-Feld (Phase 79). */}
                {hasOwnerIssue ? (
                  <div className={styles.ownerFlagRow}>
                    <Badge variant="warning">Owner-Zuordnung prüfen</Badge>
                  </div>
                ) : null}

                <div className={styles.mediaCardBody}>
                  <FormField label="Sichtbarkeit">
                    <Select
                      value={draft.visibility}
                      onChange={(e) =>
                        setDraftField(item.id, 'visibility', e.target.value as ReleaseVersionMediaVisibility)
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
                        setDraftField(item.id, 'review_status', e.target.value as ReleaseVersionMediaReviewStatus)
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
