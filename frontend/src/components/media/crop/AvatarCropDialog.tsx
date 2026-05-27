'use client'

import Image from 'next/image'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui'

import { getCropOffsetDeltaForKey, getFocusableElements, getFocusTrapNextIndex } from './mediaCropA11y'
import { clampCropOffset, computeCropDrawRect, computeCropMetrics, type CropMetrics } from './mediaCropMath'
import styles from './AvatarCropDialog.module.css'

const AVATAR_CROP_VIEW_SIZE = 340
const AVATAR_CROP_OUTPUT_SIZE = 512
const AVATAR_CROP_MIN_ZOOM = 0.6
const AVATAR_CROP_MAX_ZOOM = 4
const AVATAR_CROP_DEFAULT_ZOOM = 1.15

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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ pointerID: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const hintID = useId()
  const titleID = useId()

  const [sourceURL, setSourceURL] = useState<string | null>(null)
  const [imageReady, setImageReady] = useState(false)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(AVATAR_CROP_DEFAULT_ZOOM)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const cropMetrics = useMemo<CropMetrics | null>(() => computeCropMetrics(imageSize, AVATAR_CROP_VIEW_SIZE, zoom), [imageSize, zoom])

  useEffect(() => {
    const nextURL = URL.createObjectURL(file)
    setSourceURL(nextURL)
    setImageReady(false)
    setImageSize(null)
    setZoom(AVATAR_CROP_DEFAULT_ZOOM)
    setOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(nextURL)
  }, [file])

  useEffect(() => {
    const frameID = window.requestAnimationFrame(() => {
      viewportRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frameID)
  }, [])

  useEffect(() => {
    setOffset((current) => {
      const next = clampCropOffset(current, cropMetrics)
      if (next.x === current.x && next.y === current.y) return current
      return next
    })
  }, [cropMetrics])

  const imageStyle = useMemo(() => {
    const width = cropMetrics?.width ?? AVATAR_CROP_VIEW_SIZE
    const height = cropMetrics?.height ?? AVATAR_CROP_VIEW_SIZE
    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
    }
  }, [cropMetrics, offset])

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

  function onCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageReady || isApplying) return
    event.preventDefault()
    dragRef.current = {
      pointerID: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragRef.current
    if (!dragState || dragState.pointerID !== event.pointerId) return

    setOffset(clampCropOffset({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    }, cropMetrics))
  }

  function onCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerID === event.pointerId) {
      dragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onCropKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = getCropOffsetDeltaForKey(event.key, event.shiftKey)
    if (!delta) return
    event.preventDefault()
    setOffset((current) => clampCropOffset({ x: current.x + delta.x, y: current.y + delta.y }, cropMetrics))
  }

  function onZoomChange(nextZoom: number) {
    if (!Number.isFinite(nextZoom)) return
    setZoom(Math.max(AVATAR_CROP_MIN_ZOOM, Math.min(AVATAR_CROP_MAX_ZOOM, nextZoom)))
  }

  async function applyCrop() {
    if (!imageRef.current) {
      setError('Das Bild konnte nicht geladen werden.')
      return
    }

    const image = imageRef.current
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_CROP_OUTPUT_SIZE
    canvas.height = AVATAR_CROP_OUTPUT_SIZE

    const context = canvas.getContext('2d')
    if (!context) {
      setError('Der Avatar-Zuschnitt konnte nicht vorbereitet werden.')
      return
    }

    const viewportWidth = viewportRef.current?.clientWidth ?? AVATAR_CROP_VIEW_SIZE
    const viewportHeight = viewportRef.current?.clientHeight ?? AVATAR_CROP_VIEW_SIZE
    const { drawX, drawY, drawWidth, drawHeight } = computeCropDrawRect({
      imageNatural: { w: image.naturalWidth, h: image.naturalHeight },
      cropMetrics,
      cropZoom: zoom,
      cropOffset: offset,
      viewportWidth,
      viewportHeight,
      viewSize: AVATAR_CROP_VIEW_SIZE,
      outputSize: AVATAR_CROP_OUTPUT_SIZE,
    })

    context.clearRect(0, 0, AVATAR_CROP_OUTPUT_SIZE, AVATAR_CROP_OUTPUT_SIZE)
    context.save()
    context.beginPath()
    context.arc(AVATAR_CROP_OUTPUT_SIZE / 2, AVATAR_CROP_OUTPUT_SIZE / 2, AVATAR_CROP_OUTPUT_SIZE / 2, 0, Math.PI * 2)
    context.closePath()
    context.clip()
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    context.restore()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setError('Der Avatar-Zuschnitt konnte nicht exportiert werden.')
      return
    }

    setIsApplying(true)
    setError(null)
    try {
      await onApply({
        sourceFile: file,
        croppedFile: new File([blob], avatarFilename(file.name), { type: 'image/png' }),
      })
    } finally {
      setIsApplying(false)
    }
  }

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
          <div>
            <h2 id={titleID} className={styles.title}>Avatar zuschneiden</h2>
            <p className={styles.description}>Das Original bleibt intern erhalten; angezeigt wird nur der runde Zuschnitt.</p>
          </div>
          <button type="button" className={styles.closeButton} aria-label="Dialog schließen" onClick={onCancel}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.cropGrid}>
          <div>
            <div
              ref={viewportRef}
              className={styles.cropViewport}
              tabIndex={0}
              aria-label="Avatar-Ausschnitt wählen"
              onPointerDown={onCropPointerDown}
              onPointerMove={onCropPointerMove}
              onPointerUp={onCropPointerUp}
              onPointerCancel={onCropPointerUp}
              onKeyDown={onCropKeyDown}
            >
              {sourceURL ? (
                <Image
                  src={sourceURL}
                  alt="Avatar Zuschnitt"
                  className={styles.cropImage}
                  width={AVATAR_CROP_VIEW_SIZE}
                  height={AVATAR_CROP_VIEW_SIZE}
                  unoptimized
                  onLoad={(event) => {
                    imageRef.current = event.currentTarget
                    setImageSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
                    setImageReady(true)
                  }}
                  style={imageStyle}
                />
              ) : null}
              <div className={styles.cropMask} />
            </div>
            <p id={hintID} className={styles.hint}>Ziehen oder Pfeiltasten nutzen. Shift+Pfeil bewegt schneller. Escape schließt den Dialog.</p>
          </div>

          <div className={styles.previewStack} aria-label="Runde Avatar-Vorschau">
            <div className={styles.previewCircle}>
              {sourceURL ? (
                <Image src={sourceURL} alt="Große Avatar-Vorschau" className={styles.cropImage} width={124} height={124} unoptimized style={imageStyle} />
              ) : null}
            </div>
            <div className={`${styles.previewCircle} ${styles.previewCircleSmall}`}>
              {sourceURL ? (
                <Image src={sourceURL} alt="Kleine Avatar-Vorschau" className={styles.cropImage} width={64} height={64} unoptimized style={imageStyle} />
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.sliderLabel}>
            Zoom
            <input
              type="range"
              min={AVATAR_CROP_MIN_ZOOM}
              max={AVATAR_CROP_MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
              disabled={!imageReady || isApplying}
            />
          </label>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={isApplying}>Abbrechen</Button>
          <Button
            variant="subtle"
            onClick={() => {
              dragRef.current = null
              setZoom(AVATAR_CROP_DEFAULT_ZOOM)
              setOffset({ x: 0, y: 0 })
            }}
            disabled={!imageReady || isApplying}
          >
            Position zurücksetzen
          </Button>
          <Button onClick={() => void applyCrop()} loading={isApplying} disabled={!imageReady}>
            Ausschnitt übernehmen
          </Button>
        </div>
      </div>
    </div>
  )
}

