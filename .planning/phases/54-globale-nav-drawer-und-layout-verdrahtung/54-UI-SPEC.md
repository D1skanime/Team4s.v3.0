---
phase: 54
slug: globale-nav-drawer-und-layout-verdrahtung
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-28
---

# Phase 54 — UI Design Contract

> Visueller und Interaktionsvertrag für Phase 54: Globale Nav Drawer und Layout Verdrahtung.
> Generiert von gsd-ui-researcher. Überprüfung durch gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (CSS Modules + custom tokens) |
| Preset | nicht zutreffend |
| Component library | keine (projekt-eigene `src/components/ui`) |
| Icon library | lucide-react |
| Font | Inter, "Segoe UI", system-ui, sans-serif (aus globals.css) |

Quelle: `frontend/src/styles/globals.css`, `docs/frontend/ui-system.md`

---

## Spacing Scale

Deklarierte Werte — ausschließlich Vielfache von 4:

| Token | Wert | Verwendung |
|-------|------|-----------|
| xs | 4px | Icon-Abstände, Inline-Padding |
| sm | 8px | Kompakter Element-Abstand |
| md | 16px | Standard-Element-Abstand, Edge-Strip-Breite (D-02) |
| lg | 24px | Drawer-Innenabstand (vertikal), Gruppen-Gap |
| xl | 32px | Layout-Lücken |
| 2xl | 48px | Große Abstandszonen |
| 3xl | 64px | Seiten-Spacing |

Quelle: `--space-1` bis `--space-8` in globals.css (4, 8, 12, 16, 24, 32, 48, 64px)

Ausnahmen:
- Desktop Edge-Strip: exakt 16px Breite (D-02, `--space-4`)
- Drawer-Gesamtbreite: 260px (aus bestehendem `.sidebar` `minmax(220px, 260px)`)
- Avatar im Drawer-Footer: 36–40px Durchmesser (rund, `border-radius: 50%`)
- Mobile Burger-Button: Mindesthöhe 40px Tap-Target (aus bestehendem `.mobileNavButton`)
- Nav-Item Mindesthöhe: 40px (4 × 10 — auf Vielfaches von 4 gerundet, konsistent mit Burger-Button)

---

## Typography

| Rolle | Größe | Gewicht | Zeilenhöhe |
|-------|-------|---------|-----------|
| Body | 16px | 400 | 1.5 |
| Label / Nav-Item / Display Name (Footer) | 14.4px (0.9rem) | 700 | 1.4 |
| Nav-Group-Label | 11.5px (0.72rem) | 700 | 1.2 |
| E-Mail / Subtitle (Footer) | 12.5px (0.78rem) | 400 | 1.3 |

Quelle: Bestehende `AppShell.module.css` Werte — nicht neu spezifiziert, bestehende Skala beibehalten.
Display Name Footer wurde auf 14.4px vereinheitlicht (war 15.4px — kein wahrnehmbarer visueller Unterschied zu Nav-Item). Gewicht 650 entfernt; alle fetten Elemente verwenden 700.

---

## Color

| Rolle | Wert | Verwendung |
|-------|------|-----------|
| Dominant (60%) | `#f8fafc` / `rgba(248,250,252,0.96)` | Seiten-Hintergrundfläche hinter Drawer |
| Secondary (30%) | `rgba(255,255,255,0.82)` | Drawer-Hintergrund (Glassmorphism) |
| Accent (10%) | `#5f84dd` (`--color-primary`) | Aktiver Nav-Item-Hintergrund, Anmelden-Button |
| Destructive | nicht zutreffend in Phase 54 | — |

Glassmorphism-Werte für den Drawer (D-05):
- `background: rgba(255, 255, 255, 0.85)` (Drawer-Body, Desktop + Mobile)
- `backdrop-filter: blur(16px)`
- `border-right: 1px solid var(--border-subtle)` (Desktop-Drawer-Kante)

Desktop Edge-Strip (D-02):
- `background: rgba(255, 255, 255, 0.35)` — barely sichtbar, bewusst dezent
- `backdrop-filter: blur(8px)`
- Breite: 16px
- Hover/Fokus: blendet den vollen Drawer ein

Mobile Header (bestehend, unverändert):
- `background: rgba(255, 255, 255, 0.94)`
- `backdrop-filter: blur(12px)`

Overlay/Backdrop hinter offenem Drawer (Mobile):
- `background: rgba(0, 0, 0, 0.35)` — schließt den Drawer per Klick (D-07, D-18)

Accent reserviert für:
- Aktiver Nav-Link-Hintergrund: `rgba(47, 95, 227, 0.12)` + Text `var(--color-primary)`
- Nav-Item-Hover: `rgba(47, 95, 227, 0.08)`
- "Anmelden"-Button (Primary) im anonymen Footer
- Focus-Ring auf interaktiven Drawer-Elementen

