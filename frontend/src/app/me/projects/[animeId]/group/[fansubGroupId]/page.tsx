'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Pencil, Search } from 'lucide-react'

import { Badge, Button, Card, ErrorState, Input, LoadingState, PageHeader, SectionHeader } from '@/components/ui'
import { ApiError, getMyProjectDetail } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeProjectDetail, MeProjectReleaseVersion } from '@/types/contributions'

import styles from './project.module.css'

type ReleaseFilterMode = 'mine' | 'all'

interface ProjectLoadState {
  key: string | null
  project: MeProjectDetail | null
  errorMessage: string | null
}

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function getProfileReturnPath(raw: string | null): string | null {
  return raw === '/me/profile' ? raw : null
}

function releaseLabel(release: MeProjectReleaseVersion): string {
  const episode = release.episode_number.trim() ? `Folge ${release.episode_number}` : 'Folge'
  const version = release.version.trim() || `Version #${release.release_version_id}`
  return `${episode} · ${version}`
}

function roleText(release: MeProjectReleaseVersion): string {
  if (!release.has_own_contribution) return 'Keine eigene Mitwirkung'
  const labels = release.role_labels.length > 0 ? release.role_labels : release.role_codes
  if (labels.length === 0) return 'Mitwirkung von dir'
  return `${labels.join(' & ')} von dir`
}

function filterReleases(
  releases: MeProjectReleaseVersion[],
  mode: ReleaseFilterMode,
  episodeQuery: string,
): MeProjectReleaseVersion[] {
  const base = mode === 'mine'
    ? releases.filter((release) => release.has_own_contribution)
    : releases

  const query = episodeQuery.trim().toLowerCase()
  if (mode !== 'all' || query === '') return base

  return base.filter((release) => release.episode_number.toLowerCase().includes(query))
}

