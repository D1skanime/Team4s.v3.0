'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ApiError,
  completeKeycloakAuthCallback,
  getAuthSessionSnapshot,
  logoutActiveAuthSession,
} from '@/lib/api'
import { Button } from '@/components/ui'
import {
  beginKeycloakLogin,
  consumeStoredReturnPath,
  isKeycloakEnabled,
} from '@/lib/keycloakAuth'
import { hasPendingRegistrationCompletion } from '@/lib/registrationCompletion'

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
  const callbackCompletionRef = useRef<Promise<void> | null>(null)
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

      // Read and clear the one-shot persisted returnPath exactly once per callback
      // attempt, regardless of success or failure, so a stale value never leaks into
      // a later, unrelated callback.
      const persistedReturnPath = consumeStoredReturnPath()

      try {
        setIsBusy(true)
        setErrorMessage(null)
        callbackCompletionRef.current ??= completeKeycloakAuthCallback(code, state).then(() => undefined)
        await callbackCompletionRef.current
        if (!cancelled) {
          // A returnPath persisted by the invite-accept flow's own button click takes
          // priority over both the registration-completion default and the URL `next`
          // param, so a fresh registration started from an invite link lands back on
          // the invite page instead of "Mein Account".
          const destination = persistedReturnPath ?? (hasPendingRegistrationCompletion() ? '/me/profile' : nextPath)
          router.replace(destination)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(readErrorMessage(error, 'Anmeldung konnte nicht abgeschlossen werden.'))
          window.history.replaceState({}, document.title, window.location.pathname)
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
      if (isAlreadySignedIn) {
        await logoutActiveAuthSession()
        setIsAlreadySignedIn(false)
        await beginKeycloakLogin({ prompt: 'login' })
        return
      }
      await beginKeycloakLogin()
    } catch (error) {
      setErrorMessage(readErrorMessage(error, 'Anmeldung konnte nicht gestartet werden.'))
      setIsBusy(false)
    }
  }, [isAlreadySignedIn, keycloakEnabled])

  const handleRegister = useCallback(async () => {
    if (!keycloakEnabled) {
      setErrorMessage('Keycloak ist lokal nicht aktiv. Starte Keycloak, um dich zu registrieren.')
      return
    }

    try {
      setIsBusy(true)
      setErrorMessage(null)
      if (isAlreadySignedIn) {
        await logoutActiveAuthSession()
        setIsAlreadySignedIn(false)
      }
      await beginKeycloakLogin({ intent: 'register' })
    } catch (error) {
      setErrorMessage(readErrorMessage(error, 'Registrierung konnte nicht gestartet werden.'))
      setIsBusy(false)
    }
  }, [isAlreadySignedIn, keycloakEnabled])

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Anmelden</h1>
        <p className={styles.text}>
          Melde dich mit deinem Team4s-Account an oder registriere dich neu. Profil, Gruppen und Berechtigungen werden danach automatisch geladen.
        </p>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => void handleLogin()}
            disabled={isBusy || !keycloakEnabled}
            loading={isBusy}
          >
            {isAlreadySignedIn ? 'Erneut anmelden' : 'Anmelden'}
          </Button>
          {!isAlreadySignedIn ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRegister()}
              disabled={isBusy || !keycloakEnabled}
            >
              Registrieren
            </Button>
          ) : null}
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
