'use client'

import { useEffect, useState } from 'react'
import { Button, Modal } from '@/components/ui'
import {
  deleteAnimeContribution,
  upsertAnimeContribution,
} from '@/lib/api'
import {
  AnimeContribution,
  HistFansubGroupMember,
} from '@/types/fansub'


const SUGGESTED_ROLES = [
  { code: 'translator', label: 'Übersetzer' },
  { code: 'editor', label: 'Editor' },
  { code: 'timer', label: 'Timer' },
  { code: 'typesetter', label: 'Typesetter' },
  { code: 'qc', label: 'QC' },
  { code: 'encoder', label: 'Encoder' },
]

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
  const [roleInputByMemberId, setRoleInputByMemberId] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set<number>()
    const roles: Record<number, string[]> = {}
    const visibility: Record<number, MemberVisibility> = {}
    const status: Record<number, MemberStatus> = {}

    for (const c of existingContributions) {
      ids.add(c.fansub_group_member_id)
      roles[c.fansub_group_member_id] = c.role_codes ?? []
      visibility[c.fansub_group_member_id] = {
        anime: c.is_public_on_anime_page,
        profile: c.is_public_on_member_profile,
      }
      status[c.fansub_group_member_id] = c.status
    }

    setSelectedMemberIds(ids)
    setRolesByMemberId(roles)
    setVisibilityByMemberId(visibility)
    setStatusByMemberId(status)
  }, [existingContributions])

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
    try {
      for (const memberId of selectedMemberIds) {
        const existingC = existingContributions.find((c) => c.fansub_group_member_id === memberId)
        await upsertAnimeContribution(fansubId, animeId, {
          fansub_group_member_id: memberId,
          role_codes: rolesByMemberId[memberId] ?? [],
          started_year: existingC?.started_year ?? null,
          ended_year: existingC?.ended_year ?? null,
          note: existingC?.note ?? null,
          is_public_on_anime_page: visibilityByMemberId[memberId]?.anime ?? false,
          is_public_on_member_profile: visibilityByMemberId[memberId]?.profile ?? false,
          status: statusByMemberId[memberId] ?? 'draft',
        })
      }

      for (const c of existingContributions) {
        if (!selectedMemberIds.has(c.fansub_group_member_id)) {
          await deleteAnimeContribution(fansubId, animeId, c.id)
        }
      }

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
          const roleInput = roleInputByMemberId[member.id] ?? ''

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
                {member.status === 'alumni' && (
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>(Alumni)</span>
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
                      {SUGGESTED_ROLES.map((sr) => {
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

                    {/* Benutzerdefinierte Rollen */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {roles
                        .filter((r) => !SUGGESTED_ROLES.some((sr) => sr.code === r))
                        .map((r) => (
                          <span
                            key={r}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: '#dbeafe',
                              fontSize: '0.8rem',
                            }}
                          >
                            {r}
                            <button
                              type="button"
                              onClick={() => removeRole(member.id, r)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '1rem' }}
                              aria-label={`Rolle ${r} entfernen`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>

                    {/* Freitext-Rolle hinzufügen */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Eigene Rolle eingeben…"
                        value={roleInput}
                        onChange={(e) =>
                          setRoleInputByMemberId((prev) => ({ ...prev, [member.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addRole(member.id, roleInput)
                            setRoleInputByMemberId((prev) => ({ ...prev, [member.id]: '' }))
                          }
                        }}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addRole(member.id, roleInput)
                          setRoleInputByMemberId((prev) => ({ ...prev, [member.id]: '' }))
                        }}
                        style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '4px 10px', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', background: '#f9fafb' }}
                      >
                        Hinzufügen
                      </button>
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
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
