---
phase: quick-260707-jya
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository_test.go
  - frontend/src/types/contributions.ts
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/contributions/contributions.module.css
  - frontend/src/app/me/contributions/page.tsx
  - frontend/src/components/contributions/MyContributionsSection.tsx
autonomous: true
requirements: [D-01, D-02, D-03]
must_haves:
  truths:
    - "Auf /me/contributions steht die Projektliste ('Meine Projekte') im Layout zuerst/primär, 'Offene Aktionen' und 'Eingereichte Hinweise' folgen nachrangig darunter (D-03)."
    - "Jede Projektkarte (AnimeGroupCard) zeigt einen Fortschrittsbalken worked/total Release-Versionen pro Gruppe, analog zum Profil-Balken (D-02)."
    - "GET /api/v1/me/anime-contributions liefert worked_release_version_count und total_release_version_count pro Contribution, korreliert auf anime_id + fansub_group_id der jeweiligen Zeile (D-01)."
  artifacts:
    - path: "backend/internal/repository/anime_contributions_proposal_repository.go"
      provides: "MemberContributionWithProposalRow.WorkedReleaseVersionCount/TotalReleaseVersionCount + korrelierte Subqueries in ListByMemberIDWithProposalFields"
      contains: "worked_release_version_count"
    - path: "frontend/src/types/contributions.ts"
      provides: "MeAnimeContribution.worked_release_version_count / total_release_version_count"
      contains: "worked_release_version_count"
    - path: "frontend/src/components/contributions/AnimeGroupCard.tsx"
      provides: "Fortschrittsbalken pro Projekt/Gruppe (progressPercent, aria-label)"
      contains: "Release-Versionen bearbeitet"
    - path: "frontend/src/app/me/contributions/page.tsx"
      provides: "Layout-Reihenfolge: MyContributionsSection vor ContributionInbox/MyProposalsSection"
  key_links:
    - from: "frontend/src/components/contributions/AnimeGroupCard.tsx"
      to: "frontend/src/types/contributions.ts"
      via: "MeAnimeContribution.worked_release_version_count / total_release_version_count"
      pattern: "worked_release_version_count"
    - from: "backend/internal/handlers/contributions_me_handler.go"
      to: "backend/internal/repository/anime_contributions_proposal_repository.go"
      via: "ListByMemberIDWithProposalFields"
      pattern: "ListByMemberIDWithProposalFields"
---

<objective>
Baut die Seite `/me/contributions` ("Meine Projekte") so um, dass die Projektliste (bestätigte Projektrollen, gruppiert nach Anime+Gruppe) primärer Fokus wird, inklusive Gamification-Fortschrittsbalken (worked/total Release-Versionen) pro Projekt-Karte. "Offene Aktionen" und "Eingereichte Hinweise" bleiben vollständig funktional, rücken aber im Layout nachrangig unter die Projektliste.

Purpose: Der Nutzer sieht zuerst seine tatsächliche Projektbeteiligung mit sichtbarem Fortschritt statt zuerst mit Inbox-/Proposal-Rauschen konfrontiert zu werden — konsistent mit dem bereits etablierten Gamification-Muster aus `/me/profile`.
Output: Erweiterte Backend-Query (worked/total pro Projekt), erweiterter Frontend-Typ, Fortschrittsbalken-UI in `AnimeGroupCard`, neu geordnetes Seiten-Layout.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Referenz-Muster aus member_profile_repository.go loadRecentContributions (Zeilen 1190-1218) —
     EXAKT dieselbe Subquery-Logik wird hier auf anime_id + fansub_group_id der jeweiligen
     Contribution-Zeile korreliert (statt project_rows.anime_id/fansub_group_id aus einer CTE). -->

Referenz-SQL (member_profile_repository.go, bereits produktiv, NICHT ändern):
```
(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
 JOIN fansub_releases fr ON fr.id = rv.release_id
 JOIN episodes ep ON ep.id = fr.episode_id
 WHERE ep.anime_id = project_rows.anime_id
   AND rvg.fansub_group_id = project_rows.fansub_group_id)::int AS total_release_version_count,
(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
 JOIN fansub_releases fr ON fr.id = rv.release_id
 JOIN episodes ep ON ep.id = fr.episode_id
 WHERE ep.anime_id = project_rows.anime_id
   AND rvg.fansub_group_id = project_rows.fansub_group_id
   AND (
     EXISTS (
       SELECT 1 FROM release_version_notes n
       WHERE n.release_version_id = rv.id
         AND n.member_id = $1
         AND n.deleted_at IS NULL
     )
     OR EXISTS (
       SELECT 1 FROM release_version_media m
       WHERE m.release_version_id = rv.id
         AND m.deleted_at IS NULL
         AND m.uploaded_by_user_id IN (
           SELECT mc.app_user_id FROM member_claims mc
           WHERE mc.member_id = $1 AND mc.claim_status = 'verified'
         )
     )
   ))::int AS worked_release_version_count
```

