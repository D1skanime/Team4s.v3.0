# Phase 117: Kara-Segment — Zeit-Override je Folge + entdoppelte Anzeige - Context

**Gathered:** 2026-07-28
**Status:** Analysis-first — bestehendes Subsystem analysieren, bevor geplant/gebaut wird

<domain>
## Phase Boundary

Zwei Verbesserungen am **bestehenden** Kara-/Segment-Subsystem, **ohne Re-Encode**:

1. **Zeit-Override je Folge** für ein über eine Episoden-Spanne **geteiltes** Segment.
2. **Entdoppelte UI-Anzeige** der Segmente.

**Analysis-first-Gebot (zwingend):** Zuerst wird das reale Segment-/Timing-/Render-Cache-Modell
und die Herkunft der Anzeige gegen den echten Code analysiert. **Nichts raten, nichts vorschnell
bauen** (keine neuen Tabellen/Spalten/APIs vor der Analyse). Datenmodell/Begriffe nicht durch
Vermutungen ersetzen.

</domain>

<decisions>
## Locked Requirements (vom Nutzer)

### D-01 Zeit-Override eines geteilten Segments (ohne Re-Encode, ohne „neues Segment")
- Ein Kara-Segment gilt oft **gleich über eine Episoden-Spanne** eines Releases/Projekts
  (z. B. Folge 1–12, dasselbe OP).
- Eine **einzelne** Folge kann eine **andere Startzeit** für dasselbe Segment haben.
- Der Nutzer will **nur diese eine Zeit** korrigieren können — als **Offset/Override**, rein als
  **Metadaten** —, **ohne** dass das Video **neu encodet** wird und **ohne** dass daraus ein
  eigenes/neues Segment wird. Es bleibt **dasselbe Segment, nur für diese Folge verschoben**.

### D-02 Entdoppelte Anzeige
- Aktuell wird das Segment **für jede Folge/jedes Release** angezeigt — das soll NICHT so sein.
- Stattdessen: **einmal am Spann-Beginn** anzeigen (die Folge, wo das Segment beginnt), und
  **erst wieder** dort, wo im selben Projekt ein **wirklich anderes** Segment startet.
- Ein reiner **Zeit-Unterschied/Offset** erzeugt **keinen** neuen Anzeige-Eintrag — nur ein
  **echter Segment-Wechsel** tut das.

### Claude's Discretion (erst NACH Analyse)
- Konkrete Umsetzung von Offset-Override (neue Spalte/Override-Tabelle vs. vorhandenes Feld) und
  entdoppelter Anzeige — an bestehenden Segment-/Timing-Strukturen orientiert, ohne Re-Encode.

</decisions>

<research_required>
## Analyse-Report (ZWINGEND vor Umsetzung) — gegen echten Code, mit Datei:Zeile

1. **Segment-Datenmodell:** Welche Tabellen/Spalten definieren Kara-Segmente (Start/Ende, Typ
   OP/ED, Zeit/Offset)? (Start: `theme_types`→kara-Umbenennung `0058`, `theme_segment_render_cache`
   `0122`, `release_version_media_schema` `0059`.)
2. **Geltungsbereich/Sharing:** Sind Segmente pro **Episode-Version** gespeichert, oder
   spann-/release-/projektweit? Wie wird „dasselbe Segment über Folge 1–12" heute abgebildet —
   dupliziert pro Folge oder geteilte Definition + Referenzen?
3. **Timing:** Wie wird die Zeit gespeichert (absolute Start/Ende je Episode-Version vs. relativer
   Offset)? Wo könnte ein **Per-Folge-Offset/Override** liegen, ohne das Quellvideo zu berühren?
4. **Render-Cache vs. Encode:** Was macht `theme_segment_render_cache`? Erfordert eine
   Zeit-Änderung ein **Re-Render** (Cache/Preview) — und wie unterscheidet sich das vom
   **Re-Encode** (Quellvideo)? Genau abgrenzen (Nutzer will KEIN Re-Encode).
5. **Anzeige-Herkunft:** Wo und wodurch wird das Segment **„für jede Folge"** angezeigt?
   (Admin: `SegmenteTab`/`useReleaseSegments`/`SegmentEditPanel` unter
   `admin/episode-versions/[versionId]/edit/`; öffentlich: Kara-Timeline/Playback aus 103/105.)
   Welche Datenabfrage/Logik erzeugt die Wiederholung?
6. **„Anderes Segment" vs. „andere Zeit":** Woran erkennt man im Datenmodell einen **echten
   Segment-Wechsel** gegenüber nur einem **Zeit-Offset** — damit die entdoppelte Anzeige
   entscheiden kann, wann neu gezeigt wird?
7. **Bestehende Write-Pfade:** Welche Pfade ändern Segment-Timing heute? Lösen sie ein Re-Encode/
   Re-Render aus?
8. **Öffentliche Seite:** Wo genau wird das Kara pro Folge auf der Release-Detailseite gezeigt
   (103/105) — dieselbe Entdopplungs-Regel muss dort greifen.

**Erwartetes Ergebnis:** Bericht mit realem Modell, betroffenen Dateien, Vorschlag für Offset-
Override (ohne Re-Encode), Vorschlag für Entdopplungs-Logik (Admin + öffentlich), Risiken
(Render-Cache-Invalidierung, Konsistenz), Umsetzungsumfang, sinnvolle Teilphasen. **Erst danach
Umsetzung planen.**

</research_required>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase-117-Grenze.
- `./CLAUDE.md` — Konventionen (UI-System, Umlaute, 450-Zeilen-Limit, Contract-first).
- Phasen 103/105 (Kara-Playback / Kara-Timeline-Redesign) — bestehende Kara-Anzeige.

</canonical_refs>

<code_context>
## Existing Code Insights (Startpunkte — zu verifizieren)

- Migrationen: `0058_rename_theme_types_kara`, `0059_release_version_media_schema`,
  `0122_theme_segment_render_cache`.
- Admin-Editor: `frontend/src/app/admin/episode-versions/[versionId]/edit/` — `SegmenteTab.tsx`,
  `SegmentEditPanel.tsx`, `useReleaseSegments.ts`, `segmenteTabUtils.ts`.
- Stream/API: `frontend/src/app/api/segments/[id]/stream/route.ts`.
- Backend-Segment-Repositories/Handler unter `backend/internal/` (im Research auffinden).

</code_context>

<specifics>
## Specific Ideas

- Leitbeispiel Nutzer: OP gilt Folge 1–12 gleich; Folge 7 hat andere Startzeit → nur diese Zeit
  korrigieren (Offset), kein Re-Encode, kein neues Segment. Anzeige: OP einmal am Beginn zeigen,
  erst bei echtem Segment-Wechsel erneut — nicht bei bloßem Zeit-Offset.

</specifics>

<deferred>
## Deferred Ideas

- Gruppenbezogene Ranglisten / Benachrichtigungen (waren 117-Alternativen) — eigene spätere Phasen.

</deferred>

---

*Phase: 117-kara-segment-zeit-override-anzeige*
*Context gathered: 2026-07-28*
