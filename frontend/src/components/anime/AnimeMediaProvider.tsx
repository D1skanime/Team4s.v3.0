'use client'

import Image from 'next/image'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getAnimeBackdrops } from '@/lib/api'
import { resolveInfoBannerURL, resolveInfoLogoURL } from '@/lib/animeBackdrops'
import type { AnimeBackdropManifest } from '@/types/anime'

const AnimeMediaManifestContext = createContext<AnimeBackdropManifest | null>(null)
const manifestRequestCache = new Map<number, Promise<AnimeBackdropManifest | null>>()

function loadAnimeMediaManifest(animeID: number): Promise<AnimeBackdropManifest | null> {
  const cachedRequest = manifestRequestCache.get(animeID)
  if (cachedRequest) return cachedRequest

  const request = getAnimeBackdrops(animeID)
    .then((response) => response.data)
    .catch(() => {
      manifestRequestCache.delete(animeID)
      return null
    })

  manifestRequestCache.set(animeID, request)
  return request
}

export function AnimeMediaProvider({ animeID, children }: { animeID: number; children: ReactNode }) {
  const [manifest, setManifest] = useState<AnimeBackdropManifest | null>(null)

  useEffect(() => {
    let cancelled = false

    void loadAnimeMediaManifest(animeID).then((nextManifest) => {
      if (!cancelled) setManifest(nextManifest)
    })

    return () => {
      cancelled = true
    }
  }, [animeID])

  return <AnimeMediaManifestContext.Provider value={manifest}>{children}</AnimeMediaManifestContext.Provider>
}

export function useAnimeMediaManifest(): AnimeBackdropManifest | null {
  return useContext(AnimeMediaManifestContext)
}

export function AnimeTitleLogo({ title, className }: { title: string; className?: string }) {
  const manifest = useAnimeMediaManifest()
  const logoURL = useMemo(() => resolveInfoLogoURL(manifest), [manifest])

  if (!logoURL) return null

  return (
    <Image
      src={logoURL}
      alt={`${title} Logo`}
      width={120}
      height={48}
      className={className}
      unoptimized
    />
  )
}

export function AnimeInfoBanner({
  className,
  dividerClassName,
}: {
  className?: string
  dividerClassName?: string
}) {
  const manifest = useAnimeMediaManifest()
  const bannerURL = useMemo(() => resolveInfoBannerURL(manifest), [manifest])

  if (!bannerURL) return null

  return (
    <>
      <hr className={dividerClassName} />
      <Image src={bannerURL} alt="" className={className} width={600} height={180} unoptimized />
    </>
  )
}
