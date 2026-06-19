'use client'

import { useEffect, useState } from 'react'

import { ApiError, getOwnProfile, submitMemberCorrection } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import { Button, FormField, Modal, Select, Textarea } from '@/components/ui'

type TargetType = 'profile' | 'contribution' | 'rolle'

interface CorrectionReportModalProps {
  memberId: number
  memberName?: string
}

export function CorrectionReportModal({ memberId, memberName }: CorrectionReportModalProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const isLoggedIn = hasAccessToken || hasRefreshToken

  const [open, setOpen] = useState(false)
  const [targetType, setTargetType] = useState<TargetType>('profile')
  const [reasonText, setReasonText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ownMemberId, setOwnMemberId] = useState<number | null>(null)

  // Eigenen Member ermitteln, um „Korrektur melden" auf dem eigenen Profil auszublenden.
  useEffect(() => {
    if (!isClientInitialized || !isLoggedIn) return

    let active = true
    getOwnProfile()
      .then((response) => {
        if (active) setOwnMemberId(response.data.member_id)
      })
      .catch(() => {
        if (active) setOwnMemberId(null)
      })

    return () => {
      active = false
    }
  }, [isLoggedIn, isClientInitialized])

  // Nicht eingeloggt oder eigenes Profil: keine Korrektur-Meldung anbieten.
  if (!isLoggedIn || ownMemberId === memberId) return null

  function handleOpen() {
    setOpen(true)
    setError(null)
    setSuccess(false)
    setTargetType('profile')
    setReasonText('')
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit() {
    if (!reasonText.trim()) {
      setError('Bitte beschreibe die Korrektur kurz.')
      return
    }
    try {
      setIsSubmitting(true)
      setError(null)
      await submitMemberCorrection(memberId, {
        targetType,
        targetId: null,
        reasonText: reasonText.trim(),
      })
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Der Vorschlag konnte nicht eingereicht werden.')
      } else {
        setError('Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const targetTypeLabel = memberName ? `Korrektur für ${memberName} melden` : 'Korrektur melden'

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen} aria-label={targetTypeLabel}>
        Korrektur melden
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Korrektur melden"
        description="Dein Vorschlag wird geprüft und führt zu keiner sofortigen Änderung am Profil."
        footer={
          success ? (
            <Button variant="secondary" onClick={handleClose}>Schließen</Button>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !reasonText.trim()}
              >
                {isSubmitting ? 'Wird gesendet…' : 'Zur Prüfung senden'}
              </Button>
            </div>
          )
        }
      >
        {success ? (
          <div role="status" style={{ color: '#1a6633', background: '#eef6f1', border: '1px solid #bdddc9', borderRadius: 6, padding: '12px 16px' }}>
            Dein Vorschlag wird geprüft. Es erfolgt keine sofortige öffentliche Änderung.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error ? (
              <div role="alert" style={{ color: '#82122c', background: '#fee2e2', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem' }}>
                {error}
              </div>
            ) : null}

            <FormField label="Was soll korrigiert werden?" htmlFor="correction-target-type" required>
              <Select
                id="correction-target-type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TargetType)}
              >
                <option value="profile">Profilangaben (Name, Zeitraum, Beschreibung …)</option>
                <option value="contribution">Beitrag / Mitwirkung</option>
                <option value="rolle">Rolle / Funktion</option>
              </Select>
            </FormField>

            <FormField
              label="Beschreibung der Korrektur"
              htmlFor="correction-reason"
              hint="Erkläre kurz, was falsch ist und wie es korrekt sein sollte."
              required
            >
              <Textarea
                id="correction-reason"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={4}
                placeholder="z. B. Der Aktivitätszeitraum ist falsch — richtig wäre 2012–2015."
              />
            </FormField>

            <div style={{ background: '#f0f4ff', border: '1px solid #c5d3f5', borderRadius: 6, padding: '10px 14px', fontSize: '0.85rem', color: '#3a4c80', lineHeight: 1.5 }}>
              Dein Vorschlag wird durch einen Leader oder Admin geprüft. Es entsteht keine sofortige öffentliche Änderung.
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
