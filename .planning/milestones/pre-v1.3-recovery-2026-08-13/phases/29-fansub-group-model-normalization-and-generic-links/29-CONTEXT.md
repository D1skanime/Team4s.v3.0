---
phase: 29
gathered: 2026-04-29
status: ready_for_planning
---

# Phase 29: Fansub Group Model Normalization And Generic Links - Kontext

## Ausgangslage

Der aktuelle lokale DB-Stand zeigt, dass das Fansub-Modell bereits mehrere brauchbare Bausteine besitzt:

- `fansub_groups` als Hauptdatensatz fuer Profil und Status
- `fansub_group_aliases` fuer alternative Namen
- `fansub_members` fuer Team-Mitglieder
- `fansub_collaboration_members` fuer explizite Kollaborationen
- `fansub_group_links` fuer generische externe Links
- `fansub_group_media` fuer Media-Referenzen

Gleichzeitig existieren aber mehrere Uebergangs- oder Doppelachsen:

- `history` neben `history_description`
- `dissolved_year` neben `closed_year`
- `logo_url` / `banner_url` neben `logo_id` / `banner_id`
- `fansub_group_aliases.fansub_group_id` neben `fansub_group_aliases.group_id`
- feste Linkspalten auf `fansub_groups` (`website_url`, `discord_url`, `irc_url`) neben der generischen Tabelle `fansub_group_links`

Das fuehrt zu zwei Problemen:

1. Das Produktmodell ist nicht klar genug, um darauf neue Fansub-Admin-Arbeit stabil aufzubauen.
2. Frontend und Backend laufen Gefahr, gleichzeitig das Zielmodell und alte Reconcile-Reste weiterzutragen.

## Ziel

Phase 29 definiert und implementiert den kanonischen Fansub-Stammdatenpfad.

Das bedeutet:

- `fansub_groups` bleibt der fachliche Hauptdatensatz fuer Gruppenidentitaet und Profil.
- Community-Links werden langfristig ueber `fansub_group_links` verwaltet, nicht nur ueber drei fest codierte URL-Spalten.
- Kollaborationsgruppen bleiben persistiert, werden aber explizit administrierbar.
- Legacy-Doppelfelder werden nicht mehr weiter vermehrt und erhalten einen sauberen Cleanup-Pfad.

## Produktentscheidungen

1. Ein kanonischer Gruppenkern.
   - `slug`, `name`, `description`, `history`, `status`, `group_type`, Jahresfelder, Land, Media-Referenzen und Timestamps bleiben der Kern.
   - Neue Produktlogik soll sich nicht auf `closed_year` oder `history_description` stuetzen.

2. Generische Links statt fest verdrahteter Einzelspalten.
   - `fansub_group_links` ist das Zielmodell fuer Community-Links.
   - Linktypen sollen mindestens `website`, `discord`, `twitter`, `github`, `irc` sauber tragen.

3. Kollaboration ist fachlich explizit.
   - `group_type='collaboration'` bleibt zulaessig und sinnvoll.
   - Die Mitgliedsgruppen muessen im Admin sichtbar und bearbeitbar sein.

4. Alias-Reconcile-Reste sind kein Zielmodell.
   - `fansub_group_aliases.fansub_group_id` bleibt die kanonische Beziehung.
   - `group_id` gilt als Legacy-/Cleanup-Spalte.

5. Media-Referenzen bleiben autoritativ ueber IDs.
   - `logo_id` / `banner_id` sind die fachlich autoritativen Verknuepfungen.
   - URL-Felder koennen fuer Lesbarkeit/Kompatibilitaet weiter existieren, sind aber kein neues Ziel fuer Produktlogik.

## Feste Entscheidungen fuer diese Phase

1. Generische Linkverwaltung wird jetzt bewusst produktiv gemacht und nicht weiter auf spaeter verschoben.
2. Collaboration-Mitglieder bekommen eine explizite Admin-Oberflaeche im Fansub-Edit-Kontext.
3. Cleanup dieser Phase ist kontrolliert:
   - neue Logik geht auf das Zielmodell,
   - alte Felder duerfen nur noch als Kompatibilitaetsprojektion oder Migrationsrest weiterlaufen,
   - harte Drops passieren erst mit verifizierter Absicherung.

## Kontextschnitte

### Was Admin jetzt koennen soll

Auf `/admin/fansubs/create` und `/admin/fansubs/:id/edit`:

- eine Fansub-Gruppe mit kanonischen Stammdaten pflegen
- beliebig viele Community-Links nach Typ anlegen und verwalten
- bei Kollaborationen explizit sehen und aendern, welche Gruppen Mitglied sind
- Aliase weiter pflegen, ohne ein zweites Alias-FK-Modell mitzuschleppen

### Was bewusst nicht Teil von Phase 29 ist

- eine vollstaendige oeffentliche Fansub-Detailseite-Neugestaltung
- generische Nicht-Anime-Entity-Rollouts
- Rechte-/ACL-Neudesign
- automatische Massenmigration externer Fansub-Metadatenquellen

## Technische Leitplanken

### Additive-first vor hartem Cleanup

Wenn eine API/UI-Umstellung noetig ist, soll sie zuerst additiv und kompatibel geschehen.
Harte Feldbereinigung kommt erst, wenn:

- Backend und Frontend auf dem Zielpfad laufen
- Verifikation zeigt, dass keine aktive Surface mehr vom Legacy-Feld abhaengt

### Kein neues doppeltes Linkmodell

Es darf keine neue dritte Linkachse entstehen.
Phase 29 soll die Richtung explizit auf `fansub_group_links` verengen, nicht eine weitere Hilfsschicht einfuehren.

### Kollaboration bleibt von Alltagsgruppen getrennt

Die Standardliste `/admin/fansubs` soll realen Gruppen dienen.
Kollaborationen bleiben persistiert, aber die UI fuer deren Verwaltung muss bewusst und explizit sein.

## Erfolgssicht

Wenn Phase 29 fertig ist, muss ich sagen koennen:

> Ich kann Fansub-Gruppen ueber ein klares Stammdatenmodell pflegen. Externe Links sind generisch statt fest verdrahtet, Kollaborationen sind explizit administrierbar, und die alten Reconcile-/Doppelfelder sind nicht mehr die heimliche Produktwahrheit.
