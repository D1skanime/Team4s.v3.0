# Phase 120: Öffentliches Memberprofil visuell harmonisieren und Ladeperformance optimieren - Research

**Researched:** 2026-08-04
**Domain:** Next.js SSR, responsive images, CLS-stable carousel activation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Profilkopf und Member-Hintergrund
- **D-01:** Der vom Member hochgeladene und zugeschnittene Hero-Hintergrund bleibt vollflächig sichtbar. Die Darstellung darf weder Helligkeit noch eine bestimmte Motivseite voraussetzen und muss den gespeicherten Zuschnitt respektieren.
- **D-02:** Gewählt ist Sketch 004 Hero B: Eine moderate, weich auslaufende Lesbarkeitszone liegt nur hinter den Informationen. Textschatten und kompakte Informationsflächen sichern helle und dunkle Uploads ab, ohne das Bild durch eine starke Vollflächenabdunklung zu entwerten.
- **D-03:** Der Name ist die dominante Information. Verifizierungs-/Aktivstatus stehen ruhig daneben; die Punktzahl erscheint kompakt darunter. Bio und Aktivitätsmetadaten bleiben untergeordnet lesbar.
- **D-04:** Breadcrumb und Aktionen bleiben als schmale, visuell zurückhaltende Werkzeugleiste oberhalb des Hero. `Korrektur melden` darf den Profilkopf nicht visuell dominieren; eine zurückhaltende Overflow-/Sekundäraktion ist zulässig.
- **D-05:** Mobile verwendet einen kompakten einspaltigen Hero mit ungefähr 100 px Avatar, vollständigen Textinformationen, kontrolliert umbrechenden Aktionen und ohne horizontalen Überlauf.

### Desktop-Flächen, Hierarchie und Abschnittsrhythmus
- **D-06:** Desktop wechselt bewusst zwischen Vollbreite und Zweispalten. Fansub-Geschichte plus Gruppenzugehörigkeit sowie aktuelle plus frühere Beiträge bilden Zweispalten-Paare. Aktuelle Projekte und Auszeichnungen bleiben vollbreit.
- **D-07:** Hauptabschnitte verwenden eine einheitliche H2-Hierarchie; Card-Titel verwenden H3. Unter jeder H2 liegt die globale weinrote Team4s-Linie über `--ui-line: #82122c`; keine neue lokale Rotfarbe wird eingeführt.
- **D-08:** Gewählt ist Sketch 004 Rhythmus C: mittlerer vertikaler Rhythmus mit abwechselnd leicht abgesetzten Vollbreitenbändern. Die Weinlinie verbindet Überschrift und Inhalt; Mobile fällt vollständig auf eine Spalte zurück.
- **D-09:** Abgesetzte Bänder bleiben ruhig und subtil. Sie dürfen weder Hero noch Badge-Artwork konkurrieren und müssen auf allen Viewports ohne horizontales Clipping funktionieren.

### Badge-Erfassbarkeit
- **D-10:** Alle bestehenden Badge-Kategorien bleiben untereinander sichtbar. Jede Kategorie erhält einen klaren H2-Abschnitt mit Weinlinie und ihr eigenes Focal-Carousel beziehungsweise bei nur einer Sammlung eine ruhige Einzelkarte.
- **D-11:** Das etablierte Sammlungsmuster bleibt: höchste aktuelle Stufe als großes Artwork, vollständige kompakte Stufenleiste darunter, erreichte Stufen farbig, zukünftige Stufen gedimmt und gesperrt.
- **D-12:** Ohne Interaktion sind Rang, aktueller Wert, nächstes Ziel und Restmenge sichtbar.
- **D-13:** Kategorien mit mehreren Sammlungskarten zeigen einen klaren Kartentitel und einen kompakten Zähler im Format `n von m Sammlungen`. Zusätzliche Positionspunkte, Tabs oder eine zweite Navigationsebene werden nicht eingeführt.
- **D-14:** Phase 118/119 bleiben fachlich und visuell verbindlich: Rollen, Fortschritt, Punkte-Meilensteine, Beiträge, Mitgliedschaft und besondere Auszeichnungen behalten ihre festgelegte Sammlung, Reihenfolge und Earned-/Locked-Semantik.

