'use client'

import { Copy, Link2, Pencil, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react'

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type {
  HistFansubGroupMember,
  HistGroupMemberRole,
} from '@/types/fansub'
import type {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
} from '@/types/profile'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type CopyState = 'copied' | 'selected'

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_year ?? '?'
  const bis = member.left_year ?? 'aktiv'
  return `${von} – ${bis}`
}

function visibilityLabel(visibility: string): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE')
}

function claimVariant(member: HistFansubGroupMember, claims: MemberClaimRow[]): 'success' | 'warning' | 'muted' {
  if (member.app_username) return 'success'
  if (claims.length > 0) return 'warning'
  return 'muted'
}

function claimLabel(member: HistFansubGroupMember, claims: MemberClaimRow[]): string {
  if (member.app_username) return 'Bestätigt/verknüpft'
  if (claims.length > 0) return 'Offener Claim'
  return 'Nicht beansprucht'
}

export type GroupMembersHistTableProps = {
  members: HistFansubGroupMember[]
  rolesByMember: Map<number, HistGroupMemberRole[]>
  pendingClaimsByMember: Map<number, MemberClaimRow[]>
  generatedInvites: Record<number, GenerateClaimInvitationResponse>
  memberInvitations: Record<number, MemberClaimInvitationResponse[]>
  copyStates: Record<number, CopyState>
  canManageClaims: boolean
  canCancelClaimInvitation: boolean
  canCreateClaimInvitation: boolean
  roleLabelForCode: (code: string) => string
  normalizeInviteLink: (rawLink: string) => string
  onEditMember: (member: HistFansubGroupMember) => void
  onDeleteMember: (member: HistFansubGroupMember) => void
  onEditRole: (role: HistGroupMemberRole) => void
  onDeleteRole: (role: HistGroupMemberRole) => void
  onAddRole: (member: HistFansubGroupMember) => void
  onVerifyClaim: (claimId: number) => void
  onRejectClaim: (claimId: number, memberNick: string) => void
  onGenerateInvitation: (rowId: number, memberId: number) => void
  onCancelInvitation: (rowId: number, memberId: number, invitationId: number) => void
  onCopyLink: (rowId: number, link: string) => void
}

