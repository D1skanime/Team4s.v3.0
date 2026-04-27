'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Clock, X, MoreHorizontal } from 'lucide-react'

import { useReleaseSegments } from './useReleaseSegments'
import { getAnimeSegmentSuggestions, getRuntimeAuthToken } from '@/lib/api'
import type {
  AdminThemeSegment,
  AdminThemeSegmentCreateRequest,
  AdminThemeSegmentPatchRequest,
  AdminSegmentSourceType,
} from '@/types/admin'
import styles from './SegmenteTab.module.css'

interface SegmenteTabProps {
  animeId: number | null
  groupId: number | null
  version: string | null
  episodeNumber?: number | null
}

interface FormState {
  themeId: string
  startEpisode: string
  endEpisode: string
  startTime: string
  endTime: string
  sourceType: AdminSegmentSourceType
}

const EMPTY_FORM: FormState = {
  themeId: '',
  startEpisode: '',
  endEpisode: '',
  startTime: '',
  endTime: '',
  sourceType: 'none',
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

function isUpperSpur(typeName: string): boolean {
  const upper = typeName.toUpperCase()
  return upper.includes('INSERT') || upper.includes('IN') || upper.includes('PV') || upper.includes('OUTRO')
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

function formatDuration(startTime: string, endTime: string): string {
  const startSec = parseTimeToSeconds(startTime)
  const endSec = parseTimeToSeconds(endTime)
  const durationSec = endSec - startSec
  if (durationSec <= 0) return `${startTime} - ${endTime}`
  return `${startTime} - ${endTime} (${formatSeconds(durationSec)})`
}

function formatEpisodeRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return '\u2014'
  if (start === end) return String(start ?? '?')
  return `${start ?? '?'} \u2013 ${end ?? '?'}`
}

function resolveSourceLabel(segment: AdminThemeSegment): string {
  // Use new source_type if available
  if (segment.source_type) {
    switch (segment.source_type) {
      case 'none': return 'Keine Quelle'
      case 'jellyfin_theme': return segment.source_label ?? 'Jellyfin Serien-Theme'
      case 'release_asset': return segment.source_label ?? 'Release-Asset'
    }
  }
  // Fallback to legacy source_jellyfin_item_id
  if (segment.source_jellyfin_item_id) {
    return 'Jellyfin Serien-Theme'
  }
  return 'Keine Quelle'
}

function isSegmentActiveForEpisode(segment: AdminThemeSegment, episodeNumber: number): boolean {
  const start = segment.start_episode
  const end = segment.end_episode
  if (start == null && end == null) return true
  if (start != null && end == null) return episodeNumber >= start
  if (start == null && end != null) return episodeNumber <= end
  return episodeNumber >= (start ?? 0) && episodeNumber <= (end ?? Infinity)
}

function segmentFormFromExisting(segment: AdminThemeSegment): FormState {
  return {
    themeId: String(segment.theme_id),
    startEpisode: segment.start_episode != null ? String(segment.start_episode) : '',
    endEpisode: segment.end_episode != null ? String(segment.end_episode) : '',
    startTime: segment.start_time ?? '',
    endTime: segment.end_time ?? '',
    sourceType: segment.source_type ?? (segment.source_jellyfin_item_id ? 'jellyfin_theme' : 'none'),
  }
}

// --- Timeline sub-component ---
interface SegmentTimelineProps {
  segments: AdminThemeSegment[]
}

function SegmentTimeline({ segments }: SegmentTimelineProps) {
  const timedSegments = segments.filter((s) => s.start_time && s.end_time)
  if (timedSegments.length === 0) {
    return <p className={styles.emptyState}>Keine Zeitbereiche fuer Timeline verfuegbar.</p>
  }

  const maxEnd = Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))
  const upperSegments = timedSegments.filter((s) => isUpperSpur(s.theme_type_name))
  const lowerSegments = timedSegments.filter((s) => !isUpperSpur(s.theme_type_name))

  // Compute Hauptinhalt gap between OP-end and ED-start
  const opSegments = lowerSegments.filter((s) => s.theme_type_name.toUpperCase().includes('OP'))
  const edSegments = lowerSegments.filter((s) => s.theme_type_name.toUpperCase().includes('ED'))
  const opMaxEnd = opSegments.length > 0 ? Math.max(...opSegments.map((s) => parseTimeToSeconds(s.end_time!))) : null
  const edMinStart = edSegments.length > 0 ? Math.min(...edSegments.map((s) => parseTimeToSeconds(s.start_time!))) : null

  function renderBlock(segment: AdminThemeSegment) {
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
  }

  return (
    <>
      <div className={styles.timelineLabels}>
        <span>00:00:00</span>
        <span>{formatSeconds(maxEnd)}</span>
      </div>

      {/* Upper spur: IN/PV */}
      {upperSegments.length > 0 ? (
        <div className={styles.timelineSpurLabel}>Einfueger / PV</div>
      ) : null}
      {upperSegments.length > 0 ? (
        <div className={styles.timelineTrack} style={{ marginBottom: 6 }}>
          {upperSegments.map(renderBlock)}
        </div>
      ) : null}

      {/* Lower spur: OP/ED with Hauptinhalt */}
      <div className={styles.timelineSpurLabel}>OP / ED</div>
      <div className={styles.timelineTrack}>
        {lowerSegments.map(renderBlock)}
        {opMaxEnd != null && edMinStart != null && edMinStart > opMaxEnd ? (
          <div
            className={styles.timelineMainContent}
            style={{
              left: `${(opMaxEnd / maxEnd) * 100}%`,
              width: `${((edMinStart - opMaxEnd) / maxEnd) * 100}%`,
            }}
          >
            Hauptinhalt
          </div>
        ) : null}
      </div>
    </>
  )
}

