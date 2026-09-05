# Audit: Fachliche Hardcodierungen, Business-Rule-Duplizierungen und Drift-Risiken

**Datum:** 2026-09-05
**Stand:** Commit `164de263`, Milestone v1.4 abgeschlossen (Phase 146)
**Umfang:** Backend (Go), Frontend (TS/React), SQL/Migrations/Seeds, Tests, Config
**Modus:** reine Analyse — keine Bereinigung ausgeführt

**Explizit ausgeklammert (Scope-Vorgabe):** Public-Member-Profile-Performance, SQL-Performance,
Badge-System inkl. Schwellen/Bildgrößen/Karussell/`MemberBadgeChain`, neue Features,
allgemeines UI-Refactoring. Treffer aus diesen Bereichen wurden gesehen, aber nicht bewertet.

---

## 1. Zusammenfassung

**10 relevante Findings.** Verteilung: **P0: 0 · P1: 2 · P2: 6 · P3: 2**

Die Architektur ist deutlich besser als die Ausgangsfrage vermuten lässt. Der 2026-06-17 in
`.planning/notes/capability-registry-design.md` beschriebene Umbau ist **umgesetzt**: die
Rolle→Recht-Matrix ist nicht mehr Go-Code, sondern PostgreSQL-Daten
(`role_definitions` / `action_definitions` / `role_capabilities`), `permissions.go` lädt sie
beim Start in einen fail-closed Cache, und die früher dokumentierten SQL-Bypässe mit
`role IN ('leader','editor','contributor')` sind im heutigen Code nicht mehr auffindbar.

**Kein einziges Finding ist P0.** Die Autorisierung selbst ist datengetrieben und fail-closed:
`validateCapabilityCatalog` und `validateMembershipBaselineRegistryPresence` brechen den Start
ab, wenn Code-Konstanten und Registry auseinanderlaufen. Alle gefundenen Duplikate liegen
neben, nicht in der Autorisierungsentscheidung.

**Der Schwerpunkt der verbleibenden Schuld liegt im Frontend**, nicht im Backend: zwei manuell
gepflegte Rollen-Registries, die **bereits heute nachweislich von `role_definitions` abweichen** —
das ist kein Risiko mehr, sondern eingetretene Drift.

---

## 2. Ist-Architektur: was bereits Single Source of Truth ist

| Domäne | Autoritative Quelle | Konsumenten | Bewertung |
|---|---|---|---|
| Rollen-Katalog | `role_definitions` (code, label_de, contexts[], assignable, sort_order) | `/api/v1/admin/fansub-group-roles`, `RoleCatalogProvider`, `roleCatalog.ts` | sauber |
| Rolle→Recht | `role_capabilities` + `action_definitions` | `permissions.loadedCache`, Rechte-Drawer, Effective-Rights | sauber |
| Action-Codes | `permissions.Action`-Konstanten (Go) ⇄ `action_definitions` (DB) | Startup-Validator gleicht beide ab | bewusst dupliziert, abgesichert |
| Membership-Baseline | `permissions.MembershipBaselineActionCodes` + Pseudo-Rolle `group_member` | Startup-Validator, Mutation-Guards, FE-Drift-Test | abgesichert |
| Effective-Rights-Provenance | Go-Konstanten ⇄ `shared/contracts/*.yaml` ⇄ TS-Union | `phase136_policy_yaml_ts_contract_test.go` | vorbildlich |
| Visibility / Review-Status | Tabellen `visibilities`, `review_statuses` | je eine Go-Validierungsmap | Kopie ohne Test |

`role_definitions` enthält heute **18 Rollen**: `group_member`, `fansub_lead`, `founder`,
`co_leader`, `techadmin`, `gfxler`, `translator`, `editor`, `timer`, `typesetter`, `karaoke_fx`,
`encoder`, `raw_provider`, `quality_checker`, `project_lead`, `designer`, `admin`, `other`.
Diese Zahl ist der Maßstab, an dem die Frontend-Listen unten scheitern.

---

## 3. Findings

### Übersicht

