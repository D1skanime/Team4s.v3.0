'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { beginKeycloakLogin } from '@/lib/keycloakAuth'
import { useAuthSession } from '@/lib/useAuthSession'

import styles from './InviteAcceptFlow.module.css'

export type InviteAcceptFlowProps = {
  token: string
  title: string
  description: string
  loginPromptText: string
  loginHintEmail?: string
  onAccept: (token: string) => Promise<void>
  mapError: (error: unknown) => string
  successMessage: string
  afterAcceptRedirect?: string
  missingTokenText: string
}

function currentReturnPath(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

export function InviteAcceptFlow({
  token,
  title,
  description,
  loginPromptText,
  loginHintEmail,
  onAccept,
  mapError,
  successMessage,
  afterAcceptRedirect,
  missingTokenText,
}: InviteAcceptFlowProps) {
  const router = useRouter()
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successState, setSuccessState] = useState(false)
  const autoAcceptStartedRef = useRef(false)

  const handleAccept = useCallback(async () => {
    if (!token || !hasAccessToken || isSubmitting || successState) return

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await onAccept(token)
      setSuccessState(true)
      // Signal the app shell (drawer memberships) + dashboard to refetch the profile,
      // so a freshly-joined group appears immediately -- no manual reload needed.
      window.dispatchEvent(new Event('team4s:profile-changed'))
      if (afterAcceptRedirect) {
        router.replace(afterAcceptRedirect)
      }
    } catch (error) {
      setErrorMessage(mapError(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [afterAcceptRedirect, hasAccessToken, isSubmitting, mapError, onAccept, router, successState, token])

  useEffect(() => {
    if (
      token &&
      isClientInitialized &&
      hasAccessToken &&
      !successState &&
      !autoAcceptStartedRef.current
    ) {
      autoAcceptStartedRef.current = true
      void handleAccept()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isClientInitialized, hasAccessToken])

  const handleLogin = useCallback(async () => {
    await beginKeycloakLogin({ returnPath: currentReturnPath() })
  }, [])

  const handleRegister = useCallback(async () => {
    await beginKeycloakLogin({
      intent: 'register',
      returnPath: currentReturnPath(),
      loginHint: loginHintEmail,
    })
  }, [loginHintEmail])

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{description}</p>

        {!token ? <p className={styles.text}>{missingTokenText}</p> : null}

        {token && isClientInitialized && !hasAccessToken ? (
          <>
            <p className={styles.text}>{loginPromptText}</p>
            <div className={styles.actions}>
              <Button type="button" onClick={() => void handleLogin()}>
                Anmelden
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleRegister()}>
                Registrieren
              </Button>
            </div>
          </>
        ) : null}

        {token && isClientInitialized && hasAccessToken && !successState ? (
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Einladung wird angenommen...' : 'Einladung annehmen'}
            </Button>
          </div>
        ) : null}

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        {successState ? (
          <div className={styles.success}>
            <p className={styles.text}>{successMessage}</p>
            <Link className={styles.link} href="/me/profile">
              Zum Profil
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  )
}
