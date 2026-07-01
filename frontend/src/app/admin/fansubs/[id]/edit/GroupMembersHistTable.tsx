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
import { useFansubEditMediaQuery } from './hooks/useFansubEditViewport'

const styles = { ...sharedStyles, ...fansubEditStyles }

type CopyState = 'copied' | 'selected'

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_date ? formatDate(member.joined_date) : '?'
  const bis = member.left_date ? formatDate(member.left_date) : 'aktiv'
  return `${von} – ${bis}`
}

function visibilityLabel(visibility: string): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_date ? formatDate(role.started_date) : '?'
  const bis = role.ended_date ? formatDate(role.ended_date) : 'heute'
  return `${von} – ${bis}`
}

function formatRoleDuration(role: HistGroupMemberRole): string {
  if (!role.started_date || !role.ended_date || role.ended_date < role.started_date) return 'Dauer unbekannt'
  const started = new Date(role.started_date)
  const ended = new Date(role.ended_date)
  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) return 'Dauer unbekannt'
  const years = ended.getFullYear() - started.getFullYear() + 1
  return `${years} Jahr${years === 1 ? '' : 'e'}`
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

export function GroupMembersHistTable(props: GroupMembersHistTableProps) {
  const {
    members,
    rolesByMember,
    pendingClaimsByMember,
    generatedInvites,
    memberInvitations,
    canCreateClaimInvitation,
  } = props
  const useMobileCards = useFansubEditMediaQuery('(max-width: 767px)')

  return (
    <>
      <div className={styles.fansubEditMembersDesktopTable}>
        <DesktopHistoricalMembersTable {...props} />
      </div>
      {useMobileCards && members.length > 0 ? (
        <div className={styles.fansubEditMembersMobileList} aria-label="Historische Mitglieder">
          {members.map((member) => {
            const memberRoles = rolesByMember.get(member.id) ?? []
            const memberClaims = pendingClaimsByMember.get(member.member_id) ?? []
            const invite = generatedInvites[member.id]
            const activeInvitation = (memberInvitations[member.id] ?? []).find((inv) => inv.status === 'pending')
            const canGenerateClaimLink = !member.app_username && memberClaims.length === 0 && !invite && !activeInvitation && canCreateClaimInvitation

            return (
              <HistoricalMemberMobileCard
                key={`mobile-member-${member.id}`}
                {...props}
                member={member}
                memberRoles={memberRoles}
                memberClaims={memberClaims}
                canGenerateClaimLink={canGenerateClaimLink}
                activeInvitation={activeInvitation}
              />
            )
          })}
        </div>
      ) : null}
    </>
  )
}

function DesktopHistoricalMembersTable({
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
                      <RoleItem
                        key={role.id}
                        role={role}
                        roleLabelForCode={roleLabelForCode}
                        onEditRole={onEditRole}
                        onDeleteRole={onDeleteRole}
                      />
                    ))}
                  </div>
                ) : (
                  <span className={styles.fansubEditHint}>Keine historischen Rollen</span>
                )}
              </TableCell>
              <TableCell>
                <ClaimStatusBlock
                  member={member}
                  memberClaims={memberClaims}
                  inviteLink={inviteLink}
                  activeInvitation={activeInvitation}
                  copyStates={copyStates}
                  canManageClaims={canManageClaims}
                  canCancelClaimInvitation={canCancelClaimInvitation}
                  canCreateClaimInvitation={canCreateClaimInvitation}
                  onVerifyClaim={onVerifyClaim}
                  onRejectClaim={onRejectClaim}
                  onCancelInvitation={onCancelInvitation}
                  onGenerateInvitation={onGenerateInvitation}
                  onCopyLink={onCopyLink}
                  showCreateClaimAction
                />
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

type HistoricalMemberMobileCardProps = GroupMembersHistTableProps & {
  member: HistFansubGroupMember
  memberRoles: HistGroupMemberRole[]
  memberClaims: MemberClaimRow[]
  canGenerateClaimLink: boolean
  activeInvitation?: MemberClaimInvitationResponse
}

