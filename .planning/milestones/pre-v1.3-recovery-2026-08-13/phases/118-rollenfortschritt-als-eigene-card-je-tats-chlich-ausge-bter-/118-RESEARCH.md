# Phase 118: Rollenfortschritt als eigene Card je Fansubrolle - Research

**Researched:** 2026-08-02
**Domain:** Public member-profile role progress and reusable carousel interaction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Jede sichtbare Rolle berechnet ihren Fortschritt unabhängig. Fremde oder nicht verdiente Rollen bleiben vollständig ausgeblendet und beeinflussen keinen allgemeinen Auszeichnungsfortschritt.
- **D-02:** Die Leiste zeigt immer den Gesamtwert bis zur nächsten noch nicht erreichten Stufe, nicht einen zurückgesetzten Abschnitt seit der letzten Stufe. Beispiel: `50 von 108 Mitwirkungen`, nicht `(50−12) von (108−12)`.
- **D-03:** Unter der Leiste stehen beide Informationen: aktueller Stand und Restmenge, zum Beispiel `50 von 108 Mitwirkungen · Noch 58 bis Silber`.
- **D-04:** Beim exakten Erreichen einer Schwelle wird die neue Medaille sofort erreicht dargestellt und das Fortschrittsziel wechselt unmittelbar zur nächsten Stufe.
- **D-05:** Die höchste aktuell erreichte Medaille ist das große zentrale Artwork. Direkt darunter steht ein Rang-Chip im Format `Gold · 320+`.
- **D-06:** Darunter bleibt die vollständige Reihe aus fünf echten Badge-Bildern sichtbar: Einstieg, Bronze, Silber, Gold und Platin. Erreichte Stufen sind farbig; zukünftige Stufen sind gedimmt und gesperrt.
- **D-07:** Die groß dargestellte aktuelle Medaille wird in der kleinen Fünferreihe nochmals wiederholt und eindeutig mit `Aktuell` markiert. Gewählte Referenz: Sketch 001, Variante A „Vollständige Sammlung“.
- **D-08:** Auf Mobile bleibt die vollständige Fünferreihe ohne inneres horizontales Scrollen sichtbar. Die große Medaille skaliert auf etwa 240–260 px; die Fortschrittstexte dürfen untereinander umbrechen.
- **D-09:** Mehrere Rollen liegen als einzelne Cards in einem gemeinsamen horizontalen Rollen-Karussell. Gewählte Referenz: Sketch 002, Variante A „Ein Rollen-Karussell“.
- **D-10:** Die Bewegung ist kontinuierlich: Während Drag, Touch-Swipe, Trackpad- oder Mausradbewegung folgt der Track direkt, die kommende Card wächst stufenlos und die bisherige wird schmaler. Nach dem Loslassen rastet die nächstgelegene Card weich ein.
- **D-11:** Ein kräftiger Swipe oder schneller Maus-Drag darf mit natürlichem Schwung mehrere Cards überspringen. Die Pfeile bleiben ergänzende Navigation, nicht der primäre Bewegungsmodus.
- **D-12:** Das vertikale Mausrad steuert das Karussell, solange der Zeiger darüber liegt. Am Anfang und Ende muss normales Seitenscrollen wieder möglich sein.
- **D-13:** Responsiv abgestuft: Desktop zeigt die aktive Card plus zwei deutlich sichtbare schmale Nachbarn; Tablet zeigt zwei schmalere Randkarten; Mobile zeigt eine fast vollbreite aktive Card plus kleinen Anschnitt der nächsten Card.
- **D-14:** Erste und letzte Card rasten auf jedem Viewport vollständig im Zentrum ein. Der im Sketch gefundene Endpunktfehler ist ausdrücklich als Regressionstest abzudecken; skalierte DOM-Breiten dürfen die Snap-Berechnung nicht verfälschen.
- **D-15:** Bei `prefers-reduced-motion` entfallen langer Schwung und kontinuierliche Skalierung. Es bleibt eine sehr kurze, ruhige Einrastbewegung mit identischem Inhalt.
- **D-16:** Das Karussell ist als eine Tastaturstation erreichbar. Pfeiltasten aktivieren und zentrieren eine ganze Card; die fünf Medaillen erzeugen keine fünf zusätzlichen Tabstopps.
- **D-17:** Orientierung erfolgt über einen kompakten Zähler wie `3 von 11 Rollen`; keine zusätzlichen Positionspunkte.
- **D-18:** Interaktion, Drag/Touch/Mausrad, Momentum, Snap, Skalierung, Endpunktzentrierung, Tastatur und Reduced Motion werden in einer global wiederverwendbaren Carousel-Komponente gepflegt. Inhalt, Card-Abmessungen, Glow und fachliche Beschriftung bleiben über Props/Slots flexibel.
- **D-19:** Vor Änderungen wird ein verbindliches Carousel-Inventar erstellt: alle `FocalCarousel`-Nutzungen, lokale Scroll-/Snap-Implementierungen, bewusst abweichende Navigationskomponenten und sinnvolle Migrationskandidaten. Keine neue parallele Carousel-Logik.
- **D-20:** Vor Bronze ist das verdiente Einstiegs-Badge die große Medaille. Die Leiste zeigt den Weg bis Bronze, zum Beispiel `5 von 12 · Noch 7 bis Bronze`.
- **D-21:** Bei Platin sind alle fünf Medaillen farbig, Platin ist groß und als aktuell markiert. Die volle Leiste bleibt sichtbar und zeigt `510 Mitwirkungen · Höchste Stufe erreicht`.
- **D-22:** Unterschreitet die Netto-Anzahl durch Storno eine Schwelle, erfolgt die Live-Rückstufung sofort. Große Medaille, gesperrte Stufen, Fortschritt und nächstes Ziel werden neu berechnet.
- **D-23:** Fällt eine Rolle auf null bestätigte Mitwirkungen, verschwindet ihre ganze Card. Es gibt keine leere oder vollständig gesperrte Rollen-Card.

