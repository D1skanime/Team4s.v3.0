'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Badge, Button, Card } from '@/components/ui'
import { labelForRole, presentationForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type { MeAnimeContribution } from '@/types/contributions'

import styles from './contributions.module.css'
import { normalizeRoleCodes } from './contributionRoles'
import { VisibilityDropdown } from './VisibilityDropdown'

interface AnimeGroupCardProps {
  animeId: number
  animeTitle: string
  contributions: MeAnimeContribution[]
  onVisibilityChange: (id: number, isPublic: boolean, roleCode?: string, nextContributionId?: number) => void
}

interface EpisodeRangeEntry {
  roleLabel: string
  scopeLabel: string
  role: string
  release_version_id: number | null
  id: number
  is_public_on_member_profile: boolean
}

interface ProjectGroupEntry {
  fansubGroupId: number
  fansubGroupName: string
  workedCount: number
  totalCount: number
}

/**
 * Phase quick-260707-jya (D-02): Prozentualer Fortschritt worked/total Release-Versionen.
 * 0 wenn total<=0 (noch keine Release-Versionen vorhanden), sonst gerundeter Prozentwert.
 */
function progressPercent(worked: number, total: number): number {
  return total > 0 ? Math.round((worked / total) * 100) : 0
}

/**
 * Phase quick-260707-jya (D-02): aria-label-Text für den Fortschrittsbalken.
 */
function progressLabel(worked: number, total: number): string {
  if (total <= 0) {
    return 'Noch keine Release-Versionen vorhanden'
  }
  return `${worked} von ${total} Release-Versionen bearbeitet`
}

function buildEpisodeRanges(
  catalog: readonly RoleDefinitionOption[],
  contribs: MeAnimeContribution[],
): EpisodeRangeEntry[] {
  const animeWide = contribs.filter((c) => c.release_version_id === null)
  const withVersion = contribs
    .filter((c) => c.release_version_id !== null)
    .sort((a, b) => {
      const aIdx = a.episode_sort_index ?? 999999
      const bIdx = b.episode_sort_index ?? 999999
      return aIdx - bIdx
    })

  const result: EpisodeRangeEntry[] = []

  for (const c of animeWide) {
    for (const code of normalizeRoleCodes(catalog, c.role_codes)) {
      result.push({
        roleLabel: labelForRole(catalog, code),
        scopeLabel: 'Für das gesamte Projekt',
        role: code,
        release_version_id: null,
        id: c.id,
        is_public_on_member_profile: c.is_public_on_member_profile,
      })
    }
  }

  const byRole = new Map<string, MeAnimeContribution[]>()
  for (const c of withVersion) {
    for (const code of normalizeRoleCodes(catalog, c.role_codes)) {
      const existing = byRole.get(code)
      if (existing) {
        existing.push(c)
      } else {
        byRole.set(code, [c])
      }
    }
  }

  for (const [roleCode, roleContribs] of byRole.entries()) {
    let rangeStart = roleContribs[0]
    let rangeEnd = roleContribs[0]

    for (let i = 1; i <= roleContribs.length; i++) {
      const current = roleContribs[i]
      const prevSortIndex = rangeEnd.episode_sort_index
      const currSortIndex = current?.episode_sort_index

      const isConsecutive =
        current !== undefined &&
        prevSortIndex !== null &&
        prevSortIndex !== undefined &&
        currSortIndex !== null &&
        currSortIndex !== undefined &&
        currSortIndex === prevSortIndex + 1

      if (isConsecutive) {
        rangeEnd = current
      } else {
        const episodeLabel = rangeStart.id === rangeEnd.id
          ? `Folge ${rangeStart.episode_number ?? '?'}`
          : `Folge ${rangeStart.episode_number ?? '?'}-${rangeEnd.episode_number ?? '?'}`

        result.push({
          roleLabel: labelForRole(catalog, roleCode),
          scopeLabel: episodeLabel,
          role: roleCode,
          release_version_id: rangeStart.release_version_id,
          id: rangeStart.id,
          is_public_on_member_profile: rangeStart.is_public_on_member_profile,
        })

        if (current !== undefined) {
          rangeStart = current
          rangeEnd = current
        }
      }
    }
  }

  return result
}

function getUniqueRoles(
  catalog: readonly RoleDefinitionOption[],
  contribs: MeAnimeContribution[],
): Array<{ code: string; label: string }> {
  const codes = normalizeRoleCodes(catalog, contribs.flatMap((contribution) => contribution.role_codes))
  return codes.map((code) => ({ code, label: labelForRole(catalog, code) }))
}

function getUniqueGroups(contribs: MeAnimeContribution[]): ProjectGroupEntry[] {
  const seen = new Set<number>()
  const groups: ProjectGroupEntry[] = []
  for (const contribution of contribs) {
    if (seen.has(contribution.fansub_group_id)) continue
    seen.add(contribution.fansub_group_id)
    groups.push({
      fansubGroupId: contribution.fansub_group_id,
      fansubGroupName: contribution.fansub_group_name?.trim() || `Gruppe #${contribution.fansub_group_id}`,
      // worked/total sind pro Anime+Gruppe bereits identisch für alle Rollen-Zeilen dieser
      // Gruppe — daher aus der ERSTEN Contribution dieser Gruppe übernehmen, nicht summieren.
      workedCount: contribution.worked_release_version_count ?? 0,
      totalCount: contribution.total_release_version_count ?? 0,
    })
  }
  return groups
}

export function AnimeGroupCard({
  animeId,
  animeTitle,
  contributions,
  onVisibilityChange,
}: AnimeGroupCardProps) {
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')
  const [open, setOpen] = useState(false)

  const ranges = buildEpisodeRanges(contributionRoles, contributions)
  const uniqueRoles = getUniqueRoles(contributionRoles, contributions)
  const projectGroups = getUniqueGroups(contributions)

  return (
    <Card variant="nestedFlat" className={styles.roleCard}>
      <div className={styles.roleCardTop}>
        <div>
          <span className={styles.roleCardTitle}>{animeTitle}</span>
          {uniqueRoles.length > 0 ? (
            <div className={styles.roleChips}>
              {uniqueRoles.map(({ code, label }) => (
                <Badge
                  key={code}
                  variant="info"
                  data-role-code={presentationForRole(contributionRoles, code).colorKey}
                >
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.roleCardActions}>
          {projectGroups.length === 1 ? (
            <Button
              size="sm"
              variant="primary"
              href={`/me/projects/${animeId}/group/${projectGroups[0].fansubGroupId}`}
            >
              Projekt öffnen
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            iconOnly
            aria-label={open ? 'Projektrollen ausblenden' : 'Projektrollen anzeigen'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={styles.disclosureButton}
          >
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2.4} />
          </Button>
        </div>
      </div>

      {projectGroups.length === 1 ? (
        <div
          className={styles.projectProgressBar}
          aria-label={progressLabel(projectGroups[0].workedCount, projectGroups[0].totalCount)}
        >
          <span
            style={{
              width: `${progressPercent(projectGroups[0].workedCount, projectGroups[0].totalCount)}%`,
            }}
          />
        </div>
      ) : null}

      {projectGroups.length > 1 ? (
        <div className={styles.projectButtonRow}>
          {projectGroups.map((group) => (
            <div key={group.fansubGroupId}>
              <Button
                size="sm"
                variant="secondary"
                href={`/me/projects/${animeId}/group/${group.fansubGroupId}`}
              >
                Projekt öffnen: {group.fansubGroupName}
              </Button>
              <div
                className={styles.projectProgressBar}
                aria-label={progressLabel(group.workedCount, group.totalCount)}
              >
                <span
                  style={{
                    width: `${progressPercent(group.workedCount, group.totalCount)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className={styles.roleCardBody}>
          <p className={styles.roleVisibilityLabel}>Sichtbarkeit deiner Rollen</p>
          <ul className={styles.accordionList}>
            {ranges.map((entry) => {
              const contrib = contributions.find((c) => c.id === entry.id)
              return (
                <li key={`${entry.id}-${entry.role}`} className={styles.accordionRow}>
                  <span className={styles.accordionLabel}>
                    <strong>{entry.roleLabel}</strong>
                    <span>{entry.scopeLabel}</span>
                  </span>
                  <div className={styles.actionsRow}>
                    {entry.release_version_id !== null ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        href={`/me/releases/${entry.release_version_id}/workspace`}
                      >
                        Arbeitsfläche öffnen
                      </Button>
                    ) : null}
                    {contrib ? (
                      <VisibilityDropdown
                        contributionId={contrib.id}
                        roleCode={entry.role}
                        isPublic={contrib.is_public_on_member_profile}
                        onChanged={(isPublic, nextContributionId) =>
                          onVisibilityChange(contrib.id, isPublic, entry.role, nextContributionId)
                        }
                      />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
