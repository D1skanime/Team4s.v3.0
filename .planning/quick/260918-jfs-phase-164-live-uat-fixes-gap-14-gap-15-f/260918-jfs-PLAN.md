---
phase: quick-260918-jfs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/fansubs/episodePreviewFormat.ts, frontend/src/components/fansubs/episodePreviewFormat.test.ts, frontend/src/components/fansubs/FansubVersionBrowser.test.tsx, "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx", "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx", "frontend/src/app/anime/[id]/page.tsx", "frontend/src/app/anime/[id]/page.test.tsx", "frontend/src/app/anime/[id]/page.performance.test.ts", "frontend/src/app/anime/[id]/page.module.css", frontend/src/lib/api.ts, frontend/src/components/comments/CommentSection.tsx, frontend/src/components/comments/CommentSection.module.css, frontend/src/components/comments/CommentForm.tsx, frontend/src/components/comments/CommentForm.module.css, frontend/src/components/comments/CommentForm.test.tsx, frontend/src/components/comments/commentSectionState.ts, frontend/src/components/comments/commentSectionState.test.ts, frontend/src/components/anime/AnimeContributionsSection.tsx, frontend/src/components/anime/AnimeContributionsSection.module.css, frontend/src/components/anime/AnimeContributionsSection.test.tsx]
autonomous: true
requirements: [GAP-14, GAP-15]

must_haves:
  truths:
    - "Die Release-Datumszeile liest 'Fansub-Release vom TT.MM.JJJJ' statt 'Veröffentlicht am TT.MM.JJJJ' — sowohl im Release-Preview auf /anime/[id] als auch auf der öffentlichen Release-Detailseite"
    - "Fehlt das Release-Datum in der Preview-Zeile (episodePreviewFormat/ReleasePreviewRow), wird weiterhin keine Datumszeile gerendert (Fallback unverändert)"
    - "Die öffentliche Anime-Detailseite /anime/[id] rendert keinen Kommentarbereich mehr und löst keinen Kommentar-Request (getAnimeComments) mehr aus"
    - "Die öffentliche Anime-Detailseite /anime/[id] rendert keinen 'Mitwirkende Gruppen'-Bereich mehr"
    - "Admin-Formulare (z.B. Notizen-Status 'Veröffentlicht') sind vom Wortlaut-Wechsel unberührt"
    - "Backend (Kommentar-Endpunkte/-Tabellen, Mitwirkende-Gruppen-Daten) ist unverändert — nur Frontend-Wiring/Wortlaut wurde geändert"
  artifacts:
    - path: "frontend/src/components/fansubs/episodePreviewFormat.ts"
      provides: "formatReleaseDateLine mit neuem öffentlichen Wortlaut"
      contains: "Fansub-Release vom"
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx"
      provides: "Release-Datums-Label auf der Detailseite mit neuem Wortlaut"
      contains: "Fansub-Release vom"
    - path: "frontend/src/app/anime/[id]/page.tsx"
      provides: "Anime-Detailseite ohne CommentSection- und AnimeContributionsSection-Wiring"
    - path: "frontend/src/lib/api.ts"
      provides: "Kein getAnimeComments/buildCommentQuery/CommentListParams mehr; createAnimeComment bleibt erhalten"
  key_links:
    - from: "frontend/src/components/fansubs/ReleasePreviewRow.tsx"
      to: "formatReleaseDateLine"
      via: "dateLine-Berechnung aus version.release_date"
      pattern: "formatReleaseDateLine\\(version\\.release_date\\)"
    - from: "frontend/src/app/anime/[id]/page.tsx"
      to: "FansubVersionBrowser"
      via: "einzige verbleibende Sektion in contentArea (Comments/Contributions entfernt)"
      pattern: "FansubVersionBrowser"
---

<objective>
Zwei Live-UAT-Gaps vom 18.09.2026 beheben (standalone, kein Teil von Phase 164):

