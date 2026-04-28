---
phase: 27
gathered: 2026-04-28
status: ready_for_planning
---

# Phase 27: Segment Library Identity And Reuse - Kontext

## Ausgangslage

Phase 24 bis 26 haben einen funktionierenden Segment-Flow geschaffen:
- Segmente werden im Episode-Version-Kontext gepflegt.
- Segment-Typen sind auf generische Werte reduziert.
- Segment-Dateien koennen als echte `release_asset`-Quellen hochgeladen werden.
- Dateiname und Segment-/Dateistatus sind fuer Operatoren sichtbar.

Die heutige Loesch- und Identitaetsgrenze ist aber noch zu lokal:
- Segmente haengen technisch immer noch stark am lokalen Anime-Kontext.
- Anime-Delete raeumt anime-bezogene Datensaetze und anime-eigene Medienpfade hart auf.
- Ein spaeterer Reimport oder eine Neuanlage desselben Anime erhaelt eine neue lokale `anime.id`.
- Dadurch gehen Wiederfindbarkeit und sichere Wiederverwendung von OP/ED-Assets verloren, obwohl die fachliche Identitaet des Anime gleich geblieben ist.

## Produktproblem

Fachlich gilt:
- Ein OP bleibt ein OP.
- Die Fansub-Gruppe, die ein Karaoke/Timing fuer dieses OP gebaut hat, bleibt dieselbe.
- Das Segment gehoert dauerhaft zum kanonischen Anime, nicht zur zufaelligen lokalen Datensatz-ID.

Die jetzige Modellierung beantwortet diese Fachlichkeit nicht sauber genug, weil lokale IDs und lokale Delete-Semantik zu dominant sind.

## Ziel von Phase 27

Phase 27 trennt drei Dinge explizit:
1. die fachliche Segmentidentitaet,
2. die hochgeladenen/wiederverwendbaren Assets,
3. die lokale Verwendung im aktuellen Anime-/Release-/Version-Kontext.

Danach soll gelten:
- Segmentbibliotheksdaten bleiben ueber AniSearch-Identitaet und Gruppenkontext wiederfindbar.
- Ein geloeschter lokaler Anime vernichtet wiederverwendbare Segmentdaten nicht mehr blind.
- Ein neu importierter Anime mit derselben AniSearch-Identitaet kann vorhandene OP/ED-Segmente wiederfinden und erneut anbinden.

## Feste Entscheidungen

### 1. Keine Namensautoritaet ohne stabile IDs

Anime-Titel oder Dateinamen sind **nicht** die primaere Identitaet.

Stabile Autoritaet fuer den Anime:
- `anime_source_links.provider = 'anisearch'`
- `anime_source_links.external_id = <AniSearch-ID>`

Stabile Autoritaet fuer die Fansub-Gruppe:
- `fansub_group_id`

Stabile fachliche Segmentidentitaet:
- `anime provider/source`
- `anime external id`
- `fansub_group_id`
- `segment kind`
- optional `segment name`

### 2. Segmentname bleibt wichtig, aber nur zur Disambiguierung

Beispiele wie `OP 1`, `Final OP`, `TV Cut`, `BD Cut` bleiben erlaubt und sichtbar.
Sie helfen bei mehreren Segmenten desselben Typs, sind aber **nicht** alleiniger Schluessel.

### 3. Delete-Semantik wird in Bibliothek vs. lokale Verwendung getrennt

Anime-Delete soll kuenftig nicht mehr automatisch wiederverwendbare Segmentbibliotheksdaten entfernen.

Stattdessen gibt es zwei Ebenen:
- lokale Entkopplung vom geloeschten Anime-Datensatz
- echter Cleanup nur fuer unreferenzierte oder explizit lokale Restdaten

### 4. Upload bleibt im Segment-Editor, aber gegen Bibliotheksobjekte

Der Operator arbeitet weiter im Release-/Segment-Kontext.
Die Backend-Autoritaet muss dabei aber gegen wiederverwendbare Segmentdefinitionen und Segment-Assets schreiben, nicht gegen rein anime-lokale Einmalobjekte.

### 5. Provenance muss sichtbar bleiben

Die UI soll spaeter klar zeigen:
- neu hochgeladen
- bestehendes Bibliotheks-Asset wiederverwendet
- lokal verknuepft / erneut angebunden

## Architektur-Richtung

### Drei Ebenen

1. **Segment Definition**
   - fachliche Identitaet des Segments
   - stabil ueber AniSearch-ID + Gruppe + Typ + optional Name

2. **Segment Asset**
   - konkrete Datei bzw. Media-Asset-Zuordnung
   - kann aktiv, historisch oder alternativ sein

3. **Segment Assignment / Usage**
   - lokale Verwendung im aktuellen Release-/Version-/Editor-Kontext
   - darf neu entstehen oder verschwinden, ohne die Bibliothek selbst zu zerstoeren

### Wichtig fuer Phase 27

Phase 27 muss **nicht** sofort eine riesige neue Medienbibliothek bauen.
Aber sie muss den Daten- und Delete-Rahmen so umstellen, dass Reuse moeglich wird und spaetere Fansub-Selbstpflege nicht wieder an lokalen Anime-IDs zerbricht.

## Was Admin nach Phase 27 koennen soll

Im Segment-Editor:
- vorhandenes OP/ED fuer denselben AniSearch-Anime und dieselbe Gruppe wiederfinden
- vorhandenes Asset erneut anbinden statt blind neu hochzuladen
- bei Bedarf trotzdem ein neues Asset hochladen
- sehen, woher das Segment/Asset stammt

Nach Anime-Delete + Reimport:
- dieselbe AniSearch-Identitaet wiederfinden
- vorhandene Segmentbibliotheksdaten wieder zuordnen
- nicht bei Null anfangen muessen

## Was bewusst nicht Teil von Phase 27 ist

- Public Playback
- automatische OP/ED-Erkennung aus Dateiinhalten
- generische globale Medienbibliothek fuer alle Entitaetstypen
- vollstaendige Fansub-Selbstpflege-UI
- finales Rechte-/Rollenmodell fuer fremde Gruppen

## Kanonische Referenzen

- `.planning/ROADMAP.md` - aktuelle Phase-24/25/26 Segment-Richtung und neue Phase-27-Zielsetzung
- `.planning/STATE.md` - bestehende Segment- und Delete-Entscheidungen
- `.planning/phases/24-release-segmente-op-ed-timing/24-CONTEXT.md` - Segmentmodell und Release-Kontext
- `.planning/phases/26-segment-source-asset-upload-and-persistence/26-CONTEXT.md` - aktueller Upload-/Asset-Rahmen
- `backend/internal/repository/admin_content_anime_delete.go` - heutige Anime-Delete-Grenze
- `backend/internal/repository/episode_version_repository.go` - Release-/Version-Kontext und grouped reads
- `backend/internal/repository/admin_content_anime_themes.go` - heutige Segmentdefinitionen
- `backend/internal/handlers/admin_content_anime_theme_segments.go` - Upload/Delete und Segment-Handler

## Erfolgssicht

Wenn Phase 27 fertig ist, muss ich sagen koennen:

> Ich loesche einen lokalen Anime nicht mehr mit dem Risiko, wertvolle OP/ED-Arbeit zu vernichten. Wenn derselbe Anime ueber dieselbe AniSearch-ID spaeter wieder auftaucht, kann ich vorhandene Segmentdefinitionen und Assets erneut finden, wiederverwenden und bewusst neu zuordnen.
