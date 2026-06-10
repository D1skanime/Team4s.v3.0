'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, FilePlus, Link2, Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react'

import {
  Badge,
  Button,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  Toolbar,
  YearPicker,
} from '@/components/ui'
import {
  ApiError,
  approveMemberRequest,
  cancelClaimInvitation,
  createGroupMember,
  createMemberRole,
  deleteGroupMember,
  deleteMemberRole,
  generateClaimInvitation,
  listClaimInvitations,
  listGroupMembers,
  listMemberRequests,
  listMemberRoles,
  listPendingMemberClaims,
  rejectMemberClaim,
  rejectMemberRequest,
  updateGroupMember,
  updateMemberRole,
  verifyMemberClaim,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type CreateGroupMemberRequest,
  type CreateMemberRoleRequest,
  type HistFansubGroupMember,
  type HistGroupMemberRole,
  type HistoricalContributionVisibility,
} from '@/types/fansub'
import type {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberRequestRow,
} from '@/types/profile'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  embedded?: boolean
  canCancelClaimInvitation?: boolean
  canCreateClaimInvitation?: boolean
  canManageClaims?: boolean
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
  showClaimRequests?: boolean
  showHeaderActions?: boolean
}

export type GroupMembersTabActions = {
  canCreateRole: boolean
  openHistoricalMemberForm: () => void
  openHistoricalRoleForm: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_MIN = 1980

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_year ?? '?'
  const bis = member.left_year ?? 'aktiv'
  return `${von} – ${bis}`
}

function visibilityLabel(visibility: HistoricalContributionVisibility): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function roleLabelForCode(code: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code
}

type CopyState = 'copied' | 'selected'

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

type FormFields = {
  displayName: string
  joinedYear: string
  leftYear: string
  visibility: HistoricalContributionVisibility
}

type RoleFormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
}

const EMPTY_FORM: FormFields = {
  displayName: '',
  joinedYear: '',
  leftYear: '',
  visibility: 'internal',
}

const EMPTY_ROLE_FORM: RoleFormFields = {
  memberId: '',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
}

function memberToForm(m: HistFansubGroupMember): FormFields {
  return {
    displayName: m.display_name,
    joinedYear: m.joined_year != null ? String(m.joined_year) : '',
    leftYear: m.left_year != null ? String(m.left_year) : '',
    visibility: m.visibility ?? 'internal',
  }
}

function roleToForm(role: HistGroupMemberRole): RoleFormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedYear: role.started_year != null ? String(role.started_year) : '',
    endedYear: role.ended_year != null ? String(role.ended_year) : '',
    note: role.note ?? '',
  }
}

