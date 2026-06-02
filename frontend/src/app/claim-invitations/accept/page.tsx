'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { acceptClaimInvitation, ApiError } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

function claimInvitationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'invitation_expired':
        return 'Dieser Einladungslink ist abgelaufen. Bitte deinen Leader, einen neuen Link zu erstellen.'
      case 'invitation_used':
        return 'Diese Einladung wurde bereits verwendet.'
      case 'invitation_cancelled':
        return 'Diese Einladung wurde zurückgezogen.'
      case 'already_verified':
        return 'Dieser historische Member-Eintrag ist bereits einem Team4s-Account zugeordnet.'
      default:
        return error.message || 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
    }
  }
  return 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
}

function AcceptClaimInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const loginReturnTo = `/claim-invitations/accept?token=${token}`

  async function handleAccept() {
    if (!token || !hasAccessToken) return

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await acceptClaimInvitation({ token })
      setSuccessMessage('Dein Account ist jetzt als Mitglied verifiziert. Dein Profil ist ab sofort öffentlich indexierbar.')
      router.replace('/me/profile')
    } catch (error) {
      setErrorMessage(claimInvitationErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <h1>Member-Claim-Einladung annehmen</h1>
      <p>Verbinde deinen Team4s-Account mit einem historischen Fansub-Member-Eintrag.</p>

      {!token ? <p style={{ color: '#8b1e1e' }}>Im Link fehlt ein gültiges Einladungs-Token.</p> : null}
      {token && !isClientInitialized ? <p>Einladung wird geladen...</p> : null}
      {token && isClientInitialized && !hasAccessToken ? (
        <p>
          Bitte melde dich zuerst an oder erstelle einen Account. Danach kommst du automatisch zurück:
          {' '}
          <Link href={`/login?return_to=${encodeURIComponent(loginReturnTo)}`}>Anmelden oder registrieren</Link>
        </p>
      ) : null}
      {token && isClientInitialized && hasAccessToken ? (
        <button type="button" onClick={() => void handleAccept()} disabled={isSubmitting}>
          {isSubmitting ? 'Einladung wird angenommen...' : 'Einladung annehmen'}
        </button>
      ) : null}

      {errorMessage ? <p style={{ color: '#8b1e1e', marginTop: '1rem' }}>{errorMessage}</p> : null}
      {successMessage ? (
        <p style={{ color: '#1f6f3a', marginTop: '1rem' }}>
          {successMessage} <Link href="/me/profile">Zum Profil</Link>
        </p>
      ) : null}
    </main>
  )
}

export default function AcceptClaimInvitationPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>Einladung wird geladen...</main>}>
      <AcceptClaimInvitationContent />
    </Suspense>
  )
}
