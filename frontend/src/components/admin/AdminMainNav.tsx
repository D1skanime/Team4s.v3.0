'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui'
import styles from './AdminMainNav.module.css'

const ADMIN_NAV_LINKS = [
  { label: 'Benutzer', href: '/admin/users' },
  { label: 'Gruppen', href: '/admin/groups' },
  { label: 'Rollen', href: '/admin/roles' },
  { label: 'Claims', href: '/admin/claims' },
  // 191-09 (D-01/D-07): eigene Seite statt eines Filters in /admin/claims, weil die
  // Datenquelle eine komplett andere ist — Claims speisen sich aus member_claims
  // (historische Mitgliedsidentität bestätigen), während diese Liste serverseitig
  // bereits auf requested_role_code = 'fansub_lead'-Hinweise aus der neuen
  // fansub_group_hints-Tabelle vorgefiltert ist. Es gibt kein gemeinsames
  // Datenmodell, über das ein Filter innerhalb von /admin/claims funktionieren könnte.
  { label: 'Hinweise (Leitung)', href: '/admin/fansub-group-hints' },
  { label: 'Änderungen', href: '/admin/changes' },
]

function belongsToRightsModule(pathname: string | null) {
  return Boolean(pathname && ADMIN_NAV_LINKS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)))
}

export function AdminMainNav() {
  const pathname = usePathname()
  if (!belongsToRightsModule(pathname)) return null

  return <nav className={styles.nav} aria-label="Benutzer- und Rechte-Navigation">{ADMIN_NAV_LINKS.map((link) => {
    const active = pathname === link.href || pathname?.startsWith(`${link.href}/`)
    return <Button key={link.href} href={link.href} variant="ghost" size="sm" className={active ? styles.navLinkActive : styles.navLink} aria-current={active ? 'page' : undefined}>{link.label}</Button>
  })}</nav>
}