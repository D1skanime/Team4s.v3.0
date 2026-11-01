# Deferred Items — Quick Task 261029-i1y

Scope-Grenze (siehe Executor-Regeln „SCOPE BOUNDARY"): nur Befunde, die NICHT durch die
Änderungen dieses Auftrags verursacht wurden, werden hier dokumentiert statt behoben.

## `npm run lint`: 4 vorbestehende Fehler (nicht Teil dieses Auftrags)

Repo-weit `npm run lint` liefert durchgehend **4 Fehler**, die bereits vor Beginn dieses
Quick-Tasks auf `main` vorhanden waren (identisch zu den in
`261029-d3k-SUMMARY.md` dokumentierten vier Fehlern, unverändert seither):

1. `capture-responsive.cjs` (Zeilen 1-2): `@typescript-eslint/no-require-imports` —
   `require()`-Imports in einem Root-Skript, keine Berührung durch diesen Auftrag.
2. `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx` (Zeile 69):
   `no-restricted-syntax` — natives `<input>` statt `<Input>`, keine Berührung durch diesen
   Auftrag.
3. `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
   (Zeile 249): `Compilation Skipped: Existing memoization could not be preserved`
   (`eslint-plugin-react-compiler`), keine Berührung durch diesen Auftrag.

Letzte Änderung dieser drei Dateien laut `git log` liegt deutlich vor diesem Auftrag
(z. B. `486efa97e`, `bb3f15d1b`, `68e3bfb15`) — keine Überschneidung mit den 16 Tasks
dieses Plans. Keine neuen Lint-Fehler durch diesen Auftrag eingeführt.

## Behoben nach unabhängigem Review: aria-invalid auf DatePicker/YearPicker-Trigger

Ursprünglich hier als "erwartete Warnung" dokumentiert: `jsx-a11y/role-supports-aria-props`
warnte, dass `aria-invalid` auf dem `<button>`-Trigger von `DatePicker`/`YearPicker`
(implizite Rolle `button`) laut ARIA-Spezifikation nicht unterstützt ist. Ein
unabhängiger Code-Review stufte das als echten Spec-Verstoß ein, nicht als
hinnehmbare Einschränkung. Behoben: `aria-invalid` wird für diese beiden Feldtypen
nicht mehr injiziert (FormField.tsx); der Fehlerzustand bleibt über die bereits
vorhandene visuelle `invalid`-Klasse plus `aria-describedby` (rollenunabhängig gültig)
erkennbar. Die beiden Warnungen sind damit weg, nicht nur dokumentiert.

## ASCII-Umlaute in docs/FRONTEND_ARCHITEKTUR.md: nur die Storybook-Textstelle korrigiert

Task 15 hat `docs/FRONTEND_ARCHITEKTUR.md` fuer die neue Storybook-Taxonomie angefasst
(ein Absatz). Beim abschliessenden Vollständigkeits-Scan (Task 16) wurden in **völlig
anderen, vorbestehenden Absätzen** derselben Datei (Zeilen 261-265, Phase-191-Dokumentation
zu `useFansubGroupSearch`/Beitrags-Hinweis-Bausteinen — keine Berührung durch 261029-d3k
oder 261029-i1y) weitere ASCII-Umlaute gefunden (`fuer`, `oeffentlich(en)`, `kuenftig(er)`,
`ueber`, `haelt`, `ausgewaehlte`, `vorausgefuellt(en/er)`, `praesentationelle`, `waehrend`,
`duenner`, `zusaetzlich`, `zuruecksetzt`, `unveraenderte`, `loesen`, `uebergeben`). Diese
liegen ausserhalb des Scopes dieses Auftrags (SCOPE BOUNDARY: nur Befunde direkt verursacht
durch die eigenen Änderungen werden automatisch behoben) und wurden daher NICHT korrigiert.

`AGENTS.md` Zeile 229 enthält "waehlen"/"fuer" absichtlich als Gegenbeispiele innerhalb der
Regel-Erklärung selbst ("z.B. 'wählen' nicht 'waehlen', 'für' nicht 'fuer'") — kein Fund,
sondern demonstrativer Text der Regel.

Story-`name:`-Properties, die exakt den ASCII-Export-Bezeichner spiegeln (z. B.
`export const Geoeffnet: Story = { name: 'Geoeffnet', ... }` in
`DisclosureIndicator.stories.tsx`, oder die vier neuen `AutomatischVerknuepft*`-Namen in
`FormField.stories.tsx`), folgen einer bereits vor diesem Auftrag etablierten, durchgängigen
Repo-Konvention (Name immer identisch zum ASCII-Bezeichner, z. B. bestehend `MitFehler`,
`OhneDescription`, `GeschlossenesPanel`) und sind daher wie Code-Bezeichner behandelt, nicht
als Prosa — unverändert gelassen, um keine Inkonsistenz mit dem Rest des Repos einzuführen.

## Geprüfter, nicht übernommener Review-Befund: `Gross`/`NormalGross` als Story-Name

Ein unabhängiger Code-Review bemängelte `export const Gross: Story = { name: 'Gross', ... }`
in den neuen Dateien `Spinner.stories.tsx`/`IconButton.stories.tsx` als ASCII-Ersetzung
("Gross" statt "Groß"). Geprüft und NICHT geändert: Das ist exakt dasselbe Muster wie die
oben beschriebene, bereits etablierte Konvention (Export-Bezeichner identisch zur
`name:`-Property, z. B. `Geoeffnet`, `MitFehler`) und existierte bereits vor diesem Auftrag
unverändert in `Drawer.stories.tsx` (`Gross`/`NormalGross`). Es als Prosa zu behandeln und
nur in den zwei neuen Dateien zu "Groß" zu ändern, hätte eine Inkonsistenz zum
bereits bestehenden `Drawer.stories.tsx`-Vorbild erzeugt, nicht behoben. Der ursprüngliche
UAT-Befund 4 nannte als Beispiel ausdrücklich eine echte Prosa-Beschreibung
("Umschliesst eine ganze thematische Sektion.", eine Satz-Zeichenkette), nicht einen
bare State-Namen wie diesen.

## Behoben nach unabhängigem Review: `JellyfinSyncPanel.tsx`-Split nachgeholt

Ursprünglich hier als bewusst nicht durchgeführt dokumentiert. Sowohl die eigene
Nachprüfung als auch ein unabhängiger Code-Review stuften das übereinstimmend als
echten Verstoß gegen die CLAUDE.md-Pflichtregel ein ("Übergroße Dateien beim Anfassen
aufteilen"), nicht als hinnehmbare Ausnahme. Nachgeholt: die vier Assistentenschritte
(Suchen/Treffer/Preview/Sync) und der Bestätigungsdialog sind jetzt eigene
Komponenten (`JellyfinSyncStepSearch.tsx`, `JellyfinSyncStepSeries.tsx`,
`JellyfinSyncStepPreview.tsx`, `JellyfinSyncStepApply.tsx`,
`JellyfinSyncConfirmDialog.tsx`, plus `jellyfinSyncPanelHelpers.tsx` für geteilte
Typen/Konstanten), der Orchestrator schrumpft von 607 auf 176 Zeilen, keine Datei
über 216 Zeilen. Da es zuvor KEINEN Rendering-Test für diese Komponente gab, wurde
vor dem Split ein neuer Smoke-Test (`JellyfinSyncPanel.test.tsx`) geschrieben, gegen
die alte Implementierung grün verifiziert und danach unverändert grün bestätigt --
echtes Regressions-Sicherheitsnetz statt eines ungeprüften Umbaus. Die drei neuen
Schritt-Dateien mit nativem `<input>`/`<select>` (bereits vor diesem Auftrag
bestehende Admin-UI-Konvention, unverändert) ersetzen den alten Dateinamen in der
`LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Ratchet-Liste 1:1 -- keine neue Altlast, nur
umbenannt.