Model-Feldbenennung (member_profile.go, bereits produktiv — als Namenskonvention übernehmen):
```go
WorkedReleaseVersionCount int32 `json:"worked_release_version_count"`
TotalReleaseVersionCount  int32 `json:"total_release_version_count"`
```

Ziel-Query in anime_contributions_proposal_repository.go, ListByMemberIDWithProposalFields
(Zeilen 264-287) — dort korrelieren die Subqueries stattdessen auf `ac.anime_id` und
`ac.fansub_group_id` der jeweiligen Zeile (kein CTE project_rows vorhanden, GROUP BY ac.id
existiert bereits). memberID ist bereits Parameter `$1` der Funktion.

MemberContributionWithProposalRow (Zeilen 239-248) — Feld-Anhang analog EpisodeNumber/
EpisodeSortIndex-Muster (bereits vorhandene Phase-76-Erweiterung in derselben Struct):
```go
type MemberContributionWithProposalRow struct {
	AnimeContributionRow
	AnimeTitle       string  `json:"anime_title"`
	CanSelfPublish   bool    `json:"can_self_publish"`
	ReviewNote       *string `json:"review_note"`
	FansubGroupName  string  `json:"fansub_group_name"`
	IsOwnProposal    bool    `json:"is_own_proposal"`
	EpisodeNumber    *string `json:"episode_number"`
	EpisodeSortIndex *int    `json:"episode_sort_index"`
}
```

Bestehender Test-Stil (anime_contributions_proposal_repository_test.go) — source-invariant,
liest die .go-Datei als String und prüft auf enthaltene Fragmente statt Live-DB:
```go
func readProposalRepositorySource(t *testing.T, filename string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Join(".", filename))
	...
}
```

Frontend-Referenz für den Balken (RecentContributionsSection.tsx, bereits produktiv):
```typescript
function progressPercent(item: RecentContributionProject): number {
  return item.total_release_version_count > 0
    ? Math.round((item.worked_release_version_count / item.total_release_version_count) * 100)
    : 0
}
function progressLabel(item: RecentContributionProject): string {
  if (item.total_release_version_count <= 0) {
    return 'Noch keine Release-Versionen vorhanden'
  }
  return `${item.worked_release_version_count} von ${item.total_release_version_count} Release-Versionen bearbeitet`
}
```
CSS-Referenz (profile.module.css, bereits produktiv, wiederverwendbares Muster):
```css
.projectProgress { height: 7px; overflow: hidden; border-radius: 999px; background: rgba(100, 116, 139, 0.16); }
.projectProgress span { display: block; height: 100%; min-width: 12%; border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary, #2f5fe3), var(--color-success, #2f9b79)); }
```

MeAnimeContribution (frontend/src/types/contributions.ts, Zeilen 75-102) — hier werden die
zwei neuen optionalen Felder ergänzt.

