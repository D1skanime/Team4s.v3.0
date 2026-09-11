# Segment-Domain-Konsistenz und öffentliche Release-Projektion: Vorher/Nachher-Messung (Phase 156)

11. September 2026 · /home/d1sk/team4s · Ausgangsstand `8be341d5` (letzter Commit vor 156-01),
Endstand `6af965a2` (156-10, Task 1) · team4s-linux, Docker Compose.

**`theme_segment_assignments` ist jetzt die einzige kanonische Wahrheit für „welche Release-Version
verwendet welches Segment" auf beiden öffentlichen Oberflächen: die additive
Assignment-Synchronisation wurde durch eine Soll-Ist-Reconciliation ersetzt (Bereichsverkürzung
entfernt jetzt tatsächlich veraltete Zuweisungen, Bereichserweiterung ergänzt sie, in beiden
Richtungen inklusive neu angelegter Releases), die Release-Seite unterdrückt keine bereits
gezeigten Segmente mehr, und Segment-Credits werden nicht mehr über ein Rollenlabel-Substring-Match
(„kara"/„typeset") abgeleitet, sondern dynamisch aus einer stabilen, admin-korrigierbaren
Origin-Release-Version über eine zentrale Rollen-Code-Allow-Liste projiziert.** Die
Projektseiten-Timeline leitet Segmentexistenz jetzt ebenfalls aus `theme_segment_assignments` ab
statt aus einem `start_episode`/`end_episode`-Bereichsvergleich, und eine neue,
real-Postgres-gemessene Regressionsschranke pinnt die gebündelte Origin-Credit-Ladung auf konstant
3 SQL-Abfragen, unabhängig von Segment-/Beitragendenzahl.

**Diese Phase ist NICHT vollständig abgenommen.** Ein Punkt bleibt explizit offen: die Live-UAT des
Admin-Segment-Origin-Select-Controls (Plan 156-11, Task 2, `checkpoint:human-verify`) konnte in
keiner bisherigen Ausführungsumgebung durchgeführt werden, weil keine authentifizierte
Platform-Admin-Browsersession verfügbar war. Siehe „Offener Punkt" unten und
`.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md`.

## Methodik und Grenzen

- **Alle in diesem Dokument genannten Testresultate wurden in Plan 156-10 (2026-09-11) real
  ausgeführt**, nicht aus früheren SUMMARY.md-Dateien übernommen ohne Nachprüfung — siehe
  [REPRODUCE.md](REPRODUCE.md) für die exakten Befehle und [VALIDATION.md](VALIDATION.md) für die
  Zuordnung jeder Behauptung zu einem tatsächlich gelaufenen Befehl oder einem direkten Codebeleg.
- **Die Query-Budget-Konstante (3) ist aus Plan 156-09 zitiert, nicht neu gemessen** — der Test
  (`TestLoadReleaseSegmentsQueryBudgetIsConstant`, gepinnt auf `phase156SegmentOriginConstantQueryBudget = 3`)
  wurde in 156-10 erneut ausgeführt und bestätigt denselben Wert; die ursprüngliche Messung
  (Segment-Scan + 1 gebündelter `loadPublicEffectiveContributors`-Aufruf über die deduplizierte
  Origin-Menge + 1 gebündelter `applyAppliesThroughEpisode`-Aufruf) stammt aus 156-09-SUMMARY.md.
- **Kein Beschleunigungsversprechen ohne Messbeleg.** Die live gegen `team4s_v2` erfasste
  EXPLAIN-Evidenz für `idx_theme_segments_origin_release_version` (156-09-SUMMARY.md) zeigt bei der
  aktuellen Tabellengröße (3 Zeilen) ehrlich einen vom Planer bevorzugten Seq Scan — das ist bei
  dieser Datenmenge korrekt, kein Defekt. Der Index ist über einen erzwungenen Plan
  (`SET enable_seqscan = off`) als korrekt gebaut und wählbar nachgewiesen, nicht als „bereits
  heute schneller" behauptet. Diese Phase führt keine neue Browser-Performance-Messung (CDP/TTFB)
  durch — das ist außerhalb des Auftragsumfangs von Phase 156 (§20/§21 des Nutzerauftrags betreffen
  Query-Budget und Indizes, nicht Seitenladezeit).
