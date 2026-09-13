---
phase: 157
plan: 07
status: completed
---

# Project Member Hero — Umsetzung und Verifikation

Stand: 2026-09-13, Linux `/home/d1sk/team4s`, Ausgangscommit `feff6821`, Branch `main`. Änderungen sind nicht committed oder gepusht.

## Ergebnis

Geändert ist ausschließlich die obere Präsentation der projektspezifischen Mitwirkung `/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`. Das allgemeine Memberprofil `/members/[slug]` wurde nicht umgebaut; es wurde beim Live-Test nur über den Hero-Link aufgerufen.

- Gemeinsame `ArtworkHero`-Hülle: helle Textzone mit kontinuierlichem Übergang zum vorhandenen Projektbanner; Containerquery, globale Abstände/Radien/Buttons/Badges.
- Identität → Rollen → Projekt/Gruppe → kompakte Kennzahlen → zwei Actions. Sichtbarer Link „Memberprofil“, zugänglicher Name „Vollständiges Memberprofil“.
- `HeroMetrics` erhält eine explizite Inline-Variante; die bisherige Variante bleibt Standard und unverändert.
- Separate Statistik-Card und Summary-Band werden auf dieser Seite nicht mehr gerendert. Ihre bisherigen Komponenten bleiben erhalten; keine Nebenbereinigung.
- Vorhandene Banner-Auswahl von `PublicFansubProject` und Resolver nutzt jetzt dieselben SQL-Fragmente und denselben URL-Mapper. Zwei optionale Präsentationsfelder sind in OpenAPI und Frontend-Typ ergänzt. Keine zusätzliche Abfrage, keine Migration, keine neue Medienlogik.
- Release-Semantik bleibt Crew-verknüpfte Release-Versionen; nur Nullwerte im Hero entfallen. Folgen bleiben unterschiedliche Episoden mit öffentlichen Notizen/Medien. Notes, Medien, Releases, Rechte, Pagination und private Profilregeln wurden nicht geändert.

## Sichtbare geänderte Struktur

```text
Breadcrumb
ArtworkHero
  Avatar | Name + Verifiziert
         | Projektrollen
         | Projekt · Gruppe
  13 Folgen · 12 Beiträge · 2 Medien
  ← Zurück zum Projekt   Memberprofil →
Schnellnavigation
Texte & Notizen / Bilder & Medien / Releases
```

## Gemessene Geometrie

| Viewport | Hero vorher → nachher | Beitragsbeginn vorher → nachher |
|---|---:|---:|
| 390 × 844 | 299 → 196 px | 850 → 474 px |
| 768 × 1024 | nicht erhoben → 196 px | nicht erhoben → 430 px |
| 1440 × 900 | 230 → 212 px | 567 → 377 px |

Auf Mobile 34 % weniger Hero-Höhe und 44 % früherer Beitragsbeginn; Desktop-Beitragsbeginn 34 % früher. Screenshots liegen unter `evidence/157-07/after-{mobile,tablet,desktop}.png`; zusätzliche Belege zeigen Bildfehler/neutral sowie lange Labels/eingebettete Container. `screenshots.json` enthält Messwerte und Prüfergebnisse. Das Evidence-Verzeichnis ist nach bestehender Repository-Regel gitignored, die Dateien sind lokal vorhanden.

## Prüfungen

- `docker compose exec -T team4sv30-frontend npm test`: **2334 bestanden**, 3 vorhandene Todo-Tests; 302 Testdateien bestanden, 1 übersprungen.
- Nach der abschließenden Action-/Spacing-Korrektur gezielt Hero, Route und HeroMetrics: **17 bestanden**.
- `docker compose exec -T team4sv30-frontend npm run typecheck`: **bestanden**, auch nach dem isolierten Build erneut.
- ESLint über alle geänderten TS/TSX/MJS-Dateien: **bestanden, keine Warnungen**.
- Globaler `npm run lint`: **13 bestehende Fehler, 331 Warnungen**, ausschließlich außerhalb der geänderten Dateien. Betroffen u. a. Admin-Hooks mit synchronem setState-in-effect, Admin-Role/Capability-Dateien und `capture-responsive.cjs`.
- Backend: `go test ./internal/handlers ./internal/repository -run 'TestResolveFansubProject|TestFansubProjectResolver|TestResolveProject_|TestProjectMember|TestPublicMediaURL' -count=1`: **bestanden** (DSN-gebundene Tests zunächst übersprungen).
- Anschließend Phase-155-Query-Budget- und Not-found-Tests mit echtem PostgreSQL in einer frischen, dedizierten `team4s_phase155_test_hero<Timestamp>`-Datenbank: **bestanden**. Nur Schema aus der laufenden Datenbank übernommen; Laufzeitdaten weder kopiert noch verändert. Budget: **1 Projekt → 2 Queries, 6 Projekte → 2 Queries**. Eigene Testdatenbank danach entfernt. Der Schutz gegen falsch benannte Testdatenbanken wurde zunächst ausgelöst; danach korrekt benannter isolierter Lauf erfolgreich.
- Live-API: Resolver-Banner/Cover identisch mit bestehender öffentlicher Projektprojektion.
- `docker compose exec -T team4sv30-backend go build ./...`: **bestanden**.
- `docker compose run --rm --no-deps -v /app/.next -e NODE_ENV=production team4sv30-frontend npm run build -- --webpack`: Bundling erfolgreich; Build stoppt bei bestehendem ungültigem Page-Export `formatEditLoadError` in `frontend/src/app/admin/anime/[id]/edit/page.tsx`. Export ist bereits in Ausgangscommit `feff6821` enthalten. Generierte `next-env.d.ts`-Änderung danach auf den unveränderten Ausgangsinhalt zurückgesetzt.
- `git diff --check`: **bestanden**.