AnimeGroupCard.tsx (frontend/src/components/contributions/AnimeGroupCard.tsx) — gruppiert
aktuell nach `animeId`, kann aber mehrere `projectGroups` (Gruppen) pro Anime enthalten
(siehe `getUniqueGroups`). Der Balken gehört pro Gruppe, nicht pro Anime — Werte je Gruppe
aus der ersten Contribution dieser Gruppe nehmen (nicht summieren, da worked/total pro
Anime+Gruppe bereits identisch für alle Rollen-Zeilen ist).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Backend — worked/total Release-Versionen pro Projekt in ListByMemberIDWithProposalFields</name>
  <files>backend/internal/repository/anime_contributions_proposal_repository.go, backend/internal/repository/anime_contributions_proposal_repository_test.go</files>
  <behavior>
    - Test 1 (RED zuerst): `TestMemberContributionWithProposalRow_HasWorkedTotalFields` prüft per Struct-Init, dass
      `MemberContributionWithProposalRow` die Felder `WorkedReleaseVersionCount int32` und
      `TotalReleaseVersionCount int32` besitzt (Setzen + Rücklesen, analog bestehendem
      `TestMemberContributionWithProposalRow_HasEpisodeFields`-Muster).
    - Test 2 (RED zuerst): `TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries` liest
      `anime_contributions_proposal_repository.go` per `readProposalRepositorySource` und prüft per
      `strings.Contains`, dass die SQL-Query in `ListByMemberIDWithProposalFields` folgende Fragmente
      enthält: `total_release_version_count`, `worked_release_version_count`,
      `ep.anime_id = ac.anime_id`, `rvg.fansub_group_id = ac.fansub_group_id`,
      `n.member_id = $1`, `mc.claim_status = 'verified'`.
    - Beide Tests müssen zuerst fehlschlagen (RED), bevor die Produktionscode-Änderung erfolgt.
  </behavior>
  <action>
    In `MemberContributionWithProposalRow` (Zeilen 239-248) zwei Felder ergänzen, exakt nach dem
    Namensmuster aus `models.MemberProfileRecentContribution` (member_profile.go Z.67-68):
    `WorkedReleaseVersionCount int32` mit JSON-Tag `worked_release_version_count` und
    `TotalReleaseVersionCount int32` mit JSON-Tag `total_release_version_count` (nach EpisodeSortIndex).
    Kommentar an der Struct ergänzen, dass die Werte pro Anime+Gruppe für alle Rollen-Zeilen dieses
    Projekts identisch sind (kein Aggregat, sondern Korrelation).

    In der SQL-Query von `ListByMemberIDWithProposalFields` (Zeilen 264-287) zwei korrelierte
    Subqueries in die SELECT-Liste ergänzen — EXAKT die Logik aus `loadRecentContributions`
    (member_profile_repository.go Z.1190-1218, siehe `<interfaces>`), aber korreliert auf
    `ac.anime_id` und `ac.fansub_group_id` statt auf eine `project_rows`-CTE (die hier nicht
    existiert). `memberID` ist bereits `$1` der Funktion. Beide Subqueries als
    `total_release_version_count` und `worked_release_version_count` benennen; wegen des
    bestehenden `GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name, ep.episode_number,
    ep.sort_index` sind unkorrelierte Subqueries in der SELECT-Liste zulässig (kein zusätzliches
    GROUP-BY-Feld nötig, da es sich um Sub-SELECTs handelt, keine Aggregatfunktionen auf
    Haupt-Query-Spalten).

    Im `rows.Scan(...)`-Aufruf (Zeilen 296-324) die zwei neuen Felder `&row.TotalReleaseVersionCount`
    und `&row.WorkedReleaseVersionCount` in derselben Reihenfolge wie in der SELECT-Liste ergänzen
    (nach `&row.EpisodeSortIndex`).

    Datei bleibt unter 450 Zeilen (aktuell 394 Zeilen + ca. 25 Zeilen SQL/Scan/Struct-Ergänzung).
  </action>
  <verify>
    <automated>cd backend && go test ./internal/repository/... -run "TestMemberContributionWithProposalRow_HasWorkedTotalFields|TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries" -v</automated>
  </verify>
  <done>Beide neuen Tests sind GREEN; `go build ./...` im backend-Verzeichnis läuft ohne Fehler; die Datei bleibt unter 450 Zeilen.</done>
</task>

