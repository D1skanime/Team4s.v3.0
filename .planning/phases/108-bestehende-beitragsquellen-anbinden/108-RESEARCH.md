# Phase 108: Bestehende Beitragsquellen anbinden - Research

**Researched:** 2026-07-24  
**Domain:** Release-Besetzungssnapshots, Member-Credits und append-only Punktebuch  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rollen-Zuweisungen belohnen nicht die Verwaltungsaktion. Sie dokumentieren, welcher Member an welchem Release in welcher Rolle tatsächlich gearbeitet hat.
- **D-02:** Die kleinste punktfähige Rollenquelle ist `Member × Release × Rolle`. Jede solche tatsächliche Leistung gibt genau 1 Punkt; alle Rollen sind gleich gewichtet.
- **D-03:** Mehrere Members dürfen dieselbe Rolle am selben Release gemeinsam ausüben. Jede tatsächlich beteiligte Person erhält ihre eigene Einheit.
- **D-04:** Release-Version-Texte und Release-Version-Medien bleiben ausschließlich Phase 107.1. Metadatenpflege bleibt vollständig punktelos, weil sie derzeit Plattform-Admin-Arbeit ist.
- **D-05:** Der bestehende Anime-/Fansub-Projekttext ist die einzige weitere Textquelle dieser Phase. Der Member des Leaders, der erstmals einen nichtleeren Projekttext speichert, erhält einmalig 5 Punkte. Es gibt dafür keine Fremdprüfung.
- **D-06:** Rollenpunkte gehören ausschließlich dem fachlich beteiligten `member`, niemals dem eintragenden Leader oder dessen `app_user`.
- **D-07:** Ein Account oder Login ist nicht erforderlich. Eine historische Person wird zuerst als dauerhafte historische Member-Identität angelegt und danach den Releases und Rollen zugeordnet.
- **D-08:** Projekttext-Punkte gehören dem Member des tatsächlichen ersten Autors. Fehlt dem schreibenden Leader eine Member-Verknüpfung, entsteht keine Buchung. Spätere Bearbeiter erhalten keine Punkte.
- **D-09:** Eintragen, Bestätigen, Ändern, Entfernen oder Korrigieren von Besetzungen erzeugt keine zusätzlichen Verwaltungs- oder Review-Punkte.
- **D-10:** Jeder Release speichert eine vollständige eigene Besetzung mit allen beteiligten Members und Rollen. Die heutige Backend-Auflösung „irgendein Release-Eintrag ersetzt das gesamte Projektteam beim Lesen“ ist nicht das Zielmodell.
- **D-11:** Beim Anlegen eines Releases wird die zu diesem Zeitpunkt aktuelle Projektbesetzung vollständig als Release-Snapshot gespeichert. Der Release-Editor lädt und bearbeitet immer diesen vollständigen gespeicherten Satz.
- **D-12:** Solange ein Release noch nie individuell bearbeitet wurde, werden spätere Projektteam-Änderungen in seinen Snapshot fortgeführt. Neu angelegte Releases übernehmen ebenfalls die jeweils aktuelle Projektbesetzung.
- **D-13:** Nach der ersten individuellen Bearbeitung wird die vollständige Release-Besetzung unabhängig. Spätere Projektteam-Änderungen verändern sie nicht, und es gibt weder automatische Teilzusammenführung noch eine Aktion „Projektbesetzung neu übernehmen“.
- **D-14:** Das Anpassen einer Rolle an einem Release beeinflusst andere Rollen nicht. Beispiel: Projektweit gelten Gon/Übersetzung, Mia/QC und Anton/Edit. Wird Release 176 auf Gon/Übersetzung+QC und Anton/Edit geändert, verliert nur Mia die QC-Einheit; Anton bleibt beteiligt.
- **D-15:** Jede Rollen- oder Besetzungsänderung und alle daraus folgenden Ledger-Buchungen beziehungsweise Gegenbuchungen committen atomar: vollständig oder gar nicht.
- **D-16:** Wiederholtes Speichern oder Wiederholen desselben Requests erzeugt keine Doppelpunkte. Der fachliche Quellenschlüssel muss Member, realen Release und Rolle stabil adressieren.
- **D-17:** Falsch dokumentierte oder später entfernte Leistungen werden nicht aus dem append-only Punktebuch gelöscht. Ihre ursprünglichen Buchungen bleiben erhalten und werden genau einmal durch nachvollziehbare Gegenbuchungen storniert.
- **D-18:** Wird eine Besetzung korrigiert, werden alle wegfallenden Einheiten storniert und alle neu hinzukommenden Einheiten in derselben fachlichen Aktion gebucht.
- **D-19:** Wird der Projekttext vollständig gelöscht, werden seine 5 Punkte storniert. Ein später neu angelegter Projekttext kann einmalig 5 Punkte für seinen dann ersten Autor erzeugen.
- **D-20:** Team4s verwendet disponible Testdaten. Phase 108 plant und implementiert keine Bestandsdatenmigration, historische Nachbuchung, keinen Backfill und keine Übergangskompatibilität für bestehende Rows.
- **D-21:** „Historischer Member“ und „historische Fansub-Leistung“ beschreiben reale Personen und frühere Arbeit, nicht einen technischen Import. Diese Daten werden frisch über den kanonischen Produktfluss erfasst und dabei unmittelbar nach den neuen Regeln gebucht.
- **D-22:** Schema-Migrationen für die neue Struktur sind erlaubt und bleiben der normale technische Mechanismus. Nur die Übernahme oder Erhaltung vorhandener Testdaten ist ausdrücklich ausgeschlossen.

