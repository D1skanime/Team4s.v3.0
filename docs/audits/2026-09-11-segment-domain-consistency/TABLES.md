# Segment-Domain-Konsistenz: Exakte gemessene Zahlen

Begleitdokument zu [REPORT.md](REPORT.md). Vorher = Commit `8be341d5` (letzter Stand vor 156-01).
Nachher = Endstand `6af965a2` (156-10, Task 1). Siehe [REPRODUCE.md](REPRODUCE.md) für die exakten
Befehle.

## 1. Assignment-Synchronisation (`AssignThemeSegmentToEpisodeRange`)

| Verhalten | Vorher (`8be341d5`) | Nachher (`6af965a2`) |
| --- | --- | --- |
| Bereichsverkürzung (z. B. 1–10 -> 1–5) | Zuweisungen 6–10 bleiben bestehen (additiv, kein Löschen) | Zuweisungen 6–10 werden entfernt (`Removed`), außer override-geschützt |
| Bereichserweiterung (z. B. 1–5 -> 1–10) | Zuweisungen 6–10 werden ergänzt | unverändert: Zuweisungen 6–10 werden ergänzt (`Added`) |
| Unvollständiger Bereich (`segmentID/animeID/fansubGroupID<=0` oder `startEpisode/endEpisode<=0`) | keine Löschung möglich (Funktion additiv) | Guard blockiert JEDE Löschung, bewiesen ohne DB-Zugriff UND mit echtem Postgres-Lauf gegen seed-Daten |
| Override-geschützte Zuweisung außerhalb des neuen Bereichs | -- (kein Override-Konzept in diesem Pfad) | überlebt die Verkürzung (`ProtectedByOverride`) |
| Cross-Domain-Sicherheit (andere Anime/Gruppe/Version) | -- | strukturell unmöglich zu löschen (Domain-Scoping der DELETE-Query) |
| Rückgabewert | `[]int64` (nur hinzugefügte IDs) | `*models.ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride}` |

Re-Verifikation 156-10 (2026-09-11): `TestAssignThemeSegmentToEpisodeRange` (6/6 Subtests PASS),
`TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange` (5/5 Subtests PASS),
`TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess` (5/5 Subtests PASS) — alle
gegen `team4s_phase117_test_156`.

## 2. Neue Release-Versionen und bestehende Segmente

| Szenario | Vorher | Nachher |
| --- | --- | --- |
| Segment existiert zuerst (Range 1–10), Release 4 wird später angelegt | keine automatische Zuweisung | automatische Zuweisung via `upsertReleaseVersionGroup`-Hook |
| Release existiert zuerst, Segment wird später angelegt | (unverändert, deckt Plan 156-02 ab) | (unverändert, deckt Plan 156-02 ab) |
| Release-Version mit 2 angehängten Fansub-Gruppen | -- | 2 unabhängige gebündelte Zuweisungen (eine pro Gruppe) |
| Wiederholter Hook-Aufruf auf bereits zugewiesene Release-Version | -- | `ON CONFLICT DO NOTHING`, kein Duplikat |
| Release außerhalb jedes Segmentbereichs | -- | keine Zuweisung |

Re-Verifikation 156-10: 4/4 `TestUpsertReleaseVersionGroupAutoAssign_*`-Subtests PASS
(`SegmentFirst`, `ReleaseFirstThenSegment`, `MultiGroup`, `OutOfRangeGetsNoAssignment`).

## 3. Release-Seite: Segment-Sichtbarkeit

| Verhalten | Vorher (`8be341d5`) | Nachher (`6af965a2`) |
| --- | --- | --- |
| Segment bereits auf der direkten Vorfolge sichtbar | wird auf der aktuellen Folge unterdrückt (`suppressSegmentsAlreadyVisibleOnPreviousEpisode`, Phase 117 D-02) | wird NICHT unterdrückt — jedes tatsächlich zugewiesene Segment wird gezeigt, mit Range-Kennzeichnung |
| `suppressSegmentsAlreadyVisibleOnPreviousEpisode` im Quelltext | vorhanden (`release_detail_public_repository_helpers.go:133-172`, Vorher-Commit) | GELÖSCHT (`grep -rn "suppressSegmentsAlreadyVisibleOnPreviousEpisode" backend/` -> 0 Treffer) |
| `loadAdjacentReleases` (Previous/Next-Navigation) | vorhanden, ein Aufrufer | unverändert vorhanden, ein Aufrufer (`release_detail_public_repository.go:213`) |
| `DECISIONS.md`-Eintrag zur Ablösung | -- | vorhanden, datiert 2026-09-11, Scope explizit auf Release-Detailseite begrenzt |

