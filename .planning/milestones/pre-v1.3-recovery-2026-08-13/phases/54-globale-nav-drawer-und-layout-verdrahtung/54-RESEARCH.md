# Phase 54: Globale Nav Drawer und Layout Verdrahtung – Research

**Researched:** 2026-05-28
**Domain:** Next.js App Router Shell-Architektur, CSS-Glassmorphism-Drawer, Accessibility (Focus-Trap, ARIA), React Client-/Server-Component-Grenze
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01:** Mobiler Drawer = echter Slide-over Overlay von links (kein Inline-Panel)
- **D-02:** Desktop = 16px Glasrand (Edge-Strip) am linken Rand, Hover öffnet Drawer; Maus verlässt Drawer → schließt sich
- **D-03:** Mobile Burger-Button im Header öffnet/schließt den Drawer
- **D-04:** Desktop-Hover-Trigger auch per Tastatur (Fokus + Enter) bedienbar – keine reinen Hover-only-Aktionen
- **D-05:** Drawer ist halbtransparent/Glassmorphism (`backdrop-filter: blur(...)` + `background: rgba(...)`)
- **D-06:** Drawer-Header: Team4s-Branding mit Logo und Titeltext – kein Nutzer-Bannerbild
- **D-07:** ESC schließt Drawer; Klick auf Backdrop (Mobile) schließt; Focus-Trap im offenen Drawer
- **D-08:** Dual-State: `anonymous` (Login/Registrieren + Public-Nav) vs. `authenticated` (Avatar + vollständige Nav)
- **D-09:** Anonyme Nav: Anime-Katalog (`/anime`), Fansub-Gruppen (`/fansubs`), Suche — nur echte Ziele
- **D-10:** Auth-Seiten (`/auth/*`) bekommen Drawer ebenfalls (Root-Layout)
- **D-11:** AppShell in `frontend/src/app/layout.tsx` (Root-Layout) einbauen
- **D-12:** `/me/profile` bindet AppShell noch selbst — nach Root-Layout-Migration Eigeninkludierung entfernen
- **D-13:** AppShell bleibt `'use client'`; Root-Layout bleibt Server Component → dedizierter Client-Wrapper nötig
- **D-14:** Dashboard, Meine Gruppen, Meine Beiträge bleiben `disabled` mit Badge `bald`
- **D-15:** `/admin` bleibt capability-gated (`canAccessAdmin`)
- **D-16:** Drawer-Footer eingeloggt: echtes Avatar-Bild aus `GET /api/v1/me/profile` (`avatar` → `public_url`); Initialen-Fallback bei null/leer
- **D-17:** Avatar-URL über bestehenden `getOwnProfile`-Aufruf, kein separater API-Call für Shell
- **D-18:** Focus-Trap im offenen Drawer; ESC gibt Fokus zurück; Klick auf Backdrop schließt
- **D-19:** Burger-Button und Edge-Strip mit `aria-expanded`, `aria-controls`, sichtbaren Fokuszuständen

### Claude's Discretion
- Drawer-Animations-Details (Easing, Geschwindigkeit, Elastizität) — technische Entscheidung des Planers
- Konkrete Hook-Implementierung für Focus-Trap (inline vs. wiederverwendbares Utility)
- Reihenfolge der Implementierungswellen (Playground-first ist empfohlen, aber Planer entscheidet finale Aufgabenstruktur)
- Desktop-Schließmechanismus: ob `onMouseLeave` direkt auf dem Drawer-Element oder per kombinierten Event-Listener

### Deferred Ideas (AUSSERHALB DES SCOPE)
- Neue Routen für Dashboard, Meine Gruppen, Meine Beiträge
- Vollständige App-weite Content-Redesigns
- Login/Registrieren-Flows inline im Drawer
- Suche inline im Drawer
- Custom Keycloak Account Console Theme
</user_constraints>

---

## Summary

Phase 54 verwandelt die bestehende `AppShell`-Komponente von einer statisch sichtbaren Desktop-Sidebar mit Inline-Mobile-Panel in ein vollständiges seitenweites Drawer-Navigationssystem. Die Arbeit teilt sich in drei klar abgegrenzte Blöcke: (1) Erweiterung von `AppShell.tsx` und `AppShell.module.css` um Slide-over-Logik, Edge-Strip, Glassmorphism und Dual-State-Drawer-Inhalt, (2) einen neuen `AppShellClientWrapper` der die Server-/Client-Component-Grenze im Root-Layout überbrückt, (3) Bereinigung der Eigeninkludierung in `/me/profile/page.tsx`.