GAP-14: Die öffentlich sichtbare Release-Datumszeile ("Veröffentlicht am TT.MM.JJJJ") wird zu
"Fansub-Release vom TT.MM.JJJJ" umformuliert — das Datum ist das Datum, an dem die Fansub-Gruppe den
Release veröffentlicht hat, nicht ein Anime-Ausstrahlungsdatum. Betrifft die Release-Preview-Zeile auf
/anime/[id] (episodePreviewFormat.ts) und das Label auf der öffentlichen Release-Detailseite
(ReleaseDetailHero.tsx). Admin-Formulare bleiben unangetastet.

GAP-15: Die öffentliche Anime-Detailseite (/anime/[id]) verliert zwei Alt-Bereiche vollständig
(nicht versteckt): den Kommentarbereich (CommentSection + getAnimeComments-Fetch) und den
"Mitwirkende Gruppen"-Bereich (AnimeContributionsSection). Verwaiste Dateien (verifiziert per
Grep auf null verbleibende Importer) werden gelöscht; Backend bleibt unangetastet.

Purpose: Auftraggeber-Feedback aus der Live-UAT vom 18.09.2026 direkt umsetzen, ohne die laufende
Phase-164-Abnahme zu berühren.
Output: Aktualisierte öffentliche Wortlaut-Stelle für Release-Daten; bereinigte /anime/[id]-Seite ohne
Kommentar-/Mitwirkende-Gruppen-Bereich; grüne Tests, sauberer tsc/eslint-Lauf, live verifiziert per curl.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@frontend/src/components/fansubs/episodePreviewFormat.ts
@frontend/src/components/fansubs/ReleasePreviewRow.tsx
@frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
@frontend/src/app/anime/[id]/page.tsx
@frontend/src/lib/api.ts

<interfaces>
<!-- Aktueller Stand formatReleaseDateLine (episodePreviewFormat.ts, Zeilen 38-49) -->
Aktuelle Implementierung:
```
export function formatReleaseDateLine(value?: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const formatted = parsed.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return `Veröffentlicht am ${formatted}`
}
```
Nur der Rückgabe-String ändert sich (`Fansub-Release vom ${formatted}`); die
null-Rückgabe-Logik (fehlendes/ungültiges Datum) bleibt exakt gleich — Aufrufer
(ReleasePreviewRow.tsx, Zeile 39/75) rendern die Zeile weiterhin nur wenn `dateLine` nicht null ist.

<!-- Aktueller Stand ReleaseDetailHero.tsx technicalFacts (Zeile 77-86) -->
```
const technicalFacts = [
    ['Veröffentlicht', displayValue(formatDate(props.release_date))],
    ['Auflösung', displayValue(props.resolution)],
    ...
  ]
```
Nur das Label `'Veröffentlicht'` in dieser ersten Zeile wird zu `'Fansub-Release vom'`. Die
`displayValue(formatDate(...))`-Berechnung bleibt unverändert (inkl. "Nicht hinterlegt"-Fallback für
fehlendes Datum — dieses Raster zeigt für JEDES Technik-Feld immer einen Platzhalter, das ist
bestehendes, unverändertes Verhalten dieser Komponente und nicht Teil von GAP-14).

<!-- Aktueller Stand page.tsx SSR-Fetch-Block (Zeilen 98-117) -->
```
const [groupedEpisodesResult, commentsResult, relationsResult] = await Promise.allSettled([
    getGroupedEpisodes(anime.id, { projection: 'public', limit: 24, ...(resolvedFansubSlug ? { fansub: resolvedFansubSlug } : {}) }),
    getAnimeComments(animeID, { page: 1, per_page: 10 }),
    getAnimeRelations(anime.id),
  ])

  const groupedEpisodesResponse = groupedEpisodesResult.status === 'fulfilled' ? groupedEpisodesResult.value : null
  const fansubStoryGroups = buildFansubStoryGroups(animeFansubsResponse?.data ?? [])
  const commentsResponse = commentsResult.status === 'fulfilled' ? commentsResult.value : null
  const commentsError = commentsResult.status === 'rejected' ? 'Kommentare konnten nicht geladen werden.' : null
  const relationsResponse = relationsResult.status === 'fulfilled' ? relationsResult.value : null
```
Wird zu einem 2-Element-`Promise.allSettled` (nur `groupedEpisodesResult`, `relationsResult`),
`commentsResponse`/`commentsError` entfallen komplett.

