# Phase 68: Badge-Engine und Archiv-Entdeckung (Post-MVP) - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Badge-Engine & Archiv-Entdeckung, 2026-06-02)
**Depends on:** Phase 64 (Member-Dashboard & Public Pages); nutzt Verifizierung aus Phase 66 und Contributions aus Phase 65/67

<domain>
## Phase Boundary

Drei eigenständige Teilfeatures auf bestehender Infrastruktur:

1. **Badge-Engine (P68-SC1):** Den bestehenden `badge_service` (3 abgeleitete Badges) zu einer vollständigen Engine ausbauen, die alle definierten Badges berechnet — auch aus `anime_contributions` — und `member_badges` bei Datenänderungen aktualisiert.
2. **Gruppen-Meilensteine (P68-SC2):** Leader-CRUD auf der **bereits existierenden** `fansub_group_history`-Tabelle (Migration 0084); Einträge erscheinen in der Gruppen-Timeline (Anzeige aus Phase 64).
3. **Archiv-Suche (P68-SC3):** Neue öffentliche Entdeckungs-Seite `/archiv` mit Filtern nach Rolle, Zeitraum und Gruppe; liefert Member-Profile.

**Nicht in dieser Phase:** „Spezialist pro Rolle"-Badges (später), datengetriebene Badge-Definitions-Tabelle (später), Ablösung von `release_member_roles` (eigene Cleanup-Phase aus Phase 67).

</domain>

<decisions>
## Implementation Decisions

### Badge-Katalog & Definitionsart
- **D-01:** Badges bleiben **hardcoded im `badge_service`** (je Regel eine Code-Funktion), wie heute. Keine datengetriebene `badge_definitions`-Tabelle in dieser Phase — überschaubare, feste Badge-Menge.
- **D-02:** Bestehende Badges bleiben: `founding_member`, `historical_leader`, `long_term_member`.
- **D-03:** Neue Badges in Phase 68:
  - **Erster Beitrag** — ≥ 1 bestätigte (`confirmed`) `anime_contributions`-Eintrag.
  - **Produktiv (gestuft)** — an N+ verschiedenen Anime mitgewirkt; gestufte Schwellen (z. B. 10/25/50 — exakte Werte via Research).
  - **Verifiziert** — Member hat einen verifizierten `member_claims`-Eintrag (Phase 66); Kategorie `platform`.
  - **Allrounder** — Member hatte N+ **verschiedene** Rollen (Bandbreite; Schwelle via Research).
