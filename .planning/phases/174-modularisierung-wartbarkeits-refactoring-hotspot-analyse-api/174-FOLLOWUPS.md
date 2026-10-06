# Phase 174 – Nachfolge-Liste (nicht vergessen!)

Alles, was während Phase 174 gefunden, aber bewusst NICHT in 174 erledigt wurde (D-01: kein Verhalten/Schema/API ändern).
174-25 (Abschlussbericht) MUSS diese Liste vollständig in „Empfehlungen für Folgephasen“ übernehmen.
Neue Funde während 174 hier anhängen.
Grundsatz (Nutzer): Doppelte Seiten/Parallelimplementierungen für dieselbe Fachaufgabe sind Unsinn und werden konsequent zusammengeführt — bei Analysen gezielt danach suchen.

## Priorität hoch

### F-13 Release-Bearbeitung zusammenführen — PRIORITÄT HOCH (Nutzer 2026-10-06: „unbedingt flicken, doppelte UI kostet“)
- Zwei Rahmen-Seiten für dasselbe: `/admin/episode-versions/[id]/edit` (`EpisodeVersionEditorPage.tsx` 966 Z. + `useEpisodeVersionEditor`) und `/me/releases/[id]/workspace` (`page.tsx` 448 Z., seit Phase 82). Inhaltsbausteine (Media, Notizen, Segmente, Metadaten-Felder) und Endpunkte (`getEpisodeVersionEditorContext`, `updateEpisodeVersion`) sind bereits gemeinsam; doppelt sind Laden/Formularzustand/Speichern, Tabs, Vor/Zurück-Navigation, Kopf.
- Ziel: EINE rechtebasierte Release-Bearbeitungsseite (`ReleaseVersionCapabilities` steuert Sichtbarkeit), erreichbar von Dashboard, Meine Projekte und Fansub-Edit; alte Workspace-URL leitet weiter; Admin ohne Mitgliederprofil kein 404 mehr.
- Ändert Routen/Links/Abläufe → eigene Phase mit UX-Abnahme (nicht 174).

### F-01 Alten Bildspeicher (legacy) entfernen — Nutzer: „total veraltet, muss weg“
- Live wird nur V2 (`anime_media` + `media_assets`) benutzt (geprüft 2026-10-05: `anime_media` existiert, 81 Zeilen).
- Schritt 1 (klein): tote Legacy-Zweige in `backend/internal/repository/anime_assets*.go` entfernen + `hasV2AssetSchema`-Abfrage (1 Extra-Query pro Bild-Aufruf) streichen.
- Schritt 2 (mittel): alle Leser der Spalte `anime.cover_image` auf `anime_media` umstellen (29 Backend-Dateien, u. a. anime.go, anime_v2.go, watchlist, fansub_project_resolver, AniSearch-Import, Anime anlegen/löschen); `syncLegacyAnimeCoverImageV2` danach überflüssig.
- Schritt 3: Spalte per Migration entfernen, API-Feld `cover_image` im Vertrag prüfen (55 Frontend-Stellen, teils nur Feldname).

### F-11 README neu schreiben (direkt nach 174, zusammen mit Push) — Nutzerwunsch 2026-10-05
- README = Eingangstür, nicht technisch, Deutsch: (1) Was ist Team4s, (2) Stack-Übersicht (Frontend/Backend, PostgreSQL, Redis, Keycloak, Mailpit), (3) Installation in wenigen Schritten (Docker Compose, .env aus .env.example mit Pflichtwerten, Migrationen, Keycloak-Realm + Admin-User, Funktionsprüfung), (4) Erste Schritte als Admin (Login/Plattform-Admin prüfen, Fansub-Gruppe anlegen, Mitglieder einladen → Mailpit, Anime anlegen manuell/Jellyfin/AniSearch, Release mit Medien freigeben), (5) Links auf weiterführende Doku.
- Platzhalter für Produkt-Screenshots/-Videos vorsehen (später ergänzen).
- Technischer Inhalt des heutigen README (Ports, Smoke-Checks, Migrationen, Contracts, Auth) aktualisiert nach `docs/ENTWICKLUNG.md` verschieben; veraltet: GSD-Container-Skript, Fast-Refresh-Behauptung, Ports, auth/issue-Dev-Key, AUTH_ADMIN_ROLE_NAME.
- Vorher am echten Stand prüfen: Keycloak-Einrichtung (Realm-Import/Skript/manuell) und wie der erste Plattform-Admin entsteht; Anleitung möglichst einmal frisch durchspielen.
- Danach Push nach GitHub (main ist Stand 2026-10-05 76+ Commits voraus) — nur auf ausdrückliche Nutzeranweisung.


## Bugs / Inkonsistenzen

