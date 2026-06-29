# Phase 91 Add-on DISCUSS - Mein Projekt

## Ausgangslage

- Phase 91 ist abgeschlossen und committed.
- Phase 92 ist ebenfalls abgeschlossen und committed.
- Der aktuelle Code hatte `/me/contributions` und `/me/releases/[versionId]/workspace`, aber keine projektorientierte Detailseite.
- Contributions, Notizen und Medien sind release-version-scoped; Projekttexte und Projektbilder bleiben Admin-only.

## Verifizierter Bestand

- `/me/contributions` nutzt `GET /api/v1/me/anime-contributions`.
- Release-Version-Arbeitsflächen nutzen `/me/releases/[versionId]/workspace`.
- Release-Version-Notizen liegen in `release_version_notes`.
- Release-Version-Medien liegen in `release_version_media` und werden über `uploaded_by_user_id` auf eigene Uploads eingeschränkt.
- Gruppen-gefilterte Release-Versionen existieren bereits im Admin-Kontext, sind aber nicht als Member-Detail-Endpoint geeignet.

## Graubereiche

1. Jellysync / zweites Backdrop
   - Das UI nutzt vorhandene Anime-Background-Assets.
   - Die Projektion wählt den zweiten Background (`OFFSET 1`), falls vorhanden.
   - Wenn kein zweites Backdrop vorhanden ist, bleibt die Cover-Fläche mit blauem Fallback bestehen.

2. Schon-etwas-hinterlegt-Flag
   - Wird aus vorhandenen release-version-scoped Daten abgeleitet:
     - eigene Notizen in `release_version_notes`
     - eigene Medien in `release_version_media.uploaded_by_user_id`

3. Rollenaggregation
   - Wird per distinct über confirmed `anime_contributions` des Members für `anime_id + fansub_group_id` berechnet.

4. Pagination
   - Der neue Endpoint liefert die Projektliste read-only.
   - Die UI rendert in 20er-Schritten und filtert clientseitig, weil kein neuer serverseitiger Pagination-Endpoint erforderlich ist.

## Fachliche Entscheidung

Die Detailroute ist bewusst `anime_id + fansub_group_id`, nicht nur `anime_id`. Die Profil-/Projektliste darf anime-orientiert aggregieren, aber die Detailseite zeigt eine konkrete Gruppenbeteiligung mit ihren Release-Versionen. Dadurch werden gleichnamige Projekte verschiedener Gruppen nicht vermischt.