### Lade- und Rendering-Verhalten
- **D-15:** Werkzeugleiste, Hero sowie das erste Inhaltspaar aus Geschichte und Gruppenzugehörigkeit sind beim ersten sichtbaren Render vollständig vorhanden. Projekte, Badge-Bereiche und Beiträge werden erst kurz vor dem Sichtbereich interaktiv aktiviert.
- **D-16:** Noch nicht aktivierte tiefe Bereiche reservieren ihre endgültige Fläche und zeigen ruhige, strukturgleiche Skeletons. Überschrift und Weinlinie bleiben sichtbar; Skeleton und Endinhalt müssen dieselben relevanten Abmessungen beziehungsweise Seitenverhältnisse besitzen.
- **D-17:** Es darf auf Mobile, Tablet oder Desktop keine wahrnehmbare Layoutverschiebung und kein Ruckeln geben. Bilder reservieren ihre Maße vor dem Laden; Skeleton-Wechsel, Schriftlayout, Badge-Artwork und Carousel-Mounting dürfen nachfolgende Inhalte nicht verschieben. Keine Größenanimation beim Austausch.
- **D-18:** Badge-/Profilinhalte bleiben serverseitig vorhanden und lesbar. Nur teure Carousel-Interaktion wie Messung, Drag, Momentum und Snap wird kurz vor Sichtbarkeit aktiviert.
- **D-19:** Avatar und Hero-Hintergrund erhalten Ladepriorität. Projektbilder und Badge-Artworks laden gestaffelt/lazy mit vorab reservierten Abmessungen und korrekten responsiven Bildgrößen.
- **D-20:** Rasterbilder werden für die Auslieferung als gecachte responsive WebP-Derivate bereitgestellt; die Originaldateien bleiben unveränderte Arbeits-/Quellassets und werden im Normalfall nicht an die Profilseite ausgeliefert. Der Browser wählt über dokumentierte `srcset`-/`sizes`-Semantik die zur tatsächlichen Darstellungsgröße passende Variante. Derivate werden nicht bei jedem Seitenaufruf neu erzeugt.
- **D-21:** Badge-Artwork erhält mindestens zwei auf den realen Einsatz abgestimmte WebP-Größenklassen: ungefähr 128–160 px für kleine Stufen und 512–640 px für die große aktive Medaille. Konvertierung erfolgt verlustfrei oder visuell verlustarm; Alpha-Transparenz, Farben und saubere Kanten müssen erhalten bleiben. Fehlende Derivate benötigen einen sicheren Original-Fallback.
- **D-22:** Hero, Avatar und Projektbilder folgen demselben responsiven Derivatprinzip mit domänengerechten Größenstufen. Research bestimmt die konkreten Breiten aus den realen CSS-/Viewport-Größen und verhindert unnötig große Downloads auf Mobile, Tablet und Desktop.

### the agent's Discretion
- Technische Beseitigung der doppelten Profilabfrage zwischen `generateMetadata()` und Seitenrender, solange Auth-/Sichtbarkeitsverhalten korrekt bleibt.
- Konkrete Cache-/Memoization-Seam, exakte Hero-/Avatar-/Projektbreiten, `sizes`-Werte, IntersectionObserver-Schwellen, Skeleton-Komponenten und Mounting-Grenzen, solange D-15 bis D-22 messbar erfüllt sind.
- Exakte Bandtönung, Abstände und Breakpoints innerhalb des gewählten Sketch-004-Zielbilds und des globalen UI-Systems.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Plan this as a frontend refactor, not a new badge/API domain. The route currently fetches anonymously in `generateMetadata()` and again with the request access token in the page; `getMemberProfile` is `no-store` and the response legitimately differs for public, hidden and owner-preview requests. [VERIFIED: codebase] Use one module-level React `cache()` wrapper keyed by primitive `slug` and token, with both metadata and page reading the same cookie. This deduplicates within a server request without sharing viewer-sensitive data across requests. [VERIFIED: React cache contract already available in installed React]

Keep all profile/badge content in SSR HTML. Delay only expensive FocalCarousel measurement, ResizeObserver, drag, momentum, wheel and snap behavior via a near-viewport interaction flag. [VERIFIED: FocalCarousel.tsx; D-18] Do not use `ssr:false` for MemberBadgeChain. Reserve final dimensions before activation and switch skeleton/content only by visibility/opacity, never block-size or scale. [VERIFIED: D-16/D-17]

