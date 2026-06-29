'use client'

import { useState } from 'react'
import { Inbox } from 'lucide-react'

import { Badge, Button, Card, ErrorState, SectionHeader } from '@/components/ui'
import { ApiError, selfPublishContribution } from '@/lib/api'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'

import { ANIME_CONTRIBUTION_ROLES } from './contributionRoles'
import styles from './contributions.module.css'
import { ProposalForm } from './ProposalForm'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function StatusBadge({ status }: { status: MeAnimeContribution['status'] }) {
  const variants: Record<string, { variant: 'neutral' | 'success' | 'warning' | 'danger' | 'muted'; label: string }> = {
    proposed: { variant: 'warning', label: 'In Prüfung' },
    confirmed: { variant: 'success', label: 'Bestätigt' },
    disputed: { variant: 'danger', label: 'Abgelehnt' },
    draft: { variant: 'muted', label: 'Entwurf' },
    hidden: { variant: 'muted', label: 'Versteckt' },
  }
  const variant = variants[status] ?? variants.draft
  return <Badge variant={variant.variant} aria-label={`Status: ${variant.label}`}>{variant.label}</Badge>
}

function contributionTitle(contribution: MeAnimeContribution): string {
  return contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
}

function contributionRoleLabel(contribution: MeAnimeContribution, code: string, index: number): string {
  return contribution.role_labels?.[index] || code
}

interface MyProposalsSectionProps {
  proposals: MeAnimeContribution[]
  ownGroups: MembershipEntry[]
  onReload: () => void
}

export function MyProposalsSection({ proposals, ownGroups, onReload }: MyProposalsSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [selfPublishConfirming, setSelfPublishConfirming] = useState<number | null>(null)
  const [selfPublishError, setSelfPublishError] = useState<string | null>(null)

  async function handleSelfPublish(id: number) {
    setSelfPublishError(null)
    try {
      await selfPublishContribution(id)
      setSelfPublishConfirming(null)
      onReload()
    } catch (err) {
      setSelfPublishError(
        readErrorMessage(err, 'Öffentlich schalten fehlgeschlagen. Bitte versuche es erneut.'),
      )
    }
  }

  function handleFormSuccess() {
    setShowForm(false)
    onReload()
  }

  const inPruefung = proposals.filter((contribution) => contribution.status === 'proposed')
  const bestaetigt = proposals.filter((contribution) => contribution.status === 'confirmed')
  const abgelehnt = proposals.filter((contribution) => contribution.status === 'disputed')
  const total = proposals.length
  const canCreateProposal = ownGroups.length > 0

  function renderProposalCard(contribution: MeAnimeContribution) {
    return (
      <Card key={contribution.id} variant="nestedFlat" className={styles.contributionCard}>
        <div className={styles.contributionCardHeader}>
          <div className={styles.contributionTitleRow}>
            <StatusBadge status={contribution.status} />
            <span className={styles.contributionTitle}>{contributionTitle(contribution)}</span>
          </div>
          {contribution.started_year || contribution.ended_year ? (
            <span className={styles.metaText}>
              {contribution.started_year && contribution.ended_year
                ? `${contribution.started_year}-${contribution.ended_year}`
                : contribution.started_year
                  ? `ab ${contribution.started_year}`
                  : `bis ${contribution.ended_year}`}
            </span>
          ) : null}
        </div>

        <div className={styles.roleList}>
          {contribution.role_codes.map((code, index) => (
            <Badge key={code} variant="info">
              {contributionRoleLabel(contribution, code, index)}
            </Badge>
          ))}
        </div>

        {contribution.status === 'disputed' && contribution.review_note ? (
          <p className={styles.reviewNote}>
            <strong>Ablehngrund:</strong> {contribution.review_note}
          </p>
        ) : null}

        {contribution.can_self_publish ? (
          <div className={styles.selfPublishPanel}>
            {selfPublishConfirming === contribution.id ? (
              <>
                <span>Unverifizierter historischer Eintrag — wird öffentlich sichtbar.</span>
                <div className={styles.actionsRow}>
                  <Button size="sm" variant="secondary" onClick={() => void handleSelfPublish(contribution.id)}>
                    Jetzt öffentlich schalten
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelfPublishConfirming(null)}>
                    Abbrechen
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setSelfPublishConfirming(contribution.id)}>
                Historisch öffentlich schalten
              </Button>
            )}
          </div>
        ) : null}
      </Card>
    )
  }

  return (
    <>
      {showForm && (
        <ProposalForm
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
          ownGroups={ownGroups}
          roleDefinitions={ANIME_CONTRIBUTION_ROLES}
        />
      )}

      <Card variant="section" className={styles.proposalStack}>
        <div className={styles.proposalHeader}>
          <SectionHeader
            title={`Eingereichte Hinweise (${total})`}
          />
          <Button type="button" onClick={() => setShowForm(true)} disabled={!canCreateProposal}>
            Hinweis senden
          </Button>
        </div>

        {!canCreateProposal ? (
          <div className={styles.warningPanel}>
            Verifizierte Gruppenmitgliedschaft erforderlich.
          </div>
        ) : null}

        {selfPublishError ? (
          <ErrorState title="Aktion fehlgeschlagen" description={selfPublishError} />
        ) : null}

        {total === 0 ? (
          <div className={styles.proposalEmptyCard}>
            <span className={styles.proposalEmptyIcon} aria-hidden="true">
              <Inbox size={17} strokeWidth={2.2} />
            </span>
            <span>
              <strong>Noch keine Hinweise</strong>
              <span>Reiche den ersten Hinweis für ein Projekt einer Gruppe ein, in der du Mitglied bist.</span>
            </span>
          </div>
        ) : null}

        {inPruefung.length > 0 ? (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`In Prüfung (${inPruefung.length})`} />
            <div className={styles.proposalList}>{inPruefung.map(renderProposalCard)}</div>
          </div>
        ) : null}

        {bestaetigt.length > 0 ? (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`Bestätigt (${bestaetigt.length})`} />
            <div className={styles.proposalList}>{bestaetigt.map(renderProposalCard)}</div>
          </div>
        ) : null}

        {abgelehnt.length > 0 ? (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`Abgelehnt (${abgelehnt.length})`} />
            <div className={styles.proposalList}>{abgelehnt.map(renderProposalCard)}</div>
          </div>
        ) : null}
      </Card>
    </>
  )
}
