'use client'

import { useEffect, useState } from 'react'

import {
  ApiError,
  applyDefaultCrew,
  deleteDefaultCrewEntry,
  listDefaultCrew,
  upsertDefaultCrewEntry,
} from '@/lib/api'
import type { DefaultCrewEntry, UnifiedGroupMember } from '@/types/fansub'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import {
  Badge,
  Button,
  EmptyState,
  FormField,
  SectionHeader,
  Select,
} from '@/components/ui'

// D-09: operative Rollen — fansub_lead nicht im Standard-Team
const CREW_ROLE_OPTIONS = FANSUB_GROUP_ROLE_OPTIONS.filter(
  (role) => role.code !== 'fansub_lead',
)

type Props = {
  fansubId: number
  members: UnifiedGroupMember[]
}

export function DefaultCrewManager({ fansubId, members }: Props) {
  const [crew, setCrew] = useState<DefaultCrewEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [addMemberId, setAddMemberId] = useState<string>('')
  const [addRoleCode, setAddRoleCode] = useState<string>('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    listDefaultCrew(fansubId)
      .then((entries) => {
        if (!cancelled) setCrew(entries)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Standard-Team konnte nicht geladen werden.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fansubId])

  function memberDisplayName(memberId: number): string {
    return members.find((m) => m.member_id === memberId)?.display_name ?? `Mitglied ${memberId}`
  }

  function roleLabelFor(code: string): string {
    return CREW_ROLE_OPTIONS.find((r) => r.code === code)?.label ?? code
  }

  async function handleApply() {
    setApplying(true)
    setApplyResult(null)
    setApplyError(null)
    try {
      const result = await applyDefaultCrew(fansubId)
      setApplyResult(`${result.applied_count} Contribution${result.applied_count === 1 ? '' : 's'} angelegt.`)
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Fehler beim Übernehmen des Standard-Teams.')
    } finally {
      setApplying(false)
    }
  }

  async function handleAdd() {
    setAddError(null)
    if (!addMemberId) { setAddError('Bitte ein Mitglied auswählen.'); return }
    if (!addRoleCode) { setAddError('Bitte eine Rolle auswählen.'); return }
    setAddBusy(true)
    try {
      await upsertDefaultCrewEntry(fansubId, Number(addMemberId), addRoleCode)
      const entries = await listDefaultCrew(fansubId)
      setCrew(entries)
      setAddMemberId('')
      setAddRoleCode('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Eintrag konnte nicht hinzugefügt werden.')
    } finally {
      setAddBusy(false)
    }
  }

  async function handleRemove(entry: DefaultCrewEntry) {
    const key = `${entry.member_id}:${entry.role_code}`
    setRemovingKey(key)
    try {
      await deleteDefaultCrewEntry(fansubId, entry.member_id, entry.role_code)
      setCrew((prev) => prev.filter((e) => !(e.member_id === entry.member_id && e.role_code === entry.role_code)))
    } catch {
      // Stiller Fehler — Reload-Ansatz
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Standard-Team"
        description="Stamm-Crew der Gruppe für automatische Zuweisung zu neuen Projekten."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleApply()}
            disabled={applying || crew.length === 0}
            loading={applying}
          >
            {applying ? 'Wird übernommen…' : 'Standard-Team übernehmen'}
          </Button>
        }
      />

      {applyResult ? (
        <p style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>{applyResult}</p>
      ) : null}
      {applyError ? (
        <p style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>{applyError}</p>
      ) : null}

      {loading ? (
        <p>Standard-Team wird geladen…</p>
      ) : loadError ? (
        <p style={{ color: 'var(--color-error)' }}>{loadError}</p>
      ) : crew.length === 0 ? (
        <EmptyState
          title="Noch kein Standard-Team konfiguriert"
          description="Füge Mitglieder und Rollen hinzu, um das Standard-Team zu definieren."
        />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', fontWeight: 600 }}>Mitglied</th>
              <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', fontWeight: 600 }}>Rolle</th>
              <th style={{ padding: '0.35rem 0.5rem' }} />
            </tr>
          </thead>
          <tbody>
            {crew.map((entry) => {
              const key = `${entry.member_id}:${entry.role_code}`
              return (
                <tr key={key}>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    {memberDisplayName(entry.member_id)}
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <Badge variant="neutral">{roleLabelFor(entry.role_code)}</Badge>
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemove(entry)}
                      disabled={removingKey === key}
                    >
                      {removingKey === key ? 'Wird entfernt…' : 'Entfernen'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormField label="Mitglied">
          <Select
            value={addMemberId}
            onChange={(e) => setAddMemberId(e.target.value)}
            disabled={addBusy}
          >
            <option value="">— Mitglied wählen —</option>
            {members.map((m) => (
              <option key={m.member_id} value={String(m.member_id)}>
                {m.display_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Rolle">
          <Select
            value={addRoleCode}
            onChange={(e) => setAddRoleCode(e.target.value)}
            disabled={addBusy}
          >
            <option value="">— Rolle wählen —</option>
            {CREW_ROLE_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </Select>
        </FormField>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={addBusy || !addMemberId || !addRoleCode}
          loading={addBusy}
        >
          Hinzufügen
        </Button>
      </div>
      {addError ? (
        <p style={{ color: 'var(--color-error)', marginTop: '0.35rem' }}>{addError}</p>
      ) : null}
    </div>
  )
}

export default DefaultCrewManager
