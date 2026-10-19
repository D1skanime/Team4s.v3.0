---
phase: 261019-lcz-anime-detailseite-weicher-hintergrundbil
plan: 01
subsystem: frontend
tags: [anime-detail, backdrop-rotation, crossfade, theme-video, ui-polish]
dependency-graph:
  requires: []
  provides:
    - "AnimeBackdropRotator.logic.ts (pure rotation/preload decision functions)"
    - "Two-layer opacity crossfade backdrop rendering on /anime/:id"
    - "Soft video-to-image fade at theme video natural end"
  affects:
    - "frontend/src/components/anime/AnimeBackdropRotator.tsx"
    - "frontend/src/components/anime/AnimeBackdropRotator.module.css"
tech-stack:
  added: []
  patterns:
    - "Opacity crossfade between two persistent DOM layers instead of swapping background-image (which does not interpolate)"
    - "Mandatory new Image()+.decode() preload before swap-in, with a monotonically increasing token ref to discard stale/late results (including after unmount)"
    - "React key bump (slotGenerations) to force CSS animation restart (Ken-Burns) per new image in a given slot"
    - "prefers-reduced-motion: reduce shortens transitions to 150ms and disables the zoom animation"
key-files:
  created:
    - frontend/src/components/anime/AnimeBackdropRotator.logic.ts
    - frontend/src/components/anime/AnimeBackdropRotator.logic.test.ts
  modified:
    - frontend/src/components/anime/AnimeBackdropRotator.tsx
    - frontend/src/components/anime/AnimeBackdropRotator.module.css
decisions:
  - "Used refs (slotsRef/visibleSlotIndexRef) mirroring the slots/visibleSlotIndex state as the read source inside preloadAndSwap, instead of nested functional setState callbacks, because the two state pieces are mutually dependent and a plain functional updater on only one of them cannot safely read the latest value of the other."
metrics:
  duration: "~35min"
  completed: "2026-10-19"
---

# Phase 261019-lcz Plan 01: Weicher Hintergrundbild-Crossfade auf der Anime-Detailseite Summary

Zwei-Ebenen-Opacity-Crossfade (~1.5s) mit Preload+Decode-Pflicht, dezentem Ken-Burns-Zoom und weichem Video-Ende-Uebergang ersetzt das harte `background-image`-Umschalten in `AnimeBackdropRotator`.

## What Was Built

- **`AnimeBackdropRotator.logic.ts`** (neu): drei reine, DOM-freie Funktionen -- `getNextBackdropIndex` (Rotations-Index mit Wrap-Around und Guard gegen `totalCount <= 0`), `canSwapInPreloadedBackdrop` (benannter Entscheidungspunkt "nur bei Vorlade-Erfolg einblenden"), `resolveBackdropSlotsAfterPreload` (Slot-Swap-Resultat inkl. Fehlerfall-Fallback: aktuelles Bild bleibt stehen).
- **`AnimeBackdropRotator.logic.test.ts`** (neu): 11 Vitest-Unit-Tests, direkt gegen die drei Funktionen, keine Render-Simulation.
- **`AnimeBackdropRotator.tsx`**: zwei persistente Bild-Ebenen (Slot a/b, stabile `key="a"`/`key="b"`) mit Opacity-Crossfade statt einer einzelnen `.image`-Div. Jeder Bildwechsel (initial + alle 9s) laeuft ueber `preloadAndSwap` -- `new Image()` + `await img.decode()` vor dem Einblenden, mit Token-Race-Guard (`preloadTokenRef`), der veraltete/nach-Unmount aufloesende Preloads verwirft. Theme-Video-Ende (`onEnded`) setzt jetzt `isThemeVideoEnding` und verzoegert den eigentlichen Ausbau um 600ms (`handleThemeVideoNaturalEnd`); der bestehende sofortige Navigations-Stopp (`stopThemeVideoPlayback` bei pointerdown/keydown/pagehide) ist unveraendert und setzt `isThemeVideoEnding` nicht.
- **`AnimeBackdropRotator.module.css`**: `.image`-Klasse entfernt (inkl. der wirkungslosen `transition: background-image`), ersetzt durch `.backdropLayer` (Opacity-Crossfade, 1500ms) + `.backdropLayerZoom` (Ken-Burns-Keyframes, 9000ms) + `.video[data-theme-video-state="ending"]` (Opacity-Fade, 600ms) + `@media (prefers-reduced-motion: reduce)`-Block (Transitions auf 150ms, Zoom-Animation aus).

