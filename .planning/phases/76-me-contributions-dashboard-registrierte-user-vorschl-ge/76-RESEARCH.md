# Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge – Research

**Researched:** 2026-06-05
**Domain:** Next.js/Go Brownfield — Dashboard-Umbau + neue Vorschlagstypen (Fehler/Story/Medien) auf bestehendem Contribution-/Media-Stack
**Confidence:** HIGH (alle Kernbefunde direkt im Quellcode, Migrationen und Phase-72-Planungsdokumenten verifiziert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Aktions-orientiertes Dashboard, kein Sticky-Nav. Bestehende Seite + Komponenten erweitern, nicht ersetzen.
- **D-02:** Verbindliche Reihenfolge: Klärungs-Inbox → Summary-Aggregat → Mitwirkungen/Vorschläge-Listen.
- **D-03:** Inbox-Inhalt = vier Quellen: (a) zugeordnet-aber-unbestätigt, (b) bestritten/im Konflikt (disputed), (c) eigene vom Leader abgelehnte Vorschläge, (d) frisch bestätigte mit offener Sichtbarkeits-Entscheidung.
- **D-04:** Einstieg NUR zentral auf `/me/contributions`. Keine kontextuellen Melde-Buttons auf Public-Seiten in Phase 76.
- **D-05:** EIN unified „Vorschlagen/Melden"-Einstieg (primärer Button → Modal/Drawer): Typ → Zielkontext → typ-spezifisches Feld. Globale UI-Primitives.
- **D-06:** Voller Decision-6-Typensatz shippt: NEU = Fehler/Korrektur melden, Story vorschlagen, Medien vorschlagen. NUR INTEGRIEREN = Contribution vorschlagen (bestehender ProposalForm) + Claim starten (Verlinkung).
- **D-07:** Jeder Vorschlag trägt Submitter, Zielkontext, Typ, Text/Medium, Status, Reviewzuständigkeit, Audit. Registriert = vorschlagen + eigenes verwalten, NICHT veröffentlichen.
- **D-08:** „Das war ich" = confirm (bestehender Endpoint). KEINE Claim-Logik.
- **D-09:** „Das war ich nicht" mit PFLICHT-Begründung. Setzt Konflikt-/Reviewstatus. Reject-Endpoint um Member-`reason` erweitern. Lock K.
- **D-10:** „Details korrigieren" = vorbefüllter Korrektur-Vorschlag über neue Fehler/Korrektur-Mechanik (D-06). EINE Korrektur-Mechanik.
- **D-11:** Client-seitige Filterung (`useMemo`) auf einmal geladenen Daten. Kein neuer server-seitiger Filter/Pagination-Endpoint.
- **D-12:** Summary-Aggregat als klickbare Stat-Chips, die zugleich als Filter wirken. Achsen: Anime / Gruppe / Rolle / Zeitraum / Status.

### Claude's Discretion
- Backend-Mechanik der neuen Vorschläge: generische Pipeline vs. pro-Typ-Tabellen/-Endpoints — unter Lock H (Claims ≠ Requests ≠ Contributions getrennt) und Lock K (Contract-zuerst).
- Datenunterscheidung „zugeordnet-aber-unbestätigt" vs. „eigener Vorschlag in Prüfung".
- Zielkontext-Auswahl-UI pro Typ; Bindung von „Medien vorschlagen" an Decision-8-Matrix.
- Audit-Tabelle/-Mechanik (bestehende wiederverwenden).
- Komponenten-Split, CSS-Module-Struktur, exakte Chip-/Filter-UI-Form.

### Deferred Ideas (OUT OF SCOPE)
- Kontextuelle Melde-Buttons auf Public-Seiten (`/anime`, `/members`, `/fansubs`).
- Server-seitige Filterung/Pagination der eigenen Beiträge.
- Leader-Review-Abwicklung neuer Vorschlagstypen (Story/Medien/Fehler) → Phasen 77/78.
</user_constraints>

<phase_requirements>
## Phase Requirements

Verbindliche Entscheidungen aus `v1.2-DISCUSSION.md`:

| ID | Beschreibung | Research Support |
|----|--------------|------------------|
| **E** | `/me/contributions` wird Beitrags-/Klärungsdashboard (Reuse `getMyAnimeContributions`). | Seite + Komponenten vollständig kartiert. Erweiterung bestehender Dateien ist der richtige Ansatz. Alle API-Helfer in `api.ts` identifiziert. |
| **Runde 6** | Registrierte User: Fehler/Story/Medien/Contribution vorschlagen, Claim starten; Vorschläge nie in falsche Domäne; Submitter/Zielkontext/Typ/Status/Reviewzuständigkeit/Audit. | Audit-Tabelle (`audit_logs`, Migration 0075) vorhanden und reusable. Neue Vorschlags-Tabelle(n) oder generische Erweiterung empfohlen (siehe §Backend-Mechanik). |
| **H** | Claims, Requests, Contributions strikt getrennt. | `member_claims`, `member_claim_invitations` sind klar getrennt von `anime_contributions`. Phase 76 schreibt nie in die Claims-Domäne. Claim-Einstieg = Link/Redirect, kein Write. |
| **K** | Contract/API-Disziplin Pflicht; kein ad-hoc-Fetch; OpenAPI + DTO + Repo + `api.ts`-Typen gemeinsam. | `rejectAnimeContribution` muss erweitert werden (D-09 Member-`reason`). Alle neuen Endpoints brauchen OpenAPI-Eintrag + `api.ts`-Funktion + Frontend-Typ vor Implementation. |
</phase_requirements>

---

## Summary

Phase 76 ist die bisher aufwändigste Frontend+Backend-Kombinationsphase in Meilenstein v1.2. Sie baut auf einem gut verstandenen Brownfield-System auf: alle bestehenden Seams (`getMyAnimeContributions`, `ContributionCard`, `ProposalForm`, `MyProposalsSection`, `MyContributionsSection`) sind vollständig kartiert und erweiterbar. Die kritischen Befunde für die Planung sind:

**Befund 1 – Phase-72-Abhängigkeit ist noch nicht ausgeführt.** Phase 72 ist vollständig geplant (4 Pläne vorhanden), aber **keine einzige Migration wurde ausgeführt**: `dispute_state`, `review_status_id`, `visibility_id`, `members.profile_status` existieren noch nicht in der DB. Phase 76 muss deshalb **entweder nach Phase 72** eingeplant werden, oder Teile von 72 (insbesondere `dispute_state` auf `anime_contributions`) müssen als Wave 0 in Phase 76 mitgezogen werden. Der Planner muss diese Abhängigkeit explizit auflösen.

**Befund 2 – nächste freie Migrationsnummer ist 0097.** Migration 0096 ist bereits vergeben (`0096_hist_group_members_confirmation_audit.up.sql`). Phase-72-Plan-01 plant ebenfalls eine Migration 0096 (`0096_v12_status_foundation`) — das ist ein **Kollisionsrisiko**, sofern Phase 72 und Phase 76 in der falschen Reihenfolge ausgeführt werden. Der Planner muss die Migrationsnummern korrekt sequenzieren.

**Befund 3 – `MeAnimeContribution`-Typ fehlt `fansub_group_name`.** Das Dashboard braucht Gruppen-Filter (D-12), aber der aktuelle API-Response von `getMyAnimeContributions` enthält kein `fansub_group_name`-Feld — nur `fansub_group_id`. Eine Contract-Erweiterung der bestehenden `ListByMemberIDWithProposalFields`-Query und des `MeAnimeContribution`-Typs ist nötig (JOIN auf `fansub_groups`).

**Befund 4 – „zugeordnet-aber-unbestätigt" vs. „eigener Vorschlag" sind disambiguierbar via `created_by`.** Beide tragen `status='proposed'`. Der Unterschied: „eigener Vorschlag" hat `created_by = eingeloggter app_user_id`; „Leader-zugeordnet" hat `created_by = leader_app_user_id` (nicht der Member selbst). Die bestehende `updateMyAnimeContributionStatus`-Logik prüft bereits `createdBySelf` (via `COALESCE(created_by = $2, false)`). Der Inbox-Filter für D-03a kann dieselbe Logik client-seitig anwenden, wenn `created_by` im Response-DTO mitgeliefert wird.

**Befund 5 – `ProposalForm` nutzt native `<button>` und handgebaute Styles statt globaler UI-Primitives.** CLAUDE.md verbietet natives `<select>/<input>/<textarea>` (sind bereits durch `Select`/`Input`/`Textarea` aus `@/components/ui` ersetzt), aber die Scope-/Rollen-Toggle-Buttons sind handgebaut. Diese müssen auf `Button variant="secondary"` oder einen Toggle-Chip-Wrapper (ggf. neue UI-Primitive) migriert werden.

**Primary recommendation:** Phase 76 in mindestens 4 inhaltliche Waves aufteilen: (W0) Contract-Fundament + Schema-Prüfung + Tests; (W1) Inbox + Summary/Filter + Dashboard-Umbau; (W2) Reject-Erweiterung + unified Melde-Einstieg (Fehler/Story); (W3) „Medien vorschlagen" (Upload-Integration); (W4) UI-Primitives-Migration der Folge-Todo + Vitest-Tests.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard-Layout, Inbox, Summary, Filter (Chips) | Frontend Server (Client Component `/me/contributions`) | — | Reine Client-Komponenten-Logik; `useMemo`-Aggregat auf einmal geladenem Array (D-11). |
| `MeAnimeContribution`-Datenanreicherung (fansub_group_name, created_by) | API / Backend (Repository-Query) | Database (JOIN) | Fehlende Felder müssen in `ListByMemberIDWithProposalFields` ergänzt werden. Lock K: zuerst OpenAPI, dann DTO, dann Query. |
| Reject + Member-`reason` (D-09) | API / Backend (Handler + Repo) | Database (Spalte oder audit_logs) | Bestehender `RejectMyAnimeContribution`-Handler in `contributions_me_handler.go` muss body-Parsing + Reason-Persistenz ergänzen. |
| Neue Vorschlagstypen: Fehler/Korrektur, Story (D-06 NEU) | API / Backend (neuer Handler + Repo) | Database (neue Tabelle oder Erweiterung) | Lock H: darf NICHT in `anime_contributions` schreiben. Eigene Tabelle `member_suggestions` empfohlen (siehe §Backend-Mechanik). |
| „Medien vorschlagen" (D-06, größter Aufwand) | API / Backend (neuer Handler + Media-Service-Integration) | Database (media_assets + neue Suggestion-Tabelle) | Bindet an Decision-8-Matrix (Owner-Typ/-ID, Kategorie, Sichtbarkeit, Reviewstatus). Upload-Transport: bestehender `authorizedUploadXhr`-Seam (Lock K). |
| Claim-Einstieg (D-06 NUR INTEGRIEREN) | Frontend (Link/Redirect) | — | Lock H: kein Write in Claims-Domäne. Nur Verlinkung auf bestehenden Claim-Flow. |
| Audit (D-07) | API / Backend (Handler schreibt in `audit_logs`) | Database (`audit_logs`, Migration 0075) | Bestehende generische Tabelle mit `event_type`, `scope_type`, `scope_id`, `target_type`, `target_id`, `payload JSONB` ist ausreichend. |
| UI-Primitives-Migration von `ProposalForm` / `VisibilityDropdown` | Frontend Client Component | — | CLAUDE.md-Pflicht; `VisibilityDropdown` nutzt native `<select>` → ersetzen durch `Select` aus `@/components/ui`. |

---

## Standard Stack

Keine neuen externen Pakete erforderlich. Ausschließlich bestehender Stack.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go 1.25 | bestehend | Backend-Sprache | `backend/go.mod` [VERIFIED: backend/go.mod] |
| Gin (`github.com/gin-gonic/gin`) | bestehend | HTTP-Handler | Alle bestehenden Handler nutzen `*gin.Context` [VERIFIED: contributions_me_handler.go] |
| pgx/v5 (`github.com/jackc/pgx/v5`) | bestehend | Postgres-Zugriff | Alle Repos nutzen `pgxpool.Pool` [VERIFIED: anime_contributions_proposal_repository.go] |
| Next.js 16 App Router | bestehend | Frontend-Framework | `frontend/package.json` [VERIFIED] |
| React 18.3.1 | bestehend | UI-Runtime | `frontend/package.json` [VERIFIED] |
| TypeScript | bestehend | Typen | `frontend/tsconfig.json` [VERIFIED] |
| Vitest 3 | bestehend | Frontend-Tests | `frontend/package.json` script `"test": "vitest run"` [VERIFIED] |
| `@/components/ui` | bestehend | UI-Primitives (Pflicht CLAUDE.md) | `Modal`, `Drawer`, `Select`, `FormField`, `Button`, `Card`, `Badge`, `EmptyState`, `SectionHeader` vorhanden [VERIFIED: frontend/src/components/ui/index.ts] |

**Installation:** Keine neuen Pakete.

---

## Package Legitimacy Audit

> Keine neuen externen Pakete in Phase 76. Entfällt.

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser: /me/contributions (Client Component)]
          |
          | useEffect → authorizedFetch
          |
