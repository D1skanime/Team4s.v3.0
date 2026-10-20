# Phase 189: Bugfix-Bündel — Research

**Researched:** 2026-10-20
**Domain:** Go/Gin backend repository & permission-layer bugfixes + Next.js App Router frontend data/link fixes, in an existing brownfield codebase
**Confidence:** HIGH (all findings below are code-grounded via direct file reads and grep inventories on the live repo, not training-data guesses)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-12 — final, not up for renegotiation)

- **D-01** — Scope: exactly these four work items (coop-partner, projektnotizen-recht,
  gruppen-merge-entfernung, loesch-sperre), additiv an die ROADMAP angehaengt, kein neues
  Milestone.
- **D-02** — Coop-Partner = nur Gruppen mit mindestens einem gemeinsamen Release (beide in
  `release_version_groups` derselben `release_version` dieses Animes). Eigene Backend-Liste
  (`coop_groups`); `other_groups` bleibt unveraendert. Jede Coop-Gruppe klickbar zur Projektseite
  der Partnergruppe.
- **D-03** — Projektnotizen-Loesungsrichtung (Umstellung auf `anime_fansub_project.notes.write` +
  `CanForAnimeProject`, analog Phase 188 Plan 05) war vorgegeben; Merge-Loesungsrichtung wurde in
  der zweiten Runde durch D-11 ersetzt (Entfernen statt Guard).
- **D-04** — `coop_groups` wird NUR im Cursor-Endpunkt (`GetGroupReleasesCursor`) ergaenzt. Der
  Offset-Endpunkt (`GetGroupReleases`) bleibt unveraendert.
- **D-05** — Die Kennzahl "Coop-Partner" im Kopfbereich bleibt, zeigt aber nur echte Coop-Partner
  und nur deren Namen (keine "gemeinsam X von Y"-Angabe, keine Logos/AvatarStack). Jeder Name
  klickbar zur Projektseite der Partnergruppe. 1 Partner -> Name als Link (bestehende
  `singleCoopPartner`-Darstellung wiederverwenden, nur Link-Ziel aendern). 2 Partner -> "A · B".
  Ab 3 Partnern -> "A · B +N" mit bestehender aufklappbarer Liste. Ohne Coop-Partner: Kennzahl
  ausblenden.
- **D-06** — "Weitere Gruppen zu diesem Anime" erscheint NICHT im Kopfbereich (Kollision mit der
  Projekt-Navigation). Stattdessen im bestehenden Abschnitt "Mehr entdecken", im dort
  vorhandenen Linkstil. Die Chip-Komponente aus `releases/page.tsx` wird NICHT visuell
  uebernommen — nur Datenlogik und Link-Aufbau (gemeinsamer Helper fuer die Projektseiten-URL,
  z. B. aus `@/lib/fansubProjectRoutes`). Ohne weitere Gruppen: Zeile ausblenden.
- **D-07** — NEU in Scope: next/image-Absturz auf der Release-Liste (`releases/page.tsx:326`,
  `group.fansub.logo_url`) ueber die zentrale Allowlist beheben
  (`frontend/src/lib/images/publicImagePatterns.mjs` bzw. die `ResponsiveImage`-Vorpruefung) —
  NICHT lokal umgehen. Zusaetzlich pruefen, ob dieselbe Logo-URL-Form auch an anderen Stellen
  (Coop-Partner/"Mehr entdecken"/Gruppenseite) denselben Absturz ausloest.
- **D-08** — Separate NEUE Capability fuer das Projektnotizen-Schreibrecht (projektbezogen ueber
  `?anime_id=` + `CanForAnimeProject`, analog `can_edit_project_timeline`). `can_edit_notes` und
  damit die Sichtbarkeit des Notizen-Tabs bleiben UNVERAENDERT.
- **D-09** — Der reale Verlust-Fall (member 5, New-Subs, nur founder/encoder ohne Projektrolle,
  verliert Schreibrecht) wird akzeptiert — keine kompensierende Rollenvergabe vorab.
- **D-10** — `anime_fansub_project.notes.write` wird NICHT zusaetzlich an `co_leader`/`founder`
  vergeben.
- **D-11** — Fansub-Gruppen-Merge-Funktion wird KOMPLETT ENTFERNT statt mit einem Guard
  abgesichert (ersetzt die urspruengliche Guard-Absicht). Umfang: Frontend-Seite, Einstiegs-
  Links/Buttons, API-Client-Funktionen, Backend-Route/Handler/Repository, Contract-Eintraege und
  zugehoerige Tests. Vorgehen: zuerst per `grep` alle Verwendungen vollstaendig auflisten;
  Funktionen/Dateien, die noch fuer andere Zwecke gebraucht werden, bleiben unveraendert. Eine
  evtl. vorhandene Rechte-Action fuer den Merge wird per append-only Migration entfernt oder
  bewusst als deprecated stehengelassen (Variante muss im Plan begruendet werden) — ODER, falls
  research zeigt, dass gar keine Action existiert, ist dieser Schritt entsprechend zu
  dokumentieren und zu entfallen. Das Todo
  `.planning/todos/pending/2026-10-19-fansub-gruppen-merge-ungeschuetzter-pfad.md` wird nach
  Phasenabschluss nach `completed` verschoben (nicht vorher, nicht geloescht).
- **D-12** — NEU in Scope: Loesch-Sperre fuer Fansub-Gruppen. `DeleteGroup` darf nur loeschen,
  wenn nichts Echtes mehr an der Gruppe haengt (vollstaendige Liste wird aus den tatsaechlichen
  FKs abgeleitet und im Plan begruendet, was als "echt" zaehlt; Aliase/reine
  Verknuepfungstabellen/leere Crew-Snapshot-Zeilen zaehlen NICHT). Andernfalls serverseitig 409
  mit deutscher Meldung, die auflistet, was noch dranhaengt (Anzahl je Art), unter
  Wiederverwendung bestehender UI/Dialoge. Die Abhaengigkeitszaehlung wird nach dem Muster des
  Phase-187-Guards (`release_version_group_guard.go`) gebaut bzw. dieser erweitert — keine
  Parallel-Logik. Die Sperre gilt AUCH FUER PLATTFORM-ADMINS.

### Verbindliche Vorgaben fuer alle spaeteren Schritte (Planung + Ausfuehrung)

- Bestehende Komponenten/Permission-Infrastruktur/Guards wiederverwenden — keine Parallel-Logik,
  keine hartcodierten Rollennamen in Handler/Frontend, keine seitenspezifischen
  Sonderloesungen.
- `@/components/ui`-Primitives, deutsche UI-Texte mit echten Umlauten.
- Produktverhalten nie aendern, nur um Tests gruen zu machen. Tests pruefen Logik direkt (Backend
  gegen echte Postgres-Fixture), keine Render-/Klick-Simulation.
- Dateien <= 450 Zeilen — wer eine Produktdatei ueber dem Limit inhaltlich anfasst, teilt sie im
  selben Auftrag auf (reiner Umbau-Commit zuerst, danach die inhaltliche Aenderung).
- Testdaten fuer Live-UAT nur ueber echte Anlegepfade bzw. vollstaendig wie ein
  Bestandsdatensatz, vorher selbst per curl/SQL pruefen; echte Bestandsfaelle bevorzugen
  (z. B. `/anime/2/group/26`).
- Todo-Dateien unter `.planning/todos/pending/` sind echte Nutzerauftraege — nicht loeschen,
  nach Abschluss nach `completed` verschieben.

### Claude's Discretion

