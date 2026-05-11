'use client'

import { useEffect, useState } from 'react'

import {
  bulkUpsertReleaseVersionNotes,
  getMemberRolesForVersion,
  listReleaseVersionNotes,
} from '@/lib/api'
import type {
  BulkNoteInput,
  MemberRoleForVersion,
  ReleaseVersionNote,
} from '@/types/releaseVersionNotes'

interface ReleaseVersionNotesTabProps {
  versionId: number
}

const ROLE_HELP_TEXTS: Record<string, { label: string; helpText: string; placeholder: string }> = {
  translator:      { label: 'Übersetzung',       helpText: 'Schreibe kurz, was an der Übersetzung dieser Version besonders war: Dialogstil, Begriffe, Songtexte, Schilder...', placeholder: 'Beispiel: Bei dieser Version wurden die Dialoge etwas freier übersetzt...' },
  editor:          { label: 'Editing',            helpText: 'Schreibe kurz, was du sprachlich verbessert hast: Lesbarkeit, Stil, Charakterstimmen...', placeholder: 'Beispiel: Das Editing wurde überarbeitet, damit die Dialoge flüssiger klingen...' },
  timer:           { label: 'Timing',             helpText: 'Schreibe kurz, was am Timing besonders war: Dialog-Timing, Karaoke-Timing, Lesbarkeit...', placeholder: 'Beispiel: Das Timing wurde für diese Version neu angepasst...' },
  typesetter:      { label: 'Typesetting / FX',   helpText: 'Schreibe kurz, was du visuell umgesetzt hast: Signs, Overlays, Fonts, Karaoke-FX...', placeholder: 'Beispiel: Für diese Version wurden mehrere Signs, Overlays und Karaoke-FX angepasst...' },
  encoder:         { label: 'Encoding',           helpText: 'Schreibe kurz, was an dieser technischen Ausgabe besonders war: 8bit/10bit, MP4/MKV...', placeholder: 'Beispiel: Diese Ausgabe wurde als 10bit-MKV mit Softsubs erstellt...' },
  raw_provider:    { label: 'Raw-Bereitstellung', helpText: 'Schreibe kurz, was zur Quelle wichtig ist: Herkunft, Qualität, Probleme, bessere Quelle...', placeholder: 'Beispiel: Für diese Version wurde eine bessere Raw-Quelle verwendet...' },
  quality_checker: { label: 'Qualitätsprüfung',  helpText: 'Schreibe kurz, worauf bei der Prüfung geachtet wurde: Übersetzung, Timing, Encoding...', placeholder: 'Beispiel: Im QC wurden Timing, Rechtschreibung, Typesetting und Encode geprüft...' },
  project_lead:    { label: 'Projektleitung',     helpText: 'Schreibe kurz, warum diese Version veröffentlicht wurde: Koordination, Ziel, Re-Release...', placeholder: 'Beispiel: Diese Version fasst die wichtigsten Korrekturen zusammen...' },
  designer:        { label: 'Design',             helpText: 'Schreibe kurz, welche visuellen Elemente du beigesteuert hast: Banner, Logos, Vorschaubilder...', placeholder: 'Beispiel: Für diese Version wurden zusätzliche Grafiken erstellt...' },
  admin:           { label: 'Administration',     helpText: 'Schreibe kurz, was organisatorisch wichtig war: Archivierung, Upload, Metadaten...', placeholder: 'Beispiel: Die Veröffentlichung wurde archiviert, korrekt zugeordnet...' },
  other:           { label: 'Sonstiges',          helpText: 'Nutze dieses Feld nur wenn der Beitrag nicht zu den Standardrollen passt.', placeholder: 'Beispiel: Bei dieser Version gab es eine besondere Unterstützung...' },
}

type NoteFormState = {
  id: number
  bodyMarkdown: string
  title: string
  visibility: 'public' | 'internal'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  sortOrder: number
  isDirty: boolean
}

const CHAR_WARN_LIMIT = 2000

function buildKey(memberId: number, roleId: number): string {
  return `${memberId}-${roleId}`
}

