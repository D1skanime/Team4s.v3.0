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
  Toolbar,
} from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { ApiError, getAdminUserMedia } from '@/lib/api'
import type {
  AdminMediaItem,
  AdminMediaReleaseBlock,
  AdminUserMediaPage,
} from '@/types/admin-users'

import { useUserMediaFilters } from '../useUserMediaFilters'
import styles from './mediaTab.module.css'

/**
 * Phase 139 Plan 09 (D11/D12/D13/D14/D15/D16/D17/D18/D19/D23, UADM-05/06/07/08): volle
 * Ersetzung von 139-07's Kompatibilitäts-Platzhalter durch die UI-SPEC-gesperrte
 * Release-/Episoden-Block-Projektion. `hasScopePermission()` (der fake "Berechtigung
 * aktiv/fehlt"-Badge) und `groupByReleaseVersion()` (clientseitige Gruppierung über die
 * vollständige, unbegrenzte Antwort — genau das von D23 verbotene Anti-Pattern) existieren in
 * diesem Modul nicht mehr, ersatzlos. Jeder Block ist die serverseitig bereits gruppierte
 * Paginierungseinheit; jeder Filter schreibt über `useUserMediaFilters` in die URL und löst
 * einen Server-Refetch aus — keine clientseitige Nachfilterung/-Gruppierung.
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

// Existierende de-DE-Konvention dieses Tabs (Datum + Uhrzeit), unverändert aus der Vorversion
// übernommen -- keine zweite Formatierungsfunktion an anderer Stelle im Code, siehe
// 139-09-PLAN.md's read_first-Hinweis.
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// Sub-line pro Block: "Episode 5 · Version 1" bzw. bei fehlender Episode "Version 1" — niemals
// der rohe release_version_id-Integer oder die Zeichenkette "release_version:" (D19).
function blockSubline(block: AdminMediaReleaseBlock): string {
  return block.episode_number
    ? `Episode ${block.episode_number} · Version ${block.release_version_label}`
    : `Version ${block.release_version_label}`
}

function MediaItemRow({ item }: { item: AdminMediaItem }) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.thumbnail}>
        <ResponsiveImage
          src={item.public_url}
          alt={item.original_filename || item.media_type}
          fill
          loading="lazy"
          sizes="(max-width: 600px) 64px, 96px"
          className={styles.thumbnailImg}
        />
      </div>
      <div className={styles.itemMeta}>
        <span className={styles.itemMetaLine}>Hochgeladen: {formatDate(item.uploaded_at)}</span>
        <Badge variant="neutral">{item.media_type}</Badge>
      </div>
    </div>
  )
}

// Ein Release-/Episoden-Block: die Paginierungseinheit (D11/D12). Genau EIN kanonischer
// Aktions-Button pro BLOCK, nicht pro Medien-Item (D15/D16).
function ReleaseBlockCard({ block }: { block: AdminMediaReleaseBlock }) {
  return (
    <Card variant="nestedFlat">
      <div className={styles.blockHeader}>
        <div className={styles.blockHeaderTitle}>
          <h3 className={styles.blockTitle}>
            {block.anime_title} · {block.fansub_group_name}
          </h3>
          <span className={styles.blockSubline}>{blockSubline(block)}</span>
        </div>
        <Button
          size="sm"
          variant="primary"
          href={`/me/releases/${block.release_version_id}/workspace`}
        >
          Release-Medien öffnen
        </Button>
      </div>

      <div className={styles.itemsList}>
        {block.items.map((item) => (
          <MediaItemRow key={item.media_asset_id} item={item} />
        ))}
      </div>
    </Card>
  )
}

export function UserMediaTab({ userId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    params,
    handleAnimeChange,
    handleGroupChange,
    handleReleaseOrEpisodeChange,
    handleMediaTypeChange,
    handleDateRangeChange,
    handlePageChange,
  } = useUserMediaFilters()

  const [data, setData] = useState<AdminUserMediaPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserMedia(userId, params)
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

  // Thin, file-local reset wrapper (139-08-PLAN.md's precedent escape hatch, mirrored here):
  // clears only the filter-owned URL keys, preserving unrelated params (e.g. ?tab=). Calling
  // every per-field setter from useUserMediaFilters in sequence would not work -- each setter
  // closes over the same stale `searchParams` snapshot, so only the last call would stick.
  const handleResetFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString())
    for (const key of [
      'anime_id',
      'fansub_group_id',
      'release_version_id',
      'media_type',
      'from',
      'to',
      'offset',
    ]) {
      next.delete(key)
    }
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const isFilterActive = Boolean(
    params.anime_id ||
      params.fansub_group_id ||
      params.release_version_id ||
      params.media_type ||
      params.from ||
      params.to,
  )

  const total = data?.meta.total ?? 0
  const limit = data?.meta.limit ?? params.limit ?? 25
  const currentPage = Math.floor((data?.meta.offset ?? params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const animeOptions = data?.filter_options.animes ?? []
  const groupOptions = data?.filter_options.groups ?? []
  const releaseOrEpisodeOptions = data?.filter_options.releases_or_episodes ?? []
  const mediaTypeOptions = data?.filter_options.media_types ?? []

  return (
    <div className={styles.root}>
      <SectionHeader
        title="Medien"
        description="Informativ — zeigt Medien, die diesem Benutzer im jeweiligen Anime-, Projekt- und Release-Kontext zugeordnet sind. Änderungen erfolgen in der Release-Medien-Arbeitsfläche."
        actions={<Badge variant="neutral">{total}</Badge>}
      />

      <Toolbar
        leading={
          <div className={styles.toolbarFields}>
            <FormField label="Anime" htmlFor="media-filter-anime">
              <Select
                id="media-filter-anime"
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

            <FormField label="Projekt/Gruppe" htmlFor="media-filter-group">
              <Select
                id="media-filter-group"
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

            <FormField label="Release/Episode" htmlFor="media-filter-release">
              <Select
                id="media-filter-release"
                value={params.release_version_id != null ? String(params.release_version_id) : ''}
                onChange={(e) => handleReleaseOrEpisodeChange(e.currentTarget.value)}
              >
                <option value="">Alle Releases/Episoden</option>
                {releaseOrEpisodeOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Medientyp" htmlFor="media-filter-type">
              <Select
                id="media-filter-type"
                value={params.media_type ?? ''}
                onChange={(e) => handleMediaTypeChange(e.currentTarget.value)}
              >
                <option value="">Alle Medientypen</option>
                {mediaTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Von" htmlFor="media-filter-from">
              <DatePicker
                id="media-filter-from"
                label="Von"
                value={params.from ?? ''}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                maxDate={params.to || undefined}
                onChange={(value) => handleDateRangeChange(value, params.to ?? '')}
              />
            </FormField>

            <FormField label="Bis" htmlFor="media-filter-to">
              <DatePicker
                id="media-filter-to"
                label="Bis"
                value={params.to ?? ''}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                minDate={params.from || undefined}
                onChange={(value) => handleDateRangeChange(params.from ?? '', value)}
              />
            </FormField>
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
        <LoadingState title="Medien werden geladen …" description="" />
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
      ) : !data || data.data.length === 0 ? (
        isFilterActive ? (
          <EmptyState
            title="Keine Medien für diese Filter."
            description="Filter anpassen oder zurücksetzen, um weitere Einträge zu sehen."
            action={
              <Button variant="ghost" onClick={handleResetFilters}>
                Filter zurücksetzen
              </Button>
            }
          />
        ) : (
          <EmptyState title="Keine Medien vorhanden." description="" />
        )
      ) : (
        <>
          <div className={styles.blockList}>
            {data.data.map((block) => (
              <ReleaseBlockCard
                key={`${block.release_version_id}-${block.anime_id}-${block.fansub_group_id}-${block.episode_number ?? ''}`}
                block={block}
              />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  )
}
