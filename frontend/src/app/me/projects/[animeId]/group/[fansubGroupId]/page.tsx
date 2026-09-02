'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Pencil, Search } from 'lucide-react'

import { Badge, Button, Card, ErrorState, Input, LoadingState, PageHeader, SectionHeader } from '@/components/ui'
import { ApiError, getMyProjectDetail } from '@/lib/api'
import { categoryForRole, getRole, labelForRole, orderForContext } from '@/lib/roleCatalog'
import { useAuthSession } from '@/lib/useAuthSession'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { MeProjectDetail, MeProjectReleaseVersion } from '@/types/contributions'

import styles from './project.module.css'

type ReleaseFilterMode = 'all' | 'open' | 'done'

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

function releaseLabel(release: MeProjectReleaseVersion, groupName: string): string {
  const episodeNumber = release.episode_number.trim()
  const episodeTitle = release.episode_title?.trim()
  const episode = episodeNumber
    ? 'Folge ' + episodeNumber + (episodeTitle ? ' · ' + episodeTitle : '')
    : episodeTitle || 'Folge'
  const group = groupName.trim() || 'Fansubgruppe'
  const version = release.version.trim() || 'Version #' + release.release_version_id
  return episode + ' · ' + group + ' · ' + version
}

function isDone(release: MeProjectReleaseVersion): boolean {
  return release.has_own_notes || release.has_own_media
}

function normalizeEpisodeNumber(value: string): string {
  return value.trim().toLowerCase().replace(/^0+(?=\d)/, '')
}

function filterReleases(
  releases: MeProjectReleaseVersion[],
  mode: ReleaseFilterMode,
  episodeQuery: string,
): MeProjectReleaseVersion[] {
  const assigned = releases.filter((release) => release.has_own_contribution)

  let base: MeProjectReleaseVersion[]
  if (mode === 'open') {
    base = assigned.filter((release) => !isDone(release))
  } else if (mode === 'done') {
    base = assigned.filter((release) => isDone(release))
  } else {
    // 'all': offene Folgen zuerst, erledigte danach; stabiler Sort erhält
    // die Eingabereihenfolge innerhalb jeder Gruppe.
    base = [...assigned].sort((a, b) => Number(isDone(a)) - Number(isDone(b)))
  }

  const query = normalizeEpisodeNumber(episodeQuery)
  if (query === '') return base

  return base.filter((release) => normalizeEpisodeNumber(release.episode_number) === query)
}

function MyProjectDetailPage() {
  const params = useParams<{ animeId: string; fansubGroupId: string }>()
  const searchParams = useSearchParams()
  const animeId = parsePositiveInt(params.animeId)
  const fansubGroupId = parsePositiveInt(params.fansubGroupId)
  const routeKey = animeId && fansubGroupId ? `${animeId}:${fansubGroupId}` : null
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')

  const [loadState, setLoadState] = useState<ProjectLoadState>({
    key: null,
    project: null,
    errorMessage: null,
  })
  const [mode, setMode] = useState<ReleaseFilterMode>('all')
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

  const projectRoles = useMemo(() => {
    const orderedCodes = new Map(
      orderForContext(contributionRoles, 'anime_contribution')
        .map((role, index) => [role.code, index]),
    )

    return (project?.role_codes ?? []).map((code, index) => ({
      code,
      label: getRole(contributionRoles, code)
        ? labelForRole(contributionRoles, code)
        : project?.role_labels[index]?.trim() || labelForRole(contributionRoles, code),
      inputIndex: index,
    })).sort((left, right) => {
      const leftOrder = orderedCodes.get(left.code) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = orderedCodes.get(right.code) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder || left.inputIndex - right.inputIndex
    })
  }, [contributionRoles, project])

  const assignedReleases = project?.release_versions.filter((release) => release.has_own_contribution) ?? []
  const assignedCount = assignedReleases.length
  const openCount = assignedReleases.filter((release) => !isDone(release)).length
  const doneCount = assignedReleases.filter((release) => isDone(release)).length
  const hasActiveSearch = episodeQuery.trim() !== ''

  let emptyText: string | null = null
  if (visibleReleases.length === 0) {
    if (assignedCount === 0) {
      emptyText = 'Du bist noch keiner Folge in diesem Projekt zugeordnet.'
    } else if (hasActiveSearch) {
      emptyText = 'Keine Release-Versionen für diesen Filter.'
    } else if (mode === 'open') {
      emptyText = 'Alle deine Folgen sind erledigt.'
    } else if (mode === 'done') {
      emptyText = 'Noch keine Folge erledigt.'
    } else {
      emptyText = 'Keine Release-Versionen für diesen Filter.'
    }
  }

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
      />

      <Card title="Deine Projektrollen" className={styles.rolesCard}>
        <div className={styles.roleDetailList} role="group" aria-label="Deine Projektrollen in diesem Projekt">
          {projectRoles.map((role) => (
            <div
              key={role.code}
              className={styles.roleDetailRow}
              data-role-code={categoryForRole(contributionRoles, role.code)}
              style={{ borderInlineStartColor: 'var(--role-accent)', borderInlineStartWidth: 3 }}
            >
              <strong>{role.label}</strong>
              <small>Für das gesamte Projekt</small>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="section" className={styles.releaseSection}>
        <SectionHeader
          title="Release-Versionen"
          description={`${openCount} offen · ${doneCount} erledigt`}
        />

        <div className={styles.toolbar}>
          <div className={styles.segmented} role="group" aria-label="Release-Versionen filtern">
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
            <button
              type="button"
              className={mode === 'open' ? styles.segmentActive : undefined}
              onClick={() => {
                setMode('open')
                setVisibleCount(20)
              }}
            >
              Offen
            </button>
            <button
              type="button"
              className={mode === 'done' ? styles.segmentActive : undefined}
              onClick={() => {
                setMode('done')
                setVisibleCount(20)
              }}
            >
              Erledigt
            </button>
          </div>

          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <Input
              className={styles.searchInput}
              value={episodeQuery}
              onChange={(event) => {
                setEpisodeQuery(event.target.value)
                setVisibleCount(20)
              }}
              placeholder="Folgen-Nummer suchen, z. B. 5"
              aria-label="Folgen-Nummer suchen"
            />
          </label>
        </div>

        <ul className={styles.releaseList}>
          {visibleReleases.map((release) => {
            const hasOwnArtifacts = release.has_own_notes || release.has_own_media || release.has_own_rejected_notes
            const releaseDone = isDone(release)
            const needsRework = !releaseDone && release.has_own_rejected_notes
            return (
              <li key={release.release_version_id} className={styles.releaseRow}>
                <div className={styles.releaseMain}>
                  <strong>{releaseLabel(release, project.fansub_group_name)}</strong>
                  <Badge variant={releaseDone ? 'success' : needsRework ? 'danger' : 'warning'}>
                    {releaseDone ? 'Erledigt' : needsRework ? 'Überarbeitung nötig' : 'Offen'}
                  </Badge>
                </div>
                <Button
                  href={`/me/releases/${release.release_version_id}/workspace?return_to=${encodeURIComponent(projectReturnHref)}`}
                  variant={hasOwnArtifacts ? 'primary' : 'secondary'}
                  size="sm"
                  leftIcon={<Pencil size={15} aria-hidden="true" />}
                  className={!hasOwnArtifacts ? styles.emptyWorkspaceButton : undefined}
                >
                  Notizen & Medien
                </Button>
              </li>
            )
          })}
        </ul>

        {emptyText ? (
          <p className={styles.emptyText}>{emptyText}</p>
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
