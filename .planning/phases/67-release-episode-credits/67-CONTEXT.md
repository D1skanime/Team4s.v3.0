# Phase 67: Release- und Episode-Credits (Post-MVP) - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Release-/Episode-Credits, 2026-06-02)
**Depends on:** Phase 64 (Member-Dashboard & Public Pages); erweitert Eingabeflächen aus Phase 63 (Leader-Frontend) und Phase 65 (Member-Vorschläge)

<domain>
## Phase Boundary

`anime_contributions` um eine optionale Verknüpfung zu einer konkreten **Release-Version** erweitern und diese Aufschlüsselung auf der öffentlichen Anime-Seite darstellen:

1. **Datenmodell:** Eine neue nullable Spalte `release_version_id` (FK → `release_versions`), additiv, kein Breaking Change.
2. **Anzeige:** Anime-Seite zeigt Contributions je Gruppe mit aufklappbarer Aufschlüsselung nach Release-Version (und damit Episode), wenn vorhanden (P67-SC2).
3. **Eingabe:** Leader-Admin (Phase 63) und Member-Vorschlagsformular (Phase 65) erhalten ein optionales, gruppen-gefiltertes Release-Version-Feld.

**Scope-Klarstellung (Domain-Owner):** Eine Episode ist in diesem System reine Anime-Metadaten (Name + Nummer). Fansub-Arbeit hängt **immer an einer Release-Version**. Da `fansub_releases.episode_id` NOT NULL ist, hängt jede `release_version` transitiv an genau einer Episode — ein separates `episode_id` auf `anime_contributions` ist redundant und entfällt. **P67-SC1 wird entsprechend angepasst** (nur `release_version_id`).

**Nicht in dieser Phase:** Ablösung/Entfernung des alten `release_member_roles`-Modells (eigene Cleanup-Phase), Badge-Engine + Archiv-Suche (Phase 68).

</domain>

<decisions>
## Implementation Decisions

### FK-Modell & Granularität
- **D-01:** `anime_contributions` bekommt **eine** nullable Spalte **`release_version_id`** (FK → `release_versions`, `ON DELETE SET NULL` o. ä. — Detail Research). Additiv, kein Breaking Change. **Kein `episode_id`** (redundant, da transitiv über `release_version → fansub_release → episode`).
- **D-02:** Ebenen pro Contribution: `release_version_id` NULL = **anime-weit** (Gruppe allgemein am Anime beteiligt, wie bisher); gesetzt = **release-version-spezifisch**. Episode ergibt sich automatisch.
- **D-03:** **Konsistenz-Constraint:** Wenn `release_version_id` gesetzt ist, muss die `fansub_group_id` der Contribution in `release_version_groups` für diese Version vorkommen (Gruppe war an der Version beteiligt). Durchsetzung über Validierung im Handler und/oder DB-Constraint — Mechanismus klärt Research.

### Verhältnis zum alten release_member_roles-Modell
- **D-04:** **Weg A (fokussiert):** `anime_contributions` ist ab dieser Phase das **maßgebliche** Credit-Modell. `release_member_roles` (Migration 0044) bleibt in Phase 67 **unangetastet** (weiter genutzt von `contributor_dashboard_repository.go`, `member_profile_repository.go`, `release_version_notes_repository.go`), wird aber als **abzulösen** markiert → eigene spätere Cleanup-Phase. Kein Datenrisiko (nur Testdaten in der DB), aber Scope bewusst klein gehalten.

