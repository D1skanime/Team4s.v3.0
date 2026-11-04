---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 15
subsystem: ui
tags: [react, css-modules, storybook, design-system, guard-test, stack, card, playwright, visual-regression]

requires:
  - phase: 192-13
    provides: "AnimeDetailHero.module.css Befund-B-Bereinigung + dokumentierte Guard-Ausnahmen"
  - phase: 192-14
    provides: "ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation Befund-B-Bereinigung + dokumentierte Guard-Ausnahmen"
provides:
  - "compositeLayoutPurity.guard.test.ts: permanenter, zeilenweiser Rückfall-Wächter für genau die vier Befund-B-Pilot-Dateien (AnimeDetailHero/ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation.module.css), mit selektor-genauer, einzeln begründeter Ausnahmeliste statt dateiweiter Lockerung"
  - "docs/FRONTEND_ARCHITEKTUR.md Abschnitt 8: 'Seiten vs. Bausteine'-Regel (Befund 22) explizit auf zusammengesetzte Baustein-Dateien selbst erweitert, compositeLayoutPurity.guard.test.ts als Durchsetzungsmechanismus benannt"
  - "AnimeDetailHero.tsx/.module.css: zwei beim Gründen des Guards in der tatsächlichen Dateilage neu entdeckte, echte Befund-B-Lücken geschlossen (.tagsSection -> Stack gap=\"tight\", .posterColumn-Mobil-Polsterung -> Card variant=\"publicPoster\"-Standardwert)"
  - "Card.module.css: .cardPublicPoster traegt jetzt analog zu .cardPublicHeroInfo einen eigenen responsiven Mobil-Standard-Innenabstand"
  - "Playwright-Vollbild-Byte-Diff-Nachweis (Desktop 1440/Mobil 390) gegen den unmittelbaren Vor-Befund-B-Commit: 0 Pixel Abweichung nach dem vollstaendigen 192-13/14/15-Umbau"
affects: []

tech-stack:
  added: []
  patterns:
    - "Zeilenweiser Selektor-Stack-Scanner (kein CSS-Parser) fuer Guard-Tests, die Deklarationen ihrem tatsaechlichen Selektor zuordnen muessen -- Kommentare werden newline-erhaltend entfernt (Zeilennummern bleiben fuer Fehlermeldungen exakt), mehrzeilige Komma-Selektoren ueber einen Zwischenpuffer zusammengefuegt, Ausnahmen gelten pro Selektor statt dateiweit"
    - "padding:/margin:-Deklarationen mit ausschliesslich Null-Werten (0/0px/0rem/0%, z. B. ein <ul>-Reset oder margin:0 fuer -webkit-line-clamp) zaehlen nicht als 'eigenes Layout-CSS' -- sie heben nur einen UA-Standard auf, dupliziere keinen Grundbaustein-Zweck"
    - "Visuelle Vor-/Nachher-Nachweise gegen eine zweite git-worktree-Baseline muessen den Commit UNMITTELBAR vor der zu pruefenden Aenderungsreihe verwenden, nicht einen aelteren Meilenstein -- ein spaeter, unverwandter, bereits reviewter visueller Fix (hier: 192-12s Banner-Platzhalter-Korrektur) zwischen Baseline und 'aktuell' erzeugt sonst einen irrefuehrenden, grossen Diff, der keine echte Regression ist"
    - "Statische Storybook-Builds (`storybook build` + ein winziger Node-eigener statischer Dateiserver) statt zweier gleichzeitiger `storybook dev`-Instanzen fuer Vor-/Nachher-Playwright-Vergleiche -- vermeidet die bekannte HMR-Churn-Instabilitaet paralleler Dev-Server (vgl. 192-14-SUMMARY.md), kein zusaetzliches npm-Paket noetig"

