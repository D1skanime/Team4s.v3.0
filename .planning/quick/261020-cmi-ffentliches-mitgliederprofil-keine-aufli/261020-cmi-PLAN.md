---
phase: quick-261020-cmi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/types/profile.ts
  - backend/internal/repository/member_profile_projects_repository.go
  - backend/internal/repository/member_profile_projects_release_versions_repository.go
  - backend/internal/models/member_profile.go
  - backend/internal/handlers/public_member_profile_contract_test.go
  - backend/internal/repository/member_profile_query_budget_test.go
  - shared/contracts/openapi.yaml
autonomous: true
requirements: [261020-cmi-no-release-listing]

must_haves:
  truths:
    - "Auf /members/founder und /members/uebersetzung zeigt die Sektion Fansub-Projekte fuer jedes Projekt NUR Animetitel, Gruppe und die Rollen-Chips des Mitglieds -- kein Folge-N/Episodentitel, keine Release-Version, kein Projektweit-Label."
    - "Die uebrigen Profil-Daten (Avatar, Badges, Known-For, Mitgliedschaften, letzte Beitraege) bleiben unveraendert sichtbar -- nur die Release-Auflistung unter Fansub-Projekte verschwindet."
    - "Ein oeffentlicher Profilaufruf laedt die current-projects-Seite weiterhin korrekt; das Backend liefert keine release_versions/is_release_specific-Daten mehr und fuehrt dafuer eine SQL-Abfrage weniger pro current-projects-Ladevorgang aus als vorher."
    - "/me-Seiten und Admin-Ansichten sind unveraendert (MeProjectDetail/MeProjectReleaseVersion-Schema und -Code bleiben unangetastet)."
  artifacts:
    - path: "frontend/src/components/profile/MemberCurrentProjectsSection.tsx"
      provides: "Projekt-Karte ohne Release-Auflistung und ohne 'Projektweit'-Badge; zeigt nur Titel, Gruppe, Rollen-Chips"
    - path: "frontend/src/types/profile.ts"
      provides: "PublicMemberCurrentProject ohne release_versions-Feld; PublicMemberProjectReleaseVersion-Interface entfernt"
    - path: "backend/internal/models/member_profile.go"
      provides: "PublicMemberCurrentProject ohne ReleaseVersions-Feld; PublicMemberProjectReleaseVersion-Struct entfernt"
    - path: "backend/internal/repository/member_profile_projects_repository.go"
      provides: "loadCurrentProjects ohne Batch-Release-Version-Anreicherung; enthaelt decodeMemberRoles (aus der geloeschten Datei uebernommen)"
    - path: "shared/contracts/openapi.yaml"
      provides: "PublicMemberCurrentProject-Schema ohne release_versions-Property; PublicMemberProjectReleaseVersion-Schema entfernt"
  key_links:
    - from: "frontend/src/components/profile/MemberCurrentProjectsSection.tsx"
      to: "frontend/src/types/profile.ts"
      via: "import type { PublicMemberCurrentProject } -- kein release_versions mehr referenziert"
      pattern: "release_versions"
    - from: "backend/internal/repository/member_profile_projects_repository.go"
      to: "backend/internal/models/member_profile.go"
      via: "models.PublicMemberCurrentProject ohne ReleaseVersions-Feldzuweisung"
      pattern: "ReleaseVersions"
---

<objective>
Nutzerentscheidung vom 20.10.2026: Auf dem oeffentlichen Mitgliederprofil `/members/<slug>`
zeigt "Fansub-Projekte" pro Projekt kuenftig NUR Animetitel, Gruppe und die Rollen-Chips des
Mitglieds -- die bisherige Auflistung einzelner Folgen/Releases (und das dadurch sinnlos
gewordene "Projektweit"-Label) entfaellt vollstaendig. Ursache des alten Verhaltens war
`sameMemberRoleSets` (exakte Rollengleichheit verlangt, siehe
`backend/internal/repository/member_profile_projects_release_versions_repository.go`) -- diese
Logik wird NICHT repariert, sondern die komplette Release-Darstellung wird entfernt.

