'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

import {
  ApiError,
  clearAuthSession,
  getRuntimeAuthToken,
  getRuntimeDisplayName,
  getRuntimeRefreshToken,
  hasRuntimeAuthToken,
  issueAuthToken,
  persistAuthSession,
  refreshAuthToken,
  revokeAuthToken,
} from '@/lib/api'

import styles from './page.module.css'

const AUTH_RUNTIME_PROFILE = (process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local').trim().toLowerCase()
const AUTH_ISSUE_DEV_MODE_ENABLED = (process.env.NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE || 'false').trim().toLowerCase() === 'true'

function isLocalDevProfile(profile: string): boolean {
  return profile === '' || profile === 'local' || profile === 'dev' || profile === 'development' || profile === 'test'
}

export default function AuthPage() {
  const [issueKey, setIssueKey] = useState('')
  const [activeDisplayName, setActiveDisplayName] = useState('')
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [hasRefreshToken, setHasRefreshToken] = useState(false)
  const [accessTokenPreview, setAccessTokenPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const localProfile = isLocalDevProfile(AUTH_RUNTIME_PROFILE)
  const devFallbackAllowed = localProfile && AUTH_ISSUE_DEV_MODE_ENABLED
  const canIssueToken = hasAccessToken || devFallbackAllowed

  function updateRuntimeState() {
    const runtimeAccessToken = getRuntimeAuthToken()
    const runtimeRefreshToken = getRuntimeRefreshToken()
    const runtimeDisplayName = getRuntimeDisplayName()

    setHasAccessToken(runtimeAccessToken.length > 0)
    setHasRefreshToken(runtimeRefreshToken.length > 0)
    setActiveDisplayName(runtimeDisplayName)
    setAccessTokenPreview(runtimeAccessToken.length > 24 ? `${runtimeAccessToken.slice(0, 24)}...` : runtimeAccessToken)
  }

  useEffect(() => {
    updateRuntimeState()
  }, [])

  async function handleIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canIssueToken) {
      setErrorMessage('Token-Ausstellung benoetigt hier eine verifizierte Bearer-Identity.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const payload = devFallbackAllowed ? { issue_key: issueKey.trim() || undefined } : {}
      const response = await issueAuthToken(payload, devFallbackAllowed ? null : undefined)
      persistAuthSession(response.data)
      updateRuntimeState()
      setSuccessMessage('Token erfolgreich aus vertrauenswuerdiger Quelle erstellt und lokal gespeichert.')
    } catch (error) {
      setSuccessMessage(null)
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Token konnte nicht erstellt werden.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRefresh() {
    const refreshToken = getRuntimeRefreshToken()
    if (!refreshToken) {
      setErrorMessage('Kein refresh_token vorhanden. Bitte zuerst Token erstellen.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await refreshAuthToken({ refresh_token: refreshToken })
      persistAuthSession(response.data)
      updateRuntimeState()
      setSuccessMessage('Token erfolgreich aktualisiert.')
    } catch (error) {
      setSuccessMessage(null)
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Token konnte nicht aktualisiert werden.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRevoke() {
    const refreshToken = getRuntimeRefreshToken()
    if (!hasRuntimeAuthToken()) {
      setErrorMessage('Kein Access-Token vorhanden.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      await revokeAuthToken(refreshToken ? { refresh_token: refreshToken } : {})
      clearAuthSession()
      updateRuntimeState()
      setSuccessMessage('Session wurde widerrufen und lokal entfernt.')
    } catch (error) {
      setSuccessMessage(null)
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Session konnte nicht widerrufen werden.')
      }
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
        <h1 className={styles.title}>Auth Lifecycle</h1>
        <p className={styles.subtitle}>Issue, Refresh und Revoke fuer lokale Entwicklung mit Signed Tokens.</p>
      </header>

      <section className={styles.panel}>
        <h2>Aktueller Zustand</h2>
        <p>Access-Token: {hasAccessToken ? 'vorhanden' : 'nicht vorhanden'}</p>
        <p>Refresh-Token: {hasRefreshToken ? 'vorhanden' : 'nicht vorhanden'}</p>
        <p>Display Name: {activeDisplayName || 'n/a'}</p>
        <p className={styles.tokenPreview}>Token-Vorschau: {accessTokenPreview || 'n/a'}</p>
      </section>

      <section className={styles.panel}>
        <h2>Token ausstellen</h2>
        <p>
          Profil: <strong>{AUTH_RUNTIME_PROFILE || 'local'}</strong>
        </p>
        <p>Die Identity kommt serverseitig aus einer vertrauenswuerdigen Quelle (nicht aus Formfeldern).</p>
        {!devFallbackAllowed ? (
          <div className={styles.infoBox}>
            Dev-Fallback ist deaktiviert. Fuer `POST /api/v1/auth/issue` wird eine gueltige Bearer-Identity erwartet.
          </div>
        ) : (
          <div className={styles.successBox}>Lokaler Dev-Fallback ist aktiv.</div>
        )}
        <form className={styles.form} onSubmit={handleIssue}>
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

          <button type="submit" disabled={isSubmitting || !canIssueToken}>
            {isSubmitting ? 'Speichern...' : 'Issue Token'}
          </button>
          {!canIssueToken ? (
            <p className={styles.hint}>Kein Access-Token vorhanden. Token-Issue ist in diesem Profil ohne Dev-Fallback nicht verfuegbar.</p>
          ) : null}
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Token erneuern / widerrufen</h2>
        <div className={styles.actionRow}>
          <button type="button" onClick={handleRefresh} disabled={isSubmitting || !hasRefreshToken}>
            {isSubmitting ? 'Bitte warten...' : 'Refresh Token'}
          </button>
          <button type="button" onClick={handleRevoke} disabled={isSubmitting || !hasAccessToken}>
            {isSubmitting ? 'Bitte warten...' : 'Revoke Session'}
          </button>
        </div>
      </section>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
    </main>
  )
}
