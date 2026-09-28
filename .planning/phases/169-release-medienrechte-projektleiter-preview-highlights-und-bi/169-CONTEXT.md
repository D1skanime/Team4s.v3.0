# Phase 169: Release-Medienrechte — Kontext

**Status:** Ready for planning

## Phase Boundary

Release-version-scoped media erhält eine klare Trennung zwischen Preview, Highlights und Reihenfolge. Der Projektleiter des jeweiligen Fansubprojekts darf Medien kuratieren; Plattform-Admins dürfen es immer; weitere Mitglieder können über das bestehende Rechte-Management projektbezogen freigeschaltet werden. Auf der Fansub-Adminseite muss für Berechtigte außerdem der Einstieg „Notizen & Bilder“ vorhanden sein.

## Locked decisions

- Projektleiter erhalten automatisch Rechte zum Verschieben und Highlight-Setzen für Releases ihres konkreten Fansubprojekts.
- Preview bleibt unabhängig von Highlights; mehrere Highlights pro Kategorie sind möglich.
- Reihenfolge und Highlight-Zustand sind getrennte Mutationen und getrennte Rechte.
- Backend-Prüfung ist maßgeblich; UI-Sichtbarkeit ist nur Komfort.
- Weitere Mitglieder werden über das bestehende Rechte-Management delegiert, ohne Zugriff auf andere Projekte.
- Die kanonische release_version_media-Domain bleibt erhalten; keine parallele Media-Tabelle und kein Legacy-release_media-Ersatz.
- Der „Notizen & Bilder“-Einstieg muss den Episode-Version-Kontext und return_to korrekt weitergeben.

## Agent discretion

- Persistenzrepräsentation für mehrere Highlights und ihre Reihenfolge nach Schema-Prüfung.
- Erweiterung bestehender oder Einführung getrennter Permission-Actions.
- Konkrete UI-Control unter Nutzung globaler Komponenten und progressiver Offenlegung.

## Read first

- AGENTS.md
- docs/engineering/implementation-contract.md
- docs/api/api-contracts.md
- docs/architecture/db-schema-fansub-domain.md
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
- backend/internal/handlers/admin_content_release_version_media_reorder.go
- backend/internal/permissions and existing fansub effective-rights handlers
