'use client'

import { Team4sCropper } from './Team4sCropper'

const AVATAR_CROP_OUTPUT_SIZE = 512

type AvatarCropDialogProps = {
  file: File
  onCancel: () => void
  onApply: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
}

function avatarFilename(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, '').trim() || 'avatar'
  return `${baseName}-avatar.png`
}

export function AvatarCropDialog({ file, onCancel, onApply }: AvatarCropDialogProps) {
  return (
    <Team4sCropper
      file={file}
      title="Avatar zuschneiden"
      cropAriaLabel="Avatar-Ausschnitt wählen"
      shape="circle"
      aspectRatio={1}
      output={{
        width: AVATAR_CROP_OUTPUT_SIZE,
        height: AVATAR_CROP_OUTPUT_SIZE,
        mimeType: 'image/png',
        filename: avatarFilename(file.name),
      }}
      hint="Bild ziehen oder zoomen. Escape schließt den Dialog."
      onCancel={onCancel}
      onApply={(croppedFile) => onApply({ sourceFile: file, croppedFile })}
    />
  )
}
