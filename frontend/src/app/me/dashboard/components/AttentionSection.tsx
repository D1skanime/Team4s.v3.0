import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import { ATTENTION_WINDOW_DAYS, isRecentlyAssigned, resolveWorkspaceHref } from './attentionHelpers'
import styles from './AttentionSection.module.css'

export interface AttentionSectionProps {
  contributions: MeAnimeContribution[]
}

/**
 * "Braucht deine Aufmerksamkeit" (D-02): zeigt kuerzlich zugewiesene Projekt-/Release-
 * Contributions als Card-Liste, neueste zuerst. Verwendet ausschliesslich die in Plan
 * 116-01 gebauten reinen Helfer (isRecentlyAssigned/resolveWorkspaceHref) statt die
 * "neu"-Logik oder Link-Aufloesung hier erneut zu implementieren.
 */
export function AttentionSection({ contributions }: AttentionSectionProps) {
  const sorted = [...contributions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <section className={styles.section}>
      <SectionHeader title="Braucht deine Aufmerksamkeit" />
      {sorted.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Nichts Neues im Moment"
          description="Du hast in den letzten 14 Tagen keine neuen Projekt- oder Release-Zuweisungen erhalten."
        />
      ) : (
        <ul className={styles.list}>
          {sorted.map((item) => (
            <li key={item.id}>
              <Card variant="interactive" className={styles.itemCard}>
                <Link className={styles.itemLink} href={resolveWorkspaceHref(item)}>
                  <span className={styles.itemTitle}>
                    <strong>{item.anime_title ?? 'Ohne Titel'}</strong>
                  </span>
                  {isRecentlyAssigned(item.created_at, ATTENTION_WINDOW_DAYS) ? (
                    <Badge variant="info">Neu</Badge>
                  ) : null}
                  <span className={styles.itemAction}>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