export function GroupMembersTab({
  embedded = false,
  canCancelClaimInvitation = true,
  canCreateClaimInvitation = true,
  canManageClaims = true,
  fansubId,
  onActionsChange,
  showClaimRequests = true,
  showHeaderActions = true,
}: GroupMembersTabProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
  const [pendingClaims, setPendingClaims] = useState<MemberClaimRow[]>([])
  const [memberRequests, setMemberRequests] = useState<MemberRequestRow[]>([])
  const [generatedInvites, setGeneratedInvites] = useState<Record<number, GenerateClaimInvitationResponse>>({})
  const [memberInvitations, setMemberInvitations] = useState<Record<number, MemberClaimInvitationResponse[]>>({})
  const [copyStates, setCopyStates] = useState<Record<number, CopyState>>({})
  const [approveNicknames, setApproveNicknames] = useState<Record<number, string>>({})
  const [claimActionError, setClaimActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistFansubGroupMember | null>(null)
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
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
          member_display_name:
            role.member_display_name || loadedMembers[index]?.display_name || '',
        })),
      )
      setMembers(loadedMembers)
      setMemberInvitations(Object.fromEntries(invitationEntries))
      setPendingClaims(loadedPendingClaims)
      setMemberRequests(loadedMemberRequests)
      setRoles(
        loadedRoles.sort((a, b) => {
          const startedDiff = (b.started_year ?? 0) - (a.started_year ?? 0)
          return startedDiff !== 0 ? startedDiff : a.id - b.id
        }),
      )
    } catch (err) {
      setError(formatApiError(err, 'Mitglieder und Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void load()
  }, [load])

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
    for (const claim of pendingClaims) {
      const list = grouped.get(claim.member_id) ?? []
      list.push(claim)
      grouped.set(claim.member_id, list)
    }
    return grouped
  }, [pendingClaims])

  const openNew = useCallback(() => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }, [])

  function openEdit(member: HistFansubGroupMember) {
    setEditTarget(member)
    setForm(memberToForm(member))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  async function handleSave() {
    if (!form.displayName.trim()) {
      setModalError('Anzeigename darf nicht leer sein.')
      return
    }

    const joinedYear = form.joinedYear ? Number(form.joinedYear) : null
    const leftYear = form.leftYear ? Number(form.leftYear) : null

    if (joinedYear !== null && leftYear !== null && leftYear < joinedYear) {
      setModalError('Austrittsjahr darf nicht vor dem Beitrittsjahr liegen.')
      return
    }

    try {
      setSaving(true)
      setModalError(null)

      if (editTarget) {
        await updateGroupMember(fansubId, editTarget.id, {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          status: editTarget.status,
          visibility: form.visibility,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          status: 'historical',
          visibility: form.visibility,
        }
        await createGroupMember(fansubId, body)
      }

      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Mitglied konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

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
    setRoleForm({
      ...EMPTY_ROLE_FORM,
      memberId: member ? String(member.id) : '',
    })
    setRoleModalError(null)
    setRoleModalOpen(true)
  }, [])

  function openEditRole(role: HistGroupMemberRole) {
    setRoleEditTarget(role)
    setRoleForm(roleToForm(role))
    setRoleModalError(null)
    setRoleModalOpen(true)
  }

  function closeRoleModal() {
    setRoleModalOpen(false)
    setRoleEditTarget(null)
    setRoleModalError(null)
  }

  function closeRoleDeleteModal() {
    setRoleDeleteTarget(null)
    setRoleDeleteError(null)
  }

  async function handleRoleSave() {
    if (!roleForm.memberId) {
      setRoleModalError('Bitte ein Mitglied auswählen.')
      return
    }
    if (!roleForm.roleCode.trim()) {
      setRoleModalError('Rollenbezeichnung darf nicht leer sein.')
      return
    }

    const startedYear = roleForm.startedYear ? Number(roleForm.startedYear) : null
    const endedYear = roleForm.endedYear ? Number(roleForm.endedYear) : null

    if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
      setRoleModalError('Rolle bis darf nicht vor Rolle von liegen.')
      return
    }

    try {
      setRoleSaving(true)
      setRoleModalError(null)

      if (roleEditTarget) {
        await updateMemberRole(fansubId, roleEditTarget.id, {
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: roleEditTarget.status,
          visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(roleForm.memberId),
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: 'historical',
          visibility: 'internal',
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
      openHistoricalMemberForm: openNew,
      openHistoricalRoleForm: () => openNewRole(),
    })
    return () => onActionsChange(null)
  }, [members.length, onActionsChange, openNew, openNewRole])

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

  async function handleGenerateInvitation(rowId: number, memberId: number) {
    try {
      setClaimActionError(null)
      const invite = await generateClaimInvitation(fansubId, memberId)
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
      setGeneratedInvites((current) => {
        const next = { ...current }
        delete next[rowId]
        return next
      })
      setMemberInvitations((current) => ({
        ...current,
        [rowId]: (current[rowId] ?? []).filter((invitation) => invitation.id !== invitationId),
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
        setCopyStates((current) => {
          const next = { ...current }
          delete next[rowId]
          return next
        })
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
      await load()
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

  async function handleApproveRequest(requestId: number) {
    const nickname = (approveNicknames[requestId] || '').trim()
    if (!nickname) {
      setClaimActionError('Nickname für den neuen Eintrag ist erforderlich.')
      return
    }
    if (!window.confirm(`Neuanlage-Antrag mit Nickname "${nickname}" bestätigen?`)) return
    try {
      setClaimActionError(null)
      await approveMemberRequest(requestId, { nickname })
      setMemberRequests((current) => current.filter((request) => request.id !== requestId))
      await load()
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

  return (
    <section className={embedded ? styles.fansubEditEmbeddedMembershipSurface : styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow="Historische Mitglieder"
        title="Historische Mitglieder"
        description="Öffentliche oder interne historische Fansub-Einträge. Die App-Profil-Verknüpfung entsteht nur durch bestätigte Claims."
        actions={
          showHeaderActions ? (
          <Toolbar
            leading={
              <>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={openNew}
                >
                  Mitglied hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => openNewRole()}
                  disabled={members.length === 0}
                >
                  Rolle hinzufügen
                </Button>
              </>
            }
          />
          ) : null
        }
      />

      {error ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void load()}>Erneut laden</Button>}
        />
      ) : null}
      {loading ? (
        <LoadingState
          title="Mitglieder werden geladen"
          description="Team4s lädt die historischen Gruppenmitglieder und Rollen."
        />
      ) : null}
      {claimActionError ? (
        <ErrorState
          title="Claim-Aktion"
          description={claimActionError}
        />
      ) : null}

      {!loading && !error ? (
        <div className={styles.fansubEditTableSurface}>
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
                const activeInvitation = (memberInvitations[member.id] ?? []).find((invitation) => invitation.status === 'pending')

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
                                  onClick={() => openEditRole(role)}
                                />
                                <Button
                                  variant="danger"
                                  size="sm"
                                  iconOnly
                                  aria-label="Rolle löschen"
                                  leftIcon={<Trash2 size={14} aria-hidden="true" />}
                                  onClick={() => setRoleDeleteTarget(role)}
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
                                      onClick={() => void handleVerifyClaim(claim.id)}
                                    >
                                      Bestätigen
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      leftIcon={<UserX size={14} aria-hidden="true" />}
                                      onClick={() => void handleRejectClaim(claim.id, claim.member_nickname)}
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
                                onClick={() => void handleCopyLink(member.id, inviteLink)}
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
                                onClick={() => void handleCancelInvitation(member.id, member.member_id, activeInvitation.id)}
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
                            leftIcon={<Link2 size={14} aria-hidden="true" />}
                            onClick={() => void handleGenerateInvitation(member.id, member.member_id)}
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
                          onClick={() => openEdit(member)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Plus size={14} aria-hidden="true" />}
                          onClick={() => openNewRole(member)}
                        >
                          Rolle
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          iconOnly
                          aria-label={`${member.display_name} löschen`}
                          leftIcon={<Trash2 size={14} aria-hidden="true" />}
                          onClick={() => setDeleteTarget(member)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {showClaimRequests && memberRequests.length > 0 ? (
            <>
              <SectionHeader
                eyebrow="Claims"
                title={`Neuanlage-Anträge (${memberRequests.length})`}
                description="Diese Anträge haben noch keinen passenden historischen Eintrag und bleiben deshalb unterhalb der Mitglieder-Tabelle."
              />
              <Table
                variant="withActions"
                caption="Neuanlage-Anträge ohne historischen Mitglieder-Anker"
                containerClassName={styles.fansubEditTableWrapWine}
              >
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>App-User-ID</TableHeaderCell>
                    <TableHeaderCell>Notiz</TableHeaderCell>
                    <TableHeaderCell>Eingereicht</TableHeaderCell>
                    <TableHeaderCell>Nickname</TableHeaderCell>
                    <TableHeaderCell>Aktionen</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.app_user_id}</TableCell>
                      <TableCell>{request.note || '-'}</TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Nickname eingeben..."
                          value={approveNicknames[request.id] || ''}
                          onChange={(event) => setApproveNicknames((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={styles.fansubEditTableRowActions}>
                          <Button
                            size="sm"
                            variant="success"
                            leftIcon={<FilePlus size={14} aria-hidden="true" />}
                            disabled={!canManageClaims}
                            onClick={() => void handleApproveRequest(request.id)}
                          >
                            Anlegen
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<UserX size={14} aria-hidden="true" />}
                            disabled={!canManageClaims}
                            onClick={() => void handleRejectRequest(request.id)}
                          >
                            Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}
        description="Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={!form.displayName.trim()}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? (
            <ErrorState
              title="Mitglied konnte nicht gespeichert werden"
              description={modalError}
            />
          ) : null}

          <FormField label="Anzeigename" htmlFor="hist-member-display-name" required>
            <Input
              id="hist-member-display-name"
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="z. B. Sora"
              required
            />
          </FormField>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField label="Beitrittsjahr" htmlFor="hist-member-joined-year" hint="Optionaler Startpunkt der Mitgliedschaft.">
              <YearPicker
                id="hist-member-joined-year"
                label="Beitrittsjahr"
                value={form.joinedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, joinedYear: value }))}
              />
            </FormField>

            <FormField label="Austrittsjahr" htmlFor="hist-member-left-year" hint="Leer lassen, wenn die Person weiterhin aktiv ist.">
              <YearPicker
                id="hist-member-left-year"
                label="Austrittsjahr"
                value={form.leftYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, leftYear: value }))}
              />
            </FormField>
          </div>

          <FormField label="Sichtbarkeit" htmlFor="hist-member-visibility">
            <Select
              id="hist-member-visibility"
              value={form.visibility}
              onChange={(e) => setForm((f) => ({
                ...f,
                visibility: e.target.value as HistoricalContributionVisibility,
              }))}
            >
              <option value="internal">intern</option>
              <option value="public">öffentlich</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={roleModalOpen}
        onClose={closeRoleModal}
        title={roleEditTarget ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
        description="Historische Gruppenrolle für ein Mitglied anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleModal} disabled={roleSaving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={roleSaving}
              onClick={() => void handleRoleSave()}
              disabled={!roleForm.memberId || !roleForm.roleCode.trim()}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleModalError ? (
            <ErrorState
              title="Rolle konnte nicht gespeichert werden"
              description={roleModalError}
            />
          ) : null}

          <FormField label="Mitglied" htmlFor="member-role-member" required disabled={!!roleEditTarget}>
            <Select
              id="member-role-member"
              value={roleForm.memberId}
              onChange={(e) => setRoleForm((f) => ({ ...f, memberId: e.target.value }))}
              aria-label="Mitglied auswählen"
              disabled={!!roleEditTarget}
            >
              <option value="">Mitglied wählen</option>
              {members.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.display_name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Rolle" htmlFor="member-role-role" required>
            <Select
              id="member-role-role"
              value={roleForm.roleCode}
              onChange={(e) => setRoleForm((f) => ({ ...f, roleCode: e.target.value }))}
              aria-label="Rolle auswählen"
            >
              <option value="">Rolle auswählen</option>
              {FANSUB_GROUP_ROLE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField label="Rolle von" htmlFor="member-role-started-year">
              <YearPicker
                id="member-role-started-year"
                label="Rolle von"
                value={roleForm.startedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setRoleForm((f) => ({ ...f, startedYear: year }))}
              />
            </FormField>
            <FormField label="Rolle bis" htmlFor="member-role-ended-year">
              <YearPicker
                id="member-role-ended-year"
                label="Rolle bis"
                value={roleForm.endedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setRoleForm((f) => ({ ...f, endedYear: year }))}
              />
            </FormField>
          </div>

          <FormField
            label="Notiz"
            htmlFor="member-role-note"
            hint="Optionaler Kontext für spätere Prüfung oder Einordnung."
          >
            <Textarea
              id="member-role-note"
              value={roleForm.note}
              onChange={(e) => setRoleForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ergänzende Anmerkung"
              aria-label="Notiz"
              rows={3}
            />
          </FormField>

        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Mitglied löschen"
        description="Dieses historische Mitglied wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => void handleDeleteConfirm()}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        {deleteError ? (
          <ErrorState title="Mitglied konnte nicht gelöscht werden" description={deleteError} />
        ) : null}
        {deleteTarget ? (
          <p className={styles.fansubEditMembershipDeleteText}>
            <strong>{deleteTarget.display_name}</strong> aus der historischen Mitgliederliste entfernen.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={roleDeleteTarget !== null}
        onClose={closeRoleDeleteModal}
        title="Rolleneintrag löschen"
        description="Diese Änderung entfernt den historischen Rolleneintrag aus der Gruppenhistorie."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleDeleteModal} disabled={roleDeleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={roleDeleting}
              onClick={() => void handleRoleDeleteConfirm()}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleDeleteError ? (
            <ErrorState title="Rolle konnte nicht gelöscht werden" description={roleDeleteError} />
          ) : null}
          {roleDeleteTarget ? (
            <p className={styles.fansubEditMembershipDeleteText}>
              Rolle <strong>{roleDeleteTarget.role_label ?? roleLabelForCode(roleDeleteTarget.role_code)}</strong> von {roleDeleteTarget.member_display_name} entfernen.
            </p>
          ) : null}
        </div>
      </Modal>
    </section>
  )
}