### Anime-Seiten-Darstellung (P67-SC2)
- **D-05:** Default-Ansicht bleibt **nach Gruppe gruppiert** (wie heute, `GROUP BY fansub_group_id`). Wo release-version-spezifische Beiträge existieren, gibt es darunter eine **aufklappbare Detailebene pro Release-Version** (Progressive Disclosure wie Phase 64).
- **D-06:** Misch-Fälle: Pro Gruppe zuerst die **anime-weiten** Beiträge („Allgemein/an dieser Serie beteiligt"), darunter die **versions-spezifischen** Beiträge. Klar getrennt.
- **D-07:** Sortierung der Aufschlüsselung: **nach Episode-Nr, dann Version** (aus `release_version → fansub_release → episode`; innerhalb je Version v1, v2, …).

### Eingabe/Pflege
- **D-08:** Sowohl das **Leader-Frontend** (Phase 63, Anlegen/Bearbeiten von Contributions) als auch das **Member-Vorschlagsformular** (Phase 65) erhalten ein **optionales Release-Version-Feld**.
- **D-09:** Auswahl über ein **abhängiges Dropdown**: listet Release-Versionen (Episode + Version), **gefiltert auf Versionen, an denen die gewählte Gruppe beteiligt ist** (`release_version_groups`). Leer lassen = anime-weit. Verhindert inkonsistente Zuordnungen (deckt D-03 in der UX ab).
- **D-10:** `release_version_id` ist **nachträglich bearbeitbar** (setzen/ändern/entfernen beim Bearbeiten) — schrittweise Präzisierung möglich.

### Sprache
- **D-11:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten (Projektkonvention).

### Claude's Discretion
- ON-DELETE-Verhalten und exakte Constraint-Form für `release_version_id`.
- Ob die Konsistenzprüfung (D-03) als DB-Constraint (z. B. Trigger) oder rein im Handler erfolgt.
- Anpassung der öffentlichen Query in `anime_contributions_public_repository.go` (zusätzliche Aufschlüsselungs-Ebene) ohne Bruch der bestehenden anime-weiten Anzeige.
- Wiederverwendung bestehender Release-Version-Lookups für das abhängige Dropdown.
- Handler/Repo-Aufteilung unter dem 450-Zeilen-Limit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Release-/Episode-Datenmodell (FK-Ziel + Hierarchie)
- `database/migrations/0035_add_release_tables.up.sql` — `fansub_releases` (episode_id NOT NULL!), `release_versions` (FK-Ziel), `release_variants`, `release_version_groups` (Gruppe↔Version)
- `database/migrations/0002_init_episodes.up.sql` — `episodes` (anime_id FK)
- `database/migrations/0086_anime_contributions.up.sql` — `anime_contributions` (zu erweitern um `release_version_id`)
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — `anime_contribution_roles`

### Bestehendes (älteres) Credit-Modell — NICHT in dieser Phase anfassen, nur kennen
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` — `release_member_roles` (abzulösen, Weg A)
- `backend/internal/repository/release_version_notes_repository.go` — nutzt `release_versions → fansub_releases → release_member_roles` (kanonischer Alt-Pfad)
- `backend/internal/repository/contributor_dashboard_repository.go`, `backend/internal/repository/member_profile_repository.go` — weitere Nutzer von `release_member_roles`

### Anzeige (öffentliche Anime-Seite)
- `backend/internal/repository/anime_contributions_public_repository.go` — aktuelle Aggregation nach `fansub_group_id` (zu erweitern um Versions-Aufschlüsselung)
- `backend/internal/handlers/contributions_public_handler.go` — `GET /anime/:id/contributions`
- `frontend/src/app/anime/` — Anime-Detailseite (Contributions-Bereich aus Phase 64)

### Eingabeflächen (zu erweitern)
- `backend/internal/handlers/fansub_anime_contributions_handler.go` — Leader/Admin-CRUD auf Contributions (Phase 62/63)
- `frontend/src/app/manage/groups/` — Leader-Frontend
- `frontend/src/app/me/contributions/` — Member-Vorschlagsformular (Phase 65)
- `frontend/src/lib/api.ts` — zentrale API-Aufrufe

### Vorheriger Kontext / Konventionen
- `.planning/phases/65-member-vorschlaege-review-queue/65-CONTEXT.md` — Vorschlagsformular (wird um Release-Version erweitert)
- `.planning/phases/64-fansub-contributions-member-dashboard-public-pages/64-CONTEXT.md` — Anime-Seiten-Anzeige, Progressive Disclosure
- `shared/contracts/openapi.yaml` — API-Vertrag
- `CLAUDE.md` — max 450 Zeilen, korrekte Umlaute, Brownfield/Kompatibilität, GSD-Workflow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `release_version_groups` (0035): liefert direkt, welche Gruppe(n) an einer Release-Version beteiligt sind — Basis für das gruppen-gefilterte Dropdown (D-09) und den Konsistenz-Constraint (D-03).
- `anime_contributions_public_repository.go`: bestehende Gruppen-Aggregation als Ausgangspunkt für die zusätzliche Versions-Ebene.
- Bestehende Release-Version-Lookups (Release-Notes-/Variant-Repos) für die Auswahl-UX.

### Established Patterns
- Release-Hierarchie ist streng per-Episode (`fansub_releases.episode_id NOT NULL`) → `release_version_id` impliziert Episode.
- `anime_contributions.status`/Public-Flags/Rollen bleiben unverändert; Phase 67 fügt nur die Verknüpfungs-Dimension hinzu.
- Migrationen sind append-only; Handler/Repo/Routen explizit in `main.go` verdrahtet.

### Integration Points
- Neue Migration: `ALTER TABLE anime_contributions ADD COLUMN release_version_id BIGINT NULL REFERENCES release_versions(id)`.
- Public-Query erweitern (Versions-Aufschlüsselung, anime-weit + versions-spezifisch getrennt).
- Leader-CRUD + Member-Vorschlag: optionales `release_version_id` annehmen/validieren.
- Frontend: aufklappbare Versions-Detailebene auf der Anime-Seite; abhängiges Dropdown in beiden Formularen.

</code_context>

<specifics>
## Specific Ideas

### Anime-Seite (Aufschlüsselung)
```
SubStars                         Aktiv: 2004–2006
─────────────────────────────────────────────
Allgemein an der Serie beteiligt:
  Sora   [Projektleitung]
  Lisa   [Übersetzung]

▾ Nach Release-Version
  Episode 1 · v1
    Lisa   [Übersetzung] [Editing]
  Episode 1 · v2 (Batch)
    Mika   [QC]
```
(Aufklappbar; anime-weit zuerst, dann versions-spezifisch; sortiert Episode-Nr → Version.)

### Formular-Feld (Leader & Member-Vorschlag)
```
Release-Version (optional)
  [▾ — anime-weit lassen —]
     Episode 1 · v1
     Episode 1 · v2
     ...   (nur Versionen der gewählten Gruppe)
```

</specifics>

<deferred>
## Deferred Ideas

- **Ablösung von `release_member_roles`** (Repos auf `anime_contributions` umstellen, alte Tabelle droppen) — eigene Cleanup-Phase (Weg A, D-04). Kein Datenrisiko, da nur Testdaten.
- `episode_id` als direkter FK — verworfen (redundant, D-01).
- n:m-Verknüpfung einer Contribution zu mehreren Versionen — verworfen für V1 (eine Ebene pro Eintrag).

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` — eigene UI-Phase.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — eigenes Feature.

</deferred>

---

*Phase: 67-release-episode-credits*
*Context gathered: 2026-06-02 aus moderierter Produktdiskussion*
