# Phase 74: Public Member Profile `/members/[slug]` + Memorial – Research

**Recherchiert:** 2026-06-04
**Domäne:** Next.js App Router Server-Component-Refactor (Member-Profil zu dreistufiger Scroll-Seite) + drei Backend-Schreibaktionen (Memorial-Setter, Claim-Sperre, Korrektur-melden) auf bestehenden Go/Gin-Seams
**Konfidenz:** HIGH (alle Kern-Seams direkt im Quellcode verifiziert; Phase-72-Schema aus Plan-Dateien extrahiert; ein kritischer Migrations-Nummer-Konflikt entdeckt)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions

**Layout / Drei-Ebenen (Decision C):**
- **D-01:** Kuratierte einspaltige Scroll-Seite mit Sticky-Anker-Nav (Desktop = klebende Sektions-Nav; Mobil = horizontal scrollbare Chip-Leiste), konsistent mit Phase 73. Bestehende Member-Seite + Components (`MemberProfileHero`, `MembershipsSection`, `MemberRoleTimeline`, `RecentContributionsSection`) werden zu Sektionen umgebaut/erweitert — kein Wegwerfen, kein zweites Modell.
- **D-02:** Verbindliche Sektions-Reihenfolge: **Hero (Identität) → „Bekannt für"/Badges → Gruppen & Geschichte (Mitgliedschaften + Story) → filterbare Contributions.**
- **D-03:** „Bekannt für"/Highlights automatisch abgeleitet (read-only) aus vorhandenen Daten. KEIN neues DB-/Pflegefeld, kein Schreib-Flow.
- **D-04:** Story (`member_story_html`) lebt in Ebene 2, rendert ausschließlich über `RichTextRenderer` (server-sanitiertes HTML).
- **D-05:** Empty-States als Platzhalter (Abschnitt bleibt sichtbar mit dezentem Hinweis), damit Sektions-Anker stabil bleiben.

**Contribution-Filter & Rollen (Decision C):**
- **D-06:** Client-seitige Filterung der Contributions (Anime/Gruppe/Rolle/Zeitraum/Status) auf der einmal geladenen `role_timeline` (`useMemo`). KEIN Contract-/Endpoint-Change, keine server-seitige Filterung/Pagination.
- **D-07:** Vereinfachte Hauptrollen bleiben stabil (z. B. „Timing", „Übersetzung"); Detail-Subtypes/Notes über Inline-Expand pro Contribution — NICHT als neue Hauptrollen.
- **D-08:** Unbestätigte/historische Contributions sichtbar, aber optisch gedämpft mit Badge „unbestätigt"; bestätigte prominent; Status-Filter kann sie ein-/ausblenden. Nutzt bestehendes `has_unverified`-Flag bzw. Phase-72-Status-/Konflikt-Achsen.

**Status, Memorial & Badges (Decision C, J/12, Badges 13):**
- **D-09:** Status-Pill neben dem Nickname + erklärender Tooltip für die 5 Status `active / historical / unclaimed / claimed / memorial`. Memorial erhält Sonderbehandlung (D-10).
- **D-10:** Memorial = eigene würdevolle Hero-Variante + Unterdrückung. Ruhige Sonder-Hero („Dieses Profil wird als historisches Gedenkprofil geführt." statt „zuletzt aktiv vor X Jahren"); normale Aktivitätsmetriken und Mengen-/Gamification-Badges komplett unterdrückt; Contributions/Geschichte bleiben würdig sichtbar.
- **D-11:** Badge-Kuratierung „wenige oben, mehr im Detail": feste Anzahl prominenter Badges im Hero (Top-N, z. B. 3–5, nach Kategorie/Wichtigkeit sortiert), Rest hinter „alle anzeigen". Quelle = Badge-Service, nur `public`-Sichtbarkeit; kein Neuberechnen des Badge-State im UI. Owner-Sichtbarkeitssteuerung bleibt bestehend (`public/internal/hidden`, `/me/badges`) — kein neues „featured"-Feld in 74.

**Write-Scope (Decision J/12, D-06 aus Phase 72; Decision 6 für Korrektur):**
- **D-12:** Alle drei Schreibaktionen shippen in 74 (Memorial-Setter + Claim-Sperre + Korrektur-melden).
- **D-13:** `memorial` ist Status auf dem Member-Profil (`members`), NICHT auf `app_user`-Account. Gilt für jedes Member-Profil (historisch/ungeclaimt ODER geclaimt/aktiv). Setzen lässt den `app_user`-Login/Account unberührt.
- **D-14:** Nur Global Admin darf `memorial` setzen. Capability-gated Backend-Endpoint.
- **D-15:** Jeder relevante Vorgang wird auditiert (Actor-User-ID, Zeitpunkt, Ziel-Profil): Memorial-Setzen UND Claim-Sperr-/Ablehn-Ereignisse. Audit-Spur NICHT öffentlich. Korrektur-Vorschläge tragen Submitter-Identität.
- **D-16:** Memorial-Setter-Einstieg im Fansub Leader Workspace (`/admin/fansubs/[id]/edit`, bestehende Member-/Claim-Panels), ohne `/admin/users` vorzubauen. **Caveat:** Aktion bleibt Global-Admin-only und wirkt global auf das Member-Profil — der Workspace ist nur Einstiegspunkt, nicht Capability-Scope.
- **D-17:** Claim-Sperre server-seitig erzwingen: Claim-Flows gegen ein `memorial`-Profil werden im Backend abgelehnt (nicht nur UI-Gate) + verständlicher UI-Hinweis; Ablehn-Ereignis wird geloggt. Reuse bestehender Claim-Strukturen.
- **D-18:** Korrektur-melden: nur registrierte User; Vorschlag trägt Submitter-ID, Zielkontext (Profil/Contribution/Rolle), Freitext-Begründung; erzeugt ausschließlich einen review-gebundenen Vorschlag (keine direkte öffentliche Änderung).

### Claude's Discretion
- **Konkrete Public-Badge-Quelle** (DTO-eingebettet vs. public Endpoint `GET /members/:slug/badges`) — Planner unter Lock K. Constraint: nur `public`, aus Badge-Service, kein UI-Neuberechnen. → **Empfehlung in §Public-Badge-Quelle.**
- **Ziel-/Reuse-Struktur des Korrektur-Vorschlags** (welche Proposal-/Review-Tabelle, Mapping auf Review-Queue) — Planner unter Lock H + K. → **Empfehlung in §Korrektur-melden.**
- **Exakte Audit-Tabelle/-Mechanik** für D-15. → **Geklärt: `audit_logs` + `AuditLogRepository.Write` (§Audit).**
- Komponenten-Split, CSS-Module-Struktur, Sticky-Nav-/Chip-Impl, Top-N-Schwellwert/Sortierung, „Bekannt für"-Kennzahlen, Filter-UI-Form — Planner/Executor, solange D-01..D-18, 450-Zeilen-Limit, UI-Primitives-Gebot, v1.2-Locks eingehalten.

### Deferred Ideas (AUSSERHALB SCOPE)
- `/admin/users` + User Detail Drawer → Phase 80. In 74 nur Leader-Workspace-Einstieg + Endpoint.
- Account-Deaktivierung/Login-Sperre beim Memorial-Setzen → bewusst NICHT in 74.
- Server-seitige Contribution-Filterung/Pagination → erst bei nachgewiesenem Volumen; in 74 client-seitig.
- Owner-gepinnte „featured" Badges / kuratierbares „Bekannt für"-Feld → eher `/me/profile`-Erweiterung, nicht 74.
- Breiteres Korrektur-/Vorschlags-Spektrum + Review-Abwicklung → Review-Seite in Phase 78; registrierte-User-Vorschläge breiter in Phase 76.
- Moderierte „Erinnerungen" an Memorial-Profilen → eigener Slice, nicht zwingend in 74.
</user_constraints>

<phase_requirements>
## Phase-Anforderungen