<!-- Aktueller Stand page.tsx JSX-Ende (Zeilen 264-302) -->
```
      <div className={styles.contentArea}>
        <section className={styles.episodesSection}>
          {groupedEpisodesResponse ? (
            <FansubVersionBrowser ... />
          ) : ( ...Fehlerhinweis... )}
        </section>

        <AnimeContributionsSection animeID={anime.id} />

        <CommentSection
          key={anime.id}
          animeID={anime.id}
          initialComments={commentsResponse?.data ?? []}
          initialTotal={commentsResponse?.meta.total ?? 0}
          initialError={commentsError}
        />
      </div>
```
`<AnimeContributionsSection .../>` und `<CommentSection ...>...</CommentSection>` werden vollständig
entfernt; `</section>` bleibt direkt gefolgt vom schließenden `</div>` von `.contentArea`.

<!-- lib/api.ts: zu entfernende Blöcke -->
`CommentListParams`-Interface (Zeile ~492-495), `buildCommentQuery`-Funktion (Zeile ~533-539 inkl.
Doc-Kommentar), `getAnimeComments`-Funktion (Zeile ~2961-2980), und `PaginatedCommentResponse` aus dem
`@/types/comment`-Import (Zeile ~90-94) entfernen. `createAnimeComment` (Zeile ~2982+),
`CommentCreateRequest`/`CommentCreateResponse` NICHT anfassen — `createAnimeComment` wird real von
`frontend/src/lib/api.auth-refresh.test.ts` (Zeile 234, `Promise.all([getWatchlistEntry(15),
createAnimeComment(15, { content: 'Ein Kommentar' })])`) aufgerufen, unabhängig von CommentForm.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: GAP-14 — Fansub-Release-Datumszeile umformulieren (Preview + Detailseite)</name>
  <files>frontend/src/components/fansubs/episodePreviewFormat.ts, frontend/src/components/fansubs/episodePreviewFormat.test.ts, frontend/src/components/fansubs/FansubVersionBrowser.test.tsx, frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx, frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx</files>
  <action>
Per D-14 (unverändert, nur Wortlaut betroffen): In `episodePreviewFormat.ts`, Funktion
`formatReleaseDateLine`, den Rückgabe-String von `` `Veröffentlicht am ${formatted}` `` zu
`` `Fansub-Release vom ${formatted}` `` ändern. Die vorangehende null-Rückgabe-Logik (fehlendes Datum,
ungültiges Datum) bleibt exakt bestehen — die Zeile wird weiterhin komplett weggelassen, wenn kein
Datum gesetzt ist (Aufrufer `ReleasePreviewRow.tsx` prüft bereits `dateLine ? ... : null`, dort ist
keine Änderung nötig).

In `episodePreviewFormat.test.ts`, im `describe('formatReleaseDateLine', ...)`-Block: die Assertion
`expect(formatReleaseDateLine('2012-04-12T00:00:00Z')).toBe('Veröffentlicht am 12.04.2012')` zu
`expect(formatReleaseDateLine('2012-04-12T00:00:00Z')).toBe('Fansub-Release vom 12.04.2012')` ändern
(Testname/Kommentar bei Bedarf konsistent anpassen). Die Tests für den null-Fall bleiben unverändert.

In `FansubVersionBrowser.test.tsx`, Testfall "Testfall 12/13: Release-Datum wird nur gerendert, wenn
gepflegt": beide Assertions `expect(screen.getByText('Veröffentlicht am 12.04.2012')).toBeTruthy()`
und `expect(screen.queryAllByText(/Veröffentlicht am/)).toHaveLength(1)` auf
`'Fansub-Release vom 12.04.2012'` bzw. `/Fansub-Release vom/` ändern.

