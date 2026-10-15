'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

import {
  ApiError,
  cancelFansubGroupInvitation,
  createFansubGroupInvitation,
  createFansubAppMember,
  getFansubGroupCapabilities,
  listFansubGroupInvitations,
  listFansubAppMembers,
  listGroupHistoryRoleDefinitions,
  listFansubGroupRoleDefinitions,
  searchFansubAppMemberCandidates,
  updateFansubAppMemberRole,
  updateFansubAppMemberMediaPermissions,
} from '@/lib/api'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import {
  type FansubAppMember,
  type FansubGroupMediaPermissions,
  type FansubGroupCapabilities,
  type FansubGroupInvitation,
  type FansubGroupMemberCandidate,
  type FansubGroupRoleCode,
} from '@/types/fansub'
import { orderForContext } from '@/lib/roleCatalog'

import type { FansubAppMemberEditorTab } from './FansubAppMemberEditorPanel'
import { mergeHistoricalRoleOptions, type GroupMembersTabActions } from './GroupMembersTab'
import { CURRENT_YEAR, YEAR_MIN } from './useGroupMembersTab'
import { useFansubAppMemberHistoricalRoleDrafts } from './useFansubAppMemberHistoricalRoleDrafts'

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

export type UseFansubAppMembersSectionOptions = {
  hasAccessToken: boolean
  fansubId: number
}

