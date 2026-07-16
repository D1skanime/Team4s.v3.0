# Phase 103: Öffentliche Release-Detailseite als Fansub-Story mit Rechte-gesteuertem Episoden- und Karaoke-Playback - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 103 baut die bestehende öffentliche Release-Detailseite für genau eine `release_version_id` zu einer vollständigen Fansub-Release-Dokumentation aus. Im Mittelpunkt stehen Bilder, Texte, Karas, technische Release-Daten und die exakt an dieser Release-Version beteiligten Personen. Die vollständige Episode bleibt eine selten sichtbare Zusatzfunktion für ausdrücklich berechtigte Nutzer. Die Phase integriert OP/ED/Middle/Kara bewusst in die Release-Erfahrung, ohne neue Bilder-, Text- oder Player-Unterseiten und ohne Media an neutrale Episoden anzuhängen.

</domain>

<decisions>
## Implementation Decisions

### Release-Story und Informationshierarchie
- **D-01:** Die Seite ist primär ein Schaufenster für die Arbeit an einer konkreten Fansub-Release-Version, keine Streaming-Seite. Bilder, Teamtexte, Karas und Beteiligte dominieren die Seitendramaturgie.
- **D-02:** Der Release-Kopf zeigt alle verfügbaren Basis- und Technikdaten ohne Aufklappen: Episodennummer, Folgenname, Fansubgruppe, kuratierter Release-Name, Version, Release-Datum, Dauer, Auflösung, Video-Codec, Audio-Sprache/-Codec und Untertitelspuren.
- **D-03:** Mehrere ASS-/Untertitelspuren werden einzeln und verständlich mit Sprache, Umfang/Bezeichnung und Format dargestellt, zum Beispiel vollständig, Signs & Songs oder Forced. Technische Tracknummern stehen nicht im Vordergrund.
- **D-04:** Der Kopf enthält eine Übersicht der Anzahl Bilder, Texte und Fansubber. Die Beteiligtenliste repräsentiert ausschließlich diese Release-Version, nicht pauschal das gesamte Fansub-Projekt.
- **D-05:** Leere Inhaltsbereiche werden vollständig ausgelassen. Existieren anfangs nur Texte, beginnt der Inhaltsfluss mit Texten; die Seite setzt kein Bild voraus.
- **D-06:** Das globale Team4s-UI-System, vorhandene `components/ui`-Primitives und die öffentliche Fansubseite sind die verbindliche visuelle Sprache. Die Konzeptzeichnung ist Aufbauvorlage, keine Freigabe für ein unabhängiges Redesign.

### Primärbild und große Bildmengen
- **D-07:** Der Hero verwendet das für die Release-Version gewählte Preview-Bild. Der bestehende `is_preview_candidate`-Mechanismus ist der Anker; die öffentliche Projektion muss ihn korrekt berücksichtigen statt einfach das erste Bild zu verwenden.
- **D-08:** Ohne gewähltes/verfügbares öffentliches Preview-Bild funktioniert der Release-Kopf als textbasierter Hero mit bestehendem, fachlich sicherem Fallback.
- **D-09:** Bilder bleiben vollständig auf der Release-Seite und werden in den vier bestehenden Kategorien als eigene Kapitel gezeigt: Release-Screenshot, Typesetting-/Karaoke-Beispiel, Spaßbild/Outtake und Sonstiges.
- **D-10:** Jedes Bild zeigt eindeutig Kategorie, Beschreibung und Uploader/Autor.
- **D-11:** Jedes Kategorie-Kapitel zeigt zunächst responsiv 6 Bilder auf Desktop, 4 auf Tablet und 2 auf Mobil. `Weitere X Bilder anzeigen` klappt den Rest direkt im Kapitel auf; es gibt keine Galerie-Unterseite.

### Viele Texte und Urheberschaft
- **D-12:** Release-Texte werden nach Rolle gruppiert, zum Beispiel Übersetzung, Timing, Typesetting und Karaoke.
- **D-13:** Jeder Text zeigt eindeutig Autor/Member, Rolle, Avatar beziehungsweise vorhandenen Member-Fallback und Datum. Viele Texte bleiben auf derselben Seite; es gibt keine Text-Unterseite.
- **D-14:** Bilder und Texte dürfen paginiert/nachgeladen werden, aber die Interaktion bleibt in der aktuellen Release-Seite und bewahrt die jeweilige Kapitel-/Rollengruppe.

