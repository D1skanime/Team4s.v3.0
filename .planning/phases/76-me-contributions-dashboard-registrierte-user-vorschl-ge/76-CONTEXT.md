# Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Die **bestehende** Seite `/me/contributions` (heute: schlichte 800px-Spalte mit
`MyContributionsSection` = nur bestätigte Mitwirkungen + `MyProposalsSection` =
eigene Vorschläge) wird zu einem **persönlichen Beitrags- & Klärungsdashboard**
ausgebaut (v1.2-DISCUSSION **Entscheidung 5**) und um die
**registrierte-User-Beteiligungsflows** (**Entscheidung 6**: Fehler/Story/Medien/
Contribution melden, Claim-Einstieg) **review-gebunden** erweitert.

**KEINE neue Seite** — die bestehende Route und ihre Komponenten werden erweitert,
nicht ersetzt. Reuse von `getMyAnimeContributions`, den bestehenden confirm/reject/
visibility-Endpoints und den Contribution-/Proposal-/Review-Strukturen.

Phase 76 liefert:
1. **Klärungsdashboard** (Decision 5): Aktions-Inbox („offene Aktionen") oben,
   Summary-Aggregat, „Das war ich"/„Das war ich nicht"/„Details korrigieren",
   öffentliche Sichtbarkeit, Filter (Anime/Gruppe/Rolle/Zeitraum/Status),
   Verlinkung auf Claim-Flow ohne Vermischung.
2. **Registrierte-User-Vorschlagsflows** (Decision 6): zentral auf `/me/contributions`
   ein unified Melde-Einstieg für Fehler/Korrektur, Story, Medien (neu) sowie
   Integration der bestehenden Contribution- und Claim-Flows; alles review-gebunden,
   mit Submitter/Zielkontext/Typ/Status/Reviewzuständigkeit/Audit.

**Explizit NICHT in Phase 76:**
- Keine kontextuellen Melde-Buttons auf den Public-Seiten (`/anime/[id]`,
  `/members/[slug]`, `/fansubs/[slug]`) — der Vorschlags-Einstieg liegt in 76
  **ausschließlich zentral** auf `/me/contributions` (D-04). (Die Phase-74-
  Korrektur-melden-Aktion am Member-Profil existiert separat und bleibt.)
- Keine server-seitige Filterung/Pagination der eigenen Beiträge — Filter bleiben
  **client-seitig** (D-11, analog Phase 74 D-06).
- Keine breite **Leader-Review-Oberfläche** für die neuen Vorschlagstypen
  (Story/Medien/Fehler) — Phase 76 erzeugt nur die review-gebundenen Vorschläge;
  die Leader-Review-Abwicklung gehört in die Leader-Workspace-/Review-Phasen (77/78).
- Kein Wiki-Verhalten, keine direkte öffentliche Änderung durch registrierte User
  (registriert = darf vorschlagen, NICHT veröffentlichen; Decision 6).
- Keine Claim-/Contribution-/Request-Vermischung (Lock H strikt).

**Abhängigkeit:** `Depends on: Phase 72` — die konsumierten Status-/Konflikt-/
Sichtbarkeits-Projektionen (Contribution-Status vs. `dispute_state`, Sichtbarkeit,
Mitglied/Mitwirkender-Trennung) entstehen dort. Zum Diskussionszeitpunkt ist
Phase 72 geplant (4 Pläne), aber ggf. noch nicht ausgeführt — exakte Feld-/Enum-
Namen liefert 72 beim Execute; der Planner liest `72-CONTEXT.md`/`72-0X-PLAN.md`/
`72-RESEARCH.md`.

</domain>

<decisions>
## Implementation Decisions

### Dashboard-Layout & Triage (Decision 5)
- **D-01:** **Aktions-orientiertes Dashboard, KEIN Sticky-Nav.** `/me/contributions`
  ist ein **Arbeits-/Aktions-Surface** (nicht ein Präsentations-Profil wie die
  Public-Seiten 73/74). Bestehende Seite + Komponenten (`page.tsx`,
  `MyContributionsSection`, `MyProposalsSection`, `ContributionCard`) werden
  **erweitert/umgebaut**, nicht weggeworfen.
- **D-02:** **Verbindliche Reihenfolge: Klärungs-Inbox („offene Aktionen") zuoberst
  → Summary-Aggregat → Mitwirkungen/Vorschläge-Listen.** Die Inbox ist das, was
  „deine Aufmerksamkeit braucht".
- **D-03:** **Inbox-Inhalt = vier Quellen:**
  (a) **zugeordnet-aber-unbestätigt** — vom Leader DIR zugeordnete Mitwirkungen ohne
  Member-confirm/reject („Das war ich"/„war ich nicht"); Kernfall Decision 5.
  (b) **bestrittene / im Konflikt** (disputed) — laufende Klärung.
  (c) **eigene vom Leader abgelehnte Vorschläge** (mit Ablehngrund) — als Hinweis/
  Korrektur-Einstieg in der Inbox, nicht nur unten in „Eigene Vorschläge".
  (d) **frisch bestätigte mit offener Sichtbarkeits-Entscheidung** — sanfter Prompt.
  Hinweis: Heute zeigt `MyContributionsSection` nur `confirmed`; die
  pending/zugeordnet-Ansicht (`ContributionCard mode="pending"` mit Bestätigen/
  Ablehnen) muss erst in die Inbox verdrahtet werden.

### Registrierte-User-Vorschlagsflows (Decision 6)
- **D-04:** **Einstieg NUR zentral auf `/me/contributions`.** Keine kontextuellen
  Melde-Buttons auf Public-Seiten in 76 (bewusste Eingrenzung trotz Phase-74-
  Kontextmuster). Der Nutzer wählt den Zielkontext im Melde-Flow selbst.
- **D-05:** **EIN unified „Vorschlagen/Melden"-Einstieg** (ein primärer Button →
  Modal/Drawer): zuerst **Typ wählen** → **Zielkontext** → **typ-spezifisches Feld**.
  Eine konsistente Oberfläche über die globalen UI-Primitives (`Modal`/`Drawer`,
  `Select`, `FormField` …).
- **D-06:** **Voller Decision-6-Typensatz shippt in 76:**
  **NEU zu bauen** — *Fehler/Korrektur melden* (allgemein, Zielkontext-Auswahl +
  Freitext), *Story vorschlagen*, *Medien vorschlagen* (review-gebunden mit
  Reviewstatus/Sichtbarkeit gemäß Decision-8-Medien-Matrix; größter Aufwand = Upload).
  **NUR INTEGRIEREN (kein Neubau)** — *Contribution vorschlagen* (bestehender
  `ProposalForm`, eigene Gruppen) + *Claim starten* (Verlinkung/Einstieg), strikt
  getrennt (Lock H). → Große Phase; Planner wird voraussichtlich pro Typ/Slice splitten.
- **D-07:** **Jeder Vorschlag trägt Submitter, Zielkontext, Typ, Text/Medium, Status,
  Reviewzuständigkeit, Audit** (Decision 6). **Registriert = darf vorschlagen +
  eigenes verwalten, NICHT veröffentlichen.** Alles über bestehende Review-Flows;
  keine direkte öffentliche Änderung. Vorschläge dürfen **NICHT in die falsche
  Domäne** schreiben (Decision 6 / Lock H).

### Klärungsaktionen & Korrektur (Decision 5)
- **D-08:** **„Das war ich" = confirm** (bestehender Endpoint
  `POST /me/anime-contributions/:id/confirm`). **KEINE Claim-Logik** (Decision 5:
  Contribution-Zuordnung bestätigen, nicht claimen).