// --- Main component ---
export function SegmenteTab({ animeId, groupId, version, episodeNumber }: SegmenteTabProps) {
  const { segments, themes, isLoading, errorMessage, create, update, remove } = useReleaseSegments({
    animeId,
    groupId,
    version,
  })

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [suggestions, setSuggestions] = useState<AdminThemeSegment[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [dropdownOpenId, setDropdownOpenId] = useState<number | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AdminThemeSegment | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load suggestions when episodeNumber changes
  useEffect(() => {
    if (!animeId || episodeNumber == null || !authToken) {
      setSuggestions([])
      return
    }
    setSuggestionsLoading(true)
    const excludeGroupId = groupId ?? undefined
    const excludeVersion = version ?? undefined
    getAnimeSegmentSuggestions(animeId, episodeNumber, excludeGroupId ?? undefined, excludeVersion ?? undefined, authToken)
      .then((res) => { setSuggestions(res.data) })
      .catch(() => { setSuggestions([]) })
      .finally(() => { setSuggestionsLoading(false) })
  }, [animeId, episodeNumber, groupId, version, authToken])

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

  async function adoptSuggestion(suggestion: AdminThemeSegment) {
    if (!animeId) return
    const input: AdminThemeSegmentCreateRequest = {
      theme_id: suggestion.theme_id,
      fansub_group_id: groupId ?? null,
      version: version ?? 'v1',
      start_episode: suggestion.start_episode,
      end_episode: suggestion.end_episode,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
      source_jellyfin_item_id: null,
    }
    await create(input)
    setSuggestions((current) => current.filter((s) => s.id !== suggestion.id))
  }

  async function handleSave() {
    if (!formState.themeId) {
      setFormError('Bitte einen Typ auswaehlen.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    // Map source_type back to legacy field for now (backend may not support source_type yet)
    const legacyJellyfinId =
      formState.sourceType === 'jellyfin_theme' && editingSegment?.source_jellyfin_item_id
        ? editingSegment.source_jellyfin_item_id
        : null

    try {
      if (editingSegment) {
        const patch: AdminThemeSegmentPatchRequest = {
          theme_id: parseInt(formState.themeId, 10),
          start_episode: formState.startEpisode ? parseInt(formState.startEpisode, 10) : null,
          end_episode: formState.endEpisode ? parseInt(formState.endEpisode, 10) : null,
          start_time: formState.startTime || null,
          end_time: formState.endTime || null,
          source_jellyfin_item_id: formState.sourceType === 'none' ? null : legacyJellyfinId,
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
          source_jellyfin_item_id: null,
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

  const episodeLabel = episodeNumber != null ? `Aktive Segmente fuer Episode ${episodeNumber}` : 'Segmente verwalten'
  const episodeSubtitle = episodeNumber != null
    ? `Zeigt alle Segmente, deren Episodenbereich Episode ${episodeNumber} abdeckt.`
    : 'OP/ED-Timing fuer diese Gruppe und Version.'

  return (
    <div className={styles.tabContent}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>{episodeLabel}</h2>
          <p className={styles.toolbarSubtitle}>{episodeSubtitle}</p>
        </div>
        <button type="button" className={styles.addButton} onClick={openAddPanel}>
          <Plus size={14} />
          Segment hinzufuegen
        </button>
      </div>

      {/* Suggestions bar */}
      {suggestionsLoading ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>Vorschlaege werden geladen...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>
            Vorschlaege aus anderen Releases fuer Episode {episodeNumber}:
          </span>
          <div className={styles.suggestionsList}>
            {suggestions.map((s) => (
              <div key={s.id} className={styles.suggestionItem}>
                <span className={`${styles.badge} ${getTypeBadgeClass(s.theme_type_name)}`}>
                  {getTypeBadgeLabel(s.theme_type_name)}
                </span>
                <span className={styles.suggestionMeta}>
                  {formatEpisodeRange(s.start_episode, s.end_episode)}
                  {s.start_time && s.end_time ? ` \u00B7 ${formatDuration(s.start_time, s.end_time)}` : ''}
                </span>
                <button
                  type="button"
                  className={styles.suggestionAdoptButton}
                  onClick={() => void adoptSuggestion(s)}
                >
                  Uebernehmen
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
                <th>Name</th>
                <th>Episoden</th>
                <th>Zeitbereich</th>
                <th>Quelle</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Noch keine Segmente vorhanden. Klicke &ldquo;Segment hinzufuegen&rdquo; um zu beginnen.
                  </td>
                </tr>
              ) : (
                segments.map((segment) => {
                  const isActive = episodeNumber != null && isSegmentActiveForEpisode(segment, episodeNumber)
                  return (
                    <tr
                      key={segment.id}
                      className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ''}`}
                    >
                      <td>
                        <span className={`${styles.badge} ${getTypeBadgeClass(segment.theme_type_name)}`}>
                          {getTypeBadgeLabel(segment.theme_type_name)}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#6b6b70' }}>
                        {segment.theme_title ?? '\u2014'}
                      </td>
                      <td>
                        {formatEpisodeRange(segment.start_episode, segment.end_episode)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {segment.start_time && segment.end_time
                          ? formatDuration(segment.start_time, segment.end_time)
                          : '\u2014'}
                      </td>
                      <td style={{ fontSize: 13, color: '#6b6b70' }}>
                        {resolveSourceLabel(segment)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Bearbeiten"
                            onClick={() => openEditPanel(segment)}
                          >
                            <Pencil size={14} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Mehr Aktionen"
                              onClick={() => setDropdownOpenId(dropdownOpenId === segment.id ? null : segment.id)}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {dropdownOpenId === segment.id ? (
                              <div className={styles.dropdown}>
                                <button
                                  type="button"
                                  className={styles.dropdownItem}
                                  onClick={() => {
                                    setDropdownOpenId(null)
                                    void handleDelete(segment)
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Loeschen
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
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
        <SegmentTimeline segments={segments} />
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

            {/* Source type selector - explicit, no free Jellyfin picker */}
            <div className={styles.panelField}>
              <label htmlFor="seg-source-type">Quelle</label>
              <select
                id="seg-source-type"
                value={formState.sourceType}
                onChange={(e) => setFormState((s) => ({ ...s, sourceType: e.target.value as AdminSegmentSourceType }))}
              >
                <option value="none">Keine Quelle</option>
                <option value="jellyfin_theme">Jellyfin Serien-Theme</option>
                <option value="release_asset">Datei aus Release-Ordner</option>
              </select>
              {formState.sourceType === 'none' ? (
                <p className={styles.sourceHelpText}>Keine externe Quelle — Zeitbereich wurde manuell ermittelt.</p>
              ) : formState.sourceType === 'jellyfin_theme' ? (
                <p className={styles.sourceHelpText}>Timing stammt aus einem Jellyfin Serien-Theme-Eintrag. Jellyfin-Verknuepfung wird in einer spaeten Phase editierbar.</p>
              ) : (
                <p className={styles.sourceHelpText}>Timing stammt aus einem Release-Asset. Asset-Selector wird in einer spaeteren Phase ergaenzt.</p>
              )}
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
