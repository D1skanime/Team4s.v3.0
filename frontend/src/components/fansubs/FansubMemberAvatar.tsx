import Image from 'next/image'

import { resolveApiUrl } from '@/lib/api'

import { getAvatarColorIndex, getMemberInitials } from './fansubTeamInitials'
import styles from './FansubTeamSection.module.css'

interface FansubMemberAvatarProps {
  name: string
  avatarUrl: string | null
  muted?: boolean
}

/**
 * Zeigt das hochgeladene Member-Avatarbild, sonst einen farbigen Initialen-Kreis
 * (historische Mitglieder neutral). AO7: echtes Bild bevorzugt.
 */
export function FansubMemberAvatar({ name, avatarUrl, muted }: FansubMemberAvatarProps) {
  if (avatarUrl) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        <Image
          src={resolveApiUrl(avatarUrl)}
          alt=""
          width={34}
          height={34}
          className={styles.avatarImg}
          unoptimized
        />
      </span>
    )
  }

  const colorClass = muted ? styles.avatarMuted : styles['avatarC' + getAvatarColorIndex(name)]
  return (
    <span className={`${styles.avatar} ${colorClass}`} aria-hidden="true">
      {getMemberInitials(name)}
    </span>
  )
}