Die bestehende Codebasis ist gut vorbereitet: CSS-Variablen für Z-Index, Glassmorphism-Tokens, Breakpoints und die `getFocusableElements`-Utility aus `mediaCropA11y.ts` sind bereits vorhanden. Der Haupt-Implementierungsaufwand liegt in der Drawer-Mechanik (CSS-Transition, Event-Handler für Hover/Fokus/ESC/Backdrop), der Avatar-Anbindung (`profile.avatar.public_url`) und dem Client-Wrapper-Muster.

Kritischer Befund: `/fansubs` existiert nur als `/fansubs/[slug]` (Detail-Route), aber es gibt keine eigenständige Listenseite. `/anime` existiert als Route mit `page.tsx`. Eine `/search`-Route existiert nicht. Der Nav-Link "Fansub-Gruppen" muss vor der Verlinkung geprüft werden — ein Link auf `/fansubs` ohne Listenroute würde in eine 404 laufen.

**Primäre Empfehlung:** Implementierung in drei Wellen: (1) Playground-Demo in `/dev/ui-system`, (2) Drawer-Logik in AppShell + CSS, (3) Root-Layout-Integration + Profil-Bereinigung.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drawer-State (offen/geschlossen) | Browser / Client | — | Rein interaktiver UI-State, kein Server-Rendering nötig |
| Auth-Status für Dual-State | Browser / Client | — | `useAuthSession()` liest client-seitige Cookie-Snapshots |
| Avatar-Daten | Browser / Client | API / Backend | `getOwnProfile()` client-seitig im Wrapper, API liefert `avatar.public_url` |
| Root-Layout-Integration | Frontend Server (SSR) | Browser / Client | `layout.tsx` ist Server Component, braucht Client-Wrapper-Boundary |
| Focus-Trap | Browser / Client | — | DOM-Manipulation, nur im Browser ausführbar |
| CSS-Glassmorphism / Animation | Browser / Client | — | `backdrop-filter`, CSS-Transitions |
| Edge-Strip (Desktop) | Browser / Client | — | `position: fixed` + Hover-Events |
| Capability-Gate (`canAccessAdmin`) | Browser / Client | API / Backend | Aus `getOwnProfile` → `account_global_roles`, nicht aus Keycloak-Claims |

---

## Standard Stack

### Core

| Library/API | Version | Zweck | Warum Standard |
|-------------|---------|-------|----------------|
| React `useState`, `useEffect`, `useRef`, `useCallback` | 18.3.1 [VERIFIED: package.json] | Drawer-State, Event-Handler, Focus-Management | Bereits Projektstandard |
| CSS Modules (`.module.css`) | — | Colocated Styles, kein Style-Leakage | Etabliertes Projekt-Muster in AppShell |
| `useAuthSession` aus `frontend/src/lib/useAuthSession.ts` | — | Client-seitige Auth-State-Erkennung | Token-free UI Boundary per Projekt-Konvention |
| `getOwnProfile` aus `frontend/src/lib/api.ts` | — | Avatar-URL + Nutzerdaten für Drawer-Footer | Bestehender API-Helper, kein neuer Aufruf nötig |
| `lucide-react` | bestehend [VERIFIED: package.json] | Icons (Menu, X, Compass, Users, etc.) | Projektweiter Icon-Standard |
| `getFocusableElements` aus `mediaCropA11y.ts` | — | Focus-Trap-Implementierung | Bereits im Projekt vorhanden |

### Keine neuen externen Pakete

Phase 54 installiert keine externen Pakete. Alle benötigten Bausteine sind bereits im Projekt vorhanden. [VERIFIED: Codebase-Analyse]

---

## Package Legitimacy Audit

> Nicht zutreffend – Phase 54 installiert keine externen Pakete.

**Packages removed due to slopcheck [SLOP] verdict:** keine
**Packages flagged as suspicious [SUS]:** keine

---

## Architecture Patterns

### System Architecture Diagram

```
Nutzeraktion (Hover/Klick/Fokus/ESC)
         │
         ▼
AppShellClientWrapper ('use client')
│  - useAuthSession() → hasAuthSession
│  - useEffect: getOwnProfile() → profile.avatar.public_url
│  - Leitet mode, user, canAccessAdmin an AppShell weiter
         │
         ▼
AppShell ('use client')
│  - drawerOpen State (useState)
│  - Mobile: Burger-Button → setDrawerOpen
│  - Desktop: Edge-Strip (onMouseEnter/onMouseLeave + Fokus)
│  - ESC-Handler (useEffect + keydown)
│  - Focus-Trap (useEffect + Tab-Key-Handler)
│
├─► DrawerBackdrop (Mobile, onClick → close)   z-index: 79
├─► DrawerPanel (Slide-over, transform: translateX)  z-index: 80
│     ├─ BrandingHeader (Team4s Logo + Text)
│     ├─ NavGroups (anonym oder eingeloggt je nach mode)
│     └─ Footer (anonym: Anmelden/Registrieren | eingeloggt: Avatar + Name + Email)
│
└─► ContentSlot ({children}) – Main Page Content
         │
         ▼
Root Layout (Server Component, layout.tsx)
│  - Importiert AppShellClientWrapper
│  - Wraps {children}
│  - Kein direkter Drawer-State, keine client-seitige Logik
```

