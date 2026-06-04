# Phase 74: Public Member Profile `/members/[slug]` + Memorial - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Die **bestehende** öffentliche Member-Seite `/members/[slug]` wird zu einem
**dreistufigen Profil** erweitert (KEINE neue Route, KEIN zweites Public-Member-Modell):

1. **Ebene 1 — Identität/Highlights:** Hero mit Nickname, Avatar, Status, aktive
   Jahre, bekannte Gruppen, wichtigste Rollen, „Bekannt für", kuratierte Badges.
2. **Ebene 2 — Geschichte/Gruppenbezug:** Mitgliedschaften (App-/historisch getrennt)
   + Profil-Story (`member_story_html` via `RichTextRenderer`).
3. **Ebene 3 — filterbare Contributions:** Beiträge filterbar nach
   Anime/Gruppe/Rolle/Zeitraum/Status.

Zusätzlich liefert Phase 74 die laut Phase-72 **D-06** gekoppelten Memorial-
Schreibaktionen und die Korrektur-melden-Aktion:
- **Memorial-Setter** (nur Global Admin, auditiert),
- **Claim-Sperre** gegen Memorial-Profile (server-seitig, auditiert),
- **Korrektur-melden** (registrierte User → review-gebundener Vorschlag).

**Read-Schwerpunkt** über bestehende API-Seams (`getMemberProfile`,
`getMemberContributions`, Badge-Service) und die in Phase 72 definierten
Status-/Sichtbarkeits-/Projektions-Felder.

**Explizit NICHT in Phase 74:**
- Kein zweites Public-Member-Modell, keine neue Route, keine ad-hoc-Fetches,
  keine Token-/Cookie-Direktzugriffe (Lock A/K).
- Kein kuratierbares „Bekannt für"-Pflegefeld (read-only abgeleitet, kein Schreib-Flow).
- Keine `/admin/users`-Rechtezentrale (Phase 80) vorbauen.
- Keine Account-Deaktivierung/Login-Sperre beim Memorial-Setzen (nur Profil-Status).
- Keine server-seitige Contribution-Filterung/Pagination (Filter bleiben client-seitig).
- Keine Badge-State-Neuberechnung im UI (Badge-Service ist Quelle).

**Abhängigkeit:** `Depends on: Phase 72` — die konsumierten Status-/Projektions-
DTOs (`memorial`-Statuswert, Contribution-Status/-Sichtbarkeit, Mitglied/
Mitwirkender/historisch-Trennung) entstehen dort. Phase 72 ist geplant, aber zum
Diskussionszeitpunkt **noch nicht ausgeführt** — exakte Feld-/Enum-Namen liefert
72 beim Execute; der Planner liest `72-CONTEXT.md`/`72-0X-PLAN.md`.

</domain>

<decisions>
## Implementation Decisions

### Seiten-Aufbau / Drei-Ebenen-Layout (Decision C)
- **D-01:** **Kuratierte einspaltige Scroll-Seite mit Sticky-Anker-Nav**
  (Desktop = klebende Sektions-Nav mit Ankern; Mobil = horizontal scrollbare
  Chip-Leiste), konsistent mit Phase 73 (D-01..D-04). Die bestehende schlichte
  Member-Seite und ihre Components (`MemberProfileHero`, `MembershipsSection`,
  `MemberRoleTimeline`, `RecentContributionsSection`) werden zu Sektionen
  umgebaut/erweitert — **kein Wegwerfen**, kein zweites Modell.
- **D-02:** **Verbindliche Sektions-Reihenfolge:**
  **Hero (Identität) → „Bekannt für"/Badges → Gruppen & Geschichte
  (Mitgliedschaften + Story) → filterbare Contributions.**
- **D-03:** **„Bekannt für" / Highlights automatisch abgeleitet (read-only)** aus
  vorhandenen Daten (häufigste/bestätigte Rollen, aktive Jahre, bekannte Gruppen).
  KEIN neues DB-/Pflegefeld, kein Schreib-Flow (analog Phase 73 D-05).
- **D-04:** **Story** (`member_story_html`) lebt in Ebene 2 (Gruppen & Geschichte)
  und rendert ausschließlich über `RichTextRenderer` (server-sanitiertes HTML).
- **D-05:** **Empty-States als Platzhalter** (Abschnitt bleibt sichtbar mit dezentem
  Hinweis), damit Sektions-Anker stabil bleiben (analog Phase 73 D-15).