[api.ts: getMyAnimeContributions()]
          |                   |
          |                   +-- [JETZT] MeAnimeContribution[] (ohne fansub_group_name, created_by)
          |                   +-- [NACH PHASE 76] + fansub_group_name, created_by
          |
[Backend: GET /api/v1/me/anime-contributions]
          |
[ContributionsMeHandler.ListMyAnimeContributions()]
          |
[AnimeContributionsRepository.ListByMemberIDWithProposalFields()]
          |-- JOIN anime_contributions + anime + hist_fansub_group_members
          |-- [NEU] JOIN fansub_groups für fansub_group_name
          |-- [NEU nach Phase 72] dispute_state + review_status_id
          |
[PostgreSQL: anime_contributions + fansub_groups + anime + ...]

Dashboard-Layout (D-02):
  ┌─────────────────────────────────────────────────┐
  │  Klärungs-Inbox (offene Aktionen) [D-03]        │
  │   (a) zugeordnet-aber-unbestätigt               │
  │   (b) bestritten/disputed                        │
  │   (c) eigene abgelehnte Vorschläge              │
  │   (d) bestätigte, Sichtbarkeit offen            │
  ├─────────────────────────────────────────────────┤
  │  Summary-Aggregat als klickbare Stat-Chips [D-12]│
  │  Anime | Gruppe | Rolle | Zeitraum | Status      │
  ├─────────────────────────────────────────────────┤
  │  [Vorschlagen/Melden] Button [D-05]             │
  │  → Modal/Drawer: Typ → Ziel → Felder           │
  │    Typen: Fehler | Story | Medien [NEU D-06]    │
  │           Contribution [Reuse ProposalForm]      │
  │           Claim [Link]                           │
  ├─────────────────────────────────────────────────┤
  │  Mitwirkungen-Liste (confirmed + pending)        │
  │  Vorschläge-Liste (proposed/disputed)            │
  └─────────────────────────────────────────────────┘

