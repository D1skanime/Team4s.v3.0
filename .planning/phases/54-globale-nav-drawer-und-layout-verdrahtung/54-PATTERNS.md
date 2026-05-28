# Phase 54: Globale Nav Drawer und Layout Verdrahtung — Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 7
**Analogs found:** 7 / 7

---

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `frontend/src/components/layout/AppShell.tsx` | component (shell) | event-driven / request-response | `frontend/src/components/ui/Drawer.tsx` + eigene Datei | exact (eigene Datei, Erweiterung) |
| `frontend/src/components/layout/AppShell.module.css` | config (CSS Module) | — | `frontend/src/components/ui/ui.module.css` (Overlay/Drawer-Sektion) | role-match |
| `frontend/src/components/layout/AppShell.test.tsx` | test | — | eigene Datei (Erweiterung) | exact |
| `frontend/src/components/layout/AppShellClientWrapper.tsx` | component (wrapper) | request-response | `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` | role-match |
| `frontend/src/app/layout.tsx` | config (root layout) | — | eigene Datei (Erweiterung) | exact |
| `frontend/src/app/me/profile/page.tsx` | component (page) | CRUD | eigene Datei (Bereinigung) | exact |
| `frontend/src/app/dev/ui-system/page.tsx` | component (playground) | event-driven | eigene Datei (Erweiterung) | exact |

---

## Pattern Assignments

### `frontend/src/components/layout/AppShell.tsx` (component, event-driven)

**Analog:** eigene Datei (Zeilen 1–177 vollständig gelesen) + `frontend/src/components/ui/Drawer.tsx` für Overlay-Muster

**Imports-Muster** (aktuell Zeilen 1–19):
```tsx
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
```

**Erweiterung der Imports für Phase 54** — hinzuzufügen:
```tsx
import { useEffect, useRef, useCallback } from 'react'
import { getFocusableElements } from '@/components/media/crop/mediaCropA11y'
import { resolveApiUrl } from '@/lib/api'
```

**Bestehende Type-Definitionen** (Zeilen 21–43) — `AppShellUser` muss um `avatarUrl` erweitert werden:
```tsx
type AppShellUser = {
  displayName?: string | null
  email?: string | null
  // NEU hinzufügen:
  avatarUrl?: string | null
}
```

**Bestehender State-Hook-Einstiegspunkt** (Zeile 119):
```tsx
const [mobileNavOpen, setMobileNavOpen] = useState(false)
// Phase 54: umbenennen zu drawerOpen + zweiten State für Desktop-Hover entfernen
// Einheitlicher State: const [drawerOpen, setDrawerOpen] = useState(false)
```

**Burger-Button-Muster** (Zeilen 131–141) — ARIA-Muster beibehalten, `aria-expanded` + `aria-controls`:
```tsx
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
```

**Bestehender User-Footer** (Zeilen 164–172) — Initialen-Fallback-Muster:
```tsx
<footer className={styles.userFooter}>
  <span className={styles.userAvatar} aria-hidden="true">
    {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
  </span>
  <div>
    <strong>{user?.displayName || 'Angemeldetes Mitglied'}</strong>
    <span>{user?.email || 'Team4s Account'}</span>
  </div>
</footer>
```
Phase 54: Avatar-`<img>`-Tag vor `<span>` setzen, `<span>` als Fallback bei fehlendem `avatarUrl`.

**Focus-Trap-Muster** (aus `mediaCropA11y.ts` Zeilen 31–46 — zu kopieren):
```tsx
// In AppShell.tsx, useEffect wenn drawerOpen === true:
useEffect(() => {
  if (!drawerOpen || !drawerRef.current) return

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setDrawerOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = getFocusableElements(drawerRef.current!)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [drawerOpen])
```

