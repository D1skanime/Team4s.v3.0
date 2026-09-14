---
phase: quick-260914-dov
plan: 01
status: complete
completed: 2026-09-14
commit: b819698f7dacf887d8a867f3a6cc2cdd7dc6af8e
---

# Quick 260914-dov – Release-Upload direkt über Kategorien

## Ergebnis

Die vier Kategorien Screenshot, Typesetting / Karaoke, Fun / Outtake und Sonstiges öffnen bei Uploadberechtigung direkt den bestehenden Dialog „Medien hochladen“. Die gewählte Kategorie wird in der Dialogbeschreibung angezeigt und unverändert an den vorhandenen Uploadhook übergeben. Auch die bereits ausgewählte Kategorie kann den Dialog erneut öffnen.

Die redundanten Buttons „Hochladen“ und „Jetzt hochladen“ sowie die untere „Noch keine Medien“-Card wurden entfernt. Bei leerer Kategorie entfällt auch die überflüssige Aktive-Kategorie-/0-Medien-Zeile. Die vier Zähler bleiben sichtbar. Vorhandene Medien werden weiterhin kategorieweise dargestellt und sind nach Schließen des Uploadfensters bearbeitbar. Nutzer ohne Uploadrecht können Kategorien weiterhin zum Ansehen wechseln, ohne Uploadfenster. Eine laufende Uploadqueue wird durch Kategoriebedienung nicht zurückgesetzt.

## Ursache / Wiederverwendung

Beide entfernten Buttons riefen denselben openUploadSheet-Handler auf; die Kategorien setzten zuvor lediglich selectedCategory. Der Handler heißt nun selectCategory und verbindet Kategorieauswahl mit dem bestehenden Öffnen/Reset des Dialogs unter denselben Uploadgrenzen. Native Kategoriebuttons verwenden group, aria-pressed und bei verfügbarer Uploadaktion aria-haspopup=dialog. Keine zusätzlichen Komponenten, Hooks, Requests oder Medienregistries.

ReleaseVersionMediaSection wird auch im Admin-EpisodeVersionEditorPage verwendet; dort gilt dieselbe konsolidierte Bedienung. Header-Badge „Medien hochladen“ auf der Workspace-Seite ist eine nicht interaktive Fähigkeitsanzeige, kein Uploadbutton, und wurde nicht verändert. Bestehende Drawer-/Galerie-/Upload-/Review-/Retry-/Previewlogik und Styles wurden wiederverwendet.

## Commits / geänderte Dateien

- Ausgangscommit: `2fbfdf0153cc46a4b1ac85d432bfd0ebf6d2be6e`
- Code und Tests: `b819698f7dacf887d8a867f3a6cc2cdd7dc6af8e`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`: Kategoriehandler, Buttonsemantik, redundante Buttons/EmptyState entfernen, bedingte Galerieüberschrift, passender Hilfetext.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`: sieben neue Regressionen und Anpassung vorhandener Einstiegspunkte.
- GSD: PLAN, SUMMARY, Browser-/Build-Prüfskripte, Messwerte, sechs Screenshots und STATE-Quick-Zeile. Keine Roadmapänderung.
- Backend / Verträge / Styles / Datenbank: keine Änderungen.

## Checks

| Check | Ergebnis |
| --- | --- |
| Neue Regressionen vor Implementierung | 7 rot, 25 bestehende Fälle für den Red-Lauf ausgefiltert |
| Abschließende gezielte Suite | **4 Dateien / 63 Tests bestanden** |
| Session | Bestehender Refresh-session-Workspace-Test bestanden; zentraler API-/Uploadpfad unverändert |
| Kategorien / Payload | Alle vier realen CATEGORY_OPTIONS-Werte an startUpload geprüft, keine geratenen Kategoriecodes |
| Uploadregressionen | Queue, Netzwerk-/Total-/Teilfehler, Retry, erfolgreicher Abschluss, Revisionen, Nur-Lesen, Preview und existierende Medien bestanden |
| Browser | **36/36 Fälle**, keine Page-Errors, **0 Schreibrequests**, **0 zusätzliche Medienabfragen beim Kategoriewechsel** |
| Typecheck nach Korrektur eines Test-Query-Typfehlers | Nur unveränderter AnimePageProps.searchParams-Altfehler; finaler Log exakt identisch zur Baseline |
| Lint | 13 Fehler / 331 Warnungen; vollständige Diagnose-Multimenge identisch zur Baseline, 0 neue Diagnosen |
| Isolierter Produktionsbuild | Kompilierung erfolgreich (23,6 s); danach bekannter ungültiger formatEditLoadError-Pageexport in admin/anime/[id]/edit/page.tsx |
| git diff --check / eigene Diffprüfung | Bestanden |

