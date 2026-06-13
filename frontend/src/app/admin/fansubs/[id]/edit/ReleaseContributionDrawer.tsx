'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Toolbar,
} from '@/components/ui'
import {
  deleteAnimeContribution,
  listEffectiveContributionsForVersion,
  listUnifiedGroupMembers,
  upsertAnimeContribution,
} from '@/lib/api'
import type { EffectiveContributionRow, UnifiedGroupMember } from '@/types/fansub'

import { ContributorAvatar } from './ContributorAvatar'
import styles from './FansubEdit.module.css'

const ANIME_CONTRIBUTION_ROLES: { code: string; label: string }[] = [
  { code: 'translator', label: 'Übersetzer' },
  { code: 'timer', label: 'Timer' },
  { code: 'typesetter', label: 'Typesetter' },
  { code: 'editor', label: 'Editor' },
  { code: 'encoder', label: 'Encoder' },
  { code: 'raw_provider', label: 'Raw-Provider' },
  { code: 'quality_checker', label: 'Qualitätsprüfer' },
  { code: 'designer', label: 'Designer' },
]

function normalizeRoleCodes(codes: string[]): string[] {
  const selected = new Set(codes.filter(Boolean))
  const known = ANIME_CONTRIBUTION_ROLES
    .map((role) => role.code)
    .filter((code) => selected.has(code))
  const unknown = codes.filter(
    (code) => code && !ANIME_CONTRIBUTION_ROLES.some((role) => role.code === code),
  )
  return Array.from(new Set([...known, ...unknown]))
}

function sameRoleCodes(a: string[], b: string[]): boolean {
  const left = normalizeRoleCodes(a)
  const right = normalizeRoleCodes(b)
  return left.length === right.length && left.every((code, index) => code === right[index])
}

function roleLabels(codes: string[]): string[] {
  return normalizeRoleCodes(codes).map(
    (code) => ANIME_CONTRIBUTION_ROLES.find((role) => role.code === code)?.label ?? code,
  )
}

