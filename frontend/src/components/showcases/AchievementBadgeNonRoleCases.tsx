'use client'

import { AchievementArtwork } from '@/components/profile/AchievementArtwork'
import {
  AnimeProjectAchievementStage,
  ContributionAchievementStage,
  MembershipStage,
  PointsAchievementStage,
  resolveProgressArtworkDescriptor,
} from '@/components/profile/AchievementStages'
import { MemberBadgeChain } from '@/components/profile/MemberBadgeChain'
import type { MemberBadgeFamilyPresentation } from '@/components/profile/memberBadgeFamilies'

import styles from './AchievementBadgeShowcase.module.css'
import {
  familyStageComponentKey,
  GALLERY_FOUNDING_MEMBERSHIP_FAMILY,
  GALLERY_HISTORICAL_BADGES,
  GALLERY_HISTORICAL_CATALOG,
  GALLERY_NON_ROLE_CASES,
  GALLERY_NON_ROLE_FAMILIES,
} from './achievementBadgeGalleryFixtures'

export function GalleryFamilyStage({
  family,
}: {
  family: MemberBadgeFamilyPresentation
}) {
  const key = familyStageComponentKey(family)
  if (key === 'progress') return <AnimeProjectAchievementStage family={family} />
  if (key === 'points') return <PointsAchievementStage family={family} />
  if (key === 'membership') return <MembershipStage family={family} />
  return <ContributionAchievementStage family={family} />
}

function ArtworkPairReference({
  badgeCode,
  label,
  geometry = 'Artwork',
}: {
  badgeCode: string
  label: string
  geometry?: 'Artwork' | 'Portrait'
}) {
  const descriptor = resolveProgressArtworkDescriptor(badgeCode)!

  return (
    <div className={styles.artworkReference} data-artwork-reference={badgeCode}>
      <p className={styles.referenceLabel}>
        Eigenständige {geometry}-Geometriereferenz, kein Produktpanel
      </p>
      <div className={styles.artworkPair}>
        <AchievementArtwork
          descriptor={descriptor}
          badgeCode={badgeCode}
          alt={label}
          size="hero"
        />
        <AchievementArtwork
          descriptor={descriptor}
          badgeCode={badgeCode}
          alt=""
          size="stage"
          decorative
        />
      </div>
    </div>
  )
}

function FoundingMemberCase({ label }: { label: string }) {
  return (
    <>
      <div className={styles.actualCard} data-actual-card="membership-with-founding">
        <GalleryFamilyStage family={GALLERY_FOUNDING_MEMBERSHIP_FAMILY} />
      </div>
      <ArtworkPairReference badgeCode="founding_member" label={label} />
    </>
  )
}

function HistoricalLeaderCase({ label }: { label: string }) {
  return (
    <>
      <div className={styles.actualCard} data-historical-product-panel>
        <p className={styles.referenceLabel}>
          Echtes Produktpanel: generische Einzel-Auszeichnung
        </p>
        <MemberBadgeChain
          earnedBadges={GALLERY_HISTORICAL_BADGES}
          catalog={GALLERY_HISTORICAL_CATALOG}
        />
      </div>
      <ArtworkPairReference
        badgeCode="historical_leader"
        label={label}
        geometry="Portrait"
      />
    </>
  )
}

export function NonRoleCompositionCases() {
  return (
    <div className={styles.caseGrid}>
      {GALLERY_NON_ROLE_CASES.map((item) => {
        const family = GALLERY_NON_ROLE_FAMILIES.get(item.badge_code)
        return (
          <article
            key={item.badge_code}
            className={styles.case}
            data-composition-case={item.badge_code}
            data-case-kind="non-role"
          >
            <h3 className={styles.caseTitle}>{item.label}</h3>
            {item.badge_code === 'founding_member' ? (
              <FoundingMemberCase label={item.label} />
            ) : item.badge_code === 'historical_leader' ? (
              <HistoricalLeaderCase label={item.label} />
            ) : (
              <div className={styles.actualCard} data-actual-card={item.badge_code}>
                <GalleryFamilyStage family={family!} />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
