# Phase 174 – Live-UAT-Checkliste (D-25)

Admin-Klickabläufe werden live abgenommen (Nutzer, `http://127.0.0.1:3300`), nicht per neuer Klick-Simulation.
Erwartung überall: **Verhalten, Texte, Reihenfolge und Aussehen exakt wie vor Phase 174.**
Vor jeder Runde: `docker restart team4sv30-frontend` (HMR greift nicht), dann Strg+F5.

## Nach Welle 3 (Frontend-Hotspots)

### Fansub anlegen – `/admin/fansubs/create` — ✅ abgenommen 2026-10-05 (Nutzer; nach Fix BUG-174-01)
- [x] Erstanzeige: alle Formularfelder vorhanden, Alias-Liste leer
- [x] Name tippen → Slug wird automatisch abgeleitet (Umlaute/Sonderzeichen wie bisher)
- [x] Ungültigen Slug manuell eingeben → Fehlertext wie bisher; vorhandenen Slug → Konflikt-Hinweis
- [x] Speichern mit fehlenden/ungültigen Pflichtangaben → Fehlermeldung, nichts wird angelegt
- [x] Speichern erfolgreich → Erfolgsmeldung, Gruppe angelegt
- [x] Danach Alias hinzufügen → erscheint in der Liste, Sortierung wie bisher
- [x] Alias entfernen → verschwindet
- [x] Community-Link hinzufügen/ändern/entfernen, ungültige URL → Fehlertext
- [x] Logo-, Banner-, Hintergrund-Upload
- [x] Zweites Speichern (Änderung nach dem Anlegen) → Änderungen und Links korrekt übernommen
- [x] Ungespeicherte Änderung + Seite verlassen → Browser-Warnung wie bisher

### Fansub bearbeiten → Medien prüfen – `/admin/fansubs/[id]/edit` — ✅ abgenommen 2026-10-05 (Nutzer)
- [x] Medienliste lädt, Filter funktionieren
- [x] Hochladen (Upload-Feld) → neues Medium erscheint
- [x] Detail-Seitenleiste öffnen, bearbeiten, speichern
- [x] Schnellprüfung (einzeln) und Sammelprüfung (mehrere markiert)
- [x] Sortieren per Drag & Drop → Reihenfolge bleibt nach Neuladen erhalten
- [x] Löschen mit Bestätigungsdialog

### Anime anlegen – `/admin/anime/create` — ✅ abgenommen 2026-10-05 (Nutzer)
- [x] Jellyfin-Suche → Kandidat prüfen → übernehmen (Felder werden befüllt)
- [x] AniSearch-Suche → Kandidat wählen / Entwurf per ID laden
- [x] Cover-Upload; Bild-/Asset-Suche, „mehr laden“, Kandidat übernehmen
- [x] Anlegen/Speichern → Weiterleitung bzw. Erfolgsmeldung wie bisher; Konflikt-Fall (AniSearch bereits vorhanden) wie bisher

## Nach Welle 4 (Backend) — ✅ abgenommen 2026-10-06 (Nutzer, inkl. Gegenproben BUG-174-02…05)
- [x] (✅ abgenommen 2026-10-06, Nutzer) Segmente/Themes: Anime-Themes anlegen/bearbeiten, Segment anlegen/bearbeiten, Bibliotheks-Asset zuordnen, Abspielen/Vorschau
- [x] Fansub-Gruppe: öffentliche Profilseite, Mitglieder, Aliase/Links, Zusammenführen (Merge)
- [x] Anime-Assets: Cover/Banner/Logo/Hintergrund anzeigen und ersetzen
- [x] Release-Version-Medien: Liste, Upload, Ersetzen, Kategorie/Highlight, Reihenfolge

- [x] BUG-174-02 Gegenprobe nach Backend-Rebuild: timer-Dashboard ohne „Gruppenbild prüfen“ für New-Subs; Plattform-Admin sieht den Eintrag und kann freigeben

- [x] BUG-174-05 Gegenprobe: /fansubs/new-subs zeigt das selbst gesetzte Banner; danach ein weiteres Galeriebild hochladen → Banner bleibt unverändert

## Nach Welle 5 (CSS) — ✅ abgenommen 2026-10-06 (Nutzer)
Siehe 174-24 (Vorher/Nachher-Screenshots) – zusätzlich kurzer Sichtcheck Fansub-Edit Desktop + Mobile.
- [x] Fansub-Edit Desktop/375px: Layout identisch, einzige Abweichung ist eine Datenänderung (Banner/Logo)
- [x] 5 Zustandspaare (Button hover/focus/disabled, Input focus, Select focus) byte-identisch
- [x] `/dev/ui-system`: einzige Abweichung ist Aufnahmerauschen, kein sichtbarer Unterschied

Nebenbefund (nicht behoben, bereits im BEFORE vorhanden): auf Mobil überdeckt der sticky Speichern-Button das Feld Gruppentyp. Siehe `.planning/todos/pending/2026-10-06-mobile-sticky-save-button-ueberdeckt-gruppentyp.md`.