### Empfohlene Projektstruktur nach Phase 54

```
frontend/src/
├── components/layout/
│   ├── AppShell.tsx           (erweitert: Slide-over, Edge-Strip, Dual-State, Avatar-Bild)
│   ├── AppShell.module.css    (erweitert: Drawer-Animation, Edge-Strip, Backdrop, Focus-Ring)
│   ├── AppShell.test.tsx      (bestehende Tests bleiben grün + neue Tests für Drawer-Behavior)
│   └── AppShellClientWrapper.tsx  (NEU: 'use client', überbrückt Server-Component-Grenze)
├── app/
│   ├── layout.tsx             (modifiziert: AppShellClientWrapper eingebaut)
│   ├── me/profile/page.tsx    (modifiziert: Eigeninkludierung von AppShell entfernt)
│   └── dev/ui-system/page.tsx (erweitert: Drawer-Demo-Sektion hinzugefügt)
```

### Pattern 1: CSS Slide-over Drawer Animation

**Was:** Drawer nutzt CSS `transform: translateX(-100%)` → `translateX(0)` mit `transition`
**Wann verwenden:** Für die Drawer-Öffnungs-/Schließanimation (D-01)

```css
/* AppShell.module.css */
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 260px;
  z-index: var(--z-drawer); /* 80 */
  transform: translateX(-100%);
  transition: transform 200ms ease-out;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-right: 1px solid var(--border-subtle);
}

.drawerOpen {
  transform: translateX(0);
}

.edgeStrip {
  position: fixed;
  top: 0;
  left: 0;
  width: 16px; /* D-02: exakt 16px = --space-4 */
  height: 100vh;
  z-index: var(--z-drawer);
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 79; /* unter Drawer, über Content */
  background: rgba(0, 0, 0, 0.35);
}
```

Quelle: [VERIFIED: Codebase – AppShell.module.css, globals.css], [CITED: UI-SPEC.md]

### Pattern 2: Client-Wrapper für Server-Component-Grenze

**Was:** Dedizierter `'use client'`-Wrapper, der im Server-Component Root-Layout genutzt wird
**Wann verwenden:** Immer wenn eine Client-Komponente in einem Server-Component-Layout eingebettet werden muss (D-13)

```tsx
// AppShellClientWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { AppShell } from './AppShell'
import { getOwnProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { ReactNode } from 'react'

export function AppShellClientWrapper({ children }: { children: ReactNode }) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const [profile, setProfile] = useState<{ displayName?: string; email?: string; avatarUrl?: string; canAdmin?: boolean } | null>(null)

  useEffect(() => {
    if (!isClientInitialized || !hasAuthSession) return
    getOwnProfile().then((res) => {
      const d = res.data
      setProfile({
        displayName: d.account_display_name || d.fansub_name || undefined,
        email: d.email || undefined,
        avatarUrl: d.avatar?.public_url || undefined,
        canAdmin: d.account_global_roles.includes('platform_admin') || d.account_global_roles.includes('admin'),
      })
    }).catch(() => { /* stilles Fallback auf Initialen */ })
  }, [isClientInitialized, hasAuthSession])

  return (
    <AppShell
      mode={hasAuthSession ? 'authenticated' : 'anonymous'}
      user={profile ? { displayName: profile.displayName, email: profile.email, avatarUrl: profile.avatarUrl } : null}
      canAccessAdmin={profile?.canAdmin ?? false}
    >
      {children}
    </AppShell>
  )
}
```

Quelle: [VERIFIED: Codebase – useAuthSession.ts, api.ts, profile.ts], [CITED: auth-api-client.md]

### Pattern 3: Focus-Trap-Implementierung

**Was:** Wiederverwendbare `getFocusableElements`-Utility aus `mediaCropA11y.ts` für Tab-Cycling im Drawer
**Wann verwenden:** Immer wenn ein Overlay-Drawer/Modal geöffnet ist (D-07, D-18)