- **D-09:** **„Das war ich nicht" mit PFLICHT-Begründung.** Öffnet eine Bestätigung
  mit **erforderlichem** Freitextfeld; **löscht nichts** → setzt Konflikt-/
  Reviewstatus (bestehender `reject → disputed`, aber um einen **Member-`reason`
  erweitern**). Die Begründung wird Teil des Konflikt-/Reviewkontexts, den der Leader
  sieht. (Heute nimmt der reject-Endpoint keinen Member-Grund → Contract/Endpoint
  erweitern, Lock K.)
- **D-10:** **„Details korrigieren" = vorbefüllter Korrektur-Vorschlag** über die
  NEUE Fehler/Korrektur-melden-Mechanik (D-06), Ziel = diese Contribution; erzeugt
  einen **review-gebundenen** Vorschlag (Leader prüft). **EINE Korrektur-Mechanik —
  keine zweite.** Lock H/K.

### Filter & Summary-Aggregat (Decision 5)
- **D-11:** **Client-seitige Filterung** (`useMemo`) auf den einmal geladenen Daten
  (analog Phase 74 D-06). **Kein** neuer server-seitiger Filter-/Pagination-Endpoint
  und **kein** Contract-Change dafür in 76.
- **D-12:** **Summary-Aggregat als KLICKBARE Stat-Chips, die zugleich als Filter
  wirken.** Das Summary zeigt Zähler **pro Status/Gruppe/Anime/Rolle** als Chips;
  Klick filtert (Toggle) die Liste darunter. Summary UND Filter = dieselbe Mechanik.
  Filterachsen: **Anime / Gruppe / Rolle / Zeitraum / Status**.