| ID | Prio | Kat. | Business-Regel | Autoritative Quelle | Drift-Status |
|---|---|---|---|---|---|
| HC-01 | **P1** | **D** | Rollen-Label → Rollen-Code (Rollenfarben) | `role_definitions.label_de` | **eingetreten** |
| HC-02 | P2 | E | Rollen-Code → Rollen-Label (Fallback) | `role_definitions.label_de` | **eingetreten** |
| HC-03 | **P1** | **D** | Globale App-Rollen (3 Werte) | DB-CHECK `chk_app_user_global_roles_role` | latent, 6 Stellen |
| HC-04 | P2 | C | Membership-Baseline-Capabilities | `permissions.MembershipBaselineActionCodes` | geschützt |
| HC-05 | P2 | D | „nur verifizierte Claims zählen" | `member_claims.claim_status` | latent, 8+ Stellen |
| HC-06 | P2 | C | Erlaubte Visibility-/Review-Status-Codes | `visibilities` / `review_statuses` | latent, ungetestet |
| HC-07 | P2 | C | Status-Wertebereiche im API-Vertrag | DB-CHECK-Constraints | latent, ungetestet |
| HC-08 | P2 | D | Anime-Asset-Typen / Media-Kategorien | keine eindeutige Quelle | latent, verstreut |
| HC-09 | P3 | E | Go-Rollenkonstanten ohne Nutzung | `role_definitions` | tot |
| HC-10 | P3 | B | `permissions.Action`-Konstanten | Go ⇄ `action_definitions` | abgesichert |

---

### HC-01 — Rollenfarben-Map im Frontend ist von `role_definitions` abgedriftet

| Feld | Inhalt |
|---|---|
| **Priorität** | **P1** |
| **Kategorie** | **D — gefährliche fachliche Doppelhaltung** |
| **Business-Regel** | Zuordnung deutsches Rollen-Label → Rollen-Code, daraus die globale Rollenfarbe (`data-role-code`, CSS-Token `--role-accent-*`) |
| **Autoritative Quelle** | `role_definitions` (`code`, `label_de`), ausgeliefert als `role_label` |
| **Fundstelle** | `frontend/src/lib/roleColors.ts:6-28` (`ROLE_CODE_BY_LABEL`, 12 Einträge) |
| **Konsument** | `PublicNoteCard.tsx:76` → `ReleaseNotesList.tsx`, `ProjectMemberNoteCard.tsx` |
| **Drift-Risiko** | bereits eingetreten |
| **Auswirkung** | UX / Wartbarkeit (keine Security) |
| **Empfehlung** | zentralisieren — Farbe aus dem Server-Katalog statt aus einer Label-Map |
| **Launch-Relevanz** | vor Launch |

**Nachweis.** Das Backend liefert `role_label` als `rd.label_de`
(`release_version_notes_repository.go:300,316,364`). Abgleich der DB-Labels mit der Map:

| Code | `role_definitions.label_de` | Map erwartet | Treffer |
|---|---|---|---|
| `fansub_lead` | Fansub-Leitung | Gruppenleitung | **nein** |
| `editor` | Edit | Editing | **nein** |
| `typesetter` | Typesetting | Typesetting / FX | **nein** |
| `techadmin` | Technik-Admin | Technische Administration | **nein** |
| `gfxler` | GFX | Grafik | **nein** |
| `karaoke_fx`, `founder`, `co_leader`, `admin`, `other`, `group_member` | — | nicht enthalten | **nein** |
| `project_lead`, `translator`, `timer`, `encoder`, `raw_provider`, `quality_checker`, `designer` | — | identisch | ja |

**7 von 18 Rollen** bekommen ihre Farbe; alle übrigen fallen auf `'other'` zurück — darunter
ausgerechnet die Leitungsrollen. Es existiert **kein Test** für diese Datei
(`frontend/src/lib/roleColors.*` enthält nur `roleColors.ts`).

Der Dateikopf dokumentiert die Ursache selbst: die Map wurde aus einem alten Commit
wiederhergestellt, nachdem Phase 136-08 die Laufzeit-Rollenkataloge entfernt hatte, weil
`PublicNoteCard` „hier nur das Label kennt (keinen Rollen-Code, keinen Katalog)". Die Begründung
ist nachvollziehbar, die Konsequenz — ein Label-Rückwärts-Mapping als Ersatz für den Code — ist
strukturell nicht haltbar: Labels sind Anzeigetext und dürfen sich ändern, Codes nicht.

**Zielarchitektur.** Die Karte darf nicht rückwärts vom Label auf den Code schließen müssen.
Zwei Wege, beide ohne neue Registry:

1. **Bevorzugt:** `role_code` durch die Response mitliefern (die Repository-Query selektiert
   `acr.role_code` bereits, es wird nur nicht bis ins DTO durchgereicht) und
   `PublicNoteCard` `roleCode` statt `roleLabel` für `data-role-code` verwenden lassen.
   Die Label→Code-Map entfällt ersatzlos.
