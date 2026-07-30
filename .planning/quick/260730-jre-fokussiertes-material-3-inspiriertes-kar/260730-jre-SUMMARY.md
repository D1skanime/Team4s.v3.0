---
status: complete
phase: quick-260730-jre
plan: 01
subsystem: public-ui
tags: [carousel, accessibility, responsive, badges, fansub-projects]
requires: []
provides:
  - Generic FocalCarousel interaction primitive
  - Responsive member-badge focal cards
  - Shared fansub-project focal carousel
affects: [public-member-profile, public-fansub-profile, ui-system]
tech-stack:
  added: []
  patterns: [single-active-index, scroll-snap, delayed-pointer-capture, responsive-grid-round-trip]
key-files:
  created:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
  modified:
    - frontend/src/components/ui/index.ts
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/fansubs/FansubProjectsGrid.tsx
    - frontend/src/components/fansubs/FansubProjectsSection.module.css
    - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
decisions:
  - Keep domain data, links, artwork selection, and count-tile content outside the generic carousel.
  - Use DOM measurement and scroll snapping with one active index; do not add autoplay or viewport item-count logic.
metrics:
  completed: 2026-07-30
  tasks: 3
---

# Quick 260730-jre: Fokussiertes Material-3-inspiriertes Karussell

Ein generisches, zugängliches Focal-Carousel mit gemeinsamer Tastatur-, Pointer-, Fokus- und Rasterlogik ersetzt die doppelte Projekt-/Badge-Interaktion, ohne Domain-Daten, Links oder Artwork-Zuordnungen zu verändern.

## Changed Sections

- `FocalCarousel`: begrenzte Pfeil- und Tastaturnavigation, verzögerter Pointer-Capture, Click-Unterdrückung nach echtem Drag, aktive Positionssemantik und Fokuswiederherstellung.
- `MemberBadgeChain`: jede nicht leere Gruppe verwendet große fokussierte Karten und ein responsives Vollraster; vorhandene Gruppierung, Rollenbezeichnungen, Sperrstatus und Artwork-Auswahl bleiben erhalten.
- `FansubProjectsGrid`: lokale Animation/Drag/Expand-Logik entfernt und durch das gemeinsame Primitive ersetzt; 20er-Vorschau, `+N`-Karte, Projektstatus und Ziel-Links bleiben unverändert.
- CSS: zentrierte Kartenfenster, maskierte/verkleinerte Randkarten, tokenbasierter metallischer Glow, unverzerrte `contain`-/16:9-Inhalte und Reduced-Motion-Regeln.

## Commits

- `2527e27d` — RED: fokussierte FocalCarousel-Tests.
- `97923889` — versehentlich aus dem bereits gemeinsam gestagten Index erstellter, nach Orchestrator-Entscheid beibehaltener Badge-Asset-Baseline-Commit; keine Assets wurden verändert oder gelöscht.
- `eda518ed` — generisches FocalCarousel-Primitive.
- `ace211cc` — Badge-Gruppen auf FocalCarousel migriert; bestehende Artwork-Baseline kohärent bewahrt.
- `15335ea0` — Fansub-Projekte auf dasselbe Primitive migriert.
- `40399a87` — Live-UAT-Fix: Client-Grenze sowie genehmigte Badge-Artworks und Metallrahmen wiederhergestellt.
- `00bdb814` — Live-UAT-Fix: fokussierte Desktop-Komposition mit 60-%-Aktivfenster und skalierten Seitenfenstern wiederhergestellt.

## Checks Executed

- `npx vitest run src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` — nach dem UAT-Fix 25/25 Tests bestanden.
- `npm run typecheck` — bestanden.
- `npm run lint` — bestanden.
- `git diff --check` — bestanden.
- Dirty-Worktree-Audit — `memberBadgeLabels*`, `next-env.d.ts`, Badge-Dateiinhalte und fremde Planning-Artefakte nicht bearbeitet.

## Live UAT

Der erste Live-UAT-Aufruf von `/members/csubs-leader` deckte eine blockierende Next.js-Server-Ausnahme auf: `MemberBadgeChain` war noch keine Client-Komponente und übergab Callback-Props über die Server-/Client-Grenze. Commit `40399a87` setzt die korrekte Client-Grenze und stellt zugleich die zuvor lokal vorhandenen Badge-Artworks wieder her. Automatisiert verifiziert; erneuter visueller Live-UAT steht aus:

