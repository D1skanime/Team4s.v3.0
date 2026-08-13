# Deferred Items — Phase 111

Ausserhalb des Scope von Plan 111-03 gefundene, bereits vor dieser Session bestehende
Test-Fehlschläge (Scope Boundary: nur Probleme, die direkt durch die aktuellen
Task-Änderungen verursacht werden, werden automatisch behoben; Pre-existing-Fehler in
unberührten Dateien werden hier nur geloggt).

## Plan 111-03 (2026-07-28) — `npm test` Vollsuite-Lauf

Vollständiger `cd frontend && npm test`-Lauf (210 Testdateien, 1383 Tests) zeigt:
- **5 Testdateien fehlgeschlagen**, 204 bestanden, 1 übersprungen
- **11 Tests fehlgeschlagen**, 1369 bestanden, 3 todo

Vollständige Liste der 5 fehlgeschlagenen Dateien (11 Tests, aus zwei unabhängigen
Volltest-Läufen reproduzierbar identisch: 5 failed/204 passed/1 skipped Dateien,
11 failed/1369 passed/3 todo Tests):

1. `src/components/contributions/ReportModal.test.tsx` (5 Tests) — "ReportModal target
   context"-Suite (Claim-Peer-Option, Anime-Targets in Story-/Medien-Formular,
   vorbefüllter Contribution-Target, numerischer Fallback ohne bekannte Targets).
2. `src/app/admin/anime/page.test.tsx` (3 Tests) — Anime-Übersicht-Shell, Live-Create-CTA,
   Edit-/Public-Aktionen-Liste, Erfolgsbestätigung nach Create-Rückkehr.
3. `src/app/fansubs/__tests__/publicPageWidthContract.test.ts` (1 Test) — Desktop-Breiten-
   Contract zwischen Projekt-/Release-Seiten oberhalb Mobile.
4. `src/app/me/profile/page.test.tsx` (1 Test) — "reuses the retained background source
   when editing the existing crop" (Crop-Dialog/fetchMock-Assertion).
5. `src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` (1 Test) — "counts a
   Jellyfin cover as the required create cover when no manual cover was staged": erwartet
   absolute URL `http://localhost:8092/api/admin/jellyfin/assets/cover/series-42`, erhält
   relativen Pfad `/api/admin/jellyfin/assets/cover/series-42` (vermutlich Umgebungs-/
   Basis-URL-Drift).

Alle 5 Dateien liegen nachweislich ausserhalb des Scopes dieses Plans: keine davon liegt
in `frontend/src/app/admin/users/**` oder `frontend/src/app/admin/role-capabilities/**` —
der gezielte Lauf `npx vitest run src/app/admin/users --reporter=dot` war durchgehend
11/11 grün (mehrfach reproduziert, unabhängig von den beiden Volltest-Läufen).

**Keine Code-Änderung vorgenommen** — ausserhalb des Scopes von `files_modified` in
`111-03-PLAN.md` (`AdminUsersClient.tsx`, `useUserListFilters.ts`,
`AdminUsers.module.css`, `page.test.tsx`, `AdminUsersClient.test.tsx`).

**Empfehlung:** Eine eigene Quick-Task (analog zu bestehenden `remediate-*`-Mustern)
könnte die 11 Fehlschläge in den 5 oben gelisteten Dateien beheben, sobald die
Fansub-Verwaltungsseiten-Phase 111 abgeschlossen ist.

## Plan 111-05 (2026-07-28) — `npx vitest run` Vollsuite-Lauf, Bestätigung

Vollständiger Volltest-Lauf (213 Testdateien, 1395 Tests) nach Task 2 (GREEN) zeigt exakt
dieselbe Fehlermenge wie oben dokumentiert: **5 Testdateien fehlgeschlagen**, 207 bestanden,
1 übersprungen; **11 Tests fehlgeschlagen**, 1381 bestanden, 3 todo. Stichprobenprüfung der
Fehlerdetails (Crop-Dialog-Test in `me/profile/page.test.tsx`, absolute-vs-relative-URL-Test
in `useAdminAnimeCreateController.test.ts`) bestätigt identische Symptome zum 111-03-Eintrag.

Der gezielte Lauf `npx vitest run src/app/admin/role-capabilities --reporter=dot` war
durchgehend 28/28 grün — die 5 Plan-111-05-Zieldateien
(`RoleMasterList.tsx`, `RoleMasterList.test.tsx`, `RoleCapabilityClient.tsx`,
`RoleCapabilityClient.test.tsx`, `page.tsx`) sind nicht Teil der 5 fehlgeschlagenen Dateien.
**Keine Code-Änderung vorgenommen** — bestätigt reine Pre-existing-Fehlermenge, unverändert
seit Plan 111-03.
