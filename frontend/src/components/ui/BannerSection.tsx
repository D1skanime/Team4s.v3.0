import type { ReactNode } from 'react'

import { classNames } from './classNames'
import { ResponsiveImage } from './ResponsiveImage'
import styles from './BannerSection.module.css'

export interface BannerSectionProps {
  imageUrl: string | null | undefined
  imageAlt: string
  /** Deutlich dunklerer, flächiger Scrim (~88% Deckkraft, FansubHeroSection-Rezeptur) für
   *  Textblöcke, die direkt auf dem Banner sitzen und WCAG-AA-Kontrast brauchen. Ohne Angabe
   *  bleibt der moderate Standard-Scrim aktiv (nur Verdunklung des Hintergrundbilds selbst). */
  withTextScrim?: boolean
  /** Abzeichen (z. B. ein Status-Badge) in einer eigenen Schicht über dem Scrim. */
  badge?: ReactNode
  /** Rendert IMMER, unabhängig von `imageUrl` -- z. B. `AnimeBackdropRotator` als eigenständiger
   *  Fachbaustein, der innerhalb dieses Abschnitts komponiert wird (kein Ersatz). */
  children?: ReactNode
  className?: string
}

/**
 * Abschnitt mit Bannerbild-Hintergrund: unscharfer, abgedunkelter Backdrop (WCAG-AA-Scrim nach
 * dem in FansubHeroSection bewährten Muster) + optionales Abzeichen + Komposition-Slot für
 * Fachbausteine wie `AnimeBackdropRotator`. Übernimmt die bisherige Positionierungsrolle der
 * seiten-eigenen `.heroBanner`-Box auf der Anime-Detailseite, als wiederverwendbarer globaler
 * Baustein für künftige öffentliche Seiten mit derselben Optik (z. B. Fansub-Projektseiten).
 * Besteht aus `ResponsiveImage` für das Hintergrundbild; das Bild+Scrim rendert nur, wenn
 * tatsächlich eine `imageUrl` vorhanden ist, `children` rendert unabhängig davon immer.
 */
export function BannerSection({
  imageUrl,
  imageAlt,
  withTextScrim = false,
  badge,
  children,
  className,
}: BannerSectionProps) {
  return (
    <div className={classNames(styles.bannerSection, className)}>
      {imageUrl ? (
        <div className={styles.backdropWrapper} aria-hidden="true">
          <ResponsiveImage
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="100vw"
            className={styles.backdropImage}
            unoptimized
          />
        </div>
      ) : null}
      <div className={classNames(styles.scrim, withTextScrim && styles.scrimStrong)} aria-hidden="true" />
      {badge ? <div className={styles.badge}>{badge}</div> : null}
      {children}
    </div>
  )
}
