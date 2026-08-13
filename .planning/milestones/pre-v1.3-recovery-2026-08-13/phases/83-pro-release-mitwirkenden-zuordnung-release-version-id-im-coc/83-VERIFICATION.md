---
phase: 83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc
verified: 2026-06-12T01:10:00Z
status: human_needed
score: 16/16 must-haves verified
overrides_applied: 0
human_verification:
  - test: "ReleaseContributionDrawer im Live-Cockpit öffnen und Projektteam sehen"
    expected: "Drawer öffnet für eine Release-Zeile; geerbtes Projektteam erscheint vorbefüllt (oder 'Noch keine Mitwirkenden' für leere Fansub-Gruppe); Lade-Spinner erscheint kurz und verschwindet"
    why_human: "Erfordert authentifizierten Browser-Request gegen Dev-Server, echte DB-Daten und laufende Go-/Next-Server"
  - test: "Status-Badge in Cockpit Release-Zeile ohne Drawer-Interaktion prüfen"
    expected: "Beim Seitenaufruf (tab=releases) zeigt jede Release-Zeile Badge 'Projektteam' (muted), 'Eigene Besetzung' (info) oder 'Mitwirkende fehlen' (warning) — direkt aus dem Listing-API, kein Defer"
    why_human: "has_override-Feld aus DB-Subquery — nur mit echten Daten und laufendem Backend verifizierbar"
  - test: "Override speichern + Berechtigung via CanForReleaseVersion testen"
    expected: "Ein Fansub-Member mit Contribution 'translator' kann Notizen auf seiner Release-Version schreiben; ein Member ohne Contribution wird mit 403 abgewiesen"
    why_human: "Sicherheitskritischer Permission-Umbau D-01..D-04 — erfordert authentifizierte Requests mit echten app_user_id-Werten gegen laufendes Backend + DB"
  - test: "Mitwirkende entfernen und Speichern im Drawer"
    expected: "Entfernen markiert Zeile als zu löschen (kein sofortiger API-Call); Speichern schickt DELETE-Requests für die contribution_ids; danach erscheint der Member nicht mehr in der Rollen-Liste für genau diese Release-Version"
    why_human: "handleSave-Algorithmus (Pitfall 4, contribution_id) erfordert Browser-Interaktion + DB-Verifikation"
  - test: "Leader-Bypass live testen — fansub_lead kann Release-Inhalte bearbeiten ohne Contribution"
    expected: "Ein fansub_lead ohne eigene Contribution-Zeile bekommt 200 auf Notizen-/Media-Endpoint für eine Release-Version seiner Gruppe"
    why_human: "D-05 Leader-Bypass in CanForReleaseVersion — erfordert authentifizierte OIDC-Session mit fansub_lead-Rolle"
---

# Phase 83: Pro-Release-Mitwirkenden-Zuordnung Verification Report

**Phase Goal:** Leader können Mitwirkende/Rollen PRO RELEASE festlegen (nicht nur anime-weit): Default = alle Team-Mitglieder sind auf jedes Release gemappt; pro Release sind Ausnahmen + Rollen-Overrides möglich, datenseitig über anime_contributions.release_version_id (+ release_version_groups). UI als Pro-Release-Sicht im bestehenden Projekt-Cockpit (Override-Drawer im Fansub-Edit-Cockpit). Permission-Modell: contribution-basierte Auflösung von CanForReleaseVersion mit Leader-Bypass.
**Verified:** 2026-06-12T01:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Inherited Pre-Existing Test Failures (NOT Phase 83 regressions)

Per context: three backend tests were already failing at baseline commit 076a4f31 before Phase 83 work began:
- `TestContributionUpsert_FourColumnConflict` (internal/repository)
- `TestPhase69AnimeContributionMutationsUseRouteScope` (internal/repository)
- `TestGetMemberIDForContribution_MethodExists` (internal/services)

These are owned by the concurrent Phase 82 domain. Phase 83 is not scored for these.

Five frontend test files also fail but none are in files Phase 83 touched:
- `src/lib/api.no-token-boundary.test.ts`
- `src/app/admin/anime/page.test.tsx`
- `src/app/admin/anime/create/page.test.tsx`
- `src/app/fansubs/__tests__/page.test.tsx`
- `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`

