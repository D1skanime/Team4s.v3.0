# Phase 54: Globale Nav Drawer und Layout Verdrahtung - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 54 macht die globale App-Shell zu einem seitenweiten Drawer-Navigationssystem.

Diese Phase liefert:
- Einen echten Slide-over-Drawer, der die aktuelle Inline-Mobile-Nav-Panel-Lösung ersetzt
- Ein hover-aktiviertes Desktop-Drawer-Verhalten (dünner Glasrand → Drawer klappt aus)
- Einbindung der AppShell ins Root-Layout für seitenweite Präsenz
- Dual-State-Drawer: anonym (Login/Registrieren + Public-Nav) vs. eingeloggt (Nutzer-Profil + vollständige Nav)
- Echtes Avatar-Bild aus der Profil-API im eingeloggten Drawer-Footer

Diese Phase liefert nicht:
- Neue Routen für Dashboard, Meine Gruppen, Meine Beiträge (bleiben 'bald')
- Content-Redesigns auf bestehenden Seiten
- Neue Backend-Endpunkte (Profil-API existiert bereits)
- Umbau der Admin-Navigation-Logik
- Vollständige App-weite Migration aller Seiten auf neue Page-Strukturen

</domain>

<decisions>
## Implementation Decisions

### Drawer-Mechanismus

- **D-01:** Der mobile Drawer ist ein echter Slide-over Overlay, der von links über den Content schiebt. Kein Inline-Panel mehr unter dem Header.
- **D-02:** Auf Desktop erscheint ein dünner Glasrand (Edge-Strip) am linken Rand. Beim Hover oder Fokus auf diesen Strip klappt der Drawer aus, der Content dahinter wird geblurrt. Wenn die Maus den Drawer verlässt oder der Fokus wechselt, schließt er sich wieder.
- **D-03:** Auf Mobile gibt es weiterhin einen Burger-Button im Header, der den Drawer öffnet und schließt.
- **D-04:** Der Hover-Trigger auf Desktop ist AUCH per Tastatur (Fokus + Enter) bedienbar. Keine reinen Hover-only-Aktionen (D-39 aus Phase 53 bleibt gültig).
- **D-05:** Der gesamte Drawer (nicht nur der Header) ist halbtransparent/Glassmorphism — `backdrop-filter: blur(...)` mit `background: rgba(..., 0.X)`. Kein opaker Hintergrund.
- **D-06:** Oben im Drawer: Team4s-Branding mit Logo-Bild und Titel (Team4s-Logo-Bild und Titeltext, nicht ein Nutzer-Bannerbild).
- **D-07:** ESC schließt den Drawer. Klick auf den Backdrop (Bereich außerhalb des Drawers wenn offen) schließt ihn. Focus-Trap innerhalb des offenen Drawers.

### Auth-Zustand im Drawer

- **D-08:** Der Drawer ist dual-state: `anonymous` und `authenticated`.
  - Anonym: Footer zeigt **Login**- und **Registrieren**-Buttons (leiten zu den bestehenden Auth-Seiten weiter); Navigation zeigt Public-Bereich-Links.
  - Eingeloggt: Footer zeigt **Nutzer-Avatar + Anzeigename + E-Mail** (wie der aktuelle User-Footer); Navigation zeigt vollständige eingeloggte Nav-Gruppen.
- **D-09:** Die anonyme Navigation zeigt: Anime-Katalog (`/anime`), Fansub-Gruppen (`/fansubs`), Suche. Nur real existierende/sinnvolle Ziele — keine Fake-Links.
- **D-10:** Auth-Seiten (`/auth/*`) bekommen den Drawer ebenfalls (durch Root-Layout-Integration). Dort zeigt der Drawer den anonymen Zustand (Login/Registrieren im Footer).

### Shell-Migrationsreichweite