key-files:
  created:
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
  modified:
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/components/ui/Card.module.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Guard gruendet exakt auf der tatsaechlichen, per Read direkt eingelesenen Dateilage der vier Pilot-Dateien statt auf 192-13/14-SUMMARY.md's eigenen 'Guard exception'-Listen -- diese Listen waren unvollstaendig: .titleRow (explizit in Befund B's Original-Verstossliste genannt), die per-child-Rhythmus-Geschwister von .infoCardBody (.badges/.description/.statsRow/.relatedSection), .edgeNavigationOverlay (Mobil) und AnimeEdgeNavigations .previewType hatten eigenes, nicht dokumentiertes Layout-CSS"
  - "Von den neu entdeckten Luecken wurden zwei tatsaechlich behoben (nicht nur dokumentiert), weil beide exakt auf ein bereits im selben Baustein etabliertes Muster passen und mit Zero-Pixel-Diff-Garantie migrierbar waren: .tagsSection -> Stack gap=\"tight\" (identischer Pixelwert wie das bisherige lokale gap, exakt dasselbe Muster wie das benachbarte .genresSection), .posterColumn-Mobil-Padding -> Card variant=\"publicPoster\"-eigener responsiver Standardwert (identischer Mechanismus wie .cardPublicHeroInfo aus 192-13, einzige Aufrufstelle bestaetigt)"
  - "Die uebrigen neu entdeckten Luecken (.titleRow, die .infoCardBody-Geschwister, .edgeNavigationOverlay, .previewType) wurden NICHT behoben, sondern als eng begruendete, einzeln zitierte Ausnahmen dokumentiert -- jede erfordert entweder eine Grundbaustein-Faehigkeit, die weder Stack noch Cluster besitzen (haltepunktabhaengige Richtungsumkehr bzw. bedingtes Ein-/Ausschalten von Flex), oder eine spekulative neue Einzel-Aufrufstellen-Grundbaustein-Erweiterung ohne belegten Wiederverwendungsbedarf -- per 192-CONTEXT.md's Addendum ausdruecklich als zulaessiger Ausweg genannt ('falls tatsaechlich jede einzelne Luecke einen eigenen, nicht generalisierbaren Wert braucht -- technisch als Einzelfall-Ausnahme im neuen Guard dokumentieren')"
  - "Visueller Nachweis nutzt den Commit unmittelbar VOR Plan 192-13 (d1125b317) als Baseline, nicht den vom Plan-Text urspruenglich genannten 'pre-192-11'-Commit (069f96360) -- letzterer enthielt noch den von Plan 192-12 bereits behobenen, sichtbaren Banner-Platzhalter-Fehler, dessen Differenz faelschlich als 'Regression' dieses Plans erschienen waere, obwohl sie ein unabhaengiger, laengst reviewter Fix ist"

patterns-established:
  - "Guard-Tests, die mehrere zusammengesetzte Dateien mit individuell begruendeten Ausnahmen pruefen, bauen einen Selektor-Stack per Zeilen-Scan statt eines CSS-Parsers und validieren die Ausnahmeliste selbst gegen die realen Dateien (toter Ausnahme-Eintrag = eigener fehlschlagender Test)"

requirements-completed: [Befund-B]

duration: ~70min
completed: 2026-11-04
---

# Phase 192 Plan 15: Composite-Layout-Reinheits-Guard + Doku + Bildnachweis Summary

