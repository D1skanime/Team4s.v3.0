'use client'

import Link from 'next/link'
import { Layers } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Badge, Button, Card, EmptyState, ErrorState, SectionHeader } from '@/components/ui'
import { getMemberProjects, resolveApiUrl } from '@/lib/api'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import { useNearViewportActivation } from '@/hooks/useNearViewportActivation'
import type { PublicMemberCurrentProject, PublicMemberProjectsPage } from '@/types/profile'

import styles from './MemberCurrentProjectsSection.module.css'

type MemberCurrentProjectsSectionProps = {
  memberSlug: string
  projects: PublicMemberCurrentProject[]
  totalCount: number
}

const PROJECT_PAGE_SIZE = 6

// STYLED_ROLE_CODES sind die Codes mit dediziertem Accent-Token im CSS-Modul.
// Codes ausserhalb dieser Menge fallen bewusst auf den neutralen 'other'-Akzent.
const STYLED_ROLE_CODES = new Set([
  'fansub_lead', 'project_lead', 'editor', 'translator', 'timer', 'typesetter',
  'quality_checker', 'encoder', 'raw_provider', 'designer', 'admin',
])

// roleColorCode leitet die CSS-Rollenfarbe DIREKT vom serverautoritativen Rollen-Code
// ab (D-06). Kein Label->Code-Reverse-Mapping mehr; nur normalisierte Alias-Codes.
function roleColorCode(roleCode: string): string {
  if (roleCode === 'techadmin') return 'admin'
  if (roleCode === 'gfxler') return 'designer'
  return STYLED_ROLE_CODES.has(roleCode) ? roleCode : 'other'
}

function projectHref(project: PublicMemberCurrentProject): string {
  return `/anime/${project.anime_id}/group/${project.fansub_group_id}`
}

// Die bestehende, korrekte zusammengesetzte Liste-Key-Konvention (nie key={index}) — auch
// für den Dedup-Updater unten wiederverwendet, damit beide Stellen nie auseinanderlaufen.
function projectKey(project: PublicMemberCurrentProject): string {
  return `${project.anime_id}:${project.fansub_group_id}`
}

// PMFE-06/D-04: reiner Dedup-Append (Dedup ausschließlich aus `prev`, keine Ref-Mutation) —
// StrictMode-sicher, siehe Bugfix-Präzedenzfall in useProjectMemberCollection.ts.
function appendProjects(
  prev: PublicMemberCurrentProject[],
  incoming: PublicMemberCurrentProject[],
): PublicMemberCurrentProject[] {
  const existing = new Set(prev.map(projectKey))
  const additions = incoming.filter((project) => !existing.has(projectKey(project)))
  return additions.length > 0 ? [...prev, ...additions] : prev
}

