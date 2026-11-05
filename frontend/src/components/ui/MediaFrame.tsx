import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './MediaFrame.module.css'

export type MediaFrameShape = 'rect' | 'round'
export type MediaFrameState = 'empty' | 'dragging' | 'disabled'
export type MediaFrameVariant = 'default' | 'posterFade'
export type MediaFrameWidthPurpose = 'posterHero'

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
  variant?: MediaFrameVariant
  backdropImage?: string
  /** Generischer Breiten-Zweck-Hook (aktuell ein Mitglied) -- setzt eine haltepunktabhängige
   *  Modifikatorklasse statt eines Inline-Style-Werts, da die Posterspalte DREI responsive Breiten-
   *  Stufen braucht (eine CSS Custom Property kann @media-bedingte Werte nicht rein über Inline-Style
   *  ausdrücken). Ohne Angabe bleibt MediaFrame bei seiner bisherigen width:100%-Basisregel
   *  (Zero-Pixel-Diff für jeden bestehenden Aufrufer). */
  widthPurpose?: MediaFrameWidthPurpose
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
  variant = 'default',
  backdropImage,
  widthPurpose,
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
        variant === 'posterFade' && styles.mediaFramePosterFade,
        widthPurpose === 'posterHero' && styles.mediaFrameWidthPosterHero,
        className,
      )}
      style={{
        aspectRatio,
        ...(variant === 'posterFade' && backdropImage ? { '--media-frame-backdrop-image': `url("${backdropImage}")` } : {}),
        ...style,
      } as CSSProperties}
    >
      {children}
      {cornerBadge ? <div className={styles.mediaFrameCorner}>{cornerBadge}</div> : null}
      {bottomBadge ? <div className={styles.mediaFrameBottom}>{bottomBadge}</div> : null}
    </div>
  )
}
