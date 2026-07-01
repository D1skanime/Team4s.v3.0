'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, FilePlus, Link2, UserCheck, UserX } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from '@/components/ui'
import { MemorialSetterAction } from '@/components/profile/MemorialSetterAction'
import {
  ApiError,
  approveMemberRequest,
  cancelClaimInvitation,
  generateClaimInvitation,
  listClaimInvitations,
  listFansubGroupRoleDefinitions,
  listGroupMembers,
  listMemberRoles,
  listMemberRequests,
  listPendingMemberClaims,
  rejectMemberClaim,
  rejectMemberRequest,
  verifyMemberClaim,
} from '@/lib/api'
import { FANSUB_GROUP_ROLE_OPTIONS, type HistFansubGroupMember } from '@/types/fansub'
import type {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberRequestRow,
} from '@/types/profile'

import styles from './ClaimManagementPanel.module.css'
import { RoleAssignmentAfterClaim, type ClaimRoleAssignment } from './RoleAssignmentAfterClaim'

type ClaimManagementPanelProps = {
  groupId: number
  /** D-16: Nur Global Admin darf Memorial setzen. Gruppen-Capability reicht nicht (Fallstrick 4). */
  isGlobalAdmin?: boolean
}

type CopyState = 'copied' | 'selected'
type ActiveRoleOption = { code: string; label: string }

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE')
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function normalizeInviteLink(rawLink: string): string {
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

function initialActiveRoleOptions(): ActiveRoleOption[] {
  return FANSUB_GROUP_ROLE_OPTIONS
    .filter((option) => option.code !== 'fansub_lead')
    .map((option) => ({ code: option.code, label: option.label }))
}

export function ClaimManagementPanel({ groupId, isGlobalAdmin = false }: ClaimManagementPanelProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [pendingClaims, setPendingClaims] = useState<MemberClaimRow[]>([])
  const [memberRequests, setMemberRequests] = useState<MemberRequestRow[]>([])
  const [generatedInvites, setGeneratedInvites] = useState<Record<number, GenerateClaimInvitationResponse>>({})
  const [memberInvitations, setMemberInvitations] = useState<Record<number, MemberClaimInvitationResponse[]>>({})
  const [roleAssignments, setRoleAssignments] = useState<ClaimRoleAssignment[]>([])
  const [activeRoleOptions, setActiveRoleOptions] = useState<ActiveRoleOption[]>(() => initialActiveRoleOptions())
  const [copyStates, setCopyStates] = useState<Record<number, CopyState>>({})
  const [approveNicknames, setApproveNicknames] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showOnlyOpen, setShowOnlyOpen] = useState(true)

  const loadClaimData = useCallback(async () => {
    if (!Number.isFinite(groupId) || groupId <= 0) return
    try {
      setIsLoading(true)
      setActionError(null)
      const [memberRes, claimRes, requestRes] = await Promise.all([
        listGroupMembers(groupId),
        listPendingMemberClaims(groupId),
        listMemberRequests().catch(() => [] as MemberRequestRow[]),
      ])
      const loadedMembers = memberRes.data ?? []
      const invitationEntries = await Promise.all(
        loadedMembers.map(async (member) => {
          try {
            const invitations = await listClaimInvitations(groupId, member.member_id)
            return [member.id, invitations] as const
          } catch {
            return [member.id, [] as MemberClaimInvitationResponse[]] as const
          }
        }),
      )
      setMembers(loadedMembers)
      setMemberInvitations(Object.fromEntries(invitationEntries))
      setPendingClaims(claimRes ?? [])
      setMemberRequests(requestRes ?? [])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Claim-Daten konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void loadClaimData()
  }, [loadClaimData])

  useEffect(() => {
    let cancelled = false
    listFansubGroupRoleDefinitions(groupId)
      .then((items) => {
        if (cancelled || items.length === 0) return
        setActiveRoleOptions(
          items
            .filter((item) => item.code !== 'fansub_lead')
            .map((item) => ({ code: item.code, label: item.label_de })),
        )
      })
      .catch(() => {
        // Fallback: statische FANSUB_GROUP_ROLE_OPTIONS bleiben aktiv.
      })
    return () => { cancelled = true }
  }, [groupId])

  async function handleGenerateInvitation(rowId: number, memberId: number) {
    try {
      setActionError(null)
      const invite = await generateClaimInvitation(groupId, memberId)
      setGeneratedInvites((current) => ({ ...current, [rowId]: invite }))
      setMemberInvitations((current) => ({
        ...current,
        [rowId]: [
          {
            id: invite.id,
            member_id: invite.member_id,
            fansub_group_id: invite.fansub_group_id,
            status: 'pending',
            expires_at: invite.expires_at,
            created_at: new Date().toISOString(),
          },
        ],
      }))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'pending_invitation_exists') {
        const invitations = await listClaimInvitations(groupId, memberId).catch(() => [] as MemberClaimInvitationResponse[])
        setMemberInvitations((current) => ({ ...current, [rowId]: invitations }))
      }
      setActionError(error instanceof Error ? error.message : 'Einladungslink konnte nicht erstellt werden.')
    }
  }

  async function handleCancelInvitation(rowId: number, memberId: number, invitationId: number) {
    if (!window.confirm('Aktive Einladung zurückziehen? Der bisherige Link kann danach nicht mehr verwendet werden.')) return
    try {
      setActionError(null)
      await cancelClaimInvitation(groupId, memberId, invitationId)
      setGeneratedInvites((current) => {
        const next = { ...current }
        delete next[rowId]
        return next
      })
      setMemberInvitations((current) => ({
        ...current,
        [rowId]: (current[rowId] ?? []).filter((invitation) => invitation.id !== invitationId),
      }))
      setActionError('Aktive Einladung zurückgezogen. Du kannst jetzt einen neuen Link generieren.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Einladung konnte nicht zurückgezogen werden.')
    }
  }

  function markVisibleInviteLink(rowId: number) {
    const field = document.getElementById(`claim-invite-link-${rowId}`) as HTMLInputElement | null
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
      setActionError(null)
      setCopyStates((current) => ({ ...current, [rowId]: 'copied' }))
      window.setTimeout(() => {
        setCopyStates((current) => {
          const next = { ...current }
          delete next[rowId]
          return next
        })
      }, 1500)
    } catch {
      if (markVisibleInviteLink(rowId)) {
        setActionError('Automatisches Kopieren wurde vom Browser blockiert. Der Link ist markiert; kopiere ihn mit Strg+C.')
        setCopyStates((current) => ({ ...current, [rowId]: 'selected' }))
        return
      }
      setActionError('Automatisches Kopieren wurde vom Browser blockiert. Öffne den Link direkt oder kopiere ihn aus dem Textfeld.')
    }
  }

  async function queueRoleAssignmentIfNeeded(claim: MemberClaimRow) {
    const member = members.find((item) => item.member_id === claim.member_id)
    if (!member || claim.app_user_id <= 0) return
    try {
      const roleResponse = await listMemberRoles(groupId, member.id)
      const endedRoles = roleResponse.data.filter((role) => !!role.ended_date)
      if (endedRoles.length === 0) return
      const assignment: ClaimRoleAssignment = {
        id: `${claim.id}:${claim.app_user_id}`,
        appUserId: claim.app_user_id,
        memberName: member.display_name || claim.member_nickname,
        endedRoleLabels: endedRoles.map((role) => role.role_label ?? role.role_code),
      }
      setRoleAssignments((current) => {
        if (current.some((item) => item.id === assignment.id)) return current
        return [...current, assignment]
      })
    } catch {
      setActionError('Claim bestätigt. Die Prüfung beendeter Rollen konnte nicht geladen werden.')
    }
  }

  async function handleVerifyClaim(claimId: number) {
    const claim = pendingClaims.find((item) => item.id === claimId)
    try {
      setActionError(null)
      await verifyMemberClaim(groupId, claimId)
      setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
      if (claim) {
        await queueRoleAssignmentIfNeeded(claim)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Claim konnte nicht bestätigt werden.')
    }
  }

  async function handleRejectClaim(claimId: number, memberNick: string) {
    if (!window.confirm(`Claim für "${memberNick}" ablehnen?`)) return
    try {
      setActionError(null)
      await rejectMemberClaim(groupId, claimId)
      setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Claim konnte nicht abgelehnt werden.')
    }
  }

  async function handleApproveRequest(requestId: number) {
    const nickname = (approveNicknames[requestId] || '').trim()
    if (!nickname) {
      setActionError('Nickname für den neuen Eintrag ist erforderlich.')
      return
    }
    if (!window.confirm(`Neuanlage-Antrag mit Nickname "${nickname}" bestätigen?`)) return
    try {
      setActionError(null)
      await approveMemberRequest(requestId, { nickname })
      setMemberRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuanlage-Antrag konnte nicht bestätigt werden.')
    }
  }

  async function handleRejectRequest(requestId: number) {
    if (!window.confirm('Neuanlage-Antrag ablehnen?')) return
    try {
      setActionError(null)
      await rejectMemberRequest(requestId)
      setMemberRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuanlage-Antrag konnte nicht abgelehnt werden.')
    }
  }

  return (
    <Card variant="section" className={styles.claimPanel}>
      <SectionHeader
        eyebrow="Claiming"
        title="Member-Claim-Einladungen"
        description="Generiere Einladungslinks für historische Mitglieder und teile sie direkt, zum Beispiel via Discord."
      />
      {actionError ? <p className={styles.inlineError}>{actionError}</p> : null}
      {isLoading ? <Badge variant="muted">Claim-Daten werden geladen</Badge> : null}
      {members.length === 0 ? (
        <EmptyState title="Keine historischen Mitglieder" description="Lege zuerst historische Mitglieder in der Gruppe an." />
      ) : (
        <div className={styles.stack}>
          {members.map((member) => {
            const invite = generatedInvites[member.id]
            const inviteLink = invite ? normalizeInviteLink(invite.invite_link) : ''
            const activeInvitation = (memberInvitations[member.id] ?? []).find((invitation) => invitation.status === 'pending')
            return (
              <Card key={member.id} variant="nested">
                <Toolbar
                  leading={<strong>{member.display_name}</strong>}
                  trailing={(
                    <Button variant="secondary" size="sm" leftIcon={<Link2 size={16} />} onClick={() => void handleGenerateInvitation(member.id, member.member_id)}>
                      Einladungslink generieren
                    </Button>
                  )}
                />
                {invite ? (
                  <div className={styles.inviteLinkRow}>
                    <Input id={`claim-invite-link-${member.id}`} type="text" aria-label={`Einladungslink für ${member.display_name}`} readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
                    <Button variant="secondary" size="sm" leftIcon={<Copy size={16} />} onClick={() => void handleCopyLink(member.id, inviteLink)}>
                      {copyStates[member.id] === 'copied' ? 'Kopiert!' : copyStates[member.id] === 'selected' ? 'Link markiert' : 'Link kopieren'}
                    </Button>
                    <Button href={inviteLink} variant="secondary" size="sm" leftIcon={<Link2 size={16} />}>
                      Öffnen
                    </Button>
                    <p>Teile diesen Link direkt mit dem Mitglied. Der Link läuft in 7 Tagen ab.</p>
                  </div>
                ) : null}
                {!invite && activeInvitation ? (
                  <div className={styles.pendingInviteRow}>
                    <Badge variant="muted">Aktive Einladung bis {formatDate(activeInvitation.expires_at)}</Badge>
                    <Button variant="danger" size="sm" leftIcon={<UserX size={16} />} onClick={() => void handleCancelInvitation(member.id, member.member_id, activeInvitation.id)}>
                      Aktive Einladung zurückziehen
                    </Button>
                    <p>Der ursprüngliche Link kann aus Sicherheitsgründen nicht erneut angezeigt werden. Ziehe ihn zurück und generiere bei Bedarf einen neuen Link.</p>
                  </div>
                ) : null}
                {/* D-16: Memorial-Setter nur für Global Admin — nicht für Gruppen-Capability (Fallstrick 4) */}
                <MemorialSetterAction
                  isGlobalAdmin={isGlobalAdmin}
                  memberId={member.member_id}
                  memberName={member.display_name}
                />
              </Card>
            )
          })}
        </div>
      )}

      <Toolbar
        leading={<SectionHeader title={`Offene Claims (${pendingClaims.length})`} description="Prüfe Self-Service-Claims und bestätige sie für diese Gruppe." />}
        trailing={(
          <Button
            variant={showOnlyOpen ? 'subtle' : 'ghost'}
            size="sm"
            onClick={() => setShowOnlyOpen((prev) => !prev)}
          >
            {showOnlyOpen ? 'Nur offene anzeigen' : 'Alle anzeigen'}
          </Button>
        )}
      />
      {pendingClaims.length === 0 ? (
        <EmptyState title="Keine offenen Claims" description="Alle Claims wurden bearbeitet." />
      ) : (
        <Table variant="withActions" containerClassName={styles.tableWrapHeaderLineWine}>
          <TableHead><TableRow><TableHeaderCell>App-User-ID</TableHeaderCell><TableHeaderCell>Nick</TableHeaderCell><TableHeaderCell>Notiz</TableHeaderCell><TableHeaderCell>Eingereicht</TableHeaderCell><TableHeaderCell>Aktionen</TableHeaderCell></TableRow></TableHead>
          <TableBody>{pendingClaims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell>{claim.app_user_id}</TableCell>
              <TableCell>{claim.member_nickname}</TableCell>
              <TableCell>{claim.note || '-'}</TableCell>
              <TableCell>{formatDate(claim.created_at)}</TableCell>
              <TableCell><div className={styles.rowActions}><Button size="sm" variant="success" leftIcon={<UserCheck size={16} />} onClick={() => void handleVerifyClaim(claim.id)}>Bestätigen</Button><Button size="sm" variant="danger" leftIcon={<UserX size={16} />} onClick={() => void handleRejectClaim(claim.id, claim.member_nickname)}>Ablehnen</Button></div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}

      <RoleAssignmentAfterClaim
        groupId={groupId}
        assignments={roleAssignments}
        roleOptions={activeRoleOptions}
        onAssigned={(assignmentId) => setRoleAssignments((current) => current.filter((item) => item.id !== assignmentId))}
      />

      <SectionHeader title={`Neuanlage-Anträge (${memberRequests.length})`} description="Mitglieder ohne passenden historischen Eintrag können eine Neuanlage beantragen." />
      {memberRequests.length === 0 ? (
        <EmptyState title="Keine offenen Neuanlage-Anträge" description="Keine offenen Neuanlage-Anträge." />
      ) : (
        <Table variant="withActions" containerClassName={styles.tableWrapHeaderLineWine}>
          <TableHead><TableRow><TableHeaderCell>App-User-ID</TableHeaderCell><TableHeaderCell>Notiz</TableHeaderCell><TableHeaderCell>Eingereicht</TableHeaderCell><TableHeaderCell>Nickname</TableHeaderCell><TableHeaderCell>Aktionen</TableHeaderCell></TableRow></TableHead>
          <TableBody>{memberRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.app_user_id}</TableCell>
              <TableCell>{request.note || '-'}</TableCell>
              <TableCell>{formatDate(request.created_at)}</TableCell>
              <TableCell><Input type="text" placeholder="Nickname eingeben..." value={approveNicknames[request.id] || ''} onChange={(event) => setApproveNicknames((current) => ({ ...current, [request.id]: event.target.value }))} /></TableCell>
              <TableCell><div className={styles.rowActions}><Button size="sm" variant="success" leftIcon={<FilePlus size={16} />} onClick={() => void handleApproveRequest(request.id)}>Anlegen</Button><Button size="sm" variant="danger" leftIcon={<UserX size={16} />} onClick={() => void handleRejectRequest(request.id)}>Ablehnen</Button></div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </Card>
  )
}
