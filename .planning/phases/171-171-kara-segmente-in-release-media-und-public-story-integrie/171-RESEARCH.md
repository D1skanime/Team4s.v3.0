# Phase 171: Research

**Date:** 2026-09-30
**Status:** Ready for planning
**Scope:** Kara-Segmente in die bestehende Release-Media-Adminansicht und Public Release Story integrieren.

## Executive Summary

Die Codebasis hat bereits alle wesentlichen Einzel-Seams. Release-Media werden über `release_version_media` gelesen, gepatcht und in einer gemeinsamen `sort_order`-Liste verschoben. Kara bleibt dagegen ein `theme_segment` mit `theme_segment_assignments`; die Public-Release-Projektion liefert bereits `segments` mit Preview-URL, Readiness, Zeitbereich und Teilnehmern. Die Public-Seite rendert Timeline, Galerie und Kara-Karten derzeit in getrennten Komponenten. Phase 171 sollte deshalb eine kanonische, release-version-bezogene Story-Projektion bzw. einen gemeinsamen Display-Order-Vertrag ergänzen, ohne die Ownership der beiden Fachlichkeiten zu vermischen.

## Existing seams

### Admin Release-Media

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx`
  - besitzt die bestehende Drag-and-Drop-Interaktion.
  - berechnet beim Drop bereits eine globale Reihenfolge über alle `items`, nicht nur innerhalb einer Kategorie.
  - ruft `onReorder(versionId, { items })` auf und vergibt Reihenfolgewerte in 10er-Schritten.
  - rendert aktuell Kategorien abschnittsweise; die Darstellung ist daher noch nicht automatisch eine einzige gemischte Story-Liste.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
  - lädt Media, führt Upload/Patch/Replace/Delete/Reorder/Highlight-Mutationen aus.
  - aktualisiert nach erfolgreichem Upload über `reload()`.
  - ist der richtige Wiederverwendungs-Seam für normale Release-Media, aber nicht für Kara-Segmente.
- `frontend/src/types/releaseVersionMedia.ts`
  - enthält Kategorie-, Preview-, Highlight- und Reorder-Typen.
- Backend:
  - `backend/internal/handlers/admin_content_release_version_media.go`
  - `backend/internal/handlers/admin_content_release_version_media_reorder.go`
  - `backend/internal/repository/release_version_media_repository.go`
  - Phase 169/170 haben die bestehende Release-Media-Reihenfolge, Highlight-Orthogonalität und Rechteprüfung gehärtet.

### Kara / Theme-Segmente

- `backend/internal/handlers/admin_content_anime_theme_segments.go`
- `backend/internal/handlers/admin_content_anime_theme_segment_assignments.go`
- `backend/internal/repository/theme_segment_assignments.go`
- `backend/internal/repository/theme_segment_playback_resolution.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- `frontend/src/types/admin.ts`
- `frontend/src/lib/api.ts`

Diese Pfade behandeln Kara als eigene Fachlichkeit. Die Phase darf Kara nicht in `release_version_media` kopieren oder als Ersatzrelation an Media hängen.

### Public Release Detail

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx`
  - lädt die Release-Detail-Projektion.
  - rendert aktuell Hero, Notes, `ThemeTimeline`, `ReleaseGallery`, technische Details und Contributors separat.
  - unterstützt bereits `?kara=<id>` und `?autoplay=1` für initiale Kara-Auswahl/Autoplay.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
  - besitzt Zeitachsen-Geometrie, Kara-Typfarben, Segmentauswahl, Auth-Session-Gating und Playback.
  - rendert aktuell einen separaten Abschnitt mit der Überschrift „Karas“ sowie Segmentkarten.
  - benötigt für Phase 171 voraussichtlich nur eine Navigations-/Darstellungsanpassung; die Timeline-Berechnung und Playback-Auflösung sollen wiederverwendet werden.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx`
  - öffnet normale Bilder in der bestehenden Lightbox/Galerie-Navigation.
  - projiziert aktuell Preview zuerst, danach Highlights und dann reguläre Bilder, wodurch sie die rohe Media-`sort_order` nicht vollständig übernimmt.
  - hat eigene Kategoriegruppen und Reveal-Logik; diese muss für den gemischten Story-Flow entweder erweitert oder durch eine gemeinsame View-Projektion gespeist werden.