- **Vorher-Zahlen stammen aus dem tatsächlichen Vorher-Quelltext bei Commit `8be341d5`** (der
  letzte Commit vor 156-01, per `git show 8be341d5:...` direkt gelesen, siehe TABLES.md für die
  exakten Zeilenzitate), nicht aus einer Nachmessung nach einem Codebase-Rollback.
- **Ein Punkt bleibt strukturell unmessbar in dieser Umgebung:** die admin-seitige,
  Browser-basierte UX-Prüfung des Segment-Origin-Select-Controls (P156-18, Plan 156-11 Task 2)
  erfordert eine echte, authentifizierte Platform-Admin-Session über den SSH-Tunnel
  (`http://127.0.0.1:3300`), die in keiner automatisierten Ausführungsumgebung dieser Phase
  verfügbar war. Dieser Punkt wird hier nicht als „bestanden" behauptet — siehe „Offener Punkt"
  unten.

## Vorher (Commit `8be341d5`, letzter Stand vor 156-01)

Vier fachliche Verhaltensweisen, direkt am damaligen Quelltext belegt:

1. **Assignment-Synchronisation war rein additiv.** `AssignThemeSegmentToEpisodeRange`
   (`theme_segment_assignments.go`) fügte beim Anlegen/Bearbeiten eines Segments Zuweisungen für den
   angegebenen Bereich hinzu, entfernte aber nie welche — eine Bereichsverkürzung (z. B. 1–10 auf
   1–5) ließ die Zuweisungen 6–10 unverändert bestehen (Drift zwischen Segment-Range und
   tatsächlichen Assignments, wie im Nutzerauftrag §1 beschrieben).
2. **Neue Releases wurden nicht automatisch bestehenden Segmenten zugewiesen.** Es gab keinen Hook
   im Release-Erstellungspfad, der eine neue Release-Version gegen bereits existierende
   Segment-Bereiche prüfte.
3. **Die Release-Seite unterdrückte bereits sichtbare Segmente (Phase 117, D-02).**
   `suppressSegmentsAlreadyVisibleOnPreviousEpisode` (`release_detail_public_repository_helpers.go:133-172`)
   entfernte ein Segment aus der Anzeige, sobald es bereits auf der direkten Vorfolge sichtbar war.
4. **Segment-Credits wurden über ein Rollenlabel-Substring-Match abgeleitet, aus den eigenen
   Beteiligten der BETRACHTETEN Release-Version.** `loadReleaseSegments`
   (`release_detail_public_repository_helpers.go:102-106`):
   ```go
   for _, c := range contributors {
       label := strings.ToLower(c.RoleLabel)
       if strings.Contains(label, "kara") || strings.Contains(label, "typeset") {
           karaParticipants = append(karaParticipants, c)
       }
   }
   ```
   Dieselben `karaParticipants` wurden JEDEM Segment der Release-Version zugewiesen (Zeile 108),
   unabhängig vom tatsächlichen Ursprung des Segments.
5. **Die Projektseiten-Timeline leitete Segmentexistenz aus einem Bereichsvergleich ab, nicht aus
   Assignments.** `attachReleaseTimelineSegments` (`group_repository_cursor.go:275-323`) prüfte
   `ts.start_episode <= episode_number <= ts.end_episode` und klassifizierte den Segmenttyp über
   eine SQL-`CASE...LIKE`-Kette (`LOWER(tt.name) LIKE '%kara%'` usw., Zeilen 296-307) — eine zweite,
   von der Release-Seite unabhängige Wahrheit.
6. **Keine stabile Segment-Origin-Referenz existierte.** `theme_segments` hatte keine Spalte, die
   fachlich festhält, bei welcher Release-Version ein Segment entstanden ist.
7. **Kein Query-Budget-Regressionstest existierte** für die (damals release-eigene)
   Credit-Projektion.

## Nachher (Endstand `6af965a2`, 156-10 Task 1)

