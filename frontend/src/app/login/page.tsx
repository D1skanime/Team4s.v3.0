'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ApiError,
  completeKeycloakAuthCallback,
  getAuthSessionSnapshot,
} from '@/lib/api'
import {
  beginKeycloakLogin,
  isKeycloakEnabled,
} from '@/lib/keycloakAuth'

import styles from './page.module.css'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function readSafeNextPath(): string {
  if (typeof window === 'undefined') return '/me/profile'

  const params = new URLSearchParams(window.location.search)
  const next = (params.get('next') || '').trim()
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) {
    return '/me/profile'
  }
  return next
}

export default function LoginPage() {
  const router = useRouter()
  const keycloakEnabled = isKeycloakEnabled()
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAlreadySignedIn, setIsAlreadySignedIn] = useState(false)
  const nextPath = useMemo(() => readSafeNextPath(), [])

  useEffect(() => {
    const snapshot = getAuthSessionSnapshot()
    setIsAlreadySignedIn(snapshot.hasAccessToken || snapshot.hasRefreshToken)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function completeCallback() {
      if (!keycloakEnabled || typeof window === 'undefined') return

      const params = new URLSearchParams(window.location.search)
      const code = (params.get('code') || '').trim()
      const state = (params.get('state') || '').trim()
      const upstreamError = (params.get('error_description') || params.get('error') || '').trim()

      if (upstreamError) {
        setErrorMessage(upstreamError)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (!code || !state) return

      try {
        setIsBusy(true)
        setErrorMessage(null)
        await completeKeycloakAuthCallback(code, state)
        if (!cancelled) router.replace(nextPath)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(readErrorMessage(error, 'Anmeldung konnte nicht abgeschlossen werden.'))
        }
      } finally {
        if (!cancelled) setIsBusy(false)
      }
    }

    void completeCallback()

    return () => {
      cancelled = true
    }
  }, [keycloakEnabled, nextPath, router])

  const handleLogin = useCallback(async () => {
    if (!keycloakEnabled) {
      setErrorMessage('Keycloak ist lokal nicht aktiv. Starte Keycloak, um dich anzumelden.')
      return
    }

    try {
      setIsBusy(true)
      setErrorMessage(null)
      await beginKeycloakLogin()
    } catch (error) {
      setErrorMessage(readErrorMessage(error, 'Anmeldung konnte nicht gestartet werden.'))
      setIsBusy(false)
    }
  }, [keycloakEnabled])

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Anmelden</h1>
        <p className={styles.text}>
          Melde dich mit deinem Team4s-Account an. Profil, Gruppen und Berechtigungen werden danach automatisch geladen.
        </p>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void handleLogin()} disabled={isBusy || !keycloakEnabled}>
            {isBusy ? 'Bitte warten...' : isAlreadySignedIn ? 'Erneut anmelden' : 'Mit Keycloak anmelden'}
          </button>
          {isAlreadySignedIn ? (
            <Link className={styles.link} href={nextPath}>
              Weiter zum Profil
            </Link>
          ) : (
            <Link className={styles.link} href="/anime">
              Zur Anime-Liste
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