## Browser-Abnahme

Produktive Seite und navigierbare Links im Codex In-app Browser geprüft: Projekt → sichtbarer Member-Eintrag → Projekt-Mitwirkung; Hero-Zurück-Link; Link zum vollständigen Memberprofil; abschließend zurück zur Projekt-Mitwirkung. Die Ergebnisroute bleibt geöffnet.

Reproduzierbare Screenshot-/Layout-Prüfung:

```sh
docker compose exec -T \
  -e SHOT_LABEL=after -e SHOT_OUT=/tmp/hero-consolidation -e SHOT_VERIFY_HERO=1 \
  team4sv30-frontend node scripts/shot-projectmember.mjs
```

- 390/768/1440: Banner erfolgreich geladen, keine horizontale Überbreite, Actions im Viewport und mindestens 36px hoch.
- Wiederverwendbarkeit bei 1440px Viewport mit tatsächlich nur 320/767/768/769px breitem Hero: korrekter Wechsel von voller Footerbreite auf Textspalte genau bei 768px Containerbreite.
- Lange deutsche Namen und Rollen, mehrere Rollen, große Kennzahlen: kein Clipping/Überlauf.
- 720 CSS-Pixel bei 1440px Ausgangsbreite (Reflow-Äquivalent von 200 % Zoom): kein Dokumentüberlauf. Browser-Zoom selbst wurde nicht umgestellt.
- Axe auf dem Hero mit Banner: keine gemeldeten WCAG-2-A/AA-Verstöße.
- Absichtlich blockierte Bildoptimierung: neutraler Hero ohne Bildlücke, beide Actions erhalten. Netzwerkfehler dieses expliziten Negativtests sind getrennt von normalen Browserfehlern dokumentiert.
- Komponententests: Banner, Cover ohne Banner, Bannerfehler → Cover → neutral, fehlender Avatar, Verified/Unverified, einzelne/mehrere Rollen, Null-/Singular-/Großwerte.

Die In-app-Viewport-Screenshot-Funktion lieferte bei großen Overrides rechts schwarze Capture-Flächen; für die vollständigen pixelgenauen Artefakte wurde deshalb der bestehende Linux-Playwright-Screenshot-Runner ergänzend verwendet. Live-Flows wurden zusätzlich im gemeinsamen Browser überprüft.

## Restpunkte

Keine offene funktionale Hero-Abweichung gefunden. Globaler Lint und vollständiger Frontend-Build sind wegen der beschriebenen unberührten Ausgangsfehler nicht grün. Keine Folgearbeit an Notiz-Timeline, Release-Darstellung oder allgemeinem Memberprofil vorgenommen.

## Geänderte Dateien

- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-07-PLAN.md`
- `DECISIONS.md`
- `backend/cmd/server/main.go`
- `backend/internal/handlers/fansub_project_resolver_handler.go`
- `backend/internal/handlers/fansub_project_resolver_handler_test.go`
- `backend/internal/repository/fansub_project_artwork.go`
- `backend/internal/repository/fansub_project_resolver_repository.go`
- `backend/internal/repository/fansub_repository.go`
- `docs/frontend/ui-system.md`
- `frontend/scripts/shot-projectmember.mjs`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.test.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css`
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx`
- `frontend/src/components/ui/ArtworkHero.module.css`
- `frontend/src/components/ui/ArtworkHero.tsx`
- `frontend/src/components/ui/HeroMetrics.test.tsx`
- `frontend/src/components/ui/HeroMetrics.tsx`
- `frontend/src/components/ui/index.ts`
- `frontend/src/components/ui/ui.module.css`
- `frontend/src/types/fansub.ts`
- `shared/contracts/openapi.yaml`
- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-07-SUMMARY.md`
