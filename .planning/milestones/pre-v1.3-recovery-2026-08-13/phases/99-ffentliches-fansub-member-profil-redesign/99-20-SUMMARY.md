---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "20"
subsystem: web
tags: [nextjs, react, typescript, fansub, vitest]

# Dependency graph
requires:
  - phase: 99 (Add-on 6, Plan 99-19)
    provides: Backend liefert PublicFansubProfileResponse.Stories[] statt Story
provides:
  - PublicFansubProfile.stories[] als TS-Konsumentenvertrag (page.tsx, FansubStorySection, FansubStoryBlock)
  - FansubStoryBlock als eigenstaendige Client-Komponente (per-Block-Clamp)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Server-Wrapper-Komponente + Client-Block-Komponente fuer gestapelte Inhalte mit individuellem Clamp"]

key-files:
  created:
    - frontend/src/components/fansubs/FansubStoryBlock.tsx
    - frontend/src/components/fansubs/FansubStoryBlock.module.css
    - frontend/src/components/fansubs/__tests__/FansubStoryBlock.test.tsx
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx
    - frontend/src/app/fansubs/__tests__/page.test.tsx
    - frontend/src/components/fansubs/FansubStorySection.tsx
    - frontend/src/components/fansubs/FansubStorySection.module.css
    - frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx

key-decisions:
  - "hasStoryContent (Singular, Story|null) wurde zu hasStoriesContent (Array, .some()) umgebaut statt eine Signatur-Ueberladung zu behalten -- klarer Name verhindert Verwechslung mit der unveraenderten hasStoryContent-Funktion auf der unabhaengigen Anime-Gruppenseite (/anime/[id]/group/[groupId], legacy group.story-Feld, ausserhalb des Scope-Fence)."
  - "FansubStorySection wurde von Client- zu Server-Komponente umgebaut (kein 'use client' mehr): sie enthaelt keinen eigenen State/Effekt mehr, nur Filter+Map; das Clamp-/Overflow-Verhalten wanderte vollstaendig in die neue Client-Komponente FansubStoryBlock."
  - "Clamp-CSS-Klassen (storyContentClamped/storyContentExpanded/toggle) wurden 1:1 von FansubStorySection.module.css nach FansubStoryBlock.module.css verschoben (Ownership folgt der Komponente, die sie nutzt); FansubStorySection.module.css enthaelt nur noch die neue storyStack-Gap-Klasse."
  - "Backend-Container wurde waehrend der Ausfuehrung neu gebaut (docker compose up -d --build team4sv30-backend), da 99-19 den Rebuild wegen nicht erreichbarem Docker-Daemon nicht durchfuehren konnte -- ohne den Rebuild haette der 99-20-Frontend-Code (stories[]) live gegen ein Backend gelaufen, das noch story (Singular) liefert."

patterns-established:
  - "Gestapelte Mehrfach-Inhalte mit individuellem Clamp: Server-Wrapper filtert/mapped, jede Karte/jeder Block ist eine eigene 'use client'-Komponente mit eigenem ResizeObserver-Overflow-State."

requirements-completed: ["AO6-03", "AO6-05", "AO6-04"]

# Metrics
duration: ca. 45min
completed: 2026-07-09
---

# Phase 99 Plan 20: Frontend-Migration story -> stories[] + Mehrfach-Geschichts-Bloecke Summary

**Frontend der öffentlichen Fansub-Profilseite komplett auf das neue `stories[]`-DTO (Plan 99-19) migriert: TS-Typ, `page.tsx`-Konsumenten und die Geschichte-Sektion rendern jetzt alle veröffentlichten Blöcke gestapelt, jeder mit eigenem Titel und eigenem Clamp, unter genau einem Sektions-Header.**

## Performance

- **Duration:** ca. 45 min
- **Started:** 2026-07-09T~09:05:00Z
- **Completed:** 2026-07-09T~09:50:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 7 modifiziert, 3 neu erstellt (10 gesamt)

## Accomplishments