1. **`AssignThemeSegmentToEpisodeRange` ist eine Soll-Ist-Reconciliation** (Plan 156-02):
   `models.ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride}`. Eine
   Bereichsverkürzung entfernt jetzt tatsächlich veraltete Zuweisungen (domain-scoped, niemals über
   Anime/Gruppe/Version-Grenzen hinweg); ein unvollständiger Bereich (`segmentID/animeID/
   fansubGroupID<=0` oder `startEpisode/endEpisode<=0`) blockiert JEDE Löschung (Guard bleibt
   wortgetreu die erste Anweisung der Funktion, zweifach regressionsgetestet). Bestätigt erneut
   grün in 156-10: `TestAssignThemeSegmentToEpisodeRange` (6 Subtests: assign/idempotent/shrink/
   grow/override-protection/cross-domain) und
   `TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange` (5 Subtests).
2. **Neue Release-Versionen werden automatisch passenden bestehenden Segmenten zugewiesen** (Plan
   156-03): `upsertReleaseVersionGroup` (der einzige produktive Insert-Pfad für
   `release_versions`) führt pro angehängter Fansub-Gruppe eine gebündelte
   `INSERT ... SELECT ... ON CONFLICT DO NOTHING` gegen `theme_segment_assignments` aus, mit
   byte-identischer Episoden-/Versionsauflösung zu Plan 156-02 — Segment-zuerst und Release-zuerst
   konvergieren auf dieselbe Zielmenge. Bestätigt erneut grün: 4/4
   `TestUpsertReleaseVersionGroupAutoAssign_*`-Subtests.
