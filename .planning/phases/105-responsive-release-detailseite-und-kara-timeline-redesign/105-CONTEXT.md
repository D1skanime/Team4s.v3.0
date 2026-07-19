# Phase 105: Responsive Release-Detailseite und Kara-Timeline-Redesign - Context

**Gathered:** 2026-07-19
**UAT feedback incorporated:** 2026-07-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 105 ordnet und gestaltet die bestehende öffentliche Detailseite einer konkreten `release_version_id` responsiv neu. Die Kara-Sektion wird zum ersten Inhaltsblock direkt nach dem Hero und erhält für Desktop, Tablet und Mobile jeweils eine passende Darstellung. Die Phase verbessert außerdem die responsive Nutzung von Hero, Bilderraster, Teamtexten, Release-Beteiligten und Release-Navigation, ohne eine neue Release-Seite, neue Unterseiten, neue Medienzuordnung, neue Rechteverwaltung oder einen parallelen Player zu bauen.

Die in Phase 103 umgesetzten Public-Daten-, Auth-, Segment-Grant- und Stream-Verträge bleiben fachlich maßgeblich. Phase 105 ist ein UI-/Kompositions-Redesign auf diesen bestehenden Seams.

</domain>

<decisions>
## Implementation Decisions

### Seitendramaturgie und Hierarchie
- **D-01:** Die sichtbare Reihenfolge lautet Hero → Karas → Bilder → Teamtexte → exakt diesem Release zugeordnete Fansubber → optionales vollständiges Episoden-Playback → vorheriger/nächster Release.
- **D-02:** Zwischen Hero und Kara-Sektion steht keine separate Sprungnavigation. Falls die bestehende Navigation `Bilder`, `Texte`, `Fansubber` erhalten bleibt, wird sie in den Hero-Footer integriert oder erst nach der Kara-Sektion gezeigt.
- **D-03:** Leere Bereiche bleiben wie in Phase 103 vollständig ausgelassen; das Verschieben der Karas erzwingt keinen leeren Platzhalter.
- **D-04:** Die Seite bleibt eine redaktionelle Fansub-Release-Dokumentation. Die vollständige Episode bleibt eine selten sichtbare, untergeordnete Zusatzfunktion.

### Desktop-Kara-Timeline
- **D-05:** Auf Desktop füllt der Kara-Bereich die verfügbare Inhaltsbreite. Die heutige schmale linke Inhaltsspalte mit großer leerer rechter Fläche entfällt.
- **D-06 (superseded 2026-07-20):** Eine echte horizontale Timeline bildet `00:00` bis zur Episodendauer ab. Statt generierter Viertel-Ticks zeigt sie nur die verständlichen Anker `Start 00:00` und `Ende {Episodendauer}`; Segmentlabels tragen Typ und echte Start–Ende-Zeit. Damit entfallen verwirrende Werte wie `05:56`, `11:52` und `17:48`.
- **D-07:** Segmentposition und -dauer bleiben fachlich proportional. Kleine Segmente erhalten außerhalb der eigentlichen Spur eine lesbare Typ-/Auswahlbeschriftung, statt als winzige runde Pillen oder irreführend breite Zeitblöcke dargestellt zu werden.
- **D-08:** Unter der Timeline stehen bei ausreichender Breite zwei polierte Segmentkarten nebeneinander. Jede Karte zeigt Typ, Segmentname, Start–Ende, Dauer, beteiligte Personen und eine Team4s-Abspielaktion.
- **D-09:** Auswahl auf Timeline oder Karte hebt genau ein Segment deutlich hervor. Der große Player erscheint unmittelbar im Kara-Bereich unter Timeline/Auswahl; beim Segmentwechsel stoppt der bisherige Stream.

### Tablet- und Mobile-Darstellung
- **D-10 (superseded 2026-07-20):** Tablet behält ab dem geeigneten bestehenden Breakpoint die horizontale Timeline mit denselben Start-/Endankern. Segmentkarten stehen bei ungefähr 1024 px zweispaltig und bei schmalem Tablet einspaltig, ohne horizontalen Überlauf.
- **D-11:** Mobile zeigt keine zusammengedrückte horizontale Episodenleiste. Der Abschnitt heißt kurz `Karas` und verwendet eine vertikale Liste vollständig anklickbarer Segmentkarten.
- **D-12:** Mobile Karten zeigen eine farbige Typ-Seitenlinie, Typ, Name, Start–Ende, Dauer und Beteiligte. Die Abspielaktion ist mindestens 48 px hoch und nutzt den globalen Button mit Play-Icon.
- **D-13:** Kleine Segment-Vorschaubilder werden auf Mobile nicht gezeigt. Ein Medienbild ist nur zulässig, wenn es als ausreichend große, tatsächlich erkennbare Vorschau in die Player-/Detailfläche integriert wird.