**Permanenter, selektor-genauer Guard-Test (`compositeLayoutPurity.guard.test.ts`) schliesst die Lücke, durch die eigenes Layout-CSS in den vier Befund-B-Pilot-Bausteinen mehrere Runden unentdeckt blieb -- beim Gründen in der tatsächlichen Dateilage (statt der 192-13/14-Zusammenfassungen) wurden zwei weitere, echte Lücken gefunden und auf bereits etablierte Grundbaustein-Muster migriert (`.tagsSection` -> `Stack gap="tight"`, `.posterColumn`-Mobil-Padding -> `Card`-Variante), die restlichen fünf als präzise, einzeln begründete Ausnahmen dokumentiert; ein Playwright-Vollbild-Byte-Diff gegen den unmittelbaren Vor-Befund-B-Commit bestätigt 0 Pixel Abweichung.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-11-04
- **Tasks:** 2 (plus zwei zusätzliche, in Task 1 auto-gefixte Befund-B-Lücken)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `compositeLayoutPurity.guard.test.ts`: scannt exakt die vier Pilot-`.module.css`-Dateien zeilenweise über einen einfachen Selektor-Stack (keine CSS-Parser-Abhängigkeit), erkennt `display:flex`/`flex-direction`/`grid-template`/eine echte `gap:`-Deklaration/`padding(-*)`/`margin(-*)` sowie das Setzen (nicht Lesen) jeder privaten Grundbaustein-Variable (`--stack-*`/`--cluster-*`/`--split-*`/`--card-*-override`), gegen eine selektor-genaue, individuell zitierte Ausnahmeliste. Scannt NICHT `Stack`/`Cluster`/`SplitLayout`/`Divider.module.css`. Null-Wert-Resets (`padding:0`, `margin:0`) zählen bewusst nicht als Verstoß.
- Beim Gründen des Guards in der tatsächlichen (nicht der zusammengefasst-dokumentierten) Dateilage von `AnimeDetailHero.module.css` wurden zwei echte, bislang unentdeckte Befund-B-Lücken gefunden und behoben: `.tagsSection` deklarierte weiterhin eigenes `display:flex;flex-direction:column;gap:` (jetzt `Stack gap="tight"`, identischer Pixelwert, exakt das bereits etablierte `.genresSection`-Muster); `.posterColumn`s Mobil-Padding war ein lokaler Override der Card-Variante, die `.posterColumn` selbst IST (jetzt `Card.module.css`s `.cardPublicPoster`-eigener responsiver Mobil-Standardwert, derselbe Mechanismus wie `.cardPublicHeroInfo` aus 192-13).
- Fünf weitere, beim Gründen gefundene Fälle (`.titleRow`, die per-child-Rhythmus-Geschwister von `.infoCardBody`, `.edgeNavigationOverlay`s Mobil-Umschaltung, `AnimeEdgeNavigation`s `.previewType`) sind jeweils als eigener, einzeln begründeter Ausnahme-Eintrag dokumentiert -- keiner ist mit den bestehenden Grundbausteinen ohne spekulative Erweiterung oder echte Architekturänderung lösbar.
- `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 8 erweitert die "Seiten vs. Bausteine"-Regel (Befund 22) explizit auf zusammengesetzte Baustein-Dateien selbst und benennt `compositeLayoutPurity.guard.test.ts` als Durchsetzungsmechanismus.
- Visueller Nachweis: Playwright-Vollbild-Screenshots der `AnimeDetailHero`-Story (Desktop 1440px/Mobil 390px) aus zwei statischen Storybook-Builds (Commit `d1125b317`, unmittelbar vor Plan 192-13, vs. aktueller Stand nach 192-13/14/15) sind **byte-identisch** an beiden Haltepunkten -- 0 Pixel Abweichung über den vollständigen Befund-B-Umbau.

## Task Commits

Each task was committed atomically:

1. **Task 1: compositeLayoutPurity-Guard + zwei neu gefundene Befund-B-Lücken geschlossen** - `f02d7a221` (test)
2. **Task 2: FRONTEND_ARCHITEKTUR.md-Regel dokumentiert + Visualnachweis** - `0d45c5a1e` (docs)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Hinweis: Task 1 war `tdd="true"` im Plan markiert; da der Guard gegen den bereits bereinigten Ist-Zustand aufgebaut wird (kein neues Verhalten, sondern ein Regressions-Schutz), entspricht die Verifikation demselben in 192-13/14 etablierten Muster -- der Guard wurde zusätzlich durch einen manuellen, danach rückgängig gemachten Regressions-Test bestätigt (siehe Issues Encountered)._

## Files Created/Modified
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` (neu) - permanenter Guard mit `DOCUMENTED_LAYOUT_EXCEPTIONS` (9 Einträge, jeweils Datei+Selektor+zitierte Begründung), Selbsttests (bekanntes Verstoßmuster erkannt, Null-Werte nicht fälschlich erkannt, `var(...)`-Lesereferenz nicht fälschlich als `gap:`-Deklaration erkannt, Ausnahmeliste gegen reale Selektoren validiert)
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `.tagsSection`-`<div>` zu `<Stack gap="tight">` umgestellt
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.tagsSection`s eigene `display:flex;flex-direction:column;gap:`-Regel entfernt (Kommentar erklärt die Umstellung); `.posterColumn`s Mobil-`padding:` entfernt (per Card-Variante ersetzt)
- `frontend/src/components/ui/Card.module.css` - `.cardPublicPoster` bekommt im bestehenden `@media (max-width: 767px)`-Block einen eigenen `padding: var(--card-padding-override, var(--space-5) var(--space-5) 0)`-Standardwert
- `docs/FRONTEND_ARCHITEKTUR.md` - Abschnitt 8 um die Composite-Baustein-Reinheitsregel erweitert

## Decisions Made
Siehe `key-decisions` im Frontmatter für die vollständige Begründung zu: (1) Gründung des Guards in der tatsächlichen statt der zusammengefassten Dateilage, (2) welche neu gefundenen Lücken behoben vs. dokumentiert wurden und warum, (3) die Korrektur der visuellen Nachweis-Baseline von `069f96360` auf `d1125b317`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `.tagsSection` deklarierte weiterhin eigenes Layout-CSS, das bereits anderswo im selben Baustein durch Stack ersetzt worden war**
- **Found during:** Task 1 (Guard-Gründung in der tatsächlichen Dateilage)
- **Issue:** `AnimeDetailHero.module.css`s `.tagsSection { display:flex;flex-direction:column;gap:var(--space-2); }` war identisch zum bereits per `Stack gap="tight"` gelösten `.genresSection`-Fall (Poster-Spalte) -- 192-13s eigene "Guard exception"-Zusammenfassung erwähnte `.tagsSection` nur im Kontext von `.infoCardBody`s Margin-Rhythmus, nicht diese separate Flex/Gap-Regel.
- **Fix:** `<div className={styles.tagsSection}>` zu `<Stack gap="tight" className={styles.tagsSection}>` umgestellt; die lokale CSS-Regel entfernt. `var(--space-tight)` == `var(--space-2)`, identischer Pixelwert.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailHero.tsx`, `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`
- **Verification:** `page.test.tsx` (43 Tests, prüft u. a. `className`-basierte Element-Reihenfolge um `.tagsSection`) grün; Playwright-Byte-Diff am Ende des Plans bestätigt 0 Pixel Abweichung.
- **Committed in:** `f02d7a221` (Task 1 commit)

