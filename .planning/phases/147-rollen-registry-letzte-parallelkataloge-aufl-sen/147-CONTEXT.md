# Phase 147: Rollen-Registry — letzte Parallelkataloge auflösen - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Source:** Orchestrator-Synthese aus expliziten Nutzervorgaben (Plan-Phase-Kommandoargumente) + eigener Verifikation der Fundstellen aus `.planning/audits/2026-09-05-hardcoding-drift-audit.md` und dem bereits selbst gemessenen Ausgangsbefund in `.planning/ROADMAP.md`. Kein separater `/gsd:discuss-phase`-Lauf nötig — der Nutzer hat den vollständigen Entscheidungsrahmen bereits im Plan-Phase-Aufruf mitgeliefert.

<domain>
## Phase Boundary

Ausschließlich vier Findings aus dem Hardcoding-Audit:
- **HC-01**: Rollenfarbe der öffentlichen Notizkarte (`PublicNoteCard`) hängt aktuell an einer kaputten Label→Code-Rückwärtsauflösung (`frontend/src/lib/roleColors.ts`) statt am stabilen `role_code`.
- **HC-02**: Zweite Parallelregistry `ROLE_LABELS`/`roleLabelForCode` in `useGroupMembersTab.ts`, obwohl der kataloggetriebene Pfad (`labelForRole` aus `@/lib/roleCatalog`) bereits daneben existiert.
- **HC-03**: Globaler App-Rollen-Satz (`platform_admin`, `content_admin`, `user`) existiert nur als drei Einzelkonstanten ohne exportierten Satz — vier Dateien tragen unabhängige Literal-Kopien.
- **HC-09**: Vier Rollenkonstanten in `permissions.go` ohne Produktionsreferenz (`RoleTranslator`, `RoleTypesetter`, `RoleTechadmin`, `RoleGfxler`), aber mit paketinternen Testfixture-Referenzen.

**Explizit NICHT Teil dieser Phase** (nur dokumentieren, nicht beheben): HC-04 (Membership-Baseline), HC-05 (Claim-Status), HC-06 (Visibility/Review-Status), HC-07 (Status-Unions), HC-08 (Asset-Typen), HC-10, Badge-System, Member-Profile-Performance, Carousel, jegliches allgemeine Refactoring über die vier Findings hinaus.

**UI hint aus ROADMAP.md:** „nein — reine Datenquellen-Umstellung hinter einem bestehenden Attribut-Seam, kein neues visuelles Element, keine Layout-Änderung." Diese Phase erzeugt keine neue UI-Komponente und keine Layout-Änderung; `PublicNoteCard` erhält eine zusätzliche Prop, aber keine neue visuelle Darstellung. Der UI-SPEC-Gate-Grep in `/gsd:plan-phase` reagiert auf das Wort „Frontend" im Ausgangsbefund (False Positive) — die Orchestrator-Entscheidung ist, ohne UI-SPEC.md zu planen, analog zu `--skip-ui`, weil die Roadmap selbst „UI hint: nein" explizit dokumentiert und keine neuen `@/components/ui`-Primitives benötigt werden.

</domain>

<decisions>
## Implementation Decisions

### Autoritative Rollenquelle
- Die Tabelle `role_definitions` bleibt die einzige autoritative Rollenquelle. Keine neue Rollen-Map, kein neuer Fallback-Katalog, keine Label-Rückwärtsauflösung entsteht in dieser Phase — auch nicht als Zwischenlösung.

