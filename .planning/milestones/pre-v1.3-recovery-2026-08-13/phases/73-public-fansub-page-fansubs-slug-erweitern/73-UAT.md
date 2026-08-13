---
status: complete
phase: 73-public-fansub-page-fansubs-slug-erweitern
source: [73-01-SUMMARY.md, 73-01b-SUMMARY.md, 73-02-SUMMARY.md, 73-03-SUMMARY.md, 73-04-SUMMARY.md, 73-05-SUMMARY.md]
started: 2026-06-07
updated: 2026-06-07
method: live-browser (Claude Preview), real backend on :8092 against real Postgres :5433, fansub = AnimeOwnage (/fansubs/animeownage)
---

## Current Test

[expert live review abgeschlossen — Befunde unten]

## Tests

### 1. Seite lädt mit echten Daten + Bildern
expected: /fansubs/animeownage rendert Hero mit Banner + Logo, Titel, Status, Metazeile.
result: pass
note: Banner + Logo laden (Media via :8093). Titel „AnimeOwnage", Badge „aktiv", „1999 bis 2022 • Deutschland • aktiv", Pills + „Webseite besuchen".

### 2. Sticky Section-Nav mit Active-Highlight
expected: Sticky Navigation mit Sektionen, aktuelle Sektion hervorgehoben (IntersectionObserver).
result: pass
note: 8 Buttons (Geschichte, Höhepunkte, Projekte, Team, Mitwirkende, Medien, Timeline, Mehr); Active-State folgt beim Scrollen.

### 3. Höhepunkte-Statistiken
expected: Aggregierte Kennzahlen der Gruppe.
result: pass
note: 1 Anime-Projekte, 2 Release-Versionen, 3 Mitglieder, 23 Aktive Jahre (1999–2022 = 23 ✓).

### 4. Team-Split aktiv / ehemalig
expected: Aktive vs ehemalige Mitglieder getrennt (Phase-73 Team-Sektion).
result: pass
note: Aktive: Ballelboy (fansub_lead). Ehemalige: Angeldust (Projektmanagement).

### 5. Externe Mitwirkende getrennt vom Team
expected: Contributor-Sektion getrennt von Mitgliedern.
result: issue
reported: "Angeldust erscheint doppelt — als 'Ehemalige Mitglieder' (Projektmanagement) UND als 'Externe Mitwirkende' (Typesetting / FX). Ohne Querverweis wirkt das für Besucher wie ein Duplikat/Fehler."
severity: minor

### 6. Medien-Sektion
expected: Öffentliche Gruppen-/Release-/Member-Medien.
result: issue
reported: "Medien/Gruppenmedien zeigt exakt dasselbe Logo + Banner wie der Hero — redundant, kaum Mehrwert als eigene 'Medien'-Sektion (vermutlich weil nur Logo/Banner als Medien existieren)."
severity: minor

### 7. Section-Nav 'Timeline' Label-/Inhalts-Konsistenz
expected: Nav-Label entspricht der Zielsektion; 'Timeline' führt zu einer Timeline.
result: issue
reported: "Nav-Button 'Timeline' (id #timeline) führt zu einer Sektion mit Heading 'Gruppenleitung', deren Inhalt 'Noch keine Gruppenhistorie eingetragen.' lautet. Drei Namen für eine Sektion (Timeline / Gruppenleitung / Gruppenhistorie); 'Timeline' liefert keine Timeline."
severity: major

### 8. 'Geschichte'-Sektion Inhalt
expected: Geschichts-/Story-Inhalt der Gruppe.
result: issue
reported: "Die 'Geschichte'-Sektion wiederholt nur die Hero-Metazeile '1999 bis 2022 • Deutschland • aktiv' ohne eigentlichen Story-Text — redundant zum Hero (Story-Text fehlt in DB, aber Sektion bleibt inhaltsleer-redundant)."
severity: minor

### 9. 'Gruppenleitung' vs vorhandener Lead
expected: Leadership-Sektion spiegelt die Gruppenleitung wider.
result: issue
reported: "Sektion 'Gruppenleitung' zeigt 'Noch keine Gruppenhistorie eingetragen.', obwohl ein fansub_lead (Ballelboy) existiert; zudem Label 'Gruppenleitung' (Leitung) vs Inhaltstext 'Gruppenhistorie' (Historie) inkonsistent."
severity: minor

