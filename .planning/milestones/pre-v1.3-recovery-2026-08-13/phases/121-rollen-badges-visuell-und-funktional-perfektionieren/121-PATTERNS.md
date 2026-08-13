# Phase 121: Rollen-Badges visuell und funktional perfektionieren - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 8
**Analogs found:** 8 / 8
**Baseline:** aktueller uncommittierter Linux-Arbeitsbaum; nichts davon zurücksetzen oder überschreiben.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component | transform | eigener Rollenpfad, Z. 466-635 | exact |
| `frontend/src/components/profile/RoleRankTrack.tsx` (optional) | component | transform | Inline-Track, Z. 615-634 | exact extraction |
| `frontend/src/components/profile/MemberBadgeChain.module.css` | styles | responsive transform | Rollenstyles, Z. 1123-1312 | exact |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` | test | DOM/A11y | bestehende Rollen-/Artwork-Tests | exact |
| `frontend/src/components/profile/memberBadgeLabels.ts` | utility | transform | Progress-Resolver, Z. 322-365 | exact |
| `frontend/src/components/profile/memberBadgeLabels.test.ts` | test | transform | Schwellenmatrix, Z. 193-218 | exact |
| `frontend/src/components/ui/FocalCarousel.test.tsx` | regression test | event-driven | Active/Nachbar/Motion, Z. 297-429 | exact |
| `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | regression test | event-driven | anderer Carousel-Consumer | role-match |

`FocalCarousel.tsx/.module.css` und `ResponsiveImage.tsx` sind Referenz-only; Shared nur bei belegtem, consumerseitig nicht lösbarem Defekt ändern.

## Pattern Assignments

### `MemberBadgeChain.tsx`

**Imports** (Z. 3-24):

```tsx
import { Badge, Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import {
  getMemberBadgePresentation,
  resolveRoleProgressPresentation,
  ROLE_VOLUME_TIER_THRESHOLDS,
} from './memberBadgeLabels'
import styles from './MemberBadgeChain.module.css'
```

Globale Primitive und lokale Domain-Resolver beibehalten; keine neue Bild-, Rollen- oder Schwellenquelle.

**Earned-only/Whitelist** (Z. 471-503):

```tsx
const knownRole = FANSUB_GROUP_ROLE_OPTIONS.some(
  (option) => option.code === presentation.roleCode,
)
if (!knownRole && !['admin', 'other'].includes(presentation.roleCode)) continue
const count = badge.current_count ?? fallbackCount
if (count < 1) continue
roleCounts.set(
  presentation.roleCode,
  Math.max(roleCounts.get(presentation.roleCode) ?? 0, count),
)
```

Diese Grenze bewahren: exakt 11 Familien; keine `fansub_lead`, `techadmin`, `gfxler`, Fremdrolle oder Aliasaggregation.

**Carousel state:** Aktuell ignoriert Z. 576 den zweiten Parameter. Muster aus `FocalCarousel.tsx:24-36,357-385,429-455`:

```tsx
renderItem={(row, state) => {
  // state.active/state.expanded steuern nur Klasse, Dichte und Details.
  // gleicher Key und gleicher Card-/Artwork-DOM-Baum.
}}
```

Kein lokaler Index und keine zweite Expanded-Komponente.

**Artwork/Image** (Z. 102-168,587-605):

```tsx
const artworkSrc = resolveBadgeArtwork(artworkItem.badge_code)
const layered = resolveLayeredRoleArtwork(artworkItem.badge_code)
<ResponsiveImage
  className={styles.roleArtworkFrame}
  src={layered.frameSrc}
  alt={heroAlt}
  width={1254}
  height={1254}
  sizes={ACTIVE_BADGE_SIZES}
  data-achievement-art={artworkItem.badge_code}
/>
```

Resolver nicht duplizieren. `resolveBadgeArtwork:131-137` besitzt den direkten Timing-Sonderfall; `resolveLayeredRoleArtwork:157-168` Motiv+Frame für alle 11 Familien. Vor Resolveränderung alle Timing-Ränge per Test festnageln. Der neue Track bleibt bildfrei.

**Progress** (Z. 608-634): ausschließlich `resolveRoleProgressPresentation(count)` für Rang, echten Count, Ziel, Rest, geklemmtes ARIA und Platin-Copy. Progressbar nur behalten, wenn sie neben dem Track zusätzliche korrekte Information trägt.

### Optional `RoleRankTrack.tsx`

Nur Inline-Track Z. 615-634 extrahieren. Keine Schwellen, Bilder, Navigation, Timer, Listener, Observer oder Messung.

```tsx
<ol aria-label={`Rangstufen für ${roleLabel}`}>
  {stages.map((stage) => (
    <li
      key={stage.tier}
      data-state={stage.state}
      aria-current={stage.state === 'current' ? 'step' : undefined}
    >
      <span aria-hidden="true" />
      <span>{stage.label}</span>
      {stage.state === 'current' ? <span>Aktuell</span> : null}
      {stage.state === 'locked'
        ? <span className={styles.visuallyHidden}>Gesperrt</span>
        : null}
    </li>
  ))}
</ol>
```

Genau fünf Stationen, reached/current/locked, genau einmal current, keine Buttons/Tabstops. Ohne klaren Gewinn inline belassen.

### `memberBadgeLabels.ts`

**Unterstrich-sicheres Parsing** (Z. 220-242):

