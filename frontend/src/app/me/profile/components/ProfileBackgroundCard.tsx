'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'

import { Team4sCropper } from '@/components/media/crop/Team4sCropper'
import { Button } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'

type ProfileBackgroundCardProps = {
  profile: MemberProfileData
  backgroundURL: string
  isUploading: boolean
  onBackgroundSelected: (croppedFile: File) => Promise<void> | void
}

function backgroundFilename(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, '').trim() || 'profil-hintergrund'
  return `${baseName}-hintergrund.jpg`
}

export function ProfileBackgroundCard({
  profile,
  backgroundURL,
  isUploading,
  onBackgroundSelected,
}: ProfileBackgroundCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const canUpload = profile.capabilities.can_edit_own_profile
  const uploadHintID = 'profile-background-upload-hint'

  return (
    <div className={styles.backgroundStack}>
      <div className={styles.backgroundPreview}>
        {backgroundURL ? (
          <Image src={backgroundURL} alt="Aktuelles Profil-Hintergrundbild" width={560} height={315} unoptimized />
        ) : (
          <span>16:9</span>
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
        {isUploading ? 'Bild lädt...' : 'Hintergrundbild ändern'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        aria-label="Hintergrundbild auswählen"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.currentTarget.value = ''
          if (!file || !canUpload || isUploading) return
          setLocalError(null)
          setSelectedFile(file)
        }}
        disabled={isUploading || !canUpload}
        className={styles.visuallyHiddenInput}
      />
      <p id={uploadHintID} className={styles.mutedText}>
        Wähle ein breites JPG, PNG oder WEBP. Der Ausschnitt wird als 16:9-Bild gespeichert.
      </p>
      {localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
      {selectedFile ? (
        <Team4sCropper
          file={selectedFile}
          title="Hintergrundbild zuschneiden"
          cropAriaLabel="Hintergrundbild-Ausschnitt wählen"
          shape="rectangle"
          aspectRatio={16 / 9}
          output={{
            width: 1920,
            height: 1080,
            mimeType: 'image/jpeg',
            filename: backgroundFilename(selectedFile.name),
          }}
          hint="Bild ziehen oder zoomen. Escape schließt den Dialog."
          onCancel={() => setSelectedFile(null)}
          onApply={async (croppedFile) => {
            try {
              await onBackgroundSelected(croppedFile)
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