### 10. Umlaute / deutsche UI-Strings
expected: Korrekte Umlaute (ä/ö/ü/ß), keine Mojibake.
result: pass
note: Höhepunkte, Mitwirkende, öffentlich, Aktive Jahre etc. korrekt.

### 11. GDS-/Layout-Qualität
expected: Konsistente Primitives, Karten, Spacing.
result: pass
note: Konsistente Card-Stile, gute vertikale Rhythmik, saubere Empty-States (Projekte/Gruppenleitung).

### 12. Höhepunkte-Zähler vs Projekte-Liste konsistent
expected: Eine als 'Höhepunkt' gezählte Projektzahl entspricht der angezeigten Projektliste.
result: issue
reported: "Höhepunkte zeigt '1 Anime-Projekte', die Projekte-Sektion sagt aber 'Noch keine (öffentlich zugänglichen) Projekte'. Der Zähler inkludiert nicht-öffentliche Projekte, die Liste nur öffentliche → sichtbarer Widerspruch (1 vs. keine). Tritt bei beiden getesteten Gruppen auf."
severity: major

### 13. Mobile Responsive (375px) — kein horizontaler Overflow
expected: Auf Mobile passt der Inhalt in die Viewportbreite (kein horizontaler Seiten-Scroll).
result: issue
reported: "Bei 375px erzeugt das Gruppenbanner-Bild (fix ~480px breit, kein max-width:100%) 138px horizontalen Seiten-Scroll (scrollWidth 513 > 375). Medien-Sektion-Banner ist nicht responsive begrenzt."
severity: major

### 14. Empty-State-Resilienz bei inhaltsarmer Gruppe
expected: Eine Gruppe ohne Banner/Mitglieder/Projekte (Kollaboration animeownage-project-messiah) rendert ohne Crash mit sinnvollen Empty-States.
result: pass
note: Hero mit Logo-Platzhalter 'A&', 'Keine Mitglieder eingetragen', 'Noch keine Projekte' — sauber abgefangen; Höhepunkt-Grid adaptiert (nur 2 Kennzahlen).

### 15. Member-Link-Integration (Phase-74-Profil)
expected: Klick auf ein Mitglied führt zum öffentlichen Member-Profil.
result: pass
note: Ballelboy verlinkt korrekt auf /members/ballelboy.

### 16. Kollaborations-Entitäten als eigenständige Public-Fansub-Seite
expected: Nur echte Fansub-Gruppen haben eine eigene öffentliche /fansubs/[slug]-Profilseite; eine Kollaboration zweier Gruppen ist KEINE eigene Gruppe.
result: issue
reported: "'AnimeOwnage & Project Messiah' (slug animeownage-project-messiah) ist keine echte Gruppe, sondern eine Kollaboration zweier eigenständiger Gruppen (AnimeOwnage + Project Messiah), die gemeinsam an einer Naruto-Releaseversion (Episode 2 & 3) gearbeitet haben. Sie wird aber als vollwertige Public-Fansub-Seite mit eigenem Hero, 'aktiv'-Status, Höhepunkten und (leeren) Team-/Projekt-Sektionen gerendert — ein Phantom-'Gruppe'. Kollaborationen sollten nicht als eigenständige Gruppenprofile erscheinen (oder klar als 'Kollaboration zwischen X und Y' mit Links auf die echten Gruppen + die gemeinsamen Releases dargestellt werden), nicht als generisches Gruppenprofil."
severity: major
note: Erklärt die scheinbare 'Empty-State-Resilienz' aus Test 14 — die Leere kommt daher, dass die Entität gar keine echte Gruppe ist.

