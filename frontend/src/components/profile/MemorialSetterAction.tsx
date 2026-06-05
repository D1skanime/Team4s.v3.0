'use client'

import { useState } from 'react'

import { ApiError, setMemberMemorial } from '@/lib/api'
import { Button, Modal } from '@/components/ui'

interface MemorialSetterActionProps {
  /**
   * Sichtbarkeits-Gate: nur für Global Admin (is_platform_admin), NICHT Gruppen-Capability.
   * D-16-Caveat / Fallstrick 4: Gruppen-Capability gewährt diese Aktion nicht.
   */
  isGlobalAdmin: boolean
  memberId: number
  memberName?: string
  onSuccess?: () => void
}

export function MemorialSetterAction({
  isGlobalAdmin,
  memberId,
  memberName,
  onSuccess,
}: MemorialSetterActionProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // D-16: Nur für Global Admin sichtbar — Gruppen-Capability reicht nicht aus (Fallstrick 4)
  if (!isGlobalAdmin) return null

  function handleOpen() {
    setOpen(true)
    setError(null)
    setDone(false)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  async function handleConfirm() {
    try {
      setIsSubmitting(true)
      setError(null)
      await setMemberMemorial(memberId)
      setDone(true)
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Keine Berechtigung: Diese Aktion erfordert Global-Admin-Rechte.')
      } else if (err instanceof ApiError) {
        setError(err.message || 'Gedenkprofil konnte nicht gesetzt werden.')
      } else {
        setError('Gedenkprofil konnte nicht gesetzt werden. Bitte versuche es erneut.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayName = memberName ?? `Member #${memberId}`

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={handleOpen}
        aria-label={`${displayName} als Gedenkprofil markieren`}
      >
        Als Gedenkprofil markieren
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Gedenkprofil setzen"
        description={`Profil von ${displayName}`}
        footer={
          done ? (
            <Button variant="secondary" onClick={handleClose}>Schließen</Button>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleConfirm()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Wird gesetzt…' : 'Gedenkprofil bestätigen'}
              </Button>
            </div>
          )
        }
      >
        {done ? (
          <div role="status" style={{ color: '#1a6633', background: '#eef6f1', border: '1px solid #bdddc9', borderRadius: 6, padding: '12px 16px' }}>
            Das Profil wurde als Gedenkprofil markiert.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error ? (
              <div role="alert" style={{ color: '#82122c', background: '#fee2e2', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem' }}>
                {error}
              </div>
            ) : null}

            <div style={{ background: '#fff7e6', border: '1px solid #f0d28a', borderRadius: 6, padding: '12px 16px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <strong>Hinweis:</strong> Diese Aktion wirkt <strong>global</strong> auf das Profil.
              Das Mitglied-Profil wird als historisches Gedenkprofil geführt.
              <br /><br />
              Der Account des Mitglieds wird dabei <strong>nicht deaktiviert</strong>.
              Contributions und Profilgeschichte bleiben sichtbar.
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Bist du sicher, dass du <strong>{displayName}</strong> als Gedenkprofil markieren möchtest?
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
