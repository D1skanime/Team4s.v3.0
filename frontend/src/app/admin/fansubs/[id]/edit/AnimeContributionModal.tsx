'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'

import {
  Button,
  Drawer,
  EmptyState,
  FormField,
  Select,
} from '@/components/ui'
import {
  deleteAnimeContribution,
  upsertAnimeContribution,
} from '@/lib/api'
import type {
  AnimeContribution,
  UnifiedGroupMember,
} from '@/types/fansub'

import { ContributorAvatar } from './ContributorAvatar'
import { ANIME_CONTRIBUTION_ROLES, normalizeRoleCodes, roleLabels, sameRoleCodes } from './contributionRoles'
import { RoleToggleGroup } from './RoleToggleGroup'
import styles from './FansubEdit.module.css'

type EditableProjectContribution = {
  contribution_id: number
  member_id: number
  member_display_name: string
  member_avatar_url?: string | null
  role_codes: string[]
  isNew?: boolean
}

type Props = {
  fansubId: number
  animeId: number
  animeTitle: string
  members: UnifiedGroupMember[]
  existingContributions: AnimeContribution[]
  focusedRoleCode?: string | null
  onClose: () => void
  onSaved: () => void
}

function toEditableRow(contribution: AnimeContribution): EditableProjectContribution {
  return {
    contribution_id: contribution.id,
    member_id: contribution.member_id,
    member_display_name: contribution.member_display_name,
    member_avatar_url: contribution.member_avatar_url ?? null,
    role_codes: normalizeRoleCodes(contribution.role_codes ?? []),
  }
}