- **D-11:** Die AppShell wird in `frontend/src/app/layout.tsx` (Root-Layout) eingebaut. Damit bekommen alle Seiten automatisch den Drawer, ohne dass jede Seite ihn selbst einbinden muss.
- **D-12:** `/me/profile` bindet AppShell aktuell noch selbst ein. Nach Migration auf Root-Layout muss die Eigeninkludierung aus `page.tsx` entfernt werden, um Doppel-Shell zu vermeiden.
- **D-13:** Die Server-Component/Client-Component-Grenze im Root-Layout muss beachtet werden: AppShell ist `'use client'`. Die Integration erfolgt über einen dedizierten Client-Wrapper, der im Root-Layout (Server Component) genutzt wird.

### Nav-Link-Aktivierung

- **D-14:** `Dashboard`, `Meine Gruppen` und `Meine Beiträge` bleiben in Phase 54 als `disabled` mit Badge `bald` erhalten. Keine neuen Routen für diese Items.
- **D-15:** Der Verwaltungs-Link (`/admin`) bleibt capability-gated: nur sichtbar wenn `canAccessAdmin` true.

### User-Footer-Avatar (eingeloggter Zustand)

- **D-16:** Der Drawer-Footer zeigt im eingeloggten Zustand das echte Profilavatar-Bild aus `GET /api/v1/me/profile` (Feld `avatar_url`). Initialen-Fallback bleibt wenn `avatar_url` null/leer ist.
- **D-17:** Die Avatar-URL wird über den bestehenden `getOwnProfile`-Aufruf aus `frontend/src/lib/api.ts` bezogen. Kein separater API-Aufruf nur für die Shell.

### Accessibility und Verhalten

- **D-18:** Der offene Drawer muss einen Focus-Trap haben. ESC schließt. Klick auf Backdrop schließt. Kein Hover-only-Trigger ohne Tastatur-Äquivalent.
- **D-19:** Mobile-Burger-Button und Desktop-Edge-Strip müssen `aria-expanded`, `aria-controls` und sichtbare Fokuszustände haben.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestehende Shell-Implementierung
- `frontend/src/components/layout/AppShell.tsx` — zu erweiternde Shell-Komponente (Slide-over Drawer, Dual-State, Glassmorphism)
- `frontend/src/components/layout/AppShell.module.css` — bestehende Shell-Styles (Mobile-Breakpoint bei 860px, Sidebar-Grid, Mobile-Nav-Panel)
- `frontend/src/components/layout/AppShell.test.tsx` — bestehende Tests, müssen nach Umbau grün bleiben

### Root-Layout und Integration
- `frontend/src/app/layout.tsx` — wird modifiziert, um AppShell seitenweit einzubinden
- `frontend/src/app/me/profile/page.tsx` — aktueller AppShell-Consumer, muss nach Root-Layout-Migration bereinigt werden

### Prior Phase Context
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md` — Shell-Architektur-Entscheidungen D-45 bis D-55, insbesondere D-45 (globale Shell), D-47 (Nav-Referenz), D-48 (Migration schrittweise), D-50 (Mobile-Härtung)

### Profil-API und Avatar
- `frontend/src/lib/api.ts` — `getOwnProfile` für Avatar-URL und Nutzerdaten
- `frontend/src/types/profile.ts` — `MemberProfileData` mit `avatar_url`
- `shared/contracts/openapi.yaml` — `GET /api/v1/me/profile` Contract

### Auth-Seam
- `frontend/src/lib/useAuthSession.ts` (oder äquivalent) — Auth-Status für Dual-State-Erkennung im Drawer
- `docs/frontend/auth-api-client.md` — zentrale Auth/API-Seam, Token-free UI Boundary

### UI und GDS
- `docs/frontend/ui-system.md` — GDS-Richtung für Glassmorphism, Overlay, Backdrop
- `frontend/src/components/ui` — GDS-Bausteine die ggf. für Drawer-Overlay/Backdrop wiederverwendet werden können

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/layout/AppShell.tsx`: Vollständige Shell mit Nav-Gruppen, Dual-State-Prop (`mode`), Mobile-Toggle-State. Muss um Slide-over-Logik, Backdrop, Edge-Strip und Avatar-Bild erweitert werden.
- `frontend/src/components/layout/AppShell.module.css`: Mobile-Breakpoint bei 860px, bestehende `.mobileNav`/`.mobileNavOpen`-Klassen als Ausgangspunkt für Drawer-Animation.
- `frontend/src/lib/api.ts`: `getOwnProfile` liefert bereits `avatar_url`; kein neuer API-Aufruf nötig.

