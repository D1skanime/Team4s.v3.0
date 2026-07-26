'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Select,
} from '@/components/ui'
import {
  listEffectiveContributionsForVersion,
  listUnifiedGroupMembers,
  replaceReleaseCrew,
} from '@/lib/api'
import type {
  EffectiveContributionRow,
  ReleaseCrewSnapshotMode,
  UnifiedGroupMember,
} from '@/types/fansub'

import { ContributorAvatar } from './ContributorAvatar'
import { normalizeRoleCodes, roleLabels } from './contributionRoles'
import { RoleToggleGroup } from './RoleToggleGroup'
import styles from './FansubEdit.module.css'

type EditableContributionRow = EffectiveContributionRow & { isNew?: boolean }

interface ReleaseContributionDrawerProps {
  open: boolean
  fansubId: number
  animeId: number
  releaseVersionId: number
  releaseTitle: string
  onClose: () => void
  onSaved: () => void
}

export function ReleaseContributionDrawer({
  open,
  fansubId,
  releaseVersionId,
  releaseTitle,
  onClose,
  onSaved,
}: ReleaseContributionDrawerProps) {
  const [stagedRows, setStagedRows] = useState<EditableContributionRow[]>([])
  const [members, setMembers] = useState<UnifiedGroupMember[]>([])
  const [snapshotMode, setSnapshotMode] = useState<ReleaseCrewSnapshotMode>('inherited')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [newMemberId, setNewMemberId] = useState<number | null>(null)
  const [newRoleCodes, setNewRoleCodes] = useState<string[]>([])
  const [editingRoleIds, setEditingRoleIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setStagedRows([])
    setAddingRow(false)
    setNewMemberId(null)
    setNewRoleCodes([])
    setEditingRoleIds(new Set())
    setSnapshotMode('inherited')

    void (async () => {
      try {
        const membersResult = await listUnifiedGroupMembers(fansubId)
        const contributionsResult = await listEffectiveContributionsForVersion(
          releaseVersionId,
          fansubId,
        )
        if (cancelled) return
        const rows = (contributionsResult.data ?? []).map((row) => ({
          ...row,
          role_codes: normalizeRoleCodes(row.role_codes),
        }))

        setMembers(membersResult ?? [])
        setStagedRows(rows)
        setSnapshotMode(contributionsResult.meta.snapshot_mode)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, fansubId, releaseVersionId])

  function handleRemove(row: EditableContributionRow) {
    setStagedRows((prev) => prev.filter((r) => r.contribution_id !== row.contribution_id))
  }

  function handleRoleToggle(contributionId: number, roleCode: string) {
    setStagedRows((prev) =>
      prev.map((row) => {
        if (row.contribution_id !== contributionId) return row
        const selected = new Set(row.role_codes)
        if (selected.has(roleCode)) {
          selected.delete(roleCode)
        } else {
          selected.add(roleCode)
        }
        return { ...row, role_codes: normalizeRoleCodes(Array.from(selected)) }
      }),
    )
  }

  function toggleRoleEditor(contributionId: number) {
    setEditingRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(contributionId)) {
        next.delete(contributionId)
      } else {
        next.add(contributionId)
      }
      return next
    })
  }

  function handleNewRoleToggle(roleCode: string) {
    setNewRoleCodes((prev) => {
      const selected = new Set(prev)
      if (selected.has(roleCode)) {
        selected.delete(roleCode)
      } else {
        selected.add(roleCode)
      }
      return normalizeRoleCodes(Array.from(selected))
    })
  }

  function handleAddConfirm() {
    if (newMemberId == null || newRoleCodes.length === 0) return
    const member = members.find((m) => m.member_id === newMemberId)
    if (!member) return

    const tempId = -Date.now()
    setStagedRows((prev) => [
      ...prev,
      {
        contribution_id: tempId,
        member_id: member.member_id,
        member_display_name: member.display_name,
        member_avatar_url: null,
        role_codes: normalizeRoleCodes(newRoleCodes),
        isNew: true,
      },
    ])
    setAddingRow(false)
    setNewMemberId(null)
    setNewRoleCodes([])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (stagedRows.some((row) => row.role_codes.length === 0)) {
        setError('Jede Person braucht mindestens eine Rolle.')
        return
      }

      await replaceReleaseCrew(releaseVersionId, fansubId, {
        rows: stagedRows
          .map((row) => ({
            member_id: row.member_id,
            role_codes: normalizeRoleCodes(row.role_codes),
          }))
          .sort((left, right) => left.member_id - right.member_id),
      })

      onSaved()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Speichern fehlgeschlagen. Bitte Eingaben prüfen und erneut versuchen.',
      )
    } finally {
      setSaving(false)
    }
  }

  const assignedMemberIds = new Set(stagedRows.map((r) => r.member_id))
  const availableMembers = members.filter((m) => !assignedMemberIds.has(m.member_id))
  const hasRowsWithoutRoles = stagedRows.some((row) => row.role_codes.length === 0)
  const canAddRow = newMemberId != null && newRoleCodes.length > 0
  const isIndependent = snapshotMode === 'independent'
  const isUninitialized = snapshotMode === 'uninitialized'
  const statusLabel = isUninitialized
    ? 'Besetzung noch nicht initialisiert'
    : isIndependent
      ? 'Eigene Release-Besetzung'
      : 'Projektbesetzung geerbt'
  const statusVariant = isIndependent ? 'info' : 'muted'
  const changeHint = isUninitialized
    ? 'Diese ältere Release-Version besitzt noch keine gespeicherte Besetzung. Beim Speichern wird die sichtbare Auswahl als eigene Release-Besetzung angelegt.'
    : isIndependent
      ? 'Diese Besetzung bleibt unabhängig von späteren Änderungen am Projektteam.'
      : 'Beim ersten Speichern wird diese vollständige Besetzung dauerhaft unabhängig.'

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>
        Abbrechen
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        loading={saving}
        disabled={loading || hasRowsWithoutRoles}
      >
        Speichern
      </Button>
    </>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Besetzung: ${releaseTitle}`}
      description={`${stagedRows.length} Person${stagedRows.length === 1 ? '' : 'en'} — vollständige Besetzung dieser Version`}
      footer={footer}
      variant="responsiveSheet"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Fehler" description={error} />
      ) : (
        <>
          <div className={styles.contributionSheetIntro}>
            <div className={styles.contributionToolbarMeta}>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              <span>{changeHint}</span>
            </div>
            {!addingRow ? (
              <Button
                variant="secondary"
                leftIcon={<Plus size={16} />}
                onClick={() => setAddingRow(true)}
              >
                Person hinzufügen
              </Button>
            ) : null}
          </div>

          {addingRow ? (
            <div className={styles.contributionAddPanel}>
              <FormField label="Person" htmlFor="new-member-select">
                <Select
                  id="new-member-select"
                  value={newMemberId != null ? String(newMemberId) : ''}
                  onChange={(event) =>
                    setNewMemberId(event.currentTarget.value ? Number(event.currentTarget.value) : null)
                  }
                >
                  <option value="">Person wählen</option>
                  {availableMembers.map((member) => (
                    <option key={member.member_id} value={member.member_id}>
                      {member.display_name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className={styles.contributionRolesCell}>
                <span className={styles.contributionRoleLabel}>Rollen</span>
                <RoleToggleGroup
                  selectedCodes={newRoleCodes}
                  onToggle={handleNewRoleToggle}
                  ariaLabel="Rollen für neue Person"
                />
              </div>
              <div className={styles.contributionAddActions}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddConfirm}
                  leftIcon={<Users size={16} />}
                  disabled={!canAddRow}
                >
                  Hinzufügen
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingRow(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}

          {stagedRows.length === 0 && !addingRow ? (
            <EmptyState
              title={isUninitialized ? 'Besetzung noch nicht initialisiert' : 'Noch keine Rollen vergeben'}
              description={
                isUninitialized
                  ? 'Füge die bestätigten Personen und Rollen dieser älteren Release-Version bewusst hinzu oder speichere eine leere eigene Besetzung.'
                  : 'Füge Personen aus dieser Fansubgruppe hinzu und wähle ihre Rollen für diese Folge.'
              }
            />
          ) : (
            <div className={styles.contributionRows} role="list" aria-label="Besetzung dieser Folge">
              {stagedRows.map((row) => {
                const labels = roleLabels(row.role_codes)
                return (
                  <div key={row.contribution_id} className={styles.contributionEditRow} role="listitem">
                    <div className={styles.contributionPersonCell}>
                      <ContributorAvatar
                        name={row.member_display_name}
                        avatarUrl={row.member_avatar_url}
                      />
                      <div>
                        <strong>{row.member_display_name}</strong>
                        {row.isNew ? <span>Neu</span> : null}
                      </div>
                    </div>
                    <div className={styles.contributionRolesCell}>
                      <div className={styles.contributionRoleSummaryLine}>
                        <div className={styles.contributionRoleSummaryChips}>
                          {labels.length > 0 ? (
                            labels.map((label) => (
                              <span key={label} className={styles.contributionRoleSummaryChip}>
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className={styles.contributionRoleSummaryEmpty}>Keine Rolle</span>
                          )}
                        </div>
                      </div>
                      {editingRoleIds.has(row.contribution_id) ? (
                        <RoleToggleGroup
                          selectedCodes={row.role_codes}
                          onToggle={(code) => handleRoleToggle(row.contribution_id, code)}
                          ariaLabel={`Rollen für ${row.member_display_name}`}
                        />
                      ) : null}
                    </div>
                    <div className={styles.contributionRowActions}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil size={15} />}
                        aria-label={`Rollen für ${row.member_display_name} ändern`}
                        onClick={() => toggleRoleEditor(row.contribution_id)}
                      >
                        {editingRoleIds.has(row.contribution_id) ? 'Fertig' : 'Rollen ändern'}
                      </Button>
                      <Button
                        variant="ghost"
                        iconOnly
                        size="sm"
                        aria-label={`${row.member_display_name} entfernen`}
                        className={styles.contributionRemoveButton}
                        onClick={() => handleRemove(row)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {hasRowsWithoutRoles ? (
            <p className={styles.contributionInlineWarning}>
              Jede Person braucht mindestens eine Rolle.
            </p>
          ) : null}
        </>
      )}
    </Drawer>
  )
}