export default function AnimeContributionModal({
  fansubId,
  animeId,
  animeTitle,
  members,
  existingContributions,
  focusedRoleCode = null,
  onClose,
  onSaved,
}: Props) {
  const [stagedRows, setStagedRows] = useState<EditableProjectContribution[]>([])
  const [originalProjectRows, setOriginalProjectRows] = useState<AnimeContribution[]>([])
  const [originalRolesById, setOriginalRolesById] = useState<Record<number, string[]>>({})
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [addingRow, setAddingRow] = useState(false)
  const [newMemberId, setNewMemberId] = useState<number | null>(null)
  const [newRoleCodes, setNewRoleCodes] = useState<string[]>([])
  const [editingRoleIds, setEditingRoleIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const projectRows = existingContributions
      .filter((contribution) => contribution.release_version_id == null)
      .map((contribution) => ({
        ...contribution,
        role_codes: normalizeRoleCodes(contribution.role_codes ?? []),
      }))

    const focusedRoleExists = Boolean(
      focusedRoleCode &&
        ANIME_CONTRIBUTION_ROLES.some((role) => role.code === focusedRoleCode),
    )

    setStagedRows(projectRows.map(toEditableRow))
    setOriginalProjectRows(projectRows)
    setOriginalRolesById(
      Object.fromEntries(projectRows.map((row) => [row.id, row.role_codes])),
    )
    setRemovedIds([])
    setAddingRow(focusedRoleExists)
    setNewMemberId(null)
    setNewRoleCodes(focusedRoleExists && focusedRoleCode ? [focusedRoleCode] : [])
    setEditingRoleIds(new Set())
    setError(null)
  }, [existingContributions, focusedRoleCode])

  function handleRemove(row: EditableProjectContribution) {
    setStagedRows((prev) => prev.filter((item) => item.contribution_id !== row.contribution_id))
    if (!row.isNew && row.contribution_id > 0) {
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
    const member = members.find((item) => item.member_id === newMemberId)
    if (!member) return

    setStagedRows((prev) => [
      ...prev,
      {
        contribution_id: -Date.now(),
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
    if (stagedRows.some((row) => row.role_codes.length === 0)) {
      setError('Jede Person braucht mindestens eine Rolle.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await Promise.all(removedIds.map((id) => deleteAnimeContribution(fansubId, animeId, id)))

      const originalById = new Map(originalProjectRows.map((row) => [row.id, row]))
      const rowsToWrite = stagedRows.filter(
        (row) =>
          row.isNew ||
          !sameRoleCodes(row.role_codes, originalRolesById[row.contribution_id] ?? []),
      )

      await Promise.all(
        rowsToWrite.map((row) => {
          const original = originalById.get(row.contribution_id)
          return upsertAnimeContribution(fansubId, animeId, {
            member_id: row.member_id,
            role_codes: normalizeRoleCodes(row.role_codes),
            release_version_id: null,
            started_year: original?.started_year ?? null,
            ended_year: original?.ended_year ?? null,
            note: original?.note ?? null,
            is_public_on_anime_page: original?.is_public_on_anime_page ?? false,
            is_public_on_member_profile: original?.is_public_on_member_profile ?? false,
            status: original?.status ?? 'confirmed',
          })
        }),
      )

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

  const assignedMemberIds = useMemo(
    () => new Set(stagedRows.map((row) => row.member_id)),
    [stagedRows],
  )
  const availableMembers = members.filter((member) => !assignedMemberIds.has(member.member_id))
  const canAddRow = newMemberId != null && newRoleCodes.length > 0
  const hasRowsWithoutRoles = stagedRows.some((row) => row.role_codes.length === 0)

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>
        Abbrechen
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        loading={saving}
        disabled={hasRowsWithoutRoles}
      >
        Speichern
      </Button>
    </>
  )

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Mitwirkende: ${animeTitle}`}
      description={`Standard-Team für alle Episoden · ${stagedRows.length} Person${stagedRows.length === 1 ? '' : 'en'}`}
      footer={footer}
      variant="responsiveSheet"
    >
      <div className={styles.contributionSheetIntro}>
        <div className={styles.contributionToolbarMeta}>
          <span>Diese Besetzung gilt als Projektteam für alle Episoden.</span>
        </div>
        {!addingRow ? (
          <Button
            variant="ghost"
            leftIcon={<Plus size={16} />}
            onClick={() => setAddingRow(true)}
            disabled={availableMembers.length === 0}
          >
            Person hinzufügen
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="Keine Fansub-Member"
          description="Lege zuerst Mitglieder in der Fansubgruppe an."
        />
      ) : null}

      {addingRow && members.length > 0 ? (
        <div className={styles.contributionAddPanel}>
          <FormField label="Person" htmlFor="new-project-member-select">
            <Select
              id="new-project-member-select"
              value={newMemberId != null ? String(newMemberId) : ''}
              onChange={(event) =>
                setNewMemberId(event.currentTarget.value ? Number(event.currentTarget.value) : null)
              }
              disabled={availableMembers.length === 0}
            >
              <option value="">
                {availableMembers.length === 0 ? 'Alle Personen sind zugewiesen' : 'Person wählen'}
              </option>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddingRow(false)
                setNewMemberId(null)
                setNewRoleCodes([])
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      {stagedRows.length === 0 && !addingRow && members.length > 0 ? (
        <EmptyState
          title="Noch keine Mitwirkenden"
          description="Füge bestehende Fansub-Member hinzu und wähle ihre Rollen für dieses Projekt."
        />
      ) : null}

      {stagedRows.length > 0 ? (
        <div className={styles.contributionRows} role="list" aria-label="Mitwirkende dieses Anime-Projekts">
          {stagedRows.map((row) => {
            const labels = roleLabels(row.role_codes)
            const editing = editingRoleIds.has(row.contribution_id)

            return (
              <div key={row.contribution_id} className={styles.contributionEditRow} role="listitem">
                <div className={styles.contributionPersonCell}>
                  <ContributorAvatar
                    name={row.member_display_name}
                    avatarUrl={row.member_avatar_url ?? null}
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
                  {editing ? (
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
                    {editing ? 'Fertig' : 'Rollen ändern'}
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
      ) : null}

      {hasRowsWithoutRoles ? (
        <p className={styles.contributionInlineWarning}>
          Jede Person braucht mindestens eine Rolle.
        </p>
      ) : null}
      {error ? <p className={styles.contributionInlineWarning}>{error}</p> : null}
    </Drawer>
  )
}
