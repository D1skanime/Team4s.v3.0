---
quick_task: 260717-d7i
status: complete
scope: Public Fansub-Projektseite — Mobile Redesign
completed_at: 2026-07-17
commits:
  - 6e3d2dab
  - 7f31c6ac
  - ec38a7e5
  - e7022f40
  - f7062a3d
  - 65eb8985
---

# Quick Task 260717-d7i — Summary

## Ergebnis

Die öffentliche Fansub-Projektseite besitzt nun bis 768 px eine zusammenhängende mobile Identity-Card, eine skalierbare Coop-Anzeige, ein nach Veröffentlichungsdatum gewähltes Featured Release, fünf initial geschlossene Release-Accordions mit 10er-Nachladung und gruppierte Kara-Deep-Links. Desktop behält die bisherige Release-Zeilen-/Timeline-Darstellung; Breadcrumbs, Projektnavigation, Story und Team wurden nicht verändert.

## Umgesetzte Entscheidungen

- Drei Karas pro Typ-Gruppe, danach „Weitere anzeigen“.
- Drei Coop-Avatare, danach berechnetes `+N`.
- Kara-Navigation im selben Tab über die bestehende Next.js-Route.
- Numerische Folgen aufsteigend; Specials/OVAs anschließend nach Veröffentlichungsdatum.
- Featured Release nach höchster `release_date`.
- Initial fünf Releases, weitere Seiten mit zehn Einträgen.
- Globale Rich-Accordion-Header und generischer `AvatarStack` mit vorhandenen Tokens.
- `theme_segments.version` additiv in Go, OpenAPI und TypeScript.

## Geänderte Bereiche

- Backend/API: Cursor-Handler, Release-Repository, gemischte Cursor-Paginierung, öffentliche DTOs und fokussierte Tests.
- Vertrag: `shared/contracts/openapi.yaml`, `frontend/src/types/group.ts`, `frontend/src/lib/api.ts` und API-Test.
- UI-System: `Accordion`, neuer `AvatarStack`, UI-System-Showcase und Dokumentation.
- Projektseite: `HeroSection`, mobiles Hero-/Stats-/Coop-Layout, Featured-Auswahl und Release-Komposition.
- Release-Liste: mobile Accordions, serverseitiger Featured-Ausschluss, 5/10-Lazy-Loading, gruppierte Kara-Zeilen und Versionshinweise.
- Release-Detail: typisierte `kara`-/`autoplay`-Parameter auf Pretty- und Kompatibilitätsroute sowie Auth-initialisiertes Autoplay über den bestehenden Stream-Seam.

## Checks

- `go test ./internal/repository ./internal/handlers` — grün.
- Fokussierte Frontend-Suite — 8 Dateien, 42 Tests grün.
- `npm run typecheck` — grün.
- Fokussiertes ESLint der geänderten Dateien — keine Fehler; eine bereits bestehende `<img>`-Warnung in `ThemeTimeline`.
- `npm run build` — grün, alle dynamischen und statischen Routen gebaut.
- UAT-Fix-Suite (`Accordion.test.tsx`, Projektseiten-Tests) — 20 Tests grün; Typecheck erneut grün.
- Docker-Production-Builds für Frontend und Backend — grün; Port 3000 läuft mit dem aktualisierten Stand.
- `git diff --check` — grün für die Task-Commits.
- Vollständiges `npm run lint` — weiterhin rot wegen des außerhalb dieses Tasks bestehenden `react-hooks/set-state-in-effect`-Fehlers in `frontend/src/components/fansubs/FansubStorySection.tsx`; die zunächst gemeldete neue ThemeTimeline-Stelle wurde korrigiert.

## Risiken und offene UAT

- Live-UAT auf 360, 390 und 420 px ist grün: Hero-Titel liegt im Banner, Stats schließen ohne Lücke an, es gibt keine mobile Überbreite, initial erscheinen fünf geschlossene Releases und die automatische Nachladung ergänzt die restlichen Folgen in stabiler Reihenfolge.
- Der anonyme Kara-Deep-Link landet mit `?kara=…&autoplay=1#op-ed-middle` auf der richtigen Release-Seite und erzeugt keinen Player. Der eingebettete Browser hatte keine Login-Session; der reale eingeloggte Autoplay-Tap bleibt daher als manueller Check offen.
- Das gemischte SQL-Sortierverhalten ist über fokussierte Cursor-/Source-Contract-Tests abgesichert; das Repository besitzt weiterhin kein echtes Testdatenbank-Rig.
- Browser-Autoplay kann trotz positiver Berechtigung blockiert werden; der bestehende Player bleibt dann mit sichtbaren Controls verfügbar.

## Commits

- `6e3d2dab` — `feat(releases): extend public cursor contract`
- `7f31c6ac` — `feat(projects): add mobile identity card`
- `ec38a7e5` — `feat(projects): redesign mobile release list`
- `e7022f40` — `feat(releases): support kara autoplay deep links`
- `f7062a3d` — `fix(projects): label numeric release episodes`
- `65eb8985` — `fix(projects): harden mobile identity layout`
