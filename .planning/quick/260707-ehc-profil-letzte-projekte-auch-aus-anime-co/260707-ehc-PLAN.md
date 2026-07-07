---
phase: 260707-ehc-profil-letzte-projekte-auch-aus-anime-co
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/member_profile_repository.go
  - backend/internal/repository/member_profile_repository_test.go
autonomous: true
requirements: [D-01]
must_haves:
  truths:
    - "Ein Member, der NUR in anime_contributions (Besetzung) steht und KEINE release_member_roles hat, erscheint in recent_contributions (D-01)"
    - "Auf dem oeffentlichen Profil (publicOnly=true) erscheinen nur anime_contributions mit is_public_on_member_profile=true; auf dem eigenen Profil (publicOnly=false) erscheinen alle status='confirmed' Contributions unabhaengig vom Public-Flag"
    - "Bestehende release_member_roles-basierte Projekte bleiben unveraendert sichtbar (kein Regressionsverlust)"
  artifacts:
    - path: "backend/internal/repository/member_profile_repository.go"
      provides: "loadRecentContributions(ctx, memberID, publicOnly) mit UNION ALL aus release_credit_rows und contribution_credit_rows"
    - path: "backend/internal/repository/member_profile_repository_test.go"
      provides: "Source-Invariant-Assertions fuer die neue anime_contributions-CTE und publicOnly-Parametrisierung"
  key_links:
    - from: "backend/internal/repository/member_profile_repository.go (GetOwnProfile, ~Z.83)"
      to: "loadRecentContributions(ctx, base.MemberID, false)"
      via: "direkter Funktionsaufruf"
      pattern: "loadRecentContributions\\(ctx, base\\.MemberID, false\\)"
    - from: "backend/internal/repository/member_profile_repository.go (GetPublicMemberProfile, ~Z.507)"
      to: "loadRecentContributions(ctx, row.memberID, true)"
      via: "direkter Funktionsaufruf"
      pattern: "loadRecentContributions\\(ctx, row\\.memberID, true\\)"
---

<objective>
Erweitere `loadRecentContributions` in `backend/internal/repository/member_profile_repository.go` so, dass die Profil-Sektion "Letzte Projekte" (recent_contributions) sowohl aus `release_member_roles` (bestehend) ALS AUCH aus `anime_contributions` (Besetzung, neu) gespeist wird — zusammengefuehrt per UNION ALL und dedupliziert wie bisher.

Purpose: Ein Member, der nur in der Besetzung eines Animes steht (kein Release-Rollencredit), soll dieses Projekt trotzdem in "Letzte Projekte" sehen. Aktuell bleibt die Liste fuer solche Member leer (belegt an sheppert, member_id 2).

Output: Aktualisierte Query mit zwei Quell-CTEs (release_credit_rows unveraendert, neue contribution_credit_rows aus anime_contributions), UNION ALL vor dem bestehenden deduped/project_rows-Aggregat. Neuer `publicOnly bool` Parameter steuert Sichtbarkeit nur im anime_contributions-Zweig. Beide Aufrufstellen (eigenes Profil, oeffentliches Profil) entsprechend angepasst. Source-Invariant-Tests ergaenzt.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@backend/internal/models/member_profile.go

<interfaces>
<!-- Aktuelle Funktion (member_profile_repository.go, ~Z.1093-1170) -->
<!-- Signatur aendert sich von loadRecentContributions(ctx, memberID int64) zu
     loadRecentContributions(ctx, memberID int64, publicOnly bool) -->

Aktuelle release_credit_rows CTE (bleibt UNVERAENDERT):
```sql
release_credit_rows AS (
    SELECT
        rmr.release_id,
        rmr.role_id,
        fg.id     AS fansub_group_id,
        rv.id     AS release_version_id,
        e.id      AS episode_id,
        rmr.created_at,
        a.title   AS anime_title,
        a.id      AS anime_id,
        fg.name::text   AS fansub_group_name,
        cr.name::text   AS role_name,
        cr.label::text  AS role_label
    FROM release_member_roles rmr
    JOIN contributor_roles cr ON cr.id = rmr.role_id
    JOIN fansub_releases fr ON fr.id = rmr.release_id
    JOIN episodes e ON e.id = fr.episode_id
    JOIN anime a ON a.id = e.anime_id
    JOIN release_versions rv ON rv.release_id = rmr.release_id
    JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
    JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
    WHERE rmr.member_id = $1
),
```

Nachfolgende deduped/project_rows-CTEs (bleiben strukturell UNVERAENDERT, lesen aber
kuenftig aus der UNION ALL-Row-Menge statt direkt aus release_credit_rows):
- `deduped`: `SELECT DISTINCT ON (anime_id, release_id, role_id, fansub_group_id) ... FROM release_credit_rows ORDER BY anime_id, release_id, role_id, fansub_group_id, created_at DESC`
- `project_rows`: `GROUP BY anime_id, anime_title, fansub_group_id` mit `ARRAY_AGG(DISTINCT ...)` fuer role_name/role_label/fansub_group_name und `COUNT(DISTINCT release_version_id)`, `COUNT(DISTINCT episode_id)`.