In `ReleaseDetailHero.tsx`, im `technicalFacts`-Array (Zeile ~78): das Label-String-Literal
`'Veröffentlicht'` (erstes Element des ersten `[label, value]`-Paares) zu `'Fansub-Release vom'`
ändern. Der Value-Ausdruck `displayValue(formatDate(props.release_date))` bleibt unverändert
(inkl. "Nicht hinterlegt"-Fallback — das ist das bestehende Verhalten des gesamten
Technik-Rasters für alle Felder, nicht spezifisch für das Datum, und nicht Teil dieses Gaps).
Keine anderen dt/dd-Paare in `technicalFacts` oder `heroFacts` anfassen.

In `ReleaseDetailHero.test.tsx`: beide Vorkommen von `'Veröffentlicht'` als String-Literal in
`screen.queryByText('Veröffentlicht')` (vor dem Öffnen des Accordions, erwartet `toBeNull()`) und
`screen.getByText('Veröffentlicht')` (nach dem Öffnen, erwartet `toBeTruthy()`) zu
`'Fansub-Release vom'` ändern. Keine anderen Assertions in dieser Datei anfassen.

Nicht anfassen: alle anderen Vorkommen von "Veröffentlicht" im Repo (Admin-Notizen-Status in
`ReleaseVersionNotesTab.tsx`, `AnimeProjectNoteForm.tsx`, `NotesTab.helpers.tsx`,
`ProjectNoteShowcase.tsx`) — das sind Admin-Formular-Status-Labels, kein Fansub-Release-Datum, per
Aufgabenvorgabe explizit ausgeschlossen.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/episodePreviewFormat.test.ts src/components/fansubs/FansubVersionBrowser.test.tsx" 2>&1 | tail -40</automated>
  </verify>
  <done>
`formatReleaseDateLine` gibt bei gültigem Datum `Fansub-Release vom TT.MM.JJJJ` zurück und bei
fehlendem/ungültigem Datum weiterhin `null`. `ReleaseDetailHero.tsx` zeigt das Label
`Fansub-Release vom` statt `Veröffentlicht`. Alle drei betroffenen Testdateien sind grün, keine
anderen Tests wurden angefasst. Kein Vorkommen von "Veröffentlicht am" mehr im Repo außerhalb von
Admin-Formularen.
  </done>
</task>

<task type="auto">
  <name>Task 2: GAP-15a — Kommentarbereich vollständig von /anime/[id] entfernen</name>
  <files>frontend/src/app/anime/[id]/page.tsx, frontend/src/app/anime/[id]/page.test.tsx, frontend/src/app/anime/[id]/page.performance.test.ts, frontend/src/app/anime/[id]/page.module.css, frontend/src/lib/api.ts, frontend/src/components/comments/CommentSection.tsx, frontend/src/components/comments/CommentSection.module.css, frontend/src/components/comments/CommentForm.tsx, frontend/src/components/comments/CommentForm.module.css, frontend/src/components/comments/CommentForm.test.tsx, frontend/src/components/comments/commentSectionState.ts, frontend/src/components/comments/commentSectionState.test.ts</files>
  <action>
In `frontend/src/app/anime/[id]/page.tsx`:
1. Import `import { CommentSection } from '@/components/comments/CommentSection'` vollständig entfernen.
2. Aus dem `@/lib/api`-Import-Block `getAnimeComments` entfernen (Rest des Imports — `getAnimeRelations`,
   `getAnimeFansubs`, `getGroupedEpisodes` — unverändert lassen).
3. Im SSR-Fetch-Block: `getAnimeComments(animeID, { page: 1, per_page: 10 })` aus dem
   `Promise.allSettled([...])`-Array entfernen; Destrukturierung von
   `[groupedEpisodesResult, commentsResult, relationsResult]` zu
   `[groupedEpisodesResult, relationsResult]` ändern (siehe `<interfaces>` oben für den exakten
   aktuellen Block).
4. Die Zeilen `const commentsResponse = commentsResult.status === 'fulfilled' ? commentsResult.value : null`
   und `const commentsError = commentsResult.status === 'rejected' ? 'Kommentare konnten nicht geladen werden.' : null`
   vollständig entfernen.
