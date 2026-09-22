---
phase: quick-260922-min
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/ui/ConfirmDialog.tsx, frontend/src/components/ui/ConfirmDialog.test.tsx, frontend/src/components/ui/index.ts, frontend/eslint.config.mjs, "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx", "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts", "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts", "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx", "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx", frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx, frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx, frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx, frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx, frontend/src/app/admin/fansubs/create/page.tsx, frontend/src/app/admin/fansubs/page.tsx, "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx", "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx", "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx", frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx, frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx, backend/internal/repository/anime_v2.go, backend/internal/repository/anime_v2_test.go, .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md]
autonomous: true
requirements: [GAP-20, GAP-21]

must_haves:
  truths:
    - "Jede der 17 betroffenen Admin-Oberflächen zeigt vor einer destruktiven Aktion einen gestylten, barrierefreien Bestätigungsdialog (ConfirmDialog/Modal) statt des nativen Browser-window.confirm-Popups"
    - "Abbrechen im neuen Dialog löst keine API-Mutation aus; Bestätigen führt exakt dieselbe Aktion aus wie vorher nach window.confirm(true)"
    - "Kein window.confirm(...)-Aufruf existiert mehr irgendwo in frontend/src; ein neuer ESLint-Regelsatz (no-restricted-properties + no-restricted-globals) verbietet window.confirm/bare confirm() mit Severity 'error' ohne Legacy-Ausnahmen"
    - "Die Admin-Anime-Übersicht zeigt für einen Anime vom Typ \"film\" das Label \"Film\" (nicht \"FILM\" oder \"TV\") und für jeden anderen Typ TV/OVA/ONA/Special/Bonus korrekt"
    - "Die Admin-Anime-Übersicht zeigt \"1 Episode\" (Singular) bei max_episodes=1 und \"N Episoden\" (Plural) bei max_episodes!=1"
    - "mapAnimeTypeNameToAPI liefert für die DB-Zeile \"film\" den API-Wert \"film\" (nicht mehr den default-Fallback \"tv\"), konsistent an allen vier Lesepfaden (Liste, Detail, Update-Response, Themes-Response)"
  artifacts:
    - path: "frontend/src/components/ui/ConfirmDialog.tsx"
      provides: "useConfirmDialog()-Hook mit Promise-basierter confirm({title,description,confirmLabel,cancelLabel,tone})-API auf Basis von Modal, ohne neuen globalen React-Context"
      contains: "export function useConfirmDialog"
    - path: "frontend/eslint.config.mjs"
      provides: "no-restricted-properties (window.confirm) + no-restricted-globals (confirm) Regeln, Severity error, ohne Legacy-Ausnahmeliste"
      contains: "no-restricted-properties"
    - path: "backend/internal/repository/anime_v2.go"
      provides: "mapAnimeTypeNameToAPI mit case \"film\": return \"film\""
      contains: "case \"film\":"
    - path: "frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx"
      provides: "Typ-Label-Map (TV/Film/OVA/ONA/Special/Bonus) und Singular/Plural-Episodenzählung, useConfirmDialog statt window.confirm für den Löschen-Flow"
      contains: "useConfirmDialog("
  key_links:
    - from: "frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx"
      to: "frontend/src/components/ui/ConfirmDialog.tsx"
      via: "useConfirmDialog()-Aufruf ersetzt window.confirm im Löschen-Flow"
      pattern: "useConfirmDialog\\("
    - from: "backend/internal/repository/anime_v2.go listV2/getByIDV2"
      to: "backend/internal/repository/anime_v2.go mapAnimeTypeNameToAPI"
      via: "beide Lesepfade rufen dieselbe, jetzt korrigierte Mapping-Funktion auf"
      pattern: "mapAnimeTypeNameToAPI\\(animeType\\)"
    - from: "frontend/eslint.config.mjs Basis-rules-Block"
      to: "frontend/src/**/*.tsx (alle Dateien, keine Legacy-Ausnahme)"
      via: "no-restricted-properties/no-restricted-globals gelten uniform ohne files-Filter"
      pattern: "no-restricted-globals"
---

<objective>
GAP-20 + GAP-21 (Phase 165 Live-UAT, 2026-09-22), zwei unabhängige Fixes in einem Quick-Task.

**GAP-20:** Genau 23 `window.confirm(...)`-Aufrufe in genau 17 Produktionsdateien werden durch einen
gemeinsamen, gestylten `ConfirmDialog`-Primitive (Promise-basiert, auf `Modal` aufgebaut) ersetzt. Es
gibt weder `window.alert` noch `window.prompt` im Repo (verifiziert) — nur `window.confirm` ist im
Scope. Ein neuer ESLint-Regelsatz verbietet `window.confirm`/bare `confirm()` künftig repo-weit mit
Severity `error`, ohne Legacy-Ausnahmen (dieser Plan behebt alle 23 Vorkommen in einem Zug).

**GAP-21:** Die Admin-Anime-Übersicht zeigt für Film-Anime fälschlich "TV" — Backend-Bug:
`mapAnimeTypeNameToAPI` in `backend/internal/repository/anime_v2.go` hat kein `case "film":`, obwohl
die `anime_types`-Tabelle die Zeile `'film'` seedet, und faellt in den `default: return "tv"`. Zusaetzlich
zeigt das Frontend Typ-Labels und Episodenzahlen falsch formatiert (`anime.type.toUpperCase()` →
"FILM" statt "Film"; Episoden immer im Plural, auch bei genau 1).

Verbindliche, bereits verifizierte Entscheidungen (nicht neu verhandeln):
- `ConfirmDialog` ist EIN neues Primitive unter `@/components/ui` (Pflicht laut CLAUDE.md
  Design-System-Regel), gebaut auf dem bestehenden `Modal` — kein neuer globaler React-Context/Provider,
  jede Aufrufstelle bindet `useConfirmDialog()` lokal ein (minimale Migration pro Call-Site).
- Vertrag: `confirm(options): Promise<boolean>` — `true` bei Bestätigen, `false` bei Abbrechen, Esc,
  Overlay-Klick oder Schließen-X. Fokus landet initial auf dem Abbrechen-Button (nicht dem Schließen-X).
- Jede der 23 Aufrufstellen behält ihren exakten deutschen Originaltext (nur von einem Confirm-String
  in title+description verschoben) und ihr exaktes Nachher-Verhalten (nur der Bestätigungsmechanismus
  ändert sich). Exakte Zuordnung: siehe Tabellen in Task 2-5.
- `mapAnimeTypeNameToAPI` bekommt `case "film": return "film"` NEU; der bestehende `case "movie":`
  bleibt stehen (Verteidigung gegen historische Altzeilen, harmlos).
- Frontend-Typ-Label-Map ist EIGENSTÄNDIG (nicht `TYPE_HINT_LABELS` aus `discoveryPageHelpers.ts`
  wiederverwenden — die kollabiert `bonus`→"Special" und nutzt "Serie" statt "TV", passt hier nicht).
