'use client'

import { useEffect, useRef, useState } from 'react'
import { X, AlertCircle, RotateCw } from 'lucide-react'

import { MediaAsset } from '@/types/mediaAsset'

import styles from './VideoPlayerModal.module.css'

interface VideoPlayerModalProps {
  isOpen: boolean
  asset: MediaAsset | null
  onClose: () => void
}

type ErrorType = '401' | '404' | '500' | '503' | 'timeout' | null

interface ErrorState {
  type: ErrorType
  message: string
}

const ERROR_MESSAGES: Record<Exclude<ErrorType, null>, string> = {
  '401': 'Authentifizierung erforderlich.',
  '404': 'Asset nicht gefunden.',
  '500': 'Stream nicht verfuegbar.',
  '503': 'Stream nicht verfuegbar.',
  timeout: 'Zeitueberschreitung.',
}

const LOADING_TIMEOUT_MS = 15000
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

export default function VideoPlayerModal({ isOpen, asset, onClose }: VideoPlayerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], video, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus close button on open
    closeButtonRef.current?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  // Setup loading timeout (component remounts on asset change via key prop)
  useEffect(() => {
    if (!isOpen || !asset) {
      return
    }

    // Set loading timeout
    const timeout = setTimeout(() => {
      setLoading(false)
      setError({
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
      })
    }, LOADING_TIMEOUT_MS)

    timeoutRef.current = timeout

    return () => {
      clearTimeout(timeout)
      timeoutRef.current = null
    }
  }, [isOpen, asset])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleVideoCanPlay = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setLoading(false)
    setError(null)
  }

  const handleVideoError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setLoading(false)

    // Try to determine error type from video element
    const video = videoRef.current
    if (!video) {
      setError({ type: '500', message: ERROR_MESSAGES['500'] })
      return
    }

    // Check network state
    if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setError({ type: '404', message: ERROR_MESSAGES['404'] })
      return
    }

    // Default to server error
    setError({ type: '500', message: ERROR_MESSAGES['500'] })
  }

  const handleRetry = () => {
    if (!asset) return

    setLoading(true)
    setError(null)

    // Reset video element
    if (videoRef.current) {
      videoRef.current.load()
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setError({
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
      })
    }, LOADING_TIMEOUT_MS)
  }

  const handleReload = () => {
    window.location.reload()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !asset) {
    return null
  }

  const streamUrl = `${API_BASE_URL}${asset.stream_path}`

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-title"
    >
      <div className={styles.modalContainer} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 id="video-player-title" className={styles.modalTitle}>
            {asset.title}
          </h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Modal schliessen"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.videoContainer}>
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Stream wird geladen...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorOverlay}>
              <AlertCircle size={48} className={styles.errorIcon} />
              <p className={styles.errorMessage}>{error.message}</p>
              <div className={styles.errorActions}>
                {error.type === '401' && (
                  <button className={styles.errorButton} onClick={handleReload} type="button">
                    Seite neu laden
                  </button>
                )}
                {(error.type === '500' || error.type === '503' || error.type === 'timeout') && (
                  <button className={styles.errorButton} onClick={handleRetry} type="button">
                    <RotateCw size={16} />
                    Erneut versuchen
                  </button>
                )}
                <button className={styles.errorButtonSecondary} onClick={onClose} type="button">
                  Schliessen
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className={styles.video}
            controls
            autoPlay
            onCanPlay={handleVideoCanPlay}
            onError={handleVideoError}
            style={{ display: loading || error ? 'none' : 'block' }}
          >
            <source src={streamUrl} type="video/mp4" />
            Ihr Browser unterstuetzt das Video-Tag nicht.
          </video>
        </div>
      </div>
    </div>
  )
}
