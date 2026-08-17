'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { acceptFansubInvitation, ApiError } from '@/lib/api'
import { LoadingState } from '@/components/ui'
import { InviteAcceptFlow } from '@/components/auth/InviteAcceptFlow'

function fansubInvitationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'invitation_expired':
        return 'Dieser Einladungslink ist abgelaufen. Bitte die Gruppenleitung, einen neuen Link zu erstellen.'
      case 'invitation_used':
        return 'Diese Einladung wurde bereits verwendet.'
      case 'invitation_cancelled':
        return 'Diese Einladung wurde zurückgezogen.'
      case 'invalid_invitation_state':
        return 'Diese Einladung kann nicht mehr verwendet werden.'
      case 'email_mismatch':
        return 'Diese Einladung gehört zu einer anderen E-Mail-Adresse.'
      case 'membership_conflict':
        return 'Du bist bereits aktives Mitglied dieser Gruppe.'
      default:
        return error.message || 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
    }
  }
  return 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const emailParam = useMemo(() => {
    const raw = (searchParams.get('email') || '').trim()
    if (!raw || !raw.includes('@') || raw.length > 254) return undefined
    return raw
  }, [searchParams])

  return (
    <InviteAcceptFlow
      token={token}
      title="Fansub-Einladung annehmen"
      description="Du wurdest eingeladen, einer Fansub-Gruppe auf Team4s beizutreten. Melde dich an oder erstelle ein Konto, um die Einladung anzunehmen."
      loginPromptText="Bitte melde dich an oder registriere dich, um die Einladung anzunehmen. Du kommst danach automatisch zurück."
      loginHintEmail={emailParam}
      onAccept={(tok) => acceptFansubInvitation({ token: tok }).then(() => undefined)}
      mapError={fansubInvitationErrorMessage}
      successMessage="Die Einladung wurde erfolgreich angenommen. Du bist jetzt Mitglied der Gruppe."
      missingTokenText="Im Link fehlt ein gültiges Einladungs-Token."
    />
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingState title="Einladung wird geladen" />}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
