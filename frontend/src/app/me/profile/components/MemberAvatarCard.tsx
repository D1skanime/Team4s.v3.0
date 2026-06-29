import Image from 'next/image'
import { useRef, useState } from 'react'
import type { RefObject } from 'react'
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
  inputRef?: RefObject<HTMLInputElement>
  variant?: 'full' | 'compact'
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

function isGIFFile(file: File): boolean {
  return file.type.toLowerCase() === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
}

async function isAnimatedWebPFile(file: File): Promise<boolean> {
  const isWebP = file.type.toLowerCase() === 'image/webp' || file.name.toLowerCase().endsWith('.webp')
  if (!isWebP) return false
  try {
    const header = new Uint8Array(await readBlobArrayBuffer(file.slice(0, 21)))
    const isRiff = String.fromCharCode(...header.slice(0, 4)) === 'RIFF'
    const isWebPContainer = String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
    const isExtendedWebP = String.fromCharCode(...header.slice(12, 16)) === 'VP8X'
    return isRiff && isWebPContainer && isExtendedWebP && (header[20] & 0x02) === 0x02
  } catch {
    return false
  }
}

function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
        return
      }
      reject(new Error('Bilddatei konnte nicht gelesen werden.'))
    }
    reader.onerror = () => reject(reader.error || new Error('Bilddatei konnte nicht gelesen werden.'))
    reader.readAsArrayBuffer(blob)
  })
}

async function shouldPreserveAnimatedAvatarFile(file: File): Promise<boolean> {
  return isGIFFile(file) || await isAnimatedWebPFile(file)
}

function isGIFAvatar(profile: MemberProfileData, sourceAvatarURL: string): boolean {
  const mimeType = profile.avatar?.mime_type?.toLowerCase()
  const source = sourceAvatarURL.toLowerCase()
  return mimeType === 'image/gif' || mimeType === 'image/webp' || source.includes('.gif')
}

export function MemberAvatarCard({
  profile,
  avatarURL,
  sourceAvatarURL,
  isUploading,
  inputRef,
  variant = 'full',
  onAvatarSelected,
}: MemberAvatarCardProps) {
  const localInputRef = useRef<HTMLInputElement>(null)
  const resolvedInputRef = inputRef ?? localInputRef
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreparingExistingAvatar, setIsPreparingExistingAvatar] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const label = profile.fansub_name || profile.account_display_name || 'Profil'
  const canUpload = profile.capabilities.can_upload_own_avatar
  const uploadHintID = 'profile-avatar-upload-hint'
  const canEditExistingAvatar = Boolean(canUpload && sourceAvatarURL && !isGIFAvatar(profile, sourceAvatarURL))
  const isCompact = variant === 'compact'

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

  async function handleSelectedFile(file: File) {
    if (!canUpload || isUploading) return
    setLocalError(null)
    if (await shouldPreserveAnimatedAvatarFile(file)) {
      try {
        await onAvatarSelected({ sourceFile: file, croppedFile: file })
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : 'Avatar-Bild konnte nicht hochgeladen werden.')
      }
      return
    }
    setSelectedFile(file)
  }

  return (
    <div className={isCompact ? styles.mediaControlRow : styles.avatarStack}>
      <div className={isCompact ? styles.mediaControlAvatar : styles.avatarPreview}>
        {avatarURL ? (
          <Image src={avatarURL} alt={`${label} Avatar`} width={420} height={420} unoptimized />
        ) : (
          <span>{(profile.fansub_name || profile.account_display_name || '?').slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className={isCompact ? styles.mediaControlBody : styles.avatarStack}>
        <div className={styles.mediaControlActions}>
          <Button
            type="button"
            variant="secondary"
            size={isCompact ? 'sm' : 'md'}
            leftIcon={<ImageUp size={16} aria-hidden="true" />}
            loading={isUploading}
            disabled={isUploading || isPreparingExistingAvatar || !canUpload}
            aria-describedby={uploadHintID}
            onClick={() => resolvedInputRef.current?.click()}
          >
            {isUploading ? 'Bild lädt...' : isCompact ? 'Ändern' : avatarURL ? 'Bild ändern' : 'Bild hochladen'}
          </Button>
          {canEditExistingAvatar ? (
            <Button
              type="button"
              variant="secondary"
              size={isCompact ? 'sm' : 'md'}
              leftIcon={<Crop size={16} aria-hidden="true" />}
              loading={isPreparingExistingAvatar}
              disabled={isUploading || isPreparingExistingAvatar}
              onClick={handleEditExistingAvatar}
            >
              {isPreparingExistingAvatar ? 'Bild wird geladen...' : 'Ausschnitt bearbeiten'}
            </Button>
          ) : null}
        </div>
        <p id={uploadHintID} className={styles.mutedText}>
          Wähle ein Avatar-Bild als JPG, PNG, WEBP, animiertes WebP oder animiertes GIF.
        </p>
        {localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
      </div>
      <input
        ref={resolvedInputRef}
        type="file"
        aria-label="Avatar-Bild auswählen"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file || !canUpload || isUploading) return
          void handleSelectedFile(file)
        }}
        disabled={isUploading || isPreparingExistingAvatar || !canUpload}
        className={styles.visuallyHiddenInput}
      />
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
