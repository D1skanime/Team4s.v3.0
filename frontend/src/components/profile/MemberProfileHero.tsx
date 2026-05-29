import Image from 'next/image'
import { Eye, Save } from 'lucide-react'

import { Button, PageHeader } from '@/components/ui'
import type { MemberProfileData, PublicMemberProfileData } from '@/types/profile'

import styles from './profile.module.css'

type MemberProfileHeroProps = {
  profile: MemberProfileData | PublicMemberProfileData
  avatarURL?: string
  backgroundImageURL?: string
  isPublicView?: boolean
  isSaving?: boolean
  canSave?: boolean
}

function getAccountDisplayName(profile: MemberProfileData | PublicMemberProfileData): string {
  return 'account_display_name' in profile ? profile.account_display_name : ''
}

export function MemberProfileHero({
  profile,
  avatarURL = '',
  backgroundImageURL = '',
  isPublicView = false,
  isSaving = false,
  canSave = false,
}: MemberProfileHeroProps) {
  const accountDisplayName = getAccountDisplayName(profile)
  const displayName = profile.fansub_name || accountDisplayName || 'Mein Profil'
  const publicProfileReasonID = 'public-profile-action-reason'
  const avatarLabel = profile.fansub_name || accountDisplayName || 'Profil'

  return (
    <div className={styles.hero}>
      <PageHeader
        eyebrow={isPublicView ? 'Fansub-Member' : 'Mein Bereich'}
        title={isPublicView ? displayName : 'Mein Profil'}
        actions={isPublicView ? undefined : (
          <>
            <span className={styles.deferredActionWrap}>
              <Button className={styles.heroActionButton} variant="secondary" disabled leftIcon={<Eye size={16} />} aria-describedby={publicProfileReasonID}>
                Öffentliches Profil ansehen
              </Button>
              <span id={publicProfileReasonID} className={styles.deferredActionReason}>
                Öffentliche Profilroute ist noch nicht vertraglich freigegeben.
              </span>
            </span>
            <Button className={styles.heroActionButton} type="submit" form="member-profile-form" loading={isSaving} disabled={!canSave} leftIcon={<Save size={16} />}>
              Profil speichern
            </Button>
          </>
        )}
      />

      <div
        className={styles.heroPanel}
        style={backgroundImageURL ? {
          backgroundImage: `linear-gradient(135deg, rgba(31, 41, 55, 0.9), rgba(47, 95, 227, 0.64)), url("${backgroundImageURL}")`,
        } : undefined}
      >
        <div className={styles.heroAvatar}>
          {avatarURL ? (
            <Image src={avatarURL} alt={`${avatarLabel} Avatar`} width={132} height={132} unoptimized />
          ) : (
            <span aria-hidden="true">{(profile.fansub_name || accountDisplayName || '?').slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className={styles.heroCopy}>
          <h2>{displayName}</h2>
          <p>{profile.bio || 'Noch keine Kurzbeschreibung hinterlegt.'}</p>
        </div>
      </div>
    </div>
  )
}
