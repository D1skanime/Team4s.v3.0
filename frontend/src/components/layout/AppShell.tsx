'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
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
import { getFocusableElements } from '@/components/media/crop/mediaCropA11y'

import styles from './AppShell.module.css'

type AppShellMode = 'authenticated' | 'anonymous'

type AppShellUser = {
  displayName?: string | null
  email?: string | null
  avatarUrl?: string | null
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

function AppShellAnonNavGroups({ currentPath }: { currentPath?: string }) {
  const publicItems: AppShellNavItem[] = [
    { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
    { label: 'Fansub-Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
    { label: 'Suche', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
  ]

  return (
    <div className={styles.navGroup}>
      <p className={styles.navGroupLabel}>Entdecken</p>
      {publicItems.map((item) => <AppShellNavItemView key={item.label} item={item} />)}
    </div>
  )
}

function DrawerAnonymousFooter() {
  return (
    <footer className={styles.anonFooter}>
      <Link href="/auth" className={styles.btnPrimary}>
        Anmelden
      </Link>
      <Link href="/auth/register" className={styles.btnSecondary}>
        Registrieren
      </Link>
    </footer>
  )
}

function DrawerUserFooter({ user }: { user?: AppShellUser | null }) {
  const displayName = user?.displayName || 'Angemeldetes Mitglied'
  const email = user?.email || 'Team4s Account'

  return (
    <footer className={styles.userFooter}>
      {user?.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={`Avatar von ${user?.displayName || 'Mitglied'}`}
          className={styles.userAvatarImg}
          width={36}
          height={36}
          unoptimized
        />
      ) : (
        <span className={styles.userAvatar} aria-hidden="true">
          {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
        </span>
      )}
      <div>
        <strong>{displayName}</strong>
        <span>{email}</span>
      </div>
    </footer>
  )
}

export function AppShell({
  mode = 'authenticated',
  currentPath,
  user,
  canAccessAdmin = false,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!drawerOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = getFocusableElements(drawerRef.current)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  return (
    <div className={styles.shell} data-shell-mode={mode}>
      <div
        className={styles.edgeStrip}
        role="button"
        tabIndex={0}
        aria-expanded={drawerOpen}
        aria-controls="team4s-nav-drawer"
        aria-label="Menü öffnen"
        onMouseEnter={() => setDrawerOpen(true)}
        onFocus={() => setDrawerOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') setDrawerOpen(true)
        }}
      />
      <header className={styles.mobileHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>T4</span>
          <div>
            <strong>Team4s</strong>
            <span>{mode === 'authenticated' ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>
        <button
          ref={triggerRef}
          type="button"
          className={styles.mobileNavButton}
          aria-expanded={drawerOpen}
          aria-controls="team4s-nav-drawer"
          onClick={() => setDrawerOpen((current) => !current)}
        >
          {drawerOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>Navigation</span>
        </button>
      </header>
      {drawerOpen ? (
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="Drawer schließen"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside
        id="team4s-nav-drawer"
        ref={drawerRef}
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
        aria-label="Team4s Navigation"
        onMouseLeave={() => setDrawerOpen(false)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDrawerOpen(false)
          }
        }}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark}>T4</span>
          <div>
            <strong>Team4s</strong>
            <span>{mode === 'authenticated' ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label={drawerOpen ? 'Hauptnavigation mobil' : 'Hauptnavigation'}>
          {mode === 'anonymous' ? (
            <AppShellAnonNavGroups currentPath={currentPath} />
          ) : (
            <AppShellNavGroups currentPath={currentPath} canAccessAdmin={canAccessAdmin} />
          )}
        </nav>

        {mode === 'anonymous' ? <DrawerAnonymousFooter /> : <DrawerUserFooter user={user} />}
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