<task type="auto">
  <name>Task 2: Frontend-Typ erweitern + Fortschrittsbalken pro Projekt in AnimeGroupCard</name>
  <files>frontend/src/types/contributions.ts, frontend/src/components/contributions/AnimeGroupCard.tsx, frontend/src/components/contributions/contributions.module.css</files>
  <action>
    In `MeAnimeContribution` (frontend/src/types/contributions.ts, nach `episode_sort_index`) zwei
    optionale Felder ergänzen: `worked_release_version_count?: number` und
    `total_release_version_count?: number` (optional, da die Werte serverseitig immer mitgeliefert
    werden, aber ältere gecachte/getestete Fixtures ohne diese Felder nicht brechen sollen).
    Kommentar ergänzen: "Phase quick-260707-jya: worked/total Release-Versionen pro Anime+Gruppe
    (D-01) — für alle role-Zeilen desselben Projekts identisch."

    In `frontend/src/components/contributions/contributions.module.css` eine Balken-Klasse ergänzen,
    analog `profile.module.css` `.projectProgress`/`.projectProgress span` (siehe `<interfaces>`),
    aber mit den in dieser Datei bereits verwendeten CSS-Variablen-Fallbacks
    (`var(--accent-primary, ...)` Konvention dieser Datei statt `var(--color-primary, ...)` aus
    profile.module.css) — neue Klassen `.projectProgressBar` und `.projectProgressBar span`
    hinzufügen, damit kein Cross-Modul-Import zwischen contributions.module.css und
    profile.module.css entsteht.

    In `AnimeGroupCard.tsx`:
    - `getUniqueGroups` liefert bereits `ProjectGroupEntry[]` pro Gruppe. Erweitere
      `ProjectGroupEntry` um `workedCount: number` und `totalCount: number`, befüllt aus der
      ERSTEN Contribution dieser Gruppe (`contribution.worked_release_version_count ?? 0`,
      `contribution.total_release_version_count ?? 0`) — NICHT summieren, da die Werte pro
      Anime+Gruppe bereits identisch sind (siehe Kontext-Kommentar).
    - Zwei kleine Hilfsfunktionen ergänzen (Modul-Ebene, analog `RecentContributionsSection.tsx`):
      `progressPercent(worked: number, total: number): number` (0 wenn total<=0, sonst
      `Math.round((worked/total)*100)`) und `progressLabel(worked: number, total: number): string`
      (`"Noch keine Release-Versionen vorhanden"` wenn total<=0, sonst
      Template-String `"{worked} von {total} Release-Versionen bearbeitet"`).
    - Balken rendern: wenn `projectGroups.length === 1`, den Balken direkt unter der Titel-/Chip-Zeile
      im Kartenkopf (`.roleCardTop`-Bereich, vor oder neben dem "Projekt öffnen"-Button-Block)
      anzeigen — ein Container-Element mit `className={styles.projectProgressBar}` und
      `aria-label={progressLabel(...)}`, darin ein inneres Span-Element mit
      `style={{ width: progressPercent(...) + '%' }}`.
      Wenn `projectGroups.length > 1`, den Balken JE Gruppe unter dem jeweiligen
      "Projekt öffnen: {group.fansubGroupName}"-Button in `.projectButtonRow` platzieren (z. B.
      Balken direkt unterhalb des Buttons dieser Gruppe, mit demselben aria-label-Muster).
    - Keine handgebauten Primitive einführen — Balken ist reines `div`/`span` mit CSS (kein
      `@/components/ui`-Primitiv für Fortschrittsbalken vorhanden; das entspricht dem bereits
      etablierten Muster aus `RecentContributionsSection.tsx`, das ebenfalls kein UI-Primitiv nutzt).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <done>MeAnimeContribution führt die zwei neuen optionalen Felder; AnimeGroupCard rendert für jede Projektgruppe einen Fortschrittsbalken mit korrektem aria-label ("X von Y Release-Versionen bearbeitet" bzw. "Noch keine Release-Versionen vorhanden"); tsc kompiliert fehlerfrei.</done>
</task>

<task type="auto">
  <name>Task 3: Layout-Reihenfolge auf /me/contributions umstellen (Projektliste zuerst)</name>
  <files>frontend/src/app/me/contributions/page.tsx, frontend/src/components/contributions/MyContributionsSection.tsx</files>
  <action>
    In `page.tsx` (Zeilen 164-190) die Reihenfolge im `contributionsStack`-Div ändern:
    `MyContributionsSection` zuerst rendern, danach `ContributionInbox`, danach
    `MyProposalsSection`, danach optional `ContributionSummary` (Filter bleibt wie gehabt nur bei
    `showFilter`). Die bestehende CSS-Grid-Logik in `contributions.module.css`
    (`.contributionsStack > :first-child` / `:nth-child(2)` / `:nth-child(3)` für die
    Desktop-Zweispalten-Ansicht ab 980px, Zeilen 966-989) bezieht sich auf die
    DOM-Reihenfolge — nach dem Vertauschen prüfen, ob die Grid-Platzierung (`grid-column`/
    `grid-row`) weiterhin sinnvoll ist: die Projektliste (jetzt erstes Kind) soll die breite/
    prominente Spalte einnehmen, Inbox+Proposals (jetzt zweites/drittes Kind) die schmalere
    Nebenspalte. Falls die bestehenden `nth-child`-Regeln nach dem Tausch die falsche Spalte
    prominent machen, die `nth-child`-Selektoren in `contributions.module.css`
    (`.contributionsStack > :first-child`, `:nth-child(2)`, `:nth-child(3)`, `:nth-child(n + 4)`)
    entsprechend anpassen, sodass die Projektliste weiterhin die breite/prominente Spalte
    bekommt und Inbox/Proposals die schmalere Nebenspalte — NICHT nur die HTML-Reihenfolge
    vertauschen und die CSS-Zuordnung kaputt lassen.

    In `MyContributionsSection.tsx` den `SectionHeader`-Titel von
    `"Bestätigte Projektrollen ({grouped.length} Animes)"` zu einem projekt-zentrierteren,
    aber weiterhin korrekten Titel ändern: `"Meine Projekte ({grouped.length})"` — bleibt
    inhaltlich korrekt (zeigt weiterhin nur confirmed-Einträge), ist aber als primäre Sektion
    besser benannt.

    Bestehende Tests für `page.tsx`/`MyContributionsSection`/`AnimeGroupCard` (per Grep in
    `frontend/src/app/me/contributions/` und `frontend/src/components/contributions/` suchen)
    auf die neue Reihenfolge/den neuen Titel anpassen, falls sie auf DOM-Reihenfolge oder den
    alten Sektionstitel prüfen. Keine Funktionalität (Bestätigen/Ablehnen/Sichtbarkeit/Hinweis
    senden) entfernen — nur Reihenfolge/Titel/Balken-Ergänzung.
  </action>
  <verify>
    <automated>cd frontend && npx vitest run src/app/me/contributions src/components/contributions --reporter=verbose</automated>
  </verify>
  <done>MyContributionsSection wird als erstes Kind vor ContributionInbox und MyProposalsSection gerendert (DOM-Reihenfolge in page.tsx); Desktop-Grid-Platzierung (nth-child-Selektoren) ordnet die Projektliste weiterhin der breiten/prominenten Spalte zu; SectionHeader-Titel lautet "Meine Projekte (N)"; alle bestehenden Tests (Bestätigen/Ablehnen/Sichtbarkeit/Hinweis senden) bleiben grün.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> GET /api/v1/me/anime-contributions | Authenticated request; response now carries two additional derived integer counts, no new user input accepted |