### the agent's Discretion

- Exakte Namen für Snapshot-/Synchronisationsstatus, Point-Rule-Codes, SourceRefs und Audit-Events, solange die Entscheidungen oben und die bestehenden Phase-106-Seams eingehalten werden.
- Die konkrete transaktionale Service-/Repository-Aufteilung, sofern kein paralleles Punktebuch, keine zweite Member-Identität und keine neue Universal-Contribution-Domain entstehen.

### Deferred Ideas (OUT OF SCOPE)

- Ranglisten und öffentliche Darstellung historischer Members bleiben in den dafür vorgesehenen späteren Phasen.
- Keine offenen Todos wurden in Phase 108 übernommen; die automatisch vorgeschlagenen UI-/Media-Todos waren nicht Teil dieses Quellenadapter-Scopes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAM-01 | Punkte gehören einer stabilen `members`-Identität; `app_user` ist nur optionaler Akteur. | Member-Auflösung und historische Personen ohne Login werden über die vorhandene `members`-/`hist_fansub_group_members`-Kette beibehalten. [VERIFIED: `.planning/REQUIREMENTS.md`, `database/migrations/0086_anime_contributions.up.sql`] |
| GAM-02 | Append-only Ledger mit fachlicher Quelle, Kontext, Regel-Snapshot, Storno und paralleler Idempotenz. | Die Adapter verwenden ausschließlich `PointService.CreditInTx`/`ReverseInTx` und stabile SourceRefs. [VERIFIED: `backend/internal/services/point_service.go`] |
| GAM-03 | Zentraler unveränderlicher Punktekatalog; Aufrufer setzen weder Wert noch freien Idempotenzschlüssel. | Zwei neue feste Regelzeilen, 1 und 5 Punkte, werden per Migration ergänzt; Werte werden vom Repository geladen. [VERIFIED: `backend/internal/repository/point_rules_repository.go`, `database/migrations/0131_member_point_foundation.up.sql`] |
| GAM-04 | Fansub-Leistung und Plattformbeiträge bleiben unterscheidbar; Profilpflege ist punktelos. | Rollenregel gehört `fansub_work`, Projekttextregel `platform_contribution`; weitere Metadaten bleiben außerhalb des Adapters. [VERIFIED: `.planning/phases/108-bestehende-beitragsquellen-anbinden/108-CONTEXT.md`] |
| GAM-05 | Rein additive Integration, abgesichert durch Migration-, Idempotenz-, Storno- und Parallelitätstests. | Die Phase erweitert bestehende Contributions/Notes und das Ledger, ohne Media-/Upload-Flows anzufassen. [VERIFIED: `AGENTS.md`, `.planning/ROADMAP.md`] |
| P107-SC1–SC6 / P1071-SC1–SC6 | Vorhandenes Review-/Release-Review-Fundament bleibt kanonisch. | Rollen und Projekttext erhalten keinen neuen Review-Lebenszyklus; Release-Version-Notes/-Media werden nicht erneut verdrahtet. [VERIFIED: Phase-107/107.1 CONTEXT.md] |
</phase_requirements>