Baseline-Vergleich: `.planning/quick/260914-ddc-profile-image-dialogs/` und dessen gespeicherte Lint-/Typechecklogs. Vergleichsergebnisse: [lint-comparison.json](lint-comparison.json), [typecheck-comparison.json](typecheck-comparison.json). Bestehende React-act-Warnungen der Section-Tests bleiben sichtbar; kein Testfehler. Rohe Logs sind lokal gemäß vorhandener Ignore-Regeln nicht versioniert.

Reproduktion der Suite im kanonischen Repository:

```sh
docker exec -w /app team4sv30-frontend npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx' 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts' 'src/app/me/releases/[versionId]/workspace/page.test.tsx' src/lib/api.no-token-boundary.test.ts --reporter=dot
```

## Browserbelege

Geprüfter Nutzerpfad: http://127.0.0.1:3300/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1 → „Bilder & Medien“ → Kategorie. Im Linux-Browser dieselbe Route über http://192.168.235.196:3000.

| Viewport | Interaktion | Fälle | Screenshots |
| --- | --- | --- | --- |
| 390×844 | Touch | 4 Kategorien × leer/belegt/nur lesend = 12 | [Kategorien](390-categories.png), [Dialog](390-dialog.png) |
| 768×1024 | Tastatur/Enter | 12 | [Kategorien](768-categories.png), [Dialog](768-dialog.png) |
| 1440×900 | Maus | 12 | [Kategorien](1440-categories.png), [Dialog](1440-dialog.png) |

Die echte App-Seite und ihre Komponenten wurden mit synthetischer Session und abgefangenen API-Fixtures geprüft. Keine echten Profile oder Releases geschrieben, kein tatsächlicher Upload. Kategoriewahl öffnet exakt den zugehörigen Dialog, Abbrechen/Schließen und erneutes Öffnen derselben Kategorie funktionieren. Vorhandene Medien sind im Bearbeiten-/Ansehen-Dialog erreichbar. Die Dokumentbreite bleibt bei allen Fällen innerhalb des Viewports. Mobile-/Desktop-Kategorien und Tablet-Dialog visuell gegen den engen Screenshotauftrag geprüft. Viererreihe auf Desktop bzw. 2×2 auf Mobile; ursprünglicher Uploaddialog unverändert. [Messwerte](browser-results.json).

```sh
docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-dov-release-category-upload/browser-check.cjs
docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-dov-release-category-upload/build-check.cjs
```

Browserartefakte im Frontendcontainer: `/tmp/team4s-quick-260914-dov`. Der isolierte Build nutzt nur einen eigens angelegten und kontrolliert entfernten `/tmp/team4s-quick-dov-build-*`-Ordner. Keine Devserver-Neustarts oder Builds in dessen `.next`.

## Grenzen / offene Punkte

- Codex-In-app-Browser zeigte auf dem Nutzerpfad „Bitte einloggen“. Keine authentifizierte Human-UAT behauptet; technische Browserprüfung mit isolierten Fixtures wie oben belegt.
- Kein neuer realer Upload zur Datenbank ausgeführt. Versions-ID/Category-Payload und Fehlerabläufe durch bestehende Hook-/Section-Tests abgesichert.
- Die bestehende gemeinsame Drawer-Fokus-/Escapeimplementierung wurde nicht erweitert; diese Aufgabe betrifft die Einstiegspunkte und doppelte Card.
- Globale Lint-/Typecheck-/Build-Altfehler bleiben außerhalb dieses Fixes.
- Offene Human-UAT der Phasen 156–159 unverändert. Keine Produkt-/DB-/Vertragsänderung über den expliziten UI-Auftrag hinaus. Keine unautorisierten Datenänderungen oder Medienlöschungen.
- Untracked `frontend/scripts/shot2.mjs` unangetastet.

Quick-Plan und Umsetzung inline für diese eng gekoppelte Änderung, mit getrenntem Code-/Dokumentationscommit und durablem STATE-Eintrag.
