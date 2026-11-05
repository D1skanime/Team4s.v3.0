---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 29
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-28)
    provides: Card-Zweck-Stufen 'section'/'contextCard', widthPurpose/seamless (Plan 192-28), 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2 von 2)
provides:
  - "Avatar gewinnt eine vierte, kleinere Größenstufe size=\"xs\" (20px, --avatar-size-xs in palette.css) sowie einen optionalen bordered-Prop (Modifikatorklasse .avatarBordered, derselbe --border-on-media-Ton wie Divider/Cards Glas-Varianten) -- noch an keiner Aufrufstelle verdrahtet, bereit für Plan 192-32 (ReleasePreviewRow) bzw. 192-33 (FansubGroupPicker)"
  - "Button variant=\"chipGlass\" setzt jetzt einen eigenen --button-gap: var(--space-1) (4px statt der 10px-Standardlücke) -- gemessen exakt gegen den bisher lokal in FansubGroupPicker.module.css gesetzten Chip-Abstand, sodass ein künftiger Wechsel auf leftIcon Zero-Pixel-Diff bleibt (Plan 192-33)"
  - "ResponsiveImage gewinnt eine optionale roundedThumbnail-Prop (neues ResponsiveImage.module.css) für ein kleines, randloses Vorschau-/Miniaturbild (border-radius: var(--radius-sm); object-fit: cover) -- reproduziert exakt AnimeEdgeNavigation.module.css's bisherigen .previewCover-Wert, noch nicht verdrahtet, bereit für Plan 192-32"
affects: [192-32, 192-33]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Avatars bordered-Prop folgt demselben boolean-Modifikatorklassen-Muster wie Cards bleedBelowMd/seamless: eine eigene CSS-Klasse, nur gerendert wenn die Prop gesetzt ist, statt einer reinen CSS-Custom-Property (ein Rahmen ist eine An-/Abschaltung von Deklarationen, kein reiner Wert)"
    - "ResponsiveImages roundedThumbnail folgt demselben Prop-zu-Klasse-Muster, aber mit bewusstem Zero-Pixel-Diff-Schutz: className wird nur bei roundedThumbnail=true per classNames() mit der Rundungs-Klasse kombiniert, sonst bleibt der Aufrufer-Wert (auch undefined) exakt unverändert -- verhindert ein sonst durch next/image sichtbares leeres class=\"\"-Attribut bei bestehenden Aufrufstellen ohne eigenes className"
    - "Button.module.css's --button-gap-Override für chipGlass ist derselbe CSS-Custom-Property-Override-Hook wie Cards --card-padding-override/--card-width-override: eine Varianten-Klasse überschreibt die globale Basisregel-Variable, keine neue Selektor-Deklaration nötig"

key-files:
  created:
    - frontend/src/components/ui/ResponsiveImage.module.css
  modified:
    - frontend/src/components/ui/Avatar.tsx
    - frontend/src/components/ui/Avatar.module.css
    - frontend/src/components/ui/Avatar.stories.tsx
    - frontend/src/components/ui/Avatar.test.tsx
    - frontend/src/styles/tokens/palette.css
    - frontend/src/components/ui/Button.module.css
    - frontend/src/components/ui/Button.stories.tsx
    - frontend/src/components/ui/Button.test.tsx
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/src/components/ui/ResponsiveImage.stories.tsx
    - frontend/src/components/ui/ResponsiveImage.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Keine eigene --avatar-font-size-xs-Tokenstufe angelegt (weicht von den Plan-Interfaces ab, die nur die Größen-/Rand-Token nannten, aber implizit auch eine Schriftgröße brauchten): bei 20px Durchmesser ist das Initialen-Kürzel nur ein seltener Rückfall (Hauptfall ist ein kleines Gruppenlogo-Bild) -- .avatarXs liest stattdessen die bestehende --avatar-font-size-sm wieder, um components.css nicht über den im Plan genannten Dateikreis hinaus anzufassen"
  - "ResponsiveImages neue Fähigkeit wurde als Prop (roundedThumbnail?: boolean) statt als reiner className-Export umgesetzt (die vom Plan explizit genannte Alternative) -- konsistent mit Avatars bordered-Prop-Muster aus Task 1 und einfacher für die spätere Verdrahtung in Plan 192-32 (<ResponsiveImage roundedThumbnail /> statt className={styles.roundedThumbnail} manuell zu importieren)"
  - "Button.stories.tsx's neue chipGlass+leftIcon-Story nutzt ein lucide-react-Icon (Users) statt eines echten Gruppen-Logo-Bilds -- vermeidet einen Import von Avatar/ResponsiveImage in eine Grundbaustein-Story-Datei (catalogTaxonomy.test.ts prüft zwar nur die *.tsx-Komponente selbst, nicht die *.stories.tsx, aber ein Icon reicht aus, um den Abstand sichtbar zu demonstrieren; die reale Logo-Verdrahtung erfolgt erst in Plan 192-33)"
  - "chipGlass's --button-gap-Fix bleibt an der einzigen heutigen Aufrufstelle (FansubGroupPicker) unsichtbar, weil FansubGroupPicker.module.css's .chip dort weiterhin sein eigenes gap: var(--space-1) deklariert und dieses lokale CSS-Modul-gap in der Kaskade gewinnt -- Zero-Pixel-Diff für den Ist-Zustand bestätigt (grep zeigt keine andere chipGlass-Aufrufstelle außer der Storybook-Demo EffectsShowcase)"

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: 7min
completed: 2026-11-05
---