function buildInitialState(
  memberRoles: MemberRoleForVersion[],
  notes: ReleaseVersionNote[],
): Record<string, NoteFormState> {
  const state: Record<string, NoteFormState> = {}

  for (const mr of memberRoles) {
    const key = buildKey(mr.memberId, mr.roleId)
    const existing = notes.find((n) => n.memberId === mr.memberId && n.roleId === mr.roleId)
    state[key] = {
      id: existing?.id ?? 0,
      bodyMarkdown: existing?.bodyMarkdown ?? '',
      title: existing?.title ?? '',
      visibility: existing?.visibility ?? 'internal',
      status: existing?.status ?? 'draft',
      sortOrder: existing?.sortOrder ?? 0,
      isDirty: false,
    }
  }

  return state
}

export function ReleaseVersionNotesTab({ versionId }: ReleaseVersionNotesTabProps) {
  const [memberRoles, setMemberRoles] = useState<MemberRoleForVersion[]>([])
  const [noteStates, setNoteStates] = useState<Record<string, NoteFormState>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const [roles, notes] = await Promise.all([
          getMemberRolesForVersion(versionId),
          listReleaseVersionNotes(versionId),
        ])
        if (!cancelled) {
          setMemberRoles(roles)
          setNoteStates(buildInitialState(roles, notes))
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Fehler beim Laden der Notizen. Bitte Seite neu laden.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [versionId])

  function updateField<K extends keyof NoteFormState>(
    key: string,
    field: K,
    value: NoteFormState[K],
  ) {
    setNoteStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, isDirty: true },
    }))
  }

  async function handleSave() {
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const notesToSend: BulkNoteInput[] = memberRoles
      .flatMap((mr) => {
        const key = buildKey(mr.memberId, mr.roleId)
        const state = noteStates[key]
        if (!state) return []
        // Leere Felder ohne ID nicht mitsenden
        if (state.id === 0 && state.bodyMarkdown.trim() === '') return []
        const entry: BulkNoteInput = {
          id: state.id,
          memberId: mr.memberId,
          roleId: mr.roleId,
          title: state.title.trim() || null,
          bodyMarkdown: state.bodyMarkdown,
          visibility: state.visibility,
          status: state.status,
          sortOrder: state.sortOrder,
        }
        return [entry]
      })

    try {
      const saved = await bulkUpsertReleaseVersionNotes(versionId, { notes: notesToSend })
      // Neue IDs in State übernehmen
      setNoteStates((prev) => {
        const next = { ...prev }
        for (const note of saved) {
          const key = buildKey(note.memberId, note.roleId)
          if (next[key]) {
            next[key] = { ...next[key], id: note.id, isDirty: false }
          }
        }
        return next
      })
      setSuccessMessage('Alle Notizen wurden gespeichert.')
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setErrorMessage('Fehler: Für ein Mitglied und eine Rolle existiert bereits eine Notiz.')
      } else {
        setErrorMessage('Fehler beim Speichern. Bitte erneut versuchen.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section style={{ padding: '24px' }}>
        <p style={{ color: '#666', fontSize: 14 }}>Lade Notizen...</p>
      </section>
    )
  }

  if (memberRoles.length === 0) {
    return (
      <section style={{ padding: '24px' }}>
        <p style={{ color: '#666', fontSize: 14 }}>
          Für diese Release-Version sind keine Mitglieder und Rollen zugeordnet.
          Notizen können erst hinzugefügt werden, wenn Mitglieder im Release zugeordnet sind.
        </p>
      </section>
    )
  }

  // Mitglieder gruppieren
  const memberMap = new Map<number, { name: string; roles: MemberRoleForVersion[] }>()
  for (const mr of memberRoles) {
    if (!memberMap.has(mr.memberId)) {
      memberMap.set(mr.memberId, { name: mr.memberName, roles: [] })
    }
    memberMap.get(mr.memberId)!.roles.push(mr)
  }

  return (
    <section style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: '#f0f4ff', border: '1px solid #c7d7f5', borderRadius: 8, padding: '12px 16px' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#2c3e6b' }}>
          Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner
          Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen.
        </p>
      </div>

      {errorMessage ? (
        <div style={{ background: '#fff0f0', border: '1px solid #f5c7c7', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#c0392b' }}>{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div style={{ background: '#f0fff4', border: '1px solid #c7f5d7', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#1a7a3c' }}>{successMessage}</p>
        </div>
      ) : null}

      {Array.from(memberMap.entries()).map(([memberId, { name, roles }]) => (
        <MemberCard
          key={memberId}
          memberName={name}
          roles={roles}
          noteStates={noteStates}
          onUpdateField={updateField}
        />
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Wird gespeichert...' : 'Alle Notizen speichern'}
        </button>
      </div>
    </section>
  )
}

interface MemberCardProps {
  memberName: string
  roles: MemberRoleForVersion[]
  noteStates: Record<string, NoteFormState>
  onUpdateField: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
}

function MemberCard({ memberName, roles, noteStates, onUpdateField }: MemberCardProps) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{memberName}</h3>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {roles.map((mr) => (
          <RoleNoteField
            key={`${mr.memberId}-${mr.roleId}`}
            memberRole={mr}
            state={noteStates[buildKey(mr.memberId, mr.roleId)]}
            onUpdate={onUpdateField}
          />
        ))}
      </div>
    </div>
  )
}

interface RoleNoteFieldProps {
  memberRole: MemberRoleForVersion
  state: NoteFormState | undefined
  onUpdate: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
}

function RoleNoteField({ memberRole, state, onUpdate }: RoleNoteFieldProps) {
  const key = buildKey(memberRole.memberId, memberRole.roleId)
  const roleInfo = ROLE_HELP_TEXTS[memberRole.roleName]
  const label = roleInfo?.label ?? memberRole.roleLabel
  const helpText = roleInfo?.helpText ?? ''
  const placeholder = roleInfo?.placeholder ?? ''
  const charCount = state?.bodyMarkdown.length ?? 0
  const isOverLimit = charCount >= CHAR_WARN_LIMIT

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: '#334155' }}>
        {label}
      </label>
      {helpText ? (
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b' }}>{helpText}</p>
      ) : null}
      <textarea
        rows={4}
        value={state?.bodyMarkdown ?? ''}
        placeholder={placeholder}
        onChange={(e) => onUpdate(key, 'bodyMarkdown', e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 10px',
          fontSize: 14,
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span
          style={{
            fontSize: 12,
            color: isOverLimit ? '#b45309' : '#94a3b8',
          }}
        >
          {isOverLimit
            ? `Empfohlene Länge überschritten (${CHAR_WARN_LIMIT} Zeichen)`
            : null}
        </span>
        <span style={{ fontSize: 12, color: isOverLimit ? '#b45309' : '#94a3b8' }}>
          {charCount} Zeichen
        </span>
      </div>
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Erweiterte Felder</summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Titel (optional)</span>
            <input
              type="text"
              value={state?.title ?? ''}
              onChange={(e) => onUpdate(key, 'title', e.target.value)}
              style={{
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
              <span style={{ color: '#64748b' }}>Sichtbarkeit</span>
              <select
                value={state?.visibility ?? 'internal'}
                onChange={(e) => onUpdate(key, 'visibility', e.target.value as 'public' | 'internal')}
                style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 4 }}
              >
                <option value="internal">intern</option>
                <option value="public">öffentlich</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
              <span style={{ color: '#64748b' }}>Status</span>
              <select
                value={state?.status ?? 'draft'}
                onChange={(e) => onUpdate(key, 'status', e.target.value as NoteFormState['status'])}
                style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 4 }}
              >
                <option value="draft">Entwurf</option>
                <option value="published">Veröffentlicht</option>
                <option value="archived">Archiviert</option>
                <option value="deleted">Gelöscht</option>
              </select>
            </label>
          </div>
        </div>
      </details>
    </div>
  )
}
