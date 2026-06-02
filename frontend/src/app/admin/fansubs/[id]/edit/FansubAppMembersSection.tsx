'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Clock, Pencil, UserPlus } from 'lucide-react'

import { Badge, Button, Card, Modal } from '@/components/ui'
import {
  ApiError,
  cancelFansubGroupInvitation,
  createFansubGroupInvitation,
  createFansubAppMember,
  getFansubGroupCapabilities,
  listFansubGroupInvitations,
  listFansubAppMembers,
  searchFansubAppMemberCandidates,
  updateFansubAppMemberRole,
  updateFansubAppMemberStatus,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type FansubAppMember,
  type FansubGroupCapabilities,
  type FansubGroupInvitation,
  type FansubGroupMemberCandidate,
  type FansubGroupRoleCode,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type FansubAppMembersSectionProps = {
  hasAccessToken?: boolean
  fansubId: number
  [legacyProp: string]: unknown
}

const ROLE_LABELS = new Map<string, string>(FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.code, option.label]))

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Deine Admin-Sitzung ist abgelaufen. Bitte melde dich erneut an.'
    }
    if (error.status === 403) {
      return 'Dir fehlt die Berechtigung für diese Mitgliederaktion.'
    }
    if (error.status === 502) {
      return 'Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen.'
    }
    if (error.status === 409) {
      return error.message
    }
    return error.message
  }
  return fallback
}

function formatRoleLabel(role: string): string {
  return ROLE_LABELS.get(role) || role
}

function formatMemberInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function getRoleClassName(role: string): string {
  if (role === 'fansub_lead') return styles.fansubEditRoleLead
  if (role === 'project_lead') return styles.fansubEditRoleProjectLead
  if (role === 'editor') return styles.fansubEditRoleEditor
  if (role === 'translator') return styles.fansubEditRoleTranslator
  if (role === 'timer') return styles.fansubEditRoleTimer
  if (role === 'typesetter') return styles.fansubEditRoleTypesetter
  if (role === 'quality_checker') return styles.fansubEditRoleQuality
  if (role === 'encoder') return styles.fansubEditRoleEncoder
  return styles.fansubEditRoleDefault
}

function styleNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ')
}

function formatMemberStatusLabel(status: FansubAppMember['status']): string {
  return status === 'active' ? 'Aktiv' : 'Deaktiviert'
}