## Summary

Phase 108 sollte als zwei schmale transaktionale Anwendungsservices geplant werden: (1) ein vollständiger Release-Besetzungs-Snapshot mit serverseitigem Set-Diff und (2) ein Projekttext-Credit-Lebenszyklus. Die existierende Leselogik ist all-or-nothing: Sobald irgendeine `anime_contributions`-Zeile mit `release_version_id` existiert, ersetzt dieser Teilsatz sämtliche Projekt-Defaults. Der aktuelle Drawer erzeugt beim ersten Speichern einzelne Upserts und Deletes per `Promise.all`; damit können Besetzung, Snapshot-Status und Punkte nicht atomar sein. [VERIFIED: `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go`, `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx`]

Das Zielmodell braucht einen expliziten Snapshot-Zustand pro realer Release-Version und Fansubgruppe, empfohlen `inherited`/`independent`, sowie eine vollständige gespeicherte Menge in den vorhandenen `anime_contributions` und `anime_contribution_roles`. Release-Erstellung und Projektteam-Änderung rufen denselben Snapshot-Synchronisierer innerhalb ihrer bestehenden Transaktion auf; der erste release-spezifische Replace-Befehl setzt dauerhaft `independent`. [VERIFIED: D-10–D-15 in `108-CONTEXT.md`; bestehende Transaktionsmuster in `anime_contributions_upsert_repository.go`] 

Für Punkte bleibt `PointService` die einzige Buchungsseam. Ein SourceRef pro `Member × Release-Version × Rolle` ermöglicht genau einen Award; entfernte Einheiten finden ihren wirksamen Award und rufen `ReverseInTx` auf. Der Projekttext benötigt zusätzlich eine kleine persistente Credit-Quelle, weil Soft-Delete und spätere Neuanlage einen neuen fachlichen Lebenszyklus bilden müssen und die erste Autoren-Member-ID nicht zuverlässig aus dem aktuellen Textrow rekonstruiert werden kann. [VERIFIED: `point_service.go`, `point_ledger_repository.go`, `anime_project_notes_repository.go`]

**Primary recommendation:** Einen serverseitigen `ReplaceReleaseCrew`-Befehl und einen transaktionalen Projekttext-Adapter bauen; UI und Import-/Erstellungspfade rufen diese Seams auf, niemals einzelne Contribution-Mutationen zur Orchestrierung.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snapshot speichern und Status wechseln | API / Backend | Database / Storage | Der Server muss Vollständigkeit, Ownership und Transaktion erzwingen. [VERIFIED: AGENTS.md] |
| Projektteam in neue/unbearbeitete Releases synchronisieren | API / Backend | Database / Storage | Synchronisation ist eine Domain-Mutation, kein UI-Fallback. [VERIFIED: D-11–D-13] |
| Rollen-/Textpunkte und Stornos | API / Backend | Database / Storage | `PointService.*InTx` hält Domainmutation und Ledger atomar. [VERIFIED: `point_service.go`] |
| Member-Auflösung des Leaders | API / Backend | Database / Storage | Der Browser darf Empfänger nicht frei bestimmen. [VERIFIED: D-06–D-08] |
| Vollständigen Snapshot bearbeiten | Browser / Client | API / Backend | Der Drawer editiert ein Set, sendet aber genau einen Replace-Request. [VERIFIED: bestehender `ReleaseContributionDrawer.tsx`] |
| Idempotenz und Parallelität | Database / Storage | API / Backend | Unique Keys, Row-/Advisory-Locks und Transaktionen entscheiden bei Retries. [VERIFIED: `point_ledger_entries`, `anime_contributions_upsert_repository.go`] |

## Project Constraints (from AGENTS.md)

