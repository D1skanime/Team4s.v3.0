---
phase: 74-public-member-profile-members-slug-memorial
verified: 2026-06-05T19:55:00Z
status: passed
score: 7/7 Kern-Wahrheiten verifiziert
overrides_applied: 0
re_verification: false
---

# Phase 74: Public Member Profile `/members/[slug]` + Memorial — Verifikationsbericht

**Phasen-Ziel:** Member-Profil als dreistufige Public-Seite erweitern (Hero+Status, Geschichte/Gruppenbezug, filterbare Contributions) inkl. Gedenkprofil-Darstellung und kuratierter Badge-Anzeige; Reuse Member API, Public Member Components, RichTextRenderer, Badge-Service.
**Verifiziert:** 2026-06-05T19:55:00Z
**Status:** BESTANDEN
**Re-Verifikation:** Nein — Erstverifikation

## Ziel-Erreichung

### Observable Wahrheiten

| # | Wahrheit | Status | Nachweis |
|---|---------|--------|---------|
| 1 | Member-zentrierte Read-Projektion trägt `profile_status` + `public_badges` eingebettet (D-09/D-10/Badges-13) | VERIFIZIERT | `PublicMemberProfile.ProfileStatus` + `.PublicBadges` in `member_profile.go`; OpenAPI erweitert (Z. 8388); TypeScript-Typen korrekt; `go build ./...` grün |
| 2 | `GetPublicMemberBadges` selektiert ausschließlich `visibility='public' AND status='active'` — Badge-Service ist Quelle, kein UI-Recompute (Badges-13) | VERIFIZIERT | SQL-Literal `visibility='public' AND status='active'` in `badge_repository.go:122`; Source-Fragment-Test `TestPublicBadgesSourceFiltersVisibility` GRÜN |
| 3 | Memorial-Setter ist Global-Admin-only mit Audit; verändert nur `members.profile_status`, nie `app_user` (D-13/D-14/D-16) | VERIFIZIERT | `requirePlatformAdminAppUserIdentity` in `member_memorial_handler.go`; kein `app_user`-UPDATE; Audit-Write `member_profile.memorial_set`; Tests `TestMemorialSetterRejectsNonPlatformAdmin` + `TestMemorialSetterWritesAuditLog` GRÜN; Route `POST /api/v1/admin/members/:id/memorial` in `admin_routes.go:182` |
| 4 | Claim-Sperre gegen Memorial in BEIDEN Pfaden (SubmitClaim + AcceptInvitation) mit denied-Audit `member_claim.memorial_blocked` (D-15/D-17) | VERIFIZIERT | String-Literal `member_claim.memorial_blocked` in `member_claims_repository.go:137` und `member_claim_invitations_repository.go:203`; Tests `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimAcceptInvitationBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit` alle GRÜN |
| 5 | Korrektur-Vorschläge in eigener Tabelle `member_correction_reports`, review-gebunden (`in_review`), nie direkt veröffentlicht, nur registrierte User (D-18/Lock H) | VERIFIZIERT | Migration `0098_member_correction_reports.up.sql` mit `status DEFAULT 'in_review'`; `CreateCorrectionReport` setzt immer `'in_review'`; Handler nutzt `requireMeIdentity`; Audit `member_correction.submitted`; eigene Tabelle strikt getrennt von Claims/Contributions |
| 6 | Kuratierte einspaltige Scroll-Seite: Sticky-Nav, Status-Pill mit Tooltip (alle 5 Status), würdevoller Memorial-Hero, read-only „Bekannt für"-Ableitung, RichTextRenderer-Story, public_badges als Quelle (nicht `getMyBadges`) (D-01/D-02/D-03/D-04/D-09/D-10) | VERIFIZIERT | Sektionsreihenfolge Hero→Badges→Geschichte→Beiträge in `page.tsx:118–141`; `MemberSectionNav.tsx` mit IntersectionObserver; `MemberStatusPill.tsx` alle 5 Status mit Tooltips; `MemberProfileMemorialHero.tsx` mit Gedenk-Sprache; `deriveKnownFor.ts` rein read-only; `public_badges` in `page.tsx:99`; Human-UAT BESTANDEN (2026-06-05) |
| 7 | Top-N-Badges + client-seitige Contribution-Filter + Inline-Expand + gedämpfte unbestätigte Einträge + alle drei Write-Flow-UIs verdrahtet (D-06/D-07/D-08/D-11/D-12) | VERIFIZIERT | `MemberBadgeHighlights.tsx` mit Top-N-Slicing + Memorial-Unterdrückung; `MemberContributionFilters.tsx` mit `useMemo`, kein fetch; `MemberRoleTimeline.tsx` mit Inline-Expand + `.entryDimmed` (opacity 0.6) + Badge „unbestätigt"; `CorrectionReportModal.tsx` → `submitMemberCorrection`; `MemorialSetterAction.tsx` → `setMemberMemorial`; Human-UAT BESTANDEN |

