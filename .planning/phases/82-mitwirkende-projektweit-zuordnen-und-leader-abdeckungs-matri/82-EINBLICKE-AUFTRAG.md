# Auftrag (verbatim vom Nutzer): Anime-Einblicke in „Anime & Veröffentlichungen" integrieren

> Eingefügt am 2026-06-10 während Discuss-Phase. In Phase 82 zusammengelegt (Nutzer-Entscheidung). Downstream-Agenten MÜSSEN diesen Auftrag befolgen.

## Ziel

In `/admin/fansubs/[id]/edit` soll der bisher separate Bereich `Anime-Einblicke` fachlich in den Tab `Anime & Veröffentlichungen` integriert werden.

Fansubleader sollen in der Projektübersicht schnell erkennen können:
- welche Anime-Projekte gepflegt sind
- wo Mitwirkende fehlen
- wo ein Projekt-Einblick vorhanden ist
- wo ein Projekt-Einblick fehlt
- wo offene Pflegepunkte bestehen

Der User soll nicht zwischen separaten Main-Tabs wechseln müssen, um Projektstatus, Mitwirkende und Einblicke zu prüfen.

## Wichtige UX-Entscheidung

Der bestehende Main-Tab `Anime-Einblicke` soll nicht länger als eigener Hauptbereich behandelt werden. Stattdessen:
- Alte Links/URLs mit `tab=anime-projekte` müssen auf `tab=releases` bzw. den bestehenden `Anime & Veröffentlichungen`-Tab geroutet werden.
- Die Projekt-Einblicke werden pro Anime-Projekt direkt in der bestehenden aufklappbaren Projektkarte angezeigt.
- Der bestehende Button `Mitwirkende` bleibt erhalten.
- Zusätzlich gibt es pro Projekt einen Status für `Einblick vorhanden/fehlt` und eine Aktion `Einblick` oder `Einblick bearbeiten`.

## Bestehendes UI respektieren

Kein neues Design-System bauen. Nutze die vorhandenen globalen UI-Primitives und lokalen Patterns: `Button`, `Badge`, `Table`, `SectionHeader`, vorhandene Klassen aus `FansubEdit.module.css`, bestehende Struktur im Tab `Anime & Veröffentlichungen`, bestehende Projekt-/Release-/Mitwirkende-Komponenten. Keine große visuelle Neugestaltung; Optik muss zur bestehenden Team4s-Admin-UI passen.

## Gewünschter Aufbau

### 1. Projektliste / Projektkarten
Jede Anime-Projekt-Zeile/aufklappbare Projektkarte erhält direkt sichtbare Status-Badges, z.B.: `220 Folgen`, `Mitwirkende 6/6`, `Mitwirkende fehlen`, `Einblick vorhanden`, `Einblick fehlt`, `2 offene Punkte`. Ruhig und admin-tauglich, keine Marketing-Optik.

### 2. Aktionen pro Projekt
Direkt erreichbar: `Mitwirkende`, `Einblick` / `Einblick bearbeiten`, bestehende Detail-/Release-Aktion beibehalten. Vorhandenen `Mitwirkende`-Button nicht entfernen, sondern ergänzen.

### 3. Aufgeklappter Projektbereich
Oben kompakter Bereich `Projektstatus`: Mitwirkende (vollständig/fehlend), Einblick (vorhanden/fehlt), Offene Punkte (Anzahl/Hinweis). Danach Abschnitt `Projekt-Einblick`: wenn vorhanden kurzen Text + Button `Bearbeiten`; wenn nicht vorhanden Empty-State `Projekt-Einblick fehlt` + Button `Einblick hinzufügen`. Darunter bleiben bestehende Releases/Episoden sichtbar.

### 4. Filter / Quick Views
Wenn es gut passt, oben kompakte Filterchips: `Alle`, `Mitwirkende fehlen`, `Einblick fehlt`, `Offene Punkte`. Wenn die Datenlage dafür noch nicht sauber vorhanden ist, nur die UI-Struktur vorbereiten und keinen Fake-Status erfinden.

## Daten-/Contract-Regeln
Vor Implementierung prüfen: Wo werden `Anime-Einblicke` geladen/gespeichert? Welche Komponente rendert den Tab? Welche API-Helper/DTOs existieren? Welche Daten liegen im `Anime & Veröffentlichungen`-Tab schon vor?
Wichtig: keine zweite API-Logik; keine neuen Fetches mit manueller Auth/Bearer-Logik; bestehende API-Helper wiederverwenden; keine neuen API-Felder erfinden (nur dokumentierte/runtime-verfügbare); wenn ein Status nicht zuverlässig berechenbar ist, ehrlich als `unbekannt`/`nicht gepflegt` darstellen.

## Routing
- `Anime-Einblicke` aus der Main-Tab-Leiste entfernen, falls Integration vollständig.
- Legacy-Route `?tab=anime-projekte` auf den Veröffentlichungen-Tab routen.
- Readiness-/Sprungmarken von `anime-projekte` auf `releases` / `Anime & Veröffentlichungen` umstellen.

## Tests
- Main-Tab `Anime-Einblicke` wird nicht mehr separat gerendert.
- Legacy `tab=anime-projekte` landet im Veröffentlichungen-Kontext.
- Projektkarte zeigt Status-Badges für Mitwirkende und Einblick.
- Vorhandener Einblick wird im aufgeklappten Projektbereich angezeigt.
- Fehlender Einblick zeigt `Einblick hinzufügen`.
- Bestehender Button `Mitwirkende` bleibt erreichbar.
- Relevante bestehende Tests für `/admin/fansubs/[id]/edit` bleiben grün.

## Checks
`npm run typecheck`; gezielte Vitest-Dateien für `/admin/fansubs/[id]/edit`; falls machbar `npx vitest run src/app/admin/fansubs`; `git diff --check`. Wenn repo-weites Lint an Fremdfehlern scheitert: dokumentieren und gezieltes ESLint auf die geänderten Dateien.

## Nicht tun
Kein neues visuelles Design-System; keine Landingpage-/Marketing-Optik; keine neuen Domain-APIs ohne Contract-Prüfung; keine Fake-Zähler/erfundenen Statuswerte; keine Entfernung bestehender Mitwirkenden-Funktionalität; keine Änderungen an Release-/Media-Domainlogik außerhalb dieses UI-Slices.

## Erwartetes Ergebnis
Der Fansubleader kann im Tab `Anime & Veröffentlichungen` sofort scannen: vollständig gepflegte Projekte, fehlende Mitwirkende, fehlende Projekt-Einblicke, offene Pflegepunkte — und pro Projekt direkt handeln, ohne zwischen `Anime & Veröffentlichungen`, `Anime-Einblicke` und Detailseiten zu springen.

## Verankerte Oberflächen (verifiziert)
- Main-Tab-Key `anime-projekte`, Label „Anime-Einblicke": `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (Tab-Liste ~Z.197, Render-Case ~Z.238/3281)
- Einblicke-Inhalt rendert: `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx`
- API-Helper/DTOs für Einblicke: in der Planung via Contract-Prüfung zu identifizieren (frontend/src/lib/api.ts, shared/contracts/, backend handlers).
