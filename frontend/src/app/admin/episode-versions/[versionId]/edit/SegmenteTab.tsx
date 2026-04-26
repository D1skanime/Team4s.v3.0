'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Clock, X } from 'lucide-react'

import { useReleaseSegments } from './useReleaseSegments'
import type { AdminThemeSegment, AdminThemeSegmentCreateRequest, AdminThemeSegmentPatchRequest } from '@/types/admin'
import styles from './SegmenteTab.module.css'

interface SegmenteTabProps {
  animeId: number | null
  groupId: number | null
  version: string | null
}

interface FormState {
  themeId: string
  startEpisode: string
  endEpisode: string
  startTime: string
  endTime: string
  sourceJellyfinItemId: string
}

const EMPTY_FORM: FormState = {
  themeId: '',
  startEpisode: '',
  endEpisode: '',
  startTime: '',
  endTime: '',
  sourceJellyfinItemId: '',
}

function getTypeBadgeClass(typeNameRaw: string): string {
  const typeName = typeNameRaw.toUpperCase()
  if (typeName.includes('OP')) return styles.badgeOp
  if (typeName.includes('ED')) return styles.badgeEd
  if (typeName.includes('INSERT') || typeName.includes('IN')) return styles.badgeIn
  if (typeName.includes('OUTRO') || typeName.includes('PV')) return styles.badgePv
  return styles.badgeDefault
}

function getTypeBadgeLabel(typeName: string): string {
  const upper = typeName.toUpperCase()
  if (upper.includes('OP')) return 'OP'
  if (upper.includes('ED')) return 'ED'
  if (upper.includes('INSERT') || (upper.includes('IN') && !upper.includes('INTRO'))) return 'IN'
  if (upper.includes('OUTRO') || upper.includes('PV')) return 'PV'
  return typeName
}

function getTypeColor(typeName: string): string {
  const upper = typeName.toUpperCase()
  if (upper.includes('OP')) return '#16a34a'
  if (upper.includes('ED')) return '#7c3aed'
  if (upper.includes('INSERT') || upper.includes('IN')) return '#ea580c'
  if (upper.includes('OUTRO') || upper.includes('PV')) return '#6b7280'
  return '#2563eb'
}

function parseTimeToSeconds(t: string): number {
  const parts = t.split(':').map(Number)
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  }
  return 0
}

function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function segmentFormFromExisting(segment: AdminThemeSegment): FormState {
  return {
    themeId: String(segment.theme_id),
    startEpisode: segment.start_episode != null ? String(segment.start_episode) : '',
    endEpisode: segment.end_episode != null ? String(segment.end_episode) : '',
    startTime: segment.start_time ?? '',
    endTime: segment.end_time ?? '',
    sourceJellyfinItemId: segment.source_jellyfin_item_id ?? '',
  }
}

