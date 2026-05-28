import Image from 'next/image'
import { useRef, useState } from 'react'
import { Crop, ImageUp } from 'lucide-react'

import { AvatarCropDialog } from '@/components/media/crop/AvatarCropDialog'
import { Button } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type MemberAvatarCardProps = {
  profile: MemberProfileData
  avatarURL: string
  sourceAvatarURL: string
  isUploading: boolean
  onAvatarSelected: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
}

function filenameFromSourceURL(sourceAvatarURL: string, fallbackFilename?: string): string {
  const fallback = fallbackFilename?.trim() || 'avatar-source'
  try {
    const parsed = new URL(sourceAvatarURL, window.location.origin)
    const pathname = parsed.pathname.split('/').filter(Boolean).pop()?.trim()
    return pathname || fallback
  } catch {
    return fallback
  }
}

export function MemberAvatarCard({
  profile,
  avatarURL,
  sourceAvatarURL,
  isUploading,
  onAvatarSelected,
}: MemberAvatarCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreparingExistingAvatar, setIsPreparingExistingAvatar] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const label = profile.fansub_name || profile.account_display_name || 'Profil'
  const canUpload = profile.capabilities.can_upload_own_avatar
  const uploadHintID = 'profile-avatar-upload-hint'
  const canEditExistingAvatar = Boolean(canUpload && sourceAvatarURL)

  async function handleEditExistingAvatar() {
    if (!canEditExistingAvatar || isUploading || isPreparingExistingAvatar) return
    try {
      setLocalError(null)
      setIsPreparingExistingAvatar(true)
      const response = await fetch(sourceAvatarURL)
      if (!response.ok) throw new Error('Avatar-Bild konnte nicht geladen werden.')
      const blob = await response.blob()
      const type = blob.type || profile.avatar?.mime_type || 'image/png'
      const sourceFile = new File(
        [blob],
        filenameFromSourceURL(sourceAvatarURL, profile.avatar?.filename),
        { type },
      )
      setSelectedFile(sourceFile)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Avatar-Bild konnte nicht geladen werden.')
    } finally {
      setIsPreparingExistingAvatar(false)
    }
  }

  return (
    <div className={styles.avatarStack}>
      <div className={styles.avatarPreview}>
        {avatarURL ? (
          <Image src={avatarURL} alt={`${label} Avatar`} width={420} height={420} unoptimized />
        ) : (
          <span>{(profile.fansub_name || profile.account_display_name || '?').slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        leftIcon={<ImageUp size={16} aria-hidden="true" />}
        loading={isUploading}
        disabled={isUploading || isPreparingExistingAvatar || !canUpload}
        aria-describedby={uploadHintID}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Bild lädt...' : 'Bild ändern'}
      </Button>
      {canEditExistingAvatar ? (
        <Button
          type="button"
          variant="secondary"
          leftIcon={<Crop size={16} aria-hidden="true" />}
          loading={isPreparingExistingAvatar}
          disabled={isUploading || isPreparingExistingAvatar}
          onClick={handleEditExistingAvatar}
        >
          {isPreparingExistingAvatar ? 'Bild wird geladen...' : 'Ausschnitt bearbeiten'}
        </Button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        aria-label="Avatar-Bild auswählen"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file || !canUpload || isUploading) return
          setLocalError(null)
          setSelectedFile(file)
        }}
        disabled={isUploading || isPreparingExistingAvatar || !canUpload}
        className={styles.visuallyHiddenInput}
      />
      <p id={uploadHintID} className={styles.mutedText}>
        Wähle ein Avatar-Bild als JPG, PNG oder WEBP.
      </p>
      {localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
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
