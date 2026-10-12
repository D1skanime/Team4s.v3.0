'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Crop } from 'lucide-react'

import { Team4sCropper } from '@/components/media/crop/Team4sCropper'
import { Button, MediaSlot } from '@/components/ui'
import type { UploadDropzoneHandle } from '@/components/ui'
import { apiClientFetch } from '@/lib/api'
import {
  PROFILE_BANNER_ASPECT_RATIO,
  PROFILE_BANNER_HEIGHT,
  PROFILE_BANNER_MOBILE_REFERENCE_MIN_HEIGHT_PX,
  PROFILE_BANNER_MOBILE_REFERENCE_WIDTH_PX,
  PROFILE_BANNER_WIDTH,
} from '@/lib/profileBanner'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type ProfileBackgroundCardProps = {
  profile: MemberProfileData
  backgroundURL: string
  sourceBackgroundURL: string
  isUploading: boolean
  /** Laesst einen externen Trigger (z. B. der Bleistift-Button im Profilkopf) denselben Picker
   * oeffnen wie die UploadDropzone selbst -- kein zweites natives <input> mehr. */
  inputRef?: RefObject<UploadDropzoneHandle>
  variant?: 'full' | 'compact'
  onBackgroundSelected: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
}

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
  inputRef,
  variant = 'full',
  onBackgroundSelected,
}: ProfileBackgroundCardProps) {
  const localInputRef = useRef<UploadDropzoneHandle>(null)
  const resolvedInputRef = inputRef ?? localInputRef
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreparingExistingBackground, setIsPreparingExistingBackground] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const canUpload = profile.capabilities.can_edit_own_profile
  const uploadHintID = 'profile-background-upload-hint'
  const canEditExistingBackground = Boolean(canUpload && sourceBackgroundURL)
  const isCompact = variant === 'compact'

  function handleSelectedFile(file: File) {
    if (!canUpload || isUploading || isPreparingExistingBackground) return
    setLocalError(null)
    setSelectedFile(file)
  }

  async function handleEditExistingBackground() {
    if (!canEditExistingBackground || isUploading || isPreparingExistingBackground) return
    try {
      setLocalError(null)
      setIsPreparingExistingBackground(true)
      const response = await apiClientFetch(sourceBackgroundURL)
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

  return (
    <div className={isCompact ? styles.mediaControlRow : styles.backgroundStack}>
      <MediaSlot
        ref={resolvedInputRef}
        aspectRatio={PROFILE_BANNER_ASPECT_RATIO}
        label="Hintergrundbild"
        hasValue={Boolean(backgroundURL)}
        onFilesSelected={(files) => {
          const file = files[0]
          if (!file) return
          handleSelectedFile(file)
        }}
        accept="image/jpeg,image/png,image/webp"
        disabled={isUploading || isPreparingExistingBackground || !canUpload}
        className={isCompact ? styles.mediaControlBannerSlot : styles.backgroundPreviewSlot}
        previewContent={backgroundURL ? (
          <Image
            src={backgroundURL}
            alt="Aktuelles Profil-Hintergrundbild"
            fill
            unoptimized
            style={{ objectFit: 'contain' }}
          />
        ) : null}
        cornerActions={canEditExistingBackground ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconOnly
            loading={isPreparingExistingBackground}
            disabled={isUploading || isPreparingExistingBackground}
            onClick={handleEditExistingBackground}
            aria-label="Ausschnitt bearbeiten"
            title="Ausschnitt bearbeiten"
            leftIcon={<Crop size={16} aria-hidden="true" />}
          />
        ) : null}
      />
      <div className={isCompact ? styles.mediaControlBody : styles.backgroundStack}>
        <p id={uploadHintID} className={styles.mutedText}>
          Wähle ein breites JPG, PNG oder WEBP. Der Ausschnitt wird als Profil-Banner gespeichert.
        </p>
        {localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
      </div>
      {selectedFile ? (
        <Team4sCropper
          file={selectedFile}
          title="Hintergrundbild zuschneiden"
          cropAriaLabel="Hintergrundbild-Ausschnitt wählen"
          shape="rectangle"
          aspectRatio={PROFILE_BANNER_ASPECT_RATIO}
          mobileSafeZone={{
            referenceWidthPx: PROFILE_BANNER_MOBILE_REFERENCE_WIDTH_PX,
            minHeightPx: PROFILE_BANNER_MOBILE_REFERENCE_MIN_HEIGHT_PX,
          }}
          output={{
            width: PROFILE_BANNER_WIDTH,
            height: PROFILE_BANNER_HEIGHT,
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
