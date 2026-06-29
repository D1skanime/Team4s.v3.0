'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

import { RichTextEditor } from '@/components/editor'
import { Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState, Select } from '@/components/ui'
import {
  bulkUpsertReleaseVersionNotes,
  getMemberRolesForVersion,
  getOwnProfile,
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
  memberIdFilter?: number | null
  showAllMembers?: boolean
}

const ROLE_HELP_TEXTS: Record<string, { label: string; placeholder: string }> = {
  translator: {
    label: 'Übersetzung',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  editor: {
    label: 'Editing',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  timer: {
    label: 'Timing',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  typesetter: {
    label: 'Typesetting / FX',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  encoder: {
    label: 'Encoding',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  raw_provider: {
    label: 'Raw-Bereitstellung',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  quality_checker: {
    label: 'Qualitätsprüfung',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  project_lead: {
    label: 'Projektleitung',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  designer: {
    label: 'Design',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  admin: {
    label: 'Administration',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
  other: {
    label: 'Sonstiges',
    placeholder: 'Noch keine Notiz - kurz ergänzen?',
  },
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

type ActivePanel = 'mine' | 'all'

const CHAR_WARN_LIMIT = 2000
const SAVE_COLLAPSE_DELAY_MS = 900

function createEmptyRichTextDoc() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}

function buildKey(memberId: number, roleId: number): string {
  return `${memberId}-${roleId}`
}

function ensureRichTextValue(value: unknown | null): unknown {
  if (value == null) return createEmptyRichTextDoc()
  return JSON.parse(JSON.stringify(value))
}

function collectPlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(collectPlainText).join('')
  if (typeof value !== 'object') return ''

  const node = value as { text?: unknown; content?: unknown; type?: unknown }
  const ownText = typeof node.text === 'string' ? node.text : ''
  const childText = collectPlainText(node.content)
  const separator = node.type === 'paragraph' && childText ? '\n' : ''
  return `${ownText}${childText}${separator}`
}

function getPlainTextLength(value: unknown | null): number {
  return collectPlainText(value).trim().length
}

function isRichTextEmpty(value: unknown | null): boolean {
  return getPlainTextLength(value) === 0
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

function groupRolesByMember(memberRoles: MemberRoleForVersion[]) {
  const memberMap = new Map<number, { name: string; roles: MemberRoleForVersion[] }>()
  for (const memberRole of memberRoles) {
    if (!memberMap.has(memberRole.memberId)) {
      memberMap.set(memberRole.memberId, { name: memberRole.memberName, roles: [] })
    }
    memberMap.get(memberRole.memberId)!.roles.push(memberRole)
  }
  return Array.from(memberMap.entries())
}

function formatCharacterStatus(length: number): string {
  return length === 0 ? 'Leer' : `${length} Zeichen`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function ReleaseVersionNotesTab({ versionId, memberIdFilter = null, showAllMembers = true }: ReleaseVersionNotesTabProps) {
  const [memberRoles, setMemberRoles] = useState<MemberRoleForVersion[]>([])
  const [noteStates, setNoteStates] = useState<Record<string, NoteFormState>>({})
  const [initialNoteStates, setInitialNoteStates] = useState<Record<string, NoteFormState>>({})
  const [ownMemberId, setOwnMemberId] = useState<number | null>(memberIdFilter)
  const [activePanel, setActivePanel] = useState<ActivePanel>(memberIdFilter != null ? 'mine' : 'all')
  const [hasTouchedPanel, setHasTouchedPanel] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => false)
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null)
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({})
  const [recentlySavedKey, setRecentlySavedKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setOwnMemberId(memberIdFilter)
  }, [memberIdFilter])

  useEffect(() => {
    setIsInfoOpen(false)
  }, [memberIdFilter, versionId])

  useEffect(() => {
    if (memberIdFilter != null) return

    let cancelled = false
    void getOwnProfile()
      .then((response) => {
        if (!cancelled) setOwnMemberId(response.data.member_id)
      })
      .catch(() => {
        if (!cancelled) setOwnMemberId(null)
      })

    return () => {
      cancelled = true
    }
  }, [memberIdFilter])

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
        const visibleRoles = memberIdFilter != null
          ? roles.filter((role) => role.memberId === memberIdFilter)
          : roles
        const visibleNotes = memberIdFilter != null
          ? notes.filter((note) => note.memberId === memberIdFilter)
          : notes
        const initialState = buildInitialState(visibleRoles, visibleNotes)

        if (!cancelled) {
          setMemberRoles(visibleRoles)
          setNoteStates(initialState)
          setInitialNoteStates(initialState)
          setExpandedMemberId(null)
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
  }, [memberIdFilter, versionId])

  const memberEntries = useMemo(() => groupRolesByMember(memberRoles), [memberRoles])
  const ownEntry = ownMemberId != null
    ? memberEntries.find(([memberId]) => memberId === ownMemberId)
    : undefined
  const selfEntry = ownEntry ?? (!showAllMembers ? memberEntries[0] : undefined)
  const canShowMine = selfEntry != null
  const canShowAll = showAllMembers && memberIdFilter == null && memberEntries.length > 1

  useEffect(() => {
    if (activePanel === 'mine' && !canShowMine) setActivePanel('all')
    if (activePanel === 'all' && !canShowAll && canShowMine) setActivePanel('mine')
    if (!hasTouchedPanel && activePanel === 'all' && canShowMine) setActivePanel('mine')
  }, [activePanel, canShowAll, canShowMine, hasTouchedPanel])

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

  function resetRole(memberRole: MemberRoleForVersion) {
    const key = buildKey(memberRole.memberId, memberRole.roleId)
    const initial = initialNoteStates[key]
    if (!initial) return

    setNoteStates((prev) => ({
      ...prev,
      [key]: { ...initial, bodyJson: ensureRichTextValue(initial.bodyJson) },
    }))
    setErrorMessage(null)
    setExpandedMemberId((current) => (current === memberRole.memberId ? null : current))
  }

  async function handleSaveRole(memberRole: MemberRoleForVersion) {
    const key = buildKey(memberRole.memberId, memberRole.roleId)
    const state = noteStates[key]
    if (!state) return

    setSavingKeys((prev) => ({ ...prev, [key]: true }))
    setErrorMessage(null)
    setRecentlySavedKey(null)

    const notesToSend: BulkNoteInput[] = state.id === 0 && isRichTextEmpty(state.bodyJson)
      ? []
      : [{
          id: state.id,
          memberId: memberRole.memberId,
          roleId: memberRole.roleId,
          roleCode: memberRole.roleCode,
          title: state.title.trim() || null,
          bodyJson: ensureRichTextValue(state.bodyJson),
          visibility: state.visibility,
          status: state.status,
          sortOrder: state.sortOrder,
        }]

    try {
      const saved = notesToSend.length > 0
        ? await bulkUpsertReleaseVersionNotes(versionId, { notes: notesToSend })
        : []
      const matchingSaved = saved.find((note) => note.memberId === memberRole.memberId && note.roleId === memberRole.roleId)
      const nextState: NoteFormState = matchingSaved
        ? {
            ...state,
            id: matchingSaved.id,
            bodyJson: matchingSaved.bodyJson,
            isDirty: false,
          }
        : {
            ...state,
            bodyJson: ensureRichTextValue(state.bodyJson),
            isDirty: false,
          }

      setNoteStates((prev) => ({ ...prev, [key]: nextState }))
      setInitialNoteStates((prev) => ({ ...prev, [key]: nextState }))
      setRecentlySavedKey(key)
      window.setTimeout(() => {
        setExpandedMemberId((current) => (current === memberRole.memberId ? null : current))
      }, SAVE_COLLAPSE_DELAY_MS)
      window.setTimeout(() => {
        setRecentlySavedKey((current) => (current === key ? null : current))
      }, 1800)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setErrorMessage('Fehler: Für dieses Mitglied und diese Rolle existiert bereits eine Notiz.')
      } else if (status === 400) {
        setErrorMessage('Fehler: Die gewählte Mitglied-Rollen-Zuordnung passt nicht mehr zu dieser Release-Version.')
      } else {
        setErrorMessage('Fehler beim Speichern. Bitte erneut versuchen.')
      }
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }))
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

  const shownPanel = activePanel === 'mine' && canShowMine ? 'mine' : 'all'
  const shouldShowSegmentedTabs = canShowMine && canShowAll

  return (
    <section className={styles.notesTab}>
      <div
        className={styles.infoDetails}
        role="button"
        tabIndex={0}
        aria-expanded={isInfoOpen}
        onClick={() => setIsInfoOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsInfoOpen((current) => !current)
          }
        }}
      >
        <div className={styles.infoSummary}>
          <Info size={17} aria-hidden="true" />
          <span>Wie schreibe ich eine gute Notiz?</span>
          <ChevronDown className={`${styles.infoChevron} ${isInfoOpen ? styles.chevronOpen : ''}`} size={18} aria-hidden="true" />
        </div>
        {isInfoOpen ? (
        <p className={styles.infoText}>
          Beschreibe kurz die konkrete Release-Version: was du in deiner Rolle gemacht hast,
          welche Besonderheiten es gab und was für Leser oder das Archiv später hilfreich ist.
          Zwei bis fünf Sätze reichen.
        </p>
        ) : null}
      </div>

      {errorMessage ? (
        <ErrorState title="Fehler" description={errorMessage} />
      ) : null}

      {shouldShowSegmentedTabs ? (
        <div className={styles.segmentedTabs} role="tablist" aria-label="Notizen-Ansicht">
          <Button
            type="button"
            role="tab"
            variant={shownPanel === 'mine' ? 'primary' : 'subtle'}
            fullWidth
            aria-selected={shownPanel === 'mine'}
            onClick={() => {
              setHasTouchedPanel(true)
              setActivePanel('mine')
            }}
          >
            Meine Rolle
          </Button>
          <Button
            type="button"
            role="tab"
            variant={shownPanel === 'all' ? 'primary' : 'subtle'}
            fullWidth
            aria-selected={shownPanel === 'all'}
            onClick={() => {
              setHasTouchedPanel(true)
              setActivePanel('all')
            }}
          >
            Alle Mitglieder
          </Button>
        </div>
      ) : null}

      {shownPanel === 'mine' && selfEntry ? (
        <div className={styles.pinnedCard}>
          <MemberEditorBody
            memberId={selfEntry[0]}
            memberName={selfEntry[1].name}
            roles={selfEntry[1].roles}
            noteStates={noteStates}
            savingKeys={savingKeys}
            recentlySavedKey={recentlySavedKey}
            tagLabel="Eigene Rolle"
            onUpdateField={updateField}
            onResetRole={resetRole}
            onSaveRole={(role) => void handleSaveRole(role)}
          />
        </div>
      ) : null}

      {shownPanel === 'all' ? (
        <div className={styles.accordionList}>
          {memberEntries.map(([memberId, { name, roles }]) => {
            const isOpen = expandedMemberId === memberId
            const plainTextLength = roles.reduce((total, role) => {
              const state = noteStates[buildKey(role.memberId, role.roleId)]
              return total + getPlainTextLength(state?.bodyJson ?? null)
            }, 0)
            const isOwn = ownMemberId === memberId

            return (
              <article className={styles.memberAccordion} key={memberId}>
                <button
                  type="button"
                  className={styles.memberAccordionHeader}
                  aria-expanded={isOpen}
                  onClick={() => setExpandedMemberId((current) => (current === memberId ? null : memberId))}
                >
                  <span className={styles.memberAvatar} aria-hidden="true">{getInitials(name)}</span>
                  <span className={styles.memberAccordionText}>
                    <span className={styles.memberName}>{name}</span>
                    <span className={styles.memberRoleSummary}>
                      {roles.map((role) => ROLE_HELP_TEXTS[role.roleName]?.label ?? role.roleLabel).join(', ')}
                    </span>
                  </span>
                  <Badge variant={plainTextLength === 0 ? 'muted' : 'info'}>
                    {formatCharacterStatus(plainTextLength)}
                  </Badge>
                  <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} size={18} aria-hidden="true" />
                </button>
                {isOpen ? (
                  <div className={styles.memberAccordionPanel}>
                    <MemberEditorBody
                      memberId={memberId}
                      memberName={name}
                      roles={roles}
                      noteStates={noteStates}
                      savingKeys={savingKeys}
                      recentlySavedKey={recentlySavedKey}
                      tagLabel={isOwn ? 'Eigene Rolle' : 'Bearbeitest als Leiter'}
                      onUpdateField={updateField}
                      onResetRole={resetRole}
                      onSaveRole={(role) => void handleSaveRole(role)}
                    />
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

interface MemberEditorBodyProps {
  memberId: number
  memberName: string
  roles: MemberRoleForVersion[]
  noteStates: Record<string, NoteFormState>
  savingKeys: Record<string, boolean>
  recentlySavedKey: string | null
  tagLabel: string
  onUpdateField: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
  onResetRole: (memberRole: MemberRoleForVersion) => void
  onSaveRole: (memberRole: MemberRoleForVersion) => void
}

function MemberEditorBody({
  memberId,
  memberName,
  roles,
  noteStates,
  savingKeys,
  recentlySavedKey,
  tagLabel,
  onUpdateField,
  onResetRole,
  onSaveRole,
}: MemberEditorBodyProps) {
  return (
    <div className={styles.memberEditorBody}>
      <div className={styles.memberEditorHeader}>
        <span className={styles.memberAvatar} aria-hidden="true">{getInitials(memberName)}</span>
        <div>
          <p className={styles.memberCardMeta}>Mitglied</p>
          <h3 className={styles.memberCardTitle}>{memberName}</h3>
        </div>
        <Badge variant={tagLabel === 'Eigene Rolle' ? 'success' : 'info'}>{tagLabel}</Badge>
      </div>
      <div className={styles.roleList}>
        {roles.map((memberRole) => {
          const key = buildKey(memberId, memberRole.roleId)
          return (
            <RoleNoteField
              key={key}
              memberRole={memberRole}
              state={noteStates[key]}
              isSaving={savingKeys[key] === true}
              isRecentlySaved={recentlySavedKey === key}
              onUpdate={onUpdateField}
              onReset={() => onResetRole(memberRole)}
              onSave={() => onSaveRole(memberRole)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface RoleNoteFieldProps {
  memberRole: MemberRoleForVersion
  state: NoteFormState | undefined
  isSaving: boolean
  isRecentlySaved: boolean
  onUpdate: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
  onReset: () => void
  onSave: () => void
}

function RoleNoteField({ memberRole, state, isSaving, isRecentlySaved, onUpdate, onReset, onSave }: RoleNoteFieldProps) {
  const key = buildKey(memberRole.memberId, memberRole.roleId)
  const roleInfo = ROLE_HELP_TEXTS[memberRole.roleName]
  const label = roleInfo?.label ?? memberRole.roleLabel
  const placeholder = roleInfo?.placeholder ?? 'Noch keine Notiz - kurz ergänzen?'
  const charCount = getPlainTextLength(state?.bodyJson ?? null)
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

      <RichTextEditor
        value={ensureRichTextValue(state?.bodyJson ?? null)}
        onChange={(value) => onUpdate(key, 'bodyJson', value)}
        placeholder={placeholder}
        mode="shortnote"
        toolbarVariant="minimal"
        showShortnoteHint={false}
        minHeight={118}
      />

      <div className={styles.charFooter}>
        <span className={`${styles.charHint} ${isOverLimit ? styles.charHintWarning : ''}`}>
          {isOverLimit ? `Empfohlene Länge überschritten (${CHAR_WARN_LIMIT} Zeichen)` : formatCharacterStatus(charCount)}
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

      <div className={styles.roleActions}>
        <Button variant="ghost" type="button" onClick={onReset} disabled={isSaving || !state?.isDirty}>
          Abbrechen
        </Button>
        <Button variant="success" type="button" loading={isSaving} onClick={onSave}>
          {isRecentlySaved ? 'Gespeichert ✓' : isSaving ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
