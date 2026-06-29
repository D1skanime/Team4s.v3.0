# Phase 92 PLAN - Mein Profil Tabs & Accordions

## Ziel

`/me/profile` wird von einer langen Kartenliste zu einer thematischen Profilbearbeitung mit Header, vier Tabs, Accordions und Sticky-Save-Leiste umgebaut. Bestehende Speicher- und Uploadpfade bleiben erhalten.

## Geplante Dateien

- `frontend/src/app/me/profile/page.tsx`
  - Header, Tabs, Panels, Accordions, Sticky-Save-Bar verdrahten.
  - Bestehende Form-State-, Dirty-State- und Submit-Logik behalten.
- `frontend/src/app/me/profile/page.module.css`
  - Layout fuer Header, Tabs, Accordions, kompakte Medienzeilen, Toggle-Switches und Sticky-Save-Bar.
- `frontend/src/app/me/profile/components/ProfileBasicsForm.tsx`
  - Basisdaten auf Fansub-Nick und Aktivitaetszeitraum begrenzen.
- `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx`
  - Select + Pille durch einen Toggle pro Badge ersetzen.
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx`
  - Optionale kompakte Darstellung und externe Upload-Trigger-Refs ermoeglichen.
- `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx`
  - Optionale kompakte Darstellung und externe Upload-Trigger-Refs ermoeglichen.
- `frontend/src/components/profile/RecentMediaSection.tsx`
  - Medien eindeutig mit "Vorschau 1/2/3" beschriften.
- `frontend/src/components/profile/RecentContributionsSection.tsx`
  - Projektkarte visuell staerken: Cover/Initial-Tile, Rollen-Chips und Fortschrittsbalken aus vorhandenen Counts.
- Tests unter `frontend/src/app/me/profile` und `frontend/src/components/profile`.

## Backend

- Keine Backend-Aenderungen.
- Bestehende Endpunkte bleiben:
  - `GET /api/v1/me/profile`
  - `PATCH /api/v1/me/profile`
  - Badge-Visibility-Patch
  - Noindex-Patch
  - Avatar-/Background-/Story-Upload

## Frontend

- Vier Tabs: `Profil`, `Sichtbarkeit`, `Aktivitaet`, `Account`.
- Header bleibt oberhalb der Tabs und zeigt Avatar, Namen, Verifiziert-Status, Tagline und kompakten Profil-Link.
- Sticky-Save-Bar nutzt denselben globalen Submit.
- Avatar-Stift und Avatar-Zeile rufen denselben File-Input auf; Banner-Button und Banner-Zeile ebenso.
- Badge-Toggle mappt `checked=true` auf `public` und `checked=false` auf `internal`; bestehende `hidden`-Badges bleiben sichtbar und werden beim Ausschalten in `internal` ueberfuehrt, weil Phase 92 nur zwischen "Oeffentlich" und "Nur fuer dich" unterscheidet.

## DTO-Auswirkungen

- Keine neuen Felder.
- `bio` bleibt Kurzbeschreibung mit max. 280 Zeichen.
- `member_story_json` bleibt separate Fansub-Geschichte.
- `recent_contributions` bleibt projektorientiert durch Phase 91.
- `recent_media` bleibt unveraendert; nur die Anzeige bekommt eindeutige Preview-Labels.

## Risiken

- Badge-Visibility verliert in der UI die explizite Auswahl `hidden`. Das ist fachlich akzeptiert durch die Phase-92-Anforderung "ein einzelner Toggle"; API und Datenmodell behalten `hidden` weiter.
- Story-Editor bleibt ein Editiermodus. Dadurch bleibt die bestehende Schutzlogik gegen unbeabsichtigtes Rich-Text-Editieren erhalten.
- Projekt-Coverdaten liegen im DTO nicht vor. Das UI verwendet deshalb ein stabiles Initial-/Cover-Tile und erzeugt keinen neuen API-Vertrag.
- Noindex- und Badge-Sichtbarkeit speichern weiterhin unmittelbar; nur das Profilformular selbst laeuft ueber die Sticky-Save-Leiste.

## Fachliche Entscheidung

Die Loesung ist fachlich korrekt, weil die Profilseite eine Bearbeitungsoberflaeche fuer vorhandene Member-Profilfelder ist. Sie darf die vorhandenen Domain- und Speichergrenzen nicht verschieben:

- Profilbasis, Bio, Story, Aktivitaet und Profil-Sichtbarkeit gehoeren zum Member-Profil und bleiben im globalen `updateOwnProfile`-Flow.
- Avatar und Banner sind weiterhin eigene Media-Flows mit bestehender Crop-/Uploadlogik.
- Badges behalten ihre eigene Sichtbarkeitsmutation, weil die Badge-Vergabe und Sichtbarkeit nicht Teil des Profilformular-DTOs sind.
- Accountdaten bleiben read-only und verweisen auf die bestehende Accountverwaltung.