### Wiedergabe- und Zustandsdarstellung
- **D-14 (superseded by user UAT 2026-07-20):** Gäste sehen Timeline beziehungsweise mobile Segmentkarten und alle öffentlichen Segmentinformationen. Bereite Segmente zeigen sichtbar ein Schloss und den vorhandenen `/login`-Navigationspfad `Anmelden zum Abspielen`, aber keinen Stream, kein Autoplay und keine frei vom Browser gelieferten Segmentgrenzen.
- **D-15:** Jeder eingeloggte Nutzer kann technisch bereite Kara-Segmente über den bestehenden Phase-103-Stream-Seam abspielen. Die UI bildet diese Berechtigung nicht lokal neu nach.
- **D-16 (superseded by user UAT 2026-07-20):** Noch nicht bereite Segmente bleiben für Gäste und aktive Sessions sichtbar und zeigen den ruhigen Text `Noch nicht abspielbar`; technische Diagnosen bleiben außerhalb der Public-Seite.
- **D-17:** Das vollständige Episoden-Playback bleibt nur bei positiv aufgelöstem Recht sichtbar und wird nach den zentralen Inhaltssektionen platziert. Sein Verhalten und seine Rechte werden in dieser Phase nicht neu entworfen.

### Bilder, Texte und Release-Beteiligte
- **D-18:** Bilder bleiben in einem gemeinsamen responsiven Raster auf derselben Seite. Es werden keine vier getrennten Kategorie-Kapitel und keine Bilder-Unterseite wiedereingeführt.
- **D-19:** Jedes Bild bleibt als Ganzes anklickbar und öffnet die vorhandene Originalansicht. Kategorie und Uploader/Autor sind als erkennbare Badges beziehungsweise Metadaten sichtbar; lange Beschreibungen werden in der Rasterkarte gekürzt.
- **D-20 (superseded by user UAT 2026-07-20):** Das Bilderraster nutzt wegen der sonst zu kleinen Desktopbilder höchstens drei Spalten: auf Desktop/Large Desktop exakt drei, auf Tablet zwei bis drei und auf Mobile zwei.
- **D-21:** Teamtexte bleiben nach Rolle gegliedert und vollständig auf derselben Seite. Desktop nutzt ein echtes responsives Rollenraster beziehungsweise ergänzende Metaflächen, damit lesbare Zeilenlänge nicht als große ungenutzte rechte Halbseite erscheint. Tablet und Mobile wechseln auf eine Spalte.
- **D-22 (clarified by user UAT 2026-07-20):** Lange Texte dürfen in der Karte zunächst gekürzt sein und werden mit `Weiterlesen`/`Weniger anzeigen` am selben Ort vollständig geöffnet; es entsteht keine Text-Unterseite. Auch bei acht vorhandenen Einträgen werden initial höchstens drei vollständige Karten gerendert und die übrigen über den vorhandenen Reveal-Seam nachgezogen.
- **D-23:** Release-Beteiligte bleiben eine eigene Sektion und zeigen ausschließlich die Personen dieser Release-Version mit ihren konkreten Rollen. Projektweite oder gruppenweite Mitglieder dürfen nicht als Ersatz erscheinen.

### Hero, Navigation und visuelle Sprache
- **D-24 (clarified by user UAT 2026-07-20):** Der Hero behält Preview-Bild beziehungsweise Anime-Logo-Fallback, Release-Titel, Episode, Gruppe(n) und die wichtigsten Release-Fakten. Die Gruppenzeile lautet bei einer Gruppe `Fansubgruppe: {Name}` und bei mehreren `Fansub-Coop: {Name} × {Name}`. Primäre Fakten bleiben sofort sichtbar. `Details` zeigt stets Container, Video-Codec, Audio-Codec, Audio-Sprache, Untertiteltyp und Untertitelspuren; fehlende API-Werte heißen ehrlich `Nicht hinterlegt`.
- **D-25:** Release-Seite und ihre Inhaltssektionen verwenden dieselbe öffentliche Maximalbreite wie Fansub- und Fansub-Projektseite. Verschachtelte Karten erzeugen keine abweichende schmale Desktop-Spalte.
- **D-26 (extended by user UAT 2026-07-20):** Vorheriger/nächster Release bleibt auf allen Breakpoints im normalen Seitenfluss am Seitenende. Zusätzlich steht der nächste Release direkt im Hero-Footer nach den technischen Details. Beide Positionen verwenden dieselbe `ReleaseNavigation`/`AdjacentNavigation`- und Pfadbau-Seam; nichts schwebt oder überlagert Inhalte.
- **D-27:** Buttons, Karten, Badges, SectionHeader und AdjacentNavigation verwenden vorhandene `@/components/ui`-Primitives beziehungsweise erweitern deren bestehenden Seam. Native Standardbuttons wie der aktuelle `Abspielen`-Button sind nicht das Zielbild.
- **D-28:** Deutsche UI-Texte verwenden korrekte Umlaute. Fokuszustände, Tastaturbedienung, Kontrast und Touch-Ziele werden für Timeline, Karten, Player und Navigation mitgeprüft.

