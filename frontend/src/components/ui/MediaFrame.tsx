import type { HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './MediaFrame.module.css'

export type MediaFrameShape = 'rect' | 'round'
export type MediaFrameState = 'empty' | 'dragging' | 'disabled'

export interface MediaFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Breite/Höhe, z. B. 1 für quadratisch, 16/9 für ein Breitbild. */
  aspectRatio?: number
  shape?: MediaFrameShape
  /** 'empty' zeigt eine gestrichelte Fläche, 'dragging' hebt sie hervor (Datei wird darüber
   *  gezogen), 'disabled' dämpft sie ab. Ohne Angabe eine normale, gefüllte Fläche. */
  state?: MediaFrameState
  /** Kleines Abzeichen in der Ecke der Fläche (z. B. eine Herkunfts-Kennzeichnung). */
  cornerBadge?: ReactNode
  /** Abzeichen am unteren Rand der Fläche (z. B. ein Hinweistext beim Darüberziehen). */
  bottomBadge?: ReactNode
  children?: ReactNode
}

/**
 * Fläche mit festem Seitenverhältnis für Bild-/Video-Inhalte, eckig oder rund, mit Zuständen für
 * leer, Datei wird darübergezogen und deaktiviert. Basis für Upload-Flächen und Medien-Vorschauen.
 */
export function MediaFrame({
  aspectRatio = 1,
  shape = 'rect',
  state,
  cornerBadge,
  bottomBadge,
  children,
  className,
  style,
  ...rest
}: MediaFrameProps) {
  return (
    <div
      {...rest}
      className={classNames(
        styles.mediaFrame,
        shape === 'round' && styles.mediaFrameRound,
        state === 'empty' && styles.mediaFrameEmpty,
        state === 'dragging' && styles.mediaFrameDragging,
        state === 'disabled' && styles.mediaFrameDisabled,
        className,
      )}
      style={{ aspectRatio, ...style }}
    >
      {children}
      {cornerBadge ? <div className={styles.mediaFrameCorner}>{cornerBadge}</div> : null}
      {bottomBadge ? <div className={styles.mediaFrameBottom}>{bottomBadge}</div> : null}
    </div>
  )
}
