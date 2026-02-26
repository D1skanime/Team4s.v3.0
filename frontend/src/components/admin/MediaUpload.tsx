'use client'
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'

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
  authToken?: string
  disabled?: boolean
  onBusyChange?: (isBusy: boolean) => void
  onChange: (nextValue: EditableMediaValue | null) => void
}

const CROP_VIEW_SIZE = 260
const CROP_OUTPUT_SIZE = 512

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
      return 'Ungueltiges Logo-Format. Erlaubt: SVG, PNG, JPG, WEBP.'
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'Logo ist zu gross (max. 2MB).'
    }
    return null
  }

  if (!bannerAllowed.has(file.type)) {
    if (file.type === 'image/svg+xml') return 'SVG ist fuer Banner nicht erlaubt.'
    return 'Ungueltiges Banner-Format. Erlaubt: PNG, JPG, WEBP, GIF.'
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Banner ist zu gross (max. 5MB).'
  }
  return null
}

export function MediaUpload({ type, fansubID, groupName, value, authToken, disabled, onBusyChange, onChange }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busyAction, setBusyAction] = useState<'upload' | 'delete' | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [cropSourceURL, setCropSourceURL] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('logo.png')
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropImageReady, setCropImageReady] = useState(false)

  const cropImageRef = useRef<HTMLImageElement | null>(null)
  const cropDragRef = useRef<{ pointerID: number; startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (cropSourceURL) URL.revokeObjectURL(cropSourceURL)
    }
  }, [cropSourceURL])

  const fallback = useMemo(() => buildFansubLogoFallback(groupName), [groupName])
  const busy = busyAction !== null
  const hasValue = Boolean(value?.publicURL?.trim())
  const isLogo = type === 'logo'

  const title = isLogo ? 'Logo' : 'Banner'
  const acceptedMime = isLogo ? 'image/svg+xml,image/png,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp,image/gif'

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
        authToken,
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
        setWarning('Hinweis: Dieses GIF ist gross (>4MB) und kann langsamer laden.')
      } else if (type === 'banner' && media.mime_type === 'image/gif' && media.size_bytes > 4 * 1024 * 1024) {
        setWarning('Hinweis: Dieses GIF ist gross (>4MB) und kann langsamer laden.')
      }
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Upload fehlgeschlagen.'))
    } finally {
      setBusyAction(null)
      setProgress(0)
    }
  }

  const openLogoCropper = (file: File) => {
    const nextURL = URL.createObjectURL(file)
    if (cropSourceURL) URL.revokeObjectURL(cropSourceURL)
    const cleanName = file.name.replace(/\.[^.]+$/, '') || 'logo'

    setCropFileName(`${cleanName}.png`)
    setCropSourceURL(nextURL)
    setCropZoom(1)
    setCropOffset({ x: 0, y: 0 })
    setCropImageReady(false)
  }

  const closeCropper = () => {
    if (cropSourceURL) URL.revokeObjectURL(cropSourceURL)
    setCropSourceURL(null)
    setCropImageReady(false)
    cropImageRef.current = null
    cropDragRef.current = null
  }

  const cropAndUploadLogo = async () => {
    if (!cropImageRef.current) {
      setError('Cropper konnte das Bild nicht laden.')
      return
    }

    const image = cropImageRef.current
    const canvas = document.createElement('canvas')
    canvas.width = CROP_OUTPUT_SIZE
    canvas.height = CROP_OUTPUT_SIZE

    const context = canvas.getContext('2d')
    if (!context) {
      setError('Cropper konnte nicht initialisiert werden.')
      return
    }

    const baseScale = Math.max(CROP_OUTPUT_SIZE / image.naturalWidth, CROP_OUTPUT_SIZE / image.naturalHeight)
    const scale = baseScale * cropZoom
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const ratio = CROP_OUTPUT_SIZE / CROP_VIEW_SIZE

    const drawX = (CROP_OUTPUT_SIZE - drawWidth) / 2 + cropOffset.x * ratio
    const drawY = (CROP_OUTPUT_SIZE - drawHeight) / 2 + cropOffset.y * ratio

    context.clearRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)
    context.save()
    context.beginPath()
    context.arc(CROP_OUTPUT_SIZE / 2, CROP_OUTPUT_SIZE / 2, CROP_OUTPUT_SIZE / 2, 0, Math.PI * 2)
    context.closePath()
    context.clip()
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    context.restore()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setError('Cropper konnte das Bild nicht exportieren.')
      return
    }

    closeCropper()
    const croppedFile = new File([blob], cropFileName, { type: 'image/png' })
    await submitUpload(croppedFile)
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
      setWarning('Hinweis: Dieses GIF ist gross (>4MB) und kann langsamer laden.')
    }

    if (type === 'logo') {
      openLogoCropper(file)
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

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
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
      await deleteFansubMedia(fansubID, type, authToken)
      onChange(null)
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Loeschen fehlgeschlagen.'))
    } finally {
      setBusyAction(null)
    }
  }

  const onCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropSourceURL || disabled || busy) return
    event.preventDefault()

    cropDragRef.current = {
      pointerID: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropOffset.x,
      originY: cropOffset.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = cropDragRef.current
    if (!dragState || dragState.pointerID !== event.pointerId) return

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    setCropOffset({ x: dragState.originX + deltaX, y: dragState.originY + deltaY })
  }

  const onCropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current?.pointerID === event.pointerId) {
      cropDragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const filename = deriveFilename(value)

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3>{title}</h3>
        {busy ? (
          <span className={styles.statusPill}>
            <Loader2 size={14} className={styles.spinner} />
            {busyAction === 'upload' ? 'Upload...' : 'Loeschen...'}
          </span>
        ) : null}
      </div>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneDrag : ''} ${error ? styles.dropzoneError : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
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
                <img src={value?.publicURL || ''} alt="Logo Vorschau" className={styles.previewImageRound} />
              </div>
            ) : (
              <div className={styles.previewWide}>
                <img src={value?.publicURL || ''} alt="Banner Vorschau" className={styles.previewImageWide} />
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
        <button type="button" className={styles.buttonSecondary} onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          <RefreshCw size={14} />
          Replace
        </button>
        <button type="button" className={styles.buttonDanger} onClick={() => void onRemove()} disabled={disabled || busy || !hasValue}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {warning ? <p className={styles.warning}>{warning}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <input ref={inputRef} className={styles.fileInput} type="file" accept={acceptedMime} onChange={(event) => void onInputChange(event)} />

      {type === 'logo' && cropSourceURL ? (
        <div className={styles.cropPanel}>
          <p className={styles.cropTitle}>Logo zuschneiden (kreisfoermig)</p>
          <div
            className={styles.cropViewport}
            onPointerDown={onCropPointerDown}
            onPointerMove={onCropPointerMove}
            onPointerUp={onCropPointerUp}
            onPointerCancel={onCropPointerUp}
          >
            <img
              src={cropSourceURL}
              alt="Logo Crop"
              className={styles.cropImage}
              onLoad={(event) => {
                cropImageRef.current = event.currentTarget
                setCropImageReady(true)
              }}
              style={{ transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})` }}
            />
            <div className={styles.cropMask} />
          </div>
          <label className={styles.sliderLabel}>
            Zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={cropZoom}
              onChange={(event) => setCropZoom(Number(event.target.value))}
              disabled={!cropImageReady || busy}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonSecondary} onClick={closeCropper} disabled={busy}>
              Abbrechen
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={() => void cropAndUploadLogo()} disabled={!cropImageReady || busy}>
              Ausschnitt speichern
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