Use existing `next/image` optimization/cache after a representative URL smoke test. Current profile/badge/project Images use `unoptimized`; `next.config.mjs` has no remote patterns. [VERIFIED: codebase] Supply truthful `sizes`, preserve all PNG/upload originals, let cached WebP derivatives serve normal traffic, and fall back to the original URL on optimizer failure. [VERIFIED: D-20/D-21]

**Primary recommendation:** Three slices: (1) auth-correct SSR loader plus image-delivery probe/config, (2) Sketch-004 hero/page hierarchy and fixed geometry, (3) post-Phase-119 carousel activation and performance/UAT gates. [VERIFIED: context/codebase]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary | Rationale |
|---|---|---|---|
| Fetch dedupe | Frontend Server | API | Metadata/page share request loader; backend remains visibility owner. [VERIFIED: codebase] |
| Hidden/owner preview | API | Frontend Server | Existing endpoint authorizes optional identity. [VERIFIED: contract/helper] |
| Layout/CLS | Browser CSS | SSR | CSS reserves geometry around SSR markup. [VERIFIED: codebase] |
| Carousel content | SSR | Browser | Content stays server-readable; behavior activates in browser. [VERIFIED: D-18] |
| Image derivatives | Next image optimizer | Browser | Cache produces variants; browser chooses `srcset`. [VERIFIED: installed Next seam] |

## Phase Requirements

ROADMAP says Phase 120 requirements are TBD and REQUIREMENTS.md has no IDs. [VERIFIED: codebase] Plans must map acceptance criteria to D-01–D-22 and inherited Phase-118/119 contracts. [VERIFIED: CONTEXT.md]

## Project Constraints (from AGENTS.md)

- Work only in `/home/d1sk/team4s`, use Docker Compose for runtime/build/tests, and preserve host-local runtime data. [VERIFIED: AGENTS.md]
- Search first; extend global components/helpers and name analog files in every plan's `read_first`. [VERIFIED: implementation contract]
- Preserve central auth/refresh behavior, including valid refresh-only sessions. [VERIFIED: auth contract]
- Use correct German umlauts, global UI tokens/components and `--ui-line`; no unrelated redesign. [VERIFIED: AGENTS.md/UI docs]
- Preserve dirty work; run focused tests, typecheck, lint, feasible build, `git diff --check`, and live in-app-browser UAT. [VERIFIED: AGENTS.md]

## Standard Stack

| Facility | Version | Prescription |
|---|---|---|
| Next.js | 16.1.6 installed | Keep version; use Image optimizer/`sizes`; no upgrade. [VERIFIED: package/runtime] |
| React/DOM | 18.3.1 | Module-level `cache` for request memoization; no upgrade. [VERIFIED: package/runtime] |
| Vitest/Testing Library | 3.2.4/16.3.0 | Extend existing route/hero/badge/carousel tests. [VERIFIED: package.json] |
| IntersectionObserver | native | Once-only near-view activation, start with `rootMargin: 600px 0px`, immediate fallback. [ASSUMED threshold] |
| FocalCarousel | existing global seam | Extend; never create a profile-local carousel. [VERIFIED: codebase] |

No new dependency is needed. Direct Sharp is absent, so do not assume a transitive CLI. [VERIFIED: runtime audit] Prefer Next's cached optimizer; if checked-in derivatives are later required, isolate a reproducible asset-generation task. [ASSUMED]

## Architecture Patterns

### Data and rendering flow

```text
request -> generateMetadata + page
        -> cachedGetMemberProfile(slug, token)
        -> existing member API -> visible | hidden | owner preview
        -> complete SSR HTML
           -> hero image high priority
           -> deep fixed-size shells
              -> IntersectionObserver -> FocalCarousel interaction on
           -> next/image srcset/sizes -> cached WebP
```

### Request-scoped loader

```typescript
import { cache } from 'react'
export const getMemberProfileForRequest = cache(
  (slug: string, token: string) => getMemberProfile(slug, token || undefined),
)
```

Both entry points must read the same auth cookie before calling it. Anonymous and authenticated calls intentionally use different keys. Keep `no-store`; do not introduce persistent user-profile caching. [VERIFIED: current helper/visibility contract]

### SSR content with delayed interaction

Add a generic `interactionEnabled`/defer contract to `FocalCarousel`. Before activation it renders identical children and counter but skips geometry effects and pointer/wheel handlers; after a once-only observer fires it enables existing behavior. [VERIFIED: current component ownership] A domain-level deep-section shell may overlay a structurally identical skeleton, but must not unmount SSR content or expose duplicate accessible content. [ASSUMED]

