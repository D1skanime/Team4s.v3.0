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
  activateClaimedMember,
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

export type PendingClaimConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  run: () => Promise<void>
}

export type UseGroupMembersClaimActionsOptions = {
  fansubId: number
  onLoadNeeded: () => Promise<void>
  /** Called after an action that changes the ACTIVE app-members roster (distinct from
   * the historical-members list `onLoadNeeded` refreshes) — currently only member
   * activation. Lets a parent section owning its own active-members fetch stay in sync
   * without a full page reload. */
  onActiveAppMembersChanged?: () => void
}

export function useGroupMembersClaimActions({ fansubId, onLoadNeeded, onActiveAppMembersChanged }: UseGroupMembersClaimActionsOptions) {
  const [generatedInvites, setGeneratedInvites] = useState<Record<number, GenerateClaimInvitationResponse>>({})
  const [memberInvitations, setMemberInvitations] = useState<Record<number, MemberClaimInvitationResponse[]>>({})
  const [copyStates, setCopyStates] = useState<Record<number, CopyState>>({})
  const [approveNicknames, setApproveNicknames] = useState<Record<number, string>>({})
  const [pendingClaims, setPendingClaims] = useState<MemberClaimRow[]>([])
  const [memberRequests, setMemberRequests] = useState<MemberRequestRow[]>([])
  const [claimActionError, setClaimActionError] = useState<string | null>(null)
  const [claimActionSuccess, setClaimActionSuccess] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingClaimConfirmAction | null>(null)

  function flashClaimActionSuccess(message: string) {
    setClaimActionSuccess(message)
    window.setTimeout(() => {
      setClaimActionSuccess((current) => (current === message ? null : current))
    }, 2500)
  }

  function requestConfirm(action: PendingClaimConfirmAction) {
    setPendingConfirm(action)
  }

  function cancelPendingConfirm() {
    setPendingConfirm(null)
  }

  async function confirmPendingConfirm() {
    const action = pendingConfirm
    setPendingConfirm(null)
    if (action) await action.run()
  }

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

  function handleCancelInvitation(rowId: number, memberId: number, invitationId: number) {
    requestConfirm({
      title: 'Einladung zurückziehen',
      description: 'Aktive Einladung zurückziehen? Der bisherige Link kann danach nicht mehr verwendet werden.',
      confirmLabel: 'Zurückziehen',
      danger: true,
      run: async () => {
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
      },
    })
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
      flashClaimActionSuccess('Claim bestätigt – der Account ist jetzt mit diesem Eintrag verknüpft.')
    } catch (err) {
      setClaimActionError(formatApiError(err, 'Claim konnte nicht bestätigt werden.'))
    }
  }

  function handleActivateMember(memberId: number, memberNick: string) {
    requestConfirm({
      title: 'Als aktives Mitglied übernehmen',
      description: `"${memberNick}" als aktives Mitglied übernehmen?`,
      confirmLabel: 'Übernehmen',
      run: async () => {
        try {
          setClaimActionError(null)
          await activateClaimedMember(fansubId, memberId)
          await onLoadNeeded()
          onActiveAppMembersChanged?.()
          flashClaimActionSuccess(`"${memberNick}" ist jetzt aktives Mitglied.`)
        } catch (err) {
          setClaimActionError(formatApiError(err, 'Konnte nicht als aktives Mitglied übernommen werden.'))
        }
      },
    })
  }

  function handleRejectClaim(claimId: number, memberNick: string) {
    requestConfirm({
      title: 'Claim ablehnen',
      description: `Claim für "${memberNick}" ablehnen?`,
      confirmLabel: 'Ablehnen',
      danger: true,
      run: async () => {
        try {
          setClaimActionError(null)
          await rejectMemberClaim(fansubId, claimId)
          setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
        } catch (err) {
          setClaimActionError(formatApiError(err, 'Claim konnte nicht abgelehnt werden.'))
        }
      },
    })
  }

  function handleApproveRequest(requestId: number, approveNicknamesRef: Record<number, string>) {
    const nickname = (approveNicknamesRef[requestId] || '').trim()
    if (!nickname) { setClaimActionError('Nickname für den neuen Eintrag ist erforderlich.'); return }
    requestConfirm({
      title: 'Neuanlage-Antrag bestätigen',
      description: `Neuanlage-Antrag mit Nickname "${nickname}" bestätigen?`,
      confirmLabel: 'Bestätigen',
      run: async () => {
        try {
          setClaimActionError(null)
          await approveMemberRequest(requestId, { nickname })
          setMemberRequests((current) => current.filter((request) => request.id !== requestId))
          await onLoadNeeded()
        } catch (err) {
          setClaimActionError(formatApiError(err, 'Neuanlage-Antrag konnte nicht bestätigt werden.'))
        }
      },
    })
  }

  function handleRejectRequest(requestId: number) {
    requestConfirm({
      title: 'Neuanlage-Antrag ablehnen',
      description: 'Neuanlage-Antrag ablehnen?',
      confirmLabel: 'Ablehnen',
      danger: true,
      run: async () => {
        try {
          setClaimActionError(null)
          await rejectMemberRequest(requestId)
          setMemberRequests((current) => current.filter((request) => request.id !== requestId))
        } catch (err) {
          setClaimActionError(formatApiError(err, 'Neuanlage-Antrag konnte nicht abgelehnt werden.'))
        }
      },
    })
  }

  return {
    generatedInvites, memberInvitations, copyStates,
    approveNicknames, setApproveNicknames,
    pendingClaims, memberRequests,
    claimActionError, claimActionSuccess,
    pendingConfirm, confirmPendingConfirm, cancelPendingConfirm,
    setLoadedClaimData,
    handleGenerateInvitation, handleCancelInvitation, handleCopyLink,
    handleVerifyClaim, handleRejectClaim, handleActivateMember,
    handleApproveRequest, handleRejectRequest,
  }
}
