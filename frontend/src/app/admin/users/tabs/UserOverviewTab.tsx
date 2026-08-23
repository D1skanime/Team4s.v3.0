'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  SectionHeader,
} from '@/components/ui'
import {
  ApiError,
  getAdminUserGroupMemberships,
  getAdminUserOverview,
  getEffectiveRights,
  listRoleCapabilities,
  updateAdminUserStatus,
} from '@/lib/api'
import type { AdminConflictDetail, AdminGroupMembershipSummary, AdminUserOverviewResponse } from '@/types/admin-users'
import type { EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'

interface Props {
  userId: number
  displayName?: string
}

// ---------------------------------------------------------------------------
// Status-Badge-Zuordnung
// ---------------------------------------------------------------------------

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'disabled':
      return 'danger'
    default:
      return 'neutral'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'pending':
      return 'Ausstehend'
    case 'disabled':
      return 'Deaktiviert'
    default:
      return status
  }
}

// ---------------------------------------------------------------------------
// Kompakte Pro-Gruppen-Zusammenfassung (D-05, ersetzt die vorherige bare
// Stat-Kachel-Ansicht)
// ---------------------------------------------------------------------------
//
// D-05 (locked Beispiel): "New-Subs — Rolle: Co-Leitung / ✓ Gruppe bearbeiten
// ✓ Mitglieder verwalten ✕ Review freigeben / Keine persönlichen
// Rechteabweichungen · Keine offenen Claims" -- niemals große bare
// Statistik-Kacheln ("18 effektive Rechte", "13 Beiträge").
//
// Lädt Mitgliedschaften + effektive Rechte pro Gruppe genau wie
// UserGroupRightsTab.tsx (gleiche Endpunkte, keine zweite Entscheidungslogik) --
// zeigt hier aber nur eine kompakte Zeile pro Gruppe statt der vollständigen,
// aufklappbaren Kategorie-Ansicht.

const HEADLINE_CAPABILITY_LIMIT = 3

function roleLabelFor(roleCode: string, matrix: RoleCapabilityMatrix | null): string {
  return matrix?.roles.find((entry) => entry.role_code === roleCode)?.label_de ?? roleCode
}

interface GroupSummaryCardProps {
  membership: AdminGroupMembershipSummary
  states: EffectiveRightState[]
  actionLabels: Map<string, string>
  matrix: RoleCapabilityMatrix | null
  openClaimsCount: number
}

