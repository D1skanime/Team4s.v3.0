# Phase 144 Context — Überarbeitungs-Kreislauf für Release-Medien

**Quelle:** Live-UAT vom 2026-09-02, festgehalten als UAT-06 in
`.planning/phases/143-.../143-UAT.md`. Alle Angaben unten sind gegen Code und laufende DB geprüft.

## Das Problem in einem Satz

Der Kreislauf fordert nach einer Ablehnung eine Überarbeitung und verweigert dann genau die
Änderung, die den Ablehnungsgrund beheben würde.

## Was heute existiert

Routen für Release-Version-Medien (`backend/cmd/server/admin_routes.go:161-169`):

    POST   /admin/release-versions/:versionId/media              → neu hochladen
    GET    /admin/release-versions/:versionId/media              → auflisten
    POST   /admin/release-versions/:versionId/media/reorder      → umsortieren
    PATCH  /admin/release-versions/:versionId/media/:relationId  → Metadaten ändern
    DELETE /admin/release-versions/:versionId/media/:relationId  → löschen

Keine Operation ersetzt die Datei auf einer bestehenden `release_version_media`-Zeile.

## Das Vorbild: wie Notizen es lösen

`ReleaseVersionNotesRepository.BulkUpsertReleaseVersionNotes` behandelt den Update-Zweig so, dass
die Notiz ihre Identität behält und `SubmitNote` erneut aufgerufen wird. Der Lifecycle-Eintrag in
`release_version_note_review_lifecycle` bekommt eine erhöhte `source_revision` und geht zurück auf
`pending`. Live nachgewiesen: Notiz 22 auf Folge 12 steht nach Überarbeiten und erneutem Einreichen
auf `source_revision = 2`.

Genau dieses Muster fehlt für `release_version_media_review_lifecycle`.

## Was NICHT das Problem ist

Geprüft und entkräftet, damit es nicht erneut diskutiert wird:

- **Punkte.** `creditReleaseReviewContribution` läuft in `release_review_adapters.go` ausschließlich
  im `ReviewDecisionConfirm`-Zweig. Ein abgelehntes Bild hat nie Punkte erzeugt.
- **Bildarchivar-Zähler.** `loadContribArchivistCount` filtert auf
  `review_statuses.code = 'approved'`, `visibilities.name = 'public'` und `deleted_at IS NULL`.
  Ein abgelehntes Bild steht auf `private`/`rejected` und zählt nicht mit.

Löschen und neu hochladen kostet also keine Punkte. Verloren geht die **Prüfgeschichte**:
Ablehnungsgrund, Entscheidung und Audit-Eintrag hängen an der Medien-Zeile plus `source_revision`.
Nach einem Neu-Upload sieht der Prüfer ein Bild ohne Bezug zu dem, was er abgelehnt hat.

## Zielbild

1. Die Datei einer bestehenden `release_version_media`-Zeile lässt sich ersetzen. `id` bleibt,
   `source_revision` springt hoch, der Lifecycle geht auf `pending` zurück.
2. Die Kategorie ist im selben Formular änderbar — „falsche Kategorie" ist ein plausibler
   Ablehnungsgrund und reine Metadatenänderung auf derselben Zeile.
3. Der Prüfer sieht beim erneuten Vorlegen, dass es sich um die überarbeitete Fassung einer von ihm
   abgelehnten Einreichung handelt, nicht um eine fremde neue.
4. Die alte Datei wird im Storage sauber behandelt, nicht verwaist zurückgelassen.

## Offene Entscheidungen für die Planung

- **Route oder Erweiterung?** Eigener Endpunkt (etwa `PUT .../media/:relationId/file`) gegenüber
  einer Erweiterung des bestehenden `PATCH` auf Multipart. Der eigene Endpunkt hält das
  Metadaten-PATCH schlank, kostet aber eine Route mehr.
- **Alte Datei behalten oder verwerfen?** Für die Nachvollziehbarkeit der Prüfung könnte die
  vorherige Fassung erhalten bleiben; das kostet Speicher und braucht eine Aufräumregel. Die
  einfachere Variante ersetzt sie.
- **Wer darf ersetzen?** Vermutlich dieselbe Berechtigung wie Upload plus Eigentümerschaft an der
  Zeile. Muss gegen die bestehenden Media-Rechte geprüft werden, nicht neu erfunden.

## Randbedingungen

- Keine parallelen Systeme: der bestehende Review-Lifecycle und die zentrale Berechtigungsprüfung
  werden wiederverwendet, nicht dupliziert.
- Frontend nutzt die Primitives aus `@/components/ui` und die globalen Design-Tokens. Keine
  hartkodierten Farb-Fallbacks — das war UAT-04 in Phase 143.
- Backend-DTO, `shared/contracts/openapi.yaml` und die TypeScript-Typen werden gemeinsam gepflegt.
- Atomare Commits pro Task, Produktionsdateien bleiben bei maximal 450 Zeilen.
- Für die Live-UAT muss ein Bild hochgeladen und abgelehnt werden — der Bestand enthält aktuell
  nur bestätigte Medien.