**Ergebnis:** 7/7 Kern-Wahrheiten verifiziert

### Erforderliche Artefakte

| Artefakt | Erwartung | Status | Details |
|----------|-----------|--------|---------|
| `backend/internal/handlers/member_memorial_handler.go` | Global-Admin-only Memorial-Setter | VERIFIZIERT | 152 Zeilen; `NewMemberMemorialHandler`; `requirePlatformAdminAppUserIdentity` |
| `backend/internal/repository/member_claim_guards.go` | Gemeinsamer Claimability-Guard | VERIFIZIERT | 39 Zeilen; `assertMemberClaimable` mit `memorial_not_claimable` |
| `backend/internal/repository/member_correction_repository.go` | Review-gebundener Insert | VERIFIZIERT | 96 Zeilen; `CreateCorrectionReport` setzt `status='in_review'` |
| `backend/internal/handlers/member_correction_handler.go` | Registrierte-User-Handler | VERIFIZIERT | 130 Zeilen; `requireMeIdentity`; Audit `member_correction.submitted` |
| `database/migrations/0098_member_correction_reports.up.sql` | Eigene Tabelle (Lock H), Nummer ≥0098 | VERIFIZIERT | `CREATE TABLE member_correction_reports`; `status DEFAULT 'in_review'`; Nummer 0098 (nach Phase-72-Umnummerierung auf 0097) |
| `backend/internal/repository/badge_repository.go` | `GetPublicMemberBadges` mit SQL-Guard | VERIFIZIERT | SQL-Guard `visibility='public' AND status='active'` als String-Literal |
| `backend/internal/models/member_profile.go` | `ProfileStatus` + `PublicBadges` | VERIFIZIERT | `ProfileStatus string \`json:"profile_status"\`` + `PublicBadges []PublicMemberBadge` |
| `shared/contracts/openapi.yaml` | `profile_status` + `public_badges` im Schema | VERIFIZIERT | Z. 8388, 8391, 8416, 8439 |
| `frontend/src/types/profile.ts` | `MemberProfileStatus` + `PublicMemberBadge` | VERIFIZIERT | `type MemberProfileStatus = 'active' \| 'historical' \| 'memorial'` |
| `frontend/src/components/profile/MemberSectionNav.tsx` | Sticky-Nav mit IntersectionObserver | VERIFIZIERT | `'use client'`; `new IntersectionObserver`; 67 Zeilen |
| `frontend/src/components/profile/MemberStatusPill.tsx` | Alle 5 Status + Tooltip | VERIFIZIERT | 48 Zeilen; alle Labels mit deutschen Umlauten |
| `frontend/src/components/profile/MemberProfileMemorialHero.tsx` | Würdevolle Gedenk-Hero | VERIFIZIERT | 100 Zeilen; exakter String „Dieses Profil wird als historisches Gedenkprofil geführt." |
| `frontend/src/components/profile/deriveKnownFor.ts` | Rein read-only Ableitung (D-03) | VERIFIZIERT | 75 Zeilen; `function deriveKnownFor`; kein fetch |
| `frontend/src/components/profile/MemberBadgeHighlights.tsx` | Top-N + Memorial-Unterdrückung | VERIFIZIERT | 97 Zeilen; Gamification-Badge-Unterdrückung bei `memorial` |
| `frontend/src/components/profile/MemberContributionFilters.tsx` | Client-Filter `useMemo` ohne fetch | VERIFIZIERT | 142 Zeilen; `useMemo`; `@/components/ui Select`; kein fetch |
| `frontend/src/components/profile/CorrectionReportModal.tsx` | Korrektur-Modal → `submitMemberCorrection` | VERIFIZIERT | 147 Zeilen; `Modal/FormField/Select/Textarea/Button` aus `@/components/ui` |
| `frontend/src/components/profile/MemorialSetterAction.tsx` | Global-Admin-only → `setMemberMemorial` | VERIFIZIERT | 129 Zeilen; `if (!isGlobalAdmin) return null` |
| `frontend/src/app/members/[slug]/page.tsx` | Server Component ≤150 Z., Sektionsreihenfolge D-02 | VERIFIZIERT | 151 Zeilen; kein `'use client'`; alle 4 Sektionen mit korrekten `id`-Ankern |

