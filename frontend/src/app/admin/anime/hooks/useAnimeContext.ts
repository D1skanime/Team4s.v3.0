import { useCallback, useState } from 'react'

import { getAnimeByID, getAnimeFansubs, getFansubBySlug } from '@/lib/api'
import { AnimeDetail } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

interface AnimeContextState {
  anime: AnimeDetail | null
  fansubs: FansubGroup[]
  isLoading: boolean
  isLoadingFansubs: boolean
}

interface AnimeContextActions {
  load: (animeID: number) => Promise<void>
  clear: () => void
}

export function useAnimeContext(): AnimeContextState & AnimeContextActions {
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [fansubs, setFansubs] = useState<FansubGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingFansubs, setIsLoadingFansubs] = useState(false)

  const load = useCallback(async (animeID: number) => {
    setIsLoading(true)
    setIsLoadingFansubs(true)
    setFansubs([])

    try {
      const animeResponse = await getAnimeByID(animeID, { include_disabled: true })
      const nextAnime = animeResponse.data
      setAnime(nextAnime)

      let loadedFansubs: FansubGroup[] = []
      try {
        const fansubResponse = await getAnimeFansubs(animeID)
        const slugs = Array.from(
          new Set(
            fansubResponse.data
              .map((relation) => relation.fansub_group?.slug?.trim() || '')
              .filter((slug) => slug.length > 0),
          ),
        )
        const details = await Promise.allSettled(slugs.map((slug) => getFansubBySlug(slug)))
        loadedFansubs = details
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result.status === 'fulfilled' ? result.value.data : null))
          .filter((group): group is FansubGroup => group !== null)
      } catch {
        loadedFansubs = []
      }

      setFansubs(loadedFansubs)
    } finally {
      setIsLoading(false)
      setIsLoadingFansubs(false)
    }
  }, [])

  const clear = useCallback(() => {
    setAnime(null)
    setFansubs([])
    setIsLoading(false)
    setIsLoadingFansubs(false)
  }, [])

  return {
    anime,
    fansubs,
    isLoading,
    isLoadingFansubs,
    load,
    clear,
  }
}