### 17. Banner-Darstellung konsistent über Public + Edit, ohne Verzerrung
expected: Das Gruppenbanner wird über alle Flächen (Admin-Edit + Public Hero + Public Medien) konsistent, verzerrungsfrei und responsive dargestellt.
result: issue
reported: "Drei unterschiedliche Banner-Renderings: (1) Admin-Edit (.fansubEditBannerImageElement) = object-fit:contain + object-position:center top + max-width:min(100%,980px) (responsive) + Side-Fill + Edge-Fade — ausgereift; (2) Public Hero (FansubHeroSection) = object-fit:contain ABER fixe ~958px Breite, max-width:none (nicht responsive, kein top-crop/Side-Fill); (3) Public Medien (FansubMediaSection) = object-fit:FILL -> Bild wird gestaucht/verzerrt, fixe 480px, max-width:none. Die Public-Flaechen uebernehmen die responsive, verzerrungsfreie Edit-Behandlung nicht; Medien verzerrt aktiv. Wurzel des Mobile-Overflows (#13). Empfehlung: Public Hero + Medien auf das Edit-Muster vereinheitlichen (contain + center top + max-width:100%, optional Side-Fill), object-fit:fill entfernen. Zusatz: Hero nutzt relative Media-URL, Medien absolute :8093-URL — auch hier vereinheitlichen."
severity: major

## Summary

total: 17
passed: 8
issues: 9
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Section-Nav-Labels entsprechen ihren Zielsektionen; 'Timeline' liefert eine Timeline"
  status: failed
  reason: "Nav 'Timeline' (#timeline) -> Heading 'Gruppenleitung' -> Inhalt 'Gruppenhistorie'; drei Namen, keine Timeline"
  severity: major
  test: 7
  artifacts: []
  missing: []
- truth: "Externe Mitwirkende sind klar von Mitgliedern getrennt, ohne verwirrende Duplikate"
  status: failed
  reason: "Angeldust erscheint als ehemaliges Mitglied UND als externer Mitwirkender ohne Querverweis"
  severity: minor
  test: 5
  artifacts: []
  missing: []
- truth: "Medien-Sektion zeigt echten Medien-Mehrwert, nicht nur den Hero-Inhalt"
  status: failed
  reason: "Gruppenmedien = identisches Logo+Banner wie Hero (redundant)"
  severity: minor
  test: 6
  artifacts: []
  missing: []
- truth: "Geschichte-Sektion liefert eigenständigen Inhalt, nicht nur die Hero-Metazeile"
  status: failed
  reason: "Geschichte wiederholt nur '1999 bis 2022 • Deutschland • aktiv'"
  severity: minor
  test: 8
  artifacts: []
  missing: []
- truth: "Leadership-/Gruppenleitung-Sektion ist konsistent benannt und spiegelt den Lead"
  status: failed
  reason: "Label 'Gruppenleitung' vs Inhalt 'Gruppenhistorie'; leer trotz fansub_lead Ballelboy"
  severity: minor
  test: 9
  artifacts: []
  missing: []
- truth: "Höhepunkte-Projektzähler entspricht der angezeigten Projektliste"
  status: failed
  reason: "Höhepunkte '1 Anime-Projekte' vs Projekte-Sektion 'Noch keine Projekte' (Zähler inkl. nicht-öffentlicher, Liste nur öffentliche)"
  severity: major
  test: 12
  artifacts: []
  missing: []
- truth: "Public Fansub Page hat auf Mobile (375px) keinen horizontalen Overflow"
  status: failed
  reason: "Gruppenbanner-Bild fix ~480px breit (kein max-width:100%) -> 138px horizontaler Seiten-Scroll"
  severity: major
  test: 13
  artifacts: []
  missing: []
- truth: "Nur echte Fansub-Gruppen haben eine eigene oeffentliche Profilseite; Kollaborationen werden nicht als eigenstaendige Gruppe dargestellt"
  status: failed
  reason: "Kollaboration 'AnimeOwnage & Project Messiah' (zwei Gruppen, gemeinsame Naruto-Releaseversion Ep 2-3) erscheint als vollwertige Public-Fansub-Seite mit eigenem Hero/Status/Stats statt als Kollaboration mit Verweis auf die echten Gruppen"
  severity: major
  test: 16
  artifacts: []
  missing: []
- truth: "Banner wird ueber Public Hero, Public Medien und Admin-Edit konsistent + verzerrungsfrei + responsive dargestellt"
  status: failed
  reason: "Drei Renderings: Edit contain+centertop+responsive+sidefill; Public Hero contain aber fix 958px/max-width:none; Public Medien object-fit:FILL (verzerrt) fix 480px. Public uebernimmt Edit-Muster nicht; Medien verzerrt."
  severity: major
  test: 17
  artifacts: []
  missing: []
