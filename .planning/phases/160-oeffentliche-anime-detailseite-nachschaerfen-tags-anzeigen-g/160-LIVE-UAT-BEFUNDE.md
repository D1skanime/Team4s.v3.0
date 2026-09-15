# Öffentliche Anime-Detailseite: Nacharbeit nach Live-UAT 158/159

**Quelle:** Live-UAT des Auftraggebers am 2026-09-15 auf `/anime/1` (Buddy Complex, Gruppe New-Subs).
Die menschliche Abnahme von Phase 158/159 bleibt offen, bis diese Phase umgesetzt ist.

**Abhängigkeit:** Erst planen und umsetzen, wenn die separate Jellyfin-Reparatur (andere KI, parallel)
abgeschlossen ist. Banner, Logo und Laufzeit der Detailseite hängen am Jellyfin-Medien-Manifest.

## Befunde (am Code und an den Daten belegt, 2026-09-15)

1. **Tags werden öffentlich nie angezeigt.**
   - Daten sind vorhanden: `anime_tags` (Anime 1: 8 Tags), API `GET /api/v1/anime/1` liefert `tags`
     (z. B. „Amnesia", „Real Robot"), Frontend-Typ `AnimeDetail.tags` existiert, der Admin-Editor zeigt sie.
   - `frontend/src/app/anime/[id]/page.tsx` rendert nur `genres`. Laut Git-Historie gab es nie eine
     öffentliche Tag-Ausgabe, also keine Regression.
2. **Gruppe erscheint mehrfach, zwei Elemente sehen wie Buttons aus.**
   - Grauer Chip „New-Subs" unter „Episoden (13)" (`page.tsx`, `fansubRow`, Altbestand vom Februar) →
     Link auf `/fansubs/<slug>`.
   - Titel der Story-Karte `ActiveFansubStory` → ebenfalls Link auf `/fansubs/<slug>`.
   - Im `FansubVersionBrowser` der blaue Umschalt-Button „New-Subs" (wählt die Gruppe, öffnet keine Seite)
     und die CTA „Gruppenbereich" → Projektseite `/fansubs/<slug>/fansubprojekt/<animeSlug>`.
   - Auftraggeber: zwei gleich aussehende „New-Subs"-Buttons sind verwirrend; der Link sollte eher
     „Zur Fansubgruppe" o. ä. heißen.
3. **Coop auf der Anime-Seite nicht erkennbar.**
   - Es gibt keine Coop-Kennzeichnung im Datenmodell; eine Coop ist eine Release-Version mit mehreren
     Einträgen in `release_version_groups`.
   - Die Versionszeile nennt alle Gruppennamen („A, B"), zeigt aber nur das Logo der ersten Gruppe. Kein
     Hinweis „Coop" / „gemeinsam mit …". Die Projektseite hat dagegen bereits die Kennzahl „Coop-Partner".
   - Aktueller Bestand: 0 Coop-Versionen, jeder Anime hat genau eine Gruppe → für die Abnahme werden
     Testdaten mit zweiter Gruppe und gemeinsamer Release-Version gebraucht.
4. **Gruppenumschaltung (Ist-Verhalten, zur Einordnung):** ein Umschalt-Button pro Gruppe aus
   `anime_fansub_groups`; Auswahl filtert die Folgenliste, wechselt die Story-Karte und das Ziel von
   „Gruppenbereich"; Auswahl wird pro Anime in `localStorage` gespeichert.

## Entscheidungen des Auftraggebers (2026-09-15)

- **Tags** stehen in der rechten Infokarte direkt **unter der Linie nach der Beschreibung**.
  - Technischer Hinweis: Die heutige Linie gehört zu `AnimeInfoBanner` und wird nur mit Banner gezeichnet.
    Vorschlag (noch zu bestätigen): Tags bekommen eine eigene Linie → Reihenfolge Beschreibung · Linie ·
    Tags (Chip-Stil wie Genres) · Banner (ohne zweite Linie). Ohne Tags keine zusätzliche Linie.

## Offene Entscheidungen (in discuss-phase klären)

- Alten grauen Chip unter „Episoden" entfernen oder umbenennen?
- Linkbeschriftungen und -ziele: „Zur Fansubgruppe" (Gruppenseite) und/oder „Zum Fansub-Projekt"
  (Projektseite) statt „Gruppenbereich"?
- Soll der Story-Kartentitel weiter verlinken?
- Wie wird eine Coop auf der Anime-Seite sichtbar (Badge in der Versionszeile, mehrere Logos, Hinweis in der
  Story-Karte)?
- Werden für die Abnahme Coop-Testdaten angelegt, und von wem?

## Randbedingungen

- Nur globale Primitives aus `@/components/ui`, globale Design-Tokens, echte Umlaute.
- Produktionsdateien bei oder unter 450 Zeilen (`page.tsx`-Größe prüfen).
- Keine Änderung an der Jellyfin-Anbindung in dieser Phase.
