'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern'

import {
  LOCAL_IMAGE_PATTERNS,
  FIXED_REMOTE_IMAGE_URLS,
  configuredApiMediaPatterns,
} from '@/lib/images/publicImagePatterns'
import { classNames } from './classNames'
import styles from './ResponsiveImage.module.css'

const REMOTE_IMAGE_PATTERNS = [
  ...FIXED_REMOTE_IMAGE_URLS.map((url) => new URL(url)),
  ...configuredApiMediaPatterns(process.env.NEXT_PUBLIC_API_URL),
]

/**
 * Spiegelt next/images EIGENE src-Validierung (dieselbe Prüfung, die next/dist/shared/
 * lib/image-loader.js's `defaultLoader` während des SSR bereits durchführt) über dieselben
 * images.localPatterns/remotePatterns, die diese App in next.config.mjs konfiguriert, via das
 * geteilte `publicImagePatterns`-Datenmodul -- eine einzige Quelle der Wahrheit, nie eine
 * zweite, von Hand gepflegte Liste.
 *
 * Bestehende Daten können Bildpfade außerhalb der konfigurierten Erlaubnisliste enthalten
 * (flache Alt-Pfade wie `/media/image_*.jpg`, `/api/v1/media/files/...`, der Jellyfin-Proxy
 * `/api/v1/media/image?...`) -- vor einem Datenabgleich und potenziell erneut, sobald ein
 * nicht migrierter Pfad durchrutscht. Next.js' eigene Validierung wirft dafür einen Fehler
 * (E426/E231), der während des SSR unbehandelt die gesamte Seite mit einem HTTP-500 zum
 * Absturz bringt. Ein einzelnes nicht passendes Bild darf niemals eine ganze öffentliche
 * Route lahmlegen -- deshalb läuft diese Prüfung ZUERST und fällt auf unoptimiertes Rendern
 * zurück (das Bild lädt direkt, ohne Größenänderung), statt next/image werfen zu lassen.
 */
export function isConfiguredForImageOptimization(src: string): boolean {
  if (src.startsWith('/')) {
    return hasLocalMatch(LOCAL_IMAGE_PATTERNS, src)
  }

  try {
    return hasRemoteMatch([], REMOTE_IMAGE_PATTERNS, new URL(src))
  } catch {
    return false
  }
}

export type ResponsiveImageProps = Omit<ImageProps, 'src' | 'unoptimized'> & {
  src: string
  /** Erzwingt den unoptimierten Pfad unabhängig von der automatischen Pfad-Prüfung -- NICHT für
   *  einen Optimierer-Fehler-Rückfall gedacht (der wurde bewusst entfernt, siehe Kommentar unten),
   *  sondern für Fälle, in denen der Aufrufer eine Information hat, die aus der reinen Quell-URL
   *  nicht ableitbar ist: ein animiertes GIF/WebP, dessen Animation der Next.js-Optimierer beim
   *  Neukodieren zerstören würde (z. B. MemberAvatarCard, das Mime-Type/Dateiendung des
   *  tatsächlich gespeicherten Mediums kennt). Ohne Angabe bleibt die automatische Prüfung
   *  unverändert maßgeblich. */
  unoptimized?: boolean
  /** Rundet das Bild und beschneidet es wie ein kleines, randloses Vorschau-/Miniaturbild (z. B.
   *  das Cover-Bild einer schwebenden Randnavigations-Vorschaukarte) -- reproduziert exakt
   *  `border-radius: var(--radius-sm); object-fit: cover;`, ohne dass der Aufrufer selbst eine
   *  eigene `border-radius`-Regel schreiben muss. Ohne Angabe bleibt das Bild wie bisher
   *  ungerundet (Zero-Pixel-Diff). */
  roundedThumbnail?: boolean
  /** Streckt das Bild auf die volle Breite seines Containers und skaliert die Höhe proportional
   *  mit (z. B. ein breites Banner-Bild über einer Info-Karte) -- reproduziert exakt
   *  `display: block; width: 100%; height: auto; object-fit: cover;`, ohne dass der Aufrufer
   *  selbst eine eigene `width`-Regel schreiben muss. `display: block` hebt dabei den
   *  browserüblichen "Baseline-Nachlauf" unterhalb eines inline gerenderten Bildes auf. Ohne
   *  Angabe bleibt das Bild wie bisher auf seiner intrinsischen Breite/Höhe (Zero-Pixel-Diff). */
  fillWidth?: boolean
}

/**
 * Läuft immer durch den Next.js-Bildoptimierer, begrenzt durch next.config.mjs'
 * images.deviceSizes/imageSizes-Stufenleiter -- denselben begrenzten Pfad, der auch im
 * Erfolgsfall genutzt wird. Ein früherer Fallback bei Optimierer-Fehlern entkam dieser
 * Begrenzung bedingungslos, indem er dieselbe Quelle erneut mit unoptimized={true} anfragte
 * und dabei die rohe, unverkleinerte Originaldatei unbegrenzt übertrug. Diese Ausweichmöglichkeit
 * wurde entfernt: Es gibt keinen kleineren, selbst gehosteten Bildableger für diese Asset-Klasse
 * (kein Backend-Resize-Dienst), daher gibt es auch keinen sinnvollen begrenzten Wiederholungs-
 * versuch. `failedOptimizedSource`/`usingDisplayOriginal` werden weiterhin für Beobachtbarkeit/
 * Tests erfasst, steuern aber kein `unoptimized`, `src` oder einen Render-Zweig mehr --
 * width/height/fill und die umschließende CSS-Klasse bleiben in beiden Zuständen identisch,
 * es gibt also keinen Layout-Sprung und genau einen (folgenlosen) Zustandsübergang, nie eine
 * Wiederholungsschleife. Kann der Optimierer das Bild tatsächlich nicht liefern, greift das
 * native Standardverhalten des Browsers für fehlgeschlagene Bilder -- unverändert gegenüber
 * jedem anderen unbehandelten Bildfehler an anderer Stelle dieser Seite; kein neues eigenes
 * Fehler-Visual.
 */
export function ResponsiveImage({ src, alt, onError, unoptimized, roundedThumbnail = false, fillWidth = false, className, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src
  // usingDisplayOriginal wird nur für Beobachtbarkeit/Tests mitgeführt und bewusst nicht beim
  // Rendern unten gelesen.
  void usingDisplayOriginal

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      // Ohne roundedThumbnail/fillWidth bleibt className exakt der Aufrufer-Wert (auch
      // `undefined`) -- Zero-Pixel-Diff für jeden bestehenden Konsumenten, der diese Props
      // nicht setzt.
      className={
        roundedThumbnail || fillWidth
          ? classNames(roundedThumbnail && styles.roundedThumbnail, fillWidth && styles.fillWidth, className)
          : className
      }
      unoptimized={unoptimized ?? !isConfiguredForImageOptimization(src)}
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
