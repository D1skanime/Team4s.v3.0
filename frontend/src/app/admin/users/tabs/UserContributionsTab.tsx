'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
  DatePicker,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Pagination,
  SectionHeader,
  Select,
  Switch,
  Toolbar,
} from '@/components/ui'
import { ApiError, getAdminUserContributions } from '@/lib/api'
import { ROLE_CATALOG_CHIP_CLASS, labelForRole, presentationForRole } from '@/lib/roleCatalog'
import { normalizeRoleCodes } from '@/components/contributions/contributionRoles'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type {
  AdminContributionProjectBlock,
  AdminContributionRangeEntry,
  AdminUserContributionsPage,
} from '@/types/admin-users'

import { useUserContributionsFilters } from '../useUserContributionsFilters'
import styles from './contributionsTab.module.css'

/**
 * Phase 139 Plan 08 (D02/D03/D04/D05/D06/D08/D09/D10/D23, UADM-02/03/04/06/07/08): volle
 * Ersetzung des vorherigen flachen `Table`-Renderings (139-07-Platzhalter) durch die
 * gruppierte Karten-Projektion aus 139-UI-SPEC.md. Jeder Anime+Projekt-Block ist die
 * Paginierungseinheit; der Projektstandard ist immer sichtbar; echte Abweichungen stehen
 * immer inline, nie hinter einem Klick. Jeder Filter schreibt über
 * `useUserContributionsFilters` in die URL und löst einen Server-Refetch aus — keine
 * clientseitige Gruppierung/Filterung.
 */

const YEAR_MIN = 2000
const CURRENT_YEAR = new Date().getFullYear()

interface Props {
  userId: number
}

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message.trim().length > 0) return err.message
  return fallback
}

function RoleChipRow({
  roleCodes,
  contributionRoles,
}: {
  roleCodes: string[]
  contributionRoles: readonly RoleDefinitionOption[]
}) {
  if (roleCodes.length === 0) return null
  return (
    <div className={styles.roleChips}>
      {normalizeRoleCodes(contributionRoles, roleCodes).map((code) => (
        <Badge
          key={code}
          variant="neutral"
          className={ROLE_CATALOG_CHIP_CLASS}
          data-color-key={presentationForRole(contributionRoles, code).colorKey}
        >
          {labelForRole(contributionRoles, code)}
        </Badge>
      ))}
    </div>
  )
}

function rangeLabel(entry: AdminContributionRangeEntry): string {
  return entry.from_label === entry.to_label
    ? entry.from_label
    : `${entry.from_label} – ${entry.to_label}`
}

function RangeRow({
  entry,
  contributionRoles,
}: {
  entry: AdminContributionRangeEntry
  contributionRoles: readonly RoleDefinitionOption[]
}) {
  return (
    <div className={styles.rangeRow}>
      <div className={styles.rangeRowHeader}>
        <span className={styles.rangeLabel}>{rangeLabel(entry)}</span>
        {entry.is_deviation ? (
          <Badge variant="warning">Abweichung vom Projektstandard</Badge>
        ) : (
          <Badge variant="muted">Entspricht Projektstandard</Badge>
        )}
      </div>
      <RoleChipRow roleCodes={entry.role_codes} contributionRoles={contributionRoles} />
      {entry.is_deviation && entry.deviation_detail ? (
        <p className={styles.deviationDetail}>{entry.deviation_detail}</p>
      ) : null}
    </div>
  )
}

function ProjectBlockCard({
  block,
  contributionRoles,
}: {
  block: AdminContributionProjectBlock
  contributionRoles: readonly RoleDefinitionOption[]
}) {
  return (
    <Card variant="nestedFlat">
      <div className={styles.blockHeader}>
        <div className={styles.blockHeaderTitle}>
          <h3 className={styles.blockTitle}>{block.anime_title}</h3>
          <Badge variant="neutral">{block.fansub_group_name}</Badge>
        </div>
        <Button
          size="sm"
          variant="secondary"
          href={`/me/projects/${block.anime_id}/group/${block.fansub_group_id}`}
        >
          Projekt öffnen
        </Button>
      </div>

      <div className={styles.standardRow}>
        <span className={styles.standardLabel}>Projektstandard</span>
        <RoleChipRow
          roleCodes={block.project_standard.role_codes}
          contributionRoles={contributionRoles}
        />
        {block.project_standard.contributor_labels.length > 0 ? (
          <p className={styles.deviationDetail}>
            {block.project_standard.contributor_labels.join(', ')}
          </p>
        ) : null}
      </div>

      {block.range_entries.map((entry, index) => (
        <RangeRow
          key={`${entry.from_label}-${entry.to_label}-${index}`}
          entry={entry}
          contributionRoles={contributionRoles}
        />
      ))}
    </Card>
  )
}