### Kara-Timeline und Segmentwiedergabe
- **D-15:** Die kompakte Episoden-/Segment-Timeline der Fansub-Projektseite wird als bestehender UI-Anker geprüft und für die Release-Seite deutlich ausgebaut, nicht parallel neu erfunden.
- **D-16:** Eine breite horizontale Episodenleiste bildet die gesamte Episodendauer ab. Farbige Segmentmarken zeigen Position und Typ von Opening, Ending, Middle und weiteren Kara-Segmenten.
- **D-17:** Segmentdaten umfassen Name, Typ, Startzeit, Endzeit, Dauer und die an Kara/Typesetting beteiligten Personen.
- **D-18:** Gäste sehen Timeline, Segmentinformationen und Vorschaubilder, aber keine Abspielaktion und keinen Loginhinweis.
- **D-19:** Jeder eingeloggte Nutzer darf ein technisch verfügbares Kara-Segment abspielen. Ein Klick auf die Segmentmarke öffnet eine große Detail-/Playerfläche unter der Timeline und startet das Segment sofort.
- **D-20:** Beim Segmentwechsel stoppt die bisherige Wiedergabe; parallele Kara-Streams sind ausgeschlossen.
- **D-21:** Noch nicht abspielbare Segmente bleiben sichtbar und zeigen für eingeloggte Nutzer den ruhigen Status `Noch nicht abspielbar`. Technische Renderfehler und Diagnosen gehören in Admin-/Leader-Oberflächen.
- **D-22:** Segmentzugriff bleibt an `theme_segment_id`, persistierte Grenzen und kurze segmentgebundene Grants aus Phase 98 gebunden. Der Browser darf Start/Ende nicht ausweiten.

### Vollständige Episodenwiedergabe
- **D-23:** Die vollständige Episode ist eine nicht zentrale, sekundäre Aktion bei den technischen Release-Daten.
- **D-24:** Nur ein Nutzer mit positiv aufgelöstem Wiedergaberecht sieht `Episode abspielen`. Nutzer ohne Recht sehen weder Button noch Sperrhinweis; technisch nicht verfügbare Episoden zeigen ebenfalls keinen Button.
- **D-25:** Die vollständige Episode öffnet in einem großen fokussierten Dialog. Nach dem Schließen bleibt Position und Zustand der Release-Seite erhalten.
- **D-26:** Die Release-Seite funktioniert vollständig ohne Episodenplayer. Player-Ausfälle dürfen Bilder, Texte, Beteiligte und Karas nicht blockieren.

### Wiedergaberechte
- **D-27:** Capability und Inhaltsfreigabe sind getrennte Konzepte: Die Capability erlaubt grundsätzlich die Aktion; ein hierarchischer Scope bestimmt, für welche Release-Versionen sie gilt.
- **D-28:** Zulässige Freigabescopes sind global, Fansubgruppe, Fansub-Projekt (`anime_id + fansub_group_id`) und konkrete `release_version_id`. Die neutrale Episode ist kein Rechtescope.
- **D-29:** Freigaben können über Rollenstandards oder direkt an konkrete App-User vergeben werden. Beide Wege werden durch dieselbe zentrale Autorisierungslogik ausgewertet.
- **D-30:** Die spezifischste Regel gewinnt. Eine Release-spezifische Freigabe/Sperre überschreibt Projekt-, Gruppen- oder globale Regeln.
- **D-31:** UI, Public-Read und Stream-Endpunkt dürfen die Hierarchie nicht separat nachbauen. Eine zentrale effektive Rechteprüfung entscheidet sowohl über Sichtbarkeit des Buttons als auch tatsächlichen Streamzugriff.
- **D-32:** Phase 103 implementiert nur den notwendigen zentralen Prüfvertrag und dessen Nutzung, sofern er noch fehlt. Eine vollständige Media-Rechte-Verwaltungsoberfläche mit Vererbung, Massenvergabe und Ausnahmen ist eine eigene Folgephase.

### Vorheriger und nächster Release
- **D-33:** Vorheriger/nächster Release navigiert zwischen Episoden derselben Fansubgruppe innerhalb desselben Fansub-Projekts, nicht chronologisch zwischen beliebigen Releases.
- **D-34:** Die Navigation versucht zuerst dieselbe Versionsnummer in der Ziel-Episode zu öffnen. Fehlt sie, wird die öffentliche Standardversion der Ziel-Episode verwendet.
- **D-35:** Bei Kooperations-Releases bleibt die Navigation im Gruppenkontext, über den die Detailseite geöffnet wurde. Beteiligte Kooperationsgruppen werden im Release-Kopf genannt.
- **D-36:** Unter `Nächster Release` darf niemals still zu einer anderen Fansubgruppe navigiert werden. Ohne passenden vorherigen/nächsten Release wird die jeweilige Aktion ausgelassen.