Neue Backend-Pfade (D-06 NEU):
  POST /api/v1/me/suggestions          → member_suggestions-Tabelle
  POST /api/v1/me/suggestions/media    → media_assets + member_suggestions
  GET  /api/v1/me/suggestions          → eigene Vorschläge aller Typen

Erweiterte Backend-Pfade:
  POST /me/anime-contributions/:id/reject  → + member_reason im Body (D-09)
  GET  /me/anime-contributions            → + fansub_group_name, created_by im Response
```

### Recommended Project Structure

```
frontend/src/
├── app/me/contributions/
│   └── page.tsx                    ← erweitern (78 Zeilen → ~200 nach Umbau; bleibt <450)
├── components/contributions/
│   ├── ContributionInbox.tsx       ← NEU: Inbox-Sektion (D-02/D-03)
│   ├── ContributionSummary.tsx     ← NEU: Summary-Aggregat + Stat-Chips (D-12)
│   ├── ContributionFilters.tsx     ← NEU: Filterbar (oder als Teil von Summary)
│   ├── ReportModal.tsx             ← NEU: unified Melde-Einstieg (D-05)
│   ├── ReportFormFehler.tsx        ← NEU: Fehler/Korrektur-Formular (D-06)
│   ├── ReportFormStory.tsx         ← NEU: Story-Formular (D-06)
│   ├── ReportFormMedia.tsx         ← NEU: Medien-Upload (D-06, größter Aufwand)
│   ├── RejectReasonModal.tsx       ← NEU: Pflicht-Begründung für „Das war ich nicht" (D-09)
│   ├── ContributionCard.tsx        ← erweitern (120 Zeilen, bleibt <450)
│   ├── MyContributionsSection.tsx  ← erweitern (54 Zeilen → ~150)
│   ├── MyProposalsSection.tsx      ← refaktorieren (275 Zeilen, UI-Primitives-Migration)
│   ├── ProposalForm.tsx            ← erweitern/UI-Migration (294 Zeilen)
│   ├── VisibilityDropdown.tsx      ← UI-Migration: native select → Select-Primitive
│   ├── ReviewQueue.tsx             ← unverändert (Leader-Review, Phase 77/78)
│   └── contributions.module.css   ← erweitern
├── lib/
│   └── api.ts                     ← neue Helfer: submitSuggestion, getMySuggestions,
│                                    rejectAnimeContributionWithReason (D-09)
└── types/
    └── contributions.ts           ← erweitern: MeAnimeContribution + fansub_group_name
                                     + created_by; neue MeSuggestion-Typen

backend/internal/
├── handlers/
│   ├── contributions_me_handler.go   ← erweitern um reject+reason + D-09 (349 Zeilen → ~420)
│   └── suggestions_me_handler.go    ← NEU: Melde-Endpoints für Fehler/Story/Medien
├── repository/
│   ├── anime_contributions_proposal_repository.go  ← Reject-Erweiterung (D-09)
│   └── member_suggestions_repository.go            ← NEU: Fehler/Story-Persistenz
├── services/
│   └── media_service.go             ← ggf. erweiterter Upload-Seam für „Medien vorschlagen"
database/migrations/
│   ├── 0097_member_suggestions.up.sql    ← NEU (NACH Phase-72-Migrationen)
│   └── 0097_member_suggestions.down.sql
shared/contracts/
│   └── openapi.yaml               ← neue Suggestion-Endpoints + reject-reason-Erweiterung
```

### Pattern 1: Inbox-Filterung via `created_by` (D-03a Unterscheidung)

**Was:** `status='proposed'` tritt in zwei Kontexten auf — eigener Vorschlag (created_by = eigene app_user_id) und Leader-zugeordnet (created_by ≠ eigene app_user_id). Das Feld `created_by` muss im Response-DTO erscheinen.

**Wenn zu nutzen:** Inbox (D-03a) und Filterlogik.

```typescript
// Source: contributions.ts-Typ-Erweiterung [ASSUMED — noch zu implementieren]
// Inbox-Filter (D-03a) — client-seitig via useMemo:
const inbox = useMemo(() => {
  const pending = contributions.filter(
    (c) => c.status === 'proposed' && c.created_by !== myAppUserId
  ) // zugeordnet-aber-unbestätigt
  const disputed = contributions.filter((c) => c.status === 'disputed')
  const rejectedProposals = contributions.filter(
    (c) => c.status === 'disputed' && c.created_by === myAppUserId
  ) // eigene abgelehnte Vorschläge
  // ...
  return { pending, disputed, rejectedProposals }
}, [contributions, myAppUserId])
```

**Achtung:** `myAppUserId` muss aus dem Auth-Context stammen (nicht aus Token direkt lesen — CLAUDE.md). Der Auth-Context liefert `useAuthSession`; die app_user_id muss entweder via `/api/v1/me/profile` oder als `created_by` im DTO vorhanden sein.

### Pattern 2: Summary-Aggregat als klickbare Stat-Chips (D-12)

**Was:** Client-seitiges `useMemo` auf dem contributions-Array produziert Zähler pro Achse. Chip-Klick setzt einen aktiven Filter-State (Toggle); gefilterte Liste wird ebenfalls via `useMemo` gebildet.

```typescript
// Source: Analogie zu Phase-74-D-06-Muster [ASSUMED — Muster noch zu implementieren]
const [activeFilters, setActiveFilters] = useState<FilterState>({
  status: null, group: null, anime: null, role: null, year: null,
})

