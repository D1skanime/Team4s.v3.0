# Phase 61: Fansub Contributions Datenmodell — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Fansub Contributions & Gruppenhistorie, 2026-06-01)

<domain>
## Phase Boundary

Diese Phase legt ausschließlich das Datenbankfundament. Kein API, kein Frontend.
Alle nachfolgenden Phasen (62–68) bauen auf diesen Tabellen auf.

Das Modell muss drei strikt getrennte Ebenen ausdrücken:
1. Historische Identität (Member, unabhängig vom App-User)
2. Heutige Plattform-Accounts (App-User, optional mit Member verbunden)
3. Contributions (historische Fakten über Beteiligung, Rollen, Zeiträume)

</domain>

<decisions>
## Implementation Decisions

### Identity-Trennung (LOCKED)

- `members` ist die historische Fansub-Identität (Nick, Anzeigename, Slug). Kein `app_user_id`-Feld direkt in `members`.
- `member_claims` verbindet einen `app_user_id` mit einem `member_id` (optional, verifizierbar, nie automatisch).
- Ein Member kann ohne App-User existieren. Das ist Pflicht für historische Gruppen.
- `claim_status`: pending / verified / rejected

### Alle IDs: BIGSERIAL (LOCKED)

- Keine UUIDs ohne explizite Begründung. Bestehender Team4s-Stil.

### Rollenliste: eine einzige Rollenwelt mit context-Flag (LOCKED)

- `role_definitions`-Tabelle mit `code TEXT PRIMARY KEY`, `label_de TEXT`, `contexts TEXT[]`
- Bestehende operative Rollen bleiben: translator, timer, typesetter, editor, encoder, raw_provider, quality_checker, project_lead, designer, admin
- Neue historische Gruppenrollen: founder, leader, co_leader, project_manager
- context-Werte: `group_history`, `anime_contribution` (ein Code kann in mehreren Kontexten valide sein)
- Keine dritte Rollenwelt. Kein separates Enum im Schema (schwer zu migrieren).

### Contribution-Anker: fansub_group_member_id (LOCKED)

- `anime_contributions.fansub_group_member_id` ist NOT NULL.
- Gastmitwirkende (Personen außerhalb der Gruppe) kommen in Phase 67 oder später — nullable FK wird dann ergänzt.
- Jede Contribution hängt an einer konkreten Gruppenmitgliedschaft. Das erzwingt, dass ein Member zuerst als Gruppenmitglied eingetragen werden muss.

### Status-Modell für Contributions (LOCKED)

- `fansub_group_member_roles.status`: draft / historical / confirmed / disputed
- `anime_contributions.status`: draft / proposed / confirmed / disputed / hidden
- `member_claims.claim_status`: pending / verified / rejected

### Sichtbarkeit (LOCKED)

- `fansub_group_members.visibility`: internal / public
- `anime_contributions.is_public_on_anime_page`: BOOLEAN DEFAULT false
- `anime_contributions.is_public_on_member_profile`: BOOLEAN DEFAULT false
- `members.noindex`: BOOLEAN DEFAULT true (kein sofortiges Suchmaschinenindexieren)

### Mitgliedschaft: Zeitraum (LOCKED)

- `fansub_group_members`: joined_year INT NULL, left_year INT NULL
- `fansub_group_member_roles`: started_year INT NULL, ended_year INT NULL
- Nur Jahreswerte — keine Monat/Tag-Genauigkeit. Entspricht dem bestehenden Team4s-Stil für historische Aktivitätszeiträume.

### Badges: gespeichert mit derived_from (LOCKED)

- `member_badges` wird gespeichert (nicht rein dynamisch berechnet).
- Felder: `derived_from_type TEXT NULL`, `derived_from_id BIGINT NULL` — damit ist Neuberechnung bei Dateiänderungen möglich.
- `badge_category`: historical_achievement / supporter / platform (visuelle Trennung)
- `visibility`: public / internal / hidden

### Kaskaden (LOCKED)

