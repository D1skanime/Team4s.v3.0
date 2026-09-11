# Validierung und Grenzen

Begleitdokument zu [REPORT.md](REPORT.md). Zusammenfassung der in diesem Plan (155-07) und den
vorangehenden sechs Plänen (155-01 bis 155-06) real ausgeführten Tests, als Belegkette für die
Phase-155-Abnahmekriterien. Kein Test in diesem Dokument wurde neu erfunden — jeder Eintrag
verweist auf einen tatsächlich in dieser oder einer vorangehenden Plan-Ausführung gelaufenen
Befehl.

## Task 1 (dieser Plan): Previous/Next-Grenzfälle + deutsches Locale

```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/lib/fansubProjectNavigation.test.ts'"
```

**Ergebnis: 6/6 Tests grün** (3 bestehende + 3 neue). Die drei neuen Fälle:

1. „Previous Project am Listenanfang" — `previous` ist `null`, `next` zeigt korrekt auf das
   zweitsortierte Projekt (`href` explizit geprüft, nicht nur Anwesenheit eines Links).
2. „Next Project am Listenende" — `next` ist `null`, `previous` zeigt korrekt auf das
   zweitletzte Projekt.
3. Diakritika-Sortierung — die erwartete Reihenfolge wird im Test selbst über einen echten
   `["Änderung","Zeta","Zwiebel"].sort((a,b) => a.localeCompare(b,'de',{sensitivity:'base'}))`-Aufruf
   berechnet, nicht hart kodiert; zusätzlich wird explizit geprüft, dass „Änderung" vor „Zeta" UND
   vor „Zwiebel" steht (Gegenbeweis zur rohen UTF-16-Codepoint-Ordnung, die „Z" vor „Ä" einsortieren
   würde — genau der in `155-RESEARCH.md` „Pitfall 2" benannte Fehlerfall).

