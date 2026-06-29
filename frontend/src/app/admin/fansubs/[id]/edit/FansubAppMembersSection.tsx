'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Pencil, UserPlus } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  ApiError,
  cancelFansubGroupInvitation,
  createFansubGroupInvitation,
  createFansubAppMember,
  getFansubGroupCapabilities,
  listFansubGroupInvitations,
  listFansubAppMembers,
  searchFansubAppMemberCandidates,
  updateFansubAppMemberRole,
  updateFansubAppMemberMediaPermissions,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type FansubAppMember,
  type FansubGroupMediaPermissions,
  type FansubGroupCapabilities,
  type FansubGroupInvitation,
  type FansubGroupMemberCandidate,
  type FansubGroupRoleCode,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import { GroupMembersTab, type GroupMembersTabActions } from './GroupMembersTab'

const styles = { ...sharedStyles, ...fansubEditStyles }

type FansubAppMembersSectionProps = {
  hasAccessToken?: boolean
  fansubId: number
  [legacyProp: string]: unknown
}

const ROLE_LABELS = new Map<string, string>(FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.code, option.label]))
const MEDIA_PERMISSION_OPTIONS: Array<{ key: keyof FansubGroupMediaPermissions; label: string; description: string }> = [
  { key: 'can_upload', label: 'Hochladen', description: 'Kann neue Gruppenmedien hinzufügen.' },
  { key: 'can_delete_own', label: 'Eigene archivieren', description: 'Kann selbst hochgeladene Gruppenmedien archivieren.' },
  { key: 'can_delete_all', label: 'Alle archivieren', description: 'Kann alle Gruppenmedien dieser Gruppe archivieren.' },
  { key: 'can_reorder', label: 'Reihenfolge ändern', description: 'Kann die Reihenfolge der Gruppenmedien ändern.' },
]

const EMPTY_MEDIA_PERMISSIONS: FansubGroupMediaPermissions = {
  can_upload: false,
  can_delete_own: false,
  can_delete_all: false,
  can_reorder: false,
}

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Deine Admin-Sitzung ist abgelaufen. Bitte melde dich erneut an.'
    }
    if (error.status === 403) {
      return 'Dir fehlt die Berechtigung für diese Mitgliederaktion.'
    }
    if (error.status === 502) {
      return 'Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen.'
    }
    if (error.status === 409) {
      return error.message
    }
    return error.message
  }
  return fallback
}

function formatRoleLabel(role: string): string {
  return ROLE_LABELS.get(role) || role
}

function formatMemberInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function getRoleClassName(role: string): string {
  if (role === 'fansub_lead') return styles.fansubEditRoleLead
  if (role === 'project_lead') return styles.fansubEditRoleProjectLead
  if (role === 'editor') return styles.fansubEditRoleEditor
  if (role === 'translator') return styles.fansubEditRoleTranslator
  if (role === 'timer') return styles.fansubEditRoleTimer
  if (role === 'typesetter') return styles.fansubEditRoleTypesetter
  if (role === 'quality_checker') return styles.fansubEditRoleQuality
  if (role === 'encoder') return styles.fansubEditRoleEncoder
  return styles.fansubEditRoleDefault
}

function styleNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ')
}

function formatMemberStatusLabel(status: FansubAppMember['status']): string {
  return status === 'active' ? 'Aktiv' : 'Deaktiviert'
}

function getMediaPermissions(member: FansubAppMember): FansubGroupMediaPermissions {
  return {
    ...EMPTY_MEDIA_PERMISSIONS,
    ...(member.media_permissions ?? {}),
  }
}

function countMediaPermissions(permissions: FansubGroupMediaPermissions): number {
  return MEDIA_PERMISSION_OPTIONS.filter((option) => permissions[option.key]).length
}

function mediaPermissionsEqual(left: FansubGroupMediaPermissions, right: FansubGroupMediaPermissions): boolean {
  return MEDIA_PERMISSION_OPTIONS.every((option) => left[option.key] === right[option.key])
}

