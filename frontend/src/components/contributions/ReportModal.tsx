'use client'

import { useState } from 'react'

import { Button, FormField, Modal } from '@/components/ui'
import { ProposalForm } from './ProposalForm'
import { ReportFormFehler } from './ReportFormFehler'
import { ReportFormMedia } from './ReportFormMedia'
import { ReportFormStory } from './ReportFormStory'
import type { RoleDefinition } from './ProposalForm'
import type { MembershipEntry } from '@/types/contributions'
import type { ReportTargetOption } from './reportTargets'

export type SuggestionType = 'fehler' | 'story' | 'medien' | 'contribution' | 'claim'

export interface ReportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  prefillType?: SuggestionType
  prefillContributionId?: number
  // Für contribution-Typ: benötigte Props für ProposalForm
  ownGroups?: MembershipEntry[]
  roleDefinitions?: RoleDefinition[]
  targetOptions?: ReportTargetOption[]
}

const SUGGESTION_TYPES: { value: SuggestionType; label: string; description: string }[] = [
  {
    value: 'fehler',
    label: 'Fehler melden',
    description: 'Melde einen Fehler oder schlage eine Korrektur für einen bestehenden Eintrag vor.',
  },
  {
    value: 'story',
    label: 'Story vorschlagen',
    description: 'Schlage eine Geschichte oder interessante Information zu einem Eintrag vor.',
  },
  {
    value: 'medien',
    label: 'Medium einreichen',
    description: 'Reiche ein Bild oder eine Mediendatei für einen Eintrag ein.',
  },
  {
    value: 'contribution',
    label: 'Mitwirkung vorschlagen',
    description: 'Schlage eine Mitwirkung (Contribution) für ein Anime-Projekt vor.',
  },
  {
    value: 'claim',
    label: 'Profil beanspruchen',
    description: 'Beanspruche ein Mitglieder-Profil als deines.',
  },
]

// Form-IDs der Sub-Formulare für footer-Submit-Button (form-Attribut)
const SUB_FORM_IDS: Record<string, string> = {
  fehler: 'report-form-fehler',
  story: 'report-form-story',
  medien: 'report-form-media',
}

export function ReportModal({
  open,
  onClose,
  onSuccess,
  prefillType,
  prefillContributionId,
  ownGroups = [],
  roleDefinitions = [],
  targetOptions = [],
}: ReportModalProps) {
  const [type, setType] = useState<SuggestionType | null>(prefillType ?? null)

  function handleSuccess() {
    onSuccess()
    onClose()
  }

  function handleClose() {
    setType(prefillType ?? null)
    onClose()
  }

  const subFormId = type ? (SUB_FORM_IDS[type] ?? null) : null

  const footer =
    type && type !== 'claim' && type !== 'contribution' ? (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
        <Button type="button" variant="secondary" onClick={handleClose}>
          Abbrechen
        </Button>
        <Button
          type="submit"
          form={subFormId ?? undefined}
          variant="primary"
        >
          Vorschlag senden
        </Button>
      </div>
    ) : (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
        <Button type="button" variant="secondary" onClick={handleClose}>
          {type ? 'Zurück' : 'Abbrechen'}
        </Button>
      </div>
    )

  // Claim-Typ: nur Hinweis + Link (Lock H — kein API-Call)
  if (type === 'claim') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Profil beanspruchen"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button variant="primary" href="/me/claim" onClick={handleClose}>
              Zum Beanspruchen-Ablauf
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Das Beanspruchen eines Profils läuft über einen eigenen, geschützten Ablauf. Du wirst dorthin weitergeleitet.
        </p>
      </Modal>
    )
  }

  // Contribution-Typ: ProposalForm einbetten (D-06 NUR INTEGRIEREN)
  if (type === 'contribution') {
    return (
      <ProposalForm
        onSuccess={handleSuccess}
        onClose={handleClose}
        ownGroups={ownGroups}
        roleDefinitions={roleDefinitions}
      />
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Vorschlagen oder melden"
      footer={footer}
    >
      {/* Schritt 1: Typ-Auswahl */}
      {!type ? (
        <FormField label="Was möchtest du melden oder vorschlagen?" required>
          <div
            role="group"
            aria-label="Melde-Typ wählen"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}
          >
            {SUGGESTION_TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant="secondary"
                aria-pressed={false}
                onClick={() => setType(t.value)}
                style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', padding: '12px' }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>{t.label}</strong>
                <span style={{ fontSize: '0.82rem', lineHeight: 1.4, fontWeight: 400 }}>{t.description}</span>
              </Button>
            ))}
          </div>
        </FormField>
      ) : null}

      {/* Schritt 2/3: Sub-Formular je nach Typ */}
      {type === 'fehler' ? (
        <ReportFormFehler
          onSuccess={handleSuccess}
          prefillContributionId={prefillContributionId}
          targetOptions={targetOptions}
        />
      ) : null}

      {type === 'story' ? (
        <ReportFormStory onSuccess={handleSuccess} targetOptions={targetOptions} />
      ) : null}

      {type === 'medien' ? (
        <ReportFormMedia onSuccess={handleSuccess} targetOptions={targetOptions} />
      ) : null}

      {/* Zurück-Link wenn Typ bereits gewählt */}
      {type ? (
        <div style={{ marginTop: 8 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setType(null)}
          >
            ← Anderen Typ wählen
          </Button>
        </div>
      ) : null}

      {/* Review-Hinweis */}
      {type ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Dein Vorschlag wird nach dem Absenden von unserem Team geprüft.
        </p>
      ) : null}
    </Modal>
  )
}