### the agent's Discretion
- Exakte responsive Pixelwerte innerhalb der in D-08/D-13 festgelegten visuellen Wirkung.
- Physikparameter für Momentum, Dämpfung und Snap-Dauer, solange D-10 bis D-15 und Barrierefreiheit erfüllt sind.
- Interner Prop-/Hook-Schnitt der globalen Komponente nach Inventar und bestehendem UI-System.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Extend the existing `FocalCarousel`; do not create a second carousel or add a dependency. It already owns one keyboard station, arrows, pointer drag, native scroll snap, grid expansion, and two productive consumers. It lacks wheel routing, velocity/momentum, continuous distance-based item state, JavaScript reduced-motion handling, a counter, and layout-safe endpoint centering. [VERIFIED: codebase grep]

Build role cards inside the existing `MemberBadgeChain` role group and retain earned-badge-only visibility. The public profile currently returns only the highest role-volume badge code, not the exact role count. Exact progress therefore requires enriching the existing synthetic `PublicMemberBadge` from the already-loaded `RoleVolumeCount`; this is a narrow existing-contract extension, not a new endpoint or query. [VERIFIED: codebase grep]

**Primary recommendation:** plan three slices: exact role projection/contract; global carousel interaction consolidation; role-card composition plus focused and live responsive UAT. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Net role count and threshold projection | API / Backend | Database / Storage | The repository owns the awarded lifecycle count and reversal semantics. [VERIFIED: codebase grep] |
| Public profile transport | API / Backend | Frontend Server (SSR) | `PublicMemberBadge` is already embedded in the profile response. [VERIFIED: codebase grep] |
| Role-card presentation | Browser / Client | Frontend Server (SSR) | `MemberBadgeChain` receives and presents the SSR payload. [VERIFIED: codebase grep] |
| Drag/wheel/momentum/snap/keyboard | Browser / Client | — | These reusable DOM responsibilities already live in `FocalCarousel`. [VERIFIED: codebase grep] |
| Badge artwork | CDN / Static | Browser / Client | Art is served from tracked `frontend/public/member-achievement-badges`. [VERIFIED: codebase grep] |

## Project Constraints (from AGENTS.md)

