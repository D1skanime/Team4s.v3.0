---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 06
subsystem: frontend
tags: [nextjs, react, vitest, anime-detail, accessibility, chips]

# Dependency graph
requires:
  - phase: 160-01
    provides: "German-resolved anime.tags/genres from the public detail read (COALESCE, no extra query)"
  - phase: 160-05
    provides: "q-less /suche results for tag/genre-only URL states (frontend and backend)"
provides:
  - "Public Tags block on /anime/[id] (D-06/D-12-D-19): own divider, own empty-state suppression, alphabetical order trusted from backend"
  - "Genre chips on /anime/[id] converted from <span> to real <Link> elements (D-20), placeholder 'Anime' chip stays unlinked"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component chip links built via new URLSearchParams({...}).toString() instead of importing a 'use client' hook, mirroring the client-side buildStateQuery encoding without duplicating a new convention"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/app/anime/[id]/page.performance.test.ts

key-decisions:
  - "Tags block ARIA wiring: <h2 id=\"tags-heading\"> + <ul aria-labelledby=\"tags-heading\"> (D-16's 'list named by the heading' requirement), rather than a wrapping <section aria-label>"
  - "Tag order is never re-sorted client-side -- the component trusts the backend's already-alphabetical (byte/collation) ORDER BY t.name ASC from plan 160-01, matching D-18's discretion note"
  - ".tagsLabel intentionally reuses .genresLabel's exact color/weight/uppercase treatment per the plan's explicit instruction, even though the Tags block sits in a different vertical zone of the infoCard's light-to-glass gradient than genresLabel's always-dark posterMeta panel -- flagged below as an open human-UAT contrast question, not silently resolved by inventing a new label style"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~35min
completed: 2026-09-16
---

# Phase 160 Plan 06: Tags-Block und Genre-Links auf der öffentlichen Detailseite (Layer 3) Summary

**A new Tags block (heading "Tags", `<ul>`/`<li>` `<Link>` chips) now renders between the description and the Emby/AnimeInfoBanner area whenever `anime.tags` is non-empty, and genre chips are real `next/link` elements pointing at the now-working q-less `/suche` filter -- both proven end-to-end via live HTTP against the rebuilt frontend+backend, not just component tests, because no browser automation tool is available in this environment.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-16
- **Tasks:** 2/2 completed
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- `page.tsx`: new module-level `buildFilterHref('tag' | 'genre', name)` helper builds `/suche?type=anime&{tag|genre}=<name>` via `new URLSearchParams({...}).toString()` -- the same encoding mechanism `useDebouncedSearch.ts`'s `buildStateQuery` already uses, reused rather than hand-rolled (D-09).
- Tags block inserted between `.description` and the `embySeriesUrl`/`AnimeInfoBanner` area: own `<hr className={styles.divider}>` + `<div className={styles.tagsSection}>` containing `<h2 id="tags-heading">Tags</h2>` and `<ul aria-labelledby="tags-heading">` of `<li><Link className={styles.tagChip}>` chips -- rendered *only* when `anime.tags && anime.tags.length > 0`; zero DOM trace (no heading, no container, no extra `<hr>`) when tags are empty/undefined (D-12/D-13/D-14/D-15/D-16).
- Genre chips converted from `<span className={styles.genreChip}>` to `<Link className={styles.genreChip} href={buildFilterHref('genre', genre)}>`; the `else` placeholder branch (`<span className={styles.genreChip}>Anime</span>` when no genres exist) is untouched and stays a plain, unlinked `<span>` (D-20, Pitfall 4).
- `page.module.css`: new `.tagsSection`/`.tagsLabel`/`.tagsList`/`.tagChip` rules -- `.tagsList` is `list-style: none; display: flex; flex-wrap: wrap` (D-19, no horizontal scrollbar, wraps at any width); `.tagChip` mirrors `.genreChip`'s subtle rounded/no-uppercase/no-CTA look plus explicit `cursor: pointer`; both `.tagChip:focus-visible` and the newly added `.genreChip:focus-visible` use `box-shadow: var(--focus-ring)` (the same design-token precedent as `SearchResults.module.css`'s `.resultCard:focus-visible`), per D-17's "globale Design-Tokens" instruction.
- `page.test.tsx`: 7 new component-tree-walking tests (multi-tag order-preserved-not-resorted, exactly-one-tag, zero/undefined-tags-no-container, umlaut+space href round-trip via `URLSearchParams` decoding, real-`Link`-element keyboard-reachability assertion, DOM order Tags-before-Emby/AnimeInfoBanner-after-description, genre-links-vs-unlinked-placeholder) -- all pass alongside the 19 pre-existing cases (26/26 total).
- `page.performance.test.ts`: new fetch-count-parity test proving the total counted SSR data-fetch calls (`getAnimeByID`/`getAnimeFansubs`/`getGroupedEpisodes`/`getAnimeComments`/`getAnimeRelations`) are identical whether `anime.tags` has 3 entries or is `undefined` -- direct evidence the Tags block adds zero network cost (Auftraggeber-Mandat Punkt 4/5).

