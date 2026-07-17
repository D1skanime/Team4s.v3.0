---
quick_task: 260717-lqt
status: planned
scope: Desktop-Maximalbreite der öffentlichen Fansub-, Projekt- und Release-Seiten vereinheitlichen
canonical_routes:
  - /fansubs/[slug]
  - /fansubs/[slug]/fansubprojekt/[animeSlug]
  - /fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]
---

# Quick Task 260717-lqt: Einheitliche Desktop-Maximalbreite

## Ziel

Die öffentliche Fansub-, Fansub-Projekt- und Release-Detailseite verwenden auf Desktop dieselbe Seitenbreite. Maßgeblich bleibt die vorhandene Fansubseite; Projekt- und Release-Inhalte werden nur horizontal erweitert und nicht neu gestaltet. Bestehendes Mobile-Verhalten bis einschließlich 768 px bleibt unverändert.

## Vorab-Befund und Breitenvertrag

Die tatsächliche Referenz steht in `frontend/src/app/fansubs/[slug]/page.module.css`:

- Standard-Desktop: `.page`, `.heroFg` und `.gridSection` verwenden `1360px` mit `48px` Viewport-/Innen-Gutter.
- Breite Desktops ab `1600px`: dieselben Wrapper wechseln auf `1480px` mit `64px` Gutter.
- Die Projektseite ist derzeit bei `1200px` gedeckelt (`page.module.css`: `.page` und `.heroFg`).
- Die Release-Detailseite ist derzeit bei `1180px` gedeckelt (`releases/[releaseVersionId]/page.module.css`: `.page`).

