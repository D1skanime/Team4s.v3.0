'use client'

import { useState } from 'react'

import { createGroupMember, createMemberRole, deleteMemberRole, updateMemberRole } from '@/lib/api'
import type { FansubAppMember } from '@/types/fansub'

import type { GroupMembersTabActions } from './GroupMembersTab'
import { EMPTY_INLINE_ROLE_DRAFT, type InlineMemberRoleDraft } from './useGroupMembersTab'

function normalizeDateValue(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  return ''
}

export function roleDraftsFromHistoricalRoles(roles: Array<{ id: number; role_code: string; started_date: string | null; ended_date: string | null }>): InlineMemberRoleDraft[] {
  const drafts = roles.map((role) => ({
    id: `history-role-${role.id}`,
    roleId: role.id,
    roleCode: role.role_code,
    startedDate: normalizeDateValue(role.started_date),
    endedDate: normalizeDateValue(role.ended_date),
  }))
  return drafts.length > 0 ? drafts : [{ ...EMPTY_INLINE_ROLE_DRAFT }]
}

export type HistoricalRoleRecord = { id: number; role_code: string; started_date: string | null; ended_date: string | null }
export type HistoricalMemberRecord = { id: number; member_id: number }

export type UseFansubAppMemberHistoricalRoleDraftsOptions = {
  fansubId: number
  canManageHistoricalRoles: boolean
  historicalActions: GroupMembersTabActions | null
  editorHistoricalMember: HistoricalMemberRecord | null
  editorHistoricalRoles: HistoricalRoleRecord[]
}

/**
 * Owns the inline "frühere Funktionen" (historical role) draft list shown in the member
 * editor panel — state, CRUD handlers, and the save routine that diffs drafts against the
 * existing historical roles for the linked historical member record.
 */
export function useFansubAppMemberHistoricalRoleDrafts({
  fansubId,
  canManageHistoricalRoles,
  historicalActions,
  editorHistoricalMember,
  editorHistoricalRoles,
}: UseFansubAppMemberHistoricalRoleDraftsOptions) {
  const [historicalRoleDrafts, setHistoricalRoleDrafts] = useState<InlineMemberRoleDraft[]>([EMPTY_INLINE_ROLE_DRAFT])

  function resetHistoricalRoleDrafts() {
    setHistoricalRoleDrafts([{ ...EMPTY_INLINE_ROLE_DRAFT }])
  }

  function loadHistoricalRoleDraftsForMember(member: FansubAppMember) {
    const historicalMember = member.member?.member_id
      ? historicalActions?.historicalMembers.find((item) => item.member_id === member.member?.member_id)
      : null
    const historicalRoles = historicalMember
      ? historicalActions?.historicalRolesByMember.get(historicalMember.id) ?? []
      : []
    setHistoricalRoleDrafts(roleDraftsFromHistoricalRoles(historicalRoles))
  }

  function addHistoricalRoleDraft() {
    setHistoricalRoleDrafts((current) => [
      ...current,
      { id: `history-role-new-${current.length + 1}-${Date.now()}`, roleCode: '', startedDate: '', endedDate: '' },
    ])
  }

  function updateHistoricalRoleDraft(id: string, patch: Partial<InlineMemberRoleDraft>) {
    setHistoricalRoleDrafts((current) => current.map((role) => (role.id === id ? { ...role, ...patch } : role)))
  }

  function removeHistoricalRoleDraft(id: string) {
    setHistoricalRoleDrafts((current) => {
      const next = current.filter((role) => role.id !== id)
      return next.length > 0 ? next : [{ ...EMPTY_INLINE_ROLE_DRAFT }]
    })
  }

  async function saveHistoricalRoleDraftsForEditor(member: FansubAppMember) {
    if (!canManageHistoricalRoles) return
    const memberId = member.member?.member_id
    if (!memberId) return
    const filledDrafts = historicalRoleDrafts.filter((draft) => draft.roleCode.trim())
    const hasExistingHistoricalRoles = editorHistoricalRoles.length > 0
    if (filledDrafts.length === 0 && !hasExistingHistoricalRoles) return
    for (const draft of filledDrafts) {
      const startedDate = draft.startedDate || null
      const endedDate = draft.endedDate || null
      if (startedDate !== null && endedDate !== null && endedDate < startedDate) {
        throw new Error('Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.')
      }
    }

    let historicalMember = editorHistoricalMember
    if (!historicalMember) {
      const created = await createGroupMember(fansubId, {
        member_id: memberId,
        display_name: member.member?.fansub_name ?? '',
        joined_date: null,
        left_date: null,
        status: 'historical',
        visibility: 'public',
      })
      historicalMember = created.data
    }

    const remainingRoleIds = new Set(
      filledDrafts.map((draft) => draft.roleId).filter((roleId): roleId is number => typeof roleId === 'number'),
    )
    for (const role of editorHistoricalRoles) {
      if (!remainingRoleIds.has(role.id)) {
        await deleteMemberRole(fansubId, role.id)
      }
    }
    for (const draft of filledDrafts) {
      if (draft.roleId) {
        await updateMemberRole(fansubId, draft.roleId, {
          role_code: draft.roleCode.trim(),
          started_date: draft.startedDate || null,
          ended_date: draft.endedDate || null,
          status: 'historical',
          visibility: 'public',
        })
      } else {
        await createMemberRole(fansubId, {
          hist_fansub_group_member_id: historicalMember.id,
          role_code: draft.roleCode.trim(),
          started_date: draft.startedDate || null,
          ended_date: draft.endedDate || null,
          source_note: null,
          status: 'historical',
          visibility: 'public',
        })
      }
    }
    await historicalActions?.reloadHistoricalMembers()
  }

  return {
    historicalRoleDrafts,
    resetHistoricalRoleDrafts,
    loadHistoricalRoleDraftsForMember,
    addHistoricalRoleDraft,
    updateHistoricalRoleDraft,
    removeHistoricalRoleDraft,
    saveHistoricalRoleDraftsForEditor,
  }
}
