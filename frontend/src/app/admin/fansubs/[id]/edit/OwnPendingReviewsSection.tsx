'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  FormField,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'
import type {
  ReleaseReviewImageCategory,
  ReleaseReviewType,
} from '@/types/releaseReviews'
import {
  formatReleaseReviewDateTime,
  readPositiveReviewNumber,
  readReviewCategory,
  readReviewType,
  RELEASE_REVIEW_CATEGORY_LABELS,
  releaseReviewQueueStatus,
} from '../../releaseReviewPresentation'
import styles from '../../releaseReviews.module.css'
import { useReleaseReviewMobileGate } from '../../useReleaseReviewMobileGate'
import { useReleaseReviewLane } from './useReleaseReviewLane'

/**
 * Read-only "Wartet auf Fremdprüfung" lane (D01/D03/RQUE-03): shows the actor's own
 * currently-pending release-review submissions with no decision actions, no reviewer
 * identity/count information, and no per-row navigation into the review detail route.
 * Consumes useReleaseReviewLane against view: 'own' -- the same shared fetch hook the
 * actionable queue (ReleaseReviewsSection.tsx) uses, but this lane owns no view toggle
 * and no per-row decision or submitter-identity columns.
 */
export function OwnPendingReviewsSection({ fansubId }: { fansubId: number }) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasActiveSession = hasAccessToken || hasRefreshToken
  const isMobile = useReleaseReviewMobileGate()
  const [animeId, setAnimeId] = useState<number | null>(null)
  const [releaseVersionId, setReleaseVersionId] = useState<number | null>(null)
  const [type, setType] = useState<ReleaseReviewType | null>(null)
  const [category, setCategory] = useState<ReleaseReviewImageCategory | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const {
    items,
    isLoading,
    isLoadingMore,
    error,
    pageError,
    nextCursor,
    reload,
    loadMore,
  } = useReleaseReviewLane({
    fansubId,
    view: 'own',
    animeId,
    releaseVersionId,
    type,
    category,
    search,
    enabled: isClientInitialized && hasActiveSession && !isMobile,
  })

  function resetFilters() {
    setAnimeId(null)
    setReleaseVersionId(null)
    setType(null)
    setCategory(null)
    setSearchInput('')
    setSearch('')
  }

  const animeOptions = useMemo(
    () => Array.from(new Map(items.map((item) => [
      item.anime_id,
      { id: item.anime_id, label: item.anime_title },
    ])).values()),
    [items],
  )
  const releaseOptions = useMemo(
    () => Array.from(new Map(
      items
        .filter((item) => !animeId || item.anime_id === animeId)
        .map((item) => [
          item.release_version_id,
          {
            id: item.release_version_id,
            label: `Episode ${item.episode_number} · ${item.release_version}`,
          },
        ]),
    ).values()),
    [animeId, items],
  )
  const hasFilters = Boolean(animeId || releaseVersionId || type || category || search)

  if (isMobile) {
    return (
      <div className={styles.mobileGate}>
        <h2>Prüfungen benötigen mehr Platz</h2>
        <p>Öffne diesen Bereich auf einem Tablet oder Computer, um Beiträge sicher zu prüfen.</p>
        <Button href={`/admin/fansubs/${fansubId}/edit`} variant="secondary">
          Zur Gruppenübersicht
        </Button>
      </div>
    )
  }

  if (!isClientInitialized) return <LoadingState title="Prüfungen werden vorbereitet" />
  if (!hasActiveSession) {
    return <div className={styles.inlineError}>Anmeldung erforderlich.</div>
  }

  return (
    <section className={styles.workspace}>
      <div className={styles.headerStack}>
        <SectionHeader
          title="Wartet auf Fremdprüfung"
          description="Deine eigenen offenen Einreichungen — sie warten auf Prüfung durch eine andere Person."
          underline
        />
      </div>

      <Toolbar>
        <div className={styles.filterGrid}>
          <FormField label="Projekt / Anime" htmlFor="own-pending-review-anime">
            <Select
              id="own-pending-review-anime"
              value={animeId ?? ''}
              onChange={(event) => {
                setAnimeId(readPositiveReviewNumber(event.target.value))
                setReleaseVersionId(null)
              }}
            >
              <option value="">Alle Projekte</option>
              {animeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Episode / Release" htmlFor="own-pending-review-release">
            <Select
              id="own-pending-review-release"
              value={releaseVersionId ?? ''}
              onChange={(event) => setReleaseVersionId(readPositiveReviewNumber(event.target.value))}
            >
              <option value="">Alle Releases</option>
              {releaseOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Typ" htmlFor="own-pending-review-type">
            <Select
              id="own-pending-review-type"
              value={type ?? ''}
              onChange={(event) => {
                const nextType = readReviewType(event.target.value)
                setType(nextType)
                if (nextType !== 'image') setCategory(null)
              }}
            >
              <option value="">Alle Typen</option>
              <option value="text">Texte</option>
              <option value="image">Bilder</option>
            </Select>
          </FormField>
          <FormField label="Bildkategorie" htmlFor="own-pending-review-category" disabled={type !== 'image'}>
            <Select
              id="own-pending-review-category"
              value={category ?? ''}
              disabled={type !== 'image'}
              onChange={(event) => setCategory(readReviewCategory(event.target.value))}
            >
              <option value="">Alle Kategorien</option>
              {Object.entries(RELEASE_REVIEW_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Suche" htmlFor="own-pending-review-search">
            <Input
              id="own-pending-review-search"
              type="search"
              value={searchInput}
              maxLength={200}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </FormField>
          <div className={styles.filterActions}>
            <Button variant="secondary" onClick={resetFilters} disabled={!hasFilters}>
              Filter zurücksetzen
            </Button>
          </div>
        </div>
      </Toolbar>

      {error ? (
        <div className={styles.inlineError} role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => reload()}>Erneut versuchen</Button>
        </div>
      ) : isLoading ? (
        <LoadingState title="Prüfungen werden geladen" description="Die Prüfliste wird abgerufen." />
      ) : (
        <>
          <div className={styles.tableRegion}>
            <Table caption="Eigene offene Einreichungen">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Eingereicht</TableHeaderCell>
                  <TableHeaderCell className={styles.desktopOnly}>Projekt</TableHeaderCell>
                  <TableHeaderCell className={styles.desktopOnly}>Episode / Release</TableHeaderCell>
                  <TableHeaderCell className={styles.tabletOnly}>Projekt / Release</TableHeaderCell>
                  <TableHeaderCell>Typ</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableEmptyState
                    colSpan={5}
                    title="Keine offenen Einreichungen"
                    description="Du hast aktuell keine eigenen Einreichungen, die auf Prüfung warten."
                  />
                ) : items.map((item) => {
                  const status = releaseReviewQueueStatus(item.status)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatReleaseReviewDateTime(item.submitted_at)}</TableCell>
                      <TableCell className={styles.desktopOnly}>{item.anime_title}</TableCell>
                      <TableCell className={styles.desktopOnly}>
                        Episode {item.episode_number} · {item.release_version}
                      </TableCell>
                      <TableCell className={`${styles.tabletOnly} ${styles.contextCell}`}>
                        <strong className={styles.contextPrimary}>{item.anime_title}</strong>
                        <span className={styles.contextSecondary}>
                          Episode {item.episode_number} · {item.release_version}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className={styles.typeStack}>
                          <span>{item.type === 'text' ? 'Text' : 'Bild'}</span>
                          {item.category ? (
                            <Badge className={styles.tabletOnly} variant="muted">
                              {RELEASE_REVIEW_CATEGORY_LABELS[item.category]}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {nextCursor || pageError ? (
            <div className={styles.loadFooter} aria-live="polite">
              {pageError ? (
                <div>
                  <p className={styles.fieldError}>{pageError}</p>
                  <Button variant="secondary" onClick={() => loadMore()}>Erneut versuchen</Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  loading={isLoadingMore}
                  onClick={() => loadMore()}
                >
                  Weitere Einreichungen laden
                </Button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
