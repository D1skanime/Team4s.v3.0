---
task: 261105-ds2
title: Phase-192-Review Befunde 3 (Runde 2 von 2 Nachtrag)
subsystem: ui
tags: [react, nextjs, css-modules, vitest, playwright, design-system, storybook]

requires:
  - phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
    provides: AnimeEdgeNavigation, ReleasePreviewRow, compositeLayoutPurity.guard.test.ts, processHistory.regression.test.ts, and 42 other pilot files
provides:
  - AnimeEdgeNavigationPreviewCard (exported, hookless function component)
  - Button fullWidthBelowMd prop (+ CSS modifier + Storybook story)
  - ResponsiveImage fillWidth prop (+ CSS modifier)
  - compositeLayoutPurity.guard.test.ts with width:100% now flagged as a real violation
  - processHistory.regression.test.ts third describe block (PHASE_192_PILOT_FILES allowlist, 46 files)
affects: [frontend-ui-design-system, anime-detail-page]

tech-stack:
  added: []
  patterns:
    - "Hookless preview-card extraction + elements()-tree-walk test pattern (no fireEvent/render for pure display components)"
    - "Cluster align=\"stretch\" + Button fullWidthBelowMd replacing local width:100%/auto breakpoint CSS"
    - "ResponsiveImage fillWidth as an opt-in capability instead of a caller-supplied width:100%/height:auto className"
    - "Guard describe-block scoped to an explicit file allowlist + a narrower pattern set, instead of reusing a codebase-wide pattern array over a directory walk"

key-files:
  created: []
  modified:
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
    - frontend/src/components/anime/useAnimeEdgeNavigationHover.ts
    - frontend/src/components/ui/Button.tsx
    - frontend/src/components/ui/Button.module.css
    - frontend/src/components/ui/Button.stories.tsx
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/src/components/ui/ResponsiveImage.module.css
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css
    - frontend/src/components/fansubs/ReleasePreviewRow.test.tsx
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/components/anime/AnimeMediaProvider.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/ui/processHistory.regression.test.ts
    - docs/FRONTEND_ARCHITEKTUR.md
    - "...and 37 more of the 46 Phase-192 pilot files (comment-only cleanup, see Task 4 below)"

key-decisions:
  - "ReleasePreviewRow's removed .action width CSS needed an extra align-self:center fix (not in the original plan) because Cluster align=\"stretch\" affects the cross axis on BOTH breakpoint states (width when stacked, height when in a row) -- without it the Button would stretch to the row's full height on desktop."
  - "The guard's stricter width-height check (100% no longer exempt) surfaced two more pre-existing width:100% declarations outside ReleasePreviewRow (AnimeDetailHero.module.css .infoBanner, EpisodeGlassCard.module.css .card/.header) that the plan's research had not covered -- resolved via a new ResponsiveImage fillWidth capability and removal of genuinely redundant CSS (Card/DisclosureTrigger already default to full width)."

requirements-completed: []

duration: 29min
completed: 2026-11-05
---

# Phase-192-Review Befunde 3 (Runde 2 von 2 Nachtrag) Summary

**AnimeEdgeNavigationPreviewCard-Extraktion, Cluster/Button-Breiten-Grundbausteine statt lokalem CSS, 46-Datei-Planungsverweis-Bereinigung mit permanentem Allowlist-Guard**

## Performance

- **Duration:** ~29 min (erster bis letzter Commit)
- **Started:** 2026-11-05T10:35:20Z
- **Completed:** 2026-11-05T11:04:36Z
- **Tasks:** 4 (+ 2 kleine Nachkorrekturen, siehe Deviations)
- **Files modified:** 53 (3 Task 1, 15 Task 2 inkl. Deviation-Fix, 39 Task 4; 1 Datei in mehreren Tasks berührt)

## Accomplishments

- **Befund 1:** `AnimeEdgeNavigationPreviewCard` als eigenständige, exportierte, hookfreie
  Funktionskomponente extrahiert; der `fireEvent.mouseEnter`-Test ist durch einen direkten
  Funktionsaufruf + `elements()`-Baumwalk ersetzt (Muster aus `AnimeDetailView.test.tsx`
  übernommen).
- **Befund 2:** `ReleasePreviewRow.module.css` deklariert keine `width`-Eigenschaft mehr --
  `Cluster align="stretch"` übernimmt die Breitenfüllung im gestapelten Zustand, `Button`s neue
  `fullWidthBelowMd`-Prop (+ CSS + Storybook-Story) die Button-Breite. Der
  `compositeLayoutPurity.guard.test.ts`-Wächter erkennt `width:100%` jetzt als echten Verstoß
  bei weiterhin leerer Ausnahmeliste über alle neun bewachten Dateien.