| ID | Beschreibung (aus v1.2-DISCUSSION) | Research-Unterstützung |
|----|------------------------------------|------------------------|
| **C / 4** | Public Member Profile `/members/[slug]` erweitern (Hero, Status, Gruppen, Rollen, Badges, Contributions, Korrekturvorschläge, Memorial; Reuse Member API, Public Member Components, `RichTextRenderer`, Badge-Service) | Bestehende Seite (193 Zeilen) + alle Reuse-Components verifiziert (§Reuse-Inventar). Layout-Paradigma 1:1 aus Phase 73 übernehmbar (§Layout/Sticky-Nav). |
| **J / 12** | Memorial = eigener Status; nur Global Admin setzbar; nicht claimbar; nicht gamifiziert; nur moderiert pflegbar | `members.profile_status` mit `memorial`-Wert kommt aus Phase-72-Migration. Global-Admin-Gate = `requirePlatformAdminIdentity` + `AppUserHasGlobalRole(...PlatformAdmin)` (§Global-Admin-Gate). Claim-Sperre-Einhängepunkt = `SubmitClaim` (§Claim-Sperre). |
| **Badges 13** | Bessere Public-Badge-Darstellung (wenige oben/mehr im Detail, Owner-Sichtbarkeit, kein UI-Neuberechnen, Memorial-Sonderregeln) | Badge-Public-Quelle ist die Hauptlücke: heute lädt die Seite nur Viewer-Badges. `MemberBadgeChips` filtert bereits `visibility==='public'` (§Public-Badge-Quelle). |
| **K / 14** | Contract/API-Disziplin: OpenAPI + admin-content + main.go-Route + DTO + Repo + api.ts + Types + Tests gemeinsam; keine ad-hoc-Fetches, keine Token-/Cookie-Abkürzungen | OpenAPI hat `/api/v1/members/{slug}` (Zeile 458) + `PublicMemberProfile`-Schema. Neue Felder/Endpoint müssen Contract-zuerst (§Lock-K-Checkliste). |
</phase_requirements>

---

## Zusammenfassung

Phase 74 ist eine **gemischte Phase**: ein Frontend-Read-/Anzeige-Refactor (analog Phase 73) **plus drei Backend-Schreibaktionen**. Der Frontend-Teil baut die bestehende `/members/[slug]/page.tsx` (193 Zeilen, Server Component) zu einer kuratierten einspaltigen Scroll-Seite mit vier Sektionen und Sticky-Anker-Nav um — exakt das Paradigma, das Phase 73 bereits für `/fansubs/[slug]` etabliert hat. Sämtliche Layout-Muster (IntersectionObserver-Sticky-Nav, `Promise.allSettled`-Datenfetch, Empty-State-Platzhalter, gedämpfte unbestätigte Einträge, ≤450-Zeilen-Split, `@/components/ui`-Primitives) sind übertragbar und in 73-RESEARCH/73-PATTERNS detailliert.

Der Backend-Teil ist überschaubar, weil **alle drei Seams bereits existieren**: Das Audit-Mechanismus ist `audit_logs` + `repository.AuditLogRepository.Write` (kein neues Audit-Schema nötig). Der Global-Admin-Gate ist `requirePlatformAdminIdentity(...) + AppUserHasGlobalRole(...PlatformAdmin)`. Die Claim-Sperre hängt sich an `MemberClaimsRepository.SubmitClaim` (und an die Invitation-Akzeptanz) ein. Der Korrektur-Vorschlag kann das bestehende Vorschlags-/Audit-Muster aus `ContributionProposalsMeHandler` spiegeln. Der `memorial`-Statuswert lebt auf `members.profile_status` (kommt aus Phase 72).

**Kritischer Befund (BLOCKER für Planung):** Phase 72 plant Migration **`0096_v12_status_foundation`** — aber `database/migrations/` enthält bereits **`0096_hist_group_members_confirmation_audit`**. Die höchste belegte Nummer ist 0096. Phase 72 MUSS umnummeriert werden (frei: ab **0097**), oder Phase 74 erbt einen kaputten Migrations-Stand. Der Planner muss dies vor jeder additiven Migration in Phase 74 klären (Phase 74 braucht voraussichtlich KEINE eigene Migration, siehe §Migrations-Befund).

**Hauptempfehlung:** Backend zuerst (Wave 1: Public-Badge-Quelle + Status/Memorial-Felder ins `PublicMemberProfile`-DTO; Wave 2: drei Schreibaktionen mit Audit). Frontend danach (Wave 3: Sektions-Split + Sticky-Nav; Wave 4: Filter + Memorial-Variante + Write-Action-UI). Public-Badge-Quelle als **eingebettetes DTO-Feld** statt separater Endpoint (weniger Round-Trips, ein Contract-Diff).

**Primäre Empfehlung:** Bestehende Seite/Components erweitern (kein zweites Modell), `audit_logs` + `requirePlatformAdminIdentity` wiederverwenden, Public-Badges ins `PublicMemberProfile`-DTO einbetten, Korrektur-Vorschlag als neuen review-gebundenen Eintragstyp nach dem `ContributionProposalsMeHandler`-Muster — und Phase-72-Migrationsnummer-Kollision vorab beheben.

---

## Architektonische Verantwortungskarte

| Capability | Primäre Ebene | Sekundäre Ebene | Begründung |
|------------|--------------|-----------------|------------|
| Public-Member-Profil-Read (Profil, Status, Story, Badges) | API / Backend | Frontend Server (SSR) | DTO-Projektion gehört ins Repo; Seite konsumiert read-only via `lib/api.ts` (Lock K) |
| Public-Badge-Quelle (Top-N, nur `public`) | API / Backend | — | Badge-Service ist Quelle; UI darf Badge-State NICHT neu berechnen (Lock 13) |
| Status-Pill / Memorial-Hero-Variante / „Bekannt für" | Frontend Server (SSR) | — | Reine Anzeige-Ableitung aus DTO-Feldern (D-03/D-09/D-10) |
| Sticky-Anker-Nav + Chip-Leiste | Browser / Client | — | Scroll-Events + IntersectionObserver = Browser-only Client Component |
| Client-Contribution-Filter (`useMemo`) | Browser / Client | — | Filtert die einmal geladene `role_timeline` (D-06); keine Server-Filterung |
| Memorial-Setter (Status setzen) | API / Backend | Frontend (Admin-Trigger) | Capability-gated Write; Global-Admin-only (D-14); Audit (D-15) |
| Claim-Sperre gegen Memorial | API / Backend | Frontend (UI-Hinweis) | Server-seitige Ablehnung im Claim-Flow (D-17); UI-Gate reicht nicht |
| Korrektur-melden | API / Backend | Frontend (Formular) | Registrierter-User-Write → review-gebundener Vorschlag (D-18, Lock H) |
| Audit-Schreibung (alle Writes) | API / Backend | — | `audit_logs` + `AuditLogRepository.Write` (D-15) |

---

## Standard-Stack

**Keine neuen externen Pakete.** Ausschließlich der bestehende Team4s-Stack (CLAUDE.md). [VERIFIED: backend/go.mod, frontend/package.json via CLAUDE.md-Tech-Stack]

