'use client'

import { useEffect, useState } from 'react'

import { RichTextEditor } from '@/components/editor'
import { ActionBar, Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState, Select } from '@/components/ui'
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

import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import localStyles from './ReleaseVersionNotesTab.module.css'

const styles = { ...localStyles, ...editorScaffoldStyles }

interface ReleaseVersionNotesTabProps {
  versionId: number
}

const ROLE_HELP_TEXTS: Record<string, { label: string; helpText: string; placeholder: string }> = {
  translator: {
    label: 'Übersetzung',
    helpText: 'Schreibe kurz, was an der Übersetzung dieser Version besonders war: Dialogstil, Begriffe, Songtexte, Schilder...',
    placeholder: 'Beispiel: Bei dieser Version wurden die Dialoge etwas freier übersetzt...',
  },
  editor: {
    label: 'Editing',
    helpText: 'Schreibe kurz, was du sprachlich verbessert hast: Lesbarkeit, Stil, Charakterstimmen...',
    placeholder: 'Beispiel: Das Editing wurde überarbeitet, damit die Dialoge flüssiger klingen...',
  },
  timer: {
    label: 'Timing',
    helpText: 'Schreibe kurz, was am Timing besonders war: Dialog-Timing, Karaoke-Timing, Lesbarkeit...',
    placeholder: 'Beispiel: Das Timing wurde für diese Version neu angepasst...',
  },
  typesetter: {
    label: 'Typesetting / FX',
    helpText: 'Schreibe kurz, was du visuell umgesetzt hast: Signs, Overlays, Fonts, Karaoke-FX...',
    placeholder: 'Beispiel: Für diese Version wurden mehrere Signs, Overlays und Karaoke-FX angepasst...',
  },
  encoder: {
    label: 'Encoding',
    helpText: 'Schreibe kurz, was an dieser technischen Ausgabe besonders war: 8bit/10bit, MP4/MKV...',
    placeholder: 'Beispiel: Diese Ausgabe wurde als 10bit-MKV mit Softsubs erstellt...',
  },
  raw_provider: {
    label: 'Raw-Bereitstellung',
    helpText: 'Schreibe kurz, was zur Quelle wichtig ist: Herkunft, Qualität, Probleme, bessere Quelle...',
    placeholder: 'Beispiel: Für diese Version wurde eine bessere Raw-Quelle verwendet...',
  },
  quality_checker: {
    label: 'Qualitätsprüfung',
    helpText: 'Schreibe kurz, worauf bei der Prüfung geachtet wurde: Übersetzung, Timing, Encoding...',
    placeholder: 'Beispiel: Im QC wurden Timing, Rechtschreibung, Typesetting und Encode geprüft...',
  },
  project_lead: {
    label: 'Projektleitung',
    helpText: 'Schreibe kurz, warum diese Version veröffentlicht wurde: Koordination, Ziel, Re-Release...',
    placeholder: 'Beispiel: Diese Version fasst die wichtigsten Korrekturen zusammen...',
  },
  designer: {
    label: 'Design',
    helpText: 'Schreibe kurz, welche visuellen Elemente du beigesteuert hast: Banner, Logos, Vorschaubilder...',
    placeholder: 'Beispiel: Für diese Version wurden zusätzliche Grafiken erstellt...',
  },
  admin: {
    label: 'Administration',
    helpText: 'Schreibe kurz, was organisatorisch wichtig war: Archivierung, Upload, Metadaten...',
    placeholder: 'Beispiel: Die Veröffentlichung wurde archiviert, korrekt zugeordnet...',
  },
  other: {
    label: 'Sonstiges',
    helpText: 'Nutze dieses Feld nur, wenn der Beitrag nicht zu den Standardrollen passt.',
    placeholder: 'Beispiel: Bei dieser Version gab es eine besondere Unterstützung...',
  },
}

function createEmptyRichTextDoc() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}

