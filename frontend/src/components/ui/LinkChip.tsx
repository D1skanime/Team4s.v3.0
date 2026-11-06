import Link from 'next/link'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './LinkChip.module.css'

export interface LinkChipProps {
  href: string
  children: ReactNode
  icon?: ReactNode
  count?: number
  /** 'glass' (Standard) ist der hellere, durchscheinende Chip-Ton für Glasflächen (z. B. die
   *  Poster-Spalte einer Detailseite); 'scrim' ist der dunklere, blickdichtere Ton für fast
   *  transparente Flächen, in denen ein heller Chip selbst keinen ausreichenden Eigenkontrast
   *  mehr hätte (z. B. der auslaufende untere Bereich der Info-Karte). Beide sind offizielle,
   *  tokenbasierte Erscheinungen desselben Bausteins -- keine optische Vereinheitlichung. */
  tone?: 'glass' | 'scrim'
  className?: string
}

/**
 * Link in Chip-Form für Filter-/Verschlagwortungs-Listen (z. B. Genres/Tags einer Anime-
 * Detailseite). Löst die bislang mehrfach unabhängig gebauten Chip-Links (genreChip/tagChip/
 * otherGroupChip) in EINEN Grundbaustein auf -- API bewusst allgemein gehalten (href/children/
 * icon/count/tone), damit künftige Fansub-/Release-Seiten denselben Baustein direkt wiederverwenden
 * können, ohne erneut rgba-Literale zu erfinden. Rendert bewusst ohne Import einer anderen
 * katalogisierten `components/ui`-Komponente (Grundbaustein-Kriterium, siehe catalogTaxonomy.test.ts).
 */
export function LinkChip({ href, children, icon, count, tone = 'glass', className }: LinkChipProps) {
  return (
    <Link
      href={href}
      className={classNames(
        styles.linkChip,
        tone === 'scrim' ? styles.linkChipScrim : styles.linkChipGlass,
        className,
      )}
    >
      {icon ? <span className={styles.linkChipIcon} aria-hidden="true">{icon}</span> : null}
      {children}
      {typeof count === 'number' ? <span className={styles.linkChipCount}>{count}</span> : null}
    </Link>
  )
}