2. **Falls das DTO nicht erweitert werden soll:** Farbe aus dem bereits vorhandenen
   `RoleCatalogProvider` (`presentationForRole`) ziehen, der `role_definitions` konsumiert.

Ein Anti-Drift-Test wäre hier nur ein Pflaster: er würde die Drift melden, aber die
strukturell falsche Kopplung an Anzeigetext zementieren.

---

### HC-02 — Zweite Rollen-Label-Map mit Codes aus einer früheren Architektur

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | E — veraltetes Hardcoding (mit D-Anteil) |
| **Business-Regel** | Rollen-Code → deutsches Label (Anzeige-Fallback) |
| **Autoritative Quelle** | `role_definitions.label_de` via `labelForRole(historyRoleOptions, code)` |
| **Fundstelle** | `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts:44-69` (`ROLE_LABELS`, 20 Einträge) |
| **Konsument** | nur noch `useGroupMembersTab.ts:283` (`roleSummary`), als Fallback hinter `role.role_label ??` |
| **Drift-Risiko** | eingetreten, aber wirkungsarm |
| **Auswirkung** | Wartbarkeit; im Fallback-Fall falsche Labels |
| **Empfehlung** | entfernen |
| **Launch-Relevanz** | später |

Die Map enthält fünf Codes, die es in `role_definitions` **nicht gibt** — `typesetting`,
`encoding`, `project_manager`, `leader` und eine abweichende Schreibung von `founder`
(„Gründung" statt „Gründer") — Reste aus der Zeit vor der Registry. Zugleich fehlt `karaoke_fx`.
Die Labels weichen von der DB ab (`fansub_lead` → „Gruppenleitung" statt „Fansub-Leitung",
`editor` → „Editing" statt „Edit", `techadmin` → „Technische Administration" statt „Technik-Admin").

Entschärfend: `GroupMembersTab.tsx:170,239` reicht bereits den **katalog-getriebenen**
`labelForRole(historyRoleOptions, code)` als Prop durch. Die lokale Map wird nur noch an einer
Stelle als zweiter Fallback benutzt. Sie ist damit primär totes Gewicht, das beim nächsten Leser
wie eine gültige Quelle aussieht.

**Zielarchitektur.** `roleSummary` ebenfalls über den Katalog auflösen (die Optionen liegen im
Hook bereits vor), `ROLE_LABELS` und `roleLabelForCode` löschen. Kein Ersatz nötig.

---

### HC-03 — Die drei globalen App-Rollen werden an sechs Stellen unabhängig gepflegt

| Feld | Inhalt |
|---|---|
| **Priorität** | **P1** |
| **Kategorie** | **D — gefährliche fachliche Doppelhaltung** |
| **Business-Regel** | Der globale App-Rollen-Satz ist genau `platform_admin`, `content_admin`, `user` |
| **Autoritative Quelle** | DB-CHECK `chk_app_user_global_roles_role` (Migration `0072_keycloak_app_users_foundation.up.sql`) |
| **Drift-Risiko** | latent, aber garantiert bei der nächsten Änderung |
| **Auswirkung** | fachlich + Wartbarkeit; kein Security-Loch |
| **Empfehlung** | zentralisieren (eine Go-Konstante) + Anti-Drift-Test gegen die Migration |
| **Launch-Relevanz** | vor Launch |

**Fundstellen — sechs voneinander unabhängige Kopien:**

1. `database/migrations/0072_…up.sql` — CHECK-Constraint (autoritativ)
2. `backend/internal/models/app_auth.go:10-12` — drei Einzelkonstanten, aber **kein Satz/Slice**, den ein Konsument importieren könnte
3. `backend/internal/handlers/admin_capability_handler.go:40` — `globalAppRoleCodes` + Label-Map (46-47)
4. `backend/internal/handlers/admin_users_handler.go:92-93` — Set als Literal
5. `backend/internal/repository/admin_users_repository.go:196` — `AssignableRoles` als Literal
6. `backend/internal/handlers/admin_users_mutations_handler.go:30,71` — Wertebereich im Fehlertext

Der Kommentar in `admin_capability_handler.go:37-39` benennt das Problem selbst: „Kanonische
Quelle für diese drei Codes: `admin_users_repository.go` `AssignableRoles` (Zeile 192)" — eine
per Kommentar erklärte, per Copy-Paste umgesetzte Referenz. Kein Import, **kein Anti-Drift-Test**.

Eine vierte globale Rolle zu ergänzen bedeutet heute: Migration + fünf Go-Stellen, von denen
zwei (Set und Fehlertext) beim Übersehen zu stillen Fehlfunktionen führen — der Handler weist
die Rolle ab, obwohl die DB sie erlaubt.