- **D-04:** **Spezialist pro Rolle** (z. B. „Erfahrene:r Übersetzer:in") ist **zurückgestellt** — mächtig, aber erzeugt viele Badge-Codes/Pflege.
- **D-05:** Konkrete **Schwellenwerte** werden in Research/Planung vorgeschlagen und vom Nutzer bestätigt (jetzt nur die Badge-Arten festgelegt).

### Badge-Recompute & Trigger
- **D-06:** Neuberechnung **event-getrieben** (automatisch pro betroffenem Member bei Contribution-/Rollen-/Mitgliedschafts-Änderungen, erweitert um Contribution-Mutationen) **PLUS Admin-Backfill** (Befehl/Endpoint für Voll-Neuberechnung aller Member — nötig nach neuen Badge-Regeln oder Schwellen-Änderungen).
- **D-07:** Vom Member **ausgeblendete Badges** (`visibility = 'hidden'`) **bleiben bei Neuberechnung erhalten** — Recompute aktualisiert nur die Berechtigung (ob ein Badge zusteht), nie die `visibility`. Respektiert die Phase-64-Steuerung.
- **D-08:** Erfüllt ein Member die Bedingung nicht mehr (z. B. Contribution gelöscht), wird der Badge **entzogen** (`status = 'revoked'`). `member_badges.status` kennt `revoked` bereits.

### Gruppen-Meilensteine (Leader-CRUD)
- **D-09:** Leader pflegt die **ganze Gruppen-Historie** (alle `event_type`-Werte: `founding`/`disbanding`/`hiatus`/`rebranding`/`milestone`/`other`) auf der bestehenden `fansub_group_history`-Tabelle — bewusst als **sparsame, grobe Timeline** (realistisch 5–15 Einträge je Gruppe über die gesamte Lebenszeit). **Kein per-Folge-Aufwand** — granulare Beteiligung läuft über Contributions (Phase 65/67), nicht über Meilensteine.
- **D-10:** Pflichtfeld: **Titel**. **Jahr** und **Note** optional (manche Ereignisse haben kein exaktes Jahr; Jahr dient der Timeline-Sortierung).
- **D-11:** Leader-Einträge sind **sofort sichtbar** (`status = 'confirmed'`) — der Leader ist die Autorität für seine Gruppe, kein zusätzliches Review.
- **D-12:** **Ort/UI (UI-Empfehlung):** Inline-Abschnitt in `manage/groups/[id]` — kompakte, chronologisch sortierte Timeline-Liste mit Inline-„+ Meilenstein"-Button und Bearbeiten/Löschen pro Zeile; bei vielen Einträgen „Alle anzeigen"-Expander (Progressive Disclosure). Konsistent mit Review-Queue (Phase 65) und Einladungen (Phase 66). Kein Seitenwechsel.

### Archiv-Suche (P68-SC3)
- **D-13:** Neue **öffentliche Route `/archiv`** als eigenständige Entdeckungs-Seite (nicht in `/members` integriert).
- **D-14:** Filter **Rolle / Zeitraum / Gruppe** sind **alle optional und UND-verknüpft** (gesetzte Filter werden kombiniert; kein Filter gesetzt = alle). Intuitiv und flexibel.
- **D-15:** Suche ist **öffentlich (kein Login)** und liefert **nur öffentlich sichtbare** Member/Contributions (respektiert `is_public_on_member_profile` etc. aus Phase 64/65).
- **D-16:** Ergebnisdarstellung: **Profil-Karten, paginiert** (Avatar, Name, verified-Badge, Top-Rollen/Gruppen) mit Pagination/Load-More. Sortierung (Relevanz/Aktivität) — Detail via Research.

### Sprache
- **D-17:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten (Projektkonvention).

### Claude's Discretion
- Konkrete Schwellenwerte der gestuften/Allrounder-Badges (Research-Vorschlag, Nutzer bestätigt).
- Mechanik des Admin-Backfills (CLI-Befehl via `cmd/` vs. Admin-Endpoint).
- Genaue Recompute-Trigger-Punkte (welche Mutationen den Service aufrufen).
- Query-Strategie der Archiv-Suche (Indizes, Pagination-Methode, Sortier-Score).
- Handler/Repo/Service-Aufteilung unter dem 450-Zeilen-Limit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Badge-Engine (erweitern)
- `backend/internal/services/badge_service.go` — bestehende 3-Badge-Berechnung (Vorlage für neue Regeln, Upsert-Muster)
- `backend/internal/repository/badge_repository.go` — `UpsertMemberBadge` u. a.
- `backend/internal/handlers/member_badges_handler.go` — Badge-Anzeige/Visibility (Phase 64)
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — `member_badges` (status: active/revoked/pending; visibility: public/internal/hidden), `anime_contribution_roles`
- `database/migrations/0086_anime_contributions.up.sql` — `anime_contributions` (Quelle für neue Badges)
- `database/migrations/0081_historical_members_identity.up.sql` — `member_claims` (für Verifiziert-Badge)

### Gruppen-Meilensteine (bestehende Tabelle + Handler)
- `database/migrations/0084_fansub_group_history.up.sql` — `fansub_group_history` (event_type, year, title, note, status)
- `backend/internal/handlers/fansub_group_history_handler.go` — bestehender Handler (CRUD erweitern)
- `backend/internal/repository/fansub_group_history_repository.go` — Repository
- `backend/internal/repository/anime_contributions_public_repository.go` — nutzt die History für die Leader-Timeline (Anzeige)

### Archiv-Suche (neu)
- `backend/cmd/server/main.go` — bestehende `/members`-Routen (Muster, Verdrahtung); neue `/archiv`-/Such-Route ergänzen
- `backend/internal/repository/member_profile_repository.go` — Member-Profil-Queries (Basis für Such-Query)
- `frontend/src/app/members/` — Profil-Darstellung (Karten-Muster wiederverwenden)
- `frontend/src/lib/api.ts` — zentrale API-Aufrufe

### Vorheriger Kontext / Konventionen
- `.planning/phases/64-fansub-contributions-member-dashboard-public-pages/64-CONTEXT.md` — Badge-Chips, Visibility-Steuerung, (historisch)-Label, Progressive Disclosure, Leader-Timeline
- `.planning/phases/66-claiming-verifizierung/66-CONTEXT.md` — verified-Status (Verifiziert-Badge)
- `shared/contracts/openapi.yaml` — API-Vertrag
- `CLAUDE.md` — max 450 Zeilen, korrekte Umlaute, GSD-Workflow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `badge_service.go`: `ComputeAndStoreBadges(memberID)` / `ComputeAndStoreBadgesByMembership` + Upsert-Muster — neue Badge-Funktionen folgen demselben Schema; Recompute-Aufruf einfach erweiterbar.
- `member_badges`: `status` (active/revoked/pending) und `visibility` (public/internal/hidden) decken Entzug (D-08) und Hidden-Schutz (D-07) bereits ab — keine Schema-Erweiterung nötig.
- `fansub_group_history` + Handler/Repo + Timeline-Anzeige existieren — Meilensteine sind v. a. CRUD-UI + ggf. kleine Handler-Ergänzungen.
- Profil-Karten-Komponenten aus `frontend/src/app/members/` für die Such-Ergebnisse.

### Established Patterns
- Badge-Berechnung ist „kein kritischer Pfad": Fehler werden geloggt, nicht zurückgegeben — beibehalten.
- Badges werden per Upsert idempotent gespeichert (`uq_member_badges_member_code`).
- Handler/Repo/Service explizit in `main.go` verdrahtet; deutsche Fehlermeldungen.

### Integration Points
- Recompute-Trigger an Contribution-Mutationen (Phase 65/67) andocken + Admin-Backfill.
- `fansub_group_history`-Handler um Leader-CRUD (create/update/delete) erweitern; UI in `manage/groups/[id]`.
- Neue Such-Route + Repository-Query (Filter Rolle/Zeitraum/Gruppe, nur öffentliche Einträge, Pagination); neue Frontend-Route `/archiv`.

</code_context>

<specifics>
## Specific Ideas

### Badge-Katalog (Phase 68)
```
Bestehend:  Gründungsmitglied · Historischer Leader · 5+ Jahre Mitglied
Neu:        Erster Beitrag      (≥1 confirmed contribution)
            Produktiv 10/25/50  (Anzahl Anime, gestuft)
            Verifiziert         (verifizierter member_claim)
            Allrounder          (N+ verschiedene Rollen)
Zurückgestellt: Spezialist pro Rolle
```

### Archiv-Suche /archiv
```
[ Rolle ▾ ]  [ Gruppe ▾ ]  [ Zeitraum: von – bis ]   (alle optional, UND)

Ergebnisse (Profil-Karten, paginiert)
  ┌───────────────────────────┐
  │ (Avatar) Lisa  ✓verifiziert│
  │ Übersetzung · Editing      │
  │ SubStars, AnimeFoo         │
  └───────────────────────────┘
Nur öffentlich sichtbare Einträge.
```

### Meilenstein-Pflege (manage/groups/[id], inline)
```
Gruppen-Historie
  [+ Eintrag]
  2003 · Gegründet            [✎] [🗑]
  2007 · Leaderwechsel        [✎] [🗑]
  2012 · Aufgelöst            [✎] [🗑]
```

</specifics>

<deferred>
## Deferred Ideas

- „Spezialist pro Rolle"-Badges (viele Badge-Codes) — spätere Phase (D-04).
- Datengetriebene `badge_definitions`-Tabelle + Admin-Regel-UI — spätere Phase (D-01).
- Sortier-Score/Relevanz-Tuning der Archiv-Suche — Research/Iteration.
- Ablösung `release_member_roles` — eigene Cleanup-Phase (aus Phase 67).

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` — eigene UI-Phase.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — eigenes Feature.

</deferred>

---

*Phase: 68-badge-engine-archiv-entdeckung*
*Context gathered: 2026-06-02 aus moderierter Produktdiskussion*