type ContributionSource = 'release_version' | 'anime_default'
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
  animeId,
  releaseVersionId,
  releaseTitle,
  onClose,
  onSaved,
}: ReleaseContributionDrawerProps) {
  const [stagedRows, setStagedRows] = useState<EditableContributionRow[]>([])
  const [originalRolesById, setOriginalRolesById] = useState<Record<number, string[]>>({})
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [members, setMembers] = useState<UnifiedGroupMember[]>([])
  const [source, setSource] = useState<ContributionSource>('anime_default')
  const [isOverride, setIsOverride] = useState(false)
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
    setOriginalRolesById({})
    setRemovedIds([])
    setAddingRow(false)
    setNewMemberId(null)
    setNewRoleCodes([])
    setEditingRoleIds(new Set())
    setSource('anime_default')
    setIsOverride(false)

    Promise.all([
      listUnifiedGroupMembers(fansubId),
      listEffectiveContributionsForVersion(releaseVersionId, fansubId),
    ])
      .then(([membersResult, contributionsResult]) => {
        if (cancelled) return
        const rows = (contributionsResult.data ?? []).map((row) => ({
          ...row,
          role_codes: normalizeRoleCodes(row.role_codes),
        }))

        setMembers(membersResult ?? [])
        setStagedRows(rows)
        setOriginalRolesById(
          Object.fromEntries(rows.map((row) => [row.contribution_id, row.role_codes])),
        )
        setSource(contributionsResult.meta.source)
        setIsOverride(contributionsResult.meta.is_override)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, fansubId, releaseVersionId])

  function handleRemove(row: EditableContributionRow) {
    setStagedRows((prev) => prev.filter((r) => r.contribution_id !== row.contribution_id))
    if (!row.isNew && source === 'release_version') {
      setRemovedIds((prev) => [...prev, row.contribution_id])
    }
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

      const originalRowCount = Object.keys(originalRolesById).length
      if (source === 'anime_default' && originalRowCount > 0 && stagedRows.length === 0) {
        setError('Eine komplett leere Release-Besetzung kann aktuell nicht gespeichert werden.')
        return
      }

      const hasRowSetChange = stagedRows.length !== originalRowCount
      const hasPendingChanges =
        hasRowSetChange ||
        removedIds.length > 0 ||
        stagedRows.some(
          (row) =>
            row.isNew ||
            !sameRoleCodes(row.role_codes, originalRolesById[row.contribution_id] ?? []),
        )

      if (hasPendingChanges) {
        if (source === 'release_version') {
          await Promise.all(removedIds.map((id) => deleteAnimeContribution(fansubId, animeId, id)))
        }

        const rowsToWrite =
          source === 'anime_default'
            ? stagedRows
            : stagedRows.filter(
                (row) =>
                  row.isNew ||
                  !sameRoleCodes(row.role_codes, originalRolesById[row.contribution_id] ?? []),
              )

        await Promise.all(
          rowsToWrite.map((row) =>
            upsertAnimeContribution(fansubId, animeId, {
              member_id: row.member_id,
              role_codes: normalizeRoleCodes(row.role_codes),
              release_version_id: releaseVersionId,
              started_year: null,
              ended_year: null,
              note: null,
              is_public_on_anime_page: false,
              is_public_on_member_profile: false,
              status: 'confirmed',
            }),
          ),
        )
      }

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
  const statusLabel = isOverride ? 'Eigene Release-Besetzung' : 'Projektteam geerbt'
  const statusVariant = isOverride ? 'info' : 'muted'

  const changeHint = useMemo(() => {
    if (source === 'anime_default') {
      return 'Beim Speichern wird aus dem Projektteam eine eigene Besetzung nur für diese Folge.'
    }
    if (stagedRows.length === 0) {
      return 'Ohne eigene Zeilen fällt diese Folge wieder auf das Projektteam zurück.'
    }
    return 'Änderungen gelten nur für diese Release-Version.'
  }, [source, stagedRows.length])

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
      title="Besetzung dieser Folge"
      description={releaseTitle}
      footer={footer}
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Fehler" description={error} />
      ) : (
        <>
          <Toolbar
            className={styles.contributionDrawerToolbar}
            leading={
              <div className={styles.contributionToolbarMeta}>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                <span>{stagedRows.length} Person{stagedRows.length === 1 ? '' : 'en'}</span>
              </div>
            }
            trailing={
              !addingRow ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setAddingRow(true)}
                >
                  Person hinzufügen
                </Button>
              ) : null
            }
          />

          <p className={styles.contributionDrawerHint}>{changeHint}</p>

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
                <div className={styles.contributionRoleToggles} aria-label="Rollen für neue Person">
                  {ANIME_CONTRIBUTION_ROLES.map((role) => {
                    const active = newRoleCodes.includes(role.code)
                    return (
                      <button
                        key={role.code}
                        type="button"
                        className={`${styles.contributionRoleToggle} ${
                          active ? styles.contributionRoleToggleActive : ''
                        }`}
                        aria-pressed={active}
                        onClick={() => handleNewRoleToggle(role.code)}
                      >
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.contributionAddActions}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddConfirm}
                  leftIcon={<Users size={16} />}
                  disabled={!canAddRow}
                >
                  Übernehmen
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingRow(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}

          {stagedRows.length === 0 && !addingRow ? (
            <EmptyState
              title="Noch keine Rollen vergeben"
              description="Füge Personen aus dieser Fansubgruppe hinzu und wähle ihre Rollen für diese Folge."
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
                        <div
                          className={styles.contributionRoleToggles}
                          aria-label={`Rollen für ${row.member_display_name}`}
                        >
                          {ANIME_CONTRIBUTION_ROLES.map((role) => {
                            const active = row.role_codes.includes(role.code)
                            return (
                              <button
                                key={role.code}
                                type="button"
                                className={`${styles.contributionRoleToggle} ${
                                  active ? styles.contributionRoleToggleActive : ''
                                }`}
                                aria-pressed={active}
                                onClick={() => handleRoleToggle(row.contribution_id, role.code)}
                              >
                                {role.label}
                              </button>
                            )
                          })}
                        </div>
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
                        variant="danger"
                        iconOnly
                        size="sm"
                        aria-label={`${row.member_display_name} entfernen`}
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