| Backend -> Postgres | Read-only correlated subqueries added to an existing parameterized query; no new write path |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-jya-01 | Information Disclosure | ListByMemberIDWithProposalFields worked/total subqueries | accept | Subqueries only aggregate COUNT(DISTINCT rv.id) scoped to the requesting member's own anime_id+fansub_group_id rows already returned in the same response; no cross-member data exposed (mirrors already-shipped member_profile_repository.go pattern) |
| T-jya-02 | Denial of Service | Two additional correlated subqueries per row, LIMIT 50 rows | accept | Bounded by existing LIMIT 50 on the outer query; subqueries are indexed-join-shaped identically to the proven loadRecentContributions query already running in production |
| T-jya-03 | Tampering | Frontend renders server-provided counts as a percentage width | accept | Values are server-computed integers, not user-controlled; percent calculation clamps via total>0 check, no injection surface |
</threat_model>

<verification>
Backend: `cd backend && go build ./... && go test ./internal/repository/... -run "MemberContributionWithProposalRow|ListByMemberIDWithProposalFields"`.
Frontend: `cd frontend && npx tsc --noEmit -p tsconfig.json && npx vitest run src/app/me/contributions src/components/contributions`.
Live smoke test (Orchestrator, nach Docker-Rebuild): `/me/contributions` im Browser öffnen (Port 3000, nach `docker restart team4sv30-frontend`), prüfen dass die Projektliste zuerst erscheint und mindestens eine Projektkarte einen Fortschrittsbalken mit sinnvollem aria-label zeigt.
</verification>

<success_criteria>
- Backend liefert `worked_release_version_count`/`total_release_version_count` pro Contribution-Zeile, korreliert auf die anime_id+fansub_group_id dieser Zeile (D-01)
- `MeAnimeContribution` (Frontend-Typ) führt beide Felder optional
- `AnimeGroupCard` zeigt pro Projektgruppe einen Fortschrittsbalken mit `aria-label` "X von Y Release-Versionen bearbeitet" (oder "Noch keine Release-Versionen vorhanden" bei total=0) (D-02)
- `/me/contributions` rendert `MyContributionsSection` ("Meine Projekte") vor `ContributionInbox` und `MyProposalsSection`, sowohl im DOM als auch in der Desktop-Grid-Spaltenzuordnung (D-03)
- Bestehende Funktionalität (Bestätigen/Ablehnen/Sichtbarkeit ändern/Hinweis senden/Selbstveröffentlichung) bleibt unverändert erhalten
- Alle geänderten Dateien bleiben unter dem 450-Zeilen-Limit
- Deutsche user-facing Strings verwenden korrekte Umlaute
- `go build ./...`, `go test ./internal/repository/...`, `npx tsc --noEmit`, `npx vitest run` laufen alle grün
</success_criteria>

<output>
Create `.planning/quick/260707-jya-meine-projekte-seite-umbauen-projektlist/260707-jya-SUMMARY.md` when done
</output>
