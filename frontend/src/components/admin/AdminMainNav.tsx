'use client'

import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui'

import styles from './AdminMainNav.module.css'

/**
 * D-01: die eine persistente Hauptnavigation für den gesamten Admin-Bereich.
 * Verlinkt jeden von Phase 138 gebauten und bestehenden Top-Level-Bereich —
 * Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen (D-01,
 * exakte Reihenfolge/Beschriftung locked).
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
  { label: 'Capabilities', href: '/admin/role-capabilities' },
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
