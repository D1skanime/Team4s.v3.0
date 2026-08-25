'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui'
import styles from './AdminMainNav.module.css'

const ADMIN_NAV_LINKS = [
  { label: 'Benutzer', href: '/admin/users' },
  { label: 'Gruppen', href: '/admin/groups' },
  { label: 'Rollen', href: '/admin/roles' },
  { label: 'Capabilities', href: '/admin/role-capabilities' },
  { label: 'Claims', href: '/admin/claims' },
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