```tsx
// Verwendung in AppShell.tsx (useEffect)
import { getFocusableElements } from '@/components/media/crop/mediaCropA11y'

useEffect(() => {
  if (!drawerOpen || !drawerRef.current) return

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setDrawerOpen(false)
      triggerRef.current?.focus() // Fokus zurück an auslösendes Element
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

Quelle: [VERIFIED: Codebase – mediaCropA11y.ts]

### Pattern 4: Desktop Edge-Strip Hover + Tastatur

**Was:** `onMouseEnter`/`onMouseLeave` auf Edge-Strip und Drawer-Panel, plus Fokus + Enter für Tastatur
**Wann verwenden:** Nur auf Desktop (>860px), keine Hover-only-Aktionen (D-04)

```tsx
// Edge-Strip – Hover und Tastatur
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

// Drawer-Panel bekommt Maus-Leave zum Schließen
<aside
  id="team4s-nav-drawer"
  className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
  ref={drawerRef}
  onMouseLeave={() => setDrawerOpen(false)}
  onBlur={(e) => {
    // Schließen wenn Fokus den Drawer verlässt (nicht auf ein Kindelement)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrawerOpen(false)
  }}
  aria-label="Team4s Navigation"
>
```

Quelle: [VERIFIED: Codebase – AppShell.tsx, AppShell.module.css], [CITED: CONTEXT.md D-04]

### Anti-Patterns vermeiden

- **Hover-only ohne Tastatur-Äquivalent:** Verstößt gegen D-04 und CLAUDE.md UX-Qualitätsregel
- **Root-Layout direkt zu `'use client'` machen:** Next.js App Router verliert Server-Rendering-Vorteile; stattdessen dedizierter Client-Wrapper
- **`authToken` als Prop durchreichen:** Verstößt gegen `docs/frontend/auth-api-client.md` (Token-free UI Boundary)
- **`avatar_url` als direktes Feld nutzen:** Das Feld heißt `profile.avatar?.public_url` (verschachteltes Objekt), nicht `avatar_url`. [VERIFIED: Codebase – profile.ts]
- **Drawer vor AppShell-Stabilisierung global schalten:** Root-Layout-Integration erst nach stabiler Drawer-Implementierung (UI-SPEC.md Entwicklungsstrategie)
- **`font-weight: 650`:** Kein valider CSS-Wert in allen Browsern; UI-SPEC normiert auf 700 für fette Elemente

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Fokussierbare Elemente im Drawer ermitteln | Custom Selector-Logik | `getFocusableElements` aus `mediaCropA11y.ts` | Bereits vorhanden, getestet (mediaCropA11y.test.ts) |
| Z-Index-Werte | Magic Numbers | `var(--z-drawer)` (80), `var(--z-sticky)` (40), `var(--z-modal)` (90) | In globals.css definiert, konsistent |
| Spacing-Werte | Pixel-Magic-Numbers | `var(--space-4)` (16px), `var(--space-5)` (24px), etc. | Spacing-Scale in globals.css |
| Auth-Status | Eigenes Cookie-Reading | `useAuthSession()` aus `useAuthSession.ts` | Token-free UI Boundary per Projekt-Konvention |
| Avatar-API-Call | Neuer fetch()-Aufruf | `getOwnProfile()` aus `api.ts` | D-17: kein separater API-Call |
| CSS-Glassmorphism-Werte | Eigene Farb-Experimente | Festgelegte Werte aus UI-SPEC.md (D-05) | Konsistenz mit bestehender Sidebar |

**Kernaussage:** Alle benötigten Utilities existieren bereits im Projekt. Keine externen Pakete nötig.

---

## Runtime State Inventory

> Nicht zutreffend — Phase 54 ist kein Rename/Refactor. Kein Runtime-State-Inventory erforderlich.

---

## Common Pitfalls

### Pitfall 1: Falscher Avatar-Feldname

**Was schiefläuft:** `profile.avatar_url` ist `undefined` — das Feld existiert nicht
**Warum:** `MemberProfileData` hat ein verschachteltes Objekt `avatar?: { public_url: string, ... } | null` — kein flaches `avatar_url`
**Vermeidung:** Immer `profile.avatar?.public_url` verwenden, mit Nullcheck
**Warnsignal:** TypeScript-Fehler `Property 'avatar_url' does not exist on type 'MemberProfileData'`

### Pitfall 2: Fehlende `/fansubs`-Listenroute

**Was schiefläuft:** Nav-Link "Fansub-Gruppen" auf `/fansubs` führt in eine 404 — die Route existiert nur als `/fansubs/[slug]` (Detail), aber NICHT als Listenseite
**Warum:** `frontend/src/app/fansubs/` enthält nur `[slug]/` — kein `page.tsx` auf Root-Level der Route
**Vermeidung:** Link-Ziel auf `/fansubs` wird zur 404. Entscheidung benötigt: Link weglassen, deaktivieren, oder die `/anime`-Seite als Suche mit Filterfunktion nutzen
**Empfehlung:** Den `/fansubs`-Link in Phase 54 als `disabled` mit Badge `bald` kennzeichnen, analog zu Dashboard/Meine Gruppen — bis eine Fansub-Listenseite existiert
**Warnsignal:** 404 beim Klick auf den Nav-Link in der Produktion

### Pitfall 3: Doppelte AppShell nach Root-Layout-Integration

**Was schiefläuft:** `/me/profile` rendert AppShell zweimal — einmal aus Root-Layout, einmal aus `page.tsx` (Zeile 287)
**Warum:** Die Migration in Root-Layout macht alle Seiten automatisch zu Shell-Konsumenten; `page.tsx` inkludiert sie aber noch selbst
**Vermeidung:** D-12 strikt befolgen: nach Root-Layout-Integration sofort `<AppShell ...>` aus `me/profile/page.tsx` entfernen
**Warnsignal:** Doppelter Sidebar/Drawer in der UI, falsche Layout-Proportionen

### Pitfall 4: Shell rendert sich auf Servern ohne Client-State

**Was schiefläuft:** `useAuthSession()` und `getOwnProfile()` laufen auf dem Server → Hydration-Fehler oder leere Profilinfos
**Warum:** `AppShell` und `AppShellClientWrapper` sind `'use client'` — dürfen nur im Browser ausgeführt werden
**Vermeidung:** `AppShellClientWrapper` korrekt mit `'use client'` markieren; `isClientInitialized`-Guard aus `useAuthSession` nutzen; Avatar erst nach `isClientInitialized && hasAuthSession` laden
**Warnsignal:** React-Hydration-Fehler, SSR-Rendering schlägt fehl

### Pitfall 5: Hover-Conflict zwischen Edge-Strip und Drawer-Panel

**Was schiefläuft:** Drawer öffnet und schließt schnell flatternd weil `onMouseLeave` des Drawers feuert bevor `onMouseEnter` des nächsten Elements greift
**Warum:** Es gibt einen Pixel-Gap zwischen Edge-Strip (16px) und vollständig ausgeklapptem Drawer (260px) falls nicht überlappend positioniert
**Vermeidung:** Edge-Strip und Drawer-Panel müssen lückenlos aneinanderstoßen oder sich leicht überlappen; `onMouseLeave` nur auf dem Container-Element, nicht auf dem Strip allein
**Warnsignal:** Zitterndes/Flackerndes Drawer-Verhalten beim langsamen Hover

### Pitfall 6: Focus-Trap blockiert normale Seiten-Tab-Reihenfolge bei geschlossenem Drawer

**Was schiefläuft:** Tab-Key-Navigation auf der Seite springt in den geschlossenen Drawer
**Warum:** Event-Listener für Focus-Trap bleibt aktiv obwohl Drawer geschlossen ist
**Vermeidung:** Focus-Trap-`useEffect` immer mit `if (!drawerOpen) return` absichern; Cleanup-Funktion des Effects korrekt implementieren
**Warnsignal:** Keyboard-Navigation auf normalen Seiten ist gebrochen

### Pitfall 7: `currentPath` für aktiven Nav-Link ohne `usePathname`

**Was schiefläuft:** Aktiver Nav-Link wird nicht markiert (kein `aria-current="page"`)
**Warum:** `AppShellClientWrapper` muss `currentPath` aus dem aktuellen Router-Zustand lesen; er kommt nicht automatisch ins Root-Layout
**Vermeidung:** `usePathname()` aus `next/navigation` im Client-Wrapper nutzen und als `currentPath` an AppShell weitergeben
**Warnsignal:** Kein `navItemCurrent`-Styling auf keiner Seite sichtbar

---

## Code Examples

### Avatar-Bild mit Initialen-Fallback

```tsx
// Im eingeloggten Drawer-Footer (AppShell.tsx)
// Quelle: VERIFIED: Codebase – profile.ts (MemberProfileData.avatar.public_url)
function DrawerUserFooter({ user }: { user: AppShellUser | null }) {
  const initial = (user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()
  const avatarUrl = user?.avatarUrl // aus profile.avatar.public_url via Client-Wrapper

  return (
    <footer className={styles.userFooter}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Avatar von ${user?.displayName || 'Mitglied'}`}
          className={styles.userAvatarImg}
          width={36}
          height={36}
        />
      ) : (
        <span className={styles.userAvatar} aria-hidden="true">{initial}</span>
      )}
      <div>
        <strong>{user?.displayName || 'Angemeldetes Mitglied'}</strong>
        <span>{user?.email || 'Team4s Account'}</span>
      </div>
    </footer>
  )
}
```

### Anonym-Footer (Login/Registrieren)

```tsx
// Im anonymen Drawer-Footer (AppShell.tsx)
// Quelle: CITED: CONTEXT.md D-08, UI-SPEC.md Copywriting Contract
function DrawerAnonymousFooter() {
  return (
    <footer className={styles.anonFooter}>
      <Link href="/auth" className={styles.btnPrimary}>Anmelden</Link>
      <Link href="/auth/register" className={styles.btnSecondary}>Registrieren</Link>
    </footer>
  )
}
```

### Root-Layout-Integration

```tsx
// frontend/src/app/layout.tsx (nach Phase 54)
// Quelle: VERIFIED: Codebase – layout.tsx, CONTEXT.md D-11, D-13
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { AuthSessionSwitchGuard } from '@/components/auth/AuthSessionSwitchGuard'
import { LocalhostCanonicalRedirect } from '@/components/auth/LocalhostCanonicalRedirect'
import { AppShellClientWrapper } from '@/components/layout/AppShellClientWrapper'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <LocalhostCanonicalRedirect />
        <AuthSessionSwitchGuard />
        <AppShellClientWrapper>{children}</AppShellClientWrapper>
      </body>
    </html>
  )
}
```

---

## State of the Art

| Alte Lösung | Neue Lösung Phase 54 | Impact |
|-------------|---------------------|--------|
| Inline Mobile Nav Panel (`display: grid` wenn offen) | Echter Slide-over Overlay (`transform: translateX`) | Keine Layout-Verschiebung, overlay über Content |
| Desktop Sidebar: `position: sticky`, immer sichtbar | Desktop Edge-Strip (16px) + hover-aktivierter Drawer | Mehr Content-Fläche auf Desktop |
| AppShell nur in `/me/profile` eingebaut | AppShell in Root-Layout → alle Seiten erhalten Shell | Keine pro-Seite-Inkludierung mehr nötig |
| Initialen-Fallback-Avatar (immer) | Echtes Avatar-Bild aus `profile.avatar.public_url` | Persönlichere, korrektere Shell |
| `mode`-Prop immer `'authenticated'` (nur eine Seite hatte Shell) | Dual-State: anonym vs. eingeloggt | Shell zeigt kontext-korrekte Navigation |

**Veraltetes/abgeschafftes:**
- `.mobileNav` + `.mobileNavOpen` als Inline-Panel: wird zu Slide-over-Drawer (CSS-Klassen bleiben für Transition wiederverwendbar, aber Logik ändert sich)
- Statische Desktop-Sidebar (`grid-template-columns: minmax(220px,260px) 1fr`): wird zu Edge-Strip + conditionalem Drawer

---

## Codebase-Befunde (kritisch für Planung)

### Avatar-Struktur in `MemberProfileData`

Das Feld ist verschachtelt: `profile.avatar?: { public_url: string, ... } | null`
Es gibt kein direktes `avatar_url`-Flachfeld. [VERIFIED: Codebase – profile.ts]

Der `resolveApiUrl`-Helper in `page.tsx` wird für die Avatar-URL verwendet. Im Client-Wrapper muss entschieden werden, ob die URL direkt nutzbar ist oder ob `resolveApiUrl` aufgerufen werden muss. [ASSUMED] — in `page.tsx` Zeile 214 wird `resolveApiUrl(profile?.avatar?.public_url || '')` genutzt. Für die Shell im Wrapper sollte dasselbe Muster gelten, falls relative URLs möglich sind.

### `/fansubs`-Routen-Problem

`frontend/src/app/fansubs/` enthält nur `[slug]/page.tsx` — keine Fansub-Listenseite.
Ein Link auf `/fansubs` im anonymen Nav-State würde in eine 404 laufen.
Empfehlung: `/fansubs`-Link als `disabled` mit Badge `bald` aufnehmen, bis eine Listenseite existiert.
[VERIFIED: Codebase – Verzeichnisstruktur]

### `/search`-Route

Keine `/search`-Route gefunden. [VERIFIED: Codebase – `frontend/src/app/`]
Der Suche-Link im anonymen Nav kann nicht direkt verlinkt werden.
Empfehlung: Suche-Link ebenfalls als `disabled` aufnehmen oder ganz weglassen.

### Bestehender `Drawer`-Primitive (`ui/Drawer.tsx`)

Es existiert ein generischer `Drawer` in `frontend/src/components/ui/Drawer.tsx` — dieser ist aber für Detail-/Content-Drawer von rechts ausgelegt (Admin-Drawer etc.). Er hat kein Edge-Strip-Verhalten, keine Auth-State-Logik und keine Glassmorphism-Styles für die Nav-Shell.

**Entscheidung:** Die AppShell-spezifische Drawer-Logik bleibt in `AppShell.tsx`/`AppShell.module.css` — der generische `Drawer`-Primitive ist nicht wiederverwendbar für diesen Zweck. Kein API-Aufruf, kein Auth-Check in `src/components/ui`. [VERIFIED: ui-system.md Regeln]

### Bestehende `getFocusableElements`-Utility

Vorhanden in `frontend/src/components/media/crop/mediaCropA11y.ts`.
Kann für den Drawer-Focus-Trap wiederverwendet werden — getestet via `mediaCropA11y.test.ts`.
Import-Pfad: `@/components/media/crop/mediaCropA11y` [VERIFIED: Codebase]

### Bestehende Tests in `AppShell.test.tsx`

5 bestehende Tests müssen nach dem Umbau grün bleiben:
1. Eingeloggtes Nicht-Admin-Mitglied sieht Profil-Link
2. Admin-Nav für Nicht-Admins ausgeblendet
3. Deaktivierte zukünftige Items ohne Fake-Routes
4. Admin-Nav für Admins sichtbar
5. Mobile Nav: collapsed bis angefordert, öffnet bei Klick

Test 5 prüft explizit `aria-expanded="false"` und das Fehlen von `aria-label="Hauptnavigation mobil"` im geschlossenen Zustand — muss nach Umbau weiter gelten. [VERIFIED: Codebase – AppShell.test.tsx]

---

## Environment Availability

> Rein Frontend-seitige Änderungen, keine externen Tools oder Services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Frontend-Build | ✓ | aus package.json | — |
| Vitest + jsdom | AppShell.test.tsx | ✓ | Vitest 3 (vitest.config.ts) | — |
| @testing-library/react | AppShell.test.tsx | ✓ | bestehend | — |
| Next.js Dev Server | `/dev/ui-system` Playground | ✓ | Next.js 16 | — |

**Keine fehlenden Dependencies** für Phase 54.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 + @testing-library/react + jsdom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | Slide-over Drawer öffnet/schließt (Mobile) | unit | `vitest run AppShell.test.tsx` | ✅ (erweitern) |
| D-02 | Desktop Edge-Strip: Hover öffnet Drawer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-04 | Edge-Strip: Enter-Taste öffnet Drawer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-07 | ESC schließt Drawer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-07 | Backdrop-Klick schließt Drawer (Mobile) | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-08 | Anonym-Modus: Login/Registrieren im Footer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-08 | Eingeloggt-Modus: Avatar + Name + Email im Footer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-12 | Kein doppelter Shell-Render auf `/me/profile` | smoke | manuell | ❌ Wave 0 |
| D-15 | Admin-Nav capability-gated | unit | bestehender Test (erweitern) | ✅ |
| D-16 | Avatar-Bild wenn `avatar.public_url` vorhanden | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-16 | Initialen-Fallback wenn kein Avatar | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |
| D-18 | Focus-Trap: Tab bleibt im offenen Drawer | unit | `vitest run AppShell.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per Task-Commit:** `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx`
- **Per Wave-Merge:** `cd frontend && npx vitest run`
- **Phase Gate:** Full suite grün vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Neue Testfälle in `AppShell.test.tsx` für Slide-over, Edge-Strip, ESC, Backdrop, Dual-State, Avatar
- [ ] `AppShellClientWrapper.test.tsx` — Wrapper-Tests (auth-state Routing)
- [ ] Smoke-Test-Checkliste für Root-Layout-Integration (manuell, da nicht automatisierbar mit jsdom)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | Shell zeigt nur Auth-Status, verändert ihn nicht |
| V3 Session Management | nein | Session-Logik in `api.ts`, nicht in Shell |
| V4 Access Control | ja | `canAccessAdmin` aus Backend-Capabilities, nicht aus Keycloak-Claims |
| V5 Input Validation | nein | Keine User-Inputs in Phase 54 |
| V6 Cryptography | nein | Keine Krypto in Phase 54 |

### Bekannte Threat-Muster

| Pattern | STRIDE | Standard-Mitigation |
|---------|--------|---------------------|
| Admin-Link ohne Capability-Check | Elevation of Privilege | `canAccessAdmin`-Prop aus Backend-Capabilities (D-15); Route selbst bleibt server-seitig geschützt |
| Token in UI-Props | Information Disclosure | Token-free UI Boundary per `auth-api-client.md` — kein `authToken` als Prop |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `/fansubs` als Nav-Ziel: Empfehlung `disabled` weil nur `[slug]`-Route existiert | Codebase-Befunde | Link landet in 404 wenn doch implementiert und verlinkt wird |
| A2 | `resolveApiUrl` muss für `avatar.public_url` aufgerufen werden (aus page.tsx Muster) | Code Examples | Avatar-Bild lädt nicht wenn URL relativ und kein Base-URL-Prefix |
| A3 | Auth-Routen `/auth/register` existiert als Registrierungsseite | Anonym-Footer Code | Link landet in 404 wenn Route anders heißt |

---

## Open Questions

1. **Soll `/fansubs`-Nav-Link `disabled` sein oder ganz weggelassen werden?**
   - Was wir wissen: Keine `/fansubs`-Listenseite existiert (nur `/fansubs/[slug]`)
   - Was unklar ist: Ob eine Listenseite bald kommt oder ob der Link dauerhaft entfällt
   - Empfehlung: In Phase 54 als `disabled` mit Badge `bald` aufnehmen — gleiches Muster wie Dashboard

2. **Welche Route zeigt der "Suche"-Link?**
   - Was wir wissen: Keine `/search`-Route existiert
   - Was unklar ist: Ob eine Suchroute in naher Zukunft kommt
   - Empfehlung: Suche-Link aus Phase 54 herauslassen oder ebenfalls `disabled` markieren

3. **Muss `resolveApiUrl` für den Avatar-URL aufgerufen werden?**
   - Was wir wissen: `page.tsx` nutzt `resolveApiUrl(profile?.avatar?.public_url || '')`, die Funktion ist in `api.ts` exportiert
   - Was unklar ist: Ob `public_url` absolut oder relativ ist (Produktions- vs. Dev-URL-Verhalten)
   - Empfehlung: Gleiche Pattern wie `page.tsx` nutzen — `resolveApiUrl` im Client-Wrapper aufrufen

4. **Gibt es eine `AppShellProps`-Erweiterung für `avatarUrl`?**
   - Was wir wissen: `AppShellUser` hat aktuell `displayName?` und `email?`
   - Was unklar ist: Ob `avatarUrl` zu `AppShellUser` hinzugefügt wird oder ein separates Prop wird
   - Empfehlung: `avatarUrl?: string | null` zu `AppShellUser` hinzufügen — minimale Type-Erweiterung

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/layout/AppShell.tsx` — vollständige aktuelle Shell-Implementierung gelesen
- `frontend/src/components/layout/AppShell.module.css` — vollständige CSS gelesen, Breakpoints und Klassen verifiziert
- `frontend/src/components/layout/AppShell.test.tsx` — alle 5 bestehenden Tests gelesen
- `frontend/src/app/layout.tsx` — aktuelle Root-Layout-Struktur gelesen
- `frontend/src/app/me/profile/page.tsx` — AppShell-Einbindung auf Zeile 287 verifiziert
- `frontend/src/lib/useAuthSession.ts` — Token-free Auth-Hook gelesen
- `frontend/src/lib/api.ts` (Zeile 2611–2635) — `getOwnProfile`-Implementierung gelesen
- `frontend/src/types/profile.ts` — `MemberProfileData` komplett gelesen, `avatar?.public_url` verifiziert
- `frontend/src/styles/globals.css` — Z-Index-Tokens, Spacing-Scale gelesen
- `frontend/src/components/ui/Drawer.tsx` — generischer Drawer-Primitive gelesen
- `frontend/src/components/media/crop/mediaCropA11y.ts` — `getFocusableElements` verifiziert
- `frontend/src/app/dev/ui-system/page.tsx` — Playground-Struktur und bestehende Drawer-Demo gelesen
- `docs/frontend/ui-system.md` — GDS-Regeln und Drawer-Regeln gelesen
- `docs/frontend/auth-api-client.md` — Token-free UI Boundary Regeln gelesen
- Verzeichnisstruktur `frontend/src/app/` — Routen `/anime`, `/fansubs`, `/search` verifiziert

### Secondary (MEDIUM confidence)
- `54-CONTEXT.md` — alle Entscheidungen D-01 bis D-19 als Constraints verifiziert
- `54-UI-SPEC.md` — Glassmorphism-Werte, Breakpoints, Z-Index, Copywriting-Contract gelesen

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Packages und Utilities in Codebase verifiziert
- Architecture: HIGH — bestehender Code vollständig gelesen, Patterns extrahiert
- Pitfalls: HIGH — konkrete Bugs aus Codebase-Analyse (falscher Feldname, fehlende Route)
- Test Map: MEDIUM — Framework verifiziert, konkrete Testdatei-Struktur wird in Wave 0 definiert

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (30 Tage — stabiler Stack, keine sich schnell ändernden Abhängigkeiten)