- `frontend/src/types/releaseDetail.ts`
  - `PublicReleaseImage` enthält Media-, Preview-, Highlight- und Autorinformationen.
  - `PublicReleaseSegment` enthält Segment-ID, Titel, Typ, Zeitbereich, Readiness, Teilnehmer, `preview_url` und Folge-Bereichshinweise.
- Backend:
  - `backend/internal/repository/release_detail_public_repository.go`
  - `backend/internal/repository/release_detail_public_repository_helpers.go`
  - `loadReleaseSegments` lädt Segmentdaten für die konkrete `release_version_id`, inklusive Preview-Datei und Playback-Readiness.
  - `shared/contracts/openapi.yaml` und `shared/contracts/admin-content.yaml` enthalten Theme-Segment- und Media-Verträge.

## Contract and ownership findings

1. Eine einfache Erweiterung von `PublicReleaseImage` um Kara ist semantisch möglich, sollte aber als discriminated union bzw. Story-Item-Typ dokumentiert werden, damit Frontend-Code nicht undokumentierte Ad-hoc-Felder aus `fetch` ableitet.
2. Die Admin-Reorder-API akzeptiert aktuell Release-Media-IDs. Kara hat eine andere ID-/Ownership-Domain. Für eine wirklich persistierte gemeinsame Reihenfolge braucht es daher entweder:
   - eine neue release-version-scoped Story-Order-Projektion/-Relation, die auf Media oder Segment referenziert, oder
   - einen kanonischen bereits vorhandenen Order-Seam, der beide IDs unterstützt und contractseitig erweitert wird.
3. Keine neue parallele Kara- oder Media-Asset-Tabelle erfinden. Vor einer Migration muss geprüft werden, ob ein bestehender release-version-scoped Story-/Timeline-Order-Seam bereits vorhanden ist.
4. Playback darf nicht aus der sichtbaren Play-Schaltfläche abgeleitet werden. Der bestehende Segment-Playback-/Grant-Pfad und die zentrale API/Auth-Grenze bleiben maßgeblich.
5. Für fehlende Kara-Preview muss die bestehende Release-Preview-/Default-Auflösung wiederverwendet werden; der Fallback gehört in die Public-Projektion oder einen bestehenden URL-Resolver, nicht als hardcodierte Browser-URL in der Karte.

## Risks and planning implications

- **Order mismatch:** Admin-Galerie, Public-Galerie und Timeline haben derzeit unterschiedliche Gruppierungs-/Darstellungslogik. Der Plan braucht einen einzigen stabilen Story-Order-Vertrag und Tests gegen gemischte Sequenzen.
- **Domain mixing:** Kara darf nicht als Media-Asset dupliziert werden. Die gemeinsame Reihenfolge muss typisiert auf beide Domänen verweisen.
- **Highlight semantics:** Highlights sind eine visuelle Eigenschaft der Media-Einträge, keine zweite Sortierung. Public darf sie nicht automatisch an den Anfang ziehen, wenn D-02/D-13 gelten.
- **Immediate refresh:** Kara-Erstellung und Zuweisung müssen nach Erfolg den bestehenden Admin-Read-Pfad aktualisieren, ohne eine separate Kara-Liste als dauerhaften zweiten Zustand einzuführen.
- **Anchored navigation:** Timeline und Story-Karte müssen denselben stabilen Segment-Identifier verwenden. Der vorhandene `?kara`-Pfad ist ein Integrationshinweis, aber für einen Klick innerhalb derselben Seite ist ein DOM-Anker plus Selection/Autoplay-State robuster.
- **Responsive UI:** Die Sketches sind nur Referenz; die bestehende mobile Galerie-/Timeline-Logik und die Kartenhöhen müssen erhalten bleiben. Desktop-Admin-Grundlayout nicht neu gestalten.

## Relevant tests to extend

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx`
- `backend/internal/repository/release_detail_public_repository_test.go`
- `backend/internal/handlers/admin_content_release_version_media_reorder_test.go`
- bestehende Theme-Segment-Assignment-/Playback-Integrationstests

## Canonical references

- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/frontend/auth-api-client.md`
- `.planning/phases/169-release-medienrechte-projektleiter-preview-highlights-und-bi/169-CONTEXT.md`
- `.planning/sketches/MANIFEST.md`
- `.planning/sketches/008-public-release-story/index.html`
- `.planning/sketches/009-admin-release-story-order/index.html`