- Ein Zero-Pixel-Diff-Nachweis (Playwright, Desktop 1440 + Mobil 390, vier Storybook-Varianten)
  bestätigt unveränderte Optik für `ReleasePreviewRow` zwischen dem Stand vor und nach Befund 2.
- **Befund 3:** alle 46 von Phase 192 geänderten Dateien sind frei von
  Befund-/Runden-/Plan-192-/Phase-192-Verweisen in Kommentaren/Testbeschreibungen.
  `processHistory.regression.test.ts` erzwingt das dauerhaft über einen dritten describe-Block
  mit expliziter 46-Datei-Allowlist und einem eigenen, kleineren Pattern-Set.
- Voller Regressionslauf (vitest: 470 Dateien/5913 Tests grün, tsc --noEmit: 0 Fehler) bleibt
  grün, bis auf drei bereits bestehende, umgebungsabhängige Fehlschläge (siehe unten).

## Task Commits

1. **Task 1: AnimeEdgeNavigationPreviewCard extrahieren, fireEvent-Test ersetzen** - `0382abe82` (refactor)
2. **Task 2: Cluster align="stretch" + Button fullWidthBelowMd statt lokalem Breiten-CSS** - `cfc60106c` (refactor)
   - Deviation-Fix (align-self:center) - `b2937ef72` (fix)
3. **Task 3: Zero-Pixel-Diff-Nachweis** - kein Code-Commit (nur temporäre Artefakte, vollständig entfernt)
4. **Task 4: 39 Dateien bereinigen, dauerhaften Guard ergänzen** - `a01476451` (docs)
   - Nachkorrektur (fireEvent-Stringrest) - `fd1860a64` (fix)

## Code-Review-Nachbesserung (nach `261105-ds2-REVIEW.md`)

Der automatische Code-Review (FULL_MODE) fand 0 kritische, 4 Warnungs- und 2 Info-Befunde. Fünf
davon wurden im selben Durchgang behoben (Commit `c1cccbf15`, Nachtrag `49dbff3ee`):

- **WR-01:** `Button.fullWidthBelowMd`s Kommentar behauptete fälschlich einen "garantiert
  synchronen" Haltepunkt mit `Cluster collapseBelow="md"` -- tatsächlich misst `Cluster` die
  Breite seines eigenen Container-Elements (`@container`), `fullWidthBelowMd` dagegen die
  Fensterbreite (`@media`); beide kippen nur synchron, wenn kein gepolsterter Vorfahre dazwischen
  liegt. Kommentar in `Button.tsx`/`Button.module.css` auf die ehrliche Einschränkung korrigiert,
  keine Verhaltensänderung (bewusst keine Container-Query-Umstellung, da das über den Auftrag
  hinausginge).
- **WR-02:** Systemische ASCII-Umlaut-Ersatzschreibung (ae/oe/ue statt ä/ö/ü) in einem Großteil der
  von diesem Auftrag neu geschriebenen/bearbeiteten Kommentare, quer über alle 53 berührten
  Dateien. Durch zwei aufeinanderfolgende, manuell gegengeprüfte Such-/Ersetzungsdurchgänge
  behoben (Ausschluss echter deutscher Wörter mit legitimem ae/oe/ue wie „Quelle“, „steuern“,
  „aktuell“, „manuell“, „dauerhaft“ von der Ersetzung).
- **WR-03:** `docs/FRONTEND_ARCHITEKTUR.md` wurde von Task 2 direkt bearbeitet, enthielt aber
  weiterhin Befund-/Runden-/Plan-192-Verweise in umliegenden Absätzen (außerhalb der
  46-Datei-Liste, die nur `frontend/` abdeckte). Verweise entfernt, fachlicher Inhalt erhalten.
- **WR-04:** `ResponsiveImage.tsx` enthielt einen vorbestehenden englischen Kommentar mit bloßem
  Planungs-Verweis („per P154-06“), obwohl die Datei von Task 2 direkt bearbeitet wurde. Auf
  Deutsch umformuliert, Planungs-Verweis entfernt.
