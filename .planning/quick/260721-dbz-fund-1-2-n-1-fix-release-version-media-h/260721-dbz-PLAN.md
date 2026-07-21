---
phase: quick-260721-dbz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/release_version_media_batch_repository.go
  - backend/internal/handlers/admin_content_release_version_media.go
  - backend/internal/handlers/admin_content_release_version_media_reorder.go
  - backend/internal/handlers/admin_content_release_version_media_test.go
autonomous: true
requirements: [QUICK-260721-dbz]
must_haves:
  truths:
    - "QUICK-260721-dbz: Der Reorder-Endpoint ruft GetReleaseVersionMediaRelation NICHT mehr pro Bild in der relationIDs-Schleife auf."
    - "QUICK-260721-dbz: Die Fansub-Gruppen-Permission wird im Reorder-Pfad pro eindeutiger Gruppe nur EINMAL aufgeloest (memoisiert), nicht pro Gruppe pro Bild."
    - "QUICK-260721-dbz: Ownership-Gate und Permission-Gate liefern bit-identische Ablehnungen (gleiche HTTP-Codes, gleiche deutsche Fehlermeldungen) wie vor dem Refactor."
    - "QUICK-260721-dbz: Die Handler-Monolithdatei admin_content_release_version_media.go ist nach dem Split kleiner als vorher (1254 Zeilen)."
  artifacts:
    - path: "backend/internal/repository/release_version_media_batch_repository.go"
      provides: "Gebuendelte Batch-Loader (Meta + Contributor-Gruppen) ueber mehrere relationIDs"
    - path: "backend/internal/handlers/admin_content_release_version_media_reorder.go"
      provides: "Ausgelagerter ReorderReleaseVersionMedia-Handler mit N+1-freier Berechtigungspruefung"
  key_links:
    - from: "backend/internal/handlers/admin_content_release_version_media_reorder.go"
      to: "backend/internal/repository/release_version_media_batch_repository.go"
      via: "ListReleaseVersionMediaRelationMetas + ListReleaseVersionMediaContributorGroupIDsByRelation"
      pattern: "ListReleaseVersionMediaRelationMetas|ListReleaseVersionMediaContributorGroupIDsByRelation"
---

<objective>
Zwei verschachtelte N+1-Query-Probleme im Release-Version-Media-Reorder-Pfad
beheben, ohne das beobachtbare Verhalten zu aendern (Ownership-Gate UND
Permission-Gate bit-identisch: gleiche Ablehnungen, HTTP-Statuscodes,
Fehlermeldungen). Reine interne Umstrukturierung der Datenbankabfragen.

Purpose: Die Query-Struktur des Reorder-Endpoints buendeln, statt pro Bild
und pro Fansub-Gruppe einzeln zu laden. Gleichzeitig die bereits stark
ueberlange Monolith-Handlerdatei (1254 Zeilen, Limit 450) durch Auslagern des
Reorder-Handlers verkleinern.

Output:
- Neue schlanke Repo-Datei mit gebuendelten Batch-Loadern.
- Neue schlanke Handler-Datei mit dem ausgelagerten Reorder-Handler.
- Angepasste Source-String-Guard-Tests (Pfad/Substring), Verhaltensgarantie
  unveraendert.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

# Zieldateien / Referenzmuster
@backend/internal/handlers/admin_content_release_version_media.go
@backend/internal/repository/release_version_media_repository.go
@backend/internal/permissions/permissions.go

<interfaces>
<!-- Bestehende Signaturen, gegen die gebaut wird. Kein Codebase-Scavenging noetig. -->

Aus backend/internal/repository/release_version_media_repository.go:
```go
type ReleaseVersionMediaRelationMeta struct {
    RelationID       int64
    ReleaseVersionID int64
    Category         string
    UploadedByUserID *int64
}

// Einzel-Loader (Fund 1 Quelle) — liefert genau ReleaseVersionMediaRelationMeta:
func (r *MediaRepository) GetReleaseVersionMediaRelation(ctx context.Context, relationID int64) (*ReleaseVersionMediaRelationMeta, error)

// Einzel-Loader (Fund 2 Quelle) — SELECT DISTINCT ac.fansub_group_id ... WHERE rvm.id = $1:
func (r *MediaRepository) ListReleaseVersionMediaContributorGroupIDs(ctx context.Context, relationID int64) ([]int64, error)

// Bereits gebuendelte Ownership-Validierung (laeuft direkt vor der Schleife):
func (r *MediaRepository) ValidateReleaseVersionMediaOwnership(ctx context.Context, releaseVersionID int64, relationIDs []int64) error
// -> gibt repository.ErrNotFound bzw. repository.ErrOwnershipMismatch zurueck
```

