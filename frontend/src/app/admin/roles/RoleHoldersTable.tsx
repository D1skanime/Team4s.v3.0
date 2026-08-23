'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { RoleHolderEntry } from '@/types/admin-capability'

/**
 * Gibt zurück, ob der Viewport als "mobil" gilt (< 760 px) — identischer Breakpoint und
 * matchMedia-Ansatz wie ClaimsClient.tsx/RoleCapabilityClient.tsx (D-32: reuse, kein zweiter
 * Breakpoint-Wert). SSR-sicher: Startzustand ist false (Desktop-Annahme), bis matchMedia läuft.
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

/**
 * Mitgliedsstatus-Badge-Mapping — identisch zu UserDetailPageClient.tsx's statusVariant/
 * statusLabel (keine zweite, abweichende Zuordnung; fansub_group_members.status kennt heute
 * nur 'active'/'disabled', die weiteren Fälle bleiben für Konsistenz mit dem Original erhalten).
 */
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

export interface RoleHoldersTableProps {
  holders: RoleHolderEntry[]
}

/**
 * D-07's "wer besitzt diese Rolle?"-Tabelle: Benutzer | Gruppe | Status | Rechte-Abweichungen |
 * letzte Aktivität. Benutzer und Gruppe sind echte klickbare Navigations-Buttons zum
 * kanonischen Benutzer- bzw. Gruppen-Editor (D-02/D-09) — kein reiner Text.
 *
 * "letzte Aktivität" ist heute nicht datenseitig verfügbar (RoleHolderEntry trägt dieses Feld
 * nicht — Plan 138-01s Endpunkt liefert es nicht), daher rendert diese Spalte bewusst "–" statt
 * eines erfundenen Zeitstempels.
 */
export function RoleHoldersTable({ holders }: RoleHoldersTableProps) {
  const router = useRouter()
  const isMobile = useIsMobile()

  if (holders.length === 0) {
    return (
      <EmptyState
        title="Keine Rolleninhaber gefunden."
        description="Dieser Rolle ist aktuell niemand zugewiesen."
      />
    )
  }

  function handleNavigateUser(appUserId: number) {
    router.push(`/admin/users/${appUserId}`)
  }

  function handleNavigateGroup(fansubGroupId: number) {
    router.push(`/admin/fansubs/${fansubGroupId}/edit`)
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {holders.map((holder) => (
          <Card key={`${holder.app_user_id}-${holder.fansub_group_id}`} variant="compact">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-2)',
              }}
            >
              <Badge variant={statusVariant(holder.membership_status)}>
                {statusLabel(holder.membership_status)}
              </Badge>
              <Badge variant={holder.has_overrides ? 'info' : 'muted'}>
                {holder.has_overrides ? 'Ja' : 'Nein'}
              </Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
              <Button variant="ghost" onClick={() => handleNavigateUser(holder.app_user_id)}>
                {holder.display_name}
              </Button>
              <Button variant="ghost" onClick={() => handleNavigateGroup(holder.fansub_group_id)}>
                {holder.fansub_group_name}
              </Button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>letzte Aktivität: –</span>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Table variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Benutzer</TableHeaderCell>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Rechte-Abweichungen</TableHeaderCell>
          <TableHeaderCell>letzte Aktivität</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {holders.map((holder) => (
          <TableRow key={`${holder.app_user_id}-${holder.fansub_group_id}`}>
            <TableCell>
              <Button variant="ghost" onClick={() => handleNavigateUser(holder.app_user_id)}>
                {holder.display_name}
              </Button>
            </TableCell>
            <TableCell>
              <Button variant="ghost" onClick={() => handleNavigateGroup(holder.fansub_group_id)}>
                {holder.fansub_group_name}
              </Button>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(holder.membership_status)}>
                {statusLabel(holder.membership_status)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={holder.has_overrides ? 'info' : 'muted'}>
                {holder.has_overrides ? 'Ja' : 'Nein'}
              </Badge>
            </TableCell>
            <TableCell>–</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
