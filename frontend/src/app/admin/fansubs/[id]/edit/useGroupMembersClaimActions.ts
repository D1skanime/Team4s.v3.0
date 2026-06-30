'use client'

import { useState } from 'react'

import {
  ApiError,
  approveMemberRequest,
  cancelClaimInvitation,
  generateClaimInvitation,
  listClaimInvitations,
  rejectMemberClaim,
  rejectMemberRequest,
  verifyMemberClaim,
} from '@/lib/api'
import type {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberRequestRow,
} from '@/types/profile'

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

type CopyState = 'copied' | 'selected'

export type UseGroupMembersClaimActionsOptions = {
  fansubId: number
  onLoadNeeded: () => Promise<void>
}

export function useGroupMembersClaimActions({ fansubId, onLoadNeeded }: UseGroupMembersClaimActionsOptions) {
  const [generatedInvites, setGeneratedInvites] = useState<Record<number, GenerateClaimInvitationResponse>>({})
  const [memberInvitations, setMemberInvitations] = useState<Record<number, MemberClaimInvitationResponse[]>>({})
  const [copyStates, setCopyStates] = useState<Record<number, CopyState>>({})
  const [approveNicknames, setApproveNicknames] = useState<Record<number, string>>({})
  const [pendingClaims, setPendingClaims] = useState<MemberClaimRow[]>([])
  const [memberRequests, setMemberRequests] = useState<MemberRequestRow[]>([])
  const [claimActionError, setClaimActionError] = useState<string | null>(null)

  function setLoadedClaimData(
    loadedPendingClaims: MemberClaimRow[],
    loadedMemberRequests: MemberRequestRow[],
    invitationMap: Record<number, MemberClaimInvitationResponse[]>,
  ) {
    setPendingClaims(loadedPendingClaims)
    setMemberRequests(loadedMemberRequests)
    setMemberInvitations(invitationMap)
  }

  async function handleGenerateInvitation(rowId: number, memberId: number) {
    try {
      setClaimActionError(null)
      const invite = await generateClaimInvitation(fansubId, memberId)
      setGeneratedInvites((current) => ({ ...current, [rowId]: invite }))
      setMemberInvitations((current) => ({
        ...current,
        [rowId]: [{
          id: invite.id, member_id: invite.member_id, fansub_group_id: invite.fansub_group_id,
          status: 'pending', expires_at: invite.expires_at, created_at: new Date().toISOString(),
        }],
      }))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'pending_invitation_exists') {
        const invitations = await listClaimInvitations(fansubId, memberId).catch(() => [] as MemberClaimInvitationResponse[])
        setMemberInvitations((current) => ({ ...current, [rowId]: invitations }))
      }
      setClaimActionError(formatApiError(err, 'Einladungslink konnte nicht erstellt werden.'))
    }
  }

  async function handleCancelInvitation(rowId: number, memberId: number, invitationId: number) {
    if (!window.confirm('Aktive Einladung zurückziehen? Der bisherige Link kann danach nicht mehr verwendet werden.')) return
    try {
      setClaimActionError(null)
      await cancelClaimInvitation(fansubId, memberId, invitationId)
      setGeneratedInvites((current) => { const next = { ...current }; delete next[rowId]; return next })
      setMemberInvitations((current) => ({
        ...current,
        [rowId]: (current[rowId] ?? []).filter((inv) => inv.id !== invitationId),
      }))
      setClaimActionError('Aktive Einladung zurückgezogen. Du kannst jetzt einen neuen Link generieren.')
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Einladung konnte nicht zurückgezogen werden.'))
    }
  }

  function markVisibleInviteLink(rowId: number) {
    const field = document.getElementById(`hist-claim-invite-link-${rowId}`) as HTMLInputElement | null
    if (!field) return false
    field.focus()
    field.select()
    return true
  }

  async function handleCopyLink(rowId: number, link: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const field = document.createElement('textarea')
        field.value = link
        field.setAttribute('readonly', 'true')
        field.style.position = 'fixed'
        field.style.left = '-9999px'
        document.body.appendChild(field)
        field.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(field)
        if (!copied) throw new Error('copy command failed')
      }
      setClaimActionError(null)
      setCopyStates((current) => ({ ...current, [rowId]: 'copied' }))
      window.setTimeout(() => {
        setCopyStates((current) => { const next = { ...current }; delete next[rowId]; return next })
      }, 1500)
    } catch {
      if (markVisibleInviteLink(rowId)) {
        setClaimActionError('Automatisches Kopieren wurde vom Browser blockiert. Der Link ist markiert; kopiere ihn mit Strg+C.')
        setCopyStates((current) => ({ ...current, [rowId]: 'selected' }))
        return
      }
      setClaimActionError('Automatisches Kopieren wurde vom Browser blockiert. Öffne den Link direkt oder kopiere ihn aus dem Textfeld.')
    }
  }

  async function handleVerifyClaim(claimId: number) {
    try {
      setClaimActionError(null)
      await verifyMemberClaim(fansubId, claimId)
      setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
      await onLoadNeeded()
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Claim konnte nicht bestätigt werden.'))
    }
  }

  async function handleRejectClaim(claimId: number, memberNick: string) {
    if (!window.confirm(`Claim für "${memberNick}" ablehnen?`)) return
    try {
      setClaimActionError(null)
      await rejectMemberClaim(fansubId, claimId)
      setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Claim konnte nicht abgelehnt werden.'))
    }
  }

  async function handleApproveRequest(requestId: number, approveNicknamesRef: Record<number, string>) {
    const nickname = (approveNicknamesRef[requestId] || '').trim()
    if (!nickname) { setClaimActionError('Nickname für den neuen Eintrag ist erforderlich.'); return }
    if (!window.confirm(`Neuanlage-Antrag mit Nickname "${nickname}" bestätigen?`)) return
    try {
      setClaimActionError(null)
      await approveMemberRequest(requestId, { nickname })
      setMemberRequests((current) => current.filter((request) => request.id !== requestId))
      await onLoadNeeded()
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Neuanlage-Antrag konnte nicht bestätigt werden.'))
    }
  }

  async function handleRejectRequest(requestId: number) {
    if (!window.confirm('Neuanlage-Antrag ablehnen?')) return
    try {
      setClaimActionError(null)
      await rejectMemberRequest(requestId)
      setMemberRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Neuanlage-Antrag konnte nicht abgelehnt werden.'))
    }
  }

  return {
    generatedInvites, memberInvitations, copyStates,
    approveNicknames, setApproveNicknames,
    pendingClaims, memberRequests,
    claimActionError,
    setLoadedClaimData,
    handleGenerateInvitation, handleCancelInvitation, handleCopyLink,
    handleVerifyClaim, handleRejectClaim,
    handleApproveRequest, handleRejectRequest,
  }
}
