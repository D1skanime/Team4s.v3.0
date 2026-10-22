import styles from './PublicHeaderBackdrop.module.css'

interface PublicHeaderBackdropProps {
  imageUrl: string | null | undefined
  className?: string
}

/**
 * Gemeinsamer Full-Bleed-Kopf-Hintergrund fuer oeffentliche Gruppen-, Projekt- und
 * Release-Seiten (quick-261022-g17). Rendert NUR das Hintergrund-Element
 * (position:absolute, volle Bildschirmbreite via calc(50% - 50vw)/100vw).
 *
 * WICHTIG: kein Vorfahre dieses Elements bis zu <body> darf overflow-x:clip/hidden
 * setzen -- sonst greift die Clip-Ancestor-Falle und der Hintergrund wird an der
 * Inhaltskante abgeschnitten. Scrollbar-Sicherheit kommt global aus
 * body { overflow-x: clip } (frontend/src/styles/globals.css).
 *
 * className ist fuer seiten-spezifisches Tuning gedacht (top/bottom/filter/transform/
 * opacity/background-size/background-position/::after-Verlauf unterscheiden sich je
 * Seite). .backdrop selbst setzt top/bottom/background-size/background-position NICHT,
 * jede *Tuning-Klasse muss sie selbst setzen.
 */
export function PublicHeaderBackdrop({ imageUrl, className }: PublicHeaderBackdropProps) {
  if (!imageUrl) return null
  return (
    <div
      data-testid="public-header-backdrop"
      className={`${styles.backdrop} ${className ?? ''}`.trim()}
      style={{ backgroundImage: `url("${imageUrl}")` }}
      aria-hidden="true"
    />
  )
}