**Edge-Strip-Muster** (Desktop, aus RESEARCH.md Pattern 4, durch Codebase-Analyse bestätigt):
```tsx
<div
  className={styles.edgeStrip}
  role="button"
  tabIndex={0}
  aria-expanded={drawerOpen}
  aria-controls="team4s-nav-drawer"
  aria-label="Navigation öffnen"
  onMouseEnter={() => setDrawerOpen(true)}
  onKeyDown={(e) => { if (e.key === 'Enter') setDrawerOpen(true) }}
  onFocus={() => setDrawerOpen(true)}
/>

<aside
  id="team4s-nav-drawer"
  ref={drawerRef}
  className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
  onMouseLeave={() => setDrawerOpen(false)}
  onBlur={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrawerOpen(false)
  }}
  aria-label="Team4s Navigation"
>
```

**Backdrop-Muster (Mobile)** — vom generischen `Drawer.tsx` (Zeilen 26–27):
```tsx
// ui/Drawer.tsx nutzt overlayClose als unsichtbarer Button über dem Overlay:
<button
  type="button"
  className={styles.overlayClose}
  aria-label="Drawer schließen"
  onClick={() => setDrawerOpen(false)}
/>
// In AppShell: analog als drawerBackdrop-CSS-Klasse, nur auf Mobile sichtbar
```

**Nav-Gruppe anonym** — Muster aus bestehenden `AppShellNavGroups` (Zeilen 78–110):
```tsx
// Selbes Item-Array-Muster, andere Items für anonymen Zustand:
const discoverItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Fansub-Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
  // Suche: disabled oder weggelassen (keine /search-Route)
]
```

---

### `frontend/src/components/layout/AppShell.module.css` (CSS Module)

**Analog:** `frontend/src/components/ui/ui.module.css` (Overlay/Drawer-Sektion, Zeilen 788–858) + eigene Datei (Zeilen 1–200)

**Bestehende Glassmorphism-Sidebar** (Zeilen 17–27) — Ausgangswert für Drawer-Background:
```css
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 18px;
  border-right: 1px solid var(--color-border, rgba(100, 116, 139, 0.22));
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
}
```
Phase 54: `.sidebar` bleibt als Referenz; neues `.drawer` bekommt `position: fixed` + `transform: translateX`.

**Bestehender Mobile-Header-Background** (Zeilen 155–157):
```css
background: rgba(255, 255, 255, 0.94);
backdrop-filter: blur(12px);
```

**Bestehender Mobile-Nav-Transition-Ansatz** (Zeilen 179–189):
```css
/* AKTUELL: display-toggle, keine Animation */
.mobileNav {
  display: none;
}
.mobileNavOpen {
  display: grid;
}
/* PHASE 54: ersetzen durch transform-based Slide-over */
```

**Overlay-Muster** aus `ui.module.css` (Zeilen 788–793):
```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 21, 19, 0.45);
  backdrop-filter: blur(4px);
}
```
Phase 54 Backdrop (leicht andere Werte lt. UI-SPEC):
```css
.drawerBackdrop {
  position: fixed;
  inset: 0;
  z-index: 79; /* unter --z-drawer (80), über Content */
  background: rgba(0, 0, 0, 0.35);
}
```

**Overlay-Close-Button** aus `ui.module.css` (Zeilen 851–857):
```css
.overlayClose {
  position: absolute;
  inset: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
```
Phase 54: analog als `.drawerBackdropBtn` für unsichtbaren Klick-Bereich.

**Neue CSS-Klassen für Phase 54** (abgeleitet aus UI-SPEC + Codebase-Mustern):
```css
/* Slide-over Drawer */
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 260px; /* aus bestehendem minmax(220px, 260px) */
  z-index: var(--z-drawer); /* 80, aus globals.css Zeile 96 */
  transform: translateX(-100%);
  transition: transform 200ms ease-out;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-right: 1px solid var(--color-border, rgba(100, 116, 139, 0.22));
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 18px;
}

.drawerOpen {
  transform: translateX(0);
}

/* Desktop Edge-Strip */
.edgeStrip {
  position: fixed;
  top: 0;
  left: 0;
  width: 16px; /* --space-4, D-02 */
  height: 100vh;
  z-index: var(--z-drawer); /* 80 */
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(8px);
  cursor: pointer;
  border: 0;
}

.edgeStrip:focus-visible {
  outline: 3px solid rgba(47, 95, 227, 0.42);
  outline-offset: 2px;
}
```