### Claude's Discretion
- **Backend-Mechanik der Vorschläge:** ob eine **generische** Request/Proposal-
  Pipeline (Typ-Diskriminator + Domänen-Routing) oder **pro-Typ**-Tabellen/-Endpoints
  — Planner unter **Lock H** (Claims ≠ Requests ≠ Contributions strikt getrennt;
  Vorschläge nie in die falsche Domäne) und **Lock K** (Contract-zuerst: OpenAPI +
  DTO + Repo + `api.ts`-Typen gemeinsam). Konsumiert ggf. Phase-72-Status-/Konflikt-/
  Sichtbarkeitsfelder.
- **Datenunterscheidung „zugeordnet-aber-unbestätigt" (Leader-zugeordnet) vs.
  „eigener Vorschlag in Prüfung":** beide heute `status='proposed'` — Planner klärt
  die Projektion/Herkunft (ggf. via `can_self_publish` bzw. Phase-72-Feldern), damit
  die Inbox (D-03a) korrekt befüllt wird.
- **Zielkontext-Auswahl-UI pro Typ** (welche Ziele wählbar: Anime/Contribution/
  Gruppe/Profil) und wie **„Medien vorschlagen"** den Upload an die **Decision-8-
  Medien-Matrix** bindet (Owner-Typ/-ID, Kategorie, Sichtbarkeit, Reviewstatus,
  Uploader, Audit).
- **Audit-Tabelle/-Mechanik** (bestehende wiederverwenden), Komponenten-Split
  (Inbox/Summary/Filter/Melde-Modal als eigene Komponenten), CSS-Module-Struktur,
  exakte Chip-/Filter-UI-Form — Planner/Executor, solange D-01..D-12, das
  450-Zeilen-Limit, das UI-Primitives-Gebot, die Umlaut-Regel und die v1.2-Locks
  eingehalten werden.