- **AO6-03 (TS-Migration story -> stories[]):** `PublicFansubProfile.story: PublicFansubStory | null` wurde durch `stories: PublicFansubStory[]` ersetzt (`frontend/src/types/fansub.ts`). In `page.tsx` wurde `hasStoryContent(story)` zu `hasStoriesContent(stories)` umgebaut (`stories.some((s) => Boolean(...))`), `buildEmptyAreaLabels` pusht „Geschichte" nur wenn kein Block Inhalt hat, `storyAvailable` und das Rendering (`<FansubStorySection group={group} stories={profile.stories} />`) nutzen konsistent das Array. Kein Konsument referenziert mehr `profile.story` (Singular) — per Grep bestätigt (`grep -c "profile.story\b"` = 0).
- **AO6-05 (Mehrere Geschichts-Blöcke gerendert):** `FansubStorySection` wurde zu einer reinen Server-Wrapper-Komponente (kein `'use client'` mehr) umgebaut: sie filtert Blöcke ohne jeglichen Inhalt heraus und mappt die verbleibenden auf die neue Client-Komponente `FansubStoryBlock` in Array-Reihenfolge (`sort_order` kommt bereits sortiert vom Backend, Plan 99-19). Jeder Block behält sein eigenes Clamp-/Overflow-Verhalten (ResizeObserver-Messung, „Mehr anzeigen"/„Weniger anzeigen" via `@/components/ui` `Button`).
- **AO6-04 (ein klarer Sektions-Header):** `FansubStorySection` rendert genau einen `<SectionHeader title="Geschichte" />` ohne Eyebrow; die Blöcke selbst tragen nur ihren eigenen `<h3>`-Titel, keinen zusätzlichen Sektions-Header.
- Die bisherigen Clamp-CSS-Klassen wurden von `FansubStorySection.module.css` nach `FansubStoryBlock.module.css` verschoben (Ownership-Wechsel zur Komponente, die sie tatsächlich nutzt); `FansubStorySection.module.css` enthält jetzt nur noch `storyStack` (Gap zwischen gestapelten Blöcken).
- Alle betroffenen Tests (`pageHelpers.test.tsx`, `page.test.tsx`, `FansubStorySection.test.tsx`, neu `FansubStoryBlock.test.tsx`) wurden migriert bzw. neu geschrieben und sind grün; `npm run typecheck` ist fehlerfrei.
- **Rule-3-Fix (Blocker):** Der Backend-Container (`team4sv30-backend`) lief zum Ausführungszeitpunkt noch auf einem vor Plan 99-19 gebauten Image und lieferte weiterhin `story` (Singular) statt `stories[]` — Plan 99-19 konnte den Rebuild nicht durchführen, da Docker damals nicht erreichbar war. Da dieser 99-20-Plan explizit einen Live-Check über `:3000` verlangt und der neue Frontend-Code sonst gegen ein inkompatibles Backend gelaufen wäre (Runtime-Fehler, da `profile.stories` `undefined` gewesen wäre), wurde `docker compose up -d --build team4sv30-backend` ausgeführt. Danach lieferte der Endpunkt `stories[]` mit den 2 echten Seed-Blöcken der Gruppe „C-Subs".

## Task Commits

Each task was committed atomically:

1. **Task 1: TS-Typ + page.tsx-Konsumenten auf stories[] migrieren (AO6-03)** - `11d48158` (feat)
2. **Task 2: FansubStorySection (Server-Wrapper) + FansubStoryBlock (per-Block-Clamp) rendern alle Blöcke (AO6-05/04)** - `5308865b` (feat)

## Files Created/Modified

