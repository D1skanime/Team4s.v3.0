# Deferred Items (Quick Task 261106-hlj)

Während `npm run lint` in Task 3 (Dokumentation + Verifikation) festgestellt: 4 vorbestehende
Lint-Fehler, die NICHT durch diesen Auftrag verursacht wurden und außerhalb des Scope dieser
drei Tasks liegen (Scope-Boundary-Regel: nur Fehler direkt verursacht durch die eigenen
Dateiänderungen werden automatisch gefixt). Keine der betroffenen Dateien wurde in diesem
Auftrag berührt.

1. `capture-responsive.cjs:1,2` -- `@typescript-eslint/no-require-imports` (`require()`-Import
   in einem Root-Skript, zuletzt am 2026-10-20 geändert).
2. `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249` --
   React-Compiler-Fehler "Compilation Skipped: Existing memoization could not be preserved"
   (abweichende Abhängigkeitsliste zwischen manuellem `useMemo` und Compiler-Inferenz).
3. `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx:69` -- natives
   `<input>` statt des globalen `Input`-Primitivs (`no-restricted-syntax`).

Alle drei sind vorbestehend und unabhängig von den in diesem Auftrag neu angelegten Dateien
(`BildKatalogShowcase.*`, `storybookBildKatalog.ts`, `docs/FRONTEND_ARCHITEKTUR.md`). Nicht
gefixt, da außerhalb des Scope dieses Quick-Tasks -- zur Nachbesserung in einem eigenen Auftrag
vorgesehen.
