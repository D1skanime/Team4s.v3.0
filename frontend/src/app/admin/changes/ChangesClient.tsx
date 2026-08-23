'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Pagination,
} from '@/components/ui'
import { ApiError, listChanges, listRoleCapabilities } from '@/lib/api'
import type { AdminChangeEntry } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'

import { translateChangeEntry as translateEntry } from './ChangeEntryTranslator'
import { useChangesListFilters } from './useChangesListFilters'

/**
 * D-25: target_types, deren `target_id` real der App-User-ID des betroffenen Nutzers
 * entspricht (gegengeprüft an den jeweiligen Go-Audit-Aufrufstellen, siehe
 * ChangeEntryTranslator.ts's Dateikommentar) — nur für diese wird die Ziel-Zelle als
 * navigierbarer Benutzer-Link gerendert. Andere target_types (z. B. "role_capability",
 * "member", "member_claim") tragen eine andere ID-Semantik und dürfen nicht fälschlich
 * als Benutzer-Link ausgegeben werden.
 */
const USER_TARGET_TYPES = new Set([
  'user_group_capability_override',
  'user_group_capability_override_history',
  'effective_rights',
  'app_user',
])

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function ChangesClient() {
  const router = useRouter()

  const [items, setItems] = useState<AdminChangeEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)

  // Mount-only, fail-open Matrix-Ladepattern (mirrors UserGroupRightsTab.tsx) -- ein
  // Ladefehler oder ein in Tests gemocktes fehlendes Export darf den Effekt nie crashen lassen.
  useEffect(() => {
    async function loadMatrix() {
      try {
        const result = await listRoleCapabilities()
        setMatrix(result)
      } catch {
        setMatrix(null)
      }
    }
    void loadMatrix()
  }, [])

  const {
    params,
    handleUserChange,
    handleActorChange,
    handleGroupChange,
    handleTargetTypeChange,
    handleDateRangeChange,
    handlePageChange,
  } = useChangesListFilters()

  // Lokale Zwischenwerte für die numerischen ID-Filter und den Ziel-Typ-Filter — schreiben
  // erst onBlur in die URL, damit nicht bei jeder eingegebenen Ziffer ein eigener
  // listChanges-Request ausgelöst wird (identisches Muster wie ClaimsClient.tsx).
  const [userIdInput, setUserIdInput] = useState(params.benutzer?.toString() ?? '')
  const [actorIdInput, setActorIdInput] = useState(params.akteur?.toString() ?? '')
  const [groupIdInput, setGroupIdInput] = useState(params.gruppe?.toString() ?? '')
  const [targetTypeInput, setTargetTypeInput] = useState(params.target_type ?? '')

  useEffect(() => {
    setUserIdInput(params.benutzer?.toString() ?? '')
  }, [params.benutzer])

  useEffect(() => {
    setActorIdInput(params.akteur?.toString() ?? '')
  }, [params.akteur])

  useEffect(() => {
    setGroupIdInput(params.gruppe?.toString() ?? '')
  }, [params.gruppe])

  useEffect(() => {
    setTargetTypeInput(params.target_type ?? '')
  }, [params.target_type])

  const loadChanges = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listChanges(params)
      setItems(resp.data)
      setTotal(resp.meta.total)
    } catch (err) {
      setError(readErrorMessage(err, 'Änderungen konnten nicht geladen werden. Bitte Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadChanges()
  }, [loadChanges])

  function handleNavigateToUser(appUserId: number) {
    router.push(`/admin/users/${appUserId}`)
  }

  const limit = params.limit ?? 25
  const currentPage = Math.floor((params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <h1>Änderungen</h1>

      {/* Filter-Bereich (D-25/D-28: Benutzer, Akteur, Gruppe, Ziel-Typ, Zeitraum) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          alignItems: 'flex-end',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Benutzer (ID)" htmlFor="changes-user-filter">
          <Input
            id="changes-user-filter"
            type="number"
            min={1}
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.currentTarget.value)}
            onBlur={() => handleUserChange(userIdInput)}
          />
        </FormField>

        <FormField label="Akteur (ID)" htmlFor="changes-actor-filter">
          <Input
            id="changes-actor-filter"
            type="number"
            min={1}
            value={actorIdInput}
            onChange={(e) => setActorIdInput(e.currentTarget.value)}
            onBlur={() => handleActorChange(actorIdInput)}
          />
        </FormField>

        <FormField label="Gruppe (ID)" htmlFor="changes-group-filter">
          <Input
            id="changes-group-filter"
            type="number"
            min={1}
            value={groupIdInput}
            onChange={(e) => setGroupIdInput(e.currentTarget.value)}
            onBlur={() => handleGroupChange(groupIdInput)}
          />
        </FormField>

        <FormField label="Ziel-Typ" htmlFor="changes-target-type-filter">
          <Input
            id="changes-target-type-filter"
            type="text"
            value={targetTypeInput}
            onChange={(e) => setTargetTypeInput(e.currentTarget.value)}
            onBlur={() => handleTargetTypeChange(targetTypeInput)}
          />
        </FormField>

        <FormField label="Von" htmlFor="changes-from-filter">
          <Input
            id="changes-from-filter"
            type="date"
            value={params.from ?? ''}
            onChange={(e) => handleDateRangeChange(e.currentTarget.value, params.to ?? '')}
          />
        </FormField>

        <FormField label="Bis" htmlFor="changes-to-filter">
          <Input
            id="changes-to-filter"
            type="date"
            value={params.to ?? ''}
            onChange={(e) => handleDateRangeChange(params.from ?? '', e.currentTarget.value)}
          />
        </FormField>
      </div>

      {isLoading ? (
        <LoadingState title="Änderungen werden geladen …" description="" />
      ) : error ? (
        <ErrorState title="Fehler beim Laden" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Keine Änderungen gefunden."
          description="Für die gewählten Filter liegen keine administrativen Änderungen vor. Zeitraum oder Filter anpassen."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map((entry) => (
            <ChangeEntryCard
              key={entry.event_id}
              entry={entry}
              matrix={matrix}
              onNavigateToUser={handleNavigateToUser}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  )
}

interface ChangeEntryCardProps {
  entry: AdminChangeEntry
  matrix: RoleCapabilityMatrix | null
  onNavigateToUser: (appUserId: number) => void
}

/**
 * D-32 (responsiv, binding): Card variant="flat" pro Eintrag statt einer breiten Tabelle —
 * stapelt bereits unterhalb von 760px sauber, ohne separaten Schmal-Viewport-Codepfad.
 */
function ChangeEntryCard({ entry, matrix, onNavigateToUser }: ChangeEntryCardProps) {
  const translation = translateEntry(entry, matrix)

  return (
    <Card variant="flat">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {entry.actor_app_user_id != null ? (
            <Button variant="ghost" onClick={() => onNavigateToUser(entry.actor_app_user_id as number)}>
              {entry.actor_display_name ?? `Benutzer #${entry.actor_app_user_id}`}
            </Button>
          ) : (
            <Button variant="ghost" disabled>
              System
            </Button>
          )}

          {USER_TARGET_TYPES.has(entry.target_type) && entry.target_id != null ? (
            <Button variant="ghost" onClick={() => onNavigateToUser(entry.target_id as number)}>
              {entry.target_display_name ?? `Benutzer #${entry.target_id}`}
            </Button>
          ) : (
            <Button variant="ghost" disabled>
              {entry.target_id != null ? `${entry.target_type} #${entry.target_id}` : entry.target_type}
            </Button>
          )}
        </div>

        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(entry.occurred_at)}</span>
      </div>

      <p style={{ margin: 0 }}>{translation.sentence}</p>

      {translation.before && translation.after ? (
        <div style={{ marginTop: 'var(--space-2)', fontSize: '13px', color: 'var(--text-muted)' }}>
          <div>Vorher: {translation.before}</div>
          <div>Nachher: {translation.after}</div>
        </div>
      ) : null}
    </Card>
  )
}
