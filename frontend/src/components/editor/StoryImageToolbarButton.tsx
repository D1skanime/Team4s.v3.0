'use client'

// StoryImageToolbarButton.tsx — praeventiever Split aus RichTextEditor.tsx.
// Lagert den Bild-Toolbar-Button inkl. verstecktem file-input aus,
// damit RichTextEditor.tsx unter der 450-Zeilen-Grenze (CLAUDE.md) bleibt.
// Anforderungen: D-11 (opt-in), D-16 (kein GIF), T-70-05-04 (accept-MIME).

import { useRef } from 'react'
import { Image } from 'lucide-react'

type StoryImageToolbarButtonProps = {
  /** Callback wenn Nutzer eine Datei auswaehlt */
  onFileSelected: (file: File) => void
  disabled?: boolean
  className?: string
  btnClassName?: string
}

/**
 * Ausgelagerter Toolbar-Button fuer das Einfuegen von Profilgeschichte-Bildern.
 * Rendert einen einzigen Toolbar-Button mit verstecktem file-input.
 * Accept-Attribut begrenzt MIME auf jpg/png/webp — kein GIF (D-16, T-70-05-04).
 */
export function StoryImageToolbarButton({
  onFileSelected,
  disabled = false,
  className,
  btnClassName,
}: StoryImageToolbarButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleButtonClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    onFileSelected(file)
    // Wert zuruecksetzen damit dieselbe Datei erneut ausgewaehlt werden kann
    event.target.value = ''
  }

  return (
    <span className={className}>
      <button
        type="button"
        className={btnClassName}
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label="Bild einfügen"
        title="Bild einfügen"
      >
        <Image size={14} strokeWidth={1.75} />
      </button>
      {/* Versteckter file-input — T-70-05-04: accept begrenzt MIME, kein GIF */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  )
}
