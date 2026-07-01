'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ApiError,
  createGroupMember,
  createMemberRole,
  deleteGroupMember,
  deleteMemberRole,
  listClaimInvitations,
  listGroupMembers,
  listMemberRequests,
  listMemberRoles,
  listPendingMemberClaims,
  updateGroupMember,
  updateMemberRole,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type CreateGroupMemberRequest,
  type CreateMemberRoleRequest,
  type HistFansubGroupMember,
  type HistGroupMemberRole,
} from '@/types/fansub'
import type {
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberRequestRow,
} from '@/types/profile'

import type { RoleFormFields } from './GroupHistRoleDialog'
import type { MemberFormFields } from './GroupMemberFormModals'
import type { GroupMembersTabActions } from './GroupMembersTab'
import { useGroupMembersClaimActions } from './useGroupMembersClaimActions'

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

export function roleLabelForCode(code: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function normalizeInviteLink(rawLink: string): string {
  const trimmed = rawLink.trim()
  if (!trimmed || typeof window === 'undefined') return trimmed
  try {
    const parsed = new URL(trimmed, window.location.origin)
    if (isLocalHost(parsed.hostname) && isLocalHost(window.location.hostname)) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.toString()
  } catch {
    return trimmed
  }
}

export const EMPTY_MEMBER_FORM: MemberFormFields = {
  displayName: '',
  joinedDate: '',
  leftDate: '',
  visibility: 'internal',
}

export const EMPTY_ROLE_FORM: RoleFormFields = {
  memberId: '',
  roleCode: '',
  startedDate: '',
  endedDate: '',
  note: '',
}

export function memberToForm(m: HistFansubGroupMember): MemberFormFields {
  return {
    displayName: m.display_name,
    joinedDate: m.joined_date ?? '',
    leftDate: m.left_date ?? '',
    visibility: m.visibility ?? 'internal',
  }
}

export function roleToForm(role: HistGroupMemberRole): RoleFormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedDate: role.started_date ?? '',
    endedDate: role.ended_date ?? '',
    note: role.note ?? '',
  }
}

export const YEAR_MIN = 1980
export const CURRENT_YEAR = new Date().getFullYear()

export type UseGroupMembersTabOptions = {
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
}

