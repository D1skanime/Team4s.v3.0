'use client'

import { useState } from 'react'

import { Button, FormField, Modal } from '@/components/ui'
import type { MembershipEntry } from '@/types/contributions'

import styles from './contributions.module.css'
import { ProposalForm } from './ProposalForm'
import type { RoleDefinition } from './ProposalForm'
import { ReportFormFehler } from './ReportFormFehler'
import { ReportFormMedia } from './ReportFormMedia'
import { ReportFormStory } from './ReportFormStory'
import type { ReportTargetOption } from './reportTargets'

export type SuggestionType = 'fehler' | 'story' | 'medien' | 'contribution'

export interface ReportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  prefillType?: SuggestionType
  prefillContributionId?: number
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
    label: 'Ich war in einem Projekt dabei',
    description: 'Sende einen Rollen- oder Projekt-Hinweis an die zuständige Gruppe.',
  },
]

const SUB_FORM_IDS: Partial<Record<SuggestionType, string>> = {
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

  const subFormId = type ? SUB_FORM_IDS[type] ?? null : null

  const footer = type && type !== 'contribution' ? (
    <div className={styles.modalFooterActionsEnd}>
      <Button type="button" variant="secondary" onClick={handleClose}>
        Abbrechen
      </Button>
      <Button type="submit" form={subFormId ?? undefined} variant="primary">
        Vorschlag senden
      </Button>
    </div>
  ) : (
    <div className={styles.modalFooterActionsEnd}>
      <Button type="button" variant="secondary" onClick={handleClose}>
        {type ? 'Zurück' : 'Abbrechen'}
      </Button>
    </div>
  )

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
      title="Hinweis senden"
      footer={footer}
    >
      {!type ? (
        <FormField label="Was möchtest du melden oder vorschlagen?" required>
          <div role="group" aria-label="Melde-Typ wählen" className={styles.suggestionTypeGrid}>
            {SUGGESTION_TYPES.map((suggestionType) => (
              <Button
                key={suggestionType.value}
                type="button"
                variant="secondary"
                aria-pressed={false}
                onClick={() => setType(suggestionType.value)}
                className={styles.suggestionTypeButton}
              >
                <strong>{suggestionType.label}</strong>
                <span>{suggestionType.description}</span>
              </Button>
            ))}
          </div>
        </FormField>
      ) : null}

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

      {type ? (
        <div className={styles.modalBackAction}>
          <Button type="button" variant="ghost" size="sm" onClick={() => setType(null)}>
            Anderen Typ wählen
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}
