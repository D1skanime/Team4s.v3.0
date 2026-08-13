# Phase 68: Badge-Engine und Archiv-Entdeckung — Research

**Researched:** 2026-06-02
**Domain:** Go-Service-Erweiterung (Badge-Engine), Leader-CRUD (History), öffentliche Suchroute (Archiv)
**Confidence:** HIGH (alle Befunde aus Codebase direkt verifiziert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Badges bleiben hardcoded im `badge_service` (je Regel eine Funktion). Keine datengetriebene Tabelle.
- **D-02:** Bestehende Badges bleiben: `founding_member`, `historical_leader`, `long_term_member`.
- **D-03:** Neue Badges: Erster Beitrag, Produktiv (gestuft), Verifiziert, Allrounder.
- **D-04:** Spezialist pro Rolle ist zurückgestellt.
- **D-05:** Konkrete Schwellenwerte via Research (diese Datei), Nutzer bestätigt.
- **D-06:** Recompute event-getrieben + Admin-Backfill (Befehl/Endpoint).
- **D-07:** Ausgeblendete Badges (`visibility='hidden'`) bleiben erhalten — Recompute berührt `visibility` nie.
- **D-08:** Badge-Entzug via `status='revoked'` wenn Bedingung nicht mehr erfüllt.
- **D-09:** Leader pflegt gesamte Gruppen-Historie (alle `event_type`-Werte).
- **D-10:** Pflichtfeld Titel, Jahr + Note optional.
- **D-11:** Leader-Einträge sofort `status='confirmed'`.
- **D-12:** Inline-Abschnitt in `manage/groups/[id]`, Progressive Disclosure.
- **D-13:** Neue öffentliche Route `/archiv`.
- **D-14:** Filter Rolle/Zeitraum/Gruppe alle optional und UND-verknüpft.
- **D-15:** Nur öffentlich sichtbare Member/Contributions (`is_public_on_member_profile`).
- **D-16:** Profil-Karten paginiert, Sortierung via Research.
- **D-17:** Deutsche Strings mit korrekten Umlauten überall.

### Claude's Discretion

- Konkrete Schwellenwerte der gestuften/Allrounder-Badges.
- Mechanik des Admin-Backfills (CLI vs. Admin-Endpoint).
- Genaue Recompute-Trigger-Punkte.
- Query-Strategie der Archiv-Suche.
- Handler/Repo/Service-Aufteilung unter 450-Zeilen-Limit.

### Deferred Ideas (OUT OF SCOPE)

- Spezialist pro Rolle (D-04)
- Datengetriebene `badge_definitions`-Tabelle (D-01)
- Ablösung `release_member_roles` (eigene Cleanup-Phase aus Phase 67)
- Sortier-Score/Relevanz-Tuning der Archiv-Suche
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P68-SC1 | Badge-Engine berechnet alle definierten Badges aus Contributions und aktualisiert member_badges bei Datenänderungen. | Badge-Service-Erweiterung + Recompute-Trigger in Contribution-Handlern + Admin-Backfill-Befehl |
| P68-SC2 | Leader kann Meilensteine für die Gruppe manuell eintragen; Meilensteine erscheinen in der Gruppen-Timeline. | `fansub_group_history`-Handler besitzt bereits Create/Update/Delete; fehlender Delete-Endpunkt im Frontend + Leader-Auth-Gate |
| P68-SC3 | Archiv-Suche erlaubt Filtern nach Rolle, Zeitraum und Gruppe und gibt Member-Profile zurück. | Neue öffentliche Route + Such-Repository + `/archiv`-Frontend-Seite |
</phase_requirements>

---

## Summary

Phase 68 baut auf einer vollständig vorhandenen Datenbankinfrastruktur auf. Der `badge_service.go` besitzt drei Berechnungsfunktionen und ein idempotentes Upsert-Muster (`UpsertMemberBadge`); die neuen vier Badges folgen exakt demselben Schema. Die `fansub_group_history`-Tabelle und ihr Repository (`ListByFansub`, `Create`, `Update`, `Delete`) existieren vollständig — im Handler fehlt lediglich der Delete-Endpunkt sowie die Leader-Authprüfung. Die Archiv-Suche ist vollständig neu, kann aber Patterns aus `anime_contributions_public_repository.go` (UND-Filter, `is_public_on_member_profile`) und die Profil-Komponenten aus `frontend/src/components/profile/` direkt wiederverwenden.

**Kernerkenntnis zur Datenlage:** `member_claims` hat keine `category`-Spalte. Die Verifiziert-Badge-Bedingung lautet `claim_status = 'verified'` — nicht `category = 'platform'`. Der CONTEXT.md-Text „Kategorie platform" ist eine UX-Beschreibung, nicht ein DB-Spaltenwert. [VERIFIED: Codebase]

**Primäre Empfehlung:** Badge-Service in zwei Dateien aufteilen (`badge_service.go` ≤ 450 Zeilen halten); Admin-Backfill als neuer `migrate`-Subbefehl `backfill-badges` (Präzedenz: `backfill-phase-a-metadata`); Archiv-Suche mit Offset-Pagination und 20 Ergebnissen pro Seite.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Badge-Berechnung | API / Backend (Service) | — | Datengetrieben, kein kritischer Pfad, kein Frontend-State |
| Recompute-Trigger | API / Backend (Handler) | — | Feuert nach Contribution-Mutation, Fehler werden geloggt |
| Admin-Backfill | Backend CLI (`cmd/migrate`) | — | Einmaliger/seltener Vollablauf; bestehende Präzedenz |
| Leader-CRUD Meilensteine | API / Backend (Handler + Repo) | Frontend (manage/groups/[id]) | Bestehender Handler, fehlender Delete-Endpunkt + Frontend-UI |
| Archiv-Suche (Query) | API / Backend (Repository) | — | Komplexe UND-Filter-Query, Sichtbarkeits-Enforcement |
| Archiv-Seite (`/archiv`) | Frontend (Next.js App Router) | — | Neue öffentliche Seite mit Profil-Karten |

---

## Standard Stack

Keine neuen externen Abhängigkeiten. Phase 68 nutzt ausschließlich den vorhandenen Stack.

| Ebene | Bestandteile | Hinweis |
|-------|-------------|---------|
| Backend | Go 1.25, Gin, pgx/v5, pgxpool | unverändert |
| Frontend | Next.js 16 App Router, React 18, TypeScript | unverändert |
| Datenbank | Postgres 16 (bereits laufend) | neue Indizes benötigt |

**Keine `npm install` und keine `go get` nötig.** Kein Package-Legitimacy-Audit erforderlich.

---

## Package Legitimacy Audit

*Entfällt — keine neuen externen Pakete in dieser Phase.*

---

## Befund 1: Badge-Schwellenwerte (D-05)

### Datenbasis

Aus `0086_anime_contributions.up.sql` [VERIFIED: Codebase]:
- `anime_contributions`: Eine Zeile pro Member × Anime × (optional) release_version.
- Status-Werte: `draft`, `proposed`, `confirmed`, `disputed`, `hidden`.
- „Bestätigt" = `status = 'confirmed'`.

Aus `0085_role_definitions_seed.up.sql` [VERIFIED: Codebase]:
- **11 operative Rollen** mit `context = 'anime_contribution'`: `translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `project_lead`, `designer`, `admin`, `other`.
- Rollenzuordnung über `anime_contribution_roles`; ein Member kann pro Contribution mehrere Rollen haben (UNIQUE auf `(anime_contribution_id, role_code)`).
- Für Allrounder zählt COUNT(DISTINCT acr.role_code) über alle Contributions des Members.

Aus `0081_historical_members_identity.up.sql` [VERIFIED: Codebase]:
- `member_claims`: Spalten `claim_status IN ('pending', 'verified', 'rejected')` — **keine `category`-Spalte**.
- Verifiziert-Badge-Bedingung: `claim_status = 'verified'` (mindestens 1 Zeile).

### Empfohlene Schwellenwerte

| Badge-Code | Bedingung | Empfohlener Schwellenwert | Begründung |
|------------|-----------|--------------------------|------------|
| `first_contribution` | ≥ 1 confirmed anime_contribution | status = 'confirmed', LIMIT 1 | Einziger Einstiegsbadge; tief halten |
| `productive_bronze` | N+ verschiedene Anime (confirmed) | **10 Anime** | Aktive Phase für typische Fansub-Member |
| `productive_silver` | N+ verschiedene Anime (confirmed) | **25 Anime** | Langjähriger, breiter Mitarbeiter |
| `productive_gold` | N+ verschiedene Anime (confirmed) | **50 Anime** | Sehr prolific; selten, motivierend |
| `all_rounder` | N+ verschiedene Rollen (confirmed) | **3 Rollen** | 11 Rollen verfügbar; 3+ signalisiert echte Bandbreite |
| `verified` | ≥ 1 verified member_claim | claim_status = 'verified' | Einfaches Boole'sches Kriterium |

**Anmerkung zu „Produktiv gestuft":** Drei Badge-Codes (`productive_bronze`, `productive_silver`, `productive_gold`) für die drei Stufen — so bleibt der UNIQUE-Constraint `(member_id, badge_code)` korrekt: Jede Stufe ist ein eigenständiger Badge. Ein Member kann alle drei tragen. Entzug greift separat: Sinkt der Wert unter 25, wird `productive_silver` auf `revoked` gesetzt, `productive_bronze` bleibt `active`.

**Anmerkung zu `all_rounder`:** Die Bedingung „N+ verschiedene Rollen" muss über alle Contributions des Members aggregieren (nicht pro Anime):
```sql
SELECT COUNT(DISTINCT acr.role_code)
FROM anime_contributions ac
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
WHERE hfgm.member_id = $1
  AND ac.status = 'confirmed'
```

---

## Befund 2: Recompute-Trigger-Punkte (D-06)

### Bestehende Trigger [VERIFIED: Codebase]

| Handler | Datei | Trigger-Methode | Wann |
|---------|-------|----------------|------|
| `FansubHistGroupMembersHandler` | `fansub_hist_group_members_handler.go` | `ComputeAndStoreBadges(memberID)` | nach Create/Update Mitgliedschaft |
| `FansubHistGroupMemberRolesHandler` | `fansub_hist_group_member_roles_handler.go` | `ComputeAndStoreBadgesByMembership(histMembershipID)` | nach Create/Update Rolle |

### Fehlende Trigger (müssen in Phase 68 ergänzt werden)

`FansubAnimeContributionsHandler` (`fansub_anime_contributions_handler.go`) ruft den Badge-Service **aktuell nicht auf**. Alle drei Mutations-Methoden müssen einen Recompute auslösen:

| Methode | Wann auslösen | Welche member_id |
|---------|--------------|-----------------|
| `CreateAnimeContribution` | nach erfolgreichem `CreateOrUpdate` | via `item.FansubGroupMemberID` → `hist_fansub_group_members.member_id` |
| `UpdateAnimeContribution` | nach erfolgreichem `Update` | dieselbe Lookup-Kette |
| `DeleteAnimeContribution` | nach erfolgreichem `Delete` | muss member_id **vor** dem Delete gelesen werden (Contribution ist danach weg) |

**Lookup-Pattern für member_id aus fansub_group_member_id:**
```go
// Analogie zu ComputeAndStoreBadgesByMembership (badge_service.go:43)
SELECT member_id FROM hist_fansub_group_members WHERE id = $1
```

Alternativ: `ComputeAndStoreBadgesForContribution(ctx, contributionID)` als neue BadgeService-Methode, die intern den Member auflöst — sauberere Abstraktion, der Handler kennt dann keine member_id direkt.

**Für Delete-Fall:** `contributionsRepo` muss vor dem Delete die `fansub_group_member_id` der Contribution lesen und daraus die `member_id` ableiten. Oder der Handler nutzt ein neues Repository-Hilfsmittel `GetMemberIDForContribution(ctx, contributionID)`.

### Recompute für `member_claims`-Mutationen (Verifiziert-Badge)

Phase 66 (Claiming/Verifizierung) ist pending. Wenn Phase 66 seinen Claiming-Handler implementiert, muss dort ebenfalls `ComputeAndStoreBadges(memberID)` aufgerufen werden. Das ist eine **Abhängigkeit**, die im Phase-68-Plan dokumentiert sein muss: Der Handler in Phase 66 muss einen Hook-Punkt anbieten oder Phase 68 ergänzt ihn nach.

### Admin-Backfill-Mechanik

**Empfehlung: CLI-Subbefehl im bestehenden `cmd/migrate`-Binary** [ASSUMED: Präzedenz aus Codebase; konkreter Aufrufort ist Ermessenssache]

Begründung:
- `cmd/migrate/main.go` enthält bereits `backfill-phase-a-metadata` mit exakt demselben Pattern: DB-Pool aufbauen, Service instanziieren, Report loggen.
- Ein Admin-Endpoint würde Auth und HTTP-Stack erfordern; für einen einmaligen Vollablauf ist CLI robuster.
- Aufruf: `./migrate backfill-badges [-database-url url]`
- Implementierung: neues `runBackfillBadges(args)` in `cmd/migrate/main.go`; iteriert alle `member_id`-Werte aus `members`, ruft `ComputeAndStoreBadges` auf, loggt Fehler.

---

## Befund 3: Gruppen-Meilenstein-CRUD (D-09..D-12)

### Vorhandene CRUD-Operationen [VERIFIED: Codebase]

| Operation | Repository | Handler | HTTP-Route (admin_routes.go) |
|-----------|------------|---------|------------------------------|
| List | `ListByFansub` ✓ | `ListGroupHistory` ✓ | GET `/admin/fansubs/:id/history` ✓ |
| Create | `Create` ✓ | `CreateGroupHistory` ✓ | POST `/admin/fansubs/:id/history` ✓ |
| Update/PATCH | `Update` ✓ | `UpdateGroupHistory` ✓ | PATCH `/admin/fansubs/:id/history/:historyId` ✓ |
| Delete | `Delete` ✓ | **FEHLT** | **FEHLT** |

**Lücke:** `FansubGroupHistoryHandler` hat **keinen** `DeleteGroupHistory`-Handler und es gibt **keine** DELETE-Route in `admin_routes.go`. `FansubGroupHistoryRepository.Delete` existiert bereits (`fansub_group_history_repository.go:197`). Der Implementierungsaufwand ist minimal.

### Status-Semantik für Leader-Einträge (D-11)

`fansub_group_history.status` erlaubt: `draft`, `historical`, `confirmed`, `disputed`.
Leader-Einträge sollen sofort `confirmed` sein. Die bestehende Validierung in `normalizeHistoricalContributionStatus` gibt `historical` als Default zurück — für Leader-Einträge muss der Standardwert auf `confirmed` geändert oder der Handler muss bei Leader-Kontext explizit `confirmed` setzen.

**Empfehlung:** Neuer Leader-seitiger Handler (oder ein Flag im Request) setzt explizit `status = 'confirmed'`, unabhängig vom gesendeten Wert. Alternativ: Separater Endpunkt `/manage/groups/:id/history` (non-admin, scoped auf Leader-Auth) der immer `confirmed` setzt.

### Auth-Pattern für Leader-Zugriff [VERIFIED: Codebase]

Der bestehende `FansubGroupHistoryHandler` ist hinter der Admin-Auth-Middleware (`auth` in `admin_routes.go`). Die Permissions nutzen `RoleFansubLead` / `ActionFansubGroupMembersManage`. Der Leader-CRUD muss dieselbe Permissions-Prüfung nutzen:

```go
result, err := h.permissionSvc.CanForFansubGroup(ctx, actor,
    permissions.ActionFansubGroupMembersManage, fansubID)
```

Das ist bereits für Create/Update/Delete in `FansubAnimeContributionsHandler` implementiert. Der neue Delete-Handler für Gruppen-History folgt demselben Schema.

### Frontend-Anker: `manage/groups/[id]`

`/frontend/src/app/manage/groups/page.tsx` ist ein Re-Export von `admin/my-groups/page.tsx`. Die Gruppen-Detail-Seite ist `/admin/my-groups/[id]/page.tsx` (Client-Komponente). Die Gruppen-Historie wird dort **noch nicht** angezeigt. Die Inline-Timeline-Section ist neu zu bauen — als neue Subkomponente `GroupHistorySection.tsx` in `frontend/src/components/groups/` o. ä.

**Bestehender Frontend-API-Aufruf:** `getMyFansubGroupDetail` aus `api.ts`. Für die History-CRUD braucht es neue API-Funktionen in `api.ts`.

---

## Befund 4: Archiv-Such-Query (D-14/D-15/D-16)

### Sichtbarkeits-Enforcement

Aus `anime_contributions_public_repository.go` [VERIFIED: Codebase]:
- `ac.is_public_on_member_profile = true` — Beitrag öffentlich auf Mitgliedsprofil
- `hfgm.visibility = 'public'` — Mitgliedschaft öffentlich sichtbar

Für die Archiv-Suche gelten dieselben Bedingungen. Zusätzlich sollten nur Member zurückgegeben werden, deren `profile_visibility = 'public'` (oder `members_only`, falls der Suche kein Auth-Context vorliegt — hier: public, also nur `'public'`).

### Query-Strategie

**Empfehlung: Offset-Pagination** (nicht Keyset) [ASSUMED: Begründung folgt]

Begründung:
- Kleine Datenmenge (Community-Platform, nicht E-Commerce-Scale).
- Filter-Kombinationen ändern sich pro Request; Keyset würde komplexe Cursor-Konstruktion erfordern.
- Konsistent mit bestehenden Admin-Listen im Projekt.
- 20 Ergebnisse pro Seite; `?page=N` Query-Parameter.

**Empfohlene SQL-Grundstruktur:**

```sql
SELECT DISTINCT ON (m.id)
    m.id,
    m.nickname,
    m.display_name,
    avatar.file_path AS avatar_path,
    EXISTS(
        SELECT 1 FROM member_claims mc
        WHERE mc.member_id = m.id AND mc.claim_status = 'verified'
    ) AS is_verified
FROM members m
JOIN hist_fansub_group_members hfgm ON hfgm.member_id = m.id
    AND hfgm.visibility = 'public'
JOIN anime_contributions ac ON ac.fansub_group_member_id = hfgm.id
    AND ac.is_public_on_member_profile = true
    AND ac.status = 'confirmed'
-- Optional: JOIN anime_contribution_roles acr (nur wenn Rolle-Filter gesetzt)
-- Optional: JOIN (nur wenn Gruppe-Filter gesetzt)
LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
WHERE m.profile_visibility = 'public'
  -- Rolle-Filter (optional):
  AND ($role_code = '' OR EXISTS (
      SELECT 1 FROM anime_contribution_roles acr2
      JOIN anime_contributions ac2 ON ac2.id = acr2.anime_contribution_id
      JOIN hist_fansub_group_members hfgm2 ON hfgm2.id = ac2.fansub_group_member_id
      WHERE hfgm2.member_id = m.id
        AND ac2.is_public_on_member_profile = true
        AND acr2.role_code = $role_code
  ))
  -- Zeitraum-Filter (optional):
  AND ($year_from = 0 OR COALESCE(ac.started_year, ac.ended_year, 9999) >= $year_from)
  AND ($year_until = 0 OR COALESCE(ac.ended_year, ac.started_year, 0) <= $year_until)
  -- Gruppe-Filter (optional):
  AND ($fansub_group_id = 0 OR hfgm.fansub_group_id = $fansub_group_id)
ORDER BY m.id
LIMIT 20 OFFSET ($page - 1) * 20
```

**Wichtig:** Der `EXISTS`-Subquery für den Rolle-Filter ist sicherer als ein JOIN, da er DISTINCT-Semantik einfacher beibehält.

### Benötigte Indizes

Prüfen ob vorhanden (Migration 0086) [VERIFIED: Codebase]:
- `idx_anime_contributions_public_profile` — `is_public_on_member_profile = true` — vorhanden ✓
- `idx_anime_contributions_status` — vorhanden ✓
- `idx_anime_contributions_member` — `fansub_group_member_id` — vorhanden ✓
- `idx_anime_contribution_roles_code` — `role_code` — vorhanden ✓

**Neu benötigt für Archiv-Suche:**
- Index auf `members(profile_visibility)` — noch nicht vorhanden. Migration 0092 (nächste verfügbare Nummer nach 0091).
- Index auf `member_claims(member_id, claim_status)` für die IS-VERIFIED-Subquery.

### Sortierung

**Empfehlung:** Default-Sortierung nach `m.id ASC` (stabiles Pagination-Anchor). Keine Score-basierten Relevanz-Sortierung in Phase 68 (gemäß CONTEXT.md Deferred). Frontend kann später alphabetisch sortieren lassen.

### Neue Repository-Datei

Da `member_profile_repository.go` bereits 1167 Zeilen hat, kommt die Archiv-Suche in eine eigene Datei: `member_archive_repository.go` im `repository`-Package.

---

## Befund 5: Badge-Service Dateistruktur (450-Zeilen-Limit)

Aktuell hat `badge_service.go` 131 Zeilen. Nach Ergänzung der 4 neuen Badges (je ~30 Zeilen Berechnungsfunktion + Wrapper) wird er ca. 250–280 Zeilen haben — unter dem Limit. Eine Aufteilung ist **nicht zwingend**, bleibt aber empfehlenswert wenn die Backfill-Logik ebenfalls in den Service wandert.

**Empfehlung:** Backfill-Logik in `badge_backfill_service.go` auslagern, analog zu `services.AnimeMetadataBackfillService`. Badge-Berechnung bleibt in `badge_service.go`.

---

## Befund 6: Frontend — Archiv-Seite `/archiv`

### Wiederverwendbare Komponenten [VERIFIED: Codebase]

| Komponente | Datei | Verwendung in /archiv |
|------------|-------|----------------------|
| `MemberProfileHero` | `components/profile/MemberProfileHero.tsx` | Zu groß für Karte; **nicht direkt reused** |
| `MemberBadgeChips` | `components/profile/MemberBadgeChips.tsx` | Kann für verified-Badge-Chip genutzt werden |
| Profil-Avatar + Name | inline in `members/[slug]/page.tsx` | Pattern kopieren, eigene `MemberSearchCard`-Komponente |

**Empfehlung:** Neue schlanke Komponente `MemberSearchCard.tsx` in `frontend/src/components/archive/` (Avatar + Name + verified-Chip + Top-Rollen). `MemberProfileHero` ist zu komplex für eine Suchergebnis-Karte.

### API-Aufruf-Pattern [VERIFIED: Codebase]

`frontend/src/lib/api.ts` zentralisiert alle Backend-Aufrufe. Neue Funktion `searchArchive(params)` folgt dem bestehenden Muster mit `resolveApiUrl` + `fetch`.

### Gruppen-Filter-Dropdown

Für den Gruppe-Filter braucht die `/archiv`-Seite eine Liste aller Fansub-Gruppen. Der bestehende öffentliche Endpunkt `GET /api/v1/fansubs` kann dafür genutzt werden (vorhanden, kein Auth).

---

## Architecture Patterns

### System Architecture Diagram

```
[Contribution-Mutation-Handler]
  CreateAnimeContribution / UpdateAnimeContribution / DeleteAnimeContribution
         |
         v
  [BadgeService.ComputeAndStoreBadgesForContribution(ctx, memberID)]
         |
         v
  computeFirstContribution() → UpsertMemberBadge / RevokeBadge
  computeProductiveBronze()  → ...
  computeProductiveSilver()  → ...
  computeProductiveGold()    → ...
  computeAllRounder()        → ...
  computeVerified()          → ...
  (+ bestehende 3 Funktionen)
         |
         v
  [member_badges] status=active|revoked, visibility unberührt

[cmd/migrate backfill-badges]
  → alle member_ids aus members
  → ComputeAndStoreBadges(memberID) für jeden

[Leader POST/PATCH/DELETE /admin/fansubs/:id/history/:historyId]
  permissionSvc.CanForFansubGroup(ActionFansubGroupMembersManage)
         |
         v
  FansubGroupHistoryRepository.Create/Update/Delete
         |
         v
  manage/groups/[id] inline GroupHistorySection (Frontend)

[GET /api/v1/archiv?rolle=&gruppe=&von=&bis=&page=]
  (keine Auth)
         |
         v
  MemberArchiveRepository.Search(filters, offset)
  (filter: is_public_on_member_profile + profile_visibility='public')
         |
         v
  /archiv (Frontend, Server Component, Profil-Karten paginiert)
```

### Recommended Project Structure (neue Dateien)

```
backend/internal/services/
├── badge_service.go            # erweitert: +4 neue compute-Funktionen + RevokeBadge
├── badge_backfill_service.go   # NEU: BackfillAllBadges(ctx) → Report

backend/internal/repository/
├── member_archive_repository.go  # NEU: SearchMembers(ctx, filters, offset) → []ArchiveMemberRow

backend/internal/handlers/
├── fansub_group_history_handler.go  # erweitert: +DeleteGroupHistory, Leader-Auth
├── member_archive_handler.go        # NEU: GET /archiv

backend/cmd/migrate/
├── main.go                     # erweitert: +backfill-badges Subbefehl

frontend/src/
├── app/archiv/page.tsx         # NEU: öffentliche Entdeckungsseite
├── components/archive/
│   └── MemberSearchCard.tsx    # NEU: kompakte Profilkarte für Suchergebnisse
├── components/groups/
│   └── GroupHistorySection.tsx # NEU: Inline-Timeline in manage/groups/[id]
```

### Anti-Patterns to Avoid

- **Visibility ändern im Recompute:** `UpsertMemberBadge` setzt `visibility='public'` nur beim INSERT (ON CONFLICT DO UPDATE berührt visibility nicht). Falls ein Badge schon `hidden` ist und erneut berechnet wird, muss `visibility` unverändert bleiben — das ist bereits korrekt im Repository implementiert (nur `status` und `awarded_at` werden im DO UPDATE gesetzt). [VERIFIED: Codebase]
- **RevokeBadge im Upsert nicht vergessen:** Das bestehende `UpsertMemberBadge` setzt immer `status='active'`. Für Entzug braucht `BadgeRepository` eine `RevokeMemberBadge(ctx, memberID, badgeCode)` Methode, die `status='revoked'` setzt, sofern `visibility != 'hidden'` (oder immer, da D-07 nur die Visibility betrifft, nicht den Status).
- **Keine direkten DB-Queries im Handler:** Alle Datenbankoperationen laufen durch Repository-Methoden.
- **Keine Public-Seite hinter Auth-Middleware:** `/archiv` und die neue Such-Route sind ohne Auth-Gate zu registrieren (in public routes, nicht in `registerAdminRoutes`).

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Nutze stattdessen | Warum |
|---------|-------------------|-------------------|-------|
| Badge-Idempotenz | Eigene Conflict-Logik | `BadgeRepository.UpsertMemberBadge` | Bereits korrekt implementiert mit `ON CONFLICT (member_id, badge_code)` |
| Slug-Normalisierung für Member | Eigene Regex | `normalizeMemberProfileSlug()` in `member_profile_repository.go` | Unicode-normalisierend, getestet |
| Sichtbarkeits-Prüfung für public Member | Eigene Conditions | `is_public_on_member_profile = true AND hfgm.visibility = 'public'` (etabliertes Pattern in public repo) | Konsistenz mit Phase 64/65 |
| Permission-Check für Leader | Eigenentwicklung | `permissionSvc.CanForFansubGroup(ctx, actor, ActionFansubGroupMembersManage, fansubID)` | Vorhanden, getestet |

---

## Common Pitfalls

### Pitfall 1: RevokeBadge vergessen
**Was schiefgeht:** `ComputeAndStoreBadges` berechnet neue Badges korrekt, aber gelöschte/geänderte Contributions könnten einen Badge hinterlassen, der nicht mehr verdient ist.
**Warum:** `UpsertMemberBadge` setzt immer `active`. Ohne Revoke-Schritt bleibt `productive_gold` aktiv auch wenn der Member nur noch 8 Anime hat.
**Vermeidung:** Jede `computeX`-Funktion prüft die Bedingung; wenn sie nicht erfüllt ist, ruft sie `RevokeMemberBadge(ctx, memberID, badgeCode)` auf. `RevokeMemberBadge` setzt `status='revoked'` per UPDATE WHERE `member_id=$1 AND badge_code=$2 AND status='active'` (nur aktive revoken; `pending` und `revoked` unberührt lassen).

### Pitfall 2: member_id für Delete-Recompute
**Was schiefgeht:** Handler löscht die Contribution, danach kann er die member_id nicht mehr aus der DB lesen.
**Warum:** DELETE entfernt die Zeile; SELECT danach gibt pgx.ErrNoRows.
**Vermeidung:** member_id **vor** dem Delete lesen via `GetMemberIDForContribution(ctx, contributionID)` im Repository, dann Delete ausführen, dann Badge-Recompute mit der gespeicherten member_id.

### Pitfall 3: CONTEXT.md-Text „Kategorie platform" ist kein DB-Wert
**Was schiefgeht:** Planner sucht `category = 'platform'` in `member_claims` — Spalte existiert nicht.
**Warum:** `member_claims` hat keine `category`-Spalte (0081 verifiziert). „Platform" ist UX-Sprache.
**Vermeidung:** Bedingung ist ausschließlich `claim_status = 'verified'`.

### Pitfall 4: Migrations-Nummer
**Was schiefgeht:** Nächste Migration als 0092 anlegen, obwohl 0091 bereits Phase 67 belegt.
**Status:** [VERIFIED: Codebase] Letzte Migration ist `0091`. Nächste Phase-68-Migration ist `0092`.

### Pitfall 5: member_badges.status-Constraint
**Was schiefgeht:** `status='revoked_active'` o. ä. schreiben.
**Ist-Wert:** `CHECK (status IN ('active', 'revoked', 'pending'))` [VERIFIED: 0087]. Nur diese drei Werte erlaubt.

### Pitfall 6: Archiv-Route in Admin-Routes registrieren
**Was schiefgeht:** `GET /api/v1/admin/archiv` — hinter Auth-Middleware, öffentliche Suche schlägt fehl.
**Vermeidung:** Route in `main.go` als public route (analog zu `/api/v1/fansubs/:id/contributions`), nicht in `registerAdminRoutes`.

### Pitfall 7: Profil-Karte vs. MemberProfileHero
**Was schiefgeht:** `MemberProfileHero` direkt in Archiv-Suchergebnissen verwenden — viel zu schwergewichtig (Banner, Edit-Links, Activity-Range, Story).
**Vermeidung:** Neue leichtgewichtige `MemberSearchCard`-Komponente (Avatar, Name, verified-Chip, Top-Rollen, Gruppen-Badge).

---

## Code Examples

### Badge-Recompute nach Contribution-Mutation (Pattern)

```go
// Source: backend/internal/handlers/fansub_anime_contributions_handler.go (erweitert)
// Nach CreateOrUpdate oder Update: member_id über fansub_group_member_id auflösen.
func (h *FansubAnimeContributionsHandler) recomputeBadgesForMember(
    ctx context.Context,
    fgMemberID int64,
) {
    if h.badgeService == nil {
        return
    }
    _ = h.badgeService.ComputeAndStoreBadgesByMembership(ctx, fgMemberID)
}
```

### RevokeMemberBadge (neue Repository-Methode)

```go
// Source: Eigenes Muster; analog zu UpsertMemberBadge in badge_repository.go
func (r *BadgeRepository) RevokeMemberBadge(ctx context.Context, memberID int64, badgeCode string) error {
    _, err := r.db.Exec(ctx, `
        UPDATE member_badges
        SET status = 'revoked'
        WHERE member_id = $1
          AND badge_code = $2
          AND status = 'active'
    `, memberID, badgeCode)
    return err
}
```

### computeFirstContribution (neue Badge-Funktion im Service)

```go
// Source: Eigenes Muster; analog zu computeFoundingMember in badge_service.go
func (s *BadgeService) computeFirstContribution(ctx context.Context, memberID int64) {
    var rowID int64
    err := s.db.QueryRow(ctx, `
        SELECT ac.id
        FROM anime_contributions ac
        JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
        WHERE hfgm.member_id = $1
          AND ac.status = 'confirmed'
        LIMIT 1
    `, memberID).Scan(&rowID)
    if errors.Is(err, pgx.ErrNoRows) {
        _ = s.repo.RevokeMemberBadge(ctx, memberID, "first_contribution")
        return
    }
    if err != nil {
        log.Printf("badge_service: first_contribution query error (member_id=%d): %v", memberID, err)
        return
    }
    if err := s.repo.UpsertMemberBadge(ctx, memberID, "first_contribution",
        "historical_achievement", "anime_contribution", rowID); err != nil {
        log.Printf("badge_service: upsert first_contribution error (member_id=%d): %v", memberID, err)
    }
}
```

### computeProductiveTier (gestufte Badges)

```go
// Zählt distinct confirmed anime; vergibt/entzieht alle drei Tier-Badges.
func (s *BadgeService) computeProductiveTiers(ctx context.Context, memberID int64) {
    var animeCount int
    err := s.db.QueryRow(ctx, `
        SELECT COUNT(DISTINCT ac.anime_id)
        FROM anime_contributions ac
        JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
        WHERE hfgm.member_id = $1
          AND ac.status = 'confirmed'
    `, memberID).Scan(&animeCount)
    if err != nil {
        log.Printf("badge_service: productive tier query error (member_id=%d): %v", memberID, err)
        return
    }
    tiers := []struct {
        code      string
        threshold int
    }{
        {"productive_bronze", 10},
        {"productive_silver", 25},
        {"productive_gold", 50},
    }
    for _, t := range tiers {
        if animeCount >= t.threshold {
            _ = s.repo.UpsertMemberBadge(ctx, memberID, t.code,
                "historical_achievement", "anime_contribution", 0)
        } else {
            _ = s.repo.RevokeMemberBadge(ctx, memberID, t.code)
        }
    }
}
```

### Delete-Handler mit pre-Delete member_id (Pattern)

```go
// Vor dem Delete member_id sichern, dann Badge-Recompute nach Delete.
func (h *FansubAnimeContributionsHandler) DeleteAnimeContribution(c *gin.Context) {
    // ... bestehende Validierung ...

    // member_id VOR dem Delete lesen:
    memberID, err := h.contributionsRepo.GetMemberIDForContribution(
        c.Request.Context(), contributionID)
    if err != nil && !errors.Is(err, repository.ErrNotFound) {
        // Nicht fatal: Badge-Recompute wird übersprungen
        log.Printf("badge resolve pre-delete: %v", err)
    }

    if err := h.contributionsRepo.Delete(c.Request.Context(), contributionID); err != nil {
        // ... bestehende Fehlerbehandlung ...
    }

    // Recompute nach Delete:
    if memberID > 0 && h.badgeService != nil {
        _ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), memberID)
    }
    // ... Audit + Response ...
}
```

---

## State of the Art

| Alt | Aktuell | Phase-68-Änderung |
|-----|---------|-------------------|
| 3 hardcoded Badges | 3 Badges in badge_service.go | +4 Badges, ~250 Zeilen total |
| Kein Contribution-Recompute | Recompute nur bei Mitgliedschaft/Rolle | Recompute auch bei Contribution-Mutationen |
| Kein Backfill | — | `migrate backfill-badges` Subbefehl |
| History: kein Delete-Endpunkt | Create/Update/List vorhanden | Delete-Endpunkt + Leader-Frontend-UI |
| Kein Archiv | — | `/archiv` öffentliche Suchroute + Seite |

---

## Runtime State Inventory

*Entfällt — keine Rename/Refactor/Migration-Phase. Alle Änderungen sind additiv.*

---

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Postgres 16 | Badge-Queries, Archiv-Such-Query | ✓ (laufend) | — |
| Go 1.25 | Badge-Service-Erweiterung | ✓ | — |
| Next.js 16 | /archiv Frontend | ✓ | — |

---

## Assumptions Log

| # | Claim | Section | Risk bei Falschheit |
|---|-------|---------|-------------------|
| A1 | CLI-Backfill via `migrate`-Binary ist dem Admin-Endpoint vorzuziehen | Befund 2 | Admin-Endpoint wäre alternative; Änderung nur im Routing |
| A2 | Offset-Pagination (nicht Keyset) für Archiv-Suche reicht | Befund 4 | Bei sehr großen Datensätzen Perf-Degradation; einfach austauschbar |
| A3 | `productive_bronze/silver/gold` als separate Badge-Codes (nicht ein einzelner Badge mit Level) | Befund 1 | Wenn Nutzer einen einzelnen Badge will, braucht es Schema-Änderung; jetzt klären |
| A4 | Neue Indizes in Migration 0092 ausreichend; kein Partial-Index auf `members.profile_visibility` | Befund 4 | Full-Table-Scan auf `members` bei großem Datenbestand |

---

## Open Questions (RESOLVED)

1. **Schwellenwerte (D-05)**
   - Vorschlag: Produktiv 10/25/50; Allrounder 3 Rollen.
   - **RESOLVED** — per CONTEXT.md D-05 wurden Schwellenwerte an Claude's Discretion delegiert und sind jetzt in den Plänen festgeschrieben: productive_bronze ≥ 10 distinct confirmed Anime, productive_silver ≥ 25, productive_gold ≥ 50; all_rounder ≥ 3 distinct Rollen. Diese Zahlen sind in 68-01-PLAN.md hardcoded.

2. **Drei separate Badge-Codes für Produktiv-Stufen vs. ein Badge mit Upgrade?**
   - Drei Codes (`productive_bronze/silver/gold`) sind einfacher mit dem bestehenden UNIQUE-Constraint.
   - **RESOLVED** — Drei separate Badge-Codes gewählt (productive_bronze, productive_silver, productive_gold). Jeder Code ist ein eigenständiger Eintrag in member_badges; Entzug greift separat pro Stufe. Kein Schema-Change nötig.

3. **Phase-66-Abhängigkeit für Verifiziert-Badge**
   - Phase 66 (Claiming) war pending. Der Recompute-Trigger bei Claim-Verifikation kann erst nach Phase 66 live gesetzt werden.
   - **RESOLVED** — Option B gewählt: Phase 68 implementiert computeVerified(), das member_claims liest (claim_status='verified'); Admin-Backfill (backfill-badges) deckt alle bereits verifizierten Member beim Erstanlauf ab. Ein Live-Trigger nach member_claims-Mutation ist nicht erforderlich — Backfill reicht als initialer Zustand; Phase 66 ist abgeschlossen, kein neuer Trigger nötig.

---

## Validation Architecture

### P68-SC1: Badge-Engine

| Anforderung | Testtyp | Automatischer Befehl | Fixtures |
|-------------|---------|---------------------|---------|
| `first_contribution` vergeben bei ≥1 confirmed | Unit (Go) | `go test ./internal/services/... -run TestComputeFirstContribution -v` | Member mit 1 confirmed Contribution |
| `productive_bronze` vergeben bei ≥10 Anime | Unit (Go) | `go test ./internal/services/... -run TestComputeProductiveBronze -v` | Member mit 10 distinct anime_ids |
| `productive_silver/gold` analog | Unit (Go) | `-run TestComputeProductiveTiers` | 25/50 Anime |
| `all_rounder` bei ≥3 verschiedenen Rollen | Unit (Go) | `-run TestComputeAllRounder -v` | 3 verschiedene role_codes |
| `verified` bei verified claim | Unit (Go) | `-run TestComputeVerified -v` | member_claims mit claim_status='verified' |
| Badge-Entzug bei Bedingung entfallen | Unit (Go) | `-run TestRevokeBadge -v` | Contribution löschen → Badge revoked |
| visibility='hidden' bleibt nach Recompute | Unit (Go) | `-run TestRecomputeKeepsHiddenVisibility -v` | Badge mit hidden, dann recompute |
| Recompute nach Contribution Create | Integration (Go) | Smoke-Test oder Testify gegen echte DB | — |

**Observierbar:** `member_badges`-Tabelle enthält `status='active'` für die neuen Badge-Codes nach Contribution-Create.

### P68-SC2: Gruppen-Meilensteine

| Anforderung | Testtyp | Befehl / Observable |
|-------------|---------|---------------------|
| Leader kann Meilenstein anlegen | Manual-UAT | POST `/admin/fansubs/:id/history` mit Leader-Token → 201 |
| Leader kann Meilenstein bearbeiten | Manual-UAT | PATCH → 200 |
| Leader kann Meilenstein löschen | Manual-UAT | DELETE → 204 |
| Meilenstein erscheint in Gruppen-Timeline | Manual-UAT | Frontend `manage/groups/[id]` zeigt Eintrag in GroupHistorySection |
| Nicht-Leader kann nicht anlegen | Unit (Go) | Handler-Test mit non-leader Token → 403 |
| Titel ist Pflichtfeld | Unit (Go) | Request ohne title → 400/422 |

**Observierbar:** `fansub_group_history` enthält Zeile mit `status='confirmed'`; öffentliche Gruppen-Detail-Seite zeigt den Eintrag in der Timeline.

### P68-SC3: Archiv-Suche

| Anforderung | Testtyp | Befehl / Observable |
|-------------|---------|---------------------|
| GET `/api/v1/archiv` ohne Filter → alle öffentlichen Member | Smoke-Test | HTTP 200, `data` Array nicht leer (wenn Testdaten vorhanden) |
| Filter `rolle=translator` → nur Member mit Translator-Contribution | Smoke-Test | Response-Members haben alle mindestens eine Translator-Contribution |
| Nicht-öffentliche Members erscheinen nicht | Unit (Go) | Query-Test: Member mit profile_visibility='members_only' nicht in Ergebnissen |
| Pagination funktioniert | Unit (Go) | 21 Testmember → Seite 1 hat 20, Seite 2 hat 1 |
| Frontend `/archiv` rendert Profil-Karten | Manual-UAT | Seite lädt, Karten zeigen Avatar, Name, Rollen |

**Observierbar:** GET `/api/v1/archiv` gibt JSON `{"data": [...], "total": N, "page": 1}` zurück.

---

## Sources

### Primary (HIGH confidence — direkt aus Codebase gelesen)
- `backend/internal/services/badge_service.go` — vollständig gelesen
- `backend/internal/repository/badge_repository.go` — vollständig gelesen
- `backend/internal/handlers/fansub_anime_contributions_handler.go` — vollständig gelesen
- `backend/internal/handlers/fansub_group_history_handler.go` — vollständig gelesen
- `backend/internal/handlers/fansub_hist_group_members_handler.go` — Recompute-Pattern gelesen
- `backend/internal/repository/fansub_group_history_repository.go` — vollständig gelesen
- `backend/internal/repository/anime_contributions_public_repository.go` — vollständig gelesen
- `backend/internal/repository/member_profile_repository.go` — vollständig gelesen
- `backend/internal/permissions/permissions.go` — Action-Konstanten gelesen
- `database/migrations/0086_anime_contributions.up.sql`
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql`
- `database/migrations/0081_historical_members_identity.up.sql`
- `database/migrations/0084_fansub_group_history.up.sql`
- `database/migrations/0085_role_definitions_seed.up.sql`
- `database/migrations/0091_anime_contributions_release_version.up.sql`
- `backend/cmd/migrate/main.go` — Backfill-Pattern gelesen
- `backend/cmd/server/admin_routes.go` — Route-Registrierung geprüft
- `frontend/src/app/members/[slug]/page.tsx` — Profil-Komponentenstruktur
- `frontend/src/components/profile/MemberBadgeChips.tsx` — Badge-Label-Map
- `frontend/src/app/admin/my-groups/[id]/page.tsx` — Gruppen-Detail-Seite
- `.planning/phases/68-badge-engine-archiv-entdeckung/68-CONTEXT.md`

---

## Metadata

**Confidence breakdown:**
- Badge-Schwellenwerte: HIGH — Zahlen per D-05 an Claude's Discretion delegiert; in 68-01-PLAN.md festgeschrieben (10/25/50, Allrounder 3)
- Badge-Service-Erweiterung (Muster): HIGH — direkt aus Code abgeleitet
- Recompute-Trigger-Punkte: HIGH — call sites vollständig geprüft
- Backfill-Mechanik: MEDIUM — Pattern klar, konkrete Wahl CLI vs. Endpoint ist ASSUMED
- History-CRUD-Lücken: HIGH — Delete-Endpunkt fehlt nachweislich
- Archiv-Query-Strategie: MEDIUM — funktionale Strategie klar, Performance-Annahmen [ASSUMED]
- Frontend-Komponentenstruktur: HIGH — direkt aus vorhandenen Seiten abgeleitet

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stabile Codebase, wenig externe Abhängigkeiten)
