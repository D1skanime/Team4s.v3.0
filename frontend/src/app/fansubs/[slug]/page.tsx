import Link from 'next/link'

import { FansubProfileTabs } from '@/components/fansubs/FansubProfileTabs'
import { AnimeListItem } from '@/types/anime'
import { ApiError, getAnimeList, getFansubBySlug, getFansubMembers } from '@/lib/api'

import styles from './page.module.css'

interface FansubProfilePageProps {
  params:
    | {
        slug: string
      }
    | Promise<{
        slug: string
      }>
}

async function loadFansubProjects(fansubID: number): Promise<AnimeListItem[]> {
  const perPage = 100
  const maxPages = 10
  const projects: AnimeListItem[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await getAnimeList({
      page,
      per_page: perPage,
      fansub_id: fansubID,
    })
    projects.push(...response.data)
    if (page >= response.meta.total_pages) {
      break
    }
  }

  return projects
}

export default async function FansubProfilePage({ params }: FansubProfilePageProps) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

  if (!slug) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>Ungueltiger Fansub-Slug.</div>
      </main>
    )
  }

  let message: string | null = null
  let group: Awaited<ReturnType<typeof getFansubBySlug>>['data'] | null = null
  let members: Awaited<ReturnType<typeof getFansubMembers>>['data'] = []
  let projects: AnimeListItem[] = []

  try {
    const groupResponse = await getFansubBySlug(slug)
    group = groupResponse.data
    const [membersResponse, projectsResponse] = await Promise.all([getFansubMembers(group.id), loadFansubProjects(group.id)])
    members = membersResponse.data
    projects = projectsResponse
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Fansubgruppe nicht gefunden.'
        : 'Fansub-Profil konnte nicht geladen werden.'
  }

  if (!group) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message || 'Fansub-Profil konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/anime">Anime</Link>
        <span>&gt;</span>
        <span>Fansubs</span>
        <span>&gt;</span>
        <span>{group.name}</span>
      </nav>

      <section className={styles.hero}>
        <p className={styles.slug}>/{group.slug}</p>
        <h1 className={styles.title}>{group.name}</h1>
        <p className={styles.subtitle}>{group.description || 'Keine Kurzbeschreibung vorhanden.'}</p>
      </section>

      <FansubProfileTabs group={group} members={members} projects={projects} />
    </main>
  )
}
