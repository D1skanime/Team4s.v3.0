'use client'

import styles from './FansubEdit.module.css'

interface ContributorAvatarProps {
  name: string
  avatarUrl?: string | null
}

export function ContributorAvatar({ name, avatarUrl }: ContributorAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={styles.contributorAvatar} />
  }

  return (
    <span className={styles.contributorAvatarInitials} aria-label={name}>
      {initials}
    </span>
  )
}