- **IN-01:** `D-20`/`D-20-Folgefall`-Verweise in den von Task 2 direkt bearbeiteten Dateien
  `ReleasePreviewRow.tsx` und `EpisodeGlassCard.tsx` auf fachliche Erklärungen umformuliert
  (bewusst kein codebase-weiter `D-NN`-Sweep, da das dieselbe Cross-Phase-Falle wie bei Befund 3
  wiederholt hätte).
- **IN-02:** Ein-Zeilen-Hinweis in `Button.tsx`s JSDoc ergänzt, dass `fullWidthBelowMd` nicht
  gemeinsam mit `responsiveFullWidth` auf demselben Button verwendet werden soll (beide steuern
  dieselbe CSS-Eigenschaft gegenläufig, ohne gegenseitige Absicherung).

Nicht behoben (bewusst, laut Review selbst optional/außerhalb des Auftragsumfangs): keiner --
alle sechs Befunde wurden adressiert.

Nach der Nachbesserung erneut grün: `tsc --noEmit` (0 Fehler), beide permanenten Wächter
(`compositeLayoutPurity.guard.test.ts`, `processHistory.regression.test.ts`), sowie der volle
gezielte Testlauf über alle berührten Verzeichnisse (1560 von 1561 Tests grün; der eine
Fehlschlag in `ResponsiveImage.config.test.ts` ist umgebungsabhängig von `NEXT_PUBLIC_API_URL`
und besteht unverändert bereits auf dem Stand vor diesem Auftrag, siehe Verifikation).

_Hinweis: Task 3 erzeugte keinen eigenen Commit (reine Verifikation); die in Task 3 gefundene
Button-Vertikalstreckung wurde als Fix-Commit direkt nach Task 2 nachgezogen, siehe Deviations._

## Files Created/Modified

**Task 1 (3 Dateien):**
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `AnimeEdgeNavigationPreviewCard` exportiert
- `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` - direkter Funktionsaufruf-Test statt fireEvent
- `frontend/src/components/anime/useAnimeEdgeNavigationHover.ts` - Kommentar-Bereinigung

**Task 2 (15 Dateien inkl. Deviation-Fix):**
- `frontend/src/components/ui/Button.tsx`/`.module.css`/`.stories.tsx` - neue `fullWidthBelowMd`-Fähigkeit
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`/`.module.css`/`.test.tsx` - Cluster/Button statt lokalem Breiten-CSS
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - `100%`-Ausnahme entfernt, Selbsttest angepasst
- `docs/FRONTEND_ARCHITEKTUR.md` - `fullWidthBelowMd` dokumentiert
- `frontend/src/components/ui/ResponsiveImage.tsx`/`.module.css` - neue `fillWidth`-Fähigkeit (Deviation)
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`/`.tsx` - `.infoBanner` entfernt, nutzt `fillWidth` (Deviation)
- `frontend/src/components/anime/AnimeMediaProvider.tsx` - `AnimeInfoBanner` nutzt `ResponsiveImage` statt `next/image` direkt (Deviation)
- `frontend/src/components/fansubs/EpisodeGlassCard.module.css`/`.tsx` - redundante `.card`/`.header`-width:100%-Deklarationen entfernt (Deviation)

**Task 4 (39 Dateien, reine Kommentar-/Testbeschreibungs-Bereinigung + 1 Guard-Erweiterung):**
- `frontend/src/components/ui/processHistory.regression.test.ts` - dritter describe-Block, `PHASE_192_PILOT_FILES`-Allowlist (46 Einträge), `PHASE_192_FORBIDDEN_PATTERNS`
- 38 weitere Dateien unter `frontend/.storybook/mocks/`, `frontend/src/app/anime/[id]/`,
  `frontend/src/components/fansubs/`, `frontend/src/components/showcases/`,
  `frontend/src/components/ui/`, `frontend/src/components/watchlist/`, `frontend/src/lib/`,
  `frontend/src/styles/tokens/` (siehe `PLAN.md` Task 4 für die vollständige Liste)

## Decisions Made

- **Deviation (Rule 1 - Bug):** `ReleasePreviewRow`s Button bekam im Zeilen-Zustand (≥768px)
  durch `Cluster align="stretch"` eine unbeabsichtigte Vertikalstreckung (Streckung wirkt auf
  BEIDEN Achsen -- gestapelt Breite, Zeile Höhe). Der Playwright-Zero-Pixel-Diff-Nachweis in
  Task 3 fand dies (22-27k abweichende Pixel pro Desktop-Variante); behoben über
  `align-self: center` auf `.action` im Zeilen-Zustand. Nach dem Fix: `diffPixels=0` für alle
  acht Screenshot-Paare.