**Breakpoint-Nutzung** (Zeile 141) — unveränderter Breakpoint:
```css
@media (max-width: 860px) {
  /* Mobile: edgeStrip ausblenden, mobileHeader einblenden */
  .edgeStrip { display: none; }
  .mobileHeader { display: flex; }
}
```

**Avatar-Bild-CSS** — Ableitung aus `.userAvatar` (Zeilen 129–135):
```css
.userAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface-accent, #e2e8f0);
  color: var(--color-text, #172033);
}

/* NEU für Phase 54: */
.userAvatarImg {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}
```

---

### `frontend/src/components/layout/AppShell.test.tsx` (test)

**Analog:** eigene Datei (Zeilen 1–94 vollständig gelesen)

**Test-Setup-Muster** (Zeilen 1–17) — unveränderter Header:
```tsx
// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; className?: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

afterEach(() => { cleanup() })
```

**Bestehender Test 5** (Zeilen 68–78) — kritisch: muss nach Umbau grün bleiben:
```tsx
it('keeps mobile navigation collapsed until requested', () => {
  render(
    <AppShell currentPath="/me/profile">
      <main>Profilinhalt</main>
    </AppShell>,
  )

  const navButton = screen.getByRole('button', { name: /Navigation/i })
  expect(navButton.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByLabelText('Hauptnavigation mobil')).toBeNull()
})
```

**Neues Test-Muster für Phase 54** — ESC-Key und Backdrop-Klick (Vorlage):
```tsx
it('closes the drawer on Escape key', () => {
  render(<AppShell currentPath="/anime"><main /></AppShell>)
  // Drawer öffnen (Burger oder Edge-Strip)
  const navButton = screen.getByRole('button', { name: /Navigation/i })
  fireEvent.click(navButton)
  expect(navButton.getAttribute('aria-expanded')).toBe('true')
  // ESC drücken
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(navButton.getAttribute('aria-expanded')).toBe('false')
})
```

**Dual-State-Muster** (Vorlage für neue Tests):
```tsx
it('shows login and register buttons in anonymous mode', () => {
  render(<AppShell mode="anonymous" currentPath="/anime"><main /></AppShell>)
  // Drawer öffnen
  const navButton = screen.getByRole('button', { name: /Navigation/i })
  fireEvent.click(navButton)
  expect(screen.getByRole('link', { name: /Anmelden/i })).not.toBeNull()
  expect(screen.getByRole('link', { name: /Registrieren/i })).not.toBeNull()
})

it('shows avatar image when avatarUrl is provided', () => {
  render(
    <AppShell mode="authenticated" user={{ displayName: 'Mika', email: 'mika@example.com', avatarUrl: 'https://cdn.example.com/avatar.jpg' }}>
      <main />
    </AppShell>
  )
  const img = screen.getByRole('img', { name: /Avatar von Mika/i })
  expect(img.getAttribute('src')).toBe('https://cdn.example.com/avatar.jpg')
})
```

---

### `frontend/src/components/layout/AppShellClientWrapper.tsx` (component, request-response) — NEU

**Analog:** `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` (Zeilen 1–67) für `'use client'` + `useEffect` + Event-Listener-Cleanup-Muster

**`'use client'`-Wrapper-Muster** aus `AuthSessionSwitchGuard.tsx` (Zeilen 1–6):
```tsx
'use client'

import { useEffect } from 'react'
import { ... } from '@/lib/api'

export function AuthSessionSwitchGuard() {
  useEffect(() => {
    // ... Setup
    return () => { /* Cleanup */ }
  }, [])
  return null
}
```

