'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button, EmptyState, FormField, Modal, Select } from '@/components/ui'
import {
  deleteAnimeContribution,
  upsertAnimeContribution,
} from '@/lib/api'
import type {
  AnimeContribution,
  UnifiedGroupMember,
} from '@/types/fansub'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'

import styles from './AnimeContributionModal.module.css'

// D-09: nur operative Rollen, fansub_lead wird nicht als Anime-Credit übernommen.
const ANIME_CONTRIBUTION_ROLES = FANSUB_GROUP_ROLE_OPTIONS.filter(
  (role) => role.code !== 'fansub_lead',
)

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
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set())
  const [rolesByMemberId, setRolesByMemberId] = useState<Record<number, string[]>>({})
  const [focusedMemberSelectValue, setFocusedMemberSelectValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const focusedRole = useMemo(
    () => ANIME_CONTRIBUTION_ROLES.find((role) => role.code === focusedRoleCode) ?? null,
    [focusedRoleCode],
  )

  useEffect(() => {
    const ids = new Set<number>()
    const roles: Record<number, string[]> = {}

    for (const contribution of existingContributions) {
      ids.add(contribution.member_id)
      roles[contribution.member_id] = contribution.role_codes ?? []
    }

    setSelectedMemberIds(ids)
    setRolesByMemberId(roles)
  }, [existingContributions])

  function addFocusedRole(memberId: number) {
    if (!focusedRole) return

    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      next.add(memberId)
      return next
    })
    setRolesByMemberId((prev) => {
      const current = prev[memberId] ?? []
      if (current.includes(focusedRole.code)) return prev
      return { ...prev, [memberId]: [...current, focusedRole.code] }
    })
    setFocusedMemberSelectValue('')
  }

  function removeFocusedRole(memberId: number) {
    if (!focusedRole) return

    const remainingRoles = (rolesByMemberId[memberId] ?? []).filter((role) => role !== focusedRole.code)
    setRolesByMemberId((prev) => {
      const next = { ...prev }
      if (remainingRoles.length === 0) {
        delete next[memberId]
      } else {
        next[memberId] = remainingRoles
      }
      return next
    })
    setSelectedMemberIds((prev) => {
      if (remainingRoles.length > 0) return prev
      const next = new Set(prev)
      next.delete(memberId)
      return next
    })
  }

  function toggleMember(memberId: number) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
        if (!rolesByMemberId[memberId]) {
          setRolesByMemberId((current) => ({ ...current, [memberId]: [] }))
        }
      }
      return next
    })
  }

  function toggleRole(memberId: number, code: string) {
    setSelectedMemberIds((prev) => {
      if (prev.has(memberId)) return prev
      const next = new Set(prev)
      next.add(memberId)
      return next
    })
    setRolesByMemberId((prev) => {
      const current = prev[memberId] ?? []
      const nextRoles = current.includes(code)
        ? current.filter((role) => role !== code)
        : [...current, code]
      return { ...prev, [memberId]: nextRoles }
    })
  }

  async function handleSave() {
    const selectedIds = Array.from(selectedMemberIds)
    const missingRoleMember = selectedIds
      .map((memberId) => ({
        memberId,
        roles: rolesByMemberId[memberId] ?? [],
      }))
      .find((item) => item.roles.length === 0)

    if (missingRoleMember) {
      const member = members.find((item) => item.member_id === missingRoleMember.memberId)
      setError(`Bitte wähle mindestens eine Rolle für ${member?.display_name ?? 'das Mitglied'}.`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await Promise.all(
        selectedIds.map(async (memberId) => {
          const existingContribution = existingContributions.find((contribution) => (
            contribution.member_id === memberId
          ))

          await upsertAnimeContribution(fansubId, animeId, {
            member_id: memberId,
            role_codes: rolesByMemberId[memberId] ?? [],
            started_year: existingContribution?.started_year ?? null,
            ended_year: existingContribution?.ended_year ?? null,
            note: existingContribution?.note ?? null,
            is_public_on_anime_page: existingContribution?.is_public_on_anime_page ?? false,
            is_public_on_member_profile: existingContribution?.is_public_on_member_profile ?? false,
            status: existingContribution?.status ?? 'confirmed',
            release_version_id: existingContribution?.release_version_id ?? null,
          })
        }),
      )

      await Promise.all(
        existingContributions
          .filter((contribution) => !selectedMemberIds.has(contribution.member_id))
          .map((contribution) => deleteAnimeContribution(fansubId, animeId, contribution.id)),
      )

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  const title = focusedRole
    ? `${focusedRole.label} für „${animeTitle}“ zuweisen`
    : `Mitwirkende für „${animeTitle}“ bearbeiten`

  const focusedAssignedMembers = focusedRole
    ? members.filter((member) => (
        selectedMemberIds.has(member.member_id) &&
        (rolesByMemberId[member.member_id] ?? []).includes(focusedRole.code)
      ))
    : []

  const focusedAvailableMembers = focusedRole
    ? members.filter((member) => !(rolesByMemberId[member.member_id] ?? []).includes(focusedRole.code))
    : []

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div className={styles.modalFooter}>
          {error ? <p className={styles.modalError}>{error}</p> : null}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button variant="success" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      }
    >
      {members.length === 0 ? (
        <EmptyState
          title="Keine Fansub-Member"
          description="Lege zuerst Mitglieder in der Fansubgruppe an."
        />
      ) : focusedRole ? (
        <div className={styles.focusedRolePanel}>
          <FormField label="Member hinzufügen" disabled={focusedAvailableMembers.length === 0}>
            <Select
              value={focusedMemberSelectValue}
              onChange={(event) => {
                const memberId = Number(event.currentTarget.value)
                setFocusedMemberSelectValue(event.currentTarget.value)
                if (Number.isFinite(memberId) && memberId > 0) {
                  addFocusedRole(memberId)
                }
              }}
              aria-label="Member hinzufügen"
              disabled={focusedAvailableMembers.length === 0}
            >
              <option value="">
                {focusedAvailableMembers.length === 0
                  ? 'Alle Member zugewiesen'
                  : 'Member auswählen'}
              </option>
              {focusedAvailableMembers.map((member) => (
                <option key={member.member_id} value={member.member_id}>
                  {member.display_name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className={styles.focusedRoleList}>
            {focusedAssignedMembers.length === 0 ? (
              <p className={styles.focusedRoleEmpty}>Noch niemand zugewiesen.</p>
            ) : (
              focusedAssignedMembers.map((member) => (
                <div key={member.member_id} className={styles.focusedRoleMember}>
                  <span>{member.display_name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFocusedRole(member.member_id)}
                  >
                    Entfernen
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className={styles.memberPicker}>
          <div className={styles.memberPickerHeader}>
            <span>Member</span>
            <span>Rollen</span>
          </div>
          {members.map((member) => {
            const isSelected = selectedMemberIds.has(member.member_id)
            const roles = rolesByMemberId[member.member_id] ?? []

            return (
              <div key={member.member_id} className={styles.memberRow}>
                <label className={styles.memberSelectLabel}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(member.member_id)}
                  />
                  <span className={styles.memberName}>{member.display_name}</span>
                </label>
                <div className={styles.roleGrid}>
                  {ANIME_CONTRIBUTION_ROLES.map((role) => {
                    const active = roles.includes(role.code)
                    return (
                      <label key={role.code} className={styles.roleCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleRole(member.member_id, role.code)}
                          className={styles.roleCheckbox}
                        />
                        {role.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
