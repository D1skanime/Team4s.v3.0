---
phase: quick-260914-dzk
plan: 01
type: execute
wave: 1
autonomous: true
requirements: []
---
# Ziel und UI-Vertrag

Nutzer hat am 14.09.2026 ausdrücklich die vorgeschlagene per-Bild-Titel-/Text-Erweiterung und eindeutige Vorschauauswahl genehmigt. Ausgang 6cd178d0. Keine Bestandsdaten migrieren oder Medien neu zuordnen.

Nach Kategorieauswahl öffnet derselbe Uploaddialog. Globale Beschreibung und globale Preview-Checkbox entfallen. Dropzone bleibt oben; darunter genau eine editierbare Zeile je Bild: Thumbnail, vollständiger zugänglicher Dateiname, optionaler Titel (max. 200 Zeichen), Beschreibung als Textarea, Aus Auswahl entfernen, individuelle Status-/Fortschritts-/Fehler-/Retryanzeige. Keine doppelte Preview-/Dateiliste. Bestehende globale Inputs/Textarea/Button/Drawer/Progress-Primitives und Tokens verwenden. Containerquery: zunächst Felder unter Thumbnail, ab passender Breite Thumbnail links und Felder rechts; 390/768/1440 prüfen. Keine neue Uploadengine.

Eine native Radio-Auswahl über alle Dateien: keine neue Vorschau (Standard, vorhandene bleibt) oder genau eine Datei. Nur vorhandene erlaubte Kategorien Screenshot/Typesetting-Karaoke. Auswahl entfernen hebt deren Vorschauwahl auf. Kein automatischer Ersatz bei Uploadfehler. Keine Metadaten-/Dateiauswahländerung während Upload; Retry behält pro-Datei-Werte und Ziel-ID. Erfolgreiche Binärdatei bei Metadatenfehler nicht erneut hochladen.

Titel und caption gehören beide zu release_version_media, nicht zu Anime/Episode oder globalem Media-Asset. Titel nullable, plain text, max. 200 Unicodezeichen, leer -> null; fehlendes Feld bei PATCH unverändert. Bestehende Titel-/Textdarstellung auch in Bearbeitungs- und öffentlichen direkten Consumern ergänzen, sichere Textausgabe. Bestehende Vorschau-/Review-/Ownershipgrenzen erhalten.

## read_first
AGENTS.md; AI-HANDOFF.md; docs/engineering/implementation-contract.md; docs/api/api-contracts.md; docs/frontend/auth-api-client.md; docs/frontend/ui-system.md; docs/agent-guidelines-ui.md; docs/architecture/db-schema-fansub-domain.md; aktuelle STATE/ROADMAP; voriger Quick 260914-dov.
ReleaseVersionMediaSection.tsx/.helpers.tsx/.module.css, useReleaseVersionMedia.ts und Tests; ReleaseVersionMediaGallery/DetailPanel; types/releaseVersionMedia.ts; lib/api.ts Upload-/Patch-/Replace-Transport;
admin_content_release_version_media.go / _replace.go; release_version_media_repository.go; öffentliche Release-/Projekt-/Member-Media-Projektionen und reale Consumer; shared/contracts/openapi.yaml und admin-content.yaml; aktuelle Migrationen.

## Wellen / Ownership
1. Consumer-Matrix vor Vertrags-/Schemaänderung. Danach unabhängig: Backend+YAML+Migration+Go-Tests (Backend-Executor); Uploadhook+eigene Tests+ReleaseVersionMedia-TS-Typen (Hook-Executor); Uploaddialog, spätere Bearbeitung und Frontend-Consumer (Hauptagent). Keine fremden Änderungen überschreiben. Keine Agentencommits bis Gesamtintegration.
2. Gemeinsam integrieren, fokussierte Contract-/Hook-/UI-/Backendtests, Schema-up/down in isoliertem Testschema. Additive Migration 0163 erst nach erneuter Kettenprüfung anwenden; keine Zeilendaten ändern. Backend neu laden, falls zur Runtimeprüfung erforderlich. Browserfixture 3 Bilder, Titel/Texte, einziges Preview, Abbruch, Retry, Reload/Nachbearbeitung, Mobile/Tablet/Desktop. Keine echten Uploads.
3. Typecheck/Lint/isolierter Build/diff-check; bekannte Altfehler separat; Codecommit und GSD Summary/STATE. Keine Phasen-/Human-UAT-Schließung.

## Vereinbarte Frontendschnittstelle
UploadFileDraft = { file: File; title: string; caption: string }.
startUpload(category, drafts: UploadFileDraft[], previewFileKey?: string | null).
Preview-Key verwendet vorhandenes fileKey(file). Queue behält resultId und SourceRevision zur Wiederholung nur fehlgeschlagener Metadaten; Retry API bleibt retryUpload(index). Bestehende optionale Queue-Felder können additiv erweitert werden. Kein neuer HTTP-Uploadvertrag für Datei-Metadaten: vorhandener Batchupload plus vorhandenes PATCH je erfolgreichem Bild wird gezielt erweitert.

## Sicherheit / Abnahme
Ein Dateidraft bleibt eindeutig seiner Result-ID zugeordnet. Keine zufällige Titelzuordnung über Dateiname allein; Batch-Ergebnisreihenfolge prüfen und Tests mit gleichen Namen. Preview nur beim ausdrücklich ausgewählten Bild setzen; existierende Auswahl sonst unverändert. Aktualisierung bleibt revisionsgebunden und nutzt zentrale Berechtigungen/Session. Access fehlend/abgelaufen mit gültigem Refresh über zentrale API testen. Servervalidierung für Titeltyp/Länge, Null/Leer/Missing, Caption unabhängig. Keine neuen Ad-hoc-Fetches/Bearer-/Medienregistries. Kein automatisches DB-Reset/Re-Seeding. Bestehende Lint13/Warnings331, AnimePageProps.searchParams und formatEditLoadError-Buildfehler getrennt dokumentieren.
