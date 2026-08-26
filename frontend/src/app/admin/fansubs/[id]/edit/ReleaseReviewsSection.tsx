'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  ReleaseReviewView,
} from '@/types/releaseReviews'
import {
  formatReleaseReviewDateTime,
  readPositiveReviewNumber,
  readReviewCategory,
  readReviewType,
  readReviewView,
  RELEASE_REVIEW_CATEGORY_LABELS,
  releaseReviewQueueStatus,
} from '../../releaseReviewPresentation'
import styles from '../../releaseReviews.module.css'
import { useReleaseReviewMobileGate } from '../../useReleaseReviewMobileGate'
import { useReleaseReviewLane } from './useReleaseReviewLane'
export function ReleaseReviewsSection({ fansubId }: { fansubId: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasActiveSession = hasAccessToken || hasRefreshToken
  const isMobile = useReleaseReviewMobileGate()
  const [view, setView] = useState<ReleaseReviewView>(() => readReviewView(searchParams.get('view')))
  const [animeId, setAnimeId] = useState<number | null>(() => readPositiveReviewNumber(searchParams.get('anime_id')))
  const [releaseVersionId, setReleaseVersionId] = useState<number | null>(
    () => readPositiveReviewNumber(searchParams.get('release_version_id')),
  )
  const [type, setType] = useState<ReleaseReviewType | null>(() => readReviewType(searchParams.get('type')))
  const [category, setCategory] = useState<ReleaseReviewImageCategory | null>(
    () => readReviewCategory(searchParams.get('category')),
  )
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!isClientInitialized || !hasActiveSession || isMobile) return
    const query = new URLSearchParams()
    query.set('tab', 'pruefungen')
    if (view !== 'open') query.set('view', view)
    if (animeId) query.set('anime_id', String(animeId))
    if (releaseVersionId) query.set('release_version_id', String(releaseVersionId))
    if (type) query.set('type', type)
    if (category) query.set('category', category)
    if (search) query.set('search', search)
    router.replace(`${pathname}?${query.toString()}`, { scroll: false })
  }, [
    animeId,
    category,
    hasActiveSession,
    isClientInitialized,
    isMobile,
    pathname,
    releaseVersionId,
    router,
    search,
    type,
    view,
  ])

  const {
    items,
    counts,
    nextCursor,
    isLoading,
    isLoadingMore,
    error,
    pageError,
    reload,
    loadMore,
  } = useReleaseReviewLane({
    fansubId,
    view,
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
  const caption = view === 'open'
    ? 'Offene Prüfungen der Fansubgruppe'
    : 'Prüfverlauf der Fansubgruppe'
  const emptyStateDescription = view === 'history'
    ? 'Für die gewählten Filter liegen keine vergangenen Entscheidungen vor.'
    : hasFilters
      ? 'Für die gewählten Filter sind aktuell keine Prüfungen offen. Passe die Filter an oder setze sie zurück.'
      : 'Aktuell keine Prüfungen für dich offen.'

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
          title="Prüfungen"
          description='Release-Texte und Release-Bilder einzeln prüfen und sicher entscheiden. Eigene Einreichungen zählen nicht mit — sie erscheinen unter „Wartet auf Fremdprüfung".'
          underline
        />
        <div className={styles.counters} aria-label="Prüfungen, die du entscheiden kannst, nach Typ">
          <Badge variant="info">Texte {counts.text}</Badge>
          <Badge variant="info">Bilder {counts.image}</Badge>
        </div>
        <div className={styles.viewSwitch} aria-label="Prüfungsansicht">
          <Button
            variant={view === 'open' ? 'primary' : 'subtle'}
            aria-pressed={view === 'open'}
            onClick={() => setView('open')}
          >
            Offen
          </Button>
          <Button
            variant={view === 'history' ? 'primary' : 'subtle'}
            aria-pressed={view === 'history'}
            onClick={() => setView('history')}
          >
            Verlauf
          </Button>
        </div>
      </div>

      <Toolbar>
        <div className={styles.filterGrid}>
          <FormField label="Projekt / Anime" htmlFor="release-review-anime">
            <Select
              id="release-review-anime"
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
          <FormField label="Episode / Release" htmlFor="release-review-release">
            <Select
              id="release-review-release"
              value={releaseVersionId ?? ''}
              onChange={(event) => setReleaseVersionId(readPositiveReviewNumber(event.target.value))}
            >
              <option value="">Alle Releases</option>
              {releaseOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          {counts.allowed_types.length > 1 ? (
            <FormField label="Typ" htmlFor="release-review-type">
              <Select
                id="release-review-type"
                value={type ?? ''}
                onChange={(event) => {
                  const nextType = readReviewType(event.target.value)
                  setType(nextType)
                  if (nextType !== 'image') setCategory(null)
                }}
              >
                <option value="">Alle Typen</option>
                {counts.allowed_types.includes('text') ? (
                  <option value="text">Texte</option>
                ) : null}
                {counts.allowed_types.includes('image') ? (
                  <option value="image">Bilder</option>
                ) : null}
              </Select>
            </FormField>
          ) : null}
          {counts.allowed_types.includes('image') ? (
            <FormField label="Bildkategorie" htmlFor="release-review-category" disabled={type !== 'image'}>
              <Select
                id="release-review-category"
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
          ) : null}
          <FormField label="Suche" htmlFor="release-review-search">
            <Input
              id="release-review-search"
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
            <Table caption={caption} variant="withActions">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Eingegangen</TableHeaderCell>
                  <TableHeaderCell className={styles.desktopOnly}>Projekt</TableHeaderCell>
                  <TableHeaderCell className={styles.desktopOnly}>Episode / Release</TableHeaderCell>
                  <TableHeaderCell className={styles.tabletOnly}>Projekt / Release</TableHeaderCell>
                  <TableHeaderCell>Typ</TableHeaderCell>
                  <TableHeaderCell className={styles.desktopOnly}>Kategorie</TableHeaderCell>
                  <TableHeaderCell>Einreicher</TableHeaderCell>
                  <TableHeaderCell>Aktion</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableEmptyState
                    colSpan={7}
                    title={view === 'open' ? 'Keine offenen Prüfungen' : 'Kein Prüfverlauf'}
                    description={emptyStateDescription}
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
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <span>{item.type === 'text' ? 'Text' : 'Bild'}</span>
                          {item.category ? (
                            <Badge className={styles.tabletOnly} variant="muted">
                              {RELEASE_REVIEW_CATEGORY_LABELS[item.category]}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className={styles.desktopOnly}>
                        {item.category ? RELEASE_REVIEW_CATEGORY_LABELS[item.category] : '—'}
                      </TableCell>
                      <TableCell>{item.submitter_display_name}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/fansubs/${fansubId}/reviews/${encodeURIComponent(item.id)}`}
                        >
                          Öffnen
                        </Link>
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
                  Weitere Prüfungen laden
                </Button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