### Core (bestehend, wiederverwenden)
| Library | Version | Zweck | Warum Standard |
|---------|---------|-------|----------------|
| Next.js App Router | 16 | Server Components, SSR | Seite ist bereits Server Component [VERIFIED: members/[slug]/page.tsx] |
| React | 18.3.1 | Client Components (Sticky-Nav, Filter, Badge-Hide) | Bestehend [CITED: CLAUDE.md] |
| Go / Gin | Go 1.25 / gin-gonic | HTTP-Handler für drei Writes + DTO-Read | Etabliert; alle Seams existieren [VERIFIED: handlers/*] |
| pgx/v5 | v5 | Parametrisierte SQL (memorial-Update, Claim-Block, Proposal-Insert) | Etabliert; `$N`-Parameter Pflicht [VERIFIED: repository/*] |
| CSS Modules (`.module.css`) | Next.js eingebaut | Scoped Styles | Konvention [VERIFIED: profile.module.css, page.module.css] |

### Supporting (bestehend)
| Library | Version | Zweck | Verwendung |
|---------|---------|-------|------------|
| `@/components/ui` (Button, Card, Select, FormField, Modal, Badge, SectionHeader, EmptyState, Tabs …) | intern | Globale UI-Primitive | PFLICHT laut CLAUDE.md; native `<select>/<input>/<textarea>/<button>` verboten [CITED: CLAUDE.md §Frontend-UI] |
| `RichTextRenderer` (`@/components/editor`) | intern | Story-Rendering (server-sanitiertes HTML) | Bereits in page.tsx genutzt (D-04) [VERIFIED: members/[slug]/page.tsx Zeile 173] |
| `lucide-react` | bestehend | Icons (Status-Pill, Filter, Memorial-Symbolik) | Bereits in `MemberProfileHero` genutzt [VERIFIED: MemberProfileHero.tsx Zeile 2] |
| `testify` / Vitest 3 | bestehend | Backend-/Frontend-Tests | Etabliert [CITED: CLAUDE.md] |

**Installation:** Keine. Keine neuen Pakete nötig.

**Version-Verifikation:** Nicht anwendbar — keine neuen Pakete.

---

## Package Legitimacy Audit

**Nicht anwendbar** — Phase 74 installiert keine externen Pakete (reine Erweiterung bestehender Go-/Next.js-Codebase). slopcheck/npm-view nicht erforderlich.

---

## Phase-72-Contract: Was Phase 74 konsumiert

> Phase 72 ist geplant, aber zum Diskussionszeitpunkt noch nicht ausgeführt. Die folgenden Schema-/Feldnamen stammen aus den Phase-72-Plan-Dateien. [VERIFIED: 72-01-PLAN.md, 72-02-PLAN.md, 72-03-PLAN.md]

### Schema aus Migration `0096_v12_status_foundation` (Phase-72-Plan 01) — ⚠️ Nummern-Kollision siehe §Migrations-Befund
| Feld | Definition | Relevanz für Phase 74 |
|------|------------|------------------------|
| `members.profile_status VARCHAR(20) NOT NULL DEFAULT 'active'` CHECK IN (`active`,`historical`,`memorial`) | Member-Profilstatus, memorial-fähig | **Quelle für Status-Pill (D-09) + Memorial-Variante (D-10) + Memorial-Setter (D-14).** `claimed`/`unclaimed` bleiben **derived** aus `member_claims.claim_status='verified'` (NICHT in `profile_status`). |
| `anime_contributions.dispute_state VARCHAR(20) NOT NULL DEFAULT 'none'` CHECK IN (`none`,`open`,`resolved`) | Konflikt-Dimension getrennt vom Content-`status` | Phase-74-Status-Filter (D-08): potenzielle zusätzliche Achse. **ABER:** Die heutige `getMemberContributions`-Antwort (`PublicMemberRoleEntry`) trägt KEIN `dispute_state` — siehe §Lücke. |
| `review_statuses` Lookup (`code`: in_review/approved/rejected/archived/removed) + `visibility_id`/`review_status_id` FKs auf `anime_contributions`/`media_assets` | Zwei orthogonale Achsen | Falls Phase 74 Contributions/Medien sichtbarkeits-gefiltert zeigt: `visibility='public'` AND `review_status='approved'`. |

### Phase-72-Projektions-Endpunkte (GET-only, Plan 02/03)
- `GET /api/v1/fansubs/:id/domain-projection` — **gruppen-zentriert** (members/historical/contributors). **Für Phase 74 nur eingeschränkt relevant**, weil 74 ein *Member*-zentriertes Profil baut, nicht ein Gruppen-Profil. Die member-zentrierte Read-Quelle bleibt `getMemberProfile` + `getMemberContributions` (siehe §Reuse-Inventar).
- `GET /api/v1/media-ownership/:ownerType/:ownerId` — für Member-Medien `ownerType='member'`, `ownerId=member_id` (über `media_assets.owner_member_id`). Optional für „Letzte Medien"-Sektion, falls Sichtbarkeitsfilterung gewünscht.

### Lücke: Phase-72 deckt die member-zentrierten Status-/Badge-Felder NICHT ab
Phase 72 liefert eine **gruppen**-zentrierte Projektion. Die `/members/[slug]`-Seite konsumiert das **member**-zentrierte `PublicMemberProfile`-DTO (`backend/internal/models/member_profile.go`) und `PublicMemberContributionsResponse`. **Diese DTOs hat Phase 72 NICHT erweitert.** Phase 74 muss daher selbst:
1. `PublicMemberProfile` um `profile_status` (memorial-fähig) erweitern (für Status-Pill + Memorial-Variante).
2. `PublicMemberProfile` um Public-Badges erweitern (Top-N, nur `public`) — die Hauptlücke (§Public-Badge-Quelle).
3. Optional `PublicMemberRoleEntry` um `dispute_state` erweitern, falls der Status-Filter (D-08) die Konflikt-Achse braucht — sonst genügt das bestehende `status`-Feld + `has_unverified`-Flag (D-08 erlaubt explizit beides).

---

## Reuse-Inventar: Bestehende Assets → Phase-74-Sektionen

### Frontend
| Asset | Heute | Ziel Phase 74 | Aktion |
|-------|-------|---------------|--------|
| `frontend/src/app/members/[slug]/page.tsx` (193 Z.) | Server Component, Grid-Layout, lädt `getMemberProfile`+`getMemberContributions`+`getMyBadges` | Root-Orchestrator (≤150 Z.): vier Sektionen + Sticky-Nav | Refactor zu Sektions-Orchestrierung; `getMyBadges` als Viewer-Quelle entfernen (§Public-Badge) |
| `MemberProfileHero.tsx` (103 Z.) | Hero (Avatar, Name, Bio, Aktivität, VerifiedBadge) | Ebene 1: + Status-Pill (D-09), Memorial-Variante (D-10), „Bekannt für" (D-03) | Erweitern; ggf. `MemberProfileMemorialHero` als Sub-Komponente splitten (≤450 Z.) |
| `MemberBadgeChips.tsx` (83 Z., `'use client'`) | Filtert bereits `visibility==='public'` für Fremd-Viewer; nutzt natives `<button>` (Zeile 64) | Ebene 1: Top-N + „alle anzeigen" (D-11) | Erweitern; **natives `<button>` → `@/components/ui` Button** (CLAUDE.md); Top-N-Slicing |
| `MemberRoleTimeline.tsx` | Rollen-/Contribution-Timeline + `has_unverified` | Ebene 3: + Client-Filter (D-06), Inline-Expand (D-07), gedämpfte unbestätigte (D-08) | Erweitern; Filter als `useMemo` Client-Komponente |
| `MembershipsSection.tsx` | Gruppen/Mitgliedschaften | Ebene 2: Gruppen & Geschichte | Wiederverwenden, in Sektion einbetten |
| `RecentContributionsSection.tsx` / `RecentMediaSection.tsx` | Beitrags-/Medien-Vorschau | Ebene 2/3 | Wiederverwenden |
| `RichTextRenderer` | Story-Rendering | Ebene 2 Story (D-04) | Unverändert nutzen |
| `OwnProfileEditLink` / `OwnHiddenProfilePreview` | Eigentümer-Affordances | Erhalten | Unverändert |
| `lib/api.ts`: `getMemberProfile(slug, token?)`, `getMemberContributions(slug)`, `submitMemberClaim`, `getOwnProfile` | Vorhandene Fetches | Erweitern: Profil-DTO trägt Badges/Status; neue Funktionen für Memorial-Setter + Korrektur-melden | Contract-zuerst (Lock K) |
| Phase-73-Muster (`FansubSectionNav`, IntersectionObserver, EmptyState-Platzhalter) | In `frontend/src/components/fansubs/` | 1:1 Analog für `MemberSectionNav` | Kopieren/adaptieren (73-PATTERNS §FansubSectionNav) |

### Backend
| Asset | Datei | Zweck in Phase 74 |
|-------|-------|-------------------|
| `AppPublicProfileHandler.GetPublicMemberProfile` | `handlers/app_public_profile.go` | `GET /api/v1/members/:slug` — Envelope `{"data":...}` bzw. `{"visible":false,"reason":"members_only"}`; um Status/Badges erweitern |
| `MemberProfileRepository.GetPublicMemberProfile` | `repository/member_profile_repository.go` (Zeile 345) | CTE-Query um `m.profile_status` erweitern; Top-N-Public-Badges per LATERAL/JOIN auf `member_badges WHERE visibility='public' AND status='active'` |
| `PublicMemberProfile`-DTO | `models/member_profile.go` (Zeile 169) | + `ProfileStatus string`, + `PublicBadges []…` Felder |
| `BadgeRepository.GetMemberBadges` | `repository/badge_repository.go` (Zeile 114) | **Vorsicht:** liefert ALLE active Badges (inkl. internal/hidden). Für Public-Quelle eine **neue** Methode `GetPublicMemberBadges(memberID)` mit `AND visibility='public'` (kein UI-Recompute, Lock 13) |
| `AuditLogRepository.Write` | `repository/audit_logs.go` (Zeile 37) | **Audit-Mechanik für D-15** — Memorial-Set + Claim-Block. Tabelle `audit_logs` (Migration 0075). Felder: `ActorAppUserID`, `EventType`, `ScopeType`, `TargetType`, `TargetID`, `Action`, `Outcome`, `ReasonCode`, `Payload` |
| `requirePlatformAdminIdentity` | `handlers/platform_admin_authz.go` (Zeile 15) | **Global-Admin-Gate für D-14** — `AppUserHasGlobalRole(ctx, appUserID, models.AppGlobalRolePlatformAdmin)` |
| `MemberClaimsRepository.SubmitClaim` | `repository/member_claims_repository.go` (Zeile 107) | **Claim-Sperre-Einhängepunkt für D-17** — vor INSERT prüfen ob `members.profile_status='memorial'` |
| `MemberClaimInvitationRepository.AcceptInvitation` | `repository/member_claim_invitations_repository.go` (Zeile 104) | **Zweiter Claim-Pfad** — Memorial-Block auch hier (Einladungs-Akzeptanz erzeugt verified claim) |
| `ContributionProposalsMeHandler` | `handlers/contribution_proposals_me_handler.go` | **Muster für Korrektur-Vorschlag (D-18)** — Auth → Member-Resolve → Validierung → Insert → `auditLogRepo.Write` |

---

## Architektur-Muster

### System-Architekturdiagramm

```
Browser (Navigation zu /members/[slug])
   |
   v
/members/[slug]/page.tsx  [Server Component — Root-Orchestrator, ≤150 Z.]
   |
   |-- cookies() → token (für Owner-Preview + members_only-Gate)
   |-- Promise.allSettled([
   |      getMemberProfile(slug, token?)   → { data: PublicMemberProfile + profile_status + public_badges }
   |      getMemberContributions(slug)     → { role_timeline, has_unverified }
   |   ])
   |   (getMyBadges ENTFERNT als Public-Badge-Quelle — war Viewer-Badges)
   |
   v
Render (einspaltige Scroll-Seite, Sektions-Reihenfolge D-02):
   <MemberSectionNav />            [Client — Sticky-Nav + IntersectionObserver]
   <MemberProfileHero />          [Server — Identität + Status-Pill + Memorial-Variante]
     └─ if profile_status==='memorial' → würdevolle Sonder-Hero (D-10)
   <MemberBadgeHighlights />      [Client — Top-N public Badges + „alle anzeigen" (D-11);
                                   if memorial → Mengen-Badges unterdrückt (D-10)]
   <MemberGroupsHistorySection /> [Server — MembershipsSection + Story via RichTextRenderer]
   <MemberContributionsSection /> [Client — useMemo-Filter über role_timeline (D-06),
                                   Inline-Expand (D-07), gedämpfte unbestätigte (D-08)]
   <CorrectionReportTrigger />    [Client — nur registrierte User; öffnet Modal → POST Vorschlag]

ADMIN-SEITE (Einstieg D-16, separater Surface /admin/fansubs/[id]/edit):
   ClaimManagementPanel / MemberRolesTab
     └─ <MemorialSetterAction />  [Client — nur sichtbar wenn Global Admin;
                                   POST /api/v1/admin/members/:id/memorial → Status setzen + Audit]

BACKEND-WRITES:
   POST /api/v1/admin/members/:id/memorial   [requirePlatformAdminIdentity → UPDATE members.profile_status='memorial' → audit_logs]
   POST /api/v1/me/members/:id/correction    [requireMeIdentity → Insert review-gebundener Vorschlag → audit_logs]
   (Claim-Sperre = Guard innerhalb bestehender SubmitClaim/AcceptInvitation, kein neuer Endpoint)
```

### Empfohlene Projektstruktur (Frontend)

```
frontend/src/app/members/[slug]/
  page.tsx                          # Root Server Component (Fetch + Orchestrierung, ≤150 Z.)
  page.module.css                   # Lesebreite, Sektions-Abstände (analog fansubs)

frontend/src/components/profile/
  MemberSectionNav.tsx              # NEU: Client, Sticky-Nav + Chip-Leiste (Analog FansubSectionNav)
  MemberSectionNav.module.css
  MemberProfileHero.tsx             # ERWEITERN: + Status-Pill, Memorial-Variante, „Bekannt für"
  MemberProfileMemorialHero.tsx     # NEU (optional Split): würdevolle Sonder-Hero (D-10)
  MemberStatusPill.tsx              # NEU: Pill + Tooltip für 5 Status (D-09)
  MemberBadgeHighlights.tsx         # NEU/ERWEITERN: Top-N public + „alle anzeigen" (D-11)
  MemberBadgeChips.tsx              # ERWEITERN: natives <button> → ui Button
  MemberRoleTimeline.tsx            # ERWEITERN: Filter + Inline-Expand
  MemberContributionFilters.tsx     # NEU: Client useMemo-Filter (Anime/Gruppe/Rolle/Zeitraum/Status)
  MemberGroupsHistorySection.tsx    # NEU: Rahmen für Memberships + Story
  CorrectionReportModal.tsx         # NEU: Korrektur-melden Formular (Modal-Primitive)
```

### Empfohlene Projektstruktur (Backend)

```
backend/internal/handlers/
  app_public_profile.go             # ERWEITERN: DTO trägt Status + Badges
  member_memorial_handler.go        # NEU: POST .../memorial (Global-Admin, Audit)
  member_correction_handler.go      # NEU: POST .../correction (registriert, review-gebunden, Audit)
backend/internal/repository/
  member_profile_repository.go      # ERWEITERN: profile_status in CTE
  badge_repository.go               # NEU-METHODE: GetPublicMemberBadges (visibility='public')
  member_claims_repository.go       # ERWEITERN: SubmitClaim memorial-Guard
  member_claim_invitations_repository.go # ERWEITERN: AcceptInvitation memorial-Guard
  member_correction_repository.go   # NEU: review-gebundener Vorschlag (Tabelle: Planner-Entscheid)
backend/internal/models/
  member_profile.go                 # ERWEITERN: PublicMemberProfile + ProfileStatus + PublicBadges
```

### Muster 1: Public-Member-Read mit Server-Component-Fetch (Lock K)
**Was:** Server Component lädt alles serverseitig über `lib/api.ts`, kein ad-hoc-Browser-Fetch.
**Wann:** Immer für die Seiten-Root.
```typescript
// Quelle: bestehendes Muster members/[slug]/page.tsx Zeilen 90-147
// Phase 74: getMyBadges als Public-Quelle ENTFERNEN; Profile-DTO trägt public_badges
const response = await getMemberProfile(slug, token || undefined)
// response.data.profile_status, response.data.public_badges aus erweitertem DTO
```

### Muster 2: Sticky-Anker-Nav (Client, IntersectionObserver) — 1:1 aus Phase 73
**Was:** Scrollt mit; hebt aktive Sektion hervor; Desktop flex-row, Mobil overflow-x Chip-Leiste.
**Quelle:** `73-PATTERNS.md §FansubSectionNav` (vollständige Impl), Analog `ScreenshotGallery.tsx`.
```typescript
// 'use client' — KEIN externes Scroll-Spy-Paket; nativer IntersectionObserver
const SECTION_IDS = ['identitaet', 'badges', 'geschichte', 'beitraege'] as const
// rootMargin: '-20% 0px -70% 0px'; Button-Primitive variant subtle/ghost
```

### Muster 3: Memorial-Hero-Variante (D-10)
```typescript
// Server Component — kein Write
if (profile.profile_status === 'memorial') {
  // Würdevolle Sonder-Hero: Gedenk-Sprache statt Aktivitätsmetrik
  // "Dieses Profil wird als historisches Gedenkprofil geführt."
  // Mengen-/Gamification-Badges unterdrücken; Contributions bleiben sichtbar
}
```

### Muster 4: Client-Contribution-Filter (D-06, useMemo)
```typescript
'use client'
// Filtert die einmal geladene role_timeline; KEIN API-Call, kein Contract-Change
const filtered = useMemo(() => roleTimeline.filter((e) =>
  (animeFilter === 'all' || e.anime_id === animeFilter) &&
  (statusFilter === 'all' || matchesStatus(e, statusFilter)) // status + has_unverified
), [roleTimeline, animeFilter, statusFilter, /* gruppe, rolle, zeitraum */])
```

### Muster 5: Memorial-Setter (Global-Admin Write + Audit) — aus bestehenden Seams
```go
// Handler: Global-Admin-Gate (platform_admin_authz.go-Muster)
identity, ok := requirePlatformAdminIdentity(c, h.roleChecker, "admin")
if !ok { return }
// Repo: UPDATE members SET profile_status='memorial', updated_at=NOW() WHERE id=$1 (parametrisiert)
// Audit (audit_logs.go-Muster):
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
  ActorAppUserID: &identity.AppUserID,
  EventType:      "member_profile.memorial_set",
  TargetType:     "member", TargetID: &memberID,
  Action:         "set_memorial", Outcome: "allowed",
})
```

### Muster 6: Claim-Sperre gegen Memorial (D-17) — Guard in bestehendem Repo
```go
// In SubmitClaim VOR dem INSERT (member_claims_repository.go Zeile 112):
var profileStatus string
err := r.db.QueryRow(ctx, `SELECT profile_status FROM members WHERE id=$1`, input.MemberID).Scan(&profileStatus)
if profileStatus == "memorial" {
  // Ablehn-Ereignis loggen (D-15) + verständlicher Fehler (ClaimMutationError-Muster Zeile 90)
  return nil, &ClaimMutationError{Code:"memorial_not_claimable",
    Message:"Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.", HTTPStatus:409}
}
// Gleicher Guard in AcceptInvitation (invitations Zeile 104) — zweiter Claim-Pfad!
```

### Anti-Patterns zu vermeiden
- **`getMyBadges` als Public-Badge-Quelle behalten:** Zeigt VIEWER-Badges, nicht die des angezeigten Members. MUSS durch Public-Quelle ersetzt werden (Hauptlücke).
- **Badge-State im UI neu berechnen:** Verboten (Lock 13). Badge-Service ist Quelle; UI sliced nur Top-N + filtert `visibility='public'`.
- **Memorial nur im UI gaten:** D-17 verlangt server-seitige Ablehnung. UI-Gate allein ist unsicher.
- **Claim-Sperre nur in `SubmitClaim`:** Es gibt ZWEI Claim-Pfade — `SubmitClaim` UND `AcceptInvitation`. Beide brauchen den Guard.
- **Memorial-Setter an Gruppen-Capability hängen:** D-16-Caveat — Memorial ist NICHT gruppengebunden; nur Global-Admin (`requirePlatformAdminIdentity`), nicht `CanForFansubGroup`.
- **Korrektur-Vorschlag als direkte Änderung:** Erzeugt NUR review-gebundenen Vorschlag (D-18); nie öffentliche Mutation.
- **Native `<select>/<input>/<textarea>/<button>`:** Verboten (CLAUDE.md). Filter-UI + Korrektur-Modal müssen `@/components/ui` nutzen. Bestehendes natives `<button>` in `MemberBadgeChips.tsx` Zeile 64 mit-migrieren.
- **Server-seitige Contribution-Filterung:** D-06 ist client-seitig; kein Endpoint-Change.
- **`'use client'` auf die Root-Seite:** Bleibt Server Component; Interaktivität nur in isolierten Client-Komponenten.
- **ASCII-Umlaut-Ersatz in UI-Strings:** Verboten (CLAUDE.md). Gedenk-Sprache + Status-Tooltips mit korrekten Umlauten.

---

## Nicht selbst bauen

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|--------------------|-----------------------|-------|
| Audit-Schreibung | Neue Audit-Tabelle/-Logik | `audit_logs` (Migration 0075) + `repository.AuditLogRepository.Write` | Existiert, getestet, mit Actor/Target/Outcome/Payload-Feldern (D-15 vollständig erfüllbar) |
| Global-Admin-Prüfung | Eigene Rollen-Logik | `requirePlatformAdminIdentity` + `AppUserHasGlobalRole(...PlatformAdmin)` | Etabliertes Authz-Muster (D-14) |
| Sticky-Nav-Scroll-Spy | Scroll-Spy-Library | Nativer `IntersectionObserver` + CSS `position:sticky` (Phase-73-Muster) | Kein Paket nötig; bereits in 73 umgesetzt |
| Story-Rendering/Sanitizing | Eigenes HTML-Rendering | `RichTextRenderer` (server-sanitiert) | Bereits in Produktion (D-04) |
| Token-Cookie-Lesen | Direkter Cookie-/Keycloak-Zugriff im UI | `cookies()` server-seitig + `lib/api.ts` | Lock K/A; bestehendes Muster page.tsx Zeile 79-84 |
| Vorschlags-/Proposal-Pipeline | Neues Vorschlags-System | `ContributionProposalsMeHandler`-Muster + `audit_logs` | Lock H (getrennt) + bestehende Review-Strukturen |
| Claim-Flow | Neues Claim-System | `MemberClaimsRepository` / `MemberClaimInvitationRepository` (nur Guard ergänzen) | Lock A (kein zweites Modell); Nicht-Ziel „kein neues Claim-System" |
| Badge-State | Badge-Neuberechnung im UI | `member_badges` + Badge-Service (`GetPublicMemberBadges`) | Lock 13 |
| UI-Primitive | Native HTML-Elemente | `@/components/ui` (Button, Modal, Select, FormField, Badge, EmptyState, Tabs) | CLAUDE.md Pflicht |

**Key insight:** Phase 74 ist überwiegend *Verdrahtung bestehender Seams* + Frontend-Layout-Refactor (Phase-73-Paradigma). Das einzige echte Neue ist das Korrektur-Vorschlags-Persistenz-Modell (Tabellen-Entscheid) und die Public-Badge-Projektion.

---

## Runtime State Inventory

> Phase 74 ist überwiegend additiv (neue Felder/Endpunkte) + Frontend-Refactor; kein Rename. Trotzdem geprüft, weil ein Statuswert (`memorial`) gesetzt und ein Migrations-Konflikt vorliegt.

| Kategorie | Befund | Aktion |
|-----------|--------|--------|
| Stored data | `members.profile_status` existiert NACH Phase 72; vorher nicht. Memorial-Werte werden zur Laufzeit gesetzt (kein Daten-Backfill nötig — DEFAULT 'active'). | Code-Edit (Setter) + Read-Erweiterung; keine Daten-Migration in 74 |
| Live service config | Keine externen Dienste betroffen (kein n8n/Datadog/Tailscale-Bezug zu Member-Status). | None — verifiziert: kein externer Service liest `profile_status` |
| OS-registered state | Keine. | None — verifiziert: keine Tasks/Cron mit Member-Status |
| Secrets/env vars | Keine. Memorial-Setter nutzt bestehende Auth (Keycloak access_token via `requirePlatformAdminIdentity`). | None |
| Build artifacts | ⚠️ **Migrations-Nummern-Kollision:** `0096_v12_status_foundation` (Phase 72 geplant) vs. bereits vorhandene `0096_hist_group_members_confirmation_audit`. Höchste belegte Nummer = 0096. | **Phase 72 umnummerieren (ab 0097); Planner muss vor Phase-74-Execute prüfen** (§Migrations-Befund) |

**Kanonische Frage „Was hat nach Code-Update noch alten Stand?":** Nur der Migrations-Stand — wenn Phase 72 mit kollidierender Nummer 0096 ausgeliefert wird, schlägt `migrate up` fehl oder überspringt eine Migration. Sonst nichts.

---

## Häufige Fallstricke

### Fallstrick 1: Migrations-Nummern-Kollision 0096 (BLOCKER)
**Was passiert:** Phase-72-Plan-01 legt `0096_v12_status_foundation.up.sql` an, aber `0096_hist_group_members_confirmation_audit.up.sql` existiert bereits. `migrate up` läuft nicht sauber durch / eine Migration wird ausgelassen.
**Warum:** Phase-72-Plan stützte sich auf eine Interface-Notiz „Nächste freie Migrationsnummer: 0096" — die zwischenzeitlich von einem anderen Slice belegt wurde (parallele GSD-Writer auf main, vgl. MEMORY).
**Wie vermeiden:** Vor Phase-74-Execute den realen Migrations-Stand prüfen (`ls database/migrations/`); Phase 72 auf nächste freie Nummer (≥0097) umnummerieren. Phase 74 selbst braucht **voraussichtlich keine eigene Migration** (siehe §Migrations-Befund) — außer das Korrektur-Vorschlags-Modell verlangt eine neue Tabelle (dann nächste freie Nummer nach Phase 72).
**Frühwarnsignal:** `go run ./cmd/migrate up` Fehler oder doppelte 0096-Datei im `ls`.

### Fallstrick 2: Public-Badge-Quelle zeigt Viewer-Badges
**Was passiert:** Heute lädt `page.tsx` `getMyBadges(token)` nur wenn `isOwnProfile` — d. h. ein fremder Besucher sieht GAR KEINE Badges, der Eigentümer sieht SEINE eigenen. Für ein echtes Public-Profil müssen die public-sichtbaren Badges des *angezeigten* Members erscheinen.
**Warum:** Die ursprüngliche Seite war ein Eigenprofil-Preview, kein vollwertiges Public-Profil.
**Wie vermeiden:** Public-Badges aus dem `PublicMemberProfile`-DTO laden (neue Repo-Methode `GetPublicMemberBadges` mit `visibility='public' AND status='active'`). `MemberBadgeChips` filtert bereits korrekt (`visibility==='public'`), bekommt aber die falschen Daten.
**Frühwarnsignal:** Fremder Besucher sieht keine Badges; Eigentümer sieht andere Badges als der Besucher.

### Fallstrick 3: Nur ein Claim-Pfad blockiert
**Was passiert:** Memorial-Claim-Sperre nur in `SubmitClaim`, aber `AcceptInvitation` (Einladungslink) erzeugt ebenfalls einen verified claim und umgeht die Sperre.
**Warum:** Es gibt zwei getrennte Claim-Eintrittspunkte (`member_claims_repository.go` + `member_claim_invitations_repository.go`).
**Wie vermeiden:** Memorial-Guard in BEIDEN Pfaden; idealerweise eine gemeinsame Helper-Funktion `assertMemberClaimable(ctx, memberID)`.

### Fallstrick 4: Memorial-Setter an Gruppen-Capability gekoppelt
**Was passiert:** Setter wird über `CanForFansubGroup` (Leader-Capability) gegated, weil der Einstieg im Leader-Workspace liegt (D-16).
**Warum:** D-16 platziert den UI-Einstieg im Workspace — aber der Capability-Scope ist global (D-14, D-16-Caveat).
**Wie vermeiden:** Backend-Gate = `requirePlatformAdminIdentity` (global), NICHT die Gruppen-Permission. Der Workspace ist nur der Knopf-Ort.

### Fallstrick 5: 450-Zeilen-Limit beim Sektions-Split überschritten
**Was passiert:** `MemberProfileHero` mit Memorial-Variante + Status-Pill + „Bekannt für" wächst >450 Zeilen; Contribution-Sektion mit Filtern + Inline-Expand ebenso.
**Wie vermeiden:** Sub-Komponenten splitten (`MemberProfileMemorialHero`, `MemberStatusPill`, `MemberContributionFilters`). Analog 73 (`FansubTeamActiveGroup` etc.).

### Fallstrick 6: Contract-Disziplin (Lock K) verletzt
**Was passiert:** DTO-Feld `profile_status`/`public_badges` ohne OpenAPI-Update; oder neue Endpunkte ohne `shared/contracts`-Eintrag.
**Wie vermeiden:** Reihenfolge (Lock 14): `openapi.yaml` (`/api/v1/members/{slug}` Zeile 458, `PublicMemberProfile`-Schema Zeile ~7705 ff.) + ggf. `admin-content.yaml` (Memorial-Setter) → main.go-Route → DTO/Handler/Repo → `api.ts` → Types → Tests. **Gemeinsam, nicht nachträglich.**

### Fallstrick 7: Fehlende deutsche Umlaute / ASCII-Ersatz
**Was passiert:** Gedenk-Sprache, Status-Tooltips, Fehler-Strings ohne Umlaute.
**Wie vermeiden:** „Dieses Profil wird als historisches Gedenkprofil geführt." (mit ü/ß); „Übersetzung", „Zuletzt aktiv" — alle user-facing Strings mit korrekten Umlauten (CLAUDE.md §Sprachqualität).

### Fallstrick 8: Story-XSS / dangerouslySetInnerHTML
**Was passiert:** Story-HTML direkt eingefügt statt über `RichTextRenderer`.
**Wie vermeiden:** Ausschließlich `RichTextRenderer` (server-sanitiert, D-04). Bestehendes Muster page.tsx Zeile 173 beibehalten.

---

## Code-Beispiele (verifizierte Muster)

### Audit-Schreibung (D-15)
```go
// Quelle: backend/internal/repository/audit_logs.go Zeile 37 + handlers/member_claims_handler.go Zeile 235
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &actorAppUserID,
    EventType:      "member_profile.memorial_set", // bzw. "member_claim.memorial_blocked"
    TargetType:     "member",
    TargetID:       &memberID,
    Action:         "set_memorial",
    Outcome:        "allowed", // bzw. "denied" für Block-Ereignis
    Payload:        map[string]any{"previous_status": prevStatus},
})
```

### Global-Admin-Gate (D-14)
```go
// Quelle: backend/internal/handlers/platform_admin_authz.go Zeile 15-46
identity, ok := requirePlatformAdminIdentity(c, h.roleChecker /* implements AppUserHasGlobalRole */, "admin")
if !ok { return } // Handler hat bereits 401/403/500 geschrieben
// → identity.AppUserID ist garantiert Global Admin
```

### Public-Member-Profil-Read (Lock K, Envelope)
```go
// Quelle: backend/internal/handlers/app_public_profile.go Zeile 28-61
// Envelope: { "data": profile } ODER { "visible": false, "reason": "members_only" }
// Phase 74: profile trägt zusätzlich profile_status + public_badges
c.JSON(http.StatusOK, gin.H{"data": profile})
```

### Public-Member-Profil-Query erweitern (CTE)
```sql
-- Quelle: backend/internal/repository/member_profile_repository.go Zeile 359 ff.
-- ERGÄNZEN in der candidates-CTE:
--   m.profile_status,          -- NEU (D-09/D-10)
-- + LATERAL für Top-N public Badges:
--   LEFT JOIN LATERAL (
--     SELECT json_agg(json_build_object('id', mb.id, 'badge_code', mb.badge_code,
--            'badge_category', mb.badge_category) ORDER BY mb.awarded_at)
--     FROM member_badges mb
--     WHERE mb.member_id = m.id AND mb.status='active' AND mb.visibility='public'
--   ) public_badges ON true
```

### Frontend-Profil-Fetch (bestehendes Muster, Public-Badge-Quelle ersetzen)
```typescript
// Quelle: frontend/src/app/members/[slug]/page.tsx Zeile 90-147
// ENTFERNEN: getMyBadges-Block (Zeile 136-147) als Public-Badge-Quelle
// Badges kommen jetzt aus response.data.public_badges
const response = await getMemberProfile(slug, token || undefined)
if ('data' in response) {
  profile = response.data
  badges = response.data.public_badges ?? []  // NEU: aus erweitertem DTO
}
```

---

## Aktueller Stand / State of the Art

| Alt | Neu (Phase 74) | Eingeführt | Impact |
|-----|----------------|------------|--------|
| `/members/[slug]` als schlichtes Eigenprofil-Preview (Grid) | Kuratierte dreistufige Scroll-Seite mit Sticky-Anker-Nav | Phase 74 | Echtes Public-Profil; Phase-73-Paradigma |
| Badges = `getMyBadges(token)` (Viewer-Badges, nur own) | Public-Badges aus `PublicMemberProfile`-DTO (`visibility='public'`, Top-N) | Phase 74 | Fremde Besucher sehen kuratierte Badges des angezeigten Members |
| Kein Profilstatus | `members.profile_status` (active/historical/memorial) | Phase 72+74 | Status-Pill + würdevolle Memorial-Variante |
| Memorial nicht setzbar | Global-Admin-Setter + server-seitige Claim-Sperre + Audit | Phase 74 | Schutz + Setzbarkeit gemeinsam (D-06-Kopplung) |
| Keine Korrektur-Meldung | Registrierter-User-Vorschlag (review-gebunden) | Phase 74 | Crowd-Korrektur ohne direkte Veröffentlichung (Lock 6/H) |

**Veraltete Altlasten, die beim Umbau zu korrigieren sind:**
- `MemberBadgeChips.tsx` Zeile 64: natives `<button>` → `@/components/ui` Button (CLAUDE.md).
- `page.tsx` Zeile 136-147: `getMyBadges`-Block als Public-Quelle entfernen.
- Reviewed-Todo `2026-06-03-member-profil-ui-und-params-bug.md`: Params-/UI-Bug beim Member-Profil — beim Sektions-Umbau mit aufgreifen (CONTEXT §Reviewed Todos).

---

## Migrations-Befund (eigener Abschnitt — kritisch)

- **Höchste belegte Migrationsnummer:** `0096` (`0096_hist_group_members_confirmation_audit`). [VERIFIED: ls database/migrations]
- **Phase-72-Plan** belegt `0096_v12_status_foundation` → **Kollision**. Phase 72 muss auf **≥0097** umnummeriert werden.
- **Braucht Phase 74 eine eigene Migration?** Voraussichtlich **NEIN** für Memorial/Status (Feld kommt aus Phase 72) und Badge-Public-Quelle (read-only auf `member_badges`). **MÖGLICH JA** nur für das Korrektur-Vorschlags-Persistenz-Modell, falls keine bestehende Proposal-/Request-Tabelle generisch genug ist (Planner-Entscheid §Korrektur-melden). Falls Migration nötig: nächste freie Nummer NACH Phase 72 (z. B. 0098+).
- **CONTEXT-Notiz „0089/0091 bereits vergeben"** ist veraltet; reale belegte Spanne reicht bis 0096.

---

## Public-Badge-Quelle (Claude's-Discretion-Entscheid, Empfehlung)

**Empfehlung: Public-Badges ins `PublicMemberProfile`-DTO einbetten** (statt separater `GET /members/:slug/badges`-Endpoint).

| Kriterium | DTO-eingebettet (empfohlen) | Separater Endpoint |
|-----------|------------------------------|--------------------|
| Round-Trips | 1 (Profil-Fetch liefert Badges mit) | 2 |
| Contract-Diff | 1 (`PublicMemberProfile` + Feld) | 2 (neuer Path + Schema) |
| Lock-K-Aufwand | geringer | höher |
| Caching | konsistent mit Profil | getrennt |

**Umsetzung (Contract-zuerst, Lock K):** `models.PublicMemberProfile` + `PublicBadges []PublicMemberBadge`; neue `BadgeRepository.GetPublicMemberBadges(memberID)` mit `WHERE status='active' AND visibility='public'`; LATERAL-Join in `GetPublicMemberProfile`-CTE; OpenAPI `PublicMemberProfile`-Schema + `api.ts`-Typ + Frontend-Type. Top-N-Slicing + „alle anzeigen" rein im Frontend (D-11), kein State-Recompute (Lock 13).

---

## Korrektur-melden (Claude's-Discretion-Entscheid, Empfehlung)

**Constraint (Lock H):** Claims ≠ Requests ≠ Contributions strikt getrennt. Ein Korrektur-Vorschlag ist KEIN Claim und KEINE Contribution-Bestätigung. Er ist am ehesten ein **Member Request**-artiger review-gebundener Vorschlag (vgl. Lock 10: „Member Request: `/api/v1/admin/member-requests` + approve/reject").

**Empfehlung:** Eigener schlanker review-gebundener Vorschlagstyp mit Submitter-ID + Zielkontext (Profil/Contribution/Rolle) + Freitext, nach dem **`ContributionProposalsMeHandler`-Muster** (Auth → `requireMeIdentity` → Validierung → Insert → `auditLogRepo.Write`). Der Planner prüft, ob `member_requests` (Lock 10) generisch genug ist, um den Korrektur-Vorschlag aufzunehmen, oder ob eine neue schlanke Tabelle nötig ist. **Output ist ausschließlich ein Review-Eintrag** (kein öffentlicher Change), Review-Abwicklung kommt in Phase 78.

**Wichtig:** Endpunkt registriert (POST, registriert-User-gated via `requireMeIdentity`), Audit-Eintrag mit Submitter-ID (D-15/D-18). Kein direkter Mutations-Pfad.

---

## Assumptions Log

| # | Behauptung | Abschnitt | Risiko bei Fehleinschätzung |
|---|------------|-----------|------------------------------|
| A1 | Phase 72 liefert `members.profile_status` mit Werten `active/historical/memorial` exakt wie in 72-01-PLAN | Phase-72-Contract | Mittel — falls Feldname/Enum abweicht, Status-Pill/Memorial-Setter brechen; Planner muss 72-SUMMARY nach Phase-72-Execute prüfen |
| A2 | Memorial braucht KEINE eigene Migration in Phase 74 (Feld aus 72; Badge read-only) | Migrations-Befund | Gering — falls Korrektur-Modell eine neue Tabelle braucht, eine additive Migration ≥0098 |
| A3 | `requirePlatformAdminIdentity` ist der korrekte Global-Admin-Gate (entspricht „Global Admin" aus Lock J) | Global-Admin-Gate | Gering — `AppGlobalRolePlatformAdmin` ist die Plattform-Admin-Rolle; „Global Admin" = Platform Admin (User-Klarstellung „Platform Admin kann immer alles") |
| A4 | `member_requests` (Lock 10) ODER eine neue schlanke Tabelle nimmt den Korrektur-Vorschlag auf | Korrektur-melden | Mittel — Planner muss member_requests-Schema prüfen; bei Untauglichkeit neue Tabelle |
| A5 | `PublicMemberRoleEntry.status` + `has_unverified` genügen für den Status-Filter (D-08); `dispute_state` nicht zwingend | Phase-72-Lücke | Gering — D-08 erlaubt explizit beide Quellen; `dispute_state` ist gruppen-zentriert (Phase-72-Projektion), nicht in der member-zentrierten Contributions-Antwort |
| A6 | Es gibt genau zwei Claim-Eintrittspfade (SubmitClaim + AcceptInvitation) | Claim-Sperre | Mittel — falls weiterer Pfad existiert, bleibt eine Lücke; Planner sollte grep auf `INSERT INTO member_claims` machen |

---

## Offene Fragen

1. **Nimmt `member_requests` (Lock 10) den Korrektur-Vorschlag auf, oder braucht es eine neue Tabelle?**
   - Bekannt: Lock 10 nennt `/api/v1/admin/member-requests` + approve/reject als Member-Request-Pfad.
   - Unklar: Ob das Schema Zielkontext (Contribution/Rolle/Profil) + Freitext generisch trägt.
   - Empfehlung: Planner liest `member_requests`-Schema/Handler; bei Untauglichkeit schlanke neue Tabelle (additive Migration ≥0098).

2. **Erweitert Phase 72 wirklich NUR die gruppen-zentrierte Projektion, nicht das member-zentrierte `PublicMemberProfile`?**
   - Bekannt: 72-02/03-Plan bauen `domain-projection` (Gruppe) + `media-ownership`; kein Touch an `PublicMemberProfile`.
   - Unklar: Ob ein 72-04-Plan (Frontend/Typen) doch member-zentrierte Felder mitliefert.
   - Empfehlung: Planner liest 72-04-PLAN + (nach Execute) 72-SUMMARYs; Phase 74 plant die DTO-Erweiterung selbst, falls 72 sie nicht liefert.

3. **Exakter Status-Filter-Umfang in D-08 — reicht `status`+`has_unverified` oder soll `dispute_state` sichtbar werden?**
   - Empfehlung: Mit `status`/`has_unverified` starten (kein Contract-Change, D-06); `dispute_state`-Achse nur, wenn UX es ausdrücklich verlangt — dann member-zentrierte Erweiterung von `PublicMemberRoleEntry` (zusätzlicher Lock-K-Diff).

---

## Environment Availability

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|----------|
| Next.js Dev-Server :3000 | Live-Testing [MEMORY] | ✓ | 16 | — (NICHT Docker :3002 — stale Build + Keycloak redirect_uri nur für 3000) |
| PostgreSQL 16 (docker-compose) | Backend-Daten, Migrationen | ✓ | 16 | — |
| Keycloak (access_token-Verifikation) | Global-Admin-Gate + registrierte User | ✓ | bestehend | — |
| Phase-72-Schema (`members.profile_status`) | Status-Pill, Memorial-Setter | **Ausstehend** (Phase 72 nicht ausgeführt + Nummern-Kollision) | — | **Blockierend:** Phase 72 muss zuerst (umnummeriert) laufen |
| `@/components/ui` Primitive (Button, Modal, Select, FormField, Badge, EmptyState, Tabs) | Alle Sektionen + Write-UI | ✓ | intern | — |

**Blockierende Abhängigkeit ohne Fallback:**
- `members.profile_status` existiert erst nach Phase-72-Execute. Phase 72 hat zudem eine Migrations-Nummern-Kollision (§Migrations-Befund), die VOR Phase-72-Execute behoben werden muss. Phase 74 kann erst danach den Memorial-Setter/Status-Pill verdrahten.

---

## Validierungsarchitektur

> `.planning/config.json` nicht explizit gelesen; nyquist_validation als aktiviert angenommen (Default).

### Test-Framework
| Eigenschaft | Wert |
|-------------|------|
| Backend | Go `testing` + testify; **no-DB Source-Fragment-Tests** (`readRepositorySource`/`readBackendSource`, Muster aus Phase 72) für SQL-Guards |
| Frontend | Vitest 3 (`frontend/vitest.config.ts`) |
| Backend Quick-Run | `cd backend && go test ./internal/handlers/... -run <Pattern>` |
| Frontend Quick-Run | `cd frontend && npx vitest run <pattern>` |
| Voll-Suite | `cd backend && go test ./...` + `cd frontend && npm test` |

### Phase-Anforderungen → Test-Mapping
| Req | Verhalten | Test-Typ | Befehl | Datei? |
|-----|-----------|----------|--------|--------|
| J/D-14 | Memorial-Setter lehnt Nicht-Global-Admin mit 403 ab | unit (Go handler) | `go test ./internal/handlers/... -run Memorial` | ❌ Wave 0 |
| J/D-17 | `SubmitClaim` UND `AcceptInvitation` lehnen Claim gegen memorial-Profil ab (409) | unit (Go repo) | `go test ./internal/repository/... -run Claim` | ❌ Wave 0 |
| D-15 | Memorial-Set + Claim-Block schreiben `audit_logs`-Eintrag (Actor/Target/Outcome) | unit (Go, AuditLog-Stub) | `go test ./internal/handlers/... -run Audit` | ❌ Wave 0 |
| Badges 13 | `GetPublicMemberBadges` selektiert NUR `visibility='public' AND status='active'` | unit (no-DB Source-Fragment) | `go test ./internal/repository/... -run PublicBadges` | ❌ Wave 0 |
| C/D-06 | Client-Filter reduziert role_timeline ohne API-Call | unit (Vitest) | `npx vitest run MemberContributionFilters` | ❌ Wave 0 |
| C/D-10 | Memorial-Profil rendert Gedenk-Sprache, unterdrückt Mengen-Badges | unit (Vitest) | `npx vitest run MemberProfileHero` | ❌ Wave 0 |
| C/D-09 | Status-Pill rendert korrekten Status + Tooltip für alle 5 Werte | unit (Vitest) | `npx vitest run MemberStatusPill` | ❌ Wave 0 |
| K | OpenAPI + `api.ts`-Typen für Status/Badges/Memorial-Setter/Korrektur vorhanden | type | `npm run typecheck` + Contract-Review | ❌ Wave 0 |

### Sampling Rate
- **Pro Task-Commit:** betroffener `go test -run`/`vitest run <Section>`.
- **Pro Wave-Merge:** `go test ./...` + `npm test`.
- **Phase-Gate:** Voll-Suite grün + `npm run typecheck` vor `/gsd:verify-work`.

### Wave-0-Lücken
- [ ] Go-Handler-Test Memorial-Setter (Global-Admin-Gate + Audit) — covers J/D-14, D-15
- [ ] Go-Repo-Test Claim-Sperre in beiden Pfaden — covers J/D-17
- [ ] Go-no-DB-Source-Fragment-Test `GetPublicMemberBadges` (visibility-Guard) — covers Badges 13
- [ ] Vitest `MemberContributionFilters.test.tsx` — covers D-06
- [ ] Vitest `MemberProfileHero.test.tsx` (Memorial-Variante) — covers D-10
- [ ] Vitest `MemberStatusPill.test.tsx` — covers D-09

---

## Security Domain

> `security_enforcement` als aktiviert angenommen (kein expliziter `false` in config gelesen).

### Anwendbare ASVS-Kategorien
| ASVS-Kategorie | Anwendbar | Standard-Kontrolle |
|----------------|-----------|--------------------|
| V2 Authentifizierung | **ja** | Memorial-Setter + Korrektur-melden: Keycloak access_token via `CommentAuthIdentityFromContext`; kein Token-/Cookie-Direktzugriff im UI (Lock K) |
| V3 Session Management | nein (token-basiert, kein Server-Session-State) | — |
| V4 Access Control | **ja** | Memorial-Setter = Global-Admin-only (`requirePlatformAdminIdentity`); Claim-Sperre server-seitig erzwungen (D-17); Korrektur nur registriert (`requireMeIdentity`); Badge-Public-Filter `visibility='public'` |
| V5 Input Validation | **ja** | `member_id`/`slug`-Param-Validierung (parsePositiveID, TrimSpace); pgx-`$N`-Parameter überall; Korrektur-Freitext serverseitig längen-/inhaltsvalidiert |
| V6 Kryptographie | nein (kein neues Crypto) | — |
| V7 Error Handling/Logging | **ja** | Audit-Spur (`audit_logs`) für Memorial-Set + Claim-Block + Korrektur; generische Fehlermeldungen (kein Internal-Leak) |

### Bekannte Bedrohungsmuster für diesen Stack
| Muster | STRIDE | Standard-Gegenmaßnahme |
|--------|--------|------------------------|
| SQL-Injection in Memorial-Update/Claim-Guard/Proposal-Insert | Tampering | Ausschließlich pgx-`$N`-Parameter (etabliertes Repo-Muster) |
| Privilege Escalation: Nicht-Admin setzt Memorial | Elevation of Privilege | `requirePlatformAdminIdentity` (global), NICHT Gruppen-Capability (D-16-Caveat) |
| Memorial-Bypass über zweiten Claim-Pfad | Tampering/Bypass | Guard in `SubmitClaim` UND `AcceptInvitation` (Fallstrick 3) |
| IDOR: Korrektur-Vorschlag in fremder Identität | Spoofing | Submitter-ID server-seitig aus `identity.AppUserID` (nie Client-Body) |
| Exposition interner/hidden Badges öffentlich | Information Disclosure | `GetPublicMemberBadges` filtert `visibility='public'` (kein Client-Recompute, Lock 13) |
| XSS über Story/Korrektur-Text | Tampering | `RichTextRenderer` (server-sanitiert) für Story; React-Escaping für Plaintext; kein `dangerouslySetInnerHTML` |
| Audit-Manipulation/Umgehung | Repudiation | Audit-Write nach erfolgreicher Mutation; Spur nicht öffentlich (D-15) |

---

## Sources

### Primär (HIGH Konfidenz — direkt im Quellcode verifiziert)
- `frontend/src/app/members/[slug]/page.tsx` (193 Z.) — bestehende Seite, Badge-Quelle-Lücke
- `frontend/src/components/profile/MemberProfileHero.tsx`, `MemberBadgeChips.tsx` — Reuse + natives `<button>`-Altlast
- `backend/internal/models/member_profile.go` — `PublicMemberProfile`-DTO (Zeile 169)
- `backend/internal/handlers/app_public_profile.go` — Read-Handler + Envelope
- `backend/internal/handlers/member_badges_handler.go`, `repository/badge_repository.go` — Badge-Seam (`GetMemberBadges` selektiert alle, nicht nur public)
- `backend/internal/handlers/platform_admin_authz.go` — Global-Admin-Gate
- `backend/internal/repository/audit_logs.go` + `database/migrations/0075_audit_logs.up.sql` — Audit-Mechanik
- `backend/internal/repository/member_claims_repository.go` (SubmitClaim Z.107) + `member_claim_invitations_repository.go` (AcceptInvitation Z.104) — zwei Claim-Pfade
- `backend/internal/repository/member_profile_repository.go` (GetPublicMemberProfile Z.345) — CTE-Erweiterungspunkt
- `backend/internal/handlers/contribution_proposals_me_handler.go` — Vorschlags-/Audit-Muster
- `database/migrations/` (`ls`) — Migrations-Nummern-Kollision 0096
- `frontend/src/types/contributions.ts` — `PublicMemberRoleEntry`/`PublicMemberContributionsResponse` (kein `dispute_state`)
- `shared/contracts/openapi.yaml` — `/api/v1/members/{slug}` (Z.458), `PublicMemberProfile`-Schema
- `.planning/phases/72-*/72-01/02/03-PLAN.md` — Phase-72-Schema/Endpunkte/Feldnamen
- `.planning/phases/73-*/73-RESEARCH.md`, `73-PATTERNS.md` — Layout-/Sticky-Nav-Paradigma 1:1
- `.planning/milestones/v1.2-DISCUSSION.md` — Locks A–K
- `.planning/phases/74-*/74-CONTEXT.md` — D-01..D-18

### Sekundär (MEDIUM)
- `.planning/STATE.md` — Migrations-Decisions, Projekt-Historie
- `CLAUDE.md` — Tech-Stack, UI-Primitives-Gebot, Umlaut-Regel, 450-Zeilen-Limit

### Tertiär (LOW)
- Keine. Reines internes Brownfield; keine WebSearch nötig.

---

## Metadata

**Konfidenz-Aufschlüsselung:**
- Standard-Stack: HIGH — keine neuen Pakete; alles aus Codebase/CLAUDE.md
- Backend-Seams (Audit, Global-Admin, Claim, Proposal): HIGH — alle Seams direkt gelesen
- Public-Badge-Quelle + Empfehlung: HIGH — Lücke und Filter-Logik im Code verifiziert
- Phase-72-Contract: HIGH für Schema-Feldnamen (Plan-Dateien); MEDIUM für „72 erweitert PublicMemberProfile nicht" (Plan-basiert, nicht post-Execute)
- Migrations-Kollision: HIGH — per `ls` verifiziert
- Layout/Sticky-Nav: HIGH — Phase-73-Muster vollständig dokumentiert
- Korrektur-Tabellen-Entscheid: MEDIUM — Planner muss member_requests-Schema prüfen

**Research-Datum:** 2026-06-04
**Gültig bis:** 2026-07-04 (stabiles internes Brownfield; bei Phase-72-Execute Feldnamen + Migrationsnummern erneut prüfen)