Quelle: D-05, bestehende `AppShell.module.css`, globals.css

---

## Komponenten-Inventar

### Drawer-Struktur

**Anonym-Zustand (D-08, D-09)**

Drawer enthält:
1. Branding-Header: Team4s-Logo-Bild + Titeltext "Team4s" (D-06)
2. Nav-Gruppe "Entdecken":
   - Anime entdecken → `/anime`
   - Fansub-Gruppen → `/fansubs`
   - Suche (Link zur Suchroute, falls existent — vor Implementierung prüfen)
3. Footer: zwei Buttons nebeneinander
   - "Anmelden" (primary, `--button-primary-*`)
   - "Registrieren" (secondary/outline, `--button-secondary-*`)

**Eingeloggt-Zustand (D-08)**

Drawer enthält:
1. Branding-Header: Team4s-Logo-Bild + Titeltext (D-06)
2. Nav-Gruppen (aus bestehendem `AppShellNavGroups`):
   - "Entdecken": Anime entdecken (`/anime`), Fansub-Gruppen (`/fansubs`)
   - "Verwaltung": Verwaltung (`/admin`) — nur wenn `canAccessAdmin === true` (D-15)
   - "Mein Bereich": Mein Profil (`/me/profile`), Meine Gruppen (disabled, Badge "bald"), Meine Beiträge (disabled, Badge "bald") (D-14)
   - "Einstellungen": Account & Sicherheit (`/auth`)
3. Footer: Avatar-Bild rund (36–40px) + Anzeigename (fett, 14.4px) + E-Mail (gedimmt, 12.5px)
   - Initialen-Fallback-Circle wenn `avatar_url` null/leer (D-16)
   - Avatar-URL aus `getOwnProfile` → Feld `avatar_url` (D-17)

### Desktop Edge-Strip (D-02, D-04)

- Festes Element am linken Bildschirmrand
- Breite: 16px
- Position: `fixed`, volle Höhe, `z-index: var(--z-drawer)` (80)
- Trigger: `onMouseEnter` öffnet Drawer, `onMouseLeave` schließt Drawer
- Tastatur: fokussierbar, `Enter` öffnet Drawer, `Escape` oder Focus-Verlust schließt (D-04, D-18)
- `aria-expanded`, `aria-controls="team4s-nav-drawer"` (D-19)
- Sichtbarer Focus-State: `outline: 2px solid var(--focus-outline)` (D-19)

### Mobile Burger-Button (D-03, D-19)

- Bestehender `.mobileNavButton` im `.mobileHeader`
- `aria-expanded` wird zu true/false gesetzt (bereits implementiert)
- `aria-controls="team4s-mobile-nav"` (bereits implementiert)
- Mindest-Tap-Target: 40px Höhe (bereits implementiert)

### Drawer-Overlay (D-07, D-18)

- Backdrop hinter offenem Drawer auf Mobile: halbtransparentes Overlay
- Klick auf Backdrop → Drawer schließt
- ESC → Drawer schließt (D-07)
- Focus-Trap im offenen Drawer (D-18)

---

## Interaktionsvertrag

### Drawer-Öffnungs- und Schließmechanismus

| Trigger | Plattform | Aktion |
|---------|-----------|--------|
| Burger-Button klicken | Mobile (≤860px) | Drawer öffnet/schließt |
| Edge-Strip hover | Desktop (>860px) | Drawer öffnet |
| Maus verlässt Drawer | Desktop | Drawer schließt |
| Edge-Strip fokussieren + Enter | Desktop | Drawer öffnet (D-04) |
| Fokus verlässt Drawer | Desktop | Drawer schließt |
| ESC-Taste | Alle | Drawer schließt (D-07) |
| Backdrop klicken | Mobile | Drawer schließt (D-07) |

### Drawer-Animation

- `transform: translateX(-100%)` (geschlossen) → `translateX(0)` (offen)
- Übergang: CSS `transition: transform 200ms ease-out`
- Keine gesonderte Easing-Kurve oder Elastizität — deferred (aus `<deferred>` in CONTEXT.md)

### Focus-Trap

- Wenn Drawer offen: Tab/Shift+Tab bleibt innerhalb des Drawers
- Erstes fokussierbares Element: Burger-Button (Mobile) / erster Nav-Link (Desktop)
- Schließen via ESC gibt Fokus zurück an das auslösende Element

---

## Copywriting Contract

