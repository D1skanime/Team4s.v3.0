'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError, createContributionProposal, searchAnimeForProposal } from '@/lib/api'
import type { AnimeListItem } from '@/types/anime'
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

const S = {
  input: { padding: '8px 12px', borderRadius: 6, border: '1px solid #c8d0de', fontSize: '0.9rem' } as React.CSSProperties,
  label: { fontSize: '14px', fontWeight: 700 } as React.CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 4 } as React.CSSProperties,
  btn: (primary?: boolean) => ({
    padding: '8px 20px', borderRadius: 6, fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    border: primary ? 'none' : '1px solid #c8d0de',
    background: primary ? '#5f84dd' : 'transparent',
    color: primary ? '#fff' : '#3a4560',
  } as React.CSSProperties),
} as const

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<number | ''>('')
  const [animeQuery, setAnimeQuery] = useState('')
  const [animeResults, setAnimeResults] = useState<AnimeListItem[]>([])
  const [selectedAnime, setSelectedAnime] = useState<{ id: number; title: string } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [startedYear, setStartedYear] = useState('')
  const [endedYear, setEndedYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAnimeQueryChange = useCallback((value: string) => {
    setAnimeQuery(value)
    setSelectedAnime(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await searchAnimeForProposal(value)
          setAnimeResults(result.data.slice(0, 8))
          setShowDropdown(true)
        } catch { setAnimeResults([]) }
      }, 300)
    } else {
      setAnimeResults([])
      setShowDropdown(false)
    }
  }, [])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function handleAnimeSelect(item: AnimeListItem) {
    setSelectedAnime({ id: item.id, title: item.title })
    setAnimeQuery(item.title)
    setAnimeResults([])
    setShowDropdown(false)
  }

  function toggleRole(code: string) {
    setRoleError(null)
    setSelectedRoleCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setRoleError(null)
    if (selectedRoleCodes.length === 0) { setRoleError('Bitte wähle mindestens eine Rolle aus.'); return }
    if (!selectedAnime) { setError('Bitte wähle ein Anime aus.'); return }
    if (!selectedGroupMemberId) { setError('Bitte wähle eine Gruppe aus.'); return }
    const selectedGroup = ownGroups.find((g) => g.fansub_group_member_id === selectedGroupMemberId)
    if (!selectedGroup) { setError('Ungültige Gruppenauswahl.'); return }
    const body: ProposalFormData = {
      fansub_group_id: selectedGroup.fansub_group_id,
      anime_id: selectedAnime.id,
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
        <h2 id="proposal-form-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Beitrag vorschlagen</h2>
        {error && <div role="alert" style={{ background: '#fee2e2', color: '#82122c', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Gruppe */}
          <div style={S.field}>
            <label htmlFor="proposal-group" style={S.label}>Gruppe <span style={{ color: '#82122c' }}>*</span></label>
            <select id="proposal-group" value={selectedGroupMemberId}
              onChange={(e) => setSelectedGroupMemberId(e.target.value ? parseInt(e.target.value, 10) : '')}
              required style={{ ...S.input, background: '#fff' }}>
              <option value="">Gruppe auswählen</option>
              {ownGroups.map((g) => <option key={g.fansub_group_member_id} value={g.fansub_group_member_id}>{g.group_name}</option>)}
            </select>
          </div>

          {/* Anime Typeahead */}
          <div style={{ ...S.field, position: 'relative' }}>
            <label htmlFor="proposal-anime" style={S.label}>Anime <span style={{ color: '#82122c' }}>*</span></label>
            <input id="proposal-anime" type="text" value={animeQuery}
              onChange={(e) => handleAnimeQueryChange(e.target.value)}
              placeholder="Anime suchen oder auswählen" autoComplete="off" style={S.input} />
            {showDropdown && animeResults.length > 0 && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #c8d0de', borderRadius: 6, marginTop: 4, padding: 0, listStyle: 'none', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto' }}>
                {animeResults.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => handleAnimeSelect(item)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rollen Multi-Select */}
          <div style={S.field}>
            <span style={S.label}>Rollen <span style={{ color: '#82122c' }}>*</span></span>
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
          </div>

          {/* Notiz */}
          <div style={S.field}>
            <label htmlFor="proposal-note" style={S.label}>Notiz</label>
            <textarea id="proposal-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Kurze Erläuterung (z. B. »war 2005 Co-Editor«)"
              style={{ ...S.input, resize: 'vertical' }} />
          </div>

          {/* Von/Bis Jahr */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, ...S.field }}>
              <label htmlFor="proposal-started" style={S.label}>Von Jahr</label>
              <input id="proposal-started" type="number" value={startedYear} onChange={(e) => setStartedYear(e.target.value)}
                placeholder="z. B. 2010" min={1990} max={new Date().getFullYear()} style={S.input} />
            </div>
            <div style={{ flex: 1, ...S.field }}>
              <label htmlFor="proposal-ended" style={S.label}>Bis Jahr</label>
              <input id="proposal-ended" type="number" value={endedYear} onChange={(e) => setEndedYear(e.target.value)}
                placeholder="z. B. 2012" min={1990} max={new Date().getFullYear()} style={S.input} />
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
            <button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting}
              style={{ ...S.btn(true), opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Wird eingereicht…' : 'Beitrag einreichen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