Recherche waehrend der Planung hat bereits geklaert (keine erneute Pruefung durch den Executor
noetig): `release_versions` / `is_release_specific` / `loadCurrentProjectReleaseVersionsBatch` /
`sameMemberRoleSets` / `PublicMemberProjectReleaseVersion` werden AUSSCHLIESSLICH vom
oeffentlichen Profil-Projekt-Loader (`MemberProfileRepository.loadCurrentProjects` ->
`PublicMemberCurrentProject`) verwendet. Die strukturell aehnlichen `/me`-Schemas
`MeProjectDetail`/`MeProjectReleaseVersion` (`shared/contracts/contributions.yaml`,
`backend/internal/repository/anime_contributions_member_project_repository.go`) sind komplett
getrennte Typen/Code-Pfade und bleiben unberuehrt. Also: Backend-Ladelogik und -Feld werden
entfernt (spart eine SQL-Query pro oeffentlichem Profilaufruf), nicht nur das Frontend.

`is_project_level`/`IsProjectLevel` selbst bleibt als Backend-/Contract-Feld bestehen (wird
weiterhin aus derselben Hauptquery mitgeladen) -- nur die Frontend-Darstellung als
"Projektweit"-Badge entfaellt, weil sie ohne Release-Auflistung keinen Sinn mehr ergibt.

Purpose: Besuchern des oeffentlichen Profils nicht mehr Detailtiefe zeigen, als fuer eine
Projektuebersicht sinnvoll ist; gleichzeitig eine jetzt tote Backend-Query einsparen.
Output: Bereinigte `MemberCurrentProjectsSection.tsx`/`.module.css`/Tests, bereinigtes
`frontend/src/types/profile.ts`, bereinigte Backend-Repository-Dateien/Modelle/Contract.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.module.css
@frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
@frontend/src/types/profile.ts
@backend/internal/repository/member_profile_projects_repository.go
@backend/internal/repository/member_profile_projects_release_versions_repository.go
@backend/internal/models/member_profile.go
@backend/internal/handlers/public_member_profile_contract_test.go
@backend/internal/repository/member_profile_query_budget_test.go
@shared/contracts/openapi.yaml
</context>

<interfaces>
Aktueller Ist-Zustand (fuer den Executor, keine erneute Exploration noetig):

`frontend/src/types/profile.ts` (Zeilen 187-210, zu aendern):
`PublicMemberProjectReleaseVersion` deklariert `release_version_id, release_version_label,
version, title?, episode_number, episode_title?, roles, is_release_specific`.
`PublicMemberCurrentProject` deklariert u. a. `roles: PublicMemberRole[]`,
`release_versions: PublicMemberProjectReleaseVersion[]`, `is_project_level: boolean`,
`contribution_status: 'confirmed'`.

`backend/internal/models/member_profile.go` (Zeilen 263-288, zu aendern):
`PublicMemberProjectReleaseVersion` struct mit `ReleaseVersionID int64`,
`ReleaseVersionLabel string`, `Version string`, `Title *string`, `EpisodeNumber string`,
`EpisodeTitle *string`, `Roles []PublicMemberRole`, `IsReleaseSpecific bool`.
`PublicMemberCurrentProject` struct enthaelt `ReleaseVersions []PublicMemberProjectReleaseVersion`
(JSON-Tag `release_versions`) als eines von neun Feldern -- bleibt sonst unveraendert (inkl.
`IsProjectLevel`).

