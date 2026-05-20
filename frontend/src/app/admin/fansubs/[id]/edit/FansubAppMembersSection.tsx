'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

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
  type AppUserListItem,
  type FansubAppMember,
  type FansubGroupCapabilities,
  type FansubGroupInvitation,
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
  const [candidateResults, setCandidateResults] = useState<AppUserListItem[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['fansub_lead'])
  const [invitations, setInvitations] = useState<FansubGroupInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<FansubGroupRoleCode[]>(['fansub_lead'])
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
          if (current && nextResults.some((candidate) => String(candidate?.id || 0) === current)) {
            return current
          }
          return nextResults[0]?.id ? String(nextResults[0].id) : ''
        })
      } catch (error) {
        if (!cancelled) {
          setActionError(formatApiError(error, 'App-Benutzer konnten nicht gesucht werden.'))
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
      setSelectedRoles(['fansub_lead'])
      setCreatedInviteLink(null)
      await loadSection()
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
      setInviteRoles(['fansub_lead'])
      setCreatedInviteLink(response.data.invite_link)
      await loadSection()
      setSuccessMessage('Einladung wurde erstellt und als Einmal-Link bereitgestellt.')
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
          <p className={styles.fansubEditBasicEyebrow}>Phase 45 MVP</p>
          <h3 className={styles.fansubEditMembershipTitle}>Mitglieder & Rollen</h3>
          <p className={styles.fansubEditHint}>
            Keycloak liefert Identität und Session. Team4s verwaltet die gruppenspezifischen Rollen und schützt alle Aktionen zentral über Capabilities.
          </p>
          <p className={styles.fansubEditHint}>
            Persönliche Profilpflege läuft separat unter <a href="/admin/profile">/admin/profile</a>, damit diese Gruppenansicht nicht versehentlich zum eigenen Profil-Editor wird.
          </p>
        </div>
        <div className={styles.fansubEditBasicStatusCard}>
          <span>Aktueller Stand</span>
          <strong>{members.length} Mitglied{members.length === 1 ? '' : 'er'} verknüpft</strong>
          <p>{activeMemberCount} aktiv, {members.length - activeMemberCount} deaktiviert</p>
        </div>
      </div>

      {!hasAccessToken ? (
        <div className={styles.fansubEditMembershipEmpty}>
          <strong>Keine aktive Admin-Session</strong>
          <p className={styles.fansubEditHint}>Für die Mitgliederverwaltung bitte zuerst über `/auth` anmelden.</p>
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
          {canViewMembers ? (
          <div className={styles.fansubEditMembershipAssignCard}>
            <div>
              <p className={styles.fansubEditBasicEyebrow}>Neues Mitglied</p>
              <h4 className={styles.fansubEditMembershipSubtitle}>App-Benutzer suchen und zuordnen</h4>
              <p className={styles.fansubEditHint}>
                Suche nach Name oder E-Mail und vergebe direkt mindestens eine Gruppenrolle.
              </p>
            </div>

            {!canManageMembers ? (
              <p className={styles.fansubEditHint}>Dir fehlt die Berechtigung, Mitglieder dieser Gruppe zu verwalten.</p>
            ) : (
              <>
                <div className={styles.inputRow}>
                  <input
                    type="search"
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="App-Benutzer nach Name oder E-Mail suchen"
                    aria-label="App-Benutzer nach Name oder E-Mail suchen"
                  />
                </div>

                {candidateQuery.trim().length < 2 ? (
                  <p className={styles.fansubEditHint}>Gib mindestens zwei Zeichen ein, um passende App-Benutzer zu suchen.</p>
                ) : null}
                {candidateQuery.trim().length >= 2 && isSearching ? (
                  <div className={styles.fansubEditReleaseState}>App-Benutzer werden gesucht...</div>
                ) : null}
                {candidateQuery.trim().length >= 2 && !isSearching && candidateResults.length === 0 ? (
                  <p className={styles.fansubEditHint}>Keine passenden App-Benutzer gefunden.</p>
                ) : null}

                {candidateResults.length > 0 ? (
                  <div className={styles.inputRow}>
                    <select
                      value={selectedCandidateId}
                      onChange={(event) => setSelectedCandidateId(event.target.value)}
                      aria-label="Gefundene App-Benutzer"
                    >
                      {candidateResults.map((candidate) =>
                        candidate?.id ? (
                          <option key={candidate.id} value={String(candidate.id)}>
                            {candidate.display_name} · {candidate.email} · Konto {candidate.status}
                          </option>
                        ) : null,
                      )}
                    </select>
                  </div>
                ) : null}

                <div>
                  <p className={styles.fansubEditHint}>Startrollen für die neue Mitgliedschaft</p>
                  <div className={styles.chipRow}>
                    {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                      const selected = selectedRoles.includes(option.code)
                      return (
                        <button
                          key={option.code}
                          type="button"
                          className={styles.chip}
                          aria-pressed={selected}
                          onClick={() => toggleSelectedRole(option.code)}
                          title={option.description}
                        >
                          {selected ? '✓ ' : ''}{option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className={styles.fansubEditMembershipActionRow}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => void handleAddMember()}
                    disabled={isAdding || !selectedCandidateId || selectedRoles.length === 0}
                  >
                    {isAdding ? 'Wird hinzugefügt...' : 'Mitglied hinzufügen'}
                  </button>
                </div>
              </>
            )}
          </div>
          ) : null}

          {canViewMembers && members.length === 0 ? (
            <div className={styles.fansubEditMembershipEmpty}>
              <strong>Noch keine App-Benutzer zugeordnet</strong>
              <p className={styles.fansubEditHint}>Die erste Zuordnung erstellt gleichzeitig die fachliche Rollenbasis für diese Gruppe.</p>
            </div>
          ) : null}
          {canViewMembers && members.length > 0 ? (
            <div className={styles.fansubEditMembershipList}>
              {members.map((member) => {
                const appUser = member.app_user
                const isStatusBusy = busyKey === `status:${member.app_user_id}`

                return (
                  <article key={member.id} className={styles.fansubEditMembershipCard}>
                    <div className={styles.fansubEditMembershipCardTop}>
                      <div className={styles.fansubEditMembershipIdentity}>
                        <strong>{appUser?.display_name || `App-User #${member.app_user_id}`}</strong>
                        <span>{appUser?.email || 'Keine E-Mail verfügbar'}</span>
                      </div>
                      <div className={styles.fansubEditMembershipBadgeRow}>
                        <span className={styles.fansubEditMembershipStatusBadge}>{member.status}</span>
                        {appUser?.status ? (
                          <span className={styles.fansubEditMembershipStatusBadge}>{`Konto ${appUser.status}`}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.fansubEditMembershipMetaGrid}>
                      <div>
                        <span>App-User</span>
                        <strong>#{member.app_user_id}</strong>
                      </div>
                      <div>
                        <span>Globale Rollen</span>
                        <strong>{appUser?.global_roles?.length ? appUser.global_roles.join(', ') : 'keine'}</strong>
                      </div>
                      <div>
                        <span>Zugeordnet</span>
                        <strong>{formatDateTime(member.created_at)}</strong>
                      </div>
                      <div>
                        <span>Letzte Änderung</span>
                        <strong>{formatDateTime(member.updated_at)}</strong>
                      </div>
                    </div>

                    <div>
                      <p className={styles.fansubEditHint}>Aktive Gruppenrollen</p>
                      <div className={styles.chipRow}>
                        {member.roles.length > 0 ? member.roles.map((role) => (
                          <span key={role} className={styles.chip}>{formatRoleLabel(role)}</span>
                        )) : <span className={styles.fansubEditHint}>Keine aktiven Rollen</span>}
                      </div>
                    </div>

                    {canManageMembers ? (
                      <>
                        <div>
                          <p className={styles.fansubEditHint}>Rollen verwalten</p>
                          <div className={styles.chipRow}>
                            {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                              const enabled = member.roles.includes(option.code)
                              const roleBusy = busyKey === `role:${member.app_user_id}:${option.code}`
                              return (
                                <button
                                  key={option.code}
                                  type="button"
                                  className={styles.chip}
                                  disabled={roleBusy}
                                  onClick={() => void handleToggleRole(member, option.code)}
                                  title={option.description}
                                >
                                  {roleBusy ? '...' : enabled ? '− ' : '+ '}{option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className={styles.fansubEditMembershipActionRow}>
                          <button
                            type="button"
                            className={member.status === 'active' ? styles.buttonSecondary : styles.button}
                            disabled={isStatusBusy}
                            onClick={() => void handleToggleStatus(member)}
                          >
                            {isStatusBusy
                              ? 'Bitte warten...'
                              : member.status === 'active'
                                ? 'Mitglied deaktivieren'
                                : 'Mitglied reaktivieren'}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}

          <div className={styles.fansubEditMembershipAssignCard}>
            <div>
              <p className={styles.fansubEditBasicEyebrow}>Einladungen</p>
              <h4 className={styles.fansubEditMembershipSubtitle}>Offene Gruppeneinladungen</h4>
              <p className={styles.fansubEditHint}>
                Einladungen werden nur als gehashte Tokens gespeichert. Der Roh-Link erscheint einmalig direkt nach dem Erstellen.
              </p>
            </div>

            {!canViewInvitations ? (
              <p className={styles.fansubEditHint}>Dir fehlt die Berechtigung, offene Einladungen zu sehen.</p>
            ) : (
              <>
                {!canCreateInvitation ? (
                  <p className={styles.fansubEditHint}>Dir fehlt die Berechtigung, neue Einladungen zu erstellen.</p>
                ) : (
                  <>
                    <div className={styles.inputRow}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="E-Mail-Adresse für die Einladung"
                        aria-label="E-Mail-Adresse für die Einladung"
                      />
                    </div>
                    <div>
                      <p className={styles.fansubEditHint}>Rollen für die Einladung</p>
                      <div className={styles.chipRow}>
                        {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                          const selected = inviteRoles.includes(option.code)
                          return (
                            <button
                              key={`invite-${option.code}`}
                              type="button"
                              className={styles.chip}
                              aria-pressed={selected}
                              onClick={() => toggleInviteRole(option.code)}
                              title={option.description}
                            >
                              {selected ? '✓ ' : ''}{option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className={styles.fansubEditMembershipActionRow}>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => void handleCreateInvitation()}
                        disabled={isCreatingInvite || !inviteEmail.trim() || inviteRoles.length === 0}
                      >
                        {isCreatingInvite ? 'Einladung wird erstellt...' : 'Einladung erstellen'}
                      </button>
                    </div>
                  </>
                )}

                {createdInviteLink ? (
                  <div className={styles.successBox}>
                    Einmal-Link: <code>{createdInviteLink}</code>
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
                      return (
                        <article key={invitation.id} className={styles.fansubEditMembershipCard}>
                          <div className={styles.fansubEditMembershipCardTop}>
                            <div className={styles.fansubEditMembershipIdentity}>
                              <strong>{invitation.email}</strong>
                              <span>Läuft ab: {formatDateTime(invitation.expires_at)}</span>
                            </div>
                            <div className={styles.fansubEditMembershipBadgeRow}>
                              <span className={styles.fansubEditMembershipStatusBadge}>{invitation.status}</span>
                            </div>
                          </div>
                          <div>
                            <p className={styles.fansubEditHint}>Eingeladene Rollen</p>
                            <div className={styles.chipRow}>
                              {invitation.invited_role_codes.map((role) => (
                                <span key={`${invitation.id}-${role}`} className={styles.chip}>{formatRoleLabel(role)}</span>
                              ))}
                            </div>
                          </div>
                          {canCancelInvitation ? (
                            <div className={styles.fansubEditMembershipActionRow}>
                              <button
                                type="button"
                                className={styles.buttonSecondary}
                                disabled={invitationBusy}
                                onClick={() => void handleCancelInvitation(invitation.id)}
                              >
                                {invitationBusy ? 'Bitte warten...' : 'Einladung zurückziehen'}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
