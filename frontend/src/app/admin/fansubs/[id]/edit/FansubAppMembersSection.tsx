'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import {
  ApiError,
  cancelFansubGroupInvitation,
  createFansubGroupInvitation,
  createFansubAppMember,
  getFansubGroupCapabilities,
  listFansubGroupInvitations,
  listFansubAppMembers,
  listFansubGroupRoles,
  searchFansubAppMemberCandidates,
  updateFansubAppMemberRole,
  updateFansubAppMemberMediaPermissions,
} from '@/lib/api'
import {
  type FansubAppMember,
  type FansubGroupMediaPermissions,
  type FansubGroupCapabilities,
  type FansubGroupInvitation,
  type FansubGroupMemberCandidate,
  type FansubGroupRoleCode,
  FANSUB_GROUP_ROLE_OPTIONS,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import { FansubAppMemberAddModal, FansubAppMemberChoiceModal } from './FansubAppMemberAddModal'
import { FansubAppMemberEditorPanel } from './FansubAppMemberEditorPanel'
import { FansubAppMembersOverview } from './FansubAppMembersOverview'
import { GroupMembersTab, type GroupMembersTabActions } from './GroupMembersTab'

const styles = { ...sharedStyles, ...fansubEditStyles }

type FansubAppMembersSectionProps = {
  hasAccessToken?: boolean
  fansubId: number
  [legacyProp: string]: unknown
}

const EMPTY_MEDIA_PERMISSIONS: FansubGroupMediaPermissions = {
  can_upload: false,
  can_delete_own: false,
  can_delete_all: false,
  can_reorder: false,
}

const MEDIA_PERMISSION_OPTIONS: Array<{ key: keyof FansubGroupMediaPermissions; label: string; description: string }> = [
  { key: 'can_upload', label: 'Hochladen', description: 'Kann neue Gruppenmedien hinzufügen.' },
  { key: 'can_delete_own', label: 'Eigene archivieren', description: 'Kann selbst hochgeladene Gruppenmedien archivieren.' },
  { key: 'can_delete_all', label: 'Alle archivieren', description: 'Kann alle Gruppenmedien dieser Gruppe archivieren.' },
  { key: 'can_reorder', label: 'Reihenfolge ändern', description: 'Kann die Reihenfolge der Gruppenmedien ändern.' },
]

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Deine Admin-Sitzung ist abgelaufen. Bitte melde dich erneut an.'
    if (error.status === 403) return 'Dir fehlt die Berechtigung für diese Mitgliederaktion.'
    if (error.status === 502) return 'Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen.'
    return error.message
  }
  return fallback
}

function getMediaPermissions(member: FansubAppMember): FansubGroupMediaPermissions {
  return { ...EMPTY_MEDIA_PERMISSIONS, ...(member.media_permissions ?? {}) }
}

function mediaPermissionsEqual(left: FansubGroupMediaPermissions, right: FansubGroupMediaPermissions): boolean {
  return MEDIA_PERMISSION_OPTIONS.every((option) => left[option.key] === right[option.key])
}

