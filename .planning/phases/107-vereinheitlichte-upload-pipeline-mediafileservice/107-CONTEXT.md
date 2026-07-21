# Phase 107: Vereinheitlichte Upload-Pipeline (MediaFileService) - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 107 führt die sechs bestehenden Upload-Einstiege auf einen technischen `MediaFileService` zurück: Release-Version-Media, Fansub-Galerie, Theme-Asset, generischer Upload, Avatar/Background und Story-Bild. Der Service übernimmt einmalig Dateiannahme, Magic-Byte-/MIME-Prüfung, medienartspezifische Limits, Dekompressionsbomben-Schutz, Sanitizing, SHA-256, hash-basierten Storage, technische Metadaten, sinnvolle Varianten, Audit, Fehlerbehandlung, Deduplizierung und Wiederaufnahme.

Der Service bleibt vom fachlichen Relationsmodell entkoppelt. Dünne Kontextdienste bestimmen nur Verwendungskontext und Slot. Da die endgültigen Relationstabellen erst in Phase 108 entstehen, hält ein eng begrenzter Kompatibilitätsadapter die gegenwärtigen Relationspfade vorübergehend funktionsfähig. Eine Datei darf dabei nur einmal verarbeitet und gespeichert werden.

**Explizit nicht in dieser Phase:** endgültige Verwendungsrelationen, Kernmedien-FK-Slots und Berechtigungsumbau (Phase 108), Frontend-Umstellung (Phase 109) sowie Reset, Seeds und vollständiges E2E-Gate (Phase 110). Phase 107 darf keine parallele Medienlogik oder neue fachliche Medienzuordnung erfinden.

</domain>

<decisions>
## Implementation Decisions

### Übergang Phase 107 → 108
- **D-01:** Alle sechs Upload-Einstiege verwenden nach Abschluss von Phase 107 den neuen `MediaFileService`. Ein temporärer Kompatibilitätsadapter hält die bestehenden Relationspfade bis Phase 108 funktionsfähig, ohne Dateiinhalt oder Varianten doppelt zu verarbeiten oder zu speichern.
- **D-02:** Neuer Medienkern und alter Relationspfad bilden pro Datei eine Alles-oder-nichts-Einheit. Erst wenn Original, Varianten, neue Medienzeilen und Kompatibilitätsrelation erfolgreich sind, gilt der Upload als erfolgreich. Andernfalls werden erzeugte Dateien und DB-Zeilen kompensierend bereinigt.
- **D-03:** Die Migration erfolgt inkrementell innerhalb derselben Phase: zuerst der gemeinsame Service, danach jeder Upload-Einstieg separat mit fokussierten Tests. Jeder Zwischenschritt muss build- und uploadfähig bleiben; am Phasenende sind alle sechs Einstiege migriert.
- **D-04:** Der Adapter ist ausdrücklich Übergangscode und muss in Phase 108 entfernt werden. Phase 108 erhält ein Quellcode-/Test-Gate, das verbleibende Legacy-Schreibzugriffe verhindert.

### Deduplizierung und Uploader-Credit
- **D-05:** Der SHA-256-Hash wird aus dem tatsächlich gespeicherten, sicher bereinigten Original berechnet. Gleiche gespeicherte Bytes verweisen global auf dieselbe `media`-Zeile.
- **D-06:** Der erste Uploader bleibt globaler Eigentümer (`media.owner_user_id`) und wird durch spätere Wiederverwendungen nicht überschrieben. Der Credit späterer Nutzer gehört an die konkrete Verwendung (`relation.added_by_user_id`) und damit nicht an das globale Medium.
- **D-07:** Wiederholungen sind nach Verwendungskontext und Slot idempotent. Existieren Medium und identische Verwendung bereits, liefert der Service Erfolg mit `reused=true` und erzeugt weder eine zweite Datei noch eine zweite Relation. Andere Kontexte oder Slots dürfen dasselbe Medium verwenden.
- **D-08:** Globale Metadaten des ersten Uploads — insbesondere Eigentümer, ursprünglicher Dateiname, Quelle, Credit und Rechtehinweis — werden bei Wiederverwendung nicht still überschrieben. Änderungen benötigen einen ausdrücklich autorisierten Bearbeitungsvorgang.
- **D-09:** Die Deduplizierungsregel gilt langfristig quellenübergreifend für Uploads, Jellyfin und externe Provider. Phase 107 setzt die uploadseitige Basis um; Provider werden in ihrer dafür vorgesehenen Folgephase angeschlossen.

