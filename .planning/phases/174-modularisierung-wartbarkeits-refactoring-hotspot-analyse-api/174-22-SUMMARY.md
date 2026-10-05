---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 22
subsystem: ui
tags: [css-modules, refactoring, fansub-edit, css]

# Dependency graph
requires:
  - phase: 174-21
    provides: Welle-4-Abschlussmessung und Baseline-Testsuite-Stand, auf dem diese CSS-Trennung aufsetzt
provides:
  - "FansubEdit.module.css reduziert von 4568 auf 3379 Zeilen (-26%), 97 grep-verifizierte Single-Owner-Klassen in 15 neue per-Komponenten .module.css ausgelagert"
  - "Vollstaendige class-by-class Konsumenten-Klassifikation (dead/single-owner/shared/external/entangled) fuer alle 386 Klassen, als Audit-Trail fuer 174-REPORT.md (D-23)"
  - "11+4=15 Dateien ausserhalb der 22 geplanten Konsumenten identifiziert, die FansubEdit.module.css ueber Prop-Drilling bzw. die admin/fansubs/create/-Route mitnutzen - als Scope-Hinweis fuer Folgephasen dokumentiert"
affects: [174-23, 174-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-verifizierte Single-Owner-CSS-Modul-Extraktion: Klasse wird nur verschoben, wenn ALLE Vorkommen im gesamten frontend/src-Baum (nicht nur dem Zielverzeichnis) auf genau einen .tsx-Konsumenten zeigen"
    - "CSS-Modules-Compound-Selector-Schutz: Klassen, die in einem Compound-/Nachfahren-Selektor gemeinsam mit einer geteilten Klasse auftauchen, bleiben zusammen in der geteilten Datei, da CSS Modules Klassennamen pro Datei haeschen und ein Split den Selector sonst lautlos wirkungslos machen wuerde"
    - "Comma-Selector-Split bei gemischten Komma-Listen: `.ownA, .sharedB { decls }` wird in `.ownA { decls }` (neue Datei) und `.sharedB { decls }` (geteilte Datei) aufgeteilt, Deklarationen bleiben byte-identisch dupliziert pro Ziel"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/RoleToggleGroup.module.css
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/RoleToggleGroup.tsx
    - frontend/src/lib/roleCatalog.accessibility.test.ts

key-decisions:
  - "Konsumenten-Audit auf den gesamten frontend/src-Baum ausgeweitet statt nur auf die 22 im Plan benannten Dateien, nachdem sich herausstellte, dass FansubEdit.module.css per Prop-Drilling (styles-Objekt als Prop) auch von 11 weiteren Dateien im [id]/edit/-Verzeichnis sowie von 4 Dateien unter admin/fansubs/create/ genutzt wird"
  - "5 Klassen trotz grep-bestaetigtem Single-Owner-Status NICHT extrahiert (bleiben in FansubEdit.module.css), weil sie in einem Compound-Selektor mit einer geteilten Klasse stehen - CSS Modules haeschen Klassennamen pro Datei, ein Split haette die Regel lautlos unwirksam gemacht"
  - "roleCatalog.accessibility.test.ts per D-03-Ausnahme auf die neuen Modulpfade umgestellt (3 Klassen physisch verschoben), Formeln/Erwartungswerte unveraendert"

requirements-completed: [D-18, D-02, D-19, D-22]

# Metrics
duration: ~90min
completed: 2026-10-05
---

# Phase 174 Plan 22: FansubEdit.module.css Single-Owner-Extraktion Summary

**97 grep-verifizierte Single-Owner-CSS-Klassen aus `FansubEdit.module.css` (4568 Zeilen) in 15 neue per-Komponenten `.module.css`-Dateien extrahiert (-26% Zeilen), inklusive eines nachtraeglich gefundenen und korrigierten Scope-Lecks ueber `admin/fansubs/create/`.**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-10-05 (im Anschluss an 174-21)
- **Completed:** 2026-10-05T21:05:00Z
- **Tasks:** 3 (Audit, Extraktion Batch 1, Extraktion Batch 2 + Finalisierung)
- **Files modified:** 32 (16 .tsx geaendert, 1 geteiltes .module.css geaendert, 15 neue .module.css, 1 Test per D-03-Ausnahme angepasst)

## Accomplishments

- Vollstaendige, grep-belegte Klassifikation aller 386 Top-Level-Klassen in `FansubEdit.module.css`: 97 extrahiert, 33 echt geteilt (2+ Konsumenten innerhalb der 22), 132 mit Konsumenten ausserhalb der 22 geplanten Dateien, 5 wegen Compound-Selektor-Verzahnung bewusst nicht extrahiert, 119 ohne gefundenen Konsumenten (als tot geflaggt, D-23, nicht geloescht)
- `FansubEdit.module.css`: 4568 → 3379 Zeilen (102.301 → 76.617 Byte), verbleibende Klassen sind alle grep-bestaetigt entweder geteilt, extern genutzt oder Compound-verzahnt
- 15 der 22 geplanten Konsumenten-Dateien erhalten ihr eigenes `.module.css` (6 Dateien hatten keine Single-Owner-Klassen und bleiben unveraendert: `AnimeContributionModal.tsx`, `AnimeProjectNoteForm.tsx`, `NotesTab.helpers.tsx`, `NotesTab.tsx`, `ProjectCockpitBadges.tsx`, `ReleaseContributionDrawer.tsx`; `FansubEditClient.tsx` wurde zunaechst extrahiert, dann wieder zurueckgesetzt, siehe Deviations)
- Ein waehrend der Verifikation gefundenes echtes Scope-Leck (`fansubEditToast` wird auch von `admin/fansubs/create/page.tsx` genutzt, einer Datei ausserhalb der im Plan als vollstaendig deklarierten 22-Konsumenten-Liste) wurde noch vor dem Commit korrigiert
- Volle Test-/Typecheck-/Lint-/Build-Gate nach der Korrektur gruen: `tsc --noEmit`, `eslint .`, `vitest run` (3248/3254 Tests gruen, 6 vorbestehende Baseline-Fehler unveraendert), `docker compose build team4sv30-frontend` erfolgreich

## Task Commits

1. **Task 1: Grep-Audit aller Klassen in FansubEdit.module.css** - kein eigener Commit (reine Analyse, keine Dateiaenderung; Ergebnis fliesst in Task 2/3 und dieses SUMMARY)
2. **Task 2: Extraktion erste Haelfte der Konsumenten** - `12b307bf` (refactor)
3. **Task 3: Extraktion zweite Haelfte, Finalisierung des geteilten Files, D-03-Testfix** - `91d9d4da` (refactor)

**Plan metadata:** folgt (docs: complete plan)

## Files Created/Modified

### Neu erstellt (15 `.module.css`, je einer existierenden Komponente zugeordnet)
- `AnimeProjectNotesSection.module.css` (9 Klassen) · `AnimeReleasesFilterBar.module.css` (1) · `ContributorAvatar.module.css` (2) · `FansubAppMemberAddModal.module.css` (8) · `FansubAppMemberEditorPanel.module.css` (18) · `FansubAppMembersOverview.module.css` (8) · `FansubAppMembersSection.module.css` (4) · `GroupHistRoleDialog.module.css` (1) · `GroupMemberFormModals.module.css` (3) · `GroupMemberRequestsTable.module.css` (1) · `GroupMembersHistTable.module.css` (17) · `GroupMembersTab.module.css` (2) · `ReadinessTab.module.css` (5) · `ReleaseVersionMediaDrawerSummary.module.css` (16) · `RoleToggleGroup.module.css` (2)

### Geaendert
- `FansubEdit.module.css` - 97 Single-Owner-Klassen entfernt (teils per Komma-Selector-Split, Rest unveraendert); verbleibende Klassen sind geteilt/extern/Compound-verzahnt/tot
- 15 `.tsx`-Dateien - Import auf das eigene neue `.module.css` umgestellt (voller Austausch bei reinen Single-Owner-Dateien, zusaetzlicher zweiter Import bei gemischtem Verbrauch)
- `frontend/src/lib/roleCatalog.accessibility.test.ts` - Modulpfad-Anpassung (D-03-Ausnahme, siehe Deviations)

## Decisions Made

- **Audit-Scope auf den gesamten `frontend/src`-Baum erweitert.** Der Plan deklarierte 22 Dateien als "vollstaendiges, grep-bestaetigtes Universum" der Konsumenten (verifiziert per `grep -rl "FansubEdit.module.css" .../edit/*.tsx`, Textmatch des Importstatements). Die Konsumenten-ZAEHLUNG fuer die Single-Owner-Klassifikation darf sich aber nicht auf Textmatches des Importstatements beschraenken, weil `FansubEditClient.tsx` sein gemergtes `styles`-Objekt als Prop an `ReleaseMediaDrawer.tsx` durchreicht, welches es wiederum an `ReleaseThemeDrawerSection.tsx` weiterreicht usw. - 11 weitere Dateien im `[id]/edit/`-Verzeichnis konsumieren FansubEdit.module.css-Klassen auf diese Weise, OHNE die Datei selbst zu importieren. Eine noch spaetere Vollverzeichnis-Pruefung deckte zusaetzlich 4 Dateien unter `admin/fansubs/create/` auf, die `FansubEdit.module.css` direkt importieren (`../[id]/edit/FansubEdit.module.css`) und ebenfalls nicht in der 22er-Liste stehen. Ohne diese Erweiterung waeren mehrere tatsaechlich noch verwendete Klassen faelschlich als "tot" oder "Single-Owner" klassifiziert worden.
- **5 grep-bestaetigte Single-Owner-Klassen bewusst NICHT extrahiert** (`fansubEditTableSurface`, `fansubEditMemberAddCard`, `fansubEditMemberEditorPanel`, `fansubEditMemberMobileCard`, `contributionRoleToggles`): Jede dieser Klassen tritt mindestens einmal in einem Compound-/Nachfahren-Selektor zusammen mit einer ECHT geteilten Klasse auf (z. B. `.fansubEditTableSurface .fansubEditTableWrapWine thead th`, `.contributionEditRow .contributionRoleToggles`). CSS Modules haeschen jeden Klassennamen lokal pro Datei - wuerde die "eigene" Haelfte des Compound-Selektors in eine neue Datei wandern, bekaeme sie dort einen ANDEREN Hash als der, den die JSX-Komponente tatsaechlich rendert (da die geteilte Gegenstueck-Klasse weiterhin ueber die alte Datei aufgeloest wird); die Regel wuerde lautlos nie mehr greifen. Das ist kein hypothetisches Risiko, sondern der exakte Mechanismus, vor dem D-18 warnt ("CSS-Modul-Aufteilung kann Spezifitaet/Reihenfolge aendern") - hier verschaerft zu einem Totalausfall der Regel statt nur einer Reihenfolgenverschiebung.
- **Komma-Selektor-Listen werden pro Branch gesplittet, nicht als Ganzes verschoben oder belassen.** Drei Faelle (`.fansubEditMembershipAssignCard, .fansubEditMembershipCard, .fansubEditMembershipEmpty` u.ae.) kombinierten in EINER Regel Klassen mit unterschiedlichem Zielort (Single-Owner A, tot, Single-Owner B). Da Komma-Selektoren syntaktisch unabhaengige Regeln mit identischen Deklarationen sind, wurde jeder Branch unabhaengig seinem Ziel zugeordnet (Deklarationen dabei byte-identisch depliziert) - das ist technisch ein "Duplizieren" der Deklaration, aber keine Verletzung von D-18s Tokens/Variablen-Dedupe-Regel, da es sich um eine mechanische Trennung einer bereits unabhaengigen Selektor-Gruppe handelt, nicht um erfundenen neuen Wert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `fansubEditToast` faelschlich als Single-Owner extrahiert, dann korrigiert**
- **Found during:** Task 3 (finale Vollverzeichnis-Verifikation ueber `frontend/src`, nicht nur `.../edit/`)
- **Issue:** `fansubEditToast` wurde zunaechst korrekt als Single-Owner von `FansubEditClient.tsx` eingestuft (einziger Konsument *innerhalb* der 22 gelisteten Dateien und der 11 per Prop-Drilling erkannten Zusatzkonsumenten) und in ein neues `FansubEditClient.module.css` extrahiert. Eine abschliessende Pruefung ueber den GESAMTEN `frontend/src`-Baum zeigte, dass `admin/fansubs/create/page.tsx` (eine voellig andere Route, Formular zum Anlegen eines neuen Fansub-Eintrags) dieselbe Klasse ueber denselben Importpfad (`../[id]/edit/FansubEdit.module.css`) ebenfalls nutzt. Haette die Extraktion bestand gehabt, waere die Toast-Klasse auf der Create-Seite lautlos wirkungslos geworden (CSS-Modules-Hash-Mismatch).
- **Fix:** Extraktion vollstaendig zurueckgerollt: `FansubEditClient.module.css` geloescht, `.fansubEditToast`-Regel unveraendert zurueck in `FansubEdit.module.css` eingefuegt, `FansubEditClient.tsx` exakt auf den Ursprungszustand zurueckgesetzt (verifiziert via `git diff` = leer vor dem Commit).
- **Files modified:** `FansubEdit.module.css`, `FansubEditClient.tsx` (netto keine Aenderung gegenueber dem Ausgangszustand)
- **Verification:** `git diff` gegen den Pre-174-22-Stand von `FansubEditClient.tsx` ist leer; Vollverzeichnis-Grep aller 97 verbleibenden extrahierten Klassen findet keine weiteren Konsumenten ausserhalb ihres jeweiligen neuen Besitzer-Files mehr
- **Committed in:** `91d9d4da` (Task-3-Commit, vor dem eigentlichen Commit korrigiert, kein separater Fix-Commit noetig)

**2. [Rule 1 - Bug] Verwaister `styles`-Merge in `ReadinessTab.tsx` nach Vollextraktion**
- **Found during:** Task 3 (ESLint-Lauf nach der Extraktion)
- **Issue:** `ReadinessTab.tsx` nutzte ausschliesslich Single-Owner-Klassen aus `FansubEdit.module.css` (alle 5 extrahiert). Nach der Umstellung auf den eigenen `ownStyles`-Import blieb `const styles = { ...sharedStyles, ...fansubEditStyles }` samt beider Importe toter Code (`'styles' is assigned a value but never used`, neue ESLint-Warnung gegenueber der Baseline).
- **Fix:** `sharedStyles`-/`fansubEditStyles`-Importe und die `const styles`-Zeile entfernt (Datei nutzt ausschliesslich `ownStyles`).
- **Files modified:** `ReadinessTab.tsx`
- **Verification:** `npx eslint "ReadinessTab.tsx"` danach ohne Warnung; `npx vitest run ReadinessTab.test.tsx` weiterhin 6/6 gruen
- **Committed in:** `91d9d4da`

**3. [D-03 exception - pure import-path adjustment] `roleCatalog.accessibility.test.ts` liest drei verschobene Klassen aus dem falschen File**
- **Found during:** Task 3 (voller `vitest run` nach der Extraktion)
- **Issue:** Der Test liest `FansubEdit.module.css` als Rohtext und prueft per Regex Kontrastformeln fuer `.fansubEditMemberRoleToggle`, `.fansubEditMemberRoleToggleSelected` (jetzt in `FansubAppMemberEditorPanel.module.css`) sowie das 74%-Color-Mix von `.fansubEditHistoricalRoleBadge small` (jetzt in `GroupMembersHistTable.module.css`). Nach der Extraktion fand der Regex die Klassen nicht mehr in der alten Datei - 3 Tests schlugen fehl.
- **Fix:** `readModule(...)`-Aufrufe auf die beiden neuen Zieldateien umgestellt (`memberEditorPanelCssText`, `groupMembersHistTableCssText`), die gepruften Formeln/Erwartungswerte (inkl. der bekannten Kontrast-Luecken-Hexliste `['#c26a2e', '#6b7f2a']` bzw. `['#c26a2e']`) blieben unveraendert - das ist eine reine Modulpfad-Anpassung im Sinne der D-03-Ausnahme, keine inhaltliche Testaenderung.
- **Files modified:** `frontend/src/lib/roleCatalog.accessibility.test.ts`
- **Verification:** `npx vitest run src/lib/roleCatalog.accessibility.test.ts` → 15/15 gruen (vorher 3 Fehlschlaege)
- **Committed in:** `91d9d4da`

---

**Total deviations:** 3 (1 Rule-1-Bug-Korrektur mit Rollback, 1 Rule-1-Lint-Fix, 1 D-03-Ausnahme mit Einzelbegruendung)
**Impact on plan:** Alle drei waren noetig, um die Extraktion tatsaechlich verhaltenserhaltend zu machen bzw. die Baseline (Lint/Tests) sauber zu halten. Kein Scope-Creep - die D-03-Ausnahme betrifft exakt die drei Klassen, die physisch verschoben wurden, keine andere Testdatei/Assertion wurde angefasst.

## Known Dead CSS (D-23, geflaggt fuer 174-REPORT.md, NICHT geloescht)

119 Klassen in `FansubEdit.module.css` haben keinen gefundenen Konsumenten im gesamten `frontend/src`-Baum (zwei unabhaengige Pruefmethoden: Textsuche `\.<Klasse>\b` ueber alle `.ts`/`.tsx`-Dateien sowie eine gezielte Suche nach dynamischem Bracket-Zugriff `styles['...']`/`styles[\`...\`]`, die nirgends im Projekt vorkommt). Viele tragen Namen, die zu bereits in frueheren Wellen ausgelagerten Komponenten passen (`fansubEditTimeline*` → vermutlich Altlast von `AnimeProjectTimelineSection.tsx`s Extraktion, `fansubEditor*` → vermutlich Altlast von `FansubOpEdSection.tsx`), was die Dead-Klassifikation zusaetzlich plausibilisiert. Vollstaendige Liste (Auszug, alphabetisch):

`contributionDrawerHint`, `contributionDrawerToolbar`, `fansubEditAnimeContributorsButton`, `fansubEditAnimeProjectNoteActions`, `fansubEditAnimeProjectNoteForm`, `fansubEditAnimeReleaseActions`, `fansubEditBasicIntro`, `fansubEditBasicSupplement(Body|Header|Title)`, `fansubEditBasicTitle`, `fansubEditClaim(Actions|Cell|Invite|Item|List)`, `fansubEditDropzone`, `fansubEditHistorical(ClaimActions|MemberActions|MemberBody|MemberMetaRow|MemberRoleChips|RoleActions|RoleChip)`, `fansubEditLinkInputInvalid`, `fansubEditMedia(Actions|Card|PermissionSummary)`, `fansubEditMembership(ActionRow|BadgeRow|Body|Card|CardTop|Controls|Identity|List|MetaGrid|MetaLine|ModalSection|NameRow|Profile|RoleControls|RoleEditor|RoleItem|RoleItemMain|RoleList|RoleSummary|Title|VisibilityBadge)`, `fansubEditPreviewLinkButton`, `fansubEditRelease(Actions|AssignmentCopy|AssignmentPanel|CardChips|DrawerAssetTypes|DrawerContextGrid|DrawerFieldGrid|DrawerMediaCard|DrawerMediaGrid|DrawerMediaHeader|DrawerMediaThumb|DrawerReadOnly|DrawerTextarea|EditButton|ExpandedHeader|IconButton|Row|RowDisclosure|ScopeBadge|TitleButton|TitleCell|TitleDisclosure)`, `fansubEditSaveSuccess`, `fansubEditSegment(AssetHint|Card|CardActive|Editor|Grid|Status|Statusglobal|Statusmissing|Statusrelease)`, `fansubEditThemeMissingMark`, `fansubEditTimeline*` (16 Varianten), `fansubEditor*` (12 Varianten), `formActionRow`, `formLayoutShell`, `formSectionCard`, `formSectionTitle`, `formSections`, `inputRow` (zunaechst faelschlich als tot eingestuft, korrigiert - siehe unten), `responsiveFieldGrid` (dito)

**Korrektur waehrend des Audits:** 4 Klassen (`fansubEditLinkInputInvalid`, `fansubEditPreviewLinkButton`, `inputRow`, `responsiveFieldGrid`) wurden beim ersten (auf `.../edit/` beschraenkten) Durchlauf als tot eingestuft, sind aber tatsaechlich Konsumenten in `admin/fansubs/create/*.tsx` - sie wurden rechtzeitig vor jeder Code-Aenderung in die Kategorie "extern genutzt" umklassifiziert (kein Codefehler, da nie extrahiert, nur eine Korrektur der Audit-Tabelle).

## Scope-Hinweis fuer Folgephasen (kein Fix in 174-22, nur dokumentiert)

15 Dateien ausserhalb der im Plan deklarierten 22-Konsumenten-Liste nutzen `FansubEdit.module.css`-Klassen und wurden deshalb bewusst NICHT angefasst (haette die Datei-Obergrenze des Plans gesprengt):

- **Per Prop-Drilling** (styles-Objekt wird als Prop durchgereicht, kein eigener Import): `AnimeReleasesCockpit.tsx`, `FansubBasicInfoTab.tsx`, `FansubCommunityLinksList.tsx`, `FansubDetailsTab.tsx`, `FansubEditHeaderCard.tsx`, `FansubOpEdSection.tsx`, `ReleaseMediaDrawer.tsx`, `ReleaseRowDetails.tsx`, `ReleaseThemeAssetsSection.tsx`, `ReleaseThemeDrawerSection.tsx`, `sections/FansubEditWorkspaceSection.tsx`
- **Per direktem Import einer anderen Route:** `admin/fansubs/create/page.tsx`, `AdminFansubCreateAliasesSection.tsx`, `AdminFansubCreateLinksSection.tsx`, `AdminFansubCreateMediaSection.tsx` (alle via `../[id]/edit/FansubEdit.module.css`)

Alle 132 als "extern genutzt" klassifizierten Klassen bleiben aus genau diesem Grund in `FansubEdit.module.css` - eine weitere Aufspaltung (z. B. "ein gemeinsames FansubCreateEdit-Shared.module.css fuer beide Routen") ist eine Folgephasen-Kandidatur, kein Bug dieser Phase.

## Issues Encountered

Siehe Deviations oben. Kein ungeloestes Problem.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- `174-23` und `174-24` koennen wie geplant fortfahren; `174-24`s manueller Visual-Equality-Checkpoint ist weiterhin der einzige verbleibende Korrektheitsnachweis fuer diese CSS-Trennung (keine automatisierte visuelle Regressionspruefung im Repo vorhanden, bestaetigt durch 174-RESEARCH.md)
- Vollstaendige Audit-Daten (386-Klassen-Klassifikation, Dead-Liste, External-Liste) stehen fuer `174-REPORT.md` (Welle 6) bereit
- Baseline-Testfehler unveraendert (6 Tests, 4 Dateien, alle vor 174-22 bereits rot, keine Beruehrung durch dieses Plan): `cssCustomProperties.guard.test.ts` (2, vorbestehender Line-Number-Drift-Bug seit vor 174-22, siehe unten), `PublicReleaseSurfacesShowcase.test.tsx` (1), `EpisodeImportEpisodeGroup.test.tsx` (2), `fansubprojekt/.../page.test.tsx` (1)

### Baseline-Detail: `cssCustomProperties.guard.test.ts`

Dieser Test hatte bereits VOR 174-22 einen fest codierten Zeilen-Verweis (`line: 282`) auf eine Text-Erwaehnung in `roleCatalog.accessibility.test.ts`, die dort tatsaechlich auf Zeile 268 stand (verifiziert via `git show HEAD:frontend/src/lib/roleCatalog.accessibility.test.ts`, HEAD = Stand vor jeder 174-22-Aenderung). Der Guard war also bereits vor diesem Plan rot. Die D-03-Testkorrektur in diesem Plan hat die betroffene Zeile weiter auf 275 verschoben (durch den eingefuegten Kommentarblock) - das aendert nichts am bereits bestehenden Fehlzustand und wird hier als Baseline dokumentiert statt repariert, da `cssCustomProperties.guard.test.ts` nicht zu den Dateien dieses Plans gehoert.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*
