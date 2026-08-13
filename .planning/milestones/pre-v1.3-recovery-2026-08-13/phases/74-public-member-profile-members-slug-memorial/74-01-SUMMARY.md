---
phase: 74-public-member-profile-members-slug-memorial
plan: "01"
subsystem: member-profile
tags: [go, repository, openapi, typescript, badge, dto, contract-first]

dependency_graph:
  requires:
    - phase: 74-00
      provides: "Wave-0 RED-Stubs fuer badge_public_source_test.go und profile_status in PublicMemberProfileData"
    - phase: 72
      provides: "members.profile_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK IN ('active','historical','memorial')"
  provides:
    - "PublicMemberBadge-DTO (id, badge_code, badge_category) in models/member_profile.go"
    - "GetPublicMemberBadges-Methode in badge_repository.go mit visibility='public' AND status='active' Guard"
    - "PublicMemberProfile.ProfileStatus + PublicBadges in allen Lock-K-Schichten"
    - "profile_status in candidates-CTE und loadPublicBadges-Hilfsfunktion in member_profile_repository.go"
    - "OpenAPI PublicMemberBadge-Schema + PublicMemberProfileData um profile_status/public_badges erweitert"
    - "TypeScript-Typen MemberProfileStatus + PublicMemberBadge + PublicMemberProfileData ergaenzt"
  affects:
    - "Plan 74-03 (Frontend-Komponenten MemberStatusPill, MemberBadgeHighlights verwenden profile_status + public_badges)"
    - "Plan 74-02 (Memorial-Handler schreibt profile_status; CTE projiziert es jetzt korrekt)"

tech-stack:
  added: []
  patterns:
    - "Eigenstaendige GetPublicMemberBadges-Methode als public-only Badge-Quelle (Badges-13) — nicht GetMemberBadges wiederverwenden"
    - "loadPublicBadges als ausgelagerte Hilfsfunktion in member_profile_repository.go (450-Zeilen-Grenze)"
    - "Contract-first Lock-K: OpenAPI + DTO + Repo + Handler + api.ts + Types gemeinsam bewegt"
    - "COALESCE(m.profile_status, 'active') in CTE fuer rueckwaertskompatible Projektion ohne Migration in Plan 01"

key-files:
  created: []
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/badge_repository.go
    - backend/internal/repository/member_profile_repository.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - "loadPublicBadges als Hilfsfunktion ausgelagert statt LATERAL-CTE-Erweiterung — member_profile_repository.go ist bereits weit ueber 450 Zeilen; separate Load-Funktion ist wartbarer und compiliert ohne JSON-Aggregat-Komplexitaet"
  - "COALESCE(m.profile_status, 'active') in CTE — sicherer Fallback fuer Rows ohne expliziten Wert; kein NOT NULL-Constraint-Bruch wenn Phase-72-Migration noch nicht angewendet"
  - "toPublicProfile-Adapter in OwnHiddenProfilePreview liefert profile_status='active' + public_badges=[] — MemberProfileData (own-profile) traegt kein profile_status-Feld; Fallback ist semantisch korrekt fuer eigene Profilvorschau"

requirements-completed: [C, "Badges-13", K, D-09, D-11]

duration: "~15min"
completed: "2026-06-05"
tasks: 2
files: 7
---

# Phase 74 Plan 01: Contract-first DTO-Erweiterung (profile_status + public_badges) — Summary

**PublicMemberProfile-DTO traegt nun profile_status und eingebettete public_badges ueber alle 7 Lock-K-Schichten — GetPublicMemberBadges mit visibility='public' AND status='active' Guard als eigenstaendige Badge-Quelle implementiert.**

## Performance

- **Duration:** ~15 Minuten
- **Started:** 2026-06-05T11:35:00Z
- **Completed:** 2026-06-05T11:50:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `GetPublicMemberBadges` als eigenstaendige Methode in `badge_repository.go` implementiert — SQL-Guard `visibility='public' AND status='active'` wird Source-Fragment-Tests aus Plan 00 gruen
- `PublicMemberProfile`-DTO um `ProfileStatus string` und `PublicBadges []PublicMemberBadge` erweitert; neuer Typ `PublicMemberBadge` (ID, BadgeCode, BadgeCategory)
- `GetPublicMemberProfile` und `findPublicMemberProfileByNormalizedSlug` projizieren `profile_status` aus CTE; `loadPublicBadges`-Hilfsfunktion laedt public Badges separat (ausgelagert wegen 450-Zeilen-Limit)
- OpenAPI: neues `PublicMemberBadge`-Schema + `PublicMemberProfileData` um `profile_status` (enum active/historical/memorial) und `public_badges` ergaenzt
- TypeScript: `MemberProfileStatus`-Typ, `PublicMemberBadge`-Interface, `PublicMemberProfileData` um beide Pflichtfelder erweitert
- `toPublicProfile`-Adapter und Test-Helper mit den neuen Pflichtfeldern kompatibel gemacht

## Task Commits

1. **Task 1: GetPublicMemberBadges-Repo-Methode + DTO-Erweiterung (Backend)** — `122ca526` (feat)
2. **Task 2: Contract-Schichten verdrahten (OpenAPI + Handler + api.ts + Types)** — `fd914d32` (feat)

## Files Created/Modified

