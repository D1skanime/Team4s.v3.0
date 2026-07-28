'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Accordion, Badge, Button, PageHeader } from '@/components/ui'
import type { AccordionItemDef } from '@/components/ui'
import { getAdminUserOverview } from '@/lib/api'
import type { AdminUserOverviewResponse } from '@/types/admin-users'

import { UserAuditTab } from '../tabs/UserAuditTab'
import { UserClaimsTab } from '../tabs/UserClaimsTab'
import { UserContributionsTab } from '../tabs/UserContributionsTab'
import { UserGlobalRolesTab } from '../tabs/UserGlobalRolesTab'
import { UserGroupMembershipsTab } from '../tabs/UserGroupMembershipsTab'
import { UserGroupRightsTab } from '../tabs/UserGroupRightsTab'
import { UserMediaTab } from '../tabs/UserMediaTab'
import { UserOverviewTab } from '../tabs/UserOverviewTab'
import { UserStreamingGrantsTab } from '../tabs/UserStreamingGrantsTab'

// Items 1-4 (D-03): initial offen UND geladen. Items 5-9: eingeklappt, laden lazy
// beim ersten Öffnen und bleiben danach im Cache (kein Re-Fetch beim erneuten
// Öffnen — separates loadedIds-Set, siehe 111-PATTERNS.md Pitfall 3).
const DEFAULT_OPEN_IDS = ['overview', 'roles', 'memberships', 'group-rights']

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

export function UserDetailPageClient() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const userId = Number(params.id)

  const fromQuery = searchParams.get('from')
  const backHref = fromQuery ? `/admin/users?${fromQuery}` : '/admin/users'

  // Eigener, von den Tab-Komponenten unabhängiger Fetch nur für Titel/Status
  // im PageHeader (die Übersicht-Sektion selbst lädt ihre Daten unabhängig
  // über UserOverviewTab).
  const [overview, setOverview] = useState<AdminUserOverviewResponse | null>(null)

  const loadOverview = useCallback(async () => {
    try {
      const resp = await getAdminUserOverview(userId)
      setOverview(resp)
    } catch {
      // Fehler wird bereits granular in der Übersicht-Sektion (UserOverviewTab)
      // angezeigt; der Header fällt auf den Nummern-Titel zurück.
    }
  }, [userId])

  useEffect(() => {
    // Fetch-on-mount fuer den PageHeader-Titel/Status, unabhaengig vom
    // internen Fetch der Uebersicht-Sektion (UserOverviewTab).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview()
  }, [loadOverview])

  const [openIds, setOpenIds] = useState<Set<string>>(new Set(DEFAULT_OPEN_IDS))
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set(DEFAULT_OPEN_IDS))

  function handleOpenChange(next: Set<string>) {
    setOpenIds(next)
    setLoadedIds((prev) => new Set([...prev, ...next]))
  }

  const items: AccordionItemDef[] = [
    {
      id: 'overview',
      title: 'Übersicht',
      children: loadedIds.has('overview') ? <UserOverviewTab userId={userId} /> : null,
    },
    {
      id: 'roles',
      title: 'Globale Rollen',
      children: loadedIds.has('roles') ? <UserGlobalRolesTab userId={userId} /> : null,
    },
    {
      id: 'memberships',
      title: 'Gruppenmitgliedschaften',
      children: loadedIds.has('memberships') ? <UserGroupMembershipsTab userId={userId} /> : null,
    },
    {
      id: 'group-rights',
      title: 'Gruppenrechte',
      children: loadedIds.has('group-rights') ? <UserGroupRightsTab userId={userId} /> : null,
    },
    {
      id: 'claims',
      title: 'Member-Profil & Claims',
      children: loadedIds.has('claims') ? <UserClaimsTab userId={userId} /> : null,
    },
    {
      id: 'contributions',
      title: 'Beiträge',
      children: loadedIds.has('contributions') ? <UserContributionsTab userId={userId} /> : null,
    },
    {
      id: 'media',
      title: 'Medien',
      children: loadedIds.has('media') ? <UserMediaTab userId={userId} /> : null,
    },
    {
      id: 'audit',
      title: 'Audit',
      children: loadedIds.has('audit') ? <UserAuditTab userId={userId} /> : null,
    },
    {
      id: 'streaming',
      title: 'Streaming',
      children: loadedIds.has('streaming') ? <UserStreamingGrantsTab userId={userId} /> : null,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Benutzerverwaltung"
        title={overview?.display_name || `Benutzer #${userId}`}
        breadcrumbs={
          <Button variant="ghost" size="sm" href={backHref} leftIcon={<ChevronLeft size={16} />}>
            Zurück zur Liste
          </Button>
        }
        actions={
          overview ? (
            <Badge variant={statusVariant(overview.status)}>{statusLabel(overview.status)}</Badge>
          ) : undefined
        }
      />
      <Accordion
        items={items}
        mode="multi"
        openIds={openIds}
        onOpenChange={handleOpenChange}
        keepMountedIds={loadedIds}
      />
    </>
  )
}