Aus backend/internal/permissions/permissions.go:
```go
// Jeder Aufruf trifft die DB via resolver.ResolveFansubGroup(ctx, fansubGroupID):
func (s *Service) CanForFansubGroup(ctx context.Context, actor Actor, action Action, fansubGroupID int64) (Result, error)
```

Aktueller Reorder-Loop (admin_content_release_version_media.go ~1131-1155),
der zu ersetzen ist — pro Bild GetReleaseVersionMediaRelation + verschachtelter
canMutateReleaseVersionMediaRelation-Aufruf (der intern pro Gruppe CanForFansubGroup ruft).

Aktueller Entscheidungskern in canMutateReleaseVersionMediaRelation (~600-631):
1. platform_admin / ReasonPlatformAdmin -> erlaubt.
2. sonst: irgendeine Contributor-Gruppe mit CanForFansubGroup(action).Allowed -> erlaubt.
3. sonst: uploaded-by-current-user + action-spezifische Rollenregel -> erlaubt.
4. sonst: verweigert.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gebuendelte Batch-Loader im Repository ergaenzen</name>
  <files>backend/internal/repository/release_version_media_batch_repository.go</files>
  <action>
Neue schlanke Datei im package `repository` anlegen (NICHT die bereits 649
Zeilen lange release_version_media_repository.go weiter aufblaehen — CLAUDE.md
450-Zeilen-Limit). Zwei Methoden auf `*MediaRepository`:

1. `ListReleaseVersionMediaRelationMetas(ctx context.Context, relationIDs []int64) ([]ReleaseVersionMediaRelationMeta, error)`
   — Batch-Variante von GetReleaseVersionMediaRelation. Ein einziges Query mit
   `WHERE id = ANY($1) AND deleted_at IS NULL`, selektiert dieselben vier Spalten
   (id, release_version_id, category, uploaded_by_user_id) in derselben
   Reihenfolge wie das Einzel-Query. Bei leerem Input direkt leeren Slice
   zurueckgeben (kein Query). Kein ErrNotFound werfen — Vollstaendigkeit prueft
   der Aufrufer.

2. `ListReleaseVersionMediaContributorGroupIDsByRelation(ctx context.Context, relationIDs []int64) (map[int64][]int64, error)`
   — Batch-Variante von ListReleaseVersionMediaContributorGroupIDs. Exakt
   dieselbe JOIN-/WHERE-Logik (app_users -> member_claims verified -> ... ->
   anime_contributions -> release_version_groups) uebernehmen, aber `rvm.id = $1`
   durch `rvm.id = ANY($1)` ersetzen und zusaetzlich `rvm.id` mitselektieren.
   Ergebnis in `map[int64][]int64` (relationID -> aufsteigend sortierte
   groupIDs) einsortieren. `ORDER BY rvm.id, ac.fansub_group_id`. Bei leerem
   Input leere Map zurueckgeben.

WICHTIG: Die SQL-Semantik pro Relation muss identisch zur Einzelvariante
bleiben (gleiche DISTINCT-/OR-Bedingung fuer ac.release_version_id vs anime_id).
Keine Performance-Behauptung in Kommentaren; Kommentare beschreiben nur das
WAS/WARUM der Buendelung.
  </action>
  <verify>
    <automated>cd backend && go build ./... && go test ./internal/repository/... -run ReleaseVersionMedia -count=1</automated>
  </verify>
  <done>
Neue Datei kompiliert, beide Batch-Methoden existieren auf *MediaRepository,
release_version_media_repository.go unveraendert, repository-Tests gruen.
  </done>
</task>

<task type="auto">
  <name>Task 2: Reorder-Handler auslagern und N+1 im Reorder-/Permission-Pfad eliminieren</name>
  <files>backend/internal/handlers/admin_content_release_version_media_reorder.go, backend/internal/handlers/admin_content_release_version_media.go, backend/internal/handlers/admin_content_release_version_media_test.go</files>
  <action>