export function MemberCurrentProjectsSection({
  memberSlug,
  projects,
  totalCount,
}: MemberCurrentProjectsSectionProps) {
  const [sourceProjects, setSourceProjects] = useState(projects)
  const [visibleProjects, setVisibleProjects] = useState(projects)
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  // attempt > 0 markiert einen aktiven/kürzlich fehlgeschlagenen Continuation-Versuch für den
  // aktuellen offset; ein Klick auf "Erneut versuchen" erhöht attempt erneut für DENSELBEN
  // offset (kein Fortschritt, kein Überspringen), ein erfolgreicher Append setzt auf 0 zurück.
  const [attempt, setAttempt] = useState(0)
  // Der zuletzt EINMALIG angewandte erfolgreiche requestKey (Dedup-Schutz für das
  // Render-Zeit-Anhängen weiter unten, siehe dortiger Kommentar).
  const [appliedSuccessKey, setAppliedSuccessKey] = useState('')

  if (sourceProjects !== projects) {
    setSourceProjects(projects)
    setVisibleProjects(projects)
    setAttempt(0)
    setAppliedSuccessKey('')
  }
  const hasMore = visibleProjects.length < totalCount
  const offset = visibleProjects.length
  const requestKey = attempt > 0 ? `${memberSlug}:${offset}:${attempt}` : ''

  // key/fetcher MÜSSEN stabilisiert werden (useCallback), sonst liefe der Continuation-Effekt
  // bei jedem Render neu (siehe gleiches Muster in useProjectMemberCollection.ts).
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      getMemberProjects(memberSlug, PROJECT_PAGE_SIZE, offset, signal).then((response) => {
        if (!response || !('data' in response)) throw new Error('Profil ist nicht sichtbar.')
        return response.data
      }),
    [memberSlug, offset],
  )

  // D-03/PMFE-03: sluggebundener, abbrechbarer Continuation-Fetch über den geteilten Hook —
  // ein doppelter Klick oder eine Navigation kann nie eine veraltete Antwort anwenden.
  const { state } = useCancellableSlugState<PublicMemberProjectsPage>({
    requestKey,
    enabled: attempt > 0,
    fetcher,
  })

  const isLoading = attempt > 0 && state.key === requestKey && state.status === 'loading'
  const hasError = attempt > 0 && state.key === requestKey && state.status === 'error'

  // "Adjust state while rendering" (React-sanktioniertes Muster, siehe auch
  // useDebouncedSearch.ts's urlQuery/syncedUrlQuery und der sourceProjects-Abgleich oben) statt
  // eines setState-in-Effect: sobald der Hook für requestKey erfolgreich abschließt, werden die
  // neuen Items EINMALIG rein dedupliziert angehängt und attempt zurückgesetzt.
  if (
    attempt > 0 &&
    state.key === requestKey &&
    state.status === 'success' &&
    state.data &&
    appliedSuccessKey !== requestKey
  ) {
    setAppliedSuccessKey(requestKey)
    setVisibleProjects((prev) => appendProjects(prev, state.data!.items))
    setAttempt(0)
  }

  function loadMoreProjects() {
    if (!interactionEnabled || !hasMore) return
    if (attempt > 0 && !hasError) return
    setAttempt((current) => current + 1)
  }

  return (
    <section ref={targetRef} className={styles.section}>
      <SectionHeader title="Fansub-Projekte" />

      {visibleProjects.length > 0 ? (
        <ul
          className={`${styles.projectList} ${styles.projectSkeleton}`}
          aria-hidden="true"
          data-visible={interactionEnabled ? 'false' : 'true'}
        >
          {visibleProjects.map((project) => (
            <li key={`skeleton:${projectKey(project)}`}>
              <Card className={`${styles.projectCard} ${styles.skeletonCard}`}>
                <span className={`${styles.cover} ${styles.skeletonCover}`} />
                <span className={`${styles.projectBody} ${styles.skeletonBody}`}>
                  <span className={styles.skeletonTitle} />
                  <span className={styles.skeletonGroup} />
                  <span className={styles.skeletonChips} />
                </span>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {visibleProjects.length === 0 ? (
        <EmptyState title="Keine aktuellen Projekte sichtbar." />
      ) : (
        <ul className={styles.projectList} aria-label="Fansub-Projekte">
          {visibleProjects.map((project) => (
            <li key={projectKey(project)}>
              <Link
                href={projectHref(project)}
                className={styles.projectLink}
                aria-label={`${project.anime_title} öffnen`}
              >
                <Card variant="interactive" className={styles.projectCard}>
                  <span className={styles.cover} aria-hidden={!project.cover_url}>
                    {project.cover_url ? (
                      <ResponsiveImage
                        src={resolveApiUrl(project.cover_url)}
                        alt={`${project.anime_title} Cover`}
                        width={96}
                        height={136}
                        sizes="(max-width: 720px) 68px, 90px"
                        loading="lazy"
                      />
                    ) : (
                      <span>{project.anime_title.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>

                  <span className={styles.projectBody}>
                    <span className={styles.projectTitleRow}>
                      <strong>{project.anime_title}</strong>
                      <span className={styles.projectGroup}>{project.fansub_group_name}</span>
                    </span>

                    <span className={styles.chipRow}>
                      {project.roles.map((role) => (
                        <Badge
                          key={role.code}
                          variant="neutral"
                          className={styles.roleChip}
                          data-role-code={roleColorCode(role.code)}
                        >
                          {role.label_de}
                        </Badge>
                      ))}
                      {project.is_project_level ? (
                        <Badge variant="neutral">
                          <Layers size={13} aria-hidden="true" />
                          Projektweit
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visibleProjects.length > 0 ? (
        <div className={styles.projectFooter}>
          <span aria-live="polite">
            {visibleProjects.length} von {totalCount} Projekten sichtbar
          </span>
          {hasMore && !hasError ? (
            <Button
              variant="secondary"
              size="sm"
              loading={isLoading}
              disabled={!interactionEnabled}
              onClick={loadMoreProjects}
            >
              Weitere Projekte laden
            </Button>
          ) : null}
        </div>
      ) : null}
      {hasError ? (
        <ErrorState
          title="Weitere Projekte konnten nicht geladen werden"
          description="Bitte versuche es erneut."
          action={(
            <Button variant="secondary" onClick={loadMoreProjects}>
              Erneut versuchen
            </Button>
          )}
        />
      ) : null}
    </section>
  )
}
