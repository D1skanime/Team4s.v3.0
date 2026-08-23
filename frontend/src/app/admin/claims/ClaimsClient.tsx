'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, listClaims } from '@/lib/api'
import type { AdminClaimListRow } from '@/types/admin-users'

import { ClaimDecisionImpactPanel } from './ClaimDecisionImpactPanel'
import { useClaimsListFilters } from './useClaimsListFilters'

/** Ein geöffneter Entscheidungs-Dialog für genau einen Claim (D-24). */
interface OpenDecision {
  claim: AdminClaimListRow
  decision: 'verify' | 'activate' | 'reject'
}

/**
 * Gibt zurück, ob der Viewport als "mobil" gilt (< 760 px) — identischer Breakpoint und
 * matchMedia-Ansatz wie RoleCapabilityClient.tsx (D-32: reuse, kein zweiter Breakpoint-Wert).
 * SSR-sicher: Startzustand ist false (Desktop-Annahme), bis matchMedia läuft.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 759px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

/** D-23: reale Status-Vokabeln, keine erfundenen Status. */
function claimStatusLabel(status: string): string {
  switch (status) {
    case 'verified':
      return 'Genehmigt'
    case 'rejected':
      return 'Abgelehnt'
    case 'pending':
      return 'Offen'
    default:
      return status
  }
}

function claimStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'verified':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
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

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function ClaimsClient() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [items, setItems] = useState<AdminClaimListRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [openDecision, setOpenDecision] = useState<OpenDecision | null>(null)

  const {
    params,
    handleStatusChange,
    handleGroupChange,
    handleUserChange,
    handleDateRangeChange,
    handlePageChange,
  } = useClaimsListFilters()

  // Lokaler Zwischenwert für die Gruppen-/Benutzer-ID-Filter — schreibt erst onBlur in die URL,
  // damit nicht bei jeder eingegebenen Ziffer ein eigener listClaims-Request ausgelöst wird.
  const [groupIdInput, setGroupIdInput] = useState(params.fansub_group_id?.toString() ?? '')
  const [userIdInput, setUserIdInput] = useState(params.app_user_id?.toString() ?? '')

  useEffect(() => {
    setGroupIdInput(params.fansub_group_id?.toString() ?? '')
  }, [params.fansub_group_id])

  useEffect(() => {
    setUserIdInput(params.app_user_id?.toString() ?? '')
  }, [params.app_user_id])

  const loadClaims = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listClaims(params)
      setItems(resp.data)
      setTotal(resp.meta.total)
    } catch (err) {
      setError(readErrorMessage(err, 'Claims konnten nicht geladen werden. Bitte Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadClaims()
  }, [loadClaims])

  function handleNavigateUser(appUserId: number) {
    router.push(`/admin/users/${appUserId}`)
  }

  function handleNavigateGroup(fansubGroupId: number) {
    router.push(`/admin/fansubs/${fansubGroupId}/edit`)
  }

  const limit = params.limit ?? 25
  const currentPage = Math.floor((params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <h1>Claims</h1>

      {/* Filter-Bereich (D-23/D-28: Status, Claim-Typ, Gruppe, Benutzer, Zeitraum) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          alignItems: 'flex-end',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Status" htmlFor="claims-status-filter">
          <Select
            id="claims-status-filter"
            aria-label="Status"
            value={params.status ?? ''}
            onChange={(e) => handleStatusChange(e.currentTarget.value)}
          >
            <option value="">Alle Status</option>
            <option value="pending">Offen</option>
            <option value="verified">Genehmigt</option>
            <option value="rejected">Abgelehnt</option>
          </Select>
        </FormField>

        {/* Claim-Typ hat heute genau einen realen Wert ('claim') — bewusst kein Select mit
            erfundenen Optionen, sondern ein deaktivierter Einzel-Indikator. */}
        <FormField label="Claim-Typ" htmlFor="claims-type-filter">
          <Select id="claims-type-filter" aria-label="Claim-Typ" value="claim" disabled>
            <option value="claim">Mitgliedschaftsanspruch</option>
          </Select>
        </FormField>

        <FormField label="Gruppe (ID)" htmlFor="claims-group-filter">
          <Input
            id="claims-group-filter"
            type="number"
            min={1}
            value={groupIdInput}
            onChange={(e) => setGroupIdInput(e.currentTarget.value)}
            onBlur={() => handleGroupChange(groupIdInput)}
          />
        </FormField>

        <FormField label="Benutzer (ID)" htmlFor="claims-user-filter">
          <Input
            id="claims-user-filter"
            type="number"
            min={1}
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.currentTarget.value)}
            onBlur={() => handleUserChange(userIdInput)}
          />
        </FormField>

        <FormField label="Von" htmlFor="claims-from-filter">
          <Input
            id="claims-from-filter"
            type="date"
            value={params.from ?? ''}
            onChange={(e) => handleDateRangeChange(e.currentTarget.value, params.to ?? '')}
          />
        </FormField>

        <FormField label="Bis" htmlFor="claims-to-filter">
          <Input
            id="claims-to-filter"
            type="date"
            value={params.to ?? ''}
            onChange={(e) => handleDateRangeChange(params.from ?? '', e.currentTarget.value)}
          />
        </FormField>
      </div>

      {isLoading ? (
        <LoadingState title="Claims werden geladen …" description="" />
      ) : error ? (
        <ErrorState title="Fehler beim Laden" description={error} />
      ) : items.length === 0 ? (
        params.status === 'pending' ? (
          <EmptyState
            title="Keine offenen Claims."
            description="Für diesen Filter liegen aktuell keine zu entscheidenden Claims vor."
          />
        ) : (
          <EmptyState
            title="Keine Claims gefunden"
            description="Passen Sie Ihre Suchkriterien an oder prüfen Sie die aktiven Filter."
          />
        )
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map((claim) => (
            <ClaimCard
              key={claim.claim_id}
              claim={claim}
              onNavigateUser={handleNavigateUser}
              onNavigateGroup={handleNavigateGroup}
              onDecide={(decision) => setOpenDecision({ claim, decision })}
            />
          ))}
        </div>
      ) : (
        <Table variant="default">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Benutzer</TableHeaderCell>
              <TableHeaderCell>Gruppe</TableHeaderCell>
              <TableHeaderCell>Mitglied</TableHeaderCell>
              <TableHeaderCell>Erstellt</TableHeaderCell>
              <TableHeaderCell>Aktion</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((claim) => (
              <TableRow key={claim.claim_id}>
                <TableCell>
                  <Badge variant={claimStatusVariant(claim.claim_status)}>
                    {claimStatusLabel(claim.claim_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" onClick={() => handleNavigateUser(claim.app_user_id)}>
                    {claim.app_user_display_name}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" onClick={() => handleNavigateGroup(claim.fansub_group_id)}>
                    {claim.fansub_group_name}
                  </Button>
                </TableCell>
                <TableCell>{claim.member_nickname}</TableCell>
                <TableCell>{formatDate(claim.created_at)}</TableCell>
                <TableCell>
                  <ClaimActionButtons
                    claim={claim}
                    onDecide={(decision) => setOpenDecision({ claim, decision })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      {openDecision && (
        <ClaimDecisionImpactPanel
          open
          onClose={() => setOpenDecision(null)}
          fansubGroupId={openDecision.claim.fansub_group_id}
          memberId={openDecision.claim.member_id}
          claimId={openDecision.claim.claim_id}
          appUserDisplayName={openDecision.claim.app_user_display_name}
          decision={openDecision.decision}
          onDecided={() => {
            setOpenDecision(null)
            void loadClaims()
          }}
        />
      )}
    </div>
  )
}

interface ClaimActionButtonsProps {
  claim: AdminClaimListRow
  onDecide: (decision: 'verify' | 'activate' | 'reject') => void
}

/** D-24: verfügbare Aktion(en) je nach realem claim_status, keine erfundenen Übergänge. */
function ClaimActionButtons({ claim, onDecide }: ClaimActionButtonsProps) {
  if (claim.claim_status === 'pending') {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" onClick={() => onDecide('verify')}>
          Verifizieren
        </Button>
        <Button variant="danger" onClick={() => onDecide('reject')}>
          Ablehnen
        </Button>
      </div>
    )
  }
  if (claim.claim_status === 'verified') {
    return (
      <Button variant="primary" onClick={() => onDecide('activate')}>
        Als aktives Mitglied übernehmen
      </Button>
    )
  }
  return null
}

interface ClaimCardProps {
  claim: AdminClaimListRow
  onNavigateUser: (appUserId: number) => void
  onNavigateGroup: (fansubGroupId: number) => void
  onDecide: (decision: 'verify' | 'activate' | 'reject') => void
}

/**
 * D-32 (<760px): Zeilen-Collapse der grossen Desktop-Tabelle als kompakte Card, statt einer
 * horizontal zusammengedrückten Matrix — analog zum bestehenden Card-Zeilen-Muster im Admin-Bereich.
 */
function ClaimCard({ claim, onNavigateUser, onNavigateGroup, onDecide }: ClaimCardProps) {
  return (
    <Card variant="compact">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}
      >
        <Badge variant={claimStatusVariant(claim.claim_status)}>{claimStatusLabel(claim.claim_status)}</Badge>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(claim.created_at)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
        <Button variant="ghost" onClick={() => onNavigateUser(claim.app_user_id)}>
          {claim.app_user_display_name}
        </Button>
        <Button variant="ghost" onClick={() => onNavigateGroup(claim.fansub_group_id)}>
          {claim.fansub_group_name}
        </Button>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mitglied: {claim.member_nickname}</span>
      </div>
      <div style={{ marginTop: 'var(--space-2)' }}>
        <ClaimActionButtons claim={claim} onDecide={onDecide} />
      </div>
    </Card>
  )
}
