---
status: testing
phase: 59-ffentliches-fansub-member-profil
source: [59-01-SUMMARY.md, 59-02-SUMMARY.md, 59-03-SUMMARY.md, 59-04-SUMMARY.md, 59-05-SUMMARY.md, 59-06-SUMMARY.md]
started: 2026-05-29T00:00:00Z
updated: 2026-05-29T00:00:00Z
---

## Current Test

number: 1
name: Öffentliches Profil aufrufen
expected: |
  Öffne /members/[dein-fansub-name-slug] im Browser (eingeloggt oder anonym).
  Die Seite lädt ohne Fehler und zeigt: Hero-Bereich mit Avatar und Fansub-Name,
  Bio-Text (falls vorhanden), Aktivzeitraum (falls gesetzt), und mindestens
  einen der Inhaltsblöcke (Gruppen, Medien oder Beiträge).
  Keine Layout-Überlappungen, kein weißer Leerblock.
awaiting: user response

## Tests

### 1. Öffentliches Profil aufrufen
expected: |
  Öffne /members/[dein-fansub-name-slug] im Browser (eingeloggt oder anonym).
  Die Seite lädt ohne Fehler und zeigt: Hero-Bereich mit Avatar und Fansub-Name,
  Bio-Text (falls vorhanden), Aktivzeitraum (falls gesetzt), und mindestens
  einen der Inhaltsblöcke (Gruppen, Medien oder Beiträge).
  Keine Layout-Überlappungen, kein weißer Leerblock.
result: [pending]

### 2. members_only-Profil anonym aufrufen
expected: |
  Stelle dein Profil auf "Nur für Mitglieder" (auf /me/profile → Sichtbarkeit).
  Öffne dann /members/[dein-slug] in einem privaten/incognito Tab (nicht eingeloggt).
  Die Seite zeigt: "Dieses Profil ist nicht öffentlich zugänglich." —
  kein Profilinhalt sichtbar, kein 404, keine Fehlerseite.
result: [pending]

### 3. Hintergrundbild hochladen
expected: |
  Gehe zu /me/profile (eingeloggt). Es gibt dort eine Card zum Hochladen eines
  Hintergrundbilds. Lade ein Bild hoch — der Cropper öffnet sich im 16:9-Format
  (Querformat, keine runden Ecken). Nach Bestätigen wird das Bild gespeichert
  und in der Card als Vorschau angezeigt.
result: [pending]

### 4. Hintergrundbild auf öffentlichem Profil
expected: |
  Nachdem du ein Hintergrundbild hochgeladen hast (Test 3):
  Öffne /members/[dein-slug]. Das hochgeladene Bild erscheint als breites
  Hero-Banner im oberen Bereich der Seite — hinter oder über dem Avatar/Name-Bereich,
  wie ein Profilbanner (ähnlich Jellyfin oder eBay-Profil).
result: [pending]

### 5. Fansub-Gruppen-Section
expected: |
  Auf /members/[dein-slug] (öffentlich, Profil auf "public") gibt es einen Block
  mit deinen Fansub-Gruppen. Jede Gruppe zeigt: Logo (oder Fallback-Icon),
  Gruppenname, und deine Rollen in der Gruppe.
  Ein Klick auf eine Gruppe öffnet /fansubs/[gruppen-slug].
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0

## Gaps

[none yet]