## Task Commits

Each task was committed atomically:

1. **Task 1: Tags block + genre chips as links** - `2fda9a11` (feat, tdd)
2. **Task 2: Regression guards — performance budget and data-shape tests** - `a81a0084` (test)

## Files Created/Modified

- `frontend/src/app/anime/[id]/page.tsx` - `buildFilterHref` helper, Tags block insertion, genre-chip `<span>`→`<Link>` conversion
- `frontend/src/app/anime/[id]/page.module.css` - `.tagsSection`/`.tagsLabel`/`.tagsList`/`.tagChip` + `.tagChip:focus-visible`/`.genreChip:focus-visible`
- `frontend/src/app/anime/[id]/page.test.tsx` - 7 new tests under `Tags-Block und Genre-Links (D-06/D-09/D-12-D-20)`
- `frontend/src/app/anime/[id]/page.performance.test.ts` - 1 new fetch-count-parity test under `Tags-Block ohne zusaetzliche Netzwerkkosten`

`animeDetailData.test.ts` required no changes (ran as-is, still passes -- confirmed no data-shape regression from this plan).

## Decisions Made

- ARIA wiring for D-16 ("Liste, die über die Überschrift benannt ist"): `<h2 id="tags-heading">` + `<ul aria-labelledby="tags-heading">` was chosen over a wrapping `<section aria-label="Tags">`, since it keeps the visible heading as the single source of the accessible name (no duplicated/hidden label text).
- Tag order is trusted from the backend (`ORDER BY t.name ASC` from plan 160-01's `COALESCE`-extended query) and never re-sorted client-side, per the plan's explicit instruction to avoid "double-sorting divergence." Live proof below shows this is a *byte/collation* sort (uppercase-before-lowercase, e.g. `PSI-Kräfte` sorts before `Parodie`), not a German-locale-aware alphabetization -- this is pre-existing backend behavior from 160-01, unchanged by this plan, and out of this plan's scope to alter.
- `.tagsLabel` reuses `.genresLabel`'s exact treatment (uppercase, `rgba(255,255,255,0.6)`) as the plan's `<action>` explicitly instructed. This is flagged as an open visual question below rather than silently resolved, since `.genresLabel` always sits on a dark `posterMeta` glass panel, while the new Tags block sits inside `infoCard`'s light-to-glass gradient at a vertical position that depends on content length -- actual contrast at that position cannot be confirmed without a real browser render.

## Deviations from Plan

None (Rule 1-4). Both tasks were implemented exactly as specified in the plan's `<action>` blocks; the only judgment calls made were within the explicit "Claude's discretion" scope the plan itself granted (ARIA wiring style, exact CSS values), documented above as Decisions Made, not deviations.

## Auftraggeber-Mandat Punkt 4 (Live-Tag-/Genre-Anzeige-Nachweis): Mechanically Verified Evidence

Per this plan's explicit instructions, **no browser automation tool is available in this environment** (no Playwright/Chrome DevTools MCP). The following is exactly what WAS mechanically verified via `curl`/`grep`/`python3` against the live rebuilt stack, and what remains explicitly open for human browser UAT.

### What WAS mechanically proven

1. **Frontend container rebuilt and healthy.** `docker restart team4sv30-frontend`; `curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/anime/1` → `200`.

2. **Real `<a href>` elements, not JS-only click handlers.** `curl`'d the live-rendered HTML of `/anime/1` (Buddy Complex, 8 tags, 3 genres) and `/anime/3` (11eyes: Pink Phantasmagoria, 7 tags, 5 genres, including umlaut/multi-word names) and grepped for `href="/suche?...tag=..."` / `...genre=...`. Every chip is a genuine `<a href="...">` element (HTML-entity-escaped `&amp;`, as real anchor markup always is) -- this is structural proof of native keyboard/Enter navigability, since real `<a href>` elements are inherently Tab-reachable and Enter-activates by browser default, without needing to simulate a keypress. Example matches from `/anime/3`:
   ```
   href="/suche?type=anime&amp;tag=PSI-Kr%C3%A4fte"
   href="/suche?type=anime&amp;tag=Zeitgen%C3%B6ssische+Fantasy"
   href="/suche?type=anime&amp;genre=Kom%C3%B6die"
   ```

3. **Round-trip decoding to the exact original name, including a real space-containing and a real umlaut-containing name from live `team4s_v2` data** (decoded via Python `html.unescape` + `urllib.parse.parse_qs`, not raw string comparison):
   | Original tag/genre name (live DB) | Emitted href fragment | Decoded back to |
   |---|---|---|
   | `Real Robot` (tag, anime 1) | `tag=Real+Robot` | `Real Robot` ✓ |
   | `PSI-Kräfte` (tag, anime 3, umlaut) | `tag=PSI-Kr%C3%A4fte` | `PSI-Kräfte` ✓ |
   | `Zeitgenössische Fantasy` (tag, anime 3, space + umlaut) | `tag=Zeitgen%C3%B6ssische+Fantasy` | `Zeitgenössische Fantasy` ✓ |
   | `Komödie` (genre, anime 3, umlaut) | `genre=Kom%C3%B6die` | `Komödie` ✓ |

   All four round-trips exact. Both a multi-word name and multiple umlaut-containing names exist in live `team4s_v2` data (`PSI-Kräfte`, `Zeitgenössische Fantasy`, `Dämon`, `Komödie`), so no synthetic example was needed.

4. **Full chip→URL→search→results chain proven end-to-end via real HTTP** (`GET /api/v1/search?type=anime&tag=<decoded name>` / `&genre=<decoded name>`, exercising the exact decoded href against the live backend, port 18092):
   | Request | HTTP | Result |
   |---|---|---|
   | `tag=Real Robot` | 200 | `Buddy Complex` (anime id 1) -- the exact anime the chip was rendered on |
   | `tag=PSI-Kräfte` | 200 | `11eyes` (id 2) + `11eyes: Pink Phantasmagoria` (id 3) -- includes the anime the chip was rendered on |
   | `tag=Zeitgenössische Fantasy` | 200 | same two anime (id 2, id 3) |
   | `genre=Komödie` | 200 | `11eyes: Pink Phantasmagoria` (id 3) -- the exact anime the chip was rendered on |

   This proves the full D-09→D-10 chain (chip → `/suche` URL → backend filter match → correct results) via real HTTP, without a browser.

5. **CSS wrap mechanism confirmed by direct grep** of `page.module.css`: `.tagsList { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; }` -- no `overflow-x`/`white-space: nowrap` anywhere in the file that would force horizontal scrolling (D-19's mechanism, not its rendered outcome).

6. **Focus-visible mechanism confirmed by direct grep**: both `.tagChip:focus-visible` and `.genreChip:focus-visible` are present, both using `box-shadow: var(--focus-ring)` (the same design-token precedent `SearchResults.module.css`'s `.resultCard:focus-visible` already established) -- D-17's "globale Design-Tokens" mechanism, not its rendered outcome.

7. **Full extended test suites pass as the primary automated evidence for D-12-D-19**: `npx vitest run` inside `team4sv30-frontend` for `page.test.tsx` (26/26), `page.performance.test.ts` (6/6), `animeDetailData.test.ts` (23/23) -- 55/55, these DO exercise the actual React component tree structurally (DOM order, `Link` element identity, `href` attribute values, absence/presence of the container), not just source-text pattern matching.

8. **Acceptance-criteria greps confirmed literally**:
   - `grep -n "Tags</h2>" page.tsx` → matches (line 202, exact heading text "Tags")
   - `grep -n "URLSearchParams" page.tsx` → matches (D-09's established-mechanism reuse)
   - `grep -n "<input\b\|<select\b\|<textarea\b" page.tsx` → no matches (no native form elements introduced)

9. **Full regression**: `npx tsc --noEmit` clean, `npx eslint` on all 4 touched files clean, full `npx vitest run` inside the container -- **325/327 test files, 2838/2843 tests passed**, with the exact same 2 pre-existing, already-documented `src/lib/cssCustomProperties.guard.test.ts` failures (`--surface-muted` fallback-free reference in `lib/roleCatalog.accessibility.test.ts`, unrelated to this plan, tracked in `.planning/STATE.md`) -- 0 new failures.

### What is explicitly NOT verifiable here (open for human UAT)

- **Actual rendered chip wrapping behavior at a real 375px mobile viewport.** No browser/viewport emulation tool is available in this environment; the CSS mechanism (`flex-wrap: wrap`) is proven present, but its visual outcome at a specific narrow width was not observed.
- **An actual physical Tab keypress reaching each chip and an actual Enter keypress triggering navigation in a live browser session.** Structurally proven via real `<a href>` elements (point 2 above, native anchor semantics), but not behaviorally observed with a real keyboard/browser session.
- **Visual contrast of `.tagsLabel`/`.tagChip` text at the actual vertical position they land in `infoCard`'s light-to-glass gradient**, given `.tagsLabel` reuses `.genresLabel`'s always-dark-background color treatment per the plan's explicit instruction, but the Tags block's own position within the gradient depends on content length (title/badges/description height above it) and was not visually confirmed.

**Live-Browserprüfung bei 375px und reale Tab/Enter-Tasteninteraktion stehen aus — kein Browser-Automatisierungs-Tool in dieser Umgebung verfügbar; UAT über den SSH-Tunnel (http://127.0.0.1:3300) durch einen Menschen erforderlich, konsistent mit dem in CLAUDE.md dokumentierten Ablauf.**

## Gap-Fix nach Nutzerbefund (2026-09-16, nach Phase-Verifizierung)

Der Auftraggeber prüfte `/anime/3` (11eyes: Pink Phantasmagoria) live im Browser und meldete: die Tags-Überschrift und -Chips waren praktisch unsichtbar — weiße Schrift auf der hellen rechten `infoCard`. Das ist exakt die Kontrastfrage, die diese SUMMARY oben unter "Decisions Made" und "explicitly NOT verifiable" bereits offen benannt hatte (`.tagsLabel`/`.tagChip` übernahmen `.genresLabel`s Weiß-auf-Dunkel-Stil vom linken Poster-Panel, obwohl der Tags-Block auf der hellen `infoCard` sitzt) — jetzt live bestätigt statt nur vermutet.

**Ursache:** `.tagsLabel`/`.tagChip`/`.tagChip:hover` in `page.module.css` verwendeten `rgba(255,255,255,...)`-Werte (Weiß auf Dunkel), passend für `.genresLabel`/`.genreChip` im linken Glas-Panel, aber falsch für den Tags-Block in der hellen `infoCard` (`color: #1a1a1a`, `.description` nutzt `#444`).

**Fix (Commit `9233adf2`):** `.tagsLabel`/`.tagChip`/`.tagChip:hover` auf dunkle globale Tokens umgestellt — `.genreChip` (links, dunkle Spalte) bewusst unverändert gelassen:
- `.tagsLabel`: `color: var(--text-muted)` (`#6b6b70`)
- `.tagChip`: `background: var(--surface-sunken)` (`#f0ece5`), `border: 1px solid var(--border-subtle)`, `color: var(--text-primary)` (`#1c1c1e`)
- `.tagChip:hover`: `background: color-mix(in srgb, var(--surface-sunken) 70%, black 8%)`, `border-color: var(--border-strong)` (sichtbar dunkler)
- `.tagChip:focus-visible`: unverändert, weiterhin `box-shadow: var(--focus-ring)` (Token-basiert, nicht farbabhängig — blieb bereits vorher sichtbar)

**WCAG-AA-Kontrastnachweis (berechnet, relative Luminanz nach WCAG-Formel, Node-Skript):**
| Paar | Kontrastverhältnis | AA-Minimum (Normal Text) | Ergebnis |
|---|---|---|---|
| `--text-muted` (#6b6b70) auf Weiß (#ffffff) — `.tagsLabel` | 5.30:1 | 4.5:1 | ✓ besteht |
| `--text-primary` (#1c1c1e) auf `--surface-sunken` (#f0ece5) — `.tagChip`-Text | 14.45:1 | 4.5:1 | ✓ besteht deutlich |
| `--text-primary` (#1c1c1e) auf Weiß (#ffffff) | 17.01:1 | 4.5:1 | ✓ besteht deutlich |

**Verifikation nach Fix:**
- `docker restart team4sv30-frontend`, danach `curl http://127.0.0.1:3000/anime/3` → 200; ausgelieferte CSS-Datei (`/_next/static/css/app/anime/%5Bid%5D/page.css`) direkt gegrept — `.page_tagChip__9Iyji` enthält jetzt exakt die neuen `var(--surface-sunken)`/`var(--border-subtle)`/`var(--text-primary)`-Regeln.
- `git diff --stat` bestätigt: nur 6 Zeilen in `page.module.css` geändert, ausschließlich innerhalb von `.tagsLabel`/`.tagChip`/`.tagChip:hover`; `.genreChip` unverändert (per Auftrag).
- Zielgerichtete Suite erneut grün: `npx vitest run "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/page.performance.test.ts" "src/app/anime/[id]/animeDetailData.test.ts"` → 55/55 bestanden (keine neue Fehlschläge durch den Stilwechsel, da keine Farbwerte in den Tests geprüft werden).
- `npx tsc --noEmit` sauber; `npx eslint` auf den geänderten Dateien sauber.
- **Weiterhin offen (unverändert seit oben dokumentiert):** tatsächliches Rendering bei 375px-Viewport und reale Tab/Enter-Tasteninteraktion — weiterhin ohne Browser-Automatisierungs-Tool nicht in dieser Umgebung nachweisbar; menschliche UAT über `http://127.0.0.1:3300` bleibt erforderlich, jetzt inklusive visueller Bestätigung, dass die Tags jetzt tatsächlich lesbar sind (nicht nur rechnerisch kontrastreich).

## Issues Encountered

- `npx vitest`/`npx tsc` failed when run directly on the Linux host (`frontend/vitest.config.ts` cannot resolve `vitest/config` outside the container's `node_modules`) -- ran all test/typecheck/lint commands inside `team4sv30-frontend` per CLAUDE.md's canonical Docker Compose workflow instead.
- `docker exec team4sv30-db psql -U postgres` failed (`role "postgres" does not exist`) -- the correct DB role, read from `team4sv30-backend`'s `DATABASE_URL` env var, is `team4s`; used `docker exec team4sv30-db psql -U team4s -d team4s_v2` for all live-data read-only queries instead.

## User Setup Required

None -- no external service configuration required. All changes are frontend-only, built against the existing local Docker Compose stack; no live data, migrations, or env changes were made (all database access in this plan's verification was read-only `SELECT`).

## Next Phase Readiness

This is the final plan of Phase 160's "Tags und Genres" sub-step (Layer 3 of 3). No blockers for further Phase-160 sub-steps (fansub-group-button semantics, coop display, episode filter/type UI) -- those remain explicitly out of this sub-step's scope per `160-CONTEXT.md` and are deferred to a separate future Discuss step, unaffected by this plan.

The mobile-viewport wrap check and the real Tab/Enter keyboard interaction check remain open, human-only UAT items (SSH tunnel `http://127.0.0.1:3300`), consistent with this project's established browser-verification workflow.

## Self-Check: PASSED

All 4 claimed modified files found on disk; both task commit hashes (`2fda9a11`, `a81a0084`) found in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*
