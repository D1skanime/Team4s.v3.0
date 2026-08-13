import Link from 'next/link'

import { CorrectionReportModal } from '@/components/profile/CorrectionReportModal'
import { LatestContributionsSection } from '@/components/profile/LatestContributionsSection'
import { MemberBadgeChain } from '@/components/profile/MemberBadgeChain'
import { MemberCurrentProjectsSection } from '@/components/profile/MemberCurrentProjectsSection'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MemberStorySection } from '@/components/profile/MemberStorySection'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { PreviousContributionsSection } from '@/components/profile/PreviousContributionsSection'
import {
  PUBLIC_MEMBER_BADGE_CATALOG,
  deriveMilestoneBadge,
} from '@/components/profile/memberBadgeLabels'
import { SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicMemberProfileData, PublicMemberViewer } from '@/types/profile'

import { OwnProfileEditLink } from './OwnProfileEditLink'
import styles from './page.module.css'

type MemberProfileContentProps = {
  profile: PublicMemberProfileData
  storedSlug: string
  viewer: PublicMemberViewer
}

export function MemberProfileContent({
  profile,
  storedSlug,
  viewer,
}: MemberProfileContentProps) {
  const avatarURL = resolveApiUrl(profile.avatar?.public_url || '')
  const backgroundImageURL = resolveApiUrl(profile.background_image?.public_url || '')
  const publicBadges = profile.public_badges ?? []
  // Phase 112 D-01/D-02/D-03: höchster erreichter Punkt-Meilenstein wird bei jedem SSR-Render
  // frisch aus total_points abgeleitet (Live-Rückstufung ohne Persistenz, GAM-04) und additiv
  // in earnedBadges gemischt; MemberBadgeChain selbst bleibt ohne total_points-Kenntnis.
  const milestoneBadge = deriveMilestoneBadge(profile.total_points ?? 0)
  const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges
  const currentProjects = profile.current_projects ?? []
  const latestContributions = profile.latest_contributions ?? []
  const previousContributions = profile.previous_contributions ?? []
  const previousContributionsCount = (
    profile.previous_contributions_count ?? previousContributions.length
  )
  const hasContributions = latestContributions.length > 0 || previousContributionsCount > 0

  return (
    <main className={styles.page}>
      <div className={styles.profileToolbar}>
        <nav className={styles.breadcrumb}>
          <Link href="/anime">Anime</Link>
          <span>&gt;</span><span>Members</span><span>&gt;</span>
          <span>{profile.fansub_name}</span>
        </nav>
        <div className={styles.toolbarActions}>
          {viewer?.is_owner ? (
            <OwnProfileEditLink publicMemberId={profile.member_id} />
          ) : (
            <CorrectionReportModal
              memberId={profile.member_id}
              memberName={profile.fansub_name}
            />
          )}
        </div>
      </div>

      <section className={styles.section} aria-label="Profilkopf">
        <MemberProfileHero
          profile={profile}
          avatarURL={avatarURL}
          backgroundImageURL={backgroundImageURL}
          isPublicView={true}
          isVerified={profile.is_verified}
          publicBadges={publicBadges}
        />
      </section>

      <section
        className={`${styles.section} ${styles.rhythmBand} ${styles.profileBand}`}
        aria-label="Profil und Mitgliedschaft"
      >
        <SectionHeader title="Profil und Mitgliedschaft" underline />
        <div className={`${styles.sectionPair} ${styles.profilePair}`}>
          <MemberStorySection
            storyHtml={profile.member_story_html}
            headingLevel={3}
            showEmptyState
          />
          <MembershipsSection
            memberships={profile.memberships ?? []}
            title="Gruppenzugehörigkeit"
            headingLevel={3}
          />
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.rhythmBand} ${styles.projectsBand}`}
        aria-label="Fansub-Projekte"
      >
        <MemberCurrentProjectsSection
          memberSlug={storedSlug}
          projects={currentProjects}
          totalCount={profile.current_projects_count ?? currentProjects.length}
        />
      </section>

      <div
        className={`${styles.section} ${styles.rhythmBand} ${styles.badgesBand} ${styles.badgesVisualBand}`}
      >
        <MemberBadgeChain
          earnedBadges={earnedBadges}
          badgeProgress={profile.badge_progress}
          catalog={PUBLIC_MEMBER_BADGE_CATALOG}
        />
      </div>

      {hasContributions ? (
        <section
          className={`${styles.section} ${styles.rhythmBand} ${styles.contributionsBand}`}
          aria-label="Beiträge"
        >
          <SectionHeader title="Beiträge" underline />
          <div
            className={`${styles.sectionPair} ${
              previousContributionsCount > 0
                ? styles.contributionPairPresent
                : styles.contributionPairEmpty
            }`}
          >
            <LatestContributionsSection items={latestContributions} headingLevel={3} />
            <PreviousContributionsSection
              items={previousContributions}
              totalCount={previousContributionsCount}
              headingLevel={3}
              showEmptyState
            />
          </div>
        </section>
      ) : null}
    </main>
  )
}