const summary = useMemo(() => ({
  byStatus: groupByStatus(contributions),
  byGroup: groupByGroup(contributions),
  byRole: groupByRole(contributions),
}), [contributions])

const filtered = useMemo(() =>
  contributions.filter(applyFilters(activeFilters)),
  [contributions, activeFilters]
)

// Chip-Klick: toggleFilter('status', 'confirmed') → setzt oder löscht den Filter
```

### Pattern 3: Unified Melde-Einstieg (D-05) — Modal-/Drawer-Flow

**Was:** Ein primärer Button öffnet ein `Modal` oder `Drawer` aus `@/components/ui`. Erste Seite = Typ-Auswahl (Radio-Karten oder `Select`). Je nach Typ wird das typ-spezifische Unter-Formular gerendert.

**Wenn zu nutzen:** Der unified Einstieg ist der einzige Melde-Punkt auf der Seite.

```typescript
// Source: globale UI-Primitives [VERIFIED: frontend/src/components/ui/index.ts]
import { Modal, Select, FormField, Button } from '@/components/ui'

// Typ-Auswahl im ersten Modal-Schritt:
type SuggestionType = 'fehler' | 'story' | 'medien' | 'contribution' | 'claim'
const [type, setType] = useState<SuggestionType | null>(null)

// Schritt-basiert: isOpen → type-Auswahl → form-spezifisch
```

### Pattern 4: Reject mit Pflicht-Begründung (D-09)

**Was:** „Das war ich nicht" öffnet einen Bestätigungs-Dialog (Modal) mit PFLICHT-Freitextfeld. Erst nach Eingabe einer Begründung wird der Reject-Endpoint aufgerufen. Backend nimmt `member_reason` im Request-Body entgegen.

```typescript
// api.ts-Erweiterung (D-09, Lock K) [ASSUMED — noch zu implementieren]
export async function rejectAnimeContributionWithReason(
  contributionId: number,
  memberReason: string,
): Promise<void> {
  // POST /api/v1/me/anime-contributions/:id/reject
  // Body: { member_reason: string }  ← NEU gegenüber aktuellem leeren POST
}
```

Backend-Erweiterung in `contributions_me_handler.go`:

```go
// [ASSUMED — D-09-Erweiterung]
type meContributionRejectRequest struct {
  MemberReason string `json:"member_reason" binding:"required,min=5"`
}

