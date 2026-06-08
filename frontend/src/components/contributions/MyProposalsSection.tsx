'use client'

import { useState } from 'react'

import { Badge, Button, Card, EmptyState, ErrorState, SectionHeader } from '@/components/ui'
import { ApiError, selfPublishContribution } from '@/lib/api'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'

import { ANIME_CONTRIBUTION_ROLES } from './contributionRoles'
import { ProposalForm } from './ProposalForm'
import styles from './contributions.module.css'

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
  const v = variants[status] ?? variants.draft
  return <Badge variant={v.variant} aria-label={`Status: ${v.label}`}>{v.label}</Badge>
}

function contributionTitle(contribution: MeAnimeContribution): string {
  return contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
}

function contributionRoleLabel(contribution: MeAnimeContribution, code: string, index: number): string {
  return contribution.role_labels?.[index] || code
}

interface MyProposalsSectionProps {
  /**
   * Fertig gefilterte Vorschläge-Liste (von page.tsx via useMemo).
   * Enthält Einträge mit is_own_proposal=true, dem aktiven Filter entsprechend.
   */
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

  const inPruefung = proposals.filter((c) => c.status === 'proposed')
  const bestaetigt = proposals.filter((c) => c.status === 'confirmed')
  const abgelehnt = proposals.filter((c) => c.status === 'disputed')
  const total = proposals.length


  function renderProposalCard(c: MeAnimeContribution) {
    return (
      <Card key={c.id} variant="nestedFlat" className={styles.contributionCard}>
        <div className={styles.contributionCardHeader}>
          <div className={styles.contributionTitleRow}>
            <StatusBadge status={c.status} />
            <span className={styles.contributionTitle}>{contributionTitle(c)}</span>
          </div>
          {c.started_year || c.ended_year ? (
            <span className={styles.metaText}>
              {c.started_year && c.ended_year
                ? `${c.started_year}-${c.ended_year}`
                : c.started_year
                  ? `ab ${c.started_year}`
                  : `bis ${c.ended_year}`}
            </span>
          ) : null}
        </div>

        <div className={styles.roleList}>
          {c.role_codes.map((code, index) => (
            <Badge key={code} variant="info">
              {contributionRoleLabel(c, code, index)}
            </Badge>
          ))}
        </div>

        {c.status === 'confirmed' ? (
          <span className={styles.metaText}>Dieser Beitrag wurde durch einen Gruppenleader bestätigt.</span>
        ) : null}

        {c.status === 'disputed' && c.review_note ? (
          <p className={styles.reviewNote}>
            <strong>Ablehngrund:</strong> {c.review_note}
          </p>
        ) : null}

        {c.can_self_publish ? (
          <div className={styles.selfPublishPanel}>
            {selfPublishConfirming === c.id ? (
              <>
                <span>Dieser Eintrag wird als unverifizierter historischer Beitrag öffentlich sichtbar.</span>
                <div className={styles.actionsRow}>
                  <Button size="sm" variant="secondary" onClick={() => void handleSelfPublish(c.id)}>
                    Jetzt öffentlich schalten
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelfPublishConfirming(null)}>
                    Abbrechen
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setSelfPublishConfirming(c.id)}>
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
            title={`Eigene Vorschläge (${total})`}
            description="Mitwirkungen, die du an eine Fansubgruppe zur Prüfung gesendet hast."
          />
          <Button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={ownGroups.length === 0}
            title={ownGroups.length === 0 ? 'Kein verifizierter Account verknüpft' : undefined}
          >
            Mitwirkung vorschlagen
          </Button>
        </div>

        <div className={styles.proposalIntro}>
          Vorschläge sind für Mitwirkungen an Projekten deiner eigenen Fansubgruppen. Du wählst zuerst die Gruppe, dann ein Anime/Projekt dieser Gruppe und danach deine Rolle. Der Gruppenleader bestätigt später, ob diese Mitwirkung stimmt.
        </div>

        {selfPublishError && (
          <ErrorState title="Aktion fehlgeschlagen" description={selfPublishError} />
        )}

        {total === 0 && (
          <EmptyState
            variant="compact"
            title="Noch keine Vorschläge"
            description="Schlage deine erste Mitwirkung für ein Projekt einer Gruppe vor, in der du Mitglied bist."
          />
        )}

        {inPruefung.length > 0 && (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`In Prüfung (${inPruefung.length})`} />
            <div className={styles.proposalList}>{inPruefung.map(renderProposalCard)}</div>
          </div>
        )}

        {bestaetigt.length > 0 && (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`Bestätigt (${bestaetigt.length})`} />
            <div className={styles.proposalList}>{bestaetigt.map(renderProposalCard)}</div>
          </div>
        )}

        {abgelehnt.length > 0 && (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`Abgelehnt (${abgelehnt.length})`} />
            <div className={styles.proposalList}>{abgelehnt.map(renderProposalCard)}</div>
          </div>
        )}
      </Card>
    </>
  )
}
