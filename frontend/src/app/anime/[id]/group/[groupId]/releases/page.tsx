'use client'

import Link from 'next/link'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { GroupEdgeNavigation } from '@/components/groups/GroupEdgeNavigation'
import { Pagination } from '@/components/anime/Pagination'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { buildGroupNavigationGroups } from '@/lib/groupNavigation'
import { getGroupReleases, getAnimeByID, getAnimeFansubs, ApiError } from '@/lib/api'

import { OtherGroupsChips } from './OtherGroupsChips'
import { ReleaseEpisodeCard } from './ReleaseEpisodeCard'
import { ReleasesFilterBar } from './ReleasesFilterBar'

import styles from './page.module.css'

interface GroupReleasesPageProps {
  params:
    | {
        id: string
        groupId: string
      }
    | Promise<{
        id: string
        groupId: string
      }>
  searchParams?:
    | {
        page?: string | string[]
        per_page?: string | string[]
        has_op?: string | string[]
        has_ed?: string | string[]
        has_karaoke?: string | string[]
        q?: string | string[]
      }
    | Promise<{
        page?: string | string[]
        per_page?: string | string[]
        has_op?: string | string[]
        has_ed?: string | string[]
        has_karaoke?: string | string[]
        q?: string | string[]
      }>
}

type Anime = {
  id: number
  title: string
}

type Group = {
  fansub: {
    id: number
    name: string
    slug: string
    logo_url?: string | null
  }
}

type Episode = {
  id: number
  episode_id?: number | null
  episode_number: number
  title?: string | null
  version_label?: string | null
  thumbnail_url?: string | null
  has_op: boolean
  has_ed: boolean
  karaoke_count: number
  insert_count: number
  screenshot_count: number
  released_at?: string | null
}

type OtherGroup = {
  id: number
  name: string
  slug: string
  logo_url?: string | null
  episode_count?: number
}

