'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Badge, Button, ErrorState, PageHeader, SectionHeader, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { getAdminUserOverview } from '@/lib/api'
import type { AdminUserOverviewResponse } from '@/types/admin-users'

import { UserAuditTab } from '../tabs/UserAuditTab'
import { UserClaimsTab } from '../tabs/UserClaimsTab'
import { UserContributionsTab } from '../tabs/UserContributionsTab'
import { UserGlobalRolesTab } from '../tabs/UserGlobalRolesTab'
import { UserGroupRightsTab } from '../tabs/UserGroupRightsTab'
import { UserMediaTab } from '../tabs/UserMediaTab'
import { UserOverviewTab } from '../tabs/UserOverviewTab'
import { UserStreamingGrantsTab } from '../tabs/UserStreamingGrantsTab'

/**
 * D-03 (locked, exakter Wortlaut): Übersicht | Rollen & Rechte | Beiträge | Claims |
 * Streaming | Änderungen. Ersetzt die vorherige 9-Item-Accordion-Navigation durch die
 * echte, gesperrte 6-Tab-Struktur (138-15-PLAN.md).
 *
 * "Rollen & Rechte" komponiert UserGlobalRolesTab (globale Rollen, kompakte Sektion
 * oben) + UserGroupRightsTab (die kanonische, bereits pro Gruppe strukturierte
 * Gruppenrechte-Ansicht, die UserGroupMembershipsTab's Inhalt bereits absorbiert --
 * jede GroupSection zeigt Rollen UND Rechte pro Gruppe). Die eigenständige
 * UserGroupMembershipsTab-Einbindung entfällt hier bewusst (Komponente bleibt
 * unverändert im Baum, hat aber ab jetzt keinen Konsumenten mehr).
 *
 * "Beiträge" komponiert UserContributionsTab + UserMediaTab als zweite Sektion
 * (Medienuploads sind beitrags-nah, kein stiller Drop der bisherigen Medien-Ansicht --
 * dokumentierte, bewusste Entscheidung, siehe 138-15-SUMMARY.md).
 *
 * "Änderungen" ist die unveränderte UserAuditTab-Komponente, nur mit D-25-konformer
 * Tab-Beschriftung ("Änderungen" statt "Audit").
 */
type DetailTabId = 'overview' | 'roles-rights' | 'contributions' | 'claims' | 'streaming' | 'changes'

const DETAIL_TAB_IDS: DetailTabId[] = [
  'overview',
  'roles-rights',
  'contributions',
  'claims',
  'streaming',
  'changes',
]

const DEFAULT_DETAIL_TAB: DetailTabId = 'overview'

function parseDetailTab(value: string | null): DetailTabId {
  return DETAIL_TAB_IDS.includes(value as DetailTabId) ? (value as DetailTabId) : DEFAULT_DETAIL_TAB
}

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const userId = Number(params.id)
  const isValidUserId = Number.isInteger(userId) && userId > 0

  const fromQuery = searchParams.get('from')
  const backHref = fromQuery ? `/admin/users?${fromQuery}` : '/admin/users'

  // Deep-link preservation (139-07/D22): ?tab=roles-rights&group={fansubGroupId} continues to
  // pre-select and eagerly fetch exactly that ONE group's rights on mount.
  const groupQuery = searchParams.get('group')
  const initialGroupId = groupQuery ? Number(groupQuery) : undefined
  const parsedInitialGroupId =
    initialGroupId != null && Number.isInteger(initialGroupId) && initialGroupId > 0
      ? initialGroupId
      : undefined

  // Eigener, von den Tab-Komponenten unabhängiger Fetch nur für Titel/Status
  // im PageHeader (die Übersicht-Sektion selbst lädt ihre Daten unabhängig
  // über UserOverviewTab).
  const [overview, setOverview] = useState<AdminUserOverviewResponse | null>(null)

  const loadOverview = useCallback(async () => {
    if (!isValidUserId) {
      return
    }
    try {
      const resp = await getAdminUserOverview(userId)
      setOverview(resp)
    } catch {
      // Fehler wird bereits granular in der Übersicht-Sektion (UserOverviewTab)
      // angezeigt; der Header fällt auf den Nummern-Titel zurück.
    }
  }, [userId, isValidUserId])

  useEffect(() => {
    // Fetch-on-mount fuer den PageHeader-Titel/Status, unabhaengig vom
    // internen Fetch der Uebersicht-Sektion (UserOverviewTab).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview()
  }, [loadOverview])

  // ?tab=-URL-Sync-Konvention: identisch zu EpisodeVersionEditorPage.tsx
  // (parseActiveTab + router.replace mit scroll:false).
  const tabFromQuery = searchParams.get('tab')
  const initialTab = parseDetailTab(tabFromQuery)
  const [activeTab, setActiveTab] = useState<DetailTabId>(initialTab)
  // Lazy-Load-on-first-open (D-03/Pattern aus der vorherigen Accordion-Version):
  // jeder je besuchte Tab bleibt danach gemountet, kein Re-Fetch beim Zurückwechseln.
  // Startet mit dem tatsächlichen initialen Tab (aus ?tab=, nicht immer 'overview'),
  // sonst würde ein direkter Deep-Link auf einen anderen Tab dessen Inhalt nie mounten.
  const [loadedTabs, setLoadedTabs] = useState<Set<DetailTabId>>(new Set([initialTab]))

  function handleTabChange(id: string) {
    const nextTab = parseDetailTab(id)
    setActiveTab(nextTab)
    setLoadedTabs((prev) => new Set([...prev, nextTab]))
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('tab', nextTab)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  if (!isValidUserId) {
    return (
      <ErrorState
        title="Ungültige Benutzer-ID"
        description="Die aufgerufene URL enthält keine gültige Benutzer-ID."
      />
    )
  }

  const items: TabItem[] = [
    {
      id: 'overview',
      label: 'Übersicht',
      content: loadedTabs.has('overview') ? <UserOverviewTab userId={userId} /> : null,
    },
    {
      id: 'roles-rights',
      label: 'Rollen & Rechte',
      content: loadedTabs.has('roles-rights') ? (
        <div style={{ padding: 'var(--space-4)' }}>
          <SectionHeader title="Globale Rollen" />
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <UserGlobalRolesTab userId={userId} />
          </div>
          <UserGroupRightsTab userId={userId} initialGroupId={parsedInitialGroupId} />
        </div>
      ) : null,
    },
    {
      id: 'contributions',
      label: 'Beiträge',
      content: loadedTabs.has('contributions') ? (
        <div>
          <UserContributionsTab userId={userId} />
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <SectionHeader title="Medien" />
            <UserMediaTab userId={userId} />
          </div>
        </div>
      ) : null,
    },
    {
      id: 'claims',
      label: 'Claims',
      content: loadedTabs.has('claims') ? <UserClaimsTab userId={userId} /> : null,
    },
    {
      id: 'streaming',
      label: 'Streaming',
      content: loadedTabs.has('streaming') ? <UserStreamingGrantsTab userId={userId} /> : null,
    },
    {
      id: 'changes',
      label: 'Änderungen',
      content: loadedTabs.has('changes') ? <UserAuditTab userId={userId} /> : null,
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
      <Tabs
        items={items}
        activeId={activeTab}
        onActiveIdChange={handleTabChange}
        keepMountedIds={loadedTabs}
      />
    </>
  )
}
