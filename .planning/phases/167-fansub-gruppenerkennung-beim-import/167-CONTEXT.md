# Phase 167: Fansub-Gruppenerkennung beim Episoden-Import - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Das Gruppenkürzel aus dem Dateinamen eines Releases wird zuverlässig erkannt und beim Episoden-Import automatisch der bereits angelegten Fansub-Gruppe zugeordnet (Name, Slug oder Alias). Unbekannte Kürzel werden beim manuellen Zuordnen als weiterer Alias gelernt; aus Dateinamen entstehen keine neuen Gruppen mehr. Eine Versionskennung im Dateinamen (v2/v3/v4) wird als Release-Version vorgeschlagen.

Verbindlicher Auftrag: `167-USER-REQUEST.md`. Nicht in dieser Phase: Episodenzuordnung/Doppelfolgen (nur prüfen und dokumentieren), Umbenennen von Dateien, Jellyfin-Metadaten, Public-Seiten, rückwirkende Zuordnung bereits importierter Releases.

</domain>

<decisions>
## Implementation Decisions

- **D-01 (Auftraggeber 2026-09-23):** Unbekannte Kürzel werden beim manuellen Zuordnen **automatisch** als zusätzlicher Alias der gewählten Gruppe gespeichert. Mehrere Aliase pro Gruppe sind erlaubt; ein Alias gehört systemweit genau einer Gruppe (bestehende `UNIQUE(normalized_alias)`).
- **D-02 (Auftraggeber 2026-09-23):** Gehört das Kürzel bereits einer anderen Gruppe, passiert nichts automatisch: sichtbarer Hinweis „Kürzel gehört bereits zu <Gruppe>“, Umhängen nur auf ausdrückliche Aktion. Kein stiller Wechsel.
- **D-03 (Auftraggeber 2026-09-23):** Passt kein Kürzel, werden ähnliche Gruppen über den vorhandenen Trigram-Index nur **vorgeschlagen**, nie automatisch übernommen. Neue Gruppen entstehen ausschließlich durch ausdrückliches Anlegen – der bestehende Auto-Upsert aus Dateinamen (`episode_import_repository_fansub_helpers.go`) entfällt bzw. wird auf eine ausdrückliche Aktion beschränkt.
- **D-04 (Auftraggeber 2026-09-23):** Eine Versionskennung am Dateinamen-Ende (`v2`, `v3`, `v4`, auch nach Prüfsumme/Klammern) wird als Release-Version vorgeschlagen statt `v1`; der Admin kann sie ändern.
- **D-05:** Der Parser wertet den **Dateinamen** aus; der Pfad nur als Rückfallebene, wenn der Dateiname leer ist (heute wird der ganze Pfad mitdurchsucht, was falsche Treffer erlaubt).
- **D-06:** Prüfsummen (8-stellige Hex), Auflösungen, Codecs, Container, Sprach-/Quellkennungen und reine Zahlen gelten nie als Gruppenname. Ist nichts sicher erkennbar, liefert der Parser leer statt zu raten (Beleg: `Serie_01_[AEC71BC3].mkv` liefert heute „AEC71BC3“).
- **D-07:** Das Szene-Schema `gruppe-titel.sXXeYY.…` muss erkannt werden (Beleg: `dmpd-mashle…s01e17…` liefert heute leer). Die vier bereits funktionierenden Schemata dürfen nicht regressieren (siehe Messtabelle im USER-REQUEST).
- **D-08:** Die Zuordnung für eine Import-Vorschau wird gebündelt aufgelöst (kein N+1, konstante Abfragezahl unabhängig von der Dateianzahl) und ist in der Oberfläche als Herkunft sichtbar („erkannt aus Dateiname: BDnP → Bloody-Shadow (Alias)“).
- **D-09:** Alias-Pflege (anlegen, umhängen, löschen) ist in der Gruppenverwaltung sichtbar und wird mit Audit-Attribution per user_id protokolliert.
- **D-10:** Der Parser bekommt echte Tabellentests mit den realen Dateinamen des Auftraggebers (heute existiert kein einziger Test für diese Datei); Alias-Schreibpfad und Eindeutigkeitsregel werden gegen eine echte Test-Datenbank geprüft, nicht nur mit Fakes.
- **D-11:** Globale UI-Primitives aus `@/components/ui` und globale Design-Tokens sind Pflicht; deutsche Texte mit echten Umlauten; Produktionsdateien ≤ 450 Zeilen; bereits übergroße Dateien nicht weiter vergrößern.

### Claude's Discretion
- Konkrete Regex-/Tokenizer-Struktur des Parsers, solange die Messtabelle erfüllt ist und Nicht-Treffer ehrlich leer bleiben.
- Ort der Alias-Verwaltung in der Gruppen-Bearbeitung und genaue Darstellung des Herkunftshinweises.
- Ob die Alias-Normalisierung im Go-Code oder in SQL erfolgt, solange sie zu `normalized_alias` passt.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-USER-REQUEST.md` — Auftrag inkl. Messtabelle echter Dateinamen
- `backend/internal/importutil/fansub_group.go` — heutiger Parser (keine Tests)
- `backend/internal/repository/episode_import_repository_fansub_helpers.go` — Auswahl-/Upsert-Pfad für Gruppen beim Import
- `backend/internal/handlers/admin_episode_import.go` — Import-Vorschau/Apply, Ordnerauswahl (Phase 165 D-14)
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` — Import-Oberfläche (bereits > 450 Zeilen, nicht vergrößern)
- DB: `fansub_group_aliases` (UNIQUE(normalized_alias), GIN-Trigram auf f_unaccent), `fansub_groups`
- `CLAUDE.md` — UI-Primitives, Umlaute, 450-Zeilen-Limit
- `.planning/phases/165-library-discovery-assisted-anime-creation/165-CONTEXT.md` — Discovery/Import-Kontext, keine Fuzzy-Automatik als Prinzip

</canonical_refs>

<code_context>
## Existing Code Insights

- Alias-Infrastruktur existiert vollständig (Tabelle, Normalisierung, Trigram-Index) und wird bisher kaum genutzt (ein Eintrag).
- Der Import kennt bereits eine ausgewählte Gruppe je Zeile (`SelectedFansubGroups`) und eine Prüfung gegen `fansub_groups`; es fehlt nur die automatische Vorauswahl aus dem Kürzel.
- Bestand: 10 Gruppen, Schreibweisen weichen von den Kürzeln ab (Bloody-Shadow/B-SH, FlameHaze-subs/FlameHazeSubs).

</code_context>

<specifics>
## Specific Ideas

- Praxisfall des Auftraggebers: NIGHT.HEAD-Release mit `[BDnP]` und `[BnP]` in einem Ordner – dieselbe Gruppe, zwei Kürzel. Ohne Aliase entstünden zwei Gruppen.
- Ziel des Auftraggebers: jedes Kürzel genau einmal pflegen, danach läuft der Import ohne manuelles Zuweisen.

</specifics>

<deferred>
## Deferred Ideas

- Doppelfolgen in einer Datei (`Naruto_026-027`) – in dieser Phase nur prüfen und dokumentieren.
- Rückwirkende Zuordnung/Bereinigung bereits importierter Releases.
- Erkennung weiterer Metadaten aus Dateinamen (Auflösung, Codec) als Vorbelegung.

</deferred>

---

*Phase: 167-fansub-gruppenerkennung-beim-import*
*Context gathered: 2026-09-23*
