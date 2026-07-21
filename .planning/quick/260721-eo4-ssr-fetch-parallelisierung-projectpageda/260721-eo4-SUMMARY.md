---
phase: quick-260721-eo4
plan: 01
subsystem: frontend/anime-public-fansub-project
tags: [ssr, performance-structure, refactor, next-app-router]
requires: []
provides:
  - "Parallelisierte SSR-Ladefunktion loadPublicFansubProjectPageData (verhaltenserhaltend)"
affects:
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
tech-stack:
  added: []
  patterns:
    - "Nebenläufige, fehlerisolierte SSR-Fetches via Promise.all mit Per-Branch-try/catch"
    - "Ein geteiltes Profil-Promise als Quelle für canonicalProjectPath UND Projekt-Navigation"
key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
decisions:
  - "Phase A (getGroupDetail + getAnimeByID, 404->not-found, null/Fehler->error) bleibt unverändert und läuft weiterhin ZUERST vor Phase B."
  - "Profil-Fetch wird als ein gemeinsames Promise gestartet; canonicalProjectPath und fansubProjectNavigation leiten sich beide daraus ab (statt zwei getrennter Aufrufe)."
  - "Der Release-Vorschau-Block bleibt intern seriell (cursor -> detail) und leitet den canonicalProjectPath in einem eigenen try/catch ab, getrennt vom Release-Liste-Fetch."
  - "Kleine Helfer withFallback und resolveCanonicalProjectPath reduzieren serielle Boilerplate und halten die Fallback-Werte bit-identisch."
metrics:
  duration: "~15 min"
  completed: 2026-07-21
---

# Phase quick-260721-eo4 Plan 01: SSR-Fetch-Parallelisierung projectPageData Summary

Die Phase B von `loadPublicFansubProjectPageData` (~9 SSR-Fetches) wurde von weitgehend
seriell auf nebenläufig (`Promise.all`) umgestellt — bei bit-identischem beobachtbarem
Verhalten (gleiche Rückgabestruktur, gleiche not-found/error-Gates, gleiche Per-Branch-Fallbacks).

## Was umgesetzt wurde

- **Phase A unverändert:** Der Block Z. ~256–277 (`Promise.all([getGroupDetail, getAnimeByID])`,
  404→`not-found`, null/Fehler→`error`, danach `group`/`anime`) bleibt Zeichen für Zeichen gleich
  und läuft weiterhin ZUERST, vor jeglicher Phase-B-Arbeit.
- **Phase B parallelisiert:** Alle unabhängigen Fetches laufen jetzt in EINEM `Promise.all` mit
  je einer async-Closure pro Branch. Jede Branch behält ihr eigenes `try/catch` und liefert im
  Fehlerfall exakt den bisherigen Fallback (leere Arrays / `null` / Default-Objekte). Keine Branch
  wirft, daher rejectet `Promise.all` nie.
- **Branches:** Assets (→ Response|null), Releases (`getGroupReleases` per_page:100 + `getAnimeFansubs`
  mit verschachteltem Fallback auf nur `getGroupReleases`), Profil-abgeleitet (canonicalProjectPath +
  fansubProjectNavigation), Vorschau (release-list cursor → intern seriell release-detail),
  Contributors, Themes, ReleaseMedia, ProjectNote.
- **Doppelter Profil-Fetch zusammengeführt:** Statt zweier `getPublicFansubProfileBySlug`-Aufrufe
  (Ist-Code Z. 282 und Z. 380) gibt es jetzt EIN gemeinsames `profilePromise` (identischer Slug
  `group.fansub.slug?.trim()`). Sowohl `canonicalProjectPath` (via `resolveCanonicalProjectPath`)
  als auch `fansubProjectNavigation` (via `buildFansubProjectNavigation`) werden daraus abgeleitet.
