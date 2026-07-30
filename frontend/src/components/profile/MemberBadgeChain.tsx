'use client'

import Image from 'next/image'
import { Lock } from 'lucide-react'

import { Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { PublicMemberBadge } from '@/types/profile'

import {
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  PUBLIC_MEMBER_BADGE_CATALOG,
  getMemberBadgePresentation,
  type MemberBadgeGroup,
  type MemberBadgePresentation,
  type PublicMemberBadgeCatalogItem,
} from './memberBadgeLabels'
import styles from './MemberBadgeChain.module.css'

type MemberBadgeChainProps = {
  earnedBadges: PublicMemberBadge[]
  catalog?: PublicMemberBadgeCatalogItem[]
}

// D-04: eine Zeile innerhalb einer Kategorie-Gruppe -- normalerweise ein Badge, aber die
// Rollen-Gruppe fasst alle Badges mit demselben roleCode zu einer Zeile zusammen (Phase 112
// Typ 3 dockt hier ohne Umbau an).
type MemberBadgeGroupRow = {
  key: string
  items: PublicMemberBadgeCatalogItem[]
}

type MemberBadgeGroupResult = {
  key: MemberBadgeGroup
  label: string
  rows: MemberBadgeGroupRow[]
}

// Phase 112 D-04: loest den deutschen Rollennamen fuer den Zeilen-Praefix ueber die
// Single-Source-of-Truth-Rollenliste auf; Fallback auf den rohen Code (defensiv, gleiches
// Muster wie getMemberBadgePresentation's bestehender Fallback).
function resolveRoleLabel(roleCode: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === roleCode)?.label ?? roleCode
}

const VERSIONED_POINT_ARTWORK = new Set([
  'point_milestone_active',
  'point_milestone_engaged',
  'point_milestone_experienced',
  'point_milestone_legend',
  'point_milestone_veteran',
])

function resolveBadgeArtwork(badgeCode: string): string | undefined {
  if (VERSIONED_POINT_ARTWORK.has(badgeCode)) {
    return `/member-achievement-badges/${badgeCode}-v2.png`
  }
  if (badgeCode === 'point_milestone_first' || badgeCode.startsWith('contribution_')) {
    return `/member-achievement-badges/${badgeCode}.png`
  }
  if (badgeCode.startsWith('role_entry_')) {
    return `/member-achievement-badges/${badgeCode}.png`
  }
  const roleVolumeMatch = /^role_volume_(.+)_(?:bronze|silver|gold)$/.exec(badgeCode)
  return roleVolumeMatch
    ? `/member-achievement-badges/role_entry_${roleVolumeMatch[1]}.png`
    : undefined
}

function catalogWithEarnedBadges(
  catalog: PublicMemberBadgeCatalogItem[],
  earnedBadges: PublicMemberBadge[],
): PublicMemberBadgeCatalogItem[] {
  const seen = new Set(catalog.map((item) => item.badge_code))
  const additions = earnedBadges
    .filter((badge) => {
      if (seen.has(badge.badge_code)) return false
      seen.add(badge.badge_code)
      return true
    })
    .map((badge) => ({
      badge_code: badge.badge_code,
      badge_category: badge.badge_category,
      label: getMemberBadgePresentation(badge.badge_code).label,
    }))

  return [...catalog, ...additions]
}

// D-04: baut die erweiterbare, kategorie-gruppierte Struktur der "Auszeichnungen"-Sektion.
// Pure Funktion, injectable Presentation-Lookup -- so bleibt die Gruppierung ohne Rendering
// unit-testbar. Leere Kategorien werden nicht zurueckgegeben (kein Umbau bei neuen Badge-Typen).
export function buildMemberBadgeGroups(
  visibleCatalog: PublicMemberBadgeCatalogItem[],
  getPresentation: (badgeCode: string) => MemberBadgePresentation = getMemberBadgePresentation,
): MemberBadgeGroupResult[] {
  return MEMBER_BADGE_GROUP_ORDER.map((groupKey) => {
    const itemsInGroup = visibleCatalog.filter((item) => getPresentation(item.badge_code).group === groupKey)

    let rows: MemberBadgeGroupRow[]
    if (groupKey === 'roles') {
      const rowsByKey = new Map<string, MemberBadgeGroupRow>()
      for (const item of itemsInGroup) {
        const rowKey = getPresentation(item.badge_code).roleCode ?? item.badge_code
        const existingRow = rowsByKey.get(rowKey)
        if (existingRow) {
          existingRow.items.push(item)
        } else {
          rowsByKey.set(rowKey, { key: rowKey, items: [item] })
        }
      }
      rows = Array.from(rowsByKey.values())
    } else {
      rows = itemsInGroup.map((item) => ({ key: item.badge_code, items: [item] }))
    }

    return { key: groupKey, label: MEMBER_BADGE_GROUP_LABELS[groupKey], rows }
  }).filter((group) => group.rows.length > 0)
}

