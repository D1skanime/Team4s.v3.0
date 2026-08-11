# Phase 124 – Punkte-Meilensteine Achievement Stage

## 1. Zusammenfassung

Eigenständige responsive Punkte-Stage; Freigabe: exakt `approved` am 2026-08-11. Fehlende Browser-Captures wurden akzeptiert.

## 2. Vorherige Darstellung

Die einzelne Familie lief zuvor durch ein äußeres `FocalCarousel`.

## 3. Neue Stage-Architektur

Hero, autoritativer Fortschritt und sechs Stationen bilden eine Stage; Auswahl ist nur Präsentation.

## 4. Entfernung des äußeren Carousels

Wrapper, Pfeile, Zähler und Skeleton entfallen im Punktepfad; `FocalCarousel` blieb unverändert.

## 5. Wiederverwendung aus Phase 123

Phase-123-Komposition, `Card`, `Badge`, `ResponsiveImage`, Resolver und Familienprojektion werden wiederverwendet.

## 6. Hero-Artwork

Aktuelle Stufe im quadratischen `contain`-Slot; bei null Punkten kein unverdientes Artwork. Tests/CSS belegen dies, kein Screenshot.

## 7. Thumbnail-Track

Sechs Artwork-Stationen bei 1, 50, 200, 500, 1'000 und 2'500; frühere verdiente Stufen auswählbar, Locks statisch.

## 8. Punkte- und Fortschrittslogik

`total_points`, `POINT_MILESTONES` und `badge_progress` bleiben kanonisch. Grenzwerte 0 bis 5'000 sind tabellarisch getestet.

## 9. Vorschau

Nur Hero/Status wechseln; Ist-Punkte, Fortschritt und Ziel bleiben gleich. Getestet; `points-preview.png` fehlt.

## 10. Maximalstufe

Live: 2'733, „Archiv-Legende“, sechs Stationen. Terminal-ARIA/kein nächstes Ziel getestet; `points-max.png` fehlt.

## 11. Desktop

Sechs flexible `minmax(132px, 1fr)`-Spalten sind vertraglich geprüft; reale Viewport-Passung nicht aufgenommen.

## 12. Mobile

Sechs 112-Pixel-Spalten in lokalem `overflow-x: auto`; Fokus/Overflow/Reduced Motion getestet, Scrollen nicht live gemessen.

## 13. Ultrawide

Flexible Spalten sind vorgesehen; ohne 2'560-×-1'440-Screenshot ist die visuelle Ausnutzung nicht belegt.

## 14. Accessibility

Liste, `aria-current`, earned-only Buttons, statische Locks, Progressbar-ARIA, Fokus, Alttexte und Reduced Motion sind geprüft.

## 15. Geänderte Dateien

124-01/02 betrafen `memberBadgeLabels.test.ts`, `MemberBadgeChain.tsx`, `MemberBadgeChain.module.css`, `MemberBadgeChain.test.tsx`, `page.test.tsx`. 124-04 erzeugt nur `124-REPORT.md`/`124-04-SUMMARY.md`. CSS-/Test-Hunks bleiben uncommitted zum Schutz überlappender Phase-121-/123-Arbeit.

## 16. Tests

182 bestanden, ein bestehender Skip, 15/15 Seitentests; Lint 0 Fehler/326 Warnungen. Unabhängig: fünf Release-Media-/Gallery-Fehler sowie `.next`- und bekannter Test-Typecheck-Fehler.

## 17. Live-UAT

Navigation Rangliste → CSubs Leader erreichte `http://127.0.0.1:3300/members/csubs-leader`; beobachtet: 2'733 Punkte, „Archiv-Legende“, sechs Stationen.

## 18. Evidence

Belegt: fokussierte Tests, Lint, `git diff --check`, Source/CSS, Route und Terminalbeobachtung. Alle acht Dateien `points-390.png`, `points-768.png`, `points-1024.png`, `points-1440.png`, `points-1920.png`, `points-2560.png`, `points-preview.png`, `points-max.png` fehlen nach IAB-/Playwright-Timeouts/Resets; keine erfundene Sichtprüfung.

## 19. Shared Regression

`FocalCarousel`/`FansubProjectsGrid` liefen grün. Backend, API, Datenbank, Assets und geschützte Consumer blieben unangetastet.

## 20. Offene Punkte

Akzeptiert offen: Screenshots, Viewport-, Vorschau-, Maximal-, Scroll- und Overflow-Sichtprüfung. Bestehend: fünf Fremdtests, Typecheck-Fehler, 326 Warnungen und React-`act(...)`-Warnungen.

## 21. Fazit

Funktional geprüft und ausdrücklich freigegeben; die Capture-Lücke wird transparent, ohne erfundene Evidenz, festgehalten.

### Qualitätsfragen

**Wirkt Punkte-Meilensteine jetzt wie eine eigenständige Achievement-Familie statt wie ein Carousel mit einer Karte?**

Ja, strukturell: eigener Stage-Pfad ohne Carousel-Semantik, durch Tests und Live-Terminalbeobachtung belegt; Screenshot fehlt.

**Sind die sechs unterschiedlichen Artworks sinnvoll sichtbar und vergleichbar?**

Teilweise belegt: sechs echte Thumbnails/Hero sind getestet. Optimale visuelle Vergleichbarkeit ist ohne Screenshots nicht abschließend belegt.

**Nutzt Desktop die verfügbare Breite sinnvoll?**

Technisch vorgesehen durch sechs flexible Spalten; reale Desktop-Passung wurde nicht aufgenommen.

**Bleibt Mobile kompakt und gut bedienbar?**

Technisch vorgesehen durch Stapelung und lokalen nativen Overflow; Scrollen, Seitenoverflow und visuelle Kompaktheit wurden nicht live erfasst.

**Ist die gemeinsame Stage-Grundlage nach Phase 123 und 124 stabil genug für die späteren Beitragsfamilien?**

Ja als Grundlage mit Neubewertung pro Familie: gemeinsame Primitives, keine neue Carousel-/Daten-/Threshold-Seam, grüne Shared Regression. Die visuelle Viewport-Evidenz sollte vor unveränderter Übertragung nachgeholt werden.
