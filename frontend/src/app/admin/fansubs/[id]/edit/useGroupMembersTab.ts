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
import type { GroupMembersTabActions, HistoricalIdentityOption } from './GroupMembersTab'
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

export type InlineMemberRoleDraft = {
  id: string
  roleId?: number
  roleCode: string
  startedDate: string
  endedDate: string
}

export const EMPTY_INLINE_ROLE_DRAFT: InlineMemberRoleDraft = {
  id: 'role-1',
  roleCode: '',
  startedDate: '',
  endedDate: '',
}

function normalizeDateValue(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  return ''
}

export function memberToForm(m: HistFansubGroupMember): MemberFormFields {
  return {
    displayName: m.display_name,
    joinedDate: normalizeDateValue(m.joined_date),
    leftDate: normalizeDateValue(m.left_date),
    visibility: m.visibility ?? 'internal',
  }
}

export function roleToForm(role: HistGroupMemberRole): RoleFormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedDate: normalizeDateValue(role.started_date),
    endedDate: normalizeDateValue(role.ended_date),
    note: role.note ?? '',
  }
}

export const YEAR_MIN = 1960
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
  const [inlineRoleDrafts, setInlineRoleDrafts] = useState<InlineMemberRoleDraft[]>([EMPTY_INLINE_ROLE_DRAFT])
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

  const historicalIdentityOptions = useMemo<HistoricalIdentityOption[]>(() => {
    return members
      .filter((member) => !member.app_user_id)
      .map((member) => {
        const openRoles = (rolesByMember.get(member.id) ?? []).filter((role) => !role.ended_date)
        return {
          id: member.id,
          displayName: member.display_name,
          roleSummary: openRoles.map((role) => role.role_label ?? roleLabelForCode(role.role_code)).join(', '),
        }
      })
      .filter((option) => option.roleSummary.length > 0)
  }, [members, rolesByMember])

  const openNew = useCallback(() => {
    setEditTarget(null)
    setForm(EMPTY_MEMBER_FORM)
    setInlineRoleDrafts([EMPTY_INLINE_ROLE_DRAFT])
    setModalError(null)
    setModalOpen(true)
  }, [])

  function openEdit(member: HistFansubGroupMember) {
    const memberRoles = (rolesByMember.get(member.id) ?? []).map((role) => ({
      id: `role-${role.id}`,
      roleId: role.id,
      roleCode: role.role_code,
      startedDate: normalizeDateValue(role.started_date),
      endedDate: normalizeDateValue(role.ended_date),
    }))
    setEditTarget(member)
    setForm(memberToForm(member))
    setInlineRoleDrafts(memberRoles.length > 0 ? memberRoles : [EMPTY_INLINE_ROLE_DRAFT])
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
    const joinedDate = editTarget ? form.joinedDate || null : null
    const leftDate = editTarget ? form.leftDate || null : null
    const filledInlineRoles = inlineRoleDrafts.filter((item) => item.roleCode.trim())
    if (filledInlineRoles.length === 0) {
      setModalError('Bitte mindestens eine frühere Funktion auswählen.')
      return
    }
    for (const draft of filledInlineRoles) {
      const startedDate = draft.startedDate || null
      const endedDate = draft.endedDate || null
      if (startedDate !== null && endedDate !== null && endedDate < startedDate) {
        setModalError('Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.')
        return
      }
    }
    try {
      setSaving(true)
      setModalError(null)
      if (editTarget) {
        await updateGroupMember(fansubId, editTarget.id, {
          display_name: form.displayName.trim(), joined_date: joinedDate, left_date: leftDate,
          status: editTarget.status, visibility: form.visibility,
        })
        const remainingRoleIds = new Set(filledInlineRoles.map((draft) => draft.roleId).filter((roleId): roleId is number => typeof roleId === 'number'))
        const existingRoles = rolesByMember.get(editTarget.id) ?? []
        for (const role of existingRoles) {
          if (!remainingRoleIds.has(role.id)) {
            await deleteMemberRole(fansubId, role.id)
          }
        }
        for (const draft of filledInlineRoles) {
          if (draft.roleId) {
            await updateMemberRole(fansubId, draft.roleId, {
              role_code: draft.roleCode.trim(),
              started_date: draft.startedDate || null,
              ended_date: draft.endedDate || null,
              status: 'historical',
              visibility: 'internal',
            })
          } else {
            await createMemberRole(fansubId, {
              hist_fansub_group_member_id: editTarget.id,
              role_code: draft.roleCode.trim(),
              started_date: draft.startedDate || null,
              ended_date: draft.endedDate || null,
              source_note: null,
              status: 'historical',
              visibility: 'internal',
            })
          }
        }
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(), joined_date: joinedDate, left_date: leftDate,
          status: 'historical', visibility: form.visibility,
        }
        const created = await createGroupMember(fansubId, body)
        for (const draft of filledInlineRoles) {
          await createMemberRole(fansubId, {
            hist_fansub_group_member_id: created.data.id,
            role_code: draft.roleCode.trim(),
            started_date: draft.startedDate || null,
            ended_date: draft.endedDate || null,
            source_note: null,
            status: 'historical',
            visibility: 'internal',
          })
        }
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
      setRoleModalError('Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.')
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
      historicalIdentityOptions,
      historicalMembers: members,
      historicalRolesByMember: rolesByMember,
      reloadHistoricalMembers: load,
      openHistoricalMemberForm: openNew,
      openHistoricalRoleForm: () => openNewRole(),
    })
    return () => onActionsChange(null)
  }, [historicalIdentityOptions, load, members, onActionsChange, openNew, openNewRole, rolesByMember])

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
    modalOpen, editTarget, form, setForm, inlineRoleDrafts, setInlineRoleDrafts, saving, modalError,
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