**Zielarchitektur.** Die drei Konstanten existieren bereits (`AppGlobalRolePlatformAdmin`,
`AppGlobalRoleContentAdmin`, `AppGlobalRoleUser`) — es fehlt nur der importierbare Satz in
`models/app_auth.go`:

```go
var AppGlobalRoles = []string{AppGlobalRolePlatformAdmin, AppGlobalRoleContentAdmin, AppGlobalRoleUser}
```

Der Fix ist damit klein: keine neuen Konstanten, nur fünf Literale gegen einen Import tauschen.

Alle fünf Konsumenten leiten daraus ab (Set, Reihenfolge, `AssignableRoles`, Fehlertext per
`strings.Join`). Dazu **ein** Test nach dem etablierten Muster der `*_source_contract`-Tests in
`backend/internal/migrations/`, der die Migration liest und den CHECK-Wertebereich gegen
`AppGlobalRoles` abgleicht. Die Labels bleiben getrennt (Anzeigetext, kein Wertebereich).
Bewusst **keine** DB-Runtime-Abfrage: der Satz ist echte Compile-Time-Konstante mit einer
Migration als Vertrag.

---

### HC-04 — Membership-Baseline: Duplizierung ist vorhanden, aber sauber abgesichert

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | C — Contract-Duplizierung mit Anti-Drift-Schutz |
| **Business-Regel** | Aktive Mitgliedschaft trägt genau drei Rechte: `fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload` |
| **Autoritative Quelle** | `permissions.MembershipBaselineActionCodes` (`permissions.go:420`), gespiegelt in `role_capabilities` für die reservierte Pseudo-Rolle `group_member` |
| **Empfehlung** | Anti-Drift beibehalten; mittelfristig FE-Liste durch ein Server-Flag ersetzen |
| **Launch-Relevanz** | später |

**Beantwortung der gestellten Fragen:**

- *Wo liegt die autoritative Liste?* In Go (`MembershipBaselineActionCodes`), mit der DB als
  Laufzeit-Spiegel. `validateMembershipBaselineRegistryPresence` wird aus `LoadCache` und
  `LoadFansubGroupCatalog` heraus aufgerufen und bricht den **Serverstart** ab, wenn die
  Pseudo-Rolle eines der drei Rechte nicht trägt — fail-closed, ohne den alten Cache zu
  überschreiben. `admin_capability_handler.go:189,270` verhindert zusätzlich, dass die
  Baseline-Rechte entzogen oder fremde Rechte hinzugefügt werden.
- *Existiert dieselbe Liste im Frontend?* **Ja** —
  `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx:11-15` (`membershipBaselineCodes`),
  um die Rechte im Rollen-Detail als gesperrt zu rendern.
- *Gibt es Anti-Drift-Tests?* **Ja, mehrschichtig.** `RoleCapabilityDetail.membershipBaselineDrift.test.ts`
  vergleicht die FE-Menge gegen die Go-Quelle; `repository/membership_baseline_registry_test.go`
  prüft gegen echtes PostgreSQL, dass Migration 0160 exakt die drei Zeilen seedet und sauber
  zurückrollt. Die FE-Liste ist explizit als `membershipBaselineCodesForTest` exportiert und
  im Code als „kein Produktionsverwendungszweck außerhalb dieser Datei" markiert.
- *Könnte das Frontend das stattdessen vom Backend erfahren?* **Ja, und das wäre besser.** Die
  Capability-Response transportiert bereits `role_kind` (`RoleDetailPanel.tsx:30` wertet
  `'reserved_baseline'` aus). Ein analoges Feld **pro Capability-Zeile** — etwa
  `locked: true` mit `locked_reason: "membership_baseline"` — würde die FE-Liste ersatzlos
  überflüssig machen und zugleich künftige reservierte Rechte automatisch abdecken.

Das ist der Musterfall für „Anti-Drift-Test als Übergang" — und im Repo bereits so
protokolliert: der Testkopf hält fest, dass die vom Review vorgeschlagene serverseitige
`protected`-Feld-Ableitung (146-REVIEW.md WR-03) „bewusst aus dem Fix-Pass ausgeklammert"
wurde. Die Absicherung ist heute korrekt und ausreichend, aber sie ist eine Krücke für eine
fehlende Feldinformation im Vertrag. Solange nur
eine reservierte Gruppe existiert, ist der Aufwand einer Vertragserweiterung nicht zwingend —
mit der zweiten reservierten Gruppe kippt die Rechnung.