anime_contributions Spalten (verifiziert): member_id, anime_id, fansub_group_id,
release_version_id (nullable), status, is_public_on_member_profile, created_at.

Rollen-Join fuer Besetzung: anime_contribution_roles(anime_contribution_id, role_code)
-> contributor_roles cr ON cr.name = acr.role_code (role_code entspricht cr.name,
z.B. 'typesetter' -> label 'Typesetting / FX').

Aufrufstellen (member_profile_repository.go):
- Z.83 (GetOwnProfile, eigenes Profil): `base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID)`
- Z.507 (GetPublicMemberProfile, oeffentliches Profil): `profile.RecentContributions, loadErr = r.loadRecentContributions(ctx, row.memberID)`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: anime_contributions in loadRecentContributions einbinden (UNION ALL + publicOnly-Parameter)</name>
  <files>backend/internal/repository/member_profile_repository.go, backend/internal/repository/member_profile_repository_test.go</files>
  <behavior>
    Die Datei verwendet Source-Invariant-Tests (String-Contains-Assertions auf dem
    Go-Quelltext), keine DB-Integrationstests. Vor der Implementierung neue
    Assertions in TestMemberProfileRepositorySourceInvariants ergaenzen, die
    initial fehlschlagen (RED), dann Implementierung liefern (GREEN):
    - Assertion: content enthaelt `func (r *MemberProfileRepository) loadRecentContributions(ctx context.Context, memberID int64, publicOnly bool)`
    - Assertion: content enthaelt `contribution_credit_rows AS (` (neue CTE existiert)
    - Assertion: content enthaelt `FROM anime_contributions ac`
    - Assertion: content enthaelt `JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id` (INNER JOIN, keine rollenlosen Besetzungen als Projekt)
    - Assertion: content enthaelt `JOIN contributor_roles cr ON cr.name = acr.role_code`
    - Assertion: content enthaelt `ac.status = 'confirmed'`
    - Assertion: content enthaelt `(NOT $2 OR ac.is_public_on_member_profile = true)` (publicOnly-Steuerung nur im Besetzungs-Zweig)
    - Assertion: content enthaelt `UNION ALL` (Zusammenfuehrung der zwei Quellen)
    - Assertion: content enthaelt `r.loadRecentContributions(ctx, base.MemberID, false)` (eigenes Profil: alle confirmed, kein Public-Filter)
    - Assertion: content enthaelt `r.loadRecentContributions(ctx, row.memberID, true)` (oeffentliches Profil: nur is_public_on_member_profile=true)
  </behavior>
  <action>
    In member_profile_repository.go (~Z.1093) die Funktionssignatur von
    `loadRecentContributions(ctx context.Context, memberID int64)` auf
    `loadRecentContributions(ctx context.Context, memberID int64, publicOnly bool)`
    erweitern.

    In der SQL-Query eine zweite Quell-CTE `contribution_credit_rows` VOR der
    bestehenden `deduped`-CTE ergaenzen, mit denselben Spalten/Reihenfolge wie
    `release_credit_rows` (release_id, role_id, fansub_group_id, release_version_id,
    episode_id, created_at, anime_title, anime_id, fansub_group_name, role_name,
    role_label):
    - release_id: `NULL::bigint`
    - role_id: `cr.id`
    - fansub_group_id: `fg.id`
    - release_version_id: `ac.release_version_id` (bleibt NULL wenn nicht gesetzt —
      COUNT(DISTINCT ...) im Aggregat ignoriert NULL, kein Doppelzaehlen)
    - episode_id: `NULL::bigint`
    - created_at: `ac.created_at`
    - anime_title: `a.title`, anime_id: `a.id`
    - fansub_group_name: `fg.name::text`
    - role_name: `cr.name::text`, role_label: `cr.label::text`

    FROM anime_contributions ac
    JOIN anime a ON a.id = ac.anime_id
    JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
    JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
    JOIN contributor_roles cr ON cr.name = acr.role_code
    WHERE ac.member_id = $1 AND ac.status = 'confirmed'
      AND (NOT $2 OR ac.is_public_on_member_profile = true)

    Hinweis: INNER JOIN auf acr/cr (nicht LEFT JOIN) — nur Besetzungen MIT
    mindestens einer Rolle zaehlen als Projekt. Das ist konsistent mit dem
    release-Zweig (der immer eine Rolle hat) und verhindert NULL role_label in
    ARRAY_AGG(DISTINCT role_label ...), was die bestehende Aggregations-/Scan-Logik
    brechen wuerde. Offene Frage (nicht in diesem Plan geloest): Sollen Besetzungen
    OHNE jede Rolle ebenfalls als Projekt zaehlen? Aktuell: nein.

    Anschliessend `release_credit_rows` und `contribution_credit_rows` per
    `UNION ALL` zu einer gemeinsamen Zwischen-CTE zusammenfuehren (z.B.
    `all_credit_rows AS (SELECT * FROM release_credit_rows UNION ALL SELECT * FROM contribution_credit_rows)`),
    und `deduped` von `FROM release_credit_rows` auf `FROM all_credit_rows` umstellen.
    Die nachfolgenden CTEs (`deduped`, `project_rows`) und die finale SELECT/ORDER/LIMIT
    bleiben strukturell unveraendert.

    Query-Parameter: `$1` = memberID (wie bisher, jetzt in beiden Zweigen genutzt),
    `$2` = publicOnly (neu, nur im anime_contributions-Zweig referenziert). Den
    `r.db.Query(ctx, ..., memberID)`-Aufruf am Ende der Funktion auf
    `r.db.Query(ctx, ..., memberID, publicOnly)` erweitern.

    Beide Aufrufstellen anpassen:
    - Z.83 (GetOwnProfile): `r.loadRecentContributions(ctx, base.MemberID, false)`
      (eigenes Profil zeigt alle status='confirmed' Besetzungen, unabhaengig vom
      Public-Flag — der Owner darf seine eigenen nicht-oeffentlichen Projekte sehen)
    - Z.507 (GetPublicMemberProfile): `r.loadRecentContributions(ctx, row.memberID, true)`
      (oeffentliches Profil zeigt nur is_public_on_member_profile=true Besetzungen;
      release_member_roles-Zweig bleibt wie bisher ungefiltert sichtbar, da dort kein
      Visibility-Flag existiert)

    Nach der Aenderung `go build ./...` im backend/-Verzeichnis ausfuehren, um
    Kompilierfehler (z.B. falsche Parameteranzahl an den Aufrufstellen) sofort zu
    erfassen. Datei-Zeilenzahl pruefen: member_profile_repository.go ist bereits
    deutlich ueber 450 Zeilen (bestehender Zustand, siehe STATE.md Phase 74-01 und
    82-Notizen zu Auslagerungen) — diese Aenderung fuegt nur eine zusaetzliche CTE
    in eine bestehende Funktion ein und vergroessert die Datei nur moderat; kein
    Datei-Split in diesem Plan (aus Scope-Grund: Datei war schon vor dieser Aenderung
    ueber dem Limit, das ist ein bestehender, nicht neu eingefuehrter Zustand).
  </action>
  <verify>
    <automated>cd backend && go build ./... && go test ./internal/repository/... -run TestMemberProfileRepositorySourceInvariants -v</automated>
  </verify>
  <done>
    `go build ./...` erfolgreich. `TestMemberProfileRepositorySourceInvariants` gruen
    mit allen neuen Assertions. loadRecentContributions hat Signatur
    `(ctx, memberID int64, publicOnly bool)`. Query enthaelt UNION ALL aus
    release_credit_rows und contribution_credit_rows. Beide Aufrufstellen
    (GetOwnProfile mit `false`, GetPublicMemberProfile mit `true`) angepasst.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| DB query -> API response | memberID/publicOnly sind serverseitig aus Auth-Kontext (base.MemberID) bzw. Routen-Lookup (row.memberID) abgeleitet, kein direkter User-Input in die Query |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260707-ehc-01 | Information Disclosure | loadRecentContributions (oeffentliches Profil, publicOnly=true) | mitigate | `(NOT $2 OR ac.is_public_on_member_profile = true)` erzwingt, dass nicht-oeffentliche Besetzungen auf oeffentlichen Profilen nie erscheinen; per Source-Invariant-Test abgesichert |
