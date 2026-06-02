'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, FilePlus, Link2, UserCheck, UserX } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from '@/components/ui'
import {
  approveMemberRequest,
  generateClaimInvitation,
  listGroupMembers,
  listMemberRequests,
  listPendingMemberClaims,
  rejectMemberClaim,
  rejectMemberRequest,
  verifyMemberClaim,
} from '@/lib/api'
import type { HistFansubGroupMember } from '@/types/fansub'
import type { GenerateClaimInvitationResponse, MemberClaimRow, MemberRequestRow } from '@/types/profile'

import styles from '../page.module.css'

type ClaimManagementPanelProps = {
  groupId: number
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('de-DE')
}

export function ClaimManagementPanel({ groupId }: ClaimManagementPanelProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [pendingClaims, setPendingClaims] = useState<MemberClaimRow[]>([])
  const [memberRequests, setMemberRequests] = useState<MemberRequestRow[]>([])
  const [generatedInvites, setGeneratedInvites] = useState<Record<number, GenerateClaimInvitationResponse>>({})
  const [copyStates, setCopyStates] = useState<Record<number, boolean>>({})
  const [approveNicknames, setApproveNicknames] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
      setMembers(memberRes.data ?? [])
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

  async function handleGenerateInvitation(memberId: number) {
    try {
      setActionError(null)
      const invite = await generateClaimInvitation(groupId, memberId)
      setGeneratedInvites((current) => ({ ...current, [memberId]: invite }))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Einladungslink konnte nicht erstellt werden.')
    }
  }

  async function handleCopyLink(memberId: number, link: string) {
    await navigator.clipboard.writeText(link)
    setCopyStates((current) => ({ ...current, [memberId]: true }))
    window.setTimeout(() => {
      setCopyStates((current) => ({ ...current, [memberId]: false }))
    }, 1500)
  }

  async function handleVerifyClaim(claimId: number) {
    try {
      setActionError(null)
      await verifyMemberClaim(groupId, claimId)
      setPendingClaims((current) => current.filter((claim) => claim.id !== claimId))
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
    <Card variant="section">
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
            return (
              <Card key={member.id} variant="nested">
                <Toolbar
                  leading={<strong>{member.display_name}</strong>}
                  trailing={(
                    <Button variant="secondary" size="sm" leftIcon={<Link2 size={16} />} onClick={() => void handleGenerateInvitation(member.id)}>
                      Einladungslink generieren
                    </Button>
                  )}
                />
                {invite ? (
                  <div className={styles.inviteLinkRow}>
                    <input type="text" readOnly value={invite.invite_link} />
                    <Button variant="secondary" size="sm" leftIcon={<Copy size={16} />} onClick={() => void handleCopyLink(member.id, invite.invite_link)}>
                      {copyStates[member.id] ? 'Kopiert!' : 'Link kopieren'}
                    </Button>
                    <p>Teile diesen Link direkt mit dem Mitglied. Der Link läuft in 7 Tagen ab.</p>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      <SectionHeader title={`Offene Claims (${pendingClaims.length})`} description="Prüfe Self-Service-Claims und bestätige sie für diese Gruppe." />
      {pendingClaims.length === 0 ? (
        <EmptyState title="Keine offenen Claims" description="Keine offenen Claims." />
      ) : (
        <Table variant="withActions" containerClassName={styles.tableWrapHeaderLineWine}>
          <TableHead><TableRow><TableHeaderCell>App-User-ID</TableHeaderCell><TableHeaderCell>Nick</TableHeaderCell><TableHeaderCell>Notiz</TableHeaderCell><TableHeaderCell>Eingereicht</TableHeaderCell><TableHeaderCell>Aktionen</TableHeaderCell></TableRow></TableHead>
          <TableBody>{pendingClaims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell>{claim.app_user_id}</TableCell>
              <TableCell>{claim.member_nickname}</TableCell>
              <TableCell>{claim.note || '—'}</TableCell>
              <TableCell>{formatDate(claim.created_at)}</TableCell>
              <TableCell><div className={styles.rowActions}><Button size="sm" variant="success" leftIcon={<UserCheck size={16} />} onClick={() => void handleVerifyClaim(claim.id)}>Bestätigen</Button><Button size="sm" variant="danger" leftIcon={<UserX size={16} />} onClick={() => void handleRejectClaim(claim.id, claim.member_nickname)}>Ablehnen</Button></div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}

      <SectionHeader title={`Neuanlage-Anträge (${memberRequests.length})`} description="Mitglieder ohne passenden historischen Eintrag können eine Neuanlage beantragen." />
      {memberRequests.length === 0 ? (
        <EmptyState title="Keine offenen Neuanlage-Anträge" description="Keine offenen Neuanlage-Anträge." />
      ) : (
        <Table variant="withActions" containerClassName={styles.tableWrapHeaderLineWine}>
          <TableHead><TableRow><TableHeaderCell>App-User-ID</TableHeaderCell><TableHeaderCell>Notiz</TableHeaderCell><TableHeaderCell>Eingereicht</TableHeaderCell><TableHeaderCell>Nickname</TableHeaderCell><TableHeaderCell>Aktionen</TableHeaderCell></TableRow></TableHead>
          <TableBody>{memberRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.app_user_id}</TableCell>
              <TableCell>{request.note || '—'}</TableCell>
              <TableCell>{formatDate(request.created_at)}</TableCell>
              <TableCell><input type="text" placeholder="Nickname eingeben..." value={approveNicknames[request.id] || ''} onChange={(event) => setApproveNicknames((current) => ({ ...current, [request.id]: event.target.value }))} /></TableCell>
              <TableCell><div className={styles.rowActions}><Button size="sm" variant="success" leftIcon={<FilePlus size={16} />} onClick={() => void handleApproveRequest(request.id)}>Anlegen</Button><Button size="sm" variant="danger" leftIcon={<UserX size={16} />} onClick={() => void handleRejectRequest(request.id)}>Ablehnen</Button></div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </Card>
  )
}