---

### HC-05 — „Nur verifizierte Claims zählen" als SQL-Literal an mindestens acht Stellen

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | D |
| **Business-Regel** | Nur `member_claims.claim_status = 'verified'` verknüpft App-User und Member-Identität |
| **Autoritative Quelle** | CHECK `chk_member_claims_status` (`pending`, `verified`, `rejected`); im Go-Code **keine Konstante** |
| **Fundstellen** | `handlers/contribution_proposals_me_db.go:27`, `handlers/me_identity_helpers.go:27`, `services/release_metadata_credit_service.go:72`, `services/release_review_adapters.go:63,164`, `services/project_note_credit_service.go:259`, `services/badge_service.go:260` (nur als Fundstelle gezählt, Badge-Logik out of scope), zusätzlich in drei `testsupport/phase*_postgres.go`-Schemas |
| **Drift-Risiko** | ein zusätzlicher Zustand (z.B. `revoked`) müsste in jeder Query einzeln berücksichtigt werden; eine übersehene Stelle behandelt entzogene Claims still als gültig |
| **Auswirkung** | fachlich, mit Datenintegritäts-Charakter |
| **Empfehlung** | Anti-Drift + schrittweise Zentralisierung |
| **Launch-Relevanz** | später (P0 nur, falls ein vierter Claim-Status geplant ist) |

Anders als bei den Rollen gibt es hier **keine** Go-Konstante — der String steht roh in jeder
Query. Das Muster ist überall identisch (`AND claim_status = 'verified'`), die Semantik ist
also konsistent; das Risiko entsteht erst bei einer Erweiterung des Wertebereichs.

**Zielarchitektur.** Konstanten `models.MemberClaimStatusPending/Verified/Rejected` einführen und
in den Queries per Parameter statt Literal verwenden. Für die „gültige Identität"-Regel selbst
existiert mit `me_identity_helpers.go` bereits ein Ansatzpunkt: die wiederholte Unterabfrage
`SELECT member_id FROM member_claims WHERE app_user_id = $1 AND claim_status = 'verified'`
gehört hinter **eine** Repository-Funktion. Kein DB-Katalog nötig — drei Zustände mit
CHECK-Constraint sind eine legitime Compile-Time-Konstante.

---

### HC-06 — Visibility- und Review-Status-Codes: Go-Kopie der DB-Tabellen ohne Test

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | C (ohne den bei C vorausgesetzten Test) |
| **Business-Regel** | Erlaubte `visibility_code`- und `review_status_code`-Werte beim Medien-Upload |
| **Autoritative Quelle** | Tabellen `visibilities` (5 Zeilen) und `review_statuses` (5 Zeilen) |
| **Fundstellen** | `backend/internal/handlers/fansub_media_upload.go:24-40` (je eine Map), konsumiert von `admin_content_release_theme_assets.go:179,183,359,363`, `member_media_upload.go` |
| **Drift-Risiko** | eine Migration, die eine Visibility ergänzt, wird von der API stumm mit 400 abgelehnt |
| **Auswirkung** | fachlich / UX |
| **Empfehlung** | Anti-Drift-Test gegen die Seed-Migration |
| **Launch-Relevanz** | später |

Positiv: es gibt **je genau eine** Go-Map, die alle Handler konsumieren — keine Streuung im
Backend, und die Kommentare nennen die Quell-Migration. Der Ist-Stand stimmt überein
(`public`, `registered`, `fansubber`, `staff`, `private` bzw. `in_review`, `approved`, `rejected`
— die Map deckt die relevanten Review-Status ab). Was fehlt, ist die Absicherung: kein Test
vergleicht die Maps mit dem Seed. Das Muster dafür existiert im Repo bereits mehrfach
(`phase136_capability_policy_catalog_test.go`, `phase137_*_source_contract`-Tests).

Für die Anzeige-Labels (`review_statuses.label_de`) gilt dieselbe Regel wie bei HC-01: Labels
gehören in die DB und ins DTO, nicht in eine zweite Map.

---

### HC-07 — Status-Wertebereiche als TypeScript-Unions ohne Contract-Test

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | C |
| **Business-Regel** | Wertebereiche von App-User-Status, Claim-Status, Invitation-Status, Membership-Status |
| **Autoritative Quelle** | DB-CHECK-Constraints; Go-Konstanten in `models/app_auth.go:6-22` |
| **Fundstellen** | `types/admin-users.ts:18,73,249`, `types/profile.ts:123,347,365,373`, `types/auth.ts:37`, `types/fansub.ts:81,93,359,371,397`, `types/contributions.ts:134`, `lib/api.ts:1514,3692` |
| **Drift-Risiko** | ein neuer Status wird vom FE als Typfehler behandelt oder still ignoriert |
| **Auswirkung** | Wartbarkeit / UX |
| **Empfehlung** | behalten, punktuell absichern |
| **Launch-Relevanz** | später |

