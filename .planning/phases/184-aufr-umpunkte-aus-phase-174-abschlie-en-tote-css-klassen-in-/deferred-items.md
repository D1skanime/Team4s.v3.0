# Deferred Items — Phase 184

Out-of-scope issues discovered during execution, not fixed per Scope Boundary rule
(nicht durch die Änderungen dieser Pläne verursacht, daher nicht angefasst).

## 184-02

- **`frontend/src/types/__tests__/anime-detail-contract.test.ts` schlägt vorbestehend fehl**
  (unabhängig von 184-02, reproduzierbar auch isoliert `npx vitest run
  src/types/__tests__/anime-detail-contract.test.ts`, vor und nach den Änderungen dieses Plans
  identisch). Betrifft `shared/contracts/openapi.yaml` (anime-detail relation payload,
  `cover_image`/`relations`-Schema), komplett außerhalb des F-07-Scopes (Pagination/formatDate).
  Fehler: `expected '...type: object...' to contain '- cover_image'` — die Testdatei prüft
  offenbar eine Property-Reihenfolge/Position im OpenAPI-Schema, die sich durch eine spätere,
  unabhängige Phase verschoben hat. Nicht von 184-02 verursacht, nicht gefixt.
- **`frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` einmalig flaky
  beobachtet** in einem ersten vollständigen `vitest run` (unter hoher Systemlast durch mehrere
  parallel/nacheinander gestartete Testläufe während der Fehlersuche bei Hintergrundprozessen).
  In Isolation und im finalen sauberen vollständigen Lauf grün. Kein Code in diesem Plan
  berührt diese Datei. Nicht gefixt, da nicht reproduzierbar und außerhalb des Scopes.

## 184-09

- Voller `npx vitest run` nach Task 1 zeigt 3 vorbestehende Fehlschläge, keiner davon berührt
  die von diesem Plan geänderten Dateien: `src/components/profile/badgeArtwork.test.ts`
  (Suite-Fehler, benötigt `API_INTERNAL_URL` im Linux-Frontend-Compose-Service, hier nicht
  gesetzt), `src/components/ui/ResponsiveImage.config.test.ts` (Assertion zu erlaubten
  Remote-Hosts, unabhängig von CSS-Modul-Merges), `src/types/__tests__/anime-detail-contract.test.ts`
  (derselbe bereits unter 184-02 dokumentierte vorbestehende OpenAPI-Schema-Mismatch),
  `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (ENOENT beim Lesen
  von `/backend/internal/permissions/permissions.go` — Pfad nur im Docker-Container vorhanden,
  nicht in dieser Shell-Umgebung). Nicht gefixt, außerhalb des Scopes (ReleaseVersionNotesTab-Split
  + mergeCssModules-Migration berührt keine dieser Dateien).

## 184-06

- Voller `npx vitest run` nach Task 2 zeigt dieselben 4 bereits unter 184-09 dokumentierten
  vorbestehenden Fehler (`src/components/profile/badgeArtwork.test.ts`,
  `src/components/ui/ResponsiveImage.config.test.ts`,
  `src/types/__tests__/anime-detail-contract.test.ts`,
  `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts`), unverändert durch
  diesen Plan. Keiner berührt die 7 Dateien dieses Plans; alle Fansub-bezogenen Testdateien
  (u. a. `admin/fansubs/page.test.tsx`, `admin/fansubs/create/page.test.tsx`,
  `admin/fansubs/merge/fansubMergeScoring.test.ts`) sind grün. Nicht gefixt, außerhalb des Scopes.

## 184-05

- Voller `npx vitest run` nach Task 2 zeigte erneut den bereits oben dokumentierten
  vorbestehenden Fehler in `anime-detail-contract.test.ts` (unverändert, kein Code dieses Plans
  berührt `shared/contracts/openapi.yaml` oder die Testdatei) sowie einen einmaligen Timeout-Flake
  in `AchievementBadgeShowcase.test.tsx` (`renders every ordinary non-role badge as its current
  real production family stage`, 5000ms-Timeout unter Last des vollen Laufs) — in Isolation
  (`npx vitest run src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx`) grün. Kein
  Code dieses Plans berührt diese Datei. Beide außerhalb des Scopes, nicht gefixt.
