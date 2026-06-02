'use client'

import { useEffect, useState } from 'react'
import { Button, Modal } from '@/components/ui'
import {
  ApiError,
  deleteAnimeContribution,
  getFansubAnimeReleaseVersions,
  upsertAnimeContribution,
} from '@/lib/api'
import type { FansubAnimeReleaseVersionOption } from '@/types/contributions'
import {
  AnimeContribution,
  FANSUB_GROUP_ROLE_OPTIONS,
  HistFansubGroupMember,
} from '@/types/fansub'

// Anime-Contribution-konforme Rollen (fansub_lead ist kein anime_contribution-Code)
// MVP-Scope: Die Seed-Codes 'admin', 'other' und 'project_manager' sind in
// FANSUB_GROUP_ROLE_OPTIONS bewusst nicht enthalten (keine UX-Relevanz im MVP).
const ANIME_CONTRIBUTION_ROLES = FANSUB_GROUP_ROLE_OPTIONS.filter(
  (r) => r.code !== 'fansub_lead'
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
  // Phase 67-04: optionale Release-Version-Zuordnung pro Member (null = anime-weit).
  const [releaseVersionByMemberId, setReleaseVersionByMemberId] = useState<Record<number, number | null>>({})
  const [releaseVersionOptions, setReleaseVersionOptions] = useState<FansubAnimeReleaseVersionOption[]>([])
  const [releaseVersionsLoadError, setReleaseVersionsLoadError] = useState<string | null>(null)
  // 422-Feldfehler pro Member (gruppen-fremde Release-Version, D-03).
  const [versionErrorByMemberId, setVersionErrorByMemberId] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set<number>()
    const roles: Record<number, string[]> = {}
    const visibility: Record<number, MemberVisibility> = {}
    const status: Record<number, MemberStatus> = {}
    const releaseVersions: Record<number, number | null> = {}

    for (const c of existingContributions) {
      ids.add(c.fansub_group_member_id)
      roles[c.fansub_group_member_id] = c.role_codes ?? []
      visibility[c.fansub_group_member_id] = {
        anime: c.is_public_on_anime_page,
        profile: c.is_public_on_member_profile,
      }
      status[c.fansub_group_member_id] = c.status
      releaseVersions[c.fansub_group_member_id] = c.release_version_id ?? null
    }

    setSelectedMemberIds(ids)
    setRolesByMemberId(roles)
    setVisibilityByMemberId(visibility)
    setStatusByMemberId(status)
    setReleaseVersionByMemberId(releaseVersions)
  }, [existingContributions])

  // Gruppen-gefilterte Release-Versionen laden (serverseitig gefiltert, kein Client-Filter).
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
            'Release-Versionen konnten nicht geladen werden. Bitte später erneut versuchen.'
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubId, animeId])

  function setReleaseVersion(memberId: number, value: number | null) {
    setReleaseVersionByMemberId((prev) => ({ ...prev, [memberId]: value }))
    // Beim Ändern den evtl. anstehenden 422-Feldfehler dieses Members verwerfen.
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
          setRolesByMemberId((r) => ({ ...r, [memberId]: [] }))
        }
        if (!visibilityByMemberId[memberId]) {
          setVisibilityByMemberId((v) => ({
            ...v,
            [memberId]: { anime: false, profile: false },
          }))
        }
        if (!statusByMemberId[memberId]) {
          setStatusByMemberId((s) => ({ ...s, [memberId]: 'draft' }))
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
      [memberId]: (prev[memberId] ?? []).filter((r) => r !== code),
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
          const existingC = existingContributions.find((c) => c.fansub_group_member_id === memberId)
          try {
            await upsertAnimeContribution(fansubId, animeId, {
              fansub_group_member_id: memberId,
              role_codes: rolesByMemberId[memberId] ?? [],
              started_year: existingC?.started_year ?? null,
              ended_year: existingC?.ended_year ?? null,
              note: existingC?.note ?? null,
              is_public_on_anime_page: visibilityByMemberId[memberId]?.anime ?? false,
              is_public_on_member_profile: visibilityByMemberId[memberId]?.profile ?? false,
              status: statusByMemberId[memberId] ?? 'draft',
              release_version_id: releaseVersionByMemberId[memberId] ?? null,
            })
          } catch (err) {
            // 422 = gruppen-fremde Release-Version → Feldfehler unter dem Select (D-03).
            if (err instanceof ApiError && err.status === 422) {
              fieldErrors[memberId] =
                'Diese Gruppe war an der gewählten Release-Version nicht beteiligt. Bitte eine andere Version wählen oder anime-weit lassen.'
              return
            }
            throw err
          }
        })
      )

      if (Object.keys(fieldErrors).length > 0) {
        setVersionErrorByMemberId(fieldErrors)
        return
      }

      await Promise.all(
        existingContributions
          .filter((c) => !selectedMemberIds.has(c.fansub_group_member_id))
          .map((c) => deleteAnimeContribution(fansubId, animeId, c.id))
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
      title={`Mitwirkende für „${animeTitle}" bearbeiten`}
      footer={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {error && (
            <span style={{ color: '#dc2626', fontSize: '0.85rem', flex: 1 }}>{error}</span>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {members.length === 0 && (
          <p style={{ color: '#888', fontStyle: 'italic' }}>Keine Gruppenmitglieder vorhanden.</p>
        )}
        {members.map((member) => {
          const isSelected = selectedMemberIds.has(member.id)
          const roles = rolesByMemberId[member.id] ?? []
          const vis = visibilityByMemberId[member.id] ?? { anime: false, profile: false }
          const memberStatus = statusByMemberId[member.id] ?? 'draft'
          const releaseVersionValue = releaseVersionByMemberId[member.id] ?? null
          const versionError = versionErrorByMemberId[member.id]
          const statusHint = groupMemberStatusHint(member.status)

          return (
            <div
              key={member.id}
              style={{
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                background: isSelected ? '#eff6ff' : '#fafafa',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMember(member.id)}
                />
                <span style={{ fontWeight: isSelected ? 600 : 400 }}>{member.display_name}</span>
                {statusHint && (
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>({statusHint})</span>
                )}
              </label>

              {isSelected && (
                <div style={{ marginLeft: 26, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Rollen-Chips */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', color: '#6b7280' }}>
                      Rollen
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                      {ANIME_CONTRIBUTION_ROLES.map((sr) => {
                        const active = roles.includes(sr.code)
                        return (
                          <button
                            key={sr.code}
                            type="button"
                            onClick={() => active ? removeRole(member.id, sr.code) : addRole(member.id, sr.code)}
                            style={{
                              padding: '2px 10px',
                              borderRadius: 12,
                              border: '1px solid',
                              borderColor: active ? '#3b82f6' : '#d1d5db',
                              background: active ? '#3b82f6' : '#f9fafb',
                              color: active ? '#fff' : '#374151',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            {sr.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Sichtbarkeit */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', color: '#6b7280' }}>
                      Sichtbarkeit
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={vis.anime}
                        onChange={(e) => setVisibility(member.id, 'anime', e.target.checked)}
                      />
                      Öffentlich auf Anime-Seite
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={vis.profile}
                        onChange={(e) => setVisibility(member.id, 'profile', e.target.checked)}
                      />
                      Im Mitgliederprofil
                    </label>
                  </div>

                  {/* Status */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', color: '#6b7280' }}>
                      Status
                    </div>
                    <select
                      value={memberStatus}
                      onChange={(e) => setMemberStatus(member.id, e.target.value as MemberStatus)}
                      style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="confirmed">Bestätigt</option>
                      <option value="hidden">Versteckt</option>
                    </select>
                  </div>

                  {/* Release-Version (optional, gruppen-gefiltert, Phase 67-04) */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', color: '#6b7280' }}>
                      Release-Version (optional)
                    </div>
                    <select
                      value={releaseVersionValue === null ? '' : String(releaseVersionValue)}
                      onChange={(e) =>
                        setReleaseVersion(
                          member.id,
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      disabled={Boolean(releaseVersionsLoadError)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: `1px solid ${versionError ? '#dc3545' : '#d1d5db'}`,
                      }}
                    >
                      <option value="">— anime-weit lassen —</option>
                      {releaseVersionOptions.map((opt) => (
                        <option key={opt.release_version_id} value={String(opt.release_version_id)}>
                          Episode {opt.episode_number} · {opt.version}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                      Leer lassen = die Gruppe war allgemein an der Serie beteiligt.
                    </div>
                    {releaseVersionsLoadError && (
                      <div style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: 4 }}>
                        {releaseVersionsLoadError}
                      </div>
                    )}
                    {versionError && (
                      <div style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: 4 }}>
                        {versionError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