Diese Unions sind **legitime API-Verträge** — genau der Fall, den die Aufgabenstellung als
„nicht automatisch als Fehler klassifizieren" beschreibt. Die Werte sind über alle Dateien
konsistent (`'pending' | 'active' | 'disabled'`, `'pending' | 'verified' | 'rejected'`,
`'pending' | 'accepted' | 'cancelled' | 'expired'`), es liegt keine Business-Logik darum herum,
und Phase 136 hat mit `phase136_policy_yaml_ts_contract_test.go` bereits gezeigt, wie ein
Go⇄YAML⇄TS-Abgleich im Repo aussieht.

Empfehlung: **nicht** zentralisieren (kein Codegen-Apparat für vier Enums), sondern dieselben
Unions in den OpenAPI-Vertrag aufnehmen und in die bestehende Parity-Testfamilie einhängen,
sobald einer dieser Wertebereiche das nächste Mal angefasst wird. Die mehrfache Wiederholung
derselben Union über 13 Stellen ist der eigentliche Wartungspunkt — ein exportierter Typalias
je Domäne (`AppUserStatus`, `ClaimStatus`, `InvitationStatus`) würde das ohne Architekturänderung
lösen.

---

### HC-08 — Anime-Asset-Typen ohne eindeutige autoritative Quelle

| Feld | Inhalt |
|---|---|
| **Priorität** | P2 |
| **Kategorie** | D |
| **Business-Regel** | Welche Asset-Typen ein Anime hat (`cover`/`poster`, `banner`, `logo`, `background`, `background_video`, `theme_video`) und wie sie auf Speicherordner und `media_types` abgebildet werden |
| **Autoritative Quelle** | derzeit **keine** — konkurrierend: `uploadAssetTypeAliases`, `ReleaseAssetType`, `media_types` (DB) |
| **Fundstellen** | `handlers/media_upload.go:52-62` (Alias-Map + `mediaTypeForUploadAsset`), `models/release_asset.go:7-12`, `services/anime_create_enrichment.go` (22 Literale), `repository/anime_assets.go` (15), `services/asset_lifecycle_service.go` (5 kanonische Ordner), `handlers/admin_content_anime_assets.go` (5), FE: `createAssetUploadPlan.ts` (7), `animeJellyfinAssetUpload.ts` (5) |
| **Drift-Risiko** | ein neuer Asset-Typ erfordert Änderungen in Alias-Map, Ordner-Provisionierung, Enrichment, Repository-Spalten, Frontend-Upload-Plan und `media_types`-Seed |
| **Auswirkung** | Wartbarkeit; im Fehlerfall verwaiste Dateien |
| **Empfehlung** | zunächst nur dokumentieren und die Alias-Map als Eingangsnormalisierung festschreiben |
| **Launch-Relevanz** | später |

Dies ist die verstreuteste Domäne im Audit, zugleich die mit dem geringsten akuten Risiko: die
Menge der Asset-Typen ist seit langem stabil, und die feste Anzahl kanonischer Ordner
(`cover`, `banner`, `logo`, `background`, `background_video`) ist bewusst gesetzt und im
Lifecycle-Service getestet. Eine Dynamisierung wäre hier explizit falsch — die Typen sind
Compile-Time-Wissen mit Frontend-UI daran.

Sinnvoll ist stattdessen: die Kopplung Alias→kanonischer Typ→`media_types.code` an **einer**
Stelle festhalten (heute verteilt auf `uploadAssetTypeAliases` und `mediaTypeForUploadAsset` im
selben File — das ist bereits fast erreicht) und die übrigen Stellen darauf verweisen lassen.
Ein Test, der die kanonische Ordnerliste des Lifecycle-Service gegen die Alias-Map abgleicht,
wäre billig und würde die reale Bruchstelle abdecken.

---

### HC-09 — Ungenutzte Go-Rollenkonstanten aus der Vor-Registry-Zeit

| Feld | Inhalt |
|---|---|
| **Priorität** | P3 |
| **Kategorie** | E |
| **Fundstelle** | `backend/internal/permissions/permissions.go:66-83` |
| **Empfehlung** | ungenutzte entfernen, genutzte behalten |