type Meta = {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export default function GroupReleasesPage({ params }: GroupReleasesPageProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()

  const [animeID, setAnimeID] = useState<number | null>(null)
  const [groupID, setGroupID] = useState<number | null>(null)
  const [anime, setAnime] = useState<Anime | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [navigationGroups, setNavigationGroups] = useState<OtherGroup[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isSticky, setIsSticky] = useState(false)

  const hasOpParam = urlSearchParams.get('has_op') === 'true'
  const hasEdParam = urlSearchParams.get('has_ed') === 'true'
  const hasKaraokeParam = urlSearchParams.get('has_karaoke') === 'true'
  const queryParam = urlSearchParams.get('q') || ''
  const pageParam = Number.parseInt(urlSearchParams.get('page') || '1', 10)

  const [filterOp, setFilterOp] = useState(hasOpParam)
  const [filterEd, setFilterEd] = useState(hasEdParam)
  const [filterKaraoke, setFilterKaraoke] = useState(hasKaraokeParam)

  const otherGroups = navigationGroups.filter((item) => item.id !== groupID)

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params
      const id = Number.parseInt(resolvedParams.id, 10)
      const gid = Number.parseInt(resolvedParams.groupId, 10)

      if (Number.isNaN(id) || id <= 0 || Number.isNaN(gid) || gid <= 0) {
        notFound()
      }

      setAnimeID(id)
      setGroupID(gid)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    setSearchTerm(queryParam)
    setDebouncedSearchTerm(queryParam)
  }, [queryParam])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const updateURL = useCallback(
    (updates: Record<string, string | boolean | undefined>) => {
      if (!animeID || !groupID) return

      const params = new URLSearchParams(urlSearchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === false || value === '') {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      params.delete('page')

      const queryString = params.toString()
      const newURL = `/anime/${animeID}/group/${groupID}/releases${queryString ? `?${queryString}` : ''}`
      router.push(newURL)
    },
    [animeID, groupID, router, urlSearchParams]
  )

  useEffect(() => {
    if (debouncedSearchTerm !== queryParam) {
      updateURL({ q: debouncedSearchTerm || undefined })
    }
  }, [debouncedSearchTerm, queryParam, updateURL])

  const toggleFilter = useCallback(
    (filter: 'op' | 'ed' | 'karaoke') => {
      const updates: Record<string, boolean | undefined> = {}

      switch (filter) {
        case 'op':
          updates.has_op = !filterOp || undefined
          setFilterOp(!filterOp)
          break
        case 'ed':
          updates.has_ed = !filterEd || undefined
          setFilterEd(!filterEd)
          break
        case 'karaoke':
          updates.has_karaoke = !filterKaraoke || undefined
          setFilterKaraoke(!filterKaraoke)
          break
      }

      updateURL(updates)
    },
    [filterOp, filterEd, filterKaraoke, updateURL]
  )

  const resetFilters = useCallback(() => {
    setFilterOp(false)
    setFilterEd(false)
    setFilterKaraoke(false)
    setSearchTerm('')
    setDebouncedSearchTerm('')
    router.push(`/anime/${animeID}/group/${groupID}/releases`)
  }, [animeID, groupID, router])

  const anyFilterActive = filterOp || filterEd || filterKaraoke || debouncedSearchTerm

  const toggleAll = useCallback(() => {
    setFilterOp(false)
    setFilterEd(false)
    setFilterKaraoke(false)
    updateURL({ has_op: undefined, has_ed: undefined, has_karaoke: undefined, q: debouncedSearchTerm || undefined })
  }, [debouncedSearchTerm, updateURL])

  useEffect(() => {
    async function fetchData() {
      if (!animeID || !groupID) return

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [releasesResponse, animeResponse, animeFansubsResponse] = await Promise.all([
          getGroupReleases(animeID, groupID, {
            page: pageParam,
            per_page: 20,
            has_op: filterOp || undefined,
            has_ed: filterEd || undefined,
            has_karaoke: filterKaraoke || undefined,
            q: debouncedSearchTerm || undefined,
          }),
          getAnimeByID(animeID),
          getAnimeFansubs(animeID).catch(() => null),
        ])

        setGroup(releasesResponse.data.group)
        setEpisodes(releasesResponse.data.episodes)
        setNavigationGroups(
          buildGroupNavigationGroups({
            currentGroup: releasesResponse.data.group.fansub,
            fallbackOtherGroups: releasesResponse.data.other_groups,
            animeFansubRelations: animeFansubsResponse?.data ?? null,
          })
        )
        setMeta(releasesResponse.meta)
        setAnime(animeResponse.data)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          notFound()
        }
        setErrorMessage('Releases konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [animeID, groupID, pageParam, filterOp, filterEd, filterKaraoke, debouncedSearchTerm])

  useEffect(() => {
    const handleScroll = () => {
      const filterBar = document.getElementById('filterBar')
      if (filterBar) {
        const rect = filterBar.getBoundingClientRect()
        setIsSticky(rect.top <= 0)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!animeID || !groupID) {
    return null
  }

  if (errorMessage && !anime) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
        </p>
        <div className={styles.errorBox}>{errorMessage}</div>
      </main>
    )
  }

  if (isLoading && !anime) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
        </p>
        <div className={styles.loadingState}>Lädt...</div>
      </main>
    )
  }

  const breadcrumbItems = anime
    ? [
        { label: 'Anime', href: '/anime' },
        { label: anime.title, href: `/anime/${animeID}` },
        { label: 'Gruppe', href: `/anime/${animeID}/group/${groupID}` },
        { label: 'Releases' },
      ]
    : []

  return (
    <main className={styles.page}>
      {breadcrumbItems.length > 0 && <Breadcrumbs items={breadcrumbItems} />}

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}/group/${groupID}`}>Zurück zur Gruppenübersicht</Link>
      </p>

      {group && anime && (
        <>
          <section className={styles.heroShell}>
            <section className={styles.header}>
              <div className={styles.headerContent}>
                {group.fansub.logo_url ? (
                  <ResponsiveImage
                    src={group.fansub.logo_url}
                    alt={group.fansub.name}
                    width={60}
                    height={60}
                    className={styles.logo}
                  />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <span className={styles.logoInitial}>{group.fansub.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <h1 className={styles.title}>{group.fansub.name} Releases</h1>
                  <p className={styles.subtitle}>{anime.title}</p>
                </div>
              </div>
            </section>
            {navigationGroups.length > 1 ? (
              <GroupEdgeNavigation
                currentGroupId={groupID}
                animeId={animeID}
                animeTitle={anime.title}
                otherGroups={navigationGroups}
                mode="releases"
              />
            ) : null}
          </section>

          <ReleasesFilterBar
            filterOp={filterOp}
            filterEd={filterEd}
            filterKaraoke={filterKaraoke}
            anyFilterActive={Boolean(anyFilterActive)}
            searchTerm={searchTerm}
            isSticky={isSticky}
            onToggleFilter={toggleFilter}
            onToggleAll={toggleAll}
            onSearchChange={setSearchTerm}
            onClearSearch={() => {
              setSearchTerm('')
              setDebouncedSearchTerm('')
              updateURL({ q: undefined })
            }}
          />

          <section className={styles.releasesSection}>
            <OtherGroupsChips animeID={animeID} otherGroups={otherGroups} />

            {meta && (
              <div className={styles.releasesMeta}>
                <p className={styles.releasesCount}>
                  {meta.total} {meta.total === 1 ? 'Release' : 'Releases'}
                </p>
              </div>
            )}

            {isLoading ? (
              <div className={styles.loadingState}>Lädt...</div>
            ) : episodes.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>Keine Releases vorhanden.</p>
                {anyFilterActive && (
                  <button type="button" className={styles.resetButton} onClick={resetFilters}>
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.releaseGrid}>
                {episodes.map((episode) => (
                  <ReleaseEpisodeCard key={episode.id} episode={episode} animeID={animeID} groupID={groupID} />
                ))}
              </div>
            )}

            {meta && meta.total_pages > 1 ? (
              <Pagination
                currentPage={meta.page}
                totalPages={meta.total_pages}
                baseUrl={`/anime/${animeID}/group/${groupID}/releases`}
              />
            ) : null}
          </section>
        </>
      )}
    </main>
  )
}
