---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Coverage
status: executing
stopped_at: "Completed 156-22-PLAN.md (GAP-09 frontend closure: editor hint + Karaoke-Typesetting fixture)"
last_updated: "2026-09-15T09:29:37.416Z"
last_activity: 2026-09-15
progress:
  total_phases: 24
  completed_phases: 23
  total_plans: 238
  completed_plans: 237
  percent: 96
---

# Project State

## Aktiver Zusatzauftrag — Anime 158/159: technisch abgeschlossen (14.09.2026)

Genau zwei Phasen tragen den Auftrag. Phase 158 ist vollständig implementiert und im autorisierten Scope technisch verifiziert: 4/4 Plans, 9/9 Anforderungen, 33/33 Produktionsfixture-Prüfgruppen, unabhängiger Code-Review clean und 10/10 geplante Sicherheitsmaßnahmen belegt. Ausgangscommit: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`; technischer Abschluss und verbindlicher Phase-159-Start: `c3bfcb23781addca1ccd3931592535416f706787`.

Phase 159 ist ebenfalls vollständig implementiert und unabhängig technisch verifiziert: 5/5 Plans, 8/8 Anforderungen, ein kohärenter Produktionslauf mit 91/91 Prüffällen einschließlich aller 33 Phase-158-Regressionen. Review: 57 geänderte Dateiidentitäten, keine offenen Findings. Security: 12/12 geplante Maßnahmen belegt. Die Consumer-Matrix, begrenzte Publicprojektion, explizite Varianten-/Versionsidentität, gemeinsame Gruppenauswahl, lazy Gridnachbarn, Manifestlebensdauer und echte Bildbegrenzung sind umgesetzt. Produktstand `6ebfebf7`, abschließende reine Testkorrekturen `d22da611`/`a76d9a8e`, finaler Harness `c1bd215c`; Plan-/Evidenzdokumente bis `e7e707f2`. Ergebnis-SHA256: `22f7fc89df1933c957e31edfd1694fbb3ad429ce7936f5ad200e606023a5d7cf`.

Die volle Frontendsuite endet mit 2616 bestandenen Tests, denselben zwei bestehenden CSS-Guard-Fehlern und drei todo. Typecheck und scoped Lint bestehen; globales Lint bleibt exakt bei 13 Fehlern/331 Warnungen. Der vollständige Produktionsbuild reproduziert den bekannten Admin-Page-Exportblocker, während der selektive tatsächliche Produktionsbuild aller betroffenen Routen besteht. Dies ist keine globale Build-/Lint-/Testsuitefreigabe. Frische SQL- und Browser-/HTTP-/CDP-Belege sowie bereinigte isolierte Ressourcen stehen in `docs/audits/2026-09-13-public-anime-detail/phase159/RESULTS.md` und den unabhängigen Verifikationsberichten.

F-08/F-14 sind im autorisierten Public-/Vertragsscope behandelt; die volle Adminprojektion, die unbeschränkte neutrale AnimeDetail-Fallbackliste und die alte mehrdeutige Stream-Compatibility ohne Variantenselector bleiben bewusst erhalten. Weitere ausgeschlossene Produktentscheidungen werden nicht nebenbei umgesetzt. Keine Live-Daten-, Migrations-, Medienoriginal-, Env- oder Volumenänderung; kein Push. Die fremde `frontend/scripts/shot2.mjs` bleibt unangetastet.

Human-UAT 156 GAP-02 mit 14 Origin-/Contributorprüfungen, 157-06 Task 4 und die menschliche Anime-Abnahme für 158/159 bleiben ausdrücklich OPEN. Der implementierte Auftrag ist technisch abgeschlossen; fehlendes Human-Sign-off wird nicht durch Agentenprüfungen ersetzt. Die nachfolgenden Current-Position-/Milestoneabschnitte sowie historischen globalen Phasenzähler bleiben erhalten. Die historische GSD-Parseranzeige 129 und das ältere PROJECT-Dokument sind im Delta-Bericht eingeordnet; kein Milestone-Reset. Verbindlich für diesen Zusatzauftrag sind ROADMAP/REQUIREMENTS und die Artefakte der Phasen 158/159.

## Milestone v1.3: COMPLETE (2026-08-20, tag `v1.3`)

All 8 phases (128 through 135) complete, all 65 v1.3 requirements verified complete. Non-destructive
close — see `.planning/v1.3-MILESTONE-AUDIT.md` for the scorecard and tracked debt, and
`.planning/archive/v1.3/` for a copied snapshot of the milestone's tracking docs at close time.
This section, `ROADMAP.md`, and `REQUIREMENTS.md` all remain live in place (not archived/removed) —
Phase 135 and any future roadmap entries continue from here.

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.
**Current focus:** Phase 156 — segment-domain-konsistenz-und-oeffentliche-release-projektion

## Current Position

Phase: 156 (segment-domain-konsistenz-und-oeffentliche-release-projektion) — EXECUTING
Plan: 3 of 3
dupliziertem ProjectMemberStickyNav; siehe 157-14-SUMMARY.md)
Status: Ready to execute
GAP-02-Live-UAT-Checkpoint aus 156-UAT.md (5 Origin- + 9 Segment-Contributor-Pruefpunkte) bleibt
weiterhin OFFEN -- siehe deferred-items.md. Phase 156 gilt NICHT als vollstaendig abgenommen.
Phase 157 gilt ebenfalls NICHT als vollstaendig abgenommen: der menschliche Live-UAT-Checkpoint
(157-06 Task 4, plus ein voller Nachlauf der 157-UAT.md GAP-02-Punkte 1-9 nach 157-11/12/13/14)
ist eine separate, noch ausstehende Auftraggeber-Abnahmehandlung -- keine Agentenpruefung ersetzt
sie.
Hinweis zum generischen Fortschrittszaehler: `state.advance-plan` zaehlt einen Milestone-weiten
Zaehler ohne Bezug zur konkreten Plan-Datei; bei diesem Lauf landete er zufaellig korrekt bei
14/14, weil Phase 157 tatsaechlich ihr letztes Plan-Dokument erreicht hat. Massgeblich fuer den
tatsaechlichen Stand bleibt weiterhin `roadmap.update-plan-progress "157"`
(`plan_count: 14, summary_count: 14, status: Complete` -- das bezieht sich NUR auf ausgefuehrte
Plandateien, nicht auf menschliche Abnahme).

**Plan 157-14 (2026-09-14) abgeschlossen — GAP-02-Schliessung 4/4 (V6: Hero-Sprungziele statt
dupliziertem ProjectMemberStickyNav):** Die Hero-Kennzahlen „Beiträge"/„Medien" sind jetzt echte,
tastaturbedienbare In-Page-Sprungziele zu `#texte`/`#bilder`, verdrahtet ueber einen neuen additiven
`onActivate`/`activateLabel`-Zweig auf der globalen `HeroMetrics`-Primitive und eine neue additive
`variant="text"` auf der globalen `Button`-Primitive (gemaess CLAUDE.mds Frontend-UI-Regel: ein
NEUES interaktives Element geht IMMER ueber `Button`, keine native `<button>`-Ausnahme). „Folgen"
bleibt bewusst reiner Text (keine zugehoerige Sektion). Beide Primitive-Erweiterungen sind additiv
bewiesen: die anderen 6 `HeroMetrics`-Aufrufstellen und Buttons 6 bestehende Varianten sind per
`git diff --stat`/eigenen Tests bytegleich unveraendert. Der duplizierte schmale
`ProjectMemberStickyNav`-Tab-Card ("Texte & Notizen · 12"/"Bilder & Medien · 2" ein zweites Mal) ist
vollstaendig aus Code UND Seite entfernt -- Komponente, CSS-Modul UND eigene Testdatei geloescht
(`grep -rc` bestaetigt 0 Treffer im gesamten `frontend/src`-Baum). Ein neuer geteilter
`frontend/src/lib/scrollToSection.ts`-Helfer (wortwoertlich aus dem bisherigen
`ProjectMemberStickyNav`-Mechanismus extrahiert, inkl. `prefers-reduced-motion`-Beachtung) ersetzt
die vorherige lokale Implementierung -- keine Kopie. Test-first (RED `4ad41cd3` -> GREEN
`3b887f90`/`4fdede64`/`f17d9012`): 19/19 neue/bestehende Assertions gruen. `page.test.tsx` verliert
die jetzt falsche "Schnellnavigation"-Assertion, gewinnt positive/negative Pruefungen auf beide
neuen `aria-label`-Texte. `shot-projectmember.mjs` bekommt einen `stickyNavPresent`-Fakt mit
werfendem Check (muss `false` sein) plus einen echten Klick-und-Scroll-Live-Beweis (Klick auf „Zu
Texte & Notizen springen" bewegt `#texte` nachweislich an den Viewport-Rand). Live-Lauf gegen den
neu gestarteten Stack: Exit 0 fuer alle drei Viewports plus den Zoom200-Pass, `stickyNavPresent:
false` ueberall, `heroButtonLabels` enthaelt jetzt „12 Beiträge"/„2 Medien" als echte Button-Labels,
`zoom200Overflow: false`, keine Konsolenfehler; Screenshot persoenlich gesichtet -- Kennzahlen sehen
weiterhin wie reiner Inline-Text aus (kein sichtbares Button-Chrome), keine zweite Tab-Card mehr
unter dem Hero. Volle Regression: `tsc --noEmit` sauber, ESLint sauber, volle `vitest run` gruen
(321/323 Dateien, 2703/2708 Tests) mit denselben 2 vorbestehenden, dokumentierten,
planfremden `cssCustomProperties.guard.test.ts`-Fehlschlaegen (0 neue). Zwei dokumentierte
Rule-3-Testinfra-Fixes (jsdom implementiert `window.matchMedia` nicht) plus zwei
Praezisierungshinweise (Umbenennung geloeschter Dateinamen in Kommentaren; HTML-Entity-Escaping
`&amp;` in `renderToStaticMarkup`-Assertions) -- keine Produktionsverhaltensaenderung. GAP-02 gilt
damit ueber alle vier Schliessungsplaene (157-11..14) hinweg automatisiert-verifikationsseitig als
vollstaendig geschlossen; der menschliche Live-UAT-Checkpoint (157-06 Task 4 + voller
157-UAT.md-Nachlauf) bleibt ausdruecklich ein separater, noch offener Schritt. Details:
157-14-SUMMARY.md.

**Plan 157-13 (2026-09-14) abgeschlossen — GAP-02-Schliessung 3/4 (Timeline-Punkt/-Linie,
V3/V4):** `ProjectMemberNoteEntry.module.css` traegt jetzt einen sichtbar groesseren
Timeline-Punkt (6px -> 10px) und eine dickere (1px -> 3px), PRO EINTRAG rollenfarbige Linie
(`.entry::before`, `var(--role-accent)` statt der bisherigen einzigen, neutral-grauen
`var(--color-border)`-Linie) -- gemaess dem operator-bestaetigten "Entscheid 2026-09-14 zu V4":
jeder Eintrag traegt sein EIGENES Liniensegment vom eigenen Punkt bis zum naechsten Punkt
(`height: calc(100% + 14px)`, hergeleitet aus dem festen 14px-Eintragsabstand; letzter Eintrag
stoppt am eigenen unteren Rand via `height: calc(100% - 18px)`; `:first-child`-Override entfaellt).
Bei einem Single-Role-Member (aktuell die einzige Live-Fixture) liest sich die Linie als
durchgehend farbig; bei Multi-Role wechselt die Farbe exakt an der Rollen-Grenze (Unit-Test-seitig
bewiesen ueber die eigene `data-color-key` JEDES `<article>`-Roots, nicht nur des nachgestellten
`<a>`; live per `shot-projectmember.mjs` bedingt geprueft, sobald 2+ verschiedene `colorKey`-Werte
live vorkommen -- keine kuenstliche Multi-Role-Fixture erzwungen). Farbe fliesst weiterhin
ausschliesslich ueber die bestehende `data-color-key -> --role-accent`-Naht, kein Hex-Wert, keine
rollenspezifische Selektor-/Farbtabelle. Task 1 bewusst Coverage-only (kein RED-to-GREEN, da jsdom
kein `::before`-Computed-Style aufloest): 5 neue Assertions auf die `<article>`-Root-`data-color-key`
im bestehenden P157-13-Nachtrag-2-Test, laufen sofort gruen. Task 3 erweitert
`shot-projectmember.mjs` um `lineColor`/`dotSizes`/`dotOverflow`-Fakten plus drei neue
Live-Throw-Checks (Punkt/Linie-Farbparitaet, Distinct-Line-Color bei Multi-Role, Mobile-Ueberlauf);
da die Datei nach 157-11 bereits bei 449/450 Zeilen stand, wurde der bestehende
`SHOT_VERIFY_HERO`-Block (reine Verlagerung, keine Verhaltensaenderung) in eine neue
`frontend/scripts/lib/shotHelpers.mjs` ausgelagert, um Platz fuer die neuen Diagnosen im selben
Stil wie die bestehenden `noteAccentColorSamples`/`noteBorderUniformity`-Checks zu schaffen.
Live-Lauf gegen den laufenden Stack (nach `docker restart team4sv30-frontend`): Exit 0 fuer alle
drei Viewports plus den Zoom200-Pass; `dotColor === lineColor` fuer alle 12 Live-Eintraege
(Single-Role-Fixture, `rgb(123, 60, 78)`); `dotSizes` durchgaengig `10` (vorher `6`);
`dotOverflow: false` mobil bei 390px; mobiler Screenshot persoenlich gesichtet (Punkt sichtbar
groesser, Linie sichtbar dicker und farbig, liest sich ueber die fuenf sichtbaren Eintraege als
eine durchgehende Linie, kein Abschneiden am linken Rand). `tsc --noEmit`/ESLint sauber; volle
`vitest run` zeigt dieselben 2 vorbestehenden, dokumentierten, planfremden
`cssCustomProperties.guard.test.ts`-Fehlschlaege wie in `deferred-items.md` festgehalten (0 neue) --
der Plan-eigene verkettete `vitest run && node scripts/shot-projectmember.mjs`-Verify-Befehl wurde
deshalb in zwei separate Befehle aufgeteilt (Deviation dokumentiert, kein Rule-1-4-Fix). GAP-02 V3
und V4 gelten damit automatisiert-verifikationsseitig als geschlossen; menschlicher Live-UAT bleibt
wie bei allen 157-1x-Plaenen ausdruecklich ein separater, noch offener Schritt. Details:
157-13-SUMMARY.md.

**Plan 157-11 (2026-09-14) abgeschlossen — GAP-02-Schliessung 1/4 (Screenshot-Skript-Fix):**
`frontend/scripts/shot-projectmember.mjs` (396 -> 450 Zeilen, an der 450-Zeilen-Kappe) ist jetzt
vertrauenswuerdige Beweisgrundlage fuer die drei nachfolgenden GAP-02-Inhaltsplaene (157-12/13/14).
Task 1: neuer `waitForSectionsSettled(page)`-Helfer (progressives Scrollen durch das gesamte
Dokument, explizites Warten auf jedes noch ladende `<img>` per `load`/`error`-Listener, Rueckkehr
nach oben, Layout-Beruhigung per doppeltem `requestAnimationFrame`) -- genau einmal pro Viewport,
unmittelbar vor jedem fullPage-Screenshot verdrahtet, behebt das Risiko einer fehlleitenden
„Wird geladen"-Aufnahme vor dem Malen der Texte&Notizen-/Bilder&Medien-Client-Fetches. Task 2:
neue, unbedingte (kein `SHOT_VERIFY_HERO`-Gate) 200%-Zoom-Aequivalenz-Pruefung nur fuer den
Desktop-Viewport (720x450, dieselbe Ratio wie die bestehende Hero-only-Pruefung), die einen
`*-desktop-zoom200.png`-Screenshot aufnimmt und `facts.zoom200Overflow` VOR dem bestehenden
`console.log` setzt -- schliesst `157-UAT.md`s bisher unverifizierten Pruefpunkt 9
(Browser-Zoom). Beide Automatisierungsgates bestanden: `node --check` sauber, `npx eslint`
sauber, Live-Lauf gegen den laufenden Stack exit 0 fuer alle drei Viewports plus den neuen
Zoom200-Pass, `zoom200Overflow: false` im gedruckten JSON, beide fullPage-Screenshots (Desktop,
Desktop-Zoom200) persoenlich gesichtet -- zeigen vollstaendig geladene Inhalte (12 Notizen, 2
Medien), keine „Wird geladen"-Platzhalter. Zwei dokumentierte Praezisierungen (keine
Rule-1-4-Abweichung): der neue Zoom-Check-Block sitzt vor statt strikt hinter dem bestehenden
`console.log`-Aufruf, damit `zoom200Overflow` tatsaechlich im gedruckten JSON erscheint (erfuellt
die Plan-eigene Verifikationsanforderung); die 450-Zeilen-Kappe wurde durch Kommentarkuerzung statt
durch Extraktion in ein neues `lib/shotHelpers.mjs`-Modul eingehalten, da der Gap-Closure-Auftrag
fuer diesen Plan ausdruecklich nur `shot-projectmember.mjs` erlaubt. Keine funktionale/visuelle
Aenderung an der Anwendung selbst -- kein eigener menschlicher Live-UAT-Bedarf durch diesen Plan.
Details: 157-11-SUMMARY.md.