### Verifikation
- **D-29:** Live-UAT prüft mindestens Mobile um 390 px, Tablet Portrait um 768 px, Tablet/Laptop um 1024 px und Desktop um 1440 px. Kein Breakpoint darf horizontal überlaufen.
- **D-30:** UAT umfasst Gast, eingeloggten normalen Nutzer beziehungsweise Fansubber und vorhandenen berechtigten Episoden-Nutzer. Segmentwechsel, nicht bereite Segmente, fehlende Bilder/Texte und vorherige/nächste Navigation werden ebenfalls geprüft.

### the agent's Discretion
- Exakte Type-Farbpalette innerhalb der vorhandenen Media-/Public-Tokens, Anzahl und Position der Desktop-/Tablet-Zeitmarken sowie subtile Auswahl-/Player-Übergänge.
- Ob die optionale Abschnittsnavigation vollständig entfällt oder nach der Kara-Sektion kompakt erhalten bleibt, solange D-02 erfüllt ist.
- Exakte Karten-Mindestbreiten innerhalb der gelockten responsiven Darstellung und vorhandenen Team4s-Breakpoints.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projekt- und UI-Regeln
- `AGENTS.md` — verbindliche Team4s-Regeln zu UI, deutschen Texten, Auth, Media-Ownership, Reuse und Live-Browser-UAT.
- `docs/engineering/implementation-contract.md` — Search-first- und Reuse-Vertrag.
- `docs/frontend/ui-system.md` — globale UI-Primitives, öffentliche Timeline-Regeln und responsive Mobile-Darstellung.
- `docs/agent-guidelines-ui.md` — lokale UI-, Accessibility- und Responsive-Vorgaben.

### Vorherige Phasenentscheidungen
- `.planning/phases/103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g/103-CONTEXT.md` — kanonische Release-Story, Segment-/Episodenrechte, Public-Zustände und Navigation; Phase 105 verfeinert die Darstellung.
- `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md` — öffentliche Fansub-Projekt-Sprache, Maximalbreite, fließende Sektionen und responsive Fansub-UI.

### Release-Seitenkomposition
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` — aktuelle Datenkomposition und Abschnittsreihenfolge.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css` — aktuelles Seiten-, Hero-, Timeline- und responsive Styling.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` — Hero, Preview-/Logo-Fallback und Technikdetails.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` — aktuelle Segmentauswahl, Player und Wiedergabezustände; primärer Redesign-Seam.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` — gemeinsames Bilderraster, Originalbild-Interaktion und Nachladen.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css` — aktuelle Gallery-Breakpoints und Kartenmetadaten.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` — rollenbasierte Teamtexte und In-Page-Aufklappen.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css` — aktuelles Text-/Rollenraster.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx` — Release-Version-spezifische Beteiligte.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx` — sekundäres berechtigungsabhängiges Episoden-Playback.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx` — vorherige/nächste Release-Navigation.

### Wiederverwendbare Timeline- und UI-Muster
- `frontend/src/components/fansubs/PublicReleaseBlock.tsx` — bestehende Projektseiten-Timeline und mobile Kara-Liste als Reuse-/Vergleichsanker.
- `frontend/src/components/fansubs/PublicReleaseBlock.module.css` — vorhandene Type-Farben, Timeline-Grundspur und mobile Segmentdarstellung.
- `frontend/src/components/ui/Button.tsx` — globale Abspielaktion.
- `frontend/src/components/ui/Card.tsx` — globale Kartenstruktur.
- `frontend/src/components/ui/Badge.tsx` — Typ-/Kategoriekennzeichnung.
- `frontend/src/components/ui/SectionHeader.tsx` — öffentliche Abschnittsüberschriften.
- `frontend/src/components/ui/AdjacentNavigation.tsx` — Navigation im normalen Seitenfluss.
- `frontend/src/components/ui/ui.module.css` — gemeinsame Tokens und Komponentenzustände.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeTimeline.tsx` enthält bereits Auswahl, Autoplay-Deep-Link, Stream-URL, Streamwechsel und Cleanup. Das Redesign soll diese Logik erhalten und die Darstellung/Komposition ersetzen.
- `PublicReleaseBlock.tsx` besitzt bereits eine episodenweite Timeline sowie eine separate mobile Kara-Darstellung. Es ist der engste vorhandene Pattern-Anker, darf aber nicht ungeprüft kopiert werden.
- `ReleaseGallery.tsx` und `ReleaseNotesList.tsx` besitzen bereits In-Page-Nachlade-/Aufklapp-Seams; Phase 105 braucht keine Bilder- oder Text-Unterseiten.
- `Button`, `Card`, `Badge`, `SectionHeader` und `AdjacentNavigation` decken die sichtbaren Grundbausteine ab.