Der Quick Task macht deshalb `1360px`, beziehungsweise `1480px` ab 1600 px, zum gemeinsamen öffentlichen Desktop-Vertrag. Die Werte werden zentral als semantische CSS-Variablen definiert, statt denselben Media-Query-Vertrag in drei CSS-Modulen parallel zu pflegen.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/styles/globals.css`
- `frontend/src/app/fansubs/[slug]/page.tsx`
- `frontend/src/app/fansubs/[slug]/page.module.css` — kanonische Breitenquelle und Mobile-Override
- `frontend/src/components/fansubs/FansubHeroSection.tsx` — Verbraucher von `.heroFg`
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` — Pretty Route verwendet dieselbe `ProjectPage`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx` — Pretty Route verwendet dieselbe `ReleaseDetailPageContent`
- `frontend/src/app/fansubs/__tests__/page.test.tsx`

## Plan

### Task 1 — Einen gemeinsamen öffentlichen Desktop-Breitenvertrag einführen

**Dateien:**

- `frontend/src/styles/globals.css`
- `frontend/src/app/fansubs/[slug]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`

**Umsetzung:**

1. In `globals.css` zwei fachlogikfreie Layout-Tokens definieren: gemeinsames Public-Page-Maximum `1360px` und Gutter `48px`; im bestehenden Desktop-Breakpoint `min-width: 1600px` auf `1480px` und `64px` erhöhen. Keine zweite Farbsprache, Komponente oder Route hinzufügen.
2. In der Fansub-CSS die Literalwerte von `.page`, `.heroFg` und `.gridSection` durch diese Tokens ersetzen. Die gerenderte Fansubseite muss pixelgleich bleiben; die vorhandene Mobile-Regel `max-width: 767px` bleibt erhalten.
3. Projekt `.page` und Release `.page` ausschließlich ab `min-width: 769px` auf `width: min(<gemeinsames Maximum>, 100% - <gemeinsamer Gutter>)` umstellen und die alten `1200px`-/`1180px`-Deckel entfernen. Die bestehenden vertikalen Abstände bleiben bestehen.
4. Die sichtbaren Projekt-/Release-Inhaltskanten auf Desktop mit dem halben gemeinsamen Gutter ausrichten. Der Projekt-Hero darf keinen verbleibenden `1200px`-Innendeckel behalten; `.heroFg` nutzt innerhalb des bereits gedeckelten Seitenwrappers die verfügbare Breite. Mobile Regeln und mobile Hero-/Galerie-/Timeline-Kompositionen werden nicht angefasst.

**Akzeptanz:**

- Bei einem 1440-px-Viewport sind alle drei äußeren Public-Page-Wrapper exakt `1360px` breit.
- Ab 1600 px sind alle drei bei maximal `1480px` gedeckelt; der Desktop-Gutter beträgt `64px`.
- Projekt-Hero, Projektsektionen und Release-Sektionen nutzen die verbreiterte Fläche sichtbar und behalten gemeinsame linke/rechte Inhaltskanten.
- Die Fansubseite ändert ihr vorhandenes Aussehen nicht; bis 768 px bleibt Projekt-/Release-Mobile-Layout unverändert.
- Es entsteht nur ein Breitenvertrag in `globals.css`, keine drei neu duplizierten Media-Query-Werte.

### Task 2 — Breitenvertrag automatisiert und live verifizieren

**Dateien:**

- `frontend/src/app/fansubs/__tests__/publicPageWidthContract.test.ts` (neu)
- `.planning/quick/260717-lqt-desktop-maximalbreite-von-fansub-projekt/260717-lqt-SUMMARY.md` (durch Executor)

**Umsetzung:**

1. Einen fokussierten CSS-Quellvertragstest ergänzen, der die zentralen `1360px`-/`1480px`-Tokens und deren Verwendung in Fansub-, Projekt- und Release-CSS absichert; zusätzlich beweisen, dass Projekt/Release keinen eigenen `1200px`-/`1180px`-Seitendeckel mehr führen und die Desktop-Regel Mobile nicht überschreibt.
2. Fokussierten Test, Typecheck, Lint und `git diff --check` ausführen. Build nur auslassen, wenn die lokale Umgebung ihn nachweislich verhindert; Grund im Summary festhalten.
3. Live-UAT im Codex-In-App-Browser auf den drei realen Pretty Routes bei mindestens 1440×900 und 1600×900 durchführen. Über `getBoundingClientRect()` die äußere Main-Breite und die sichtbaren Inhaltskanten vergleichen; zusätzlich 390×844 als Mobile-Sanity-Check prüfen.
4. Nur die oben genannten Dateien committen. Vorhandene Änderungen in `.planning/ROADMAP.md`, `.planning/STATE.md`, Phase 103/104 und `tmp/` bleiben unangetastet; der GSD-Orchestrator ergänzt Quick-State und Abschlusscommit separat.

## Verifikation

1. Fokussierter Vertragstest:
   - `cd frontend && npx vitest run src/app/fansubs/__tests__/publicPageWidthContract.test.ts "src/app/anime/[id]/group/[groupId]/page.test.tsx"`
2. Frontend:
   - `cd frontend && npm run typecheck`
   - `cd frontend && npm run lint`
   - `cd frontend && npm run build` (wenn lokal ausführbar)
3. Repository:
   - `git diff --check`
   - Diff-Selbstreview: keine API-/Auth-/Media-/Ownership-Änderung, keine neue UI-Komponente, keine mobilen Selektoren verändert.
4. Live-UAT:
   - `http://127.0.0.1:3000/fansubs/c-subs`
   - `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed`
   - `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`
   - 1440×900: alle Main-Wrapper `1360px`.
   - 1600×900 oder breiter: alle Main-Wrapper höchstens `1480px`, sichtbare Inhaltskanten gleich ausgerichtet.
   - 390×844: keine horizontale Überbreite und keine Veränderung der vorhandenen mobilen Komposition.

## Nicht Teil dieses Quick Tasks

- Kein Redesign von Hero, Karten, Timeline, Galerie, Texten oder Playern.
- Keine Änderung an Routing, Daten, API-Verträgen, Auth, Capabilities oder Media-Ownership.
- Keine globale Änderung der bestehenden `.page-shell`-Breite für andere Plattformseiten.
