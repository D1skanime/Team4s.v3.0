'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { normalizeBackdropImageURLs, normalizeThemeVideoURLs } from '@/lib/animeBackdrops'
import { useAnimeMediaManifest } from './AnimeMediaProvider'
import { isNavigationTriggerEvent, shouldRenderEnableAudioButton, stopThemeVideoPlayback } from './themeVideoAudio'
import {
  canSwapInPreloadedBackdrop,
  getNextBackdropIndex,
  resolveBackdropSlotsAfterPreload,
} from './AnimeBackdropRotator.logic'

import styles from './AnimeBackdropRotator.module.css'

interface AnimeBackdropRotatorProps {
  fallbackImageURL: string
}

const ROTATION_INTERVAL_MS = 9000
const VIDEO_TO_IMAGE_FADE_MS = 600

export function AnimeBackdropRotator({ fallbackImageURL }: AnimeBackdropRotatorProps) {
  const manifest = useAnimeMediaManifest()
  const [backdropUrls, setBackdropUrls] = useState<string[]>([])
  const [slots, setSlots] = useState<[string, string]>([fallbackImageURL, fallbackImageURL])
  const [visibleSlotIndex, setVisibleSlotIndex] = useState<0 | 1>(0)
  const [slotGenerations, setSlotGenerations] = useState<[number, number]>([0, 0])
  const [activeThemeVideoUrl, setActiveThemeVideoURL] = useState<string | null>(null)
  const [showThemeVideo, setShowThemeVideo] = useState(false)
  const [isThemeVideoMuted, setThemeVideoMuted] = useState(true)
  const [isThemeVideoEnding, setIsThemeVideoEnding] = useState(false)
  const [audioToggleError, setAudioToggleError] = useState<string | null>(null)
  const themeVideoRef = useRef<HTMLVideoElement | null>(null)
  const themeVideoEndTimeoutRef = useRef<number | null>(null)

  const pointerIndexRef = useRef(0)
  const preloadTokenRef = useRef(0)
  const hasInitializedBackdropRef = useRef(false)
  // Refs mirror the slots/visibleSlotIndex state so preloadAndSwap always reads the
  // latest committed values (avoids stale closures across the two dependent state
  // pieces, which a plain functional setState on only one of them cannot guarantee).
  const slotsRef = useRef<[string, string]>([fallbackImageURL, fallbackImageURL])
  const visibleSlotIndexRef = useRef<0 | 1>(0)

  const enableThemeVideoAudio = useCallback(async (showFailureMessage: boolean) => {
    const video = themeVideoRef.current
    if (!video) return

    setAudioToggleError(null)
    video.muted = false
    video.volume = 1

    try {
      await video.play()
      setThemeVideoMuted(false)
      setAudioToggleError(null)
    } catch {
      video.muted = true
      setThemeVideoMuted(true)
      if (showFailureMessage) {
        setAudioToggleError('Ton konnte noch nicht aktiviert werden.')
      }
    }
  }, [])

  const preloadAndSwap = useCallback(async (targetUrl: string) => {
    preloadTokenRef.current += 1
    const token = preloadTokenRef.current

    const preloadSucceeded = await preloadImage(targetUrl)

    if (preloadTokenRef.current !== token) return

    const resolved = resolveBackdropSlotsAfterPreload({
      preloadSucceeded,
      currentSlots: slotsRef.current,
      visibleSlotIndex: visibleSlotIndexRef.current,
      nextUrl: targetUrl,
    })

    if (canSwapInPreloadedBackdrop(preloadSucceeded)) {
      const filledSlotIndex = resolved.visibleSlotIndex
      setSlotGenerations((prev) => {
        const next: [number, number] = [...prev]
        next[filledSlotIndex] += 1
        return next
      })
    }

    slotsRef.current = resolved.slots
    visibleSlotIndexRef.current = resolved.visibleSlotIndex
    setSlots(resolved.slots)
    setVisibleSlotIndex(resolved.visibleSlotIndex)
  }, [])

  useEffect(() => {
    if (!manifest) return undefined

    const normalizedBackdrops = normalizeBackdropImageURLs(manifest)
    const normalizedThemeVideos = normalizeThemeVideoURLs(manifest)
    const timeout = window.setTimeout(() => {
      const shuffledBackdrops = shuffle(normalizedBackdrops)
      const shuffledThemeVideos = shuffle(normalizedThemeVideos)

      setBackdropUrls(shuffledBackdrops)
      setActiveThemeVideoURL(shuffledThemeVideos[0] ?? null)
      setThemeVideoMuted(true)
      setAudioToggleError(null)
      setShowThemeVideo(shuffledThemeVideos.length > 0)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [manifest])

  useEffect(() => {
    if (backdropUrls.length === 0 || hasInitializedBackdropRef.current) return
    hasInitializedBackdropRef.current = true

    const initialIndex = Math.floor(Math.random() * backdropUrls.length)
    pointerIndexRef.current = initialIndex
    void preloadAndSwap(backdropUrls[initialIndex])
  }, [backdropUrls, preloadAndSwap])

  useEffect(() => {
    if (showThemeVideo || backdropUrls.length < 2) return undefined

    const timer = window.setInterval(() => {
      const nextIndex = getNextBackdropIndex(pointerIndexRef.current, backdropUrls.length)
      pointerIndexRef.current = nextIndex
      void preloadAndSwap(backdropUrls[nextIndex])
    }, ROTATION_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [backdropUrls, showThemeVideo, preloadAndSwap])

  useEffect(() => {
    return () => {
      // Invalidate any in-flight preload so a late .decode() resolution after unmount
      // can never trigger a setState on an unmounted component.
      preloadTokenRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!showThemeVideo || !activeThemeVideoUrl || !isThemeVideoMuted) return undefined

    function onUserActivation(event: Event) {
      const key = 'key' in event ? (event as KeyboardEvent).key : undefined
      if (isNavigationTriggerEvent(event.type as 'pointerdown' | 'keydown', event.target, key, window.location.href)) {
        return
      }
      void enableThemeVideoAudio(false)
    }

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown']
    for (const eventName of events) {
      window.addEventListener(eventName, onUserActivation, { passive: true })
    }

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onUserActivation)
      }
    }
  }, [showThemeVideo, activeThemeVideoUrl, isThemeVideoMuted, enableThemeVideoAudio])

  useEffect(() => {
    if (!showThemeVideo || !activeThemeVideoUrl) return undefined

    const video = themeVideoRef.current
    if (!video) return undefined

    const onPotentialNavigation = (event: Event) => {
      const key = 'key' in event ? (event as KeyboardEvent).key : undefined
      if (isNavigationTriggerEvent(event.type as 'pointerdown' | 'keydown', event.target, key, window.location.href)) {
        stopThemeVideoPlayback(video)
      }
    }

    const onPageHide = () => {
      stopThemeVideoPlayback(video)
    }

    const navigationEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown']
    for (const eventName of navigationEvents) {
      window.addEventListener(eventName, onPotentialNavigation, { passive: true })
    }
    window.addEventListener('pagehide', onPageHide)

    return () => {
      for (const eventName of navigationEvents) {
        window.removeEventListener(eventName, onPotentialNavigation)
      }
      window.removeEventListener('pagehide', onPageHide)
      stopThemeVideoPlayback(video)
    }
  }, [showThemeVideo, activeThemeVideoUrl])

  useEffect(() => {
    return () => {
      if (themeVideoEndTimeoutRef.current !== null) {
        window.clearTimeout(themeVideoEndTimeoutRef.current)
      }
    }
  }, [])

  const showEnableAudioButton = shouldRenderEnableAudioButton(showThemeVideo, activeThemeVideoUrl, isThemeVideoMuted)

  function finishThemeVideo(): void {
    if (themeVideoEndTimeoutRef.current !== null) {
      window.clearTimeout(themeVideoEndTimeoutRef.current)
      themeVideoEndTimeoutRef.current = null
    }
    setShowThemeVideo(false)
    setActiveThemeVideoURL(null)
    setThemeVideoMuted(true)
    setAudioToggleError(null)
    setIsThemeVideoEnding(false)
  }

  function handleThemeVideoNaturalEnd(): void {
    setIsThemeVideoEnding(true)
    themeVideoEndTimeoutRef.current = window.setTimeout(() => {
      finishThemeVideo()
    }, VIDEO_TO_IMAGE_FADE_MS)
  }

  return (
    <>
      <div className={styles.shell} aria-hidden="true">
        <div
          key="a"
          className={styles.backdropLayer}
          data-backdrop-slot="a"
          data-backdrop-visible={visibleSlotIndex === 0 ? 'true' : 'false'}
        >
          <div
            key={slotGenerations[0]}
            className={styles.backdropLayerZoom}
            style={{ backgroundImage: `url(${JSON.stringify(slots[0])})` }}
          />
        </div>
        <div
          key="b"
          className={styles.backdropLayer}
          data-backdrop-slot="b"
          data-backdrop-visible={visibleSlotIndex === 1 ? 'true' : 'false'}
        >
          <div
            key={slotGenerations[1]}
            className={styles.backdropLayerZoom}
            style={{ backgroundImage: `url(${JSON.stringify(slots[1])})` }}
          />
        </div>
        {showThemeVideo && activeThemeVideoUrl ? (
          <video
            key={activeThemeVideoUrl}
            ref={themeVideoRef}
            className={styles.video}
            data-theme-video-state={isThemeVideoEnding ? 'ending' : 'playing'}
            src={activeThemeVideoUrl}
            autoPlay
            muted={isThemeVideoMuted}
            playsInline
            preload="auto"
            onEnded={handleThemeVideoNaturalEnd}
            onError={finishThemeVideo}
          />
        ) : null}
        <div className={styles.overlay} />
      </div>
      {typeof document !== 'undefined' && showEnableAudioButton
        ? createPortal(
            <div className={styles.audioControl}>
              <button type="button" className={styles.audioButton} onClick={() => void enableThemeVideoAudio(true)}>
                Ton aktivieren
              </button>
              {audioToggleError ? <p className={styles.audioError}>{audioToggleError}</p> : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

async function preloadImage(url: string): Promise<boolean> {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return true
  } catch {
    return false
  }
}

function shuffle(values: string[]): string[] {
  const next = [...values]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}
