'use client'

import Image from 'next/image'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'

import { Team4sCropper } from '@/components/media/crop/Team4sCropper'
import { ApiError, deleteFansubMedia, uploadFansubMedia } from '@/lib/api'
import { FansubMediaKind } from '@/types/fansub'

import styles from './MediaUpload.module.css'

export interface EditableMediaValue {
  id?: number | null
  publicURL?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  filename?: string | null
  width?: number | null
  height?: number | null
}

interface MediaUploadProps {
  type: FansubMediaKind
  fansubID: number
  groupName: string
  value: EditableMediaValue | null
  disabled?: boolean
  onBusyChange?: (isBusy: boolean) => void
  onChange: (nextValue: EditableMediaValue | null) => void
  [compatProp: string]: unknown
}

const CROP_OUTPUT_SIZE = 512

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/svg+xml') return 'svg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/png') return 'png'
  return 'png'
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function deriveFilename(value: EditableMediaValue | null): string {
  if (!value) return ''
  if (value.filename?.trim()) return value.filename.trim()
  const raw = value.publicURL?.trim() || ''
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    const parts = parsed.pathname.split('/').filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || '')
  } catch {
    const parts = raw.split('/').filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || '')
  }
}

function appendCacheBustParam(rawURL: string, cacheKey: string): string {
  if (!cacheKey.trim()) return rawURL
  try {
    const parsed = new URL(rawURL)
    parsed.searchParams.set('v', cacheKey)
    return parsed.toString()
  } catch {
    const separator = rawURL.includes('?') ? '&' : '?'
    return `${rawURL}${separator}v=${encodeURIComponent(cacheKey)}`
  }
}

function logoCropFilename(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, '').trim() || 'logo'
  return `${baseName}.png`
}

