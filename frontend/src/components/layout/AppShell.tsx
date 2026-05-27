import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Compass,
  LayoutDashboard,
  Lock,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui'

import styles from './AppShell.module.css'

type AppShellMode = 'authenticated' | 'anonymous'

type AppShellUser = {
  displayName?: string | null
  email?: string | null
}

type AppShellNavItem = {
  label: string
  href?: string
  icon: ReactNode
  current?: boolean
  disabled?: boolean
  badge?: string
}

export interface AppShellProps {
  mode?: AppShellMode
  currentPath?: string
  user?: AppShellUser | null
  canAccessAdmin?: boolean
  children: ReactNode
}

function isCurrent(currentPath: string | undefined, href: string): boolean {
  return currentPath === href || Boolean(currentPath?.startsWith(`${href}/`))
}

function AppShellNavItemView({ item }: { item: AppShellNavItem }) {
  const content = (
    <>
      <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge ? <Badge variant="muted">{item.badge}</Badge> : null}
    </>
  )

  if (item.disabled || !item.href) {
    return (
      <span className={`${styles.navItem} ${styles.navItemDisabled}`} aria-disabled="true">
        {content}
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${item.current ? styles.navItemCurrent : ''}`}
      aria-current={item.current ? 'page' : undefined}
    >
      {content}
    </Link>
  )
}

export function AppShell({
  mode = 'authenticated',
  currentPath,
  user,
  canAccessAdmin = false,
  children,
}: AppShellProps) {
  const publicItems: AppShellNavItem[] = [
    { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
    { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
  ]
  const adminItems: AppShellNavItem[] = canAccessAdmin
    ? [{ label: 'Verwaltung', href: '/admin', icon: <ShieldCheck size={17} />, current: isCurrent(currentPath, '/admin') }]
    : [{ label: 'Verwaltung', icon: <Lock size={17} />, disabled: true, badge: 'geschützt' }]
  const myItems: AppShellNavItem[] = [
    { label: 'Mein Profil', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
    { label: 'Meine Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
    { label: 'Meine Beiträge', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
  ]
  const settingsItems: AppShellNavItem[] = [
    { label: 'Account & Sicherheit', href: '/auth', icon: <Settings size={17} />, current: isCurrent(currentPath, '/auth') },
  ]

  return (
    <div className={styles.shell} data-shell-mode={mode}>
      <aside className={styles.sidebar} aria-label="Team4s Navigation">
        <div className={styles.brand}>
          <span className={styles.brandMark}>T4</span>
          <div>
            <strong>Team4s</strong>
            <span>{mode === 'authenticated' ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Hauptnavigation">
          <div className={styles.navGroup}>
            <p className={styles.navGroupLabel}>Public-Bereich</p>
            {publicItems.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
          </div>
          <div className={styles.navGroup}>
            <p className={styles.navGroupLabel}>Verwaltung</p>
            {adminItems.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
          </div>
          <div className={styles.navGroup}>
            <p className={styles.navGroupLabel}>Mein Bereich</p>
            {myItems.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
          </div>
          <div className={styles.navGroup}>
            <p className={styles.navGroupLabel}>Einstellungen</p>
            {settingsItems.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
          </div>
        </nav>

        <footer className={styles.userFooter}>
          <span className={styles.userAvatar} aria-hidden="true">
            {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user?.displayName || 'Angemeldetes Mitglied'}</strong>
            <span>{user?.email || 'Team4s Account'}</span>
          </div>
        </footer>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