export function MyProjectDetailPage() {
  const params = useParams<{ animeId: string; fansubGroupId: string }>()
  const searchParams = useSearchParams()
  const animeId = parsePositiveInt(params.animeId)
  const fansubGroupId = parsePositiveInt(params.fansubGroupId)
  const routeKey = animeId && fansubGroupId ? `${animeId}:${fansubGroupId}` : null
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken

  const [loadState, setLoadState] = useState<ProjectLoadState>({
    key: null,
    project: null,
    errorMessage: null,
  })
  const [mode, setMode] = useState<ReleaseFilterMode>('mine')
  const [episodeQuery, setEpisodeQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)
  const project = loadState.key === routeKey ? loadState.project : null
  const errorMessage = loadState.key === routeKey ? loadState.errorMessage : null
  const isLoading = routeKey !== null && loadState.key !== routeKey

  const routeErrorMessage = !animeId || !fansubGroupId
    ? 'Ungültige Projektadresse.'
    : !hasAuthSession
      ? 'Bitte einloggen, um dein Projekt zu öffnen.'
      : null

  useEffect(() => {
    if (!isClientInitialized) return
    if (!animeId || !fansubGroupId || !routeKey || routeErrorMessage) return

    let cancelled = false

    void getMyProjectDetail(animeId, fansubGroupId)
      .then((response) => {
        if (!cancelled) {
          setLoadState({
            key: routeKey,
            project: response.data,
            errorMessage: null,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadState({
            key: routeKey,
            project: null,
            errorMessage: readErrorMessage(error, 'Projekt konnte nicht geladen werden.'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [animeId, fansubGroupId, isClientInitialized, routeErrorMessage, routeKey])

  const filteredReleases = useMemo(
    () => filterReleases(project?.release_versions ?? [], mode, episodeQuery),
    [episodeQuery, mode, project],
  )
  const visibleReleases = filteredReleases.slice(0, visibleCount)
  const hasMore = visibleCount < filteredReleases.length

  if (!isClientInitialized) {
    return <LoadingState title="Projekt wird geladen" description="Team4s lädt deine Projektansicht." />
  }

  if (routeErrorMessage) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Projekt nicht verfügbar"
          description={routeErrorMessage}
          action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
        />
      </main>
    )
  }

  if (isLoading) {
    return <LoadingState title="Projekt wird geladen" description="Team4s lädt deine Projektansicht." />
  }

  if (errorMessage || !project) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Projekt nicht verfügbar"
          description={errorMessage ?? 'Dieses Projekt konnte nicht geladen werden.'}
          action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
        />
      </main>
    )
  }

  const mediaOverviewHref = `/admin/fansubs/${project.fansub_group_id}/edit?anime_id=${project.anime_id}&section=media`
  const projectReturnHref = `/me/projects/${project.anime_id}/group/${project.fansub_group_id}`
  const profileReturnHref = getProfileReturnPath(searchParams.get('return_to'))

  return (
    <main className={styles.page}>
      <PageHeader
        breadcrumbs={
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/me/contributions">Meine Projekte</Link>
            <span>/</span>
            <span>{project.anime_title}</span>
          </nav>
        }
        eyebrow="MEIN PROJEKT"
        title={project.anime_title}
        description={project.fansub_group_name}
        actions={
          <div className={styles.headerActions}>
            {profileReturnHref ? (
              <Button
                href={profileReturnHref}
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft size={15} aria-hidden="true" />}
              >
                Zurück zum Profil
              </Button>
            ) : null}
            <Button href={mediaOverviewHref} variant="secondary" size="sm">
              Medien zu {project.anime_title}
            </Button>
          </div>
        }
      />

      <section
        className={styles.cover}
        style={project.backdrop_url ? { backgroundImage: `url("${project.backdrop_url}")` } : undefined}
        aria-label={`Cover zu ${project.anime_title}`}
      >
        <div className={styles.coverOverlay}>
          <div>
            <p className={styles.coverEyebrow}>Projekt-Kopfbereich</p>
            <h2>{project.anime_title}</h2>
            <p>{project.fansub_group_name}</p>
          </div>
          <div className={styles.rolePanel}>
            <span>Deine Rollen insgesamt</span>
            <div className={styles.roleList}>
              {project.role_labels.map((label, index) => (
                <Badge key={`${project.role_codes[index] ?? label}-${label}`} variant="info">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Card variant="section" className={styles.releaseSection}>
        <SectionHeader
          title="Release-Versionen"
          description={`${filteredReleases.length} von ${project.release_versions.length} Versionen sichtbar`}
        />

        <div className={styles.toolbar}>
          <div className={styles.segmented} role="group" aria-label="Release-Versionen filtern">
            <button
              type="button"
              className={mode === 'mine' ? styles.segmentActive : undefined}
              onClick={() => {
                setMode('mine')
                setVisibleCount(20)
              }}
            >
              Nur meine Beiträge
            </button>
            <button
              type="button"
              className={mode === 'all' ? styles.segmentActive : undefined}
              onClick={() => {
                setMode('all')
                setVisibleCount(20)
              }}
            >
              Alle
            </button>
          </div>

          {mode === 'all' ? (
            <label className={styles.searchField}>
              <Search size={16} aria-hidden="true" />
              <Input
                value={episodeQuery}
                onChange={(event) => {
                  setEpisodeQuery(event.target.value)
                  setVisibleCount(20)
                }}
                placeholder="Folgen-Nummer suchen"
                aria-label="Folgen-Nummer suchen"
              />
            </label>
          ) : null}
        </div>

        <ul className={styles.releaseList}>
          {visibleReleases.map((release) => {
            const hasOwnArtifacts = release.has_own_notes || release.has_own_media
            return (
              <li
                key={release.release_version_id}
                className={release.has_own_contribution ? styles.releaseRow : styles.releaseRowMuted}
              >
                <div className={styles.releaseMain}>
                  <strong>{releaseLabel(release)}</strong>
                  {release.episode_title ? <span>{release.episode_title}</span> : null}
                  <small>{roleText(release)}</small>
                </div>
                {release.has_own_contribution ? (
                  <Button
                    href={`/me/releases/${release.release_version_id}/workspace?return_to=${encodeURIComponent(projectReturnHref)}`}
                    variant={hasOwnArtifacts ? 'primary' : 'secondary'}
                    size="sm"
                    leftIcon={<Pencil size={15} aria-hidden="true" />}
                    className={!hasOwnArtifacts ? styles.emptyWorkspaceButton : undefined}
                  >
                    Notizen & Medien
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>

        {visibleReleases.length === 0 ? (
          <p className={styles.emptyText}>Keine Release-Versionen für diesen Filter.</p>
        ) : null}

        {hasMore ? (
          <div className={styles.loadMoreRow}>
            <Button variant="secondary" onClick={() => setVisibleCount((current) => current + 20)}>
              Weitere laden
            </Button>
          </div>
        ) : null}
      </Card>
    </main>
  )
}

export default function Page() {
  return <MyProjectDetailPage />
}