Not explicitly separated into its own section in 189-CONTEXT.md — every open question the user
was asked (coop-partner link format, separate-vs-reused capability, merge guard-vs-removal,
dependents-table specifics) was explicitly answered as a locked decision (D-04 through D-12)
rather than left to discretion. The one area CONTEXT.md explicitly defers to planning/execution
judgment is the exact, FK-derived "what counts as real" dependents list for D-12 ("vollstaendige
Liste wird aus den tatsaechlichen FKs abgeleitet und im Plan begruendet") — this research's D-12
section directly addresses that deferred judgment call with a concrete, FK-grep-verified table
and explicit recommendations, leaving final sign-off to the plan.

### Deferred Ideas (OUT OF SCOPE)

Explicitly NOT part of this phase (per CONTEXT.md's Problem statement): Keycloak-Account-Konsole-
Fehler, Hinweis an fremde Gruppen senden, Releases ohne Jellyfin-Datei, Mehrsprachigkeit,
Theme-Video-Ton-Profileinstellung — all remain as open todos, untouched.
</user_constraints>

## Summary

189-CONTEXT.md already did an exhaustive Ist-Analyse for all four work items (D-04 through
D-12) with file:line references. This research does NOT repeat that — it fills three gaps the
planner needs: (1) a concrete, per-work-item test strategy honoring this repo's "real Postgres
fixture / real httptest handler, no render-of-truth-by-reading-source-code" test-style rule, (2)
the exact reuse surface and a *corrected, FK-verified* dependents table for the new
fansub-group delete-lock (D-12), and (3) a complete, file:line-precise removal inventory for the
merge feature (D-11) so no second investigation pass is needed.

Three findings materially change the scope CONTEXT.md implied:

1. **No migration is needed for D-11.** `MergeFansubs`/`MergeFansubsPreview` are gated by
   `h.requireAdmin(c)` only (`fansub_merge.go:51,134`) — there is **no** permission `Action`
   constant, no `action_definitions` row, no `role_capabilities` row for merge at all. D-11's
   "append-only migration to remove or deprecate the action" clause is moot: there is nothing in
   the catalog to remove.
2. **No migration is needed for D-08 either.** The action `anime_fansub_project.notes.write`
   already exists in the Go permission constants (`permissions_types.go:37`) and in
   `role_capabilities` since migration `0108_capability_registry.up.sql` (confirmed role set:
   editor, fansub_lead, project_lead, quality_checker — exactly matching CONTEXT.md's live-DB
   table). `CanForAnimeProject` is already a generic, action-parameterized function
   (`permissions_anime_project.go:39`). **The entire D-08 backend fix is wiring an already-built
   capability into the right handler function and a new frontend capability field** — not adding
   new permission infrastructure.
3. **The D-12 dependents list in CONTEXT.md is illustrative, not exhaustive, and CONTEXT.md says
   so explicitly** ("vollständige Liste wird aus den tatsächlichen FKs abgeleitet"). A full
   FK grep (below) surfaces at least four additional tables not in CONTEXT.md's list, two of
   which (`review_decisions`, `review_audit_events`) have **no `ON DELETE` clause at all**
   (Postgres default `NO ACTION`) — meaning any fansub group that was ever reviewed already hard-
   fails `DeleteGroup` today with a raw, uncaught FK error, exactly like the merge FK failure
   documented in Ist-Zustand 3.

**Primary recommendation:** Treat this phase as four independent, small, surgical changes. Two
of the four backend fixes (D-08, D-11-permissions) require *zero* new permission/migration work
because the infrastructure already exists from Phase 188/the original 0108 catalog migration —
the planner should scope tasks accordingly and not budget time for catalog migrations that
aren't needed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coop-partner filtering (D-04/D-05) | API / Backend | Frontend Server (SSR) | New SQL join lives in repository layer; frontend only renders what the API returns |
| Coop-partner / "Mehr entdecken" link targets (D-05/D-06) | Frontend Server (SSR) | — | Pure URL-building, no new data; belongs in existing `@/lib/fansubProjectRoutes` helper module |
| next/image crash fix (D-07) | Frontend Server (SSR) | CDN / Static (image optimizer) | Fix is a component swap (`<Image>` → `<ResponsiveImage>`) in a page component; no backend change |
| Projektnotizen write-permission (D-08/D-09/D-10) | API / Backend | Frontend Server (SSR) | Core fix is the Go permission-check function the handler calls; frontend only needs a new capability field to gate the UI consistently |
| Fansub-merge removal (D-11) | API / Backend | Browser / Client | Removal spans all tiers (route, handler, repo, contract, frontend page/client) but the decision boundary (what's "only used by merge") is a backend grep question |
| Fansub-group delete-lock (D-12) | API / Backend | Database / Storage | Pure repository-layer dependents-counting extension of an existing Phase-187 pattern; no new tables |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-04 | `coop_groups` only in `GetGroupReleasesCursor` | Exact function/struct locations identified; contract schema correction (see below) |
| D-05 | Kopfbereich zeigt nur echte Coop-Partner, nur Namen, klickbar | Exact edit points in `ProjectStats.tsx`; `AvatarStack` confirmed NOT needed (already `unoptimized`, and D-05 drops logos) |
| D-06 | "Weitere Gruppen" wandert in "Mehr entdecken", kein Chip-Reuse | Confirmed no project-URL-builder exists yet for the technical `/anime/.../group/...` path; gap identified in `fansubProjectRoutes.ts` |
| D-07 | next/image-Absturz beheben über zentrale Allowlist | Root cause and exact fix pattern (`ResponsiveImage`) identified with code-comment proof |
| D-08 | Separate Capability für Projektnotizen-Schreibrecht | Confirmed action + role_capabilities already exist; exact handler/frontend wiring gap identified |
| D-09 | Realer Verlust-Fall akzeptiert | No further research needed — pure decision, already made |
| D-10 | Keine Rollen-Erweiterung für `co_leader`/`founder` | No further research needed — pure decision, already made |
| D-11 | Merge komplett entfernen | Complete file:line removal inventory below (frontend, backend, contract, tests, permission catalog) |
| D-12 | Lösch-Sperre für Fansub-Gruppen | Corrected, FK-grep-verified full dependents table below, extending the Phase-187 guard pattern |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify/require`, real Postgres via `backend/internal/testsupport` per-phase fixtures |
| Backend config | No central config file; each phase/plan creates its own `testsupport.OpenPhaseNNNPostgres(t)` helper (schema-isolated, `t.Skip`s if its DSN env var is unset) |
| Frontend framework | Vitest 3, config `frontend/vitest.config.ts` (jsdom via `@vitest-environment jsdom` pragma per file) |
| Quick run (backend, package-scoped) | `go test ./backend/internal/repository/... -run <TestName> -v` / `./backend/internal/handlers/...` |
| Quick run (frontend) | `npm --prefix frontend run test -- <file-glob>` (script is `vitest run`) |
| Full suite (backend) | `go test ./backend/...` (requires `TEAM4S_PHASE187_TEST_DSN` etc. set, or those fixtures `t.Skip`) |
| Full suite (frontend) | `npm --prefix frontend run test` |

**Critical gotcha found during research:** `backend/internal/repository/test_helpers.go`'s
`setupTestRepo`/`createTestAnime` are **permanently-skipping placeholders**
(`t.Skip("Integration tests require test database setup")`, lines 15/22). Any existing test using
them (e.g. `TestGroupRepository_GetGroupReleases`, which is the *only* existing test that exercises
`getOtherGroups`) **never actually runs**. Do NOT follow this pattern for new tests. Use a real
`testsupport.OpenPhaseNNNPostgres` fixture instead (see per-work-item mapping below).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-04 | `getCoopGroups` returns only groups sharing a `release_version` with this group, for this anime | unit (real Postgres) | `go test ./backend/internal/repository/... -run TestGroupRepositoryCoop -v` | ❌ Wave 0 — new file, pattern below |
| D-04 | `GetGroupReleasesCursor` response includes populated `coop_groups` field, distinct from `other_groups` | unit (real Postgres) | extend `group_repository_cursor_test.go` | ❌ Wave 0 — extend |
| D-05 | `ProjectStats` renders 1/2/3+ coop-partner names as links to `/anime/<id>/group/<id>`, hides when empty | unit (pure function/component, Vitest) | `npm --prefix frontend run test -- ProjectStats.test.tsx` | ✅ `ProjectStats.test.tsx` exists — extend |
| D-06 | "Mehr entdecken" lists remaining `other_groups` (minus coop partners minus self) as text links in existing link style | unit (pure function, Vitest) | new/extended test on the data-derivation helper (not the chip component) | ❌ Wave 0 — depends on where the filter helper lands |
| D-07 | `releases/page.tsx` logo renders without `next/image` localPatterns crash for `/api/v1/media/files/...`-shaped URLs | unit (pure function, Vitest, already exists) | `npm --prefix frontend run test -- ResponsiveImage` / `publicImagePatterns` — assert `isConfiguredForImageOptimization('/api/v1/media/files/x.png') === false` and that `<ResponsiveImage>` is used (not raw `<Image>`) | ✅ `ResponsiveImage.test.tsx` exists — no new assertions strictly needed beyond an absence-check that `releases/page.tsx` no longer imports raw `next/image` for the logo slots |
| D-08 | Confirmed project-role actor without group role gets write access via `CanForAnimeProject`; group-wide-only role without project overlap loses it | unit (Go, `httptest` handler + `permissionResolverStub`, real code executed) | `go test ./backend/internal/handlers/... -run TestAnimeProjectNote.*ProjectRole -v` | ❌ Wave 0 — mirror `TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole` (`admin_content_anime_project_timeline_test.go:68`) |
| D-08 | New `can_edit_project_notes` capability field returned correctly with/without `?anime_id=` | unit (Go, `app_auth_capabilities_test.go` if it exists, else new) | `go test ./backend/internal/handlers/... -run TestAppAuthCapabilities -v` | check existing file first |
| D-11 | Merge routes/handlers/repo files fully removed, no dangling references | absence check (grep-based, exception per CLAUDE.md Teststil) | `grep -rn "fansub_merge\|MergeFansubs\|mergeFansubs" backend frontend/src shared/contracts` returns nothing outside explicitly-kept files | N/A — CI-style grep, not a Go/Vitest test |
| D-11 | `TestFansubRepositoryMergeCoreHasNoGuardReferences` (`release_version_group_guard_test.go:283`) removed/updated | n/a — must be deleted together with `fansub_repository_merge_core.go`, else compile failure (reads a file that will no longer exist) | — | ⚠️ pre-existing test that WILL break the build if not removed in the same commit |
| D-12 | `DeleteGroup` blocks with 409 + German message listing counts when real dependents exist; succeeds when none do; platform-admin not exempt | unit (Go, real Postgres fixture, mirrors `release_version_group_guard_test.go`) | `go test ./backend/internal/repository/... -run TestFansubGroupDeleteDependents -v` | ❌ Wave 0 |
| D-12 | Handler surfaces 409 with `GermanReasonFragment()`-built message (mirror `episode_version_update.go:79-87`) | unit (Go, httptest) | `go test ./backend/internal/handlers/... -run TestDeleteFansub.*Dependents -v` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** run the specific new/extended test file only (see commands above).
- **Per wave merge:** `go test ./backend/...` and `npm --prefix frontend run test` (full suites).
- **Phase gate:** full suite green before `/gsd:verify-work`. Note: full backend suite requires
  several `TEAM4S_PHASEnnn_TEST_DSN` env vars to be set or those fixture-backed tests silently
  `t.Skip`; confirm CI/dev-env has these set before trusting a "green" full-suite run as proof of
  coverage for Postgres-backed tests.

### Wave 0 Gaps
- [ ] New repository test file for `getCoopGroups` (D-04) — real-fixture test, extend
      `group_repository_cursor_test.go` or add `group_repository_coop_test.go`, using the SAME
      `setupTestRepo`-replacement pattern as `openAnimeProjectTimelineHandlerFixture`
      (`admin_content_anime_project_timeline_test.go:26-58`, built on
      `testsupport.OpenPhase107Postgres`), since it already wires
      anime/episodes/fansub_releases/release_version_groups/anime_fansub_groups.
- [ ] New repository test file for `DeleteGroup` dependents counting (D-12) — reuse
      `testsupport.OpenPhase187Postgres` (already has `anime`, `release_version_groups`,
      `anime_fansub_groups`, migration 0137's `release_crew_snapshots`/
      `release_role_credit_lifecycles`, trimmed `release_version_media`/`release_version_notes`)
      PLUS new stand-ins for whichever of the additional tables (below) the plan decides to
      count (`fansub_group_members`, `fansub_group_notes`, `anime_fansub_project_notes`,
      `fansub_group_history`, `fansub_group_default_crew`, `fansub_group_invitations`,
      `user_group_capability_overrides`, `review_decisions`/`review_audit_events`).
- [ ] New/extended handler test for `requireAnimeProjectNoteWriteAccess` (D-08) — mirror
      `admin_content_anime_project_timeline_test.go`'s Handler-Test A/B pair exactly, swapping in
      `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`.
- [ ] Frontend test for the new "Mehr entdecken" link-list derivation helper (D-06) — wherever the
      plan places the filter logic (`otherGroups` minus `coopGroups` minus self), it should be a
      pure, independently-testable function per this repo's existing `fansubProjectRoutes.test.ts`
      style (pure-function Vitest tests, no render/click simulation needed since it's not a UI
      interaction).

## Standard Stack

No new libraries. This phase is a pure bugfix bundle on the existing stack (Go 1.25/Gin/pgx,
Next.js 16/React 18.3/TypeScript, already-configured Vitest/testify). **No package installs, no
`npm install`/`go get`, no Package Legitimacy Audit needed** — skipping that section per its
"only required when installing packages" condition.

## D-04/D-05/D-06 — Coop-Partner: Exact Reuse Surface

### Contract correction (important — differs from CONTEXT.md)

CONTEXT.md states the contract gap is in `GroupReleasesData` (`openapi.yaml` ~line 17387). That
schema is real but is **only** referenced by `GroupReleasesResponse`
(`openapi.yaml:17401-17407`), which backs the **offset** endpoint (`GET .../releases`), which
D-04 explicitly does NOT touch.

The Cursor endpoint the project page actually calls
(`GET /anime/:id/group/:groupId/release-list`, handler `GetGroupReleaseListCursor`,
`group_contributors_handler.go:241`) is documented by a **different** schema:
`GroupReleaseListCursorResponse` (`openapi.yaml:17784-17796`, operation at `openapi.yaml:6296`).
That schema currently only lists `items`, `next_cursor`, `has_more` — it is **already missing**
`other_groups` even though the Go struct `GroupReleasesCursorPage`
(`group_repository_cursor.go:21-26`) has carried that field for a while (pre-existing contract
drift, not caused by this phase). **D-04's contract change belongs in
`GroupReleaseListCursorResponse`, not `GroupReleasesData`.** Recommend adding both the missing
`other_groups` and the new `coop_groups` field to `GroupReleaseListCursorResponse` in the same
edit (cheap, and fixes a real pre-existing drift while the file is open).

### Backend: where `coop_groups` is computed

- `GetGroupReleasesCursor` (`group_repository_cursor.go:286` calls `r.getOtherGroups(...)`) is
  the single call site to extend. Add a sibling call `r.getCoopGroups(ctx, animeID, groupID)`.
- `getOtherGroups` (`group_repository.go:415-454`) is the pattern to mirror, NOT to modify
  in-place: `group_repository.go` is already 454 lines (over the 450-line limit), and CONTEXT.md
  already flags this. **Put the new query in a brand-new file** (CONTEXT.md's own suggested
  name: `group_repository_coop.go`), same `package repository`, so `group_repository.go` is
  never touched and needs no split for this phase. `group_repository_cursor.go` (297 lines) has
  headroom to add the `CoopGroups` field + one function call without crossing 450.
- Suggested SQL shape (self-join on `release_version_groups`, mirroring the self-join pattern in
  `countMergeVersionConflicts`, `fansub_repository_merge_duplicates.go:360-397`, which CONTEXT.md
  already points at as a model — not to be copied verbatim since that file is being deleted by
  D-11 in the same phase):
  ```sql
  SELECT DISTINCT fg.id, fg.slug, fg.name, fg.logo_url
  FROM release_version_groups rvg_self
  JOIN release_version_groups rvg_other
    ON rvg_other.release_version_id = rvg_self.release_version_id
   AND rvg_other.fansub_group_id != rvg_self.fansub_group_id
  JOIN release_versions rev ON rev.id = rvg_self.release_version_id
  JOIN fansub_releases fr ON fr.id = rev.release_id
  JOIN episodes e ON e.id = fr.episode_id
  JOIN fansub_groups fg ON fg.id = rvg_other.fansub_group_id
  WHERE rvg_self.fansub_group_id = $2 AND e.anime_id = $1
  ORDER BY fg.name ASC
  ```
  (parameters: `$1 = animeID`, `$2 = groupID`, matching `getOtherGroups`'s existing signature
  order).
- Struct/model additions: `GroupReleasesCursorPage.CoopGroups []models.FansubGroupSummary
  \`json:"coop_groups"\`` (`group_repository_cursor.go`). `models.FansubGroupSummary` already
  exists and is reused as-is (same type `getOtherGroups` returns).

### Frontend: data plumbing and exact edit points

- `projectPageData.ts:261`: `cooperationGroups: activityPage.other_groups ?? []` → must become
  `activityPage.coop_groups ?? []`. The prop/variable is **already named** `cooperationGroups` /
  `coopGroups` end-to-end (`projectPageData.ts:54`, `ProjectStats.tsx:48`) even though today it
  carries the wrong (unfiltered) data — confirms the original author already anticipated this
  exact fix; no renaming needed, just the data source.
- `ProjectStats.tsx` exact edit points (file is well under 450 lines, no split needed):
  - Line 56: `singleCoopGroup` — link target changes from implicit group-profile link
    (`/fansubs/${singleCoopGroup.slug}`, line 82) to the project-page technical path (see helper
    gap below).
  - Lines 88-97: the `AvatarStack` branch (2+ partners) must be **replaced** with the D-05 text
    format ("A · B" for 2, "A · B +N" for 3+, each name a link) — this is a bigger rewrite than a
    link-target swap; `AvatarStack` is no longer used here at all per D-05.
  - Lines 104-115 (`coopPartnerDetails`/`coopPartnerList`): link targets (`/fansubs/${group.slug}`
    at line 109) also need to change to the project-page path.
  - `avatarItems`/`resolveApiUrl` (lines 60-64) becomes dead code once `AvatarStack` is removed —
    delete, don't leave unused.
- **`AvatarStack.tsx` itself does not need a D-07 fix**: it already passes `unoptimized` to
  `next/image` (`AvatarStack.tsx:47`), which bypasses `localPatterns`/`remotePatterns` validation
  entirely — it was never actually at crash risk. (Moot anyway per D-05 dropping its use here.)

### D-06 helper gap (answers research ask #5 directly)

`frontend/src/lib/fansubProjectRoutes.ts` **exists** and is exactly the right file/location, but
**no existing exported function builds the bare technical path** `/anime/<animeId>/group/<groupId>`
needed by D-05/D-06. What exists:
- `buildPublicFansubProjectPath(fansubSlug, animeSlug)` → `/fansubs/<slug>/fansubprojekt/<slug>`
  (the pretty SEO path — wrong shape for this phase's requirement).
- `buildTechnicalFansubReleasePath(animeID, groupID, releaseVersionID)` → appends
  `/releases/<id>` (one level too deep).
- `buildPublicFansubProjectHref(...)` has the right literal **inline** as a private fallback
  branch (line 46: `` `/anime/${params.project.id}/group/${params.groupId}` ``) but doesn't
  export it standalone.

**Recommendation:** add one small new exported function to this same file, e.g.
`buildTechnicalFansubProjectPath(animeID: number, groupID: number): string` returning
`` `/anime/${animeID}/group/${groupID}` ``, mirroring `buildTechnicalFansubReleasePath`'s naming
convention. Both D-05 (header name links) and D-06 ("Mehr entdecken" links) call this one
function. Test it with a plain Vitest unit test alongside the existing
`fansubProjectRoutes.test.ts` (pure-function style, no component needed).

### D-06 "Mehr entdecken" data logic

- `otherGroupsSection`/`otherGroupChip` in `releases/page.tsx:417-444` is the ONLY place D-02's
  original todo envisioned reusing — **superseded by D-06**: the chip component/visual is not
  reused on the project page at all. Only the *filtering logic* (take `other_groups`, remove
  anything already in `coop_groups`, remove self) needs to be reproduced — recommend a small pure
  function (e.g. `discoverableOtherGroups(otherGroups, coopGroups, selfGroupId)`), independently
  testable, living wherever the "Mehr entdecken" section component for the project page already
  is (likely a sibling of `HeroSection.tsx`/`ProjectStats.tsx` in `sections/`).

## D-07 — next/image Crash: Root Cause and Verified Fix Pattern

**Root cause confirmed, not guessed:** `releases/page.tsx` imports raw `next/image`
(`import Image from 'next/image'`, line 4) and uses it directly at **two** sites:
`group.fansub.logo_url` (line 325-331) and `otherGroup.logo_url` (line 427-433, inside the
`otherGroupChip` the file also renders). Both crash identically for any URL shaped like
`/api/v1/media/files/<filename>` (the legacy, pre-Phase-173-backfill media URL shape), because
that path isn't in `publicImagePatterns.mjs`'s `LOCAL_IMAGE_PATTERNS` and Next validates local
`src` values that start with `/` against exactly that list before the page can even render.

**This exact failure mode already has a solved, documented pattern in this codebase** —
`ResponsiveImage.tsx`'s own doc comment (lines 26-29) literally names
`/api/v1/media/files/...` as one of three known legacy-data shapes it was built to not crash on:
it calls `isConfiguredForImageOptimization` (same `publicImagePatterns.mjs` data) FIRST and falls
back to `unoptimized` rendering instead of letting `next/image` throw. The project page's own
header (`HeroSection.tsx:7,105,131`) **already uses `ResponsiveImage`** for the group logo and is
therefore already safe — only `releases/page.tsx` was never migrated to it.

**Fix: replace raw `<Image>` with `<ResponsiveImage>` at both sites in `releases/page.tsx`.**
This genuinely satisfies D-07's "über die zentrale Allowlist beheben, nicht lokal umgehen"
constraint — `ResponsiveImage` IS the sanctioned way to consult the central allowlist; it is not
a local workaround. Do not add `/api/v1/media/files/**` to `LOCAL_IMAGE_PATTERNS` itself — that
pattern is deliberately treated as unmigrated legacy data elsewhere in the codebase (safe
fallback, not full optimization), and promoting it to a first-class allowed pattern would be
inconsistent with that existing convention and is out of scope for a bugfix phase.

No backend change is needed for D-07 at all.

## D-08 — Projektnotizen-Rechteprüfung: Exact Wiring Gap

Confirmed via code read (not CONTEXT.md's summary alone):

- **Backend action infra already exists and needs no catalog change.**
  `permissions.ActionAnimeFansubProjectNotesWrite` (`permissions_types.go:37`) and its
  `role_capabilities` rows (editor/fansub_lead/project_lead/quality_checker, migration `0108`,
  reaffirmed `0154`/`0159`) already match CONTEXT.md's live-DB table exactly. `CanForAnimeProject`
  (`permissions_anime_project.go:39`) is already generic over `action` — it was built this way
  on purpose in Phase 188 (doc comment at line 24: "any other action scoped to one concrete
  (anime, fansub group) project").
- **The only backend gap is a missing handler access-check function.** Today
  `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`
  (`admin_content_anime_project_notes.go:107,181`) call `h.requireFansubGroupNoteWriteAccess(c)`
  (`admin_content_fansub_group_notes.go:19-43`, group-wide `CanForFansubGroup` +
  `ActionFansubGroupNotesWrite`). The fix: add a new
  `requireAnimeProjectNoteWriteAccess(c)` function in `admin_content_anime_project_notes.go`,
  copying `requireAnimeProjectTimelineWriteAccess`'s structure *exactly*
  (`admin_content_anime_project_timeline.go:62-98`: parse `fansubID`, parse `animeID` from
  `c.Param("animeId")` — already present in the route per CONTEXT.md — call `CanForAnimeProject`
  with `permissions.ActionAnimeFansubProjectNotesWrite`), and swap the two call sites to it.
  `admin_content_anime_project_notes.go` is 212 lines — no split needed.
- **Frontend gap is a real, previously-undetected symmetric bug**, not mentioned explicitly in
  CONTEXT.md's Ist-Zustand: `FansubEditClient.tsx:154-158` computes
  `canEditProjectNotes = canUseMainTab("notes", isPlatformAdmin, capabilities)`, and
  `canUseMainTab`'s `"notes"` case (`fansubEditAccess.ts:45-46`) returns
  `Boolean(capabilities.can_edit_notes || capabilities.can_edit_founding_history)` — the
  **group-wide** capability, reused for TWO different purposes that CONTEXT.md's D-08 wants
  split: (1) notes-tab **visibility** (`visibleMainTabs`, correctly left alone per D-08), and
  (2) the **write-permission prop** passed to `AnimeProjectNoteWorkspace`
  (`AnimeProjectReleaseCard.tsx:211`, prop `canEdit={canEditProjectNotes}`). D-08 requires these
  two uses to diverge: tab visibility keeps using `can_edit_notes`; the write-permission prop
  must switch to a brand-new field.
  - Add `CanEditProjectNotes bool \`json:"can_edit_project_notes"\`` next to
    `CanEditProjectTimeline` in the Go capabilities struct (`app_auth_capabilities.go:27`,
    288-line file, no split needed) and the parallel `can_edit_project_timeline`-style
    computation block (`app_auth_capabilities.go:118-136`): call
    `CanForFansubGroup(ActionAnimeFansubProjectNotesWrite, fansubID)` when no `?anime_id=`, and
    `CanForAnimeProject(ActionAnimeFansubProjectNotesWrite, animeID, fansubID)` when present —
    exact mirror of the existing `canEditProjectTimeline` block.
  - Add `can_edit_project_notes: boolean;` to the frontend `FansubGroupCapabilities` type
    (`frontend/src/types/fansub.ts:274`). **This file is already 764 lines — well over the
    450-line limit — so touching it to add this one field triggers the mandatory split
    (pure-refactor commit first, per CLAUDE.md).** Budget a task for this split; it is the single
    largest line-count risk in this phase.
  - `FansubEditClient.tsx:154-158`: change `canEditProjectNotes` to
    `isPlatformAdmin || Boolean(capabilities?.can_edit_project_notes)` (exact mirror of
    `canEditProjectTimeline`'s existing line 159-160) — this becomes the *fallback* value, same
    role `canEditProjectTimeline` already plays.
  - `AnimeProjectNoteWorkspace.tsx` (236 lines) should gain its OWN project-specific capability
    fetch exactly like `AnimeProjectTimelineSection.tsx:69-84` does (`getFansubGroupCapabilities
    (fansubId, undefined, { animeId })`, reading `response.data.can_edit_project_notes`,
    falling back to the `canEdit` prop on fetch failure) — this is the actual per-project
    override that makes D-08's bug fix visible in the UI, not just the top-level fallback.

### Existing test compatibility (confirmed safe)

The two stub resolvers already used in `admin_content_anime_project_notes_test.go`
(`contributionsPermissionResolverAllowed`/`Denied`, defined in
`admin_content_fansub_releases_contributions_handlers_test.go:20,49`) implement only
`permissions.Resolver`, not the optional `AnimeProjectContributionResolver` interface
`CanForAnimeProject` type-asserts for. Swapping the access-check function therefore does **not**
break the 4 existing tests in that file (`TestAnimeProjectNoteUpsertDelegatesOnceAndKeepsResponseShape`,
`...AuthorizationFailsBeforeServiceMutation`, `...ContextFailurePrecedesServiceMutation`,
`...DeleteDelegatesOnce`) — `CanForAnimeProject` gracefully falls back to the plain group-rights
path when that optional interface isn't implemented, which still resolves `fansub_lead`
(granted in `contributionsPermissionResolverAllowed`) as allowed, matching current behavior.

**New test needed** (D-08's actual regression coverage): mirror
`TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole`
(`admin_content_anime_project_timeline_test.go:68-101`) using the full `permissionResolverStub`
with `projectContributionRoles` — one test proving a confirmed `project_lead` project role
without a group role gets write access, one proving a `quality_checker`-without-project-role
group role still works (unchanged), and one new one proving a `founder`/`co_leader`-only actor
(the real D-09 loss case) is denied.

## D-11 — Fansub-Group-Merge Removal: Complete Inventory

Grep-confirmed, 100% exclusive-use verified (not guessed) — safe to delete entirely, in this
order to avoid broken intermediate compiles:

### Backend

| File | Action | Notes |
|---|---|---|
| `backend/internal/handlers/fansub_merge.go` (179 lines) | **Delete entirely** | `MergeFansubs` (line 51), `MergeFansubsPreview` (line 134), `normalizeMergeSourceIDs` (line 26) — all merge-only |
| `backend/internal/handlers/fansub_merge_test.go` (39 lines) | **Delete entirely** | Only tests `normalizeMergeSourceIDs` |
| `backend/internal/repository/fansub_repository_merge_core.go` (236 lines) | **Delete entirely** | The merge transaction itself |
| `backend/internal/repository/fansub_repository_merge_duplicates.go` (396 lines) | **Delete entirely** | **Verified**: all 6 functions (`populateAliasMergePreview`, `populateMergeMemberDuplicates`, `populateMergeRelationDuplicates`, `populateMergeNameSlugCollisions`, `countExistingFansubGroups`, `countMergeVersionConflicts`) are called ONLY from `fansub_repository_merge_core.go` — zero other call sites anywhere in `backend/`. CONTEXT.md's caution ("nur soweit ausschließlich für den Merge genutzt") resolves cleanly: delete the whole file. |
| `backend/cmd/server/admin_routes.go:138-139` | **Remove 2 lines** | `v1.POST("/admin/fansubs/merge", ...)` and `.../merge/preview` route registrations |
| `backend/internal/repository/release_version_group_guard_test.go:279-296` | **Remove `TestFansubRepositoryMergeCoreHasNoGuardReferences`** | ⚠️ This test does `os.ReadFile("fansub_repository_merge_core.go")` — if that file is deleted without removing this test, the **build fails outright** (the test package won't compile due to a missing-file read error at runtime, or more precisely the test will fail at `require.NoError` on the ReadFile). Must be removed in the SAME commit as the merge-core deletion. |
| Permission catalog (`action_definitions`/`role_capabilities`) | **No migration needed** | Confirmed: merge is gated by `h.requireAdmin(c)` only, no `Action` constant or catalog row exists for it at all. |

### Frontend

| File | Action | Notes |
|---|---|---|
| `frontend/src/app/admin/fansubs/merge/` (whole directory: `page.tsx`, `MergeWizardCards.tsx`, `MergeWizardPreviewStep.tsx`, `MergeWizardProgress.tsx`, `useMergeFansubsWizard.ts`, `fansubMergeScoring.ts`, `fansubMergeScoring.test.ts`, `MergeWizard.module.css`) | **Delete entire directory** | Self-contained, confirmed no imports from outside this directory reference its internals |
| `frontend/src/lib/api/fansubs-groups.ts:1-10,118-175` | **Remove `mergeFansubsPreview`/`mergeFansubs` functions + their type imports** | File keeps all other fansub group CRUD/detail functions — do not delete the whole file |
| `frontend/src/types/fansub.ts:465-508` | **Remove `MergeFansubsRequest`/`Result`/`Response`/`PreviewConflicts`/`PreviewResult`/`PreviewResponse` interfaces** | This file is already over the 450-line split threshold (764 lines) — the mandatory split commit (also needed for D-08's new field) should happen before or alongside this removal |
| `frontend/src/app/admin/fansubs/page.tsx:110,199` (two `<Link href="/admin/fansubs/merge">` entry points) | **Remove both links** | "+ Neue Fansubgruppe" link at line ~105 stays; only the "Gruppen zusammenfuehren"/"Zusammenfuehren" links go |
| `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` (154 lines) | **Remove merge-specific parts only** | Remove `import MergeFansubsPage from "./merge/page"` (line 73), the `it("blocks non-platform direct visits to /admin/fansubs/merge"...)` block (lines 113-126), the entire `describe("MergeFansubsPage — Abrufgrenze-Hinweis (WR-05)"...)` block (lines 128-154), and the `mergeFansubs`/`mergeFansubsPreview` entries from the `apiMocks` object. **Do not delete the whole file** — it still covers `/admin/fansubs/create` direct-access gating. |

### Contract (`shared/contracts/openapi.yaml`)

| Element | Lines | Action |
|---|---|---|
| Path `/api/v1/admin/fansubs/merge/preview` | ~4711-4760 | Delete whole path block |
| Path `/api/v1/admin/fansubs/merge` | ~4761-4815 | Delete whole path block |
| Schema `MergeFansubsRequest` | ~15144-15158 | Delete |
| Schema `MergeFansubsResult` | ~15159-15183 | Delete |
| Schema `MergeFansubsPreviewConflicts` | ~15184-15237 | Delete |
| Schema `MergeFansubsPreviewResult` | ~15238-15272 | Delete |
| Schema `MergeFansubsResponse` | ~15352-15357 | Delete |
| Schema `MergeFansubsPreviewResponse` | ~15358-15363 | Delete |

Verified: no other schema in the contract `$ref`s any `MergeFansubs*` schema (single-use, safe to
remove outright).

### Admin UI entry point (answers research ask #4 precisely)

Exactly two links, both in `frontend/src/app/admin/fansubs/page.tsx`: line 110 ("Gruppen
zusammenfuehren", top action bar) and line 199 ("Zusammenfuehren", bulk-selection action bar).
No other admin page links to `/admin/fansubs/merge`.

### Alias nebenbefund

D-11 confirms the alias-loss nebenbefund (Ist-Zustand 3) needs no separate fix — it only existed
inside the merge code path being deleted.

## D-12 — Fansub-Group Delete-Lock: Corrected Full Dependents Table

`DeleteGroup` (`fansub_repository_groups.go:396-420`) is 771 lines total for the file (already
over the 450-line limit — **any content edit to this function forces the mandatory split**,
budget this explicitly). Today it does a bare transaction: explicit `DELETE` of
`anime_contributions` and `hist_fansub_group_members` (unconditional, no counting), then
`DELETE FROM fansub_groups` — everything else is whatever the FK says.

### Pattern to extend (confirmed, not guessed)

`release_version_group_guard.go` (184 lines, same package) already has every piece needed:
`DependencySummary` (counts + `HasAny()` + `GermanReasonFragment()`), a typed
`*GroupHasDependentsError` (`errors.go:44-55`), and the handler-side 409 pattern
(`episode_version_update.go:79-87`: `errors.As` into `*GroupHasDependentsError`, build message
via `depErr.Summary.GermanReasonFragment()`, status 409, `"code": "release_version_group_has_dependents"`).
**D-12 should add a new, parallel `DependencySummary`-like type (e.g. `FansubGroupDependencySummary`)
and a new counting function in the SAME file** (`release_version_group_guard.go` has headroom:
184 of 450 lines) rather than overloading the existing release-version-scoped
`DependencySummary`, since the new check is keyed by `fansub_group_id` alone (no
`release_version_id` dimension) — a structurally different query shape.

### FK-verified, corrected dependents table

Grep-confirmed via `database/migrations/*.up.sql` (all `REFERENCES fansub_groups(id)` sites).
CONTEXT.md's list is **not wrong, but incomplete** — it was explicit that the full list needed
deriving from actual FKs, which this table does:

| Table | ON DELETE | In CONTEXT.md's list? | Recommended "real"? | Notes |
|---|---|---|---|---|
| `release_version_groups` | CASCADE | yes | **yes** | Core release/group assignment |
| `fansub_group_members` | CASCADE | yes | **yes** | Active memberships |
| `anime_contributions` | RESTRICT | yes (already explicit `DELETE`) | **yes** | Already explicitly deleted today — must be counted first, not deleted unconditionally |
| `hist_fansub_group_members` | RESTRICT | yes (already explicit `DELETE`) | **yes** | Same — already explicitly deleted today |
| `fansub_group_media` | CASCADE | yes | **yes** | |
| `fansub_group_notes` | CASCADE | yes | **yes** | Has `deleted_at` — filter `IS NULL` like D-08's release-version-notes pattern |
| `anime_fansub_project_notes` | CASCADE | yes | **yes** | Has `deleted_at` — filter `IS NULL` |
| `fansub_group_history` | CASCADE | yes | **yes** | |
| `theme_segments.fansub_group_id` | CASCADE | yes | **yes, but scoped**: this is a nullable column added by migration 0049, not the table's own group — count rows WHERE `fansub_group_id = $1`, not all of `theme_segments` |
| `segment_library_definitions` | CASCADE | yes | **yes** | |
| `fansub_group_default_crew` | CASCADE | yes | **yes** | |
| `fansub_group_invitations` | CASCADE | "Einladungen" (generic) | **yes, filtered to `status = 'pending'`** | Has a `status` check constraint (`pending`/`accepted`/`cancelled`/`expired`) — only pending invitations represent real unresolved state, mirrors the `deleted_at` filtering convention used elsewhere |
| `member_claim_invitations` | CASCADE | "Einladungen" (generic, ambiguous which table) | **yes, filtered to `status = 'pending'`** | Second, distinct invitations table also FK'd to `fansub_groups` — CONTEXT.md's generic "Einladungen" plausibly meant one or both; recommend counting both since both represent real pending cross-entity state |
| `user_group_capability_overrides` | CASCADE | "Overrides" (generic) | **yes** | Per-user allow/deny grants scoped to this group — real admin-configured state |
| `fansub_group_aliases` | CASCADE | no (explicitly listed as NOT real in CONTEXT.md/D-12) | **no** — confirmed consistent with CONTEXT.md | |
| `fansub_members` | CASCADE | no | **no** — confirmed empty table (0 rows live per CONTEXT.md's own merge Ist-Zustand finding), legacy/unused | |
| `anime_fansub_groups` | CASCADE | no | **recommend no** — pure link/assignment table (an anime the group was ever associated with, no release); D-02/CONTEXT.md's own distinction between "assignment" and "actual release" (`getOtherGroups`'s doc comment) applies here too | |
| `fansub_collaboration_members` (both `collaboration_id` and `member_group_id` FK columns) | CASCADE | no | **recommend yes if non-empty in practice** — represents an active declared collaboration relationship; flag for plan decision | |
| `release_playback_entitlement_rules.fansub_group_id` | CASCADE | **not in CONTEXT.md's list — new finding** | **yes** | Real access-grant rules scoped to a group; silent CASCADE today |
| `point_ledger_entries.fansub_group_id` | SET NULL | not in CONTEXT.md's list | **no** (SET NULL, not a block) | Historical ledger entries survive with a null group reference — already safe, no counting needed |
| `review_decisions.fansub_group_id` | **none specified → Postgres default `NO ACTION`** | **not in CONTEXT.md's list — new finding, same class of bug as the merge FK failure** | **yes** | Any group that was ever reviewed (text/image/contribution review) **already hard-blocks `DeleteGroup` today** with a raw, uncaught FK violation (same failure shape documented for merge in Ist-Zustand 3) |
| `review_audit_events.fansub_group_id` | **none specified → `NO ACTION`** | **not in CONTEXT.md's list — new finding** | **yes** | Same hard-block risk as `review_decisions` |
| `user_group_capability_override_history.fansub_group_id` | **explicit `RESTRICT`** | not in CONTEXT.md's list | **yes** | Audit-log table for overrides — already hard-blocks any group that ever had an override created+removed |
| `fansub_group_members` → `fansub_group_member_roles` | CASCADE (2nd-level, via `fansub_group_member_id`) | implied by "Mitgliedschaften" | n/a | Automatically covered once `fansub_group_members` rows are gone; no separate count needed |

**Recommendation for the plan:** the counting function should be a single query with one
`SELECT` subquery per counted table (mirroring `countReleaseVersionGroupDependents`'s shape
exactly — one `QueryRow` with multiple scalar subqueries), explicitly enumerating every "yes" row
above. The two `NO ACTION` tables (`review_decisions`, `review_audit_events`) are the most
important to include, since they are currently silent 100%-failure landmines identical in shape
to the merge bug this very phase is replacing.

### Handler change

`DeleteFansub` (`fansub_groups.go:388-416`) needs the same `errors.As`/409 pattern as
`episode_version_update.go:79-87`, with a German message built from the new summary's
`GermanReasonFragment()`-equivalent. **D-12 explicitly requires this applies to platform admins
too** — confirm no `IsPlatformAdmin` bypass is added anywhere in this path (there currently isn't
one in `DeleteFansub`, which already calls `h.requireAdmin(c)` unconditionally for everyone —
good, nothing to remove, just don't introduce a bypass while adding the dependents check).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting "real" dependents before a destructive delete | A bespoke ad-hoc query per call site | Extend `release_version_group_guard.go`'s `DependencySummary`/`GroupHasDependentsError` pattern with a new fansub-group-scoped type in the same file | Already-proven pattern (Phase 187), already wired to the exact 409+German-message handler convention this codebase uses everywhere this problem recurs |
| Building the project-page URL for a group | A new one-off string template inline in `ProjectStats.tsx`/the "Mehr entdecken" component | `@/lib/fansubProjectRoutes`'s existing helper file, adding one new exported function | Single source of truth already exists for every other project-URL shape in this app; a local template would immediately diverge the day the URL scheme changes again |
| Falling back for images outside the allowlist | A local `try/catch` around `next/image` or a hand-rolled `<img>` tag in `releases/page.tsx` | `@/components/ui/ResponsiveImage` | Already solves exactly this problem app-wide and is the documented, sanctioned mechanism |

**Key insight:** every one of this phase's four "fixes" already has a sibling implementation
elsewhere in the codebase solving the identical shape of problem (D-04/D-12 mirror Phase 187's
guard pattern, D-07 mirrors `HeroSection.tsx`'s already-correct `ResponsiveImage` use, D-08
mirrors Phase 188's timeline fix almost line-for-line, D-06 needs one new function in an
already-existing helper file). This is a phase about *finishing* half-applied patterns, not
inventing new ones — plan tasks accordingly (small, mechanical, high-confidence).

## Common Pitfalls

### Pitfall 1: Deleting `fansub_repository_merge_core.go` without removing its absence-test
**What goes wrong:** `release_version_group_guard_test.go:283-296`
(`TestFansubRepositoryMergeCoreHasNoGuardReferences`) does `os.ReadFile("fansub_repository_merge_core.go")`. If the merge-core file is deleted in a separate commit from this test, the test fails (file not found) and blocks CI between commits.
**How to avoid:** delete both in the same commit/task.

### Pitfall 2: Treating `anime_fansub_project.notes.write` as a new capability to create
**What goes wrong:** budgeting a migration task for D-08 that duplicates work already done in
migration `0108_capability_registry.up.sql`.
**How to avoid:** the planner should explicitly scope D-08 backend work as "wire existing action
into a new handler access-check function + new frontend capability field," not "add new
capability to the permission catalog."

### Pitfall 3: Missing the `types/fansub.ts` / `fansub_repository_groups.go` 450-line splits
**What goes wrong:** `frontend/src/types/fansub.ts` (764 lines) and
`backend/internal/repository/fansub_repository_groups.go` (771 lines) are BOTH already over the
450-line limit and BOTH get touched by this phase (fansub.ts: add `can_edit_project_notes`,
remove Merge types; fansub_repository_groups.go: extend `DeleteGroup`). Per CLAUDE.md, touching
either forces a mandatory pure-refactor split commit first. Skipping this is a direct CLAUDE.md
violation, not a style nit.
**How to avoid:** budget one explicit split task per file, sequenced before the behavior-changing
edit to that file, each as its own commit with tests/typecheck green before the follow-up commit.

### Pitfall 4: Assuming `other_groups` and `coop_groups` are mutually exclusive without re-checking the data model
**What goes wrong:** every coop partner (shares a release) is, by construction, also a member of
the unfiltered "other groups with any release on this anime" set `getOtherGroups` already
returns. D-06's "remaining other groups" for "Mehr entdecken" MUST explicitly subtract
`coop_groups` from `other_groups` (and the current group itself) — it is not simply "other_groups
is now smaller."
**How to avoid:** write the subtraction as an explicit, tested pure function (see Validation
Architecture, D-06 Wave 0 gap) rather than inline JSX filtering, so the exclusion logic has a
single, checkable home.

### Pitfall 5: `review_decisions`/`review_audit_events` silently blocking deletes today, mistaken for "new" 409 behavior
**What goes wrong:** a reviewer testing D-12 live might delete-test a group that has review
history, get a 500 (today's uncaught FK error), and wrongly attribute it to a bug in the new
dependents-counting code, when in fact that exact group already couldn't be deleted before this
phase either — the fix makes the failure mode better (409 with a real count) but does not newly
introduce a restriction.
**How to avoid:** the plan/verification should explicitly test-delete a group with review
history before AND conceptually note the pre-existing 500 behavior, so the UAT comparison is
"500 → 409 with message," not "worked before → blocked now."

## Code Examples

### D-12 handler 409 pattern to mirror exactly
```go
// Source: backend/internal/handlers/episode_version_update.go:79-87
if errors.Is(err, repository.ErrGroupHasDependents) {
    var depErr *repository.GroupHasDependentsError
    errors.As(err, &depErr)
    c.JSON(http.StatusConflict, gin.H{"error": gin.H{
        "message": fmt.Sprintf("Diese Gruppe kann nicht entfernt werden: %s hängen noch daran.", depErr.Summary.GermanReasonFragment()),
        "code":    "release_version_group_has_dependents",
    }})
    return
}
```

### D-08 handler access-check pattern to mirror exactly
```go
// Source: backend/internal/handlers/admin_content_anime_project_timeline.go:62-98
func (h *AdminContentHandler) requireAnimeProjectTimelineWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
    identity, actor, ok := permissionActorFromContext(c)
    if !ok { return middleware.AuthIdentity{}, false }
    fansubID, err := parseFansubRouteID(c)
    if err != nil || fansubID <= 0 { badRequest(c, "ungültige fansub id"); return middleware.AuthIdentity{}, false }
    animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
    if err != nil || animeID <= 0 { badRequest(c, "ungültige anime id"); return middleware.AuthIdentity{}, false }
    result, err := h.permissionSvc.CanForAnimeProject(c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, animeID, fansubID)
    // ... error/denied handling identical to CanForFansubGroup call sites
    return identity, true
}
```

### D-08 Handler-Test A pattern to mirror exactly
```go
// Source: backend/internal/handlers/admin_content_anime_project_timeline_test.go:68-101
handler := &AdminContentHandler{
    permissionSvc: permissions.NewService(permissionResolverStub{
        context:                  &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
        roles:                    map[int64][]string{88: {}},
        projectContributionRoles: map[int64]map[int64][]string{88: {9: {permissions.RoleProjectLead}}},
    }),
}
```

### D-07 fix shape in `releases/page.tsx`
```tsx
// Before (crashes on legacy /api/v1/media/files/... URLs):
import Image from 'next/image'
// ...
<Image src={group.fansub.logo_url} alt={group.fansub.name} width={60} height={60} className={styles.logo} />

// After (mirrors HeroSection.tsx:105, already correct elsewhere in this app):
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
// ...
<ResponsiveImage src={group.fansub.logo_url} alt={group.fansub.name} width={60} height={60} className={styles.logo} />
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fansub_collaboration_members` should count as a "real" dependent | D-12 table | Low — if wrong, DeleteGroup is slightly more permissive than ideal; easy follow-up fix, not a data-loss risk since the table itself isn't deleted by this phase |
| A2 | `member_claim_invitations` is one of the two tables CONTEXT.md's generic "Einladungen" meant to cover (alongside `fansub_group_invitations`) | D-12 table | Low — worst case the plan counts one extra real-but-rare table; does not block correct behavior for the common case |
| A3 | The suggested `getCoopGroups` SQL join shape (self-join on `release_version_groups`) is correct without having run it against live data | D-04/D-05/D-06 SQL example | Medium — the planner/executor should verify against a real fixture (Wave 0 test) before considering D-04 done; the shape mirrors an existing, working query (`countMergeVersionConflicts`) closely enough that structural correctness is likely, but exact column/join correctness needs the Wave-0 test to confirm |

## Open Questions

1. **Does `AnimeProjectNotesSection.tsx`'s own internal (differently-scoped, same-named)
   `AnimeProjectNoteWorkspace` function (line 84, a *local* function distinct from the exported
   `AnimeProjectNoteWorkspace.tsx` component used by `AnimeProjectReleaseCard.tsx`) also need the
   D-08 capability fix, or is it a dead/legacy code path?**
   - What we know: two differently-rendered "project notes" UI surfaces appear to exist in
     parallel in `frontend/src/app/admin/fansubs/[id]/edit/` — `AnimeProjectNotesSection.tsx`
     (self-contained, own internal workspace function, 346 lines) and the separately-imported
     `AnimeProjectNoteWorkspace.tsx` (236 lines, wired into `AnimeProjectReleaseCard.tsx` with the
     `canEditProjectNotes` prop chain documented above).
   - What's unclear: which one is the live, user-facing surface reachable from the actual admin
     fansub-edit page navigation, and whether `AnimeProjectNotesSection.tsx`'s internal workspace
     needs the same capability wiring or is unused/superseded.
   - Recommendation: the planner should grep `AnimeProjectNotesSection` for its own mount point
     (is it rendered anywhere, or is it a leftover from an earlier iteration?) before deciding
     whether D-08's frontend fix needs to touch one surface or two. If genuinely dead, flag for a
     separate cleanup todo rather than fixing capability-gating in code that isn't reachable.

2. **Exact SQL correctness of the proposed `getCoopGroups` query** (see Assumption A3) — defer to
   the Wave-0 repository test against a real fixture rather than trusting the research-stage SQL
   verbatim.

## Sources

### Primary (HIGH confidence — direct code reads on the live repo this session)
- `backend/internal/repository/release_version_group_guard.go` (full read)
- `backend/internal/repository/fansub_repository_groups.go` (DeleteGroup, lines 396-420)
- `backend/internal/repository/errors.go` (full read)
- `backend/internal/repository/release_version_group_guard_test.go` (full read)
- `backend/internal/permissions/permissions_anime_project.go` (full read)
- `backend/internal/permissions/permissions_types.go`, `permissions_cache.go`,
  `capability_registry_test.go` (grep-confirmed action constants)
- `backend/internal/handlers/admin_content_anime_project_timeline.go`,
  `admin_content_anime_project_timeline_test.go` (full reads)
- `backend/internal/handlers/admin_content_anime_project_notes.go`,
  `admin_content_anime_project_notes_test.go` (full reads)
- `backend/internal/handlers/admin_content_fansub_group_notes.go` (requireFansubGroupNoteWriteAccess)
- `backend/internal/handlers/app_auth_capabilities.go` (capability computation block)
- `backend/internal/handlers/fansub_merge.go`, `fansub_merge_test.go`,
  `fansub_repository_merge_core.go`, `fansub_repository_merge_duplicates.go` (full reads +
  exhaustive grep for all 6 function names' call sites repo-wide)
- `backend/cmd/server/admin_routes.go` (merge route registrations)
- `database/migrations/0108_capability_registry.up.sql`, `0157_project_timeline_capability.up.sql`,
  `0185_anime_project_timeline_fansub_lead.up.sql` (capability catalog history)
- `database/migrations/*.up.sql` (exhaustive grep for every `REFERENCES fansub_groups(id)` FK
  and its `ON DELETE` clause — 0010, 0011, 0014, 0015, 0026, 0035, 0044, 0049, 0053, 0061, 0062,
  0063, 0073, 0076, 0082, 0084, 0086, 0092, 0107, 0129, 0131, 0134, 0146, 0178)
- `frontend/src/lib/images/publicImagePatterns.mjs`, `frontend/src/components/ui/ResponsiveImage.tsx`
  (full reads, including doc comments naming `/api/v1/media/files/...` as a known legacy shape)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (lines 1-20, 300-340, 400-440)
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx`,
  `ProjectStats.tsx` (import lines + full relevant rendering blocks)
- `frontend/src/components/ui/AvatarStack.tsx` (full read)
- `frontend/src/lib/fansubProjectRoutes.ts` (full read)
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts`, `FansubEditClient.tsx`,
  `AnimeProjectTimelineSection.tsx`, `AnimeProjectNoteWorkspace.tsx`, `AnimeProjectReleaseCard.tsx`,
  `AnimeReleasesCockpit.tsx` (grep + targeted reads for the `canEditProjectNotes`/
  `canEditProjectTimeline` prop chain)
- `frontend/src/app/admin/fansubs/page.tsx`, `direct-access-gate.test.tsx` (merge entry points + test)
- `frontend/src/lib/api/fansubs-groups.ts`, `frontend/src/types/fansub.ts` (merge function/type boundaries)
- `shared/contracts/openapi.yaml` (grep for `MergeFansubs`, `GroupReleasesData`, `cursor`,
  targeted reads of both schema regions)
- `backend/internal/repository/test_helpers.go` (full read — confirms `setupTestRepo` is a
  permanently-skipping placeholder)
- `backend/internal/testsupport/phase187_postgres.go`, `phase188_permissions_postgres.go` (full reads)

### Secondary (MEDIUM confidence)
- None — all findings in this document are grounded in direct reads of the live repository
  during this research session; no web search or training-data-only claims were used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack, existing conventions confirmed by direct file reads.
- Architecture: HIGH — every reuse point (guard pattern, CanForAnimeProject, ResponsiveImage,
  fansubProjectRoutes) was confirmed by reading the actual implementation, not inferred.
- Pitfalls: HIGH — all five pitfalls are concrete, code-verified risks (file sizes measured with
  `wc -l`, FK clauses read from migration SQL, the absence-test risk confirmed by reading the
  test file itself).
- D-12 dependents table: HIGH for existence/ON DELETE behavior (grep-verified against migration
  SQL); MEDIUM for the "recommended real?" judgment calls on ambiguous cases (collaboration
  members, which invitations table) — flagged explicitly as plan-level decisions, consistent with
  CONTEXT.md's own instruction that this list be derived and justified in the plan.

**Research date:** 2026-10-20
**Valid until:** 30 days (stable brownfield codebase, no fast-moving external dependencies)