**Auth-State-Konsum-Muster** aus `useAuthSession.ts` (Zeilen 30–51):
```tsx
// useAuthSession() liefert: { hasAccessToken, hasRefreshToken, isClientInitialized }
// Immer isClientInitialized-Guard zuerst prüfen, bevor API-Calls:
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken
```

**`getOwnProfile` + `resolveApiUrl` Muster** aus `me/profile/page.tsx` (Zeilen 7, 214):
```tsx
import { getOwnProfile, resolveApiUrl } from '@/lib/api'

// Avatar-URL auflösen:
const avatarUrl = resolveApiUrl(profile?.avatar?.public_url || '')
// ACHTUNG: Feld heißt avatar?.public_url (verschachtelt), NICHT avatar_url
```

**Vollständiger Wrapper-Rumpf** (aus RESEARCH.md Pattern 2, durch Codebase-Analyse verifiziert):
```tsx
'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { getOwnProfile, resolveApiUrl } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import { AppShell } from './AppShell'

interface WrapperProfile {
  displayName?: string
  email?: string
  avatarUrl?: string
  canAdmin?: boolean
}

export function AppShellClientWrapper({ children }: { children: ReactNode }) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const currentPath = usePathname()
  const [profile, setProfile] = useState<WrapperProfile | null>(null)

  useEffect(() => {
    if (!isClientInitialized || !hasAuthSession) {
      setProfile(null)
      return
    }
    getOwnProfile().then((res) => {
      const d = res.data
      setProfile({
        displayName: d.account_display_name || d.fansub_name || undefined,
        email: d.email || undefined,
        avatarUrl: resolveApiUrl(d.avatar?.public_url || '') || undefined,
        canAdmin: d.account_global_roles.includes('platform_admin') || d.account_global_roles.includes('admin'),
      })
    }).catch(() => { setProfile(null) }) // stilles Fallback auf Initialen
  }, [isClientInitialized, hasAuthSession])

  return (
    <AppShell
      mode={hasAuthSession ? 'authenticated' : 'anonymous'}
      currentPath={currentPath ?? undefined}
      user={profile ? { displayName: profile.displayName, email: profile.email, avatarUrl: profile.avatarUrl } : null}
      canAccessAdmin={profile?.canAdmin ?? false}
    >
      {children}
    </AppShell>
  )
}
```

---

### `frontend/src/app/layout.tsx` (config, root layout)

**Analog:** eigene Datei (Zeilen 1–32 vollständig gelesen)

**Aktuelles Root-Layout-Muster** (Zeilen 1–32):
```tsx
import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { AuthSessionSwitchGuard } from '@/components/auth/AuthSessionSwitchGuard'
import { LocalhostCanonicalRedirect } from '@/components/auth/LocalhostCanonicalRedirect'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de">
      <body>
        <LocalhostCanonicalRedirect />
        <AuthSessionSwitchGuard />
        {children}          {/* ← hier AppShellClientWrapper einwickeln */}
      </body>
    </html>
  )
}
```

**Phase 54 Änderung** — minimale Diff, nur zwei Zeilen:
1. Import hinzufügen: `import { AppShellClientWrapper } from '@/components/layout/AppShellClientWrapper'`
2. `{children}` ersetzen durch `<AppShellClientWrapper>{children}</AppShellClientWrapper>`

**Kritische Regel:** Root-Layout bleibt Server Component (kein `'use client'` hinzufügen). Der `AppShellClientWrapper` ist selbst `'use client'` und überbrückt die Grenze.

---

### `frontend/src/app/me/profile/page.tsx` (component, Bereinigung)

**Analog:** eigene Datei (Zeile 287 gelesen)

**Stelle der Eigeninkludierung** (Zeile 287):
```tsx
return (
  <AppShell currentPath="/me/profile" user={shellUser} canAccessAdmin={canAccessAdmin(profile)}>
    <main className={styles.page}>
      {/* ... Seiteninhalt ... */}
    </main>
  </AppShell>  {/* ← gesamte AppShell-Wrapper-Klammer entfernen */}
)
```

