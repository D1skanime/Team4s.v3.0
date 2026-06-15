'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, getAdminUserMemberClaims } from '@/lib/api'
import type {
  AdminClaimSummary,
  AdminMemberProfileSummary,
  AdminUserMemberClaimsResponse,
} from '@/types/admin-users'

interface Props {
  userId: number
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function claimStatusLabel(status: string): string {
  switch (status) {
    case 'active':
    case 'verified':
      return 'Verifiziert'
    case 'open':
    case 'pending':
      return 'Offen'
    case 'rejected':
    case 'denied':
      return 'Abgelehnt'
    default:
      return status
  }
}

function claimStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
    case 'verified':
      return 'success'
    case 'open':
    case 'pending':
      return 'warning'
    case 'rejected':
    case 'denied':
      return 'danger'
    default:
      return 'neutral'
  }
}

function MemberProfileSection({ profile }: { profile: AdminMemberProfileSummary | null }) {
  if (!profile) {
    return (
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <SectionHeader title="Member-Profil" />
        <EmptyState title="Kein Member-Profil verknüpft." description="" />
      </div>
    )
  }

  const isMemorial = profile.profile_status === 'memorial'

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader title="Member-Profil" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
        <span style={{ fontWeight: 600 }}>{profile.fansub_name}</span>
        {isMemorial ? (
          <Badge variant="muted">Gedenkprofil</Badge>
        ) : (
          <Badge variant="success">Aktiv</Badge>
        )}
      </div>
    </div>
  )
}

function ClaimsSection({ claims }: { claims: AdminClaimSummary[] }) {
  return (
    <div>
      <SectionHeader title="Claims &amp; Einladungen" />
      {claims.length === 0 ? (
        <EmptyState title="Keine Einträge vorhanden." description="" />
      ) : (
        <Table variant="compact">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Gruppe</TableHeaderCell>
              <TableHeaderCell>Typ</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Eingereicht</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.claim_id}>
                <TableCell>{claim.fansub_name}</TableCell>
                <TableCell>{claim.claim_type}</TableCell>
                <TableCell>
                  <Badge variant={claimStatusVariant(claim.claim_status)}>
                    {claimStatusLabel(claim.claim_status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(claim.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function UserClaimsTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserMemberClaimsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserMemberClaims(userId)
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
  if (!data) return <EmptyState title="Keine Einträge vorhanden." description="" />

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <MemberProfileSection profile={data.member_profile} />
      <ClaimsSection claims={data.claims} />
    </div>
  )
}