### Contribution-Filter & Rollen-Vereinfachung (Decision C)
- **D-06:** **Client-seitige Filterung** der Contributions
  (Anime/Gruppe/Rolle/Zeitraum/Status) auf der einmal geladenen `role_timeline`
  (`useMemo`). **Kein** Contract-/Endpoint-Change, keine server-seitige Filterung/
  Pagination in 74.
- **D-07:** **Vereinfachte Hauptrollen bleiben stabil** (z. B. „Timing",
  „Übersetzung"); **Detail-Subtypes/Notes** (Dialog-/Karaoke-Timing, Song-/
  Dialogübersetzung, Translation Check, Segmentbezüge) werden über **Inline-Expand
  pro Contribution** sichtbar gemacht — **NICHT** als neue Hauptrollen.
- **D-08:** **Unbestätigte/historische Contributions** werden **sichtbar, aber
  optisch gedämpft** mit Badge **„unbestätigt"** dargestellt (bestätigte prominent);
  der **Status-Filter** kann sie zusätzlich ein-/ausblenden (analog Phase 73 D-09).
  Nutzt das bestehende `has_unverified`-Flag bzw. die Phase-72-Status-/Konflikt-Achsen.

### Status, Memorial & Badges (Decision C, J/12, Badges 13)
- **D-09:** **Status-Pill neben dem Nickname + erklärender Tooltip** für die 5
  Status `active / historical / unclaimed / claimed / memorial`. Memorial erhält
  eine eigene Sonderbehandlung (D-10).
