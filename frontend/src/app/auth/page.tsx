'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import type { CurrentUserData } from '@/types/auth'
import {
  ApiError,
  clearAuthSession,
  completeKeycloakAuthCallback,
  getAuthSessionSnapshot,
  getRuntimeDisplayName,
  issueAuthToken,
  logoutActiveAuthSession,
  persistResolvedAuthSession,
  refreshActiveAuthSession,
  resolveCurrentUserFromAuthSession,
} from '@/lib/api'
import {
  beginKeycloakLogin,
  isKeycloakEnabled,
} from '@/lib/keycloakAuth'

import styles from './page.module.css'

const AUTH_RUNTIME_PROFILE = (process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local').trim().toLowerCase()
const AUTH_ISSUE_DEV_MODE_ENABLED = ((process.env.NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE || 'false').trim().toLowerCase() === 'true')

function isLocalDevProfile(profile: string): boolean {
  return profile === '' || profile === 'local' || profile === 'dev' || profile === 'development' || profile === 'test'
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function isStaleRuntimeSessionError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const status = Number('status' in error ? (error as { status?: unknown }).status : 0)
    if (status === 401) {
      return true
    }

    const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : ''
    if (typeof maybeMessage === 'string') {
      const normalizedMessage = maybeMessage.trim().toLowerCase()
      if (normalizedMessage.includes('ungueltiges zugriffstoken') || normalizedMessage.includes('invalid token')) {
        return true
      }
    }
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return true
    }

    const normalizedMessage = error.message.trim().toLowerCase()
    return normalizedMessage.includes('ungueltiges zugriffstoken') || normalizedMessage.includes('invalid token')
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.trim().toLowerCase()
    return normalizedMessage.includes('ungueltiges zugriffstoken') || normalizedMessage.includes('invalid token')
  }

  return false
}

function getCurrentUserGlobalRoles(user: CurrentUserData | null): string[] {
  return Array.isArray(user?.global_roles) ? user.global_roles : []
}

