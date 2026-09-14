# Release-Version-Medientitel: Frontend-Consumer-Matrix

Stand: 14.09.2026, vor Implementierung. Quelle ausschließlich `release_version_media.title`; Caption bleibt eigenständige Beschreibung. Alle Metadaten werden als React-Text ausgegeben, nicht als HTML.

| DTO / Quelle | Tatsächlicher Consumer | Änderung / Grenze |
|---|---|---|
| `PublicReleaseImage` (`types/releaseDetail.ts`), Release-Detailaggregat + Bildercursor | `ReleaseGallery.tsx` und bestehende `FansubMediaLightbox` | Eigener Titel für Karten/Alt/Lightbox; Caption getrennt als Beschreibung. Ohne Titel bleiben bisherige Caption-/Kategorie-Fallbacks. Keine neuen Requests. |
| derselbe DTO | `projectPageData.releasePreview.ts` -> `PublicReleaseBlock` | Previewlabel/Alt bevorzugen Titel; die kompakte Projektvorschau erhält keine neue Beschreibungsebene. Der Release-Link öffnet die vollständige Galerie. |
| `PublicReleaseMediaItem` (`types/groupContributors.ts`), Gruppen-Release-Media-Endpoint | Kein aktueller Runtime-Seitenconsumer; alte `sections/MediaSection.tsx` nur Definition | Typ additiv angleichen; keine stillgelegte UI reaktivieren. |
| `ProjectMemberMediaItem` (`types/projectMember.ts`), Projekt-Member-Mediensammlung | `ProjectMemberMediaGallery` -> `ProjectMemberMediaCard` und `ProjectMemberMediaViewer` | Kartentitel und Viewerüberschrift mit Titel; Caption im bestehenden Viewer als eigenständiger Text. Kategorie/Kontext erhalten. |
| `MemberProfileRecentMedia` (`types/profile.ts`), eigenes Profil | `components/profile/RecentMediaSection.tsx`, importiert in `/me/profile/page.tsx` | Titel bevorzugen und Caption separat ausgeben; ohne Titel bisherige normalisierte Caption-Vorschau erhalten. |
| `PublicMemberLatestContribution.title` (SQL alias contribution_title), öffentliches Memberprofil | `components/profile/LatestContributionsSection.tsx` | Bereits getrennte Titel-/Textausgabe; Backend füllt das vorhandene Titelfeld für Medien. Nur Regressionstest nötig. |

## Ausdrücklich nicht erweitert

- `ReleaseVersionMediaGallery.tsx` und `ReleaseVersionMediaDetailPanel.tsx`: repositoryweite Importsuche findet nur eigene Definitionen, keine Runtime-Aufrufer. Der aktive Editor ist `ReleaseVersionMediaSection.tsx` (Hauptagent).
- `app/me/profile/components/RecentMediaSection.tsx`: nur alte Definition + eigener Test; das aktive Profil importiert die gemeinsame Komponente aus `components/profile`.
- `sections/MediaSection.tsx` und `sections/LatestReleaseSection.tsx`: keine Runtime-Aufrufer; Phase-155-Projektseite konsumiert den konsolidierten Read-Model-Pfad.
- `ScreenshotGallery` für `/episodes/[id]` ist der separate Legacy-Release-/Screenshotpfad und wird nicht mit versionsbezogenen Titeln vermischt.
- Fansub-Gruppenmedien haben bereits eigene Titel/Caption und andere Ownership; keine Änderung.
- Release-Hero verwendet das ausgewählte Bild dekorativ. Kein neuer Titel-/Beschreibungsoverlay dort.

## Verifikation

Gezielte Tests: Titel und Beschreibung unterschiedlich; Plain-Text-Markup wird nicht als HTML interpretiert; ohne Titel bestehendes Verhalten; Projekt-/Release-Preview übernimmt denselben Titel; Kategorie und Releasekontext bleiben erhalten. Keine Uploads oder gespeicherten Daten im Consumer-Test verändern.

## Ergebnis des Consumer-Executors

- RED: 4 neue Regressionsfälle schlugen vor UI-Anpassung erwartungsgemäß fehl (Release-Galerie, Projektpreview, Projekt-Member-Galerie, eigene aktuelle Medien); bereits vorhandene öffentliche LatestContributions-Titel-/Textausgabe bestand.
- GREEN: 41 Tests in 6 Dateien bestanden (`ReleaseGallery`, `projectPageData`, `ProjectMemberMediaGallery`, `ProjectMemberMediaViewer`, `RecentMediaSection`, `LatestContributionsSection`).
- Gezieltes ESLint für alle geänderten TS/TSX-Consumerdateien: Exit 0, keine Diagnosen.
- `git diff --check`: bestanden.
- Public title properties bleiben optional+nullable laut abgestimmtem OpenAPI-Vertrag; der Backend-Serializer liefert Null, wenn kein Titel existiert.
- Titel umbrechen am jeweiligen Karten-/Viewer-Owner. Die neue Beschreibung in der kompakten eigenen Profilvorschau verwendet wie der vorhandene Titel einen begrenzten Textauszug. Vollständige Beschreibung bleibt in Release-/Projekt-Member-Viewer erreichbar.
- Kein Commit durch Subagent; vollständige Integration, globale Checks und Browserabnahme durch Hauptagent.

Geänderte Dateien dieses Subtasks:

- `frontend/src/types/{releaseDetail,groupContributors,projectMember,profile}.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts`, `projectPageData.test.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.{tsx,test.tsx,module.css}`
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaCard.tsx`, `ProjectMemberMediaViewer.tsx`, `ProjectMemberMediaGallery.{test.tsx,module.css}`
- `frontend/src/components/profile/RecentMediaSection.{tsx,test.tsx}`, `LatestContributionsSection.test.tsx`, `profile.module.css`
