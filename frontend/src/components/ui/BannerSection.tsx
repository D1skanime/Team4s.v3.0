import type { ReactNode } from 'react'

import { classNames } from './classNames'
import { ResponsiveImage } from './ResponsiveImage'
import styles from './BannerSection.module.css'

export interface BannerSectionProps {
  imageUrl: string | null | undefined
  imageAlt: string
  /** 'anime' reproduziert die bisherige, schwächer kontrastierte Backdrop-Rezeptur der
   *  Anime-Detailseite (schwächere Unschärfe/Skalierung, keine brightness/saturate-Abweichung
   *  vom Originalbild) inklusive einer vertikalen Ausblendmaske zum Seitenhintergrund -- für
   *  Aufrufer, die exakt diese frühere Optik brauchen. Ohne Angabe bleibt die stärker
   *  abgedunkelte/entsättigte Standardvariante (FansubHeroSection-Rezeptur) aktiv. */
  variant?: 'default' | 'anime'
  /** Deutlich dunklerer, flächiger Scrim (~88% Deckkraft, FansubHeroSection-Rezeptur) für
   *  Textblöcke, die direkt auf dem Banner sitzen und WCAG-AA-Kontrast brauchen. Ohne Angabe
   *  bleibt der moderate Standard-Scrim aktiv (nur Verdunklung des Hintergrundbilds selbst). */
  withTextScrim?: boolean
  /** Abzeichen (z. B. ein Status-Badge) in einer eigenen Schicht über dem Scrim. */
  badge?: ReactNode
  /** Streckt den Hintergrund-/Scrim-Bereich exakt auf die Höhe des positionierten Vorfahren
   *  (CSS `inset:0`) statt der festen `--banner-height`/`--banner-height-mobile`-Werte der echten
   *  Seiten-Hero-Sektion -- für Einsatzorte mit unbekannter, vom Inhalt abhängiger Höhe (z. B.
   *  eine Storybook-Vorschau-Bühne hinter unterschiedlich hohem Beispielinhalt). */
  fillHeight?: boolean
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
  variant = 'default',
  withTextScrim = false,
  badge,
  fillHeight = false,
  children,
  className,
}: BannerSectionProps) {
  return (
    <div className={classNames(styles.bannerSection, fillHeight && styles.bannerSectionFillHeight, className)}>
      {imageUrl ? (
        <div className={classNames(styles.backdropWrapper, variant === 'anime' && styles.backdropWrapperAnime)} aria-hidden="true">
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