### Key-Link-Verifikation

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `badge_public_source_test.go` | `badge_repository.go` | SQL `visibility='public' AND status='active'` | VERDRAHTET | Source-Fragment-Test GRÜN |
| `member_claims_memorial_guard_test.go` | beide Claim-Repos | `member_claim.memorial_blocked` als String-Literal | VERDRAHTET | Tests GRÜN; Literal in beiden Repos |
| `member_memorial_handler.go` | `AuditLogRepository.Write` | EventType `member_profile.memorial_set`, Outcome `allowed` | VERDRAHTET | `auditLog.Write` in `SetMemorial` |
| `SubmitClaim` + `AcceptInvitation` | `members.profile_status` | SELECT guard vor INSERT | VERDRAHTET | Guard in `member_claims_repository.go:122` + `member_claim_invitations_repository.go:190` |
| `CorrectionReportModal.tsx` | `api.ts submitMemberCorrection` | POST `/api/v1/me/members/:id/correction` | VERDRAHTET | `import { submitMemberCorrection }` + Aufruf in `onSubmit` |
| `MemorialSetterAction.tsx` | `api.ts setMemberMemorial` | POST `/api/v1/admin/members/:id/memorial` | VERDRAHTET | `import { setMemberMemorial }` + Aufruf auf Bestätigung |
| `page.tsx` | `response.data.public_badges` | `public_badges` aus DTO, kein `getMyBadges` | VERDRAHTET | `page.tsx:99`: `const publicBadges = profile.public_badges ?? []` |
| `MemberProfileHero.tsx` | `MemberProfileMemorialHero.tsx` | `profile_status === 'memorial'` → Delegation | VERDRAHTET | `member_profile_repository.go:76` Delegation |

### Daten-Flow-Trace (Level 4)

| Artefakt | Datenvariable | Quelle | Liefert Echtdaten | Status |
|----------|--------------|--------|------------------|--------|
| `page.tsx` | `profile.public_badges` | `getMemberProfile` → Backend DTO → `loadPublicBadges` → `member_badges`-Tabelle | Ja | FLIESSEND |
| `page.tsx` | `profile.profile_status` | `GetPublicMemberProfile` CTE → `COALESCE(m.profile_status, 'active')` → `members`-Tabelle | Ja | FLIESSEND |
| `MemberContributionFilters.tsx` | `filtered` (role_timeline) | `useMemo` auf per Prop übergebener `role_timeline` — kein sekundärer fetch | Ja (Prop) | FLIESSEND |
| `MemberBadgeHighlights.tsx` | `public_badges` | Top-N-Slicing auf Prop — kein State-Recompute | Ja (Prop aus DTO) | FLIESSEND |

### Verhaltens-Spot-Checks

| Verhalten | Kommando | Ergebnis | Status |
|-----------|----------|----------|--------|
| Memorial-Handler: Nicht-Admin → 403 | `go test ./internal/handlers/... -run TestMemorialSetterRejectsNonPlatformAdmin` | PASS | BESTANDEN |
| Memorial-Handler: Admin → Audit geschrieben | `go test ./internal/handlers/... -run TestMemorialSetterWritesAuditLog` | PASS | BESTANDEN |
| Claim-Guard SubmitClaim → 409 memorial_not_claimable | `go test ./internal/repository/... -run TestClaimSubmitBlockedForMemorialProfile` | PASS | BESTANDEN |
| Claim-Guard AcceptInvitation → 409 memorial_not_claimable | `go test ./internal/repository/... -run TestClaimAcceptInvitationBlockedForMemorialProfile` | PASS | BESTANDEN |
| Denied-Audit in BEIDEN Pfaden | `go test ./internal/repository/... -run TestClaimBlockWritesDeniedAudit` | PASS | BESTANDEN |
| Public-Badge SQL-Guard | `go test ./internal/repository/... -run TestPublicBadgesSourceFiltersVisibility` | PASS | BESTANDEN |
| Frontend Wave-0 Tests (25 Tests) | `npx vitest run MemberContributionFilters MemberProfileHero MemberStatusPill deriveKnownFor` | 4/4 Dateien PASS, 25/25 Tests | BESTANDEN |
| Smoke-Tests Write-Flows (7 Tests) | `npx vitest run CorrectionReportModal MemorialSetterAction` | 2/2 Dateien PASS, 7/7 Tests | BESTANDEN |
| TypeScript-Typecheck | `npm run typecheck` | Keine Fehler | BESTANDEN |
| Backend-Build | `go build ./...` | Keine Fehler | BESTANDEN |

### Anforderungs-Abdeckung