### Folded Todos
- **`2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md`** —
  Contribution-Dropdowns/-UI auf die globalen `@/components/ui`-Primitives umstellen
  (Phase-67-Folgearbeit). **Gefaltet**, weil Phase 76 die Contribution-UI ohnehin
  anfasst (`ContributionCard`, `ProposalForm`, `VisibilityDropdown`, neues Melde-
  Modal) und CLAUDE.md die Primitives verpflichtend macht — beim Umbau miterledigen.
  *(Hinweis: Die Todo-Auswahl in der Diskussion war widersprüchlich — „Keine falten"
  zusammen mit zwei Folds gewählt; konservativ interpretiert wurde nur dieser direkt
  im Pfad liegende, ohnehin verpflichtende Punkt gefaltet.)*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen; insb.
  **Entscheidung 5** (`/me/contributions` als Beitrags-/Klärungsdashboard: Summary-
  Aggregat, offene Aktionen, zugeordnet-aber-unbestätigt, bestritten, „Das war ich"/
  „war ich nicht"/„Details korrigieren", Sichtbarkeit, Filter, Claim-Verlinkung ohne
  Vermischung; „Das war ich nicht" löscht nichts → Konflikt), **Entscheidung 6**
  (registrierte User: Fehler/Story/Medien/Contribution vorschlagen, Claim starten;
  vorschlagen ≠ veröffentlichen; Submitter/Zielkontext/Typ/Status/Review/Audit;
  keine falsche Domäne), **Entscheidung 8** (Medien-Ownership-Matrix + Pflichtfelder
  für „Medien vorschlagen"), **Lock H** (Claims/Requests/Contributions getrennt),
  **Lock K** (Contract-Disziplin). **MUST read.**

### Vorgänger-/Schwester-Phasen (gleiche Locks, wiederverwendbare Muster)
- `.planning/phases/74-public-member-profile-members-slug-memorial/74-CONTEXT.md` —
  **Korrektur-melden-Mechanik** (registrierter-User-Vorschlag, review-gebunden,
  Submitter-ID/Zielkontext/Freitext), **client-seitige Filterung** (D-06),
  Layout-/Empty-State-Muster.
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` +
  `72-RESEARCH.md` + `72-0X-PLAN.md` — Contribution-Status vs. Konflikt-Dimension
  (`dispute_state`), Sichtbarkeit (`visibilities`), Mitglied/Mitwirkender-Trennung;
  Quelle der Inbox-/Status-Projektionen (exakte Feld-/Enum-Namen nach Execute).

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte
  (`/me/contributions`, Contributions, Claims, Member-Medien).
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung ohne
  Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Member/Claim/
  Contribution/historisch.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-/Typ-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract (neue Melde-/Korrektur-
  Endpoints, erweiterter reject-Endpoint mit Member-`reason`).
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch, Lock K;
  enthält `getMyAnimeContributions`, `confirmAnimeContribution`,
  `rejectAnimeContribution`, `patchAnimeContributionVisibility`,
  `selfPublishContribution`, `getMyMemberships`, Claim-Helfer).

### Bestehende Seite & Reuse-Komponenten (erweitern, nicht ersetzen)
- `frontend/src/app/me/contributions/page.tsx` — bestehende Dashboard-Seite (Client
  Component; lädt `getMyAnimeContributions`).
- `frontend/src/components/contributions/MyContributionsSection.tsx` — heute nur
  `confirmed`; um Inbox/Summary/Filter erweitern.
- `frontend/src/components/contributions/MyProposalsSection.tsx` — eigene Vorschläge
  (In Prüfung/Bestätigt/Abgelehnt, Self-Publish, `ProposalForm`-Einstieg).
- `frontend/src/components/contributions/ContributionCard.tsx` — Modes
  `confirmed`/`pending`/`proposal` (Bestätigen/Ablehnen, Visibility, Ablehngrund).
- `frontend/src/components/contributions/ProposalForm.tsx` — Contribution-Vorschlag
  (Reuse im unified Melde-Einstieg).
- `frontend/src/components/contributions/VisibilityDropdown.tsx`,
  `contributions.module.css` — Sichtbarkeit/Styling.
- `frontend/src/components/contributions/ReviewQueue.tsx` — Leader-Review-Referenz
  (Phase 76 erzeugt nur Vorschläge; Review-Abwicklung ist 77/78).
- Globales Design-System `@/components/ui` (`Button`, `Card`, `Modal`, `Drawer`,
  `Select`, `FormField`, `Badge`, `EmptyState`, `SectionHeader` … — Pflicht laut
  CLAUDE.md; native `<select>/<input>/<textarea>` vermeiden).

### Backend (Reuse/Erweiterung)
- `backend/internal/handlers/contributions_me_handler.go` —
  `GET /me/anime-contributions`, confirm/reject/visibility (reject um Member-`reason`
  erweitern, D-09).
- `backend/internal/repository/anime_contributions_proposal_repository.go` —
  Proposal-Persistenz (Reuse/Erweiterung für neue Vorschlagstypen).
- `backend/internal/repository/member_claim_invitations_repository.go` +
  Claim-Handler — Claim-Einstieg (Verlinkung, Lock H).

### Datenquellen (Decision 6/8 — sauber halten, Lock H)
- `anime_contributions`, `anime_contribution_roles` — Contributions/Rollen (Status +
  Phase-72-Konflikt/Sichtbarkeit).
- `member_claims`, `member_claim_invitations` — Claims (strikt getrennt).
- `media_assets`, `media_files` (+ Decision-8-Owner-/Kategorie-/Sichtbarkeitsfelder)
  — „Medien vorschlagen".
- `visibilities` (Lookup, Migration 0037) — Sichtbarkeits-Achse (Phase 72 D-03).
- Bestehende Audit-Tabelle(n) — für D-07 (Reuse).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Bestehende `/me/contributions`-Seite + Komponenten** (`page.tsx`,
  `MyContributionsSection`, `MyProposalsSection`, `ContributionCard`,
  `ProposalForm`, `VisibilityDropdown`) → erweitern statt neu bauen (D-01).
- **`ContributionCard` mode="pending"** existiert bereits (Bestätigen/Ablehnen) —
  nur noch nicht in die Seite verdrahtet → direkter Baustein für die Inbox (D-03a).
- **API-Helfer** in `lib/api.ts`: `getMyAnimeContributions` (liefert `data:
  MeAnimeContribution[]` mit `status`, `role_codes`, `is_public_on_member_profile`,
  `review_note`, `can_self_publish`), `confirmAnimeContribution`,
  `rejectAnimeContribution`, `patchAnimeContributionVisibility`,
  `selfPublishContribution`, `getMyMemberships`, Claim-Helfer.
- **`MeAnimeContribution.status`** = `'confirmed'|'proposed'|'draft'|'disputed'|
  'hidden'` → Basis für Summary-Status-Achse und Inbox-Filter.

### Established Patterns
- Client-Component-Seite mit `useAuthSession` + `authorizedFetch`/`lib/api.ts`
  (kein ad-hoc-Fetch, Lock K); Envelope `{ "data": ... }`.
- Globales UI-Primitives-Gebot (`@/components/ui`); korrekte deutsche Umlaute in
  allen user-facing Strings (CLAUDE.md).
- Produktionsdateien ≤ 450 Zeilen → Inbox/Summary/Filter/Melde-Modal in eigene
  Komponenten splitten.
- Append-only Migrationen unter `database/migrations/` (nächste freie Nummer prüfen)
  — falls neue Vorschlags-/Korrektur-/Medien-Tabellen oder reject-`reason`-Feld
  additive Schemata brauchen.

### Integration Points
- **Inbox (D-03)** ↔ Phase-72-Status-/Konflikt-/Sichtbarkeitsprojektionen
  (zugeordnet-aber-unbestätigt, disputed) + bestehendes `can_self_publish`/
  `is_public_on_member_profile`.
- **„Das war ich nicht" (D-09)** ↔ reject-Endpoint (um Member-`reason` erweitern).
- **„Details korrigieren" (D-10)** ↔ neue Fehler/Korrektur-melden-Mechanik (D-06).
- **Unified Melde-Einstieg (D-05/06)** ↔ `ProposalForm` (Contribution), neue Story-/
  Medien-/Fehler-Vorschlags-Endpoints, Claim-Verlinkung (Lock H), Decision-8-Medien-
  Matrix (Upload).

</code_context>

<specifics>
## Specific Ideas

- **Einstieg bewusst NUR zentral** (D-04): trotz des Phase-74-Kontextmusters wollte
  der Nutzer in 76 die Melde-/Vorschlagsflows ausschließlich auf `/me/contributions`
  bündeln (ein unified „Vorschlagen/Melden"-Einstieg mit Typ→Ziel→Feld), nicht
  kontextuell auf den Public-Seiten.
- **„Das war ich nicht" = Pflicht-Begründung** (D-09): der Leader muss den
  Widerspruch immer einordnen können — Begründung erforderlich, nicht optional.
- **EINE Korrektur-Mechanik** (D-10): „Details korrigieren" ist bewusst derselbe
  vorbefüllte Korrektur-Vorschlag, kein zweiter Pfad.
- **Summary = Filter** (D-12): klickbare Stat-Chips sind zugleich die Filtersteuerung
  — eine Mechanik, aufgeräumtes Dashboard.

</specifics>

<deferred>
## Deferred Ideas

- **Kontextuelle Melde-Buttons auf Public-Seiten** (`/anime`, `/members`, `/fansubs`)
  → bewusst NICHT in 76 (D-04); möglicher späterer Slice, sobald die zentrale
  Mechanik steht.
- **Server-seitige Filterung/Pagination der eigenen Beiträge** → erst bei
  nachgewiesenem Volumenbedarf; in 76 client-seitig (D-11).
- **Leader-Review-Abwicklung der neuen Vorschlagstypen** (Story/Medien/Fehler) auf
  der Leader-/Review-Seite → gehört in die Leader-Workspace-/Review-Phasen (77/78);
  Phase 76 erzeugt nur die review-gebundenen Vorschläge.

### Reviewed Todos (not folded)
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Credits-UI in
  „Anime & Veröffentlichungen" konsolidieren + Permission-Brücke → betrifft
  `/admin/fansubs/[id]/edit` (Leader-Seite), gehört zu **Phase 77**, nicht
  `/me/contributions`.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — Contributor-owned Media
  + Note edit/delete → betrifft eigene Member-Medien auf **`/me/profile`** (anderes
  Surface); grenzt nur thematisch an „Medien vorschlagen".
- `2026-05-28-profile-hub-content-activity-redesign.md` — niedrige Relevanz (Score
  0.3), anderer Surface (Profil-Hub-Redesign).

</deferred>

---

*Phase: 76-me-contributions-dashboard-registrierte-user-vorschl-ge*
*Context gathered: 2026-06-05*
