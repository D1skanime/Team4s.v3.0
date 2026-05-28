import Image from 'next/image'
import { Eye, Save } from 'lucide-react'

import { Badge, Button, PageHeader } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import { formatPlatformRoleLabel } from '@/lib/profileLabels'

import styles from '../page.module.css'

type MemberProfileHeroProps = {
  profile: MemberProfileData
  avatarURL: string
  isDirty: boolean
  isSaving: boolean
  canSave: boolean
}

export function MemberProfileHero({ profile, avatarURL, isDirty, isSaving, canSave }: MemberProfileHeroProps) {
  const displayName = profile.display_name || profile.fansub_name || 'Mein Profil'
  const roles = profile.account_global_roles.length ? profile.account_global_roles : ['user']
  const publicProfileReasonID = 'public-profile-action-reason'
  const avatarLabel = profile.display_name || profile.fansub_name || 'Profil'

  return (
    <div className={styles.hero}>
      <PageHeader
        eyebrow="Mein Bereich"
        title="Mein Profil"
        actions={
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
        }
      />

      <div className={styles.heroPanel}>
        <div className={styles.heroAvatar}>
          {avatarURL ? (
            <Image src={avatarURL} alt={`${avatarLabel} Avatar`} width={132} height={132} unoptimized />
          ) : (
            <span aria-hidden="true">{(profile.fansub_name || profile.display_name || '?').slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className={styles.heroCopy}>
          <h2>{displayName}</h2>
          <p>{profile.bio || 'Noch keine Kurzbeschreibung hinterlegt.'}</p>
          <div className={styles.chipRow}>
            {roles.map((role) => (
              <Badge key={role} variant="info">{formatPlatformRoleLabel(role)}</Badge>
            ))}
            {profile.fansub_name ? <Badge variant="neutral">{profile.fansub_name}</Badge> : null}
            {isDirty ? <Badge variant="warning">Ungespeicherte Änderungen</Badge> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