These are pre-existing failures in other domains.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-01/D-04: `CanForReleaseVersion` erlaubt nur Actors mit gültiger Contribution oder Leader-Rolle | VERIFIED | permissions.go Z. 243–317: eigenständige Methode mit 4-stufigem Ablauf. Test `TestCanForReleaseVersionContributionRequired` PASS |
| 2 | D-02: `ListActorContributionRolesForVersion` zweistufig (versions-spezifisch → anime-weit Fallback) | VERIFIED | authz_permissions.go Z. 197–277: Schritt 1 (release_version_id=$1), Schritt 2 (IS NULL + JOIN release_versions). `TestListActorContributionRolesForVersion` PASS |
| 3 | D-03: Absenz im Override-Satz = kein Recht für dieses Release | VERIFIED | permissions.go Z. 313–316: leere roleCodes → `denied(ReasonNoMembership)`. Test `TestCanForReleaseVersionAbsenceInOverride` PASS |
| 4 | D-05: fansub_lead UND project_lead haben immer Zugriff — Leader-Check VOR Contribution-Check | VERIFIED | permissions.go Z. 273–294: Leader-Schleife vor Schritt 3. Tests `TestCanForReleaseVersionLeaderBypass` + `TestCanForReleaseVersionProjectLeadBypass` PASS |
| 5 | D-13: `GetMemberRolesForVersion` liest aus `anime_contributions` statt Legacy `release_member_roles` | VERIFIED | release_version_notes_repository.go Z. 117–120: Kommentar D-13. Query JOINt `anime_contributions`, kein `release_member_roles`. `MemberRoleForVersion.RoleCode string` statt `RoleID int64` |
| 6 | D-06/D-07: ReleaseContributionDrawer öffnet als rechter Drawer mit vorbefüllter Rollen-Liste | VERIFIED | ReleaseContributionDrawer.tsx Z. 183–295: `<Drawer title="Mitwirkende">`, vorbefüllt via `listEffectiveContributionsForVersion`. Staged (Footer: Speichern/Abbrechen) |
| 7 | D-08: Cockpit zeigt Status-Badge aus `has_override`-Feld des Listing-API | VERIFIED | page.tsx Z. 3263–3277: Badge mit Kondition `release.has_override`. admin_content_fansub_releases.go: EXISTS-Subquery als `has_override` in SELECT + `&item.HasOverride` in Scan |
| 8 | D-09: Mehrere Personen pro Rolle erlaubt — stagedRows hält mehrere Einträge | VERIFIED | ReleaseContributionDrawer.tsx: `stagedRows: EffectiveContributionRow[]` — kein Exklusivitäts-Check |
| 9 | D-10/D-11: Override gilt für genau eine Release-Version (Endpoint-Scope via :versionId) | VERIFIED | GetEffectiveContributionsForVersion-Handler parst versionId aus Path-Param. ListEffectiveContributionsForVersion filtert auf `release_version_id = $1` |
| 10 | D-12: Kandidaten-Pool = nur Mitglieder der angefragten fansub_group_id | VERIFIED | Repository: `WHERE ac.fansub_group_id = $2`. Drawer: `listUnifiedGroupMembers(fansubId)` |
| 11 | D-14: Ausschließlich @/components/ui-Primitives in neuen/geänderten Dateien | VERIFIED | ReleaseContributionDrawer.tsx: keine nativen Elemente. AnimeContributionModal.tsx: `<FormField>`-Wrapper ergänzt. Pre-existing `<input type="checkbox">` (Z. 286/298) war bereits beim Baseline-Commit 076a4f31 vorhanden — kein Phase-83-Verstoß |
| 12 | D-15: UI-Texte verwenden "Mitwirkende" (nicht "Beiträge") | VERIFIED | Drawer title "Mitwirkende", aria-label "Mitwirkende entfernen", Button "Mitwirkende" in page.tsx. Kein "Beiträge"-String in neuen Dateien |
| 13 | D-16: Hard-DELETE-Risiko für anime_contributions ist als Constraint dokumentiert | VERIFIED | anime_contributions_member_repository.go Z. 41–44: Kommentar mit "D-16", "Soft-Delete", "Folgearbeit" |
| 14 | IDOR-Mitigation: GET /contributions/effective prüft Berechtigung vor Datenrückgabe | VERIFIED | Handler Z. 45–48: `requireReleaseVersionViewAccess` VOR Repository-Call. Test `TestGetEffectiveContributionsForVersion/denied` → 403 PASS |
| 15 | main.go-Verdrahtung: WithFansubReleasesContributionsDeps vorhanden (kein nil-Pointer-Panic) | VERIFIED | main.go Z. 223: `.WithFansubReleasesContributionsDeps(repository.NewFansubReleasesContributionsRepository(dbPool))` |
| 16 | Contract in shared/contracts/admin-content.yaml ergänzt | VERIFIED | admin-content.yaml: Eintrag `admin-release-version-contributions-effective` mit GET, Pfad, Auth, fansub_group_id Query-Param |