- `frontend/src/types/fansub.ts` - `PublicFansubProfile.story` (Singular) durch `stories: PublicFansubStory[]` ersetzt
- `frontend/src/app/fansubs/[slug]/page.tsx` - `hasStoryContent` → `hasStoriesContent` (Array-`.some()`), `buildEmptyAreaLabels`/`storyAvailable`/Rendering auf `profile.stories` umgestellt
- `frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx` - Fixtures/Testfälle von `story`/`hasStoryContent` auf `stories`/`hasStoriesContent` migriert
- `frontend/src/app/fansubs/__tests__/page.test.tsx` - Assertion ergänzt, dass die Seite `stories={profile.stories}` übergibt
- `frontend/src/components/fansubs/FansubStorySection.tsx` - jetzt Server-Komponente; filtert `stories[]` auf Blöcke mit Inhalt, rendert einen `SectionHeader` + Map auf `FansubStoryBlock`
- `frontend/src/components/fansubs/FansubStorySection.module.css` - Clamp-Klassen entfernt (verschoben), nur noch `storyStack`-Gap
- `frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx` - Fixtures auf `stories`-Prop umgestellt (Mehrblock-Reihenfolge, Skip leerer Blöcke, leeres Array → null)
- `frontend/src/components/fansubs/FansubStoryBlock.tsx` (neu) - Client-Komponente: ein Geschichts-Block mit Titel, RichTextRenderer/Fallback-Text, ResizeObserver-Clamp-Umschalter
- `frontend/src/components/fansubs/FansubStoryBlock.module.css` (neu) - Clamp-Klassen (übernommen aus der alten FansubStorySection.module.css)
- `frontend/src/components/fansubs/__tests__/FansubStoryBlock.test.tsx` (neu) - Titel+Inhalt-Rendering, Null-Rendering bei leerem Block

## Decisions Made

- `hasStoryContent` (Singular) wurde zu `hasStoriesContent` (Array) umbenannt statt eine kompatible Überladung zu erhalten — der alte Name bleibt unverändert und unabhängig auf der Anime-Gruppenseite (`/anime/[id]/group/[groupId]/page.tsx`) bestehen, wo `group.story` ein anderes, unverändertes Legacy-Feld ist (außerhalb des Scope-Fence dieses Plans).
- `FansubStorySection` verlor `'use client'` und wurde zur reinen Server-Wrapper-Komponente; das gesamte Clamp-/Overflow-State-Management wanderte 1:1 in die neue Client-Komponente `FansubStoryBlock`.
- Backend-Container wurde neu gebaut, um die Live-Verifikation dieses Plans überhaupt sinnvoll durchführen zu können (siehe Rule-3-Fix oben).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Backend-Container lieferte noch `story` (Singular) statt `stories[]`**
- **Found during:** Live-Verifikation nach Task 2 (`docker ps` zeigte laufenden Backend-Container, curl gegen `/api/v1/fansub-slugs/c-subs/public-profile` lieferte `story`, nicht `stories`)
- **Issue:** Plan 99-19 konnte den Backend-Container wegen nicht erreichbarem Docker-Daemon nicht neu bauen; der laufende Container basierte noch auf dem Pre-99-19-Image.
- **Fix:** `docker compose up -d --build team4sv30-backend` ausgeführt; danach lieferte der Endpunkt `stories[]` mit den erwarteten 2 Seed-Blöcken.
- **Files modified:** Keine Code-Dateien (nur Docker-Image-Rebuild, keine Quelländerung nötig — der Go-Code aus 99-19 war bereits korrekt).
- **Commit:** Kein Code-Commit nötig (Infrastruktur-Rebuild, kein Repo-Diff).

### Sonstige Beobachtung

Keine weiteren Abweichungen — beide Tasks wurden wie im Plan beschrieben umgesetzt.

**Total deviations:** 1 Rule-3-Fix (Backend-Rebuild, kein Code-Diff); 0 Rule-1/2/4-Fixes.
**Impact on plan:** Keiner auf den Code-Umfang — die Live-Verifikation war ohne den Rebuild nicht aussagekräftig durchführbar.

## Live-Verifikation

Docker war erreichbar (`docker ps` zeigte alle Team4s-Container). Durchgeführt:

