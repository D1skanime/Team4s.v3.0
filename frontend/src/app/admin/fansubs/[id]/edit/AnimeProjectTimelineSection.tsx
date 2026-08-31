'use client'

import { useEffect, useState } from 'react'

import { Button, DatePicker } from '@/components/ui'
import {
  ApiError,
  getAnimeFansubProjectTimeline,
  updateAnimeFansubProjectTimeline,
} from '@/lib/api'
import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'

type Props = {
  fansubId: number
  animeId: number
  expanded: boolean
  canEdit: boolean
}

const emptyTimeline = (): AnimeFansubProjectTimeline => ({
  animeId: 0,
  fansubGroupId: 0,
  productionStartedOn: null,
  productionCompletedOn: null,
})

export function AnimeProjectTimelineSection({ fansubId, animeId, expanded, canEdit }: Props) {
  const [timeline, setTimeline] = useState<AnimeFansubProjectTimeline>(emptyTimeline)
  const [startedOn, setStartedOn] = useState('')
  const [completedOn, setCompletedOn] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) return
    let active = true
    setLoading(true)
    setError(null)
    getAnimeFansubProjectTimeline(fansubId, animeId)
      .then((loaded) => {
        if (!active) return
        setTimeline(loaded)
        setStartedOn(loaded.productionStartedOn ?? '')
        setCompletedOn(loaded.productionCompletedOn ?? '')
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Projektzeitraum konnte nicht geladen werden.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [expanded, fansubId, animeId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await updateAnimeFansubProjectTimeline(fansubId, animeId, {
        productionStartedOn: startedOn || null,
        productionCompletedOn: completedOn || null,
      })
      setTimeline(saved)
      setStartedOn(saved.productionStartedOn ?? '')
      setCompletedOn(saved.productionCompletedOn ?? '')
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Projektzeitraum konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const changed = startedOn !== (timeline.productionStartedOn ?? '') || completedOn !== (timeline.productionCompletedOn ?? '')

  return (
    <section aria-label="Projektzeitraum">
      <h4>Projektzeitraum</h4>
      <p>Zeitraum, in dem diese Fansubgruppe an diesem Anime-Projekt gearbeitet hat.</p>
      {loading ? <p>Projektzeitraum wird geladen...</p> : null}
      {!loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: 'var(--space-3)' }}>
          <div>
            <label htmlFor={`project-start-${animeId}`}>Projekt begonnen am</label>
            <DatePicker
              id={`project-start-${animeId}`}
              label="Projekt begonnen am"
              value={startedOn}
              minYear={1950}
              maxYear={currentYear + 5}
              disabled={!canEdit || saving}
              onChange={setStartedOn}
            />
          </div>
          <div>
            <label htmlFor={`project-completed-${animeId}`}>Projekt abgeschlossen am</label>
            <DatePicker
              id={`project-completed-${animeId}`}
              label="Projekt abgeschlossen am"
              value={completedOn}
              minYear={1950}
              maxYear={currentYear + 5}
              minDate={startedOn || undefined}
              disabled={!canEdit || saving}
              panelAlign="end"
              onChange={setCompletedOn}
            />
          </div>
        </div>
      ) : null}
      {error ? <p style={{ color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>{error}</p> : null}
      {canEdit ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={loading || saving || !changed}>
            {saving ? 'Speichern...' : 'Projektzeitraum speichern'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