### Fehler, Rollback und Wiederaufnahme
- **D-10:** Ein fehlgeschlagener Nutzer-Upload hinterlässt keine Medien- oder Variantenreste. Diagnoseinformationen bleiben ausschließlich in Audit und Logs erhalten.
- **D-11:** Neue Dateien werden zuerst in einem nicht öffentlichen Staging-Bereich verarbeitet. Erst nach erfolgreicher Validierung und Persistenz werden sie atomar an den hash-basierten Zielort verschoben. Veraltete Staging-Reste werden durch eine kleine kontrollierte automatische Bereinigung entfernt.
- **D-12:** Mehrfach-Uploads sind pro Datei atomar, nicht als gesamter Stapel. Gültige Dateien bleiben erfolgreich; jede ungültige Datei wird vollständig zurückgerollt. Die API-Antwort enthält pro Datei ein Ergebnis mit Erfolg, `reused` oder einheitlichem Fehler.
- **D-13:** Geht eine Netzwerkantwort nach erfolgreicher Verarbeitung verloren, führt der Wiederholungsversuch anhand Hash und Verwendungskontext automatisch zum bestehenden Medium und zur bestehenden Relation. Er antwortet erfolgreich mit `reused=true` statt ein Duplikat oder einen Konflikt zu erzeugen.

### Varianten und Upload-Grenzen
- **D-14:** Es gibt einen gemeinsamen Validierungskern mit zentralen Profilen pro Medienart. Für Bilder gilt mindestens die heute härteste Regelmenge: maximal 15 MB, höchstens 8000 × 8000 Pixel, höchstens 40 Megapixel und höchstens 300 GIF-Frames. Video und Audio erhalten eigene zentrale MIME- und Größenprofile statt oberflächenspezifischer Regeln.
- **D-15:** `original` bedeutet ein sicheres, visuell unverändertes Original: keine Skalierung, kein Formatwechsel, Transparenz und GIF-Animation bleiben erhalten; EXIF und andere sensible Metadaten werden entfernt. Der Content-Hash bezieht sich auf diese tatsächlich gespeicherte bereinigte Datei.
- **D-16:** Bei animierten Bildern ist das Thumbnail statisch, während die größere Preview die vollständige Animation bewahrt. Transparente Bildvarianten müssen ihren Alphakanal erhalten.
- **D-17:** Varianten werden nur erzeugt, wenn sie technisch sinnvoll sind: Bilder erhalten `original`, `thumbnail` und `preview`; Videos erhalten `original` und passende Vorschaubilder; Audio erhält zunächst nur `original`. Es entstehen keine leeren Platzhalterzeilen und keine nutzlosen Dateikopien.
- **D-18:** Magic-Byte, deklarierter MIME-Typ, erlaubtes Medienartprofil und erzeugte Metadaten müssen konsistent sein. Alle Upload-Flächen verwenden dieselben Fehlercodes und dieselbe Ergebnisform.