```ts
const withoutPrefix = badgeCode.slice('role_volume_'.length)
const tier = ROLE_VOLUME_TIERS.find(
  (candidate) => withoutPrefix.endsWith(`_${candidate}`),
)
const roleCode = withoutPrefix.slice(0, -(tier.length + 1))
```

Nie `split('_')`; sonst brechen `quality_checker`, `raw_provider`, `project_lead`.

**Single source** (Z. 182-199,335-365): Einstieg=1, Bronze=12, Silber=108, Gold=320, Platin=510. Falls Track-Daten exportiert werden, `ROLE_PROGRESS_STAGES` fokussiert exportieren/erweitern, keine zweite Tabelle. Echter Count bleibt im Text, nur Progress/ARIA klemmt bei 510; Platin: „Höchste Stufe erreicht“.

### `MemberBadgeChain.module.css`

**Stabile Geometrie** (Z. 666-689; Dirty-Baseline):

```css
.roleHeroArtwork {
  width: 320px;
  height: 320px;
  transform: scale(0.84);
  transform-origin: center;
  transition: transform 210ms ease-out, filter 210ms ease-out, opacity 210ms ease-out;
}
.badgeWindowActive .roleHeroArtwork { transform: scale(1); }
.roleHeroArtwork img { width: 100%; height: 100%; object-fit: contain; }
```

Dominanz nur via Transform/Filter/Opacity; keine Größenanimation oder rangabhängige Kartenhöhe.

**Track** (Z. 1198-1236): `repeat(5,minmax(0,1fr))`, `min-width:0`, zentrierte Stage und locked-Opacity wiederverwenden. Current braucht sichtbaren Ring/Marker plus Text, nicht nur Farbe.

**Responsive** (Z. 1275-1312): 320/280/248-px Slots und 60/74/88-% Items als Basis. 390/768/1024/1440 prüfen. Bei itemabhängiger Breite bestehende Container-Seam Z. 1336-1362 erweitern. Kein Track-Overflow, keine zweite Mobile-Komponente. Expanded kompakt über `state.expanded`-Klasse/Data-Attribut.

### Tests

- `memberBadgeLabels.test.ts:193-218`: Matrix 0/1/11/12/107/108/319/320/509/510/>510, exakte Copy und ARIA-Klemmung; exportierte fünf Stufen in Reihenfolge.
- `MemberBadgeChain.test.tsx:292-428`: vorhandenes `it.each`-Artwork-Muster auf 11 Rollen × vier Ränge und Timing-Sources erweitern.
- `MemberBadgeChain.test.tsx:494-518`: fremde Rollen fehlen, earned Rolle behält fünf Stufen.
- `MemberBadgeChain.test.tsx:837-864`: fünf geordnete Listitems, reached/current/locked, genau ein `aria-current="step"`, keine Tabstops, Counts 356/687, Platin ohne Ziel, gleicher Baum active/inactive/expanded.
- `MemberBadgeChain.test.tsx:812-835,1179-1189`: transform-only Slots, responsive Containment und Dirty-Baseline bewahren.
- `FocalCarousel.test.tsx:297-429,507-548`: genau ein aktives Item, direkte Nachbarwahl ohne nested-control hijack, 210 ms, Reduced Motion sofort, Arrow/Home/End.
- `FansubProjectsGrid.test.tsx`: anderer Shared-Consumer muss grün bleiben.

### `ResponsiveImage.tsx` (reference-only)

Z. 10-27 reserviert Geometrie und fällt nach Next-Optimizer-Fehler einmal auf dieselbe URL mit `unoptimized` zurück. Kein `img`, eigener Loader oder lokaler Bildfehler-State.

## Shared Patterns

- **Fachliche Wahrheit:** `memberBadgeLabels.ts:182-199,335-365`.
- **Artwork:** `MemberBadgeChain.tsx:102-168`; Track bildfrei, Hero-Resolver erhalten.
- **Active/Expanded:** `FocalCarousel.tsx:24-36,357-385,429-455`; nur Render-State.
- **A11y:** Carousel-Region/Keyboard bewahren; Track als Liste mit `aria-current="step"`, sichtbarem „Aktuell“, locked-Text, ohne Interaktion.
- **Performance:** CSS/Container Queries; keine neuen Scroll-/Wheel-Listener, Timer, ResizeObserver, DOM-Messung oder Queue.
- **Fehler:** Bilder nur über `ResponsiveImage`; unbekannte Codes fallen in `getMemberBadgePresentation:245-257` neutral zurück.

## No Analog Found

Keine Lücke. `RoleRankTrack.tsx` wäre nur lokale Extraktion, kein generisches Achievement-Framework.

## Planner Read-First

`121-CONTEXT.md`, `121-RESEARCH.md`, `AGENTS.md`, Implementation-/UI-Verträge, dann `MemberBadgeChain.tsx`, `memberBadgeLabels.ts`, CSS, lokale Tests, `FocalCarousel.tsx/.test.tsx`, `ResponsiveImage.tsx`, `FansubProjectsGrid.test.tsx`. Vor Ausführung erneut Status und Diffs der bereits geänderten Badge-/Carousel-Dateien lesen.

## Metadata

**Search scope:** `frontend/src/components/profile`, `ui`, `fansubs/__tests__`
**Files scanned:** 10 plus Dirty-Diff und Projektverträge
**Pattern extraction date:** 2026-08-10
**Environment:** `/home/d1sk/team4s` auf `team4s-linux`; Compose lief.
