---
quick_id: 260914-gif
status: complete
baseline: cbfec666
---
# Release-Datumsregeln und responsive Mediengalerie

## Autorisierter Scope
Der Auftraggeber bestätigt beide Vorschläge: eigene Datumslogik hart validieren (Abschluss >= Beginn, gleicher Tag erlaubt, null unbekannt), folgenübergreifende Chronologie ausschließlich als nicht blockierender Hinweis. Kein chronologischer Zwang, kein Ausfüllen leerer Daten. Galerie: Desktop vier Karten, mittlere Container zwei bis drei, Mobile bestehende Zweispaltenanordnung. 4:3-Medien, zweizeilige Titel, dreizeilige Kurztexte, vollständiger Text im bestehenden Detaildrawer, umbruchfähige Metadaten, kompakte Fußaktionen.

## Architektur / Consumer / Semantik
- `ReleaseVersionMetadataFields` verwendet vorhandene DatePicker. Die seit Phase143 belegte Editorsemantik nennt `release_date` „Bearbeitung abgeschlossen am“. Bestehende Release-/Public-Verwendung wird nicht umgedeutet; keine dritte Datumsquelle und keine Migration. Hinweise vergleichen Beginn mit Beginn und Abschluss mit Abschluss, ausschließlich im passenden Anime-/Fansub-/Versionskontext.
- `EpisodeVersionRepository.Update` sperrt Variant/Version/Release und führt partielle Patches mit aktuellen Datumswerten zusammen. Danach fehlt eine eigene Reihenfolgeprüfung; sie wird vor der Mutation ergänzt. Erlaubte null-Werte und gleiche Kalendertage bleiben erhalten.
- `EpisodeVersionEditorContext` ist der gemeinsame bereits geladene Kontext für Admin- und Member-Workspace. Für die Hinweise eine gezielte begrenzte Projektion wiederverwenden/ergänzen; keine vollständigen Gruppenprofile und keine Episode-für-Episode-Requests. Vertrag/DTO im selben Change dokumentieren.
- `ReleaseVersionMediaSection` wird sowohl vom Contributor-/Admineditor als auch vom Member-Workspace benutzt. Das Grid erlaubt aktuell 160px und streckt implizite Karten-/Buttonzeilen. Shared Button, Badge und Drawer bleiben erhalten.

## read_first
AGENTS.md; AI-HANDOFF.md; STATE/ROADMAP; docs/engineering/implementation-contract.md; docs/frontend/ui-system.md; docs/agent-guidelines-ui.md; docs/frontend/auth-api-client.md; docs/api/api-contracts.md; Phase143-05-SUMMARY; Phase159-01-CONSUMERS.
Galerie: ReleaseVersionMediaSection.tsx/.module.css/.test.tsx, vorhandene Quick260914-f3k Browserfixtures, shared Button/Badge/Drawer.
Datum: ReleaseVersionMetadataFields.tsx; useEpisodeVersionEditor.ts; episodeVersionEditorUtils.ts; Member workspace/page.tsx; episode_version_validation.go; episode_version_repository.go/write_helpers; admin_content_episode_version_editor_helpers.go; Modelle/Verträge/Handler-/Repositoryfixtures.

## Plans / Wellen / Verantwortung
1. Galerie-Executor: besitzt nur ReleaseVersionMediaSection.tsx/.module.css/.test.tsx und einen galeriebezogenen Evidence-Bericht im Quickordner. Bestehende responsive Komponente mit Container Queries auf feste größere Spaltenzahl und Mindestgeometrie umstellen; keine Upload-/API-Änderung. CSS/DOM- und Browserprüfung mit langen realistischen Texten. Keine fremden Dateien überschreiben und nicht committen.
2. Datums-Executor/Orchestrator: besitzt Datumsfrontend, Backend, Verträge und Tests. Vorbelegungs-/Formzustand und API-Fehler bleiben über vorhandene zentrale Seams. Hinweise dynamisch aus Formdatum und den passenden bekannten Ankern; Leerwerte überspringen, keine fremden Gruppen/Versionen vergleichen. Serverseitige eigene Regel unter bestehender Transaktionssperre und bei Partialpatch prüfen.
3. Orchestrator: Integration, ressourcenbegrenzte Tests/Typecheck/Lint/Build seriell, Browser 390/768/1440 plus Containergrenzen/Zoom, angemeldeter Live-Lesefluss ohne Datenmutation, Consumer- und Scopebericht, Diffreview, atomische Codecommits und GSD-STATE-Eintrag. Offene Human-UAT156/157/158/159 unverändert.

Unabhängige Galerie- und Datumsdateien erlauben parallele Ausführung; schwere Prüfungen auf der VM nur nach Koordination. Fremde frontend/scripts/shot2.mjs bleibt unberührt. Keine Live-Daten, Env, Media, Migration oder Volumenmutation. Kein Push.

## Abnahme
Galerie: 11 Medien gemischter Kategorien, lange Titel/Texte, mit/ohne Vorschauaktion, 4:3 in jeder Karte, vier Spalten bei ausreichender Breite, zwei/drei bei mittlerer Breite, Mobile zwei; maximal zwei/drei Textzeilen, vollständiger Text im Detail, Buttonhöhe kompakt, Datum/Badges nicht abgeschnitten, kein Rootoverflow, vorhandene Upload-/Preview-/Berechtigungsregressionen.
Datum: Beginn 18.07./Abschluss17.07. derselben Version abweisen; gleiche Tage erlauben; Teilpatch gegen gespeicherten Gegenwert; Leeren erlauben. Folge 2 Beginn 18.07.,3–5 leer,6 Beginn19.07.: Hinweise bei außerhalb liegenden Eingaben, kein Saveverbot aufgrund anderer Folgen. Keine Verwechslung mit Abschlussdaten, anderen Gruppen/Versionen, Varianten-ID oder realer Releaseversion. Session nur Refresh/abgelaufener Access über zentralen Client; API-/Kontextfehler sichtbar; Navigation/späte Responses überschreiben kein anderes Formular.