function GroupSummaryCard({ membership, states, actionLabels, matrix, openClaimsCount }: GroupSummaryCardProps) {
  const roleLabel =
    membership.roles.length > 0
      ? membership.roles.map((role) => roleLabelFor(role, matrix)).join(' + ')
      : '–'

  const headlineStates = states.slice(0, HEADLINE_CAPABILITY_LIMIT)
  const hasDeviation = states.some((state) => state.user_allow || state.user_deny)

  return (
    <Card variant="nested" style={{ marginBottom: 'var(--space-2)' }}>
      <div style={{ padding: 'var(--space-3)', display: 'grid', gap: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <strong>{membership.fansub_group_name}</strong>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Rolle: {roleLabel}
          </span>
        </div>
        {headlineStates.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            {headlineStates.map((state) => (
              <span key={state.action_code}>
                {state.allowed ? '✓' : '✕'} {actionLabels.get(state.action_code) ?? state.action_code}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {hasDeviation ? 'Persönliche Rechteabweichungen vorhanden' : 'Keine persönlichen Rechteabweichungen'}
          {' · '}
          {openClaimsCount > 0 ? `${openClaimsCount} offene Claims` : 'Keine offenen Claims'}
        </p>
      </div>
    </Card>
  )
}

interface GroupRightsSummarySectionProps {
  userId: number
  openClaimsCount: number
}

function GroupRightsSummarySection({ userId, openClaimsCount }: GroupRightsSummarySectionProps) {
  const [memberships, setMemberships] = useState<AdminGroupMembershipSummary[]>([])
  const [rightsByGroup, setRightsByGroup] = useState<Record<number, EffectiveRightState[]>>({})
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [membershipsResp, matrixResult] = await Promise.all([
        getAdminUserGroupMemberships(userId),
        listRoleCapabilities().catch(() => null),
      ])
      const rightsList = await Promise.all(
        membershipsResp.memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId)),
      )
      const byGroup: Record<number, EffectiveRightState[]> = {}
      membershipsResp.memberships.forEach((membership, index) => {
        byGroup[membership.fansub_group_id] = rightsList[index]
      })
      setMemberships(membershipsResp.memberships)
      setRightsByGroup(byGroup)
      setMatrix(matrixResult)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Gruppenzusammenfassung konnte nicht geladen werden.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const actionLabels = useMemo(() => {
    const map = new Map<string, string>()
    if (matrix) {
      for (const action of matrix.all_actions) {
        map.set(action.code, action.label_de)
      }
    }
    return map
  }, [matrix])

  if (isLoading) {
    return <LoadingState title="Gruppenrechte werden geladen …" description="" />
  }
  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }
  if (memberships.length === 0) {
    return (
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <SectionHeader title="Gruppen" />
        <EmptyState title="Keine Gruppenmitgliedschaften." description="" />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader title="Gruppen" />
      {memberships.map((membership) => (
        <GroupSummaryCard
          key={membership.fansub_group_id}
          membership={membership}
          states={rightsByGroup[membership.fansub_group_id] ?? []}
          actionLabels={actionLabels}
          matrix={matrix}
          openClaimsCount={openClaimsCount}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Konflikte-Sektion
// ---------------------------------------------------------------------------

function ConflictsSection({ conflicts }: { conflicts: AdminConflictDetail[] }) {
  if (conflicts.length === 0) return null

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader
        title="Erkannte Konflikte"
        actions={
          <Badge variant="warning">
            {conflicts.length === 1 ? '1 Konflikt' : `${conflicts.length} Konflikte`}
          </Badge>
        }
      />
      <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-5)' }}>
        {conflicts.map((c, idx) => (
          <li key={idx} style={{ marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>
            {c.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Accountstatus-Sektion mit Deaktivieren/Reaktivieren-Modal
// ---------------------------------------------------------------------------

interface AccountStatusSectionProps {
  data: AdminUserOverviewResponse
  onStatusChanged: () => void
}

function AccountStatusSection({ data, onStatusChanged }: AccountStatusSectionProps) {
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  async function handleDisableConfirm() {
    setMutationError(null)
    setIsMutating(true)
    try {
      await updateAdminUserStatus(data.id, 'disabled')
      setIsDisableModalOpen(false)
      onStatusChanged()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMutationError(
          'Das Konto des letzten aktiven Plattform-Admins kann nicht deaktiviert werden.',
        )
      } else if (err instanceof ApiError) {
        setMutationError(err.message)
      } else {
        setMutationError('Deaktivierung fehlgeschlagen. Bitte erneut versuchen.')
      }
    } finally {
      setIsMutating(false)
    }
  }

  async function handleReactivate() {
    setMutationError(null)
    setIsMutating(true)
    try {
      await updateAdminUserStatus(data.id, 'active')
      onStatusChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setMutationError(err.message)
      } else {
        setMutationError('Reaktivierung fehlgeschlagen. Bitte erneut versuchen.')
      }
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader title="Accountstatus" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-3) 0',
          flexWrap: 'wrap',
        }}
      >
        <Badge variant={statusVariant(data.status)}>
          {statusLabel(data.status)}
        </Badge>
        {mutationError && (
          <p
            role="alert"
            style={{ color: 'var(--color-error)', fontSize: '0.9rem', margin: 0 }}
          >
            {mutationError}
          </p>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {data.status === 'active' || data.status === 'pending' ? (
            <Button
              variant="danger"
              size="sm"
              disabled={isMutating}
              onClick={() => {
                setMutationError(null)
                setIsDisableModalOpen(true)
              }}
            >
              {isMutating ? 'Wird verarbeitet …' : 'Konto deaktivieren'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={isMutating}
              onClick={() => void handleReactivate()}
            >
              {isMutating ? 'Wird verarbeitet …' : 'Konto reaktivieren'}
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={isDisableModalOpen}
        onClose={() => {
          if (!isMutating) {
            setIsDisableModalOpen(false)
            setMutationError(null)
          }
        }}
        title="Konto deaktivieren"
        description={`Das Konto von ${data.display_name} wird deaktiviert. Der Benutzer verliert den Plattformzugang sofort.`}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (!isMutating) {
                  setIsDisableModalOpen(false)
                  setMutationError(null)
                }
              }}
              disabled={isMutating}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDisableConfirm()}
              disabled={isMutating}
            >
              {isMutating ? 'Wird verarbeitet …' : 'Jetzt deaktivieren'}
            </Button>
          </div>
        }
      >
        {mutationError && (
          <p
            role="alert"
            style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}
          >
            {mutationError}
          </p>
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export function UserOverviewTab({ userId, displayName: _displayName }: Props) {
  const [data, setData] = useState<AdminUserOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserOverview(userId)
      setData(resp)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (isLoading) return <LoadingState title="Wird geladen …" description="" />
  if (error) {
    return (
      <ErrorState
        title="Fehler beim Laden"
        description={error}
      />
    )
  }
  if (!data) return <EmptyState title="Keine Daten vorhanden." description="" />

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader title="Übersicht" />
      <GroupRightsSummarySection userId={userId} openClaimsCount={data.open_claims_count} />
      <ConflictsSection conflicts={data.conflict_details} />
      <AccountStatusSection data={data} onStatusChanged={() => void loadData()} />
    </div>
  )
}