### the agent's Discretion
- Exakte responsive Abstände, Typografiegrößen, Breakpoints und Animationen innerhalb der bestehenden Public-Fansub- und UI-System-Sprache.
- Exakte Anordnung der vollständig sichtbaren Technikdaten, solange keine Daten versteckt oder erst per Aufklappen erreichbar werden.
- Konkrete Lade-/Paginationstechnik für große Bild- und Textmengen, solange Kapitel, Rollengruppierung, Urheberschaft und In-Page-Verhalten erhalten bleiben.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projekt-, Domain-, API- und Auth-Regeln
- `AGENTS.md` — harte Team4s-Regeln zu Fansub-/Release-Ownership, UI, Auth, deutschen Texten und Live-UAT.
- `docs/engineering/implementation-contract.md` — Search-first- und Reuse-Vertrag.
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Fansub-, Release-Version-, Media- und Identitätszuordnung.
- `docs/api/api-contracts.md` — Synchronität von OpenAPI, Runtime, DTOs und API-Client.
- `docs/frontend/auth-api-client.md` — zentraler Browser-Auth-/Refresh-Vertrag.
- `docs/frontend/streaming-auth-handoff.md` — bestehende Streaming-Auth-Übergabe.
- `shared/contracts/openapi.yaml` — kanonischer Cross-Surface-Vertrag.
- `shared/contracts/episode-versions.yaml` — Release-Version- und Segment-Playback-Verträge.
- `shared/contracts/asset-stream.yaml` — bestehende Asset-/Stream-Verträge.

### Vorherige Phasenentscheidungen
- `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-CONTEXT.md` — Public-Fansub-Projekt-Sprache, Release-Labels, gruppentreue Navigation und Verschiebung von OP/ED/Middle in die Release-Erfahrung.
- `.planning/phases/98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback-/98-CONTEXT.md` — segmentgebundene Grants, persistierte Grenzen, Clip-Render und Login-/Capability-Basis.

### Öffentliche Release-Seite
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx` — bestehende Server-Komposition und Abschnittsreihenfolge.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css` — bestehender responsiver Release-Detailstil.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` — aktueller Hero und Bildfallback.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` — bestehende In-Page-Galerie und Nachlade-Seam.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` — bestehende In-Page-Textliste.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx` — aktuelle Release-Mitwirkendenprojektion.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` — aktuelle kompakte OP/ED/Middle-Darstellung ohne Player.
- `frontend/src/types/releaseDetail.ts` — aktuelle öffentliche Release-DTOs.
- `backend/internal/repository/release_detail_public_repository.go` — aggregierter Public-Read für exakt eine `release_version_id`.
- `backend/internal/repository/release_detail_public_repository_helpers.go` — Sichtbarkeits-, Bild-, Text- und Contributor-Abfragen.

### Media, Preview und vorhandene UI
- `frontend/src/types/releaseVersionMedia.ts` — vier Media-Kategorien, `is_preview_candidate`, Sortierung und öffentliche Sichtbarkeitsmetadaten.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` — bestehender Release-Version-Media-Flow.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` — bestehender Hook/API-Seam für Release-Version-Media.
- `backend/internal/handlers/admin_content_release_version_media.go` — Upload/Patch/Preview-Singleton und Capability-Prüfungen.
- `frontend/src/components/fansubs/FansubTeamSection.tsx` — öffentliche Fansub-Mitgliederdarstellung als visueller Reuse-Anker.
- `frontend/src/app/fansubs/[slug]/page.tsx` — verbindliche öffentliche Fansub-Seitenkomposition.
- `docs/frontend/ui-system.md` — globale UI-Primitives und Tokens.
- `docs/agent-guidelines-ui.md` — lokale UI- und responsive Vorgaben.

### Playback und Permissions
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` — bestehender Segmenteditor und Preview-Anker.
- `backend/internal/handlers/episode_version_stream.go` — bestehender Release-Version-Stream.
- `backend/internal/handlers/episode_playback_grant.go` — bestehende Grant-Ausstellung.
- `backend/internal/handlers/episode_playback_access.go` — bestehende Playback-Zugriffsprüfung.
- `backend/internal/handlers/episode_playback_stream.go` — geschützter Stream-Pfad.
- `backend/internal/permissions/permissions.go` — zentrale Capability-Aktionen und Rollenbasis.
- `frontend/src/app/api/releases/[id]/stream/route.ts` — zentraler Frontend-Stream-Relay.
- `frontend/src/lib/server/streamRelayAuth.ts` — serverseitige Stream-Auth-Übergabe.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Die öffentliche Release-Route besitzt bereits Hero, Mitwirkende, Gallery, Notes und Theme-Timeline; Phase 103 erweitert diese Seams statt eine parallele Detailseite zu bauen.
- `release_version_media.is_preview_candidate` existiert bereits, erlaubt maximal einen Kandidaten pro Release-Version und gilt für Screenshot sowie Typesetting/Karaoke. Der Public-DTO projiziert das Flag aktuell noch nicht.
- Gallery und Notes besitzen bereits Cursor-/Mehr-laden-Seams; diese müssen für Kategorie- und Rollengruppierung weiterverwendet oder gezielt erweitert werden.
- Phase 98 stellt den segmentgebundenen Playback-Ansatz bereit; die Public-UI soll diesen konsumieren.