### Established Patterns
- Public-Seiten arbeiten als fließende, tokenbasierte Sektionen und lassen leere Bereiche lokal aus.
- Mobile Public-Timelines werden nicht horizontal gescrollt, sondern als vertikale Segmentliste dargestellt.
- Kara-/Theme-Segmente verwenden Media-/Typfarben, nicht Statusrot oder native Standardcontrols.
- Auth- und Streamberechtigung bleiben in zentralen Seams; die UI rendert nur die serverseitig beziehungsweise zentral aufgelösten Zustände.

### Integration Points
- `releaseDetailPageData.tsx` muss `ThemeTimeline` unmittelbar nach `ReleaseDetailHero` komponieren und die restlichen Sektionen danach anordnen.
- `ThemeTimeline.tsx` und `page.module.css` sind der Kern für Desktop-/Tablet-Timeline, Karten, Auswahl und Player.
- Gallery-, Notes- und Navigation-CSS benötigen gezielte responsive Anpassungen, ohne API- oder Datenmodelländerung.

### Current UI Findings
- Im geprüften Stand beginnt die Kara-Sektion ungefähr bei 2480 px auf Desktop, 2255 px auf Tablet und 1974 px auf Mobile, weil Bilder und Texte davor liegen.
- Die Desktop-Kara-Inhalte nutzen nur ungefähr eine halbe Inhaltsbreite und lassen eine große leere Fläche rechts.
- Die aktuelle Spur ist eine fast leere, beige Pillenleiste mit sehr kleinen runden OP-/ED-Markierungen; darunter wirken die Segmentkarten und `Abspielen`-Buttons wie ungestylte Formulare.
- Mobile blendet die Leiste zwar aus, zeigt aber weiterhin einfache Karten mit kleinen Standardbuttons statt einer mediengerechten Kara-Interaktion.

</code_context>

<specifics>
## Specific Ideas

- Desktop-Zielbild: vollbreite Zeitskala von `00:00` bis Episodenende, externe lesbare OP-/ED-Labels, darunter zwei Segmentkarten und ein direkt im Kara-Bereich erscheinender Player.
- Mobile-Zielbild: `Karas` mit vertikalen Karten, farbiger Seitenlinie und einem vollbreiten Button `Kara abspielen`.
- Die Seite soll auch ohne Preview-Bild, ohne Karas, ohne Bilder oder nur mit Anfangstext stabil und bewusst komponiert wirken.

</specifics>

<deferred>
## Deferred Ideas

- Eine eigenständige Media-Rechte-Verwaltungsoberfläche für globale, Gruppen-, Projekt- und Release-Grants bleibt eine separate Folgephase.
- Neue Segment-Renderdiagnosen, neue Player-/Galerie-Unterseiten und neue Media-/Release-Datenmodelle sind nicht Teil dieses Redesigns.
- Allgemeine Redesigns der Fansub- oder Anime-Seite außerhalb der für Konsistenz nötigen Vergleichsprüfung bleiben außerhalb von Phase 105.

### Reviewed Todos (not folded)
- Die automatisch gematchten Profil-Hub-, Contribution-Primitive-, Member-Profil-, Admin-Fansub- und Achievement-Todos teilen nur allgemeine UI-/Redesign-Begriffe und gehören nicht zur Release-Detailseite.
- `Kollaboration public handling neu loesen` wird nicht gefaltet; der für Releases relevante Kooperations- und Gruppenkontext ist bereits in Phase 102/103 entschieden.

</deferred>

---

*Phase: 105-responsive-release-detailseite-und-kara-timeline-redesign*
*Context gathered: 2026-07-19*
