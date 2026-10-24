'use client'

import { useState } from 'react'
import { Inbox } from 'lucide-react'

import { Badge, Button, Card, ErrorState, SectionHeader } from '@/components/ui'
import { ApiError, selfPublishContribution } from '@/lib/api'
import { hintStatusLabel, hintStatusVariant } from '@/lib/fansubGroupHintStatus'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'
import type { FansubGroupHint } from '@/types/fansub-group-hints'

import { contributionRoleDefinitions } from './contributionRoles'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import cardStyles from './ContributionCard.module.css'
import styles from './MyProposalsSection.module.css'
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
  /** D-18: eigene gesendete fansub_group_hints (eigene UND fremde Zielgruppe, alle Status) --
   *  zweite, unabhaengige Datenquelle neben den anime_contributions-Vorschlaegen oben. */
  sentGroupHints: FansubGroupHint[]
}

export function MyProposalsSection({ proposals, ownGroups, onReload, sentGroupHints }: MyProposalsSectionProps) {
  const { roles } = useRoleCatalog('anime_contribution')
  const contributionRoles = contributionRoleDefinitions(roles)
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

  // D-17 (Plan 191-20): ProposalForm zeigt seine Erfolgsansicht ("Hinweis gesendet") selbst
  // ueber internen submittedSummary-State -- ein onReload() bei onSuccess loest hier
  // frueher den Seiten-isLoading-Zustand aus (frontend/src/app/me/contributions/page.tsx),
  // der diese ganze Section inkl. offenem Formular durch einen Lade-Screen ersetzt, bevor der
  // Nutzer die Erfolgsansicht je sieht. Reload gehoert deshalb an den aktiven "Fertig"-Klick
  // (onClose), nicht an den Submit-Erfolg selbst.
  function handleFormClose() {
    setShowForm(false)
    onReload()
  }

  const inPruefung = proposals.filter((contribution) => contribution.status === 'proposed')
  const bestaetigt = proposals.filter((contribution) => contribution.status === 'confirmed')
  const abgelehnt = proposals.filter((contribution) => contribution.status === 'disputed')
  // D-18: die Kopfzeile "Eingereichte Hinweise (n)" zaehlt beide unabhaengigen
  // Datenquellen zusammen -- eigene anime_contributions-Vorschlaege UND gesendete
  // fansub_group_hints, egal an welche Zielgruppe.
  const total = proposals.length + sentGroupHints.length

  function renderHintCard(hint: FansubGroupHint) {
    return (
      <Card key={hint.id} variant="nestedFlat" className={cardStyles.contributionCard}>
        <div className={cardStyles.contributionCardHeader}>
          <div className={cardStyles.contributionTitleRow}>
            <Badge variant={hintStatusVariant(hint.status)}>{hintStatusLabel(hint.status)}</Badge>
            <span className={cardStyles.contributionTitle}>{hint.target_fansub_group_name}</span>
          </div>
          <span className={cardStyles.metaText}>{hint.related_anime_title ?? `Anime #${hint.related_anime_id ?? '—'}`}</span>
        </div>

        {hint.status === 'rejected' && hint.decision_note ? (
          <p className={cardStyles.reviewNote}>
            <strong>Ablehngrund:</strong> {hint.decision_note}
          </p>
        ) : null}
      </Card>
    )
  }

  function renderProposalCard(contribution: MeAnimeContribution) {
    return (
      <Card key={contribution.id} variant="nestedFlat" className={cardStyles.contributionCard}>
        <div className={cardStyles.contributionCardHeader}>
          <div className={cardStyles.contributionTitleRow}>
            <StatusBadge status={contribution.status} />
            <span className={cardStyles.contributionTitle}>{contributionTitle(contribution)}</span>
          </div>
          {contribution.started_year || contribution.ended_year ? (
            <span className={cardStyles.metaText}>
              {contribution.started_year && contribution.ended_year
                ? `${contribution.started_year}-${contribution.ended_year}`
                : contribution.started_year
                  ? `ab ${contribution.started_year}`
                  : `bis ${contribution.ended_year}`}
            </span>
          ) : null}
        </div>

        <div className={cardStyles.roleList}>
          {contribution.role_codes.map((code, index) => (
            <Badge key={code} variant="info">
              {contributionRoleLabel(contribution, code, index)}
            </Badge>
          ))}
        </div>

        {contribution.status === 'disputed' && contribution.review_note ? (
          <p className={cardStyles.reviewNote}>
            <strong>Ablehngrund:</strong> {contribution.review_note}
          </p>
        ) : null}

        {contribution.can_self_publish ? (
          <div className={styles.selfPublishPanel}>
            {selfPublishConfirming === contribution.id ? (
              <>
                <span>Unverifizierter historischer Eintrag — wird öffentlich sichtbar.</span>
                <div className={cardStyles.actionsRow}>
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
          onSuccess={() => {}}
          onClose={handleFormClose}
          ownGroups={ownGroups}
          roleDefinitions={contributionRoles}
        />
      )}

      <Card variant="section" className={styles.proposalStack}>
        <div className={styles.proposalHeader}>
          <SectionHeader
            title={`Eingereichte Hinweise (${total})`}
          />
          {/* Der "Hinweis senden"-Knopf muss unabhaengig davon erscheinen, ob das Mitglied
              irgendeine EIGENE verifizierte Gruppe hat: ein Hinweis kann sich auch auf eine
              fremde Gruppe beziehen, in der das Mitglied gar keine Mitgliedschaft besitzt
              (D-02) -- ownGroups.length>0 waere deshalb die falsche Gating-Bedingung. Diese
              Seite rendert MyProposalsSection ohnehin erst NACH dem bereits bestandenen
              isEligibleForContributions-Gate (Mitgliedsprofil + Projekt-Zuordnung, siehe
              frontend/src/app/me/contributions/page.tsx) -- es gibt also keinen verbleibenden
              Zustand, in dem der Knopf hier verfrueht waere. */}
          <Button type="button" onClick={() => setShowForm(true)}>
            Hinweis senden
          </Button>
        </div>

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
              {/* D-18: ein Hinweis kann auch an eine fremde Gruppe gehen, in der das
                  Mitglied gar keine Mitgliedschaft hat -- der vorherige Text implizierte
                  faelschlich eine Mitgliedschaftspflicht. */}
              <span>Reiche den ersten Hinweis für ein Projekt ein — auch bei einer Gruppe, der du nicht angehörst.</span>
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

        {sentGroupHints.length > 0 ? (
          <div className={styles.proposalGroup}>
            <SectionHeader title={`An andere Gruppen (${sentGroupHints.length})`} />
            <div className={styles.proposalList}>{sentGroupHints.map(renderHintCard)}</div>
          </div>
        ) : null}
      </Card>
    </>
  )
}