- **Vorschau bleibt intern seriell:** cursor → detail (per Release-ID) mit eigenem `try/catch`→null;
  die canonicalProjectPath-Ableitung der Vorschau liegt in einem SEPARATEN `try/catch` vom
  Release-Liste-Fetch — ein Fetch-Fehler verwirft den Pfad nicht (wie im Ist-Code).
- **Hilfsfunktionen:** `withFallback<T>` (Fetch + Fallback) und `resolveCanonicalProjectPath`
  (Profil-Promise → Pfad), beide verhaltenserhaltend; genutzt von Profil- und Vorschau-Branch,
  damit der Pfad bit-identisch berechnet wird.
- **Return-Block ab Z. ~394 unverändert:** hasTeamContent, storyAvailable, hasReleases, hasThemes,
  hasMedia, navigationGroups, breadcrumbItems und alle Hero/Poster/Style-Ableitungen identisch.

## Verifikation

- `npx tsc --noEmit`: grün (exit 0).
- `npx vitest run "src/app/anime/[id]/group/[groupId]/page.test.tsx"`: 17/17 Tests grün.
- `npm run lint`: 0 Errors; nur vorbestehende Warnungen in fremden Dateien, keine neue Warnung
  in `projectPageData.ts`.
- Datei-Zeilenzahl: 489 → **487** (harte Grenze ≤489 eingehalten).

## Zeilenlimit-Hinweis

Die Datei sinkt von 489 auf 487 Zeilen und hält damit die harte Grenze (≤489) ein. Das
aspirative Ziel `<450` wird nicht erreicht: das Parallelisierungs-Gerüst (8-elementiges
`Promise.all`-Destructuring, isolierte Per-Branch-Closures inkl. der zusammengeführten
Profil-Ableitung) kostet strukturell Zeilen. Ein weiterer Abbau auf <450 wäre nur durch
aggressive Verdichtung/Datei-Split möglich gewesen — beides ist laut Plan ausgeschlossen
(keine funktionale Änderung, kein neuer Datei-Split). Bestehende deutsche Kommentare/Strings
wurden nicht umformuliert; keine Performance-Behauptung im Code/Commit.

## Deviations from Plan

None - Plan wurde exakt wie geschrieben ausgeführt (Phase B parallelisiert, Profil-Fetch
zusammengeführt, Vorschau intern seriell mit getrenntem try/catch, Rückgabekontrakt identisch).

## TTFB-/Laufzeit-Nachmessung (extern durch Orchestrator, Live :3000)

Gleiche Methodik vorher/nachher: 8 warme `no-store`-Dokument-Fetches von `/anime/1/group/1`,
Minimum = steady-state (Dev-Compile-Rauschen addiert nur Zeit). Frontend-Container nach dem
Commit neu gestartet + Route aufgewärmt.

| Kennzahl | Vorher | Nachher | Delta |
|---|---|---|---|
| TTFB (min von 8) | 319 ms | **221 ms** | −98 ms (~31%) |
| TTFB (median) | 775 ms | **267 ms** | −508 ms |
| Volldokument (min) | 616 ms | **371 ms** | −245 ms (~40%) |
| Volldokument (median) | 1969 ms | **465 ms** | −1504 ms |

Belege am Backend (Gin-Logs, ein frischer SSR-Render):
- Alle 12 Backend-Requests landen jetzt in **derselben Sekunde** (paralleler Burst) —
  vorher über ~2 s seriell verteilt.
- `fansub-slugs/:slug/public-profile` wird jetzt **1×** aufgerufen (explizit zusammengeführt).

Hinweis: Die median-Verbesserung ist teils Dev-Compile-Varianz; die faire steady-state-Zahl
ist der Min-zu-Min-Vergleich (TTFB −31%, Volldokument −40%).

## Commits

- `73a0e2f4` refactor(anime): parallelize public fansub project SSR loader phase B
  (nur `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts`)

## Self-Check: PASSED

- Datei vorhanden: frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts (487 Zeilen)
- Commit vorhanden: 73a0e2f4
- tsc / vitest (17/17) / lint alle grün