export function MemberBadgeChain({
  earnedBadges,
  catalog = PUBLIC_MEMBER_BADGE_CATALOG,
}: MemberBadgeChainProps) {
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.badge_code))
  const visibleCatalog = catalogWithEarnedBadges(catalog, earnedBadges)
  const earnedCount = visibleCatalog.filter((item) => earnedCodes.has(item.badge_code)).length
  const progressPercent = visibleCatalog.length > 0
    ? Math.round((earnedCount / visibleCatalog.length) * 100)
    : 0
  const groups = buildMemberBadgeGroups(visibleCatalog)

  return (
    <section className={styles.section}>
      <SectionHeader title="Auszeichnungen" />

      <Card variant="section" className={styles.chainCard}>
        <div className={styles.progressBlock} aria-label={`${earnedCount} von ${visibleCatalog.length} Auszeichnungen`}>
          <div className={styles.progressMeta}>
            <span>{earnedCount} von {visibleCatalog.length}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.groupList}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <FocalCarousel
                items={group.rows}
                getItemKey={(row) => row.key}
                regionLabel={`${group.label}-Karussell`}
                itemSingularLabel="Auszeichnung"
                itemPluralLabel="Auszeichnungen"
                listLabel={group.label}
                previousLabel={`Vorherige Auszeichnung in ${group.label}`}
                nextLabel={`Nächste Auszeichnung in ${group.label}`}
                showAllLabel={`Alle Auszeichnungen in ${group.label} anzeigen`}
                showLessLabel="Weniger anzeigen"
                carouselClassName={styles.chain}
                itemClassName={styles.badgeWindow}
                activeItemClassName={styles.badgeWindowActive}
                gridClassName={styles.badgeGrid}
                renderItem={(row) => (
                  <div className={styles.badgeRow}>
                    {group.key === 'roles' && (
                      <span className={styles.roleLabel}>{resolveRoleLabel(row.key)}:</span>
                    )}
                    {row.items.map((item) => {
                      const isEarned = earnedCodes.has(item.badge_code)
                      const presentation = getMemberBadgePresentation(item.badge_code)
                      const Icon = presentation.Icon
                      const imageSrc = resolveBadgeArtwork(item.badge_code)

                      return (
                        <span
                          key={item.badge_code}
                          className={isEarned ? styles.badgeStep : styles.badgeStepLocked}
                          data-palette={presentation.palette}
                          data-earned={isEarned ? 'true' : 'false'}
                          data-role-volume={item.badge_code.startsWith('role_volume_') ? 'true' : undefined}
                        >
                          <span className={imageSrc && isEarned ? styles.badgeItemWithImage : styles.badgeItem}>
                            <span
                              className={imageSrc && isEarned ? styles.badgeArtwork : styles.badgeIcon}
                              aria-label={isEarned ? undefined : `${item.label} gesperrt`}
                            >
                              {isEarned && imageSrc ? (
                                <Image
                                  src={imageSrc}
                                  alt=""
                                  width={112}
                                  height={112}
                                  aria-hidden="true"
                                  data-achievement-art={item.badge_code}
                                />
                              ) : isEarned ? (
                                <Icon size={24} aria-hidden="true" />
                              ) : (
                                <Lock size={20} aria-hidden="true" />
                              )}
                            </span>
                            <span>{item.label}</span>
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )}
              />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