Schritt A — Auslagern (verkleinert die Monolithdatei):
`ReorderReleaseVersionMedia` (aktuell admin_content_release_version_media.go
~1080-1186) komplett in die neue Datei
admin_content_release_version_media_reorder.go (package handlers)
verschieben. Nach dem Verschieben enthaelt admin_content_release_version_media.go
diese Funktion NICHT mehr und ist entsprechend kuerzer.

Schritt B — Fund 1 eliminieren (per-Bild GetReleaseVersionMediaRelation weg):
Die Schleife `for _, relationID := range relationIDs` so umbauen, dass VOR der
Schleife EINMAL `h.mediaRepo.ListReleaseVersionMediaRelationMetas(ctx, relationIDs)`
aufgerufen wird und die Metas in eine `map[int64]*int64` (relationID ->
UploadedByUserID) gelegt werden. Der per-Bild-Aufruf von
GetReleaseVersionMediaRelation entfaellt. Die bisherige per-Bild
ErrNotFound-Verzweigung ist nach dem direkt davor laufenden
ValidateReleaseVersionMediaOwnership (das ErrNotFound/ErrOwnershipMismatch
bereits gebuendelt als 404 abfaengt) redundant. Defensive Absicherung fuer
Verhaltensidentitaet: Falls die Anzahl gelieferter Metas != len(relationIDs)
ist, dieselbe 404-Antwort mit exakt gleichem Text senden wie bisher
("eine oder mehrere relationen gehoeren nicht zu dieser release version").