export function useFansubAppMembersSection({ hasAccessToken, fansubId }: UseFansubAppMembersSectionOptions) {
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [capabilities, setCapabilities] = useState<FansubGroupCapabilities | null>(null)
  // Rollenoptionen: API-getrieben via listFansubGroupRoleDefinitions(fansubId) (member-scoped,
  // für Fansub-Leitungen erreichbar — Gap G1/D-12), Fallback auf statische Liste
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionOption[]>([])
  const [roleOptionsError, setRoleOptionsError] = useState<string | null>(null)
  const roleOptions = useMemo(() => orderForContext(roleDefinitions, 'fansub_group')
    .filter((item) => item.assignable)
    .map((item) => ({ code: item.code as FansubGroupRoleCode, label: item.label_de })), [roleDefinitions])
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateResults, setCandidateResults] = useState<FansubGroupMemberCandidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedHistoricalMemberId, setSelectedHistoricalMemberId] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false)
  const [historicalActions, setHistoricalActions] = useState<GroupMembersTabActions | null>(null)
  const [editorMemberId, setEditorMemberId] = useState<number | null>(null)
  const [memberEditorTab, setMemberEditorTab] = useState<FansubAppMemberEditorTab>('roles')
  const [memberRoleDraft, setMemberRoleDraft] = useState<string[]>([])
  const [mediaPermissionDraft, setMediaPermissionDraft] = useState<FansubGroupMediaPermissions>(EMPTY_MEDIA_PERMISSIONS)
  const [historyRoleOptions, setHistoryRoleOptions] = useState<RoleDefinitionOption[]>([])
  const [historyRoleLoadError, setHistoryRoleLoadError] = useState<string | null>(null)
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

  // Rollenoptionen je Fansub via API laden; bei Fehler oder leerer Antwort bleibt statischer Fallback aktiv (fail-soft)
  useEffect(() => {
    let cancelled = false
    listFansubGroupRoleDefinitions(fansubId)
      .then((items) => {
        if (!cancelled) {
          setRoleDefinitions(items)
          setRoleOptionsError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoleDefinitions([])
          setRoleOptionsError('Zuweisbare Rollen konnten nicht geladen werden.')
        }
      })
    return () => { cancelled = true }
  }, [fansubId])

  useEffect(() => {
    let cancelled = false
    listGroupHistoryRoleDefinitions(fansubId)
      .then((items) => {
        if (!cancelled) {
          setHistoryRoleOptions(mergeHistoricalRoleOptions(items))
          setHistoryRoleLoadError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRoleOptions(mergeHistoricalRoleOptions([]))
          setHistoryRoleLoadError('Frühere Funktionen konnten nicht geladen werden.')
        }
      })
    return () => { cancelled = true }
  }, [fansubId])

  const canViewMembers = capabilities?.can_view_members ?? false
  const canManageMembers = capabilities?.can_manage_members ?? false
  const canManageHistoricalMembers = capabilities?.can_manage_historical_members ?? canManageMembers
  const canManageHistoricalRoles = capabilities?.can_manage_historical_roles ?? canManageMembers
  const canLinkHistoricalMembers = capabilities?.can_link_historical_members ?? canManageMembers
  const canEditHistoricalMemberRecords = canManageHistoricalMembers && canManageHistoricalRoles
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
      if (!hasAccessToken || (!canManageMembers && !canLinkHistoricalMembers) || deferredCandidateQuery.length < 2) {
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
  }, [hasAccessToken, canManageMembers, canLinkHistoricalMembers, deferredCandidateQuery, fansubId])

  const activeMemberCount = useMemo(() => members.filter((m) => m.status === 'active').length, [members])
  const editorMember = useMemo(() => members.find((m) => m.id === editorMemberId) ?? null, [members, editorMemberId])
  const editorHistoricalMember = useMemo(() => {
    const memberId = editorMember?.member?.member_id
    if (!memberId) return null
    return historicalActions?.historicalMembers.find((member) => member.member_id === memberId) ?? null
  }, [editorMember?.member?.member_id, historicalActions])
  const editorHistoricalRoles = useMemo(() => {
    if (!editorHistoricalMember) return []
    return historicalActions?.historicalRolesByMember.get(editorHistoricalMember.id) ?? []
  }, [editorHistoricalMember, historicalActions])
  const selectedCandidate = useMemo(
    () => candidateResults.find((c) => String(c.app_user_id) === selectedCandidateId) ?? null,
    [candidateResults, selectedCandidateId],
  )

  const {
    historicalRoleDrafts,
    resetHistoricalRoleDrafts,
    loadHistoricalRoleDraftsForMember,
    addHistoricalRoleDraft,
    updateHistoricalRoleDraft,
    removeHistoricalRoleDraft,
    saveHistoricalRoleDraftsForEditor,
  } = useFansubAppMemberHistoricalRoleDrafts({
    fansubId,
    canManageHistoricalRoles,
    historicalActions,
    editorHistoricalMember,
    editorHistoricalRoles,
  })

  function toggleSelectedRole(role: string) {
    setSelectedRoles((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }
  function toggleInviteRole(role: FansubGroupRoleCode) {
    setInviteRoles((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }
  function handleCandidateQueryChange(value: string) {
    setCandidateQuery(value)
    if (selectedCandidate && value.trim() !== selectedCandidate.fansub_name) {
      setSelectedCandidateId('')
      setSelectedHistoricalMemberId('')
    }
  }
  function handleCandidateSelect(candidate: FansubGroupMemberCandidate) {
    if (!candidate.app_user_id) return
    setSelectedCandidateId(String(candidate.app_user_id))
    setSelectedHistoricalMemberId('')
    setCandidateQuery(candidate.fansub_name)
  }
  function handleHistoricalMemberChange(value: string) {
    setSelectedHistoricalMemberId(value)
    if (value.trim()) {
      setSelectedRoles([])
    }
  }

  async function handleAddMember() {
    const appUserId = Number.parseInt(selectedCandidateId, 10)
    const historicalMemberId = Number.parseInt(selectedHistoricalMemberId, 10)
    const hasHistoricalSelection = Number.isFinite(historicalMemberId) && historicalMemberId > 0
    if (!hasAccessToken || !Number.isFinite(appUserId) || appUserId <= 0 || (selectedRoles.length === 0 && !hasHistoricalSelection)) return
    try {
      setIsAdding(true); setActionError(null); setSuccessMessage(null)
      await createFansubAppMember(fansubId, {
        app_user_id: appUserId,
        roles: selectedRoles,
        historical_member_id: hasHistoricalSelection ? historicalMemberId : undefined,
      })
      setCandidateQuery(''); setCandidateResults([]); setSelectedCandidateId(''); setSelectedHistoricalMemberId(''); setSelectedRoles([]); setCreatedInviteLink(null)
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
    loadHistoricalRoleDraftsForMember(member)
  }

  function closeMemberEditor() {
    if (editorMember && busyKey === `member-editor:${editorMember.app_user_id}`) return
    setEditorMemberId(null); setMemberEditorTab('roles')
    setMemberRoleDraft([]); setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS)
    resetHistoricalRoleDrafts()
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
      await saveHistoricalRoleDraftsForEditor(editorMember)
      setMembers((current) => current.map((item) => (item.app_user_id === editorMember.app_user_id ? latestMember : item)))
      setEditorMemberId(null); setMemberEditorTab('roles'); setMemberRoleDraft([]); setMediaPermissionDraft(EMPTY_MEDIA_PERMISSIONS); resetHistoricalRoleDrafts()
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
    setSelectedHistoricalMemberId('')
    setIsMemberModalOpen(true)
  }
  function openHistoricalMemberFlow() {
    if (!canEditHistoricalMemberRecords) return
    setIsAddChoiceOpen(false)
    historicalActions?.openHistoricalMemberForm()
  }

  return {
    members, capabilities,
    roleDefinitions, roleOptionsError, roleOptions,
    candidateQuery, candidateResults, selectedCandidateId, selectedHistoricalMemberId, selectedRoles,
    isMemberModalOpen, setIsMemberModalOpen, isAddChoiceOpen, setIsAddChoiceOpen,
    historicalActions, setHistoricalActions,
    memberEditorTab, setMemberEditorTab, memberRoleDraft, setMemberRoleDraft,
    mediaPermissionDraft, setMediaPermissionDraft,
    historicalRoleDrafts, historyRoleOptions, historyRoleLoadError,
    invitations, inviteEmail, setInviteEmail, inviteRoles, createdInviteLink,
    isLoading, isSearching, isAdding, isCreatingInvite, busyKey,
    loadError, actionError, successMessage,
    canViewMembers, canManageMembers, canManageHistoricalMembers, canManageHistoricalRoles,
    canLinkHistoricalMembers, canEditHistoricalMemberRecords, canViewInvitations,
    canCreateInvitation, canCancelInvitation,
    loadSection,
    activeMemberCount, editorMember, editorHistoricalRoles, selectedCandidate,
    toggleSelectedRole, toggleInviteRole, handleCandidateQueryChange, handleCandidateSelect,
    handleHistoricalMemberChange, handleAddMember, handleCreateInvitation, handleCancelInvitation,
    openMemberEditor, closeMemberEditor,
    addHistoricalRoleDraft, updateHistoricalRoleDraft, removeHistoricalRoleDraft,
    handleSaveMemberEditor, openAppMemberFlow, openHistoricalMemberFlow,
    YEAR_MIN, CURRENT_YEAR,
  }
}
