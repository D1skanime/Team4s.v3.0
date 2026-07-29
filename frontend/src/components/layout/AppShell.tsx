'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Trophy,
  UserCircle,
  Users,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui'
import { getFocusableElements } from '@/components/media/crop/mediaCropA11y'
import { useLogoutAuthSession } from '@/lib/useAuthSession'

import styles from './AppShell.module.css'

type AppShellMode = 'authenticated' | 'anonymous' | 'loading'

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

type AppShellMembership = {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
}

export interface AppShellProps {
  mode?: AppShellMode
  currentPath?: string
  user?: AppShellUser | null
  memberships?: AppShellMembership[]
  canAccessAdmin?: boolean
  hasMemberProfile?: boolean
  /**
   * Authoritative project-eligibility signal (D-06/D-09), sourced from the own-profile
   * aggregate's has_project_assignments. "Meine Projekte" only appears when this AND
   * hasMemberProfile are both true — has_member_profile alone is never sufficient.
   */
  hasProjectAssignments?: boolean
  children: ReactNode
}

function isCurrent(currentPath: string | undefined, href: string): boolean {
  return currentPath === href || Boolean(currentPath?.startsWith(`${href}/`))
}

function AppShellNavItemView({
  item,
  onActivate,
}: {
  item: AppShellNavItem
  /** Shared drawer-close seam (D-24): closes on first-tap activation. */
  onActivate?: () => void
}) {
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
      onClick={onActivate}
    >
      {content}
    </Link>
  )
}