function HistoricalMemberMobileCard({
  member,
  memberRoles,
  memberClaims,
  generatedInvites,
  copyStates,
  canManageClaims,
  canCancelClaimInvitation,
  canCreateClaimInvitation,
  canGenerateClaimLink,
  activeInvitation,
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
}: HistoricalMemberMobileCardProps) {
  const invite = generatedInvites[member.id]
  const inviteLink = invite ? normalizeInviteLink(invite.invite_link) : ''

  return (
    <article className={styles.fansubEditMemberMobileCard}>
      <div className={styles.fansubEditMemberMobileHeader}>
        <div>
          <strong>{member.display_name}</strong>
          <span>{formatZeitraum(member)}</span>
        </div>
        <Badge variant="muted">{visibilityLabel(member.visibility ?? 'internal')}</Badge>
      </div>
      <div className={styles.fansubEditMemberMobileBlock}>
        <span>Aufgaben/Rollen</span>
        {memberRoles.length > 0 ? (
          <div className={styles.fansubEditMembershipRoleList}>
            {memberRoles.map((role) => (
              <RoleItem
                key={`mobile-role-${role.id}`}
                role={role}
                roleLabelForCode={roleLabelForCode}
                onEditRole={onEditRole}
                onDeleteRole={onDeleteRole}
                showDuration
              />
            ))}
          </div>
        ) : (
          <span className={styles.fansubEditHint}>Keine historischen Rollen</span>
        )}
      </div>
      <ClaimStatusBlock
        member={member}
        memberClaims={memberClaims}
        inviteLink={inviteLink}
        activeInvitation={activeInvitation}
        copyStates={copyStates}
        canManageClaims={canManageClaims}
        canCancelClaimInvitation={canCancelClaimInvitation}
        canCreateClaimInvitation={canCreateClaimInvitation}
        onVerifyClaim={onVerifyClaim}
        onRejectClaim={onRejectClaim}
        onCancelInvitation={onCancelInvitation}
        onGenerateInvitation={onGenerateInvitation}
        onCopyLink={onCopyLink}
      />
      <div className={styles.fansubEditMemberMobileActions}>
        {canCreateClaimInvitation ? (
          <Button
            variant="primary"
            disabled={!canGenerateClaimLink}
            leftIcon={<UserPlus size={14} aria-hidden="true" />}
            onClick={() => onGenerateInvitation(member.id, member.member_id)}
          >
            Claim-Link
          </Button>
        ) : null}
        <Button
          variant="ghost"
          leftIcon={<Pencil size={14} aria-hidden="true" />}
          onClick={() => onEditMember(member)}
        >
          Bearbeiten
        </Button>
        <Button
          variant="ghost"
          leftIcon={<Pencil size={14} aria-hidden="true" />}
          onClick={() => onAddRole(member)}
        >
          Rolle
        </Button>
        <Button
          variant="danger"
          leftIcon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => onDeleteMember(member)}
        >
          Löschen
        </Button>
      </div>
    </article>
  )
}

type RoleItemProps = {
  role: HistGroupMemberRole
  roleLabelForCode: (code: string) => string
  onEditRole: (role: HistGroupMemberRole) => void
  onDeleteRole: (role: HistGroupMemberRole) => void
  showDuration?: boolean
}

function RoleItem({ role, roleLabelForCode, onEditRole, onDeleteRole, showDuration = false }: RoleItemProps) {
  return (
    <div className={styles.fansubEditMembershipRoleItem}>
      <div className={styles.fansubEditMembershipRoleItemMain}>
        <strong>{role.role_label ?? roleLabelForCode(role.role_code)}</strong>
        <span>{formatRoleZeitraum(role)}{showDuration ? ` · ${formatRoleDuration(role)}` : ''}</span>
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
  )
}

type ClaimStatusBlockProps = {
  member: HistFansubGroupMember
  memberClaims: MemberClaimRow[]
  inviteLink: string
  activeInvitation?: MemberClaimInvitationResponse
  copyStates: Record<number, CopyState>
  canManageClaims: boolean
  canCancelClaimInvitation: boolean
  canCreateClaimInvitation: boolean
  onVerifyClaim: (claimId: number) => void
  onRejectClaim: (claimId: number, memberNick: string) => void
  onGenerateInvitation: (rowId: number, memberId: number) => void
  onCancelInvitation: (rowId: number, memberId: number, invitationId: number) => void
  onCopyLink: (rowId: number, link: string) => void
  showCreateClaimAction?: boolean
}

function ClaimStatusBlock({
  member,
  memberClaims,
  inviteLink,
  activeInvitation,
  copyStates,
  canManageClaims,
  canCancelClaimInvitation,
  canCreateClaimInvitation,
  onVerifyClaim,
  onRejectClaim,
  onGenerateInvitation,
  onCancelInvitation,
  onCopyLink,
  showCreateClaimAction = false,
}: ClaimStatusBlockProps) {
  return (
    <div className={styles.fansubEditClaimCell}>
      <Badge variant={claimVariant(member, memberClaims)}>{claimLabel(member, memberClaims)}</Badge>
      {member.app_username ? <span className={styles.fansubEditHint}>{member.app_username}</span> : null}
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
      {!member.app_username && memberClaims.length === 0 && inviteLink ? (
        <div className={styles.fansubEditClaimInvite}>
          <Input
            id={`hist-claim-invite-link-${showCreateClaimAction ? 'desktop' : 'mobile'}-${member.id}`}
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
      {!member.app_username && memberClaims.length === 0 && !inviteLink && activeInvitation ? (
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
      {!member.app_username && memberClaims.length === 0 && !inviteLink && !activeInvitation && canCreateClaimInvitation && showCreateClaimAction ? (
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
  )
}
