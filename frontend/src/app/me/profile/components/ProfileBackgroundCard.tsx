'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Crop, ImageUp } from 'lucide-react'

import { Team4sCropper } from '@/components/media/crop/Team4sCropper'
import { MediaOwnershipContext } from '@/components/admin/media/MediaOwnershipContext'
import { Button } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type ProfileBackgroundCardProps = {
  profile: MemberProfileData
  backgroundURL: string
  sourceBackgroundURL: string
  isUploading: boolean
  onBackgroundSelected: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
}

const PROFILE_BACKGROUND_BANNER_WIDTH = 1920
const PROFILE_BACKGROUND_BANNER_HEIGHT = 384
const PROFILE_BACKGROUND_BANNER_ASPECT =
  PROFILE_BACKGROUND_BANNER_WIDTH / PROFILE_BACKGROUND_BANNER_HEIGHT

function backgroundFilename(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, '').trim() || 'profil-hintergrund'
  return `${baseName}-hintergrund.jpg`
}

function filenameFromSourceURL(sourceBackgroundURL: string): string {
  try {
    const parsed = new URL(sourceBackgroundURL, window.location.origin)
    return parsed.pathname.split('/').filter(Boolean).pop()?.trim() || 'profil-hintergrund-source'
  } catch {
    return 'profil-hintergrund-source'
  }
}

export function ProfileBackgroundCard({
  profile,
  backgroundURL,
  sourceBackgroundURL,
  isUploading,
  onBackgroundSelected,
}: ProfileBackgroundCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreparingExistingBackground, setIsPreparingExistingBackground] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const canUpload = profile.capabilities.can_edit_own_profile
  const uploadHintID = 'profile-background-upload-hint'
  const canEditExistingBackground = Boolean(canUpload && sourceBackgroundURL)

  async function handleEditExistingBackground() {
    if (!canEditExistingBackground || isUploading || isPreparingExistingBackground) return
    try {
      setLocalError(null)
      setIsPreparingExistingBackground(true)
      const response = await fetch(sourceBackgroundURL)
      if (!response.ok) throw new Error('Hintergrundbild konnte nicht geladen werden.')
      const blob = await response.blob()
      setSelectedFile(new File(
        [blob],
        filenameFromSourceURL(sourceBackgroundURL),
        { type: blob.type || 'image/jpeg' },
      ))
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Hintergrundbild konnte nicht geladen werden.')
    } finally {
      setIsPreparingExistingBackground(false)
    }
  }

  const ownerMemberID = profile.member_id ?? null
  const ownerName = profile.fansub_name || profile.account_display_name || 'Profil'

  return (
    <div className={styles.backgroundStack}>
      <MediaOwnershipContext
        ownerType="member"
        ownerID={ownerMemberID}
        ownerLabel={`Profil «${ownerName}»`}
        categoryMode="slot"
        categoryValue="hintergrund"
        statusPolicy="immediate"
        disabled={isUploading}
        onContextChange={() => {}}
      />
      <div className={styles.backgroundPreview}>
        {backgroundURL ? (
          <Image src={backgroundURL} alt="Aktuelles Profil-Hintergrundbild" width={960} height={192} unoptimized />
        ) : (
          <span>Banner</span>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        leftIcon={<ImageUp size={16} aria-hidden="true" />}
        loading={isUploading}
        disabled={isUploading || isPreparingExistingBackground || !canUpload}
        aria-describedby={uploadHintID}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Bild lädt...' : backgroundURL ? 'Hintergrundbild ändern' : 'Hintergrundbild hochladen'}
      </Button>
      {canEditExistingBackground ? (
        <Button
          type="button"
          variant="secondary"
          leftIcon={<Crop size={16} aria-hidden="true" />}
          loading={isPreparingExistingBackground}
          disabled={isUploading || isPreparingExistingBackground}
          onClick={handleEditExistingBackground}
        >
          {isPreparingExistingBackground ? 'Bild wird geladen...' : 'Ausschnitt bearbeiten'}
        </Button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        aria-label="Hintergrundbild auswählen"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file || !canUpload || isUploading || isPreparingExistingBackground) return
          setLocalError(null)
          setSelectedFile(file)
        }}
        disabled={isUploading || isPreparingExistingBackground || !canUpload}
        className={styles.visuallyHiddenInput}
      />
      <p id={uploadHintID} className={styles.mutedText}>
        Wähle ein breites JPG, PNG oder WEBP. Der Ausschnitt wird als Profil-Banner gespeichert.
      </p>
      {localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
      {selectedFile ? (
        <Team4sCropper
          file={selectedFile}
          title="Hintergrundbild zuschneiden"
          cropAriaLabel="Hintergrundbild-Ausschnitt wählen"
          shape="rectangle"
          aspectRatio={PROFILE_BACKGROUND_BANNER_ASPECT}
          output={{
            width: PROFILE_BACKGROUND_BANNER_WIDTH,
            height: PROFILE_BACKGROUND_BANNER_HEIGHT,
            mimeType: 'image/jpeg',
            filename: backgroundFilename(selectedFile.name),
          }}
          hint="Bild ziehen oder zoomen. Escape schließt den Dialog."
          onCancel={() => setSelectedFile(null)}
          onApply={async (croppedFile) => {
            try {
              await onBackgroundSelected({ sourceFile: selectedFile, croppedFile })
              setSelectedFile(null)
            } catch (error) {
              setLocalError(error instanceof Error ? error.message : 'Hintergrundbild konnte nicht hochgeladen werden.')
              throw error
            }
          }}
        />
      ) : null}
    </div>
  )
}