### Established Patterns
- Öffentliche Inhalte werden nur bei `public`/`approved` beziehungsweise `published` projiziert; interne Prozessdaten dürfen nicht durchsickern.
- Browser-API und Streaming laufen über zentrale Client-/Relay-Seams, nicht über lokale Bearer- oder Refresh-Logik.
- Public-Fansubseiten verwenden fließende, tokenbasierte Sektionen und lassen leere Bereiche lokal aus.
- Release-Version ist die Aggregations- und Ownership-Einheit; Episode bleibt neutral.

### Integration Points
- Der aggregierte Public-Release-Endpoint muss Technikdaten, Preview-Auswahl, Kooperation, segmentbezogene Public-Daten und Navigation dokumentiert bereitstellen oder über klar benannte bestehende Reads ergänzen.
- Der Release-Kopf benötigt serverseitig aufgelöste effektive Playback-Berechtigung; Client-Sichtbarkeit allein ist kein Schutz.
- Die Kara-Timeline verbindet die Public-Theme-/Segmentprojektion mit dem Phase-98-Grant-/Clip-Pfad.
- Vorher-/Nächster-Release-Auflösung muss nach Anime, aktueller Fansubgruppe, Episodenreihenfolge und bevorzugter Versionsnummer erfolgen.

</code_context>

<specifics>
## Specific Ideas

- Die Seite soll wie eine redaktionelle Dokumentation der Arbeit einer Fansubgruppe wirken: technischer Release-Kopf, exakt beteiligte Personen, vier Bildkapitel, rollenbasierte Teamtexte, ausgebaute Kara-Timeline und gruppentreue Weiter-Navigation.
- Die breite Kara-Timeline zeigt die Positionen innerhalb der gesamten Episodendauer; die ausgewählte Marke öffnet darunter eine große Medienfläche.
- Beispiel für Rechte: Admin global freigeschaltet; vertrauter Nutzer global mit wenigen spezifischen Ausnahmen; Gruppe für eigene Releases; weitere Nutzer nur für ein Fansub-Projekt oder eine einzelne Release-Version.

</specifics>

<deferred>
## Deferred Ideas

- Eine eigenständige Media-Rechte-Verwaltungsoberfläche für globale, Gruppen-, Projekt- und Release-Zuweisungen, Rollenstandards, direkte User-Grants, Vererbungsanzeige, Massenvergabe sowie spezifische Freigaben/Sperren gehört in eine Folgephase.
- Technische Segment-Renderdiagnosen und Fehlerdetails bleiben in Admin-/Leader-Oberflächen.

### Reviewed Todos (not folded)
- `Contribution-UI auf globale components/ui-Primitives umstellen` — generische Altaufgabe; Phase 103 folgt dem UI-System, übernimmt aber keine projektweite Contribution-Migration.
- `Kollaboration public handling neu loesen` — der für diese Seite relevante gruppentreue Kooperationskontext ist bereits durch Phase 102 und D-35 geklärt; keine breitere Kollaborationsphase hier.
- `Credits-UI in Anime & Veröffentlichungen konsolidieren + Permission-Brücke` — weiter gefasst als die Release-spezifische Beteiligtenprojektion dieser Phase.

</deferred>

---

*Phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g*
*Context gathered: 2026-07-16*
