import Link from 'next/link'
import { Compass, Search, Trophy, UserCircle, Users, type LucideIcon } from 'lucide-react'

import { Badge, Card, SectionHeader } from '@/components/ui'

import styles from './QuickLinksSection.module.css'

// Pitfall 3 (116-RESEARCH.md): /suche (Phase 115) wurde zum Ausfuehrungszeitpunkt von
// Plan 116-05 per `ls frontend/src/app/suche` live geprueft und existiert bereits im Code
// (Phase 115 ist vor 116 gelandet). Statische Boolean-Literal-Konstante -- keine
// Runtime-Fetch-Pruefung einer Route -- mirrors AppShell's bestehendes
// disabled/badge-Muster fuer unfertige Features.
export const SEARCH_ROUTE_AVAILABLE = true

interface QuickLinkTile {
  key: string
  label: string
  href: string
  Icon: LucideIcon
  primary?: boolean
}

// D-06: feste Reihenfolge, Icons identisch zu AppShell.tsx fuer dieselben Ziele.
const TILES: QuickLinkTile[] = [
  { key: 'anime', label: 'Anime entdecken', href: '/anime', Icon: Compass, primary: true },
  { key: 'ranking', label: 'Rangliste', href: '/members/ranking', Icon: Trophy },
  { key: 'fansubs', label: 'Fansub-Gruppen', href: '/fansubs', Icon: Users },
  { key: 'suche', label: 'Suche', href: '/suche', Icon: Search },
  { key: 'profile', label: 'Mein Profil', href: '/me/profile', Icon: UserCircle },
]

export interface QuickLinksSectionProps {
  /**
   * Testbarer Override fuer SEARCH_ROUTE_AVAILABLE (Default). page.tsx ruft diese Komponente
   * ohne Prop auf und erhaelt damit immer die statische, live geprueft Modulkonstante.
   */
  searchRouteAvailable?: boolean
}

/**
 * "Schnellzugriffe" (D-06): 5 feste Sprungziel-Kacheln. Die "Suche"-Kachel wird niemals als
 * Link gerendert, wenn /suche zum Ausfuehrungszeitpunkt nicht existiert (Pitfall 3) --
 * stattdessen ein nicht-interaktives, aria-disabled-Element mit Badge "bald", exakt das
 * bestehende AppShell-Muster fuer unfertige Features.
 */
export function QuickLinksSection({ searchRouteAvailable = SEARCH_ROUTE_AVAILABLE }: QuickLinksSectionProps = {}) {
  return (
    <section>
      <SectionHeader title="Schnellzugriffe" />
      <div className={styles.grid}>
        {TILES.map((tile) => {
          const Icon = tile.Icon
          const tileClassName = tile.primary ? `${styles.tile} ${styles.tileAccent}` : styles.tile

          if (tile.key === 'suche' && !searchRouteAvailable) {
            return (
              <Card key={tile.key} variant="interactive" className={tileClassName} aria-disabled="true">
                <span className={styles.tileIcon} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className={styles.tileLabel}>{tile.label}</span>
                <Badge variant="muted">bald</Badge>
              </Card>
            )
          }

          return (
            <Card key={tile.key} variant="interactive" className={tileClassName}>
              <Link className={styles.tileLink} href={tile.href}>
                <span className={styles.tileIcon} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className={styles.tileLabel}>{tile.label}</span>
              </Link>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