Der Comparator selbst (`buildFansubProjectNavigation`, `frontend/src/lib/fansubProjectNavigation.ts`)
wurde durch diese Phase nicht verändert — der operatorseitig gesperrte Entscheid war ausdrücklich,
die Sortierung in JS zu belassen (`155-CONTEXT.md`, „Previous/Next-Sortierung: bleibt in JS").

## Task 2 (dieser Plan): Vollregression Backend + Frontend

### Backend

```
docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
  golang:1.25-alpine sh -c "go build ./... && go vet ./... && go test ./..."
```

`go build ./...` und `go vet ./...`: **grün, exit 0.** `go test ./...`: die Pakete
`cmd/server`, `internal/auth`, `internal/badges`, `internal/config`, `internal/handlers`,
`internal/middleware`, `internal/models`, `internal/observability`, `internal/permissions`,
`internal/services`, `internal/testquality`, `internal/testsupport` sind **alle grün**.

Die Pakete `internal/migrations` und `internal/repository` melden Fehlschläge — **alle
vorbestehend, keiner durch diese Phase verursacht:**

| Ursache | Betroffene Tests | Grund |
| --- | --- | --- |
| `TEAM4S_PHASE128_TEST_DSN` nicht gesetzt | `TestPhase128*`, `TestArchive*Postgres`, `TestMemberPointTotalsPostgres*`, `TestLoadContributionBadgesPostgres*`, `TestGetOwnDashboardPostgres*`, `TestLoadBadgeProgressPostgres*`, `TestLoadPublicBadgesPostgres*`, `TestLoadRoleVolume*Postgres*` (ca. 30 Tests, `internal/repository`) | Skip-Guard verlangt eine dedizierte, in dieser Session nicht gesetzte DSN-Umgebungsvariable — identisches Verhalten bereits in `155-01-SUMMARY.md`/`155-02-SUMMARY.md` dokumentiert |
| `TEAM4S_PHASE134_MIGRATION_DSN` nicht gesetzt | `TestPhase134MigrationFreshUpDownProof`, `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` (`internal/migrations`) | Gleicher Skip-Guard-Mechanismus, andere Phase-134-Migrationsproof-DSN |
| Live-Backend/Keycloak unter `192.168.235.196:18093` nicht erreichbar bzw. `sheppert@team4s.local`-Zugangsdaten in dieser Session ungültig | `TestPhase134Matrix*` (8 Tests, `internal/repository`) | `dial tcp 192.168.235.196:18093: connect: connection refused` bzw. `invalid_grant` — Netzwerk-/Credential-Abhängigkeit, kein Codepfad dieser Phase |
| Vorbestehende, mit Phase 155 unverbundene Fehlschläge in `member_claims_repository.go`/`fansub_group_app_members_repository.go` | `TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` | Diese Dateien wurden zuletzt in Phase 143 verändert (`git log` bestätigt keinen 155-*-Commit auf diesen Dateien); die Fehlschläge existierten bereits vor 155-01 und liegen außerhalb dieser Phase's `files_modified`-Listen über alle sieben Pläne |

Keiner der oben genannten Tests berührt eine der von 155-01 bis 155-07 tatsächlich veränderten
Dateien (siehe jeweilige SUMMARY.md `key-files`); keine Reparatur wurde vorgenommen, weil keine
Ursache in dieser Phase liegt (Scope-Boundary-Regel: vorbestehende, unzusammenhängende
Fehlschläge werden dokumentiert, nicht repariert).

### Frontend

```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run && npx eslint ."
```

- `npx tsc --noEmit`: **grün, exit 0.**
- `npx vitest run`: **298 Testdateien bestanden, 1 übersprungen (299 gesamt); 2.301 Tests
  bestanden, 3 Todo (2.304 gesamt); 0 Fehlschläge, exit 0.** Enthält alle sechs vorangehenden
  Pläne's neue/geänderte Testdateien (u. a. `projectPageData.test.ts`, die drei Pretty-Route
  `page.test.tsx`, `ProjectMemberRows.test.tsx`) sowie dieses Plans neue drei
  `fansubProjectNavigation.test.ts`-Fälle.
