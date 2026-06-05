'use client'

import { useEffect, useMemo, useState } from 'react'

import { ApiError, createContributionProposal, getAdminFansubAnime } from '@/lib/api'
import { FormField, Input, Select, Textarea } from '@/components/ui'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry, ProposalFormData } from '@/types/contributions'

export interface RoleDefinition {
  code: string
  label_de: string
}

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  roleDefinitions: RoleDefinition[]
}

type ContributionScope = 'project' | 'release_version'

const S = {
  btn: (primary?: boolean) => ({
    padding: '8px 20px', borderRadius: 6, fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    border: primary ? 'none' : '1px solid #c8d0de',
    background: primary ? '#5f84dd' : 'transparent',
    color: primary ? '#fff' : '#3a4560',
  } as React.CSSProperties),
} as const

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const [scope, setScope] = useState<ContributionScope | ''>('')
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<number | ''>('')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>('')
  const [groupAnime, setGroupAnime] = useState<AdminFansubAnimeEntry[]>([])
  const [isLoadingGroupAnime, setIsLoadingGroupAnime] = useState(false)
  const [groupAnimeError, setGroupAnimeError] = useState<string | null>(null)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [startedYear, setStartedYear] = useState('')
  const [endedYear, setEndedYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const selectedGroup = useMemo(
    () => ownGroups.find((g) => g.fansub_group_member_id === selectedGroupMemberId) ?? null,
    [ownGroups, selectedGroupMemberId],
  )

  useEffect(() => {
    let cancelled = false

    async function loadGroupAnime() {
      if (!selectedGroup) {
        setGroupAnime([])
        setSelectedAnimeId('')
        setGroupAnimeError(null)
        return
      }

      try {
        setIsLoadingGroupAnime(true)
        setGroupAnimeError(null)
        setSelectedAnimeId('')
        const response = await getAdminFansubAnime(selectedGroup.fansub_group_id)
        if (!cancelled) setGroupAnime(response.data)
      } catch (loadError) {
        if (!cancelled) {
          setGroupAnime([])
          setGroupAnimeError(loadError instanceof Error ? loadError.message : 'Anime/Projekte konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) setIsLoadingGroupAnime(false)
      }
    }

    void loadGroupAnime()
    return () => {
      cancelled = true
    }
  }, [selectedGroup])

  function toggleRole(code: string) {
    setRoleError(null)
    setSelectedRoleCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  function selectScope(nextScope: ContributionScope) {
    setScope(nextScope)
    setScopeError(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setScopeError(null)
    setRoleError(null)
    if (!scope) { setScopeError('Bitte wähle zuerst, ob die Mitwirkung für das ganze Projekt oder nur für bestimmte Folgen gilt.'); return }
    if (scope === 'release_version') { setScopeError('Folgen- und Release-Versionen können hier noch nicht sauber ausgewählt werden. Bitte reiche dafür noch keinen globalen Anime-Beitrag ein.'); return }
    if (selectedRoleCodes.length === 0) { setRoleError('Bitte wähle mindestens eine Rolle aus.'); return }
    if (!selectedAnimeId) { setError('Bitte wähle ein Anime/Projekt dieser Gruppe aus.'); return }
    if (!selectedGroupMemberId) { setError('Bitte wähle eine Gruppe aus.'); return }
    if (!selectedGroup) { setError('Ungültige Gruppenauswahl.'); return }
    const body: ProposalFormData = {
      fansub_group_id: selectedGroup.fansub_group_id,
      anime_id: selectedAnimeId,
      fansub_group_member_id: selectedGroup.fansub_group_member_id,
      role_codes: selectedRoleCodes,
      note: note.trim() || null,
      started_year: startedYear ? parseInt(startedYear, 10) : null,
      ended_year: endedYear ? parseInt(endedYear, 10) : null,
    }
    try {
      setIsSubmitting(true)
      await createContributionProposal(body)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Für diese Kombination aus Gruppe, Anime und deiner Identität existiert bereits ein Beitrag.')
      } else {
        setError(err instanceof Error ? err.message : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="proposal-form-title"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div aria-hidden="true" onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 10, padding: '24px', width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 id="proposal-form-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mitwirkung vorschlagen</h2>
        <div style={{ background: '#eef6f1', border: '1px solid #bdddc9', borderRadius: 6, padding: '10px 14px', color: '#28533a', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Du schlägst hier keine freie Anime-Notiz vor. Erst entscheidest du, ob deine Rolle für das ganze Projekt gilt oder nur für bestimmte Folgen. Danach wählst du deine Gruppe, das Projekt und deine Aufgabe.
        </div>
        {error && <div role="alert" style={{ background: '#fee2e2', color: '#82122c', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Was möchtest du bestätigen lassen?" error={scopeError ?? undefined} required>
            <div role="group" aria-label="Art der Mitwirkung" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <button
                type="button"
                aria-pressed={scope === 'project'}
                onClick={() => selectScope('project')}
                style={{
                  minHeight: 88,
                  padding: '12px',
                  borderRadius: 8,
                  border: `1px solid ${scope === 'project' ? '#5f84dd' : '#c8d0de'}`,
                  background: scope === 'project' ? '#ebf0fb' : '#f6f8fc',
                  color: '#1f2937',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 5 }}>Ganzer Anime / Projekt</strong>
                <span style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                  Deine Rolle gilt für das Projekt insgesamt und kann später als Anime-Credit erscheinen.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={scope === 'release_version'}
                onClick={() => selectScope('release_version')}
                style={{
                  minHeight: 88,
                  padding: '12px',
                  borderRadius: 8,
                  border: `1px solid ${scope === 'release_version' ? '#8a6420' : '#c8d0de'}`,
                  background: scope === 'release_version' ? '#fff7e6' : '#f6f8fc',
                  color: '#1f2937',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 5 }}>Bestimmte Folgen / Release-Version</strong>
                <span style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                  Deine Rolle gilt nur für einzelne Folgen oder eine konkrete Release-Version.
                </span>
              </button>
            </div>
            {scope === 'release_version' ? (
              <div role="status" style={{ marginTop: 8, background: '#fff7e6', border: '1px solid #f0d28a', borderRadius: 6, padding: '10px 12px', color: '#6d4c13', fontSize: '0.85rem', lineHeight: 1.45 }}>
                Diese Variante wird noch nicht abgeschickt, weil hier erst eine echte Folgen- oder Release-Version-Auswahl eingebaut werden muss. So verhindern wir falsche globale Anime-Credits für Arbeit an einzelnen Folgen.
              </div>
            ) : null}
          </FormField>

          {/* Gruppe */}
          <FormField label="Für welche deiner Gruppen?" htmlFor="proposal-group" required>
            <Select id="proposal-group" value={selectedGroupMemberId}
              onChange={(e) => setSelectedGroupMemberId(e.target.value ? parseInt(e.target.value, 10) : '')}
              required>
              <option value="">Gruppe auswählen</option>
              {ownGroups.map((g) => <option key={g.fansub_group_member_id} value={g.fansub_group_member_id}>{g.group_name}</option>)}
            </Select>
          </FormField>

          {/* Gruppengebundene Anime-Auswahl */}
          <FormField
            label="Bei welchem Anime/Projekt dieser Gruppe?"
            htmlFor="proposal-anime"
            error={groupAnimeError ?? undefined}
            required
          >
            <Select
              id="proposal-anime"
              value={selectedAnimeId}
              onChange={(e) => setSelectedAnimeId(e.target.value ? parseInt(e.target.value, 10) : '')}
              disabled={!selectedGroup || isLoadingGroupAnime || groupAnime.length === 0}
              required
            >
              <option value="">
                {!selectedGroup
                  ? 'Erst Gruppe auswählen'
                  : isLoadingGroupAnime
                    ? 'Anime/Projekte werden geladen'
                    : groupAnime.length === 0
                      ? 'Keine Anime/Projekte für diese Gruppe'
                      : 'Anime/Projekt auswählen'}
              </option>
              {groupAnime.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </Select>
          </FormField>

          {/* Rollen Multi-Select */}
          <FormField label="Welche Aufgabe hattest du?" required>
            <div role="group" aria-label="Rollen auswählen" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {roleDefinitions.map((role) => {
                const sel = selectedRoleCodes.includes(role.code)
                return (
                  <button key={role.code} type="button" onClick={() => toggleRole(role.code)} aria-pressed={sel}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${sel ? '#5f84dd' : '#c8d0de'}`, background: sel ? '#ebf0fb' : '#f6f8fc', color: sel ? '#2a5abf' : '#3a4560', fontSize: '0.85rem', fontWeight: sel ? 700 : 400, cursor: 'pointer' }}>
                    {role.label_de}
                  </button>
                )
              })}
            </div>
            {roleError && <span style={{ color: '#82122c', fontSize: '12px' }} role="alert">{roleError}</span>}
          </FormField>

          {/* Notiz */}
          <FormField
            label="Hinweis für den Gruppenleader"
            htmlFor="proposal-note"
            hint="Dieser Hinweis ist für die Prüfung gedacht und wird nicht als öffentlicher Profiltext angezeigt."
          >
            <Textarea id="proposal-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Kurze Erläuterung, z. B. welche Folgen, Releases oder Zeitraum betroffen sind."
            />
          </FormField>

          {/* Von/Bis Jahr */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FormField label="Von Jahr" htmlFor="proposal-started">
                <Input id="proposal-started" type="number" value={startedYear} onChange={(e) => setStartedYear(e.target.value)}
                  placeholder="z. B. 2010" min={1990} max={new Date().getFullYear()} />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Bis Jahr" htmlFor="proposal-ended">
                <Input id="proposal-ended" type="number" value={endedYear} onChange={(e) => setEndedYear(e.target.value)}
                  placeholder="z. B. 2012" min={1990} max={new Date().getFullYear()} />
              </FormField>
            </div>
          </div>

          {/* 90-Tage-Hinweis-Banner (D-13) */}
          <div style={{ background: '#f0f4ff', border: '1px solid #c5d3f5', borderRadius: 6, padding: '10px 14px', fontSize: '0.85rem', color: '#3a4c80', lineHeight: 1.5 }}>
            Reagiert kein Gruppen-Leader binnen 90 Tagen, kannst du den Vorschlag selbst als
            unverifizierten historischen Eintrag öffentlich schalten.
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, gap: 12 }}>
            <button type="button" onClick={onClose} style={S.btn()}>Abbrechen</button>
            <button type="submit" disabled={isSubmitting || scope === 'release_version'} aria-disabled={isSubmitting || scope === 'release_version'}
              style={{ ...S.btn(true), opacity: isSubmitting || scope === 'release_version' ? 0.6 : 1, cursor: isSubmitting || scope === 'release_version' ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Wird gesendet…' : 'Zur Bestätigung senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