# Phase 192 Plan 29: Avatar xs/bordered, Button chipGlass-Lücke, ResponsiveImage-Rundung Summary

**Drei unabhängige Grundbaustein-Ergänzungen (Avatar 20px-Stufe + Rand-Modifikator, Button chipGlass-Abstands-Fix, ResponsiveImage Rundungs-Prop) als vorbereitete, noch unverdrahtete Bausteine für Runde 5 der Baustein-Reinheits-Gap-Closure.**

## Performance

- **Duration:** ~7 min (Commit-zu-Commit, 04:34:58-04:41:39 UTC)
- **Started:** 2026-11-05T04:34:58Z (ca.)
- **Completed:** 2026-11-05T04:41:39Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN)
- **Files modified:** 12 (plus 1 neu angelegt)

## Accomplishments
- `Avatar` kennt neben `sm`/`md`/`lg` jetzt `size="xs"` (20px, `--avatar-size-xs` in `palette.css`) und einen optionalen `bordered`-Prop (`.avatarBordered`, derselbe `--border-on-media`-Ton wie `Divider`/Cards Glas-Varianten) -- beide decken das Muster "kleines rundes/eingerahmtes Gruppen- oder Identitätsbild" ab, das aktuell noch lokal in `FansubGroupPicker.module.css` (20px-Logo) und `ReleasePreviewRow.module.css` (Avatar-Rand) dupliziert ist
- `Button variant="chipGlass"` setzt einen eigenen `--button-gap: var(--space-1)` (4px) mit deutschem Begründungs-Kommentar -- der Wert entspricht exakt dem bisher lokal in `FansubGroupPicker.module.css`s `.chip`-Klasse gesetzten Abstand, sodass ein künftiger Wechsel vom manuellen Kind-Element auf `leftIcon` keinen sichtbaren Sprung verursacht
- `ResponsiveImage` gewinnt eine neue, eigene `ResponsiveImage.module.css` mit einer `roundedThumbnail`-Prop, die `border-radius: var(--radius-sm); object-fit: cover;` anwendet -- reproduziert exakt `AnimeEdgeNavigation.module.css`s bisherigen `.previewCover`-Wert, mit bewusstem Zero-Pixel-Diff-Schutz (className bleibt ohne die Prop exakt der Aufrufer-Wert, kein leeres `class=""`-Attribut)
- Neue Storybook-Stories für alle drei Fähigkeiten (Avatar „Kleines Gruppenbild mit Rand", Button „Glas-Umschalt-Chip mit Icon", ResponsiveImage „Rundes Vorschau-Miniaturbild"), jeweils mit deutscher Zweck-Beschreibung
- `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert alle drei Ergänzungen an den jeweils thematisch passenden Stellen (Button/Card-Absatz, Bilder-Abschnitt)
- Nichts davon ist in diesem Plan an eine Komposit-Datei verdrahtet (laut Plan-Objective) -- Verdrahtung folgt in Plan 192-32 (`AnimeEdgeNavigation` → `roundedThumbnail`) und Plan 192-33 (`FansubGroupPicker` → Avatar `xs`/leftIcon, `ReleasePreviewRow` → Avatar `bordered`)

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: Avatar 'xs' size + bordered capability**
   - `56f97cfdb` (test) - RED: neue `Avatar.test.tsx`-Fälle für `size="xs"` (20px) und `bordered`
   - `315e91c9c` (feat) - GREEN: `AvatarSize`/`SIZE_PX` um `'xs'` erweitert, neue `--avatar-size-xs`-Token in `palette.css`, neue `.avatarXs`/`.avatarBordered`-Klassen in `Avatar.module.css`, neue Storybook-Stories
2. **Task 2: Button chipGlass --button-gap fix; ResponsiveImage rounded-thumbnail capability; docs**
   - `7ba270879` (test) - RED: neuer `Button.test.tsx`-Fall für `--button-gap: var(--space-1)` in `.buttonChipGlass`, zwei neue `ResponsiveImage.test.tsx`-Fälle für `roundedThumbnail`
   - `c239b111f` (feat) - GREEN: `.buttonChipGlass { --button-gap: var(--space-1); }` mit Begründungs-Kommentar, neue `Button.stories.tsx`-Story mit `leftIcon`, neue `ResponsiveImage.module.css` + `roundedThumbnail`-Prop, neue `ResponsiveImage.stories.tsx`-Story, `docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung aller drei Fähigkeiten

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Avatar.tsx` - `AvatarSize` um `'xs'` erweitert, neuer `bordered?: boolean`-Prop
- `frontend/src/components/ui/Avatar.module.css` - `.avatarXs`, `.avatarBordered`, `:not()`-Selektor um `.avatarXs` erweitert
- `frontend/src/components/ui/Avatar.stories.tsx` - `xs` in die Größen-Story aufgenommen, neue „Kleines Gruppenbild mit Rand"-Story
- `frontend/src/components/ui/Avatar.test.tsx` - zwei neue Testfälle (xs-Größe, bordered-Modifikator)
- `frontend/src/styles/tokens/palette.css` - neues `--avatar-size-xs: 20px;`-Token
- `frontend/src/components/ui/Button.module.css` - `.buttonChipGlass` setzt `--button-gap: var(--space-1)` mit Begründungs-Kommentar
- `frontend/src/components/ui/Button.stories.tsx` - neue „Glas-Umschalt-Chip mit Icon"-Story (`leftIcon`)
- `frontend/src/components/ui/Button.test.tsx` - neuer Testfall für `--button-gap`-Deklaration in `.buttonChipGlass`
- `frontend/src/components/ui/ResponsiveImage.tsx` - neuer `roundedThumbnail?: boolean`-Prop
- `frontend/src/components/ui/ResponsiveImage.module.css` - neu angelegt, `.roundedThumbnail`-Klasse
- `frontend/src/components/ui/ResponsiveImage.stories.tsx` - neue „Rundes Vorschau-Miniaturbild"-Story
- `frontend/src/components/ui/ResponsiveImage.test.tsx` - zwei neue Testfälle (Rundungs-Klasse, Zero-Pixel-Diff ohne die Prop)
- `docs/FRONTEND_ARCHITEKTUR.md` - Button/Card-Absatz und Bilder-Abschnitt um alle drei neuen Fähigkeiten ergänzt

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere die Entscheidung gegen eine eigene `--avatar-font-size-xs`-Tokenstufe, um `components.css` nicht über den im Plan genannten Dateikreis hinaus anzufassen, und die Entscheidung für eine `roundedThumbnail`-Prop statt eines reinen className-Exports bei `ResponsiveImage`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `.avatarXs` braucht eine eigene Schriftgröße, da die bestehende `:not(.avatarSm):not(.avatarLg)`-Fallback-Regel sonst auch auf `size="xs"` zugegriffen hätte**
- **Found during:** Task 1 (Avatar xs size implementation)
- **Issue:** Der bestehende Selektor `.avatar:not(.avatarSm):not(.avatarLg) { font-size: var(--avatar-font-size-md); }` hätte ohne Anpassung auch für `size="xs"`-Elemente gegolten (keine eigene `.avatarXs`-Ausnahme), da `.avatarXs` kein `.avatarSm`/`.avatarLg` ist -- ein 20px-Avatar hätte die für 48px kalibrierte `md`-Schriftgröße (`1rem`) für sein Initialen-Kürzel bekommen, deutlich zu groß für den Kreis.
- **Fix:** Selektor um `:not(.avatarXs)` erweitert; `.avatarXs` liest stattdessen die bestehende `--avatar-font-size-sm` (kein neues Token, siehe `key-decisions`).
- **Files modified:** `frontend/src/components/ui/Avatar.module.css`
- **Verification:** `Avatar.test.tsx` grün (7/7), `tsc --noEmit` sauber.
- **Committed in:** `315e91c9c` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Notwendig für eine korrekt lesbare Initialen-Darstellung bei der neuen 20px-Stufe; keine Verdrahtungs-/Scope-Erweiterung.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-32 kann `AnimeEdgeNavigation.module.css`s `.previewCover`-Rundung durch `<ResponsiveImage roundedThumbnail />` ersetzen (Fähigkeit in diesem Plan bereit, real gegen den aktuellen Zustand geprüft)
- Plan 192-33 kann `FansubGroupPicker`s rohes 20px-Kreis-Logo durch `<Avatar size="xs" .../>` und sein Icon/Label-Verhältnis über `Button`s `leftIcon`-Prop (jetzt mit korrektem `--button-gap`) ersetzen; `ReleasePreviewRow`s lokalen `.logo`-Rand kann derselbe Plan durch `<Avatar bordered />` ersetzen
- Keine Blocker: `npx vitest run src/components/ui/Avatar.test.tsx src/components/ui/Button.test.tsx src/components/ui/ResponsiveImage.test.tsx` (29/29) und `npx tsc --noEmit` beide grün; voller `npx vitest run`-Lauf (474 Dateien, 5844 Tests) zeigt 4 vorbestehende, von diesem Plan unberührte Fehlschläge (`badgeArtwork.test.ts`/`RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- beide brauchen Docker-/Backend-Umgebungsvariablen, die außerhalb des Compose-Containers fehlen; `ResponsiveImage.config.test.ts` -- bereits in `192-28-SUMMARY.md` als vorbestehend dokumentiert; `storyDisplayNames.german.test.ts` -- ein aus Plan 192-28s `Card.stories.tsx`-Story-Namen "AbschnittsPolsterung" stammender Fund, nicht durch diesen Plan verursacht)

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 12 modified files, the 1 newly created file (`ResponsiveImage.module.css`), and this
SUMMARY.md found on disk; all 4 task commits (`56f97cfdb`, `315e91c9c`, `7ba270879`,
`c239b111f`) found in git history.