### HC-01 — `role_code` bis ins Frontend durchreichen
- `role_code` muss vom Repository bis in den TypeScript-Typ durchgereicht werden, für **beide** Notiz-Oberflächen:
  - `repository.PublicReleaseNote` (Release-Detail) — Backend: `backend/internal/repository/release_detail_public_repository.go` (Struct `PublicReleaseNote` bei Zeile 57-67, Scan bei Zeile 489) UND die zweite Query-Implementierung `loadNotes` in `backend/internal/repository/release_detail_public_repository_helpers.go` (Scan bei Zeile 423) — **beide** SQL-Queries selektieren bereits `role_label` über `LEFT JOIN role_definitions rd ON rd.code = cr.name`; `rd.code AS role_code` ergänzen und im `Scan(...)` mitführen.
  - `repository.ProjectMemberNote` (Projekt-Member-Seite) — Backend: `backend/internal/repository/project_member_public_repository.go`, Struct bei Zeile 44-54, Query/Scan in `ListNotes` bei Zeile 238-271 (`LEFT JOIN role_definitions rd ON rd.code = cr.name` bereits vorhanden).
  - JSON-Feldname: `role_code` (snake_case, konsistent mit `role_label`).
  - `shared/contracts/openapi.yaml`: Schema `PublicReleaseNote` (Zeile ~14896-14913) und Schema `ProjectMemberNote` (Zeile ~15152-15163) um `role_code: {type: string}` ergänzen (nicht `required`, da Notizen ohne `role_id` `NULL`/leer liefern können — konsistent mit dem bestehenden `COALESCE(rd.label_de, '')`-Pattern für `role_label`).
  - TypeScript-Typen: `frontend/src/types/releaseDetail.ts` (`PublicReleaseNote`-Interface, Zeile 26-34) und `frontend/src/types/projectMember.ts` (`ProjectMemberNote`-Interface, Zeile 20-29) um `role_code: string` ergänzen.
  - Konsumenten, die die neuen Felder durchreichen müssen: `frontend/src/components/.../ReleaseNotesList.tsx` (Zeile 71, `roleLabel={note.role_label}` → zusätzlich `roleCode={note.role_code}`) und `frontend/src/app/.../ProjectMemberNoteCard.tsx` (Zeile 25, analog).
- `PublicNoteCard` (`frontend/src/components/public/PublicNoteCard.tsx`) bekommt eine **eigene** `roleCode`-Prop (zusätzlich zur bestehenden `roleLabel`-Prop). `roleLabel` bleibt reine Anzeigeinformation (Text im Header-Band / in der Rollen-Variante). `data-role-code` wird aus `roleCode` gesetzt, NICHT mehr aus `roleColorCode(roleLabel)`.
- `ROLE_CODE_BY_LABEL` und die Funktion `roleColorCode` in `frontend/src/lib/roleColors.ts` werden ersatzlos entfernt, **sofern kein anderer Konsument existiert** (vor dem Löschen per Grep verifizieren — Stand der Untersuchung: einziger Konsument ist `PublicNoteCard.tsx:9,76`).
- Ein Backend-Test muss das `role_code`-Feld am **echten Response-Ergebnis** belegen (Repository- oder Handler-Test, kein Quelltext-Substring-Test).
- Ein Frontend-Regressionstest muss belegen, dass die Rollen `fansub_lead`, `founder`, `co_leader`, `techadmin`, `gfxler`, `karaoke_fx`, `editor`, `typesetter` ihren eigenen `data-role-code` erhalten (direkt aus der Prop, nicht aus einer Map) und dass eine Änderung von `label_de` den Wert nicht beeinflusst.

