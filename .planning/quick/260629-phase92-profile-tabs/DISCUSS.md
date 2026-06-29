# Phase 92 DISCUSS - Mein Profil Tabs & Accordions

## Ausgangslage

- Phase 90 ist abgeschlossen und committed: `3247f9ad feat(phase-90): harden release and group media flows`.
- Phase 91 ist abgeschlossen und committed:
  - `ac17099c feat(phase-91): aggregate profile recent projects`
  - `87a0c3b fix(phase-91): route profile recent projects through shared component`
- Der Arbeitsbaum war vor Phase 92 sauber.
- Der Frontend-Container wurde nach Phase 91 auf Port 3000 neu gebaut und gestartet. `GET http://127.0.0.1:3000/me/profile` lieferte 200.

## Aktueller Codebefund

- `/me/profile` rendert aktuell eine lange Zwei-Spalten-Kartenstruktur in `frontend/src/app/me/profile/page.tsx`.
- Die Seite nutzt den gemeinsamen `RecentContributionsSection` aus `frontend/src/components/profile/RecentContributionsSection.tsx`, der seit Phase 91 projektorientiert nach `anime_id` aggregiert.
- Die Seite nutzt den gemeinsamen `RecentMediaSection` aus `frontend/src/components/profile/RecentMediaSection.tsx`.
- Avatar und Hintergrundbild werden bereits ueber bestehende Upload-Wrapper gespeichert:
  - `uploadOwnProfileAvatar`
  - `uploadOwnProfileBackground`
- Die Story-Bilder laufen ueber `uploadOwnProfileStoryImage` und werden erst beim globalen Profil-Speichern hochgeladen.
- Die geschuetzte Route gated korrekt auf `hasAccessToken || hasRefreshToken`; der zentrale API-Client bleibt fuer Refresh und Auth-Header verantwortlich.

## Graubereiche

1. Speicherlogik "Meine Fansub-Geschichte"
   - Der Button "Bearbeiten" ist aktuell kein separater Persistenzpfad.
   - Die Persistenz erfolgt bereits im globalen `handleSubmit` ueber `updateOwnProfile({ member_story_json: ... })`.
   - Ergebnis: Die Story kann fachlich in der Sticky-Save-Leiste aufgehen. Der Editiermodus darf als UI-Zustand erhalten bleiben.

2. Doppelte Medien-Karten
   - `recent_media` liefert einzelne Medienobjekte mit eigener `id`.
   - Die bisherige Beschriftung fokussiert Release-Version und Anime, wodurch unterschiedliche Bilder derselben Release-Version gleich wirken koennen.
   - Ergebnis: Phase 92 behebt nur die Darstellung mit eindeutigen Labels wie "Vorschau 1". Eine moegliche Daten-Deduplizierung ist ausgeschlossen.

3. Kurzbeschreibung vs. Fansub-Geschichte
   - `bio` und `member_story_json` sind getrennte Felder im DTO und werden getrennt gespeichert.
   - Ergebnis: Semantik bleibt getrennt; Phase 92 gruppiert nur visuell.

4. Tab-Wechsel mit ungespeicherten Aenderungen
   - Der bestehende Dirty-State ist seitenspezifisch und nicht abschnittsspezifisch.
   - Ergebnis: Der Dirty-State bleibt tabuebergreifend erhalten. Kein Warn-Dialog beim Tab-Wechsel.

5. Ziel von "Profil ansehen"
   - Der bestehende gemeinsame Hero verlinkt bereits auf `/members/${slug || member_id}`.
   - Ergebnis: Phase 92 nutzt denselben vorhandenen Zielpfad als kompakten Ghost-Link. Keine neue oeffentliche Profilseite.

## Nicht-Ziele

- Keine Backend-Aenderungen.
- Keine DTO-Aenderungen.
- Keine Migrationen.
- Keine Aenderung an Contribution-Ownership, Permissions, Badge-Vergabe oder Account-Sicherheitsfunktionen.
- Keine Datenbereinigung fuer doppelt wirkende Medien.