export function UserContributionsTab({ userId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { roles: contributionRoles, error: roleCatalogError } = useRoleCatalog('anime_contribution')
  const {
    params,
    handleAnimeChange,
    handleGroupChange,
    handleRoleChange,
    handleOnlyDeviationsChange,
    handleDateRangeChange,
    handlePageChange,
  } = useUserContributionsFilters()

  const [data, setData] = useState<AdminUserContributionsPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserContributions(userId, params)
      setData(resp)
    } catch (err) {
      setError(readErrorMessage(err, 'Daten konnten nicht geladen werden. Erneut versuchen.'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, params])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Thin, file-local reset wrapper (139-08-PLAN.md's explicit escape hatch): clears only the
  // filter-owned URL keys, preserving unrelated params (e.g. ?tab=) that
  // useUserContributionsFilters itself does not know about. Calling every per-field setter in
  // sequence would not work here -- each setter closes over the same stale `searchParams`
  // snapshot, so only the last call would actually stick.
  const handleResetFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString())
    for (const key of ['anime_id', 'fansub_group_id', 'role_code', 'only_deviations', 'from', 'to', 'offset']) {
      next.delete(key)
    }
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const isFilterActive = Boolean(
    params.anime_id ||
      params.fansub_group_id ||
      params.role_code ||
      params.only_deviations ||
      params.from ||
      params.to,
  )

  const total = data?.meta.total ?? 0
  const limit = data?.meta.limit ?? params.limit ?? 25
  const currentPage = Math.floor((data?.meta.offset ?? params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const animeOptions = data?.filter_options.animes ?? []
  const groupOptions = data?.filter_options.groups ?? []

  return (
    <div className={styles.root}>
      <SectionHeader
        title="Beiträge"
        description="Informativ — zeigt die fachlichen Beiträge dieses Benutzers nach Anime und Projekt. Änderungen erfolgen in den bestehenden Projekt- und Release-Arbeitsflächen."
        actions={<Badge variant="neutral">{total}</Badge>}
      />

      <Toolbar
        leading={
          <div className={styles.toolbarFields}>
            <FormField label="Anime" htmlFor="contributions-filter-anime">
              <Select
                id="contributions-filter-anime"
                value={params.anime_id != null ? String(params.anime_id) : ''}
                onChange={(e) => handleAnimeChange(e.currentTarget.value)}
              >
                <option value="">Alle Animes</option>
                {animeOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Projekt/Gruppe" htmlFor="contributions-filter-group">
              <Select
                id="contributions-filter-group"
                value={params.fansub_group_id != null ? String(params.fansub_group_id) : ''}
                onChange={(e) => handleGroupChange(e.currentTarget.value)}
              >
                <option value="">Alle Gruppen</option>
                {groupOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Beitragsrolle" htmlFor="contributions-filter-role">
              <Select
                id="contributions-filter-role"
                value={params.role_code ?? ''}
                onChange={(e) => handleRoleChange(e.currentTarget.value)}
              >
                <option value="">Alle Rollen</option>
                {contributionRoles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label_de}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Von" htmlFor="contributions-filter-from">
              <DatePicker
                id="contributions-filter-from"
                label="Von"
                value={params.from ?? ''}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                maxDate={params.to || undefined}
                onChange={(value) => handleDateRangeChange(value, params.to ?? '')}
              />
            </FormField>

            <FormField label="Bis" htmlFor="contributions-filter-to">
              <DatePicker
                id="contributions-filter-to"
                label="Bis"
                value={params.to ?? ''}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                minDate={params.from || undefined}
                onChange={(value) => handleDateRangeChange(params.from ?? '', value)}
              />
            </FormField>

            <Switch
              checked={params.only_deviations ?? false}
              onCheckedChange={handleOnlyDeviationsChange}
              label="Nur Abweichungen"
            />
          </div>
        }
        trailing={
          <div className={styles.toolbarTrailing}>
            <Button variant="ghost" onClick={handleResetFilters}>
              Filter zurücksetzen
            </Button>
            <Badge variant="neutral">{total}</Badge>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState title="Beiträge werden geladen …" description="" />
      ) : error ? (
        <ErrorState
          title="Fehler beim Laden"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadData()}>
              Erneut versuchen
            </Button>
          }
        />
      ) : roleCatalogError ? (
        <ErrorState
          title="Rollen konnten nicht geladen werden"
          description="Die Beitragsrollen sind vorübergehend nicht verfügbar."
        />
      ) : !data || data.data.length === 0 ? (
        isFilterActive ? (
          <EmptyState
            title="Keine Beiträge für diese Filter."
            description="Filter anpassen oder zurücksetzen, um weitere Einträge zu sehen."
            action={
              <Button variant="ghost" onClick={handleResetFilters}>
                Filter zurücksetzen
              </Button>
            }
          />
        ) : (
          <EmptyState title="Keine Beiträge vorhanden." description="" />
        )
      ) : (
        <>
          <div className={styles.blockList}>
            {data.data.map((block) => (
              <ProjectBlockCard
                key={`${block.anime_id}-${block.fansub_group_id}`}
                block={block}
                contributionRoles={contributionRoles}
              />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  )
}