**Nach Phase 54** — `<AppShell>`-Wrapper entfernen, nur `<main>` zurückgeben:
```tsx
return (
  <main className={styles.page}>
    {/* ... gleicher Seiteninhalt, unverändert ... */}
  </main>
)
```

**Betroffene Importe** — `AppShell`-Import-Zeile nach der Bereinigung entfernen.
Nutzt `useAuthSession` und `getOwnProfile` weiterhin intern für eigene Profillogik — diese bleiben.

---

### `frontend/src/app/dev/ui-system/page.tsx` (component, Playground-Erweiterung)

**Analog:** eigene Datei (Zeilen 1–60, 660–720, 1090–1113 gelesen)

**Bestehende Drawer-Demo-Sektion** (Zeilen 775–777):
```tsx
<Card variant="section" title="Komposition 4 – Drawer Detail View" description="...">
  <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Drawer-Demo starten</Button>
  ...
</Card>
```

**Bestehende Import-Struktur** (Zeilen 1–34) — neue `AppShell`/`AppShellClientWrapper`-Imports hinzufügen:
```tsx
// Bestehende ui-imports bleiben; hinzufügen:
import { AppShell } from '@/components/layout/AppShell'
```

**Neue Demo-Sektion-Muster** (nummerierte `SectionHeader`-Konvention, Zeile 662):
```tsx
<Card variant="section">
  <SectionHeader
    eyebrow="09"
    title="Nav Drawer — Globale Shell"
    description="AppShell mit Slide-over Drawer, Dual-State (anonym/eingeloggt), Edge-Strip, Glassmorphism und Focus-Trap."
  />
  {/* Demo-Inhalte: anonym + eingeloggt + Avatar-Fallback */}
</Card>
```

**Drawer-State-Muster** — bestehend (Zeile 166):
```tsx
const [drawerOpen, setDrawerOpen] = useState(false)
// Analog: eigenen State für Shell-Demo-Modus hinzufügen:
const [shellDemoMode, setShellDemoMode] = useState<'anonymous' | 'authenticated'>('authenticated')
```

---

## Shared Patterns

### Auth-State-Konsum (`useAuthSession`)

**Quelle:** `frontend/src/lib/useAuthSession.ts` (Zeilen 30–51)
**Gilt für:** `AppShellClientWrapper.tsx`, ggf. Test-Mocks

```tsx
// Immer isClientInitialized-Guard vor API-Calls oder Auth-State-abhängiger Logik:
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken

useEffect(() => {
  if (!isClientInitialized || !hasAuthSession) return
  // ... API-Aufruf hier sicher
}, [isClientInitialized, hasAuthSession])
```

**Listener-Cleanup-Muster** aus `useAuthSession.ts` (Zeilen 35–47):
```tsx
useEffect(() => {
  const syncAuthState = () => { /* ... */ }
  window.addEventListener('focus', syncAuthState)
  window.addEventListener('storage', syncAuthState)
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
  return () => {
    window.removeEventListener('focus', syncAuthState)
    window.removeEventListener('storage', syncAuthState)
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
  }
}, [])
```

### Focus-Trap-Utility

**Quelle:** `frontend/src/components/media/crop/mediaCropA11y.ts` (Zeilen 31–46)
**Gilt für:** `AppShell.tsx` (Drawer-Focus-Trap)

```tsx
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.hasAttribute('disabled')) return false
    return true
  })
}
```
Import: `import { getFocusableElements } from '@/components/media/crop/mediaCropA11y'`

### Avatar-URL-Auflösung (`resolveApiUrl`)

**Quelle:** `frontend/src/app/me/profile/page.tsx` (Zeile 214)
**Gilt für:** `AppShellClientWrapper.tsx`

```tsx
// MUSTER: resolveApiUrl vor Verwendung der Avatar-URL aufrufen
// Feld-Pfad: profile.avatar?.public_url (NICHT profile.avatar_url)
const avatarUrl = resolveApiUrl(profile?.avatar?.public_url || '')

// Import:
import { resolveApiUrl } from '@/lib/api'
```

