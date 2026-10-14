---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 08
subsystem: ui
tags: [typescript, nextjs, react, vitest, release-editor, navigation, routing]

# Dependency graph
requires:
  - phase: 181-07
    provides: "/releases/[versionId]/edit -- the merged, working release editor page this plan repoints all external entry points to"
provides:
  - "All 11 confirmed external entry points (6 admin-route, 5 workspace-route) link directly to /releases/[versionId]/edit"
  - "fansubEditAccess.ts's releaseVersionToolsTarget() speaks the unified tab vocabulary (\"notes\" instead of \"notizen\")"
affects: [181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Link-target-only repointing: href/router.push string literals updated, link TEXT left untouched per UI-SPEC Interaktionskontrakt #5"

key-files:
  created: []
  modified:
    - "frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx"
    - "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx"
    - "frontend/src/app/admin/users/tabs/UserMediaTab.tsx"
    - "frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx"
    - "frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts"
    - "frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"
    - "frontend/src/app/me/dashboard/components/AttentionSection.tsx"
    - "frontend/src/app/me/dashboard/components/AttentionSection.test.tsx"
    - "frontend/src/app/me/dashboard/components/attentionHelpers.ts"
    - "frontend/src/app/me/dashboard/components/attentionHelpers.test.ts"
    - "frontend/src/components/contributions/ContributionCard.tsx"
    - "frontend/src/components/contributions/ContributionCard.test.tsx"
    - "frontend/src/components/contributions/AnimeGroupCard.tsx"
    - "frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx"

key-decisions:
  - "No deviations needed -- all 11 interfaces matched the plan's <interfaces> block exactly (line numbers, string literals, tab-id translations), and the 1 dead-code removal matched the research's Pitfall 1 finding exactly."
  - "Left frontend/src/lib/releaseEditorRedirects.ts (and its test) untouched despite its literal '/admin/episode-versions/:versionId/edit' and '/me/releases/:versionId/workspace' source strings -- this is Plan 02's output, intentionally keeping the OLD paths as redirect-rule sources for Plan 09 to wire into next.config.mjs; repointing it here would break Plan 09's redirect contract."
  - "Left frontend/src/lib/api/episodes.ts's '/api/v1/admin/episode-versions/...' literals untouched -- these are backend API endpoint URLs (a different concern from the frontend page route this phase repoints), out of this plan's scope."

patterns-established: []

requirements-completed: [D-01]

# Metrics
duration: ~12min
completed: 2026-10-13
---

# Phase 181 Plan 08: Externe Einstiegspunkte auf die neue Release-Editor-Seite umstellen Summary

**Alle 11 bestätigten externen Einstiegspunkte (6 Admin-Route, 5 Workspace-Route) zeigen jetzt direkt auf `/releases/[versionId]/edit`; der 1 bestätigt tote "Version bearbeiten"-Link wurde als nicht erreichbarer Code entfernt -- Link-TEXT blieb dabei überall unverändert.**

## Performance

- **Duration:** ~12 min (17:03 - 17:15 UTC)
- **Started:** 2026-10-13T17:03:00Z
- **Completed:** 2026-10-13T17:15:00Z
- **Tasks:** 3/3
- **Files modified:** 18

## Accomplishments
- 6 admin-seitige Einstiegspunkte (`VersionRow.tsx`, `episodes/.../versions/page.tsx`, `UserMediaTab.tsx`, `fansubs/.../reviews/.../page.tsx`, `fansubEditAccess.ts`, `ReleaseVersionMediaDrawerSummary.tsx`) zeigen jetzt auf `/releases/:id/edit`; `fansubEditAccess.ts`'s `releaseVersionToolsTarget()` spricht die vereinheitlichte Tab-Vokabular `"notes"` statt `"notizen"`.
- 5 Workspace-seitige Einstiegspunkte (`page.tsx` Projekt-Gruppenansicht, `AttentionSection.tsx`, `attentionHelpers.ts`'s `resolveWorkspaceHref`, `ContributionCard.tsx`, `AnimeGroupCard.tsx`) zeigen jetzt auf `/releases/:id/edit` statt `/me/releases/:id/workspace` -- Tab-IDs `segments`/`notes` blieben unverändert, da bereits identisch zwischen alter und neuer Vokabular.
- 7 Testdateien mit wörtlichen Alt-URL-Assertions aktualisiert (`UserMediaTab.test.tsx`, `page.test.tsx` der Fansub-Edit-Route inkl. 2 "notizen"->"notes"-Tab-ID-Übersetzungen, `page.test.tsx` der Projekt-Gruppenansicht, `attentionHelpers.test.ts`, `AttentionSection.test.tsx`, `ContributionCard.test.tsx`); `AnimeGroupCard.test.tsx` und `reviews/[reviewId]/page.test.tsx` hatten wie recherchiert 0 passende Assertions.
- Der bestätigt tote "Version bearbeiten"-Link in `EpisodeEditForm.tsx` entfernt (Nachbar-Links "Gruppe bearbeiten"/"Im Versionsbrowser" unberührt) -- `EpisodeManager.tsx` hat laut `grep -rln "EpisodeManager/EpisodeManager" app/` null Importer unter `frontend/src/app/`.
- Volle Regression grün: `npx tsc --noEmit` 0 Fehler, `npm run lint` 6 vorbestehende Fehler/228 vorbestehende Warnungen (identisch zur 181-07-Baseline, keine neuen Befunde in den 18 geänderten Dateien), voller `npm run test` 395/396 Dateien, 3623/3626 Tests grün (1 übersprungene Datei, 3 todo -- keine Fehlschläge, auch das in 181-07 isoliert beobachtete Last-Flackern trat diesmal nicht auf).
- Repo-weiter Grep bestätigt: ausserhalb der beiden alten Routenordner (die Plan 09 löscht) und 3 erwarteten Ausnahmen (Plan 02's Redirect-Konfiguration `releaseEditorRedirects.ts`+Test, Backend-API-URLs in `lib/api/episodes.ts`, 2 reine Code-Kommentare) finden sich keine verbleibenden `/admin/episode-versions/` oder `/me/releases/.../workspace`-Literale mehr.

## Task Commits

1. **Task 1: 6 Admin-seitige Einstiegspunkte + fansubEditAccess Tab-Vokabular-Fix** - `84b48f2f` (feat)
2. **Task 2: 5 Workspace-seitige Einstiegspunkte** - `5ce7fa01` (feat)
3. **Task 3: Toter Link entfernt + repo-weite Regression** - `579a8028` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx` - `router.push` Ziel aktualisiert
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx` - `href` aktualisiert
- `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` + `.test.tsx` - `href` + Assertion aktualisiert
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` - `href` aktualisiert
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts` - Tab-Vokabular + `href`-Template aktualisiert
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` - 7 Assertion-Stellen aktualisiert (Pfad + Tab-ID)
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx` - `href`-Pfadpräfix aktualisiert
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` + `.test.tsx` - `href` + Assertion aktualisiert
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` + `.test.tsx` - `href` + 5 Assertion-Stellen aktualisiert
- `frontend/src/app/me/dashboard/components/attentionHelpers.ts` + `.test.ts` - `resolveWorkspaceHref` + 2 Assertion-Stellen aktualisiert
- `frontend/src/components/contributions/ContributionCard.tsx` + `.test.tsx` - `href` + Assertion aktualisiert
- `frontend/src/components/contributions/AnimeGroupCard.tsx` - `href` aktualisiert
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` - toter Link-Block entfernt

## Decisions Made
- Siehe `key-decisions` im Frontmatter: keine Plan-Abweichungen nötig; `releaseEditorRedirects.ts` und `lib/api/episodes.ts` bewusst unangetastet gelassen (ausserhalb des Scopes dieses Plans, siehe Begründung oben).

## Deviations from Plan

None - plan executed exactly as written. Alle 11 `<interfaces>`-Einträge trafen exakt zu (Zeilennummern, String-Literale, Tab-ID-Übersetzungen); der 1 Dead-Code-Fund entsprach exakt RESEARCH.md Pitfall 1.

## Issues Encountered

None. Der in 181-07 beobachtete isolierte Last-Timeout in `AchievementBadgeShowcase.test.tsx` trat in diesem vollen Suite-Lauf nicht erneut auf (bestätigt als reines Last-Flackern, keine Regression dieser Phase).

## User Setup Required

None - keine externe Service-Konfiguration nötig. Frontend-Container wurde nach den Änderungen neu gestartet (`docker restart team4sv30-frontend`).

## Next Phase Readiness
- Alle 11 realen Einstiegspunkte erreichen `/releases/[versionId]/edit` direkt; der 1 bestätigt tote Link ist entfernt.
- Die beiden Altseiten (`EpisodeVersionEditorPage.tsx` unter `/admin/episode-versions/[versionId]/edit`, `workspace/page.tsx` unter `/me/releases/[versionId]/workspace`) bleiben unverändert und weiterhin direkt erreichbar (noch nicht gelöscht) -- Plan 09 aktiviert die bereits in Plan 02 vorbereiteten Redirects und löscht beide Altseiten.
- Keine Blocker für Plan 09.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle 18 geänderten Dateien plus diese SUMMARY.md auf der Festplatte gefunden;
alle 3 Task-Commits (`84b48f2f`, `5ce7fa01`, `579a8028`) im Git-Log gefunden.
