/**
 * MemberGroupsHistorySection — Server-Rahmen für Ebene 2 (D-02/D-04/D-05).
 *
 * Bettet MembershipsSection + Story via RichTextRenderer ein.
 * Empty-States als Platzhalter (D-05) — Sektions-Anker bleibt stabil.
 * Story rendert ausschließlich über RichTextRenderer (server-sanitiert, D-04 / T-74-04-XSS).
 */

import { Card, EmptyState } from '@/components/ui'
import { RichTextRenderer } from '@/components/editor'
import type { MemberProfileMembership } from '@/types/profile'

import { MembershipsSection } from './MembershipsSection'
import styles from './MemberGroupsHistorySection.module.css'

interface MemberGroupsHistorySectionProps {
  memberships: MemberProfileMembership[]
  storyHtml?: string | null
}

export function MemberGroupsHistorySection({
  memberships,
  storyHtml,
}: MemberGroupsHistorySectionProps) {
  return (
    <div className={styles.geschichteWrapper}>
      {/* Mitgliedschaften */}
      {memberships.length > 0 ? (
        <MembershipsSection memberships={memberships} />
      ) : (
        <EmptyState
          title="Keine Fansub-Gruppen"
          description="Für dieses Mitglied sind noch keine Gruppen eingetragen."
        />
      )}

      {/* Profil-Story (D-04 — ausschließlich via RichTextRenderer, kein dangerouslySetInnerHTML außerhalb) */}
      {storyHtml?.trim() ? (
        <Card variant="section" className={styles.storyCard} title="Fansub-Geschichte">
          <RichTextRenderer bodyHtml={storyHtml} editorType="tiptap" contentSchemaVersion={1} />
        </Card>
      ) : (
        <Card variant="section" className={styles.storyCard} title="Fansub-Geschichte">
          <p className={styles.emptyStory}>
            Noch keine Geschichte hinterlegt.
          </p>
        </Card>
      )}
    </div>
  )
}
