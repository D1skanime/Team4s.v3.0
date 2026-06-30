'use client'

import Image from 'next/image'
import { Pencil } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type FansubAppMember,
  type FansubGroupInvitation,
  type FansubGroupMediaPermissions,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

const ROLE_LABELS = new Map<string, string>(FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.code, option.label]))

const MEDIA_PERMISSION_KEYS: Array<keyof FansubGroupMediaPermissions> = [
  'can_upload', 'can_delete_own', 'can_delete_all', 'can_reorder',
]

function formatRoleLabel(role: string): string {
  return ROLE_LABELS.get(role) || role
}

function formatMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
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

function formatMemberStatusLabel(status: FansubAppMember['status']): string {
  return status === 'active' ? 'Aktiv' : 'Deaktiviert'
}

function getMediaPermissionCount(member: FansubAppMember): number {
  const permissions = member.media_permissions ?? {}
  return MEDIA_PERMISSION_KEYS.filter((key) => permissions[key]).length
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'unbekannt'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'unbekannt'
  return parsed.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatInvitationStatusLabel(status: FansubGroupInvitation['status']): string {
  if (status === 'pending') return 'Offen'
  if (status === 'accepted') return 'Angenommen'
  if (status === 'cancelled') return 'Zurückgezogen'
  return 'Abgelaufen'
}

function invitationStatusVariant(status: FansubGroupInvitation['status']): 'info' | 'success' | 'muted' | 'warning' {
  if (status === 'pending') return 'info'
  if (status === 'accepted') return 'success'
  if (status === 'expired') return 'warning'
  return 'muted'
}

export type FansubAppMembersOverviewProps = {
  members: FansubAppMember[]
  invitations: FansubGroupInvitation[]
  canViewMembers: boolean
  canViewInvitations: boolean
  canManageMembers: boolean
  canCancelInvitation: boolean
  createdInviteLink: string | null
  busyKey: string | null
  onEditMember: (member: FansubAppMember) => void
  onCancelInvitation: (invitationId: number) => void
}

export function FansubAppMembersOverview({
  members,
  invitations,
  canViewMembers,
  canViewInvitations,
  canManageMembers,
  canCancelInvitation,
  createdInviteLink,
  busyKey,
  onEditMember,
  onCancelInvitation,
}: FansubAppMembersOverviewProps) {
  return (
    <>
      {canViewMembers ? (
        <>
          <SectionHeader
            title="Mitgliederübersicht"
            actions={
              <Badge variant="muted">
                {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
              </Badge>
            }
          />
          <div className={styles.fansubEditMembersCompactList} aria-label="Mitglieder dieser Fansubgruppe">
            {members.length === 0 ? (
              <div className={styles.fansubEditMemberCompactCard}>
                <strong>Noch keine Mitglieder in dieser Gruppe</strong>
                <p className={styles.fansubEditHint}>
                  Sobald jemand hinzugefügt wurde, erscheinen Rollen und Status hier in der Übersicht.
                </p>
              </div>
            ) : members.map((member) => {
              const fansubName = member.member?.fansub_name?.trim() || `Mitglied #${member.app_user_id}`
              const avatarUrl = member.member?.avatar_url?.trim()
              const mediaPermissionCount = getMediaPermissionCount(member)

              return (
                <div className={styles.fansubEditMemberCompactCard} key={member.id}>
                  <div className={styles.fansubEditMemberCompactHeader}>
                    <div className={styles.fansubEditMemberCompactIdentity}>
                      <div className={styles.fansubEditMembershipAvatar} aria-hidden="true">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt="" width={40} height={40} unoptimized />
                        ) : (
                          formatMemberInitials(fansubName)
                        )}
                      </div>
                      <div>
                        <strong>{fansubName}</strong>
                        <span className={styles.fansubEditMemberCompactMeta}>
                          <span
                            className={styleNames(
                              styles.fansubEditMemberStatusDot,
                              member.status === 'active' ? styles.fansubEditMemberStatusDotActive : styles.fansubEditMemberStatusDotInactive,
                            )}
                            aria-hidden="true"
                          />
                          {formatMemberStatusLabel(member.status)} / seit {formatDateTime(member.created_at)}
                        </span>
                      </div>
                    </div>
                    {canManageMembers ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`${fansubName} bearbeiten`}
                        title={`${fansubName} bearbeiten`}
                        className={styles.fansubEditMemberEditButton}
                        onClick={() => onEditMember(member)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                  <div className={styles.fansubEditMemberCompactBody}>
                    <div className={styles.chipRow}>
                      {member.roles.length > 0
                        ? member.roles.map((role) => (
                            <Badge
                              key={`${member.id}-${role}`}
                              variant="info"
                              className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role))}
                            >
                              {formatRoleLabel(role)}
                            </Badge>
                          ))
                        : <span className={styles.fansubEditHint}>Keine Rollen</span>
                      }
                    </div>
                    {mediaPermissionCount > 0 ? (
                      <Badge variant="muted" className={styles.fansubEditMemberExtraRightsChip}>
                        {mediaPermissionCount} Zusatzrecht{mediaPermissionCount === 1 ? '' : 'e'}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      <Card variant="nestedFlat" className={styles.fansubEditMembershipAssignCard}>
        <div>
          <p className={styles.fansubEditBasicEyebrow}>Einladungen</p>
          <h4 className={styles.fansubEditMembershipSubtitle}>Offene Gruppeneinladungen</h4>
          <p className={styles.fansubEditHint}>
            Lade neue Mitglieder per E-Mail ein. Der Einladungslink wird per E-Mail zugestellt.
          </p>
        </div>

        {!canViewInvitations ? (
          <p className={styles.fansubEditHint}>Dir fehlt die Berechtigung, offene Einladungen zu sehen.</p>
        ) : (
          <>
            {createdInviteLink ? (
              <div className={styles.successBox}>
                <span>Einladung per E-Mail gesendet.</span>
                <details>
                  <summary className={styles.fansubEditHint}>Einladungslink (Entwickler-Fallback)</summary>
                  <code>{createdInviteLink}</code>
                </details>
              </div>
            ) : null}

            <div className={styles.fansubEditTableSurface}>
              <Table
                variant="withActions"
                caption="Offene Einladungen"
                containerClassName={styles.fansubEditTableWrapWine}
              >
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Empfänger</TableHeaderCell>
                    <TableHeaderCell>Rollen nach Annahme</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Läuft ab</TableHeaderCell>
                    {canCancelInvitation ? <TableHeaderCell>Aktion</TableHeaderCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.length === 0
                    ? (
                      <TableEmptyState
                        colSpan={canCancelInvitation ? 5 : 4}
                        title="Keine offenen Einladungen"
                        description="Neue Einladungen erscheinen hier bis zur Annahme, zum Ablauf oder zur Rücknahme."
                      />
                    )
                    : invitations.map((invitation) => {
                        const invitedFansubName = invitation.member?.fansub_name?.trim()
                        const invitationBusy = busyKey === `invitation:${invitation.id}`
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell>
                              <strong>{invitedFansubName || invitation.email}</strong>
                              {invitedFansubName ? <><br /><span>{invitation.email}</span></> : null}
                            </TableCell>
                            <TableCell>
                              <div className={styles.chipRow}>
                                {invitation.invited_role_codes.map((role) => (
                                  <Badge
                                    key={`${invitation.id}-${role}`}
                                    variant="info"
                                    className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role))}
                                  >
                                    {formatRoleLabel(role)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={invitationStatusVariant(invitation.status)}>
                                {formatInvitationStatusLabel(invitation.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(invitation.expires_at)}</TableCell>
                            {canCancelInvitation ? (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={invitationBusy}
                                  onClick={() => onCancelInvitation(invitation.id)}
                                >
                                  {invitationBusy ? 'Bitte warten...' : 'Einladung zurückziehen'}
                                </Button>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        )
                      })
                  }
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