### HC-02 — `useGroupMembersTab.ts` auf Katalogpfad umstellen
- `ROLE_LABELS` (Zeile 44-65) und die exportierte Funktion `roleLabelForCode` (Zeile 67-69) in `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` werden entfernt.
- `roleSummary` (Zeile 283, in `historicalIdentityOptions`) löst Rollen-Labels stattdessen über den bestehenden kataloggetriebenen Pfad `labelForRole(rows, code)` aus `@/lib/roleCatalog` auf — denselben Pfad, den `GroupMembersTab.tsx` (Zeile 170, 239) bereits für `GroupHistRoleDialog`/`GroupMembersHistTable`/`GroupMemberFormModals` verwendet.
- **Verifizierte Konsequenz für die Datenfluss-Verdrahtung:** `labelForRole` benötigt `RoleDefinitionOption[]` (`historyRoleOptions`), die aktuell nur als lokaler State in `GroupMembersTab.tsx` existiert (`useState` + `listGroupHistoryRoleDefinitions(fansubId)`, siehe `mergeHistoricalRoleOptions`). Der Hook `useGroupMembersTab.ts` hat aktuell keinen Zugriff darauf. Empfohlener, aber nicht zwingender Ansatz (Claude's Discretion für die genaue Umsetzung): `historyRoleOptions` als neues Feld in `UseGroupMembersTabOptions` an den Hook übergeben; dazu muss die `historyRoleOptions`-State-Deklaration in `GroupMembersTab.tsx` vor dem `useGroupMembersTab(...)`-Aufruf stehen (aktuell danach). Keine zweite Katalog-Abfrage im Hook selbst einführen — Wiederverwendung des bereits geladenen State ist vorzuziehen.
- `roleLabelForCode` als **Prop-Name** in `GroupMemberFormModals.tsx` und `GroupMembersHistTable.tsx` ist ein anderer Mechanismus (wird bereits von `GroupMembersTab.tsx` mit `labelForRole(historyRoleOptions, code)` befüllt) und bleibt unverändert — nur die gleichnamige, exportierte Funktion aus `useGroupMembersTab.ts` entfällt.
- `useGroupMembersTab.test.ts` testet `roleLabelForCode` direkt (Zeilen 5-14) und muss entsprechend angepasst/entfernt werden, ohne die Teststil-Regel zu verletzen (Verhalten über echten Aufruf von `roleSummary`/`historicalIdentityOptions` mit einem `RoleDefinitionOption[]`-Fixture belegen, nicht die entfernte Funktion direkt testen).

### HC-03 — Ein Go-Quellort für globale App-Rollen
- `backend/internal/models/app_auth.go` bekommt einen neuen exportierten Slice `AppGlobalRoles = []string{AppGlobalRolePlatformAdmin, AppGlobalRoleContentAdmin, AppGlobalRoleUser}` (Reihenfolge exakt wie bisher in allen vier Konsumenten: platform_admin, content_admin, user). Existiert aktuell **nicht** — muss neu angelegt werden (verifiziert: kein Treffer für `AppGlobalRoles` im Repo vor dieser Phase).
- Vier Konsumenten leiten daraus ab (keiner der drei Rollenwerte bleibt als String-Literal stehen):
  - `backend/internal/handlers/admin_capability_handler.go`: `globalAppRoleCodes` (Zeile 39-40, `[]string{"platform_admin", "content_admin", "user"}`) → aus `models.AppGlobalRoles` ableiten. Datei importiert `models` aktuell noch nicht — Import ergänzen.
  - `backend/internal/handlers/admin_users_handler.go`: `validGlobalRoles` (Zeile 91-95, `map[string]struct{}`) → aus `models.AppGlobalRoles` aufbauen (Datei importiert `models` bereits).
  - `backend/internal/repository/admin_users_repository.go`: `AssignableRoles: []string{"platform_admin", "content_admin", "user"}` (Zeile 195, in `GetUserGlobalRoles`) → durch `models.AppGlobalRoles` ersetzen (Datei importiert `models` bereits).
  - `backend/internal/handlers/admin_users_mutations_handler.go`: Fehlertext „Ungültige Rolle. Erlaubte Werte: platform_admin, content_admin, user." an Zeile 30 (`AssignGlobalRole`) und Zeile 71 (`RevokeGlobalRole`) → Wertebereich per `strings.Join(models.AppGlobalRoles, ", ")` aus der Konstante ableiten, nicht mehr als Literal-String. Die deutsche Fehlermeldung bleibt mit korrekten Umlauten erhalten; `"strings"`-Import ergänzen falls noch nicht vorhanden.
- **Keine Laufzeit-Abfrage der globalen App-Rollen aus der Datenbank.** `models.AppGlobalRoles` bleibt eine Compile-Time-Konstante (Go-Slice-Var). Die DB-CHECK-Constraint `chk_app_user_global_roles_role` (`database/migrations/0072_keycloak_app_users_foundation.up.sql:31`, Wertebereich `('platform_admin', 'content_admin', 'user')`, verifiziert) bleibt Persistenz-Invariante und wird **nicht** durch eine Laufzeit-Abfrage ersetzt.
- Ein Source-Contract-Test nach dem Muster der bestehenden `*SourceContract`-Tests in `backend/internal/migrations/` (Beispiel: `TestPhase142HistoricalRoleContextsSourceContract` in `phase142_historical_role_context_test.go`, nutzt Helper `phase136MigrationPath(t, name)` aus `phase136_capability_policy_catalog_test.go:417`) liest `database/migrations/0072_keycloak_app_users_foundation.up.sql` und vergleicht die drei Werte aus der CHECK-Constraint mit `models.AppGlobalRoles` — nicht nur Substring-Präsenz, sondern echte Mengengleichheit (z. B. Constraint-Werte per Regex/String-Split aus der SQL-Zeile extrahieren und `assert.ElementsMatch(t, extractedValues, models.AppGlobalRoles)`). Das ist die ausdrückliche Ausnahme von der Teststil-Regel, weil die Migrationsdatei selbst der geprüfte Gegenstand ist.
- `models.KeycloakManagedGlobalRoles` (`app_auth.go:33-37`, aktuell `[]string{AppGlobalRolePlatformAdmin, AppGlobalRoleContentAdmin, AppGlobalRoleUser}`) soll — wo sinnvoll — aus `AppGlobalRoles` abgeleitet werden (z. B. `var KeycloakManagedGlobalRoles = AppGlobalRoles`), OHNE den bestehenden Doku-Kommentar zu seiner abweichenden Semantik (Keycloak-JIT-Sync-Autorität, `repository.AuthzRepository.SyncGlobalRolesFromKeycloak`, Verteidigung neben der DB-CHECK-Constraint) zu verwischen — der Kommentar darf angepasst werden (z. B. „identisch zu AppGlobalRoles, siehe dort" statt der bisherigen redundanten Werteliste), muss aber weiterhin klarstellen, dass dieser Slice einen eigenen Zweck (IdP-Rollen-Whitelist) hat und nicht einfach ein Alias ist.

### HC-09 — Referenzlose Rollenkonstanten entfernen
- Entfernt werden **ausschließlich** `RoleTranslator`, `RoleTypesetter`, `RoleTechadmin`, `RoleGfxler` aus `backend/internal/permissions/permissions.go` (Zeilen 65-77 bzw. 79-83). Alle anderen Konstanten des Blocks (`RolePlatformAdmin`, `RoleFansubLead`, `RoleProjectLead`, `RoleTimer`, `RoleEditor`, `RoleEncoder`, `RoleRawProvider`, `RoleQualityChecker`, `RoleDesigner`) bleiben unverändert stehen — unabhängig davon, ob sie selbst Produktionsreferenzen haben.
- **Verifizierte Korrektur zum Audit:** Diese vier Konstanten sind NICHT referenzlos — sie werden paketintern (unqualifiziert, ohne `permissions.`-Präfix) in Testfixtures verwendet:
  - `RoleTranslator`: `backend/internal/permissions/permissions_test.go:466`, `effective_rights_test.go:325`, `effective_rights_capability_impact_preview_test.go:183`, `capability_registry_test.go:186`.
  - `RoleTypesetter`: `capability_registry_test.go:197`.
  - `RoleTechadmin`: `capability_registry_test.go:233`.
  - `RoleGfxler`: `capability_registry_test.go:227`.
  Referenzlos sind sie ausschließlich im **Produktionscode** (der `roleMatrix`-Block in `permissions.go:104-205`, der `RoleTranslator`/`RoleTypesetter` ebenfalls verwendet, steht komplett innerhalb eines `/* ... */`-Blockkommentars — „Historical bootstrap grants retained as documentation only" — und ist damit kein kompilierter Code; verifiziert per Lesen der Datei).
  Diese vier Testfixture-Verwendungen werden auf String-Literale (`"translator"`, `"typesetter"`, `"techadmin"`, `"gfxler"`) umgestellt.
  Alle anderen bare-Konstanten-Verwendungen in denselben vier Testdateien (`RoleFansubLead`, `RoleProjectLead`, `RoleTimer`, `RoleEditor`, `RoleEncoder`, `RoleRawProvider`, `RoleQualityChecker`, `RolePlatformAdmin`) bleiben unverändert, da ihre Konstanten nicht entfernt werden.
  Optionaler Begleitfund (nicht zwingend): Der Kommentar direkt über `RoleGfxler`/`RoleTechadmin` in `capability_registry_test.go` (unmittelbar vor Zeile 227, „gfxler/techadmin sind Go-Konstanten...") wird durch die Umstellung auf Literale fachlich ungenau und darf bei Bedarf im selben Edit korrigiert werden — das ist keine eigene Success-Criteria-Pflicht, sondern lokale Konsistenz am bearbeiteten Code.
- Der verbleibende Konstantenblock (`permissions.go:65-77`, `79-83`) bekommt einen Kommentar, der klarstellt: (1) dies ist keine autoritative Rollenliste, (2) der Katalog liegt in `role_definitions`, (3) hier stehen nur Codes, die direkt im Go-Code referenziert werden (z. B. für Vergleiche wie `result.MatchedRole == permissions.RoleFansubLead`). Es entsteht **keine** neue Go-Rollenliste — der Kommentar beschreibt den bestehenden, bewusst unvollständigen Charakter des Blocks.

### Sprachqualität, UI, Dateigröße
- Alle deutschen UI-Strings und Fehlertexte (inkl. der Fehlermeldung in `admin_users_mutations_handler.go`) verwenden korrekte Umlaute (ä ö ü Ä Ö Ü ß), niemals ae/oe/ue.
- Kein neues UI-Element, keine neue `@/components/ui`-Nutzung nötig — reine Datenverdrahtung hinter bestehendem `data-role-code`-Attribut-Seam.
- Produktionsdateien bleiben bei ≤ 450 Zeilen (betroffene Dateien sind aktuell alle deutlich darunter; bei den kleinen Ergänzungen dieser Phase nicht gefährdet — trotzdem nach jeder Änderung prüfen).

### Teststil
- Neue/geänderte Tests belegen Verhalten durch echte Aufrufe (Repository-/Handler-Test mit echtem Ergebnis, Frontend-Test mit echtem Rendering/Props), nicht durch Quelltextsuche.
- Einzige Ausnahme: der HC-03-Source-Contract-Test, der bewusst die Migrationsdatei liest, weil sie selbst der geprüfte Gegenstand ist (Analogie zu den bestehenden `*SourceContract`-Tests in `backend/internal/migrations/`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindliche Vorgabe- und Befund-Quellen
- `.planning/ROADMAP.md` — Abschnitt „### Phase 147: Rollen-Registry — letzte Parallelkataloge auflösen" — enthält den vollständigen, bereits selbst gemessenen Ausgangsbefund (Commit `d8c2c983`, 2026-09-05) mit Datei:Zeile-Angaben und die 8 Success Criteria. Diese Phase-CONTEXT ergänzt/verifiziert den Ausgangsbefund, ersetzt ihn aber nicht — bei Widerspruch gilt der frisch verifizierte Stand in diesem CONTEXT.md.
- `.planning/audits/2026-09-05-hardcoding-drift-audit.md` — Findings HC-01, HC-02, HC-03, HC-09 (Quelle der Grobklassifikation; die Detailkorrektur zu HC-09 und die Line-genaue Verifikation stehen in diesem CONTEXT.md und im ROADMAP-Ausgangsbefund).
- `CLAUDE.md` (Repo-Root) — Abschnitte „Sprachqualität" (Umlaut-Pflicht), „Frontend-UI (globales Design-System)", „Teststil" (Verbot von Quelltext-Substring-Tests, Ausnahme SQL-Migrationen), Modularitäts-Constraint (≤ 450 Zeilen).

### Backend — Muster für den Source-Contract-Test (HC-03)
- `backend/internal/migrations/phase142_historical_role_context_test.go` — kürzestes Beispiel für `TestXxxSourceContract`.
- `backend/internal/migrations/phase136_capability_policy_catalog_test.go` — definiert die wiederverwendeten Helper `phase136MigrationPath(t, name)` (Zeile 417) und `readPhase136Migration` (Zeile 410); neue Tests im selben Package (`migrations_test`) können diese Helper direkt nutzen, ohne sie zu duplizieren.
- `database/migrations/0072_keycloak_app_users_foundation.up.sql` — Zeile 31: `CONSTRAINT chk_app_user_global_roles_role CHECK (role IN ('platform_admin', 'content_admin', 'user'))`.

### Backend — Repositories/Handler für HC-01 und HC-03
- `backend/internal/repository/release_detail_public_repository.go` (Struct `PublicReleaseNote` Zeile 57-67, Cursor-Query Zeile 455-495)
- `backend/internal/repository/release_detail_public_repository_helpers.go` (`loadNotes`, Zeile 391-425 — zweite Query-Implementierung für dieselbe Struct, NICHT vergessen)
- `backend/internal/repository/project_member_public_repository.go` (Struct `ProjectMemberNote` Zeile 44-54, `ListNotes` Zeile 238-273)
- `backend/internal/models/app_auth.go` (Konstanten Zeile 10-12, `KeycloakManagedGlobalRoles` Zeile 33-37)
- `backend/internal/handlers/admin_capability_handler.go` (`globalAppRoleCodes` Zeile 39-40)
- `backend/internal/handlers/admin_users_handler.go` (`validGlobalRoles` Zeile 91-95)
- `backend/internal/repository/admin_users_repository.go` (`AssignableRoles` Zeile 195, in `GetUserGlobalRoles`)
- `backend/internal/handlers/admin_users_mutations_handler.go` (Fehlertext Zeile 30, 71)
- `backend/internal/permissions/permissions.go` (Konstantenblock Zeile 65-83, inerter Kommentarblock `roleMatrix` Zeile 103-205)

### Frontend — Dateien für HC-01 und HC-02
- `frontend/src/lib/roleColors.ts` (komplett — wird nach Migration entfernt, sofern kein weiterer Konsument)
- `frontend/src/components/public/PublicNoteCard.tsx` (Props-Interface Zeile 22-40, `data-role-code` Zeile 76)
- `frontend/src/types/releaseDetail.ts` (`PublicReleaseNote`-Interface Zeile 26-34)
- `frontend/src/types/projectMember.ts` (`ProjectMemberNote`-Interface Zeile 20-29)
- Konsumenten von `PublicNoteCard`: Datei mit `ReleaseNotesList.tsx` (Zeile 71) und `ProjectMemberNoteCard.tsx` (Zeile 25) — exakte Pfade per Grep vor dem Edit lokalisieren (`grep -rn "PublicNoteCard" frontend/src`), da beide unter unterschiedlichen Verzeichnissen liegen können.
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` (`ROLE_LABELS`/`roleLabelForCode` Zeile 41-69, `historicalIdentityOptions` Zeile 275-287)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` (`historyRoleOptions`-State Zeile ~78-100, `useGroupMembersTab(...)`-Aufruf Zeile 76, `labelForRole`-Verwendung Zeile 170, 239)
- `frontend/src/lib/roleCatalog.ts` (`labelForRole`, `getRole`)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` (Zeile 5-14, direkter Test von `roleLabelForCode` — muss angepasst werden)

### Contracts
- `shared/contracts/openapi.yaml` (`PublicReleaseNote`-Schema ~Zeile 14891-14913, `ProjectMemberNote`-Schema ~Zeile 15152-15163)

</canonical_refs>

<specifics>
## Specific Ideas

- HC-01-Nebenbefund (per Verifikation bestätigt, außerhalb des Scopes): Die CSS-Custom-Properties `--role-accent-<code>` und `--role-accent-default`, auf die `PublicNoteCard.module.css` und weitere Module verweisen, sind nirgends im Repo definiert. Die Rollenfarbe ist damit unabhängig von dieser Phase bereits wirkungslos (keine sichtbare Farbänderung erwartbar, auch nach Fix von HC-01). Diese Phase stellt nur den korrekten `data-role-code`-Attributwert her; die fehlende Palette bleibt ein separat zu dokumentierender Befund (nicht beheben).
- Bei der HC-03-Ableitung ist zu beachten, dass `admin_capability_handler.go` aktuell **keinen** `models`-Import hat — dieser muss neu hinzugefügt werden, während `admin_users_handler.go`, `admin_users_repository.go` und `admin_users_mutations_handler.go` den Import bereits besitzen.
- Bei HC-09 ist der `roleMatrix`-Block in `permissions.go` (Zeile 103-205) vollständig auskommentiert (`/* ... */`) und muss nicht angefasst werden — er enthält zwar noch `RoleTranslator`/`RoleTypesetter` als Text, kompiliert aber nicht mit und bricht durch die Konstanten-Entfernung nicht.
- `globalAppRoleLabels` in `admin_capability_handler.go` (deutsche Anzeigenamen der drei globalen Rollen) bleibt unverändert — nur die Code-Liste (`globalAppRoleCodes`) wird aus `models.AppGlobalRoles` abgeleitet, nicht die Label-Map (unterschiedlicher Zweck, kein Bestandteil der Success Criteria).

</specifics>

<deferred>
## Deferred Ideas

- HC-04 (Membership-Baseline), HC-05 (Claim-Status), HC-06 (Visibility/Review-Status), HC-07 (Status-Unions), HC-08 (Asset-Typen), HC-10 — bleiben im Audit dokumentiert, werden hier nicht angefasst.
- Badge-System, Member-Profile-Performance, Carousel — außerhalb des Scopes dieser Phase.
- Fehlende `--role-accent-*`-CSS-Token-Definition (siehe „Specifics" oben) — separater Befund, keine Behebung in dieser Phase.

</deferred>

---

*Phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen*
*Context gathered: 2026-09-05 via Orchestrator-Synthese (inline Nutzervorgabe + Fundstellen-Verifikation)*