## Data-Attribute fuer Live-Verifikation

- `div[data-backdrop-slot="a"]` / `div[data-backdrop-slot="b"]` -- die beiden persistenten Bild-Ebenen
- `data-backdrop-visible="true"|"false"` -- welche Ebene aktuell eingeblendet ist
- `video[data-theme-video-state="playing"|"ending"]` -- Video-Fade-Status am natuerlichen Ende

## Anime-IDs fuer die Live-Pruefung (ermittelt via `GET /api/v1/anime/:id/backdrops`)

- **Anime-ID 1**: 4 Backdrops (`provider: "persisted"`) UND 1 Theme-Video -- deckt sowohl Rotation als auch Video-Ende-Uebergang ab.
  ```
  curl http://192.168.235.196:18092/api/v1/anime/1/backdrops
  ```
  -> `backdrops: 4`, `theme_videos: 1`
- Weitere Kandidaten mit mehreren Backdrops: Anime-ID 2 (7 Backdrops, 1 Theme-Video), Anime-ID 11 (5 Backdrops, 1 Theme-Video).
- Browser-URL fuer die Live-Pruefung (ueber den SSH-Tunnel): `http://127.0.0.1:3300/anime/1`

## Verification Done (Tasks 1-3)

- `AnimeBackdropRotator.logic.test.ts`: 11/11 Tests GREEN.
- Volle Frontend-Testsuite im Container: 392 Testdateien, 3627 Tests GREEN (1 Datei/3 Tests skipped, vorbestehend unabhaengig von diesem Plan).
- `npx tsc --noEmit`: ein vorbestehender, nicht von diesem Plan verursachter Fehler (`AnimePageProps`/`PageProps` in generiertem `.next/dev/types/app/anime/page.ts`, aus `frontend/src/app/anime/page.tsx`, von diesem Plan nicht beruehrt) -- dokumentiert in `deferred-items.md`.
- `npm run lint`: 4 vorbestehende Fehler, keiner in von diesem Plan beruehrten Dateien (`capture-responsive.cjs`, React-Compiler-Memoization-Hinweis, `CapabilityDetailRow.tsx`) -- dokumentiert in `deferred-items.md`.
- `wc -l`: `AnimeBackdropRotator.tsx` = 311 Zeilen, `AnimeBackdropRotator.module.css` = 136 Zeilen -- beide <= 450.
- `docker restart team4sv30-frontend` ausgefuehrt; `curl -sI http://192.168.235.196:3000/` -> `200 OK`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] Refs statt verschachtelter funktionaler setState-Updater fuer slots/visibleSlotIndex**
- **Found during:** Task 2, Schritt 4 (`preloadAndSwap`)
- **Issue:** Der Plan schlug "funktionale setState-Form mit `prev`" vor, um Stale-Closures bei `slots`/`visibleSlotIndex` zu vermeiden. Da `resolveBackdropSlotsAfterPreload` aber BEIDE Werte gleichzeitig braucht und sie in zwei getrennten `useState`-Aufrufen liegen, kann ein funktionaler Updater fuer `slots` nicht sicher den aktuellen `visibleSlotIndex`-Wert lesen (und umgekehrt) ohne Seiteneffekte im Updater selbst.
- **Fix:** `slotsRef`/`visibleSlotIndexRef` als Refs eingefuehrt, die bei jedem erfolgreichen Resolve-Schritt synchron mit den State-Werten aktualisiert werden. `preloadAndSwap` liest aus den Refs (immer aktuell, nie stale) statt aus den React-State-Closures.
- **Files modified:** `frontend/src/components/anime/AnimeBackdropRotator.tsx`
- **Commit:** `890d6db4d`

