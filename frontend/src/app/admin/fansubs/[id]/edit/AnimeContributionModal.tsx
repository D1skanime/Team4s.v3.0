'use client'

import { useEffect, useState } from 'react'

import { Badge, Button, Card, EmptyState, FormField, Modal, Select } from '@/components/ui'
import {
  ApiError,
  deleteAnimeContribution,
  getFansubAnimeReleaseVersions,
  upsertAnimeContribution,
} from '@/lib/api'
import type { FansubAnimeReleaseVersionOption } from '@/types/contributions'
import type {
  AnimeContribution,
  HistFansubGroupMember,
} from '@/types/fansub'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'

import styles from './AnimeContributionModal.module.css'

const ANIME_CONTRIBUTION_ROLES = FANSUB_GROUP_ROLE_OPTIONS.filter(
  (role) => role.code !== 'fansub_lead',
)

type MemberVisibility = {
  anime: boolean
  profile: boolean
}

type MemberStatus = 'draft' | 'confirmed' | 'hidden'

type Props = {
  fansubId: number
  animeId: number
  animeTitle: string
  members: HistFansubGroupMember[]
  existingContributions: AnimeContribution[]
  onClose: () => void
  onSaved: () => void
}

function groupMemberStatusHint(status: HistFansubGroupMember['status']): string | null {
  if (status === 'confirmed') return null
  if (status === 'draft') return 'Entwurf'
  if (status === 'disputed') return 'umstritten'
  return 'historisch'
}