- Work and checks run only in `/home/d1sk/team4s` via SSH; runtime dependencies stay in Compose. [VERIFIED: AGENTS.md]
- Search first, extend matching global/API seams, and align OpenAPI, Go DTO, TypeScript DTO, and runtime behavior. [VERIFIED: AGENTS.md]
- Use global UI components, scoped diffs, and correct German umlauts. [VERIFIED: AGENTS.md]
- Live UAT uses the in-app browser at `http://127.0.0.1:3300`; headless tests are supporting evidence. [VERIFIED: AGENTS.md]
- Run focused tests, typecheck, lint, build if feasible, and `git diff --check`; isolate pre-existing failures. [VERIFIED: AGENTS.md]
- No database migration/backfill is warranted for this read-time projection. [VERIFIED: AGENTS.md]

## Mandatory Search-First Carousel Inventory

| Location | Kind | Decision |
|---|---|---|
| `frontend/src/components/ui/FocalCarousel.tsx` + CSS/tests | Global carousel | Extend for all physics, visual interpolation, counter, reduced motion, geometry. [VERIFIED: codebase grep] |
| `MemberBadgeChain.tsx` | Productive consumer | Keep; compose role cards through render props/classes. [VERIFIED: codebase grep] |
| `FansubProjectsGrid.tsx` | Productive consumer | Keep and regression-test shared changes. [VERIFIED: codebase grep] |
| `AnimeRelations.tsx` + CSS | Local horizontal snap gallery | Genuine later migration candidate, but out of scope: start-aligned relation gallery with different overflow affordances. [VERIFIED: codebase grep] |
| `MemberSectionNav`, `FansubSectionNav`, `EpisodeManager` | Section/form navigation | Intentionally different; do not migrate. [VERIFIED: codebase grep] |
| `DatePicker`, `FansubEditHeaderCard` | Trigger/tab visibility | Intentionally different; do not migrate. [VERIFIED: codebase grep] |
| `AnimeGridScrollRestorer` | Page restoration | Intentionally different; do not migrate. [VERIFIED: codebase grep] |
| `GroupMediaReviewSection`, `Team4sCropper` | Reorder/crop drag | Different domain interaction; do not migrate. [VERIFIED: codebase grep] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---|---:|---|---|
| React | 18.3.1 | Stateful shared component | Existing runtime. [VERIFIED: npm list in Compose] |
| Next.js | 16.1.6 | Public route/images | Existing runtime. [VERIFIED: npm list in Compose] |
| TypeScript | 5.9.3 | Typed state/DTOs | Installed compiler. [VERIFIED: npm list in Compose] |
| Pointer/Wheel/CSS Scroll Snap APIs | native | Input, scrolling, snap | Existing seam already uses them. [VERIFIED: codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| Vitest | 3.2.4 | Component regressions | Carousel/profile tests. [VERIFIED: npm list in Compose] |
| Testing Library React | 16.3.2 | Accessible DOM tests | Keyboard/labels/counter. [VERIFIED: npm list in Compose] |
| lucide-react | 0.469.0 declared | Lock/arrows | Preserve existing icons. [VERIFIED: frontend/package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Extend `FocalCarousel` | New carousel library | Rejected: parallel seam/dependency despite existing content/grid contract. [VERIFIED: codebase grep] |
| Scroll container + small rAF physics | Transform-only track | Transform-only recreates scrolling, focus, wheel/touch, and endpoints. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap] |

**Installation:** none. [VERIFIED: codebase grep]

## Architecture Patterns

### System Architecture Diagram

```text
GET public member profile
 -> MemberProfileRepository
    -> loadRoleVolumeCounts (awarded rows per role)
    -> enrich synthetic role badge DTO with exact count/next tier
 -> PublicMemberProfile.public_badges
 -> members/[slug]/page.tsx -> MemberBadgeChain
 -> earned-role visibility gate -> one role card per role
 -> global FocalCarousel
    -> pointer/touch/wheel/keyboard
    -> scroll position + velocity -> proximity state -> bounded snap
```

[VERIFIED: codebase grep]

### Recommended Project Structure
```text
backend/internal/repository/member_profile_role_volume_repository.go (+ tests)
backend/internal/models/member_profile.go
shared/contracts/openapi.yaml
frontend/src/types/profile.ts
frontend/src/components/ui/FocalCarousel.{tsx,module.css,test.tsx}
frontend/src/components/profile/MemberBadgeChain.{tsx,module.css,test.tsx}
frontend/src/components/profile/memberBadgeLabels.ts
frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
```
[VERIFIED: codebase grep]

### Pattern 1: Separate layout geometry from visual interpolation
Use untransformed `offsetLeft`/`offsetWidth` and container `clientWidth` for center targets; clamp to the scroll range and retain symmetric end spacers. Do not use transformed `getBoundingClientRect().width` for targets because it is visual geometry and caused the known last-card defect. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect] [VERIFIED: phase sketch 002]