export function FansubAppMembersSection({ hasAccessToken = false, fansubId }: FansubAppMembersSectionProps) {
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [capabilities, setCapabilities] = useState<FansubGroupCapabilities | null>(null)
  // Rollenoptionen: API-getrieben via listFansubGroupRoles(), Fallback auf statische Liste
  const [roleOptions, setRoleOptions] = useState<{ code: FansubGroupRoleCode; label: string; description?: string }[]>(
    FANSUB_GROUP_ROLE_OPTIONS
  )
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

  // Rollenoptionen beim Mount via API laden; bei Fehler oder leerer Antwort bleibt statischer Fallback aktiv (fail-soft)
  useEffect(() => {
    let cancelled = false
    listFansubGroupRoles()
      .then((items) => {
        if (!cancelled && items.length > 0) {
          setRoleOptions(
            items.map((item) => ({
              code: item.code,
              label: item.label_de,
              description: undefined,
            }))
          )
        }
      })
      .catch(() => {
        // Fehler still abfangen — Fallback FANSUB_GROUP_ROLE_OPTIONS bleibt aktiv
      })
    return () => { cancelled = true }
  }, [])

  const canViewMembers = capabilities?.can_view_members ?? false
  const canManageMembers = capabilities?.can_manage_members ?? false
  const canViewInvitations = capabilities?.can_view_invitations ?? false
  const canCreateInvitation = capabilities?.can_create_invitation ?? false
  const canCancelInvitation = capabilities?.can_cancel_invitation ?? false

  const loadSection = useCallback(async () => {
    if (!hasAccessToken || fansubId <= 0) {
      setCapabilities(null); setMembers([]); setIsLoading(false); return
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

  useEffect(() => { void loadSection() }, [loadSection])

  useEffect(() => {
    if (!successMessage) return undefined
    const timeout = window.setTimeout(() => setSuccessMessage(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [successMessage])

  useEffect(() => {
    let cancelled = false
    async function runSearch() {
      if (!hasAccessToken || !canManageMembers || deferredCandidateQuery.length < 2) {
        if (!cancelled) { setCandidateResults([]); setSelectedCandidateId('') }
        return
      }
      try {
        setIsSearching(true)
        const response = await searchFansubAppMemberCandidates(fansubId, deferredCandidateQuery)
        if (cancelled) return
        const nextResults = response.data
        setCandidateResults(nextResults)
        setSelectedCandidateId((current) => {
          if (current && nextResults.some((candidate) => String(candidate?.app_user_id || 0) === current)) return current
          return ''
        })
      } catch (error) {
        if (!cancelled) {
          setActionError(formatApiError(error, 'Mitglieder konnten nicht gesucht werden.'))
          setCandidateResults([])
          setSelectedCandidateId('')
        }
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }
    void runSearch()
    return () => { cancelled = true }
  }, [hasAccessToken, canManageMembers, deferredCandidateQuery, fansubId])

  const activeMemberCount = useMemo(() => members.filter((m) => m.status === 'active').length, [members])
  const editorMember = useMemo(() => members.find((m) => m.id === editorMemberId) ?? null, [members, editorMemberId])
  const selectedCandidate = useMemo(
    () => candidateResults.find((c) => String(c.app_user_id) === selectedCandidateId) ?? null,
    [candidateResults, selectedCandidateId],
  )

  function toggleSelectedRole(role: string) {
    setSelectedRoles((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }
  function toggleInviteRole(role: FansubGroupRoleCode) {
    setInviteRoles((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }
  function handleCandidateQueryChange(value: string) {
    setCandidateQuery(value)
    if (selectedCandidate && value.trim() !== selectedCandidate.fansub_name) setSelectedCandidateId('')
  }
  function handleCandidateSelect(candidate: FansubGroupMemberCandidate) {
    if (!candidate.app_user_id) return
    setSelectedCandidateId(String(candidate.app_user_id))
    setCandidateQuery(candidate.fansub_name)
  }

  async function handleAddMember() {
    const appUserId = Number.parseInt(selectedCandidateId, 10)
    if (!hasAccessToken || !Number.isFinite(appUserId) || appUserId <= 0 || selectedRoles.length === 0) return
    try {
      setIsAdding(true); setActionError(null); setSuccessMessage(null)
      await createFansubAppMember(fansubId, { app_user_id: appUserId, roles: selectedRoles })
      setCandidateQuery(''); setCandidateResults([]); setSelectedCandidateId(''); setSelectedRoles([]); setCreatedInviteLink(null)
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
    if (!hasAccessToken || !inviteEmail.trim() || inviteRoles.length === 0) return
    try {
      setIsCreatingInvite(true); setActionError(null); setSuccessMessage(null)
      const response = await createFansubGroupInvitation(fansubId, { email: inviteEmail.trim(), invited_role_codes: inviteRoles })
      setInviteEmail(''); setInviteRoles([]); setCreatedInviteLink(response.data.invite_link)
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
      setBusyKey(`invitation:${invitationId}`); setActionError(null); setSuccessMessage(null)
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
    setEditorMemberId(member.id); setMemberEditorTab('roles')
    setMemberRoleDraft([...member.roles]); setMediaPermissionDraft(getMediaPermissions(member))
  }

  function closeMemberEditor() {
    if (editorMember && busyKey === `member-editor:${editorMember.app_user_id}`) return
    setEditorMemberId(null); setMemberEditorTab('roles')
    setMemberRoleDraft([]); setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS)
  }

  async function handleSaveMemberEditor() {
    if (!editorMember) return
    const originalRoles = new Set(editorMember.roles)
    const nextRoles = new Set(memberRoleDraft)
    const rolesToEnable = memberRoleDraft.filter((role) => !originalRoles.has(role))
    const rolesToDisable = editorMember.roles.filter((role) => !nextRoles.has(role))
    const shouldSaveMediaPermissions = !mediaPermissionsEqual(getMediaPermissions(editorMember), mediaPermissionDraft)
    try {
      setBusyKey(`member-editor:${editorMember.app_user_id}`); setActionError(null); setSuccessMessage(null)
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
        const response = await updateFansubAppMemberMediaPermissions(fansubId, editorMember.app_user_id, mediaPermissionDraft)
        latestMember = response.data
      }
      setMembers((current) => current.map((item) => (item.app_user_id === editorMember.app_user_id ? latestMember : item)))
      setEditorMemberId(null); setMemberEditorTab('roles'); setMemberRoleDraft([]); setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS)
      setSuccessMessage('Änderungen gespeichert.')
    } catch (error) {
      setActionError(formatApiError(error, 'Änderungen konnten nicht gespeichert werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  function openAppMemberFlow() { setIsAddChoiceOpen(false); setIsMemberModalOpen(true) }
  function openHistoricalMemberFlow() {
    if (!canManageMembers) return
    setIsAddChoiceOpen(false)
    historicalActions?.openHistoricalMemberForm()
  }

  return (
    <Card variant="section" className={styles.fansubEditMembershipSurface}>
      <div className={styles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditHint}>Wer zur Fansubgruppe gehört und welche Aufgaben die Person übernimmt.</p>
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
        <LoadingState title="Mitglieder werden geladen" description="Team4s lädt die Mitglieder und Einladungen dieser Fansubgruppe." />
      ) : null}
      {loadError ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={loadError}
          action={<Button variant="secondary" size="sm" onClick={() => void loadSection()}>Erneut laden</Button>}
        />
      ) : null}
      {actionError ? <ErrorState title="Aktion fehlgeschlagen" description={actionError} /> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {!isLoading && !loadError && hasAccessToken && !canViewMembers && !canViewInvitations ? (
        <ErrorState
          title="Fehlende Berechtigungen"
          description="Dir fehlen die Berechtigungen für Mitglieder und Einladungen dieser Fansubgruppe."
        />
      ) : null}

      {!isLoading && !loadError && hasAccessToken && (canViewMembers || canViewInvitations) ? (
        <>
          <FansubAppMembersOverview
            members={members}
            invitations={invitations}
            canViewMembers={canViewMembers}
            canViewInvitations={canViewInvitations}
            canManageMembers={canManageMembers}
            canCancelInvitation={canCancelInvitation}
            createdInviteLink={createdInviteLink}
            busyKey={busyKey}
            onEditMember={openMemberEditor}
            onCancelInvitation={(invId) => void handleCancelInvitation(invId)}
          />

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

      <FansubAppMemberChoiceModal
        open={isAddChoiceOpen}
        canManageMembers={canManageMembers}
        canCreateInvitation={canCreateInvitation}
        hasHistoricalActions={!!historicalActions}
        onClose={() => setIsAddChoiceOpen(false)}
        onAppMemberFlow={openAppMemberFlow}
        onHistoricalMemberFlow={openHistoricalMemberFlow}
      />

      <FansubAppMemberAddModal
        open={isMemberModalOpen}
        canManageMembers={canManageMembers}
        canCreateInvitation={canCreateInvitation}
        candidateQuery={candidateQuery}
        candidateResults={candidateResults}
        selectedCandidateId={selectedCandidateId}
        selectedCandidate={selectedCandidate}
        selectedRoles={selectedRoles}
        isSearching={isSearching}
        isAdding={isAdding}
        inviteEmail={inviteEmail}
        inviteRoles={inviteRoles}
        isCreatingInvite={isCreatingInvite}
        roleOptions={roleOptions}
        onClose={() => setIsMemberModalOpen(false)}
        onCandidateQueryChange={handleCandidateQueryChange}
        onCandidateSelect={handleCandidateSelect}
        onToggleRole={toggleSelectedRole}
        onAddMember={() => void handleAddMember()}
        onInviteEmailChange={setInviteEmail}
        onToggleInviteRole={toggleInviteRole}
        onCreateInvitation={() => void handleCreateInvitation()}
      />

      <FansubAppMemberEditorPanel
        editorMember={editorMember}
        memberEditorTab={memberEditorTab}
        setMemberEditorTab={setMemberEditorTab}
        memberRoleDraft={memberRoleDraft}
        mediaPermissionDraft={mediaPermissionDraft}
        isBusy={busyKey === `member-editor:${editorMember?.app_user_id}`}
        onClose={closeMemberEditor}
        onSave={() => void handleSaveMemberEditor()}
        onToggleRole={(role) => setMemberRoleDraft((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])}
        onToggleMediaPermission={(permission) => setMediaPermissionDraft((current) => ({ ...current, [permission]: !current[permission] }))}
      />
    </Card>
  )
}
