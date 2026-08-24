'use client'

import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui'

import styles from './AdminMainNav.module.css'

/**
 * D-01: die eine persistente Hauptnavigation für den gesamten Admin-Bereich.
 * Verlinkt jeden Top-Level-Bereich — Benutzer | Gruppen | Rollen | Claims |
 * Änderungen (fünf statt sechs Bereiche, exakte Reihenfolge/Beschriftung locked).
 *
 * Nachtrag 2026-08-24 (D-01, Quick 260824-ek3, Sketch 005): der eigenständige
 * "Capabilities"-Eintrag entfällt -- die Standardrechte-Matrix lebt jetzt als
 * zweiter Tab im Rollen-Arbeitsbereich (/admin/roles). Siehe 138-CONTEXT.md
 * Abschnitt 8 für die vollständige Begründung.
 *
 * Nutzt bewusst `Button`-Primitives statt eines selbstgebauten `<nav>`/`<ul>`
 * (138-15-PLAN.md Interfaces-Block) — `Tabs` (@/components/ui) unterstützt
 * keine Link-basierte Navigation (nur intern verwaltetes Panel-Switching),
 * daher hier eine Button-Reihe mit Active-State-Indikator.
 */

interface AdminNavLink {
  label: string
  href: string
}

const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: 'Benutzer', href: '/admin/users' },
  { label: 'Gruppen', href: '/admin/fansubs' },
  { label: 'Rollen', href: '/admin/roles' },
  { label: 'Claims', href: '/admin/claims' },
  { label: 'Änderungen', href: '/admin/changes' },
]

function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminMainNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav} aria-label="Admin-Hauptnavigation">
      {ADMIN_NAV_LINKS.map((link) => {
        const active = isActiveLink(pathname, link.href)
        return (
          <Button
            key={link.href}
            href={link.href}
            variant="ghost"
            size="sm"
            className={active ? styles.navLinkActive : styles.navLink}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Button>
        )
      })}
    </nav>
  )
}
