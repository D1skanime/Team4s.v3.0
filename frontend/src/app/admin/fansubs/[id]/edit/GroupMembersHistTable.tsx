'use client'

import { Pencil, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
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

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE')
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_date ? formatDate(role.started_date) : '?'
  const bis = role.ended_date ? formatDate(role.ended_date) : 'heute'
  return `${von} - ${bis}`
}

function formatRoleDuration(role: HistGroupMemberRole): string {
  if (!role.started_date || !role.ended_date || role.ended_date < role.started_date) return 'Dauer unbekannt'
  const started = new Date(role.started_date)
  const ended = new Date(role.ended_date)
  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) return 'Dauer unbekannt'
  const years = ended.getFullYear() - started.getFullYear() + 1
  return `${years} Jahr${years === 1 ? '' : 'e'}`
}

function formatMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HM'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function historicalMemberMeta(member: HistFansubGroupMember): string {
  if (member.app_username) return `Verknüpft mit ${member.app_username}`
  return 'Historisch dokumentiert'
}

function getRoleClassName(role: string): string {
  const roleClassMap: Record<string, string> = {
    fansub_lead: styles.fansubEditRoleLead,
    project_lead: styles.fansubEditRoleProjectLead,
    editor: styles.fansubEditRoleEditor,
    translator: styles.fansubEditRoleTranslator,
    timer: styles.fansubEditRoleTimer,
    typesetter: styles.fansubEditRoleTypesetter,
    quality_checker: styles.fansubEditRoleQuality,
    encoder: styles.fansubEditRoleEncoder,
  }
  return roleClassMap[role] ?? styles.fansubEditRoleDefault
}

function styleNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ')
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
  canManageHistoricalMembers: boolean
  canManageHistoricalRoles: boolean
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
  } = props
  const visibleMembers = members
    .map((member) => {
      const allRoles = rolesByMember.get(member.id) ?? []
      const visibleRoles = member.active_app_member_id ? allRoles.filter((role) => Boolean(role.ended_date)) : allRoles
      return { member, visibleRoles }
    })
    .filter(({ visibleRoles }) => visibleRoles.length > 0)

  return (
    <div className={styles.fansubEditMembersCompactList} aria-label="Historische Mitglieder">
      {visibleMembers.length === 0 ? (
        <div className={styles.fansubEditMemberCompactCard}>
          <strong>Noch keine historischen Mitglieder</strong>
          <p className={styles.fansubEditHint}>
            Lege historische Einträge über Mitglied hinzufügen an.
          </p>
        </div>
      ) : visibleMembers.map(({ member, visibleRoles }) => {
        return (
          <HistoricalMemberCard
            key={`historical-member-${member.id}`}
            {...props}
            member={member}
            memberRoles={visibleRoles}
          />
        )
      })}
    </div>
  )
}

type HistoricalMemberCardProps = GroupMembersHistTableProps & {
  member: HistFansubGroupMember
  memberRoles: HistGroupMemberRole[]
}

function HistoricalMemberCard({
  member,
  memberRoles,
  canManageHistoricalMembers,
  roleLabelForCode,
  onEditMember,
  onDeleteMember,
}: HistoricalMemberCardProps) {
  return (
    <article className={styles.fansubEditMemberCompactCard}>
      <div className={styles.fansubEditMemberCompactHeader}>
        <div className={styles.fansubEditMemberCompactIdentity}>
          <div className={styles.fansubEditMembershipAvatar} aria-hidden="true">
            {formatMemberInitials(member.display_name)}
          </div>
          <div>
            <strong>{member.display_name}</strong>
            <span className={styles.fansubEditMemberCompactMeta}>
              <span
                className={styleNames(
                  styles.fansubEditMemberStatusDot,
                  member.app_username ? styles.fansubEditMemberStatusDotActive : styles.fansubEditMemberStatusDotInactive,
                )}
                aria-hidden="true"
              />
              {historicalMemberMeta(member)}
            </span>
          </div>
        </div>
        {canManageHistoricalMembers ? (
          <div className={styles.fansubEditHistoricalMemberHeaderActions}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${member.display_name} historisch bearbeiten`}
              title={`${member.display_name} historisch bearbeiten`}
              className={styles.fansubEditMemberEditButton}
              onClick={() => onEditMember(member)}
            >
              <Pencil size={16} aria-hidden="true" />
              <span>Bearbeiten</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`${member.display_name} löschen`}
              title={`${member.display_name} löschen`}
              onClick={() => onDeleteMember(member)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.fansubEditMemberCompactBody}>
        <div className={styles.chipRow}>
          {memberRoles.length > 0 ? (
            memberRoles.map((role) => (
              <Badge
                key={`historical-role-${role.id}`}
                variant="info"
                className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role.role_code), styles.fansubEditHistoricalRoleBadge)}
                title={`${formatRoleZeitraum(role)} · ${formatRoleDuration(role)}`}
              >
                <span>{role.role_label ?? roleLabelForCode(role.role_code)}</span>
                <small>{formatRoleZeitraum(role)}</small>
              </Badge>
            ))
          ) : (
            <span className={styles.fansubEditHint}>Keine historischen Rollen</span>
          )}
        </div>
      </div>
    </article>
  )
}