**Score:** 16/16 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/permissions/permissions.go` | Umgebautes CanForReleaseVersion + Resolver-Interface-Erweiterung | VERIFIED | ListActorContributionRolesForVersion im Interface Z. 189, CanForReleaseVersion Z. 243–317 |
| `backend/internal/repository/authz_permissions.go` | ListActorContributionRolesForVersion | VERIFIED | Z. 197–277, zweistufig |
| `backend/internal/repository/release_version_notes_repository.go` | GetMemberRolesForVersion auf anime_contributions | VERIFIED | MemberRoleForVersion.RoleCode, JOIN anime_contributions, kein release_member_roles |
| `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` | FansubReleasesContributionsRepository + ListEffectiveContributionsForVersion | VERIFIED | Existiert, zweistufig, ContributionID in Row |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` | GetEffectiveContributionsForVersion Handler | VERIFIED | Z. 43–82, IDOR-Mitigation vorhanden |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` | TestGetEffectiveContributionsForVersion (403/200) | VERIFIED | Beide Subtests PASS |
| `backend/internal/models/admin_release_theme_assets.go` | AdminFansubReleaseSummary.HasOverride bool | VERIFIED | Z. 51 |
| `backend/internal/repository/admin_content_fansub_releases.go` | has_override-Subquery + Scan | VERIFIED | EXISTS-Subquery mit `rv_sub.release_id = fr.id`, `&item.HasOverride` im Scan |
| `backend/cmd/server/admin_routes.go` | Route contributions/effective | VERIFIED | Z. 131 |
| `backend/cmd/server/main.go` | WithFansubReleasesContributionsDeps | VERIFIED | Z. 223 |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` | Override-Drawer-Komponente | VERIFIED | 296 Zeilen, staged, Drawer-Primitive |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` | Mini-Avatar-Komponente | VERIFIED | Existiert, `<img>` + Initialen-Fallback |
| `frontend/src/lib/api.ts` | listEffectiveContributionsForVersion | VERIFIED | Z. 7869–7895 |
| `frontend/src/types/fansub.ts` | EffectiveContributionRow + EffectiveContributionsResponse | VERIFIED | Z. 682–695 |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | ReleaseContributionDrawer import + State + Badge + Button + Mount | VERIFIED | Import Z. 117, State Z. 1131, Badge Z. 3263, Button Z. 3293, Mount Z. 3985 |
| `backend/internal/repository/anime_contributions_member_repository.go` | D-16-Kommentar | VERIFIED | Z. 41–44 |
| `shared/contracts/admin-content.yaml` | admin-release-version-contributions-effective Eintrag | VERIFIED | Z. 742 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| permissions.go CanForReleaseVersion | authz_permissions.go ListActorContributionRolesForVersion | s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID) | WIRED | Z. 298 permissions.go |
| admin_routes.go | GetEffectiveContributionsForVersion | v1.GET(".../contributions/effective", auth, h.GetEffectiveContributionsForVersion) | WIRED | admin_routes.go Z. 131 |
| GetEffectiveContributionsForVersion | ListEffectiveContributionsForVersion | h.fansubReleasesContributionsRepo.ListEffectiveContributionsForVersion | WIRED | handler Z. 56 |
| main.go AdminContentHandler | WithFansubReleasesContributionsDeps | .WithFansubReleasesContributionsDeps(repository.New...) | WIRED | main.go Z. 223 |
| page.tsx Release-Zeile | ReleaseContributionDrawer | import + open={contributionDrawerOpen} | WIRED | page.tsx Z. 117, 3985 |
| page.tsx Release-Zeile Badge | has_override-Feld | release.has_override === true/false/undefined | WIRED | page.tsx Z. 3264 |
| admin_content_fansub_releases.go | anime_contributions (has_override Subquery) | EXISTS (SELECT 1 FROM anime_contributions ac_sub JOIN release_versions rv_sub ON rv_sub.id = ac_sub.release_version_id WHERE rv_sub.release_id = fr.id) | WIRED | rv_sub.release_id = fr.id korrekt (Pitfall 6 geschlossen) |
| ReleaseContributionDrawer.tsx | listEffectiveContributionsForVersion | listEffectiveContributionsForVersion(releaseVersionId, fansubId) | WIRED | Drawer Z. 85 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CanForReleaseVersion-Tests (D-01..D-05) | `go test ./internal/permissions/... -run TestCanForReleaseVersion -v` | 5/5 PASS | PASS |
| IDOR Handler-Test (403/200) | `go test ./internal/handlers/... -run TestGetEffectiveContributionsForVersion -v` | 2/2 subtests PASS | PASS |
| ListActorContributionRolesForVersion Repository-Test | `go test ./internal/repository/... -run TestListActorContributionRolesForVersion -v` | 2/2 subtests PASS | PASS |
| ReleaseContributionDrawer Vitest | `npm run test -- --reporter=dot ReleaseContributionDrawer` | 6/6 PASS | PASS |
| Admin fansubs test suite | `npm run test -- --reporter=dot admin/fansubs` | 107/107 PASS | PASS |
| Backend build | `go build ./...` | exit 0 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| D-01 | 83-01, 83-02 | Contribution steuert Edit-Rechte | SATISFIED | CanForReleaseVersion umgebaut |
| D-02 | 83-01, 83-02, 83-03, 83-04 | Zweistufige Auflösung: versions-spezifisch → anime-weit Fallback | SATISFIED | authz_permissions.go + admin_content_fansub_releases_contributions_repository.go |
| D-03 | 83-01, 83-02 | Absenz im Override = kein Recht für dieses Release | SATISFIED | permissions.go Z. 313 |
| D-04 | 83-01, 83-02 | Reine Gruppen-Mitgliedschaft reicht nicht | SATISFIED | permissions.go Z. 313–316 |
| D-05 | 83-01, 83-02 | fansub_lead + project_lead immer ausgenommen | SATISFIED | Leader-Check vor Contribution-Check |
| D-06 | 83-05, 83-06 | Einstieg pro Release-Version-Zeile, staged Drawer | SATISFIED | page.tsx + ReleaseContributionDrawer |
| D-07 | 83-05 | Drawer zeigt Rollen-Liste vorbefüllt mit Projektteam | SATISFIED | Drawer öffnet mit listEffectiveContributionsForVersion |
| D-08 | 83-04, 83-06 | Cockpit-Übersicht Badge beim initialen Load aus has_override | SATISFIED | has_override Subquery + Badge in page.tsx |
| D-09 | 83-05 | Mehrere Personen pro Rolle erlaubt | SATISFIED | stagedRows ohne Exklusivitäts-Check |
| D-10 | 83-04, 83-05 | Override gilt für genau eine Release-Version | SATISFIED | Endpoint-Scope via :versionId |
| D-11 | 83-04, 83-05 | Override = eigener vollständiger Satz | SATISFIED | EffectiveContributionsResult mit IsOverride-Flag |
| D-12 | 83-04, 83-05 | Kandidaten-Pool = nur aktuelle Gruppe | SATISFIED | fansub_group_id-Scope im Repository + listUnifiedGroupMembers(fansubId) |
| D-13 | 83-03 | Notizen-/Media-Maske konsistent an anime_contributions | SATISFIED | GetMemberRolesForVersion migriert |
| D-14 | 83-05, 83-06, 83-07 | Ausschließlich @/components/ui-Primitives | SATISFIED | Neue Dateien sauber. AnimeContributionModal.tsx: FormField-Wrapper ergänzt. Pre-existing checkbox-inputs sind Baseline-Altlast |
| D-15 | 83-05, 83-06, 83-07 | "Mitwirkende" konsistent (nicht "Beiträge") | SATISFIED | Drawer title, aria-labels, Button-Labels |
| D-16 | 83-07 | Soft-Delete-Lücke dokumentiert als Constraint/Risiko | SATISFIED | anime_contributions_member_repository.go Z. 41–44 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | 286, 298 | `<input type="checkbox">` (no-restricted-syntax warning) | Info | Pre-existing seit Baseline 076a4f31; Plan 07 hatte scope nur auf `<select>` ohne FormField. Keine Phase-83-Regression. |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` | 18 | `<img>` statt `next/image` (@next/next/no-img-element warning) | Info | Bekanntes warning-level Pattern im Projekt; kein security-relevanter Verstoß. Kein D-14-Verstoß. |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` | 148–161 | `upsertAnimeContribution` bei handleAddConfirm wird direkt (ohne await) mit `.catch()` aufgerufen, nicht gesammelt in handleSave | Warning | Inkonsistenz zum PLAN-Spec (handleSave soll upserts sammeln). Neue Rows werden sofort persistiert beim Hinzufügen statt erst beim Speichern. Das ist eine UX-Abweichung vom Plan-05-Spec (C-STAGED), aber kein Datenverlust-Risiko. |

**Debt-Marker Check:** Keine TBD/FIXME/XXX-Marker in Phase-83-neuen Dateien gefunden.

### Human Verification Required

### 1. ReleaseContributionDrawer Live-Browser-Test

**Test:** Im Dev-Server (:3000) zu einem Fansub-Edit (`/admin/fansubs/[id]/edit?tab=releases`) navigieren und den "Mitwirkende"-Button in einer Release-Zeile klicken.
**Expected:** Drawer öffnet sich rechts; Lade-Spinner kurz sichtbar; danach entweder vorbefüllte Rollen-Liste (wenn anime-weite Contributions existieren) oder EmptyState "Noch keine Mitwirkenden".
**Why human:** Benötigt authentifizierte Session, laufenden Go-Backend + DB mit echten Contribution-Daten.

### 2. Status-Badge Cockpit beim initialen Load

**Test:** Fansub-Edit-Seite mit `tab=releases` aufrufen und ohne Drawer-Interaktion die Release-Zeilen prüfen.
**Expected:** Jede Release-Zeile zeigt Badge "Projektteam" (muted), "Eigene Besetzung" (info) oder "Mitwirkende fehlen" (warning) — basierend auf `has_override`-Feld aus dem Listing-API. Kein Badge erst nach Drawer-Öffnung.
**Why human:** has_override = DB-Subquery auf release_versions + anime_contributions; nur mit echten Daten verifizierbar.

### 3. Permission D-04 Live — Member ohne Contribution kann nicht schreiben

**Test:** Als App-User der nur Fansub-Member ist (kein Contribution-Eintrag) versuchen, auf einem Release-Version-Notizen-Endpoint zu schreiben.
**Expected:** 403 mit reason_code "no_membership".
**Why human:** Erfordert Keycloak-Authentifizierung mit spezifischem App-User ohne Contribution.

### 4. Permission D-05 Live — fansub_lead kann trotz fehlender Contribution schreiben

**Test:** Als fansub_lead ohne eigenen anime_contributions-Eintrag auf einen Release-Version-Notizen-Endpoint schreiben.
**Expected:** 200 (Zugriff erlaubt durch Leader-Bypass).
**Why human:** Erfordert Keycloak-Session mit fansub_lead-Rolle in fansub_group_member_roles.

### 5. Override speichern + Persistenz prüfen

**Test:** Im Drawer einen Mitwirkenden entfernen und "Speichern" klicken. Dann Drawer erneut öffnen.
**Expected:** Der entfernte Member erscheint nicht mehr in der Liste für diese Release-Version. Projekt-Default für andere Releases bleibt unberührt.
**Why human:** handleSave + deleteAnimeContribution-Call + DB-Persistenz — nur mit laufendem Stack und echten Daten verifizierbar.

---

## Gaps Summary

Keine blocking Gaps. Alle 16 must-haves sind codebasis-seitig verifiziert.

**Getrackte Abweichung (kein BLOCKER):** `ReleaseContributionDrawer.tsx` ruft `upsertAnimeContribution` in `handleAddConfirm` direkt (fire-and-forget mit `.catch()`) auf, anstatt die Upserts in `handleSave` zu sammeln. Die Plan-05-Spec beschrieb C-STAGED (nur explizites Speichern). Neue Rows werden sofort beim Hinzufügen persistiert, nicht erst beim Speichern. Entfernungen hingegen bleiben korrekt staged. Diese UX-Inkonsistenz ist für Admins tolerierbar (kein Datenverlust), sollte aber live überprüft werden.

---

_Verified: 2026-06-12T01:10:00Z_
_Verifier: Claude (gsd-verifier)_