export default function AnimeContributionModal({
  fansubId,
  animeId,
  animeTitle,
  members,
  existingContributions,
  onClose,
  onSaved,
}: Props) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set())
  const [rolesByMemberId, setRolesByMemberId] = useState<Record<number, string[]>>({})
  const [visibilityByMemberId, setVisibilityByMemberId] = useState<Record<number, MemberVisibility>>({})
  const [statusByMemberId, setStatusByMemberId] = useState<Record<number, MemberStatus>>({})
  const [releaseVersionByMemberId, setReleaseVersionByMemberId] = useState<Record<number, number | null>>({})
  const [releaseVersionOptions, setReleaseVersionOptions] = useState<FansubAnimeReleaseVersionOption[]>([])
  const [releaseVersionsLoadError, setReleaseVersionsLoadError] = useState<string | null>(null)
  const [versionErrorByMemberId, setVersionErrorByMemberId] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set<number>()
    const roles: Record<number, string[]> = {}
    const visibility: Record<number, MemberVisibility> = {}
    const status: Record<number, MemberStatus> = {}
    const releaseVersions: Record<number, number | null> = {}

    for (const contribution of existingContributions) {
      ids.add(contribution.member_id)
      roles[contribution.member_id] = contribution.role_codes ?? []
      visibility[contribution.member_id] = {
        anime: contribution.is_public_on_anime_page,
        profile: contribution.is_public_on_member_profile,
      }
      status[contribution.member_id] = contribution.status
      releaseVersions[contribution.member_id] = contribution.release_version_id ?? null
    }

    setSelectedMemberIds(ids)
    setRolesByMemberId(roles)
    setVisibilityByMemberId(visibility)
    setStatusByMemberId(status)
    setReleaseVersionByMemberId(releaseVersions)
  }, [existingContributions])

  useEffect(() => {
    let cancelled = false
    setReleaseVersionsLoadError(null)
    getFansubAnimeReleaseVersions(fansubId, animeId)
      .then((res) => {
        if (!cancelled) setReleaseVersionOptions(res.data ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setReleaseVersionsLoadError(
            'Release-Versionen konnten nicht geladen werden. Bitte später erneut versuchen.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubId, animeId])

  function setReleaseVersion(memberId: number, value: number | null) {
    setReleaseVersionByMemberId((prev) => ({ ...prev, [memberId]: value }))
    setVersionErrorByMemberId((prev) => {
      if (!(memberId in prev)) return prev
      const next = { ...prev }
      delete next[memberId]
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
        if (!visibilityByMemberId[memberId]) {
          setVisibilityByMemberId((current) => ({
            ...current,
            [memberId]: { anime: false, profile: false },
          }))
        }
        if (!statusByMemberId[memberId]) {
          setStatusByMemberId((current) => ({ ...current, [memberId]: 'draft' }))
        }
      }
      return next
    })
  }

  function addRole(memberId: number, code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    setRolesByMemberId((prev) => {
      const existing = prev[memberId] ?? []
      if (existing.includes(trimmed)) return prev
      return { ...prev, [memberId]: [...existing, trimmed] }
    })
  }

  function removeRole(memberId: number, code: string) {
    setRolesByMemberId((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((role) => role !== code),
    }))
  }

  function setVisibility(memberId: number, field: 'anime' | 'profile', value: boolean) {
    setVisibilityByMemberId((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? { anime: false, profile: false }), [field]: value },
    }))
  }

  function setMemberStatus(memberId: number, value: MemberStatus) {
    setStatusByMemberId((prev) => ({ ...prev, [memberId]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setVersionErrorByMemberId({})
    const fieldErrors: Record<number, string> = {}
    try {
      await Promise.all(
        Array.from(selectedMemberIds).map(async (memberId) => {
          const existingContribution = existingContributions.find((contribution) => (
            contribution.member_id === memberId
          ))
          try {
            await upsertAnimeContribution(fansubId, animeId, {
              member_id: memberId,
              role_codes: rolesByMemberId[memberId] ?? [],
              started_year: existingContribution?.started_year ?? null,
              ended_year: existingContribution?.ended_year ?? null,
              note: existingContribution?.note ?? null,
              is_public_on_anime_page: visibilityByMemberId[memberId]?.anime ?? false,
              is_public_on_member_profile: visibilityByMemberId[memberId]?.profile ?? false,
              status: statusByMemberId[memberId] ?? 'draft',
              release_version_id: releaseVersionByMemberId[memberId] ?? null,
            })
          } catch (err) {
            if (err instanceof ApiError && err.status === 422) {
              fieldErrors[memberId] =
                'Diese Gruppe war an der gewählten Release-Version nicht beteiligt. Bitte eine andere Version wählen oder anime-weit lassen.'
              return
            }
            throw err
          }
        }),
      )

      if (Object.keys(fieldErrors).length > 0) {
        setVersionErrorByMemberId(fieldErrors)
        return
      }

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

  return (
    <Modal
      open
      onClose={onClose}
      title={`Mitwirkende für „${animeTitle}“ bearbeiten`}
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
      <div className={styles.memberList}>
        {members.length === 0 ? (
          <EmptyState title="Keine Gruppenmitglieder" description="Lege zuerst historische Mitglieder in der Gruppe an." />
        ) : null}
        {members.map((member) => {
          const isSelected = selectedMemberIds.has(member.id)
          const roles = rolesByMemberId[member.id] ?? []
          const visibility = visibilityByMemberId[member.id] ?? { anime: false, profile: false }
          const memberStatus = statusByMemberId[member.id] ?? 'draft'
          const releaseVersionValue = releaseVersionByMemberId[member.id] ?? null
          const versionError = versionErrorByMemberId[member.id]
          const statusHint = groupMemberStatusHint(member.status)

          return (
            <Card key={member.id} variant={isSelected ? 'nested' : 'nestedFlat'} className={styles.memberCard}>
              <div className={styles.memberHeader}>
                <Button
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => toggleMember(member.id)}
                >
                  {isSelected ? 'Ausgewählt' : 'Auswählen'}
                </Button>
                <span className={styles.memberName}>{member.display_name}</span>
                {statusHint ? <Badge variant="muted">{statusHint}</Badge> : null}
              </div>

              {isSelected ? (
                <div className={styles.memberDetails}>
                  <div className={styles.fieldGroup}>
                    <p className={styles.fieldLabel}>Rollen</p>
                    <div className={styles.chipRow}>
                      {ANIME_CONTRIBUTION_ROLES.map((role) => {
                        const active = roles.includes(role.code)
                        return (
                          <Button
                            key={role.code}
                            size="sm"
                            variant={active ? 'primary' : 'secondary'}
                            onClick={() => active ? removeRole(member.id, role.code) : addRole(member.id, role.code)}
                          >
                            {role.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <p className={styles.fieldLabel}>Sichtbarkeit</p>
                    <Button
                      variant={visibility.anime ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={visibility.anime}
                      onClick={() => setVisibility(member.id, 'anime', !visibility.anime)}
                    >
                      Öffentlich auf Anime-Seite
                    </Button>
                    <Button
                      variant={visibility.profile ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={visibility.profile}
                      onClick={() => setVisibility(member.id, 'profile', !visibility.profile)}
                    >
                      Im Mitgliederprofil
                    </Button>
                  </div>

                  <FormField label="Status">
                    <Select
                      value={memberStatus}
                      onChange={(event) => setMemberStatus(member.id, event.target.value as MemberStatus)}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="confirmed">Bestätigt</option>
                      <option value="hidden">Versteckt</option>
                    </Select>
                  </FormField>

                  <FormField
                    label="Release-Version (optional)"
                    hint="Leer lassen = die Gruppe war allgemein an der Serie beteiligt."
                    error={versionError || releaseVersionsLoadError || undefined}
                    disabled={Boolean(releaseVersionsLoadError)}
                  >
                    <Select
                      value={releaseVersionValue === null ? '' : String(releaseVersionValue)}
                      onChange={(event) =>
                        setReleaseVersion(
                          member.id,
                          event.target.value === '' ? null : Number(event.target.value),
                        )
                      }
                      disabled={Boolean(releaseVersionsLoadError)}
                      invalid={Boolean(versionError)}
                    >
                      <option value="">Anime-weit lassen</option>
                      {releaseVersionOptions.map((option) => (
                        <option key={option.release_version_id} value={String(option.release_version_id)}>
                          Episode {option.episode_number} · {option.version}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              ) : null}
            </Card>
          )
        })}
      </div>
    </Modal>
  )
}