### Out-of-scope findings (logged, not fixed)

Siehe `.planning/quick/261019-lcz-anime-detailseite-weicher-hintergrundbil/deferred-items.md`:
- Vorbestehender `tsc`-Fehler in generiertem `.next/dev/types/app/anime/page.ts` (unabhaengig von `AnimeBackdropRotator`).
- 4 vorbestehende Lint-Fehler in unberuehrten Dateien (`capture-responsive.cjs`, React-Compiler-Hinweis, `CapabilityDetailRow.tsx`).

## Known Stubs

None.

## Threat Flags

None -- `preloadImage`/`preloadAndSwap` laden ausschliesslich bereits vom Backend gelieferte, im Manifest enthaltene Bild-URLs vor (kein neuer Netzwerk-Endpunkt, keine neue Angriffsflaeche); siehe Threat-Register im Plan (`T-261019lcz-01`, Disposition `accept`).

---

## Task 4 (checkpoint:human-verify) -- PENDING live user verification

Dieser Plan enthaelt einen blockierenden Live-Checkpoint (Task 4), der vom Nutzer im Browser bestaetigt werden muss. Die automatisierte Ausfuehrung (Tasks 1-3) ist abgeschlossen; **dieser Plan ist NICHT als vollstaendig "approved" markiert**, bis der Nutzer die folgenden Schritte live durchgefuehrt und bestaetigt hat.

**What was built:** Weicher Crossfade (opacity, ~1.5s) zwischen Hintergrundbildern statt hartem Umspringen, Vorladen vor jedem Bildwechsel, dezenter Ken-Burns-Zoom, und ein weicher Opacity-Uebergang vom Theme-Video zum Bild am natuerlichen Video-Ende. Der sofortige Audio-Stopp bei Navigation (gestriger Fix, Quick 261019-kq9) ist unveraendert.

**How to verify (exact steps from the plan):**

1. Im Browser (ueber den SSH-Tunnel `http://127.0.0.1:3300`) die Anime-Detailseite `http://127.0.0.1:3300/anime/1` (4 Backdrops + 1 Theme-Video, siehe oben) oeffnen und ca. 30-40 Sekunden beobachten: der Bildwechsel alle 9s soll weich ueberblenden (kein hartes Umspringen, keine kurze leere/dunkle Flaeche), und das sichtbare Bild soll sich sehr langsam leicht vergroessern (Ken-Burns).
2. Falls das Theme-Video auf dieser Seite laeuft: das natuerliche Ende abwarten -- der Uebergang zum Bild soll weich sein, nicht hart.
3. Regressionscheck (gestriger Fix): "Ton aktivieren" klicken, dann auf eine andere Anime-Karte/Relation klicken, WAEHREND das Video noch laeuft -- der Ton muss sofort stoppen, OHNE auszublenden (kein verzoegertes Ausklingen beim Navigations-Stopp).
4. In den Browser-DevTools (Elements-Tab) die zwei `div[data-backdrop-slot]`-Elemente und deren `data-backdrop-visible`-Attribut beobachten, um den Opacity-Wechsel nachzuvollziehen, falls gewuenscht.
5. Optional: unter DevTools -> Rendering -> "Emulate CSS prefers-reduced-motion: reduce" pruefen, dass der Zoom komplett verschwindet und der Uebergang nahezu instant wird.

**Resume signal:** Antworte mit "approved" oder beschreibe das beobachtete Problem (z.B. "immer noch Flackern bei X" oder "Zoom zu stark").

**Status: AWAITING LIVE USER VERIFICATION -- not yet approved.**

## Self-Check: PASSED

- FOUND: frontend/src/components/anime/AnimeBackdropRotator.logic.ts
- FOUND: frontend/src/components/anime/AnimeBackdropRotator.logic.test.ts
- FOUND: frontend/src/components/anime/AnimeBackdropRotator.tsx
- FOUND: frontend/src/components/anime/AnimeBackdropRotator.module.css
- FOUND commit: 3b5466357
- FOUND commit: 890d6db4d
