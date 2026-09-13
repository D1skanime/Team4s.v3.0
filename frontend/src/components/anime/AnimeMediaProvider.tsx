'use client'

import Image from 'next/image'
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'

import { getAnimeBackdrops } from '@/lib/api'
import { resolveInfoBannerURL, resolveInfoLogoURL } from '@/lib/animeBackdrops'
import type { AnimeBackdropManifest } from '@/types/anime'

const AnimeMediaManifestContext = createContext<AnimeBackdropManifest | null>(null)
const MANIFEST_TTL_MS = 60_000
const MAX_UNUSED_MANIFESTS = 20

interface ManifestEntry {
  manifest: AnimeBackdropManifest | null
  fulfilledAt: number
  unusedAt: number
  consumers: Set<ManifestConsumer>
  request?: Promise<void>
  controller?: AbortController
}

interface ManifestConsumer {
  notify: () => void
  entry: ManifestEntry
}

const manifestRequestCache = new Map<number, ManifestEntry>()
let lastUnused = 0

function evictUnusedManifests() {
  const unused = [...manifestRequestCache.entries()]
    .filter(([, entry]) => entry.consumers.size === 0 && !entry.request && entry.manifest)
    .sort(([, left], [, right]) => left.unusedAt - right.unusedAt)
  for (const [animeID] of unused.slice(0, Math.max(0, unused.length - MAX_UNUSED_MANIFESTS))) {
    manifestRequestCache.delete(animeID)
  }
}

function sameManifest(left: AnimeBackdropManifest | null, right: AnimeBackdropManifest): boolean {
  return !!left && left.anime_id === right.anime_id && left.provider === right.provider &&
    left.media_item_id === right.media_item_id && left.logo_url === right.logo_url &&
    left.banner_url === right.banner_url &&
    left.backdrops.length === right.backdrops.length &&
    left.backdrops.every((url, index) => url === right.backdrops[index]) &&
    left.theme_videos.length === right.theme_videos.length &&
    left.theme_videos.every((url, index) => url === right.theme_videos[index])
}

function getManifestEntry(animeID: number): ManifestEntry {
  let entry = manifestRequestCache.get(animeID)
  if (!entry) {
    entry = { manifest: null, fulfilledAt: 0, unusedAt: 0, consumers: new Set() }
    manifestRequestCache.set(animeID, entry)
  }
  return entry
}

function loadAnimeMediaManifest(animeID: number, entry: ManifestEntry) {
  if (entry.request || (entry.manifest && Date.now() - entry.fulfilledAt < MANIFEST_TTL_MS)) return

  const controller = new AbortController()
  entry.controller = controller
  entry.request = getAnimeBackdrops(animeID, { signal: controller.signal })
    .then(({ data }) => {
      if (manifestRequestCache.get(animeID) !== entry || controller.signal.aborted) return
      // The rotator depends on this identity: unchanged data must not restart video/shuffle.
      if (!sameManifest(entry.manifest, data)) entry.manifest = data
      entry.fulfilledAt = Date.now()
      entry.request = undefined
      entry.controller = undefined
      for (const consumer of entry.consumers) consumer.notify()
      evictUnusedManifests()
    })
    .catch(() => {
      // A late abort/error must never delete a newer acquisition for the same anime.
      if (manifestRequestCache.get(animeID) !== entry) return
      manifestRequestCache.delete(animeID)
      // Keep active subscriptions together on an empty replacement, without retrying yet.
      // A later acquire/focus can retry for every mounted provider, not just the newcomer.
      if (entry.consumers.size > 0) {
        const replacement = getManifestEntry(animeID)
        for (const consumer of entry.consumers) {
          consumer.entry = replacement
          replacement.consumers.add(consumer)
        }
        entry.consumers.clear()
        for (const consumer of replacement.consumers) consumer.notify()
      }
    })
}

function releaseManifestEntry(animeID: number, consumer: ManifestConsumer) {
  const entry = consumer.entry
  entry.consumers.delete(consumer)
  // StrictMode releases and reacquires synchronously. Only the final real release aborts.
  void Promise.resolve().then(() => {
    if (entry.consumers.size > 0 || manifestRequestCache.get(animeID) !== entry) return
    if (entry.request) {
      manifestRequestCache.delete(animeID)
      entry.controller?.abort()
    } else if (!entry.manifest) {
      manifestRequestCache.delete(animeID)
    } else {
      entry.unusedAt = ++lastUnused
      evictUnusedManifests()
    }
  })
}

function subscribeToManifest(animeID: number, notify: () => void) {
  const entry = getManifestEntry(animeID)
  const consumer: ManifestConsumer = { notify, entry }
  entry.consumers.add(consumer)
  loadAnimeMediaManifest(animeID, entry)

  function revalidate() {
    if (document.visibilityState === 'visible') loadAnimeMediaManifest(animeID, consumer.entry)
  }

  window.addEventListener('focus', revalidate)
  document.addEventListener('visibilitychange', revalidate)
  return () => {
    window.removeEventListener('focus', revalidate)
    document.removeEventListener('visibilitychange', revalidate)
    releaseManifestEntry(animeID, consumer)
  }
}

const getServerManifest = () => null

export function AnimeMediaProvider({ animeID, children }: { animeID: number; children: ReactNode }) {
  const subscribe = useCallback((notify: () => void) => subscribeToManifest(animeID, notify), [animeID])
  const getSnapshot = useCallback(() => manifestRequestCache.get(animeID)?.manifest ?? null, [animeID])
  const manifest = useSyncExternalStore(subscribe, getSnapshot, getServerManifest)

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