- **Deviation (Rule 1/3 - Bug/Blocker):** Die verschärfte `isSizeResetValue`-Prüfung (Entfernen
  der `100%`-Ausnahme) deckte zwei weitere, bisher unbemerkte `width:100%`-Deklarationen in
  anderen bewachten Komposit-Dateien auf, die das Plan/Research nicht identifiziert hatte:
  - `AnimeDetailHero.module.css`s `.infoBanner` (next/image-Banner, aktive Breiten-/Höhen-
    Entscheidung) -- gelöst über eine neue, wiederverwendbare `ResponsiveImage`-Fähigkeit
    (`fillWidth`), `AnimeInfoBanner` nutzt jetzt `ResponsiveImage` statt `next/image` direkt.
  - `EpisodeGlassCard.module.css`s `.card`/`.header` -- beide waren redundante Wiederholungen
    bereits vom jeweiligen Grundbaustein garantierter Standardbreiten (`Card` ist ein
    `display:grid`-Block-Element mit `width:auto`, `DisclosureTrigger` ist laut eigener Doku
    bereits "vollbreit") und entfielen ersatzlos.
- **Deviation (kleine Nachkorrektur):** Zwei Testbeschreibungen in
  `AnimeEdgeNavigation.test.tsx` erwähnten das Wort "fireEvent" noch als
  Vorher/Nachher-Erklärung (ohne den Aufruf selbst zu nutzen) -- der Plan verlangt aber
  wortwörtlich `grep -c fireEvent` == `0` für diese Datei. Beide Beschreibungen umformuliert,
  ohne fachliche Substanz zu verlieren.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button-Vertikalstreckung im Zeilen-Zustand von ReleasePreviewRow**
- **Found during:** Task 3 (Zero-Pixel-Diff-Nachweis)
- **Issue:** `Cluster align="stretch"` wirkt auf beiden Achsen; im Zeilen-Zustand (≥768px)
  streckte es den Button auf die volle, durch die mehrzeilige Textspalte vorgegebene
  Zeilenhöhe statt ihn auf seiner Standardhöhe zu belassen.
- **Fix:** `align-self: center` auf `.action` im `@media (min-width: 768px)`-Block ergänzt.
- **Files modified:** `frontend/src/components/fansubs/ReleasePreviewRow.module.css`
- **Verification:** Playwright-Zero-Pixel-Diff (acht Screenshot-Paare) zeigt `diffPixels=0`
  nach dem Fix, zuvor 22.723-27.168 abweichende Pixel pro Desktop-Variante.
- **Committed in:** `b2937ef72`

**2. [Rule 1/3 - Bug/Blocker] Zwei weitere width:100%-Verstöße durch verschärften Guard aufgedeckt**
- **Found during:** Task 2 (Verifikation nach Entfernen der `100%`-Ausnahme)
- **Issue:** `AnimeDetailHero.module.css`s `.infoBanner` und `EpisodeGlassCard.module.css`s
  `.card`/`.header` deklarierten ebenfalls `width:100%`, vom Plan/Research nicht erfasst (nur
  `ReleasePreviewRow.module.css` war identifiziert).
- **Fix:** `.infoBanner` entfällt, `ResponsiveImage` bekommt eine neue `fillWidth`-Fähigkeit,
  `AnimeMediaProvider.tsx`s `AnimeInfoBanner` nutzt sie statt `next/image` direkt.
  `.card`/`.header` entfallen ersatzlos (redundante Wiederholung bereits garantierter
  Grundbaustein-Standardbreiten).
- **Files modified:** `frontend/src/components/ui/ResponsiveImage.tsx`/`.module.css`,
  `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`/`.tsx`,
  `frontend/src/components/anime/AnimeMediaProvider.tsx`,
  `frontend/src/components/fansubs/EpisodeGlassCard.module.css`/`.tsx`,
  `frontend/.storybook/mocks/animeFixtures.ts` (Kommentar-Nachzug auf die neue Mechanik)
- **Verification:** `compositeLayoutPurity.guard.test.ts`s "neun Dateien, leere Ausnahmeliste"-
  Test bleibt grün; `EpisodeGlassCard.test.tsx`/`AnimeMediaProvider.test.tsx`/
  `ResponsiveImage.test.tsx` grün.
- **Committed in:** `cfc60106c`

