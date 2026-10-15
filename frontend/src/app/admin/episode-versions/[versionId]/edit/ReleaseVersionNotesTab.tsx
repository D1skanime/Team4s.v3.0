'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

import { Badge, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import {
  bulkUpsertReleaseVersionNotes,
  getMemberRolesForVersion,
  getOwnProfile,
  listReleaseVersionNotes,
} from '@/lib/api'
import { mergeCssModules } from '@/lib/mergeCssModules'
import { labelForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { BulkNoteInput, MemberRoleForVersion } from '@/types/releaseVersionNotes'

import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import { MemberEditorBody } from './ReleaseVersionNotesEditorParts'
import {
  buildInitialState,
  buildKey,
  canEditMemberRole,
  ensureRichTextValue,
  formatCharacterStatus,
  getInitials,
  getPlainTextLength,
  groupRolesByMember,
  isRichTextEmpty,
  type NoteFormState,
} from './ReleaseVersionNotesTab.helpers'
import localStyles from './ReleaseVersionNotesTab.module.css'

export const styles = mergeCssModules(editorScaffoldStyles, localStyles)

interface ReleaseVersionNotesTabProps {
  versionId: number
  memberIdFilter?: number | null
  showAllMembers?: boolean
}

type ActivePanel = 'mine' | 'all'

const SAVE_COLLAPSE_DELAY_MS = 900

export function ReleaseVersionNotesTab({ versionId, memberIdFilter = null, showAllMembers = true }: ReleaseVersionNotesTabProps) {
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')
  const [memberRoles, setMemberRoles] = useState<MemberRoleForVersion[]>([])
  const [noteStates, setNoteStates] = useState<Record<string, NoteFormState>>({})
  const [initialNoteStates, setInitialNoteStates] = useState<Record<string, NoteFormState>>({})
  const [ownMemberId, setOwnMemberId] = useState<number | null>(memberIdFilter)
  const [activePanel, setActivePanel] = useState<ActivePanel>(memberIdFilter != null ? 'mine' : 'all')
  const [hasTouchedPanel, setHasTouchedPanel] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => false)
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null)
  const [editingRoleKeys, setEditingRoleKeys] = useState<Record<string, boolean>>({})
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
          setEditingRoleKeys({})
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

  const memberEntries = useMemo(() => groupRolesByMember(memberRoles, contributionRoles), [contributionRoles, memberRoles])
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
    setEditingRoleKeys((prev) => ({ ...prev, [key]: false }))
    setExpandedMemberId((current) => (current === memberRole.memberId ? null : current))
  }

  async function handleSaveRole(memberRole: MemberRoleForVersion) {
    if (!canEditMemberRole(memberRole)) return

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
          ...(state.sourceRevision != null ? { sourceRevision: state.sourceRevision } : {}),
          roleCode: memberRole.roleCode,
          title: state.title.trim() || null,
          bodyJson: ensureRichTextValue(state.bodyJson),
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
            bodyHtml: matchingSaved.bodyHtml ?? null,
            visibility: matchingSaved.visibility,
            status: matchingSaved.status,
            sourceRevision: matchingSaved.sourceRevision ?? null,
            reviewState: matchingSaved.reviewState ?? null,
            lastActivityAt: matchingSaved.lastActivityAt ?? null,
            rejectionCategory: matchingSaved.rejectionCategory ?? null,
            rejectionReason: matchingSaved.rejectionReason ?? null,
            isDirty: false,
          }
        : {
            ...state,
            bodyJson: ensureRichTextValue(state.bodyJson),
            isDirty: false,
          }

      setNoteStates((prev) => ({ ...prev, [key]: nextState }))
      setInitialNoteStates((prev) => ({ ...prev, [key]: nextState }))
      setEditingRoleKeys((prev) => ({ ...prev, [key]: false }))
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
            catalog={contributionRoles}
            noteStates={noteStates}
            savingKeys={savingKeys}
            recentlySavedKey={recentlySavedKey}
            editingRoleKeys={editingRoleKeys}
            tagLabel="Eigene Rolle"
            onUpdateField={updateField}
            onResetRole={resetRole}
            onStartEditing={(role) => {
              setEditingRoleKeys((prev) => ({ ...prev, [buildKey(role.memberId, role.roleId)]: true }))
            }}
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
            const canEditMember = roles.some(canEditMemberRole)

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
                      {roles.map((role) => labelForRole(contributionRoles, role.roleCode)).join(', ')}
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
                      catalog={contributionRoles}
                      noteStates={noteStates}
                      savingKeys={savingKeys}
                      recentlySavedKey={recentlySavedKey}
                      editingRoleKeys={editingRoleKeys}
                      tagLabel={isOwn ? 'Eigene Rolle' : canEditMember ? 'Bearbeitest als Gruppenleitung' : 'Nur Ansicht'}
                      onUpdateField={updateField}
                      onResetRole={resetRole}
                      onStartEditing={(role) => {
                        setEditingRoleKeys((prev) => ({ ...prev, [buildKey(role.memberId, role.roleId)]: true }))
                      }}
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
