# Phase 74: Public Member Profile `/members/[slug]` + Memorial - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 22 (10 neu, 12 erweitert)
**Analogs found:** 22 / 22 (alle mit Analog im bestehenden Codebase verifiziert)

> Hinweis: Phase 74 ist überwiegend Verdrahtung bestehender Seams + Frontend-Layout-Refactor
> (Phase-73-Paradigma). Sämtliche Analoge stammen aus dem laufenden Codebase und wurden im
> Quellcode verifiziert (Zeilenangaben unten). Locks/Constraints (Lock A/H/J/K, 450-Zeilen-Limit,
> `@/components/ui`-Primitives-Pflicht, deutsche Umlaute) sind in jedes Pattern eingearbeitet.

---

## File Classification

### Frontend

| Neu/Erweitert | Datei | Role | Data Flow | Closest Analog | Match Quality |
|---------------|-------|------|-----------|----------------|---------------|
| ERWEITERN | `frontend/src/app/members/[slug]/page.tsx` | route (Server Component) | request-response (SSR-Read) | sich selbst (heute, Z. 72–192) + `frontend/src/app/fansubs/[slug]/page.tsx` (Sektions-Orchestrierung) | exact |
| NEU | `frontend/src/components/profile/MemberSectionNav.tsx` | component (Client) | event-driven (Scroll/IntersectionObserver) | `frontend/src/components/fansubs/FansubSectionNav.tsx` (73-PATTERNS Z. 209–270) | exact |
| NEU | `frontend/src/components/profile/MemberSectionNav.module.css` | config (CSS) | — | `frontend/src/components/fansubs/FansubSectionNav.module.css` (73-PATTERNS Z. 274–288) | exact |
| ERWEITERN | `frontend/src/components/profile/MemberProfileHero.tsx` | component (Server) | transform (DTO→UI) | sich selbst (heute) | exact |
| NEU (Split) | `frontend/src/components/profile/MemberProfileMemorialHero.tsx` | component (Server) | transform | `MemberProfileHero.tsx` | role-match |
| NEU | `frontend/src/components/profile/MemberStatusPill.tsx` | component (Client/Server) | transform | `frontend/src/components/contributions/VerifiedBadge.tsx` + `@/components/ui` Badge | role-match |
| NEU/ERWEITERN | `frontend/src/components/profile/MemberBadgeHighlights.tsx` | component (Client) | transform (Top-N-Slicing) | `frontend/src/components/profile/MemberBadgeChips.tsx` (heute, Z. 1–83) | exact |
| ERWEITERN | `frontend/src/components/profile/MemberBadgeChips.tsx` | component (Client) | transform | sich selbst | exact |
| ERWEITERN | `frontend/src/components/profile/MemberRoleTimeline.tsx` | component (Client) | transform + event-driven (Filter) | sich selbst | exact |
| NEU | `frontend/src/components/profile/MemberContributionFilters.tsx` | component (Client) | event-driven (useMemo-Filter) | Phase-73 Filter-Muster + `MemberRoleTimeline` | role-match |
| NEU | `frontend/src/components/profile/MemberGroupsHistorySection.tsx` | component (Server) | transform (Rahmen) | `MembershipsSection.tsx` + page.tsx Story-Block (Z. 171–175) | role-match |
| NEU | `frontend/src/components/profile/CorrectionReportModal.tsx` | component (Client) | request-response (POST-Form) | `frontend/src/components/contributions/ProposalForm.tsx` + `@/components/ui` Modal | role-match |
| NEU | `frontend/src/components/profile/MemorialSetterAction.tsx` | component (Client) | request-response (POST) | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` | role-match |
| ERWEITERN | `frontend/src/lib/api.ts` | utility (API-Client) | request-response | `getMemberProfile` (Z. 2663), `submitMemberClaim` (Z. 2759) | exact |
| ERWEITERN | `frontend/src/types/profile.ts` | model (Types) | — | bestehende `PublicMemberProfileData`-Definition | exact |

### Backend

| Neu/Erweitert | Datei | Role | Data Flow | Closest Analog | Match Quality |
|---------------|-------|------|-----------|----------------|---------------|
| ERWEITERN | `backend/internal/handlers/app_public_profile.go` | handler | request-response (Read, Envelope) | sich selbst (Z. 28–61) | exact |
| NEU | `backend/internal/handlers/member_memorial_handler.go` | handler | request-response (Write + Audit) | `handlers/contribution_proposals_me_handler.go` (Z. 229–361) + `platform_admin_authz.go` (Z. 15–73) | exact |
| NEU | `backend/internal/handlers/member_correction_handler.go` | handler | request-response (Write + Audit) | `handlers/contribution_proposals_me_handler.go` (Z. 229–361) | exact |
| ERWEITERN | `backend/internal/repository/member_profile_repository.go` | repository | CRUD (Read/CTE) | sich selbst (Z. 345 ff.) | exact |
| ERWEITERN | `backend/internal/repository/badge_repository.go` | repository | CRUD (Read) | `GetMemberBadges` (Z. 114) | exact |
| ERWEITERN | `backend/internal/repository/member_claims_repository.go` | repository | CRUD (Guard im Write) | `SubmitClaim` (Z. 107–134) | exact |
| ERWEITERN | `backend/internal/repository/member_claim_invitations_repository.go` | repository | CRUD (Guard im Write) | `AcceptInvitation` (Z. 104) | exact |
| NEU (ggf.) | `backend/internal/repository/member_correction_repository.go` | repository | CRUD (Insert review-gebunden) | `repository.ProposalInput`/`CreateProposal`-Muster | role-match |
| ERWEITERN | `backend/internal/models/member_profile.go` | model (DTO) | — | `PublicMemberProfile` (Z. 169–186) | exact |
| ERWEITERN | `shared/contracts/openapi.yaml` | config (Contract) | — | `/api/v1/members/{slug}` + `PublicMemberProfile`-Schema | exact |
| ERWEITERN (ggf.) | `shared/contracts/admin-content.yaml` | config (Contract) | — | bestehende admin-content-Pfade (Memorial-Setter) | role-match |

---

## Shared Patterns

### Audit-Schreibung (D-15) — ALLE Write-Aktionen
**Quelle:** `backend/internal/repository/audit_logs.go` (Z. 11–79)
**Anwenden auf:** `member_memorial_handler.go`, `member_correction_handler.go`, Claim-Sperre-Guard
(`member_claims_repository.go` + `member_claim_invitations_repository.go`).

`AuditLogEntry` trägt bereits alle für D-15 nötigen Felder; KEIN neues Audit-Schema. Tabelle `audit_logs`
(Migration 0075). Aufrufmuster (verifiziert in `contribution_proposals_me_handler.go` Z. 352–358):

```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "member_profile.memorial_set", // bzw. "member_claim.memorial_blocked", "member_correction.submitted"
    TargetType:     "member",
    TargetID:       &memberID,
    Action:         "set_memorial",   // optional; NULLIF('') im Insert tolerant
    Outcome:        "allowed",        // bzw. "denied" für Claim-Block-Ereignis
    Payload:        map[string]any{"previous_status": prevStatus},
})
```

Felder-Mapping (audit_logs.go Z. 11–23): `ActorAppUserID *int64`, `EventType`, `ScopeType`, `ScopeID *int64`,
`TargetType`, `TargetID *int64`, `Action`, `Outcome`, `ReasonCode *string`, `Payload map[string]any` (→ jsonb).
Der `Write`-Aufruf ist fehlertolerant verdrahtet (`_ =`), wie im Proposal-Handler — Audit-Fehler blockiert
den Haupt-Write nicht.

### Global-Admin-Gate (D-14) — Memorial-Setter
**Quelle:** `backend/internal/handlers/platform_admin_authz.go` (Z. 15–73)
**Anwenden auf:** `member_memorial_handler.go` (NICHT auf Gruppen-Capability hängen — D-16-Caveat).

```go
identity, ok := requirePlatformAdminIdentity(c, h.roleChecker, "admin")
if !ok { return } // Handler hat 401/403/500 bereits geschrieben
// identity.AppUserID ist garantiert Global Admin (AppUserHasGlobalRole ...PlatformAdmin, Z. 35)
```

Fehler-Strings sind kleingeschrieben, deutsch ("anmeldung erforderlich", "keine berechtigung") — Stil des Analogs
beibehalten. Gate prüft auch `AppUserStatusDisabled`/`Pending` (Z. 23–30).

### Backend-Write-Kette (Auth → Resolve → Validate → DB → Audit)
**Quelle:** `backend/internal/handlers/contribution_proposals_me_handler.go` `CreateProposal` (Z. 229–361)
**Anwenden auf:** `member_correction_handler.go` (registrierter User), `member_memorial_handler.go`
(Global-Admin-Variante des Auth-Schritts).

Kette: `requireMeIdentity(c)` → `ShouldBindJSON` → Pflichtfeld-Validierung (422 mit deutscher Meldung) →
ggf. Member-Resolve via `ResolveVerifiedMemberID` → Repo-Insert → `auditLogRepo.Write` → `c.JSON(201, gin.H{"data": row})`.
Interface-getriebene Repos (`ProposalRepository`, `MemberResolver`, …) für Stub-Tests — gleiche Struktur für
das Korrektur-Repo übernehmen (Z. 25–53). Fehler-Mapping über `errors.Is(err, repository.ErrConflict/ErrNotFound)`.

### Server-Component-Fetch (Lock K) — kein ad-hoc-Fetch
**Quelle:** `frontend/src/app/members/[slug]/page.tsx` (Z. 79–147)
**Anwenden auf:** `page.tsx` (Root bleibt Server Component).

Token server-seitig via `cookies()` (Z. 79–84: `AUTH_TOKEN_COOKIE_NAME` || `access_token`); Fetch ausschließlich
über `@/lib/api` (`getMemberProfile`, `getMemberContributions`). Envelope-Auswertung `'data' in response` vs.
`'visible' in response && !response.visible` (Z. 92–96). Keine `'use client'`-Direktive auf der Root.

### UI-Primitives-Pflicht (CLAUDE.md) — ALLE neuen/erweiterten Frontend-Komponenten
**Quelle:** `@/components/ui` (Button, Modal, Select, FormField, Badge, EmptyState, Card, Tabs)
**Anwenden auf:** MemberSectionNav (Button), CorrectionReportModal (Modal/FormField/Button),
MemberContributionFilters (Select/Button), MemberBadgeHighlights/MemberBadgeChips (Button).

**Altlast-Migration mit-erledigen:** `MemberBadgeChips.tsx` Z. 64 nutzt natives `<button>` → `@/components/ui` Button.
Native `<select>/<input>/<textarea>/<button>` sind verboten (ESLint `no-restricted-syntax`); lokale Konsistenz
rechtfertigt KEIN Abweichen (closest-analog darf das globale UI nie überstimmen).

### Deutsche Umlaute (CLAUDE.md §Sprachqualität) — ALLE user-facing Strings
Gilt für Gedenk-Sprache ("Dieses Profil wird als historisches Gedenkprofil geführt."), Status-Tooltips,
Fehlermeldungen, Rollenlabels ("Übersetzung"), Go-Response-Strings. ASCII-Ersatz (ae/oe/ue/ss) verboten.

---

## Pattern Assignments

### `frontend/src/app/members/[slug]/page.tsx` (route, request-response/SSR)

**Analog:** sich selbst (heute, Z. 72–192) — Refactor zu Sektions-Orchestrator (≤150 Z.).

**Beibehalten (Z. 79–147):** `cookies()`-Token, `Promise`/`allSettled`-Fetch, Envelope-Auswertung, Owner-Affordances
(`OwnProfileEditLink`, `OwnHiddenProfilePreview`), `RichTextRenderer` für Story (Z. 173).

**Ändern (Fallstrick 2 / Anti-Pattern):**
- **`getMyBadges`-Block entfernen** (Z. 136–147) als Public-Badge-Quelle — zeigt Viewer-Badges, nicht die des
  angezeigten Members. Badges kommen künftig aus `response.data.public_badges` (erweitertes DTO).
- Grid-Layout (`profileGrid`, Z. 170) → einspaltige Scroll-Seite mit `<MemberSectionNav />` + Sektions-`id`s
  in verbindlicher Reihenfolge D-02 (Hero → Badges → Geschichte → Beiträge).

**Neue Fetch-Verdrahtung (Lock K):**
```typescript
const response = await getMemberProfile(slug, token || undefined)
if ('data' in response) {
  profile = response.data
  badges = response.data.public_badges ?? []   // NEU: aus erweitertem DTO statt getMyBadges
}
```

---

### `frontend/src/components/profile/MemberSectionNav.tsx` (component/Client, event-driven)

**Analog:** `frontend/src/components/fansubs/FansubSectionNav.tsx` (vollständige Impl in 73-PATTERNS Z. 209–270),
basierend auf `ScreenshotGallery.tsx` IntersectionObserver.

**Sticky-Nav-Muster (1:1 adaptieren, SECTION_IDS auf 4 Member-Sektionen anpassen):**
```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import styles from './MemberSectionNav.module.css'