- **F-02** `getTypeBadgeLabel`: `SegmenteTab.helpers.tsx` vs. `segmenteTabUtils.ts` liefern für OUTRO unterschiedliche Labels (`OUT` vs. `PV`) — fachlich klären, dann eine Implementierung (174-HOTSPOTS D-07).
- **F-03** Fansub-Anlegeseite: ASCII-Umlaute in UI-Texten („Tag hinzugefuegt.“ u. a.) → korrekte Umlaute (CLAUDE.md-Sprachregel).
- **F-04** Fansub-Anlegeseite: 9 native `<input>`/`<select>` statt `@/components/ui`-Primitives (lint-Warnungen).
- **F-05** Daten: Mitglied `timer` hat 9 doppelte `anime_contributions`-Einträge für Anime 1 / Gruppe 1 (gleiche Rollen) — Ursache des Mehrfach-Anlegens prüfen, bereinigen.
- **F-06** 6 vorbestehende Frontend-Testfehler + tsc-Fehler in `ReleaseDetailHero.test.tsx` (Phase 169) + openapi.yaml doppelter `description`-Key (Zeile ~2205) — siehe 174-HOTSPOTS „Pre-Existing Baseline Test Failures“.
- **F-12** Latenter Laufzeitfehler im Merge-Muster `{ ...sharedStyles, ...ownStyles }` für kombinierte CSS-Modul-Styles (gefunden in 174-23, betrifft potenziell auch 16 Dateien aus 174-22 im `admin/fansubs/[id]/edit/`-Verzeichnis, z. B. `GroupMembersTab.tsx`, `NotesTab.tsx`, `FansubEditClient.tsx`): Unter Vitest/jsdom hat der CSS-Modul-Mock keine enumerable eigenen Keys (nur ein `get`-Trap), daher kopiert ein Objekt-Spread NICHTS — betroffene Komponenten würden in Tests (und potenziell manchen Runtime-Edge-Cases) leere Klassennamen rendern. 174-23 hat das Muster in seinen 9 betroffenen Dateien durch einen echten `Proxy`-Merge ersetzt (`new Proxy({}, { get: (_, p) => ownStyles[p] ?? sharedStyles[p] })`, verifiziert unter Vitest UND im Produktions-Webpack-Build); die 16 Stellen aus 174-22 sind unverändert und bisher unentdeckt, weil deren Tests nie eine Klasse prüfen, die ausschließlich aus dem gemergten Objekt stammt. Fix außerhalb des CSS-only-Scopes von 174-22/174-23 — für eine gezielte Folgephase oder das Welle-6-Abschlussaudit vormerken.

## Erledigt in 174 (zur Info, Gegenprobe beachten)
- BUG-174-01 Endlosschleife Fansub-Anlegeseite nach erstem Speichern — behoben, live abgenommen.
- BUG-174-02 Dashboard „Gruppenbild prüfen“ ohne Prüfrecht — behoben; **Gegenprobe nach Backend-Rebuild offen** (174-UAT-CHECKLIST).

- **F-14** 8 RVM-Handler-Integrationstests scheitern mit `db_schema_mismatch` gegen die Phase-107-Test-DB (vorbestehend; u. a. TestRVMTitlePatchPersistsIndependentMetadata, Reorder/SoftDelete/Category) — Test-Fixture-Schema nachziehen. Zusätzlich: Revisions-Konfliktschutz für Nicht-Hochlader-Edits an Release-Medien (seit BUG-174-04 ohne SubmitMedia) prüfen.

## Wartbarkeit (Refactoring-Folgephasen)
- **F-07** Doppelte Logik zusammenführen: Pagination-Fensterberechnung (2 Komponenten), `formatDate` (4 identische Kopien) — 174-HOTSPOTS D-07.
- **F-08** P2-Hotspots aus 174-HOTSPOTS (18 Dateien, u. a. `types/admin.ts`, `EpisodeVersionEditorPage.tsx`, `fansubs/merge/page.tsx` ohne Tests, `media_repository.go`, `anisearch_client.go`).
- **F-09** Nach 174 noch > 450 Zeilen (D-24): `lib/api/client.ts` 1095, `lib/api/history.ts` 1020, `lib/api/admin/fansub-members.ts` 757, `lib/api/permissions.ts` 610, `useAdminAnimeCreateControllerImpl.ts` 1054, `GroupMediaReviewSection.tsx` 632, `fansubs/create/page.tsx` 610 (+ Welle-4/5-Ergebnisse ergänzen).
- **F-10** Optional: wenige echte Playwright-End-to-End-Tests für Kern-Admin-Abläufe (echte Seite + echtes Backend), statt Klick-Simulation (D-25).
