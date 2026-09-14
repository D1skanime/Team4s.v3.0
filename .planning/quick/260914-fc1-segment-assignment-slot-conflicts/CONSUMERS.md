# Consumer- und Mutationsmatrix

Baseline `d06644a1`, 14.09.2026. Bestehende Daten bleiben unangetastet.

| Naht / Feld | Schreib-/Lesepfade | Änderung / Begründung |
| --- | --- | --- |
| theme_segment_assignments | CreateAnimeSegment, AssignThemeSegmentToReleaseVersion, AssignThemeSegmentToEpisodeRange, Release-Import-autoassign | Gemeinsamer Konfliktschutz unter derselben Transaktionssperre; keine neue Tabelle/Registry |
| themes.theme_type_id | UpdateAdminAnimeTheme | Typwechsel darf indirekt keine doppelte OP-/ED-Belegung erzeugen |
| theme_segments.theme_id | UpdateAnimeSegment | Selber Schutz für Themewechsel eines schon zugeordneten Segments |
| start_episode/end_episode | Create/Patch/range reconciliation, reverse autoassign, Editorbereich und Anzeige | Bereich bleibt Automatisierungsvorgabe; belegte Ziele überspringen. Keine Existenzableitung in aktueller Segmentliste |
| assigned_release_version_ids / assigned_episodes | Hydration, isCurrentEpisodeAssigned, Assignmentchips, Originoptionen, öffentliche Release-/Projektprojektion | Bestehende autoritative Projektion benutzen. Keine Releaseversion aus Episodennummer erraten |
| range_sync | Create/Patch handler responses; bisher im API-Hook verworfen | additive skipped_conflicts mit echten IDs und Episodenlabels; erfolgreiche Teilzuordnung sichtbar machen |
| Fehler 409 | Create, Patch, Einzelzuweisung, Theme-Typwechsel | segment_assignment_conflict sichtbar im offenen Editor; kein nachfolgender Override-Schreibaufruf nach Konflikt |
| origin_release_version_id | separates explizites Originupdate und Contributorprojektion | Kein automatisches Umhängen durch Bereichskollisionen. Vorhandene Origin-/Contributor-UAT bleibt offen |
| theme_segment_episode_overrides | Range-Shrink-Schutz, eigener Editor-Override | Schutz bestehender redaktioneller Arbeit bleibt; Override nach Save nur für tatsächlich zugewiesene Version |
| öffentliche Projekt-/Releaseprojektion | group_repository_cursor_timeline.go, release_detail_public_repository_helpers.go | Liest bereits Assignments; keine zusätzliche Typ-/Range-Wahrheit nötig |

## Typ- und Eigentumsbeleg
Migration0050 normalisiert OP1/OP2 auf OP und ED1/ED2 auf ED;0058 benennt OP/ED in OP Kara/ED Kara um. `CanonicalSegmentType` ist die bestehende gemeinsame Backendklassifikation, einschließlich Outro→ED. Sie wird wiederverwendet. Die Sperre gilt je realer Release-Version/kanonischem OP oder ED, unabhängig vom Segmentnamen. Andere Versionen bleiben eigene Releaseobjekte; eine neutrale Episodennummer ist kein Slot-Schlüssel.

## Bestehende Vertragslücke
Der fokussierte Adminvertrag kennt Assignmentoperationen und AdminThemeSegment. Der kanonische OpenAPI-Vertrag kennt bisher nur Themeanlage, nicht die betroffenen Segment-Create/Patch-/Assignmentoperationen. Diese bestehenden Endpunkte und ihre nun atomische Mutation/Sync-Antwort werden gezielt dokumentiert. Keine neue Route, keine neue Authimplementierung.

## Vorbestehender Syntaxbefund
Der fokussierte Adminvertrag ist bereits auf HEAD nicht YAML-parserfähig: unquotierter Rest nach `"uninitialized"` (1073), danach unquotierte `enum:`-Scalars (1411). Keine breite Syntaxbereinigung im Segmentfix. Neue Blöcke separat geparst; kanonischer vollständiger OpenAPI-Vertrag wird insgesamt geparst und auf Referenzen geprüft.

## Visuelle Integrationskorrektur
Mobile Screenshotprüfung belegte eine geerbte `min-width:640px` der gemeinsamen Table-Komponente trotz lokalem Kartenlayout. Die Werte lagen rechts außerhalb des sichtbaren Ausschnitts; Rootscroll allein erkannte das nicht. Eine lokale `min-width:0` in der bestehenden <=640px-Regel beseitigt den Konflikt. Die Browserprüfung misst zusätzlich Tabellen- gegen Containerbreite. Keine globale Styleänderung.

## Edit-Vorbelegung nach Live-UAT-Nachtrag

`segmentFormFromExisting` hat genau einen Consumer: `SegmenteTab.openEditPanel`. Es verwendet jetzt dieselben vollständig hydrierten tatsächlichen Assignmentlabels für Von/Bis. Die bestehenden Typ-/Zeit-/Quellfelder bleiben unverändert. Keine neue Anfrage oder Zustandsregistry. Ohne verlässliche vollständige numerische Labels bleibt die gespeicherte Vorgabe erhalten. Die sichtbaren Grenzen werden erst durch ausdrückliches Speichern an den bestehenden Patch weitergegeben. Sie können dabei den ursprünglichen breiteren Automatikbereich ersetzen; das entspricht der nachgereichten Vorgabe des Auftraggebers.
