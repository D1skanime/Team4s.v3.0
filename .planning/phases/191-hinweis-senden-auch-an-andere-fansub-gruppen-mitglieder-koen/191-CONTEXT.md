# Phase 191: „Hinweis senden“ auch an andere Fansub-Gruppen — CONTEXT

**Quelle des Auftrags:** `.planning/todos/pending/2026-10-19-hinweis-senden-fremde-gruppen.md`
(Nutzerbefund 19.10.2026, alle sechs offenen Fragen darin bereits entschieden). Additiv an die
bestehende ROADMAP angehängt (nach Phase 190), kein neues Milestone, kein Reset. **Stand
2026-10-23 (zweite Entscheidungsrunde): OF-01 ist beantwortet (D-07), zusätzlich gilt ab dieser
Phase die neue, projektweite Doku-Pflicht aus CLAUDE.md/AGENTS.md (D-08).** Dieses Dokument bleibt
bis hierhin reine Ist-Analyse + Entscheidungen — **keine Produktcode-Änderung** in diesem Schritt.
Nächster Schritt ist `/gsd:plan-phase 191`.

## Problem (laut Nutzerbefund)

Beim „Hinweis senden" (Beitragsvorschlag) kann ein Mitglied heute nur die **eigene(n) Gruppe(n)**
auswählen. In der Praxis arbeiten Leute aber auch bei anderen Gruppen mit (Beispiel des Nutzers:
Timer bei NewSubs, war aber auch Timer bei RedHeartFansub und möchte dort einen Beitrag angezeigt
bekommen). Ziel: Hinweise auch an fremde Gruppen senden können — als reine Information, ohne
automatische Mitgliedschaft.

## Nutzerentscheidungen (final gesetzt — nicht neu verhandeln)

### D-01 — Freigabe je nach Zielrolle
Geht es um die **Leader-Rolle** (Rollencode `fansub_lead`), bestätigt der **Plattform-Admin**. Bei
**allen anderen Rollen** bestätigt der **Leader der Zielgruppe** (nicht die eigene Gruppe des
Absenders). Siehe Ist-Zustand 2 und OF-01 für die technische Einordnung, welche Hinweisart davon
überhaupt betroffen sein kann.

### D-02 — Gruppenauswahl: alle Gruppen über die bestehende Gruppensuche, gemeinsamer Hook
**Alle Gruppen**, über die bereits gebaute Gruppensuche (Name + Alias). Bestehenden Code/UI
wiederverwenden, nicht neu bauen:
- Suchlogik heute: `frontend/src/app/admin/episode-versions/[versionId]/edit/
  useEpisodeVersionEditor.ts:155-187`, `getFansubList({ q, page: 1, per_page: 10 })` mit
  180-ms-Debounce, bereits gewählte Gruppen ausgefiltert.