export default function AuthPage() {
  const keycloakEnabled = isKeycloakEnabled()
  const localProfile = useMemo(() => isLocalDevProfile(AUTH_RUNTIME_PROFILE), [])
  const devFallbackAllowed = localProfile && AUTH_ISSUE_DEV_MODE_ENABLED && !keycloakEnabled

  const [issueKey, setIssueKey] = useState('')
  const [activeDisplayName, setActiveDisplayName] = useState('')
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [hasRefreshToken, setHasRefreshToken] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolvingSession, setIsResolvingSession] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const currentUserGlobalRoles = getCurrentUserGlobalRoles(currentUser)
  const hasActiveKeycloakSession = keycloakEnabled && (hasAccessToken || currentUser !== null)
  const keycloakLoginLabel = isResolvingSession
    ? 'Session wird geprüft...'
    : isSubmitting
      ? 'Weiterleitung...'
      : currentUser
        ? 'Angemeldet'
        : hasActiveKeycloakSession
          ? 'Session vorhanden'
          : 'Mit Keycloak anmelden'

  const updateRuntimeState = useCallback((nextCurrentUser?: CurrentUserData | null) => {
    const snapshot = getAuthSessionSnapshot()
    const runtimeDisplayName = snapshot.displayName || getRuntimeDisplayName()

    setHasAccessToken(snapshot.hasAccessToken)
    setHasRefreshToken(snapshot.hasRefreshToken)
    setActiveDisplayName(nextCurrentUser?.display_name || runtimeDisplayName)
  }, [])

  useEffect(() => {
    updateRuntimeState()
  }, [updateRuntimeState])

  useEffect(() => {
    let cancelled = false

    async function resolveCurrentUserFromRuntimeToken() {
      const snapshot = getAuthSessionSnapshot()
      if (!keycloakEnabled || !snapshot.hasAccessToken) {
        return
      }

      try {
        const response = await resolveCurrentUserFromAuthSession()
        if (cancelled) {
          return
        }
        setCurrentUser(response.data)
        updateRuntimeState(response.data)
      } catch (error) {
        if (cancelled) {
          return
        }
        if (isStaleRuntimeSessionError(error)) {
          clearAuthSession({ broadcast: false })
          updateRuntimeState(null)
        }
        setCurrentUser(null)
      }
    }

    void resolveCurrentUserFromRuntimeToken()

    return () => {
      cancelled = true
    }
  }, [keycloakEnabled, updateRuntimeState])

  useEffect(() => {
    let cancelled = false

    async function resolveKeycloakCallback() {
      if (!keycloakEnabled || typeof window === 'undefined') {
        return
      }

      const params = new URLSearchParams(window.location.search)
      const code = (params.get('code') || '').trim()
      const state = (params.get('state') || '').trim()
      const upstreamError = (params.get('error_description') || params.get('error') || '').trim()

      if (upstreamError) {
        setErrorMessage(upstreamError)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (!code || !state) {
        return
      }

      try {
        setIsResolvingSession(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        const me = await completeKeycloakAuthCallback(code, state)

        if (cancelled) {
          return
        }

        setCurrentUser(me.data)
        updateRuntimeState(me.data)
        setSuccessMessage('Keycloak-Anmeldung erfolgreich. Team4s hat den aktuellen App-Benutzer aufgelöst.')
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        if (cancelled) {
          return
        }
        setErrorMessage(formatError(error, 'Keycloak-Anmeldung konnte nicht abgeschlossen werden.'))
      } finally {
        if (!cancelled) {
          setIsResolvingSession(false)
        }
      }
    }

    void resolveKeycloakCallback()

    return () => {
      cancelled = true
    }
  }, [keycloakEnabled, updateRuntimeState])

  async function handleLegacyIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const payload = devFallbackAllowed ? { issue_key: issueKey.trim() || undefined } : {}
      const response = await issueAuthToken(payload, devFallbackAllowed ? null : undefined)
      await persistResolvedAuthSession(response.data)
      setCurrentUser(null)
      updateRuntimeState()
      setSuccessMessage('Legacy-Token wurde erfolgreich lokal gespeichert.')
    } catch (error) {
      setSuccessMessage(null)
      setErrorMessage(formatError(error, 'Token konnte nicht erstellt werden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleKeycloakLogin() {
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await beginKeycloakLogin()
    } catch (error) {
      setErrorMessage(formatError(error, 'Keycloak-Anmeldung konnte nicht gestartet werden.'))
      setIsSubmitting(false)
    }
  }

  async function handleRefresh() {
    if (!getAuthSessionSnapshot().hasRefreshToken) {
      setErrorMessage('Kein Refresh-Token vorhanden. Bitte zuerst anmelden.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const me = await refreshActiveAuthSession()
      setCurrentUser(me?.data || null)
      updateRuntimeState(me?.data || null)
      setSuccessMessage(keycloakEnabled ? 'Keycloak-Session wurde erfolgreich aktualisiert.' : 'Legacy-Session wurde erfolgreich aktualisiert.')
    } catch (error) {
      setSuccessMessage(null)
      setErrorMessage(formatError(error, 'Session konnte nicht aktualisiert werden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    if (!getAuthSessionSnapshot().hasAccessToken) {
      setErrorMessage('Kein Access-Token vorhanden.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      await logoutActiveAuthSession()
      setCurrentUser(null)
      updateRuntimeState(null)
      setSuccessMessage(keycloakEnabled ? 'Keycloak-Session wurde lokal beendet.' : 'Session wurde widerrufen und lokal entfernt.')
    } catch (error) {
      setSuccessMessage(null)
      setErrorMessage(formatError(error, 'Session konnte nicht beendet werden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/anime">Zur Anime-Liste</Link>
        <span> | </span>
        <Link href="/watchlist">Zur Watchlist</Link>
        <span> | </span>
        <Link href="/admin">Zu Admin</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Authentifizierung</h1>
        <p className={styles.subtitle}>
          {keycloakEnabled
            ? 'Phase-43-Login über Keycloak mit Team4s-App-Benutzer-Auflösung über `/api/me`.'
            : 'Legacy-Issue-, Refresh- und Revoke-Flow für lokale Signed Tokens.'}
        </p>
      </header>

      <section className={styles.panel}>
        <h2>Aktueller Zustand</h2>
        <p>Modus: <strong>{keycloakEnabled ? 'Keycloak' : 'Legacy'}</strong></p>
        <p>Profil: <strong>{AUTH_RUNTIME_PROFILE || 'local'}</strong></p>
        <p>Access-Token: {hasAccessToken ? 'vorhanden' : 'nicht vorhanden'}</p>
        <p>Refresh-Token: {hasRefreshToken ? 'vorhanden' : 'nicht vorhanden'}</p>
        <p>Anzeigename: {activeDisplayName || 'n/a'}</p>
        {currentUser ? (
          <div className={styles.identityCard}>
            <div>
              <span>App-User</span>
              <strong>{currentUser.display_name}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{currentUser.status}</strong>
            </div>
            <div>
              <span>E-Mail</span>
              <strong>{currentUser.email}</strong>
            </div>
            <div>
              <span>Globale Rollen</span>
              <strong>{currentUserGlobalRoles.length ? currentUserGlobalRoles.join(', ') : 'keine'}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {keycloakEnabled ? (
        <section className={styles.panel}>
          <h2>Keycloak-Login</h2>
          <p>Keycloak bleibt für Identität und Login zuständig. Team4s wertet globale Rollen und Fansub-Rollen in der eigenen Datenbank aus.</p>
          <div className={styles.actionRow}>
            <button type="button" onClick={() => void handleKeycloakLogin()} disabled={isSubmitting || isResolvingSession || hasActiveKeycloakSession}>
              {keycloakLoginLabel}
            </button>
            <button type="button" onClick={() => void handleRefresh()} disabled={isSubmitting || !hasRefreshToken}>
              {isSubmitting ? 'Bitte warten...' : 'Session aktualisieren'}
            </button>
            <button type="button" onClick={() => void handleLogout()} disabled={isSubmitting || !hasAccessToken}>
              {isSubmitting ? 'Bitte warten...' : 'Abmelden'}
            </button>
          </div>
          <p className={styles.hint}>
            Nach erfolgreichem Login sollte `/api/me` einen Team4s-`app_user` liefern. Pending-Benutzer dürfen lesen, aber keine Admin-Mutationen ausführen.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.panel}>
            <h2>Legacy-Token ausstellen</h2>
            <p>Diese Fallback-Oberfläche bleibt nur für lokale Entwicklung ohne aktiviertes Keycloak erhalten.</p>
            {!devFallbackAllowed ? (
              <div className={styles.infoBox}>
                Dev-Fallback ist deaktiviert. Für `POST /api/v1/auth/issue` wird eine gültige Bearer-Identity erwartet.
              </div>
            ) : (
              <div className={styles.successBox}>Lokaler Dev-Fallback ist aktiv.</div>
            )}
            <form className={styles.form} onSubmit={handleLegacyIssue}>
              {devFallbackAllowed ? (
                <>
                  <label htmlFor="issue-key">Issue Key (optional, nur falls konfiguriert)</label>
                  <input
                    id="issue-key"
                    type="text"
                    value={issueKey}
                    onChange={(event) => setIssueKey(event.target.value)}
                    disabled={isSubmitting}
                  />
                </>
              ) : null}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Speichern...' : 'Legacy-Token ausstellen'}
              </button>
            </form>
          </section>

          <section className={styles.panel}>
            <h2>Legacy-Session verwalten</h2>
            <div className={styles.actionRow}>
              <button type="button" onClick={() => void handleRefresh()} disabled={isSubmitting || !hasRefreshToken}>
                {isSubmitting ? 'Bitte warten...' : 'Refresh Token'}
              </button>
              <button type="button" onClick={() => void handleLogout()} disabled={isSubmitting || !hasAccessToken}>
                {isSubmitting ? 'Bitte warten...' : 'Session widerrufen'}
              </button>
            </div>
          </section>
        </>
      )}

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
    </main>
  )
}
