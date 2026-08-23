'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { ApiError, listChanges } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { AdminChangeEntry } from '@/types/admin-users'
import { translateChangeEntry as translateEntry } from '../../../changes/ChangeEntryTranslator'

/**
 * D-06 (Gruppenansicht "Änderungen"): reine Wiederverwendung von Plan 138-05s zentralem,
 * gefiltertem `listChanges`-Endpunkt (Filter-Parametername ist real `gruppe`, NICHT
 * `fansub_group_id` — gegen `AdminChangesListParams`/`ChangesClient.tsx` gegengeprüft; die
 * PLAN.md-Interfaces-Skizze hatte hier einen falschen Feldnamen, siehe SUMMARY.md-Abweichung)
 * und Plan 138-11s zentraler `translateChangeEntry`-Übersetzung (D-26: keine zweite
 * Übersetzungslogik). "Alle Änderungen ansehen" verlinkt auf die zentrale Fläche mit
 * demselben `gruppe`-Filter vorausgewählt (D-27: kontextbezogene Historie bleibt additiv zur
 * zentralen Änderungen-Fläche, niemals ein Ersatz).
 */

interface GroupChangesTabProps {
  fansubId: number
}

const PAGE_SIZE = 25

export function GroupChangesTab({ fansubId }: GroupChangesTabProps) {
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [entries, setEntries] = useState<AdminChangeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadChanges = useCallback(async () => {
    if (!hasAccessToken || fansubId <= 0) {
      setEntries([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setLoadError(null)
      const response = await listChanges({ gruppe: fansubId, limit: PAGE_SIZE, offset: 0 })
      setEntries(response.data)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Änderungen konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [fansubId, hasAccessToken])

  useEffect(() => {
    if (!isClientInitialized) return
    void loadChanges()
  }, [isClientInitialized, loadChanges])

  if (isLoading) {
    return (
      <LoadingState
        title="Änderungen werden geladen"
        description="Team4s lädt die Änderungshistorie dieser Fansubgruppe."
      />
    )
  }

  if (loadError) {
    return <ErrorState title="Änderungen konnten nicht geladen werden" description={loadError} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {entries.length === 0 ? (
        <EmptyState
          title="Keine Änderungen für diese Gruppe"
          description="Administrative Änderungen an dieser Fansubgruppe erscheinen hier, sobald sie stattfinden."
        />
      ) : (
        entries.map((entry) => {
          const translation = translateEntry(entry)
          return (
            <Card key={entry.event_id} variant="flat">
              <p style={{ margin: 0 }}>{translation.sentence}</p>
            </Card>
          )
        })
      )}
      <Button href={`/admin/changes?gruppe=${fansubId}`} variant="secondary">
        Alle Änderungen ansehen
      </Button>
    </div>
  )
}
