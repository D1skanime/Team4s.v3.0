# Phase 167 – Auftrag: Fansub-Gruppenerkennung beim Episoden-Import

**Herkunft:** Gespräch mit dem Auftraggeber am 2026-09-23 (Live-UAT Phase 165). Wunsch: „Kannst du aus den Fansub-Kürzeln, die in den Releases stecken, beim Import-Mapping eine automatische Zuordnung zu den schon angelegten Gruppen machen, damit ich das nicht jedes Mal neu zuweisen muss?“

## Ausgangslage (am Code und an echten Dateinamen erhoben, 2026-09-23)

- `backend/internal/importutil/fansub_group.go` (`DeriveFansubGroupName`) erkennt heute zwei Muster: den Inhalt der **ersten** eckigen Klammer im Dateinamen **oder Pfad**, sowie den Teil hinter `S01E01-` am Namensende. Für die Datei gibt es **keine Tests**.
- Das Ergebnis ist heute nur ein **Textvorschlag** im Import-Mapping; es gibt keine Verbindung zu den angelegten `fansub_groups`.
- `fansub_group_aliases` existiert bereits (Spalten: `fansub_group_id`, `alias`, `normalized_alias`; `UNIQUE(normalized_alias)` systemweit, `UNIQUE(fansub_group_id, normalized_alias)`, GIN-Trigram-Index auf `f_unaccent(normalized_alias)`). Inhalt bisher: ein einziger Eintrag („NS“ → New-Subs).
- `episode_import_repository_fansub_helpers.go` legt beim Import per `INSERT INTO fansub_groups … ON CONFLICT` **neue Gruppen aus dem Dateinamen** an.

### Messung des heutigen Parsers an echten Dateien des Auftraggebers

| Dateiname | heute erkannt | Bewertung |
|---|---|---|
| `[SHFS]07-Ghost_01_[H.264][1280x720][3390FBD1].mkv` | `SHFS` | richtig |
| `[GFE]Hand_Maid_May_01_[97D9369A].ogm` | `GFE` | richtig |
| `[FH-Subs]Needless EP01 720p (ger.sub).mp4` | `FH-Subs` | richtig |
| `[BDnP]NIGHT.HEAD.2041.S01E01[Web.1080p.AAC].mkv` | `BDnP` | richtig |
| `[BnP]NIGHT.HEAD.2041.S01E09[Web.1080p.AAC].mkv` | `BnP` | richtig (gleiche Gruppe, zweites Kürzel!) |
| `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv` | `GK` | richtig |
| `[Pure-Ani-me] Macross Delta 01 Ger Sub.mkv` | `Pure-Ani-me` | richtig |
| `[L-S] Natsume Yuujinchou S1 - 02.x264 (1280x720 h264 AAC)[C4B217BC].1080P.mkv` | `L-S` | richtig |
| `Naruto Ger Sub 012.avi` | *(leer)* | richtig, keine Gruppe im Namen |
| `Naruto_026-027_ger_Sub_Uncut(1920).mkv` | *(leer)* | richtig (Doppelfolge, kein Gruppenname) |
| `Naruto.S01E01-AnimeOwnage.avi` (Jellyfin-Umbenennung) | `AnimeOwnage` | richtig |
| `dmpd-mashle.magic.and.muscles.s01e17.german.dl.anime.1080p.web.h264.mkv` | *(leer)* | **falsch** – Szene-Schema, Kürzel steht vorn vor dem Bindestrich |
| `Serie_01_[AEC71BC3].mkv` | `AEC71BC3` | **falsch** – CRC-Prüfsumme als Gruppenname |

## Ziel

1. Das Gruppenkürzel wird zuverlässig aus dem **Dateinamen** gewonnen (nicht aus zufälligen Klammern im Pfad), inklusive Szene-Schema, und Prüfsummen/technische Angaben werden nie als Gruppe ausgegeben.
2. Das erkannte Kürzel wird beim Import-Mapping automatisch der **bereits angelegten** Fansub-Gruppe zugeordnet, sofern es eindeutig passt (Name, Slug oder Alias, normalisiert).
3. Unbekannte Kürzel werden beim manuellen Zuordnen als **zusätzlicher Alias** gelernt, sodass sie künftig automatisch erkannt werden.
4. Aus Dateinamen entstehen **keine** neuen Gruppen mehr.
5. Eine im Dateinamen erkennbare Versionskennung (`v2`, `v3`, `v4`) wird als Release-Version vorgeschlagen.

## Anforderungen