export function buildMediaPreviewURL(value: EditableMediaValue | null): string {
  const raw = value?.publicURL?.trim() || ''
  if (!raw) return ''

  const keyParts: Array<string> = []
  if (typeof value?.id === 'number' && Number.isFinite(value.id)) keyParts.push(`id:${value.id}`)
  if (typeof value?.sizeBytes === 'number' && Number.isFinite(value.sizeBytes)) keyParts.push(`s:${value.sizeBytes}`)
  if (value?.filename?.trim()) keyParts.push(`f:${value.filename.trim()}`)
  if (value?.mimeType?.trim()) keyParts.push(`m:${value.mimeType.trim()}`)
  if (typeof value?.width === 'number' && Number.isFinite(value.width)) keyParts.push(`w:${value.width}`)
  if (typeof value?.height === 'number' && Number.isFinite(value.height)) keyParts.push(`h:${value.height}`)

  return appendCacheBustParam(raw, keyParts.join('|'))
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function contrastTextColor(hexColor: string): '#FFFFFF' | '#111111' {
  const normalized = hexColor.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance >= 145 ? '#111111' : '#FFFFFF'
}

export function buildFansubLogoFallback(groupName: string): {
  initials: string
  background: string
  color: '#FFFFFF' | '#111111'
} {
  const cleaned = groupName.trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  const initials = words.length === 0 ? '?' : (words[0][0] + (words[1]?.[0] || '')).toUpperCase()

  const hue = hashString(cleaned || '?') % 360
  const saturation = 62
  const lightness = 44
  const background = hslToHex(hue, saturation, lightness)
  const color = contrastTextColor(background)
  return { initials, background, color }
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function validateFile(type: FansubMediaKind, file: File): string | null {
  const logoAllowed = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
  const bannerAllowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

  if (type === 'logo') {
    if (!logoAllowed.has(file.type)) {
      return 'Ungültiges Logo-Format. Erlaubt: SVG, PNG, JPG, WEBP.'
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'Logo ist zu groß (max. 2MB).'
    }
    return null
  }

  if (!bannerAllowed.has(file.type)) {
    if (file.type === 'image/svg+xml') return 'SVG ist für Banner nicht erlaubt.'
    return 'Ungültiges Banner-Format. Erlaubt: PNG, JPG, WEBP, GIF.'
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Banner ist zu groß (max. 5MB).'
  }
  return null
}

export function MediaUpload({ type, fansubID, groupName, value, disabled, onBusyChange, onChange }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busyAction, setBusyAction] = useState<'upload' | 'delete' | null>(null)
  const [preparingEdit, setPreparingEdit] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)

  const fallback = useMemo(() => buildFansubLogoFallback(groupName), [groupName])
  const busy = busyAction !== null || preparingEdit
  const hasValue = Boolean(value?.publicURL?.trim())
  const isLogo = type === 'logo'
  const filename = deriveFilename(value)
  const previewURL = buildMediaPreviewURL(value)

  const title = isLogo ? 'Logo' : 'Banner'
  const acceptedMime = isLogo ? 'image/svg+xml,image/png,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp,image/gif'
  const dropzoneAriaLabel = isLogo
    ? hasValue
      ? 'Logo ersetzen oder neu hochladen'
      : 'Logo hochladen'
    : hasValue
      ? 'Banner ersetzen oder neu hochladen'
      : 'Banner hochladen'

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  const submitUpload = async (file: File) => {
    setError(null)
    setWarning(null)
    setBusyAction('upload')
    setProgress(0)

    try {
      const response = await uploadFansubMedia({
        fansubID,
        kind: type,
        file,
        onProgress: setProgress,
      })

      const media = response.data.media
      onChange({
        id: media.id,
        publicURL: media.public_url,
        mimeType: media.mime_type,
        sizeBytes: media.size_bytes,
        filename: media.filename,
        width: media.width ?? null,
        height: media.height ?? null,
      })

      if (response.data.gif_large_warning) {
        setWarning('Hinweis: Dieses GIF ist groß (>4MB) und kann langsamer laden.')
      } else if (type === 'banner' && media.mime_type === 'image/gif' && media.size_bytes > 4 * 1024 * 1024) {
        setWarning('Hinweis: Dieses GIF ist groß (>4MB) und kann langsamer laden.')
      }
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Upload fehlgeschlagen.'))
    } finally {
      setBusyAction(null)
      setProgress(0)
    }
  }

  const onEditCurrentLogo = async () => {
    if (!isLogo || !hasValue || disabled || busy) return
    const sourceURL = previewURL || value?.publicURL?.trim() || ''
    if (!sourceURL) return

    setError(null)
    setWarning(null)
    setPreparingEdit(true)

    try {
      const response = await fetch(sourceURL, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`(${response.status}) Logo konnte nicht geladen werden.`)
      }
      const blob = await response.blob()
      const mimeType = blob.type || value?.mimeType?.trim() || 'image/png'
      if (mimeType === 'image/svg+xml') {
        setError('SVG-Logos können nicht zugeschnitten werden. Lade eine neue SVG-Datei hoch oder ersetze das Logo mit einem Rasterbild.')
        return
      }
      const baseName = (filename || 'logo').replace(/\.[^.]+$/, '') || 'logo'
      const editableName = `${baseName}.${extensionForMime(mimeType)}`
      const editableFile = new File([blob], editableName, { type: mimeType })
      setCropSourceFile(editableFile)
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Logo konnte nicht zum Bearbeiten geladen werden.'))
    } finally {
      setPreparingEdit(false)
    }
  }

  const processFile = async (file: File) => {
    setError(null)
    setWarning(null)

    const validationError = validateFile(type, file)
    if (validationError) {
      setError(validationError)
      return
    }

    if (type === 'banner' && file.type === 'image/gif' && file.size > 4 * 1024 * 1024) {
      setWarning('Hinweis: Dieses GIF ist groß (>4MB) und kann langsamer laden.')
    }

    if (type === 'logo') {
      if (file.type === 'image/svg+xml') {
        await submitUpload(file)
        return
      }
      setCropSourceFile(file)
      return
    }

    await submitUpload(file)
  }

  const onInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file || busy || disabled) return
    await processFile(file)
  }

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)

    if (busy || disabled) return
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const onDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || busy) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const onRemove = async () => {
    if (busy || disabled || !hasValue) return
    setError(null)
    setWarning(null)
    setBusyAction('delete')

    try {
      await deleteFansubMedia(fansubID, type)
      onChange(null)
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Löschen fehlgeschlagen.'))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3>{title}</h3>
        {busy ? (
          <span className={styles.statusPill} aria-live="polite">
            <Loader2 size={14} className={styles.spinner} />
            {preparingEdit ? 'Bearbeiten...' : busyAction === 'upload' ? 'Upload...' : 'Löschen...'}
          </span>
        ) : null}
      </div>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneDrag : ''} ${error ? styles.dropzoneError : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={dropzoneAriaLabel}
        aria-busy={busy}
        onClick={() => (!disabled && !busy ? inputRef.current?.click() : undefined)}
        onKeyDown={onDropzoneKeyDown}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled && !busy) setDragging(true)
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled && !busy) setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(false)
        }}
        onDrop={(event) => {
          void onDrop(event)
        }}
        aria-disabled={disabled || busy}
      >
        {hasValue ? (
          <>
            {isLogo ? (
              <div className={styles.previewRound}>
                <Image
                  src={previewURL}
                  alt="Logo Vorschau"
                  className={styles.previewImageRound}
                  width={116}
                  height={116}
                  unoptimized
                />
              </div>
            ) : (
              <div className={styles.previewWide}>
                <Image
                  src={previewURL}
                  alt="Banner Vorschau"
                  className={styles.previewImageWide}
                  width={520}
                  height={130}
                  unoptimized
                />
              </div>
            )}
          </>
        ) : isLogo ? (
          <div className={styles.previewRoundFallback} style={{ backgroundColor: fallback.background, color: fallback.color }}>
            {fallback.initials}
          </div>
        ) : (
          <div className={styles.previewWideEmpty}>Kein Banner vorhanden</div>
        )}

        {!hasValue ? (
          <div className={styles.emptyState}>
            <ImagePlus size={20} />
            <span>Bild hierher ziehen oder klicken zum Hochladen</span>
          </div>
        ) : null}
      </div>

      {busyAction === 'upload' ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{progress}%</span>
        </div>
      ) : null}

      <div className={styles.fileMeta}>
        <span>{filename || 'Kein Dateiname'}</span>
        <span>{formatBytes(value?.sizeBytes)}</span>
      </div>

      <div className={styles.actions}>
        {isLogo && hasValue ? (
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => void onEditCurrentLogo()}
            disabled={disabled || busy}
            aria-label="Logo bearbeiten"
          >
            <Pencil size={14} />
            Edit
          </button>
        ) : null}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          aria-label={`${title} ersetzen`}
        >
          <RefreshCw size={14} />
          Replace
        </button>
        <button
          type="button"
          className={styles.buttonDanger}
          onClick={() => void onRemove()}
          disabled={disabled || busy || !hasValue}
          aria-label={`${title} löschen`}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {warning ? <p className={styles.warning} aria-live="polite">{warning}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={acceptedMime}
        aria-label={`${title} Datei auswählen`}
        onChange={(event) => void onInputChange(event)}
      />

      {type === 'logo' && cropSourceFile ? (
        <Team4sCropper
          file={cropSourceFile}
          title="Logo zuschneiden"
          cropAriaLabel="Logo-Ausschnitt wählen"
          shape="circle"
          aspectRatio={1}
          output={{
            width: CROP_OUTPUT_SIZE,
            height: CROP_OUTPUT_SIZE,
            mimeType: 'image/png',
            filename: logoCropFilename(cropSourceFile.name),
          }}
          hint="Bild ziehen oder zoomen. Escape schließt den Cropper."
          applyLabel="Ausschnitt speichern"
          disabled={busy}
          onCancel={() => setCropSourceFile(null)}
          onApply={async (croppedFile) => {
            setCropSourceFile(null)
            await submitUpload(croppedFile)
          }}
        />
      ) : null}
    </div>
  )
}
