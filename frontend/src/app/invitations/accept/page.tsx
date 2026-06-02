'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { acceptFansubInvitation, ApiError } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleAccept() {
    if (!token || !hasAccessToken) {
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await acceptFansubInvitation({ token })
      setSuccessMessage('Die Einladung wurde erfolgreich angenommen.')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Einladung konnte nicht angenommen werden.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem' }}>
      <h1>Fansub-Einladung annehmen</h1>
      <p>
        Dieser Flow akzeptiert nur eingeloggte App-Benutzer. Keycloak bleibt für Login und Session zuständig,
        Team4s prüft danach E-Mail-Match, Ablauf und Gruppenmitgliedschaft.
      </p>

      {!token ? (
        <p>Im Link fehlt ein gültiges Einladungs-Token.</p>
      ) : null}
      {token && isClientInitialized && !hasAccessToken ? (
        <p>
          Bitte zuerst über <Link href="/login">anmelden</Link> anmelden und danach zu dieser Seite zurückkehren.
        </p>
      ) : null}
      {token && isClientInitialized && hasAccessToken ? (
        <button type="button" onClick={() => void handleAccept()} disabled={isSubmitting}>
          {isSubmitting ? 'Einladung wird angenommen...' : 'Einladung annehmen'}
        </button>
      ) : null}

      {errorMessage ? <p style={{ color: '#8b1e1e', marginTop: '1rem' }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ color: '#1f6f3a', marginTop: '1rem' }}>{successMessage}</p> : null}
    </main>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem' }}>Einladung wird geladen...</main>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
