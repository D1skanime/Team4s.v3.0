'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { RichTextRenderer } from '@/components/editor'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { Card } from '@/components/ui'
import { getOwnProfile, resolveApiUrl } from '@/lib/api'
import type { MemberProfileData, PublicMemberProfileData } from '@/types/profile'

import { OwnProfileEditLink } from './OwnProfileEditLink'
import styles from './page.module.css'

type OwnHiddenProfilePreviewProps = {
  slug: string
}

function slugifyMemberName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function isOwnProfileSlug(slug: string, profile: MemberProfileData): boolean {
  if (!profile.has_member_profile || profile.member_id <= 0) return false
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) return false
  if (/^\d+$/.test(normalizedSlug) && Number(normalizedSlug) === profile.member_id) return true
  return slugifyMemberName(profile.fansub_name) === normalizedSlug
}

function toPublicProfile(profile: MemberProfileData): PublicMemberProfileData {
  return {
    member_id: profile.member_id,
    fansub_name: profile.fansub_name,
    bio: profile.bio,
    member_story_html: profile.member_story_html,
    active_from_date: profile.active_from_date,
    active_until_date: profile.active_until_date,
    is_currently_active: profile.is_currently_active,
    noindex: profile.noindex,
    is_verified: profile.is_verified,
    // MemberProfileData (own profile) traegt kein profile_status-Feld; 'active' als sicherer Fallback
    profile_status: 'active',
    profile_visibility: profile.profile_visibility,
    avatar: profile.avatar?.public_url ? { public_url: profile.avatar.public_url } : null,
    background_image: profile.background_image?.public_url
      ? { public_url: profile.background_image.public_url }
      : null,
    memberships: profile.memberships ?? [],
    // Badges werden im Own-Profile-Vorschau-Kontext nicht benoetigt (kein public_badges im own-profile DTO)
    public_badges: [],
    recent_media: profile.recent_media ?? [],
    recent_contributions: profile.recent_contributions ?? [],
  }
}

export function OwnHiddenProfilePreview({ slug }: OwnHiddenProfilePreviewProps) {
  const [profile, setProfile] = useState<PublicMemberProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function loadOwnProfilePreview() {
      try {
        const response = await getOwnProfile()
        if (!isActive) return
        if (isOwnProfileSlug(slug, response.data)) {
          setProfile(toPublicProfile(response.data))
        }
      } catch {
        if (isActive) setProfile(null)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadOwnProfilePreview()

    return () => {
      isActive = false
    }
  }, [slug])

  if (isLoading) {
    return <div className={styles.errorBox}>Profilvorschau wird geladen.</div>
  }

  if (!profile) {
    return <div className={styles.errorBox}>Dieses Profil ist nicht öffentlich zugänglich.</div>
  }

  const avatarURL = resolveApiUrl(profile.avatar?.public_url || '')
  const backgroundImageURL = resolveApiUrl(profile.background_image?.public_url || '')

  return (
    <>
      <div className={styles.profileToolbar}>
        <nav className={styles.breadcrumb}>
          <Link href="/anime">Anime</Link>
          <span>&gt;</span>
          <span>Members</span>
          <span>&gt;</span>
          <span>{profile.fansub_name}</span>
        </nav>
        <OwnProfileEditLink publicMemberId={profile.member_id} />
      </div>

      <MemberProfileHero profile={profile} avatarURL={avatarURL} backgroundImageURL={backgroundImageURL} isPublicView={true} isVerified={profile.is_verified} />
      <div className={styles.profileGrid}>
        {profile.member_story_html?.trim() ? (
          <Card variant="section" className={styles.storySection} title="Fansub-Geschichte">
            <RichTextRenderer bodyHtml={profile.member_story_html} editorType="tiptap" contentSchemaVersion={1} />
          </Card>
        ) : null}
        <section className={styles.fullWidthSection}>
          <MembershipsSection memberships={profile.memberships ?? []} />
        </section>
        <section className={styles.contentSection}>
          <h2>Letzte Medien</h2>
          <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={true} />
        </section>
        <section className={styles.contentSection}>
          <h2>Letzte Beiträge</h2>
          <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={true} />
        </section>
      </div>
    </>
  )
}