export function useGroupMembersTab({ fansubId, onActionsChange }: UseGroupMembersTabOptions) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistFansubGroupMember | null>(null)
  const [form, setForm] = useState<MemberFormFields>(EMPTY_MEMBER_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HistFansubGroupMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleEditTarget, setRoleEditTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormFields>(EMPTY_ROLE_FORM)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleModalError, setRoleModalError] = useState<string | null>(null)
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleDeleting, setRoleDeleting] = useState(false)
  const [roleDeleteError, setRoleDeleteError] = useState<string | null>(null)

  const claimActions = useGroupMembersClaimActions({
    fansubId,
    onLoadNeeded: async () => { await load() },
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listGroupMembers(fansubId)
      const loadedMembers = response.data ?? []
      const roleResponses = await Promise.all(
        loadedMembers.map((member) => listMemberRoles(fansubId, member.id)),
      )
      const invitationEntries = await Promise.all(
        loadedMembers.map(async (member) => {
          try {
            const invitations = await listClaimInvitations(fansubId, member.member_id)
            return [member.id, invitations] as const
          } catch {
            return [member.id, [] as MemberClaimInvitationResponse[]] as const
          }
        }),
      )
      const [loadedPendingClaims, loadedMemberRequests] = await Promise.all([
        listPendingMemberClaims(fansubId).catch(() => [] as MemberClaimRow[]),
        listMemberRequests().catch(() => [] as MemberRequestRow[]),
      ])
      const loadedRoles = roleResponses.flatMap((roleResponse, index) =>
        (roleResponse.data ?? []).map((role) => ({
          ...role,
          member_display_name: role.member_display_name || loadedMembers[index]?.display_name || '',
        })),
      )
      setMembers(loadedMembers)
      claimActions.setLoadedClaimData(
        loadedPendingClaims,
        loadedMemberRequests,
        Object.fromEntries(invitationEntries),
      )
      setRoles(
        loadedRoles.sort((a, b) => {
          const startedDiff = (b.started_date ?? '').localeCompare(a.started_date ?? '')
          return startedDiff !== 0 ? startedDiff : a.id - b.id
        }),
      )
    } catch (err) {
      setError(formatApiError(err, 'Mitglieder und Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fansubId])

  useEffect(() => { void load() }, [load])

  const rolesByMember = useMemo(() => {
    const grouped = new Map<number, HistGroupMemberRole[]>()
    for (const role of roles) {
      const list = grouped.get(role.fansub_group_member_id) ?? []
      list.push(role)
      grouped.set(role.fansub_group_member_id, list)
    }
    return grouped
  }, [roles])

  const pendingClaimsByMember = useMemo(() => {
    const grouped = new Map<number, MemberClaimRow[]>()
    for (const claim of claimActions.pendingClaims) {
      const list = grouped.get(claim.member_id) ?? []
      list.push(claim)
      grouped.set(claim.member_id, list)
    }
    return grouped
  }, [claimActions.pendingClaims])

  const openNew = useCallback(() => {
    setEditTarget(null)
    setForm(EMPTY_MEMBER_FORM)
    setModalError(null)
    setModalOpen(true)
  }, [])

  function openEdit(member: HistFansubGroupMember) {
    setEditTarget(member)
    setForm(memberToForm(member))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  async function handleSave() {
    if (!form.displayName.trim()) { setModalError('Anzeigename darf nicht leer sein.'); return }
    const joinedDate = form.joinedDate || null
    const leftDate = form.leftDate || null
    if (joinedDate !== null && leftDate !== null && leftDate < joinedDate) {
      setModalError('Austrittsdatum darf nicht vor dem Beitrittsdatum liegen.')
      return
    }
    try {
      setSaving(true)
      setModalError(null)
      if (editTarget) {
        await updateGroupMember(fansubId, editTarget.id, {
          display_name: form.displayName.trim(), joined_date: joinedDate, left_date: leftDate,
          status: editTarget.status, visibility: form.visibility,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(), joined_date: joinedDate, left_date: leftDate,
          status: 'historical', visibility: form.visibility,
        }
        await createGroupMember(fansubId, body)
      }
      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Mitglied konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  function closeDeleteModal() { setDeleteTarget(null); setDeleteError(null) }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteGroupMember(fansubId, deleteTarget.id)
      await load()
      closeDeleteModal()
    } catch (err) {
      setDeleteError(formatApiError(err, 'Mitglied konnte nicht gelöscht werden.'))
    } finally {
      setDeleting(false)
    }
  }

  const openNewRole = useCallback((member?: HistFansubGroupMember) => {
    setRoleEditTarget(null)
    setRoleForm({ ...EMPTY_ROLE_FORM, memberId: member ? String(member.id) : '' })
    setRoleModalError(null)
    setRoleModalOpen(true)
  }, [])

  function openEditRole(role: HistGroupMemberRole) {
    setRoleEditTarget(role)
    setRoleForm(roleToForm(role))
    setRoleModalError(null)
    setRoleModalOpen(true)
  }

  function closeRoleModal() { setRoleModalOpen(false); setRoleEditTarget(null); setRoleModalError(null) }
  function closeRoleDeleteModal() { setRoleDeleteTarget(null); setRoleDeleteError(null) }

  async function handleRoleSave() {
    if (!roleForm.memberId) { setRoleModalError('Bitte ein Mitglied auswählen.'); return }
    if (!roleForm.roleCode.trim()) { setRoleModalError('Rollenbezeichnung darf nicht leer sein.'); return }
    const startedDate = roleForm.startedDate || null
    const endedDate = roleForm.endedDate || null
    if (startedDate !== null && endedDate !== null && endedDate < startedDate) {
      setRoleModalError('Rolle bis darf nicht vor Rolle von liegen.')
      return
    }
    try {
      setRoleSaving(true)
      setRoleModalError(null)
      if (roleEditTarget) {
        await updateMemberRole(fansubId, roleEditTarget.id, {
          role_code: roleForm.roleCode.trim(), started_date: startedDate, ended_date: endedDate,
          source_note: roleForm.note.trim() || null, status: roleEditTarget.status, visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(roleForm.memberId),
          role_code: roleForm.roleCode.trim(), started_date: startedDate, ended_date: endedDate,
          source_note: roleForm.note.trim() || null, status: 'historical', visibility: 'internal',
        }
        await createMemberRole(fansubId, body)
      }
      await load()
      closeRoleModal()
    } catch (err) {
      setRoleModalError(formatApiError(err, 'Rolle konnte nicht gespeichert werden.'))
    } finally {
      setRoleSaving(false)
    }
  }

  useEffect(() => {
    if (!onActionsChange) return
    onActionsChange({
      canCreateRole: members.length > 0,
      openHistoricalMemberForm: openNew,
      openHistoricalRoleForm: () => openNewRole(),
    })
    return () => onActionsChange(null)
  }, [members.length, onActionsChange, openNew, openNewRole])

  async function handleRoleDeleteConfirm() {
    if (!roleDeleteTarget) return
    try {
      setRoleDeleting(true)
      setRoleDeleteError(null)
      await deleteMemberRole(fansubId, roleDeleteTarget.id)
      await load()
      closeRoleDeleteModal()
    } catch (err) {
      setRoleDeleteError(formatApiError(err, 'Rolle konnte nicht gelöscht werden.'))
    } finally {
      setRoleDeleting(false)
    }
  }

  return {
    members, roles, loading, error,
    rolesByMember, pendingClaimsByMember,
    modalOpen, editTarget, form, setForm, saving, modalError,
    deleteTarget, setDeleteTarget, deleting, deleteError,
    roleModalOpen, roleEditTarget, roleForm, setRoleForm, roleSaving, roleModalError,
    roleDeleteTarget, setRoleDeleteTarget, roleDeleting, roleDeleteError,
    YEAR_MIN, CURRENT_YEAR,
    load, openNew, openEdit, closeModal, handleSave,
    closeDeleteModal, handleDeleteConfirm,
    openNewRole, openEditRole, closeRoleModal, closeRoleDeleteModal,
    handleRoleSave, handleRoleDeleteConfirm,
    // Claim-Aktionen durchreichen
    ...claimActions,
    handleApproveRequest: (requestId: number) =>
      claimActions.handleApproveRequest(requestId, claimActions.approveNicknames),
  }
}