3. **Die Release-Seite unterdrückt keine Segmente mehr** (Plan 156-07):
   `suppressSegmentsAlreadyVisibleOnPreviousEpisode` ist GELÖSCHT (repo-weit null Treffer,
   `grep -rn "suppressSegmentsAlreadyVisibleOnPreviousEpisode\|karaParticipants" backend/` liefert
   keine Zeile). `DECISIONS.md` (Eintrag 2026-09-11) dokumentiert die bewusste Ablösung von Phase
   117s D-02 explizit NUR für die Release-Detailseite; der First-Occurrence-Gedanke von D-02 lebt
   jetzt auf der Projektseite weiter (Punkt 5 unten). Bestätigt erneut grün:
   `TestReleaseDetailPublicSegments` (3 Subtests, inkl. „geteiltes Segment wird auf der
   Folgeepisode NICHT unterdrückt").
4. **Segment-Credits werden dynamisch aus der Origin-Release-Version projiziert, gefiltert über
   eine zentrale Rollen-Code-Allow-Liste** (Plan 156-01/04/05/07):
   `permissions.SegmentCreditRoleCodes = {translator, timer, karaoke_fx, typesetter}`
   (`backend/internal/permissions/permissions.go:93`), `encoder`/`quality_checker` EXPLIZIT
   ausgeschlossen. `theme_segments.origin_release_version_id` (Migration 0161, nullable,
   admin-korrigierbar über `PUT /api/v1/admin/anime/:id/segments/:segmentId/origin`,
   `ON DELETE SET NULL`) ist die stabile Origin-Referenz. `loadReleaseSegments` lädt jetzt GENAU
   EINEN gebündelten `loadPublicEffectiveContributors`-Aufruf über die deduplizierte Menge aller
   Origin-Release-Versionen der Seite und filtert pro Segment über
   `hasAnySegmentRelevantRole` — kein `strings.Contains`-Aufruf mehr in diesem Pfad. Bestätigt
   erneut grün: `TestReleaseDetailPublicSegmentOriginCredits` (7 Subtests, inkl. „Encoder und
   Quality-Checker erscheinen NIE als Segment-Credit") und `TestSegmentCreditRoleFilter`
   (5 Subtests, DB-unabhängig, gegen die echte Allow-Liste).
5. **Die Projektseiten-Timeline leitet Segmentexistenz aus `theme_segment_assignments` ab, mit
   projektweiter (nicht seitenlokaler) First-Occurrence-Filterung** (Plan 156-06):
   `attachReleaseTimelineSegments` (`group_repository_cursor_timeline.go`) ersetzt den alten
   Bereichsvergleich durch einen direkten Join gegen `theme_segment_assignments`; die neue,
   exportierte `CanonicalSegmentType(themeTypeName string) string`
   (`backend/internal/repository/theme_segment_type.go`) ist ein 1:1-Port derselben
   Präzedenz-Logik (OP > ED > INSERT > KARA > Fallback), jetzt EINMAL in Go statt dupliziert in SQL
   und im Frontend — `ThemeTimeline.tsx` (Plan 156-08) rendert den Backend-kanonischen Typ direkt,
   die frühere Frontend-Typwelt (`TYPE_LABELS`/`TYPE_STYLE_KEYS`) ist gelöscht. Bestätigt erneut
   grün: `TestAttachReleaseTimelineSegments` (4 Subtests, inkl. pagination-sicherer globaler
   First-Occurrence) und 23/23 `ThemeTimeline.test.tsx`-Tests (inkl. `KARAAGE`-Regressionsfall
   gegen Substring-Fehlklassifikation).
6. **Query-Budget-Regressionsschranke** (Plan 156-09): `TestLoadReleaseSegmentsQueryBudgetIsConstant`
   pinnt die gebündelte Origin-Credit-Ladung auf konstant **3 SQL-Abfragen**
   (`phase156SegmentOriginConstantQueryBudget = 3`), real gegen isoliertes PostgreSQL gemessen für
   eine 1-Segment- UND eine 3-Segment-Release mit je unterschiedlichen Origin-Release-Versionen —
   identischer Wert in beiden Fällen, kein N+1. Bestätigt erneut grün in 156-10.
7. **Index-Plan-Evidenz** (Plan 156-09, hier zitiert, nicht neu erfasst): `idx_theme_segments_
   origin_release_version` (Migration 0161) wählt bei der aktuellen Datenmenge (3 Zeilen) ehrlich
   einen Seq Scan (korrekt bei dieser Größe), ein erzwungener Plan
   (`SET enable_seqscan = off`) beweist den Index als korrekt gebaut und wählbar
   (`Index Only Scan`, `Heap Fetches: 2`).
8. **Migration 0161 rundläuft sauber** — in 156-10 erneut geprüft: `down -steps 1` gegen die live
   `team4s_v2`-Datenbank entfernt die Spalte, `up` stellt sie wieder her, der deterministische
   Backfill liefert für alle drei bestehenden Segmente byte-identische Werte vor und nach dem
   Rundlauf (`id=1 -> 27`, `id=2 -> 27`, `id=3 -> 29`).

## Offener Punkt: Admin-Segment-Origin-Select, Live-UAT ausstehend

Plan 156-11 (Admin-UI für Segment-Origin-Korrektur) hat sein Task 1 (Type-Feld,
API-Client-Funktion, `@/components/ui`-`Select`-Steuerelement in `SegmentEditPanel.tsx`) vollständig
implementiert, committet (`d6edc718`) und automatisiert grün (TypeScript, 83/83 Vitest, 0 neue
ESLint-Warnungen, korrekter Umlaut „mitgeändert"). Task 2 ist ein `checkpoint:human-verify`-Gate,
das eine echte, authentifizierte Platform-Admin-Browsersession über den SSH-Tunnel
(`http://127.0.0.1:3300`) voraussetzt, um fünf konkrete manuelle Prüfschritte gegen einen realen
geteilten Segment-Datensatz (`theme_segment_id 3`, 3 Zuweisungen im Dev-Datenbestand) durchzuführen.
Diese Zugangsdaten lagen in keiner bisherigen Ausführungsumgebung dieser Phase vor — auch nicht in
dieser (156-10) Ausführung. Der Test bleibt daher **weder als bestanden noch als fehlgeschlagen
markiert** — er ist **offen**. Die konkrete Prüfanweisung steht in
`.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md`;
der Repo-Owner wird gebeten, sie direkt auszuführen und das Ergebnis dort zu dokumentieren.

**Konsequenz für den Phasenabschluss:** Phase 156 gilt hiermit als **funktional und automatisiert
abgeschlossen** (kompletter Backend-/Frontend-Testlauf grün, Migration verifiziert, Query-Budget
gepinnt, Bericht vorliegend) — **nicht** als vollständig verifiziert/abgenommen. `P156-18` bleibt
entsprechend nicht per `requirements.mark-complete` abgehakt, bis die Live-UAT bestätigt.

## Referenzen

- Vollständige Zahlen: [TABLES.md](TABLES.md)
- Reproduktionsbefehle: [REPRODUCE.md](REPRODUCE.md)
- Test-/Validierungsnachweis: [VALIDATION.md](VALIDATION.md)
- Offener Punkt: `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md`,
  `156-11-SUMMARY.md`
- Vorlage/Struktur: `docs/audits/2026-09-11-fansub-project-performance/`