**Plan 156-17 (2026-09-14) abgeschlossen — GAP-06-Schliessung (Segment-Credits mit
Segment-Beschriftung):** `permissions.SegmentCreditLabelForRoles` (neue Datei
`segment_credit_roles.go`, `permissions.go` 950 -> 933 Zeilen) liefert jetzt die vom Auftraggeber
am 2026-09-14 bestaetigte Rollen-Code -> Segment-Beschriftung-Zuordnung (z. B. `translator` ->
„Karaoke-Übersetzung"), paarweise mit `SegmentCreditRoleCodes` in derselben Datei und per
`require.ElementsMatch`-Test beidseitig deckungsgleich bewiesen. `PublicReleaseContributor` traegt
ein additives `SegmentRoleLabel`-Feld (`omitempty`), gesetzt ausschliesslich in
`applySegmentOriginCredits`s bestehender Filter-Schleife -- `loadContributors` (die normale
„An diesem Release beteiligt"-Anzeige) ruft `SegmentCreditLabelForRoles` nie auf, bewiesen durch
einen eigenen Test gegen echtes Postgres. `openapi.yaml`/TS-Typ tragen `segment_role_label`
additiv (nicht in `required`); `ThemeTimelineSegmentDetails.tsx` rendert jetzt
`participant.segment_role_label` statt `participant.role_label`, `ContributorsRow.tsx`/`.test.tsx`
bytegleich unveraendert (leerer `git diff --stat`). Test-first (RED/GREEN) fuer alle drei Tasks;
Backend-Suite: 10/10 neue/bestehende `TestReleaseDetailPublicSegmentOriginCredits`-Subtests gruen
gegen eine isolierte Postgres-Testdatenbank, volle `internal/repository`-Suite zeigt dieselben 50
vorbestehenden, umgebungsbedingten Fehlschlaege wie die 156-16-Baseline (0 neue). Frontend:
`tsc --noEmit` sauber, `npx vitest run ThemeTimeline` 23/23 gruen, ESLint sauber. Beide Container
(`team4sv30-backend`/`team4sv30-frontend`) neu gebaut; Live-`curl` gegen Release 40 bestaetigt im
SELBEN Response beide geforderten woertlichen Werte: `segment_role_label: "Karaoke-Übersetzung"`
fuer Segment 3 ("op")/Mitglied 8 ("Qc") UND `role_label: "Übersetzung"` fuer denselben Mitwirkenden
im Top-Level-`contributors[]` (kein `segment_role_label` dort). Der gebuendelte
`156-UAT.md`-Live-UAT-Checkpoint (GAP-02) wird durch diesen Plan AUSDRUECKLICH NICHT als bestanden
behauptet -- er bleibt ein separater, offener Auftraggeber-Abnahmeschritt. Details: 156-17-SUMMARY.md.

**Plan 156-16 (2026-09-14) abgeschlossen — GAP-04/GAP-05-Schliessung:** `ensureThemeSegmentOriginTx`
(`theme_segment_origin_sync.go`) ist jetzt die EINE zentrale Origin-Gueltigkeitsregel, verdrahtet
in alle drei Schreibpfade, die die Zuweisungsmenge eines Segments aendern koennen:
`assignThemeSegmentToEpisodeRangeTx` (Bereichs-Sync), `CreateAnimeSegment`s impliziter
Einzelzuweisungs-Zweig, und `autoAssignThemeSegmentsForNewReleaseVersion` (Auto-Zuweisung neuer
Release-Versionen). Eine gueltige Origin (NULL oder eine aktuell zugewiesene Release-Version) wird
NIE ueberschrieben (Auftragspunkt 8); eine ungueltige/fehlende Origin wird per derselben
Backfill-Regel wie Migration 0161 neu berechnet, mit atomarer `theme_segment_contributors`-Bereinigung
im selben Commit -- nie einer automatischen Neu-Auswahl. Migration 0164 (idempotent, dokumentiert
No-op-Down nach 0117-Vorbild) hat die drei bewiesenen Live-Faelle in `team4s_v2` repariert: Segment 3
(origin 29 -> 40, tatsaechlich 40/41 zugewiesen), Segmente 4/5 (NULL -> 28/42). Live per `psql`
bestaetigt: beide Invarianzpruefungen (haengende Origin; fehlende Origin trotz Zuweisung) liefern 0
Zeilen. Voller Regressionslauf nach dem Live-Migrationsrun: `internal/handlers`/`internal/permissions`
100% gruen, `internal/repository` zeigt exakt dieselben 50 vorbestehenden/umgebungsbedingten
Fehlschlaege wie vor diesem Plan (namentlich abgeglichen, 0 neue). Zwei Testinfrastruktur-Deviationen
(Rule 1/3): der `anime_contributions`/`visibilities`-Schema-Shim wanderte in die geteilte
`testsupport/phase117_postgres.go`-Fixture (die zentrale Funktion erreicht ihn jetzt aus weit mehr
Aufrufpfaden als zuvor), und ein vorbestehender Query-Budget-Test wurde auf identische
Origin-Ausgangszustaende zwischen seinen zwei Messpunkten korrigiert. `156-UAT.md`s Live-UAT-Checkpoint
bleibt ausdruecklich NICHT bestanden-behauptet. Details: 156-16-SUMMARY.md.

**CR-01-Nachschliessung (2026-09-14, Commits 4dcdc75d/380262d3):** Der Pflicht-Code-Review nach
156-16 fand einen echten kritischen Rest: `AssignThemeSegmentToReleaseVersion` und
`UnassignThemeSegmentFromReleaseVersion` (die manuellen Admin-Endpunkte hinter
`POST/DELETE .../segments/:id/assignments[...]`) mutierten `theme_segment_assignments` direkt, ohne
je `ensureThemeSegmentOriginTx` aufzurufen -- das haette GAP-04/GAP-05 exakt ueber diese zwei
lebenden Routen wieder oeffnen koennen. Behoben: beide rufen die zentrale Regel jetzt innerhalb
derselben Transaktion auf; `Unassign` bekam zusaetzlich die bisher fehlende
`lockSegmentAssignmentDomainTx`-Sperre (WR-02). Drei neue Tests am echten Postgres beweisen beide
zuvor offenen Faelle plus einen Nie-ueberschreiben-Beweis fuer den Unassign-Pfad. Voller
Regressionslauf danach erneut namentlich abgeglichen: 0 neue Fehlschlaege. Siehe 156-REVIEW.md
(CR-01/WR-01/WR-02) und den Nachtrag in 156-16-SUMMARY.md.

**Phasenweite Verifikation (2026-09-14, 156-VERIFICATION.md):** `gsd-verifier` hat alle 19
P156-Anforderungen unabhaengig am Code und live an `team4s_v2`/den Testsuiten nachgeprueft.
Ergebnis: 18/19 VERIFIED, P156-18 bleibt PARTIAL -- automatisiert vollstaendig belegt, aber der
gebuendelte Live-UAT-Checkpoint (156-UAT.md GAP-02) ist weiterhin nicht als bestanden erklaert.
Von den urspruenglich 14 GAP-02-Punkten waren am 2026-09-14 bereits 9 bestanden; 3 konkrete Punkte
bleiben offen (Items 10-13 wurden am falschen Segment/Release ohne Origin/Auswahl geprueft; Item 14
bestand vor dem CR-01-Fix und muss dagegen erneut gegengeprueft werden; Items 11-12 brauchen erst
QC-/Editor-Live-Daten auf der Testrelease). Diese drei Punkte sind jetzt in `156-HUMAN-UAT.md`
(status: partial) festgehalten. Phase 156 gilt weiterhin NICHT als vollstaendig abgenommen, bis der
Auftraggeber diese drei Punkte live bestaetigt.

**Plan 157-10 (2026-09-13) abgeschlossen — GAP-01-Schliessung:** `ProjectMemberNoteEntry` rendert
jetzt ein `<article>` statt eines die ganze Zeile umschliessenden `<Link>`; ein einziger
nachgestellter `<Link>` (nur der Chevron) traegt per CSS-only Stretched-Link-Muster
(`::after; inset:0`) die volle Klickflaeche, waehrend Toggle-Button und etwaige Links im
Beitragstext per `position:relative; z-index:2` unabhaengig klickbar bleiben -- strukturell null
verschachtelte interaktive Elemente (bewiesen per echtem `querySelector('a, button')` im Unit-Test
UND per Live-Browser-Assertion `noteNestedInteractiveViolations === 0`). Rollenfarbe traegt jetzt
ausschliesslich `.dot` (`border-inline-start` entfernt); Card-Rahmen ist ein einheitlicher,
subtiler `--border-subtle`-Rand auf allen vier Seiten (live bewiesen:
`noteBorderUniformity` -- `borderTopWidth === borderInlineStartWidth`). Vorschau-Clamp von 4 auf 3
Zeilen reduziert (`157-UAT.md`s "2-3 Zeilen"-Vorgabe), gemessen mobil: 105,56px -> 79,17px bei
ueberlaufenden Eintraegen (kurze, nie geclampte Eintraege bleiben unveraendert bei 26,39px --
ehrlich als "keine Verbesserung fuer diesen Fall" berichtet, nicht schoengeredet). Alle 9
bestehenden `ProjectMemberNotesSection.test.tsx`-Tests (inkl. P157-13 Nachtrag 2 Mixed-Role-Test)
bleiben unveraendert gruen; 8 neue Tests decken die volle GAP-01-Matrix ab (verschachteltes Markup,
unabhaengige Body-Links, sehr kurzer/sehr langer Eintrag, Clamp-Grenze beidseitig, Mehrfach-Eintrag
Unabhaengigkeit, Tastatur-Fokus). Der Matrixpunkt "Contribution ohne Zielroute" ist als nicht
repraesentierbar dokumentiert (release_version_id ist non-nullable), nicht kuenstlich nachgebaut.
`shot-projectmember.mjs` um drei neue Live-Assertions erweitert (Dot-Farbe statt der entfernten
border-inline-start-Farbe, Border-Uniformitaet, Nested-Interactive-Verletzungen) und live gegen
alle drei Viewports (mobil/Tablet/Desktop) mit Exit-Code 0 gefahren; Screenshots persoenlich
gesichtet (ruhigere Timeline, einheitlicher Rahmen, Farbe nur am Punkt, ausgewogene kurze/lange
Eintraege, saubere Uebergabe zu "Bilder & Medien"). Zwei vorbestehende, planfremde
Vollsuite-Fehlschlaege gefunden und dokumentiert statt repariert (Zeilennummer-Drift in
`cssCustomProperties.guard.test.ts`s Allow-List, Timeout-Flakes in
`AchievementBadgeShowcase.test.tsx` -- beide zuletzt von Commits vor 157-10 beruehrt, siehe
`deferred-items.md`). Browser-Zoom-Matrixpunkt ehrlich als "in diesem Plan nicht eigenstaendig
nachgeprueft" berichtet statt implizit als bestanden behauptet. Details: 157-10-SUMMARY.md.
Phase 157 bleibt trotz 10/10 ausgefuehrter Plaene NICHT als abgeschlossen markiert -- der
menschliche Live-UAT-Checkpoint (157-06 Task 4) ist eine separate, noch ausstehende
Abnahmehandlung.
Playwright-Lauf gegengeprueft (bestaetigt: Rollenfarbe P157-13 real gemalt, 0x Rollenname-Wiederholung,
Timeline-Zeilen, Statistikleiste, Zusammenfassungsband, konkreter Pager, Media/Releases-Fixes, keine
Konsolenfehler/horizontales Scrollen, Desktop-Hero) und zusaetzlich sechs Abweichungen A-F gegen die
Referenz-Spezifikation dokumentiert (A: fehlendes Icon an Notizen-/Releases-Kopfzeile -- echte Luecke;
B: Zusammenfassungsband beige statt hellblau -- durch "keine neuen Tokens" erzwungen, begruendet;
C: Kopfzeile ausserhalb der Sektionskarte -- strukturelle Abweichung; D: mobiler Hero stapelt Avatar
ueber Name statt daneben -- bereits bekannt; E: Statistik-2x2/Tab-Zweizeiler mobil -- ausdruecklich
erlaubt; F: blauer Streifen am linken Rand -- identifiziert als vorbestehendes AppShell-Branding,
kein Phase-157-Defekt). Keiner der Punkte A-F wurde eigenmaechtig als kosmetisch geschlossen oder
automatisch behoben. Volle Abweichungsliste und Vorher/Nachher-Tabelle: 157-06-SUMMARY.md und
deferred-items.md.

**Zweite Runde (2026-09-12):** Der Checkpoint wurde vom Auftraggeber explizit NICHT approved. Ein
gezielter Korrekturpass mit genau 5 Punkten wurde innerhalb von Plan 157-06 umgesetzt (keine neue
Phase, kein Scope-Wachstum): (1) mobiler Hero -- nur `.heroActions` stapelt jetzt, Avatar+Name
bleiben bei jeder Breite nebeneinander; (2) alle drei Sektionskoepfe (Texte & Notizen/Bilder &
Medien/Mitwirkung an Releases) tragen jetzt dasselbe Icon+Titel-Muster (FileText/ImageIcon/Package,
alles bereits vorhandene lucide-react-Icons); (3) `.section` in ProjectMemberPage.module.css ist
jetzt eine zusammenhaengende Karte (Kopf+Inhalt in derselben Flaeche, Token-Werte von
ProjectMemberNoteEntry wiederverwendet, Eintrags-Interna unveraendert); (4) Summary-Band nutzt jetzt
bewusst `--avatar-4-bg/-fg` (bestehendes helllblaues Token-Paar) statt `--surface-sunken`, Begruendung
im Code dokumentiert (keine neuen Tokens/Hex-Werte); (5) blauer Streifen per DOM-Abfrage
(`elementFromPoint`) im Screenshot-Skript nachgewiesen als `AppShell_edgeStrip` (echtes, aber
vorbestehendes, phasenfremdes `position:fixed`-Element mit `aria-label="Menue oeffnen"`) --
das Erscheinen "auf Hoehe der ersten beiden Notizen" im fullPage-Screenshot ist ein
Chromium/Playwright-Capture-Effekt fuer fixed+100vh-Elemente, kein Live-Rendering-Fehler; nicht
veraendert, da ausserhalb des Phasenumfangs (AppShell.module.css).

Neubewertung A-F (Auftraggeber-Vorgabe, E bleibt wie zuvor disponiert): A behoben, B bewusst
abweichend mit dokumentierter Begruendung (jetzt naeher an der Referenz durch Token-Wiederverwendung),
C behoben, D behoben, F bewusst abweichend mit Beweisfuehrung (kein Fix noetig, kein Phase-157-Fehler).

Eigenstaendig re-verifiziert (nicht nur aus dem Executor-Bericht uebernommen): `tsc --noEmit` clean,
volle `vitest run` gruen (301/302 Dateien, 2324 Tests, keine Regression), `git diff --stat` bestaetigt
exakt 7 geaenderte Dateien (keine Sperrlisten-Datei beruehrt), DOM-Abfrage `elementFromPoint(4, ~200)`
persoenlich gegengeprueft -> liefert `AppShell_edgeStrip__*` mit `rgba(47, 95, 227, ...)`-Hintergrund
(= `--color-primary`), neue 390px/1440px-Screenshots visuell gesichtet.

Phase 157 gilt weiterhin erst nach echtem Auftraggeber-Sign-off auf Task 4 als abgeschlossen. Kein
git push, Working Tree sauber.

Hinweis zum Zaehler: `state.advance-plan` inkrementiert einen generischen Fortschrittszaehler ohne
Bezug zur konkreten Plan-Datei (Phase 157 laeuft nicht strikt numerisch 1→6, sondern nach
Wave/Abhaengigkeit, `parallelization: true`). Massgeblich fuer den tatsaechlichen Stand ist
`roadmap.update-plan-progress "157"`: `plan_count: 6, summary_count: 5` — 157-01/04/05/02/03 sind
fertig, nur noch 157-06 (Testmatrix/Live-UAT) steht aus.

Plan 157-03 (2026-09-12) abgeschlossen: Kern der Phase (Workstream E/F) — die grossen,
rollenfarbig geheaderten Notiz-Karten sind durch eine kompakte Timeline ersetzt. Neue,
eigenstaendige Komponente `ProjectMemberNoteEntry` (importiert `PublicNoteCard` NICHT), die
`ProjectMemberNoteCard`-Adapter ist geloescht. Rollenfarb-Nachtrag P157-13 vollstaendig umgesetzt:
JEDER Eintrag traegt `data-color-key={boundedColorKey(note.role_color_key)}` unbedingt (ueber die
EINE bestehende `globals.css`-Ableitungsstelle, solide `border-inline-start`/Punkt-Akzent, kein
`color-mix`, keine zweite Farbtabelle) — der Rollen-NAME erscheint weiterhin nur bei
`hasMultipleRoles` (neuer Prop, von `ProjectMemberPage.tsx` aus `counts.roles > 1` durchgereicht).
Pager-Beschriftung konkret: „Weitere N Beitraege anzeigen" / „Weiteren 1 Beitrag anzeigen" bei
N=1, `useProjectMemberCollection.ts` unangetastet. Nachtrag 2 (2026-09-12, waehrend der Ausfuehrung
per Concurrent-Writer in `157-CONTEXT.md` ergaenzt, separat als `docs(157-03)` committet) verlangte
einen zusaetzlichen Pflicht-Regressionstest: eine gemischte Liste (typesetter `#7b3c4e` +
translator `#27664f`, selbes Mitglied, selbe Sektion) muss beweisen, dass jeder Eintrag SEINE
EIGENE `data-color-key` traegt statt einer aus Seiten-/Summary-Kontext geerbten — dieser Test
wurde geschrieben und ist gruen, plus beide Rollen-Chips sichtbar und kein grosser Rollen-Header.
Testdatei umbenannt/angepasst (`getAllByRole('article')` → `getAllByRole('link')`, da der neue
Eintrag ein `Link` statt `<article>` ist), nicht geloescht. `roleCatalog.accessibility.test.ts`
unveraendert und gruen (17/17) — Guard nicht aufgeweicht. Volle Frontend-Suite gruen (301/302
Dateien, 2324 Tests, 3 todo, +2 Netto-Tests). `tsc --noEmit` sauber bis auf dieselbe, bereits aus
Wave 1/2 bekannte `page.test.tsx`-`episodes`-Fixture-Luecke (2 Fehler, fuer 157-06 vorgemerkt,
Datei per gezieltem `grep` bestaetigt unangetastet). Eine dokumentierte Praezisierung (kein
Rule-1-4-Fix): Task 1 trug `tdd="true"`, ohne eine eigene Testdatei im Aufgaben-Scope — die volle
Verhaltensbeweisfuehrung liegt in Task 3s Testsuite. `requirements.mark-complete P157-05/06/07/13`
fand wie bei allen Vorplaenen dieser Phase keine Zeile in REQUIREMENTS.md (dieselbe uebergreifende
Tracking-Luecke). Details: 157-03-SUMMARY.md.

Plan 157-02 (2026-09-12) abgeschlossen: Hero/Statistikleiste/Tab-Nav/Beitragszusammenfassung der
Projekt-Member-Seite auf das Referenzdesign umgebaut. Hero-Actions: „Vollstaendiges Memberprofil"
ist jetzt `variant="primary"` mit `Users`-Icon, „Zurueck zum Projekt" ist `variant="secondary"` mit
fuehrendem Pfeil (`←&nbsp;`) — Avatar-links/Body-rechts-Layout und die 640px-Stapel-Media-Query
blieben unveraendert, `useRoleCatalog`/`presentationForRole`/`getMemberInitials` unangetastet.
Statistikleiste: `ProjectMemberSummaryBar` ist jetzt EINE Karte mit vier Icon+Zahl+Label-Eintraegen
(Reihenfolge Rolle(n)/Beitraege/Medien/Releases, korrektes Singular/Plural), eigenes CSS-Modul statt
weiterer Regeln in `ProjectMemberPage.module.css`. Tab-Nav: `ProjectMemberStickyNav` traegt jetzt
einen `IntersectionObserver`-Scrollspy-Aktivzustand (Fallback: zuletzt geklickter Tab), `overflow-x:
auto` wurde durch `flex-wrap: wrap` ersetzt (kein Abschneiden bei 390px), neuer
`ProjectMemberStickyNav.test.tsx` beweist beides gegen echten Komponenten-Code (gestubbtes globales
`IntersectionObserver`, keine Quelltext-Substring-Pruefung). Beitragszusammenfassung: neue
`ProjectMemberSummaryBand`-Komponente (TDD RED `5be81c38` → GREEN `58a2b4ea`) rendert
„<Rollen> fuer N Folgen · M dokumentierte Arbeitsnotizen · K Medien", komma-getrennt bei mehreren
Rollen, „fuer N Folgen" entfaellt vollstaendig bei `episodes === 0` (konsumiert den additiven Count
aus Plan 157-01). `ProjectMemberPage.module.css` schrumpfte von 270 auf 202 Zeilen (die
extrahierten `.summaryCard`/`.stickyNavItem`-Regeln plus die 900px-Media-Query leben jetzt in
eigenen Modulen). Rollenfarb-Naht (`data-color-key` → `--role-accent`) unangetastet — per Diff
bestaetigt. Volle Frontend-Suite nach dem Umbau gruen (301/302 Dateien, 2322 Tests, 3 todo, keine
Regression). `tsc --noEmit` sauber bis auf die bereits aus Wave 1 bekannte, explizit nicht in
diesem Plans Scope liegende `page.test.tsx`-Luecke (fehlendes `episodes`-Feld in den Test-Fixtures,
2 Fehler, fuer 157-06 vorgemerkt — Datei per `git status` bestaetigt unangetastet). Keine
Abweichungen vom Plan. `requirements.mark-complete P157-01/02/03/04/10` fand wie bei den
Phase-156-Vorplaenen keine Zeile in REQUIREMENTS.md (dieselbe uebergreifende Tracking-Luecke).
Details: 157-02-SUMMARY.md.

Phase 157 wurde additiv an die Roadmap angehaengt (Milestone v1.4 bleibt als abgeschlossen dokumentiert, kein Milestone-Reset). Auftragsquelle: `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-USER-REQUEST.md`, Kontext: `157-CONTEXT.md` (ersetzt eine interaktive discuss-phase-Sitzung, enthaelt Implementation Map, gemessenen Ist-Zustand und die Referenz-Spezifikation in Worten).

Phase 156 bleibt mit EINEM offenen Punkt bestehen: der gebuendelte Live-UAT-Checkpoint (Segment-Origin + Segment-Contributors), siehe deferred-items.md. `main` ist zudem nicht nach `origin/main` gepusht.

### Vorherige Position

Phase: 156 (segment-domain-konsistenz-und-oeffentliche-release-projektion) — AUSGEFUEHRT
AUSGEFUEHRT; automatisiert/funktional abgeschlossen, ABER NICHT vollstaendig abgenommen
Plan: 15 of 15 (alle Plaene ausgefuehrt)
Status: Phase 156 automatisiert vollstaendig, ein Live-UAT-Punkt (GAP-02) bleibt offen -- Phase NICHT vollstaendig abgenommen

Plan 156-15 (2026-09-12) abgeschlossen: der finale GAP-01-Abschlussplan. Task 1 fuehrt den
VOLLSTAENDIGEN Phase-156-Regressionslauf erneut aus (nicht nur die neuen GAP-01-Tests): Backend
`go build`/`go vet` sauber, `internal/handlers`/`internal/permissions` 100% gruen,
`internal/repository` zeigt exakt dieselben 49 vorbestehenden, umgebungsbedingten Fehlschlaege
wie seit 156-05 dokumentiert (TEAM4S_PHASE128_TEST_DSN fehlt, Phase-134-Keycloak-Abhaengigkeit,
zwei unberuehrte Dateien aus 156-07) -- namentlich mit der Fehlerliste abgeglichen, nicht nur
gezaehlt. Alle elf im Plan namentlich genannten Phase-156-Tests laufen und sind gruen (eine
Namenskorrektur: der Projektseiten-Timeline-Test heisst tatsaechlich
`TestAttachReleaseTimelineSegments`, nicht `TestGroupRepositoryCursorTimeline*`). Frontend:
`tsc` sauber, ESLint bei der dokumentierten Phase-155-Basislinie (13 Errors/331 Warnings, keine
neuen), voller Vitest-Lauf 2314/2317 gruen (3 vorbestehende `it.todo`). Migration 0161+0162 im
kompletten Rundlauf (`down -steps 2` dann `up`) gegen `team4s_v2` erneut beweisbar
byte-identisch (Origin-Werte `27/27/29` unveraendert, `theme_segment_contributors` sauber leer
neu angelegt). Task 2 (der gebuendelte GAP-02-Live-UAT-Checkpoint aus 156-UAT.md: 5
Origin- + 9 Segment-Contributor-Pruefpunkte) konnte NICHT durchgefuehrt werden -- keine
authentifizierte Platform-Admin-Browsersession verfuegbar, exakt dieselbe Einschraenkung wie bei
Plan 156-11 Task 2. Gemaess expliziter Anweisung WEDER als bestanden simuliert (auch nicht per
API-Aufrufen) NOCH stillschweigend uebersprungen -- `deferred-items.md` traegt einen neuen,
datierten Eintrag mit dem vollstaendigen 14-Punkte-Rezept fuer den Auftraggeber, exakt im Format
des bestehenden 156-11-Eintrags. Phase 156 gilt damit weiterhin NICHT als vollstaendig
abgenommen. Push-Status verifiziert (nicht geschaetzt): `git rev-list --left-right --count
origin/main...HEAD` liefert `0	190` -- `main` ist 190 Commits vor `origin/main`, 0 dahinter,
NICHT gepusht. `gsd-sdk query roadmap.update-plan-progress "156" "156-15" "complete"`
ausgefuehrt (zaehlt PLAN-vs-SUMMARY-Dateien; bedeutet "Plan-eigene Aufgaben erledigt", NICHT
"Phase-UAT bestanden"). Details: 156-15-SUMMARY.md.

Plan 156-14 (2026-09-12) abgeschlossen: GAP-01s einzige nutzersichtbare Oberflaeche --
das "Mitwirkende am Segment"-Mehrfachauswahlfeld -- ist jetzt an Plan 156-13s bereits
laufende GET/PUT-Endpunkte angebunden. Vor jedem neuen Feature-Code wurden beide von
156-UAT.md als ueberlang benannten Dateien per reinem Code-Motion-Refactor unter die
450-Zeilen-Grenze gebracht: `SegmentEditPanel.tsx` 733 -> 375 Zeilen (vier Extraktionen:
`SegmentOverrideField.tsx`, `SegmentPlaybackPreviewSection.tsx`, `SegmentAssetSection.tsx`,
`SegmentBasicFieldsSection.tsx` -- die vierte war noetig, weil die drei im Plan genannten
Extraktionen allein bei 479 Zeilen stehen blieben), `SegmenteTab.tsx` 827 -> 412 Zeilen
(drei Extraktionen: `SegmenteTab.formHelpers.ts`, `SegmentsListSection.tsx`,
`useSegmentAssetHandlers.ts`). Beide Refactors sind reine Codeverschiebung ohne
Verhaltensaenderung, bewiesen durch die unveraendert gruene `SegmenteTab`-Testsuite
(83/83) nach jedem Schritt. Danach: `frontend/src/lib/api/segment-contributors.ts`
(dediziertes API-Modul nach dem `admin-anime-intake.ts`-Praezedenzfall, `api.ts` gewinnt
null neue Zeilen) plus `SegmentContributorsField.tsx`/`useSegmentContributors.ts` --
ausschliesslich `@/components/ui`-Primitives (`Switch`/`SectionHeader`/`EmptyState`),
korrekte Umlaute, "keine Auswahl" ist ein eigenstaendiger, per explizitem leeren
`member_ids`-Array speicherbarer Zustand (156-UAT.md Nachtrag 2026-09-12), nie mit
"unveraendert lassen" verwechselt. Test-first: 5 neue API-Modultests plus 4 neue
`SegmenteTab`-Integrationstests, volle Frontend-Suite gruen (2314 bestanden, vorher
2305). Zwei dokumentierte Abweichungen: die vierte Extraktionsdatei (s.o.) sowie eine
bewusste, begruendete Ergaenzung von `eslint.config.mjs`s eingefrorener
Altfaelle-Liste um die zwei neuen Dateien, die vorbestehende native Formularelemente aus
dem bereits gelisteten `SegmentEditPanel.tsx` unveraendert weitertragen (keine neuen
Verstoesse). `gsd-sdk query roadmap.update-plan-progress "156" "156-14" "complete"`
ausgefuehrt. Details: 156-14-SUMMARY.md.

Plan 156-13 (2026-09-12) abgeschlossen: die explizite Segment-Contributor-Auswahl aus
Plan 156-12 (`theme_segment_contributors`) steuert jetzt tatsaechlich die oeffentliche
Segment-Credit-Projektion. `applySegmentOriginCredits`
(`release_detail_public_repository_segment_credits.go`) zeigt einen Beitragenden NUR,
wenn er (a) explizit fuer dieses Segment ausgewaehlt wurde UND (b) seine aktuell live
aufgeloeste Origin-Rolle in `permissions.SegmentCreditRoleCodes` liegt -- "keine Auswahl
= keine personenbezogenen Segment-Credits", kein Fallback auf "alle Origin-Beteiligten
zeigen". Ein neuer gebuendelter `loadThemeSegmentContributorSelections`-Aufruf hebt das
gepinnte Query-Budget von 3 auf 4 (`phase156SegmentOriginConstantQueryBudget`), erweitert
statt ersetzt, mit live gemessenem Beleg (`TestLoadReleaseSegmentsQueryBudgetIsConstant`).
Die volle A-J-plus-K(a/b)-Regressionsmatrix aus 156-UAT.md (13 unabhaengige Subtests,
inkl. des 2026-09-12-Nachtrags: ein nur ueber einen vererbten Anime-Default wirksamer
Beitragender bleibt nach einem Release-Level-Override entweder mit neuer Rolle sichtbar
oder verschwindet sauber, OHNE dass die `theme_segment_contributors`-Zeile selbst
angefasst wird) ist gegen echtes, isoliertes PostgreSQL bewiesen
(`TestSegmentContributorSubsetMatrix`). Die zwei von Plan 156-12 bewusst rot gelassenen
Tests sind korrigiert, nicht geloescht: `TestReleaseDetailPublicSegmentOriginCredits/Test5`
und `TestSegmentCreditRoleFilter` erwarten jetzt korrekt `quality_checker`/`editor` als
segmentrelevant, `encoder` bleibt die einzige dauerhafte Ausnahme -- beide gruen. Neue
Admin-Endpunkte `GET`/`PUT /api/v1/admin/anime/:id/segments/:segmentId/contributors`
(`admin_content_anime_theme_segment_contributors.go`) sind hinter demselben
`requireSegmentManage`-Capability-Gate wie jeder andere Segment-Schreibpfad live (nach
Rebuild per curl bestaetigt: `401`, nicht `404`, unauthentifiziert). Keine Abweichungen
vom Plan. Ein vorbestehender, planfremder Test-Reihenfolge-Befund (identisch zum in
156-02-SUMMARY.md dokumentierten Muster: isolierter `-run`-Filter laesst
`TestSetAnimeSegmentOrigin_RequiresCapabilityThenSucceeds` UND die beiden neuen
Contributors-Capability-Tests mit 403 fehlschlagen, obwohl der volle
`internal/handlers`-Paketlauf fuer alle drei gruen ist) ist dokumentiert, nicht durch
diesen Plan verursacht. `gsd-sdk query roadmap.update-plan-progress "156" "156-13"
"complete"` ausgefuehrt. Details: 156-13-SUMMARY.md.

Ausfuehrlich: Phase 156 ist funktional und automatisiert abgeschlossen (voller
Backend-/Frontend-Testlauf gruen, Migration 0161 im Rundlauf erneut verifiziert,
Vorher/Nachher-Bericht vorliegend, sauberer Working Tree). Sie gilt AUSDRUECKLICH NICHT als
vollstaendig verifiziert/abgenommen: ein einziger Punkt bleibt offen -- Plan 156-11 Task 2
(`checkpoint:human-verify`, Live-UAT des Admin-Segment-Origin-Select-Controls) konnte in keiner
Ausfuehrungsumgebung dieser Phase durchgefuehrt werden, da keine authentifizierte
Platform-Admin-Browsersession verfuegbar war. Kein "verified"/"bestaetigt"-Claim fuer diesen Punkt
-- siehe deferred-items.md. `P156-18` bleibt entsprechend NICHT per `requirements.mark-complete`
abgehakt.

Plan 156-12 (2026-09-12) abgeschlossen: GAP-01-Datenmodell-Fundament. Migration 0162 legt
`theme_segment_contributors` (`theme_segment_id` + `member_id` + `created_at`, UNIQUE auf dem Paar,
KEIN `role_code`, KEINE `release_version_id`-Spalte) an -- exakt der in 156-UAT.md Nachtrag
2026-09-12 bestaetigte Datenmodell-Entscheid, live gegen `team4s_v2` per `cmd/migrate` im
Rundlauf (up/down/up) verifiziert. `permissions.SegmentCreditRoleCodes` waechst auf 6 Eintraege
(`editor`/`quality_checker` neu, `encoder` bleibt einzige dauerhafte Ausnahme).
`theme_segment_contributors.go` liefert `SetThemeSegmentContributors` (all-or-nothing validiert
gegen die LIVE `loadPublicEffectiveContributors`-Aufloesung der Origin, kein zweiter
Rollenpfad), `ListThemeSegmentContributorCandidates` (ungefilterte Kandidatenliste inkl.
Encoder-only) und `GetThemeSegmentContributorMemberIDs`. `SetThemeSegmentOrigin` laeuft jetzt
transaktional und entfernt beim Origin-Wechsel im SELBEN Commit jede jetzt ungueltige
Contributor-Auswahl (`removedContributorCount`, Case H live bewiesen) -- `loadPublicEffectiveContributors`
wurde dafuer auf ein minimales `pgxQuerier`-Interface umgestellt (Pool- und Tx-kompatibel, keine
zweite Implementierung). Zwei Rule-1-Abweichungen (Migrationskommentar ohne woertliche
`role_code`/`release_version_id`-Substrings fuer die eigene Akzeptanzpruefung; die
`anime_contributions`-Lokal-Fixture in `theme_segment_origin_integration_test.go` musste an den
Testanfang, weil `SetThemeSegmentOrigin` sie jetzt bei JEDEM erfolgreichen Aufruf braucht, nicht
nur im neuen Case-H-Subtest). Bekannte, im Plantext selbst vorhergesehene Zwischenregression:
das Erweitern der EINEN zentralen `SegmentCreditRoleCodes`-Liste wirkt sich zwangslaeufig auch auf
die bestehende OEFFENTLICHE Segment-Credit-Projektion (Plan 156-07/156-09) aus, bis Plan 156-13 das
"nur bei expliziter Auswahl"-Gate eigens dafuer baut -- zwei vorbestehende, planfremde Tests
(`TestReleaseDetailPublicSegmentOriginCredits/Test5`, `TestSegmentCreditRoleFilter/quality_checker-only...`)
sind deshalb aktuell rot, ausserhalb des Datei-Scopes dieses Plans, absichtlich NICHT hier
repariert (Plan 156-13s Aufgabe). Backend nach Rebuild live gesund (`/health` 200).
`requirements.mark-complete GAP-01` fand keine Zeile in REQUIREMENTS.md (dieselbe
uebergreifende Tracking-Luecke wie bei allen Vorplaenen dieser Phase). Details: 156-12-SUMMARY.md.

Plan 156-10 (2026-09-11) abgeschlossen: voller Backend-Build/Vet/Testlauf erneut ausgefuehrt (DSN
aus dem laufenden Backend-Container abgeleitet, nicht aus `.env`, dessen Passwort nicht zum
Live-Container passt) -- `internal/handlers`/`internal/permissions` gruen, `internal/repository`
meldet dieselben 49 vorbestehenden, phasenfremden Fehlschlaege wie in 156-05/06/07/09 dokumentiert
(kein Phase-156-Test darunter, per gezieltem Namens-Filter bestaetigt). Migration 0161 wurde gegen
die live `team4s_v2`-Datenbank einen Schritt zurueckgerollt und erneut angewendet -- Spalte/Index
verschwinden und erscheinen sauber, der deterministische Backfill liefert vor/nach byte-identische
Werte (`27/27/29`). Frontend: `tsc` sauber, voller Vitest-Lauf 298/299 Dateien (2305/2308 Tests)
gruen, `ThemeTimeline` 23/23, ESLint 13 Errors/331 Warnings (identisch zur Phase-155-Baseline,
ausserhalb dieser Phase). `docker compose build` fuer Frontend UND Backend erfolgreich. Der
Vorher/Nachher-Abschlussbericht liegt unter `docs/audits/2026-09-11-segment-domain-consistency/`
im etablierten 4-Datei-Format (REPORT/REPRODUCE/TABLES/VALIDATION). `156-VALIDATION.md`s
Per-Task Verification Map ist vollstaendig aufgeloest -- jede Zeile gruen, AUSSER der P156-18-Zeile
(`⚠️ PARTIAL`, siehe oben). `requirements.mark-complete P156-19` wurde ausgefuehrt. Details:
156-10-SUMMARY.md.

Plan 156-11 (2026-09-11) TEILWEISE abgeschlossen: Task 1 (Type-Feld
`AdminThemeSegment.origin_release_version_id`, API-Client `setAnimeSegmentOrigin`, ein
kompaktes `@/components/ui`-`Select` in `SegmentEditPanel.tsx` fuer die Segment-Origin-Korrektur,
verdrahtet ueber `SegmenteTab.tsx`) ist implementiert, committet (`d6edc718`) und automatisiert
gruen (tsc, 83/83 Vitest, 0 neue ESLint-Warnungen, Umlaut-Check sauber -- "mitgeändert", keine
ASCII-Ersetzung). Task 2 ist ein `checkpoint:human-verify`-Gate, das eine live authentifizierte
Platform-Admin-Browsersession voraussetzt; diese Zugangsdaten liegen in der Ausfuehrungsumgebung
nicht vor. Formulierung gemaess expliziter Auftraggeber-Anweisung: Task 2 ist "ausgefuehrt,
Live-UAT durch den Auftraggeber ausstehend" -- WEDER als bestanden NOCH als fehlgeschlagen
markiert. Die konkrete Pruefanweisung (Segment-Origin-Select erscheint bei geteiltem Segment,
speichert sofort ohne Haupt-Speichern-Button, persistiert nach Neuoeffnen, Haupt-Speichern-Button
bleibt unveraendert funktionsfaehig; nutzbarer Testdatensatz `theme_segment_id 3` mit 3
Assignments) steht in `deferred-items.md`. `P156-18` bleibt entsprechend NICHT per
`requirements.mark-complete` abgehakt, bis die Live-UAT bestaetigt. Details: 156-11-SUMMARY.md.

Plan 156-09 (2026-09-11) abgeschlossen: zwei neue Tests schliessen die verbliebenen
Nachweispflichten von Plan 156-07 (P156-16/P156-17). `TestLoadReleaseSegmentsQueryBudgetIsConstant`
(`segment_origin_query_budget_test.go`) beweist mit dem geteilten `queryCounter`-Muster (Phase 155)
gegen echtes, isoliertes PostgreSQL, dass `loadReleaseSegments`' gebuendelte Origin-Credit-Ladung
fuer eine 1-Segment/1-Beitragenden-Release und eine 3-Segment-Release mit drei VERSCHIEDENEN,
je zweifach besetzten Origin-Release-Versionen dieselbe Abfragezahl ausloest (konstant 3 --
Segment-Scan, ein gebuendelter `loadPublicEffectiveContributors`-Aufruf, ein gebuendelter
`AppliesThroughEpisode`-Aufruf), gepinnt auf `phase156SegmentOriginConstantQueryBudget`. Da
`testsupport.OpenPhase117Postgres` keinen Tracer-Injektionspunkt bietet, oeffnet der Test einen
ZWEITEN Pool auf demselben DSN/Schema (per `current_schema()`-Discovery), ohne die geteilte
Testsupport-Fixture zu aendern. `TestSegmentCreditRoleFilter`
(`segment_credit_role_filter_test.go`) ist ein reiner Go-Table-Test ohne DB-Abhaengigkeit gegen die
bereits bestehende, direkt aufrufbare `hasAnySegmentRelevantRole`-Funktion (Plan 156-07) und die
echte `permissions.SegmentCreditRoleCodes`-Allow-List: Uebersetzer-only eingeschlossen,
Encoder-/QC-only ausgeschlossen, gemischte Encoder+Uebersetzer-Rolle eingeschlossen (T-156-13),
leere Rollenliste ausgeschlossen. Der Query-Plan-Beleg fuer
`idx_theme_segments_origin_release_version` (Migration 0161) wurde live gegen `team4s_v2` erfasst:
bei aktuell nur 3 Zeilen in `theme_segments` waehlt Postgres ehrlich einen Seq Scan (korrekt bei
dieser Groesse), ein sitzungslokales `SET enable_seqscan = off` beweist zusaetzlich, dass der Index
korrekt gebaut ist und als Index Only Scan greift -- beide Plaene sind in 156-09-SUMMARY.md
dokumentiert, nicht nur der guenstige. Keine Abweichungen vom Plan. `requirements.mark-complete
P156-16/P156-17` fand wie bei den Vorplaenen keine Zeile in REQUIREMENTS.md (dieselbe
uebergreifende Tracking-Luecke). Details: 156-09-SUMMARY.md.

Plan 156-08 (2026-09-11) abgeschlossen: `ThemeTimeline.tsx`
(`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`) haelt keine eigene
OP/ED/INSERT/KARA-Klassifikationswelt mehr -- `TYPE_LABELS`/`TYPE_STYLE_KEYS`/`typeKey`/
`segmentTypeLabel` (inkl. Varianten-Schluessel wie `'OP KARA'`) sind vollstaendig entfernt (P156-15).
`SegmentDetails`/`SelectionSurface` wurden in eine neue Nachbardatei `ThemeTimelineSegmentDetails.tsx`
(97 Zeilen) ausgelagert -- `ThemeTimeline.tsx` liegt danach bei 323 Zeilen, beide klar unter dem
450-Zeilen-Limit (die Datei stand laut Recherche vorher bei 396/450). Verbleibend sind nur zwei rein
darstellerische Lookup-Tabellen (`SEGMENT_TYPE_STYLE_CLASS` fuer die CSS-Klasse,
`SEGMENT_TYPE_DISPLAY_LABEL` fuer das deutsche Label), beide Exact-Key-Maps ueber die vier
kanonischen Backend-Codes (`OP`/`ED`/`INSERT`/`KARA`) mit `typeOther`/Rohwert als einzigem Fallback --
keine Substring-/Heuristik-Logik mehr im Frontend. Segment-Beteiligte mit `member_slug` rendern jetzt
als Link auf `{projectPath}/mitwirkende/{memberSlug}` -- der erste produktive Verbraucher von
`buildPublicFansubProjectMemberPath`s Suffix-Form (Phase 155, bis dahin ungenutzt); ohne `member_slug`
oder ohne `projectPath` bleibt die alte reine Textzeile pro Beteiligtem unveraendert erhalten (P156-14).
`PublicReleaseContributor` (Frontend-DTO) traegt jetzt `role_codes`/`member_slug`, spiegelbildlich zu
Plan 156-05s Backend-Feldern. Eine Abweichung (Rule 1): das vorbestehende, planfremde
`ContributorsRow.test.tsx` brach durch die neuen Pflichtfelder auf dem DTO und wurde mit
`role_codes: []`/`member_slug: null` in den Fixtures repariert, ohne Verhaltensaenderung. 23/23
Vitest-Tests in `ThemeTimeline.test.tsx` gruen, inkl. neuer Faelle fuer Link-Praesenz/-Abwesenheit und
eines Regressionsfalls (`type: 'KARAAGE'`), der beweist, dass ein unzusammenhaengendes "kara"-Teilwort
NICHT mehr als Karaoke fehlklassifiziert wird. Voller Frontend-Suite-Lauf (298/299 Dateien, 2305 Tests)
sowie `tsc --noEmit` und `eslint` auf allen geaenderten Dateien gruen. `requirements.mark-complete
P156-14/P156-15` fand wie bei den Vorplaenen keine Zeile in REQUIREMENTS.md (dieselbe
uebergreifende Tracking-Luecke). Details: 156-08-SUMMARY.md.

Plan 156-07 (2026-09-11) abgeschlossen: `loadReleaseSegments`
(`release_detail_public_repository_helpers.go`) projiziert Segment-Credits jetzt LIVE aus der
ORIGIN-Release-Version jedes Segments (`theme_segments.origin_release_version_id`, Plan 156-01/04)
statt aus den eigenen Beteiligten der betrachteten Release-Version per
`strings.Contains(label, "kara")`-Heuristik -- gefiltert auf `permissions.SegmentCreditRoleCodes`
(P156-07/P156-08/P156-09), genau EIN gebuendelter `loadPublicEffectiveContributors`-Aufruf fuer die
gesamte, deduplizierte Origin-Menge. `Type` kommt jetzt ueber `CanonicalSegmentType` (Plan 156-06),
kein roher SQL-Passthrough mehr. `suppressSegmentsAlreadyVisibleOnPreviousEpisode` (Phase 117, D-02)
ist GELOESCHT, nicht deaktiviert (P156-13) -- die Release-Seite zeigt jetzt jedes tatsaechlich
zugewiesene Segment, `loadAdjacentReleases` bleibt fuer Vor-/Zurueck-Navigation unveraendert.
`DECISIONS.md` traegt einen neuen datierten Eintrag (2026-09-11), der die D-02-Ablösung explizit NUR
fuer die Release-Detailseite dokumentiert (der urspruengliche D-02-Eintrag bleibt als Historie
erhalten). Die Umsetzung wuchs `release_detail_public_repository_helpers.go` zunaechst auf 471
Zeilen -- ueber dem 450-Zeilen-Limit -- und wurde nach demselben Split-Muster wie Plan 156-06 in eine
neue Datei `release_detail_public_repository_segment_credits.go` (84 Zeilen) ausgelagert, `helpers.go`
liegt danach bei 410 Zeilen. Zwei kleine, nicht-architektonische Implementierungsentscheidungen: eine
map-basierte Rollen-Ueberlappungspruefung statt des im Plantext illustrativ genannten
`slices.ContainsAny` (existiert in Go 1.25s `slices`-Paket nicht), und die sieben planvorgegebenen
Verhaltenstests wurden in eine NEUE Testdatei (`release_detail_public_repository_segment_credits_test.go`)
statt in die vorbestehende Suppression-Testdatei geschrieben, um Fixture-Ueberschneidungen mit der
gleichzeitigen D-02-Testaenderung zu vermeiden. Alle sieben Verhaltensfaelle live gegen echtes,
isoliertes PostgreSQL bewiesen (Nullbeteiligte, Uebersetzer+Timer-Projektion, Live-Korrektur ohne
Segment-Edit, neu hinzugefuegter Beitragender, Encoder/QC-Ausschluss, NULL-Origin, kanonischer Typ).
`requirements.mark-complete P156-07/08/09/13` fand wie bei den Vorplaenen keine Zeile in
REQUIREMENTS.md (dieselbe uebergreifende Tracking-Luecke). 49 vorbestehende, nicht durch diesen Plan
verursachte Testfehler bleiben dokumentiert (TEAM4S_PHASE128_TEST_DSN fehlt, Phase-134-Live-Fixture,
sowie unabhaengige Befunde in `member_claims_*`/`fansub_group_app_members_repository_test.go` --
komplett unberuehrte Dateien dieses Plans). Details: 156-07-SUMMARY.md.

Plan 156-05 (2026-09-11) abgeschlossen: `loadPublicEffectiveContributors`
(`public_effective_contributors.go`) -- die eine gemeinsame batch-faehige Funktion, die bereits
sowohl die Projektseite als auch die Release-Seite beliefert -- behaelt jetzt den rohen
`role_code`-Satz je Mitwirkendem (`PublicReleaseContributor.RoleCodes`, sortiert, unabhaengig vom
aggregierten deutschen `RoleLabel`-String) und liefert zusaetzlich einen sichtbarkeits-gegateten
`MemberSlug` (P156-08/P156-09) -- letzterer per exakt demselben, woertlich kopierten
`CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END`-Muster wie bereits in
`group_contributors_repository.go`. Keine zweite Lade-Funktion, keine Aenderung an Batch-Signatur,
Praezedenz- oder `is_public`-Filterlogik -- rein additiv am Ausgabe-Shape pro Zeile, per RED/GREEN-
TDD-Zyklus bewiesen (3 neue Unit-Tests plus alle 3 vorbestehenden weiterhin gruen). Keine
Abweichungen vom Plan. Ein vorbestehender, nicht durch diesen Plan verursachter Befund ist
dokumentiert (`release_detail_public_repository.go` war bereits vor diesem Plan bei 511 Zeilen,
ueber dem 450-Zeilen-Limit -- als Altlast in 156-05-SUMMARY.md geflaggt, nicht behoben, mirrors
156-01's `permissions.go`-Praezedenzfall). `requirements.mark-complete P156-08/P156-09` fand wie
bei den Vorplaenen keine Zeile in REQUIREMENTS.md (dieselbe uebergreifende Tracking-Luecke).
Details: 156-05-SUMMARY.md.

Plan 156-04 (2026-09-11) abgeschlossen: eine neue `SetThemeSegmentOrigin`-Repository-Methode und
`PUT /api/v1/admin/anime/:id/segments/:segmentId/origin` erlauben Admins, `theme_segments.
origin_release_version_id` gezielt zu setzen/korrigieren (P156-06) -- eine Ziel-Release-Version, die
dem Segment nicht ueber `theme_segment_assignments` zugewiesen ist, wird mit 409/
`origin_not_assigned` abgelehnt statt still uebernommen, hinter demselben
`release_version.segments.manage`-Capability-Gate wie jeder andere Segment-Schreibpfad (P156-18,
T-156-11). `ListAnimeSegments`/`GetAnimeSegmentByID` liefern die aktuelle Origin jetzt mit aus
(`AdminThemeSegment.OriginReleaseVersionID`, nil vor dem ersten Setzen). Eine Abweichung vom
Plantext war noetig (Rule 1): die Validierungsreihenfolge prueft Segment-EXISTENZ vor der
Zuweisungs-Mitgliedschaft, nicht umgekehrt wie im Plan woertlich beschrieben -- ein nicht
existierendes Segment kann per FK niemals eine `theme_segment_assignments`-Zeile haben, ein
Membership-Check zuerst haette ErrNotFound fuer diesen Fall strukturell unerreichbar gemacht.
Zusaetzlich musste die gemeinsame Phase-117-Testfixture (`testsupport.OpenPhase117Postgres`) um
Migration 0161 ergaenzt werden (Rule 3, blockierend -- die Spalte fehlte sonst im isolierten
Testschema), und zwei vorbestehende vollstaendig-manuelle `adminThemeRepository`-Test-Stubs
brauchten eine No-op-Implementierung der neuen Schnittstellenmethode, um weiter zu kompilieren
(Rule 3). Backend nach Rebuild live verifiziert (Route liefert 401 ohne Auth, nicht 404).
`requirements.mark-complete P156-06/P156-18` fand wie bei den Vorplaenen keine Zeile in
REQUIREMENTS.md (dieselbe uebergreifende Tracking-Luecke). Details: 156-04-SUMMARY.md.

Plan 156-06 (2026-09-11) abgeschlossen: die Projektseiten-Timeline (`attachReleaseTimelineSegments`,
`group_repository_cursor_timeline.go`, neu ausgelagert aus `group_repository_cursor.go` wegen des
450-Zeilen-Limits) leitet Segmente jetzt aus `theme_segment_assignments` ab statt aus einem
`start_episode`/`end_episode`-Bereichsvergleich (P156-10). Eine neue, exportierte
`CanonicalSegmentType(themeTypeName string) string` (`theme_segment_type.go`) ersetzt die
SQL-`CASE...LIKE`-Heuristik als einzige Typklassifikation -- vorgesehen zur Wiederverwendung durch
Plan 156-07 (Release-Seite) und 156-08 (Frontend). Eine gebuendelte, projektweite (nicht
seitenlokale) First-Occurrence-Abfrage sorgt dafuer, dass ein geteiltes Segment nur bei seiner
global ersten Zuweisung erscheint, korrekt auch ueber Cursor-Seitenwechsel hinweg (P156-11/P156-12)
-- genau zwei Abfragen fuer die gesamte Seite, keine pro Episode/Segment. Eine neue dedizierte
Integrationstestdatei (`group_repository_cursor_timeline_test.go`, gab es vorher nicht) beweist alle
fuenf planvorgegebenen Verhaltensfaelle gegen echtes PostgreSQL. Zwei Abweichungen: der Datei-Split
(Rule 2/CLAUDE.md-Modularitaet) und eine Reparatur eines vorbestehenden Quelltext-Substring-Tests
(`release_detail_cursor_test.go`), dessen Annahmen durch die absichtliche Entfernung des alten
Bereichspraedikats und den Datei-Split gebrochen wurden (Rule 1). TDD-Gate-Hinweis: Test und
Implementierung wurden in einem gemeinsamen `feat`-Commit statt in getrennten RED/GREEN-Commits
geliefert -- in 156-06-SUMMARY.md unter "TDD Gate Compliance" dokumentiert, nicht verschwiegen.
Hinweis zur Ausfuehrungsreihenfolge: laut ROADMAP.md-Phasentabelle (Zeilen 1601-1619) ist 156-06 die
naechste Plan-Nummer nach 156-03 in der tatsaechlichen Wellen-Reihenfolge, waehrend 156-04/156-05
(Segment-Origin) einer spaeteren Welle angehoeren -- die Plan-NUMMER ist nicht die Ausfuehrungs-
Reihenfolge; das Positions-"Plan: N of 11" zaehlt ausgefuehrte Plaene, nicht Plan-Nummern.
`requirements.mark-complete P156-10/11/12` fand wie bei den Vorplaenen keine Zeile in
REQUIREMENTS.md (dieselbe uebergreifende Tracking-Luecke, in ROADMAP.md verfolgt). Details:
156-06-SUMMARY.md.

Plan 156-03 (2026-09-11) abgeschlossen: die "Release-zuerst"-Ordnungsluecke ist geschlossen --
`upsertReleaseVersionGroup` (der einzige produktive Insert-Pfad fuer `release_versions`) loest
Episoden-Sortindex und normalisierte Version jetzt EINMAL pro Release-Version auf und fuehrt
anschliessend pro tatsaechlich angehaengter Fansub-Gruppe EINE gebuendelte
`INSERT ... SELECT ... ON CONFLICT DO NOTHING` gegen `theme_segment_assignments` aus
(`episode_import_repository_release_autoassign.go`, neu). Die Episoden-/Versionsaufloesung ist
byte-identisch (diff-bestaetigt) zu `theme_segment_assignments.go`s `themeSegmentRangeTargetQuery`,
damit Segment-zuerst (Plan 156-02) und Release-zuerst (dieser Plan) dieselbe Zielmenge sehen. Vier
neue Integrationstests gegen echtes PostgreSQL beweisen: Segment-zuerst-Auto-Assign ohne jeden
Aufruf von `AssignThemeSegmentToEpisodeRange`; ein wiederholter Hook-Aufruf auf eine bereits
zugewiesene Release-Version dupliziert nichts (`ON CONFLICT DO NOTHING` bewiesen, nicht angenommen);
eine Release-Version mit zwei Fansub-Gruppen wird pro Gruppe einzeln zugewiesen (zwei getrennte
gebuendelte Abfragen, kein Merge, keine Pro-Segment-Schleife); und eine Release-Version ausserhalb
jedes Segmentbereichs bekommt keine Zuweisung. `episode_import_repository_release_helpers.go` wuchs
nur um 12 Zeilen (432 gesamt) durch Auslagerung der neuen Logik in die neue Datei
`episode_import_repository_release_autoassign.go` (75 Zeilen) -- beide klar unter dem
450-Zeilen-Limit. Zwei Abweichungen, beide ausschliesslich in der neuen Testdatei: die geteilte
Phase-117-Testfixture kannte weder `anime_fansub_groups` noch `fansub_groups.slug`/`status` (Rule 3,
lokal in der neuen Testdatei ergaenzt, keine Aenderung an `testsupport/phase117_postgres.go`), und
zwei kleinere Postgres-Parametertyp-Fehler wurden waehrend der Testautorenschaft behoben (Rule 1).
`requirements.mark-complete P156-04` fand wie bei den Vorplaenen keine Zeile in REQUIREMENTS.md
(dieselbe uebergreifende Tracking-Luecke, in ROADMAP.md verfolgt). Details: 156-03-SUMMARY.md.

Plan 156-02 (2026-09-11) abgeschlossen: `AssignThemeSegmentToEpisodeRange` ist jetzt eine
Soll-Ist-Synchronisation (insert-missing/delete-excess) statt rein additiv --
`models.ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride}` ist der neue
Rueckgabewert. Der Guard gegen unvollstaendige Bereiche (segmentID/animeID/fansubGroupID<=0 oder
startEpisode/endEpisode<=0) bleibt unveraendert als erste Anweisung erhalten und hat zwei
unabhaengige, namentlich benannte Regressionstests (kein DB-Zugriff UND ein echter
Postgres-Lauf mit bestehenden Zuweisungen, der beweist, dass NULL Zeilen geloescht werden).
Bereichsverkuerzung, -erweiterung, Override-Schutz und Cross-Domain-Sicherheit sind je ein
eigener benannter Subtest. Beide Admin-Handler (Create/Update) laden jetzt bei
`Added>0 ODER Removed>0` neu (vorher nur bei Added>0) und liefern ein neues `range_sync`-Feld
in der JSON-Antwort. Zwei Abweichungen: drei zusaetzliche `adminThemeRepository`-Stub-Dateien
(nicht im Plan gelistet) mussten fuer die neue Signatur angepasst werden (Rule 3, blockierender
Kompilierfehler), und die wachsende Integrationstestdatei wurde in zwei Dateien gesplittet, um
unter dem 450-Zeilen-Limit zu bleiben (Rule 2/CLAUDE.md-Modularitaet). Ein vorbestehender,
nicht durch diesen Plan verursachter Befund ist dokumentiert: eine Test-Reihenfolge-Abhaengigkeit
laesst vier RangeAutoAssign-Handlertests bei isoliertem `-run`-Filter mit 403 fehlschlagen,
obwohl sie im vollen Paket-Lauf gruen sind -- reproduziert identisch auf dem Pre-Plan-Baseline-
Commit (`4fa8da5c`), siehe `deferred-items.md`. Details: 156-02-SUMMARY.md.

Plan 156-01 (2026-09-11) abgeschlossen: Migration 0161 fuegt die nullable, korrigierbare
`theme_segments.origin_release_version_id`-Spalte (FK auf `release_versions`, `ON DELETE SET
NULL`) plus Index hinzu und backfuellt sie deterministisch (niedrigste aufgeloeste Episode je
Segment ueber vorhandene `theme_segment_assignments`) -- live gegen `team4s_v2` verifiziert
(3/3 Segmente mit Zuweisung korrekt befuellt, Down/Up-Rundlauf sauber). `permissions.
SegmentCreditRoleCodes` ({translator, timer, karaoke_fx, typesetter}, encoder/quality_checker
explizit ausgeschlossen) ist jetzt die einzige zentrale Definition segmentrelevanter
Rollen-Codes, per RED/GREEN-TDD-Zyklus bewiesen. Keine Abweichungen vom Plan; ein
vorbestehender, nicht durch diesen Plan verursachter Befund ist dokumentiert (permissions.go
war bereits vor diesem Plan bei 930 Zeilen, weit ueber dem 450-Zeilen-Limit -- als Altlast
in 156-01-SUMMARY.md geflaggt, nicht behoben). Details: 156-01-SUMMARY.md.

Requirements-Hinweis (mirrors Phase 153's precedent): `.planning/REQUIREMENTS.md` hat keinen
Phase-156-Abschnitt; P156-05/P156-08/P156-09 sind in `.planning/ROADMAP.md`s Phase-156-Tabelle
verfolgt (nicht in REQUIREMENTS.md), `requirements.mark-complete` fand entsprechend keine
Zeilen zum Abhaken -- kein Fehler dieses Plans, sondern dieselbe uebergreifende
Tracking-Artefakt-Luecke, die STATE.md bereits fuer Phase 153 dokumentiert.

Phase 155 wurde additiv an die Roadmap angehaengt (Milestone v1.4 bleibt als abgeschlossen dokumentiert, kein Milestone-Reset). Auftragsquelle: `.planning/phases/155-fansub-projektseite-read-model-und-query-budget/155-USER-REQUEST.md`, Kontext: `155-CONTEXT.md` (ersetzt eine interaktive discuss-phase-Sitzung).

Phase 156 wurde ebenfalls additiv an die Roadmap angehaengt (Milestone v1.4 bleibt als abgeschlossen dokumentiert, kein Milestone-Reset). Auftragsquelle: `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/156-USER-REQUEST.md`, Kontext: `156-CONTEXT.md` (ersetzt eine interaktive discuss-phase-Sitzung). Phase 155 ist abgeschlossen (7/7 Plaene, 155-VERIFICATION.md).

### Phase 154 (abgeschlossen)

der Messreihe vom 2026-09-09: RCA-05 (vier redundante Faktenabfragen im sequenziellen Aggregator),
RCA-06 (ungegatetes Locked-Artwork bei null Projekten, schwerer Original-Fallback, animierter
Avatar) und RCA-08 (zu breite Viewer-Aufloesung, ignoriertes Abbruchsignal). Dazu zwei
Nachmessungen, die erst nach der Graphverkleinerung durch Phase 153 sinnvoll sind: RCA-07 (leere
React-Root-Commits) und der in Phase 153 verbliebene Listener-Zuwachs von rund 14 bis 15 pro
Navigationszyklus. Der aus Phase 153 offene Verifikationspunkt -- die Owner-Ansicht eines
versteckten Profils live zu bestaetigen -- wurde in 154-07 geschlossen: der Auftraggeber hat mit
praeziser, nicht-pauschaler Rueckmeldung bestaetigt (siehe 154-07-SUMMARY.md). Der Datenbestand
enthielt zuvor kein einziges `private`-Profil; der Pfad wurde per temporaerem, zurueckgesetztem
Toggle (`d1sk`) geprueft, nicht ueber ein vorhandenes verstecktes Profil. RCA-04 (gemeldeter
Chrome-Tab-Absturz) bleibt ausdruecklich offen und unreproduziert.

Milestone v1.4 bleibt fuer die Phasen 136 bis 153 abgeschlossen; Phase 154 wird additiv angehaengt,
ohne Milestone-Reset.

## Vorherige Position (Phase 153, abgeschlossen)

Milestone v1.4 (Coverage) is complete: all 18 phases (136-153), 177/177 plans, 100%.

## Vorherige Position (Phase 153, abgeschlossen)

Phase: 153 (public-member-clientlast-und-speicherretention) — COMPLETE (7/7 plans, 14/14 must-haves
verified, 153-VERIFICATION.md status: passed, score: 14/14)
Plan: 7 of 7
Status: Phase complete and independently verified. Faktenbasis ist die committete Messreihe
`docs/audits/2026-09-09-public-member-performance/REPORT.md` (Commit `592df665`): die Phase schliesst
die drei P1-Befunde RCA-01 (native Auto-Sizes-DOM-Retention bei SPA-Navigation, 466 → 15.107 Knoten
nach zwoelf Zyklen), RCA-02 (Editor-Barrel und private Not-found-Vollvorschau im oeffentlichen
Importgraph, rund 1,65 MB vermeidbarer JS-Transfer) und RCA-03 (Skeletons verdecken vorhandene
SSR-Inhalte bis zur Hydration). RCA-05/06/08 sind bewusst fuer Phase 154 zurueckgestellt, RCA-07 ist
laut Bericht erst nach der Graphverkleinerung sinnvoll erneut messbar, und RCA-04 (gemeldeter
Chrome-Tab-Absturz) bleibt ausdruecklich offen und unreproduziert — kein Dokument dieser Phase
erklaert ihn als behoben.

Nachmessung (153-AFTER.md, gegen den vollstaendig gemergten Sieben-Plan-Stand): Bundle Member
`page.js` 6,845→3,359 MB roh (−50,9 %), `not-found.js` 7,045→1,258 MB roh (−82,1 %), 0
Tiptap/ProseMirror-Bytes in beiden oeffentlichen Importgraphen. Retention (12/50 Zyklen):
Knotenwachstum 20,6/7,2 pro Zyklus (vorher ~1.220), Listenerwachstum 15,3/14,3 pro Zyklus (vorher
~62,75) — Knoten um Faktor 59-170, Listener nur um Faktor ~4 gefallen; der Restanstieg bei
Listenern bleibt eine offene Beobachtung. Sichtbarkeit: timer 36,91→26,15 s (−29,2 %), kara
34,27→23,37 s (−31,8 %), Gruppen-Kontrolle unveraendert.

Der blockierende Live-Checkpoint (153-07 Task 3) wurde vom Auftraggeber mit expliziter, messbasierter
Begruendung freigegeben (SSR-HTML-Pruefung, CSS-Vorfahrenkette, Playwright-Screenshots im Container),
nicht als pauschale Aussage — siehe `153-AFTER.md`, Abschnitt "Live-Checkpoint (Task 3) —
Freigabebasis". Checkpoint-Schritt 4 (Owner-Ansicht eines versteckten Profils) wurde dabei
ausdruecklich NICHT live geprueft (keine angemeldete Sitzung verfuegbar) und bleibt als offener
Punkt dokumentiert, nicht als bestanden. Zwei der drei unter D5 genannten vorbestehenden,
phasenfremden Befunde liessen sich unter den fuer diesen Plan verbindlichen Kommandos
(`npm run typecheck`, `docker compose build`) nicht reproduzieren — als Messdiskrepanz dokumentiert,
nicht als Erfolg dieser Phase verbucht.

`.planning/REQUIREMENTS.md` hat weiterhin keinen Phase-153-Abschnitt (durchgehend ueber alle sieben
Plaene bestaetigt, `grep -c "P153"` → 0) — ein phasenuebergreifendes Tracking-Artefakt-Luecke, die
keinem einzelnen Plan zuzurechnen ist; alle 14 P153-Anforderungen sind inhaltlich gegen den Code
verifiziert (153-VERIFICATION.md), nur nicht in dieser Datei nachverfolgt.

Milestone v1.4 (Coverage) ist mit Phase 153 vollstaendig (18/18 Phasen, 177/177 Plaene).

## Vorherige Position (Phase 152, abgeschlossen)

Phase: 152 (public-fansub-gruppenseite-konsolidierung-und-modernisierung) — COMPLETE (10/10 plans, 14/14 requirements)
Plan: 10 of 10
Status: Phase complete and independently verified (152-VERIFICATION.md status:passed, score:14/14). Code review (152-REVIEW.md) found 2 Critical findings, both fixed and re-verified (commits 9a873495, ef08af06). 5 Warnings + 2 Info remain as known non-blocking maintainability debt.
Post-completion correction pass 1 (2026-09-08): the initial verification's "clean test suite" claim relied on a scope narrowed to phase-touched files plus an earlier (152-09) full-suite snapshot, not a fresh complete run. D1sk independently ran the full frontend suite and found FansubMediaLightbox.test.tsx failing (3 tests) — caused by 152-04's correct alt="" a11y fix, never matched with a test-selector update, and mislabeled "pre-existing" by three separate Wave 1-3 executors who each checked only their own plan's diff instead of the whole phase's. A second, same-shape failure (ResponsiveImage.config.test.ts, caused by 152-01's next.config.mjs change) was found during the correction pass itself. Both fixed (commits fcc3fe70, caaba621); full suite re-confirmed clean (293 files/2255 tests, 0 failures).

Post-completion correction pass 2 (2026-09-08): D1sk ran a second, fully independent re-verification (own numbers, not accepted from documents) confirming full frontend suite (293/2255), backend build/vet, TipTap (36/36), production build (exit 0), and the live query budget (13.01→8.03). D1sk also proved TestPointServicePhase106Boundary is genuinely pre-existing by reproducing the identical failure on a worktree checked out at baseline commit 5e896cd2 (removed after use) — recorded as pre-existing/out-of-scope debt, not fixed. D1sk further required a reasoned decision on WR-02 (listProjectionContributors, dead since 152-03) rather than silent leave-behind: resolved by removing the function (commit e3a62984) while keeping the Contributors field/type, which is still part of the live API contract (confirmed via the frontend's v12-projection-contract.test.ts). Two pre-existing source-read tests that depended on the removed function's SQL text were repaired (renamed to reflect two sets instead of three; one deleted since its entire subject no longer exists in the file). 152-VERIFICATION.md and deferred-items.md updated in place with full narratives, not silently amended.
Produktionsbuild nach den letzten drei PNGs PASS (rc=0, TypeScript ok, 25 statische Seiten), voller
Vitest-Lauf mit einem Worker 293 Dateien / 2239 Tests PASS (1 skipped, 3 todo, exit 0), Collector-
Browsermatrix `pass: true` ueber 16/16 Zeilen ohne Findings und ohne Browserfehler, alle 197 Zeilen
der Artwork-Signoff-Tabelle einzeln gesichtet, nativer Touch-Check PASS, Backend-Gates (go build/vet,
badges-Tests, guarded PostgreSQL 20/20 und Exact-once) PASS.

Ein echter Defekt wurde dabei gefunden und minimal behoben: die generische Chip-Zeile
(`BadgeChip.module.css`) klemmte den quadratischen Hero-Slot der historischen/speziellen
Badge-Familie bei 320 px Viewport auf 190.72 x 192 px. Fix ist ein nachgebender Innenabstand
(`padding-inline: clamp(...)`) plus zwei Regressionstests; Details in `151-VERIFICATION.md`.

Vorbestehend und ausserhalb der Phase: 13 ESLint-Fehler / 332 Warnungen sowie 49 Fehler der breiten
Backend-Repository-Diagnose (fehlende Phase-128/134-Fixtures). Backend-Quellen sind byteidentisch
zur Baseline `052858dc`.

Phase 151 preserves the Phase-150 threshold/query authority and changes presentation only. Wave 1 contains
three file-disjoint plans: artwork/resolver, shared slot/cards/stages, and generic FocalCarousel. Wave2 consolidates family CSS after shared components; Wave3
integrates them in a linked dev-only gallery, exhaustive Linux Playwright evidence, full regression gates,
guarded constant-20/exact-once PostgreSQL proofs, and mandatory coordinator per-artwork signoff. No production
backend, API, schema, auth, runtime/tool configuration, or original artwork mutation is planned.

Previous completed phase: Phase 150 (badge-regeln-eine-autoritative-schwellenquelle) — COMPLETE,
7 of 7 plans executed; passed goal-backward verification 9/9 on 2026-09-07.

Phase 150 (Badge-Regeln — eine autoritative Schwellenquelle) ist additiv an v1.4 angehängt
(gleiches Muster wie 143-149) und abgeschlossen. Alle 7 Pläne ausgeführt (150-01 bis 150-05,
150-07 autonom; 150-06 als nicht-autonomer Checkpoint extern vom Nutzer gefahren, Regression-
Gates + Live-UAT bestanden). Ein Go-Schwellenregistry ersetzt sechs Backend-Kopien; der
Frontend-Threshold-Befund wuchs während Planung/Ausführung/Post-Execution-Review von 4 auf 8
Fundstellen, alle geschlossen (150-05-SUMMARY.md mit zwei Addenda, 150-07-SUMMARY.md,
150-06-SUMMARY.md). Der Verifier hat alle 9 Success Criteria unabhängig gegen den laufenden
Stack nachgemessen (u. a. Live-API-Aufruf gegen Member `type`, frische Go-/Vitest-Läufe) statt
den SUMMARYs zu vertrauen — 9/9 bestanden, keine Lücken. Ein informativer, nicht blockierender
Fund: ein toter `int64(12)`-Default in `member_profile_role_volume_repository.go:70`, in jedem
Codepfad nachweislich vor jeder Lesung überschrieben (kein Verhalten betroffen) — in
150-VERIFICATION.md dokumentiert, kein neunter Fundort im Sinne der Rendering-Fundstellen 5-8.

v1.4 remains complete; Phase 150 was appended additively (same pattern as 143-149), no new
milestone was created.

Phase 149 (Tote CSS-Tokens sanieren und den Notiz-Kontrast schließen) passed goal-backward
verification 7/7 (149-VERIFICATION.md, 2026-09-06) — all 6 plans executed, guard test proven with
an independently-reproduced negative proof, PublicNoteCard contrast confirmed live at the
previously-critical 4.16:1→5.01:1 case. One named, non-blocking observation carried forward: 2 of 9
full frontend `vitest` runs during 149-06 showed a single non-reproducible failing test (isolated
reruns of the only suspect file were green 3/3) — classified as pre-existing Docker-parallelism
timing flakiness, not a Phase 149 regression, and not yet root-caused.

v1.4 remains complete; Phase 149 was appended additively (same pattern as 143-148), no new
milestone was created.
Last activity: 2026-09-15

## Accumulated Context

### Roadmap Evolution

- 2026-09-13: Genau158 (Public Anime Detail Reparatur) und159 (Konsolidierung) additiv angelegt.159 folgt erst nach dem technischen158-Gate. Human-UAT156/157 bleibt offen. Keine Produktänderung oder DBwrites durch Planung.

- Phase 151 current reviewed structure: 5 plans / 3 waves. Plans 151-01/02/03 are Wave 1, CSS consolidation 151-04 is Wave 2, gallery/evidence/signoff 151-05 is Wave 3. This is the existing plan structure; no replan was performed during pause. Implementation paused by user for handoff on 2026-09-07.

- Phase 146 added (2026-09-04): Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests. Zwei Blöcke in einer Phase auf Wunsch des Nutzers — erst die drei Befunde aus `145-REVIEW.md` (CR-01 Lockout-Guard-Lücke, fehlender NOT-reserved-Filter, dreifach hartkodierte Action-Codes), dann die Testsanierung. Bestand selbst gemessen 2026-09-04: 53 Testdateien lesen eine `.go`-Quelldatei per `os.ReadFile` und belegen Verhalten mit `strings.Contains` (357 Aufrufe, 302 Testfunktionen); 17 davon berühren Sicherheitszusicherungen. Die ältere Schätzung 49/236 aus der Altlasten-Notiz ist überholt. Additiv an v1.4, KEIN Milestone-Reset.
- Phase 145 complete (2026-09-04): Alle 4 Pläne fertig; Live-UAT vom Nutzer abgenommen und deckt
  alle 6 Prüfpunkte ab (Pseudo-Rolle als erste Zeile unter Gruppenrollen, Standardrechte-Tab als
  Default mit reinem Erklärtext auf "Inhaber", genau 3 umschaltbare Rechte, andere Rollen ohne
  diese 3 Rechte samt "Grundausstattung öffnen"-Deep-Link, Herkunft Grundausstattung/
  `membership_baseline` beim aktiven Mitglied, wirksames Umschalten mit Rückweg). Post-Checkpoint-
  DB-Zustand vom Nutzer unabhängig erhoben und von diesem Agenten read-only nachbestätigt:
  `schema_migrations = 160`, `role_definitions` hält genau eine reservierte Zeile (`group_member`,
  Label "Mitgliedschafts-Grundausstattung", contexts `fansub_group`, `assignable = false`,
  `reserved = true`, `sort_order = -10`), `role_capabilities` hält exakt die 3 erwarteten Zeilen
  für `group_member`. Backend nach Rebuild sauber gestartet (hört auf 8092), das fail-closed Gate
  schlägt nicht an. **v1.4 bleibt ein abgeschlossener Meilenstein — dies ist additive
  Phasen-Fertigstellung, kein Meilenstein-Reset.**

- Phase 145 geplant (2026-09-03): 4 Pläne / 4 Wellen. Der Planner hat beim Grounding eine im Roadmap-Befund fehlende Stelle gefunden — die SQL-Abfrage in `LoadFansubGroupRoles` muss die reservierte Pseudo-Rolle ebenfalls ausschließen, sonst taucht sie im zuweisbaren Rollenkatalog auf. Migration erhält Nummer 0160.
- Phase 145 added (2026-09-03): Mitgliedschafts-Grundausstattung in die Rechte-Registry überführen. Additiv an das abgeschlossene v1.4 angehängt (KEIN Milestone-Reset). Scope = `membershipBaselineActions` (effective_rights.go:74) als reservierte, nicht zuweisbare Pseudo-Rolle in `role_definitions`/`role_capabilities` darstellen; Entscheidung zur Darstellung ist bereits vom Nutzer getroffen (siehe .planning/notes/2026-09-03-handoff-nach-phase144.md). Requirements TBD (kein v1.4-Requirement-Mapping — Decision-Coverage-Gate beim Planen beachten). Vor `plan-phase` `/gsd-ui-phase 145` laufen lassen.
- Phase 144 added (2026-09-02): Überarbeitungs-Kreislauf für Release-Medien vervollständigen.
- Phase 144 Live-UAT abgenommen (2026-09-03): Nutzer hat den vollständigen Ersetzen-Kreislauf (Upload -> Ablehnung -> Ersetzen -> zweite Ablehnung) im Browser durchgespielt und alle in 144-UAT.md belegten Invarianten bestätigt. Drei während der UAT gefundene, nicht zu Phase 144 gehörende Altlasten sind bereits behoben: RVM-Cleanup-Endlosschleife (448a4b02), has_own_release_work zählte abgelehnte Arbeit als erledigt (07a8c88d), Dashboard kannte Ablehnungen gar nicht (8c910c67/3f4ca6b1). Offen: Projektlisten-„Erledigt"-Grenzfall (bewusst zurückgestellt), CR-01/WR-02 aus .planning/notes/2026-09-02-altlasten-cr01-wr02.md, v1.4-MILESTONE-AUDIT.md fehlen Phasen 143/144.
- Phase 143 added (2026-09-01): Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen.
- Milestone v1.4 roadmap created (2026-08-20): seven sequential phases 136-142 cover Findings #29-#32 and all 41 approved requirements exactly once. Finding #33 (platform documents) and #34 (badge UI) remain deferred.
- Phase 135 added (2026-08-17): Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten. Scope = Live-UAT-Findings #6-#10 (.planning/notes/live-uat-ux-findings.md). Additiv an v1.3 angehaengt; Requirements TBD (kein REQUIREMENTS.md-Mapping -- Decision-Coverage-Gate beim Planen beachten).

### Decisions

- [Milestone v1.4, 2026-08-20]: Sequence policy/schema -> central resolver -> effective-rights UX and independent user projections -> specialized review delegation -> actor-decidable queue -> integrated security/live gate. This preserves `permissions.Service`, Keycloak global-role ownership, specialized delegation, canonical media/contribution ownership, and central browser refresh.
- [Milestone v1.4, 2026-08-20]: Findings #33 and #34 are explicitly excluded from every v1.4 phase and remain future requirements.
- [Phase 135, 2026-08-17]: 135-05's shipped `InviteAcceptFlow` (generic Anmelden/Registrieren copy) stays as the locked contract for 135-06/135-08; the Content-Spec Addendum's dynamic group/inviter/role context line and "wrong email logged in" state (D-11) are deferred — they require a new invite-preview-by-token backend endpoint out of Phase 135's scope. Tracked at `.planning/todos/pending/2026-08-17-invite-accept-dynamic-context-preview-endpoint.md`. Not a blocker for 135-07's live UAT.
- Milestone v1.3 hardens the existing public member profile; it does not introduce parallel member, contribution, membership, badge, media, release, auth, or UI systems.
- Anonymous hidden profiles and missing profiles are non-distinguishable.
- Public member slugs are stored, unique, and immutable after creation.
- Exact public badge progress is derived only from publicly permissible facts.
- Visibility and verified owner access are resolved before any profile-detail projection.
- Existing test rows are disposable; schema changes use new reversible migrations followed by reset/reseed, without row-preservation, backfill, alias, or compatibility code.
- The approved roadmap contains 65 requirements mapped exactly once across sequential Phases 128-134.
- The drifted historical planning tree is preserved at `.planning/milestones/pre-v1.3-recovery-2026-08-13/` and is not represented as one falsely completed milestone.
- [Phase 128]: Phase-128 PostgreSQL tests require TEAM4S_PHASE128_TEST_DSN and never fall back to DATABASE_URL.
- [Phase 128]: Wave-0 identity gates use compilable source-inspection RED contracts until Plans 128-04 and 128-05 provide production symbols.
- [Phase 128]: Public member access exposes only member ID, stored slug, and server-computed owner/private-preview facts before detail loading.
- [Phase 128]: One eight-case access matrix governs profile, projects, contributions, summary, notes, media, and releases with neutral 404 denials.
- [Phase 128]: Canonical redirects are tested as syntax-only 308 behavior independent of member existence. — Prevents existence-sensitive redirect behavior from becoming a privacy oracle.
- [Phase 128]: Refresh-only owner coverage exercises retained member reads through the central browser client. — Keeps UI token-free while proving fresh bearer attachment and no-store inside api.ts.
- [Phase 128]: Owner preview RED coverage rejects duplicate identity, auth, fetch, slugification, and numeric fallback seams. — The authoritative public DTO and pathname-owned canonical slug remain the only preview authority.
- [Phase 128]: Member-path redirects normalize only safe stored-slug syntax and never consult identity, visibility, auth, API, or database state.
- [Phase 128]: Numeric, malformed, separator-bearing, control, double-encoded, and non-ASCII member segments pass through without redirect.
- [Phase 128]: Migration 0145 refuses non-empty members before ALTER and never mutates rows; disposable data must be reset and reseeded. — Fail-closed schema transition prevents accidental live-row rewriting or compatibility behavior.
- [Phase 128]: Canonical public slugs are unique, constrained, and immutable in PostgreSQL. — Database invariants protect public identity across every future writer.
- [Phase 128]: Public member DTOs expose no app-user ownership identifier; owner and private-preview facts remain server-computed. — Avoids BOLA-prone client ownership inference.
- [Phase 128]: The entire members.public_slug namespace uses one transaction advisory lock, including literal suffix collisions. - Per-base locks cannot serialize name against literal name-2 creation.
- [Phase 128]: All production member creation paths allocate exactly once inside their existing caller-owned transaction. - Identity is persisted atomically with creation without nested transactions or parallel allocators.
- [Phase 128]: Outbound contribution links use stored public_slug only for public profiles; private member links remain NULL. — Stable identity survives nickname edits without disclosing private slugs.
- [Phase 128]: The shared nickname-derived memberSlugExpr declaration remains only until Plan 128-10 removes inbound resolution and remaining consumers. — Plan 128-06 removes owned outbound consumers without crossing later cleanup ownership.
- [Phase 128]: Group and domain projection links use stored public_slug only for public profiles; private identities remain unlinked.
- [Phase 128]: Grouped historical and contributor projections include the joined member primary key so canonical slug selection preserves row ownership and grouping.
- [Phase 128]: Archive and ranking projections select members.public_slug directly because their queries already enforce public visibility. — Stable public identity survives nickname changes without numeric or generated fallback.
- [Phase 128]: Verified member_claims equality is the only private-profile grant; missing and denied identities share ErrNotFound. — Prevents legacy identity, admin role, or guessed slug from becoming an authorization oracle.
- [Phase 128]: Public profile and project detail projections load only by a previously resolved member ID. — Keeps canonical identity and visibility decisions ahead of all detail fan-out.
- [Phase 128]: Temporary handler-compatibility methods delegate to the shared resolver and ID loaders until Plan 128-11. — Preserves whole-backend compilation without retaining duplicate slug or access logic.
- [Phase 128]: Contribution and project-member repositories accept only a stable member ID resolved by the shared access boundary.
- [Phase 128]: Project summaries expose members.public_slug directly; nickname-derived aliases and numeric fallbacks are not detail-loader concerns.
- [Phase 128]: Public profile handlers resolve canonical access before member-ID detail loading and return server-computed owner/private-preview facts.
- [Phase 128]: Verified AppUserID is the only viewer input to public-member authorization; platform-admin and token roles grant no access.
- [Phase 128]: Optional-auth member responses vary on Authorization, and viewer-dependent results use private, no-store.
- [Phase 128]: All seven member-specific GET routes share one MemberProfileRepository access resolver and existing optional-auth middleware.
- [Phase 128]: The seven public-member operations retain their backend runtime envelopes while sharing optional bearer, neutral 404, and private no-store semantics. — Preserves runtime parity while closing hidden-response and cache drift.
- [Phase 128]: Public profile ownership is represented only by server-computed viewer facts; the public DTO exposes no app-user identifier. — Prevents client-side ownership inference and public identity leakage.
- [Phase 128]: Member profile SSR remains anonymous and token-free; refresh-only owner recovery stays in the Plan-128-16 client seam.
- [Phase 128]: Invalid, numeric, missing, and privacy-denied member routes converge on neutral Next notFound output.
- [Phase 128]: The complete established profile composition remains authoritative for public and future owner-preview rendering.
- [Phase 128]: Own-profile public actions require the stored canonical slug and disappear when it is absent. — Prevents numeric or nickname-derived fallback identity while keeping display-name edits URL-neutral.
- [Phase 128]: Shared MemberProfileHero links use only the stored DTO slug and disappear when runtime slug data is absent. — Prevents numeric or nickname-derived public identity fallback across own and public DTO consumers.
- [Phase 128]: Hidden-profile resolution derives the canonical slug from usePathname and keeps initialization neutral.
- [Phase 128]: The preview passes authoritative viewer access into the shared composition and toolbar.
- [Phase 128]: Toolbar ownership uses getMemberProfile with the stored slug and never current-user or numeric-ID authority.
- [Phase 128]: Visibility remains in the established radio-card editor with exactly public and private values; no members-only alias or fallback label remains. — Keeps the canonical visibility contract and avoids a parallel persisted-data control.
- [Phase 128]: The owner deep link allow-lists existing profile tabs and focuses and scrolls the visibility panel without creating a second route, form, or auth seam. — Keeps owner editing on the established refresh-capable protected surface.
- [Phase 132]: known_for is one object (active_years, top_roles, known_groups) computed server-side over the complete approved current-project set, mirroring deriveKnownFor.ts's shape in snake_case.
- [Phase 132]: loadKnownFor is a dedicated new query (not an extension of countCurrentProjects), reusing its exact WHERE-clause filter set; raised the locked query budget 19 -> 20.
- [Phase 132]: getMemberProjects gained a 4th optional signal parameter mirroring getSearch/getSearchSuggestions.
- [Phase 132]: useCancellableSlugState never mutates a ref inside a setState updater; state transitions are pure functions of previous state plus resolved value, avoiding the StrictMode double-invoke dedup bug precedent in useProjectMemberCollection.ts.
- [Phase 132]: Progressive-disclosure components must never conditionally unmount content behind a visual toggle; only a CSS class changes -- locked as a tested contract (PMFE-06/D-09) across MemberStorySection, FocalCarousel, and MemberBadgeChain.
- [Phase 132]: useMemberViewer's fetcher must be useCallback-memoized on slug alone; an inline arrow function fed into useCancellableSlugState's effect dependency array causes an infinite self-abort/refetch loop.
- [Phase 132]: CorrectionReportModal no longer performs its own owner-resolution fetch; OwnProfileEditLink via useMemberViewer is the sole owner-gating authority for the members/[slug] surface (PMFE-02/D-02).
- [Phase 132]: MemberProfileHero/MemberProfileMemorialHero read known_for from the DTO with zero client-side re-aggregation; deriveKnownFor.ts trimmed to the still-used KnownForResult type only.
- [Phase 132]: Visible profile generateMetadata composes title/description/OpenGraph only from already-public fansub_name and known_for facts; hidden/missing metadata stays byte-identical.
- [Phase 132]: relativeTimeLabel is a pure function of (occurredAt, referenceNow); one server- or client-useState-captured referenceNow is threaded through MemberProfileContent to eliminate the Date.now() SSR hydration-mismatch.
- [Phase 133]: MemberBadgeChain.tsx (928 lines, ~2x CLAUDE.md's 450-line cap) is accepted pre-existing debt deferred outside Phase 133's scope — CONTEXT.md's D-04 scoped only the CSS-module split (MemberBadgeChain.module.css); the .tsx file keeps its existing per-component function boundaries and gains only import-wiring changes across Plans 133-04/07/08/09. Formally resolves RESEARCH.md's Open Question 1, mirroring the codebase's existing oversized-file deferral precedent.
- [Phase 133]: dangerouslyAllowLocalIP is gated to process.env.NODE_ENV !== 'production' and images.qualities is an explicit [75] allow-list; localPatterns (/media/**, /member-achievement-badges/**, /covers/**) remain byte-for-byte unchanged and regression-tested.
- [Phase 133]: The full pre-existing @media (max-width: 760px) hero block (which bundles .heroPanel/.heroAvatar with .heroCopy/.heroTitleRow/.heroBio/.heroMetaLine/.knownForBlock/.heroSpecialAwardsList overflow-safety rules) was converted as one unit to @container member-profile-hero, keeping hero-internal overflow-safety rules in sync with the panel/avatar's container-driven layout switch. — Prevents overflow-safety rules from falling out of sync with the panel layout at wide-viewport/narrow-container states, e.g. inside a future two-column .profilePair layout
- [Phase 133]: MemberBadgeChain.tsx's shared roleArtwork classes moved to LayeredBadgeArtwork.module.css keep two role-code/anime-project override rule blocks behind in MemberBadgeChain.module.css since CSS Modules scopes selectors per file; the affected JSX sites apply both the moved and the still-local class name to preserve pixel-identical rendering (Plan 133-04, precedent for 133-07/08/09).
- [Phase 133]: react-dom@18.3.1 does not forward a declarative boolean inert JSX prop to the DOM — FocalCarousel sets/removes the inert attribute imperatively via a ref callback instead; jsdom's inert focus-blocking is unimplemented so tab reachability is asserted via attribute presence, not userEvent.tab().
- [Phase 133]: MemberProfileMemorialHero.tsx now mirrors MemberProfileHero.tsx's public-view heading structure exactly: p.heroEyebrow -> div.heroTitleRow > (h1.heroTitle + MemberStatusPill), no PageHeader title usage.
- [Phase 133]: Compound CSS selectors mixing a class moving to a new stage module with a class staying in MemberBadgeChain.module.css (either direction) stay behind in the shell file with dual-class JSX application (Plan 133-04 precedent); the .group[data-badge-group]-scoped 'no card surface' twin stays listing all five stage selectors unnarrowed for the same CSS-Modules per-file scoping reason.
- [Phase 133]: MemberBadgeChain.tsx's .familyStageButton:has(.currentChip)/.familyStageButton .currentChip stay in MemberBadgeChain.module.css since .currentChip is a chainStyles-local shared utility class used at multiple other sites (roles progression, anime-project milestones); the rendered family stage button carries both badgeFamilyCardStyles.familyStageButton and chainStyles.familyStageButton so both rule sets keep matching (Plan 133-08, extends the Plan 133-04/07 compound-selector-crosses-file-boundary pattern).
- [Phase 133]: MemberBadgeChain.tsx's four badge-chip compound groups (.badgeWindowActive .badgeArtwork, six .group[data-badge-group=...] .badgeRow/.badgeArtwork/.badgeRowCompact rules, .badgeWindowActive .badgeStep) stay in MemberBadgeChain.module.css since .badgeWindowActive/.group are chainStyles-local while .badgeRow/.badgeArtwork/.badgeRowCompact/.badgeStep moved to BadgeChip.module.css; the generic badge-row render site applies dual classes at 4 JSX sites so the kept-behind rules keep matching (Plan 133-08).
- [Phase 133]: FAMILY_CARD_COMPACT_QUERY is the single named JS constant reconciling FamilyCollectionCard's window.matchMedia scroll-centering breakpoint with BadgeFamilyCard.module.css's @container (max-width: 820px) layout breakpoint at exactly 820px, closing RESEARCH.md's magic-number duplication (Plan 133-08).
- [Phase 133]: RoleBadgeCard's selector family was split by SELECTOR OWNERSHIP into three files (RoleBadgeCard.module.css/.status.module.css/.stages.module.css) rather than by breakpoint tier, since CSS Modules hashes class names per source file -- splitting one selector's base+breakpoint rules across multiple files would require the DOM element to carry a hash from every file simultaneously; grouping by which selectors a file owns guarantees each selector's complete rule set lives in exactly one file (Plan 133-09).
- [Phase 133]: RoleBadgeCard.module.css/.status.module.css/.stages.module.css complete the MemberBadgeChain.module.css split (Plans 133-04/07/08/09): shell shrunk to exactly 450 lines, all 12 extracted CSS modules under the cap, 4 previously-duplicated selectors (.roleLabel/.roleBadgeRow/.roleHeroArtwork/.roleProgressTrack) each resolved to exactly one canonical declaration per UI-SPEC.md's locked table.
- [Phase 133]: LOCKED_BUDGETS page-level metrics (imageWaterfall) must be excluded from evaluateBudget()'s generic api[endpoint] budget loop; checked separately alongside the Web-Vitals pageCheck (rendered pages only).
- [Phase 133]: A CSS comment's embedded */ (used as informal glob/wildcard shorthand, e.g. .roleBadgeRow*/.roleLabel) prematurely closes the enclosing /* ... */ comment block and crashes the entire page with a dev-server syntax error; avoid asterisk-immediately-followed-by-slash sequences inside open CSS comments (found/fixed in Plan 133-10, MemberBadgeChain.module.css and RoleBadgeCard.module.css).
- [Phase 133]: capturePageMetrics() now captures pageOverflow/bodyOverflow (previously only existed in the separate phase120-mode snapshotDOM()); evaluateBudget() hard-gates on both deltas being <=0 (PMUI-01/06), completing the phase's automated overflow gate.
- [Phase 133]: Plan 133-11's full unscoped npm test sweep (first in this phase) confirmed 11 pre-existing failures across files never touched by any Phase 133 plan are out of scope; only the MemberBadgeChain.test.tsx containe typo and missing type cast (a file already owned by earlier Phase 133 plans) were fixed. See deferred-items.md for full triage.
- [Phase 134]: seed-member-profile-fixtures.mjs's story-image assertion and manifest field use /media/profile/ as the expected member_story_html src substring, not /media/story-images/ (the sanitizer-allowed pattern is /media/profile/{memberID}/story/{uuid}/original.ext; /media/story-images/:id is a separate resolve-by-ID endpoint used only for editor-side preview).
- [Phase 134]: TestPhase134MigrationFreshUpDownProof registers maintPool.Close() via t.Cleanup (not a bare defer), ordered before the final teardown-drop cleanup, since t.Cleanup callbacks run after the test function's own defers return.
- [Phase 134]: Migration 0037_add_release_decomposition_tables.down.sql was rewritten from an intentional no-op into a full reverse of its up.sql; its release_streams FK to release_variants(id) blocked migration 0035's DROP TABLE release_variants the first time the full Down chain ever ran end-to-end (PMQA-03 fresh/up/down proof).
- [Phase 134]: A genuinely fresh migration-only database has no member to self-claim and no platform_admin to grant the first platform_admin -- scripts/provision-phase134-matrix-db.sh bootstraps both via scoped direct SQL before invoking the real seed script, which retains 100% ownership of scenario/business fixture data.
- [Phase 134]: The verification matrix mounts ./scripts:/scripts:ro into team4sv30-backend (docker-compose.override.yml), mirroring the existing ./database/migrations mount, since the container's /app root corresponds to backend/ only, not the repo root.
- [Phase 134]: parseBoundedProjectPageValue never returns an error status for invalid limit/offset query params -- it silently clamps to the documented safe default/bound and returns 200; this IS its fail-closed contract, not a bug.
- [Phase 129]: Canonical public projections and data correctness are executed and automated-gate GREEN (11/11 plans) -- every year-only precision, current-vs-historical, role code/label, dedupe, public-facts-progress, media-filter, and dead-legacy-removal defect found in 129-RESEARCH.md is corrected and locked by a passing PostgreSQL contract test, per .planning/phases/129-canonical-public-projections-data-correctness/129-VERIFICATION.md.
- [Phase 130]: The public DTO/OpenAPI/TypeScript/api.ts contract alignment is executed (7/7 plans) -- shared/contracts/openapi.yaml carries dedicated allow-listed public-member schemas (PublicMemberBadge, etc.); no separate 130-VERIFICATION.md/SUMMARY.md file exists, a real doc-completeness gap noted by 134-RESEARCH.md's Ground Truth findings, not a code gap.
- [Phase 131]: Set-based delivery, pagination, and performance budgets are executed and locked (8/8 plans) -- profile-load SQL query count is capped at 19, and API payload/latency/Web-Vitals budgets for both sheppert and csubs-leader are captured in .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/BUDGETS.md.
- [Phase 134]: reset-member-profile-fixture.sh clears members.member_story_json/html/text (UPDATE, not DELETE) for the two reference members before deleting their story-image media_assets rows — that JSONB reference is invisible to Postgres FK enforcement; a stale reference would trip applyStoryImageLifecycle's IDOR check on the reseed's next PUT /me/profile
- [Phase 134]: The three tracked badge asset directories are sha256-verified byte-identical before and after the shared team4s_v2 database reset+reseed cycle (PMQA-06), and the seed re-run prints RESULT: PASS (15/15) twice in a row afterward, proving PMQA-01's idempotent-from-clean-state claim genuinely holds
- [Phase 134]: Plan 134-06 resumed 2026-08-20: the shared team4s_v2/Keycloak stack had been fully reset out-of-band (both `team4s_postgres_data` and `team4s_keycloak_db_data` volumes recreated 2026-08-17), so sheppert/csubs-leader existed nowhere (no Keycloak accounts, no members rows) -- bootstrapped both via the exact identity/authz pattern already established in provision-phase134-matrix-db.sh Step 4.5 (kcadm user create + platform_admin realm role + member/member_claims/app_user_global_roles bootstrap SQL), then re-ran the Plan-134-01 seed script (15/15 checks pass). Task 1's automated capture then found a real, pre-existing bug: `--focus-ring` (a box-shadow token) was misused as an outline color in profile.module.css/FocalCarousel.module.css/AnimeProjectStage.module.css, silently collapsing keyboard focus rings to invisible on the live member-profile page; fixed all three to use the dedicated `--focus-outline` color token (GroupMediaReviewSection.module.css has the same bug but is admin-only, out of this plan's blast radius -- logged to deferred-items.md). Both evidence harnesses now pass 0-breach/exit-0, and all 6 profile x viewport keyboard-focus captures report keyboardPass: true.
- [Phase 134]: Plan 134-06 Task 3 (PMQA-05 live sign-off) closed 2026-08-20 after two live-UAT gap-closure rounds, each fixed and re-evidenced before the next round: (1) a mobile hero container-query self-query bug (dead cqi units in LockedStageArtwork.module.css) freezing the 390x844 layout, plus badge-chain connector-line misalignment (roles progression + anime-project milestones, AnimeProjectStage.module.css/RoleBadgeCard.stages.module.css) and badge-label mid-word wrapping -- all fixed and evidence refreshed (commit 96b8bbeb); (2) a tablet/desktop hero-avatar top-alignment fix, evidence refreshed a second time (commit c285414d). User then performed the full live browser walkthrough over the canonical SSH-tunnel path across all 3 required viewports (390x844/768x1024/1440x900) plus real 400% browser zoom, confirmed the seeded story image renders and keyboard Tab focus is visible, and explicitly typed "approved" for both sheppert and csubs-leader -- both Sign-off checkboxes in uat-checklist.md checked (commit 9c8ac464). PMQA-05 complete; all 6 Phase 134 plans now done. Phase 134's own phase-level closure (code review/regression gates, ROADMAP/STATE phase-complete marking) and milestone v1.3 completion remain the orchestrator's next step.
- [Phase 135]: Plan 135-01 executed (D-01, D-04) -- keycloakAuth.ts gained a validated one-shot consumeStoredReturnPath() (mirrors registrationCompletion.ts's marker pattern) plus BeginKeycloakLoginOptions.loginHint/.returnPath; login/page.tsx's completeCallback() destination priority is now persistedReturnPath ?? (registration-completion default) ?? next-param. This is the shared foundation Plans 135-05/06 must persist a returnPath through via beginKeycloakLogin({ returnPath }) rather than inventing a second mechanism. 12/12 login/page.test.tsx cases pass; tsc --noEmit clean for both touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored).
- [Phase 135]: Plan 135-02 executed (D-06) -- ListFansubGroupRoleDefinitions's SQL predicate simplified to WHERE assignable = true only, closing Finding #7 / Pitfall 2 (admin/other anime_contribution roles leaking into the group-role picker). New testsupport.OpenPhase135Postgres harness (SKIP-not-FAIL convention) plus TestListFansubGroupRoleDefinitionsAssignableOnly prove the exact 6-code assignable set against a real 0085/0100/0103/0112 migration chain. — Closes the one-line SQL defect identified in 135-RESEARCH.md Pitfall 2 with a live-DB regression proof rather than source inspection alone.
- [Phase 135]: Plan 135-03 executed (D-03, D-01, D-08) -- CreateFansubGroupInvitation's mail now names the real fansub group (via a new fansubGroupNameStore threading of FansubRepository.GetGroupByID, fail-open to a generic phrase) and the inviting admin (identity.DisplayName), replacing the old blind "Du wurdest zu einer Fansub-Gruppe eingeladen" text with the phase's locked Content-Spec Addendum copy. The mail CTA link now carries &email=<url-escaped invitee email> for D-08's mediated Keycloak login_hint prefill fallback (server-side match enforcement in Accept() unchanged). Two new tests prove the enriched context and the nil-fansubRepo fallback; go build/vet/test all clean.
- [Phase 135]: Plan 135-04 executed (D-05, D-07) -- HistoricalMemberCard now destructures the 8 already-declared claim-invite props (generatedInvites, memberInvitations, copyStates, canCreateClaimInvitation, onGenerateInvitation, onCancelInvitation, onCopyLink, normalizeInviteLink) and renders the generate/copy/cancel block gated on canCreateClaimInvitation && !member.app_username, using the hist-claim-invite-link- id prefix required by useGroupMembersClaimActions.ts's markVisibleInviteLink DOM fallback (not ClaimManagementPanel's claim-invite-link- prefix). ClaimManagementPanel.tsx is documented in-code as an intentionally unmounted future-admin-view reference rather than deleted, resolving 135-RESEARCH.md Open Question 2. 4/4 new component tests pass; tsc --noEmit clean for both touched files. — Closes the "generate + display" gap for the claim flow that unlocks historical members -- pure JSX wiring against an existing, tested, audit-logged backend/hook; no backend change and no new authorization surface.
- [Phase 135]: Plan 135-05 executed (D-01, D-04, D-07, D-08, D-09) -- new frontend/src/components/auth/InviteAcceptFlow.tsx is the one shared dual Anmelden/Registrieren + returnPath + auto-accept + friendly-error onboarding component (Button-only, zero raw <button>), and frontend/src/app/invitations/accept/page.tsx is rewritten on top of it, closing Finding #10's BLOCKER cold-invite dead end. A useRef guard fires the auto-accept effect at most once per mount; handleLogin/handleRegister persist returnPath via 135-01's beginKeycloakLogin({returnPath}) and forward loginHintEmail as login_hint. 9/9 new frontend tests pass (5+4), re-run alongside login/page.test.tsx's 12 cases with zero regressions (21/21). — DEVIATION FLAGGED: the plan file's own appended "Content-Spec Addendum" (D-11/D-12, dynamic group/inviter copy + a fourth "wrong email logged in" state + "Konto erstellen und beitreten"-style button labels) was NOT implemented; the plan's literal <tasks> section (simpler generic copy, matching 135-06-PLAN.md's already-written expectations) was followed instead. See 135-05-SUMMARY.md's "Deviations from Plan" for full rationale -- this addendum content is an open gap that needs a follow-up plan/task or an explicit CONTEXT.md rescoping before 135-07's live UAT (which requires "correct German copy... throughout").
- [Phase 135]: Plan 135-06 executed (D-09, D-07) -- claim-invitations/accept/page.tsx rewritten as a thin InviteAcceptFlow composition, closing D-09 (both invite types now share one shared onboarding flow) and Pitfall 1/5's return_to dead end for this page. No loginHintEmail prop (claim invitations are generic shareable links with no target email); afterAcceptRedirect=/me/profile preserves the page's prior immediate-redirect-on-success behavior. 3/3 new page tests pass, re-run alongside login/page.test.tsx (12), invitations/accept/page.test.tsx (4), and InviteAcceptFlow.test.tsx (5) with zero regressions (24/24 green); tsc --noEmit clean for touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored). — Followed 135-06-PLAN.md's <tasks> section literally against 135-05's locked InviteAcceptFlowProps contract, per the user-confirmed scope ruling (STATE.md 2026-08-17 entry) that the Content-Spec Addendum's dynamic group/inviter/role copy stays deferred and out of scope.
- [Phase 135]: Plan 135-08 executed (D-12, D-13, D-07) -- infra/keycloak/themes/team4s/login/register.ftl is now a real theme override (previously the theme shipped zero .ftl overrides and inherited register.ftl byte-for-byte from keycloak.v2). Empirically confirmed against the live Keycloak 26.0.8 realm (curling /realms/team4s/protocol/openid-connect/registrations with login_hint set) that login_hint prefills only the "username" registration attribute, never "email" -- register.ftl reuses that prefilled username value as `invitedEmail` whenever it looks like an email address, and renders the "email" attribute with custom inlined markup carrying a real HTML `readonly` attribute (value still submitted, unlike Keycloak's own attribute.readOnly path which emits `disabled` and drops the value) plus a generic invite-context line (team4sInviteContext message key; Keycloak does not forward group/inviter/role to the registration template, matching 135-05-SUMMARY.md's prior Content-Spec Addendum scope ruling). Full live proof: registered a real test account through the locked path via curl (PKCE authorization_code flow), exchanged the code, and confirmed via /userinfo that the created account's email claim exactly matched the invited address; test account deleted via the Keycloak admin API afterward. Open (non-invite) registration verified unaffected. — This is a scope evolution of D-08 (135-CONTEXT.md's original text says "kein KC-Theme-Umbau"/no KC theme rework): D-12/D-13 were added later, during live-UAT review, specifically because D-08's mediated query-param-only approach (135-03) could prefill but not lock the email or show invite context; 135-08 layers a theme change on top of, not instead of, that mediated fallback.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-07 executed (D-01..D-04, D-08, D-09) -- scripts/phase135-green-gate.sh (already built/committed 7afd2774) re-run after 3 intervening commits confirmed zero new regressions; the 4 non-green steps (backend-test DB-integration fixtures, frontend-lint capture-responsive.cjs, frontend-test 12 stale files, frontend-build Next.js /_global-error Turbopack prerender) are all pre-existing and untouched by any Phase 135 file, per git-log cross-check. — Live UAT confirmed (user, 2026-08-19): registrationAllowed=true on the running Keycloak team4s realm (no drift); cold-invite round trip (mail context/Umlaute, Anmelden/Registrieren no jargon, auto-return, auto-accept) and claim-invite round trip (lands on /me/profile) both confirmed end-to-end with zero deviations. Closes Finding #10 BLOCKER.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-10 executed (D-15, D-16) -- case-preserved fansubName KC attribute (register.ftl hidden-username derivation + token claim + backend display-identity priority) closes D-15; Task 4's self-claim approval render pre-existed this plan (ca189d99, prior non-GSD session) and was sanity-checked, not re-implemented. Live UAT surfaced 5 deviations, all fixed same-session: 2 backend list queries preferring lowercase preferred_username over case-preserved display_name; missing success feedback + cross-list refresh on claim-verify/member-activate; 5 window.confirm() calls replaced with the app's own Modal (design-system violation); missing claim-note render; a direct-user-requested mobile-first claim-card redesign. — Phase 135 is now complete (both previously outstanding plans, 135-07 and 135-10, done; all 10 plans have summaries). D-01 through D-16 implemented and live-verified. Commits 069b2f6b/514ec1fd/88e0d62f/1403ccd0 (Finding #28: hide active members from historical list, surface active membership + verified historical roles on public profile, linked-account card redesign) landed in the same session immediately after but are explicitly out of 135-10's D-15/D-16 scope -- recorded as an adjacent follow-up, not phase-135 work.
- [Phase 136]: Catalog color_key values are normalized to the exact migration-0149 hex allowlist; unknown values resolve to neutral.
- [Phase 136]: Active role chips use one data-color-key CSS seam and never derive colors from role codes.
- [Phase 137]: Migration 0150 seeds the override-management capability only to fansub_lead (not founder/co_leader) and flips exactly seven Phase-136 group actions plus all three review.*.decide actions to user_overridable=true, giving later Phase-137 plans a real Review-Delegation-vs-User-Deny action to test against.
- [Phase 137]: 137-02: EffectiveRightState additively extended (D04) with granting_roles[]/user_allow/user_deny/specialized_grants[]/decisive_source/reason_code; EffectiveRightProvenance gained platform_admin/specialized_grant/no_grant; CapabilityActivationStatus documented active-only for Phase 137. No competing inspector DTO introduced; Go DTO in capability_policy_contract.go deliberately deferred to a later Phase-137 plan. — Closes the Phase-136 DTO provenance gap identified in 137-RESEARCH.md Pitfall 4/Open Question 1 before any backend resolver route consumes the contract.
- [Phase 137]: 137-03: AuthzUserOverridesRepository (backend/internal/repository/authz_user_overrides.go) gives the resolver/mutation-service layer batch-load (LoadCurrentOverrides), FOR-UPDATE membership lock (LockTargetMembership distinguishes ErrNotFound non-member from a returned inactive Status), catalog-policy read (LoadOverridePolicy), lock-then-mutate before/after state (UpsertOverride/DeleteOverride), and append-only history (AppendHistory/ListHistoryForSubject) primitives -- zero resolver precedence logic, zero N+1, one authzUserOverridesDBTX interface (embeds repository.DBTX + Query, mirrors releaseCrewDBTX) works on pool and tx alike. New backend/internal/testsupport/phase137_postgres.go harness applies the real 0085/0100/0108/0112/0146/0150 migration chain.
- [Phase 137]: 137-04: ResolveGroupRights is the single group-wide D01 precedence engine (platform_admin > disabled > no-membership > user_deny > user_allow > role_grant > specialized_grant > no_grant), batch-loading membership/roles/overrides/specialized grants with no per-capability SQL; two new optional Resolver interfaces (GroupRightsMembershipResolver, GroupRightsOverridesResolver) exist but AuthzRepository does not implement them yet -- production falls back to inferring active membership from non-empty roles (zero regression), and real per-user override enforcement is not yet live end-to-end. Review Delegation is fully wired today via the existing ReviewContextResolver as the first SpecializedGrantProvider (review_grant_provider.go). Flagged for Plan 137-05 to close.
- [Phase 137]: 137-05: Every production group-scoped Can* entry point (CanForFansubGroup, CanForRelease, CanForReleaseVersion, CanForReleaseVersionMedia, CanReviewForFansubGroup) now derives its decision from ResolveGroupRights, closing 137-04's Known Gap by wiring AuthzRepository into GroupRightsMembershipResolver/GroupRightsOverridesResolver against real Postgres. — 137-04 flagged that ResolveGroupRights was logically correct but unreachable from production traffic and had zero repository wiring; 137-05 is the plan that first routes legacy enforcement through it, so closing the gap here (rather than deferring) was required for the plan's own must_haves to be true in production, not just in Go fixtures.
- [Phase 137]: 137-06: EffectiveRightsService.MutateOverride requires a reason for every real change uniformly (including platform admins), and validates active target membership in the exact target group for every mutation kind including REMOVE -- stricter than migration 0146's own DB CHECK constraint, matching the plan's must_haves literally. Fixed a real gap: permissions.allKnownActions was missing ActionUserGroupCapabilityOverrideManage entirely, so ResolveGroupRights could never grant D07's management capability at all until this plan added it (mirrors 137-05's identical allKnownActions-completeness precedent).
- [Phase 137]: 137-07: effective-rights inspection/mutation/history HTTP boundary wired into cmd/server (admin_routes.go + main.go, not internal/router which does not exist); three group-scoped routes under /admin/fansubs/:id/app-members/:appUserId/, all authorized via ActionUserGroupCapabilityOverrideManage, delegating entirely to ResolveGroupRights/EffectiveRightsService.MutateOverride. — Closes CAP-01/02/05/06/07 and QUAL-03 at the API boundary; also closed 137-02's deferred Go EffectiveRightState DTO gap since this plan is the first to serialize it over HTTP.
- [Phase 137]: 137-08 closed the phase with a full backend suite gate (real Postgres, TEAM4S_PHASE137_TEST_DSN supplied): internal/permissions and internal/services fully green including real-Postgres/concurrency tests; two genuine D01-D10 negative-matrix gaps (self-mutation without capability, platform-admin bypass at the mutation boundary) closed with new subtests; all 65 remaining backend failures triaged into six pre-existing, Phase-137-unrelated buckets and none live in any of Phase 137's own 31 touched files. See 137-VALIDATION.md.
- [Phase 137]: 137-09: Closed GAP-01 (post-commit response safety) and GAP-02 (unconditional success + reject-path audit coverage, including the BOLA/IDOR body/path-mismatch guard) in AdminEffectiveRightsHandler.MutateOverride; CapabilityActivationStatus docs (both YAML contracts + TS type) now document the real, reachable pending-on-enrichment-failure behavior instead of the stale active-only claim.
- [Phase 137]: 137-10 closed GAP-03: both shared/contracts/admin-capabilities.yaml and shared/contracts/openapi.yaml now document a 400 response on GET .../effective-rights and GET .../capability-overrides/history, matching parseGroupAndTarget's real badRequest behavior for a malformed id or appUserId path parameter. No other endpoint or schema changed; contract parity and tsc --noEmit both confirmed green.
- [Phase 137]: 137-11 executed (GAP-04, GAP-05): effective_rights.go's file-level doc comment corrected to state production wiring (Plan 137-05) and DTO/HTTP projection (Plan 137-02/137-07) are both closed; effective_rights_service.go's error-sentinel var block is now gofmt-clean. Comment-only and whitespace-only changes; go build/test confirm zero behavioral change.
- [Phase 137]: [Phase 137, 2026-08-21]: 137-12 dispositioned GAP-06 (contribution-role vs user_deny) as Fall C -- 137-CONTEXT.md's D01/Section 2 never name contribution roles as a resolver source category at all, so no runtime change was made to CanForReleaseVersion's Step 3 fallback; a new regression test (TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny) locks today's actual behavior (a stored user_deny does not block the contribution-role fallback), and the ambiguity is explicitly flagged in 137-12-SUMMARY.md as DECISION REQUIRED for a human decision-maker rather than resolved unilaterally.
- [Phase 137]: 137-13 closed GAP-07 (UAT-137-01) with additive migration 0151 (co_leader/founder/gfxler/techadmin gain fansub_group_media.view); zero change to fansubEditAccess.ts -- the existing case "media": return capabilities.can_view_group_media gate already produces the correct result once the capability flag is true post-migration.
- [Phase 137-14]: GAP-08 closed: canEditFansubBranding mirrors backend fansub_group.edit exactly (can_edit_group only, no can_update_group_media fallback); Logo/Banner section fully hidden (not disabled) for co_leader/founder/gfxler/techadmin-shaped capability sets
- [Phase 138]: 138-01: AuthzRepository.ListRoleHolders answers D-07's "who holds fansub-group role X" with one non-N+1 join (fansub_group_member_roles -> fansub_group_members -> fansub_groups -> app_users, plus an EXISTS override-presence check); AdminRoleHoldersHandler gates it platform-admin-only and rejects unknown/non-fansub-group role codes with 400 before querying.
- [Phase 138]: 138-01: testsupport.OpenPhase137Postgres was extended (post-migration-loop, additive/nullable columns only) with fansub_group_member_roles and app_users/fansub_groups display columns, since the real production tables were never part of the applied 0085/0100/0108/0112/0146/0150 migration chain despite the plan's premise; effective_rights_service_test.go's own ad-hoc fansub_group_member_roles table was removed to avoid the resulting collision.
- [Phase 138]: 138-02: GrantCapability/RevokeCapability keep HTTP 200 regardless of cache-reload outcome; a new RoleCapabilityMutationResult.cache_reload_succeeded field closes the CAP-10/D-21 honesty gap end to end (Go DTO -> OpenAPI -> TS -> api.ts). — A cache-reload failure is not a mutation failure per R-05/Pitfall 3, so the domain write stays a 200; the response body now honestly signals whether the in-process cache actually reloaded.
- [Phase 138]: 138-02: new shared @/components/ui/ActivationStatusIndicator renders the role_matrix vs override capability-mutation paths via a discriminated 'path' prop rather than one shared enum. — The two paths have genuinely different honest vocabularies (no async window exists on role_matrix, so 'wird aktiviert' is never legitimate there; override can legitimately report a post-commit-enrichment 'pending' state per Phase 137's MutateOverride) — conflating them into one enum would misrepresent one path's state space as the other's.
- [Phase 138]: 138-03: EpisodeNumber is *string/string|null (not *int/number) because episodes.episode_number is a TEXT column (migration 0002); ListUserContributions extended with additive LEFT JOINs to release_versions/fansub_releases/episodes so UserContributionsTab never renders a raw release_versions.id as a fake version number (D-29). 2 pre-existing UserContributionsTab.test.tsx failures (Phase-136 hex-only color_key normalization vs stale semantic fixture values) confirmed present at HEAD, out of scope, logged to deferred-items.md.
- [Phase 138]: 138-04: loadGroupRightsSources returns (groupRightsSources, bool, error) exactly per the plan's literal interface; pre-condition guards (nil resolver, invalid actor/group) intentionally stay in ResolveGroupRights since they resolve to a denyAllGroupRights reason code distinct from the platform-admin/disabled fast path. PreviewGroupRightsWithRoleChange reuses evaluateGroupRights twice against a synthetically modified role list (add=dedup-append, remove=filter) -- zero new decision logic (D-20 binding). New GET .../role-assignment-impact endpoint mirrors setFansubGroupMemberRole's exact authorization (ActionFansubGroupMembersManage) and role validation (IsKnownFansubGroupRole); target-actor resolution extracted into shared loadEffectiveRightsTargetActorState reused by AdminEffectiveRightsHandler and the new handler. Full D-35 contract chain (Go DTO/YAML/TS/api.ts) closed.
- [Phase 138]: [Phase 138] 138-05: MemberClaimsRepository.ListClaims and AuditLogRepository.ListChanges close D-23/D-25's backend list-endpoint gap -- cross-group, platform-admin-gated, dynamic-parameterized filters, COUNT(*) OVER() totals, and a new shared ClampAdminListPage clamp helper; testsupport.OpenPhase137Postgres extended additively with member_claims/hist_fansub_group_members/audit_logs/members.nickname (real production shapes were never previously in the fixture's migration chain); full D-35 contract chain (OpenAPI/TS/api.ts) closed for GET /admin/claims and GET /admin/changes.
- [Phase 138]: 138-06: getEffectiveRights/mutateCapabilityOverride/listOverrideHistory wired into api.ts; UserGroupRightsTab.tsx re-pointed at the real Phase-137 resolver -- multi-group, category-grouped (7 real registry categories), provenance-capable D-13 inspection surface, zero new client-side precedence logic (D-14). Matrix (listRoleCapabilities) fetch folded into the same load as memberships/rights to avoid a category-grouping render race, since it is now load-bearing not just a cross-nav optional enhancement. Mutation half (CAP-08 guided grant/revoke) deferred to Plan 138-08.
- [Phase 138]: 138-07: PreviewGroupRightsCapabilityChange (permissions package) batch-computes a role-to-capability grant/revoke's before/after diff for every real role holder, reusing loadGroupRightsSources/evaluateGroupRights via a new evaluateGroupRightsWithHypotheticalGrant variant scoped to exactly one (role, action) pair; GET /admin/role-capabilities/:roleCode/:actionCode/impact-preview mirrors GrantCapability/RevokeCapability's exact platform-admin gate. Closes CAP-09's backend engine.
- [Phase 138]: 138-08: GuidedRevokeFlow/GuidedGrantFlow each detect their own 'Abweichung entfernen' reversion mode from state.user_deny/state.user_allow; UserGroupRightsTab wires all three locked business-verb actions plus an inline CapabilityHistoryPanel (D-13b) into the row-expansion area, refreshing on every confirmed mutation while the flow's own modal independently stays open showing the real activation_status (CAP-10/D-21). CAP-08 fully wired end to end; UADM-01's editing half is complete.
- [Phase 138]: 138-09: RoleAssignmentImpactModal closes D-22's role-assignment half; reused the existing, already-live updateFansubAppMemberRole mutation instead of adding a duplicate setFansubGroupMemberRole function to api.ts (Task 1's stated gap was factually incorrect -- FansubAppMembersSection.tsx and RoleAssignmentAfterClaim.tsx already call this exact PUT .../roles endpoint). Confirmed the endpoint's real semantics are additive/removable multi-role via {role, enabled}, not a single-active-role replace.
- [Phase 138]: [Phase 138] 138-10: /admin/claims ships as a real top-level route (page.tsx wraps ClaimsClient in PlatformAdminGate); useClaimsListFilters mirrors useUserListFilters.ts's exact URL-synced/stable-useMemo shape. Gruppe/Benutzer filters use plain numeric ID Input fields (onBlur-committed), not a search-select, since listClaims's params contract only specifies IDs and other central admin lists (Aenderungen) already use plain numeric benutzer/gruppe/akteur IDs. Aktion column intentionally omitted (no dead button) -- Plan 138-14 wires in the real verify/activate actions. D-32 responsive collapse reuses RoleCapabilityClient.tsx's exact useIsMobile/759px matchMedia breakpoint (Table on desktop, Card rows below 760px).
- [Phase 138]: 138-11: translateChangeEntry (frontend/src/app/admin/changes/ChangeEntryTranslator.ts) is the single centralized German audit-sentence translator; role_capability.granted/revoked and effective_rights.override.mutated both honestly omit Vorher/Nachher since their real Go audit payloads carry no resolved before/after snapshot (R-07). /admin/changes ships as a Card variant="flat" per-entry list (D-32) with only user_group_capability_override/user_group_capability_override_history/effective_rights/app_user target_types rendered as Benutzer-navigation links.
- [Phase 138]: 138-12: /admin/roles top-level route ships D-07's role-holders view; Benutzer/Gruppe cells navigate via useRouter().push (ClaimsClient.tsx pattern), status badge reuses UserDetailPageClient.tsx's statusVariant/statusLabel verbatim, and 'letzte Aktivitaet' renders '-' since RoleHolderEntry does not carry that field yet.
- [Phase 138]: 138-13: RoleCapabilityImpactPreviewModal self-fetches getRoleCapabilityImpactPreview + listRoleHolders (not passed as a prop) since RoleCapabilityClient.tsx, unlike RolesClient.tsx (Plan 138-12), does not already hold a loaded holder list -- matches Task 2's literal action text over the interfaces block's prop-passing suggestion.
- [Phase 138]: 138-13: preview items are joined to role holders by array INDEX (backend iteration order), not a target_user_id map, since the wire DTO carries no group id and a multi-group-membership holder produces multiple same-target_user_id items.
- [Phase 138]: 138-13: RoleCapabilityClient.tsx's handleGrant/handleRevoke/capabilityError/isMutating were deleted rather than left dead -- all capability mutation now lives inside RoleCapabilityImpactPreviewModal, closing CAP-09's direct-mutate D-18 violation found this session.
- [Phase 138-14]: PreviewClaimActivationImpact reuses ResolveGroupRights (before) + loadGroupRightsSources/evaluateGroupRights (after), overriding ActiveMembership/Roles only -- zero second decision engine; PreviewActivatableRoles is a zero-write twin of ActivateClaimedMember's steps 1-2; VerifyClaim/RejectClaim never fetch or fabricate a rights diff, closing D-24 in the central Claims workspace.
- [Phase 138]: 138-15 (D-01..D-05/D-25/D-30): AdminMainNav is the one persistent D-01 admin nav (Button-row + shared admin/layout.tsx, since Tabs has no Link-based nav mode); AdminUsersClient reduced to D-04's exact 9-field column set; UserDetailPageClient rewritten from a 9-item Accordion to D-03's real 6-tab structure with ?tab= URL sync, requiring Tabs (@/components/ui) to gain optional controlled activeId/onActiveIdChange + keepMountedIds (backward compatible with its 4 pre-existing consumers) to preserve lazy-load-once without a refetch-on-reopen regression; UserOverviewTab's D-05-violating bare stat-tile grid replaced with a compact per-group summary. UserGroupMembershipsTab.tsx left in place, unimported/orphaned, rather than deleted.
- [Phase 138]: 138-16 closed D-06's Gruppenansicht: GroupRolesTab regroups already-fetched listFansubAppMembers client-side by role (no new backend endpoint); GroupChangesTab reuses listChanges (real filter param is gruppe, not fansub_group_id as the plan sketched) plus 138-11's translateChangeEntry; FansubAppMembersOverview.tsx (the plan named a non-existent GroupMembersTable.tsx) gained a Rechteabweichungen indicator and user navigation; a platform-admin-gated Claims link-out replaces a second claims editor per D-09/D-34.
- [Phase Quick 260823-wrz]: UAT-138-G fixed: EmptyState gained a real chrome-free variant="inline" (single <p>, no icon/card); UserGlobalRolesTab.tsx dropped its standalone 'Aktive Rollen' SectionHeader block; GroupSection.tsx dropped its <Card> wrapper for a plain <section> (data-group-section preserved). New height to first real rights row estimated ~519px (engineering estimate, not live-measured) - above the 400px soft target but all three named causes are fully closed; UAT-138-A grid-template-columns fix confirmed untouched; live UAT spot-check at 1280x900 recommended as follow-up.
- [Phase 138]: 138-17: GAP-01 formatRelativeDate clamps its ms diff to >= 0 before computing days, so a last_activity_at at or after Date.now() (clock skew or exact-now) always resolves to 'Heute'; GAP-03's WR-01 branch order (isNonDeniable && !isRemoveMode) was already correct in production code -- a new 7th regression test pins non_deniable+user_deny reaching the confirm step, closing 138-VERIFICATION.md's sole human_needed gap with automated coverage, no production code change needed.
- [Phase 138]: 138-18 closed GAP-02: RoleCapabilityImpactPreviewModal's metrics row column-stacks (.metricsRow, <=759px) so all 5 D-19 metrics stay visible, per-user vorher/nachher/Grund renders as a Card list below 759px (mirrors RoleHoldersTable.tsx's useIsMobile()/matchMedia precedent, D-32), and a new opt-in Modal panelClassName prop lets only this modal override the shared mobile 100dvh height rule (.narrowHeightFix, doubled-selector specificity) -- ui.module.css and all 30 other <Modal> call sites remain byte-unchanged. Phase 138 (18/18 plans) is now complete.
- [Phase Quick 260824-ike]: Task 1's handler unit test used fansub_lead/founder instead of the plan's co_leader/encoder example pair because the internal/handlers package's shared TestMain catalog stub predates migration 0112's assignable=true promotion of co_leader; verified the real running app's DB-loaded catalog has co_leader assignable=true with fansub_group context, so production behavior matches the plan's intent -- pure test-selection fix, zero production logic change.
- [Phase 139]: 139-01: Phase-139 DTOs (AdminUserContributionsPage/AdminUserMediaPage/AdminUserRightsSummaryPage) added additively to admin_users.go alongside untouched existing AdminUserContributionsResult/AdminUserMediaResult/AdminContributionItem/AdminMediaItemSummary; testsupport.OpenPhase139Postgres(t) applies the full real 151-pair migration chain (not hand-assembled stand-in tables) inside an isolated per-test schema. — Fixed two dormant bugs this exposed: migrations 0057/0071 hardcoded public.-qualified references (only 2 of 151 pairs, now schema-portable via current_schemas(false)), and a genuine import cycle from testsupport now importing migrations (resolved by moving 14 internal migrations-package test files to the external migrations_test package, mechanical rename, go test FAIL count unchanged at 65).
- [Phase 139]: 139-02: New Phase-139 TS DTOs (AdminUserContributionsPage/AdminUserMediaPage/AdminUserRightsSummaryPage) verified field-for-field against 139-01's Go structs; two new URL-synced filter hooks (useUserContributionsFilters/useUserMediaFilters) mirror useClaimsListFilters.ts exactly, only_deviations encoded as '1'/absent per the has_conflicts convention. Zero file overlap with sibling plan 139-01.
- [Phase 139]: 139-03: ListUserContributions is fully rewritten to return server-side grouped/paginated AdminUserContributionsPage (anime+project grouping, sort_index range-collapse, semantic override-diff never trusting release_crew_snapshots.snapshot_mode alone); fixed a real ARRAY_AGG(array_col)[1]-typed-as-scalar cardinality(text) SQL bug found via the 9-test D02-D10 integration suite, corrected to MIN() aggregates over the invariant per-range-group role arrays.
- [Phase 139]: 139-04: GetUserMedia is fully rewritten to return server-side grouped/paginated AdminUserMediaPage (anime+project+release/episode grouping, real PublicURL/FileSizeBytes derivation via a ported buildRVMPublicURL convention + media_files join); AdminUsersRepository's constructor now threads cfg.MediaStorageDir (mirrors NewFansubRepository/NewMediaRepository), requiring 4 call-site updates outside the plan's stated file list.
- [Phase 139]: Plan 139-05: GroupRightsSourcesInput.Roles is []string (role codes) not []Action as the plan text stated; AuthzRepository implements the three new batch-resolver interfaces (membership/overrides/review-grant) via a new authz_permissions_batch.go file, not by growing the already-over-450-line authz_permissions.go.
- [Phase 139]: Plan 139-06: pinned constant query-budget gates (contributions=3, media=2, rights-summary=5) against a real disposable Postgres fixture, and closed F-03's live-UAT gap with a real, idempotent seed script producing independent-identical and independent-different release_crew_snapshots rows in team4s_v2 (0 to 2 independent rows).
- [Phase 139]: Plan 139-07 closed both F-01 rights fan-out locations -- UserGroupRightsTab.tsx now lazily fetches exactly one group's rights on selection (D22, bounded selector, deep-link/auto-select preserved), and UserOverviewTab.tsx calls the new batched rights-summary endpoint exactly once instead of 1+N. api.ts wired to 139-03/139-04/139-05's paginated backend shapes; unplanned but required Rule-3 fix: UserContributionsTab.tsx/UserMediaTab.tsx (owned by 139-08/139-09) had to be minimally adapted to the new grouped shapes since the api.ts signature change otherwise broke npm run build -- explicitly a disposable placeholder, not a locked contract, since the full UI-SPEC rewrite remains those plans' scope.
- [Phase 139]: 139-08: UserContributionsTab.tsx rewritten as grouped-card projection (UI-SPEC-locked); a thin file-local URL-reset wrapper deletes only the seven filter-owned query keys instead of calling each per-field setter in sequence (stale-closure race) or blanket-clearing the pathname (would drop ?tab=); rewrote pre-existing role-catalog test fixtures to use real hex color_key/icon_key values, closing a genuine Phase-136 fixture bug rather than reproducing it.
- [Phase 139]: 139-09 closed UADM-05: UserMediaTab.tsx fully rewritten as the grouped release/episode-block projection (Card variant=nestedFlat, ResponsiveImage lazy thumbnails, five server-side filters via useUserMediaFilters), deleting hasScopePermission() and groupByReleaseVersion() outright with no replacement. — ResponsiveImage is imported from its real @/components/ui/ResponsiveImage module path (not the barrel index, which does not re-export it), matching every other production consumer in the codebase; mediaTab.module.css mirrors 139-08's container-query convention exactly plus the 96px->64px thumbnail breakpoint.
- [Phase 139]: 139-10 closed the phase with a full backend+frontend regression triage against the confirmed 139-RESEARCH.md baseline (zero Phase-139 regressions, 139-VALIDATION.md's Per-Task Verification Map fully filled in, nyquist_compliant: true) and human-verified live UAT (all six checks PASSED, see 139-HUMAN-UAT.md). The check-4 (Rights-tab lazy fetch) live verification carries a documented residual scope note -- the D1sk test account has only one group membership so lazy-vs-eager-of-one-group cannot be visually distinguished; the multi-group property is separately proven by 139-07's UserGroupRightsTab.test.tsx/UserOverviewTab.test.tsx regression tests -- this is a scope note, not a failed or skipped check. Phase 139 (10/10 plans) is complete; all of UADM-02 through UADM-08 and QUAL-06 are fully verified.
- [Phase 141-01]: ResolveReviewGroupAuthorization replicates CanReviewForFansubGroup's guard chain exactly (including the ReviewContextResolver verified-membership gate) rather than substituting ResolveGroupRights' looser ActiveMembership signal, preventing an elevation-of-privilege regression.
- [Phase 141-01]: review_service.go's own Decide authorization call is left untouched per 141-CONTEXT.md D11; only the handler-layer read path was consolidated onto the new single-resolution entry point.
- [Phase 141]: 141-02: A nil ActorMemberIDs slice encodes as SQL NULL via pgx and must be normalized to an empty slice before binding, or the self-exclusion clause silently excludes every row instead of no-op'ing for unset call sites.
- [Phase 141]: 141-02: The view=own D10 capability bypass lives entirely in the handler (queueOptions), never the repository -- releaseReviewQueuePredicates always honors whatever AllowedKinds it is given literally.
- [Phase 141]: Next's internal r.List(...) call must thread ActorAppUserID/ActorMemberIDs, not just check the current item's identity, so the resolved 'next' item itself is guaranteed excluded from the actor's own submissions — D05 requires the resolved next item to never be the actor's own submission; the pre-existing code only checked the current item, letting an adjacent own-item leak through as next
- [Phase 141]: useReleaseReviewLane's loadMore is a synchronous void function wrapping its async body in an internal IIFE, matching UseReleaseReviewLaneResult's documented () => void contract
- [Phase 141]: reload() re-exposes loadInitial for the retry button and future re-derive-after-decision use (D08), backing later plans without new fetch logic
- [Phase 141]: OwnPendingReviewsSection renders 5 always-visible table columns (no desktop/tablet duplicate-column split), keeping colSpan=5 unambiguous and matching the plan's literal 5-column requirement.
- [Phase 141]: ?lane= URL param uses short values queue/own (per 141-UI-SPEC's locked contract) while Tabs item ids stay queue/own-pending; readLane()/setLane() map between the two.
- [Phase 141]: PruefungenTabs's URL-sync effect rebuilds the querystring from scratch (tab + optional lane only) rather than merging into live searchParams, avoiding a render loop from a fresh-identity searchParams dependency.
- [Phase 141-06]: SectionHeader description locked copy mixes „ opening guillemet with ASCII closing quote; used single-quote JSX attribute delimiters instead of escaping or paraphrasing the locked string. — Preserves the verbatim locked copy while staying syntactically valid JSX.
- [Phase 141-06]: Typ FormField gating uses allowed_types.length > 1 (not === 0) as the omission predicate, per plan's exact rule that a single-entry allowed_types must also omit the whole FormField. — A one-option dropdown would still leak which single kind the actor can review via its shape.
- [Phase 141]: Plan 141-07: NextReviewControl shares post-decision/standalone Next states so the 'Next' affordance never silently disappears; 403 loads render a distinct locked ErrorState instead of the generic 404/network message — Closes RQUE-02/D04 and RQUE-05/D05 without new 409 branching, since the backend already maps both already-decided and not-pending outcomes to REVIEW_ALREADY_DECIDED
- [Phase 143]: Plan 143-01: Split app_auth_group_members.go into two files (app_auth_group_members.go + app_auth_group_member_roles.go) instead of the plan's mandated single file — The plan's own exact function assignment for that bucket produces ~500 lines, exceeding the 450-line CLAUDE.md cap the plan itself sets as an acceptance criterion. No identifier renamed; zero behavior change.
- [Phase 143]: Plan 143-02: SubmitClaimInput moved alongside SubmitClaim into member_claims_submit_repository.go rather than staying behind, since it is used nowhere else in production code except as SubmitClaim's own parameter type — Same-package visibility means the one external caller (handlers/member_claims_handler.go, referencing repository.SubmitClaimInput) is unaffected by which file in the repository package declares the type
- [Phase 143]: Split anime_contributions_proposal_repository.go and member_profile_projects_repository.go by responsibility (pure relocation, zero SQL/logic change) — Completes the Phase 143 450-line-cap remediation for the two files not covered by the dashboard/claims plans; fixed 3 pre-existing source-inspection tests broken by the file move
- [Phase 143]: Plan 143-04: kept the plan's literal workspaceHelpers.ts import list verbatim (incl. AdjacentReleases), accepting a harmless ESLint no-unused-vars warning rather than pruning it — AdjacentReleases is only referenced transitively inside NavigationState's type in workspaceHelpers.ts, not directly in page.tsx; ESLint still exits 0 (warning, not error), so no auto-fix was required
- [Phase 143]: Plan 05: PublicMemberBadge.next_tier enum stays [bronze, silver, gold, platinum] in openapi.yaml (already correct); stale test assertions were updated instead of the contract. — The contract side was already correct; only the test was stale.
- [Phase 143]: Plan 05: fixed 5 of 17 Kriterium-1 red frontend test files via RoleCatalogProvider mocks plus 6 chained phase-142 test-drift fixes (stale visibility default, renamed DatePicker label, missing api mock exports, missing form fixture field) that surfaced only once the provider crash stopped masking them. — Each secondary fix was verified via git show/git log -p to be genuine phase-142 app-code drift, not unrelated pre-existing defects; full unscoped test run confirms zero regressions against CONTEXT.md's documented 17-file inventory.
- [Phase 143]: 143-06: added roleCatalog.ts's categoryForRole(rows, code) as the dedicated semantic-category data-role-code helper, decoupled from presentationForRole()'s bounded-hex-swatch contract (Phase 136-30); migrated ContributionCard.tsx/ProjectMemberReleaseCard.tsx/ProjectMemberHero.tsx (undocumented sixth call site, same regression)/me-projects-group-page.tsx/MemberCurrentProjectsSection.tsx to it, and reverted roleColorCode (roleColors.ts) and roleLabelForCode (useGroupMembersTab.ts) to their git-proven pre-regression label-lookup implementations -- FANSUB_GROUP_ROLE_OPTIONS no longer exists (removed in fa98ce8d, Phase 136-08), so roleColorCode's label->code map was rebuilt as a local Map instead of an import.
- [Phase ?]: [Phase 143, 2026-09-01]: 143-07 closed Kriterium 1's last 6 red frontend test files. MemberBadgeChain.tsx itself needed zero production changes -- members/[slug]/page.test.tsx's missing Rollenfortschritt heading was a stale RoleCatalogProvider mock fixture (catalogRoles lacked a 'timer' entry despite the profile fixture earning role_entry_timer), tripping Phase 136 CR-02's intentional catalog-trust gate as designed; MemberBadgeChain.test.tsx's other 4 failures were pre-existing Phase-119-era test debt (file unchanged since 2026-08-20, before Phase 142's commit range) superseded by currently-passing Phase 125/126/127 tests, corrected to match adopted behavior.
- [Phase ?]: [Phase 143, 2026-09-01]: 143-07 narrowed next.config.mjs images.localPatterns from a blanket /media/** wildcard to /media/anime/**, /media/profile/**, /media/release-version/** -- the three namespaces a repo-wide grep of backend PublicURL construction proved real; no /media/group/** namespace exists (group logos route through the already-allow-listed /api/v1/media/image proxy) and /media/admin/** is deliberately never allow-listed (T-143-07-01). Full unscoped npx vitest run at 0 unexpected red files (288 files / 2146 tests) closes CONTEXT.md Kriterium 1 across the whole 143-05/06/07 wave.
- [Phase 143]: Plan 143-08 executed: migration 0159 supersedes 0154's role_capabilities reset pattern (unconditional DELETE, no-op down.sql) with an idempotent (ON CONFLICT DO NOTHING) up.sql and a techadmin-preserving down.sql; new ephemeral-DB test forces a real second execution of 0159's raw SQL by deleting only its own schema_migrations tracking row (a bare second Runner.Up() call is always a no-op regardless of SQL content) and proves the 12 migration-0153 techadmin rows survive Down(ctx, 1).
- [Phase 143]: 143-09 executed (Criterion 3): PendingGroupMediaReviewAttention/PendingReleaseReviewAttention moved into ReleaseReviewQueryRepository reusing the existing OwnDashboardPendingGroupMediaReview/OwnDashboardPendingReleaseReview row types; dashboard_me_handler.go has zero inline h.db.Query SQL left; group-media review now gates on permissions.ActionReviewImageDecide (was the too-broad ActionFansubGroupEdit); both moved handler loops are per-group memoized. — This is the explicit prerequisite ROADMAP Criterion 7 (rejected-note dashboard lane) depends on -- no later plan may add a new h.db.Query call to dashboard_me_handler.go. release_review_query_repository.go was split (scan/URL helpers + SQL constants moved to release_review_query_scan_helpers.go) to stay under CLAUDE.md's 450-line cap after the two new methods.
- [Phase 143]: Plan 143-10 executed: first-ever tests for ReleaseMetadataCreditService.AwardIfCompleted (documenting that its ambiguous rv.id/rev.id lookup can silently credit the wrong release version on a real ID collision) and for UpdateAnimeFansubProjectTimeline's end-before-completed-release date rule; fixed the stale /project-timeline route string in the one pre-existing handler test. — Closes ROADMAP Success Criterion 4 (untested new logic). No code change to release_metadata_credit_service.go was made -- the query's ambiguity is documented in the test and SUMMARY per VALIDATION.md's explicit test-only phase scoping, left for a future phase/quick-task to decide whether to fix.
- [Phase 143]: 143-11 fixed has_own_notes to exclude rejected release_version_notes via a LEFT JOIN to release_version_note_review_lifecycle (review_state IS NULL OR <> 'rejected'); no tombstoned special-casing needed since deleted_at IS NULL already excludes tombstoned notes. testsupport.OpenPhase139Postgres's full migration chain was found unusable for this test (migration 0152 hardcodes public.unaccent, unresolvable inside the harness's isolated non-public per-test schema) -- used testsupport.OpenPhase107Postgres + hand-assembled schema instead, matching release_review_query_repository_test.go's precedent.
- [Phase 143]: 143-12's Task 3 checkpoint (2026-09-01, Option A user decision): no-restricted-syntax's base severity is 'error' with a new LEGACY_NO_RESTRICTED_SYNTAX_FILES frozen, explicit, shrink-only exemption list in frontend/eslint.config.mjs (264 violations, 67 files measured 2026-09-01, not the ~17 the plan's stale premise assumed) -- migration of remaining files tracked at .planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md. ESLint's --rule CLI flag cannot validate scoped overrides (bypasses files-scoped config); use plain 'npx eslint .' for verification going forward.
- [Phase 143]: 143-13 closed Criterion-7's backend half -- ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention is the inverse of the review-queue self-exclusion predicate (explicitly returns the actor's own rejected release-version notes); OwnDashboardData.PendingOwnNoteRevisions groups the flat rows by anime+fansub-group via a single linear pass relying on the query's own ORDER BY; dashboard_me_handler.go stays at zero raw h.db.Query calls.
- [Phase 143]: Phase 143 Plan 14 executed: rejected own release notes now render as a fifth Attention-lane in AttentionSection.tsx, grouped per anime-project + fansub-group, closing Criterion-7 end to end (backend half shipped in 143-13).
- [Phase 143]: Plan 143-15 closed UAT-03/UAT-04: noteRevisionListSingle append-only CSS override reduces single-item rejected-notes card spacing without touching multi-item rendering — All 6 raw hex color fallbacks (var(--color-primary, #2f5fe3)/var(--text-soft, #6b6b70), 4 pre-existing + 2 from plan 143-14) removed from AttentionSection.module.css in favor of bare design tokens, per CLAUDE.md's token-only convention
- [Phase 143]: Plan 143-16 patched detail.status client-side via setDetail's functional updater inside submitDecision's success branch (using the decision parameter, not response.data.decision), closing UAT-01's stale header status Badge without adding a refetch that would re-hide the just-shown decision message and NextReviewControl success actions.
- [Phase 143]: Plan 143-17 closed UAT-02's backend/contract half: has_own_rejected_notes uses an INNER JOIN (not LEFT JOIN like has_own_notes) to release_version_note_review_lifecycle, since a rejected state can only be represented when a lifecycle row exists.
- [Phase 143]: 143-18 executed: needsRework = !releaseDone && has_own_rejected_notes gates only Badge variant/text and button prominence; isDone()/counters/filters stay byte-identical (Kriterium 5 locked). Reused Badge variant=danger for consistency with AttentionSection.tsx's rejected-notes semantics. — UAT-02 is now fully closed (backend half in 143-17, frontend half here); Phase 143 (last plan 4 of 4) is complete.
- [Phase 143]: 143-19 closed UAT-05: has_own_media's EXISTS subquery now excludes rejected media via a LEFT JOIN to release_version_media_review_lifecycle (mirroring has_own_notes); a new has_own_rejected_media boolean (INNER JOIN) flows through openapi.yaml/contributions.ts; page.tsx's hasOwnArtifacts/needsRework unify has_own_rejected_notes and has_own_rejected_media via a single OR so either or both rejected-artifact types render exactly one 'Überarbeitung nötig' badge, never a precedence puzzle.
- [Phase 144]: [Phase 144, Plan 01]: PatchReleaseVersionMedia's category hard-block is removed; category is now validated via parseRVMCategoryPatchField (new sibling file admin_content_release_version_media_category.go, keeps the 1148-line handler file at 1146) and persisted via ReleaseVersionMediaPatchInput.Category; rvmCategoryAllowsPreview checks the effective post-patch category so a category change cannot bypass PREVIEW_NOT_ALLOWED_FOR_CATEGORY.
- [Phase 144]: 144-02 executed (Zielbild 1, Zielbild 4, Points invariant) -- new backend/internal/repository/release_version_media_replace_repository.go gives *MediaRepository.ReplaceReleaseVersionMediaFile (swaps media_asset_id under FOR UPDATE, never touches the row's own id) and .EnqueueReleaseVersionMediaFileDeleteJob (mirrors scrubExpiredReleaseReviewMedia's INSERT into release_review_file_delete_jobs, ON CONFLICT (media_file_id) DO NOTHING). Neither method reimplements the revision-bump/pending-reset -- callers compose both with the existing ReleaseReviewLifecycleRepository.SubmitMedia, proven by 4 real-Postgres tests (identity preservation, exact +1 revision, pending reset, safe double-enqueue, zero point_ledger_entries rows, unchanged archivist badge count against a non-trivial control row). Test fixture lives in package repository (not services) specifically to reach the unexported MemberProfileRepository.loadContribArchivistCount. Resolves CONTEXT.md's 'Alte Datei behalten oder verwerfen?' as verwerfen (discard via the existing outbox), matching 144-PATTERNS.md.
- [Phase 144]: 144-03 executed (Zielbild 3, backend half): ReleaseReviewDetail.PriorRejection is populated via a LEFT JOIN LATERAL against review_decisions/review_reason_texts/members scoped by exact source_type/source_key match and source_revision - 1; OpenAPI and frontend types mirror it field-for-field. — Fixture rows needing extra data must be inserted test-locally, not appended to the shared openReleaseReviewQueryFixture, since a pending row added there silently inflates other tests' List/Counts pending-row-count assertions.
- [Phase 144]: Plan 144-04 executed (Zielbild 1 HTTP surface): PUT /admin/release-versions/:versionId/media/:relationId/file composes 144-02's ReplaceReleaseVersionMediaFile/EnqueueReleaseVersionMediaFileDeleteJob repository methods with the existing SubmitMedia lifecycle call inside one transaction. — Permission reuse (ActionReleaseVersionMediaUpdate + canMutateReleaseVersionMediaRelation) proven by source-inspection test, no new permission action introduced. Preview-candidate guard reordered ahead of file I/O (vs the plan's literal step numbering) to avoid orphaned-file cleanup on an unrelated-to-the-file rejection.
- [Phase 144]: [Phase 144] Plan 144-05 executed: added replaceReleaseVersionMediaFile() (PUT client for 144-04's replace-file endpoint) and RELEASE_REVIEW_REJECTION_CATEGORY_LABELS/releaseReviewResubmissionBadge() to releaseReviewPresentation.ts, giving Wave-5 plans (144-06, 144-07) one shared API/label surface instead of inventing duplicates. No UI changes in this plan.
- [Phase 144]: Plan 144-06 executed (Zielbild 1/2, UI-SPEC file-replace contract) -- useReleaseVersionMedia.ts gained replaceItem/replaceError mirroring patchItem's revision-binding shape (buildReplaceMediaFileRequest extracted to helpers.tsx to stay under the 450-line cap); new ReleaseVersionMediaReplaceControls.tsx hosts the category Select (global primitives only); the file-replace drop-zone's native input stays inline in ReleaseVersionMediaSection.tsx per the ESLint LEGACY_NO_RESTRICTED_SYNTAX_FILES ratchet, since a brand-new file can never join that exemption. The primary submit button now reflects three UI-SPEC states and is disabled for a rejected item until a real change is staged, closing the no-op-resubmit gap. 20/20 tests pass in the touched test file, full suite 289/289 files green, tsc clean, 0 new eslint violation categories.
- [Phase 144]: [Phase 144, 2026-09-02]: Plan 144-07 executed — resolvePriorRejectionContextLine() in releaseReviewPresentation.ts owns own-rejection vs other-reviewer resubmission copy branching (no rejection_category label interpolated, per UI-SPEC's locked Copywriting Contract); page.tsx's badge+context-line JSX uses single-line ternaries to stay at exactly 450 lines, the CLAUDE.md cap. Closes Phase 144's Zielbild 3 frontend half; all 4 Zielbild goals now have both backend and frontend halves shipped across the phase's 7 plans.
- [Phase 144-08]: rvmPreviewGuardBlocked falls back to the row's real current is_preview_candidate only when the request omits the field; an explicit request value (true or false) always wins — Closes 144-VERIFICATION.md's omitted-field guard bypass without making the guard stricter than an explicit request
- [Phase 145]: group_member pseudo-role uses sort_order -10 (below the live minimum of 0) so it sorts first under Gruppenrollen, per 145-UI-SPEC.md's Interaction Contract — Locked UI ordering requirement for Phase 145
- [Phase 145]: validateMembershipBaselineRegistryPresence is a distinct check from validateCapabilityCatalog because the 3 baseline actions are already granted to other roles -- the existing catalog-wide check cannot detect the pseudo-role's own rows being absent — Closes Success Criterion 6 fail-closed gap validateCapabilityCatalog alone cannot catch
- [Phase 145]: LoadCapabilityRoles is intentionally left untouched -- its contexts-only predicate already correctly includes the reserved pseudo-role for capability-matrix editing; only LoadFansubGroupRoles needed the NOT reserved guard — Keeps the pseudo-role capability-editable while excluding it from the assignable catalog (Success Criterion 5)
- [Phase 145]: 145-02: OpenPhase145Postgres's post-migration stand-in replicates only the exact columns/rows real migrations 0109/0146 contribute (fansub_group_media.view/.upload action rows, role_definitions.color_key/icon_key, action_definitions.description_de/help_text_de/user_overridable) rather than replaying those migrations' full SQL, which would pull in unrelated production tables.
- [Phase 145]: 145-02: found and fixed a Plan-145-01 regression -- validateMembershipBaselineRegistryPresence's fail-closed gate broke 5 independent local permissions.CacheLoader test stubs across internal/handlers/internal/services/internal/repository that Plan 145-01 did not update; full go test ./... now shows zero group_member-related failures.
- [Phase 145]: Plan 145-03 executed (SC-3, SC-5) -- roleKindLabel/RolesClient/RoleCapabilityDetail/RoleDetailPanel now present the reserved group_member pseudo-role as a normal, editable role: correctly labeled and first in Gruppenrollen, defaulting to Standardrechte with no holder fetch, its 3 baseline actions editable through the unmodified accordion/Switch machinery, and every other role deep-links to it via a new Button. holderCountText() bug-fix prevents a stale holder count from leaking into the pseudo-role's subject header.
- [Phase 146]: MembershipBaselineActionCodes lives directly above validateMembershipBaselineRegistryPresence in permissions.go, matching Plan 146-03's later admin_capability_handler.go guards contract
- [Phase 146]: permissions.go's pre-existing 928-line size stays out of scope for this additive plan, carried forward as debt
- [Phase 146]: RoleCapabilityDetail.tsx's configurableActions filter now scopes the reserved pseudo-role's rendered rows to exactly its 3 intended membershipBaselineCodes actions (D-15), fixing a defect where all 38 catalog actions rendered unfiltered; the 3 rows carry a non-color-only Badge/Lock/aria-describedby protected-state contract (Criterion 2) while staying fully interactive per 146-UI-SPEC.md's attempt-then-reject interaction shape.
- [Phase 146]: Plan 146-03: membership-baseline mutation guards reuse one error.code (membership_baseline_guard) for both grant and revoke, and the test-fixture LoadCapabilityRoles now includes group_member so guards are actually reachable in tests
- [Phase 146]: 146-04 lockte die 20-Datei-Definition 'sicherheitsrelevant' (D-08, SecurityRelevantTestFiles) und sanierte die ersten 3 der 20 gesperrten Testdateien (role_catalog_router_integration_test.go, role_catalog_repository_test.go, role_definitions_context_test.go) von os.ReadFile+strings.Contains-Quelltext-Substring-Behauptungen auf echte httptest/Postgres-Ausfuehrung.
- [Phase 146]: Plan 05 reused testsupport.OpenPhase137Postgres for ResolvePendingRolesToActive's real-Postgres proof (member_claims + hist_fansub_group_members + fansub_group_member_roles + role_definitions already assembled there); picked already-migrated production role codes (founder/translator, techadmin/translator) as the eligible/ineligible catalog pair instead of inventing synthetic fixture rows.
- [Phase 146]: member_archive_repository_test.go and member_point_totals_repository_test.go's 'uses canonical stored slug' claims are now proven via real Postgres SearchMembers/ListRanking calls against a seeded nickname-divergent member row instead of grepping the repository's own SQL text; the sanctioned static-authority absence loops stay unchanged (D-10).
- [Phase 146]: Reused phase136LinkResolver + a repository.DBTX-implementing captured-args fake DB to prove the fansub alias group-edit guard's real 403 and exact audit event, since FansubHandler.auditLogRepo is a concrete type not an interface
- [Phase 146]: 146-08: fansubNotesRepo/mediaRepo are concrete repository types, not interfaces -- real schema-isolated Postgres fixtures replaced os.ReadFile/strings.Contains source-substring proofs in 3 Block-2 handler test files (fansub notes, theme assets, RVM file-replace) instead of the plan's assumed fake-repo pattern. — themeRepo/permissionSvc/projectNoteCreditSvc are interfaces and were faked as planned; fansubNotesRepo and mediaRepo cannot be, so real Postgres was used per CLAUDE.md Teststil's closest-analog precedent already established by dashboard_me_handler_test.go.
- [Phase 146]: dashboard_me_handler_test.go's 4 source-substring functions now prove D-08 IDOR resistance and D-09 graceful-empty-state via real httptest + real-Postgres calls against the already-established testsupport.OpenPhase107Postgres fixture, closing Criteria 5/6 for this file. — Plan 146-09, CLAUDE.md Teststil rule
- [Phase 146-10]: Proved public_member_access_matrix_test.go's Vary/resolver/route claims by wiring real-interface fakes into the real AppPublicProfileHandler/ProjectMemberPublicHandler behind the real middleware.CommentAuthOptionalMiddlewareWithState constructor, instead of source-substring grep.
- [Phase 146]: [Plan 146-11]: repository<->services/handlers import cycle blocks real handler/service execution from internal package-repository test files; use an external repository_test package file in the same directory as the sanctioned workaround (still discovered by go test ./internal/repository/...).
- [Phase 146]: [Plan 146-11]: openReleaseVersionMediaReplaceFixture (shared test fixture) extended with caption/sort_order on release_version_media, path/status on media_files, and BIGSERIAL id -- pre-existing schema gaps only surfaced because this plan first exercised ListReleaseVersionMedia/UpdateMediaFileStatusRVMTx/CreateReleaseVersionMediaAsset against it.
- [Phase ?]: 146-12: All 17 os.ReadFile-based functions in admin_content_release_version_media_test.go remediated via real httptest calls against a new shared Postgres fixture (openRVMExecFixture); platform-admin identity used for ALLOW-path proofs and a genuine no-membership outsider identity for DENY-path proofs, avoiding permissions.loadedCache's fail-closed test-env constraint per 146-11's documented precedent.
- [Phase 146]: Plan 146-13 (final plan) closed Criteria 6/7/8 -- a go-test-executed ratchet guard (backend/internal/testquality/source_substring_guard_test.go) locks the post-remediation state at 34/53 remaining source-substring test files, zero of the 20 locked security-relevant files among them; the 34-file remainder is named and reasoned per-file in 146-SUBSTRING-TEST-REMAINDER.md, including a carried-forward IsHistoricalMemberRoleCode open item from 145-REVIEW.md WR-01. Phase 146 (Block 1 registry-selbstschutz + Block 2 testsanierung) is now complete.
- [Phase 147]: role_code Go field is a plain non-pointer string mirroring RoleLabel's COALESCE(..., '') non-null contract at all three public-note query sites; only the OpenAPI schema marks it non-required.
- [Phase 147-03]: useGroupMembersTab.ts's roleSummary now resolves labels via labelForRole(historyRoleOptions, code), converging onto the catalog path GroupMembersTab.tsx already used for GroupHistRoleDialog/GroupMembersHistTable/GroupMemberFormModals. — Closes HC-02; the removed ROLE_LABELS map had 5 codes never present in role_definitions and no karaoke_fx entry.
- [Phase 147]: models.AppGlobalRoles ist die einzige exportierte Go-Quelle der drei globalen App-Rollen; alle vier bisherigen Literal-Kopien (admin_capability_handler.go, admin_users_handler.go, admin_users_repository.go, admin_users_mutations_handler.go) leiten jetzt daraus ab, gesichert durch einen Source-Contract-Test gegen Migration 0072s CHECK-Constraint.
- [Phase 147]: HC-09 closed -- RoleTranslator/RoleTypesetter/RoleTechadmin/RoleGfxler removed from permissions.go; four package-internal test fixtures now use raw string literals; remaining role-constant block carries a non-authoritative clarifying comment (role_definitions remains sole catalog).
- [Phase 147]: data-role-code now renders raw role_definitions.code values for techadmin/gfxler directly (no longer remapped to 'admin'/'designer' as roleColorCode's old label-driven map did) — Explicit, tested Phase 147 contract closing HC-01, not a regression
- [Phase 148]: presentationForRole only returns full neutral when the role itself is missing from the catalog; an unrecognized icon_key alone falls back to iconKey 'user' while colorKey still resolves via boundedColorKey()
- [Phase 148]: data-role-code carries the raw fallback value for a role unmatched in the catalog (e.g. 'future_role'), not a synthesized category string, since there is no real role_definitions.code to report
- [Phase 148]: ContributionCard's role Badge adopts the shared .role-catalog-chip 14%-mix formula per the UI-SPEC Restoration Rule exception (it previously had no color formula at all)
- [Phase 148]: [Plan 02] --role-accent is derived in globals.css via two new rules (:root default + [data-color-key] rule) placed after the existing neutral seam line; PublicNoteCard/ProjectMemberPage/ProjectMemberReleasesSection now read var(--role-accent) with zero dead --role-accent-default fallback, formulas byte-for-byte unchanged.
- [Phase 148]: [Plan 02] roleCatalog.accessibility.test.ts extended to prove real WCAG contrast (regex-extracted percentages, never hand-copied) for every restored role-accent formula across the phase; discovered several locked, pre-existing ratios (PublicNoteCard .head/.role, the three role-chip border formulas, all 5 RoleBadgeCard.stages/MemberBadgeChain border mixes, plus a few single-hex misses) fail their WCAG threshold - each is asserted via its exact measured failing-hex set rather than silently forced to pass, generalizing UI-SPEC's FansubEdit-specific failure-reporting rule; needs a follow-up remediation decision, tracked in deferred-items.md.
- [Phase 148]: [Phase 148, Plan 05] The shared Phase-117 Postgres test harness lacked a color_key column on its stub role_definitions table; added color_key TEXT NOT NULL DEFAULT 'other' directly to the stub, mirroring phase145_postgres.go's already-established minimal-stand-in-for-migration-0146 precedent.
- [Phase 148]: HC-09 audit correction: 'zero references repo-wide' claim replaced with 'zero production references'; qualified-grep counting-method gap explained; Phase 147's prior remediation confirmed as already resolving the underlying finding
- [Phase 148]: The role-progress badge card (RoleBadgeCard.module.css/MemberBadgeChain.tsx) now derives --role-accent via data-color-key from the same catalog seam every other restored surface uses; test fixture uses catalog_hex_role instead of fansub_lead to avoid colliding with an unrelated existing negative assertion, and the neutral-fallback proof targets timer's unmatched color_key rather than a catalog-absent role code, since the latter is structurally unreachable through MemberBadgeChain's render path.
- [Phase 148]: [Phase 148, Plan 04] FansubAppMembersOverview.tsx's third broken color mapping (getRoleClassName/colorClassMap, category-name-keyed) removed; role badges now use ROLE_CATALOG_CHIP_CLASS + data-color-key, matching the working admin precedent. — Closes the plan's objective; the map always fell through to fansubEditRoleDefault since presentationForRole().colorKey stopped returning category strings.
- [Phase 148]: [Phase 148, Plan 04] FansubEdit.module.css's role-toggle no longer self-assigns --role-accent from the dead --role-accent-default token; --role-accent now resolves via the [data-color-key] seam FansubAppMemberEditorPanel.tsx already sets. — Single-source-swap restoration per the Restoration Rule; every other declaration in the toggle rule stays byte-for-byte unchanged.
- [Phase 149]: Plan 149-01: used sed with explicit line-number anchors for CSS token renames to avoid corrupting the fallback-protected var(--color-surface, #f9f9f9) occurrences sharing the same base token name
- [Phase 149]: Plan 149-02: sed mit exakten Zeilenankern für alle CSS-Ersetzungen verwendet, um sicherzustellen, dass nur die im Plan zitierten Zeilen geändert werden — GroupMediaReviewSection.module.css enthielt bereits eine vorbestehende, korrekte var(--surface-card-muted)-Verwendung (Zeile 361), die denselben Zielnamen wie die 5 zu behebenden Zeilen teilt
- [Phase 149]: Phase 149, 2026-09-06: --radius at RoleCapabilityDetail.tsx resolves to --radius-sm (6px) per 149-UI-SPEC.md's sibling-alert-box comparison, overriding ROADMAP's tentative --radius-md guess.
- [Phase 149]: [Phase 149-04]: PublicNoteCard .head band mix lowered from 55% to 45% (role-accent), closing the .role text WCAG AA 4.5:1 contrast gap for all 15 ROLE_COLOR_KEYS while .role's 38% text mix stays unchanged -- the one deliberate exception to Phase 148's frozen Restoration Rule.
- [Phase 149-05]: Guard test's nested var() fallback detection uses two explicit regex alternatives (nested-shape tried first, plain/literal-fallback second) instead of one generic non-greedy fallback capture, which cannot correctly balance one level of nested var() parens — a single '.+?' capture stops at the first upcoming close-paren, which for a nested var() fallback is the inner call's own closing paren, one character too early. Guard-test self-referential-scan hygiene established: exclude the guard test's own fixture file by basename, avoid literal var(--x) syntax in the scanner's own comments, and use a documented, size-locked allow-list for pre-existing locked-file false positives (e.g. roleCatalog.accessibility.test.ts:284, out of 149-UI-SPEC.md's editable scope).
- [Phase 150]: Phase 150-01: member 'type' (id 5, type@team4s.de) used for both before-evidence captures instead of sheppert/csubs-leader, which no longer exist in this environment's database. — type has real non-trivial activity (points, role_volume, all three contribution families) and is already the plan's public-profile ground-truth member.
- [Phase 150]: Phase 150-01: evidence baseline files force-added past the .planning/**/evidence/** .gitignore rule. — These are point-in-time 'before' snapshots Plan 150-06's Live-UAT must diff against after production code changes land -- unlike other generated evidence artifacts, this snapshot cannot be regenerated later.
- [Phase 150]: OwnDashboardRoleVolumeEntry gained current_threshold as a companion addition for Plan 150-05's role-volume badge label ('Bronze · 12+'); PublicMemberBadgeProgress.stages (Plan 150-03) cannot supply it since it lives on a different response than /me/dashboard.
- [Phase 150]: member_profile_dashboard_repository.go's contribFamilyAscendingThresholds/contribFamilyTierFuncs maps removed (150-02); Test-DB fixture drift (nickname/public_slug NOT NULL, duplicate member_claims table, missing PMDA-06 media_assets join) in member_profile_contribution_badges_repository_test.go was pre-existing and unrelated to this plan, fixed since the file was in-scope and its own verify command required these tests green.
- [Phase 150]: 150-04: role_entry_<code> now sourced exclusively by loadRoleVolumeBadges (D-10 fix); dedicated single-use Postgres fixture used since point_ledger_entries' append-only guard is incompatible with the shared openPhase129Postgres DELETE-reset
- [Phase 150]: Fixed two pre-existing role_volume Postgres boundary tests that had never actually run against a real DSN (nil award/reversal entry IDs violated chk_release_role_credit_lifecycle_shape) — 150-03 Task 1
- [Phase 150]: loadBadgeProgress role_volume integration tests use a new openBadgeProgressPostgres fixture extending 150-02's schema-isolated openContributionBadgesPostgres, not openPhase129Postgres (unsafe for point_ledger_entries per 150-04's finding) — 150-03 Task 2
- [Phase 150]: 150-05: resolveRoleVolumePresentation now returns bare tier label; buildRoleVolumeRow reconstructs the suffixed string from server current_threshold (D-29). resolveMemberBadgeFamilies/resolveRoleProgressPresentation read badge_progress[].stages instead of FAMILY_DEFINITIONS/ROLE_PROGRESS_STAGES (D-24/D-25).
- [Phase 150]: 150-05: Tasks 1-3's own <verify> commands were mutually interdependent per the plan's own design (Task 1 needs Task 3's label fix; Task 2/3 share files); implemented all three tasks' code together and split git history into 3 commits by final file ownership instead of forcing artificial per-task isolation.
- [Phase 150-07]: GET /me/badges gains registry-derived current_threshold; AchievementBadgesCard.tsx reconstructs role-volume label from it (D-30 seventh site closed). — Field is currently always null in production -- no writer persists role_volume_-prefixed badge codes into member_badges; closes the contract gap defensively per D-30's no-exception instruction.
- [Phase 152]: Plan 152-01 unblocks the Next.js image optimizer for /history-event-badges-transparent/** via a single additive images.localPatterns entry — Hard precondition for Plan 152-07's AchievementArtwork migration of FansubHistorySection (D09) — next/image on an unmatched path throws E426 and crashes the page
- [Phase 152]: Fixed the Tiptap link-mark drift (D1) on the frontend (StarterKit link: false) rather than adding link to the backend allowlist — Backend was already correct per the interface contract; group-history/story rich text does not support links as a product decision
- [Phase 152]: Sanitizer hardening (D2): span/td/th class attribute constrained to ^color-token-[a-z]+$ and h1 removed from AllowElements — Closes an open path for arbitrary class values and prevents rich text from authoring a second h1 alongside the page's group-name h1
- [Phase 152]: getPublicGroupBase/attachPublicReleaseVersionsCount added as new additive private FansubRepository methods rather than modifying GetGroupBySlug/hydrateFansubGroup, preserving those functions byte-for-byte for their other callers (fansub_groups.go, fansub_merge.go, app_auth_invitations.go).
- [Phase 152]: listProjectionContributors left defined-but-uncalled after removing its call from GetFansubGroupDomainProjection (D02 additive-only scope lock); response JSON still defaults contributors to [].
- [Phase 152]: FansubGroupMediaBlock.test.tsx already existed from Phase 99 (contrary to plan's description of it as new) — updated in place rather than recreated — Preserved all 6 pre-existing tests and fixed the 2 that queried getByAltText(title), which broke once the inner image became alt=""
- [Phase 152]: 152-05: Hero banner/logo swapped from unoptimized next/image to ResponsiveImage after live-verifying logo_url/banner_url shape against next.config.mjs's existing remotePattern
- [Phase 152]: 152-05: buildInitials's divergence from getMemberInitials is documented via German code comment, not consolidated (C3), since consolidation would visibly change the Hero's fallback avatar rendering and needs explicit sign-off
- [Phase 152]: 152-05: FansubProjectBannerCard.tsx (E3) left unchanged -- sizes/lazy already adequate, and live banner_url is a dynamic Jellyfin-proxy endpoint, not a static file, matching the user's 'schwierig' carve-out
- [Phase 152]: Domain-projection load uses a plain try/catch (not Promise.allSettled) with an explicit empty-projection fallback, matching RESEARCH.md's C5 example
- [Phase 152]: Fixed mocked ApiError constructor arg order (status, message) in page.test.tsx to match the real @/lib/api.ApiError signature, surfaced while writing the new 404-branch composition test
- [Phase ?]: [Phase 152, 2026-09-08]: History-badge geometry fixed at AchievementArtwork's 240px hero step everywhere (grid track + min-height), no family-specific breakpoint logic reintroduced for group-history badges.
- [Phase ?]: [Phase 152, 2026-09-08]: projects_500/releases_10000 legendary glow collapsed into one shared .historyTimelineEmphasisLegendary token-driven treatment; the two-palette-to-one visual delta is intentional, flagged for Visual QA sign-off.
- [Phase 152]: Pinned public-profile query budget at measured 8 (not plan-estimated 7) after tracing ListGroupLinks's extra fansubGroupExists round-trip
- [Phase 152]: Split 152-08 Task 1/2 into two atomic commits despite both targeting the same test file, by writing intermediate Task-1-only content first
- [Phase 152]: Plan 152-09's full regression gate confirms zero new backend/frontend failures across all of Waves 1-2 — the 49 repository + 6 migrations backend failures and 2 frontend test files are exact repeats of already-documented pre-existing baseline items (deferred-items.md), not new regressions.
- [Phase 152]: P152-06 image-delivery evidence measured live: History badges -95% to -97% (raw PNG to WebP via next/image), Hero logo/banner -96% to -98%. WebP figures require an explicit Accept: image/webp header on curl — bare curl falls back to unreduced image/png.
- [Phase 152]: Plan 152-09 seeded a temporary 7-row fansub_group_history fixture (IDs 2-8, group new-subs) for Plan 152-10's visual QA — covers all 3 categories and both legendary-emphasis badges; Plan 152-10 must delete rows 2-8 only (not the pre-existing row 1) after its screenshot pass.
- [Phase 152]: Task 2's checkpoint sign-off was backed by an independent Playwright DOM-geometry re-measurement of every [data-achievement-slot] across all 8 viewports, not visual review alone.
- [Phase 152]: Public-profile query budget is pinned at 8 (not the originally planned 7) because ListGroupLinks issues an internal fansubGroupExists existence-check round-trip; domain-projection is pinned at 2. Recorded as the phase-closing binding value for 152-VERIFICATION.md.
- [Phase 153]: Plan 153-01 removed the native sizes="auto," prefix from AchievementArtwork.tsx (RCA-01's sole confirmed source); both lazy and priority achievement images now use the deterministic HERO_SIZES/STAGE_SIZES strings. Live retention audits at 12 and 50 SPA navigation cycles confirm bounded, non-linear growth vs the original 466->15,107 node / 347->1,100 listener defect (post-fix: 1187->1434 nodes / 634->818 listeners at 12 cycles; 1187->1548 nodes / 634->1350 listeners at 50 cycles).
- [Phase 153]: 153-02: RichTextRenderer split out of editor/index.ts barrel (B3, locked); four renderer-only consumers (MemberStorySection, MemberGroupsHistorySection, PublicNoteCard, AnimeProjectNotesSection) and three dual-symbol consumers (ProfileStoryCard, AnimeProjectNoteWorkspace, NotesTab.helpers) now import it directly from '@/components/editor/RichTextRenderer'; barrel keeps only RichTextEditor/ColorTokenExtension/COLOR_TOKENS. — Converts a future accidental barrel-wide RichTextRenderer import from a silent runtime bundle-size regression into a compile-time TypeScript error; combined with Plan 03 this is what the audit measured as 1.653 MB / 26.1% public JS transfer savings.
- [Phase ?]: [Phase 153-03]: not-found.tsx is marked 'use client' and wraps OwnHiddenProfilePreview in next/dynamic({ ssr: false }) — the segment already renders exclusively a client component, so no server-rendered content is lost; closes the second half of RCA-02.
- [Phase ?]: [Phase 153-03]: next/dynamic's ssr:false resolved cleanly under this project's Vitest + Testing Library + jsdom setup with zero mocking shim required, establishing this repo's first verified next/dynamic code-split loading-boundary pattern.
- [Phase 153]: 153-04: MemberCurrentProjectsSection's empty-state early return branches on totalCount === 0 (props-level structural signal), not visibleProjects.length === 0; the initial-mount skeleton overlay is deleted entirely, leaving the pagination continuation fetch as the only legitimate loading substate (RCA-03).
- [Phase 153]: Plan 05 removed LatestContributionsSection's and PreviousContributionsSection's skeletonLayer overlays (RCA-03), reusing Plan 04's fix shape for sibling consistency (UI-SPEC §6); both components' zero-content early returns are unchanged and interactionEnabled still gates only interactive affordances.
- [Phase 153]: Plan 153-06: MemberBadgeChain's locked/gesperrte badge ladder content and element count (kara: 606 DOM elements) stay deliberately unchanged; only carouselSkeleton visibility timing was fixed. — Binding Auftraggeber decision quoted in the plan objective: the RCA-03 defect is a visibility-timing problem, not a content-scope problem.
- [Phase 153]: Plan 153-06: MemberBadgeChain.test.tsx's auto-prefixed sizes-string assertions were already corrected by Plan 01 as a Rule-1 side-effect before this plan started. — Verified via grep (zero 'auto, ' matches) before editing rather than trusting the plan's cited line numbers, per binding run-context instruction; only the skeleton-presence assertions needed updating.
- [Phase 153]: Plan 07: Tasks 1 (publicImportGraph regression guard + full green gate: 295/296 files, 2263/2266 tests, tsc clean, lint 13 errors/331 warnings matching D5, docker compose build exit 0) and 2 (153-AFTER.md before/after audit with real measured RCA-01/02/03 numbers, REPORT.md verified byte-unchanged) are complete and committed (eb20fc76, 7f29897a). — Task 3 (checkpoint:human-verify, gate=blocking, live sanity check of /members/timer and /members/kara over the SSH tunnel) is NOT yet performed -- it requires the actual user's live browser confirmation and cannot be self-approved by an executor agent; Plan 153-07 is intentionally left incomplete pending that human checkpoint
- [Phase 154]: Hoisted the four raw-count loaders (role-volume, contribution-projects/chronicle/archivist) to run exactly once per GetPublicMemberProfileByID request; GetOwnDashboard's independent calls to the same loaders are untouched. — RCA-05/P154-01..04 removed a documented duplicate-query pattern; regression-guard constant lowered 20->16, empirically re-measured against pre-change code on the same fixture DB.
- [Phase 154]: 154-02: Followed sibling currentCode gate pattern verbatim for AnimeProjectAchievementStage hero; left Badge chip variant untouched per plan's explicit hero-artwork-slot-only scope
- [Phase ?]: 154-03: ResponsiveImage optimizer-error fallback removed the unoptimized-original escape hatch entirely (no smaller same-origin derivative exists, and the audit-blocked /_next/image route fails identically on retry) -- measured 13.8MB->4.8MB for timer under AUDIT_FAIL_BADGES=1.
- [Phase ?]: 154-03: MemberProfileHero animated-avatar detection extended to WebP via a client-side RIFF/ANIM byte-range probe, folded into the SAME existing unoptimized branch GIFs use -- documented as NOT reducing transferred bytes (confirmed both optimizer route and raw original return the identical 411,828 bytes for timer's avatar), since no backend derivative service exists in scope.
- [Phase 154]: New GET /members/:slug/viewer endpoint reuses resolvePublicMemberAccess verbatim, no new resolver seam; PMFE-10 guard extracted into one shared deriveViewerStatus<T> used by both useMemberViewer and the new useMemberViewerAccess hook — Closes RCA-08 without duplicating the fail-closed viewer guard or the access resolver
- [Phase 154-05]: RCA-07 (empty React-root commits) is closed -- leading changed=0 commits dropped from 1,664 (timer) / 257 (kara) to 0 in two independent re-runs after Phase 153's graph reduction; no further investigation warranted
- [Phase 154-05]: Phase-153 listener remainder (~14-15/cycle) is unchanged after Phase 154 Wave 1 (14.24/cycle vs 14.3/cycle baseline); no second listener source found -- zero addEventListener matches across all 8 files touched by Plans 154-01..04 -- documented negative outcome for D2
- [Phase 154]: 154-06: full verification gate green; resolved two genuine 154-03-introduced regressions (test-boundary allowlist gap, lint-warning delta) via git-log-traced E4 checks instead of mislabeling pre-existing; 154-AFTER.md documents before/after numbers, RCA-04 stays open
- [Phase 154]: P154-15/E6 closed with precise, non-blanket operator confirmation: owner-view of a temporarily-toggled hidden profile (d1sk) confirmed correct; dataset held zero private profiles beforehand, requiring an ad-hoc toggle-and-revert; edit-link visibility not separately confirmed and is not claimed as verified.
- [Phase 155]: FansubHandler.projectResolverRepo is typed as a narrow fansubProjectResolverRepo interface (not the concrete repository pointer) so httptest fakes can execute ResolveFansubProject directly — Satisfies CLAUDE.md Teststil (must actually run the checked code); WithProjectResolverRepo's public signature is unchanged
- [Phase 155]: Reused Plan-155-01's DSN-gated team4s_phase155_test Postgres scaffold for the release-count parity test instead of group_repository_test.go's perpetually-skipping setupTestRepo helper
- [Phase ?]: [Phase 155, Plan 03] GetProjectContributors constant-query-budget (2) locked in by a real Postgres test at 30-50 contributor scale; no repository SQL change made per CONTEXT.md's negative-finding allowance
- [Phase 155, Plan 04]: ReleasesSection's dead episodes prop/gate removed (data.hasReleases in ProjectPage.tsx is now sole authority) rather than fed a placeholder empty array, which would have silently hidden the required Neuestes-Fansub-Release block.
- [Phase 155, Plan 04]: HeroSection.tsx intentionally left unwired to releaseVersionCount/GroupEpisodeAssets in this plan (still receives releaseEpisodes=[]) per the plan's explicit instruction; documented as a Known Stub for Plan 155-05 to resolve.
- [Phase 155-05]: Task 3 (ReleasesSection.tsx episodes->hasReleases rewrite) reconciled as an already-satisfied no-op: Plan 155-04 already removed ReleasesSection's episodes prop entirely and moved gating to ProjectPage.tsx's outer data.hasReleases ternary, making a new inner hasReleases prop redundant duplication.
- [Phase 155]: fansubProjectNavigation.ts's projects input narrowed to FansubProjectNavigationEntry[]; PublicFansubProject structurally satisfies it, so the numeric legacy route needed zero changes
- [Phase 155]: Release-detail's mismatched-slug test mocks a 404 rejection, not a wrong-anime_slug resolution, matching the resolver's real WHERE groupSlug AND animeSlug SQL contract
- [Phase 155]: Closed the phase-crossing REQUIREMENTS.md gap flagged by five of the six prior 155-0X plans by adding a Phase 155 additive-scope section (all 15 P155-* requirements) as the phase's closing plan, mirroring Phase 152's format. — Five of six prior plan SUMMARY.md files explicitly deferred this to the phase-level verifier/closeout rather than inventing a section format mid-phase; the closing plan is the correct place to resolve it once all evidence exists.
- [Phase 156]: 156-01: origin_release_version_id uses ON DELETE SET NULL (not CASCADE) -- origin is correctable, never destructive
- [Phase 156]: 156-01: SegmentCreditRoleCodes lives in backend/internal/permissions, not repository/handler/frontend -- single central definition
- [Phase 156]: AssignThemeSegmentToEpisodeRange ist jetzt eine Soll-Ist-Synchronisation (insert-missing/delete-excess), nicht mehr additiv — Bereichsverkuerzung muss veraltete Zuweisungen entfernen koennen; der Guard gegen unvollstaendige Bereiche bleibt verbatim und hat einen eigenen dedizierten Postgres-Test
- [Phase 156]: Reverse-direction auto-assign hooked directly into upsertReleaseVersionGroup's existing per-group loop (Plan 156-03); episode/version resolved once per release version, byte-identical join fragments reused from theme_segment_assignments.go
- [Phase 156]: Split attachReleaseTimelineSegments into group_repository_cursor_timeline.go (CLAUDE.md 450-line cap); is_karaoke now derives from CanonicalSegmentType output instead of a second SQL LIKE heuristic.
- [Phase 156]: 156-04: SetThemeSegmentOrigin checks segment existence before assignment membership — A non-existent segment can never have a theme_segment_assignments row (FK-enforced); checking membership first would always yield ErrConflict, making ErrNotFound unreachable
- [Phase 156]: 156-05: loadPublicEffectiveContributors tests stay unit-level (no new Postgres harness) — Function had zero DB-gated tests before this plan and the plan's own verify step only requires go build/go vet; the SQL change is exercised indirectly by existing production consumers
- [Phase 156]: 156-07: Release detail page stops suppressing already-visible segments (supersedes Phase 117 D-02 for the release-detail surface only) -- documented in DECISIONS.md 2026-09-11
- [Phase 156]: 156-07: Segment credits now project dynamically from each segment's ORIGIN release version's current contributors, filtered by permissions.SegmentCreditRoleCodes -- replacing the strings.Contains(label, kara) heuristic
- [Phase 156]: ThemeTimeline.tsx split into a new sibling ThemeTimelineSegmentDetails.tsx; own OP/ED/INSERT/KARA classification (TYPE_LABELS/TYPE_STYLE_KEYS) deleted in favor of rendering backend-canonical segment.type via a small presentational CSS-class/label lookup — P156-15 requires the frontend to stop holding its own type world; keeps both files under the 450-line cap
- [Phase 156]: Segment participants with a member_slug now render as a Link to the project-context member route via buildPublicFansubProjectMemberPath's suffix shape ('/mitwirkende/'), the first production consumer of that Phase-155 helper — P156-14: segment-related member clicks land on the project member route instead of plain text
- [Phase ?]: Constant-query-budget test for loadReleaseSegments opens a second traced pgxpool.Pool on the same schema as testsupport.OpenPhase117Postgres rather than modifying the shared fixture — Keeps the diff scoped to test files only, no risk to 12+ other tests sharing the fixture
- [Phase ?]: hasAnySegmentRelevantRole (Plan 156-07) already existed as a directly-testable unexported function — No extraction needed for the table-driven role-filter unit test; calls real production logic
- [Phase ?]: idx_theme_segments_origin_release_version index-plan evidence recorded honestly: live team4s_v2 theme_segments has only 3 rows, Postgres naturally chooses Seq Scan; SET enable_seqscan=off proves the index is well-formed via Index Only Scan — Both plans recorded, not just the favorable one, per no-speculation-index constraint
- [Phase 156]: 156-10: Phase 156 wird als funktional/automatisiert abgeschlossen behandelt, NICHT als vollstaendig abgenommen -- Plan 156-11 Task 2s Live-UAT (Admin-Segment-Origin-Select) bleibt offen, siehe deferred-items.md
- [Phase 157]: P157-01: countEpisodes hoists projectMemberUserIDsCTE to a single leading WITH above both UNION branches (note + media), reusing countNotes/countMedia predicates verbatim -- no parallel business-logic path.
- [Phase 157]: P157-01: New episodes-count integration test lives in its own package-repository file, kept separate from the legacy os.ReadFile+strings.Contains-style project_member_public_repository_test.go.
- [Phase 157]: Plan 04 keeps the icon-import alias convention (Image as ImageIcon) established in PublicReleaseBlock.tsx; grid-column breakpoints for the media gallery left unchanged, deferred to Live-UAT (157-06)
- [Phase 157]: EmptyState gained additive icon/className props (nullish-coalescing fallback keeps all 77 existing call sites byte-identical); Releases 0-count now reuses EmptyState (compact, Package icon, dashed .releasesEmpty override) instead of a bespoke box.
- [Phase 157]: 157-02: Beitragszusammenfassung als ein Text-Knoten (kein Bold/Regular-Split), damit exakte screen.getByText-Assertions gegen den ganzen Satz halten; lucide-react LucideIcon-Typ statt handgerolltem ComponentType<{size}> fuer die Statistikleisten-Icons.
- [Phase 157]: P157-13 Nachtrag 2 (mixed-role list) proven via a dedicated regression test in ProjectMemberNotesSection.test.tsx: distinct data-color-key per note's own role_color_key, both role-name chips, no large role header
- [Phase ?]: Plan 157-10: CSS-only stretched-link pattern resolves nested-interactive markup without preventDefault/stopPropagation
- [Phase 156]: ensureThemeSegmentOriginTx is the single central origin-validity rule reused by all three write call sites and migration 0164 — Prevents the GAP-04/GAP-05 root cause (origin only validated at explicit set-time) from recurring at any future write path
- [Phase 156]: Relocated SegmentCreditRoleCodes verbatim into new segment_credit_roles.go (permissions.go 950->933 lines) instead of duplicating it, keeping the segment-relevant role list and its display-label map paired in one file
- [Phase 156]: SegmentRoleLabel is computed inline inside applySegmentOriginCredits's existing filter loop (one call site) instead of a separate pass, keeping the two-condition filter and label derivation co-located
- [Phase 156]: loadContributors (normal release contributor list) deliberately never calls SegmentCreditLabelForRoles, proven by a dedicated Postgres test asserting SegmentRoleLabel stays the Go zero value on every entry
- [Phase 157]: 157-11: Kept 200%-zoom overflow check scoped to shot-projectmember.mjs only — gap-closure operator constraint restricted changes to one file; trimmed comments to land at the 450-line cap instead of extracting a helper module
- [Phase 157-12]: shot-projectmember.mjs kept at 449 lines by compacting the new sectionHeaderUnderlines diagnostic + collapsing two unrelated pre-existing multi-line evaluate() calls into one-liners
- [Phase 157-12]: Dropped aria-labelledby + local heading id on the notes/media sections in favor of aria-label, since SectionHeader has no id/className prop and no test referenced the removed ids
- [Phase 157]: Per-entry timeline line colored via var(--role-accent) (Entscheid 2026-09-14 zu V4) — Replaces the single shared neutral-gray line; each entry now owns its own colored line segment reaching to the next entry's dot, using the same data-color-key seam the dot already used
- [Phase 157]: 157-14: Routed the new hero jump-metric interaction through the global Button primitive (variant="text") per CLAUDE.md's Frontend-UI rule — Extends Button/HeroMetrics additively instead of bypassing them for a shape mismatch; all 6 other HeroMetrics call sites and Button's 6 existing variants stay byte-identical
- [Phase 157]: 157-14: 'Folgen' stays plain, non-interactive text in the hero — It has no matching page section, so it is intentionally not wired to scrollToSection
- [Phase ?]: 157-15: Matched .sectionHeaderCounter's line-height to .sectionTitle's (1.15) to fix a live ~2.8px vertical misalignment against the section header heading
- [Phase ?]: 157-15: Live focus-ring verification waits 200ms after a real Tab keypress before reading getComputedStyle to avoid a mid-CSS-transition box-shadow read
- [Phase ?]: Phase 157 P157-02/P157-04/P157-09 sind durch Nutzerentscheid ersetzt/entfallen, nicht stillschweigend erfuellt
- [Phase ?]: DECISIONS.md 2026-09-14 Eintrag ist auch die erste durable Aufzeichnung der 2026-09-13 Releases-Sektion-Entfernung (zuvor nur zitiert, nie geschrieben)
- [Phase ?]: GAP-07 preselection composed via ensureThemeSegmentOriginAndContributorsTx, keeping ensureThemeSegmentOriginTx byte-identical
- [Phase ?]: testsupport/phase117_postgres.go gained one ADD COLUMN IF NOT EXISTS line (Rule 3) to avoid breaking every Phase-117 test after the five call-site swaps
- [Phase ?]: GAP-08: SegmentContributorsField-Gate auf origin_release_version_id != null verengt (isSharedSegment-Bedingung entfernt)
- [Phase ?]: 156-22: pure text-only edits (GAP-09 editor hint + Karaoke-Typesetting fixture), no UI-SPEC gate per explicit run instruction

### Pending Todos

- Eleven pending todo files include the future project-wide member media gallery; it is explicitly outside Phase 142.
- The public-member params/UI todo spans contract and visual work and must be reconsidered during Phase 130 and Phase 133 planning rather than tagged misleadingly to one phase.

### Blockers/Concerns

- No blocker prevents discussion or planning of Phase 128.
- Existing staged/unstaged frontend work and untracked recovery evidence belong to the user and must remain untouched.
- Health warnings for repository-local `DECISIONS.md` and `RETROSPECTIVE.md` conflict with local Team4s documentation policy and are not deletion candidates.
- Before any migration, inspect the current migration chain and stop if multiple untracked migrations exist.
- internal/handlers package tests: ~20 tests across ~10 files (admin_content_anime_project_notes_test.go and siblings) depend on permissions.roleAllows/RoleAllowsAction but never call permissions.Service.LoadCache, so they always observe a nil cache and deny/return false regardless of real role_capabilities data. Pre-existing, verified not caused by Phase 137; see .planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260819-ipu | Duplikat-Guard beim historischen Mitglied hinzufuegen (Phase-135-Nachtrag, Findings #27/#28) | 2026-08-19 | df1033bf | [260819-ipu-duplikat-guard-beim-historischen-mitglie](./quick/260819-ipu-duplikat-guard-beim-historischen-mitglie/) |
| 260819-lm5 | Phase-117-Nachtrag: geteilte Karaoke-Segmente ueber Folgen zuweisen + Per-Folge-Startzeit-Verschiebung im UI erreichbar machen, inkl. Bereich-Auto-Zuweisung + Korrektheits-Fix am Pro-Folge-"verschoben"-Marker (5 Live-UAT-Runden, siehe 117-10-POST-HOC-CLOSURE.md) | 2026-08-19 | 4c30cb7c | [260819-lm5-phase-117-geteilte-karaoke-segmente-uebe](./quick/260819-lm5-phase-117-geteilte-karaoke-segmente-uebe/) |
| 260820-600 | Phase-117-Nachtrag: Folgen-Navigation im Contributor-Editor (Segment-Pillen-Pager Vorherige/Naechste Folge, aktiver Tab bleibt per ?tab= erhalten), inkl. Redesign Variante A -> Variante B nach Live-UAT-Feedback vor Freigabe | 2026-08-20 | 7f5815b4 | [260820-600-folgen-navigation-im-contributor-editor-](./quick/260820-600-folgen-navigation-im-contributor-editor-/) |
| 260823-j4n | Phase-137-Nachtrag: GAP-06 abschliessen - Contribution Roles bleiben override-blind (Fall B), Dokumentation in permissions.go, 137-CONTEXT.md, 137-UAT.md, 137-12-SUMMARY.md und DECISIONS.md aktualisiert, keine Verhaltensaenderung | 2026-08-23 | cba0de3e | [260823-j4n-gap-06-dokumentation-contribution-roles-](./quick/260823-j4n-gap-06-dokumentation-contribution-roles-/) |
| 260823-mt8 | Fix PlatformAdminGate: children unmount on token refresh | 2026-08-23 | 37859778 | [260823-mt8-fix-platformadmingate-children-unmount-o](./quick/260823-mt8-fix-platformadmingate-children-unmount-o/) |
| 260823-s7v | Split UserGroupRightsTab.tsx (716 -> 269 Zeilen) in 5 Geschwisterdateien - reine Struktur-Refaktorierung ohne Verhaltensaenderung, 450-Zeilen-Limit aus CLAUDE.md eingehalten | 2026-08-23 | 7039195b | [260823-s7v-split-frontend-src-app-admin-users-tabs-](./quick/260823-s7v-split-frontend-src-app-admin-users-tabs-/) |
| 260823-u1j | Fix UAT-138-A horizontaler Seitenueberlauf (394px, Rollen & Rechte-Tab): grid-template-columns: minmax(0, 1fr) auf .card/.tabs in ui.module.css ergaenzt, damit implizite Grid-Spalte nicht mehr auf Breite eines breiten Kind-Elements (Rechte-Tabelle) waechst | 2026-08-23 | dc4f5726 | [260823-u1j-fix-uat-138-a-horizontaler-seitenueberla](./quick/260823-u1j-fix-uat-138-a-horizontaler-seitenueberla/) |
| 260823-ucl | Nachtrag UAT-138-A: verbleibender Seitenueberlauf (394px) durch .accordionRoot in ui.module.css - gleiche implizite Grid-Track-Falle wie .card, grid-template-columns: minmax(0, 1fr) ergaenzt; alle uebrigen display:grid-Regeln erneut evidenzbasiert auditiert | 2026-08-23 | 59f7173f | [260823-ucl-nachtrag-uat-138-a-accordionroot-in-ui-m](./quick/260823-ucl-nachtrag-uat-138-a-accordionroot-in-ui-m/) |
| 260823-w9y | Fix UAT-138-C: rohe technische Codes (Rollencodes, Capability-Actioncodes, "Benutzer #<id>") durch bestehende deutsche Labels aus RoleCapabilityMatrix/app_users.display_name ersetzt - Rechteeditor, Entzug-Dialog, Aenderungen-Uebersetzung, plus additive actor_display_name/target_display_name-Vertragserweiterung fuer GET /admin/changes (D-33) | 2026-08-23 | 66164839 | [260823-w9y-fix-uat-138-c-rohe-technische-codes-in-u](./quick/260823-w9y-fix-uat-138-c-rohe-technische-codes-in-u/) |
| 260823-wrz | Fix UAT-138-G: Informationsdichte im Benutzer-Rechte-Tab - EmptyState bekam echte chrome-freie variant="inline"; UserGlobalRolesTab.tsx verlor den separaten "Aktive Rollen"-Block; GroupSection.tsx verlor die Card-Chrome (jetzt <section>, data-group-section erhalten); neue Hoehe bis zur ersten Rechtezeile auf ~519px geschaetzt (Engineering-Schaetzung, kein Live-Messwert); UAT-138-A-Fix quellcode-bestaetigt unangetastet | 2026-08-23 | e33de150 | [260823-wrz-informationsdichte-im-benutzer-rechte-ta](./quick/260823-wrz-informationsdichte-im-benutzer-rechte-ta/) |
| 260824-ek3 | GAP-04/GAP-05 (138-HUMAN-UAT.md): Rollen und Capabilities zu einem Rollen-Arbeitsbereich unter /admin/roles zusammengefuehrt (Sketch 005, Nutzerentscheidung) - RoleRail.tsx (vollflaechig klickbare, registry-getriebene Liste, aria-current), RolesClient.tsx/RoleDetailPanel.tsx (Tabs Inhaber/Standardrechte, Deep-Link-Scroll), /admin/role-capabilities als serverseitige Weiterleitung, AdminMainNav/admin-page/resolveRoleLink umgestellt, D-01/D-08-Nachtrag datiert in 138-CONTEXT.md/138-HUMAN-UAT.md dokumentiert | 2026-08-24 | ec512897 | [260824-ek3-rollen-und-capabilities-zu-einem-rollen-](./quick/260824-ek3-rollen-und-capabilities-zu-einem-rollen-/) |
| 260824-ike | Drei Live-Defekte im Rollen-Arbeitsbereich (Nachtrag zu 260824-ek3) behoben: RoleRail.tsx verlor das redundante Pro-Zeile-roleKindLabel-Badge (Ellipse bei 6/18 Namen); neue CountGroupRoleHolders-Bulk-Query + additives group_holder_count-Feld (Go/YAML/TS) beheben den Rail-vs-Detail-Panel-Widerspruch bei Gruppenrollen-Inhaberzahlen; resolveRoleLink()/GroupRolesSection.tsx/RolesClient.tsx/role-capabilities-Weiterleitung wurden um einen optionalen tab-Parameter erweitert, damit "Was darf diese Rolle?" immer den Standardrechte-Tab oeffnet statt des rollenart-abhaengigen Defaults | 2026-08-24 | 787df9f3 | [260824-ike-drei-live-defekte-im-rollen-arbeitsberei](./quick/260824-ike-drei-live-defekte-im-rollen-arbeitsberei/) |
| 260824-nmt | Veraltete Rollen-Fixture in MemberCurrentProjectsSection.test.tsx repariert (Registry-Umstellung Altlast): color_key nutzte erfundene Kategorienamen ('technical'/'creative'/'language') statt echter ROLE_COLOR_KEYS-Hexwerte aus roleCatalog.ts; roleCatalog.ts unveraendert. Befund-Korrektur: von den 6 urspruenglich gemeldeten Testfehlern hatte nur 1 diese Ursache - die uebrigen 5 (MemberBadgeChain.test.tsx x4, MembershipsSection.test.tsx x1) sind unrelated (Badge-Special-Gruppe, CSS-Grid) und bleiben bewusst unangetastet | 2026-08-24 | 848f4bb8 | [260824-nmt-veraltete-rollen-fixtures-in-den-profil-](./quick/260824-nmt-veraltete-rollen-fixtures-in-den-profil-/) |
| 260914-ddc | Profil: Avatar-/Banner-Cropper direkt aus jedem Tab sichtbar; Portal und Fokus-Rückgabe, 81 Tests und 24 Browserfälle grün | 2026-09-14 | 8dc5c8fe | [260914-ddc-profile-image-dialogs](./quick/260914-ddc-profile-image-dialogs/) |
| 260914-dov | Release-Medien: Kategorie öffnet Upload direkt; doppelte Uploadbuttons und leere Card entfernt; 63 Tests und 36 Browserfälle grün | 2026-09-14 | b819698f | [260914-dov-release-category-upload](./quick/260914-dov-release-category-upload/) |
| 260914-dzk | Release-Mehrfachupload: Titel/Text pro Bild, eine Vorschau, gezielter Retry;128 Frontendtests, fokussierte PostgreSQL-/Browserchecks grün; additive Migration0163, Human-UAT offen | 2026-09-14 | 2f2d964f | [260914-dzk-release-media-per-file-metadata](./quick/260914-dzk-release-media-per-file-metadata/) |
| 260914-f3k | Release-Medien: gemeinsame Galerie aller Kategorien mit Kategorie je Bild;93 Tests/36 Browserfälle grün | 2026-09-14 | d86083bd | [260914-f3k-release-media-all-images-gallery](./quick/260914-f3k-release-media-all-images-gallery/) |
| 260914-fc1 | Segment-UAT: unabhängige OP-/ED-Plätze, atomischer Konfliktschutz und tatsächliche Zuordnungen; 76 Backend-/138 Frontendprüfungen, Human-UAT offen | 2026-09-14 | 646433be | [260914-fc1-segment-assignment-slot-conflicts](./quick/260914-fc1-segment-assignment-slot-conflicts/) |
| 260914-gif | Release-Datumsvalidierung und nicht blockierende Folgehinweise; responsive Mediengalerie mit 2/3/4 Spalten; 103 Frontend-/84 Backendprüffälle und 15 Browserfälle bestanden; Altfehler/Human-UAT offen | 2026-09-14 | b62e777e | [260914-gif-release-dates-and-media-gallery](./quick/260914-gif-release-dates-and-media-gallery/)|

| 260825-jc0 | Admin start page navigation cleanup | 2026-08-25 | pending | [260825-jc0-admin-startseite-von-redundanten-benutze](./quick/260825-jc0-admin-startseite-von-redundanten-benutze/) |
| 260825-svs | Regression aus Phase 140 beheben: fehlende getReviewDelegations Export im api-Mock von UserGroupRightsTab.test.tsx nachgeruestet (test-only, keine Verhaltensaenderung) | 2026-08-25 | 6cddcb75 | [260825-svs-regression-aus-phase-140-beheben-fehlend](./quick/260825-svs-regression-aus-phase-140-beheben-fehlend/) |
| 260826-6vu | Phase-140-Nachtrag: drei Testluecken aus 140-VERIFICATION.md geschlossen (AdminReviewDelegationHandler HTTP-Tests, LoadDelegationSnapshot-Repository-Tests, CapabilityDetailRow-Regressionstest fuer die Option-(d)-Grant/Deny-Asymmetrie) - reine Testarbeit, kein Produktionscode geaendert; Re-Verifikation: 0/3 Luecken offen, Status human_needed (ein vorbestehender manueller UX-Check aus 140-VALIDATION.md) | 2026-08-26 | 5545e05d | [260826-6vu-die-drei-testluecken-aus-140-verificatio](./quick/260826-6vu-die-drei-testluecken-aus-140-verificatio/) |
| 260826-k66 | Redundanten "Capabilities"-Nav-Eintrag aus AdminMainNav.tsx entfernt (Phase-138-Nachtrag, Sketch 005 D-01/D-08): /admin/role-capabilities ist seit 2026-08-24 nur noch serverseitige Weiterleitung auf /admin/roles (Standardrechte-Tab), Hauptnav zeigte zwei Eintraege auf dasselbe Ziel; Redirect-Route unangetastet, Test aktualisiert (Abwesenheit statt Anwesenheit) | 2026-08-26 | 615365b2 | [260826-k66-entferne-den-ueberfluessigen-nav-eintrag](./quick/260826-k66-entferne-den-ueberfluessigen-nav-eintrag/) |
| 260826-l5l | Restore-Defekt in f_unaccent behoben (Befund 1, 2026-08-26-keycloak-upgrade-und-voll-reset.md): Migration 0152 qualifiziert Funktionsaufruf+Dictionary mit public., ohne SET search_path (Planner-Inlining bleibt erhalten); reales pg_dump/pg_restore-Roundtrip von team4s_v2 lief mit 0 Fehlern (vorher 89), alle 5 unaccent_trgm-Indizes weiterhin gueltig, kein Rebuild noetig | 2026-08-26 | 7990f19d | [260826-l5l-behebe-den-restore-defekt-in-f-unaccent-](./quick/260826-l5l-behebe-den-restore-defekt-in-f-unaccent-/) |
| 260827-de4 | Visible bulk fansub-group assignment verified; refresh-only episode actions now proceed through the central API refresh seam. | 2026-08-27 | 735d35cd | [260827-de4-visible-bulk-fansub-group-assignment](./quick/260827-de4-visible-bulk-fansub-group-assignment/) |
| 260827-bhp | Additive Bulk-Fansub-Gruppenzuweisung fuer vorhandene Release-Versionen ausgewaehlter Folgen; Folgen ohne Release-Version werden uebersprungen und gemeldet. | 2026-08-27 | d3bd1c2b | [260827-bhp-add-bulk-fansub-group-assignment-for-sel](./quick/260827-bhp-add-bulk-fansub-group-assignment-for-sel/) |

| 260901-historical-role-catalog | Historische Rollen-Auswahl vervollständigt: Technik-Admin, GFX, Karaoke-FX und Administration werden über den zentralen `group_history`-Katalog dokumentiert; reversible Migration und Regressionstests ergänzt. | 2026-09-01 | pending | [260901-historical-role-catalog](./quick/260901-historical-role-catalog/) |
| 260901-jk5 | Hygiene-Nacharbeit zu Phase 142 (mechanisch, keine Verhaltensaenderung): gofmt fuer 15 im Bereich 4891109a..HEAD verdriftete Go-Dateien, zwei React-Compiler set-state-in-effect-Fehler per queueMicrotask entschaerft (FansubEditClient.tsx, EpisodeVersionEditorPage.tsx), Contract-Permission-Korrektur (admin-fansub-anime-project-timeline-update: anime_fansub_project.timeline.update statt fansub_group.notes.write), Leerzeile in admin-fansub-anime-contributions-create entfernt, v1.4-MILESTONE-AUDIT.md korrigiert (11 statt 13 Lint-Fehler, 2 davon aus Commit 0481b671 Phase-142-implicated, vitest-Suite nie am Gate ausgefuehrt - 16 failed Testdateien/58 failed Tests, als Phase-143-Schuld dokumentiert) | 2026-09-01 | 77d767ab | [260901-jk5-hygiene-nacharbeit-zu-phase-142-gofmt-fo](./quick/260901-jk5-hygiene-nacharbeit-zu-phase-142-gofmt-fo/) |
| 260901-la2 | Fix phase136 test repo-root helper and correct stale STATE.md frontmatter: phase136RepositoryRoot in phase136_narrow_role_defaults_enforcement_test.go umbenannt zu phase136BackendRoot, neuer phase136RepoRoot-Helper fuer den Migrations-Read ergaenzt (TestPhase136NarrowRoleDefaultsSeedToHandlerContract war seit Phase 136 dauerhaft rot); STATE.md-Frontmatter und Current-Position/Session-Continuity-Abschnitte auf tatsaechlichen Stand (v1.4: 7/8 Phasen abgeschlossen, Phase 143 ready to plan, 84/84 Plaene) korrigiert | 2026-09-01 | fa023325 | [260901-la2-fix-phase136-test-repo-root-helper-and-c](./quick/260901-la2-fix-phase136-test-repo-root-helper-and-c/) |
| 260903-cjk | RVM-Cleanup-Endlosschleife behoben: HardDeleteRVMAndAsset loeschte nie die release_version_media_review_lifecycle-Zeile vor dem Hard-Delete (Migration-0135-RESTRICT-FK), wodurch der periodische Cleanup seit 2026-09-02 18:55 alle 10 Minuten 83+ mal an Relation 10 scheiterte; DELETE in derselben Transaktion ergaenzt, RED/GREEN-Postgres-Test, notes-Zweig bestaetigt unbetroffen (nur UPDATE, nie DELETE), live gemessen: Relation 10 nach Redeploy in beiden Tabellen count=0, Relation 11 (live UAT) unangetastet | 2026-09-03 | 448a4b02 | [260903-cjk-endlosschleife-im-rvm-cleanup-beheben-li](./quick/260903-cjk-endlosschleife-im-rvm-cleanup-beheben-li/) |
| 260903-czh | has_own_release_work zaehlte abgelehnte eigene Notizen/Medien faelschlich als erledigte Arbeit und warf die Folge aus dem Dashboard-Achtung-Bereich; ListByMemberIDWithProposalFields um denselben lifecycle-bewussten LEFT-JOIN-Filter (review_state <> 'rejected') ergaenzt, den listMemberProjectReleaseVersions bereits korrekt nutzt - 4 neue Postgres-Regressionstests (rejected/pending Notiz, rejected/confirmed Medium), attentionHelpers.ts unangetastet (Frontend-Tests bestaetigt unbetroffen); Live-Messung zeigt has_own_release_work=true fuer app_user 4/Release 48, weil zwischenzeitlich eine zweite, unabhaengige bestaetigte Notiz entstand - Ziel-Bugszenario isoliert nachgewiesen behoben (media-only EXISTS=false), Relation 11 (live UAT) unangetastet | 2026-09-03 | 07a8c88d | [260903-czh-has-own-release-work-abgelehnte-arbeit-d](./quick/260903-czh-has-own-release-work-abgelehnte-arbeit-d/) |
| 260903-dth | Dashboard-Nachtrag zu 260903-czh: has_own_release_work bleibt binaer, wenn NEBEN abgelehnter Arbeit auch bestaetigte Arbeit existiert (Notiz 23 confirmed + Medium 11 rejected), verschwindet die Folge weiterhin aus dem Achtung-Bereich; zwei neue Flags has_own_rejected_notes/has_own_rejected_media (Vorlage aus anime_contributions_member_project_repository.go verbatim uebernommen), TS-Typ ergaenzt, filterAttentionContributions haelt betroffene Beitraege jetzt sichtbar, AttentionSection.tsx zeigt "Überarbeitung nötig"-Badge (echtes ö, @/components/ui Badge, Prioritaet vor "Neu"-Badge) mit Link in die Release-Arbeitsflaeche; 6 neue Backend- + 6 neue Frontend-Regressionstests; live gemessen fuer app_user 4/member 5/Release 48: has_own_release_work=true UND has_own_rejected_media=true gleichzeitig, Relation 11 vorher/nachher byte-identisch unangetastet | 2026-09-03 | 3f4ca6b1 | [260903-dth-dashboard-abgelehnte-arbeit-als-ueberarb](./quick/260903-dth-dashboard-abgelehnte-arbeit-als-ueberarb/) |
| 260903-flw | CR-01 behoben (Altlast aus .planning/notes/2026-09-02-altlasten-cr01-wr02.md, nicht aus Phase 144): runUpload in useReleaseVersionMedia.ts fing Fehler ab ohne weiterzuwerfen, dadurch konnte startUpload nie rejecten und der Erfolgs-Toast "Upload abgeschlossen." lief bei jedem Fehlschlag (hart und bei HTTP-200-mit-status-failed) unconditional; runUpload wirft jetzt weiter (wie patchItem/replaceItem/deleteItem/reorderItems) und liefert ein lokal aufgebautes UploadRunResult { items, allSucceeded }, handleUploadClick zeigt Toast/schliesst Drawer nur noch wenn alle Dateien 'ready' sind, neuer handleRetryClick-Wrapper faengt Retry-Ablehnungen ab (keine unhandled rejection mehr); StrictMode-rein (outcomes als lokale const, keine Ref-Mutation im Updater); 8 neue Tests, volle Suite gemessen: vorher 288/1 failed/2179 Tests, nachher 289/0 failed/2187 Tests (genau +8); CR-01 im Altlasten-Dokument als behoben markiert, WR-02 dort unangetastet | 2026-09-03 | d52675a1 | [260903-flw-cr-01-fehlgeschlagene-uploads-duerfen-ni](./quick/260903-flw-cr-01-fehlgeschlagene-uploads-duerfen-ni/) |
| 260903-gf0 | Teststil-Konvention dokumentiert (nur Doku, keine Testdatei/kein Produktionscode angefasst): neuer Abschnitt "### Teststil" in CLAUDE.md unter ## Conventions (nach Sprachqualitaet/Frontend-UI, vor dem GSD:conventions-end-Marker) verbietet os.ReadFile einer .go-Quelldatei plus strings.Contains als Verhaltensnachweis, verlangt echte Ausfuehrung per httptest+Fake-Repository, erlaubt Abwesenheitspruefungen und SQL-Migrationsdateien als Ausnahme, und stellt klar dass die closest-analog-Regel diese Regel nie ueberstimmen darf; WR-02-Abschnitt in .planning/notes/2026-09-02-altlasten-cr01-wr02.md um den nachgemessenen echten Umfang erweitert (49 Dateien, 236 Assertions, drei Pakete, Beleg fuer aktive Ausbreitung via der neuen 144er Replace-Testdatei), CR-01-Abschnitt dort byte-identisch belassen | 2026-09-03 | ec4be553 | [260903-gf0-teststil-konvention-verhalten-testen-sta](./quick/260903-gf0-teststil-konvention-verhalten-testen-sta/) |
| 260903-gqt | Planungs-Buchhaltung nachgetragen (5 gezielte Doku-Commits, kein Code/Test angefasst): ROADMAP.md v1.4-Progress-Tabelle um Phase 143 (19/19) und 144 (8/8) ergaenzt; v1.4-MILESTONE-AUDIT.md auf 9/9 Phasen aktualisiert, Phase-142-Testschuld (16 failed/58 failed) als von Phase 143 abgetragen dokumentiert (289 Dateien/2183 Tests/0 Fehler, frisch gemessen), Phase-144-Gap-Runde plus die vier waehrend der UAT gefundenen Quick-Tasks 260903-cjk/czh/dth/flw vermerkt; STATE.md-Frontmatter last_updated korrigiert; neue Notiz .planning/notes/2026-09-03-offene-fragen-143-144.md haelt Phase 117 als geloest (Archiv unter .planning/milestones/, Luecke ueber Quick-Task 260819-lm5 geschlossen) und die M3/M5/M6/M7-Pruefbericht-Referenz als echte offene Frage fest (Quelldokument existiert nicht im Repo); DECISIONS.md-Eintrag 2026-09-03 fixiert die Projektlisten-isDone-Entscheidung (Beitragsvollstaendigkeit statt Ueberarbeitungsbedarf, ausdruecklich kein Defekt, ersetzt die "doppelt zaehlen"-Begruendung aus dem Handoff) | 2026-09-03 | 6478767a | [260903-gqt-planungs-buchhaltung-phasen-143-144-nach](./quick/260903-gqt-planungs-buchhaltung-phasen-143-144-nach/) |
| 260904-kwf | Falsche Verlinkung im Admin-Medien-Tab behoben: Button "Release-Medien oeffnen" in UserMediaTab.tsx verlinkte auf den Mitwirkenden-Workspace (/me/releases/.../workspace), der ein verifiziertes Member-Profil voraussetzt und fuer reine Plattform-Admins (z. B. app_user_id=1, admin@team4s.de) mit 404/fehlendem Notizen-Tab scheiterte; href auf den bereits vollstaendigen Admin-Editor /admin/episode-versions/.../edit umgestellt (gleicher getEpisodeVersionEditorContext-Endpunkt, gleiche Version-ID), Test in UserMediaTab.test.tsx nachgezogen; die vier Mitwirkenden-seitigen Workspace-Links bewusst unangetastet gelassen | 2026-09-04 | f6a24225 | [260904-kwf-falsche-verlinkung-im-admin-medien-tab-p](./quick/260904-kwf-falsche-verlinkung-im-admin-medien-tab-p/) |
| 260910-s1b | RFC 7233 Range-Unterstuetzung fuer die Medien-Route ergaenzt (schliesst T-154-F-01/deferred-items.md): parseByteRange-Helfer parst einzelne bytes=-Ranges (geschlossen/offen/Suffix), 206-Antworten streamen per fs.createReadStream+Readable.toWeb statt readFile+Slice, 416 mit Content-Range: bytes */<size> ohne Dateiinhalt bei unerfuellbaren Ranges, Accept-Ranges: bytes neu auf allen Erfolgsantworten, resolvedBase-Pfadpruefung separatoraware gehaertet; isAnimatedWebpSource liest den Body nur noch bei status===206 (WR-01, 154-REVIEW.md) statt bei jedem ok:true. Live-Beweis gegen timers echten animierten Avatar: vorher 200/411828 Bytes, nachher 206/64 Bytes mit Content-Range, plus 416 fuer eine unerfuellbare Range auf derselben Datei. Volle Vitest-Suite 296/1 uebersprungen Dateien, 2285/3 todo Tests, 0 Fehler; Produktionsbuild exit 0. | 2026-09-10 | 7ec8981f | [260910-s1b-http-range-unterst-tzung-f-r-die-medien-](./quick/260910-s1b-http-range-unterst-tzung-f-r-die-medien-/) |

### Verification Baseline

- Requirements: 65 defined, 65 uniquely mapped, 0 orphaned, 0 duplicated.
- Roadmap: seven sequential phases numbered 128-134 with five observable success criteria each.
- Recovery archive: 123 historical phase directories preserved.
- Runtime: canonical Linux Docker Compose services were running when v1.3 was initialized.
- Application validation is deferred to phase execution; milestone initialization changed planning artifacts only.

## Deferred Items

Items acknowledged and deferred at v1.3 milestone close on 2026-08-20 (per `gsd-sdk query audit-open`,
102 total; 1 verification gap — Phase 132's PMFE-11 live-Postgres check — was resolved for real this
session, not deferred, see 132-VERIFICATION.md; the remaining 101 below are pre-existing, unrelated
backlog: Phase 103 debug sessions, historical quick-tasks spanning 2026-04 through today, and
contributor-workspace/UI TODOs). None block v1.3. `audit-open`'s own JSON preview truncates the
pending-todos list (5 filenames shown of an internally-flagged larger remainder) — the full,
untruncated list lives in `.planning/todos/pending/`.

| Category | Item | Status |
|----------|------|--------|
| debug_session | 103-full-episode-admin-action | diagnosed |
| debug_session | 103-karaoke-auth-visibility | root_cause_found |
| debug_session | 103-pretty-release-route | root_cause_found |
| debug_session | 103-public-image-description-edit | root_cause_found |
| debug_session | 103-release-anime-logo-fallback | root_cause_found |
| debug_session | 103-release-image-gallery | diagnosed |
| debug_session | 103-release-preview-selection | diagnosed |
| debug_session | 103-release-text-grid | root_cause_found |
| debug_session | 103-release-visual-language | root_cause_found |
| debug_session | knowledge-base | unknown |
| debug_session | memberprofil-client-exception | awaiting_human_verify |
| debug_session | system-wieder-langsam | awaiting_human_verify |
| quick_task | 260405-kce-sync-phase-07-completion-across-roadmap- | missing |
| quick_task | 260417-qtu-asset-upload-ux-leere-slots-klickbar-und | missing |
| quick_task | 260423dxc-filter-already-imported-episode-candidates | missing |
| quick_task | 260423mnv-per-row-apply-button | missing |
| quick_task | 260423qpn-jellyfin-library-filter | missing |
| quick_task | 260428-ddb-episoden-laufzeit-crawlen-und-in-timelin | missing |
| quick_task | 260429-fnm-smart-parser-fuer-segment-zeitfelder-mm- | missing |
| quick_task | 260507-de2-rename-theme-types-op-to-op-kara-ed-to-e | missing |
| quick_task | 260510-t7j-upload-security-hardening-security-heade | missing |
| quick_task | 260510-umt-beschreibungs-textarea-fix-fuer-release- | missing |
| quick_task | 260511-hfd-releaseversionmediagallery-3-test-bugs-f | missing |
| quick_task | 260511-jjq-umlaut-regel-in-agents-md-ergaenzen | missing |
| quick_task | 260526-mhk-next-image-test-mock-fixen-und-den-einze | missing |
| quick_task | 260602-k94-phase-61-bug-triage-after-live-uat-no-ph | missing |
| quick_task | 260602-o68-phase-65-befunde-fixen | missing |
| quick_task | 260603-l77-inventory-doc-gaps | missing |
| quick_task | 260604-d12-ui-verbessern-auf-global-ziehen | missing |
| quick_task | 260608-jb9-startseite-ui-regelverstoss-beheben-nati | missing |
| quick_task | 260609-wev-releaseversionnotestab-auf-globales-ui-s | missing |
| quick_task | 260609-x3q-episode-version-editor-navigation-zuruec | missing |
| quick_task | 260610-f7n-fansubappmemberssection-collaboration-ta | missing |
| quick_task | 260610-fhn-fansub-members-ux-schnitt-dokumentieren- | missing |
| quick_task | 260610-hw1-banner-buttons-in-fansub-edit-auf-36px-h | missing |
| quick_task | 260610-i2j-fansub-mitglieder-und-historische-mitgli | missing |
| quick_task | 260610-iqh-alias-verwaltung-in-fansub-edit-ins-grun | missing |
| quick_task | 260618-cjy-release-buttons-in-meine-gruppen-auf-me- | unknown |
| quick_task | 260619-w1n-drawer-link-zur-meine-gruppen-uebersicht | missing |
| quick_task | 260620-eaj-member-contribution-ui-auf-globales-desi | missing |
| quick_task | 260620-lq7-manage-groups-ui-uebersicht-detail-claim | missing |
| quick_task | 260620-qog-bestaetigte-projektrollen-pro-anime-grup | missing |
| quick_task | 260620-uez-workspace-ui-primitives | missing |
| quick_task | 260621-p80p88-review-bugfixes | unknown |
| quick_task | 260629-phase91-profile-projects | unknown |
| quick_task | 260629-phase91-project-detail-addon | unknown |
| quick_task | 260629-phase92-profile-tabs | unknown |
| quick_task | 260703-8s3-fix-anisearch-and-jellyfin-anime-source- | unknown |
| quick_task | 260703-a3r-ui-first-e2e-viper-s-creed-jellyfin-fres | missing |
| quick_task | 260703-bc9-fix-sticky-admin-auth-logout-state-block | missing |
| quick_task | 260703-bmp-fix-datepicker-react-hooks-set-state-in- | missing |
| quick_task | 260703-br4-fresh-ui-first-viper-s-creed-e2e-retest- | missing |
| quick_task | 260703-crb-fix-admin-anime-jellyfin-link-status-and | missing |
| quick_task | 260704-neutral-role-labels | unknown |
| quick_task | 260706-x0v-fix-400-release-variant-id-fehler-beim-l | missing |
| quick_task | 260707-16l-fansub-cockpit-header-badge-zeigt-gruen- | missing |
| quick_task | 260707-ehc-profil-letzte-projekte-auch-aus-anime-co | missing |
| quick_task | 260707-f3t-profil-letzte-projekte-fortschrittsbalke | missing |
| quick_task | 260707-g70-meine-projekte-detailseite-banner-backgr | missing |
| quick_task | 260707-hx0-meine-projekt-detailseite-als-to-do-work | missing |
| quick_task | 260707-jya-meine-projekte-seite-umbauen-projektlist | missing |
| quick_task | 260707-kut-hinweis-senden-fuer-app-mitglieder-propo | missing |
| quick_task | 260713-history-timeline-pair-alignment | missing |
| quick_task | 260717-d7i-public-fansub-projektseite-mobile-redesi | missing |
| quick_task | 260717-erh-public-fansub-projektseite-mobile-redesi | missing |
| quick_task | 260717-lqt-desktop-maximalbreite-von-fansub-projekt | missing |
| quick_task | 260718-2w4-fansub-projektseite-releases-liste-fixen | missing |
| quick_task | 260718-e6z-anime-detailseite-request-fanout-reduzie | missing |
| quick_task | 260718-vei-responsive-releasebereich-der-ffentliche | missing |
| quick_task | 260721-dbz-fund-1-2-n-1-fix-release-version-media-h | missing |
| quick_task | 260721-eo4-ssr-fetch-parallelisierung-projectpageda | missing |
| quick_task | 260730-jre-fokussiertes-material-3-inspiriertes-kar | missing |
| quick_task | 260731-wh7-beitrags-badges-im-ffentlichen-memberpro | missing |
| quick_task | 260802-c5f-rollen-auszeichnungen-aus-dem-gesamtfort | missing |
| quick_task | 260803-be5-rollenbadges-visuell-vereinheitlichen-ka | missing |
| quick_task | 260803-jo0-ffentliche-member-profilseite-gruppenzug | missing |
| quick_task | 260803-ozq-profilseite-responsiv-optimieren-neulade | missing |
| quick_task | 260805-7lu-make-focalcarousel-arrow-and-keyboard-na | missing |
| quick_task | 260811-lck-hide-locked-achievement-art | missing |
| quick_task | 260811-obg-public-member-profile-outer-bands-transparent | missing |
| quick_task | 260811-pqe-phase-127-public-member-profile-visuelle | missing |
| quick_task | 260811-rms-phase-127-public-member-profile-widescre | missing |
| quick_task | 260811-rwd-binding-responsive-ui-standard | missing |
| quick_task | 260811-tbg-phase-127-profile-band-transparent | missing |
| quick_task | 260812-acs-count-only-achievement-summary | missing |
| quick_task | 260812-bqs-gesperrte-auszeichnungs-heroes-als-gross | missing |
| quick_task | 260812-jtp-public-member-profile-vertical-spacing-r | missing |
| quick_task | 260812-kr1-ffentliche-profilseite-gro-e-wei-e-innen | missing |
| quick_task | 260812-lql-ffentliches-memberprofil-letzte-beitr-ge | missing |
| quick_task | 260812-pmu-public-member-profile-duplicate-achievem | missing |
| quick_task | 260812-ras-remove-aggregate-achievement-summary | missing |
| quick_task | 260812-rps-public-member-profile-responsive-stabilisieren | missing |
| quick_task | 260817-7fv-implementiere-den-idp-rollen-getriebenen | missing |
| quick_task | 260819-ipu-duplikat-guard-beim-historischen-mitglie | missing |
| quick_task | 260819-lm5-phase-117-geteilte-karaoke-segmente-uebe | missing |
| quick_task | 260820-600-folgen-navigation-im-contributor-editor- | missing |
| todo | 2026-05-28-contributor-owned-media-note-edit-delete.md | pending (contributor-workspace) |
| todo | 2026-05-28-profile-hub-content-activity-redesign.md | pending (ui) |
| todo | 2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md | pending (ui) |
| todo | 2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md | pending (ui) |
| todo | 2026-06-03-member-profil-ui-und-params-bug.md | pending (ui) |

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 128 P01 | 29m | 3 tasks | 4 files |
| Phase 128 P02 | 15m | 2 tasks | 4 files |
| Phase 128 P03 | 16m | 2 tasks | 5 files |
| Phase 128 P14 | 13m | 1 task | 2 files |
| Phase 128 P04 | 14m | 2 tasks | 6 files |
| Phase 128 P05 | 16m | 2 tasks | 6 files |
| Phase 128 P06 | 16m | 2 tasks | 4 files |
| Phase 128 P07 | 9m | 2 tasks | 4 files |
| Phase 128 P08 | 12m | 2 tasks | 4 files |
| Phase 128 P09 | 20m | 2 tasks | 4 files |
| Phase 128 P10 | 15min | 2 tasks | 6 files |
| Phase 128 P11 | 13min | 2 tasks | 4 files |
| Phase 128 P12 | 14min | 2 tasks | 6 files |
| Phase 128 P13 | 15min | 2 tasks | 6 files |
| Phase 128 P15 | 24m | 2 tasks | 4 files |
| Phase 128 P17 | 9min | 1 tasks | 3 files |
| Phase 128 P18 | 6min | 1 tasks | 2 files |
| Phase 128 P16 | 22min | 2 tasks | 7 files |
| Phase 128 P19 | 13min | 2 tasks | 4 files |
| Phase 132 P01 | 25min | 2 tasks | 11 files |
| Phase 132 P02 | 19min | 3 tasks | 9 files |
| Phase 132 P03 | 8min | 2 tasks | 7 files |
| Phase 132 P04 | 11min | 3 tasks | 9 files |
| Phase 133 P02 | 4min | 2 tasks | 2 files |
| Phase 133 P03 | 5min | 2 tasks | 2 files |
| Phase 133 P04 | 20min | 2 tasks | 5 files |
| Phase 133 P05 | 35min | 2 tasks | 2 files |
| Phase 133 P06 | 15min | 2 tasks | 2 files |
| Phase 133 P07 | 35min | 2 tasks | 7 files |
| Phase 133 P08 | 25min | 2 tasks | 6 files |
| Phase 133 P09 | 75min | 2 tasks | 6 files |
| Phase 133 P10 | 20min | 2 tasks | 3 files |
| Phase 133 P11 | ~50min | 2 tasks | 3 files |
| Phase 133 P12 | n/a | 2 tasks DEFERRED | 0 files |
| Phase 134 P01 | 35min | 2 tasks | 5 files |
| Phase 134 P02 | 30min | 2 tasks | 3 files |
| Phase 134 P03 | 20min | 3 tasks | 5 files |
| Phase 134 P04 | 20min | 3 tasks | 4 files |
| Phase 134 P05 | ~25min | 3 tasks | 4 files |
| Phase 134 P06 | multi-session | 3 tasks | 8 source files + 14 evidence files |
| Phase 135 P01 | 4min | 2 tasks | 3 files |
| Phase 135 P02 | 12min | 2 tasks | 3 files |
| Phase 135 P03 | 25min | 2 tasks | 3 files |
| Phase 135 P04 | 18min | 2 tasks | 4 files |
| Phase 135 P05 | ~25min | 2 tasks | 5 files |
| Phase 135 P06 | ~10min | 2 tasks | 2 files |
| Phase 135 P08 | ~50min | 3 tasks | 4 files |
| Phase 135 P07 | multi-session | 3 tasks | 1 files |
| Phase 135 P10 | ~2h45m | 5 tasks | 13 files |
| Phase 136 P30 | 14min | 3 tasks | 12 files |
| Phase 136 P31 | 22 min | 1 tasks | 2 files |
| Phase 136 P28 | 3h39m | 1 tasks | 3 files |
| Phase 137 P01 | 25min | 2 tasks | 3 files |
| Phase 137 P02 | ~15min | 1 tasks | 5 files |
| Phase 137 P03 | ~30min | 2 tasks | 3 files |
| Phase 137 P04 | ~35min | 3 tasks | 3 files |
| Phase 137 P05 | ~25min | 2 tasks | 7 files |
| Phase 137 P06 | ~35min | 2 tasks | 7 files |
| Phase 137 P07 | ~45min | 2 tasks | 9 files |
| Phase 137 P08 | ~20min | 2 tasks | 3 files |
| Phase 137 P09 | ~25min | 2 tasks | 6 files |
| Phase 137 P11 | ~10min | 2 tasks | 2 files |
| Phase 137 P12 | 10min | 2 tasks | 2 files |
| Phase 137 P13 | ~20min | 2 tasks | 4 files |
| Phase 137 P14 | 5min | 2 tasks | 4 files |
| Phase 138 P01 | ~25min | 2 tasks | 11 files |
| Phase 138 P02 | ~20min | 2 tasks | 9 files |
| Phase 138 P03 | ~20min | 2 tasks | 6 files |
| Phase 138 P04 | ~9min | 2 tasks | 9 files |
| Phase 138 P05 | 45min | 2 tasks | 12 files |
| Phase 138 P06 | 20m | 2 tasks | 3 files |
| Phase 138 P07 | 40m | 2 tasks | 6 files |
| Phase 138 P08 | 25m | 2 tasks | 8 files |
| Phase 138 P09 | 25m | 3 tasks | 4 files |
| Phase 138 P10 | 20m | 2 tasks | 4 files |
| Phase 138 P11 | 4min | 2 tasks | 6 files |
| Phase 138 P12 | 15min | 2 tasks | 4 files |
| Phase 138 P13 | 42min | 2 tasks | 9 files |
| Phase 138 P14 | 20min | 2 tasks | 14 files |
| Phase 138 P15 | 45min | 2 tasks | 12 files |
| Phase 138 P16 | 35min | 2 tasks | 13 files |
| Phase 138 P17 | ~10m | 2 tasks | 3 files |
| Phase 138 P18 | 6min | 3 tasks | 4 files |
| Phase 139 P01 | 55min | 2 tasks | 18 files |
| Phase 139 P02 | 35min | 2 tasks | 3 files |
| Phase 139 P03 | 35min | 3 tasks | 7 files |
| Phase 139 P04 | 40min | 3 tasks | 9 files |
| Phase 139 P05 | 20min | 3 tasks | 15 files |
| Phase 139 P06 | 55min | 3 tasks | 3 files |
| Phase 139 P07 | 40min | 3 tasks | 10 files |
| Phase 139 P08 | 70min | 2 tasks | 3 files |
| Phase 139 P09 | 55min | 2 tasks | 3 files |
| Phase 139 P10 | multi-session | 2 tasks | 3 files |
| Phase 141 P01 | 11min | 2 tasks | 5 files |
| Phase 141 P02 | 40min | 3 tasks | 7 files |
| Phase 141 P03 | ~15min | 3 tasks | 7 files |
| Phase 141 P04 | ~20min | 2 tasks | 5 files |
| Phase 141 P05 | ~30min | 3 tasks | 3 files |
| Phase 141 P06 | 15min | 2 tasks | 2 files |
| Phase 141 P07 | 25min | 3 tasks | 3 files |
| Phase 143 P01 | 7min | 2 tasks | 5 files |
| Phase 143 P02 | 8min | 2 tasks | 3 files |
| Phase 143 P03 | 8min | 2 tasks | 7 files |
| Phase 143 P04 | 4min | 2 tasks | 2 files |
| Phase 143 P05 | 15min | 3 tasks | 6 files |
| Phase 143 P06 | 15min | 3 tasks | 9 files |
| Phase 143 P07 | 20min | 3 tasks | 6 files |
| Phase 143 P08 | 20min | 2 tasks | 3 files |
| Phase 143 P09 | 55min | 3 tasks | 7 files |
| Phase 143 P10 | 45min | 3 tasks | 3 files |
| Phase 143 P11 | 30min | 2 tasks | 3 files |
| Phase 143 P12 | 19min | 3 tasks | 8 files |
| Phase 143 P13 | 50min | 3 tasks | 6 files |
| Phase 143 P14 | 35min | 3 tasks | 8 files |
| Phase 143 P15 | 5min | 2 tasks | 3 files |
| Phase 143 P16 | 5min | 2 tasks | 2 files |
| Phase 143 P17 | 15min | 2 tasks | 5 files |
| Phase 143 P18 | 10min | 2 tasks | 2 files |
| Phase 143 P19 | 20min | 3 tasks | 7 files |
| Phase 144 P01 | 35min | 3 tasks | 8 files |
| Phase 144 P02 | ~50min | 3 tasks | 2 files |
| Phase 144 P03 | ~30min | 3 tasks | 5 files |
| Phase 144 P04 | ~10min | 3 tasks | 4 files |
| Phase 144 P05 | ~15min | 2 tasks | 2 files |
| Phase 144 P06 | 45min | 3 tasks | 6 files |
| Phase 144 P07 | 20min | 3 tasks | 4 files |
| Phase 144 P08 | 20min | 3 tasks | 7 files |
| Phase 145 P01 | 5min | 3 tasks | 8 files |
| Phase 145 P02 | 10min | 3 tasks | 10 files |
| Phase 145 P03 | ~15min | 3 tasks | 8 files |
| Phase 146 P01 | 3min | 3 tasks | 3 files |
| Phase 146 P02 | 12min | 2 tasks | 2 files |
| Phase 146 P03 | 8min | 3 tasks | 3 files |
| Phase 146 P04 | 40min | 3 tasks | 4 files |
| Phase 146 P05 | 12min | 2 tasks | 2 files |
| Phase 146 P06 | 24min | 2 tasks | 2 files |
| Phase 146 P07 | 20min | 2 tasks | 2 files |
| Phase 146 P08 | 3h | 3 tasks | 3 files |
| Phase 146 P09 | 1h | 1 tasks | 1 files |
| Phase 146 P10 | 25min | 1 tasks | 1 files |
| Phase 146 P11 | 180m | 3 tasks | 4 files |
| Phase 146 P12 | 150min | 3 tasks | 1 files |
| Phase 146 P13 | 90min | 3 tasks | 2 files |
| Phase 147 P01 | 35m | 3 tasks | 6 files |
| Phase 147 P03 | 12min | 2 tasks | 3 files |
| Phase 147 P04 | 3min | 2 tasks | 6 files |
| Phase 147 P05 | 6min | 2 tasks | 5 files |
| Phase 147 P02 | ~25 minutes | 3 tasks | 8 files |
| Phase 148 P01 | 35min | 3 tasks | 12 files |
| Phase 148 P02 | 70min | 2 tasks | 5 files |
| Phase 148 P05 | ~30min | 2 tasks | 14 files |
| Phase 148 P06 | 5min | 1 tasks | 1 files |
| Phase 148 P03 | 20min | 1 tasks | 3 files |
| Phase 148 P04 | 35min | 2 tasks | 3 files |
| Phase 148 P07 | external | 2 tasks | 0 files |
| Phase 148 P08 | ~40min | 2 tasks | 5 files |
| Phase 149 P01 | 5min | 2 tasks | 5 files |
| Phase 149 P02 | 7min | 2 tasks | 4 files |
| Phase 149 P03 | 2min | 2 tasks | 6 files |
| Phase 149 P04 | 3min | 2 tasks | 2 files |
| Phase 149 P05 | 25min | 2 tasks | 2 files |
| Phase 150 P01 | 9min | 2 tasks | 4 files |
| Phase 150 P02 | 35min | 3 tasks | 12 files |
| Phase 150 P04 | 26min | 1 tasks | 3 files |
| Phase 150 P03 | 45min | 2 tasks | 9 files |
| Phase 150 P05 | 75min | 3 tasks | 11 files |
| Phase 150 P07 | 35min | 2 tasks | 7 files |
| Phase 152 P01 | 10min | 1 tasks | 1 files |
| Phase 152 P02 | 15min | 3 tasks | 4 files |
| Phase 152 P03 | 20min | 3 tasks | 4 files |
| Phase 152 P04 | 10min | 2 tasks | 2 files |
| Phase 152 P05 | 35min | 3 tasks | 1 files |
| Phase 152 P06 | 15min | 2 tasks | 2 files |
| Phase 152 P07 | 30min | 3 tasks | 4 files |
| Phase 152 P08 | 35min | 2 tasks | 1 files |
| Phase 152 P09 | 50min | 3 tasks | 0 files |
| Phase 152 P10 | 25min | 3 tasks | 0 files |
| Phase 153 P01 | 6min | 2 tasks | 3 files |
| Phase 153 P02 | 4min | 2 tasks | 13 files |
| Phase 153 P03 | 4min | 2 tasks | 2 files |
| Phase 153 P04 | 20min | 2 tasks | 3 files |
| Phase 153 P05 | 6min | 2 tasks | 6 files |
| Phase 153 P06 | 3min | 2 tasks | 3 files |
| Phase 154 P01 | 7min | 3 tasks | 9 files |
| Phase 154 P02 | 12min | 2 tasks | 2 files |
| Phase 154 P03 | 25min | 2 tasks | 4 files |
| Phase 154 P04 | 35min | 3 tasks | 10 files |
| Phase 154 P05 | 20min | 2 tasks | 1 files |
| Phase 154 P06 | 25min | 2 tasks | 3 files |
| Phase 154 P07 | 10min | 1 tasks | 0 files |
| Phase 155 P01 | 26min | 3 tasks | 9 files |
| Phase 155 P02 | 24min | 3 tasks | 6 files |
| Phase 155 P03 | 12min | 1 tasks | 1 files |
| Phase 155 P04 | 20min | 3 tasks | 6 files |
| Phase 155 P05 | 12min | 2 tasks | 5 files |
| Phase 155 P06 | 22min | 3 tasks | 7 files |
| Phase 155 P07 | 55min | 3 tasks | 6 files |
| Phase 156 P01 | 8min | 2 tasks | 4 files |
| Phase 156 P02 | 22min | 2 tasks | 9 files |
| Phase 156 P03 | 14min | 1 tasks | 3 files |
| Phase 156 P06 | 14min | 2 tasks | 6 files |
| Phase 156 P04 | 35min | 2 tasks | 11 files |
| Phase 156 P05 | 6min | 1 tasks | 3 files |
| Phase 156 P07 | 46min | 2 tasks | 5 files |
| Phase 156 P08 | 11min | 2 tasks | 6 files |
| Phase 156 P09 | 25min | 2 tasks | 2 files |
| Phase 156 P10 | 55min | 2 tasks | 5 files |
| Phase 156 P156-15 | 1h 10min | 2 tasks | 3 files |
| Phase 157 P01 | 35min | 3 tasks | 5 files |
| Phase 157 P04 | 4min | 2 tasks | 3 files |
| Phase 157 P05 | 12min | 3 tasks | 4 files |
| Phase 157 P02 | 30min | 3 tasks | 11 files |
| Phase 157 P03 | 45min | 3 tasks | 5 files |
| Phase 157 P10 | 27min | 3 tasks | 4 files |
| Phase 156 P16 | 35min | 3 tasks | 17 files |
| Phase 156 P17 | 20min | 3 tasks | 9 files |
| Phase 157 P11 | 7min | 2 tasks | 1 files |
| Phase 157 P12 | 6min | 3 tasks | 9 files |
| Phase 157 P13 | 11min | 3 tasks | 4 files |
| Phase 157 P14 | 11min | 4 tasks | 13 files |
| Phase 157 P15 | 25min | 3 tasks | 14 files |
| Phase 157 P16 | 15min | - tasks | - files |
| Phase 156 P18 | 50min | 3 tasks | 16 files |
| Phase 156 P19 | 20min | 1 tasks | 2 files |
| Phase 156 P20 | 15min | 1 tasks | 2 files |
| Phase 156 P22 | 12min | 1 tasks | 2 files |

## Session Continuity

Last session: 2026-09-15T09:29:37.397Z
Stopped at: Completed 156-22-PLAN.md (GAP-09 frontend closure: editor hint + Karaoke-Typesetting fixture)
Last activity: Larger dot + per-entry role-colored timeline line implemented and live-verified against the running stack; GAP-02 V3/V4 closed automated/technically, human Live-UAT remains a separate open step.
Resume file: 
None

Plans 151-02/03/04 have implementation summaries. Plans 151-01 and 151-05 remain open until final artwork/composition review, complete browser evidence and independent verification; their missing summaries are intentional. No requirement or phase has been falsely marked complete.