- Anime und Episoden bleiben neutral; Fansub-Kontext gehört Gruppen, Releases und Release-Versionen. [VERIFIED: `AGENTS.md`]
- `fansub_releases` gehören Episoden, `release_versions` gehören Releases, `release_version_groups.fansub_group_id` ist der kanonische Gruppenanker. [VERIFIED: `AGENTS.md`]
- Keine parallele Contribution-, Member-, Media-, Upload- oder Ledger-Domain erfinden; bestehende Seams zuerst erweitern. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`]
- API-Änderungen müssen Backend, `shared/contracts/openapi.yaml`, gegebenenfalls `admin-content.yaml`, Frontend-Typen und `frontend/src/lib/api.ts` gemeinsam aktualisieren. [VERIFIED: `docs/api/api-contracts.md`]
- Disponible Testdaten: keine Migration, Erhaltung, Nachbuchung, Reconciliation oder Kompatibilität bestehender Rows; neue reversible Schema-Migrationen sind erlaubt. [VERIFIED: `AGENTS.md`]
- Vor neuer Migration `git status` und Migrationskette prüfen; historische Migrationen nie editieren. [VERIFIED: `AGENTS.md`]
- Geschützte UI nutzt den zentralen Auth/API-Client und muss den gültigen Refresh-Session-Fall testen. [VERIFIED: `AGENTS.md`]
- Deutsche UI- und HTTP-Texte verwenden korrekte Umlaute. [VERIFIED: `AGENTS.md`]
- Relevante Typecheck-, Lint-, Test-, Build-, Migration-Up/Down- und `git diff --check`-Prüfungen ausführen. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Library / Seam | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Go | 1.26.1 lokal | Transaktionaler Service/Repository-Code | Bestehendes Backend. [VERIFIED: `go version`] |
| pgx/v5 | Projektversion in `backend/go.mod` | PostgreSQL-Transaktionen und Locks | `PointService` und Contributions verwenden `pgx.Tx`. [VERIFIED: Codebase grep] |
| PostgreSQL | Projektcontainer; lokales `psql` fehlt | Constraints, Unique Keys, atomare Ledger-Mutationen | Bestehendes Ledger erzwingt Append-only und Idempotenz in der DB. [VERIFIED: Migration 0131] |
| PointService | intern, Phase 106 | Awards und Reversals | Einzige erlaubte Punktebuchungsseam. [VERIFIED: `108-CONTEXT.md`] |
| React / Next.js | React 18.3.1 / Next 16.1.6 | Bestehenden Drawer und API-Client anpassen | Bereits installierter Frontend-Stack. [VERIFIED: `frontend/package.json`] |
| Vitest | 3.2.4 | Frontend-Helper-/Drawer-Regressionen | Bestehendes Testscript `vitest run`. [VERIFIED: `frontend/package.json`] |

### Supporting

| Seam | Purpose | When to Use |
|------|---------|-------------|
| `AnimeContributionsRepository` | Bestehende Member-/Anime-/Release-Contribution-Persistenz | Intern im neuen Snapshot-Repository, nicht als mehrere HTTP-Aufrufe. [VERIFIED: repository files] |
| `FansubNotesRepository` | Kanonischer Projekttext-Store | Über transaktionale Variante/Service erweitern. [VERIFIED: `anime_project_notes_repository.go`] |
| `apiClientFetch` / zentrale Helpers | Geschützte Browserrequests | Für den neuen Replace-Endpunkt und veränderte Note-Responses. [VERIFIED: `frontend/src/lib/api.ts`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expliziter Snapshot-Status | „Existiert irgendeine Release-Zeile?“ | Ist der nachgewiesene fehlerhafte all-or-nothing Fallback und kann „leere unabhängige Besetzung“ nicht darstellen. [VERIFIED: current repository/drawer] |
| Ein Replace-Endpunkt | Bestehende Upsert/Delete-Endpunkte parallel aufrufen | Verletzt Atomizität und kann Teilerfolge/Punktedrift erzeugen. [VERIFIED: D-15, current drawer] |
| Bestehende `anime_contributions` | Neue Universal-Contribution-Tabelle | Verletzt die locked Domain-Grenze und dupliziert Ownership. [VERIFIED: D-04, discretion] |

**Installation:** Keine neue Runtime-Bibliothek erforderlich. [VERIFIED: alle benötigten Transaktions-/Testseams existieren]

## Architecture Patterns

### System Architecture Diagram

```text
Release creation/import ─┐
Project crew replace ────┼─> ReleaseCrewService (one DB transaction)
Release drawer replace ──┘       │
                                 ├─ validate release-version/group/anime context
                                 ├─ lock snapshot context
                                 ├─ compute old/new Member×Role set diff
                                 ├─ replace complete anime_contributions + roles
                                 ├─ set inherited/independent state
                                 └─ PointService CreditInTx / ReverseInTx
                                                    │
                                                    v
                                      immutable point_ledger_entries