Schritt C — Fund 2 eliminieren (Gruppen-Permission einmal statt pro Bild/Gruppe):
Vor der Schleife EINMAL `h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsByRelation(ctx, relationIDs)`
laden. Alle eindeutigen groupIDs ueber alle Relationen sammeln und pro
eindeutiger Gruppe genau EINMAL `h.permissionSvc.CanForFansubGroup(ctx, actor,
permissions.ActionReleaseVersionMediaUpdate, groupID)` auswerten, Ergebnis in
`map[int64]bool` memoisieren. Bei einem Fehler aus CanForFansubGroup dieselbe
Antwort wie bisher senden (writeInternalErrorResponse mit "interner
serverfehler" / "Relationen konnten nicht validiert werden.").

Schritt D — Entscheidungslogik einmalig teilen (Verhaltensgarantie):
Reinen (DB-freien) Helfer einfuehren, z.B.
`evaluateReleaseVersionMediaRelationMutation(actor permissions.Actor,
baseResult permissions.Result, uploadedByUserID *int64, currentLegacyUserID
int64, action permissions.Action, anyGroupAllowed bool) bool`, der EXAKT die
vier Verzweigungen aus dem aktuellen canMutateReleaseVersionMediaRelation
enthaelt (platform_admin/ReasonPlatformAdmin -> anyGroupAllowed ->
uploaded-by-Fallback mit den identischen RoleAllowsAction-Bedingungen fuer
Update/Delete). Im Reorder-Pfad pro Relation: anyGroupAllowed = OR ueber die
memoisierten Gruppen-Ergebnisse dieser Relation; dann diesen Helfer aufrufen.
Bei Ablehnung exakt denselben Zweig ausfuehren wie bisher
(releaseVersionMediaOwnerMismatchResult + auditPermissionDenied
"release_version_media.reorder.denied" + writePermissionDenied).

WICHTIG zu Fund 2 im annotate-Pfad: `canMutateReleaseVersionMediaRelation` und
`annotateReleaseVersionMediaItemPermissions` BLEIBEN in
admin_content_release_version_media.go und werden inhaltlich NICHT geaendert
(kein Umbau ihrer Query-Struktur in diesem Task) — sie duerfen den neuen reinen
Helfer intern aufrufen, muessen aber die bestehenden Aufruf-Zeilen
`ListReleaseVersionMediaContributorGroupIDs` und
`CanForFansubGroup(c.Request.Context(), actor, action, groupID)` beibehalten
(Source-String-Guard-Test, s.u.). Ziel dieses Tasks ist die im Task-Detail
beschriebene Reorder x Permission-Verschachtelung.

Schritt E — Guard-Tests anpassen (admin_content_release_version_media_test.go):
- `TestReleaseVersionMedia_ReorderRequiresVersionOwnership`: liest aktuell
  admin_content_release_version_media.go auf "ValidateReleaseVersionMediaOwnership".
  Da der Reorder-Handler jetzt in admin_content_release_version_media_reorder.go
  liegt, den os.ReadFile-Pfad auf die neue Datei umstellen. Verhaltenszusage
  (Ownership-Check laeuft vor sort_order-Update) bleibt unveraendert.
- `TestReleaseVersionMedia_HandlerUsesContributorGroupMutationGuard`: unveraendert
  lassen, sofern canMutateReleaseVersionMediaRelation + annotate mit den o.g.
  Substrings in der Hauptdatei verbleiben. Falls ein Substring durch den
  gemeinsamen Helfer verschoben wird, den Test-Pfad/Substring entsprechend
  nachziehen — ohne die geprueften Behavior-Zusagen (CanUpdate/CanDelete
  Annotation, Contributor-Group-Guard) aufzuweichen.

Keine Performance-Behauptungen in Commit-Message oder Kommentaren. Deutsche
Fehlermeldungen wortgleich uebernehmen (inkl. bestehender ASCII-Schreibweise
in unveraenderten Bestandsstrings — Strings NICHT umformulieren).
  </action>
  <verify>
    <automated>cd backend && go build ./... && go test ./internal/handlers/... -run ReleaseVersionMedia -count=1</automated>
  </verify>
  <done>
ReorderReleaseVersionMedia liegt in der neuen Datei; kein per-Bild
GetReleaseVersionMediaRelation und kein pro-Gruppe-pro-Bild CanForFansubGroup
mehr im Reorder-Pfad; Ablehnungen/Statuscodes/Meldungen identisch;
admin_content_release_version_media.go ist kuerzer als 1254 Zeilen; alle
handlers-Tests gruen.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| admin client -> Reorder-Endpoint | Authentifizierter Admin sendet relationIDs; Autorisierung entscheidet ueber Mutation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-dbz-01 | Elevation of Privilege | Reorder-Permission-Batching (Task 2) | mitigate | Gemeinsamer reiner Entscheidungshelfer garantiert bit-identische Autorisierung; anyGroupAllowed ist OR ueber dieselben CanForFansubGroup-Ergebnisse; memoisiertes Ergebnis ist deterministisch pro (actor, action, groupID). |
| T-dbz-02 | Tampering | Batch-Ownership-Kontrakt (Task 1/2) | mitigate | ValidateReleaseVersionMediaOwnership bleibt der maszgebliche Ownership-Gate; Meta-Count-Defensivpruefung liefert dieselbe 404 wie zuvor bei fehlenden/fremden Relationen. |
| T-dbz-SC | Tampering | Dependency-Installs | accept | Keine neuen npm/pip/cargo/go-Pakete; reines internes Refactoring gegen bestehende Repo-/Permission-APIs. |
</threat_model>

<verification>
- `cd backend && go build ./...` fehlerfrei.
- `cd backend && go test ./internal/repository/... ./internal/handlers/... -count=1` gruen.
- Grep-Gate Fund 1: im Reorder-Handler kein per-Bild GetReleaseVersionMediaRelation
  mehr — `grep -n "GetReleaseVersionMediaRelation" backend/internal/handlers/admin_content_release_version_media_reorder.go` liefert keine Treffer.
- Grep-Gate Fund 2: neue Batch-Loader werden vom Reorder-Handler genutzt —
  `grep -n "ListReleaseVersionMediaRelationMetas\|ListReleaseVersionMediaContributorGroupIDsByRelation" backend/internal/handlers/admin_content_release_version_media_reorder.go`.
- Groessen-Gate: `wc -l backend/internal/handlers/admin_content_release_version_media.go`
  ergibt einen Wert < 1254 (kleiner als vor dem Split).
</verification>

<success_criteria>
- Reorder-Endpoint fuehrt pro Request eine konstante Anzahl gebuendelter
  Queries fuer Meta- und Contributor-Gruppen-Aufloesung aus (keine
  Skalierung mit Bilderanzahl fuer diese beiden Loads).
- Gruppen-Permission wird pro eindeutiger Gruppe einmal aufgeloest.
- Ownership- und Permission-Gate bleiben verhaltensidentisch (gleiche
  Ablehnungen, HTTP-Codes, Fehlermeldungen).
- Handler-Monolithdatei ist nach dem Split kleiner.
- Alle bestehenden go-Tests gruen; angepasste Guard-Tests pruefen weiterhin
  dieselben Behavior-Zusagen.
</success_criteria>

<output>
Create `.planning/quick/260721-dbz-fund-1-2-n-1-fix-release-version-media-h/260721-dbz-SUMMARY.md` when done
</output>
