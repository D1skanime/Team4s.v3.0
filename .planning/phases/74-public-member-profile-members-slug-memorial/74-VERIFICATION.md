---
phase: 74-public-member-profile-members-slug-memorial
verified: 2026-06-08T00:00:00Z
status: failed
score: Re-Audit — mehrere Kernziele nur teilweise/falsch umgesetzt
overrides_applied: 0
re_verification: true
supersedes: "Vorheriger Report 2026-06-05 (status: passed) war zu optimistisch — siehe Git-Historie dieses Files."
---

# Phase 74: Re-Audit `/members/[slug]` + Memorial — Gap-Report

**Re-Audit:** 2026-06-08 (Code + echte DB-Daten + Live `:3000`).
**Ergebnis:** Die strukturellen Komponenten existieren, aber mehrere Phase-74-Kernziele
sind auf dem **realen Happy-Path** unvollständig oder nicht verdrahtet. Der vorherige
`status: passed`-Report behauptete u. a. vollständige Filter (Anime/Gruppe/Rolle/Zeitraum/
Status) und funktionierenden Inline-Expand — **beides ist live widerlegt**.

## Belegte Gaps (zu schließen)

### GAP-1 — Contributions-Filter unvollständig (D-06)
`MemberContributionFilters.tsx` bietet nur **Anime + Status**. Gefordert (D-06):
**Anime, Gruppe, Rolle, Zeitraum, Status** — alle clientseitig (`useMemo`, kein fetch).
- Beweis (Live `/members/angeldust`): nur 2 `<select>` in `#beitraege`.
- Fix: Gruppe-, Rolle- und Zeitraum-Filter ergänzen; clientseitige Anwendung.

### GAP-2 — Inline-Details/Subtypes auf Happy-Path tot (D-07)
`MemberContributionFilters` rendert eine **eigene, ärmere `<li>`-Liste** (Z. 108–134)
und umgeht `MemberRoleTimeline` + `EntryDetail`. Inline-Expand erscheint dadurch nur
im Empty-State-Zweig (`page.tsx:144–146`), nie mit echten Daten.
- Beweis (Live): 0 „Details anzeigen"-Buttons in `#beitraege` bei vorhandenen Beiträgen.
- DTO-Lücke: `PublicMemberRoleEntry` trägt **keine** echten Subtype-/Notes-Felder.
  Falls Detaildaten fehlen → Contract sauber erweitern (Backend models + OpenAPI +
  frontend types + `api.ts` gemeinsam, Lock K).
- Fix-Richtung: gefilterte Liste an `MemberRoleTimeline` durchreichen statt Eigenliste.

### GAP-3 — `role_timeline` ignoriert aktuelle App-Gruppenrollen (Datenquelle)
`GetPublicMemberContributions` (`anime_contributions_public_repository.go:290–377`)
liest nur `hist_group_member_roles` + `anime_contributions`. Aktuelle App-Gruppenrollen
(`fansub_group_members` via `app_user_id` + `fansub_group_member_roles.role`) fehlen.
- Beweis (DB): Ballelboy (member 3, app_user 2) ist `fansub_lead`@AnimeOwnage, hat aber
  0 hist-Rollen und 0 Anime-Contribs → Timeline live leer.
- **Nutzer-Entscheidung:** Aktuelle App-Gruppenrollen SOLLEN als `context='group_history'`
  zusätzlich in die Timeline aufgenommen werden, **sauber getrennt** von Anime-Beiträgen
  (keine Vermischung). App-Rollencodes über `role_definitions`/Labels mappen. Member→
  app_user-Resolution wie in `member_profile_repository` (verified claim ODER `members.user_id`).

### GAP-9 — `/me/profile` „Öffentliches Profil ansehen" zeigt auf ID statt Slug
`frontend/src/app/me/profile/components/MemberProfileHero.tsx:19` nutzt
`/members/${profile.member_id}` → erzeugt `/members/3` statt `/members/ballelboy`.
- Fix: auf nickname-abgeleiteten Public-Slug zeigen (konsistent mit `memberSlugExpr`);
  `MemberProfileData`/DTO ggf. um `slug` erweitern (Lock K).

## Code-only Audit + Fix (kein Live-Test — keine Memorial-Daten in DB)

### GAP-6/7 — Memorial nie mit echten Daten geprüft
DB enthält **0** Profile mit `profile_status IN ('memorial','historical')`. Memorial-Hero,
Claim-Sperre (409 `memorial_not_claimable` in beiden Pfaden + denied-Audit) und Badge-
Unterdrückung sind nur über Go-/Unit-Tests abzusichern. Code auditieren + ggf. fixen,
Verifikation via `go test`.

## Live nachzuprüfen während Fix (auf `:3000`)
- (4) Story/RichText layoutstabil inkl. Tabellen, mobile 375px kein Overflow, keine Mojibake.
- (5) Badges nur aus `public_badges`-DTO, Top-N + „alle anzeigen", Memorial unterdrückt Mengen-Badges.
- (8) „Korrektur melden" → review-gebundener Vorschlag (`member_correction_reports`), UI-Bestätigung.
- (10) Status-Pill + Tooltip alle Status.
- (11) Sticky/Mobile-Nav kein horizontaler Overflow; Reihenfolge Hero→Badges→Geschichte→Beiträge.
- (12) Hidden/Noindex + `OwnHiddenProfilePreview` nur für Besitzer.
- (13) Contract-Disziplin; deutsche Umlaute korrekt.

## Live bereits funktionierend (kein Fix nötig, außer Regression)
Sticky-Nav vorhanden · Status-Pill „Aktiv" neben Name · Story (`member_story_html`) rendert
inkl. Tabelle ohne Mojibake · Badge-Empty-State ehrlich · Gruppenlead erscheint in der
`memberships`/„Fansub-Gruppen"-Sektion.

---
_Re-Auditiert: 2026-06-08 — Claude (Opus 4.8), Code + DB + Live :3000._
