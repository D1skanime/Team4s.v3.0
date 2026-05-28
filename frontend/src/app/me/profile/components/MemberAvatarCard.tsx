import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'

import { AvatarCropDialog } from '@/components/media/crop/AvatarCropDialog'
import { Button } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type MemberAvatarCardProps = {
  profile: MemberProfileData
  avatarURL: string
  isUploading: boolean
  onAvatarSelected: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
}

export function MemberAvatarCard({ profile, avatarURL, isUploading, onAvatarSelected }: MemberAvatarCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const label = profile.display_name || profile.fansub_name || 'Profil'
  const canUpload = profile.capabilities.can_upload_own_avatar
  const uploadHintID = 'profile-avatar-upload-hint'

  return (
    <div className={styles.avatarStack}>
      <div className={styles.avatarPreview}>
        {avatarURL ? (
          <Image src={avatarURL} alt={`${label} Avatar`} width={420} height={420} unoptimized />
        ) : (
          <span>{(profile.fansub_name || profile.display_name || '?').slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        leftIcon={<ImageUp size={16} aria-hidden="true" />}
        loading={isUploading}
        disabled={isUploading || !canUpload}
        aria-describedby={uploadHintID}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Bild lädt...' : 'Bild ändern'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        aria-label="Profilbild auswählen"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file || !canUpload || isUploading) return
          setSelectedFile(file)
        }}
        disabled={isUploading || !canUpload}
        className={styles.visuallyHiddenInput}
      />
      <p id={uploadHintID} className={styles.mutedText}>
        Wähle ein Profilbild als JPG, PNG oder WEBP.
      </p>
      {selectedFile ? (
        <AvatarCropDialog
          file={selectedFile}
          onCancel={() => setSelectedFile(null)}
          onApply={async (payload) => {
            await onAvatarSelected(payload)
            setSelectedFile(null)
          }}
        />
      ) : null}
    </div>
  )
}