### Agent's Discretion
- Exakte Paket- und Dateiaufteilung des Services und seiner kleinen Hilfstypen, solange vorhandene Repositories und Services erweitert, das 450-Zeilen-Limit eingehalten und keine parallelen Upload-Pipelines geschaffen werden.
- Konkrete zentrale Grenzwerte und MIME-Whitelists für Video und Audio, sofern bestehende strengere Sicherheitsgrenzen nicht still gelockert und die Werte in Tests und Vertrag dokumentiert werden.
- Konkrete Preview-/Thumbnail-Abmessungen und Encoder-Einstellungen innerhalb der festgelegten Qualitätsregeln zu Animation und Transparenz.
- Namen der Audit-Ereignisse und maschinenlesbaren Fehlercodes, sofern sie sich in die bestehenden API- und Audit-Konventionen einfügen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindliche Architektur und Phasengrenzen
- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md` — LOCKED Gesamtarchitektur des Medienmodell-Neubaus; definiert technischen Kern, `media`/`media_variant`, Trennung von Medium und Verwendung sowie das Ziel ohne parallele Medienlogik.
- `.planning/ROADMAP.md` — Phase 107 Goal und Success Criteria sowie die Abgrenzung zu den Phasen 106, 108, 109 und 110.
- `.planning/phases/106-medienkern-schema-legacy-abbau/106-CONTEXT.md` — vorgelagerter Schema- und Legacy-Vertrag; `media` und `media_variant` sind das Zielmodell, während bisherige Relationsträger bis zu den Folgephasen noch aktiv sein können.
- `AGENTS.md` — verbindliche Domain-, Reuse-, API-, Auth-, Migrations- und Validierungsregeln des Projekts.

### Domain-, Implementierungs- und API-Verträge
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Ownership-Grenzen für Anime, Episode, Release, Release-Version, Fansubgruppe und release-native Medien.
- `docs/engineering/implementation-contract.md` — bestehende Implementierungsseams zuerst suchen und erweitern; keine doppelte Request-, Storage-, Auth- oder Medienlogik.
- `docs/api/api-contracts.md` — API-Änderungen müssen mit den kanonischen Contracts und Frontendtypen synchron bleiben.
- `shared/contracts/openapi.yaml` — kanonischer Cross-Surface-API-Vertrag für geänderte Upload-Antworten und Fehlerformen.
- `shared/contracts/admin-content.yaml` — fokussierter Admin-Content-Vertrag für betroffene Release-/Medien-Endpunkte, sofern vorhanden und einschlägig.

### Bestehende Upload- und Medienpfade
- `backend/internal/services/media_service.go` — vorhandener technischer Service mit `SaveUpload`, `SaveUploadSourceOriginal`, `SaveReleaseThemeVideoUpload` und `SaveSegmentAsset`; primärer Erweiterungskandidat statt Neubau eines parallelen Services.
- `backend/internal/handlers/admin_content_release_version_media.go` — derzeit härteste Bildvalidierung in `processOneRVMFile`: MIME-Whitelist, 15-MB-Limit, 8000 × 8000, 40-MP-Schutz, maximal 300 GIF-Frames und 400er Thumbnail.
- `backend/internal/handlers/fansub_media_upload.go` — Fansub-Branding und Galerie; zeigt sowohl bestehende Service-Nutzung als auch noch duplizierte Galerieverarbeitung.
- `backend/internal/handlers/media_upload.go` — generischer Upload mit eigener Bild-/Video-Prüfung und Variantenlogik; auf den gemeinsamen Kern zurückzuführen.
- `backend/internal/handlers/app_profile_story_image.go` — Story-Bild-Verarbeitung mit eigener Validierung, EXIF-Bereinigung und Resize-Logik; Sicherheitsverhalten in den gemeinsamen Kern übernehmen.
- `backend/internal/handlers/admin_content_release_theme.go` — Theme-Upload-Integration und bestehender Aufruf von `SaveReleaseThemeVideoUpload`; dünner Kontextpfad soll erhalten bleiben.
- `frontend/src/components/admin/MediaUpload.tsx` — bestehender Browser-Upload für Fansub-/Gruppenmedien; Transport und Fortschrittsverhalten nicht unnötig duplizieren.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` — kanonischer Release-Version-Media-UI-Einstieg.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` — bestehender release-version-spezifischer Upload-Hook und API-Integrationspunkt.
- `frontend/src/lib/api.ts` — zentraler Browser-API-Client und vorhandene Upload-Wrapper; keine separaten Auth- oder Fetch-Pfade ergänzen.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/services/media_service.go`: vorhandenen Service zum einzigen technischen Upload-Kern erweitern; seine Storage- und Save-Methoden nicht durch einen zweiten Service spiegeln.
- `processOneRVMFile` in `backend/internal/handlers/admin_content_release_version_media.go`: härteste vorhandene Sicherheitsregeln und Testfälle extrahieren, zentralisieren und anschließend aus dem Handler entfernen.
- Bestehende Media-Repositories und Transaktionsmuster: für `media`/`media_variant`, Hash-Lookup und kompensierende Bereinigung erweitern.
- Vorhandene Bildverarbeitung aus RVM-, Story- und generischem Upload: EXIF-Bereinigung, Dimensionsprüfung, GIF-Frame-Prüfung und Variantenbildung zu einem Kern zusammenführen.