export function GroupMembersHistTable({
  members,
  rolesByMember,
  pendingClaimsByMember,
  generatedInvites,
  memberInvitations,
  copyStates,
  canManageClaims,
  canCancelClaimInvitation,
  canCreateClaimInvitation,
  roleLabelForCode,
  normalizeInviteLink,
  onEditMember,
  onDeleteMember,
  onEditRole,
  onDeleteRole,
  onAddRole,
  onVerifyClaim,
  onRejectClaim,
  onGenerateInvitation,
  onCancelInvitation,
  onCopyLink,
}: GroupMembersHistTableProps) {
  return (
    <Table
      variant="withActions"
      caption="Historische Mitglieder dieser Fansubgruppe"
      containerClassName={styles.fansubEditTableWrapWine}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Aufgaben/Rollen</TableHeaderCell>
          <TableHeaderCell>Claim</TableHeaderCell>
          <TableHeaderCell>Aktionen</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {members.length === 0 ? (
          <TableEmptyState
            colSpan={4}
            title="Noch keine historischen Mitglieder"
            description="Lege historische Einträge über Mitglied hinzufügen an."
          />
        ) : members.map((member) => {
          const memberRoles = rolesByMember.get(member.id) ?? []
          const memberClaims = pendingClaimsByMember.get(member.member_id) ?? []
          const invite = generatedInvites[member.id]
          const inviteLink = invite ? normalizeInviteLink(invite.invite_link) : ''
          const activeInvitation = (memberInvitations[member.id] ?? []).find((inv) => inv.status === 'pending')

          return (
            <TableRow key={member.id}>
              <TableCell>
                <strong>{member.display_name}</strong>
                <br />
                <span className={styles.fansubEditHint}>{formatZeitraum(member)}</span>
                <br />
                <span className={styles.fansubEditHint}>{visibilityLabel(member.visibility ?? 'internal')}</span>
              </TableCell>
              <TableCell>
                {memberRoles.length > 0 ? (
                  <div className={styles.fansubEditMembershipRoleList}>
                    {memberRoles.map((role) => (
                      <div key={role.id} className={styles.fansubEditMembershipRoleItem}>
                        <div className={styles.fansubEditMembershipRoleItemMain}>
                          <strong>{role.role_label ?? roleLabelForCode(role.role_code)}</strong>
                          <span>{formatRoleZeitraum(role)}</span>
                          {role.note ? <span>{role.note}</span> : null}
                        </div>
                        <div className={styles.fansubEditMembershipRoleControls}>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label="Rolle bearbeiten"
                            leftIcon={<Pencil size={14} aria-hidden="true" />}
                            onClick={() => onEditRole(role)}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            iconOnly
                            aria-label="Rolle löschen"
                            leftIcon={<Trash2 size={14} aria-hidden="true" />}
                            onClick={() => onDeleteRole(role)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={styles.fansubEditHint}>Keine historischen Rollen</span>
                )}
              </TableCell>
              <TableCell>
                <div className={styles.fansubEditClaimCell}>
                  <Badge variant={claimVariant(member, memberClaims)}>{claimLabel(member, memberClaims)}</Badge>
                  {member.app_username ? (
                    <>
                      <br />
                      <span className={styles.fansubEditHint}>{member.app_username}</span>
                    </>
                  ) : null}
                  {!member.app_username && memberClaims.length > 0 ? (
                    <div className={styles.fansubEditClaimList}>
                      {memberClaims.map((claim) => (
                        <div key={claim.id} className={styles.fansubEditClaimItem}>
                          <span className={styles.fansubEditHint}>App-User-ID {claim.app_user_id} · {formatDate(claim.created_at)}</span>
                          {claim.note ? <span>{claim.note}</span> : null}
                          {canManageClaims ? (
                            <div className={styles.fansubEditClaimActions}>
                              <Button
                                size="sm"
                                variant="success"
                                leftIcon={<UserCheck size={14} aria-hidden="true" />}
                                onClick={() => onVerifyClaim(claim.id)}
                              >
                                Bestätigen
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                leftIcon={<UserX size={14} aria-hidden="true" />}
                                onClick={() => onRejectClaim(claim.id, claim.member_nickname)}
                              >
                                Ablehnen
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!member.app_username && memberClaims.length === 0 && invite ? (
                    <div className={styles.fansubEditClaimInvite}>
                      <Input
                        id={`hist-claim-invite-link-${member.id}`}
                        type="text"
                        aria-label={`Einladungslink für ${member.display_name}`}
                        readOnly
                        value={inviteLink}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <div className={styles.fansubEditClaimActions}>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Copy size={14} aria-hidden="true" />}
                          onClick={() => onCopyLink(member.id, inviteLink)}
                        >
                          {copyStates[member.id] === 'copied' ? 'Kopiert!' : copyStates[member.id] === 'selected' ? 'Link markiert' : 'Kopieren'}
                        </Button>
                        <Button
                          href={inviteLink}
                          size="sm"
                          variant="secondary"
                          leftIcon={<Link2 size={14} aria-hidden="true" />}
                        >
                          Öffnen
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {!member.app_username && memberClaims.length === 0 && !invite && activeInvitation ? (
                    <div className={styles.fansubEditClaimInvite}>
                      <Badge variant="muted">Einladung aktiv bis {formatDate(activeInvitation.expires_at)}</Badge>
                      {canCancelClaimInvitation ? (
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<UserX size={14} aria-hidden="true" />}
                          onClick={() => onCancelInvitation(member.id, member.member_id, activeInvitation.id)}
                        >
                          Zurückziehen
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {!member.app_username && memberClaims.length === 0 && !invite && !activeInvitation && canCreateClaimInvitation ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<UserPlus size={14} aria-hidden="true" />}
                      onClick={() => onGenerateInvitation(member.id, member.member_id)}
                    >
                      Claim-Link
                    </Button>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className={styles.fansubEditTableRowActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => onEditMember(member)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => onAddRole(member)}
                  >
                    Rolle
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    aria-label={`${member.display_name} löschen`}
                    leftIcon={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => onDeleteMember(member)}
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