function formatInvitationStatusLabel(status: FansubGroupInvitation['status']): string {
  if (status === 'pending') return 'Offen'
  if (status === 'accepted') return 'Angenommen'
  if (status === 'cancelled') return 'Zurückgezogen'
  return 'Abgelaufen'
}

function invitationStatusVariant(status: FansubGroupInvitation['status']): 'info' | 'success' | 'muted' | 'warning' {
  if (status === 'pending') return 'info'
  if (status === 'accepted') return 'success'
  if (status === 'expired') return 'warning'
  return 'muted'
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'unbekannt'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'unbekannt'
  return parsed.toLocaleString('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function FansubAppMembersSection({ hasAccessToken = false, fansubId }: FansubAppMembersSectionProps) {
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [capabilities, setCapabilities] = useState<FansubGroupCapabilities | null>(null)
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateResults, setCandidateResults] = useState<FansubGroupMemberCandidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false)
  const [historicalActions, setHistoricalActions] = useState<GroupMembersTabActions | null>(null)
  const [editorMemberId, setEditorMemberId] = useState<number | null>(null)
  const [memberEditorTab, setMemberEditorTab] = useState<'roles' | 'media'>('roles')
  const [memberRoleDraft, setMemberRoleDraft] = useState<string[]>([])
  const [mediaPermissionDraft, setMediaPermissionDraft] = useState<FansubGroupMediaPermissions>(EMPTY_MEDIA_PERMISSIONS)
  const [invitations, setInvitations] = useState<FansubGroupInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<FansubGroupRoleCode[]>([])
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const deferredCandidateQuery = useDeferredValue(candidateQuery.trim())

  const canViewMembers = capabilities?.can_view_members ?? false
  const canManageMembers = capabilities?.can_manage_members ?? false
  const canViewInvitations = capabilities?.can_view_invitations ?? false
  const canCreateInvitation = capabilities?.can_create_invitation ?? false
  const canCancelInvitation = capabilities?.can_cancel_invitation ?? false

  const loadSection = useCallback(async () => {
    if (!hasAccessToken || fansubId <= 0) {
      setCapabilities(null)
      setMembers([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setLoadError(null)
      const capabilitiesResponse = await getFansubGroupCapabilities(fansubId)
      setCapabilities(capabilitiesResponse.data)

      if (!capabilitiesResponse.data.can_view_members) {
        setMembers([])
      } else {
        const membersResponse = await listFansubAppMembers(fansubId)
        setMembers(membersResponse.data)
      }

      if (!capabilitiesResponse.data.can_view_invitations) {
        setInvitations([])
      } else {
        const invitationsResponse = await listFansubGroupInvitations(fansubId)
        setInvitations(invitationsResponse.data)
      }
    } catch (error) {
      setLoadError(formatApiError(error, 'Mitglieder konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [hasAccessToken, fansubId])

  useEffect(() => {
    void loadSection()
  }, [loadSection])

  useEffect(() => {
    if (!successMessage) return undefined
    const timeout = window.setTimeout(() => setSuccessMessage(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [successMessage])

  useEffect(() => {
    let cancelled = false

    async function runSearch() {
      if (!hasAccessToken || !canManageMembers || deferredCandidateQuery.length < 2) {
        if (!cancelled) {
          setCandidateResults([])
          setSelectedCandidateId('')
        }
        return
      }

      try {
        setIsSearching(true)
        const response = await searchFansubAppMemberCandidates(fansubId, deferredCandidateQuery)
        if (cancelled) {
          return
        }
        const nextResults = response.data
        setCandidateResults(nextResults)
        setSelectedCandidateId((current) => {
          if (current && nextResults.some((candidate) => String(candidate?.app_user_id || 0) === current)) {
            return current
          }
          return ''
        })
      } catch (error) {
        if (!cancelled) {
          setActionError(formatApiError(error, 'Mitglieder konnten nicht gesucht werden.'))
          setCandidateResults([])
          setSelectedCandidateId('')
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    void runSearch()

    return () => {
      cancelled = true
    }
  }, [hasAccessToken, canManageMembers, deferredCandidateQuery, fansubId])

  const activeMemberCount = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members],
  )
  const editorMember = useMemo(
    () => members.find((member) => member.id === editorMemberId) ?? null,
    [members, editorMemberId],
  )
  const selectedCandidate = useMemo(
    () => candidateResults.find((candidate) => String(candidate.app_user_id) === selectedCandidateId) ?? null,
    [candidateResults, selectedCandidateId],
  )

  function toggleSelectedRole(role: string) {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  function toggleInviteRole(role: FansubGroupRoleCode) {
    setInviteRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  function handleCandidateQueryChange(value: string) {
    setCandidateQuery(value)
    if (selectedCandidate && value.trim() !== selectedCandidate.fansub_name) {
      setSelectedCandidateId('')
    }
  }

  function handleCandidateSelect(candidate: FansubGroupMemberCandidate) {
    if (!candidate.app_user_id) return
    setSelectedCandidateId(String(candidate.app_user_id))
    setCandidateQuery(candidate.fansub_name)
  }

  async function handleAddMember() {
    const appUserId = Number.parseInt(selectedCandidateId, 10)
    if (!hasAccessToken || !Number.isFinite(appUserId) || appUserId <= 0 || selectedRoles.length === 0) {
      return
    }

    try {
      setIsAdding(true)
      setActionError(null)
      setSuccessMessage(null)
      await createFansubAppMember(
        fansubId,
        { app_user_id: appUserId, roles: selectedRoles },
      )
      setCandidateQuery('')
      setCandidateResults([])
      setSelectedCandidateId('')
      setSelectedRoles([])
      setCreatedInviteLink(null)
      await loadSection()
      setIsMemberModalOpen(false)
      setSuccessMessage('Mitglied wurde mit den gewählten Rollen zur Gruppe hinzugefügt.')
    } catch (error) {
      setActionError(formatApiError(error, 'Mitglied konnte nicht hinzugefügt werden.'))
      setSuccessMessage(null)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleCreateInvitation() {
    if (!hasAccessToken || !inviteEmail.trim() || inviteRoles.length === 0) {
      return
    }

    try {
      setIsCreatingInvite(true)
      setActionError(null)
      setSuccessMessage(null)
      const response = await createFansubGroupInvitation(
        fansubId,
        {
          email: inviteEmail.trim(),
          invited_role_codes: inviteRoles,
        },
      )
      setInviteEmail('')
      setInviteRoles([])
      setCreatedInviteLink(response.data.invite_link)
      await loadSection()
      setIsMemberModalOpen(false)
      setSuccessMessage('Einladung wurde gesendet.')
    } catch (error) {
      setActionError(formatApiError(error, 'Einladung konnte nicht erstellt werden.'))
      setSuccessMessage(null)
    } finally {
      setIsCreatingInvite(false)
    }
  }

  async function handleCancelInvitation(invitationId: number) {
    try {
      setBusyKey(`invitation:${invitationId}`)
      setActionError(null)
      setSuccessMessage(null)
      await cancelFansubGroupInvitation(fansubId, invitationId)
      await loadSection()
      setSuccessMessage('Einladung wurde zurückgezogen.')
    } catch (error) {
      setActionError(formatApiError(error, 'Einladung konnte nicht zurückgezogen werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  function openMemberEditor(member: FansubAppMember) {
    setEditorMemberId(member.id)
    setMemberEditorTab('roles')
    setMemberRoleDraft([...member.roles])
    setMediaPermissionDraft(getMediaPermissions(member))
  }

  function closeMemberEditor() {
    if (editorMember && busyKey === `member-editor:${editorMember.app_user_id}`) return
    setEditorMemberId(null)
    setMemberEditorTab('roles')
    setMemberRoleDraft([])
    setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS)
  }

  function toggleMemberRoleDraft(role: string) {
    setMemberRoleDraft((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  function toggleMediaPermissionDraft(permission: keyof FansubGroupMediaPermissions) {
    setMediaPermissionDraft((current) => ({
      ...current,
      [permission]: !current[permission],
    }))
  }

  async function handleSaveMemberEditor() {
    if (!editorMember) return

    const originalRoles = new Set(editorMember.roles)
    const nextRoles = new Set(memberRoleDraft)
    const rolesToEnable = memberRoleDraft.filter((role) => !originalRoles.has(role))
    const rolesToDisable = editorMember.roles.filter((role) => !nextRoles.has(role))
    const originalPermissions = getMediaPermissions(editorMember)
    const shouldSaveMediaPermissions = !mediaPermissionsEqual(originalPermissions, mediaPermissionDraft)

    try {
      setBusyKey(`member-editor:${editorMember.app_user_id}`)
      setActionError(null)
      setSuccessMessage(null)

      let latestMember: FansubAppMember = editorMember

      for (const role of rolesToEnable) {
        const response = await updateFansubAppMemberRole(fansubId, editorMember.app_user_id, { role, enabled: true })
        latestMember = response.data
      }

      for (const role of rolesToDisable) {
        const response = await updateFansubAppMemberRole(fansubId, editorMember.app_user_id, { role, enabled: false })
        latestMember = response.data
      }

      if (shouldSaveMediaPermissions) {
        const response = await updateFansubAppMemberMediaPermissions(
          fansubId,
          editorMember.app_user_id,
          mediaPermissionDraft,
        )
        latestMember = response.data
      }

      setMembers((current) =>
        current.map((item) => (item.app_user_id === editorMember.app_user_id ? latestMember : item)),
      )
      setEditorMemberId(null)
      setMemberEditorTab('roles')
      setMemberRoleDraft([])
      setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS)
      setSuccessMessage('Änderungen gespeichert.')
    } catch (error) {
      setActionError(formatApiError(error, 'Änderungen konnten nicht gespeichert werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  function openAppMemberFlow() {
    setIsAddChoiceOpen(false)
    setIsMemberModalOpen(true)
  }

  function openHistoricalMemberFlow() {
    if (!canManageMembers) return
    setIsAddChoiceOpen(false)
    historicalActions?.openHistoricalMemberForm()
  }

  return (
    <Card variant="section" className={styles.fansubEditMembershipSurface}>
      <div className={styles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditHint}>
            Wer zur Fansubgruppe gehört und welche Aufgaben die Person übernimmt.
          </p>
        </div>
        <div className={styles.fansubEditMembershipHeaderActions}>
          <div className={styles.fansubEditBasicStatusCard}>
            <span>Mitglieder</span>
            <strong>{members.length} Mitglied{members.length === 1 ? '' : 'er'}</strong>
            <p>{activeMemberCount} aktiv, {members.length - activeMemberCount} deaktiviert</p>
          </div>
          {canManageMembers || canCreateInvitation ? (
            <Button
              variant="primary"
              leftIcon={<UserPlus size={15} aria-hidden="true" />}
              onClick={() => setIsAddChoiceOpen(true)}
            >
              Mitglied hinzufügen
            </Button>
          ) : null}
        </div>
      </div>

      {!hasAccessToken ? (
        <div className={styles.fansubEditMembershipEmpty}>
          <strong>Keine aktive Admin-Session</strong>
          <p className={styles.fansubEditHint}>Für die Mitgliederverwaltung bitte zuerst anmelden.</p>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState
          title="Mitglieder werden geladen"
          description="Team4s lädt die Mitglieder und Einladungen dieser Fansubgruppe."
        />
      ) : null}
      {loadError ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={loadError}
          action={<Button variant="secondary" size="sm" onClick={() => void loadSection()}>Erneut laden</Button>}
        />
      ) : null}
      {actionError ? (
        <ErrorState
          title="Aktion fehlgeschlagen"
          description={actionError}
        />
      ) : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {!isLoading && !loadError && hasAccessToken && !canViewMembers && !canViewInvitations ? (
        <ErrorState
          title="Fehlende Berechtigungen"
          description="Dir fehlen die Berechtigungen für Mitglieder und Einladungen dieser Fansubgruppe."
        />
      ) : null}

      {!isLoading && !loadError && hasAccessToken && (canViewMembers || canViewInvitations) ? (
        <>
          {canViewMembers ? (
            <>
              <SectionHeader
                title="Mitgliederübersicht"
                actions={
                  <Badge variant="muted">
                    {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
                  </Badge>
                }
              />
              <div className={styles.fansubEditMembersCompactList} aria-label="Mitglieder dieser Fansubgruppe">
                {members.length === 0 ? (
                  <div className={styles.fansubEditMemberCompactCard}>
                    <strong>Noch keine Mitglieder in dieser Gruppe</strong>
                    <p className={styles.fansubEditHint}>
                      Sobald jemand hinzugefügt wurde, erscheinen Rollen und Status hier in der Übersicht.
                    </p>
                  </div>
                ) : members.map((member) => {
                    const fansubName = member.member?.fansub_name?.trim() || `Mitglied #${member.app_user_id}`
                    const avatarUrl = member.member?.avatar_url?.trim()
                    const mediaPermissions = getMediaPermissions(member)
                    const mediaPermissionCount = countMediaPermissions(mediaPermissions)

                    return (
                      <div className={styles.fansubEditMemberCompactCard} key={member.id}>
                        <div className={styles.fansubEditMemberCompactHeader}>
                          <div className={styles.fansubEditMemberCompactIdentity}>
                            <div className={styles.fansubEditMembershipAvatar} aria-hidden="true">
                              {avatarUrl ? (
                                <Image
                                  src={avatarUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  unoptimized
                                />
                              ) : (
                                formatMemberInitials(fansubName)
                              )}
                            </div>
                            <div>
                              <strong>{fansubName}</strong>
                              <span className={styles.fansubEditMemberCompactMeta}>
                                <span
                                  className={styleNames(
                                    styles.fansubEditMemberStatusDot,
                                    member.status === 'active' ? styles.fansubEditMemberStatusDotActive : styles.fansubEditMemberStatusDotInactive,
                                  )}
                                  aria-hidden="true"
                                />
                                {formatMemberStatusLabel(member.status)} / seit {formatDateTime(member.created_at)}
                              </span>
                            </div>
                          </div>
                          {canManageMembers ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={`${fansubName} bearbeiten`}
                              title={`${fansubName} bearbeiten`}
                              className={styles.fansubEditMemberEditButton}
                              onClick={() => openMemberEditor(member)}
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                        <div className={styles.fansubEditMemberCompactBody}>
                          <div className={styles.chipRow}>
                            {member.roles.length > 0
                              ? member.roles.map((role) => (
                                  <Badge
                                    key={`${member.id}-${role}`}
                                    variant="info"
                                    className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role))}
                                  >
                                    {formatRoleLabel(role)}
                                  </Badge>
                                ))
                              : <span className={styles.fansubEditHint}>Keine Rollen</span>
                            }
                          </div>
                          {mediaPermissionCount > 0 ? (
                            <Badge variant="muted" className={styles.fansubEditMemberExtraRightsChip}>
                              {mediaPermissionCount} Zusatzrecht{mediaPermissionCount === 1 ? '' : 'e'}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          ) : null}

          <Card variant="nestedFlat" className={styles.fansubEditMembershipAssignCard}>
            <div>
              <p className={styles.fansubEditBasicEyebrow}>Einladungen</p>
              <h4 className={styles.fansubEditMembershipSubtitle}>Offene Gruppeneinladungen</h4>
              <p className={styles.fansubEditHint}>
                Lade neue Mitglieder per E-Mail ein. Der Einladungslink wird per E-Mail zugestellt.
              </p>
            </div>

            {!canViewInvitations ? (
              <p className={styles.fansubEditHint}>Dir fehlt die Berechtigung, offene Einladungen zu sehen.</p>
            ) : (
              <>
                {createdInviteLink ? (
                  <div className={styles.successBox}>
                    <span>Einladung per E-Mail gesendet.</span>
                    <details>
                      <summary className={styles.fansubEditHint}>Einladungslink (Entwickler-Fallback)</summary>
                      <code>{createdInviteLink}</code>
                    </details>
                  </div>
                ) : null}

                <div className={styles.fansubEditTableSurface}>
                  <Table
                    variant="withActions"
                    caption="Offene Einladungen"
                    containerClassName={styles.fansubEditTableWrapWine}
                  >
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Empfänger</TableHeaderCell>
                        <TableHeaderCell>Rollen nach Annahme</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Läuft ab</TableHeaderCell>
                        {canCancelInvitation ? <TableHeaderCell>Aktion</TableHeaderCell> : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invitations.length === 0
                        ? (
                          <TableEmptyState
                            colSpan={canCancelInvitation ? 5 : 4}
                            title="Keine offenen Einladungen"
                            description="Neue Einladungen erscheinen hier bis zur Annahme, zum Ablauf oder zur Rücknahme."
                          />
                        )
                        : invitations.map((invitation) => {
                            const invitedFansubName = invitation.member?.fansub_name?.trim()
                            const invitationBusy = busyKey === `invitation:${invitation.id}`
                            return (
                              <TableRow key={invitation.id}>
                                <TableCell>
                                  <strong>{invitedFansubName || invitation.email}</strong>
                                  {invitedFansubName ? <><br /><span>{invitation.email}</span></> : null}
                                </TableCell>
                                <TableCell>
                                  <div className={styles.chipRow}>
                                    {invitation.invited_role_codes.map((role) => (
                                      <Badge
                                        key={`${invitation.id}-${role}`}
                                        variant="info"
                                        className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role))}
                                      >
                                        {formatRoleLabel(role)}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={invitationStatusVariant(invitation.status)}>
                                    {formatInvitationStatusLabel(invitation.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatDateTime(invitation.expires_at)}</TableCell>
                                {canCancelInvitation ? (
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={invitationBusy}
                                      onClick={() => void handleCancelInvitation(invitation.id)}
                                    >
                                      {invitationBusy ? 'Bitte warten...' : 'Einladung zurückziehen'}
                                    </Button>
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            )
                          })
                      }
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>

          <GroupMembersTab
            embedded
            canCancelClaimInvitation={canCancelInvitation || canManageMembers}
            canCreateClaimInvitation={canCreateInvitation || canManageMembers}
            canManageClaims={canManageMembers}
            fansubId={fansubId}
            onActionsChange={setHistoricalActions}
            showClaimRequests={canManageMembers}
            showHeaderActions={false}
          />
        </>
      ) : null}

      <Modal
        open={isAddChoiceOpen}
        onClose={() => setIsAddChoiceOpen(false)}
        title="Mitglied hinzufügen"
        description="Wähle, ob du App-Zugriff vergibst oder einen historischen Eintrag anlegst."
      >
        <div className={styles.fansubEditMembershipModalStack}>
          <Button
            variant="primary"
            fullWidth
            onClick={openAppMemberFlow}
            disabled={!canManageMembers && !canCreateInvitation}
          >
            App-Mitglied / Einladung
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={openHistoricalMemberFlow}
            disabled={!canManageMembers || !historicalActions}
          >
            Historischen Eintrag anlegen
          </Button>
        </div>
      </Modal>

      <Modal
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Mitglied hinzufügen"
        description="Suche bestehende Fansub-Mitglieder per Nick oder erstelle eine Einladung per E-Mail."
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {canManageMembers ? (
            <Card
              variant="nestedFlat"
              title="Bestehendes Profil"
              description="Fansub-Nick suchen und mit dieser Gruppe verbinden."
            >
              <FormField label="Fansub-Nick" htmlFor="fansub-member-candidate-query">
                <Input
                  id="fansub-member-candidate-query"
                  type="search"
                  value={candidateQuery}
                  onChange={(event) => handleCandidateQueryChange(event.target.value)}
                  placeholder="Fansub-Nick suchen"
                />
              </FormField>

              {candidateQuery.trim().length < 2 ? (
                <p className={styles.fansubEditHint}>Gib mindestens zwei Zeichen ein, um passende Fansub-Nicks zu suchen.</p>
              ) : null}
              {candidateQuery.trim().length >= 2 && isSearching ? (
                <LoadingState
                  title="Mitglieder werden gesucht"
                  description="Passende Fansub-Nicks werden gesucht."
                />
              ) : null}
              {candidateQuery.trim().length >= 2 && !isSearching && candidateResults.length === 0 ? (
                <p className={styles.fansubEditHint}>Keine passenden Mitglieder gefunden.</p>
              ) : null}

              {candidateResults.length > 0 ? (
                <div className={styles.fansubEditCandidateResults} aria-label="Gefundene Fansub-Mitglieder">
                  {candidateResults.map((candidate) => {
                    if (!candidate?.app_user_id) return null
                    const selected = String(candidate.app_user_id) === selectedCandidateId
                    return (
                      <button
                        key={candidate.app_user_id}
                        type="button"
                        className={styleNames(styles.fansubEditCandidateResult, selected && styles.fansubEditCandidateResultSelected)}
                        aria-pressed={selected}
                        onClick={() => handleCandidateSelect(candidate)}
                      >
                        <span>
                          <strong>{candidate.fansub_name}</strong>
                          <small>{selected ? 'Ausgewählt' : 'Zum Hinzufügen auswählen'}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {selectedCandidate ? (
                <div className={styles.fansubEditCandidateSelection} role="status">
                  <span>Ausgewähltes Profil</span>
                  <strong>{selectedCandidate.fansub_name}</strong>
                </div>
              ) : null}

              <div>
                <p className={styles.fansubEditHint}>Aufgaben in dieser Gruppe</p>
                <div className={styles.chipRow}>
                  {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                    const selected = selectedRoles.includes(option.code)
                    return (
                      <Button
                        key={option.code}
                        variant={selected ? 'secondary' : 'ghost'}
                        size="sm"
                        className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                        aria-pressed={selected}
                        onClick={() => toggleSelectedRole(option.code)}
                        title={option.description}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={() => void handleAddMember()}
                disabled={isAdding || !selectedCandidateId || selectedRoles.length === 0}
              >
                {isAdding
                  ? 'Wird hinzugefügt...'
                  : !selectedCandidateId
                    ? 'Profil auswählen'
                    : selectedRoles.length === 0
                      ? 'Aufgabe auswählen'
                      : 'Mitglied hinzufügen'}
              </Button>
            </Card>
          ) : null}

          {canCreateInvitation ? (
            <Card
              variant="nestedFlat"
              title="Einladung"
              description="Per E-Mail einladen und Aufgaben für die Annahme festlegen."
            >
              <FormField label="E-Mail-Adresse" htmlFor="fansub-member-invite-email">
                <Input
                  id="fansub-member-invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="E-Mail-Adresse für die Einladung"
                />
              </FormField>

              <div>
                <p className={styles.fansubEditHint}>Aufgaben nach Annahme</p>
                <div className={styles.chipRow}>
                  {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                    const selected = inviteRoles.includes(option.code)
                    return (
                      <Button
                        key={`invite-${option.code}`}
                        variant={selected ? 'secondary' : 'ghost'}
                        size="sm"
                        className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                        aria-pressed={selected}
                        onClick={() => toggleInviteRole(option.code)}
                        title={option.description}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={() => void handleCreateInvitation()}
                disabled={isCreatingInvite || !inviteEmail.trim() || inviteRoles.length === 0}
              >
                {isCreatingInvite ? 'Einladung wird erstellt...' : 'Einladung erstellen'}
              </Button>
            </Card>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(editorMember)}
        onClose={closeMemberEditor}
        title="Mitglied bearbeiten"
        description={editorMember?.member?.fansub_name ? `Rollen und Medienrechte für ${editorMember.member.fansub_name} setzen.` : 'Rollen und Medienrechte für dieses Mitglied setzen.'}
        footer={editorMember ? (
          <div className={styles.fansubEditMemberEditorFooter}>
            <Button
              variant="ghost"
              className={styles.fansubEditMemberEditorCancelButton}
              disabled={busyKey === `member-editor:${editorMember.app_user_id}`}
              onClick={closeMemberEditor}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              loading={busyKey === `member-editor:${editorMember.app_user_id}`}
              onClick={() => void handleSaveMemberEditor()}
            >
              Speichern
            </Button>
          </div>
        ) : null}
      >
        {editorMember ? (
          <div className={styles.fansubEditMemberEditor}>
            <div className={styles.fansubEditMemberEditorTabs} role="tablist" aria-label="Bearbeitungsbereiche">
              <button
                type="button"
                className={styleNames(
                  styles.fansubEditMemberEditorTab,
                  memberEditorTab === 'roles' && styles.fansubEditMemberEditorTabActive,
                )}
                role="tab"
                aria-selected={memberEditorTab === 'roles'}
                aria-controls="fansub-member-editor-roles"
                onClick={() => setMemberEditorTab('roles')}
              >
                Rollen · {memberRoleDraft.length}
              </button>
              <button
                type="button"
                className={styleNames(
                  styles.fansubEditMemberEditorTab,
                  memberEditorTab === 'media' && styles.fansubEditMemberEditorTabActive,
                )}
                role="tab"
                aria-selected={memberEditorTab === 'media'}
                aria-controls="fansub-member-editor-media"
                onClick={() => setMemberEditorTab('media')}
              >
                Medienrechte · {countMediaPermissions(mediaPermissionDraft)}
              </button>
            </div>
            {memberEditorTab === 'roles' ? (
            <section id="fansub-member-editor-roles" className={styles.fansubEditMemberEditorPanel} aria-label="Rollen">
              <p className={styles.fansubEditHint}>Aktive Rollen bestimmen, was dieses Mitglied ab jetzt in der Gruppe tun darf.</p>
              <div className={styles.fansubEditMemberRoleGrid}>
                {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                  const enabled = memberRoleDraft.includes(option.code)
                  return (
                    <button
                      key={option.code}
                      type="button"
                      className={styleNames(
                        styles.fansubEditMemberRoleToggle,
                        getRoleClassName(option.code),
                        enabled && styles.fansubEditMemberRoleToggleSelected,
                      )}
                      aria-pressed={enabled}
                      onClick={() => toggleMemberRoleDraft(option.code)}
                      title={option.description}
                    >
                      {enabled ? <Check size={14} aria-hidden="true" /> : null}
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
            ) : null}
            {memberEditorTab === 'media' ? (
            <section id="fansub-member-editor-media" className={styles.fansubEditMemberEditorPanel} aria-label="Medienrechte">
              <p className={styles.fansubEditHint}>Diese Rechte gelten zusätzlich zu den Rollen dieses Mitglieds.</p>
              <div className={styles.fansubEditMediaSwitchList}>
                {MEDIA_PERMISSION_OPTIONS.map((option) => {
                  const enabled = mediaPermissionDraft[option.key]
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      className={styleNames(styles.fansubEditMediaSwitchRow, enabled && styles.fansubEditMediaSwitchRowActive)}
                      onClick={() => toggleMediaPermissionDraft(option.key)}
                    >
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className={styles.fansubEditMediaSwitchTrack} aria-hidden="true">
                        <span />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </Card>
  )
}