5. Das JSX `<CommentSection key={anime.id} animeID={anime.id} initialComments={...} initialTotal={...}
   initialError={commentsError} />`-Element komplett entfernen (kompletter Block, nicht nur Props).
6. Den JSX-Kommentar `{/* Content Area (Episodes, Comments) */}` zu `{/* Content Area (Episodes) */}`
   ändern (spiegelt den entfernten Kommentarbereich wider).

In `frontend/src/app/anime/[id]/page.module.css`: den CSS-Kommentarblock
`/* -------- Content Area (Episodes, Comments) -------- */` (Zeile ~550-552) analog zu
`/* -------- Content Area (Episodes) -------- */` ändern. Keine Style-Regel (nur den Kommentar)
anfassen.

In `frontend/src/lib/api.ts`:
1. `getAnimeComments`-Funktion vollständig entfernen (async function, Body inklusive).
2. `buildCommentQuery`-Funktion inklusive ihres Doc-Kommentars vollständig entfernen (wird nach
   Schritt 1 von nichts mehr aufgerufen).
3. `CommentListParams`-Interface vollständig entfernen (wird nach Schritt 2 von nichts mehr referenziert).
4. Aus dem `@/types/comment`-Import `PaginatedCommentResponse` entfernen; `CommentCreateRequest` und
   `CommentCreateResponse` UNVERÄNDERT im Import belassen (werden weiterhin von `createAnimeComment`
   gebraucht).
5. `createAnimeComment` NICHT anfassen — es hat einen echten, unabhängigen Aufrufer
   (`frontend/src/lib/api.auth-refresh.test.ts`, Zeile 234) außerhalb der gelöschten
   Comment-Komponenten.

Dateien vollständig löschen (per Grep bestätigt: außerhalb von `frontend/src/components/comments/`
und dem soeben bearbeiteten `page.tsx` existiert kein weiterer Importer):
`frontend/src/components/comments/CommentSection.tsx`,
`frontend/src/components/comments/CommentSection.module.css`,
`frontend/src/components/comments/CommentForm.tsx`,
`frontend/src/components/comments/CommentForm.module.css`,
`frontend/src/components/comments/CommentForm.test.tsx`,
`frontend/src/components/comments/commentSectionState.ts`,
`frontend/src/components/comments/commentSectionState.test.ts`.
Danach ist `frontend/src/components/comments/` leer und kann als leeres Verzeichnis bestehen bleiben
(kein separater rmdir-Schritt nötig).

In `frontend/src/app/anime/[id]/page.test.tsx`:
- Aus dem `vi.mock('@/lib/api', ...)`-Factory-Objekt (Zeile ~20) `getAnimeComments: vi.fn(),` entfernen.
- Aus dem `import { ApiError, getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeComments,
  getAnimeRelations, getWatchlistEntry } from '@/lib/api'` (Zeile 23) `getAnimeComments` entfernen.
- Die Zeile `vi.mocked(getAnimeComments).mockReset().mockResolvedValue({ data: [], meta: { page: 1,
  per_page: 10, total: 0, total_pages: 0 } })` im `beforeEach` (Zeile 40) vollständig entfernen.
- Beide Assertions `expect(getAnimeComments).not.toHaveBeenCalled()` (Zeilen 59 und 98) entfernen.
- Keine anderen Assertions/Tests in dieser Datei anfassen — kein Test in dieser Datei prüft aktuell
  auf CommentSection/"Kommentare" im gerenderten Baum (per Grep bestätigt), daher ist keine weitere
  Anpassung nötig.

In `frontend/src/app/anime/[id]/page.performance.test.ts`:
- Aus dem `vi.mock('@/lib/api', ...)`-Factory-Objekt (Zeile ~18) `getAnimeComments: vi.fn(),` entfernen.
- Aus dem `import { getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeComments,
  getAnimeRelations, getAnimeBackdrops } from '@/lib/api'` (Zeile 21) `getAnimeComments` entfernen.