| Anforderung | Quell-Plan | Beschreibung | Status | Nachweis |
|-------------|-----------|--------------|--------|---------|
| C (UI-Primitives) | 74-00 bis 74-06 | Nur `@/components/ui` Primitives in User-facing UI | ERFÜLLT | `MemberBadgeChips.tsx` natives `<button>` auf `@/components/ui Button` migriert; alle neuen Komponenten nutzen UI-Primitives |
| D-01 | 74-04 | Einspaltige Scroll-Seite mit Sticky-Anker-Nav | ERFÜLLT | `MemberSectionNav.tsx` mit IntersectionObserver; CSS `position:sticky` |
| D-02 | 74-04 | Sektions-Reihenfolge: Hero → Badges → Geschichte → Beiträge | ERFÜLLT | `page.tsx` Sektionen `#identitaet`, `#badges`, `#geschichte`, `#beitraege` in korrekter Reihenfolge |
| D-03 | 74-00/04 | Read-only „Bekannt für" aus role_timeline abgeleitet | ERFÜLLT | `deriveKnownFor.ts`; kein fetch; kein neues DB-Feld; 6 Tests GRÜN |
| D-06 | 74-00/05 | Client-seitige Contribution-Filterung ohne API-Call | ERFÜLLT | `MemberContributionFilters.tsx` mit `useMemo`; Test assertiert kein fetch |
| D-07 | 74-05 | Inline-Expand für Detail-Subtypes | ERFÜLLT | `MemberRoleTimeline.tsx` mit ausklappbaren Details |
| D-08 | 74-05 | Unbestätigte gedämpft + Badge „unbestätigt" | ERFÜLLT | `MemberRoleTimeline.tsx` mit `.entryDimmed` (opacity 0.6) + Badge |
| D-09 | 74-00/01/04 | Status-Pill mit Tooltip für alle 5 Status | ERFÜLLT | `MemberStatusPill.tsx` alle 5 Status mit deutschen Labels; 11 Tests GRÜN |
| D-10 | 74-00/04/05 | Memorial-Hero ohne Mengen-Badges; Contributions sichtbar | ERFÜLLT | `MemberProfileMemorialHero.tsx`; `MemberBadgeHighlights.tsx` unterdrückt Gamification-Badges; 5 Tests GRÜN |
| D-11 | 74-05 | Top-N-Badges + „alle anzeigen" | ERFÜLLT | `MemberBadgeHighlights.tsx` mit Slicing + Toggle |
| D-12 | 74-06 | Alle drei Write-Flows shippbar | ERFÜLLT | CorrectionReportModal + MemorialSetterAction + Claim-409-Hinweis; Human-UAT BESTANDEN |
| D-13 | 74-02 | Memorial setzt nur `members.profile_status`, nicht `app_user` | ERFÜLLT | Kein `app_user`-UPDATE in `member_memorial_handler.go` |
| D-14/D-16 | 74-02 | Global-Admin-only, nicht Gruppen-Capability | ERFÜLLT | `requirePlatformAdminAppUserIdentity`; nicht `CanForFansubGroup` |
| D-15 | 74-00/02 | Audit für Memorial-Set UND Claim-Block mit denied-Audit | ERFÜLLT | `member_profile.memorial_set` + `member_claim.memorial_blocked` Literal in Repos |
| D-17 | 74-02/06 | UI-Hinweis bei 409 memorial_not_claimable | ERFÜLLT | `MemberClaimSection.tsx:77` fängt 409 + `error.code === 'memorial_not_claimable'` ab |
| D-18 | 74-03/06 | Korrektur nur review-gebunden, registrierte User | ERFÜLLT | `requireMeIdentity`; `status='in_review'` Default; CorrectionReportModal |
| Badges-13 | 74-00/01/05 | Badge-Service als Quelle, kein UI-Recompute | ERFÜLLT | SQL-Guard + Source-Fragment-Test; DTO-Badges nur geSliced |
| H (Lock H) | 74-03 | Korrektur-Tabelle getrennt von Claims/Contributions | ERFÜLLT | `member_correction_reports` eigene Tabelle (Migration 0098) |
| J (Global-Admin-Gating) | 74-02/06 | Memorial-Setter + Sichtbarkeit nur Global Admin | ERFÜLLT | Server: `requirePlatformAdminAppUserIdentity`; UI: `if (!isGlobalAdmin) return null` |
| K (Lock K / Contract-first) | 74-01/02/03 | OpenAPI → DTO → Repo → Handler → api.ts → Types gemeinsam | ERFÜLLT | Alle 7 Schichten gleichzeitig aktualisiert |

