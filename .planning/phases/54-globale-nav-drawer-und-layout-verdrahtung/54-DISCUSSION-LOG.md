# Phase 54: Globale Nav Drawer und Layout Verdrahtung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 54-globale-nav-drawer-und-layout-verdrahtung
**Areas discussed:** Drawer-Mechanismus, Shell-Migrationsreichweite, Nav-Link-Aktivierung, User-Footer-Avatar, Login/Registrieren im Drawer, Drawer-Headerbild

---

## Drawer-Mechanismus

| Option | Description | Selected |
|--------|-------------|----------|
| Echter Slide-over Drawer | Von links über Content, Backdrop, ESC, Focus-Trap, Keyboard | ✓ |
| Verbessertes Inline-Panel | Bleibt im DOM-Fluss unter Header, kein Overlay | |
| Full-Screen Overlay auf Mobile | Deckt gesamten Viewport ab | |

**User's choice:** Echter Slide-over Drawer

---

## Drawer-Design (Glassmorphism)

| Option | Description | Selected |
|--------|-------------|----------|
| Gradient-Banner mit Branding | Dunkler Verlauf, Team4s-Branding, kein echtes Bild | |
| Profilbanner-Bild des Nutzers | Nutzerbannerbild aus Profil-API als Hintergrund | |
| Dezentes Ghost/Glassmorphism-Header | Halbtransparenter Header-Bereich | |
| Du entscheidest | Technische Stilentscheidung | |
| Gesamter Drawer halbtransparent | Kompletter Glassmorphism-Drawer (freitext) | ✓ |

**User's choice (freitext):** "Kompletter drawer ist halb transparent nicht nur Header. Das Profilbild ist unten im Header-Bereich, oben wäre dann das Logo/Banner von der Webseite Team4s selber — also Titel und Logo-Bild."

**Notes:** Der gesamte Drawer (nicht nur Header) erhält Glassmorphism. Oben im Drawer: Team4s-Logo + Titel. Unten: Nutzerprofil (eingeloggt) oder Login/Register (anonym). Kein Nutzer-Bannerbild als Drawer-Hintergrund.

---

## Desktop-Drawer-Verhalten

| Option | Description | Selected |
|--------|-------------|----------|
| Drawer nur auf Mobile | Desktop behält permanente Sidebar | |
| Drawer ersetzt Sidebar komplett | Kein permanentes Sidebar mehr | |
| Drawer auch auf Desktop optional | Sidebar bleibt + optionaler erweiterter Drawer | |
| Hover-Aktivierung via Edge-Strip (freitext) | Dünner Glasrand, bei Hover klappt Drawer aus | ✓ |

**User's choice (freitext):** "Ich stelle mir das so vor wie beim epby — nur ein leichter Glasrand am Rand, wenn man mit der Maus drauf geht klappt er aus, Content wird blurry, wenn Maus weg geht verschwindet der Drawer wieder."

**Notes:** Desktop: permanente Sidebar wird durch Hover-aktivierten Edge-Strip ersetzt. Drawer öffnet bei Hover/Fokus, schließt bei Mouse-off/Blur. Content-Bereich wird geblurrt wenn Drawer offen.

---

## Hover-Accessibility

| Option | Description | Selected |
|--------|-------------|----------|
| Hover + Tastatur/Klick bedienbar | Fokus/Enter öffnet; Touch hat Burger-Button | ✓ |
| Hover-only auf Desktop | Nur Maus-Hover; kein Tastatur-Zugang | |

**User's choice:** Hover öffnet, aber auch per Tastatur/Klick bedienbar

---

## Auth-Zustand im Drawer

| Option | Description | Selected |
|--------|-------------|----------|
| Genau richtig | Anonym-Footer: Login/Register; Eingeloggt-Footer: Avatar + Name | ✓ |
| Nicht ganz | Andere Erwartung | |

**User's choice:** Genau richtig — Dual-State-Footer bestätigt.

---

## Shell-Migrationsreichweite

| Option | Description | Selected |
|--------|-------------|----------|
| /me/* via Layout.tsx | Layout unter /me/ für alle /me/... Seiten | |
| Nur /me/profile bleibt wie es ist | Keine Migration | |
| Auch Admin-Seiten migrieren | /admin/* bekommt neue Shell | |
| Absolut jede Seite (freitext) | Alle Seiten sollen den Drawer haben | ✓ |

**User's choice (freitext):** "Einfach absolut auf jeder Seite muss es den geben."

---

## Root-Layout-Architektur

| Option | Description | Selected |
|--------|-------------|----------|
| Root layout.tsx — globale Shell | AppShell in root layout.tsx, alle Seiten automatisch | ✓ |
| Route-Group (app)-Layout | (app)-Ordner mit eigenem layout.tsx | |
| Jede Seite selbst | Aufwendig, konsistent mit aktuellem Ansatz | |

**User's choice:** Root layout.tsx — globale Shell

---

## Nav-Link-Aktivierung

| Option | Description | Selected |
|--------|-------------|----------|
| Meine Gruppen → /me/groups | Neue Route anlegen | |
| Dashboard → /me oder /dashboard | Echtes Dashboard | |
| Meine Beiträge → /me/contributions | Neue Contributions-Route | |
| Alle 3 bleiben 'bald' | Phase 54 fokussiert auf Drawer/Shell | ✓ |

**User's choice:** Alle 3 bleiben 'bald'

---

## Anonyme Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Anime-Katalog + Fansub-Gruppen + Suche | /anime, /fansubs, Suche | ✓ |
| Nur Anime-Katalog | Einfacher, ein Link | |
| Gleiche Nav wie eingeloggt, deaktiviert | Zeigt Plattform-Möglichkeiten | |

**User's choice:** Anime-Katalog + Fansub-Gruppen + Suche

---

## User-Footer-Avatar

| Option | Description | Selected |
|--------|-------------|----------|
| Echtes Avatar-Bild aus Profil-API | avatar_url aus GET /api/v1/me/profile | ✓ |
| Initialen-Fallback bleibt | Kein Avatar, kein zusätzlicher API-Aufruf | |
| Du entscheidest | Technische Wahl | |

**User's choice:** Echtes Avatar-Bild aus Profil-API

---

## Claude's Discretion

- Drawer-Animation-Details (Easing, Geschwindigkeit, Transition-Dauer) — nicht explizit besprochen, technische Entscheidung des Planers.
- Exakte Breite des aufgeklappten Drawers auf Desktop — Frage vom User abgebrochen, technisch zu entscheiden.
- Server/Client-Component-Grenzstrategie für Root-Layout-Integration — technische Architekturentscheidung.

## Deferred Ideas

- Neue Routen: Dashboard, Meine Gruppen, Meine Beiträge
- Login/Registrieren-Flows inline im Drawer
- Suche inline im Drawer
- App-weite Content-Redesigns
- Custom Keycloak Account Theme
