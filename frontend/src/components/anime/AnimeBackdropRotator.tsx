'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getAnimeBackdrops } from '@/lib/api'
import { getCoverUrl } from '@/lib/utils'
import { shouldRenderEnableAudioButton } from './themeVideoAudio'

import styles from './AnimeBackdropRotator.module.css'

interface AnimeBackdropRotatorProps {
  animeID: number
  coverImage?: string
}

const ROTATION_INTERVAL_MS = 9000
const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

export function AnimeBackdropRotator({ animeID, coverImage }: AnimeBackdropRotatorProps) {
  const [backdropUrls, setBackdropUrls] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeThemeVideoUrl, setActiveThemeVideoURL] = useState<string | null>(null)
  const [showThemeVideo, setShowThemeVideo] = useState(false)
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
    let isCancelled = false

    async function loadBackdrops() {
      try {
        const response = await getAnimeBackdrops(animeID)
        const base = API_PUBLIC_BASE_URL.endsWith('/') ? API_PUBLIC_BASE_URL : `${API_PUBLIC_BASE_URL}/`
        const normalizedBackdrops = (response.data.backdrops || [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .map((item) => {
            const imageURL = new URL(item, base)
            imageURL.searchParams.set('width', '1920')
            imageURL.searchParams.set('quality', '86')
            return imageURL.toString()
          })
        const normalizedThemeVideos = (response.data.theme_videos || [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .map((item) => new URL(item, base).toString())

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
  }, [animeID])

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
