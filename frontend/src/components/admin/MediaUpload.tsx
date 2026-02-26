'use client'
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, KeyboardEvent, PointerEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'

import { ApiError, deleteFansubMedia, uploadFansubMedia } from '@/lib/api'
import { FansubMediaKind } from '@/types/fansub'
import { getCropOffsetDeltaForKey, getFocusTrapNextIndex } from '@/components/admin/mediaUploadA11y'

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
const CROP_MIN_ZOOM = 0.2
const CROP_MAX_ZOOM = 4
const CROP_DEFAULT_ZOOM = 1.2
const CROP_OFFSET_SLIDER_STEP = 0.1

type CropMetrics = {
  scale: number
  width: number
  height: number
  maxOffsetX: number
  maxOffsetY: number
}

function clampCropOffset(offset: { x: number; y: number }, metrics: CropMetrics | null): { x: number; y: number } {
  if (!metrics) return { x: 0, y: 0 }
  return {
    x: Math.max(-metrics.maxOffsetX, Math.min(metrics.maxOffsetX, offset.x)),
    y: Math.max(-metrics.maxOffsetY, Math.min(metrics.maxOffsetY, offset.y)),
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/svg+xml') return 'svg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/png') return 'png'
  return 'png'
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.hasAttribute('disabled')) return false
    return true
  })
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
  const cropPanelRef = useRef<HTMLDivElement | null>(null)
  const cropViewportRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busyAction, setBusyAction] = useState<'upload' | 'delete' | null>(null)
  const [preparingEdit, setPreparingEdit] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [cropSourceURL, setCropSourceURL] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('logo.png')
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropImageReady, setCropImageReady] = useState(false)
  const [cropImageSize, setCropImageSize] = useState<{ w: number; h: number } | null>(null)
  const cropHintID = useId()

  const cropImageRef = useRef<HTMLImageElement | null>(null)
  const cropDragRef = useRef<{ pointerID: number; startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (cropSourceURL) URL.revokeObjectURL(cropSourceURL)
    }
  }, [cropSourceURL])

  const fallback = useMemo(() => buildFansubLogoFallback(groupName), [groupName])
  const busy = busyAction !== null || preparingEdit
  const hasValue = Boolean(value?.publicURL?.trim())
  const isLogo = type === 'logo'
  const filename = deriveFilename(value)
  const previewURL = buildMediaPreviewURL(value)
  const cropMetrics = useMemo<CropMetrics | null>(() => {
    if (!cropImageSize) return null
    const baseScale = Math.max(CROP_VIEW_SIZE / cropImageSize.w, CROP_VIEW_SIZE / cropImageSize.h)
    const scale = baseScale * cropZoom
    const width = cropImageSize.w * scale
    const height = cropImageSize.h * scale
    return {
      scale,
      width,
      height,
      maxOffsetX: Math.max(0, (width - CROP_VIEW_SIZE) / 2),
      maxOffsetY: Math.max(0, (height - CROP_VIEW_SIZE) / 2),
    }
  }, [cropImageSize, cropZoom])

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

  useEffect(() => {
    setCropOffset((current) => {
      const next = clampCropOffset(current, cropMetrics)
      if (next.x === current.x && next.y === current.y) return current
      return next
    })
  }, [cropMetrics])

  useEffect(() => {
    if (!cropSourceURL) return
    const frameID = window.requestAnimationFrame(() => {
      cropViewportRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frameID)
  }, [cropSourceURL])

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
    setCropZoom(CROP_DEFAULT_ZOOM)
    setCropOffset({ x: 0, y: 0 })
    setCropImageReady(false)
    setCropImageSize(null)
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
      const baseName = (filename || 'logo').replace(/\.[^.]+$/, '') || 'logo'
      const editableName = `${baseName}.${extensionForMime(mimeType)}`
      const editableFile = new File([blob], editableName, { type: mimeType })
      openLogoCropper(editableFile)
    } catch (nextError) {
      setError(readErrorMessage(nextError, 'Logo konnte nicht zum Bearbeiten geladen werden.'))
    } finally {
      setPreparingEdit(false)
    }
  }

  const closeCropper = () => {
    if (cropSourceURL) URL.revokeObjectURL(cropSourceURL)
    setCropSourceURL(null)
    setCropImageReady(false)
    setCropImageSize(null)
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

    const renderScale =
      cropMetrics?.scale ?? Math.max(CROP_VIEW_SIZE / image.naturalWidth, CROP_VIEW_SIZE / image.naturalHeight) * cropZoom
    const viewportWidth = cropViewportRef.current?.clientWidth ?? CROP_VIEW_SIZE
    const viewportHeight = cropViewportRef.current?.clientHeight ?? CROP_VIEW_SIZE
    const ratioX = CROP_OUTPUT_SIZE / viewportWidth
    const ratioY = CROP_OUTPUT_SIZE / viewportHeight

    const imageWidth = image.naturalWidth * renderScale
    const imageHeight = image.naturalHeight * renderScale
    const drawX = ((viewportWidth - imageWidth) / 2 + cropOffset.x) * ratioX
    const drawY = ((viewportHeight - imageHeight) / 2 + cropOffset.y) * ratioY
    const drawWidth = imageWidth * ratioX
    const drawHeight = imageHeight * ratioY

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
    setCropOffset(clampCropOffset({ x: dragState.originX + deltaX, y: dragState.originY + deltaY }, cropMetrics))
  }

  const onCropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current?.pointerID === event.pointerId) {
      cropDragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onCropViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!cropMetrics) return

    const delta = getCropOffsetDeltaForKey(event.key, event.shiftKey)
    if (!delta) return
    event.preventDefault()
    setCropOffset((current) => clampCropOffset({ x: current.x + delta.x, y: current.y + delta.y }, cropMetrics))
  }

  const onCropOffsetXChange = (nextValue: number) => {
    setCropOffset((current) => clampCropOffset({ x: nextValue, y: current.y }, cropMetrics))
  }

  const onCropOffsetYChange = (nextValue: number) => {
    setCropOffset((current) => clampCropOffset({ x: current.x, y: nextValue }, cropMetrics))
  }

  const onCropZoomChange = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return
    const clamped = Math.max(CROP_MIN_ZOOM, Math.min(CROP_MAX_ZOOM, nextValue))
    setCropZoom(clamped)
  }

  const onCropReset = () => {
    cropDragRef.current = null
    setCropZoom(CROP_DEFAULT_ZOOM)
    setCropOffset({ x: 0, y: 0 })
  }

  const onCropPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeCropper()
      return
    }
    if (event.key !== 'Tab') return

    const panel = cropPanelRef.current
    if (!panel) return

    const focusables = getFocusableElements(panel)
    if (focusables.length === 0) return

    const activeElement = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
    const currentIndex = activeElement ? focusables.indexOf(activeElement) : -1
    const nextIndex = getFocusTrapNextIndex(currentIndex, focusables.length, event.shiftKey)
    if (nextIndex < 0) return

    event.preventDefault()
    focusables[nextIndex]?.focus()
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3>{title}</h3>
        {busy ? (
          <span className={styles.statusPill} aria-live="polite">
            <Loader2 size={14} className={styles.spinner} />
            {preparingEdit ? 'Bearbeiten...' : busyAction === 'upload' ? 'Upload...' : 'Loeschen...'}
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
                <img src={previewURL} alt="Logo Vorschau" className={styles.previewImageRound} />
              </div>
            ) : (
              <div className={styles.previewWide}>
                <img src={previewURL} alt="Banner Vorschau" className={styles.previewImageWide} />
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
          aria-label={`${title} loeschen`}
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
        aria-label={`${title} Datei auswaehlen`}
        onChange={(event) => void onInputChange(event)}
      />

      {type === 'logo' && cropSourceURL ? (
        <div
          ref={cropPanelRef}
          className={styles.cropPanel}
          role="dialog"
          aria-label="Logo-Cropper"
          aria-describedby={cropHintID}
          onKeyDown={onCropPanelKeyDown}
        >
          <p className={styles.cropTitle}>Logo zuschneiden (kreisfoermig)</p>
          <div
            ref={cropViewportRef}
            className={styles.cropViewport}
            tabIndex={0}
            aria-label="Logo-Ausschnitt waehlen"
            onKeyDown={onCropViewportKeyDown}
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
                setCropImageSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
                setCropImageReady(true)
              }}
              style={
                cropImageSize
                  ? (() => {
                      const width = cropMetrics?.width ?? CROP_VIEW_SIZE
                      const height = cropMetrics?.height ?? CROP_VIEW_SIZE
                      return {
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                      }
                    })()
                  : { transform: 'translate(-50%, -50%)' }
              }
            />
            <div className={styles.cropMask} />
          </div>
          <p id={cropHintID} className={styles.cropHint}>Bild ziehen oder X/Y-Regler nutzen. Zoom erlaubt Verkleinern und Vergroessern. Pfeiltasten: fein, Shift+Pfeil: grob. Esc schliesst den Cropper.</p>
          <label className={styles.sliderLabel}>
            Zoom
            <input
              type="range"
              min={CROP_MIN_ZOOM}
              max={CROP_MAX_ZOOM}
              step={0.01}
              value={cropZoom}
              aria-label="Zoom"
              onChange={(event) => onCropZoomChange(Number(event.target.value))}
              disabled={!cropImageReady || busy}
            />
          </label>
          <div className={styles.cropAxisGrid}>
            <label className={styles.sliderLabel}>
              X
              <input
                type="range"
                min={-(cropMetrics?.maxOffsetX ?? 0)}
                max={cropMetrics?.maxOffsetX ?? 0}
                step={CROP_OFFSET_SLIDER_STEP}
                value={cropOffset.x}
                aria-label="X-Verschiebung"
                onChange={(event) => onCropOffsetXChange(Number(event.target.value))}
                disabled={!cropImageReady || busy || !cropMetrics || cropMetrics.maxOffsetX <= 0}
              />
            </label>
            <label className={styles.sliderLabel}>
              Y
              <input
                type="range"
                min={-(cropMetrics?.maxOffsetY ?? 0)}
                max={cropMetrics?.maxOffsetY ?? 0}
                step={CROP_OFFSET_SLIDER_STEP}
                value={cropOffset.y}
                aria-label="Y-Verschiebung"
                onChange={(event) => onCropOffsetYChange(Number(event.target.value))}
                disabled={!cropImageReady || busy || !cropMetrics || cropMetrics.maxOffsetY <= 0}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonSecondary} onClick={closeCropper} disabled={busy}>
              Abbrechen
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={onCropReset}
              disabled={!cropImageReady || busy}
            >
              Position zuruecksetzen
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