`backend/internal/repository/member_profile_projects_repository.go`:
`loadCurrentProjects` (Zeile 18) scannt Hauptquery-Zeilen in `items` inkl. `IsProjectLevel`
(Zeile 106) -- dieser Teil bleibt. Direkt danach (Zeilen 125-151) haengt ein Block die per
`loadCurrentProjectReleaseVersionsBatch` geladenen Releases an `items[i].ReleaseVersions` an
und berechnet `IsReleaseSpecific` via `sameMemberRoleSets` -- dieser GESAMTE Block entfaellt.
Kommentar-Block am Dateiende (Zeilen 320-322, "memberProjectKey,
loadCurrentProjectReleaseVersionsBatch, sameMemberRoleSets und decodeMemberRoles sind
ausgelagert in ...") entfaellt ebenfalls (beschreibt die zu loeschende Datei).

`backend/internal/repository/member_profile_projects_release_versions_repository.go` (151
Zeilen) enthaelt: `memberProjectKey` (Typ), `loadCurrentProjectReleaseVersionsBatch` (Methode),
`sameMemberRoleSets` (Funktion) -- alle drei werden nach Entfernung des Aufrufs in
`member_profile_projects_repository.go` nirgends mehr referenziert und sind zu loeschen.
`decodeMemberRoles` (Zeilen 139-151) wird dagegen WEITERHIN von
`member_profile_contributions_repository.go:206` und
`member_profile_memberships_repository.go:119` sowie von `loadCurrentProjects` selbst
(Zeile 113) benoetigt -- vor dem Loeschen dieser Datei nach
`member_profile_projects_repository.go` verschieben (Import `encoding/json` dort ergaenzen).
Nach dieser Verschiebung die jetzt leere Quelldatei loeschen.

`frontend/src/components/profile/MemberCurrentProjectsSection.tsx`: `releaseExceptionLabel`
(Zeilen 36-39), der `.releaseException`-Rendering-Block (Zeilen 193-224, mappt
`project.release_versions.filter(...).map(...)`), und der `project.is_project_level`-Badge-
Block (Zeilen 185-190, Lucide-`Layers`-Icon + "Projektweit"-Text) entfallen komplett. Danach
ist der `Layers`-Import (Zeile 4) ungenutzt und muss mit entfernt werden.

`frontend/src/components/profile/MemberCurrentProjectsSection.module.css`: Klassen
`.releaseException` (Zeilen 110-116) und `.releaseExceptionLabel` (Zeilen 118-122) werden
nirgends sonst referenziert und entfallen.

`backend/internal/repository/member_profile_query_budget_test.go`: `phase131ConstantQueryBudget`
(aktuell `16`, Zeile 177) ist die harte, mit `require.Equalf` erzwungene Query-Zahl pro
oeffentlichem Profilaufruf -- nach Entfernung der gebatchten Release-Version-Query reduziert
sich die tatsaechliche Query-Zahl um GENAU 1 (die Hauptquery `loadCurrentProjects` bleibt, nur
der daran anschliessende `loadCurrentProjectReleaseVersionsBatch`-Call entfaellt). Dieser Test
laeuft NUR, wenn `TEAM4S_PHASE131_TEST_DSN` gesetzt ist -- `scripts/test-backend.sh` setzt
diese DSN (volles Schema, siehe `FULL_SCHEMA_VARS`), laeuft also im vorgeschriebenen Testlauf
tatsaechlich.

`backend/internal/handlers/public_member_profile_contract_test.go` Zeile 81: Fixture-Feld
`ReleaseVersions: []models.PublicMemberProjectReleaseVersion{},` muss entfernt werden (Typ
existiert nach Task 2 nicht mehr) -- die bestehenden Allow-List-/Forbidden-Field-Assertions in
dieser Datei pruefen nur `PublicMemberProfileData`/`PublicMemberMembership`/
`PublicMemberProfileBackgroundImage` und den globalen Forbidden-Key-Scan, keine davon
referenziert `release_versions` explizit -- keine weitere Anpassung an den Assertions selbst
noetig.

`shared/contracts/openapi.yaml`: Schema `PublicMemberProjectReleaseVersion` (ca. Zeilen
13567-13598) komplett entfernen. Im Schema `PublicMemberCurrentProject` (ca. Zeilen
13599-13644) `release_versions` aus der `required`-Liste (Zeile 13607) UND aus `properties`
(Zeilen 13628-13631, der `$ref` auf `PublicMemberProjectReleaseVersion`) entfernen;
`is_project_level` bleibt unveraendert required+property. `MeProjectDetail`/
`MeProjectReleaseVersion` (andere Stelle in derselben Datei, separates Schema) NICHT anfassen.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Frontend -- Release-Auflistung und Projektweit-Label aus der Projekt-Karte entfernen</name>
  <files>frontend/src/components/profile/MemberCurrentProjectsSection.tsx, frontend/src/components/profile/MemberCurrentProjectsSection.module.css, frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx, frontend/src/types/profile.ts</files>
  <action>
    In `frontend/src/types/profile.ts`: `PublicMemberProjectReleaseVersion`-Interface komplett
    entfernen; aus `PublicMemberCurrentProject` das Feld `release_versions:
    PublicMemberProjectReleaseVersion[]` entfernen (`is_project_level` bleibt als Feld bestehen,
    auch wenn es vom UI nicht mehr gerendert wird).

    In `MemberCurrentProjectsSection.tsx`: die Funktion `releaseExceptionLabel` entfernen; den
    Render-Block entfernen, der ueber `project.release_versions.filter(r =>
    r.is_release_specific).map(...)` iteriert (inkl. `.releaseException`/
    `.releaseExceptionLabel`-Spans und der verschachtelten Rollen-Chip-Sortierung darin); den
    `project.is_project_level ? <Badge>...Projektweit</Badge> : null`-Block entfernen; den dann
    ungenutzten `Layers`-Import aus `lucide-react` entfernen. Die verbleibende Karte zeigt
    weiterhin: Cover, Animetitel, Gruppenname, und die (weiterhin vorhandenen) sortierten
    projektweiten Rollen-Chips aus `project.roles`.

    In `MemberCurrentProjectsSection.module.css`: `.releaseException` und
    `.releaseExceptionLabel` entfernen (keine anderen Referenzen im Baum, siehe Recherche).

    In `MemberCurrentProjectsSection.test.tsx`: aus dem `makeProject`-Helper die Zeile
    `release_versions: []` entfernen (Feld existiert nicht mehr im Typ). Den kompletten Test
    "separates release-specific exceptions from project-wide roles" entfernen (prueft entfernte
    Funktionalitaet). In "orders and labels catalog roles while keeping karaoke, typesetting
    and unknown roles distinct" die Assertion `expect(screen.getByText('Projektweit').className
    ).toContain('badgeNeutral')` entfernen. Danach einen neuen Test ergaenzen, der direkt das
    Entfallen der alten Darstellung beweist: ein Projekt mit `is_project_level: true` und
    Rollen rendern, dann pruefen, dass `screen.queryByText('Projektweit')` `null` ist, dass
    `container.querySelector('[class*="releaseException"]')` `null` ist, UND dass Animetitel,
    Gruppenname sowie mindestens ein Rollen-Chip weiterhin sichtbar sind (reine
    Render-Assertion auf echten DOM-Output, kein Mocking der Komponente selbst -- Teststil-Regel
    aus CLAUDE.md).
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && docker compose exec -T team4sv30-frontend npm run typecheck && docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberCurrentProjectsSection.test.tsx && docker compose exec -T team4sv30-frontend npm run lint</automated>
  </verify>
  <done>
    `npm run typecheck`, der Komponententest und `npm run lint` laufen gruen; die Komponente
    rendert pro Projekt nur noch Cover, Animetitel, Gruppe und Rollen-Chips; `release_versions`
    taucht nirgends mehr im Frontend-Typ oder der Komponente auf.
  </done>
</task>

<task type="auto">
  <name>Task 2: Backend -- tote Release-Version-Batch-Ladelogik, -Feld und -Contract entfernen</name>
  <files>backend/internal/repository/member_profile_projects_repository.go, backend/internal/repository/member_profile_projects_release_versions_repository.go, backend/internal/models/member_profile.go, backend/internal/handlers/public_member_profile_contract_test.go, backend/internal/repository/member_profile_query_budget_test.go, shared/contracts/openapi.yaml</files>
  <action>
    In `backend/internal/models/member_profile.go`: `PublicMemberProjectReleaseVersion`-Struct
    vollstaendig entfernen; aus `PublicMemberCurrentProject` das Feld `ReleaseVersions
    []PublicMemberProjectReleaseVersion` (JSON-Tag `release_versions`) entfernen
    (`IsProjectLevel` bleibt).

    In `backend/internal/repository/member_profile_projects_repository.go`: den
    Release-Version-Anreicherungs-Block in `loadCurrentProjects` entfernen (der `if len(items)
    > 0 { ... }`-Abschnitt, der `loadCurrentProjectReleaseVersionsBatch` aufruft, `byProject`
    nach `memberProjectKey` gruppiert und `items[i].ReleaseVersions`/`IsReleaseSpecific`
    befuellt) -- die Funktion endet danach direkt mit `return items, nil`. Den erklaerenden
    Auslagerungs-Kommentar am Dateiende entfernen. `decodeMemberRoles` (siehe unten) aus der
    release-versions-Datei in diese Datei uebernehmen (gleiche Paketebene, Import
    `encoding/json` ergaenzen), da `loadCurrentProjects` sowie zwei weitere Repository-Dateien
    diese Funktion weiterhin brauchen.

    `backend/internal/repository/member_profile_projects_release_versions_repository.go`
    komplett loeschen, nachdem `decodeMemberRoles` daraus uebernommen wurde (der Rest der Datei
    -- `memberProjectKey`, `loadCurrentProjectReleaseVersionsBatch`, `sameMemberRoleSets` -- hat
    nach Entfernung des Aufrufs keine Referenz mehr).

    In `backend/internal/handlers/public_member_profile_contract_test.go`: die Zeile
    `ReleaseVersions: []models.PublicMemberProjectReleaseVersion{},` aus der
    `CurrentProjects`-Fixture in `fullyPopulatedPublicMemberProfile` entfernen (reiner
    Compile-Fix, keine Assertion betrifft dieses Feld).

    In `backend/internal/repository/member_profile_query_budget_test.go`: Nach Entfernung der
    gebatchten Query reduziert sich die tatsaechliche Query-Zahl pro Profilaufruf um 1 (die
    beiden Tests `TestPhase131PublicProfileQueryBudgetCharacterization` und
    `TestPhase131PublicProfileQueryBudgetIsConstant` laufen nur mit gesetztem
    `TEAM4S_PHASE131_TEST_DSN`, was `scripts/test-backend.sh` bereitstellt). `go test` echt
    ausfuehren (siehe Verify) und `phase131ConstantQueryBudget` (Zeile 177, aktuell `16`) auf
    den tatsaechlich gemessenen neuen Wert setzen -- NICHT blind auf 15 raten, sondern den
    Testlauf selbst entscheiden lassen und den Kommentar oberhalb der Konstante (Zeilen
    158-176) um einen kurzen Hinweis auf diese Aenderung ergaenzen (analog zum bestehenden
    Stil, z. B. "Quick 261020-cmi: lowered by 1 nach Entfernung der gebatchten
    Release-Version-Query"). Die historischen Prosa-Kommentare an den Zeilen 24-32 (beschreiben
    die ALTE Pre-131-03-N+1-Situation) bleiben unveraendert -- sie sind korrekte Historie, kein
    aktueller Zustand.

    In `shared/contracts/openapi.yaml`: Schema `PublicMemberProjectReleaseVersion` komplett
    entfernen. Im Schema `PublicMemberCurrentProject` `release_versions` aus der
    `required`-Liste und aus `properties` entfernen. `is_project_level` und alle anderen
    Felder unveraendert lassen. Das strukturell aehnliche, aber unabhaengige Schema
    `MeProjectDetail`/`MeProjectReleaseVersion` (andere Stelle derselben Datei, fuer
    `/me`-Seiten) NICHT anfassen.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && docker compose exec -T team4sv30-backend go build ./... && docker compose exec -T team4sv30-backend go vet ./... && docker compose exec -T team4sv30-backend go test ./internal/repository/... -run MemberProfile -v && docker compose exec -T team4sv30-backend go test ./internal/handlers/... -run PublicMemberProfile -v</automated>
  </verify>
  <done>
    `go build`/`go vet`/die genannten Tests laufen gruen; `grep -rn "ReleaseVersions\|loadCurrentProjectReleaseVersionsBatch\|sameMemberRoleSets\|is_release_specific" backend/ shared/contracts/openapi.yaml` liefert keine Treffer mehr ausser in historischen Prosa-Kommentaren, die die Pre-131-03-Vergangenheit beschreiben; `phase131ConstantQueryBudget` ist auf den real gemessenen Wert aktualisiert; alle betroffenen Dateien bleiben =450 Zeilen.
  </done>
</task>

<task type="auto">
  <name>Task 3: Backend neu bauen, Frontend neu starten, Live-Check</name>
  <files></files>
  <action>
    Vollstaendigen Backend-Testlauf per `scripts/test-backend.sh` ausfuehren (Projektvorgabe,
    deckt u. a. den query-budget-Test aus Task 2 mit echter Datenbank ab). Danach Backend neu
    bauen/starten (`docker compose up -d --build team4sv30-backend`) und Frontend-Container neu
    starten (`docker restart team4sv30-frontend`, NICHT `npm run build` im laufenden
    Container). Anschliessend per `curl` selbst gegen `http://127.0.0.1:3000/members/founder`
    und `http://127.0.0.1:3000/members/uebersetzung` pruefen: beide Antworten enthalten KEIN
    "Folge " mehr und KEIN "Projektweit" mehr, aber weiterhin die 11eyes-Projektkarte mit
    Titel/Gruppe/Rollen-Chips.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && bash scripts/test-backend.sh && docker compose up -d --build team4sv30-backend && curl -sf http://192.168.235.196:18092/health && docker restart team4sv30-frontend && sleep 3 && curl -s http://127.0.0.1:3000/members/founder > /tmp/founder.html && ! grep -q 'Folge ' /tmp/founder.html && ! grep -q 'Projektweit' /tmp/founder.html && curl -s http://127.0.0.1:3000/members/uebersetzung > /tmp/uebersetzung.html && ! grep -q 'Folge ' /tmp/uebersetzung.html && ! grep -q 'Projektweit' /tmp/uebersetzung.html</automated>
  </verify>
  <done>
    `scripts/test-backend.sh` ist gruen, Backend-Container laeuft neu gebaut, `/health`
    antwortet 200, `team4sv30-frontend` ist neu gestartet. `curl` gegen `/members/founder` und
    `/members/uebersetzung` zeigt weder "Folge " noch "Projektweit", aber weiterhin die
    jeweiligen Fansub-Projektkarten mit Titel/Gruppe/Rollen.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> `GET /members/<slug>` (oeffentlich, unauthentifiziert) | Rein lesender Pfad; diese Aenderung reduziert nur die zurueckgegebene Datenmenge/Darstellung, oeffnet keinen neuen Trust Boundary. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261020-01 | Information Disclosure | `MemberCurrentProjectsSection.tsx` / `PublicMemberCurrentProject` | mitigate | Genau das Ziel dieses Plans: Release-/Episoden-Detailtiefe wird dem oeffentlichen Besucher NICHT mehr gezeigt -- Risiko sinkt gegenueber dem Ist-Zustand, nicht neu eingefuehrt. |