Project note upsert/delete ─> ProjectNoteCreditService (one DB transaction)
                                 ├─ resolve actor app_user -> member or none
                                 ├─ detect empty/non-empty lifecycle edge
                                 ├─ mutate anime_fansub_project_notes
                                 └─ award/reverse project-note credit
```

### Recommended Project Structure

```text
backend/internal/
├── services/
│   ├── release_crew_service.go
│   └── project_note_credit_service.go
├── repository/
│   ├── release_crew_snapshot_repository.go
│   └── anime_project_notes_repository.go
├── handlers/
│   ├── admin_content_fansub_releases_contributions_handlers.go
│   └── admin_content_anime_project_notes.go
database/migrations/
├── 0137_phase108_contribution_sources.up.sql
└── 0137_phase108_contribution_sources.down.sql
frontend/src/
├── app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
├── lib/api.ts
└── types/fansub.ts
shared/contracts/
├── openapi.yaml
└── admin-content.yaml
```

Migration number `0137` is currently the next tracked number, but execution must re-check `git status` and untracked migrations immediately before creation. [VERIFIED: migration directory and `git status` on 2026-07-24]

### Pattern 1: Complete-set replace with semantic diff

**What:** Normalize request rows into a unique set `(member_id, role_code)`, lock `(release_version_id, fansub_group_id)`, load the previous complete set, compute `removed` and `added`, replace persistence, then reverse/credit only the diff. [VERIFIED: D-14–D-18]

**When to use:** Release drawer save, release creation seed, and inherited snapshot sync.

```go
// Source: project PointService and anime contribution transaction patterns
tx, err := pool.Begin(ctx)
// lock snapshot context
before := loadCrewUnitsForUpdate(ctx, tx, versionID, groupID)
after := normalizeRequestedUnits(request.Rows)
replaceStoredCrew(ctx, tx, versionID, groupID, after, mode)
for _, unit := range difference(before, after) {
    award := findEffectiveAward(ctx, tx, unit.SourceRef())
    pointService.ReverseInTx(ctx, tx, reverseCommand(award))
}
for _, unit := range difference(after, before) {
    pointService.CreditInTx(ctx, tx, unit.CreditCommand())
}
return tx.Commit(ctx)
```

### Pattern 2: Stable role-unit source

**What:** Recommended source type `release_role_contribution`, source key `release-version:{id}:member:{id}:role:{code}`, and slot `role:{code}`. This contains real release identity, beneficiary, and role without caller-controlled arbitrary idempotency. [VERIFIED: `PointService.buildCreditIdempotencyKey`; naming is agent discretion]

**Important:** `PointService` presently stores only `release_version_id`, not `fansub_release_id`; use the real `release_version_id` consistently because current contributions and UI are version-scoped. Do not silently use the list-level `release_id` in one layer and version ID in another. [VERIFIED: current schema/API; D-16]

### Pattern 3: Re-award after reversal

`PointService` idempotency makes an award key permanently unique, even after reversal. Therefore remove → later re-add of the same `Member × Release × Role` cannot use the identical award key and produce a new effective point. The plan must make the product rule explicit. Recommended: treat the semantic unit as one lifetime award whose reversal is undone only by a new versioned occurrence/generation stored on the source state, e.g. `generation=2`; never delete or mutate ledger history. [VERIFIED: unique `idempotency_key`, unique direct reversal; D-17 permits later corrections but does not explicitly settle same-unit re-add]

This is the only unresolved domain edge that should be locked before implementation; tests must cover it if re-add is supported. [ASSUMED]

### Pattern 4: Project-note lifecycle record

**What:** Store one small adapter-owned lifecycle row per active note credit occurrence with note/context identity, first-author member, award entry ID, and generation/status. The content remains exclusively in `anime_fansub_project_notes`. [VERIFIED: note row lacks member author and ledger lookup API; D-19]

**When to use:** First transition from empty/absent to non-empty, deletion reversal, and later recreation.

### Anti-Patterns to Avoid

- **Reading fallback as snapshot:** A read-time fallback is not stored state and cannot distinguish never edited from empty independent. [VERIFIED: current repository]
- **Frontend transaction orchestration:** `Promise.all` cannot provide database atomicity. [VERIFIED: current drawer]
- **Delete ledger awards:** Ledger is append-only; use `ReverseInTx`. [VERIFIED: migration 0131]
- **Rewarding actor:** Actor is audit context only; beneficiary comes from `member_id`. [VERIFIED: D-06–D-08]
- **Synchronizing independent releases:** Project changes only touch status `inherited`. [VERIFIED: D-12–D-13]
- **Backfill phase:** Reset/reseed disposable data instead. [VERIFIED: D-20–D-22]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Points/idempotency | Direct ledger INSERTs or caller keys | `PointService.CreditInTx` | Loads immutable rule and derives key. [VERIFIED: service code] |
| Storno | Delete/update award | `PointService.ReverseInTx` | Locks original and enforces one matching reversal. [VERIFIED: repository code] |
| Member identity | New credit-person table | `members` via existing historical group membership | Supports people without accounts. [VERIFIED: GAM-01, schema] |
| Release ownership | Episode-scoped credits | Existing release-version contribution context | Prevents wrong entity attachment. [VERIFIED: AGENTS.md] |
| Protected fetch/auth | Component bearer/fetch logic | `frontend/src/lib/api.ts` central client | Preserves refresh session. [VERIFIED: auth rules] |
| Note content | New contribution text store | `anime_fansub_project_notes` | It is the canonical project text. [VERIFIED: domain doc] |

## Common Pitfalls

### Pitfall 1: A partial override erases unrelated roles

**What goes wrong:** Saving Gon’s QC row makes Mia/Anton disappear because any release row replaces all defaults.  
**How to avoid:** Persist and replace the entire release set; regression-test Gon/Mia/Anton Release 176. [VERIFIED: current query, D-14]

### Pitfall 2: Creation hook fires before group links exist

The Jellyfin import creates release/version first, then writes `release_version_groups`. Snapshot seeding needs the final group selection and anime/group context, so hook it after `upsertReleaseVersionGroup`, inside the same surrounding import transaction. [VERIFIED: `episode_import_repository_release_helpers.go`]

### Pitfall 3: Existing repositories own their own transaction

`AnimeContributionsRepository.CreateOrUpdate` begins/commits internally, so calling it from a larger service cannot make points atomic. Add `...InTx`/DBTX variants or a dedicated snapshot repository; do not nest independent transactions. [VERIFIED: `anime_contributions_upsert_repository.go`]

### Pitfall 4: Empty text semantics differ across rich-text fields

Use the server-produced plaintext (`body_text` trimmed) as the non-empty predicate, not HTML/JSON shell content. [VERIFIED: current TipTap note fields; exact predicate recommended from stored plaintext]

### Pitfall 5: Leader has app_user but no member

Resolve through the existing app-user/member anchor; if none, persist the text normally but skip credit. Never create a member implicitly merely to award points. [VERIFIED: D-07–D-08]

### Pitfall 6: Sync creates administrative points

Snapshot seeding/sync records the real Member×Release×Role work and therefore awards that unit, but the actor performing sync receives no separate award/review credit. [VERIFIED: D-01, D-09]

## Code Examples

### Set-level DTO

```typescript
// Source: existing ReleaseContributionDrawer row shape; proposed contract
export interface ReplaceReleaseCrewRequest {
  rows: Array<{ member_id: number; role_codes: string[] }>
}
export interface ReleaseCrewResponse {
  data: EffectiveContributionRow[]
  meta: { snapshot_mode: 'inherited' | 'independent' }
}
```

### Point commands

```go
// Source: backend/internal/services/point_service.go
_, err := points.CreditInTx(ctx, tx, services.CreditCommand{
    MemberID: unit.MemberID,
    ActorAppUserID: &actorID,
    FansubGroupID: &groupID,
    ReleaseVersionID: &versionID,
    Source: services.SourceRef{
        RewardKind: services.RewardKindWork,
        Type: "release_role_contribution",
        Key: unit.SourceKey(),
        Slot: "role:" + unit.RoleCode,
    },
    Rule: services.RuleRef{Code: "release_role_work", Version: 1},
    EffectiveAt: now,
})
```

## State of the Art

| Old Approach | Current Phase-108 Approach | Impact |
|--------------|----------------------------|--------|
| Read-time project fallback | Complete stored snapshot from creation | Editor always sees persisted truth. [VERIFIED: D-10–D-11] |
| Any release row means full override | Explicit inherited/independent status | Empty/partial states are unambiguous. [VERIFIED: D-12–D-14] |
| Multiple row HTTP mutations | One complete-set Replace | Domain and ledger commit atomically. [VERIFIED: D-15] |
| Note stores only app-user audit | Separate first-author member credit lifecycle | Correct beneficiary without changing content ownership. [VERIFIED: D-08, current schema] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | No unresolved Phase-108 implementation assumption remains. D-19a fixes restoration semantics, and live code inspection fixes both creation and project-roster mutation boundaries. | Architecture Pattern 3; Open Questions (RESOLVED) | — |

## Open Questions (RESOLVED)

1. **Does re-adding the exact same Member×Release×Role after reversal create a fresh effective point?**
   - Resolution: D-19a requires a new append-only restoration booking that restores exactly one effective point. Persist a source generation and increment it only when a reversed identical tuple becomes valid again; retries and unchanged saves remain idempotent. [VERIFIED: D-19a]

2. **What are the canonical release-creation surfaces?**
   - Resolution: Live grep found exactly two runtime callers of the shared `createFansubRelease`/`createReleaseVersion` helpers: Jellyfin/import creation in `upsertImportReleaseGraph` (`backend/internal/repository/episode_import_repository_release_helpers.go`) and manual/admin creation in `EpisodeVersionRepository.Create` (`backend/internal/repository/episode_version_repository.go`). Both establish ownership through `upsertReleaseVersionGroup` or `syncEpisodeVersionSelectedGroups` before commit. Both must invoke the reusable ReleaseCrewService inside their existing `pgx.Tx` after `release_version_groups` exists, so snapshot seeding and one award per Member×Release×Role are atomic with creation. [VERIFIED: live `rg` and both transaction bodies, 2026-07-24]

3. **Which project-roster mutations must synchronize inherited release snapshots?**
   - Resolution: The canonical admin create and update boundaries are `FansubAnimeContributionsHandler.CreateAnimeContribution` and `.UpdateAnimeContribution` in `backend/internal/handlers/fansub_anime_contributions_handler.go`; delete is `DeleteAnimeContribution` in `backend/internal/handlers/fansub_anime_contributions_delete_handler.go`. They currently call transaction-owning `AnimeContributionsRepository.CreateOrUpdate`, `.Update`, and `.Delete`. Phase 108 must route successful anime-level (`release_version_id IS NULL`) add/change/remove mutations through one ReleaseCrewService transaction command using DBTX repository variants, synchronize and point-diff inherited snapshots only, and leave independent snapshots byte-for-byte unchanged. Release-version-specific contribution mutations are handled by the release complete-set command and must not be treated as project-roster changes. [VERIFIED: live handlers/repositories, 2026-07-24]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Go | Backend tests | ✓ | 1.26.1 | — |
| Node.js | Frontend tests | ✓ | 24.14.0 | — |
| npm | Frontend tests | ✓ | 11.9.0 | — |
| Docker | PostgreSQL migration/integration tests | ✓ | 29.6.1 | Project test containers |
| `psql` CLI | Manual DB inspection only | ✗ | — | pgx/Docker test harness |

**Missing dependencies with no fallback:** None. [VERIFIED: local probes]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend | Go `testing` + testify + project PostgreSQL test support [VERIFIED: existing tests] |
| Frontend | Vitest 3.2.4 + Testing Library 16.3.0 [VERIFIED: package.json] |
| Quick backend | `cd backend; go test ./internal/services ./internal/repository ./internal/handlers` |
| Migration | `cd backend; go test ./internal/migrations -run Phase108 -count=1` |
| Frontend focused | `cd frontend; npm test -- ReleaseContributionDrawer` |
| Full | `cd backend; go test ./...` and `cd frontend; npm test && npm run typecheck && npm run lint` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|--------------|
| D-10–D-14 | Complete snapshots, inherited sync, independence | PostgreSQL repository/service | `go test ./internal/services -run ReleaseCrew -count=1` | ❌ Wave 0 |
| D-14 | Gon/Mia/Anton Release 176 only reverses Mia QC, adds Gon QC, leaves Anton | PostgreSQL integration | same | ❌ Wave 0 |
| D-15–D-18 | Mutation+award/reversal atomic, retry/concurrency safe | service/integration | `go test ./internal/services -run ReleaseCrew -count=20` | ❌ Wave 0 |
| D-05, D-08, D-19 | First non-empty author 5, no-member skip, delete reversal, recreate | service/integration | `go test ./internal/services -run ProjectNoteCredit -count=1` | ❌ Wave 0 |
| API contract | One Replace request and snapshot metadata | handler/helper | focused Go/Vitest | ❌ Wave 0 |
| Auth | Missing access token + valid refresh still saves protected action | frontend helper regression | `npm test -- api.auth-refresh` | ✅ extend |
| Migration | Up/down schema/rules; down refuses unsafe ledger history if applicable | PostgreSQL migration | migration command above | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** focused package/test file under 30 seconds.
- **Per wave merge:** backend affected packages + frontend focused tests/typecheck.
- **Phase gate:** full backend/frontend suite, migration up/down, lint/build where feasible, and `git diff --check`.

### Wave 0 Gaps

- [ ] `backend/internal/services/release_crew_service_test.go`
- [ ] `backend/internal/services/project_note_credit_service_test.go`
- [ ] `backend/internal/migrations/phase108_contribution_sources_test.go`
- [ ] `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` — extend Replace contract
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx`
- [ ] Focused `frontend/src/lib/api` contract test for the Replace helper

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing central session/API client; no new auth seam. [VERIFIED: AGENTS.md] |
| V3 Session Management | yes | Valid refresh session must permit protected save. [VERIFIED: AGENTS.md] |
| V4 Access Control | yes | Existing group/release permissions plus server-side context validation. [VERIFIED: handlers/permission rules] |
| V5 Input Validation | yes | Unique members/roles, known role codes, matching group/anime/release context. [VERIFIED: existing repositories] |
| V6 Cryptography | no | No cryptographic operation in phase scope. [VERIFIED: phase boundary] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rewarding another group/release through forged IDs | Elevation/Tampering | Validate joined release-version → release → episode/anime and `release_version_groups` context inside transaction. |
| Duplicate credits through retries/concurrency | Tampering | Stable source refs, unique ledger key, context lock, `CreditInTx`. |
| Partial crew save with point drift | Tampering | One transaction around set replacement and ledger diff. |
| Actor credited instead of worker | Spoofing | Beneficiary exclusively from stored member contribution; actor only audit field. |
| Lost refresh treated as logout | Denial of service | Central API client refresh regression test. |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/108-bestehende-beitragsquellen-anbinden/108-CONTEXT.md` — locked product decisions.
- `AGENTS.md` and `docs/engineering/implementation-contract.md` — domain, reuse, disposable-data, validation constraints.
- `docs/architecture/db-schema-fansub-domain.md` — canonical fansub/release/member ownership.
- `backend/internal/services/point_service.go` and point repositories — current point API/idempotency/reversal behavior.
- `database/migrations/0131_member_point_foundation.up.sql` — database invariants.
- Contributions, release import, project-note repositories and handlers — current live paths.
- `ReleaseContributionDrawer.tsx`, `frontend/src/lib/api.ts`, contracts/types — current browser/API seam.

### Secondary (MEDIUM confidence)

- None; this phase is codebase- and locked-decision-driven.

### Tertiary (LOW confidence)

- None beyond A1, explicitly logged as assumed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed project/runtime and source.
- Architecture: HIGH — derived from locked decisions and exact current transaction/read paths.
- Pitfalls: HIGH — directly reproduced from code structure and DB constraints.

**Research date:** 2026-07-24  
**Valid until:** 2026-08-23, or immediately after Phase 106–107.1 schema/service changes.