- `anime_contribution_roles` → ON DELETE CASCADE wenn `anime_contribution_id` gelöscht wird
- Keine weiteren automatischen Kaskaden nach oben (Member löschen löscht nicht die Contributions — das ist Audit-Material)

### Claude's Discretion

- Indexstrategie (welche Spalten brauchen Indizes für die erwarteten Abfragen)
- Exakte Sortierreihenfolge der Migrationen innerhalb dieser Phase
- Ob `fansub_group_history` als eigene Tabelle für Meilensteine angelegt wird (empfohlen: ja, auch wenn Phase 68 die UI liefert)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Bestehende Migrationen (Namenskonvention und Stil)
- `database/migrations/` — Konvention für Migrationsdateinamen und SQL-Stil
- Letzte relevante Migration: 0080 (Phase 59)

### Bestehende Tabellen mit Bezug
- `fansub_groups` — Hauptreferenz für `fansub_group_id`
- `anime` — Hauptreferenz für `anime_id`
- `users` — Hauptreferenz für `app_user_id` (heißt im Schema möglicherweise `users` oder `app_users`, vorher prüfen)
- `contributor_roles` — bestehende Rollentabelle, prüfen ob `role_definitions` diese ersetzt oder ergänzt

### Bestehende Go-Modelle (für Verständnis des Stils)
- `backend/internal/repository/` — Muster für Repository-Dateien
- `backend/internal/handlers/` — Muster für Handler

### Projektkonventionen
- `CLAUDE.md` — Modularity (max 450 Zeilen pro Datei), BIGINT/BIGSERIAL, deutschen UI-Text mit korrekten Umlauten

</canonical_refs>

<specifics>
## Specific Ideas

### Tabellenentwurf (Ausgangspunkt, kein finaler Code)

```sql
-- Historische Identität
members (id, display_name, nick, slug, visibility, noindex, created_at, updated_at)

-- Claim: App-User <-> Member
member_claims (id, member_id, app_user_id, claim_status, verification_method, verified_by, verified_at, created_at)

-- Gruppenmitgliedschaft
fansub_group_members (id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at)
UNIQUE(fansub_group_id, member_id)

-- Historische Gruppenrollen inkl. Leader-Zeiträume
fansub_group_member_roles (id, fansub_group_member_id, role_code, started_year, ended_year, status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at)

-- Gruppenhistorie / Meilensteine
fansub_group_history (id, fansub_group_id, year INT, event_type TEXT, title TEXT, note TEXT, status TEXT, created_by, created_at)

-- Anime-Contributions
anime_contributions (id, fansub_group_id, anime_id, fansub_group_member_id NOT NULL, status, note, started_year, ended_year, is_public_on_anime_page, is_public_on_member_profile, confirmed_by, confirmed_at, created_by, created_at, updated_by, updated_at)

-- Rollen pro Anime-Contribution
anime_contribution_roles (id, anime_contribution_id, role_code)
UNIQUE(anime_contribution_id, role_code)
ON DELETE CASCADE

-- Badges
member_badges (id, member_id, badge_code, badge_category, derived_from_type, derived_from_id, status, visibility, awarded_at)
UNIQUE(member_id, badge_code)

-- Rollendefinitionen
role_definitions (code TEXT PRIMARY KEY, label_de TEXT NOT NULL, contexts TEXT[] NOT NULL)
```

### Seed-Daten für role_definitions

Alle bestehenden operativen Rollen müssen als Seed-Daten eingefügt werden, zusammen mit den neuen historischen Gruppenrollen.

</specifics>

<deferred>
## Deferred Ideas

- Gastmitwirkende (Personen außerhalb der Gruppe als Contributor) — kommt in Phase 67
- Contribution-Quellen (contribution_sources) — nicht im MVP
- Vollständige Badge-Engine — Phase 68
- noindex-Steuerungsoberfläche — Phase 66
- Claiming-Selbstservice — Phase 66

</deferred>

---

*Phase: 61-fansub-contributions-datenmodell*
*Context gathered: 2026-06-01 aus moderierter Produktdiskussion*
