import Image from 'next/image'
import { Eye, Save } from 'lucide-react'

import { Button, PageHeader } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type MemberProfileHeroProps = {
  profile: MemberProfileData
  avatarURL: string
  isSaving: boolean
  canSave: boolean
}

export function MemberProfileHero({ profile, avatarURL, isSaving, canSave }: MemberProfileHeroProps) {
  const displayName = profile.fansub_name || profile.account_display_name || 'Mein Profil'
  const avatarLabel = profile.fansub_name || profile.account_display_name || 'Profil'
  const publicProfileHref = `/members/${profile.member_id}`

  return (
    <div className={styles.hero}>
      <PageHeader
        eyebrow="Mein Bereich"
        title="Mein Profil"
        actions={(
          <>
            <Button className={styles.heroActionButton} href={publicProfileHref} variant="secondary" leftIcon={<Eye size={16} />}>
              Öffentliches Profil ansehen
            </Button>
            <Button className={styles.heroActionButton} type="submit" form="member-profile-form" loading={isSaving} disabled={!canSave} leftIcon={<Save size={16} />}>
              Profil speichern
            </Button>
          </>
        )}
      />

      <div className={styles.heroPanel}>
        <div className={styles.heroAvatar}>
          {avatarURL ? (
            <Image src={avatarURL} alt={`${avatarLabel} Avatar`} width={132} height={132} unoptimized />
          ) : (
            <span aria-hidden="true">{(profile.fansub_name || profile.account_display_name || '?').slice(0, 1).toUpperCase()}</span>
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