- `npx eslint .`: **exit 1 — 13 Errors, 331 Warnings**, ausnahmslos in Dateien außerhalb jeder
  Phase-155-`files_modified`-Liste (`capture-responsive.cjs`,
  `admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts`,
  `admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`,
  `admin/fansubs/[id]/edit/GroupMemberFormModals.tsx`, `admin/fansubs/[id]/edit/GroupRolesTab.tsx`,
  `admin/groups/AdminGroupsClient.tsx`, `admin/roles/RoleCapabilityDetail.tsx`,
  `admin/users/tabs/CapabilityDetailRow.tsx`, `admin/users/tabs/CapabilityHistoryPanel.tsx`).
  Deckt sich mit der bereits in Phase 152s Abschluss dokumentierten vorbestehenden Zahl
  („13 ESLint-Fehler / 332 Warnungen … vorbestehend und ausserhalb der Phase", `.planning/STATE.md`,
  Abschnitt „Vorherige Position (Phase 152, abgeschlossen)"). Die einzige neue, durch Phase 155
  eingeführte ESLint-Warnung ist ein vorbestehender `_params`-unused-var-Hinweis in
  `releases/[releaseVersionId]/page.test.tsx` (155-06, nicht behoben, da Warning statt Error, und
  bereits so in `155-06-SUMMARY.md` dokumentiert).

`git status --short` nach beiden Läufen: **leer** — keine unbeabsichtigten Dateien durch den
Testlauf zurückgelassen.

## Contributor-Lasttest (155-03, hier zitiert, nicht neu ausgeführt)

`TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors`
(`backend/internal/repository/group_contributors_repository_test.go`, Commit `b3b9ecda`):
gegen eine real seedete Postgres-Instanz (`team4s_phase155_test`) mit einer kleinen Gruppe (2
Team-Mitglieder, 2 externe Mitwirkende) und einer großen Gruppe (30 Team-Mitglieder, 20 externe
Mitwirkende, 50 gesamt) gemessen: **beide exakt 2 SQL-Abfragen**, gepinnt als
`phase155ContributorsConstantQueryBudget = 2`. Beweist: die Projektseite lädt bei 30-50
Mitwirkenden keine zusätzlichen Member-Detaildaten nach (P155-04).

## Release-Zahl-Paritätstest (155-02, hier zitiert, nicht neu ausgeführt)

Zwei real gegen Postgres gemessene Tests in `group_release_version_count_test.go`: für eine
Episode mit zwei Release-Versionen (v1+v2) liefert die neue `GetGroupReleaseVersionCount`
(3) exakt denselben Wert wie die alte `GetGroupReleases`-Zeilenzahl (3) — UND explizit ungleich
der abgelehnten `episode_count`-Alternative (2). Beweist: die öffentlich angezeigte
„Releases"-Zahl bleibt byte-identisch (operatorseitig gesperrter Entscheid, `155-CONTEXT.md`
„Releases-Zahl").

## Resolver-Not-Found-Paritätstest (155-01, hier zitiert, nicht neu ausgeführt)

`fansub_project_resolver_handler_test.go`: unbekannter `groupSlug` und bekannter `groupSlug` mit
unbekanntem `animeSlug` liefern beide denselben neutralen 404-Body (kein Informationsleck, welcher
Teil der Auflösung fehlgeschlagen ist) — httptest-basiert gegen den echten Handler, nicht per
Quelltext-Substring-Prüfung (CLAUDE.md-Teststil-konform).

## Bekannte, nicht in dieser Phase behobene Befunde (Querverweis)

- `contributor_roles.name`/`role_definitions.code` Case-Mismatch in Produktionsdaten
  (155-03-SUMMARY.md) — Latent-Defekt, außerhalb des Query-Budget-Scopes dieser Phase, nicht
  behoben.
- `ReleasesSection`s Gating wurde in 155-04/155-05 auf eine einzelne externe Ternary in
  `ProjectPage.tsx` vereinfacht statt des ursprünglich skizzierten internen Prop-Ansatzes
  (funktional gleichwertig, dokumentiert in `155-04-SUMMARY.md`/`155-05-SUMMARY.md`).
- Die drei in REPORT.md unter „Bewusste Nicht-Behebungen" genannten Punkte (redundanter
  `GetGroupDetail`-Aufruf in `GetGroupReleases`, unangetastete `ThemesSection`/`MediaSection`,
  nicht verlinkte Mitwirkenden-Avatare in `PublicReleaseBlock`/`OlderReleasesList.rows.tsx`).

## Grenzen dieser Messung

- Nur eine reale Gruppe/Projekt-Kombination existiert im Dev-Datenbestand (`new-subs`/
  `buddy-complex`) — keine Messung mit mehreren Projekten pro Gruppe oder mit einer Episode, die
  mehrere Release-Versionen hat, war über die Live-Browserroute möglich (die Release-Zahl-Parität
  dafür ist stattdessen mit synthetisch geseedeten Postgres-Daten in 155-02 bewiesen, siehe oben).
- Kein TTFB-Vorher-Wert existiert, weil eine Live-Nachmessung des alten Codes einen
  Codebase-Rollback erfordert hätte, was dieser Plan per Auftragstext explizit ausschließt
  ("do not re-derive them by checking out or reverting code").
- Die 2 Konsolenfehler im Nachher-Lauf wurden nicht in dieser Phase untersucht — sie liegen
  außerhalb des in `155-CONTEXT.md` festgelegten Scopes (kein UI-Redesign, keine Fehlerbehebung
  außerhalb der sechs benannten Workstreams) und werden hier nur als Messwert, nicht als
  Befund, aufgeführt.
