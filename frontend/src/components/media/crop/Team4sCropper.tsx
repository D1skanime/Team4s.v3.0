'use client'

import type { KeyboardEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { X } from 'lucide-react'

import { Button } from '@/components/ui'

import { getFocusableElements, getFocusTrapNextIndex } from './mediaCropA11y'
import styles from './Team4sCropper.module.css'

export type Team4sCropperShape = 'circle' | 'rectangle'

export type Team4sCropperOutput = {
  width: number
  height: number
  mimeType?: 'image/png' | 'image/webp' | 'image/jpeg'
  filename: string
}

type Team4sCropperProps = {
  file: File
  title: string
  cropAriaLabel: string
  shape?: Team4sCropperShape
  aspectRatio?: number
  output: Team4sCropperOutput
  hint?: string
  applyLabel?: string
  resetLabel?: string
  cancelLabel?: string
  disabled?: boolean
  onCancel: () => void
  onApply: (croppedFile: File) => Promise<void> | void
}

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 4

function loadImage(sourceURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
    image.src = sourceURL
  })
}

function drawCroppedImage(input: {
  image: HTMLImageElement
  area: Area
  output: Required<Pick<Team4sCropperOutput, 'width' | 'height' | 'mimeType'>>
  shape: Team4sCropperShape
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = input.output.width
  canvas.height = input.output.height

  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)

  context.clearRect(0, 0, input.output.width, input.output.height)
  context.save()
  if (input.shape === 'circle') {
    context.beginPath()
    context.arc(input.output.width / 2, input.output.height / 2, Math.min(input.output.width, input.output.height) / 2, 0, Math.PI * 2)
    context.closePath()
    context.clip()
  }
  context.drawImage(
    input.image,
    input.area.x,
    input.area.y,
    input.area.width,
    input.area.height,
    0,
    0,
    input.output.width,
    input.output.height,
  )
  context.restore()

  return new Promise((resolve) => canvas.toBlob(resolve, input.output.mimeType))
}

export function Team4sCropper({
  file,
  title,
  cropAriaLabel,
  shape = 'circle',
  aspectRatio = 1,
  output,
  hint = 'Bild ziehen, zoomen und den Ausschnitt übernehmen. Escape schließt den Dialog.',
  applyLabel = 'Ausschnitt übernehmen',
  resetLabel = 'Position zurücksetzen',
  cancelLabel = 'Abbrechen',
  disabled = false,
  onCancel,
  onApply,
}: Team4sCropperProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleID = useId()
  const hintID = useId()

  const [sourceURL, setSourceURL] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const outputConfig = useMemo(() => ({
    width: output.width,
    height: output.height,
    mimeType: output.mimeType ?? 'image/png',
  }), [output.height, output.mimeType, output.width])

  useEffect(() => {
    const nextURL = URL.createObjectURL(file)
    setSourceURL(nextURL)
    setCrop({ x: 0, y: 0 })
    setZoom(DEFAULT_ZOOM)
    setCroppedArea(null)
    setError(null)
    return () => URL.revokeObjectURL(nextURL)
  }, [file])

  useEffect(() => {
    const frameID = window.requestAnimationFrame(() => {
      const firstFocusable = panelRef.current ? getFocusableElements(panelRef.current)[0] : null
      firstFocusable?.focus()
    })
    return () => window.cancelAnimationFrame(frameID)
  }, [])

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusables = getFocusableElements(panel)
    const currentIndex = document.activeElement ? focusables.indexOf(document.activeElement as HTMLElement) : -1
    const nextIndex = getFocusTrapNextIndex(currentIndex, focusables.length, event.shiftKey)
    if (nextIndex < 0) return

    event.preventDefault()
    focusables[nextIndex]?.focus()
  }

  async function applyCrop() {
    if (!sourceURL || !croppedArea) {
      setError('Der Ausschnitt ist noch nicht bereit.')
      return
    }

    setIsApplying(true)
    setError(null)
    try {
      const image = await loadImage(sourceURL)
      // croppedArea is in percentage (0–100). Convert to natural pixel coords here
      // so the canvas drawImage always uses the image's actual resolution, independent
      // of how react-easy-crop scales the image inside the viewport container.
      const naturalArea: Area = {
        x: (croppedArea.x / 100) * image.naturalWidth,
        y: (croppedArea.y / 100) * image.naturalHeight,
        width: (croppedArea.width / 100) * image.naturalWidth,
        height: (croppedArea.height / 100) * image.naturalHeight,
      }
      const blob = await drawCroppedImage({
        image,
        area: naturalArea,
        output: outputConfig,
        shape,
      })
      if (!blob) {
        setError('Der Zuschnitt konnte nicht exportiert werden.')
        return
      }
      await onApply(new File([blob], output.filename, { type: outputConfig.mimeType }))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Der Zuschnitt konnte nicht erstellt werden.')
    } finally {
      setIsApplying(false)
    }
  }

  const busy = disabled || isApplying

  return (
    <div className={styles.dialogShell} role="presentation">
      <div className={styles.backdrop} aria-hidden="true" />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleID}
        aria-describedby={hintID}
        onKeyDown={onPanelKeyDown}
      >
        <header className={styles.header}>
          <h2 id={titleID} className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeButton} aria-label="Dialog schließen" onClick={onCancel} disabled={busy}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div>
          <div className={styles.cropViewport} aria-label={cropAriaLabel} tabIndex={0}>
            {sourceURL ? (
              <Cropper
                image={sourceURL}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={aspectRatio}
                cropShape={shape === 'circle' ? 'round' : 'rect'}
                showGrid={shape !== 'circle'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(percentArea) => setCroppedArea(percentArea)}
                classes={{
                  containerClassName: styles.cropperContainer,
                  mediaClassName: styles.cropperMedia,
                  cropAreaClassName: styles.cropperArea,
                }}
              />
            ) : null}
          </div>
          <p id={hintID} className={styles.hint}>{hint}</p>
        </div>

        <div className={styles.controls}>
          <label className={styles.sliderLabel}>
            Zoom
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              aria-label="Zoom"
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={busy}
            />
          </label>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button
            variant="subtle"
            onClick={() => {
              setCrop({ x: 0, y: 0 })
              setZoom(DEFAULT_ZOOM)
            }}
            disabled={busy}
          >
            {resetLabel}
          </Button>
          <Button onClick={() => void applyCrop()} loading={isApplying} disabled={disabled || !croppedArea}>
            {applyLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