- Die Zeile `vi.mocked(getAnimeComments).mockResolvedValue({ data: [], meta: { page: 1, per_page: 10,
  total: 0, total_pages: 0 } })` im äußeren `beforeEach` (Zeile 37) entfernen.
- Innerhalb `totalFetchCallsFor(...)`: die identische `vi.mocked(getAnimeComments).mockResolvedValue(...)`-Zeile
  (Zeile ~109) entfernen, UND aus der Summe am Ende der Funktion (Zeile ~117-123) die Zeile
  `+ vi.mocked(getAnimeComments).mock.calls.length` entfernen — die Summe zählt danach 4 statt 5
  Fetch-Aufrufe (`getAnimeByID` + `getAnimeFansubs` + `groupedMock` + `getAnimeRelations`). Der
  Test selbst (Vergleich mit/ohne Tags) bleibt inhaltlich unverändert, da beide Seiten des Vergleichs
  gleichermaßen einen Aufruf weniger zählen.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/anime/[id]/page.test.tsx' 'src/app/anime/[id]/page.performance.test.ts'" 2>&1 | tail -50</automated>
  </verify>
  <done>
`page.tsx` importiert `CommentSection`/`getAnimeComments` nicht mehr, löst keinen Kommentar-Fetch mehr
aus und rendert kein `CommentSection`-Element mehr. `frontend/src/components/comments/` ist leer.
`lib/api.ts` exportiert `getAnimeComments`/`buildCommentQuery`/`CommentListParams` nicht mehr,
`createAnimeComment` ist unverändert vorhanden. Beide betroffenen Testdateien sind grün.
  </done>
</task>

<task type="auto">
  <name>Task 3: GAP-15b — "Mitwirkende Gruppen"-Bereich vollständig von /anime/[id] entfernen</name>
  <files>frontend/src/app/anime/[id]/page.tsx, frontend/src/components/anime/AnimeContributionsSection.tsx, frontend/src/components/anime/AnimeContributionsSection.module.css, frontend/src/components/anime/AnimeContributionsSection.test.tsx</files>
  <action>
In `frontend/src/app/anime/[id]/page.tsx`:
1. Import `import { AnimeContributionsSection } from '@/components/anime/AnimeContributionsSection'`
   vollständig entfernen.
2. Das JSX-Element `<AnimeContributionsSection animeID={anime.id} />` (steht zwischen dem
   schließenden `</section>` der Episoden-Sektion und dem — nach Task 2 bereits entfernten —
   CommentSection-Block) vollständig entfernen. Danach steht in `.contentArea` nur noch die eine
   `<section className={styles.episodesSection}>...</section>`.

Dateien vollständig löschen (per Grep bestätigt: außerhalb von `page.tsx` und der eigenen Testdatei
existiert kein weiterer Importer von `AnimeContributionsSection`):
`frontend/src/components/anime/AnimeContributionsSection.tsx`,
`frontend/src/components/anime/AnimeContributionsSection.module.css`,
`frontend/src/components/anime/AnimeContributionsSection.test.tsx`.

Explizit NICHT löschen und NICHT anfassen (bewusste Abgrenzung, nicht Teil des Auftrags):
`frontend/src/components/anime/GroupContributionBlock.tsx`,
`frontend/src/components/anime/GroupContributionBlock.module.css`,
`frontend/src/components/anime/GroupContributionBlock.test.tsx` — `GroupContributionBlock.module.css`
hat mit `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` einen von
`AnimeContributionsSection` unabhängigen Importer (`import blockStyles from
'./GroupContributionBlock.module.css'`); die Komponentenfamilie ist eigenständig und nicht
ausschließlich Support-Material der gelöschten Sektion. Ebenfalls NICHT anfassen:
`getAnimeContributions` in `lib/api.ts` und `frontend/src/types/contributions.ts` — der Auftrag
autorisiert API-Bereinigung ausdrücklich nur für Kommentar-spezifische Helfer (GAP-15-Vorgabe), nicht
für Mitwirkende-Gruppen-Helfer.

