'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import { acceptClaimInvitation, ApiError } from '@/lib/api'
import { LoadingState } from '@/components/ui'
import { InviteAcceptFlow } from '@/components/auth/InviteAcceptFlow'

function claimInvitationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'invitation_expired':
        return 'Dieser Einladungslink ist abgelaufen. Bitte die Gruppenleitung, einen neuen Link zu erstellen.'
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
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])

  return (
    <InviteAcceptFlow
      token={token}
      title="Member-Claim-Einladung annehmen"
      description="Verbinde deinen Team4s-Account mit einem historischen Fansub-Member-Eintrag."
      loginPromptText="Bitte melde dich an oder erstelle einen Account. Danach kommst du automatisch zurück."
      onAccept={(tok) => acceptClaimInvitation({ token: tok })}
      mapError={claimInvitationErrorMessage}
      successMessage="Dein Account ist jetzt als Mitglied verifiziert. Dein Profil ist ab sofort öffentlich indexierbar."
      afterAcceptRedirect="/me/profile"
      missingTokenText="Im Link fehlt ein gültiges Einladungs-Token."
    />
  )
}

export default function AcceptClaimInvitationPage() {
  return (
    <Suspense fallback={<LoadingState title="Einladung wird geladen" />}>
      <AcceptClaimInvitationContent />
    </Suspense>
  )
}
