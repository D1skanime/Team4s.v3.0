# Phase 174 – Live-UAT-Checkliste (D-25)

Admin-Klickabläufe werden live abgenommen (Nutzer, `http://127.0.0.1:3300`), nicht per neuer Klick-Simulation.
Erwartung überall: **Verhalten, Texte, Reihenfolge und Aussehen exakt wie vor Phase 174.**
Vor jeder Runde: `docker restart team4sv30-frontend` (HMR greift nicht), dann Strg+F5.

## Nach Welle 3 (Frontend-Hotspots)

### Fansub anlegen – `/admin/fansubs/create`
- [ ] Erstanzeige: alle Formularfelder vorhanden, Alias-Liste leer
- [ ] Name tippen → Slug wird automatisch abgeleitet (Umlaute/Sonderzeichen wie bisher)
- [ ] Ungültigen Slug manuell eingeben → Fehlertext wie bisher; vorhandenen Slug → Konflikt-Hinweis
- [ ] Speichern mit fehlenden/ungültigen Pflichtangaben → Fehlermeldung, nichts wird angelegt
- [ ] Speichern erfolgreich → Erfolgsmeldung, Gruppe angelegt
- [ ] Danach Alias hinzufügen → erscheint in der Liste, Sortierung wie bisher
- [ ] Alias entfernen → verschwindet
- [ ] Community-Link hinzufügen/ändern/entfernen, ungültige URL → Fehlertext
- [ ] Logo-, Banner-, Hintergrund-Upload
- [ ] Zweites Speichern (Änderung nach dem Anlegen) → Änderungen und Links korrekt übernommen
- [ ] Ungespeicherte Änderung + Seite verlassen → Browser-Warnung wie bisher

### Fansub bearbeiten → Medien prüfen – `/admin/fansubs/[id]/edit`
- [ ] Medienliste lädt, Filter funktionieren
- [ ] Hochladen (Upload-Feld) → neues Medium erscheint
- [ ] Detail-Seitenleiste öffnen, bearbeiten, speichern
- [ ] Schnellprüfung (einzeln) und Sammelprüfung (mehrere markiert)
- [ ] Sortieren per Drag & Drop → Reihenfolge bleibt nach Neuladen erhalten
- [ ] Löschen mit Bestätigungsdialog

### Anime anlegen – `/admin/anime/create`
- [ ] Jellyfin-Suche → Kandidat prüfen → übernehmen (Felder werden befüllt)
- [ ] AniSearch-Suche → Kandidat wählen / Entwurf per ID laden
- [ ] Cover-Upload; Bild-/Asset-Suche, „mehr laden“, Kandidat übernehmen
- [ ] Anlegen/Speichern → Weiterleitung bzw. Erfolgsmeldung wie bisher; Konflikt-Fall (AniSearch bereits vorhanden) wie bisher

## Nach Welle 5 (CSS)
Siehe 174-24 (Vorher/Nachher-Screenshots) – zusätzlich kurzer Sichtcheck Fansub-Edit Desktop + Mobile.