| T-260707-ehc-02 | Tampering | SQL-Query-Erweiterung | accept | Reine Parametrisierung ueber pgx-Placeholders ($1/$2), keine String-Konkatenation von User-Input |
</threat_model>

<verification>
1. `cd backend && go build ./...` — kompiliert ohne Fehler.
2. `cd backend && go test ./internal/repository/... -run TestMemberProfileRepositorySourceInvariants -v` — alle Assertions gruen.
3. Nach Rebuild/Deploy durch Orchestrator: Live-Check gegen sheppert (member_id 2) —
   `recent_contributions` enthaelt jetzt das Projekt aus der anime_contributions-Zeile
   (anime 1, gruppe 1, status confirmed, is_public_on_member_profile=true), sowohl auf
   eigenem Profil als auch oeffentlichem Profil (da is_public_on_member_profile=true).
</verification>

<success_criteria>
- loadRecentContributions liefert Projekte aus BEIDEN Quellen (release_member_roles
  und anime_contributions), dedupliziert nach anime_id + fansub_group_id.
- publicOnly=true filtert anime_contributions auf is_public_on_member_profile=true;
  publicOnly=false (eigenes Profil) zeigt alle status='confirmed' Besetzungen.
- release_member_roles-Zweig unveraendert (keine Visibility-Filterung dort).
- Bestehende Source-Invariant-Tests bleiben gruen, neue Assertions decken die
  Erweiterung ab.
- `go build ./...` erfolgreich.
</success_criteria>

<output>
Create `.planning/quick/260707-ehc-profil-letzte-projekte-auch-aus-anime-co/260707-ehc-SUMMARY.md` when done
</output>
