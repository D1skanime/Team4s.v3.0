'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Compass,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  X,
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

function AppShellNavGroups({ currentPath, canAccessAdmin }: { currentPath?: string; canAccessAdmin: boolean }) {
  const publicItems: AppShellNavItem[] = [
    { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
    { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
  ]
  const adminItems: AppShellNavItem[] = canAccessAdmin
    ? [{ label: 'Verwaltung', href: '/admin', icon: <ShieldCheck size={17} />, current: isCurrent(currentPath, '/admin') }]
    : []
  const myItems: AppShellNavItem[] = [
    { label: 'Mein Profil', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
    { label: 'Meine Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
    { label: 'Meine Beiträge', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
  ]
  const settingsItems: AppShellNavItem[] = [
    { label: 'Account & Sicherheit', href: '/auth', icon: <Settings size={17} />, current: isCurrent(currentPath, '/auth') },
  ]
  const groups = [
    { label: 'Public-Bereich', items: publicItems },
    { label: 'Verwaltung', items: adminItems },
    { label: 'Mein Bereich', items: myItems },
    { label: 'Einstellungen', items: settingsItems },
  ].filter((group) => group.items.length > 0)

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className={styles.navGroup}>
          <p className={styles.navGroupLabel}>{group.label}</p>
          {group.items.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
        </div>
      ))}
    </>
  )
}

export function AppShell({
  mode = 'authenticated',
  currentPath,
  user,
  canAccessAdmin = false,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={styles.shell} data-shell-mode={mode}>
      <header className={styles.mobileHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>T4</span>
          <div>
            <strong>Team4s</strong>
            <span>{mode === 'authenticated' ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.mobileNavButton}
          aria-expanded={mobileNavOpen}
          aria-controls="team4s-mobile-nav"
          onClick={() => setMobileNavOpen((current) => !current)}
        >
          {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>Navigation</span>
        </button>
      </header>
      {mobileNavOpen ? (
        <nav
          id="team4s-mobile-nav"
          className={`${styles.mobileNav} ${styles.mobileNavOpen}`}
          aria-label="Hauptnavigation mobil"
        >
          <AppShellNavGroups currentPath={currentPath} canAccessAdmin={canAccessAdmin} />
        </nav>
      ) : null}
      <aside className={styles.sidebar} aria-label="Team4s Navigation">
        <div className={styles.brand}>
          <span className={styles.brandMark}>T4</span>
          <div>
            <strong>Team4s</strong>
            <span>{mode === 'authenticated' ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Hauptnavigation">
          <AppShellNavGroups currentPath={currentPath} canAccessAdmin={canAccessAdmin} />
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