Es sind keine Testdatei-Anpassungen außerhalb der gelöschten `AnimeContributionsSection.test.tsx`
nötig — kein anderer Test im Repo prüft auf "Mitwirkende Gruppen" oder `AnimeContributionsSection`
im `page.tsx`-Rendertree (per Grep bestätigt).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/anime/[id]/page.test.tsx' src/components/anime/GroupContributionBlock.test.tsx" 2>&1 | tail -40</automated>
  </verify>
  <done>
`page.tsx` importiert `AnimeContributionsSection` nicht mehr und rendert keinen
"Mitwirkende Gruppen"-Bereich mehr. `AnimeContributionsSection.tsx`/`.module.css`/`.test.tsx` sind
gelöscht. `GroupContributionBlock.*` ist unverändert vorhanden und sein Test bleibt grün.
  </done>
</task>

<task type="auto">
  <name>Task 4: Verifikation — Tests, Typecheck, Lint, Container-Neustart, Live-Check</name>
  <files>frontend/src/app/anime/[id]/page.tsx</files>
  <action>
1. Gezielten Vitest-Lauf über alle in diesem Plan geänderten Testdateien im Frontend-Container
   ausführen:
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/episodePreviewFormat.test.ts src/components/fansubs/FansubVersionBrowser.test.tsx 'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx' 'src/app/anime/[id]/page.test.tsx' 'src/app/anime/[id]/page.performance.test.ts' src/components/anime/GroupContributionBlock.test.tsx"`
   Alle Tests müssen grün sein.

2. Projektweiten Typecheck ausführen (deckt verwaiste Importe/Typen aus den gelöschten Dateien ab,
   die kein gezielter Testlauf findet):
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"`
   0 Fehler erwartet.

3. ESLint gezielt für die in diesem Plan geänderten Produktionsdateien ausführen:
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/episodePreviewFormat.ts 'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx' 'src/app/anime/[id]/page.tsx' src/lib/api.ts"`
   0 neue Findings erwartet.

4. Frontend-Container neu starten, damit der Next.js-Server die Code-Änderungen live übernimmt:
   `docker restart team4sv30-frontend`
   Danach in einer kurzen Retry-Schleife (max. ~10 Versuche, 2s Abstand, kein langes Vorab-Sleep) auf
   Erreichbarkeit prüfen:
   `curl -sf http://127.0.0.1:3000/anime/4 -o /dev/null -w "%{http_code}\n"`

5. Live-Inhalt der öffentlichen Anime-Detailseite abrufen und inhaltlich prüfen:
   `curl -s http://127.0.0.1:3000/anime/4 > /tmp/anime4-gap1415.html`
   Danach am HTML-Inhalt (per grep) bestätigen:
   - `grep -c "Kommentare" /tmp/anime4-gap1415.html` liefert `0` (kein Kommentarbereich mehr).
   - `grep -c "Mitwirkende Gruppen" /tmp/anime4-gap1415.html` liefert `0` (kein Mitwirkende-Bereich mehr).
   - `grep -c "Fansub-Release vom" /tmp/anime4-gap1415.html` — falls Anime 4 mindestens einen Release
     mit gesetztem `release_date` hat, muss dies `>0` sein und `grep -c "Veröffentlicht am"` `0`
     liefern; hat kein Release ein Datum, ist die Zeile laut GAP-14-Fallback korrekt komplett
     abwesend (beide Zähler `0`) — in diesem Fall im SUMMARY.md explizit vermerken, dass der Wortlaut
     nur über den bereits grünen Unit-Test (Task 1) und nicht live an Anime 4 bestätigt werden konnte.
   Temporäre Datei `/tmp/anime4-gap1415.html` danach nicht ins Repo übernehmen (liegt ohnehin
   außerhalb von `frontend/`).

6. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` gelisteten geänderten Pfade
   sowie die gelöschten Comment-/AnimeContributionsSection-Pfade explizit per Pfad zu `git add`
   hinzufügen, dann `git commit` mit einer Commit-Message, die auf GAP-14/GAP-15 verweist. Kein
   `git push`.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/episodePreviewFormat.test.ts src/components/fansubs/FansubVersionBrowser.test.tsx 'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx' 'src/app/anime/[id]/page.test.tsx' 'src/app/anime/[id]/page.performance.test.ts' src/components/anime/GroupContributionBlock.test.tsx" 2>&1 | tail -30</automated>
  </verify>
  <done>
Alle betroffenen Tests grün, `tsc --noEmit` 0 Fehler, ESLint 0 neue Findings, Frontend-Container läuft
neu gestartet und liefert 200 auf `/anime/4`. Live-HTML von `/anime/4` enthält weder "Kommentare" noch
"Mitwirkende Gruppen"; Wortlaut-Befund für "Fansub-Release vom" vs. "Veröffentlicht am" ist im
SUMMARY.md dokumentiert. Änderungen sind gezielt committet (kein `git add -A`), kein Push.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a | Reine Wortlaut-Änderung (öffentlicher Anzeigetext) plus Entfernen von zwei UI-Bereichen samt zugehörigem Frontend-Fetch (`getAnimeComments`). Keine neue Eingabeverarbeitung, kein neuer Netzwerk-Endpunkt, kein Backend-Code wird verändert. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick-260918-jfs-01 | Information Disclosure | `frontend/src/app/anime/[id]/page.tsx` (entfernter Kommentar-Fetch) | accept | Entfernt einen Read-Pfad (öffentliche Kommentarliste), reduziert Angriffsfläche statt sie zu erweitern; Backend-Endpunkt `/api/v1/anime/{id}/comments` bleibt unverändert bestehen und ist nicht Teil dieses Auftrags. |
| T-quick-260918-jfs-02 | Tampering | Gelöschte Frontend-Dateien (`components/comments/*`, `AnimeContributionsSection.*`) | accept | Reine Dead-Code-Entfernung nach verifizierter Null-Importer-Grep-Prüfung; kein Laufzeitverhalten für verbleibende Nutzer betroffen, kein Datenverlust (Backend/DB unangetastet). |
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <alle 6 betroffenen Testdateien aus Task 4>"` — alle grün.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` — 0 Fehler.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/episodePreviewFormat.ts 'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx' 'src/app/anime/[id]/page.tsx' src/lib/api.ts"` — 0 neue Findings.
4. `docker restart team4sv30-frontend` gefolgt von `curl -s http://127.0.0.1:3000/anime/4` — HTML enthält weder "Kommentare" noch "Mitwirkende Gruppen"; bei vorhandenem Release-Datum "Fansub-Release vom" statt "Veröffentlicht am".
5. `git diff --stat` zeigt ausschließlich die in `files_modified` gelisteten Pfade plus die 10 gelöschten Comment-/AnimeContributionsSection-Dateien — keine unbeabsichtigten Nebenänderungen, kein Backend-Pfad.
</verification>

<success_criteria>
- GAP-14: Release-Datumszeile liest überall öffentlich "Fansub-Release vom TT.MM.JJJJ"; Admin-Formulare
  unverändert; fehlendes Datum wird weiterhin ausgelassen (Preview-Zeile) bzw. mit "Nicht hinterlegt"
  dargestellt (Detailseiten-Raster, bestehendes Verhalten).
- GAP-15: /anime/[id] hat weder Kommentarbereich noch "Mitwirkende Gruppen"-Bereich; kein
  Kommentar-Request mehr im SSR-Fetch; verwaiste Dateien sind gelöscht, geteilte Komponenten
  (`GroupContributionBlock`) bleiben erhalten; Backend komplett unangetastet.
- Alle betroffenen Tests grün, `tsc`/`eslint` sauber, live per curl gegen `/anime/4` bestätigt.
- Kein `git add -A`, kein `git push`, keine Aufnahme als Phase-164-Abnahme in STATE.md (das übernimmt
  der Orchestrator separat als eigene Quick-Task-Zeile).
</success_criteria>

<output>
Create `.planning/quick/260918-jfs-phase-164-live-uat-fixes-gap-14-gap-15-f/260918-jfs-SUMMARY.md` when done
</output>