Use center-distance only for continuous proximity and expose it through item state/CSS variables; the shared component calculates it while consumers own card dimensions/glow. [VERIFIED: codebase grep]

### Pattern 2: One interaction state machine
Pointer drag samples position/time and writes `scrollLeft`; release projects velocity to a bounded target and one `requestAnimationFrame` loop handles momentum/snap. Wheel input maps dominant delta and calls `preventDefault` only when movement remains; boundary events stay uncancelled for page scroll. Use a non-passive native wheel listener for conditional cancellation. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault]

Cancel animation on new input, unmount, item changes, and reduced-motion changes. Preserve click suppression only after the drag threshold. [VERIFIED: codebase grep]

### Pattern 3: Existing badge DTO as projection envelope
Populate progress fields from the same `RoleVolumeCount` used to choose the tier. Counts 1–11 have only entry badge; 12+ have entry plus highest volume badge. Enrich the synthetic role badge(s), preserve earned-only visibility, and avoid a new query/endpoint. [VERIFIED: codebase grep]

Update public DTO tier enums to include `platinum`; current Go fields exist, while OpenAPI/TypeScript document only contribution tiers. [VERIFIED: codebase grep]

### Anti-Patterns to Avoid
- **Transformed snap geometry:** never calculate targets from scaled rect widths. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect]
- **Binary active scaling:** `.itemWindowActive` alone cannot provide continuous interpolation. [VERIFIED: codebase grep]
- **Always consuming wheel:** traps page scrolling at endpoints. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event]
- **Guessed counts:** a tier code reveals a lower bound, not exact progress. [VERIFIED: codebase grep]
- **Focusable medals:** stages are content/status; keep one carousel tab station. [VERIFIED: 118-CONTEXT.md]
- **Migrating unrelated scroll controls:** their ownership differs. [VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Role count | Frontend count/new endpoint | `loadRoleVolumeCounts` + embedded badge DTO | Already applies awarded/live reversal. [VERIFIED: codebase grep] |
| Thresholds | Another 12/108/320/510 table | Existing backend selector and frontend threshold resolver | Prevent drift. [VERIFIED: codebase grep] |
| Carousel | Page-local hook | `FocalCarousel` | Two production consumers exist. [VERIFIED: codebase grep] |
| Motion preference | Custom setting | `matchMedia` + CSS media query | Platform contract. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion] |
| Artwork | New loader/naming | Existing artwork and layered resolvers | Preserves assets/fallbacks. [VERIFIED: codebase grep] |

**Key insight:** centralize interaction/geometry once; keep domain calculation in existing projection and label seams. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Endpoint centering changes with scale
**What goes wrong:** first/last card stops off-center. [VERIFIED: phase sketch 002]  
**Why:** transformed visual width contaminates target/spacer math. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect]  
**Avoid:** layout metrics plus geometry tests at three viewports. [VERIFIED: phase sketch 002]

### Pitfall 2: Wheel scroll trap
**What goes wrong:** page cannot continue vertically. [VERIFIED: 118-CONTEXT.md]  
**Why:** unconditional cancellation. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault]  
**Avoid:** consume only if movement remains in intended direction. [VERIFIED: 118-CONTEXT.md]

### Pitfall 3: Competing snap owners
**What goes wrong:** oscillation/double settling/stale active index. [ASSUMED]  
**Why:** native snap, smooth scroll, timers, and rAF all complete movement. [VERIFIED: codebase grep]  
**Avoid:** one owner per state; disable native snap during drag/momentum and clean up deterministically. [ASSUMED]