| Element | Text |
|---------|------|
| Branding-Titel | Team4s |
| Anonym-Footer CTA 1 (primary) | Anmelden |
| Anonym-Footer CTA 2 (secondary) | Registrieren |
| Nav-Gruppe anonym | Entdecken |
| Nav-Link Anime | Anime entdecken |
| Nav-Link Fansub | Fansub-Gruppen |
| Nav-Link Suche | Suche |
| Nav-Gruppe eingeloggt 1 | Entdecken |
| Nav-Gruppe eingeloggt 2 | Verwaltung |
| Nav-Gruppe eingeloggt 3 | Mein Bereich |
| Nav-Gruppe eingeloggt 4 | Einstellungen |
| Nav-Link Dashboard (disabled) | Dashboard |
| Badge disabled | bald |
| Nav-Link Meine Gruppen (disabled) | Meine Gruppen |
| Nav-Link Meine Beiträge (disabled) | Meine Beiträge |
| Nav-Link Profil | Mein Profil |
| Nav-Link Admin | Verwaltung |
| Nav-Link Account | Account & Sicherheit |
| aria-label Drawer | Team4s Navigation |
| aria-label Hauptnav Desktop | Hauptnavigation |
| aria-label Hauptnav Mobile | Hauptnavigation mobil |
| Burger-Button Text | Navigation |
| Initialen-Fallback (kein Avatar) | Erster Buchstabe von displayName oder E-Mail, Großbuchstabe |
| Anonymer Nutzer-Fallback (kein displayName) | Angemeldetes Mitglied |
| Anonymer Mail-Fallback | Team4s Account |

Umlaut-Regel (aus CLAUDE.md): Alle deutschen UI-Strings verwenden korrekte Umlaute (ä, ö, ü, ß). ASCII-Ersatzformen sind verboten.

Leerer Zustand: nicht zutreffend — Drawer ist immer mit Inhalt gefüllt (anonym oder eingeloggt).
Fehlerzustand im Drawer: nicht zutreffend für Phase 54 (Avatar-Fehler → stille Initialen-Fallback, kein UI-Fehler).
Destruktive Aktionen: keine in Phase 54.

---

## Breakpoints und Verhalten

| Breakpoint | Verhalten |
|-----------|-----------|
| ≤860px (Mobile) | Sidebar ausgeblendet, Mobile-Header + Burger-Button sichtbar, Drawer als Slide-over-Overlay |
| >860px (Desktop) | Mobile-Header ausgeblendet, 16px Edge-Strip fix am linken Rand, Drawer hover-aktiviert |

Quelle: Bestehender Breakpoint `@media (max-width: 860px)` in `AppShell.module.css`

---

## Z-Index-Hierarchie

Aus globals.css (`--z-*`):

| Layer | Z-Index | Verwendung |
|-------|---------|-----------|
| `--z-sticky` | 40 | Mobile Header |
| `--z-drawer` | 80 | Drawer + Edge-Strip |
| `--z-modal` | 90 | (nicht in Phase 54) |

Backdrop-Overlay bei Mobile-Drawer: z-index 79 (unter Drawer, über Content)

---

## Server-/Client-Component-Grenze (D-11, D-13)

- `AppShell` bleibt `'use client'`
- Root-Layout (`frontend/src/app/layout.tsx`) ist Server Component
- Integration via dedizierten Client-Wrapper `AppShellClientWrapper` (neues File, `'use client'`)
- Wrapper importiert AppShell und übergibt auth-relevante Props (`mode`, `user`, `canAccessAdmin`)
- Avatar-Daten: `getOwnProfile` wird clientseitig im Wrapper aufgerufen (D-17)

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | keine | nicht zutreffend |
| third-party | keine | nicht zutreffend |

Keine externen Komponenten-Registries werden in Phase 54 verwendet. Alle UI-Bausteine sind projekt-eigen.

---

## Entwicklungs- und Teststrategie

Kein separater Playground erforderlich. `/me/profile` nutzt AppShell bereits direkt und dient als natürliche Entwicklungs-Testfläche.

**Inkrementelle Integration — Schritte:**

1. Drawer-Logik in `AppShell.tsx` und `AppShell.module.css` iterieren
2. Live-Test via `/me/profile` (eingeloggt) — zeigt Slide-over, Dual-State, Avatar sofort
3. Desktop Edge-Strip Hover-Verfeinerung dort
4. Erst nach stabiler Drawer-Implementierung: Root-Layout-Integration (`layout.tsx`) für alle Seiten
5. Smoke-Test auf einer öffentlichen Route (z.B. `/anime`) für den anonymen Drawer-Zustand

Begründung: Root-Layout zu früh zu ändern würde alle Seiten gleichzeitig beeinflussen (hoher Blast-Radius). Der inkrementelle Ansatz begrenzt das Risiko.

**Migrationsreihenfolge (D-12):**
Nach Root-Layout-Integration: Eigeninkludierung von AppShell aus `frontend/src/app/me/profile/page.tsx` entfernen, um doppelte Shell zu verhindern.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Freigabe:** ausstehend