### Z-Index-Token-Verwendung

**Quelle:** `frontend/src/styles/globals.css` (Zeilen 95–97)
**Gilt für:** `AppShell.module.css`

```css
/* Tokens aus globals.css — keine Magic Numbers: */
--z-sticky: 40;   /* Mobile Header */
--z-drawer: 80;   /* Drawer + Edge-Strip */
--z-modal: 90;    /* Nicht in Phase 54 */

/* Backdrop unter Drawer, über Content: */
/* z-index: 79 (kein Token — dokumentieren im CSS-Kommentar) */
```

### CSS-Modul-Klassen-Kompositionsmuster

**Quelle:** `AppShell.tsx` (Zeilen 67–70) + `AppShell.module.css`
**Gilt für:** Alle neuen CSS-Klassen in `AppShell.module.css`

```tsx
// Klassen-Komposition via Template-Literal:
className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
className={`${styles.navItem} ${item.current ? styles.navItemCurrent : ''}`}
```

### `'use client'`-Komponenten-Muster

**Quelle:** `AppShell.tsx` (Zeile 1) + `AuthSessionSwitchGuard.tsx` (Zeile 1)
**Gilt für:** `AppShellClientWrapper.tsx`

```tsx
// Immer erste Zeile der Datei:
'use client'
// Danach React-Imports, dann Projekt-Imports, dann lokale Imports
```

---

## Kritische Befunde (für Planer)

### 1. Kein `avatar_url`-Flachfeld
`MemberProfileData.avatar_url` existiert nicht. Korrekter Pfad: `profile.avatar?.public_url`.
Zusätzlich: `resolveApiUrl()` aufrufen, da `page.tsx` das Muster vorschreibt.
Quelle: `me/profile/page.tsx` Zeile 214.

### 2. `/fansubs`-Route fehlt
`frontend/src/app/fansubs/` hat nur `[slug]/page.tsx`, keine Listenseite.
Ein Link auf `/fansubs` führt in eine 404.
Empfehlung: Link als `disabled` mit Badge `bald` aufnehmen (selbes Muster wie `Dashboard`-Nav-Item in `AppShell.tsx` Zeile 81).

### 3. `/search`-Route fehlt
Keine `frontend/src/app/search/page.tsx` gefunden.
Suche-Link im anonymen Nav weglassen oder ebenfalls als `disabled` markieren.

### 4. Doppelte Shell nach Root-Layout-Integration
`me/profile/page.tsx` Zeile 287 schließt `AppShell` selbst ein.
Diese Eigeninkludierung muss nach Root-Layout-Integration entfernt werden.
Gefahr: Zweifacher Drawer + falsche Layout-Proportionen.

### 5. Bestehende Test-5-Logik nach Umbau prüfen
`AppShell.test.tsx` Zeile 77 prüft `queryByLabelText('Hauptnavigation mobil')`.
Nach Umbau von `display: none/grid` auf `transform: translateX` muss das `nav`-Element weiterhin nur bei `drawerOpen === true` im DOM erscheinen (oder `aria-hidden` nutzen).

---

## Keine Analogie gefunden

Alle 7 Dateien haben einen direkten Analog in der Codebase. Kein Eintrag nötig.

---

## Metadata

**Analog-Suchbereich:** `frontend/src/components/`, `frontend/src/app/`, `frontend/src/lib/`, `frontend/src/styles/`
**Gelesene Dateien:** 12 (AppShell.tsx, AppShell.module.css, AppShell.test.tsx, layout.tsx, me/profile/page.tsx, useAuthSession.ts, mediaCropA11y.ts, Drawer.tsx, ui.module.css, AuthSessionSwitchGuard.tsx, dev/ui-system/page.tsx, globals.css)
**Pattern-Mapping-Datum:** 2026-05-28