### Pitfall 4: Threshold/reversal drift
**What goes wrong:** exact boundaries or downward transitions show stale rank. [VERIFIED: 118-CONTEXT.md]  
**Avoid:** live projection and table tests at 0, 1, 11, 12, 107, 108, 319, 320, 509, 510. [VERIFIED: codebase grep]

### Pitfall 5: Shared consumer regression
**What goes wrong:** project preview expansion, links, or click suppression breaks. [VERIFIED: codebase grep]  
**Avoid:** always run `FansubProjectsGrid.test.tsx` with shared tests. [VERIFIED: codebase grep]

## Code Examples

```typescript
// Source: MDN CSSOM View semantics + project endpoint regression
function centerTarget(track: HTMLElement, item: HTMLElement) {
  const value = item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2
  return Math.max(0, Math.min(value, track.scrollWidth - track.clientWidth))
}
```
[CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect]

```typescript
// Source: MDN wheel/cancellation guidance; project boundary policy
function onWheel(event: WheelEvent) {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  const canMove = delta < 0 ? track.scrollLeft > 0 : track.scrollLeft < track.scrollWidth - track.clientWidth
  if (!canMove || !event.cancelable) return
  event.preventDefault()
  track.scrollLeft += delta
}
track.addEventListener('wheel', onWheel, { passive: false })
```
[CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event]

## State of the Art

| Old | Current | When | Impact |
|---|---|---|---|
| Page-local badge/project behavior | Shared `FocalCarousel` | commit 19621e8f, 2026-08-01 | Extend one seam. [VERIFIED: git log] |
| Highest role tier only | Raw exact count reusable internally | commit 5fa8f8a9, 2026-07-29 | Public profile can reuse helper without second query. [VERIFIED: git log] |
| Binary active scale | Distance-derived scale | Phase requirement | Required for direct feedback. [VERIFIED: 118-CONTEXT.md] |

**Deprecated/outdated:** the mockup's one-card wheel handler lacks boundary pass-through/momentum, and the current 120ms timer does not center free scrolling; neither is sufficient alone. [VERIFIED: phase sketch 002] [VERIFIED: codebase grep]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Layout-metric targets are stable in all supported browsers. | Pitfalls | Requires live cross-input UAT. |
| A2 | rAF momentum can coexist with temporarily disabled CSS snap. | Patterns | May require simplifying after browser testing. |

## Open Questions (RESOLVED)

1. **Metadata carrier — RESOLVED:** enrich both existing synthetic role badge carriers consistently from the same `RoleVolumeCount`; counts 1–11 use the entry carrier and 12+ keep entry plus volume carrier, while the frontend selects one role card per earned role. No new carrier, endpoint or query. [RESOLVED by 118-01]
2. **Counter API — RESOLVED:** extend `FocalCarousel` with an optional generic counter formatter/slot that defaults off; enable it only for the role consumer, leaving `FansubProjectsGrid` unchanged. [RESOLVED by 118-02]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---:|---|
| Frontend Compose | tests/build/UAT | ✓ | Node 20.20.2, npm 10.8.2 | — [VERIFIED: docker compose exec] |
| Backend Compose | profile projection | ✓ | running | — [VERIFIED: docker compose ps] |
| PostgreSQL Compose | integration tests | ✓ | PostgreSQL 16, healthy | — [VERIFIED: docker compose ps] |
| Browser tunnel | live UAT | ✓ documented | 127.0.0.1:3300 | Linux :3000 [VERIFIED: AGENTS.md] |

