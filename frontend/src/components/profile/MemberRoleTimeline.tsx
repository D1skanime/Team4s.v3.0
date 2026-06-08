'use client'

import { useState } from 'react'

import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import type { PublicMemberRoleEntry } from '@/types/contributions'

import styles from './profile.module.css'
import timelineStyles from './MemberRoleTimeline.module.css'

type MemberRoleTimelineProps = {
  entries: PublicMemberRoleEntry[]
  hasUnverified: boolean
  isVerified?: boolean
}

function sortEntries(entries: PublicMemberRoleEntry[]): PublicMemberRoleEntry[] {
  return [...entries].sort((a, b) => {
    if (a.started_year === null && b.started_year === null) return 0
    if (a.started_year === null) return 1
    if (b.started_year === null) return -1
    return a.started_year - b.started_year
  })
}

function formatYearRange(start: number | null, end: number | null): string {
  if (!start && !end) return ''
  if (start && end) return `${start}–${end}`
  if (start) return `ab ${start}`
  return `bis ${end}`
}

function contextLabel(entry: PublicMemberRoleEntry): string {
  return entry.context === 'group_history' ? 'Gruppenhistorie' : 'Anime-Beitrag'
}

function isUnverifiedEntry(entry: PublicMemberRoleEntry): boolean {
  return entry.status !== 'confirmed' && entry.status !== 'active'
}

// Erzeugt einen stabilen Key pro Eintrag.
function entryKey(entry: PublicMemberRoleEntry, idx: number): string {
  return `${entry.context}-${entry.fansub_group_slug}-${entry.role_code}-${entry.anime_id ?? 'x'}-${entry.started_year ?? idx}`
}

type EntryDetailProps = {
  entry: PublicMemberRoleEntry
}

// Inline-Expand für Detail-Subtypes/Notes (D-07) — kein neuer Hauptrollen-Eintrag.
function EntryDetail({ entry }: EntryDetailProps) {
  const [expanded, setExpanded] = useState(false)

  const hasNotes = Boolean(entry.notes && entry.notes.trim())

  // Nur anzeigen, wenn es Detail-Informationen gibt (notes, role_code oder Anime).
  const hasDetail =
    Boolean(entry.anime_title && entry.context === 'anime_contribution') ||
    Boolean(entry.role_code) ||
    hasNotes

  if (!hasDetail) return null

  return (
    <div className={timelineStyles.expandWrap}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Details ausblenden' : 'Details anzeigen'}
      >
        {expanded ? 'Details ausblenden' : 'Details anzeigen'}
      </Button>
      {expanded ? (
        <div className={timelineStyles.expandDetail}>
          {entry.role_code ? (
            <span className={timelineStyles.detailSubtype}>
              Rollencode: <code>{entry.role_code}</code>
            </span>
          ) : null}
          {entry.anime_title && entry.context === 'anime_contribution' ? (
            <span className={timelineStyles.detailAnime}>
              Anime: {entry.anime_title}
            </span>
          ) : null}
          {hasNotes ? (
            <span className={timelineStyles.detailNotes}>
              Notiz: {entry.notes}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function MemberRoleTimeline({ entries, hasUnverified, isVerified = false }: MemberRoleTimelineProps) {
  if (entries.length === 0) {
    return (
      <section className={styles.roleTimelineSection}>
        <SectionHeader
          title="Rollen-Timeline"
          description="Öffentliche Rollen und Beiträge aus der Fansub-Geschichte dieses Mitglieds."
        />
        <p className={styles.emptyText}>
          Noch keine Rollen oder Beiträge öffentlich sichtbar.
        </p>
      </section>
    )
  }

  const sorted = sortEntries(entries)

  return (
    <section className={styles.roleTimelineSection}>
      <SectionHeader
        title="Rollen-Timeline"
        description="Öffentliche Rollen und Beiträge aus der Fansub-Geschichte dieses Mitglieds."
      />
      <ul className={styles.roleTimelineList}>
        {sorted.map((entry, idx) => {
          const yearRange = formatYearRange(entry.started_year, entry.ended_year)
          const isHistorical = entry.status === 'historical'
          const isGroupHistory = entry.context === 'group_history'
          const unverified = isUnverifiedEntry(entry)

          return (
            <li key={entryKey(entry, idx)}>
              <Card
                variant="nestedFlat"
                className={`${styles.roleTimelineEntry} ${
                  isGroupHistory ? styles.roleTimelineEntryHistory : styles.roleTimelineEntryAnime
                } ${unverified && !isVerified ? timelineStyles.entryDimmed : ''}`}
              >
                <span className={styles.roleTimelineYear}>{yearRange || 'ohne Jahr'}</span>
                <span className={styles.roleTimelineContent}>
                  <span className={styles.roleTimelineMeta}>
                    <Badge variant={isGroupHistory ? 'warning' : 'success'}>
                      {contextLabel(entry)}
                    </Badge>
                    {isHistorical && !isVerified ? (
                      <Badge variant="muted">Historisch ungeprüft</Badge>
                    ) : null}
                    {/* D-08: Unbestätigte Einträge mit Badge "unbestätigt" kennzeichnen */}
                    {unverified && !isVerified && entry.status !== 'historical' ? (
                      <Badge variant="warning">unbestätigt</Badge>
                    ) : null}
                  </span>
                  <strong className={styles.roleTimelineRole}>{entry.role_label}</strong>
                  <span className={styles.roleTimelineGroup}>{entry.fansub_group_name}</span>
                  {entry.context === 'anime_contribution' && entry.anime_title ? (
                    <span className={styles.roleTimelineAnime}>
                      Anime: {entry.anime_title}
                    </span>
                  ) : null}
                  {/* D-07: Inline-Expand für Detail-Subtypes/Notes */}
                  <EntryDetail entry={entry} />
                </span>
              </Card>
            </li>
          )
        })}
      </ul>
      {hasUnverified && (
        <p className={styles.roleTimelineDisclaimer}>
          Einige Angaben sind historisch ungeprüft.
        </p>
      )}
    </section>
  )
}