function AppShellNavGroups({
  currentPath,
  memberships = [],
  canAccessAdmin,
  hasMemberProfile,
  hasProjectAssignments,
  onNavigate,
}: {
  currentPath?: string
  memberships?: AppShellMembership[]
  canAccessAdmin: boolean
  hasMemberProfile: boolean
  hasProjectAssignments: boolean
  onNavigate?: () => void
}) {
  const publicItems: AppShellNavItem[] = [
    { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
    { label: 'Suche', href: '/suche', icon: <Search size={17} />, current: isCurrent(currentPath, '/suche') },
    { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
    { label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
  ]
  const adminItems: AppShellNavItem[] = canAccessAdmin
    ? [{ label: 'Verwaltung', href: '/admin', icon: <ShieldCheck size={17} />, current: isCurrent(currentPath, '/admin') }]
    : []
  // D-17: "Mein Account"/"Mein Profil" is the one canonical Account destination —
  // the former duplicate "Account & Sicherheit" settings entry (same /me/profile
  // href) has been removed rather than kept as a second link to the same route.
  const fixedMyItems: AppShellNavItem[] = [
    { label: hasMemberProfile ? 'Mein Profil' : 'Mein Account', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
    // D-10: Dashboard is unconditional for every authenticated user, unlike
    // "Meine Projekte" below which stays gated on hasMemberProfile/hasProjectAssignments.
    { label: 'Dashboard', href: '/me/dashboard', icon: <LayoutDashboard size={17} />, current: isCurrent(currentPath, '/me/dashboard') },
  ]
  // D-06/D-09: "Meine Projekte" requires a verified Member AND at least one real
  // project/contribution assignment — has_member_profile alone must never surface it.
  if (hasMemberProfile && hasProjectAssignments) {
    fixedMyItems.push({ label: 'Meine Projekte', href: '/me/contributions', icon: <Compass size={17} />, current: isCurrent(currentPath, '/me/contributions') })
  }
  const myItems: AppShellNavItem[] = fixedMyItems
  const groups = [
    { label: 'Public-Bereich', items: publicItems },
    { label: 'Verwaltung', items: adminItems },
    { label: 'Mein Bereich', items: myItems },
  ].filter((group) => group.items.length > 0)

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className={styles.navGroup}>
          <p className={styles.navGroupLabel}>{group.label}</p>
          {group.items.map((item) => <AppShellNavItemView key={item.label} item={item} onActivate={onNavigate} />)}
        </div>
      ))}
      {memberships.length > 0 ? (
        <div className={styles.navGroup}>
          <p className={styles.navGroupLabel}>Meine Gruppen</p>
          {memberships.map((membership) => {
            const href = `/admin/fansubs/${membership.fansub_group_id}/edit`

            return (
              <Link
                key={membership.fansub_group_id}
                href={href}
                className={`${styles.navItem} ${isCurrent(currentPath, href) ? styles.navItemCurrent : ''}`}
                aria-current={isCurrent(currentPath, href) ? 'page' : undefined}
                onClick={onNavigate}
              >
                <span className={styles.navIcon} aria-hidden="true"><Users size={17} /></span>
                <span>{membership.fansub_group_name}</span>
              </Link>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

function AppShellAnonNavGroups({
  currentPath,
  onNavigate,
}: {
  currentPath?: string
  onNavigate?: () => void
}) {
  const publicItems: AppShellNavItem[] = [
    { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
    { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
    { label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
    { label: 'Suche', href: '/suche', icon: <Search size={17} />, current: isCurrent(currentPath, '/suche') },
  ]

  return (
    <div className={styles.navGroup}>
      <p className={styles.navGroupLabel}>Entdecken</p>
      {publicItems.map((item) => <AppShellNavItemView key={item.label} item={item} onActivate={onNavigate} />)}
    </div>
  )
}

function DrawerAnonymousFooter() {
  return (
    <footer className={styles.anonFooter}>
      <Link href="/login" className={styles.btnPrimary}>
        Anmelden
      </Link>
    </footer>
  )
}

/**
 * Neutraler Ladezustand für die Navigation: weder Login-Aufruf noch fertige
 * Konto-Identität. Wird gerendert solange Session-Initialisierung, -Refresh
 * oder Account-/Profil-Laden noch nicht abgeschlossen sind (D-18) — verhindert,
 * dass Login-Formular und fertige Accountnavigation widersprüchlich gleichzeitig
 * erscheinen.
 */
function DrawerLoadingFooter() {
  return (
    <footer className={styles.anonFooter} aria-live="polite">
      <span className={styles.loadingFooterText}>Anmeldung wird geprüft…</span>
    </footer>
  )
}

function DrawerUserFooter({
  user,
  isLoggingOut,
  onLogout,
}: {
  user?: AppShellUser | null
  isLoggingOut: boolean
  onLogout: () => void
}) {
  const displayName = user?.displayName || 'Angemeldeter Account'
  const email = user?.email || 'Team4s Account'

  return (
    <footer className={styles.userFooter}>
      <div className={styles.userIdentity}>
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={`Avatar von ${user?.displayName || 'Account'}`}
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
      </div>
      <button
        type="button"
        className={styles.logoutButton}
        disabled={isLoggingOut}
        aria-busy={isLoggingOut}
        onClick={onLogout}
      >
        <LogOut size={16} aria-hidden="true" />
        <span>{isLoggingOut ? 'Melde ab...' : 'Abmelden'}</span>
      </button>
    </footer>
  )
}

export function AppShell({
  mode = 'authenticated',
  currentPath,
  user,
  memberships = [],
  canAccessAdmin = false,
  hasMemberProfile = false,
  hasProjectAssignments = false,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const logoutAuthSession = useLogoutAuthSession()
  const router = useRouter()
  const drawerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // D-24: ref-based guard blocks a second logout activation even within the
  // same synchronous tick, before isLoggingOut state visibly updates.
  const loggingOutRef = useRef(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // D-24: close a stale open drawer on any route change (incl. browser
  // back/forward). Adjusted during render per React's "adjusting state when
  // a prop changes" pattern instead of an effect, avoiding a cascading render.
  const [renderedPath, setRenderedPath] = useState(currentPath)
  if (currentPath !== renderedPath) {
    setRenderedPath(currentPath)
    if (drawerOpen) setDrawerOpen(false)
  }

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

  function handleLogout() {
    // Single-shot (D-24): the ref flips synchronously so a second click
    // before re-render is still blocked.
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    setIsLoggingOut(true)
    setDrawerOpen(false)
    // logoutAuthSession() clears the local session synchronously before its
    // first await, so navigating right away stays consistent with that
    // cleanup and the best-effort async Keycloak logout initiation.
    void logoutAuthSession()
      .catch(() => undefined)
      .finally(() => {
        loggingOutRef.current = false
        setIsLoggingOut(false)
      })
    router.replace('/login')
  }

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
            <span>{mode === 'authenticated' && hasMemberProfile ? 'Member Hub' : 'Plattform'}</span>
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
            <span>{mode === 'authenticated' && hasMemberProfile ? 'Member Hub' : 'Plattform'}</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label={drawerOpen ? 'Hauptnavigation mobil' : 'Hauptnavigation'}>
          {mode === 'authenticated' ? (
            <AppShellNavGroups
              currentPath={currentPath}
              memberships={memberships}
              canAccessAdmin={canAccessAdmin}
              hasMemberProfile={hasMemberProfile}
              hasProjectAssignments={hasProjectAssignments}
              onNavigate={closeDrawer}
            />
          ) : (
            <AppShellAnonNavGroups currentPath={currentPath} onNavigate={closeDrawer} />
          )}
        </nav>

        {mode === 'authenticated' ? (
          <DrawerUserFooter user={user} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
        ) : mode === 'loading' ? (
          <DrawerLoadingFooter />
        ) : (
          <DrawerAnonymousFooter />
        )}
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