Produktionsnutzungen (`permissions.<Konstante>`, ohne Tests):

| Konstante | Prod | Test |
|---|---|---|
| `RoleFansubLead` | 4 | 36 |
| `RoleProjectLead` | 2 | 4 |
| `RoleEncoder` | 0 | 4 |
| `RoleRawProvider`, `RoleQualityChecker`, `RoleDesigner` | 0 | je 2 |
| `RoleEditor`, `RoleTimer` | 0 | je 1 |
| `RoleTranslator`, `RoleTypesetter`, `RoleTechadmin`, `RoleGfxler` | **0** | **0** |

Vier Konstanten haben null Referenzen im gesamten Repo. Sie suggerieren einem Leser, der
Rollensatz sei in Go definiert — genau die Fehlannahme, die zu HC-01 und HC-02 geführt hat.
Zugleich fehlen `karaoke_fx`, `founder`, `co_leader`, `admin`, `other`, was den Eindruck einer
Rollenliste zusätzlich falsch macht.

Empfehlung: die vier referenzlosen Konstanten löschen, den verbleibenden Block mit einem
kurzen Kommentar versehen („keine Rollenliste — nur die im Go-Code referenzierten Codes;
autoritativer Katalog: `role_definitions`"). Die Test-Nutzungen sind Fixtures und können auf
Literale umgestellt oder mitgezogen werden.

---

### HC-10 — `permissions.Action`-Konstanten: bewusste, abgesicherte Duplizierung

| Feld | Inhalt |
|---|---|
| **Priorität** | P3 |
| **Kategorie** | B / C |
| **Empfehlung** | **behalten** |

38 Action-Konstanten in `permissions.go:21-64` spiegeln `action_definitions`. Das ist genau der
Trade-off, den die Design-Notiz vorgesehen hat: Compile-Sicherheit im Go-Code gegen
Datengetriebenheit in der Registry, abgesichert durch `validateCapabilityCatalog`, das beim
Start jede bekannte Action gegen die geladene Matrix prüft (Ausnahme: `standaloneActions`).
Der Kommentar bei `allKnownActions` dokumentiert die Falle korrekt (eine dort fehlende Action
wird von `Can()` still als `no_grant` abgelehnt). Kein Handlungsbedarf.

---

## 4. „Wie viele Stellen muss ich bei einer neuen Rolle anfassen?"

**Neue Gruppenrolle (Regelfall):**

| Schritt | Notwendig? |
|---|---|
| Migration: `role_definitions` + `role_capabilities` | **ja — das ist die autoritative Quelle** |
| Go-Code | nein |
| Rollen-Katalog-API, Rechte-Drawer, Rollen-Admin | nein (katalog-getrieben) |
| `roleColors.ts` (HC-01) | **ja, sonst keine Farbe** |
| `useGroupMembersTab.ts` (HC-02) | faktisch nein (Fallback), formal ja |

**Ergebnis: 1 autoritative Stelle + 1 Frontend-Stelle.** Nach Behebung von HC-01/HC-02: **genau
eine Stelle** — das gesetzte Ziel. Das ist ein sehr gutes Ergebnis; die Registry-Phasen haben
geliefert.

**Neue globale App-Rolle (Sonderfall):** **6 Stellen** (HC-03) — hier liegt die eigentliche Schuld.

**Neue Capability:** Migration (`action_definitions` + `role_capabilities`) + Go-Konstante +
`allKnownActions` + Aufrufstelle. Die Go-Seite ist bewusst und durch den Startup-Validator
abgesichert (HC-10) — kein Handlungsbedarf.

---

## 5. Anti-Drift-Testlandschaft

**Bereits geschützt:**

| Doppelhaltung | Absicherung |
|---|---|
| Action-Konstanten ⇄ `role_capabilities` | `validateCapabilityCatalog` (Startup, fail-closed) |
| Baseline-Rechte ⇄ Pseudo-Rolle `group_member` | `validateMembershipBaselineRegistryPresence` (Startup) |
| Baseline-Liste Go ⇄ Frontend | `RoleCapabilityDetail.membershipBaselineDrift.test.ts` |
| Baseline-Seed ⇄ echte DB | `repository/membership_baseline_registry_test.go` |
| Provenance Go ⇄ YAML ⇄ TS | `phase136_policy_yaml_ts_contract_test.go`, `phase136_contract_parity_test.go` |
| Öffentliche Rollen-Labels kommen aus `role_definitions` (6 Repositories) | `repository/phase136_role_definition_label_authority_test.go` |
| Migrations-Inhalte | `migrations/phase13x_*_source_contract_test.go` (Familie) |
| Public-Profile-Felder ⇄ OpenAPI | `public_member_profile_contract_test.go` |

**Ungeschützt:**

| Doppelhaltung | Finding | Empfohlener Test |
|---|---|---|
| Rollenfarben-Map ⇄ `role_definitions` | HC-01 | **keiner** — Kopplung strukturell auflösen |
| Globale App-Rollen ⇄ CHECK-Constraint | HC-03 | Source-Contract-Test gegen Migration 0072 |
| Visibility/Review-Status-Maps ⇄ Seeds | HC-06 | Source-Contract-Test gegen Seed-Migration |
| FE-Status-Unions ⇄ DB-CHECKs | HC-07 | in bestehende Parity-Familie einhängen |
| Asset-Typ-Aliase ⇄ kanonische Ordner | HC-08 | Go-Unit-Test, beide Listen im selben Paket |

**Anti-Drift-Test nur als Übergang** (langfristig Single Source of Truth besser):
HC-04 (Baseline-Liste im FE → Server-Flag `locked`) und, falls man HC-01 entgegen der Empfehlung
per Test absichern wollte, auch dort.

---

## 6. Vorgeschlagene GSD-Umsetzung

Milestone v1.4 ist abgeschlossen; die Roadmap wird additiv erweitert. Vorschlag: **eine** Phase
für die beiden P1-Findings plus den billigen E-Anteil, optional eine zweite für die P2-Gruppe.

### Phase 147 — Rollen-Registry: letzte Frontend-Parallelkataloge auflösen (P1)

*Ziel:* Eine neue Rolle erfordert genau eine Änderung — die Migration.

1. **147-01** `role_code` bis ins Notizen-DTO durchreichen (Backend + Contract), `PublicNoteCard`
   auf `roleCode` umstellen, `roleColors.ts`-Map löschen. Test: Farbe für alle 18 Codes aus
   `role_definitions` auflösbar. *(HC-01)*
2. **147-02** `roleSummary` in `useGroupMembersTab.ts` katalog-getrieben auflösen,
   `ROLE_LABELS`/`roleLabelForCode` entfernen. *(HC-02)*
3. **147-03** `AppGlobalRoles` in `models/app_auth.go` einführen, fünf Kopien darauf umstellen,
   Source-Contract-Test gegen Migration 0072. *(HC-03)*
4. **147-04** Vier referenzlose Rollenkonstanten entfernen, Restblock kommentieren. *(HC-09)*

Risiko gering, alle vier Pläne sind lokal testbar; 147-01 braucht eine Contract-Änderung und
damit einen kurzen Live-UAT auf `:3000`.

### Phase 148 — Enum- und Claim-Verträge absichern (P2, optional / später)

1. **148-01** `MemberClaimStatus`-Konstanten + gemeinsame Repository-Funktion für die
   „verifizierte Identität"-Unterabfrage. *(HC-05)*
2. **148-02** Source-Contract-Tests für `validVisibilityCodes` / `validReviewStatusCodes`. *(HC-06)*
3. **148-03** Status-Typaliase im Frontend zusammenführen, in die Parity-Testfamilie einhängen. *(HC-07)*
4. **148-04** Asset-Typ-Alias ⇄ kanonische Ordnerliste per Test koppeln. *(HC-08)*

### Nicht einplanen

- **HC-04** (Baseline-Liste im FE): erst wenn eine zweite reservierte Capability-Gruppe entsteht.
  Bis dahin ist der bestehende Drift-Test die angemessene Antwort.
- **HC-10** (Action-Konstanten): bewusst so gebaut, funktioniert.

---

## 7. Beobachtungen außerhalb des Auftrags

Nur notiert, nicht untersucht:

- `frontend/src/components/profile/memberBadgeLabels.ts` und `badgeArtwork.ts` enthalten
  Rollen-Codes (8 bzw. 3 Treffer). Badge-System ist per Scope ausgeschlossen — die Stellen
  gehören aber vermutlich in dieselbe Betrachtung wie HC-01/HC-02, sobald das Badge-System
  wieder aufgemacht wird.
- `types/contributions.ts:134` führt für Proposals `'pending' | 'in_review' | 'approved' | 'rejected'`,
  während `review_statuses` `in_review, approved, rejected, archived, removed` kennt. Ob das
  zwei verschiedene Domänen sind oder eine unvollständige Spiegelung, wurde nicht geklärt.