**2. [Rule 1 - Bug] `.posterColumn`s Mobil-Padding war ein lokaler Override der Card-Variante, die es selbst ist**
- **Found during:** Task 1 (Guard-Gründung in der tatsächlichen Dateilage)
- **Issue:** `.posterColumn` (explizit in Befund B's Original-Verstoßliste genannt) ist `Card variant="publicPoster"` -- die Mobil-Polsterung (`padding: var(--space-5) var(--space-5) 0`) lebte als lokale CSS-Regel in `AnimeDetailHero.module.css` statt als Teil der Card-Variante selbst, obwohl `.cardPublicPoster` bereits den Desktop-Standardwert (`0`) über Cards generischen Override-Hook trägt.
- **Fix:** Analog zu `.cardPublicHeroInfo`s bereits etabliertem responsiven Standardwert (192-13) bekommt `Card.module.css`s `.cardPublicPoster` im bestehenden Mobil-`@media`-Block ihren eigenen `padding: var(--card-padding-override, var(--space-5) var(--space-5) 0)`-Standardwert; `.posterColumn`s lokale Mobil-`padding:`-Deklaration entfernt (nur `align-items: center` bleibt lokal, kein Befund-B-Verstoß).
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`, `frontend/src/components/ui/Card.module.css`
- **Verification:** `Card.test.tsx`, `foreignVariableOverrides.regression.test.ts` (58 Tests) grün; bestätigt per Repo-weitem Grep, dass `variant="publicPoster"` nur an dieser einen Stelle verwendet wird (keine Fremdauswirkung); Playwright-Byte-Diff bestätigt 0 Pixel Abweichung.
- **Committed in:** `f02d7a221` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 -- echte, bislang unentdeckte Befund-B-Verstöße in explizit genannten Selektoren, keine Scope-Erweiterung über Befund B hinaus)
**Impact on plan:** Beide Fixes schließen Lücken, die Befund B's eigene, ursprüngliche Verstoßliste (192-CONTEXT.md) bereits namentlich nannte, aber 192-13 nicht vollständig behoben hatte. Ohne diese Fixes hätte der neue Guard entweder fehlschlagen oder zwei zusätzliche, unnötige (weil tatsächlich lösbare) Ausnahme-Einträge bekommen müssen -- beide Fixes sind risikoarm (identischer Pixelwert bzw. bereits etablierter Mechanismus) und per Zero-Pixel-Diff-Nachweis bestätigt.

## Known Stubs
Keine -- reine Test-/Dokumentations-/CSS-Umbau-Änderung ohne neue UI-Oberfläche.

## Issues Encountered
- **Guard-Regressionsnachweis:** Vor dem endgültigen Commit wurde testweise `display: flex;` in `AnimeEdgeNavigation.module.css`s `.previewCover` eingefügt (nicht Teil einer dokumentierten Ausnahme) -- der Guard schlug korrekt fehl, danach wurde die Änderung zurückgenommen und der Guard lief wieder grün. Bestätigt die Akzeptanzkriterien-Vorgabe "Re-introducing a raw `display: flex;` ... makes the guard fail".
- **Visuelle Nachweis-Baseline falsch gewählt, dann korrigiert:** Der erste Versuch (Baseline-Commit `069f96360`, "pre-192-11" laut ursprünglichem Plan-Text) zeigte einen großen, aber irreführenden Diff (Banner-Platzhalter-Fläche fast doppelt so hoch) -- Ursache war Plan 192-12s eigener, unabhängiger und bereits reviewter Sichtregressions-Fix ("Anime-Kopf-Banner-Platzhalter auf Landscape-Form umstellen"), der zwischen der gewählten Baseline und dem aktuellen Stand liegt. Baseline auf `d1125b317` (unmittelbar vor Plan 192-13, nach 192-12) korrigiert -- seitdem 0 Pixel Abweichung.
- **Lokale Storybook-Dev-Server-Instabilität:** Wie in 192-14-SUMMARY.md dokumentiert, zeigten parallel gestartete `storybook dev`-Instanzen wiederholt eine leere "no preview"-Seite nach HMR-Churn. Statt erneuter Dev-Server-Neustarts wurde auf zwei **statische** `storybook build`-Exporte umgestellt, bedient über einen winzigen, abhängigkeitsfreien Node-eigenen statischen Dateiserver (kein zusätzliches npm-Paket) -- deterministisch, keine HMR-Instabilität mehr. Alle temporären Skripte (`scripts/tmp-192-15-*.mjs`), Storybook-Builds (`/tmp/sb-build-*`) und die zweite Worktree (`/tmp/team4s-192-15-baseline2`) wurden nach Gebrauch gelöscht, nichts davon committet.
- Bereits dokumentierte, umgebungsbedingte Testfehler (unverändert, keine neuen): `ResponsiveImage.config.test.ts` (siehe `deferred-items.md`, Plan 192-02); zusätzlich zwei Tests, die einen Docker-/Backend-Mount voraussetzen (`badgeArtwork.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`) und in dieser Sandbox-Umgebung ohne `API_INTERNAL_URL`/`/backend`-Mount erwartungsgemäß fehlschlagen -- nicht von dieser Plan-Änderung verursacht.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund B ist für alle vier Pilot-Bausteine vollständig abgeschlossen und dauerhaft durch `compositeLayoutPurity.guard.test.ts` gegen Rückfälle geschützt.
- `docs/FRONTEND_ARCHITEKTUR.md` beschreibt die Regel; kein offener Doku-Punkt.
- Keine Blocker. Dies war der letzte der drei 192-13/14/15-Pläne, die Befund B gemeinsam schließen.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 5 claimed created/modified files confirmed present on disk; both task commits
(`f02d7a221`, `0d45c5a1e`) confirmed present in `git log --oneline --all`.