**Missing dependencies:** None. [VERIFIED: environment audit]

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest 3.2.4 + Testing Library 16.3.2; Go repository tests [VERIFIED: npm list/codebase grep] |
| Config | `frontend/vitest.config.ts`; Go package tests [VERIFIED: codebase grep] |
| Quick | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` [VERIFIED: package scripts] |
| Full | frontend `npm test`; relevant backend `go test` package [VERIFIED: package scripts] |

No formal Phase-118 requirement IDs exist; D-01–D-23 are the acceptance contract. [VERIFIED: 118-CONTEXT.md]

### Decisions → Test Map
| Decisions | Behavior | Type | File Exists? |
|---|---|---|---|
| D-01–04, D-20–23 | exact per-role thresholds/reversal/zero | unit + repository integration | ✅ extend |
| D-10–15 | interpolation, momentum, wheel boundaries, endpoints, reduced motion | geometry/component + live UAT | ✅ extend |
| D-16–17 | one tab station, arrows, counter, medals not tabbable | accessibility component | ✅ extend |
| D-05–09, D-13 | visual/responsive role cards | component + live browser | ✅ extend |
| D-18–19 | shared seam/project regression | component regression | ✅ extend |

### Wave 0 Gaps
- [ ] Geometry/rAF fixtures for `offsetLeft`, `offsetWidth`, `clientWidth`, `scrollWidth`. [VERIFIED: codebase grep]
- [ ] Exact-count contract/repository fixtures for boundaries/reversal. [VERIFIED: codebase grep]
- [ ] Live fixtures/profiles with zero, one, and multiple earned roles. [ASSUMED]

### Required Live UAT
- Desktop/tablet/mobile neighbor visibility, five medals without inner scroll, 240–260px mobile hero, wrapping copy. [VERIFIED: 118-CONTEXT.md]
- Pointer, touch, trackpad, vertical wheel, arrows, keyboard; boundary wheel pass-through and centered endpoints. [VERIFIED: 118-CONTEXT.md]
- Slow continuous interpolation, fast multi-card momentum, interruption, reduced motion. [VERIFIED: 118-CONTEXT.md]
- Entry and exact Bronze/Silver/Gold/Platinum, downward reversal, zero-role hiding. [VERIFIED: 118-CONTEXT.md]
- Use `http://127.0.0.1:3300/members/{slug}` through the user-visible profile flow. [VERIFIED: AGENTS.md]

## Security Domain

### Applicable ASVS Categories
| Category | Applies | Control |
|---|---|---|
| V2 Authentication | no | Public route/no new auth. [VERIFIED: codebase grep] |
| V3 Session | no | No session mutation. [VERIFIED: codebase grep] |
| V4 Access Control | yes | Preserve public earned-role filtering. [VERIFIED: codebase grep] |
| V5 Validation | yes | Clamp counts/progress/indices. [ASSUMED] |
| V6 Cryptography | no | No cryptography. [VERIFIED: phase scope] |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---|---|---|
| Non-public role disclosure | Information Disclosure | Visible roles only from public earned badges. [VERIFIED: quick 260802-c5f] |
| Event-loop jank | Denial of Service | One cancellable rAF loop and deterministic cleanup. [ASSUMED] |
| Contract drift | Tampering | Update Go/OpenAPI/TS/tests together. [VERIFIED: AGENTS.md] |

## Exact Planner Read-First / Change Set

**Read first:** Phase context, selected sketch HTML/READMEs, Phase 110/112 contexts, quick 260802-c5f; `FocalCarousel` TSX/CSS/tests/index; `MemberBadgeChain` TSX/CSS/tests/labels; `FansubProjectsGrid` TSX/CSS/test; member page/type; Go model/repository/tests; OpenAPI. [VERIFIED: codebase grep]

**Expected changes:** shared carousel TSX/CSS/tests; badge chain TSX/CSS/tests and possibly focused label resolver; Go role projection/tests, OpenAPI, and profile TypeScript type. Change project consumer production code only if the shared prop contract requires a small adaptation, but always run its test. [VERIFIED: codebase grep]

## Sources

### Primary (HIGH confidence)
- Project code, tests, contexts, sketches, Git history, Compose runtime/package tree. [VERIFIED: codebase grep]
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap [CITED: official MDN]
- https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect [CITED: official MDN]
- https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event [CITED: official MDN]
- https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault [CITED: official MDN]
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion [CITED: official MDN]

### Secondary (MEDIUM confidence)
None. [VERIFIED: research log]

### Tertiary (LOW confidence)
None; assumptions are isolated above. [VERIFIED: research log]

## Metadata

**Confidence breakdown:** stack HIGH (running runtime); architecture HIGH (direct source inspection); pitfalls HIGH for geometry/wheel/contracts and MEDIUM for physics tuning pending live browsers. [VERIFIED: npm list/codebase grep] [ASSUMED]

**Research date:** 2026-08-02  
**Valid until:** 2026-08-09. [ASSUMED]