const SECTION_IDS = ['identitaet', 'badges', 'geschichte', 'beitraege'] as const
const SECTION_LABELS: Record<typeof SECTION_IDS[number], string> = {
  identitaet: 'Identität', badges: 'Badges', geschichte: 'Geschichte', beitraege: 'Beiträge',
}
// IntersectionObserver { rootMargin: '-20% 0px -70% 0px' }; Button variant subtle/ghost; scrollIntoView smooth
```
CSS: `position: sticky; top: var(--header-height, 60px); overflow-x: auto` (Desktop flex-row, Mobil Chip-Leiste) —
aus 73-PATTERNS Z. 274–288.

---

### `frontend/src/components/profile/MemberProfileHero.tsx` + `MemberProfileMemorialHero.tsx` (component/Server, transform)

**Analog:** bestehender `MemberProfileHero` (heute via page.tsx Z. 162 verdrahtet).

**Erweitern:** + `MemberStatusPill` (D-09), + „Bekannt für"-Block (D-03, read-only abgeleitet aus
`profile_status`/`memberships`/`role_timeline` — KEIN Schreib-Flow, KEIN neues Feld).

**Memorial-Variante (D-10) — Split bei >450 Zeilen in `MemberProfileMemorialHero`:**
```typescript
// Server Component — kein Write
if (profile.profile_status === 'memorial') {
  // Würdevolle Sonder-Hero: "Dieses Profil wird als historisches Gedenkprofil geführt."
  // statt Aktivitätsmetrik; Mengen-/Gamification-Badges unterdrückt; Contributions bleiben sichtbar
}
```

---

### `frontend/src/components/profile/MemberBadgeHighlights.tsx` / `MemberBadgeChips.tsx` (component/Client, transform)

**Analog:** `MemberBadgeChips.tsx` (heute, Z. 1–83).

**Beibehalten:** Public-Filter (Z. 28–31: `b.visibility === 'public'` für Fremd-Viewer) — KEIN State-Recompute
(Lock 13). **Top-N-Slicing + „alle anzeigen"** (D-11) rein im Frontend auf der bereits gefilterten Liste.

**Migrieren (Altlast):** natives `<button>` (Z. 64) → `@/components/ui` Button.

**Memorial-Unterdrückung (D-10):** Mengen-/Gamification-Badges ausblenden, wenn `profile_status === 'memorial'`.

---

### `frontend/src/components/profile/MemberRoleTimeline.tsx` + `MemberContributionFilters.tsx` (component/Client, event-driven)

**Analog:** bestehender `MemberRoleTimeline` (heute via page.tsx Z. 180; nutzt `role_timeline` + `has_unverified`).

**Client-Filter (D-06, useMemo) — KEIN API-Call, kein Contract-Change:**
```typescript
'use client'
const filtered = useMemo(() => roleTimeline.filter((e) =>
  (animeFilter === 'all' || e.anime_id === animeFilter) &&
  (statusFilter === 'all' || matchesStatus(e, statusFilter)) // status + has_unverified (D-08)
), [roleTimeline, animeFilter, statusFilter /* gruppe, rolle, zeitraum */])
```
- **D-07:** Detail-Subtypes über Inline-Expand pro Contribution (NICHT neue Hauptrollen).
- **D-08:** Unbestätigte gedämpft + Badge „unbestätigt"; Status-Filter blendet ein/aus.
- Filter-UI nutzt `@/components/ui` Select/Button (kein natives `<select>`).

---

### `frontend/src/components/profile/CorrectionReportModal.tsx` (component/Client, request-response)

**Analog:** `frontend/src/components/contributions/ProposalForm.tsx` (Form-Aufbau) + `@/components/ui` Modal/FormField/Button.

**Verdrahtung:** nur registrierte User (D-18); Submit → neue `api.ts`-Funktion → `POST /api/v1/me/members/:id/correction`;
Payload: Submitter-ID (server-seitig aus Token), Zielkontext (Profil/Contribution/Rolle), Freitext-Begründung.
Erzeugt ausschließlich review-gebundenen Vorschlag — keine direkte öffentliche Änderung.

---

### `backend/internal/handlers/member_memorial_handler.go` (handler, request-response Write)

**Analog:** `platform_admin_authz.go` (Z. 15–73, Auth-Gate) + `contribution_proposals_me_handler.go` (Z. 229–361, Write-Kette).

**Kette:** `requirePlatformAdminIdentity(c, h.roleChecker, "admin")` → Param-Parse `memberID` →
Repo `UPDATE members SET profile_status='memorial', updated_at=NOW() WHERE id=$1` (parametrisiert, pgx `$N`) →
`auditLogRepo.Write` (`EventType: "member_profile.memorial_set"`, Payload `previous_status`) → `c.JSON(200/201, gin.H{...})`.
NICHT an `CanForFansubGroup` koppeln (D-16-Caveat).

---

### `backend/internal/handlers/member_correction_handler.go` (handler, request-response Write)

**Analog:** `contribution_proposals_me_handler.go` `CreateProposal` (Z. 229–361) — 1:1 Struktur (Interfaces für
Stub-Tests, `requireMeIdentity`, 422-Validierung mit deutscher Meldung, `errors.Is`-Mapping, Audit am Ende).

---

### `backend/internal/repository/member_claims_repository.go` + `member_claim_invitations_repository.go` (repository, Guard)

**Analog:** `SubmitClaim` (Z. 107–134) und `AcceptInvitation` (Z. 104).

**Memorial-Guard (D-17) VOR dem Claim-Insert — BEIDE Pfade (Fallstrick 3):**
```go
var profileStatus string
err := r.db.QueryRow(ctx, `SELECT profile_status FROM members WHERE id=$1`, input.MemberID).Scan(&profileStatus)
if profileStatus == "memorial" {
  // Ablehn-Ereignis loggen (D-15, Outcome:"denied") + ClaimMutationError-Muster (HTTP 409)
  return nil, &ClaimMutationError{Code:"memorial_not_claimable",
    Message:"Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.", HTTPStatus:409}
}
```
Empfehlung: gemeinsame Helper `assertMemberClaimable(ctx, memberID)` für beide Pfade.

---

### `backend/internal/repository/member_profile_repository.go` + `badge_repository.go` + `models/member_profile.go`

**Analog:** `GetPublicMemberProfile` (Z. 345 ff.), `GetMemberBadges` (Z. 114), `PublicMemberProfile`-DTO (Z. 169–186).

**DTO-Erweiterung (`models/member_profile.go` nach Z. 185):**
```go
ProfileStatus string               `json:"profile_status"`   // NEU (D-09/D-10)
PublicBadges  []PublicMemberBadge  `json:"public_badges"`    // NEU (D-11, eingebettet statt Endpoint)
```

**Repo (CTE-Erweiterung, member_profile_repository.go Z. 359 ff.):** `m.profile_status` in candidates-CTE +
LATERAL-Join für Top-N public Badges:
```sql
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object('id', mb.id, 'badge_code', mb.badge_code, 'badge_category', mb.badge_category)
                  ORDER BY mb.awarded_at)
  FROM member_badges mb
  WHERE mb.member_id = m.id AND mb.status='active' AND mb.visibility='public'
) public_badges ON true
```

**Badge-Repo:** NEUE Methode `GetPublicMemberBadges(memberID)` mit `AND visibility='public' AND status='active'`
— NICHT `GetMemberBadges` wiederverwenden (liefert auch internal/hidden). Kein UI-Recompute (Lock 13).

---

### `frontend/src/lib/api.ts` + `frontend/src/types/profile.ts` (utility/model)

**Analog:** `getMemberProfile` (Z. 2663), `submitMemberClaim` (Z. 2759) — gleiche `authorizedFetch`-Struktur.

**Erweitern:** `PublicMemberProfileData`-Typ um `profile_status` + `public_badges`; neue Funktionen
`setMemberMemorial(memberId, token)` und `submitMemberCorrection(...)` nach `submitMemberClaim`-Muster (Z. 2759–2765).
Contract-zuerst (Lock K): OpenAPI + DTO + Repo + main.go-Route + api.ts + Types + Tests gemeinsam.

---

## No Analog Found

Keine Datei ohne Analog. Einzige Teil-Neuheit:

| Datei | Role | Data Flow | Hinweis |
|-------|------|-----------|---------|
| `backend/internal/repository/member_correction_repository.go` | repository | CRUD | Persistenz-Tabelle ist Planner-Entscheid (Lock H: Claims ≠ Requests ≠ Contributions getrennt). Struktur folgt `repository.ProposalInput`/`CreateProposal`. Falls keine bestehende Proposal-/Request-Tabelle generisch genug → neue Migration (nächste freie Nummer NACH Phase-72-Umnummerierung, ≥0097/0098). |

---

## Migrations-/Blocker-Hinweis für den Planner

- **Migrations-Nummern-Kollision (BLOCKER, aus RESEARCH §Migrations-Befund):** Phase-72-Plan belegt
  `0096_v12_status_foundation`, aber `0096_hist_group_members_confirmation_audit` existiert bereits. Vor
  Phase-74-Execute realen Stand prüfen; Phase 72 auf ≥0097 umnummerieren.
- **Phase 74 braucht voraussichtlich KEINE eigene Migration** für Memorial/Status (Feld aus Phase 72) und
  Badge-Public-Quelle (read-only). Mögliche Ausnahme: Korrektur-Vorschlags-Tabelle.
- **Phase-72-Abhängigkeit:** `members.profile_status` (CHECK `active`/`historical`/`memorial`) entsteht in Phase 72.
  `claimed`/`unclaimed` bleiben derived aus `member_claims.claim_status='verified'` (NICHT in `profile_status`).

---

## Metadata

**Analog search scope:** `frontend/src/app/members/[slug]/`, `frontend/src/components/profile/`,
`frontend/src/components/fansubs/`, `frontend/src/lib/api.ts`, `backend/internal/handlers/`,
`backend/internal/repository/`, `backend/internal/models/`, `.planning/phases/73-*/73-PATTERNS.md`.
**Files scanned (read/verified):** page.tsx, MemberBadgeChips.tsx, platform_admin_authz.go, audit_logs.go,
member_claims_repository.go, member_profile.go, contribution_proposals_me_handler.go, 73-PATTERNS.md, api.ts (grep).
**Pattern extraction date:** 2026-06-04