function memberStatusVariant(status: FansubAppMember['status']): 'success' | 'muted' {
  return status === 'active' ? 'success' : 'muted'
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

function formatDateTime(value?: string | null): string {
  if (!value) return 'unbekannt'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'unbekannt'
  return parsed.toLocaleString('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function FansubAppMembersSection({ hasAccessToken = false, fansubId }: FansubAppMembersSectionProps) {
  const [members, setMembers] = useState<FansubAppMember[]>([])
  const [capabilities, setCapabilities] = useState<FansubGroupCapabilities | null>(null)
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateResults, setCandidateResults] = useState<FansubGroupMemberCandidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [roleEditorMemberId, setRoleEditorMemberId] = useState<number | null>(null)
  const [invitations, setInvitations] = useState<FansubGroupInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<FansubGroupRoleCode[]>([])
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const deferredCandidateQuery = useDeferredValue(candidateQuery.trim())

  const canViewMembers = capabilities?.can_view_members ?? false
  const canManageMembers = capabilities?.can_manage_members ?? false
  const canViewInvitations = capabilities?.can_view_invitations ?? false
  const canCreateInvitation = capabilities?.can_create_invitation ?? false
  const canCancelInvitation = capabilities?.can_cancel_invitation ?? false

  const loadSection = useCallback(async () => {
    if (!hasAccessToken || fansubId <= 0) {
      setCapabilities(null)
      setMembers([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setLoadError(null)
      const capabilitiesResponse = await getFansubGroupCapabilities(fansubId)
      setCapabilities(capabilitiesResponse.data)

      if (!capabilitiesResponse.data.can_view_members) {
        setMembers([])
      } else {
        const membersResponse = await listFansubAppMembers(fansubId)
        setMembers(membersResponse.data)
      }

      if (!capabilitiesResponse.data.can_view_invitations) {
        setInvitations([])
      } else {
        const invitationsResponse = await listFansubGroupInvitations(fansubId)
        setInvitations(invitationsResponse.data)
      }
    } catch (error) {
      setLoadError(formatApiError(error, 'Mitglieder konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [hasAccessToken, fansubId])

  useEffect(() => {
    void loadSection()
  }, [loadSection])

  useEffect(() => {
    let cancelled = false

    async function runSearch() {
      if (!hasAccessToken || !canManageMembers || deferredCandidateQuery.length < 2) {
        if (!cancelled) {
          setCandidateResults([])
          setSelectedCandidateId('')
        }
        return
      }

      try {
        setIsSearching(true)
        const response = await searchFansubAppMemberCandidates(fansubId, deferredCandidateQuery)
        if (cancelled) {
          return
        }
        const nextResults = response.data
        setCandidateResults(nextResults)
        setSelectedCandidateId((current) => {
          if (current && nextResults.some((candidate) => String(candidate?.app_user_id || 0) === current)) {
            return current
          }
          return ''
        })
      } catch (error) {
        if (!cancelled) {
          setActionError(formatApiError(error, 'Mitglieder konnten nicht gesucht werden.'))
          setCandidateResults([])
          setSelectedCandidateId('')
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    void runSearch()

    return () => {
      cancelled = true
    }
  }, [hasAccessToken, canManageMembers, deferredCandidateQuery, fansubId])

  const activeMemberCount = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members],
  )
  const roleEditorMember = useMemo(
    () => members.find((member) => member.id === roleEditorMemberId) ?? null,
    [members, roleEditorMemberId],
  )
  const selectedCandidate = useMemo(
    () => candidateResults.find((candidate) => String(candidate.app_user_id) === selectedCandidateId) ?? null,
    [candidateResults, selectedCandidateId],
  )

  function toggleSelectedRole(role: string) {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  function toggleInviteRole(role: FansubGroupRoleCode) {
    setInviteRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  function handleCandidateQueryChange(value: string) {
    setCandidateQuery(value)
    if (selectedCandidate && value.trim() !== selectedCandidate.fansub_name) {
      setSelectedCandidateId('')
    }
  }

  function handleCandidateSelect(candidate: FansubGroupMemberCandidate) {
    if (!candidate.app_user_id) return
    setSelectedCandidateId(String(candidate.app_user_id))
    setCandidateQuery(candidate.fansub_name)
  }

  async function handleAddMember() {
    const appUserId = Number.parseInt(selectedCandidateId, 10)
    if (!hasAccessToken || !Number.isFinite(appUserId) || appUserId <= 0 || selectedRoles.length === 0) {
      return
    }

    try {
      setIsAdding(true)
      setActionError(null)
      setSuccessMessage(null)
      await createFansubAppMember(
        fansubId,
        { app_user_id: appUserId, roles: selectedRoles },
      )
      setCandidateQuery('')
      setCandidateResults([])
      setSelectedCandidateId('')
      setSelectedRoles([])
      setCreatedInviteLink(null)
      await loadSection()
      setIsMemberModalOpen(false)
      setSuccessMessage('Mitglied wurde mit den gewählten Rollen zur Gruppe hinzugefügt.')
    } catch (error) {
      setActionError(formatApiError(error, 'Mitglied konnte nicht hinzugefügt werden.'))
      setSuccessMessage(null)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleCreateInvitation() {
    if (!hasAccessToken || !inviteEmail.trim() || inviteRoles.length === 0) {
      return
    }

    try {
      setIsCreatingInvite(true)
      setActionError(null)
      setSuccessMessage(null)
      const response = await createFansubGroupInvitation(
        fansubId,
        {
          email: inviteEmail.trim(),
          invited_role_codes: inviteRoles,
        },
      )
      setInviteEmail('')
      setInviteRoles([])
      setCreatedInviteLink(response.data.invite_link)
      await loadSection()
      setIsMemberModalOpen(false)
      setSuccessMessage('Einladung wurde gesendet.')
    } catch (error) {
      setActionError(formatApiError(error, 'Einladung konnte nicht erstellt werden.'))
      setSuccessMessage(null)
    } finally {
      setIsCreatingInvite(false)
    }
  }

  async function handleCancelInvitation(invitationId: number) {
    try {
      setBusyKey(`invitation:${invitationId}`)
      setActionError(null)
      setSuccessMessage(null)
      await cancelFansubGroupInvitation(fansubId, invitationId)
      await loadSection()
      setSuccessMessage('Einladung wurde zurückgezogen.')
    } catch (error) {
      setActionError(formatApiError(error, 'Einladung konnte nicht zurückgezogen werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleToggleRole(member: FansubAppMember, role: string) {
    const enabled = !member.roles.includes(role)
    const nextBusyKey = `role:${member.app_user_id}:${role}`

    try {
      setBusyKey(nextBusyKey)
      setActionError(null)
      setSuccessMessage(null)
      const response = await updateFansubAppMemberRole(
        fansubId,
        member.app_user_id,
        { role, enabled },
      )
      setMembers((current) =>
        current.map((item) => (item.app_user_id === member.app_user_id ? response.data : item)),
      )
      await loadSection()
      setSuccessMessage(enabled ? `${formatRoleLabel(role)} wurde vergeben.` : `${formatRoleLabel(role)} wurde entfernt.`)
    } catch (error) {
      setActionError(formatApiError(error, 'Rolle konnte nicht geändert werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleToggleStatus(member: FansubAppMember) {
    const nextStatus = member.status === 'active' ? 'disabled' : 'active'

    try {
      setBusyKey(`status:${member.app_user_id}`)
      setActionError(null)
      setSuccessMessage(null)
      const response = await updateFansubAppMemberStatus(
        fansubId,
        member.app_user_id,
        { status: nextStatus },
      )
      setMembers((current) =>
        current.map((item) => (item.app_user_id === member.app_user_id ? response.data : item)),
      )
      await loadSection()
      setRoleEditorMemberId(null)
      setSuccessMessage(nextStatus === 'active' ? 'Mitglied wurde reaktiviert.' : 'Mitglied wurde deaktiviert.')
    } catch (error) {
      setActionError(formatApiError(error, 'Mitgliedsstatus konnte nicht geändert werden.'))
      setSuccessMessage(null)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className={styles.fansubEditMembershipSurface}>
      <div className={styles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditBasicEyebrow}>Gruppenbereich</p>
          <h3 className={styles.fansubEditMembershipTitle}>Mitglieder und Rollen</h3>
          <p className={styles.fansubEditHint}>
            Hier siehst du, wer zur Fansubgruppe gehört und welche Aufgaben die Person in der Gruppe übernimmt.
          </p>
        </div>
        <div className={styles.fansubEditMembershipHeaderActions}>
          <div className={styles.fansubEditBasicStatusCard}>
            <span>Mitglieder</span>
            <strong>{members.length} Mitglied{members.length === 1 ? '' : 'er'}</strong>
            <p>{activeMemberCount} aktiv, {members.length - activeMemberCount} deaktiviert</p>
          </div>
          {canManageMembers || canCreateInvitation ? (
            <Button
              variant="primary"
              leftIcon={<UserPlus size={15} aria-hidden="true" />}
              onClick={() => setIsMemberModalOpen(true)}
            >
              Mitglied hinzufügen
            </Button>
          ) : null}
        </div>
      </div>

      {!hasAccessToken ? (
        <div className={styles.fansubEditMembershipEmpty}>
          <strong>Keine aktive Admin-Session</strong>
          <p className={styles.fansubEditHint}>Für die Mitgliederverwaltung bitte zuerst anmelden.</p>
        </div>
      ) : null}

      {isLoading ? <div className={styles.fansubEditReleaseState}>Mitglieder werden geladen...</div> : null}
      {loadError ? <div className={styles.errorBox}>{loadError}</div> : null}
      {actionError ? <div className={styles.errorBox}>{actionError}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {!isLoading && !loadError && hasAccessToken && !canViewMembers && !canViewInvitations ? (
        <div className={styles.errorBox}>Dir fehlen die Berechtigungen für Mitglieder und Einladungen dieser Fansubgruppe.</div>
      ) : null}

      {!isLoading && !loadError && hasAccessToken && (canViewMembers || canViewInvitations) ? (
        <>
          {canViewMembers && members.length === 0 ? (
            <div className={styles.fansubEditMembershipEmpty}>
              <strong>Noch keine Mitglieder in dieser Gruppe</strong>
              <p className={styles.fansubEditHint}>Sobald jemand hinzugefügt wurde, erscheinen Rollen und Status hier in der Übersicht.</p>
            </div>
          ) : null}
          {canViewMembers && members.length > 0 ? (
            <div className={styles.fansubEditMembershipList}>
              {members.map((member) => {
                const fansubName = member.member?.fansub_name?.trim() || `Mitglied #${member.app_user_id}`
                const isStatusBusy = busyKey === `status:${member.app_user_id}`
                const isRoleEditorOpen = roleEditorMemberId === member.id

                return (
                  <Card key={member.id} variant="compact" className={styles.fansubEditMembershipCard}>
                    <div className={styles.fansubEditMembershipCardTop}>
                      <div className={styles.fansubEditMembershipProfile}>
                        <div className={styles.fansubEditMembershipAvatar} aria-hidden="true">
                          {formatMemberInitials(fansubName)}
                        </div>
                        <div className={styles.fansubEditMembershipIdentity}>
                          <div className={styles.fansubEditMembershipNameRow}>
                            <strong>{fansubName}</strong>
                          </div>
                          <span className={styles.fansubEditMembershipMetaLine}>
                            <span><Calendar size={14} aria-hidden="true" />Seit {formatDateTime(member.created_at)}</span>
                            <span><Clock size={14} aria-hidden="true" />Aktualisiert {formatDateTime(member.updated_at)}</span>
                          </span>
                        </div>
                      </div>
                      <div className={styles.fansubEditMembershipControls}>
                        <Badge variant={memberStatusVariant(member.status)}>
                          <CheckCircle2 size={13} aria-hidden="true" />
                          {formatMemberStatusLabel(member.status)}
                        </Badge>
                        {canManageMembers ? (
                          <Button
                            variant={member.status === 'active' ? 'ghost' : 'secondary'}
                            size="sm"
                            disabled={isStatusBusy}
                            onClick={() => void handleToggleStatus(member)}
                          >
                            {isStatusBusy
                              ? 'Bitte warten...'
                              : member.status === 'active'
                                ? 'Deaktivieren'
                                : 'Reaktivieren'}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.fansubEditMembershipBody}>
                      <div className={styles.fansubEditMembershipRoleSummary}>
                        <span>Aktive Rollen</span>
                        <div className={styles.chipRow}>
                          {member.roles.length > 0 ? member.roles.map((role) => (
                            <Badge key={role} variant="info" className={styleNames(styles.fansubEditRoleBadge, getRoleClassName(role))}>
                              {formatRoleLabel(role)}
                            </Badge>
                          )) : <span className={styles.fansubEditHint}>Keine aktiven Aufgaben</span>}
                        </div>
                      </div>

                      {canManageMembers ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil size={14} aria-hidden="true" />}
                          onClick={() => setRoleEditorMemberId((current) => (current === member.id ? null : member.id))}
                        >
                          {isRoleEditorOpen ? 'Rollen schließen' : 'Rollen bearbeiten'}
                        </Button>
                      ) : null}
                    </div>

                  </Card>
                )
              })}
            </div>
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

                {invitations.length === 0 ? (
                  <div className={styles.fansubEditMembershipEmpty}>
                    <strong>Keine offenen Einladungen</strong>
                    <p className={styles.fansubEditHint}>Neue Einladungen erscheinen hier bis zur Annahme, zum Ablauf oder zur Rücknahme.</p>
                  </div>
                ) : (
                  <div className={styles.fansubEditMembershipList}>
                    {invitations.map((invitation) => {
                      const invitationBusy = busyKey === `invitation:${invitation.id}`
                      const invitedFansubName = invitation.member?.fansub_name?.trim()
                      return (
                        <Card key={invitation.id} variant="compact" className={styles.fansubEditMembershipCard}>
                          <div className={styles.fansubEditMembershipCardTop}>
                            <div className={styles.fansubEditMembershipIdentity}>
                              <strong>{invitedFansubName || invitation.email}</strong>
                              {invitedFansubName ? <span>{invitation.email}</span> : null}
                              <span>Läuft ab: {formatDateTime(invitation.expires_at)}</span>
                            </div>
                            <div className={styles.fansubEditMembershipBadgeRow}>
                              <Badge variant={invitationStatusVariant(invitation.status)}>
                                {formatInvitationStatusLabel(invitation.status)}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <p className={styles.fansubEditHint}>Aufgaben nach Annahme</p>
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
                          </div>
                          {canCancelInvitation ? (
                            <div className={styles.fansubEditMembershipActionRow}>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={invitationBusy}
                                onClick={() => void handleCancelInvitation(invitation.id)}
                              >
                                {invitationBusy ? 'Bitte warten...' : 'Einladung zurückziehen'}
                              </Button>
                            </div>
                          ) : null}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      ) : null}

      <Modal
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Mitglied hinzufügen"
        description="Suche bestehende Fansub-Mitglieder per Nick oder erstelle eine Einladung per E-Mail."
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {canManageMembers ? (
            <section className={styles.fansubEditMembershipModalSection}>
              <div>
                <p className={styles.fansubEditBasicEyebrow}>Bestehendes Profil</p>
                <h4 className={styles.fansubEditMembershipSubtitle}>Fansub-Nick suchen</h4>
                <p className={styles.fansubEditHint}>Die Verknüpfung zum Team4s-Konto passiert im Hintergrund.</p>
              </div>

              <input
                type="search"
                value={candidateQuery}
                onChange={(event) => handleCandidateQueryChange(event.target.value)}
                placeholder="Fansub-Nick suchen"
                aria-label="Fansub-Nick suchen"
              />

              {candidateQuery.trim().length < 2 ? (
                <p className={styles.fansubEditHint}>Gib mindestens zwei Zeichen ein, um passende Fansub-Nicks zu suchen.</p>
              ) : null}
              {candidateQuery.trim().length >= 2 && isSearching ? (
                <div className={styles.fansubEditReleaseState}>Mitglieder werden gesucht...</div>
              ) : null}
              {candidateQuery.trim().length >= 2 && !isSearching && candidateResults.length === 0 ? (
                <p className={styles.fansubEditHint}>Keine passenden Mitglieder gefunden.</p>
              ) : null}

              {candidateResults.length > 0 ? (
                <div className={styles.fansubEditCandidateResults} aria-label="Gefundene Fansub-Mitglieder">
                  {candidateResults.map((candidate) => {
                    if (!candidate?.app_user_id) return null
                    const selected = String(candidate.app_user_id) === selectedCandidateId
                    return (
                      <button
                        key={candidate.app_user_id}
                        type="button"
                        className={styleNames(styles.fansubEditCandidateResult, selected && styles.fansubEditCandidateResultSelected)}
                        aria-pressed={selected}
                        onClick={() => handleCandidateSelect(candidate)}
                      >
                        <span>
                          <strong>{candidate.fansub_name}</strong>
                          <small>{selected ? 'Ausgewählt' : 'Zum Hinzufügen auswählen'}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {selectedCandidate ? (
                <div className={styles.fansubEditCandidateSelection} role="status">
                  <span>Ausgewähltes Profil</span>
                  <strong>{selectedCandidate.fansub_name}</strong>
                </div>
              ) : null}

              <div>
                <p className={styles.fansubEditHint}>Aufgaben in dieser Gruppe</p>
                <div className={styles.chipRow}>
                  {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                    const selected = selectedRoles.includes(option.code)
                    return (
                      <Button
                        key={option.code}
                        variant={selected ? 'secondary' : 'ghost'}
                        size="sm"
                        className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                        aria-pressed={selected}
                        onClick={() => toggleSelectedRole(option.code)}
                        title={option.description}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleAddMember()}
                disabled={isAdding || !selectedCandidateId || selectedRoles.length === 0}
              >
                {isAdding
                  ? 'Wird hinzugefügt...'
                  : !selectedCandidateId
                    ? 'Profil auswählen'
                    : selectedRoles.length === 0
                      ? 'Aufgabe auswählen'
                      : 'Mitglied hinzufügen'}
              </Button>
            </section>
          ) : null}

          {canCreateInvitation ? (
            <section className={styles.fansubEditMembershipModalSection}>
              <div>
                <p className={styles.fansubEditBasicEyebrow}>Einladung</p>
                <h4 className={styles.fansubEditMembershipSubtitle}>Per E-Mail einladen</h4>
              </div>

              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="E-Mail-Adresse für die Einladung"
                aria-label="E-Mail-Adresse für die Einladung"
              />

              <div>
                <p className={styles.fansubEditHint}>Aufgaben nach Annahme</p>
                <div className={styles.chipRow}>
                  {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                    const selected = inviteRoles.includes(option.code)
                    return (
                      <Button
                        key={`invite-${option.code}`}
                        variant={selected ? 'secondary' : 'ghost'}
                        size="sm"
                        className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                        aria-pressed={selected}
                        onClick={() => toggleInviteRole(option.code)}
                        title={option.description}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCreateInvitation()}
                disabled={isCreatingInvite || !inviteEmail.trim() || inviteRoles.length === 0}
              >
                {isCreatingInvite ? 'Einladung wird erstellt...' : 'Einladung erstellen'}
              </Button>
            </section>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(roleEditorMember)}
        onClose={() => setRoleEditorMemberId(null)}
        title="Rollen bearbeiten"
        description={roleEditorMember?.member?.fansub_name ? `Aufgaben für ${roleEditorMember.member.fansub_name} setzen.` : 'Aufgaben für dieses Mitglied setzen.'}
      >
        {roleEditorMember ? (
          <div className={styles.fansubEditMembershipModalStack}>
            <div className={styles.fansubEditMembershipRoleEditor}>
              <p className={styles.fansubEditHint}>Aktive Rollen bestimmen, was dieses Mitglied ab jetzt in der Gruppe tun darf.</p>
              <div className={styles.chipRow}>
                {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                  const enabled = roleEditorMember.roles.includes(option.code)
                  const roleBusy = busyKey === `role:${roleEditorMember.app_user_id}:${option.code}`
                  return (
                    <Button
                      key={option.code}
                      variant={enabled ? 'secondary' : 'ghost'}
                      size="sm"
                      className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), enabled && styles.fansubEditRoleOptionSelected)}
                      aria-pressed={enabled}
                      disabled={roleBusy}
                      onClick={() => void handleToggleRole(roleEditorMember, option.code)}
                      title={option.description}
                    >
                      {roleBusy ? 'Bitte warten...' : option.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
