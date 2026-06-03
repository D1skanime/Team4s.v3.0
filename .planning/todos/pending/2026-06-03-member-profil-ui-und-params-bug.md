---
created: 2026-06-03T08:40:00.000Z
title: Member-Profil-Seite — UI-Politur + params.id-Korrektheitsbug
area: ui
files:
  - frontend/src/app/members/[slug]/ (Member-Profil-Seite, params.id)
  - frontend/src/components/ (MemberBadgeChips, Rollen-Timeline-Sektion)
---

## Problem

Beim Live-UAT (2026-06-03) auf `/members/uat66-claim-202952` gefunden:

### Code-Bug (Korrektheit, vorrangig)
- **`params.id` wird synchron zugegriffen** statt mit `React.use(params)` ausgepackt
  (Next.js: `params` ist ein Promise). Vielfache Konsolen-Errors
  ("A param property was accessed directly with `params.id`"). Wird in künftigen
  Next-Versionen brechend. → das sind die „2 Issues" im Dev-Overlay.

### UI/UX
- **Badge-Chips mit „Ausblenden"-Link drangeklebt** ("+ Erster Beitrag Ausblenden",
  "✓ Verifiziert Ausblenden") — Verwaltungsaktion direkt auf der profilartigen Anzeige,
  optisch überladen. Gleiches „Edit-auf-Anzeige"-Muster wie bei den Meilensteinen:
  Verwalten gehört in den Bearbeiten-Kontext, die Anzeige bleibt clean.
- **„Rollen-Timeline"-Sektion** rendert als grauer Kasten mit sehr niedrigem Kontrast
  (kaum lesbar) + loser „–" links — wirkt unfertig/Placeholder.
- **Medienbild** ("Medienbild zu Naruto") verzerrt/kaputt; Konsolen-Warnung
  "width or height modified, but not the other" (Aspect-Ratio). Evtl. zusätzlich
  falsche/relative Bild-URL prüfen.

## Solution

In der UI-Phase (`/gsd:ui-phase`) zusammen mit den anderen UI-Todos:
1. **params.id-Bug zuerst** (Korrektheit): `const { id } = React.use(params)` o. ä.;
   kann auch als kleiner Quick-Fix vorgezogen werden.
2. Badge-Chips: „Ausblenden" nur im Owner-/Bearbeiten-Kontext, nicht auf der
   (öffentlichen) Profilanzeige; Chips an `@/components/ui`-Tokens ausrichten.
3. Rollen-Timeline-Sektion: Kontrast/Styling fixen, losen „–" entfernen, an
   `/dev/ui-system` ausrichten.
4. Medienbild: Aspect-Ratio korrekt setzen (width+height bzw. CSS auto), Bild-URL prüfen.