### Established Patterns
- Release-Version-Media bleibt release-version-scoped und wird nie direkt an eine Episode gehängt.
- Kontextdienste prüfen Berechtigung und fachlichen Slot; der technische Service kennt keine Fansub-, Release- oder Profilrechte.
- Browser-Authentifizierung läuft über den zentralen API-Client. Ein gültiger Refresh-Token muss geschützte Uploads auch ohne aktuellen Access-Token ermöglichen.
- Datenbank- und Dateisystemoperationen benötigen explizite Kompensation, weil sie keine gemeinsame native Transaktion besitzen.
- Mehrfach-Uploads liefern bereits fachlich sinnvolle Einzelergebnisse; Phase 107 vereinheitlicht deren technische Form und Atomarität.

### Integration Points
- Sechs Handler-/Kontextpfade rufen denselben Service auf und ergänzen anschließend ausschließlich ihre fachliche Verwendung.
- `media.content_hash` ist der globale Lookup für Wiederverwendung; `media_variant.storage_key` beziehungsweise `media.storage_key` verwenden hash-basierte Zielpfade.
- Der temporäre Adapter verbindet neue Medienzeilen mit den noch bestehenden Relationsträgern. Seine Grenze und sein Entfernungstest müssen für Phase 108 sichtbar markiert sein.
- OpenAPI, Backend-DTOs, `frontend/src/types/*` und `frontend/src/lib/api.ts` müssen bei einer geänderten Batch-/Fehlerantwort gemeinsam angepasst werden.
- Audit und Logs erfassen Verarbeitung, Wiederverwendung, Ablehnung und kompensierende Bereinigung, ohne fehlgeschlagene Medienzeilen als Nutzdaten stehen zu lassen.

</code_context>

<specifics>
## Specific Ideas

- Die Umstellung soll kein Big-Bang-Commit werden: ein gemeinsamer Kern, danach sechs klar abgegrenzte Migrationen mit jeweils fokussierter Absicherung.
- `reused=true` ist sowohl für normale Deduplizierung als auch für sichere Wiederholung nach verlorener Antwort die sichtbare Semantik.
- Das gespeicherte `original` ist nicht zwingend bytegleich mit dem Eingang, weil sensible Metadaten entfernt werden; visuell, hinsichtlich Auflösung, Animation und Transparenz bleibt es unverändert.
- GIF-Previews sollen bewusst animiert bleiben, auch wenn das kleine Thumbnail statisch ist.

</specifics>

<deferred>
## Deferred Ideas

- Endgültige Verwendungstabellen, direkte Kernmedien-FKs, kontextspezifische Permissions sowie Entfernung des Kompatibilitätsadapters → **Phase 108**.
- Vollständige Frontend-Umstellung auf die neuen Medien- und Relationsverträge → **Phase 109**.
- Datenreset, Seeds, Fixture-Zuordnung und vollständiges medienübergreifendes E2E-Gate → **Phase 110**.
- Anschluss von Jellyfin und externen Providern an die globale Hash-Deduplizierung → jeweilige vorgesehene Provider-/Folgephase; Phase 107 legt den quellenneutralen technischen Kern.

### Reviewed Todos (not folded)
- `Contribution-UI auf globale components/ui-Primitives umstellen (Phase 67 Folgearbeit)` — reine UI-Konsolidierung; gehört nicht in den technischen Upload-Kern.
- `Contributor owned media and note edit delete` — Ownership-, Edit- und Delete-Verhalten der Verwendung; gehört zu Relations-/Permission-Arbeit, insbesondere Phase 108/109.
- `fansubs/[id]/edit/page.tsx aufteilen (450-Zeilen-Limit, CR-04 Phase 78)` — unabhängiger Frontend-Refactor.
- `Phase-78 Medien-Review Code-Review-Warnings abarbeiten` — Review-/Berechtigungs- und Workspace-Folgearbeit, nicht technische Dateiverarbeitung.
- `Profile hub content activity redesign` — unabhängiges Profil-UI-Redesign.
- `Credits-UI in "Anime & Veröffentlichungen" konsolidieren + Permission-Brücke (Design)` — UI- und Permission-Thema für spätere Oberflächen-/Relationsphasen.
- `Member-Profil-Seite — UI-Politur + params.id-Korrektheitsbug` — unabhängiger Profilseiten-Bug und UI-Politur.
- `Kollaboration public handling neu loesen` — öffentliches Kollaborations- und Sichtbarkeitsmodell, nicht Upload-Technik.
- `Fansub achievement badge catalog implementieren` — unabhängige Gamification-/Fansub-UI-Arbeit.

</deferred>

---

*Phase: 107-vereinheitlichte-upload-pipeline-mediafileservice*
*Context gathered: 2026-07-21*
