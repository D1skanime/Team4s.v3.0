'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { AnimeBackdropManifest } from '@/types/anime'
import { getAnimeBackdrops } from '@/lib/api'
import { normalizeBackdropImageURLs, normalizeThemeVideoURLs } from '@/lib/animeBackdrops'
import { getCoverUrl } from '@/lib/utils'
import { shouldRenderEnableAudioButton } from './themeVideoAudio'

import styles from './AnimeBackdropRotator.module.css'

interface AnimeBackdropRotatorProps {
  animeID: number
  coverImage?: string
  initialManifest?: AnimeBackdropManifest | null
}

const ROTATION_INTERVAL_MS = 9000

export function AnimeBackdropRotator({ animeID, coverImage, initialManifest = null }: AnimeBackdropRotatorProps) {
  const [backdropUrls, setBackdropUrls] = useState<string[]>(() => normalizeBackdropImageURLs(initialManifest))
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeThemeVideoUrl, setActiveThemeVideoURL] = useState<string | null>(() => {
    const themeVideos = normalizeThemeVideoURLs(initialManifest)
    return themeVideos[0] ?? null
  })
  const [showThemeVideo, setShowThemeVideo] = useState(() => normalizeThemeVideoURLs(initialManifest).length > 0)
  const [isThemeVideoMuted, setThemeVideoMuted] = useState(true)
  const [audioToggleError, setAudioToggleError] = useState<string | null>(null)
  const themeVideoRef = useRef<HTMLVideoElement | null>(null)

  const fallbackUrl = useMemo(() => getCoverUrl(coverImage), [coverImage])

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

  useEffect(() => {
    const initialBackdrops = normalizeBackdropImageURLs(initialManifest)
    const initialThemeVideos = normalizeThemeVideoURLs(initialManifest)
    if (initialBackdrops.length > 0 || initialThemeVideos.length > 0) {
      setBackdropUrls(shuffle(initialBackdrops))
      setActiveIndex(initialBackdrops.length > 0 ? Math.floor(Math.random() * initialBackdrops.length) : 0)
      setActiveThemeVideoURL(initialThemeVideos[0] ?? null)
      setThemeVideoMuted(true)
      setAudioToggleError(null)
      setShowThemeVideo(initialThemeVideos.length > 0)
      return
    }

    let isCancelled = false

    async function loadBackdrops() {
      try {
        const response = await getAnimeBackdrops(animeID)
        const normalizedBackdrops = normalizeBackdropImageURLs(response.data)
        const normalizedThemeVideos = normalizeThemeVideoURLs(response.data)

        if (isCancelled) return

        const shuffledBackdrops = shuffle(normalizedBackdrops)
        setBackdropUrls(shuffledBackdrops)
        if (shuffledBackdrops.length > 0) {
          setActiveIndex(Math.floor(Math.random() * shuffledBackdrops.length))
        } else {
          setActiveIndex(0)
        }

        const shuffledThemeVideos = shuffle(normalizedThemeVideos)
        if (shuffledThemeVideos.length > 0) {
          setActiveThemeVideoURL(shuffledThemeVideos[0])
          setThemeVideoMuted(true)
          setAudioToggleError(null)
          setShowThemeVideo(true)
        } else {
          setActiveThemeVideoURL(null)
          setThemeVideoMuted(true)
          setAudioToggleError(null)
          setShowThemeVideo(false)
        }

      } catch {
        // Keep cover fallback when no backdrop candidates are available.
        if (isCancelled) return
        setBackdropUrls([])
        setActiveIndex(0)
        setActiveThemeVideoURL(null)
        setThemeVideoMuted(true)
        setAudioToggleError(null)
        setShowThemeVideo(false)
      }
    }

    void loadBackdrops()
    return () => {
      isCancelled = true
    }
  }, [animeID, initialManifest])

  useEffect(() => {
    if (showThemeVideo || backdropUrls.length < 2) return undefined

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % backdropUrls.length)
    }, ROTATION_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [backdropUrls, showThemeVideo])

  useEffect(() => {
    if (!showThemeVideo || !activeThemeVideoUrl || !isThemeVideoMuted) return undefined

    function onUserActivation() {
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

  const activeBackdrop = backdropUrls[activeIndex] || fallbackUrl
  const showEnableAudioButton = shouldRenderEnableAudioButton(showThemeVideo, activeThemeVideoUrl, isThemeVideoMuted)

  function finishThemeVideo(): void {
    setShowThemeVideo(false)
    setActiveThemeVideoURL(null)
    setThemeVideoMuted(true)
    setAudioToggleError(null)
  }

  return (
    <>
      <div className={styles.shell} aria-hidden="true">
        <div className={styles.image} style={{ backgroundImage: `url("${activeBackdrop}")` }} />
        {showThemeVideo && activeThemeVideoUrl ? (
          <video
            key={activeThemeVideoUrl}
            ref={themeVideoRef}
            className={styles.video}
            src={activeThemeVideoUrl}
            autoPlay
            muted={isThemeVideoMuted}
            playsInline
            preload="auto"
            onEnded={finishThemeVideo}
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