func (h *ContributionsMeHandler) RejectMyAnimeContribution(c *gin.Context) {
  var req meContributionRejectRequest
  if err := c.ShouldBindJSON(&req); err != nil {
    badRequest(c, "Begründung ist erforderlich.")
    return
  }
  // ... ownership check ...
  // h.updateMyAnimeContributionStatusWithReason(c, "disputed", false, req.MemberReason)
}
```

**DB-Frage:** Wohin schreiben? Zwei Optionen:
- Option A (minimal): `member_reason` als neue Spalte auf `anime_contributions` (additive Migration) — analog zu `review_note`. Vorteil: kein neuer Table, direkt abrufbar. Nachteil: vermischt Leader-Sicht (`review_note`) mit Member-Sicht (`member_reason`).
- Option B (sauber): Eintrag in `audit_logs` mit `event_type='contribution.dispute_opened'`, `payload={ member_reason: "..." }`. Vorteil: kein Schema-Change für anime_contributions, audit-nativ. Nachteil: Leader muss für Begründung `audit_logs` joinen, was in Phase 78 Review-Implementierung nötig ist.
- **Empfehlung:** Option A (additive Spalte `member_reason TEXT NULL` auf `anime_contributions`) — direkt abrufbar in Phase-78-Review-Queue ohne extra audit_logs-Join. Migration 0097 oder 0098 (nach Phase-72-Migrationen).

### Pattern 5: Neue Vorschlagstypen — Backend-Mechanik (D-06, Claude's Discretion)

**Analyse der Optionen unter Lock H:**

| Option | Beschreibung | Lock H Compliance | Aufwand |
|--------|-------------|------------------|---------|
| Generische `member_suggestions`-Tabelle | Typ-Diskriminator + JSONB-Payload | Ja — kein Write in anime_contributions/member_claims | Mittel |
| Pro-Typ-Tabellen (`member_error_reports`, `member_story_suggestions`, ...) | Separate Tabellen je Typ | Ja — klar getrennt | Hoch (viele Migrationen) |
| Erweiterung `anime_contributions` um Typ-Feld | Contribution-Tabelle für alle Vorschläge | NEIN — Lock H verletzt | — |

**Empfehlung: Generische `member_suggestions`-Tabelle** (Claude's Discretion, unter Lock H):

```sql
-- Migration 0097_member_suggestions.up.sql [ASSUMED — noch zu entwerfen]
CREATE TABLE member_suggestions (
    id                   BIGSERIAL PRIMARY KEY,
    submitter_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    suggestion_type      VARCHAR(40) NOT NULL,  -- 'error_report' | 'story' | 'media' | etc.
    target_type          VARCHAR(40) NOT NULL,  -- 'anime' | 'contribution' | 'fansub_group' | 'member'
    target_id            BIGINT NOT NULL,
    content_text         TEXT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/in_review/approved/rejected
    review_note          TEXT NULL,
    reviewer_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_member_suggestions_type CHECK (
        suggestion_type IN ('error_report', 'story', 'media')
    ),
    CONSTRAINT chk_member_suggestions_target_type CHECK (
        target_type IN ('anime', 'contribution', 'fansub_group', 'member')
    ),
    CONSTRAINT chk_member_suggestions_status CHECK (
        status IN ('pending', 'in_review', 'approved', 'rejected')
    )
);
```

Für „Medien vorschlagen" erhält `member_suggestions` zusätzlich eine `media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL` — das Media-Asset wird separat via Upload-Service erstellt (Decision-8-Matrix: Owner=Member, review_status='in_review', visibility='internal').

### Anti-Patterns to Avoid

- **`member_suggestions` als Contribution schreiben:** Verletzt Lock H. Selbst wenn der Inhalt ähnlich ist, muss die Domänengrenze gewahrt bleiben.
- **`dispute_state` aus Phase 72 voraussetzen ohne Prüfung:** Phase 72 ist noch nicht ausgeführt. Falls `dispute_state` nicht vorhanden, muss der Code graceful degradieren.
- **`created_by` im Frontend als `created_by == null`-Case ignorieren:** `created_by` ist auf `anime_contributions` `NULL`-fähig (Legacy-Daten ohne App-User). Inbox-Filter muss `created_by IS NULL` als „unbekannt" behandeln (nicht als eigener Vorschlag).
- **native `<select>` in `VisibilityDropdown` stehenlassen:** CLAUDE.md ESLint-Gate wird nach Migration auf `error` angehoben. Muss in Phase 76 migriert werden (Folge-Todo gefaltet).
- **Reject ohne Body abschicken (alter Code in api.ts):** Die bestehende `rejectAnimeContribution`-Funktion sendet keinen Body. Phase 76 muss eine NEUE Funktion `rejectAnimeContributionWithReason` hinzufügen und die Inline-Nutzung ersetzen.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/Drawer für Melde-Flow | Eigenes div-Modal mit position:fixed (wie aktuell in ProposalForm) | `Modal` aus `@/components/ui` | CLAUDE.md-Pflicht; ProposalForm ist Legacy-Ausnahme, die in 76 migriert wird |
| Upload für „Medien vorschlagen" | Neuer Upload-Transport | `authorizedUploadXhr`-Seam + bestehender Media-Service | Lock K; kein neuer Upload-Transport (v1.2-Nicht-Ziel) |
| Audit-Trail für Vorschläge | Eigene Audit-Tabelle | `audit_logs` (Migration 0075) | Generische Tabelle mit `event_type`, `payload JSONB` abdeckt alle D-07-Anforderungen |
| Gruppen-Name für Filter | Zweiter API-Call für Gruppen-Namen | JOIN in `ListByMemberIDWithProposalFields`-Query | D-11: alles auf einmal laden, dann client-seitig filtern |
| Client-seitiger Filter-State | URL-Params oder Server-Filter | `useMemo` + `useState` | D-11: explizit client-seitig, kein neuer Server-Endpoint |

---

## Kritische Abhängigkeit: Phase 72 noch nicht ausgeführt

Phase 72 plant Migration `0096_v12_status_foundation` mit `dispute_state` auf `anime_contributions`, `review_status_id`, `visibility_id`, `members.profile_status`. **Diese Felder existieren noch nicht in der DB.**

### Was Phase 76 davon braucht

| Phase-72-Feld | Phase-76-Nutzer | Ohne das Feld | Strategie |
|--------------|----------------|---------------|-----------|
| `anime_contributions.dispute_state` | Inbox D-03b (bestrittene Items) | Dashboard nutzt `status='disputed'` als Proxy — funktional ausreichend für 76 | `status='disputed'` ist bereits vorhanden und reicht für Phase-76-Inbox; `dispute_state` wird erst in Phase 78 (Leader-Review-Auflösung) kritisch |
| `anime_contributions.review_status_id` | Summary-Aggregat, Review-Queue | Nicht direkt in Phase 76 genutzt (Review-Abwicklung = Phase 77/78) | NICHT benötigt für Phase 76 |
| `members.profile_status` (memorial) | Phase 76 braucht memorial nicht | — | Irrelevant für Phase 76 |
| `review_statuses`-Lookup | Phase 76 braucht ihn nicht direkt | — | Irrelevant für Phase 76 |

**Fazit:** Phase 76 ist **weitgehend unabhängig** von Phase-72-Schema-Artefakten. Das einzige potenzielle Problem ist eine Migrationsnummern-Kollision: Phase-72-Plan-01 will 0096 nutzen, aber 0096 ist bereits belegt (`0096_hist_group_members_confirmation_audit`). Phase 72 muss deshalb mit 0097 beginnen — Phase 76 mit 0098+ (oder umgekehrt, je nach Ausführungsreihenfolge). Der Planner muss die Migration-Nummern final zuweisen.

---

## Common Pitfalls

### Pitfall 1: Migrationsnummern-Kollision
**Was geht schief:** Phase-72-Plan-01 plant `0096_v12_status_foundation.up.sql`, aber `0096_hist_group_members_confirmation_audit` existiert bereits im Repository.
**Warum:** Die Researcher-Analyse für Phase 72 lief am 2026-06-04 und sah damals `0095` als höchste Nummer. Inzwischen wurde `0096_hist_group_members_confirmation_audit` committed.
**Wie vermeiden:** Phase-72-Migrations-Datei auf `0097_v12_status_foundation` umbenennen. Phase-76-Migrations-Dateien auf `0098+` legen. Der Phase-76-Planner muss im Wave-0-Slot die aktuell höchste Migrationsnummer via `ls database/migrations/*.up.sql | sort | tail -1` verifizieren und alle Plan-Dateinamen entsprechend anpassen.
**Warnsignal:** `migrate up` wirft `duplicate migration number`-Fehler.

### Pitfall 2: `MeAnimeContribution` fehlen Felder für Dashboard-Filter
**Was geht schief:** Summary nach Gruppe filtert auf `fansub_group_id`, zeigt aber kein lesbares Gruppen-Label. Summary nach Anime braucht `anime_title`, das bereits vorhanden ist.
**Warum:** `ListByMemberIDWithProposalFields` joint aktuell `fansub_groups` nicht.
**Wie vermeiden:** Contract-Erweiterung im Wave-0-Slot: `fansub_group_name` in SQL-Query ergänzen, `AnimeContributionRow` / `MemberContributionWithProposalRow` / `MeAnimeContribution`-Typ + OpenAPI gemeinsam aktualisieren (Lock K).
**Warnsignal:** Filter-Chips zeigen nur IDs statt Namen.

### Pitfall 3: `created_by`-NULL-Fall bricht Inbox-Logik
**Was geht schief:** `anime_contributions.created_by` ist `NULL`-fähig (Legacy-Einträge ohne App-User, vgl. `*int64` in `AnimeContributionRow`). Ein Test `created_by === myAppUserId` matcht fälschlicherweise nicht auf NULL, behandelt NULL-Einträge als „nicht eigene Vorschläge".
**Warum:** Backend liefert `created_by` als nullbares Feld; JS-Gleichheitsvergleich mit null und undefined ist nicht symmetrisch.
**Wie vermeiden:** Inbox-Filter explizit: `c.created_by !== null && c.created_by === myAppUserId`.

### Pitfall 4: `ProposalForm` überschreitet 450 Zeilen nach Erweiterung
**Was geht schief:** `ProposalForm.tsx` hat aktuell 294 Zeilen. Nach UI-Primitives-Migration und möglicher Erweiterung droht Überschreitung des 450-Zeilen-Limits.
**Warum:** Formular ist bereits dicht; weitere Felder (Scope-Auswahl, erweiterte Rollen-Logik) könnten es sprengen.
**Wie vermeiden:** Proaktiver Split: Scope-Auswahl-Sektion → `ProposalFormScopeSelector.tsx`, Rollen-Grid → `ProposalFormRoleGrid.tsx`. Planner sollte split als expliziten Task einplanen.

### Pitfall 5: `contributions_me_handler.go` überschreitet 450 Zeilen nach D-09
**Was geht schief:** Handler hat 349 Zeilen. Der D-09-Reject-Erweiterung (Body-Parsing, Reason-Persistenz, ggf. audit_logs-Write) + neue D-05/06-Endpoints könnte die Datei auf >450 Zeilen treiben.
**Warum:** CLAUDE.md-Limit ≤450 Zeilen.
**Wie vermeiden:** Neue Suggestion-Endpoints in eigene Datei `suggestions_me_handler.go` auslagern. Planner muss expliziten Datei-Split-Task einplanen.

### Pitfall 6: `VisibilityDropdown` nutzt native `<select>` — ESLint-Gate
**Was geht schief:** `VisibilityDropdown.tsx` verwendet `<select>` (native). CLAUDE.md: nach Altfall-Migration wird ESLint-Rule auf `error` angehoben. Phase 76 fasst Contribution-UI an → muss migriert werden.
**Wie vermeiden:** `VisibilityDropdown` auf `Select` aus `@/components/ui` migrieren. Als expliziten Task in Wave 0 oder Wave 1 einplanen.

### Pitfall 7: `ProposalForm` verwendet handgebaute Modal-Logik statt `Modal`-Primitive
**Was geht schief:** `ProposalForm` öffnet ein `role="dialog"` div mit `position: fixed` und handgebauten Styles. CLAUDE.md verbietet Eigen-Markup für Primitive, die `@/components/ui` anbietet.
**Wie vermeiden:** `ProposalForm` in `Modal` aus `@/components/ui` wrappen. Styles auf CSS-Module-Pattern umstellen.

---

## D-03a: Datenunterscheidung zugeordnet-aber-unbestätigt vs. eigener Vorschlag

Beide tragen `status='proposed'`. Disambiguierung via `created_by`:

| Zustand | DB-Zeichen | Bedeutung |
|---------|-----------|-----------|
| Leader-zugeordnet (unbestätigt) | `status='proposed'` UND `created_by` ≠ Member's app_user_id | „Das war ich" / „Das war ich nicht" möglich → Inbox D-03a |
| Eigener Vorschlag in Prüfung | `status='proposed'` UND `created_by` = Member's app_user_id | Abwarten; ggf. nach 90d self-publish → NICHT in Inbox |
| Legacy ohne App-User | `status='proposed'` UND `created_by IS NULL` | Behandle als „zugeordnet" (konservativ) |

**Nötiger Contract-Change:** `created_by` (als `number | null`) muss in `MeAnimeContribution` ergänzt werden. Backend bereits vorhanden (`AnimeContributionRow.CreatedBy *int64`), aber `ListByMemberIDWithProposalFields` projiziert es nicht in die Response (der `animeContributionSelectCols`-Block enthält `ac.created_by`, aber `MemberContributionWithProposalRow` projiziert es nicht in JSON-Response an Frontend). **Verifizierung nötig:** prüfen, ob `created_by` in der JSON-Response bereits erscheint (es ist in `AnimeContributionRow` vorhanden, das embedded ist, mit JSON-Tag `json:"created_by"`). [ASSUMED: erscheint, da embedded struct]

**Achtung:** Die app_user_id des eingeloggten Users ist im Frontend über `useAuthSession` nicht direkt verfügbar (nur `hasAccessToken`, `hasRefreshToken`). Die Profil-API (`GET /api/v1/me/profile`) liefert die User-ID. Alternative: ein neues Feld `is_own_proposal bool` server-seitig berechnen (analog `can_self_publish`).

**Empfehlung:** Backend berechnet `is_own_proposal: COALESCE(ac.created_by = resolvedAppUserID, false)` on-read und liefert es im DTO mit. Das ist sicherer als die app_user_id im Frontend zu vergleichen. Analog zum bestehenden `can_self_publish`-Muster.

---

## D-09: Reject-Endpoint-Erweiterung — minimale Lock-K-konforme Änderung

**Aktueller Zustand:**
- Route: `POST /api/v1/me/anime-contributions/:contributionId/reject` (kein Body)
- Handler: `RejectMyAnimeContribution` ruft `updateMyAnimeContributionStatus(c, "disputed", false)` — kein Body-Parsing
- Repository: `Reject(ctx, contributionID, actorAppUserID, reviewNote *string)` — `reviewNote` ist für `review_note`-Spalte (Leader-Ablehnungsgrund), nicht Member-Begründung
- Frontend: `rejectAnimeContribution(contributionId)` — sendet keinen Body

**Minimal-konforme Erweiterung (Lock K):**

1. **OpenAPI:** `POST /me/anime-contributions/{contributionId}/reject` Request-Body ergänzen: `{ "member_reason": "string" }` (required).
2. **Backend DTO:** `meContributionRejectRequest { MemberReason string }` hinzufügen.
3. **Handler:** Body einlesen, `MemberReason` validieren (required, min 5 Zeichen).
4. **DB:** Neue Spalte `member_reason TEXT NULL` auf `anime_contributions` (additive Migration). Alternativ `audit_logs`-Eintrag (empfohlen für saubere Trennung von `review_note`). Empfehlung: additive Spalte (leichter abzufragen für Leader in Phase 78).
5. **Repository:** `Reject`-Methode um `memberReason *string`-Parameter erweitern; SQL-Update um `member_reason = $N` ergänzen.
6. **Frontend `api.ts`:** Neue Funktion `rejectAnimeContributionWithReason(id, reason: string)` — die alte `rejectAnimeContribution` NICHT löschen (könnte noch genutzt werden), aber alle Aufrufe auf neue Funktion migrieren.
7. **Frontend Typ:** `MeAnimeContribution` um `member_reason?: string | null` ergänzen (für Darstellung in Inbox/Card).

---

## Code Examples

### Bestehende `ListByMemberIDWithProposalFields`-Erweiterung um `fansub_group_name` und `is_own_proposal`

```go
// Source: backend/internal/repository/anime_contributions_proposal_repository.go [VERIFIED: Zeilen 243-299]
// Erweiterung um JOIN fansub_groups und is_own_proposal
rows, err := r.db.Query(ctx, `
    SELECT
        `+animeContributionSelectCols+`,
        COALESCE(a.title_de, a.title_en, a.title, '') AS anime_title,
        (ac.status = 'proposed' AND ac.created_at + INTERVAL '90 days' < NOW()) AS can_self_publish,
        `+reviewNoteExpr+`,
        fg.name AS fansub_group_name,                          -- NEU Phase 76
        COALESCE(ac.created_by = $2, false) AS is_own_proposal -- NEU Phase 76 (D-03a)
    FROM anime_contributions ac
    JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
    JOIN anime a ON a.id = ac.anime_id
    JOIN fansub_groups fg ON fg.id = ac.fansub_group_id        -- NEU Phase 76
    LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
    LEFT JOIN role_definitions rd ON rd.code = acr.role_code
    WHERE hfgm.member_id = $1
    GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name
    ORDER BY ac.created_at DESC
    LIMIT 50
`, memberID, appUserID)  // appUserID als zweiter Parameter
```

### `MeAnimeContribution`-Typ-Erweiterung

```typescript
// Source: frontend/src/types/contributions.ts [VERIFIED: Zeilen 75-92]
export interface MeAnimeContribution {
  // ... bestehende Felder ...
  fansub_group_name?: string     // NEU Phase 76 — für Gruppen-Filter (D-12)
  is_own_proposal: boolean       // NEU Phase 76 — für Inbox-Unterscheidung (D-03a)
  member_reason?: string | null  // NEU Phase 76 — eigene Dispute-Begründung (D-09)
  // dispatch_state?: 'none' | 'open' | 'resolved'  // Phase 72 — noch nicht vorhanden
}
```

### `audit_logs`-Nutzung für D-07 (Audit-Mechanik)

```go
// Source: database/migrations/0075_audit_logs.up.sql [VERIFIED]
// Muster für Suggestion-Submit-Audit:
_, err = db.Exec(ctx, `
    INSERT INTO audit_logs (
        actor_app_user_id, event_type,
        target_type, target_id,
        action_name, outcome,
        payload, created_at
    ) VALUES ($1, 'suggestion.submitted', $2, $3, 'submit', 'success', $4, NOW())
`, appUserID, targetType, targetID, payloadJSON)
```

---

## State of the Art (Projektspezifisch)

| Alter Ansatz | Aktueller Ansatz | Phase | Impact |
|-------------|----------------|-------|--------|
| ProposalForm nutzt handgebautes div-Modal | Muss auf `Modal`-Primitive migriert werden | Phase 76 (Folge-Todo gefaltet) | CLAUDE.md-Compliance |
| VisibilityDropdown nutzt native `<select>` | Muss auf `Select`-Primitive migriert werden | Phase 76 (Folge-Todo gefaltet) | CLAUDE.md-ESLint-Gate |
| Reject-Endpoint ohne Body | Reject-Endpoint mit Pflicht-`member_reason` | Phase 76 (D-09) | Leader sieht Begründung in Phase-78-Review |
| `MyContributionsSection` zeigt nur `confirmed` | Inbox-Sektion oben (zugeordnet-aber-unbestätigt, disputed, ...) | Phase 76 (D-02/D-03) | Aktions-Dashboard statt passive Liste |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `created_by`-Feld erscheint bereits in JSON-Response von `getMyAnimeContributions`, weil `AnimeContributionRow` (embedded in `MemberContributionWithProposalRow`) JSON-Tag `created_by` hat | D-03a, Code Examples | Falls nicht: zusätzlicher Contract-Change nötig; Inbox-Logik muss umgebaut werden |
| A2 | Migration `0097_v12_status_foundation` (umbenannt von 0096) aus Phase 72 ist Voraussetzung für `dispute_state` — aber Phase 76 braucht `dispute_state` NICHT (nutzt `status='disputed'` als Proxy) | Abhängigkeitsanalyse | Falls Phase 78 `dispute_state` vor Phase-76-Ausführung benötigt: Reihenfolge ändern |
| A3 | `member_suggestions`-Tabelle als generische Tabelle ist ausreichend unter Lock H | Backend-Mechanik D-06 | Falls Prüfung ergibt, dass pro-Typ-Repos nötig sind (z.B. für Media-Metadaten): mehr Migrations-Dateien nötig |
| A4 | `media_service.go` kann für „Medien vorschlagen"-Upload ohne neue Schicht erweitert werden | D-06 Medien-Upload | Falls Upload-Service zu eng auf Admin-Kontext gebunden ist: Refactoring nötig |
| A5 | `audit_logs` (Migration 0075) reicht für D-07-Anforderungen (Submitter, Typ, Status, Audit) | Audit-Mechanik | Falls Audit-Anforderungen granularer sind: eigene Audit-Felder in `member_suggestions` |
| A6 | app_user_id des eingeloggten Users ist im Frontend nicht direkt via `useAuthSession` verfügbar (nur Token-Status) | D-03a Inbox-Filter | Falls app_user_id doch im Session-State steckt: `is_own_proposal` kann client-seitig berechnet werden |

---

## Open Questions

1. **Migrationsnummern-Sequenzierung Phase 72 vs. Phase 76**
   - Was wir wissen: 0096 ist belegt. Phase-72-Plan-01 plant 0096 (veraltet).
   - Was unklar: In welcher Reihenfolge werden Phasen 72 und 76 ausgeführt?
   - Empfehlung: Phase 72 als Vorläufer bestätigen und auf 0097+ umnummerieren. Phase 76 beginnt dann mit 0098+. Planner soll diesen Slot mit `ls database/migrations/*.up.sql | sort | tail -1` live verifizieren.

2. **`is_own_proposal` server-seitig vs. client-seitig**
   - Was wir wissen: `created_by` ist in `AnimeContributionRow` vorhanden, aber ob die app_user_id im Frontend verfügbar ist für clientseitigen Vergleich ist unklar.
   - Was unklar: Liefert `useAuthSession` die app_user_id?
   - Empfehlung: Server-seitig berechnen (analog `can_self_publish`) — robuster und unabhängig vom Frontend-Auth-State.

3. **Scope von „Medien vorschlagen" in Phase 76**
   - Was wir wissen: Decision 6 + D-06 schließen es ein. Upload ist der größte Aufwand.
   - Was unklar: Muss der Upload in Phase 76 vollständig produktiv sein, oder reicht ein review-gebundener Upload-Stub?
   - Empfehlung: Upload-Flow shippt vollständig, aber review-gebunden (status='in_review', visibility='internal'). Leader-Review kommt in Phase 77/78.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 16 (Docker) | DB-Migrationen | Ja | 16 | — |
| Go 1.25 | Backend-Build | Ja | bestehend | — |
| Node.js + npm | Frontend-Build | Ja | bestehend | — |
| Vitest 3 | Frontend-Tests | Ja | ^3.2.4 | — |

**Keine fehlenden Dependencies.**

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend) + go test (Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test` |
| Full suite command | `cd frontend && npm test && cd ../backend && go test ./...` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automated Command | Datei existiert? |
|--------|-----------|---------|-------------------|-----------------|
| E / D-11 | useMemo-Summary-Aggregat produziert korrekte Zähler nach Status/Gruppe/Rolle | unit | `cd frontend && npm test -- ContributionSummary` | ❌ Wave 0 |
| E / D-12 | Chip-Klick filtert Liste; Toggle-Klick hebt Filter auf | unit | `cd frontend && npm test -- ContributionFilters` | ❌ Wave 0 |
| E / D-03a | Inbox-Unterscheidung zugeordnet vs. eigener Vorschlag via `is_own_proposal` | unit | `cd frontend && npm test -- ContributionInbox` | ❌ Wave 0 |
| H / D-09 | Reject-Endpoint ohne member_reason gibt 422 zurück | unit Go | `cd backend && go test ./internal/handlers/... -run TestRejectContributionRequiresReason` | ❌ Wave 0 |
| K / D-09 | `rejectAnimeContributionWithReason` in api.ts sendet body mit member_reason | Vitest unit | `cd frontend && npm test -- api.test` | ❌ Wave 0 |
| Runde 6 / D-07 | Suggestion-Submit schreibt audit_logs-Eintrag | Go integration | `cd backend && go test ./internal/handlers/... -run TestSuggestionAudit` | ❌ Wave 0 |
| CLAUDE.md | VisibilityDropdown nutzt kein natives `<select>` nach Migration | ESLint | `cd frontend && npx eslint src/components/contributions/VisibilityDropdown.tsx` | Existiert (muss migriert werden) |

### Sampling Rate

- **Pro Task-Commit:** `cd frontend && npm test` (Frontend-Unit-Tests)
- **Pro Wave-Merge:** `cd frontend && npm test && cd ../backend && go test ./...`
- **Phase-Gate:** Volle Suite grün vor `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/components/contributions/ContributionInbox.test.tsx` — Inbox-Filter-Logik (D-03)
- [ ] `frontend/src/components/contributions/ContributionSummary.test.tsx` — useMemo-Aggregat + Chip-Toggle (D-11/D-12)
- [ ] `backend/internal/handlers/contributions_me_handler_test.go` — Reject-Reason-Pflichtfeld-Test (D-09)
- [ ] `backend/internal/handlers/suggestions_me_handler_test.go` — Suggestion-Submit-Tests (D-06/D-07)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Ja | `requireMeIdentity` + `resolveVerifiedMemberID` (bestehend in `contributions_me_handler.go`) |
| V3 Session Management | Nein (Token-Handling im Auth-Client) | — |
| V4 Access Control | Ja | Ownership-Check (`authorizeAnimeContributionOwner`) muss für alle Reject/Confirm-Endpoints bleiben |
| V5 Input Validation | Ja | `member_reason` in Reject: `binding:"required,min=5"` in Go; `suggestion_type`/`target_type` CHECK-Constraints in DB |
| V6 Cryptography | Nein | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Member rejectet fremde Contributions | Tampering | Bestehender `authorizeAnimeContributionOwner`-Check bleibt Pflicht für Reject-Erweiterung |
| Registrierter User submitted Suggestion für falschen target_type | Tampering | DB-CHECK auf `target_type IN (...)` + Backend-Validierung in Handler |
| Medien-Upload ohne Owner-Kontext | Elevation of Privilege | Decision-8-Matrix: `owner_member_id` muss beim Media-Upload gesetzt werden; `review_status='in_review'`, `visibility='internal'` |
| Member-Reason für fremde Dispute-Begründung anzeigen | Information Disclosure | `member_reason` darf nur dem Datensatz-Owner und Leaders (Phase 78) angezeigt werden; nicht im Public-API |

---

## Sources

### Primary (HIGH confidence)

- `frontend/src/app/me/contributions/page.tsx` — bestehende Seite, vollständig gelesen [VERIFIED]
- `frontend/src/components/contributions/MyContributionsSection.tsx` — 54 Zeilen [VERIFIED]
- `frontend/src/components/contributions/MyProposalsSection.tsx` — 275 Zeilen [VERIFIED]
- `frontend/src/components/contributions/ContributionCard.tsx` — 120 Zeilen [VERIFIED]
- `frontend/src/components/contributions/ProposalForm.tsx` — 294 Zeilen [VERIFIED]
- `frontend/src/components/contributions/VisibilityDropdown.tsx` — 47 Zeilen, natives `<select>` [VERIFIED]
- `frontend/src/types/contributions.ts` — `MeAnimeContribution`-Typ vollständig [VERIFIED]
- `frontend/src/lib/api.ts` — Zeilen 7394–7589 (alle Me-Contributions-Helfer) [VERIFIED]
- `backend/internal/handlers/contributions_me_handler.go` — 349 Zeilen, vollständig gelesen [VERIFIED]
- `backend/internal/repository/anime_contributions_proposal_repository.go` — vollständig gelesen [VERIFIED]
- `backend/internal/repository/anime_contributions_repository.go` — `animeContributionSelectCols`, `AnimeContributionRow` [VERIFIED]
- `backend/internal/repository/anime_contributions_inputs.go` — `AnimeContributionRow` struct [VERIFIED]
- `database/migrations/0075_audit_logs.up.sql` — `audit_logs`-Schema [VERIFIED]
- `database/migrations/0086_anime_contributions.up.sql` — anime_contributions-Schema [VERIFIED]
- `database/migrations/0096_hist_group_members_confirmation_audit.up.sql` — nächste freie Nummer ist 0097 [VERIFIED]
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-01-PLAN.md` — Phase-72-Migrations-Planung [VERIFIED]
- `.planning/milestones/v1.2-DISCUSSION.md` — Entscheidungen E, Runde 6, H, K; Locks A–K [VERIFIED]
- `frontend/src/components/ui/index.ts` — verfügbare UI-Primitives (`Modal`, `Drawer`, `Select`, `FormField`, etc.) [VERIFIED]

### Secondary (MEDIUM confidence)

- Phase-72-RESEARCH.md §Architectural Responsibility Map — kanonische Feldnamen `dispute_state`, `review_status_id`, `visibility_id`, `profile_status` [CITED: .planning/phases/72-dom-nen-projektionen-status-fundament/72-RESEARCH.md]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — direkt im Code verifiziert
- Bestehende Seams: HIGH — alle relevanten Dateien vollständig gelesen
- Phase-72-Abhängigkeit: HIGH — geplante Felder aus 72-01-PLAN.md und Nicht-Existenz via Migration-Scan verifiziert
- D-03a-Disambiguierung: MEDIUM — `created_by`-Feld in `AnimeContributionRow` vorhanden, aber JSON-Response-Vollständigkeit nicht live getestet (A1 = ASSUMED)
- D-06 Backend-Mechanik: MEDIUM — generische `member_suggestions`-Tabelle ist Empfehlung; endgültiges Schema ist Planner-Entscheid
- Pitfalls: HIGH — aus direkt verifizierten Code-Befunden abgeleitet

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stabiler Stack; 30 Tage)