export function SegmenteTab({ animeId, groupId, version }: SegmenteTabProps) {
  const { segments, themes, isLoading, errorMessage, create, update, remove } = useReleaseSegments({
    animeId,
    groupId,
    version,
  })

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AdminThemeSegment | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openAddPanel() {
    setEditingSegment(null)
    setFormState(EMPTY_FORM)
    setFormError(null)
    setPanelOpen(true)
  }

  function openEditPanel(segment: AdminThemeSegment) {
    setEditingSegment(segment)
    setFormState(segmentFormFromExisting(segment))
    setFormError(null)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingSegment(null)
    setFormState(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSave() {
    if (!formState.themeId) {
      setFormError('Bitte einen Typ auswaehlen.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (editingSegment) {
        const patch: AdminThemeSegmentPatchRequest = {
          theme_id: parseInt(formState.themeId, 10),
          start_episode: formState.startEpisode ? parseInt(formState.startEpisode, 10) : null,
          end_episode: formState.endEpisode ? parseInt(formState.endEpisode, 10) : null,
          start_time: formState.startTime || null,
          end_time: formState.endTime || null,
          source_jellyfin_item_id: formState.sourceJellyfinItemId || null,
        }
        const ok = await update(editingSegment.id, patch)
        if (ok) closePanel()
        else setFormError('Segment konnte nicht aktualisiert werden.')
      } else {
        const input: AdminThemeSegmentCreateRequest = {
          theme_id: parseInt(formState.themeId, 10),
          fansub_group_id: groupId ?? null,
          version: version ?? 'v1',
          start_episode: formState.startEpisode ? parseInt(formState.startEpisode, 10) : null,
          end_episode: formState.endEpisode ? parseInt(formState.endEpisode, 10) : null,
          start_time: formState.startTime || null,
          end_time: formState.endTime || null,
          source_jellyfin_item_id: formState.sourceJellyfinItemId || null,
        }
        const ok = await create(input)
        if (ok) closePanel()
        else setFormError('Segment konnte nicht angelegt werden.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(segment: AdminThemeSegment) {
    const confirmed = window.confirm('Segment wirklich loeschen?')
    if (!confirmed) return
    await remove(segment.id)
  }

  // Build timeline data
  const timedSegments = segments.filter((s) => s.start_time && s.end_time)
  const maxEnd = timedSegments.length > 0
    ? Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))
    : 300

  return (
    <div className={styles.tabContent}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>Segmente verwalten</h2>
          <p className={styles.toolbarSubtitle}>OP/ED-Timing fuer diese Gruppe und Version.</p>
        </div>
        <button type="button" className={styles.addButton} onClick={openAddPanel}>
          <Plus size={14} />
          Segment hinzufuegen
        </button>
      </div>

      {/* Error from hook */}
      {errorMessage ? <div className={styles.panelError}>{errorMessage}</div> : null}

      {/* Table */}
      {isLoading ? (
        <p className={styles.emptyState}>Lade Segmente...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th>Typ</th>
                <th>Episoden</th>
                <th>Zeitbereich</th>
                <th>Quelle</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Noch keine Segmente vorhanden. Klicke &ldquo;Segment hinzufuegen&rdquo; um zu beginnen.
                  </td>
                </tr>
              ) : (
                segments.map((segment) => (
                  <tr key={segment.id} className={styles.tableRow}>
                    <td>
                      <span className={`${styles.badge} ${getTypeBadgeClass(segment.theme_type_name)}`}>
                        {getTypeBadgeLabel(segment.theme_type_name)}
                      </span>
                      {segment.theme_title ? (
                        <span style={{ marginLeft: 6, fontSize: 13, color: '#6b6b70' }}>{segment.theme_title}</span>
                      ) : null}
                    </td>
                    <td>
                      {segment.start_episode != null || segment.end_episode != null
                        ? `${segment.start_episode ?? '?'} \u2013 ${segment.end_episode ?? '?'}`
                        : '\u2014'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {segment.start_time && segment.end_time
                        ? `${segment.start_time} \u2192 ${segment.end_time}`
                        : '\u2014'}
                    </td>
                    <td style={{ fontSize: 13, color: '#6b6b70' }}>
                      {segment.source_jellyfin_item_id
                        ? segment.source_jellyfin_item_id.length > 20
                          ? `${segment.source_jellyfin_item_id.slice(0, 20)}...`
                          : segment.source_jellyfin_item_id
                        : '\u2014'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionButton}
                        title="Bearbeiten"
                        onClick={() => openEditPanel(segment)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        title="Loeschen"
                        onClick={() => void handleDelete(segment)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <Clock size={14} />
          Timeline Vorschau
        </div>
        {timedSegments.length === 0 ? (
          <p className={styles.emptyState}>Keine Zeitbereiche fuer Timeline verfuegbar.</p>
        ) : (
          <>
            <div className={styles.timelineLabels}>
              <span>00:00:00</span>
              <span>{formatSeconds(maxEnd)}</span>
            </div>
            <div className={styles.timelineTrack}>
              {timedSegments.map((segment) => {
                const startSec = parseTimeToSeconds(segment.start_time!)
                const endSec = parseTimeToSeconds(segment.end_time!)
                const leftPct = (startSec / maxEnd) * 100
                const widthPct = Math.max(2, ((endSec - startSec) / maxEnd) * 100)
                const color = getTypeColor(segment.theme_type_name)
                return (
                  <div
                    key={segment.id}
                    className={styles.timelineBlock}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
                    title={`${segment.theme_type_name}: ${segment.start_time} \u2013 ${segment.end_time}`}
                  >
                    {getTypeBadgeLabel(segment.theme_type_name)}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Side panel overlay */}
      {panelOpen ? (
        <>
          <div className={styles.panelOverlay} onClick={closePanel} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                {editingSegment ? 'Segment bearbeiten' : 'Neues Segment hinzufuegen'}
              </h3>
              <button type="button" className={styles.panelCloseButton} onClick={closePanel}>
                <X size={16} />
              </button>
            </div>

            {formError ? <div className={styles.panelError}>{formError}</div> : null}

            <div className={styles.panelField}>
              <label htmlFor="segment-type">Typ</label>
              <select
                id="segment-type"
                value={formState.themeId}
                onChange={(e) => setFormState((s) => ({ ...s, themeId: e.target.value }))}
              >
                <option value="">-- Typ auswaehlen --</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={String(theme.id)}>
                    {theme.theme_type_name}{theme.title ? ` \u2013 ${theme.title}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.panelField}>
              <label>Episodenbereich</label>
            </div>
            <div className={styles.panelFieldRow}>
              <div className={styles.panelField}>
                <label htmlFor="seg-ep-start">Von</label>
                <input
                  id="seg-ep-start"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formState.startEpisode}
                  onChange={(e) => setFormState((s) => ({ ...s, startEpisode: e.target.value }))}
                />
              </div>
              <div className={styles.panelField}>
                <label htmlFor="seg-ep-end">Bis</label>
                <input
                  id="seg-ep-end"
                  type="number"
                  min="1"
                  placeholder="12"
                  value={formState.endEpisode}
                  onChange={(e) => setFormState((s) => ({ ...s, endEpisode: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.panelField}>
              <label>Zeitbereich im Video</label>
            </div>
            <div className={styles.panelFieldRow}>
              <div className={styles.panelField}>
                <label htmlFor="seg-time-start">Start</label>
                <input
                  id="seg-time-start"
                  type="text"
                  placeholder="00:00:00"
                  value={formState.startTime}
                  onChange={(e) => setFormState((s) => ({ ...s, startTime: e.target.value }))}
                />
              </div>
              <div className={styles.panelField}>
                <label htmlFor="seg-time-end">Ende</label>
                <input
                  id="seg-time-end"
                  type="text"
                  placeholder="00:01:30"
                  value={formState.endTime}
                  onChange={(e) => setFormState((s) => ({ ...s, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.panelField}>
              <label htmlFor="seg-jellyfin">Jellyfin Item ID (optional)</label>
              <input
                id="seg-jellyfin"
                type="text"
                placeholder="optional"
                value={formState.sourceJellyfinItemId}
                onChange={(e) => setFormState((s) => ({ ...s, sourceJellyfinItemId: e.target.value }))}
              />
            </div>

            <div className={styles.panelActions}>
              <button type="button" className={styles.panelCancelButton} onClick={closePanel}>
                Abbrechen
              </button>
              <button type="button" className={styles.panelSaveButton} onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
