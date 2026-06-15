'use client'

import { useCallback, useEffect, useState } from 'react'

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
import { ApiError, getAdminUserOverview, updateAdminUserStatus } from '@/lib/api'
import type { AdminConflictDetail, AdminUserOverviewResponse } from '@/types/admin-users'

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
// Stat-Grid-Komponente
// ---------------------------------------------------------------------------

interface StatItem {
  label: string
  value: number
}

function StatGrid({ data }: { data: AdminUserOverviewResponse }) {
  const stats: StatItem[] = [
    { label: 'Globale Rollen', value: data.global_roles.length },
    { label: 'Gruppen', value: data.group_membership_count },
    { label: 'Offene Claims', value: data.open_claims_count },
    { label: 'Offene Beiträge', value: data.open_contributions_count },
    { label: 'Release-Arbeitsflächen', value: data.release_scope_count },
    { label: 'Mediauploads', value: data.media_upload_count },
    { label: 'Konflikte', value: data.conflict_details.length },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-5)',
      }}
    >
      {stats.map((stat) => (
        <Card key={stat.label} variant="nested">
          <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: stat.label === 'Konflikte' && stat.value > 0
                  ? 'var(--color-warning)'
                  : 'var(--color-text)',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        </Card>
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
      <StatGrid data={data} />
      <ConflictsSection conflicts={data.conflict_details} />
      <AccountStatusSection data={data} onStatusChanged={() => void loadData()} />
    </div>
  )
}