1. `/members/{slug}` mit verdienten und gesperrten Badges bei ≥1280 px, ca. 768 px und 390 px.
2. `/fansubs/{slug}` mit mehr als 20 Projekten bei denselben Viewports.
3. In beiden Ansichten Pfeile, ArrowLeft/ArrowRight, Pointer/Touch, `Alle anzeigen`/`Weniger anzeigen`, Fokusrahmen und Reduced Motion prüfen.
4. Nach einem Drag bestätigen, dass kein Badge-/Projekt-Link ausgelöst wird.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Gemeinsamen Git-Index sicher koordiniert**

- Beim ersten GREEN-Commit war ein fremder Badge-Asset-Satz bereits im gemeinsamen Index gestagt.
- Der resultierende Commit `97923889` wurde nach ausdrücklicher Orchestrator-Entscheidung als recoverable Baseline beibehalten.
- Danach wurden vor jedem Commit Status und staged paths geprüft und ausschließlich exakte task-eigene Dateien gestagt.

**2. [Rule 1 - Bug] Server-/Client-Grenze und Artwork-Regression behoben**

- Live-UAT auf `/members/csubs-leader` zeigte eine Next.js-Ausnahme durch Funktions-Props von einer Server- an die Client-Komponente.
- `MemberBadgeChain` ist jetzt explizit eine Client-Komponente; die genehmigte lokale Artwork-Auflösung, `next/image`, `data-achievement-art`, `data-role-volume`, große `object-fit: contain`-Darstellung und palettenbezogene Metallrahmen sind wieder integriert.
- Zwei zusätzliche Tests sichern die konkreten Point-/Role-Assetpfade und die Einbettung in die Focal-Card.

**3. [Rule 1 - Bug] Desktop-Focal-Effekt wiederhergestellt**

- Der zweite Live-UAT zeigte, dass die Wide-Screen-Media-Query drei gleichwertige Karten darstellte und den aktiven Fokus neutralisierte.
- Desktop verwendet jetzt ein zentriertes Aktivfenster von ungefähr 60 % Breite. Benachbarte äußere Fenster bleiben sichtbar maskiert, reduziert und uniform skaliert; das aktive Fenster bleibt bei voller Skalierung und Deckkraft.
- Inneres Badge-Artwork und 16:9-Projektbanner werden nicht transformiert oder verzerrt.

## Known Stubs

Keine.

## Remaining Risks

- Die visuelle Abstimmung von Maskierung, Glow und Kartengrößen benötigt noch die oben beschriebene Live-UAT mit realen Profil- und Projektdaten.
- Browser-spezifisches Touch-/Pointer-Verhalten ist durch jsdom-Regressionsabdeckung unterstützt, aber erst im Live-Browser vollständig bewertbar.

## Orchestrator Live UAT

- `/members/csubs-leader` lädt nach dem Client-Grenzen-Fix ohne Serverfehler.
- Rollen-, Fortschritts-, Beitrags-, Mitgliedschafts- und Sonderauszeichnungs-Karussells besitzen zugängliche deutsche Pfeilbeschriftungen und Positionsangaben.
- Rollen-Navigation, `Alle anzeigen` und `Weniger anzeigen` wurden mit realen verdienten und gesperrten Badges geprüft.
- Die PNG-Artworks erscheinen groß, proportional und mit palettenbezogenem Metall-Glow.
- `/fansubs/c-subs` zeigt ein dominantes aktives 16:9-Projektbanner und sichtbar verkleinerte, abgedunkelte Randkarten; nach `Weitere Projekte` wechselt der Fokus fließend auf die nächste Vollkarte.
- Die vorhandenen 20 C-Subs-Projekte reichen nicht aus, um die `+N`-Karte live auszulösen; deren Verhalten ist durch den fokussierten Komponententest abgedeckt.
- Tablet-/Mobile-Breakpoints sind durch responsive CSS und Komponententests abgedeckt. Der kontrollierte In-App-Browser unterstützt in dieser Sitzung keine programmatische Viewport-Umschaltung, daher bleibt eine manuelle Sichtprüfung bei etwa 768 px und 390 px empfohlen.

## Self-Check: PASSED

Alle zehn geplanten Code-/Testdateien existieren; die aufgeführten Implementierungscommits sind im Git-Verlauf vorhanden. Unabhängige Dirty-Worktree-Dateien blieben erhalten.
