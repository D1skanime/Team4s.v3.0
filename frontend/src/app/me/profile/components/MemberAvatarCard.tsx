import Image from 'next/image'
import type { ChangeEvent } from 'react'
import { ImageUp } from 'lucide-react'

import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type MemberAvatarCardProps = {
  profile: MemberProfileData
  avatarURL: string
  isUploading: boolean
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function MemberAvatarCard({ profile, avatarURL, isUploading, onAvatarChange }: MemberAvatarCardProps) {
  const label = profile.display_name || profile.fansub_name || 'Profil'

  return (
    <div className={styles.avatarStack}>
      <div className={styles.avatarPreview}>
        {avatarURL ? (
          <Image src={avatarURL} alt={`${label} Avatar`} width={420} height={420} unoptimized />
        ) : (
          <span>{(profile.fansub_name || profile.display_name || '?').slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <label className={styles.uploadLabel}>
        <span className={`${styles.uploadButton} ${!profile.capabilities.can_upload_own_avatar ? styles.uploadButtonDisabled : ''}`}>
          <ImageUp size={16} aria-hidden="true" />
          {isUploading ? 'Bild lädt...' : 'Bild ändern'}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} disabled={isUploading || !profile.capabilities.can_upload_own_avatar} hidden />
      </label>
      <p className={styles.mutedText}>
        JPG, PNG oder WEBP. Die serverseitige Avatar-Prüfung bleibt autoritativ; Zuschnitt und Varianten sind für Phase 53B vorbereitet.
      </p>
    </div>
  )
}