### Image sizing

| Asset | Actual CSS size | Candidate derivative widths | `sizes` |
|---|---|---|---|
| compact badge | 56–96px | 128, 160 | `(max-width:520px) 72px, 96px` [VERIFIED: badge CSS] |
| large badge | 248–328px | 512, 640 | existing `(max-width:520px) 248px, (max-width:1099px) 280px, 320px` [VERIFIED: code] |
| avatar | ~100 mobile/132 desktop | 128, 256 | `(max-width:760px) 100px, 132px` [VERIFIED: CSS/D-05] |
| project cover | 68 mobile/90 desktop | 96, 192 | `(max-width:720px) 68px, 90px` [VERIFIED: CSS] |
| hero | shell width; stored crop 1920×384 | 640,1080,1480,1920 | viewport/shell-based, verify generated markup [VERIFIED: crop/page CSS] |

The upload crop is already 1920×384 and retains a separate source original. [VERIFIED: ProfileBackgroundCard/contract] Render cropped `public_url`, never public `source_original_url`, and remove arbitrary `object-position:center 42%`. A taller mobile hero must use symmetric cropping and be UAT-tested with bright/dark and left/right focal images. [VERIFIED: hero code] [ASSUMED mobile acceptance]

## Recommended Plan Slices

### Slice 1 — SSR and image foundation
**read_first:** `frontend/src/app/members/[slug]/page.tsx`, `page.test.tsx`, `frontend/src/lib/api.ts` (`getMemberProfile`), `frontend/src/types/profile.ts`, `shared/contracts/openapi.yaml`, `frontend/next.config.mjs`, `docs/frontend/auth-api-client.md`. [VERIFIED: ownership]
- Add auth-keyed request loader; prove call dedupe and visibility branches.
- Probe badge/avatar/background/project URLs through optimizer before changing `unoptimized`.
- Define narrow image widths/patterns/cache behavior and original fallback.

### Slice 2 — Sketch-004 layout/hero
**read_first:** Sketch 004 README/index, `page.tsx`, `page.module.css`, `MemberProfileHero.tsx`, `profile.module.css`, `MemberCurrentProjectsSection.tsx/.module.css`, `MembershipsSection.tsx`, `MemberStorySection.tsx`, global `SectionHeader`/tokens, FansubTeamSection CSS. [VERIFIED: context analogs]
- Toolbar then Hero B; 5:1 stored crop, local readability gradient only behind copy.
- Desktop pairs story/membership and latest/previous; projects/badges full width; mobile one column.
- One H2/wein-line contract and H3 card titles; reserve final image/card geometry.

### Slice 3 — Deferred interaction and validation
**read_first:** final Phase-119 summary/context, `FocalCarousel.tsx/.module.css/.test.tsx`, `MemberBadgeChain.tsx/.module.css/.test.tsx`, `LatestContributionsSection.tsx/.test.tsx`, badge labels/assets. [VERIFIED: overlap]
- Extend final FocalCarousel, do not fork it.
- Add once-only near-view gating and fixed-size skeleton shells.
- Convert supported images to responsive optimized delivery.
- Run automated, optimizer/network, CLS and live UAT gates.

## Don't Hand-Roll

| Problem | Don't build | Use |
|---|---|---|
| request memoization | global Map | React `cache` |
| image conversion | browser canvas/per-view generator | Next Image cache |
| carousel | profile-local drag/snap | FocalCarousel |
| visibility | client hiding | existing backend response |
| red heading rule | local color | SectionHeader/`--ui-line` |

## Common Pitfalls

1. Cache ignores token and leaks/reuses owner preview. Test same-key dedupe plus different-key isolation. [VERIFIED: contract]
2. Lazy import removes SSR badge content. Assert SSR contains rank/value/next/rest. [VERIFIED: D-12/D-18]
3. Active artwork causes CLS: current role artwork grows from 220–270px to 280–328px with dimension transitions. Reserve maximum geometry and remove mount-size transitions. [VERIFIED: badge CSS]
4. Hero re-crops saved choice through `center 42%` or source original. Use cropped URL and symmetric cover only. [VERIFIED: code]
5. Optimizer fails for absolute media URLs because remote patterns are empty. Probe first and configure narrowly. [VERIFIED: config]
6. Alpha/edges degrade. Compare representative layered role/progress/contribution/membership/special art at 160/640 against PNG and verify fallback. [ASSUMED]
7. Phase-119 changes are overwritten. Never reset/broad-format overlapping files. [VERIFIED: git status/AGENTS.md]