**3. [Kleine Nachkorrektur] Wörtliches `grep -c fireEvent == 0`-Kriterium verfehlt**
- **Found during:** Nach Abschluss aller vier Tasks, beim Selbstcheck gegen die exakten
  Akzeptanzkriterien aus dem Plan.
- **Issue:** Zwei Testbeschreibungen in `AnimeEdgeNavigation.test.tsx` enthielten noch das
  Wort "fireEvent" als Vorher/Nachher-Erklärung.
- **Fix:** Beide Beschreibungen umformuliert, ohne den fachlichen Hinweis zu verlieren.
- **Files modified:** `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx`
- **Verification:** `grep -c fireEvent` liefert `0`; Tests weiterhin grün.
- **Committed in:** `fd1860a64`

---

**Total deviations:** 3 (2 Rule-1/3-Autofixes, 1 kleine Akzeptanzkriterium-Nachkorrektur)
**Impact on plan:** Alle drei notwendig, um die im Plan selbst festgelegten Akzeptanzkriterien
wortwörtlich zu erfüllen (Zero-Pixel-Diff, leere Guard-Ausnahmeliste über alle neun Dateien,
`grep -c fireEvent == 0`). Kein Scope-Creep über die drei ursprünglichen Befunde hinaus.

## Issues Encountered

**Pre-existing environment-dependent test failures (nicht durch diese Aufgabe verursacht):**
drei Testdateien scheitern beim direkten `npx vitest run` außerhalb von Docker Compose, da sie
Umgebungsvariablen/Dateipfade voraussetzen, die nur im Linux-Frontend-Compose-Service verfügbar
sind:
- `src/components/profile/badgeArtwork.test.ts` -- wirft explizit
  "Run the artwork catalog gate in the Linux frontend Compose service (API_INTERNAL_URL required)."
- `src/components/ui/ResponsiveImage.config.test.ts` -- ein Teiltest erwartet
  `NEXT_PUBLIC_API_URL` gesetzt (verifiziert: mit `NEXT_PUBLIC_API_URL=http://192.168.235.196:18092`
  gesetzt laufen alle 13 Tests grün).
- `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- liest
  `/backend/internal/permissions/permissions.go`, nur im Compose-Mount vorhanden.

Keine dieser drei Dateien wurde von dieser Aufgabe angefasst; alle drei sind unabhängig von den
hier behobenen Befunden 1-3. Reproduzierbar: `NEXT_PUBLIC_API_URL=... npx vitest run
src/components/ui/ResponsiveImage.config.test.ts` läuft grün.

## User Setup Required

None - keine externe Dienstkonfiguration nötig.

## Next Phase Readiness

- Phase 192 ist damit vollständig abgeschlossen -- alle drei offenen [high]-Review-Befunde
  (Runde 2 von 2) sind behoben, der permanente Phase-192-Allowlist-Guard verhindert einen
  Rückfall in Planungsverweise für alle 46 Pilot-Dateien dauerhaft.
- Live-Browser-UAT (Hover-Vorschaukarte, ReleasePreviewRow-Layout auf Desktop/Mobil) steht als
  abschließende menschliche Prüfung noch aus (gemäß `ki-run`-Workflow, kein Zwischen-Checkpoint
  in diesem Auftrag).

## Self-Check: PASSED

- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` enthält `AnimeEdgeNavigationPreviewCard`: FOUND
- `frontend/src/components/ui/Button.module.css` enthält `.buttonFullWidthBelowMd`: FOUND
- `frontend/src/components/ui/ResponsiveImage.module.css` enthält `.fillWidth`: FOUND
- `frontend/src/components/ui/processHistory.regression.test.ts` enthält `PHASE_192_PILOT_FILES`: FOUND
- Commit `0382abe82`: FOUND (`git log --oneline --all`)
- Commit `cfc60106c`: FOUND
- Commit `b2937ef72`: FOUND
- Commit `a01476451`: FOUND
- Commit `fd1860a64`: FOUND
- `grep -c fireEvent frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` == `0`: CONFIRMED
- `grep -nP '(?<!min-)width\s*:' frontend/src/components/fansubs/ReleasePreviewRow.module.css` == kein Treffer: CONFIRMED
- 46-Datei-Scan auf Befund-/Runden-/Plan-192-/Phase-192-Muster: 0 Treffer: CONFIRMED
- `git worktree list`: nur Haupt-Worktree: CONFIRMED
- `git status --short` (Code-Dateien): clean (nur `.planning/`-Artefakte untracked): CONFIRMED

---
*Task: 261105-ds2*
*Completed: 2026-11-05*