1. `docker restart team4sv30-frontend` (Frontend-Container neu gestartet, damit der neue Code aktiv ist — Live-Dev-Server-Konvention aus Projektspeicher).
2. `docker compose up -d --build team4sv30-backend` (siehe Deviation oben — Backend war stale).
3. `curl http://localhost:18092/api/v1/fansub-slugs/c-subs/public-profile` — Response enthält jetzt `stories` (Array, 2 Einträge: „Die Geschichte der Fansubgruppe C-Subs" und „Goodbye-Nachricht von C-Subs"), kein `story`-Feld mehr.
4. `curl http://localhost:3000/fansubs/c-subs` (HTTP 200) — HTML enthält beide Story-Titel, genau **ein** `id="geschichte"`-Vorkommen und genau **ein** „Geschichte"-Sektions-Header-Text-Vorkommen. Reihenfolge im Markup: erster Block vor zweitem Block (sort_order-Reihenfolge bestätigt).
5. Der „Mehr anzeigen"-Umschalter erscheint im server-gerenderten HTML erwartungsgemäß nicht (die Overflow-Messung via `ResizeObserver`/`scrollHeight` läuft erst client-seitig nach der Hydration im echten Browser — dieses Verhalten ist identisch zum bisherigen Single-Block-Muster aus Add-on 5 und wurde dort bereits browser-seitig bestätigt). Eine echte Browser-Interaktionsprüfung (Klick auf „Mehr anzeigen"/„Weniger anzeigen" bei zwei Blöcken gleichzeitig) konnte in diesem Executor-Lauf mangels Browser-Tool nicht durchgeführt werden und steht als finale visuelle Freigabe beim Nutzer aus (analog zur bereits dokumentierten offenen visuellen Freigabe aus Plan 99-18).

## Issues Encountered

- Backend-Container war stale (siehe Deviation oben) — behoben durch Rebuild, kein offener Blocker mehr.
- Automatisierte Browser-Interaktionsprüfung (Klick-Verhalten des Clamp-Umschalters bei mehreren gleichzeitig sichtbaren Blöcken) war im Executor-Kontext nicht möglich; empfohlen als Teil der ausstehenden finalen visuellen Nutzer-Freigabe.

## User Setup Required

Keine externe Service-Konfiguration nötig. Empfohlen: kurzer manueller Blick auf `/fansubs/c-subs` im Browser, um das Klickverhalten von „Mehr anzeigen"/„Weniger anzeigen" bei beiden Geschichts-Blöcken visuell zu bestätigen (reine UX-Politur, kein Funktionsrisiko laut Code-/HTML-Verifikation oben).

## Next Phase Readiness

- Kein Frontend-Konsument referenziert mehr `profile.story` (Singular); Backend und Frontend sind jetzt konsistent auf `stories[]`.
- `FansubStoryBlock` ist als eigenständige, wiederverwendbare Client-Komponente etabliert und kann als Muster für weitere Add-on-6-Arbeiten (z. B. Medien-Lightbox, Karussell-Karten) referenziert werden.
- Add-on 6 Restarbeit (AO6-01/02/06 bis AO6-12: Banner-Karten, Karussell, Team-Layout, Meilenstein-Farbakzent, Community-Chips, Medien-Vorschau/Lightbox) bleibt für Folgepläne offen.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: frontend/src/types/fansub.ts
- FOUND: frontend/src/app/fansubs/[slug]/page.tsx
- FOUND: frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx
- FOUND: frontend/src/app/fansubs/__tests__/page.test.tsx
- FOUND: frontend/src/components/fansubs/FansubStorySection.tsx
- FOUND: frontend/src/components/fansubs/FansubStorySection.module.css
- FOUND: frontend/src/components/fansubs/FansubStoryBlock.tsx
- FOUND: frontend/src/components/fansubs/FansubStoryBlock.module.css
- FOUND: frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx
- FOUND: frontend/src/components/fansubs/__tests__/FansubStoryBlock.test.tsx
- FOUND commit: 11d48158 (feat, Task 1)
- FOUND commit: 5308865b (feat, Task 2)