Re-Verifikation 156-10: `TestReleaseDetailPublicSegments` (3/3 Subtests PASS, inkl. „geteiltes
Segment wird auf der Folgeepisode NICHT unterdrückt (D-02 aufgehoben)").

## 4. Segment-Credit-Ableitung

| Verhalten | Vorher (`8be341d5`) | Nachher (`6af965a2`) |
| --- | --- | --- |
| Ableitungsmethode | `strings.ToLower(c.RoleLabel)` + `strings.Contains(label, "kara")`\|`"typeset"` | `hasAnySegmentRelevantRole` gegen `permissions.SegmentCreditRoleCodes` (Rollen-Code-Allow-Liste) |
| Credit-Quelle | eigene Beteiligte der BETRACHTETEN Release-Version | Beteiligte der ORIGIN-Release-Version (`theme_segments.origin_release_version_id`) |
| Encoding als Segment-Credit | möglich, falls Label „kara"/„typeset" fälschlich matcht | NIE (explizit ausgeschlossen aus `SegmentCreditRoleCodes`) |
| Quality-Checker als Segment-Credit | möglich, falls Label fälschlich matcht | NIE (explizit ausgeschlossen) |
| Übersetzer/Timer/Karaoke-FX/Typesetting | teils über Label-Zufallstreffer erfasst | alle vier explizit in `SegmentCreditRoleCodes = {translator, timer, karaoke_fx, typesetter}` |
| Anzahl `loadPublicEffectiveContributors`-Aufrufe pro Seitenladung | N/A (kein Origin-Konzept) | GENAU 1, gebündelt über alle distinct Origin-Release-Versionen der Seite |
| Origin-Referenz korrigierbar? | N/A | ja, `PUT /api/v1/admin/anime/:id/segments/:segmentId/origin`, validiert gegen `theme_segment_assignments`-Mitgliedschaft |

Re-Verifikation 156-10: `TestReleaseDetailPublicSegmentOriginCredits` (7/7 Subtests PASS, inkl.
Test 5 „Encoder und Quality-Checker erscheinen NIE als Segment-Credit"), `TestSegmentCreditRoleFilter`
(5/5 Subtests PASS, DB-unabhängig).

## 5. Projektseiten-Timeline

| Verhalten | Vorher (`8be341d5`) | Nachher (`6af965a2`) |
| --- | --- | --- |
| Existenzprüfung | `ts.start_episode <= episode_number <= ts.end_episode` (Bereichsvergleich) | Join gegen `theme_segment_assignments` (Assignment-basiert) |
| Typklassifikation | SQL `CASE ... LIKE '%kara%'` etc. (`group_repository_cursor.go:296-307`, Vorher-Commit) | `CanonicalSegmentType(themeTypeName string) string`, EINE Go-Funktion, 1:1-Port derselben Präzedenz |
| First-Occurrence-Filterung | -- (keine Timeline-Deduplizierung in diesem Pfad) | projektweit (nicht seitenlokal), pagination-sicher, 1 gebündelte `ARRAY_AGG`-Abfrage |
| Segment ohne jede Zuweisung, aber mit passender Range | erscheint fälschlich (reiner Bereichsvergleich) | erscheint NIE (Assignment-basiert) |
| Frontend-Typwelt (`ThemeTimeline.tsx`) | eigene `TYPE_LABELS`/`TYPE_STYLE_KEYS`, inkl. Varianten-Keys wie `'OP KARA'` | gelöscht; rendert Backend-kanonischen `segment.type` direkt |

Re-Verifikation 156-10: `TestAttachReleaseTimelineSegments` (4/4 Subtests PASS), 23/23
`ThemeTimeline.test.tsx`-Tests PASS (inkl. `KARAAGE`-Regressionsfall).

## 6. Query-Budget und Index (Plan 156-09, hier zitiert und in 156-10 erneut ausgeführt)

| Metrik | Wert | Quelle |
| --- | --- | --- |
| `loadReleaseSegments`' gebündelter Origin+Credit-Query-Count, 1-Segment-Release | 3 | `TestLoadReleaseSegmentsQueryBudgetIsConstant`, `phase156SegmentOriginConstantQueryBudget = 3` |
| dieselbe Metrik, 3-Segment-Release mit 3 verschiedenen Origin-Release-Versionen | 3 (identisch) | dieselbe Testfunktion, `require.Equal(t, smallCount, largeCount, ...)` |
| `idx_theme_segments_origin_release_version` — naturgemäß gewählter Plan bei 3 Zeilen `theme_segments` | Seq Scan (korrekt bei dieser Größe) | 156-09-SUMMARY.md, `EXPLAIN (ANALYZE, BUFFERS)` gegen `team4s_v2` |
| dieselbe Abfrage mit `SET enable_seqscan = off` | Index Only Scan, `Heap Fetches: 2`, `Buffers: shared hit=5` | 156-09-SUMMARY.md, gleiche Quelle |

Re-Verifikation 156-10: `TestLoadReleaseSegmentsQueryBudgetIsConstant` erneut PASS mit demselben
Wert (3). Die EXPLAIN-Ausgaben selbst wurden in 156-10 NICHT neu erfasst (read-only, nicht
datenverändernd, kein Anlass zur Wiederholung bei unveränderter Zeilenzahl) — sie werden hier aus
156-09-SUMMARY.md zitiert, nicht neu behauptet.

## 7. Migration 0161: Rundlauf-Verifikation (156-10, neu ausgeführt)

| Schritt | Ergebnis |
| --- | --- |
| Status vor Rundlauf (`migrate status`) | 161 applied, 0 pending |
| `migrate down -steps 1` gegen `team4s_v2` | `origin_release_version_id`-Spalte entfernt, `schema_migrations`-Head auf 160 |
| `migrate up` gegen `team4s_v2` | Spalte + Index wiederhergestellt, Head wieder auf 161 |
| Backfill-Werte vor Rundlauf | `id=1 -> 27`, `id=2 -> 27`, `id=3 -> 29` |
| Backfill-Werte nach Rundlauf | `id=1 -> 27`, `id=2 -> 27`, `id=3 -> 29` (byte-identisch) |
| Backend-Health nach Rundlauf (`/health`) | `{"status":"ok"}`, HTTP 200 |

## 8. Vollständiger Test-/Build-Lauf (156-10, 2026-09-11)

| Lauf | Ergebnis |
| --- | --- |
| `go build ./... && go vet ./...` (backend) | exit 0, sauber |
| `go test ./internal/repository/... -count=1` (mit `TEAM4S_PHASE117_TEST_DSN`) | FAIL insgesamt, aber alle 49 Fehlschläge sind vorbestehend und außerhalb dieser Phase (siehe unten) — kein Phase-156-Test unter den Fehlschlägen |
| `go test ./internal/handlers/... -count=1` | PASS, exit 0 |
| `go test ./internal/permissions/... -count=1` | PASS, exit 0 |
| `docker compose up -d --build team4sv30-backend` + `/health` | Container neu gebaut, `{"status":"ok"}` |
| `npx tsc --noEmit` (frontend) | exit 0, sauber |
| `npx vitest run` (frontend, voller Lauf) | 298 Testdateien bestanden, 1 übersprungen (299 gesamt); 2.305 Tests bestanden, 3 Todo (2.308 gesamt); 0 Fehlschläge |
| `npx vitest run ThemeTimeline` | 23/23 Tests bestanden |
| `npx eslint .` (frontend) | exit 0 (npx-Exit-Code), 13 Errors / 331 Warnings — alle in Dateien außerhalb dieser Phase (identisch zur in Phase 155 dokumentierten vorbestehenden Baseline) |
| `docker compose build team4sv30-frontend` | erfolgreich |
| `docker compose build team4sv30-backend` | erfolgreich |
| `git status --short` nach allen Läufen | leer |

### Die 49 vorbestehenden, nicht durch Phase 156 verursachten Backend-Testfehler (Kategorien)

| Ursache | Betroffene Tests (Anzahl) | Grund |
| --- | --- | --- |
| `TEAM4S_PHASE128_TEST_DSN` nicht gesetzt | ca. 30 Tests (`TestMemberPointTotals*`, `TestLoadContributionBadges*`, `TestGetOwnDashboardPostgres*`, `TestLoadPublicBadgesPostgres*`, `TestLoadRoleVolume*Postgres*`, `TestPhase128*`) | Skip-Guard verlangt eine dedizierte, in dieser Session nicht gesetzte DSN-Umgebungsvariable — identisch zur bereits in 155-01/155-02/156-05/156-06/156-07/156-09-SUMMARY.md dokumentierten Baseline |
| Live-Backend/Keycloak unter `192.168.235.196:18093` nicht erreichbar bzw. Zugangsdaten ungültig | 9 Tests (`TestPhase134Matrix*`) | `dial tcp ...:18093: connect: connection refused` bzw. `invalid_grant` für `sheppert@team4s.local` — Netzwerk-/Credential-Abhängigkeit, kein Codepfad dieser Phase |
| Vorbestehende, mit Phase 156 unverbundene Fehlschläge | 5 Tests (`TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`) | Dateien zuletzt in Phase 143 verändert, außerhalb jeder Phase-156-`files_modified`-Liste |

Keiner dieser 49 Fehlschläge berührt eine der von 156-01 bis 156-09 tatsächlich veränderten
Dateien (siehe jeweilige SUMMARY.md `key-files`).
