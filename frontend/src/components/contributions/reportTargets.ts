import type { MeAnimeContribution } from '@/types/contributions'

export type ReportTargetType = 'anime' | 'contribution' | 'fansub_group' | 'member'

export interface ReportTargetOption {
  type: ReportTargetType
  id: number
  label: string
  description?: string
}

function roleSummary(contribution: MeAnimeContribution): string {
  const labels = contribution.role_labels?.length ? contribution.role_labels : contribution.role_codes
  return labels.slice(0, 3).join(', ')
}

function contributionLabel(contribution: MeAnimeContribution): string {
  const anime = contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
  const group = contribution.fansub_group_name?.trim() || `Gruppe #${contribution.fansub_group_id}`
  const roles = roleSummary(contribution)
  return roles ? `${anime} · ${group} · ${roles}` : `${anime} · ${group}`
}

export function buildReportTargetOptions(contributions: MeAnimeContribution[]): ReportTargetOption[] {
  const options: ReportTargetOption[] = []
  const animeByID = new Map<number, ReportTargetOption>()
  const groupByID = new Map<number, ReportTargetOption>()

  for (const contribution of contributions) {
    if (!animeByID.has(contribution.anime_id)) {
      animeByID.set(contribution.anime_id, {
        type: 'anime',
        id: contribution.anime_id,
        label: contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`,
      })
    }

    if (!groupByID.has(contribution.fansub_group_id)) {
      groupByID.set(contribution.fansub_group_id, {
        type: 'fansub_group',
        id: contribution.fansub_group_id,
        label: contribution.fansub_group_name?.trim() || `Gruppe #${contribution.fansub_group_id}`,
      })
    }

    options.push({
      type: 'contribution',
      id: contribution.id,
      label: contributionLabel(contribution),
      description: `Hinweis #${contribution.id}`,
    })
  }

  return [
    ...Array.from(animeByID.values()).sort((a, b) => a.label.localeCompare(b.label, 'de')),
    ...Array.from(groupByID.values()).sort((a, b) => a.label.localeCompare(b.label, 'de')),
    ...options.sort((a, b) => a.label.localeCompare(b.label, 'de')),
  ]
}

export function optionsForTargetType(
  options: ReportTargetOption[],
  targetType: ReportTargetType,
): ReportTargetOption[] {
  return options.filter((option) => option.type === targetType)
}