### A. Parser härten
- Nur der Dateiname wird ausgewertet; der Pfad höchstens als Rückfallebene, wenn der Dateiname leer ist.
- Erkannte Muster mindestens: `[Gruppe]Titel…`, `[Gruppe] Titel…`, `Gruppe-Titel.sXXeYY.…` (Szene), `Titel.SxxEyy-Gruppe.ext` (Jellyfin-Umbenennung des Auftraggebers), `Titel … [Gruppe]` am Ende (nur wenn eindeutig keine Technik/Prüfsumme).
- Nie als Gruppe gelten: reine Hex-Prüfsummen (8 Stellen), Auflösungen (`1080p`, `720p`, `1280x720`), Codecs/Container (`x264`, `h264`, `H.264`, `10bit`, `AAC`, `FLAC`, `BD`, `Web`, `WEB-DL`, `BDRip`), Sprachkennungen (`ger`, `ger.sub`, `german`, `dl`, `eng`, `subbed`, `dub`), Jahreszahlen, reine Zahlen.
- Ehrliches Ergebnis: Wenn kein Kürzel sicher erkennbar ist, wird nichts zurückgegeben.
- Tests mit genau den obigen echten Dateinamen (Treffer und Nicht-Treffer) – die Datei hat heute keinen einzigen Test.

### B. Zuordnung zu bestehenden Gruppen
- Abgleich des erkannten Kürzels gegen `fansub_groups.name`, `fansub_groups.slug` und `fansub_group_aliases.normalized_alias`, jeweils normalisiert (Kleinschreibung, Trennzeichen `-`, `_`, `.`, Leerzeichen vereinheitlicht, Akzente über das vorhandene `f_unaccent`).
- Bei eindeutigem Treffer ist die Gruppe im Import-Mapping vorausgewählt, mit sichtbarem Hinweis der Herkunft, z. B. „erkannt aus Dateiname: BDnP → Bloody-Shadow (Alias)“.
- Gebündelte Auflösung für alle Zeilen einer Vorschau (kein N+1, keine Abfrage pro Datei).
- Der Admin kann die Vorauswahl jederzeit ändern; nichts wird ohne Anzeige gesetzt.

### C. Unbekannte Kürzel
- Kein automatisches Anlegen neuer Gruppen aus Dateinamen (bestehenden Upsert-Pfad entfernen bzw. auf ausdrückliche Aktion beschränken).
- Ähnliche Gruppen werden über den vorhandenen Trigram-Index als Vorschlag angeboten („meinten Sie …?“), nie automatisch übernommen.
- Ohne Treffer bleibt die Gruppenauswahl leer und der Admin wählt aus der Liste.

### D. Aliase lernen und verwalten
- Ordnet der Admin ein erkanntes, bisher unbekanntes Kürzel einer Gruppe zu, wird es automatisch als Alias dieser Gruppe gespeichert.
- Mehrere Aliase pro Gruppe sind erlaubt (`BDnP`, `BnP`, `B-SH` …). Ein Alias gehört systemweit genau einer Gruppe.
- Gehört das Kürzel bereits einer anderen Gruppe: keine automatische Zuordnung, sichtbarer Hinweis „Kürzel gehört bereits zu <Gruppe>“, Umhängen nur auf ausdrückliche Aktion.
- Aliase sind in der Gruppenverwaltung sichtbar, ergänzbar und löschbar; Änderungen wirken sofort für künftige Importe, bereits zugeordnete Releases bleiben unverändert.
- Admin-Aktionen mit Audit-Attribution (Projekt-Constraint „Observability“).

### E. Versionskennung
- Endet der Dateiname auf `v2`, `v3`, `v4` (ggf. nach Prüfsumme/Klammern), wird das als Release-Version vorgeschlagen statt `v1`; änderbar.

## Nicht Teil dieser Phase
- Änderungen an der Episodenzuordnung selbst (z. B. Doppelfolgen wie `Naruto_026-027`) – nur prüfen und dokumentieren, ob der Import damit umgeht.
- Umbenennen von Dateien, Jellyfin-Metadaten, Streaming, Public-Seiten.
- Rückwirkende Zuordnung bereits importierter Releases.

## Tests
- Parser: alle oben gelisteten echten Dateinamen als Tabellentest, inklusive der beiden Fehlerfälle und der Nicht-Treffer.
- Zuordnung: Alias-Treffer, Name-Treffer, Slug-Treffer, kein Treffer, mehrdeutiges Kürzel (gehört anderer Gruppe), Groß-/Kleinschreibung und Trennzeichen-Varianten.
- Lernen: unbekanntes Kürzel zuordnen → Alias gespeichert; erneuter Import derselben Datei → automatisch erkannt; Kürzel einer fremden Gruppe → kein stiller Wechsel.
- Kein automatisches Anlegen: Import mit unbekanntem Kürzel legt keine Gruppe an.
- Performance: eine Vorschau mit vielen Dateien erzeugt eine konstante Zahl Abfragen.
- Integrationstests gegen eine echte Test-Datenbank für Alias-Schreibpfad und Eindeutigkeitsregel.

## Abschlussbericht
Ursprüngliches Verhalten, neue Erkennungsregeln mit Beispielen, wie die Zuordnung erfolgt, wie Aliase gelernt und verwaltet werden, was mit unbekannten und mehrdeutigen Kürzeln passiert, Query-Budget, Tests, offene Befunde.