- `backend/internal/models/member_profile.go` — PublicMemberBadge-Struct hinzugefuegt; PublicMemberProfile um ProfileStatus + PublicBadges erweitert
- `backend/internal/repository/badge_repository.go` — GetPublicMemberBadges-Methode mit visibility='public' AND status='active' Guard; models-Import ergaenzt
- `backend/internal/repository/member_profile_repository.go` — publicMemberProfileBaseRow um profileStatus ergaenzt; CTE in GetPublicMemberProfile + Fallback-Query um profile_status erweitert; loadPublicBadges-Hilfsfunktion hinzugefuegt
- `shared/contracts/openapi.yaml` — PublicMemberBadge-Schema neu; PublicMemberProfileData um profile_status + public_badges erweitert
- `frontend/src/types/profile.ts` — MemberProfileStatus, PublicMemberBadge, PublicMemberProfileData.profile_status + public_badges
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` — toPublicProfile-Adapter mit profile_status='active' + public_badges=[] Fallback
- `frontend/src/components/profile/MemberProfileHero.test.tsx` — makePublicProfile-Helper um profile_status + public_badges ergaenzt

## Decisions Made

- `loadPublicBadges` als eigenstaendige Hilfsfunktion ausgelagert statt LATERAL-CTE-Erweiterung mit json_agg — `member_profile_repository.go` ist bereits weit ueber 450 Zeilen; eine separate Load-Funktion vermeidet weiteres Anwachsen der CTE und ist wartbarer.
- `COALESCE(m.profile_status, 'active')` in der CTE als sicherer Fallback — verhindert NULL-Werte wenn Phase-72-Migration noch nicht angewendet ist (z.B. lokale Entwicklungsumgebungen).
- Plan-Anforderung "typecheck gruen" kann im Worktree nicht ausgefuehrt werden (kein `node_modules`); Typ-Korrektheit wurde durch manuelle Analyse der Typ-Adapter und Konstruktoren verifiziert — gleiche akzeptierte Einschraenkung wie Plan 00.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] toPublicProfile-Adapter in OwnHiddenProfilePreview fehlte neue Pflichtfelder**
- **Found during:** Task 2 (Contract-Schichten verdrahten)
- **Issue:** `PublicMemberProfileData` hat jetzt `profile_status` und `public_badges` als Pflichtfelder. `toPublicProfile` in `OwnHiddenProfilePreview.tsx` konstruiert das Objekt aus `MemberProfileData` (own-profile DTO), das diese Felder nicht traegt — TypeScript-Fehler.
- **Fix:** `profile_status: 'active'` (sicherer semantischer Fallback fuer eigene Profilvorschau) und `public_badges: []` hinzugefuegt.
- **Files modified:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx`
- **Verification:** Logisch korrekt — eigene Profilvorschau zeigt kein Memorial-Status; leere Badge-Liste ist sicher.
- **Committed in:** `fd914d32` (Task 2 commit)

**2. [Rule 1 - Bug] makePublicProfile-Testhelfer in MemberProfileHero.test.tsx fehlte neue Felder**
- **Found during:** Task 2 (Contract-Schichten verdrahten)
- **Issue:** `makePublicProfile` konstruiert `PublicMemberProfileData` ohne `profile_status` und `public_badges` — TypeScript-Fehler nach Erweiterung der Interface.
- **Fix:** `profile_status: 'active'` und `public_badges: []` als Standardwerte in den Base-Mock eingefuegt.
- **Files modified:** `frontend/src/components/profile/MemberProfileHero.test.tsx`
- **Committed in:** `fd914d32` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 Bug — fehlende Pflichtfelder in Typ-Adaptern nach Interface-Erweiterung)
**Impact on plan:** Beide Fixes notwendig fuer Typ-Korrektheit. Kein Scope-Creep.

## Verification Results

| Check | Status |
|-------|--------|
| `go test ./internal/repository/... -run PublicBadges` | PASS (2 Tests gruen) |
| `go build ./...` | PASS |
| `npm run typecheck` | NICHT AUSFUEHRBAR (kein node_modules im Worktree — akzeptiertes Wave-Muster wie Plan 00) |
| OpenAPI profile_status + public_badges vorhanden | BESTAETIGT (grep) |
| Source-Fragment visibility='public' AND status='active' | BESTAETIGT (Tests gruen) |

## Known Stubs

Keine — alle Produktionsfelder sind implementiert und leiten echte Daten durch. `profile_status` kommt aus der DB-CTE (Phase-72-Schema), `public_badges` aus der `member_badges`-Tabelle.

## Threat Flags

Keine neuen Trust-Boundaries eingefuehrt. Der SQL-Guard `visibility='public' AND status='active'` in `GetPublicMemberBadges` und `loadPublicBadges` implementiert die Mitigation von T-74-01-INFO aus dem Plan-Threat-Register. Source-Fragment-Tests erzwingen diesen Guard dauerhaft.

## Next Phase Readiness

- Plan 74-02 (Memorial-Handler) kann `profile_status`-Feld jetzt schreiben; die CTE in `GetPublicMemberProfile` projiziert es bereits korrekt
- Plan 74-03 (Frontend-Komponenten) kann `profile_status` und `public_badges` aus dem erweiterten DTO lesen
- `getMemberProfile` in `api.ts` reicht das erweiterte DTO durch ohne Aenderung — kein zweiter Endpunkt benoetigt

---
*Phase: 74-public-member-profile-members-slug-memorial*
*Completed: 2026-06-05*
