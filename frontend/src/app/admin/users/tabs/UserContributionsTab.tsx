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
import { ApiError, getAdminUserContributions } from '@/lib/api'
import { labelForRole, presentationForRole } from '@/lib/roleCatalog'
import { normalizeRoleCodes } from '@/components/contributions/contributionRoles'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type {
  AdminContributionProjectBlock,
  AdminUserContributionsPage,
} from '@/types/admin-users'

/**
 * Plan 139-07 compile-compatibility note: this is a MINIMAL adaptation to 139-03's real
 * server-side grouped/paginated contract (AdminUserContributionsPage), required because
 * 139-07's api.ts change (paginated getAdminUserContributions) otherwise breaks the
 * production build (the old response shape -- project_defaults/release_overrides/
 * open_disputes/legacy_historical -- no longer exists on the wire). The full UI-SPEC-mandated
 * rewrite (filters, standard-range collapse visuals, pagination controls, D-13 informational
 * banner) is Plan 139-08's explicit scope -- see 139-CONTEXT.md/139-UI-SPEC.md. This render
 * intentionally stays close to the existing Table/Badge visual language without inventing new
 * UI-SPEC-owned interaction design.
 */

interface Props {
  userId: number
}

function RoleBadges({
  roleCodes,
  contributionRoles,
}: {
  roleCodes: string[]
  contributionRoles: readonly RoleDefinitionOption[]
}) {
  if (roleCodes.length === 0) return <Badge variant="muted">–</Badge>
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {normalizeRoleCodes(contributionRoles, roleCodes).map((code) => {
        const presentation = presentationForRole(contributionRoles, code)
        return (
          <Badge
            key={code}
            variant="neutral"
            data-role-code={presentation.colorKey}
            data-role-icon={presentation.iconKey}
          >
            {labelForRole(contributionRoles, code)}
          </Badge>
        )
      })}
    </div>
  )
}

function ProjectBlockSection({
  block,
  contributionRoles,
}: {
  block: AdminContributionProjectBlock
  contributionRoles: readonly RoleDefinitionOption[]
}) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader
        title={block.anime_title}
        description={block.fansub_group_name}
        actions={<Badge variant="neutral">{block.range_entries.length}</Badge>}
      />
      <Table variant="compact">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Bereich</TableHeaderCell>
            <TableHeaderCell>Rollen</TableHeaderCell>
            <TableHeaderCell>Hinweis</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>Projektstandard</TableCell>
            <TableCell>
              <RoleBadges roleCodes={block.project_standard.role_codes} contributionRoles={contributionRoles} />
            </TableCell>
            <TableCell>
              {block.project_standard.contributor_labels.length > 0 ? (
                block.project_standard.contributor_labels.join(', ')
              ) : (
                <Badge variant="muted">–</Badge>
              )}
            </TableCell>
          </TableRow>
          {block.range_entries.map((entry, index) => (
            <TableRow key={`${entry.from_label}-${entry.to_label}-${index}`}>
              <TableCell>
                {entry.from_label === entry.to_label
                  ? entry.from_label
                  : `${entry.from_label} – ${entry.to_label}`}
              </TableCell>
              <TableCell>
                <RoleBadges roleCodes={entry.role_codes} contributionRoles={contributionRoles} />
              </TableCell>
              <TableCell>
                {entry.is_deviation ? (
                  <Badge variant="warning">{entry.deviation_detail ?? 'Abweichung'}</Badge>
                ) : (
                  <Badge variant="muted">Standard</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function UserContributionsTab({ userId }: Props) {
  const { roles: contributionRoles, error: roleCatalogError } = useRoleCatalog('anime_contribution')
  const [data, setData] = useState<AdminUserContributionsPage | null>(null)
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
  if (roleCatalogError) {
    return (
      <ErrorState
        title="Rollen konnten nicht geladen werden"
        description="Die Beitragsrollen sind vorübergehend nicht verfügbar."
      />
    )
  }
  if (!data || data.data.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <EmptyState title="Keine Beiträge vorhanden." description="" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {data.data.map((block) => (
        <ProjectBlockSection
          key={`${block.anime_id}-${block.fansub_group_id}`}
          block={block}
          contributionRoles={contributionRoles}
        />
      ))}
    </div>
  )
}