| T-261020-02 | Tampering | Entfernen von `loadCurrentProjectReleaseVersionsBatch` koennte versehentlich eine noch gebrauchte Query fuer `/me`/Admin kappen | accept | Durch Recherche in der Planung bereits verifiziert: ausschliesslich vom oeffentlichen Profil-Loader verwendet; `/me`/Admin nutzen das getrennte `MeProjectDetail`/`MeProjectReleaseVersion`-Schema. Go-Compile-Fehler wuerden jede faelschliche Restnutzung sofort aufdecken. |
| T-261020-SC | Tampering | npm/pip/go-Installationen | accept | Dieser Plan installiert keine neuen Abhaengigkeiten; kein Package-Legitimacy-Gate erforderlich. |
</threat_model>

<verification>
- Task 1: `npm run typecheck`, Komponententest, `npm run lint` gruen; `release_versions`/`PublicMemberProjectReleaseVersion` nirgends mehr im Frontend.
- Task 2: `go build ./...`, `go vet ./...`, betroffene Go-Tests gruen; `ReleaseVersions`/`loadCurrentProjectReleaseVersionsBatch`/`sameMemberRoleSets`/`is_release_specific` nirgends mehr im Backend-Code oder Contract (ausser historische Kommentare); `phase131ConstantQueryBudget` aktualisiert.
- Task 3: `scripts/test-backend.sh` gruen, Backend/Frontend neu gestartet, `curl`-Check gegen beide Live-Profile bestaetigt die entfernte Darstellung bei weiterhin sichtbaren Projektkarten.
</verification>

<success_criteria>
- `/members/founder` und `/members/uebersetzung` zeigen pro Fansub-Projekt nur Animetitel, Gruppe und Rollen-Chips -- keine Folgen-/Release-Liste, kein "Projektweit"-Label.
- Alle uebrigen Profil-Abschnitte bleiben unveraendert sichtbar.
- Backend liefert `release_versions`/`is_release_specific` nicht mehr und fuehrt eine SQL-Query weniger pro oeffentlichem Profilaufruf aus (durch den aktualisierten `phase131ConstantQueryBudget`-Test erzwungen).
- `/me`-Seiten und Admin-Ansichten sind unveraendert (kein Diff in `MeProjectDetail`/`MeProjectReleaseVersion`-Pfaden).
- Alle geaenderten Dateien bleiben <=450 Zeilen.
- Keine Co-Authored-By-Zeilen, kein Push, kein `git stash`; Commits sind gezielt per Pfad (Frontend-Commit, Backend-Commit, ggf. separater Contract-Commit).
</success_criteria>

<output>
Create `.planning/quick/261020-cmi-ffentliches-mitgliederprofil-keine-aufli/261020-cmi-SUMMARY.md` when done
</output>
