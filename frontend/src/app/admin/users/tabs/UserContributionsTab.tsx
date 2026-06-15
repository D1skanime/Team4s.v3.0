'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
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
import { ApiError, getAdminUserContributions } from '@/lib/api'
import type {
  AdminContributionItem,
  AdminUserContributionsResponse,
} from '@/types/admin-users'

interface Props {
  userId: number
}

// Hilfsfunktion: Rollenbezeichner leserlich darstellen
function roleLabel(code: string): string {
  return code
}

interface ContributionSectionProps {
  title: string
  items: AdminContributionItem[]
  showReleaseVersion?: boolean
  showDisputeState?: boolean
  isLegacy?: boolean
}

function ContributionSection({
  title,
  items,
  showReleaseVersion = false,
  showDisputeState = false,
  isLegacy = false,
}: ContributionSectionProps) {
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader
        title={title}
        actions={
          <Badge variant="neutral">{items.length}</Badge>
        }
      />
      <Table variant="compact">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Anime</TableHeaderCell>
            <TableHeaderCell>Gruppe</TableHeaderCell>
            {showReleaseVersion && <TableHeaderCell>Release-Version</TableHeaderCell>}
            {showDisputeState && <TableHeaderCell>Streitstatus</TableHeaderCell>}
            {isLegacy && <TableHeaderCell>Hinweis</TableHeaderCell>}
            <TableHeaderCell>Rollen</TableHeaderCell>
            {showReleaseVersion && <TableHeaderCell>Aktion</TableHeaderCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.contribution_id}-${item.release_version_id ?? 'null'}`}>
              <TableCell style={{ fontWeight: 600 }}>{item.anime_title}</TableCell>
              <TableCell>{item.fansub_group_name}</TableCell>
              {showReleaseVersion && (
                <TableCell>
                  {item.release_version_id != null ? (
                    <Badge variant="info">Version {item.release_version_id}</Badge>
                  ) : (
                    <Badge variant="muted">–</Badge>
                  )}
                </TableCell>
              )}
              {showDisputeState && (
                <TableCell>
                  <Badge variant="warning">{item.dispute_state}</Badge>
                </TableCell>
              )}
              {isLegacy && (
                <TableCell>
                  <Badge variant="muted">Historisch</Badge>
                </TableCell>
              )}
              <TableCell>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {item.role_codes.length === 0 ? (
                    <Badge variant="muted">–</Badge>
                  ) : (
                    item.role_codes.map((code) => (
                      <Badge key={code} variant="neutral">{roleLabel(code)}</Badge>
                    ))
                  )}
                </div>
              </TableCell>
              {showReleaseVersion && item.release_version_id != null && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/admin/fansubs/${item.fansub_group_id}/edit`,
                        '_blank',
                      )
                    }
                  >
                    Release-Version öffnen
                  </Button>
                </TableCell>
              )}
              {showReleaseVersion && item.release_version_id == null && (
                <TableCell />
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function UserContributionsTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserContributionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserContributions(userId)
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
  if (!data) return <EmptyState title="Keine Beiträge vorhanden." description="" />

  const total =
    data.project_defaults.length +
    data.release_overrides.length +
    data.open_disputes.length +
    data.legacy_historical.length

  if (total === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <EmptyState title="Keine Beiträge vorhanden." description="" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* D-13: Vier Sektionen; leere Gruppen ausgeblendet */}
      <ContributionSection
        title="Projektweite Beiträge (Standard)"
        items={data.project_defaults}
        showReleaseVersion={false}
      />
      <ContributionSection
        title="Release-spezifische Overrides"
        items={data.release_overrides}
        showReleaseVersion={true}
      />
      <ContributionSection
        title="Offene / strittige Beiträge"
        items={data.open_disputes}
        showReleaseVersion={false}
        showDisputeState={true}
      />
      <ContributionSection
        title="Historisch / Legacy"
        items={data.legacy_historical}
        showReleaseVersion={false}
        isLegacy={true}
      />
    </div>
  )
}