## Assumptions Log

| # | Claim | Risk |
|---|---|---|
| A1 | 600px observer margin is suitable | tune via live trace |
| A2 | symmetric mobile crop is acceptable | requires user visual check |
| A3 | skeleton overlay can remain accessibility-clean | verify DOM/a11y |
| A4 | Next optimizer accepts all representative profile URLs | Wave-0 probe required |

## Open Questions

1. Which runtime profile URLs are relative versus absolute? Probe one of each asset type before removing `unoptimized`. [VERIFIED: resolveApiUrl/config]
2. Is background, avatar or text the LCP per viewport? Measure; prioritize only actual image LCP. [ASSUMED]
3. When is Phase 119 committed? Overlap work must begin from its final state. [VERIFIED: dirty worktree]

## Environment Availability

| Dependency | Available | Fallback |
|---|---|---|
| canonical Linux repo/Compose services | yes | none [VERIFIED: audit] |
| Next Image 16.1.6 | yes | source-specific original/unoptimized [VERIFIED] |
| IntersectionObserver | browser | immediate activation [ASSUMED] |
| direct Sharp | no | Next optimizer [VERIFIED] |

## Validation Architecture

| Property | Value |
|---|---|
| Framework | Vitest 3.2.4 + Testing Library 16.3.0 |
| Quick | `docker compose exec -T team4sv30-frontend npm test -- --run src/app/members/[slug]/page.test.tsx src/components/profile/MemberProfileHero.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| Full | `docker compose exec -T team4sv30-frontend npm test` |

### Decision-to-test map

| Decisions | Verification | Gap |
|---|---|---|
| D-01–D-05 | hero semantics/CSS plus bright/dark/focal UAT | extend existing |
| D-06–D-14 | section order, H2/H3, grids, collection counts | extend existing |
| D-15–D-18 | SSR content, behavior off→on once, reduced motion | Wave-0 observer tests |
| D-19–D-22 | sizes, priority/lazy, WebP widths/cache/fallback | optimizer smoke |
| auth | public/hidden/owner, cache isolation, refresh-only owner actions | add dedupe/security cases |
| D-17 | layout-shift trace at ~390/768/1440 widths | live gate |

### Wave 0
- [ ] Server loader same-key/different-auth/error tests.
- [ ] Mocked IntersectionObserver and no-observer fallback tests.
- [ ] Image prop tests and runtime optimizer smoke.
- [ ] CLS/network trace across mobile/tablet/desktop.

Per commit run focused tests/typecheck; per wave run full tests/lint/build if feasible/`git diff --check`; phase gate includes live in-app-browser UAT. [VERIFIED: AGENTS.md]

## Security Domain

Auth/session/access-control apply: cache keys must include viewer auth; backend remains visibility authority; no token logic moves to client. [VERIFIED: auth/contract] Restrict image optimizer patterns to prevent an open proxy/SSRF surface. [VERIFIED: Next config requirement] Explicitly test missing access token with valid refresh session for protected owner actions. [VERIFIED: AGENTS.md]

## Phase-119 Ownership Boundary

The worktree currently modifies `FocalCarousel`, `MemberBadgeChain`, `LatestContributionsSection`, their CSS/tests and badge assets. [VERIFIED: git status 2026-08-04] Do not reset or broad-format them. Read the final 119 summary/context and diff, land non-overlap first, extend current centering/wheel/a11y behavior, and run Phase-119 tests before Phase-120 expectations. [VERIFIED: implementation contract]

## Sources

### Primary (HIGH)
- Canonical code, 120-CONTEXT.md, Phase-118/119 artifacts, AGENTS.md, UI/auth/implementation docs.
- React `cache` and installed Next Image contracts.

### Secondary (MEDIUM)
- Browser IntersectionObserver and responsive-image behavior.

### Tertiary (LOW)
- None.

## Metadata

**Confidence:** stack HIGH; architecture HIGH; fixed widths HIGH; hero/LCP tuning MEDIUM pending live measurement.  
**Valid until:** Phase-119 overlapping files change or 2026-08-11.
