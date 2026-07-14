import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'
import type { PublicFansubProject } from '@/types/fansub'

export interface FansubProjectNavigationItem {
  id: number
  title: string
  animeSlug: string
  href: string
}

export interface FansubProjectNavigation {
  previous: FansubProjectNavigationItem | null
  next: FansubProjectNavigationItem | null
}

interface BuildFansubProjectNavigationInput {
  currentAnimeID?: number | null
  currentAnimeSlug?: string | null
  currentFansubGroupID: number
  currentFansubSlug: string
  projects: PublicFansubProject[]
}

function normalizeSlug(slug: string | null | undefined): string {
  return slug?.trim().toLowerCase() ?? ''
}

function compareProjects(left: PublicFansubProject, right: PublicFansubProject): number {
  const byTitle = left.title.localeCompare(right.title, 'de', { sensitivity: 'base' })
  if (byTitle !== 0) return byTitle
  return left.id - right.id
}

function toNavigationItem(project: PublicFansubProject, fansubSlug: string): FansubProjectNavigationItem {
  const animeSlug = project.anime_slug.trim()
  return {
    id: project.id,
    title: project.title,
    animeSlug,
    href: buildPublicFansubProjectPath(fansubSlug, animeSlug),
  }
}

export function buildFansubProjectNavigation({
  currentAnimeID,
  currentAnimeSlug,
  currentFansubGroupID,
  currentFansubSlug,
  projects,
}: BuildFansubProjectNavigationInput): FansubProjectNavigation {
  void currentFansubGroupID

  const fansubSlug = currentFansubSlug.trim()
  if (!fansubSlug) {
    return { previous: null, next: null }
  }

  const normalizedCurrentSlug = normalizeSlug(currentAnimeSlug)
  const sortedProjects = projects
    .filter((project) => Boolean(project.anime_slug?.trim()))
    .slice()
    .sort(compareProjects)

  const currentIndex = sortedProjects.findIndex((project) => {
    const projectSlug = normalizeSlug(project.anime_slug)
    if (normalizedCurrentSlug && projectSlug === normalizedCurrentSlug) return true
    return typeof currentAnimeID === 'number' && project.id === currentAnimeID
  })

  if (currentIndex < 0) {
    return { previous: null, next: null }
  }

  return {
    previous:
      currentIndex > 0
        ? toNavigationItem(sortedProjects[currentIndex - 1], fansubSlug)
        : null,
    next:
      currentIndex < sortedProjects.length - 1
        ? toNavigationItem(sortedProjects[currentIndex + 1], fansubSlug)
        : null,
  }
}