type NoteFormState = {
  id: number
  bodyJson: unknown | null
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

function ensureRichTextValue(value: unknown | null): unknown {
  if (value == null) return createEmptyRichTextDoc()
  return JSON.parse(JSON.stringify(value))
}

function isRichTextEmpty(value: unknown | null): boolean {
  if (value == null) return true
  const serialized = JSON.stringify(value)
  return serialized === JSON.stringify(createEmptyRichTextDoc())
}

function buildInitialState(
  memberRoles: MemberRoleForVersion[],
  notes: ReleaseVersionNote[],
): Record<string, NoteFormState> {
  const state: Record<string, NoteFormState> = {}

  for (const mr of memberRoles) {
    const key = buildKey(mr.memberId, mr.roleId)
    const existing = notes.find((note) => note.memberId === mr.memberId && note.roleId === mr.roleId)
    state[key] = {
      id: existing?.id ?? 0,
      bodyJson: existing?.bodyJson ?? null,
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
    return () => {
      cancelled = true
    }
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

    const notesToSend: BulkNoteInput[] = memberRoles.flatMap((memberRole) => {
      const key = buildKey(memberRole.memberId, memberRole.roleId)
      const state = noteStates[key]
      if (!state) return []
      if (state.id === 0 && isRichTextEmpty(state.bodyJson)) return []

      return [{
        id: state.id,
        memberId: memberRole.memberId,
        roleId: memberRole.roleId,
        title: state.title.trim() || null,
        bodyJson: ensureRichTextValue(state.bodyJson),
        visibility: state.visibility,
        status: state.status,
        sortOrder: state.sortOrder,
      }]
    })

    try {
      const saved = await bulkUpsertReleaseVersionNotes(versionId, { notes: notesToSend })
      setNoteStates((prev) => {
        const next = { ...prev }
        for (const note of saved) {
          const key = buildKey(note.memberId, note.roleId)
          if (next[key]) {
            next[key] = {
              ...next[key],
              id: note.id,
              bodyJson: note.bodyJson,
              isDirty: false,
            }
          }
        }
        return next
      })
      setSuccessMessage('Alle Notizen wurden gespeichert.')
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setErrorMessage('Fehler: Für ein Mitglied und eine Rolle existiert bereits eine Notiz.')
      } else if (status === 400) {
        setErrorMessage('Fehler: Die gewählte Mitglied-Rollen-Zuordnung passt nicht mehr zu dieser Release-Version.')
      } else {
        setErrorMessage('Fehler beim Speichern. Bitte erneut versuchen.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <LoadingState title="Notizen werden geladen" />
  }

  if (memberRoles.length === 0) {
    return (
      <EmptyState
        title="Keine Rollen zugeordnet"
        description="Notizen können erst hinzugefügt werden, wenn Mitglieder im Release zugeordnet sind."
      />
    )
  }

  const memberMap = new Map<number, { name: string; roles: MemberRoleForVersion[] }>()
  for (const memberRole of memberRoles) {
    if (!memberMap.has(memberRole.memberId)) {
      memberMap.set(memberRole.memberId, { name: memberRole.memberName, roles: [] })
    }
    memberMap.get(memberRole.memberId)!.roles.push(memberRole)
  }

  return (
    <section className={styles.notesTab}>
      <div className={styles.editorNotice}>
        <p className={styles.editorNoticeText}>
          Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner
          Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen.
        </p>
      </div>

      {errorMessage ? (
        <ErrorState title="Fehler" description={errorMessage} />
      ) : null}

      {successMessage ? (
        <Badge variant="success">{successMessage}</Badge>
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

      <ActionBar
        trailing={
          <Button
            variant="success"
            type="button"
            loading={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Wird gespeichert…' : 'Alle Notizen speichern'}
          </Button>
        }
      />
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
    <div className={styles.memberCard}>
      <div className={styles.memberCardHeader}>
        <div className={styles.memberCardHeaderText}>
          <p className={styles.memberCardMeta}>Mitglied</p>
          <h3 className={styles.memberCardTitle}>{memberName}</h3>
        </div>
      </div>
      <div className={styles.memberCardBody}>
        {roles.map((memberRole) => (
          <RoleNoteField
            key={`${memberRole.memberId}-${memberRole.roleId}`}
            memberRole={memberRole}
            state={noteStates[buildKey(memberRole.memberId, memberRole.roleId)]}
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
  const charCount = state?.bodyJson ? JSON.stringify(state.bodyJson).length : 0
  const isOverLimit = charCount >= CHAR_WARN_LIMIT

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardHeader}>
        <div className={styles.roleCardHeading}>
          <p className={styles.roleLabelEyebrow}>Rolle</p>
          <label className={styles.roleLabelTitle}>{label}</label>
        </div>
        <Badge variant="neutral">{memberRole.roleName}</Badge>
      </div>

      {helpText ? <p className={styles.roleHelpText}>{helpText}</p> : null}

      <RichTextEditor
        value={ensureRichTextValue(state?.bodyJson ?? null)}
        onChange={(value) => onUpdate(key, 'bodyJson', value)}
        placeholder={placeholder}
        mode="shortnote"
        minHeight={180}
      />

      <div className={styles.charFooter}>
        <span className={`${styles.charHint} ${isOverLimit ? styles.charHintWarning : ''}`}>
          {isOverLimit ? `Empfohlene Länge überschritten (${CHAR_WARN_LIMIT} Zeichen)` : null}
        </span>
        <span className={`${styles.charHint} ${isOverLimit ? styles.charHintWarning : ''}`}>
          {charCount} Zeichen
        </span>
      </div>

      <details className={styles.advancedDetails}>
        <summary className={styles.advancedSummary}>Erweiterte Felder</summary>
        <div className={styles.advancedFields}>
          <FormField label="Titel (optional)">
            <Input
              type="text"
              value={state?.title ?? ''}
              onChange={(e) => onUpdate(key, 'title', e.target.value)}
            />
          </FormField>

          <div className={styles.advancedGrid}>
            <FormField label="Sichtbarkeit">
              <Select
                value={state?.visibility ?? 'internal'}
                onChange={(e) => onUpdate(key, 'visibility', e.target.value as 'public' | 'internal')}
              >
                <option value="internal">intern</option>
                <option value="public">öffentlich</option>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select
                value={state?.status ?? 'draft'}
                onChange={(e) => onUpdate(key, 'status', e.target.value as NoteFormState['status'])}
              >
                <option value="draft">Entwurf</option>
                <option value="published">Veröffentlicht</option>
                <option value="archived">Archiviert</option>
                <option value="deleted">Gelöscht</option>
              </Select>
            </FormField>
          </div>
        </div>
      </details>
    </div>
  )
}