- Direkt auf `main`, kein `git stash`, kein Push, keine `.env`- oder `team4s_v2`-Datenänderung.

Purpose: Admins sehen ein konsistentes, gestyltes, barrierefreies Bestätigungsmuster statt nativer
Browser-Popups; die Anime-Übersicht zeigt Typ und Episodenzahl korrekt.
Output: Neues `ConfirmDialog`-Primitive samt Tests; 23 migrierte Aufrufstellen in 17 Dateien; neue
ESLint-Regeln; `mapAnimeTypeNameToAPI`-Fix samt Test; korrigierte Typ-/Episoden-Anzeige samt Test;
GAP-20/GAP-21-Einträge in `165-UAT.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@frontend/src/components/ui/Modal.tsx
@frontend/src/components/ui/Modal.test.tsx
@frontend/src/components/ui/Button.tsx
@frontend/src/components/ui/index.ts
@frontend/eslint.config.mjs
@frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx
@backend/internal/repository/anime_v2.go
@.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

<interfaces>
Modal.tsx (unveraendert, keine Aenderung an dieser Datei in diesem Plan):
  export interface ModalProps { open: boolean; onClose: () => void; title: string; description?:
  string; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg'; panelClassName?: string }
  export function Modal(props: ModalProps)
  Modal fokussiert beim Oeffnen intern closeButtonRef via window.setTimeout(fn, 0) (Zeile 66). Esc,
  Overlay-Klick und das Schliessen-X rufen alle onClose() auf.

Button.tsx (unveraendert):
  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text'
  export function Button(props: ButtonProps)
  Button ist KEIN forwardRef — Refs koennen NICHT an Button durchgereicht werden. Button spreadet aber
  alle unbekannten Props (inkl. id) via {...buttonProps} auf das native <button>-Element.

AnimeListItem (frontend/src/types/anime.ts, unveraendert):
  export interface AnimeListItem { id: number; title: string; type: string; status: AnimeStatus;
  year?: number; cover_image?: string; max_episodes?: number }
  type ist einer von: "tv" | "film" | "ova" | "ona" | "special" | "bonus" | "web"

mapAnimeTypeNameToAPI (backend/internal/repository/anime_v2.go, Zeile 450-473, VOR diesem Plan):
  func mapAnimeTypeNameToAPI(name *string) string {
    if name == nil { return "tv" }
    switch strings.ToLower(strings.TrimSpace(*name)) {
    case "tv": return "tv"
    case "movie": return "film"
    case "ova": return "ova"
    case "ona": return "ona"
    case "special": return "special"
    case "bonus": return "bonus"
    case "web": return "web"
    default: return "tv"   // GAP-21: DB-Zeile "film" faellt hierher, kein case "film"
    }
  }
  Aufrufer (unveraendert durch diesen Plan, profitieren automatisch vom Fix): anime_v2.go:97 (listV2),
  anime_v2.go:246 (getByIDV2), admin_content_anime_update_v2.go:428, admin_content_anime_themes.go:2151.
  database/migrations/0030_add_anime_types_table.up.sql seedet: tv, film, ova, ona, special, bonus, web
  (genau diese 7 Zeilen — 'film', NICHT 'movie'). admin_content_create_v2.go's WRITE-seitige
  animeTypeV2Names-Map schreibt fuer API-Typ "film" bereits korrekt die DB-Zeile "film" (WRITE-Pfad
  bereits korrekt, NICHT anfassen).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: ConfirmDialog-Primitive (useConfirmDialog-Hook) + ESLint-Verbot fuer window.confirm</name>
  <files>frontend/src/components/ui/ConfirmDialog.tsx, frontend/src/components/ui/ConfirmDialog.test.tsx, frontend/src/components/ui/index.ts, frontend/eslint.config.mjs</files>
  <behavior>
    - Test 1: Testharness ruft bei Klick auf einen Button `confirm({title:'Testtitel',
      description:'Testbeschreibung', confirmLabel:'Löschen', tone:'danger'})` auf. Danach ist ein
      `role="dialog"` sichtbar mit sowohl "Testtitel" als auch "Testbeschreibung".
    - Test 2: Klick auf "Abbrechen" im Dialog schliesst ihn (kein `role="dialog"` mehr) und die
      Promise loest zu `false` auf (Harness zeigt "cancelled").
    - Test 3: Klick auf den Bestaetigen-Button ("Löschen") loest die Promise zu `true` auf (Harness
      zeigt "confirmed").
    - Test 4: `fireEvent.keyDown(dialog, {key:'Escape'})` loest die Promise zu `false` auf.
    - Test 5: Nach dem Oeffnen (per `waitFor`) ist `document.activeElement` der Abbrechen-Button, NICHT
      das Schliessen-X von Modal.
  </behavior>
  <action>
Neue Datei `frontend/src/components/ui/ConfirmDialog.tsx` (`'use client'`). Exportiert:
`export interface ConfirmDialogOptions { title: string; description?: string; confirmLabel?: string;
cancelLabel?: string; tone?: 'default' | 'danger' }` und
`export interface UseConfirmDialogResult { confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
confirmDialog: ReactNode }` und `export function useConfirmDialog(): UseConfirmDialogResult`.

Implementierung: `useState`-Slot `pending: (ConfirmDialogOptions & { resolve: (v: boolean) => void }) |
null`. `const cancelButtonId = useId()` — da `Button` KEIN `forwardRef` ist, wird der initiale Fokus
NICHT ueber eine Ref, sondern ueber `document.getElementById(cancelButtonId)?.focus()` gesetzt (`Button`
spreadet unbekannte Props inkl. `id` durch, `<Button id={cancelButtonId} ...>` ist gueltig).
`useEffect(() => { if (!pending) return; const t = window.setTimeout(() =>
document.getElementById(cancelButtonId)?.focus(), 0); return () => window.clearTimeout(t) }, [pending,
cancelButtonId])` — laeuft IMMER NACH Modals eigenem Fokus-Effekt (Modal ist Kind-Komponente, React
committet Kind-Effekte vor Eltern-Effekten; beide nutzen `window.setTimeout(fn, 0)`, Modals Timer wird
zuerst registriert und feuert zuerst [fokussiert das X], danach ueberschreibt dieser Timer auf den
Abbrechen-Button) — deshalb KEINE Aenderung an `Modal.tsx` noetig.
`function confirm(options) { return new Promise<boolean>((resolve) => { setPending((current) => {
current?.resolve(false); return { ...options, resolve } }) }) }` (ein evtl. bereits offener Dialog wird
automatisch mit `false` aufgeloest, falls eine neue Anfrage hereinkommt).
`function settle(value: boolean) { setPending((current) => { current?.resolve(value); return null }) }`.
`confirmDialog`: `pending ? <Modal open onClose={() => settle(false)} title={pending.title}
description={pending.description} footer={<><Button id={cancelButtonId} variant="secondary"
onClick={() => settle(false)}>{pending.cancelLabel ?? 'Abbrechen'}</Button> <Button
variant={pending.tone === 'danger' ? 'danger' : 'primary'} onClick={() =>
settle(true)}>{pending.confirmLabel ?? 'Bestätigen'}</Button></>}>{null}</Modal> : null`. Datei bleibt
klar unter 450 Zeilen (Zielgroesse ca. 60-80 Zeilen).

Neue Datei `frontend/src/components/ui/ConfirmDialog.test.tsx` mit Test 1-5 (`@vitest-environment
jsdom`, Muster aus `Modal.test.tsx`: `cleanup` in `afterEach`, `render`/`screen`/`fireEvent`/`waitFor`/
`within` aus `@testing-library/react`). Testharness-Komponente ruft `useConfirmDialog()` auf, rendert
`{confirmDialog}` plus einen Ausloese-Button, haelt das Ergebnis (`'idle'|'confirmed'|'cancelled'`) in
lokalem State und zeigt es als Text, damit die Tests das Promise-Ergebnis pruefen koennen ohne selbst
zu awaiten.

`frontend/src/components/ui/index.ts`: Zeile `export * from './ConfirmDialog'` ergaenzen (Position
egal, Datei ist bereits nicht alphabetisch sortiert).

`frontend/eslint.config.mjs`: NEUE, von `uiPrimitiveGuard`/`uiPrimitiveGuardLegacyWarn`/
`LEGACY_NO_RESTRICTED_SYNTAX_FILES` komplett UNABHAENGIGE Regeln ergaenzen (andere Rule-Keys, damit
ESLints Flat-Config-Mechanismus "letzte matchende Config gewinnt PRO Rule-Key" die bestehende
`no-restricted-syntax`-Ratchet-Logik fuer `<select>/<input>/<textarea>` nicht beruehrt — NIEMALS
`uiPrimitiveGuardOptions` oder `LEGACY_NO_RESTRICTED_SYNTAX_FILES` fuer dieses neue Anliegen
wiederverwenden). Im BESTEHENDEN `rules: {...}`-Block des Haupt-Config-Objekts (enthaelt aktuell
`'@next/next/no-html-link-for-pages'` und `'no-restricted-syntax': uiPrimitiveGuard`), OHNE
`files`-Filter (gilt uniform, keine Legacy-Ausnahme, da dieser Plan alle 23 Vorkommen in einem Zug
behebt), zwei neue Eintraege ergaenzen: `'no-restricted-properties': ['error', { object: 'window',
property: 'confirm', message: "window.confirm() ist verboten — nutze useConfirmDialog()/ConfirmDialog
aus @/components/ui (GAP-20, 165-UAT.md)." }]` und `'no-restricted-globals': ['error', { name:
'confirm', message: "Globales confirm() ist verboten — nutze useConfirmDialog()/ConfirmDialog aus
@/components/ui (GAP-20, 165-UAT.md)." }]`. Die bestehenden Config-Objekte (Basis-`uiPrimitiveGuard`,
das `src/components/ui/**`-Override, das `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Override) bleiben
ZEICHENGENAU unveraendert.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/ui/ConfirmDialog.test.tsx" 2>&1 | tail -60</automated>
  </verify>
  <done>
`ConfirmDialog.tsx` existiert, exportiert `useConfirmDialog`, ist Teil des `@/components/ui`-Barrels.
Alle 5 neuen Tests sind gruen. `eslint.config.mjs` enthaelt die zwei neuen, unabhaengigen Regeln mit
Severity `error`, ohne Aenderung an `uiPrimitiveGuardOptions`/`LEGACY_NO_RESTRICTED_SYNTAX_FILES`.
  </done>
</task>

<task type="auto">
  <name>Task 2: window.confirm-Migration Batch A — Episode-Versionen &amp; Episoden (8 Dateien, 8 Stellen)</name>
  <files>"frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx", "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx", "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts", "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts", "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx", "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx"</files>
  <action>
In jeder Datei: `useConfirmDialog` aus `@/components/ui` importieren, `const { confirm, confirmDialog }
= useConfirmDialog()` ergaenzen, `{confirmDialog}` in den JSX-Rueckgabewert einhaengen (bzw. bei den
zwei Hook-Dateien 5/6 unten: `confirmDialog` zusaetzlich im Rueckgabeobjekt des Hooks exportieren, die
aufrufende Komponente rendert es), die jeweilige Funktion `async` machen und `window.confirm(...)`
durch `await confirm({...})` ersetzen. Originaltext bleibt WORTWOERTLICH erhalten (nur auf
title/description aufgeteilt, Split an vorhandenem `\n\n`):

| # | Datei:Zeile | Original (gekuerzt) | title | description | confirmLabel | tone |
|---|---|---|---|---|---|---|
| 1 | ReleaseVersionMediaSection.tsx:345 (`handleDeleteSelectedItem`, bereits async) | 'Dieses Medium aus der Release-Version entfernen?' | Dieses Medium aus der Release-Version entfernen? | — | Entfernen | danger |
| 2 | anime/.../edit/page.tsx:163 | `Episode ${episode.episode_number} wirklich löschen?\n\nZugehörige Versionen werden ebenfalls entfernt.` | `Episode ${episode.episode_number} wirklich löschen?` | Zugehörige Versionen werden ebenfalls entfernt. | Löschen | danger |
| 3 | SegmentEditPanel.tsx:207 (`handleRemoveOverrideClick`, SYNCHRON — zu `async function` machen) | `Override entfernen? Folge ${currentEpisodeLabel} verwendet danach wieder die Basis-Zeit des geteilten Segments.` (ein String, kein `\n\n`) | (kompletter String als title) | — | Entfernen | default (reversibel, kein Datenverlust) |
| 4 | SegmenteTab.tsx:320 (`handleDelete`, bereits async) | 'Segment wirklich löschen?' | Segment wirklich löschen? | — | Löschen | danger |
| 5 | useEpisodeVersionEditor.ts:362 | `Version #${versionID} wirklich löschen?\n\nEpisode bleibt erhalten, nur diese Version wird entfernt.` | `Version #${versionID} wirklich löschen?` | Episode bleibt erhalten, nur diese Version wird entfernt. | Löschen | danger |
| 6 | useSegmentAssetHandlers.ts:110 | 'Segment-Datei wirklich entfernen? Die Quelldaten werden auf "Keine Quelle" zurückgesetzt.' (ein String) | (kompletter String als title) | — | Entfernen | danger |
| 7 | ReleaseVersionMediaDetailPanel.tsx:78 (`handleDelete`, bereits async) | 'Dieses Medium wirklich entfernen?' | Dieses Medium wirklich entfernen? | — | Entfernen | danger |
| 8 | anime/.../versions/page.tsx:305 | `Version #${version.id} wirklich löschen?\n\nDie Episode bleibt erhalten, nur diese Version wird entfernt.` | `Version #${version.id} wirklich löschen?` | Die Episode bleibt erhalten, nur diese Version wird entfernt. | Löschen | danger |

Besonderheiten:
- Zeile 1 (`ReleaseVersionMediaSection.tsx`): Datei ist bereits 658 Zeilen (Alt-Last, in
  `LEGACY_NO_RESTRICTED_SYNTAX_FILES` gelistet) — waechst durch diese eine Stelle um ca. 4-5 Zeilen,
  akzeptabel (Wachstum nicht durch diesen Plan verursacht, nur Konvertierung einer bestehenden Zeile).
- Zeile 3 (`SegmentEditPanel.tsx`, `handleRemoveOverrideClick`): Aufrufer ist `onRemoveOverrideClick=
  {handleRemoveOverrideClick}` als Prop an eine Kindkomponente mit voraussichtlichem Prop-Typ `() =>
  void` — eine `Promise<void>`-zurueckgebende Funktion ist dafuer strukturell gueltiges TypeScript
  (`npm run typecheck` in Task 6 bestaetigt das; falls es dennoch meckert, Call-Site auf `() => { void
  handleRemoveOverrideClick() }` umstellen). `if (confirmed) onRemoveOverride()` bleibt inhaltlich
  gleich.
- Zeile 4 (`SegmenteTab.tsx`): Datei ist EXAKT 450 Zeilen — jede zusaetzliche Zeile ist eine NEUE
  Ueberschreitung des CLAUDE.md-450-Zeilen-Limits (anders als bei bereits ueber dem Limit liegenden
  Alt-Last-Dateien). Den `confirm(...)`-Aufruf so KOMPAKT wie moeglich als einzeiliges Objektliteral
  schreiben. Nach dem Edit `wc -l` pruefen — ueberschreitet die Datei 450 Zeilen, `useConfirmDialog()`-
  Aufruf und `{confirmDialog}`-Einbindung so knapp wie moeglich halten (keine zusaetzlichen Kommentare/
  Leerzeilen an dieser Stelle).
- Zeile 5/6 (`useEpisodeVersionEditor.ts`, `useSegmentAssetHandlers.ts`): das sind Hooks, keine
  Komponenten. `useConfirmDialog()` INNERHALB des Hooks aufrufen und `confirmDialog` zusaetzlich als
  neues Feld im Rueckgabeobjekt des Hooks exportieren (bestehendes Namensmuster im Rueckgabeobjekt
  uebernehmen). Die jeweils AUFRUFENDE Komponente (voraussichtlich `EpisodeVersionEditorPage.tsx` bzw.
  die Komponente, die `useSegmentAssetHandlers` nutzt) rendert zusaetzlich `{editor.confirmDialog}`
  bzw. das entsprechende Feld irgendwo im JSX-Baum (Modal portalt ohnehin nach `document.body`, Position
  egal). Vor dem Edit per Grep `grep -rn "useEpisodeVersionEditor(\|useSegmentAssetHandlers(" "frontend/src/app/admin/episode-versions/[versionId]/edit/"` die tatsaechlichen Aufrufer bestimmen.

In `ReleaseVersionMediaSection.test.tsx`: Test `'uses own-delete capability for the delete action
without requiring all-delete'` (nutzt `vi.spyOn(window, 'confirm').mockReturnValue(true)`) anpassen —
die `vi.spyOn`-Zeile entfernen. Nach dem Klick auf "Löschen" im vorhandenen Bearbeiten-Dialog den NEUEN
ConfirmDialog abwarten: `const confirmDialog = await screen.findByRole('dialog', { name: 'Dieses
Medium aus der Release-Version entfernen?' })` (Name = neuer title), dann `fireEvent.click(
within(confirmDialog).getByRole('button', { name: 'Entfernen' }))`, danach `await waitFor(() =>
expect(deleteItem).toHaveBeenCalledWith(41))`. Vor dem Edit per `grep -n "window, 'confirm'"` in dieser
Testdatei bestaetigen, ob noch eine zweite Fundstelle existiert, und ggf. analog reparieren.
  </action>
  <verify>
    <automated>grep -rn "window\.confirm" "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx" "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx" "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx" "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx" "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts" "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts" "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx" "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx" | wc -l; wc -l "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx"; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx'" 2>&1 | tail -60</automated>
  </verify>
  <done>
Alle 8 Dateien enthalten keinen `window.confirm`-Aufruf mehr (grep-Treffer = 0); jede Stelle nutzt
`useConfirmDialog()`/`confirm(...)` mit exakt erhaltenem deutschen Originaltext. `SegmenteTab.tsx`
bleibt bei/unter 450 Zeilen. `ReleaseVersionMediaSection.test.tsx` ist gruen und interagiert mit dem
echten ConfirmDialog statt `vi.spyOn(window, 'confirm')`.
  </done>
</task>

<task type="auto">
  <name>Task 3: window.confirm-Migration Batch B — Anime-Admin-Komponenten (4 Dateien, 6 Stellen)</name>
  <files>frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx, frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx, frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx, frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx</files>
  <action>
In jeder Datei `useConfirmDialog` importieren, `const { confirm, confirmDialog } = useConfirmDialog()`
in der Komponente ergaenzen, `{confirmDialog}` in den JSX-Rueckgabewert einhaengen.

1. `AnimeThemesSection.tsx:90` (TRICKY: synchroner Ternary-Guard im inline `onClick`) — aktuell
   `onClick={() => { if (typeof window === 'undefined' || window.confirm('Theme wirklich löschen?')) {
   void model.deleteTheme(theme.id) } }}`. Ersetzen durch einen ASYNCHRONEN inline-Handler, `typeof
   window === 'undefined'`-Guard ENTFERNEN (nicht mehr relevant — die Komponente ist `'use client'` und
   wird nur im Browser gerendert; das Modal-basierte ConfirmDialog braucht keine
   window-Praesenzpruefung): `onClick={async () => { const ok = await confirm({ title: 'Theme wirklich
   löschen?', confirmLabel: 'Löschen', tone: 'danger' }); if (ok) void model.deleteTheme(theme.id) }}`.

2. `AnimeRelationsSection.tsx:189` — identisches Muster: `onClick={() => { if (typeof window ===
   'undefined' || window.confirm('Relation wirklich löschen?')) { void
   model.deleteRelation(relation.target_anime_id) } }}` → `onClick={async () => { const ok = await
   confirm({ title: 'Relation wirklich löschen?', confirmLabel: 'Löschen', tone: 'danger' }); if (ok)
   void model.deleteRelation(relation.target_anime_id) }}` (Guard ebenfalls entfernen).

3. `EpisodeManager.tsx` — DREI Stellen, jede aktuell umschlossen von `if (typeof window !== 'undefined')
   { const confirmed = window.confirm(...); if (!confirmed) return }`. Guard bei allen drei ENTFERNEN
   und die jeweils umschliessende Funktion `async` machen (bestehende Call-Sites uebergeben diese
   Funktionen als Props mit Typ `() => void` bzw. `(episode) => void` an Kindkomponenten
   `EpisodeBulkBar`/`EpisodeTable` — eine `Promise<void>`-zurueckgebende Funktion ist dafuer strukturell
   gueltiges TypeScript, `npm run typecheck` in Task 6 bestaetigt das):
   - Zeile 195-199 `handleRemoveEpisode`: `window.confirm(\`Episode ${episodeNumber} wirklich
     entfernen?\`)` → `await confirm({ title: \`Episode ${episodeNumber} wirklich entfernen?\`,
     confirmLabel: 'Entfernen', tone: 'danger' })`.
   - Zeile 208-213 `handleRemoveSelected`: `window.confirm(\`${manager.selectedCount} ausgewählte
     Episoden wirklich entfernen?\`)` → `await confirm({ title: \`${manager.selectedCount} ausgewählte
     Episoden wirklich entfernen?\`, confirmLabel: 'Entfernen', tone: 'danger' })`.
   - Zeile 237-243 `handleSelectEpisode`: `window.confirm('Es gibt ungespeicherte Änderungen an der
     aktuellen Episode. Trotzdem wechseln und Änderungen verwerfen?')` (ein String, kein `\n\n`) → `await
     confirm({ title: 'Es gibt ungespeicherte Änderungen an der aktuellen Episode. Trotzdem wechseln
     und Änderungen verwerfen?', confirmLabel: 'Wechseln', tone: 'danger' })` (verwirft ungespeicherte
     Aenderungen — destruktiv, `tone: 'danger'`).

4. `AnimeContextFansubManager.tsx:132-135` — Guard entfernen, Funktion `async` machen: `window.confirm(
   \`Fansub "${group.name}" vom Anime entfernen?\n\nVersions-Zuordnungen bleiben erhalten, aber die
   Gruppe ist nicht mehr als Anime-Verknüpfung gelistet.\`)` → `await confirm({ title: \`Fansub
   "${group.name}" vom Anime entfernen?\`, description: 'Versions-Zuordnungen bleiben erhalten, aber
   die Gruppe ist nicht mehr als Anime-Verknüpfung gelistet.', confirmLabel: 'Entfernen', tone: 'danger'
   })`.
  </action>
  <verify>
    <automated>grep -rln "window\.confirm" frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/components/EpisodeManager/" 2>&1 | tail -60</automated>
  </verify>
  <done>
Keine der 4 Dateien enthaelt noch `window.confirm` oder den obsoleten `typeof window`-Guard fuer diesen
Zweck. Alle sechs Stellen nutzen `useConfirmDialog()` mit erhaltenem deutschen Originaltext. Bestehende
EpisodeManager-Tests bleiben gruen.
  </done>
</task>

<task type="auto">
  <name>Task 4: window.confirm-Migration Batch C — Fansubs (4 Dateien, 8 Stellen)</name>
  <files>frontend/src/app/admin/fansubs/create/page.tsx, frontend/src/app/admin/fansubs/page.tsx, "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx", "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx", "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx"</files>
  <action>
In jeder Datei `useConfirmDialog` importieren, `const { confirm, confirmDialog } = useConfirmDialog()`
ergaenzen, `{confirmDialog}` in den JSX-Rueckgabewert einhaengen.

1. `fansubs/create/page.tsx:688-694` (TRICKY: synchroner Ternary-Ausdruck DIREKT im `onClick`) — aktuell
   `onClick={() => dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?") ? undefined :
   (window.location.href = "/admin/fansubs")}`. Ersetzen durch einen asynchronen Block-Handler:
   `onClick={async () => { if (dirty && !(await confirm({ title: 'Ungespeicherte Änderungen
   verwerfen?', confirmLabel: 'Verwerfen', tone: 'danger' }))) return; window.location.href =
   "/admin/fansubs" }}`.

2. `fansubs/page.tsx` — ZWEI Stellen, jeweils bereits als `const ok = window.confirm(...)` mit
   nachfolgendem `if (!ok) return;`:
   - Zeile 331-333: `\`Fansub "${item.name}" wirklich löschen?\n\nEpisoden bleiben erhalten;
     fansub_group_id wird entkoppelt.\`` → `const ok = await confirm({ title: \`Fansub "${item.name}"
     wirklich löschen?\`, description: 'Episoden bleiben erhalten; fansub_group_id wird entkoppelt.',
     confirmLabel: 'Löschen', tone: 'danger' })`.
   - Zeile 361-363: `\`${selected.length} Fansub-Gruppen wirklich löschen?\n\nEpisoden bleiben erhalten;
     fansub_group_id wird entkoppelt.\`` → `const ok = await confirm({ title: \`${selected.length}
     Fansub-Gruppen wirklich löschen?\`, description: 'Episoden bleiben erhalten; fansub_group_id wird
     entkoppelt.', confirmLabel: 'Löschen', tone: 'danger' })`.
   Die jeweils umschliessenden Funktionen `async` machen, falls noch nicht.

3. `NotesTab.tsx:157`: `if (!window.confirm('Gruppennotiz wirklich löschen?')) return` → `if (!(await
   confirm({ title: 'Gruppennotiz wirklich löschen?', confirmLabel: 'Löschen', tone: 'danger' })))
   return`.

4. `ClaimManagementPanel.tsx` — VIER Stellen (Datei ist 433 Zeilen, nahe am 450-Zeilen-Limit — nach
   jeder Stelle `wc -l` pruefen; jede `confirm(...)`-Aufrufoption so knapp formatieren wie lesbar
   moeglich ist, keine zusaetzlichen Leerzeilen/Kommentare einfuegen; ueberschreitet die Datei danach
   450 Zeilen, die vier `confirm({...})`-Aufrufe auf eine gemeinsame kleine lokale Hilfsfunktion
   innerhalb derselben Datei zusammenziehen, z. B. `function buildDangerConfirm(title: string) {
   return { title, confirmLabel: 'Bestätigen einer der vier Labels je nach Stelle', tone: 'danger' as
   const } }` NUR falls dadurch tatsaechlich Zeilen gespart werden — sonst die vier Aufrufe einzeln
   lassen):
   - Zeile 182: `if (!window.confirm('Aktive Einladung zurückziehen? Der bisherige Link kann danach
     nicht mehr verwendet werden.')) return` (ein String) → `if (!(await confirm({ title: 'Aktive
     Einladung zurückziehen? Der bisherige Link kann danach nicht mehr verwendet werden.',
     confirmLabel: 'Zurückziehen', tone: 'danger' }))) return`.
   - Zeile 281: `if (!window.confirm(\`Claim für "${memberNick}" ablehnen?\`)) return` → `if (!(await
     confirm({ title: \`Claim für "${memberNick}" ablehnen?\`, confirmLabel: 'Ablehnen', tone: 'danger'
     }))) return`.
   - Zeile 297: `if (!window.confirm(\`Neuanlage-Antrag mit Nickname "${nickname}" bestätigen?\`))
     return` → `if (!(await confirm({ title: \`Neuanlage-Antrag mit Nickname "${nickname}"
     bestätigen?\`, confirmLabel: 'Bestätigen', tone: 'default' }))) return` (dies BESTAETIGT/genehmigt
     einen Antrag, ist NICHT destruktiv — bewusst `tone: 'default'`, nicht `'danger'`).
   - Zeile 308: `if (!window.confirm('Neuanlage-Antrag ablehnen?')) return` → `if (!(await confirm({
     title: 'Neuanlage-Antrag ablehnen?', confirmLabel: 'Ablehnen', tone: 'danger' }))) return`.
   Alle vier umschliessenden Funktionen sind bereits `async function` — nur der Confirm-Aufruf aendert
   sich.

In `ClaimManagementPanel.test.tsx`: Test `'lets leaders cancel an active invitation when the original
link is no longer available'` (nutzt `vi.spyOn(window, 'confirm').mockReturnValue(true)` vor Zeile
182) anpassen — die `vi.spyOn`-Zeile entfernen. Stattdessen nach dem Klick auf die
Einladung-zuruecknehmen-Aktion den ConfirmDialog abwarten: `const dialog = await screen.findByRole(
'dialog', { name: 'Aktive Einladung zurückziehen? Der bisherige Link kann danach nicht mehr verwendet
werden.' })`, dann `fireEvent.click(within(dialog).getByRole('button', { name: 'Zurückziehen' }))`,
danach die bestehenden Assertions (API-Call/Ergebnis) unveraendert weiterlaufen lassen, nur zeitlich
NACH dem Dialog-Klick platziert (ggf. in ein zusaetzliches `await waitFor(...)` einbetten). Vor dem Edit
den vollstaendigen Testkoerper lesen, um die exakte Assertion-Reihenfolge nach der Aenderung korrekt
beizubehalten.
  </action>
  <verify>
    <automated>grep -rln "window\.confirm" frontend/src/app/admin/fansubs/create/page.tsx frontend/src/app/admin/fansubs/page.tsx "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx" "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx"; wc -l "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx"; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx'" 2>&1 | tail -60</automated>
  </verify>
  <done>
Keine der 4 Produktionsdateien enthaelt noch `window.confirm`. `ClaimManagementPanel.tsx` bleibt bei/
unter 450 Zeilen oder die Ueberschreitung ist per Hilfsfunktion minimiert. Alle acht Stellen nutzen
`useConfirmDialog()` mit erhaltenem deutschen Originaltext; die "bestätigen"-Stelle (Zeile 297) nutzt
bewusst `tone: 'default'` statt `'danger'`. `ClaimManagementPanel.test.tsx` ist gruen und interagiert
mit dem echten ConfirmDialog statt `vi.spyOn(window, 'confirm')`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: GAP-21 Backend-Fix (mapAnimeTypeNameToAPI) + AdminAnimeOverviewClient (GAP-20 Loeschen-Dialog + GAP-21 Typ-/Episoden-Anzeige)</name>
  <files>backend/internal/repository/anime_v2.go, backend/internal/repository/anime_v2_test.go, frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx, frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx</files>
  <behavior>
    - Go-Test 1 (`TestMapAnimeTypeNameToAPI`, Tabellen-Test): `mapAnimeTypeNameToAPI(ptr("film"))` ==
      "film"; `mapAnimeTypeNameToAPI(ptr("tv"))` == "tv"; `mapAnimeTypeNameToAPI(ptr("garbage"))` ==
      "tv" (Default-Fallback bleibt fuer unbekannte Werte); `mapAnimeTypeNameToAPI(nil)` == "tv"; zur
      Sicherheit auch `mapAnimeTypeNameToAPI(ptr("Film"))` (Grossschreibung) == "film" (bestehendes
      `strings.ToLower` greift weiterhin).
    - Frontend-Test 1: Anime-Item mit `type: 'film'` rendert sichtbaren Text "Film" (nicht "FILM",
      nicht "TV").
    - Frontend-Test 2: Anime-Item mit `max_episodes: 1` rendert "1 Episode" (Singular); Anime-Item mit
      `max_episodes: 12` rendert "12 Episoden" (Plural).
    - Frontend-Test 3 (Klick-Pfad Loeschen-Flow): Klick auf "Löschen" oeffnet den ConfirmDialog mit dem
      erwarteten Titel; Klick auf "Abbrechen" im Dialog macht KEINEN API-Aufruf (`deleteAdminAnime`
      nicht aufgerufen); erneuter Klick auf "Löschen" gefolgt von Klick auf den Bestaetigen-Button im
      Dialog ruft `deleteAdminAnime` mit der korrekten ID auf.
  </behavior>
  <action>
**Backend (GAP-21):** In `backend/internal/repository/anime_v2.go`, Funktion `mapAnimeTypeNameToAPI`
(aktuell Zeile 450-473, per `grep -n "^func mapAnimeTypeNameToAPI"` verifizieren): direkt nach `case
"tv": return "tv"` einen neuen Case ergaenzen: `case "film": return "film"`. Der bestehende `case
"movie": return "film"` bleibt UNVERAENDERT stehen (Verteidigung gegen historische Altzeilen, siehe
`<interfaces>`). Alle anderen Cases und der `default: return "tv"`-Fallback bleiben unveraendert.

Neue Datei `backend/internal/repository/anime_v2_test.go` (Package `repository`, Muster aus
`anime_relations_admin_test.go` uebernehmen: reiner Unit-Test ohne DB, `func
TestMapAnimeTypeNameToAPI(t *testing.T)` mit den Faellen aus `<behavior>` Go-Test 1; lokale
Hilfsfunktion `func ptr(s string) *string { return &s }` fuer die Testdatei).

**Frontend (GAP-20 + GAP-21, `AdminAnimeOverviewClient.tsx`):**
1. `useConfirmDialog` aus `@/components/ui` importieren, `const { confirm, confirmDialog } =
   useConfirmDialog()` in der Komponente ergaenzen, `{confirmDialog}` in den JSX-Rueckgabewert (oberste
   Ebene des Fragments) einhaengen.
2. `onDelete`-Funktion: `window.confirm(\`Anime "${anime.title}" wirklich löschen?\n\nZugehörige
   Episoden, Kommentare und Verknüpfungen werden ebenfalls entfernt.\`)` ersetzen durch `const confirmed
   = await confirm({ title: \`Anime "${anime.title}" wirklich löschen?\`, description: 'Zugehörige
   Episoden, Kommentare und Verknüpfungen werden ebenfalls entfernt.', confirmLabel: 'Löschen', tone:
   'danger' })`. `onDelete` ist bereits `async function` — keine weitere Anpassung noetig.
3. GAP-21 Typ-Label: neue kleine, LOKALE Konstante/Funktion in dieser Datei (NICHT
   `TYPE_HINT_LABELS` aus `discoveryPageHelpers.ts` wiederverwenden, siehe `<objective>`), z. B.
   `const ANIME_TYPE_LABELS: Record<string, string> = { tv: 'TV', film: 'Film', ova: 'OVA', ona: 'ONA',
   special: 'Special', bonus: 'Bonus', web: 'Web' }` und `function resolveAnimeTypeLabel(type: string):
   string { return ANIME_TYPE_LABELS[type] ?? type.toUpperCase() }` (Fallback fuer unbekannte
   Zukunfts-Typen bleibt defensiv). Verwendung ersetzt `{anime.type.toUpperCase()}` durch
   `{resolveAnimeTypeLabel(anime.type)}`.
4. GAP-21 Episoden-Pluralisierung: die Zeile `{anime.max_episodes ? \` | ${anime.max_episodes}
   Episoden\` : ""}` ersetzen durch eine Pluralisierungs-Logik, z. B. lokale Funktion
   `function formatEpisodeCount(count: number): string { return count === 1 ? '1 Episode' :
   \`${count} Episoden\` }` und Verwendung `{anime.max_episodes ? \` | ${formatEpisodeCount(
   anime.max_episodes)}\` : ""}`.
5. Datei bleibt weit unter 450 Zeilen (aktuell 240 Zeilen, Zuwachs durch diese Aenderungen ca. 15-20
   Zeilen).

Neue Datei `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx`
(`@vitest-environment jsdom`, Muster aus `AnimeJellyfinFolderList.test.tsx` und
`frontend/src/app/admin/anime/page.test.tsx` uebernehmen): `vi.mock('@/lib/api', ...)` mit
`deleteAdminAnime: vi.fn()`, `deleteUploadedCoverFile: vi.fn()`, `getAnimeList: vi.fn()`, `ApiError`
(gleiche Klassen-Mock-Definition wie in `page.test.tsx`); `vi.mock('@/lib/useAuthSession', () => ({
useAuthSession: vi.fn(() => ({ hasAccessToken: true, ... })) }))`; `vi.mock('next/image', ...)` (Muster
aus `CoverageMatrix.test.tsx`: gibt ein natives `<img>` zurueck); `vi.mock('next/navigation', () => ({
useRouter: () => ({ refresh: vi.fn() }) }))`. Test-Items als `AnimeListItem[]` mit `type: 'film'` und
`max_episodes: 1` bzw. `12` fuer die Anzeige-Tests, sowie ein Item fuer den Klick-Pfad-Test. Tests aus
`<behavior>` (Frontend-Test 1-3) umsetzen; fuer Test 3 `fireEvent.click(screen.getByRole('button', {
name: 'Löschen' }))`, dann `await screen.findByRole('dialog', ...)`, Abbrechen-Pfad und
Bestaetigen-Pfad wie in `<behavior>` beschrieben pruefen (`deleteAdminAnime` gemockt via
`vi.mocked(deleteAdminAnime)`).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/repository/... -run TestMapAnimeTypeNameToAPI -v" 2>&1 | tail -60; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx" 2>&1 | tail -80</automated>
  </verify>
  <done>
`mapAnimeTypeNameToAPI` liefert "film" fuer die DB-Zeile "film"; alle Go-Testfaelle gruen; `go build`/
`go vet` fehlerfrei. `AdminAnimeOverviewClient.tsx` zeigt korrekte Typ-Labels und
Singular/Plural-Episodenzahlen, nutzt `useConfirmDialog()` statt `window.confirm` fuer den
Loeschen-Flow. Alle drei neuen Frontend-Tests gruen.
  </done>
</task>

<task type="auto">
  <name>Task 6: 165-UAT.md-Eintraege, Gesamtverifikation, Backend-Rebuild, Frontend-Restart, Commit</name>
  <files>.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</files>
  <action>
1. Vor dem Bearbeiten mit `file 165-UAT.md` und `cat -A 165-UAT.md | tail -5` bestaetigen, dass die
   Datei reine LF-Zeilenenden verwendet (kein `^M`). Am Ende der `## Gaps`-Liste (nach dem bestehenden
   GAP-19-Eintrag) ZWEI neue Eintraege im exakt gleichen Format wie die bestehenden
   `status: resolved`-Eintraege (siehe GAP-17/18/19 in derselben Datei) anhaengen:

   - truth: "GAP-20 (Live-UAT, 2026-09-22): Admin-Aktionen nutzen an 23 Stellen in 17 Dateien native
     window.confirm-Browser-Dialoge statt eines gestylten, konsistenten Bestätigungsmusters"
     status: resolved
     reason: "Quick-Task 260922-min: neues ConfirmDialog-Primitive (useConfirmDialog-Hook,
     Promise-basiert, auf Modal aufgebaut, kein neuer globaler Context) unter @/components/ui ersetzt
     alle 23 window.confirm-Aufrufe in den 17 betroffenen Dateien. Neue ESLint-Regeln
     (no-restricted-properties fuer window.confirm, no-restricted-globals fuer bare confirm()) mit
     Severity error verbieten Rueckfaelle repo-weit, ohne Legacy-Ausnahmen. window.alert/window.prompt
     kommen im Repo nicht vor (verifiziert, kein Migrationsbedarf)."
     severity: minor
     test: 1
     root_cause: "siehe .planning/quick/260922-min-gap-20-gap-21-gemeinsamer-bestaetigungsd/260922-min-SUMMARY.md"
     artifacts: []
     missing: []

   - truth: "GAP-21 (Live-UAT, 2026-09-22): Anime-Übersicht zeigt für Film-Anime fälschlich den Typ
     \"TV\" (Backend-Mapping-Bug) und formatiert Typ-Label sowie Episodenzahl falsch (\"FILM\" statt
     \"Film\", immer Plural \"Episoden\" auch bei genau 1)"
     status: resolved
     reason: "Quick-Task 260922-min: mapAnimeTypeNameToAPI (backend/internal/repository/anime_v2.go)
     bekam den fehlenden case \"film\": return \"film\" (anime_types-Tabelle seedet 'film', nicht
     'movie'); wirkt an allen vier Lesepfaden (Liste, Detail, Update-Response, Themes-Response).
     Frontend AdminAnimeOverviewClient.tsx zeigt jetzt eine dedizierte Typ-Label-Map (TV/Film/OVA/ONA/
     Special/Bonus/Web) statt anime.type.toUpperCase() sowie korrekte Singular/Plural-Formatierung
     (\"1 Episode\" vs. \"N Episoden\")."
     severity: minor
     test: 1
     root_cause: "siehe .planning/quick/260922-min-gap-20-gap-21-gemeinsamer-bestaetigungsd/260922-min-SUMMARY.md"
     artifacts: []
     missing: []

   Nach dem Edit erneut `cat -A 165-UAT.md | tail -30` pruefen — keine `^M`-Zeichen, LF bleibt erhalten
   (Write/Edit-Tool verwenden, kein Bash-Heredoc).

2. Vollstaendige Frontend-Verifikation (gesamte Suite, nicht nur betroffene Dateien):
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test" 2>&1 | tail -200` — alle
   Tests gruen (inkl. aller in diesem Plan neuen/geaenderten). Danach `docker compose exec -T
   team4sv30-frontend sh -c "cd /app && npm run typecheck" 2>&1 | tail -100` — fehlerfrei. Danach
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint" 2>&1 | tail -150` —
   fehlerfrei, insbesondere KEIN `no-restricted-properties`/`no-restricted-globals`-Treffer fuer
   `confirm` irgendwo im Repo.

3. Repo-weiter Beweis, dass keine `window.confirm`-Stelle mehr existiert: `grep -rn "window\.confirm"
   frontend/src | wc -l` muss `0` liefern.

4. Backend-Rebuild (GAP-21-Fix wirksam machen): `docker compose up -d --build team4sv30-backend`.
   Danach Health-Check: `docker compose ps team4sv30-backend` zeigt "Up", sowie `curl -sf
   http://192.168.235.196:8092/health -o /dev/null -w "%{http_code}\n"` liefert `200`. Danach die
   Kern-Tests im NEUEN Container erneut ausfuehren: `docker exec team4sv30-backend sh -c "cd /app &&
   go test ./internal/repository/... -run TestMapAnimeTypeNameToAPI -v"`.

5. Frontend-Container gemaess Auftrag neu starten: `docker restart team4sv30-frontend`. Danach kurz
   pruefen, dass der Container wieder laeuft: `docker compose ps team4sv30-frontend` zeigt "Up".

6. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` (Frontmatter dieses Plans)
   gelisteten Pfade explizit per Pfad zu `git add` hinzufuegen, dann `git commit` mit einer
   Commit-Message, die auf GAP-20 und GAP-21 (Phase 165 Live-UAT) verweist. Kein `git push`, kein
   `git stash`.
  </action>
  <verify>
    <automated>grep -c "GAP-20\|GAP-21" /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; file /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; grep -rn "window\.confirm" /home/d1sk/team4s/frontend/src | wc -l; docker compose ps team4sv30-backend team4sv30-frontend; curl -sf http://192.168.235.196:8092/health -o /dev/null -w "%{http_code}\n"</automated>
  </verify>
  <done>
`165-UAT.md` enthaelt beide neuen Eintraege (`status: resolved`), Datei bleibt LF-only. Gesamte
Frontend-Testsuite, Typecheck und Lint sind fehlerfrei. `grep -rn "window.confirm" frontend/src` liefert
0 Treffer. Backend-Container per `docker compose up -d --build` neu gebaut und gesund (`/health` liefert
200), Go-Test gruen im neuen Container. Frontend-Container per `docker restart` neu gestartet und laeuft.
Aenderungen gezielt committet (kein `git add -A`), kein Push.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin-Browser → ConfirmDialog (client-seitig, keine Netzwerkgrenze) | Rein clientseitige UI-Interaktion; keine neue Eingabeklasse, kein neuer Server-Endpunkt. Ersetzt nur den Praesentationsmechanismus einer bereits bestehenden Bestaetigungsentscheidung. |
| Admin-Browser → Backend Admin-API (`GET /api/v1/admin/anime`, `DELETE /api/v1/admin/anime/{id}`) | Unveraendert durch diesen Plan (bereits admin-only geschuetzt). GAP-21 aendert nur die Werte-Mapping-Logik einer bereits vorhandenen Lesespalte, keine neue Eingabeklasse. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-260922-min-01 | Tampering | `ConfirmDialog.tsx` `confirm()`-API | accept | Reines Praesentations-Primitive ohne Netzwerk-I/O; die eigentliche destruktive Aktion (z. B. `deleteAdminAnime`) bleibt unveraendert hinter der bestehenden Admin-Auth. Kein neuer Vertrauensgrenzuebergang. |
| T-quick-260922-min-02 | Denial of Service | `useConfirmDialog` Zustandslogik (evtl. ueberlappende `confirm()`-Aufrufe) | accept | Ein zweiter `confirm()`-Aufruf waehrend ein Dialog offen ist loest den ersten automatisch mit `false` auf statt zu haengen/abzustuerzen; bei den 23 migrierten Call-Sites tritt Ueberlappung praktisch nie ein (jede Stelle wartet auf die Promise, bevor sie fortfaehrt). |
| T-quick-260922-min-03 | Information Disclosure | `mapAnimeTypeNameToAPI` (GAP-21) | accept | Reine Werte-Mapping-Funktion ohne Nutzereingabe-Verarbeitung; korrigiert nur eine falsche Kategorisierung, keine neue Datenexposition. |
</threat_model>

<verification>
1. `grep -rn "window\.confirm" frontend/src` liefert 0 Treffer.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"` — komplette Suite gruen.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"` — fehlerfrei.
4. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` — fehlerfrei.
5. `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/repository/... -run TestMapAnimeTypeNameToAPI -v"` — gruen.
6. `docker compose up -d --build team4sv30-backend` gefolgt von `curl` gegen `/health` — 200, Container gesund.
7. `docker restart team4sv30-frontend` — Container laeuft danach wieder.
8. `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` enthaelt GAP-20 und GAP-21 als `status: resolved`, Datei bleibt LF-only.
9. `git diff --stat` zeigt ausschliesslich die in `files_modified` gelisteten Pfade — kein `git add -A`, kein Push.
</verification>

<success_criteria>
- Alle 23 `window.confirm`-Aufrufe in den 17 betroffenen Dateien sind durch das neue
  `ConfirmDialog`-Primitive (`useConfirmDialog`) ersetzt, mit erhaltenem deutschen Originaltext und
  erhaltenem Nachher-Verhalten.
- Neue ESLint-Regeln verbieten `window.confirm`/bare `confirm()` repo-weit mit Severity `error`, ohne
  Legacy-Ausnahmen; die bestehende `no-restricted-syntax`-Ratchet-Logik fuer `<select>/<input>/
  <textarea>` bleibt unveraendert.
- Die Admin-Anime-Uebersicht zeigt fuer Film-Anime korrekt "Film" (nicht "TV"/"FILM") und korrekte
  Singular/Plural-Episodenzahlen.
- `mapAnimeTypeNameToAPI` liefert fuer die DB-Zeile "film" den API-Wert "film", konsistent an allen vier
  Lesepfaden.
- Kein Produktionsdatei-Zuwachs ueber die 450-Zeilen-Grenze durch dieses Vorhaben (bereits ueber der
  Grenze liegende Alt-Last-Dateien wachsen durch diesen Plan nur minimal, keine neue Ueberschreitung bei
  zuvor konformen Dateien).
- Vollstaendige Frontend-Testsuite, Typecheck und Lint sind fehlerfrei; Go-Tests fuer den Backend-Fix
  sind gruen.
- Backend-Container per `docker compose up -d --build` neu gebaut und gesund; Frontend-Container per
  `docker restart` neu gestartet.
- GAP-20 und GAP-21 sind in `165-UAT.md` als `status: resolved` dokumentiert. Kein `git push`, kein
  `git stash`, keine `.env`- oder `team4s_v2`-Datenaenderung.
</success_criteria>

<output>
Create `.planning/quick/260922-min-gap-20-gap-21-gemeinsamer-bestaetigungsd/260922-min-SUMMARY.md` when done
</output>