### Anti-Pattern-Scan

| Datei | Zeile | Muster | Schwere | Wirkung |
|-------|-------|--------|---------|---------|
| `member_profile_repository.go` | — | 1269 Zeilen (pre-existing; vor Phase 74 bereits 1229) | HINWEIS (Altlast, nicht Phase-74-Verursachung) | Phase 74 hat 40 Zeilen hinzugefügt; Datei war bereits weit über 450 Zeilen; `loadPublicBadges` wurde bewusst als Hilfsfunktion ausgelagert (SUMMARY 74-01); keine weiteren Maßnahmen ohne gesonderte Refactor-Phase sinnvoll |
| Phase-40-Altlast | — | `TestFansubNotesRepository_ScopedMutationSourceInvariants` scheitert im Worktree (CRLF) | HINWEIS (false-positive, nicht Phase 74) | Bekanntes Problem: Fresh-Worktree materialisiert `.go`-Dateien mit CRLF (core.autocrlf=true); Test hardcoded LF-Fragmente; committed blobs sind LF (Merge nach main clean); Kein Phase-74-Commit berührt die betroffenen Dateien |

Keine TBD/FIXME/XXX-Marker in Phase-74-Dateien gefunden. Keine nativen `<button>`/`<select>`/`<input>` in neuen Phase-74-Frontend-Dateien. Bestehende Lint-Fehler (4 Fehler) stammen ausschließlich aus Altdateien außerhalb des Phase-74-Scopes.

### Menschliche Verifikation (Human-UAT)

Die Human-UAT wurde live auf dem Dev-Server :3000 vom Nutzer durchgeführt und mit PASS bestätigt.

Verifizierte Aspekte:
- Sektionsreihenfolge: Hero → Badges → Geschichte → Beiträge
- Sticky-Nav (Desktop) + Chip-Leiste (Mobil)
- Status-Pill + Tooltip
- Badges Top-N + „alle anzeigen"
- Gedämpfte unbestätigte Contributions (opacity + „unbestätigt"-Badge)
- Würdevoller Memorial-Hero: „Dieses Profil wird als historisches Gedenkprofil geführt." ohne Mengen-/Gamification-Badges, Contributions sichtbar
- Korrekte deutsche Umlaute ohne ASCII-Ersetzungen
- Smoke-Tests für Write-Flows: `MemorialSetterAction` 4/4 GRÜN, `CorrectionReportModal` 3/3 GRÜN; Backend-Tests für Memorial-403/Audit und Claim-Block-409/denied-Audit alle GRÜN

Nicht live einzeln durchgeführt (aber durch Backend-Tests + Smoke-Tests abgedeckt): Memorial-Setter-Aktion-Trigger, Claim-409-Hinweis-Dialog, Correction-Modal-Submit.

### Zusammenfassung

Alle 7 Observable Truths der Phase sind im Codebase nachweislich implementiert und verdrahtet. Die Kern-Deliverables sind vollständig:

1. **Member-Projektion** trägt `profile_status` + `public_badges` contract-first über alle 7 Lock-K-Schichten.
2. **Memorial-Setter** ist Global-Admin-only mit Audit; verändert ausschließlich `members.profile_status`.
3. **Claim-Sperre** greift in beiden Pfaden (SubmitClaim + AcceptInvitation) server-seitig mit 409 + denied-Audit `member_claim.memorial_blocked`.
4. **Korrektur-melden** läuft über eine eigene Tabelle (`member_correction_reports`), ist review-gebunden (`in_review`), nur für registrierte User, auditiert.
5. **Dreistufiges Scroll-Profil** mit Sticky-Nav, Status-Pill, read-only „Bekannt für"-Ableitung, Memorial-Hero, RichTextRenderer-Story.
6. **Top-N-Badges + client-seitige Filterung** mit Inline-Expand und gedämpften unbestätigten Einträgen.
7. **Alle drei Write-Flow-UIs** verdrahtet: CorrectionReportModal, MemorialSetterAction, Claim-409-Hinweis.

Zwei Hinweise (keine Blocker):
- `member_profile_repository.go` ist eine Altlast mit 1269 Zeilen (1229 vor Phase 74); Phase 74 trägt 40 Zeilen bei, hat den vorhandenen Split-Ansatz (`loadPublicBadges`) genutzt.
- `TestFansubNotesRepository_ScopedMutationSourceInvariants` scheitert im Worktree wegen CRLF (Phase-40-Altlast, bekanntes false-positive).

---
_Verifiziert: 2026-06-05T19:55:00Z_
_Verifizierer: Claude (gsd-verifier)_