- **D-10:** **Memorial = eigene würdevolle Hero-Variante + Unterdrückung.** Memorial
  rendert eine ruhige Sonder-Hero-Variante mit Gedenk-Sprache
  („Dieses Profil wird als historisches Gedenkprofil geführt." statt „zuletzt aktiv
  vor X Jahren"); **normale Aktivitätsmetriken und Mengen-/Gamification-Badges
  werden komplett unterdrückt**; Contributions/Geschichte bleiben **würdig sichtbar**
  (kein Wegblenden der Beiträge). (Lock J/Entscheidung 12.)
- **D-11:** **Badge-Kuratierung „wenige oben, mehr im Detail":** feste Anzahl
  prominenter Badges im Hero (Top-N, z. B. 3–5, nach Kategorie/Wichtigkeit sortiert),
  Rest hinter „alle anzeigen"/Detailbereich. **Quelle = Badge-Service**, **nur
  `public`-Sichtbarkeit**; **kein** Neuberechnen des Badge-State im UI (Lock 13).
  Owner-Sichtbarkeitssteuerung bleibt die bestehende (`public/internal/hidden`,
  `/me/badges`) — kein neues „featured"-Feld in 74.

### Write-Scope Phase 74 (Decision J/12, D-06 aus Phase 72; Decision 6 für Korrektur)
- **D-12:** **Alle drei Schreibaktionen shippen in 74** (Memorial-Setter +
  Claim-Sperre + Korrektur-melden) — erfüllt Erfolgskriterien 3 & 4 und die
  D-06-Kopplung „Schutz + Setzbarkeit gemeinsam".
- **D-13:** **`memorial` ist ein Status auf dem Member-Profil (`members`)**, nicht
  auf dem `app_user`-Account. Gilt für **jedes** Member-Profil — rein **historisch
  (ggf. ungeclaimt)** ODER **geclaimt/aktiv (app_user-verknüpft)**. Das Setzen lässt
  den `app_user`-Login/Account **unberührt** (keine Account-Deaktivierung in 74).
- **D-14:** **Nur Global Admin** darf `memorial` setzen (Lock J: „nur Global Admin
  setzbar"). Capability-gated Backend-Endpoint.
- **D-15:** **Jeder relevante Vorgang wird auditiert** (Actor-User-ID, Zeitpunkt,
  Ziel-Profil): Memorial-Setzen UND Claim-Sperr-/Ablehn-Ereignisse. **Audit-Spur ist
  NICHT öffentlich** (intern, nicht im Public-Profil sichtbar). Korrektur-Vorschläge
  tragen Submitter-Identität.
- **D-16:** **Memorial-Setter-Einstieg im Fansub Leader Workspace**
  (`/admin/fansubs/[id]/edit`, bestehende Member-/Claim-Panels), **ohne** `/admin/users`
  vorzubauen. **Caveat:** Die Aktion bleibt **Global-Admin-only** und wirkt **global**
  auf das Member-Profil (Memorial ist nicht gruppengebunden) — der Workspace ist nur
  der **Einstiegspunkt**, nicht der Capability-Scope.
- **D-17:** **Claim-Sperre server-seitig erzwingen:** Claim-Flows gegen ein
  `memorial`-Profil werden **im Backend** abgelehnt (nicht nur UI-Gate) + verständlicher
  UI-Hinweis; das Ablehn-Ereignis wird geloggt (D-15). Reuse der bestehenden Claim-
  Strukturen (`member_claims`/`member_claim_invitations`, `ClaimManagementPanel`,
  `MemberClaimSection`).
- **D-18:** **Korrektur-melden:** nur **registrierte User** (Lock/Entscheidung 6:
  „registriert = darf vorschlagen"); Vorschlag trägt **Submitter-ID, Zielkontext
  (Profil/Contribution/Rolle) und Freitext-Begründung** und erzeugt **ausschließlich
  einen review-gebundenen Vorschlag** (keine direkte öffentliche Änderung,
  Erfolgskriterium 3). Reuse bestehender Proposal-/Review-Strukturen.

### Claude's Discretion
- **Konkrete Public-Badge-Quelle für den angezeigten Member:** Heute lädt
  `/members/[slug]/page.tsx` `getMyBadges()` (Badges des **Viewers**). Für ein echtes
  Public-Profil müssen die **public-sichtbaren Badges des angezeigten Members** kommen
  — entweder eingebettet in das `getMemberProfile`-DTO **oder** ein public Endpoint
  (`GET /members/:slug/badges`). Planner entscheidet unter **Lock K** (Contract-zuerst:
  OpenAPI + DTO + Repo + `api.ts`-Typen gemeinsam). Constraint: nur `public`, aus
  Badge-Service, kein UI-Neuberechnen.
- **Ziel-/Reuse-Struktur des Korrektur-Vorschlags** (welche Proposal-/Review-Tabelle/
  welcher Endpoint, Mapping auf bestehende Review-Queue) — Planner unter Lock H
  (Claims ≠ Requests ≠ Contributions strikt getrennt) und Lock K.
- **Exakte Audit-Tabelle/-Mechanik** für D-15 (bestehende Audit-Tabellen wiederverwenden).
- Komponenten-Split (Sektions-Komponenten vs. Erweiterung bestehender), CSS-Module-
  Struktur, Sticky-Nav-/Chip-Implementierung, Top-N-Schwellwert/Sortierung der Badges,
  konkrete „Bekannt für"-Kennzahlen, Filter-UI-Form (Chips/Dropdowns) — Planner/Executor,
  solange D-01..D-18, das 450-Zeilen-Limit, das UI-Primitives-Gebot und die v1.2-Locks
  eingehalten werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K;
  insb. **Entscheidung 4 / Lock C** (Public Member Profile: Hero, Status, Gruppen,
  Rollen, Badges, Contributions, Korrekturvorschläge, Memorial; Reuse Member API,
  Public Member Components, `RichTextRenderer`, Badge-Service), **Entscheidung 12 /
  Lock J** (Memorial: eigener Status, nur Global Admin, nicht claimbar, nicht
  gamifiziert, moderiert), **Entscheidung 13** (Badges: wenige oben/mehr im Detail,
  Owner-Sichtbarkeit, kein UI-Neuberechnen, Memorial-Sonderregeln), **Entscheidung 6**
  (registrierte User dürfen vorschlagen, nicht veröffentlichen), **Entscheidung 14 /
  Lock K** (Contract-Disziplin), **Entscheidung 10 / Lock H** (Claims/Requests/
  Contributions getrennt). **MUST read.**

### Fundament-Phase (Quelle der konsumierten Projektionen/DTOs/Status)
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` —
  `memorial`-Statuswert (D-06: Setter+Claim-Sperre → Phase 74), Contribution-Status
  vs. Konflikt-Dimension (`dispute_state`), Sichtbarkeit (`visibilities`) +
  Review-/Lebenszyklus-Status (D-03), Mitglied/Mitwirkender/historisch-Trennung.
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-0X-PLAN.md` /
  `72-RESEARCH.md` — konkrete DTO-/Feld-/Enum-Namen, sobald Phase 72 ausgeführt ist.

### Schwester-Phase (Layout-Analogie, gleiche Locks)
- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md` —
  Scroll-Seite + Sticky-Nav-Paradigma (D-01..D-04), gedämpfte unbestätigte Nennungen
  (D-09), Empty-States (D-15), Member-Verlinkung → `/members/[slug]`.

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  Member-Medien (`media_assets.owner_member_id`), Claims, Contributions.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung ohne
  Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Member/Claim/
  Contribution/historisch.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-/Typ-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — falls admin-content-Projektionen betroffen
  (Memorial-Setter im Leader Workspace).
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch, Lock K).

### Bestehende Seite & Reuse-Komponenten (kein zweites Modell)
- `frontend/src/app/members/[slug]/page.tsx` — bestehende Public-Member-Seite
  (Server Component; lädt `getMemberProfile`, `getMemberContributions`, Badges).
- `frontend/src/components/profile/MemberProfileHero.tsx` — Hero (erweitern um
  Status-Pill, „Bekannt für", Memorial-Variante).
- `frontend/src/components/profile/MemberBadgeChips.tsx` + `memberBadgeLabels.ts` —
  Badge-Anzeige (Top-N + Expand, public-Quelle).
- `frontend/src/components/profile/MemberRoleTimeline.tsx` — Rollen-/Contribution-
  Timeline (Filter + Inline-Expand).
- `frontend/src/components/profile/MembershipsSection.tsx` — Gruppen/Mitgliedschaften.
- `frontend/src/components/profile/RecentContributionsSection.tsx` /
  `RecentMediaSection.tsx` — Beitrags-/Medien-Vorschau.
- `frontend/src/components/editor/RichTextRenderer.tsx` — Story-Rendering (server-
  sanitiertes HTML, sicher).
- Globales Design-System `@/components/ui` (Button, Card, Select, Tabs, … — Pflicht
  laut CLAUDE.md; native `<select>/<input>/<textarea>` vermeiden).

### Backend (Reuse/Erweiterung — kein neues Modell)
- `backend/internal/handlers/app_public_profile.go` — `GET /api/v1/members/:slug`.
- `backend/internal/handlers/contributions_public_handler.go` —
  `GET /api/v1/members/:slug/contributions`.
- `backend/internal/handlers/member_badges_handler.go` — Badge-Handler (Sichtbarkeit).
- `backend/internal/models/member_profile.go` — `PublicMemberProfile`-DTO (erweitern
  um Status/Memorial/Badges/„Bekannt für").
- `backend/internal/repository/member_profile_repository.go`,
  `anime_contributions_public_repository.go`, `badge_repository.go` — Projektionen.
- Claim-Strukturen: `member_claims`, `member_claim_invitations`,
  `ClaimManagementPanel`, `MemberClaimSection` (Claim-Sperre-Einhängung).

### Datenquellen (Decision 4 — sauber halten)
- `members`, `member_badges` — Profil/Badges.
- `hist_fansub_group_members`, `hist_group_member_roles` — historische Mitgliedschaft.
- `fansub_group_members`, `fansub_group_member_roles` — App-Mitgliedschaft.
- `anime_contributions`, `anime_contribution_roles`, optional `release_member_roles`
  — Contributions/Rollen (Status draft/proposed/confirmed + Phase-72-Konflikt/Sichtbarkeit).
- `media_assets.owner_member_id` — Member-Medien.
- `visibilities` (Lookup, Migration 0037) — Sichtbarkeits-Achse (Phase 72 D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Bestehende Public-Member-Seite + Components** (`page.tsx`, `MemberProfileHero`,
  `MembershipsSection`, `MemberRoleTimeline`, `RecentContributionsSection`,
  `RecentMediaSection`, `MemberBadgeChips`, `VerifiedBadge`) → erweitern statt neu
  bauen (Lock A).
- **API-Helper** in `frontend/src/lib/api.ts`: `getMemberProfile(slug, authToken?)`,
  `getMemberContributions(slug)` (liefert `role_timeline` + `has_unverified`),
  `getMyBadges`, `patchMyBadgeVisibility`.
- **`RichTextRenderer`** → Story-Rendering (sicher, server-sanitiert).
- **Badge-Sichtbarkeitsmodell** (`public/internal/hidden`) → Basis der Top-N-Kuration.
- **Claim-Panels** (`ClaimManagementPanel`, `MemberClaimSection`) → Einhängepunkt
  der Claim-Sperre.

### Established Patterns
- Public-Seite als **Server Component** mit serverseitigem Fetch über `lib/api.ts`
  (kein ad-hoc-Fetch im Browser, Lock K).
- Envelope-Konvention `{"data": ...}` bzw. `{ visible: false, reason }` für
  Sichtbarkeits-Gating.
- Globales UI-Primitives-Gebot (`@/components/ui`); korrekte deutsche Umlaute in allen
  user-facing Strings (CLAUDE.md).
- Produktionsdateien ≤ 450 Zeilen → Seite/Components in Sektions-Teile splitten.
- Append-only Migrationen unter `database/migrations/` (nächste freie Nummer prüfen;
  0089/0091 bereits vergeben) — falls Memorial-Setter/Audit additive Felder braucht.

### Integration Points
- Konsum der **Phase-72-Status-/Projektionsfelder** (`memorial`, Contribution-Status/
  Konflikt/Sichtbarkeit, Mitglied/Mitwirkender/historisch) — Quelle für Status-Pill,
  Memorial-Variante, gedämpfte unbestätigte Contributions.
- **Memorial-Setter** → Capability-gated Backend-Endpoint + Einstieg in
  `/admin/fansubs/[id]/edit`; Audit-Eintrag pro Vorgang.
- **Claim-Sperre** → server-seitige Ablehnung in den bestehenden Claim-Flows.
- **Korrektur-melden** → registrierter-User-Vorschlag in bestehende Review-/Proposal-
  Strukturen (Lock H/K).
- **Badge-Public-Quelle** → Member-Profil-DTO oder public Badge-Endpoint (Planner, Lock K).

</code_context>

<specifics>
## Specific Ideas

- **Memorial-Geltungsbereich (Nutzer-Klarstellung):** „Gilt memorial für historische
  wie auch App-User? — manche sterben, andere sind schon gestorben." → `memorial` gilt
  für **jedes** Member-Profil (historisch ODER geclaimt/aktiv); Status auf `members`,
  `app_user`-Account unberührt. „Platform Admin kann immer alles" → nur Global Admin
  setzbar. „Jeder Schritt muss geloggt sein … Log muss aber nicht öffentlich sein." →
  vollständige, **nicht-öffentliche** Audit-Spur (D-15).
- **Memorial-Sprachregelung (Lock J):** „Dieses Profil wird als historisches
  Gedenkprofil geführt." statt „Zuletzt aktiv vor 10 Jahren".
- **Layout-Analogie Phase 73:** kuratierte einspaltige Scroll-Seite, Sticky-Anker-Nav
  (Desktop) / Chip-Leiste (Mobil), Empty-States als Platzhalter.

</specifics>

<deferred>
## Deferred Ideas

- **`/admin/users` + User Detail Drawer** (komfortable Rechte-/Memorial-Verwaltung)
  → **Phase 80** (Decision 11/I). In 74 nur Leader-Workspace-Einstieg + Endpoint.
- **Account-Deaktivierung/Login-Sperre** beim Memorial-Setzen → bewusst NICHT in 74
  (Memorial betrifft nur den Profil-Status, nicht den `app_user`-Account).
- **Server-seitige Contribution-Filterung/Pagination** → erst bei nachgewiesenem
  Volumen-Bedarf; in 74 client-seitig.
- **Owner-gepinnte „featured" Badges / kuratierbares „Bekannt für"-Feld** → würde
  neues Feld + Schreib-Flow erfordern; eher `/me/profile`/`/me/badges`-Erweiterung,
  nicht 74.
- **Breiteres Korrektur-/Vorschlags-Spektrum + Review-Abwicklung** (Leader-Review der
  Vorschläge) → Review-Seite in **Phase 78**; registrierte-User-Vorschläge breiter in
  **Phase 76** (Decision 6).
- **Moderierte „Erinnerungen" an Memorial-Profilen** (Lock J: „Erinnerungen moderiert")
  → eigener Slice, nicht zwingend in 74 (Erfolgskriterien fordern nur würdevolle
  Darstellung + Claim-Sperre + keine Gamification).

### Reviewed Todos (not folded)
- `2026-06-03-member-profil-ui-und-params-bug.md` — Public-Member-Profil-Bug; in
  Phase 73 als „gehört zu Phase 74" markiert. Der Planner sollte prüfen, ob der
  dort beschriebene Params-/UI-Bug beim Umbau der Member-Seite mit aufgegriffen wird
  (nicht als formell gefaltetes Scope-Item, aber relevanter Kontext).
- `Redesign /me/profile content model after UAT 3` (STATE Pending Todo) — betrifft
  **eigenes** Profil (`/me/profile`), nicht das Public-Profil → anderer Surface.

</deferred>

---

*Phase: 74-public-member-profile-members-slug-memorial*
*Context gathered: 2026-06-04*
