'use client'

import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useRef } from 'react'
import styles from './StoryImageNodeView.module.css'

// StoryImageNodeView: React NodeView fuer TipTap Story-Bild-Nodes.
// Zeigt lokale Vorschau (Object-URL), Resize-Handle und L/M/R-Ausrichtungs-Toolbar.
// D-02: kein alt-Attribut auf dem img-Tag.
// D-04: kein Bild sichtbar wenn weder preview_url noch media_asset_id vorhanden.
export function StoryImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { media_asset_id, preview_url, width_percent, alignment } = node.attrs as {
    media_asset_id: number | null
    preview_url: string | null
    width_percent: number
    alignment: string
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const imgSrc = preview_url ?? null

  // D-04: kein Bild wenn weder preview_url noch media_asset_id
  if (!imgSrc && !media_asset_id) return null

  // Resize per native onMouseDown + onMouseMove (kein externes DnD-Paket — analog Phase 38)
  function handleResizeStart(event: React.MouseEvent) {
    event.preventDefault()
    const startX = event.clientX
    const container = containerRef.current
    if (!container) return

    const containerParent = container.parentElement
    const parentWidth = containerParent?.clientWidth ?? container.offsetWidth
    const startPercent = typeof width_percent === 'number' ? width_percent : 60

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX
      const deltaPercent = (delta / parentWidth) * 100
      const newPercent = Math.min(100, Math.max(10, startPercent + deltaPercent))
      updateAttributes({ width_percent: Math.round(newPercent) })
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const alignClass = alignment === 'left'
    ? styles['align-left']
    : alignment === 'right'
      ? styles['align-right']
      : styles['align-center']

  return (
    <NodeViewWrapper
      className={`${styles.storyImageWrapper} ${alignClass} ${selected ? styles.selected : ''}`}
      data-drag-handle
    >
      {selected && (
        <div className={styles.nodeToolbar} role="toolbar" aria-label="Bildausrichtung">
          <button
            type="button"
            className={`${styles.toolbarBtn} ${alignment === 'left' ? styles.toolbarBtnActive : ''}`}
            onClick={() => updateAttributes({ alignment: 'left' })}
            aria-label="Links ausrichten"
            title="Links ausrichten"
          >
            <AlignLeft size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={`${styles.toolbarBtn} ${alignment === 'center' ? styles.toolbarBtnActive : ''}`}
            onClick={() => updateAttributes({ alignment: 'center' })}
            aria-label="Zentriert ausrichten"
            title="Zentriert ausrichten"
          >
            <AlignCenter size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={`${styles.toolbarBtn} ${alignment === 'right' ? styles.toolbarBtnActive : ''}`}
            onClick={() => updateAttributes({ alignment: 'right' })}
            aria-label="Rechts ausrichten"
            title="Rechts ausrichten"
          >
            <AlignRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={styles.imageContainer}
        style={{ width: `${typeof width_percent === 'number' ? width_percent : 60}%` }}
      >
        {imgSrc && (
          // D-02: kein alt-Attribut
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} className={styles.storyImage} />
        )}
        {selected && (
          <div
            className={styles.resizeHandle}
            onMouseDown={handleResizeStart}
            aria-label="Bildbreite anpassen"
            role="slider"
            aria-valuemin={10}
            aria-valuemax={100}
            aria-valuenow={typeof width_percent === 'number' ? width_percent : 60}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