### Established Patterns
- AppShell ist `'use client'` — Server/Client-Boundary muss im Root-Layout-Umbau berücksichtigt werden.
- `useAuthSession` Hook für Auth-Status im Client-Kontext.
- CSS Modules für colocated Shell-Styles.
- Bestehende `canAccessAdmin`-Prop-Logik für capability-gated Nav bleibt erhalten.

### Integration Points
- `frontend/src/app/layout.tsx` (Root) — AppShell-Wrapper hier einbauen.
- `frontend/src/app/me/profile/page.tsx` — Eigeninkludierung von AppShell nach Root-Layout-Migration entfernen.
- Mobile-Header-Breakpoint (`≤860px`) stimmt mit bestehender CSS überein.
- Anonyme Nav-Ziele: `/anime` (existiert), `/fansubs` (prüfen ob Route existiert), Suche (prüfen ob Suchroute existiert).

</code_context>

<specifics>
## Specific Ideas

### Drawer-Design-Referenz
- Gesamter Drawer halbtransparent (Glassmorphism): `background: rgba(255,255,255,0.85)`, `backdrop-filter: blur(16px)` o.ä.
- Desktop: dünner Glasrand (~4-8px) am linken Bildschirmrand als Hover-Trigger, der beim Hover/Fokus den vollen Drawer einblendet.
- Desktop-Hover-Mechanismus: CSS-Transitions oder JS-onMouseEnter/onMouseLeave, zusätzlich Fokus-Event für Tastaturzugang.
- Inhalt hinter Drawer auf Desktop: `filter: blur(...)` oder `backdrop-filter`-Overlay, wenn Drawer offen.
- User-Referenz: "wie beim epby" — Slide-out Sidebar die bei Hover/Touch-Nähe aufklappt.

### Dual-State Drawer Footer
- **Anonym-Footer**: Zwei Buttons nebeneinander — "Anmelden" (primary) und "Registrieren" (secondary/outline). Links zu bestehenden Auth-Seiten.
- **Eingeloggt-Footer**: Rundes Avatar-Bild (32–40px) + `displayName` (fett) + `email` (gedimmt). Initialen-Fallback-Circle wenn kein Avatar.

### Public-Nav für anonyme Nutzer
- Zeigt Sektion "Entdecken" mit: Anime entdecken (`/anime`), Fansub-Gruppen (`/fansubs`), Suche.
- Keine deaktivierten "Mein Bereich"-Items für anonyme Nutzer (nicht relevant/verwirrend).

</specifics>

<deferred>
## Deferred Ideas

- Neue Routen für Dashboard (`/me` oder `/dashboard`), Meine Gruppen (`/me/groups`), Meine Beiträge (`/me/contributions`) — bleiben als 'bald' bis eigene Phase.
- Vollständige App-weite Content-Redesigns bestehender Seiten für die neue Shell-Ästhetik.
- Drawer-Animation-Details (Easing, Geschwindigkeit, Elastizität) — technische Entscheidung des Planers.
- Login/Registrieren-Flows inline im Drawer (aktuell: nur Links zu den Auth-Seiten).
- Suche inline im Drawer (falls keine bestehende Suchroute existiert — prüfen vor Implementierung).
- Custom Keycloak Account Console Theme.

</deferred>

---

*Phase: 54-globale-nav-drawer-und-layout-verdrahtung*
*Context gathered: 2026-05-28*