- UI heute: `frontend/src/app/admin/episode-versions/[versionId]/edit/FansubGroupsSection.tsx`
  (Release-Editor, Phase 187 „Partnergruppe hinzufügen").
- Als gemeinsamen Hook herausziehen (z. B. `useFansubGroupSearch`) und im Release-Editor UND im
  Hinweis-Formular nutzen — keine Kopie. Auswahl kennzeichnen: „Eigene Gruppe" vs. „Andere Gruppe".

### D-03 — Keine automatische Mitgliedschaft
Der Hinweis ist **nur eine Information**. Der Leader der Zielgruppe (bzw. bei Leader-Rolle der
Plattform-Admin) sieht den Hinweis und entscheidet selbst, ob und wie er die Person über die
**bestehenden** Wege hinzufügt (Mitglied hinzufügen, Projekt-/Release-Crew zuweisen). Keine neuen
Zuweisungs-Flows.

### D-04 — Spam-Schutz
(1) **Keine Doppel-Hinweise** — pro Person + Zielgruppe + Thema (gleiches Release/Projekt bzw.
Mitgliedschafts-Anfrage) höchstens EIN offener Hinweis, serverseitig erzwungen, sonst Meldung „Du
hast dazu bereits einen offenen Hinweis." (2) **Tageslimit ca. 10** Hinweise pro Person und Tag,
bestehende Rate-Limit-Middleware auf Wiederverwendbarkeit prüfen statt neu bauen. (3) **Ablehnen/
Schließen mit einem Klick** durch den Leader (bzw. Plattform-Admin), optional mit kurzer
Begründung; erledigte Hinweise tauchen nicht wieder auf. **Erst bei echtem Missbrauch** (NICHT in
dieser Phase bauen): Stummschalten einer Person für eine Gruppe. Bewusst nicht: Captchas oder
Wartezeiten.

### D-05 — Keine Punkte/Badges
Der Hinweis selbst bringt keine Punkte und keine Badges. Punkte entstehen erst, wenn der Leader die
Person über die bestehenden Wege einer Rolle/einem Projekt zuweist, nach den dort geltenden Regeln.

### D-06 — Kein eigenes Recht, zwei Hinweisarten
Nur eine Anfrage/ein Hinweis an die Fansub-Gruppe, kein eigenes Recht. (a) **Korrektur-Hinweis** —
„bei diesem Projekt/Release ist etwas falsch" (z. B. Rolle fehlt oder falsch zugeordnet).
(b) **Anfrage für Mitgliedschaft** in der Gruppe.

## Verbindliche Vorgaben für alle späteren Schritte (Planung + Ausführung)

- **Bestehende Komponenten/Flows/Permission-Infrastruktur wiederverwenden** — keine Parallel-UI,
  keine Kopien (insbesondere die Gruppensuche aus D-02, der Confirm/Reject-Flow aus Ist-Zustand 2,
  die Rate-Limit-Middleware aus Ist-Zustand 4).
- **Keine hartcodierten Rollennamen** — Rollencodes/Capability-Konstanten verwenden, wie im
  bestehenden Code (`permissions.RoleFansubLead`, `permissions.RoleProjectLead` usw.), nicht
  String-Literale „Leader" o. ä.
- **Globale UI-Primitives** aus `@/components/ui` und Design-Tokens.
- **Logik-Tests statt Render-/Klick-Simulation** für neue/geänderte Tests.
- **Dateien ≤ 450 Zeilen** — wer eine Produktdatei über dem Limit inhaltlich anfasst, teilt sie im
  selben Auftrag auf. `ProposalForm.tsx` (350) und `useEpisodeVersionEditor.ts` (420) sind bereits
  nahe am Limit — die Hook-Extraktion aus D-02 entschärft `useEpisodeVersionEditor.ts` zusätzlich.
- **Deutsche Texte mit echten Umlauten.**
- **Live-UAT am Ende mit echten Konten** — Testdaten nur über echte Anlegepfade, vorher selbst
  geprüft (keine direkten INSERTs für Demo-Hinweise).
- **Doku-Pflicht im selben Auftrag (D-08):** fachliche Code-Kommentare statt Phasen-Verweise,
  `docs/BACKEND_ARCHITEKTUR.md`/`docs/FRONTEND_ARCHITEKTUR.md`/`shared/contracts/` nachziehen,
  neue gemeinsame Bausteine (Gruppensuch-Hook) dort aufführen, historische Begründung in
  `DECISIONS.md`. Jeder Plan enthält einen Doku-Task/Doku-Akzeptanzkriterien.
- Die Quelle-Todo-Datei (`.planning/todos/pending/2026-10-19-hinweis-senden-fremde-gruppen.md`)
  wird nach Phasenabschluss nach `completed` verschoben, nicht gelöscht.

---

## Ist-Zustand 1 — Heutiger Proposal-Flow (Datenmodell)

**Tabelle `anime_contributions`** (`database/migrations/0086_anime_contributions.up.sql:4-23`,
später ergänzt um `member_id` in 0105, `release_version_id` in 0091, `review_note` in 0089):
`fansub_group_id` (FK, RESTRICT), `anime_id` (FK, RESTRICT), `fansub_group_member_id` (FK auf
`hist_fansub_group_members`, nullable seit quick-260707-kut), `status` (`CHECK IN ('draft',
'proposed','confirmed','disputed','hidden')`), `note`, `started_year`/`ended_year`,
`is_public_on_anime_page`, `is_public_on_member_profile`, `confirmed_by`/`confirmed_at`,
`created_by`/`created_at`. Rollen liegen separat n:m in `anime_contribution_roles` (`role_code` →
FK auf `role_definitions.code`).

**`CreateProposal`** (`backend/internal/handlers/contribution_proposals_me_handler.go:140-187`,
Insert in `backend/internal/repository/anime_contributions_proposal_repository.go:46-149`): Status
wird fix auf `'proposed'` gesetzt. Der Member wird über `member_claims` aufgelöst
(`ResolveVerifiedMemberID`, Zeile 160) — es gibt **keine** direkte `app_users.member_id`-Spalte,
die App-User↔Member-Verknüpfung läuft ausschließlich über `member_claims.claim_status = 'verified'`.

**Serverseitiger Eigengruppen-Zwang — die entscheidende Stelle:**
```go
// contribution_proposals_me_handler.go:170-187
// D-03/T-260707kut-02: Ownership-Check — der eingeloggte Member muss Mitglied der
// Ziel-Gruppe sein (hist UNION app) ...
belongs, err := h.membershipChecker.MemberBelongsToFansub(c.Request.Context(), memberID, req.FansubGroupID)
...
if !belongs {
    c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
    return
}
```
`MemberBelongsToFansub` (`backend/internal/repository/anime_contributions_repository.go:55-70`)
prüft per UNION-Query gegen `hist_fansub_group_members` UND `fansub_group_members`. **Genau dieser
Check ist die Stelle, die für „Hinweis an fremde Gruppe" gelockert/umgangen werden muss** — die
Phase darf diesen Guard nicht ersatzlos entfernen (er schützt weiterhin den regulären
Eigengruppen-Beitragsvorschlag), sondern braucht einen neuen, parallelen Pfad ohne diesen Zwang.

**Wer sieht die Auswahl heute:** `ListMemberships` (`contribution_proposals_me_handler.go:335-358`,
`GET /api/v1/me/memberships`) liefert dem Frontend nur die eigenen Mitgliedschaften für die
Dropdown-Auswahl in `ChoiceSelect` (`ProposalForm.steps.tsx:40-113`) — ein generisches
Custom-Dropdown über eine statisch vorgeladene, kleine Liste (kein Suchfeld, kein Debounce, da
bisher nur wenige eigene Gruppen zur Auswahl stehen). Für „fremde Gruppe auswählen" reicht dieses
Muster nicht (potenziell alle Gruppen) — hier zieht das Suchmuster aus D-02 ein. `ChoiceSelect`
selbst (nur die optische Dropdown-Darstellung) ist ggf. für die Ergebnisliste weiterverwendbar, die
Datenbeschaffung muss ersetzt werden.

## Ist-Zustand 2 — Review/Entscheid-System für den Leader

Zwei bestehende, unabhängige Entscheid-Pfade existieren parallel:

- **Gruppen-gescopter Pfad (direkt wiederverwendbar):**
  `backend/internal/handlers/contribution_review_handler.go:79-246` (`GET/POST
  /api/v1/admin/fansubs/:id/contribution-proposals(/:cid/confirm|reject)`), Autorisierung über
  `CanForFansubGroup(actor, permissions.ActionFansubGroupMembersManage, fansubID)` — deckt laut
  Code-Kommentar Fansub-Lead UND Plattform-Admin ab. Frontend:
  `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` (254 Zeilen), rendert
  nur bei `capabilities.can_manage_members`, lädt via `listGroupProposals(fansubId)`. Diese Query
  ist bereits auf die **Ziel-Gruppe** gescoped (nicht auf die Gruppe des Einreichers) — strukturell
  exakt das, was für „Hinweis an fremde Gruppe" gebraucht wird.
- **Generischer Review-Service-Pfad:** Capability `review.contribution.decide`
  (`backend/internal/permissions/permissions_types.go:55`) läuft über `review_service.go` mit
  Snapshot/Revision-Modell und unterstützt **Delegation** der Entscheidungsbefugnis an andere
  Mitglieder (`admin_review_delegation_handler.go:23`). Wird für normale Beitrags-Bestätigungen
  heute genutzt, nicht für den gruppen-gescopten Fremd-Hinweis-Fall.

**Plattform-weites Präzedenzmuster für den Admin-Fall:** `/admin/claims`
(`frontend/src/app/admin/claims/page.tsx`, `ClaimsClient.tsx`, 369 Zeilen) ist eine **platform-weite,
`PlatformAdminGate`-geschützte Liste** (`listClaims`-API) quer über alle Gruppen — genau das
Gegenstück zum gruppen-gescopten `ContributionsReviewSection`. Für den Leader-Rolle-Fall aus D-01
(Plattform-Admin entscheidet) ist dies das direkt übertragbare Vorbild: eine neue, schlanke
platform-weite Liste „Eingehende Hinweise (Leader-Rolle)" im selben Muster, statt eines neuen
Freiform-Admin-Flows. Es existiert aktuell **kein** generischer „eingehende Hinweise"-Einstieg auf
der Admin-Startseite (`frontend/src/app/admin/page.tsx`) — ein neuer Navigationskarten-Eintrag wäre
in der Planung zu ergänzen, analog zu „Benutzer & Rechte"/„Fansubs".

**Empfehlung für die Planung:** Den gruppen-gescopten Pfad (`CanForFansubGroup` +
`ActionFansubGroupMembersManage`, Muster `ContributionsReviewSection`) als Basis für die
Leader-Entscheidung übernehmen (kein Delegationsbedarf laut Vorgabe — der Hinweis ist reine
Information, keine Review-Pflicht mit Vier-Augen-Prinzip); für den Plattform-Admin-Fall das
`/admin/claims`-Muster (platform-weite `PlatformAdminGate`-Liste) übertragen.

## Ist-Zustand 3 — Mitgliedschaftsanfrage vs. bestehender Claim-Flow (Phase 81/135)

`member_claims` (`database/migrations/0081_historical_members_identity.up.sql:7-25`):
`member_id` (FK `members`), `app_user_id`, `claim_status IN ('pending','verified','rejected')`.
Zweck: Ein App-User behauptet, eine **bestehende historische `members`-Identität** (Altdaten-
Mitwirkender) zu sein (`SubmitClaim`, `member_claims_handler.go:63-90`); verifiziert wird vom Leader
der Gruppe, zu der der historische Eintrag gehört (`VerifyClaim`/`RejectClaim`, Zeilen 132-181, via
`ActionFansubGroupHistoricalMembersLink`).

**Abgrenzung:** `member_claims` bindet sich an eine vorhandene historische Identität **in einer
bestimmten Gruppe** — kein generischer „Ich möchte Mitglied bei Gruppe X werden ohne historischen
Anker"-Antrag. Eine Mitgliedschaftsanfrage aus Phase 191 ist strukturell eigenständig (neues,
einfacheres Antragsmodell), keine Erweiterung von `member_claims`. Überschneidung besteht nur
konzeptionell (beide enden in „Leader bestätigt Gruppenzugehörigkeit"), nicht in der Datenstruktur.

**DB-Zahlen (Live, `team4s_v2`):** `anime_contributions` gesamt 112 (ausschließlich Status
`confirmed`, aktuell keine offenen `proposed`-Einträge); `fansub_groups` gesamt 17; `members`
gesamt 13; `member_claims` mit `claim_status='verified'` gesamt 7.

## Ist-Zustand 4 — Rate-Limit-Middleware

Einzige vorhandene Rate-Limit-Middleware: `backend/internal/middleware/comment_rate_limit.go`.
Mechanik: Redis-Fixed-Window per Lua-Skript (`INCR` + `PEXPIRE`, Zeilen 28-34), Key-Schema
`comment_rate_limit:<key>:<windowStartUnix>` (Zeile 96), generisch über
`NewCommentRateLimiter(client, limit, window)` (Zeile 56) konfigurierbar. Aktuell an `c.ClientIP()`
als Key gebunden (`CommentCreateRateLimitMiddleware`, Zeile 118), instanziiert in `main.go:119`
mit `limit=5, window=1 Minute`, angewendet in `main.go:422`.

**Wiederverwendbar für „max. 10 Hinweise/Person/Tag":** Dieselbe Struktur, neuer Key
(`identity.AppUserID` statt `c.ClientIP()`) und eine zweite, dedizierte Instanz
(`NewCommentRateLimiter(redisClient, 10, 24*time.Hour)`) — kein Neubau des Mechanismus nötig, nur
neue Instanziierung mit anderem Key/Limit/Window. **Zu beachten:** Bei Redis-Ausfall läuft die
Middleware heute bewusst fail-open (Degraded-Modus, Zeilen 120-133) — dieses Verhalten würde ohne
Gegenmaßnahme auch für das Tageslimit gelten; in der Planung festhalten, ob das für den
Spam-Schutz-Zweck akzeptiert wird (Empfehlung: ja, Konsistenz mit dem bestehenden Verhalten, da die
Doppel-Hinweis-Sperre aus D-04(1) als DB-Constraint ohnehin unabhängig von Redis greift).

## Ist-Zustand 5 — Gruppensuche (gemeinsamer Hook, D-02)

**`useEpisodeVersionEditor.ts:155-187`** (420 Zeilen gesamt, nahe am 450-Zeilen-Limit): Debounced
Suche (180 ms, Zeile 165/181), State `groupQuery`/`setGroupQuery` (Zeile 63),
`groupResults`/`setGroupResults` (Zeile 64), `isSearching`, `searchMessage`. Ruft `getFansubList({
q: query, page: 1, per_page: 10 })` (Zeile 169, aus `frontend/src/lib/api/fansubs-core.ts:205`),
filtert bereits gewählte Gruppen heraus (Zeile 172-174), Meldung „Keine passende Gruppe oder kein
passender Alias gefunden." bei leerem Ergebnis (Zeile 175). `addGroup`/`removeGroup` ab Zeile 246.

**`FansubGroupsSection.tsx`** (106 Zeilen): reine Präsentationskomponente, erhält alle States/
Handler als Props, rendert `Input` (UI-Primitive) + Liste von Ergebnis-`Button`s + Chip-Liste
gewählter Gruppen.

**Geplante Extraktion (für die Planung, nicht in diesem Schritt umzusetzen):** Ein Hook
`useFansubGroupSearch({ excludeIds }) → { query, setQuery, results, isSearching, message,
addGroup, removeGroup }`, der intern `getFansubList` aus `fansubs-core.ts:205` nutzt. Aktuell ist
die Logik inline in `useEpisodeVersionEditor.ts` — die Extraktion entschärft gleichzeitig dessen
Nähe zum 450-Zeilen-Limit. `ProposalForm.tsx`/`.steps.tsx` haben aktuell eine andere, einfachere
Auswahl-Logik (`ChoiceSelect` über die statische `ownGroups`-Liste ohne Server-Suche) — diese muss
für fremde Gruppen durch den neuen Hook ersetzt werden, nicht parallel weiterbestehen.

## Ist-Zustand 6 — Dateilängen

| Datei | Zeilen | >450? |
|---|---|---|
| `frontend/src/components/contributions/ProposalForm.tsx` | 350 | nein (nahe) |
| `frontend/src/components/contributions/ProposalForm.steps.tsx` | 324 | nein |
| `frontend/src/components/contributions/MyProposalsSection.tsx` | 201 | nein |
| `backend/internal/handlers/contribution_proposals_me_handler.go` | 358 | nein |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | 420 | nein (nahe) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/FansubGroupsSection.tsx` | 106 | nein |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | 251 | nein |
| `backend/internal/repository/anime_contributions_proposal_member_repository.go` | 258 | nein |
| `backend/internal/handlers/contribution_review_handler.go` | 246 | nein |
| `backend/internal/handlers/member_claims_handler.go` | 284 | nein |
| `frontend/src/app/admin/claims/ClaimsClient.tsx` | 369 | nein |

Keine der untersuchten Dateien liegt aktuell über 450 Zeilen. `ProposalForm.tsx` (350) und
`useEpisodeVersionEditor.ts` (420) sind am nächsten am Limit — die Planung muss beim Hinzufügen der
Fremd-Gruppen-Auswahl bzw. der Hook-Extraktion gegenprüfen, ob das Limit gerissen wird, und dann im
selben Auftrag splitten (reiner Umbau-Commit zuerst, danach die inhaltliche Änderung).

## Ist-Zustand 7 — Rollencodes (Live-DB, für D-01 relevant)

`role_definitions` (18 Zeilen, Live-Abfrage): Rollencode `fansub_lead` (Label „Fansub-Leitung") hat
`contexts = {group_history, fansub_group}` — **nicht** `anime_contribution`. Rollencode
`project_lead` (Label „Projektleitung") hat `contexts = {anime_contribution, group_history,
fansub_group}` — ist also sowohl eine Projekt-/Beitragsrolle als auch eine Gruppenrolle, und ein
eigenständiger Code, verschieden von `fansub_lead`.

**Konsequenz:** Ein Korrektur-Hinweis (Hinweisart a) bezieht sich auf `anime_contribution_roles`
(Kontext `anime_contribution`) — `fansub_lead` kann dort schon datenmodell-bedingt nicht als
betroffene Rolle vorkommen, `project_lead` dagegen schon. D-01 („Leader-Rolle → Plattform-Admin")
kann sich damit in der Praxis nur auf die Rolle `fansub_lead` beziehen, und diese kann nur über eine
**Mitgliedschaftsanfrage** (Hinweisart b) mit gewünschter Rolle `fansub_lead` ins Spiel kommen —
siehe OF-01.

---

## Nutzerentscheidungen — zweite Runde (2026-10-23, beantwortet OF-01 + neue Projektregel, final — nicht neu verhandeln)

### D-07 — Rollenfeld bei der Mitgliedschaftsanfrage, Plattform-Admin-Freigabe nur bei `fansub_lead` (ersetzt OF-01)
**Beantwortet wie empfohlen.** Die Mitgliedschaftsanfrage (Hinweisart b) bekommt ein **optionales**
Rollenfeld — Dropdown aus den `fansub_group`-Kontext-Rollen (`fansub_lead`, `co_leader`, `founder`,
`techadmin`, `gfxler`, `timer` usw.), **Default „keine bestimmte Rolle"**. Die Plattform-Admin-
Freigabe nach D-01 greift **ausschließlich**, wenn ausdrücklich der Rollencode `fansub_lead`
gewählt wird; bei jeder anderen Auswahl (inkl. `co_leader`) UND bei „keine bestimmte Rolle"
entscheidet ganz normal der Leader der Zielgruppe. Korrektur-Hinweise (Hinweisart a) sind von D-01
damit praktisch nie betroffen — `fansub_lead` kann dort schon datenmodell-bedingt nicht als Rolle
vorkommen (siehe Ist-Zustand 7), auch `project_lead`-Korrekturen bleiben beim Leader der
Zielgruppe.

### D-08 — Doku-Pflicht im selben Auftrag (neue projektweite Regel, CLAUDE.md/AGENTS.md Commit `21ce1f1c3`, Abschnitt „Dokumentation wächst mit dem Code")
Ab dieser Phase gilt verbindlich für den Ausführungsplan: Jede Plan-Aufgabe, die Code baut oder
Verhalten ändert, zieht **im selben Auftrag** nach:
- **Fachliche Code-Kommentare** an der verantwortlichen Klasse/Funktion/Komponente — was sie
  fachlich tut, welche Regeln gelten, warum. Reine Planungsverweise wie „Phase 191 D-03" sind als
  Erklärung VERBOTEN (dürfen höchstens zusätzlich zu einer fachlichen Erklärung stehen). Bestehende
  Phasen-Verweis-Kommentare in Dateien, die diese Phase ohnehin anfasst, werden beim Anfassen
  fachlich umformuliert (kein eigener Aufräum-Task).
- **`docs/BACKEND_ARCHITEKTUR.md`** bei neuen/geänderten Backend-Schichten, Datenflüssen,
  Rechte-/Auth-Verträgen, Routen (z. B. neuer Hinweis-Endpunkt, gelockerter Ownership-Pfad,
  Plattform-Admin-Routing für `fansub_lead`).
- **`docs/FRONTEND_ARCHITEKTUR.md`** bei neuen/geänderten zentralen Bausteinen — insbesondere der
  aus D-02 extrahierte gemeinsame Gruppensuch-Hook (`useFansubGroupSearch` o. ä.) muss dort als
  wiederverwendbarer Baustein aufgeführt werden, damit er künftig gefunden statt neu gebaut wird.
- **`shared/contracts/`** bei neuen/geänderten API-Verträgen (neuer Hinweis-Endpunkt, neue
  Request-/Response-Felder wie das optionale Rollenfeld aus D-07).
- **`DECISIONS.md`** für die historischen Entscheidungen dieser Phase (D-01 bis D-08), nicht in
  Code-Kommentaren.
- Der Ausführungsplan braucht dafür einen expliziten Doku-Task bzw. Doku-Akzeptanzkriterien pro
  Plan; der Plan-Checker prüft das mit.

---

## Nutzerentscheidungen — dritte Runde (2026-10-23, Live-UAT-Nachbesserung, final — nicht neu verhandeln)

**Quelle:** Live-UAT von Plan 191-10/Task 2 durch den Nutzer (mit mir gemeinsam) auf dem
Live-Dev-Stack. Ergebnis: **nicht bestanden** — ein echter Daten-/Permission-Bug (D-11) und drei
vom Nutzer freigegebene Konzept-/UI-Korrekturen (D-09, D-12, D-13/D-14/D-15). Die betroffenen
Pläne 191-01 bis 191-09 sind bereits ausgeführt und committet; diese Runde erzeugt
**zusätzliche Nachbesserungspläne** (191-11 ff.), keine Neuplanung der bereits gebauten Teile.

### D-09 — „Anfrage für Mitgliedschaft" vollständig gestrichen (ersetzt Teile von D-06/D-07)
Die zweite Hinweisart entfällt **komplett**: kein `hint_type`-Unterschied mehr (nur noch
Korrektur-Hinweis existiert), kein optionales Rollenfeld, keine `fansub_lead`-Sonderfreigabe durch
den Plattform-Admin für eine Mitgliedschaftsanfrage. **Begründung (Nutzer):** „Hinweis senden" ist
ohnehin nur erreichbar, wer ein Mitgliedsprofil UND eine Projekt-Zuordnung hat
(`isEligibleForContributions`, `frontend/src/app/me/contributions/page.tsx:39-41`) — die
Fansub-Szene ist für Neuzugänge ohne Projekt kaum noch relevant, „ich war früher dabei" läuft über
den **bereits bestehenden** Weg der historischen Nennungen (Mitglieds-Claim, Phase 81/135,
`member_claims`) und darf nicht doppelt gebaut werden. **Schema (append-only Migration 0188):**
Spalten `requested_role_code` und `hint_type` aus `fansub_group_hints` entfernen (nur noch ein
Hinweistyp = die Spalte trägt keine Information mehr), `related_anime_id` wird NOT NULL (jeder
verbleibende Hinweis ist ein Korrektur-Hinweis mit Projektbezug), `chk_fansub_group_hints_type`/
`chk_fansub_group_hints_role_scope`/`chk_fansub_group_hints_anime_scope` entfallen oder vereinfachen
sich entsprechend, `idx_fansub_group_hints_role_status` entfällt, der Unique-Index
`uq_fansub_group_hints_open_topic` verkürzt sich auf `(sender_app_user_id,
target_fansub_group_id, COALESCE(related_anime_id, -1))`. Tabelle ist zum Zeitpunkt dieser
Entscheidung leer (geprüft) — keine Datenmigration nötig. **Vollständig zu entfernen:**
`HintTypeToggle`, `Step0HintType`, `StepRoleOptional`, `ListForFansubLeadRole` (Repository),
die rollenbezogene Validierung in `fansub_group_hints_me_handler.go`, die
`RequestedRoleCode`-Filterung in `fansub_group_hints_review_handler.go`, alle
membership_request-/fansub_lead-spezifischen Felder in `shared/contracts/fansub-group-hints.yaml`
und den Frontend-Typen/API-Client. **NICHT entfernen, sondern umgewidmet — siehe D-11:** der
Plattform-Admin-Listen-Mechanismus (`admin_fansub_group_hints_handler.go`,
`frontend/src/app/admin/fansub-group-hints/`, Nav-Eintrag) bleibt bestehen, wechselt aber sein
Filterkriterium.

### D-10 — Bugfix: Projektliste für fremde Gruppe aus öffentlicher Quelle statt Admin-Endpunkt
**Bug (live reproduziert):** Schritt 2 „Gruppe & Projekt" lädt die Projektliste bei JEDER Auswahl
über `getAdminFansubAnime` (`GET /api/v1/admin/fansubs/:id/anime`,
`ProposalForm.tsx:125`) — ein gruppen-gescopter Endpunkt, der `ActionReleaseView`-Mitgliedschaft in
der Zielgruppe voraussetzt. Bei „Andere Gruppe" schlägt das mit 403 fehl → keine Projekte wählbar,
exakt der im Live-UAT beobachtete Fehler. **Fix:** Bei `groupScope === 'foreign'` die Projektliste
stattdessen aus der **öffentlichen** Quelle laden, die auch `/fansubs/<slug>` nutzt
(`getPublicFansubProfileBySlug` → `GET /api/v1/fansub-slugs/:slug/public-profile` →
`FansubRepository.GetPublicProfileBySlug`, `backend/internal/repository/
fansub_repository_public_profile.go:24` — kein Permission-Check, nur öffentlich sichtbare
Projekte). Bei `groupScope === 'own'` bleibt der bestehende Admin-Endpunkt-Aufruf unverändert
(Mitgliedschaft ist dort ja vorhanden, kein Bug).

### D-11 — Routing bei fehlender Gruppenleitung: Admin-Liste wiederverwenden statt neu bauen
Ein Korrektur-Hinweis an eine fremde Gruppe geht an den **Leader der Zielgruppe**, unverändert über
die bestehende `CanForFansubGroup(actor, permissions.ActionFansubGroupMembersManage, fansubID)`-
Prüfung (`fansub_group_hints_review_handler.go`) — **keine neue Berechtigungslogik**, dieser Check
lässt Plattform-Admins für JEDE Gruppe ohnehin bereits zu. Hat die Zielgruppe **aktuell keine
Person mit der Rolle `fansub_lead`** (Normalfall bei aufgelösten Gruppen) — ermittelt über eine
neue, schmale Repository-Methode nach dem Muster von `loadGuardState`'s `active_lead_count`
(`backend/internal/repository/fansub_group_app_members_repository.go:921-934`, Query gegen
`fansub_group_member_roles` mit `role = 'fansub_lead'`, über die bestehende
`permissions.RoleFansubLead`-Konstante, **kein String-Literal**) —, erscheint der Hinweis **nicht**
in einer (nicht existierenden) Leader-Liste, sondern in der bereits gebauten, jetzt **umbenannten**
Plattform-Admin-Liste `/admin/fansub-group-hints` (vormals für den gestrichenen
`fansub_lead`-Mitgliedschaftsfall gebaut, D-01/D-07 alt — jetzt mit geändertem Filterkriterium:
„Zielgruppe hat keine aktive Leitung" statt „Rollenwunsch = fansub_lead"). Nav-Label ändert sich von
„Hinweise (Leitung)" auf „Hinweise ohne Leitung" (oder vergleichbar, finale Wortwahl via UI-SPEC-
Nachtrag). Die bestehende `fansub_group_hints_decide.go`-Hilfsfunktion (geteilter Confirm/Reject,
D-03/D-05) bleibt unverändert die einzige Entscheidungs-Implementierung für beide Listen.

### D-12 — Kontext-Einstieg „Fehler melden" auf öffentlicher Projekt- und Release-Seite
Auf der öffentlichen Projektseite (`/fansubs/<slug>/fansubprojekt/<anime>`,
`frontend/src/app/anime/[id]/group/[groupId]/page.tsx`) und der öffentlichen Release-Seite
(`.../releases/[releaseVersionId]/page.tsx`) erscheint ein **dezenter** „Fehler melden"-Link/Knopf
für angemeldete Mitglieder mit Mitgliedsprofil UND Projekt-Zuordnung (dieselbe Prüfung wie
`isEligibleForContributions`, `frontend/src/app/me/contributions/page.tsx:39-41` — als
wiederverwendbare Funktion/Hook extrahieren statt lokal zu duplizieren), der **dasselbe**
`ProposalForm` öffnet mit Hinweisart=Korrektur (die einzig verbleibende Art, D-09), Zielgruppe und
Projekt (bzw. Release) **vorausgewählt**. Für nicht angemeldete Nutzer oder Nutzer ohne
Mitgliedsprofil/Projekt-Zuordnung: Knopf **ausblenden** (kein Fehlertext für normale Besucher,
unkritischer Umsetzungsentscheid, Details in der Planung). Der bestehende „Hinweis senden"-Knopf
auf `/me/contributions` bleibt unverändert zusätzlich bestehen — kein Ersatz, zweiter
Einstiegspunkt.

### D-13 — Gruppenname im Formular nur einmal anzeigen
Schritt 2 „Gruppe & Projekt" zeigt bei „Andere Gruppe" den gewählten Gruppennamen aktuell
**dreifach**: Suchergebnis-Zeile (Name + Slug, `ProposalForm.steps.tsx:211-212`), „Ausgewählt:
{name}"-Zeile (`:217`), und die `selectionBreadcrumb`-Pille „{name} · Andere Gruppe" (`:248-261`).
**Fix:** Name nur einmal prominent zeigen — die separate „Ausgewählt: {name}"-Zeile entfällt
komplett (die Breadcrumb-Pille trägt dieselbe Information bereits), der Slug im Suchergebnis wird
höchstens dezent/sekundär dargestellt, nicht als zweite gleichwertige Zeile.

### D-14 — Suchergebnis-Element farblich an das helle Formular-Muster angleichen
Das Suchergebnis-Element in Schritt 2 ist aktuell ein dunkler `Button variant="secondary"`
(`.groupSearchItem`, `contributions.module.css:668-687`) mit zusätzlich dunkel eingefärbtem Text
(`strong`/`span`-Farben `:679-687`) — dunkler Text auf dunklem Button-Hintergrund, schlecht lesbar
und nicht im Team4s-Hell-Muster. **Fix:** `.groupSearchItem` analog zum bereits bestehenden, hellen
Muster der Gruppensuche im Release-Editor angleichen
(`frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css:279-295`
— setzt explizit `background: #ffffff`, `border`, dunkle Schrift auf hellem Grund). Design-Tokens
statt eigener Hex-Werte verwenden, wo das Zielmuster das zulässt.

### D-15 — Phasen-/D-Verweis-Kommentare in Phase-191-Code fachlich umformulieren (D-08-Nachzug)
Die Ist-Analyse hat konkrete Fundstellen mit reinen Phasen-/Entscheidungsverweisen ohne begleitende
fachliche Erklärung identifiziert (u. a. `ProposalForm.extraSteps.tsx:13,31`,
`ProposalForm.useSubmit.ts:111`, `fansub_group_hints_me_handler.go:128`, sowie mehrere
`describe()`-Testbeschreibungen mit bloßen D-Tags). **Alle** diese Stellen UND jede weitere, die
beim Umsetzen von D-09 bis D-14 ohnehin angefasste Datei betrifft, werden fachlich umformuliert
(WAS die Regel inhaltlich ist, nicht nur ihr Bezeichner) — konsistent mit D-08/CLAUDE.md. Kein
separater Rundgang durch unveränderte Dateien.

### D-16 — Pflicht-Vorabprüfung vor dem nächsten Live-Checkpoint
Vor dem nächsten blockierenden Live-Checkpoint führt der ausführende Agent **selbst** einen
echten Ablauf über die API (mit einem Konto, das Mitgliedsprofil UND Projekt-Zuordnung hat, z. B.
Mitglied von New-Subs mit Buddy-Complex-Rolle) bis zum erfolgreichen Absenden eines
Korrektur-Hinweises an eine **fremde** Gruppe durch — nicht nur Unit-Tests. Geprüft wird: der
Hinweis erscheint korrekt bei der Zielgruppen-Leitung (`ueber@team4s.de`, Strawhat Subs) bzw. — für
eine Zielgruppe ohne aktive Leitung — in `/admin/fansub-group-hints`. Die exakt genutzten Konten
und der Ablauf werden im Checkpoint-Bericht an den Nutzer wörtlich genannt.

---

## Wiederverwendungsinventar (Zusammenfassung für die Planung)

- `backend/internal/repository/anime_contributions_repository.go:55-70` (`MemberBelongsToFansub`)
  — Muster für die neue, gelockerte Ownership-Logik (nicht ersatzlos entfernen, neuer Pfad daneben).
- `backend/internal/handlers/contribution_review_handler.go` (ganze Datei) +
  `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` — Confirm/Reject-Flow
  bereits auf Ziel-`fansub_group_id` gescoped, direkt wiederverwendbar für die Leader-Entscheidung.
- `frontend/src/app/admin/claims/` (`page.tsx`, `ClaimsClient.tsx`) — Vorbild für eine
  platform-weite, `PlatformAdminGate`-geschützte Liste, übertragbar auf den Plattform-Admin-Fall
  aus D-01.
- `backend/internal/middleware/comment_rate_limit.go` (insb. `NewCommentRateLimiter`/`Allow`,
  Zeile 56-112) — generisches Redis-Fixed-Window, nur Key (AppUserID statt IP) und Limit/Window
  ändern für das Tageslimit aus D-04.
- `frontend/src/lib/api/fansubs-core.ts:205` (`getFansubList`) — bestehende Such-API, Basis für den
  neuen `useFansubGroupSearch`-Hook aus D-02.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts:155-187` +
  `FansubGroupsSection.tsx` — Referenzimplementierung für die Debounced-Server-Suche, Vorlage für
  die Hook-Extraktion.
- `backend/internal/permissions/permissions_types.go:68-69` (`RoleFansubLead`, `RoleProjectLead`)
  — vorhandene Konstanten statt Rollennamen-Literale in neuem Code.

## Nächster Schritt

Alle Fragen sind beantwortet (D-01 bis D-16), Umfang ist final. **Stand 2026-10-23 (dritte
Runde):** Pläne 191-01 bis 191-09 sind ausgeführt; Plan 191-10 Task 1 (DECISIONS.md/Todo-Archivierung/
Regressionsgate) ist ausgeführt, Task 2 (Live-Checkpoint) ist **nicht bestanden** — D-09 bis D-16
oben sind die freigegebene Nachbesserung. Nächster Schritt: zusätzliche Nachbesserungspläne
(191-11 ff.) für D-09 bis D-15 erstellen, Plan-Checker, Ausführung, dann erneut der Live-Checkpoint
aus Plan 191-10 Task 2 (D-16 beachten).

---

## Nutzerentscheidungen — vierte Runde (2026-10-23, zweiter Live-UAT-Durchlauf, final — nicht neu verhandeln)

**Quelle:** Zweiter Live-UAT-Durchlauf durch den Nutzer (Konto `timer@team4s.de`) nach Ausführung
der Pläne 191-11 bis 191-19/Task 1+2. Ergebnis: **wieder nicht bestanden** — fünf reale Bugs plus
ein Kommentar-Nachzug. Punkt 5 der Rückmeldung korrigiert zudem einen Fehler in meinem eigenen
Checkpoint-Bericht (ich hatte Bloody-Shadow/Gruppe 24 nicht unter den geprüften leitungslosen
Gruppen — per echtem Admin-API-Call jetzt nachträglich bestätigt: Hinweis-ID 3 erscheint korrekt in
`/admin/fansub-group-hints`, D-11 funktioniert bereits richtig). **Echte Live-Testdaten aus beiden
UAT-Durchläufen (`fansub_group_hints`-Zeilen ID 1, 2, 3) bleiben unverändert stehen — nicht
löschen, der Nutzer verwendet sie zur Abnahme.**

### D-17 — Erfolgsansicht muss sichtbar bleiben (Bug, beide Einstiege)
`ProposalForm.tsx` selbst ist korrekt (zeigt die Erfolgsansicht via `submittedSummary`-State), aber
beide Aufrufer entfernen das Formular, bevor der Nutzer sie sieht: `ReportHintEntryPoint.tsx:116`s
`onSuccess={() => setIsOpen(false)}` unmounted `ProposalForm` sofort; `MyProposalsSection.tsx`s
`handleFormSuccess` löst über `onReload()` einen Seiten-`isLoading`-Zustand aus
(`frontend/src/app/me/contributions/page.tsx`), der die ganze Section inkl. offenem Formular durch
einen Lade-Screen ersetzt. **Fix:** `onSuccess` darf in keinem der beiden Aufrufer ein
Schließen/Unmounten/Reload auslösen — die Erfolgsansicht bleibt stehen, bis der Nutzer aktiv
„Fertig" klickt (= `onClose`). Reload/Schließen wird an `onClose` gekoppelt, nicht an `onSuccess`.
Logik-Test UND Live-Nachprüfung Pflicht (D-22).

### D-18 — Fremd-Hinweise erscheinen beim Absender unter „Eingereichte Hinweise"
Ein Hinweis an eine fremde Gruppe (`fansub_group_hints`) ist für den Absender heute nirgends
sichtbar. **Fix:** Neuer Endpunkt `GET /api/v1/me/fansub-group-hints` (Repository-Methode
`ListBySender`, analog zum bestehenden `ListByTargetGroup`-Muster in
`fansub_group_hints_repository.go:213-237`), Contract-Ergänzung in
`shared/contracts/fansub-group-hints.yaml`. Frontend: `/me/contributions` lädt diese Liste
zusätzlich und zeigt sie unter „Eingereichte Hinweise" mit Zielgruppe, Projekt, Status
(offen/bestätigt/abgelehnt) und Ablehnungsgrund (falls vorhanden); sie zählt in die Kopfzeilen-
Anzahl „(n)" mit hinein (`MyProposalsSection.tsx:74`, `total` muss beide Quellen summieren). Der
veraltete Leertext „…für ein Projekt einer Gruppe ein, in der du Mitglied bist."
(`MyProposalsSection.tsx:174`) wird angepasst, da Hinweise jetzt auch an fremde Gruppen gehen
(exakter Wortlaut in der Planung/UI-SPEC-Nachtrag final).

### D-19 — 90-Tage-Text nur beim Weg zur eigenen Gruppe
Der Text „Keine Reaktion nach 90 Tagen: Vorschlag kann selbst öffentlich geschaltet werden."
(`ProposalForm.steps.tsx:378`, gesteuert über die hart auf `true` gesetzte Prop
`showYearAndInfoPanel` in `ProposalForm.tsx:437`) gilt nur für den bestehenden
Eigengruppen-Weg (`anime_contributions`-Mechanismus) und ist bei fremden Gruppen fachlich falsch
(es gibt dort keinen 90-Tage-Automatismus). **Fix:** `showYearAndInfoPanel={groupScope === 'own'}`.
Bei `groupScope === 'foreign'` wird der Panel-Bereich durch einen zutreffenden Informationssatz
ersetzt (nicht nur ausgeblendet) — Inhalt: wer den Hinweis entscheidet (Leitung der Zielgruppe bzw.
Plattform-Admin, falls die Gruppe keine aktive Leitung hat, D-11) und dass nichts automatisch
passiert (D-03). Exakter Wortlaut wird im UI-SPEC-Nachtrag festgelegt.

### D-20 — Zeitraum (Von/Bis-Jahr) bei fremden Gruppen nicht verlieren
`buildHintSubmitPayload` (`ProposalForm.useSubmit.ts:73-82`) liest `startedYear`/`endedYear` aus
`SubmitTarget` nie — die Angabe geht bei `groupScope === 'foreign'` komplett verloren, da
`fansub_group_hints` kein Zeitraum-Feld hat. **Fix:** analog zum bestehenden Rollen-Klartext-Muster
(„Rolle: {label}", Zeile 75) wird ein `yearContext` vor die eigentliche Notiz gestellt: beide Jahre
gesetzt → „Zeitraum: {von}–{bis}"; nur `von` gesetzt → „Zeitraum: ab {von}"; nur `bis` gesetzt →
„Zeitraum: bis {bis}"; keines gesetzt → kein Zeitraum-Text (keine leere „Zeitraum:"-Zeile).

### D-21 — Kommentar-Nachzug, zweite Runde (D-15 fortgesetzt)
`backend/cmd/server/main.go:647-649` und `:670-673` beschreiben noch das durch D-09 gestrichene
Mitgliedschaftsanfrage-/`fansub_lead`-Konzept bzw. eine durch D-09 entfallene
`histGroupMemberRolesRepo`-Wiederverwendung — beide Kommentare werden auf den tatsächlichen,
aktuellen D-09/D-11-Stand umgeschrieben. `ProposalForm.useSubmit.ts:28` und `ProposalForm.tsx:162`
behalten ihre fachliche Erklärung, aber „D-10 (Live-UAT-Bugfix)" bzw. „live reproduziert" wird
nicht mehr als alleinige Begründung vorangestellt — die fachliche Regel selbst (zwei
unterschiedliche Datenquellen je Mitgliedschaftsstatus) steht im Vordergrund, der Bugfix-Rahmen
kann als Zusatz stehen bleiben, nicht als einzige Erklärung.

### D-22 — Pflicht-Vorabprüfung, verschärft (ersetzt/ergänzt D-16)
Jeder der obigen Punkte wird vor dem nächsten Live-Checkpoint über ECHTE Wege geprüft (echte
API-Aufrufe mit passendem Konto, wo möglich der echte UI-Ablauf) — **vollständig, nicht
stichprobenhaft.** Lehre aus dieser Runde: Eine unvollständige Prüfung (nur 5 von mehreren
leitungslosen Gruppen abgefragt, ohne die tatsächlich vom Nutzer getestete Gruppe 24 einzuschließen)
führte zu einer falschen Aussage im letzten Checkpoint-Bericht. Vor jeder Behauptung im nächsten
Checkpoint-Bericht: die konkret betroffene Entität (Gruppe/Konto/Hinweis-ID) direkt und vollständig
gegen die echte DB/API prüfen, nicht gegen eine Stichprobe. Bestehende Live-Testdaten
(`fansub_group_hints` ID 1, 2, 3) bleiben unverändert erhalten.
